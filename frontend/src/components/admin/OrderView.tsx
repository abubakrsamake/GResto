import { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  Search, 
  Calendar, 
  X, 
  ShieldAlert, 
  UserCheck, 
  Eye, 
  CreditCard, 
  ShoppingBag, 
  User, 
  MapPin 
} from 'lucide-react';
import LoginView from '../LoginView';
import type { Order } from '../../types';
import orderService from '../../services/orderService';

const STATUS_TABS = [
  { label: 'Toutes', value: 'ALL' },
  { label: 'En attente', value: 'PENDING' },
  { label: 'En préparation', value: 'IN_PREPARATION' },
  { label: 'Prête', value: 'READY' },
  { label: 'Livrée', value: 'DELIVERED' },
  { label: 'Annulée', value: 'CANCELLED' },
];

interface OrderViewProps {
  userRole?: string;
}

export default function OrderView({ userRole }: OrderViewProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // État pour la commande sélectionnée dans la modale
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const token = localStorage.getItem('token');
  const posId = localStorage.getItem('pos_id');
  const isSuperAdmin = userRole === 'SUPERADMIN' || userRole === 'ADMIN';

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      setOrders(await orderService.getOrders({
        pos_id: posId || undefined,
        date: selectedDate || undefined,
        status_filter: selectedStatus !== 'ALL' ? [selectedStatus] : undefined,
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des commandes :', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token, posId, selectedStatus, selectedDate]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (!token) return <LoginView onLoginSuccess={() => window.location.reload()} />;

  // Filtrage combiné (Recherche par numéro + filtrage côté client si besoin)
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = String(o.order_number || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = selectedStatus === 'ALL' || o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">En attente</span>;
      case 'IN_PREPARATION':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30">En préparation</span>;
      case 'READY':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Prête</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-slate-700/30 text-slate-300 border border-slate-600/30">Livrée</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30">Annulée</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-slate-800 text-slate-300 border border-slate-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* En-tête avec Rôle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Receipt className="h-6 w-6 text-amber-400" />
          <div>
            <h2 className="text-xl font-black text-white">
              {isSuperAdmin ? 'Commandes (Vue Admin)' : 'Mes Commandes'}
            </h2>
            <p className="text-xs text-slate-400">
              {isSuperAdmin
                ? 'Supervision globale de toutes les transactions'
                : 'Liste de vos encaissements et ventes récents'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 border ${
            isSuperAdmin
              ? 'bg-purple-950/60 border-purple-700/50 text-purple-300'
              : 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
          }`}>
            {isSuperAdmin ? <ShieldAlert className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
            {isSuperAdmin ? 'Accès Global' : 'Mes Ventes'}
          </span>
          <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            Total : <strong className="text-amber-400">{filteredOrders.length}</strong>
          </span>
        </div>
      </div>

      {/* Onglets de statut */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSelectedStatus(tab.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
              selectedStatus === tab.value
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-400/20'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Barre d'outils (Recherche par N° + Sélecteur de date) */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white w-full focus:outline-none focus:border-amber-400/50"
            placeholder="Rechercher par N° de commande..."
          />
        </div>

        <div className="relative flex items-center">
          <Calendar className="absolute left-3 h-4 w-4 text-amber-400 pointer-events-none" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50 [color-scheme:dark]"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="absolute right-2 text-slate-400 hover:text-white"
              title="Réinitialiser"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tableau des commandes */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="bg-slate-900/90 text-xs uppercase text-amber-400 font-bold sticky top-0 border-b border-slate-800 backdrop-blur-md">
            <tr>
              <th className="px-4 py-3">N° Commande</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Total TTC</th>
              <th className="px-4 py-3">Date & Heure</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  Chargement des commandes...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  Aucune commande enregistrée.
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-slate-800/60 hover:bg-slate-900/60 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-amber-400 font-medium">
                    {o.order_number}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(o.status || 'UNKNOWN')}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {o.order_type || 'DINE_IN'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                      {Number(o.total_ttc ?? 0).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(o.created_at || '').toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg hover:bg-amber-400 hover:text-slate-950 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Détails
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODALE DE DÉTAIL COMMANDE & PAIEMENT */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-amber-400 font-mono">
                    {selectedOrder.order_number}
                  </h3>
                  {getStatusBadge(selectedOrder.status || 'UNKNOWN')}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Passée le {new Date(selectedOrder.created_at || '').toLocaleString('fr-FR')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Infos Utilisateur & Emplacement */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-slate-500 block">Agent / Caissier</span>
                    <strong className="text-slate-200">{selectedOrder.user?.full_name || 'N/A'}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-slate-500 block">Type / Table</span>
                    <strong className="text-slate-200">
                      {selectedOrder.order_type} {selectedOrder.table?.name ? `(${selectedOrder.table.name})` : ''}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Liste des articles commandés */}
              <div>
                <h4 className="text-xs uppercase font-bold text-slate-400 mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" /> Articles de la commande
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2">Article</th>
                        <th className="px-3 py-2 text-center">Qté</th>
                        <th className="px-3 py-2 text-right">Prix Unitaire</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2.5 font-medium text-white">{item.product_name || 'Produit'}</td>
                            <td className="px-3 py-2.5 text-center">{item.quantity}</td>
                            <td className="px-3 py-2.5 text-right">{Number(item.unit_price ?? 0).toLocaleString('fr-FR')} FCFA</td>
                            <td className="px-3 py-2.5 text-right font-bold text-amber-400">
                              {Number(item.total_price ?? 0).toLocaleString('fr-FR')} FCFA
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                            Aucun détail d'article disponible.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Informations de Paiement */}
              <div>
                <h4 className="text-xs uppercase font-bold text-slate-400 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" /> Historique des Paiements
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2">Méthode</th>
                          <th className="px-3 py-2">Référence</th>
                          <th className="px-3 py-2">Statut</th>
                          <th className="px-3 py-2 text-right">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {selectedOrder.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="px-3 py-2.5 font-bold text-white">{p.payment_method}</td>
                            <td className="px-3 py-2.5 font-mono text-slate-400">{p.reference_code || '-'}</td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                {p.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-emerald-400">
                              {Number(p.amount).toLocaleString('fr-FR')} FCFA
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="p-4 text-xs text-slate-500 text-center">
                      Aucun règlement associé à cette commande (En attente de paiement).
                    </p>
                  )}
                </div>
              </div>

              {/* Récapitulatif Financier */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Total HT</span>
                  <span>{Number(selectedOrder.total_ht || 0).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Taxes / TVA</span>
                  <span>{Number(selectedOrder.total_tax || 0).toLocaleString('fr-FR')} FCFA</span>
                </div>
                {Number(selectedOrder.discount_amount) > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Remise</span>
                    <span>-{Number(selectedOrder.discount_amount).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-amber-400 pt-2 border-t border-slate-800">
                  <span>TOTAL TTC</span>
                  <span>{Number(selectedOrder.total_ttc).toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}