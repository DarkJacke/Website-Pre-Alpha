# CyberVoid Hub - Secure File Storage Platform

A modern, cyberpunk-themed file storage hub with real-time messaging, secure vault, share links, and full theme customization. Built with React + FastAPI + MongoDB.

---

## Features

### File Management
- **Upload** any file type up to 100MB (drag & drop or click)
- **Download** files directly
- **Online Preview** for images and videos (full-screen modal)
- **Grid/List view** with file type filters (image, video, document, other)
- **Public/Private** toggle per file

### Share Links (NEW)
- **Generate temporary download links** with custom expiration (1h, 6h, 24h, 7 days, 30 days)
- **Share with anyone** - no account required to download
- **Download counter** tracks how many times each link was used
- **Auto-expire** - links become invalid after set time
- **Copy to clipboard** one-click sharing

### Secure Vault (NEW)
- **Password-protected folder** - separate password from your account
- **30-minute sessions** - vault auto-locks after 30 min of inactivity
- **Upload directly to vault** - files never appear in your public dashboard
- **Separate bcrypt-hashed password** for vault access
- **Visual lock/unlock** interface

### User System
- **Register & Login** with JWT authentication
- **User Profiles** viewable by anyone via user ID
- **Custom Avatar** - upload your own profile picture (max 5MB)
- **Display Name** (nickname) - different from username, shown to other users
- **Username** (unique) - used for searching and mentioning
- **Bio** field for profile description
- **Copy User ID** to share your profile

### Real-Time Chat
- **WebSocket-powered** instant messaging
- **Start conversations** from search results or user profiles
- **Message history** persisted in MongoDB
- **Chat list** with last message preview

### Search
- **Dual search** - files and user accounts
- **Category toggle** - All, Files, Accounts
- **Quick actions** - view profile, start chat, download

### Theme Customization
- **8 Accent Colors**: Neon Red, Neon Pink, Electric Blue, Acid Green, Cyber Yellow, Void Purple, Sunset Orange, Ice White
- **Wallpaper System**: 3 presets + custom URL
- **AMOLED Black** base (#000000)
- **Persistent** - saved to your account

### Security
- **Bcrypt** hashing (12 rounds) for passwords
- **JWT tokens** with 30-day expiration
- **Rate limiting** (5 login/email, 10/IP per 5 min)
- **Input validation** everywhere
- **Search sanitization** (anti-regex injection)
- **File name sanitization**
- **WebSocket authentication**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Tailwind CSS |
| Backend | Python FastAPI |
| Database | MongoDB (Motor async) |
| Auth | JWT + bcrypt |
| Real-time | WebSockets |
| Fonts | Orbitron, JetBrains Mono, Rajdhani |
| Icons | Lucide React |

---

## Project Structure

```
/app
├── backend/
│   ├── server.py          # All API routes, WebSocket, auth, vault, sharing
│   ├── .env               # Environment variables
│   ├── requirements.txt   # Python dependencies
│   └── uploads/           # Stored files (gitignored in production)
│
├── frontend/
│   ├── src/
│   │   ├── api.js              # API client
│   │   ├── App.js              # Main layout + routing
│   │   ├── contexts/
│   │   │   ├── AuthContext.js   # JWT auth
│   │   │   └── ThemeContext.js  # Theme management
│   │   └── components/
│   │       ├── AuthPage.js      # Login/Register
│   │       ├── Sidebar.js       # Navigation
│   │       ├── Dashboard.js     # File grid with share
│   │       ├── UploadPage.js    # File upload
│   │       ├── ChatPage.js      # Messaging
│   │       ├── SettingsPage.js  # Profile, security, themes
│   │       ├── ProfilePage.js   # Public profiles
│   │       ├── SearchResults.js # Search
│   │       ├── FilePreview.js   # Image/video viewer
│   │       ├── VaultPage.js     # Secure vault
│   │       └── ShareModal.js    # Share link creation
│   └── .env               # REACT_APP_BACKEND_URL
│
└── README.md
```

---

## API Routes

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/change-password` | Change password |

### Users
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users/{user_id}` | Public profile |
| PUT | `/api/users/profile` | Update display name, bio |
| PUT | `/api/users/theme` | Update theme settings |
| POST | `/api/users/avatar` | Upload custom avatar |

### Files
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/files/upload` | Upload file |
| GET | `/api/files` | My files |
| GET | `/api/files/public/{user_id}` | User's public files |
| GET | `/api/files/preview/{file_id}` | Preview/stream |
| GET | `/api/files/download/{file_id}` | Download |
| DELETE | `/api/files/{file_id}` | Delete file |

### Share Links
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/share` | Create share link |
| GET | `/api/share/{link_id}` | Get share info |
| GET | `/api/share/{link_id}/download` | Download via link |
| GET | `/api/share/{link_id}/preview` | Preview via link |
| GET | `/api/my-shares` | My share links |
| DELETE | `/api/share/{link_id}` | Delete share link |

### Vault
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/vault/setup` | Create vault password |
| POST | `/api/vault/unlock` | Unlock (get 30min token) |
| GET | `/api/vault/status` | Check vault status |
| POST | `/api/vault/upload` | Upload to vault |
| GET | `/api/vault/files` | List vault files |
| DELETE | `/api/vault/files/{id}` | Delete vault file |

### Chat
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/chats` | My conversations |
| POST | `/api/chats` | Create conversation |
| GET/POST | `/api/chats/{id}/messages` | Messages |
| WS | `/api/ws/chat/{id}` | Real-time WebSocket |

---

## Deployment Tutorials

### Option 1: Deploy to Railway (Recommended for beginners)

Railway provides free MongoDB and file storage.

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Create new project
railway init

# 4. Add MongoDB
railway add --plugin mongodb

# 5. Set environment variables in Railway dashboard:
#    MONGO_URL = (auto from MongoDB plugin)
#    DB_NAME = filehub
#    JWT_SECRET = your-secure-random-string-here
#    UPLOAD_DIR = /app/uploads
#    APP_URL = https://your-app.railway.app

# 6. Deploy
railway up
```

### Option 2: Deploy to Render

```bash
# 1. Create a Render account at render.com
# 2. New > Web Service > Connect your GitHub repo
# 3. Configuration:
#    Build Command: pip install -r backend/requirements.txt
#    Start Command: uvicorn backend.server:app --host 0.0.0.0 --port $PORT
# 4. Add environment variables in dashboard
# 5. For frontend: New > Static Site > Build: cd frontend && yarn build
#    Publish: frontend/build
```

### Option 3: Deploy to a VPS (DigitalOcean, Linode, etc.)

```bash
# 1. SSH into your server
ssh root@your-server-ip

# 2. Install dependencies
apt update && apt install -y python3-pip nodejs npm nginx certbot mongodb

# 3. Clone your repo
git clone https://github.com/your-user/cybervoid-hub.git
cd cybervoid-hub

# 4. Setup backend
cd backend
pip3 install -r requirements.txt
# Create .env with your production values

# 5. Setup frontend
cd ../frontend
npm install && npm run build

# 6. Setup Nginx (see Nginx config below)
# 7. Setup systemd service (see below)
# 8. Setup SSL with certbot
certbot --nginx -d yourdomain.com
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (built React app)
    location / {
        root /path/to/cybervoid-hub/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 100M;
    }
}
```

**Systemd Service:**
```ini
# /etc/systemd/system/cybervoid.service
[Unit]
Description=CyberVoid Hub Backend
After=network.target mongodb.service

[Service]
User=www-data
WorkingDirectory=/path/to/cybervoid-hub/backend
ExecStart=/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
EnvironmentFile=/path/to/cybervoid-hub/backend/.env

[Install]
WantedBy=multi-user.target
```

### Option 4: Deploy with Docker

```dockerfile
# Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
RUN mkdir -p uploads
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8001:8001"
    env_file: ./backend/.env
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - mongo

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"

volumes:
  mongo_data:
```

---

## Local Deployment with SSD/HDD Storage

### Connect to a Local Drive (SSD/HDD)

You can configure the app to store files on any mounted drive.

```bash
# 1. Mount your SSD/HDD (if not already mounted)
sudo mkdir -p /mnt/storage
sudo mount /dev/sdb1 /mnt/storage

# Make it permanent (add to /etc/fstab):
echo '/dev/sdb1 /mnt/storage ext4 defaults 0 2' | sudo tee -a /etc/fstab

# 2. Create the uploads directory on the drive
sudo mkdir -p /mnt/storage/cybervoid-files
sudo chown -R $USER:$USER /mnt/storage/cybervoid-files

# 3. Update your backend .env:
UPLOAD_DIR=/mnt/storage/cybervoid-files

# 4. Restart the backend
sudo systemctl restart cybervoid
```

### Encrypted Storage Folder

Protect all uploaded files with filesystem-level encryption using LUKS.

```bash
# 1. Create an encrypted container file (10GB example)
dd if=/dev/zero of=/mnt/storage/cybervoid-vault.img bs=1M count=10240

# 2. Setup LUKS encryption
sudo cryptsetup luksFormat /mnt/storage/cybervoid-vault.img
# Enter and confirm your encryption password

# 3. Open the encrypted container
sudo cryptsetup luksOpen /mnt/storage/cybervoid-vault.img cybervoid-encrypted

# 4. Create filesystem
sudo mkfs.ext4 /dev/mapper/cybervoid-encrypted

# 5. Mount
sudo mkdir -p /mnt/cybervoid-secure
sudo mount /dev/mapper/cybervoid-encrypted /mnt/cybervoid-secure
sudo chown -R $USER:$USER /mnt/cybervoid-secure

# 6. Update backend .env
UPLOAD_DIR=/mnt/cybervoid-secure

# 7. To lock (unmount + close encryption):
sudo umount /mnt/cybervoid-secure
sudo cryptsetup luksClose cybervoid-encrypted

# 8. To unlock again:
sudo cryptsetup luksOpen /mnt/storage/cybervoid-vault.img cybervoid-encrypted
sudo mount /dev/mapper/cybervoid-encrypted /mnt/cybervoid-secure
```

**Auto-mount script (save as /usr/local/bin/cybervoid-unlock.sh):**
```bash
#!/bin/bash
echo "Unlocking CyberVoid encrypted storage..."
sudo cryptsetup luksOpen /mnt/storage/cybervoid-vault.img cybervoid-encrypted
sudo mount /dev/mapper/cybervoid-encrypted /mnt/cybervoid-secure
echo "Storage unlocked. Starting CyberVoid..."
sudo systemctl start cybervoid
```

**Auto-lock script (save as /usr/local/bin/cybervoid-lock.sh):**
```bash
#!/bin/bash
echo "Stopping CyberVoid..."
sudo systemctl stop cybervoid
echo "Locking encrypted storage..."
sudo umount /mnt/cybervoid-secure
sudo cryptsetup luksClose cybervoid-encrypted
echo "Storage locked."
```

---

## Customization Guide

### Change Default Accent Color
Edit `frontend/src/index.css`:
```css
:root {
  --accent-color: #YOUR_HEX;
  --accent-rgb: R, G, B;
}
```

### Add Accent Color Presets
Edit `frontend/src/contexts/ThemeContext.js`, add to `ACCENT_PRESETS`:
```js
{ name: 'My Color', color: '#HEX', rgb: 'R,G,B' },
```

### Add Wallpaper Presets
Same file, add to `WALLPAPERS`:
```js
{ name: 'Name', url: 'https://image-url.jpg' },
```

### Change Fonts
1. Update `<link>` in `frontend/public/index.html`
2. Update `tailwind.config.js` `fontFamily`
3. Update `index.css` body `font-family`

### Add Custom File Type Previews
In `Dashboard.js` and `FilePreview.js`, add conditions:
```jsx
// For PDFs:
if (file.file_type === 'pdf') {
  return <iframe src={api.getPreviewUrl(file.file_id)} className="w-full h-full" />;
}
```

### Extend Chat
In `server.py` WebSocket handler, add new message types:
```python
if data.get("type") == "typing":
    await manager.broadcast(chat_id, {"type": "typing", "user": user_id})
```

### Add New Sidebar Sections
Edit `Sidebar.js` - add to `navItems` array:
```jsx
{ id: 'mypage', icon: MyIcon, label: 'My Page' },
```
Then add the case in `App.js` `renderPage()`.

### Change Avatar Generation Style
The default avatars use DiceBear API. Change the style in `server.py`:
```python
# Options: bottts, avataaars, identicon, pixel-art, lorelei, notionists
avatar_url = f"https://api.dicebear.com/7.x/pixel-art/svg?seed={data.username}"
```

### Increase File Size Limit
In `backend/server.py`:
```python
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB
```
Also update Nginx `client_max_body_size` if using reverse proxy.

### Add Storage Quotas
In `server.py`, before file upload:
```python
total = await db.files.aggregate([
    {"$match": {"user_id": current_user["user_id"]}},
    {"$group": {"_id": None, "total": {"$sum": "$file_size"}}}
]).to_list(1)
if total and total[0]["total"] > 1 * 1024 * 1024 * 1024:  # 1GB
    raise HTTPException(status_code=400, detail="Storage limit reached")
```

---

## Environment Variables

### Backend (`/backend/.env`)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=filehub
JWT_SECRET=change-this-to-a-random-64-char-string
UPLOAD_DIR=/path/to/uploads
APP_URL=https://yourdomain.com
```

### Frontend (`/frontend/.env`)
```env
REACT_APP_BACKEND_URL=https://yourdomain.com
```

---

## Future Improvements

- [ ] Typing indicators in chat
- [ ] Read receipts
- [ ] File versioning
- [ ] 2FA authentication
- [ ] OAuth login (Google, GitHub)
- [ ] Admin panel
- [ ] Storage quotas per user
- [ ] Folder organization
- [ ] File comments
- [ ] Email notifications
- [ ] Bulk file operations
- [ ] File encryption at rest (per-file)
- [ ] CDN integration for faster file delivery
- [ ] Mobile native app (React Native)

---

## License

MIT
