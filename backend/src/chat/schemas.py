from typing import Optional, List

from fastapi import Form
from pydantic import BaseModel, Field, ConfigDict, field_serializer
from datetime import datetime

from src.attachment.schemas import AttachmentRead


class MessageCreate(BaseModel):
    message: str = Form(..., max_length=500)


class MessageUpdate(BaseModel):
    message: Optional[str] = Field(None, max_length=500)


class MessageRead(BaseModel):
    id: int
    message: str
    user_id: int
    receiver_id: int
    created_at: datetime
    attachments: List["AttachmentRead"] = []

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime):
        return value.isoformat()

    model_config = ConfigDict(from_attributes=True)

# class MessageRead(BaseModel):
#     id: int
#     message: str
#     user_id: int
#     receiver_id: int
#     created_at: datetime = lambda v: v.isoformat()
#     attachments: List[AttachmentRead] = []

    # class Config:
    #     json_encoders = {
    #         datetime: lambda v: v.isoformat()
    #     }

# class MessageRead(BaseModel):
#     id: int
#     message: str
#     user_id: int
#     created_at: datetime
#     attachments: list[AttachmentRead] = []
#
#     model_config = ConfigDict(from_attributes=True)


# class WSMessage(BaseModel):
#     type: str = Field("message")
#     receiver_id: Optional[int] = None
#     message: Optional[str] = None

class WSMessage(BaseModel):
    type: str = Field("message")
    receiver_id: Optional[int] = None
    message: Optional[str] = None
    files: Optional[List[str]] = []  # или List[UploadFile] если передаешь через Form
