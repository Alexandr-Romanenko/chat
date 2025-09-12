from typing import Optional
from fastapi_users import schemas
from pydantic import EmailStr, Field, field_validator

from src.user.utils import validate_password_complexity


class UserRead(schemas.BaseUser[int]):
    id:int
    first_name: str
    last_name: str
    email: EmailStr
    is_active: bool
    is_verified: bool


class UserCreate(schemas.BaseUserCreate):
    first_name: str = Field(..., max_length=50)
    last_name: str = Field(..., max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False
    is_verified: Optional[bool] = False

    _validate_password = field_validator("password")(validate_password_complexity)


class UserUpdate(schemas.BaseUserUpdate):
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    is_verified: Optional[bool] = None

    _validate_password = field_validator("password")(validate_password_complexity)
