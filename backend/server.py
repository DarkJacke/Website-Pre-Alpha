import os
import re
import uuid
import time
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional
from contextlib import asynccontextmanager
from collections import defaultdict

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, WebSocket, WebSocketDisconnect, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, field_validator
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
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

os.makedirs(UPLOAD_DIR, exist_ok=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
security = HTTPBearer(auto_error=False)

# ---- RATE LIMITER ----
class RateLimiter:
    def __init__(self):
        self.attempts = defaultdict(list)

    def check(self, key: str, max_attempts: int, window_seconds: int):
        now = time.time()
        self.attempts[key] = [t for t in self.attempts[key] if now - t < window_seconds]
        if len(self.attempts[key]) >= max_attempts:
            return False
        self.attempts[key].append(now)
        return True

    def record_failure(self, key: str):
        self.attempts[key].append(time.time())

rate_limiter = RateLimiter()

# ---- VALIDATORS ----
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
USERNAME_REGEX = re.compile(r'^[a-zA-Z0-9_]{3,24}$')
DANGEROUS_FILENAME_CHARS = re.compile(r'[^\w\s\-\.\(\)]', re.UNICODE)

def validate_email(email: str) -> str:
    email = email.strip().lower()
    if not EMAIL_REGEX.match(email):
        raise ValueError("Invalid email format")
    if len(email) > 254:
        raise ValueError("Email too long")
    return email

def validate_username(username: str) -> str:
    username = username.strip()
    if not USERNAME_REGEX.match(username):
        raise ValueError("Username must be 3-24 chars, only letters, numbers, underscores")
    return username

def validate_password(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(password) > 128:
        raise ValueError("Password too long")
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    if not (has_upper and has_lower and has_digit):
        raise ValueError("Password needs uppercase, lowercase, and a number")
    return password

def sanitize_search(query: str) -> str:
    return re.escape(query.strip()[:100])

def sanitize_filename(name: str) -> str:
    name = DANGEROUS_FILENAME_CHARS.sub('_', name)
    return name[:200].strip() or "unnamed"

def password_strength(password: str) -> dict:
    score = 0
    if len(password) >= 8:
        score += 1
    if len(password) >= 12:
        score += 1
    if re.search(r'[A-Z]', password):
        score += 1
    if re.search(r'[a-z]', password):
        score += 1
    if re.search(r'\d', password):
        score += 1
    if re.search(r'[^A-Za-z0-9]', password):
        score += 1
    levels = ['weak', 'weak', 'fair', 'fair', 'good', 'strong', 'very_strong']
    return {"score": score, "level": levels[min(score, 6)]}

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
                except Exception:
                    pass

manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.mongo_client = AsyncIOMotorClient(MONGO_URL)
    app.state.db = app.state.mongo_client[DB_NAME]
    db = app.state.db
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.files.create_index("user_id")
    await db.files.create_index("file_id", unique=True)
    await db.files.create_index([("filename", "text")])
    await db.messages.create_index("chat_id")
    await db.chats.create_index("participants")
    await db.chats.create_index("chat_id", unique=True)
    await db.share_links.create_index("link_id", unique=True)
    await db.share_links.create_index("expires_at")
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

# ---- MODELS ----
class RegisterModel(BaseModel):
    username: str
    email: str
    password: str
    
    @field_validator('username')
    @classmethod
    def check_username(cls, v):
        return validate_username(v)
    
    @field_validator('email')
    @classmethod
    def check_email(cls, v):
        return validate_email(v)
    
    @field_validator('password')
    @classmethod
    def check_password(cls, v):
        return validate_password(v)

class LoginModel(BaseModel):
    email: str
    password: str

class UpdateProfileModel(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    
    @field_validator('display_name')
    @classmethod
    def check_name(cls, v):
        if v and len(v.strip()) > 50:
            raise ValueError("Display name too long")
        return v.strip() if v else v
    
    @field_validator('bio')
    @classmethod
    def check_bio(cls, v):
        if v and len(v) > 500:
            raise ValueError("Bio too long (max 500)")
        return v

class ChangePasswordModel(BaseModel):
    current_password: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def check_new(cls, v):
        return validate_password(v)

class ThemeSettingsModel(BaseModel):
    accent_color: Optional[str] = None
    wallpaper_url: Optional[str] = None
    theme_name: Optional[str] = None

class CreateShareLinkModel(BaseModel):
    file_id: str
    expires_hours: Optional[int] = 24

class VaultPasswordModel(BaseModel):
    vault_password: str

class VaultUnlockModel(BaseModel):
    vault_password: str

class CreateChatModel(BaseModel):
    participant_id: str

class SendMessageModel(BaseModel):
    content: str
    
    @field_validator('content')
    @classmethod
    def check_content(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        if len(v) > 5000:
            raise ValueError("Message too long")
        return v.strip()

# ---- AUTH HELPERS ----
def create_token(user_id: str, username: str):
    payload = {
        "sub": user_id,
        "username": username,
        "iat": datetime.now(timezone.utc),
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
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return {"user_id": payload["sub"], "username": payload["username"]}
    except JWTError:
        return None

# ---- AUTH ROUTES ----
@app.post("/api/auth/register")
async def register(data: RegisterModel, request: Request):
    ip = request.client.host if request.client else "unknown"
    if not rate_limiter.check(f"register:{ip}", max_attempts=5, window_seconds=300):
        raise HTTPException(status_code=429, detail="Too many attempts. Try again in 5 minutes.")
    
    db = get_db()
    existing_email = await db.users.find_one({"email": data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_user = await db.users.find_one({"username": data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    
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
        "last_login": datetime.now(timezone.utc).isoformat(),
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
async def login(data: LoginModel, request: Request):
    ip = request.client.host if request.client else "unknown"
    email = data.email.strip().lower()
    
    if not rate_limiter.check(f"login:{ip}", max_attempts=10, window_seconds=300):
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in 5 minutes.")
    
    if not rate_limiter.check(f"login:{email}", max_attempts=5, window_seconds=300):
        raise HTTPException(status_code=429, detail="Account temporarily locked. Try again in 5 minutes.")
    
    db = get_db()
    user = await db.users.find_one({"email": email})
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        rate_limiter.record_failure(f"login:{email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}})
    
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

@app.post("/api/auth/password-check")
async def check_password_strength(data: dict):
    pwd = data.get("password", "")
    return password_strength(pwd)

@app.put("/api/auth/change-password")
async def change_password(data: ChangePasswordModel, current_user=Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not pwd_context.verify(data.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    new_hash = pwd_context.hash(data.new_password)
    await db.users.update_one({"user_id": current_user["user_id"]}, {"$set": {"password_hash": new_hash}})
    return {"status": "password_changed"}

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
    original_name = sanitize_filename(file.filename or "unnamed")
    ext = os.path.splitext(original_name)[1].lower()
    stored_name = f"{file_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, stored_name)
    
    file_size = 0
    async with aiofiles.open(filepath, 'wb') as f:
        while chunk := await file.read(1024 * 1024):
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE:
                await f.close()
                os.remove(filepath)
                raise HTTPException(status_code=413, detail="File too large (max 100MB)")
            await f.write(chunk)
    
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
        "filename": original_name,
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
    cursor = db.files.find(
        {"user_id": current_user["user_id"], "is_vault": {"$ne": True}, "is_avatar": {"$ne": True}},
        {"_id": 0}
    ).sort("created_at", -1)
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
    safe_q = sanitize_search(q)
    if not safe_q:
        return results
    
    if type in ("all", "files"):
        file_query = {"is_public": True, "filename": {"$regex": safe_q, "$options": "i"}}
        cursor = db.files.find(file_query, {"_id": 0}).limit(20)
        results["files"] = await cursor.to_list(length=20)
    
    if type in ("all", "accounts"):
        user_query = {"$or": [
            {"username": {"$regex": safe_q, "$options": "i"}},
            {"display_name": {"$regex": safe_q, "$options": "i"}}
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
                content = (data.get("content") or "").strip()
                if not content or len(content) > 5000:
                    continue
                msg_id = str(uuid.uuid4())
                message = {
                    "message_id": msg_id,
                    "chat_id": chat_id,
                    "sender_id": user_id,
                    "sender_username": payload["username"],
                    "content": content,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.messages.insert_one({**message})
                await db.chats.update_one(
                    {"chat_id": chat_id},
                    {"$set": {"last_message": content, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                await manager.broadcast(chat_id, message)
    except WebSocketDisconnect:
        manager.disconnect(websocket, chat_id)
    except Exception:
        manager.disconnect(websocket, chat_id)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

# ---- SHARE LINKS ----
@app.post("/api/share")
async def create_share_link(data: CreateShareLinkModel, current_user=Depends(get_current_user)):
    db = get_db()
    file_doc = await db.files.find_one({"file_id": data.file_id, "user_id": current_user["user_id"]})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    link_id = str(uuid.uuid4())[:12]
    hours = min(max(data.expires_hours or 24, 1), 720)  # 1h to 30 days
    expires_at = datetime.now(timezone.utc) + timedelta(hours=hours)
    
    share = {
        "link_id": link_id,
        "file_id": data.file_id,
        "user_id": current_user["user_id"],
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "download_count": 0,
    }
    await db.share_links.insert_one(share)
    share.pop("_id", None)
    return share

@app.get("/api/share/{link_id}")
async def get_share_info(link_id: str):
    db = get_db()
    share = await db.share_links.find_one({"link_id": link_id}, {"_id": 0})
    if not share:
        raise HTTPException(status_code=404, detail="Link not found")
    if datetime.fromisoformat(share["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Link expired")
    file_doc = await db.files.find_one({"file_id": share["file_id"]}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File no longer exists")
    return {"share": share, "file": file_doc}

@app.get("/api/share/{link_id}/download")
async def download_shared_file(link_id: str):
    db = get_db()
    share = await db.share_links.find_one({"link_id": link_id})
    if not share:
        raise HTTPException(status_code=404, detail="Link not found")
    if datetime.fromisoformat(share["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Link expired")
    file_doc = await db.files.find_one({"file_id": share["file_id"]}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    filepath = os.path.join(UPLOAD_DIR, file_doc["stored_name"])
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found on disk")
    await db.share_links.update_one({"link_id": link_id}, {"$inc": {"download_count": 1}})
    return FileResponse(filepath, media_type="application/octet-stream", filename=file_doc["filename"])

@app.get("/api/share/{link_id}/preview")
async def preview_shared_file(link_id: str):
    db = get_db()
    share = await db.share_links.find_one({"link_id": link_id})
    if not share:
        raise HTTPException(status_code=404, detail="Link not found")
    if datetime.fromisoformat(share["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Link expired")
    file_doc = await db.files.find_one({"file_id": share["file_id"]}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    filepath = os.path.join(UPLOAD_DIR, file_doc["stored_name"])
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(filepath, media_type=file_doc["content_type"], filename=file_doc["filename"])

@app.get("/api/my-shares")
async def get_my_shares(current_user=Depends(get_current_user)):
    db = get_db()
    cursor = db.share_links.find({"user_id": current_user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    links = await cursor.to_list(length=50)
    return links

@app.delete("/api/share/{link_id}")
async def delete_share_link(link_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    result = await db.share_links.delete_one({"link_id": link_id, "user_id": current_user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Link not found")
    return {"status": "deleted"}

# ---- SECURE VAULT ----
@app.post("/api/vault/setup")
async def setup_vault(data: VaultPasswordModel, current_user=Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    if user.get("vault_hash"):
        raise HTTPException(status_code=400, detail="Vault already set up")
    vault_hash = pwd_context.hash(data.vault_password)
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"vault_hash": vault_hash}}
    )
    return {"status": "vault_created"}

@app.post("/api/vault/unlock")
async def unlock_vault(data: VaultUnlockModel, current_user=Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    if not user.get("vault_hash"):
        raise HTTPException(status_code=400, detail="Vault not set up")
    if not pwd_context.verify(data.vault_password, user["vault_hash"]):
        raise HTTPException(status_code=401, detail="Wrong vault password")
    vault_token = jwt.encode(
        {"sub": current_user["user_id"], "vault": True, "exp": datetime.now(timezone.utc) + timedelta(minutes=30)},
        JWT_SECRET, algorithm="HS256"
    )
    return {"vault_token": vault_token}

@app.get("/api/vault/status")
async def vault_status(current_user=Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    has_vault = bool(user.get("vault_hash"))
    count = await db.files.count_documents({"user_id": current_user["user_id"], "is_vault": True})
    return {"has_vault": has_vault, "vault_files_count": count}

@app.post("/api/vault/upload")
async def upload_vault_file(
    file: UploadFile = File(...),
    vault_token: str = Form(...),
    current_user=Depends(get_current_user)
):
    try:
        payload = jwt.decode(vault_token, JWT_SECRET, algorithms=["HS256"])
        if not payload.get("vault") or payload["sub"] != current_user["user_id"]:
            raise HTTPException(status_code=401, detail="Invalid vault token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Vault session expired")
    
    db = get_db()
    file_id = str(uuid.uuid4())
    original_name = sanitize_filename(file.filename or "unnamed")
    ext = os.path.splitext(original_name)[1].lower()
    stored_name = f"vault_{file_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, stored_name)
    
    file_size = 0
    async with aiofiles.open(filepath, 'wb') as f:
        while chunk := await file.read(1024 * 1024):
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE:
                os.remove(filepath)
                raise HTTPException(status_code=413, detail="File too large")
            await f.write(chunk)
    
    image_exts = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'}
    video_exts = {'.mp4', '.webm', '.mov', '.avi', '.mkv'}
    file_type = "image" if ext in image_exts else "video" if ext in video_exts else "other"
    
    file_doc = {
        "file_id": file_id,
        "user_id": current_user["user_id"],
        "username": current_user["username"],
        "filename": original_name,
        "stored_name": stored_name,
        "file_type": file_type,
        "content_type": file.content_type or "application/octet-stream",
        "file_size": file_size,
        "is_public": False,
        "is_vault": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.files.insert_one(file_doc)
    file_doc.pop("_id", None)
    return file_doc

@app.get("/api/vault/files")
async def get_vault_files(vault_token: str = Query(...), current_user=Depends(get_current_user)):
    try:
        payload = jwt.decode(vault_token, JWT_SECRET, algorithms=["HS256"])
        if not payload.get("vault") or payload["sub"] != current_user["user_id"]:
            raise HTTPException(status_code=401, detail="Invalid vault token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Vault session expired")
    
    db = get_db()
    cursor = db.files.find(
        {"user_id": current_user["user_id"], "is_vault": True},
        {"_id": 0}
    ).sort("created_at", -1)
    return await cursor.to_list(length=500)

@app.delete("/api/vault/files/{file_id}")
async def delete_vault_file(file_id: str, vault_token: str = Query(...), current_user=Depends(get_current_user)):
    try:
        payload = jwt.decode(vault_token, JWT_SECRET, algorithms=["HS256"])
        if not payload.get("vault") or payload["sub"] != current_user["user_id"]:
            raise HTTPException(status_code=401, detail="Invalid vault token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Vault session expired")
    
    db = get_db()
    file_doc = await db.files.find_one({"file_id": file_id, "user_id": current_user["user_id"], "is_vault": True})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    filepath = os.path.join(UPLOAD_DIR, file_doc["stored_name"])
    if os.path.exists(filepath):
        os.remove(filepath)
    await db.files.delete_one({"file_id": file_id})
    return {"status": "deleted"}

# ---- AVATAR UPLOAD ----
@app.post("/api/users/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    db = get_db()
    ext = os.path.splitext(file.filename or ".png")[1].lower()
    if ext not in {'.jpg', '.jpeg', '.png', '.gif', '.webp'}:
        raise HTTPException(status_code=400, detail="Only image files allowed for avatar")
    
    avatar_name = f"avatar_{current_user['user_id']}{ext}"
    filepath = os.path.join(UPLOAD_DIR, avatar_name)
    
    file_size = 0
    async with aiofiles.open(filepath, 'wb') as f:
        while chunk := await file.read(1024 * 1024):
            file_size += len(chunk)
            if file_size > 5 * 1024 * 1024:
                os.remove(filepath)
                raise HTTPException(status_code=413, detail="Avatar too large (max 5MB)")
            await f.write(chunk)
    
    avatar_path = f"/api/files/preview/avatar_{current_user['user_id']}"
    # Store as a special file for serving
    await db.files.update_one(
        {"file_id": f"avatar_{current_user['user_id']}"},
        {"$set": {
            "file_id": f"avatar_{current_user['user_id']}",
            "user_id": current_user["user_id"],
            "filename": avatar_name,
            "stored_name": avatar_name,
            "file_type": "image",
            "content_type": file.content_type or "image/png",
            "file_size": file_size,
            "is_public": True,
            "is_avatar": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )
    
    full_avatar_url = f"{os.environ.get('APP_URL', '')}/api/files/preview/avatar_{current_user['user_id']}"
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"avatar_url": full_avatar_url}}
    )
    user = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    return user
