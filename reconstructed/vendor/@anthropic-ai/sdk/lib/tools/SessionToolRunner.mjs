/**
 * @anthropic-ai/sdk/lib/tools/SessionToolRunner.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (7)
 * attribution: esm-layout 2, esm-fingerprint 5
 */
import { Kn, ke } from "../../internal/tslib.mjs";
import { Wu } from "../../internal/utils/async-queue.mjs";
import { Tb } from "../../internal/utils/log.mjs";
import { la, zu } from "./BetaRunnableTool.mjs";
import { qt } from "../../internal/utils/abort.mjs";
import { pr } from "../../core/error.mjs";
import { T } from "../../internal/headers.mjs";
import { wr } from "../../internal/stainless-helper-header.mjs";
import { on, fs, cs } from "../../internal/utils/backoff.mjs";
import { sleepUnlessAborted } from "../../tools/agent-toolset/memories.mjs";

//@ chunk-hwmsct5x.js:61240-61343 esm-layout
var Dr,
  ys,
  Cn,
  sn,
  gt,
  ve,
  ws,
  qe,
  Ss,
  Ur,
  As,
  Ie,
  Ln,
  rt,
  Fn,
  zt,
  In,
  Mt,
  ks,
  Nr,
  ct,
  Es,
  Qu,
  Gu,
  Yu,
  ju,
  da,
  Ku,
  vs,
  Rs,
  ca,
  Xu,
  Zu;
//@ chunk-hwmsct5x.js:61343-61416 esm-layout
var Ju = 500,
  Rm = 1e4,
  Am = 120000,
  km = 30000,
  xm = 1000,
  Tm = 30000,
  Mm = 300000,
  Om = 60000;
//@ chunk-hwmsct5x.js:61416-61503 esm-fingerprint
function ed(e) {
  return e.type === "session.status_idle" && e.stop_reason?.type === "end_turn";
}
//@ chunk-hwmsct5x.js:61503-64562 esm-fingerprint
var Pm = (() => {
    class e {
      constructor(n, r) {
        (Dr.set(this, void 0),
          ys.set(this, void 0),
          Cn.set(this, new Set()),
          sn.set(this, !1),
          gt.set(this, void 0),
          Kn(this, Dr, n, "f"),
          Kn(this, ys, r, "f"));
      }
      noteEvent(n) {
        if (n.type === "user.tool_confirmation") return;
        if (ed(n)) this.arm();
        else this.disarm();
      }
      block(n) {
        if ((ke(this, Cn, "f").add(n), ke(this, gt, "f") !== void 0))
          (Kn(this, sn, !0, "f"), clearTimeout(ke(this, gt, "f")), Kn(this, gt, void 0, "f"));
      }
      unblock(n) {
        if ((ke(this, Cn, "f").delete(n), ke(this, Cn, "f").size === 0 && ke(this, sn, "f"))) this.arm();
      }
      arm() {
        if (ke(this, Dr, "f") <= 0) return;
        if (ke(this, Cn, "f").size > 0) {
          Kn(this, sn, !0, "f");
          return;
        }
        if ((Kn(this, sn, !1, "f"), ke(this, gt, "f") !== void 0)) clearTimeout(ke(this, gt, "f"));
        Kn(this, gt, setTimeout(ke(this, ys, "f"), ke(this, Dr, "f")), "f");
      }
      disarm() {
        if ((Kn(this, sn, !1, "f"), ke(this, gt, "f") !== void 0))
          (clearTimeout(ke(this, gt, "f")), Kn(this, gt, void 0, "f"));
      }
    }
    return (
      (Dr = new WeakMap()),
      (ys = new WeakMap()),
      (Cn = new WeakMap()),
      (sn = new WeakMap()),
      (gt = new WeakMap()),
      e
    );
  })(),
  Br = (() => {
    class e {
      constructor(n, r) {
        (ve.add(this),
          ws.set(this, !1),
          qe.set(this, void 0),
          Ss.set(this, void 0),
          Ur.set(this, void 0),
          As.set(this, void 0),
          Ie.set(this, void 0),
          Ln.set(this, new Set()),
          rt.set(this, new Set()),
          Fn.set(this, new Map()),
          zt.set(this, new Map()),
          In.set(this, new Wu()),
          Mt.set(this, 0),
          ks.set(this, Mm),
          Nr.set(this, null),
          ct.set(this, void 0),
          (this.client = r.client),
          (this.sessionId = n),
          (this.tools = r.tools),
          (this.maxIdleMs = r.maxIdleMs ?? Om),
          Kn(this, Ie, Tb(r.client), "f"),
          Kn(this, As, new Map(r.tools.map((tool) => [la(tool), tool])), "f"),
          Kn(this, qe, new AbortController(), "f"),
          Kn(this, Ss, qt(r.signal, ke(this, qe, "f")), "f"),
          Kn(this, Ur, r.requestOptions, "f"),
          Kn(
            this,
            ct,
            new Pm(this.maxIdleMs, () => {
              (ke(this, Ie, "f").info("session idle after end_turn; stopping", {
                component: "session-tool-runner",
                session_id: this.sessionId,
                max_idle_ms: this.maxIdleMs,
              }),
                ke(this, qe, "f").abort());
            }),
            "f",
          ));
      }
      get signal() {
        return ke(this, qe, "f").signal;
      }
      abort() {
        ke(this, qe, "f").abort();
      }
      _setSendRetryWindow(n) {
        Kn(this, ks, n, "f");
      }
      async *[((ws = new WeakMap()),
      (qe = new WeakMap()),
      (Ss = new WeakMap()),
      (Ur = new WeakMap()),
      (As = new WeakMap()),
      (Ie = new WeakMap()),
      (Ln = new WeakMap()),
      (rt = new WeakMap()),
      (Fn = new WeakMap()),
      (zt = new WeakMap()),
      (In = new WeakMap()),
      (Mt = new WeakMap()),
      (ks = new WeakMap()),
      (Nr = new WeakMap()),
      (ct = new WeakMap()),
      (ve = new WeakSet()),
      Symbol.asyncIterator)]() {
        if (ke(this, ws, "f")) throw new pr("Cannot iterate over a consumed SessionToolRunner");
        (Kn(this, ws, !0, "f"),
          ke(this, Ie, "f").info("session tool runner starting", {
            component: "session-tool-runner",
            session_id: this.sessionId,
          }));
        let n = ke(this, ve, "m", Qu)
          .call(this)
          .catch((r) => {
            if (!ke(this, qe, "f").signal.aborted)
              ke(this, Ie, "f").error("stream loop failed", { error: String(r) });
            ke(this, qe, "f").abort();
          });
        try {
          while (!0) {
            let s = await ke(this, In, "f").next(ke(this, qe, "f").signal);
            if (s.done) break;
            yield s.value;
          }
          await n;
          let r;
          while ((r = ke(this, In, "f").tryShift()) !== void 0) yield r;
        } finally {
          (ke(this, qe, "f").abort(), ke(this, ct, "f").disarm(), await n);
          try {
            await ke(this, ve, "m", Zu).call(this);
          } catch (error) {
            ke(this, Ie, "f").warn("drain failed", { error: String(error) });
          }
          ke(this, In, "f").close();
          for (let tool of this.tools)
            try {
              await tool.close?.();
            } catch (error) {
              ke(this, Ie, "f").warn("tool.close failed", { tool: la(tool), error: String(error) });
            }
          ke(this, Ss, "f").call(this);
        }
      }
    }
    return e;
  })();
//@ chunk-hwmsct5x.js:64562-70363 esm-fingerprint
((Es = function () {
  return {
    ...ke(this, Ur, "f"),
    headers: T([wr("session-tool-runner"), ke(this, Ur, "f")?.headers]),
    signal: ke(this, qe, "f").signal,
  };
}),
  (Qu = async function () {
    let n = ke(this, qe, "f"),
      r = Ju;
    while (!n.signal.aborted) {
      try {
        let stream = await this.client.beta.sessions.events.stream(
          this.sessionId,
          {},
          ke(this, ve, "m", Es).call(this),
        );
        await ke(this, ve, "m", Gu).call(this);
        for await (let h of stream) if (((r = Ju), await ke(this, ve, "m", ju).call(this, h))) return;
      } catch (error) {
        if ((n.signal.throwIfAborted(), on(error)))
          throw (
            ke(this, Ie, "f").error("permanent stream failure, shutting down", { error: String(error) }),
            n.abort(),
            error
          );
        ke(this, Ie, "f").warn("stream disconnected, reconnecting", { error: String(error), backoff_ms: r });
      }
      (n.signal.throwIfAborted(), await sleepUnlessAborted(r, n.signal), (r = Math.min(r * 2, Rm)));
    }
  }),
  (Gu = async function () {
    let n = ke(this, qe, "f"),
      r = [],
      s = !1;
    try {
      for await (let w of this.client.beta.sessions.events.list(
        this.sessionId,
        { limit: 1000 },
        ke(this, ve, "m", Es).call(this),
      ))
        (ke(this, ve, "m", Yu).call(this, w, r), (s = ed(w)));
    } catch (error) {
      (n.signal.throwIfAborted(), ke(this, Ie, "f").warn("reconcile list failed", { error: String(error) }));
      for (let S of r) ke(this, Ln, "f").delete(S.id);
      return;
    }
    let filtered = r.filter((w) => !ke(this, rt, "f").has(w.id));
    ke(this, ct, "f").disarm();
    for (let w of filtered) await ke(this, ve, "m", da).call(this, w);
    for (let w of [...ke(this, zt, "f").values()]) {
      let S = ke(this, Fn, "f").get(w.id);
      if (S !== void 0) await ke(this, ve, "m", vs).call(this, w, S);
    }
    let filtered_2 = filtered.filter((w) => !ke(this, rt, "f").has(w.id) && !ke(this, zt, "f").has(w.id));
    if (s && filtered_2.length === 0) ke(this, ct, "f").arm();
    else ke(this, ct, "f").disarm();
  }),
  (Yu = function (n, r) {
    if (n.type === "agent.tool_use" || n.type === "agent.custom_tool_use") {
      if ((ke(this, Ln, "f").add(n.id), !ke(this, rt, "f").has(n.id))) r.push(n);
    } else if (n.type === "user.tool_result") ke(this, rt, "f").add(n.tool_use_id);
    else if (n.type === "user.custom_tool_result") ke(this, rt, "f").add(n.custom_tool_use_id);
    else if (n.type === "user.tool_confirmation") {
      if (!ke(this, rt, "f").has(n.tool_use_id)) ke(this, Fn, "f").set(n.tool_use_id, n.result);
    }
  }),
  (ju = async function (n) {
    switch ((ke(this, ct, "f").noteEvent(n), n.type)) {
      case "agent.tool_use":
      case "agent.custom_tool_use":
        if (!ke(this, Ln, "f").has(n.id))
          (ke(this, Ln, "f").add(n.id), await ke(this, ve, "m", da).call(this, n));
        return !1;
      case "user.tool_confirmation":
        return (await ke(this, ve, "m", Ku).call(this, n), !1);
      case "user.tool_result":
        return (ke(this, rt, "f").add(n.tool_use_id), !1);
      case "user.custom_tool_result":
        return (ke(this, rt, "f").add(n.custom_tool_use_id), !1);
      case "session.status_terminated":
      case "session.deleted":
        return (
          ke(this, Ie, "f").info("session terminated", {
            component: "session-tool-runner",
            session_id: this.sessionId,
          }),
          ke(this, qe, "f").abort(),
          !0
        );
      default:
        return !1;
    }
  }),
  (da = async function (n) {
    let evaluated_permission = n.evaluated_permission,
      s = evaluated_permission === "deny" ? "deny" : ke(this, Fn, "f").get(n.id);
    if (s === void 0) {
      if (evaluated_permission === void 0 || evaluated_permission === "allow")
        await ke(this, ve, "m", ca).call(this, n, void 0);
      else if (!ke(this, zt, "f").has(n.id))
        (ke(this, Ie, "f").info("tool call awaiting confirmation; holding", {
          component: "session-tool-runner",
          session_id: this.sessionId,
          tool: n.name,
          tool_use_id: n.id,
        }),
          ke(this, zt, "f").set(n.id, n),
          ke(this, ct, "f").block(n.id));
      return;
    }
    await ke(this, ve, "m", vs).call(this, n, s);
  }),
  (Ku = async function (n) {
    ke(this, Fn, "f").set(n.tool_use_id, n.result);
    let r = ke(this, zt, "f").get(n.tool_use_id);
    if (r === void 0) return;
    await ke(this, ve, "m", vs).call(this, r, n.result);
  }),
  (vs = async function (n, r) {
    let s = ke(this, zt, "f").delete(n.id);
    if (r === "allow") {
      if (
        (ke(this, Ie, "f").info("tool call confirmed", {
          component: "session-tool-runner",
          session_id: this.sessionId,
          tool: n.name,
          tool_use_id: n.id,
        }),
        !s)
      )
        ke(this, ct, "f").block(n.id);
      try {
        await ke(this, ve, "m", ca).call(this, n, "allow");
      } finally {
        ke(this, ct, "f").unblock(n.id);
      }
      return;
    }
    if (s) ke(this, ct, "f").unblock(n.id);
    (ke(this, rt, "f").add(n.id),
      ke(this, Ie, "f").info("tool call denied; not executing", {
        component: "session-tool-runner",
        session_id: this.sessionId,
        tool: n.name,
        tool_use_id: n.id,
      }),
      ke(this, ve, "m", Rs).call(this, {
        event: n,
        toolUseId: n.id,
        name: n.name,
        isError: !1,
        posted: !1,
        confirmation: "deny",
      }));
  }),
  (Rs = function (n) {
    ke(this, In, "f").push(n);
  }),
  (ca = async function (n, r) {
    var s, h;
    if (ke(this, rt, "f").has(n.id)) return;
    (ke(this, Ie, "f").info("executing tool", {
      component: "session-tool-runner",
      session_id: this.sessionId,
      tool: n.name,
      tool_use_id: n.id,
    }),
      Kn(this, Mt, ((s = ke(this, Mt, "f")), s++, s), "f"));
    try {
      let y = ke(this, As, "f").get(n.name);
      if (!y) {
        (ke(this, Ie, "f").info(
          "tool not owned by this runner; leaving the tool_use_id pending for its owner",
          { component: "session-tool-runner", session_id: this.sessionId, tool: n.name, tool_use_id: n.id },
        ),
          ke(this, ve, "m", Rs).call(this, {
            event: n,
            toolUseId: n.id,
            name: n.name,
            isError: !1,
            posted: !1,
            confirmation: r,
          }));
        return;
      }
      let w,
        S,
        abortController = new AbortController(),
        R = qt(ke(this, qe, "f").signal, abortController),
        L = setTimeout(() => abortController.abort(), Am);
      try {
        let P = await zu(y, n.input, { toolUse: n, toolUseBlock: n, signal: abortController.signal });
        ((w = P.content), (S = P.isError));
      } finally {
        (clearTimeout(L), R());
      }
      let O = Cm(n, S, Im(w)),
        M = await ke(this, ve, "m", Xu).call(this, O, n.id);
      ke(this, ve, "m", Rs).call(this, {
        event: n,
        result: O,
        toolUseId: n.id,
        name: n.name,
        isError: S,
        posted: M,
        confirmation: r,
      });
    } finally {
      if ((Kn(this, Mt, ((h = ke(this, Mt, "f")), h--, h), "f"), ke(this, Mt, "f") === 0))
        ke(this, Nr, "f")?.call(this);
    }
  }),
  (Xu = async function (n, r) {
    let s = ke(this, qe, "f"),
      now = Date.now(),
      y,
      w = 0;
    while (!0) {
      (w++, s.signal.throwIfAborted());
      try {
        return (
          await this.client.beta.sessions.events.send(
            this.sessionId,
            { events: [n] },
            ke(this, ve, "m", Es).call(this),
          ),
          ke(this, rt, "f").add(r),
          !0
        );
      } catch (error) {
        if (((y = error), on(error))) break;
        let E = ke(this, ks, "f") - (Date.now() - now);
        if (E <= 0) break;
        let min = Math.min(fs(cs(w - 1, xm, Tm)), E);
        (ke(this, Ie, "f").warn("tool result send failed; retrying", {
          tool_use_id: r,
          attempt: w,
          backoff_ms: min,
          error: String(error),
        }),
          await sleepUnlessAborted(min, s.signal));
      }
    }
    return (
      ke(this, Ie, "f").error("failed to send tool result", {
        tool_use_id: r,
        attempts: w,
        error: String(y),
      }),
      !1
    );
  }),
  (Zu = async function () {
    if (ke(this, Mt, "f") === 0) return;
    if (
      (await Promise.race([new Promise((n) => Kn(this, Nr, n, "f")), sleepUnlessAborted(km)]),
      Kn(this, Nr, null, "f"),
      ke(this, Mt, "f") > 0)
    )
      ke(this, Ie, "f").warn("drain timeout exceeded");
  }));
//@ chunk-hwmsct5x.js:70363-70572 esm-fingerprint
function Cm(e, n, r) {
  if (e.type === "agent.custom_tool_use")
    return { type: "user.custom_tool_result", custom_tool_use_id: e.id, is_error: n, content: r };
  return { type: "user.tool_result", tool_use_id: e.id, is_error: n, content: r };
}
//@ chunk-hwmsct5x.js:70572-71076 esm-fingerprint
function Im(e) {
  if (typeof e === "string") return [{ type: "text", text: e || "(no output)" }];
  let mapped = e.map((r) => {
    if (r.type === "text") return { type: "text", text: r.text || "(no output)" };
    if (r.type === "image" || r.type === "document") return r;
    if (r.type === "search_result")
      return {
        type: "search_result",
        source: r.source,
        title: r.title,
        content: r.content.map((s) => ({ type: "text", text: s.text })),
        citations: { enabled: r.citations?.enabled ?? !1 },
      };
    return { type: "text", text: JSON.stringify(r) };
  });
  return mapped.length > 0 ? mapped : [{ type: "text", text: "(no output)" }];
}

export { Br };
