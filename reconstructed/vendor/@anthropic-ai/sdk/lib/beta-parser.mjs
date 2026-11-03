/**
 * @anthropic-ai/sdk/lib/beta-parser.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (5)
 * attribution: esm-fingerprint 5
 */
import { pr } from "../core/error.mjs";

//@ chunk-hwmsct5x.js:90862-90927 esm-fingerprint
function getOutputFormat(e) {
  return e?.output_format ?? e?.output_config?.format;
}
//@ chunk-hwmsct5x.js:90927-91355 esm-fingerprint
function attachParsedOutput(e, n, r) {
  let s = getOutputFormat(n);
  if (!n || !("parse" in (s ?? {})))
    return {
      ...e,
      content: e.content.map((h) => {
        if (h.type === "text") {
          let defineProperty = Object.defineProperty({ ...h }, "parsed_output", {
            value: null,
            enumerable: !1,
          });
          return Object.defineProperty(defineProperty, "parsed", {
            get() {
              return (
                r.logger.warn(
                  "The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.",
                ),
                null
              );
            },
            enumerable: !1,
          });
        }
        return h;
      }),
      parsed_output: null,
    };
  return parseMessageContent(e, n, r);
}
//@ chunk-hwmsct5x.js:91355-91768 esm-fingerprint
function parseMessageContent(e, n, r) {
  let s = null,
    mapped = e.content.map((y) => {
      if (y.type === "text") {
        let w = parseStructuredOutput(n, y.text);
        if (s === null) s = w;
        let defineProperty = Object.defineProperty({ ...y }, "parsed_output", { value: w, enumerable: !1 });
        return Object.defineProperty(defineProperty, "parsed", {
          get() {
            return (
              r.logger.warn(
                "The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.",
              ),
              w
            );
          },
          enumerable: !1,
        });
      }
      return y;
    });
  return { ...e, content: mapped, parsed_output: s };
}
/**
 * 按 output_format=json_schema 解析文本块为结构化输出（Anthropic SDK 代码）。
 */
//@ chunk-hwmsct5x.js:91768-91960 esm-fingerprint
function parseStructuredOutput(e, n) {
  let r = getOutputFormat(e);
  if (r?.type !== "json_schema") return null;
  try {
    if ("parse" in r) return r.parse(n);
    return JSON.parse(n);
  } catch (error) {
    throw new pr(`Failed to parse structured output: ${error}`);
  }
}
//@ chunk-hwmsct5x.js:118856-119155 esm-fingerprint
function bd(e) {
  if (!e.output_format) return e;
  if (e.output_config?.format)
    throw new pr(
      "Both output_format and output_config.format were provided. Please use only output_config.format (output_format is deprecated).",
    );
  let { output_format: output_format, ...r } = e;
  return { ...r, output_config: { ...e.output_config, format: output_format } };
}

export { attachParsedOutput, bd, parseMessageContent };
