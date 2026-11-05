/**
 * @anthropic-ai/sdk/lib/BetaMessageStream.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { __classPrivateFieldSet, __classPrivateFieldGet } from "../internal/tslib.mjs";
import { isAbortError_2 } from "../internal/errors.mjs";
import { APIUserAbortError, AnthropicError } from "../core/error.mjs";
import { STAINLESS_HELPER_METHOD_HEADER } from "../internal/stainless-helper-header.mjs";
import { Stream } from "../core/streaming.mjs";
import { sleepWithAbort } from "../tools/agent-toolset/memories.mjs";
import { attachParsedOutput } from "./beta-parser.mjs";
import { JSON_BUF_PROPERTY, withLazyInput } from "../internal/message-stream-utils.mjs";

//@ chunk-vn3g7zt8.js:94777-94859 esm-layout
var _BetaMessageStream_instances;
var _BetaMessageStream_currentMessageSnapshot;
var _BetaMessageStream_params;
var _BetaMessageStream_connectedPromise;
var _BetaMessageStream_resolveConnectedPromise;
var _BetaMessageStream_rejectConnectedPromise;
var _BetaMessageStream_endPromise;
var _BetaMessageStream_resolveEndPromise;
var _BetaMessageStream_rejectEndPromise;
var _BetaMessageStream_listeners;
var _BetaMessageStream_ended;
var _BetaMessageStream_errored;
var _BetaMessageStream_aborted;
var _BetaMessageStream_catchingPromiseCreated;
var _BetaMessageStream_response;
var _BetaMessageStream_request_id;
var _BetaMessageStream_workspace_id;
var _BetaMessageStream_logger;
var _BetaMessageStream_getFinalMessage;
var _BetaMessageStream_getFinalText;
var _BetaMessageStream_handleError;
var _BetaMessageStream_beginRequest;
var _BetaMessageStream_addStreamEvent;
var _BetaMessageStream_endRequest;
var _BetaMessageStream_accumulateMessage;
var _BetaMessageStream_toolInputParseError;
//@ chunk-vn3g7zt8.js:94859-94954 esm-fingerprint
function tracksToolInput(content) {
  return content.type === "tool_use" || content.type === "server_tool_use" || content.type === "mcp_tool_use";
}
//@ chunk-vn3g7zt8.js:94954-105205 esm-fingerprint
var BetaMessageStream = (() => {
  class BetaMessageStream {
    constructor(params, opts) {
      _BetaMessageStream_instances.add(this);
      this.messages = [];
      this.receivedMessages = [];
      _BetaMessageStream_currentMessageSnapshot.set(this, undefined);
      _BetaMessageStream_params.set(this, null);
      this.controller = new AbortController();
      _BetaMessageStream_connectedPromise.set(this, undefined);
      _BetaMessageStream_resolveConnectedPromise.set(this, () => {});
      _BetaMessageStream_rejectConnectedPromise.set(this, () => {});
      _BetaMessageStream_endPromise.set(this, undefined);
      _BetaMessageStream_resolveEndPromise.set(this, () => {});
      _BetaMessageStream_rejectEndPromise.set(this, () => {});
      _BetaMessageStream_listeners.set(this, {});
      _BetaMessageStream_ended.set(this, false);
      _BetaMessageStream_errored.set(this, false);
      _BetaMessageStream_aborted.set(this, false);
      _BetaMessageStream_catchingPromiseCreated.set(this, false);
      _BetaMessageStream_response.set(this, undefined);
      _BetaMessageStream_request_id.set(this, undefined);
      _BetaMessageStream_workspace_id.set(this, undefined);
      _BetaMessageStream_logger.set(this, undefined);
      _BetaMessageStream_handleError.set(this, (error) => {
        __classPrivateFieldSet(this, _BetaMessageStream_errored, true, "f");
        if (isAbortError_2(error)) error = new APIUserAbortError();
        if (error instanceof APIUserAbortError) {
          __classPrivateFieldSet(this, _BetaMessageStream_aborted, true, "f");
          return this._emit("abort", error);
        }
        if (error instanceof AnthropicError) return this._emit("error", error);
        if (error instanceof Error) {
          let anthropicError = new AnthropicError(error.message);
          anthropicError.cause = error;
          return this._emit("error", anthropicError);
        }
        return this._emit("error", new AnthropicError(String(error)));
      });
      __classPrivateFieldSet(
        this,
        _BetaMessageStream_connectedPromise,
        new Promise((resolve, reject) => {
          __classPrivateFieldSet(this, _BetaMessageStream_resolveConnectedPromise, resolve, "f");
          __classPrivateFieldSet(this, _BetaMessageStream_rejectConnectedPromise, reject, "f");
        }),
        "f",
      );
      __classPrivateFieldSet(
        this,
        _BetaMessageStream_endPromise,
        new Promise((resolve, reject) => {
          __classPrivateFieldSet(this, _BetaMessageStream_resolveEndPromise, resolve, "f");
          __classPrivateFieldSet(this, _BetaMessageStream_rejectEndPromise, reject, "f");
        }),
        "f",
      );
      __classPrivateFieldGet(this, _BetaMessageStream_connectedPromise, "f").catch(() => {});
      __classPrivateFieldGet(this, _BetaMessageStream_endPromise, "f").catch(() => {});
      __classPrivateFieldSet(this, _BetaMessageStream_params, params, "f");
      __classPrivateFieldSet(this, _BetaMessageStream_logger, opts?.logger ?? console, "f");
    }
    get response() {
      return __classPrivateFieldGet(this, _BetaMessageStream_response, "f");
    }
    get request_id() {
      return __classPrivateFieldGet(this, _BetaMessageStream_request_id, "f");
    }
    get workspace_id() {
      return __classPrivateFieldGet(this, _BetaMessageStream_workspace_id, "f");
    }
    async withResponse() {
      __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
      let response = await __classPrivateFieldGet(this, _BetaMessageStream_connectedPromise, "f");
      if (!response) throw Error("Could not resolve a `Response` object");
      return {
        data: this,
        response,
        request_id: response.headers.get("request-id"),
        workspace_id: response.headers.get("anthropic-workspace-id"),
      };
    }
    static fromReadableStream(stream) {
      let runner = new BetaMessageStream(null);
      runner._run(() => runner._fromReadableStream(stream));
      return runner;
    }
    static createMessage(messages, params, options, { logger } = {}) {
      let runner = new BetaMessageStream(params, {
        logger,
      });
      for (let message of params.messages) runner._addMessageParam(message);
      __classPrivateFieldSet(
        runner,
        _BetaMessageStream_params,
        {
          ...params,
          stream: true,
        },
        "f",
      );
      runner._run(() =>
        runner._createMessage(
          messages,
          {
            ...params,
            stream: true,
          },
          {
            ...options,
            headers: {
              ...options?.headers,
              [STAINLESS_HELPER_METHOD_HEADER]: "stream",
            },
          },
        ),
      );
      return runner;
    }
    _run(executor) {
      executor().then(
        () => {
          this._emitFinal();
          this._emit("end");
        },
        __classPrivateFieldGet(this, _BetaMessageStream_handleError, "f"),
      );
    }
    _addMessageParam(message) {
      this.messages.push(message);
    }
    _addMessage(message, emit = true) {
      this.receivedMessages.push(message);
      if (emit) this._emit("message", message);
    }
    async _createMessage(messages, params, options) {
      let signal = options?.signal;
      let abortHandler;
      if (signal) {
        if (signal.aborted) this.controller.abort();
        abortHandler = this.controller.abort.bind(this.controller);
        signal.addEventListener("abort", abortHandler);
      }
      try {
        __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(
          this,
        );
        let { response, data: stream } = await messages
          .create(
            {
              ...params,
              stream: true,
            },
            {
              ...options,
              signal: this.controller.signal,
            },
          )
          .withResponse();
        this._connected(response);
        for await (let event of stream)
          __classPrivateFieldGet(
            this,
            _BetaMessageStream_instances,
            "m",
            _BetaMessageStream_addStreamEvent,
          ).call(this, event);
        if (stream.controller.signal?.aborted) throw new APIUserAbortError();
        __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(
          this,
        );
      } finally {
        if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
      }
    }
    _connected(response) {
      if (this.ended) return;
      __classPrivateFieldSet(this, _BetaMessageStream_response, response, "f");
      __classPrivateFieldSet(this, _BetaMessageStream_request_id, response?.headers.get("request-id"), "f");
      __classPrivateFieldSet(
        this,
        _BetaMessageStream_workspace_id,
        response?.headers.get("anthropic-workspace-id"),
        "f",
      );
      __classPrivateFieldGet(this, _BetaMessageStream_resolveConnectedPromise, "f").call(this, response);
      this._emit("connect");
    }
    get ended() {
      return __classPrivateFieldGet(this, _BetaMessageStream_ended, "f");
    }
    get errored() {
      return __classPrivateFieldGet(this, _BetaMessageStream_errored, "f");
    }
    get aborted() {
      return __classPrivateFieldGet(this, _BetaMessageStream_aborted, "f");
    }
    abort() {
      this.controller.abort();
    }
    on(event, listener) {
      (
        __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] ||
        (__classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = [])
      ).push({
        listener,
      });
      return this;
    }
    off(event, listener) {
      let listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event];
      if (!listeners) return this;
      let index = listeners.findIndex((l) => l.listener === listener);
      if (index >= 0) listeners.splice(index, 1);
      return this;
    }
    once(event, listener) {
      (
        __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] ||
        (__classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = [])
      ).push({
        listener,
        once: true,
      });
      return this;
    }
    emitted(event) {
      return new Promise((resolve, reject) => {
        __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
        if (event !== "error") this.once("error", reject);
        this.once(event, resolve);
      });
    }
    async done() {
      __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
      await __classPrivateFieldGet(this, _BetaMessageStream_endPromise, "f");
    }
    get currentMessage() {
      return __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
    }
    async finalMessage() {
      await this.done();
      return __classPrivateFieldGet(
        this,
        _BetaMessageStream_instances,
        "m",
        _BetaMessageStream_getFinalMessage,
      ).call(this);
    }
    async finalText() {
      await this.done();
      return __classPrivateFieldGet(
        this,
        _BetaMessageStream_instances,
        "m",
        _BetaMessageStream_getFinalText,
      ).call(this);
    }
    _emit(event, ...args) {
      if (__classPrivateFieldGet(this, _BetaMessageStream_ended, "f")) return;
      if (event === "end") {
        __classPrivateFieldSet(this, _BetaMessageStream_ended, true, "f");
        __classPrivateFieldGet(this, _BetaMessageStream_resolveEndPromise, "f").call(this);
      }
      let listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event];
      if (listeners) {
        __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = listeners.filter(
          (l) => !l.once,
        );
        listeners.forEach(({ listener }) => listener(...args));
      }
      if (event === "abort") {
        let error = args[0];
        if (
          !__classPrivateFieldGet(this, _BetaMessageStream_catchingPromiseCreated, "f") &&
          !listeners?.length
        )
          Promise.reject(error);
        __classPrivateFieldGet(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
        __classPrivateFieldGet(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
        this._emit("end");
        return;
      }
      if (event === "error") {
        let error = args[0];
        if (
          !__classPrivateFieldGet(this, _BetaMessageStream_catchingPromiseCreated, "f") &&
          !listeners?.length
        )
          Promise.reject(error);
        __classPrivateFieldGet(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
        __classPrivateFieldGet(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
        this._emit("end");
      }
    }
    _emitFinal() {
      if (this.receivedMessages.at(-1))
        this._emit(
          "finalMessage",
          __classPrivateFieldGet(
            this,
            _BetaMessageStream_instances,
            "m",
            _BetaMessageStream_getFinalMessage,
          ).call(this),
        );
    }
    async _fromReadableStream(readableStream, options) {
      let signal = options?.signal;
      let abortHandler;
      if (signal) {
        if (signal.aborted) this.controller.abort();
        abortHandler = this.controller.abort.bind(this.controller);
        signal.addEventListener("abort", abortHandler);
      }
      try {
        __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(
          this,
        );
        this._connected(null);
        let stream = Stream.fromReadableStream(readableStream, this.controller);
        for await (let event of stream)
          __classPrivateFieldGet(
            this,
            _BetaMessageStream_instances,
            "m",
            _BetaMessageStream_addStreamEvent,
          ).call(this, event);
        if (stream.controller.signal?.aborted) throw new APIUserAbortError();
        __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(
          this,
        );
      } finally {
        if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
      }
    }
    [((_BetaMessageStream_currentMessageSnapshot = new WeakMap()),
    (_BetaMessageStream_params = new WeakMap()),
    (_BetaMessageStream_connectedPromise = new WeakMap()),
    (_BetaMessageStream_resolveConnectedPromise = new WeakMap()),
    (_BetaMessageStream_rejectConnectedPromise = new WeakMap()),
    (_BetaMessageStream_endPromise = new WeakMap()),
    (_BetaMessageStream_resolveEndPromise = new WeakMap()),
    (_BetaMessageStream_rejectEndPromise = new WeakMap()),
    (_BetaMessageStream_listeners = new WeakMap()),
    (_BetaMessageStream_ended = new WeakMap()),
    (_BetaMessageStream_errored = new WeakMap()),
    (_BetaMessageStream_aborted = new WeakMap()),
    (_BetaMessageStream_catchingPromiseCreated = new WeakMap()),
    (_BetaMessageStream_response = new WeakMap()),
    (_BetaMessageStream_request_id = new WeakMap()),
    (_BetaMessageStream_workspace_id = new WeakMap()),
    (_BetaMessageStream_logger = new WeakMap()),
    (_BetaMessageStream_handleError = new WeakMap()),
    (_BetaMessageStream_instances = new WeakSet()),
    (_BetaMessageStream_getFinalMessage = function () {
      if (this.receivedMessages.length === 0)
        throw new AnthropicError("stream ended without producing a Message with role=assistant");
      return this.receivedMessages.at(-1);
    }),
    (_BetaMessageStream_getFinalText = function () {
      if (this.receivedMessages.length === 0)
        throw new AnthropicError("stream ended without producing a Message with role=assistant");
      let textBlocks = this.receivedMessages
        .at(-1)
        .content.filter((block) => block.type === "text")
        .map((block) => block.text);
      if (textBlocks.length === 0)
        throw new AnthropicError("stream ended without producing a content block with type=text");
      return textBlocks.join(" ");
    }),
    (_BetaMessageStream_beginRequest = function () {
      if (this.ended) return;
      __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, undefined, "f");
    }),
    (_BetaMessageStream_addStreamEvent = function (event) {
      if (this.ended) return;
      let messageSnapshot = __classPrivateFieldGet(
        this,
        _BetaMessageStream_instances,
        "m",
        _BetaMessageStream_accumulateMessage,
      ).call(this, event);
      switch ((this._emit("streamEvent", event, messageSnapshot), event.type)) {
        case "content_block_delta": {
          let content = messageSnapshot.content.at(-1);
          switch (event.delta.type) {
            case "text_delta": {
              if (content.type === "text") this._emit("text", event.delta.text, content.text || "");
              break;
            }
            case "citations_delta": {
              if (content.type === "text")
                this._emit("citation", event.delta.citation, content.citations ?? []);
              break;
            }
            case "input_json_delta": {
              if (
                tracksToolInput(content) &&
                __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f").inputJson?.length
              ) {
                let jsonSnapshot;
                try {
                  jsonSnapshot = content.input;
                } catch (err) {
                  __classPrivateFieldGet(this, _BetaMessageStream_handleError, "f").call(
                    this,
                    __classPrivateFieldGet(
                      this,
                      _BetaMessageStream_instances,
                      "m",
                      _BetaMessageStream_toolInputParseError,
                    ).call(this, content, err),
                  );
                  break;
                }
                this._emit("inputJson", event.delta.partial_json, jsonSnapshot);
              }
              break;
            }
            case "thinking_delta": {
              if (content.type === "thinking") this._emit("thinking", event.delta.thinking, content.thinking);
              break;
            }
            case "signature_delta": {
              if (content.type === "thinking") this._emit("signature", content.signature);
              break;
            }
            case "compaction_delta": {
              if (content.type === "compaction" && content.content) this._emit("compaction", content.content);
              break;
            }
            default:
              sleepWithAbort(event.delta);
          }
          break;
        }
        case "message_stop": {
          this._addMessageParam(messageSnapshot);
          this._addMessage(
            attachParsedOutput(
              messageSnapshot,
              __classPrivateFieldGet(this, _BetaMessageStream_params, "f"),
              {
                logger: __classPrivateFieldGet(this, _BetaMessageStream_logger, "f"),
              },
            ),
            true,
          );
          break;
        }
        case "content_block_stop": {
          this._emit("contentBlock", messageSnapshot.content.at(-1));
          break;
        }
        case "message_start": {
          __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, messageSnapshot, "f");
          break;
        }
        case "content_block_start":
        case "message_delta":
          break;
      }
    }),
    (_BetaMessageStream_endRequest = function () {
      if (this.ended) throw new AnthropicError("stream has ended, this shouldn't happen");
      let snapshot = __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
      if (!snapshot) throw new AnthropicError("request ended without sending any chunks");
      __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, undefined, "f");
      return attachParsedOutput(snapshot, __classPrivateFieldGet(this, _BetaMessageStream_params, "f"), {
        logger: __classPrivateFieldGet(this, _BetaMessageStream_logger, "f"),
      });
    }),
    (_BetaMessageStream_accumulateMessage = function (event) {
      let snapshot = __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
      if (event.type === "message_start") {
        if (snapshot)
          throw new AnthropicError(
            `Unexpected event order, got ${event.type} before receiving "message_stop"`,
          );
        return event.message;
      }
      if (!snapshot)
        throw new AnthropicError(`Unexpected event order, got ${event.type} before "message_start"`);
      switch (event.type) {
        case "message_stop":
          return snapshot;
        case "message_delta":
          snapshot.stop_reason = event.delta.stop_reason;
          snapshot.stop_sequence = event.delta.stop_sequence;
          snapshot.stop_details = event.delta.stop_details;
          snapshot.usage.output_tokens = event.usage.output_tokens;
          if (event.delta.container != null) snapshot.container = event.delta.container;
          if (event.context_management != null) snapshot.context_management = event.context_management;
          if (event.input_transformations != null)
            snapshot.input_transformations = event.input_transformations;
          if (event.usage.input_tokens != null) snapshot.usage.input_tokens = event.usage.input_tokens;
          if (event.usage.cache_creation_input_tokens != null)
            snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
          if (event.usage.cache_read_input_tokens != null)
            snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
          if (event.usage.server_tool_use != null)
            snapshot.usage.server_tool_use = event.usage.server_tool_use;
          if (event.usage.iterations != null) snapshot.usage.iterations = event.usage.iterations;
          if (event.usage.fallback_credit != null)
            snapshot.usage.fallback_credit = event.usage.fallback_credit;
          if (event.usage.output_tokens_details != null)
            snapshot.usage.output_tokens_details = event.usage.output_tokens_details;
          return snapshot;
        case "content_block_start":
          snapshot.content.push(event.content_block);
          if (event.content_block.type === "fallback") snapshot.model = event.content_block.to.model;
          return snapshot;
        case "content_block_delta": {
          let snapshotContent = snapshot.content.at(event.index);
          switch (event.delta.type) {
            case "text_delta": {
              if (snapshotContent?.type === "text")
                snapshot.content[event.index] = {
                  ...snapshotContent,
                  text: (snapshotContent.text || "") + event.delta.text,
                };
              break;
            }
            case "citations_delta": {
              if (snapshotContent?.type === "text")
                snapshot.content[event.index] = {
                  ...snapshotContent,
                  citations: [...(snapshotContent.citations ?? []), event.delta.citation],
                };
              break;
            }
            case "input_json_delta": {
              if (snapshotContent && tracksToolInput(snapshotContent)) {
                let jsonBuf = (snapshotContent[JSON_BUF_PROPERTY] || "") + event.delta.partial_json;
                snapshot.content[event.index] = withLazyInput(snapshotContent, jsonBuf);
              }
              break;
            }
            case "thinking_delta": {
              if (snapshotContent?.type === "thinking")
                snapshot.content[event.index] = {
                  ...snapshotContent,
                  thinking: snapshotContent.thinking + event.delta.thinking,
                };
              break;
            }
            case "signature_delta": {
              if (snapshotContent?.type === "thinking")
                snapshot.content[event.index] = {
                  ...snapshotContent,
                  signature: event.delta.signature,
                };
              break;
            }
            case "compaction_delta": {
              if (snapshotContent?.type === "compaction") {
                let block = {
                  ...snapshotContent,
                  content: event.delta.content,
                };
                if ("encrypted_content" in event.delta)
                  block.encrypted_content = event.delta.encrypted_content;
                snapshot.content[event.index] = block;
              }
              break;
            }
            default:
              sleepWithAbort(event.delta);
          }
          return snapshot;
        }
        case "content_block_stop": {
          let snapshotContent = snapshot.content.at(event.index);
          if (snapshotContent && tracksToolInput(snapshotContent) && JSON_BUF_PROPERTY in snapshotContent) {
            let input;
            try {
              input = snapshotContent.input;
            } catch (err) {
              input = {};
              __classPrivateFieldGet(this, _BetaMessageStream_handleError, "f").call(
                this,
                __classPrivateFieldGet(
                  this,
                  _BetaMessageStream_instances,
                  "m",
                  _BetaMessageStream_toolInputParseError,
                ).call(this, snapshotContent, err),
              );
            }
            Object.defineProperty(snapshotContent, "input", {
              value: input,
              enumerable: true,
              configurable: true,
              writable: true,
            });
          }
          return snapshot;
        }
      }
    }),
    (_BetaMessageStream_toolInputParseError = function (block, err) {
      let jsonBuf = block[JSON_BUF_PROPERTY];
      return new AnthropicError(
        `Unable to parse tool parameter JSON from model. Please retry your request or adjust your prompt. Error: ${err}. JSON: ${jsonBuf}`,
      );
    }),
    Symbol.asyncIterator)]() {
      let pushQueue = [];
      let readQueue = [];
      let done = false;
      this.on("streamEvent", (event) => {
        let reader = readQueue.shift();
        if (reader) reader.resolve(event);
        else pushQueue.push(event);
      });
      this.on("end", () => {
        done = true;
        for (let reader of readQueue) reader.resolve(undefined);
        readQueue.length = 0;
      });
      this.on("abort", (err) => {
        done = true;
        for (let reader of readQueue) reader.reject(err);
        readQueue.length = 0;
      });
      this.on("error", (err) => {
        done = true;
        for (let reader of readQueue) reader.reject(err);
        readQueue.length = 0;
      });
      return {
        next: async () => {
          if (!pushQueue.length) {
            if (done)
              return {
                value: undefined,
                done: true,
              };
            return new Promise((resolve, reject) =>
              readQueue.push({
                resolve,
                reject,
              }),
            ).then((chunk) =>
              chunk
                ? {
                    value: chunk,
                    done: false,
                  }
                : {
                    value: undefined,
                    done: true,
                  },
            );
          }
          return {
            value: pushQueue.shift(),
            done: false,
          };
        },
        return: async () => {
          this.abort();
          return {
            value: undefined,
            done: true,
          };
        },
      };
    }
    toReadableStream() {
      return new Stream(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream();
    }
  }
  return BetaMessageStream;
})();
export { BetaMessageStream };
