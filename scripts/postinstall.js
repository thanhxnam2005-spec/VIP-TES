const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '../node_modules/jieba-wasm/pkg/web/jieba_rs_wasm_bg.wasm');
const destDir = path.join(__dirname, '../public/wasm');
const dest = path.join(destDir, 'jieba_rs_wasm_bg.wasm');

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`Created directory: ${destDir}`);
  }

  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log(`Copied ${source} to ${dest}`);
  } else {
    console.warn(`Source file not found: ${source}`);
  }
} catch (err) {
  console.error(`Error during postinstall: ${err.message}`);
  // Don't exit with 1 to avoid breaking the whole install if this fails
}
