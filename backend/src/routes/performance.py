from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
from ..database.db import get_db
from .. import crud, schemas
from ..utils import authenticate_and_get_user_details

router = APIRouter()

@router.get("/", response_model=list[schemas.PerformanceResponse])
def get_performance(request: Request, db: Session = Depends(get_db)):
    user_info = authenticate_and_get_user_details(request)
    user_id = user_info['user_id']

    return crud.get_user_performance(db, user_id)
