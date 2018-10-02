const fs = require('fs-extra');
const concat = require('concat');

(async function build() {
  const files = [
    './dist/air/runtime.js',
    './dist/air/polyfills.js',
    './dist/air/scripts.js',
    './dist/air/main.js'
  ];

  await fs.ensureDir('elements');
  await concat(files, 'elements/login-element.js');
  // await fs.copyFile(
  //   './dist/air/styles.css',
  //   'elements/login-element.styles.css'
  // );
})();
