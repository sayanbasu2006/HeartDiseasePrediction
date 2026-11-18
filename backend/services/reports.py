from io import BytesIO
from datetime import datetime
from html import escape
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Circle, PolyLine
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
                else "Visceral fat (device index)"
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

    effect = result.get("visceral_fat_effect")
    if effect:
        story.extend([
            PageBreak(),
            p("CardioLens AI", "Brand"),
            p("Visceral fat, in focus", "Heading2"),
            p("BODY COMPOSITION | INDIVIDUAL MODEL RESPONSE", "Heading3"),
            p("The same record, with only the visceral fat index changed. All other submitted measurements stay fixed."),
            Spacer(1, 18),
        ])
        difference = round(effect["difference"] * 100, 2)
        difference_text = f"{difference:+.2f}" if difference else "0.00"
        summary = Table([
            [p("SUBMITTED INDEX", "TableHead"), p("REFERENCE INDEX", "TableHead"), p("SCORE DIFFERENCE", "TableHead")],
            [p(f"{effect['index']:g} device index"), p(f"{effect['reference_index']:g} device index"), p(f"{difference_text} percentage points")],
        ], colWidths=[168, 168, 169])
        summary.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#102C46")),
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F4F6F6")),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.extend([
            summary,
            Spacer(1, 14),
            p(f"Reference: median index of {effect['reference_count']} development background records. This is a dataset comparison, not a recommended or healthy index."),
            Spacer(1, 14),
            p("One input. The model's response.", "Heading2"),
            p(f"{score_name.capitalize()} / 10. Lines connect sampled model predictions."),
        ])
        points = effect["curve"]
        if points:
            drawing = Drawing(505, 230)
            left, bottom, width, height = 35, 42, 450, 160
            low = min(point["index"] for point in points)
            high = max(point["index"] for point in points)

            def x_position(index):
                return left + (index - low) / max(high - low, 1e-9) * width

            for tick in (0, 2.5, 5, 7.5, 10):
                y = bottom + tick / 10 * height
                drawing.add(Line(left, y, left + width, y, strokeColor=colors.HexColor("#DFE5E8")))
                drawing.add(String(left - 8, y - 3, f"{tick:g}", textAnchor="end", fontSize=8, fillColor=colors.HexColor("#526273")))
            coords = []
            for point in points:
                coords.extend([x_position(point["index"]), bottom + point["score"] * height])
            drawing.add(PolyLine(coords, strokeColor=colors.HexColor("#102C46"), strokeWidth=2))
            for index, score, filled in (
                (effect["reference_index"], effect["reference_score"], False),
                (effect["index"], effect["submitted_score"], True),
            ):
                x, y = x_position(index), bottom + score * height
                drawing.add(Line(x, bottom, x, bottom + height, strokeColor=colors.HexColor("#84929C"), strokeDashArray=[3, 3]))
                drawing.add(Circle(x, y, 4, fillColor=colors.HexColor("#102C46") if filled else colors.white, strokeColor=colors.HexColor("#102C46")))
            for index in (low, (low + high) / 2, high):
                drawing.add(String(x_position(index), bottom - 15, f"{index:.1f}", textAnchor="middle", fontSize=8, fillColor=colors.HexColor("#526273")))
            drawing.add(String(260, 10, "Visceral fat device index", textAnchor="middle", fontSize=9, fillColor=colors.HexColor("#526273")))
            story.extend([drawing, p("Filled marker: submitted index. Open marker: development reference.", "ReportMeta")])
        story.extend([
            Spacer(1, 12),
            p(f"At the reference index: {effect['reference_score'] * 10:.2f} / 10. At the submitted index: {effect['submitted_score'] * 10:.2f} / 10."),
            p(f"Development index range: {effect['development_range'][0]:g}-{effect['development_range'][1]:g}. This range describes training records, not a clinical reference interval."),
            Spacer(1, 16),
            p("Interpretation & data provenance", "Heading2"),
            p(effect["method"]),
            p("Device index scales differ by manufacturer. Percentage body fat, waist circumference and visceral fat area are not interchangeable with a device index. No universal healthy threshold is assigned here."),
        ])
        if not effect["development_range"][0] <= effect["index"] <= effect["development_range"][1]:
            story.append(p("The submitted index is outside the development-data range. The model's response here has limited support."))

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
