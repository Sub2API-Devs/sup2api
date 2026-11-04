/**
 * @anthropic-ai/sdk/lib/parser.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (4)
 * attribution: esm-fingerprint 4
 */
import { AnthropicError } from "../core/error.mjs";

//@ chunk-hwmsct5x.js:146814-146861 esm-fingerprint
function getOutputFormat_3(params) {
  return params?.output_config?.format;
}
//@ chunk-hwmsct5x.js:146861-147106 esm-fingerprint
function maybeParseMessage(message, params, opts) {
  let outputFormat = getOutputFormat_3(params);
  if (!params || !("parse" in (outputFormat ?? {})))
    return {
      ...message,
      content: message.content.map((block) => {
        if (block.type === "text")
          return Object.defineProperty(
            {
              ...block,
            },
            "parsed_output",
            {
              value: null,
              enumerable: false,
            },
          );
        return block;
      }),
      parsed_output: null,
    };
  return parseMessage(message, params, opts);
}
//@ chunk-hwmsct5x.js:147106-147340 esm-fingerprint
function parseMessage(message, params, opts) {
  let firstParsedOutput = null;
  let content = message.content.map((block) => {
    if (block.type === "text") {
      let parsedOutput = parseOutputFormat(params, block.text);
      if (firstParsedOutput === null) firstParsedOutput = parsedOutput;
      return Object.defineProperty(
        {
          ...block,
        },
        "parsed_output",
        {
          value: parsedOutput,
          enumerable: false,
        },
      );
    }
    return block;
  });
  return {
    ...message,
    content,
    parsed_output: firstParsedOutput,
  };
}
//@ chunk-hwmsct5x.js:147340-147532 esm-fingerprint
function parseOutputFormat(params, content) {
  let outputFormat = getOutputFormat_3(params);
  if (outputFormat?.type !== "json_schema") return null;
  try {
    if ("parse" in outputFormat) return outputFormat.parse(content);
    return JSON.parse(content);
  } catch (error) {
    throw new AnthropicError(`Failed to parse structured output: ${error}`);
  }
}
export { maybeParseMessage, parseMessage };
