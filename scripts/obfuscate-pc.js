const fs = require('fs');
const path = require('path');

function obfuscate(code) {
  // 1. Extract Tampermonkey Header
  let tmHeader = '';
  const tmMatch = code.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/);
  if (tmMatch) {
    tmHeader = tmMatch[0] + '\n\n';
    code = code.replace(tmMatch[0], '');
  }

  // 2. Simple Minify (strip comments, collapse whitespace)
  let body = code
    .replace(/\/\/.*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 3. String extraction
  const strings = [];
  // This regex matches strings and handles escaped quotes
  const stringRegex = /(["'])(?:(?=(\\?))\2.)*?\1/g;
  
  const obfuscatedBody = body.replace(stringRegex, (match) => {
    // Push the whole string (including quotes) as base64
    strings.push(Buffer.from(match).toString('base64'));
    return `_0xstr(${strings.length - 1})`;
  });

  const stringPool = JSON.stringify(strings);

  // 4. Construct the final script
  // We use a self-invoking function to wrap the logic and the string decoder.
  return `${tmHeader}(function() {
  const _0xpool = ${stringPool};
  const _0xcache = {};
  const _0xstr = function(i) {
    if (_0xcache[i] !== undefined) return _0xcache[i];
    const s = atob(_0xpool[i]);
    // The string still has its original quotes, so we slice them off
    const res = s.slice(1, -1);
    _0xcache[i] = res;
    return res;
  };
  // Original logic starts here
  ${obfuscatedBody}
})();`;
}

const files = [
  { src: 'extension-pc/background.src.js', dest: 'extension-pc/background.js' },
  { src: 'extension-pc/content.src.js', dest: 'extension-pc/content.js' },
  { src: 'extension/background.src.js', dest: 'extension/background.js' },
  { src: 'public/novel-studio-tampermonkey.user.src.js', dest: 'public/novel-studio-tampermonkey.user.js' }
];

files.forEach(file => {
  const srcPath = path.join(process.cwd(), file.src);
  if (!fs.existsSync(srcPath)) {
    console.log(`Source not found: ${file.src}`);
    return;
  }
  
  const code = fs.readFileSync(srcPath, 'utf8');
  const result = obfuscate(code);
  
  fs.writeFileSync(path.join(process.cwd(), file.dest), result);
  console.log(`Successfully obfuscated ${file.src} -> ${file.dest}`);
});
