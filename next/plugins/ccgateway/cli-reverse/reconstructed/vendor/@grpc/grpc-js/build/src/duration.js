/**
 * @grpc/grpc-js/build/src/duration.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-3k21nfa0.js:287451-288349 cjs-fingerprint
var require_duration = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.durationMessageToDuration = durationMessageToDuration;
  cjsExports.msToDuration = msToDuration;
  cjsExports.durationToMs = durationToMs;
  cjsExports.isDuration = isDuration;
  cjsExports.isDurationMessage = isDurationMessage;
  cjsExports.parseDuration = parseDuration;
  cjsExports.durationToString = durationToString;
  function durationMessageToDuration(message) {
    return {
      seconds: Number.parseInt(message.seconds),
      nanos: message.nanos,
    };
  }
  function msToDuration(millis) {
    return {
      seconds: (millis / 1000) | 0,
      nanos: ((millis % 1000) * 1e6) | 0,
    };
  }
  function durationToMs(duration) {
    return (duration.seconds * 1000 + duration.nanos / 1e6) | 0;
  }
  function isDuration(value) {
    return typeof value.seconds === "number" && typeof value.nanos === "number";
  }
  function isDurationMessage(value) {
    return typeof value.seconds === "string" && typeof value.nanos === "number";
  }
  var durationRegex = /^(\d+)(?:\.(\d+))?s$/;
  function parseDuration(value) {
    let match = value.match(durationRegex);
    if (!match) return null;
    return {
      seconds: Number.parseInt(match[1], 10),
      nanos: match[2] ? Number.parseInt(match[2].padEnd(9, "0"), 10) : 0,
    };
  }
  function durationToString(duration) {
    if (duration.nanos === 0) return `${duration.seconds}s`;
    let scaleFactor;
    if (duration.nanos % 1e6 === 0) scaleFactor = 1e6;
    else if (duration.nanos % 1000 === 0) scaleFactor = 1000;
    else scaleFactor = 1;
    return `${duration.seconds}.${duration.nanos / scaleFactor}s`;
  }
});
export { require_duration };
