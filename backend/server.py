import os
import re
import uuid
import time
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager
from collections import defaultdict

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, WebSocket, WebSocketDisconnect, Query, Request, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from jose import jwt, JWTError
from passlib.context import CryptContext
import aiofiles
import httpx

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
JWT_SECRET = os.environ.get("JWT_SECRET")
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/backend/uploads")
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")

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

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "Darkjack@cybervoid.net")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Darkjack_1719")

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
    await db.folders.create_index("user_id")
    await db.comments.create_index("file_id")
    await db.password_resets.create_index("token", unique=True)
    await db.password_resets.create_index("expires_at")
    await db.oauth_sessions.create_index("session_token")
    # Seed admin user
    existing_admin = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if not existing_admin:
        admin_id = str(uuid.uuid4())
        await db.users.insert_one({
            "user_id": admin_id,
            "username": "darkjack",
            "email": ADMIN_EMAIL.lower(),
            "password_hash": pwd_context.hash(ADMIN_PASSWORD),
            "display_name": "Darkjack",
            "bio": "System Administrator",
            "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=darkjack",
            "theme_settings": {"accent_color": "#FF2A6D", "wallpaper_url": "", "theme_name": "default"},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": datetime.now(timezone.utc).isoformat(),
            "storage_quota": 10737418240,
            "notification_settings": {"push_enabled": True, "chat_notifications": True, "file_notifications": True},
            "role": "admin",
        })
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

class ForgotPasswordModel(BaseModel):
    email: str

class ResetPasswordModel(BaseModel):
    token: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def check_pw(cls, v):
        return validate_password(v)

class CreateFolderModel(BaseModel):
    name: str
    
    @field_validator('name')
    @classmethod
    def check_name(cls, v):
        if not v or len(v.strip()) > 50:
            raise ValueError("Folder name 1-50 chars")
        return v.strip()

class MoveFileModel(BaseModel):
    folder_id: Optional[str] = None

class FileCommentModel(BaseModel):
    content: str
    
    @field_validator('content')
    @classmethod
    def check_c(cls, v):
        if not v or len(v.strip()) > 1000:
            raise ValueError("Comment 1-1000 chars")
        return v.strip()

class BulkDeleteModel(BaseModel):
    file_ids: List[str]

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
        "storage_quota": 1073741824,
        "notification_settings": {"push_enabled": True, "chat_notifications": True, "file_notifications": True},
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
            "role": user.get("role", "user"),
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
                    "read": False,
                }
                await db.messages.insert_one({**message})
                await db.chats.update_one(
                    {"chat_id": chat_id},
                    {"$set": {"last_message": content, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                msg_out = {k: v for k, v in message.items() if k != "_id"}
                msg_out["type"] = "message"
                await manager.broadcast(chat_id, msg_out)
            elif data.get("type") == "typing":
                await manager.broadcast(chat_id, {
                    "type": "typing",
                    "sender_id": user_id,
                    "sender_username": payload["username"],
                })
            elif data.get("type") == "read":
                await db.messages.update_many(
                    {"chat_id": chat_id, "sender_id": {"$ne": user_id}, "read": {"$ne": True}},
                    {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
                )
                await manager.broadcast(chat_id, {"type": "read", "reader_id": user_id})
    except WebSocketDisconnect:
        manager.disconnect(websocket, chat_id)
    except Exception:
        manager.disconnect(websocket, chat_id)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

# ---- ADMIN ----
async def require_admin(current_user=Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@app.get("/api/admin/stats")
async def admin_stats(admin=Depends(require_admin)):
    db = get_db()
    total_users = await db.users.count_documents({})
    total_files = await db.files.count_documents({"is_avatar": {"$ne": True}})
    total_vault = await db.files.count_documents({"is_vault": True})
    total_chats = await db.chats.count_documents({})
    total_messages = await db.messages.count_documents({})
    total_shares = await db.share_links.count_documents({})
    total_folders = await db.folders.count_documents({})
    total_comments = await db.comments.count_documents({})
    storage_pipeline = [
        {"$match": {"is_avatar": {"$ne": True}}},
        {"$group": {"_id": None, "total": {"$sum": "$file_size"}}}
    ]
    storage_result = await db.files.aggregate(storage_pipeline).to_list(1)
    total_storage = storage_result[0]["total"] if storage_result else 0
    recent_users = await db.users.find({}, {"_id": 0, "password_hash": 0, "vault_hash": 0}).sort("created_at", -1).to_list(5)
    return {
        "total_users": total_users,
        "total_files": total_files,
        "total_vault_files": total_vault,
        "total_chats": total_chats,
        "total_messages": total_messages,
        "total_shares": total_shares,
        "total_folders": total_folders,
        "total_comments": total_comments,
        "total_storage": total_storage,
        "recent_users": recent_users,
    }

@app.get("/api/admin/users")
async def admin_list_users(admin=Depends(require_admin)):
    db = get_db()
    cursor = db.users.find({}, {"_id": 0, "password_hash": 0, "vault_hash": 0}).sort("created_at", -1)
    users = await cursor.to_list(length=200)
    for u in users:
        file_count = await db.files.count_documents({"user_id": u["user_id"], "is_avatar": {"$ne": True}})
        storage_agg = await db.files.aggregate([
            {"$match": {"user_id": u["user_id"]}},
            {"$group": {"_id": None, "total": {"$sum": "$file_size"}}}
        ]).to_list(1)
        u["file_count"] = file_count
        u["storage_used"] = storage_agg[0]["total"] if storage_agg else 0
    return users

@app.get("/api/admin/files")
async def admin_list_files(admin=Depends(require_admin)):
    db = get_db()
    cursor = db.files.find({"is_avatar": {"$ne": True}}, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(length=200)

# ---- GOOGLE OAUTH ----
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

@app.post("/api/auth/google")
async def google_oauth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": session_id})
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google session")
        gdata = resp.json()
    
    db = get_db()
    email = gdata["email"].lower()
    user = await db.users.find_one({"email": email})
    
    if user:
        token = create_token(user["user_id"], user["username"])
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {
            "last_login": datetime.now(timezone.utc).isoformat(),
            "avatar_url": user.get("avatar_url") or gdata.get("picture", ""),
        }})
    else:
        user_id = str(uuid.uuid4())
        username = email.split("@")[0].replace(".", "_")[:24]
        existing = await db.users.find_one({"username": username})
        if existing:
            username = f"{username}_{uuid.uuid4().hex[:4]}"
        user_doc = {
            "user_id": user_id,
            "username": username,
            "email": email,
            "password_hash": "",
            "display_name": gdata.get("name", username),
            "bio": "",
            "avatar_url": gdata.get("picture", f"https://api.dicebear.com/7.x/bottts/svg?seed={username}"),
            "theme_settings": {"accent_color": "#FF2A6D", "wallpaper_url": "", "theme_name": "default"},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": datetime.now(timezone.utc).isoformat(),
            "oauth_provider": "google",
            "storage_used": 0,
            "storage_quota": 1073741824,
            "notification_settings": {"push_enabled": True, "chat_notifications": True, "file_notifications": True},
        }
        await db.users.insert_one(user_doc)
        token = create_token(user_id, username)
        user = user_doc
    
    user_resp = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0, "vault_hash": 0})
    return {"token": token, "user": user_resp}

# ---- GITHUB OAUTH ----
@app.get("/api/auth/github/url")
async def github_auth_url(request: Request):
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=501, detail="GitHub login not configured")
    redirect_uri = request.query_params.get("redirect_uri", "")
    state = secrets.token_urlsafe(16)
    url = f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&redirect_uri={redirect_uri}&scope=user:email&state={state}"
    return {"url": url, "state": state}

@app.post("/api/auth/github")
async def github_oauth_callback(request: Request):
    body = await request.json()
    code = body.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="GitHub login not configured")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={"client_id": GITHUB_CLIENT_ID, "client_secret": GITHUB_CLIENT_SECRET, "code": code},
            headers={"Accept": "application/json"},
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="GitHub token exchange failed")
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=401, detail=token_data.get("error_description", "GitHub auth failed"))

        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        )
        gh_user = user_resp.json()

        emails_resp = await client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        )
        emails = emails_resp.json()
        primary_email = next((e["email"] for e in emails if e.get("primary")), None) or gh_user.get("email")
        if not primary_email:
            raise HTTPException(status_code=400, detail="Could not get email from GitHub")

    db = get_db()
    email = primary_email.lower()
    user = await db.users.find_one({"email": email})

    if user:
        token = create_token(user["user_id"], user["username"])
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {
            "last_login": datetime.now(timezone.utc).isoformat(),
            "avatar_url": user.get("avatar_url") or gh_user.get("avatar_url", ""),
        }})
    else:
        user_id = str(uuid.uuid4())
        username = (gh_user.get("login") or email.split("@")[0]).replace("-", "_")[:24]
        existing = await db.users.find_one({"username": username})
        if existing:
            username = f"{username}_{uuid.uuid4().hex[:4]}"
        user_doc = {
            "user_id": user_id,
            "username": username,
            "email": email,
            "password_hash": "",
            "display_name": gh_user.get("name") or username,
            "bio": gh_user.get("bio") or "",
            "avatar_url": gh_user.get("avatar_url", f"https://api.dicebear.com/7.x/bottts/svg?seed={username}"),
            "theme_settings": {"accent_color": "#FF2A6D", "wallpaper_url": "", "theme_name": "default"},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": datetime.now(timezone.utc).isoformat(),
            "oauth_provider": "github",
            "storage_used": 0,
            "storage_quota": 1073741824,
            "notification_settings": {"push_enabled": True, "chat_notifications": True, "file_notifications": True},
        }
        await db.users.insert_one(user_doc)
        token = create_token(user_id, username)
        user = user_doc

    user_resp = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0, "vault_hash": 0})
    return {"token": token, "user": user_resp}

# ---- FORGOT PASSWORD ----
@app.post("/api/auth/forgot-password")
async def forgot_password(data: ForgotPasswordModel):
    db = get_db()
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"status": "ok", "message": "If email exists, a reset code has been sent"}
    
    if user.get("oauth_provider"):
        return {"status": "oauth", "message": "This account uses Google login. Please sign in with Google."}
    
    token = secrets.token_urlsafe(32)
    code = f"{secrets.randbelow(1000000):06d}"
    await db.password_resets.insert_one({
        "token": token,
        "code": code,
        "email": email,
        "user_id": user["user_id"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
        "used": False,
    })
    return {"status": "ok", "reset_token": token, "code": code, "message": "Reset code generated. In production this would be sent via email."}

@app.post("/api/auth/reset-password")
async def reset_password(data: ResetPasswordModel):
    db = get_db()
    reset = await db.password_resets.find_one({"token": data.token, "used": False})
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if datetime.fromisoformat(reset["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token expired")
    
    new_hash = pwd_context.hash(data.new_password)
    await db.users.update_one({"user_id": reset["user_id"]}, {"$set": {"password_hash": new_hash}})
    await db.password_resets.update_one({"token": data.token}, {"$set": {"used": True}})
    return {"status": "password_reset"}

# ---- FOLDERS ----
@app.post("/api/folders")
async def create_folder(data: CreateFolderModel, current_user=Depends(get_current_user)):
    db = get_db()
    folder_id = str(uuid.uuid4())
    folder = {
        "folder_id": folder_id,
        "user_id": current_user["user_id"],
        "name": data.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.folders.insert_one(folder)
    folder.pop("_id", None)
    return folder

@app.get("/api/folders")
async def get_folders(current_user=Depends(get_current_user)):
    db = get_db()
    cursor = db.folders.find({"user_id": current_user["user_id"]}, {"_id": 0}).sort("name", 1)
    return await cursor.to_list(length=100)

@app.delete("/api/folders/{folder_id}")
async def delete_folder(folder_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    await db.folders.delete_one({"folder_id": folder_id, "user_id": current_user["user_id"]})
    await db.files.update_many({"folder_id": folder_id, "user_id": current_user["user_id"]}, {"$unset": {"folder_id": ""}})
    return {"status": "deleted"}

@app.put("/api/files/{file_id}/move")
async def move_file(file_id: str, data: MoveFileModel, current_user=Depends(get_current_user)):
    db = get_db()
    if data.folder_id:
        await db.files.update_one(
            {"file_id": file_id, "user_id": current_user["user_id"]},
            {"$set": {"folder_id": data.folder_id}}
        )
    else:
        await db.files.update_one(
            {"file_id": file_id, "user_id": current_user["user_id"]},
            {"$unset": {"folder_id": ""}}
        )
    return {"status": "moved"}

# ---- STORAGE QUOTA ----
@app.get("/api/storage")
async def get_storage(current_user=Depends(get_current_user)):
    db = get_db()
    pipeline = [
        {"$match": {"user_id": current_user["user_id"]}},
        {"$group": {"_id": None, "total": {"$sum": "$file_size"}, "count": {"$sum": 1}}}
    ]
    result = await db.files.aggregate(pipeline).to_list(1)
    used = result[0]["total"] if result else 0
    count = result[0]["count"] if result else 0
    quota = 1073741824  # 1GB default
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    if user and user.get("storage_quota"):
        quota = user["storage_quota"]
    return {"used": used, "quota": quota, "count": count, "percent": round(used / quota * 100, 1) if quota else 0}

# ---- FILE COMMENTS ----
@app.post("/api/files/{file_id}/comments")
async def add_comment(file_id: str, data: FileCommentModel, current_user=Depends(get_current_user)):
    db = get_db()
    file_doc = await db.files.find_one({"file_id": file_id})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    comment_id = str(uuid.uuid4())
    comment = {
        "comment_id": comment_id,
        "file_id": file_id,
        "user_id": current_user["user_id"],
        "username": current_user["username"],
        "content": data.content,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.comments.insert_one(comment)
    comment.pop("_id", None)
    return comment

@app.get("/api/files/{file_id}/comments")
async def get_comments(file_id: str):
    db = get_db()
    cursor = db.comments.find({"file_id": file_id}, {"_id": 0}).sort("created_at", 1)
    return await cursor.to_list(length=100)

@app.delete("/api/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    await db.comments.delete_one({"comment_id": comment_id, "user_id": current_user["user_id"]})
    return {"status": "deleted"}

# ---- BULK OPERATIONS ----
@app.post("/api/files/bulk-delete")
async def bulk_delete(data: BulkDeleteModel, current_user=Depends(get_current_user)):
    db = get_db()
    deleted = 0
    for fid in data.file_ids[:50]:
        file_doc = await db.files.find_one({"file_id": fid, "user_id": current_user["user_id"]})
        if file_doc:
            filepath = os.path.join(UPLOAD_DIR, file_doc["stored_name"])
            if os.path.exists(filepath):
                os.remove(filepath)
            await db.files.delete_one({"file_id": fid})
            deleted += 1
    return {"deleted": deleted}

# ---- NOTIFICATION SETTINGS ----
@app.get("/api/notifications/settings")
async def get_notification_settings(current_user=Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    return user.get("notification_settings", {"push_enabled": True, "chat_notifications": True, "file_notifications": True})

@app.put("/api/notifications/settings")
async def update_notification_settings(request: Request, current_user=Depends(get_current_user)):
    db = get_db()
    body = await request.json()
    allowed = {"push_enabled", "chat_notifications", "file_notifications"}
    update = {f"notification_settings.{k}": v for k, v in body.items() if k in allowed}
    if update:
        await db.users.update_one({"user_id": current_user["user_id"]}, {"$set": update})
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    return user.get("notification_settings", {})

# ---- READ RECEIPTS ----
@app.post("/api/chats/{chat_id}/read")
async def mark_as_read(chat_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    await db.messages.update_many(
        {"chat_id": chat_id, "sender_id": {"$ne": current_user["user_id"]}, "read": {"$ne": True}},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "read"}

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
