'use strict';
module.exports = { join: (...p) => p.join('/').replace(/\/+/g, '/'), dirname: p => p.replace(/\/[^/]*$/, '') || '/' };
