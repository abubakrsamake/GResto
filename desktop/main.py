# desktop/main.py
import os
import requests
from pathlib import Path
from urllib.parse import urlparse
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
            url = f"{self.api_base_url}/payments/{order_id}/receipt/raw"
            headers = {"Authorization": f"Bearer {auth_token}"}
            
            response = requests.get(url, headers=headers, timeout=5)
            
            if response.status_code != 200:
                return {
                    "success": False, 
                    "error": f"Erreur de récupération du ticket : Code HTTP {response.status_code}"
                }

            raw_bytes = response.content
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
    frontend_url = os.getenv("FRONTEND_URL", "http://51.210.40.107")
    api_base_url = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")

    if os.getenv("ENV", "development").lower() == "production":
        insecure_urls = [
            url for url in (frontend_url, api_base_url)
            if urlparse(url).scheme != "https"
        ]
        if insecure_urls:
            webview.create_window(
                title="Configuration de sécurité requise",
                html=(
                    "<html><body style='font-family:sans-serif;padding:3rem;background:#111827;color:#f9fafb'>"
                    "<h2>Connexion sécurisée requise</h2>"
                    "<p>Le terminal de production exige HTTPS pour le frontend et l'API.</p>"
                    "<p>Configurez FRONTEND_URL et API_BASE_URL avec des adresses https:// valides.</p>"
                    "</body></html>"
                ),
                width=700,
                height=320,
                resizable=False,
            )
            webview.start(debug=False)
            return

    # Instanciation du Bridge
    bridge = POSApiBridge(api_base_url=api_base_url)

    # Création de la fenêtre Desktop pywebview
    window = webview.create_window(
        title="Resto POS Terminal",
        url=frontend_url,
        js_api=bridge,
        width=1280,
        height=800,
        fullscreen=False,  # Mode plein écran
        resizable=True
    )


    # Lancement de l'application desktop
    debug = os.getenv("DEBUG", "false").lower() == "true"
    webview.start(debug=debug)


if __name__ == "__main__":
    main()