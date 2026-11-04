/**
 * utils/shutdown/pendingWrites.ts
 *
 * 2.1.316 新增：退出前待完成写入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (15)
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

//@ chunk-e6aww6q8.js:224638-224825 placement
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
//@ chunk-e6aww6q8.js:224825-224978 placement
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
//@ chunk-e6aww6q8.js:224978-225027 placement
var claim; // deferred: uses createLineClaimers of its import cycle while loading; runs once the cycle is complete
var lineFor;
var claimPendingWriteLine;
var findPendingWriteLine;
deferInit("chunk-e6aww6q8.js:224978", () => {
  ({ claim, lineFor } = createLineClaimers());
  claimPendingWriteLine = claim;
  findPendingWriteLine = lineFor;
});
//@ chunk-e6aww6q8.js:225027-225130 placement
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
//@ chunk-e6aww6q8.js:225130-225206 placement
function isObjectLike_3(value) {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}
//@ chunk-e6aww6q8.js:225269-225378 placement
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
//@ chunk-e6aww6q8.js:225378-225684 placement
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
//@ chunk-e6aww6q8.js:225684-225711 placement
var pendingWritesTrackerByHost; // deferred: uses PendingWritesTracker of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:225684", () => {
  pendingWritesTrackerByHost = new HostScoped(() => new PendingWritesTracker());
});
//@ chunk-e6aww6q8.js:225711-225741 placement
/**
 * 按进程根缓存的待完成写入跟踪器。
 */
function pendingWritesTracker() {
  return onProcessRootHost(pendingWritesTrackerByHost);
}
//@ chunk-e6aww6q8.js:225741-225772 placement
/**
 * 登记一个待完成写入。
 */
function trackPendingWrite(promise) {
  pendingWritesTracker().track(promise);
}
//@ chunk-e6aww6q8.js:225772-225813 placement
function hasPendingWrites() {
  return pendingWritesTracker().hasPending();
}
//@ chunk-e6aww6q8.js:225813-225849 placement
function drainPendingWrites() {
  return pendingWritesTracker().drain();
}
//@ chunk-e6aww6q8.js:225849-225873 placement
function resumeHintPrefix() {
  return "";
}
//@ chunk-e6aww6q8.js:270764-270788 placement
/**
 * 是否启用 worktree 云上传（外部构建恒 false）。
 */
function isWorktreeCloudClaimEnabled() {
  return false;
}
//@ chunk-e6aww6q8.js:270788-270819 placement
function recordBgExitCause(cause) {
  if (!isDisklessProcess()) setBgExitCause(cause);
}
export {
  getSessionIdentity,
  isWorktreeCloudClaimEnabled,
  pendingWritesTracker,
  registerSwallowedRejectionObserver,
  resumeHintPrefix,
  recordBgExitCause,
  findPendingWriteLine,
  hasPendingWrites,
  drainPendingWrites,
  isUntrustedObject,
  claimPendingWriteLine,
  trackPendingWrite,
};
