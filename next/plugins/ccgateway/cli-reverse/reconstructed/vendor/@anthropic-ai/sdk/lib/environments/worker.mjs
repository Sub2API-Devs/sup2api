/**
 * @anthropic-ai/sdk/lib/environments/worker.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (9)
 * attribution: esm-layout 1, esm-fingerprint 8
 */
import { decodeUtf8 } from "../../internal/utils/bytes.mjs";
import { fromBuffer } from "../../internal/utils/base64.mjs";
import { AnthropicError, APIError } from "../../core/error.mjs";
import { checkMemorySyncInterval } from "../../tools/agent-toolset/sync-interval.mjs";
import { __classPrivateFieldSet, __classPrivateFieldGet } from "../../internal/tslib.mjs";
import { WorkPoller } from "./poller.mjs";
import { loggerFor } from "../../internal/utils/log.mjs";
import { readEnv } from "../../internal/utils/env.mjs";
import { copyClientForHelper } from "../helper-client.mjs";
import { linkAbort } from "../../internal/utils/abort.mjs";
import { SessionToolRunner } from "../tools/SessionToolRunner.mjs";
import { buildHeaders } from "../../internal/headers.mjs";
import { isStatus, isFatal4xx } from "../../internal/utils/backoff.mjs";
import { isObj } from "../../internal/utils/values.mjs";
import { sleepUnlessAborted } from "../../tools/agent-toolset/memories.mjs";

//@ chunk-vn3g7zt8.js:71643-71698 esm-layout
var _EnvironmentWorker_instances;
var _EnvironmentWorker_signal;
var _EnvironmentWorker_handleItem;
var _Lease_ctrl;
var _Lease_endReason;
var HEARTBEAT_DEFAULT_MS = 30000;
var HEARTBEAT_TTL_DEFAULT_MS = 90000;
var NO_HEARTBEAT_SENTINEL = "NO_HEARTBEAT";
//@ chunk-vn3g7zt8.js:71698-71767 esm-fingerprint
function hasMemoryStore(session) {
  return session.resources.some((r) => r.type === "memory_store");
}
//@ chunk-vn3g7zt8.js:71767-72065 esm-fingerprint
function sessionsTokenFromSecret(secret) {
  if (!secret) return null;
  let parsed;
  try {
    let normalized = secret.replace(/-/g, "+").replace(/_/g, "/");
    let padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    parsed = JSON.parse(decodeUtf8(fromBuffer(padded)));
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  let token = parsed.sessions_token;
  return typeof token === "string" && token !== "" ? token : null;
}
//@ chunk-vn3g7zt8.js:72065-77905 esm-fingerprint
var EnvironmentWorker = (() => {
  class EnvironmentWorker {
    constructor(opts) {
      _EnvironmentWorker_instances.add(this);
      _EnvironmentWorker_signal.set(this, undefined);
      if (opts.unrestrictedPaths !== undefined)
        throw new AnthropicError(
          "The `unrestrictedPaths` option you passed to EnvironmentWorker (or client.beta.environments.work.worker()) is no longer supported. The worker's file tools (read, write, edit, glob, grep) are now always confined to `workdir` plus the session's memory folders. Remove `unrestrictedPaths` from your options; to let the file tools reach any other directory, add it to `AgentToolContext.allowedRoots` from a `tools` factory.",
        );
      this.client = opts.client;
      this.environmentId = opts.environmentId;
      this.environmentKey = opts.environmentKey;
      this.tools = opts.tools;
      this.workdir = opts.workdir ?? process.cwd();
      this.maxFileBytes = opts.maxFileBytes;
      this.maxIdleMs = opts.maxIdleMs;
      if (opts.memorySyncIntervalMs != null)
        checkMemorySyncInterval(opts.memorySyncIntervalMs, "memorySyncIntervalMs");
      this.memorySyncIntervalMs = opts.memorySyncIntervalMs;
      this.memorySyncDeletions = opts.memorySyncDeletions ?? "enabled";
      this.workerId = opts.workerId;
      this.requestOptions = opts.requestOptions;
      __classPrivateFieldSet(this, _EnvironmentWorker_signal, opts.signal, "f");
    }
    async run(signal) {
      let { environmentId, environmentKey } = this;
      if (environmentId === undefined || environmentKey === undefined)
        throw new AnthropicError(
          "EnvironmentWorker.run: environmentId and environmentKey are required to poll for work",
        );
      let externalSignal = signal ?? __classPrivateFieldGet(this, _EnvironmentWorker_signal, "f");
      let poller = new WorkPoller({
        client: this.client,
        environmentId,
        environmentKey,
        ...(this.workerId !== undefined
          ? {
              workerId: this.workerId,
            }
          : {}),
        ...(externalSignal
          ? {
              signal: externalSignal,
            }
          : {}),
        ...(this.requestOptions !== undefined
          ? {
              requestOptions: this.requestOptions,
            }
          : {}),
        autoStop: false,
      });
      for await (let work of poller)
        try {
          await __classPrivateFieldGet(
            this,
            _EnvironmentWorker_instances,
            "m",
            _EnvironmentWorker_handleItem,
          ).call(this, work, environmentKey, poller.signal);
        } catch (e) {
          if (poller.signal?.aborted) throw e;
          loggerFor(this.client).error("work item failed", {
            work_id: work.id,
            error: String(e),
          });
        }
    }
    async handleItem(opts) {
      let workId = opts?.workId ?? readEnv("ANTHROPIC_WORK_ID");
      let environmentId = opts?.environmentId ?? readEnv("ANTHROPIC_ENVIRONMENT_ID");
      let sessionId = opts?.sessionId ?? readEnv("ANTHROPIC_SESSION_ID");
      let environmentKey =
        (opts?.environmentKey ?? this.environmentKey ?? readEnv("ANTHROPIC_ENVIRONMENT_KEY")) || undefined;
      let workSecret = opts?.workSecret || readEnv("ANTHROPIC_WORK_SECRET") || null;
      if (!workId)
        throw new AnthropicError("handleItem: workId is required \u2014 pass it or set ANTHROPIC_WORK_ID");
      if (!environmentId)
        throw new AnthropicError(
          "handleItem: environmentId is required \u2014 pass it or set ANTHROPIC_ENVIRONMENT_ID",
        );
      if (!sessionId)
        throw new AnthropicError(
          "handleItem: sessionId is required \u2014 pass it or set ANTHROPIC_SESSION_ID",
        );
      if (!environmentKey && !workSecret)
        throw new AnthropicError(
          "handleItem: environmentKey is required when there is no work secret \u2014 pass it, construct the worker with it, or set ANTHROPIC_ENVIRONMENT_KEY",
        );
      let work = {
        id: workId,
        environment_id: environmentId,
        secret: workSecret,
        data: {
          type: "session",
          id: sessionId,
        },
      };
      await __classPrivateFieldGet(
        this,
        _EnvironmentWorker_instances,
        "m",
        _EnvironmentWorker_handleItem,
      ).call(
        this,
        work,
        environmentKey,
        opts?.signal ?? __classPrivateFieldGet(this, _EnvironmentWorker_signal, "f"),
      );
    }
  }
  _EnvironmentWorker_signal = new WeakMap();
  _EnvironmentWorker_instances = new WeakSet();
  _EnvironmentWorker_handleItem = async function (work, environmentKey, externalSignal) {
    let log = loggerFor(this.client);
    let sessionsToken = sessionsTokenFromSecret(work.secret);
    let itemCredential = sessionsToken ?? environmentKey;
    if (itemCredential === undefined)
      throw new AnthropicError(
        "handleItem: the work item carried a secret payload but no sessions token could be extracted, and there is no environment key to fall back to; the poller must issue a secret whose payload carries `sessions_token`, or provide the environment key (pass it, construct the worker with it, or set ANTHROPIC_ENVIRONMENT_KEY)",
      );
    if (work.secret && sessionsToken === null)
      log.warn(
        "work item carried a secret payload but no sessions token could be extracted; falling back to the environment key",
        {
          work_id: work.id,
        },
      );
    let sessionClient = copyClientForHelper(this.client, {
      authToken: itemCredential,
      helper: "environments-worker",
    });
    let sessionId = work.data.id;
    let ctrl = new AbortController();
    let detachExternal = linkAbort(externalSignal, ctrl);
    let lease = new Lease(ctrl);
    let agentToolset = await import("../../tools/agent-toolset/MEMORY_FLUSH_TIMEOUT_MS.lazy.js");
    let leaseTtlMs;
    let runner;
    let heartbeatPromise = heartbeatLoop(sessionClient, work, lease, log, this.requestOptions, (ttlMs) => {
      leaseTtlMs = ttlMs;
      runner?._setSendRetryWindow(ttlMs);
    }).catch((e) => {
      if (!ctrl.signal.aborted)
        log.error("heartbeat loop failed", {
          work_id: work.id,
          error: String(e),
        });
      ctrl.abort();
    });
    let cleanupSkills = async () => {};
    let stores;
    let cleanEnd = false;
    try {
      if (work.data.type !== "session") {
        log.debug("skipping non-session work item", {
          work_id: work.id,
          type: work.data.type,
        });
        return;
      }
      let session = await sessionClient.beta.sessions.retrieve(sessionId);
      if (sessionsToken === null && this.memorySyncIntervalMs !== null && hasMemoryStore(session))
        throw new agentToolset.SessionMemoryError(
          `cannot mount the session's memories: the work item carried no sessions token (work_id=${work.id}, session_id=${sessionId}); the memory endpoints reject the environment key, so the poller must issue a per-item \`secret\` carrying \`sessions_token\`, or set \`memorySyncIntervalMs: null\` to run without memory`,
        );
      let ctx = {
        workdir: this.workdir,
        client: sessionClient,
        session,
        ...(this.maxFileBytes !== undefined
          ? {
              maxFileBytes: this.maxFileBytes,
            }
          : {}),
      };
      try {
        cleanupSkills = await agentToolset.setupSkills(ctx);
      } catch (e) {
        log.warn("skill setup failed", {
          session_id: sessionId,
          work_id: work.id,
          error: String(e),
        });
      }
      if (sessionsToken !== null && this.memorySyncIntervalMs !== null) {
        stores = new agentToolset.SessionMemoryStores(sessionClient, {
          workdir: this.workdir,
          ...(this.memorySyncIntervalMs !== undefined
            ? {
                syncIntervalMs: this.memorySyncIntervalMs,
              }
            : {}),
          syncDeletions: this.memorySyncDeletions,
        });
        await stores.download(session);
        ctx.allowedRoots = stores.roots;
        ctx.readOnlyRoots = stores.readOnlyRoots;
      } else
        log.debug("memory stores disabled for this item", {
          work_id: work.id,
        });
      let tools =
        typeof this.tools === "function"
          ? this.tools(ctx)
          : (this.tools ?? agentToolset.betaAgentToolset20260401(ctx));
      runner = new SessionToolRunner(sessionId, {
        client: sessionClient,
        tools,
        ...(this.maxIdleMs !== undefined
          ? {
              maxIdleMs: this.maxIdleMs,
            }
          : {}),
        ...(this.requestOptions !== undefined
          ? {
              requestOptions: this.requestOptions,
            }
          : {}),
        signal: ctrl.signal,
      });
      if (leaseTtlMs !== undefined) runner._setSendRetryWindow(leaseTtlMs);
      for await (let _ of runner) if (stores) await stores.syncIfDue();
      cleanEnd = !ctrl.signal.aborted;
    } finally {
      try {
        await cleanupSkills().catch((e) => {
          log.warn("skill cleanup failed", {
            session_id: sessionId,
            work_id: work.id,
            error: String(e),
          });
        });
      } finally {
        if (stores) {
          let boundMs = agentToolset.MEMORY_FLUSH_TIMEOUT_MS;
          if (cleanEnd) {
            if (await withTimeout(stores.finish(), boundMs))
              log.warn(
                `final memory sync cut off after ${boundMs}ms; the flush that follows still uploads changed files`,
                {
                  session_id: sessionId,
                  work_id: work.id,
                },
              );
          }
          let flushBound = new AbortController();
          if (await withTimeout(stores.flushWrites(flushBound.signal), boundMs)) {
            flushBound.abort();
            log.warn(
              `memory flush cut off after ${boundMs}ms; changed files it had not uploaded yet are not saved`,
              {
                session_id: sessionId,
                work_id: work.id,
              },
            );
          }
          await stores.dispose().catch((e) => {
            log.warn("memory store cleanup failed", {
              session_id: sessionId,
              work_id: work.id,
              error: String(e),
            });
          });
        }
      }
      lease.finish("runner_done");
      detachExternal();
      await heartbeatPromise;
      if (lease.lost)
        log.info("lease lost; released without stopping it", {
          session_id: sessionId,
          work_id: work.id,
        });
      else await forceStop(sessionClient, work, log, this.requestOptions);
    }
  };
  return EnvironmentWorker;
})();
//@ chunk-vn3g7zt8.js:77905-78074 esm-fingerprint
async function withTimeout(p, ms) {
  let timer;
  try {
    return await Promise.race([
      p.then(
        () => false,
        () => false,
      ),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(true), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
//@ chunk-vn3g7zt8.js:78074-78313 esm-fingerprint
async function forceStop(client, work, log, requestOptions) {
  try {
    await client.beta.environments.work.stop(
      work.id,
      {
        environment_id: work.environment_id,
        force: true,
      },
      {
        ...requestOptions,
        headers: buildHeaders([requestOptions?.headers]),
      },
    );
  } catch (e) {
    if (!isStatus(e, 409))
      log.error("force-stop on exit failed", {
        work_id: work.id,
        error: String(e),
      });
  }
}
//@ chunk-vn3g7zt8.js:78313-78646 esm-fingerprint
var Lease = (() => {
  class Lease {
    constructor(ctrl) {
      _Lease_ctrl.set(this, undefined);
      _Lease_endReason.set(this, undefined);
      __classPrivateFieldSet(this, _Lease_ctrl, ctrl, "f");
    }
    get signal() {
      return __classPrivateFieldGet(this, _Lease_ctrl, "f").signal;
    }
    finish(reason) {
      __classPrivateFieldSet(
        this,
        _Lease_endReason,
        __classPrivateFieldGet(this, _Lease_endReason, "f") ?? reason,
        "f",
      );
      __classPrivateFieldGet(this, _Lease_ctrl, "f").abort();
    }
    get lost() {
      return (
        __classPrivateFieldGet(this, _Lease_endReason, "f") === "lease_lost" ||
        __classPrivateFieldGet(this, _Lease_endReason, "f") === "assumed_lost"
      );
    }
  }
  _Lease_ctrl = new WeakMap();
  _Lease_endReason = new WeakMap();
  return Lease;
})();
//@ chunk-vn3g7zt8.js:78646-78791 esm-fingerprint
function serverLeaseState(error) {
  let node = error instanceof APIError ? error.error : undefined;
  for (let key of ["error", "details", "current_state"]) {
    if (!isObj(node)) return {};
    node = node[key];
  }
  return isObj(node) ? node : {};
}
//@ chunk-vn3g7zt8.js:78791-80182 esm-fingerprint
async function heartbeatLoop(client, work, lease, logger, requestOptions, onLeaseTtl) {
  let intervalMs = HEARTBEAT_DEFAULT_MS;
  let ttlMs = HEARTBEAT_TTL_DEFAULT_MS;
  let lastSuccessMs = Date.now();
  let last = NO_HEARTBEAT_SENTINEL;
  let beat = async () => {
    let beatCtrl = new AbortController();
    let detach = linkAbort(lease.signal, beatCtrl);
    let cutoff = setTimeout(() => beatCtrl.abort(), intervalMs);
    try {
      let resp = await client.beta.environments.work.heartbeat(
        work.id,
        {
          environment_id: work.environment_id,
          expected_last_heartbeat: last,
        },
        {
          ...requestOptions,
          headers: buildHeaders([requestOptions?.headers]),
          signal: beatCtrl.signal,
        },
      );
      lastSuccessMs = Date.now();
      last = resp.last_heartbeat;
      if (resp.ttl_seconds > 0) {
        ttlMs = resp.ttl_seconds * 1000;
        intervalMs = Math.max(1000, Math.min(ttlMs / 2, HEARTBEAT_DEFAULT_MS));
        onLeaseTtl?.(ttlMs);
      }
      if (resp.state === "stopping" || resp.state === "stopped") {
        logger.info("heartbeat signals shutdown", {
          work_id: work.id,
          state: resp.state,
        });
        lease.finish("control_plane_stop");
      }
      if (!resp.lease_extended) {
        logger.warn("lease not extended, shutting down", {
          work_id: work.id,
        });
        lease.finish("control_plane_stop");
      }
    } catch (e) {
      lease.signal.throwIfAborted();
      if (isStatus(e, 412)) {
        let server = serverLeaseState(e);
        logger.error("lease lost: heartbeat precondition failed", {
          work_id: work.id,
          server_state: server.state,
          server_ttl_seconds: server.ttl_seconds,
          server_last_heartbeat: server.last_heartbeat,
        });
        lease.finish("lease_lost");
        return;
      }
      if (isFatal4xx(e)) {
        logger.error("permanent heartbeat failure", {
          work_id: work.id,
          error: String(e),
        });
        lease.finish("heartbeat_rejected");
        throw e;
      }
      if (Date.now() - lastSuccessMs > ttlMs) {
        logger.error("lease assumed lost: no successful heartbeat in ttl", {
          work_id: work.id,
          ttl_ms: ttlMs,
          error: String(e),
        });
        lease.finish("assumed_lost");
        return;
      }
      logger.warn("transient heartbeat failure", {
        work_id: work.id,
        error: String(e),
      });
    } finally {
      clearTimeout(cutoff);
      detach();
    }
  };
  await beat();
  while (!lease.signal.aborted) {
    await sleepUnlessAborted(intervalMs, lease.signal);
    lease.signal.throwIfAborted();
    await beat();
  }
}
export { EnvironmentWorker };
