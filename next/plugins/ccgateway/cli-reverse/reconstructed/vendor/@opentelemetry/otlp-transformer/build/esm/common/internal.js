/**
 * @opentelemetry/otlp-transformer/build/esm/common/internal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-3nztfxrw.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-3nztfxrw.js:25317-25392 esm-fingerprint
function findAttributeValue(attributes, key) {
  for (let attribute of attributes ?? [])
    if (attribute.key === key) return attributeValueToString(attribute.value);
  return;
}
//@ chunk-3nztfxrw.js:25392-25665 esm-fingerprint
function attributeValueToString(value) {
  if (value === undefined) return;
  if (typeof value.stringValue === "string") return value.stringValue;
  if (value.intValue !== undefined) return String(value.intValue);
  if (typeof value.doubleValue === "number") return String(value.doubleValue);
  if (typeof value.boolValue === "boolean") return String(value.boolValue);
  return;
}
export { findAttributeValue, attributeValueToString };
