/**
 * @anthropic-ai/sdk/lib/tools/SessionToolRunner.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (7)
 * attribution: esm-layout 2, esm-fingerprint 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __classPrivateFieldSet, __classPrivateFieldGet } from "../../internal/tslib.mjs";
import { AsyncQueue } from "../../internal/utils/async-queue.mjs";
import { loggerFor } from "../../internal/utils/log.mjs";
import { toolName, runRunnableTool } from "./BetaRunnableTool.mjs";
import { linkAbort } from "../../internal/utils/abort.mjs";
import { AnthropicError } from "../../core/error.mjs";
import { buildHeaders } from "../../internal/headers.mjs";
import { stainlessHelperHeader } from "../../internal/stainless-helper-header.mjs";
import { isFatal4xx, applyJitter, backoff } from "../../internal/utils/backoff.mjs";
import { sleepUnlessAborted } from "../../tools/agent-toolset/memories.mjs";

//@ chunk-vn3g7zt8.js:61611-61714 esm-layout
var _IdleClock_maxIdleMs;
var _IdleClock_onExpire;
var _IdleClock_blockers;
var _IdleClock_armPending;
var _IdleClock_timer;
var _SessionToolRunner_instances;
var _SessionToolRunner_consumed;
var _SessionToolRunner_controller;
var _SessionToolRunner_detachExternal;
var _SessionToolRunner_requestOpts;
var _SessionToolRunner_toolByName;
var _SessionToolRunner_logger;
var _SessionToolRunner_seen;
var _SessionToolRunner_answered;
var _SessionToolRunner_confirmationVerdicts;
var _SessionToolRunner_awaitingConfirmation;
var _SessionToolRunner_results;
var _SessionToolRunner_inFlightCount;
var _SessionToolRunner_sendRetryWindowMs;
var _SessionToolRunner_onIdle;
var _SessionToolRunner_idleClock;
var _SessionToolRunner_requestOptions;
var _SessionToolRunner_streamLoop;
var _SessionToolRunner_reconcile;
var _SessionToolRunner_ingestHistory;
var _SessionToolRunner_handleStreamEvent;
var _SessionToolRunner_routeToolEvent;
var _SessionToolRunner_noteConfirmation;
var _SessionToolRunner_applyVerdict;
var _SessionToolRunner_surfaceCall;
var _SessionToolRunner_execute;
var _SessionToolRunner_sendResult;
var _SessionToolRunner_drain;
//@ chunk-vn3g7zt8.js:61714-61787 esm-layout
var STREAM_BACKOFF_START_MS = 500;
var STREAM_BACKOFF_CAP_MS = 1e4;
var TOOL_TIMEOUT_MS = 120000;
var DRAIN_TIMEOUT_MS = 30000;
var SEND_BACKOFF_START_MS = 1000;
var SEND_BACKOFF_CAP_MS = 30000;
var IDLE_REPORT_INTERVAL_MS_2 = 300000;
var DEFAULT_MAX_IDLE_MS = 60000;
//@ chunk-vn3g7zt8.js:61787-61874 esm-fingerprint
function isEndTurnIdle(ev) {
  return ev.type === "session.status_idle" && ev.stop_reason?.type === "end_turn";
}
//@ chunk-vn3g7zt8.js:61874-64933 esm-fingerprint
var IdleClock = (() => {
  class IdleClock {
    constructor(maxIdleMs, onExpire) {
      _IdleClock_maxIdleMs.set(this, undefined);
      _IdleClock_onExpire.set(this, undefined);
      _IdleClock_blockers.set(this, new Set());
      _IdleClock_armPending.set(this, false);
      _IdleClock_timer.set(this, undefined);
      __classPrivateFieldSet(this, _IdleClock_maxIdleMs, maxIdleMs, "f");
      __classPrivateFieldSet(this, _IdleClock_onExpire, onExpire, "f");
    }
    noteEvent(ev) {
      if (ev.type === "user.tool_confirmation") return;
      if (isEndTurnIdle(ev)) this.arm();
      else this.disarm();
    }
    block(toolUseId) {
      __classPrivateFieldGet(this, _IdleClock_blockers, "f").add(toolUseId);
      if (__classPrivateFieldGet(this, _IdleClock_timer, "f") !== undefined) {
        __classPrivateFieldSet(this, _IdleClock_armPending, true, "f");
        clearTimeout(__classPrivateFieldGet(this, _IdleClock_timer, "f"));
        __classPrivateFieldSet(this, _IdleClock_timer, undefined, "f");
      }
    }
    unblock(toolUseId) {
      __classPrivateFieldGet(this, _IdleClock_blockers, "f").delete(toolUseId);
      if (
        __classPrivateFieldGet(this, _IdleClock_blockers, "f").size === 0 &&
        __classPrivateFieldGet(this, _IdleClock_armPending, "f")
      )
        this.arm();
    }
    arm() {
      if (__classPrivateFieldGet(this, _IdleClock_maxIdleMs, "f") <= 0) return;
      if (__classPrivateFieldGet(this, _IdleClock_blockers, "f").size > 0) {
        __classPrivateFieldSet(this, _IdleClock_armPending, true, "f");
        return;
      }
      __classPrivateFieldSet(this, _IdleClock_armPending, false, "f");
      if (__classPrivateFieldGet(this, _IdleClock_timer, "f") !== undefined)
        clearTimeout(__classPrivateFieldGet(this, _IdleClock_timer, "f"));
      __classPrivateFieldSet(
        this,
        _IdleClock_timer,
        setTimeout(
          __classPrivateFieldGet(this, _IdleClock_onExpire, "f"),
          __classPrivateFieldGet(this, _IdleClock_maxIdleMs, "f"),
        ),
        "f",
      );
    }
    disarm() {
      __classPrivateFieldSet(this, _IdleClock_armPending, false, "f");
      if (__classPrivateFieldGet(this, _IdleClock_timer, "f") !== undefined) {
        clearTimeout(__classPrivateFieldGet(this, _IdleClock_timer, "f"));
        __classPrivateFieldSet(this, _IdleClock_timer, undefined, "f");
      }
    }
  }
  _IdleClock_maxIdleMs = new WeakMap();
  _IdleClock_onExpire = new WeakMap();
  _IdleClock_blockers = new WeakMap();
  _IdleClock_armPending = new WeakMap();
  _IdleClock_timer = new WeakMap();
  return IdleClock;
})();
var SessionToolRunner = (() => {
  class SessionToolRunner {
    constructor(sessionId, opts) {
      _SessionToolRunner_instances.add(this);
      _SessionToolRunner_consumed.set(this, false);
      _SessionToolRunner_controller.set(this, undefined);
      _SessionToolRunner_detachExternal.set(this, undefined);
      _SessionToolRunner_requestOpts.set(this, undefined);
      _SessionToolRunner_toolByName.set(this, undefined);
      _SessionToolRunner_logger.set(this, undefined);
      _SessionToolRunner_seen.set(this, new Set());
      _SessionToolRunner_answered.set(this, new Set());
      _SessionToolRunner_confirmationVerdicts.set(this, new Map());
      _SessionToolRunner_awaitingConfirmation.set(this, new Map());
      _SessionToolRunner_results.set(this, new AsyncQueue());
      _SessionToolRunner_inFlightCount.set(this, 0);
      _SessionToolRunner_sendRetryWindowMs.set(this, IDLE_REPORT_INTERVAL_MS_2);
      _SessionToolRunner_onIdle.set(this, null);
      _SessionToolRunner_idleClock.set(this, undefined);
      this.client = opts.client;
      this.sessionId = sessionId;
      this.tools = opts.tools;
      this.maxIdleMs = opts.maxIdleMs ?? DEFAULT_MAX_IDLE_MS;
      __classPrivateFieldSet(this, _SessionToolRunner_logger, loggerFor(opts.client), "f");
      __classPrivateFieldSet(
        this,
        _SessionToolRunner_toolByName,
        new Map(opts.tools.map((t) => [toolName(t), t])),
        "f",
      );
      __classPrivateFieldSet(this, _SessionToolRunner_controller, new AbortController(), "f");
      __classPrivateFieldSet(
        this,
        _SessionToolRunner_detachExternal,
        linkAbort(opts.signal, __classPrivateFieldGet(this, _SessionToolRunner_controller, "f")),
        "f",
      );
      __classPrivateFieldSet(this, _SessionToolRunner_requestOpts, opts.requestOptions, "f");
      __classPrivateFieldSet(
        this,
        _SessionToolRunner_idleClock,
        new IdleClock(this.maxIdleMs, () => {
          __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").info(
            "session idle after end_turn; stopping",
            {
              component: "session-tool-runner",
              session_id: this.sessionId,
              max_idle_ms: this.maxIdleMs,
            },
          );
          __classPrivateFieldGet(this, _SessionToolRunner_controller, "f").abort();
        }),
        "f",
      );
    }
    get signal() {
      return __classPrivateFieldGet(this, _SessionToolRunner_controller, "f").signal;
    }
    abort() {
      __classPrivateFieldGet(this, _SessionToolRunner_controller, "f").abort();
    }
    _setSendRetryWindow(ms) {
      __classPrivateFieldSet(this, _SessionToolRunner_sendRetryWindowMs, ms, "f");
    }
    async *[((_SessionToolRunner_consumed = new WeakMap()),
    (_SessionToolRunner_controller = new WeakMap()),
    (_SessionToolRunner_detachExternal = new WeakMap()),
    (_SessionToolRunner_requestOpts = new WeakMap()),
    (_SessionToolRunner_toolByName = new WeakMap()),
    (_SessionToolRunner_logger = new WeakMap()),
    (_SessionToolRunner_seen = new WeakMap()),
    (_SessionToolRunner_answered = new WeakMap()),
    (_SessionToolRunner_confirmationVerdicts = new WeakMap()),
    (_SessionToolRunner_awaitingConfirmation = new WeakMap()),
    (_SessionToolRunner_results = new WeakMap()),
    (_SessionToolRunner_inFlightCount = new WeakMap()),
    (_SessionToolRunner_sendRetryWindowMs = new WeakMap()),
    (_SessionToolRunner_onIdle = new WeakMap()),
    (_SessionToolRunner_idleClock = new WeakMap()),
    (_SessionToolRunner_instances = new WeakSet()),
    Symbol.asyncIterator)]() {
      if (__classPrivateFieldGet(this, _SessionToolRunner_consumed, "f"))
        throw new AnthropicError("Cannot iterate over a consumed SessionToolRunner");
      __classPrivateFieldSet(this, _SessionToolRunner_consumed, true, "f");
      __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").info("session tool runner starting", {
        component: "session-tool-runner",
        session_id: this.sessionId,
      });
      let streamPromise = __classPrivateFieldGet(
        this,
        _SessionToolRunner_instances,
        "m",
        _SessionToolRunner_streamLoop,
      )
        .call(this)
        .catch((e) => {
          if (!__classPrivateFieldGet(this, _SessionToolRunner_controller, "f").signal.aborted)
            __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").error("stream loop failed", {
              error: String(e),
            });
          __classPrivateFieldGet(this, _SessionToolRunner_controller, "f").abort();
        });
      try {
        while (true) {
          let next = await __classPrivateFieldGet(this, _SessionToolRunner_results, "f").next(
            __classPrivateFieldGet(this, _SessionToolRunner_controller, "f").signal,
          );
          if (next.done) break;
          yield next.value;
        }
        await streamPromise;
        let pending;
        while (
          (pending = __classPrivateFieldGet(this, _SessionToolRunner_results, "f").tryShift()) !== undefined
        )
          yield pending;
      } finally {
        __classPrivateFieldGet(this, _SessionToolRunner_controller, "f").abort();
        __classPrivateFieldGet(this, _SessionToolRunner_idleClock, "f").disarm();
        await streamPromise;
        try {
          await __classPrivateFieldGet(
            this,
            _SessionToolRunner_instances,
            "m",
            _SessionToolRunner_drain,
          ).call(this);
        } catch (e) {
          __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").warn("drain failed", {
            error: String(e),
          });
        }
        __classPrivateFieldGet(this, _SessionToolRunner_results, "f").close();
        for (let t of this.tools)
          try {
            await t.close?.();
          } catch (e) {
            __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").warn("tool.close failed", {
              tool: toolName(t),
              error: String(e),
            });
          }
        __classPrivateFieldGet(this, _SessionToolRunner_detachExternal, "f").call(this);
      }
    }
  }
  return SessionToolRunner;
})();
//@ chunk-vn3g7zt8.js:64933-70734 esm-fingerprint
_SessionToolRunner_requestOptions = function () {
  return {
    ...__classPrivateFieldGet(this, _SessionToolRunner_requestOpts, "f"),
    headers: buildHeaders([
      stainlessHelperHeader("session-tool-runner"),
      __classPrivateFieldGet(this, _SessionToolRunner_requestOpts, "f")?.headers,
    ]),
    signal: __classPrivateFieldGet(this, _SessionToolRunner_controller, "f").signal,
  };
};
_SessionToolRunner_streamLoop = async function () {
  let ctrl = __classPrivateFieldGet(this, _SessionToolRunner_controller, "f");
  let backoff = STREAM_BACKOFF_START_MS;
  while (!ctrl.signal.aborted) {
    try {
      let stream = await this.client.beta.sessions.events.stream(
        this.sessionId,
        {},
        __classPrivateFieldGet(
          this,
          _SessionToolRunner_instances,
          "m",
          _SessionToolRunner_requestOptions,
        ).call(this),
      );
      await __classPrivateFieldGet(
        this,
        _SessionToolRunner_instances,
        "m",
        _SessionToolRunner_reconcile,
      ).call(this);
      for await (let ev of stream) {
        backoff = STREAM_BACKOFF_START_MS;
        if (
          await __classPrivateFieldGet(
            this,
            _SessionToolRunner_instances,
            "m",
            _SessionToolRunner_handleStreamEvent,
          ).call(this, ev)
        )
          return;
      }
    } catch (e) {
      ctrl.signal.throwIfAborted();
      if (isFatal4xx(e)) {
        __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").error(
          "permanent stream failure, shutting down",
          {
            error: String(e),
          },
        );
        ctrl.abort();
        throw e;
      }
      __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").warn("stream disconnected, reconnecting", {
        error: String(e),
        backoff_ms: backoff,
      });
    }
    ctrl.signal.throwIfAborted();
    await sleepUnlessAborted(backoff, ctrl.signal);
    backoff = Math.min(backoff * 2, STREAM_BACKOFF_CAP_MS);
  }
};
_SessionToolRunner_reconcile = async function () {
  let ctrl = __classPrivateFieldGet(this, _SessionToolRunner_controller, "f");
  let pending = [];
  let lastWasEndTurn = false;
  try {
    for await (let ev of this.client.beta.sessions.events.list(
      this.sessionId,
      {
        limit: 1000,
      },
      __classPrivateFieldGet(this, _SessionToolRunner_instances, "m", _SessionToolRunner_requestOptions).call(
        this,
      ),
    )) {
      __classPrivateFieldGet(this, _SessionToolRunner_instances, "m", _SessionToolRunner_ingestHistory).call(
        this,
        ev,
        pending,
      );
      lastWasEndTurn = isEndTurnIdle(ev);
    }
  } catch (e) {
    ctrl.signal.throwIfAborted();
    __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").warn("reconcile list failed", {
      error: String(e),
    });
    for (let ev of pending) __classPrivateFieldGet(this, _SessionToolRunner_seen, "f").delete(ev.id);
    return;
  }
  let unanswered = pending.filter(
    (ev) => !__classPrivateFieldGet(this, _SessionToolRunner_answered, "f").has(ev.id),
  );
  __classPrivateFieldGet(this, _SessionToolRunner_idleClock, "f").disarm();
  for (let ev of unanswered)
    await __classPrivateFieldGet(
      this,
      _SessionToolRunner_instances,
      "m",
      _SessionToolRunner_routeToolEvent,
    ).call(this, ev);
  for (let held of [...__classPrivateFieldGet(this, _SessionToolRunner_awaitingConfirmation, "f").values()]) {
    let verdict = __classPrivateFieldGet(this, _SessionToolRunner_confirmationVerdicts, "f").get(held.id);
    if (verdict !== undefined)
      await __classPrivateFieldGet(
        this,
        _SessionToolRunner_instances,
        "m",
        _SessionToolRunner_applyVerdict,
      ).call(this, held, verdict);
  }
  let outstanding = unanswered.filter(
    (ev) =>
      !__classPrivateFieldGet(this, _SessionToolRunner_answered, "f").has(ev.id) &&
      !__classPrivateFieldGet(this, _SessionToolRunner_awaitingConfirmation, "f").has(ev.id),
  );
  if (lastWasEndTurn && outstanding.length === 0)
    __classPrivateFieldGet(this, _SessionToolRunner_idleClock, "f").arm();
  else __classPrivateFieldGet(this, _SessionToolRunner_idleClock, "f").disarm();
};
_SessionToolRunner_ingestHistory = function (ev, pending) {
  if (ev.type === "agent.tool_use" || ev.type === "agent.custom_tool_use") {
    __classPrivateFieldGet(this, _SessionToolRunner_seen, "f").add(ev.id);
    if (!__classPrivateFieldGet(this, _SessionToolRunner_answered, "f").has(ev.id)) pending.push(ev);
  } else if (ev.type === "user.tool_result")
    __classPrivateFieldGet(this, _SessionToolRunner_answered, "f").add(ev.tool_use_id);
  else if (ev.type === "user.custom_tool_result")
    __classPrivateFieldGet(this, _SessionToolRunner_answered, "f").add(ev.custom_tool_use_id);
  else if (ev.type === "user.tool_confirmation") {
    if (!__classPrivateFieldGet(this, _SessionToolRunner_answered, "f").has(ev.tool_use_id))
      __classPrivateFieldGet(this, _SessionToolRunner_confirmationVerdicts, "f").set(
        ev.tool_use_id,
        ev.result,
      );
  }
};
_SessionToolRunner_handleStreamEvent = async function (ev) {
  switch ((__classPrivateFieldGet(this, _SessionToolRunner_idleClock, "f").noteEvent(ev), ev.type)) {
    case "agent.tool_use":
    case "agent.custom_tool_use":
      if (!__classPrivateFieldGet(this, _SessionToolRunner_seen, "f").has(ev.id)) {
        __classPrivateFieldGet(this, _SessionToolRunner_seen, "f").add(ev.id);
        await __classPrivateFieldGet(
          this,
          _SessionToolRunner_instances,
          "m",
          _SessionToolRunner_routeToolEvent,
        ).call(this, ev);
      }
      return false;
    case "user.tool_confirmation":
      await __classPrivateFieldGet(
        this,
        _SessionToolRunner_instances,
        "m",
        _SessionToolRunner_noteConfirmation,
      ).call(this, ev);
      return false;
    case "user.tool_result":
      __classPrivateFieldGet(this, _SessionToolRunner_answered, "f").add(ev.tool_use_id);
      return false;
    case "user.custom_tool_result":
      __classPrivateFieldGet(this, _SessionToolRunner_answered, "f").add(ev.custom_tool_use_id);
      return false;
    case "session.status_terminated":
    case "session.deleted":
      __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").info("session terminated", {
        component: "session-tool-runner",
        session_id: this.sessionId,
      });
      __classPrivateFieldGet(this, _SessionToolRunner_controller, "f").abort();
      return true;
    default:
      return false;
  }
};
_SessionToolRunner_routeToolEvent = async function (ev) {
  let permission = ev.evaluated_permission;
  let verdict =
    permission === "deny"
      ? "deny"
      : __classPrivateFieldGet(this, _SessionToolRunner_confirmationVerdicts, "f").get(ev.id);
  if (verdict === undefined) {
    if (permission === undefined || permission === "allow")
      await __classPrivateFieldGet(this, _SessionToolRunner_instances, "m", _SessionToolRunner_execute).call(
        this,
        ev,
        undefined,
      );
    else if (!__classPrivateFieldGet(this, _SessionToolRunner_awaitingConfirmation, "f").has(ev.id)) {
      __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").info(
        "tool call awaiting confirmation; holding",
        {
          component: "session-tool-runner",
          session_id: this.sessionId,
          tool: ev.name,
          tool_use_id: ev.id,
        },
      );
      __classPrivateFieldGet(this, _SessionToolRunner_awaitingConfirmation, "f").set(ev.id, ev);
      __classPrivateFieldGet(this, _SessionToolRunner_idleClock, "f").block(ev.id);
    }
    return;
  }
  await __classPrivateFieldGet(this, _SessionToolRunner_instances, "m", _SessionToolRunner_applyVerdict).call(
    this,
    ev,
    verdict,
  );
};
_SessionToolRunner_noteConfirmation = async function (ev) {
  __classPrivateFieldGet(this, _SessionToolRunner_confirmationVerdicts, "f").set(ev.tool_use_id, ev.result);
  let held = __classPrivateFieldGet(this, _SessionToolRunner_awaitingConfirmation, "f").get(ev.tool_use_id);
  if (held === undefined) return;
  await __classPrivateFieldGet(this, _SessionToolRunner_instances, "m", _SessionToolRunner_applyVerdict).call(
    this,
    held,
    ev.result,
  );
};
_SessionToolRunner_applyVerdict = async function (ev, verdict) {
  let wasHeld = __classPrivateFieldGet(this, _SessionToolRunner_awaitingConfirmation, "f").delete(ev.id);
  if (verdict === "allow") {
    __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").info("tool call confirmed", {
      component: "session-tool-runner",
      session_id: this.sessionId,
      tool: ev.name,
      tool_use_id: ev.id,
    });
    if (!wasHeld) __classPrivateFieldGet(this, _SessionToolRunner_idleClock, "f").block(ev.id);
    try {
      await __classPrivateFieldGet(this, _SessionToolRunner_instances, "m", _SessionToolRunner_execute).call(
        this,
        ev,
        "allow",
      );
    } finally {
      __classPrivateFieldGet(this, _SessionToolRunner_idleClock, "f").unblock(ev.id);
    }
    return;
  }
  if (wasHeld) __classPrivateFieldGet(this, _SessionToolRunner_idleClock, "f").unblock(ev.id);
  __classPrivateFieldGet(this, _SessionToolRunner_answered, "f").add(ev.id);
  __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").info("tool call denied; not executing", {
    component: "session-tool-runner",
    session_id: this.sessionId,
    tool: ev.name,
    tool_use_id: ev.id,
  });
  __classPrivateFieldGet(this, _SessionToolRunner_instances, "m", _SessionToolRunner_surfaceCall).call(this, {
    event: ev,
    toolUseId: ev.id,
    name: ev.name,
    isError: false,
    posted: false,
    confirmation: "deny",
  });
};
_SessionToolRunner_surfaceCall = function (call) {
  __classPrivateFieldGet(this, _SessionToolRunner_results, "f").push(call);
};
_SessionToolRunner_execute = async function (ev, confirmation) {
  var _a;
  var _b;
  if (__classPrivateFieldGet(this, _SessionToolRunner_answered, "f").has(ev.id)) return;
  __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").info("executing tool", {
    component: "session-tool-runner",
    session_id: this.sessionId,
    tool: ev.name,
    tool_use_id: ev.id,
  });
  __classPrivateFieldSet(
    this,
    _SessionToolRunner_inFlightCount,
    ((_a = __classPrivateFieldGet(this, _SessionToolRunner_inFlightCount, "f")), _a++, _a),
    "f",
  );
  try {
    let tool = __classPrivateFieldGet(this, _SessionToolRunner_toolByName, "f").get(ev.name);
    if (!tool) {
      __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").info(
        "tool not owned by this runner; leaving the tool_use_id pending for its owner",
        {
          component: "session-tool-runner",
          session_id: this.sessionId,
          tool: ev.name,
          tool_use_id: ev.id,
        },
      );
      __classPrivateFieldGet(this, _SessionToolRunner_instances, "m", _SessionToolRunner_surfaceCall).call(
        this,
        {
          event: ev,
          toolUseId: ev.id,
          name: ev.name,
          isError: false,
          posted: false,
          confirmation,
        },
      );
      return;
    }
    let content;
    let isError;
    let toolCtrl = new AbortController();
    let detachTool = linkAbort(
      __classPrivateFieldGet(this, _SessionToolRunner_controller, "f").signal,
      toolCtrl,
    );
    let timer = setTimeout(() => toolCtrl.abort(), TOOL_TIMEOUT_MS);
    try {
      let outcome = await runRunnableTool(tool, ev.input, {
        toolUse: ev,
        toolUseBlock: ev,
        signal: toolCtrl.signal,
      });
      content = outcome.content;
      isError = outcome.isError;
    } finally {
      clearTimeout(timer);
      detachTool();
    }
    let result = buildResultEvent(ev, isError, toSessionContent(content));
    let posted = await __classPrivateFieldGet(
      this,
      _SessionToolRunner_instances,
      "m",
      _SessionToolRunner_sendResult,
    ).call(this, result, ev.id);
    __classPrivateFieldGet(this, _SessionToolRunner_instances, "m", _SessionToolRunner_surfaceCall).call(
      this,
      {
        event: ev,
        result,
        toolUseId: ev.id,
        name: ev.name,
        isError,
        posted,
        confirmation,
      },
    );
  } finally {
    __classPrivateFieldSet(
      this,
      _SessionToolRunner_inFlightCount,
      ((_b = __classPrivateFieldGet(this, _SessionToolRunner_inFlightCount, "f")), _b--, _b),
      "f",
    );
    if (__classPrivateFieldGet(this, _SessionToolRunner_inFlightCount, "f") === 0)
      __classPrivateFieldGet(this, _SessionToolRunner_onIdle, "f")?.call(this);
  }
};
_SessionToolRunner_sendResult = async function (result, toolUseId) {
  let ctrl = __classPrivateFieldGet(this, _SessionToolRunner_controller, "f");
  let start = Date.now();
  let lastErr;
  let attempt = 0;
  while (true) {
    attempt++;
    ctrl.signal.throwIfAborted();
    try {
      await this.client.beta.sessions.events.send(
        this.sessionId,
        {
          events: [result],
        },
        __classPrivateFieldGet(
          this,
          _SessionToolRunner_instances,
          "m",
          _SessionToolRunner_requestOptions,
        ).call(this),
      );
      __classPrivateFieldGet(this, _SessionToolRunner_answered, "f").add(toolUseId);
      return true;
    } catch (e) {
      lastErr = e;
      if (isFatal4xx(e)) break;
      let remainingMs =
        __classPrivateFieldGet(this, _SessionToolRunner_sendRetryWindowMs, "f") - (Date.now() - start);
      if (remainingMs <= 0) break;
      let waitMs = Math.min(
        applyJitter(backoff(attempt - 1, SEND_BACKOFF_START_MS, SEND_BACKOFF_CAP_MS)),
        remainingMs,
      );
      __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").warn("tool result send failed; retrying", {
        tool_use_id: toolUseId,
        attempt,
        backoff_ms: waitMs,
        error: String(e),
      });
      await sleepUnlessAborted(waitMs, ctrl.signal);
    }
  }
  __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").error("failed to send tool result", {
    tool_use_id: toolUseId,
    attempts: attempt,
    error: String(lastErr),
  });
  return false;
};
_SessionToolRunner_drain = async function () {
  if (__classPrivateFieldGet(this, _SessionToolRunner_inFlightCount, "f") === 0) return;
  await Promise.race([
    new Promise((r) => __classPrivateFieldSet(this, _SessionToolRunner_onIdle, r, "f")),
    sleepUnlessAborted(DRAIN_TIMEOUT_MS),
  ]);
  __classPrivateFieldSet(this, _SessionToolRunner_onIdle, null, "f");
  if (__classPrivateFieldGet(this, _SessionToolRunner_inFlightCount, "f") > 0)
    __classPrivateFieldGet(this, _SessionToolRunner_logger, "f").warn("drain timeout exceeded");
};
//@ chunk-vn3g7zt8.js:70734-70943 esm-fingerprint
function buildResultEvent(ev, isError, content) {
  if (ev.type === "agent.custom_tool_use")
    return {
      type: "user.custom_tool_result",
      custom_tool_use_id: ev.id,
      is_error: isError,
      content,
    };
  return {
    type: "user.tool_result",
    tool_use_id: ev.id,
    is_error: isError,
    content,
  };
}
//@ chunk-vn3g7zt8.js:70943-71447 esm-fingerprint
function toSessionContent(content) {
  if (typeof content === "string")
    return [
      {
        type: "text",
        text: content || "(no output)",
      },
    ];
  let out = content.map((b) => {
    if (b.type === "text")
      return {
        type: "text",
        text: b.text || "(no output)",
      };
    if (b.type === "image" || b.type === "document") return b;
    if (b.type === "search_result")
      return {
        type: "search_result",
        source: b.source,
        title: b.title,
        content: b.content.map((c) => ({
          type: "text",
          text: c.text,
        })),
        citations: {
          enabled: b.citations?.enabled ?? false,
        },
      };
    return {
      type: "text",
      text: JSON.stringify(b),
    };
  });
  return out.length > 0
    ? out
    : [
        {
          type: "text",
          text: "(no output)",
        },
      ];
}
export { SessionToolRunner };
