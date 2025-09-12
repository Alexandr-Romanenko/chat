from pydantic import BaseModel, Field, field_validator, ConfigDict, field_serializer
from src.config import settings


MAX_ATTACHMENT_SIZE = settings.MAX_ATTACHMENT_SIZE

class AttachmentBase(BaseModel):
    filename: str = Field(..., max_length=255)
    mimetype: str
    size: int

    @field_validator("size")
    @classmethod
    def check_size(cls, v: int) -> int:
        if v > MAX_ATTACHMENT_SIZE:
            raise ValueError("File size exceeds 5 MB")
        return v


class AttachmentRead(AttachmentBase):
    id: int
    message_id: int
    file_path: str

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("file_path")
    def serialize_path(self, v: str) -> str:
        return f"uploads/{v}"
