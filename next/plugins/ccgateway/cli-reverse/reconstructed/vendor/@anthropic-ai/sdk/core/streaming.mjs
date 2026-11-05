/**
 * @anthropic-ai/sdk/core/streaming.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-layout 1
 */
import { __classPrivateFieldSet, __classPrivateFieldGet } from "../internal/tslib.mjs";
import { iterateSseEvents } from "../internal/parse.mjs";
import { loggerFor } from "../internal/utils/log.mjs";
import { AnthropicError, APIError } from "./error.mjs";
import { safeJSON } from "../internal/utils/values.mjs";
import { isAbortError_2 } from "../internal/errors.mjs";
import { releaseAbortListener } from "../internal/request-signal.mjs";
import { LineDecoder } from "../internal/decoders/line.mjs";
import { ReadableStreamToAsyncIterable, makeReadableStream } from "../internal/shims.mjs";
import { encodeUTF8 } from "../internal/utils/bytes.mjs";

//@ chunk-vn3g7zt8.js:29348-32873 esm-layout
var _Stream_client;
var Stream = (() => {
  class Stream {
    constructor(iterator, controller, client) {
      this.iterator = iterator;
      _Stream_client.set(this, undefined);
      this.controller = controller;
      __classPrivateFieldSet(this, _Stream_client, client, "f");
    }
    static rawEvents(response, controller = new AbortController()) {
      return iterateSseEvents(response, controller);
    }
    static fromSSEResponse(response, controller, client) {
      let consumed = false;
      let logger = client ? loggerFor(client) : console;
      async function* iterator() {
        if (consumed)
          throw new AnthropicError(
            "Cannot iterate over a consumed stream, use `.tee()` to split the stream.",
          );
        consumed = true;
        let done = false;
        try {
          for await (let sse of iterateSseEvents(response, controller)) {
            if (sse.event === "completion")
              try {
                yield JSON.parse(sse.data);
              } catch (e) {
                logger.error("Could not parse message into JSON:", sse.data);
                logger.error("From chunk:", sse.raw);
                throw e;
              }
            if (
              sse.event === "message_start" ||
              sse.event === "message_delta" ||
              sse.event === "message_stop" ||
              sse.event === "content_block_start" ||
              sse.event === "content_block_delta" ||
              sse.event === "content_block_stop" ||
              sse.event === "message" ||
              sse.event === "user.message" ||
              sse.event === "user.interrupt" ||
              sse.event === "user.tool_confirmation" ||
              sse.event === "user.custom_tool_result" ||
              sse.event === "user.tool_result" ||
              sse.event === "agent.message" ||
              sse.event === "agent.thinking" ||
              sse.event === "agent.tool_use" ||
              sse.event === "agent.tool_result" ||
              sse.event === "agent.mcp_tool_use" ||
              sse.event === "agent.mcp_tool_result" ||
              sse.event === "agent.custom_tool_use" ||
              sse.event === "agent.thread_context_compacted" ||
              sse.event === "session.status_running" ||
              sse.event === "session.status_idle" ||
              sse.event === "session.status_rescheduled" ||
              sse.event === "session.status_terminated" ||
              sse.event === "session.error" ||
              sse.event === "session.deleted" ||
              sse.event === "session.updated" ||
              sse.event === "span.model_request_start" ||
              sse.event === "span.model_request_end" ||
              sse.event === "span.outcome_evaluation_start" ||
              sse.event === "span.outcome_evaluation_ongoing" ||
              sse.event === "span.outcome_evaluation_end" ||
              sse.event === "user.define_outcome" ||
              sse.event === "agent.thread_message_received" ||
              sse.event === "agent.thread_message_sent" ||
              sse.event === "agent.session_thread_message_received" ||
              sse.event === "agent.session_thread_message_sent" ||
              sse.event === "session.thread_created" ||
              sse.event === "session.thread_status_created" ||
              sse.event === "session.thread_status_running" ||
              sse.event === "session.thread_status_idle" ||
              sse.event === "session.thread_status_rescheduled" ||
              sse.event === "session.thread_status_terminated" ||
              sse.event === "event_start" ||
              sse.event === "event_delta" ||
              sse.event === "system.message"
            )
              try {
                yield JSON.parse(sse.data);
              } catch (e) {
                logger.error("Could not parse message into JSON:", sse.data);
                logger.error("From chunk:", sse.raw);
                throw e;
              }
            if (sse.event === "ping") continue;
            if (sse.event === "error") {
              let body = safeJSON(sse.data) ?? sse.data;
              let type = body?.error?.type;
              throw new APIError(undefined, body, undefined, response.headers, type);
            }
          }
          done = true;
        } catch (e) {
          if (isAbortError_2(e)) return;
          throw e;
        } finally {
          if (!done) controller.abort();
          releaseAbortListener(controller);
        }
      }
      return new Stream(iterator, controller, client);
    }
    static fromReadableStream(readableStream, controller, client) {
      let consumed = false;
      async function* iterLines() {
        let lineDecoder = new LineDecoder();
        let iter = ReadableStreamToAsyncIterable(readableStream);
        for await (let chunk of iter) for (let line of lineDecoder.decode(chunk)) yield line;
        for (let line of lineDecoder.flush()) yield line;
      }
      async function* iterator() {
        if (consumed)
          throw new AnthropicError(
            "Cannot iterate over a consumed stream, use `.tee()` to split the stream.",
          );
        consumed = true;
        let done = false;
        try {
          for await (let line of iterLines()) {
            if (done) continue;
            if (line) yield JSON.parse(line);
          }
          done = true;
        } catch (e) {
          if (isAbortError_2(e)) return;
          throw e;
        } finally {
          if (!done) controller.abort();
          releaseAbortListener(controller);
        }
      }
      return new Stream(iterator, controller, client);
    }
    [((_Stream_client = new WeakMap()), Symbol.asyncIterator)]() {
      return this.iterator();
    }
    tee() {
      let left = [];
      let right = [];
      let iterator = this.iterator();
      let teeIterator = (queue) => ({
        next: () => {
          if (queue.length === 0) {
            let result = iterator.next();
            left.push(result);
            right.push(result);
          }
          return queue.shift();
        },
      });
      return [
        new Stream(
          () => teeIterator(left),
          this.controller,
          __classPrivateFieldGet(this, _Stream_client, "f"),
        ),
        new Stream(
          () => teeIterator(right),
          this.controller,
          __classPrivateFieldGet(this, _Stream_client, "f"),
        ),
      ];
    }
    toReadableStream() {
      let stream = this;
      let iter;
      return makeReadableStream({
        async start() {
          iter = stream[Symbol.asyncIterator]();
        },
        async pull(ctrl) {
          try {
            let { value, done } = await iter.next();
            if (done) return ctrl.close();
            let bytes = encodeUTF8(
              JSON.stringify(value) +
                `
`,
            );
            ctrl.enqueue(bytes);
          } catch (err) {
            ctrl.error(err);
          }
        },
        async cancel() {
          await iter.return?.();
        },
      });
    }
  }
  return Stream;
})();
export { Stream };
