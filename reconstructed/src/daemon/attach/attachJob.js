/**
 * daemon/attach/attachJob.ts
 *
 * 2.1.316 新增：附加到后台会话的 PTY：转发输入输出、处理窗口大小、分离键与遥测；收集终端能力信息（mux、ssh、超链接等）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrr64ez0.js (12)
 * attribution: placement 12
 */
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { connect } from "net";
import {
  DAEMON_DETACH_APC,
  DAEMON_HINT_APC,
  BG_PROTO,
  extractInteractiveMarks,
  parseDetachMsg,
  CLOUD_SESSION_ID_RE,
} from "../../services/daemon/leaseProtocol.js";
import { readDaemonToken } from "../../services/daemon/paths.js";
import { recordAttachAttempt, updateAttachBeacon } from "../jobs/attachBeacon.js";
import { logEvent } from "../../services/analytics/index.js";
import { ye } from "../../utils/startupMarks.js";
import { fromEnumOpt, fromEnum } from "../../services/analytics/safeMetadata.js";
import { m5, ENt } from "../../services/daemon/sessionStatus.js";
import { createPrivateModeTracker } from "../../services/daemon/reapJobs.js";
import {
  enableExtendedKeysSequence,
  isProgressReportingAvailable,
  exitAltScreenSequence,
  STDIN_IDLE_REASSERT_MS,
  enterAltScreenSequence,
  isXtermJsTerminal,
  HX,
  detectMinimalTerminal,
  isSyncOutputKnownSupported,
} from "../../ink/terminal.js";
import { getPlatform } from "../../utils/platform.js";
import { isBackspaceCtrlBackspaceHere } from "../../ink/parse-keypress.js";
import {
  SHOW_CURSOR,
  HIDE_CURSOR,
  ESU,
  decreset,
  DISABLE_WIN32_INPUT_MODE,
  decset,
} from "../../ink/termio/dec.js";
import { isNativeCursorRequested } from "../../ink/nativeCursor.js";
import { Z6, $A } from "../../utils/sandbox/userNamespace.js";
import { errorMessage } from "../../utils/errors.js";
import { bgSupervisorStalledMessage } from "../../utils/fleetGates.js";
import { RESET_SCROLL_REGION, ERASE_SCREEN, CURSOR_HOME } from "../../ink/termio/csi.js";
import { CLEAR_PROGRESS } from "../../ink/termio/osc.js";
import { setRawModeSafe } from "../../ink/setRawModeSafe.js";
import { ENORESPONSE, IHt, classifyAttachError, tr, ATTACH_ERROR_CODES } from "../jobs/attachErrors.js";
import { controlRequest } from "../../services/daemon/controlClient.js";
import { createTerminalReplyFilter, uB } from "../../services/daemon/spawnLauncher.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { env } from "../../utils/env.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";
import { sequential } from "../../utils/sequential.js";
import { getSystemTheme } from "../../utils/systemTheme.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_3, create_15, create_2 } from "../../../vendor/zod/lib/index.mjs";

/**
 * 分离快捷键相关的字节常量。
 */
//@ chunk-vrr64ez0.js:10911-11318 placement
var DETACH_KEYS = 2,
  cn = 26,
  ln = 100,
  rr = 8,
  buffer = Buffer.from([127]),
  un = 98,
  fn = 122,
  buffer_2 = Buffer.from("\x1B[27;5;98~", "latin1"),
  buffer_3 = Buffer.from("\x1B[27;5;122~", "latin1"),
  buffer_4 = Buffer.from("\x1B[27u", "latin1"),
  buffer_5 = Buffer.from("\x1B[27;1u", "latin1"),
  dr = 3,
  cr = 99,
  buffer_6 = Buffer.from("\x1B[27;5;99~", "latin1"),
  buffer_7 = Buffer.from(DAEMON_DETACH_APC, "ascii"),
  buffer_8 = Buffer.from(DAEMON_HINT_APC, "ascii"),
  buffer_9 = Buffer.from("\x1B_cc-d", "ascii"),
  buffer_10 = Buffer.from("\x1B[?9001", "ascii"),
  ur = 100;
//@ chunk-vrr64ez0.js:11318-11407 placement = hasPrefix (1)
function hasPrefix(e, n, o) {
  return e.length - n >= o.length && e.compare(o, 0, o.length, n, n + o.length) === 0;
}
/**
 * 匹配 CSI 形式的按键序列。
 */
//@ chunk-vrr64ez0.js:11407-11748 placement
function matchCsiKey(e, n, o) {
  if (e[n] !== 27 || e[n + 1] !== 91) return 0;
  let r = n + 2,
    u = () => {
      let w = -1;
      for (let T = 0; T < 8 && r < e.length; T++) {
        let S = e[r];
        if (S < 48 || S > 57) break;
        ((w = (w < 0 ? 0 : w) * 10 + (S - 48)), r++);
      }
      return w;
    },
    s = u();
  if (s < 0) return 0;
  let h = -1;
  if (e[r] === 58) {
    if ((r++, u(), e[r] === 58)) (r++, (h = u()));
  }
  if (e[r] !== 59 || e[r + 1] !== 53 || e[r + 2] !== 117) return 0;
  return (s > 127 && h >= 0 ? h : s) === o ? r + 3 - n : 0;
}
//@ chunk-vrr64ez0.js:11748-11907 placement
function suffixPrefixOverlap(e, n) {
  let min = Math.min(e.length, n.length - 1);
  e: for (let r = min; r > 0; r--) {
    let u = e.length - r;
    for (let s = 0; s < r; s++) if (e[u + s] !== n[s]) continue e;
    return r;
  }
  return 0;
}
//@ chunk-vrr64ez0.js:11907-11929 placement
var alloc = Buffer.alloc(0);
/**
 * 在输入字节中查找分离键。
 */
//@ chunk-vrr64ez0.js:11929-12251 placement
function scanForDetachKey(e, n) {
  for (let o = 0; o < e.length; o++) {
    let r = e[o];
    if (n) {
      if (((n = !1), r === ln)) return { matched: !0, prefixArmed: !1 };
      continue;
    }
    if (
      r === cn ||
      r === dr ||
      matchCsiKey(e, o, fn) ||
      hasPrefix(e, o, buffer_3) ||
      matchCsiKey(e, o, cr) ||
      hasPrefix(e, o, buffer_6)
    )
      return { matched: !0, prefixArmed: !1 };
    let u =
      r === DETACH_KEYS ? 1 : matchCsiKey(e, o, un) || (hasPrefix(e, o, buffer_2) ? buffer_2.length : 0);
    if (u) ((o += u - 1), (n = !0));
  }
  return { matched: !1, prefixArmed: n };
}
/**
 * 等待用户按下分离键。
 */
//@ chunk-vrr64ez0.js:12251-12610 placement
function waitForDetachKey(e) {
  let n = !1,
    o = !1,
    r,
    promise = new Promise((h) => {
      r = h;
    }),
    s = () => {
      if (n) return;
      let h;
      while ((h = e.read()) !== null) {
        let A = typeof h === "string" ? Buffer.from(h, "utf8") : h,
          w = scanForDetachKey(A, o);
        if (((o = w.prefixArmed), w.matched)) {
          ((n = !0), r());
          return;
        }
      }
    };
  if ((e.on("readable", s), "resume" in e && "pause" in e)) (e.resume(), e.pause());
  return (
    s(),
    {
      promise: promise,
      cancel: () => {
        ((n = !0), e.removeListener("readable", s));
      },
    }
  );
}
//@ chunk-vrr64ez0.js:12610-12650 placement
function containsInterruptKey(e) {
  return scanForDetachKey(e, !1).matched;
}
/**
 * 附加到后台会话的 PTY：转发输入输出、处理窗口大小、分离键与遥测。
 */
//@ chunk-vrr64ez0.js:12650-25318 placement
async function attachToJob(e, n = {}) {
  let o = n.stdin ?? process.stdin,
    r = n.stdout ?? process.stdout,
    u = "columns" in r ? r.columns || 120 : 120,
    s = "rows" in r ? r.rows || 30 : 30,
    h = u,
    A = s,
    w = randomUUID(),
    T = await readDaemonToken(),
    now = Date.now(),
    startTime = performance.now(),
    N = n.telemetry?.t0,
    U =
      N !== void 0 && Number.isFinite(N) && N >= 0 && N <= startTime && startTime - N < 86400000
        ? N
        : startTime;
  if (n.telemetry?.gestureId !== void 0)
    recordAttachAttempt(n.telemetry.gestureId, n.telemetry.attempt, n.telemetry.storageV5);
  let j,
    C,
    q,
    Q,
    K,
    D = alloc,
    P = n.telemetry?.interactive?.reached,
    _e = !1,
    De,
    be = setTimeout(
      () => {
        if (P === void 0 && (j === void 0 || C === void 0)) ((_e = !0), (De = performance.now() - U));
      },
      Math.max(0, 30000 - (startTime - U)),
    ),
    Ce = !1,
    ee,
    W,
    ce,
    Ne,
    we,
    Fe,
    Ee,
    Le,
    ie,
    ue = !1,
    pe;
  function qe(B) {
    let R = Date.now() - now;
    if (B && pe === void 0) pe = R;
    if (ue) return;
    ((ue = !0),
      (Ce = !B),
      logEvent("tengu_bg_attach_first_frame", {
        ms: R,
        meaningful_ms: pe,
        ack_ms: ee,
        gesture_id: ye(n.telemetry?.gestureId),
        attempt: n.telemetry?.attempt,
        via: fromEnumOpt(W),
        tempo: fromEnumOpt(Ne),
        stale: Fe,
        state: m5(we),
        cached: Le,
      }));
  }
  let Ve,
    promise = new Promise((B) => {
      Ve = B;
    }),
    V = !1,
    re = !1,
    ae,
    X = !1,
    oe,
    Pt = u,
    It = s,
    ze = createPrivateModeTracker(),
    Dt = () =>
      enableExtendedKeysSequence({
        legacyKitty:
          Ee !==
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION,
      }),
    Pn = getPlatform() === "windows" && !isBackspaceCtrlBackspaceHere(),
    In = n.holdScreenOnDisconnect && getPlatform() === "windows" ? !0 : "isRaw" in o ? Boolean(o.isRaw) : !1,
    pt = getPlatform() === "windows",
    buffer_6 = Buffer.from(SHOW_CURSOR, "ascii"),
    buffer_11 = Buffer.from(HIDE_CURSOR, "ascii"),
    Nt = pt && isNativeCursorRequested(),
    Ft = !1,
    ht,
    se;
  try {
    se = connect(Z6());
  } catch (error) {
    let R = n.telemetry?.interactive?.reached,
      E =
        typeof n.telemetry?.interactive?.marksExpected === "boolean"
          ? n.telemetry.interactive.marksExpected
          : void 0;
    return (
      logEvent("tengu_bg_attach_outcome", {
        outcome: fromEnum("error"),
        got_ack: !1,
        got_first_frame: !1,
        ms: Date.now() - now,
        apc_detach: !1,
        failure_class: fromEnum("connect_throw"),
        gesture_id: ye(n.telemetry?.gestureId),
        attempt: n.telemetry?.attempt,
        surface: fromEnumOpt(n.telemetry?.surface),
        daemon_booted: n.telemetry?.daemonBooted,
        attach_ms: R !== void 0 ? R.attachMs : E === !0 ? Math.round(performance.now() - U) : void 0,
        content_paint_ms: R !== void 0 ? Math.round(R.contentPaintMs) : void 0,
        prompt_idle_ms: R !== void 0 ? Math.round(R.promptIdleMs) : void 0,
        msgs_loaded: R?.msgsLoaded,
        msgs_in_jsonl: R?.msgsInJsonl,
        msgs_rendered_at_first_paint: R?.msgsRenderedAtFirstPaint,
        first_frame_kind: fromEnumOpt(R !== void 0 ? "real" : void 0),
        marks_expected: R !== void 0 ? !0 : E,
        attach_censored: R === void 0 && E === !0 ? !0 : void 0,
        via: fromEnumOpt(n.telemetry?.interactive?.via),
        attach_cold: n.telemetry?.interactive?.attachCold,
      }),
      clearTimeout(be),
      { outcome: "error", msg: $A(errorMessage(error)) }
    );
  }
  se.setTimeout(1e4, () => {
    if (!re) ne("error", bgSupervisorStalledMessage(), { failureClass: "ack_timeout" });
  });
  function ne(B, R, E) {
    if (V) return;
    let { viaApc: viaApc, beforeFirstFrame: beforeFirstFrame, failureClass: failureClass } = E ?? {};
    ((V = !0), clearTimeout(ht), clearTimeout(be), clearTimeout(ae));
    let rounded = Math.round(performance.now() - U),
      x = j !== void 0 && C !== void 0 ? Math.round(Math.max(j, C)) : void 0,
      H = ie !== void 0 || n.telemetry?.interactive?.marksExpected === !0,
      G = P === void 0 && H && _e && x === void 0,
      ke = P === void 0 && H && !G && x === void 0,
      Ln = P !== void 0 ? P.attachMs : G ? Math.round(De ?? rounded) : ke ? rounded : x,
      $n =
        P !== void 0
          ? "real"
          : x !== void 0
            ? "real"
            : ue
              ? Ce && pe === void 0
                ? "dimhint"
                : "unknown"
              : void 0;
    if (
      (logEvent("tengu_bg_attach_outcome", {
        outcome: fromEnum(B),
        got_ack: re,
        got_first_frame: ue,
        ms: Date.now() - now,
        gesture_id: ye(n.telemetry?.gestureId),
        attempt: n.telemetry?.attempt,
        via: fromEnumOpt(n.telemetry?.interactive?.via ?? W),
        tempo: fromEnumOpt(Ne),
        apc_detach: viaApc === !0,
        failure_class: fromEnumOpt(failureClass),
        state: m5(we),
        cached: Le,
        meaningful_ms: pe,
        input_accepted_ms: Ye,
        input_delivered_ms: Ye,
        keys_dropped: $t,
        attach_ms: Ln,
        content_paint_ms: P !== void 0 ? Math.round(P.contentPaintMs) : j !== void 0 ? Math.round(j) : void 0,
        prompt_idle_ms: P !== void 0 ? Math.round(P.promptIdleMs) : C !== void 0 ? Math.round(C) : void 0,
        timed_out: G,
        attach_censored: ke,
        marks_expected:
          P !== void 0 ? !0 : re || typeof n.telemetry?.interactive?.marksExpected === "boolean" ? H : void 0,
        attach_cold:
          n.telemetry?.interactive?.attachCold ?? (W !== void 0 ? W === "cold" && (ce ?? !0) : void 0),
        daemon_booted: n.telemetry?.daemonBooted,
        surface: fromEnumOpt(n.telemetry?.surface),
        first_frame_kind: fromEnumOpt($n),
        msgs_loaded: P?.msgsLoaded ?? q,
        msgs_in_jsonl: P?.msgsInJsonl ?? Q,
        msgs_rendered_at_first_paint: P?.msgsRenderedAtFirstPaint ?? K,
      }),
      re)
    ) {
      let Wn = n.alreadyInAlt || (B === "disconnected" && n.holdScreenOnDisconnect);
      r.write(
        ESU +
          ze.snapshot().map(decreset).reverse().join("") +
          SHOW_CURSOR +
          (getPlatform() === "windows" ? DISABLE_WIN32_INPUT_MODE : "") +
          "\x1B[0m\x1B7" +
          RESET_SCROLL_REGION +
          "\x1B8" +
          (isProgressReportingAvailable() ? CLEAR_PROGRESS : "") +
          (Wn ? "" : exitAltScreenSequence()),
      );
    }
    if (!In) setRawModeSafe(o, !1);
    if ((o.removeListener("readable", _t), o.removeListener("end", Wt), "removeListener" in r))
      r.removeListener("resize", gt);
    (clearTimeout(oe),
      se.destroy(),
      Ve({ outcome: B, msg: R, viaApc: viaApc, beforeFirstFrame: beforeFirstFrame }));
  }
  function Dn() {
    ne("error", `${ENORESPONSE}: ${IHt}`, { failureClass: "no_response" });
  }
  function gt() {
    if (V) return;
    if (oe === void 0) ((Pt = h), (It = A));
    ((h = "columns" in r ? r.columns || u : u),
      (A = "rows" in r ? r.rows || s : s),
      clearTimeout(oe),
      (oe = setTimeout(() => {
        if (((oe = void 0), V)) return;
        if (h < Pt || A < It) r.write(ERASE_SCREEN + CURSOR_HOME);
        (Lt(), controlRequest({ proto: BG_PROTO, op: "resize", short: e, cols: h, rows: A, attachId: w }));
      }, 50)));
  }
  let startTime_2 = performance.now();
  function Lt() {
    let snapshot = ze.snapshot();
    if (!snapshot.includes(1004)) return;
    r.write(Dt() + snapshot.map(decset).join(""));
  }
  let Ut = n.gateStdinUntilFirstFrame === !0 && "isTTY" in o && o.isTTY === !0,
    Ye,
    $t = 0,
    Nn = createTerminalReplyFilter();
  function Re(B) {
    let R = () => Nn(B.toString("latin1"));
    if (!Ut || ue) {
      if (Ye === void 0 && !R()) Ye = Date.now() - now;
      se.write(B);
    } else if (!R()) $t++;
  }
  function Fn(B) {
    if (V) return;
    let R = typeof B === "string" ? Buffer.from(B, "utf8") : B,
      E = 0;
    for (let M = 0; M < R.length; M++) {
      let y = R[M];
      if (X) {
        if (((X = !1), M > E)) Re(R.subarray(E, M));
        if (y === ln) return ne("detached");
        (Re(Buffer.from([DETACH_KEYS, y])), (E = M + 1));
        continue;
      }
      if (
        Ut &&
        !ue &&
        ((y === 27 && R.length === 1) || hasPrefix(R, M, buffer_4) || hasPrefix(R, M, buffer_5))
      )
        return ne("detached", void 0, { beforeFirstFrame: !0 });
      if (y === cn || matchCsiKey(R, M, fn) || hasPrefix(R, M, buffer_3)) {
        if (M > E) Re(R.subarray(E, M));
        return ne("detached");
      }
      if (Pn && y === rr) {
        if (M > E) Re(R.subarray(E, M));
        (Re(buffer), (E = M + 1));
        continue;
      }
      let L =
        y === DETACH_KEYS ? 1 : matchCsiKey(R, M, un) || (hasPrefix(R, M, buffer_2) ? buffer_2.length : 0);
      if (L) {
        if (M > E) Re(R.subarray(E, M));
        ((M += L - 1), (E = M + 1), (X = !0));
      }
    }
    if (E < R.length) Re(R.subarray(E));
  }
  function _t() {
    let startTime = performance.now();
    if (startTime - startTime_2 > STDIN_IDLE_REASSERT_MS) Lt();
    startTime_2 = startTime;
    let R;
    while ((R = o.read()) !== null) Fn(R);
  }
  function Wt() {
    ne("detached");
  }
  let Ue = alloc,
    Xe = alloc,
    Pe = alloc,
    Ae = alloc;
  function Jt(B) {
    if (!pt) return B;
    let R = Pe.length > 0,
      E = R ? Buffer.concat([Pe, B]) : B;
    if (R) Pe = alloc;
    if (Nt) {
      let index = E.lastIndexOf(buffer_6),
        index_2 = E.lastIndexOf(buffer_11);
      if (index !== index_2) Ft = index > index_2;
    }
    let index = E.indexOf(buffer_6);
    if (index < 0) {
      let G = suffixPrefixOverlap(E, buffer_6);
      if (G === 0) return E;
      return ((Pe = Buffer.from(E.subarray(E.length - G))), E.subarray(0, E.length - G));
    }
    let y = [],
      L = 0,
      F = index;
    for (;;) {
      if (F > L) y.push(E.subarray(L, F));
      if (((L = F + buffer_6.length), (F = E.indexOf(buffer_6, L)), F < 0)) break;
    }
    let chunk = E.subarray(L),
      H = suffixPrefixOverlap(chunk, buffer_6);
    if (H > 0) Pe = Buffer.from(chunk.subarray(chunk.length - H));
    if (chunk.length > H) y.push(chunk.subarray(0, chunk.length - H));
    if (y.length === 0) return alloc;
    if (y.length === 1) return y[0];
    return Buffer.concat(y);
  }
  function Ht(B) {
    let R = Ae.length > 0,
      E = R ? Buffer.concat([Ae, B]) : B;
    if (R) Ae = alloc;
    let index = E.indexOf(buffer_10);
    if (index < 0) {
      let x = suffixPrefixOverlap(E, buffer_10);
      if (x === 0) return E;
      return ((Ae = Buffer.from(E.subarray(E.length - x))), E.subarray(0, E.length - x));
    }
    let y = [],
      L = 0,
      F = index;
    while (F >= 0) {
      let x = F + buffer_10.length;
      if (x >= E.length) {
        if (F > L) y.push(E.subarray(L, F));
        ((Ae = Buffer.from(E.subarray(F))), (L = E.length));
        break;
      }
      let H = E[x];
      if (H === 104 || H === 108) {
        if (F > L) y.push(E.subarray(L, F));
        L = x + 1;
      }
      F = E.indexOf(buffer_10, Math.max(L, F + 1));
    }
    if (L < E.length) {
      let chunk = E.subarray(L),
        H = suffixPrefixOverlap(chunk, buffer_10);
      if (H > 0) Ae = Buffer.from(chunk.subarray(chunk.length - H));
      if (chunk.length > H) y.push(chunk.subarray(0, chunk.length - H));
    }
    if (y.length === 0) return alloc;
    if (y.length === 1) return y[0];
    return Buffer.concat(y);
  }
  let Gt = n.alreadyInAlt && !n.holdingFrame;
  function Kt(B) {
    let { out: out, meaningful: meaningful, renders: renders } = jn(B);
    if (out.length === 0) return;
    if (!renders) {
      r.write(out);
      return;
    }
    if (Gt) ((Gt = !1), r.write(ERASE_SCREEN + CURSOR_HOME));
    (r.write(out),
      ze.feed(out.toString("latin1"), (y) => {
        if (y === 1004) {
          let L = Dt();
          if (L) r.write(L);
        }
      }),
      qe(meaningful));
  }
  let Qe = alloc,
    et = !1,
    Me = !1,
    bt = !1;
  function qt(B) {
    let R = !1,
      E = 0;
    if (bt) {
      if (((bt = !1), (Me = !1), B[0] === 92)) E = 1;
    }
    while (E < B.length) {
      if (Me) {
        let y = E;
        while (y < B.length && B[y] !== 27 && B[y] !== 24 && B[y] !== 26) y++;
        if (y >= B.length) return R;
        if (B[y] !== 27) {
          ((Me = !1), (E = y + 1));
          continue;
        }
        if (y === B.length - 1) return ((bt = !0), R);
        if (B[y + 1] === 92) {
          ((Me = !1), (E = y + 2));
          continue;
        }
        ((Me = !1), (E = y));
        continue;
      }
      let index = B.indexOf(buffer_9, E);
      if (index < 0) return !0;
      ((R ||= index > E), (Me = !0), (E = index + buffer_9.length));
    }
    return R;
  }
  function jn(B) {
    let R = Qe.length > 0 ? Buffer.concat([Qe, B]) : B;
    Qe = alloc;
    let E = !1,
      M = !1,
      y = [],
      L = 0;
    for (;;) {
      let index = R.indexOf(buffer_8, L);
      if (index < 0) break;
      if (index > L) {
        let chunk = R.subarray(L, index);
        if ((y.push(chunk), !et)) E = qt(chunk) || E;
        else M = !0;
      }
      ((et = !et), (L = index + buffer_8.length));
    }
    let chunk = R.subarray(L),
      x = suffixPrefixOverlap(chunk, buffer_8);
    if (x > 0)
      ((Qe = Buffer.from(chunk.subarray(chunk.length - x))), (chunk = chunk.subarray(0, chunk.length - x)));
    if (chunk.length > 0)
      if ((y.push(chunk), !et)) E = qt(chunk) || E;
      else M = !0;
    return {
      out: y.length === 0 ? alloc : y.length === 1 ? y[0] : Buffer.concat(y),
      meaningful: E,
      renders: E || M,
    };
  }
  function Vt(B) {
    if (V) return;
    let R = ie !== void 0 && P === void 0 && (j === void 0 || C === void 0),
      E = extractInteractiveMarks(D, B, { requireNonce: ie });
    D = E.carry;
    let cleaned = E.cleaned;
    if (R)
      for (let mark of E.marks) {
        let H = performance.now() - U;
        if (mark.kind === "content_paint" && j === void 0)
          ((j = H), (q = mark.msgsLoaded), (Q = mark.msgsInJsonl), (K = mark.msgsRenderedAtFirstPaint));
        else if (mark.kind === "prompt_idle" && C === void 0) C = H;
        if (j !== void 0 && C !== void 0) {
          clearTimeout(be);
          let rounded = Math.round(Math.max(j, C));
          if (n.telemetry?.interactive !== void 0)
            n.telemetry.interactive.reached = {
              attachMs: rounded,
              contentPaintMs: j,
              promptIdleMs: C,
              msgsLoaded: q,
              msgsInJsonl: Q,
              msgsRenderedAtFirstPaint: K,
            };
          if (n.telemetry?.gestureId !== void 0)
            updateAttachBeacon(
              n.telemetry.gestureId,
              {
                interactiveReached: !0,
                attachMs: rounded,
                msgsLoaded: q,
                msgsInJsonl: Q,
                msgsRenderedAtFirstPaint: K,
              },
              n.telemetry.storageV5,
            );
        }
      }
    let y = Xe.length > 0 ? Buffer.concat([Xe, cleaned]) : cleaned,
      index = y.indexOf(buffer_7);
    if (index >= 0) {
      let chunk = y.subarray(0, index);
      if (index > 0) {
        let G = Ht(Jt(chunk));
        if (G.length > 0) Kt(G);
      }
      ((Xe = alloc), (Pe = alloc), (Ae = alloc));
      let H = parseDetachMsg(chunk);
      return ne("detached", H, { viaApc: !0, failureClass: classifyAttachError(H) });
    }
    let F = suffixPrefixOverlap(y, buffer_7);
    if (y.length > F) {
      let chunk = y.subarray(0, y.length - F),
        H = Ht(Jt(chunk));
      if (H.length > 0) Kt(H);
    }
    if (((Xe = F > 0 ? Buffer.from(y.subarray(y.length - F)) : alloc), Nt))
      (clearTimeout(ht),
        (ht = setTimeout(() => {
          if (!V && Ft) r.write(SHOW_CURSOR);
        }, ur)));
  }
  return (
    se.on("data", (B) => {
      if (V) return;
      if (re) {
        (clearTimeout(ae), Vt(B));
        return;
      }
      Ue = Buffer.concat([Ue, B]);
      let index = Ue.indexOf(10);
      if (index < 0) return;
      let str = Ue.subarray(0, index).toString("utf8"),
        chunk = Ue.subarray(index + 1),
        y;
      try {
        y = jsonParse(str);
      } catch (error) {
        return ne("error", `bad ack: ${errorMessage(error)}`, { failureClass: "bad_ack" });
      }
      if (typeof y !== "object" || y === null)
        return ne("error", "bad ack: non-object ack line", { failureClass: "bad_ack" });
      if (!y.ok) return ne("error", `${y.code}: ${y.error}`, { failureClass: tr(y.code) });
      if (((re = !0), se.setTimeout(0), !n.holdingFrame && chunk.length === 0))
        ae = setTimeout(Dn, ATTACH_ERROR_CODES);
      if (
        ((ee = Date.now() - now),
        (W = y.op === "attach" ? ENt(y.via) : void 0),
        (ce = y.op === "attach" && typeof y.booting === "boolean" ? y.booting : void 0),
        (ie = y.op === "attach" && typeof y.imarkNonce === "string" ? y.imarkNonce : void 0),
        n.telemetry?.gestureId !== void 0)
      )
        updateAttachBeacon(
          n.telemetry.gestureId,
          {
            marksExpected: ie !== void 0,
            daemonBooted: typeof n.telemetry.daemonBooted === "boolean" ? n.telemetry.daemonBooted : void 0,
            attachCold: W !== void 0 ? W === "cold" && (ce ?? !0) : void 0,
            via: W,
          },
          n.telemetry.storageV5,
        );
      if (n.telemetry?.interactive !== void 0) {
        if (
          ((n.telemetry.interactive.marksExpected =
            n.telemetry.interactive.marksExpected === !0 || ie !== void 0),
          W !== void 0 && n.telemetry.interactive.reached === void 0)
        )
          ((n.telemetry.interactive.attachCold = W === "cold" && (ce ?? !0)),
            (n.telemetry.interactive.via = W));
      }
      if (
        ((Ne = y.op === "attach" ? y.tempo : void 0),
        (we = y.op === "attach" ? y.state : void 0),
        (Fe = y.op === "attach" ? y.stale : void 0),
        (Ee = y.op === "attach" ? y.workerCliVersion : void 0),
        (Le = y.op === "attach" ? y.cached : void 0),
        env.TMUX && !uB().tmuxRgbApplied)
      )
        ((uB().tmuxRgbApplied = !0), execFileNoThrow("tmux", ["set", "-as", "terminal-features", ",*:RGB"]));
      let joined = ((y.op === "attach" ? y.decModes : void 0) ?? []).map(decset).join("");
      if ((ze.feed(joined), "ref" in o)) o.ref();
      setRawModeSafe(o, !0);
      let x =
        Ee !==
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION;
      if (
        (r.write(
          n.alreadyInAlt
            ? HIDE_CURSOR + enableExtendedKeysSequence({ legacyKitty: x }) + joined
            : enterAltScreenSequence({ legacyKitty: x }) +
                joined +
                (pt ? HIDE_CURSOR : "") +
                `
  \x1B[2mAttaching\u2026\x1B[0m
`,
        ),
        "on" in r)
      )
        r.on("resize", gt);
      if (("columns" in r && (r.columns || u) !== u) || ("rows" in r && (r.rows || s) !== s)) gt();
      if ((o.on("readable", _t), "resume" in o && "pause" in o)) (o.resume(), o.pause());
      if ((o.once("end", Wt), _t(), chunk.length)) Vt(chunk);
    }),
    se.on("error", (B) => ne("error", $A(errorMessage(B)), { failureClass: "socket_error" })),
    se.once("close", () => {
      if (!V) ne(re ? "disconnected" : "error", "control socket closed", { failureClass: "socket_closed" });
    }),
    se.once("connect", () => {
      se.write(
        jsonStringify({
          proto: BG_PROTO,
          op: "attach",
          short: e,
          auth: T,
          cols: u,
          rows: s,
          attachId: w,
          caps: {
            ...terminalCapabilities(),
            ...(n.sessionTabs !== void 0 && {
              sessionTabs: n.sessionTabs,
              ...(n.cloudTabs === !0 && { cloudTabs: !0 }),
              ...(n.tabsLanding && { tabsLanding: n.tabsLanding }),
            }),
          },
          ...(n.holdingFrame && { holdingFrame: !0 }),
        }) +
          `
`,
      );
    }),
    promise
  );
}
/**
 * 收集终端能力信息（mux、ssh、超链接等）。
 */
//@ chunk-vrr64ez0.js:25318-25777 placement
function terminalCapabilities() {
  return {
    imark: !0,
    terminal: env.terminal,
    mux: env.TMUX ? "tmux" : process.env.ZELLIJ != null ? "zellij" : env.STY ? "screen" : null,
    ssh: env.isSSH(),
    wheelFlood: isXtermJsTerminal(),
    hyperlinks: supportsHyperlinks(),
    progressReporting: isProgressReportingAvailable(),
    printsUnknownSequences: HX(),
    wtSession: !!env.WT_SESSION,
    isVscodeTerm: env.TERM_PROGRAM === "vscode",
    keyDialect: detectMinimalTerminal(env.TERM),
    browser: env.BROWSER ?? null,
    colorLevel: sequential.level,
    syncOutput: isSyncOutputKnownSupported(),
    editor: env.VISUAL || env.EDITOR || null,
    systemTheme: getSystemTheme(),
    ...(env.TMUX && { tmuxSocket: firstLineOf(env.TMUX, ",") }),
  };
}
//@ chunk-vrr64ez0.js:25777-25863 placement
function parseSwitchTarget(e) {
  return CLOUD_SESSION_ID_RE.test(e) ? { kind: "cloud", sessionId: e } : { kind: "switch", short: e };
}
/**
 * 后台作业接管记录相关常量（时间、7 天保留期、上限）与 schema：写入时间与 shell 列表（pid、进程启动标记）。
 */
//@ chunk-vrr64ez0.js:26163-26354 placement
var ADOPT_RECORD_SCHEMA_BASE = 250,
  ADOPT_RECORD_MAX_AGE_MS = 604800000,
  yr = 256,
  adoptRecordSchema = DoctorLazy(() =>
    create({
      writtenAtMs: create_3().optional(),
      shells: create_15(
        create({
          pid: create_3().int().positive(),
          procStart: create_2().optional(),
          startTimeTicks: create_3().int().optional(),
        }),
      ).catch([]),
    }),
  );

export {
  parseSwitchTarget,
  attachToJob,
  containsInterruptKey,
  waitForDetachKey,
  ADOPT_RECORD_SCHEMA_BASE,
  adoptRecordSchema,
  ADOPT_RECORD_MAX_AGE_MS,
  yr,
};
