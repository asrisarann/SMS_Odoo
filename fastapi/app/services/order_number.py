import secrets
from datetime import datetime


def generate_order_number() -> str:
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = secrets.token_hex(3).upper()
    return f"CAFE-{date_part}-{random_part}"
