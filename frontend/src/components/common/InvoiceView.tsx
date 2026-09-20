import { Printer, X } from 'lucide-react';

export interface InvoiceItem {
  product_name?: string;
  name?: string;
  title?: string;
  quantity?: number;
  qty?: number;
  unit_price?: number;
  price_ttc?: number;
  price?: number;
  total?: number;
  subtotal?: number;
  amount?: number;
  notes?: string;
}

export interface InvoiceData {
  orderId?: string;
  items?: InvoiceItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  paymentMethod?: string;
  amountTendered?: number;
  changeGiven?: number;
  date?: string;
}

export interface InvoiceViewProps extends InvoiceData {
  data?: InvoiceData; // Support de la prop `data`
  onClose?: () => void;
}

export default function InvoiceView(props: InvoiceViewProps) {
  // Fusion des données : priorise la prop `data` si elle est fournie
  const source = props.data || props;

  const {
    orderId = '',
    items = [],
    subtotal = 0,
    tax = 0,
    total = 0,
    paymentMethod = 'CASH',
    amountTendered,
    changeGiven = 0,
    date,
  } = source;

  const onClose = props.onClose;

  const now = date ? new Date(date) : new Date();
  const formattedDate = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const tendered = amountTendered !== undefined ? amountTendered : total;

  return (
    <div className="bg-white text-slate-900 w-full max-w-md mx-auto shadow-2xl rounded-3xl overflow-hidden font-sans text-sm relative">
      {/* En-tête ticket */}
      <div className="bg-slate-950 text-white px-6 py-5 text-center relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-xl font-black tracking-tight">GRestaurant</h1>
        <p className="text-xs text-slate-400 mt-1">
          POS Terminal · {formattedDate}
        </p>
        <div className="text-[10px] text-slate-500 mt-1">{formattedTime}</div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Numéro commande */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <span className="text-xs text-slate-400 font-medium">Ticket N°</span>
          <span className="font-mono font-bold text-sm">
            {(orderId || '').slice(0, 16).toUpperCase()}
          </span>
        </div>

        {/* Articles */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {(items || []).map((item: InvoiceItem, i: number) => {
            const itemQty = item?.quantity ?? item?.qty ?? 1;
            const itemName =
              item?.product_name ??
              item?.name ??
              item?.title ??
              'Produit sans nom';

            const unitPrice =
              item?.unit_price ?? item?.price_ttc ?? item?.price ?? 0;
            const itemTotal =
              item?.total ??
              item?.subtotal ??
              item?.amount ??
              unitPrice * itemQty;

            return (
              <div key={i} className="flex justify-between items-start text-sm">
                <div>
                  <span className="font-semibold block">{itemName}</span>
                  <span className="text-[10px] text-slate-400">
                    x{itemQty}
                  </span>
                </div>
                <span className="font-bold text-right shrink-0">
                  {itemTotal > 0
                    ? `${Number(itemTotal).toLocaleString('fr-FR')} FCFA`
                    : '-'}
                </span>
              </div>
            );
          })}
        </div>

        <hr className="border-slate-200" />

        {/* Totaux */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Sous-total HT</span>
            <span>
              {Number(subtotal || 0).toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>TVA (18%)</span>
            <span>{Number(tax || 0).toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-300">
            <span>TOTAL TTC</span>
            <span>{Number(total || 0).toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        {/* Paiement */}
        <div className="bg-slate-950 rounded-xl p-3 text-xs space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Méthode</span>
            <span className="font-semibold text-white uppercase">
              {paymentMethod === 'CASH' ? 'Espèces' : 'Mobile / CB'}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Reçu</span>
            <span className="font-bold text-emerald-400">
              {Number(tendered || 0).toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Monnaie</span>
            <span className="font-bold text-indigo-400">
              {Number(changeGiven || 0).toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        {/* Pied */}
        <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 space-y-2">
          <p>Merci de votre visite</p>
          <p className="font-mono">
            COLIBRI ENERGY · {new Date().toLocaleDateString('fr-FR')}
          </p>

          <div className="pt-2 flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Printer className="h-4 w-4" /> Imprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}