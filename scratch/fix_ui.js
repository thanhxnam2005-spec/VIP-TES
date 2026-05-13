const fs = require('fs');
let content = fs.readFileSync('components/dictionary-management.tsx', 'utf-8');

// Remove the restriction in the UI loop
content = content.replace(
  /\{source !== "core_vietphrase" && source !== "core_phienam" && \(\s+<>\s+([\s\S]*?)\s+<\/>\s+\)\}/g,
  '<> $1 </>'
);

fs.writeFileSync('components/dictionary-management.tsx', content);
console.log('Fixed UI restrictions');
