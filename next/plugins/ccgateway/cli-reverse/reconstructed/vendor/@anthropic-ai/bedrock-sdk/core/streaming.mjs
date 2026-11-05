/**
 * @anthropic-ai/bedrock-sdk/core/streaming.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-b8zxeazh.js (2)
 * attribution: esm-fingerprint 2
 */
import { de_ResponseStream } from "../AWS_restJson1.js";
import { ReadableStreamToAsyncIterable, ReadableStreamFrom } from "../internal/shims.mjs";
import { getMinimalSerdeContext, toUtf8, fromUtf8 } from "./streaming.js";
import { tryParseJson } from "../AWS_restJson1.mjs";
import { AnthropicError } from "../../sdk/core/error.mjs";
import { is_buffer } from "../internal/qs/utils.js";
import { BedrockRuntimeServiceException } from "../../../@aws-sdk/client-bedrock-runtime/dist-cjs/index.js";
import { isAbortError } from "../internal/errors.mjs";

//@ chunk-b8zxeazh.js:7144-7853 esm-fingerprint
function eventStreamToSSEResponse(response) {
  let body = response.body;
  if (!body) return response;
  async function* sseFrames() {
    let eventStream = de_ResponseStream(ReadableStreamToAsyncIterable(body), getMinimalSerdeContext());
    try {
      for await (let event of eventStream)
        if (event.chunk && event.chunk.bytes) {
          let data = toUtf8(event.chunk.bytes);
          let parsed = tryParseJson(data);
          if (parsed === undefined)
            throw new AnthropicError(`Could not parse a Bedrock chunk into JSON: ${data}`);
          let eventName = is_buffer(parsed) && typeof parsed.type === "string" ? parsed.type : null;
          if (eventName != null)
            yield fromUtf8(`event: ${eventName}
data: ${JSON.stringify(parsed)}

`);
        }
    } catch (err) {
      let error = frameError(err);
      if (!error) throw err;
      yield fromUtf8(`event: error
data: ${JSON.stringify({
        type: "error",
        error,
      })}

`);
    }
  }
  let headers = new Headers(response.headers);
  headers.set("content-type", "text/event-stream; charset=utf-8");
  headers.delete("content-length");
  let normalized = new Response(ReadableStreamFrom(sseFrames()), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  Object.defineProperty(normalized, "url", {
    value: response.url,
  });
  return normalized;
}
//@ chunk-b8zxeazh.js:7853-8101 esm-fingerprint
function frameError(err) {
  if (err instanceof BedrockRuntimeServiceException)
    return {
      type: err.name.charAt(0).toLowerCase() + err.name.slice(1),
      message: err.message,
    };
  if (
    err instanceof Error &&
    Object.getPrototypeOf(err) === Error.prototype &&
    err.name !== "Error" &&
    !isAbortError(err)
  )
    return {
      type: err.name,
      message: err.message,
    };
  return;
}
export { eventStreamToSSEResponse };
