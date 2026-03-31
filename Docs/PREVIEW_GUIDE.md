# 🖼️ Guía de previsualización antes de “montar todo”

## Opción A: solo frontend (rápida)
1. Levanta frontend con `npm start`.
2. Usa un `.env` de desarrollo apuntando a backend local o mock.
3. Revisa navegación, estilos, responsive.

## Opción B: frontend + backend local
1. Levanta MongoDB.
2. Levanta backend.
3. Levanta frontend.
4. Recorre casos clave: login, upload, share, vault, chat.

## Opción C: build de producción local
```bash
cd frontend
npm run build
npx serve -s build -l 3000
```

Esto permite ver el comportamiento más cercano a producción.
