import { X, Banknote, CreditCard, Delete, RotateCcw, Printer } from 'lucide-react';

interface CheckoutModalProps {
  total: number;
  amountTendered: string;
  paymentMethod: 'CASH' | 'MOBILE_MONEY';
  calculatedChange: number;
  onSetPaymentMethod: (method: 'CASH' | 'MOBILE_MONEY') => void;
  onNumpadInput: (val: string) => void;
  onQuickAmount: (extra: number) => void;
  onExactAmount: () => void;
  onCheckout: () => void;
  onClose: () => void;
}

export default function CheckoutModal({
  total,
  amountTendered,
  paymentMethod,
  calculatedChange,
  onSetPaymentMethod,
  onNumpadInput,
  onQuickAmount,
  onExactAmount,
  onCheckout,
  onClose
}: CheckoutModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
          <h2 className="text-2xl font-black text-white">Règlement de la commande</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Sélection Mode de Paiement */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSetPaymentMethod('CASH')}
            className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
              paymentMethod === 'CASH' 
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                : 'border-slate-800 bg-slate-950 text-slate-400'
            }`}
          >
            <Banknote className="h-6 w-6" /> Espèces
          </button>
          <button
            onClick={() => onSetPaymentMethod('MOBILE_MONEY')}
            className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
              paymentMethod === 'MOBILE_MONEY' 
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                : 'border-slate-800 bg-slate-950 text-slate-400'
            }`}
          >
            <CreditCard className="h-6 w-6" /> Mobile Money / CB
          </button>
        </div>

        {/* Recapitulatif */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-950 p-3 rounded-xl text-center border border-slate-800">
            <span className="text-xs text-slate-400 block">Total à payer</span>
            <span className="text-xl font-black text-indigo-400">{total.toLocaleString()} FCFA</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl text-center border border-slate-800">
            <span className="text-xs text-slate-400 block">Montant Reçu</span>
            <span className="text-xl font-black text-emerald-400">
              {amountTendered ? `${parseFloat(amountTendered).toLocaleString()} FCFA` : '0 FCFA'}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl text-center border border-slate-800">
            <span className="text-xs text-slate-400 block">Monnaie à Rendre</span>
            <span className="text-xl font-black text-amber-400">{calculatedChange.toLocaleString()} FCFA</span>
          </div>
        </div>

        {/* Clavier et Raccourcis Espèces */}
        {paymentMethod === 'CASH' && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <button onClick={onExactAmount} className="py-2 px-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-indigo-300">
                Exact ({total.toLocaleString()})
              </button>
              <button onClick={() => onQuickAmount(1000)} className="py-2 px-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-slate-200">
                +1 000
              </button>
              <button onClick={() => onQuickAmount(5000)} className="py-2 px-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-slate-200">
                +5 000
              </button>
              <button onClick={() => onQuickAmount(10000)} className="py-2 px-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-slate-200">
                +10 000
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((num) => (
                <button
                  key={num}
                  onClick={() => onNumpadInput(num)}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-xl font-bold rounded-lg text-white active:bg-indigo-600 transition"
                >
                  {num}
                </button>
              ))}
              <button onClick={() => onNumpadInput('BACKSPACE')} className="py-2.5 bg-slate-800 hover:bg-amber-600 text-amber-400 hover:text-white font-bold rounded-lg flex items-center justify-center transition">
                <Delete className="h-6 w-6" />
              </button>
              <button onClick={() => onNumpadInput('CLEAR')} className="col-span-3 py-2 bg-rose-500/20 hover:bg-rose-600/30 text-rose-400 font-bold rounded-lg border border-rose-500/30 flex items-center justify-center gap-2 transition">
                <RotateCcw className="h-4 w-4" /> Effacer la Saisie
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-slate-300 transition">
            Annuler
          </button>
          <button onClick={onCheckout} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition">
            <Printer className="h-5 w-5" /> Valider & Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}