#!/usr/bin/env python3
"""Test rapide des endpoints backend avec données de test."""

import asyncio
import httpx

BASE = "http://127.0.0.1:8000"


def print_result(name, status, url, data_preview=""):
    icon = "✅" if 200 <= status < 300 else "❌"
    print(f"{icon} {name}  |  {status}  |  {url}{'  |  ' + data_preview if data_preview else ''}")


async def main():
    async with httpx.AsyncClient() as client:
        # 1. Health check
        r = await client.get(f"{BASE}/health")
        print_result("Health", r.status_code, "/health", r.json().get("status"))

        # 2. Login PIN (obtenir un token pour tester les endpoints auth)
        r = await client.post(f"{BASE}/api/v1/auth/login-pin", json={
            "pos_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            "pin_code": "1234"
        })
        token_preview = r.json().get("access_token", "NONE")[:20] if r.status_code == 200 else ""
        token = r.json().get("access_token") if r.status_code == 200 else None
        print_result("Login PIN", r.status_code, "/api/v1/auth/login-pin", f"token={token_preview}..." if token_preview else "")

        # 3. Sessions (public, pas besoin de token après correction, mais testons)
        r = await client.get(f"{BASE}/api/v1/sessions")
        session_data = r.json()
        session_id = session_data[0]["id"] if isinstance(session_data, list) and session_data else ""
        print_result("Sessions", r.status_code, "/api/v1/sessions", f"count={len(session_data)}" if isinstance(session_data, list) else "")

        # 4. Orders (public après correction)
        r = await client.get(f"{BASE}/api/v1/orders", params={
            "pos_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            "status_filter": ["PENDING", "IN_PREPARATION", "READY"]
        })
        orders_data = r.json()
        order_id = orders_data[0]["id"] if isinstance(orders_data, list) and orders_data else ""
        print_result("Orders", r.status_code, "/api/v1/orders", f"count={len(orders_data)}" if isinstance(orders_data, list) else str(orders_data)[:60])

        # 5. Catalog
        r = await client.get(f"{BASE}/api/v1/catalog/products")
        products_data = r.json()
        print_result("Catalog Products", r.status_code, "/api/v1/catalog/products", f"count={len(products_data)}" if isinstance(products_data, list) else "")

        # 6. Catalog Categories
        r = await client.get(f"{BASE}/api/v1/catalog/categories")
        categories_data = r.json()
        print_result("Catalog Categories", r.status_code, "/api/v1/catalog/categories", f"count={len(categories_data)}" if isinstance(categories_data, list) else "")

        if token:
            headers = {"Authorization": f"Bearer {token}"}
            # 7. Checkout (test avec un montant factice)
            r = await client.post(f"{BASE}/api/v1/payments/checkout", json={
                "order_id": order_id,
                "payment_method": "CASH",
                "amount_tendered": 20000
            }, headers=headers)
            checkout_data = r.json()
            change = checkout_data.get("change_given") if isinstance(checkout_data, dict) else checkout_data
            print_result("Checkout", r.status_code, "/api/v1/payments/checkout", f"change={change}" if change else "")
        else:
            print_result("Checkout", 401, "/api/v1/payments/checkout", "Pas de token")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"❌ Erreur de test: {e}")
