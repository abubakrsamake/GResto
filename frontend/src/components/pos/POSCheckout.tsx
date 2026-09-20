// src/components/POSCheckout.tsx
import React from 'react';
import { usePywebview } from '../../hooks/usePywebview';

export const POSCheckout: React.FC = () => {
  const { isDesktop, printReceipt, openCashDrawer } = usePywebview();

  const handleCompleteSale = async () => {
    const currentOrder = {
      orderId: "CMD-2026-0042",
      restaurant_name: "Le Gourmet Bamako",
      pos_name: "Caisse Principale",
      order_number: "CMD-2026-0042",
      subtotal: 13000,
      tax: 2500,
      total: 15500,
      amountTendered: 20000,
      changeGiven: 4500,
      paymentMethod: "Espèces",
      items: [
        { name: "Burger Double Cheese", qty: 2, total: 10000, notes: "Sans oignons" },
        { name: "Frites Familiales", qty: 1, total: 2500 },
        { name: "Soda 50cl", qty: 2, total: 3000 }
      ]
    };

    // 1. Ouvrir le tiroir-caisse
    await openCashDrawer();

    // 2. Imprimer le reçu thermique
    const result = await printReceipt(currentOrder);

    if (result.success) {
      alert("Vente finalisée et ticket imprimé !");
    } else {
      alert(`Erreur impression : ${(result as any).error || 'Inconnue'}`);
    }
  };

  return (
    <div className="p-6 bg-slate-100 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Encaissement POS</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isDesktop ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
          {isDesktop ? 'Mode Desktop (Matériel actif)' : 'Mode Web (Mode dégradé)'}
        </span>
      </div>

      <button
        onClick={handleCompleteSale}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-lg shadow transition"
      >
        Valider Vente & Imprimer Ticket (15 500 FCFA)
      </button>
    </div>
  );
};