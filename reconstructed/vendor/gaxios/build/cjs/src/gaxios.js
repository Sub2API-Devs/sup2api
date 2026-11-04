/**
 * gaxios/build/cjs/src/gaxios.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: gaxios@7.1.4
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire, __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_extend } from "../../../../extend/index.js";
import { require_common } from "./common.js";
import { require_retry } from "./retry.js";
import { require_interceptor } from "./interceptor.js";

//@ chunk-na3pph4p.js:10271-17413 cjs-fingerprint
var require_gaxios = __commonJS(function (cjsExports) {
  var __importDefault =
    (cjsExports && cjsExports.__importDefault) ||
    function (mod) {
      return mod && mod.__esModule
        ? mod
        : {
            default: mod,
          };
    };
  var _a;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Gaxios = undefined;
  var extend_1 = __importDefault(require_extend());
  var https_1 = importMetaRequire("https");
  var common_js_1 = require_common();
  var retry_js_1 = require_retry();
  var stream_1 = importMetaRequire("stream");
  var interceptor_js_1 = require_interceptor();
  var randomUUID = async () => globalThis.crypto?.randomUUID() || (await import("crypto")).randomUUID();
  var HTTP_STATUS_NO_CONTENT = 204;
  class Gaxios {
    agentCache = new Map();
    defaults;
    interceptors;
    constructor(defaults) {
      this.defaults = defaults || {};
      this.interceptors = {
        request: new interceptor_js_1.GaxiosInterceptorManager(),
        response: new interceptor_js_1.GaxiosInterceptorManager(),
      };
    }
    fetch(...args) {
      let input = args[0];
      let init = args[1];
      let url = undefined;
      let headers = new Headers();
      if (typeof input === "string") url = new URL(input);
      else if (input instanceof URL) url = input;
      else if (input && input.url) url = new URL(input.url);
      if (input && typeof input === "object" && "headers" in input) _a.mergeHeaders(headers, input.headers);
      if (init) _a.mergeHeaders(headers, new Headers(init.headers));
      if (typeof input === "object" && !(input instanceof URL))
        return this.request({
          ...init,
          ...input,
          headers,
          url,
        });
      else
        return this.request({
          ...init,
          headers,
          url,
        });
    }
    async request(opts = {}) {
      let prepared = await this.#s(opts);
      prepared = await this.#t(prepared);
      return this.#r(this._request(prepared));
    }
    async _defaultAdapter(config) {
      let fetchImpl = config.fetchImplementation || this.defaults.fetchImplementation || (await _a.#c());
      let preparedOpts = {
        ...config,
      };
      delete preparedOpts.data;
      let res = await fetchImpl(config.url, preparedOpts);
      let data = await this.getResponseData(config, res);
      if (!Object.getOwnPropertyDescriptor(res, "data")?.configurable)
        Object.defineProperties(res, {
          data: {
            configurable: true,
            writable: true,
            enumerable: true,
            value: data,
          },
        });
      return Object.assign(res, {
        config,
        data,
      });
    }
    async _request(opts) {
      try {
        let translatedResponse;
        if (opts.adapter) translatedResponse = await opts.adapter(opts, this._defaultAdapter.bind(this));
        else translatedResponse = await this._defaultAdapter(opts);
        if (!opts.validateStatus(translatedResponse.status)) {
          if (opts.responseType === "stream") {
            let response = [];
            for await (let chunk of translatedResponse.data) response.push(chunk);
            translatedResponse.data = response.toString();
          }
          let errorInfo = common_js_1.GaxiosError.extractAPIErrorFromResponse(
            translatedResponse,
            `Request failed with status code ${translatedResponse.status}`,
          );
          throw new common_js_1.GaxiosError(errorInfo?.message, opts, translatedResponse, errorInfo);
        }
        return translatedResponse;
      } catch (e) {
        let err;
        if (e instanceof common_js_1.GaxiosError) err = e;
        else if (e instanceof Error) err = new common_js_1.GaxiosError(e.message, opts, undefined, e);
        else err = new common_js_1.GaxiosError("Unexpected Gaxios Error", opts, undefined, e);
        let { shouldRetry, config } = await retry_js_1.getRetryConfig(err);
        if (shouldRetry && config) {
          err.config.retryConfig.currentRetryAttempt = config.retryConfig.currentRetryAttempt;
          opts.retryConfig = err.config?.retryConfig;
          this.#n(opts);
          return this._request(opts);
        }
        if (opts.errorRedactor) opts.errorRedactor(err);
        throw err;
      }
    }
    async getResponseData(opts, res) {
      if (res.status === HTTP_STATUS_NO_CONTENT) return "";
      if (
        opts.maxContentLength &&
        res.headers.has("content-length") &&
        opts.maxContentLength < Number.parseInt(res.headers?.get("content-length") || "")
      )
        throw new common_js_1.GaxiosError(
          "Response's `Content-Length` is over the limit.",
          opts,
          Object.assign(res, {
            config: opts,
          }),
        );
      switch (opts.responseType) {
        case "stream":
          return res.body;
        case "json": {
          let data = await res.text();
          try {
            return JSON.parse(data);
          } catch {
            return data;
          }
        }
        case "arraybuffer":
          return res.arrayBuffer();
        case "blob":
          return res.blob();
        case "text":
          return res.text();
        default:
          return this.getResponseDataFromContentType(res);
      }
    }
    #e(url, noProxy = []) {
      let candidate = new URL(url);
      let noProxyList = [...noProxy];
      let noProxyEnvList = (process.env.NO_PROXY ?? process.env.no_proxy)?.split(",") || [];
      for (let rule of noProxyEnvList) noProxyList.push(rule.trim());
      for (let rule of noProxyList)
        if (rule instanceof RegExp) {
          if (rule.test(candidate.toString())) return false;
        } else if (rule instanceof URL) {
          if (rule.origin === candidate.origin) return false;
        } else if (rule.startsWith("*.") || rule.startsWith(".")) {
          let cleanedRule = rule.replace(/^\*\./, ".");
          if (candidate.hostname.endsWith(cleanedRule)) return false;
        } else if (rule === candidate.origin || rule === candidate.hostname || rule === candidate.href)
          return false;
      return true;
    }
    async #t(options) {
      let promiseChain = Promise.resolve(options);
      for (let interceptor of this.interceptors.request.values())
        if (interceptor) promiseChain = promiseChain.then(interceptor.resolved, interceptor.rejected);
      return promiseChain;
    }
    async #r(response) {
      let promiseChain = Promise.resolve(response);
      for (let interceptor of this.interceptors.response.values())
        if (interceptor) promiseChain = promiseChain.then(interceptor.resolved, interceptor.rejected);
      return promiseChain;
    }
    async #s(options) {
      let preparedHeaders = new Headers(this.defaults.headers);
      _a.mergeHeaders(preparedHeaders, options.headers);
      let opts = (0, extend_1.default)(true, {}, this.defaults, options);
      if (!opts.url) throw Error("URL is required.");
      if (opts.baseURL) opts.url = new URL(opts.url, opts.baseURL);
      opts.url = new URL(opts.url);
      if (opts.params)
        if (opts.paramsSerializer) {
          let additionalQueryParams = opts.paramsSerializer(opts.params);
          if (additionalQueryParams.startsWith("?")) additionalQueryParams = additionalQueryParams.slice(1);
          let prefix = opts.url.toString().includes("?") ? "&" : "?";
          opts.url = opts.url + prefix + additionalQueryParams;
        } else {
          let url = opts.url instanceof URL ? opts.url : new URL(opts.url);
          for (let [key, value] of new URLSearchParams(opts.params)) url.searchParams.append(key, value);
          opts.url = url;
        }
      if (typeof options.maxContentLength === "number") opts.size = options.maxContentLength;
      if (typeof options.maxRedirects === "number") opts.follow = options.maxRedirects;
      let shouldDirectlyPassData =
        typeof opts.data === "string" ||
        opts.data instanceof ArrayBuffer ||
        opts.data instanceof Blob ||
        (globalThis.File && opts.data instanceof File) ||
        opts.data instanceof FormData ||
        opts.data instanceof stream_1.Readable ||
        opts.data instanceof ReadableStream ||
        opts.data instanceof String ||
        opts.data instanceof URLSearchParams ||
        ArrayBuffer.isView(opts.data) ||
        ["Blob", "File", "FormData"].includes(opts.data?.constructor?.name || "");
      if (opts.multipart?.length) {
        let boundary = await randomUUID();
        preparedHeaders.set("content-type", `multipart/related; boundary=${boundary}`);
        opts.body = stream_1.Readable.from(this.getMultipartRequest(opts.multipart, boundary));
      } else if (shouldDirectlyPassData) opts.body = opts.data;
      else if (typeof opts.data === "object") {
        if (preparedHeaders.get("Content-Type") === "application/x-www-form-urlencoded")
          opts.body = opts.paramsSerializer
            ? opts.paramsSerializer(opts.data)
            : new URLSearchParams(opts.data);
        else {
          if (!preparedHeaders.has("content-type")) preparedHeaders.set("content-type", "application/json");
          opts.body = JSON.stringify(opts.data);
        }
      } else if (opts.data) opts.body = opts.data;
      opts.validateStatus = opts.validateStatus || this.validateStatus;
      opts.responseType = opts.responseType || "unknown";
      if (!preparedHeaders.has("accept") && opts.responseType === "json")
        preparedHeaders.set("accept", "application/json");
      let proxy =
        opts.proxy ||
        process?.env?.HTTPS_PROXY ||
        process?.env?.https_proxy ||
        process?.env?.HTTP_PROXY ||
        process?.env?.http_proxy;
      if (opts.agent);
      else if (proxy && this.#e(opts.url, opts.noProxy)) {
        let HttpsProxyAgent = await _a.#a();
        if (this.agentCache.has(proxy)) opts.agent = this.agentCache.get(proxy);
        else {
          opts.agent = new HttpsProxyAgent(proxy, {
            cert: opts.cert,
            key: opts.key,
          });
          this.agentCache.set(proxy, opts.agent);
        }
      } else if (opts.cert && opts.key)
        if (this.agentCache.has(opts.key)) opts.agent = this.agentCache.get(opts.key);
        else {
          opts.agent = new https_1.Agent({
            cert: opts.cert,
            key: opts.key,
          });
          this.agentCache.set(opts.key, opts.agent);
        }
      if (typeof opts.errorRedactor !== "function" && opts.errorRedactor !== false)
        opts.errorRedactor = common_js_1.defaultErrorRedactor;
      if (opts.body && !("duplex" in opts)) opts.duplex = "half";
      this.#n(opts);
      return Object.assign(opts, {
        headers: preparedHeaders,
        url: opts.url instanceof URL ? opts.url : new URL(opts.url),
      });
    }
    #n(opts) {
      if (opts.timeout) {
        let timeoutSignal = AbortSignal.timeout(opts.timeout);
        if (opts.signal && !opts.signal.aborted) opts.signal = AbortSignal.any([opts.signal, timeoutSignal]);
        else opts.signal = timeoutSignal;
      }
    }
    validateStatus(status) {
      return status >= 200 && status < 300;
    }
    async getResponseDataFromContentType(response) {
      let contentType = response.headers.get("Content-Type");
      if (contentType === null) return response.text();
      contentType = contentType.toLowerCase();
      if (contentType.includes("application/json")) {
        let data = await response.text();
        try {
          data = JSON.parse(data);
        } catch {}
        return data;
      } else if (contentType.match(/^text\//)) return response.text();
      else return response.blob();
    }
    async *getMultipartRequest(multipartOptions, boundary) {
      let finale = `--${boundary}--`;
      for (let currentPart of multipartOptions) {
        let partContentType = currentPart.headers.get("Content-Type") || "application/octet-stream";
        yield `--${boundary}\r
Content-Type: ${partContentType}\r
\r
`;
        if (typeof currentPart.content === "string") yield currentPart.content;
        else yield* currentPart.content;
        yield `\r
`;
      }
      yield finale;
    }
    static #i;
    static #o;
    static async #a() {
      this.#i ||= (
        await import("../../../../https-proxy-agent/default.js").then((mod) => __toESM(mod.default))
      ).HttpsProxyAgent;
      return this.#i;
    }
    static async #c() {
      let hasWindow = typeof window !== "undefined" && !!window;
      this.#o ||= hasWindow ? window.fetch : (await import("node-fetch")).default;
      return this.#o;
    }
    static mergeHeaders(base, ...append) {
      base = base instanceof Headers ? base : new Headers(base);
      for (let headers of append)
        (headers instanceof Headers ? headers : new Headers(headers)).forEach((value, key) => {
          if (key === "set-cookie") base.append(key, value);
          else base.set(key, value);
        });
      return base;
    }
  }
  cjsExports.Gaxios = Gaxios;
  _a = Gaxios;
});
export { require_gaxios };
