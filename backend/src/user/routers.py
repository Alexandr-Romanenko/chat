from typing import List

from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_async_session
from src.auth.authentication_config import get_password_hash
from src.user import schemas, models
from src.user.manager import get_current_user_id

router = APIRouter(tags=["user"])


@router.post("/register", response_model=schemas.UserRead)
async def register(user: schemas.UserCreate, session: AsyncSession = Depends(get_async_session)):
    stmt = select(models.User).where(models.User.email == user.email)
    result = await session.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = models.User(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        hashed_password=get_password_hash(user.password)
    )
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    return db_user


@router.post("/user/:id/update", response_model=schemas.UserRead)
async def update_user(user: schemas.UserUpdate, session: AsyncSession = Depends(get_async_session)):
    stmt = select(models.User).where(models.User.email == user.email)
    result = await session.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = models.User(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        hashed_password=get_password_hash(user.password)
    )
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    return db_user


@router.get("/users", response_model=List[schemas.UserRead])
async def get_users(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_async_session)
):
    stmt = select(models.User).where(models.User.id != user_id)
    result = await session.execute(stmt)
    users = result.scalars().all()
    return users
