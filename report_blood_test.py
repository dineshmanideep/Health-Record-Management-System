from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from faker import Faker
import random
import os

fake = Faker()

OUTPUT_DIR = "blood_reports"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def flag(val, low, high):
    if val < low:
        return "L"
    elif val > high:
        return "H"
    return ""


def generate_blood_report(index):
    filename = f"{OUTPUT_DIR}/blood_report_{index}.pdf"
    c = canvas.Canvas(filename, pagesize=letter)

    width, height = letter

    # -------------------------------
    # Draw Outer Border
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
    # Patient Info Box
    # -------------------------------
    name = fake.name()
    age = random.randint(18, 70)
    gender = random.choice(["Male", "Female"])
    date = fake.date()
    report_id = fake.uuid4()[:8]
    doctor = fake.name()

    c.setFont("Helvetica", 10)

    y = height - 110

    c.drawString(50, y, f"Patient Name: {name}")
    c.drawString(350, y, f"Report ID: {report_id}")
    y -= 15

    c.drawString(50, y, f"Age/Gender: {age} / {gender}")
    c.drawString(350, y, f"Date: {date}")
    y -= 15

    c.drawString(50, y, f"Ref Doctor: Dr. {doctor}")

    # Box
    c.rect(40, height - 150, width - 80, 50)

    # -------------------------------
    # Table Header
    # -------------------------------
    y = height - 180

    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Blood Test Report")
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

    def row(test, val, unit, ref, low, high):
        nonlocal y
        f = flag(val, low, high)

        c.drawString(50, y, test)
        c.drawString(250, y, str(val))
        c.drawString(320, y, unit)
        c.drawString(400, y, ref)

        if f == "H":
            c.setFillColorRGB(1, 0, 0)
        elif f == "L":
            c.setFillColorRGB(0, 0, 1)

        c.drawString(500, y, f)
        c.setFillColorRGB(0, 0, 0)

        y -= 18

    # -------------------------------
    # CBC Section
    # -------------------------------
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Complete Blood Count (CBC)")
    y -= 15

    c.setFont("Helvetica", 10)

    hemoglobin = round(random.uniform(9, 18), 1)
    wbc = random.randint(3000, 13000)
    rbc = round(random.uniform(4.0, 6.5), 1)
    platelets = random.randint(100000, 500000)

    row("Hemoglobin", hemoglobin, "g/dL", "12-16", 12, 16)
    row("WBC Count", wbc, "/µL", "4000-11000", 4000, 11000)
    row("RBC Count", rbc, "million/µL", "4.0-6.0", 4.0, 6.0)
    row("Platelets", platelets, "/µL", "150000-450000", 150000, 450000)

    y -= 10

    # -------------------------------
    # Glucose Section
    # -------------------------------
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Glucose Test")
    y -= 15

    c.setFont("Helvetica", 10)

    glucose = random.randint(70, 200)
    label = random.choice(["Glucose", "Blood Sugar", "Glucose Level"])

    row(label, glucose, "mg/dL", "70-140", 70, 140)

    y -= 10

    # -------------------------------
    # Lipid Profile
    # -------------------------------
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Lipid Profile")
    y -= 15

    c.setFont("Helvetica", 10)

    cholesterol = random.randint(150, 280)
    hdl = random.randint(30, 70)
    ldl = random.randint(80, 180)
    triglycerides = random.randint(100, 300)

    row("Total Cholesterol", cholesterol, "mg/dL", "<200", 0, 200)
    row("HDL", hdl, "mg/dL", ">40", 40, 100)
    row("LDL", ldl, "mg/dL", "<130", 0, 130)
    row("Triglycerides", triglycerides, "mg/dL", "<150", 0, 150)

    # -------------------------------
    # Footer Section
    # -------------------------------
    c.line(40, 120, width - 40, 120)

    c.setFont("Helvetica-Oblique", 9)
    c.drawString(50, 100, "Note: Values outside reference range may require medical attention.")

    # Signature
    c.setFont("Helvetica", 10)
    c.drawString(400, 80, "Authorized Signature")
    c.line(400, 75, 550, 75)

    c.save()


# Generate 3 reports
for i in range(1, 6):
    generate_blood_report(i)

print("✅ Better full-page reports generated!")