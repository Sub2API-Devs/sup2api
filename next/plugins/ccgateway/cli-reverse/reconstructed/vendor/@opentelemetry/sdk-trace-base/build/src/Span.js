/**
 * @opentelemetry/sdk-trace-base/build/src/Span.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-9vvvg0d3.js (1)
 * attribution: esm-fingerprint 1
 */
import { import_api_3, import_core_5, import_error, EXCEPTION } from "../esm/enums.js";

//@ chunk-9vvvg0d3.js:5947-10999 esm-fingerprint
/**
 * OpenTelemetry Span 实现类（第三方代码误归到 filePersistence）。
 */
class SpanImpl {
  _spanContext;
  kind;
  parentSpanContext;
  attributes = {};
  links = [];
  events = [];
  startTime;
  resource;
  instrumentationScope;
  _droppedAttributesCount = 0;
  _droppedEventsCount = 0;
  _droppedLinksCount = 0;
  name;
  status = {
    code: import_api_3.SpanStatusCode.UNSET,
  };
  endTime = [0, 0];
  _ended = false;
  _duration = [-1, -1];
  _spanProcessor;
  _spanLimits;
  _attributeValueLengthLimit;
  _performanceStartTime;
  _performanceOffset;
  _startTimeProvided;
  constructor(opts) {
    let now = Date.now();
    this._spanContext = opts.spanContext;
    this._performanceStartTime = import_core_5.otperformance.now();
    this._performanceOffset = now - (this._performanceStartTime + import_core_5.getTimeOrigin());
    this._startTimeProvided = opts.startTime != null;
    this._spanLimits = opts.spanLimits;
    this._attributeValueLengthLimit = this._spanLimits.attributeValueLengthLimit || 0;
    this._spanProcessor = opts.spanProcessor;
    this.name = opts.name;
    this.parentSpanContext = opts.parentSpanContext;
    this.kind = opts.kind;
    this.links = opts.links || [];
    this.startTime = this._getTime(opts.startTime ?? now);
    this.resource = opts.resource;
    this.instrumentationScope = opts.scope;
    if (opts.attributes != null) this.setAttributes(opts.attributes);
    this._spanProcessor.onStart(this, opts.context);
  }
  spanContext() {
    return this._spanContext;
  }
  setAttribute(key, value) {
    if (value == null || this._isSpanEnded()) return this;
    if (key.length === 0) {
      import_api_3.diag.warn(`Invalid attribute key: ${key}`);
      return this;
    }
    if (!import_core_5.isAttributeValue(value)) {
      import_api_3.diag.warn(`Invalid attribute value set for key: ${key}`);
      return this;
    }
    let { attributeCountLimit } = this._spanLimits;
    if (
      attributeCountLimit !== undefined &&
      Object.keys(this.attributes).length >= attributeCountLimit &&
      !Object.prototype.hasOwnProperty.call(this.attributes, key)
    ) {
      this._droppedAttributesCount++;
      return this;
    }
    this.attributes[key] = this._truncateToSize(value);
    return this;
  }
  setAttributes(attributes) {
    for (let [k, v] of Object.entries(attributes)) this.setAttribute(k, v);
    return this;
  }
  addEvent(name, attributesOrStartTime, timeStamp) {
    if (this._isSpanEnded()) return this;
    let { eventCountLimit } = this._spanLimits;
    if (eventCountLimit === 0) {
      import_api_3.diag.warn("No events allowed.");
      this._droppedEventsCount++;
      return this;
    }
    if (eventCountLimit !== undefined && this.events.length >= eventCountLimit) {
      if (this._droppedEventsCount === 0) import_api_3.diag.debug("Dropping extra events.");
      this.events.shift();
      this._droppedEventsCount++;
    }
    if (import_core_5.isTimeInput(attributesOrStartTime)) {
      if (!import_core_5.isTimeInput(timeStamp)) timeStamp = attributesOrStartTime;
      attributesOrStartTime = undefined;
    }
    let attributes = import_core_5.sanitizeAttributes(attributesOrStartTime);
    this.events.push({
      name,
      attributes,
      time: this._getTime(timeStamp),
      droppedAttributesCount: 0,
    });
    return this;
  }
  addLink(link) {
    this.links.push(link);
    return this;
  }
  addLinks(links) {
    this.links.push(...links);
    return this;
  }
  setStatus(status) {
    if (this._isSpanEnded()) return this;
    this.status = {
      ...status,
    };
    if (this.status.message != null && typeof status.message !== "string") {
      import_api_3.diag.warn(
        `Dropping invalid status.message of type '${typeof status.message}', expected 'string'`,
      );
      delete this.status.message;
    }
    return this;
  }
  updateName(name) {
    if (this._isSpanEnded()) return this;
    this.name = name;
    return this;
  }
  end(endTime) {
    if (this._isSpanEnded()) {
      import_api_3.diag.error(
        `${this.name} ${this._spanContext.traceId}-${this._spanContext.spanId} - You can only call end() on a span once.`,
      );
      return;
    }
    this._ended = true;
    this.endTime = this._getTime(endTime);
    this._duration = import_core_5.hrTimeDuration(this.startTime, this.endTime);
    if (this._duration[0] < 0) {
      import_api_3.diag.warn(
        "Inconsistent start and end time, startTime > endTime. Setting span duration to 0ms.",
        this.startTime,
        this.endTime,
      );
      this.endTime = this.startTime.slice();
      this._duration = [0, 0];
    }
    if (this._droppedEventsCount > 0)
      import_api_3.diag.warn(`Dropped ${this._droppedEventsCount} events because eventCountLimit reached`);
    this._spanProcessor.onEnd(this);
  }
  _getTime(inp) {
    if (typeof inp === "number" && inp <= import_core_5.otperformance.now())
      return import_core_5.hrTime(inp + this._performanceOffset);
    if (typeof inp === "number") return import_core_5.millisToHrTime(inp);
    if (inp instanceof Date) return import_core_5.millisToHrTime(inp.getTime());
    if (import_core_5.isTimeInputHrTime(inp)) return inp;
    if (this._startTimeProvided) return import_core_5.millisToHrTime(Date.now());
    let msDuration = import_core_5.otperformance.now() - this._performanceStartTime;
    return import_core_5.addHrTimes(this.startTime, import_core_5.millisToHrTime(msDuration));
  }
  isRecording() {
    return this._ended === false;
  }
  recordException(exception, time) {
    let attributes = {};
    if (typeof exception === "string") attributes[import_error.ATTR_EXCEPTION_MESSAGE] = exception;
    else if (exception) {
      if (exception.code) attributes[import_error.ATTR_EXCEPTION_TYPE] = exception.code.toString();
      else if (exception.name) attributes[import_error.ATTR_EXCEPTION_TYPE] = exception.name;
      if (exception.message) attributes[import_error.ATTR_EXCEPTION_MESSAGE] = exception.message;
      if (exception.stack) attributes[import_error.ATTR_EXCEPTION_STACKTRACE] = exception.stack;
    }
    if (attributes[import_error.ATTR_EXCEPTION_TYPE] || attributes[import_error.ATTR_EXCEPTION_MESSAGE])
      this.addEvent(EXCEPTION, attributes, time);
    else import_api_3.diag.warn(`Failed to record an exception ${exception}`);
  }
  get duration() {
    return this._duration;
  }
  get ended() {
    return this._ended;
  }
  get droppedAttributesCount() {
    return this._droppedAttributesCount;
  }
  get droppedEventsCount() {
    return this._droppedEventsCount;
  }
  get droppedLinksCount() {
    return this._droppedLinksCount;
  }
  _isSpanEnded() {
    if (this._ended) {
      let error = Error(
        `Operation attempted on ended Span {traceId: ${this._spanContext.traceId}, spanId: ${this._spanContext.spanId}}`,
      );
      import_api_3.diag.warn(
        `Cannot execute the operation on ended Span {traceId: ${this._spanContext.traceId}, spanId: ${this._spanContext.spanId}}`,
        error,
      );
    }
    return this._ended;
  }
  _truncateToLimitUtil(value, limit) {
    if (value.length <= limit) return value;
    return value.substring(0, limit);
  }
  _truncateToSize(value) {
    let limit = this._attributeValueLengthLimit;
    if (limit <= 0) {
      import_api_3.diag.warn(`Attribute value limit must be positive, got ${limit}`);
      return value;
    }
    if (typeof value === "string") return this._truncateToLimitUtil(value, limit);
    if (Array.isArray(value))
      return value.map((val) => (typeof val === "string" ? this._truncateToLimitUtil(val, limit) : val));
    return value;
  }
}
export { SpanImpl };
