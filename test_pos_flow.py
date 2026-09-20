import asyncio
import json
import httpx
import websockets

BASE_URL = "http://127.0.0.1:8000/api/v1"
WS_URL = "ws://127.0.0.1:8000/api/v1"

# Remplacez par vos identifiants réels ou données de seed
LOGIN_DATA = {
    "username": "admin",
    "password": "password123"
}

POS_ID = "00000000-0000-0000-0000-000000000001"  # Remplacez par un UUID valide existant dans votre DB
PRODUCT_ID = "00000000-0000-0000-0000-000000000002"  # Remplacez par un UUID produit existant


async def test_backend_flow():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        print("=== 1. TEST AUTHENTIFICATION ===")
        # Adapter selon votre route de login
        login_res = await client.post("/users/login", data=LOGIN_DATA)
        if login_res.status_code != 200:
            print(f"❌ Échec de connexion : {login_res.text}")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Connexion réussie, token obtenu.")

        print("\n=== 2. OUVERTURE DE SESSION DE CAISSE ===")
        # Si vous avez un endpoint /sessions/open ou /pos/open
        session_payload = {"pos_id": POS_ID, "initial_cash": 25000.0}
        session_res = await client.post("/pos/open", json=session_payload, headers=headers)
        
        if session_res.status_code in (200, 201):
            session_id = session_res.json()["id"]
            print(f"✅ Session de caisse ouverte (ID: {session_id})")
        else:
            # En cas de session déjà ouverte ou structure différente, ajuster l'ID
            print(f"⚠️ Information session : {session_res.text}")
            session_id = "00000000-0000-0000-0000-000000000003"

        print("\n=== 3. CRÉATION D'UNE COMMANDE (POS -> KDS) ===")
        order_payload = {
            "pos_id": POS_ID,
            "register_session_id": session_id,
            "order_type": "DINE_IN",
            "notes": "Table 4 - Sans oignons",
            "items": [
                {
                    "product_id": PRODUCT_ID,
                    "quantity": 2,
                    "notes": "Bien cuit",
                    "modifiers": []
                }
            ]
        }

        order_res = await client.post("/orders", json=order_payload, headers=headers)
        if order_res.status_code != 201:
            print(f"❌ Erreur lors de la création de commande : {order_res.text}")
            return
        
        order_data = order_res.json()
        order_id = order_data["id"]
        total_ttc = order_data["total_ttc"]
        print(f"✅ Commande créée avec succès : N° {order_data['order_number']}")
        print(f"   Total TTC calculé par le serveur : {total_ttc} FCFA")

        print("\n=== 4. TEST DU RÈGLEMENT / ENCAISSEMENT ===")
        payment_payload = {
            "order_id": order_id,
            "payment_method": "CASH",
            "amount_tendered": total_ttc + 2000.0  # On donne 2000 FCFA de plus
        }

        payment_res = await client.post("/payments/checkout", json=payment_payload, headers=headers)
        if payment_res.status_code != 200:
            print(f"❌ Erreur lors du paiement : {payment_res.text}")
            return
        
        payment_data = payment_res.json()
        print(f"✅ Paiement validé !")
        print(f"   Mode : {payment_data['payment_method']}")
        print(f"   Montant perçu : {payment_data['amount_tendered']} FCFA")
        print(f"   Monnaie rendue : {payment_data['change_given']} FCFA")

        print("\n=== 5. MISE À JOUR DU STATUT KDS (CUISINE) ===")
        status_payload = {"status": "READY"}
        status_res = await client.patch(f"/orders/{order_id}/status", json=status_payload, headers=headers)
        if status_res.status_code == 200:
            print(f"✅ Statut de la commande mis à jour à 'READY'.")
        else:
            print(f"❌ Échec de la mise à jour de statut : {status_res.text}")


async def test_kds_websocket():
    print("\n=== 6. TEST ÉCOUTE WEBSOCKET KDS ===")
    url = f"{WS_URL}/orders/ws/kds/{POS_ID}"
    try:
        async with websockets.connect(url) as ws:
            print(f"✅ Connecté au WebSocket KDS ({url})")
            print("⏳ En attente d'un événement (ou appuyez sur Ctrl+C)...")
            # Attendre 5 secondes un message
            msg = await asyncio.wait_for(ws.receive(), timeout=5.0)
            print(f"📩 Événement KDS reçu en temps réel : {msg}")
    except asyncio.TimeoutError:
        print("ℹ️ Aucun nouveau message reçu pendant l'écoute du WebSocket.")
    except Exception as e:
        print(f"⚠️ Connexion WebSocket : {e}")


if __name__ == "__main__":
    print("🚀 Début du test des endpoints POS & Payments...")
    asyncio.run(test_backend_flow())
    # Décommenter si websockets est installé (pip install websockets)
    # asyncio.run(test_kds_websocket())