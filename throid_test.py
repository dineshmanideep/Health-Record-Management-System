from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from faker import Faker
import random
import os

fake = Faker()

OUTPUT_DIR = "thyroid_reports"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def flag(val, low, high):
    if val < low:
        return "L"
    elif val > high:
        return "H"
    return ""


# =====================================
# # BLOOD REPORT (same as yours)
# # =====================================
# def generate_blood_report(index):
#     filename = f"{OUTPUT_DIR}/blood_report_{index}.pdf"
#     c = canvas.Canvas(filename, pagesize=letter)

#     width, height = letter
#     c.rect(20, 20, width - 40, height - 40)

#     # Header
#     c.setFont("Helvetica-Bold", 18)
#     c.drawCentredString(width / 2, height - 60, "CITY DIAGNOSTIC LAB")

#     c.setFont("Helvetica", 10)
#     c.drawCentredString(width / 2, height - 75, "Accurate | Reliable | Trusted")
#     c.line(40, height - 85, width - 40, height - 85)

#     # Patient Info
#     name = fake.name()
#     age = random.randint(18, 70)
#     gender = random.choice(["Male", "Female"])
#     date = fake.date()
#     report_id = fake.uuid4()[:8]
#     doctor = fake.name()

#     c.setFont("Helvetica", 10)
#     y = height - 110

#     c.drawString(50, y, f"Patient Name: {name}")
#     c.drawString(350, y, f"Report ID: {report_id}")
#     y -= 15

#     c.drawString(50, y, f"Age/Gender: {age} / {gender}")
#     c.drawString(350, y, f"Date: {date}")
#     y -= 15

#     c.drawString(50, y, f"Ref Doctor: Dr. {doctor}")
#     c.rect(40, height - 150, width - 80, 50)

#     # Table Header
#     y = height - 180
#     c.setFont("Helvetica-Bold", 12)
#     c.drawString(50, y, "Blood Test Report")
#     y -= 20

#     c.setFont("Helvetica-Bold", 10)
#     c.drawString(50, y, "Test")
#     c.drawString(250, y, "Result")
#     c.drawString(320, y, "Unit")
#     c.drawString(400, y, "Reference")
#     c.drawString(500, y, "Flag")

#     c.line(40, y - 5, width - 40, y - 5)
#     y -= 20

#     c.setFont("Helvetica", 10)

#     def row(test, val, unit, ref, low, high):
#         nonlocal y
#         f = flag(val, low, high)

#         c.drawString(50, y, test)
#         c.drawString(250, y, str(val))
#         c.drawString(320, y, unit)
#         c.drawString(400, y, ref)

#         if f == "H":
#             c.setFillColorRGB(1, 0, 0)
#         elif f == "L":
#             c.setFillColorRGB(0, 0, 1)

#         c.drawString(500, y, f)
#         c.setFillColorRGB(0, 0, 0)

#         y -= 18

#     # CBC
#     c.setFont("Helvetica-Bold", 11)
#     c.drawString(50, y, "Complete Blood Count (CBC)")
#     y -= 15
#     c.setFont("Helvetica", 10)

#     row("Hemoglobin", round(random.uniform(9, 18), 1), "g/dL", "12-16", 12, 16)
#     row("WBC Count", random.randint(3000, 13000), "/µL", "4000-11000", 4000, 11000)
#     row("RBC Count", round(random.uniform(4.0, 6.5), 1), "million/µL", "4.0-6.0", 4.0, 6.0)
#     row("Platelets", random.randint(100000, 500000), "/µL", "150000-450000", 150000, 450000)

#     y -= 10

#     # Glucose
#     c.setFont("Helvetica-Bold", 11)
#     c.drawString(50, y, "Glucose Test")
#     y -= 15
#     c.setFont("Helvetica", 10)

#     row("Glucose", random.randint(70, 200), "mg/dL", "70-140", 70, 140)

#     y -= 10

#     # Lipid
#     c.setFont("Helvetica-Bold", 11)
#     c.drawString(50, y, "Lipid Profile")
#     y -= 15
#     c.setFont("Helvetica", 10)

#     row("Total Cholesterol", random.randint(150, 280), "mg/dL", "<200", 0, 200)
#     row("HDL", random.randint(30, 70), "mg/dL", ">40", 40, 100)
#     row("LDL", random.randint(80, 180), "mg/dL", "<130", 0, 130)
#     row("Triglycerides", random.randint(100, 300), "mg/dL", "<150", 0, 150)

#     c.save()


# =====================================
# THYROID REPORT (same format)
# =====================================
def generate_thyroid_report(index):
    filename = f"{OUTPUT_DIR}/thyroid_report_{index}.pdf"
    c = canvas.Canvas(filename, pagesize=letter)

    width, height = letter
    c.rect(20, 20, width - 40, height - 40)

    # Header
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width / 2, height - 60, "CITY DIAGNOSTIC LAB")

    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, height - 75, "Accurate | Reliable | Trusted")
    c.line(40, height - 85, width - 40, height - 85)

    # Patient Info
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
    c.rect(40, height - 150, width - 80, 50)

    # Table Header
    y = height - 180
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Thyroid Function Test")
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

    # Thyroid values
    tsh = round(random.uniform(0.1, 10.0), 2)
    t3 = round(random.uniform(0.5, 2.5), 2)
    t4 = round(random.uniform(4.0, 15.0), 2)

    row("TSH", tsh, "µIU/mL", "0.4-4.0", 0.4, 4.0)
    row("T3", t3, "ng/mL", "0.8-2.0", 0.8, 2.0)
    row("T4", t4, "µg/dL", "5.0-12.0", 5.0, 12.0)

    c.save()


# =====================================
# GENERATE ALL
# =====================================
for i in range(1, 4):
    generate_thyroid_report(i)

print("✅ Thyroid reports generated!")