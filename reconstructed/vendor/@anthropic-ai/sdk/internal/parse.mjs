/**
 * @anthropic-ai/sdk/internal/parse.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { AnthropicError } from "../core/error.mjs";
import { ReadableStreamToAsyncIterable } from "./shims.mjs";
import { encodeUTF8 } from "./utils/bytes.mjs";
import { loggerFor, debugLogRequestDetails } from "./utils/log.mjs";
import { Stream } from "../core/streaming.mjs";
import { releaseAbortListener } from "./request-signal.mjs";

//@ chunk-hwmsct5x.js:32502-33815 esm-layout
async function* iterateSseEvents(response, controller) {
  if (!response.body) {
    controller.abort();
    if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative")
      throw new AnthropicError(
        "The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api",
      );
    throw new AnthropicError("Attempted to iterate over a response with no body");
  }
  let textDecoder = new TextDecoder("utf-8", {
    ignoreBOM: true,
  });
  let buffer = "";
  let eventName = null;
  let dataLines = [];
  let rawLines = [];
  let parseLine = (line) => {
    if (line.charCodeAt(0) === 65279) line = line.slice(1);
    if (!line) {
      if (!eventName && !dataLines.length) return null;
      let event = {
        event: eventName,
        data: dataLines.join(`
`),
        raw: rawLines,
      };
      eventName = null;
      dataLines = [];
      rawLines = [];
      return event;
    }
    rawLines.push(line);
    let index = line.indexOf(":");
    if (index === 0) return null;
    let field = index === -1 ? line : line.slice(0, index);
    if (field !== "event" && field !== "data") return null;
    let value = index === -1 ? "" : line.slice(line.charCodeAt(index + 1) === 32 ? index + 2 : index + 1);
    if (field === "event") eventName = value;
    else dataLines.push(value);
    return null;
  };
  for await (let chunk of ReadableStreamToAsyncIterable(response.body)) {
    if (chunk == null) continue;
    buffer += textDecoder.decode(typeof chunk === "string" ? encodeUTF8(chunk) : chunk, {
      stream: true,
    });
    let cursor = 0;
    if (!buffer.includes("\r")) {
      let newlineIndex;
      while (
        (newlineIndex = buffer.indexOf(
          `
`,
          cursor,
        )) !== -1
      ) {
        let event = parseLine(buffer.slice(cursor, newlineIndex));
        cursor = newlineIndex + 1;
        if (event) yield event;
      }
    } else
      for (let j = 0; j < buffer.length; j++) {
        let char = buffer[j];
        if (
          char !==
            `
` &&
          char !== "\r"
        )
          continue;
        if (char === "\r" && j + 1 === buffer.length) break;
        let event = parseLine(buffer.slice(cursor, j));
        if (
          char === "\r" &&
          buffer[j + 1] ===
            `
`
        )
          j++;
        cursor = j + 1;
        if (event) yield event;
      }
    buffer = buffer.slice(cursor);
  }
  buffer += textDecoder.decode();
  if (buffer)
    for (let line of buffer.replace(/\r$/, "").split(/\r\n|[\n\r]/)) {
      let event = parseLine(line);
      if (event) yield event;
    }
}
//@ chunk-hwmsct5x.js:33815-34546 esm-fingerprint
async function defaultParseResponse(client, props) {
  let { response, requestLogID, retryOfRequestLogID, startTime } = props;
  let parsed = await (async () => {
    if (props.options.stream) {
      loggerFor(client).debug("response", response.status, response.url, response.headers, response.body);
      return Stream.fromSSEResponse(response, props.controller, client);
    }
    if (response.status === 204) return null;
    if (props.options.__binaryResponse) return response;
    let trimmed = response.headers.get("content-type")?.split(";")[0]?.trim();
    if (trimmed?.includes("application/json") || trimmed?.endsWith("+json")) {
      if (response.headers.get("content-length") === "0") return;
      let body = await response.json();
      return addResponseIDs(body, response);
    }
    return await response.text();
  })().finally(() => {
    if (!props.options.stream && !props.options.__binaryResponse) releaseAbortListener(props.controller);
  });
  debugLogRequestDetails(loggerFor(client), `[${requestLogID}] response parsed`, {
    retryOfRequestLogID,
    url: response.url,
    status: response.status,
    body: parsed,
    durationMs: Date.now() - startTime,
  });
  return parsed;
}
//@ chunk-hwmsct5x.js:34546-34791 esm-fingerprint
function addResponseIDs(value, response) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.defineProperties(value, {
    _request_id: {
      value: response.headers.get("request-id"),
      enumerable: false,
    },
    _workspace_id: {
      value: response.headers.get("anthropic-workspace-id"),
      enumerable: false,
    },
  });
}
export { iterateSseEvents, addResponseIDs, defaultParseResponse };
