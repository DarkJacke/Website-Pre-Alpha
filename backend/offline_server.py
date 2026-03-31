import argparse
import base64
import hashlib
import json
import os
import secrets
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from cryptography.fernet import Fernet

ROOT = Path(__file__).resolve().parent.parent
OFFLINE_ROOT = ROOT / "offline"
SECURE_DIR = OFFLINE_ROOT / "secure_vault"
META_FILE = SECURE_DIR / "index.json"
KEY_FILE = SECURE_DIR / ".key"


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


def _load_meta() -> Dict[str, dict]:
    try:
        return json.loads(META_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_meta(meta: Dict[str, dict]) -> None:
    META_FILE.write_text(json.dumps(meta, indent=2), encoding="utf-8")


_ensure_dirs()
fernet = Fernet(_load_key())
app = FastAPI(title="CyberVoid Offline Mode")
app.mount("/static", StaticFiles(directory=str(OFFLINE_ROOT)), name="offline-static")


@app.get("/api/offline/health")
async def health():
    return {"status": "ok", "mode": "offline", "secure_dir": str(SECURE_DIR)}


@app.get("/api/offline/files")
async def list_files():
    meta = _load_meta()
    return {"items": list(meta.values())}


@app.post("/api/offline/upload")
async def upload_file(file: UploadFile = File(...)):
    raw = await file.read()
    encrypted = fernet.encrypt(raw)
    item_id = str(uuid.uuid4())
    enc_path = SECURE_DIR / f"{item_id}.bin"
    enc_path.write_bytes(encrypted)

    meta = _load_meta()
    record = {
        "id": item_id,
        "name": file.filename,
        "size": len(raw),
        "encrypted_size": len(encrypted),
        "content_type": file.content_type or "application/octet-stream",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    meta[item_id] = record
    _save_meta(meta)
    return record


@app.get("/api/offline/download/{item_id}")
async def download_file(item_id: str):
    meta = _load_meta()
    item = meta.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="File not found")

    enc_path = SECURE_DIR / f"{item_id}.bin"
    if not enc_path.exists():
        raise HTTPException(status_code=404, detail="Encrypted file is missing")

    decrypted = fernet.decrypt(enc_path.read_bytes())
    temp_dir = SECURE_DIR / ".tmp"
    temp_dir.mkdir(exist_ok=True)
    temp_file = temp_dir / f"{item_id}_{secrets.token_hex(4)}"
    temp_file.write_bytes(decrypted)

    return FileResponse(
        str(temp_file),
        media_type=item.get("content_type", "application/octet-stream"),
        filename=item.get("name", "download.bin"),
        background=None,
    )


@app.delete("/api/offline/files/{item_id}")
async def delete_file(item_id: str):
    meta = _load_meta()
    item = meta.pop(item_id, None)
    if not item:
        raise HTTPException(status_code=404, detail="File not found")
    enc_path = SECURE_DIR / f"{item_id}.bin"
    if enc_path.exists():
        enc_path.unlink()
    _save_meta(meta)
    return {"status": "deleted", "id": item_id}


@app.get("/{path:path}")
async def spa(path: str):
    target = OFFLINE_ROOT / path
    if path and target.exists() and target.is_file():
        return FileResponse(str(target))
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
