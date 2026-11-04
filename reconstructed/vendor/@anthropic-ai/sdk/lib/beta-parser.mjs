/**
 * @anthropic-ai/sdk/lib/beta-parser.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (5)
 * attribution: esm-fingerprint 5
 */
import { AnthropicError } from "../core/error.mjs";

//@ chunk-hwmsct5x.js:90862-90927 esm-fingerprint
function getOutputFormat_2(params) {
  return params?.output_format ?? params?.output_config?.format;
}
//@ chunk-hwmsct5x.js:90927-91355 esm-fingerprint
function attachParsedOutput(message, params, opts) {
  let outputFormat = getOutputFormat_2(params);
  if (!params || !("parse" in (outputFormat ?? {})))
    return {
      ...message,
      content: message.content.map((block) => {
        if (block.type === "text") {
          let parsedBlock = Object.defineProperty(
            {
              ...block,
            },
            "parsed_output",
            {
              value: null,
              enumerable: false,
            },
          );
          return Object.defineProperty(parsedBlock, "parsed", {
            get() {
              opts.logger.warn(
                "The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.",
              );
              return null;
            },
            enumerable: false,
          });
        }
        return block;
      }),
      parsed_output: null,
    };
  return parseMessageContent(message, params, opts);
}
//@ chunk-hwmsct5x.js:91355-91768 esm-fingerprint
function parseMessageContent(message, params, opts) {
  let firstParsedOutput = null;
  let content = message.content.map((block) => {
    if (block.type === "text") {
      let parsedOutput = parseStructuredOutput(params, block.text);
      if (firstParsedOutput === null) firstParsedOutput = parsedOutput;
      let parsedBlock = Object.defineProperty(
        {
          ...block,
        },
        "parsed_output",
        {
          value: parsedOutput,
          enumerable: false,
        },
      );
      return Object.defineProperty(parsedBlock, "parsed", {
        get() {
          opts.logger.warn(
            "The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.",
          );
          return parsedOutput;
        },
        enumerable: false,
      });
    }
    return block;
  });
  return {
    ...message,
    content,
    parsed_output: firstParsedOutput,
  };
}
//@ chunk-hwmsct5x.js:91768-91960 esm-fingerprint
/**
 * 按 output_format=json_schema 解析文本块为结构化输出（Anthropic SDK 代码）。
 */
function parseStructuredOutput(params, content) {
  let outputFormat = getOutputFormat_2(params);
  if (outputFormat?.type !== "json_schema") return null;
  try {
    if ("parse" in outputFormat) return outputFormat.parse(content);
    return JSON.parse(content);
  } catch (error) {
    throw new AnthropicError(`Failed to parse structured output: ${error}`);
  }
}
//@ chunk-hwmsct5x.js:118856-119155 esm-fingerprint
function getOutputFormat(params) {
  if (!params.output_format) return params;
  if (params.output_config?.format)
    throw new AnthropicError(
      "Both output_format and output_config.format were provided. Please use only output_config.format (output_format is deprecated).",
    );
  let { output_format: outputFormat, ...rest } = params;
  return {
    ...rest,
    output_config: {
      ...params.output_config,
      format: outputFormat,
    },
  };
}
export { attachParsedOutput, getOutputFormat, parseMessageContent };
