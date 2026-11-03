/**
 * @anthropic-ai/sdk/internal/stainless-helper-header.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (7)
 * attribution: esm-fingerprint 3, esm-layout 4
 */
//@ chunk-hwmsct5x.js:49398-49457 esm-fingerprint
var X_STAINLESS_HELPER = "x-stainless-helper";
var STAINLESS_HELPER_METHOD_HEADER = "x-stainless-helper-method";
//@ chunk-hwmsct5x.js:49457-49505 esm-layout
function wr(e) {
  return {
    ["x-stainless-helper"]: e,
  };
}
//@ chunk-hwmsct5x.js:49505-49552 esm-fingerprint
var SDK_HELPER_SYMBOL = Symbol("anthropic.sdk.stainlessHelper");
//@ chunk-hwmsct5x.js:49552-49613 esm-layout
function wasCreatedByStainlessHelper(value) {
  return typeof value === "object" && value !== null && SDK_HELPER_SYMBOL in value;
}
//@ chunk-hwmsct5x.js:49613-49874 esm-fingerprint
function collectStainlessHelpers(tools, messages) {
  let helpers = new Set();
  if (tools) {
    for (let tool of tools) if (wasCreatedByStainlessHelper(tool)) helpers.add(tool[SDK_HELPER_SYMBOL]);
  }
  if (messages)
    for (let message of messages) {
      if (wasCreatedByStainlessHelper(message)) helpers.add(message[SDK_HELPER_SYMBOL]);
      let content = message.content;
      if (Array.isArray(content))
        for (let block of content) {
          if (wasCreatedByStainlessHelper(block)) helpers.add(block[SDK_HELPER_SYMBOL]);
          let definition = block?.tool?.definition;
          if (wasCreatedByStainlessHelper(definition)) helpers.add(definition[SDK_HELPER_SYMBOL]);
        }
    }
  return Array.from(helpers);
}
//@ chunk-hwmsct5x.js:49874-49974 esm-layout
function stainlessHelperHeader(tools, messages) {
  let helpers = collectStainlessHelpers(tools, messages);
  if (helpers.length === 0) return {};
  return {
    ["x-stainless-helper"]: helpers.join(", "),
  };
}
//@ chunk-hwmsct5x.js:49974-50044 esm-layout
function is(file) {
  if (wasCreatedByStainlessHelper(file))
    return {
      ["x-stainless-helper"]: file[SDK_HELPER_SYMBOL],
    };
  return {};
}
export {
  is,
  X_STAINLESS_HELPER,
  wr,
  STAINLESS_HELPER_METHOD_HEADER,
  collectStainlessHelpers,
  stainlessHelperHeader,
};
