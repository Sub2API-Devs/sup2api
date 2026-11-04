/**
 * @anthropic-ai/sdk/lib/MessageStream.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { __classPrivateFieldSet, __classPrivateFieldGet } from "../internal/tslib.mjs";
import { isAbortError_2 } from "../internal/errors.mjs";
import { APIUserAbortError, AnthropicError } from "../core/error.mjs";
import { STAINLESS_HELPER_METHOD_HEADER } from "../internal/stainless-helper-header.mjs";
import { Stream } from "../core/streaming.mjs";
import { sleepWithAbort } from "../tools/agent-toolset/memories.mjs";
import { maybeParseMessage } from "./parser.mjs";
import { JSON_BUF_PROPERTY, withLazyInput } from "../internal/message-stream-utils.mjs";

//@ chunk-hwmsct5x.js:147532-147611 esm-layout
var _MessageStream_instances;
var _MessageStream_currentMessageSnapshot;
var _MessageStream_params;
var _MessageStream_connectedPromise;
var _MessageStream_resolveConnectedPromise;
var _MessageStream_rejectConnectedPromise;
var _MessageStream_endPromise;
var _MessageStream_resolveEndPromise;
var _MessageStream_rejectEndPromise;
var _MessageStream_listeners;
var _MessageStream_ended;
var _MessageStream_errored;
var _MessageStream_aborted;
var _MessageStream_catchingPromiseCreated;
var _MessageStream_response;
var _MessageStream_request_id;
var _MessageStream_workspace_id;
var _MessageStream_logger;
var _MessageStream_getFinalMessage;
var _MessageStream_getFinalText;
var _MessageStream_handleError;
var _MessageStream_beginRequest;
var _MessageStream_addStreamEvent;
var _MessageStream_endRequest;
var _MessageStream_accumulateMessage;
//@ chunk-hwmsct5x.js:147611-147681 esm-fingerprint
function tracksToolInput_2(content) {
  return content.type === "tool_use" || content.type === "server_tool_use";
}
//@ chunk-hwmsct5x.js:147681-156923 esm-fingerprint
var MessageStream = (() => {
  class MessageStream {
    constructor(params, opts) {
      _MessageStream_instances.add(this);
      this.messages = [];
      this.receivedMessages = [];
      _MessageStream_currentMessageSnapshot.set(this, undefined);
      _MessageStream_params.set(this, null);
      this.controller = new AbortController();
      _MessageStream_connectedPromise.set(this, undefined);
      _MessageStream_resolveConnectedPromise.set(this, () => {});
      _MessageStream_rejectConnectedPromise.set(this, () => {});
      _MessageStream_endPromise.set(this, undefined);
      _MessageStream_resolveEndPromise.set(this, () => {});
      _MessageStream_rejectEndPromise.set(this, () => {});
      _MessageStream_listeners.set(this, {});
      _MessageStream_ended.set(this, false);
      _MessageStream_errored.set(this, false);
      _MessageStream_aborted.set(this, false);
      _MessageStream_catchingPromiseCreated.set(this, false);
      _MessageStream_response.set(this, undefined);
      _MessageStream_request_id.set(this, undefined);
      _MessageStream_workspace_id.set(this, undefined);
      _MessageStream_logger.set(this, undefined);
      _MessageStream_handleError.set(this, (error) => {
        __classPrivateFieldSet(this, _MessageStream_errored, true, "f");
        if (isAbortError_2(error)) error = new APIUserAbortError();
        if (error instanceof APIUserAbortError) {
          __classPrivateFieldSet(this, _MessageStream_aborted, true, "f");
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
        _MessageStream_connectedPromise,
        new Promise((resolve, reject) => {
          __classPrivateFieldSet(this, _MessageStream_resolveConnectedPromise, resolve, "f");
          __classPrivateFieldSet(this, _MessageStream_rejectConnectedPromise, reject, "f");
        }),
        "f",
      );
      __classPrivateFieldSet(
        this,
        _MessageStream_endPromise,
        new Promise((resolve, reject) => {
          __classPrivateFieldSet(this, _MessageStream_resolveEndPromise, resolve, "f");
          __classPrivateFieldSet(this, _MessageStream_rejectEndPromise, reject, "f");
        }),
        "f",
      );
      __classPrivateFieldGet(this, _MessageStream_connectedPromise, "f").catch(() => {});
      __classPrivateFieldGet(this, _MessageStream_endPromise, "f").catch(() => {});
      __classPrivateFieldSet(this, _MessageStream_params, params, "f");
      __classPrivateFieldSet(this, _MessageStream_logger, opts?.logger ?? console, "f");
    }
    get response() {
      return __classPrivateFieldGet(this, _MessageStream_response, "f");
    }
    get request_id() {
      return __classPrivateFieldGet(this, _MessageStream_request_id, "f");
    }
    get workspace_id() {
      return __classPrivateFieldGet(this, _MessageStream_workspace_id, "f");
    }
    async withResponse() {
      __classPrivateFieldSet(this, _MessageStream_catchingPromiseCreated, true, "f");
      let response = await __classPrivateFieldGet(this, _MessageStream_connectedPromise, "f");
      if (!response) throw Error("Could not resolve a `Response` object");
      return {
        data: this,
        response,
        request_id: response.headers.get("request-id"),
        workspace_id: response.headers.get("anthropic-workspace-id"),
      };
    }
    static fromReadableStream(stream) {
      let runner = new MessageStream(null);
      runner._run(() => runner._fromReadableStream(stream));
      return runner;
    }
    static createMessage(messages, params, options, { logger } = {}) {
      let runner = new MessageStream(params, {
        logger,
      });
      for (let message of params.messages) runner._addMessageParam(message);
      __classPrivateFieldSet(
        runner,
        _MessageStream_params,
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
        __classPrivateFieldGet(this, _MessageStream_handleError, "f"),
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
        __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
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
          __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(
            this,
            event,
          );
        if (stream.controller.signal?.aborted) throw new APIUserAbortError();
        __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
      } finally {
        if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
      }
    }
    _connected(response) {
      if (this.ended) return;
      __classPrivateFieldSet(this, _MessageStream_response, response, "f");
      __classPrivateFieldSet(this, _MessageStream_request_id, response?.headers.get("request-id"), "f");
      __classPrivateFieldSet(
        this,
        _MessageStream_workspace_id,
        response?.headers.get("anthropic-workspace-id"),
        "f",
      );
      __classPrivateFieldGet(this, _MessageStream_resolveConnectedPromise, "f").call(this, response);
      this._emit("connect");
    }
    get ended() {
      return __classPrivateFieldGet(this, _MessageStream_ended, "f");
    }
    get errored() {
      return __classPrivateFieldGet(this, _MessageStream_errored, "f");
    }
    get aborted() {
      return __classPrivateFieldGet(this, _MessageStream_aborted, "f");
    }
    abort() {
      this.controller.abort();
    }
    on(event, listener) {
      (
        __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] ||
        (__classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] = [])
      ).push({
        listener,
      });
      return this;
    }
    off(event, listener) {
      let listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event];
      if (!listeners) return this;
      let index = listeners.findIndex((l) => l.listener === listener);
      if (index >= 0) listeners.splice(index, 1);
      return this;
    }
    once(event, listener) {
      (
        __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] ||
        (__classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] = [])
      ).push({
        listener,
        once: true,
      });
      return this;
    }
    emitted(event) {
      return new Promise((resolve, reject) => {
        __classPrivateFieldSet(this, _MessageStream_catchingPromiseCreated, true, "f");
        if (event !== "error") this.once("error", reject);
        this.once(event, resolve);
      });
    }
    async done() {
      __classPrivateFieldSet(this, _MessageStream_catchingPromiseCreated, true, "f");
      await __classPrivateFieldGet(this, _MessageStream_endPromise, "f");
    }
    get currentMessage() {
      return __classPrivateFieldGet(this, _MessageStream_currentMessageSnapshot, "f");
    }
    async finalMessage() {
      await this.done();
      return __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(
        this,
      );
    }
    async finalText() {
      await this.done();
      return __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_getFinalText).call(
        this,
      );
    }
    _emit(event, ...args) {
      if (__classPrivateFieldGet(this, _MessageStream_ended, "f")) return;
      if (event === "end") {
        __classPrivateFieldSet(this, _MessageStream_ended, true, "f");
        __classPrivateFieldGet(this, _MessageStream_resolveEndPromise, "f").call(this);
      }
      let listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event];
      if (listeners) {
        __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
        listeners.forEach(({ listener }) => listener(...args));
      }
      if (event === "abort") {
        let error = args[0];
        if (!__classPrivateFieldGet(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length)
          Promise.reject(error);
        __classPrivateFieldGet(this, _MessageStream_rejectConnectedPromise, "f").call(this, error);
        __classPrivateFieldGet(this, _MessageStream_rejectEndPromise, "f").call(this, error);
        this._emit("end");
        return;
      }
      if (event === "error") {
        let error = args[0];
        if (!__classPrivateFieldGet(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length)
          Promise.reject(error);
        __classPrivateFieldGet(this, _MessageStream_rejectConnectedPromise, "f").call(this, error);
        __classPrivateFieldGet(this, _MessageStream_rejectEndPromise, "f").call(this, error);
        this._emit("end");
      }
    }
    _emitFinal() {
      if (this.receivedMessages.at(-1))
        this._emit(
          "finalMessage",
          __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(
            this,
          ),
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
        __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
        this._connected(null);
        let stream = Stream.fromReadableStream(readableStream, this.controller);
        for await (let event of stream)
          __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(
            this,
            event,
          );
        if (stream.controller.signal?.aborted) throw new APIUserAbortError();
        __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
      } finally {
        if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
      }
    }
    [((_MessageStream_currentMessageSnapshot = new WeakMap()),
    (_MessageStream_params = new WeakMap()),
    (_MessageStream_connectedPromise = new WeakMap()),
    (_MessageStream_resolveConnectedPromise = new WeakMap()),
    (_MessageStream_rejectConnectedPromise = new WeakMap()),
    (_MessageStream_endPromise = new WeakMap()),
    (_MessageStream_resolveEndPromise = new WeakMap()),
    (_MessageStream_rejectEndPromise = new WeakMap()),
    (_MessageStream_listeners = new WeakMap()),
    (_MessageStream_ended = new WeakMap()),
    (_MessageStream_errored = new WeakMap()),
    (_MessageStream_aborted = new WeakMap()),
    (_MessageStream_catchingPromiseCreated = new WeakMap()),
    (_MessageStream_response = new WeakMap()),
    (_MessageStream_request_id = new WeakMap()),
    (_MessageStream_workspace_id = new WeakMap()),
    (_MessageStream_logger = new WeakMap()),
    (_MessageStream_handleError = new WeakMap()),
    (_MessageStream_instances = new WeakSet()),
    (_MessageStream_getFinalMessage = function () {
      if (this.receivedMessages.length === 0)
        throw new AnthropicError("stream ended without producing a Message with role=assistant");
      return this.receivedMessages.at(-1);
    }),
    (_MessageStream_getFinalText = function () {
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
    (_MessageStream_beginRequest = function () {
      if (this.ended) return;
      __classPrivateFieldSet(this, _MessageStream_currentMessageSnapshot, undefined, "f");
    }),
    (_MessageStream_addStreamEvent = function (event) {
      if (this.ended) return;
      let messageSnapshot = __classPrivateFieldGet(
        this,
        _MessageStream_instances,
        "m",
        _MessageStream_accumulateMessage,
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
                tracksToolInput_2(content) &&
                __classPrivateFieldGet(this, _MessageStream_listeners, "f").inputJson?.length
              )
                this._emit("inputJson", event.delta.partial_json, content.input);
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
            default:
              sleepWithAbort(event.delta);
          }
          break;
        }
        case "message_stop": {
          this._addMessageParam(messageSnapshot);
          this._addMessage(
            maybeParseMessage(messageSnapshot, __classPrivateFieldGet(this, _MessageStream_params, "f"), {
              logger: __classPrivateFieldGet(this, _MessageStream_logger, "f"),
            }),
            true,
          );
          break;
        }
        case "content_block_stop": {
          this._emit("contentBlock", messageSnapshot.content.at(-1));
          break;
        }
        case "message_start": {
          __classPrivateFieldSet(this, _MessageStream_currentMessageSnapshot, messageSnapshot, "f");
          break;
        }
        case "content_block_start":
        case "message_delta":
          break;
      }
    }),
    (_MessageStream_endRequest = function () {
      if (this.ended) throw new AnthropicError("stream has ended, this shouldn't happen");
      let snapshot = __classPrivateFieldGet(this, _MessageStream_currentMessageSnapshot, "f");
      if (!snapshot) throw new AnthropicError("request ended without sending any chunks");
      __classPrivateFieldSet(this, _MessageStream_currentMessageSnapshot, undefined, "f");
      return maybeParseMessage(snapshot, __classPrivateFieldGet(this, _MessageStream_params, "f"), {
        logger: __classPrivateFieldGet(this, _MessageStream_logger, "f"),
      });
    }),
    (_MessageStream_accumulateMessage = function (event) {
      let snapshot = __classPrivateFieldGet(this, _MessageStream_currentMessageSnapshot, "f");
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
          if (event.usage.input_tokens != null) snapshot.usage.input_tokens = event.usage.input_tokens;
          if (event.usage.cache_creation_input_tokens != null)
            snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
          if (event.usage.cache_read_input_tokens != null)
            snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
          if (event.usage.server_tool_use != null)
            snapshot.usage.server_tool_use = event.usage.server_tool_use;
          if (event.usage.output_tokens_details != null)
            snapshot.usage.output_tokens_details = event.usage.output_tokens_details;
          return snapshot;
        case "content_block_start":
          snapshot.content.push({
            ...event.content_block,
          });
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
              if (snapshotContent && tracksToolInput_2(snapshotContent)) {
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
            default:
              sleepWithAbort(event.delta);
          }
          return snapshot;
        }
        case "content_block_stop": {
          let snapshotContent = snapshot.content.at(event.index);
          if (snapshotContent && tracksToolInput_2(snapshotContent) && JSON_BUF_PROPERTY in snapshotContent)
            Object.defineProperty(snapshotContent, "input", {
              value: snapshotContent.input,
              enumerable: true,
              configurable: true,
              writable: true,
            });
          return snapshot;
        }
      }
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
  return MessageStream;
})();
export { MessageStream };
