# ✅ QA Checklist (estático + funcional)

## Backend
- [ ] `python -m py_compile backend/server.py`
- [ ] `/api/health` responde OK
- [ ] Login admin funciona
- [ ] Forgot/reset según `EXPOSE_RESET_DEBUG`

## Frontend
- [ ] Sin errores de consola en login/dashboard
- [ ] Upload/preview/download funcionando
- [ ] Compartir enlace funciona
- [ ] Vault lock/unlock funcionando

## Seguridad
- [ ] Sin secretos hardcodeados
- [ ] CORS limitado
- [ ] JWT secret robusto
- [ ] OAuth keys en `.env`
