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
var qyt = createLazySignal(() => a().rowStaged);
//@ chunk-6qtszw6g.js:330-377 placement
function m() {
  return a().attestationEnforcement;
}
//@ chunk-6qtszw6g.js:377-420 placement
function CWs() {
  return m() === "not_enforced";
}
//@ chunk-6qtszw6g.js:420-453 placement
var v = /^[A-Za-z_$][\w$.]{0,63}$/;
/**
 * 取错误的 name（不是 Error 时取 typeof），只接受符合白名单正则的名字，否则或出错时返回 "unnamed"。
 */
//@ chunk-6qtszw6g.js:453-587 placement
function safeErrorName(e) {
  try {
    let t = e instanceof Error ? e.name : typeof e;
    return typeof t === "string" && v.test(t) ? t : "unnamed";
  } catch {
    return "unnamed";
  }
}
//@ chunk-6qtszw6g.js:587-717 placement
function nextVerdictDelivery(e, t) {
  if (e === void 0) return "deliver";
  if (t === e) return "repeat";
  return e === "served" && t === "refused" ? "deliver" : "out_of_order";
}
//@ chunk-6qtszw6g.js:717-808 placement
function g(e) {
  return typeof e === "object" && e !== null && "then" in e && typeof e.then === "function";
}
//@ chunk-6qtszw6g.js:808-897 placement
function y(e, t) {
  if (!g(e)) return;
  Promise.resolve(e).catch((s) => {
    try {
      t?.(safeErrorName(s));
    } catch {}
  });
}
//@ chunk-6qtszw6g.js:897-1938 placement
function deliverFileStoreVerdict() {
  let e,
    t = [],
    s = !1,
    c = [],
    f = (r) => () => {
      t = t.filter((n) => n !== r);
    },
    h = (r, n, o) => {
      try {
        return (y(r.listener(n, f(r)), o), null);
      } catch (error) {
        return safeErrorName(error);
      }
    },
    l = ({ verdict: verdict, onRejected: onRejected }) => {
      e = verdict;
      let o = t,
        i = 0,
        d = [];
      for (let u of o) {
        if (!t.includes(u)) continue;
        i++;
        let S = h(u, verdict, onRejected);
        if (S !== null) d.push(S);
      }
      if (verdict !== "served") t = [];
      return { listeners: i, threw: d };
    },
    p = () => {
      let r = [];
      while (c.length > 0) r.push(...l(c.shift()).threw);
      return r;
    };
  return {
    current: () => e,
    subscribe: (r) => {
      let n = { listener: r },
        o = f(n);
      if (e === void 0) return ((t = [...t, n]), o);
      let i = e;
      if (i === "served") t = [...t, n];
      let d = s;
      s = !0;
      try {
        let u = r(i, o);
        if (g(u)) Promise.resolve(u).catch(() => {});
      } catch (error) {
        throw (o(), error);
      } finally {
        if (!d) (p(), (s = !1));
      }
      return o;
    },
    publish: (r, n) => {
      let o = c.at(-1)?.verdict ?? e,
        i = nextVerdictDelivery(o, r);
      if (i === "repeat") return { kind: "repeat" };
      if (i === "out_of_order") return { kind: "out_of_order", basis: o };
      if ((c.push({ verdict: r, onRejected: n }), s)) return { kind: "queued" };
      s = !0;
      try {
        let d = l(c.shift());
        return { kind: "delivered", listeners: d.listeners, threw: [...d.threw, ...p()] };
      } finally {
        ((c.length = 0), (s = !1));
      }
    },
    reset: () => {
      ((e = void 0), (t = []), (s = !1), (c.length = 0));
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
function a() {
  return remoteIOFileStoreState.of(getRootSession().host);
}
//@ chunk-6qtszw6g.js:2077-2212 placement
var freeze = Object.freeze({
    current: () => a().verdict.current(),
    subscribe: (e) => a().verdict.subscribe(e),
  }),
  xWs = (e, t) => a().verdict.publish(e, t);

export { safeErrorName, qyt, freeze, CWs, xWs };
