from typing import Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, IntegerIDMixin

from src.auth.authentication_config import oauth2_scheme, decode_token
from src.user.models import User, get_user_db
from src.config import settings


SECRET = settings.USER_MANAGER_SECRET_KEY

class UserManager(IntegerIDMixin, BaseUserManager[User, int]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(
            self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(
            self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"Verification requested for user {user.id}. Verification token: {token}")


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)


def get_current_user_id(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token, expected_type="access")
    user_id: str = payload.get("sub")
    return user_id
