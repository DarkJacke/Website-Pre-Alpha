# CyberVoid Hub - File Storage Platform

A modern, secure file storage hub with real-time messaging, user profiles, and full theme customization. Built with a cyberpunk AMOLED black aesthetic.

## Features

### File Management
- **Upload** any file type (images, videos, documents, etc.) up to 100MB
- **Download** files directly from dashboard or profiles
- **Online Preview** for images and videos (full-screen modal with blur backdrop)
- **Grid/List view** toggle with file type filters
- **Public/Private** toggle per file - public files appear on your profile

### User System
- **Register & Login** with secure JWT authentication
- **User Profiles** viewable by anyone via user ID
- **Profile Customization** - display name, bio, avatar
- **Password Security** - strength indicator, bcrypt hashing (12 rounds), rate limiting

### Real-Time Chat
- **WebSocket-powered** messaging between users
- **Start conversations** from search results or user profiles
- **Message history** persisted in database
- **Real-time delivery** - messages appear instantly

### Search
- **Dual search** - find both files and user accounts
- **Category toggle** - filter by All, Files, or Accounts
- **Quick actions** - view profile or start chat directly from results

### Theme Customization (Settings)
- **8 Accent Colors**: Neon Red, Neon Pink, Electric Blue, Acid Green, Cyber Yellow, Void Purple, Sunset Orange, Ice White
- **Wallpaper System**: 3 preset wallpapers + custom URL support
- **Persistent**: Theme preferences saved to your account

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Tailwind CSS |
| **Backend** | Python FastAPI |
| **Database** | MongoDB (Motor async driver) |
| **Auth** | JWT (python-jose) + bcrypt |
| **Real-time** | WebSockets (native FastAPI) |
| **Fonts** | Unbounded (headings), JetBrains Mono (body), Rajdhani (UI) |
| **Icons** | Lucide React |

---

## Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI app (all routes, WebSocket, auth)
│   ├── .env               # MONGO_URL, DB_NAME, JWT_SECRET, UPLOAD_DIR
│   ├── requirements.txt   # Python dependencies
│   └── uploads/           # Stored files (gitignored)
│
├── frontend/
│   ├── public/
│   │   └── index.html     # HTML entry + Google Fonts
│   ├── src/
│   │   ├── api.js         # API client (all backend calls)
│   │   ├── App.js         # Main layout + routing + page transitions
│   │   ├── index.js       # React entry
│   │   ├── index.css      # Global styles, animations, CSS variables
│   │   ├── contexts/
│   │   │   ├── AuthContext.js   # JWT auth state management
│   │   │   └── ThemeContext.js  # Accent color + wallpaper management
│   │   └── components/
│   │       ├── AuthPage.js      # Login/Register with strength indicator
│   │       ├── Sidebar.js       # Navigation + search + user menu
│   │       ├── Dashboard.js     # File grid/list with stats
│   │       ├── UploadPage.js    # Drag & drop file upload
│   │       ├── ChatPage.js      # Real-time messaging
│   │       ├── SettingsPage.js  # Profile, security, themes
│   │       ├── ProfilePage.js   # Public user profile
│   │       ├── SearchResults.js # Search files & accounts
│   │       └── FilePreview.js   # Full-screen image/video viewer
│   ├── .env               # REACT_APP_BACKEND_URL
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

---

## Security Features

- **Bcrypt hashing** with 12 rounds for passwords
- **JWT tokens** with 30-day expiration
- **Rate limiting** on login (5 per email / 10 per IP per 5 min) and register (5 per IP per 5 min)
- **Input validation** - email format, username regex, password strength requirements
- **Search sanitization** - regex characters escaped to prevent injection
- **File name sanitization** - dangerous characters stripped
- **File size limit** - 100MB max enforced server-side
- **WebSocket authentication** - token verified before connection
- **Chat authorization** - only participants can read/send messages

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

---

## API Routes

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/change-password` | Change password |

### Users
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users/{user_id}` | Public profile |
| PUT | `/api/users/profile` | Update profile |
| PUT | `/api/users/theme` | Update theme |

### Files
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/files/upload` | Upload file (multipart) |
| GET | `/api/files` | My files |
| GET | `/api/files/public/{user_id}` | User's public files |
| GET | `/api/files/preview/{file_id}` | Stream/preview file |
| GET | `/api/files/download/{file_id}` | Download file |
| DELETE | `/api/files/{file_id}` | Delete own file |

### Search & Chat
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/search?q=&type=` | Search files/accounts |
| GET | `/api/chats` | My conversations |
| POST | `/api/chats` | Start/get conversation |
| GET | `/api/chats/{id}/messages` | Chat history |
| POST | `/api/chats/{id}/messages` | Send message |
| WS | `/api/ws/chat/{id}?token=` | Real-time chat |

---

## Customization Guide

### Change Default Accent Color
Edit `frontend/src/index.css`:
```css
:root {
  --accent-color: #YOUR_HEX_COLOR;
  --accent-rgb: R, G, B;
}
```

### Add New Accent Presets
Edit `frontend/src/contexts/ThemeContext.js` - add to `ACCENT_PRESETS` array:
```js
{ name: 'Your Color', color: '#HEX', rgb: 'R,G,B' },
```

### Add Wallpaper Presets
Same file, add to `WALLPAPERS` array:
```js
{ name: 'Name', url: 'https://image-url.jpg' },
```

### Change Fonts
1. Update the `<link>` in `frontend/public/index.html`
2. Update `tailwind.config.js` fontFamily
3. Update `index.css` body font-family

### Add New File Type Preview
In `Dashboard.js` and `FilePreview.js`, add conditions for your file type in the render logic.

### Extend Chat Features
The WebSocket handler in `server.py` at `websocket_chat()` supports message types. Add new types like:
```python
if data.get("type") == "typing":
    await manager.broadcast(chat_id, {"type": "typing", "user": user_id})
```

---

## Environment Variables

### Backend (`/app/backend/.env`)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=filehub
JWT_SECRET=your-secure-secret-key
UPLOAD_DIR=/app/backend/uploads
```

### Frontend (`/app/frontend/.env`)
```
REACT_APP_BACKEND_URL=https://your-domain.com
```

---

## Future Improvements

- [ ] File sharing links (public URLs with expiration)
- [ ] Folder organization system
- [ ] Typing indicators in chat
- [ ] Read receipts for messages
- [ ] File versioning
- [ ] Admin panel for user management
- [ ] 2FA authentication
- [ ] File encryption at rest
- [ ] Drag & drop file reordering
- [ ] Bulk file operations (delete, move)
- [ ] File comments system
- [ ] Email notifications
- [ ] OAuth (Google, GitHub login)
- [ ] Storage quotas per user

---

## License

MIT
