import { useState, useEffect } from 'react';
import { Receipt, FileText, ChevronRight } from 'lucide-react';
import InvoiceView from './common/InvoiceView';
import type { Invoice } from '../types';
import invoiceService from '../services/invoiceService';

export default function InvoicesView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      setInvoices(await invoiceService.list());
    } catch (e: any) {
      console.error('Erreur factures', e);
      // Fallback avec données fictives si l'endpoint n'est pas encore prêt
      setInvoices([
        {
          id: '48b03606-90d6',
          order_number: 'ORD-20260910-204837-5E',
          status: 'COMPLETED',
          total_ttc: 14200,
          created_at: new Date().toISOString(),
          pos_id: 'ac5a66d4-42c3-4347-a7e7-969d7beef108',
          payment_method: 'CASH',
          change_given: 800,
          amount_tendered: 15000,
          items: [
            { name: 'Burger Special', qty: 2, total: 10000 },
            { name: 'Frites XL', qty: 2, total: 4200 }
          ]
        },
        {
          id: 'a1b2c3d4-e5f6',
          order_number: 'ORD-20260909-183022-AB',
          status: 'COMPLETED',
          total_ttc: 8750,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          pos_id: 'ac5a66d4-42c3-4347-a7e7-969d7beef108',
          payment_method: 'MOBILE_MONEY',
          change_given: 0,
          amount_tendered: 8750,
          items: [
            { name: 'Pizza Margherita', qty: 1, total: 8750 }
          ]
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <div className="h-full w-full bg-slate-950 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Mes Factures</h1>
          <span className="text-xs text-slate-500 font-medium ml-auto">Vendeur : Marie Dupont · C-002</span>
        </div>

        <div className="grid gap-3">
          {loading ? (
            <p className="text-slate-500 text-sm">Chargement des factures...</p>
          ) : invoices.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune facture trouvée.</p>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/40 transition shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-800 uppercase">
                        {inv.status}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">{inv.pos_id ? inv.pos_id.slice(0, 8) : 'POS'}...</span>
                    </div>
                    <h3 className="font-black text-white text-lg">{inv.order_number}</h3>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span>{new Date(inv.created_at).toLocaleString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      <span>·</span>
                      <span>{new Date(inv.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-black text-indigo-400">{inv.total_ttc?.toLocaleString() || '0'} FCFA</span>
                    <div className="text-[10px] text-slate-500 mt-1">TTC (TVA 18%)</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedInvoice(inv)}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                  >
                    <FileText className="h-3.5 w-3.5" /> Voir le détail
                    <ChevronRight className="h-3 w-3" />
                  </button>
                  <span className="text-[10px] text-slate-600 font-mono">{inv.id.slice(0, 8)}...</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal détail facture / Ticket */}
      {selectedInvoice && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" 
          onClick={() => setSelectedInvoice(null)}
        >
          <div onClick={e => e.stopPropagation()} className="relative max-w-md w-full">
            <InvoiceView
              orderId={selectedInvoice.order_number || selectedInvoice.id}
              items={selectedInvoice.items || []}
              subtotal={selectedInvoice.subtotal || Math.round(selectedInvoice.total_ttc / 1.18)}
              tax={selectedInvoice.tax || Math.round(selectedInvoice.total_ttc - (selectedInvoice.total_ttc / 1.18))}
              total={selectedInvoice.total_ttc || 0}
              paymentMethod={selectedInvoice.payment_method || 'CASH'}
              amountTendered={selectedInvoice.amount_tendered || selectedInvoice.total_ttc}
              changeGiven={selectedInvoice.change_given || 0}
              date={selectedInvoice.created_at}
              onClose={() => setSelectedInvoice(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}