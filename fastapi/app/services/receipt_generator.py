from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.schemas.receipt import ReceiptResponse


def generate_receipt_pdf(receipt: ReceiptResponse) -> bytes:
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Cafe receipt {receipt.order_number}",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CafeTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#183B35"),
        spaceAfter=4 * mm,
    )
    center_style = ParagraphStyle(
        "CafeCenter",
        parent=styles["Normal"],
        alignment=TA_CENTER,
    )
    right_style = ParagraphStyle(
        "CafeRight",
        parent=styles["Normal"],
        alignment=TA_RIGHT,
    )
    item_style = styles["BodyText"]

    story = [
        Paragraph("Champions Club Cafe &amp; Bar", title_style),
        Paragraph("Receipt", center_style),
        Spacer(1, 8 * mm),
        Paragraph(f"<b>Order:</b> {escape(receipt.order_number)}", styles["Normal"]),
        Paragraph(f"<b>Customer:</b> {escape(receipt.customer_name)}", styles["Normal"]),
        Paragraph(f"<b>Email:</b> {escape(receipt.customer_email)}", styles["Normal"]),
        Paragraph(
            f"<b>Date:</b> {receipt.order_datetime.strftime('%Y-%m-%d %H:%M:%S')}",
            styles["Normal"],
        ),
        Paragraph(
            f"<b>Table:</b> {receipt.table_number if receipt.table_number is not None else 'Not specified'}",
            styles["Normal"],
        ),
        Spacer(1, 6 * mm),
    ]

    item_rows = [[Paragraph("<b>Ordered items</b>", item_style)]]
    item_rows.extend(
        [Paragraph(escape(description), item_style)]
        for description in (receipt.items or ["Item details unavailable"])
    )
    items_table = Table(item_rows, colWidths=[170 * mm])
    items_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF1EE")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#B7C8C1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D5DFDA")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.extend(
        [
            items_table,
            Spacer(1, 8 * mm),
            Paragraph(
                f"<b>Final payable amount: {receipt.total_amount:.2f}</b>",
                right_style,
            ),
            Spacer(1, 12 * mm),
            Paragraph("Thank you for visiting Champions Club Cafe &amp; Bar!", center_style),
        ]
    )

    document.build(story)
    return buffer.getvalue()
