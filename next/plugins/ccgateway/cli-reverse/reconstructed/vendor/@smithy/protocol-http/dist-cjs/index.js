/**
 * @smithy/protocol-http/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/protocol-http@5.3.0..5.3.14
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_types } from "../../types/dist-cjs/index.js";

//@ chunk-hq88884p.js:2578-4952 cjs-fingerprint
var require_protocol_http = __commonJS(function (cjsExports) {
  var types = require_types();
  var getHttpHandlerExtensionConfiguration = (runtimeConfig) => ({
    setHttpHandler(handler) {
      runtimeConfig.httpHandler = handler;
    },
    httpHandler() {
      return runtimeConfig.httpHandler;
    },
    updateHttpClientConfig(key, value) {
      runtimeConfig.httpHandler?.updateHttpClientConfig(key, value);
    },
    httpHandlerConfigs() {
      return runtimeConfig.httpHandler.httpHandlerConfigs();
    },
  });
  var resolveHttpHandlerRuntimeConfig = (httpHandlerExtensionConfiguration) => ({
    httpHandler: httpHandlerExtensionConfiguration.httpHandler(),
  });
  class Field {
    name;
    kind;
    values;
    constructor({ name, kind = types.FieldPosition.HEADER, values = [] }) {
      this.name = name;
      this.kind = kind;
      this.values = values;
    }
    add(value) {
      this.values.push(value);
    }
    set(values) {
      this.values = values;
    }
    remove(value) {
      this.values = this.values.filter((v) => v !== value);
    }
    toString() {
      return this.values.map((v) => (v.includes(",") || v.includes(" ") ? `"${v}"` : v)).join(", ");
    }
    get() {
      return this.values;
    }
  }
  class Fields {
    entries = {};
    encoding;
    constructor({ fields = [], encoding = "utf-8" }) {
      fields.forEach(this.setField.bind(this));
      this.encoding = encoding;
    }
    setField(field) {
      this.entries[field.name.toLowerCase()] = field;
    }
    getField(name) {
      return this.entries[name.toLowerCase()];
    }
    removeField(name) {
      delete this.entries[name.toLowerCase()];
    }
    getByType(kind) {
      return Object.values(this.entries).filter((field) => field.kind === kind);
    }
  }
  class HttpRequest {
    method;
    protocol;
    hostname;
    port;
    path;
    query;
    headers;
    username;
    password;
    fragment;
    body;
    constructor(options) {
      this.method = options.method || "GET";
      this.hostname = options.hostname || "localhost";
      this.port = options.port;
      this.query = options.query || {};
      this.headers = options.headers || {};
      this.body = options.body;
      this.protocol = options.protocol
        ? options.protocol.slice(-1) !== ":"
          ? `${options.protocol}:`
          : options.protocol
        : "https:";
      this.path = options.path ? (options.path.charAt(0) !== "/" ? `/${options.path}` : options.path) : "/";
      this.username = options.username;
      this.password = options.password;
      this.fragment = options.fragment;
    }
    static clone(request) {
      let cloned = new HttpRequest({
        ...request,
        headers: {
          ...request.headers,
        },
      });
      if (cloned.query) cloned.query = cloneQuery(cloned.query);
      return cloned;
    }
    static isInstance(request) {
      if (!request) return false;
      let req = request;
      return (
        "method" in req &&
        "protocol" in req &&
        "hostname" in req &&
        "path" in req &&
        typeof req.query === "object" &&
        typeof req.headers === "object"
      );
    }
    clone() {
      return HttpRequest.clone(this);
    }
  }
  function cloneQuery(query) {
    return Object.keys(query).reduce((carry, paramName) => {
      let param = query[paramName];
      return {
        ...carry,
        [paramName]: Array.isArray(param) ? [...param] : param,
      };
    }, {});
  }
  class HttpResponse {
    statusCode;
    reason;
    headers;
    body;
    constructor(options) {
      this.statusCode = options.statusCode;
      this.reason = options.reason;
      this.headers = options.headers || {};
      this.body = options.body;
    }
    static isInstance(response) {
      if (!response) return false;
      let resp = response;
      return typeof resp.statusCode === "number" && typeof resp.headers === "object";
    }
  }
  function isValidHostname(hostname) {
    return /^[a-z0-9][a-z0-9\.\-]*[a-z0-9]$/.test(hostname);
  }
  cjsExports.Field = Field;
  cjsExports.Fields = Fields;
  cjsExports.HttpRequest = HttpRequest;
  cjsExports.HttpResponse = HttpResponse;
  cjsExports.getHttpHandlerExtensionConfiguration = getHttpHandlerExtensionConfiguration;
  cjsExports.isValidHostname = isValidHostname;
  cjsExports.resolveHttpHandlerRuntimeConfig = resolveHttpHandlerRuntimeConfig;
});
export { require_protocol_http };
