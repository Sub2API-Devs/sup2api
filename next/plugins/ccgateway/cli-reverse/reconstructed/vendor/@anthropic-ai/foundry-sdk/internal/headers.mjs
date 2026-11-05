/**
 * @anthropic-ai/foundry-sdk/internal/headers.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/foundry-sdk@0.4.1..0.5.4
 * pieces: chunk-5g2k022m.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5g2k022m.js:308-346 esm-layout
var iterateHeaders = (headers) => {
  iterateHeaders = Array.isArray;
  return iterateHeaders(headers);
};
var nulls = iterateHeaders;
//@ chunk-5g2k022m.js:346-395 esm-fingerprint
var brand_privateNullableHeaders = Symbol.for("brand.privateNullableHeaders");
//@ chunk-5g2k022m.js:395-824 esm-fingerprint
function* iterateHeaders_2(headers) {
  if (!headers) return;
  if (brand_privateNullableHeaders in headers) {
    let { values, nulls } = headers;
    yield* values.entries();
    for (let name of nulls) yield [name, null];
    return;
  }
  let shouldClear = false;
  let iter;
  if (headers instanceof Headers) iter = headers.entries();
  else if (nulls(headers)) iter = headers;
  else {
    shouldClear = true;
    iter = Object.entries(headers ?? {});
  }
  for (let row of iter) {
    let name = row[0];
    if (typeof name !== "string") throw TypeError("expected header name to be a string");
    let values = nulls(row[1]) ? row[1] : [row[1]];
    let didClear = false;
    for (let value of values) {
      if (value === undefined) continue;
      if (shouldClear && !didClear) {
        didClear = true;
        yield [name, clearSentinel];
      }
      yield [name, value];
    }
  }
}
//@ chunk-5g2k022m.js:824-1426 esm-layout
var clearSentinel = Symbol("clear");
var APPEND_HEADERS = new Set(["x-stainless-helper"]);
var appendHeaderValue = (existing, addition) => {
  let tokens = existing
    ? existing
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  for (let tok of addition.split(",").map((t) => t.trim()))
    if (tok && !tokens.includes(tok)) tokens.push(tok);
  return tokens.join(", ");
};
var buildHeaders = (newHeaders) => {
  let targetHeaders = new Headers();
  let nullHeaders = new Set();
  for (let headers of newHeaders) {
    let seenHeaders = new Set();
    for (let [name, value] of iterateHeaders_2(headers)) {
      let lowerName = name.toLowerCase();
      if (APPEND_HEADERS.has(lowerName)) {
        if (value === clearSentinel) continue;
        if (value === null) {
          targetHeaders.delete(name);
          nullHeaders.add(lowerName);
        } else {
          targetHeaders.set(name, appendHeaderValue(targetHeaders.get(name), value));
          nullHeaders.delete(lowerName);
        }
        continue;
      }
      if (value === clearSentinel || !seenHeaders.has(lowerName)) {
        targetHeaders.delete(name);
        seenHeaders.add(lowerName);
        if (value === clearSentinel) continue;
      }
      if (value === null) {
        targetHeaders.delete(name);
        nullHeaders.add(lowerName);
      } else {
        targetHeaders.append(name, value);
        nullHeaders.delete(lowerName);
      }
    }
  }
  return {
    [brand_privateNullableHeaders]: true,
    values: targetHeaders,
    nulls: nullHeaders,
  };
};
export { buildHeaders };
