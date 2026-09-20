import os
import sys
import threading
import time
from pathlib import Path
from urllib.parse import urlparse
import uvicorn
import webview
from dotenv import load_dotenv

load_dotenv(Path(sys.executable).parent / '.env')
load_dotenv(Path(__file__).resolve().parent / '.env')

# Gestion du dossier temporaire lors de l'exécution d'un binaire PyInstaller
def get_resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)

# Bridge Python exposé à l'interface JS (pywebview.api)
class ApiBridge:
    def print_order_receipt(self, order_id, token):
        """Appelé par React via window.pywebview.api.print_order_receipt(...)"""
        print(f"[Bridge Desktop] Ordre d'impression reçu pour la commande #{order_id}")
        # Logique PyUSB / ESC/POS d'ouverture tiroir et d'impression
        return {"success": True, "message": "Ticket imprimé avec succès"}

def start_fastapi():
    """Démarre le serveur Uvicorn FastAPI en arrière-plan."""
    from backend.main import app
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")

if __name__ == '__main__':
    frontend_url = os.getenv('FRONTEND_URL', 'http://127.0.0.1:8000')
    parsed_url = urlparse(frontend_url)
    is_local_backend = parsed_url.hostname in {'127.0.0.1', 'localhost'} and parsed_url.port == 8000

    # En local, le terminal peut embarquer son API; en production l'API est distante.
    if is_local_backend:
        server_thread = threading.Thread(target=start_fastapi, daemon=True)
        server_thread.start()
        time.sleep(1.5)

    # 2. Créer l'API Bridge pour le matériel (Imprimante, Tiroir-caisse)
    api_bridge = ApiBridge()

    # 3. Créer la fenêtre pywebview pointant sur le Frontend ou FastAPI
    window = webview.create_window(
        title='POS Terminal & Caisse Tactile',
        url=frontend_url,
        width=1280,
        height=800,
        resizable=True,
        fullscreen=False,
        js_api=api_bridge
    )

    # 4. Démarrer la boucle d'événements de l'interface GUI
    webview.start(debug=os.getenv('DEBUG', 'false').lower() == 'true')