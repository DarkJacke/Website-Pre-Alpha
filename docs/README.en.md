# CyberVoid Hub Documentation (English)

## What this project includes
- Secure file dashboard and folder management.
- Vault with additional password protection.
- Real-time chat.
- Authentication with credentials and optional OAuth.

## Production recommendations
- Use a managed MongoDB instance or secured private network.
- Keep all secrets in environment variables.
- Disable debug reset exposure (`EXPOSE_RESET_DEBUG=false`).
- Configure strict CORS and HTTPS.

## Deployment outline
1. Build frontend (`npm run build`).
2. Run backend with process manager (systemd, supervisor, container).
3. Configure reverse proxy (Nginx/Caddy).
4. Enable TLS certificates.
5. Add backup and monitoring.
