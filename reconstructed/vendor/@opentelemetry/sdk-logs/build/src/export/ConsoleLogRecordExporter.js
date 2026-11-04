/**
 * @opentelemetry/sdk-logs/build/src/export/ConsoleLogRecordExporter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-logs@0.208.0
 * pieces: chunk-9vvvg0d3.js (4)
 * attribution: esm-layout 3, esm-fingerprint 1
 */
import { __toESM } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_core } from "../../../../core/build/src/index.js";
import { require_resources } from "../../../../resources/build/src/index.js";

//@ chunk-9vvvg0d3.js:5201-5218 esm-layout
var import_api = __toESM(require_api(), 1);
//@ chunk-9vvvg0d3.js:5218-5250 esm-layout
var import_core = __toESM(require_core(), 1);
var import_resources = __toESM(require_resources(), 1);
//@ chunk-9vvvg0d3.js:5250-5266 esm-layout
var import_core_2 = __toESM(require_core());
//@ chunk-9vvvg0d3.js:5266-5817 esm-fingerprint
class ConsoleLogRecordExporter {
  export(logs, resultCallback) {
    this._sendLogRecords(logs, resultCallback);
  }
  shutdown() {
    return Promise.resolve();
  }
  _exportInfo(logRecord) {
    return {
      resource: {
        attributes: logRecord.resource.attributes,
      },
      instrumentationScope: logRecord.instrumentationScope,
      timestamp: import_core_2.hrTimeToMicroseconds(logRecord.hrTime),
      traceId: logRecord.spanContext?.traceId,
      spanId: logRecord.spanContext?.spanId,
      traceFlags: logRecord.spanContext?.traceFlags,
      severityText: logRecord.severityText,
      severityNumber: logRecord.severityNumber,
      body: logRecord.body,
      attributes: logRecord.attributes,
    };
  }
  _sendLogRecords(logRecords, done) {
    for (let logRecord of logRecords)
      console.dir(this._exportInfo(logRecord), {
        depth: 3,
      });
    done?.({
      code: import_core_2.ExportResultCode.SUCCESS,
    });
  }
}
export { import_api, import_resources, ConsoleLogRecordExporter, import_core };
