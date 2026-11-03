/**
 * @smithy/node-http-handler/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/node-http-handler@4.6.0
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_protocol_http } from "../../protocol-http/dist-cjs/index.js";
import { require_querystring_builder } from "../../querystring-builder/dist-cjs/index.js";

//@ chunk-hq88884p.js:5498-17045 cjs-fingerprint
var require_node_http_handler = x(function (cjsExports) {
  var at = require_protocol_http();
  var querystringBuilder = require_querystring_builder();
  var fe = importMetaRequire("http");
  var de = importMetaRequire("https");
  var node_stream = importMetaRequire("stream");
  var http2 = importMetaRequire("http2");
  var tn = ["ECONNRESET", "EPIPE", "ETIMEDOUT"];
  var lt = (headers) => {
    let transformedHeaders = {};
    for (let name of Object.keys(headers)) {
      let headerValues = headers[name];
      transformedHeaders[name] = Array.isArray(headerValues) ? headerValues.join(",") : headerValues;
    }
    return transformedHeaders;
  };
  var timing = {
    setTimeout: (cb, ms) => setTimeout(cb, ms),
    clearTimeout: (timeoutId) => clearTimeout(timeoutId),
  };
  var DEFER_EVENT_LISTENER_TIME$2 = 1000;
  var setConnectionTimeout = (request, reject, timeoutInMs = 0) => {
    if (!timeoutInMs) return -1;
    let registerTimeout = (offset) => {
      let timeoutId = timing.setTimeout(() => {
        request.destroy();
        reject(
          Object.assign(
            Error(
              `@smithy/node-http-handler - the request socket did not establish a connection with the server within the configured timeout of ${timeoutInMs} ms.`,
            ),
            {
              name: "TimeoutError",
            },
          ),
        );
      }, timeoutInMs - offset);
      let doWithSocket = (socket) => {
        if (socket?.connecting)
          socket.on("connect", () => {
            timing.clearTimeout(timeoutId);
          });
        else timing.clearTimeout(timeoutId);
      };
      if (request.socket) doWithSocket(request.socket);
      else request.on("socket", doWithSocket);
    };
    if (timeoutInMs < 2000) {
      registerTimeout(0);
      return 0;
    }
    return timing.setTimeout(
      registerTimeout.bind(null, DEFER_EVENT_LISTENER_TIME$2),
      DEFER_EVENT_LISTENER_TIME$2,
    );
  };
  var nn = (req, reject, timeoutInMs = 0, throwOnRequestTimeout, logger) => {
    if (timeoutInMs)
      return timing.setTimeout(() => {
        let msg = `@smithy/node-http-handler - [${throwOnRequestTimeout ? "ERROR" : "WARN"}] a request has exceeded the configured ${timeoutInMs} ms requestTimeout.`;
        if (throwOnRequestTimeout) {
          let error = Object.assign(Error(msg), {
            name: "TimeoutError",
            code: "ETIMEDOUT",
          });
          req.destroy(error);
          reject(error);
        } else {
          msg += " Init client requestHandler with throwOnRequestTimeout=true to turn this into an error.";
          logger?.warn?.(msg);
        }
      }, timeoutInMs);
    return -1;
  };
  var on = 3000;
  var sn = (request, { keepAlive, keepAliveMsecs }, deferTimeMs = on) => {
    if (keepAlive !== true) return -1;
    let registerListener = () => {
      if (request.socket) request.socket.setKeepAlive(keepAlive, keepAliveMsecs || 0);
      else
        request.on("socket", (socket) => {
          socket.setKeepAlive(keepAlive, keepAliveMsecs || 0);
        });
    };
    if (deferTimeMs === 0) {
      registerListener();
      return 0;
    }
    return timing.setTimeout(registerListener, deferTimeMs);
  };
  var DEFER_EVENT_LISTENER_TIME = 3000;
  var cn = (request, reject, timeoutInMs = 0) => {
    let registerTimeout = (offset) => {
      let timeout = timeoutInMs - offset;
      let onTimeout = () => {
        request.destroy();
        reject(
          Object.assign(
            Error(
              `@smithy/node-http-handler - the request socket timed out after ${timeoutInMs} ms of inactivity (configured by client requestHandler).`,
            ),
            {
              name: "TimeoutError",
            },
          ),
        );
      };
      if (request.socket) {
        request.socket.setTimeout(timeout, onTimeout);
        request.on("close", () => request.socket?.removeListener("timeout", onTimeout));
      } else request.setTimeout(timeout, onTimeout);
    };
    if (0 < timeoutInMs && timeoutInMs < 6000) {
      registerTimeout(0);
      return 0;
    }
    return timing.setTimeout(
      registerTimeout.bind(null, timeoutInMs === 0 ? 0 : DEFER_EVENT_LISTENER_TIME),
      DEFER_EVENT_LISTENER_TIME,
    );
  };
  var MIN_WAIT_TIME = 6000;
  async function writeRequestBody(
    httpRequest,
    request,
    maxContinueTimeoutMs = MIN_WAIT_TIME,
    externalAgent = false,
  ) {
    let headers = request.headers ?? {};
    let expect = headers.Expect || headers.expect;
    let timeoutId = -1;
    let sendBody = true;
    if (!externalAgent && expect === "100-continue")
      sendBody = await Promise.race([
        new Promise((resolve) => {
          timeoutId = Number(
            timing.setTimeout(() => resolve(true), Math.max(MIN_WAIT_TIME, maxContinueTimeoutMs)),
          );
        }),
        new Promise((resolve) => {
          httpRequest.on("continue", () => {
            timing.clearTimeout(timeoutId);
            resolve(true);
          });
          httpRequest.on("response", () => {
            timing.clearTimeout(timeoutId);
            resolve(false);
          });
          httpRequest.on("error", () => {
            timing.clearTimeout(timeoutId);
            resolve(false);
          });
        }),
      ]);
    if (sendBody) writeBody(httpRequest, request.body);
  }
  function writeBody(httpRequest, body) {
    if (body instanceof node_stream.Readable) {
      body.pipe(httpRequest);
      return;
    }
    if (body) {
      if (Buffer.isBuffer(body) || typeof body === "string") {
        httpRequest.end(body);
        return;
      }
      let uint8 = body;
      if (
        typeof uint8 === "object" &&
        uint8.buffer &&
        typeof uint8.byteOffset === "number" &&
        typeof uint8.byteLength === "number"
      ) {
        httpRequest.end(Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength));
        return;
      }
      httpRequest.end(Buffer.from(body));
      return;
    }
    httpRequest.end();
  }
  var DEFAULT_REQUEST_TIMEOUT = 0;
  class NodeHttpHandler {
    config;
    configProvider;
    socketWarningTimestamp = 0;
    externalAgent = false;
    metadata = {
      handlerProtocol: "http/1.1",
    };
    static create(instanceOrOptions) {
      if (typeof instanceOrOptions?.handle === "function") return instanceOrOptions;
      return new NodeHttpHandler(instanceOrOptions);
    }
    static checkSocketUsage(agent, socketWarningTimestamp, logger = console) {
      let { sockets, requests, maxSockets } = agent;
      if (typeof maxSockets !== "number" || maxSockets === 1 / 0) return socketWarningTimestamp;
      let interval = 15000;
      if (Date.now() - interval < socketWarningTimestamp) return socketWarningTimestamp;
      if (sockets && requests)
        for (let origin in sockets) {
          let socketsInUse = sockets[origin]?.length ?? 0;
          let requestsEnqueued = requests[origin]?.length ?? 0;
          if (socketsInUse >= maxSockets && requestsEnqueued >= 2 * maxSockets) {
            logger?.warn?.(`@smithy/node-http-handler:WARN - socket usage at capacity=${socketsInUse} and ${requestsEnqueued} additional requests are enqueued.
See https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-configuring-maxsockets.html
or increase socketAcquisitionWarningTimeout=(millis) in the NodeHttpHandler config.`);
            return Date.now();
          }
        }
      return socketWarningTimestamp;
    }
    constructor(options) {
      this.configProvider = new Promise((resolve, reject) => {
        if (typeof options === "function")
          options()
            .then((_options) => {
              resolve(this.resolveDefaultConfig(_options));
            })
            .catch(reject);
        else resolve(this.resolveDefaultConfig(options));
      });
    }
    resolveDefaultConfig(e) {
      let {
        requestTimeout,
        connectionTimeout,
        socketTimeout,
        socketAcquisitionWarningTimeout,
        httpAgent,
        httpsAgent,
        throwOnRequestTimeout,
      } = e || {};
      let l = true;
      let b = 50;
      return {
        connectionTimeout,
        requestTimeout,
        socketTimeout,
        socketAcquisitionWarningTimeout,
        throwOnRequestTimeout,
        httpAgent: (() => {
          if (httpAgent instanceof fe.Agent || typeof httpAgent?.destroy === "function") {
            this.externalAgent = true;
            return httpAgent;
          }
          return new fe.Agent({
            keepAlive: true,
            maxSockets: 50,
            ...httpAgent,
          });
        })(),
        httpsAgent: (() => {
          if (httpsAgent instanceof de.Agent || typeof httpsAgent?.destroy === "function") {
            this.externalAgent = true;
            return httpsAgent;
          }
          return new de.Agent({
            keepAlive: true,
            maxSockets: 50,
            ...httpsAgent,
          });
        })(),
        logger: console,
      };
    }
    destroy() {
      this.config?.httpAgent?.destroy();
      this.config?.httpsAgent?.destroy();
    }
    async handle(request, { abortSignal, requestTimeout } = {}) {
      if (!this.config) this.config = await this.configProvider;
      return new Promise((resolve, reject) => {
        let config = this.config;
        let a = undefined;
        let timeouts = [];
        let l = async (S) => {
          await a;
          timeouts.forEach(timing.clearTimeout);
          resolve(S);
        };
        let reject_2 = async (S) => {
          await a;
          timeouts.forEach(timing.clearTimeout);
          reject(S);
        };
        if (abortSignal?.aborted) {
          let S = Error("Request aborted");
          S.name = "AbortError";
          reject_2(S);
          return;
        }
        let isSSL = request.protocol === "https:";
        let headers = request.headers ?? {};
        let expectContinue = (headers.Expect ?? headers.expect) === "100-continue";
        let agent = isSSL ? config.httpsAgent : config.httpAgent;
        if (expectContinue && !this.externalAgent)
          agent = new (isSSL ? de.Agent : fe.Agent)({
            keepAlive: false,
            maxSockets: 1 / 0,
          });
        timeouts.push(
          timing.setTimeout(
            () => {
              this.socketWarningTimestamp = NodeHttpHandler.checkSocketUsage(
                agent,
                this.socketWarningTimestamp,
                config.logger,
              );
            },
            config.socketAcquisitionWarningTimeout ??
              (config.requestTimeout ?? 2000) + (config.connectionTimeout ?? 1000),
          ),
        );
        let queryString = querystringBuilder.buildQueryString(request.query || {});
        let auth = undefined;
        if (request.username != null || request.password != null) {
          let username = request.username ?? "";
          let password = request.password ?? "";
          auth = `${username}:${password}`;
        }
        let path = request.path;
        if (queryString) path += `?${queryString}`;
        if (request.fragment) path += `#${request.fragment}`;
        let hostname = request.hostname ?? "";
        if (hostname[0] === "[" && hostname.endsWith("]")) hostname = request.hostname.slice(1, -1);
        else hostname = request.hostname;
        let nodeHttpsOptions = {
          headers: request.headers,
          host: hostname,
          method: request.method,
          path,
          port: request.port,
          agent,
          auth,
        };
        let req = (isSSL ? de.request : fe.request)(nodeHttpsOptions, (res) => {
          let httpResponse = new at.HttpResponse({
            statusCode: res.statusCode || -1,
            reason: res.statusMessage,
            headers: lt(res.headers),
            body: res,
          });
          l({
            response: httpResponse,
          });
        });
        req.on("error", (err) => {
          if (tn.includes(err.code))
            reject_2(
              Object.assign(err, {
                name: "TimeoutError",
              }),
            );
          else reject_2(err);
        });
        if (abortSignal) {
          let onAbort = () => {
            req.destroy();
            let abortError = Error("Request aborted");
            abortError.name = "AbortError";
            reject_2(abortError);
          };
          if (typeof abortSignal.addEventListener === "function") {
            let signal = abortSignal;
            signal.addEventListener("abort", onAbort, {
              once: true,
            });
            req.once("close", () => signal.removeEventListener("abort", onAbort));
          } else abortSignal.onabort = onAbort;
        }
        let effectiveRequestTimeout = requestTimeout ?? config.requestTimeout;
        timeouts.push(setConnectionTimeout(req, reject_2, config.connectionTimeout));
        timeouts.push(
          nn(req, reject_2, effectiveRequestTimeout, config.throwOnRequestTimeout, config.logger ?? console),
        );
        timeouts.push(cn(req, reject_2, config.socketTimeout));
        let httpAgent = nodeHttpsOptions.agent;
        if (typeof httpAgent === "object" && "keepAlive" in httpAgent)
          timeouts.push(
            sn(req, {
              keepAlive: httpAgent.keepAlive,
              keepAliveMsecs: httpAgent.keepAliveMsecs,
            }),
          );
        a = writeRequestBody(req, request, effectiveRequestTimeout, this.externalAgent).catch((e) => {
          timeouts.forEach(timing.clearTimeout);
          return reject(e);
        });
      });
    }
    updateHttpClientConfig(key, value) {
      this.config = undefined;
      this.configProvider = this.configProvider.then((config) => ({
        ...config,
        [key]: value,
      }));
    }
    httpHandlerConfigs() {
      return this.config ?? {};
    }
  }
  class pt {
    sessions = [];
    constructor(sessions) {
      this.sessions = sessions ?? [];
    }
    poll() {
      if (this.sessions.length > 0) return this.sessions.shift();
    }
    offerLast(ref) {
      this.sessions.push(ref);
    }
    contains(e) {
      return this.sessions.includes(e);
    }
    remove(e) {
      this.sessions = this.sessions.filter((session) => session !== e);
    }
    [Symbol.iterator]() {
      return this.sessions[Symbol.iterator]();
    }
    destroy(e) {
      for (let session of this.sessions)
        if (session === e) {
          if (!session.destroyed) session.destroy();
        }
    }
  }
  class ht {
    constructor(config) {
      this.config = config;
      if (this.config.maxConcurrency && this.config.maxConcurrency <= 0)
        throw RangeError("maxConcurrency must be greater than zero.");
    }
    config;
    sessionCache = new Map();
    lease(requestContext, connectionConfiguration) {
      let n = this.getUrlString(requestContext);
      let o = this.sessionCache.get(n);
      if (o) {
        let u = o.poll();
        if (u && !this.config.disableConcurrency) return u;
      }
      let s = http2.connect(n);
      if (this.config.maxConcurrency)
        s.settings(
          {
            maxConcurrentStreams: this.config.maxConcurrency,
          },
          (u) => {
            if (u)
              throw Error(
                "Fail to set maxConcurrentStreams to " +
                  this.config.maxConcurrency +
                  "when creating new session for " +
                  requestContext.destination.toString(),
              );
          },
        );
      s.unref();
      let destroySessionCb = () => {
        s.destroy();
        this.deleteSession(n, s);
      };
      s.on("goaway", destroySessionCb);
      s.on("error", destroySessionCb);
      s.on("frameError", destroySessionCb);
      s.on("close", () => this.deleteSession(n, s));
      if (connectionConfiguration.requestTimeout)
        s.setTimeout(connectionConfiguration.requestTimeout, destroySessionCb);
      let a = this.sessionCache.get(n) || new pt();
      a.offerLast(s);
      this.sessionCache.set(n, a);
      return s;
    }
    deleteSession(e, r) {
      let n = this.sessionCache.get(e);
      if (!n) return;
      if (!n.contains(r)) return;
      n.remove(r);
      this.sessionCache.set(e, n);
    }
    release(e, r) {
      let session = this.getUrlString(e);
      this.sessionCache.get(session)?.offerLast(r);
    }
    destroy() {
      for (let [url, r] of this.sessionCache) {
        for (let n of r) {
          if (!n.destroyed) n.destroy();
          r.remove(n);
        }
        this.sessionCache.delete(url);
      }
    }
    setMaxConcurrentStreams(maxConcurrentStreams) {
      if (maxConcurrentStreams && maxConcurrentStreams <= 0)
        throw RangeError("maxConcurrentStreams must be greater than zero.");
      this.config.maxConcurrency = maxConcurrentStreams;
    }
    setDisableConcurrentStreams(disableConcurrentStreams) {
      this.config.disableConcurrency = disableConcurrentStreams;
    }
    getUrlString(request) {
      return request.destination.toString();
    }
  }
  class NodeHttp2Handler {
    config;
    configProvider;
    metadata = {
      handlerProtocol: "h2",
    };
    connectionManager = new ht({});
    static create(instanceOrOptions) {
      if (typeof instanceOrOptions?.handle === "function") return instanceOrOptions;
      return new NodeHttp2Handler(instanceOrOptions);
    }
    constructor(options) {
      this.configProvider = new Promise((resolve, reject) => {
        if (typeof options === "function")
          options()
            .then((opts) => {
              resolve(opts || {});
            })
            .catch(reject);
        else resolve(options || {});
      });
    }
    destroy() {
      this.connectionManager.destroy();
    }
    async handle(request, { abortSignal, requestTimeout } = {}) {
      if (!this.config) {
        this.config = await this.configProvider;
        this.connectionManager.setDisableConcurrentStreams(this.config.disableConcurrentStreams || false);
        if (this.config.maxConcurrentStreams)
          this.connectionManager.setMaxConcurrentStreams(this.config.maxConcurrentStreams);
      }
      let { requestTimeout: configRequestTimeout, disableConcurrentStreams } = this.config;
      let effectiveRequestTimeout = requestTimeout ?? configRequestTimeout;
      return new Promise((_resolve, _reject) => {
        let fulfilled = false;
        let writeRequestBodyPromise = undefined;
        let E = async (arg) => {
          await writeRequestBodyPromise;
          _resolve(arg);
        };
        let reject = async (arg) => {
          await writeRequestBodyPromise;
          _reject(arg);
        };
        if (abortSignal?.aborted) {
          fulfilled = true;
          let abortError = Error("Request aborted");
          abortError.name = "AbortError";
          reject(abortError);
          return;
        }
        let { hostname, method, port, protocol, query } = request;
        let auth = "";
        if (request.username != null || request.password != null) {
          let username = request.username ?? "";
          let password = request.password ?? "";
          auth = `${username}:${password}@`;
        }
        let authority = `${protocol}//${auth}${hostname}${port ? `:${port}` : ""}`;
        let T = {
          destination: new URL(authority),
        };
        let w = this.connectionManager.lease(T, {
          requestTimeout: this.config?.sessionTimeout,
          disableConcurrentStreams: disableConcurrentStreams || false,
        });
        let rejectWithDestroy = (err) => {
          if (disableConcurrentStreams) this.destroySession(w);
          fulfilled = true;
          reject(err);
        };
        let queryString = querystringBuilder.buildQueryString(query || {});
        let path = request.path;
        if (queryString) path += `?${queryString}`;
        if (request.fragment) path += `#${request.fragment}`;
        let clientHttp2Stream = w.request({
          ...request.headers,
          [http2.constants.HTTP2_HEADER_PATH]: path,
          [http2.constants.HTTP2_HEADER_METHOD]: method,
        });
        w.ref();
        clientHttp2Stream.on("response", (headers) => {
          let response = new at.HttpResponse({
            statusCode: headers[":status"] || -1,
            headers: lt(headers),
            body: clientHttp2Stream,
          });
          fulfilled = true;
          E({
            response,
          });
          if (disableConcurrentStreams) {
            w.close();
            this.connectionManager.deleteSession(authority, w);
          }
        });
        if (effectiveRequestTimeout)
          clientHttp2Stream.setTimeout(effectiveRequestTimeout, () => {
            clientHttp2Stream.close();
            let timeoutError = Error(
              `Stream timed out because of no activity for ${effectiveRequestTimeout} ms`,
            );
            timeoutError.name = "TimeoutError";
            rejectWithDestroy(timeoutError);
          });
        if (abortSignal) {
          let onAbort = () => {
            clientHttp2Stream.close();
            let abortError = Error("Request aborted");
            abortError.name = "AbortError";
            rejectWithDestroy(abortError);
          };
          if (typeof abortSignal.addEventListener === "function") {
            let signal = abortSignal;
            signal.addEventListener("abort", onAbort, {
              once: true,
            });
            clientHttp2Stream.once("close", () => signal.removeEventListener("abort", onAbort));
          } else abortSignal.onabort = onAbort;
        }
        clientHttp2Stream.on("frameError", (type, code, id) => {
          rejectWithDestroy(Error(`Frame type id ${type} in stream id ${id} has failed with code ${code}.`));
        });
        clientHttp2Stream.on("error", rejectWithDestroy);
        clientHttp2Stream.on("aborted", () => {
          rejectWithDestroy(
            Error(
              `HTTP/2 stream is abnormally aborted in mid-communication with result code ${clientHttp2Stream.rstCode}.`,
            ),
          );
        });
        clientHttp2Stream.on("close", () => {
          w.unref();
          if (disableConcurrentStreams) w.destroy();
          if (!fulfilled) rejectWithDestroy(Error("Unexpected error: http2 request did not get a response"));
        });
        writeRequestBodyPromise = writeRequestBody(clientHttp2Stream, request, effectiveRequestTimeout);
      });
    }
    updateHttpClientConfig(key, value) {
      this.config = undefined;
      this.configProvider = this.configProvider.then((config) => ({
        ...config,
        [key]: value,
      }));
    }
    httpHandlerConfigs() {
      return this.config ?? {};
    }
    destroySession(e) {
      if (!e.destroyed) e.destroy();
    }
  }
  class Collector extends node_stream.Writable {
    bufferedBytes = [];
    _write(chunk, r, callback) {
      this.bufferedBytes.push(chunk);
      callback();
    }
  }
  var streamCollector = (stream) => {
    if (ln(stream)) return collectReadableStream(stream);
    return new Promise((resolve, reject) => {
      let collector = new Collector();
      stream.pipe(collector);
      stream.on("error", (err) => {
        collector.end();
        reject(err);
      });
      collector.on("error", reject);
      collector.on("finish", function () {
        let bytes = new Uint8Array(Buffer.concat(this.bufferedBytes));
        resolve(bytes);
      });
    });
  };
  var ln = (stream) => typeof ReadableStream === "function" && stream instanceof ReadableStream;
  async function collectReadableStream(stream) {
    let chunks = [];
    let reader = stream.getReader();
    let isDone = false;
    let length = 0;
    while (!isDone) {
      let { done, value } = await reader.read();
      if (value) {
        chunks.push(value);
        length += value.length;
      }
      isDone = done;
    }
    let collected = new Uint8Array(length);
    let offset = 0;
    for (let chunk of chunks) {
      collected.set(chunk, offset);
      offset += chunk.length;
    }
    return collected;
  }
  cjsExports.DEFAULT_REQUEST_TIMEOUT = DEFAULT_REQUEST_TIMEOUT;
  cjsExports.NodeHttp2Handler = NodeHttp2Handler;
  cjsExports.NodeHttpHandler = NodeHttpHandler;
  cjsExports.streamCollector = streamCollector;
});
export { require_node_http_handler };
