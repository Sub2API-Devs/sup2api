/**
 * @typespec/ts-http-runtime/dist/esm/httpHeaders.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */

//@ chunk-b5df2wx1.js:30140-30178 esm-layout
function normalizeName(name) {
  return name.toLowerCase();
}
//@ chunk-b5df2wx1.js:30178-30239 esm-fingerprint
function* headerIterator(map) {
  for (let entry of map.values()) yield [entry.name, entry.value];
}
//@ chunk-b5df2wx1.js:30239-30845 esm-fingerprint
class HttpHeadersImpl {
  constructor(rawHeaders) {
    this._headersMap = new Map();
    if (rawHeaders)
      for (let headerName of Object.keys(rawHeaders)) this.set(headerName, rawHeaders[headerName]);
  }
  set(name, value) {
    this._headersMap.set(normalizeName(name), {
      name,
      value: String(value).trim(),
    });
  }
  get(name) {
    var _a;
    return (_a = this._headersMap.get(normalizeName(name))) === null || _a === undefined
      ? undefined
      : _a.value;
  }
  has(name) {
    return this._headersMap.has(normalizeName(name));
  }
  delete(name) {
    this._headersMap.delete(normalizeName(name));
  }
  toJSON(options = {}) {
    let result = {};
    if (options.preserveCase) for (let entry of this._headersMap.values()) result[entry.name] = entry.value;
    else for (let [normalizedName, entry] of this._headersMap) result[normalizedName] = entry.value;
    return result;
  }
  toString() {
    return JSON.stringify(
      this.toJSON({
        preserveCase: true,
      }),
    );
  }
  [Symbol.iterator]() {
    return headerIterator(this._headersMap);
  }
}
export { HttpHeadersImpl };
