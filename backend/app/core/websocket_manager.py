# backend/app/core/websocket_manager.py
import uuid
from fastapi import WebSocket


class KDSWebSocketManager:
    """Gère les connexions WebSocket des écrans de cuisine (KDS) par POS."""

    def __init__(self):
        # Dictionnaire associant un pos_id (UUID) à une liste de WebSockets actifs
        self.active_connections: dict[uuid.UUID, list[WebSocket]] = {}

    async def connect(self, pos_id: uuid.UUID, websocket: WebSocket):
        await websocket.accept()
        if pos_id not in self.active_connections:
            self.active_connections[pos_id] = []
        self.active_connections[pos_id].append(websocket)

    def disconnect(self, pos_id: uuid.UUID, websocket: WebSocket):
        if pos_id in self.active_connections:
            if websocket in self.active_connections[pos_id]:
                self.active_connections[pos_id].remove(websocket)
            if not self.active_connections[pos_id]:
                del self.active_connections[pos_id]

    async def broadcast_to_kitchen(self, pos_id: uuid.UUID, message: dict):
        """Envoie un événement JSON à tous les écrans KDS connectés à ce POS."""
        if pos_id in self.active_connections:
            for connection in self.active_connections[pos_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Gestion silencieuse des connexions foirées/obsolètes
                    pass


# Instance globale du gestionnaire KDS
kds_ws_manager = KDSWebSocketManager()