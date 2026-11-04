/**
 * @anthropic-ai/bedrock-sdk/internal/headers.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-e7naa6k8.js (3), chunk-h87x8cg3.js (3), chunk-qhhcfyds.js (4)
 * attribution: esm-fingerprint 6, esm-layout 4
 */
import { has_default } from "./qs/utils.js";
import { isArray_default } from "./utils/values.mjs";

//@ chunk-h87x8cg3.js:8288-8337 esm-fingerprint
var brand_privateNullableHeaders = Symbol.for("brand.privateNullableHeaders");
//@ chunk-h87x8cg3.js:8337-8767 esm-fingerprint
function* iterateHeaders_3(headers) {
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
  else if (has_default(headers)) iter = headers;
  else {
    shouldClear = true;
    iter = Object.entries(headers ?? {});
  }
  for (let row of iter) {
    let name = row[0];
    if (typeof name !== "string") throw TypeError("expected header name to be a string");
    let values = has_default(row[1]) ? row[1] : [row[1]];
    let didClear = false;
    for (let value of values) {
      if (value === undefined) continue;
      if (shouldClear && !didClear) {
        didClear = true;
        yield [name, clearSentinel_2];
      }
      yield [name, value];
    }
  }
}
//@ chunk-h87x8cg3.js:8767-9374 esm-layout
var clearSentinel_2 = Symbol("clear");
var APPEND_HEADERS_2 = new Set(["x-stainless-helper"]);
var appendHeaderValue_2 = (existing, addition) => {
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
var buildHeaders_2 = (newHeaders) => {
  let targetHeaders = new Headers();
  let nullHeaders = new Set();
  for (let headers of newHeaders) {
    let seenHeaders = new Set();
    for (let [name, value] of iterateHeaders_3(headers)) {
      let lowerName = name.toLowerCase();
      if (APPEND_HEADERS_2.has(lowerName)) {
        if (value === clearSentinel_2) continue;
        if (value === null) {
          targetHeaders.delete(name);
          nullHeaders.add(lowerName);
        } else {
          targetHeaders.set(name, appendHeaderValue_2(targetHeaders.get(name), value));
          nullHeaders.delete(lowerName);
        }
        continue;
      }
      if (value === clearSentinel_2 || !seenHeaders.has(lowerName)) {
        targetHeaders.delete(name);
        seenHeaders.add(lowerName);
        if (value === clearSentinel_2) continue;
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
//@ chunk-qhhcfyds.js:670-708 esm-layout
var iterateHeaders = (headers) => {
  iterateHeaders = Array.isArray;
  return iterateHeaders(headers);
};
var nulls = iterateHeaders;
//@ chunk-qhhcfyds.js:708-757 esm-fingerprint
var brand_privateNullableHeaders_3 = Symbol.for("brand.privateNullableHeaders");
//@ chunk-qhhcfyds.js:757-1186 esm-fingerprint
function* iterateHeaders_4(headers) {
  if (!headers) return;
  if (brand_privateNullableHeaders_3 in headers) {
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
        yield [name, clearSentinel_3];
      }
      yield [name, value];
    }
  }
}
//@ chunk-qhhcfyds.js:1186-1788 esm-layout
var clearSentinel_3 = Symbol("clear");
var APPEND_HEADERS_3 = new Set(["x-stainless-helper"]);
var appendHeaderValue_3 = (existing, addition) => {
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
var buildHeaders_3 = (newHeaders) => {
  let targetHeaders = new Headers();
  let nullHeaders = new Set();
  for (let headers of newHeaders) {
    let seenHeaders = new Set();
    for (let [name, value] of iterateHeaders_4(headers)) {
      let lowerName = name.toLowerCase();
      if (APPEND_HEADERS_3.has(lowerName)) {
        if (value === clearSentinel_3) continue;
        if (value === null) {
          targetHeaders.delete(name);
          nullHeaders.add(lowerName);
        } else {
          targetHeaders.set(name, appendHeaderValue_3(targetHeaders.get(name), value));
          nullHeaders.delete(lowerName);
        }
        continue;
      }
      if (value === clearSentinel_3 || !seenHeaders.has(lowerName)) {
        targetHeaders.delete(name);
        seenHeaders.add(lowerName);
        if (value === clearSentinel_3) continue;
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
    [brand_privateNullableHeaders_3]: true,
    values: targetHeaders,
    nulls: nullHeaders,
  };
};
//@ chunk-e7naa6k8.js:453-502 esm-fingerprint
var brand_privateNullableHeaders_2 = Symbol.for("brand.privateNullableHeaders");
//@ chunk-e7naa6k8.js:502-931 esm-fingerprint
function* iterateHeaders_2(headers) {
  if (!headers) return;
  if (brand_privateNullableHeaders_2 in headers) {
    let { values, nulls } = headers;
    yield* values.entries();
    for (let name of nulls) yield [name, null];
    return;
  }
  let shouldClear = false;
  let iter;
  if (headers instanceof Headers) iter = headers.entries();
  else if (isArray_default(headers)) iter = headers;
  else {
    shouldClear = true;
    iter = Object.entries(headers ?? {});
  }
  for (let row of iter) {
    let name = row[0];
    if (typeof name !== "string") throw TypeError("expected header name to be a string");
    let values = isArray_default(row[1]) ? row[1] : [row[1]];
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
//@ chunk-e7naa6k8.js:931-1533 esm-layout
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
    [brand_privateNullableHeaders_2]: true,
    values: targetHeaders,
    nulls: nullHeaders,
  };
};
export { buildHeaders, buildHeaders_2, buildHeaders_3 };
