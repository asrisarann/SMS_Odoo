from fastapi import FastAPI

from app.routers.customers import router as customers_router
from app.routers.menu import router as menu_router
from app.routers.orders import router as orders_router
from app.routers.receipts import router as receipts_router
from app.routers.bar.customers import router as bar_customers_router
from app.routers.bar.menu import router as bar_menu_router
from app.routers.bar.orders import router as bar_orders_router
from app.routers.bar.receipts import router as bar_receipts_router

app = FastAPI(title="Champions Club Cafe & Bar")

app.include_router(customers_router)
app.include_router(menu_router)
app.include_router(orders_router)
app.include_router(receipts_router)
app.include_router(bar_customers_router)
app.include_router(bar_menu_router)
app.include_router(bar_orders_router)
app.include_router(bar_receipts_router)


@app.get("/")
def read_root():
    return {"message": "Champions Club Cafe & Bar API"}
