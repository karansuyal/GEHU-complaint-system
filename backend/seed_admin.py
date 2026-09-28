"""
Run once after first setup to create the first admin account, since
/auth/register only ever creates students and /auth/create-staff requires
an existing admin to call it. Chicken-and-egg fix.

Usage:
    python seed_admin.py
"""
from app.db.database import SessionLocal
from app.db.migrate import run_migrations
from app.models.user import User, UserRole
from app.core.security import hash_password

run_migrations()
db = SessionLocal()

email = input("Admin email: ").strip()
name = input("Admin name: ").strip()
password = input("Admin password (min 8 chars): ").strip()

if db.query(User).filter(User.email == email).first():
    print("A user with this email already exists.")
else:
    admin = User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        role=UserRole.admin,
        campus="bhimtal",
        is_verified=True,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    print(f"Admin account created: {email}")

db.close()
