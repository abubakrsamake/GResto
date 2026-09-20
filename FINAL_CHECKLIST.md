# GRestaurant — Fin de session

## Corrections backend (faites)
- backend/main.py → lifespan unique, app FastAPI propre, router v1 inclus, WS KDS
- backend/app/core/database.py → .env chargé depuis dossier backend
- backend/app/api/v1/endpoints/catalog.py → ProductSchema corrigé
- backend/app/api/v1/endpoints/auth.py → endpoint /login-pin présent
- backend/app/api/v1/endpoints/orders.py → list_orders public (401 supprimé)
- backend/app/api/v1/endpoints/sessions.py → créé
- backend/app/api/v1/router.py → v1_router avec /auth, /sessions, etc.

## Corrections frontend (faites)
- frontend/src/components/LoginView.tsx → page connexion (PIN + POS)
- frontend/src/App.tsx → LoginView si pas de token, déconnexion
- frontend/src/components/POSView.tsx → handleCheckout avec activePosId/Session
- frontend/src/components/KitchenView.tsx → endpoint /orders?pos_id=...
- frontend/src/services/posService.ts → service API

## Données de test
- DB_GResto : 12 produits, 3 catégories (Boissons/Plats/Desserts), session OPEN

## Action utilisateur requise
Relancer le serveur backend (si pas redémarré après modifications) et rafraîchir le navigateur (Ctrl+F5) pour voir la page de connexion puis les produits dans POSView.
