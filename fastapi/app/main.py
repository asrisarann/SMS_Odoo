from fastapi import FastAPI

from app.routers.customers import router as customers_router
from app.routers.menu import router as menu_router
from app.routers.orders import router as orders_router

app = FastAPI(title="Champions Club Cafe & Bar")

app.include_router(customers_router)
app.include_router(menu_router)
app.include_router(orders_router)


@app.get("/")
def read_root():
    return {"message": "Champions Club Cafe & Bar API"}
