/**
 * @opentelemetry/otlp-exporter-base/build/src/transport/http-exporter-transport.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_http_transport_utils } from "./http-transport-utils.js";

//@ chunk-798ashq9.js:259927-260741 cjs-fingerprint
var require_http_exporter_transport = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createHttpExporterTransport = undefined;
  var http_transport_utils_1 = require_http_transport_utils();
  class HttpExporterTransport {
    _parameters;
    _utils = null;
    constructor(_parameters) {
      this._parameters = _parameters;
    }
    async send(data, timeoutMillis) {
      let { agent, request } = await this._loadUtils();
      let headers = await this._parameters.headers();
      return new Promise((resolve) => {
        http_transport_utils_1.sendWithHttp(
          request,
          this._parameters.url,
          headers,
          this._parameters.compression,
          this._parameters.userAgent,
          agent,
          data,
          (result) => {
            resolve(result);
          },
          timeoutMillis,
        );
      });
    }
    shutdown() {}
    async _loadUtils() {
      let utils = this._utils;
      if (utils === null) {
        let protocol = new URL(this._parameters.url).protocol;
        let [agent, request] = await Promise.all([
          this._parameters.agentFactory(protocol),
          requestFunctionFactory(protocol),
        ]);
        utils = this._utils = {
          agent,
          request,
        };
      }
      return utils;
    }
  }
  async function requestFunctionFactory(protocol) {
    let httpModule = protocol === "http:" ? import("http") : import("https");
    let { request } = await httpModule;
    return request;
  }
  function createHttpExporterTransport(parameters) {
    return new HttpExporterTransport(parameters);
  }
  cjsExports.createHttpExporterTransport = createHttpExporterTransport;
});
export { require_http_exporter_transport };
