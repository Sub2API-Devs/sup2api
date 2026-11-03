/**
 * @anthropic-ai/sdk/lib/environments/worker.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (9)
 * attribution: esm-layout 1, esm-fingerprint 8
 */
import { decodeUtf8 } from "../../internal/utils/bytes.mjs";
import { du } from "../../internal/utils/base64.mjs";
import { pr, Ot } from "../../core/error.mjs";
import { M8r } from "../../tools/agent-toolset/sync-interval.mjs";
import { Kn, ke } from "../../internal/tslib.mjs";
import { Fr } from "./poller.mjs";
import { Tb } from "../../internal/utils/log.mjs";
import { cS } from "../../internal/utils/env.mjs";
import { ps } from "../helper-client.mjs";
import { qt } from "../../internal/utils/abort.mjs";
import { Br } from "../tools/SessionToolRunner.mjs";
import { T } from "../../internal/headers.mjs";
import { hJ, on } from "../../internal/utils/backoff.mjs";
import { Ni } from "../../internal/utils/values.mjs";
import { sleepUnlessAborted } from "../../tools/agent-toolset/memories.mjs";

//@ chunk-hwmsct5x.js:71272-71327 esm-layout
var xs,
  Hr,
  fa,
  $r,
  Dn,
  nd = 30000,
  Fm = 90000,
  NO_HEARTBEAT = "NO_HEARTBEAT";
//@ chunk-hwmsct5x.js:71327-71396 esm-fingerprint
function Um(e) {
  return e.resources.some((resource) => resource.type === "memory_store");
}
//@ chunk-hwmsct5x.js:71396-71694 esm-fingerprint
function Nm(e) {
  if (!e) return null;
  let n;
  try {
    let replaced = e.replace(/-/g, "+").replace(/_/g, "/"),
      padded = replaced.padEnd(Math.ceil(replaced.length / 4) * 4, "=");
    n = JSON.parse(decodeUtf8(du(padded)));
  } catch {
    return null;
  }
  if (n === null || typeof n !== "object" || Array.isArray(n)) return null;
  let sessions_token = n.sessions_token;
  return typeof sessions_token === "string" && sessions_token !== "" ? sessions_token : null;
}
//@ chunk-hwmsct5x.js:71694-77525 esm-fingerprint
var pa = (() => {
  class e {
    constructor(n) {
      if ((xs.add(this), Hr.set(this, void 0), n.unrestrictedPaths !== void 0))
        throw new pr(
          "The `unrestrictedPaths` option you passed to EnvironmentWorker (or client.beta.environments.work.worker()) is no longer supported. The worker's file tools (read, write, edit, glob, grep) are now always confined to `workdir` plus the session's memory folders. Remove `unrestrictedPaths` from your options; to let the file tools reach any other directory, add it to `AgentToolContext.allowedRoots` from a `tools` factory.",
        );
      if (
        ((this.client = n.client),
        (this.environmentId = n.environmentId),
        (this.environmentKey = n.environmentKey),
        (this.tools = n.tools),
        (this.workdir = n.workdir ?? process.cwd()),
        (this.maxFileBytes = n.maxFileBytes),
        (this.maxIdleMs = n.maxIdleMs),
        n.memorySyncIntervalMs != null)
      )
        M8r(n.memorySyncIntervalMs, "memorySyncIntervalMs");
      ((this.memorySyncIntervalMs = n.memorySyncIntervalMs),
        (this.memorySyncDeletions = n.memorySyncDeletions ?? "enabled"),
        (this.workerId = n.workerId),
        (this.requestOptions = n.requestOptions),
        Kn(this, Hr, n.signal, "f"));
    }
    async run(n) {
      let { environmentId: environmentId, environmentKey: environmentKey } = this;
      if (environmentId === void 0 || environmentKey === void 0)
        throw new pr("EnvironmentWorker.run: environmentId and environmentKey are required to poll for work");
      let h = n ?? ke(this, Hr, "f"),
        y = new Fr({
          client: this.client,
          environmentId: environmentId,
          environmentKey: environmentKey,
          ...(this.workerId !== void 0 ? { workerId: this.workerId } : {}),
          ...(h ? { signal: h } : {}),
          ...(this.requestOptions !== void 0 ? { requestOptions: this.requestOptions } : {}),
          autoStop: !1,
        });
      for await (let w of y)
        try {
          await ke(this, xs, "m", fa).call(this, w, environmentKey, y.signal);
        } catch (error) {
          if (y.signal?.aborted) throw error;
          Tb(this.client).error("work item failed", { work_id: w.id, error: String(error) });
        }
    }
    async handleItem(n) {
      let r = n?.workId ?? cS("ANTHROPIC_WORK_ID"),
        s = n?.environmentId ?? cS("ANTHROPIC_ENVIRONMENT_ID"),
        h = n?.sessionId ?? cS("ANTHROPIC_SESSION_ID"),
        y = (n?.environmentKey ?? this.environmentKey ?? cS("ANTHROPIC_ENVIRONMENT_KEY")) || void 0,
        w = n?.workSecret || cS("ANTHROPIC_WORK_SECRET") || null;
      if (!r) throw new pr("handleItem: workId is required \u2014 pass it or set ANTHROPIC_WORK_ID");
      if (!s)
        throw new pr("handleItem: environmentId is required \u2014 pass it or set ANTHROPIC_ENVIRONMENT_ID");
      if (!h) throw new pr("handleItem: sessionId is required \u2014 pass it or set ANTHROPIC_SESSION_ID");
      if (!y && !w)
        throw new pr(
          "handleItem: environmentKey is required when there is no work secret \u2014 pass it, construct the worker with it, or set ANTHROPIC_ENVIRONMENT_KEY",
        );
      let S = { id: r, environment_id: s, secret: w, data: { type: "session", id: h } };
      await ke(this, xs, "m", fa).call(this, S, y, n?.signal ?? ke(this, Hr, "f"));
    }
  }
  return (
    (Hr = new WeakMap()),
    (xs = new WeakSet()),
    (fa = async function (r, s, h) {
      let y = Tb(this.client),
        w = Nm(r.secret),
        S = w ?? s;
      if (S === void 0)
        throw new pr(
          "handleItem: the work item carried a secret payload but no sessions token could be extracted, and there is no environment key to fall back to; the poller must issue a secret whose payload carries `sessions_token`, or provide the environment key (pass it, construct the worker with it, or set ANTHROPIC_ENVIRONMENT_KEY)",
        );
      if (r.secret && w === null)
        y.warn(
          "work item carried a secret payload but no sessions token could be extracted; falling back to the environment key",
          { work_id: r.id },
        );
      let E = ps(this.client, { authToken: S, helper: "environments-worker" }),
        id = r.data.id,
        abortController = new AbortController(),
        O = qt(h, abortController),
        M = new Hm(abortController),
        P = await import("./chunk-2cw52qnf.js"),
        H,
        j,
        z = qm(E, r, M, y, this.requestOptions, (Z) => {
          ((H = Z), j?._setSendRetryWindow(Z));
        }).catch((Z) => {
          if (!abortController.signal.aborted)
            y.error("heartbeat loop failed", { work_id: r.id, error: String(Z) });
          abortController.abort();
        }),
        G = async () => {},
        q,
        J = !1;
      try {
        if (r.data.type !== "session") {
          y.debug("skipping non-session work item", { work_id: r.id, type: r.data.type });
          return;
        }
        let retrieve = await E.beta.sessions.retrieve(id);
        if (w === null && this.memorySyncIntervalMs !== null && Um(retrieve))
          throw new P.SessionMemoryError(
            `cannot mount the session's memories: the work item carried no sessions token (work_id=${r.id}, session_id=${id}); the memory endpoints reject the environment key, so the poller must issue a per-item \`secret\` carrying \`sessions_token\`, or set \`memorySyncIntervalMs: null\` to run without memory`,
          );
        let Q = {
          workdir: this.workdir,
          client: E,
          session: retrieve,
          ...(this.maxFileBytes !== void 0 ? { maxFileBytes: this.maxFileBytes } : {}),
        };
        try {
          G = await P.setupSkills(Q);
        } catch (error) {
          y.warn("skill setup failed", { session_id: id, work_id: r.id, error: String(error) });
        }
        if (w !== null && this.memorySyncIntervalMs !== null)
          ((q = new P.SessionMemoryStores(E, {
            workdir: this.workdir,
            ...(this.memorySyncIntervalMs !== void 0 ? { syncIntervalMs: this.memorySyncIntervalMs } : {}),
            syncDeletions: this.memorySyncDeletions,
          })),
            await q.download(retrieve),
            (Q.allowedRoots = q.roots),
            (Q.readOnlyRoots = q.readOnlyRoots));
        else y.debug("memory stores disabled for this item", { work_id: r.id });
        let ne =
          typeof this.tools === "function" ? this.tools(Q) : (this.tools ?? P.betaAgentToolset20260401(Q));
        if (
          ((j = new Br(id, {
            client: E,
            tools: ne,
            ...(this.maxIdleMs !== void 0 ? { maxIdleMs: this.maxIdleMs } : {}),
            ...(this.requestOptions !== void 0 ? { requestOptions: this.requestOptions } : {}),
            signal: abortController.signal,
          })),
          H !== void 0)
        )
          j._setSendRetryWindow(H);
        for await (let te of j) if (q) await q.syncIfDue();
        J = !abortController.signal.aborted;
      } finally {
        try {
          await G().catch((Z) => {
            y.warn("skill cleanup failed", { session_id: id, work_id: r.id, error: String(Z) });
          });
        } finally {
          if (q) {
            let MEMORY_FLUSH_TIMEOUT_MS = P.MEMORY_FLUSH_TIMEOUT_MS;
            if (J) {
              if (await rd(q.finish(), MEMORY_FLUSH_TIMEOUT_MS))
                y.warn(
                  `final memory sync cut off after ${MEMORY_FLUSH_TIMEOUT_MS}ms; the flush that follows still uploads changed files`,
                  { session_id: id, work_id: r.id },
                );
            }
            let abortController = new AbortController();
            if (await rd(q.flushWrites(abortController.signal), MEMORY_FLUSH_TIMEOUT_MS))
              (abortController.abort(),
                y.warn(
                  `memory flush cut off after ${MEMORY_FLUSH_TIMEOUT_MS}ms; changed files it had not uploaded yet are not saved`,
                  { session_id: id, work_id: r.id },
                ));
            await q.dispose().catch((te) => {
              y.warn("memory store cleanup failed", { session_id: id, work_id: r.id, error: String(te) });
            });
          }
        }
        if ((M.finish("runner_done"), O(), await z, M.lost))
          y.info("lease lost; released without stopping it", { session_id: id, work_id: r.id });
        else await Bm(E, r, y, this.requestOptions);
      }
    }),
    e
  );
})();
//@ chunk-hwmsct5x.js:77525-77694 esm-fingerprint
async function rd(e, n) {
  let r;
  try {
    return await Promise.race([
      e.then(
        () => !1,
        () => !1,
      ),
      new Promise((s) => {
        r = setTimeout(() => s(!0), n);
      }),
    ]);
  } finally {
    if (r !== void 0) clearTimeout(r);
  }
}
//@ chunk-hwmsct5x.js:77694-77933 esm-fingerprint
async function Bm(e, n, r, s) {
  try {
    await e.beta.environments.work.stop(
      n.id,
      { environment_id: n.environment_id, force: !0 },
      { ...s, headers: T([s?.headers]) },
    );
  } catch (error) {
    if (!hJ(error, 409)) r.error("force-stop on exit failed", { work_id: n.id, error: String(error) });
  }
}
//@ chunk-hwmsct5x.js:77933-78266 esm-fingerprint
var Hm = (() => {
  class e {
    constructor(n) {
      ($r.set(this, void 0), Dn.set(this, void 0), Kn(this, $r, n, "f"));
    }
    get signal() {
      return ke(this, $r, "f").signal;
    }
    finish(n) {
      (Kn(this, Dn, ke(this, Dn, "f") ?? n, "f"), ke(this, $r, "f").abort());
    }
    get lost() {
      return ke(this, Dn, "f") === "lease_lost" || ke(this, Dn, "f") === "assumed_lost";
    }
  }
  return (($r = new WeakMap()), (Dn = new WeakMap()), e);
})();
//@ chunk-hwmsct5x.js:78266-78411 esm-fingerprint
function $m(e) {
  let n = e instanceof Ot ? e.error : void 0;
  for (let r of ["error", "details", "current_state"]) {
    if (!Ni(n)) return {};
    n = n[r];
  }
  return Ni(n) ? n : {};
}
//@ chunk-hwmsct5x.js:78411-79802 esm-fingerprint
async function qm(e, n, r, s, h, y) {
  let w = nd,
    S = Fm,
    now = Date.now(),
    R = NO_HEARTBEAT,
    L = async () => {
      let abortController = new AbortController(),
        M = qt(r.signal, abortController),
        P = setTimeout(() => abortController.abort(), w);
      try {
        let heartbeat = await e.beta.environments.work.heartbeat(
          n.id,
          { environment_id: n.environment_id, expected_last_heartbeat: R },
          { ...h, headers: T([h?.headers]), signal: abortController.signal },
        );
        if (((now = Date.now()), (R = heartbeat.last_heartbeat), heartbeat.ttl_seconds > 0))
          ((S = heartbeat.ttl_seconds * 1000), (w = Math.max(1000, Math.min(S / 2, nd))), y?.(S));
        if (heartbeat.state === "stopping" || heartbeat.state === "stopped")
          (s.info("heartbeat signals shutdown", { work_id: n.id, state: heartbeat.state }),
            r.finish("control_plane_stop"));
        if (!heartbeat.lease_extended)
          (s.warn("lease not extended, shutting down", { work_id: n.id }), r.finish("control_plane_stop"));
      } catch (error) {
        if ((r.signal.throwIfAborted(), hJ(error, 412))) {
          let j = $m(error);
          (s.error("lease lost: heartbeat precondition failed", {
            work_id: n.id,
            server_state: j.state,
            server_ttl_seconds: j.ttl_seconds,
            server_last_heartbeat: j.last_heartbeat,
          }),
            r.finish("lease_lost"));
          return;
        }
        if (on(error))
          throw (
            s.error("permanent heartbeat failure", { work_id: n.id, error: String(error) }),
            r.finish("heartbeat_rejected"),
            error
          );
        if (Date.now() - now > S) {
          (s.error("lease assumed lost: no successful heartbeat in ttl", {
            work_id: n.id,
            ttl_ms: S,
            error: String(error),
          }),
            r.finish("assumed_lost"));
          return;
        }
        s.warn("transient heartbeat failure", { work_id: n.id, error: String(error) });
      } finally {
        (clearTimeout(P), M());
      }
    };
  await L();
  while (!r.signal.aborted) (await sleepUnlessAborted(w, r.signal), r.signal.throwIfAborted(), await L());
}

export { pa };
