const fs = require('fs');
const PDFParse = require('pdf-parse').PDFParse;

let dataBuffer = fs.readFileSync('quy-tac-edit-pr_444b94f4fafde48e1d07438aa6b49106.pdf');

async function run() {
    const parser = new PDFParse(dataBuffer);
    const result = await parser.parse();
    fs.writeFileSync('pdf_rules.txt', result.text || result);
    console.log("Extracted!");
}
run().catch(console.error);
