/* Makes Buffer available like in Node, adding the 'base64url' encoding the server uses for ids and tokens. */
const { Buffer } = require('buffer');
const toString = Buffer.prototype.toString;
Buffer.prototype.toString = function (enc, ...rest) {
  if (enc === 'base64url') return toString.call(this, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return toString.call(this, enc, ...rest);
};
const from = Buffer.from;
Buffer.from = function (v, enc, ...rest) {
  if (enc === 'base64url' && typeof v === 'string') return from.call(Buffer, v.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return from.call(Buffer, v, enc, ...rest);
};
export { Buffer };
