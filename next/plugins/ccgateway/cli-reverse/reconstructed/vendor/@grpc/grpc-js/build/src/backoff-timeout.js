/**
 * @grpc/grpc-js/build/src/backoff-timeout.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_constants } from "./constants.js";
import { require_logging } from "./logging.js";

//@ chunk-pwh5dx3n.js:31540-33642 cjs-fingerprint
var require_backoff_timeout = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.BackoffTimeout = undefined;
  var constants_1 = require_constants();
  var logging = require_logging();
  var TRACER_NAME = "backoff";
  var INITIAL_BACKOFF_MS = 1000;
  var BACKOFF_MULTIPLIER = 1.6;
  var MAX_BACKOFF_MS = 120000;
  var BACKOFF_JITTER = 0.2;
  function uniformRandom(min, max) {
    return Math.random() * (max - min) + min;
  }
  class BackoffTimeout {
    constructor(callback, options) {
      this.callback = callback;
      this.initialDelay = INITIAL_BACKOFF_MS;
      this.multiplier = BACKOFF_MULTIPLIER;
      this.maxDelay = MAX_BACKOFF_MS;
      this.jitter = BACKOFF_JITTER;
      this.running = false;
      this.hasRef = true;
      this.startTime = new Date();
      this.endTime = new Date();
      this.id = BackoffTimeout.getNextId();
      if (options) {
        if (options.initialDelay) this.initialDelay = options.initialDelay;
        if (options.multiplier) this.multiplier = options.multiplier;
        if (options.jitter) this.jitter = options.jitter;
        if (options.maxDelay) this.maxDelay = options.maxDelay;
      }
      this.trace(
        "constructed initialDelay=" +
          this.initialDelay +
          " multiplier=" +
          this.multiplier +
          " jitter=" +
          this.jitter +
          " maxDelay=" +
          this.maxDelay,
      );
      this.nextDelay = this.initialDelay;
      this.timerId = setTimeout(() => {}, 0);
      clearTimeout(this.timerId);
    }
    static getNextId() {
      return this.nextId++;
    }
    trace(text) {
      logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, "{" + this.id + "} " + text);
    }
    runTimer(delay) {
      var _a;
      var _b;
      this.trace("runTimer(delay=" + delay + ")");
      this.endTime = this.startTime;
      this.endTime.setMilliseconds(this.endTime.getMilliseconds() + delay);
      clearTimeout(this.timerId);
      this.timerId = setTimeout(() => {
        this.trace("timer fired");
        this.running = false;
        this.callback();
      }, delay);
      if (!this.hasRef) {
        if (!((_b = (_a = this.timerId).unref) === null || _b === undefined)) _b.call(_a);
      }
    }
    runOnce() {
      this.trace("runOnce()");
      this.running = true;
      this.startTime = new Date();
      this.runTimer(this.nextDelay);
      let nextBackoff = Math.min(this.nextDelay * this.multiplier, this.maxDelay);
      let jitterMagnitude = nextBackoff * this.jitter;
      this.nextDelay = nextBackoff + uniformRandom(-jitterMagnitude, jitterMagnitude);
    }
    stop() {
      this.trace("stop()");
      clearTimeout(this.timerId);
      this.running = false;
    }
    reset() {
      this.trace("reset() running=" + this.running);
      this.nextDelay = this.initialDelay;
      if (this.running) {
        let now = new Date();
        let newEndTime = this.startTime;
        newEndTime.setMilliseconds(newEndTime.getMilliseconds() + this.nextDelay);
        clearTimeout(this.timerId);
        if (now < newEndTime) this.runTimer(newEndTime.getTime() - now.getTime());
        else this.running = false;
      }
    }
    isRunning() {
      return this.running;
    }
    ref() {
      var _a;
      var _b;
      this.hasRef = true;
      if (!((_b = (_a = this.timerId).ref) === null || _b === undefined)) _b.call(_a);
    }
    unref() {
      var _a;
      var _b;
      this.hasRef = false;
      if (!((_b = (_a = this.timerId).unref) === null || _b === undefined)) _b.call(_a);
    }
    getEndTime() {
      return this.endTime;
    }
  }
  cjsExports.BackoffTimeout = BackoffTimeout;
  BackoffTimeout.nextId = 0;
});
export { require_backoff_timeout };
