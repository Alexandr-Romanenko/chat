from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.config import settings
from src.auth.routers import router as auth_router
from src.user.routers import router as user_router
from src.chat.routers import router as chat_router
from src.chat.ws_routers import router as ws_router

app = FastAPI()

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_ROOT), name="uploads")

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # разрешённые источники
    allow_credentials=True,      # разрешить cookies и авторизацию
    allow_methods=["*"],         # разрешить все HTTP методы (GET, POST...)
    allow_headers=["*"],         # разрешить все заголовки
)

# Switched on routers
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(chat_router)
app.include_router(ws_router)


# @app.get("/me")
# async def read_me(user: User = Depends(get_current_user)):
#     return {"id": user.id, "email": user.email}