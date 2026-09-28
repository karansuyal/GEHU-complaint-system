"""
One-time setup: generates a VAPID key pair for Web Push notifications and
prints the values to paste into your .env file.

Usage:
    python generate_vapid_keys.py
"""
import base64

from py_vapid import Vapid02
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


def b64url(raw_bytes: bytes) -> str:
    return base64.urlsafe_b64encode(raw_bytes).rstrip(b"=").decode()


def main():
    vapid = Vapid02()
    vapid.generate_keys()

    private_value = vapid.private_key.private_numbers().private_value
    private_raw = b64url(private_value.to_bytes(32, "big"))

    public_raw = b64url(
        vapid.private_key.public_key().public_bytes(
            Encoding.X962, PublicFormat.UncompressedPoint
        )
    )

    print("Add these two lines to backend/.env:\n")
    print(f"VAPID_PUBLIC_KEY={public_raw}")
    print(f"VAPID_PRIVATE_KEY={private_raw}")
    print(
        "\nVAPID_PUBLIC_KEY also needs to go in the frontend's .env as "
        "VITE_VAPID_PUBLIC_KEY (same value)."
    )


if __name__ == "__main__":
    main()
