/**
 * @opentelemetry/exporter-prometheus/build/src/PrometheusExporter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/exporter-prometheus@0.217.0..0.218.0
 * pieces: chunk-1gzy30bn.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../api/build/src/index.js";
import { require_core } from "../../../core/build/src/index.js";
import { require_sdk_metrics } from "../../../sdk-metrics/build/src/index.js";
import { require_PrometheusSerializer } from "./PrometheusSerializer.js";

//@ chunk-1gzy30bn.js:3985-6866 cjs-fingerprint
var require_PrometheusExporter = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.PrometheusExporter = undefined;
  var api_1 = require_api();
  var core_1 = require_core();
  var sdk_metrics_1 = require_sdk_metrics();
  var http_1 = importMetaRequire("http");
  var PrometheusSerializer_1 = require_PrometheusSerializer();
  var url_1 = importMetaRequire("url");
  class PrometheusExporter extends sdk_metrics_1.MetricReader {
    static DEFAULT_OPTIONS = {
      host: undefined,
      port: 9464,
      endpoint: "/metrics",
      prefix: "",
      appendTimestamp: false,
      withResourceConstantLabels: undefined,
      withoutScopeInfo: false,
      withoutTargetInfo: false,
    };
    _host;
    _port;
    _baseUrl;
    _endpoint;
    _server;
    _prefix;
    _appendTimestamp;
    _serializer;
    _startServerPromise;
    constructor(config = {}, callback = () => {}) {
      super({
        aggregationSelector: (_instrumentType) => ({
          type: sdk_metrics_1.AggregationType.DEFAULT,
        }),
        aggregationTemporalitySelector: (_instrumentType) => sdk_metrics_1.AggregationTemporality.CUMULATIVE,
        metricProducers: config.metricProducers,
      });
      this._host =
        config.host || process.env.OTEL_EXPORTER_PROMETHEUS_HOST || PrometheusExporter.DEFAULT_OPTIONS.host;
      this._port =
        config.port ||
        Number(process.env.OTEL_EXPORTER_PROMETHEUS_PORT) ||
        PrometheusExporter.DEFAULT_OPTIONS.port;
      this._prefix = config.prefix || PrometheusExporter.DEFAULT_OPTIONS.prefix;
      this._appendTimestamp =
        typeof config.appendTimestamp === "boolean"
          ? config.appendTimestamp
          : PrometheusExporter.DEFAULT_OPTIONS.appendTimestamp;
      let _withResourceConstantLabels =
        config.withResourceConstantLabels || PrometheusExporter.DEFAULT_OPTIONS.withResourceConstantLabels;
      let _withoutScopeInfo = config.withoutScopeInfo || PrometheusExporter.DEFAULT_OPTIONS.withoutScopeInfo;
      let _withoutTargetInfo =
        config.withoutTargetInfo || PrometheusExporter.DEFAULT_OPTIONS.withoutTargetInfo;
      this._server = http_1.createServer(this._requestHandler).unref();
      this._serializer = new PrometheusSerializer_1.PrometheusSerializer(
        this._prefix,
        this._appendTimestamp,
        _withResourceConstantLabels,
        _withoutTargetInfo,
        _withoutScopeInfo,
      );
      this._baseUrl = `http://${this._host}:${this._port}/`;
      this._endpoint = (config.endpoint || PrometheusExporter.DEFAULT_OPTIONS.endpoint).replace(
        /^([^/])/,
        "/$1",
      );
      if (config.preventServerStart !== true)
        this.startServer().then(callback, (err) => {
          api_1.diag.error(err);
          callback(err);
        });
      else if (callback) queueMicrotask(callback);
    }
    async onForceFlush() {}
    onShutdown() {
      return this.stopServer();
    }
    stopServer() {
      if (!this._server) {
        api_1.diag.debug("Prometheus stopServer() was called but server was never started.");
        return Promise.resolve();
      } else
        return new Promise((resolve) => {
          this._server.close((err) => {
            if (!err) api_1.diag.debug("Prometheus exporter was stopped");
            else if (err.code !== "ERR_SERVER_NOT_RUNNING") core_1.globalErrorHandler(err);
            resolve();
          });
        });
    }
    startServer() {
      this._startServerPromise ??= new Promise((resolve, reject) => {
        this._server.once("error", reject);
        this._server.listen(
          {
            port: this._port,
            host: this._host,
          },
          () => {
            api_1.diag.debug(
              `Prometheus exporter server started: ${this._host}:${this._port}/${this._endpoint}`,
            );
            resolve();
          },
        );
      });
      return this._startServerPromise;
    }
    getMetricsRequestHandler(_request, response) {
      this._exportMetrics(response);
    }
    _requestHandler = (request, response) => {
      let pathname;
      try {
        if (request.url != null) pathname = new url_1.URL(request.url, this._baseUrl).pathname;
      } catch {
        response.statusCode = 400;
        response.end("Bad Request");
        return;
      }
      if (pathname === this._endpoint) this._exportMetrics(response);
      else this._notFound(response);
    };
    _exportMetrics = (response) => {
      response.statusCode = 200;
      response.setHeader("content-type", "text/plain");
      this.collect().then(
        (collectionResult) => {
          let { resourceMetrics, errors } = collectionResult;
          if (errors.length) api_1.diag.error("PrometheusExporter: metrics collection errors", ...errors);
          response.end(this._serializer.serialize(resourceMetrics));
        },
        (err) => {
          response.end(`# failed to export metrics: ${err}`);
        },
      );
    };
    _notFound = (response) => {
      response.statusCode = 404;
      response.end();
    };
  }
  cjsExports.PrometheusExporter = PrometheusExporter;
});
export { require_PrometheusExporter };
