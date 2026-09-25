from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.catalog import ProductCreate, ProductUpdate
from app.schemas.order import OrderStatusUpdate
from app.services.order_workflow import can_transition_order_status
from app.services.order_pricing import split_tax_inclusive_amount


def test_product_create_converts_blank_optional_strings_to_none():
    product = ProductCreate(
        name="Burger",
        sku="   ",
        description="",
        image_url="",
        base_price=12.5,
        category_id="11111111-1111-1111-1111-111111111111",
    )

    assert product.sku is None
    assert product.description is None
    assert product.image_url is None


def test_product_update_converts_blank_optional_strings_to_none():
    payload = ProductUpdate(sku="", description="   ", image_url="")

    assert payload.sku is None
    assert payload.description is None
    assert payload.image_url is None


def test_product_create_accepts_named_variants_with_positive_prices():
    product = ProductCreate(
        name="Pizza",
        base_price=5000,
        category_id="11111111-1111-1111-1111-111111111111",
        variants=[
            {"name": "Petite", "price_override": 5000},
            {"name": "Grande", "price_override": 8500},
        ],
    )

    assert [variant.name for variant in product.variants] == ["Petite", "Grande"]
    assert [variant.price_override for variant in product.variants] == [5000, 8500]


def test_product_create_rejects_duplicate_variant_names_case_insensitively():
    with pytest.raises(ValidationError):
        ProductCreate(
            name="Pizza",
            base_price=5000,
            category_id="11111111-1111-1111-1111-111111111111",
            variants=[
                {"name": "Grande", "price_override": 7000},
                {"name": " grande ", "price_override": 8500},
            ],
        )


def test_product_create_rejects_non_positive_variant_price():
    with pytest.raises(ValidationError):
        ProductCreate(
            name="Pizza",
            base_price=5000,
            category_id="11111111-1111-1111-1111-111111111111",
            variants=[{"name": "Grande", "price_override": 0}],
        )


def test_order_status_cannot_be_set_to_paid_outside_payment_flow():
    with pytest.raises(ValidationError):
        OrderStatusUpdate(status="PAID")


@pytest.mark.parametrize(
    ("current_status", "next_status"),
    [
        ("PENDING", "PREPARING"),
        ("IN_PREPARATION", "READY"),
        ("READY", "SERVED"),
        ("PENDING", "CANCELLED"),
    ],
)
def test_order_workflow_allows_valid_transitions(current_status, next_status):
    assert can_transition_order_status(current_status, next_status)


@pytest.mark.parametrize(
    ("current_status", "next_status"),
    [
        ("PENDING", "PAID"),
        ("PAID", "PENDING"),
        ("SERVED", "PREPARING"),
        ("PENDING", "SERVED"),
    ],
)
def test_order_workflow_rejects_invalid_transitions(current_status, next_status):
    assert not can_transition_order_status(current_status, next_status)


def test_tax_is_extracted_from_ttc_price_without_increasing_total():
    amount_ht, tax = split_tax_inclusive_amount(Decimal("11800.00"), Decimal("18.00"))

    assert amount_ht == Decimal("10000")
    assert tax == Decimal("1800.00")
    assert amount_ht + tax == Decimal("11800.00")


def test_zero_tax_keeps_the_ttc_price_unchanged():
    amount_ht, tax = split_tax_inclusive_amount(Decimal("4200.00"), Decimal("0.00"))

    assert amount_ht == Decimal("4200.00")
    assert tax == Decimal("0.00")
