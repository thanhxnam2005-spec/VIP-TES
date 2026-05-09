import fitz # PyMuPDF
doc = fitz.open('quy-tac-edit-pr_444b94f4fafde48e1d07438aa6b49106.pdf')
text = ""
for page in doc:
    text += page.get_text()
with open('pdf_rules.txt', 'w', encoding='utf-8') as f:
    f.write(text)
print("Extracted!")
