import * as fs from 'fs';

const content = fs.readFileSync('pdf_rules.txt', 'utf8');

fs.writeFileSync('lib/ai/pdf-rules.ts', `export const PDF_RULES = \`${content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;\n`);
console.log('done');
