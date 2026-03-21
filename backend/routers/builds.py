from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter()

# PUBLIC - must be first before /{build_id} routes
@router.get("/share/{token}")
def get_shared_build(token: str, db: Session = Depends(get_db)):
    build = db.query(models.Build).filter(models.Build.share_token == token).first()
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    return build

@router.post("/", response_model=schemas.BuildOut)
def create_build(build: schemas.BuildCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    new_build = models.Build(**build.model_dump(), owner_id=current_user.id)
    db.add(new_build)
    db.commit()
    db.refresh(new_build)
    return new_build

@router.get("/me", response_model=list[schemas.BuildOut])
def my_builds(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(models.Build).filter(models.Build.owner_id == current_user.id).all()

@router.patch("/{build_id}", response_model=schemas.BuildOut)
def update_build(build_id: int, update: schemas.BuildUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    build = db.query(models.Build).filter(models.Build.id == build_id, models.Build.owner_id == current_user.id).first()
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(build, key, value)
    db.commit()
    db.refresh(build)
    return build

@router.delete("/{build_id}")
def delete_build(build_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    build = db.query(models.Build).filter(models.Build.id == build_id, models.Build.owner_id == current_user.id).first()
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    db.delete(build)
    db.commit()
    return {"message": "Build deleted"}