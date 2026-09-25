# backend/app/services/receipt.py
from decimal import Decimal
from app.core.models import Order


def generate_text_receipt(order: Order, change_given: Decimal = Decimal("0.00")) -> str:
    """
    Génère un ticket de caisse au format texte brut/ESC-POS adapté 
    aux imprimantes thermiques de caisse (80mm / 42 colonnes).
    """
    WIDTH = 42
    LINE = "-" * WIDTH
    DOUBLE_LINE = "=" * WIDTH

    lines = []
    
    # Entête
    lines.append("MON RESTO / POS".center(WIDTH))
    lines.append("123 Avenue de la République".center(WIDTH))
    lines.append("Tel: +223 00 00 00 00".center(WIDTH))
    lines.append(DOUBLE_LINE)
    
    # Infos Commande
    lines.append(f"Ticket N°  : {order.order_number}")
    date_str = order.created_at.strftime("%d/%m/%Y %H:%M") if order.created_at else ""
    lines.append(f"Date       : {date_str}")
    lines.append(f"Type       : {order.order_type}")
    if order.table_id:
        lines.append(f"Table      : {order.table_id}")
    lines.append(LINE)

    # Entête Articles
    lines.append(f"{'Article':<22} {'Qté':>3} {'Total TTC':>15}")
    lines.append(LINE)

    # Liste des articles
    for item in order.items:
        # Tronquer le nom du produit si trop long
        item_name = f"{item.product_name} ({item.variant_name})" if item.variant_name else item.product_name
        p_name = item_name[:21]
        price_str = f"{item.subtotal_ttc:,.0f}".replace(",", " ")
        lines.append(f"{p_name:<22} {item.quantity:>3} {price_str:>15}")

        # Modificateurs / Options
        for mod in item.selected_modifiers:
            mod_name = f" + {mod.modifier_name}"[:21]
            mod_price = f"{mod.unit_price:,.0f}".replace(",", " ")
            lines.append(f"{mod_name:<22}     {mod_price:>15}")

    lines.append(DOUBLE_LINE)

    # Totaux
    tot_ht = f"{order.total_ht:,.0f}".replace(",", " ")
    tot_tax = f"{order.total_tax:,.0f}".replace(",", " ")
    discount = f"{order.discount_amount:,.0f}".replace(",", " ")
    tot_ttc = f"{order.total_ttc:,.0f}".replace(",", " ")

    lines.append(f"{'Total HT :':<26} {tot_ht:>15}")
    lines.append(f"{'TVA / Taxes :':<26} {tot_tax:>15}")
    
    if order.discount_amount > 0:
        lines.append(f"{'Remise :':<26} -{discount:>14}")

    lines.append(DOUBLE_LINE)
    lines.append(f"{'TOTAL TTC :':<26} {tot_ttc:>15}")
    lines.append(DOUBLE_LINE)

    # Détails des règlements
    lines.append("RÈGLEMENTS :")
    for p in order.payments:
        amt = f"{p.amount:,.0f}".replace(",", " ")
        lines.append(f" - {p.payment_method:<20} : {amt:>15}")

    if change_given > 0:
        chg_str = f"{change_given:,.0f}".replace(",", " ")
        lines.append(f"{'Rendu Monnaie :':<26} {chg_str:>15}")

    lines.append(LINE)
    lines.append("Merci de votre visite !".center(WIDTH))
    lines.append("À bientôt !".center(WIDTH))
    lines.append("\n\n")

    return "\n".join(lines)


def generate_escpos_bytes(order: Order, change_given: Decimal = Decimal("0.00")) -> bytes:
    """
    Génère les commandes ESC/POS binaires pour impression directe sur port USB/Série/Réseau 
    avec coupe du papier et ouverture du tiroir-caisse.
    """
    ESC = b'\x1b'
    GS = b'\x1d'
    
    # Commandes de contrôle ESC/POS
    INIT = ESC + b'@'                     # Réinitialiser l'imprimante
    CENTER = ESC + b'a\x01'               # Alignement centré
    LEFT = ESC + b'a\x00'                 # Alignement gauche
    CUT_PAPER = GS + b'V\x41\x00'         # Coupe partielle du papier
    DRAWER_KICK = ESC + b'p\x00\x19\xfa'  # Signal d'ouverture du tiroir-caisse (Pin 2)

    receipt_text = generate_text_receipt(order, change_given)
    
    buffer = bytearray()
    buffer.extend(INIT)
    buffer.extend(DRAWER_KICK) # Ouvre le tiroir automatique à l'impression
    buffer.extend(receipt_text.encode('cp858', errors='replace')) # Encodage caractères spéciaux/devise
    buffer.extend(CUT_PAPER)

    return bytes(buffer)