from sqlalchemy import Integer, String, TIMESTAMP, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from datetime import datetime
from src.user.models import User
from src.database import Base


class Message(Base):
    __tablename__ = "message"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    message: Mapped[str] = mapped_column(String(length=500), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey(User.id))  # автор
    receiver_id: Mapped[int] = mapped_column(Integer, ForeignKey(User.id))  # получатель
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow, nullable=False)

    attachments: Mapped[list["Attachment"]] = relationship(
        "Attachment",
        back_populates="message",
        cascade="all, delete-orphan",
    )
