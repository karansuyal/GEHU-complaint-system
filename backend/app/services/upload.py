import logging

import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.core.config import settings

logger = logging.getLogger(__name__)

_configured = bool(
    settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET
)

if _configured:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )

_CHUNK = 64 * 1024


def _sniff_image_type(head: bytes) -> str | None:
    """Detects the real file type from its first bytes (the client-sent
    Content-Type and file name can't be trusted)."""
    if head.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    return None


async def _read_limited(file: UploadFile, max_bytes: int) -> bytes:
    """Reads the upload in chunks and aborts as soon as it exceeds the limit,
    so an oversized file never gets fully buffered in memory."""
    buf = bytearray()
    while True:
        chunk = await file.read(_CHUNK)
        if not chunk:
            break
        buf.extend(chunk)
        if len(buf) > max_bytes:
            raise HTTPException(
                status_code=413, detail=f"Photo is too large. Maximum size is {settings.MAX_UPLOAD_MB} MB."
            )
    return bytes(buf)


async def upload_photo(file: UploadFile | None) -> str | None:
    """Validates and uploads a complaint photo to Cloudinary.

    Returns None only when no photo was sent. If a photo WAS sent but cannot
    be stored (uploads not configured, bad file, provider error) the request
    fails with a clear message, instead of silently dropping the photo while
    the student believes it was attached.
    """
    if file is None or not (file.filename or "").strip():
        return None

    if not _configured:
        raise HTTPException(
            status_code=503,
            detail="Photo uploads are not available right now. Submit without a photo or try later.",
        )

    contents = await _read_limited(file, settings.MAX_UPLOAD_MB * 1024 * 1024)
    if not contents:
        raise HTTPException(status_code=400, detail="The selected photo is empty.")
    if _sniff_image_type(contents[:16]) is None:
        raise HTTPException(status_code=415, detail="Unsupported photo. Please upload a JPG, PNG, WEBP or GIF image.")

    try:
        result = await run_in_threadpool(
            cloudinary.uploader.upload,
            contents,
            folder="gehu-complaints",
            resource_type="image",
            allowed_formats=["jpg", "png", "webp", "gif"],
        )
    except Exception:  # provider/network failure
        logger.exception("Cloudinary upload failed")
        raise HTTPException(status_code=502, detail="Could not upload the photo. Please try again.")

    url = result.get("secure_url")
    if not url:
        raise HTTPException(status_code=502, detail="Could not upload the photo. Please try again.")
    return url
