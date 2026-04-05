from backend.database import engine, SessionLocal, Base
from backend.models import User, Prediction
from backend.auth import get_password_hash

def setup():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Check if users already exist
    if db.query(User).count() == 0:
        print("Inserting dummy users...")
        users = [
            User(email="admin@example.com", hashed_password=get_password_hash("admin123"), role="admin"),
            User(email="user@example.com", hashed_password=get_password_hash("user123"), role="user"),
            User(email="john@example.com", hashed_password=get_password_hash("john123"), role="user"),
        ]
        db.add_all(users)
        db.commit()
        print("Data inserted: admin@example.com (admin123), user@example.com (user123), john@example.com (john123)")
    else:
        print("Users already exist in the database.")
        
    db.close()

if __name__ == "__main__":
    setup()
