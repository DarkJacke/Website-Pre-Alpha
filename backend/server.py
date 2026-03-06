import os
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from jose import jwt, JWTError
from passlib.context import CryptContext
import aiofiles

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
JWT_SECRET = os.environ.get("JWT_SECRET")
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/backend/uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# Connection Manager for WebSocket Chat
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, chat_id: str):
        await websocket.accept()
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = []
        self.active_connections[chat_id].append(websocket)

    def disconnect(self, websocket: WebSocket, chat_id: str):
        if chat_id in self.active_connections:
            self.active_connections[chat_id] = [
                ws for ws in self.active_connections[chat_id] if ws != websocket
            ]

    async def broadcast(self, chat_id: str, message: dict):
        if chat_id in self.active_connections:
            for connection in self.active_connections[chat_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.mongo_client = AsyncIOMotorClient(MONGO_URL)
    app.state.db = app.state.mongo_client[DB_NAME]
    # Create indexes
    db = app.state.db
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.files.create_index("user_id")
    await db.files.create_index("filename")
    await db.messages.create_index("chat_id")
    await db.chats.create_index("participants")
    yield
    app.state.mongo_client.close()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    return app.state.db

# Models
class RegisterModel(BaseModel):
    username: str
    email: str
    password: str

class LoginModel(BaseModel):
    email: str
    password: str

class UpdateProfileModel(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class ThemeSettingsModel(BaseModel):
    accent_color: Optional[str] = None
    wallpaper_url: Optional[str] = None
    theme_name: Optional[str] = None

class CreateChatModel(BaseModel):
    participant_id: str

class SendMessageModel(BaseModel):
    content: str

# Auth Helpers
def create_token(user_id: str, username: str):
    payload = {
        "sub": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return {"user_id": payload["sub"], "username": payload["username"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return {"user_id": payload["sub"], "username": payload["username"]}
    except JWTError:
        return None

def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# ---- AUTH ROUTES ----
@app.post("/api/auth/register")
async def register(data: RegisterModel):
    db = get_db()
    existing = await db.users.find_one({"$or": [{"email": data.email}, {"username": data.username}]})
    if existing:
        raise HTTPException(status_code=400, detail="Email or username already exists")
    
    user_id = str(uuid.uuid4())
    user = {
        "user_id": user_id,
        "username": data.username,
        "email": data.email,
        "password_hash": pwd_context.hash(data.password),
        "display_name": data.username,
        "bio": "",
        "avatar_url": f"https://api.dicebear.com/7.x/bottts/svg?seed={data.username}",
        "theme_settings": {"accent_color": "#FF2A6D", "wallpaper_url": "", "theme_name": "default"},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_token(user_id, data.username)
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "username": data.username,
            "email": data.email,
            "display_name": data.username,
            "bio": "",
            "avatar_url": user["avatar_url"],
            "theme_settings": user["theme_settings"],
        }
    }

@app.post("/api/auth/login")
async def login(data: LoginModel):
    db = get_db()
    user = await db.users.find_one({"email": data.email})
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["user_id"], user["username"])
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
            "display_name": user.get("display_name", user["username"]),
            "bio": user.get("bio", ""),
            "avatar_url": user.get("avatar_url", ""),
            "theme_settings": user.get("theme_settings", {}),
        }
    }

@app.get("/api/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ---- USER ROUTES ----
@app.get("/api/users/{user_id}")
async def get_user_profile(user_id: str):
    db = get_db()
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0, "email": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/api/users/profile")
async def update_profile(data: UpdateProfileModel, current_user=Depends(get_current_user)):
    db = get_db()
    update = {}
    if data.display_name is not None:
        update["display_name"] = data.display_name
    if data.bio is not None:
        update["bio"] = data.bio
    if data.avatar_url is not None:
        update["avatar_url"] = data.avatar_url
    if update:
        await db.users.update_one({"user_id": current_user["user_id"]}, {"$set": update})
    user = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    return user

@app.put("/api/users/theme")
async def update_theme(data: ThemeSettingsModel, current_user=Depends(get_current_user)):
    db = get_db()
    update = {}
    if data.accent_color is not None:
        update["theme_settings.accent_color"] = data.accent_color
    if data.wallpaper_url is not None:
        update["theme_settings.wallpaper_url"] = data.wallpaper_url
    if data.theme_name is not None:
        update["theme_settings.theme_name"] = data.theme_name
    if update:
        await db.users.update_one({"user_id": current_user["user_id"]}, {"$set": update})
    user = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    return user

# ---- FILE ROUTES ----
@app.post("/api/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    is_public: bool = Form(True),
    current_user=Depends(get_current_user)
):
    db = get_db()
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower()
    stored_name = f"{file_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, stored_name)
    
    file_size = 0
    async with aiofiles.open(filepath, 'wb') as f:
        while chunk := await file.read(1024 * 1024):
            await f.write(chunk)
            file_size += len(chunk)
    
    # Determine file type
    image_exts = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'}
    video_exts = {'.mp4', '.webm', '.mov', '.avi', '.mkv'}
    doc_exts = {'.pdf', '.doc', '.docx', '.txt', '.md'}
    
    if ext in image_exts:
        file_type = "image"
    elif ext in video_exts:
        file_type = "video"
    elif ext in doc_exts:
        file_type = "document"
    else:
        file_type = "other"
    
    file_doc = {
        "file_id": file_id,
        "user_id": current_user["user_id"],
        "username": current_user["username"],
        "filename": file.filename,
        "stored_name": stored_name,
        "file_type": file_type,
        "content_type": file.content_type or "application/octet-stream",
        "file_size": file_size,
        "is_public": is_public,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.files.insert_one(file_doc)
    file_doc.pop("_id", None)
    return file_doc

@app.get("/api/files")
async def get_my_files(current_user=Depends(get_current_user)):
    db = get_db()
    cursor = db.files.find({"user_id": current_user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    files = await cursor.to_list(length=500)
    return files

@app.get("/api/files/public/{user_id}")
async def get_user_public_files(user_id: str):
    db = get_db()
    cursor = db.files.find({"user_id": user_id, "is_public": True}, {"_id": 0}).sort("created_at", -1)
    files = await cursor.to_list(length=500)
    return files

@app.get("/api/files/preview/{file_id}")
async def preview_file(file_id: str):
    db = get_db()
    file_doc = await db.files.find_one({"file_id": file_id}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    filepath = os.path.join(UPLOAD_DIR, file_doc["stored_name"])
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(filepath, media_type=file_doc["content_type"], filename=file_doc["filename"])

@app.get("/api/files/download/{file_id}")
async def download_file(file_id: str):
    db = get_db()
    file_doc = await db.files.find_one({"file_id": file_id}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    filepath = os.path.join(UPLOAD_DIR, file_doc["stored_name"])
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(filepath, media_type="application/octet-stream", filename=file_doc["filename"])

@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    file_doc = await db.files.find_one({"file_id": file_id, "user_id": current_user["user_id"]})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    filepath = os.path.join(UPLOAD_DIR, file_doc["stored_name"])
    if os.path.exists(filepath):
        os.remove(filepath)
    await db.files.delete_one({"file_id": file_id})
    return {"status": "deleted"}

# ---- SEARCH ROUTES ----
@app.get("/api/search")
async def search(q: str = Query(...), type: str = Query("all"), current_user=Depends(get_optional_user)):
    db = get_db()
    results = {"files": [], "users": []}
    
    if type in ("all", "files"):
        file_query = {"is_public": True, "filename": {"$regex": q, "$options": "i"}}
        cursor = db.files.find(file_query, {"_id": 0}).limit(20)
        results["files"] = await cursor.to_list(length=20)
    
    if type in ("all", "accounts"):
        user_query = {"$or": [
            {"username": {"$regex": q, "$options": "i"}},
            {"display_name": {"$regex": q, "$options": "i"}}
        ]}
        cursor = db.users.find(user_query, {"_id": 0, "password_hash": 0, "email": 0}).limit(20)
        results["users"] = await cursor.to_list(length=20)
    
    return results

# ---- CHAT ROUTES ----
@app.get("/api/chats")
async def get_chats(current_user=Depends(get_current_user)):
    db = get_db()
    cursor = db.chats.find(
        {"participants": current_user["user_id"]},
        {"_id": 0}
    ).sort("updated_at", -1)
    chats = await cursor.to_list(length=50)
    
    # Enrich with participant info
    for chat in chats:
        other_id = [p for p in chat["participants"] if p != current_user["user_id"]]
        if other_id:
            other_user = await db.users.find_one(
                {"user_id": other_id[0]},
                {"_id": 0, "password_hash": 0, "email": 0}
            )
            chat["other_user"] = other_user
    return chats

@app.post("/api/chats")
async def create_or_get_chat(data: CreateChatModel, current_user=Depends(get_current_user)):
    db = get_db()
    if data.participant_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")
    
    other_user = await db.users.find_one({"user_id": data.participant_id})
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing = await db.chats.find_one({
        "participants": {"$all": [current_user["user_id"], data.participant_id]}
    }, {"_id": 0})
    
    if existing:
        existing["other_user"] = {
            "user_id": other_user["user_id"],
            "username": other_user["username"],
            "display_name": other_user.get("display_name", other_user["username"]),
            "avatar_url": other_user.get("avatar_url", ""),
        }
        return existing
    
    chat_id = str(uuid.uuid4())
    chat = {
        "chat_id": chat_id,
        "participants": [current_user["user_id"], data.participant_id],
        "last_message": "",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chats.insert_one(chat)
    chat.pop("_id", None)
    chat["other_user"] = {
        "user_id": other_user["user_id"],
        "username": other_user["username"],
        "display_name": other_user.get("display_name", other_user["username"]),
        "avatar_url": other_user.get("avatar_url", ""),
    }
    return chat

@app.get("/api/chats/{chat_id}/messages")
async def get_messages(chat_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    chat = await db.chats.find_one({"chat_id": chat_id})
    if not chat or current_user["user_id"] not in chat["participants"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    cursor = db.messages.find({"chat_id": chat_id}, {"_id": 0}).sort("created_at", 1)
    messages = await cursor.to_list(length=200)
    return messages

@app.post("/api/chats/{chat_id}/messages")
async def send_message(chat_id: str, data: SendMessageModel, current_user=Depends(get_current_user)):
    db = get_db()
    chat = await db.chats.find_one({"chat_id": chat_id})
    if not chat or current_user["user_id"] not in chat["participants"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    msg_id = str(uuid.uuid4())
    message = {
        "message_id": msg_id,
        "chat_id": chat_id,
        "sender_id": current_user["user_id"],
        "sender_username": current_user["username"],
        "content": data.content,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(message)
    message.pop("_id", None)
    
    await db.chats.update_one(
        {"chat_id": chat_id},
        {"$set": {"last_message": data.content, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Broadcast via WebSocket
    await manager.broadcast(chat_id, message)
    return message

# ---- WEBSOCKET ----
@app.websocket("/api/ws/chat/{chat_id}")
async def websocket_chat(websocket: WebSocket, chat_id: str):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload["sub"]
    except JWTError:
        await websocket.close(code=4001)
        return
    
    db = get_db()
    chat = await db.chats.find_one({"chat_id": chat_id})
    if not chat or user_id not in chat["participants"]:
        await websocket.close(code=4003)
        return
    
    await manager.connect(websocket, chat_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "message":
                msg_id = str(uuid.uuid4())
                message = {
                    "message_id": msg_id,
                    "chat_id": chat_id,
                    "sender_id": user_id,
                    "sender_username": payload["username"],
                    "content": data["content"],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.messages.insert_one({**message})
                await db.chats.update_one(
                    {"chat_id": chat_id},
                    {"$set": {"last_message": data["content"], "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                await manager.broadcast(chat_id, message)
    except WebSocketDisconnect:
        manager.disconnect(websocket, chat_id)
    except Exception:
        manager.disconnect(websocket, chat_id)

@app.get("/api/health")
async def health():
    return {"status": "ok"}
