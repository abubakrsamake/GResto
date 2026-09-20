from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from datetime import datetime, timedelta
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.core.models import Order, OrderItem, Product, Payment
from app.core.models import User
from app.schemas.stats import DashboardStatsResponse

router = APIRouter(
    
    tags=["Statistics"]
)

@router.get("/dashboard", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    period: str = Query("today", pattern="^(today|week|month)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPERADMIN"])),
):
    now = datetime.utcnow()

    # 1. Définition de la plage de dates
    if period == "today":
        start_date = datetime(now.year, now.month, now.day)
    elif period == "week":
        start_date = now - timedelta(days=7)
    else:  # month
        start_date = now - timedelta(days=30)

    # 2. Calcul du Chiffre d'Affaires total
    stmt_revenue = select(func.coalesce(func.sum(Order.total_ttc), 0.0)).where(
        Order.created_at >= start_date,
        Order.status == "PAID" # Considérer uniquement les commandes COMPLETED ou PAYÉES pour le chiffre d'affaires
    )
    res_revenue = await db.execute(stmt_revenue)
    total_revenue_raw = res_revenue.scalar()
    total_revenue = float(total_revenue_raw or 0.0)

    # 3. Calcul du nombre total de commandes
    stmt_orders = select(func.count(Order.id)).where(
        Order.created_at >= start_date,
        Order.status == "PAID"
    )
    res_orders = await db.execute(stmt_orders)
    total_orders = res_orders.scalar() or 0

    average_basket = round(total_revenue / total_orders, 2) if total_orders > 0 else 0.0

    previous_start = start_date - (now - start_date)
    previous_stmt = select(func.coalesce(func.sum(Order.total_ttc), 0.0)).where(
        Order.created_at >= previous_start,
        Order.created_at < start_date,
        Order.status == "PAID",
    )
    previous_revenue = float((await db.execute(previous_stmt)).scalar() or 0.0)
    revenue_growth_percent = round(
        ((total_revenue - previous_revenue) / previous_revenue) * 100, 2
    ) if previous_revenue else (100.0 if total_revenue else 0.0)

    total_tax_stmt = select(func.coalesce(func.sum(Order.total_tax), 0.0)).where(
        Order.created_at >= start_date, Order.status == "PAID"
    )
    total_tax = float((await db.execute(total_tax_stmt)).scalar() or 0.0)

    cancelled_stmt = select(func.count(Order.id)).where(
        Order.created_at >= start_date, Order.status == "CANCELLED"
    )
    cancelled_orders = int((await db.execute(cancelled_stmt)).scalar() or 0)

    # 4. Évolution des ventes (Chart)
    sales_chart = []
    if period == "today":
        stmt_chart = (
            select(
                extract('hour', Order.created_at).label('hour'),
                func.sum(Order.total_ttc).label('total')
            )
            .where(Order.created_at >= start_date, Order.status == "PAID")
            .group_by('hour')
            .order_by('hour')
        )
        res_chart = await db.execute(stmt_chart)
        hourly_data = res_chart.all()

        sales_chart = [
            {
                "time": f"{int(h):02d}:00" if h is not None else "00:00",
                "total": float(tot or 0.0)
            } 
            for h, tot in hourly_data
        ]
    else:
        stmt_chart = (
            select(
                func.date(Order.created_at).label('day'),
                func.sum(Order.total_ttc).label('total')
            )
            .where(Order.created_at >= start_date, Order.status == "PAID")
            .group_by('day')
            .order_by('day')
        )
        res_chart = await db.execute(stmt_chart)
        daily_data = res_chart.all()

        sales_chart = [
            {
                "time": str(d), 
                "total": float(tot or 0.0)
            } 
            for d, tot in daily_data
        ]

    # 5. Pic d'affluence
    peak_hour = "N/A"
    if sales_chart:
        peak_entry = max(sales_chart, key=lambda x: x["total"])
        if peak_entry["total"] > 0:
            peak_hour = f"Pic à {peak_entry['time']}"

    # 6. Top Produits (4 plus vendus)
    stmt_top = (
        select(
            Product.name.label("name"),
            func.sum(OrderItem.quantity).label("sales"),
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue")
        )
        .join(OrderItem, Product.id == OrderItem.product_id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.created_at >= start_date,
            Order.status == "PAID"
        )
        .group_by(Product.id, Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(4)
    )
    res_top = await db.execute(stmt_top)
    top_products_query = res_top.all()

    top_products = [
        {
            "name": name,
            "sales": int(sales or 0),
            "revenue": float(revenue or 0.0)
        }
        for name, sales, revenue in top_products_query
    ]

    payment_stmt = (
        select(
            Payment.payment_method,
            func.sum(Payment.amount).label("amount"),
            func.count(Payment.id).label("count"),
        )
        .join(Order, Order.id == Payment.order_id)
        .where(Order.created_at >= start_date, Order.status == "PAID")
        .group_by(Payment.payment_method)
        .order_by(func.sum(Payment.amount).desc())
    )
    payment_methods = [
        {"method": method, "amount": float(amount or 0), "count": int(count or 0)}
        for method, amount, count in (await db.execute(payment_stmt)).all()
    ]

    order_type_stmt = (
        select(
            Order.order_type,
            func.sum(Order.total_ttc).label("total"),
            func.count(Order.id).label("count"),
        )
        .where(Order.created_at >= start_date, Order.status == "PAID")
        .group_by(Order.order_type)
        .order_by(func.sum(Order.total_ttc).desc())
    )
    order_types = [
        {"order_type": order_type, "total": float(total or 0), "count": int(count or 0)}
        for order_type, total, count in (await db.execute(order_type_stmt)).all()
    ]

    orders_chart_stmt = (
        select(func.date(Order.created_at).label("day"), func.count(Order.id).label("count"))
        .where(Order.created_at >= start_date, Order.status == "PAID")
        .group_by("day")
        .order_by("day")
    )
    orders_chart = [
        {"time": str(day), "total": float(count or 0)}
        for day, count in (await db.execute(orders_chart_stmt)).all()
    ] if period != "today" else [
        {"time": f"{int(hour):02d}:00", "total": float(count or 0)}
        for hour, count in (await db.execute(
            select(extract("hour", Order.created_at), func.count(Order.id))
            .where(Order.created_at >= start_date, Order.status == "PAID")
            .group_by(extract("hour", Order.created_at))
            .order_by(extract("hour", Order.created_at))
        )).all()
    ]

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "average_basket": average_basket,
        "peak_hour": peak_hour,
        "revenue_growth_percent": revenue_growth_percent,
        "sales_chart": sales_chart,
        "top_products": top_products,
        "payment_methods": payment_methods,
        "order_types": order_types,
        "total_tax": total_tax,
        "cancelled_orders": cancelled_orders,
        "orders_chart": orders_chart,
    }