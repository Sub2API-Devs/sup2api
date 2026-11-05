/**
 * @grpc/grpc-js/build/src/constants.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-3k21nfa0.js:453-1752 cjs-fingerprint
var require_constants = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH =
    cjsExports.DEFAULT_MAX_SEND_MESSAGE_LENGTH =
    cjsExports.Propagate =
    cjsExports.LogVerbosity =
    cjsExports.Status =
      undefined;
  var Status;
  (function (Status) {
    Status[(Status.OK = 0)] = "OK";
    Status[(Status.CANCELLED = 1)] = "CANCELLED";
    Status[(Status.UNKNOWN = 2)] = "UNKNOWN";
    Status[(Status.INVALID_ARGUMENT = 3)] = "INVALID_ARGUMENT";
    Status[(Status.DEADLINE_EXCEEDED = 4)] = "DEADLINE_EXCEEDED";
    Status[(Status.NOT_FOUND = 5)] = "NOT_FOUND";
    Status[(Status.ALREADY_EXISTS = 6)] = "ALREADY_EXISTS";
    Status[(Status.PERMISSION_DENIED = 7)] = "PERMISSION_DENIED";
    Status[(Status.RESOURCE_EXHAUSTED = 8)] = "RESOURCE_EXHAUSTED";
    Status[(Status.FAILED_PRECONDITION = 9)] = "FAILED_PRECONDITION";
    Status[(Status.ABORTED = 10)] = "ABORTED";
    Status[(Status.OUT_OF_RANGE = 11)] = "OUT_OF_RANGE";
    Status[(Status.UNIMPLEMENTED = 12)] = "UNIMPLEMENTED";
    Status[(Status.INTERNAL = 13)] = "INTERNAL";
    Status[(Status.UNAVAILABLE = 14)] = "UNAVAILABLE";
    Status[(Status.DATA_LOSS = 15)] = "DATA_LOSS";
    Status[(Status.UNAUTHENTICATED = 16)] = "UNAUTHENTICATED";
  })(Status || (cjsExports.Status = Status = {}));
  var LogVerbosity;
  (function (LogVerbosity) {
    LogVerbosity[(LogVerbosity.DEBUG = 0)] = "DEBUG";
    LogVerbosity[(LogVerbosity.INFO = 1)] = "INFO";
    LogVerbosity[(LogVerbosity.ERROR = 2)] = "ERROR";
    LogVerbosity[(LogVerbosity.NONE = 3)] = "NONE";
  })(LogVerbosity || (cjsExports.LogVerbosity = LogVerbosity = {}));
  var Propagate;
  (function (Propagate) {
    Propagate[(Propagate.DEADLINE = 1)] = "DEADLINE";
    Propagate[(Propagate.CENSUS_STATS_CONTEXT = 2)] = "CENSUS_STATS_CONTEXT";
    Propagate[(Propagate.CENSUS_TRACING_CONTEXT = 4)] = "CENSUS_TRACING_CONTEXT";
    Propagate[(Propagate.CANCELLATION = 8)] = "CANCELLATION";
    Propagate[(Propagate.DEFAULTS = 65535)] = "DEFAULTS";
  })(Propagate || (cjsExports.Propagate = Propagate = {}));
  cjsExports.DEFAULT_MAX_SEND_MESSAGE_LENGTH = -1;
  cjsExports.DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH = 4194304;
});
export { require_constants };
