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

//@ chunk-e6aww6q8.js:224638-224825 placement
/**
 * 沿原型链判断对象是否为不可信对象（Proxy、vm 上下文），最多 128 层。
 */
function isUntrustedObject(e) {
  if (e === null || (typeof e !== "object" && typeof e !== "function")) return false;
  let n = e;
  for (let idx = 0; idx < 128; idx++) {
    if (n === null) return false;
    if (isUntrustedObject_2(n)) return true;
    n = Object.getPrototypeOf(n);
  }
  return true;
}
//@ chunk-e6aww6q8.js:224825-224978 placement
function createLineClaimers() {
  let e = new Set();
  return {
    claim: (n) => {
      e.add(n);
      return () => {
        e.delete(n);
      };
    },
    lineFor: (n, r) => {
      for (let s of e) {
        let h = s(n, r);
        if (h !== undefined) return h;
      }
      return;
    },
  };
}
//@ chunk-e6aww6q8.js:224978-225027 placement
var { claim, lineFor } = createLineClaimers();
var claimPendingWriteLine = claim;
var findPendingWriteLine = lineFor;
//@ chunk-e6aww6q8.js:225027-225130 placement
/**
 * 给「被吞掉的重置信号」注册观察者：同一对象只报告一次。
 */
function registerSwallowedRejectionObserver(e) {
  let weakSet = new WeakSet();
  claim((r) => (isObjectLike_3(r) && weakSet.has(r) ? e : undefined));
  return (r) => {
    if (isObjectLike_3(r)) weakSet.add(r);
  };
}
//@ chunk-e6aww6q8.js:225130-225206 placement
function isObjectLike_3(e) {
  return (typeof e === "object" && e !== null) || typeof e === "function";
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
  track(e) {
    this.pendingWrites.add(e);
    e.finally(() => this.pendingWrites.delete(e));
  }
  hasPending() {
    return this.pendingWrites.size > 0;
  }
  async drain() {
    await Promise.allSettled(Array.from(this.pendingWrites));
  }
}
//@ chunk-e6aww6q8.js:225684-225711 placement
var pendingWritesTrackerByHost = new HostScoped(() => new PendingWritesTracker());
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
function trackPendingWrite(e) {
  pendingWritesTracker().track(e);
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
function recordBgExitCause(e) {
  if (!isDisklessProcess()) setBgExitCause(e);
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
