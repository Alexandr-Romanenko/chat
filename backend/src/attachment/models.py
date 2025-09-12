from sqlalchemy import Integer, String, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base
from src.chat.models import Message

class Attachment(Base):
    __tablename__ = "attachment"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    filename: Mapped[str] = mapped_column(String(length=255), nullable=False)
    mimetype: Mapped[str] = mapped_column(String, nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)

    message_id: Mapped[int] = mapped_column(Integer, ForeignKey(Message.id), nullable=False)
    message: Mapped["Message"] = relationship("Message", back_populates="attachments")

    __table_args__ = (
        CheckConstraint("size <= 5242880", name="check_attachment_size"),  # 5 MB
    )
