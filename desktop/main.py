# desktop/main.py
import os
import requests
from pathlib import Path
from dotenv import load_dotenv
import webview
from printer_service import USBPrinterService

# ⬇️ Charger le .env AVANT tout appel à os.getenv
load_dotenv(Path(__file__).parent / ".env")

class POSApiBridge:
    """
    API Python exposée au JavaScript (Frontend React) via window.pywebview.api.
    """

    def __init__(self, api_base_url: str | None = None):
        self.api_base_url = (api_base_url or os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")).rstrip("/")
        self.printer_service = USBPrinterService()

    def print_order_receipt(self, order_id: str, auth_token: str) -> dict:
        """
        1. Télécharge le flux binaire ESC/POS depuis FastAPI
        2. L'envoie à l'imprimante thermique USB via PyUSB
        """
        try:
            # Récupération du flux binaire via l'endpoint /payments/{order_id}/receipt/raw
            url = f"{self.api_base_url}/payments/{order_id}/receipt/raw"
            headers = {"Authorization": f"Bearer {auth_token}"}
            
            response = requests.get(url, headers=headers, timeout=5)
            
            if response.status_code != 200:
                return {
                    "success": False, 
                    "error": f"Erreur de récupération du ticket : Code HTTP {response.status_code}"
                }

            raw_bytes = response.content

            # Envoi binaire direct vers le matériel
            result = self.printer_service.print_raw_bytes(raw_bytes)
            return result

        except requests.RequestException as e:
            return {"success": False, "error": f"Impossible de contacter l'API POS : {str(e)}"}
        except Exception as e:
            return {"success": False, "error": f"Erreur critique lors de l'impression : {str(e)}"}

    def open_cash_drawer(self) -> dict:
        """
        Envoie uniquement la commande ESC/POS pour déclencher le tiroir-caisse (Pin 2).
        """
        DRAWER_KICK_BYTES = b'\x1bp\x00\x19\xfa'
        printer = USBPrinterService()
        return printer.print_raw_bytes(DRAWER_KICK_BYTES)


def main():
    # Déterminer la source du frontend (Dev React Vite ou Prod Build)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Instanciation du Bridge
    bridge = POSApiBridge()

    # Création de la fenêtre Desktop pywebview
    window = webview.create_window(
        title="Resto POS Terminal",
        url=frontend_url,
        js_api=bridge,
        width=1280,
        height=800,
        fullscreen=False,  # Mettre à True en production pour un mode borne/caisse
        resizable=True
    )

    # Lancement de l'application desktop
    debug = os.getenv("DEBUG", "false").lower() == "true"
    webview.start(debug=debug)


if __name__ == "__main__":
    main()
    