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
import { Pf } from "../untrustedValues.js";
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
function n0e(e) {
  if (e === null || (typeof e !== "object" && typeof e !== "function")) return !1;
  let n = e;
  for (let r = 0; r < 128; r++) {
    if (n === null) return !1;
    if (Pf(n)) return !0;
    n = Object.getPrototypeOf(n);
  }
  return !0;
}
//@ chunk-e6aww6q8.js:224825-224978 placement
function nuo() {
  let e = new Set();
  return {
    claim: (n) => (
      e.add(n),
      () => {
        e.delete(n);
      }
    ),
    lineFor: (n, r) => {
      for (let s of e) {
        let h = s(n, r);
        if (h !== void 0) return h;
      }
      return;
    },
  };
}
//@ chunk-e6aww6q8.js:224978-225027 placement
var { claim: claim, lineFor: lineFor } = nuo(),
  Jun = claim,
  LRt = lineFor;
//@ chunk-e6aww6q8.js:225027-225130 placement
function MVs(e) {
  let weakSet = new WeakSet();
  return (
    claim((r) => (IRt(r) && weakSet.has(r) ? e : void 0)),
    (r) => {
      if (IRt(r)) weakSet.add(r);
    }
  );
}
//@ chunk-e6aww6q8.js:225130-225206 placement
function IRt(e) {
  return (typeof e === "object" && e !== null) || typeof e === "function";
}
//@ chunk-e6aww6q8.js:225269-225378 placement
function getSessionIdentity() {
  let e = getOriginalCwdOrNull(),
    n = getProjectRootOrNull();
  return {
    id: getSessionId(),
    project: e === null || n === null ? null : { originalCwd: e, projectRoot: n },
  };
}
/**
 * 跟踪退出前尚未完成的写入与待恢复的接管、Artifact 监视等。
 */
//@ chunk-e6aww6q8.js:225378-225684 placement
class PendingWritesTracker {
  pendingWrites = new Set();
  unresumedAdopt = new Map();
  unresumedFrameLive = new Map();
  exitRetryFrameLive = new Map();
  track(e) {
    (this.pendingWrites.add(e), e.finally(() => this.pendingWrites.delete(e)));
  }
  hasPending() {
    return this.pendingWrites.size > 0;
  }
  async drain() {
    await Promise.allSettled(Array.from(this.pendingWrites));
  }
}
//@ chunk-e6aww6q8.js:225684-225711 placement
var ruo = new HostScoped(() => new PendingWritesTracker());
//@ chunk-e6aww6q8.js:225711-225741 placement
function Fue() {
  return onProcessRootHost(ruo);
}
//@ chunk-e6aww6q8.js:225741-225772 placement
function DVs(e) {
  Fue().track(e);
}
//@ chunk-e6aww6q8.js:225772-225813 placement
function FRt() {
  return Fue().hasPending();
}
//@ chunk-e6aww6q8.js:225813-225849 placement
function $Rt() {
  return Fue().drain();
}
//@ chunk-e6aww6q8.js:225849-225873 placement
function HRt() {
  return "";
}
//@ chunk-e6aww6q8.js:270764-270788 placement
function oRe() {
  return !1;
}
//@ chunk-e6aww6q8.js:270788-270819 placement
function nce(e) {
  if (!isDisklessProcess()) setBgExitCause(e);
}

export { getSessionIdentity, oRe, Fue, MVs, HRt, nce, LRt, FRt, $Rt, n0e, Jun, DVs };
