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
import { randomUUID } from "crypto";
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
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { fromEnumOpt, fromEnum } from "../../services/analytics/safeMetadata.js";
import { daemonSessionStateLabel, normalizeDaemonSessionState } from "../../services/daemon/sessionStatus.js";
import { createPrivateModeTracker } from "../../services/daemon/reapJobs.js";
import {
  enableExtendedKeysSequence,
  isProgressReportingAvailable,
  exitAltScreenSequence,
  STDIN_IDLE_REASSERT_MS,
  enterAltScreenSequence,
  isXtermJsTerminal,
  hasUnknownSequencePrintingBug,
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
import { daemonControlSocket, redactDaemonPipeKey } from "../../utils/sandbox/userNamespace.js";
import { errorMessage } from "../../utils/errors.js";
import { bgSupervisorStalledMessage } from "../../utils/fleetGates.js";
import { RESET_SCROLL_REGION, ERASE_SCREEN, CURSOR_HOME } from "../../ink/termio/csi.js";
import { CLEAR_PROGRESS } from "../../ink/termio/osc.js";
import { setRawModeSafe } from "../../ink/setRawModeSafe.js";
import {
  ENORESPONSE,
  SESSION_NOT_RESPONDING_TEXT,
  classifyAttachError,
  attachErrorCode,
  ATTACH_ERROR_CODES_2,
} from "../jobs/attachErrors.js";
import { controlRequest } from "../../services/daemon/controlClient.js";
import { createTerminalReplyFilter, getSpawnLauncherState } from "../../services/daemon/spawnLauncher.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { env } from "../../utils/env.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";
import { sequential } from "../../utils/sequential.js";
import { getSystemTheme } from "../../utils/systemTheme.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_3, create_15, create_2 } from "../../../vendor/zod/lib/index.mjs";

//@ chunk-vrr64ez0.js:10911-11318 placement
/**
 * 分离快捷键相关的字节常量。
 */
var DETACH_KEYS = 2;
var CTRL_Z_BYTE = 26;
var DETACH_BYTE_NL = 100;
var BACKSPACE_DETACH_BYTE = 8;
var buffer = Buffer.from([127]);
var DETACH_LETTER_B = 98;
var DETACH_LETTER_Z = 122;
var buffer_2 = Buffer.from("\x1B[27;5;98~", "latin1");
var buffer_3 = Buffer.from("\x1B[27;5;122~", "latin1");
var buffer_4 = Buffer.from("\x1B[27u", "latin1");
var buffer_5 = Buffer.from("\x1B[27;1u", "latin1");
var CTRL_C_BYTE = 3;
var DETACH_LETTER_C = 99;
var buffer_6 = Buffer.from("\x1B[27;5;99~", "latin1");
var buffer_7 = Buffer.from(DAEMON_DETACH_APC, "ascii");
var buffer_8 = Buffer.from(DAEMON_HINT_APC, "ascii");
var buffer_9 = Buffer.from("\x1B_cc-d", "ascii");
var buffer_10 = Buffer.from("\x1B[?9001", "ascii");
var CURSOR_HIDE_DELAY_MS = 100;
//@ chunk-vrr64ez0.js:11318-11407 placement = hasPrefix (1)
function hasPrefix(src, n, o) {
  return src.length - n >= o.length && src.compare(o, 0, o.length, n, n + o.length) === 0;
}
//@ chunk-vrr64ez0.js:11407-11748 placement
/**
 * 匹配 CSI 形式的按键序列。
 */
function matchCsiKey(e, n, o) {
  if (e[n] !== 27 || e[n + 1] !== 91) return 0;
  let r = n + 2;
  let u = () => {
    let w = -1;
    for (let j = 0; j < 8 && r < e.length; j++) {
      let S = e[r];
      if (S < 48 || S > 57) break;
      w = (w < 0 ? 0 : w) * 10 + (S - 48);
      r++;
    }
    return w;
  };
  let s = u();
  if (s < 0) return 0;
  let h = -1;
  if (e[r] === 58) {
    r++;
    u();
    if (e[r] === 58) {
      r++;
      h = u();
    }
  }
  if (e[r] !== 59 || e[r + 1] !== 53 || e[r + 2] !== 117) return 0;
  return (s > 127 && h >= 0 ? h : s) === o ? r + 3 - n : 0;
}
//@ chunk-vrr64ez0.js:11748-11907 placement
function suffixPrefixOverlap(e, n) {
  let min = Math.min(e.length, n.length - 1);
  e: for (let r = min; r > 0; r--) {
    let u = e.length - r;
    for (let j = 0; j < r; j++) if (e[u + j] !== n[j]) continue e;
    return r;
  }
  return 0;
}
//@ chunk-vrr64ez0.js:11907-11929 placement
var Z = Buffer.alloc(0);
//@ chunk-vrr64ez0.js:11929-12251 placement
/**
 * 在输入字节中查找分离键。
 */
function scanForDetachKey(e, n) {
  for (let j = 0; j < e.length; j++) {
    let r = e[j];
    if (n) {
      n = false;
      if (r === DETACH_BYTE_NL)
        return {
          matched: true,
          prefixArmed: false,
        };
      continue;
    }
    if (
      r === CTRL_Z_BYTE ||
      r === CTRL_C_BYTE ||
      matchCsiKey(e, j, DETACH_LETTER_Z) ||
      hasPrefix(e, j, buffer_3) ||
      matchCsiKey(e, j, DETACH_LETTER_C) ||
      hasPrefix(e, j, buffer_6)
    )
      return {
        matched: true,
        prefixArmed: false,
      };
    let u =
      r === DETACH_KEYS
        ? 1
        : matchCsiKey(e, j, DETACH_LETTER_B) || (hasPrefix(e, j, buffer_2) ? buffer_2.length : 0);
    if (u) {
      j += u - 1;
      n = true;
    }
  }
  return {
    matched: false,
    prefixArmed: n,
  };
}
//@ chunk-vrr64ez0.js:12251-12610 placement
/**
 * 等待用户按下分离键。
 */
function waitForDetachKey(stdin) {
  let n = false;
  let o = false;
  let r;
  let promise = new Promise((resolve) => {
    r = resolve;
  });
  let s = () => {
    if (n) return;
    let h;
    while ((h = stdin.read()) !== null) {
      let A = typeof h === "string" ? Buffer.from(h, "utf8") : h;
      let w = scanForDetachKey(A, o);
      o = w.prefixArmed;
      if (w.matched) {
        n = true;
        r();
        return;
      }
    }
  };
  stdin.on("readable", s);
  if ("resume" in stdin && "pause" in stdin) {
    stdin.resume();
    stdin.pause();
  }
  s();
  return {
    promise,
    cancel: () => {
      n = true;
      stdin.removeListener("readable", s);
    },
  };
}
//@ chunk-vrr64ez0.js:12610-12650 placement
function containsInterruptKey(e) {
  return scanForDetachKey(e, false).matched;
}
//@ chunk-vrr64ez0.js:12650-25318 placement
/**
 * 附加到后台会话的 PTY：转发输入输出、处理窗口大小、分离键与遥测。
 */
async function attachToJob(short, n = {}) {
  let stdin = n.stdin ?? process.stdin;
  let stdout = n.stdout ?? process.stdout;
  let u = "columns" in stdout ? stdout.columns || 120 : 120;
  let s = "rows" in stdout ? stdout.rows || 30 : 30;
  let h = u;
  let A = s;
  let attachId = randomUUID();
  let auth = await readDaemonToken();
  let now = Date.now();
  let startTime = performance.now();
  let t0 = n.telemetry?.t0;
  let U =
    t0 !== undefined && Number.isFinite(t0) && t0 >= 0 && t0 <= startTime && startTime - t0 < 86400000
      ? t0
      : startTime;
  if (n.telemetry?.gestureId !== undefined)
    recordAttachAttempt(n.telemetry.gestureId, n.telemetry.attempt, n.telemetry.storageV5);
  let j;
  let C;
  let q;
  let Q;
  let K;
  let D = Z;
  let reached = n.telemetry?.interactive?.reached;
  let _e = false;
  let De;
  let timer = setTimeout(
    () => {
      if (reached === undefined && (j === undefined || C === undefined)) {
        _e = true;
        De = performance.now() - U;
      }
    },
    Math.max(0, 30000 - (startTime - U)),
  );
  let Ce = false;
  let ackMs;
  let W;
  let ce;
  let Ne;
  let we;
  let stale;
  let Ee;
  let cached;
  let ie;
  let ue = false;
  let pe;
  function qe(meaningful) {
    let R = Date.now() - now;
    if (meaningful && pe === undefined) pe = R;
    if (ue) return;
    ue = true;
    Ce = !meaningful;
    logEvent("tengu_bg_attach_first_frame", {
      ms: R,
      meaningful_ms: pe,
      ack_ms: ackMs,
      gesture_id: sanitizeMarkName(n.telemetry?.gestureId),
      attempt: n.telemetry?.attempt,
      via: fromEnumOpt(W),
      tempo: fromEnumOpt(Ne),
      stale,
      state: daemonSessionStateLabel(we),
      cached,
    });
  }
  let Ve;
  let promise = new Promise((resolve) => {
    Ve = resolve;
  });
  let V = false;
  let re = false;
  let ae;
  let X = false;
  let oe;
  let Pt = u;
  let It = s;
  let privateModeTracker = createPrivateModeTracker();
  let Dt = () =>
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
    });
  let Pn = getPlatform() === "windows" && !isBackspaceCtrlBackspaceHere();
  let In =
    n.holdScreenOnDisconnect && getPlatform() === "windows"
      ? true
      : "isRaw" in stdin
        ? Boolean(stdin.isRaw)
        : false;
  let pt = getPlatform() === "windows";
  let buffer_6 = Buffer.from(SHOW_CURSOR, "ascii");
  let buffer_11 = Buffer.from(HIDE_CURSOR, "ascii");
  let Nt = pt && isNativeCursorRequested();
  let Ft = false;
  let ht;
  let se;
  try {
    se = connect(daemonControlSocket());
  } catch (error) {
    let reached = n.telemetry?.interactive?.reached;
    let marksExpected =
      typeof n.telemetry?.interactive?.marksExpected === "boolean"
        ? n.telemetry.interactive.marksExpected
        : undefined;
    logEvent("tengu_bg_attach_outcome", {
      outcome: fromEnum("error"),
      got_ack: false,
      got_first_frame: false,
      ms: Date.now() - now,
      apc_detach: false,
      failure_class: fromEnum("connect_throw"),
      gesture_id: sanitizeMarkName(n.telemetry?.gestureId),
      attempt: n.telemetry?.attempt,
      surface: fromEnumOpt(n.telemetry?.surface),
      daemon_booted: n.telemetry?.daemonBooted,
      attach_ms:
        reached !== undefined
          ? reached.attachMs
          : marksExpected === true
            ? Math.round(performance.now() - U)
            : undefined,
      content_paint_ms: reached !== undefined ? Math.round(reached.contentPaintMs) : undefined,
      prompt_idle_ms: reached !== undefined ? Math.round(reached.promptIdleMs) : undefined,
      msgs_loaded: reached?.msgsLoaded,
      msgs_in_jsonl: reached?.msgsInJsonl,
      msgs_rendered_at_first_paint: reached?.msgsRenderedAtFirstPaint,
      first_frame_kind: fromEnumOpt(reached !== undefined ? "real" : undefined),
      marks_expected: reached !== undefined ? true : marksExpected,
      attach_censored: reached === undefined && marksExpected === true ? true : undefined,
      via: fromEnumOpt(n.telemetry?.interactive?.via),
      attach_cold: n.telemetry?.interactive?.attachCold,
    });
    clearTimeout(timer);
    return {
      outcome: "error",
      msg: redactDaemonPipeKey(errorMessage(error)),
    };
  }
  se.setTimeout(1e4, () => {
    if (!re)
      ne("error", bgSupervisorStalledMessage(), {
        failureClass: "ack_timeout",
      });
  });
  function ne(B, msg, E) {
    if (V) return;
    let { viaApc, beforeFirstFrame, failureClass } = E ?? {};
    V = true;
    clearTimeout(ht);
    clearTimeout(timer);
    clearTimeout(ae);
    let rounded = Math.round(performance.now() - U);
    let x = j !== undefined && C !== undefined ? Math.round(Math.max(j, C)) : undefined;
    let H = ie !== undefined || n.telemetry?.interactive?.marksExpected === true;
    let G = reached === undefined && H && _e && x === undefined;
    let ke = reached === undefined && H && !G && x === undefined;
    let attachMs =
      reached !== undefined ? reached.attachMs : G ? Math.round(De ?? rounded) : ke ? rounded : x;
    let $n =
      reached !== undefined
        ? "real"
        : x !== undefined
          ? "real"
          : ue
            ? Ce && pe === undefined
              ? "dimhint"
              : "unknown"
            : undefined;
    logEvent("tengu_bg_attach_outcome", {
      outcome: fromEnum(B),
      got_ack: re,
      got_first_frame: ue,
      ms: Date.now() - now,
      gesture_id: sanitizeMarkName(n.telemetry?.gestureId),
      attempt: n.telemetry?.attempt,
      via: fromEnumOpt(n.telemetry?.interactive?.via ?? W),
      tempo: fromEnumOpt(Ne),
      apc_detach: viaApc === true,
      failure_class: fromEnumOpt(failureClass),
      state: daemonSessionStateLabel(we),
      cached,
      meaningful_ms: pe,
      input_accepted_ms: Ye,
      input_delivered_ms: Ye,
      keys_dropped: $t,
      attach_ms: attachMs,
      content_paint_ms:
        reached !== undefined
          ? Math.round(reached.contentPaintMs)
          : j !== undefined
            ? Math.round(j)
            : undefined,
      prompt_idle_ms:
        reached !== undefined
          ? Math.round(reached.promptIdleMs)
          : C !== undefined
            ? Math.round(C)
            : undefined,
      timed_out: G,
      attach_censored: ke,
      marks_expected:
        reached !== undefined
          ? true
          : re || typeof n.telemetry?.interactive?.marksExpected === "boolean"
            ? H
            : undefined,
      attach_cold:
        n.telemetry?.interactive?.attachCold ?? (W !== undefined ? W === "cold" && (ce ?? true) : undefined),
      daemon_booted: n.telemetry?.daemonBooted,
      surface: fromEnumOpt(n.telemetry?.surface),
      first_frame_kind: fromEnumOpt($n),
      msgs_loaded: reached?.msgsLoaded ?? q,
      msgs_in_jsonl: reached?.msgsInJsonl ?? Q,
      msgs_rendered_at_first_paint: reached?.msgsRenderedAtFirstPaint ?? K,
    });
    if (re) {
      let Wn = n.alreadyInAlt || (B === "disconnected" && n.holdScreenOnDisconnect);
      stdout.write(
        ESU +
          privateModeTracker.snapshot().map(decreset).reverse().join("") +
          SHOW_CURSOR +
          (getPlatform() === "windows" ? DISABLE_WIN32_INPUT_MODE : "") +
          "\x1B[0m\x1B7" +
          RESET_SCROLL_REGION +
          "\x1B8" +
          (isProgressReportingAvailable() ? CLEAR_PROGRESS : "") +
          (Wn ? "" : exitAltScreenSequence()),
      );
    }
    if (!In) setRawModeSafe(stdin, false);
    stdin.removeListener("readable", _t);
    stdin.removeListener("end", Wt);
    if ("removeListener" in stdout) stdout.removeListener("resize", gt);
    clearTimeout(oe);
    se.destroy();
    Ve({
      outcome: B,
      msg,
      viaApc,
      beforeFirstFrame,
    });
  }
  function Dn() {
    ne("error", `${ENORESPONSE}: ${SESSION_NOT_RESPONDING_TEXT}`, {
      failureClass: "no_response",
    });
  }
  function gt() {
    if (V) return;
    if (oe === undefined) {
      Pt = h;
      It = A;
    }
    h = "columns" in stdout ? stdout.columns || u : u;
    A = "rows" in stdout ? stdout.rows || s : s;
    clearTimeout(oe);
    oe = setTimeout(() => {
      oe = undefined;
      if (V) return;
      if (h < Pt || A < It) stdout.write(ERASE_SCREEN + CURSOR_HOME);
      Lt();
      controlRequest({
        proto: BG_PROTO,
        op: "resize",
        short,
        cols: h,
        rows: A,
        attachId,
      });
    }, 50);
  }
  let startTime_2 = performance.now();
  function Lt() {
    let B = privateModeTracker.snapshot();
    if (!B.includes(1004)) return;
    stdout.write(Dt() + B.map(decset).join(""));
  }
  let Ut = n.gateStdinUntilFirstFrame === true && "isTTY" in stdin && stdin.isTTY === true;
  let Ye;
  let $t = 0;
  let terminalReplyFilter = createTerminalReplyFilter();
  function Re(B) {
    let R = () => terminalReplyFilter(B.toString("latin1"));
    if (!Ut || ue) {
      if (Ye === undefined && !R()) Ye = Date.now() - now;
      se.write(B);
    } else if (!R()) $t++;
  }
  function Fn(B) {
    if (V) return;
    let R = typeof B === "string" ? Buffer.from(B, "utf8") : B;
    let E = 0;
    for (let idx = 0; idx < R.length; idx++) {
      let y = R[idx];
      if (X) {
        X = false;
        if (idx > E) Re(R.subarray(E, idx));
        if (y === DETACH_BYTE_NL) return ne("detached");
        Re(Buffer.from([DETACH_KEYS, y]));
        E = idx + 1;
        continue;
      }
      if (
        Ut &&
        !ue &&
        ((y === 27 && R.length === 1) || hasPrefix(R, idx, buffer_4) || hasPrefix(R, idx, buffer_5))
      )
        return ne("detached", undefined, {
          beforeFirstFrame: true,
        });
      if (y === CTRL_Z_BYTE || matchCsiKey(R, idx, DETACH_LETTER_Z) || hasPrefix(R, idx, buffer_3)) {
        if (idx > E) Re(R.subarray(E, idx));
        return ne("detached");
      }
      if (Pn && y === BACKSPACE_DETACH_BYTE) {
        if (idx > E) Re(R.subarray(E, idx));
        Re(buffer);
        E = idx + 1;
        continue;
      }
      let L =
        y === DETACH_KEYS
          ? 1
          : matchCsiKey(R, idx, DETACH_LETTER_B) || (hasPrefix(R, idx, buffer_2) ? buffer_2.length : 0);
      if (L) {
        if (idx > E) Re(R.subarray(E, idx));
        idx += L - 1;
        E = idx + 1;
        X = true;
      }
    }
    if (E < R.length) Re(R.subarray(E));
  }
  function _t() {
    let startTime = performance.now();
    if (startTime - startTime_2 > STDIN_IDLE_REASSERT_MS) Lt();
    startTime_2 = startTime;
    let R;
    while ((R = stdin.read()) !== null) Fn(R);
  }
  function Wt() {
    ne("detached");
  }
  let Ue = Z;
  let Xe = Z;
  let Pe = Z;
  let Ae = Z;
  function Jt(B) {
    if (!pt) return B;
    let R = Pe.length > 0;
    let E = R ? Buffer.concat([Pe, B]) : B;
    if (R) Pe = Z;
    if (Nt) {
      let index = E.lastIndexOf(buffer_6);
      let index_2 = E.lastIndexOf(buffer_11);
      if (index !== index_2) Ft = index > index_2;
    }
    let index = E.indexOf(buffer_6);
    if (index < 0) {
      let G = suffixPrefixOverlap(E, buffer_6);
      if (G === 0) return E;
      Pe = Buffer.from(E.subarray(E.length - G));
      return E.subarray(0, E.length - G);
    }
    let y = [];
    let L = 0;
    let F = index;
    for (;;) {
      if (F > L) y.push(E.subarray(L, F));
      L = F + buffer_6.length;
      F = E.indexOf(buffer_6, L);
      if (F < 0) break;
    }
    let chunk = E.subarray(L);
    let H = suffixPrefixOverlap(chunk, buffer_6);
    if (H > 0) Pe = Buffer.from(chunk.subarray(chunk.length - H));
    if (chunk.length > H) y.push(chunk.subarray(0, chunk.length - H));
    if (y.length === 0) return Z;
    if (y.length === 1) return y[0];
    return Buffer.concat(y);
  }
  function Ht(B) {
    let R = Ae.length > 0;
    let E = R ? Buffer.concat([Ae, B]) : B;
    if (R) Ae = Z;
    let index = E.indexOf(buffer_10);
    if (index < 0) {
      let x = suffixPrefixOverlap(E, buffer_10);
      if (x === 0) return E;
      Ae = Buffer.from(E.subarray(E.length - x));
      return E.subarray(0, E.length - x);
    }
    let y = [];
    let L = 0;
    let F = index;
    while (F >= 0) {
      let x = F + buffer_10.length;
      if (x >= E.length) {
        if (F > L) y.push(E.subarray(L, F));
        Ae = Buffer.from(E.subarray(F));
        L = E.length;
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
      let chunk = E.subarray(L);
      let H = suffixPrefixOverlap(chunk, buffer_10);
      if (H > 0) Ae = Buffer.from(chunk.subarray(chunk.length - H));
      if (chunk.length > H) y.push(chunk.subarray(0, chunk.length - H));
    }
    if (y.length === 0) return Z;
    if (y.length === 1) return y[0];
    return Buffer.concat(y);
  }
  let Gt = n.alreadyInAlt && !n.holdingFrame;
  function Kt(B) {
    let { out, meaningful, renders } = jn(B);
    if (out.length === 0) return;
    if (!renders) {
      stdout.write(out);
      return;
    }
    if (Gt) {
      Gt = false;
      stdout.write(ERASE_SCREEN + CURSOR_HOME);
    }
    stdout.write(out);
    privateModeTracker.feed(out.toString("latin1"), (y) => {
      if (y === 1004) {
        let L = Dt();
        if (L) stdout.write(L);
      }
    });
    qe(meaningful);
  }
  let Qe = Z;
  let et = false;
  let Me = false;
  let bt = false;
  function qt(B) {
    let R = false;
    let E = 0;
    if (bt) {
      bt = false;
      Me = false;
      if (B[0] === 92) E = 1;
    }
    while (E < B.length) {
      if (Me) {
        let y = E;
        while (y < B.length && B[y] !== 27 && B[y] !== 24 && B[y] !== 26) y++;
        if (y >= B.length) return R;
        if (B[y] !== 27) {
          Me = false;
          E = y + 1;
          continue;
        }
        if (y === B.length - 1) {
          bt = true;
          return R;
        }
        if (B[y + 1] === 92) {
          Me = false;
          E = y + 2;
          continue;
        }
        Me = false;
        E = y;
        continue;
      }
      let index = B.indexOf(buffer_9, E);
      if (index < 0) return true;
      R ||= index > E;
      Me = true;
      E = index + buffer_9.length;
    }
    return R;
  }
  function jn(B) {
    let R = Qe.length > 0 ? Buffer.concat([Qe, B]) : B;
    Qe = Z;
    let E = false;
    let M = false;
    let y = [];
    let L = 0;
    for (;;) {
      let index = R.indexOf(buffer_8, L);
      if (index < 0) break;
      if (index > L) {
        let chunk = R.subarray(L, index);
        y.push(chunk);
        if (!et) E = qt(chunk) || E;
        else M = true;
      }
      et = !et;
      L = index + buffer_8.length;
    }
    let chunk = R.subarray(L);
    let x = suffixPrefixOverlap(chunk, buffer_8);
    if (x > 0) {
      Qe = Buffer.from(chunk.subarray(chunk.length - x));
      chunk = chunk.subarray(0, chunk.length - x);
    }
    if (chunk.length > 0) {
      y.push(chunk);
      if (!et) E = qt(chunk) || E;
      else M = true;
    }
    return {
      out: y.length === 0 ? Z : y.length === 1 ? y[0] : Buffer.concat(y),
      meaningful: E,
      renders: E || M,
    };
  }
  function Vt(B) {
    if (V) return;
    let R = ie !== undefined && reached === undefined && (j === undefined || C === undefined);
    let interactiveMarks = extractInteractiveMarks(D, B, {
      requireNonce: ie,
    });
    D = interactiveMarks.carry;
    let cleaned = interactiveMarks.cleaned;
    if (R)
      for (let mark of interactiveMarks.marks) {
        let H = performance.now() - U;
        if (mark.kind === "content_paint" && j === undefined) {
          j = H;
          q = mark.msgsLoaded;
          Q = mark.msgsInJsonl;
          K = mark.msgsRenderedAtFirstPaint;
        } else if (mark.kind === "prompt_idle" && C === undefined) C = H;
        if (j !== undefined && C !== undefined) {
          clearTimeout(timer);
          let attachMs = Math.round(Math.max(j, C));
          if (n.telemetry?.interactive !== undefined)
            n.telemetry.interactive.reached = {
              attachMs,
              contentPaintMs: j,
              promptIdleMs: C,
              msgsLoaded: q,
              msgsInJsonl: Q,
              msgsRenderedAtFirstPaint: K,
            };
          if (n.telemetry?.gestureId !== undefined)
            updateAttachBeacon(
              n.telemetry.gestureId,
              {
                interactiveReached: true,
                attachMs,
                msgsLoaded: q,
                msgsInJsonl: Q,
                msgsRenderedAtFirstPaint: K,
              },
              n.telemetry.storageV5,
            );
        }
      }
    let y = Xe.length > 0 ? Buffer.concat([Xe, cleaned]) : cleaned;
    let index = y.indexOf(buffer_7);
    if (index >= 0) {
      let chunk = y.subarray(0, index);
      if (index > 0) {
        let G = Ht(Jt(chunk));
        if (G.length > 0) Kt(G);
      }
      Xe = Z;
      Pe = Z;
      Ae = Z;
      let msg = parseDetachMsg(chunk);
      return ne("detached", msg, {
        viaApc: true,
        failureClass: classifyAttachError(msg),
      });
    }
    let F = suffixPrefixOverlap(y, buffer_7);
    if (y.length > F) {
      let chunk = y.subarray(0, y.length - F);
      let H = Ht(Jt(chunk));
      if (H.length > 0) Kt(H);
    }
    Xe = F > 0 ? Buffer.from(y.subarray(y.length - F)) : Z;
    if (Nt) {
      clearTimeout(ht);
      ht = setTimeout(() => {
        if (!V && Ft) stdout.write(SHOW_CURSOR);
      }, CURSOR_HIDE_DELAY_MS);
    }
  }
  se.on("data", (B) => {
    if (V) return;
    if (re) {
      clearTimeout(ae);
      Vt(B);
      return;
    }
    Ue = Buffer.concat([Ue, B]);
    let index = Ue.indexOf(10);
    if (index < 0) return;
    let str = Ue.subarray(0, index).toString("utf8");
    let chunk = Ue.subarray(index + 1);
    let y;
    try {
      y = jsonParse(str);
    } catch (error) {
      return ne("error", `bad ack: ${errorMessage(error)}`, {
        failureClass: "bad_ack",
      });
    }
    if (typeof y !== "object" || y === null)
      return ne("error", "bad ack: non-object ack line", {
        failureClass: "bad_ack",
      });
    if (!y.ok)
      return ne("error", `${y.code}: ${y.error}`, {
        failureClass: attachErrorCode(y.code),
      });
    re = true;
    se.setTimeout(0);
    if (!n.holdingFrame && chunk.length === 0) ae = setTimeout(Dn, ATTACH_ERROR_CODES_2);
    ackMs = Date.now() - now;
    W = y.op === "attach" ? normalizeDaemonSessionState(y.via) : undefined;
    ce = y.op === "attach" && typeof y.booting === "boolean" ? y.booting : undefined;
    ie = y.op === "attach" && typeof y.imarkNonce === "string" ? y.imarkNonce : undefined;
    if (n.telemetry?.gestureId !== undefined)
      updateAttachBeacon(
        n.telemetry.gestureId,
        {
          marksExpected: ie !== undefined,
          daemonBooted: typeof n.telemetry.daemonBooted === "boolean" ? n.telemetry.daemonBooted : undefined,
          attachCold: W !== undefined ? W === "cold" && (ce ?? true) : undefined,
          via: W,
        },
        n.telemetry.storageV5,
      );
    if (n.telemetry?.interactive !== undefined) {
      n.telemetry.interactive.marksExpected =
        n.telemetry.interactive.marksExpected === true || ie !== undefined;
      if (W !== undefined && n.telemetry.interactive.reached === undefined) {
        n.telemetry.interactive.attachCold = W === "cold" && (ce ?? true);
        n.telemetry.interactive.via = W;
      }
    }
    Ne = y.op === "attach" ? y.tempo : undefined;
    we = y.op === "attach" ? y.state : undefined;
    stale = y.op === "attach" ? y.stale : undefined;
    Ee = y.op === "attach" ? y.workerCliVersion : undefined;
    cached = y.op === "attach" ? y.cached : undefined;
    if (env.TMUX && !getSpawnLauncherState().tmuxRgbApplied) {
      getSpawnLauncherState().tmuxRgbApplied = true;
      execFileNoThrow("tmux", ["set", "-as", "terminal-features", ",*:RGB"]);
    }
    let joined = ((y.op === "attach" ? y.decModes : undefined) ?? []).map(decset).join("");
    privateModeTracker.feed(joined);
    if ("ref" in stdin) stdin.ref();
    setRawModeSafe(stdin, true);
    let legacyKitty =
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
    stdout.write(
      n.alreadyInAlt
        ? HIDE_CURSOR +
            enableExtendedKeysSequence({
              legacyKitty,
            }) +
            joined
        : enterAltScreenSequence({
            legacyKitty,
          }) +
            joined +
            (pt ? HIDE_CURSOR : "") +
            `
  \x1B[2mAttaching\u2026\x1B[0m
`,
    );
    if ("on" in stdout) stdout.on("resize", gt);
    if (
      ("columns" in stdout && (stdout.columns || u) !== u) ||
      ("rows" in stdout && (stdout.rows || s) !== s)
    )
      gt();
    stdin.on("readable", _t);
    if ("resume" in stdin && "pause" in stdin) {
      stdin.resume();
      stdin.pause();
    }
    stdin.once("end", Wt);
    _t();
    if (chunk.length) Vt(chunk);
  });
  se.on("error", (B) =>
    ne("error", redactDaemonPipeKey(errorMessage(B)), {
      failureClass: "socket_error",
    }),
  );
  se.once("close", () => {
    if (!V)
      ne(re ? "disconnected" : "error", "control socket closed", {
        failureClass: "socket_closed",
      });
  });
  se.once("connect", () => {
    se.write(
      jsonStringify({
        proto: BG_PROTO,
        op: "attach",
        short,
        auth,
        cols: u,
        rows: s,
        attachId,
        caps: {
          ...terminalCapabilities(),
          ...(n.sessionTabs !== undefined && {
            sessionTabs: n.sessionTabs,
            ...(n.cloudTabs === true && {
              cloudTabs: true,
            }),
            ...(n.tabsLanding && {
              tabsLanding: n.tabsLanding,
            }),
          }),
        },
        ...(n.holdingFrame && {
          holdingFrame: true,
        }),
      }) +
        `
`,
    );
  });
  return promise;
}
//@ chunk-vrr64ez0.js:25318-25777 placement
/**
 * 收集终端能力信息（mux、ssh、超链接等）。
 */
function terminalCapabilities() {
  return {
    imark: true,
    terminal: env.terminal,
    mux: env.TMUX ? "tmux" : process.env.ZELLIJ != null ? "zellij" : env.STY ? "screen" : null,
    ssh: env.isSSH(),
    wheelFlood: isXtermJsTerminal(),
    hyperlinks: supportsHyperlinks(),
    progressReporting: isProgressReportingAvailable(),
    printsUnknownSequences: hasUnknownSequencePrintingBug(),
    wtSession: !!env.WT_SESSION,
    isVscodeTerm: env.TERM_PROGRAM === "vscode",
    keyDialect: detectMinimalTerminal(env.TERM),
    browser: env.BROWSER ?? null,
    colorLevel: sequential.level,
    syncOutput: isSyncOutputKnownSupported(),
    editor: env.VISUAL || env.EDITOR || null,
    systemTheme: getSystemTheme(),
    ...(env.TMUX && {
      tmuxSocket: firstLineOf(env.TMUX, ","),
    }),
  };
}
//@ chunk-vrr64ez0.js:25777-25863 placement
function parseSwitchTarget(e) {
  return CLOUD_SESSION_ID_RE.test(e)
    ? {
        kind: "cloud",
        sessionId: e,
      }
    : {
        kind: "switch",
        short: e,
      };
}
//@ chunk-vrr64ez0.js:26163-26354 placement
/**
 * 后台作业接管记录相关常量（时间、7 天保留期、上限）与 schema：写入时间与 shell 列表（pid、进程启动标记）。
 */
var ADOPT_RECORD_SCHEMA_BASE = 250;
var ADOPT_RECORD_MAX_AGE_MS = 604800000;
var MAX_ADOPT_SHELLS = 256;
var adoptRecordSchema = DoctorLazy(() =>
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
  MAX_ADOPT_SHELLS,
};
