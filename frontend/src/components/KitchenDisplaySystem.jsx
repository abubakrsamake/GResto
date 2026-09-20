import React, { useState, useEffect, useRef } from "react";
import { 
  ClockIcon, 
  CheckCircleIcon, 
  ArrowPathIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  FireIcon
} from "@heroicons/react/24/outline";
import kitchenService from "../services/kitchenService";

export default function KitchenDisplaySystem({ posId = 1, userToken }) {
  const [orders, setOrders] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, PREPARING
  const socketRef = useRef(null);

  // --- Web Audio API pour le signal sonore sans fichier externe ---
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Note A5
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3); // Ramp down to A4

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.error("Erreur d'écouteur audio :", e);
    }
  };

  // --- Connexion WebSocket avec gestion de Reconnexion ---
  useEffect(() => {
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      const configuredWsUrl = import.meta.env.VITE_WS_URL;
      const defaultWsUrl = import.meta.env.DEV
        ? "ws://127.0.0.1:8000"
        : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
      const wsUrl = `${configuredWsUrl || defaultWsUrl}/ws/kds/${posId}?token=${userToken}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log("Connecté au flux KDS WebSocket");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "INIT_ORDERS") {
          setOrders(data.orders);
        } else if (data.type === "NEW_ORDER") {
          setOrders((prev) => [data.order, ...prev]);
          playNotificationSound();
        } else if (data.type === "ORDER_STATUS_UPDATED") {
          setOrders((prev) =>
            prev.map((ord) =>
              ord.id === data.order_id ? { ...ord, status: data.status } : ord
            )
          );
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Tentative de reconnexion après 3 secondes
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (err) => {
        console.error("Erreur WebSocket KDS :", err);
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [posId, userToken]);

  // --- Action de Mise à jour du Statut ---
  const handleUpdateStatus = (orderId, newStatus) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: "UPDATE_STATUS",
          order_id: orderId,
          status: newStatus,
        })
      );
    } else {
      // Fallback API REST si le WebSocket est momentanément déconnecté
      kitchenService.updateOrderStatus(orderId, newStatus).then(() => {
        setOrders((prev) =>
          prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
        );
      });
    }
  };

  // Filter les commandes actives (Exclure les commandes prêtes/livrées si nécessaire)
  const activeOrders = orders.filter((o) => {
    if (o.status === "COMPLETED" || o.status === "CANCELLED") return false;
    if (filter === "PENDING") return o.status === "PENDING";
    if (filter === "PREPARING") return o.status === "PREPARING";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* --- HEADER KDS --- */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-wider text-emerald-400 flex items-center gap-2">
            <FireIcon className="w-8 h-8 text-amber-500 animate-pulse" /> KDS CUISINE
          </h1>
          <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-semibold">
            POS Terminal #{posId}
          </span>
        </div>

        {/* Status de Connexion + Filtres */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filter === "ALL" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Toutes ({orders.filter(o => o.status !== "COMPLETED").length})
            </button>
            <button
              onClick={() => setFilter("PENDING")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filter === "PENDING" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              En Attente
            </button>
            <button
              onClick={() => setFilter("PREPARING")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filter === "PREPARING" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              En Préparation
            </button>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
            title={soundEnabled ? "Désactiver le son" : "Activer le son"}
          >
            {soundEnabled ? (
              <SpeakerWaveIcon className="w-5 h-5 text-emerald-400" />
            ) : (
              <SpeakerXMarkIcon className="w-5 h-5 text-rose-400" />
            )}
          </button>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
              isConnected
                ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30"
                : "bg-rose-950/60 text-rose-400 border-rose-500/30"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-400 animate-ping" : "bg-rose-500"
              }`}
            />
            {isConnected ? "EN LIGNE" : "HORS LIGNE"}
          </div>
        </div>
      </header>

      {/* --- GRILLE DES COMMANDES --- */}
      <main className="flex-1 p-6 overflow-y-auto">
        {activeOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-3 my-20">
            <CheckCircleIcon className="w-16 h-16" />
            <p className="text-xl font-bold">Aucune commande en attente en cuisine</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={handleUpdateStatus}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// --- SOUS-COMPOSANT : CARTE DE COMMANDE INDIVIDUELLE ---
function OrderCard({ order, onUpdateStatus }) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Chronomètre d'attente
  useEffect(() => {
    const calculateElapsed = () => {
      const created = new Date(order.created_at || Date.now());
      const now = new Date();
      const diffMs = Math.max(0, now - created);
      setElapsedMinutes(Math.floor(diffMs / 60000));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 10000); // Mise à jour toutes les 10s
    return () => clearInterval(interval);
  }, [order.created_at]);

  // Code couleur de l'entête selon le statut et le retard (>15 min)
  const isLate = elapsedMinutes >= 15;
  const isPreparing = order.status === "PREPARING";

  return (
    <div
      className={`bg-slate-900 border rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl transition ${
        isPreparing
          ? "border-blue-500/50 shadow-blue-950/20"
          : isLate
          ? "border-rose-500/80 shadow-rose-950/40 animate-pulse"
          : "border-slate-800"
      }`}
    >
      {/* En-tête de la carte */}
      <div
        className={`px-4 py-3 flex justify-between items-center ${
          isPreparing
            ? "bg-blue-950/80 border-b border-blue-500/30"
            : isLate
            ? "bg-rose-950/80 border-b border-rose-500/30"
            : "bg-slate-800/80 border-b border-slate-700/50"
        }`}
      >
        <div>
          <span className="text-xl font-black text-white">#{order.order_number}</span>
          <span className="ml-2 text-xs font-semibold text-slate-400 uppercase">
            ({order.order_type})
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-300">
          <ClockIcon className="w-4 h-4 text-slate-400" />
          <span className={isLate ? "text-rose-400 font-bold" : ""}>
            {elapsedMinutes} min
          </span>
        </div>
      </div>

      {/* Liste des articles */}
      <div className="p-4 flex-1 space-y-3 divide-y divide-slate-800/60 overflow-y-auto max-h-80">
        {order.items?.map((item, idx) => (
          <div key={idx} className="pt-2 first:pt-0">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-100 text-lg">
                <span className="text-emerald-400 font-black mr-2">{item.quantity}x</span>
                {item.product_name}
              </span>
            </div>
            {item.notes && (
              <p className="text-xs font-semibold text-amber-400 mt-1 bg-amber-950/40 p-1.5 rounded border border-amber-500/20">
                ⚠️ {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Actions de Statut */}
      <div className="p-4 bg-slate-950/50 border-t border-slate-800/80">
        {order.status === "PENDING" && (
          <button
            onClick={() => onUpdateStatus(order.id, "PREPARING")}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50"
          >
            <ArrowPathIcon className="w-5 h-5" /> Lancer Préparation
          </button>
        )}

        {order.status === "PREPARING" && (
          <button
            onClick={() => onUpdateStatus(order.id, "READY")}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
          >
            <CheckCircleIcon className="w-5 h-5" /> Marquer Prêt
          </button>
        )}
      </div>
    </div>
  );
}