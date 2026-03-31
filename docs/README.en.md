# CyberVoid Hub Documentation (English)

## Modules
- **Online mode:** full stack app (React + FastAPI + MongoDB).
- **Offline mode:** local encrypted workspace with no login requirement.

## Offline mode quick use
```bash
./scripts/run_offline_mode.sh
```
Then open: `http://127.0.0.1:8787`

### Storage behavior
- Files are encrypted at rest with Fernet.
- Encrypted payloads are stored in `offline/secure_vault/`.
- Metadata is tracked in `offline/secure_vault/index.json`.

## Production recommendations
- Store secrets in environment variables.
- Restrict CORS origins.
- Disable debug reset behavior.
- Run behind TLS reverse proxy.
