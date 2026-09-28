import cloudinary
import cloudinary.uploader

from app.core.config import settings

_configured = bool(settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY)

if _configured:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )


async def upload_photo(file) -> str | None:
    """Uploads a complaint photo to Cloudinary. Returns None (and skips
    silently) if Cloudinary credentials aren't set — lets the app run in
    dev without needing an account yet."""
    if not _configured or file is None:
        return None
    contents = await file.read()
    result = cloudinary.uploader.upload(contents, folder="gehu-complaints")
    return result.get("secure_url")
