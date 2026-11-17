/* Uploaded files in the browser demo are kept in memory as blob URLs. */
'use strict';
const files = new Map();
module.exports = {
  mkdirSync() {},
  writeFileSync(p, buf) { files.set(p, buf); },
  readFileSync(p) { return files.get(p); },
  createReadStream() { throw new Error('Not available in the browser demo'); },
  __files: files,
};
