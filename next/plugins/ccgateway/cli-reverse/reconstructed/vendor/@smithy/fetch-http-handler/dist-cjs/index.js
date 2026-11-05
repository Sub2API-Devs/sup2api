/**
 * @smithy/fetch-http-handler/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/fetch-http-handler@5.4.0..5.5.2
 * pieces: chunk-2v4fe6xx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_protocol_http } from "../../protocol-http/dist-cjs/index.js";
import { require_querystring_builder } from "../../querystring-builder/dist-cjs/index.js";
import { base64Module } from "../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";

//@ chunk-2v4fe6xx.js:2765-5955 cjs-fingerprint
var require_fetch_http_handler = __commonJS(function (cjsExports) {
  var HttpResponse = require_protocol_http();
  var querystringBuilder = require_querystring_builder();
  var fromBase64 = base64Module();
  function createRequest(url, requestOptions) {
    return new Request(url, requestOptions);
  }
  function requestTimeout(timeoutInMs = 0) {
    return new Promise((resolve, reject) => {
      if (timeoutInMs)
        setTimeout(() => {
          let timeoutError = Error(`Request did not complete within ${timeoutInMs} ms`);
          timeoutError.name = "TimeoutError";
          reject(timeoutError);
        }, timeoutInMs);
    });
  }
  var keepAliveSupport = {
    supported: undefined,
  };
  class FetchHttpHandler {
    config;
    configProvider;
    static create(instanceOrOptions) {
      if (typeof instanceOrOptions?.handle === "function") return instanceOrOptions;
      return new FetchHttpHandler(instanceOrOptions);
    }
    constructor(options) {
      if (typeof options === "function") this.configProvider = options().then((opts) => opts || {});
      else {
        this.config = options ?? {};
        this.configProvider = Promise.resolve(this.config);
      }
      if (keepAliveSupport.supported === undefined)
        keepAliveSupport.supported = Boolean(
          typeof Request !== "undefined" && "keepalive" in createRequest("https://[::1]"),
        );
    }
    destroy() {}
    async handle(request, { abortSignal, requestTimeout: requestTimeout$1 } = {}) {
      if (!this.config) this.config = await this.configProvider;
      let requestTimeoutInMs = requestTimeout$1 ?? this.config.requestTimeout;
      let keepAlive = this.config.keepAlive === true;
      let credentials = this.config.credentials;
      if (abortSignal?.aborted) {
        let abortError = Error("Request aborted");
        abortError.name = "AbortError";
        return Promise.reject(abortError);
      }
      let path = request.path;
      let queryString = querystringBuilder.buildQueryString(request.query || {});
      if (queryString) path += `?${queryString}`;
      if (request.fragment) path += `#${request.fragment}`;
      let auth = "";
      if (request.username != null || request.password != null) {
        let username = request.username ?? "";
        let password = request.password ?? "";
        auth = `${username}:${password}@`;
      }
      let { port, method } = request;
      let url = `${request.protocol}//${auth}${request.hostname}${port ? `:${port}` : ""}${path}`;
      let body = method === "GET" || method === "HEAD" ? undefined : request.body;
      let requestOptions = {
        body,
        headers: new Headers(request.headers),
        method,
        credentials,
      };
      if (this.config?.cache) requestOptions.cache = this.config.cache;
      if (body) requestOptions.duplex = "half";
      if (typeof AbortController !== "undefined") requestOptions.signal = abortSignal;
      if (keepAliveSupport.supported) requestOptions.keepalive = keepAlive;
      if (typeof this.config.requestInit === "function")
        Object.assign(requestOptions, this.config.requestInit(request));
      let removeSignalEventListener = () => {};
      let fetchRequest = createRequest(url, requestOptions);
      let raceOfPromises = [
        fetch(fetchRequest).then((response) => {
          let fetchHeaders = response.headers;
          let transformedHeaders = {};
          for (let pair of fetchHeaders.entries()) transformedHeaders[pair[0]] = pair[1];
          if (response.body == null)
            return response.blob().then((body) => ({
              response: new HttpResponse.HttpResponse({
                headers: transformedHeaders,
                reason: response.statusText,
                statusCode: response.status,
                body,
              }),
            }));
          return {
            response: new HttpResponse.HttpResponse({
              headers: transformedHeaders,
              reason: response.statusText,
              statusCode: response.status,
              body: response.body,
            }),
          };
        }),
        requestTimeout(requestTimeoutInMs),
      ];
      if (abortSignal)
        raceOfPromises.push(
          new Promise((resolve, reject) => {
            let onAbort = () => {
              let abortError = Error("Request aborted");
              abortError.name = "AbortError";
              reject(abortError);
            };
            if (typeof abortSignal.addEventListener === "function") {
              let signal = abortSignal;
              signal.addEventListener("abort", onAbort, {
                once: true,
              });
              removeSignalEventListener = () => signal.removeEventListener("abort", onAbort);
            } else abortSignal.onabort = onAbort;
          }),
        );
      return Promise.race(raceOfPromises).finally(removeSignalEventListener);
    }
    updateHttpClientConfig(key, value) {
      this.config = undefined;
      this.configProvider = this.configProvider.then((config) => {
        config[key] = value;
        return config;
      });
    }
    httpHandlerConfigs() {
      return this.config ?? {};
    }
  }
  var streamCollector = async (stream) => {
    if ((typeof Blob === "function" && stream instanceof Blob) || stream.constructor?.name === "Blob") {
      if (Blob.prototype.arrayBuffer !== undefined) return new Uint8Array(await stream.arrayBuffer());
      return collectBlob(stream);
    }
    return collectStream(stream);
  };
  async function collectBlob(blob) {
    let base64 = await readToBase64(blob);
    let arrayBuffer = fromBase64.fromBase64(base64);
    return new Uint8Array(arrayBuffer);
  }
  async function collectStream(stream) {
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
  function readToBase64(blob) {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onloadend = () => {
        if (reader.readyState !== 2) return reject(Error("Reader aborted too early"));
        let result = reader.result ?? "";
        let commaIndex = result.indexOf(",");
        let dataOffset = commaIndex > -1 ? commaIndex + 1 : result.length;
        resolve(result.substring(dataOffset));
      };
      reader.onabort = () => reject(Error("Read aborted"));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  cjsExports.FetchHttpHandler = FetchHttpHandler;
  cjsExports.keepAliveSupport = keepAliveSupport;
  cjsExports.streamCollector = streamCollector;
});
export { require_fetch_http_handler };
