# Documentación de CyberVoid Hub (Español)

## Módulos
- **Modo online:** aplicación full stack (React + FastAPI + MongoDB).
- **Modo offline:** espacio local encriptado sin requerir login.

## Uso rápido del modo offline
```bash
./scripts/run_offline_mode.sh
```
Luego abre: `http://127.0.0.1:8787`

### Comportamiento de almacenamiento
- Los archivos se cifran en reposo con Fernet.
- Los datos cifrados se guardan en `offline/secure_vault/`.
- La metadata se guarda en `offline/secure_vault/index.json`.

## Recomendaciones para producción
- Guardar secretos en variables de entorno.
- Limitar CORS a dominios confiables.
- Desactivar reset debug.
- Ejecutar detrás de proxy TLS.


### Opcional: backend de metadata local
- Por defecto se usa `index.json`.
- Para usar SQLite local: `OFFLINE_DB_BACKEND=sqlite ./scripts/run_offline_mode.sh`.

### Build de ejecutable offline (.exe)
```bash
./scripts/build_offline_exe.sh
```
Genera binario en `dist-offline/` para pruebas locales sin depender de Python instalado.


### Verificaciones operativas
- Endpoint de salud: `curl http://127.0.0.1:8787/api/offline/health`
- La descarga limpia archivos temporales descifrados al cerrar la respuesta.
- Si cambia `OFFLINE_SECRET`, archivos previos pueden fallar descifrado con error claro en la API.
