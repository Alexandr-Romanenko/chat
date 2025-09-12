from typing import List, Dict

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from datetime import datetime

from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ValidationError

from src.attachment.schemas import AttachmentRead
from src.attachment.utils import save_attachment
from src.chat.schemas import WSMessage, MessageRead
from src.database import get_async_session
from src.chat.models import Message
from src.config import settings

import logging
logger = logging.getLogger(__name__)

SECRET_KEY=settings.AUTH_SECRET_KEY
ALGORITHM=settings.AUTH_ALGORITHM

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)
        logger.info(f"User {user_id} connected via WS. Active: {list(self.active_connections.keys())}")

    def disconnect(self, user_id: int, websocket: WebSocket):
        conns = self.active_connections.get(user_id)
        if conns and websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active_connections.pop(user_id, None)
        logger.info(f"User {user_id} disconnected from WS. Active: {list(self.active_connections.keys())}")

    async def send_personal_message(self, data: dict, receiver_id: int):
        websockets = self.active_connections.get(receiver_id, [])
        logger.info(f"Trying to send to {receiver_id}. Active: {list(self.active_connections.keys())}")
        if not websockets:
            logger.warning(f"No active WS connections for user {receiver_id}")
            return
        for ws in websockets:
            try:
                await ws.send_json(data)
                logger.info(f"Message sent to user {receiver_id}")
            except Exception as e:
                logger.error(f"Failed to send message to {receiver_id}: {e}")
                self.disconnect(receiver_id, ws)

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, session: AsyncSession = Depends(get_async_session)):
    # --- Получаем токен вручную ---
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except jwt.PyJWTError:
        await websocket.close(code=1008)
        return

    await manager.connect(user_id, websocket)

    try:
        while True:
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.exception("Failed to receive WS data: %s", e)
                try:
                    await websocket.send_json({"error": "invalid_json", "details": str(e)})
                except Exception:
                    pass
                continue

            # --- Валидация WSMessage ---
            try:
                ws_msg = WSMessage.model_validate(data)
            except Exception as e:
                await websocket.send_json({"error": "invalid_message", "details": str(e)})
                continue

            if ws_msg.type == "message":
                if ws_msg.receiver_id is None or ws_msg.message is None:
                    await websocket.send_json({
                        "error": "missing_fields",
                        "details": "receiver_id and message are required"
                    })
                    continue

                # --- Сохраняем сообщение в БД ---
                try:
                    async with session.begin():
                        msg = Message(
                            message=ws_msg.message,
                            user_id=user_id,
                            receiver_id=ws_msg.receiver_id,
                            created_at=datetime.utcnow(),
                        )
                        session.add(msg)
                        await session.flush()

                        # --- Сохраняем вложения ---
                        attachments: List[AttachmentRead] = []
                        for f in ws_msg.files or []:
                            att = await save_attachment(f, msg.id, session, user_id)
                            attachments.append(AttachmentRead.model_validate(att))
                except Exception:
                    logger.exception("DB error while saving message")
                    await websocket.send_json({"error": "db_error"})
                    continue

                # --- Формируем payload
                attachments_data = [AttachmentRead.from_orm(att) for att in attachments]
                msg_dict = jsonable_encoder(
                    MessageRead(
                        id=msg.id,
                        message=msg.message,
                        user_id=msg.user_id,
                        receiver_id=msg.receiver_id,
                        created_at=msg.created_at,
                        attachments=attachments_data
                    )
                )


                # --- Отправляем сообщения через WS ---
                # try:
                #     await manager.send_personal_message(msg_dict, receiver_id=msg.receiver_id)
                #     # await manager.send_personal_message(data=payload, receiver_id=msg.receiver_id)
                #     # await manager.send_personal_message(data=payload, receiver_id=msg.user_id)
                # except Exception:
                #     logger.exception("WS broadcast failed")

    finally:
        manager.disconnect(user_id, websocket)
