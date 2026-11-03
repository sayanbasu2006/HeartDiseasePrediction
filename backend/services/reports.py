from io import BytesIO
from html import escape
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
from backend.schemas.clinical import DISCLAIMER
from backend.schemas.labels import field_label, display_value, FIELDS


def make_report(result):
    out = BytesIO()
    doc = SimpleDocTemplate(
        out,
        pagesize=(595, 842),
        rightMargin=45,
        leftMargin=45,
        topMargin=42,
        bottomMargin=42,
    )
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="Brand",
            fontSize=24,
            leading=30,
            textColor=colors.HexColor("#123b46"),
            spaceAfter=12,
        )
    )
    styles["BodyText"].leading = 14

    def p(text, style="BodyText"):
        return Paragraph(
            escape(str(text).replace("—", "-").replace("–", "-")), styles[style]
        )

    story = [
        p("CardioLens AI", "Brand"),
        p("EXPERIMENTAL ASSESSMENT | NOT A MEDICAL DIAGNOSIS", "Heading3"),
        p(result["timestamp"]),
        Spacer(1, 14),
        p(result["label"], "Heading2"),
        p(f"{result['score_label']}: {result['disease_class_score']*100:.1f}%"),
        p(result["score_definition"]),
        p(
            f"Model: {result['model_name']} | Version: {result['model_version']} | Completeness: 100%"
        ),
        Spacer(1, 12),
        p(DISCLAIMER),
        Spacer(1, 16),
    ]
    if result.get("demonstration"):
        story.insert(
            2, p("DATASET DEMONSTRATION - NOT A PERSONAL HEALTH RECORD", "Heading3")
        )
    rows = [["Submitted measurement", "Value / unit"]]
    units = {
        "age": "years",
        "trestbps": "mmHg",
        "chol": "mg/dL",
        "thalach": "bpm",
        "oldpeak": "(as recorded)",
    }
    for name, value in result["measurements"].items():
        rows.append(
            [
                p(field_label(name)),
                p(f'{display_value(name,value)} {units.get(name,"")}'),
            ]
        )
    table = Table(rows, colWidths=[220, 285], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#123b46")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.HexColor("#f1f6f5"), colors.white],
                ),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.extend(
        [
            table,
            PageBreak(),
            p("CardioLens AI", "Brand"),
            p("Explanation & limitations", "Heading2"),
            Spacer(1, 12),
        ]
    )
    explanation = result.get("explanation")
    if explanation:
        drawing = Drawing(500, 150)
        drawing.add(Line(270, 15, 270, 145, strokeColor=colors.HexColor("#cbd8d8")))
        for i, item in enumerate(explanation["features"][:5]):
            y = 125 - i * 24
            delta = item["contribution"]
            width = min(170, abs(delta) * 700)
            drawing.add(
                String(
                    0,
                    y,
                    field_label(item["feature"]),
                    fontSize=10,
                    fillColor=colors.HexColor("#123b46"),
                )
            )
            drawing.add(
                Rect(
                    270 if delta >= 0 else 270 - width,
                    y - 3,
                    width,
                    12,
                    fillColor=colors.HexColor("#f28a75" if delta >= 0 else "#087f79"),
                    strokeColor=None,
                )
            )
            drawing.add(String(455, y, f"{delta:+.3f}", fontSize=9))
        drawing.add(
            String(
                110,
                0,
                "Decreases disease score",
                fontSize=8,
                fillColor=colors.HexColor("#ad6653"),
            )
        )
        drawing.add(
            String(
                290,
                0,
                "Increases disease score",
                fontSize=8,
                fillColor=colors.HexColor("#087f79"),
            )
        )
        story.extend([drawing, Spacer(1, 14)])
        for item in explanation["features"][:5]:
            story.append(
                p(
                    f"{field_label(item['feature'])}: {item['contribution']:+.3f} contribution to the disease-pattern score relative to development references."
                )
            )
        story.append(p(explanation["method"]))
    story.extend(
        [
            Spacer(1, 12),
            p("Limitations", "Heading2"),
            p(
                "User-supplied dataset: 303 source rows; one duplicate removed. Category and outcome meanings verified against the UCI Cleveland reference; small sample and no external clinical validation. The displayed model score refers to the source disease-present class, not personal clinical risk. Feature contributions are not causes."
            ),
        ]
    )
    story.extend(p(x) for x in result["limitations"])

    def footer(canvas, doc):
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#627d87"))
        canvas.drawString(45, 25, "CardioLens AI | Local research assessment")
        canvas.drawRightString(550, 25, f"Page {doc.page}")

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return out.getvalue()
