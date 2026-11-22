import secrets
from datetime import datetime


def generate_bar_order_number() -> str:
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = secrets.token_hex(3).upper()
    return f"BAR-{date_part}-{random_part}"
