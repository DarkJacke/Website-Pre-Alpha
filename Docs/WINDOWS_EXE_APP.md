# 🪟 Convertir CyberVoid Hub en app Windows (.exe)

## Enfoque recomendado
Usar **Electron** para empaquetar frontend+runtime web como escritorio.

## Pasos de alto nivel
1. Compilar frontend (`npm run build`).
2. Crear wrapper Electron (`main.js`).
3. Empaquetar con `electron-builder`.
4. Distribuir `.exe` firmado.

## Backend en este modo
- Opción A: backend local FastAPI + MongoDB local.
- Opción B: backend central remoto (recomendado multiusuario).

## Login Google
Funciona mejor con backend central (dominio estable + callback OAuth fijo).
