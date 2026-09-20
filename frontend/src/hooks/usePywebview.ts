// src/hooks/usePywebview.ts
import { useState, useEffect } from 'react';
import type { OrderPrintData } from '../types/pywebview';

export function usePywebview() {
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    // Écoute l'événement d'initialisation de pywebview
    const handlePywebviewReady = () => {
      setIsDesktop(true);
      setIsReady(true);
    };

    if (window.pywebview) {
      setIsDesktop(true);
      setIsReady(true);
    } else {
      window.addEventListener('pywebviewready', handlePywebviewReady);
    }

    return () => {
      window.removeEventListener('pywebviewready', handlePywebviewReady);
    };
  }, []);

  const printReceipt = async (orderData: OrderPrintData) => {
    if (window.pywebview?.api) {
      return await window.pywebview.api.print_receipt(orderData);
    }

    return {
      success: false,
      message: "Impression native indisponible. Le système desktop doit être actif."
    };
  };

  const openCashDrawer = async () => {
    if (window.pywebview?.api) {
      return await window.pywebview.api.open_cash_drawer();
    } else {
      console.warn("Tiroir-caisse non disponible sur navigateur Web.");
      return { success: false, error: "Non supporté sur le Web" };
    }
  };

  return {
    isDesktop,
    isReady,
    printReceipt,
    openCashDrawer
  };
}