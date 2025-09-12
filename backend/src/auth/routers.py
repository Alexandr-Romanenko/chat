from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from src.auth import schemas
from src.auth.authentication_config import verify_password, create_token, oauth2_scheme, decode_token
from src.database import get_async_session
from src.user import models
from src.config import settings

router = APIRouter(tags=["auth"])

ACCESS_TOKEN_EXPIRE_MINUTES=settings.AUTH_ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_MINUTES=settings.AUTH_REFRESH_TOKEN_EXPIRE_MINUTES


@router.post("/login", response_model=schemas.Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_async_session)
):
    stmt = select(models.User).where(models.User.email == form_data.username)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    # access_token
    access_token = create_token(
        {"sub": str(user.id)},
        token_expire=ACCESS_TOKEN_EXPIRE_MINUTES,
        token_type="access"
    )

    # refresh_token
    refresh_token = create_token(
        {"sub": str(user.id)},
        token_expire=REFRESH_TOKEN_EXPIRE_MINUTES,
        token_type="refresh"
    )

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/refresh")
def refresh_token(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token, expected_type="refresh")
    user_id: str = payload.get("sub")
    # create a new access token
    new_access_token = create_token(        {"sub": str(user_id)},
        token_expire=ACCESS_TOKEN_EXPIRE_MINUTES,
        token_type="access")
    return {"access_token": new_access_token, "token_type": "bearer"}
