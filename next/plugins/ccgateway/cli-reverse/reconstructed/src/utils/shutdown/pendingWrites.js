/**
 * utils/shutdown/pendingWrites.ts
 *
 * 2.1.316 新增：退出前待完成写入
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (15)
 * attribution: placement 15
 */
import { isUntrustedObject as isUntrustedObject_2 } from "../untrustedValues.js";
import {
  getOriginalCwdOrNull,
  getProjectRootOrNull,
  getSessionId,
  onProcessRootHost,
  isDisklessProcess,
} from "../../bootstrap/state.js";
import { HostScoped } from "../hostScoped.js";
import { setBgExitCause } from "../bgExitSidecars.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:225204-225391 placement
/**
 * 沿原型链判断对象是否为不可信对象（Proxy、vm 上下文），最多 128 层。
 */
function isUntrustedObject(value) {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return false;
  let current = value;
  for (let idx = 0; idx < 128; idx++) {
    if (current === null) return false;
    if (isUntrustedObject_2(current)) return true;
    current = Object.getPrototypeOf(current);
  }
  return true;
}
//@ chunk-5xgkngpb.js:225391-225544 placement
function createLineClaimers() {
  let claimers = new Set();
  return {
    claim: (claimer) => {
      claimers.add(claimer);
      return () => {
        claimers.delete(claimer);
      };
    },
    lineFor: (line, context) => {
      for (let claimer of claimers) {
        let claimed = claimer(line, context);
        if (claimed !== undefined) return claimed;
      }
      return;
    },
  };
}
//@ chunk-5xgkngpb.js:225544-225593 placement
var claim; // deferred: uses createLineClaimers of its import cycle while loading; runs once the cycle is complete
var lineFor;
var claimPendingWriteLine;
var findPendingWriteLine;
deferInit("chunk-5xgkngpb.js:225544", () => {
  ({ claim, lineFor } = createLineClaimers());
  claimPendingWriteLine = claim;
  findPendingWriteLine = lineFor;
});
//@ chunk-5xgkngpb.js:225593-225696 placement
/**
 * 给「被吞掉的重置信号」注册观察者：同一对象只报告一次。
 */
function registerSwallowedRejectionObserver(line) {
  let weakSet = new WeakSet();
  claim((rejection) => (isObjectLike_3(rejection) && weakSet.has(rejection) ? line : undefined));
  return (rejection) => {
    if (isObjectLike_3(rejection)) weakSet.add(rejection);
  };
}
//@ chunk-5xgkngpb.js:225696-225772 placement
function isObjectLike_3(value) {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}
//@ chunk-5xgkngpb.js:225835-225944 placement
function getSessionIdentity() {
  let originalCwdOrNull = getOriginalCwdOrNull();
  let projectRootOrNull = getProjectRootOrNull();
  return {
    id: getSessionId(),
    project:
      originalCwdOrNull === null || projectRootOrNull === null
        ? null
        : {
            originalCwd: originalCwdOrNull,
            projectRoot: projectRootOrNull,
          },
  };
}
//@ chunk-5xgkngpb.js:225944-226250 placement
/**
 * 跟踪退出前尚未完成的写入与待恢复的接管、Artifact 监视等。
 */
class PendingWritesTracker {
  pendingWrites = new Set();
  unresumedAdopt = new Map();
  unresumedFrameLive = new Map();
  exitRetryFrameLive = new Map();
  track(promise) {
    this.pendingWrites.add(promise);
    promise.finally(() => this.pendingWrites.delete(promise));
  }
  hasPending() {
    return this.pendingWrites.size > 0;
  }
  async drain() {
    await Promise.allSettled(Array.from(this.pendingWrites));
  }
}
//@ chunk-5xgkngpb.js:226250-226277 placement
var pendingWritesTrackerByHost; // deferred: uses PendingWritesTracker of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:226250", () => {
  pendingWritesTrackerByHost = new HostScoped(() => new PendingWritesTracker());
});
//@ chunk-5xgkngpb.js:226277-226307 placement
/**
 * 按进程根缓存的待完成写入跟踪器。
 */
function pendingWritesTracker() {
  return onProcessRootHost(pendingWritesTrackerByHost);
}
//@ chunk-5xgkngpb.js:226307-226338 placement
/**
 * 登记一个待完成写入。
 */
function trackPendingWrite(promise) {
  pendingWritesTracker().track(promise);
}
//@ chunk-5xgkngpb.js:226338-226379 placement
function hasPendingWrites() {
  return pendingWritesTracker().hasPending();
}
//@ chunk-5xgkngpb.js:226379-226415 placement
function drainPendingWrites() {
  return pendingWritesTracker().drain();
}
//@ chunk-5xgkngpb.js:226415-226439 placement
function resumeHintPrefix() {
  return "";
}
//@ chunk-5xgkngpb.js:270048-270072 placement
/**
 * 是否启用 worktree 云上传（外部构建恒 false）。
 */
function isWorktreeCloudClaimEnabled() {
  return false;
}
//@ chunk-5xgkngpb.js:270072-270103 placement
function recordBgExitCause(cause) {
  if (!isDisklessProcess()) setBgExitCause(cause);
}
export {
  getSessionIdentity,
  isUntrustedObject,
  claimPendingWriteLine,
  trackPendingWrite,
  resumeHintPrefix,
  recordBgExitCause,
  findPendingWriteLine,
  hasPendingWrites,
  drainPendingWrites,
  isWorktreeCloudClaimEnabled,
  pendingWritesTracker,
  registerSwallowedRejectionObserver,
};
