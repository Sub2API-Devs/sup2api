/**
 * scheduler/cjs/scheduler.production.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: scheduler@0.26.0..0.28.0
 * pieces: chunk-2avr6cej.js (12)
 * attribution: esm-layout 4, esm-fingerprint 7
 */
import { defineExports, __esm } from "../../../runtime/bun-runtime.js";
import { schedulerExports } from "./scheduler-unstable_post_task.development.js";

//@ chunk-2avr6cej.js:2546-3596 esm-fingerprint (moved: shares a binding it assigns)
defineExports(
  schedulerExports,
  {
    unstable_now: () => unstableNow,
    unstable_IdlePriority: () => unstableIdlePriority,
    unstable_ImmediatePriority: () => unstableImmediatePriority,
    unstable_LowPriority: () => unstableLowPriority,
    unstable_NormalPriority: () => unstableNormalPriority,
    unstable_Profiling: () => unstableProfiling,
    unstable_UserBlockingPriority: () => unstableUserBlockingPriority,
    unstable_cancelCallback: () => unstableCancelCallback,
    unstable_forceFrameRate: () => unstableForceFrameRate,
    unstable_getCurrentPriorityLevel: () => unstableGetCurrentPriorityLevel,
    unstable_next: () => unstableNext,
    unstable_requestPaint: () => unstableRequestPaint,
    unstable_runWithPriority: () => unstableRunWithPriority,
    unstable_scheduleCallback: () => unstableScheduleCallback,
    unstable_shouldYield: () => shouldYieldToHost_default,
    unstable_wrapCallback: () => unstableWrapCallback,
  },
  {
    unstable_now: (now) => (unstableNow = now),
    unstable_IdlePriority: (idlePriority) => (unstableIdlePriority = idlePriority),
    unstable_ImmediatePriority: (immediatePriority) => (unstableImmediatePriority = immediatePriority),
    unstable_LowPriority: (lowPriority) => (unstableLowPriority = lowPriority),
    unstable_NormalPriority: (normalPriority) => (unstableNormalPriority = normalPriority),
    unstable_Profiling: (profiling) => (unstableProfiling = profiling),
    unstable_UserBlockingPriority: (userBlockingPriority) =>
      (unstableUserBlockingPriority = userBlockingPriority),
    unstable_cancelCallback: (cancelCallback) => (unstableCancelCallback = cancelCallback),
    unstable_forceFrameRate: (forceFrameRate) => (unstableForceFrameRate = forceFrameRate),
    unstable_getCurrentPriorityLevel: (getCurrentPriorityLevel) =>
      (unstableGetCurrentPriorityLevel = getCurrentPriorityLevel),
    unstable_next: (next) => (unstableNext = next),
    unstable_requestPaint: (requestPaint) => (unstableRequestPaint = requestPaint),
    unstable_runWithPriority: (runWithPriority) => (unstableRunWithPriority = runWithPriority),
    unstable_scheduleCallback: (scheduleCallback) => (unstableScheduleCallback = scheduleCallback),
    unstable_shouldYield: (shouldYield) => (shouldYieldToHost_default = shouldYield),
    unstable_wrapCallback: (wrapCallback) => (unstableWrapCallback = wrapCallback),
  },
);
//@ chunk-2avr6cej.js:3596-3717 esm-layout
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
//@ chunk-2avr6cej.js:3717-3762 esm-layout
function peek(heap) {
  return heap.length === 0 ? null : heap[0];
}
//@ chunk-2avr6cej.js:3762-4050 esm-layout
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
//@ chunk-2avr6cej.js:4050-4122 esm-fingerprint
function compare(a, b) {
  var diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff : a.id - b.id;
}
//@ chunk-2avr6cej.js:4122-4282 esm-fingerprint
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
//@ chunk-2avr6cej.js:4282-4406 esm-fingerprint
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
//@ chunk-2avr6cej.js:4406-4463 esm-fingerprint
function shouldYieldToHost() {
  return needsPaint ? true : schedulerExports.unstable_now() - startTime < frameInterval ? false : true;
}
//@ chunk-2avr6cej.js:4463-5029 esm-fingerprint
function performWorkUntilDeadline() {
  needsPaint = false;
  if (isMessageLoopRunning) {
    var currentTime = schedulerExports.unstable_now();
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
                currentTime = schedulerExports.unstable_now();
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
//@ chunk-2avr6cej.js:5029-5088 esm-fingerprint
function requestHostTimeout(handleTimeout, timeoutMs) {
  taskTimeoutID = localSetTimeout(function () {
    handleTimeout(schedulerExports.unstable_now());
  }, timeoutMs);
}
//@ chunk-2avr6cej.js:5088-6328 esm-layout
var unstableNow = undefined;
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
var messageChannel;
var messagePort;
var unstableIdlePriority = 5;
var unstableImmediatePriority = 1;
var unstableLowPriority = 4;
var unstableNormalPriority = 3;
var unstableProfiling = null;
var unstableUserBlockingPriority = 2;
var unstableCancelCallback = function (task) {
  task.callback = null;
};
var unstableForceFrameRate = function (fps) {
  if (0 > fps || 125 < fps)
    console.error(
      "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported",
    );
  else frameInterval = 0 < fps ? Math.floor(1000 / fps) : 5;
};
var unstableGetCurrentPriorityLevel = function () {
  return currentPriorityLevel;
};
var unstableNext = function (eventHandler) {
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
var unstableRequestPaint = function () {
  needsPaint = true;
};
var unstableRunWithPriority = function (priorityLevel, eventHandler) {
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
var unstableScheduleCallback = function (priorityLevel, callback, options) {
  var currentTime = schedulerExports.unstable_now();
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
var unstableWrapCallback = function (callback) {
  var parentPriorityLevel = currentPriorityLevel;
  return function () {
    var previousPriorityLevel = currentPriorityLevel;
    currentPriorityLevel = parentPriorityLevel;
    try {
      return callback.apply(this, arguments);
    } finally {
      currentPriorityLevel = previousPriorityLevel;
    }
  };
};
//@ chunk-2avr6cej.js:6328-6890 esm-fingerprint
var init_scheduler_production = __esm(() => {
  if (typeof performance === "object" && typeof performance.now === "function") {
    localPerformance = performance;
    unstableNow = function () {
      return localPerformance.now();
    };
  } else {
    localDate = Date;
    initialTime = localDate.now();
    unstableNow = function () {
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
    messageChannel = new MessageChannel();
    messagePort = messageChannel.port2;
    messageChannel.port1.onmessage = performWorkUntilDeadline;
    schedulePerformWorkUntilDeadline = function () {
      messagePort.postMessage(null);
    };
  } else
    schedulePerformWorkUntilDeadline = function () {
      localSetTimeout(performWorkUntilDeadline, 0);
    };
  shouldYieldToHost_default = shouldYieldToHost;
});
export {
  init_scheduler_production,
  unstableScheduleCallback,
  unstableCancelCallback,
  shouldYieldToHost_default,
  unstableRequestPaint,
  unstableNow,
  unstableImmediatePriority,
  unstableUserBlockingPriority,
  unstableNormalPriority,
  unstableIdlePriority,
};
