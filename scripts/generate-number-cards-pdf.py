"""Generate 100 number flashcards, four per A4 portrait PDF page."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase.pdfmetrics import stringWidth

OUT = Path("_site/resources/year-2-number-cards-1-to-100/number-cards-1-to-100.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)
W, H = A4
margin, gap = 17, 12
cw = (W - 2 * margin - gap) / 2
ch = (H - 2 * margin - gap) / 2
colors = ["#00aa56", "#24b7bd", "#e84a5f", "#7a5cc7", "#ef8b2c", "#1677c8"]
ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
teens = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

def word(n):
    if n == 100: return "one hundred"
    if n < 10: return ones[n]
    if n < 20: return teens[n - 10]
    unit = n % 10
    return tens[n // 10] + ("-" + ones[unit] if unit else "")

def card(pdf, n, x, y):
    color = HexColor(colors[(n - 1) % len(colors)])
    pdf.setStrokeColor(color)
    pdf.setLineWidth(5)
    pdf.roundRect(x + 3, y + 3, cw - 6, ch - 6, 17, stroke=1, fill=0)
    center = x + cw / 2
    circle_y = y + ch - 65
    pdf.setFillColor(color)
    pdf.circle(center, circle_y, 35, stroke=0, fill=1)
    pdf.setFillColor(white)
    size = 34 if n < 100 else 26
    pdf.setFont("Helvetica-Bold", size)
    pdf.drawCentredString(center, circle_y - size * .35, str(n))
    pdf.setFillColor(HexColor("#252225"))
    text = word(n)
    size = min(21, 210 / max(1, stringWidth(text, "Times-Italic", 1)))
    pdf.setFont("Times-Italic", size)
    pdf.drawCentredString(center, circle_y - 62, text)
    nt, no = n // 10, n % 10
    # Tens always share a single horizontal row; only loose ones wrap.
    usable = cw - 30
    block = min(15, (usable - max(0, nt - 1) * 2) / max(1, nt))
    block = max(8, block)
    towers_width = nt * block + max(0, nt - 1) * 2
    ones_width = 3 * block + 4 if no else 0
    beside = bool(nt and no and towers_width + 8 + ones_width <= usable)
    towers_x = center - (towers_width + (8 + ones_width if beside else 0)) / 2
    tower_bottom = y + 25
    pdf.setFillColor(color)
    for t in range(nt):
        bx = towers_x + t * (block + 2)
        for j in range(10):
            by = tower_bottom + j * block
            pdf.rect(bx, by, block, block, fill=1, stroke=0)
            pdf.setStrokeColor(white)
            pdf.setLineWidth(.4)
            pdf.rect(bx, by, block, block, fill=0, stroke=1)
    if no:
        ox = towers_x + towers_width + 8 if beside else center - ones_width / 2
        oy = tower_bottom if beside or not nt else tower_bottom - 3 * block - 5
        # If there are many tens, place ones beside or in available space beneath the label.
        if nt and not beside:
            oy = tower_bottom + 10 * block + 5
        pdf.setFillColor(color)
        for j in range(no):
            col, row = j % 3, j // 3
            pdf.roundRect(ox + col * (block + 2), oy + row * (block + 2),
                          block, block, 2, fill=1, stroke=0)

pdf = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
pdf.setTitle("Number Cards 1-100 - Four per A4 Portrait Page")
for n in range(1, 101):
    slot = (n - 1) % 4
    col, row = slot % 2, slot // 2
    x = margin + col * (cw + gap)
    y = H - margin - ch - row * (ch + gap)
    card(pdf, n, x, y)
    if slot == 3:
        pdf.showPage()
pdf.save()
print(f"Created {OUT} (25 pages)")
