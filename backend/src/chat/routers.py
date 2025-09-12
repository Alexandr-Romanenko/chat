from fastapi import UploadFile, File, Depends, APIRouter, HTTPException, Form
from typing import List
from datetime import datetime

from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.attachment.schemas import AttachmentBase, AttachmentRead
from src.attachment.utils import save_attachment

from src.chat.models import Message
from src.chat.schemas import MessageCreate, MessageRead, MessageUpdate
from src.chat.ws_routers import manager

from src.database import get_async_session
from src.user.manager import get_current_user_id


import logging
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/messages", response_model=MessageRead)
async def create_message(
    message: str = Form(..., max_length=500),
    receiver_id: int = Form(...),
    files: List[UploadFile] = File([]),
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_async_session),
):
    async with session.begin():
        msg = Message(
            message=message,
            user_id=user_id,
            receiver_id=receiver_id,
            created_at=datetime.utcnow(),
        )
        session.add(msg)
        await session.flush()

        attachments: list[AttachmentRead] = []
        for f in files:
            att = await save_attachment(f, msg.id, session, user_id)
            attachments.append(AttachmentRead.model_validate(att))

    msg_read = MessageRead.model_validate({
        "id": msg.id,
        "message": msg.message,
        "user_id": msg.user_id,
        "receiver_id": msg.receiver_id,
        "created_at": msg.created_at,
        "attachments": attachments,
    })

    try:
        await manager.send_personal_message(data=msg_read.model_dump(), receiver_id=receiver_id)
        await manager.send_personal_message(data=msg_read.model_dump(), receiver_id=user_id)
    except Exception:
        logger.exception("WS broadcast failed")

    return msg_read


@router.put("/messages/{message_id}", response_model=MessageRead)
async def update_message(
    message_id: int,
    message_data: MessageUpdate,
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Message)
        .where(Message.id == message_id, Message.user_id == user_id)
        .options(selectinload(Message.attachments))  # preload attachments
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if message_data.message is not None:
        msg.message = message_data.message

    await session.commit()

    return MessageRead.model_validate({
        "id": msg.id,
        "message": msg.message,
        "user_id": msg.user_id,
        "receiver_id": msg.receiver_id,
        "created_at": msg.created_at,
        "attachments": msg.attachments,
    })


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Message).where(Message.id == message_id, Message.user_id == user_id)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    await session.delete(msg)
    await session.commit()
    return {"status": "deleted", "message_id": message_id}


@router.get("/messages/{user_id}", response_model=List[MessageRead])
async def get_chat_history(
    user_id: int,
    current_user: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(Message)
        .where(
            or_(
                and_(Message.user_id == current_user, Message.receiver_id == user_id),
                and_(Message.user_id == user_id, Message.receiver_id == current_user),
            )
        )
        .order_by(Message.created_at.asc())
        .options(selectinload(Message.attachments))
    )
    result = await session.execute(stmt)
    messages = result.scalars().unique().all()

    return [MessageRead.model_validate(m) for m in messages]
