/**
 * scheduler/cjs/scheduler-unstable_post_task.development.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: scheduler@0.26.0..0.28.0
 * pieces: chunk-bzr73sfg.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { defineExports } from "../../../runtime/bun-runtime.js";
import {
  Yn,
  rs,
  os,
  Dy,
  gl,
  _y,
  ls,
  as,
  Oy,
  Hy,
  Ly,
  ss,
  Py,
  bl,
  shouldYieldToHost_default,
  By,
} from "./scheduler.production.js";

//@ chunk-bzr73sfg.js:2536-2546 esm-layout
var Wi = {};
//@ chunk-bzr73sfg.js:2546-3596 esm-fingerprint
defineExports(
  Wi,
  {
    unstable_now: () => Yn,
    unstable_IdlePriority: () => rs,
    unstable_ImmediatePriority: () => os,
    unstable_LowPriority: () => Dy,
    unstable_NormalPriority: () => gl,
    unstable_Profiling: () => _y,
    unstable_UserBlockingPriority: () => ls,
    unstable_cancelCallback: () => as,
    unstable_forceFrameRate: () => Oy,
    unstable_getCurrentPriorityLevel: () => Hy,
    unstable_next: () => Ly,
    unstable_requestPaint: () => ss,
    unstable_runWithPriority: () => Py,
    unstable_scheduleCallback: () => bl,
    unstable_shouldYield: () => shouldYieldToHost_default,
    unstable_wrapCallback: () => By,
  },
  {
    unstable_now: (fT) => (Yn = fT),
    unstable_IdlePriority: (fT) => (rs = fT),
    unstable_ImmediatePriority: (fT) => (os = fT),
    unstable_LowPriority: (fT) => (Dy = fT),
    unstable_NormalPriority: (fT) => (gl = fT),
    unstable_Profiling: (fT) => (_y = fT),
    unstable_UserBlockingPriority: (fT) => (ls = fT),
    unstable_cancelCallback: (fT) => (as = fT),
    unstable_forceFrameRate: (fT) => (Oy = fT),
    unstable_getCurrentPriorityLevel: (fT) => (Hy = fT),
    unstable_next: (fT) => (Ly = fT),
    unstable_requestPaint: (fT) => (ss = fT),
    unstable_runWithPriority: (fT) => (Py = fT),
    unstable_scheduleCallback: (fT) => (bl = fT),
    unstable_shouldYield: (fT) => (shouldYieldToHost_default = fT),
    unstable_wrapCallback: (fT) => (By = fT),
  },
);
export { Wi };
