import React, { useState, useEffect } from "react";
import paymentService from '../../services/paymentService';
import { 
  BanknotesIcon, 
  CreditCardIcon, 
  DevicePhoneMobileIcon, 
  PrinterIcon, 
  XMarkIcon, 
  CheckCircleIcon,
  BackspaceIcon
} from "@heroicons/react/24/outline";

export default function CheckoutModal({ isOpen, onClose, order, userToken, onPaymentSuccess }) {
  const totalAmount = Number(order?.total_ttc) || 0;

  // --- États ---
  const [paymentMethod, setPaymentMethod] = useState("CASH"); // CASH, CREDIT_CARD, MOBILE_MONEY
  const [amountTendered, setAmountTendered] = useState(totalAmount.toString());
  const [referenceCode, setReferenceCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Réinitialiser les états quand le modal s'ouvre avec une nouvelle commande
  useEffect(() => {
    if (!isOpen || !order) return;
    setAmountTendered(totalAmount.toString());
    setPaymentMethod("CASH");
    setReferenceCode("");
    setCheckoutResult(null);
    setErrorMessage("");
  }, [order, totalAmount]);

  if (!isOpen || !order) return null;

  // --- Calculs ---
  const numericTendered = parseFloat(amountTendered) || 0;
  const changeGiven = paymentMethod === "CASH" ? Math.max(0, numericTendered - totalAmount) : 0;
  const isAmountValid = paymentMethod === "CASH" ? numericTendered >= totalAmount : true;

  // Coupures de billets prédéfinies pour saisie rapide (ex: FCFA / Devise locale)
  const quickCashPresets = [
    totalAmount,
    Math.ceil(totalAmount / 1000) * 1000,
    Math.ceil(totalAmount / 5000) * 5000,
    10000,
    20000
  ].filter((val, index, self) => val >= totalAmount && self.indexOf(val) === index).slice(0, 4);

  // --- Actions Pavé Numérique ---
  const handleNumpadInput = (char) => {
    if (char === ".") {
      if (!amountTendered.includes(".")) {
        setAmountTendered((prev) => prev + ".");
      }
      return;
    }
    setAmountTendered((prev) => (prev === "0" ? char : prev + char));
  };

  const handleNumpadClear = () => setAmountTendered("");
  const handleNumpadBackspace = () => {
    setAmountTendered((prev) => (prev.length > 1 ? prev.slice(0, -1) : ""));
  };

  // --- Envoi du Paiement vers l'API FastAPI ---
  const handleProcessCheckout = async () => {
    if (!isAmountValid) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const data = await paymentService.processPayment({
        order_id: order.id,
        payment_method: paymentMethod,
        amount_tendered: paymentMethod === "CASH" ? numericTendered : totalAmount,
        reference_code: paymentMethod !== "CASH" ? referenceCode : undefined,
      });

      setCheckoutResult(data);

      // Impression automatique dès que le paiement est validé
      await handlePrintReceipt(order.id);

      if (onPaymentSuccess) {
        onPaymentSuccess(data);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Impression via le système desktop unique ---
  const handlePrintReceipt = async (orderId) => {
    try {
      if (!window.pywebview?.api?.print_order_receipt) {
        setErrorMessage("Le système d’impression desktop n’est pas disponible.");
        return;
      }

      const res = await window.pywebview.api.print_order_receipt(orderId, userToken);
      if (!res?.success) {
        setErrorMessage(`Erreur imprimante : ${res?.error || "impression impossible"}`);
      }
    } catch (err) {
      setErrorMessage(err.message || "Erreur d’impression.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* --- HEADER --- */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-800/50 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Encaissement Commande <span className="text-emerald-400">#{order.order_number}</span>
            </h2>
            <p className="text-sm text-slate-400">
              Type : <span className="font-semibold text-slate-200">{order.order_type}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* --- CORPS MODAL --- */}
        {checkoutResult ? (
          /* --- ÉCRAN DE SICCÈS / CONFIRMATION --- */
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6 my-auto">
            <CheckCircleIcon className="w-20 h-20 text-emerald-500 animate-bounce" />
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Paiement Réussi !</h3>
              <p className="text-slate-400">La commande a été marquée comme réglée.</p>
            </div>

            {paymentMethod === "CASH" && (
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl w-full max-w-md">
                <p className="text-slate-400 text-sm">Monnaie à rendre au client :</p>
                <p className="text-4xl font-black text-emerald-400 mt-1">
                  {checkoutResult.change_given.toLocaleString()} FCFA
                </p>
              </div>
            )}

            <div className="flex gap-4 w-full max-w-md">
              <button
                onClick={onClose}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition"
              >
                Terminer
              </button>
            </div>
          </div>
        ) : (
          /* --- INTERFACE DE PAIEMENT --- */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 overflow-y-auto">
            
            {/* COLONNE GAUCHE : Modes de Paiement & Synthèse */}
            <div className="md:col-span-5 flex flex-col space-y-4">
              
              {/* Total à payer */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-5 rounded-2xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Net à Payer
                </span>
                <div className="text-3xl font-black text-white mt-1">
                  {totalAmount.toLocaleString()} FCFA
                </div>
              </div>

              {/* Sélection du mode de paiement */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Moyen de règlement
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition ${
                      paymentMethod === "CASH"
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/50"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <BanknotesIcon className="w-6 h-6 mb-1" />
                    Espèces
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CREDIT_CARD")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition ${
                      paymentMethod === "CREDIT_CARD"
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/50"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <CreditCardIcon className="w-6 h-6 mb-1" />
                    Carte B.
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("MOBILE_MONEY")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition ${
                      paymentMethod === "MOBILE_MONEY"
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/50"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <DevicePhoneMobileIcon className="w-6 h-6 mb-1" />
                    Mobile
                  </button>
                </div>
              </div>

              {/* Champ Référence (Mobile Money / Carte) */}
              {paymentMethod !== "CASH" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Référence de Transaction
                  </label>
                  <input
                    type="text"
                    placeholder="ex: MM-123456 ou Numéro d'autorisation"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Résumé Rendu de Monnaie (Espèces) */}
              {paymentMethod === "CASH" && (
                <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Montant Reçu :</span>
                    <span className="font-bold text-white">{numericTendered.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-700/50">
                    <span className="text-slate-400">Rendu Monnaie :</span>
                    <span className={`font-black text-lg ${changeGiven > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                      {changeGiven.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs p-3 rounded-xl">
                  {errorMessage}
                </div>
              )}
            </div>

            {/* COLONNE DROITE : Pavé Numérique & Coupures Rapides */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              
              {paymentMethod === "CASH" ? (
                <>
                  {/* Presets Coupures Rapides */}
                  <div className="grid grid-cols-4 gap-2">
                    {quickCashPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAmountTendered(preset.toString())}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold py-2 px-1 rounded-xl text-xs transition"
                      >
                        {preset.toLocaleString()} FCFA
                      </button>
                    ))}
                  </div>

                  {/* Ecran de Saisie Tactile */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Montant perçu</span>
                    <span className="text-3xl font-mono font-bold text-emerald-400">
                      {amountTendered || "0"} <span className="text-sm font-sans text-slate-500">FCFA</span>
                    </span>
                  </div>

                  {/* Clavier Tactile (Numpad) */}
                  <div className="grid grid-cols-3 gap-2">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0"].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleNumpadInput(num)}
                        className="bg-slate-800/60 hover:bg-slate-700 active:bg-slate-600 text-white font-bold text-xl py-4 rounded-xl border border-slate-700/50 transition"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleNumpadBackspace}
                      className="bg-slate-800/60 hover:bg-slate-700 active:bg-slate-600 text-amber-400 font-bold flex items-center justify-center rounded-xl border border-slate-700/50 transition"
                    >
                      <BackspaceIcon className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Action de Reset Saisie */}
                  <button
                    type="button"
                    onClick={handleNumpadClear}
                    className="text-xs text-slate-400 hover:text-white underline self-end"
                  >
                    Effacer la saisie
                  </button>
                </>
              ) : (
                <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center my-auto space-y-4">
                  <DevicePhoneMobileIcon className="w-16 h-16 text-slate-600" />
                  <p className="text-slate-400 text-sm max-w-xs">
                    Présentez le terminal de paiement ou validez le transfert mobile money, puis appuyez sur **Valider le Règlement**.
                  </p>
                </div>
              )}

              {/* BOUTON DE VALIDATION FINAL */}
              <button
                type="button"
                disabled={!isAmountValid || isSubmitting}
                onClick={handleProcessCheckout}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition shadow-lg ${
                  isAmountValid && !isSubmitting
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50"
                    : "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Traitement en cours...</span>
                ) : (
                  <>
                    <PrinterIcon className="w-6 h-6" />
                    Valider & Imprimer le Ticket
                  </>
                )}
              </button>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}