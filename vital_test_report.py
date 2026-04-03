from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from faker import Faker
import random
import os

fake = Faker()

OUTPUT_DIR = "vital_reports"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def flag(val, low, high):
    if val < low:
        return "L"
    elif val > high:
        return "H"
    return ""


def generate_vital_report(index):
    filename = f"{OUTPUT_DIR}/vital_report_{index}.pdf"
    c = canvas.Canvas(filename, pagesize=letter)

    width, height = letter

    # -------------------------------
    # Border
    # -------------------------------
    c.rect(20, 20, width - 40, height - 40)

    # -------------------------------
    # Header
    # -------------------------------
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width / 2, height - 60, "CITY DIAGNOSTIC LAB")

    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, height - 75, "Accurate | Reliable | Trusted")

    c.line(40, height - 85, width - 40, height - 85)

    # -------------------------------
    # Patient Info
    # -------------------------------
    name = fake.name()
    age = random.randint(18, 70)
    gender = random.choice(["Male", "Female"])
    date = fake.date()
    report_id = fake.uuid4()[:8]

    c.setFont("Helvetica", 10)
    y = height - 110

    c.drawString(50, y, f"Patient Name: {name}")
    c.drawString(350, y, f"Report ID: {report_id}")
    y -= 15

    c.drawString(50, y, f"Age/Gender: {age} / {gender}")
    c.drawString(350, y, f"Date: {date}")

    # Box
    c.rect(40, height - 150, width - 80, 50)

    # -------------------------------
    # Table Header (SAME AS BLOOD)
    # -------------------------------
    y = height - 180

    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Vital Signs Report")
    y -= 20

    c.setFont("Helvetica-Bold", 10)

    c.drawString(50, y, "Test")
    c.drawString(250, y, "Result")
    c.drawString(320, y, "Unit")
    c.drawString(400, y, "Reference")
    c.drawString(500, y, "Flag")

    c.line(40, y - 5, width - 40, y - 5)
    y -= 20

    c.setFont("Helvetica", 10)

    # -------------------------------
    # Row Function (same format)
    # -------------------------------
    def row(test, val, unit, ref="", low=None, high=None):
        nonlocal y

        f = ""
        if low is not None and high is not None:
            f = flag(val, low, high)

        c.drawString(50, y, test)
        c.drawString(250, y, str(val))
        c.drawString(320, y, unit)

        # Only draw reference if exists
        if ref:
            c.drawString(400, y, ref)

        # Flag coloring
        if f == "H":
            c.setFillColorRGB(1, 0, 0)
        elif f == "L":
            c.setFillColorRGB(0, 0, 1)

        c.drawString(500, y, f)
        c.setFillColorRGB(0, 0, 0)

        y -= 18

    # -------------------------------
    # Vital Data
    # -------------------------------
    systolic = random.randint(100, 160)
    diastolic = random.randint(60, 100)
    heart_rate = random.randint(60, 110)
    weight = random.randint(50, 100)
    temp = round(random.uniform(97, 100), 1)
    height_m = random.uniform(1.5, 1.9)
    bmi = round(weight / (height_m ** 2), 1)


    # -------------------------------
    # Other rows (same format)
    # -------------------------------
    # wite bs as systolic and distolic separtely
    row("Systolic BP", systolic, "mmHg", "90-120", 90, 120)
    row("Diastolic BP", diastolic, "mmHg", "60-80", 60, 80)
    row("Heart Rate", heart_rate, "bpm", "60-100", 60, 100)
    row("Temperature", temp, "F", "97-99", 97, 99)
    row("Weight", weight, "kg")
    row("BMI", bmi, "kg/m2", "18.5-24.9", 18.5, 24.9)

    # -------------------------------
    # Footer
    # -------------------------------
    c.line(40, 120, width - 40, 120)

    c.setFont("Helvetica-Oblique", 9)
    c.drawString(50, 100, "Note: Abnormal vitals may require medical attention.")

    c.setFont("Helvetica", 10)
    c.drawString(400, 80, "Doctor Signature")
    c.line(400, 75, 550, 75)

    c.save()


# -------------------------------
# Generate 3 reports
# -------------------------------
for i in range(1, 4):
    generate_vital_report(i)

print("✅ Vital reports (same format as blood) generated!")