# routes/users.py

from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database.db import get_db
from .. import crud, schemas
from ..utils import authenticate_and_get_user_details

router = APIRouter()
@router.get("/me", response_model=schemas.UserResponse)
def get_profile(request: Request, db: Session = Depends(get_db)):
    user_info = authenticate_and_get_user_details(request)
    user_id = user_info['user_id']

    db_user = crud.get_user_by_id(db, user_id)
    if not db_user:
        email = user_info.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Cannot create user: missing email")

        name = user_info.get("name") or "No Name"
        username = user_info.get("username") or email.split('@')[0] or f"user_{user_id[:8]}"

        new_user = schemas.UserCreate(
            id=user_id,
            email=email,
            username=username,
            name=name,
            password=None
        )
        db_user = crud.create_user(db, new_user)

    return db_user
