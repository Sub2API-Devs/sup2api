/**
 * @opentelemetry/otlp-transformer/build/esm/common/internal.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-a3r2kq46.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-a3r2kq46.js:25971-26046 esm-fingerprint
function findAttributeValue(attributes, key) {
  for (let attribute of attributes ?? [])
    if (attribute.key === key) return attributeValueToString(attribute.value);
  return;
}
//@ chunk-a3r2kq46.js:26046-26319 esm-fingerprint
function attributeValueToString(value) {
  if (value === undefined) return;
  if (typeof value.stringValue === "string") return value.stringValue;
  if (value.intValue !== undefined) return String(value.intValue);
  if (typeof value.doubleValue === "number") return String(value.doubleValue);
  if (typeof value.boolValue === "boolean") return String(value.boolValue);
  return;
}
export { findAttributeValue, attributeValueToString };
