export async function printThermalReceiptWebSerial(receiptData: {
  orderId: string;
  items: Array<{ name: string; qty: number; total: number }>;
  subtotal: number;
  tax: number;
  total: number;
  amountTendered: number;
  changeGiven: number;
  paymentMethod: string;
}) {
  if (!('serial' in navigator)) {
    throw new Error("L'API Web Serial n'est pas supportée sur ce navigateur.");
  }

  const port = await (navigator as any).serial.requestPort();
  await port.open({ baudRate: 9600 });

  const writer = port.writable.getWriter();
  const encoder = new TextEncoder();

  const ESC = '\x1B';
  const GS = '\x1D';
  const INIT = ESC + '@';
  const ALIGN_CENTER = ESC + 'a' + '\x01';
  const ALIGN_LEFT = ESC + 'a' + '\x00';
  const ALIGN_RIGHT = ESC + 'a' + '\x02';
  const BOLD_ON = ESC + 'E' + '\x01';
  const BOLD_OFF = ESC + 'E' + '\x00';
  const CUT_PAPER = GS + 'V' + '\x41' + '\x03';

  let ticket = INIT;
  ticket += ALIGN_CENTER + BOLD_ON + 'RESTAURANT POS\n' + BOLD_OFF;
  ticket += 'Ticket de Caisse\n';
  ticket += `Commande #: ${receiptData.orderId.slice(0, 8)}\n`;
  ticket += `Date: ${new Date().toLocaleString('fr-FR')}\n`;
  ticket += '--------------------------------\n';

  ticket += ALIGN_LEFT;
  receiptData.items.forEach(item => {
    ticket += `${item.name}\n`;
    ticket += `  ${item.qty} x ${item.total / item.qty} FCFA = ${item.total} FCFA\n`;
  });
  ticket += '--------------------------------\n';

  ticket += ALIGN_RIGHT;
  ticket += `Sous-total HT: ${receiptData.subtotal.toLocaleString()} FCFA\n`;
  ticket += `TVA (18%): ${receiptData.tax.toLocaleString()} FCFA\n`;
  ticket += BOLD_ON + `TOTAL TTC: ${receiptData.total.toLocaleString()} FCFA\n` + BOLD_OFF;
  ticket += `Paye (${receiptData.paymentMethod}): ${receiptData.amountTendered.toLocaleString()} FCFA\n`;
  ticket += `Rendu: ${receiptData.changeGiven.toLocaleString()} FCFA\n`;
  ticket += '--------------------------------\n';

  ticket += ALIGN_CENTER + 'Merci de votre visite !\nA bientot\n\n\n';
  ticket += CUT_PAPER;

  await writer.write(encoder.encode(ticket));
  writer.releaseLock();
  await port.close();
}