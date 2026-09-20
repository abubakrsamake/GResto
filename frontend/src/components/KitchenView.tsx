import { useState, useEffect } from 'react';
import { 
  Clock, Flame, AlertCircle, 
  RefreshCw, Utensils, Check
} from 'lucide-react';
import type { KitchenOrder, OrderStatus } from '../types';
import kitchenService from '../services/kitchenService';
import useInterval from '../hooks/useInterval';
import useWebSocket from '../hooks/useWebSocket';
const POS_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

interface KitchenSocketEvent {
  event?: 'NEW_ORDER' | 'ORDER_STATUS_CHANGED';
  data?: Omit<Partial<KitchenOrder>, 'status'> & { order_id?: string; status?: string };
}

const kitchenSocketUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/v1/ws/kds/${POS_ID}`;

// Helper pour calculer le temps écoulé en minutes
const getElapsedTime = (createdAt: string): number => {
  const start = new Date(createdAt).getTime();
  const now = new Date().getTime();
  return Math.floor((now - start) / (1000 * 60));
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function KitchenView() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'IN_PREPARATION'>('ALL');

  const { isConnected } = useWebSocket<KitchenSocketEvent>(kitchenSocketUrl, {
    onMessage: (message) => {
      if (!message.event || !message.data) return;

      if (message.event === 'NEW_ORDER') {
        setOrders((currentOrders) => {
          const nextOrder = message.data as KitchenOrder;
          return currentOrders.some((order) => order.id === nextOrder.id)
            ? currentOrders
            : [...currentOrders, nextOrder];
        });
        return;
      }

      if (message.event === 'ORDER_STATUS_CHANGED' && message.data.order_id) {
        const nextStatus = message.data.status === 'PREPARING'
          ? 'IN_PREPARATION'
          : message.data.status;
        setOrders((currentOrders) => currentOrders
          .map((order) => order.id === message.data?.order_id
            ? { ...order, status: nextStatus as KitchenOrder['status'] }
            : order)
          .filter((order) => order.status !== 'READY'));
      }
    },
  });

  useEffect(() => {
    fetchKitchenOrders();
  }, []);

  const fetchKitchenOrders = async (): Promise<void> => {
    setLoading(true);
    try {
      setOrders(await kitchenService.listOrders({
        pos_id: POS_ID,
        status_filter: ['PENDING', 'IN_PREPARATION', 'READY'],
      }));
    } catch (err) {
      console.error("Erreur lors de la récupération des commandes cuisine:", err);
    } finally {
      setLoading(false);
    }
  };

  useInterval(fetchKitchenOrders, isConnected ? null : 10000);

  // Changement d'état d'une commande
  const updateOrderStatus = async (orderId: string, nextStatus: Extract<OrderStatus, 'IN_PREPARATION' | 'READY'>): Promise<void> => {
    try {
      await kitchenService.updateOrderStatus(orderId, nextStatus);
      
      // Mise à jour locale du state
      setOrders(prev => prev.map(order => {
        if (order.id === orderId) {
          return { ...order, status: nextStatus };
        }
        return order;
      }).filter(order => order.status !== 'READY')); // Retirer de la vue si READY
    } catch (err) {
      console.error("Erreur de mise à jour du statut:", err);
      alert("Impossible de mettre à jour le statut de la commande.");
    }
  };

  const filteredOrders = orders.filter(order => {
    if (order.status === 'READY') return false; // Ne pas afficher les commandes terminées
    if (filter === 'PENDING') return order.status === 'PENDING';
    if (filter === 'IN_PREPARATION') return order.status === 'IN_PREPARATION';
    return true;
  });

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* ----------------- EN-TÊTE ÉCRAN CUISINE ----------------- */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/20 text-orange-400 rounded-xl">
            <Flame className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wide text-white">Écran Cuisine (KDS)</h1>
            <p className="text-xs text-slate-400">{filteredOrders.length} commande(s) en attente / prépa</p>
          </div>
        </div>

        {/* Filtres de vue */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              filter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Toutes ({orders.length})
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              filter === 'PENDING' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            À Préparer
          </button>
          <button
            onClick={() => setFilter('IN_PREPARATION')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              filter === 'IN_PREPARATION' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            En Cours
          </button>
        </div>

        <button 
          onClick={fetchKitchenOrders}
          className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition"
        >
          <RefreshCw className={`h-6 w-6 text-slate-300 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* ----------------- GRILLE DES TICKETS CUISINE ----------------- */}
      <main className="flex-1 p-4 overflow-x-auto overflow-y-hidden">
        {filteredOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Utensils className="h-20 w-20 mb-4 stroke-[1.5]" />
            <h2 className="text-2xl font-bold">Aucune commande en attente</h2>
            <p className="text-sm text-slate-600">Tout est sous contrôle en cuisine !</p>
          </div>
        ) : (
          <div className="flex gap-4 h-full items-start overflow-x-auto pb-2 scrollbar-thin">
            {filteredOrders.map((order) => {
              const minutesElapsed = getElapsedTime(order.created_at);
              const isUrgent = minutesElapsed >= 15;

              return (
                <div
                  key={order.id}
                  className={`w-[360px] max-h-full flex flex-col bg-slate-900 border rounded-2xl shadow-xl overflow-hidden transition-all ${
                    isUrgent 
                      ? 'border-rose-500/80 shadow-rose-950/20' 
                      : order.status === 'IN_PREPARATION' 
                        ? 'border-blue-500/80' 
                        : 'border-slate-800'
                  }`}
                >
                  {/* En-tête du Ticket */}
                  <div className={`p-4 flex items-center justify-between border-b ${
                    isUrgent 
                      ? 'bg-rose-950/40 border-rose-900/60' 
                      : order.status === 'IN_PREPARATION'
                        ? 'bg-blue-950/40 border-blue-900/60'
                        : 'bg-slate-800/60 border-slate-800'
                  }`}>
                    <div>
                      <span className="text-2xl font-black text-white">#{order.order_number}</span>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
                        <span className="font-bold px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                          {order.order_type === 'DINE_IN' ? `TABLE ${order.table_number || '-'}` : 'À EMPORTER'}
                        </span>
                      </div>
                    </div>

                    {/* Minuteur */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold ${
                      isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-300'
                    }`}>
                      <Clock className="h-4 w-4" />
                      <span>{minutesElapsed} min</span>
                    </div>
                  </div>

                  {/* Liste des articles du ticket */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-slate-800/60">
                    {order.items.map((item) => (
                      <div key={item.id} className="pt-3 first:pt-0">
                        
                        {/* Ligne principale Produit & Quantité */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 font-black text-lg border border-indigo-500/30">
                              {item.quantity}x
                            </span>
                            <div>
                              <h3 className="font-bold text-lg text-white leading-tight">
                                {item.product_name}
                              </h3>
                              
                              {/* BADGE VARIANT / TAILLE */}
                              {item.variant_name && (
                                <div className="mt-1 inline-block">
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
                                    Taille : {item.variant_name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* LISTE DES SUPPLÉMENTS / MODIFIERS */}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="mt-2.5 ml-11 space-y-1">
                            {item.modifiers.map((mod) => (
                              <div 
                                key={mod.id} 
                                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-1 rounded-md w-fit"
                              >
                                <span className="text-emerald-500">+</span>
                                <span>{mod.name}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* REMARQUES / NOTES SPÉCIALES */}
                        {item.notes && (
                          <div className="mt-2 ml-11 flex items-center gap-1.5 text-xs font-medium text-rose-300 bg-rose-950/30 border border-rose-900/40 px-2 py-1 rounded-md">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>Note : {item.notes}</span>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>

                  {/* Actions du Ticket */}
                  <div className="p-3 bg-slate-950 border-t border-slate-800">
                    {order.status === 'PENDING' ? (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'IN_PREPARATION')}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-white shadow-lg shadow-blue-600/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
                      >
                        <Flame className="h-5 w-5" />
                        Lancer en Préparation
                      </button>
                    ) : (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'READY')}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
                      >
                        <Check className="h-5 w-5" />
                        Marquer Prêt
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}