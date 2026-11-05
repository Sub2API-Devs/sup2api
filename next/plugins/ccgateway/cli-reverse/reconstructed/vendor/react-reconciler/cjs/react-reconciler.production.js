/**
 * react-reconciler/cjs/react-reconciler.production.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: react-reconciler@0.33.0
 * pieces: chunk-2avr6cej.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { init_react_production, addTransitionType } from "../../react/cjs/react.production.js";
import {
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
} from "../../scheduler/cjs/scheduler.production.js";

//@ chunk-2avr6cej.js:6890-126116 cjs-fingerprint
var require_react_reconciler_production = __commonJS(function (cjsExports, cjsModule) {
  init_react_production();
  init_scheduler_production();
  cjsModule.exports = function (hostConfig) {
    function createFiber(tag, pendingProps, key, mode) {
      return new FiberNode(tag, pendingProps, key, mode);
    }
    function noop() {}
    function formatProdErrorMessage(code) {
      var url = "https://react.dev/errors/" + code;
      if (1 < arguments.length) {
        url += "?args[]=" + encodeURIComponent(arguments[1]);
        for (var i = 2; i < arguments.length; i++) url += "&args[]=" + encodeURIComponent(arguments[i]);
      }
      return (
        "Minified React error #" +
        code +
        "; visit " +
        url +
        " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
      );
    }
    function getNearestMountedFiber(fiber) {
      var node = fiber;
      var nearestMounted = fiber;
      if (fiber.alternate) for (; node.return;) node = node.return;
      else {
        fiber = node;
        do {
          node = fiber;
          if ((node.flags & 4098) !== 0) nearestMounted = node.return;
          fiber = node.return;
        } while (fiber);
      }
      return node.tag === 3 ? nearestMounted : null;
    }
    function assertIsMounted(fiber) {
      if (getNearestMountedFiber(fiber) !== fiber) throw Error(formatProdErrorMessage(188));
    }
    function findCurrentFiberUsingSlowPath(fiber) {
      var alternate = fiber.alternate;
      if (!alternate) {
        alternate = getNearestMountedFiber(fiber);
        if (alternate === null) throw Error(formatProdErrorMessage(188));
        return alternate !== fiber ? null : fiber;
      }
      for (var a = fiber, b = alternate; ;) {
        var parentA = a.return;
        if (parentA === null) break;
        var parentB = parentA.alternate;
        if (parentB === null) {
          b = parentA.return;
          if (b !== null) {
            a = b;
            continue;
          }
          break;
        }
        if (parentA.child === parentB.child) {
          for (parentB = parentA.child; parentB;) {
            if (parentB === a) {
              assertIsMounted(parentA);
              return fiber;
            }
            if (parentB === b) {
              assertIsMounted(parentA);
              return alternate;
            }
            parentB = parentB.sibling;
          }
          throw Error(formatProdErrorMessage(188));
        }
        if (a.return !== b.return) {
          a = parentA;
          b = parentB;
        } else {
          for (var didFindChild = false, child$0 = parentA.child; child$0;) {
            if (child$0 === a) {
              didFindChild = true;
              a = parentA;
              b = parentB;
              break;
            }
            if (child$0 === b) {
              didFindChild = true;
              b = parentA;
              a = parentB;
              break;
            }
            child$0 = child$0.sibling;
          }
          if (!didFindChild) {
            for (child$0 = parentB.child; child$0;) {
              if (child$0 === a) {
                didFindChild = true;
                a = parentB;
                b = parentA;
                break;
              }
              if (child$0 === b) {
                didFindChild = true;
                b = parentB;
                a = parentA;
                break;
              }
              child$0 = child$0.sibling;
            }
            if (!didFindChild) throw Error(formatProdErrorMessage(189));
          }
        }
        if (a.alternate !== b) throw Error(formatProdErrorMessage(190));
      }
      if (a.tag !== 3) throw Error(formatProdErrorMessage(188));
      return a.stateNode.current === a ? fiber : alternate;
    }
    function findCurrentHostFiberImpl(node) {
      var tag = node.tag;
      if (tag === 5 || tag === 26 || tag === 27 || tag === 6) return node;
      for (node = node.child; node !== null;) {
        tag = findCurrentHostFiberImpl(node);
        if (tag !== null) return tag;
        node = node.sibling;
      }
      return null;
    }
    function findCurrentHostFiberWithNoPortalsImpl(node) {
      var tag = node.tag;
      if (tag === 5 || tag === 26 || tag === 27 || tag === 6) return node;
      for (node = node.child; node !== null;) {
        if (node.tag !== 4 && ((tag = findCurrentHostFiberWithNoPortalsImpl(node)), tag !== null)) return tag;
        node = node.sibling;
      }
      return null;
    }
    function getIteratorFn(maybeIterable) {
      if (maybeIterable === null || typeof maybeIterable !== "object") return null;
      maybeIterable =
        (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) || maybeIterable["@@iterator"];
      return typeof maybeIterable === "function" ? maybeIterable : null;
    }
    function getComponentNameFromType(type) {
      if (type == null) return null;
      if (typeof type === "function")
        return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
      if (typeof type === "string") return type;
      switch (type) {
        case REACT_FRAGMENT_TYPE:
          return "Fragment";
        case REACT_PROFILER_TYPE:
          return "Profiler";
        case REACT_STRICT_MODE_TYPE:
          return "StrictMode";
        case REACT_SUSPENSE_TYPE:
          return "Suspense";
        case REACT_SUSPENSE_LIST_TYPE:
          return "SuspenseList";
        case REACT_ACTIVITY_TYPE:
          return "Activity";
      }
      if (typeof type === "object")
        switch (type.$$typeof) {
          case REACT_PORTAL_TYPE:
            return "Portal";
          case REACT_CONTEXT_TYPE:
            return type.displayName || "Context";
          case REACT_CONSUMER_TYPE:
            return (type._context.displayName || "Context") + ".Consumer";
          case REACT_FORWARD_REF_TYPE:
            var innerType = type.render;
            type = type.displayName;
            if (!type) {
              type = innerType.displayName || innerType.name || "";
              type = type !== "" ? "ForwardRef(" + type + ")" : "ForwardRef";
            }
            return type;
          case REACT_MEMO_TYPE:
            innerType = type.displayName || null;
            return innerType !== null ? innerType : getComponentNameFromType(type.type) || "Memo";
          case REACT_LAZY_TYPE:
            innerType = type._payload;
            type = type._init;
            try {
              return getComponentNameFromType(type(innerType));
            } catch (x) {}
        }
      return null;
    }
    function createCursor(defaultValue) {
      return {
        current: defaultValue,
      };
    }
    function pop(cursor) {
      if (!(0 > index$jscomp$0)) {
        cursor.current = valueStack[index$jscomp$0];
        valueStack[index$jscomp$0] = null;
        index$jscomp$0--;
      }
    }
    function push(cursor, value) {
      index$jscomp$0++;
      valueStack[index$jscomp$0] = cursor.current;
      cursor.current = value;
    }
    function clz32Fallback(x) {
      x >>>= 0;
      return x === 0 ? 32 : (31 - ((log$1(x) / LN2) | 0)) | 0;
    }
    function getHighestPriorityLanes(lanes) {
      var pendingSyncLanes = lanes & 42;
      if (pendingSyncLanes !== 0) return pendingSyncLanes;
      switch (lanes & -lanes) {
        case 1:
          return 1;
        case 2:
          return 2;
        case 4:
          return 4;
        case 8:
          return 8;
        case 16:
          return 16;
        case 32:
          return 32;
        case 64:
          return 64;
        case 128:
          return 128;
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
          return lanes & 261888;
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
          return lanes & 3932160;
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
          return lanes & 62914560;
        case 67108864:
          return 67108864;
        case 134217728:
          return 134217728;
        case 268435456:
          return 268435456;
        case 536870912:
          return 536870912;
        case 1073741824:
          return 0;
        default:
          return lanes;
      }
    }
    function getNextLanes(root, wipLanes, rootHasPendingCommit) {
      var pendingLanes = root.pendingLanes;
      if (pendingLanes === 0) return 0;
      var nextLanes = 0;
      var suspendedLanes = root.suspendedLanes;
      var pingedLanes = root.pingedLanes;
      root = root.warmLanes;
      var nonIdlePendingLanes = pendingLanes & 134217727;
      if (nonIdlePendingLanes !== 0) {
        pendingLanes = nonIdlePendingLanes & ~suspendedLanes;
        if (pendingLanes !== 0) nextLanes = getHighestPriorityLanes(pendingLanes);
        else {
          pingedLanes &= nonIdlePendingLanes;
          if (pingedLanes !== 0) nextLanes = getHighestPriorityLanes(pingedLanes);
          else if (!rootHasPendingCommit) {
            rootHasPendingCommit = nonIdlePendingLanes & ~root;
            if (rootHasPendingCommit !== 0) nextLanes = getHighestPriorityLanes(rootHasPendingCommit);
          }
        }
      } else {
        nonIdlePendingLanes = pendingLanes & ~suspendedLanes;
        if (nonIdlePendingLanes !== 0) nextLanes = getHighestPriorityLanes(nonIdlePendingLanes);
        else if (pingedLanes !== 0) nextLanes = getHighestPriorityLanes(pingedLanes);
        else if (!rootHasPendingCommit) {
          rootHasPendingCommit = pendingLanes & ~root;
          if (rootHasPendingCommit !== 0) nextLanes = getHighestPriorityLanes(rootHasPendingCommit);
        }
      }
      return nextLanes === 0
        ? 0
        : wipLanes !== 0 &&
            wipLanes !== nextLanes &&
            (wipLanes & suspendedLanes) === 0 &&
            ((suspendedLanes = nextLanes & -nextLanes),
            (rootHasPendingCommit = wipLanes & -wipLanes),
            suspendedLanes >= rootHasPendingCommit ||
              (suspendedLanes === 32 && (rootHasPendingCommit & 4194048) !== 0))
          ? wipLanes
          : nextLanes;
    }
    function checkIfRootIsPrerendering(root, renderLanes) {
      return (root.pendingLanes & ~(root.suspendedLanes & ~root.pingedLanes) & renderLanes) === 0;
    }
    function computeExpirationTime(lane, currentTime) {
      switch (lane) {
        case 1:
        case 2:
        case 4:
        case 8:
        case 64:
          return currentTime + 250;
        case 16:
        case 32:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
          return currentTime + 5000;
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
          return -1;
        case 67108864:
        case 134217728:
        case 268435456:
        case 536870912:
        case 1073741824:
          return -1;
        default:
          return -1;
      }
    }
    function claimNextRetryLane() {
      var lane = nextRetryLane;
      nextRetryLane <<= 1;
      if ((nextRetryLane & 62914560) === 0) nextRetryLane = 4194304;
      return lane;
    }
    function createLaneMap(initial) {
      for (var laneMap = [], i = 0; 31 > i; i++) laneMap.push(initial);
      return laneMap;
    }
    function markRootUpdated$1(root, updateLane) {
      root.pendingLanes |= updateLane;
      if (updateLane !== 268435456) {
        root.suspendedLanes = 0;
        root.pingedLanes = 0;
        root.warmLanes = 0;
      }
    }
    function markRootFinished(
      root,
      finishedLanes,
      remainingLanes,
      spawnedLane,
      updatedLanes,
      suspendedRetryLanes,
    ) {
      var previouslyPendingLanes = root.pendingLanes;
      root.pendingLanes = remainingLanes;
      root.suspendedLanes = 0;
      root.pingedLanes = 0;
      root.warmLanes = 0;
      root.expiredLanes &= remainingLanes;
      root.entangledLanes &= remainingLanes;
      root.errorRecoveryDisabledLanes &= remainingLanes;
      root.shellSuspendCounter = 0;
      var { entanglements, expirationTimes, hiddenUpdates } = root;
      for (remainingLanes = previouslyPendingLanes & ~remainingLanes; 0 < remainingLanes;) {
        var index$5 = 31 - clz32(remainingLanes);
        var lane = 1 << index$5;
        entanglements[index$5] = 0;
        expirationTimes[index$5] = -1;
        var hiddenUpdatesForLane = hiddenUpdates[index$5];
        if (hiddenUpdatesForLane !== null)
          for (hiddenUpdates[index$5] = null, index$5 = 0; index$5 < hiddenUpdatesForLane.length; index$5++) {
            var update = hiddenUpdatesForLane[index$5];
            if (update !== null) update.lane &= -536870913;
          }
        remainingLanes &= ~lane;
      }
      if (spawnedLane !== 0) markSpawnedDeferredLane(root, spawnedLane, 0);
      if (suspendedRetryLanes !== 0 && updatedLanes === 0 && root.tag !== 0)
        root.suspendedLanes |= suspendedRetryLanes & ~(previouslyPendingLanes & ~finishedLanes);
    }
    function markSpawnedDeferredLane(root, spawnedLane, entangledLanes) {
      root.pendingLanes |= spawnedLane;
      root.suspendedLanes &= ~spawnedLane;
      var spawnedLaneIndex = 31 - clz32(spawnedLane);
      root.entangledLanes |= spawnedLane;
      root.entanglements[spawnedLaneIndex] =
        root.entanglements[spawnedLaneIndex] | 1073741824 | (entangledLanes & 261930);
    }
    function markRootEntangled(root, entangledLanes) {
      var rootEntangledLanes = (root.entangledLanes |= entangledLanes);
      for (root = root.entanglements; rootEntangledLanes;) {
        var index$6 = 31 - clz32(rootEntangledLanes);
        var lane = 1 << index$6;
        if ((lane & entangledLanes) | (root[index$6] & entangledLanes)) root[index$6] |= entangledLanes;
        rootEntangledLanes &= ~lane;
      }
    }
    function getBumpedLaneForHydration(root, renderLanes) {
      var renderLane = renderLanes & -renderLanes;
      renderLane = (renderLane & 42) !== 0 ? 1 : getBumpedLaneForHydrationByLane(renderLane);
      return (renderLane & (root.suspendedLanes | renderLanes)) !== 0 ? 0 : renderLane;
    }
    function getBumpedLaneForHydrationByLane(lane) {
      switch (lane) {
        case 2:
          lane = 1;
          break;
        case 8:
          lane = 4;
          break;
        case 32:
          lane = 16;
          break;
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
          lane = 128;
          break;
        case 268435456:
          lane = 134217728;
          break;
        default:
          lane = 0;
      }
      return lane;
    }
    function lanesToEventPriority(lanes) {
      lanes &= -lanes;
      return 2 < lanes ? (8 < lanes ? ((lanes & 134217727) !== 0 ? 32 : 268435456) : 8) : 2;
    }
    function setIsStrictModeForDevtools(newIsStrictMode) {
      if (typeof log === "function") strictModeHook(newIsStrictMode);
      if (injectedHook && typeof injectedHook.setStrictMode === "function")
        try {
          injectedHook.setStrictMode(rendererID, newIsStrictMode);
        } catch (err) {}
    }
    function is(x, y) {
      return (x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y);
    }
    function describeBuiltInComponentFrame(name) {
      if (prefix === undefined)
        try {
          throw Error();
        } catch (x) {
          var match = x.stack.trim().match(/\n( *(at )?)/);
          prefix = (match && match[1]) || "";
          suffix =
            -1 <
            x.stack.indexOf(`
    at`)
              ? " (<anonymous>)"
              : -1 < x.stack.indexOf("@")
                ? "@unknown:0:0"
                : "";
        }
      return (
        `
` +
        prefix +
        name +
        suffix
      );
    }
    function describeNativeComponentFrame(fn, construct) {
      if (!fn || reentry) return "";
      reentry = true;
      var previousPrepareStackTrace = Error.prepareStackTrace;
      Error.prepareStackTrace = undefined;
      try {
        var RunInRootFrame = {
          DetermineComponentFrameRoot: function () {
            try {
              if (construct) {
                var Fake = function () {
                  throw Error();
                };
                Object.defineProperty(Fake.prototype, "props", {
                  set: function () {
                    throw Error();
                  },
                });
                if (typeof Reflect === "object" && Reflect.construct) {
                  try {
                    Reflect.construct(Fake, []);
                  } catch (x) {
                    var control = x;
                  }
                  Reflect.construct(fn, [], Fake);
                } else {
                  try {
                    Fake.call();
                  } catch (x$8) {
                    control = x$8;
                  }
                  fn.call(Fake.prototype);
                }
              } else {
                try {
                  throw Error();
                } catch (x$9) {
                  control = x$9;
                }
                if ((Fake = fn()) && typeof Fake.catch === "function") Fake.catch(function () {});
              }
            } catch (sample) {
              if (sample && control && typeof sample.stack === "string") return [sample.stack, control.stack];
            }
            return [null, null];
          },
        };
        RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
        var namePropDescriptor = Object.getOwnPropertyDescriptor(
          RunInRootFrame.DetermineComponentFrameRoot,
          "name",
        );
        if (namePropDescriptor && namePropDescriptor.configurable)
          Object.defineProperty(RunInRootFrame.DetermineComponentFrameRoot, "name", {
            value: "DetermineComponentFrameRoot",
          });
        var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot();
        var sampleStack = _RunInRootFrame$Deter[0];
        var controlStack = _RunInRootFrame$Deter[1];
        if (sampleStack && controlStack) {
          var sampleLines = sampleStack.split(`
`);
          var controlLines = controlStack.split(`
`);
          for (
            namePropDescriptor = RunInRootFrame = 0;
            RunInRootFrame < sampleLines.length &&
            !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot");
          )
            RunInRootFrame++;
          for (
            ;
            namePropDescriptor < controlLines.length &&
            !controlLines[namePropDescriptor].includes("DetermineComponentFrameRoot");
          )
            namePropDescriptor++;
          if (RunInRootFrame === sampleLines.length || namePropDescriptor === controlLines.length)
            for (
              RunInRootFrame = sampleLines.length - 1, namePropDescriptor = controlLines.length - 1;
              1 <= RunInRootFrame &&
              0 <= namePropDescriptor &&
              sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor];
            )
              namePropDescriptor--;
          for (; 1 <= RunInRootFrame && 0 <= namePropDescriptor; RunInRootFrame--, namePropDescriptor--)
            if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
              if (RunInRootFrame !== 1 || namePropDescriptor !== 1)
                do {
                  RunInRootFrame--;
                  namePropDescriptor--;
                  if (
                    0 > namePropDescriptor ||
                    sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]
                  ) {
                    var frame =
                      `
` + sampleLines[RunInRootFrame].replace(" at new ", " at ");
                    if (fn.displayName && frame.includes("<anonymous>"))
                      frame = frame.replace("<anonymous>", fn.displayName);
                    return frame;
                  }
                } while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
              break;
            }
        }
      } finally {
        reentry = false;
        Error.prepareStackTrace = previousPrepareStackTrace;
      }
      return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "")
        ? describeBuiltInComponentFrame(previousPrepareStackTrace)
        : "";
    }
    function describeFiber(fiber, childFiber) {
      switch (fiber.tag) {
        case 26:
        case 27:
        case 5:
          return describeBuiltInComponentFrame(fiber.type);
        case 16:
          return describeBuiltInComponentFrame("Lazy");
        case 13:
          return fiber.child !== childFiber && childFiber !== null
            ? describeBuiltInComponentFrame("Suspense Fallback")
            : describeBuiltInComponentFrame("Suspense");
        case 19:
          return describeBuiltInComponentFrame("SuspenseList");
        case 0:
        case 15:
          return describeNativeComponentFrame(fiber.type, false);
        case 11:
          return describeNativeComponentFrame(fiber.type.render, false);
        case 1:
          return describeNativeComponentFrame(fiber.type, true);
        case 31:
          return describeBuiltInComponentFrame("Activity");
        default:
          return "";
      }
    }
    function getStackByFiberInDevAndProd(workInProgress) {
      try {
        var info = "";
        var previous = null;
        do {
          info += describeFiber(workInProgress, previous);
          previous = workInProgress;
          workInProgress = workInProgress.return;
        } while (workInProgress);
        return info;
      } catch (x) {
        return (
          `
Error generating stack: ` +
          x.message +
          `
` +
          x.stack
        );
      }
    }
    function createCapturedValueAtFiber(value, source) {
      if (typeof value === "object" && value !== null) {
        var existing = CapturedStacks.get(value);
        if (existing !== undefined) return existing;
        source = {
          value,
          source,
          stack: getStackByFiberInDevAndProd(source),
        };
        CapturedStacks.set(value, source);
        return source;
      }
      return {
        value,
        source,
        stack: getStackByFiberInDevAndProd(source),
      };
    }
    function pushTreeFork(workInProgress, totalChildren) {
      forkStack[forkStackIndex++] = treeForkCount;
      forkStack[forkStackIndex++] = treeForkProvider;
      treeForkProvider = workInProgress;
      treeForkCount = totalChildren;
    }
    function pushTreeId(workInProgress, totalChildren, index) {
      idStack[idStackIndex++] = treeContextId;
      idStack[idStackIndex++] = treeContextOverflow;
      idStack[idStackIndex++] = treeContextProvider;
      treeContextProvider = workInProgress;
      var baseIdWithLeadingBit = treeContextId;
      workInProgress = treeContextOverflow;
      var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
      baseIdWithLeadingBit &= ~(1 << baseLength);
      index += 1;
      var length = 32 - clz32(totalChildren) + baseLength;
      if (30 < length) {
        var numberOfOverflowBits = baseLength - (baseLength % 5);
        length = (baseIdWithLeadingBit & ((1 << numberOfOverflowBits) - 1)).toString(32);
        baseIdWithLeadingBit >>= numberOfOverflowBits;
        baseLength -= numberOfOverflowBits;
        treeContextId =
          (1 << (32 - clz32(totalChildren) + baseLength)) | (index << baseLength) | baseIdWithLeadingBit;
        treeContextOverflow = length + workInProgress;
      } else {
        treeContextId = (1 << length) | (index << baseLength) | baseIdWithLeadingBit;
        treeContextOverflow = workInProgress;
      }
    }
    function pushMaterializedTreeId(workInProgress) {
      if (workInProgress.return !== null) {
        pushTreeFork(workInProgress, 1);
        pushTreeId(workInProgress, 1, 0);
      }
    }
    function popTreeContext(workInProgress) {
      for (; workInProgress === treeForkProvider;) {
        treeForkProvider = forkStack[--forkStackIndex];
        forkStack[forkStackIndex] = null;
        treeForkCount = forkStack[--forkStackIndex];
        forkStack[forkStackIndex] = null;
      }
      for (; workInProgress === treeContextProvider;) {
        treeContextProvider = idStack[--idStackIndex];
        idStack[idStackIndex] = null;
        treeContextOverflow = idStack[--idStackIndex];
        idStack[idStackIndex] = null;
        treeContextId = idStack[--idStackIndex];
        idStack[idStackIndex] = null;
      }
    }
    function restoreSuspendedTreeContext(workInProgress, suspendedContext) {
      idStack[idStackIndex++] = treeContextId;
      idStack[idStackIndex++] = treeContextOverflow;
      idStack[idStackIndex++] = treeContextProvider;
      treeContextId = suspendedContext.id;
      treeContextOverflow = suspendedContext.overflow;
      treeContextProvider = workInProgress;
    }
    function pushHostContainer(fiber, nextRootInstance) {
      push(rootInstanceStackCursor, nextRootInstance);
      push(contextFiberStackCursor, fiber);
      push(contextStackCursor, null);
      fiber = getRootHostContext(nextRootInstance);
      pop(contextStackCursor);
      push(contextStackCursor, fiber);
    }
    function popHostContainer() {
      pop(contextStackCursor);
      pop(contextFiberStackCursor);
      pop(rootInstanceStackCursor);
    }
    function pushHostContext(fiber) {
      if (fiber.memoizedState !== null) push(hostTransitionProviderCursor, fiber);
      var context = contextStackCursor.current;
      var nextContext = getChildHostContext(context, fiber.type);
      if (context !== nextContext) {
        push(contextFiberStackCursor, fiber);
        push(contextStackCursor, nextContext);
      }
    }
    function popHostContext(fiber) {
      if (contextFiberStackCursor.current === fiber) {
        pop(contextStackCursor);
        pop(contextFiberStackCursor);
      }
      if (hostTransitionProviderCursor.current === fiber) {
        pop(hostTransitionProviderCursor);
        if (isPrimaryRenderer) HostTransitionContext._currentValue = NotPendingTransition;
        else HostTransitionContext._currentValue2 = NotPendingTransition;
      }
    }
    function throwOnHydrationMismatch(fiber) {
      var error = Error(
        formatProdErrorMessage(
          418,
          1 < arguments.length && arguments[1] !== undefined && arguments[1] ? "text" : "HTML",
          "",
        ),
      );
      queueHydrationError(createCapturedValueAtFiber(error, fiber));
      throw HydrationMismatchException;
    }
    function prepareToHydrateHostInstance(fiber, hostContext) {
      if (!supportsHydration) throw Error(formatProdErrorMessage(175));
      if (!hydrateInstance(fiber.stateNode, fiber.type, fiber.memoizedProps, hostContext, fiber))
        throwOnHydrationMismatch(fiber, true);
    }
    function popToNextHostParent(fiber) {
      for (hydrationParentFiber = fiber.return; hydrationParentFiber;)
        switch (hydrationParentFiber.tag) {
          case 5:
          case 31:
          case 13:
            rootOrSingletonContext = false;
            return;
          case 27:
          case 3:
            rootOrSingletonContext = true;
            return;
          default:
            hydrationParentFiber = hydrationParentFiber.return;
        }
    }
    function popHydrationState(fiber) {
      if (!supportsHydration || fiber !== hydrationParentFiber) return false;
      if (!isHydrating) {
        popToNextHostParent(fiber);
        isHydrating = true;
        return false;
      }
      var tag = fiber.tag;
      if (supportsSingletons) {
        if (
          tag !== 3 &&
          tag !== 27 &&
          (tag !== 5 ||
            (shouldDeleteUnhydratedTailInstances(fiber.type) &&
              !shouldSetTextContent(fiber.type, fiber.memoizedProps))) &&
          nextHydratableInstance
        )
          throwOnHydrationMismatch(fiber);
      } else if (
        tag !== 3 &&
        (tag !== 5 ||
          (shouldDeleteUnhydratedTailInstances(fiber.type) &&
            !shouldSetTextContent(fiber.type, fiber.memoizedProps))) &&
        nextHydratableInstance
      )
        throwOnHydrationMismatch(fiber);
      popToNextHostParent(fiber);
      if (tag === 13) {
        if (!supportsHydration) throw Error(formatProdErrorMessage(316));
        fiber = fiber.memoizedState;
        fiber = fiber !== null ? fiber.dehydrated : null;
        if (!fiber) throw Error(formatProdErrorMessage(317));
        nextHydratableInstance = getNextHydratableInstanceAfterSuspenseInstance(fiber);
      } else if (tag === 31) {
        fiber = fiber.memoizedState;
        fiber = fiber !== null ? fiber.dehydrated : null;
        if (!fiber) throw Error(formatProdErrorMessage(317));
        nextHydratableInstance = getNextHydratableInstanceAfterActivityInstance(fiber);
      } else
        nextHydratableInstance =
          supportsSingletons && tag === 27
            ? getNextHydratableSiblingAfterSingleton(fiber.type, nextHydratableInstance)
            : hydrationParentFiber
              ? getNextHydratableSibling(fiber.stateNode)
              : null;
      return true;
    }
    function resetHydrationState() {
      if (supportsHydration) {
        nextHydratableInstance = hydrationParentFiber = null;
        isHydrating = false;
      }
    }
    function upgradeHydrationErrorsToRecoverable() {
      var queuedErrors = hydrationErrors;
      if (queuedErrors !== null) {
        if (workInProgressRootRecoverableErrors === null) workInProgressRootRecoverableErrors = queuedErrors;
        else
          workInProgressRootRecoverableErrors.push.apply(workInProgressRootRecoverableErrors, queuedErrors);
        hydrationErrors = null;
      }
      return queuedErrors;
    }
    function queueHydrationError(error) {
      if (hydrationErrors === null) hydrationErrors = [error];
      else hydrationErrors.push(error);
    }
    function pushProvider(providerFiber, context, nextValue) {
      if (isPrimaryRenderer) {
        push(valueCursor, context._currentValue);
        context._currentValue = nextValue;
      } else {
        push(valueCursor, context._currentValue2);
        context._currentValue2 = nextValue;
      }
    }
    function popProvider(context) {
      var currentValue = valueCursor.current;
      if (isPrimaryRenderer) context._currentValue = currentValue;
      else context._currentValue2 = currentValue;
      pop(valueCursor);
    }
    function scheduleContextWorkOnParentPath(parent, renderLanes, propagationRoot) {
      for (; parent !== null;) {
        var alternate = parent.alternate;
        if ((parent.childLanes & renderLanes) !== renderLanes) {
          parent.childLanes |= renderLanes;
          if (alternate !== null) alternate.childLanes |= renderLanes;
        } else if (alternate !== null && (alternate.childLanes & renderLanes) !== renderLanes)
          alternate.childLanes |= renderLanes;
        if (parent === propagationRoot) break;
        parent = parent.return;
      }
    }
    function propagateContextChanges(workInProgress, contexts, renderLanes, forcePropagateEntireTree) {
      var fiber = workInProgress.child;
      if (fiber !== null) fiber.return = workInProgress;
      for (; fiber !== null;) {
        var list = fiber.dependencies;
        if (list !== null) {
          var nextFiber = fiber.child;
          list = list.firstContext;
          e: for (; list !== null;) {
            var dependency = list;
            list = fiber;
            for (var i = 0; i < contexts.length; i++)
              if (dependency.context === contexts[i]) {
                list.lanes |= renderLanes;
                dependency = list.alternate;
                if (dependency !== null) dependency.lanes |= renderLanes;
                scheduleContextWorkOnParentPath(list.return, renderLanes, workInProgress);
                if (!forcePropagateEntireTree) nextFiber = null;
                break e;
              }
            list = dependency.next;
          }
        } else if (fiber.tag === 18) {
          nextFiber = fiber.return;
          if (nextFiber === null) throw Error(formatProdErrorMessage(341));
          nextFiber.lanes |= renderLanes;
          list = nextFiber.alternate;
          if (list !== null) list.lanes |= renderLanes;
          scheduleContextWorkOnParentPath(nextFiber, renderLanes, workInProgress);
          nextFiber = null;
        } else nextFiber = fiber.child;
        if (nextFiber !== null) nextFiber.return = fiber;
        else
          for (nextFiber = fiber; nextFiber !== null;) {
            if (nextFiber === workInProgress) {
              nextFiber = null;
              break;
            }
            fiber = nextFiber.sibling;
            if (fiber !== null) {
              fiber.return = nextFiber.return;
              nextFiber = fiber;
              break;
            }
            nextFiber = nextFiber.return;
          }
        fiber = nextFiber;
      }
    }
    function propagateParentContextChanges(current, workInProgress, renderLanes, forcePropagateEntireTree) {
      current = null;
      for (var parent = workInProgress, isInsidePropagationBailout = false; parent !== null;) {
        if (!isInsidePropagationBailout) {
          if ((parent.flags & 524288) !== 0) isInsidePropagationBailout = true;
          else if ((parent.flags & 262144) !== 0) break;
        }
        if (parent.tag === 10) {
          var currentParent = parent.alternate;
          if (currentParent === null) throw Error(formatProdErrorMessage(387));
          currentParent = currentParent.memoizedProps;
          if (currentParent !== null) {
            var context = parent.type;
            if (!objectIs(parent.pendingProps.value, currentParent.value)) {
              if (current !== null) current.push(context);
              else current = [context];
            }
          }
        } else if (parent === hostTransitionProviderCursor.current) {
          currentParent = parent.alternate;
          if (currentParent === null) throw Error(formatProdErrorMessage(387));
          if (currentParent.memoizedState.memoizedState !== parent.memoizedState.memoizedState) {
            if (current !== null) current.push(HostTransitionContext);
            else current = [HostTransitionContext];
          }
        }
        parent = parent.return;
      }
      if (current !== null)
        propagateContextChanges(workInProgress, current, renderLanes, forcePropagateEntireTree);
      workInProgress.flags |= 262144;
    }
    function checkIfContextChanged(currentDependencies) {
      for (currentDependencies = currentDependencies.firstContext; currentDependencies !== null;) {
        var context = currentDependencies.context;
        if (
          !objectIs(
            isPrimaryRenderer ? context._currentValue : context._currentValue2,
            currentDependencies.memoizedValue,
          )
        )
          return true;
        currentDependencies = currentDependencies.next;
      }
      return false;
    }
    function prepareToReadContext(workInProgress) {
      currentlyRenderingFiber$1 = workInProgress;
      lastContextDependency = null;
      workInProgress = workInProgress.dependencies;
      if (workInProgress !== null) workInProgress.firstContext = null;
    }
    function readContext(context) {
      return readContextForConsumer(currentlyRenderingFiber$1, context);
    }
    function readContextDuringReconciliation(consumer, context) {
      if (currentlyRenderingFiber$1 === null) prepareToReadContext(consumer);
      return readContextForConsumer(consumer, context);
    }
    function readContextForConsumer(consumer, context) {
      var value = isPrimaryRenderer ? context._currentValue : context._currentValue2;
      context = {
        context,
        memoizedValue: value,
        next: null,
      };
      if (lastContextDependency === null) {
        if (consumer === null) throw Error(formatProdErrorMessage(308));
        lastContextDependency = context;
        consumer.dependencies = {
          lanes: 0,
          firstContext: context,
        };
        consumer.flags |= 524288;
      } else lastContextDependency = lastContextDependency.next = context;
      return value;
    }
    function createCache() {
      return {
        controller: new AbortControllerLocal(),
        data: new Map(),
        refCount: 0,
      };
    }
    function releaseCache(cache) {
      cache.refCount--;
      if (cache.refCount === 0)
        scheduleCallback$2(NormalPriority, function () {
          cache.controller.abort();
        });
    }
    function noop$1() {}
    function ensureRootIsScheduled(root) {
      if (root !== lastScheduledRoot && root.next === null) {
        if (lastScheduledRoot === null) firstScheduledRoot = lastScheduledRoot = root;
        else lastScheduledRoot = lastScheduledRoot.next = root;
      }
      mightHavePendingSyncWork = true;
      if (!didScheduleMicrotask) {
        didScheduleMicrotask = true;
        scheduleImmediateRootScheduleTask();
      }
    }
    function flushSyncWorkAcrossRoots_impl(syncTransitionLanes, onlyLegacy) {
      if (!isFlushingWork && mightHavePendingSyncWork) {
        isFlushingWork = true;
        do {
          var didPerformSomeWork = false;
          for (var root = firstScheduledRoot; root !== null;) {
            if (!onlyLegacy)
              if (syncTransitionLanes !== 0) {
                var pendingLanes = root.pendingLanes;
                if (pendingLanes === 0) var JSCompiler_inline_result = 0;
                else {
                  var suspendedLanes = root.suspendedLanes;
                  var pingedLanes = root.pingedLanes;
                  JSCompiler_inline_result = (1 << (31 - clz32(42 | syncTransitionLanes) + 1)) - 1;
                  JSCompiler_inline_result &= pendingLanes & ~(suspendedLanes & ~pingedLanes);
                  JSCompiler_inline_result =
                    JSCompiler_inline_result & 201326741
                      ? (JSCompiler_inline_result & 201326741) | 1
                      : JSCompiler_inline_result
                        ? JSCompiler_inline_result | 2
                        : 0;
                }
                if (JSCompiler_inline_result !== 0) {
                  didPerformSomeWork = true;
                  performSyncWorkOnRoot(root, JSCompiler_inline_result);
                }
              } else {
                JSCompiler_inline_result = workInProgressRootRenderLanes;
                JSCompiler_inline_result = getNextLanes(
                  root,
                  root === workInProgressRoot ? JSCompiler_inline_result : 0,
                  root.cancelPendingCommit !== null || root.timeoutHandle !== noTimeout,
                );
                if (!(
                  (JSCompiler_inline_result & 3) === 0 ||
                  checkIfRootIsPrerendering(root, JSCompiler_inline_result)
                )) {
                  didPerformSomeWork = true;
                  performSyncWorkOnRoot(root, JSCompiler_inline_result);
                }
              }
            root = root.next;
          }
        } while (didPerformSomeWork);
        isFlushingWork = false;
      }
    }
    function processRootScheduleInImmediateTask() {
      processRootScheduleInMicrotask();
    }
    function processRootScheduleInMicrotask() {
      mightHavePendingSyncWork = didScheduleMicrotask = false;
      var syncTransitionLanes = 0;
      if (currentEventTransitionLane !== 0 && shouldAttemptEagerTransition())
        syncTransitionLanes = currentEventTransitionLane;
      for (var currentTime = now(), prev = null, root = firstScheduledRoot; root !== null;) {
        var nextRoot = root.next;
        var nextLanes = scheduleTaskForRootDuringMicrotask(root, currentTime);
        if (nextLanes === 0) {
          root.next = null;
          if (prev === null) firstScheduledRoot = nextRoot;
          else prev.next = nextRoot;
          if (nextRoot === null) lastScheduledRoot = prev;
        } else {
          prev = root;
          if (syncTransitionLanes !== 0 || (nextLanes & 3) !== 0) mightHavePendingSyncWork = true;
        }
        root = nextRoot;
      }
      if (!(pendingEffectsStatus !== 0 && pendingEffectsStatus !== 5))
        flushSyncWorkAcrossRoots_impl(syncTransitionLanes, false);
      if (currentEventTransitionLane !== 0) currentEventTransitionLane = 0;
    }
    function scheduleTaskForRootDuringMicrotask(root, currentTime) {
      for (
        var { suspendedLanes, pingedLanes, expirationTimes } = root, lanes = root.pendingLanes & -62914561;
        0 < lanes;
      ) {
        var index$3 = 31 - clz32(lanes);
        var lane = 1 << index$3;
        var expirationTime = expirationTimes[index$3];
        if (expirationTime === -1) {
          if ((lane & suspendedLanes) === 0 || (lane & pingedLanes) !== 0)
            expirationTimes[index$3] = computeExpirationTime(lane, currentTime);
        } else if (expirationTime <= currentTime) root.expiredLanes |= lane;
        lanes &= ~lane;
      }
      currentTime = workInProgressRoot;
      suspendedLanes = workInProgressRootRenderLanes;
      suspendedLanes = getNextLanes(
        root,
        root === currentTime ? suspendedLanes : 0,
        root.cancelPendingCommit !== null || root.timeoutHandle !== noTimeout,
      );
      pingedLanes = root.callbackNode;
      if (
        suspendedLanes === 0 ||
        (root === currentTime &&
          (workInProgressSuspendedReason === 2 || workInProgressSuspendedReason === 9)) ||
        root.cancelPendingCommit !== null
      ) {
        if (pingedLanes !== null && pingedLanes !== null) cancelCallback$1(pingedLanes);
        root.callbackNode = null;
        return (root.callbackPriority = 0);
      }
      if ((suspendedLanes & 3) === 0 || checkIfRootIsPrerendering(root, suspendedLanes)) {
        currentTime = suspendedLanes & -suspendedLanes;
        if (currentTime === root.callbackPriority) return currentTime;
        switch (
          (pingedLanes !== null && cancelCallback$1(pingedLanes), lanesToEventPriority(suspendedLanes))
        ) {
          case 2:
          case 8:
            suspendedLanes = UserBlockingPriority;
            break;
          case 32:
            suspendedLanes = NormalPriority$1;
            break;
          case 268435456:
            suspendedLanes = IdlePriority;
            break;
          default:
            suspendedLanes = NormalPriority$1;
        }
        pingedLanes = performWorkOnRootViaSchedulerTask.bind(null, root);
        suspendedLanes = scheduleCallback$3(suspendedLanes, pingedLanes);
        root.callbackPriority = currentTime;
        root.callbackNode = suspendedLanes;
        return currentTime;
      }
      if (pingedLanes !== null && pingedLanes !== null) cancelCallback$1(pingedLanes);
      root.callbackPriority = 2;
      root.callbackNode = null;
      return 2;
    }
    function performWorkOnRootViaSchedulerTask(root, didTimeout) {
      if (pendingEffectsStatus !== 0 && pendingEffectsStatus !== 5) {
        root.callbackNode = null;
        root.callbackPriority = 0;
        return null;
      }
      var originalCallbackNode = root.callbackNode;
      if (flushPendingEffects() && root.callbackNode !== originalCallbackNode) return null;
      var workInProgressRootRenderLanes$jscomp$0 = workInProgressRootRenderLanes;
      workInProgressRootRenderLanes$jscomp$0 = getNextLanes(
        root,
        root === workInProgressRoot ? workInProgressRootRenderLanes$jscomp$0 : 0,
        root.cancelPendingCommit !== null || root.timeoutHandle !== noTimeout,
      );
      if (workInProgressRootRenderLanes$jscomp$0 === 0) return null;
      performWorkOnRoot(root, workInProgressRootRenderLanes$jscomp$0, didTimeout);
      scheduleTaskForRootDuringMicrotask(root, now());
      return root.callbackNode != null && root.callbackNode === originalCallbackNode
        ? performWorkOnRootViaSchedulerTask.bind(null, root)
        : null;
    }
    function performSyncWorkOnRoot(root, lanes) {
      if (flushPendingEffects()) return null;
      performWorkOnRoot(root, lanes, true);
    }
    function scheduleImmediateRootScheduleTask() {
      if (supportsMicrotasks)
        scheduleMicrotask(function () {
          if ((executionContext & 6) !== 0)
            scheduleCallback$3(ImmediatePriority, processRootScheduleInImmediateTask);
          else processRootScheduleInMicrotask();
        });
      else scheduleCallback$3(ImmediatePriority, processRootScheduleInImmediateTask);
    }
    function requestTransitionLane() {
      if (currentEventTransitionLane === 0) {
        var actionScopeLane = currentEntangledLane;
        if (actionScopeLane === 0) {
          actionScopeLane = nextTransitionUpdateLane;
          nextTransitionUpdateLane <<= 1;
          if ((nextTransitionUpdateLane & 261888) === 0) nextTransitionUpdateLane = 256;
        }
        currentEventTransitionLane = actionScopeLane;
      }
      return currentEventTransitionLane;
    }
    function entangleAsyncAction(transition, thenable) {
      if (currentEntangledListeners === null) {
        var listeners = (currentEntangledListeners = []);
        currentEntangledPendingCount = 0;
        currentEntangledLane = requestTransitionLane();
        currentEntangledActionThenable = {
          status: "pending",
          value: undefined,
          then: function (resolve) {
            listeners.push(resolve);
          },
        };
      }
      currentEntangledPendingCount++;
      thenable.then(pingEngtangledActionScope, pingEngtangledActionScope);
      return thenable;
    }
    function pingEngtangledActionScope() {
      if (--currentEntangledPendingCount === 0 && currentEntangledListeners !== null) {
        if (currentEntangledActionThenable !== null) currentEntangledActionThenable.status = "fulfilled";
        var listeners = currentEntangledListeners;
        currentEntangledListeners = null;
        currentEntangledLane = 0;
        currentEntangledActionThenable = null;
        for (var i = 0; i < listeners.length; i++) (0, listeners[i])();
      }
    }
    function chainThenableValue(thenable, result) {
      var listeners = [];
      var thenableWithOverride = {
        status: "pending",
        value: null,
        reason: null,
        then: function (resolve) {
          listeners.push(resolve);
        },
      };
      thenable.then(
        function () {
          thenableWithOverride.status = "fulfilled";
          thenableWithOverride.value = result;
          for (var i = 0; i < listeners.length; i++) (0, listeners[i])(result);
        },
        function (error) {
          thenableWithOverride.status = "rejected";
          thenableWithOverride.reason = error;
          for (error = 0; error < listeners.length; error++) (0, listeners[error])(undefined);
        },
      );
      return thenableWithOverride;
    }
    function peekCacheFromPool() {
      var cacheResumedFromPreviousRender = resumedCache.current;
      return cacheResumedFromPreviousRender !== null
        ? cacheResumedFromPreviousRender
        : workInProgressRoot.pooledCache;
    }
    function pushTransition(offscreenWorkInProgress, prevCachePool) {
      if (prevCachePool === null) push(resumedCache, resumedCache.current);
      else push(resumedCache, prevCachePool.pool);
    }
    function getSuspendedCache() {
      var cacheFromPool = peekCacheFromPool();
      return cacheFromPool === null
        ? null
        : {
            parent: isPrimaryRenderer ? CacheContext._currentValue : CacheContext._currentValue2,
            pool: cacheFromPool,
          };
    }
    function shallowEqual(objA, objB) {
      if (objectIs(objA, objB)) return true;
      if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null)
        return false;
      var keysA = Object.keys(objA);
      var keysB = Object.keys(objB);
      if (keysA.length !== keysB.length) return false;
      for (keysB = 0; keysB < keysA.length; keysB++) {
        var currentKey = keysA[keysB];
        if (!hasOwnProperty.call(objB, currentKey) || !objectIs(objA[currentKey], objB[currentKey]))
          return false;
      }
      return true;
    }
    function isThenableResolved(thenable) {
      thenable = thenable.status;
      return thenable === "fulfilled" || thenable === "rejected";
    }
    function trackUsedThenable(thenableState, thenable, index) {
      switch (
        ((index = thenableState[index]),
        index === undefined
          ? thenableState.push(thenable)
          : index !== thenable && (thenable.then(noop$1, noop$1), (thenable = index)),
        thenable.status)
      ) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          thenableState = thenable.reason;
          checkIfUseWrappedInAsyncCatch(thenableState);
          throw thenableState;
        default:
          if (typeof thenable.status === "string") thenable.then(noop$1, noop$1);
          else {
            thenableState = workInProgressRoot;
            if (thenableState !== null && 100 < thenableState.shellSuspendCounter)
              throw Error(formatProdErrorMessage(482));
            thenableState = thenable;
            thenableState.status = "pending";
            thenableState.then(
              function (fulfilledValue) {
                if (thenable.status === "pending") {
                  var fulfilledThenable = thenable;
                  fulfilledThenable.status = "fulfilled";
                  fulfilledThenable.value = fulfilledValue;
                }
              },
              function (error) {
                if (thenable.status === "pending") {
                  var rejectedThenable = thenable;
                  rejectedThenable.status = "rejected";
                  rejectedThenable.reason = error;
                }
              },
            );
          }
          switch (thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              thenableState = thenable.reason;
              checkIfUseWrappedInAsyncCatch(thenableState);
              throw thenableState;
          }
          suspendedThenable = thenable;
          throw SuspenseException;
      }
    }
    function resolveLazy(lazyType) {
      try {
        var init = lazyType._init;
        return init(lazyType._payload);
      } catch (x) {
        if (x !== null && typeof x === "object" && typeof x.then === "function") {
          suspendedThenable = x;
          throw SuspenseException;
        }
        throw x;
      }
    }
    function getSuspendedThenable() {
      if (suspendedThenable === null) throw Error(formatProdErrorMessage(459));
      var thenable = suspendedThenable;
      suspendedThenable = null;
      return thenable;
    }
    function checkIfUseWrappedInAsyncCatch(rejectedReason) {
      if (rejectedReason === SuspenseException || rejectedReason === SuspenseActionException)
        throw Error(formatProdErrorMessage(483));
    }
    function unwrapThenable(thenable) {
      var index = thenableIndexCounter$1;
      thenableIndexCounter$1 += 1;
      if (thenableState$1 === null) thenableState$1 = [];
      return trackUsedThenable(thenableState$1, thenable, index);
    }
    function coerceRef(workInProgress, element) {
      element = element.props.ref;
      workInProgress.ref = element !== undefined ? element : null;
    }
    function throwOnInvalidObjectTypeImpl(returnFiber, newChild) {
      if (newChild.$$typeof === REACT_LEGACY_ELEMENT_TYPE) throw Error(formatProdErrorMessage(525));
      returnFiber = Object.prototype.toString.call(newChild);
      throw Error(
        formatProdErrorMessage(
          31,
          returnFiber === "[object Object]"
            ? "object with keys {" + Object.keys(newChild).join(", ") + "}"
            : returnFiber,
        ),
      );
    }
    function createChildReconciler(shouldTrackSideEffects) {
      function deleteChild(returnFiber, childToDelete) {
        if (shouldTrackSideEffects) {
          var deletions = returnFiber.deletions;
          if (deletions === null) {
            returnFiber.deletions = [childToDelete];
            returnFiber.flags |= 16;
          } else deletions.push(childToDelete);
        }
      }
      function deleteRemainingChildren(returnFiber, currentFirstChild) {
        if (!shouldTrackSideEffects) return null;
        for (; currentFirstChild !== null;) {
          deleteChild(returnFiber, currentFirstChild);
          currentFirstChild = currentFirstChild.sibling;
        }
        return null;
      }
      function mapRemainingChildren(currentFirstChild) {
        for (var existingChildren = new Map(); currentFirstChild !== null;) {
          if (currentFirstChild.key !== null) existingChildren.set(currentFirstChild.key, currentFirstChild);
          else existingChildren.set(currentFirstChild.index, currentFirstChild);
          currentFirstChild = currentFirstChild.sibling;
        }
        return existingChildren;
      }
      function useFiber(fiber, pendingProps) {
        fiber = createWorkInProgress(fiber, pendingProps);
        fiber.index = 0;
        fiber.sibling = null;
        return fiber;
      }
      function placeChild(newFiber, lastPlacedIndex, newIndex) {
        newFiber.index = newIndex;
        if (!shouldTrackSideEffects) {
          newFiber.flags |= 1048576;
          return lastPlacedIndex;
        }
        newIndex = newFiber.alternate;
        if (newIndex !== null) {
          newIndex = newIndex.index;
          return newIndex < lastPlacedIndex ? ((newFiber.flags |= 67108866), lastPlacedIndex) : newIndex;
        }
        newFiber.flags |= 67108866;
        return lastPlacedIndex;
      }
      function placeSingleChild(newFiber) {
        if (shouldTrackSideEffects && newFiber.alternate === null) newFiber.flags |= 67108866;
        return newFiber;
      }
      function updateTextNode(returnFiber, current, textContent, lanes) {
        if (current === null || current.tag !== 6) {
          current = createFiberFromText(textContent, returnFiber.mode, lanes);
          current.return = returnFiber;
          return current;
        }
        current = useFiber(current, textContent);
        current.return = returnFiber;
        return current;
      }
      function updateElement(returnFiber, current, element, lanes) {
        var elementType = element.type;
        if (elementType === REACT_FRAGMENT_TYPE)
          return updateFragment(returnFiber, current, element.props.children, lanes, element.key);
        if (
          current !== null &&
          (current.elementType === elementType ||
            (typeof elementType === "object" &&
              elementType !== null &&
              elementType.$$typeof === REACT_LAZY_TYPE &&
              resolveLazy(elementType) === current.type))
        ) {
          current = useFiber(current, element.props);
          coerceRef(current, element);
          current.return = returnFiber;
          return current;
        }
        current = createFiberFromTypeAndProps(
          element.type,
          element.key,
          element.props,
          null,
          returnFiber.mode,
          lanes,
        );
        coerceRef(current, element);
        current.return = returnFiber;
        return current;
      }
      function updatePortal(returnFiber, current, portal, lanes) {
        if (
          current === null ||
          current.tag !== 4 ||
          current.stateNode.containerInfo !== portal.containerInfo ||
          current.stateNode.implementation !== portal.implementation
        ) {
          current = createFiberFromPortal(portal, returnFiber.mode, lanes);
          current.return = returnFiber;
          return current;
        }
        current = useFiber(current, portal.children || []);
        current.return = returnFiber;
        return current;
      }
      function updateFragment(returnFiber, current, fragment, lanes, key) {
        if (current === null || current.tag !== 7) {
          current = createFiberFromFragment(fragment, returnFiber.mode, lanes, key);
          current.return = returnFiber;
          return current;
        }
        current = useFiber(current, fragment);
        current.return = returnFiber;
        return current;
      }
      function createChild(returnFiber, newChild, lanes) {
        if (
          (typeof newChild === "string" && newChild !== "") ||
          typeof newChild === "number" ||
          typeof newChild === "bigint"
        ) {
          newChild = createFiberFromText("" + newChild, returnFiber.mode, lanes);
          newChild.return = returnFiber;
          return newChild;
        }
        if (typeof newChild === "object" && newChild !== null) {
          switch (newChild.$$typeof) {
            case REACT_ELEMENT_TYPE:
              lanes = createFiberFromTypeAndProps(
                newChild.type,
                newChild.key,
                newChild.props,
                null,
                returnFiber.mode,
                lanes,
              );
              coerceRef(lanes, newChild);
              lanes.return = returnFiber;
              return lanes;
            case REACT_PORTAL_TYPE:
              newChild = createFiberFromPortal(newChild, returnFiber.mode, lanes);
              newChild.return = returnFiber;
              return newChild;
            case REACT_LAZY_TYPE:
              newChild = resolveLazy(newChild);
              return createChild(returnFiber, newChild, lanes);
          }
          if (isArrayImpl(newChild) || getIteratorFn(newChild)) {
            newChild = createFiberFromFragment(newChild, returnFiber.mode, lanes, null);
            newChild.return = returnFiber;
            return newChild;
          }
          if (typeof newChild.then === "function")
            return createChild(returnFiber, unwrapThenable(newChild), lanes);
          if (newChild.$$typeof === REACT_CONTEXT_TYPE)
            return createChild(returnFiber, readContextDuringReconciliation(returnFiber, newChild), lanes);
          throwOnInvalidObjectTypeImpl(returnFiber, newChild);
        }
        return null;
      }
      function updateSlot(returnFiber, oldFiber, newChild, lanes) {
        var key = oldFiber !== null ? oldFiber.key : null;
        if (
          (typeof newChild === "string" && newChild !== "") ||
          typeof newChild === "number" ||
          typeof newChild === "bigint"
        )
          return key !== null ? null : updateTextNode(returnFiber, oldFiber, "" + newChild, lanes);
        if (typeof newChild === "object" && newChild !== null) {
          switch (newChild.$$typeof) {
            case REACT_ELEMENT_TYPE:
              return newChild.key === key ? updateElement(returnFiber, oldFiber, newChild, lanes) : null;
            case REACT_PORTAL_TYPE:
              return newChild.key === key ? updatePortal(returnFiber, oldFiber, newChild, lanes) : null;
            case REACT_LAZY_TYPE:
              newChild = resolveLazy(newChild);
              return updateSlot(returnFiber, oldFiber, newChild, lanes);
          }
          if (isArrayImpl(newChild) || getIteratorFn(newChild))
            return key !== null ? null : updateFragment(returnFiber, oldFiber, newChild, lanes, null);
          if (typeof newChild.then === "function")
            return updateSlot(returnFiber, oldFiber, unwrapThenable(newChild), lanes);
          if (newChild.$$typeof === REACT_CONTEXT_TYPE)
            return updateSlot(
              returnFiber,
              oldFiber,
              readContextDuringReconciliation(returnFiber, newChild),
              lanes,
            );
          throwOnInvalidObjectTypeImpl(returnFiber, newChild);
        }
        return null;
      }
      function updateFromMap(existingChildren, returnFiber, newIdx, newChild, lanes) {
        if (
          (typeof newChild === "string" && newChild !== "") ||
          typeof newChild === "number" ||
          typeof newChild === "bigint"
        ) {
          existingChildren = existingChildren.get(newIdx) || null;
          return updateTextNode(returnFiber, existingChildren, "" + newChild, lanes);
        }
        if (typeof newChild === "object" && newChild !== null) {
          switch (newChild.$$typeof) {
            case REACT_ELEMENT_TYPE:
              existingChildren = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null;
              return updateElement(returnFiber, existingChildren, newChild, lanes);
            case REACT_PORTAL_TYPE:
              existingChildren = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null;
              return updatePortal(returnFiber, existingChildren, newChild, lanes);
            case REACT_LAZY_TYPE:
              newChild = resolveLazy(newChild);
              return updateFromMap(existingChildren, returnFiber, newIdx, newChild, lanes);
          }
          if (isArrayImpl(newChild) || getIteratorFn(newChild)) {
            existingChildren = existingChildren.get(newIdx) || null;
            return updateFragment(returnFiber, existingChildren, newChild, lanes, null);
          }
          if (typeof newChild.then === "function")
            return updateFromMap(existingChildren, returnFiber, newIdx, unwrapThenable(newChild), lanes);
          if (newChild.$$typeof === REACT_CONTEXT_TYPE)
            return updateFromMap(
              existingChildren,
              returnFiber,
              newIdx,
              readContextDuringReconciliation(returnFiber, newChild),
              lanes,
            );
          throwOnInvalidObjectTypeImpl(returnFiber, newChild);
        }
        return null;
      }
      function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren, lanes) {
        for (
          var resultingFirstChild = null,
            previousNewFiber = null,
            oldFiber = currentFirstChild,
            newIdx = (currentFirstChild = 0),
            nextOldFiber = null;
          oldFiber !== null && newIdx < newChildren.length;
          newIdx++
        ) {
          if (oldFiber.index > newIdx) {
            nextOldFiber = oldFiber;
            oldFiber = null;
          } else nextOldFiber = oldFiber.sibling;
          var newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx], lanes);
          if (newFiber === null) {
            if (oldFiber === null) oldFiber = nextOldFiber;
            break;
          }
          if (shouldTrackSideEffects && oldFiber && newFiber.alternate === null)
            deleteChild(returnFiber, oldFiber);
          currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
          if (previousNewFiber === null) resultingFirstChild = newFiber;
          else previousNewFiber.sibling = newFiber;
          previousNewFiber = newFiber;
          oldFiber = nextOldFiber;
        }
        if (newIdx === newChildren.length) {
          deleteRemainingChildren(returnFiber, oldFiber);
          if (isHydrating) pushTreeFork(returnFiber, newIdx);
          return resultingFirstChild;
        }
        if (oldFiber === null) {
          for (; newIdx < newChildren.length; newIdx++) {
            oldFiber = createChild(returnFiber, newChildren[newIdx], lanes);
            if (oldFiber !== null) {
              currentFirstChild = placeChild(oldFiber, currentFirstChild, newIdx);
              if (previousNewFiber === null) resultingFirstChild = oldFiber;
              else previousNewFiber.sibling = oldFiber;
              previousNewFiber = oldFiber;
            }
          }
          if (isHydrating) pushTreeFork(returnFiber, newIdx);
          return resultingFirstChild;
        }
        for (oldFiber = mapRemainingChildren(oldFiber); newIdx < newChildren.length; newIdx++) {
          nextOldFiber = updateFromMap(oldFiber, returnFiber, newIdx, newChildren[newIdx], lanes);
          if (nextOldFiber !== null) {
            if (shouldTrackSideEffects && nextOldFiber.alternate !== null)
              oldFiber.delete(nextOldFiber.key === null ? newIdx : nextOldFiber.key);
            currentFirstChild = placeChild(nextOldFiber, currentFirstChild, newIdx);
            if (previousNewFiber === null) resultingFirstChild = nextOldFiber;
            else previousNewFiber.sibling = nextOldFiber;
            previousNewFiber = nextOldFiber;
          }
        }
        if (shouldTrackSideEffects)
          oldFiber.forEach(function (child) {
            return deleteChild(returnFiber, child);
          });
        if (isHydrating) pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      function reconcileChildrenIterator(returnFiber, currentFirstChild, newChildren, lanes) {
        if (newChildren == null) throw Error(formatProdErrorMessage(151));
        for (
          var resultingFirstChild = null,
            previousNewFiber = null,
            oldFiber = currentFirstChild,
            newIdx = (currentFirstChild = 0),
            nextOldFiber = null,
            step = newChildren.next();
          oldFiber !== null && !step.done;
          newIdx++, step = newChildren.next()
        ) {
          if (oldFiber.index > newIdx) {
            nextOldFiber = oldFiber;
            oldFiber = null;
          } else nextOldFiber = oldFiber.sibling;
          var newFiber = updateSlot(returnFiber, oldFiber, step.value, lanes);
          if (newFiber === null) {
            if (oldFiber === null) oldFiber = nextOldFiber;
            break;
          }
          if (shouldTrackSideEffects && oldFiber && newFiber.alternate === null)
            deleteChild(returnFiber, oldFiber);
          currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
          if (previousNewFiber === null) resultingFirstChild = newFiber;
          else previousNewFiber.sibling = newFiber;
          previousNewFiber = newFiber;
          oldFiber = nextOldFiber;
        }
        if (step.done) {
          deleteRemainingChildren(returnFiber, oldFiber);
          if (isHydrating) pushTreeFork(returnFiber, newIdx);
          return resultingFirstChild;
        }
        if (oldFiber === null) {
          for (; !step.done; newIdx++, step = newChildren.next()) {
            step = createChild(returnFiber, step.value, lanes);
            if (step !== null) {
              currentFirstChild = placeChild(step, currentFirstChild, newIdx);
              if (previousNewFiber === null) resultingFirstChild = step;
              else previousNewFiber.sibling = step;
              previousNewFiber = step;
            }
          }
          if (isHydrating) pushTreeFork(returnFiber, newIdx);
          return resultingFirstChild;
        }
        for (oldFiber = mapRemainingChildren(oldFiber); !step.done; newIdx++, step = newChildren.next()) {
          step = updateFromMap(oldFiber, returnFiber, newIdx, step.value, lanes);
          if (step !== null) {
            if (shouldTrackSideEffects && step.alternate !== null)
              oldFiber.delete(step.key === null ? newIdx : step.key);
            currentFirstChild = placeChild(step, currentFirstChild, newIdx);
            if (previousNewFiber === null) resultingFirstChild = step;
            else previousNewFiber.sibling = step;
            previousNewFiber = step;
          }
        }
        if (shouldTrackSideEffects)
          oldFiber.forEach(function (child) {
            return deleteChild(returnFiber, child);
          });
        if (isHydrating) pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      function reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes) {
        if (
          typeof newChild === "object" &&
          newChild !== null &&
          newChild.type === REACT_FRAGMENT_TYPE &&
          newChild.key === null
        )
          newChild = newChild.props.children;
        if (typeof newChild === "object" && newChild !== null) {
          switch (newChild.$$typeof) {
            case REACT_ELEMENT_TYPE:
              e: {
                for (var key = newChild.key; currentFirstChild !== null;) {
                  if (currentFirstChild.key === key) {
                    key = newChild.type;
                    if (key === REACT_FRAGMENT_TYPE) {
                      if (currentFirstChild.tag === 7) {
                        deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
                        lanes = useFiber(currentFirstChild, newChild.props.children);
                        lanes.return = returnFiber;
                        returnFiber = lanes;
                        break e;
                      }
                    } else if (
                      currentFirstChild.elementType === key ||
                      (typeof key === "object" &&
                        key !== null &&
                        key.$$typeof === REACT_LAZY_TYPE &&
                        resolveLazy(key) === currentFirstChild.type)
                    ) {
                      deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
                      lanes = useFiber(currentFirstChild, newChild.props);
                      coerceRef(lanes, newChild);
                      lanes.return = returnFiber;
                      returnFiber = lanes;
                      break e;
                    }
                    deleteRemainingChildren(returnFiber, currentFirstChild);
                    break;
                  } else deleteChild(returnFiber, currentFirstChild);
                  currentFirstChild = currentFirstChild.sibling;
                }
                if (newChild.type === REACT_FRAGMENT_TYPE) {
                  lanes = createFiberFromFragment(
                    newChild.props.children,
                    returnFiber.mode,
                    lanes,
                    newChild.key,
                  );
                  lanes.return = returnFiber;
                  returnFiber = lanes;
                } else {
                  lanes = createFiberFromTypeAndProps(
                    newChild.type,
                    newChild.key,
                    newChild.props,
                    null,
                    returnFiber.mode,
                    lanes,
                  );
                  coerceRef(lanes, newChild);
                  lanes.return = returnFiber;
                  returnFiber = lanes;
                }
              }
              return placeSingleChild(returnFiber);
            case REACT_PORTAL_TYPE:
              e: {
                for (key = newChild.key; currentFirstChild !== null;) {
                  if (currentFirstChild.key === key) {
                    if (
                      currentFirstChild.tag === 4 &&
                      currentFirstChild.stateNode.containerInfo === newChild.containerInfo &&
                      currentFirstChild.stateNode.implementation === newChild.implementation
                    ) {
                      deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
                      lanes = useFiber(currentFirstChild, newChild.children || []);
                      lanes.return = returnFiber;
                      returnFiber = lanes;
                      break e;
                    } else {
                      deleteRemainingChildren(returnFiber, currentFirstChild);
                      break;
                    }
                  } else deleteChild(returnFiber, currentFirstChild);
                  currentFirstChild = currentFirstChild.sibling;
                }
                lanes = createFiberFromPortal(newChild, returnFiber.mode, lanes);
                lanes.return = returnFiber;
                returnFiber = lanes;
              }
              return placeSingleChild(returnFiber);
            case REACT_LAZY_TYPE:
              newChild = resolveLazy(newChild);
              return reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes);
          }
          if (isArrayImpl(newChild))
            return reconcileChildrenArray(returnFiber, currentFirstChild, newChild, lanes);
          if (getIteratorFn(newChild)) {
            key = getIteratorFn(newChild);
            if (typeof key !== "function") throw Error(formatProdErrorMessage(150));
            newChild = key.call(newChild);
            return reconcileChildrenIterator(returnFiber, currentFirstChild, newChild, lanes);
          }
          if (typeof newChild.then === "function")
            return reconcileChildFibersImpl(returnFiber, currentFirstChild, unwrapThenable(newChild), lanes);
          if (newChild.$$typeof === REACT_CONTEXT_TYPE)
            return reconcileChildFibersImpl(
              returnFiber,
              currentFirstChild,
              readContextDuringReconciliation(returnFiber, newChild),
              lanes,
            );
          throwOnInvalidObjectTypeImpl(returnFiber, newChild);
        }
        return (typeof newChild === "string" && newChild !== "") ||
          typeof newChild === "number" ||
          typeof newChild === "bigint"
          ? ((newChild = "" + newChild),
            currentFirstChild !== null && currentFirstChild.tag === 6
              ? (deleteRemainingChildren(returnFiber, currentFirstChild.sibling),
                (lanes = useFiber(currentFirstChild, newChild)),
                (lanes.return = returnFiber),
                (returnFiber = lanes))
              : (deleteRemainingChildren(returnFiber, currentFirstChild),
                (lanes = createFiberFromText(newChild, returnFiber.mode, lanes)),
                (lanes.return = returnFiber),
                (returnFiber = lanes)),
            placeSingleChild(returnFiber))
          : deleteRemainingChildren(returnFiber, currentFirstChild);
      }
      return function (returnFiber, currentFirstChild, newChild, lanes) {
        try {
          thenableIndexCounter$1 = 0;
          var firstChildFiber = reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes);
          thenableState$1 = null;
          return firstChildFiber;
        } catch (x) {
          if (x === SuspenseException || x === SuspenseActionException) throw x;
          var fiber = createFiber(29, x, null, returnFiber.mode);
          fiber.lanes = lanes;
          fiber.return = returnFiber;
          return fiber;
        } finally {
        }
      };
    }
    function finishQueueingConcurrentUpdates() {
      for (
        var endIndex = concurrentQueuesIndex, i = (concurrentlyUpdatedLanes = concurrentQueuesIndex = 0);
        i < endIndex;
      ) {
        var fiber = concurrentQueues[i];
        concurrentQueues[i++] = null;
        var queue = concurrentQueues[i];
        concurrentQueues[i++] = null;
        var update = concurrentQueues[i];
        concurrentQueues[i++] = null;
        var lane = concurrentQueues[i];
        concurrentQueues[i++] = null;
        if (queue !== null && update !== null) {
          var pending = queue.pending;
          if (pending === null) update.next = update;
          else {
            update.next = pending.next;
            pending.next = update;
          }
          queue.pending = update;
        }
        if (lane !== 0) markUpdateLaneFromFiberToRoot(fiber, update, lane);
      }
    }
    function enqueueUpdate$1(fiber, queue, update, lane) {
      concurrentQueues[concurrentQueuesIndex++] = fiber;
      concurrentQueues[concurrentQueuesIndex++] = queue;
      concurrentQueues[concurrentQueuesIndex++] = update;
      concurrentQueues[concurrentQueuesIndex++] = lane;
      concurrentlyUpdatedLanes |= lane;
      fiber.lanes |= lane;
      fiber = fiber.alternate;
      if (fiber !== null) fiber.lanes |= lane;
    }
    function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
      enqueueUpdate$1(fiber, queue, update, lane);
      return getRootForUpdatedFiber(fiber);
    }
    function enqueueConcurrentRenderForLane(fiber, lane) {
      enqueueUpdate$1(fiber, null, null, lane);
      return getRootForUpdatedFiber(fiber);
    }
    function markUpdateLaneFromFiberToRoot(sourceFiber, update, lane) {
      sourceFiber.lanes |= lane;
      var alternate = sourceFiber.alternate;
      if (alternate !== null) alternate.lanes |= lane;
      for (var isHidden = false, parent = sourceFiber.return; parent !== null;) {
        parent.childLanes |= lane;
        alternate = parent.alternate;
        if (alternate !== null) alternate.childLanes |= lane;
        if (parent.tag === 22) {
          sourceFiber = parent.stateNode;
          if (!(sourceFiber === null || sourceFiber._visibility & 1)) isHidden = true;
        }
        sourceFiber = parent;
        parent = parent.return;
      }
      return sourceFiber.tag === 3
        ? ((parent = sourceFiber.stateNode),
          isHidden &&
            update !== null &&
            ((isHidden = 31 - clz32(lane)),
            (sourceFiber = parent.hiddenUpdates),
            (alternate = sourceFiber[isHidden]),
            alternate === null ? (sourceFiber[isHidden] = [update]) : alternate.push(update),
            (update.lane = lane | 536870912)),
          parent)
        : null;
    }
    function getRootForUpdatedFiber(sourceFiber) {
      if (50 < nestedUpdateCount) {
        nestedUpdateCount = 0;
        rootWithNestedUpdates = null;
        throw Error(formatProdErrorMessage(185));
      }
      for (var parent = sourceFiber.return; parent !== null;) {
        sourceFiber = parent;
        parent = sourceFiber.return;
      }
      return sourceFiber.tag === 3 ? sourceFiber.stateNode : null;
    }
    function initializeUpdateQueue(fiber) {
      fiber.updateQueue = {
        baseState: fiber.memoizedState,
        firstBaseUpdate: null,
        lastBaseUpdate: null,
        shared: {
          pending: null,
          lanes: 0,
          hiddenCallbacks: null,
        },
        callbacks: null,
      };
    }
    function cloneUpdateQueue(current, workInProgress) {
      current = current.updateQueue;
      if (workInProgress.updateQueue === current)
        workInProgress.updateQueue = {
          baseState: current.baseState,
          firstBaseUpdate: current.firstBaseUpdate,
          lastBaseUpdate: current.lastBaseUpdate,
          shared: current.shared,
          callbacks: null,
        };
    }
    function createUpdate(lane) {
      return {
        lane,
        tag: 0,
        payload: null,
        callback: null,
        next: null,
      };
    }
    function enqueueUpdate(fiber, update, lane) {
      var updateQueue = fiber.updateQueue;
      if (updateQueue === null) return null;
      updateQueue = updateQueue.shared;
      if ((executionContext & 2) !== 0) {
        var pending = updateQueue.pending;
        if (pending === null) update.next = update;
        else {
          update.next = pending.next;
          pending.next = update;
        }
        updateQueue.pending = update;
        update = getRootForUpdatedFiber(fiber);
        markUpdateLaneFromFiberToRoot(fiber, null, lane);
        return update;
      }
      enqueueUpdate$1(fiber, updateQueue, update, lane);
      return getRootForUpdatedFiber(fiber);
    }
    function entangleTransitions(root, fiber, lane) {
      fiber = fiber.updateQueue;
      if (fiber !== null && ((fiber = fiber.shared), (lane & 4194048) !== 0)) {
        var queueLanes = fiber.lanes;
        queueLanes &= root.pendingLanes;
        lane |= queueLanes;
        fiber.lanes = lane;
        markRootEntangled(root, lane);
      }
    }
    function enqueueCapturedUpdate(workInProgress, capturedUpdate) {
      var queue = workInProgress.updateQueue;
      var current = workInProgress.alternate;
      if (current !== null && ((current = current.updateQueue), queue === current)) {
        var newFirst = null;
        var newLast = null;
        queue = queue.firstBaseUpdate;
        if (queue !== null) {
          do {
            var clone = {
              lane: queue.lane,
              tag: queue.tag,
              payload: queue.payload,
              callback: null,
              next: null,
            };
            if (newLast === null) newFirst = newLast = clone;
            else newLast = newLast.next = clone;
            queue = queue.next;
          } while (queue !== null);
          if (newLast === null) newFirst = newLast = capturedUpdate;
          else newLast = newLast.next = capturedUpdate;
        } else newFirst = newLast = capturedUpdate;
        queue = {
          baseState: current.baseState,
          firstBaseUpdate: newFirst,
          lastBaseUpdate: newLast,
          shared: current.shared,
          callbacks: current.callbacks,
        };
        workInProgress.updateQueue = queue;
        return;
      }
      workInProgress = queue.lastBaseUpdate;
      if (workInProgress === null) queue.firstBaseUpdate = capturedUpdate;
      else workInProgress.next = capturedUpdate;
      queue.lastBaseUpdate = capturedUpdate;
    }
    function suspendIfUpdateReadFromEntangledAsyncAction() {
      if (didReadFromEntangledAsyncAction) {
        var entangledActionThenable = currentEntangledActionThenable;
        if (entangledActionThenable !== null) throw entangledActionThenable;
      }
    }
    function processUpdateQueue(workInProgress$jscomp$0, props, instance$jscomp$0, renderLanes) {
      didReadFromEntangledAsyncAction = false;
      var queue = workInProgress$jscomp$0.updateQueue;
      hasForceUpdate = false;
      var { firstBaseUpdate, lastBaseUpdate } = queue;
      var pendingQueue = queue.shared.pending;
      if (pendingQueue !== null) {
        queue.shared.pending = null;
        var lastPendingUpdate = pendingQueue;
        var firstPendingUpdate = lastPendingUpdate.next;
        lastPendingUpdate.next = null;
        if (lastBaseUpdate === null) firstBaseUpdate = firstPendingUpdate;
        else lastBaseUpdate.next = firstPendingUpdate;
        lastBaseUpdate = lastPendingUpdate;
        var current = workInProgress$jscomp$0.alternate;
        if (current !== null) {
          current = current.updateQueue;
          pendingQueue = current.lastBaseUpdate;
          if (pendingQueue !== lastBaseUpdate) {
            if (pendingQueue === null) current.firstBaseUpdate = firstPendingUpdate;
            else pendingQueue.next = firstPendingUpdate;
            current.lastBaseUpdate = lastPendingUpdate;
          }
        }
      }
      if (firstBaseUpdate !== null) {
        var newState = queue.baseState;
        lastBaseUpdate = 0;
        current = firstPendingUpdate = lastPendingUpdate = null;
        pendingQueue = firstBaseUpdate;
        do {
          var updateLane = pendingQueue.lane & -536870913;
          var isHiddenUpdate = updateLane !== pendingQueue.lane;
          if (
            isHiddenUpdate
              ? (workInProgressRootRenderLanes & updateLane) === updateLane
              : (renderLanes & updateLane) === updateLane
          ) {
            if (updateLane !== 0 && updateLane === currentEntangledLane)
              didReadFromEntangledAsyncAction = true;
            if (current !== null)
              current = current.next = {
                lane: 0,
                tag: pendingQueue.tag,
                payload: pendingQueue.payload,
                callback: null,
                next: null,
              };
            e: {
              var workInProgress = workInProgress$jscomp$0;
              var update = pendingQueue;
              updateLane = props;
              var instance = instance$jscomp$0;
              switch (update.tag) {
                case 1:
                  workInProgress = update.payload;
                  if (typeof workInProgress === "function") {
                    newState = workInProgress.call(instance, newState, updateLane);
                    break e;
                  }
                  newState = workInProgress;
                  break e;
                case 3:
                  workInProgress.flags = (workInProgress.flags & -65537) | 128;
                case 0:
                  workInProgress = update.payload;
                  updateLane =
                    typeof workInProgress === "function"
                      ? workInProgress.call(instance, newState, updateLane)
                      : workInProgress;
                  if (updateLane === null || updateLane === undefined) break e;
                  newState = assign({}, newState, updateLane);
                  break e;
                case 2:
                  hasForceUpdate = true;
              }
            }
            updateLane = pendingQueue.callback;
            if (updateLane !== null) {
              workInProgress$jscomp$0.flags |= 64;
              if (isHiddenUpdate) workInProgress$jscomp$0.flags |= 8192;
              isHiddenUpdate = queue.callbacks;
              if (isHiddenUpdate === null) queue.callbacks = [updateLane];
              else isHiddenUpdate.push(updateLane);
            }
          } else {
            isHiddenUpdate = {
              lane: updateLane,
              tag: pendingQueue.tag,
              payload: pendingQueue.payload,
              callback: pendingQueue.callback,
              next: null,
            };
            if (current === null) {
              firstPendingUpdate = current = isHiddenUpdate;
              lastPendingUpdate = newState;
            } else current = current.next = isHiddenUpdate;
            lastBaseUpdate |= updateLane;
          }
          pendingQueue = pendingQueue.next;
          if (pendingQueue === null) {
            pendingQueue = queue.shared.pending;
            if (pendingQueue === null) break;
            else {
              isHiddenUpdate = pendingQueue;
              pendingQueue = isHiddenUpdate.next;
              isHiddenUpdate.next = null;
              queue.lastBaseUpdate = isHiddenUpdate;
              queue.shared.pending = null;
            }
          }
        } while (1);
        if (current === null) lastPendingUpdate = newState;
        queue.baseState = lastPendingUpdate;
        queue.firstBaseUpdate = firstPendingUpdate;
        queue.lastBaseUpdate = current;
        if (firstBaseUpdate === null) queue.shared.lanes = 0;
        workInProgressRootSkippedLanes |= lastBaseUpdate;
        workInProgress$jscomp$0.lanes = lastBaseUpdate;
        workInProgress$jscomp$0.memoizedState = newState;
      }
    }
    function callCallback(callback, context) {
      if (typeof callback !== "function") throw Error(formatProdErrorMessage(191, callback));
      callback.call(context);
    }
    function commitCallbacks(updateQueue, context) {
      var callbacks = updateQueue.callbacks;
      if (callbacks !== null)
        for (updateQueue.callbacks = null, updateQueue = 0; updateQueue < callbacks.length; updateQueue++)
          callCallback(callbacks[updateQueue], context);
    }
    function pushHiddenContext(fiber, context) {
      fiber = entangledRenderLanes;
      push(prevEntangledRenderLanesCursor, fiber);
      push(currentTreeHiddenStackCursor, context);
      entangledRenderLanes = fiber | context.baseLanes;
    }
    function reuseHiddenContextOnStack() {
      push(prevEntangledRenderLanesCursor, entangledRenderLanes);
      push(currentTreeHiddenStackCursor, currentTreeHiddenStackCursor.current);
    }
    function popHiddenContext() {
      entangledRenderLanes = prevEntangledRenderLanesCursor.current;
      pop(currentTreeHiddenStackCursor);
      pop(prevEntangledRenderLanesCursor);
    }
    function pushPrimaryTreeSuspenseHandler(handler) {
      var current = handler.alternate;
      push(suspenseStackCursor, suspenseStackCursor.current & 1);
      push(suspenseHandlerStackCursor, handler);
      if (shellBoundary === null) {
        if (current === null || currentTreeHiddenStackCursor.current !== null) shellBoundary = handler;
        else if (current.memoizedState !== null) shellBoundary = handler;
      }
    }
    function pushDehydratedActivitySuspenseHandler(fiber) {
      push(suspenseStackCursor, suspenseStackCursor.current);
      push(suspenseHandlerStackCursor, fiber);
      if (shellBoundary === null) shellBoundary = fiber;
    }
    function pushOffscreenSuspenseHandler(fiber) {
      if (fiber.tag === 22) {
        push(suspenseStackCursor, suspenseStackCursor.current);
        push(suspenseHandlerStackCursor, fiber);
        if (shellBoundary === null) shellBoundary = fiber;
      } else reuseSuspenseHandlerOnStack(fiber);
    }
    function reuseSuspenseHandlerOnStack() {
      push(suspenseStackCursor, suspenseStackCursor.current);
      push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
    }
    function popSuspenseHandler(fiber) {
      pop(suspenseHandlerStackCursor);
      if (shellBoundary === fiber) shellBoundary = null;
      pop(suspenseStackCursor);
    }
    function findFirstSuspended(row) {
      for (var node = row; node !== null;) {
        if (node.tag === 13) {
          var state = node.memoizedState;
          if (
            state !== null &&
            ((state = state.dehydrated),
            state === null || isSuspenseInstancePending(state) || isSuspenseInstanceFallback(state))
          )
            return node;
        } else if (
          node.tag === 19 &&
          (node.memoizedProps.revealOrder === "forwards" ||
            node.memoizedProps.revealOrder === "backwards" ||
            node.memoizedProps.revealOrder === "unstable_legacy-backwards" ||
            node.memoizedProps.revealOrder === "together")
        ) {
          if ((node.flags & 128) !== 0) return node;
        } else if (node.child !== null) {
          node.child.return = node;
          node = node.child;
          continue;
        }
        if (node === row) break;
        for (; node.sibling === null;) {
          if (node.return === null || node.return === row) return null;
          node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
      }
      return null;
    }
    function throwInvalidHookError() {
      throw Error(formatProdErrorMessage(321));
    }
    function areHookInputsEqual(nextDeps, prevDeps) {
      if (prevDeps === null) return false;
      for (var i = 0; i < prevDeps.length && i < nextDeps.length; i++)
        if (!objectIs(nextDeps[i], prevDeps[i])) return false;
      return true;
    }
    function renderWithHooks(current, workInProgress, Component, props, secondArg, nextRenderLanes) {
      renderLanes = nextRenderLanes;
      currentlyRenderingFiber = workInProgress;
      workInProgress.memoizedState = null;
      workInProgress.updateQueue = null;
      workInProgress.lanes = 0;
      ReactSharedInternals.H =
        current === null || current.memoizedState === null ? HooksDispatcherOnMount : HooksDispatcherOnUpdate;
      shouldDoubleInvokeUserFnsInHooksDEV = false;
      nextRenderLanes = Component(props, secondArg);
      shouldDoubleInvokeUserFnsInHooksDEV = false;
      if (didScheduleRenderPhaseUpdateDuringThisPass)
        nextRenderLanes = renderWithHooksAgain(workInProgress, Component, props, secondArg);
      finishRenderingHooks(current);
      return nextRenderLanes;
    }
    function finishRenderingHooks(current) {
      ReactSharedInternals.H = ContextOnlyDispatcher;
      var didRenderTooFewHooks = currentHook !== null && currentHook.next !== null;
      renderLanes = 0;
      workInProgressHook = currentHook = currentlyRenderingFiber = null;
      didScheduleRenderPhaseUpdate = false;
      thenableIndexCounter = 0;
      thenableState = null;
      if (didRenderTooFewHooks) throw Error(formatProdErrorMessage(300));
      if (!(current === null || didReceiveUpdate)) {
        current = current.dependencies;
        if (current !== null && checkIfContextChanged(current)) didReceiveUpdate = true;
      }
    }
    function renderWithHooksAgain(workInProgress, Component, props, secondArg) {
      currentlyRenderingFiber = workInProgress;
      var numberOfReRenders = 0;
      do {
        if (didScheduleRenderPhaseUpdateDuringThisPass) thenableState = null;
        thenableIndexCounter = 0;
        didScheduleRenderPhaseUpdateDuringThisPass = false;
        if (25 <= numberOfReRenders) throw Error(formatProdErrorMessage(301));
        numberOfReRenders += 1;
        workInProgressHook = currentHook = null;
        if (workInProgress.updateQueue != null) {
          var children = workInProgress.updateQueue;
          children.lastEffect = null;
          children.events = null;
          children.stores = null;
          if (children.memoCache != null) children.memoCache.index = 0;
        }
        ReactSharedInternals.H = HooksDispatcherOnRerender;
        children = Component(props, secondArg);
      } while (didScheduleRenderPhaseUpdateDuringThisPass);
      return children;
    }
    function TransitionAwareHostComponent() {
      var dispatcher = ReactSharedInternals.H;
      var maybeThenable = dispatcher.useState()[0];
      maybeThenable = typeof maybeThenable.then === "function" ? useThenable(maybeThenable) : maybeThenable;
      dispatcher = dispatcher.useState()[0];
      if ((currentHook !== null ? currentHook.memoizedState : null) !== dispatcher)
        currentlyRenderingFiber.flags |= 1024;
      return maybeThenable;
    }
    function checkDidRenderIdHook() {
      var didRenderIdHook = localIdCounter !== 0;
      localIdCounter = 0;
      return didRenderIdHook;
    }
    function bailoutHooks(current, workInProgress, lanes) {
      workInProgress.updateQueue = current.updateQueue;
      workInProgress.flags &= -2053;
      current.lanes &= ~lanes;
    }
    function resetHooksOnUnwind(workInProgress) {
      if (didScheduleRenderPhaseUpdate) {
        for (workInProgress = workInProgress.memoizedState; workInProgress !== null;) {
          var queue = workInProgress.queue;
          if (queue !== null) queue.pending = null;
          workInProgress = workInProgress.next;
        }
        didScheduleRenderPhaseUpdate = false;
      }
      renderLanes = 0;
      workInProgressHook = currentHook = currentlyRenderingFiber = null;
      didScheduleRenderPhaseUpdateDuringThisPass = false;
      thenableIndexCounter = localIdCounter = 0;
      thenableState = null;
    }
    function mountWorkInProgressHook() {
      var hook = {
        memoizedState: null,
        baseState: null,
        baseQueue: null,
        queue: null,
        next: null,
      };
      if (workInProgressHook === null) currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
      else workInProgressHook = workInProgressHook.next = hook;
      return workInProgressHook;
    }
    function updateWorkInProgressHook() {
      if (currentHook === null) {
        var nextCurrentHook = currentlyRenderingFiber.alternate;
        nextCurrentHook = nextCurrentHook !== null ? nextCurrentHook.memoizedState : null;
      } else nextCurrentHook = currentHook.next;
      var nextWorkInProgressHook =
        workInProgressHook === null ? currentlyRenderingFiber.memoizedState : workInProgressHook.next;
      if (nextWorkInProgressHook !== null) {
        workInProgressHook = nextWorkInProgressHook;
        currentHook = nextCurrentHook;
      } else {
        if (nextCurrentHook === null) {
          if (currentlyRenderingFiber.alternate === null) throw Error(formatProdErrorMessage(467));
          throw Error(formatProdErrorMessage(310));
        }
        currentHook = nextCurrentHook;
        nextCurrentHook = {
          memoizedState: currentHook.memoizedState,
          baseState: currentHook.baseState,
          baseQueue: currentHook.baseQueue,
          queue: currentHook.queue,
          next: null,
        };
        if (workInProgressHook === null)
          currentlyRenderingFiber.memoizedState = workInProgressHook = nextCurrentHook;
        else workInProgressHook = workInProgressHook.next = nextCurrentHook;
      }
      return workInProgressHook;
    }
    function createFunctionComponentUpdateQueue() {
      return {
        lastEffect: null,
        events: null,
        stores: null,
        memoCache: null,
      };
    }
    function useThenable(thenable) {
      var index = thenableIndexCounter;
      thenableIndexCounter += 1;
      if (thenableState === null) thenableState = [];
      thenable = trackUsedThenable(thenableState, thenable, index);
      index = currentlyRenderingFiber;
      if ((workInProgressHook === null ? index.memoizedState : workInProgressHook.next) === null) {
        index = index.alternate;
        ReactSharedInternals.H =
          index === null || index.memoizedState === null ? HooksDispatcherOnMount : HooksDispatcherOnUpdate;
      }
      return thenable;
    }
    function use(usable) {
      if (usable !== null && typeof usable === "object") {
        if (typeof usable.then === "function") return useThenable(usable);
        if (usable.$$typeof === REACT_CONTEXT_TYPE) return readContext(usable);
      }
      throw Error(formatProdErrorMessage(438, String(usable)));
    }
    function useMemoCache(size) {
      var memoCache = null;
      var updateQueue = currentlyRenderingFiber.updateQueue;
      if (updateQueue !== null) memoCache = updateQueue.memoCache;
      if (memoCache == null) {
        var current = currentlyRenderingFiber.alternate;
        if (current !== null) {
          current = current.updateQueue;
          if (current !== null) {
            current = current.memoCache;
            if (current != null)
              memoCache = {
                data: current.data.map(function (array) {
                  return array.slice();
                }),
                index: 0,
              };
          }
        }
      }
      if (memoCache == null)
        memoCache = {
          data: [],
          index: 0,
        };
      if (updateQueue === null) {
        updateQueue = createFunctionComponentUpdateQueue();
        currentlyRenderingFiber.updateQueue = updateQueue;
      }
      updateQueue.memoCache = memoCache;
      updateQueue = memoCache.data[memoCache.index];
      if (updateQueue === undefined)
        for (
          updateQueue = memoCache.data[memoCache.index] = Array(size), current = 0;
          current < size;
          current++
        )
          updateQueue[current] = REACT_MEMO_CACHE_SENTINEL;
      memoCache.index++;
      return updateQueue;
    }
    function basicStateReducer(state, action) {
      return typeof action === "function" ? action(state) : action;
    }
    function updateReducer(reducer) {
      var hook = updateWorkInProgressHook();
      return updateReducerImpl(hook, currentHook, reducer);
    }
    function updateReducerImpl(hook, current, reducer) {
      var queue = hook.queue;
      if (queue === null) throw Error(formatProdErrorMessage(311));
      queue.lastRenderedReducer = reducer;
      var baseQueue = hook.baseQueue;
      var pendingQueue = queue.pending;
      if (pendingQueue !== null) {
        if (baseQueue !== null) {
          var firstBaseUpdate = baseQueue.next;
          baseQueue.next = pendingQueue.next;
          pendingQueue.next = firstBaseUpdate;
        }
        current.baseQueue = baseQueue = pendingQueue;
        queue.pending = null;
      }
      pendingQueue = hook.baseState;
      if (baseQueue === null) hook.memoizedState = pendingQueue;
      else {
        current = baseQueue.next;
        var newFirst = (firstBaseUpdate = null);
        var newLast = null;
        var update = current;
        var didReadFromEntangledAsyncAction$51 = false;
        do {
          var updateLane = update.lane & -536870913;
          if (
            updateLane !== update.lane
              ? (workInProgressRootRenderLanes & updateLane) === updateLane
              : (renderLanes & updateLane) === updateLane
          ) {
            var revertLane = update.revertLane;
            if (revertLane === 0) {
              if (newLast !== null)
                newLast = newLast.next = {
                  lane: 0,
                  revertLane: 0,
                  gesture: null,
                  action: update.action,
                  hasEagerState: update.hasEagerState,
                  eagerState: update.eagerState,
                  next: null,
                };
              if (updateLane === currentEntangledLane) didReadFromEntangledAsyncAction$51 = true;
            } else if ((renderLanes & revertLane) === revertLane) {
              update = update.next;
              if (revertLane === currentEntangledLane) didReadFromEntangledAsyncAction$51 = true;
              continue;
            } else {
              updateLane = {
                lane: 0,
                revertLane: update.revertLane,
                gesture: null,
                action: update.action,
                hasEagerState: update.hasEagerState,
                eagerState: update.eagerState,
                next: null,
              };
              if (newLast === null) {
                newFirst = newLast = updateLane;
                firstBaseUpdate = pendingQueue;
              } else newLast = newLast.next = updateLane;
              currentlyRenderingFiber.lanes |= revertLane;
              workInProgressRootSkippedLanes |= revertLane;
            }
            updateLane = update.action;
            if (shouldDoubleInvokeUserFnsInHooksDEV) reducer(pendingQueue, updateLane);
            pendingQueue = update.hasEagerState ? update.eagerState : reducer(pendingQueue, updateLane);
          } else {
            revertLane = {
              lane: updateLane,
              revertLane: update.revertLane,
              gesture: update.gesture,
              action: update.action,
              hasEagerState: update.hasEagerState,
              eagerState: update.eagerState,
              next: null,
            };
            if (newLast === null) {
              newFirst = newLast = revertLane;
              firstBaseUpdate = pendingQueue;
            } else newLast = newLast.next = revertLane;
            currentlyRenderingFiber.lanes |= updateLane;
            workInProgressRootSkippedLanes |= updateLane;
          }
          update = update.next;
        } while (update !== null && update !== current);
        if (newLast === null) firstBaseUpdate = pendingQueue;
        else newLast.next = newFirst;
        if (
          !objectIs(pendingQueue, hook.memoizedState) &&
          ((didReceiveUpdate = true),
          didReadFromEntangledAsyncAction$51 &&
            ((reducer = currentEntangledActionThenable), reducer !== null))
        )
          throw reducer;
        hook.memoizedState = pendingQueue;
        hook.baseState = firstBaseUpdate;
        hook.baseQueue = newLast;
        queue.lastRenderedState = pendingQueue;
      }
      if (baseQueue === null) queue.lanes = 0;
      return [hook.memoizedState, queue.dispatch];
    }
    function rerenderReducer(reducer) {
      var hook = updateWorkInProgressHook();
      var queue = hook.queue;
      if (queue === null) throw Error(formatProdErrorMessage(311));
      queue.lastRenderedReducer = reducer;
      var { dispatch, pending: lastRenderPhaseUpdate } = queue;
      var newState = hook.memoizedState;
      if (lastRenderPhaseUpdate !== null) {
        queue.pending = null;
        var update = (lastRenderPhaseUpdate = lastRenderPhaseUpdate.next);
        do {
          newState = reducer(newState, update.action);
          update = update.next;
        } while (update !== lastRenderPhaseUpdate);
        if (!objectIs(newState, hook.memoizedState)) didReceiveUpdate = true;
        hook.memoizedState = newState;
        if (hook.baseQueue === null) hook.baseState = newState;
        queue.lastRenderedState = newState;
      }
      return [newState, dispatch];
    }
    function updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
      var fiber = currentlyRenderingFiber;
      var hook = updateWorkInProgressHook();
      var isHydrating$jscomp$0 = isHydrating;
      if (isHydrating$jscomp$0) {
        if (getServerSnapshot === undefined) throw Error(formatProdErrorMessage(407));
        getServerSnapshot = getServerSnapshot();
      } else getServerSnapshot = getSnapshot();
      var snapshotChanged = !objectIs((currentHook || hook).memoizedState, getServerSnapshot);
      if (snapshotChanged) {
        hook.memoizedState = getServerSnapshot;
        didReceiveUpdate = true;
      }
      hook = hook.queue;
      updateEffect(subscribeToStore.bind(null, fiber, hook, subscribe), [subscribe]);
      if (
        hook.getSnapshot !== getSnapshot ||
        snapshotChanged ||
        (workInProgressHook !== null && workInProgressHook.memoizedState.tag & 1)
      ) {
        fiber.flags |= 2048;
        pushSimpleEffect(
          9,
          {
            destroy: undefined,
          },
          updateStoreInstance.bind(null, fiber, hook, getServerSnapshot, getSnapshot),
          null,
        );
        if (workInProgressRoot === null) throw Error(formatProdErrorMessage(349));
        if (!(isHydrating$jscomp$0 || (renderLanes & 127) !== 0))
          pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
      }
      return getServerSnapshot;
    }
    function pushStoreConsistencyCheck(fiber, getSnapshot, renderedSnapshot) {
      fiber.flags |= 16384;
      fiber = {
        getSnapshot,
        value: renderedSnapshot,
      };
      getSnapshot = currentlyRenderingFiber.updateQueue;
      if (getSnapshot === null) {
        getSnapshot = createFunctionComponentUpdateQueue();
        currentlyRenderingFiber.updateQueue = getSnapshot;
        getSnapshot.stores = [fiber];
      } else {
        renderedSnapshot = getSnapshot.stores;
        if (renderedSnapshot === null) getSnapshot.stores = [fiber];
        else renderedSnapshot.push(fiber);
      }
    }
    function updateStoreInstance(fiber, inst, nextSnapshot, getSnapshot) {
      inst.value = nextSnapshot;
      inst.getSnapshot = getSnapshot;
      if (checkIfSnapshotChanged(inst)) forceStoreRerender(fiber);
    }
    function subscribeToStore(fiber, inst, subscribe) {
      return subscribe(function () {
        if (checkIfSnapshotChanged(inst)) forceStoreRerender(fiber);
      });
    }
    function checkIfSnapshotChanged(inst) {
      var latestGetSnapshot = inst.getSnapshot;
      inst = inst.value;
      try {
        var nextValue = latestGetSnapshot();
        return !objectIs(inst, nextValue);
      } catch (error) {
        return true;
      }
    }
    function forceStoreRerender(fiber) {
      var root = enqueueConcurrentRenderForLane(fiber, 2);
      if (root !== null) scheduleUpdateOnFiber(root, fiber, 2);
    }
    function mountStateImpl(initialState) {
      var hook = mountWorkInProgressHook();
      if (typeof initialState === "function") {
        var initialStateInitializer = initialState;
        initialState = initialStateInitializer();
        if (shouldDoubleInvokeUserFnsInHooksDEV) {
          setIsStrictModeForDevtools(true);
          try {
            initialStateInitializer();
          } finally {
            setIsStrictModeForDevtools(false);
          }
        }
      }
      hook.memoizedState = hook.baseState = initialState;
      hook.queue = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: initialState,
      };
      return hook;
    }
    function updateOptimisticImpl(hook, current, passthrough, reducer) {
      hook.baseState = passthrough;
      return updateReducerImpl(
        hook,
        currentHook,
        typeof reducer === "function" ? reducer : basicStateReducer,
      );
    }
    function dispatchActionState(fiber, actionQueue, setPendingState, setState, payload) {
      if (isRenderPhaseUpdate(fiber)) throw Error(formatProdErrorMessage(485));
      fiber = actionQueue.action;
      if (fiber !== null) {
        var actionNode = {
          payload,
          action: fiber,
          next: null,
          isTransition: true,
          status: "pending",
          value: null,
          reason: null,
          listeners: [],
          then: function (listener) {
            actionNode.listeners.push(listener);
          },
        };
        if (ReactSharedInternals.T !== null) setPendingState(true);
        else actionNode.isTransition = false;
        setState(actionNode);
        setPendingState = actionQueue.pending;
        if (setPendingState === null) {
          actionNode.next = actionQueue.pending = actionNode;
          runActionStateAction(actionQueue, actionNode);
        } else {
          actionNode.next = setPendingState.next;
          actionQueue.pending = setPendingState.next = actionNode;
        }
      }
    }
    function runActionStateAction(actionQueue, node) {
      var { action, payload } = node;
      var prevState = actionQueue.state;
      if (node.isTransition) {
        var prevTransition = ReactSharedInternals.T;
        var currentTransition = {};
        ReactSharedInternals.T = currentTransition;
        try {
          var returnValue = action(prevState, payload);
          var onStartTransitionFinish = ReactSharedInternals.S;
          if (onStartTransitionFinish !== null) onStartTransitionFinish(currentTransition, returnValue);
          handleActionReturnValue(actionQueue, node, returnValue);
        } catch (error) {
          onActionError(actionQueue, node, error);
        } finally {
          if (prevTransition !== null && currentTransition.types !== null)
            prevTransition.types = currentTransition.types;
          ReactSharedInternals.T = prevTransition;
        }
      } else
        try {
          prevTransition = action(prevState, payload);
          handleActionReturnValue(actionQueue, node, prevTransition);
        } catch (error$55) {
          onActionError(actionQueue, node, error$55);
        }
    }
    function handleActionReturnValue(actionQueue, node, returnValue) {
      if (returnValue !== null && typeof returnValue === "object" && typeof returnValue.then === "function")
        returnValue.then(
          function (nextState) {
            onActionSuccess(actionQueue, node, nextState);
          },
          function (error) {
            return onActionError(actionQueue, node, error);
          },
        );
      else onActionSuccess(actionQueue, node, returnValue);
    }
    function onActionSuccess(actionQueue, actionNode, nextState) {
      actionNode.status = "fulfilled";
      actionNode.value = nextState;
      notifyActionListeners(actionNode);
      actionQueue.state = nextState;
      actionNode = actionQueue.pending;
      if (actionNode !== null) {
        nextState = actionNode.next;
        if (nextState === actionNode) actionQueue.pending = null;
        else {
          nextState = nextState.next;
          actionNode.next = nextState;
          runActionStateAction(actionQueue, nextState);
        }
      }
    }
    function onActionError(actionQueue, actionNode, error) {
      var last = actionQueue.pending;
      actionQueue.pending = null;
      if (last !== null) {
        last = last.next;
        do {
          actionNode.status = "rejected";
          actionNode.reason = error;
          notifyActionListeners(actionNode);
          actionNode = actionNode.next;
        } while (actionNode !== last);
      }
      actionQueue.action = null;
    }
    function notifyActionListeners(actionNode) {
      actionNode = actionNode.listeners;
      for (var i = 0; i < actionNode.length; i++) (0, actionNode[i])();
    }
    function actionStateReducer(oldState, newState) {
      return newState;
    }
    function mountActionState(action, initialStateProp) {
      if (isHydrating) {
        var ssrFormState = workInProgressRoot.formState;
        if (ssrFormState !== null) {
          e: {
            var JSCompiler_inline_result = currentlyRenderingFiber;
            if (isHydrating) {
              if (nextHydratableInstance) {
                var markerInstance = canHydrateFormStateMarker(
                  nextHydratableInstance,
                  rootOrSingletonContext,
                );
                if (markerInstance) {
                  nextHydratableInstance = getNextHydratableSibling(markerInstance);
                  JSCompiler_inline_result = isFormStateMarkerMatching(markerInstance);
                  break e;
                }
              }
              throwOnHydrationMismatch(JSCompiler_inline_result);
            }
            JSCompiler_inline_result = false;
          }
          if (JSCompiler_inline_result) initialStateProp = ssrFormState[0];
        }
      }
      ssrFormState = mountWorkInProgressHook();
      ssrFormState.memoizedState = ssrFormState.baseState = initialStateProp;
      JSCompiler_inline_result = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: actionStateReducer,
        lastRenderedState: initialStateProp,
      };
      ssrFormState.queue = JSCompiler_inline_result;
      ssrFormState = dispatchSetState.bind(null, currentlyRenderingFiber, JSCompiler_inline_result);
      JSCompiler_inline_result.dispatch = ssrFormState;
      JSCompiler_inline_result = mountStateImpl(false);
      var setPendingState = dispatchOptimisticSetState.bind(
        null,
        currentlyRenderingFiber,
        false,
        JSCompiler_inline_result.queue,
      );
      JSCompiler_inline_result = mountWorkInProgressHook();
      markerInstance = {
        state: initialStateProp,
        dispatch: null,
        action,
        pending: null,
      };
      JSCompiler_inline_result.queue = markerInstance;
      ssrFormState = dispatchActionState.bind(
        null,
        currentlyRenderingFiber,
        markerInstance,
        setPendingState,
        ssrFormState,
      );
      markerInstance.dispatch = ssrFormState;
      JSCompiler_inline_result.memoizedState = action;
      return [initialStateProp, ssrFormState, false];
    }
    function updateActionState(action) {
      var stateHook = updateWorkInProgressHook();
      return updateActionStateImpl(stateHook, currentHook, action);
    }
    function updateActionStateImpl(stateHook, currentStateHook, action) {
      currentStateHook = updateReducerImpl(stateHook, currentStateHook, actionStateReducer)[0];
      stateHook = updateReducer(basicStateReducer)[0];
      if (
        typeof currentStateHook === "object" &&
        currentStateHook !== null &&
        typeof currentStateHook.then === "function"
      )
        try {
          var state = useThenable(currentStateHook);
        } catch (x) {
          if (x === SuspenseException) throw SuspenseActionException;
          throw x;
        }
      else state = currentStateHook;
      currentStateHook = updateWorkInProgressHook();
      var actionQueue = currentStateHook.queue;
      var dispatch = actionQueue.dispatch;
      if (action !== currentStateHook.memoizedState) {
        currentlyRenderingFiber.flags |= 2048;
        pushSimpleEffect(
          9,
          {
            destroy: undefined,
          },
          actionStateActionEffect.bind(null, actionQueue, action),
          null,
        );
      }
      return [state, dispatch, stateHook];
    }
    function actionStateActionEffect(actionQueue, action) {
      actionQueue.action = action;
    }
    function rerenderActionState(action) {
      var stateHook = updateWorkInProgressHook();
      var currentStateHook = currentHook;
      if (currentStateHook !== null) return updateActionStateImpl(stateHook, currentStateHook, action);
      updateWorkInProgressHook();
      stateHook = stateHook.memoizedState;
      currentStateHook = updateWorkInProgressHook();
      var dispatch = currentStateHook.queue.dispatch;
      currentStateHook.memoizedState = action;
      return [stateHook, dispatch, false];
    }
    function pushSimpleEffect(tag, inst, create, deps) {
      tag = {
        tag,
        create,
        deps,
        inst,
        next: null,
      };
      inst = currentlyRenderingFiber.updateQueue;
      if (inst === null) {
        inst = createFunctionComponentUpdateQueue();
        currentlyRenderingFiber.updateQueue = inst;
      }
      create = inst.lastEffect;
      if (create === null) inst.lastEffect = tag.next = tag;
      else {
        deps = create.next;
        create.next = tag;
        tag.next = deps;
        inst.lastEffect = tag;
      }
      return tag;
    }
    function updateRef() {
      return updateWorkInProgressHook().memoizedState;
    }
    function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
      var hook = mountWorkInProgressHook();
      currentlyRenderingFiber.flags |= fiberFlags;
      hook.memoizedState = pushSimpleEffect(
        1 | hookFlags,
        {
          destroy: undefined,
        },
        create,
        deps === undefined ? null : deps,
      );
    }
    function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
      var hook = updateWorkInProgressHook();
      deps = deps === undefined ? null : deps;
      var inst = hook.memoizedState.inst;
      if (currentHook !== null && deps !== null && areHookInputsEqual(deps, currentHook.memoizedState.deps))
        hook.memoizedState = pushSimpleEffect(hookFlags, inst, create, deps);
      else {
        currentlyRenderingFiber.flags |= fiberFlags;
        hook.memoizedState = pushSimpleEffect(1 | hookFlags, inst, create, deps);
      }
    }
    function mountEffect(create, deps) {
      mountEffectImpl(8390656, 8, create, deps);
    }
    function updateEffect(create, deps) {
      updateEffectImpl(2048, 8, create, deps);
    }
    function useEffectEventImpl(payload) {
      currentlyRenderingFiber.flags |= 4;
      var componentUpdateQueue = currentlyRenderingFiber.updateQueue;
      if (componentUpdateQueue === null) {
        componentUpdateQueue = createFunctionComponentUpdateQueue();
        currentlyRenderingFiber.updateQueue = componentUpdateQueue;
        componentUpdateQueue.events = [payload];
      } else {
        var events = componentUpdateQueue.events;
        if (events === null) componentUpdateQueue.events = [payload];
        else events.push(payload);
      }
    }
    function updateEvent(callback) {
      var ref = updateWorkInProgressHook().memoizedState;
      useEffectEventImpl({
        ref,
        nextImpl: callback,
      });
      return function () {
        if ((executionContext & 2) !== 0) throw Error(formatProdErrorMessage(440));
        return ref.impl.apply(undefined, arguments);
      };
    }
    function updateInsertionEffect(create, deps) {
      return updateEffectImpl(4, 2, create, deps);
    }
    function updateLayoutEffect(create, deps) {
      return updateEffectImpl(4, 4, create, deps);
    }
    function imperativeHandleEffect(create, ref) {
      if (typeof ref === "function") {
        create = create();
        var refCleanup = ref(create);
        return function () {
          if (typeof refCleanup === "function") refCleanup();
          else ref(null);
        };
      }
      if (ref !== null && ref !== undefined) {
        create = create();
        ref.current = create;
        return function () {
          ref.current = null;
        };
      }
    }
    function updateImperativeHandle(ref, create, deps) {
      deps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
      updateEffectImpl(4, 4, imperativeHandleEffect.bind(null, create, ref), deps);
    }
    function mountDebugValue() {}
    function updateCallback(callback, deps) {
      var hook = updateWorkInProgressHook();
      deps = deps === undefined ? null : deps;
      var prevState = hook.memoizedState;
      if (deps !== null && areHookInputsEqual(deps, prevState[1])) return prevState[0];
      hook.memoizedState = [callback, deps];
      return callback;
    }
    function updateMemo(nextCreate, deps) {
      var hook = updateWorkInProgressHook();
      deps = deps === undefined ? null : deps;
      var prevState = hook.memoizedState;
      if (deps !== null && areHookInputsEqual(deps, prevState[1])) return prevState[0];
      prevState = nextCreate();
      if (shouldDoubleInvokeUserFnsInHooksDEV) {
        setIsStrictModeForDevtools(true);
        try {
          nextCreate();
        } finally {
          setIsStrictModeForDevtools(false);
        }
      }
      hook.memoizedState = [prevState, deps];
      return prevState;
    }
    function mountDeferredValueImpl(hook, value, initialValue) {
      if (
        initialValue === undefined ||
        ((renderLanes & 1073741824) !== 0 && (workInProgressRootRenderLanes & 261930) === 0)
      )
        return (hook.memoizedState = value);
      hook.memoizedState = initialValue;
      hook = requestDeferredLane();
      currentlyRenderingFiber.lanes |= hook;
      workInProgressRootSkippedLanes |= hook;
      return initialValue;
    }
    function updateDeferredValueImpl(hook, prevValue, value, initialValue) {
      if (objectIs(value, prevValue)) return value;
      if (currentTreeHiddenStackCursor.current !== null) {
        hook = mountDeferredValueImpl(hook, value, initialValue);
        if (!objectIs(hook, prevValue)) didReceiveUpdate = true;
        return hook;
      }
      if (
        (renderLanes & 42) === 0 ||
        ((renderLanes & 1073741824) !== 0 && (workInProgressRootRenderLanes & 261930) === 0)
      ) {
        didReceiveUpdate = true;
        return (hook.memoizedState = value);
      }
      hook = requestDeferredLane();
      currentlyRenderingFiber.lanes |= hook;
      workInProgressRootSkippedLanes |= hook;
      return prevValue;
    }
    function startTransition(fiber, queue, pendingState, finishedState, callback) {
      var previousPriority = getCurrentUpdatePriority();
      setCurrentUpdatePriority(previousPriority !== 0 && 8 > previousPriority ? previousPriority : 8);
      var prevTransition = ReactSharedInternals.T;
      var currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      dispatchOptimisticSetState(fiber, false, queue, pendingState);
      try {
        var returnValue = callback();
        var onStartTransitionFinish = ReactSharedInternals.S;
        if (onStartTransitionFinish !== null) onStartTransitionFinish(currentTransition, returnValue);
        if (
          returnValue !== null &&
          typeof returnValue === "object" &&
          typeof returnValue.then === "function"
        ) {
          var thenableForFinishedState = chainThenableValue(returnValue, finishedState);
          dispatchSetStateInternal(fiber, queue, thenableForFinishedState, requestUpdateLane(fiber));
        } else dispatchSetStateInternal(fiber, queue, finishedState, requestUpdateLane(fiber));
      } catch (error) {
        dispatchSetStateInternal(
          fiber,
          queue,
          {
            then: function () {},
            status: "rejected",
            reason: error,
          },
          requestUpdateLane(),
        );
      } finally {
        setCurrentUpdatePriority(previousPriority);
        if (prevTransition !== null && currentTransition.types !== null)
          prevTransition.types = currentTransition.types;
        ReactSharedInternals.T = prevTransition;
      }
    }
    function ensureFormComponentIsStateful(formFiber) {
      var existingStateHook = formFiber.memoizedState;
      if (existingStateHook !== null) return existingStateHook;
      existingStateHook = {
        memoizedState: NotPendingTransition,
        baseState: NotPendingTransition,
        baseQueue: null,
        queue: {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: basicStateReducer,
          lastRenderedState: NotPendingTransition,
        },
        next: null,
      };
      var initialResetState = {};
      existingStateHook.next = {
        memoizedState: initialResetState,
        baseState: initialResetState,
        baseQueue: null,
        queue: {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: basicStateReducer,
          lastRenderedState: initialResetState,
        },
        next: null,
      };
      formFiber.memoizedState = existingStateHook;
      formFiber = formFiber.alternate;
      if (formFiber !== null) formFiber.memoizedState = existingStateHook;
      return existingStateHook;
    }
    function useHostTransitionStatus() {
      return readContext(HostTransitionContext);
    }
    function updateId() {
      return updateWorkInProgressHook().memoizedState;
    }
    function updateRefresh() {
      return updateWorkInProgressHook().memoizedState;
    }
    function refreshCache(fiber) {
      for (var provider = fiber.return; provider !== null;) {
        switch (provider.tag) {
          case 24:
          case 3:
            var lane = requestUpdateLane();
            fiber = createUpdate(lane);
            var root = enqueueUpdate(provider, fiber, lane);
            if (root !== null) {
              scheduleUpdateOnFiber(root, provider, lane);
              entangleTransitions(root, provider, lane);
            }
            provider = {
              cache: createCache(),
            };
            fiber.payload = provider;
            return;
        }
        provider = provider.return;
      }
    }
    function dispatchReducerAction(fiber, queue, action) {
      var lane = requestUpdateLane();
      action = {
        lane,
        revertLane: 0,
        gesture: null,
        action,
        hasEagerState: false,
        eagerState: null,
        next: null,
      };
      if (isRenderPhaseUpdate(fiber)) enqueueRenderPhaseUpdate(queue, action);
      else {
        action = enqueueConcurrentHookUpdate(fiber, queue, action, lane);
        if (action !== null) {
          scheduleUpdateOnFiber(action, fiber, lane);
          entangleTransitionUpdate(action, queue, lane);
        }
      }
    }
    function dispatchSetState(fiber, queue, action) {
      var lane = requestUpdateLane();
      dispatchSetStateInternal(fiber, queue, action, lane);
    }
    function dispatchSetStateInternal(fiber, queue, action, lane) {
      var update = {
        lane,
        revertLane: 0,
        gesture: null,
        action,
        hasEagerState: false,
        eagerState: null,
        next: null,
      };
      if (isRenderPhaseUpdate(fiber)) enqueueRenderPhaseUpdate(queue, update);
      else {
        var alternate = fiber.alternate;
        if (
          fiber.lanes === 0 &&
          (alternate === null || alternate.lanes === 0) &&
          ((alternate = queue.lastRenderedReducer), alternate !== null)
        )
          try {
            var currentState = queue.lastRenderedState;
            var eagerState = alternate(currentState, action);
            update.hasEagerState = true;
            update.eagerState = eagerState;
            if (objectIs(eagerState, currentState)) {
              enqueueUpdate$1(fiber, queue, update, 0);
              if (workInProgressRoot === null) finishQueueingConcurrentUpdates();
              return false;
            }
          } catch (error) {
          } finally {
          }
        action = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
        if (action !== null) {
          scheduleUpdateOnFiber(action, fiber, lane);
          entangleTransitionUpdate(action, queue, lane);
          return true;
        }
      }
      return false;
    }
    function dispatchOptimisticSetState(fiber, throwIfDuringRender, queue, action) {
      action = {
        lane: 2,
        revertLane: requestTransitionLane(),
        gesture: null,
        action,
        hasEagerState: false,
        eagerState: null,
        next: null,
      };
      if (isRenderPhaseUpdate(fiber)) {
        if (throwIfDuringRender) throw Error(formatProdErrorMessage(479));
      } else {
        throwIfDuringRender = enqueueConcurrentHookUpdate(fiber, queue, action, 2);
        if (throwIfDuringRender !== null) scheduleUpdateOnFiber(throwIfDuringRender, fiber, 2);
      }
    }
    function isRenderPhaseUpdate(fiber) {
      var alternate = fiber.alternate;
      return (
        fiber === currentlyRenderingFiber || (alternate !== null && alternate === currentlyRenderingFiber)
      );
    }
    function enqueueRenderPhaseUpdate(queue, update) {
      didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate = true;
      var pending = queue.pending;
      if (pending === null) update.next = update;
      else {
        update.next = pending.next;
        pending.next = update;
      }
      queue.pending = update;
    }
    function entangleTransitionUpdate(root, queue, lane) {
      if ((lane & 4194048) !== 0) {
        var queueLanes = queue.lanes;
        queueLanes &= root.pendingLanes;
        lane |= queueLanes;
        queue.lanes = lane;
        markRootEntangled(root, lane);
      }
    }
    function applyDerivedStateFromProps(workInProgress, ctor, getDerivedStateFromProps, nextProps) {
      ctor = workInProgress.memoizedState;
      getDerivedStateFromProps = getDerivedStateFromProps(nextProps, ctor);
      getDerivedStateFromProps =
        getDerivedStateFromProps === null || getDerivedStateFromProps === undefined
          ? ctor
          : assign({}, ctor, getDerivedStateFromProps);
      workInProgress.memoizedState = getDerivedStateFromProps;
      if (workInProgress.lanes === 0) workInProgress.updateQueue.baseState = getDerivedStateFromProps;
    }
    function checkShouldComponentUpdate(
      workInProgress,
      ctor,
      oldProps,
      newProps,
      oldState,
      newState,
      nextContext,
    ) {
      workInProgress = workInProgress.stateNode;
      return typeof workInProgress.shouldComponentUpdate === "function"
        ? workInProgress.shouldComponentUpdate(newProps, newState, nextContext)
        : ctor.prototype && ctor.prototype.isPureReactComponent
          ? !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState)
          : true;
    }
    function callComponentWillReceiveProps(workInProgress, instance, newProps, nextContext) {
      workInProgress = instance.state;
      if (typeof instance.componentWillReceiveProps === "function")
        instance.componentWillReceiveProps(newProps, nextContext);
      if (typeof instance.UNSAFE_componentWillReceiveProps === "function")
        instance.UNSAFE_componentWillReceiveProps(newProps, nextContext);
      if (instance.state !== workInProgress)
        classComponentUpdater.enqueueReplaceState(instance, instance.state, null);
    }
    function resolveClassComponentProps(Component, baseProps) {
      var newProps = baseProps;
      if ("ref" in baseProps) {
        newProps = {};
        for (var key in baseProps) if (key !== "ref") newProps[key] = baseProps[key];
      }
      if ((Component = Component.defaultProps)) {
        if (newProps === baseProps) newProps = assign({}, newProps);
        for (var propName$57 in Component)
          if (newProps[propName$57] === undefined) newProps[propName$57] = Component[propName$57];
      }
      return newProps;
    }
    function logUncaughtError(root, errorInfo) {
      try {
        var onUncaughtError = root.onUncaughtError;
        onUncaughtError(errorInfo.value, {
          componentStack: errorInfo.stack,
        });
      } catch (e) {
        setTimeout(function () {
          throw e;
        });
      }
    }
    function logCaughtError(root, boundary, errorInfo) {
      try {
        var onCaughtError = root.onCaughtError;
        onCaughtError(errorInfo.value, {
          componentStack: errorInfo.stack,
          errorBoundary: boundary.tag === 1 ? boundary.stateNode : null,
        });
      } catch (e) {
        setTimeout(function () {
          throw e;
        });
      }
    }
    function createRootErrorUpdate(root, errorInfo, lane) {
      lane = createUpdate(lane);
      lane.tag = 3;
      lane.payload = {
        element: null,
      };
      lane.callback = function () {
        logUncaughtError(root, errorInfo);
      };
      return lane;
    }
    function createClassErrorUpdate(lane) {
      lane = createUpdate(lane);
      lane.tag = 3;
      return lane;
    }
    function initializeClassErrorUpdate(update, root, fiber, errorInfo) {
      var getDerivedStateFromError = fiber.type.getDerivedStateFromError;
      if (typeof getDerivedStateFromError === "function") {
        var error = errorInfo.value;
        update.payload = function () {
          return getDerivedStateFromError(error);
        };
        update.callback = function () {
          logCaughtError(root, fiber, errorInfo);
        };
      }
      var inst = fiber.stateNode;
      if (inst !== null && typeof inst.componentDidCatch === "function")
        update.callback = function () {
          logCaughtError(root, fiber, errorInfo);
          if (typeof getDerivedStateFromError !== "function") {
            if (legacyErrorBoundariesThatAlreadyFailed === null)
              legacyErrorBoundariesThatAlreadyFailed = new Set([this]);
            else legacyErrorBoundariesThatAlreadyFailed.add(this);
          }
          var stack = errorInfo.stack;
          this.componentDidCatch(errorInfo.value, {
            componentStack: stack !== null ? stack : "",
          });
        };
    }
    function throwException(root, returnFiber, sourceFiber, value, rootRenderLanes) {
      sourceFiber.flags |= 32768;
      if (value !== null && typeof value === "object" && typeof value.then === "function") {
        returnFiber = sourceFiber.alternate;
        if (returnFiber !== null)
          propagateParentContextChanges(returnFiber, sourceFiber, rootRenderLanes, true);
        sourceFiber = suspenseHandlerStackCursor.current;
        if (sourceFiber !== null) {
          switch (sourceFiber.tag) {
            case 31:
            case 13:
              if (shellBoundary === null) renderDidSuspendDelayIfPossible();
              else if (sourceFiber.alternate === null && workInProgressRootExitStatus === 0)
                workInProgressRootExitStatus = 3;
              sourceFiber.flags &= -257;
              sourceFiber.flags |= 65536;
              sourceFiber.lanes = rootRenderLanes;
              if (value === noopSuspenseyCommitThenable) sourceFiber.flags |= 16384;
              else {
                returnFiber = sourceFiber.updateQueue;
                if (returnFiber === null) sourceFiber.updateQueue = new Set([value]);
                else returnFiber.add(value);
                attachPingListener(root, value, rootRenderLanes);
              }
              return false;
            case 22:
              sourceFiber.flags |= 65536;
              if (value === noopSuspenseyCommitThenable) sourceFiber.flags |= 16384;
              else {
                returnFiber = sourceFiber.updateQueue;
                if (returnFiber === null) {
                  returnFiber = {
                    transitions: null,
                    markerInstances: null,
                    retryQueue: new Set([value]),
                  };
                  sourceFiber.updateQueue = returnFiber;
                } else {
                  sourceFiber = returnFiber.retryQueue;
                  if (sourceFiber === null) returnFiber.retryQueue = new Set([value]);
                  else sourceFiber.add(value);
                }
                attachPingListener(root, value, rootRenderLanes);
              }
              return false;
          }
          throw Error(formatProdErrorMessage(435, sourceFiber.tag));
        }
        attachPingListener(root, value, rootRenderLanes);
        renderDidSuspendDelayIfPossible();
        return false;
      }
      if (isHydrating) {
        returnFiber = suspenseHandlerStackCursor.current;
        if (returnFiber !== null) {
          if ((returnFiber.flags & 65536) === 0) returnFiber.flags |= 256;
          returnFiber.flags |= 65536;
          returnFiber.lanes = rootRenderLanes;
          if (value !== HydrationMismatchException) {
            root = Error(formatProdErrorMessage(422), {
              cause: value,
            });
            queueHydrationError(createCapturedValueAtFiber(root, sourceFiber));
          }
        } else {
          if (value !== HydrationMismatchException) {
            returnFiber = Error(formatProdErrorMessage(423), {
              cause: value,
            });
            queueHydrationError(createCapturedValueAtFiber(returnFiber, sourceFiber));
          }
          root = root.current.alternate;
          root.flags |= 65536;
          rootRenderLanes &= -rootRenderLanes;
          root.lanes |= rootRenderLanes;
          value = createCapturedValueAtFiber(value, sourceFiber);
          rootRenderLanes = createRootErrorUpdate(root.stateNode, value, rootRenderLanes);
          enqueueCapturedUpdate(root, rootRenderLanes);
          if (workInProgressRootExitStatus !== 4) workInProgressRootExitStatus = 2;
        }
        return false;
      }
      var wrapperError = Error(formatProdErrorMessage(520), {
        cause: value,
      });
      wrapperError = createCapturedValueAtFiber(wrapperError, sourceFiber);
      if (workInProgressRootConcurrentErrors === null) workInProgressRootConcurrentErrors = [wrapperError];
      else workInProgressRootConcurrentErrors.push(wrapperError);
      if (workInProgressRootExitStatus !== 4) workInProgressRootExitStatus = 2;
      if (returnFiber === null) return true;
      value = createCapturedValueAtFiber(value, sourceFiber);
      sourceFiber = returnFiber;
      do {
        switch (sourceFiber.tag) {
          case 3:
            sourceFiber.flags |= 65536;
            root = rootRenderLanes & -rootRenderLanes;
            sourceFiber.lanes |= root;
            root = createRootErrorUpdate(sourceFiber.stateNode, value, root);
            enqueueCapturedUpdate(sourceFiber, root);
            return false;
          case 1:
            returnFiber = sourceFiber.type;
            wrapperError = sourceFiber.stateNode;
            if (
              (sourceFiber.flags & 128) === 0 &&
              (typeof returnFiber.getDerivedStateFromError === "function" ||
                (wrapperError !== null &&
                  typeof wrapperError.componentDidCatch === "function" &&
                  (legacyErrorBoundariesThatAlreadyFailed === null ||
                    !legacyErrorBoundariesThatAlreadyFailed.has(wrapperError))))
            ) {
              sourceFiber.flags |= 65536;
              rootRenderLanes &= -rootRenderLanes;
              sourceFiber.lanes |= rootRenderLanes;
              rootRenderLanes = createClassErrorUpdate(rootRenderLanes);
              initializeClassErrorUpdate(rootRenderLanes, root, sourceFiber, value);
              enqueueCapturedUpdate(sourceFiber, rootRenderLanes);
              return false;
            }
        }
        sourceFiber = sourceFiber.return;
      } while (sourceFiber !== null);
      return false;
    }
    function reconcileChildren(current, workInProgress, nextChildren, renderLanes) {
      workInProgress.child =
        current === null
          ? mountChildFibers(workInProgress, null, nextChildren, renderLanes)
          : reconcileChildFibers(workInProgress, current.child, nextChildren, renderLanes);
    }
    function updateForwardRef(current, workInProgress, Component, nextProps, renderLanes) {
      Component = Component.render;
      var ref = workInProgress.ref;
      if ("ref" in nextProps) {
        var props = {};
        for (var key in nextProps) if (key !== "ref") props[key] = nextProps[key];
      } else props = nextProps;
      prepareToReadContext(workInProgress);
      nextProps = renderWithHooks(current, workInProgress, Component, props, ref, renderLanes);
      key = checkDidRenderIdHook();
      if (current !== null && !didReceiveUpdate) {
        bailoutHooks(current, workInProgress, renderLanes);
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
      }
      if (isHydrating && key) pushMaterializedTreeId(workInProgress);
      workInProgress.flags |= 1;
      reconcileChildren(current, workInProgress, nextProps, renderLanes);
      return workInProgress.child;
    }
    function updateMemoComponent(current, workInProgress, Component, nextProps, renderLanes) {
      if (current === null) {
        var type = Component.type;
        if (
          typeof type === "function" &&
          !shouldConstruct(type) &&
          type.defaultProps === undefined &&
          Component.compare === null
        ) {
          workInProgress.tag = 15;
          workInProgress.type = type;
          return updateSimpleMemoComponent(current, workInProgress, type, nextProps, renderLanes);
        }
        current = createFiberFromTypeAndProps(
          Component.type,
          null,
          nextProps,
          workInProgress,
          workInProgress.mode,
          renderLanes,
        );
        current.ref = workInProgress.ref;
        current.return = workInProgress;
        return (workInProgress.child = current);
      }
      type = current.child;
      if (!checkScheduledUpdateOrContext(current, renderLanes)) {
        var prevProps = type.memoizedProps;
        Component = Component.compare;
        Component = Component !== null ? Component : shallowEqual;
        if (Component(prevProps, nextProps) && current.ref === workInProgress.ref)
          return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
      }
      workInProgress.flags |= 1;
      current = createWorkInProgress(type, nextProps);
      current.ref = workInProgress.ref;
      current.return = workInProgress;
      return (workInProgress.child = current);
    }
    function updateSimpleMemoComponent(current, workInProgress, Component, nextProps, renderLanes) {
      if (current !== null) {
        var prevProps = current.memoizedProps;
        if (shallowEqual(prevProps, nextProps) && current.ref === workInProgress.ref) {
          didReceiveUpdate = false;
          workInProgress.pendingProps = nextProps = prevProps;
          if (checkScheduledUpdateOrContext(current, renderLanes)) {
            if ((current.flags & 131072) !== 0) didReceiveUpdate = true;
          } else {
            workInProgress.lanes = current.lanes;
            return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
          }
        }
      }
      return updateFunctionComponent(current, workInProgress, Component, nextProps, renderLanes);
    }
    function updateOffscreenComponent(current, workInProgress, renderLanes, nextProps) {
      var nextChildren = nextProps.children;
      var prevState = current !== null ? current.memoizedState : null;
      if (current === null && workInProgress.stateNode === null)
        workInProgress.stateNode = {
          _visibility: 1,
          _pendingMarkers: null,
          _retryCache: null,
          _transitions: null,
        };
      if (nextProps.mode === "hidden") {
        if ((workInProgress.flags & 128) !== 0) {
          prevState = prevState !== null ? prevState.baseLanes | renderLanes : renderLanes;
          if (current !== null) {
            nextProps = workInProgress.child = current.child;
            for (nextChildren = 0; nextProps !== null;) {
              nextChildren = nextChildren | nextProps.lanes | nextProps.childLanes;
              nextProps = nextProps.sibling;
            }
            nextProps = nextChildren & ~prevState;
          } else {
            nextProps = 0;
            workInProgress.child = null;
          }
          return deferHiddenOffscreenComponent(current, workInProgress, prevState, renderLanes, nextProps);
        }
        if ((renderLanes & 536870912) !== 0) {
          workInProgress.memoizedState = {
            baseLanes: 0,
            cachePool: null,
          };
          if (current !== null)
            pushTransition(workInProgress, prevState !== null ? prevState.cachePool : null);
          if (prevState !== null) pushHiddenContext(workInProgress, prevState);
          else reuseHiddenContextOnStack();
          pushOffscreenSuspenseHandler(workInProgress);
        } else {
          nextProps = workInProgress.lanes = 536870912;
          return deferHiddenOffscreenComponent(
            current,
            workInProgress,
            prevState !== null ? prevState.baseLanes | renderLanes : renderLanes,
            renderLanes,
            nextProps,
          );
        }
      } else if (prevState !== null) {
        pushTransition(workInProgress, prevState.cachePool);
        pushHiddenContext(workInProgress, prevState);
        reuseSuspenseHandlerOnStack(workInProgress);
        workInProgress.memoizedState = null;
      } else {
        if (current !== null) pushTransition(workInProgress, null);
        reuseHiddenContextOnStack();
        reuseSuspenseHandlerOnStack(workInProgress);
      }
      reconcileChildren(current, workInProgress, nextChildren, renderLanes);
      return workInProgress.child;
    }
    function bailoutOffscreenComponent(current, workInProgress) {
      if (!((current !== null && current.tag === 22) || workInProgress.stateNode !== null))
        workInProgress.stateNode = {
          _visibility: 1,
          _pendingMarkers: null,
          _retryCache: null,
          _transitions: null,
        };
      return workInProgress.sibling;
    }
    function deferHiddenOffscreenComponent(
      current,
      workInProgress,
      nextBaseLanes,
      renderLanes,
      remainingChildLanes,
    ) {
      var JSCompiler_inline_result = peekCacheFromPool();
      JSCompiler_inline_result =
        JSCompiler_inline_result === null
          ? null
          : {
              parent: isPrimaryRenderer ? CacheContext._currentValue : CacheContext._currentValue2,
              pool: JSCompiler_inline_result,
            };
      workInProgress.memoizedState = {
        baseLanes: nextBaseLanes,
        cachePool: JSCompiler_inline_result,
      };
      if (current !== null) pushTransition(workInProgress, null);
      reuseHiddenContextOnStack();
      pushOffscreenSuspenseHandler(workInProgress);
      if (current !== null) propagateParentContextChanges(current, workInProgress, renderLanes, true);
      workInProgress.childLanes = remainingChildLanes;
      return null;
    }
    function mountActivityChildren(workInProgress, nextProps) {
      nextProps = mountWorkInProgressOffscreenFiber(
        {
          mode: nextProps.mode,
          children: nextProps.children,
        },
        workInProgress.mode,
      );
      nextProps.ref = workInProgress.ref;
      workInProgress.child = nextProps;
      nextProps.return = workInProgress;
      return nextProps;
    }
    function retryActivityComponentWithoutHydrating(current, workInProgress, renderLanes) {
      reconcileChildFibers(workInProgress, current.child, null, renderLanes);
      current = mountActivityChildren(workInProgress, workInProgress.pendingProps);
      current.flags |= 2;
      popSuspenseHandler(workInProgress);
      workInProgress.memoizedState = null;
      return current;
    }
    function updateActivityComponent(current, workInProgress, renderLanes) {
      var nextProps = workInProgress.pendingProps;
      var didSuspend = (workInProgress.flags & 128) !== 0;
      workInProgress.flags &= -129;
      if (current === null) {
        if (isHydrating) {
          if (nextProps.mode === "hidden") {
            current = mountActivityChildren(workInProgress, nextProps);
            workInProgress.lanes = 536870912;
            return bailoutOffscreenComponent(null, current);
          }
          pushDehydratedActivitySuspenseHandler(workInProgress);
          if ((current = nextHydratableInstance)) {
            current = canHydrateActivityInstance(current, rootOrSingletonContext);
            if (current !== null) {
              workInProgress.memoizedState = {
                dehydrated: current,
                treeContext:
                  treeContextProvider !== null
                    ? {
                        id: treeContextId,
                        overflow: treeContextOverflow,
                      }
                    : null,
                retryLane: 536870912,
                hydrationErrors: null,
              };
              renderLanes = createFiberFromDehydratedFragment(current);
              renderLanes.return = workInProgress;
              workInProgress.child = renderLanes;
              hydrationParentFiber = workInProgress;
              nextHydratableInstance = null;
            }
          } else current = null;
          if (current === null) throw throwOnHydrationMismatch(workInProgress);
          workInProgress.lanes = 536870912;
          return null;
        }
        return mountActivityChildren(workInProgress, nextProps);
      }
      var prevState = current.memoizedState;
      if (prevState !== null) {
        var dehydrated = prevState.dehydrated;
        pushDehydratedActivitySuspenseHandler(workInProgress);
        if (didSuspend) {
          if (workInProgress.flags & 256) {
            workInProgress.flags &= -257;
            workInProgress = retryActivityComponentWithoutHydrating(current, workInProgress, renderLanes);
          } else if (workInProgress.memoizedState !== null) {
            workInProgress.child = current.child;
            workInProgress.flags |= 128;
            workInProgress = null;
          } else throw Error(formatProdErrorMessage(558));
        } else {
          if (!didReceiveUpdate) propagateParentContextChanges(current, workInProgress, renderLanes, false);
          didSuspend = (renderLanes & current.childLanes) !== 0;
          if (didReceiveUpdate || didSuspend) {
            nextProps = workInProgressRoot;
            if (
              nextProps !== null &&
              ((dehydrated = getBumpedLaneForHydration(nextProps, renderLanes)),
              dehydrated !== 0 && dehydrated !== prevState.retryLane)
            ) {
              prevState.retryLane = dehydrated;
              enqueueConcurrentRenderForLane(current, dehydrated);
              scheduleUpdateOnFiber(nextProps, current, dehydrated);
              throw SelectiveHydrationException;
            }
            renderDidSuspendDelayIfPossible();
            workInProgress = retryActivityComponentWithoutHydrating(current, workInProgress, renderLanes);
          } else {
            current = prevState.treeContext;
            if (supportsHydration) {
              nextHydratableInstance = getFirstHydratableChildWithinActivityInstance(dehydrated);
              hydrationParentFiber = workInProgress;
              isHydrating = true;
              hydrationErrors = null;
              rootOrSingletonContext = false;
              if (current !== null) restoreSuspendedTreeContext(workInProgress, current);
            }
            workInProgress = mountActivityChildren(workInProgress, nextProps);
            workInProgress.flags |= 4096;
          }
        }
        return workInProgress;
      }
      current = createWorkInProgress(current.child, {
        mode: nextProps.mode,
        children: nextProps.children,
      });
      current.ref = workInProgress.ref;
      workInProgress.child = current;
      current.return = workInProgress;
      return current;
    }
    function markRef(current, workInProgress) {
      var ref = workInProgress.ref;
      if (ref === null) {
        if (current !== null && current.ref !== null) workInProgress.flags |= 4194816;
      } else {
        if (typeof ref !== "function" && typeof ref !== "object") throw Error(formatProdErrorMessage(284));
        if (current === null || current.ref !== ref) workInProgress.flags |= 4194816;
      }
    }
    function updateFunctionComponent(current, workInProgress, Component, nextProps, renderLanes) {
      prepareToReadContext(workInProgress);
      Component = renderWithHooks(current, workInProgress, Component, nextProps, undefined, renderLanes);
      nextProps = checkDidRenderIdHook();
      if (current !== null && !didReceiveUpdate) {
        bailoutHooks(current, workInProgress, renderLanes);
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
      }
      if (isHydrating && nextProps) pushMaterializedTreeId(workInProgress);
      workInProgress.flags |= 1;
      reconcileChildren(current, workInProgress, Component, renderLanes);
      return workInProgress.child;
    }
    function replayFunctionComponent(current, workInProgress, nextProps, Component, secondArg, renderLanes) {
      prepareToReadContext(workInProgress);
      workInProgress.updateQueue = null;
      nextProps = renderWithHooksAgain(workInProgress, Component, nextProps, secondArg);
      finishRenderingHooks(current);
      Component = checkDidRenderIdHook();
      if (current !== null && !didReceiveUpdate) {
        bailoutHooks(current, workInProgress, renderLanes);
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
      }
      if (isHydrating && Component) pushMaterializedTreeId(workInProgress);
      workInProgress.flags |= 1;
      reconcileChildren(current, workInProgress, nextProps, renderLanes);
      return workInProgress.child;
    }
    function updateClassComponent(current, workInProgress, Component, nextProps, renderLanes) {
      prepareToReadContext(workInProgress);
      if (workInProgress.stateNode === null) {
        var context = emptyContextObject;
        var contextType = Component.contextType;
        if (typeof contextType === "object" && contextType !== null) context = readContext(contextType);
        context = new Component(nextProps, context);
        workInProgress.memoizedState =
          context.state !== null && context.state !== undefined ? context.state : null;
        context.updater = classComponentUpdater;
        workInProgress.stateNode = context;
        context._reactInternals = workInProgress;
        context = workInProgress.stateNode;
        context.props = nextProps;
        context.state = workInProgress.memoizedState;
        context.refs = {};
        initializeUpdateQueue(workInProgress);
        contextType = Component.contextType;
        context.context =
          typeof contextType === "object" && contextType !== null
            ? readContext(contextType)
            : emptyContextObject;
        context.state = workInProgress.memoizedState;
        contextType = Component.getDerivedStateFromProps;
        if (typeof contextType === "function") {
          applyDerivedStateFromProps(workInProgress, Component, contextType, nextProps);
          context.state = workInProgress.memoizedState;
        }
        if (!(
          typeof Component.getDerivedStateFromProps === "function" ||
          typeof context.getSnapshotBeforeUpdate === "function" ||
          (typeof context.UNSAFE_componentWillMount !== "function" &&
            typeof context.componentWillMount !== "function")
        )) {
          contextType = context.state;
          if (typeof context.componentWillMount === "function") context.componentWillMount();
          if (typeof context.UNSAFE_componentWillMount === "function") context.UNSAFE_componentWillMount();
          if (contextType !== context.state)
            classComponentUpdater.enqueueReplaceState(context, context.state, null);
          processUpdateQueue(workInProgress, nextProps, context, renderLanes);
          suspendIfUpdateReadFromEntangledAsyncAction();
          context.state = workInProgress.memoizedState;
        }
        if (typeof context.componentDidMount === "function") workInProgress.flags |= 4194308;
        nextProps = true;
      } else if (current === null) {
        context = workInProgress.stateNode;
        var unresolvedOldProps = workInProgress.memoizedProps;
        var oldProps = resolveClassComponentProps(Component, unresolvedOldProps);
        context.props = oldProps;
        var oldContext = context.context;
        var contextType$jscomp$0 = Component.contextType;
        contextType = emptyContextObject;
        if (typeof contextType$jscomp$0 === "object" && contextType$jscomp$0 !== null)
          contextType = readContext(contextType$jscomp$0);
        var getDerivedStateFromProps = Component.getDerivedStateFromProps;
        contextType$jscomp$0 =
          typeof getDerivedStateFromProps === "function" ||
          typeof context.getSnapshotBeforeUpdate === "function";
        unresolvedOldProps = workInProgress.pendingProps !== unresolvedOldProps;
        if (!(
          contextType$jscomp$0 ||
          (typeof context.UNSAFE_componentWillReceiveProps !== "function" &&
            typeof context.componentWillReceiveProps !== "function")
        )) {
          if (unresolvedOldProps || oldContext !== contextType)
            callComponentWillReceiveProps(workInProgress, context, nextProps, contextType);
        }
        hasForceUpdate = false;
        var oldState = workInProgress.memoizedState;
        context.state = oldState;
        processUpdateQueue(workInProgress, nextProps, context, renderLanes);
        suspendIfUpdateReadFromEntangledAsyncAction();
        oldContext = workInProgress.memoizedState;
        if (unresolvedOldProps || oldState !== oldContext || hasForceUpdate) {
          if (typeof getDerivedStateFromProps === "function") {
            applyDerivedStateFromProps(workInProgress, Component, getDerivedStateFromProps, nextProps);
            oldContext = workInProgress.memoizedState;
          }
          if (
            (oldProps =
              hasForceUpdate ||
              checkShouldComponentUpdate(
                workInProgress,
                Component,
                oldProps,
                nextProps,
                oldState,
                oldContext,
                contextType,
              ))
          ) {
            if (!(
              contextType$jscomp$0 ||
              (typeof context.UNSAFE_componentWillMount !== "function" &&
                typeof context.componentWillMount !== "function")
            )) {
              if (typeof context.componentWillMount === "function") context.componentWillMount();
              if (typeof context.UNSAFE_componentWillMount === "function")
                context.UNSAFE_componentWillMount();
            }
            if (typeof context.componentDidMount === "function") workInProgress.flags |= 4194308;
          } else {
            if (typeof context.componentDidMount === "function") workInProgress.flags |= 4194308;
            workInProgress.memoizedProps = nextProps;
            workInProgress.memoizedState = oldContext;
          }
          context.props = nextProps;
          context.state = oldContext;
          context.context = contextType;
          nextProps = oldProps;
        } else {
          if (typeof context.componentDidMount === "function") workInProgress.flags |= 4194308;
          nextProps = false;
        }
      } else {
        context = workInProgress.stateNode;
        cloneUpdateQueue(current, workInProgress);
        contextType = workInProgress.memoizedProps;
        contextType$jscomp$0 = resolveClassComponentProps(Component, contextType);
        context.props = contextType$jscomp$0;
        getDerivedStateFromProps = workInProgress.pendingProps;
        oldState = context.context;
        oldContext = Component.contextType;
        oldProps = emptyContextObject;
        if (typeof oldContext === "object" && oldContext !== null) oldProps = readContext(oldContext);
        unresolvedOldProps = Component.getDerivedStateFromProps;
        if (!(
          (oldContext =
            typeof unresolvedOldProps === "function" ||
            typeof context.getSnapshotBeforeUpdate === "function") ||
          (typeof context.UNSAFE_componentWillReceiveProps !== "function" &&
            typeof context.componentWillReceiveProps !== "function")
        )) {
          if (contextType !== getDerivedStateFromProps || oldState !== oldProps)
            callComponentWillReceiveProps(workInProgress, context, nextProps, oldProps);
        }
        hasForceUpdate = false;
        oldState = workInProgress.memoizedState;
        context.state = oldState;
        processUpdateQueue(workInProgress, nextProps, context, renderLanes);
        suspendIfUpdateReadFromEntangledAsyncAction();
        var newState = workInProgress.memoizedState;
        if (
          contextType !== getDerivedStateFromProps ||
          oldState !== newState ||
          hasForceUpdate ||
          (current !== null && current.dependencies !== null && checkIfContextChanged(current.dependencies))
        ) {
          if (typeof unresolvedOldProps === "function") {
            applyDerivedStateFromProps(workInProgress, Component, unresolvedOldProps, nextProps);
            newState = workInProgress.memoizedState;
          }
          if (
            (contextType$jscomp$0 =
              hasForceUpdate ||
              checkShouldComponentUpdate(
                workInProgress,
                Component,
                contextType$jscomp$0,
                nextProps,
                oldState,
                newState,
                oldProps,
              ) ||
              (current !== null &&
                current.dependencies !== null &&
                checkIfContextChanged(current.dependencies)))
          ) {
            if (!(
              oldContext ||
              (typeof context.UNSAFE_componentWillUpdate !== "function" &&
                typeof context.componentWillUpdate !== "function")
            )) {
              if (typeof context.componentWillUpdate === "function")
                context.componentWillUpdate(nextProps, newState, oldProps);
              if (typeof context.UNSAFE_componentWillUpdate === "function")
                context.UNSAFE_componentWillUpdate(nextProps, newState, oldProps);
            }
            if (typeof context.componentDidUpdate === "function") workInProgress.flags |= 4;
            if (typeof context.getSnapshotBeforeUpdate === "function") workInProgress.flags |= 1024;
          } else {
            if (!(
              typeof context.componentDidUpdate !== "function" ||
              (contextType === current.memoizedProps && oldState === current.memoizedState)
            ))
              workInProgress.flags |= 4;
            if (!(
              typeof context.getSnapshotBeforeUpdate !== "function" ||
              (contextType === current.memoizedProps && oldState === current.memoizedState)
            ))
              workInProgress.flags |= 1024;
            workInProgress.memoizedProps = nextProps;
            workInProgress.memoizedState = newState;
          }
          context.props = nextProps;
          context.state = newState;
          context.context = oldProps;
          nextProps = contextType$jscomp$0;
        } else {
          if (!(
            typeof context.componentDidUpdate !== "function" ||
            (contextType === current.memoizedProps && oldState === current.memoizedState)
          ))
            workInProgress.flags |= 4;
          if (!(
            typeof context.getSnapshotBeforeUpdate !== "function" ||
            (contextType === current.memoizedProps && oldState === current.memoizedState)
          ))
            workInProgress.flags |= 1024;
          nextProps = false;
        }
      }
      context = nextProps;
      markRef(current, workInProgress);
      nextProps = (workInProgress.flags & 128) !== 0;
      if (context || nextProps) {
        context = workInProgress.stateNode;
        Component =
          nextProps && typeof Component.getDerivedStateFromError !== "function" ? null : context.render();
        workInProgress.flags |= 1;
        if (current !== null && nextProps) {
          workInProgress.child = reconcileChildFibers(workInProgress, current.child, null, renderLanes);
          workInProgress.child = reconcileChildFibers(workInProgress, null, Component, renderLanes);
        } else reconcileChildren(current, workInProgress, Component, renderLanes);
        workInProgress.memoizedState = context.state;
        current = workInProgress.child;
      } else current = bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
      return current;
    }
    function mountHostRootWithoutHydrating(current, workInProgress, nextChildren, renderLanes) {
      resetHydrationState();
      workInProgress.flags |= 256;
      reconcileChildren(current, workInProgress, nextChildren, renderLanes);
      return workInProgress.child;
    }
    function mountSuspenseOffscreenState(renderLanes) {
      return {
        baseLanes: renderLanes,
        cachePool: getSuspendedCache(),
      };
    }
    function getRemainingWorkInPrimaryTree(current, primaryTreeDidDefer, renderLanes) {
      current = current !== null ? current.childLanes & ~renderLanes : 0;
      if (primaryTreeDidDefer) current |= workInProgressDeferredLane;
      return current;
    }
    function updateSuspenseComponent(current, workInProgress, renderLanes) {
      var nextProps = workInProgress.pendingProps;
      var showFallback = false;
      var didSuspend = (workInProgress.flags & 128) !== 0;
      var JSCompiler_temp;
      if (!(JSCompiler_temp = didSuspend))
        JSCompiler_temp =
          current !== null && current.memoizedState === null
            ? false
            : (suspenseStackCursor.current & 2) !== 0;
      if (JSCompiler_temp) {
        showFallback = true;
        workInProgress.flags &= -129;
      }
      JSCompiler_temp = (workInProgress.flags & 32) !== 0;
      workInProgress.flags &= -33;
      if (current === null) {
        if (isHydrating) {
          if (showFallback) pushPrimaryTreeSuspenseHandler(workInProgress);
          else reuseSuspenseHandlerOnStack(workInProgress);
          if ((current = nextHydratableInstance)) {
            current = canHydrateSuspenseInstance(current, rootOrSingletonContext);
            if (current !== null) {
              workInProgress.memoizedState = {
                dehydrated: current,
                treeContext:
                  treeContextProvider !== null
                    ? {
                        id: treeContextId,
                        overflow: treeContextOverflow,
                      }
                    : null,
                retryLane: 536870912,
                hydrationErrors: null,
              };
              renderLanes = createFiberFromDehydratedFragment(current);
              renderLanes.return = workInProgress;
              workInProgress.child = renderLanes;
              hydrationParentFiber = workInProgress;
              nextHydratableInstance = null;
            }
          } else current = null;
          if (current === null) throw throwOnHydrationMismatch(workInProgress);
          if (isSuspenseInstanceFallback(current)) workInProgress.lanes = 32;
          else workInProgress.lanes = 536870912;
          return null;
        }
        var nextPrimaryChildren = nextProps.children;
        nextProps = nextProps.fallback;
        if (showFallback) {
          reuseSuspenseHandlerOnStack(workInProgress);
          showFallback = workInProgress.mode;
          nextPrimaryChildren = mountWorkInProgressOffscreenFiber(
            {
              mode: "hidden",
              children: nextPrimaryChildren,
            },
            showFallback,
          );
          nextProps = createFiberFromFragment(nextProps, showFallback, renderLanes, null);
          nextPrimaryChildren.return = workInProgress;
          nextProps.return = workInProgress;
          nextPrimaryChildren.sibling = nextProps;
          workInProgress.child = nextPrimaryChildren;
          nextProps = workInProgress.child;
          nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes);
          nextProps.childLanes = getRemainingWorkInPrimaryTree(current, JSCompiler_temp, renderLanes);
          workInProgress.memoizedState = SUSPENDED_MARKER;
          return bailoutOffscreenComponent(null, nextProps);
        }
        pushPrimaryTreeSuspenseHandler(workInProgress);
        return mountSuspensePrimaryChildren(workInProgress, nextPrimaryChildren);
      }
      var prevState = current.memoizedState;
      if (
        prevState !== null &&
        ((nextPrimaryChildren = prevState.dehydrated), nextPrimaryChildren !== null)
      ) {
        if (didSuspend) {
          if (workInProgress.flags & 256) {
            pushPrimaryTreeSuspenseHandler(workInProgress);
            workInProgress.flags &= -257;
            workInProgress = retrySuspenseComponentWithoutHydrating(current, workInProgress, renderLanes);
          } else if (workInProgress.memoizedState !== null) {
            reuseSuspenseHandlerOnStack(workInProgress);
            workInProgress.child = current.child;
            workInProgress.flags |= 128;
            workInProgress = null;
          } else {
            reuseSuspenseHandlerOnStack(workInProgress);
            nextPrimaryChildren = nextProps.fallback;
            showFallback = workInProgress.mode;
            nextProps = mountWorkInProgressOffscreenFiber(
              {
                mode: "visible",
                children: nextProps.children,
              },
              showFallback,
            );
            nextPrimaryChildren = createFiberFromFragment(
              nextPrimaryChildren,
              showFallback,
              renderLanes,
              null,
            );
            nextPrimaryChildren.flags |= 2;
            nextProps.return = workInProgress;
            nextPrimaryChildren.return = workInProgress;
            nextProps.sibling = nextPrimaryChildren;
            workInProgress.child = nextProps;
            reconcileChildFibers(workInProgress, current.child, null, renderLanes);
            nextProps = workInProgress.child;
            nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes);
            nextProps.childLanes = getRemainingWorkInPrimaryTree(current, JSCompiler_temp, renderLanes);
            workInProgress.memoizedState = SUSPENDED_MARKER;
            workInProgress = bailoutOffscreenComponent(null, nextProps);
          }
        } else {
          pushPrimaryTreeSuspenseHandler(workInProgress);
          if (isSuspenseInstanceFallback(nextPrimaryChildren)) {
            JSCompiler_temp = getSuspenseInstanceFallbackErrorDetails(nextPrimaryChildren).digest;
            nextProps = Error(formatProdErrorMessage(419));
            nextProps.stack = "";
            nextProps.digest = JSCompiler_temp;
            queueHydrationError({
              value: nextProps,
              source: null,
              stack: null,
            });
            workInProgress = retrySuspenseComponentWithoutHydrating(current, workInProgress, renderLanes);
          } else {
            if (!didReceiveUpdate) propagateParentContextChanges(current, workInProgress, renderLanes, false);
            JSCompiler_temp = (renderLanes & current.childLanes) !== 0;
            if (didReceiveUpdate || JSCompiler_temp) {
              JSCompiler_temp = workInProgressRoot;
              if (
                JSCompiler_temp !== null &&
                ((nextProps = getBumpedLaneForHydration(JSCompiler_temp, renderLanes)),
                nextProps !== 0 && nextProps !== prevState.retryLane)
              ) {
                prevState.retryLane = nextProps;
                enqueueConcurrentRenderForLane(current, nextProps);
                scheduleUpdateOnFiber(JSCompiler_temp, current, nextProps);
                throw SelectiveHydrationException;
              }
              if (!isSuspenseInstancePending(nextPrimaryChildren)) renderDidSuspendDelayIfPossible();
              workInProgress = retrySuspenseComponentWithoutHydrating(current, workInProgress, renderLanes);
            } else if (isSuspenseInstancePending(nextPrimaryChildren)) {
              workInProgress.flags |= 192;
              workInProgress.child = current.child;
              workInProgress = null;
            } else {
              current = prevState.treeContext;
              if (supportsHydration) {
                nextHydratableInstance = getFirstHydratableChildWithinSuspenseInstance(nextPrimaryChildren);
                hydrationParentFiber = workInProgress;
                isHydrating = true;
                hydrationErrors = null;
                rootOrSingletonContext = false;
                if (current !== null) restoreSuspendedTreeContext(workInProgress, current);
              }
              workInProgress = mountSuspensePrimaryChildren(workInProgress, nextProps.children);
              workInProgress.flags |= 4096;
            }
          }
        }
        return workInProgress;
      }
      if (showFallback) {
        reuseSuspenseHandlerOnStack(workInProgress);
        nextPrimaryChildren = nextProps.fallback;
        showFallback = workInProgress.mode;
        prevState = current.child;
        didSuspend = prevState.sibling;
        nextProps = createWorkInProgress(prevState, {
          mode: "hidden",
          children: nextProps.children,
        });
        nextProps.subtreeFlags = prevState.subtreeFlags & 65011712;
        if (didSuspend !== null) nextPrimaryChildren = createWorkInProgress(didSuspend, nextPrimaryChildren);
        else {
          nextPrimaryChildren = createFiberFromFragment(nextPrimaryChildren, showFallback, renderLanes, null);
          nextPrimaryChildren.flags |= 2;
        }
        nextPrimaryChildren.return = workInProgress;
        nextProps.return = workInProgress;
        nextProps.sibling = nextPrimaryChildren;
        workInProgress.child = nextProps;
        bailoutOffscreenComponent(null, nextProps);
        nextProps = workInProgress.child;
        nextPrimaryChildren = current.child.memoizedState;
        if (nextPrimaryChildren === null) nextPrimaryChildren = mountSuspenseOffscreenState(renderLanes);
        else {
          showFallback = nextPrimaryChildren.cachePool;
          if (showFallback !== null) {
            prevState = isPrimaryRenderer ? CacheContext._currentValue : CacheContext._currentValue2;
            showFallback =
              showFallback.parent !== prevState
                ? {
                    parent: prevState,
                    pool: prevState,
                  }
                : showFallback;
          } else showFallback = getSuspendedCache();
          nextPrimaryChildren = {
            baseLanes: nextPrimaryChildren.baseLanes | renderLanes,
            cachePool: showFallback,
          };
        }
        nextProps.memoizedState = nextPrimaryChildren;
        nextProps.childLanes = getRemainingWorkInPrimaryTree(current, JSCompiler_temp, renderLanes);
        workInProgress.memoizedState = SUSPENDED_MARKER;
        return bailoutOffscreenComponent(current.child, nextProps);
      }
      pushPrimaryTreeSuspenseHandler(workInProgress);
      renderLanes = current.child;
      current = renderLanes.sibling;
      renderLanes = createWorkInProgress(renderLanes, {
        mode: "visible",
        children: nextProps.children,
      });
      renderLanes.return = workInProgress;
      renderLanes.sibling = null;
      if (current !== null) {
        JSCompiler_temp = workInProgress.deletions;
        if (JSCompiler_temp === null) {
          workInProgress.deletions = [current];
          workInProgress.flags |= 16;
        } else JSCompiler_temp.push(current);
      }
      workInProgress.child = renderLanes;
      workInProgress.memoizedState = null;
      return renderLanes;
    }
    function mountSuspensePrimaryChildren(workInProgress, primaryChildren) {
      primaryChildren = mountWorkInProgressOffscreenFiber(
        {
          mode: "visible",
          children: primaryChildren,
        },
        workInProgress.mode,
      );
      primaryChildren.return = workInProgress;
      return (workInProgress.child = primaryChildren);
    }
    function mountWorkInProgressOffscreenFiber(offscreenProps, mode) {
      offscreenProps = createFiber(22, offscreenProps, null, mode);
      offscreenProps.lanes = 0;
      return offscreenProps;
    }
    function retrySuspenseComponentWithoutHydrating(current, workInProgress, renderLanes) {
      reconcileChildFibers(workInProgress, current.child, null, renderLanes);
      current = mountSuspensePrimaryChildren(workInProgress, workInProgress.pendingProps.children);
      current.flags |= 2;
      workInProgress.memoizedState = null;
      return current;
    }
    function scheduleSuspenseWorkOnFiber(fiber, renderLanes, propagationRoot) {
      fiber.lanes |= renderLanes;
      var alternate = fiber.alternate;
      if (alternate !== null) alternate.lanes |= renderLanes;
      scheduleContextWorkOnParentPath(fiber.return, renderLanes, propagationRoot);
    }
    function initSuspenseListRenderState(
      workInProgress,
      isBackwards,
      tail,
      lastContentRow,
      tailMode,
      treeForkCount,
    ) {
      var renderState = workInProgress.memoizedState;
      if (renderState === null)
        workInProgress.memoizedState = {
          isBackwards,
          rendering: null,
          renderingStartTime: 0,
          last: lastContentRow,
          tail,
          tailMode,
          treeForkCount,
        };
      else {
        renderState.isBackwards = isBackwards;
        renderState.rendering = null;
        renderState.renderingStartTime = 0;
        renderState.last = lastContentRow;
        renderState.tail = tail;
        renderState.tailMode = tailMode;
        renderState.treeForkCount = treeForkCount;
      }
    }
    function updateSuspenseListComponent(current, workInProgress, renderLanes) {
      var nextProps = workInProgress.pendingProps;
      var revealOrder = nextProps.revealOrder;
      var tailMode = nextProps.tail;
      nextProps = nextProps.children;
      var suspenseContext = suspenseStackCursor.current;
      var shouldForceFallback = (suspenseContext & 2) !== 0;
      if (shouldForceFallback) {
        suspenseContext = (suspenseContext & 1) | 2;
        workInProgress.flags |= 128;
      } else suspenseContext &= 1;
      push(suspenseStackCursor, suspenseContext);
      reconcileChildren(current, workInProgress, nextProps, renderLanes);
      nextProps = isHydrating ? treeForkCount : 0;
      if (!shouldForceFallback && current !== null && (current.flags & 128) !== 0)
        e: for (current = workInProgress.child; current !== null;) {
          if (current.tag === 13) {
            if (current.memoizedState !== null)
              scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
          } else if (current.tag === 19) scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
          else if (current.child !== null) {
            current.child.return = current;
            current = current.child;
            continue;
          }
          if (current === workInProgress) break e;
          for (; current.sibling === null;) {
            if (current.return === null || current.return === workInProgress) break e;
            current = current.return;
          }
          current.sibling.return = current.return;
          current = current.sibling;
        }
      switch (revealOrder) {
        case "forwards":
          renderLanes = workInProgress.child;
          for (revealOrder = null; renderLanes !== null;) {
            current = renderLanes.alternate;
            if (current !== null && findFirstSuspended(current) === null) revealOrder = renderLanes;
            renderLanes = renderLanes.sibling;
          }
          renderLanes = revealOrder;
          if (renderLanes === null) {
            revealOrder = workInProgress.child;
            workInProgress.child = null;
          } else {
            revealOrder = renderLanes.sibling;
            renderLanes.sibling = null;
          }
          initSuspenseListRenderState(workInProgress, false, revealOrder, renderLanes, tailMode, nextProps);
          break;
        case "backwards":
        case "unstable_legacy-backwards":
          renderLanes = null;
          revealOrder = workInProgress.child;
          for (workInProgress.child = null; revealOrder !== null;) {
            current = revealOrder.alternate;
            if (current !== null && findFirstSuspended(current) === null) {
              workInProgress.child = revealOrder;
              break;
            }
            current = revealOrder.sibling;
            revealOrder.sibling = renderLanes;
            renderLanes = revealOrder;
            revealOrder = current;
          }
          initSuspenseListRenderState(workInProgress, true, renderLanes, null, tailMode, nextProps);
          break;
        case "together":
          initSuspenseListRenderState(workInProgress, false, null, null, undefined, nextProps);
          break;
        default:
          workInProgress.memoizedState = null;
      }
      return workInProgress.child;
    }
    function bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes) {
      if (current !== null) workInProgress.dependencies = current.dependencies;
      workInProgressRootSkippedLanes |= workInProgress.lanes;
      if ((renderLanes & workInProgress.childLanes) === 0)
        if (current !== null) {
          propagateParentContextChanges(current, workInProgress, renderLanes, false);
          if ((renderLanes & workInProgress.childLanes) === 0) return null;
        } else return null;
      if (current !== null && workInProgress.child !== current.child)
        throw Error(formatProdErrorMessage(153));
      if (workInProgress.child !== null) {
        current = workInProgress.child;
        renderLanes = createWorkInProgress(current, current.pendingProps);
        workInProgress.child = renderLanes;
        for (renderLanes.return = workInProgress; current.sibling !== null;) {
          current = current.sibling;
          renderLanes = renderLanes.sibling = createWorkInProgress(current, current.pendingProps);
          renderLanes.return = workInProgress;
        }
        renderLanes.sibling = null;
      }
      return workInProgress.child;
    }
    function checkScheduledUpdateOrContext(current, renderLanes) {
      if ((current.lanes & renderLanes) !== 0) return true;
      current = current.dependencies;
      return current !== null && checkIfContextChanged(current) ? true : false;
    }
    function attemptEarlyBailoutIfNoScheduledUpdate(current, workInProgress, renderLanes) {
      switch (workInProgress.tag) {
        case 3:
          pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
          pushProvider(workInProgress, CacheContext, current.memoizedState.cache);
          resetHydrationState();
          break;
        case 27:
        case 5:
          pushHostContext(workInProgress);
          break;
        case 4:
          pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
          break;
        case 10:
          pushProvider(workInProgress, workInProgress.type, workInProgress.memoizedProps.value);
          break;
        case 31:
          if (workInProgress.memoizedState !== null) {
            workInProgress.flags |= 128;
            pushDehydratedActivitySuspenseHandler(workInProgress);
            return null;
          }
          break;
        case 13:
          var state$82 = workInProgress.memoizedState;
          if (state$82 !== null) {
            if (state$82.dehydrated !== null) {
              pushPrimaryTreeSuspenseHandler(workInProgress);
              workInProgress.flags |= 128;
              return null;
            }
            if ((renderLanes & workInProgress.child.childLanes) !== 0)
              return updateSuspenseComponent(current, workInProgress, renderLanes);
            pushPrimaryTreeSuspenseHandler(workInProgress);
            current = bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
            return current !== null ? current.sibling : null;
          }
          pushPrimaryTreeSuspenseHandler(workInProgress);
          break;
        case 19:
          var didSuspendBefore = (current.flags & 128) !== 0;
          state$82 = (renderLanes & workInProgress.childLanes) !== 0;
          if (!state$82) {
            propagateParentContextChanges(current, workInProgress, renderLanes, false);
            state$82 = (renderLanes & workInProgress.childLanes) !== 0;
          }
          if (didSuspendBefore) {
            if (state$82) return updateSuspenseListComponent(current, workInProgress, renderLanes);
            workInProgress.flags |= 128;
          }
          didSuspendBefore = workInProgress.memoizedState;
          if (didSuspendBefore !== null) {
            didSuspendBefore.rendering = null;
            didSuspendBefore.tail = null;
            didSuspendBefore.lastEffect = null;
          }
          push(suspenseStackCursor, suspenseStackCursor.current);
          if (state$82) break;
          else return null;
        case 22:
          workInProgress.lanes = 0;
          return updateOffscreenComponent(current, workInProgress, renderLanes, workInProgress.pendingProps);
        case 24:
          pushProvider(workInProgress, CacheContext, current.memoizedState.cache);
      }
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
    function beginWork(current, workInProgress, renderLanes) {
      if (current !== null) {
        if (current.memoizedProps !== workInProgress.pendingProps) didReceiveUpdate = true;
        else {
          if (!checkScheduledUpdateOrContext(current, renderLanes) && (workInProgress.flags & 128) === 0) {
            didReceiveUpdate = false;
            return attemptEarlyBailoutIfNoScheduledUpdate(current, workInProgress, renderLanes);
          }
          didReceiveUpdate = (current.flags & 131072) !== 0 ? true : false;
        }
      } else {
        didReceiveUpdate = false;
        if (isHydrating && (workInProgress.flags & 1048576) !== 0)
          pushTreeId(workInProgress, treeForkCount, workInProgress.index);
      }
      switch (((workInProgress.lanes = 0), workInProgress.tag)) {
        case 16:
          e: {
            var props = workInProgress.pendingProps;
            current = resolveLazy(workInProgress.elementType);
            workInProgress.type = current;
            if (typeof current === "function") {
              if (shouldConstruct(current)) {
                props = resolveClassComponentProps(current, props);
                workInProgress.tag = 1;
                workInProgress = updateClassComponent(null, workInProgress, current, props, renderLanes);
              } else {
                workInProgress.tag = 0;
                workInProgress = updateFunctionComponent(null, workInProgress, current, props, renderLanes);
              }
            } else {
              if (current !== undefined && current !== null) {
                var $$typeof = current.$$typeof;
                if ($$typeof === REACT_FORWARD_REF_TYPE) {
                  workInProgress.tag = 11;
                  workInProgress = updateForwardRef(null, workInProgress, current, props, renderLanes);
                  break e;
                } else if ($$typeof === REACT_MEMO_TYPE) {
                  workInProgress.tag = 14;
                  workInProgress = updateMemoComponent(null, workInProgress, current, props, renderLanes);
                  break e;
                }
              }
              workInProgress = getComponentNameFromType(current) || current;
              throw Error(formatProdErrorMessage(306, workInProgress, ""));
            }
          }
          return workInProgress;
        case 0:
          return updateFunctionComponent(
            current,
            workInProgress,
            workInProgress.type,
            workInProgress.pendingProps,
            renderLanes,
          );
        case 1:
          props = workInProgress.type;
          $$typeof = resolveClassComponentProps(props, workInProgress.pendingProps);
          return updateClassComponent(current, workInProgress, props, $$typeof, renderLanes);
        case 3:
          e: {
            pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
            if (current === null) throw Error(formatProdErrorMessage(387));
            var nextProps = workInProgress.pendingProps;
            $$typeof = workInProgress.memoizedState;
            props = $$typeof.element;
            cloneUpdateQueue(current, workInProgress);
            processUpdateQueue(workInProgress, nextProps, null, renderLanes);
            var nextState = workInProgress.memoizedState;
            nextProps = nextState.cache;
            pushProvider(workInProgress, CacheContext, nextProps);
            if (nextProps !== $$typeof.cache)
              propagateContextChanges(workInProgress, [CacheContext], renderLanes, true);
            suspendIfUpdateReadFromEntangledAsyncAction();
            nextProps = nextState.element;
            if (supportsHydration && $$typeof.isDehydrated) {
              $$typeof = {
                element: nextProps,
                isDehydrated: false,
                cache: nextState.cache,
              };
              workInProgress.updateQueue.baseState = $$typeof;
              workInProgress.memoizedState = $$typeof;
              if (workInProgress.flags & 256) {
                workInProgress = mountHostRootWithoutHydrating(
                  current,
                  workInProgress,
                  nextProps,
                  renderLanes,
                );
                break e;
              } else if (nextProps !== props) {
                props = createCapturedValueAtFiber(Error(formatProdErrorMessage(424)), workInProgress);
                queueHydrationError(props);
                workInProgress = mountHostRootWithoutHydrating(
                  current,
                  workInProgress,
                  nextProps,
                  renderLanes,
                );
                break e;
              } else
                for (
                  supportsHydration &&
                    ((nextHydratableInstance = getFirstHydratableChildWithinContainer(
                      workInProgress.stateNode.containerInfo,
                    )),
                    (hydrationParentFiber = workInProgress),
                    (isHydrating = true),
                    (hydrationErrors = null),
                    (rootOrSingletonContext = true)),
                    renderLanes = mountChildFibers(workInProgress, null, nextProps, renderLanes),
                    workInProgress.child = renderLanes;
                  renderLanes;
                ) {
                  renderLanes.flags = (renderLanes.flags & -3) | 4096;
                  renderLanes = renderLanes.sibling;
                }
            } else {
              resetHydrationState();
              if (nextProps === props) {
                workInProgress = bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
                break e;
              }
              reconcileChildren(current, workInProgress, nextProps, renderLanes);
            }
            workInProgress = workInProgress.child;
          }
          return workInProgress;
        case 26:
          if (supportsResources) {
            markRef(current, workInProgress);
            if (current === null) {
              if ((renderLanes = getResource(workInProgress.type, null, workInProgress.pendingProps, null)))
                workInProgress.memoizedState = renderLanes;
              else if (!isHydrating)
                workInProgress.stateNode = createHoistableInstance(
                  workInProgress.type,
                  workInProgress.pendingProps,
                  rootInstanceStackCursor.current,
                  workInProgress,
                );
            } else
              workInProgress.memoizedState = getResource(
                workInProgress.type,
                current.memoizedProps,
                workInProgress.pendingProps,
                current.memoizedState,
              );
            return null;
          }
        case 27:
          if (supportsSingletons) {
            pushHostContext(workInProgress);
            if (current === null && supportsSingletons && isHydrating) {
              props = workInProgress.stateNode = resolveSingletonInstance(
                workInProgress.type,
                workInProgress.pendingProps,
                rootInstanceStackCursor.current,
                contextStackCursor.current,
                false,
              );
              hydrationParentFiber = workInProgress;
              rootOrSingletonContext = true;
              nextHydratableInstance = getFirstHydratableChildWithinSingleton(
                workInProgress.type,
                props,
                nextHydratableInstance,
              );
            }
            reconcileChildren(current, workInProgress, workInProgress.pendingProps.children, renderLanes);
            markRef(current, workInProgress);
            if (current === null) workInProgress.flags |= 4194304;
            return workInProgress.child;
          }
        case 5:
          if (current === null && isHydrating) {
            validateHydratableInstance(
              workInProgress.type,
              workInProgress.pendingProps,
              contextStackCursor.current,
            );
            if (($$typeof = props = nextHydratableInstance)) {
              props = canHydrateInstance(
                props,
                workInProgress.type,
                workInProgress.pendingProps,
                rootOrSingletonContext,
              );
              if (props !== null) {
                workInProgress.stateNode = props;
                hydrationParentFiber = workInProgress;
                nextHydratableInstance = getFirstHydratableChild(props);
                rootOrSingletonContext = false;
                $$typeof = true;
              } else $$typeof = false;
            }
            if (!$$typeof) throwOnHydrationMismatch(workInProgress);
          }
          pushHostContext(workInProgress);
          $$typeof = workInProgress.type;
          nextProps = workInProgress.pendingProps;
          nextState = current !== null ? current.memoizedProps : null;
          props = nextProps.children;
          if (shouldSetTextContent($$typeof, nextProps)) props = null;
          else if (nextState !== null && shouldSetTextContent($$typeof, nextState))
            workInProgress.flags |= 32;
          if (workInProgress.memoizedState !== null) {
            $$typeof = renderWithHooks(
              current,
              workInProgress,
              TransitionAwareHostComponent,
              null,
              null,
              renderLanes,
            );
            if (isPrimaryRenderer) HostTransitionContext._currentValue = $$typeof;
            else HostTransitionContext._currentValue2 = $$typeof;
          }
          markRef(current, workInProgress);
          reconcileChildren(current, workInProgress, props, renderLanes);
          return workInProgress.child;
        case 6:
          if (current === null && isHydrating) {
            validateHydratableTextInstance(workInProgress.pendingProps, contextStackCursor.current);
            if ((current = renderLanes = nextHydratableInstance)) {
              renderLanes = canHydrateTextInstance(
                renderLanes,
                workInProgress.pendingProps,
                rootOrSingletonContext,
              );
              if (renderLanes !== null) {
                workInProgress.stateNode = renderLanes;
                hydrationParentFiber = workInProgress;
                nextHydratableInstance = null;
                current = true;
              } else current = false;
            }
            if (!current) throwOnHydrationMismatch(workInProgress);
          }
          return null;
        case 13:
          return updateSuspenseComponent(current, workInProgress, renderLanes);
        case 4:
          pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
          props = workInProgress.pendingProps;
          if (current === null)
            workInProgress.child = reconcileChildFibers(workInProgress, null, props, renderLanes);
          else reconcileChildren(current, workInProgress, props, renderLanes);
          return workInProgress.child;
        case 11:
          return updateForwardRef(
            current,
            workInProgress,
            workInProgress.type,
            workInProgress.pendingProps,
            renderLanes,
          );
        case 7:
          reconcileChildren(current, workInProgress, workInProgress.pendingProps, renderLanes);
          return workInProgress.child;
        case 8:
          reconcileChildren(current, workInProgress, workInProgress.pendingProps.children, renderLanes);
          return workInProgress.child;
        case 12:
          reconcileChildren(current, workInProgress, workInProgress.pendingProps.children, renderLanes);
          return workInProgress.child;
        case 10:
          props = workInProgress.pendingProps;
          pushProvider(workInProgress, workInProgress.type, props.value);
          reconcileChildren(current, workInProgress, props.children, renderLanes);
          return workInProgress.child;
        case 9:
          $$typeof = workInProgress.type._context;
          props = workInProgress.pendingProps.children;
          prepareToReadContext(workInProgress);
          $$typeof = readContext($$typeof);
          props = props($$typeof);
          workInProgress.flags |= 1;
          reconcileChildren(current, workInProgress, props, renderLanes);
          return workInProgress.child;
        case 14:
          return updateMemoComponent(
            current,
            workInProgress,
            workInProgress.type,
            workInProgress.pendingProps,
            renderLanes,
          );
        case 15:
          return updateSimpleMemoComponent(
            current,
            workInProgress,
            workInProgress.type,
            workInProgress.pendingProps,
            renderLanes,
          );
        case 19:
          return updateSuspenseListComponent(current, workInProgress, renderLanes);
        case 31:
          return updateActivityComponent(current, workInProgress, renderLanes);
        case 22:
          return updateOffscreenComponent(current, workInProgress, renderLanes, workInProgress.pendingProps);
        case 24:
          prepareToReadContext(workInProgress);
          props = readContext(CacheContext);
          if (current === null) {
            $$typeof = peekCacheFromPool();
            if ($$typeof === null) {
              $$typeof = workInProgressRoot;
              nextProps = createCache();
              $$typeof.pooledCache = nextProps;
              nextProps.refCount++;
              if (nextProps !== null) $$typeof.pooledCacheLanes |= renderLanes;
              $$typeof = nextProps;
            }
            workInProgress.memoizedState = {
              parent: props,
              cache: $$typeof,
            };
            initializeUpdateQueue(workInProgress);
            pushProvider(workInProgress, CacheContext, $$typeof);
          } else {
            if ((current.lanes & renderLanes) !== 0) {
              cloneUpdateQueue(current, workInProgress);
              processUpdateQueue(workInProgress, null, null, renderLanes);
              suspendIfUpdateReadFromEntangledAsyncAction();
            }
            $$typeof = current.memoizedState;
            nextProps = workInProgress.memoizedState;
            if ($$typeof.parent !== props) {
              $$typeof = {
                parent: props,
                cache: props,
              };
              workInProgress.memoizedState = $$typeof;
              if (workInProgress.lanes === 0)
                workInProgress.memoizedState = workInProgress.updateQueue.baseState = $$typeof;
              pushProvider(workInProgress, CacheContext, props);
            } else {
              props = nextProps.cache;
              pushProvider(workInProgress, CacheContext, props);
              if (props !== $$typeof.cache)
                propagateContextChanges(workInProgress, [CacheContext], renderLanes, true);
            }
          }
          reconcileChildren(current, workInProgress, workInProgress.pendingProps.children, renderLanes);
          return workInProgress.child;
        case 29:
          throw workInProgress.pendingProps;
      }
      throw Error(formatProdErrorMessage(156, workInProgress.tag));
    }
    function markUpdate(workInProgress) {
      workInProgress.flags |= 4;
    }
    function markCloned(workInProgress) {
      if (supportsPersistence) workInProgress.flags |= 8;
    }
    function doesRequireClone(current, completedWork) {
      if (current !== null && current.child === completedWork.child) return false;
      if ((completedWork.flags & 16) !== 0) return true;
      for (current = completedWork.child; current !== null;) {
        if ((current.flags & 8218) !== 0 || (current.subtreeFlags & 8218) !== 0) return true;
        current = current.sibling;
      }
      return false;
    }
    function appendAllChildren(parent, workInProgress, needsVisibilityToggle, isHidden) {
      if (supportsMutation)
        for (needsVisibilityToggle = workInProgress.child; needsVisibilityToggle !== null;) {
          if (needsVisibilityToggle.tag === 5 || needsVisibilityToggle.tag === 6)
            appendInitialChild(parent, needsVisibilityToggle.stateNode);
          else if (
            !(needsVisibilityToggle.tag === 4 || (supportsSingletons && needsVisibilityToggle.tag === 27)) &&
            needsVisibilityToggle.child !== null
          ) {
            needsVisibilityToggle.child.return = needsVisibilityToggle;
            needsVisibilityToggle = needsVisibilityToggle.child;
            continue;
          }
          if (needsVisibilityToggle === workInProgress) break;
          for (; needsVisibilityToggle.sibling === null;) {
            if (needsVisibilityToggle.return === null || needsVisibilityToggle.return === workInProgress)
              return;
            needsVisibilityToggle = needsVisibilityToggle.return;
          }
          needsVisibilityToggle.sibling.return = needsVisibilityToggle.return;
          needsVisibilityToggle = needsVisibilityToggle.sibling;
        }
      else if (supportsPersistence)
        for (var node$85 = workInProgress.child; node$85 !== null;) {
          if (node$85.tag === 5) {
            var instance = node$85.stateNode;
            if (needsVisibilityToggle && isHidden)
              instance = cloneHiddenInstance(instance, node$85.type, node$85.memoizedProps);
            appendInitialChild(parent, instance);
          } else if (node$85.tag === 6) {
            instance = node$85.stateNode;
            if (needsVisibilityToggle && isHidden)
              instance = cloneHiddenTextInstance(instance, node$85.memoizedProps);
            appendInitialChild(parent, instance);
          } else if (node$85.tag !== 4) {
            if (node$85.tag === 22 && node$85.memoizedState !== null) {
              instance = node$85.child;
              if (instance !== null) instance.return = node$85;
              appendAllChildren(parent, node$85, true, true);
            } else if (node$85.child !== null) {
              node$85.child.return = node$85;
              node$85 = node$85.child;
              continue;
            }
          }
          if (node$85 === workInProgress) break;
          for (; node$85.sibling === null;) {
            if (node$85.return === null || node$85.return === workInProgress) return;
            node$85 = node$85.return;
          }
          node$85.sibling.return = node$85.return;
          node$85 = node$85.sibling;
        }
    }
    function appendAllChildrenToContainer(
      containerChildSet,
      workInProgress,
      needsVisibilityToggle,
      isHidden,
    ) {
      var hasOffscreenComponentChild = false;
      if (supportsPersistence)
        for (var node = workInProgress.child; node !== null;) {
          if (node.tag === 5) {
            var instance = node.stateNode;
            if (needsVisibilityToggle && isHidden)
              instance = cloneHiddenInstance(instance, node.type, node.memoizedProps);
            appendChildToContainerChildSet(containerChildSet, instance);
          } else if (node.tag === 6) {
            instance = node.stateNode;
            if (needsVisibilityToggle && isHidden)
              instance = cloneHiddenTextInstance(instance, node.memoizedProps);
            appendChildToContainerChildSet(containerChildSet, instance);
          } else if (node.tag !== 4) {
            if (node.tag === 22 && node.memoizedState !== null) {
              hasOffscreenComponentChild = node.child;
              if (hasOffscreenComponentChild !== null) hasOffscreenComponentChild.return = node;
              appendAllChildrenToContainer(containerChildSet, node, true, true);
              hasOffscreenComponentChild = true;
            } else if (node.child !== null) {
              node.child.return = node;
              node = node.child;
              continue;
            }
          }
          if (node === workInProgress) break;
          for (; node.sibling === null;) {
            if (node.return === null || node.return === workInProgress) return hasOffscreenComponentChild;
            node = node.return;
          }
          node.sibling.return = node.return;
          node = node.sibling;
        }
      return hasOffscreenComponentChild;
    }
    function updateHostContainer(current, workInProgress) {
      if (supportsPersistence && doesRequireClone(current, workInProgress)) {
        current = workInProgress.stateNode;
        var container = current.containerInfo;
        var newChildSet = createContainerChildSet();
        appendAllChildrenToContainer(newChildSet, workInProgress, false, false);
        current.pendingChildren = newChildSet;
        markUpdate(workInProgress);
        finalizeContainerChildren(container, newChildSet);
      }
    }
    function updateHostComponent(current, workInProgress, type, newProps) {
      if (supportsMutation) {
        if (current.memoizedProps !== newProps) markUpdate(workInProgress);
      } else if (supportsPersistence) {
        var currentInstance = current.stateNode;
        var oldProps$88 = current.memoizedProps;
        if ((current = doesRequireClone(current, workInProgress)) || oldProps$88 !== newProps) {
          var currentHostContext = contextStackCursor.current;
          oldProps$88 = cloneInstance(currentInstance, type, oldProps$88, newProps, !current, null);
          if (oldProps$88 === currentInstance) workInProgress.stateNode = currentInstance;
          else {
            markCloned(workInProgress);
            if (finalizeInitialChildren(oldProps$88, type, newProps, currentHostContext))
              markUpdate(workInProgress);
            workInProgress.stateNode = oldProps$88;
            if (current) appendAllChildren(oldProps$88, workInProgress, false, false);
          }
        } else workInProgress.stateNode = currentInstance;
      }
    }
    function preloadInstanceAndSuspendIfNeeded(workInProgress, type, oldProps, newProps, renderLanes) {
      if (
        (workInProgress.mode & 32) !== 0 &&
        (oldProps === null
          ? maySuspendCommit(type, newProps)
          : maySuspendCommitOnUpdate(type, oldProps, newProps))
      ) {
        workInProgress.flags |= 16777216;
        if ((renderLanes & 335544128) === renderLanes || maySuspendCommitInSyncRender(type, newProps))
          if (preloadInstance(workInProgress.stateNode, type, newProps)) workInProgress.flags |= 8192;
          else if (shouldRemainOnPreviousScreen()) workInProgress.flags |= 8192;
          else {
            suspendedThenable = noopSuspenseyCommitThenable;
            throw SuspenseyCommitException;
          }
      } else workInProgress.flags &= -16777217;
    }
    function preloadResourceAndSuspendIfNeeded(workInProgress, resource) {
      if (mayResourceSuspendCommit(resource)) {
        workInProgress.flags |= 16777216;
        if (!preloadResource(resource))
          if (shouldRemainOnPreviousScreen()) workInProgress.flags |= 8192;
          else {
            suspendedThenable = noopSuspenseyCommitThenable;
            throw SuspenseyCommitException;
          }
      } else workInProgress.flags &= -16777217;
    }
    function scheduleRetryEffect(workInProgress, retryQueue) {
      if (retryQueue !== null) workInProgress.flags |= 4;
      if (workInProgress.flags & 16384) {
        retryQueue = workInProgress.tag !== 22 ? claimNextRetryLane() : 536870912;
        workInProgress.lanes |= retryQueue;
        workInProgressSuspendedRetryLanes |= retryQueue;
      }
    }
    function cutOffTailIfNeeded(renderState, hasRenderedATailFallback) {
      if (!isHydrating)
        switch (renderState.tailMode) {
          case "hidden":
            hasRenderedATailFallback = renderState.tail;
            for (var lastTailNode = null; hasRenderedATailFallback !== null;) {
              if (hasRenderedATailFallback.alternate !== null) lastTailNode = hasRenderedATailFallback;
              hasRenderedATailFallback = hasRenderedATailFallback.sibling;
            }
            if (lastTailNode === null) renderState.tail = null;
            else lastTailNode.sibling = null;
            break;
          case "collapsed":
            lastTailNode = renderState.tail;
            for (var lastTailNode$90 = null; lastTailNode !== null;) {
              if (lastTailNode.alternate !== null) lastTailNode$90 = lastTailNode;
              lastTailNode = lastTailNode.sibling;
            }
            if (lastTailNode$90 === null) {
              if (hasRenderedATailFallback || renderState.tail === null) renderState.tail = null;
              else renderState.tail.sibling = null;
            } else lastTailNode$90.sibling = null;
        }
    }
    function bubbleProperties(completedWork) {
      var didBailout =
        completedWork.alternate !== null && completedWork.alternate.child === completedWork.child;
      var newChildLanes = 0;
      var subtreeFlags = 0;
      if (didBailout)
        for (var child$91 = completedWork.child; child$91 !== null;) {
          newChildLanes |= child$91.lanes | child$91.childLanes;
          subtreeFlags |= child$91.subtreeFlags & 65011712;
          subtreeFlags |= child$91.flags & 65011712;
          child$91.return = completedWork;
          child$91 = child$91.sibling;
        }
      else
        for (child$91 = completedWork.child; child$91 !== null;) {
          newChildLanes |= child$91.lanes | child$91.childLanes;
          subtreeFlags |= child$91.subtreeFlags;
          subtreeFlags |= child$91.flags;
          child$91.return = completedWork;
          child$91 = child$91.sibling;
        }
      completedWork.subtreeFlags |= subtreeFlags;
      completedWork.childLanes = newChildLanes;
      return didBailout;
    }
    function completeWork(current, workInProgress, renderLanes) {
      var newProps = workInProgress.pendingProps;
      switch ((popTreeContext(workInProgress), workInProgress.tag)) {
        case 16:
        case 15:
        case 0:
        case 11:
        case 7:
        case 8:
        case 12:
        case 9:
        case 14:
          bubbleProperties(workInProgress);
          return null;
        case 1:
          bubbleProperties(workInProgress);
          return null;
        case 3:
          renderLanes = workInProgress.stateNode;
          newProps = null;
          if (current !== null) newProps = current.memoizedState.cache;
          if (workInProgress.memoizedState.cache !== newProps) workInProgress.flags |= 2048;
          popProvider(CacheContext);
          popHostContainer();
          if (renderLanes.pendingContext) {
            renderLanes.context = renderLanes.pendingContext;
            renderLanes.pendingContext = null;
          }
          if (current === null || current.child === null) {
            if (popHydrationState(workInProgress)) markUpdate(workInProgress);
            else if (!(
              current === null ||
              (current.memoizedState.isDehydrated && (workInProgress.flags & 256) === 0)
            )) {
              workInProgress.flags |= 1024;
              upgradeHydrationErrorsToRecoverable();
            }
          }
          updateHostContainer(current, workInProgress);
          bubbleProperties(workInProgress);
          return null;
        case 26:
          if (supportsResources) {
            var { type, memoizedState: nextResource } = workInProgress;
            if (current === null) {
              markUpdate(workInProgress);
              if (nextResource !== null) {
                bubbleProperties(workInProgress);
                preloadResourceAndSuspendIfNeeded(workInProgress, nextResource);
              } else {
                bubbleProperties(workInProgress);
                preloadInstanceAndSuspendIfNeeded(workInProgress, type, null, newProps, renderLanes);
              }
            } else if (nextResource) {
              if (nextResource !== current.memoizedState) {
                markUpdate(workInProgress);
                bubbleProperties(workInProgress);
                preloadResourceAndSuspendIfNeeded(workInProgress, nextResource);
              } else {
                bubbleProperties(workInProgress);
                workInProgress.flags &= -16777217;
              }
            } else {
              nextResource = current.memoizedProps;
              if (supportsMutation) {
                if (nextResource !== newProps) markUpdate(workInProgress);
              } else updateHostComponent(current, workInProgress, type, newProps);
              bubbleProperties(workInProgress);
              preloadInstanceAndSuspendIfNeeded(workInProgress, type, nextResource, newProps, renderLanes);
            }
            return null;
          }
        case 27:
          if (supportsSingletons) {
            popHostContext(workInProgress);
            renderLanes = rootInstanceStackCursor.current;
            type = workInProgress.type;
            if (current !== null && workInProgress.stateNode != null) {
              if (supportsMutation) {
                if (current.memoizedProps !== newProps) markUpdate(workInProgress);
              } else updateHostComponent(current, workInProgress, type, newProps);
            } else {
              if (!newProps) {
                if (workInProgress.stateNode === null) throw Error(formatProdErrorMessage(166));
                bubbleProperties(workInProgress);
                return null;
              }
              current = contextStackCursor.current;
              if (popHydrationState(workInProgress)) prepareToHydrateHostInstance(workInProgress, current);
              else {
                current = resolveSingletonInstance(type, newProps, renderLanes, current, true);
                workInProgress.stateNode = current;
                markUpdate(workInProgress);
              }
            }
            bubbleProperties(workInProgress);
            return null;
          }
        case 5:
          popHostContext(workInProgress);
          type = workInProgress.type;
          if (current !== null && workInProgress.stateNode != null)
            updateHostComponent(current, workInProgress, type, newProps);
          else {
            if (!newProps) {
              if (workInProgress.stateNode === null) throw Error(formatProdErrorMessage(166));
              bubbleProperties(workInProgress);
              return null;
            }
            nextResource = contextStackCursor.current;
            if (popHydrationState(workInProgress)) {
              prepareToHydrateHostInstance(workInProgress, nextResource);
              if (finalizeHydratedChildren(workInProgress.stateNode, type, newProps, nextResource))
                workInProgress.flags |= 64;
            } else {
              var instance$101 = createInstance(
                type,
                newProps,
                rootInstanceStackCursor.current,
                nextResource,
                workInProgress,
              );
              markCloned(workInProgress);
              appendAllChildren(instance$101, workInProgress, false, false);
              workInProgress.stateNode = instance$101;
              if (finalizeInitialChildren(instance$101, type, newProps, nextResource))
                markUpdate(workInProgress);
            }
          }
          bubbleProperties(workInProgress);
          preloadInstanceAndSuspendIfNeeded(
            workInProgress,
            workInProgress.type,
            current === null ? null : current.memoizedProps,
            workInProgress.pendingProps,
            renderLanes,
          );
          return null;
        case 6:
          if (current && workInProgress.stateNode != null) {
            renderLanes = current.memoizedProps;
            if (supportsMutation) {
              if (renderLanes !== newProps) markUpdate(workInProgress);
            } else if (supportsPersistence) {
              if (renderLanes !== newProps) {
                current = rootInstanceStackCursor.current;
                renderLanes = contextStackCursor.current;
                markCloned(workInProgress);
                workInProgress.stateNode = createTextInstance(newProps, current, renderLanes, workInProgress);
              } else workInProgress.stateNode = current.stateNode;
            }
          } else {
            if (typeof newProps !== "string" && workInProgress.stateNode === null)
              throw Error(formatProdErrorMessage(166));
            current = rootInstanceStackCursor.current;
            renderLanes = contextStackCursor.current;
            if (popHydrationState(workInProgress)) {
              if (!supportsHydration) throw Error(formatProdErrorMessage(176));
              current = workInProgress.stateNode;
              renderLanes = workInProgress.memoizedProps;
              newProps = null;
              type = hydrationParentFiber;
              if (type !== null)
                switch (type.tag) {
                  case 27:
                  case 5:
                    newProps = type.memoizedProps;
                }
              if (!hydrateTextInstance(current, renderLanes, workInProgress, newProps))
                throwOnHydrationMismatch(workInProgress, true);
            } else {
              markCloned(workInProgress);
              workInProgress.stateNode = createTextInstance(newProps, current, renderLanes, workInProgress);
            }
          }
          bubbleProperties(workInProgress);
          return null;
        case 31:
          renderLanes = workInProgress.memoizedState;
          if (current === null || current.memoizedState !== null) {
            newProps = popHydrationState(workInProgress);
            if (renderLanes !== null) {
              if (current === null) {
                if (!newProps) throw Error(formatProdErrorMessage(318));
                if (!supportsHydration) throw Error(formatProdErrorMessage(556));
                current = workInProgress.memoizedState;
                current = current !== null ? current.dehydrated : null;
                if (!current) throw Error(formatProdErrorMessage(557));
                hydrateActivityInstance(current, workInProgress);
              } else {
                resetHydrationState();
                if ((workInProgress.flags & 128) === 0) workInProgress.memoizedState = null;
                workInProgress.flags |= 4;
              }
              bubbleProperties(workInProgress);
              current = false;
            } else {
              renderLanes = upgradeHydrationErrorsToRecoverable();
              if (current !== null && current.memoizedState !== null)
                current.memoizedState.hydrationErrors = renderLanes;
              current = true;
            }
            if (!current) {
              if (workInProgress.flags & 256) {
                popSuspenseHandler(workInProgress);
                return workInProgress;
              }
              popSuspenseHandler(workInProgress);
              return null;
            }
            if ((workInProgress.flags & 128) !== 0) throw Error(formatProdErrorMessage(558));
          }
          bubbleProperties(workInProgress);
          return null;
        case 13:
          newProps = workInProgress.memoizedState;
          if (
            current === null ||
            (current.memoizedState !== null && current.memoizedState.dehydrated !== null)
          ) {
            type = popHydrationState(workInProgress);
            if (newProps !== null && newProps.dehydrated !== null) {
              if (current === null) {
                if (!type) throw Error(formatProdErrorMessage(318));
                if (!supportsHydration) throw Error(formatProdErrorMessage(344));
                type = workInProgress.memoizedState;
                type = type !== null ? type.dehydrated : null;
                if (!type) throw Error(formatProdErrorMessage(317));
                hydrateSuspenseInstance(type, workInProgress);
              } else {
                resetHydrationState();
                if ((workInProgress.flags & 128) === 0) workInProgress.memoizedState = null;
                workInProgress.flags |= 4;
              }
              bubbleProperties(workInProgress);
              type = false;
            } else {
              type = upgradeHydrationErrorsToRecoverable();
              if (current !== null && current.memoizedState !== null)
                current.memoizedState.hydrationErrors = type;
              type = true;
            }
            if (!type) {
              if (workInProgress.flags & 256) {
                popSuspenseHandler(workInProgress);
                return workInProgress;
              }
              popSuspenseHandler(workInProgress);
              return null;
            }
          }
          popSuspenseHandler(workInProgress);
          if ((workInProgress.flags & 128) !== 0) {
            workInProgress.lanes = renderLanes;
            return workInProgress;
          }
          renderLanes = newProps !== null;
          current = current !== null && current.memoizedState !== null;
          if (renderLanes) {
            newProps = workInProgress.child;
            type = null;
            if (
              newProps.alternate !== null &&
              newProps.alternate.memoizedState !== null &&
              newProps.alternate.memoizedState.cachePool !== null
            )
              type = newProps.alternate.memoizedState.cachePool.pool;
            nextResource = null;
            if (newProps.memoizedState !== null && newProps.memoizedState.cachePool !== null)
              nextResource = newProps.memoizedState.cachePool.pool;
            if (nextResource !== type) newProps.flags |= 2048;
          }
          if (renderLanes !== current && renderLanes) workInProgress.child.flags |= 8192;
          scheduleRetryEffect(workInProgress, workInProgress.updateQueue);
          bubbleProperties(workInProgress);
          return null;
        case 4:
          popHostContainer();
          updateHostContainer(current, workInProgress);
          if (current === null) preparePortalMount(workInProgress.stateNode.containerInfo);
          bubbleProperties(workInProgress);
          return null;
        case 10:
          popProvider(workInProgress.type);
          bubbleProperties(workInProgress);
          return null;
        case 19:
          pop(suspenseStackCursor);
          newProps = workInProgress.memoizedState;
          if (newProps === null) {
            bubbleProperties(workInProgress);
            return null;
          }
          type = (workInProgress.flags & 128) !== 0;
          nextResource = newProps.rendering;
          if (nextResource === null) {
            if (type) cutOffTailIfNeeded(newProps, false);
            else {
              if (workInProgressRootExitStatus !== 0 || (current !== null && (current.flags & 128) !== 0))
                for (current = workInProgress.child; current !== null;) {
                  nextResource = findFirstSuspended(current);
                  if (nextResource !== null) {
                    workInProgress.flags |= 128;
                    cutOffTailIfNeeded(newProps, false);
                    current = nextResource.updateQueue;
                    workInProgress.updateQueue = current;
                    scheduleRetryEffect(workInProgress, current);
                    workInProgress.subtreeFlags = 0;
                    current = renderLanes;
                    for (renderLanes = workInProgress.child; renderLanes !== null;) {
                      resetWorkInProgress(renderLanes, current);
                      renderLanes = renderLanes.sibling;
                    }
                    push(suspenseStackCursor, (suspenseStackCursor.current & 1) | 2);
                    if (isHydrating) pushTreeFork(workInProgress, newProps.treeForkCount);
                    return workInProgress.child;
                  }
                  current = current.sibling;
                }
              if (newProps.tail !== null && now() > workInProgressRootRenderTargetTime) {
                workInProgress.flags |= 128;
                type = true;
                cutOffTailIfNeeded(newProps, false);
                workInProgress.lanes = 4194304;
              }
            }
          } else {
            if (!type) {
              current = findFirstSuspended(nextResource);
              if (current !== null) {
                workInProgress.flags |= 128;
                type = true;
                current = current.updateQueue;
                workInProgress.updateQueue = current;
                scheduleRetryEffect(workInProgress, current);
                cutOffTailIfNeeded(newProps, true);
                if (
                  newProps.tail === null &&
                  newProps.tailMode === "hidden" &&
                  !nextResource.alternate &&
                  !isHydrating
                ) {
                  bubbleProperties(workInProgress);
                  return null;
                }
              } else if (
                2 * now() - newProps.renderingStartTime > workInProgressRootRenderTargetTime &&
                renderLanes !== 536870912
              ) {
                workInProgress.flags |= 128;
                type = true;
                cutOffTailIfNeeded(newProps, false);
                workInProgress.lanes = 4194304;
              }
            }
            if (newProps.isBackwards) {
              nextResource.sibling = workInProgress.child;
              workInProgress.child = nextResource;
            } else {
              current = newProps.last;
              if (current !== null) current.sibling = nextResource;
              else workInProgress.child = nextResource;
              newProps.last = nextResource;
            }
          }
          if (newProps.tail !== null) {
            current = newProps.tail;
            newProps.rendering = current;
            newProps.tail = current.sibling;
            newProps.renderingStartTime = now();
            current.sibling = null;
            renderLanes = suspenseStackCursor.current;
            push(suspenseStackCursor, type ? (renderLanes & 1) | 2 : renderLanes & 1);
            if (isHydrating) pushTreeFork(workInProgress, newProps.treeForkCount);
            return current;
          }
          bubbleProperties(workInProgress);
          return null;
        case 22:
        case 23:
          popSuspenseHandler(workInProgress);
          popHiddenContext();
          newProps = workInProgress.memoizedState !== null;
          if (current !== null) {
            if ((current.memoizedState !== null) !== newProps) workInProgress.flags |= 8192;
          } else if (newProps) workInProgress.flags |= 8192;
          if (newProps) {
            if ((renderLanes & 536870912) !== 0 && (workInProgress.flags & 128) === 0) {
              bubbleProperties(workInProgress);
              if (workInProgress.subtreeFlags & 6) workInProgress.flags |= 8192;
            }
          } else bubbleProperties(workInProgress);
          renderLanes = workInProgress.updateQueue;
          if (renderLanes !== null) scheduleRetryEffect(workInProgress, renderLanes.retryQueue);
          renderLanes = null;
          if (current !== null && current.memoizedState !== null && current.memoizedState.cachePool !== null)
            renderLanes = current.memoizedState.cachePool.pool;
          newProps = null;
          if (workInProgress.memoizedState !== null && workInProgress.memoizedState.cachePool !== null)
            newProps = workInProgress.memoizedState.cachePool.pool;
          if (newProps !== renderLanes) workInProgress.flags |= 2048;
          if (current !== null) pop(resumedCache);
          return null;
        case 24:
          renderLanes = null;
          if (current !== null) renderLanes = current.memoizedState.cache;
          if (workInProgress.memoizedState.cache !== renderLanes) workInProgress.flags |= 2048;
          popProvider(CacheContext);
          bubbleProperties(workInProgress);
          return null;
        case 25:
          return null;
        case 30:
          return null;
      }
      throw Error(formatProdErrorMessage(156, workInProgress.tag));
    }
    function unwindWork(current, workInProgress) {
      switch ((popTreeContext(workInProgress), workInProgress.tag)) {
        case 1:
          current = workInProgress.flags;
          return current & 65536 ? ((workInProgress.flags = (current & -65537) | 128), workInProgress) : null;
        case 3:
          popProvider(CacheContext);
          popHostContainer();
          current = workInProgress.flags;
          return (current & 65536) !== 0 && (current & 128) === 0
            ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
            : null;
        case 26:
        case 27:
        case 5:
          popHostContext(workInProgress);
          return null;
        case 31:
          if (workInProgress.memoizedState !== null) {
            popSuspenseHandler(workInProgress);
            if (workInProgress.alternate === null) throw Error(formatProdErrorMessage(340));
            resetHydrationState();
          }
          current = workInProgress.flags;
          return current & 65536 ? ((workInProgress.flags = (current & -65537) | 128), workInProgress) : null;
        case 13:
          popSuspenseHandler(workInProgress);
          current = workInProgress.memoizedState;
          if (current !== null && current.dehydrated !== null) {
            if (workInProgress.alternate === null) throw Error(formatProdErrorMessage(340));
            resetHydrationState();
          }
          current = workInProgress.flags;
          return current & 65536 ? ((workInProgress.flags = (current & -65537) | 128), workInProgress) : null;
        case 19:
          pop(suspenseStackCursor);
          return null;
        case 4:
          popHostContainer();
          return null;
        case 10:
          popProvider(workInProgress.type);
          return null;
        case 22:
        case 23:
          popSuspenseHandler(workInProgress);
          popHiddenContext();
          if (current !== null) pop(resumedCache);
          current = workInProgress.flags;
          return current & 65536 ? ((workInProgress.flags = (current & -65537) | 128), workInProgress) : null;
        case 24:
          popProvider(CacheContext);
          return null;
        case 25:
          return null;
        default:
          return null;
      }
    }
    function unwindInterruptedWork(current, interruptedWork) {
      switch ((popTreeContext(interruptedWork), interruptedWork.tag)) {
        case 3:
          popProvider(CacheContext);
          popHostContainer();
          break;
        case 26:
        case 27:
        case 5:
          popHostContext(interruptedWork);
          break;
        case 4:
          popHostContainer();
          break;
        case 31:
          if (interruptedWork.memoizedState !== null) popSuspenseHandler(interruptedWork);
          break;
        case 13:
          popSuspenseHandler(interruptedWork);
          break;
        case 19:
          pop(suspenseStackCursor);
          break;
        case 10:
          popProvider(interruptedWork.type);
          break;
        case 22:
        case 23:
          popSuspenseHandler(interruptedWork);
          popHiddenContext();
          if (current !== null) pop(resumedCache);
          break;
        case 24:
          popProvider(CacheContext);
      }
    }
    function commitHookEffectListMount(flags, finishedWork) {
      try {
        var updateQueue = finishedWork.updateQueue;
        var lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
        if (lastEffect !== null) {
          var firstEffect = lastEffect.next;
          updateQueue = firstEffect;
          do {
            if ((updateQueue.tag & flags) === flags) {
              lastEffect = undefined;
              var create = updateQueue.create;
              var inst = updateQueue.inst;
              lastEffect = create();
              inst.destroy = lastEffect;
            }
            updateQueue = updateQueue.next;
          } while (updateQueue !== firstEffect);
        }
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
    function commitHookEffectListUnmount(flags, finishedWork, nearestMountedAncestor$jscomp$0) {
      try {
        var updateQueue = finishedWork.updateQueue;
        var lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
        if (lastEffect !== null) {
          var firstEffect = lastEffect.next;
          updateQueue = firstEffect;
          do {
            if ((updateQueue.tag & flags) === flags) {
              var inst = updateQueue.inst;
              var destroy = inst.destroy;
              if (destroy !== undefined) {
                inst.destroy = undefined;
                lastEffect = finishedWork;
                var nearestMountedAncestor = nearestMountedAncestor$jscomp$0;
                var destroy_ = destroy;
                try {
                  destroy_();
                } catch (error) {
                  captureCommitPhaseError(lastEffect, nearestMountedAncestor, error);
                }
              }
            }
            updateQueue = updateQueue.next;
          } while (updateQueue !== firstEffect);
        }
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
    function commitClassCallbacks(finishedWork) {
      var updateQueue = finishedWork.updateQueue;
      if (updateQueue !== null) {
        var stateNode = finishedWork.stateNode;
        try {
          commitCallbacks(updateQueue, stateNode);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
    }
    function safelyCallComponentWillUnmount(current, nearestMountedAncestor, instance) {
      instance.props = resolveClassComponentProps(current.type, current.memoizedProps);
      instance.state = current.memoizedState;
      try {
        instance.componentWillUnmount();
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      }
    }
    function safelyAttachRef(current, nearestMountedAncestor) {
      try {
        var ref = current.ref;
        if (ref !== null) {
          switch (current.tag) {
            case 26:
            case 27:
            case 5:
              var instanceToUse = getPublicInstance(current.stateNode);
              break;
            case 30:
              instanceToUse = current.stateNode;
              break;
            default:
              instanceToUse = current.stateNode;
          }
          if (typeof ref === "function") current.refCleanup = ref(instanceToUse);
          else ref.current = instanceToUse;
        }
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      }
    }
    function safelyDetachRef(current, nearestMountedAncestor) {
      var ref = current.ref;
      var refCleanup = current.refCleanup;
      if (ref !== null)
        if (typeof refCleanup === "function")
          try {
            refCleanup();
          } catch (error) {
            captureCommitPhaseError(current, nearestMountedAncestor, error);
          } finally {
            current.refCleanup = null;
            current = current.alternate;
            if (current != null) current.refCleanup = null;
          }
        else if (typeof ref === "function")
          try {
            ref(null);
          } catch (error$124) {
            captureCommitPhaseError(current, nearestMountedAncestor, error$124);
          }
        else ref.current = null;
    }
    function commitHostMount(finishedWork) {
      var { type, memoizedProps, stateNode } = finishedWork;
      try {
        commitMount(stateNode, type, memoizedProps, finishedWork);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
    function commitHostUpdate(finishedWork, newProps, oldProps) {
      try {
        commitUpdate(finishedWork.stateNode, finishedWork.type, oldProps, newProps, finishedWork);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
    function isHostParent(fiber) {
      return (
        fiber.tag === 5 ||
        fiber.tag === 3 ||
        (supportsResources ? fiber.tag === 26 : false) ||
        (supportsSingletons ? fiber.tag === 27 && isSingletonScope(fiber.type) : false) ||
        fiber.tag === 4
      );
    }
    function getHostSibling(fiber) {
      e: for (;;) {
        for (; fiber.sibling === null;) {
          if (fiber.return === null || isHostParent(fiber.return)) return null;
          fiber = fiber.return;
        }
        fiber.sibling.return = fiber.return;
        for (fiber = fiber.sibling; fiber.tag !== 5 && fiber.tag !== 6 && fiber.tag !== 18;) {
          if (supportsSingletons && fiber.tag === 27 && isSingletonScope(fiber.type)) continue e;
          if (fiber.flags & 2) continue e;
          if (fiber.child === null || fiber.tag === 4) continue e;
          else {
            fiber.child.return = fiber;
            fiber = fiber.child;
          }
        }
        if (!(fiber.flags & 2)) return fiber.stateNode;
      }
    }
    function insertOrAppendPlacementNodeIntoContainer(node, before, parent) {
      var tag = node.tag;
      if (tag === 5 || tag === 6) {
        node = node.stateNode;
        if (before) insertInContainerBefore(parent, node, before);
        else appendChildToContainer(parent, node);
      } else if (
        tag !== 4 &&
        (supportsSingletons &&
          tag === 27 &&
          isSingletonScope(node.type) &&
          ((parent = node.stateNode), (before = null)),
        (node = node.child),
        node !== null)
      )
        for (
          insertOrAppendPlacementNodeIntoContainer(node, before, parent), node = node.sibling;
          node !== null;
        ) {
          insertOrAppendPlacementNodeIntoContainer(node, before, parent);
          node = node.sibling;
        }
    }
    function insertOrAppendPlacementNode(node, before, parent) {
      var tag = node.tag;
      if (tag === 5 || tag === 6) {
        node = node.stateNode;
        if (before) insertBefore(parent, node, before);
        else appendChild(parent, node);
      } else if (
        tag !== 4 &&
        (supportsSingletons && tag === 27 && isSingletonScope(node.type) && (parent = node.stateNode),
        (node = node.child),
        node !== null)
      )
        for (insertOrAppendPlacementNode(node, before, parent), node = node.sibling; node !== null;) {
          insertOrAppendPlacementNode(node, before, parent);
          node = node.sibling;
        }
    }
    function commitHostPortalContainerChildren(portal, finishedWork, pendingChildren) {
      portal = portal.containerInfo;
      try {
        replaceContainerChildren(portal, pendingChildren);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
    function commitHostSingletonAcquisition(finishedWork) {
      var { stateNode, memoizedProps } = finishedWork;
      try {
        acquireSingletonInstance(finishedWork.type, memoizedProps, stateNode, finishedWork);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
    function commitBeforeMutationEffects(root, firstChild) {
      prepareForCommit(root.containerInfo);
      for (nextEffect = firstChild; nextEffect !== null;) {
        root = nextEffect;
        firstChild = root.child;
        if ((root.subtreeFlags & 1028) !== 0 && firstChild !== null) {
          firstChild.return = root;
          nextEffect = firstChild;
        } else
          for (; nextEffect !== null;) {
            root = nextEffect;
            var current = root.alternate;
            switch (((firstChild = root.flags), root.tag)) {
              case 0:
              case 11:
              case 15:
                if (
                  (firstChild & 4) !== 0 &&
                  ((firstChild = root.updateQueue),
                  (firstChild = firstChild !== null ? firstChild.events : null),
                  firstChild !== null)
                )
                  for (var ii = 0; ii < firstChild.length; ii++) {
                    var _eventPayloads$ii = firstChild[ii];
                    _eventPayloads$ii.ref.impl = _eventPayloads$ii.nextImpl;
                  }
                break;
              case 1:
                if ((firstChild & 1024) !== 0 && current !== null) {
                  firstChild = undefined;
                  ii = root;
                  _eventPayloads$ii = current.memoizedProps;
                  current = current.memoizedState;
                  var instance = ii.stateNode;
                  try {
                    var resolvedPrevProps = resolveClassComponentProps(ii.type, _eventPayloads$ii);
                    firstChild = instance.getSnapshotBeforeUpdate(resolvedPrevProps, current);
                    instance.__reactInternalSnapshotBeforeUpdate = firstChild;
                  } catch (error) {
                    captureCommitPhaseError(ii, ii.return, error);
                  }
                }
                break;
              case 3:
                if ((firstChild & 1024) !== 0 && supportsMutation)
                  clearContainer(root.stateNode.containerInfo);
                break;
              case 5:
              case 26:
              case 27:
              case 6:
              case 4:
              case 17:
                break;
              default:
                if ((firstChild & 1024) !== 0) throw Error(formatProdErrorMessage(163));
            }
            firstChild = root.sibling;
            if (firstChild !== null) {
              firstChild.return = root.return;
              nextEffect = firstChild;
              break;
            }
            nextEffect = root.return;
          }
      }
    }
    function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork) {
      var flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          if (flags & 4) commitHookEffectListMount(5, finishedWork);
          break;
        case 1:
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          if (flags & 4) {
            finishedRoot = finishedWork.stateNode;
            if (current === null)
              try {
                finishedRoot.componentDidMount();
              } catch (error) {
                captureCommitPhaseError(finishedWork, finishedWork.return, error);
              }
            else {
              var prevProps = resolveClassComponentProps(finishedWork.type, current.memoizedProps);
              current = current.memoizedState;
              try {
                finishedRoot.componentDidUpdate(
                  prevProps,
                  current,
                  finishedRoot.__reactInternalSnapshotBeforeUpdate,
                );
              } catch (error$123) {
                captureCommitPhaseError(finishedWork, finishedWork.return, error$123);
              }
            }
          }
          if (flags & 64) commitClassCallbacks(finishedWork);
          if (flags & 512) safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 3:
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          if (flags & 64 && ((flags = finishedWork.updateQueue), flags !== null)) {
            finishedRoot = null;
            if (finishedWork.child !== null)
              switch (finishedWork.child.tag) {
                case 27:
                case 5:
                  finishedRoot = getPublicInstance(finishedWork.child.stateNode);
                  break;
                case 1:
                  finishedRoot = finishedWork.child.stateNode;
              }
            try {
              commitCallbacks(flags, finishedRoot);
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          }
          break;
        case 27:
          if (supportsSingletons && current === null && flags & 4)
            commitHostSingletonAcquisition(finishedWork);
        case 26:
        case 5:
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          if (current === null) {
            if (flags & 4) commitHostMount(finishedWork);
            else if (flags & 64) {
              finishedRoot = finishedWork.type;
              current = finishedWork.memoizedProps;
              prevProps = finishedWork.stateNode;
              try {
                commitHydratedInstance(prevProps, finishedRoot, current, finishedWork);
              } catch (error) {
                captureCommitPhaseError(finishedWork, finishedWork.return, error);
              }
            }
          }
          if (flags & 512) safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 12:
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          break;
        case 31:
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          if (flags & 4) commitActivityHydrationCallbacks(finishedRoot, finishedWork);
          break;
        case 13:
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          if (flags & 4) commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
          if (flags & 64) {
            flags = finishedWork.memoizedState;
            if (flags !== null) {
              flags = flags.dehydrated;
              if (flags !== null) {
                finishedWork = retryDehydratedSuspenseBoundary.bind(null, finishedWork);
                registerSuspenseInstanceRetry(flags, finishedWork);
              }
            }
          }
          break;
        case 22:
          flags = finishedWork.memoizedState !== null || offscreenSubtreeIsHidden;
          if (!flags) {
            current = (current !== null && current.memoizedState !== null) || offscreenSubtreeWasHidden;
            prevProps = offscreenSubtreeIsHidden;
            var prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
            offscreenSubtreeIsHidden = flags;
            if ((offscreenSubtreeWasHidden = current) && !prevOffscreenSubtreeWasHidden)
              recursivelyTraverseReappearLayoutEffects(
                finishedRoot,
                finishedWork,
                (finishedWork.subtreeFlags & 8772) !== 0,
              );
            else recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
            offscreenSubtreeIsHidden = prevProps;
            offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
          }
          break;
        case 30:
          break;
        default:
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      }
    }
    function detachFiberAfterEffects(fiber) {
      var alternate = fiber.alternate;
      if (alternate !== null) {
        fiber.alternate = null;
        detachFiberAfterEffects(alternate);
      }
      fiber.child = null;
      fiber.deletions = null;
      fiber.sibling = null;
      if (fiber.tag === 5) {
        alternate = fiber.stateNode;
        if (alternate !== null) detachDeletedInstance(alternate);
      }
      fiber.stateNode = null;
      fiber.return = null;
      fiber.dependencies = null;
      fiber.memoizedProps = null;
      fiber.memoizedState = null;
      fiber.pendingProps = null;
      fiber.stateNode = null;
      fiber.updateQueue = null;
    }
    function recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, parent) {
      for (parent = parent.child; parent !== null;) {
        commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, parent);
        parent = parent.sibling;
      }
    }
    function commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, deletedFiber) {
      if (injectedHook && typeof injectedHook.onCommitFiberUnmount === "function")
        try {
          injectedHook.onCommitFiberUnmount(rendererID, deletedFiber);
        } catch (err) {}
      switch (deletedFiber.tag) {
        case 26:
          if (supportsResources) {
            if (!offscreenSubtreeWasHidden) safelyDetachRef(deletedFiber, nearestMountedAncestor);
            recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
            if (deletedFiber.memoizedState) releaseResource(deletedFiber.memoizedState);
            else if (deletedFiber.stateNode) unmountHoistable(deletedFiber.stateNode);
            break;
          }
        case 27:
          if (supportsSingletons) {
            if (!offscreenSubtreeWasHidden) safelyDetachRef(deletedFiber, nearestMountedAncestor);
            var prevHostParent = hostParent;
            var prevHostParentIsContainer = hostParentIsContainer;
            if (isSingletonScope(deletedFiber.type)) {
              hostParent = deletedFiber.stateNode;
              hostParentIsContainer = false;
            }
            recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
            releaseSingletonInstance(deletedFiber.stateNode);
            hostParent = prevHostParent;
            hostParentIsContainer = prevHostParentIsContainer;
            break;
          }
        case 5:
          if (!offscreenSubtreeWasHidden) safelyDetachRef(deletedFiber, nearestMountedAncestor);
        case 6:
          if (supportsMutation) {
            prevHostParent = hostParent;
            prevHostParentIsContainer = hostParentIsContainer;
            hostParent = null;
            recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
            hostParent = prevHostParent;
            hostParentIsContainer = prevHostParentIsContainer;
            if (hostParent !== null)
              if (hostParentIsContainer)
                try {
                  removeChildFromContainer(hostParent, deletedFiber.stateNode);
                } catch (error) {
                  captureCommitPhaseError(deletedFiber, nearestMountedAncestor, error);
                }
              else
                try {
                  removeChild(hostParent, deletedFiber.stateNode);
                } catch (error) {
                  captureCommitPhaseError(deletedFiber, nearestMountedAncestor, error);
                }
          } else recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
          break;
        case 18:
          if (supportsMutation && hostParent !== null) {
            if (hostParentIsContainer) clearSuspenseBoundaryFromContainer(hostParent, deletedFiber.stateNode);
            else clearSuspenseBoundary(hostParent, deletedFiber.stateNode);
          }
          break;
        case 4:
          if (supportsMutation) {
            prevHostParent = hostParent;
            prevHostParentIsContainer = hostParentIsContainer;
            hostParent = deletedFiber.stateNode.containerInfo;
            hostParentIsContainer = true;
            recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
            hostParent = prevHostParent;
            hostParentIsContainer = prevHostParentIsContainer;
          } else {
            if (supportsPersistence)
              commitHostPortalContainerChildren(
                deletedFiber.stateNode,
                deletedFiber,
                createContainerChildSet(),
              );
            recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
          }
          break;
        case 0:
        case 11:
        case 14:
        case 15:
          commitHookEffectListUnmount(2, deletedFiber, nearestMountedAncestor);
          if (!offscreenSubtreeWasHidden)
            commitHookEffectListUnmount(4, deletedFiber, nearestMountedAncestor);
          recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
          break;
        case 1:
          if (!offscreenSubtreeWasHidden) {
            safelyDetachRef(deletedFiber, nearestMountedAncestor);
            prevHostParent = deletedFiber.stateNode;
            if (typeof prevHostParent.componentWillUnmount === "function")
              safelyCallComponentWillUnmount(deletedFiber, nearestMountedAncestor, prevHostParent);
          }
          recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
          break;
        case 21:
          recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
          break;
        case 22:
          offscreenSubtreeWasHidden =
            (prevHostParent = offscreenSubtreeWasHidden) || deletedFiber.memoizedState !== null;
          recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
          offscreenSubtreeWasHidden = prevHostParent;
          break;
        default:
          recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
      }
    }
    function commitActivityHydrationCallbacks(finishedRoot, finishedWork) {
      if (
        supportsHydration &&
        finishedWork.memoizedState === null &&
        ((finishedRoot = finishedWork.alternate),
        finishedRoot !== null && ((finishedRoot = finishedRoot.memoizedState), finishedRoot !== null))
      ) {
        finishedRoot = finishedRoot.dehydrated;
        try {
          commitHydratedActivityInstance(finishedRoot);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
    }
    function commitSuspenseHydrationCallbacks(finishedRoot, finishedWork) {
      if (
        supportsHydration &&
        finishedWork.memoizedState === null &&
        ((finishedRoot = finishedWork.alternate),
        finishedRoot !== null &&
          ((finishedRoot = finishedRoot.memoizedState),
          finishedRoot !== null && ((finishedRoot = finishedRoot.dehydrated), finishedRoot !== null)))
      )
        try {
          commitHydratedSuspenseInstance(finishedRoot);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
    }
    function getRetryCache(finishedWork) {
      switch (finishedWork.tag) {
        case 31:
        case 13:
        case 19:
          var retryCache = finishedWork.stateNode;
          if (retryCache === null) retryCache = finishedWork.stateNode = new PossiblyWeakSet();
          return retryCache;
        case 22:
          finishedWork = finishedWork.stateNode;
          retryCache = finishedWork._retryCache;
          if (retryCache === null) retryCache = finishedWork._retryCache = new PossiblyWeakSet();
          return retryCache;
        default:
          throw Error(formatProdErrorMessage(435, finishedWork.tag));
      }
    }
    function attachSuspenseRetryListeners(finishedWork, wakeables) {
      var retryCache = getRetryCache(finishedWork);
      wakeables.forEach(function (wakeable) {
        if (!retryCache.has(wakeable)) {
          retryCache.add(wakeable);
          var retry = resolveRetryWakeable.bind(null, finishedWork, wakeable);
          wakeable.then(retry, retry);
        }
      });
    }
    function recursivelyTraverseMutationEffects(root$jscomp$0, parentFiber) {
      var deletions = parentFiber.deletions;
      if (deletions !== null)
        for (var i = 0; i < deletions.length; i++) {
          var childToDelete = deletions[i];
          var root = root$jscomp$0;
          var returnFiber = parentFiber;
          if (supportsMutation) {
            var parent = returnFiber;
            e: for (; parent !== null;) {
              switch (parent.tag) {
                case 27:
                  if (supportsSingletons) {
                    if (isSingletonScope(parent.type)) {
                      hostParent = parent.stateNode;
                      hostParentIsContainer = false;
                      break e;
                    }
                    break;
                  }
                case 5:
                  hostParent = parent.stateNode;
                  hostParentIsContainer = false;
                  break e;
                case 3:
                case 4:
                  hostParent = parent.stateNode.containerInfo;
                  hostParentIsContainer = true;
                  break e;
              }
              parent = parent.return;
            }
            if (hostParent === null) throw Error(formatProdErrorMessage(160));
            commitDeletionEffectsOnFiber(root, returnFiber, childToDelete);
            hostParent = null;
            hostParentIsContainer = false;
          } else commitDeletionEffectsOnFiber(root, returnFiber, childToDelete);
          root = childToDelete.alternate;
          if (root !== null) root.return = null;
          childToDelete.return = null;
        }
      if (parentFiber.subtreeFlags & 13886)
        for (parentFiber = parentFiber.child; parentFiber !== null;) {
          commitMutationEffectsOnFiber(parentFiber, root$jscomp$0);
          parentFiber = parentFiber.sibling;
        }
    }
    function commitMutationEffectsOnFiber(finishedWork, root) {
      var current = finishedWork.alternate;
      var flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          if (flags & 4) {
            commitHookEffectListUnmount(3, finishedWork, finishedWork.return);
            commitHookEffectListMount(3, finishedWork);
            commitHookEffectListUnmount(5, finishedWork, finishedWork.return);
          }
          break;
        case 1:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          if (flags & 512) {
            if (!(offscreenSubtreeWasHidden || current === null)) safelyDetachRef(current, current.return);
          }
          if (flags & 64 && offscreenSubtreeIsHidden) {
            finishedWork = finishedWork.updateQueue;
            if (finishedWork !== null) {
              flags = finishedWork.callbacks;
              if (flags !== null) {
                current = finishedWork.shared.hiddenCallbacks;
                finishedWork.shared.hiddenCallbacks = current === null ? flags : current.concat(flags);
              }
            }
          }
          break;
        case 26:
          if (supportsResources) {
            var hoistableRoot = currentHoistableRoot;
            recursivelyTraverseMutationEffects(root, finishedWork);
            commitReconciliationEffects(finishedWork);
            if (flags & 512) {
              if (!(offscreenSubtreeWasHidden || current === null)) safelyDetachRef(current, current.return);
            }
            if (flags & 4) {
              flags = current !== null ? current.memoizedState : null;
              var newResource = finishedWork.memoizedState;
              if (current === null) {
                if (newResource === null) {
                  if (finishedWork.stateNode === null)
                    finishedWork.stateNode = hydrateHoistable(
                      hoistableRoot,
                      finishedWork.type,
                      finishedWork.memoizedProps,
                      finishedWork,
                    );
                  else mountHoistable(hoistableRoot, finishedWork.type, finishedWork.stateNode);
                } else
                  finishedWork.stateNode = acquireResource(
                    hoistableRoot,
                    newResource,
                    finishedWork.memoizedProps,
                  );
              } else if (flags !== newResource) {
                if (flags === null) {
                  if (current.stateNode !== null) unmountHoistable(current.stateNode);
                } else releaseResource(flags);
                if (newResource === null)
                  mountHoistable(hoistableRoot, finishedWork.type, finishedWork.stateNode);
                else acquireResource(hoistableRoot, newResource, finishedWork.memoizedProps);
              } else if (newResource === null && finishedWork.stateNode !== null)
                commitHostUpdate(finishedWork, finishedWork.memoizedProps, current.memoizedProps);
            }
            break;
          }
        case 27:
          if (supportsSingletons) {
            recursivelyTraverseMutationEffects(root, finishedWork);
            commitReconciliationEffects(finishedWork);
            if (flags & 512) {
              if (!(offscreenSubtreeWasHidden || current === null)) safelyDetachRef(current, current.return);
            }
            if (current !== null && flags & 4)
              commitHostUpdate(finishedWork, finishedWork.memoizedProps, current.memoizedProps);
            break;
          }
        case 5:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          if (flags & 512) {
            if (!(offscreenSubtreeWasHidden || current === null)) safelyDetachRef(current, current.return);
          }
          if (supportsMutation) {
            if (finishedWork.flags & 32) {
              hoistableRoot = finishedWork.stateNode;
              try {
                resetTextContent(hoistableRoot);
              } catch (error) {
                captureCommitPhaseError(finishedWork, finishedWork.return, error);
              }
            }
            if (flags & 4 && finishedWork.stateNode != null) {
              hoistableRoot = finishedWork.memoizedProps;
              commitHostUpdate(
                finishedWork,
                hoistableRoot,
                current !== null ? current.memoizedProps : hoistableRoot,
              );
            }
            if (flags & 1024) needsFormReset = true;
          } else if (supportsPersistence && finishedWork.alternate !== null)
            finishedWork.alternate.stateNode = finishedWork.stateNode;
          break;
        case 6:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          if (flags & 4 && supportsMutation) {
            if (finishedWork.stateNode === null) throw Error(formatProdErrorMessage(162));
            flags = finishedWork.memoizedProps;
            current = current !== null ? current.memoizedProps : flags;
            hoistableRoot = finishedWork.stateNode;
            try {
              commitTextUpdate(hoistableRoot, current, flags);
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          }
          break;
        case 3:
          if (supportsResources) {
            prepareToCommitHoistables();
            hoistableRoot = currentHoistableRoot;
            currentHoistableRoot = getHoistableRoot(root.containerInfo);
            recursivelyTraverseMutationEffects(root, finishedWork);
            currentHoistableRoot = hoistableRoot;
          } else recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          if (flags & 4) {
            if (
              supportsMutation &&
              supportsHydration &&
              current !== null &&
              current.memoizedState.isDehydrated
            )
              try {
                commitHydratedContainer(root.containerInfo);
              } catch (error) {
                captureCommitPhaseError(finishedWork, finishedWork.return, error);
              }
            if (supportsPersistence) {
              flags = root.containerInfo;
              current = root.pendingChildren;
              try {
                replaceContainerChildren(flags, current);
              } catch (error) {
                captureCommitPhaseError(finishedWork, finishedWork.return, error);
              }
            }
          }
          if (needsFormReset) {
            needsFormReset = false;
            recursivelyResetForms(finishedWork);
          }
          break;
        case 4:
          if (supportsResources) {
            current = currentHoistableRoot;
            currentHoistableRoot = getHoistableRoot(finishedWork.stateNode.containerInfo);
            recursivelyTraverseMutationEffects(root, finishedWork);
            commitReconciliationEffects(finishedWork);
            currentHoistableRoot = current;
          } else {
            recursivelyTraverseMutationEffects(root, finishedWork);
            commitReconciliationEffects(finishedWork);
          }
          if (flags & 4 && supportsPersistence)
            commitHostPortalContainerChildren(
              finishedWork.stateNode,
              finishedWork,
              finishedWork.stateNode.pendingChildren,
            );
          break;
        case 12:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          break;
        case 31:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          if (flags & 4) {
            flags = finishedWork.updateQueue;
            if (flags !== null) {
              finishedWork.updateQueue = null;
              attachSuspenseRetryListeners(finishedWork, flags);
            }
          }
          break;
        case 13:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          if (
            finishedWork.child.flags & 8192 &&
            (finishedWork.memoizedState !== null) !== (current !== null && current.memoizedState !== null)
          )
            globalMostRecentFallbackTime = now();
          if (flags & 4) {
            flags = finishedWork.updateQueue;
            if (flags !== null) {
              finishedWork.updateQueue = null;
              attachSuspenseRetryListeners(finishedWork, flags);
            }
          }
          break;
        case 22:
          hoistableRoot = finishedWork.memoizedState !== null;
          var wasHidden = current !== null && current.memoizedState !== null;
          var prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden;
          var prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
          offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden || hoistableRoot;
          offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden || wasHidden;
          recursivelyTraverseMutationEffects(root, finishedWork);
          offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
          offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
          commitReconciliationEffects(finishedWork);
          if (
            flags & 8192 &&
            ((root = finishedWork.stateNode),
            (root._visibility = hoistableRoot ? root._visibility & -2 : root._visibility | 1),
            hoistableRoot &&
              (current === null ||
                wasHidden ||
                offscreenSubtreeIsHidden ||
                offscreenSubtreeWasHidden ||
                recursivelyTraverseDisappearLayoutEffects(finishedWork)),
            supportsMutation)
          ) {
            e: {
              current = null;
              if (supportsMutation)
                for (root = finishedWork; ;) {
                  if (root.tag === 5 || (supportsResources && root.tag === 26)) {
                    if (current === null) {
                      wasHidden = current = root;
                      try {
                        newResource = wasHidden.stateNode;
                        if (hoistableRoot) hideInstance(newResource);
                        else unhideInstance(wasHidden.stateNode, wasHidden.memoizedProps);
                      } catch (error) {
                        captureCommitPhaseError(wasHidden, wasHidden.return, error);
                      }
                    }
                  } else if (root.tag === 6) {
                    if (current === null) {
                      wasHidden = root;
                      try {
                        var instance = wasHidden.stateNode;
                        if (hoistableRoot) hideTextInstance(instance);
                        else unhideTextInstance(instance, wasHidden.memoizedProps);
                      } catch (error) {
                        captureCommitPhaseError(wasHidden, wasHidden.return, error);
                      }
                    }
                  } else if (root.tag === 18) {
                    if (current === null) {
                      wasHidden = root;
                      try {
                        var instance$jscomp$0 = wasHidden.stateNode;
                        if (hoistableRoot) hideDehydratedBoundary(instance$jscomp$0);
                        else unhideDehydratedBoundary(wasHidden.stateNode);
                      } catch (error) {
                        captureCommitPhaseError(wasHidden, wasHidden.return, error);
                      }
                    }
                  } else if (
                    ((root.tag !== 22 && root.tag !== 23) ||
                      root.memoizedState === null ||
                      root === finishedWork) &&
                    root.child !== null
                  ) {
                    root.child.return = root;
                    root = root.child;
                    continue;
                  }
                  if (root === finishedWork) break e;
                  for (; root.sibling === null;) {
                    if (root.return === null || root.return === finishedWork) break e;
                    if (current === root) current = null;
                    root = root.return;
                  }
                  if (current === root) current = null;
                  root.sibling.return = root.return;
                  root = root.sibling;
                }
            }
          }
          if (flags & 4) {
            flags = finishedWork.updateQueue;
            if (flags !== null) {
              current = flags.retryQueue;
              if (current !== null) {
                flags.retryQueue = null;
                attachSuspenseRetryListeners(finishedWork, current);
              }
            }
          }
          break;
        case 19:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          if (flags & 4) {
            flags = finishedWork.updateQueue;
            if (flags !== null) {
              finishedWork.updateQueue = null;
              attachSuspenseRetryListeners(finishedWork, flags);
            }
          }
          break;
        case 30:
          break;
        case 21:
          break;
        default:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
      }
    }
    function commitReconciliationEffects(finishedWork) {
      var flags = finishedWork.flags;
      if (flags & 2) {
        try {
          for (var hostParentFiber, parentFiber = finishedWork.return; parentFiber !== null;) {
            if (isHostParent(parentFiber)) {
              hostParentFiber = parentFiber;
              break;
            }
            parentFiber = parentFiber.return;
          }
          if (supportsMutation) {
            if (hostParentFiber == null) throw Error(formatProdErrorMessage(160));
            switch (hostParentFiber.tag) {
              case 27:
                if (supportsSingletons) {
                  var parent = hostParentFiber.stateNode;
                  var before = getHostSibling(finishedWork);
                  insertOrAppendPlacementNode(finishedWork, before, parent);
                  break;
                }
              case 5:
                var parent$125 = hostParentFiber.stateNode;
                if (hostParentFiber.flags & 32) {
                  resetTextContent(parent$125);
                  hostParentFiber.flags &= -33;
                }
                var before$126 = getHostSibling(finishedWork);
                insertOrAppendPlacementNode(finishedWork, before$126, parent$125);
                break;
              case 3:
              case 4:
                var parent$127 = hostParentFiber.stateNode.containerInfo;
                var before$128 = getHostSibling(finishedWork);
                insertOrAppendPlacementNodeIntoContainer(finishedWork, before$128, parent$127);
                break;
              default:
                throw Error(formatProdErrorMessage(161));
            }
          }
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
        finishedWork.flags &= -3;
      }
      if (flags & 4096) finishedWork.flags &= -4097;
    }
    function recursivelyResetForms(parentFiber) {
      if (parentFiber.subtreeFlags & 1024)
        for (parentFiber = parentFiber.child; parentFiber !== null;) {
          var fiber = parentFiber;
          recursivelyResetForms(fiber);
          if (fiber.tag === 5 && fiber.flags & 1024) resetFormInstance(fiber.stateNode);
          parentFiber = parentFiber.sibling;
        }
    }
    function recursivelyTraverseLayoutEffects(root, parentFiber) {
      if (parentFiber.subtreeFlags & 8772)
        for (parentFiber = parentFiber.child; parentFiber !== null;) {
          commitLayoutEffectOnFiber(root, parentFiber.alternate, parentFiber);
          parentFiber = parentFiber.sibling;
        }
    }
    function recursivelyTraverseDisappearLayoutEffects(parentFiber) {
      for (parentFiber = parentFiber.child; parentFiber !== null;) {
        var finishedWork = parentFiber;
        switch (finishedWork.tag) {
          case 0:
          case 11:
          case 14:
          case 15:
            commitHookEffectListUnmount(4, finishedWork, finishedWork.return);
            recursivelyTraverseDisappearLayoutEffects(finishedWork);
            break;
          case 1:
            safelyDetachRef(finishedWork, finishedWork.return);
            var instance = finishedWork.stateNode;
            if (typeof instance.componentWillUnmount === "function")
              safelyCallComponentWillUnmount(finishedWork, finishedWork.return, instance);
            recursivelyTraverseDisappearLayoutEffects(finishedWork);
            break;
          case 27:
            if (supportsSingletons) releaseSingletonInstance(finishedWork.stateNode);
          case 26:
          case 5:
            safelyDetachRef(finishedWork, finishedWork.return);
            recursivelyTraverseDisappearLayoutEffects(finishedWork);
            break;
          case 22:
            if (finishedWork.memoizedState === null) recursivelyTraverseDisappearLayoutEffects(finishedWork);
            break;
          case 30:
            recursivelyTraverseDisappearLayoutEffects(finishedWork);
            break;
          default:
            recursivelyTraverseDisappearLayoutEffects(finishedWork);
        }
        parentFiber = parentFiber.sibling;
      }
    }
    function recursivelyTraverseReappearLayoutEffects(
      finishedRoot$jscomp$0,
      parentFiber,
      includeWorkInProgressEffects,
    ) {
      includeWorkInProgressEffects = includeWorkInProgressEffects && (parentFiber.subtreeFlags & 8772) !== 0;
      for (parentFiber = parentFiber.child; parentFiber !== null;) {
        var current = parentFiber.alternate;
        var finishedRoot = finishedRoot$jscomp$0;
        var finishedWork = parentFiber;
        var flags = finishedWork.flags;
        switch (finishedWork.tag) {
          case 0:
          case 11:
          case 15:
            recursivelyTraverseReappearLayoutEffects(
              finishedRoot,
              finishedWork,
              includeWorkInProgressEffects,
            );
            commitHookEffectListMount(4, finishedWork);
            break;
          case 1:
            recursivelyTraverseReappearLayoutEffects(
              finishedRoot,
              finishedWork,
              includeWorkInProgressEffects,
            );
            current = finishedWork;
            finishedRoot = current.stateNode;
            if (typeof finishedRoot.componentDidMount === "function")
              try {
                finishedRoot.componentDidMount();
              } catch (error) {
                captureCommitPhaseError(current, current.return, error);
              }
            current = finishedWork;
            finishedRoot = current.updateQueue;
            if (finishedRoot !== null) {
              var stateNode = current.stateNode;
              try {
                var hiddenCallbacks = finishedRoot.shared.hiddenCallbacks;
                if (hiddenCallbacks !== null)
                  for (
                    finishedRoot.shared.hiddenCallbacks = null, finishedRoot = 0;
                    finishedRoot < hiddenCallbacks.length;
                    finishedRoot++
                  )
                    callCallback(hiddenCallbacks[finishedRoot], stateNode);
              } catch (error) {
                captureCommitPhaseError(current, current.return, error);
              }
            }
            if (includeWorkInProgressEffects && flags & 64) commitClassCallbacks(finishedWork);
            safelyAttachRef(finishedWork, finishedWork.return);
            break;
          case 27:
            if (supportsSingletons) commitHostSingletonAcquisition(finishedWork);
          case 26:
          case 5:
            recursivelyTraverseReappearLayoutEffects(
              finishedRoot,
              finishedWork,
              includeWorkInProgressEffects,
            );
            if (includeWorkInProgressEffects && current === null && flags & 4) commitHostMount(finishedWork);
            safelyAttachRef(finishedWork, finishedWork.return);
            break;
          case 12:
            recursivelyTraverseReappearLayoutEffects(
              finishedRoot,
              finishedWork,
              includeWorkInProgressEffects,
            );
            break;
          case 31:
            recursivelyTraverseReappearLayoutEffects(
              finishedRoot,
              finishedWork,
              includeWorkInProgressEffects,
            );
            if (includeWorkInProgressEffects && flags & 4)
              commitActivityHydrationCallbacks(finishedRoot, finishedWork);
            break;
          case 13:
            recursivelyTraverseReappearLayoutEffects(
              finishedRoot,
              finishedWork,
              includeWorkInProgressEffects,
            );
            if (includeWorkInProgressEffects && flags & 4)
              commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
            break;
          case 22:
            if (finishedWork.memoizedState === null)
              recursivelyTraverseReappearLayoutEffects(
                finishedRoot,
                finishedWork,
                includeWorkInProgressEffects,
              );
            safelyAttachRef(finishedWork, finishedWork.return);
            break;
          case 30:
            break;
          default:
            recursivelyTraverseReappearLayoutEffects(
              finishedRoot,
              finishedWork,
              includeWorkInProgressEffects,
            );
        }
        parentFiber = parentFiber.sibling;
      }
    }
    function commitOffscreenPassiveMountEffects(current, finishedWork) {
      var previousCache = null;
      if (current !== null && current.memoizedState !== null && current.memoizedState.cachePool !== null)
        previousCache = current.memoizedState.cachePool.pool;
      current = null;
      if (finishedWork.memoizedState !== null && finishedWork.memoizedState.cachePool !== null)
        current = finishedWork.memoizedState.cachePool.pool;
      if (current !== previousCache) {
        if (current != null) current.refCount++;
        if (previousCache != null) releaseCache(previousCache);
      }
    }
    function commitCachePassiveMountEffect(current, finishedWork) {
      current = null;
      if (finishedWork.alternate !== null) current = finishedWork.alternate.memoizedState.cache;
      finishedWork = finishedWork.memoizedState.cache;
      if (finishedWork !== current) {
        finishedWork.refCount++;
        if (current != null) releaseCache(current);
      }
    }
    function recursivelyTraversePassiveMountEffects(root, parentFiber, committedLanes, committedTransitions) {
      if (parentFiber.subtreeFlags & 10256)
        for (parentFiber = parentFiber.child; parentFiber !== null;) {
          commitPassiveMountOnFiber(root, parentFiber, committedLanes, committedTransitions);
          parentFiber = parentFiber.sibling;
        }
    }
    function commitPassiveMountOnFiber(finishedRoot, finishedWork, committedLanes, committedTransitions) {
      var flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
          );
          if (flags & 2048) commitHookEffectListMount(9, finishedWork);
          break;
        case 1:
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
          );
          break;
        case 3:
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
          );
          if (flags & 2048) {
            finishedRoot = null;
            if (finishedWork.alternate !== null) finishedRoot = finishedWork.alternate.memoizedState.cache;
            finishedWork = finishedWork.memoizedState.cache;
            if (finishedWork !== finishedRoot) {
              finishedWork.refCount++;
              if (finishedRoot != null) releaseCache(finishedRoot);
            }
          }
          break;
        case 12:
          if (flags & 2048) {
            recursivelyTraversePassiveMountEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
            );
            finishedRoot = finishedWork.stateNode;
            try {
              var _finishedWork$memoize2 = finishedWork.memoizedProps;
              var id = _finishedWork$memoize2.id;
              var onPostCommit = _finishedWork$memoize2.onPostCommit;
              if (typeof onPostCommit === "function")
                onPostCommit(
                  id,
                  finishedWork.alternate === null ? "mount" : "update",
                  finishedRoot.passiveEffectDuration,
                  -0,
                );
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          } else
            recursivelyTraversePassiveMountEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
            );
          break;
        case 31:
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
          );
          break;
        case 13:
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
          );
          break;
        case 23:
          break;
        case 22:
          _finishedWork$memoize2 = finishedWork.stateNode;
          id = finishedWork.alternate;
          if (finishedWork.memoizedState !== null) {
            if (_finishedWork$memoize2._visibility & 2)
              recursivelyTraversePassiveMountEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions,
              );
            else recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
          } else if (_finishedWork$memoize2._visibility & 2)
            recursivelyTraversePassiveMountEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
            );
          else {
            _finishedWork$memoize2._visibility |= 2;
            recursivelyTraverseReconnectPassiveEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
              (finishedWork.subtreeFlags & 10256) !== 0 || false,
            );
          }
          if (flags & 2048) commitOffscreenPassiveMountEffects(id, finishedWork);
          break;
        case 24:
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
          );
          if (flags & 2048) commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
          break;
        default:
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
          );
      }
    }
    function recursivelyTraverseReconnectPassiveEffects(
      finishedRoot,
      parentFiber,
      committedLanes,
      committedTransitions,
      includeWorkInProgressEffects,
    ) {
      includeWorkInProgressEffects =
        includeWorkInProgressEffects && ((parentFiber.subtreeFlags & 10256) !== 0 || false);
      for (parentFiber = parentFiber.child; parentFiber !== null;) {
        var finishedRoot_2 = finishedRoot;
        var finishedWork = parentFiber;
        var committedLanes_2 = committedLanes;
        var committedTransitions_2 = committedTransitions;
        var flags = finishedWork.flags;
        switch (finishedWork.tag) {
          case 0:
          case 11:
          case 15:
            recursivelyTraverseReconnectPassiveEffects(
              finishedRoot_2,
              finishedWork,
              committedLanes_2,
              committedTransitions_2,
              includeWorkInProgressEffects,
            );
            commitHookEffectListMount(8, finishedWork);
            break;
          case 23:
            break;
          case 22:
            var instance = finishedWork.stateNode;
            if (finishedWork.memoizedState !== null) {
              if (instance._visibility & 2)
                recursivelyTraverseReconnectPassiveEffects(
                  finishedRoot_2,
                  finishedWork,
                  committedLanes_2,
                  committedTransitions_2,
                  includeWorkInProgressEffects,
                );
              else recursivelyTraverseAtomicPassiveEffects(finishedRoot_2, finishedWork);
            } else {
              instance._visibility |= 2;
              recursivelyTraverseReconnectPassiveEffects(
                finishedRoot_2,
                finishedWork,
                committedLanes_2,
                committedTransitions_2,
                includeWorkInProgressEffects,
              );
            }
            if (includeWorkInProgressEffects && flags & 2048)
              commitOffscreenPassiveMountEffects(finishedWork.alternate, finishedWork);
            break;
          case 24:
            recursivelyTraverseReconnectPassiveEffects(
              finishedRoot_2,
              finishedWork,
              committedLanes_2,
              committedTransitions_2,
              includeWorkInProgressEffects,
            );
            if (includeWorkInProgressEffects && flags & 2048)
              commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
            break;
          default:
            recursivelyTraverseReconnectPassiveEffects(
              finishedRoot_2,
              finishedWork,
              committedLanes_2,
              committedTransitions_2,
              includeWorkInProgressEffects,
            );
        }
        parentFiber = parentFiber.sibling;
      }
    }
    function recursivelyTraverseAtomicPassiveEffects(finishedRoot, parentFiber) {
      if (parentFiber.subtreeFlags & 10256)
        for (parentFiber = parentFiber.child; parentFiber !== null;) {
          var finishedRoot_2 = finishedRoot;
          var finishedWork = parentFiber;
          var flags = finishedWork.flags;
          switch (finishedWork.tag) {
            case 22:
              recursivelyTraverseAtomicPassiveEffects(finishedRoot_2, finishedWork);
              if (flags & 2048) commitOffscreenPassiveMountEffects(finishedWork.alternate, finishedWork);
              break;
            case 24:
              recursivelyTraverseAtomicPassiveEffects(finishedRoot_2, finishedWork);
              if (flags & 2048) commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
              break;
            default:
              recursivelyTraverseAtomicPassiveEffects(finishedRoot_2, finishedWork);
          }
          parentFiber = parentFiber.sibling;
        }
    }
    function recursivelyAccumulateSuspenseyCommit(parentFiber, committedLanes, suspendedState) {
      if (parentFiber.subtreeFlags & suspenseyCommitFlag)
        for (parentFiber = parentFiber.child; parentFiber !== null;) {
          accumulateSuspenseyCommitOnFiber(parentFiber, committedLanes, suspendedState);
          parentFiber = parentFiber.sibling;
        }
    }
    function accumulateSuspenseyCommitOnFiber(fiber, committedLanes, suspendedState) {
      switch (fiber.tag) {
        case 26:
          recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState);
          if (fiber.flags & suspenseyCommitFlag)
            if (fiber.memoizedState !== null)
              suspendResource(suspendedState, currentHoistableRoot, fiber.memoizedState, fiber.memoizedProps);
            else {
              var instance = fiber.stateNode;
              var type = fiber.type;
              fiber = fiber.memoizedProps;
              if (
                (committedLanes & 335544128) === committedLanes ||
                maySuspendCommitInSyncRender(type, fiber)
              )
                suspendInstance(suspendedState, instance, type, fiber);
            }
          break;
        case 5:
          recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState);
          if (fiber.flags & suspenseyCommitFlag) {
            instance = fiber.stateNode;
            type = fiber.type;
            fiber = fiber.memoizedProps;
            if ((committedLanes & 335544128) === committedLanes || maySuspendCommitInSyncRender(type, fiber))
              suspendInstance(suspendedState, instance, type, fiber);
          }
          break;
        case 3:
        case 4:
          if (supportsResources) {
            instance = currentHoistableRoot;
            currentHoistableRoot = getHoistableRoot(fiber.stateNode.containerInfo);
            recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState);
            currentHoistableRoot = instance;
          } else recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState);
          break;
        case 22:
          if (fiber.memoizedState === null) {
            instance = fiber.alternate;
            if (instance !== null && instance.memoizedState !== null) {
              instance = suspenseyCommitFlag;
              suspenseyCommitFlag = 16777216;
              recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState);
              suspenseyCommitFlag = instance;
            } else recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState);
          }
          break;
        default:
          recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState);
      }
    }
    function detachAlternateSiblings(parentFiber) {
      var previousFiber = parentFiber.alternate;
      if (previousFiber !== null && ((parentFiber = previousFiber.child), parentFiber !== null)) {
        previousFiber.child = null;
        do {
          previousFiber = parentFiber.sibling;
          parentFiber.sibling = null;
          parentFiber = previousFiber;
        } while (parentFiber !== null);
      }
    }
    function recursivelyTraversePassiveUnmountEffects(parentFiber) {
      var deletions = parentFiber.deletions;
      if ((parentFiber.flags & 16) !== 0) {
        if (deletions !== null)
          for (var i = 0; i < deletions.length; i++) {
            var childToDelete = deletions[i];
            nextEffect = childToDelete;
            commitPassiveUnmountEffectsInsideOfDeletedTree_begin(childToDelete, parentFiber);
          }
        detachAlternateSiblings(parentFiber);
      }
      if (parentFiber.subtreeFlags & 10256)
        for (parentFiber = parentFiber.child; parentFiber !== null;) {
          commitPassiveUnmountOnFiber(parentFiber);
          parentFiber = parentFiber.sibling;
        }
    }
    function commitPassiveUnmountOnFiber(finishedWork) {
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraversePassiveUnmountEffects(finishedWork);
          if (finishedWork.flags & 2048) commitHookEffectListUnmount(9, finishedWork, finishedWork.return);
          break;
        case 3:
          recursivelyTraversePassiveUnmountEffects(finishedWork);
          break;
        case 12:
          recursivelyTraversePassiveUnmountEffects(finishedWork);
          break;
        case 22:
          var instance = finishedWork.stateNode;
          if (
            finishedWork.memoizedState !== null &&
            instance._visibility & 2 &&
            (finishedWork.return === null || finishedWork.return.tag !== 13)
          ) {
            instance._visibility &= -3;
            recursivelyTraverseDisconnectPassiveEffects(finishedWork);
          } else recursivelyTraversePassiveUnmountEffects(finishedWork);
          break;
        default:
          recursivelyTraversePassiveUnmountEffects(finishedWork);
      }
    }
    function recursivelyTraverseDisconnectPassiveEffects(parentFiber) {
      var deletions = parentFiber.deletions;
      if ((parentFiber.flags & 16) !== 0) {
        if (deletions !== null)
          for (var i = 0; i < deletions.length; i++) {
            var childToDelete = deletions[i];
            nextEffect = childToDelete;
            commitPassiveUnmountEffectsInsideOfDeletedTree_begin(childToDelete, parentFiber);
          }
        detachAlternateSiblings(parentFiber);
      }
      for (parentFiber = parentFiber.child; parentFiber !== null;) {
        switch (((deletions = parentFiber), deletions.tag)) {
          case 0:
          case 11:
          case 15:
            commitHookEffectListUnmount(8, deletions, deletions.return);
            recursivelyTraverseDisconnectPassiveEffects(deletions);
            break;
          case 22:
            i = deletions.stateNode;
            if (i._visibility & 2) {
              i._visibility &= -3;
              recursivelyTraverseDisconnectPassiveEffects(deletions);
            }
            break;
          default:
            recursivelyTraverseDisconnectPassiveEffects(deletions);
        }
        parentFiber = parentFiber.sibling;
      }
    }
    function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
      deletedSubtreeRoot,
      nearestMountedAncestor,
    ) {
      for (; nextEffect !== null;) {
        var fiber = nextEffect;
        switch (fiber.tag) {
          case 0:
          case 11:
          case 15:
            commitHookEffectListUnmount(8, fiber, nearestMountedAncestor);
            break;
          case 23:
          case 22:
            if (fiber.memoizedState !== null && fiber.memoizedState.cachePool !== null) {
              var cache = fiber.memoizedState.cachePool.pool;
              if (cache != null) cache.refCount++;
            }
            break;
          case 24:
            releaseCache(fiber.memoizedState.cache);
        }
        cache = fiber.child;
        if (cache !== null) {
          cache.return = fiber;
          nextEffect = cache;
        } else
          e: for (fiber = deletedSubtreeRoot; nextEffect !== null;) {
            cache = nextEffect;
            var sibling = cache.sibling;
            var returnFiber = cache.return;
            detachFiberAfterEffects(cache);
            if (cache === fiber) {
              nextEffect = null;
              break e;
            }
            if (sibling !== null) {
              sibling.return = returnFiber;
              nextEffect = sibling;
              break e;
            }
            nextEffect = returnFiber;
          }
      }
    }
    function findFiberRootForHostRoot(hostRoot) {
      var maybeFiber = getInstanceFromNode(hostRoot);
      if (maybeFiber != null) {
        if (typeof maybeFiber.memoizedProps["data-testname"] !== "string")
          throw Error(formatProdErrorMessage(364));
        return maybeFiber;
      }
      hostRoot = findFiberRoot(hostRoot);
      if (hostRoot === null) throw Error(formatProdErrorMessage(362));
      return hostRoot.stateNode.current;
    }
    function matchSelector(fiber$jscomp$0, selector) {
      var tag = fiber$jscomp$0.tag;
      switch (selector.$$typeof) {
        case COMPONENT_TYPE:
          if (fiber$jscomp$0.type === selector.value) return true;
          break;
        case HAS_PSEUDO_CLASS_TYPE:
          e: {
            selector = selector.value;
            fiber$jscomp$0 = [fiber$jscomp$0, 0];
            for (tag = 0; tag < fiber$jscomp$0.length;) {
              var fiber = fiber$jscomp$0[tag++];
              var tag_2 = fiber.tag;
              var selectorIndex = fiber$jscomp$0[tag++];
              var selector$jscomp$0 = selector[selectorIndex];
              if ((tag_2 !== 5 && tag_2 !== 26 && tag_2 !== 27) || !isHiddenSubtree(fiber)) {
                for (; selector$jscomp$0 != null && matchSelector(fiber, selector$jscomp$0);) {
                  selectorIndex++;
                  selector$jscomp$0 = selector[selectorIndex];
                }
                if (selectorIndex === selector.length) {
                  selector = true;
                  break e;
                } else
                  for (fiber = fiber.child; fiber !== null;) {
                    fiber$jscomp$0.push(fiber, selectorIndex);
                    fiber = fiber.sibling;
                  }
              }
            }
            selector = false;
          }
          return selector;
        case ROLE_TYPE:
          if (
            (tag === 5 || tag === 26 || tag === 27) &&
            matchAccessibilityRole(fiber$jscomp$0.stateNode, selector.value)
          )
            return true;
          break;
        case TEXT_TYPE:
          if (tag === 5 || tag === 6 || tag === 26 || tag === 27) {
            fiber$jscomp$0 = getTextContent(fiber$jscomp$0);
            if (fiber$jscomp$0 !== null && 0 <= fiber$jscomp$0.indexOf(selector.value)) return true;
          }
          break;
        case TEST_NAME_TYPE:
          if (tag === 5 || tag === 26 || tag === 27) {
            fiber$jscomp$0 = fiber$jscomp$0.memoizedProps["data-testname"];
            if (
              typeof fiber$jscomp$0 === "string" &&
              fiber$jscomp$0.toLowerCase() === selector.value.toLowerCase()
            )
              return true;
          }
          break;
        default:
          throw Error(formatProdErrorMessage(365));
      }
      return false;
    }
    function selectorToString(selector) {
      switch (selector.$$typeof) {
        case COMPONENT_TYPE:
          return "<" + (getComponentNameFromType(selector.value) || "Unknown") + ">";
        case HAS_PSEUDO_CLASS_TYPE:
          return ":has(" + (selectorToString(selector) || "") + ")";
        case ROLE_TYPE:
          return '[role="' + selector.value + '"]';
        case TEXT_TYPE:
          return '"' + selector.value + '"';
        case TEST_NAME_TYPE:
          return '[data-testname="' + selector.value + '"]';
        default:
          throw Error(formatProdErrorMessage(365));
      }
    }
    function findPaths(root, selectors) {
      var matchingFibers = [];
      root = [root, 0];
      for (var index = 0; index < root.length;) {
        var fiber = root[index++];
        var tag = fiber.tag;
        var selectorIndex = root[index++];
        var selector = selectors[selectorIndex];
        if ((tag !== 5 && tag !== 26 && tag !== 27) || !isHiddenSubtree(fiber)) {
          for (; selector != null && matchSelector(fiber, selector);) {
            selectorIndex++;
            selector = selectors[selectorIndex];
          }
          if (selectorIndex === selectors.length) matchingFibers.push(fiber);
          else
            for (fiber = fiber.child; fiber !== null;) {
              root.push(fiber, selectorIndex);
              fiber = fiber.sibling;
            }
        }
      }
      return matchingFibers;
    }
    function findAllNodes(hostRoot, selectors) {
      if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
      hostRoot = findFiberRootForHostRoot(hostRoot);
      hostRoot = findPaths(hostRoot, selectors);
      selectors = [];
      hostRoot = Array.from(hostRoot);
      for (var index = 0; index < hostRoot.length;) {
        var node = hostRoot[index++];
        var tag = node.tag;
        if (tag === 5 || tag === 26 || tag === 27) {
          if (!isHiddenSubtree(node)) selectors.push(node.stateNode);
        } else
          for (node = node.child; node !== null;) {
            hostRoot.push(node);
            node = node.sibling;
          }
      }
      return selectors;
    }
    function requestUpdateLane() {
      return (executionContext & 2) !== 0 && workInProgressRootRenderLanes !== 0
        ? workInProgressRootRenderLanes & -workInProgressRootRenderLanes
        : ReactSharedInternals.T !== null
          ? requestTransitionLane()
          : resolveUpdatePriority();
    }
    function requestDeferredLane() {
      if (workInProgressDeferredLane === 0)
        if ((workInProgressRootRenderLanes & 536870912) === 0 || isHydrating) {
          var lane = nextTransitionDeferredLane;
          nextTransitionDeferredLane <<= 1;
          if ((nextTransitionDeferredLane & 3932160) === 0) nextTransitionDeferredLane = 262144;
          workInProgressDeferredLane = lane;
        } else workInProgressDeferredLane = 536870912;
      lane = suspenseHandlerStackCursor.current;
      if (lane !== null) lane.flags |= 32;
      return workInProgressDeferredLane;
    }
    function scheduleUpdateOnFiber(root, fiber, lane) {
      if (
        (root === workInProgressRoot &&
          (workInProgressSuspendedReason === 2 || workInProgressSuspendedReason === 9)) ||
        root.cancelPendingCommit !== null
      ) {
        prepareFreshStack(root, 0);
        markRootSuspended(root, workInProgressRootRenderLanes, workInProgressDeferredLane, false);
      }
      markRootUpdated$1(root, lane);
      if ((executionContext & 2) === 0 || root !== workInProgressRoot) {
        if (root === workInProgressRoot) {
          if ((executionContext & 2) === 0) workInProgressRootInterleavedUpdatedLanes |= lane;
          if (workInProgressRootExitStatus === 4)
            markRootSuspended(root, workInProgressRootRenderLanes, workInProgressDeferredLane, false);
        }
        ensureRootIsScheduled(root);
      }
    }
    function performWorkOnRoot(root$jscomp$0, lanes, forceSync) {
      if ((executionContext & 6) !== 0) throw Error(formatProdErrorMessage(327));
      var shouldTimeSlice =
        (!forceSync && (lanes & 127) === 0 && (lanes & root$jscomp$0.expiredLanes) === 0) ||
        checkIfRootIsPrerendering(root$jscomp$0, lanes);
      var exitStatus = shouldTimeSlice
        ? renderRootConcurrent(root$jscomp$0, lanes)
        : renderRootSync(root$jscomp$0, lanes, true);
      var renderWasConcurrent = shouldTimeSlice;
      do {
        if (exitStatus === 0) {
          if (workInProgressRootIsPrerendering && !shouldTimeSlice)
            markRootSuspended(root$jscomp$0, lanes, 0, false);
          break;
        } else {
          forceSync = root$jscomp$0.current.alternate;
          if (renderWasConcurrent && !isRenderConsistentWithExternalStores(forceSync)) {
            exitStatus = renderRootSync(root$jscomp$0, lanes, false);
            renderWasConcurrent = false;
            continue;
          }
          if (exitStatus === 2) {
            renderWasConcurrent = lanes;
            if (root$jscomp$0.errorRecoveryDisabledLanes & renderWasConcurrent)
              var JSCompiler_inline_result = 0;
            else {
              JSCompiler_inline_result = root$jscomp$0.pendingLanes & -536870913;
              JSCompiler_inline_result =
                JSCompiler_inline_result !== 0
                  ? JSCompiler_inline_result
                  : JSCompiler_inline_result & 536870912
                    ? 536870912
                    : 0;
            }
            if (JSCompiler_inline_result !== 0) {
              lanes = JSCompiler_inline_result;
              e: {
                var root = root$jscomp$0;
                exitStatus = workInProgressRootConcurrentErrors;
                var wasRootDehydrated = supportsHydration && root.current.memoizedState.isDehydrated;
                if (wasRootDehydrated) prepareFreshStack(root, JSCompiler_inline_result).flags |= 256;
                JSCompiler_inline_result = renderRootSync(root, JSCompiler_inline_result, false);
                if (JSCompiler_inline_result !== 2) {
                  if (workInProgressRootDidAttachPingListener && !wasRootDehydrated) {
                    root.errorRecoveryDisabledLanes |= renderWasConcurrent;
                    workInProgressRootInterleavedUpdatedLanes |= renderWasConcurrent;
                    exitStatus = 4;
                    break e;
                  }
                  renderWasConcurrent = workInProgressRootRecoverableErrors;
                  workInProgressRootRecoverableErrors = exitStatus;
                  if (renderWasConcurrent !== null) {
                    if (workInProgressRootRecoverableErrors === null)
                      workInProgressRootRecoverableErrors = renderWasConcurrent;
                    else
                      workInProgressRootRecoverableErrors.push.apply(
                        workInProgressRootRecoverableErrors,
                        renderWasConcurrent,
                      );
                  }
                }
                exitStatus = JSCompiler_inline_result;
              }
              renderWasConcurrent = false;
              if (exitStatus !== 2) continue;
            }
          }
          if (exitStatus === 1) {
            prepareFreshStack(root$jscomp$0, 0);
            markRootSuspended(root$jscomp$0, lanes, 0, true);
            break;
          }
          e: {
            switch (
              ((shouldTimeSlice = root$jscomp$0), (renderWasConcurrent = exitStatus), renderWasConcurrent)
            ) {
              case 0:
              case 1:
                throw Error(formatProdErrorMessage(345));
              case 4:
                if ((lanes & 4194048) !== lanes) break;
              case 6:
                markRootSuspended(
                  shouldTimeSlice,
                  lanes,
                  workInProgressDeferredLane,
                  !workInProgressRootDidSkipSuspendedSiblings,
                );
                break e;
              case 2:
                workInProgressRootRecoverableErrors = null;
                break;
              case 3:
              case 5:
                break;
              default:
                throw Error(formatProdErrorMessage(329));
            }
            if (
              (lanes & 62914560) === lanes &&
              ((exitStatus = globalMostRecentFallbackTime + 0 - now()), 10 < exitStatus)
            ) {
              markRootSuspended(
                shouldTimeSlice,
                lanes,
                workInProgressDeferredLane,
                !workInProgressRootDidSkipSuspendedSiblings,
              );
              if (getNextLanes(shouldTimeSlice, 0, true) !== 0) break e;
              pendingEffectsLanes = lanes;
              shouldTimeSlice.timeoutHandle = scheduleTimeout(
                commitRootWhenReady.bind(
                  null,
                  shouldTimeSlice,
                  forceSync,
                  workInProgressRootRecoverableErrors,
                  workInProgressTransitions,
                  workInProgressRootDidIncludeRecursiveRenderUpdate,
                  lanes,
                  workInProgressDeferredLane,
                  workInProgressRootInterleavedUpdatedLanes,
                  workInProgressSuspendedRetryLanes,
                  workInProgressRootDidSkipSuspendedSiblings,
                  renderWasConcurrent,
                  "Throttled",
                  -0,
                  0,
                ),
                exitStatus,
              );
              break e;
            }
            commitRootWhenReady(
              shouldTimeSlice,
              forceSync,
              workInProgressRootRecoverableErrors,
              workInProgressTransitions,
              workInProgressRootDidIncludeRecursiveRenderUpdate,
              lanes,
              workInProgressDeferredLane,
              workInProgressRootInterleavedUpdatedLanes,
              workInProgressSuspendedRetryLanes,
              workInProgressRootDidSkipSuspendedSiblings,
              renderWasConcurrent,
              null,
              -0,
              0,
            );
          }
        }
        break;
      } while (1);
      ensureRootIsScheduled(root$jscomp$0);
    }
    function commitRootWhenReady(
      root,
      finishedWork,
      recoverableErrors,
      transitions,
      didIncludeRenderPhaseUpdate,
      lanes,
      spawnedLane,
      updatedLanes,
      suspendedRetryLanes,
      didSkipSuspendedSiblings,
      exitStatus,
      suspendedCommitReason,
      completedRenderStartTime,
      completedRenderEndTime,
    ) {
      root.timeoutHandle = noTimeout;
      suspendedCommitReason = finishedWork.subtreeFlags;
      if (suspendedCommitReason & 8192 || (suspendedCommitReason & 16785408) === 16785408) {
        suspendedCommitReason = startSuspendingCommit();
        accumulateSuspenseyCommitOnFiber(finishedWork, lanes, suspendedCommitReason);
        var timeoutOffset =
          (lanes & 62914560) === lanes
            ? globalMostRecentFallbackTime - now()
            : (lanes & 4194048) === lanes
              ? globalMostRecentTransitionTime - now()
              : 0;
        timeoutOffset = waitForCommitToBeReady(suspendedCommitReason, timeoutOffset);
        if (timeoutOffset !== null) {
          pendingEffectsLanes = lanes;
          root.cancelPendingCommit = timeoutOffset(
            commitRoot.bind(
              null,
              root,
              finishedWork,
              lanes,
              recoverableErrors,
              transitions,
              didIncludeRenderPhaseUpdate,
              spawnedLane,
              updatedLanes,
              suspendedRetryLanes,
              exitStatus,
              suspendedCommitReason,
              null,
              completedRenderStartTime,
              completedRenderEndTime,
            ),
          );
          markRootSuspended(root, lanes, spawnedLane, !didSkipSuspendedSiblings);
          return;
        }
      }
      commitRoot(
        root,
        finishedWork,
        lanes,
        recoverableErrors,
        transitions,
        didIncludeRenderPhaseUpdate,
        spawnedLane,
        updatedLanes,
        suspendedRetryLanes,
      );
    }
    function isRenderConsistentWithExternalStores(finishedWork) {
      for (var node = finishedWork; ;) {
        var tag = node.tag;
        if (
          (tag === 0 || tag === 11 || tag === 15) &&
          node.flags & 16384 &&
          ((tag = node.updateQueue), tag !== null && ((tag = tag.stores), tag !== null))
        )
          for (var i = 0; i < tag.length; i++) {
            var check = tag[i];
            var getSnapshot = check.getSnapshot;
            check = check.value;
            try {
              if (!objectIs(getSnapshot(), check)) return false;
            } catch (error) {
              return false;
            }
          }
        tag = node.child;
        if (node.subtreeFlags & 16384 && tag !== null) {
          tag.return = node;
          node = tag;
        } else {
          if (node === finishedWork) break;
          for (; node.sibling === null;) {
            if (node.return === null || node.return === finishedWork) return true;
            node = node.return;
          }
          node.sibling.return = node.return;
          node = node.sibling;
        }
      }
      return true;
    }
    function markRootSuspended(root, suspendedLanes, spawnedLane, didAttemptEntireTree) {
      suspendedLanes &= ~workInProgressRootPingedLanes;
      suspendedLanes &= ~workInProgressRootInterleavedUpdatedLanes;
      root.suspendedLanes |= suspendedLanes;
      root.pingedLanes &= ~suspendedLanes;
      if (didAttemptEntireTree) root.warmLanes |= suspendedLanes;
      didAttemptEntireTree = root.expirationTimes;
      for (var lanes = suspendedLanes; 0 < lanes;) {
        var index$4 = 31 - clz32(lanes);
        var lane = 1 << index$4;
        didAttemptEntireTree[index$4] = -1;
        lanes &= ~lane;
      }
      if (spawnedLane !== 0) markSpawnedDeferredLane(root, spawnedLane, suspendedLanes);
    }
    function flushSyncWork() {
      return (executionContext & 6) === 0 ? (flushSyncWorkAcrossRoots_impl(0, false), false) : true;
    }
    function resetWorkInProgressStack() {
      if (workInProgress !== null) {
        if (workInProgressSuspendedReason === 0) var interruptedWork = workInProgress.return;
        else {
          interruptedWork = workInProgress;
          lastContextDependency = currentlyRenderingFiber$1 = null;
          resetHooksOnUnwind(interruptedWork);
          thenableState$1 = null;
          thenableIndexCounter$1 = 0;
          interruptedWork = workInProgress;
        }
        for (; interruptedWork !== null;) {
          unwindInterruptedWork(interruptedWork.alternate, interruptedWork);
          interruptedWork = interruptedWork.return;
        }
        workInProgress = null;
      }
    }
    function prepareFreshStack(root, lanes) {
      var timeoutHandle = root.timeoutHandle;
      if (timeoutHandle !== noTimeout) {
        root.timeoutHandle = noTimeout;
        cancelTimeout(timeoutHandle);
      }
      timeoutHandle = root.cancelPendingCommit;
      if (timeoutHandle !== null) {
        root.cancelPendingCommit = null;
        timeoutHandle();
      }
      pendingEffectsLanes = 0;
      resetWorkInProgressStack();
      workInProgressRoot = root;
      workInProgress = timeoutHandle = createWorkInProgress(root.current, null);
      workInProgressRootRenderLanes = lanes;
      workInProgressSuspendedReason = 0;
      workInProgressThrownValue = null;
      workInProgressRootDidSkipSuspendedSiblings = false;
      workInProgressRootIsPrerendering = checkIfRootIsPrerendering(root, lanes);
      workInProgressRootDidAttachPingListener = false;
      workInProgressSuspendedRetryLanes =
        workInProgressDeferredLane =
        workInProgressRootPingedLanes =
        workInProgressRootInterleavedUpdatedLanes =
        workInProgressRootSkippedLanes =
        workInProgressRootExitStatus =
          0;
      workInProgressRootRecoverableErrors = workInProgressRootConcurrentErrors = null;
      workInProgressRootDidIncludeRecursiveRenderUpdate = false;
      if ((lanes & 8) !== 0) lanes |= lanes & 32;
      var allEntangledLanes = root.entangledLanes;
      if (allEntangledLanes !== 0)
        for (root = root.entanglements, allEntangledLanes &= lanes; 0 < allEntangledLanes;) {
          var index$2 = 31 - clz32(allEntangledLanes);
          var lane = 1 << index$2;
          lanes |= root[index$2];
          allEntangledLanes &= ~lane;
        }
      entangledRenderLanes = lanes;
      finishQueueingConcurrentUpdates();
      return timeoutHandle;
    }
    function handleThrow(root, thrownValue) {
      currentlyRenderingFiber = null;
      ReactSharedInternals.H = ContextOnlyDispatcher;
      if (thrownValue === SuspenseException || thrownValue === SuspenseActionException) {
        thrownValue = getSuspendedThenable();
        workInProgressSuspendedReason = 3;
      } else if (thrownValue === SuspenseyCommitException) {
        thrownValue = getSuspendedThenable();
        workInProgressSuspendedReason = 4;
      } else
        workInProgressSuspendedReason =
          thrownValue === SelectiveHydrationException
            ? 8
            : thrownValue !== null &&
                typeof thrownValue === "object" &&
                typeof thrownValue.then === "function"
              ? 6
              : 1;
      workInProgressThrownValue = thrownValue;
      if (workInProgress === null) {
        workInProgressRootExitStatus = 1;
        logUncaughtError(root, createCapturedValueAtFiber(thrownValue, root.current));
      }
    }
    function shouldRemainOnPreviousScreen() {
      var handler = suspenseHandlerStackCursor.current;
      return handler === null
        ? true
        : (workInProgressRootRenderLanes & 4194048) === workInProgressRootRenderLanes
          ? shellBoundary === null
            ? true
            : false
          : (workInProgressRootRenderLanes & 62914560) === workInProgressRootRenderLanes ||
              (workInProgressRootRenderLanes & 536870912) !== 0
            ? handler === shellBoundary
            : false;
    }
    function pushDispatcher() {
      var prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = ContextOnlyDispatcher;
      return prevDispatcher === null ? ContextOnlyDispatcher : prevDispatcher;
    }
    function pushAsyncDispatcher() {
      var prevAsyncDispatcher = ReactSharedInternals.A;
      ReactSharedInternals.A = DefaultAsyncDispatcher;
      return prevAsyncDispatcher;
    }
    function renderDidSuspendDelayIfPossible() {
      workInProgressRootExitStatus = 4;
      if (!(
        workInProgressRootDidSkipSuspendedSiblings ||
        ((workInProgressRootRenderLanes & 4194048) !== workInProgressRootRenderLanes &&
          suspenseHandlerStackCursor.current !== null)
      ))
        workInProgressRootIsPrerendering = true;
      if (!(
        ((workInProgressRootSkippedLanes & 134217727) === 0 &&
          (workInProgressRootInterleavedUpdatedLanes & 134217727) === 0) ||
        workInProgressRoot === null
      ))
        markRootSuspended(
          workInProgressRoot,
          workInProgressRootRenderLanes,
          workInProgressDeferredLane,
          false,
        );
    }
    function renderRootSync(root, lanes, shouldYieldForPrerendering) {
      var prevExecutionContext = executionContext;
      executionContext |= 2;
      var prevDispatcher = pushDispatcher();
      var prevAsyncDispatcher = pushAsyncDispatcher();
      if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
        workInProgressTransitions = null;
        prepareFreshStack(root, lanes);
      }
      lanes = false;
      var exitStatus = workInProgressRootExitStatus;
      e: do
        try {
          if (workInProgressSuspendedReason !== 0 && workInProgress !== null) {
            var unitOfWork = workInProgress;
            var thrownValue = workInProgressThrownValue;
            switch (workInProgressSuspendedReason) {
              case 8:
                resetWorkInProgressStack();
                exitStatus = 6;
                break e;
              case 3:
              case 2:
              case 9:
              case 6:
                if (suspenseHandlerStackCursor.current === null) lanes = true;
                var reason = workInProgressSuspendedReason;
                workInProgressSuspendedReason = 0;
                workInProgressThrownValue = null;
                throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, reason);
                if (shouldYieldForPrerendering && workInProgressRootIsPrerendering) {
                  exitStatus = 0;
                  break e;
                }
                break;
              default:
                reason = workInProgressSuspendedReason;
                workInProgressSuspendedReason = 0;
                workInProgressThrownValue = null;
                throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, reason);
            }
          }
          workLoopSync();
          exitStatus = workInProgressRootExitStatus;
          break;
        } catch (thrownValue$152) {
          handleThrow(root, thrownValue$152);
        }
      while (1);
      if (lanes) root.shellSuspendCounter++;
      lastContextDependency = currentlyRenderingFiber$1 = null;
      executionContext = prevExecutionContext;
      ReactSharedInternals.H = prevDispatcher;
      ReactSharedInternals.A = prevAsyncDispatcher;
      if (workInProgress === null) {
        workInProgressRoot = null;
        workInProgressRootRenderLanes = 0;
        finishQueueingConcurrentUpdates();
      }
      return exitStatus;
    }
    function workLoopSync() {
      for (; workInProgress !== null;) performUnitOfWork(workInProgress);
    }
    function renderRootConcurrent(root, lanes) {
      var prevExecutionContext = executionContext;
      executionContext |= 2;
      var prevDispatcher = pushDispatcher();
      var prevAsyncDispatcher = pushAsyncDispatcher();
      if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
        workInProgressTransitions = null;
        workInProgressRootRenderTargetTime = now() + 500;
        prepareFreshStack(root, lanes);
      } else workInProgressRootIsPrerendering = checkIfRootIsPrerendering(root, lanes);
      e: do
        try {
          if (workInProgressSuspendedReason !== 0 && workInProgress !== null) {
            lanes = workInProgress;
            var thrownValue = workInProgressThrownValue;
            t: switch (workInProgressSuspendedReason) {
              case 1:
                workInProgressSuspendedReason = 0;
                workInProgressThrownValue = null;
                throwAndUnwindWorkLoop(root, lanes, thrownValue, 1);
                break;
              case 2:
              case 9:
                if (isThenableResolved(thrownValue)) {
                  workInProgressSuspendedReason = 0;
                  workInProgressThrownValue = null;
                  replaySuspendedUnitOfWork(lanes);
                  break;
                }
                lanes = function () {
                  if (!(
                    (workInProgressSuspendedReason !== 2 && workInProgressSuspendedReason !== 9) ||
                    workInProgressRoot !== root
                  ))
                    workInProgressSuspendedReason = 7;
                  ensureRootIsScheduled(root);
                };
                thrownValue.then(lanes, lanes);
                break e;
              case 3:
                workInProgressSuspendedReason = 7;
                break e;
              case 4:
                workInProgressSuspendedReason = 5;
                break e;
              case 7:
                if (isThenableResolved(thrownValue)) {
                  workInProgressSuspendedReason = 0;
                  workInProgressThrownValue = null;
                  replaySuspendedUnitOfWork(lanes);
                } else {
                  workInProgressSuspendedReason = 0;
                  workInProgressThrownValue = null;
                  throwAndUnwindWorkLoop(root, lanes, thrownValue, 7);
                }
                break;
              case 5:
                var resource = null;
                switch (workInProgress.tag) {
                  case 26:
                    resource = workInProgress.memoizedState;
                  case 5:
                  case 27:
                    var hostFiber = workInProgress;
                    var { type, pendingProps } = hostFiber;
                    if (
                      resource
                        ? preloadResource(resource)
                        : preloadInstance(hostFiber.stateNode, type, pendingProps)
                    ) {
                      workInProgressSuspendedReason = 0;
                      workInProgressThrownValue = null;
                      var sibling = hostFiber.sibling;
                      if (sibling !== null) workInProgress = sibling;
                      else {
                        var returnFiber = hostFiber.return;
                        if (returnFiber !== null) {
                          workInProgress = returnFiber;
                          completeUnitOfWork(returnFiber);
                        } else workInProgress = null;
                      }
                      break t;
                    }
                }
                workInProgressSuspendedReason = 0;
                workInProgressThrownValue = null;
                throwAndUnwindWorkLoop(root, lanes, thrownValue, 5);
                break;
              case 6:
                workInProgressSuspendedReason = 0;
                workInProgressThrownValue = null;
                throwAndUnwindWorkLoop(root, lanes, thrownValue, 6);
                break;
              case 8:
                resetWorkInProgressStack();
                workInProgressRootExitStatus = 6;
                break e;
              default:
                throw Error(formatProdErrorMessage(462));
            }
          }
          workLoopConcurrentByScheduler();
          break;
        } catch (thrownValue$154) {
          handleThrow(root, thrownValue$154);
        }
      while (1);
      lastContextDependency = currentlyRenderingFiber$1 = null;
      ReactSharedInternals.H = prevDispatcher;
      ReactSharedInternals.A = prevAsyncDispatcher;
      executionContext = prevExecutionContext;
      if (workInProgress !== null) return 0;
      workInProgressRoot = null;
      workInProgressRootRenderLanes = 0;
      finishQueueingConcurrentUpdates();
      return workInProgressRootExitStatus;
    }
    function workLoopConcurrentByScheduler() {
      for (; workInProgress !== null && !shouldYield();) performUnitOfWork(workInProgress);
    }
    function performUnitOfWork(unitOfWork) {
      var next = beginWork(unitOfWork.alternate, unitOfWork, entangledRenderLanes);
      unitOfWork.memoizedProps = unitOfWork.pendingProps;
      if (next === null) completeUnitOfWork(unitOfWork);
      else workInProgress = next;
    }
    function replaySuspendedUnitOfWork(unitOfWork) {
      var next = unitOfWork;
      var current = next.alternate;
      switch (next.tag) {
        case 15:
        case 0:
          next = replayFunctionComponent(
            current,
            next,
            next.pendingProps,
            next.type,
            undefined,
            workInProgressRootRenderLanes,
          );
          break;
        case 11:
          next = replayFunctionComponent(
            current,
            next,
            next.pendingProps,
            next.type.render,
            next.ref,
            workInProgressRootRenderLanes,
          );
          break;
        case 5:
          resetHooksOnUnwind(next);
        default:
          unwindInterruptedWork(current, next);
          next = workInProgress = resetWorkInProgress(next, entangledRenderLanes);
          next = beginWork(current, next, entangledRenderLanes);
      }
      unitOfWork.memoizedProps = unitOfWork.pendingProps;
      if (next === null) completeUnitOfWork(unitOfWork);
      else workInProgress = next;
    }
    function throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, suspendedReason) {
      lastContextDependency = currentlyRenderingFiber$1 = null;
      resetHooksOnUnwind(unitOfWork);
      thenableState$1 = null;
      thenableIndexCounter$1 = 0;
      var returnFiber = unitOfWork.return;
      try {
        if (throwException(root, returnFiber, unitOfWork, thrownValue, workInProgressRootRenderLanes)) {
          workInProgressRootExitStatus = 1;
          logUncaughtError(root, createCapturedValueAtFiber(thrownValue, root.current));
          workInProgress = null;
          return;
        }
      } catch (error) {
        if (returnFiber !== null) {
          workInProgress = returnFiber;
          throw error;
        }
        workInProgressRootExitStatus = 1;
        logUncaughtError(root, createCapturedValueAtFiber(thrownValue, root.current));
        workInProgress = null;
        return;
      }
      if (unitOfWork.flags & 32768) {
        if (isHydrating || suspendedReason === 1) root = true;
        else if (workInProgressRootIsPrerendering || (workInProgressRootRenderLanes & 536870912) !== 0)
          root = false;
        else {
          workInProgressRootDidSkipSuspendedSiblings = root = true;
          if (
            suspendedReason === 2 ||
            suspendedReason === 9 ||
            suspendedReason === 3 ||
            suspendedReason === 6
          ) {
            suspendedReason = suspenseHandlerStackCursor.current;
            if (suspendedReason !== null && suspendedReason.tag === 13) suspendedReason.flags |= 16384;
          }
        }
        unwindUnitOfWork(unitOfWork, root);
      } else completeUnitOfWork(unitOfWork);
    }
    function completeUnitOfWork(unitOfWork) {
      var completedWork = unitOfWork;
      do {
        if ((completedWork.flags & 32768) !== 0) {
          unwindUnitOfWork(completedWork, workInProgressRootDidSkipSuspendedSiblings);
          return;
        }
        unitOfWork = completedWork.return;
        var next = completeWork(completedWork.alternate, completedWork, entangledRenderLanes);
        if (next !== null) {
          workInProgress = next;
          return;
        }
        completedWork = completedWork.sibling;
        if (completedWork !== null) {
          workInProgress = completedWork;
          return;
        }
        workInProgress = completedWork = unitOfWork;
      } while (completedWork !== null);
      if (workInProgressRootExitStatus === 0) workInProgressRootExitStatus = 5;
    }
    function unwindUnitOfWork(unitOfWork, skipSiblings) {
      do {
        var next = unwindWork(unitOfWork.alternate, unitOfWork);
        if (next !== null) {
          next.flags &= 32767;
          workInProgress = next;
          return;
        }
        next = unitOfWork.return;
        if (next !== null) {
          next.flags |= 32768;
          next.subtreeFlags = 0;
          next.deletions = null;
        }
        if (!skipSiblings && ((unitOfWork = unitOfWork.sibling), unitOfWork !== null)) {
          workInProgress = unitOfWork;
          return;
        }
        workInProgress = unitOfWork = next;
      } while (unitOfWork !== null);
      workInProgressRootExitStatus = 6;
      workInProgress = null;
    }
    function commitRoot(
      root,
      finishedWork,
      lanes,
      recoverableErrors,
      transitions,
      didIncludeRenderPhaseUpdate,
      spawnedLane,
      updatedLanes,
      suspendedRetryLanes,
    ) {
      root.cancelPendingCommit = null;
      do flushPendingEffects();
      while (pendingEffectsStatus !== 0);
      if ((executionContext & 6) !== 0) throw Error(formatProdErrorMessage(327));
      if (finishedWork !== null) {
        if (finishedWork === root.current) throw Error(formatProdErrorMessage(177));
        didIncludeRenderPhaseUpdate = finishedWork.lanes | finishedWork.childLanes;
        didIncludeRenderPhaseUpdate |= concurrentlyUpdatedLanes;
        markRootFinished(
          root,
          lanes,
          didIncludeRenderPhaseUpdate,
          spawnedLane,
          updatedLanes,
          suspendedRetryLanes,
        );
        if (root === workInProgressRoot) {
          workInProgress = workInProgressRoot = null;
          workInProgressRootRenderLanes = 0;
        }
        pendingFinishedWork = finishedWork;
        pendingEffectsRoot = root;
        pendingEffectsLanes = lanes;
        pendingEffectsRemainingLanes = didIncludeRenderPhaseUpdate;
        pendingPassiveTransitions = transitions;
        pendingRecoverableErrors = recoverableErrors;
        if ((finishedWork.subtreeFlags & 10256) !== 0 || (finishedWork.flags & 10256) !== 0) {
          root.callbackNode = null;
          root.callbackPriority = 0;
          scheduleCallback(NormalPriority$1, function () {
            flushPassiveEffects();
            return null;
          });
        } else {
          root.callbackNode = null;
          root.callbackPriority = 0;
        }
        recoverableErrors = (finishedWork.flags & 13878) !== 0;
        if ((finishedWork.subtreeFlags & 13878) !== 0 || recoverableErrors) {
          recoverableErrors = ReactSharedInternals.T;
          ReactSharedInternals.T = null;
          transitions = getCurrentUpdatePriority();
          setCurrentUpdatePriority(2);
          spawnedLane = executionContext;
          executionContext |= 4;
          try {
            commitBeforeMutationEffects(root, finishedWork, lanes);
          } finally {
            executionContext = spawnedLane;
            setCurrentUpdatePriority(transitions);
            ReactSharedInternals.T = recoverableErrors;
          }
        }
        pendingEffectsStatus = 1;
        flushMutationEffects();
        flushLayoutEffects();
        flushSpawnedWork();
      }
    }
    function flushMutationEffects() {
      if (pendingEffectsStatus === 1) {
        pendingEffectsStatus = 0;
        var root = pendingEffectsRoot;
        var finishedWork = pendingFinishedWork;
        var rootMutationHasEffect = (finishedWork.flags & 13878) !== 0;
        if ((finishedWork.subtreeFlags & 13878) !== 0 || rootMutationHasEffect) {
          rootMutationHasEffect = ReactSharedInternals.T;
          ReactSharedInternals.T = null;
          var previousPriority = getCurrentUpdatePriority();
          setCurrentUpdatePriority(2);
          var prevExecutionContext = executionContext;
          executionContext |= 4;
          try {
            commitMutationEffectsOnFiber(finishedWork, root);
            resetAfterCommit(root.containerInfo);
          } finally {
            executionContext = prevExecutionContext;
            setCurrentUpdatePriority(previousPriority);
            ReactSharedInternals.T = rootMutationHasEffect;
          }
        }
        root.current = finishedWork;
        pendingEffectsStatus = 2;
      }
    }
    function flushLayoutEffects() {
      if (pendingEffectsStatus === 2) {
        pendingEffectsStatus = 0;
        var root = pendingEffectsRoot;
        var finishedWork = pendingFinishedWork;
        var rootHasLayoutEffect = (finishedWork.flags & 8772) !== 0;
        if ((finishedWork.subtreeFlags & 8772) !== 0 || rootHasLayoutEffect) {
          rootHasLayoutEffect = ReactSharedInternals.T;
          ReactSharedInternals.T = null;
          var previousPriority = getCurrentUpdatePriority();
          setCurrentUpdatePriority(2);
          var prevExecutionContext = executionContext;
          executionContext |= 4;
          try {
            commitLayoutEffectOnFiber(root, finishedWork.alternate, finishedWork);
          } finally {
            executionContext = prevExecutionContext;
            setCurrentUpdatePriority(previousPriority);
            ReactSharedInternals.T = rootHasLayoutEffect;
          }
        }
        pendingEffectsStatus = 3;
      }
    }
    function flushSpawnedWork() {
      if (pendingEffectsStatus === 4 || pendingEffectsStatus === 3) {
        pendingEffectsStatus = 0;
        requestPaint();
        var root = pendingEffectsRoot;
        var finishedWork = pendingFinishedWork;
        var lanes = pendingEffectsLanes;
        var recoverableErrors = pendingRecoverableErrors;
        if ((finishedWork.subtreeFlags & 10256) !== 0 || (finishedWork.flags & 10256) !== 0)
          pendingEffectsStatus = 5;
        else {
          detachAlternateSiblingsFrom(finishedWork);
          pendingEffectsStatus = 0;
          pendingFinishedWork = pendingEffectsRoot = null;
          releaseRootPooledCache(root, root.pendingLanes);
        }
        var remainingLanes = root.pendingLanes;
        if (remainingLanes === 0) legacyErrorBoundariesThatAlreadyFailed = null;
        lanesToEventPriority(lanes);
        finishedWork = finishedWork.stateNode;
        if (injectedHook && typeof injectedHook.onCommitFiberRoot === "function")
          try {
            injectedHook.onCommitFiberRoot(
              rendererID,
              finishedWork,
              undefined,
              (finishedWork.current.flags & 128) === 128,
            );
          } catch (err) {}
        if (recoverableErrors !== null) {
          finishedWork = ReactSharedInternals.T;
          remainingLanes = getCurrentUpdatePriority();
          setCurrentUpdatePriority(2);
          ReactSharedInternals.T = null;
          try {
            for (var onRecoverableError = root.onRecoverableError, i = 0; i < recoverableErrors.length; i++) {
              var recoverableError = recoverableErrors[i];
              onRecoverableError(recoverableError.value, {
                componentStack: recoverableError.stack,
              });
            }
          } finally {
            ReactSharedInternals.T = finishedWork;
            setCurrentUpdatePriority(remainingLanes);
          }
        }
        if ((pendingEffectsLanes & 3) !== 0) flushPendingEffects();
        ensureRootIsScheduled(root);
        remainingLanes = root.pendingLanes;
        if ((lanes & 261930) !== 0 && (remainingLanes & 42) !== 0) {
          if (root === rootWithNestedUpdates) nestedUpdateCount++;
          else {
            nestedUpdateCount = 0;
            rootWithNestedUpdates = root;
          }
        } else nestedUpdateCount = 0;
        if (supportsHydration) flushHydrationEvents();
        flushSyncWorkAcrossRoots_impl(0, false);
      }
    }
    function releaseRootPooledCache(root, remainingLanes) {
      if ((root.pooledCacheLanes &= remainingLanes) === 0) {
        remainingLanes = root.pooledCache;
        if (remainingLanes != null) {
          root.pooledCache = null;
          releaseCache(remainingLanes);
        }
      }
    }
    function flushPendingEffects() {
      flushMutationEffects();
      flushLayoutEffects();
      flushSpawnedWork();
      return flushPassiveEffects();
    }
    function flushPassiveEffects() {
      if (pendingEffectsStatus !== 5) return false;
      var root = pendingEffectsRoot;
      var remainingLanes = pendingEffectsRemainingLanes;
      pendingEffectsRemainingLanes = 0;
      var renderPriority = lanesToEventPriority(pendingEffectsLanes);
      var priority = 32 > renderPriority ? 32 : renderPriority;
      renderPriority = ReactSharedInternals.T;
      var previousPriority = getCurrentUpdatePriority();
      try {
        setCurrentUpdatePriority(priority);
        ReactSharedInternals.T = null;
        priority = pendingPassiveTransitions;
        pendingPassiveTransitions = null;
        var root$jscomp$0 = pendingEffectsRoot;
        var lanes = pendingEffectsLanes;
        pendingEffectsStatus = 0;
        pendingFinishedWork = pendingEffectsRoot = null;
        pendingEffectsLanes = 0;
        if ((executionContext & 6) !== 0) throw Error(formatProdErrorMessage(331));
        var prevExecutionContext = executionContext;
        executionContext |= 4;
        commitPassiveUnmountOnFiber(root$jscomp$0.current);
        commitPassiveMountOnFiber(root$jscomp$0, root$jscomp$0.current, lanes, priority);
        executionContext = prevExecutionContext;
        flushSyncWorkAcrossRoots_impl(0, false);
        if (injectedHook && typeof injectedHook.onPostCommitFiberRoot === "function")
          try {
            injectedHook.onPostCommitFiberRoot(rendererID, root$jscomp$0);
          } catch (err) {}
        detachAlternateSiblingsFrom(root$jscomp$0.current);
        return true;
      } finally {
        setCurrentUpdatePriority(previousPriority);
        ReactSharedInternals.T = renderPriority;
        releaseRootPooledCache(root, remainingLanes);
      }
    }
    function detachAlternateSiblingsFrom(parentFiber) {
      var fiber = parentFiber;
      for (;;) {
        var alternate = fiber.alternate;
        var siblingWasDetached = false;
        if (alternate !== null) {
          if (
            alternate.memoizedProps !== null ||
            alternate.memoizedState !== null ||
            alternate.pendingProps !== null ||
            alternate.dependencies !== null
          ) {
            alternate.memoizedState = null;
            alternate.memoizedProps = null;
            alternate.dependencies = null;
            alternate.pendingProps = null;
            siblingWasDetached = true;
          }
        }
        if ((siblingWasDetached || fiber === parentFiber) && fiber.child !== null) {
          fiber.child.return = fiber;
          fiber = fiber.child;
          continue;
        }
        if (fiber === parentFiber) return;
        for (; fiber.sibling === null;) {
          if (fiber.return === null || fiber.return === parentFiber) return;
          fiber = fiber.return;
        }
        fiber.sibling.return = fiber.return;
        fiber = fiber.sibling;
      }
    }
    function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
      sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
      sourceFiber = createRootErrorUpdate(rootFiber.stateNode, sourceFiber, 2);
      rootFiber = enqueueUpdate(rootFiber, sourceFiber, 2);
      if (rootFiber !== null) {
        markRootUpdated$1(rootFiber, 2);
        ensureRootIsScheduled(rootFiber);
      }
    }
    function captureCommitPhaseError(sourceFiber, nearestMountedAncestor, error) {
      if (sourceFiber.tag === 3) captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error);
      else
        for (; nearestMountedAncestor !== null;) {
          if (nearestMountedAncestor.tag === 3) {
            captureCommitPhaseErrorOnRoot(nearestMountedAncestor, sourceFiber, error);
            break;
          } else if (nearestMountedAncestor.tag === 1) {
            var instance = nearestMountedAncestor.stateNode;
            if (
              typeof nearestMountedAncestor.type.getDerivedStateFromError === "function" ||
              (typeof instance.componentDidCatch === "function" &&
                (legacyErrorBoundariesThatAlreadyFailed === null ||
                  !legacyErrorBoundariesThatAlreadyFailed.has(instance)))
            ) {
              sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
              error = createClassErrorUpdate(2);
              instance = enqueueUpdate(nearestMountedAncestor, error, 2);
              if (instance !== null) {
                initializeClassErrorUpdate(error, instance, nearestMountedAncestor, sourceFiber);
                markRootUpdated$1(instance, 2);
                ensureRootIsScheduled(instance);
              }
              break;
            }
          }
          nearestMountedAncestor = nearestMountedAncestor.return;
        }
    }
    function attachPingListener(root, wakeable, lanes) {
      var pingCache = root.pingCache;
      if (pingCache === null) {
        pingCache = root.pingCache = new PossiblyWeakMap();
        var threadIDs = new Set();
        pingCache.set(wakeable, threadIDs);
      } else {
        threadIDs = pingCache.get(wakeable);
        if (threadIDs === undefined) {
          threadIDs = new Set();
          pingCache.set(wakeable, threadIDs);
        }
      }
      if (!threadIDs.has(lanes)) {
        workInProgressRootDidAttachPingListener = true;
        threadIDs.add(lanes);
        root = pingSuspendedRoot.bind(null, root, wakeable, lanes);
        wakeable.then(root, root);
      }
    }
    function pingSuspendedRoot(root, wakeable, pingedLanes) {
      var pingCache = root.pingCache;
      if (pingCache !== null) pingCache.delete(wakeable);
      root.pingedLanes |= root.suspendedLanes & pingedLanes;
      root.warmLanes &= ~pingedLanes;
      if (workInProgressRoot === root && (workInProgressRootRenderLanes & pingedLanes) === pingedLanes) {
        if (
          workInProgressRootExitStatus === 4 ||
          (workInProgressRootExitStatus === 3 &&
            (workInProgressRootRenderLanes & 62914560) === workInProgressRootRenderLanes &&
            0 > now() - globalMostRecentFallbackTime)
        ) {
          if ((executionContext & 2) === 0) prepareFreshStack(root, 0);
        } else workInProgressRootPingedLanes |= pingedLanes;
        if (workInProgressSuspendedRetryLanes === workInProgressRootRenderLanes)
          workInProgressSuspendedRetryLanes = 0;
      }
      ensureRootIsScheduled(root);
    }
    function retryTimedOutBoundary(boundaryFiber, retryLane) {
      if (retryLane === 0) retryLane = claimNextRetryLane();
      boundaryFiber = enqueueConcurrentRenderForLane(boundaryFiber, retryLane);
      if (boundaryFiber !== null) {
        markRootUpdated$1(boundaryFiber, retryLane);
        ensureRootIsScheduled(boundaryFiber);
      }
    }
    function retryDehydratedSuspenseBoundary(boundaryFiber) {
      var suspenseState = boundaryFiber.memoizedState;
      var retryLane = 0;
      if (suspenseState !== null) retryLane = suspenseState.retryLane;
      retryTimedOutBoundary(boundaryFiber, retryLane);
    }
    function resolveRetryWakeable(boundaryFiber, wakeable) {
      var retryLane = 0;
      switch (boundaryFiber.tag) {
        case 31:
        case 13:
          var { stateNode: retryCache, memoizedState } = boundaryFiber;
          if (memoizedState !== null) retryLane = memoizedState.retryLane;
          break;
        case 19:
          retryCache = boundaryFiber.stateNode;
          break;
        case 22:
          retryCache = boundaryFiber.stateNode._retryCache;
          break;
        default:
          throw Error(formatProdErrorMessage(314));
      }
      if (retryCache !== null) retryCache.delete(wakeable);
      retryTimedOutBoundary(boundaryFiber, retryLane);
    }
    function scheduleCallback(priorityLevel, callback) {
      return scheduleCallback$3(priorityLevel, callback);
    }
    function FiberNode(tag, pendingProps, key, mode) {
      this.tag = tag;
      this.key = key;
      this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
      this.index = 0;
      this.refCleanup = this.ref = null;
      this.pendingProps = pendingProps;
      this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
      this.mode = mode;
      this.subtreeFlags = this.flags = 0;
      this.deletions = null;
      this.childLanes = this.lanes = 0;
      this.alternate = null;
    }
    function shouldConstruct(Component) {
      Component = Component.prototype;
      return !(!Component || !Component.isReactComponent);
    }
    function createWorkInProgress(current, pendingProps) {
      var workInProgress = current.alternate;
      if (workInProgress === null) {
        workInProgress = createFiber(current.tag, pendingProps, current.key, current.mode);
        workInProgress.elementType = current.elementType;
        workInProgress.type = current.type;
        workInProgress.stateNode = current.stateNode;
        workInProgress.alternate = current;
        current.alternate = workInProgress;
      } else {
        workInProgress.pendingProps = pendingProps;
        workInProgress.type = current.type;
        workInProgress.flags = 0;
        workInProgress.subtreeFlags = 0;
        workInProgress.deletions = null;
      }
      workInProgress.flags = current.flags & 65011712;
      workInProgress.childLanes = current.childLanes;
      workInProgress.lanes = current.lanes;
      workInProgress.child = current.child;
      workInProgress.memoizedProps = current.memoizedProps;
      workInProgress.memoizedState = current.memoizedState;
      workInProgress.updateQueue = current.updateQueue;
      pendingProps = current.dependencies;
      workInProgress.dependencies =
        pendingProps === null
          ? null
          : {
              lanes: pendingProps.lanes,
              firstContext: pendingProps.firstContext,
            };
      workInProgress.sibling = current.sibling;
      workInProgress.index = current.index;
      workInProgress.ref = current.ref;
      workInProgress.refCleanup = current.refCleanup;
      return workInProgress;
    }
    function resetWorkInProgress(workInProgress, renderLanes) {
      workInProgress.flags &= 65011714;
      var current = workInProgress.alternate;
      if (current === null) {
        workInProgress.childLanes = 0;
        workInProgress.lanes = renderLanes;
        workInProgress.child = null;
        workInProgress.subtreeFlags = 0;
        workInProgress.memoizedProps = null;
        workInProgress.memoizedState = null;
        workInProgress.updateQueue = null;
        workInProgress.dependencies = null;
        workInProgress.stateNode = null;
      } else {
        workInProgress.childLanes = current.childLanes;
        workInProgress.lanes = current.lanes;
        workInProgress.child = current.child;
        workInProgress.subtreeFlags = 0;
        workInProgress.deletions = null;
        workInProgress.memoizedProps = current.memoizedProps;
        workInProgress.memoizedState = current.memoizedState;
        workInProgress.updateQueue = current.updateQueue;
        workInProgress.type = current.type;
        renderLanes = current.dependencies;
        workInProgress.dependencies =
          renderLanes === null
            ? null
            : {
                lanes: renderLanes.lanes,
                firstContext: renderLanes.firstContext,
              };
      }
      return workInProgress;
    }
    function createFiberFromTypeAndProps(type, key, pendingProps, owner, mode, lanes) {
      var fiberTag = 0;
      owner = type;
      if (typeof type === "function") {
        if (shouldConstruct(type)) fiberTag = 1;
      } else if (typeof type === "string")
        fiberTag =
          supportsResources && supportsSingletons
            ? isHostHoistableType(type, pendingProps, contextStackCursor.current)
              ? 26
              : isHostSingletonType(type)
                ? 27
                : 5
            : supportsResources
              ? isHostHoistableType(type, pendingProps, contextStackCursor.current)
                ? 26
                : 5
              : supportsSingletons
                ? isHostSingletonType(type)
                  ? 27
                  : 5
                : 5;
      else
        e: switch (type) {
          case REACT_ACTIVITY_TYPE:
            type = createFiber(31, pendingProps, key, mode);
            type.elementType = REACT_ACTIVITY_TYPE;
            type.lanes = lanes;
            return type;
          case REACT_FRAGMENT_TYPE:
            return createFiberFromFragment(pendingProps.children, mode, lanes, key);
          case REACT_STRICT_MODE_TYPE:
            fiberTag = 8;
            mode |= 24;
            break;
          case REACT_PROFILER_TYPE:
            type = createFiber(12, pendingProps, key, mode | 2);
            type.elementType = REACT_PROFILER_TYPE;
            type.lanes = lanes;
            return type;
          case REACT_SUSPENSE_TYPE:
            type = createFiber(13, pendingProps, key, mode);
            type.elementType = REACT_SUSPENSE_TYPE;
            type.lanes = lanes;
            return type;
          case REACT_SUSPENSE_LIST_TYPE:
            type = createFiber(19, pendingProps, key, mode);
            type.elementType = REACT_SUSPENSE_LIST_TYPE;
            type.lanes = lanes;
            return type;
          default:
            if (typeof type === "object" && type !== null)
              switch (type.$$typeof) {
                case REACT_CONTEXT_TYPE:
                  fiberTag = 10;
                  break e;
                case REACT_CONSUMER_TYPE:
                  fiberTag = 9;
                  break e;
                case REACT_FORWARD_REF_TYPE:
                  fiberTag = 11;
                  break e;
                case REACT_MEMO_TYPE:
                  fiberTag = 14;
                  break e;
                case REACT_LAZY_TYPE:
                  fiberTag = 16;
                  owner = null;
                  break e;
              }
            fiberTag = 29;
            pendingProps = Error(formatProdErrorMessage(130, type === null ? "null" : typeof type, ""));
            owner = null;
        }
      key = createFiber(fiberTag, pendingProps, key, mode);
      key.elementType = type;
      key.type = owner;
      key.lanes = lanes;
      return key;
    }
    function createFiberFromFragment(elements, mode, lanes, key) {
      elements = createFiber(7, elements, key, mode);
      elements.lanes = lanes;
      return elements;
    }
    function createFiberFromText(content, mode, lanes) {
      content = createFiber(6, content, null, mode);
      content.lanes = lanes;
      return content;
    }
    function createFiberFromDehydratedFragment(dehydratedNode) {
      var fiber = createFiber(18, null, null, 0);
      fiber.stateNode = dehydratedNode;
      return fiber;
    }
    function createFiberFromPortal(portal, mode, lanes) {
      mode = createFiber(4, portal.children !== null ? portal.children : [], portal.key, mode);
      mode.lanes = lanes;
      mode.stateNode = {
        containerInfo: portal.containerInfo,
        pendingChildren: null,
        implementation: portal.implementation,
      };
      return mode;
    }
    function FiberRootNode(
      containerInfo,
      tag,
      hydrate,
      identifierPrefix,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      onDefaultTransitionIndicator,
      formState,
    ) {
      this.tag = 1;
      this.containerInfo = containerInfo;
      this.pingCache = this.current = this.pendingChildren = null;
      this.timeoutHandle = noTimeout;
      this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null;
      this.callbackPriority = 0;
      this.expirationTimes = createLaneMap(-1);
      this.entangledLanes =
        this.shellSuspendCounter =
        this.errorRecoveryDisabledLanes =
        this.expiredLanes =
        this.warmLanes =
        this.pingedLanes =
        this.suspendedLanes =
        this.pendingLanes =
          0;
      this.entanglements = createLaneMap(0);
      this.hiddenUpdates = createLaneMap(null);
      this.identifierPrefix = identifierPrefix;
      this.onUncaughtError = onUncaughtError;
      this.onCaughtError = onCaughtError;
      this.onRecoverableError = onRecoverableError;
      this.pooledCache = null;
      this.pooledCacheLanes = 0;
      this.formState = formState;
      this.incompleteTransitions = new Map();
    }
    function createFiberRoot(
      containerInfo,
      tag,
      hydrate,
      initialChildren,
      hydrationCallbacks,
      isStrictMode,
      identifierPrefix,
      formState,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      onDefaultTransitionIndicator,
    ) {
      containerInfo = new FiberRootNode(
        containerInfo,
        tag,
        hydrate,
        identifierPrefix,
        onUncaughtError,
        onCaughtError,
        onRecoverableError,
        onDefaultTransitionIndicator,
        formState,
      );
      tag = 1;
      if (isStrictMode === true) tag |= 24;
      isStrictMode = createFiber(3, null, null, tag);
      containerInfo.current = isStrictMode;
      isStrictMode.stateNode = containerInfo;
      tag = createCache();
      tag.refCount++;
      containerInfo.pooledCache = tag;
      tag.refCount++;
      isStrictMode.memoizedState = {
        element: initialChildren,
        isDehydrated: hydrate,
        cache: tag,
      };
      initializeUpdateQueue(isStrictMode);
      return containerInfo;
    }
    function getContextForSubtree(parentComponent) {
      if (!parentComponent) return emptyContextObject;
      parentComponent = emptyContextObject;
      return parentComponent;
    }
    function findHostInstance(component) {
      var fiber = component._reactInternals;
      if (fiber === undefined) {
        if (typeof component.render === "function") throw Error(formatProdErrorMessage(188));
        component = Object.keys(component).join(",");
        throw Error(formatProdErrorMessage(268, component));
      }
      component = findCurrentFiberUsingSlowPath(fiber);
      component = component !== null ? findCurrentHostFiberImpl(component) : null;
      return component === null ? null : getPublicInstance(component.stateNode);
    }
    function updateContainerImpl(rootFiber, lane, element, container, parentComponent, callback) {
      parentComponent = getContextForSubtree(parentComponent);
      if (container.context === null) container.context = parentComponent;
      else container.pendingContext = parentComponent;
      container = createUpdate(lane);
      container.payload = {
        element,
      };
      callback = callback === undefined ? null : callback;
      if (callback !== null) container.callback = callback;
      element = enqueueUpdate(rootFiber, container, lane);
      if (element !== null) {
        scheduleUpdateOnFiber(element, rootFiber, lane);
        entangleTransitions(element, rootFiber, lane);
      }
    }
    function markRetryLaneImpl(fiber, retryLane) {
      fiber = fiber.memoizedState;
      if (fiber !== null && fiber.dehydrated !== null) {
        var a = fiber.retryLane;
        fiber.retryLane = a !== 0 && a < retryLane ? a : retryLane;
      }
    }
    function markRetryLaneIfNotHydrated(fiber, retryLane) {
      markRetryLaneImpl(fiber, retryLane);
      if ((fiber = fiber.alternate)) markRetryLaneImpl(fiber, retryLane);
    }
    var internals = {};
    var assign = Object.assign;
    var REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element");
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
    var REACT_PORTAL_TYPE = Symbol.for("react.portal");
    var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
    var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
    var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
    var REACT_CONTEXT_TYPE = Symbol.for("react.context");
    var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
    var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
    var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
    var REACT_MEMO_TYPE = Symbol.for("react.memo");
    var REACT_LAZY_TYPE = Symbol.for("react.lazy");
    var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
    var REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
    var REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
    var isArrayImpl = Array.isArray;
    var ReactSharedInternals = addTransitionType;
    var {
      rendererVersion,
      rendererPackageName,
      extraDevToolsConfig,
      getPublicInstance,
      getRootHostContext,
      getChildHostContext,
      prepareForCommit,
      resetAfterCommit,
      createInstance,
    } = hostConfig;
    hostConfig.cloneMutableInstance;
    var { appendInitialChild, finalizeInitialChildren, shouldSetTextContent, createTextInstance } =
      hostConfig;
    hostConfig.cloneMutableTextInstance;
    var { scheduleTimeout, cancelTimeout, noTimeout, isPrimaryRenderer } = hostConfig;
    hostConfig.warnsIfNotActing;
    var { supportsMutation, supportsPersistence, supportsHydration, getInstanceFromNode } = hostConfig;
    hostConfig.beforeActiveInstanceBlur;
    var preparePortalMount = hostConfig.preparePortalMount;
    hostConfig.prepareScopeUpdate;
    hostConfig.getInstanceFromScope;
    var { setCurrentUpdatePriority, getCurrentUpdatePriority, resolveUpdatePriority } = hostConfig;
    hostConfig.trackSchedulerEvent;
    hostConfig.resolveEventType;
    hostConfig.resolveEventTimeStamp;
    var { shouldAttemptEagerTransition, detachDeletedInstance } = hostConfig;
    hostConfig.requestPostPaintCallback;
    var {
      maySuspendCommit,
      maySuspendCommitOnUpdate,
      maySuspendCommitInSyncRender,
      preloadInstance,
      startSuspendingCommit,
      suspendInstance,
    } = hostConfig;
    hostConfig.suspendOnActiveViewTransition;
    var waitForCommitToBeReady = hostConfig.waitForCommitToBeReady;
    hostConfig.getSuspendedCommitReason;
    var { NotPendingTransition, HostTransitionContext, resetFormInstance } = hostConfig;
    hostConfig.bindToConsole;
    var {
      supportsMicrotasks,
      scheduleMicrotask,
      supportsTestSelectors,
      findFiberRoot,
      getBoundingRect,
      getTextContent,
      isHiddenSubtree,
      matchAccessibilityRole,
      setFocusIfFocusable,
      setupIntersectionObserver,
      appendChild,
      appendChildToContainer,
      commitTextUpdate,
      commitMount,
      commitUpdate,
      insertBefore,
      insertInContainerBefore,
      removeChild,
      removeChildFromContainer,
      resetTextContent,
      hideInstance,
      hideTextInstance,
      unhideInstance,
      unhideTextInstance,
    } = hostConfig;
    hostConfig.cancelViewTransitionName;
    hostConfig.cancelRootViewTransitionName;
    hostConfig.restoreRootViewTransitionName;
    hostConfig.cloneRootViewTransitionContainer;
    hostConfig.removeRootViewTransitionClone;
    hostConfig.measureClonedInstance;
    hostConfig.hasInstanceChanged;
    hostConfig.hasInstanceAffectedParent;
    hostConfig.startViewTransition;
    hostConfig.startGestureTransition;
    hostConfig.stopViewTransition;
    hostConfig.getCurrentGestureOffset;
    hostConfig.createViewTransitionInstance;
    var clearContainer = hostConfig.clearContainer;
    hostConfig.createFragmentInstance;
    hostConfig.updateFragmentInstanceFiber;
    hostConfig.commitNewChildToFragmentInstance;
    hostConfig.deleteChildFromFragmentInstance;
    var {
      cloneInstance,
      createContainerChildSet,
      appendChildToContainerChildSet,
      finalizeContainerChildren,
      replaceContainerChildren,
      cloneHiddenInstance,
      cloneHiddenTextInstance,
      isSuspenseInstancePending,
      isSuspenseInstanceFallback,
      getSuspenseInstanceFallbackErrorDetails,
      registerSuspenseInstanceRetry,
      canHydrateFormStateMarker,
      isFormStateMarkerMatching,
      getNextHydratableSibling,
      getNextHydratableSiblingAfterSingleton,
      getFirstHydratableChild,
      getFirstHydratableChildWithinContainer,
      getFirstHydratableChildWithinActivityInstance,
      getFirstHydratableChildWithinSuspenseInstance,
      getFirstHydratableChildWithinSingleton,
      canHydrateInstance,
      canHydrateTextInstance,
      canHydrateActivityInstance,
      canHydrateSuspenseInstance,
      hydrateInstance,
      hydrateTextInstance,
      hydrateActivityInstance,
      hydrateSuspenseInstance,
      getNextHydratableInstanceAfterActivityInstance,
      getNextHydratableInstanceAfterSuspenseInstance,
      commitHydratedInstance,
      commitHydratedContainer,
      commitHydratedActivityInstance,
      commitHydratedSuspenseInstance,
      finalizeHydratedChildren,
      flushHydrationEvents,
    } = hostConfig;
    hostConfig.clearActivityBoundary;
    var clearSuspenseBoundary = hostConfig.clearSuspenseBoundary;
    hostConfig.clearActivityBoundaryFromContainer;
    var {
      clearSuspenseBoundaryFromContainer,
      hideDehydratedBoundary,
      unhideDehydratedBoundary,
      shouldDeleteUnhydratedTailInstances,
    } = hostConfig;
    hostConfig.diffHydratedPropsForDevWarnings;
    hostConfig.diffHydratedTextForDevWarnings;
    hostConfig.describeHydratableInstanceForDevWarnings;
    var {
      validateHydratableInstance,
      validateHydratableTextInstance,
      supportsResources,
      isHostHoistableType,
      getHoistableRoot,
      getResource,
      acquireResource,
      releaseResource,
      hydrateHoistable,
      mountHoistable,
      unmountHoistable,
      createHoistableInstance,
      prepareToCommitHoistables,
      mayResourceSuspendCommit,
      preloadResource,
      suspendResource,
      supportsSingletons,
      resolveSingletonInstance,
      acquireSingletonInstance,
      releaseSingletonInstance,
      isHostSingletonType,
      isSingletonScope,
    } = hostConfig;
    var valueStack = [];
    var index$jscomp$0 = -1;
    var emptyContextObject = {};
    var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback;
    var { log: log$1, LN2 } = Math;
    var nextTransitionUpdateLane = 256;
    var nextTransitionDeferredLane = 262144;
    var nextRetryLane = 4194304;
    var scheduleCallback$3 = unstableScheduleCallback;
    var cancelCallback$1 = unstableCancelCallback;
    var shouldYield = shouldYieldToHost_default;
    var requestPaint = unstableRequestPaint;
    var now = unstableNow;
    var ImmediatePriority = unstableImmediatePriority;
    var UserBlockingPriority = unstableUserBlockingPriority;
    var NormalPriority$1 = unstableNormalPriority;
    var IdlePriority = unstableIdlePriority;
    var log = undefined;
    var strictModeHook = undefined;
    var rendererID = null;
    var injectedHook = null;
    var objectIs = typeof Object.is === "function" ? Object.is : is;
    var reportGlobalError =
      typeof reportError === "function"
        ? reportError
        : function (error) {
            if (typeof window === "object" && typeof window.ErrorEvent === "function") {
              var event = new window.ErrorEvent("error", {
                bubbles: true,
                cancelable: true,
                message:
                  typeof error === "object" && error !== null && typeof error.message === "string"
                    ? String(error.message)
                    : String(error),
                error,
              });
              if (!window.dispatchEvent(event)) return;
            } else if (typeof process === "object" && typeof process.emit === "function") {
              process.emit("uncaughtException", error);
              return;
            }
            console.error(error);
          };
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var prefix;
    var suffix;
    var reentry = false;
    var CapturedStacks = new WeakMap();
    var forkStack = [];
    var forkStackIndex = 0;
    var treeForkProvider = null;
    var treeForkCount = 0;
    var idStack = [];
    var idStackIndex = 0;
    var treeContextProvider = null;
    var treeContextId = 1;
    var treeContextOverflow = "";
    var contextStackCursor = createCursor(null);
    var contextFiberStackCursor = createCursor(null);
    var rootInstanceStackCursor = createCursor(null);
    var hostTransitionProviderCursor = createCursor(null);
    var hydrationParentFiber = null;
    var nextHydratableInstance = null;
    var isHydrating = false;
    var hydrationErrors = null;
    var rootOrSingletonContext = false;
    var HydrationMismatchException = Error(formatProdErrorMessage(519));
    var valueCursor = createCursor(null);
    var currentlyRenderingFiber$1 = null;
    var lastContextDependency = null;
    var AbortControllerLocal =
      typeof AbortController !== "undefined"
        ? AbortController
        : function () {
            var listeners = [];
            var signal = (this.signal = {
              aborted: false,
              addEventListener: function (type, listener) {
                listeners.push(listener);
              },
            });
            this.abort = function () {
              signal.aborted = true;
              listeners.forEach(function (listener) {
                return listener();
              });
            };
          };
    var scheduleCallback$2 = unstableScheduleCallback;
    var NormalPriority = unstableNormalPriority;
    var CacheContext = {
      $$typeof: REACT_CONTEXT_TYPE,
      Consumer: null,
      Provider: null,
      _currentValue: null,
      _currentValue2: null,
      _threadCount: 0,
    };
    var firstScheduledRoot = null;
    var lastScheduledRoot = null;
    var didScheduleMicrotask = false;
    var mightHavePendingSyncWork = false;
    var isFlushingWork = false;
    var currentEventTransitionLane = 0;
    var currentEntangledListeners = null;
    var currentEntangledPendingCount = 0;
    var currentEntangledLane = 0;
    var currentEntangledActionThenable = null;
    var prevOnStartTransitionFinish = ReactSharedInternals.S;
    ReactSharedInternals.S = function (transition, returnValue) {
      globalMostRecentTransitionTime = now();
      if (typeof returnValue === "object" && returnValue !== null && typeof returnValue.then === "function")
        entangleAsyncAction(transition, returnValue);
      if (prevOnStartTransitionFinish !== null) prevOnStartTransitionFinish(transition, returnValue);
    };
    var resumedCache = createCursor(null);
    var SuspenseException = Error(formatProdErrorMessage(460));
    var SuspenseyCommitException = Error(formatProdErrorMessage(474));
    var SuspenseActionException = Error(formatProdErrorMessage(542));
    var noopSuspenseyCommitThenable = {
      then: function () {},
    };
    var suspendedThenable = null;
    var thenableState$1 = null;
    var thenableIndexCounter$1 = 0;
    var reconcileChildFibers = createChildReconciler(true);
    var mountChildFibers = createChildReconciler(false);
    var concurrentQueues = [];
    var concurrentQueuesIndex = 0;
    var concurrentlyUpdatedLanes = 0;
    var hasForceUpdate = false;
    var didReadFromEntangledAsyncAction = false;
    var currentTreeHiddenStackCursor = createCursor(null);
    var prevEntangledRenderLanesCursor = createCursor(0);
    var suspenseHandlerStackCursor = createCursor(null);
    var shellBoundary = null;
    var suspenseStackCursor = createCursor(0);
    var renderLanes = 0;
    var currentlyRenderingFiber = null;
    var currentHook = null;
    var workInProgressHook = null;
    var didScheduleRenderPhaseUpdate = false;
    var didScheduleRenderPhaseUpdateDuringThisPass = false;
    var shouldDoubleInvokeUserFnsInHooksDEV = false;
    var localIdCounter = 0;
    var thenableIndexCounter = 0;
    var thenableState = null;
    var globalClientIdCounter = 0;
    var ContextOnlyDispatcher = {
      readContext,
      use,
      useCallback: throwInvalidHookError,
      useContext: throwInvalidHookError,
      useEffect: throwInvalidHookError,
      useImperativeHandle: throwInvalidHookError,
      useLayoutEffect: throwInvalidHookError,
      useInsertionEffect: throwInvalidHookError,
      useMemo: throwInvalidHookError,
      useReducer: throwInvalidHookError,
      useRef: throwInvalidHookError,
      useState: throwInvalidHookError,
      useDebugValue: throwInvalidHookError,
      useDeferredValue: throwInvalidHookError,
      useTransition: throwInvalidHookError,
      useSyncExternalStore: throwInvalidHookError,
      useId: throwInvalidHookError,
      useHostTransitionStatus: throwInvalidHookError,
      useFormState: throwInvalidHookError,
      useActionState: throwInvalidHookError,
      useOptimistic: throwInvalidHookError,
      useMemoCache: throwInvalidHookError,
      useCacheRefresh: throwInvalidHookError,
    };
    ContextOnlyDispatcher.useEffectEvent = throwInvalidHookError;
    var HooksDispatcherOnMount = {
      readContext,
      use,
      useCallback: function (callback, deps) {
        mountWorkInProgressHook().memoizedState = [callback, deps === undefined ? null : deps];
        return callback;
      },
      useContext: readContext,
      useEffect: mountEffect,
      useImperativeHandle: function (ref, create, deps) {
        deps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
        mountEffectImpl(4194308, 4, imperativeHandleEffect.bind(null, create, ref), deps);
      },
      useLayoutEffect: function (create, deps) {
        return mountEffectImpl(4194308, 4, create, deps);
      },
      useInsertionEffect: function (create, deps) {
        mountEffectImpl(4, 2, create, deps);
      },
      useMemo: function (nextCreate, deps) {
        var hook = mountWorkInProgressHook();
        deps = deps === undefined ? null : deps;
        var nextValue = nextCreate();
        if (shouldDoubleInvokeUserFnsInHooksDEV) {
          setIsStrictModeForDevtools(true);
          try {
            nextCreate();
          } finally {
            setIsStrictModeForDevtools(false);
          }
        }
        hook.memoizedState = [nextValue, deps];
        return nextValue;
      },
      useReducer: function (reducer, initialArg, init) {
        var hook = mountWorkInProgressHook();
        if (init !== undefined) {
          var initialState = init(initialArg);
          if (shouldDoubleInvokeUserFnsInHooksDEV) {
            setIsStrictModeForDevtools(true);
            try {
              init(initialArg);
            } finally {
              setIsStrictModeForDevtools(false);
            }
          }
        } else initialState = initialArg;
        hook.memoizedState = hook.baseState = initialState;
        reducer = {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: reducer,
          lastRenderedState: initialState,
        };
        hook.queue = reducer;
        reducer = reducer.dispatch = dispatchReducerAction.bind(null, currentlyRenderingFiber, reducer);
        return [hook.memoizedState, reducer];
      },
      useRef: function (initialValue) {
        var hook = mountWorkInProgressHook();
        initialValue = {
          current: initialValue,
        };
        return (hook.memoizedState = initialValue);
      },
      useState: function (initialState) {
        initialState = mountStateImpl(initialState);
        var queue = initialState.queue;
        var dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
        queue.dispatch = dispatch;
        return [initialState.memoizedState, dispatch];
      },
      useDebugValue: mountDebugValue,
      useDeferredValue: function (value, initialValue) {
        var hook = mountWorkInProgressHook();
        return mountDeferredValueImpl(hook, value, initialValue);
      },
      useTransition: function () {
        var stateHook = mountStateImpl(false);
        stateHook = startTransition.bind(null, currentlyRenderingFiber, stateHook.queue, true, false);
        mountWorkInProgressHook().memoizedState = stateHook;
        return [false, stateHook];
      },
      useSyncExternalStore: function (subscribe, getSnapshot, getServerSnapshot) {
        var fiber = currentlyRenderingFiber;
        var hook = mountWorkInProgressHook();
        if (isHydrating) {
          if (getServerSnapshot === undefined) throw Error(formatProdErrorMessage(407));
          getServerSnapshot = getServerSnapshot();
        } else {
          getServerSnapshot = getSnapshot();
          if (workInProgressRoot === null) throw Error(formatProdErrorMessage(349));
          if (!((workInProgressRootRenderLanes & 127) !== 0))
            pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
        }
        hook.memoizedState = getServerSnapshot;
        var inst = {
          value: getServerSnapshot,
          getSnapshot,
        };
        hook.queue = inst;
        mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [subscribe]);
        fiber.flags |= 2048;
        pushSimpleEffect(
          9,
          {
            destroy: undefined,
          },
          updateStoreInstance.bind(null, fiber, inst, getServerSnapshot, getSnapshot),
          null,
        );
        return getServerSnapshot;
      },
      useId: function () {
        var hook = mountWorkInProgressHook();
        var identifierPrefix = workInProgressRoot.identifierPrefix;
        if (isHydrating) {
          var JSCompiler_inline_result = treeContextOverflow;
          var idWithLeadingBit = treeContextId;
          JSCompiler_inline_result =
            (idWithLeadingBit & ~(1 << (32 - clz32(idWithLeadingBit) - 1))).toString(32) +
            JSCompiler_inline_result;
          identifierPrefix = "_" + identifierPrefix + "R_" + JSCompiler_inline_result;
          JSCompiler_inline_result = localIdCounter++;
          if (0 < JSCompiler_inline_result) identifierPrefix += "H" + JSCompiler_inline_result.toString(32);
          identifierPrefix += "_";
        } else {
          JSCompiler_inline_result = globalClientIdCounter++;
          identifierPrefix = "_" + identifierPrefix + "r_" + JSCompiler_inline_result.toString(32) + "_";
        }
        return (hook.memoizedState = identifierPrefix);
      },
      useHostTransitionStatus,
      useFormState: mountActionState,
      useActionState: mountActionState,
      useOptimistic: function (passthrough) {
        var hook = mountWorkInProgressHook();
        hook.memoizedState = hook.baseState = passthrough;
        var queue = {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: null,
          lastRenderedState: null,
        };
        hook.queue = queue;
        hook = dispatchOptimisticSetState.bind(null, currentlyRenderingFiber, true, queue);
        queue.dispatch = hook;
        return [passthrough, hook];
      },
      useMemoCache,
      useCacheRefresh: function () {
        return (mountWorkInProgressHook().memoizedState = refreshCache.bind(null, currentlyRenderingFiber));
      },
      useEffectEvent: function (callback) {
        var hook = mountWorkInProgressHook();
        var ref = {
          impl: callback,
        };
        hook.memoizedState = ref;
        return function () {
          if ((executionContext & 2) !== 0) throw Error(formatProdErrorMessage(440));
          return ref.impl.apply(undefined, arguments);
        };
      },
    };
    var HooksDispatcherOnUpdate = {
      readContext,
      use,
      useCallback: updateCallback,
      useContext: readContext,
      useEffect: updateEffect,
      useImperativeHandle: updateImperativeHandle,
      useInsertionEffect: updateInsertionEffect,
      useLayoutEffect: updateLayoutEffect,
      useMemo: updateMemo,
      useReducer: updateReducer,
      useRef: updateRef,
      useState: function () {
        return updateReducer(basicStateReducer);
      },
      useDebugValue: mountDebugValue,
      useDeferredValue: function (value, initialValue) {
        var hook = updateWorkInProgressHook();
        return updateDeferredValueImpl(hook, currentHook.memoizedState, value, initialValue);
      },
      useTransition: function () {
        var booleanOrThenable = updateReducer(basicStateReducer)[0];
        var start = updateWorkInProgressHook().memoizedState;
        return [
          typeof booleanOrThenable === "boolean" ? booleanOrThenable : useThenable(booleanOrThenable),
          start,
        ];
      },
      useSyncExternalStore: updateSyncExternalStore,
      useId: updateId,
      useHostTransitionStatus,
      useFormState: updateActionState,
      useActionState: updateActionState,
      useOptimistic: function (passthrough, reducer) {
        var hook = updateWorkInProgressHook();
        return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
      },
      useMemoCache,
      useCacheRefresh: updateRefresh,
    };
    HooksDispatcherOnUpdate.useEffectEvent = updateEvent;
    var HooksDispatcherOnRerender = {
      readContext,
      use,
      useCallback: updateCallback,
      useContext: readContext,
      useEffect: updateEffect,
      useImperativeHandle: updateImperativeHandle,
      useInsertionEffect: updateInsertionEffect,
      useLayoutEffect: updateLayoutEffect,
      useMemo: updateMemo,
      useReducer: rerenderReducer,
      useRef: updateRef,
      useState: function () {
        return rerenderReducer(basicStateReducer);
      },
      useDebugValue: mountDebugValue,
      useDeferredValue: function (value, initialValue) {
        var hook = updateWorkInProgressHook();
        return currentHook === null
          ? mountDeferredValueImpl(hook, value, initialValue)
          : updateDeferredValueImpl(hook, currentHook.memoizedState, value, initialValue);
      },
      useTransition: function () {
        var booleanOrThenable = rerenderReducer(basicStateReducer)[0];
        var start = updateWorkInProgressHook().memoizedState;
        return [
          typeof booleanOrThenable === "boolean" ? booleanOrThenable : useThenable(booleanOrThenable),
          start,
        ];
      },
      useSyncExternalStore: updateSyncExternalStore,
      useId: updateId,
      useHostTransitionStatus,
      useFormState: rerenderActionState,
      useActionState: rerenderActionState,
      useOptimistic: function (passthrough, reducer) {
        var hook = updateWorkInProgressHook();
        if (currentHook !== null) return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
        hook.baseState = passthrough;
        return [passthrough, hook.queue.dispatch];
      },
      useMemoCache,
      useCacheRefresh: updateRefresh,
    };
    HooksDispatcherOnRerender.useEffectEvent = updateEvent;
    var classComponentUpdater = {
      enqueueSetState: function (inst, payload, callback) {
        inst = inst._reactInternals;
        var lane = requestUpdateLane();
        var update = createUpdate(lane);
        update.payload = payload;
        if (callback !== undefined && callback !== null) update.callback = callback;
        payload = enqueueUpdate(inst, update, lane);
        if (payload !== null) {
          scheduleUpdateOnFiber(payload, inst, lane);
          entangleTransitions(payload, inst, lane);
        }
      },
      enqueueReplaceState: function (inst, payload, callback) {
        inst = inst._reactInternals;
        var lane = requestUpdateLane();
        var update = createUpdate(lane);
        update.tag = 1;
        update.payload = payload;
        if (callback !== undefined && callback !== null) update.callback = callback;
        payload = enqueueUpdate(inst, update, lane);
        if (payload !== null) {
          scheduleUpdateOnFiber(payload, inst, lane);
          entangleTransitions(payload, inst, lane);
        }
      },
      enqueueForceUpdate: function (inst, callback) {
        inst = inst._reactInternals;
        var lane = requestUpdateLane();
        var update = createUpdate(lane);
        update.tag = 2;
        if (callback !== undefined && callback !== null) update.callback = callback;
        callback = enqueueUpdate(inst, update, lane);
        if (callback !== null) {
          scheduleUpdateOnFiber(callback, inst, lane);
          entangleTransitions(callback, inst, lane);
        }
      },
    };
    var SelectiveHydrationException = Error(formatProdErrorMessage(461));
    var didReceiveUpdate = false;
    var SUSPENDED_MARKER = {
      dehydrated: null,
      treeContext: null,
      retryLane: 0,
      hydrationErrors: null,
    };
    var offscreenSubtreeIsHidden = false;
    var offscreenSubtreeWasHidden = false;
    var needsFormReset = false;
    var PossiblyWeakSet = typeof WeakSet === "function" ? WeakSet : Set;
    var nextEffect = null;
    var hostParent = null;
    var hostParentIsContainer = false;
    var currentHoistableRoot = null;
    var suspenseyCommitFlag = 8192;
    var DefaultAsyncDispatcher = {
      getCacheForType: function (resourceType) {
        var cache = readContext(CacheContext);
        var cacheForType = cache.data.get(resourceType);
        if (cacheForType === undefined) {
          cacheForType = resourceType();
          cache.data.set(resourceType, cacheForType);
        }
        return cacheForType;
      },
      cacheSignal: function () {
        return readContext(CacheContext).controller.signal;
      },
    };
    var COMPONENT_TYPE = 0;
    var HAS_PSEUDO_CLASS_TYPE = 1;
    var ROLE_TYPE = 2;
    var TEST_NAME_TYPE = 3;
    var TEXT_TYPE = 4;
    if (typeof Symbol === "function" && Symbol.for) {
      var symbolFor = Symbol.for;
      COMPONENT_TYPE = symbolFor("selector.component");
      HAS_PSEUDO_CLASS_TYPE = symbolFor("selector.has_pseudo_class");
      ROLE_TYPE = symbolFor("selector.role");
      TEST_NAME_TYPE = symbolFor("selector.test_id");
      TEXT_TYPE = symbolFor("selector.text");
    }
    var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
    var executionContext = 0;
    var workInProgressRoot = null;
    var workInProgress = null;
    var workInProgressRootRenderLanes = 0;
    var workInProgressSuspendedReason = 0;
    var workInProgressThrownValue = null;
    var workInProgressRootDidSkipSuspendedSiblings = false;
    var workInProgressRootIsPrerendering = false;
    var workInProgressRootDidAttachPingListener = false;
    var entangledRenderLanes = 0;
    var workInProgressRootExitStatus = 0;
    var workInProgressRootSkippedLanes = 0;
    var workInProgressRootInterleavedUpdatedLanes = 0;
    var workInProgressRootPingedLanes = 0;
    var workInProgressDeferredLane = 0;
    var workInProgressSuspendedRetryLanes = 0;
    var workInProgressRootConcurrentErrors = null;
    var workInProgressRootRecoverableErrors = null;
    var workInProgressRootDidIncludeRecursiveRenderUpdate = false;
    var globalMostRecentFallbackTime = 0;
    var globalMostRecentTransitionTime = 0;
    var workInProgressRootRenderTargetTime = 1 / 0;
    var workInProgressTransitions = null;
    var legacyErrorBoundariesThatAlreadyFailed = null;
    var pendingEffectsStatus = 0;
    var pendingEffectsRoot = null;
    var pendingFinishedWork = null;
    var pendingEffectsLanes = 0;
    var pendingEffectsRemainingLanes = 0;
    var pendingPassiveTransitions = null;
    var pendingRecoverableErrors = null;
    var nestedUpdateCount = 0;
    var rootWithNestedUpdates = null;
    internals.attemptContinuousHydration = function (fiber) {
      if (fiber.tag === 13 || fiber.tag === 31) {
        var root = enqueueConcurrentRenderForLane(fiber, 67108864);
        if (root !== null) scheduleUpdateOnFiber(root, fiber, 67108864);
        markRetryLaneIfNotHydrated(fiber, 67108864);
      }
    };
    internals.attemptHydrationAtCurrentPriority = function (fiber) {
      if (fiber.tag === 13 || fiber.tag === 31) {
        var lane = requestUpdateLane();
        lane = getBumpedLaneForHydrationByLane(lane);
        var root = enqueueConcurrentRenderForLane(fiber, lane);
        if (root !== null) scheduleUpdateOnFiber(root, fiber, lane);
        markRetryLaneIfNotHydrated(fiber, lane);
      }
    };
    internals.attemptSynchronousHydration = function (fiber) {
      switch (fiber.tag) {
        case 3:
          fiber = fiber.stateNode;
          if (fiber.current.memoizedState.isDehydrated) {
            var lanes = getHighestPriorityLanes(fiber.pendingLanes);
            if (lanes !== 0) {
              fiber.pendingLanes |= 2;
              for (fiber.entangledLanes |= 2; lanes;) {
                var lane = 1 << (31 - clz32(lanes));
                fiber.entanglements[1] |= lane;
                lanes &= ~lane;
              }
              ensureRootIsScheduled(fiber);
              if ((executionContext & 6) === 0) {
                workInProgressRootRenderTargetTime = now() + 500;
                flushSyncWorkAcrossRoots_impl(0, false);
              }
            }
          }
          break;
        case 31:
        case 13:
          lanes = enqueueConcurrentRenderForLane(fiber, 2);
          if (lanes !== null) scheduleUpdateOnFiber(lanes, fiber, 2);
          flushSyncWork();
          markRetryLaneIfNotHydrated(fiber, 2);
      }
    };
    internals.batchedUpdates = function (fn, a) {
      return fn(a);
    };
    internals.createComponentSelector = function (component) {
      return {
        $$typeof: COMPONENT_TYPE,
        value: component,
      };
    };
    internals.createContainer = function (
      containerInfo,
      tag,
      hydrationCallbacks,
      isStrictMode,
      concurrentUpdatesByDefaultOverride,
      identifierPrefix,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      onDefaultTransitionIndicator,
    ) {
      return createFiberRoot(
        containerInfo,
        tag,
        false,
        null,
        hydrationCallbacks,
        isStrictMode,
        identifierPrefix,
        null,
        onUncaughtError,
        onCaughtError,
        onRecoverableError,
        onDefaultTransitionIndicator,
      );
    };
    internals.createHasPseudoClassSelector = function (selectors) {
      return {
        $$typeof: HAS_PSEUDO_CLASS_TYPE,
        value: selectors,
      };
    };
    internals.createHydrationContainer = function (
      initialChildren,
      callback,
      containerInfo,
      tag,
      hydrationCallbacks,
      isStrictMode,
      concurrentUpdatesByDefaultOverride,
      identifierPrefix,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      onDefaultTransitionIndicator,
      transitionCallbacks,
      formState,
    ) {
      initialChildren = createFiberRoot(
        containerInfo,
        tag,
        true,
        initialChildren,
        hydrationCallbacks,
        isStrictMode,
        identifierPrefix,
        formState,
        onUncaughtError,
        onCaughtError,
        onRecoverableError,
        onDefaultTransitionIndicator,
      );
      initialChildren.context = getContextForSubtree(null);
      containerInfo = initialChildren.current;
      tag = requestUpdateLane();
      tag = getBumpedLaneForHydrationByLane(tag);
      hydrationCallbacks = createUpdate(tag);
      hydrationCallbacks.callback = callback !== undefined && callback !== null ? callback : null;
      enqueueUpdate(containerInfo, hydrationCallbacks, tag);
      callback = tag;
      initialChildren.current.lanes = callback;
      markRootUpdated$1(initialChildren, callback);
      ensureRootIsScheduled(initialChildren);
      return initialChildren;
    };
    internals.createPortal = function (children, containerInfo, implementation) {
      var key = 3 < arguments.length && arguments[3] !== undefined ? arguments[3] : null;
      return {
        $$typeof: REACT_PORTAL_TYPE,
        key: key == null ? null : "" + key,
        children,
        containerInfo,
        implementation,
      };
    };
    internals.createRoleSelector = function (role) {
      return {
        $$typeof: ROLE_TYPE,
        value: role,
      };
    };
    internals.createTestNameSelector = function (id) {
      return {
        $$typeof: TEST_NAME_TYPE,
        value: id,
      };
    };
    internals.createTextSelector = function (text) {
      return {
        $$typeof: TEXT_TYPE,
        value: text,
      };
    };
    internals.defaultOnCaughtError = function (error) {
      console.error(error);
    };
    internals.defaultOnRecoverableError = function (error) {
      reportGlobalError(error);
    };
    internals.defaultOnUncaughtError = function (error) {
      reportGlobalError(error);
    };
    internals.deferredUpdates = function (fn) {
      var prevTransition = ReactSharedInternals.T;
      var previousPriority = getCurrentUpdatePriority();
      try {
        setCurrentUpdatePriority(32);
        ReactSharedInternals.T = null;
        return fn();
      } finally {
        setCurrentUpdatePriority(previousPriority);
        ReactSharedInternals.T = prevTransition;
      }
    };
    internals.discreteUpdates = function (fn, a, b, c, d) {
      var prevTransition = ReactSharedInternals.T;
      var previousPriority = getCurrentUpdatePriority();
      try {
        setCurrentUpdatePriority(2);
        ReactSharedInternals.T = null;
        return fn(a, b, c, d);
      } finally {
        setCurrentUpdatePriority(previousPriority);
        ReactSharedInternals.T = prevTransition;
        if (executionContext === 0) workInProgressRootRenderTargetTime = now() + 500;
      }
    };
    internals.findAllNodes = findAllNodes;
    internals.findBoundingRects = function (hostRoot, selectors) {
      if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
      selectors = findAllNodes(hostRoot, selectors);
      hostRoot = [];
      for (var i = 0; i < selectors.length; i++) hostRoot.push(getBoundingRect(selectors[i]));
      for (selectors = hostRoot.length - 1; 0 < selectors; selectors--) {
        i = hostRoot[selectors];
        for (
          var targetLeft = i.x,
            targetRight = targetLeft + i.width,
            targetTop = i.y,
            targetBottom = targetTop + i.height,
            j = selectors - 1;
          0 <= j;
          j--
        )
          if (selectors !== j) {
            var otherRect = hostRoot[j];
            var otherLeft = otherRect.x;
            var otherRight = otherLeft + otherRect.width;
            var otherTop = otherRect.y;
            var otherBottom = otherTop + otherRect.height;
            if (
              targetLeft >= otherLeft &&
              targetTop >= otherTop &&
              targetRight <= otherRight &&
              targetBottom <= otherBottom
            ) {
              hostRoot.splice(selectors, 1);
              break;
            } else if (!(
              targetLeft !== otherLeft ||
              i.width !== otherRect.width ||
              otherBottom < targetTop ||
              otherTop > targetBottom
            )) {
              if (otherTop > targetTop) {
                otherRect.height += otherTop - targetTop;
                otherRect.y = targetTop;
              }
              if (otherBottom < targetBottom) otherRect.height = targetBottom - otherTop;
              hostRoot.splice(selectors, 1);
              break;
            } else if (!(
              targetTop !== otherTop ||
              i.height !== otherRect.height ||
              otherRight < targetLeft ||
              otherLeft > targetRight
            )) {
              if (otherLeft > targetLeft) {
                otherRect.width += otherLeft - targetLeft;
                otherRect.x = targetLeft;
              }
              if (otherRight < targetRight) otherRect.width = targetRight - otherLeft;
              hostRoot.splice(selectors, 1);
              break;
            }
          }
      }
      return hostRoot;
    };
    internals.findHostInstance = findHostInstance;
    internals.findHostInstanceWithNoPortals = function (fiber) {
      fiber = findCurrentFiberUsingSlowPath(fiber);
      fiber = fiber !== null ? findCurrentHostFiberWithNoPortalsImpl(fiber) : null;
      return fiber === null ? null : getPublicInstance(fiber.stateNode);
    };
    internals.findHostInstanceWithWarning = function (component) {
      return findHostInstance(component);
    };
    internals.flushPassiveEffects = flushPendingEffects;
    internals.flushSyncFromReconciler = function (fn) {
      var prevExecutionContext = executionContext;
      executionContext |= 1;
      var prevTransition = ReactSharedInternals.T;
      var previousPriority = getCurrentUpdatePriority();
      try {
        setCurrentUpdatePriority(2);
        ReactSharedInternals.T = null;
        if (fn) return fn();
      } finally {
        setCurrentUpdatePriority(previousPriority);
        ReactSharedInternals.T = prevTransition;
        executionContext = prevExecutionContext;
        if ((executionContext & 6) === 0) flushSyncWorkAcrossRoots_impl(0, false);
      }
    };
    internals.flushSyncWork = flushSyncWork;
    internals.focusWithin = function (hostRoot, selectors) {
      if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
      hostRoot = findFiberRootForHostRoot(hostRoot);
      selectors = findPaths(hostRoot, selectors);
      selectors = Array.from(selectors);
      for (hostRoot = 0; hostRoot < selectors.length;) {
        var fiber = selectors[hostRoot++];
        var tag = fiber.tag;
        if (!isHiddenSubtree(fiber)) {
          if ((tag === 5 || tag === 26 || tag === 27) && setFocusIfFocusable(fiber.stateNode)) return true;
          for (fiber = fiber.child; fiber !== null;) {
            selectors.push(fiber);
            fiber = fiber.sibling;
          }
        }
      }
      return false;
    };
    internals.getFindAllNodesFailureDescription = function (hostRoot, selectors) {
      if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
      var maxSelectorIndex = 0;
      var matchedNames = [];
      hostRoot = [findFiberRootForHostRoot(hostRoot), 0];
      for (var index = 0; index < hostRoot.length;) {
        var fiber = hostRoot[index++];
        var tag = fiber.tag;
        var selectorIndex = hostRoot[index++];
        var selector = selectors[selectorIndex];
        if ((tag !== 5 && tag !== 26 && tag !== 27) || !isHiddenSubtree(fiber)) {
          if (matchSelector(fiber, selector)) {
            matchedNames.push(selectorToString(selector));
            selectorIndex++;
            if (selectorIndex > maxSelectorIndex) maxSelectorIndex = selectorIndex;
          }
          if (selectorIndex < selectors.length)
            for (fiber = fiber.child; fiber !== null;) {
              hostRoot.push(fiber, selectorIndex);
              fiber = fiber.sibling;
            }
        }
      }
      if (maxSelectorIndex < selectors.length) {
        for (hostRoot = []; maxSelectorIndex < selectors.length; maxSelectorIndex++)
          hostRoot.push(selectorToString(selectors[maxSelectorIndex]));
        return (
          `findAllNodes was able to match part of the selector:
  ` +
          (matchedNames.join(" > ") +
            `

No matching component was found for:
  `) +
          hostRoot.join(" > ")
        );
      }
      return null;
    };
    internals.getPublicRootInstance = function (container) {
      container = container.current;
      if (!container.child) return null;
      switch (container.child.tag) {
        case 27:
        case 5:
          return getPublicInstance(container.child.stateNode);
        default:
          return container.child.stateNode;
      }
    };
    internals.injectIntoDevTools = function () {
      var internals = {
        bundleType: 0,
        version: rendererVersion,
        rendererPackageName,
        currentDispatcherRef: ReactSharedInternals,
        reconcilerVersion: "19.2.0",
      };
      if (extraDevToolsConfig !== null) internals.rendererConfig = extraDevToolsConfig;
      if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined") internals = false;
      else {
        var hook = __REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (hook.isDisabled || !hook.supportsFiber) internals = true;
        else {
          try {
            rendererID = hook.inject(internals);
            injectedHook = hook;
          } catch (err) {}
          internals = hook.checkDCE ? true : false;
        }
      }
      return internals;
    };
    internals.isAlreadyRendering = function () {
      return (executionContext & 6) !== 0;
    };
    internals.observeVisibleRects = function (hostRoot, selectors, callback, options) {
      if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
      hostRoot = findAllNodes(hostRoot, selectors);
      var disconnect = setupIntersectionObserver(hostRoot, callback, options).disconnect;
      return {
        disconnect: function () {
          disconnect();
        },
      };
    };
    internals.shouldError = function () {
      return null;
    };
    internals.shouldSuspend = function () {
      return false;
    };
    internals.startHostTransition = function (formFiber, pendingState, action, formData) {
      if (formFiber.tag !== 5) throw Error(formatProdErrorMessage(476));
      var queue = ensureFormComponentIsStateful(formFiber).queue;
      startTransition(
        formFiber,
        queue,
        pendingState,
        NotPendingTransition,
        action === null
          ? noop
          : function () {
              var stateHook = ensureFormComponentIsStateful(formFiber);
              if (stateHook.next === null) stateHook = formFiber.alternate.memoizedState;
              dispatchSetStateInternal(formFiber, stateHook.next.queue, {}, requestUpdateLane());
              return action(formData);
            },
      );
    };
    internals.updateContainer = function (element, container, parentComponent, callback) {
      var current = container.current;
      var lane = requestUpdateLane();
      updateContainerImpl(current, lane, element, container, parentComponent, callback);
      return lane;
    };
    internals.updateContainerSync = function (element, container, parentComponent, callback) {
      updateContainerImpl(container.current, 2, element, container, parentComponent, callback);
      return 2;
    };
    return internals;
  };
  cjsModule.exports.default = cjsModule.exports;
  Object.defineProperty(cjsModule.exports, "__esModule", {
    value: true,
  });
});
export { require_react_reconciler_production };
