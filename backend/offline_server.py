import argparse
import base64
import hashlib
import json
import os
import secrets
import shutil
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

from cryptography.fernet import Fernet, InvalidToken
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent
OFFLINE_ROOT = ROOT / "offline"
SECURE_DIR = OFFLINE_ROOT / "secure_vault"
META_FILE = SECURE_DIR / "index.json"
KEY_FILE = SECURE_DIR / ".key"
SQLITE_FILE = SECURE_DIR / "index.sqlite3"
MAX_SIZE = 100 * 1024 * 1024


class MetadataStore:
    def list_items(self) -> list[dict]:
        raise NotImplementedError

    def get_item(self, item_id: str) -> dict | None:
        raise NotImplementedError

    def upsert_item(self, item_id: str, record: dict) -> None:
        raise NotImplementedError

    def delete_item(self, item_id: str) -> dict | None:
        raise NotImplementedError


class JsonMetadataStore(MetadataStore):
    def __init__(self, meta_file: Path):
        self.meta_file = meta_file

    def _load_meta(self) -> Dict[str, dict]:
        try:
            return json.loads(self.meta_file.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _save_meta(self, meta: Dict[str, dict]) -> None:
        self.meta_file.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    def list_items(self) -> list[dict]:
        return list(self._load_meta().values())

    def get_item(self, item_id: str) -> dict | None:
        return self._load_meta().get(item_id)

    def upsert_item(self, item_id: str, record: dict) -> None:
        meta = self._load_meta()
        meta[item_id] = record
        self._save_meta(meta)

    def delete_item(self, item_id: str) -> dict | None:
        meta = self._load_meta()
        removed = meta.pop(item_id, None)
        self._save_meta(meta)
        return removed


class SqliteMetadataStore(MetadataStore):
    def __init__(self, sqlite_file: Path):
        self.sqlite_file = sqlite_file
        self._ensure_table()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.sqlite_file)

    def _ensure_table(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS files (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    size INTEGER NOT NULL,
                    encrypted_size INTEGER NOT NULL,
                    content_type TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )

    def list_items(self) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, name, size, encrypted_size, content_type, created_at FROM files ORDER BY created_at DESC"
            ).fetchall()
        return [
            {
                "id": row[0],
                "name": row[1],
                "size": row[2],
                "encrypted_size": row[3],
                "content_type": row[4],
                "created_at": row[5],
            }
            for row in rows
        ]

    def get_item(self, item_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT id, name, size, encrypted_size, content_type, created_at FROM files WHERE id = ?",
                (item_id,),
            ).fetchone()
        if not row:
            return None
        return {
            "id": row[0],
            "name": row[1],
            "size": row[2],
            "encrypted_size": row[3],
            "content_type": row[4],
            "created_at": row[5],
        }

    def upsert_item(self, item_id: str, record: dict) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO files (id, name, size, encrypted_size, content_type, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    size=excluded.size,
                    encrypted_size=excluded.encrypted_size,
                    content_type=excluded.content_type,
                    created_at=excluded.created_at
                """,
                (
                    item_id,
                    record["name"],
                    record["size"],
                    record["encrypted_size"],
                    record["content_type"],
                    record["created_at"],
                ),
            )

    def delete_item(self, item_id: str) -> dict | None:
        existing = self.get_item(item_id)
        if not existing:
            return None
        with self._connect() as conn:
            conn.execute("DELETE FROM files WHERE id = ?", (item_id,))
        return existing



def _ensure_dirs() -> None:
    SECURE_DIR.mkdir(parents=True, exist_ok=True)
    if not META_FILE.exists():
        META_FILE.write_text("{}", encoding="utf-8")


def _load_key() -> bytes:
    if KEY_FILE.exists():
        return KEY_FILE.read_bytes()
    seed = os.environ.get("OFFLINE_SECRET", "")
    if seed:
        digest = hashlib.sha256(seed.encode("utf-8")).digest()
        key = base64.urlsafe_b64encode(digest)
    else:
        key = Fernet.generate_key()
    KEY_FILE.write_bytes(key)
    return key


def _select_store() -> MetadataStore:
    backend = os.environ.get("OFFLINE_DB_BACKEND", "json").strip().lower()
    if backend == "sqlite":
        return SqliteMetadataStore(SQLITE_FILE)
    return JsonMetadataStore(META_FILE)


_ensure_dirs()
metadata_store = _select_store()
fernet = Fernet(_load_key())
app = FastAPI(title="CyberVoid Offline Mode")
app.mount("/static", StaticFiles(directory=str(OFFLINE_ROOT)), name="offline-static")


@app.get("/api/offline/health")
async def health():
    return {
        "status": "ok",
        "mode": "offline",
        "secure_dir": str(SECURE_DIR),
        "metadata_backend": metadata_store.__class__.__name__.replace("MetadataStore", "").lower(),
    }


@app.get("/api/offline/files")
async def list_files():
    return {"items": metadata_store.list_items()}


@app.post("/api/offline/upload")
async def upload_file(file: UploadFile = File(...)):
    raw = await file.read()
    if len(raw) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 100MB)")

    encrypted = fernet.encrypt(raw)
    item_id = str(uuid.uuid4())
    enc_path = SECURE_DIR / f"{item_id}.bin"
    enc_path.write_bytes(encrypted)

    record = {
        "id": item_id,
        "name": file.filename or "unnamed",
        "size": len(raw),
        "encrypted_size": len(encrypted),
        "content_type": file.content_type or "application/octet-stream",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    metadata_store.upsert_item(item_id, record)
    return record


@app.get("/api/offline/download/{item_id}")
async def download_file(item_id: str):
    item = metadata_store.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="File not found")

    enc_path = SECURE_DIR / f"{item_id}.bin"
    if not enc_path.exists():
        raise HTTPException(status_code=404, detail="Encrypted file is missing")

    try:
        decrypted = fernet.decrypt(enc_path.read_bytes())
    except InvalidToken as exc:
        raise HTTPException(status_code=500, detail="Unable to decrypt file with current key") from exc

    temp_dir = SECURE_DIR / ".tmp"
    temp_dir.mkdir(exist_ok=True)
    temp_file = temp_dir / f"{item_id}_{secrets.token_hex(4)}"
    temp_file.write_bytes(decrypted)

    response = FileResponse(
        str(temp_file),
        media_type=item.get("content_type", "application/octet-stream"),
        filename=item.get("name", "download.bin"),
    )

    @response.call_on_close
    def _cleanup_temp_file() -> None:
        if temp_file.exists():
            temp_file.unlink()

    return response


@app.delete("/api/offline/files/{item_id}")
async def delete_file(item_id: str):
    item = metadata_store.delete_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="File not found")
    enc_path = SECURE_DIR / f"{item_id}.bin"
    if enc_path.exists():
        enc_path.unlink()
    return {"status": "deleted", "id": item_id}


@app.get("/{path:path}")
async def spa(path: str):
    if path:
        try:
            target = (OFFLINE_ROOT / path).resolve()
            if target.is_file() and target.is_relative_to(OFFLINE_ROOT.resolve()):
                return FileResponse(str(target))
        except (Exception, ValueError):
            pass
    return HTMLResponse((OFFLINE_ROOT / "index.html").read_text(encoding="utf-8"))


if __name__ == "__main__":
    import uvicorn

    parser = argparse.ArgumentParser(description="CyberVoid offline mode server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    parser.add_argument("--reset", action="store_true", help="Reset offline encrypted storage")
    args = parser.parse_args()

    if args.reset and SECURE_DIR.exists():
        shutil.rmtree(SECURE_DIR)
        _ensure_dirs()

    uvicorn.run(app, host=args.host, port=args.port)
