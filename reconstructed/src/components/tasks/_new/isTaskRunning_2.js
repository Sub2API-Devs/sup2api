/**
 * components/tasks/_new/isTaskRunning_2.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: sole-consumer-new 7
 */
import { logError } from "../../../utils/log.js";

//@ chunk-18hwfzwa.js:729220-729250 sole-consumer-new
function logErrorWrapper(AE) {
  return logError(AE);
}
//@ chunk-18hwfzwa.js:729250-729280 sole-consumer-new
function logErrorWrapper2(If) {
  return logError(If);
}
//@ chunk-18hwfzwa.js:729280-729310 sole-consumer-new
function logErrorWrapper3(fu) {
  return logError(fu);
}
//@ chunk-18hwfzwa.js:729310-729340 sole-consumer-new
function logErrorWrapper4(w_) {
  return logError(w_);
}
//@ chunk-18hwfzwa.js:729340-729370 sole-consumer-new
function logErrorWrapper5(Vg) {
  return logError(Vg);
}
//@ chunk-18hwfzwa.js:729370-729400 sole-consumer-new
function logErrorWrapper6(k_) {
  return logError(k_);
}
//@ chunk-18hwfzwa.js:729400-729446 sole-consumer-new = requestTeammateShutdown (1)
function isTaskRunning_2(task) {
  return task.status === "running";
}

export {
  logErrorWrapper,
  logErrorWrapper2,
  logErrorWrapper3,
  logErrorWrapper4,
  logErrorWrapper5,
  logErrorWrapper6,
  isTaskRunning_2,
};
