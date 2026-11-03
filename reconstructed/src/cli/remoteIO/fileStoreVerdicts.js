/**
 * cli/remoteIO/fileStoreVerdicts.ts
 *
 * 2.1.316 新增。云 worker 文件存储写入裁决的下发。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6qtszw6g.js (12)
 * attribution: placement 12
 */
import { createLazySignal, createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-6qtszw6g.js:300-330 placement
/**
 * 按宿主懒创建的 rowStaged 信号。
 */
var rowStagedSignal = createLazySignal(() => remoteIoFileStoreStateHandle().rowStaged);
//@ chunk-6qtszw6g.js:330-377 placement
function attestationEnforcementState() {
  return remoteIoFileStoreStateHandle().attestationEnforcement;
}
//@ chunk-6qtszw6g.js:377-420 placement
/**
 * 判断当前 attestation 强制级别是否为 not_enforced。
 */
function isAttestationNotEnforced() {
  return attestationEnforcementState() === "not_enforced";
}
//@ chunk-6qtszw6g.js:420-453 placement
var ERROR_NAME_PATTERN = /^[A-Za-z_$][\w$.]{0,63}$/;
//@ chunk-6qtszw6g.js:453-587 placement
/**
 * 取错误的 name（不是 Error 时取 typeof），只接受符合白名单正则的名字，否则或出错时返回 "unnamed"。
 */
function safeErrorName(error) {
  try {
    let t = error instanceof Error ? error.name : typeof error;
    return typeof t === "string" && ERROR_NAME_PATTERN.test(t) ? t : "unnamed";
  } catch {
    return "unnamed";
  }
}
//@ chunk-6qtszw6g.js:587-717 placement
function nextVerdictDelivery(verdict, t) {
  if (verdict === undefined) return "deliver";
  if (t === verdict) return "repeat";
  return verdict === "served" && t === "refused" ? "deliver" : "out_of_order";
}
//@ chunk-6qtszw6g.js:717-808 placement
function isThenable(e) {
  return typeof e === "object" && e !== null && "then" in e && typeof e.then === "function";
}
//@ chunk-6qtszw6g.js:808-897 placement
function ignoreRejectedPromise(e, t) {
  if (!isThenable(e)) return;
  Promise.resolve(e).catch((error) => {
    try {
      t?.(safeErrorName(error));
    } catch {}
  });
}
//@ chunk-6qtszw6g.js:897-1938 placement
function deliverFileStoreVerdict() {
  let e;
  let t = [];
  let s = false;
  let c = [];
  let f = (r) => () => {
    t = t.filter((n) => n !== r);
  };
  let h = (r, verdict, onRejected) => {
    try {
      ignoreRejectedPromise(r.listener(verdict, f(r)), onRejected);
      return null;
    } catch (error) {
      return safeErrorName(error);
    }
  };
  let l = ({ verdict, onRejected }) => {
    e = verdict;
    let o = t;
    let i = 0;
    let d = [];
    for (let u of o) {
      if (!t.includes(u)) continue;
      i++;
      let S = h(u, verdict, onRejected);
      if (S !== null) d.push(S);
    }
    if (verdict !== "served") t = [];
    return {
      listeners: i,
      threw: d,
    };
  };
  let p = () => {
    let r = [];
    while (c.length > 0) r.push(...l(c.shift()).threw);
    return r;
  };
  return {
    current: () => e,
    subscribe: (r) => {
      let n = {
        listener: r,
      };
      let o = f(n);
      if (e === undefined) {
        t = [...t, n];
        return o;
      }
      let i = e;
      if (i === "served") t = [...t, n];
      let d = s;
      s = true;
      try {
        let u = r(i, o);
        if (isThenable(u)) Promise.resolve(u).catch(() => {});
      } catch (error) {
        o();
        throw error;
      } finally {
        if (!d) {
          p();
          s = false;
        }
      }
      return o;
    },
    publish: (r, onRejected) => {
      let verdict = c.at(-1)?.verdict ?? e;
      let i = nextVerdictDelivery(verdict, r);
      if (i === "repeat")
        return {
          kind: "repeat",
        };
      if (i === "out_of_order")
        return {
          kind: "out_of_order",
          basis: verdict,
        };
      c.push({
        verdict: r,
        onRejected,
      });
      if (s)
        return {
          kind: "queued",
        };
      s = true;
      try {
        let d = l(c.shift());
        return {
          kind: "delivered",
          listeners: d.listeners,
          threw: [...d.threw, ...p()],
        };
      } finally {
        c.length = 0;
        s = false;
      }
    },
    reset: () => {
      e = undefined;
      t = [];
      s = false;
      c.length = 0;
    },
  };
}
//@ chunk-6qtszw6g.js:1938-2042 placement
var remoteIOFileStoreState = new HostScoped(() => ({
  rowStaged: createSignal(),
  streamReconnected: createSignal(),
  attestationEnforcement: "unknown",
  verdict: deliverFileStoreVerdict(),
}));
//@ chunk-6qtszw6g.js:2042-2077 placement
function remoteIoFileStoreStateHandle() {
  return remoteIOFileStoreState.of(getRootSession().host);
}
//@ chunk-6qtszw6g.js:2077-2212 placement
/**
 * 发布文件存储裁决（verdict）到宿主状态，供订阅方读取。
 */
var RWs = Object.freeze({
  current: () => remoteIoFileStoreStateHandle().verdict.current(),
  subscribe: (e) => remoteIoFileStoreStateHandle().verdict.subscribe(e),
});
var publishFileStoreVerdict = (e, t) => remoteIoFileStoreStateHandle().verdict.publish(e, t);
export { safeErrorName, rowStagedSignal, RWs, isAttestationNotEnforced, publishFileStoreVerdict };
