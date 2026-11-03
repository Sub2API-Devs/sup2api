/**
 * @anthropic-ai/sdk/lib/environments/poller.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */
import { Kn, ke } from "../../internal/tslib.mjs";
import { ps } from "../helper-client.mjs";
import { qt } from "../../internal/utils/abort.mjs";
import { pr } from "../../core/error.mjs";
import { Tb } from "../../internal/utils/log.mjs";
import { T } from "../../internal/headers.mjs";
import { on, fs, qu, hJ, cs } from "../../internal/utils/backoff.mjs";
import { sleepUnlessAborted } from "../../tools/agent-toolset/memories.mjs";
import { Ko } from "../../internal/utils/uuid.mjs";

//@ chunk-hwmsct5x.js:56388-59048 esm-layout
var An,
  hs,
  dt,
  ms,
  gs,
  _s,
  Pr,
  Cr,
  kn,
  xn,
  bs,
  Tn,
  Ir,
  gm = 999,
  _m = 1000,
  bm = 60000,
  ym = 300000,
  Fr = (() => {
    class e {
      constructor(n) {
        (An.set(this, void 0),
          hs.set(this, !1),
          dt.set(this, void 0),
          ms.set(this, void 0),
          gs.set(this, void 0),
          _s.set(this, void 0),
          Pr.set(this, void 0),
          Cr.set(this, void 0),
          kn.set(this, void 0),
          (this.client = n.client),
          (this.environmentId = n.environmentId),
          (this.environmentKey = n.environmentKey),
          (this.workerId = n.workerId ?? Em()),
          Kn(
            this,
            An,
            ps(n.client, { authToken: n.environmentKey, helper: "environments-work-poller" }),
            "f",
          ),
          Kn(this, gs, n.autoStop ?? !0, "f"),
          Kn(this, _s, n.drain ?? !1, "f"),
          Kn(this, Pr, n.blockMs === void 0 ? gm : n.blockMs, "f"),
          Kn(this, Cr, n.reclaimOlderThanMs ?? null, "f"),
          Kn(this, kn, n.requestOptions, "f"),
          Kn(this, dt, new AbortController(), "f"),
          Kn(this, ms, qt(n.signal, ke(this, dt, "f")), "f"));
      }
      get signal() {
        return ke(this, dt, "f").signal;
      }
      abort() {
        ke(this, dt, "f").abort();
      }
      async *[((An = new WeakMap()),
      (hs = new WeakMap()),
      (dt = new WeakMap()),
      (ms = new WeakMap()),
      (gs = new WeakMap()),
      (_s = new WeakMap()),
      (Pr = new WeakMap()),
      (Cr = new WeakMap()),
      (kn = new WeakMap()),
      Symbol.asyncIterator)]() {
        if (ke(this, hs, "f")) throw new pr("Cannot iterate over a consumed WorkPoller");
        Kn(this, hs, !0, "f");
        let n = Tb(this.client);
        n.info("poller starting", { component: "work-poller", environment_id: this.environmentId });
        let r = new Sm(n, this.environmentId);
        try {
          let s = 0;
          while (!ke(this, dt, "f").signal.aborted) {
            let h;
            try {
              h = await ke(this, An, "f").beta.environments.work.poll(
                this.environmentId,
                {
                  "Anthropic-Worker-ID": this.workerId,
                  ...(ke(this, Pr, "f") !== null ? { block_ms: ke(this, Pr, "f") } : {}),
                  ...(ke(this, Cr, "f") !== null ? { reclaim_older_than_ms: ke(this, Cr, "f") } : {}),
                },
                { headers: T([ke(this, kn, "f")?.headers]), signal: ke(this, dt, "f").signal },
              );
            } catch (error) {
              if (ke(this, dt, "f").signal.aborted) return;
              if (on(error))
                throw (n.error("poll failed permanently, stopping poller", { error: String(error) }), error);
              let w = fs(wm(s));
              (n.warn("poll failed, backing off", { error: String(error), backoff_ms: w }),
                s++,
                await sleepUnlessAborted(w, ke(this, dt, "f").signal));
              continue;
            }
            if (((s = 0), h == null)) {
              if (ke(this, _s, "f")) return;
              (r.onEmptyPoll(), await sleepUnlessAborted(qu(1000, 3000), ke(this, dt, "f").signal));
              continue;
            }
            (r.onClaim(),
              n.info("claimed work", {
                component: "work-poller",
                environment_id: this.environmentId,
                work_id: h.id,
                work_type: h.data.type,
              }));
            try {
              await ke(this, An, "f").beta.environments.work.ack(
                h.id,
                { environment_id: h.environment_id },
                { headers: T([ke(this, kn, "f")?.headers]), signal: ke(this, dt, "f").signal },
              );
            } catch (error) {
              n.error("ack failed", { work_id: h.id, error: String(error) });
              continue;
            }
            try {
              yield h;
            } finally {
              if (ke(this, gs, "f"))
                try {
                  await ke(this, An, "f").beta.environments.work.stop(
                    h.id,
                    { environment_id: h.environment_id },
                    { headers: T([ke(this, kn, "f")?.headers]) },
                  );
                } catch (error) {
                  if (!hJ(error, 409)) n.warn("stop failed", { work_id: h.id, error: String(error) });
                }
            }
          }
        } finally {
          ke(this, ms, "f").call(this);
        }
      }
    }
    return e;
  })();
//@ chunk-hwmsct5x.js:59048-59082 esm-layout
function wm(e) {
  return cs(e, _m, bm);
}
//@ chunk-hwmsct5x.js:59082-59732 esm-fingerprint
var Sm = (() => {
  class e {
    constructor(n, r) {
      (xn.set(this, void 0),
        bs.set(this, void 0),
        Tn.set(this, void 0),
        Ir.set(this, 0),
        Kn(this, xn, n, "f"),
        Kn(this, bs, r, "f"));
    }
    onEmptyPoll() {
      let now = Date.now(),
        r = { component: "work-poller", environment_id: ke(this, bs, "f") };
      if (ke(this, Tn, "f") === void 0)
        (Kn(this, Tn, Kn(this, Ir, now, "f"), "f"), ke(this, xn, "f").info("idle; polling for work", r));
      else if (now - ke(this, Ir, "f") >= ym)
        (Kn(this, Ir, now, "f"),
          ke(this, xn, "f").info(
            `still polling; idle for ${Math.round((now - ke(this, Tn, "f")) / 1000)}s`,
            r,
          ));
      else ke(this, xn, "f").debug("poll returned no work", r);
    }
    onClaim() {
      Kn(this, Tn, void 0, "f");
    }
  }
  return ((xn = new WeakMap()), (bs = new WeakMap()), (Tn = new WeakMap()), (Ir = new WeakMap()), e);
})();
//@ chunk-hwmsct5x.js:59732-59815 esm-fingerprint
function Em() {
  let n = globalThis.process?.env?.HOSTNAME;
  return n ? `${n}-${Ko()}` : Ko();
}

export { Fr };
