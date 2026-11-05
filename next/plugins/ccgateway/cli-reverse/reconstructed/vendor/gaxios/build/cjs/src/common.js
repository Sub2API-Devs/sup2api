/**
 * gaxios/build/cjs/src/common.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: gaxios@7.1.4
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_extend } from "../../../../extend/index.js";
import { require_util_2 } from "./util.cjs";

//@ chunk-e8d3a8an.js:4014-8062 cjs-fingerprint
var require_common = __commonJS(function (cjsExports) {
  var __importDefault =
    (cjsExports && cjsExports.__importDefault) ||
    function (mod) {
      return mod && mod.__esModule
        ? mod
        : {
            default: mod,
          };
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.GaxiosError = cjsExports.GAXIOS_ERROR_SYMBOL = undefined;
  cjsExports.defaultErrorRedactor = defaultErrorRedactor;
  var extend_1 = __importDefault(require_extend());
  var util_cjs_1 = __importDefault(require_util_2());
  var pkg = util_cjs_1.default.pkg;
  cjsExports.GAXIOS_ERROR_SYMBOL = Symbol.for(`${pkg.name}-gaxios-error`);
  class GaxiosError extends Error {
    config;
    response;
    code;
    status;
    error;
    [cjsExports.GAXIOS_ERROR_SYMBOL] = pkg.version;
    static [Symbol.hasInstance](instance) {
      if (
        instance &&
        typeof instance === "object" &&
        cjsExports.GAXIOS_ERROR_SYMBOL in instance &&
        instance[cjsExports.GAXIOS_ERROR_SYMBOL] === pkg.version
      )
        return true;
      return Function.prototype[Symbol.hasInstance].call(GaxiosError, instance);
    }
    constructor(message, config, response, cause) {
      super(message, {
        cause,
      });
      this.config = config;
      this.response = response;
      this.error = cause instanceof Error ? cause : undefined;
      this.config = (0, extend_1.default)(true, {}, config);
      if (this.response) this.response.config = (0, extend_1.default)(true, {}, this.response.config);
      if (this.response) {
        try {
          this.response.data = translateData(
            this.config.responseType,
            this.response?.bodyUsed ? this.response?.data : undefined,
          );
        } catch {}
        this.status = this.response.status;
      }
      if (cause instanceof DOMException) this.code = cause.name;
      else if (
        cause &&
        typeof cause === "object" &&
        "code" in cause &&
        (typeof cause.code === "string" || typeof cause.code === "number")
      )
        this.code = cause.code;
    }
    static extractAPIErrorFromResponse(res, defaultErrorMessage = "The request failed") {
      let message = defaultErrorMessage;
      if (typeof res.data === "string") message = res.data;
      if (res.data && typeof res.data === "object" && "error" in res.data && res.data.error && !res.ok) {
        if (typeof res.data.error === "string")
          return {
            message: res.data.error,
            code: res.status,
            status: res.statusText,
          };
        if (typeof res.data.error === "object") {
          message =
            "message" in res.data.error && typeof res.data.error.message === "string"
              ? res.data.error.message
              : message;
          let status =
            "status" in res.data.error && typeof res.data.error.status === "string"
              ? res.data.error.status
              : res.statusText;
          let code =
            "code" in res.data.error && typeof res.data.error.code === "number"
              ? res.data.error.code
              : res.status;
          if ("errors" in res.data.error && Array.isArray(res.data.error.errors)) {
            let errorMessages = [];
            for (let e of res.data.error.errors)
              if (typeof e === "object" && "message" in e && typeof e.message === "string")
                errorMessages.push(e.message);
            return Object.assign(
              {
                message:
                  errorMessages.join(`
`) || message,
                code,
                status,
              },
              res.data.error,
            );
          }
          return Object.assign(
            {
              message,
              code,
              status,
            },
            res.data.error,
          );
        }
      }
      return {
        message,
        code: res.status,
        status: res.statusText,
      };
    }
  }
  cjsExports.GaxiosError = GaxiosError;
  function translateData(responseType, data) {
    switch (responseType) {
      case "stream":
        return data;
      case "json":
        return JSON.parse(JSON.stringify(data));
      case "arraybuffer":
        return JSON.parse(Buffer.from(data).toString("utf8"));
      case "blob":
        return JSON.parse(data.text());
      default:
        return data;
    }
  }
  function defaultErrorRedactor(data) {
    function redactHeaders(headers) {
      if (!headers) return;
      headers.forEach((_, key) => {
        if (/^authentication$/i.test(key) || /^authorization$/i.test(key) || /secret/i.test(key))
          headers.set(key, "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.");
      });
    }
    function redactString(obj, key) {
      if (typeof obj === "object" && obj !== null && typeof obj[key] === "string") {
        let text = obj[key];
        if (/grant_type=/i.test(text) || /assertion=/i.test(text) || /secret/i.test(text))
          obj[key] = "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.";
      }
    }
    function redactObject(obj) {
      if (!obj || typeof obj !== "object") return;
      else if (
        obj instanceof FormData ||
        obj instanceof URLSearchParams ||
        ("forEach" in obj && "set" in obj)
      )
        obj.forEach((_, key) => {
          if (["grant_type", "assertion"].includes(key) || /secret/.test(key))
            obj.set(key, "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.");
        });
      else {
        if ("grant_type" in obj)
          obj.grant_type = "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.";
        if ("assertion" in obj)
          obj.assertion = "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.";
        if ("client_secret" in obj)
          obj.client_secret = "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.";
      }
    }
    if (data.config) {
      redactHeaders(data.config.headers);
      redactString(data.config, "data");
      redactObject(data.config.data);
      redactString(data.config, "body");
      redactObject(data.config.body);
      if (data.config.url.searchParams.has("token"))
        data.config.url.searchParams.set(
          "token",
          "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.",
        );
      if (data.config.url.searchParams.has("client_secret"))
        data.config.url.searchParams.set(
          "client_secret",
          "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.",
        );
    }
    if (data.response) {
      defaultErrorRedactor({
        config: data.response.config,
      });
      redactHeaders(data.response.headers);
      if (data.response.bodyUsed) {
        redactString(data.response, "data");
        redactObject(data.response.data);
      }
    }
    return data;
  }
});
export { require_common };
