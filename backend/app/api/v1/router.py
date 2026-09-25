from fastapi import APIRouter

# Router intermédiaire : le main.py inclut celui-ci avec prefix=""
# Chaque endpoint enfant doit avoir son propre préfixe (ex: /users)
router = APIRouter()

from app.api.v1.endpoints import users, pos, cashier, catalog, orders, payments, auth, sessions, invoices, stats, kds, modifiers, registers

router.include_router(users.router, prefix="/users", tags=["Utilisateurs"])
router.include_router(pos.router, prefix="/pos", tags=["Terminaux POS & Caisses"])
router.include_router(cashier.router, prefix="/cashier", tags=["Authentification Caissier & PIN"])
router.include_router(catalog.router, prefix="/catalog", tags=["Catalogue & Produits"])
router.include_router(orders.router, prefix="/orders", tags=["Commandes"])
router.include_router(payments.router, prefix="/payments", tags=["Encaissement & Tickets"])
router.include_router(auth.router, prefix="", tags=["Authentification"])
router.include_router(sessions.router, prefix="/sessions", tags=["Sessions de caisse"])
router.include_router(registers.router, prefix="/registers", tags=["Registers"])  # <-- VÉRIFIER CETTE LIGNE
router.include_router(invoices.router, prefix="/invoices", tags=["Factures"])
router.include_router(kds.router, prefix="/kds", tags=["Cuisine / KDS"])
# Enregistrement du routeur avec le préfixe /api/v1
router.include_router(stats.router, prefix="/stats", tags=["Statistiques"])
router.include_router(modifiers.router, prefix="/modifiers", tags=["Modificateurs"])
