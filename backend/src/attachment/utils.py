import os
import uuid

from datetime import datetime
from pathlib import Path

from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.attachment.models import Attachment
from src.config import settings

MAX_ATTACHMENT_SIZE = settings.MAX_ATTACHMENT_SIZE
UPLOAD_ROOT = settings.UPLOAD_ROOT

def generate_file_path(user_id: int, original_filename: str) -> str:
    """
    Generate uniq path to store file:
    /uploads/{user_id}/{yyyy}/{mm}/{dd}/{uuid4}.{ext}
    """
    # Get of file extension
    ext = os.path.splitext(original_filename)[1]

    # Get current date
    now = datetime.utcnow()
    year = now.strftime("%Y")
    month = now.strftime("%m")
    day = now.strftime("%d")

    # Generate uniq UUID
    unique_id = str(uuid.uuid4())

    # Form relative path
    relative_path = os.path.join(
        UPLOAD_ROOT,
        str(user_id),
        year,
        month,
        day,
        f"{unique_id}{ext}"
    )

    # Create folders if it unexist
    os.makedirs(os.path.dirname(relative_path), exist_ok=True)

    return relative_path


def _sanitize_filename(name: str) -> str:
    return "".join(c for c in name if c.isalnum() or c in (" ", ".", "_", "-")).rstrip()

async def save_attachment(file: UploadFile, message_id: int, session: AsyncSession, user_id: int) -> dict:
    # 1) Form a unique name and path
    original = _sanitize_filename(file.filename)
    ext = Path(original).suffix
    unique_name = f"{uuid.uuid4().hex}{ext or ''}"
    user_folder = os.path.join(UPLOAD_ROOT, str(user_id))

    os.makedirs(user_folder, exist_ok=True)
    path = os.path.join(user_folder, unique_name)

    # 2) Stream recording and size calculation
    size = 0
    try:
        with open(path, "wb") as out_f:
            chunk_size = 1024 * 64
            # move the pointer to the beginning
            file.file.seek(0)
            while True:
                chunk = file.file.read(chunk_size)
                if not chunk:
                    break
                out_f.write(chunk)
                size += len(chunk)
                if size > MAX_ATTACHMENT_SIZE:
                    # delete partially written file
                    out_f.close()
                    os.remove(path)
                    raise HTTPException(status_code=400, detail=f"File {file.filename} exceeds maximum size of 5 MB")
    except Exception:
        # if something went wrong, we confirm the rollback
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass
        raise

    # 3) create an Attachment object (do not commit)
    # attachment = Attachment(
    #     message_id=message_id,
    #     file_path=str(path),
    #     filename=original,
    #     mimetype=file.content_type or "application/octet-stream",
    #     size=size,
    # )
    relative_path = os.path.relpath(path, UPLOAD_ROOT)

    attachment = Attachment(
        message_id=message_id,
        file_path=relative_path,  # ✅ только относительный путь
        filename=original,
        mimetype=file.content_type or "application/octet-stream",
        size=size,
    )
    session.add(attachment)
    await session.flush()  # to get id

    return attachment
