from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter()

# PUBLIC routes first
@router.get("/gallery")
def get_gallery(db: Session = Depends(get_db)):
    builds = db.query(models.Build).order_by(models.Build.created_at.desc()).limit(50).all()
    result = []
    for build in builds:
        user = db.query(models.User).filter(models.User.id == build.owner_id).first()
        result.append({
            "id": build.id,
            "name": build.name,
            "device_type": build.device_type,
            "parts_installed": build.parts_installed,
            "user_code": build.user_code,
            "share_token": build.share_token,
            "created_at": build.created_at,
            "username": user.username if user else "unknown"
        })
    return result

@router.get("/share/{token}")
def get_shared_build(token: str, db: Session = Depends(get_db)):
    build = db.query(models.Build).filter(models.Build.share_token == token).first()
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    return build

# PRIVATE routes
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

@router.get("/{build_id}", response_model=schemas.BuildOut)
def get_build(build_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    build = db.query(models.Build).filter(models.Build.id == build_id, models.Build.owner_id == current_user.id).first()
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    return build

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