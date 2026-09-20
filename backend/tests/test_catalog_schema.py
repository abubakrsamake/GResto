from app.schemas.catalog import ProductCreate, ProductUpdate


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
