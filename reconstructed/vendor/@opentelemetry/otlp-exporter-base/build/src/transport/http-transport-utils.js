/**
 * @opentelemetry/otlp-exporter-base/build/src/transport/http-transport-utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../../runtime/bun-runtime.js";
import { require_is_export_retryable } from "../is-export-retryable.js";
import { require_types } from "../types.js";
import { require_version } from "../version.js";

//@ chunk-798ashq9.js:258631-259927 cjs-fingerprint
var require_http_transport_utils = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.compressAndSend = cjsExports.sendWithHttp = undefined;
  var zlib = importMetaRequire("zlib");
  var stream_1 = importMetaRequire("stream");
  var is_export_retryable_1 = require_is_export_retryable();
  var types_1 = require_types();
  var version_1 = require_version();
  var DEFAULT_USER_AGENT = `OTel-OTLP-Exporter-JavaScript/${version_1.VERSION}`;
  function sendWithHttp(request, url, headers, compression, userAgent, agent, data, onDone, timeoutMillis) {
    let parsedUrl = new URL(url);
    if (userAgent) headers["User-Agent"] = `${userAgent} ${DEFAULT_USER_AGENT}`;
    else headers["User-Agent"] = DEFAULT_USER_AGENT;
    let options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: "POST",
      headers,
      agent,
    };
    let req = request(options, (res) => {
      let responseData = [];
      res.on("data", (chunk) => responseData.push(chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode < 299)
          onDone({
            status: "success",
            data: Buffer.concat(responseData),
          });
        else if (res.statusCode && is_export_retryable_1.isExportRetryable(res.statusCode))
          onDone({
            status: "retryable",
            retryInMillis: is_export_retryable_1.parseRetryAfterToMills(res.headers["retry-after"]),
          });
        else {
          let error = new types_1.OTLPExporterError(
            res.statusMessage,
            res.statusCode,
            Buffer.concat(responseData).toString(),
          );
          onDone({
            status: "failure",
            error,
          });
        }
      });
    });
    req.setTimeout(timeoutMillis, () => {
      req.destroy();
      onDone({
        status: "failure",
        error: Error("Request Timeout"),
      });
    });
    req.on("error", (error) => {
      onDone({
        status: "failure",
        error,
      });
    });
    compressAndSend(req, compression, data, (error) => {
      onDone({
        status: "failure",
        error,
      });
    });
  }
  cjsExports.sendWithHttp = sendWithHttp;
  function compressAndSend(req, compression, data, onError) {
    let dataStream = readableFromUint8Array(data);
    if (compression === "gzip") {
      req.setHeader("Content-Encoding", "gzip");
      dataStream = dataStream.on("error", onError).pipe(zlib.createGzip()).on("error", onError);
    }
    dataStream.pipe(req).on("error", onError);
  }
  cjsExports.compressAndSend = compressAndSend;
  function readableFromUint8Array(buff) {
    let readable = new stream_1.Readable();
    readable.push(buff);
    readable.push(null);
    return readable;
  }
});
export { require_http_transport_utils };
