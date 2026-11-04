/**
 * plugins/functionHooks/hooks-worker/hooks-worker.js: the function-hooks worker (a worker thread's entry; a second program)
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64): the file of the same path in the
 * build, unchanged except that its imports of chunk exports name the reading tree's modules (its own
 * names are still the minified ones; it was not part of the scanned chunks). Started by
 * plugins/functionHooks/hooksWorker.js; built as its own entry (build.mjs).
 */
import { workerData as N } from "worker_threads";
import {
  setMatcherLog as dCn,
  serializeMatcherList as Tos,
} from "../../../utils/hooks/functionHookMatchers.js";
import { forwardAbort as Lk, hookScopeStore as rfr } from "../dispatch/chain.js";
import { surfaceRowLedger as zte, parseAskUserQuestionRenderRequest as xrs } from "../ui/treeConstants.js";
import { markScrollActivity as Ufr } from "../vm/vmGlobals.js";
import { isUiEventName as y3t } from "../api/agentToolOps.js";
import { rejectionText as jfr, unawaitedOpMessage as Deo } from "../vm/moduleLoader.js";
import {
  abortReasonText as yxt,
  HooksError as He,
  causeString as Aos,
  nextNotPlainData as A3t,
  argsNotPlainData as Xeo,
  makeHooksOrPlainError as Cos,
  settledIfPlainData as spr,
  readWeakTag as Ros,
  readTag as dpr,
} from "../hooksErrors.js";
import { errorMessage as d } from "../../../utils/errors.js";
import { setEventTableEntries as YUi } from "../../../utils/pathTable.js";
import {
  createHookHostBridge as lrs,
  MARKS_NEWEST_DISPATCH_SLOT as uZr,
  MARKS_ANSWERS_SENT_SLOT as drs,
  MARKS_ANSWERED_DISPATCH_SLOT as crs,
  takePending as XJ,
} from "../hostBridge.js";

//@ src/plugins/functionHooks/hooks-worker/hooks-worker.js (original, imports rewritten)
var B = (o) => ({
  post: (n) => o.postMessage(n),
  ports: new Map(),
  pendingNext: new Map(),
  pendingSteps: new Map(),
  streams: new Map(),
  nextCounter: 0,
  opCounter: 0,
});
function S(o, n) {
  let r = o.opFailureOf(n) ?? dpr(n);
  if (r === undefined) return jfr(n);
  return Deo(r);
}
var U = (o, n) => {
  process.on("unhandledRejection", (r) =>
    o.post({
      type: "unhandled",
      error: S(n, r),
    }),
  );
};
var w = ({ pending: o, key: n, send: r, onAbort: a, signal: v, notPlainMessage: u }) =>
  new Promise((y, f) => {
    let x = () => {};
    o.set(n, {
      resolve: (m) => {
        x();
        y(m);
      },
      reject: (m) => {
        x();
        f(m);
      },
    });
    try {
      r();
    } catch (m) {
      o.delete(n);
      f(new He(u(m)));
      return;
    }
    x = Lk(v, {
      abort: a,
    });
  });
var G = (o, n) => (r, a, v) => {
  let u = ++o.nextCounter;
  return w({
    pending: o.pendingNext,
    key: `${n}:${u}`,
    send: () =>
      o.post({
        type: "next",
        id: n,
        nextId: u,
        argument: r,
        floors: v,
      }),
    onAbort: () =>
      o.post({
        type: "next_abort",
        id: n,
        nextId: u,
        reason: yxt(a),
        ...spr(a),
      }),
    signal: a,
    notPlainMessage: (y) => A3t(d(y)),
  });
};
function z(
  o,
  {
    environmentId: n,
    op: r,
    args: a,
    signal: v,
    dispatchId: u,
    registration: y,
    serving: f,
    rootEvent: x,
    pressing: m,
  },
) {
  let h = o.ports.get(n);
  if (!h) return Promise.reject(new He(`${r}: the plugin's environment is unloaded`));
  let { port: g } = h;
  let k = ++o.opCounter;
  if (u !== undefined && !y3t(r)) h.owedOps.set(k, u);
  return w({
    pending: h.pendingOps,
    key: k,
    send: () =>
      g.postMessage({
        type: "op",
        opId: k,
        dispatchId: u,
        registration: y,
        serving: f,
        rootEvent: x,
        pressing: m,
        op: r,
        args: a,
      }),
    onAbort: v
      ? () =>
          g.postMessage({
            type: "op_abort",
            opId: k,
            reason: yxt(v),
          })
      : () => {},
    signal: v,
    notPlainMessage: (t) => Xeo(r, d(t)),
  });
}
var J = (o, n) => (r, a, v) => {
  let u = ++o.nextCounter;
  let y = false;
  let f = false;
  let x = () =>
    w({
      pending: o.pendingSteps,
      key: `${n}:${u}`,
      send: () => {
        o.post({
          type: "next_pull",
          id: n,
          nextId: u,
          ...(y
            ? {}
            : {
                open: {
                  argument: r,
                  floors: v,
                },
              }),
        });
        y = true;
      },
      onAbort: () =>
        o.post({
          type: "next_abort",
          id: n,
          nextId: u,
          reason: yxt(a),
          ...spr(a),
        }),
      signal: a,
      notPlainMessage: (m) => A3t(d(m)),
    });
  return (async function* () {
    try {
      while (true) {
        let m = await x().catch((h) => {
          f = true;
          throw h;
        });
        if (m.done) {
          f = true;
          return m.value;
        }
        yield m.value;
      }
    } finally {
      if (y && !f)
        o.post({
          type: "next_close",
          id: n,
          nextId: u,
        });
    }
  })();
};
var Q = (
  o,
  { environmentId: n, op: r, args: a, signal: v, dispatchId: u, registration: y, serving: f, rootEvent: x },
) =>
  (async function* () {
    let m = () => new He(`${r}: the plugin's environment is unloaded`);
    let h = o.ports.get(n);
    if (!h) throw m();
    let { port: g, pendingOps: k, owedOps: t } = h;
    let e = ++o.opCounter;
    let s = {
      dispatchId: u,
      registration: y,
      serving: f,
      rootEvent: x,
      op: r,
      args: a,
    };
    let p = false;
    let i = false;
    function l() {
      if (o.ports.get(n) !== h) return Promise.reject(m());
      if (u !== undefined) t.set(e, u);
      return w({
        pending: k,
        key: e,
        send: () => {
          g.postMessage({
            type: "op_pull",
            opId: e,
            ...(p
              ? {}
              : {
                  open: s,
                }),
          });
          p = true;
        },
        onAbort: v
          ? () =>
              g.postMessage({
                type: "op_abort",
                opId: e,
                reason: yxt(v),
              })
          : () => {},
        signal: v,
        notPlainMessage: (c) => Xeo(r, d(c)),
      });
    }
    try {
      while (true) {
        let c = await l().catch((b) => {
          i = true;
          throw b;
        });
        if (c.done) {
          i = true;
          return c.value;
        }
        yield c.value;
      }
    } finally {
      if (p && !i)
        g.postMessage({
          type: "op_close",
          opId: e,
        });
    }
  })();
function M(o, n) {
  if (o) Atomics.store(o, uZr, Math.max(Atomics.load(o, uZr), n));
}
function E(o, n, r) {
  let a = (n.get(r) ?? 0) + 1;
  n.set(r, a);
  if (o) {
    Atomics.store(o, crs, r);
    Atomics.store(o, drs, a);
  }
}
function W(o) {
  for (let n of o.pendingOps.values()) n.reject(new He("the plugin's environment was unloaded"));
  o.pendingOps.clear();
}
function _(o, n) {
  if (!(typeof o === "object" && o !== null && n in o)) return;
  let a = Object.getOwnPropertyDescriptor(o, n)?.value;
  return a instanceof SharedArrayBuffer ? new Int32Array(a) : undefined;
}
function I(o) {
  let n = B(o);
  let { post: r, ports: a, pendingNext: v, pendingSteps: u, streams: y } = n;
  let f = new Map();
  let x = _(N, "stamp");
  let m = _(N, "marks");
  let h = new Map();
  dCn({
    log: (k, t) =>
      r({
        type: "log",
        text: k,
        level: t,
      }),
    hookFailed: (k) =>
      r({
        type: "hook_failed",
        ...k,
      }),
  });
  rfr.set((k) =>
    r({
      type: "passed_by",
      sighting: k,
    }),
  );
  let g = lrs({
    hostOps: (k) => z(n, k),
    hostStreamOps: (k) => Q(n, k),
    stamp: x,
  });
  U(n, g);
  o.onmessage = (k) => {
    let t = k.data;
    if (t.type === "ping") {
      r({
        type: "pong",
        n: t.n,
      });
      return;
    }
    switch ((Ufr(x), t.type)) {
      case "load": {
        let { environmentId: e, port: s } = t;
        let p = new Map();
        let i = new Map();
        a.set(e, {
          port: s,
          pendingOps: p,
          owedOps: i,
        });
        s.onmessage = (l) => {
          let c = l.data;
          Ufr(x);
          if (c.type === "flush") {
            s.postMessage({
              type: "flushed",
              flushId: c.flushId,
            });
            return;
          }
          let b = XJ(i, c.opId);
          if (b !== undefined) E(m, h, b);
          let P = XJ(p, c.opId);
          if (c.type === "op_result") P?.resolve(c.value);
          else P?.reject(new He(c.error));
        };
        g.load(e, t.args).then(
          (l) => {
            r({
              type: "loaded",
              environmentId: e,
              registered: Tos(l.registered),
            });
          },
          (l) => {
            a.delete(e);
            s.close();
            let c = Aos(l);
            r({
              type: "load_error",
              environmentId: e,
              error: d(l),
              ...(c !== undefined && {
                cause: c,
              }),
            });
          },
        );
        return;
      }
      case "unload": {
        g.unload(t.environmentId);
        let e = XJ(a, t.environmentId);
        if (e) {
          e.port.close();
          W(e);
        }
        return;
      }
      case "build": {
        let { environmentId: e } = t;
        try {
          g.build(e, t.table, t.suppressed);
          r({
            type: "built",
            environmentId: e,
          });
        } catch (s) {
          r({
            type: "built_error",
            environmentId: e,
            error: d(s),
          });
        }
        return;
      }
      case "resolve": {
        let { resolveId: e, environmentId: s, requests: p } = t;
        Promise.resolve()
          .then(() => g.resolveTables(s, p))
          .then(
            () =>
              r({
                type: "resolved",
                resolveId: e,
              }),
            (i) =>
              r({
                type: "resolve_error",
                resolveId: e,
                error: d(i),
              }),
          );
        return;
      }
      case "call": {
        let { callId: e, environmentId: s, call: p, callers: i } = t;
        Promise.resolve()
          .then(() =>
            g.callInterface(s, p, {
              callId: e,
              callers: i,
            }),
          )
          .then(
            (l) => {
              try {
                r({
                  type: "call_result",
                  callId: e,
                  value: l,
                });
              } catch (c) {
                r({
                  type: "call_error",
                  callId: e,
                  error: `$.${p.name}.${p.method} returned a value that is not plain data: ${d(c)}`,
                });
              }
            },
            (l) =>
              r({
                type: "call_error",
                callId: e,
                error: d(l),
              }),
          );
        return;
      }
      case "dispatch": {
        let {
          id: e,
          event: s,
          payload: p,
          environments: i,
          leftOut: l,
          origin: c,
          raise: b,
          floors: P,
          cutAt: H,
          names: K,
          dialogClients: C,
          ended: L,
        } = t;
        let A = xrs(s, p);
        YUi(s, K);
        if (A !== undefined) zte.holdClients(A, C);
        M(m, e);
        let F = new AbortController();
        f.set(e, F);
        Promise.resolve()
          .then(() =>
            g.dispatch(
              {
                id: e,
                event: s,
                payload: p,
                environments: i,
                leftOut: l,
                origin: c,
                raise: b,
                floors: P,
                cutAt: H,
                ended: L,
              },
              G(n, e),
              F.signal,
            ),
          )
          .then(
            (R) => {
              try {
                r({
                  type: "result",
                  id: e,
                  ...R,
                });
              } catch (j) {
                r({
                  type: "error",
                  id: e,
                  error: `result not cloneable: ${d(j)}`,
                  ...(R.withheld === true && {
                    withheld: true,
                  }),
                });
              }
            },
            (R) =>
              r({
                type: "error",
                id: e,
                error: d(R),
                ...(Ros(R)?.isNoted === true && {
                  withheld: true,
                }),
              }),
          )
          .finally(() => {
            f.delete(e);
            h.delete(e);
          });
        return;
      }
      case "dispatch_stream": {
        let { id: e, type: s, ...p } = t;
        M(m, e);
        let i = new AbortController();
        f.set(e, i);
        try {
          y.set(
            e,
            g.dispatchStream(
              {
                id: e,
                ...p,
              },
              J(n, e),
              i.signal,
            ),
          );
        } catch (l) {
          f.delete(e);
          h.delete(e);
          r({
            type: "error",
            id: e,
            error: d(l),
          });
        }
        return;
      }
      case "dialog_clients": {
        zte.holdClients(t.site, t.clients);
        return;
      }
      case "stream_pull": {
        let p = function () {
          y.delete(e);
          f.delete(e);
          h.delete(e);
        };
        let { id: e } = t;
        let s = y.get(e);
        if (s === undefined) {
          r({
            type: "error",
            id: e,
            error: "no stream is open for this dispatch",
          });
          return;
        }
        s.next().then(
          (i) => {
            if (i.done === true) p();
            try {
              r({
                type: "stream_step",
                id: e,
                step: {
                  done: i.done === true,
                  value: i.value,
                },
              });
            } catch (l) {
              p();
              s.return(undefined).catch(() => {
                return;
              });
              r({
                type: "error",
                id: e,
                error: `a chunk that is not plain data: ${d(l)}`,
              });
            }
          },
          (i) => {
            p();
            r({
              type: "error",
              id: e,
              error: d(i),
            });
          },
        );
        return;
      }
      case "stream_close": {
        let e = y.get(t.id);
        y.delete(t.id);
        f.delete(t.id);
        e?.return(undefined).catch(() => {
          return;
        });
        return;
      }
      case "next_step": {
        E(m, h, t.id);
        XJ(u, `${t.id}:${t.nextId}`)?.resolve(t.step);
        return;
      }
      case "abort":
        f.get(t.id)?.abort(Cos(t.reason, t.isSettled));
        return;
      case "press": {
        let { pressId: e, environmentId: s, handle: p, e: i } = t;
        Promise.resolve()
          .then(() =>
            g.press(
              s,
              {
                handle: p,
                sent: e,
              },
              i,
            ),
          )
          .then(
            () =>
              r({
                type: "press_result",
                pressId: e,
              }),
            (l) =>
              r({
                type: "press_error",
                pressId: e,
                error: d(l),
              }),
          );
        return;
      }
      case "press_release":
        g.releasePresses(t.environmentId, t.handles);
        return;
      case "next_result":
      case "next_error": {
        E(m, h, t.id);
        let e = `${t.id}:${t.nextId}`;
        let s = XJ(v, e);
        if (t.type === "next_result") s?.resolve(t.result);
        else {
          let i = new He(t.error);
          s?.reject(i);
          XJ(u, e)?.reject(i);
        }
        return;
      }
    }
  };
  r({
    type: "online",
  });
}
I(self);
