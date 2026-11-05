/**
 * @anthropic-ai/sdk/lib/environments/poller.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __classPrivateFieldSet, __classPrivateFieldGet } from "../../internal/tslib.mjs";
import { copyClientForHelper } from "../helper-client.mjs";
import { linkAbort } from "../../internal/utils/abort.mjs";
import { AnthropicError } from "../../core/error.mjs";
import { loggerFor } from "../../internal/utils/log.mjs";
import { buildHeaders } from "../../internal/headers.mjs";
import { isFatal4xx, applyJitter, jitter, isStatus, backoff } from "../../internal/utils/backoff.mjs";
import { sleepUnlessAborted } from "../../tools/agent-toolset/memories.mjs";
import { uuid4 } from "../../internal/utils/uuid.mjs";

//@ chunk-vn3g7zt8.js:56759-59419 esm-layout
var _WorkPoller_runnerClient;
var _WorkPoller_consumed;
var _WorkPoller_controller;
var _WorkPoller_detachExternal;
var _WorkPoller_autoStop;
var _WorkPoller_drain;
var _WorkPoller_blockMs;
var _WorkPoller_reclaimOlderThanMs;
var _WorkPoller_requestOpts;
var _IdleLog_log;
var _IdleLog_environmentId;
var _IdleLog_idleSince;
var _IdleLog_lastReport;
var POLL_BLOCK_MS = 999;
var POLL_BACKOFF_BASE_MS = 1000;
var POLL_BACKOFF_CAP_MS = 60000;
var IDLE_REPORT_INTERVAL_MS = 300000;
var WorkPoller = (() => {
  class WorkPoller {
    constructor(opts) {
      _WorkPoller_runnerClient.set(this, undefined);
      _WorkPoller_consumed.set(this, false);
      _WorkPoller_controller.set(this, undefined);
      _WorkPoller_detachExternal.set(this, undefined);
      _WorkPoller_autoStop.set(this, undefined);
      _WorkPoller_drain.set(this, undefined);
      _WorkPoller_blockMs.set(this, undefined);
      _WorkPoller_reclaimOlderThanMs.set(this, undefined);
      _WorkPoller_requestOpts.set(this, undefined);
      this.client = opts.client;
      this.environmentId = opts.environmentId;
      this.environmentKey = opts.environmentKey;
      this.workerId = opts.workerId ?? defaultWorkerId();
      __classPrivateFieldSet(
        this,
        _WorkPoller_runnerClient,
        copyClientForHelper(opts.client, {
          authToken: opts.environmentKey,
          helper: "environments-work-poller",
        }),
        "f",
      );
      __classPrivateFieldSet(this, _WorkPoller_autoStop, opts.autoStop ?? true, "f");
      __classPrivateFieldSet(this, _WorkPoller_drain, opts.drain ?? false, "f");
      __classPrivateFieldSet(
        this,
        _WorkPoller_blockMs,
        opts.blockMs === undefined ? POLL_BLOCK_MS : opts.blockMs,
        "f",
      );
      __classPrivateFieldSet(this, _WorkPoller_reclaimOlderThanMs, opts.reclaimOlderThanMs ?? null, "f");
      __classPrivateFieldSet(this, _WorkPoller_requestOpts, opts.requestOptions, "f");
      __classPrivateFieldSet(this, _WorkPoller_controller, new AbortController(), "f");
      __classPrivateFieldSet(
        this,
        _WorkPoller_detachExternal,
        linkAbort(opts.signal, __classPrivateFieldGet(this, _WorkPoller_controller, "f")),
        "f",
      );
    }
    get signal() {
      return __classPrivateFieldGet(this, _WorkPoller_controller, "f").signal;
    }
    abort() {
      __classPrivateFieldGet(this, _WorkPoller_controller, "f").abort();
    }
    async *[((_WorkPoller_runnerClient = new WeakMap()),
    (_WorkPoller_consumed = new WeakMap()),
    (_WorkPoller_controller = new WeakMap()),
    (_WorkPoller_detachExternal = new WeakMap()),
    (_WorkPoller_autoStop = new WeakMap()),
    (_WorkPoller_drain = new WeakMap()),
    (_WorkPoller_blockMs = new WeakMap()),
    (_WorkPoller_reclaimOlderThanMs = new WeakMap()),
    (_WorkPoller_requestOpts = new WeakMap()),
    Symbol.asyncIterator)]() {
      if (__classPrivateFieldGet(this, _WorkPoller_consumed, "f"))
        throw new AnthropicError("Cannot iterate over a consumed WorkPoller");
      __classPrivateFieldSet(this, _WorkPoller_consumed, true, "f");
      let log = loggerFor(this.client);
      log.info("poller starting", {
        component: "work-poller",
        environment_id: this.environmentId,
      });
      let idle = new IdleLog(log, this.environmentId);
      try {
        let attempt = 0;
        while (!__classPrivateFieldGet(this, _WorkPoller_controller, "f").signal.aborted) {
          let work;
          try {
            work = await __classPrivateFieldGet(
              this,
              _WorkPoller_runnerClient,
              "f",
            ).beta.environments.work.poll(
              this.environmentId,
              {
                "Anthropic-Worker-ID": this.workerId,
                ...(__classPrivateFieldGet(this, _WorkPoller_blockMs, "f") !== null
                  ? {
                      block_ms: __classPrivateFieldGet(this, _WorkPoller_blockMs, "f"),
                    }
                  : {}),
                ...(__classPrivateFieldGet(this, _WorkPoller_reclaimOlderThanMs, "f") !== null
                  ? {
                      reclaim_older_than_ms: __classPrivateFieldGet(
                        this,
                        _WorkPoller_reclaimOlderThanMs,
                        "f",
                      ),
                    }
                  : {}),
              },
              {
                headers: buildHeaders([__classPrivateFieldGet(this, _WorkPoller_requestOpts, "f")?.headers]),
                signal: __classPrivateFieldGet(this, _WorkPoller_controller, "f").signal,
              },
            );
          } catch (e) {
            if (__classPrivateFieldGet(this, _WorkPoller_controller, "f").signal.aborted) return;
            if (isFatal4xx(e)) {
              log.error("poll failed permanently, stopping poller", {
                error: String(e),
              });
              throw e;
            }
            let wait = applyJitter(backoff_2(attempt));
            log.warn("poll failed, backing off", {
              error: String(e),
              backoff_ms: wait,
            });
            attempt++;
            await sleepUnlessAborted(wait, __classPrivateFieldGet(this, _WorkPoller_controller, "f").signal);
            continue;
          }
          attempt = 0;
          if (work == null) {
            if (__classPrivateFieldGet(this, _WorkPoller_drain, "f")) return;
            idle.onEmptyPoll();
            await sleepUnlessAborted(
              jitter(1000, 3000),
              __classPrivateFieldGet(this, _WorkPoller_controller, "f").signal,
            );
            continue;
          }
          idle.onClaim();
          log.info("claimed work", {
            component: "work-poller",
            environment_id: this.environmentId,
            work_id: work.id,
            work_type: work.data.type,
          });
          try {
            await __classPrivateFieldGet(this, _WorkPoller_runnerClient, "f").beta.environments.work.ack(
              work.id,
              {
                environment_id: work.environment_id,
              },
              {
                headers: buildHeaders([__classPrivateFieldGet(this, _WorkPoller_requestOpts, "f")?.headers]),
                signal: __classPrivateFieldGet(this, _WorkPoller_controller, "f").signal,
              },
            );
          } catch (e) {
            log.error("ack failed", {
              work_id: work.id,
              error: String(e),
            });
            continue;
          }
          try {
            yield work;
          } finally {
            if (__classPrivateFieldGet(this, _WorkPoller_autoStop, "f"))
              try {
                await __classPrivateFieldGet(this, _WorkPoller_runnerClient, "f").beta.environments.work.stop(
                  work.id,
                  {
                    environment_id: work.environment_id,
                  },
                  {
                    headers: buildHeaders([
                      __classPrivateFieldGet(this, _WorkPoller_requestOpts, "f")?.headers,
                    ]),
                  },
                );
              } catch (e) {
                if (!isStatus(e, 409))
                  log.warn("stop failed", {
                    work_id: work.id,
                    error: String(e),
                  });
              }
          }
        }
      } finally {
        __classPrivateFieldGet(this, _WorkPoller_detachExternal, "f").call(this);
      }
    }
  }
  return WorkPoller;
})();
//@ chunk-vn3g7zt8.js:59419-59453 esm-layout
function backoff_2(attempt) {
  return backoff(attempt, POLL_BACKOFF_BASE_MS, POLL_BACKOFF_CAP_MS);
}
//@ chunk-vn3g7zt8.js:59453-60103 esm-fingerprint
var IdleLog = (() => {
  class IdleLog {
    constructor(log, environmentId) {
      _IdleLog_log.set(this, undefined);
      _IdleLog_environmentId.set(this, undefined);
      _IdleLog_idleSince.set(this, undefined);
      _IdleLog_lastReport.set(this, 0);
      __classPrivateFieldSet(this, _IdleLog_log, log, "f");
      __classPrivateFieldSet(this, _IdleLog_environmentId, environmentId, "f");
    }
    onEmptyPoll() {
      let now = Date.now();
      let fields = {
        component: "work-poller",
        environment_id: __classPrivateFieldGet(this, _IdleLog_environmentId, "f"),
      };
      if (__classPrivateFieldGet(this, _IdleLog_idleSince, "f") === undefined) {
        __classPrivateFieldSet(
          this,
          _IdleLog_idleSince,
          __classPrivateFieldSet(this, _IdleLog_lastReport, now, "f"),
          "f",
        );
        __classPrivateFieldGet(this, _IdleLog_log, "f").info("idle; polling for work", fields);
      } else if (now - __classPrivateFieldGet(this, _IdleLog_lastReport, "f") >= IDLE_REPORT_INTERVAL_MS) {
        __classPrivateFieldSet(this, _IdleLog_lastReport, now, "f");
        __classPrivateFieldGet(this, _IdleLog_log, "f").info(
          `still polling; idle for ${Math.round((now - __classPrivateFieldGet(this, _IdleLog_idleSince, "f")) / 1000)}s`,
          fields,
        );
      } else __classPrivateFieldGet(this, _IdleLog_log, "f").debug("poll returned no work", fields);
    }
    onClaim() {
      __classPrivateFieldSet(this, _IdleLog_idleSince, undefined, "f");
    }
  }
  _IdleLog_log = new WeakMap();
  _IdleLog_environmentId = new WeakMap();
  _IdleLog_idleSince = new WeakMap();
  _IdleLog_lastReport = new WeakMap();
  return IdleLog;
})();
//@ chunk-vn3g7zt8.js:60103-60186 esm-fingerprint
function defaultWorkerId() {
  let host = globalThis.process?.env?.HOSTNAME;
  return host ? `${host}-${uuid4()}` : uuid4();
}
export { WorkPoller };
