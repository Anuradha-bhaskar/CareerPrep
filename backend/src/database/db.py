# db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base  # or from models import Base if same folder

engine = create_engine("sqlite:///database.db", connect_args={"check_same_thread": False}, echo=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
