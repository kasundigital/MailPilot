import fs from 'node:fs';

export function patchServer() {
  const original = fs.readFileSync('./src/server.js', 'utf8');
  if (original.includes('await app.listen')) {
    const patched = original.replace(
      /await app\.listen\(\{port:3088,host:'0\.0\.0\.0'\}\);/g,
      'export { app };'
    );
    fs.writeFileSync('./src/server.js', patched);
    return original;
  }
  return null;
}

export function restoreServer(original) {
  if (original) {
    fs.writeFileSync('./src/server.js', original);
  }
}
