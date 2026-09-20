from app.schemas.base import BaseSchema
from typing import List, Optional

class DailySalesPoint(BaseSchema):
    time: str
    total: float

class TopProduct(BaseSchema):
    name: str
    sales: int
    revenue: float

class PaymentMethodStat(BaseSchema):
    method: str
    amount: float
    count: int

class OrderTypeStat(BaseSchema):
    order_type: str
    total: float
    count: int

class DashboardStatsResponse(BaseSchema):
    total_revenue: float
    total_orders: int
    average_basket: float
    peak_hour: str
    revenue_growth_percent: float
    sales_chart: List[DailySalesPoint]
    top_products: List[TopProduct]
    payment_methods: List[PaymentMethodStat]
    order_types: List[OrderTypeStat]
    total_tax: float
    cancelled_orders: int
    orders_chart: List[DailySalesPoint]