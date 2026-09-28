"""One-time cleanup: delete any staff/admin account with an invalid email
(leftover from testing) so /staff stops crashing."""
from app.db.database import SessionLocal
from app.models.user import User

db = SessionLocal()
bad = db.query(User).filter(User.email == "admin@123").all()
for u in bad:
    print("Deleting:", u.email, u.role)
    db.delete(u)
db.commit()
db.close()
print("Done.")