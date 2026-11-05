/**
 * services/daemon/leaseProtocol.ts
 *
 * 2.1.316 新增：守护进程租约协议
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rmd7n4gq.js (23)
 * attribution: placement 22, layout 1
 */
import { delimiter, isAbsolute } from "path";
import { ANY_CONTROL_CHAR_RE } from "../../utils/stringUtils.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import {
  numberSchema,
  objectSchema,
  _enum,
  looseObject,
  stringSchema,
  discriminatedUnion,
  literal,
  array,
  booleanSchema,
  record,
  unknown,
  union,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { keepForwardableEnv, stripForwardedFlags } from "../../cli/forwardedFlags.js";
import { stripLongPathPrefixes } from "../../utils/windowsUncPaths.js";
import { SOCKET_IDLE_TIMEOUT_MS } from "../../utils/framedSocket.js";
import { isValidPipeOrPath } from "../../utils/peerAddress.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rmd7n4gq.js:1897-1948 placement
/**
 * 后台租约的来源类型（shell、slash、fleet、spare、respawn）。
 */
var BG_LEASE_SOURCES = ["shell", "slash", "fleet", "spare", "respawn"];
//@ chunk-rmd7n4gq.js:1948-1986 placement
/**
 * 判断字符串是否属于租约来源。
 */
function isLeaseSource(source) {
  return BG_LEASE_SOURCES.includes(source);
}
//@ chunk-rmd7n4gq.js:1986-2116 placement
/**
 * tabs 落点失败的原因枚举（failed、taken、ended）。
 */
var BG_PROTO = 1;
var BG_PROTO_MIN = 1;
var SHORT_RE = /^[a-f0-9]{8}$/;
var TABS_KEY_RE = /^[a-f0-9]{32}$/;
var TABS_LANDING_REASONS = ["failed", "taken", "ended"];
var CLOUD_SESSION_ID_RE = /^(?:cse|session)_[A-Za-z0-9_-]{1,128}$/;
//@ chunk-rmd7n4gq.js:2116-2149 placement
/**
 * 判断字符串里没有控制字符。
 */
function hasNoControlChars(text) {
  return !ANY_CONTROL_CHAR_RE.test(text);
}
//@ chunk-rmd7n4gq.js:2149-2256 placement
/**
 * 分离消息的 APC 前缀 ESC_cc-detach-msg;。
 */
var DAEMON_DETACH_APC = "\x1B_cc-daemon-detach\x1B\\";
var APC_ST = "\x1B\\";
var DETACH_MSG_PREFIX = "\x1B_cc-detach-msg;";
var DAEMON_HINT_APC = "\x1B_cc-daemon-hint\x1B\\";
//@ chunk-rmd7n4gq.js:2256-2289 placement
function wrapDaemonHint(hint) {
  return DAEMON_HINT_APC + hint + DAEMON_HINT_APC;
}
//@ chunk-rmd7n4gq.js:2289-2343 placement
/**
 * 交互标记 APC 前缀 ESC_cc-d-imark;。
 */
var INTERACTIVE_MARK_PREFIX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var buffer;
deferInit("chunk-rmd7n4gq.js:2289", () => {
  INTERACTIVE_MARK_PREFIX = "\x1B_cc-d-imark;";
  buffer = Buffer.from(INTERACTIVE_MARK_PREFIX, "latin1");
});
//@ chunk-rmd7n4gq.js:2343-2377 placement
function interactiveMarkApc(mark) {
  return INTERACTIVE_MARK_PREFIX + jsonStringify(mark) + APC_ST;
}
//@ chunk-rmd7n4gq.js:2377-3617 placement
function extractInteractiveMarks(carry, chunk, options) {
  let maxPayload = options?.maxPayload ?? 512;
  let combined = carry.length > 0 ? Buffer.concat([carry, chunk]) : chunk;
  let marks = [];
  let cleanParts = [];
  let cleanStart = 0;
  let searchFrom = 0;
  let lastStIndex = -1;
  let noMoreSt = false;
  for (;;) {
    let index = combined.indexOf(INTERACTIVE_MARK_PREFIX, searchFrom);
    if (index < 0) break;
    let payloadStart = index + INTERACTIVE_MARK_PREFIX.length;
    let stIndex = noMoreSt
      ? -1
      : lastStIndex >= payloadStart
        ? lastStIndex
        : (lastStIndex = combined.indexOf(APC_ST, payloadStart));
    if (stIndex < 0) {
      noMoreSt = true;
      let chunk = combined.subarray(index);
      if (chunk.length > INTERACTIVE_MARK_PREFIX.length + maxPayload) {
        searchFrom = payloadStart;
        continue;
      }
      let hasControlChar = false;
      for (let index = payloadStart; index < combined.length; index++) {
        let byte = combined[index];
        if (byte === 24 || byte === 26 || (byte === 27 && index < combined.length - 1)) {
          hasControlChar = true;
          break;
        }
      }
      if (hasControlChar) {
        searchFrom = payloadStart;
        continue;
      }
      cleanParts.push(combined.subarray(cleanStart, index));
      return {
        marks,
        carry: Buffer.from(chunk),
        cleaned: cleanParts.length === 1 ? cleanParts[0] : Buffer.concat(cleanParts),
      };
    }
    let valid = false;
    if (stIndex - payloadStart <= maxPayload)
      try {
        let payload = jsonParse(combined.subarray(payloadStart, stIndex).toString("utf8"));
        if (
          payload !== null &&
          typeof payload === "object" &&
          (payload.kind === "content_paint" || payload.kind === "prompt_idle")
        ) {
          valid = true;
          if (options?.requireNonce === undefined || payload.nonce === options.requireNonce)
            marks.push({
              kind: payload.kind,
              msgsLoaded: boundedMarkCountOrUndefined(payload.msgsLoaded),
              msgsInJsonl: boundedMarkCountOrUndefined(payload.msgsInJsonl),
              msgsRenderedAtFirstPaint: boundedMarkCountOrUndefined(payload.msgsRenderedAtFirstPaint),
            });
        }
      } catch {}
    if (valid) {
      cleanParts.push(combined.subarray(cleanStart, index));
      cleanStart = stIndex + APC_ST.length;
    }
    searchFrom = valid ? stIndex + APC_ST.length : payloadStart;
  }
  let chunk_2 = combined.subarray(searchFrom);
  let prefix = buffer;
  let carryLength = 0;
  let min = Math.min(chunk_2.length, prefix.length - 1);
  e: for (let candidateLength = min; candidateLength > 0; candidateLength--) {
    let offset = chunk_2.length - candidateLength;
    for (let j = 0; j < candidateLength; j++) if (chunk_2[offset + j] !== prefix[j]) continue e;
    carryLength = candidateLength;
    break;
  }
  cleanParts.push(combined.subarray(cleanStart, combined.length - carryLength));
  return {
    marks,
    carry: carryLength > 0 ? Buffer.from(chunk_2.subarray(chunk_2.length - carryLength)) : Buffer.alloc(0),
    cleaned: cleanParts.length === 1 ? cleanParts[0] : Buffer.concat(cleanParts),
  };
}
//@ chunk-rmd7n4gq.js:3617-3703 placement
function boundedMarkCountOrUndefined(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_MSG_COUNT
    ? value
    : undefined;
}
//@ chunk-rmd7n4gq.js:3703-4001 placement
var MAX_MSG_COUNT; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var optionalCount;
var interactiveMarkSchema;
var strictInteractiveMarkSchema;
deferInit("chunk-rmd7n4gq.js:3703", () => {
  MAX_MSG_COUNT = 1e9;
  optionalCount = () => numberSchema().int().nonnegative().max(MAX_MSG_COUNT).optional();
  interactiveMarkSchema = DoctorLazy(() =>
    objectSchema({
      kind: _enum(["content_paint", "prompt_idle"]),
      msgsLoaded: optionalCount(),
      msgsInJsonl: optionalCount(),
      msgsRenderedAtFirstPaint: optionalCount(),
    }),
  );
  strictInteractiveMarkSchema = DoctorLazy(() =>
    looseObject({
      kind: _enum(["content_paint", "prompt_idle"]),
      msgsLoaded: optionalCount(),
      msgsInJsonl: optionalCount(),
      msgsRenderedAtFirstPaint: optionalCount(),
    }),
  );
});
//@ chunk-rmd7n4gq.js:4001-4209 placement
function parseInteractiveMarkRv(frame) {
  let parsed = strictInteractiveMarkSchema().safeParse(frame);
  if (!parsed.success) return null;
  return {
    kind: parsed.data.kind,
    msgsLoaded: parsed.data.msgsLoaded,
    msgsInJsonl: parsed.data.msgsInJsonl,
    msgsRenderedAtFirstPaint: parsed.data.msgsRenderedAtFirstPaint,
  };
}
//@ chunk-rmd7n4gq.js:4209-4261 placement
function daemonDetachApc(msg) {
  if (!msg) return DAEMON_DETACH_APC;
  return DETACH_MSG_PREFIX + msg + APC_ST + DAEMON_DETACH_APC;
}
//@ chunk-rmd7n4gq.js:4261-4401 placement
function parseDetachMsg(data) {
  let index = data.indexOf(DETACH_MSG_PREFIX);
  if (index < 0) return;
  let prefixEnd = index + DETACH_MSG_PREFIX.length;
  let index_2 = data.indexOf(APC_ST, prefixEnd);
  if (index_2 < 0) return;
  return data.subarray(prefixEnd, index_2).toString("utf8");
}
//@ chunk-rmd7n4gq.js:4401-4498 layout
var AGENT_DISABLED_ENV; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rmd7n4gq.js:4401", () => {
  AGENT_DISABLED_ENV = new Set([
    "CLAUDE_CODE_DISABLE_AGENT_PROGRESS_SUMMARIES",
    "CLAUDE_CODE_DISABLE_MCP_TASKS",
  ]);
});
//@ chunk-rmd7n4gq.js:4498-4714 placement
function normalizePluginDirsEnv(env, extra) {
  let out = {};
  for (let [key, value] of Object.entries(keepForwardableEnv(env, extra))) {
    if (AGENT_DISABLED_ENV.has(key.toUpperCase()) && value !== "1") continue;
    out[key] =
      key.toUpperCase() === "CLAUDE_CODE_PLUGIN_DIRS"
        ? value
            .split(delimiter)
            .map((dir) => stripLongPathPrefixes(dir.trim()))
            .join(delimiter)
        : value;
  }
  return out;
}
//@ chunk-rmd7n4gq.js:4714-6449 placement
var BgDispatchSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var TRANSIENT_ATTACH_CODE;
var RACED_SOCKET_GAP;
var RESPAWNING_ATTACH_CODE;
var RESPAWN_REASON_UPGRADE;
var RESPAWN_REASON_STALL;
var RESPAWN_REASON_LEGACY;
var HOST_DEAD_ATTACH_CODE;
var HOST_DIED_DETAIL;
var HOST_DIED_ATTACH_MESSAGE;
var HOST_DIED_EXEC_DETAIL;
var HOST_DIED_EXEC_ATTACH_MESSAGE;
var FATAL_ATTACH_CODE;
var KICKED_ATTACH_CODE;
var KICKED_NOTICE;
deferInit("chunk-rmd7n4gq.js:4714", () => {
  BgDispatchSchema = DoctorLazy(() =>
    objectSchema({
      proto: numberSchema().int().min(BG_PROTO_MIN).max(BG_PROTO),
      short: stringSchema().regex(SHORT_RE),
      nonce: stringSchema().regex(SHORT_RE).optional(),
      sessionId: stringSchema().transform(stripLongPathPrefixes),
      createdAt: numberSchema(),
      source: _enum(BG_LEASE_SOURCES).catch("fleet"),
      cwd: stringSchema().transform(stripLongPathPrefixes),
      launch: discriminatedUnion("mode", [
        objectSchema({
          mode: literal("prompt"),
          args: array(stringSchema()).transform(stripForwardedFlags),
          restoresTranscript: booleanSchema().optional(),
        }),
        objectSchema({
          mode: literal("resume"),
          sessionId: stringSchema().transform(stripLongPathPrefixes),
          transcriptPath: stringSchema().transform(stripLongPathPrefixes).optional(),
          fork: booleanSchema(),
          flagArgs: array(stringSchema()).transform(stripForwardedFlags),
          restoresTranscript: booleanSchema().optional(),
        }),
        objectSchema({
          mode: literal("exec"),
          cmd: stringSchema().transform(stripLongPathPrefixes),
          args: array(stringSchema()).transform((launch) => launch.map(stripLongPathPrefixes)),
        }),
      ]),
      env: record(stringSchema(), stringSchema())
        .default({})
        .transform((seed) => normalizePluginDirsEnv(seed, "the background job's launch request")),
      reattachEnv: record(stringSchema(), stringSchema())
        .transform((respawnFlags) =>
          normalizePluginDirsEnv(respawnFlags, "the launch request's reattach values"),
        )
        .optional(),
      worktree: objectSchema({
        path: stringSchema().transform(stripLongPathPrefixes),
        ownershipToken: stringSchema(),
      }).optional(),
      isolation: _enum(["none", "worktree"]).default("none"),
      respawnFlags: array(stringSchema()).default([]).transform(stripForwardedFlags),
      attachStallRespawns: numberSchema().int().optional(),
      agent: stringSchema().optional(),
      routine: stringSchema().optional(),
      seed: objectSchema({
        intent: stringSchema(),
        name: stringSchema().optional(),
      }).optional(),
      cols: numberSchema().int().positive().max(SOCKET_IDLE_TIMEOUT_MS).optional(),
      rows: numberSchema().int().positive().max(SOCKET_IDLE_TIMEOUT_MS).optional(),
    }),
  );
  TRANSIENT_ATTACH_CODE = /ERESPAWNING|ESTARTING/;
  RACED_SOCKET_GAP = /\bE(?:NOENT|CONNREFUSED|CONNRESET)\b|control socket closed/;
  RESPAWNING_ATTACH_CODE = "ERESPAWNING";
  RESPAWN_REASON_UPGRADE = "updated Claude Code";
  RESPAWN_REASON_STALL = "stalled";
  RESPAWN_REASON_LEGACY = "legacy";
  HOST_DEAD_ATTACH_CODE = "EHOSTDEAD";
  HOST_DIED_DETAIL = "terminal host process died \u2014 press Enter to restart";
  HOST_DIED_ATTACH_MESSAGE = "This session's terminal host process died (the conversation is saved)";
  HOST_DIED_EXEC_DETAIL =
    "terminal host process died \u2014 its output is gone; the command was not run again";
  HOST_DIED_EXEC_ATTACH_MESSAGE =
    "This command's terminal host process died \u2014 its output is gone and the command was not run again";
  FATAL_ATTACH_CODE = /ESTALLED|EUNVERIFIED|EHOSTDEAD/;
  KICKED_ATTACH_CODE = /^EKICKED:\s*/;
  KICKED_NOTICE = "Session opened in another window";
});
//@ chunk-rmd7n4gq.js:6449-6531 placement
function streamDetachMessage(sessionId, sessionTabs, message) {
  return sessionTabs !== undefined && TABS_KEY_RE.test(sessionTabs)
    ? `${sessionId}:${sessionTabs}: ${message}`
    : `${sessionId}: ${message}`;
}
//@ chunk-rmd7n4gq.js:6531-6551 placement
var SUPERVISOR_DETACH_CODE = /^E[A-Z]+:/;
//@ chunk-rmd7n4gq.js:6551-6605 placement
/**
 * 校验值是否为合法的管道/路径。
 */
function pipeOrPathSchema() {
  return stringSchema().refine(isValidPipeOrPath, "remote IPC path");
}
//@ chunk-rmd7n4gq.js:6605-7224 placement
/**
 * 名册中单个后台 worker 的 schema：pid、会话 ID、各 socket、版本、尝试次数、cwd、派发信息、待重启、终端模式、交互标记与认证等。
 */
var rosterWorkerSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rmd7n4gq.js:6605", () => {
  rosterWorkerSchema = DoctorLazy(() =>
    looseObject({
      pid: numberSchema(),
      procStart: stringSchema().optional(),
      sessionId: stringSchema().transform(stripLongPathPrefixes),
      rendezvousSock: pipeOrPathSchema(),
      ptySock: pipeOrPathSchema().optional(),
      messagingSock: pipeOrPathSchema().optional(),
      cliVersion: stringSchema().optional(),
      startedAt: numberSchema(),
      attempt: numberSchema(),
      cwd: stringSchema().transform(stripLongPathPrefixes),
      worktreePath: stringSchema().transform(stripLongPathPrefixes).optional(),
      dispatch: BgDispatchSchema(),
      pendingRespawn: literal("upgrade").optional(),
      decModes: array(numberSchema()).optional(),
      firedInteractiveMarks: array(unknown())
        .transform((list) => {
          let parsed = [];
          for (let item of list) {
            let result = interactiveMarkSchema().safeParse(item);
            if (result.success) parsed.push(result.data);
          }
          return parsed.slice(0, 2);
        })
        .optional()
        .catch(undefined),
      rvAuth: stringSchema().optional(),
      ptyAuth: stringSchema().optional(),
      replPid: numberSchema().optional(),
      replProcStart: stringSchema().optional(),
    }),
  );
});
//@ chunk-rmd7n4gq.js:7224-7324 placement
function rosterEntryExtras(entry) {
  let shape = rosterWorkerSchema().shape;
  let extras = {};
  for (let [key, value] of Object.entries(entry)) if (!(key in shape)) extras[key] = value;
  return extras;
}
//@ chunk-rmd7n4gq.js:7324-9903 placement
/**
 * 租约关闭原因的取值列表。
 */
var RosterSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ControlRequestSchema;
var LeaseClientSchema;
var LeaseAcknowledgementSchema;
var CLOSING_REASONS;
var LeaseClosingNoticeSchema;
var CLOUD_SESSION_LEASE_LABEL;
var DAEMON_LEASE_LABELS;
deferInit("chunk-rmd7n4gq.js:7324", () => {
  RosterSchema = DoctorLazy(() =>
    looseObject({
      proto: numberSchema().int().min(BG_PROTO_MIN).max(BG_PROTO),
      supervisorPid: numberSchema().catch(0),
      updatedAt: numberSchema().catch(0),
      workers: record(stringSchema().regex(SHORT_RE), rosterWorkerSchema()),
    }),
  );
  ControlRequestSchema = DoctorLazy(() => {
    let shortSchema = stringSchema().regex(SHORT_RE);
    let proto = numberSchema().int().min(BG_PROTO_MIN).max(BG_PROTO);
    return discriminatedUnion("op", [
      objectSchema({
        proto,
        op: literal("ping"),
      }),
      objectSchema({
        proto,
        op: literal("nudge"),
      }),
      objectSchema({
        proto,
        op: literal("yield"),
      }),
      objectSchema({
        proto,
        op: literal("lease"),
        client: LeaseClientSchema().optional(),
      }),
      objectSchema({
        proto,
        op: literal("leases"),
      }),
      objectSchema({
        proto,
        op: literal("await-ack"),
        short: shortSchema,
        nonce: shortSchema.optional(),
        timeoutMs: numberSchema(),
      }),
      objectSchema({
        proto,
        op: literal("dispatch"),
        d: BgDispatchSchema(),
        timeoutMs: numberSchema(),
        auth: stringSchema().optional(),
      }),
      objectSchema({
        proto,
        op: literal("list"),
      }),
      objectSchema({
        proto,
        op: literal("has"),
        short: shortSchema,
      }),
      objectSchema({
        proto,
        op: literal("kill"),
        short: shortSchema,
        signal: _enum(["SIGTERM", "SIGKILL"]).optional(),
        handoff: booleanSchema().optional(),
        evict: booleanSchema().optional(),
      }),
      objectSchema({
        proto,
        op: literal("reply"),
        short: shortSchema,
        text: stringSchema(),
        auth: stringSchema().optional(),
        nextTurn: booleanSchema().optional(),
      }),
      objectSchema({
        proto,
        op: literal("subscribe"),
        short: shortSchema,
        tail: numberSchema().optional(),
      }),
      objectSchema({
        proto,
        op: literal("attach"),
        short: shortSchema,
        auth: stringSchema().optional(),
        cols: numberSchema().int().min(1).max(SOCKET_IDLE_TIMEOUT_MS),
        rows: numberSchema().int().min(1).max(SOCKET_IDLE_TIMEOUT_MS),
        attachId: stringSchema().optional(),
        caps: objectSchema({
          imark: booleanSchema().optional(),
          terminal: stringSchema().nullable(),
          mux: _enum(["tmux", "screen", "zellij"]).nullable(),
          ssh: booleanSchema(),
          wheelFlood: booleanSchema().optional(),
          hyperlinks: booleanSchema().optional(),
          progressReporting: booleanSchema().optional(),
          printsUnknownSequences: booleanSchema().optional(),
          wtSession: booleanSchema().optional(),
          isVscodeTerm: booleanSchema().optional(),
          keyDialect: _enum(["st", "rxvt"]).nullable().optional().catch(undefined),
          browser: stringSchema().nullable().optional(),
          colorLevel: union([literal(0), literal(1), literal(2), literal(3)]).optional(),
          syncOutput: booleanSchema().optional(),
          editor: stringSchema().nullable().optional(),
          systemTheme: _enum(["dark", "light"]).optional(),
          tmuxSocket: pipeOrPathSchema().refine(isAbsolute).optional().catch(undefined),
          sessionTabs: stringSchema().regex(TABS_KEY_RE).optional().catch(undefined),
          cloudTabs: literal(true).optional().catch(undefined),
          tabsLanding: objectSchema({
            why: _enum(TABS_LANDING_REASONS),
            from: stringSchema().regex(SHORT_RE),
          })
            .optional()
            .catch(undefined),
        }).optional(),
        holdingFrame: booleanSchema().optional(),
      }),
      objectSchema({
        proto,
        op: literal("resize"),
        short: shortSchema,
        cols: numberSchema().int().min(1).max(SOCKET_IDLE_TIMEOUT_MS),
        rows: numberSchema().int().min(1).max(SOCKET_IDLE_TIMEOUT_MS),
        attachId: stringSchema().optional(),
      }),
      objectSchema({
        proto,
        op: literal("ensure-spare"),
        cwd: stringSchema(),
      }),
      objectSchema({
        proto,
        op: literal("permission-response"),
        short: shortSchema,
        requestId: stringSchema(),
        allow: booleanSchema(),
        auth: stringSchema().optional(),
      }),
      objectSchema({
        proto,
        op: literal("respawn-stale"),
        short: shortSchema,
      }),
      objectSchema({
        proto,
        op: literal("shutdown"),
        reapWorkers: booleanSchema().optional(),
      }),
    ]);
  });
  LeaseClientSchema = DoctorLazy(() =>
    objectSchema({
      label: stringSchema().max(64).refine(hasNoControlChars),
      cwd: stringSchema().max(4096).refine(hasNoControlChars).catch("(not shown)"),
      pid: numberSchema().int().positive().catch(0),
      cloudSessionId: stringSchema().regex(CLOUD_SESSION_ID_RE).optional().catch(undefined),
    }),
  );
  LeaseAcknowledgementSchema = DoctorLazy(() =>
    objectSchema({
      ok: literal(true),
      op: literal("lease"),
    }),
  );
  CLOSING_REASONS = [
    "upgrade",
    "service_recall",
    "displaced",
    "yield",
    "shutdown_op",
    "idle_exit",
    "bg_manager_failed",
    "signal",
    "unknown",
  ];
  LeaseClosingNoticeSchema = DoctorLazy(() =>
    objectSchema({
      op: literal("lease"),
      closing: _enum(CLOSING_REASONS),
    }),
  );
  CLOUD_SESSION_LEASE_LABEL = "cloud session";
  DAEMON_LEASE_LABELS = ["cli-bg-dispatch", "claude agents", CLOUD_SESSION_LEASE_LABEL];
});
export {
  BG_PROTO,
  HOST_DIED_DETAIL,
  HOST_DIED_EXEC_DETAIL,
  HOST_DIED_EXEC_ATTACH_MESSAGE,
  HOST_DIED_ATTACH_MESSAGE,
  RACED_SOCKET_GAP,
  TRANSIENT_ATTACH_CODE,
  FATAL_ATTACH_CODE,
  HOST_DEAD_ATTACH_CODE,
  KICKED_ATTACH_CODE,
  SHORT_RE,
  isLeaseSource,
  boundedMarkCountOrUndefined,
  SUPERVISOR_DETACH_CODE,
  DAEMON_DETACH_APC,
  DAEMON_HINT_APC,
  extractInteractiveMarks,
  parseDetachMsg,
  CLOUD_SESSION_ID_RE,
  daemonDetachApc,
  BgDispatchSchema,
  CLOUD_SESSION_LEASE_LABEL,
  LeaseClientSchema,
  RESPAWNING_ATTACH_CODE,
  RESPAWN_REASON_UPGRADE,
  RESPAWN_REASON_STALL,
  RESPAWN_REASON_LEGACY,
  RosterSchema,
  LeaseClosingNoticeSchema,
  LeaseAcknowledgementSchema,
  interactiveMarkApc,
  rosterEntryExtras,
  wrapDaemonHint,
  parseInteractiveMarkRv,
  BG_PROTO_MIN,
  ControlRequestSchema,
  streamDetachMessage,
  KICKED_NOTICE,
  DAEMON_LEASE_LABELS,
  TABS_KEY_RE,
};
