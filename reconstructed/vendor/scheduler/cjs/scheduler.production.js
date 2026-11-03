/**
 * scheduler/cjs/scheduler.production.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: scheduler@0.26.0..0.28.0
 * pieces: chunk-bzr73sfg.js (11)
 * attribution: esm-layout 4, esm-fingerprint 7
 */
import { Wi } from "./scheduler-unstable_post_task.development.js";
import { Xa } from "../../../runtime/bun-runtime.js";

//@ chunk-bzr73sfg.js:3596-3717 esm-layout
function push(heap, node) {
  var index = heap.length;
  heap.push(node);
  e: for (; 0 < index;) {
    var parentIndex = (index - 1) >>> 1;
    var parent = heap[parentIndex];
    if (0 < compare(parent, node)) {
      heap[parentIndex] = node;
      heap[index] = parent;
      index = parentIndex;
    } else break e;
  }
}
//@ chunk-bzr73sfg.js:3717-3762 esm-layout
function peek(heap) {
  return heap.length === 0 ? null : heap[0];
}
//@ chunk-bzr73sfg.js:3762-4050 esm-layout
function pop(heap) {
  if (heap.length === 0) return null;
  var first = heap[0];
  var last = heap.pop();
  if (last !== first) {
    heap[0] = last;
    e: for (var index = 0, length = heap.length, halfLength = length >>> 1; index < halfLength;) {
      var leftIndex = 2 * (index + 1) - 1;
      var left = heap[leftIndex];
      var rightIndex = leftIndex + 1;
      var right = heap[rightIndex];
      if (0 > compare(left, last)) {
        if (rightIndex < length && 0 > compare(right, left)) {
          heap[index] = right;
          heap[rightIndex] = last;
          index = rightIndex;
        } else {
          heap[index] = left;
          heap[leftIndex] = last;
          index = leftIndex;
        }
      } else if (rightIndex < length && 0 > compare(right, last)) {
        heap[index] = right;
        heap[rightIndex] = last;
        index = rightIndex;
      } else break e;
    }
  }
  return first;
}
//@ chunk-bzr73sfg.js:4050-4122 esm-fingerprint
function compare(a, b) {
  var diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff : a.id - b.id;
}
//@ chunk-bzr73sfg.js:4122-4282 esm-fingerprint
function advanceTimers(currentTime) {
  for (var timer = peek(timerQueue); timer !== null;) {
    if (timer.callback === null) pop(timerQueue);
    else if (timer.startTime <= currentTime) {
      pop(timerQueue);
      timer.sortIndex = timer.expirationTime;
      push(taskQueue, timer);
    } else break;
    timer = peek(timerQueue);
  }
}
//@ chunk-bzr73sfg.js:4282-4406 esm-fingerprint
function handleTimeout(currentTime) {
  isHostTimeoutScheduled = false;
  advanceTimers(currentTime);
  if (!isHostCallbackScheduled)
    if (peek(taskQueue) !== null) {
      isHostCallbackScheduled = true;
      if (!isMessageLoopRunning) {
        isMessageLoopRunning = true;
        schedulePerformWorkUntilDeadline();
      }
    } else {
      var firstTimer = peek(timerQueue);
      if (firstTimer !== null) requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
}
//@ chunk-bzr73sfg.js:4406-4463 esm-fingerprint
function shouldYieldToHost() {
  return needsPaint ? true : Wi.unstable_now() - startTime < frameInterval ? false : true;
}
//@ chunk-bzr73sfg.js:4463-5029 esm-fingerprint
function performWorkUntilDeadline() {
  needsPaint = false;
  if (isMessageLoopRunning) {
    var currentTime = Wi.unstable_now();
    startTime = currentTime;
    var hasMoreWork = true;
    try {
      e: {
        isHostCallbackScheduled = false;
        if (isHostTimeoutScheduled) {
          isHostTimeoutScheduled = false;
          localClearTimeout(taskTimeoutID);
          taskTimeoutID = -1;
        }
        isPerformingWork = true;
        var previousPriorityLevel = currentPriorityLevel;
        try {
          t: {
            advanceTimers(currentTime);
            for (
              currentTask = peek(taskQueue);
              currentTask !== null && !(currentTask.expirationTime > currentTime && shouldYieldToHost());
            ) {
              var callback = currentTask.callback;
              if (typeof callback === "function") {
                currentTask.callback = null;
                currentPriorityLevel = currentTask.priorityLevel;
                var continuationCallback = callback(currentTask.expirationTime <= currentTime);
                currentTime = Wi.unstable_now();
                if (typeof continuationCallback === "function") {
                  currentTask.callback = continuationCallback;
                  advanceTimers(currentTime);
                  hasMoreWork = true;
                  break t;
                }
                if (currentTask === peek(taskQueue)) pop(taskQueue);
                advanceTimers(currentTime);
              } else pop(taskQueue);
              currentTask = peek(taskQueue);
            }
            if (currentTask !== null) hasMoreWork = true;
            else {
              var firstTimer = peek(timerQueue);
              if (firstTimer !== null) requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
              hasMoreWork = false;
            }
          }
          break e;
        } finally {
          currentTask = null;
          currentPriorityLevel = previousPriorityLevel;
          isPerformingWork = false;
        }
        hasMoreWork = undefined;
      }
    } finally {
      if (hasMoreWork) schedulePerformWorkUntilDeadline();
      else isMessageLoopRunning = false;
    }
  }
}
//@ chunk-bzr73sfg.js:5029-5088 esm-fingerprint
function requestHostTimeout(handleTimeout, u) {
  taskTimeoutID = localSetTimeout(function () {
    handleTimeout(Wi.unstable_now());
  }, u);
}
//@ chunk-bzr73sfg.js:5088-6328 esm-layout
var Yn = undefined;
var localPerformance;
var localDate;
var initialTime;
var taskQueue;
var timerQueue;
var taskIdCounter = 1;
var currentTask = null;
var currentPriorityLevel = 3;
var isPerformingWork = false;
var isHostCallbackScheduled = false;
var isHostTimeoutScheduled = false;
var needsPaint = false;
var localSetTimeout;
var localClearTimeout;
var localSetImmediate;
var isMessageLoopRunning = false;
var taskTimeoutID = -1;
var frameInterval = 5;
var startTime = -1;
var schedulePerformWorkUntilDeadline;
var ns;
var ad;
var rs = 5;
var os = 1;
var Dy = 4;
var gl = 3;
var _y = null;
var ls = 2;
var as = function (task) {
  task.callback = null;
};
var Oy = function (fps) {
  if (0 > fps || 125 < fps)
    console.error(
      "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported",
    );
  else frameInterval = 0 < fps ? Math.floor(1000 / fps) : 5;
};
var Hy = function () {
  return currentPriorityLevel;
};
var Ly = function (eventHandler) {
  switch (currentPriorityLevel) {
    case 1:
    case 2:
    case 3:
      var priorityLevel = 3;
      break;
    default:
      priorityLevel = currentPriorityLevel;
  }
  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;
  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
};
var ss = function () {
  needsPaint = true;
};
var Py = function (priorityLevel, eventHandler) {
  switch (priorityLevel) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      break;
    default:
      priorityLevel = 3;
  }
  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;
  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
};
var bl = function (priorityLevel, callback, options) {
  var currentTime = Wi.unstable_now();
  switch (
    (typeof options === "object" && options !== null
      ? ((options = options.delay),
        (options = typeof options === "number" && 0 < options ? currentTime + options : currentTime))
      : (options = currentTime),
    priorityLevel)
  ) {
    case 1:
      var timeout = -1;
      break;
    case 2:
      timeout = 250;
      break;
    case 5:
      timeout = 1073741823;
      break;
    case 4:
      timeout = 1e4;
      break;
    default:
      timeout = 5000;
  }
  timeout = options + timeout;
  priorityLevel = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime: options,
    expirationTime: timeout,
    sortIndex: -1,
  };
  if (options > currentTime) {
    priorityLevel.sortIndex = options;
    push(timerQueue, priorityLevel);
    if (peek(taskQueue) === null && priorityLevel === peek(timerQueue)) {
      if (isHostTimeoutScheduled) {
        localClearTimeout(taskTimeoutID);
        taskTimeoutID = -1;
      } else isHostTimeoutScheduled = true;
      requestHostTimeout(handleTimeout, options - currentTime);
    }
  } else {
    priorityLevel.sortIndex = timeout;
    push(taskQueue, priorityLevel);
    if (!(isHostCallbackScheduled || isPerformingWork)) {
      isHostCallbackScheduled = true;
      if (!isMessageLoopRunning) {
        isMessageLoopRunning = true;
        schedulePerformWorkUntilDeadline();
      }
    }
  }
  return priorityLevel;
};
var shouldYieldToHost_default;
var By = function (callback) {
  var parentPriorityLevel = currentPriorityLevel;
  return function () {
    var f = currentPriorityLevel;
    currentPriorityLevel = parentPriorityLevel;
    try {
      return callback.apply(this, arguments);
    } finally {
      currentPriorityLevel = f;
    }
  };
};
//@ chunk-bzr73sfg.js:6328-6890 esm-fingerprint
var init_scheduler_production = Xa(() => {
  if (typeof performance === "object" && typeof performance.now === "function") {
    localPerformance = performance;
    Yn = function () {
      return localPerformance.now();
    };
  } else {
    localDate = Date;
    initialTime = localDate.now();
    Yn = function () {
      return localDate.now() - initialTime;
    };
  }
  taskQueue = [];
  timerQueue = [];
  localSetTimeout = typeof setTimeout === "function" ? setTimeout : null;
  localClearTimeout = typeof clearTimeout === "function" ? clearTimeout : null;
  localSetImmediate = typeof setImmediate !== "undefined" ? setImmediate : null;
  if (typeof localSetImmediate === "function")
    schedulePerformWorkUntilDeadline = function () {
      localSetImmediate(performWorkUntilDeadline);
    };
  else if (typeof MessageChannel !== "undefined") {
    ns = new MessageChannel();
    ad = ns.port2;
    ns.port1.onmessage = performWorkUntilDeadline;
    schedulePerformWorkUntilDeadline = function () {
      ad.postMessage(null);
    };
  } else
    schedulePerformWorkUntilDeadline = function () {
      localSetTimeout(performWorkUntilDeadline, 0);
    };
  shouldYieldToHost_default = shouldYieldToHost;
});
export {
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
  init_scheduler_production,
};
