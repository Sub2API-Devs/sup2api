/**
 * services/daemon/controlServer.ts
 *
 * 后台守护进程控制服务（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ksvdmrg0.js (23)
 * attribution: placement 22, sole-consumer 1
 */
import { lstatSync, openSync, readSync, closeSync } from "fs";
import { unlink, unlink as unlink_2 } from "fs/promises";
import { createServer } from "net";
import { randomBytes } from "crypto";
import { StringDecoder } from "string_decoder";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { qa } from "../../utils/stripAnsi.js";
import { CONTROL_CHARS_EXCEPT_WS_RE, takeLastChars } from "../../utils/stringUtils.js";
import { W8e, wrapAnsi } from "../../ink/wrapAnsi.js";
import { hardWrapAnsiLine } from "../../ink/termio/parser.js";
import { jsonParseRaw, jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { t7, TAG_OR_INTERRUPT_START_RE } from "../../utils/messages/pluginPrompts.js";
import { pae } from "../../tools/REPLTool/constants.js";
import { flattenPastedBlocks } from "../../utils/pastedContent.js";
import { configureMarked, formatTokenWindowed } from "../../utils/markdown.js";
import { Ah } from "../../../vendor/marked/lib/marked.esm.js";
import { Sz } from "../../utils/cliHighlight.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  an,
  on,
  sn,
  ln,
  isMarkdownTooComplex,
  Gt,
  isNonPromptInput,
  Vt,
  hasNonReportingMouseMode,
} from "./spawnLauncher.js";
import { sequential } from "../../utils/sequential.js";
import { truncateToWidth } from "../../utils/format.js";
import { BLACK_CIRCLE, THEREFORE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { color } from "../../components/design-system/color.js";
import { HIDE_CURSOR, decset } from "../../ink/termio/dec.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { processWrapperArgv, processWrapperRecord } from "../../utils/processWrapper.js";
import { readJobState, getJobDir, readJobStateOrAbsent } from "./jobState.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import { qXe, YXe } from "./reapJobs.js";
import { wrapStorageSource, getTranscriptStorageContext } from "../../utils/sessionStorage.js";
import { resolveJobTranscript, quarantineJobTranscript } from "../../utils/sessionStoragePortable.js";
import { withReplyOnResume, withoutReplyOnResume } from "../../cli/forwardedFlags.js";
import { logError } from "../../utils/log.js";
import { Z6, $A } from "../../utils/sandbox/userNamespace.js";
import { ensureDaemonRuntimeDir, getOrCreateDaemonToken } from "./paths.js";
import { createSignal } from "../../utils/signal.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { describeUidMismatch, getPeerPid } from "../../utils/udsMessaging/peerGuard.js";
import { writeOut_2 } from "../../utils/process.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  CLOUD_SESSION_LEASE_LABEL,
  BG_PROTO,
  LeaseClientSchema,
  BG_PROTO_MIN,
  ControlRequestSchema,
  RESPAWN_REASON_STALL,
  RESPAWN_REASON_UPGRADE,
  RESPAWN_REASON_LEGACY,
  HOST_DIED_EXEC_ATTACH_MESSAGE,
  HOST_DIED_ATTACH_MESSAGE,
  wrapDaemonHint,
  daemonDetachApc,
  streamDetachMessage,
  RESPAWNING_ATTACH_CODE,
  KICKED_NOTICE,
  DAEMON_LEASE_LABELS,
} from "./leaseProtocol.js";
import { bgSupervisorNoun } from "../../utils/fleetGates.js";
import { fBn } from "../../utils/background/envCarry.js";
import { timingSafeEqualStrings } from "../../utils/sessionRecords.js";
import { updateRoster } from "./roster.js";
import { m5 } from "./sessionStatus.js";
import { ERASE_SCREEN, CURSOR_HOME, ERASE_LINE } from "../../ink/termio/csi.js";
import { getPlatform } from "../../utils/platform.js";

//@ chunk-ksvdmrg0.js:24104-24255 placement = DIM (0.387)
var DIM = "\x1B[2m",
  RESET = "\x1B[0m",
  INDENT = 2,
  DARK = "dark",
  pointer = re.pointer,
  SESSION_STARTING_NOTICE =
    "  Session is starting \u2014 showing its transcript until it appears. Ctrl+Z to detach";
//@ chunk-ksvdmrg0.js:24255-24395 placement
function sanitizeControlChars(r) {
  if (!/[\x00-\x09\x0b-\x1f\x7f-\x9f]/.test(r)) return r;
  return qa(r)
    .replace(/\t/g, "  ")
    .replace(CONTROL_CHARS_EXCEPT_WS_RE, "")
    .replace(/[\v\f\r]/g, "");
}
//@ chunk-ksvdmrg0.js:24395-24490 placement
var regExp = new RegExp(`(${W8e(";")})`),
  regExp_2 = new RegExp(`^${W8e(";")}$`),
  regExp_3 = new RegExp(regExp.source, "g");
/**
 * 去掉文本中除允许的 SGR 以外的 CSI 序列，以及 OSC/DCS/SOS/PM/APC 字符串和其他 ESC 序列。
 */
//@ chunk-ksvdmrg0.js:24490-25056 placement
function stripNonSgrEscapes(r) {
  if (!r.includes("\x1B")) return r;
  let output = "",
    pos = 0;
  while (pos < r.length) {
    let index = r.indexOf("\x1B", pos);
    if (index < 0) {
      output += r.slice(pos);
      break;
    }
    output += r.slice(pos, index);
    let h = r[index + 1];
    if (h === "[") {
      let w = index + 2;
      while (w < r.length) {
        let code = r.charCodeAt(w);
        if (code >= 64 && code <= 126) {
          let sliced = r.slice(index, w + 1);
          if (regExp_2.test(sliced)) output += sliced;
          w++;
          break;
        }
        if (code < 32 || code > 63) break;
        w++;
      }
      pos = w;
    } else if (h === "]" || h === "P" || h === "X" || h === "^" || h === "_") {
      let w = index + 2,
        p = r.length;
      while (w < r.length) {
        if (h === "]" && r.charCodeAt(w) === 7) {
          p = w + 1;
          break;
        }
        if (r.charCodeAt(w) === 27 && r[w + 1] === "\\") {
          p = w + 2;
          break;
        }
        w++;
      }
      pos = p;
    } else if (h === void 0) pos = r.length;
    else pos = index + 2;
  }
  return output;
}
//@ chunk-ksvdmrg0.js:25498-25581 sole-consumer
function wrapAnsiHard(r, e) {
  return wrapAnsi(r, e, { hard: !1, trim: !1 })
    .split(
      `
`,
    )
    .flatMap((n) => hardWrapAnsiLine(n, e));
}
/**
 * 解析一行转录 JSONL 为预览项：只取主线的 user/assistant 消息，用户文本、助手文本、工具调用（工具名+首个字符串参数）与思考分别成项。
 */
//@ chunk-ksvdmrg0.js:25581-26658 placement
function parseTranscriptLineForPreview(r) {
  let parsed;
  try {
    parsed = jsonParseRaw(r);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null) return [];
  let entry = parsed;
  if (
    (entry.type !== "user" && entry.type !== "assistant") ||
    entry.isSidechain === !0 ||
    entry.isMeta === !0
  )
    return [];
  let content = entry.message?.content;
  if (typeof content === "string") {
    if (entry.type === "user") return toUserPreviewItem(t7(content, entry.pluginPrompt));
    let trimmed = content.trim();
    return trimmed === "" ? [] : [{ role: "assistant", text: trimmed }];
  }
  if (!Array.isArray(content)) return [];
  if (entry.type === "user") {
    let E = [];
    for (let S of content) {
      let R = S;
      if (R?.type === "text" && typeof R.text === "string") E.push(R.text);
    }
    return toUserPreviewItem(
      E.join(`
`),
    );
  }
  let items = [],
    pendingText = [],
    flushText = () => {
      let trimmed = pendingText
        .join(
          `
`,
        )
        .trim();
      if (((pendingText = []), trimmed !== "")) items.push({ role: "assistant", text: trimmed });
    };
  for (let E of content) {
    let S = E;
    if (S?.type === "text" && typeof S.text === "string") pendingText.push(S.text);
    else if (S?.type === "tool_use" && typeof S.name === "string") {
      flushText();
      let R = "";
      if (typeof S.input === "object" && S.input !== null) {
        for (let A of Object.values(S.input))
          if (typeof A === "string" && A !== "") {
            R = A;
            break;
          }
      }
      items.push({ role: "tool", text: `${pae(S.name)}(${R})` });
    } else if (S?.type === "thinking" && typeof S.thinking === "string" && S.thinking.trim() !== "")
      (flushText(), items.push({ role: "thinking", text: S.thinking }));
  }
  return (flushText(), items);
}
//@ chunk-ksvdmrg0.js:26658-26850 placement
function toUserPreviewItem(r) {
  let trimmed = flattenPastedBlocks(r).trim();
  if (trimmed === "") return [];
  let match = /^<bash-input>([\s\S]*?)<\/bash-input>/.exec(trimmed);
  if (match) trimmed = `! ${match[1].trim()}`;
  else if (TAG_OR_INTERRUPT_START_RE.test(trimmed)) return [];
  return [{ role: "user", text: trimmed }];
}
//@ chunk-ksvdmrg0.js:26850-27017 placement
function renderMarkdownForPreview(r, e) {
  return (
    configureMarked(),
    stripNonSgrEscapes(
      Ah.lexer(r)
        .map((n) =>
          formatTokenWindowed(n, e, {
            listDepth: 0,
            orderedListNumber: null,
            parent: null,
            highlight: Sz(),
            linkCap: !1,
            windowed: !1,
          }),
        )
        .join(""),
    ).trim()
  );
}
/**
 * 渲染附着时显示的会话尾部预览：从转录末尾倒序取若干条（字符预算内），按角色着色、折行（助手消息尝试 Markdown 渲染），按终端行数从下往上裁剪，加分隔线与"会话启动中"提示。
 */
//@ chunk-ksvdmrg0.js:27017-28891 placement
function renderTranscriptTail(r, columns, rows, options) {
  let max = Math.max(1, columns),
    colorLevel = options?.colorLevel ?? INDENT,
    theme = options?.theme ?? DARK,
    dim = (y) => (colorLevel > 0 && y !== "" ? DIM + y + RESET : y),
    rowsOf = (y) => Math.max(1, Math.ceil(bunStringWidth(y) / max)),
    repeat = "\u2500".repeat(max),
    footer = ["", repeat, pointer, repeat, SESSION_STARTING_NOTICE],
    reduced = footer.reduce((y, Y) => y + rowsOf(Y), 0),
    availableRows = rows - reduced;
  if (availableRows < 1) return null;
  let min = Math.min(Math.ceil((availableRows + 1) / 2), an),
    parts = r.split(`
`),
    items = [],
    charBudget = on;
  e: for (let y = parts.length - 1; y >= 0; y--) {
    let Y = parseTranscriptLineForPreview(parts[y]);
    for (let q = Y.length - 1; q >= 0; q--) {
      if (items.length >= min) break e;
      let Q = Y[q];
      if (Q.text.length > charBudget) {
        if (items.length === 0) {
          let oe = takeLastChars(Q.text, charBudget),
            index = oe.indexOf(`
`);
          if (index >= 0) oe = oe.slice(index + 1);
          if (oe.trim() !== "") items.unshift({ role: Q.role, text: oe });
        }
        break e;
      }
      ((charBudget -= Q.text.length), items.unshift(Q));
    }
  }
  if (items.length === 0) return null;
  let rendered = [],
    gutter = max >= 4 ? 2 : 0,
    max_2 = Math.max(1, max - gutter),
    level = sequential.level;
  sequential.level = colorLevel;
  let startTime = performance.now();
  try {
    for (let y of items) {
      if (rendered.length > 0) rendered.push({ text: "", dim: !1 });
      let Y = sanitizeControlChars(y.text);
      switch (y.role) {
        case "tool": {
          let q = truncateToWidth(`${BLACK_CIRCLE} ${Y.replace(/\n/g, " ")}`, max);
          rendered.push({ text: q, dim: !0 });
          break;
        }
        case "thinking": {
          let trimmed = Y.replace(/\s+/g, " ").trim();
          for (let [Q, oe] of wrapAnsiHard(trimmed, max_2).entries()) {
            let le = gutter === 0 || oe === "" ? "" : Q === 0 ? `${THEREFORE} ` : "  ";
            rendered.push({ text: le + sequential.italic(oe), dim: !0 });
          }
          break;
        }
        case "assistant": {
          let q = Y;
          if (Y.length <= sn && performance.now() - startTime < ln && !isMarkdownTooComplex(Y))
            try {
              q = renderMarkdownForPreview(Y, theme);
            } catch {
              q = Y;
            }
          let Q = color("text", theme)(BLACK_CIRCLE);
          for (let [oe, le] of wrapAnsiHard(q, max_2).entries()) {
            let ce = gutter === 0 || le === "" ? "" : oe === 0 ? `${Q} ` : "  ";
            rendered.push({ text: ce + le, dim: !1 });
          }
          break;
        }
        case "user": {
          let q = color("inactive", theme)(`${pointer} `),
            Q = color("text", theme),
            oe = color("userMessageBackground", theme, "background");
          for (let [le, ce] of wrapAnsiHard(Y, max_2).entries()) {
            let se = gutter === 0 ? "" : le === 0 ? q : "  ";
            rendered.push({ text: oe(se + Q(ce)), dim: !1 });
          }
          break;
        }
        default:
          y.role;
      }
    }
  } finally {
    sequential.level = level;
  }
  let usedRows = 0,
    visible = [];
  for (let y = rendered.length - 1; y >= 0; y--) {
    let Y = rendered[y],
      q = rowsOf(Y.text);
    if (usedRows + q > availableRows) break;
    ((usedRows += q), visible.unshift(Y.dim ? dim(Y.text) : Y.text));
  }
  if (visible.length === 0) return null;
  let padRows = rows - usedRows - reduced,
    out = [];
  for (let y = 0; y < padRows; y++) out.push("");
  out.push(...visible);
  for (let y of footer) out.push(dim(y));
  let joined = out.join(`\r
`);
  if (joined.length > 65536 + rows * max * 32) joined = joined.replace(regExp_3, "");
  return HIDE_CURSOR + joined;
}
/**
 * 读取转录文件尾部（固定大小，从第一个完整行开始）并渲染预览。
 */
//@ chunk-ksvdmrg0.js:28891-29251 placement
function readTranscriptTailPreview(r, e, n, s) {
  let h;
  try {
    let w = lstatSync(r);
    if (!w.isFile() || w.size === 0) return null;
    let size = w.size;
    h = openSync(r, "r");
    let max = Math.max(0, size - Gt),
      alloc = Buffer.alloc(Math.min(size, Gt)),
      R = readSync(h, alloc, 0, alloc.length, max),
      str = alloc.subarray(0, R).toString("utf8");
    if (max > 0) {
      let index = str.indexOf(`
`);
      if (index < 0) return null;
      str = str.slice(index + 1);
    }
    return renderTranscriptTail(str, e, n, s);
  } catch {
    return null;
  } finally {
    if (h !== void 0)
      try {
        closeSync(h);
      } catch {}
  }
}
//@ chunk-ksvdmrg0.js:29251-29315 placement
var Fe = 1048576,
  Cn = 5000,
  Tn = 12000,
  St = 1000,
  Xt = 500,
  Rn = 6000,
  Dn = 30000;
//@ chunk-ksvdmrg0.js:29315-29435 placement
function getAttachStallMs() {
  let r = getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_attach_stall_ms", Cn);
  if (r === 0) return 0;
  let e = processWrapperArgv().length > 0 ? Tn : 2000;
  return Math.max(e, r);
}
/**
 * 附着卡住时重启后台会话：发 SIGTERM 等待退出，读取作业状态与转录，有消息则以 resume 方式（活跃时附带续答标志）重新派发，否则按会话 ID 或原启动方式重启。
 */
//@ chunk-ksvdmrg0.js:29435-30392 placement
function respawnStalledAttach(worker, socket, dispatch, isClosing, respawning, storage) {
  let dispatch_2 = worker.dispatch;
  if (worker.getPhase().kind !== "running" || socket.destroyed || isClosing()) return;
  respawning.add(dispatch_2.short);
  let E = readJobState(getJobDir(dispatch_2.short), storage).catch(() => null);
  (worker.kill("SIGTERM"),
    (async () => {
      let S = Date.now() + Rn;
      while (Date.now() < S && !worker.record.outcome) await sleep(100);
      if (!respawning.has(dispatch_2.short)) return;
      let R = await readJobState(getJobDir(dispatch_2.short), storage).catch(() => null),
        A = R === null ? await qXe(getJobDir(dispatch_2.short), storage) : void 0,
        x = R?.resumeSessionId ?? dispatch_2.sessionId,
        L = R?.cwd ?? dispatch_2.cwd,
        M = wrapStorageSource(getTranscriptStorageContext(storage)),
        U = await resolveJobTranscript(x, L, R?.linkScanPath, void 0, M),
        hasMessages = U.hasMessages;
      if (!hasMessages) await quarantineJobTranscript(U.path, M);
      if (!respawning.has(dispatch_2.short)) return;
      let K = R?.respawnFlags ?? dispatch_2.respawnFlags,
        j = (await E)?.tempo === "active";
      if (A) YXe("attach_stall", A);
      await dispatch({
        ...dispatch_2,
        cwd: L,
        source: "respawn",
        reattachEnv: void 0,
        attachStallRespawns: (dispatch_2.attachStallRespawns ?? 0) + 1,
        launch: hasMessages
          ? {
              mode: "resume",
              sessionId: x,
              transcriptPath: U.path,
              fork: !1,
              flagArgs: j ? withReplyOnResume(K) : withoutReplyOnResume(K),
            }
          : x !== dispatch_2.sessionId
            ? { mode: "prompt", args: ["--session-id", x, ...K] }
            : dispatch_2.launch,
      });
    })()
      .catch((S) => logError(S))
      .finally(() => respawning.delete(dispatch_2.short)));
}
//@ chunk-ksvdmrg0.js:30392-30411 placement
var bt = 1e4,
  Nn = 2500;
//@ chunk-ksvdmrg0.js:30411-32581 placement
async function handleDaemonLease(
  r,
  e,
  n,
  s = () => 0,
  h = () => !0,
  w = () => !1,
  p = new Promise(() => {}),
  E,
) {
  let S = Z6();
  await ensureDaemonRuntimeDir();
  let R = await getOrCreateDaemonToken();
  await unlink_2(S).catch(() => {});
  let A = new Set(),
    x = new Set(),
    L = new Map(),
    M = new Map(),
    U = createSignal(),
    j = {
      handles: r,
      onDispatch: e,
      onNudge: n,
      onShutdown: s,
      ready: h,
      whenReady: p,
      onYield: w,
      addLease: (u, o) => {
        if (M.has(u)) return;
        M.set(u, o);
        let P = Mn(o?.label);
        (logEvent("tengu_daemon_lease", { op: lit("open"), label: P }),
          u.once("close", () => {
            (M.delete(u),
              logEvent("tengu_daemon_lease", { op: lit("close"), label: P }),
              U.emit({ op: "close", client: o }));
          }),
          U.emit({ op: "open", client: o }));
      },
      listLeases: () => {
        let u = [];
        for (let o of M.values()) if (o) u.push(o);
        return u;
      },
      stallRespawnPending: x,
      settledDispatches: L,
      controlKey: R,
      storageV5: E,
      legacyOpProbe: new tr(),
    },
    ee = !1,
    V = createServer((u) => {
      if (ee) {
        u.destroy();
        return;
      }
      (u.on("error", () => u.destroy()),
        u.setTimeout(30000, () => u.destroy()),
        A.add(u),
        u.once("close", () => A.delete(u)));
      let o = describeUidMismatch(u);
      if (o) {
        (logEvent("tengu_daemon_peer_uid_reject", {}),
          u.once("data", () => writeOut_2(u, { ok: !1, code: "EPEERUID", error: o })));
        return;
      }
      let alloc = Buffer.alloc(0),
        T = (G) => {
          alloc = Buffer.concat([alloc, G]);
          let index = alloc.indexOf(10);
          if (index < 0) {
            if (alloc.length > Fe)
              (u.off("data", T),
                writeOut_2(u, {
                  ok: !1,
                  code: "ETOOLARGE",
                  error: `request exceeds ${Fe >> 20}MB \u2014 shorten the prompt or send in parts`,
                }));
            return;
          }
          (u.off("data", T), u.setTimeout(0));
          let str = alloc.subarray(0, index).toString("utf8"),
            chunk = alloc.subarray(index + 1);
          DaemonControlServer(j, u, str, chunk).catch((Q) => {
            writeOut_2(u, { ok: !1, error: errorMessage(Q), code: "EUNKNOWN" });
          });
        };
      u.on("data", T);
    }),
    Z = !1;
  V.on("error", (u) => {
    if (Z) {
      logForDebugging(`bg control server bind: ${$A(errorMessage(u))}`, { level: "warn" });
      return;
    }
    logError(u);
  });
  let ae = Date.now() + bt;
  for (;;)
    try {
      await new Promise((u, o) => {
        let P = (T) => {
          ((Z = !1), o(T));
        };
        ((Z = !0),
          V.once("error", P),
          V.listen(S, () => {
            ((Z = !1), V.removeListener("error", P), u());
          }));
      });
      break;
    } catch (error) {
      if (getErrnoCode(error) !== "EADDRINUSE" || Date.now() >= ae) throw error;
      (V.removeAllListeners("listening"), await sleep(100));
    }
  return {
    close: (u) =>
      new Promise((o) => {
        for (let P of A) P.destroy();
        if (u?.skipUnlink) return ((ee = !0), V.unref(), void o());
        V.close(() => {
          if (!u?.skipUnlink) unlink_2(S).catch(() => {});
          o();
        });
      }),
    leaseCount: () => M.size,
    onLeaseChange: U,
    announceExit: (u) => {
      for (let [o, P] of M)
        if (P?.label === CLOUD_SESSION_LEASE_LABEL)
          o.write(
            jsonStringify({ op: "lease", closing: u }) +
              `
`,
          );
    },
    noteSettledDispatch: (u, o, P) => {
      (L.set(u, { nonce: o, refusal: P }),
        setTimeout(
          (T, G, y) => {
            if (T.get(G)?.nonce === y) T.delete(G);
          },
          Dn,
          L,
          u,
          o,
        ).unref());
    },
  };
}
//@ chunk-ksvdmrg0.js:32635-32735 placement
function writeControlLine(r, e) {
  if (r.destroyed) return;
  if (r.writableLength > Fe) {
    r.destroy();
    return;
  }
  r.write(
    jsonStringify(e) +
      `
`,
  );
}
//@ chunk-ksvdmrg0.js:32735-32803 placement
function Me(r) {
  return !r.record.outcome && !r.isRetiring && !r.isKilling;
}
//@ chunk-ksvdmrg0.js:32803-32865 placement
function Zt(r, e) {
  return r !== void 0 && e === void 0 ? withDeadline(r, 25) : sleep(25);
}
/**
 * 等待某次派发被确认（最多 30 秒，可延长一次）：命中冷启动记录、或找到 nonce 一致的 worker 时回写成功；旧派发仍在清理时报 ESTALE，超时报 ETIMEOUT。
 */
//@ chunk-ksvdmrg0.js:32865-33942 placement
async function awaitDispatchAck(workers, coldRecords, socket, op, short, nonce, timeoutMs, pendingOutcome) {
  let deadline = Date.now() + Math.min(timeoutMs, 30000),
    extended = !1,
    sawStale = !1,
    staleWorker,
    outcome,
    M = pendingOutcome?.then(
      (U) => {
        outcome = U;
      },
      (U) => {
        (logError(U), (outcome = "dropped"));
      },
    );
  while (Date.now() < deadline) {
    if (socket.destroyed) return;
    let U = outcome === "dup-live" || outcome === "dropped" || outcome === "refused" || outcome === "closed",
      O = workers.get(short),
      K = nonce !== void 0 && O?.record.nonce !== nonce ? coldRecords.get(short) : void 0;
    if (K !== void 0 && K.nonce === nonce) {
      if (K.refusal !== void 0) return writeOut_2(socket, { ok: !1, error: K.refusal, code: "ECWDGONE" });
      return writeOut_2(socket, { ok: !0, op: op, short: short, pid: 0, messagingSock: "", via: "cold" });
    }
    if (O) {
      if (nonce && O.record.nonce !== nonce) {
        if (((sawStale = !0), (staleWorker = Me(O) ? O : void 0), U)) break;
        if (!staleWorker && !extended) ((extended = !0), (deadline += Math.min(timeoutMs, 30000)));
        await Zt(M, outcome);
        continue;
      }
      return writeOut_2(socket, {
        ok: !0,
        op: op,
        short: short,
        pid: O.record.pid,
        messagingSock: O.record.messagingSock ?? "",
        via: O.via,
      });
    }
    if (((staleWorker = void 0), U)) break;
    await Zt(M, outcome);
  }
  if (sawStale) {
    if (staleWorker && workers.get(short) === staleWorker && Me(staleWorker))
      return writeOut_2(socket, {
        ok: !0,
        op: op,
        short: short,
        pid: staleWorker.record.pid,
        messagingSock: staleWorker.record.messagingSock ?? "",
        via: staleWorker.via,
      });
    return writeOut_2(socket, {
      ok: !1,
      error: "a previous dispatch with this id is still being cleaned up \u2014 retry in a moment",
      code: "ESTALE",
    });
  }
  return writeOut_2(socket, {
    ok: !1,
    error: `${bgSupervisorNoun()} didn't acknowledge in time \u2014 retry`,
    code: "ETIMEOUT",
  });
}
//@ chunk-ksvdmrg0.js:33942-34037 placement
class tr {
  fired = new Set();
  markFired(r) {
    if (this.fired.has(r)) return !1;
    return (this.fired.add(r), !0);
  }
}
//@ chunk-ksvdmrg0.js:34037-34125 placement
function er(r, e) {
  if (!r.markFired(e)) return;
  logEvent("tengu_dead_probe_bg_legacy_op", { op: fromEnum(e) });
}
/**
 * 后台守护进程控制服务：解析 JSON 请求、ping、会话租约
 */
//@ chunk-ksvdmrg0.js:34125-50327 placement
async function DaemonControlServer(r, e, n, s) {
  let {
      handles: handles,
      onDispatch: onDispatch,
      onNudge: onNudge,
      onShutdown: onShutdown,
      ready: ready,
      whenReady: whenReady,
      onYield: onYield,
      addLease: addLease,
      listLeases: listLeases,
      stallRespawnPending: stallRespawnPending,
      settledDispatches: settledDispatches,
      controlKey: controlKey,
      storageV5: storageV5,
      legacyOpProbe: legacyOpProbe,
    } = r,
    ee;
  try {
    ee = jsonParse(n);
  } catch {
    return writeOut_2(e, { ok: !1, error: "bad json", code: "EUNKNOWN" });
  }
  if (ee === null || typeof ee !== "object")
    return writeOut_2(e, { ok: !1, error: "bad json", code: "EUNKNOWN" });
  let op = ee.op;
  if (op === "ping")
    return writeOut_2(e, {
      ok: !0,
      op: "ping",
      version: {
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
      proto: BG_PROTO,
      carriedPromptsFormat: fBn,
    });
  if (op === "nudge") {
    let o = await onNudge();
    return writeOut_2(e, {
      ok: !0,
      op: "nudge",
      restarting: o.restarting,
      upgradePending: o.upgradePending,
      version: {
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
      processWrapper: processWrapperRecord(),
    });
  }
  if (op === "yield") return writeOut_2(e, { ok: !0, op: "yield", yielding: onYield() });
  if (op === "lease") {
    let o = LeaseClientSchema().safeParse(ee.client).data;
    (addLease(e, o ? { ...o, pid: getPeerPid(e) ?? o.pid } : null),
      e.write(
        jsonStringify({ ok: !0, op: "lease" }) +
          `
`,
      ));
    return;
  }
  if (op === "leases") return writeOut_2(e, { ok: !0, op: "leases", clients: listLeases() });
  if (op === "shutdown") {
    let o = ee.reapWorkers !== !1,
      P = onShutdown(o);
    return writeOut_2(e, { ok: !0, op: "shutdown", reaped: P });
  }
  if (!ready() && op === "attach") {
    if ((await Promise.race([whenReady, sleep(Nn, void 0, { unref: !0 })]), e.destroyed)) return;
  }
  if (!ready())
    return writeOut_2(e, {
      ok: !1,
      error: `${bgSupervisorNoun()} starting (adoption in progress)`,
      code: "ESTARTING",
    });
  let proto = ee.proto;
  if (typeof proto !== "number" || !Number.isInteger(proto) || proto < BG_PROTO_MIN || proto > BG_PROTO)
    return (
      logEvent("tengu_bg_proto_mismatch", {
        client_proto: typeof proto === "number" ? proto : -1,
        server_proto: BG_PROTO,
      }),
      writeOut_2(e, {
        ok: !1,
        error: `proto mismatch (server=${BG_PROTO}, client=${proto}) \u2014 ${bgSupervisorNoun()} and CLI versions differ; restart claude`,
        code: "EPROTO",
        serverProto: BG_PROTO,
        serverVersion: {
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
      })
    );
  let safeParse = ControlRequestSchema().safeParse(ee);
  if (!safeParse.success)
    return writeOut_2(e, {
      ok: !1,
      error: `malformed request: ${safeParse.error.issues[0]?.message ?? "invalid"}`,
      code: "EUNKNOWN",
    });
  let u = safeParse.data;
  switch (u.op) {
    case "ping":
    case "nudge":
    case "yield":
    case "lease":
    case "leases":
    case "shutdown":
      return;
    case "list":
      return writeOut_2(e, {
        ok: !0,
        op: "list",
        jobs: Array.from(handles.values()).map((o) =>
          o.isKilling || o.isRetiring ? { ...o.record, dying: !0 } : o.record,
        ),
      });
    case "has": {
      let o = handles.get(u.short),
        P = stallRespawnPending.has(u.short);
      return writeOut_2(e, {
        ok: !0,
        op: "has",
        alive: (o !== void 0 && Me(o)) || P,
        present: o !== void 0 || P,
        ready: o !== void 0 && !o.isBooting,
      });
    }
    case "await-ack":
      return awaitDispatchAck(handles, settledDispatches, e, "await-ack", u.short, u.nonce, u.timeoutMs);
    case "dispatch":
      if (!timingSafeEqualStrings(u.auth, controlKey))
        return writeOut_2(e, {
          ok: !1,
          error: "dispatch rejected: this client didn't present the daemon control key",
          code: "EAUTH",
        });
      if ((await sleep(0), e.readableEnded || e.destroyed)) {
        logEvent("tengu_bg_dispatch_stale_drop", {});
        return;
      }
      return awaitDispatchAck(
        handles,
        settledDispatches,
        e,
        "dispatch",
        u.d.short,
        u.d.nonce,
        u.timeoutMs,
        onDispatch(u.d),
      );
    case "reply": {
      if (!timingSafeEqualStrings(u.auth, controlKey))
        return writeOut_2(e, {
          ok: !1,
          error:
            u.auth === void 0
              ? "reply rejected: this window didn't present the daemon control key \u2014 it is likely running a Claude Code older than the daemon (left open across an update?); restart this window and retry, or stop driving the control socket directly"
              : "reply rejected: the presented daemon control key doesn't match \u2014 retry, and restart the Claude Code daemon if this persists",
          code: "EAUTH",
        });
      let o = handles.get(u.short);
      if (stallRespawnPending.has(u.short) && (!o || !Me(o)))
        return writeOut_2(e, {
          ok: !1,
          error: `worker ${RESPAWN_REASON_STALL} \u2014 restarting it; retry reply`,
          code: "ERESPAWNING",
        });
      if (!o || o.isRetiring || o.isKilling || o.record.outcome)
        return writeOut_2(e, {
          ok: !1,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      if (o.isUpgrading)
        return writeOut_2(e, {
          ok: !1,
          error: `job is restarting on the ${RESPAWN_REASON_UPGRADE}; retry reply`,
          code: "ERESPAWNING",
        });
      if (
        u.nextTurn === !0 &&
        o.record.cliVersion !==
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
          }.VERSION
      )
        return writeOut_2(e, { ok: !1, error: "it runs a different Claude Code build", code: "ESKEW" });
      if (!(await o.reply(u.text, { nextTurn: u.nextTurn === !0 }))) {
        if (
          (o.isBooting || (o.isSpawnPending && o.isReplyQueueOnly)) &&
          !o.isUnverified &&
          !o.record.legacy
        ) {
          let P = "ERESPAWNING";
          if (!o.isBooting && u.nextTurn !== !0) {
            let T = getJobDir(u.short);
            if (
              (isNonPromptInput(u.text, null) ||
                (await readJobStateOrAbsent(T, storageV5)
                  .then((y) =>
                    y === "absent"
                      ? o.dispatch.source === "spare"
                      : y !== null && isNonPromptInput(u.text, y),
                  )
                  .catch(() => !1))) &&
              !o.isBooting
            )
              P = "ENOREPLY";
          }
          return writeOut_2(e, { ok: !1, error: "the session is still starting", code: P });
        }
        return writeOut_2(e, {
          ok: !1,
          error: "job isn't accepting replies \u2014 it may be in a non-interactive state",
          code: "ENOREPLY",
        });
      }
      return writeOut_2(e, { ok: !0, op: "reply" });
    }
    case "kill": {
      if ((stallRespawnPending.delete(u.short), u.evict))
        updateRoster((P) => {
          delete P.workers[u.short];
        }, storageV5).catch((P) => logError(P));
      let o = handles.get(u.short);
      if (!o)
        return writeOut_2(e, {
          ok: !1,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      if (o.dispatch.launch.mode === "exec" && o.record.outcome)
        return (handles.delete(u.short), writeOut_2(e, { ok: !0, op: "kill" }));
      return (
        o.kill(u.signal ?? "SIGTERM", u.handoff ? "handoff" : "killed"),
        writeOut_2(e, { ok: !0, op: "kill" })
      );
    }
    case "respawn-stale": {
      er(legacyOpProbe, "respawn_stale");
      let o = handles.get(u.short);
      if (!o)
        return writeOut_2(e, {
          ok: !1,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      let respawnIfIdleStale = await o.respawnIfIdleStale();
      return writeOut_2(e, { ok: !0, op: "respawn-stale", ...respawnIfIdleStale });
    }
    case "resize": {
      let o = handles.get(u.short);
      if (!o)
        return writeOut_2(e, {
          ok: !1,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      if (u.attachId) {
        let P = o.attachers.get(u.attachId);
        if (!P) return writeOut_2(e, { ok: !0, op: "resize" });
        if (((P.cols = u.cols), (P.rows = u.rows), P.repaint))
          return (P.repaint(), writeOut_2(e, { ok: !0, op: "resize" }));
      }
      return (o.resize(u.cols, u.rows), writeOut_2(e, { ok: !0, op: "resize" }));
    }
    case "attach": {
      if (u.auth === void 0)
        logForDebugging("[bg-attach] legacy client (no control key) \u2014 allowed via peerUid", {
          level: "warn",
        });
      else if (!timingSafeEqualStrings(u.auth, controlKey))
        return writeOut_2(e, {
          ok: !1,
          error:
            "attach rejected: the presented daemon control key doesn't match \u2014 retry, and restart the Claude Code daemon if this persists",
          code: "EAUTH",
        });
      let o = handles.get(u.short);
      if (stallRespawnPending.has(u.short) && (!o || !Me(o)))
        return writeOut_2(e, {
          ok: !1,
          error: `worker ${RESPAWN_REASON_STALL} \u2014 restarting it; retry attach`,
          code: "ERESPAWNING",
        });
      if (!o || o.isKilling || (o.record.outcome && o.dispatch.launch.mode !== "exec"))
        return writeOut_2(e, {
          ok: !1,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      if (o.isUnverified)
        return writeOut_2(e, {
          ok: !1,
          error:
            "worker is live but supervisor could not verify its identity \u2014 try restarting the supervisor to re-adopt",
          code: "EUNVERIFIED",
        });
      if (o.isRetiring)
        return writeOut_2(e, { ok: !1, error: "job is retiring; retry attach", code: "ERESPAWNING" });
      if (o.record.legacy) {
        let dispatch = o.dispatch,
          F = await readJobState(getJobDir(dispatch.short), storageV5).catch(() => null),
          ge =
            F === null && dispatch.launch.mode !== "exec"
              ? await qXe(getJobDir(dispatch.short), storageV5)
              : void 0,
          me = F?.resumeSessionId ?? dispatch.sessionId,
          ye = F?.cwd ?? dispatch.cwd,
          $e = wrapStorageSource(getTranscriptStorageContext(storageV5)),
          Ie = await resolveJobTranscript(me, ye, F?.linkScanPath, void 0, $e),
          hasMessages = Ie.hasMessages;
        if (!hasMessages) await quarantineJobTranscript(Ie.path, $e);
        if (handles.get(u.short) !== o || e.destroyed)
          return writeOut_2(e, { ok: !1, error: "supervisor restarting", code: "ERESPAWNING" });
        if (!o.isKilling) {
          if ((logEvent("tengu_bg_attach_legacy_autorespawn", {}), ge)) YXe("legacy_attach", ge);
          (o.kill("SIGTERM"),
            onDispatch({
              ...dispatch,
              cwd: ye,
              source: "respawn",
              reattachEnv: void 0,
              launch: hasMessages
                ? {
                    mode: "resume",
                    sessionId: me,
                    transcriptPath: Ie.path,
                    fork: !1,
                    flagArgs:
                      F?.tempo === "active"
                        ? withReplyOnResume(F?.respawnFlags ?? dispatch.respawnFlags)
                        : withoutReplyOnResume(F?.respawnFlags ?? dispatch.respawnFlags),
                  }
                : me !== dispatch.sessionId
                  ? {
                      mode: "prompt",
                      args: ["--session-id", me, ...(F?.respawnFlags ?? dispatch.respawnFlags)],
                    }
                  : dispatch.launch,
            }).catch((mr) => logError(mr)));
        }
        return writeOut_2(e, {
          ok: !1,
          error: `${RESPAWN_REASON_LEGACY} job respawning with worker-owned PTY; retry attach`,
          code: "ERESPAWNING",
        });
      }
      if (o.isUpgrading)
        return writeOut_2(e, {
          ok: !1,
          error: `job is restarting on the ${RESPAWN_REASON_UPGRADE}; retry attach`,
          code: "ERESPAWNING",
        });
      if (await o.failIfHostExited("attach"))
        return writeOut_2(e, {
          ok: !1,
          error: o.dispatch.launch.mode === "exec" ? HOST_DIED_EXEC_ATTACH_MESSAGE : HOST_DIED_ATTACH_MESSAGE,
          code: "EHOSTDEAD",
        });
      if (e.destroyed) return;
      if (stallRespawnPending.has(u.short) && (handles.get(u.short) !== o || !Me(o)))
        return writeOut_2(e, {
          ok: !1,
          error: `worker ${RESPAWN_REASON_STALL} \u2014 restarting it; retry attach`,
          code: "ERESPAWNING",
        });
      if (
        handles.get(u.short) !== o ||
        o.isKilling ||
        (o.record.outcome && o.dispatch.launch.mode !== "exec")
      )
        return writeOut_2(e, {
          ok: !1,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      let P =
          o.liveTranscriptPath !== void 0
            ? o.liveTranscriptPath
            : o.dispatch.launch.mode === "resume"
              ? o.dispatch.launch.transcriptPath
              : void 0,
        T =
          u.holdingFrame !== !0 && o.isBooting && P != null
            ? readTranscriptTailPreview(P, u.cols, u.rows, {
                colorLevel: u.caps?.colorLevel,
                theme: u.caps?.systemTheme,
              })
            : null;
      addLease(e, null);
      let y = o.marksCapable ? randomBytes(16).toString("hex") : void 0;
      if (
        (e.write(
          jsonStringify({
            ok: !0,
            op: "attach",
            imarkNonce: y,
            decModes: o.decModeSnapshot(),
            via: o.via,
            booting: o.bootingForAttachMetrics,
            tempo: o.record.tempo,
            state: o.record.state,
            cached: T !== null,
            stale: Boolean(
              o.record.cliVersion &&
              o.record.cliVersion !==
                {
                  ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                  PACKAGE_URL: "@anthropic-ai/claude-code",
                  README_URL: "https://code.claude.com/docs/en/overview",
                  VERSION: "2.1.316",
                  FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                  BUILD_TIME: "2026-10-30T23:28:13Z",
                  GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                  HOOKS_WORKER_URL:
                    import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                  DD_SOURCEMAP_GROUP: "default",
                }.VERSION,
            ),
            workerCliVersion: o.record.cliVersion,
          }) +
            `
`,
        ),
        logEvent("tengu_bg_attach", {
          tempo: fromEnum(o.record.tempo),
          state: m5(o.record.state),
          via: fromEnum(o.via),
          attachers: o.attachers.size,
          stale: Boolean(
            o.record.cliVersion &&
            o.record.cliVersion !==
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION,
          ),
        }),
        T !== null)
      )
        e.write(ERASE_SCREEN + CURSOR_HOME + T);
      let Y = CURSOR_HOME + ERASE_LINE,
        q = 6,
        Q = [],
        oe = 0,
        le = "",
        ce = () => {},
        se,
        Ae = 0,
        Ee = !1,
        Te = getAttachStallMs(),
        xe = Te === 0 ? 0 : Math.max(1, Math.ceil((Te - Xt) / St)),
        De = (N) =>
          wrapDaemonHint(
            ERASE_SCREEN +
              CURSOR_HOME +
              `
  \x1B[2m${N}\x1B[0m
`,
          ),
        Se,
        H = !1,
        X = () => {
          if (!H) return;
          if (((H = !1), typeof o.replayInteractiveMarksTo === "function"))
            o.replayInteractiveMarksTo(u.attachId ?? e);
        },
        pe = (N) => {
          if (Q === null) return;
          Se?.();
          let F = Q;
          if (((Q = null), clearTimeout(at), N && !e.destroyed)) for (let ge of F) e.write(ge);
          if (((H = !0), N && F.length > 0)) X();
        },
        at = setTimeout(() => {
          let N = Q !== null && oe === 0,
            F = N && (u.holdingFrame === !0 || T !== null);
          if (!F) pe(!0);
          if (N && !e.destroyed) {
            if (!F) {
              let state = o.record.state,
                ye =
                  state === "starting" || state === "resuming" || state === "adopted" || state === "crashed"
                    ? "Session is starting \u2014 it will appear once ready. Ctrl+Z to detach"
                    : "Waiting for session to redraw\u2026 Ctrl+Z to detach";
              e.write(De(ye));
            }
            let now = Date.now();
            ((se = setInterval(() => {
              let now_2 = Date.now(),
                ye = now_2 - now;
              if (((now = now_2), ye > St * 3)) Ae = 0;
              if (
                (Ae++,
                xe > 0 &&
                  Ae >= xe &&
                  !o.isKilling &&
                  !o.isRetiring &&
                  !o.isBooting &&
                  o.dispatch.launch.mode !== "exec")
              ) {
                (clearInterval(se), (se = void 0), ce());
                let Ie = o.dispatch.attachStallRespawns ?? 0,
                  Be = { state: m5(o.record.state), via: fromEnum(o.via), attempt: Ie };
                if (Ie >= 2) {
                  if (
                    (logEvent("tengu_bg_attach_stall_gave_up", Be),
                    e.write(
                      De("Session keeps stalling at startup.") +
                        daemonDetachApc(
                          streamDetachMessage(
                            "ESTALLED",
                            u.caps?.sessionTabs,
                            `Session ${u.short} keeps stalling at startup \u2014 check ${getJobDir(u.short)} for logs.`,
                          ),
                        ),
                    ),
                    !o.isKilling)
                  )
                    o.kill("SIGKILL", "failed", "session keeps stalling at startup");
                  return;
                }
                if (
                  (logEvent("tengu_bg_attach_stall_respawn", Be),
                  e.write(De("Session not responding \u2014 restarting it\u2026")),
                  respawnStalledAttach(o, e, onDispatch, () => Ee, stallRespawnPending, storageV5),
                  !e.destroyed)
                )
                  e.write(
                    daemonDetachApc(
                      streamDetachMessage(
                        RESPAWNING_ATTACH_CODE,
                        u.caps?.sessionTabs,
                        `worker ${RESPAWN_REASON_STALL}, restarting`,
                      ),
                    ),
                  );
                return;
              }
              let $e = o.attachers.get(be);
              (ce(), (ce = o.resizeForRepaint($e?.cols ?? u.cols, $e?.rows ?? u.rows)));
            }, St)),
              se.unref());
          }
        }, Xt),
        vt = () => {
          if (se) (clearInterval(se), (se = void 0));
        },
        subscribe = o.onStream.subscribe((N) => {
          if (e.destroyed) return;
          if (((Ee = !0), Q !== null)) {
            let F = le + N;
            if (F.includes(ERASE_SCREEN) || F.includes(Y)) {
              vt();
              let ge = N.includes(ERASE_SCREEN) || N.includes(Y) ? N : F;
              if ((ce(), pe(!1), e.writableLength <= Fe))
                (e.write(o.decModeSnapshot().map(decset).join("") + ge), X());
              else e.destroy();
              return;
            }
            if ((Q.push(N), (oe += N.length), (le = F.slice(-q)), oe > 65536)) pe(!0);
            return;
          }
          if ((vt(), e.writableLength > Fe)) {
            e.destroy();
            return;
          }
          (e.write(N), X());
        }),
        subscribe_2 = o.onRepaintDone.subscribe(() => {
          (ce(), pe(!0));
        });
      if (getPlatform() === "windows") for (let N of o.attachers.values()) N.kick();
      let be = u.attachId ?? e;
      if (
        (o.attachers.set(be, {
          cols: u.cols,
          rows: u.rows,
          caps: u.caps,
          imarkNonce: y,
          deliver: (N) => {
            if (!e.destroyed) e.write(N);
          },
          kick: () => {
            if ((logEvent("tengu_bg_attach_kick", {}), se)) (clearInterval(se), (se = void 0));
            if (
              (clearTimeout(at), ce(), subscribe(), subscribe_2(), e.removeAllListeners("data"), !e.destroyed)
            )
              (e.write(daemonDetachApc(streamDetachMessage("EKICKED", u.caps?.sessionTabs, KICKED_NOTICE))),
                e.end());
            o.attachers.delete(be);
          },
        }),
        T !== null && P != null)
      ) {
        let N = o.attachers.get(be);
        if (N)
          ((N.repaint = () => {
            if (e.destroyed) return;
            o.resize(N.cols, N.rows);
            let F = readTranscriptTailPreview(P, N.cols, N.rows, {
              colorLevel: u.caps?.colorLevel,
              theme: u.caps?.systemTheme,
            });
            e.write(ERASE_SCREEN + CURSOR_HOME + (F ?? ""));
          }),
            (Se = () => {
              ((N.repaint = void 0), (Se = void 0));
            }));
      }
      (o.noteActivity(), o.seedFocus(!0), o.sendAttacherCaps(u.caps ?? null));
      let Ke;
      if (o.dispatch.launch.mode === "exec") {
        let N = wrapDaemonHint(ERASE_SCREEN + CURSOR_HOME);
        e.write(N);
        for (let F of o.ringSnapshot()) e.write(F);
        if (
          (pe(!1),
          (Ke = () => {
            let F = o.attachers.get(be);
            if (e.destroyed || !F) return;
            let ge =
                o.record.outcome === "done" ? "done" : o.record.outcome === "killed" ? "stopped" : "failed",
              me = wrapDaemonHint(`\r
\x1B[2m\u2014 ${ge} \xB7 Ctrl+Z to return \u2014\x1B[0m\r
`);
            (e.write(me),
              (F.repaint = () => {
                if (e.destroyed) return;
                e.write(N);
                for (let ye of o.ringSnapshot()) e.write(ye);
                e.write(me);
              }));
          }),
          o.record.outcome)
        ) {
          (Ke(),
            e.once("close", () => {
              (clearTimeout(at), subscribe(), subscribe_2(), o.attachers.delete(be));
            }));
          return;
        }
      }
      ce = o.resizeForRepaint(u.cols, u.rows);
      let subscribe_3 = o.onSettle.subscribe(() => {
          if (Ke && o.record.outcome !== "killed") return Ke();
          e.end();
        }),
        At = new StringDecoder("utf8"),
        pr = u.caps?.sessionTabs !== void 0,
        xt = (N) => {
          let write = At.write(N);
          if (write.length > 0 && (!Vt(write) || (pr && hasNonReportingMouseMode(write))))
            o.lastInputAttacher = be;
          o.write(write);
        };
      if (s.length) xt(s);
      (e.on("data", xt),
        e.once("close", () => {
          if (se) clearInterval(se);
          if ((ce(), pe(!1), subscribe(), subscribe_3(), subscribe_2(), !o.attachers.delete(be))) return;
          let end = At.end();
          if (end) o.write(end);
          if (o.attachers.size > 0) {
            let at = [...o.attachers.values()].at(-1);
            (o.resizeForRepaint(at.cols, at.rows),
              o.sendAttacherCaps(at.caps ? { ...at.caps, systemTheme: void 0 } : null));
          } else (o.seedFocus(!1), o.sendAttacherCaps(null));
        }));
      return;
    }
    case "ensure-spare":
      return (er(legacyOpProbe, "ensure_spare"), writeOut_2(e, { ok: !0, op: "ensure-spare" }));
    case "permission-response":
      if (!timingSafeEqualStrings(u.auth, controlKey))
        return writeOut_2(e, {
          ok: !1,
          error: "permission-response rejected: this client didn't present the daemon control key",
          code: "EAUTH",
        });
      return writeOut_2(e, { ok: !0, op: "permission-response" });
    case "subscribe": {
      let o = handles.get(u.short);
      if (!o)
        return writeOut_2(e, {
          ok: !1,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      if (
        (addLease(e, null),
        writeControlLine(e, { type: "snapshot", record: o.record, streamTail: o.tail(u.tail ?? 200) }),
        o.record.outcome)
      ) {
        (writeControlLine(e, { type: "settled", outcome: o.record.outcome }), e.end());
        return;
      }
      let P = [
        o.onStream.subscribe((T) => writeControlLine(e, { type: "stream", line: T })),
        o.onState.subscribe((T) => writeControlLine(e, { type: "state", patch: T })),
        o.onSettle.subscribe((T) => {
          (writeControlLine(e, { type: "settled", outcome: T }), e.end());
        }),
      ];
      e.on("close", () => {
        for (let T of P) T();
      });
      return;
    }
    default:
      return writeOut_2(e, { ok: !1, error: `unknown op: ${u.op}`, code: "EUNKNOWN" });
  }
}
//@ chunk-ksvdmrg0.js:50327-50407 placement
function Mn(r) {
  if (r === void 0) return;
  return fromEnumOpt(DAEMON_LEASE_LABELS.find((e) => e === r)) ?? lit("other");
}

export { regExp, RESET, bt, handleDaemonLease };
