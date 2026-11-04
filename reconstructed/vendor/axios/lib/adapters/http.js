/**
 * axios/lib/adapters/http.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: axios@1.15.2
 * pieces: chunk-h6b7mazd.js (5)
 * attribution: esm-fingerprint 4, esm-layout 1
 */
import util from "util";
import http2 from "http2";
import { EventEmitter } from "events";
import stream from "stream";
import { resolve } from "path";
import https from "https";
import http from "http";
import zlib from "zlib";
import {
  getProxyForUrl,
  shouldBypassProxy,
  callbackify_default,
  CanceledError_default,
  buildFullPath,
  platform,
  supportedProtocols,
  estimateDataURLDecodedBytes,
  settle,
  fromDataURI,
  AxiosHeaders_default,
  VERSION,
  formDataToStream_default,
  blobAsyncIterator,
  AxiosTransformStream_default,
  flushOnFinish,
  progressEventDecorator,
  progressEventReducer,
  isFunctionAlias,
  isBrotliSupported,
  isHttps,
  httpsFollow,
  httpFollow,
  zlibOptions,
  ZlibHeaderTransformStream_default,
  brotliOptions,
  kAxiosSocketListener,
  kAxiosCurrentReq,
} from "../../dist/node/axios.cjs";
import { AxiosError$1, utils$1, buildURL, transitionalDefaults } from "../../dist/esm/axios.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-h6b7mazd.js:74586-75310 esm-fingerprint
class Http2Sessions {
  constructor() {
    this.sessions = Object.create(null);
  }
  getSession(authority, options) {
    options = Object.assign(
      {
        sessionTimeout: 1000,
      },
      options,
    );
    let authoritySessions = this.sessions[authority];
    if (authoritySessions) {
      let len = authoritySessions.length;
      for (let i = 0; i < len; i++) {
        let [sessionHandle, sessionOptions] = authoritySessions[i];
        if (
          !sessionHandle.destroyed &&
          !sessionHandle.closed &&
          util.isDeepStrictEqual(sessionOptions, options)
        )
          return sessionHandle;
      }
    }
    let session = http2.connect(authority, options);
    let removed;
    let removeSession = () => {
      if (removed) return;
      removed = true;
      let entries = authoritySessions;
      let len = entries.length;
      let i = len;
      while (i--)
        if (entries[i][0] === session) {
          if (len === 1) delete this.sessions[authority];
          else entries.splice(i, 1);
          if (!session.closed) session.close();
          return;
        }
    };
    let originalRequestFn = session.request;
    let { sessionTimeout } = options;
    if (sessionTimeout != null) {
      let timer;
      let streamsCount = 0;
      session.request = function () {
        let stream = originalRequestFn.apply(this, arguments);
        streamsCount++;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        stream.once("close", () => {
          if (!--streamsCount)
            timer = setTimeout(() => {
              timer = null;
              removeSession();
            }, sessionTimeout);
        });
        return stream;
      };
    }
    session.once("close", removeSession);
    let entry = [session, options];
    if (authoritySessions) authoritySessions.push(entry);
    else authoritySessions = this.sessions[authority] = [entry];
    return session;
  }
}
//@ chunk-h6b7mazd.js:75310-75324 esm-layout
var http2Sessions; // deferred: uses Http2Sessions of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-h6b7mazd.js:75310", () => {
  http2Sessions = new Http2Sessions();
});
//@ chunk-h6b7mazd.js:75324-75453 esm-fingerprint
function dispatchBeforeRedirect(options, responseDetails) {
  if (options.beforeRedirects.proxy) options.beforeRedirects.proxy(options);
  if (options.beforeRedirects.config) options.beforeRedirects.config(options, responseDetails);
}
//@ chunk-h6b7mazd.js:75453-76161 esm-fingerprint
function setProxy(options, configProxy, location) {
  let proxy = configProxy;
  if (!proxy && proxy !== false) {
    let proxyUrl = getProxyForUrl(location);
    if (proxyUrl) {
      if (!shouldBypassProxy(location)) proxy = new URL(proxyUrl);
    }
  }
  if (proxy) {
    if (proxy.username) proxy.auth = (proxy.username || "") + ":" + (proxy.password || "");
    if (proxy.auth) {
      if (Boolean(proxy.auth.username || proxy.auth.password))
        proxy.auth = (proxy.auth.username || "") + ":" + (proxy.auth.password || "");
      else if (typeof proxy.auth === "object")
        throw new AxiosError$1("Invalid proxy authorization", AxiosError$1.ERR_BAD_OPTION, {
          proxy,
        });
      let base64 = Buffer.from(proxy.auth, "utf8").toString("base64");
      options.headers["Proxy-Authorization"] = "Basic " + base64;
    }
    options.headers.host = options.hostname + (options.port ? ":" + options.port : "");
    let proxyHost = proxy.hostname || proxy.host;
    options.hostname = proxyHost;
    options.host = proxyHost;
    options.port = proxy.port;
    options.path = location;
    if (proxy.protocol)
      options.protocol = proxy.protocol.includes(":") ? proxy.protocol : `${proxy.protocol}:`;
  }
  options.beforeRedirects.proxy = function (redirectOptions) {
    setProxy(redirectOptions, configProxy, redirectOptions.href);
  };
}
//@ chunk-h6b7mazd.js:76161-85236 esm-fingerprint
var isHttpAdapterSupported; // deferred: uses toJSONObject (../../dist/esm/axios.js) of its import cycle while loading; runs once the cycle is complete
var wrapAsync;
var resolveFamily;
var buildAddressEntry;
var http2Transport;
var http_default;
deferInit("chunk-h6b7mazd.js:76161", () => {
  isHttpAdapterSupported = typeof process !== "undefined" && utils$1.kindOf(process) === "process";
  wrapAsync = (asyncExecutor) =>
    new Promise((resolve, reject) => {
      let onDone;
      let isDone;
      let done = (value, isRejected) => {
        if (isDone) return;
        isDone = true;
        if (onDone) onDone(value, isRejected);
      };
      let _resolve = (value) => {
        done(value);
        resolve(value);
      };
      let _reject = (reason) => {
        done(reason, true);
        reject(reason);
      };
      asyncExecutor(_resolve, _reject, (onDoneHandler) => (onDone = onDoneHandler)).catch(_reject);
    });
  resolveFamily = ({ address, family }) => {
    if (!utils$1.isString(address)) throw TypeError("address must be a string");
    return {
      address,
      family: family || (address.indexOf(".") < 0 ? 6 : 4),
    };
  };
  buildAddressEntry = (address, family) =>
    resolveFamily(
      utils$1.isObject(address)
        ? address
        : {
            address,
            family,
          },
    );
  http2Transport = {
    request(options, cb) {
      let authority =
        options.protocol +
        "//" +
        options.hostname +
        ":" +
        (options.port || (options.protocol === "https:" ? 443 : 80));
      let { http2Options, headers } = options;
      let session = http2Sessions.getSession(authority, http2Options);
      let { HTTP2_HEADER_SCHEME, HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH, HTTP2_HEADER_STATUS } =
        http2.constants;
      let http2Headers = {
        [HTTP2_HEADER_SCHEME]: options.protocol.replace(":", ""),
        [HTTP2_HEADER_METHOD]: options.method,
        [HTTP2_HEADER_PATH]: options.path,
      };
      utils$1.forEach(headers, (header, name) => {
        if (name.charAt(0) !== ":") http2Headers[name] = header;
      });
      let req = session.request(http2Headers);
      req.once("response", (responseHeaders) => {
        let response = req;
        responseHeaders = Object.assign({}, responseHeaders);
        let status = responseHeaders[HTTP2_HEADER_STATUS];
        delete responseHeaders[HTTP2_HEADER_STATUS];
        response.headers = responseHeaders;
        response.statusCode = +status;
        cb(response);
      });
      return req;
    },
  };
  http_default =
    isHttpAdapterSupported &&
    function (config) {
      return wrapAsync(async function (resolve_2, reject, onDone) {
        let own = (key) => (utils$1.hasOwnProp(config, key) ? config[key] : undefined);
        let data = own("data");
        let lookup = own("lookup");
        let family = own("family");
        let httpVersion = own("httpVersion");
        if (httpVersion === undefined) httpVersion = 1;
        let http2Options = own("http2Options");
        let responseType = own("responseType");
        let responseEncoding = own("responseEncoding");
        let method = config.method.toUpperCase();
        let isDone;
        let rejected = false;
        let req;
        httpVersion = +httpVersion;
        if (Number.isNaN(httpVersion))
          throw TypeError(`Invalid protocol version: '${config.httpVersion}' is not a number`);
        if (httpVersion !== 1 && httpVersion !== 2)
          throw TypeError(`Unsupported protocol version '${httpVersion}'`);
        let isHttp2 = httpVersion === 2;
        if (lookup) {
          let _lookup = callbackify_default(lookup, (value) => (utils$1.isArray(value) ? value : [value]));
          lookup = (hostname, opt, cb) => {
            _lookup(hostname, opt, (err, arg0, arg1) => {
              if (err) return cb(err);
              let addresses = utils$1.isArray(arg0)
                ? arg0.map((addr) => buildAddressEntry(addr))
                : [buildAddressEntry(arg0, arg1)];
              if (opt.all) cb(err, addresses);
              else cb(err, addresses[0].address, addresses[0].family);
            });
          };
        }
        let abortEmitter = new EventEmitter();
        function abort(reason) {
          try {
            abortEmitter.emit(
              "abort",
              !reason || reason.type ? new CanceledError_default(null, config, req) : reason,
            );
          } catch (err) {
            console.warn("emit error", err);
          }
        }
        abortEmitter.once("abort", reject);
        let onFinished = () => {
          if (config.cancelToken) config.cancelToken.unsubscribe(abort);
          if (config.signal) config.signal.removeEventListener("abort", abort);
          abortEmitter.removeAllListeners();
        };
        if (config.cancelToken || config.signal) {
          if (config.cancelToken) config.cancelToken.subscribe(abort);
          if (config.signal) {
            if (config.signal.aborted) abort();
            else config.signal.addEventListener("abort", abort);
          }
        }
        onDone((response, isRejected) => {
          isDone = true;
          if (isRejected) {
            rejected = true;
            onFinished();
            return;
          }
          let { data } = response;
          if (data instanceof stream.Readable || data instanceof stream.Duplex) {
            let offListeners = stream.finished(data, () => {
              offListeners();
              onFinished();
            });
          } else onFinished();
        });
        let fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
        let parsed = new URL(fullPath, platform.hasBrowserEnv ? platform.origin : undefined);
        let protocol = parsed.protocol || supportedProtocols[0];
        if (protocol === "data:") {
          if (config.maxContentLength > -1) {
            let url = String(config.url || fullPath || "");
            if (estimateDataURLDecodedBytes(url) > config.maxContentLength)
              return reject(
                new AxiosError$1(
                  "maxContentLength size of " + config.maxContentLength + " exceeded",
                  AxiosError$1.ERR_BAD_RESPONSE,
                  config,
                ),
              );
          }
          let convertedData;
          if (method !== "GET")
            return settle(resolve_2, reject, {
              status: 405,
              statusText: "method not allowed",
              headers: {},
              config,
            });
          try {
            convertedData = fromDataURI(config.url, responseType === "blob", {
              Blob: config.env && config.env.Blob,
            });
          } catch (err) {
            throw AxiosError$1.from(err, AxiosError$1.ERR_BAD_REQUEST, config);
          }
          if (responseType === "text") {
            convertedData = convertedData.toString(responseEncoding);
            if (!responseEncoding || responseEncoding === "utf8")
              convertedData = utils$1.stripBOM(convertedData);
          } else if (responseType === "stream") convertedData = stream.Readable.from(convertedData);
          return settle(resolve_2, reject, {
            data: convertedData,
            status: 200,
            statusText: "OK",
            headers: new AxiosHeaders_default(),
            config,
          });
        }
        if (supportedProtocols.indexOf(protocol) === -1)
          return reject(
            new AxiosError$1("Unsupported protocol " + protocol, AxiosError$1.ERR_BAD_REQUEST, config),
          );
        let headers = AxiosHeaders_default.from(config.headers).normalize();
        headers.set("User-Agent", "axios/" + VERSION, false);
        let { onUploadProgress, onDownloadProgress } = config;
        let maxRate = config.maxRate;
        let maxUploadRate = undefined;
        let maxDownloadRate = undefined;
        if (utils$1.isSpecCompliantForm(data)) {
          let userBoundary = headers.getContentType(/boundary=([-_\w\d]{10,70})/i);
          data = formDataToStream_default(
            data,
            (formHeaders) => {
              headers.set(formHeaders);
            },
            {
              tag: `axios-${VERSION}-boundary`,
              boundary: (userBoundary && userBoundary[1]) || undefined,
            },
          );
        } else if (
          utils$1.isFormData(data) &&
          utils$1.isFunction(data.getHeaders) &&
          data.getHeaders !== Object.prototype.getHeaders
        ) {
          headers.set(data.getHeaders());
          if (!headers.hasContentLength())
            try {
              let knownLength = await util.promisify(data.getLength).call(data);
              if (Number.isFinite(knownLength) && knownLength >= 0) headers.setContentLength(knownLength);
            } catch (e) {}
        } else if (utils$1.isBlob(data) || utils$1.isFile(data)) {
          if (data.size) headers.setContentType(data.type || "application/octet-stream");
          headers.setContentLength(data.size || 0);
          data = stream.Readable.from(blobAsyncIterator(data));
        } else if (data && !utils$1.isStream(data)) {
          if (Buffer.isBuffer(data));
          else if (utils$1.isArrayBuffer(data)) data = Buffer.from(new Uint8Array(data));
          else if (utils$1.isString(data)) data = Buffer.from(data, "utf-8");
          else
            return reject(
              new AxiosError$1(
                "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
                AxiosError$1.ERR_BAD_REQUEST,
                config,
              ),
            );
          headers.setContentLength(data.length, false);
          if (config.maxBodyLength > -1 && data.length > config.maxBodyLength)
            return reject(
              new AxiosError$1(
                "Request body larger than maxBodyLength limit",
                AxiosError$1.ERR_BAD_REQUEST,
                config,
              ),
            );
        }
        let contentLength = utils$1.toFiniteNumber(headers.getContentLength());
        if (utils$1.isArray(maxRate)) {
          maxUploadRate = maxRate[0];
          maxDownloadRate = maxRate[1];
        } else maxUploadRate = maxDownloadRate = maxRate;
        if (data && (onUploadProgress || maxUploadRate)) {
          if (!utils$1.isStream(data))
            data = stream.Readable.from(data, {
              objectMode: false,
            });
          data = stream.pipeline(
            [
              data,
              new AxiosTransformStream_default({
                maxRate: utils$1.toFiniteNumber(maxUploadRate),
              }),
            ],
            utils$1.noop,
          );
          if (onUploadProgress)
            data.on(
              "progress",
              flushOnFinish(
                data,
                progressEventDecorator(
                  contentLength,
                  progressEventReducer(isFunctionAlias(onUploadProgress), false, 3),
                ),
              ),
            );
        }
        let auth = undefined;
        let configAuth = own("auth");
        if (configAuth) {
          let username = configAuth.username || "";
          let password = configAuth.password || "";
          auth = username + ":" + password;
        }
        if (!auth && parsed.username) {
          let { username, password } = parsed;
          auth = username + ":" + password;
        }
        if (auth) headers.delete("authorization");
        let path;
        try {
          path = buildURL(parsed.pathname + parsed.search, config.params, config.paramsSerializer).replace(
            /^\?/,
            "",
          );
        } catch (err) {
          let customErr = Error(err.message);
          customErr.config = config;
          customErr.url = config.url;
          customErr.exists = true;
          return reject(customErr);
        }
        headers.set("Accept-Encoding", "gzip, compress, deflate" + (isBrotliSupported ? ", br" : ""), false);
        let options = Object.assign(Object.create(null), {
          path,
          method,
          headers: headers.toJSON(),
          agents: {
            http: config.httpAgent,
            https: config.httpsAgent,
          },
          auth,
          protocol,
          family,
          beforeRedirect: dispatchBeforeRedirect,
          beforeRedirects: Object.create(null),
          http2Options,
        });
        if (!utils$1.isUndefined(lookup)) options.lookup = lookup;
        if (config.socketPath) {
          if (typeof config.socketPath !== "string")
            return reject(
              new AxiosError$1("socketPath must be a string", AxiosError$1.ERR_BAD_OPTION_VALUE, config),
            );
          if (config.allowedSocketPaths != null) {
            let allowed = Array.isArray(config.allowedSocketPaths)
              ? config.allowedSocketPaths
              : [config.allowedSocketPaths];
            let resolvedSocketPath = resolve(config.socketPath);
            if (!allowed.some((entry) => typeof entry === "string" && resolve(entry) === resolvedSocketPath))
              return reject(
                new AxiosError$1(
                  `socketPath "${config.socketPath}" is not permitted by allowedSocketPaths`,
                  AxiosError$1.ERR_BAD_OPTION_VALUE,
                  config,
                ),
              );
          }
          options.socketPath = config.socketPath;
        } else {
          options.hostname = parsed.hostname.startsWith("[") ? parsed.hostname.slice(1, -1) : parsed.hostname;
          options.port = parsed.port;
          setProxy(
            options,
            config.proxy,
            protocol + "//" + parsed.hostname + (parsed.port ? ":" + parsed.port : "") + options.path,
          );
        }
        let transport;
        let isHttpsRequest = isHttps.test(options.protocol);
        options.agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;
        if (isHttp2) transport = http2Transport;
        else {
          let configTransport = own("transport");
          if (configTransport) transport = configTransport;
          else if (config.maxRedirects === 0) transport = isHttpsRequest ? https : http;
          else {
            if (config.maxRedirects) options.maxRedirects = config.maxRedirects;
            let configBeforeRedirect = own("beforeRedirect");
            if (configBeforeRedirect) options.beforeRedirects.config = configBeforeRedirect;
            transport = isHttpsRequest ? httpsFollow : httpFollow;
          }
        }
        if (config.maxBodyLength > -1) options.maxBodyLength = config.maxBodyLength;
        else options.maxBodyLength = 1 / 0;
        options.insecureHTTPParser = Boolean(own("insecureHTTPParser"));
        req = transport.request(options, function (res) {
          if (req.destroyed) return;
          let streams = [res];
          let responseLength = utils$1.toFiniteNumber(res.headers["content-length"]);
          if (onDownloadProgress || maxDownloadRate) {
            let transformStream = new AxiosTransformStream_default({
              maxRate: utils$1.toFiniteNumber(maxDownloadRate),
            });
            if (onDownloadProgress)
              transformStream.on(
                "progress",
                flushOnFinish(
                  transformStream,
                  progressEventDecorator(
                    responseLength,
                    progressEventReducer(isFunctionAlias(onDownloadProgress), true, 3),
                  ),
                ),
              );
            streams.push(transformStream);
          }
          let responseStream = res;
          let lastRequest = res.req || req;
          if (config.decompress !== false && res.headers["content-encoding"]) {
            if (method === "HEAD" || res.statusCode === 204) delete res.headers["content-encoding"];
            switch ((res.headers["content-encoding"] || "").toLowerCase()) {
              case "gzip":
              case "x-gzip":
              case "compress":
              case "x-compress":
                streams.push(zlib.createUnzip(zlibOptions));
                delete res.headers["content-encoding"];
                break;
              case "deflate":
                streams.push(new ZlibHeaderTransformStream_default());
                streams.push(zlib.createUnzip(zlibOptions));
                delete res.headers["content-encoding"];
                break;
              case "br":
                if (isBrotliSupported) {
                  streams.push(zlib.createBrotliDecompress(brotliOptions));
                  delete res.headers["content-encoding"];
                }
            }
          }
          responseStream = streams.length > 1 ? stream.pipeline(streams, utils$1.noop) : streams[0];
          let response = {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: new AxiosHeaders_default(res.headers),
            config,
            request: lastRequest,
          };
          if (responseType === "stream") {
            if (config.maxContentLength > -1) {
              let limit = config.maxContentLength;
              let source = responseStream;
              async function* enforceMaxContentLength() {
                let totalResponseBytes = 0;
                for await (let chunk of source) {
                  totalResponseBytes += chunk.length;
                  if (totalResponseBytes > limit)
                    throw new AxiosError$1(
                      "maxContentLength size of " + limit + " exceeded",
                      AxiosError$1.ERR_BAD_RESPONSE,
                      config,
                      lastRequest,
                    );
                  yield chunk;
                }
              }
              responseStream = stream.Readable.from(enforceMaxContentLength(), {
                objectMode: false,
              });
            }
            response.data = responseStream;
            settle(resolve_2, reject, response);
          } else {
            let responseBuffer = [];
            let totalResponseBytes = 0;
            responseStream.on("data", function (chunk) {
              responseBuffer.push(chunk);
              totalResponseBytes += chunk.length;
              if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
                rejected = true;
                responseStream.destroy();
                abort(
                  new AxiosError$1(
                    "maxContentLength size of " + config.maxContentLength + " exceeded",
                    AxiosError$1.ERR_BAD_RESPONSE,
                    config,
                    lastRequest,
                  ),
                );
              }
            });
            responseStream.on("aborted", function () {
              if (rejected) return;
              let err = new AxiosError$1(
                "stream has been aborted",
                AxiosError$1.ERR_BAD_RESPONSE,
                config,
                lastRequest,
              );
              responseStream.destroy(err);
              reject(err);
            });
            responseStream.on("error", function (err) {
              if (rejected) return;
              reject(AxiosError$1.from(err, null, config, lastRequest));
            });
            responseStream.on("end", function () {
              try {
                let responseData =
                  responseBuffer.length === 1 ? responseBuffer[0] : Buffer.concat(responseBuffer);
                if (responseType !== "arraybuffer") {
                  responseData = responseData.toString(responseEncoding);
                  if (!responseEncoding || responseEncoding === "utf8")
                    responseData = utils$1.stripBOM(responseData);
                }
                response.data = responseData;
              } catch (err) {
                return reject(AxiosError$1.from(err, null, config, response.request, response));
              }
              settle(resolve_2, reject, response);
            });
          }
          abortEmitter.once("abort", (err) => {
            if (!responseStream.destroyed) {
              responseStream.emit("error", err);
              responseStream.destroy();
            }
          });
        });
        abortEmitter.once("abort", (err) => {
          if (req.close) req.close();
          else req.destroy(err);
        });
        req.on("error", function (err) {
          reject(AxiosError$1.from(err, null, config, req));
        });
        req.on("socket", function (socket) {
          socket.setKeepAlive(true, 60000);
          if (!socket[kAxiosSocketListener]) {
            socket.on("error", function (err) {
              let current = socket[kAxiosCurrentReq];
              if (current && !current.destroyed) current.destroy(err);
            });
            socket[kAxiosSocketListener] = true;
          }
          socket[kAxiosCurrentReq] = req;
          req.once("close", function () {
            if (socket[kAxiosCurrentReq] === req) socket[kAxiosCurrentReq] = null;
          });
        });
        if (config.timeout) {
          let timeout = parseInt(config.timeout, 10);
          if (Number.isNaN(timeout)) {
            abort(
              new AxiosError$1(
                "error trying to parse `config.timeout` to int",
                AxiosError$1.ERR_BAD_OPTION_VALUE,
                config,
                req,
              ),
            );
            return;
          }
          req.setTimeout(timeout, function () {
            if (isDone) return;
            let timeoutErrorMessage = config.timeout
              ? "timeout of " + config.timeout + "ms exceeded"
              : "timeout exceeded";
            let transitional = config.transitional || transitionalDefaults;
            if (config.timeoutErrorMessage) timeoutErrorMessage = config.timeoutErrorMessage;
            abort(
              new AxiosError$1(
                timeoutErrorMessage,
                transitional.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED,
                config,
                req,
              ),
            );
          });
        } else req.setTimeout(0);
        if (utils$1.isStream(data)) {
          let ended = false;
          let errored = false;
          data.on("end", () => {
            ended = true;
          });
          data.once("error", (err) => {
            errored = true;
            req.destroy(err);
          });
          data.on("close", () => {
            if (!ended && !errored)
              abort(new CanceledError_default("Request stream has been aborted", config, req));
          });
          let uploadStream = data;
          if (config.maxBodyLength > -1 && config.maxRedirects === 0) {
            let limit = config.maxBodyLength;
            let bytesSent = 0;
            uploadStream = stream.pipeline(
              [
                data,
                new stream.Transform({
                  transform(chunk, _enc, cb) {
                    bytesSent += chunk.length;
                    if (bytesSent > limit)
                      return cb(
                        new AxiosError$1(
                          "Request body larger than maxBodyLength limit",
                          AxiosError$1.ERR_BAD_REQUEST,
                          config,
                          req,
                        ),
                      );
                    cb(null, chunk);
                  },
                }),
              ],
              utils$1.noop,
            );
            uploadStream.on("error", (err) => {
              if (!req.destroyed) req.destroy(err);
            });
          }
          uploadStream.pipe(req);
        } else {
          if (data) req.write(data);
          req.end();
        }
      });
    };
});
export { http_default };
