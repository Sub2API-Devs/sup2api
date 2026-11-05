/**
 * @anthropic-ai/sdk/internal/stainless-helper-header.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (7)
 * attribution: esm-fingerprint 3, esm-layout 4
 */
//@ chunk-vn3g7zt8.js:49769-49828 esm-fingerprint
var X_STAINLESS_HELPER = "x-stainless-helper";
var STAINLESS_HELPER_METHOD_HEADER = "x-stainless-helper-method";
//@ chunk-vn3g7zt8.js:49828-49876 esm-layout
function stainlessHelperHeader(method) {
  return {
    ["x-stainless-helper"]: method,
  };
}
//@ chunk-vn3g7zt8.js:49876-49923 esm-fingerprint
var SDK_HELPER_SYMBOL = Symbol("anthropic.sdk.stainlessHelper");
//@ chunk-vn3g7zt8.js:49923-49984 esm-layout
function wasCreatedByStainlessHelper(value) {
  return typeof value === "object" && value !== null && SDK_HELPER_SYMBOL in value;
}
//@ chunk-vn3g7zt8.js:49984-50245 esm-fingerprint
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
//@ chunk-vn3g7zt8.js:50245-50345 esm-layout
function stainlessHelperHeader_2(tools, messages) {
  let helpers = collectStainlessHelpers(tools, messages);
  if (helpers.length === 0) return {};
  return {
    ["x-stainless-helper"]: helpers.join(", "),
  };
}
//@ chunk-vn3g7zt8.js:50345-50415 esm-layout
function stainlessHelperHeaders(file) {
  if (wasCreatedByStainlessHelper(file))
    return {
      ["x-stainless-helper"]: file[SDK_HELPER_SYMBOL],
    };
  return {};
}
export {
  stainlessHelperHeaders,
  X_STAINLESS_HELPER,
  stainlessHelperHeader,
  STAINLESS_HELPER_METHOD_HEADER,
  collectStainlessHelpers,
  stainlessHelperHeader_2,
};
