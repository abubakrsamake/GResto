# GRestaurant — POS & KDS pour restaurant

## Structure
- `backend/` : FastAPI (API REST + WebSocket KDS)
- `frontend/` : React + Vite + TypeScript (interface caisse et cuisine)

## Lancer le backend
```bash
cd backend
pip install -r requirements.txt
# Assurez-vous que PostgreSQL (DB_GResto) tourne
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Lancer le frontend
```bash
cd frontend
npm install
npm run dev
```

## Ports
- Backend : `http://localhost:8000`
- Frontend : `http://localhost:5173`
