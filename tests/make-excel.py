"""Generate a made-up daily workbook for browser tests; no real hotel records."""
from pathlib import Path
from zipfile import ZipFile
from xml.sax.saxutils import escape
output = Path('.test-results/fabricated-daily.xlsx')
output.parent.mkdir(exist_ok=True)
rows = [['Date', 'ROOM', 'FOOD', 'UPI', 'GUEST ONLINE PAY', 'OTA PAY', 'CASH PAY', 'TOTAL EXPENSES', 'CLOSING BALANCE CASH'], ['1/11/26', 999, 999, 999, 999, 999, 999, 999, 999], ['2/11/26', 4100, 1250, None, 0, None, 5350, 450, 50]]
xml_rows = []
for index, row in enumerate(rows, 1):
    cells = []
    for column, value in enumerate(row):
        ref = f'{chr(65 + column)}{index}'
        if value is None:
            continue
        if isinstance(value, str):
            cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{escape(value)}</t></is></c>')
        else:
            cells.append(f'<c r="{ref}"><v>{value}</v></c>')
    xml_rows.append(f'<row r="{index}">{"".join(cells)}</row>')
with ZipFile(output, 'w') as archive:
    archive.writestr('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
    archive.writestr('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
    archive.writestr('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Fabricated report" sheetId="1" r:id="rId1"/></sheets></workbook>')
    archive.writestr('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
    archive.writestr('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + ''.join(xml_rows) + '</sheetData></worksheet>')
