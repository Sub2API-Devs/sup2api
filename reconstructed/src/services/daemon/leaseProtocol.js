/**
 * services/daemon/leaseProtocol.ts
 *
 * 2.1.316 新增：守护进程租约协议
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y162pn60.js (22)
 * attribution: placement 22
 */
import { delimiter, isAbsolute } from "path";
import { ANY_CONTROL_CHAR_RE } from "../../utils/stringUtils.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import {
  E,
  u,
  _enum,
  looseObject,
  string,
  discriminatedUnion,
  literal,
  array,
  M,
  record,
  unknown,
  union,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { keepForwardableEnv, stripForwardedFlags } from "../../cli/forwardedFlags.js";
import { stripLongPathPrefixes } from "../../utils/windowsUncPaths.js";
import { SOCKET_IDLE_TIMEOUT_MS } from "../../utils/framedSocket.js";
import { isValidPipeOrPath } from "../../utils/peerAddress.js";

//@ chunk-y162pn60.js:1832-1883 placement
/**
 * 后台租约的来源类型（shell、slash、fleet、spare、respawn）。
 */
var BG_LEASE_SOURCES = ["shell", "slash", "fleet", "spare", "respawn"];
//@ chunk-y162pn60.js:1883-1921 placement
/**
 * 判断字符串是否属于租约来源。
 */
function isLeaseSource(e) {
  return BG_LEASE_SOURCES.includes(e);
}
//@ chunk-y162pn60.js:1921-2051 placement
/**
 * tabs 落点失败的原因枚举（failed、taken、ended）。
 */
var BG_PROTO = 1;
var BG_PROTO_MIN = 1;
var SHORT_RE = /^[a-f0-9]{8}$/;
var TABS_KEY_RE = /^[a-f0-9]{32}$/;
var TABS_LANDING_REASONS = ["failed", "taken", "ended"];
var CLOUD_SESSION_ID_RE = /^(?:cse|session)_[A-Za-z0-9_-]{1,128}$/;
//@ chunk-y162pn60.js:2051-2084 placement
/**
 * 判断字符串里没有控制字符。
 */
function hasNoControlChars(e) {
  return !ANY_CONTROL_CHAR_RE.test(e);
}
//@ chunk-y162pn60.js:2084-2191 placement
/**
 * 分离消息的 APC 前缀 ESC_cc-detach-msg;。
 */
var DAEMON_DETACH_APC = "\x1B_cc-daemon-detach\x1B\\";
var APC_ST = "\x1B\\";
var DETACH_MSG_PREFIX = "\x1B_cc-detach-msg;";
var DAEMON_HINT_APC = "\x1B_cc-daemon-hint\x1B\\";
//@ chunk-y162pn60.js:2191-2224 placement
function wrapDaemonHint(e) {
  return DAEMON_HINT_APC + e + DAEMON_HINT_APC;
}
//@ chunk-y162pn60.js:2224-2278 placement
/**
 * 交互标记 APC 前缀 ESC_cc-d-imark;。
 */
var INTERACTIVE_MARK_PREFIX = "\x1B_cc-d-imark;";
var buffer = Buffer.from(INTERACTIVE_MARK_PREFIX, "latin1");
//@ chunk-y162pn60.js:2278-2312 placement
function interactiveMarkApc(e) {
  return INTERACTIVE_MARK_PREFIX + jsonStringify(e) + APC_ST;
}
//@ chunk-y162pn60.js:2312-3552 placement
function extractInteractiveMarks(e, n, r) {
  let maxPayload = r?.maxPayload ?? 512;
  let f = e.length > 0 ? Buffer.concat([e, n]) : n;
  let m = [];
  let g = [];
  let S = 0;
  let y = 0;
  let h = -1;
  let w = false;
  for (;;) {
    let index = f.indexOf(INTERACTIVE_MARK_PREFIX, y);
    if (index < 0) break;
    let D = index + INTERACTIVE_MARK_PREFIX.length;
    let R = w ? -1 : h >= D ? h : (h = f.indexOf(APC_ST, D));
    if (R < 0) {
      w = true;
      let chunk = f.subarray(index);
      if (chunk.length > INTERACTIVE_MARK_PREFIX.length + maxPayload) {
        y = D;
        continue;
      }
      let G = false;
      for (let ie = D; ie < f.length; ie++) {
        let Ae = f[ie];
        if (Ae === 24 || Ae === 26 || (Ae === 27 && ie < f.length - 1)) {
          G = true;
          break;
        }
      }
      if (G) {
        y = D;
        continue;
      }
      g.push(f.subarray(S, index));
      return {
        marks: m,
        carry: Buffer.from(chunk),
        cleaned: g.length === 1 ? g[0] : Buffer.concat(g),
      };
    }
    let L = false;
    if (R - D <= maxPayload)
      try {
        let j = jsonParse(f.subarray(D, R).toString("utf8"));
        if (j !== null && typeof j === "object" && (j.kind === "content_paint" || j.kind === "prompt_idle")) {
          L = true;
          if (r?.requireNonce === undefined || j.nonce === r.requireNonce)
            m.push({
              kind: j.kind,
              msgsLoaded: boundedMarkCountOrUndefined(j.msgsLoaded),
              msgsInJsonl: boundedMarkCountOrUndefined(j.msgsInJsonl),
              msgsRenderedAtFirstPaint: boundedMarkCountOrUndefined(j.msgsRenderedAtFirstPaint),
            });
        }
      } catch {}
    if (L) {
      g.push(f.subarray(S, index));
      S = R + APC_ST.length;
    }
    y = L ? R + APC_ST.length : D;
  }
  let chunk = f.subarray(y);
  let F = buffer;
  let O = 0;
  let min = Math.min(chunk.length, F.length - 1);
  e: for (let v = min; v > 0; v--) {
    let D = chunk.length - v;
    for (let j = 0; j < v; j++) if (chunk[D + j] !== F[j]) continue e;
    O = v;
    break;
  }
  g.push(f.subarray(S, f.length - O));
  return {
    marks: m,
    carry: O > 0 ? Buffer.from(chunk.subarray(chunk.length - O)) : Buffer.alloc(0),
    cleaned: g.length === 1 ? g[0] : Buffer.concat(g),
  };
}
//@ chunk-y162pn60.js:3552-3638 placement
function boundedMarkCountOrUndefined(e) {
  return typeof e === "number" && Number.isInteger(e) && e >= 0 && e <= MAX_MSG_COUNT ? e : undefined;
}
//@ chunk-y162pn60.js:3638-3936 placement
var MAX_MSG_COUNT = 1e9;
var optionalCount = () => E().int().nonnegative().max(MAX_MSG_COUNT).optional();
var interactiveMarkSchema = DoctorLazy(() =>
  u({
    kind: _enum(["content_paint", "prompt_idle"]),
    msgsLoaded: optionalCount(),
    msgsInJsonl: optionalCount(),
    msgsRenderedAtFirstPaint: optionalCount(),
  }),
);
var strictInteractiveMarkSchema = DoctorLazy(() =>
  looseObject({
    kind: _enum(["content_paint", "prompt_idle"]),
    msgsLoaded: optionalCount(),
    msgsInJsonl: optionalCount(),
    msgsRenderedAtFirstPaint: optionalCount(),
  }),
);
//@ chunk-y162pn60.js:3936-4144 placement
function parseInteractiveMarkRv(e) {
  let n = strictInteractiveMarkSchema().safeParse(e);
  if (!n.success) return null;
  return {
    kind: n.data.kind,
    msgsLoaded: n.data.msgsLoaded,
    msgsInJsonl: n.data.msgsInJsonl,
    msgsRenderedAtFirstPaint: n.data.msgsRenderedAtFirstPaint,
  };
}
//@ chunk-y162pn60.js:4144-4196 placement
function daemonDetachApc(e) {
  if (!e) return DAEMON_DETACH_APC;
  return DETACH_MSG_PREFIX + e + APC_ST + DAEMON_DETACH_APC;
}
//@ chunk-y162pn60.js:4196-4336 placement
function parseDetachMsg(e) {
  let index = e.indexOf(DETACH_MSG_PREFIX);
  if (index < 0) return;
  let r = index + DETACH_MSG_PREFIX.length;
  let index_2 = e.indexOf(APC_ST, r);
  if (index_2 < 0) return;
  return e.subarray(r, index_2).toString("utf8");
}
//@ chunk-y162pn60.js:4336-4506 placement
function normalizePluginDirsEnv(e, n) {
  let r = {};
  for (let [key, value] of Object.entries(keepForwardableEnv(e, n)))
    r[key] =
      key.toUpperCase() === "CLAUDE_CODE_PLUGIN_DIRS"
        ? value
            .split(delimiter)
            .map((m) => stripLongPathPrefixes(m.trim()))
            .join(delimiter)
        : value;
  return r;
}
//@ chunk-y162pn60.js:4506-6241 placement
var BgDispatchSchema = DoctorLazy(() =>
  u({
    proto: E().int().min(BG_PROTO_MIN).max(BG_PROTO),
    short: string().regex(SHORT_RE),
    nonce: string().regex(SHORT_RE).optional(),
    sessionId: string().transform(stripLongPathPrefixes),
    createdAt: E(),
    source: _enum(BG_LEASE_SOURCES).catch("fleet"),
    cwd: string().transform(stripLongPathPrefixes),
    launch: discriminatedUnion("mode", [
      u({
        mode: literal("prompt"),
        args: array(string()).transform(stripForwardedFlags),
        restoresTranscript: M().optional(),
      }),
      u({
        mode: literal("resume"),
        sessionId: string().transform(stripLongPathPrefixes),
        transcriptPath: string().transform(stripLongPathPrefixes).optional(),
        fork: M(),
        flagArgs: array(string()).transform(stripForwardedFlags),
        restoresTranscript: M().optional(),
      }),
      u({
        mode: literal("exec"),
        cmd: string().transform(stripLongPathPrefixes),
        args: array(string()).transform((e) => e.map(stripLongPathPrefixes)),
      }),
    ]),
    env: record(string(), string())
      .default({})
      .transform((e) => normalizePluginDirsEnv(e, "the background job's launch request")),
    reattachEnv: record(string(), string())
      .transform((e) => normalizePluginDirsEnv(e, "the launch request's reattach values"))
      .optional(),
    worktree: u({
      path: string().transform(stripLongPathPrefixes),
      ownershipToken: string(),
    }).optional(),
    isolation: _enum(["none", "worktree"]).default("none"),
    respawnFlags: array(string()).default([]).transform(stripForwardedFlags),
    attachStallRespawns: E().int().optional(),
    agent: string().optional(),
    routine: string().optional(),
    seed: u({
      intent: string(),
      name: string().optional(),
    }).optional(),
    cols: E().int().positive().max(SOCKET_IDLE_TIMEOUT_MS).optional(),
    rows: E().int().positive().max(SOCKET_IDLE_TIMEOUT_MS).optional(),
  }),
);
var TRANSIENT_ATTACH_CODE = /ERESPAWNING|ESTARTING/;
var RACED_SOCKET_GAP = /\bE(?:NOENT|CONNREFUSED|CONNRESET)\b|control socket closed/;
var RESPAWNING_ATTACH_CODE = "ERESPAWNING";
var RESPAWN_REASON_UPGRADE = "updated Claude Code";
var RESPAWN_REASON_STALL = "stalled";
var RESPAWN_REASON_LEGACY = "legacy";
var HOST_DEAD_ATTACH_CODE = "EHOSTDEAD";
var HOST_DIED_DETAIL = "terminal host process died \u2014 press Enter to restart";
var HOST_DIED_ATTACH_MESSAGE = "This session's terminal host process died (the conversation is saved)";
var HOST_DIED_EXEC_DETAIL =
  "terminal host process died \u2014 its output is gone; the command was not run again";
var HOST_DIED_EXEC_ATTACH_MESSAGE =
  "This command's terminal host process died \u2014 its output is gone and the command was not run again";
var FATAL_ATTACH_CODE = /ESTALLED|EUNVERIFIED|EHOSTDEAD/;
var KICKED_ATTACH_CODE = /^EKICKED:\s*/;
var KICKED_NOTICE = "Session opened in another window";
//@ chunk-y162pn60.js:6241-6323 placement
function streamDetachMessage(e, sessionTabs, r) {
  return sessionTabs !== undefined && TABS_KEY_RE.test(sessionTabs)
    ? `${e}:${sessionTabs}: ${r}`
    : `${e}: ${r}`;
}
//@ chunk-y162pn60.js:6323-6343 placement
var SUPERVISOR_DETACH_CODE = /^E[A-Z]+:/;
//@ chunk-y162pn60.js:6343-6397 placement
/**
 * 校验值是否为合法的管道/路径。
 */
function pipeOrPathSchema() {
  return string().refine(isValidPipeOrPath, "remote IPC path");
}
//@ chunk-y162pn60.js:6397-7016 placement
/**
 * 名册中单个后台 worker 的 schema：pid、会话 ID、各 socket、版本、尝试次数、cwd、派发信息、待重启、终端模式、交互标记与认证等。
 */
var rosterWorkerSchema = DoctorLazy(() =>
  looseObject({
    pid: E(),
    procStart: string().optional(),
    sessionId: string().transform(stripLongPathPrefixes),
    rendezvousSock: pipeOrPathSchema(),
    ptySock: pipeOrPathSchema().optional(),
    messagingSock: pipeOrPathSchema().optional(),
    cliVersion: string().optional(),
    startedAt: E(),
    attempt: E(),
    cwd: string().transform(stripLongPathPrefixes),
    worktreePath: string().transform(stripLongPathPrefixes).optional(),
    dispatch: BgDispatchSchema(),
    pendingRespawn: literal("upgrade").optional(),
    decModes: array(E()).optional(),
    firedInteractiveMarks: array(unknown())
      .transform((e) => {
        let n = [];
        for (let r of e) {
          let s = interactiveMarkSchema().safeParse(r);
          if (s.success) n.push(s.data);
        }
        return n.slice(0, 2);
      })
      .optional()
      .catch(undefined),
    rvAuth: string().optional(),
    ptyAuth: string().optional(),
    replPid: E().optional(),
    replProcStart: string().optional(),
  }),
);
//@ chunk-y162pn60.js:7016-7116 placement
function rosterEntryExtras(e) {
  let shape = rosterWorkerSchema().shape;
  let r = {};
  for (let [key, value] of Object.entries(e)) if (!(key in shape)) r[key] = value;
  return r;
}
//@ chunk-y162pn60.js:7116-9695 placement
/**
 * 租约关闭原因的取值列表。
 */
var RosterSchema = DoctorLazy(() =>
  looseObject({
    proto: E().int().min(BG_PROTO_MIN).max(BG_PROTO),
    supervisorPid: E().catch(0),
    updatedAt: E().catch(0),
    workers: record(string().regex(SHORT_RE), rosterWorkerSchema()),
  }),
);
var ControlRequestSchema = DoctorLazy(() => {
  let e = string().regex(SHORT_RE);
  let proto = E().int().min(BG_PROTO_MIN).max(BG_PROTO);
  return discriminatedUnion("op", [
    u({
      proto,
      op: literal("ping"),
    }),
    u({
      proto,
      op: literal("nudge"),
    }),
    u({
      proto,
      op: literal("yield"),
    }),
    u({
      proto,
      op: literal("lease"),
      client: LeaseClientSchema().optional(),
    }),
    u({
      proto,
      op: literal("leases"),
    }),
    u({
      proto,
      op: literal("await-ack"),
      short: e,
      nonce: e.optional(),
      timeoutMs: E(),
    }),
    u({
      proto,
      op: literal("dispatch"),
      d: BgDispatchSchema(),
      timeoutMs: E(),
      auth: string().optional(),
    }),
    u({
      proto,
      op: literal("list"),
    }),
    u({
      proto,
      op: literal("has"),
      short: e,
    }),
    u({
      proto,
      op: literal("kill"),
      short: e,
      signal: _enum(["SIGTERM", "SIGKILL"]).optional(),
      handoff: M().optional(),
      evict: M().optional(),
    }),
    u({
      proto,
      op: literal("reply"),
      short: e,
      text: string(),
      auth: string().optional(),
      nextTurn: M().optional(),
    }),
    u({
      proto,
      op: literal("subscribe"),
      short: e,
      tail: E().optional(),
    }),
    u({
      proto,
      op: literal("attach"),
      short: e,
      auth: string().optional(),
      cols: E().int().min(1).max(SOCKET_IDLE_TIMEOUT_MS),
      rows: E().int().min(1).max(SOCKET_IDLE_TIMEOUT_MS),
      attachId: string().optional(),
      caps: u({
        imark: M().optional(),
        terminal: string().nullable(),
        mux: _enum(["tmux", "screen", "zellij"]).nullable(),
        ssh: M(),
        wheelFlood: M().optional(),
        hyperlinks: M().optional(),
        progressReporting: M().optional(),
        printsUnknownSequences: M().optional(),
        wtSession: M().optional(),
        isVscodeTerm: M().optional(),
        keyDialect: _enum(["st", "rxvt"]).nullable().optional().catch(undefined),
        browser: string().nullable().optional(),
        colorLevel: union([literal(0), literal(1), literal(2), literal(3)]).optional(),
        syncOutput: M().optional(),
        editor: string().nullable().optional(),
        systemTheme: _enum(["dark", "light"]).optional(),
        tmuxSocket: pipeOrPathSchema().refine(isAbsolute).optional().catch(undefined),
        sessionTabs: string().regex(TABS_KEY_RE).optional().catch(undefined),
        cloudTabs: literal(true).optional().catch(undefined),
        tabsLanding: u({
          why: _enum(TABS_LANDING_REASONS),
          from: string().regex(SHORT_RE),
        })
          .optional()
          .catch(undefined),
      }).optional(),
      holdingFrame: M().optional(),
    }),
    u({
      proto,
      op: literal("resize"),
      short: e,
      cols: E().int().min(1).max(SOCKET_IDLE_TIMEOUT_MS),
      rows: E().int().min(1).max(SOCKET_IDLE_TIMEOUT_MS),
      attachId: string().optional(),
    }),
    u({
      proto,
      op: literal("ensure-spare"),
      cwd: string(),
    }),
    u({
      proto,
      op: literal("permission-response"),
      short: e,
      requestId: string(),
      allow: M(),
      auth: string().optional(),
    }),
    u({
      proto,
      op: literal("respawn-stale"),
      short: e,
    }),
    u({
      proto,
      op: literal("shutdown"),
      reapWorkers: M().optional(),
    }),
  ]);
});
var LeaseClientSchema = DoctorLazy(() =>
  u({
    label: string().max(64).refine(hasNoControlChars),
    cwd: string().max(4096).refine(hasNoControlChars).catch("(not shown)"),
    pid: E().int().positive().catch(0),
    cloudSessionId: string().regex(CLOUD_SESSION_ID_RE).optional().catch(undefined),
  }),
);
var LeaseAcknowledgementSchema = DoctorLazy(() =>
  u({
    ok: literal(true),
    op: literal("lease"),
  }),
);
var CLOSING_REASONS = [
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
var LeaseClosingNoticeSchema = DoctorLazy(() =>
  u({
    op: literal("lease"),
    closing: _enum(CLOSING_REASONS),
  }),
);
var CLOUD_SESSION_LEASE_LABEL = "cloud session";
var DAEMON_LEASE_LABELS = ["cli-bg-dispatch", "claude agents", CLOUD_SESSION_LEASE_LABEL];
export {
  daemonDetachApc,
  BG_PROTO,
  SHORT_RE,
  CLOUD_SESSION_ID_RE,
  LeaseClosingNoticeSchema,
  LeaseAcknowledgementSchema,
  DAEMON_DETACH_APC,
  interactiveMarkApc,
  rosterEntryExtras,
  wrapDaemonHint,
  parseInteractiveMarkRv,
  HOST_DIED_EXEC_DETAIL,
  HOST_DIED_DETAIL,
  RESPAWNING_ATTACH_CODE,
  RESPAWN_REASON_UPGRADE,
  RESPAWN_REASON_STALL,
  RESPAWN_REASON_LEGACY,
  TRANSIENT_ATTACH_CODE,
  RACED_SOCKET_GAP,
  SUPERVISOR_DETACH_CODE,
  FATAL_ATTACH_CODE,
  KICKED_ATTACH_CODE,
  HOST_DEAD_ATTACH_CODE,
  HOST_DIED_EXEC_ATTACH_MESSAGE,
  HOST_DIED_ATTACH_MESSAGE,
  LeaseClientSchema,
  CLOUD_SESSION_LEASE_LABEL,
  BG_PROTO_MIN,
  ControlRequestSchema,
  streamDetachMessage,
  KICKED_NOTICE,
  DAEMON_LEASE_LABELS,
  BgDispatchSchema,
  boundedMarkCountOrUndefined,
  DAEMON_HINT_APC,
  extractInteractiveMarks,
  parseDetachMsg,
  isLeaseSource,
  RosterSchema,
};
