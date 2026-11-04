/**
 * @opentelemetry/exporter-prometheus/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/exporter-prometheus@0.217.0..0.218.0
 * pieces: chunk-1gzy30bn.js (2)
 * attribution: cjs-fingerprint 1, affinity 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_PrometheusExporter } from "./PrometheusExporter.js";
import { require_PrometheusSerializer } from "./PrometheusSerializer.js";

//@ chunk-1gzy30bn.js:6866-7224 cjs-fingerprint
var require_exporter_prometheus = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.PrometheusSerializer = cjsExports.PrometheusExporter = undefined;
  var PrometheusExporter_1 = require_PrometheusExporter();
  Object.defineProperty(cjsExports, "PrometheusExporter", {
    enumerable: true,
    get: function () {
      return PrometheusExporter_1.PrometheusExporter;
    },
  });
  var PrometheusSerializer_1 = require_PrometheusSerializer();
  Object.defineProperty(cjsExports, "PrometheusSerializer", {
    enumerable: true,
    get: function () {
      return PrometheusSerializer_1.PrometheusSerializer;
    },
  });
});
//@ chunk-1gzy30bn.js:7224-7243 affinity
export default require_exporter_prometheus();
