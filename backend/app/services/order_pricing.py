from decimal import Decimal


def split_tax_inclusive_amount(
    amount_ttc: Decimal,
    tax_rate_percent: Decimal,
) -> tuple[Decimal, Decimal]:
    """Return the HT amount and included tax from a tax-inclusive price."""
    if amount_ttc < 0 or tax_rate_percent < 0:
        raise ValueError("Montant TTC et taux de TVA doivent être positifs ou nuls.")
    if tax_rate_percent == 0:
        return amount_ttc, Decimal("0.00")

    amount_ht = amount_ttc / (Decimal("1.00") + tax_rate_percent / Decimal("100.00"))
    return amount_ht, amount_ttc - amount_ht