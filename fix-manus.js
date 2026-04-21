const fs = require('fs');

const pkgPath = 'account-opening-system/package.json';
let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
delete pkg.devDependencies['vite-plugin-manus-runtime'];
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

console.log('Removed from package.json');
