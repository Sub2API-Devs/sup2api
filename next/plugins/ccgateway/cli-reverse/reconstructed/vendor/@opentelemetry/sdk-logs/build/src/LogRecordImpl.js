/**
 * @opentelemetry/sdk-logs/build/src/LogRecordImpl.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-logs@0.208.0
 * pieces: chunk-aepeg2w5.js (4)
 * attribution: esm-layout 3, esm-fingerprint 1
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_resources } from "../../../resources/build/src/index.js";
import { require_core } from "../../../core/build/src/index.js";
import { require_api } from "../../../api/build/src/index.js";

//@ chunk-aepeg2w5.js:650353-650382 esm-layout
var import_resources = __toESM(require_resources());
var import_core = __toESM(require_core());
//@ chunk-aepeg2w5.js:650382-650398 esm-layout
var import_api = __toESM(require_api());
//@ chunk-aepeg2w5.js:650398-650426 esm-layout
var import_api_2 = __toESM(require_api());
var import_core_2 = __toESM(require_core());
//@ chunk-aepeg2w5.js:650426-653206 esm-fingerprint
class LogRecordImpl {
  hrTime;
  hrTimeObserved;
  spanContext;
  resource;
  instrumentationScope;
  attributes = {};
  _severityText;
  _severityNumber;
  _body;
  _eventName;
  totalAttributesCount = 0;
  _isReadonly = false;
  _logRecordLimits;
  set severityText(severityText) {
    if (this._isLogRecordReadonly()) return;
    this._severityText = severityText;
  }
  get severityText() {
    return this._severityText;
  }
  set severityNumber(severityNumber) {
    if (this._isLogRecordReadonly()) return;
    this._severityNumber = severityNumber;
  }
  get severityNumber() {
    return this._severityNumber;
  }
  set body(body) {
    if (this._isLogRecordReadonly()) return;
    this._body = body;
  }
  get body() {
    return this._body;
  }
  get eventName() {
    return this._eventName;
  }
  set eventName(eventName) {
    if (this._isLogRecordReadonly()) return;
    this._eventName = eventName;
  }
  get droppedAttributesCount() {
    return this.totalAttributesCount - Object.keys(this.attributes).length;
  }
  constructor(_sharedState, instrumentationScope, logRecord) {
    let {
      timestamp,
      observedTimestamp,
      eventName,
      severityNumber,
      severityText,
      body,
      attributes = {},
      context,
    } = logRecord;
    let now = Date.now();
    this.hrTime = import_core_2.timeInputToHrTime(timestamp ?? now);
    this.hrTimeObserved = import_core_2.timeInputToHrTime(observedTimestamp ?? now);
    if (context) {
      let spanContext = import_api_2.trace.getSpanContext(context);
      if (spanContext && import_api_2.isSpanContextValid(spanContext)) this.spanContext = spanContext;
    }
    this.severityNumber = severityNumber;
    this.severityText = severityText;
    this.body = body;
    this.resource = _sharedState.resource;
    this.instrumentationScope = instrumentationScope;
    this._logRecordLimits = _sharedState.logRecordLimits;
    this._eventName = eventName;
    this.setAttributes(attributes);
  }
  setAttribute(key, value) {
    if (this._isLogRecordReadonly()) return this;
    if (value === null) return this;
    if (key.length === 0) {
      import_api_2.diag.warn(`Invalid attribute key: ${key}`);
      return this;
    }
    if (
      !import_core_2.isAttributeValue(value) &&
      !(typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0)
    ) {
      import_api_2.diag.warn(`Invalid attribute value set for key: ${key}`);
      return this;
    }
    this.totalAttributesCount += 1;
    if (
      Object.keys(this.attributes).length >= this._logRecordLimits.attributeCountLimit &&
      !Object.prototype.hasOwnProperty.call(this.attributes, key)
    ) {
      if (this.droppedAttributesCount === 1) import_api_2.diag.warn("Dropping extra attributes.");
      return this;
    }
    if (import_core_2.isAttributeValue(value)) this.attributes[key] = this._truncateToSize(value);
    else this.attributes[key] = value;
    return this;
  }
  setAttributes(attributes) {
    for (let [k, v] of Object.entries(attributes)) this.setAttribute(k, v);
    return this;
  }
  setBody(body) {
    this.body = body;
    return this;
  }
  setEventName(eventName) {
    this.eventName = eventName;
    return this;
  }
  setSeverityNumber(severityNumber) {
    this.severityNumber = severityNumber;
    return this;
  }
  setSeverityText(severityText) {
    this.severityText = severityText;
    return this;
  }
  _makeReadonly() {
    this._isReadonly = true;
  }
  _truncateToSize(value) {
    let limit = this._logRecordLimits.attributeValueLengthLimit;
    if (limit <= 0) {
      import_api_2.diag.warn(`Attribute value limit must be positive, got ${limit}`);
      return value;
    }
    if (typeof value === "string") return this._truncateToLimitUtil(value, limit);
    if (Array.isArray(value))
      return value.map((val) => (typeof val === "string" ? this._truncateToLimitUtil(val, limit) : val));
    return value;
  }
  _truncateToLimitUtil(value, limit) {
    if (value.length <= limit) return value;
    return value.substring(0, limit);
  }
  _isLogRecordReadonly() {
    if (this._isReadonly) import_api_2.diag.warn("Can not execute the operation on emitted log record");
    return this._isReadonly;
  }
}
export { import_api, LogRecordImpl, import_core, import_resources };
