from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.schemas.bar_receipt import BarReceiptResponse


def generate_bar_receipt_pdf(receipt: BarReceiptResponse) -> bytes:
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Bar receipt {receipt.order_number}",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "BarTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#52331F"),
        spaceAfter=4 * mm,
    )
    center_style = ParagraphStyle(
        "BarCenter",
        parent=styles["Normal"],
        alignment=TA_CENTER,
    )
    right_style = ParagraphStyle(
        "BarRight",
        parent=styles["Normal"],
        alignment=TA_RIGHT,
    )

    story = [
        Paragraph("Champions Club Bar", title_style),
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

    rows = [[
        Paragraph("<b>Item</b>", styles["BodyText"]),
        Paragraph("<b>Qty</b>", styles["BodyText"]),
        Paragraph("<b>Unit price</b>", styles["BodyText"]),
        Paragraph("<b>Line total</b>", styles["BodyText"]),
    ]]
    rows.extend(
        [
            Paragraph(escape(item.name), styles["BodyText"]),
            str(item.quantity),
            f"{item.unit_price:.2f}",
            f"{item.line_total:.2f}",
        ]
        for item in receipt.items
    )
    table = Table(rows, colWidths=[86 * mm, 18 * mm, 32 * mm, 34 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F2E9E0")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#C8B6A6")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#DED2C7")),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.extend(
        [
            table,
            Spacer(1, 7 * mm),
            Paragraph(f"<b>Subtotal: {receipt.subtotal:.2f}</b>", right_style),
            Paragraph(
                f"<b>Membership discount: {receipt.discount_amount:.2f}</b>",
                right_style,
            ),
            Paragraph(f"<b>Final total: {receipt.total_amount:.2f}</b>", right_style),
            Spacer(1, 10 * mm),
            Paragraph("Thank you for visiting Champions Club Bar!", center_style),
        ]
    )
    document.build(story)
    return buffer.getvalue()
