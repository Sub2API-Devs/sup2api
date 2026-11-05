/**
 * @anthropic-ai/sdk/internal/qs/formats.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
//@ chunk-vn3g7zt8.js:19454-19561 esm-fingerprint
var default_format = "RFC3986";
var default_formatter = (v) => String(v);
var formatters = {
  RFC1738: (v) => String(v).replace(/%20/g, "+"),
  RFC3986: default_formatter,
};
var RFC1738 = "RFC1738";
export { RFC1738, default_format, default_formatter, formatters };
