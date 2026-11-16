from io import BytesIO
from datetime import datetime
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
    synthetic = result.get("synthetic", False)
    score_name = "simulated-pattern score" if synthetic else "disease-pattern score"
    out = BytesIO()
    doc = SimpleDocTemplate(
        out,
        pagesize=(595, 842),
        rightMargin=45,
        leftMargin=45,
        topMargin=48,
        bottomMargin=45,
    )
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="Brand",
            fontSize=26,
            leading=30,
            textColor=colors.HexColor("#102C46"),
            spaceAfter=8,
        )
    )
    styles["BodyText"].fontSize = 9
    styles["BodyText"].leading = 12
    styles["BodyText"].textColor = colors.HexColor("#526273")
    styles["Heading2"].fontSize = 15
    styles["Heading2"].leading = 19
    styles["Heading2"].textColor = colors.HexColor("#102C46")
    styles["Heading3"].fontSize = 9
    styles["Heading3"].leading = 13
    styles["Heading3"].textColor = colors.HexColor("#237C73")
    styles.add(ParagraphStyle(name="ReportMeta", fontSize=8, leading=12, textColor=colors.HexColor("#526273")))
    styles.add(ParagraphStyle(name="TableHead", fontSize=9, leading=12, textColor=colors.white, fontName="Helvetica-Bold"))
    timestamp = datetime.fromisoformat(result["timestamp"].replace("Z", "+00:00"))
    report_date = timestamp.strftime("%d %b %Y, %H:%M %Z")


    def p(text, style="BodyText"):
        return Paragraph(
            escape(str(text).replace("—", "-").replace("–", "-")), styles[style]
        )

    story = [
        p("CardioLens AI", "Brand"),
        p("EXPERIMENTAL ASSESSMENT | NOT A MEDICAL DIAGNOSIS", "Heading3"),
        p(f"Assessment generated: {report_date}", "ReportMeta"),
        Spacer(1, 14),
        p(result["label"], "Heading2"),
        p(f"{result['score_label']}: {result['disease_class_score']*100:.1f}%"),
        p(result["score_definition"]),
        p(
            f"Model: {result['model_name']} | Version: {result['model_version']} | Completeness: 100%"
        ),
        Spacer(1, 12),
        p(
            f"Holdout accuracy: {result['holdout_accuracy']:.2%} on "
            f"{result['holdout_rows']} generated records."
            if synthetic
            else DISCLAIMER
        ),
        Spacer(1, 16),
    ]
    if synthetic:
        story.insert(2, p("MODEL DEMONSTRATION | SIMULATED DATA", "Heading3"))
    elif result.get("demonstration"):
        story.insert(
            2, p("DATASET DEMONSTRATION - NOT A PERSONAL HEALTH RECORD", "Heading3")
        )
    value_heading = "SIMULATED VALUE / UNIT" if synthetic else "RECORDED VALUE / UNIT"
    rows = [[p("SUBMITTED MEASUREMENT", "TableHead"), p(value_heading, "TableHead")]]
    units = {
        "age": "years",
        "trestbps": "mmHg",
        "chol": "mg/dL",
        "thalach": "bpm",
        "oldpeak": "(as recorded)",
    }
    for name, value in result["measurements"].items():
        if value is None:
            continue
        label = field_label(name)
        if name == "visceral_fat":
            label = (
                "Visceral fat (simulated device index)"
                if synthetic
                else "Visceral fat (device index; not used by model)"
            )
        rows.append(
            [
                p(label),
                p(f'{display_value(name,value)} {units.get(name,"")}'),
            ]
        )
    table = Table(rows, colWidths=[220, 285], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#102C46")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.HexColor("#F9F7F2"), colors.white],
                ),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.HexColor("#DFE5E8")),
            ]
        )
    )
    story.extend(
        [
            p("Simulated record" if synthetic else "Clinical record", "Heading2"),
            table,
            PageBreak(),
            p("CardioLens AI", "Brand"),
            p("Explanation & limitations", "Heading2"),
            p("MODEL CONTRIBUTIONS | RESEARCH INTERPRETATION", "Heading3"),
            Spacer(1, 12),
        ]
    )
    explanation = result.get("explanation")
    if explanation:
        drawing = Drawing(500, 150)
        drawing.add(Line(270, 15, 270, 145, strokeColor=colors.HexColor("#DFE5E8")))
        for i, item in enumerate(explanation["features"][:5]):
            y = 125 - i * 24
            delta = item["contribution"]
            width = min(170, abs(delta) * 700)
            drawing.add(
                String(
                    0,
                    y,
                    "Visceral fat" if item["feature"] == "visceral_fat" else field_label(item["feature"]),
                    fontName="Helvetica",
                    fontSize=10,
                    fillColor=colors.HexColor("#102C46"),
                )
            )
            drawing.add(
                Rect(
                    270 if delta >= 0 else 270 - width,
                    y - 3,
                    width,
                    12,
                    fillColor=colors.HexColor("#A83C48" if delta >= 0 else "#237C73"),
                    strokeColor=None,
                )
            )
            drawing.add(String(455, y, f"{delta:+.3f}", fontSize=9, fontName="Helvetica"))
        drawing.add(
            String(
                110,
                0,
                "Decreases simulated score" if synthetic else "Decreases disease score",
                fontName="Helvetica",
                fontSize=8,
                fillColor=colors.HexColor("#237C73"),
            )
        )
        drawing.add(
            String(
                290,
                0,
                "Increases simulated score" if synthetic else "Increases disease score",
                fontName="Helvetica",
                fontSize=8,
                fillColor=colors.HexColor("#A83C48"),
            )
        )
        story.extend([drawing, Spacer(1, 14)])
        for item in explanation["features"][:5]:
            label = "Visceral fat" if item["feature"] == "visceral_fat" else field_label(item["feature"])
            story.append(
                p(
                    f"{label}: {item['contribution']:+.3f} contribution to the {score_name} relative to development references."
                )
            )
        story.append(p(explanation["method"]))
    story.extend(
        [
            Spacer(1, 12),
            p("Limitations", "Heading2"),
        ]
    )
    if not synthetic:
        story.extend(
            [
                p("No independent clinical validation, including for the Indian population. Clinical findings require interpretation by a qualified clinician."),
                p("User-supplied dataset: 303 source rows; one duplicate removed. Category and outcome meanings verified against the UCI Cleveland reference; small sample and no external clinical validation. The displayed model score refers to the source disease-present class, not personal clinical risk. Feature contributions are not causes."),
            ]
        )
    story.extend(p(x) for x in result["limitations"])

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#102C46"))
        canvas.rect(0, 832, 595, 10, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#BF743D"))
        canvas.rect(45, 817, 35, 2, fill=1, stroke=0)
        canvas.setStrokeColor(colors.HexColor("#DFE5E8"))
        canvas.line(45, 37, 550, 37)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#526273"))
        footer_label = (
            "CardioLens AI | Model demonstration"
            if synthetic
            else "CardioLens AI | Cardiovascular research | Not a medical diagnosis"
        )
        canvas.drawString(45, 25, footer_label)
        canvas.drawRightString(550, 25, f"Page {doc.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return out.getvalue()
