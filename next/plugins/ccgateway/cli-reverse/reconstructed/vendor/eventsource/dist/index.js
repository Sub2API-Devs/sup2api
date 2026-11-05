/**
 * eventsource/dist/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: eventsource@3.0.5..4.1.1
 * pieces: chunk-1rh66vj0.js (8)
 * attribution: esm-fingerprint 7, esm-layout 1
 */
import { createParser } from "../../eventsource-parser/dist/index.js";

//@ chunk-1rh66vj0.js:228-523 esm-fingerprint
class ErrorEvent extends Event {
  constructor(type, errorEventInitDict) {
    var _a;
    var _b;
    super(type);
    this.code =
      (_a = errorEventInitDict == null ? undefined : errorEventInitDict.code) != null ? _a : undefined;
    this.message =
      (_b = errorEventInitDict == null ? undefined : errorEventInitDict.message) != null ? _b : undefined;
  }
  [Symbol.for("nodejs.util.inspect.custom")](_depth, options, inspect) {
    return inspect(inspectableError(this), options);
  }
  [Symbol.for("Deno.customInspect")](inspect, options) {
    return inspect(inspectableError(this), options);
  }
}
//@ chunk-1rh66vj0.js:523-633 esm-fingerprint
function syntaxError(message) {
  let DomException = globalThis.DOMException;
  return typeof DomException == "function" ? new DomException(message, "SyntaxError") : SyntaxError(message);
}
//@ chunk-1rh66vj0.js:633-817 esm-fingerprint
function flattenError(err) {
  return err instanceof Error
    ? "errors" in err && Array.isArray(err.errors)
      ? err.errors.map(flattenError).join(", ")
      : "cause" in err && err.cause instanceof Error
        ? `${err}: ${flattenError(err.cause)}`
        : err.message
    : `${err}`;
}
//@ chunk-1rh66vj0.js:817-963 esm-fingerprint
function inspectableError(err) {
  return {
    type: err.type,
    message: err.message,
    code: err.code,
    defaultPrevented: err.defaultPrevented,
    cancelable: err.cancelable,
    timeStamp: err.timeStamp,
  };
}
//@ chunk-1rh66vj0.js:963-1366 esm-layout
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) =>
  member.has(obj)
    ? __typeError("Cannot add the same private member more than once")
    : member instanceof WeakSet
      ? member.add(obj)
      : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var _readyState;
var _url;
var _redirectUrl;
var _withCredentials;
var _fetch;
var _reconnectInterval;
var _reconnectTimer;
var _lastEventId;
var _controller;
var _parser;
var _onError;
var _onMessage;
var _onOpen;
var _EventSource_instances;
var connect_fn;
var _onFetchResponse;
var _onFetchError;
var getRequestOptions_fn;
var _onEvent;
var _onRetryChange;
var failConnection_fn;
var scheduleReconnect_fn;
var _reconnect;
//@ chunk-1rh66vj0.js:1366-4021 esm-fingerprint
class EventSource extends EventTarget {
  constructor(url, eventSourceInitDict) {
    var _a;
    var _b;
    super();
    __privateAdd(this, _EventSource_instances);
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSED = 2;
    __privateAdd(this, _readyState);
    __privateAdd(this, _url);
    __privateAdd(this, _redirectUrl);
    __privateAdd(this, _withCredentials);
    __privateAdd(this, _fetch);
    __privateAdd(this, _reconnectInterval);
    __privateAdd(this, _reconnectTimer);
    __privateAdd(this, _lastEventId, null);
    __privateAdd(this, _controller);
    __privateAdd(this, _parser);
    __privateAdd(this, _onError, null);
    __privateAdd(this, _onMessage, null);
    __privateAdd(this, _onOpen, null);
    __privateAdd(this, _onFetchResponse, async (response) => {
      var _a2;
      __privateGet(this, _parser).reset();
      let { body, redirected, status, headers } = response;
      if (status === 204) {
        __privateMethod(this, _EventSource_instances, failConnection_fn).call(
          this,
          "Server sent HTTP 204, not reconnecting",
          204,
        );
        this.close();
        return;
      }
      if (redirected) __privateSet(this, _redirectUrl, new URL(response.url));
      else __privateSet(this, _redirectUrl, undefined);
      if (status !== 200) {
        __privateMethod(this, _EventSource_instances, failConnection_fn).call(
          this,
          `Non-200 status code (${status})`,
          status,
        );
        return;
      }
      if (!(headers.get("content-type") || "").startsWith("text/event-stream")) {
        __privateMethod(this, _EventSource_instances, failConnection_fn).call(
          this,
          'Invalid content type, expected "text/event-stream"',
          status,
        );
        return;
      }
      if (__privateGet(this, _readyState) === this.CLOSED) return;
      __privateSet(this, _readyState, this.OPEN);
      let openEvent = new Event("open");
      if (!((_a2 = __privateGet(this, _onOpen)) == null)) _a2.call(this, openEvent);
      this.dispatchEvent(openEvent);
      if (typeof body != "object" || !body || !("getReader" in body)) {
        __privateMethod(this, _EventSource_instances, failConnection_fn).call(
          this,
          "Invalid response body, expected a web ReadableStream",
          status,
        );
        this.close();
        return;
      }
      let decoder = new TextDecoder();
      let reader = body.getReader();
      let open = true;
      do {
        let { done, value } = await reader.read();
        if (value)
          __privateGet(this, _parser).feed(
            decoder.decode(value, {
              stream: !done,
            }),
          );
        if (done) {
          open = false;
          __privateGet(this, _parser).reset();
          __privateMethod(this, _EventSource_instances, scheduleReconnect_fn).call(this);
        }
      } while (open);
    });
    __privateAdd(this, _onFetchError, (err) => {
      __privateSet(this, _controller, undefined);
      if (!(err.name === "AbortError" || err.type === "aborted"))
        __privateMethod(this, _EventSource_instances, scheduleReconnect_fn).call(this, flattenError(err));
    });
    __privateAdd(this, _onEvent, (event) => {
      if (typeof event.id == "string") __privateSet(this, _lastEventId, event.id);
      let messageEvent = new MessageEvent(event.event || "message", {
        data: event.data,
        origin: __privateGet(this, _redirectUrl)
          ? __privateGet(this, _redirectUrl).origin
          : __privateGet(this, _url).origin,
        lastEventId: event.id || "",
      });
      if (__privateGet(this, _onMessage) && (!event.event || event.event === "message"))
        __privateGet(this, _onMessage).call(this, messageEvent);
      this.dispatchEvent(messageEvent);
    });
    __privateAdd(this, _onRetryChange, (value) => {
      __privateSet(this, _reconnectInterval, value);
    });
    __privateAdd(this, _reconnect, () => {
      __privateSet(this, _reconnectTimer, undefined);
      if (__privateGet(this, _readyState) === this.CONNECTING)
        __privateMethod(this, _EventSource_instances, connect_fn).call(this);
    });
    try {
      if (url instanceof URL) __privateSet(this, _url, url);
      else if (typeof url == "string") __privateSet(this, _url, new URL(url, getBaseURL()));
      else throw Error("Invalid URL");
    } catch {
      throw syntaxError("An invalid or illegal string was specified");
    }
    __privateSet(
      this,
      _parser,
      createParser({
        onEvent: __privateGet(this, _onEvent),
        onRetry: __privateGet(this, _onRetryChange),
      }),
    );
    __privateSet(this, _readyState, this.CONNECTING);
    __privateSet(this, _reconnectInterval, 3000);
    __privateSet(
      this,
      _fetch,
      (_a = eventSourceInitDict == null ? undefined : eventSourceInitDict.fetch) != null
        ? _a
        : globalThis.fetch,
    );
    __privateSet(
      this,
      _withCredentials,
      (_b = eventSourceInitDict == null ? undefined : eventSourceInitDict.withCredentials) != null
        ? _b
        : false,
    );
    __privateMethod(this, _EventSource_instances, connect_fn).call(this);
  }
  get readyState() {
    return __privateGet(this, _readyState);
  }
  get url() {
    return __privateGet(this, _url).href;
  }
  get withCredentials() {
    return __privateGet(this, _withCredentials);
  }
  get onerror() {
    return __privateGet(this, _onError);
  }
  set onerror(value) {
    __privateSet(this, _onError, value);
  }
  get onmessage() {
    return __privateGet(this, _onMessage);
  }
  set onmessage(value) {
    __privateSet(this, _onMessage, value);
  }
  get onopen() {
    return __privateGet(this, _onOpen);
  }
  set onopen(value) {
    __privateSet(this, _onOpen, value);
  }
  addEventListener(type, listener, options) {
    let listen = listener;
    super.addEventListener(type, listen, options);
  }
  removeEventListener(type, listener, options) {
    let listen = listener;
    super.removeEventListener(type, listen, options);
  }
  close() {
    if (__privateGet(this, _reconnectTimer)) clearTimeout(__privateGet(this, _reconnectTimer));
    if (__privateGet(this, _readyState) !== this.CLOSED) {
      if (__privateGet(this, _controller)) __privateGet(this, _controller).abort();
      __privateSet(this, _readyState, this.CLOSED);
      __privateSet(this, _controller, undefined);
    }
  }
}
//@ chunk-1rh66vj0.js:4021-5161 esm-fingerprint
_readyState = new WeakMap();
_url = new WeakMap();
_redirectUrl = new WeakMap();
_withCredentials = new WeakMap();
_fetch = new WeakMap();
_reconnectInterval = new WeakMap();
_reconnectTimer = new WeakMap();
_lastEventId = new WeakMap();
_controller = new WeakMap();
_parser = new WeakMap();
_onError = new WeakMap();
_onMessage = new WeakMap();
_onOpen = new WeakMap();
_EventSource_instances = new WeakSet();
connect_fn = function () {
  __privateSet(this, _readyState, this.CONNECTING);
  __privateSet(this, _controller, new AbortController());
  __privateGet(this, _fetch)(
    __privateGet(this, _url),
    __privateMethod(this, _EventSource_instances, getRequestOptions_fn).call(this),
  )
    .then(__privateGet(this, _onFetchResponse))
    .catch(__privateGet(this, _onFetchError));
};
_onFetchResponse = new WeakMap();
_onFetchError = new WeakMap();
getRequestOptions_fn = function () {
  var _a;
  let init = {
    mode: "cors",
    redirect: "follow",
    headers: {
      Accept: "text/event-stream",
      ...(__privateGet(this, _lastEventId)
        ? {
            "Last-Event-ID": __privateGet(this, _lastEventId),
          }
        : undefined),
    },
    cache: "no-store",
    signal: (_a = __privateGet(this, _controller)) == null ? undefined : _a.signal,
  };
  if ("window" in globalThis) init.credentials = this.withCredentials ? "include" : "same-origin";
  return init;
};
_onEvent = new WeakMap();
_onRetryChange = new WeakMap();
failConnection_fn = function (message, code) {
  var _a;
  if (__privateGet(this, _readyState) !== this.CLOSED) __privateSet(this, _readyState, this.CLOSED);
  let errorEvent = new ErrorEvent("error", {
    code,
    message,
  });
  if (!((_a = __privateGet(this, _onError)) == null)) _a.call(this, errorEvent);
  this.dispatchEvent(errorEvent);
};
scheduleReconnect_fn = function (message, code) {
  var _a;
  if (__privateGet(this, _readyState) === this.CLOSED) return;
  __privateSet(this, _readyState, this.CONNECTING);
  let errorEvent = new ErrorEvent("error", {
    code,
    message,
  });
  if (!((_a = __privateGet(this, _onError)) == null)) _a.call(this, errorEvent);
  this.dispatchEvent(errorEvent);
  __privateSet(
    this,
    _reconnectTimer,
    setTimeout(__privateGet(this, _reconnect), __privateGet(this, _reconnectInterval)),
  );
};
_reconnect = new WeakMap();
EventSource.CONNECTING = 0;
EventSource.OPEN = 1;
EventSource.CLOSED = 2;
//@ chunk-1rh66vj0.js:5161-5320 esm-fingerprint
function getBaseURL() {
  let doc = "document" in globalThis ? globalThis.document : undefined;
  return doc && typeof doc == "object" && "baseURI" in doc && typeof doc.baseURI == "string"
    ? doc.baseURI
    : undefined;
}
export { EventSource };
