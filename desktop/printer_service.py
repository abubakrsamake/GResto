# desktop/printer_service.py
import sys
import usb.core
import usb.util


class USBPrinterService:
    """Gère la communication directe via USB avec l'imprimante thermique ESC/POS."""

    def __init__(self, vendor_id: int = None, product_id: int = None):
        self.vendor_id = vendor_id
        self.product_id = product_id

    def find_printer(self):
        """Recherche une imprimante USB correspondant aux IDs ou la première imprimante de classe Printer (0x07)."""
        if self.vendor_id and self.product_id:
            dev = usb.core.find(idVendor=self.vendor_id, idProduct=self.product_id)
            if dev:
                return dev

        # Recherche automatique par classe d'appareil USB Printer (bDeviceClass == 7 ou interface Class == 7)
        def is_printer(device):
            if device.bDeviceClass == 7:
                return True
            for config in device:
                for interface in config:
                    if interface.bInterfaceClass == 7:
                        return True
            return False

        return usb.core.find(custom_match=is_printer)

    def print_raw_bytes(self, raw_data: bytes) -> dict:
        """
        Envoie le flux binaire ESC/POS à l'imprimante thermique USB.
        """
        try:
            device = self.find_printer()
            if device is None:
                return {"success": False, "error": "Aucune imprimante thermique USB détectée."}

            # Réinitialiser ou détacher le driver kernel si on est sous Linux
            if sys.platform.startswith("linux"):
                try:
                    if device.is_kernel_driver_active(0):
                        device.detach_kernel_driver(0)
                except Exception:
                    pass

            # Configuration par défaut
            device.set_configuration()

            # Obtenir la configuration active et l'interface d'impression
            cfg = device.get_active_configuration()
            intf = cfg[(0, 0)]

            # Trouver le point d'accès de sortie (OUT Endpoint)
            ep_out = usb.util.find_descriptor(
                intf,
                custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_OUT
            )

            if ep_out is None:
                return {"success": False, "error": "Endpoint USB OUT introuvable sur l'imprimante."}

            # Écriture des données ESC/POS (par paquets pour éviter les de-sync)
            ep_out.write(raw_data)

            return {"success": True, "message": "Ticket envoyé à l'imprimante avec succès."}

        except Exception as e:
            return {"success": False, "error": f"Erreur d'impression USB : {str(e)}"}


# --- Solution de Secours pour Windows (via spouleur de fichier binaire) ---
def print_win32_raw(printer_name: str, raw_data: bytes) -> dict:
    """Utilise l'API Windows Native (win32print) si PyUSB pose problème sous Windows."""
    try:
        import win32print
        hPrinter = win32print.OpenPrinter(printer_name)
        try:
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Ticket POS", None, "RAW"))
            win32print.StartPagePrinter(hPrinter)
            win32print.WritePrinter(hPrinter, raw_data)
            win32print.EndPagePrinter(hPrinter)
            win32print.EndDocPrinter(hPrinter)
        finally:
            win32print.ClosePrinter(hPrinter)
        return {"success": True, "message": "Impression Windows OK"}
    except Exception as e:
        return {"success": False, "error": str(e)}