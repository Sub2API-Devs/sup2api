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
import { delimiter, isAbsolute, isAbsolute as isAbsolute_2 } from "path";
import { ANY_CONTROL_CHAR_RE } from "../../utils/stringUtils.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { E, u, U, kt, o, Ir, T, A, M, pe, oe, Ue } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { keepForwardableEnv, stripForwardedFlags } from "../../cli/forwardedFlags.js";
import { stripLongPathPrefixes } from "../../utils/windowsUncPaths.js";
import { RNe } from "../../utils/framedSocket.js";
import { isValidPipeOrPath } from "../../utils/peerAddress.js";

//@ chunk-y162pn60.js:1832-1883 placement
var Re = ["shell", "slash", "fleet", "spare", "respawn"];
//@ chunk-y162pn60.js:1883-1921 placement
function m7s(e) {
  return Re.includes(e);
}
//@ chunk-y162pn60.js:1921-2051 placement
var BG_PROTO = 1,
  BG_PROTO_MIN = 1,
  SHORT_RE = /^[a-f0-9]{8}$/,
  TABS_KEY_RE = /^[a-f0-9]{32}$/,
  ft = ["failed", "taken", "ended"],
  CLOUD_SESSION_ID_RE = /^(?:cse|session)_[A-Za-z0-9_-]{1,128}$/;
//@ chunk-y162pn60.js:2051-2084 placement
function De(e) {
  return !ANY_CONTROL_CHAR_RE.test(e);
}
//@ chunk-y162pn60.js:2084-2191 placement
var DAEMON_DETACH_APC = "\x1B_cc-daemon-detach\x1B\\",
  ae = "\x1B\\",
  ze = "\x1B_cc-detach-msg;",
  DAEMON_HINT_APC = "\x1B_cc-daemon-hint\x1B\\";
//@ chunk-y162pn60.js:2191-2224 placement
function wrapDaemonHint(e) {
  return DAEMON_HINT_APC + e + DAEMON_HINT_APC;
}
//@ chunk-y162pn60.js:2224-2278 placement
var fe = "\x1B_cc-d-imark;",
  buffer = Buffer.from(fe, "latin1");
//@ chunk-y162pn60.js:2278-2312 placement
function interactiveMarkApc(e) {
  return fe + jsonStringify(e) + ae;
}
//@ chunk-y162pn60.js:2312-3552 placement
function extractInteractiveMarks(e, n, r) {
  let s = r?.maxPayload ?? 512,
    f = e.length > 0 ? Buffer.concat([e, n]) : n,
    m = [],
    g = [],
    S = 0,
    y = 0,
    h = -1,
    w = !1;
  for (;;) {
    let index = f.indexOf(fe, y);
    if (index < 0) break;
    let D = index + fe.length,
      R = w ? -1 : h >= D ? h : (h = f.indexOf(ae, D));
    if (R < 0) {
      w = !0;
      let chunk = f.subarray(index);
      if (chunk.length > fe.length + s) {
        y = D;
        continue;
      }
      let G = !1;
      for (let ie = D; ie < f.length; ie++) {
        let Ae = f[ie];
        if (Ae === 24 || Ae === 26 || (Ae === 27 && ie < f.length - 1)) {
          G = !0;
          break;
        }
      }
      if (G) {
        y = D;
        continue;
      }
      return (
        g.push(f.subarray(S, index)),
        { marks: m, carry: Buffer.from(chunk), cleaned: g.length === 1 ? g[0] : Buffer.concat(g) }
      );
    }
    let L = !1;
    if (R - D <= s)
      try {
        let j = jsonParse(f.subarray(D, R).toString("utf8"));
        if (j !== null && typeof j === "object" && (j.kind === "content_paint" || j.kind === "prompt_idle")) {
          if (((L = !0), r?.requireNonce === void 0 || j.nonce === r.requireNonce))
            m.push({
              kind: j.kind,
              msgsLoaded: boundedMarkCountOrUndefined(j.msgsLoaded),
              msgsInJsonl: boundedMarkCountOrUndefined(j.msgsInJsonl),
              msgsRenderedAtFirstPaint: boundedMarkCountOrUndefined(j.msgsRenderedAtFirstPaint),
            });
        }
      } catch {}
    if (L) (g.push(f.subarray(S, index)), (S = R + ae.length));
    y = L ? R + ae.length : D;
  }
  let chunk = f.subarray(y),
    F = buffer,
    O = 0,
    min = Math.min(chunk.length, F.length - 1);
  e: for (let v = min; v > 0; v--) {
    let D = chunk.length - v;
    for (let R = 0; R < v; R++) if (chunk[D + R] !== F[R]) continue e;
    O = v;
    break;
  }
  return (
    g.push(f.subarray(S, f.length - O)),
    {
      marks: m,
      carry: O > 0 ? Buffer.from(chunk.subarray(chunk.length - O)) : Buffer.alloc(0),
      cleaned: g.length === 1 ? g[0] : Buffer.concat(g),
    }
  );
}
//@ chunk-y162pn60.js:3552-3638 placement
function boundedMarkCountOrUndefined(e) {
  return typeof e === "number" && Number.isInteger(e) && e >= 0 && e <= MAX_MSG_COUNT ? e : void 0;
}
//@ chunk-y162pn60.js:3638-3936 placement
var MAX_MSG_COUNT = 1e9,
  optionalCount = () => E().int().nonnegative().max(MAX_MSG_COUNT).optional(),
  interactiveMarkSchema = DoctorLazy(() =>
    u({
      kind: U(["content_paint", "prompt_idle"]),
      msgsLoaded: optionalCount(),
      msgsInJsonl: optionalCount(),
      msgsRenderedAtFirstPaint: optionalCount(),
    }),
  ),
  strictInteractiveMarkSchema = DoctorLazy(() =>
    kt({
      kind: U(["content_paint", "prompt_idle"]),
      msgsLoaded: optionalCount(),
      msgsInJsonl: optionalCount(),
      msgsRenderedAtFirstPaint: optionalCount(),
    }),
  );
//@ chunk-y162pn60.js:3936-4144 placement
function parseInteractiveMarkRv(e) {
  let safeParse = strictInteractiveMarkSchema().safeParse(e);
  if (!safeParse.success) return null;
  return {
    kind: safeParse.data.kind,
    msgsLoaded: safeParse.data.msgsLoaded,
    msgsInJsonl: safeParse.data.msgsInJsonl,
    msgsRenderedAtFirstPaint: safeParse.data.msgsRenderedAtFirstPaint,
  };
}
//@ chunk-y162pn60.js:4144-4196 placement
function daemonDetachApc(e) {
  if (!e) return DAEMON_DETACH_APC;
  return ze + e + ae + DAEMON_DETACH_APC;
}
//@ chunk-y162pn60.js:4196-4336 placement
function parseDetachMsg(e) {
  let index = e.indexOf(ze);
  if (index < 0) return;
  let r = index + ze.length,
    index_2 = e.indexOf(ae, r);
  if (index_2 < 0) return;
  return e.subarray(r, index_2).toString("utf8");
}
//@ chunk-y162pn60.js:4336-4506 placement
function normalizePluginDirsEnv(e, n) {
  let r = {};
  for (let [s, f] of Object.entries(keepForwardableEnv(e, n)))
    r[s] =
      s.toUpperCase() === "CLAUDE_CODE_PLUGIN_DIRS"
        ? f
            .split(delimiter)
            .map((m) => stripLongPathPrefixes(m.trim()))
            .join(delimiter)
        : f;
  return r;
}
//@ chunk-y162pn60.js:4506-6241 placement
var BgDispatchSchema = DoctorLazy(() =>
    u({
      proto: E().int().min(BG_PROTO_MIN).max(BG_PROTO),
      short: o().regex(SHORT_RE),
      nonce: o().regex(SHORT_RE).optional(),
      sessionId: o().transform(stripLongPathPrefixes),
      createdAt: E(),
      source: U(Re).catch("fleet"),
      cwd: o().transform(stripLongPathPrefixes),
      launch: Ir("mode", [
        u({
          mode: T("prompt"),
          args: A(o()).transform(stripForwardedFlags),
          restoresTranscript: M().optional(),
        }),
        u({
          mode: T("resume"),
          sessionId: o().transform(stripLongPathPrefixes),
          transcriptPath: o().transform(stripLongPathPrefixes).optional(),
          fork: M(),
          flagArgs: A(o()).transform(stripForwardedFlags),
          restoresTranscript: M().optional(),
        }),
        u({
          mode: T("exec"),
          cmd: o().transform(stripLongPathPrefixes),
          args: A(o()).transform((e) => e.map(stripLongPathPrefixes)),
        }),
      ]),
      env: pe(o(), o())
        .default({})
        .transform((e) => normalizePluginDirsEnv(e, "the background job's launch request")),
      reattachEnv: pe(o(), o())
        .transform((e) => normalizePluginDirsEnv(e, "the launch request's reattach values"))
        .optional(),
      worktree: u({ path: o().transform(stripLongPathPrefixes), ownershipToken: o() }).optional(),
      isolation: U(["none", "worktree"]).default("none"),
      respawnFlags: A(o()).default([]).transform(stripForwardedFlags),
      attachStallRespawns: E().int().optional(),
      agent: o().optional(),
      routine: o().optional(),
      seed: u({ intent: o(), name: o().optional() }).optional(),
      cols: E().int().positive().max(RNe).optional(),
      rows: E().int().positive().max(RNe).optional(),
    }),
  ),
  TRANSIENT_ATTACH_CODE = /ERESPAWNING|ESTARTING/,
  RACED_SOCKET_GAP = /\bE(?:NOENT|CONNREFUSED|CONNRESET)\b|control socket closed/,
  RESPAWNING_ATTACH_CODE = "ERESPAWNING",
  RESPAWN_REASON_UPGRADE = "updated Claude Code",
  RESPAWN_REASON_STALL = "stalled",
  RESPAWN_REASON_LEGACY = "legacy",
  HOST_DEAD_ATTACH_CODE = "EHOSTDEAD",
  HOST_DIED_DETAIL = "terminal host process died \u2014 press Enter to restart",
  HOST_DIED_ATTACH_MESSAGE = "This session's terminal host process died (the conversation is saved)",
  HOST_DIED_EXEC_DETAIL =
    "terminal host process died \u2014 its output is gone; the command was not run again",
  HOST_DIED_EXEC_ATTACH_MESSAGE =
    "This command's terminal host process died \u2014 its output is gone and the command was not run again",
  FATAL_ATTACH_CODE = /ESTALLED|EUNVERIFIED|EHOSTDEAD/,
  KICKED_ATTACH_CODE = /^EKICKED:\s*/,
  KICKED_NOTICE = "Session opened in another window";
//@ chunk-y162pn60.js:6241-6323 placement
function streamDetachMessage(e, n, r) {
  return n !== void 0 && TABS_KEY_RE.test(n) ? `${e}:${n}: ${r}` : `${e}: ${r}`;
}
//@ chunk-y162pn60.js:6323-6343 placement
var SUPERVISOR_DETACH_CODE = /^E[A-Z]+:/;
//@ chunk-y162pn60.js:6343-6397 placement
function be() {
  return o().refine(isValidPipeOrPath, "remote IPC path");
}
/**
 * 名册中单个后台 worker 的 schema：pid、会话 ID、各 socket、版本、尝试次数、cwd、派发信息、待重启、终端模式、交互标记与认证等。
 */
//@ chunk-y162pn60.js:6397-7016 placement
var rosterWorkerSchema = DoctorLazy(() =>
  kt({
    pid: E(),
    procStart: o().optional(),
    sessionId: o().transform(stripLongPathPrefixes),
    rendezvousSock: be(),
    ptySock: be().optional(),
    messagingSock: be().optional(),
    cliVersion: o().optional(),
    startedAt: E(),
    attempt: E(),
    cwd: o().transform(stripLongPathPrefixes),
    worktreePath: o().transform(stripLongPathPrefixes).optional(),
    dispatch: BgDispatchSchema(),
    pendingRespawn: T("upgrade").optional(),
    decModes: A(E()).optional(),
    firedInteractiveMarks: A(oe())
      .transform((e) => {
        let n = [];
        for (let r of e) {
          let safeParse = interactiveMarkSchema().safeParse(r);
          if (safeParse.success) n.push(safeParse.data);
        }
        return n.slice(0, 2);
      })
      .optional()
      .catch(void 0),
    rvAuth: o().optional(),
    ptyAuth: o().optional(),
    replPid: E().optional(),
    replProcStart: o().optional(),
  }),
);
//@ chunk-y162pn60.js:7016-7116 placement
function rosterEntryExtras(e) {
  let shape = rosterWorkerSchema().shape,
    r = {};
  for (let [s, f] of Object.entries(e)) if (!(s in shape)) r[s] = f;
  return r;
}
//@ chunk-y162pn60.js:7116-9695 placement
var RosterSchema = DoctorLazy(() =>
    kt({
      proto: E().int().min(BG_PROTO_MIN).max(BG_PROTO),
      supervisorPid: E().catch(0),
      updatedAt: E().catch(0),
      workers: pe(o().regex(SHORT_RE), rosterWorkerSchema()),
    }),
  ),
  ControlRequestSchema = DoctorLazy(() => {
    let regex = o().regex(SHORT_RE),
      max = E().int().min(BG_PROTO_MIN).max(BG_PROTO);
    return Ir("op", [
      u({ proto: max, op: T("ping") }),
      u({ proto: max, op: T("nudge") }),
      u({ proto: max, op: T("yield") }),
      u({ proto: max, op: T("lease"), client: LeaseClientSchema().optional() }),
      u({ proto: max, op: T("leases") }),
      u({ proto: max, op: T("await-ack"), short: regex, nonce: regex.optional(), timeoutMs: E() }),
      u({ proto: max, op: T("dispatch"), d: BgDispatchSchema(), timeoutMs: E(), auth: o().optional() }),
      u({ proto: max, op: T("list") }),
      u({ proto: max, op: T("has"), short: regex }),
      u({
        proto: max,
        op: T("kill"),
        short: regex,
        signal: U(["SIGTERM", "SIGKILL"]).optional(),
        handoff: M().optional(),
        evict: M().optional(),
      }),
      u({
        proto: max,
        op: T("reply"),
        short: regex,
        text: o(),
        auth: o().optional(),
        nextTurn: M().optional(),
      }),
      u({ proto: max, op: T("subscribe"), short: regex, tail: E().optional() }),
      u({
        proto: max,
        op: T("attach"),
        short: regex,
        auth: o().optional(),
        cols: E().int().min(1).max(RNe),
        rows: E().int().min(1).max(RNe),
        attachId: o().optional(),
        caps: u({
          imark: M().optional(),
          terminal: o().nullable(),
          mux: U(["tmux", "screen", "zellij"]).nullable(),
          ssh: M(),
          wheelFlood: M().optional(),
          hyperlinks: M().optional(),
          progressReporting: M().optional(),
          printsUnknownSequences: M().optional(),
          wtSession: M().optional(),
          isVscodeTerm: M().optional(),
          keyDialect: U(["st", "rxvt"])
            .nullable()
            .optional()
            .catch(void 0),
          browser: o().nullable().optional(),
          colorLevel: Ue([T(0), T(1), T(2), T(3)]).optional(),
          syncOutput: M().optional(),
          editor: o().nullable().optional(),
          systemTheme: U(["dark", "light"]).optional(),
          tmuxSocket: be()
            .refine(isAbsolute)
            .optional()
            .catch(void 0),
          sessionTabs: o()
            .regex(TABS_KEY_RE)
            .optional()
            .catch(void 0),
          cloudTabs: T(!0)
            .optional()
            .catch(void 0),
          tabsLanding: u({ why: U(ft), from: o().regex(SHORT_RE) })
            .optional()
            .catch(void 0),
        }).optional(),
        holdingFrame: M().optional(),
      }),
      u({
        proto: max,
        op: T("resize"),
        short: regex,
        cols: E().int().min(1).max(RNe),
        rows: E().int().min(1).max(RNe),
        attachId: o().optional(),
      }),
      u({ proto: max, op: T("ensure-spare"), cwd: o() }),
      u({
        proto: max,
        op: T("permission-response"),
        short: regex,
        requestId: o(),
        allow: M(),
        auth: o().optional(),
      }),
      u({ proto: max, op: T("respawn-stale"), short: regex }),
      u({ proto: max, op: T("shutdown"), reapWorkers: M().optional() }),
    ]);
  }),
  LeaseClientSchema = DoctorLazy(() =>
    u({
      label: o().max(64).refine(De),
      cwd: o().max(4096).refine(De).catch("(not shown)"),
      pid: E().int().positive().catch(0),
      cloudSessionId: o()
        .regex(CLOUD_SESSION_ID_RE)
        .optional()
        .catch(void 0),
    }),
  ),
  LeaseAcknowledgementSchema = DoctorLazy(() => u({ ok: T(!0), op: T("lease") })),
  bt = [
    "upgrade",
    "service_recall",
    "displaced",
    "yield",
    "shutdown_op",
    "idle_exit",
    "bg_manager_failed",
    "signal",
    "unknown",
  ],
  LeaseClosingNoticeSchema = DoctorLazy(() => u({ op: T("lease"), closing: U(bt) })),
  CLOUD_SESSION_LEASE_LABEL = "cloud session",
  DAEMON_LEASE_LABELS = ["cli-bg-dispatch", "claude agents", CLOUD_SESSION_LEASE_LABEL];

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
  m7s,
  RosterSchema,
};
