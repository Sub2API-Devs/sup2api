/**
 * @grpc/grpc-js/build/src/deadline.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:191465-192412 cjs-fingerprint
var Kr = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.minDeadline = minDeadline;
  cjsExports.getDeadlineTimeoutString = getDeadlineTimeoutString;
  cjsExports.getRelativeTimeout = getRelativeTimeout;
  cjsExports.deadlineToString = deadlineToString;
  cjsExports.formatDateDifference = formatDateDifference;
  function minDeadline(...deadlineList) {
    let minValue = 1 / 0;
    for (let deadline of deadlineList) {
      let deadlineMsecs = deadline instanceof Date ? deadline.getTime() : deadline;
      if (deadlineMsecs < minValue) minValue = deadlineMsecs;
    }
    return minValue;
  }
  var units = [
    ["m", 1],
    ["S", 1000],
    ["M", 60000],
    ["H", 3600000],
  ];
  function getDeadlineTimeoutString(deadline) {
    let now = new Date().getTime();
    if (deadline instanceof Date) deadline = deadline.getTime();
    let timeoutMs = Math.max(deadline - now, 0);
    for (let [unit, factor] of units) {
      let amount = timeoutMs / factor;
      if (amount < 1e8) return String(Math.ceil(amount)) + unit;
    }
    throw Error("Deadline is too far in the future");
  }
  var MAX_TIMEOUT_TIME = 2147483647;
  function getRelativeTimeout(deadline) {
    let deadlineMs = deadline instanceof Date ? deadline.getTime() : deadline;
    let now = new Date().getTime();
    let timeout = deadlineMs - now;
    if (timeout < 0) return 0;
    else if (timeout > MAX_TIMEOUT_TIME) return 1 / 0;
    else return timeout;
  }
  function deadlineToString(deadline) {
    if (deadline instanceof Date) return deadline.toISOString();
    else {
      let dateDeadline = new Date(deadline);
      if (Number.isNaN(dateDeadline.getTime())) return "" + deadline;
      else return dateDeadline.toISOString();
    }
  }
  function formatDateDifference(startDate, endDate) {
    return ((endDate.getTime() - startDate.getTime()) / 1000).toFixed(3) + "s";
  }
});
export { Kr };
