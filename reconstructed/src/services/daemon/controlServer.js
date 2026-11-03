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
import { unlink } from "fs/promises";
import { createServer } from "net";
import { randomBytes } from "crypto";
import { StringDecoder } from "string_decoder";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { CONTROL_CHARS_EXCEPT_WS_RE, takeLastChars } from "../../utils/stringUtils.js";
import { sgrPatternSource, wrapAnsi } from "../../ink/wrapAnsi.js";
import { hardWrapAnsiLine } from "../../ink/termio/parser.js";
import { jsonParseRaw, jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { renderPluginPromptColon, TAG_OR_INTERRUPT_START_RE } from "../../utils/messages/pluginPrompts.js";
import { identity } from "../../tools/REPLTool/constants.js";
import { flattenPastedBlocks } from "../../utils/pastedContent.js";
import { configureMarked, formatTokenWindowed } from "../../utils/markdown.js";
import { marked } from "../../../vendor/marked/lib/marked.esm.js";
import { getCliHighlightModule } from "../../utils/cliHighlight.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  MAX_DAEMON_STDERR_LINES,
  MAX_DAEMON_STDERR_LINE_CHARS,
  MAX_WAIT_FOR_DAEMON_MS,
  MAX_DAEMON_WAIT_DETAIL_CHARS,
  isMarkdownTooComplex,
  MAX_DAEMON_STDERR_CHARS,
  isNonPromptInput,
  isTerminalReplyOnly,
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
import { probeJobState, logRestartWithoutSavedState } from "./reapJobs.js";
import { wrapStorageSource, getTranscriptStorageContext } from "../../utils/sessionStorage.js";
import { resolveJobTranscript, quarantineJobTranscript } from "../../utils/sessionStoragePortable.js";
import { withReplyOnResume, withoutReplyOnResume } from "../../cli/forwardedFlags.js";
import { logError } from "../../utils/log.js";
import { daemonControlSocket, redactDaemonPipeKey } from "../../utils/sandbox/userNamespace.js";
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
import { MAX_CARRIED_PROMPTS_VARIANT } from "../../utils/background/envCarry.js";
import { timingSafeEqualStrings } from "../../utils/sessionRecords.js";
import { updateRoster } from "./roster.js";
import { daemonSessionStateLabel } from "./sessionStatus.js";
import { ERASE_SCREEN, CURSOR_HOME, ERASE_LINE } from "../../ink/termio/csi.js";
import { getPlatform } from "../../utils/platform.js";

//@ chunk-ksvdmrg0.js:24104-24255 placement = DIM (0.387)
/**
 * 暗色文本的 ANSI 前缀 ESC[2m。
 */
var DIM = "\x1B[2m";
var RESET = "\x1B[0m";
var INDENT = 2;
var DARK = "dark";
var pointer = figures_default.pointer;
var SESSION_STARTING_NOTICE =
  "  Session is starting \u2014 showing its transcript until it appears. Ctrl+Z to detach";
//@ chunk-ksvdmrg0.js:24255-24395 placement
function sanitizeControlChars(text) {
  if (!/[\x00-\x09\x0b-\x1f\x7f-\x9f]/.test(text)) return text;
  return stripAnsiPerLine(text)
    .replace(/\t/g, "  ")
    .replace(CONTROL_CHARS_EXCEPT_WS_RE, "")
    .replace(/[\v\f\r]/g, "");
}
//@ chunk-ksvdmrg0.js:24395-24490 placement
var regExp = new RegExp(`(${sgrPatternSource(";")})`);
var regExp_2 = new RegExp(`^${sgrPatternSource(";")}$`);
var regExp_3 = new RegExp(regExp.source, "g");
//@ chunk-ksvdmrg0.js:24490-25056 placement
/**
 * 去掉文本中除允许的 SGR 以外的 CSI 序列，以及 OSC/DCS/SOS/PM/APC 字符串和其他 ESC 序列。
 */
function stripNonSgrEscapes(r) {
  if (!r.includes("\x1B")) return r;
  let output = "";
  let pos = 0;
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
      let w = index + 2;
      let p = r.length;
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
    } else if (h === undefined) pos = r.length;
    else pos = index + 2;
  }
  return output;
}
//@ chunk-ksvdmrg0.js:25498-25581 sole-consumer
function wrapAnsiHard(r, width) {
  return wrapAnsi(r, width, {
    hard: false,
    trim: false,
  })
    .split(
      `
`,
    )
    .flatMap((line) => hardWrapAnsiLine(line, width));
}
//@ chunk-ksvdmrg0.js:25581-26658 placement
/**
 * 解析一行转录 JSONL 为预览项：只取主线的 user/assistant 消息，用户文本、助手文本、工具调用（工具名+首个字符串参数）与思考分别成项。
 */
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
    entry.isSidechain === true ||
    entry.isMeta === true
  )
    return [];
  let content = entry.message?.content;
  if (typeof content === "string") {
    if (entry.type === "user") return toUserPreviewItem(renderPluginPromptColon(content, entry.pluginPrompt));
    let trimmed = content.trim();
    return trimmed === ""
      ? []
      : [
          {
            role: "assistant",
            text: trimmed,
          },
        ];
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
  let items = [];
  let pendingText = [];
  let flushText = () => {
    let trimmed = pendingText
      .join(
        `
`,
      )
      .trim();
    pendingText = [];
    if (trimmed !== "")
      items.push({
        role: "assistant",
        text: trimmed,
      });
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
      items.push({
        role: "tool",
        text: `${identity(S.name)}(${R})`,
      });
    } else if (S?.type === "thinking" && typeof S.thinking === "string" && S.thinking.trim() !== "") {
      flushText();
      items.push({
        role: "thinking",
        text: S.thinking,
      });
    }
  }
  flushText();
  return items;
}
//@ chunk-ksvdmrg0.js:26658-26850 placement
function toUserPreviewItem(r) {
  let trimmed = flattenPastedBlocks(r).trim();
  if (trimmed === "") return [];
  let match = /^<bash-input>([\s\S]*?)<\/bash-input>/.exec(trimmed);
  if (match) trimmed = `! ${match[1].trim()}`;
  else if (TAG_OR_INTERRUPT_START_RE.test(trimmed)) return [];
  return [
    {
      role: "user",
      text: trimmed,
    },
  ];
}
//@ chunk-ksvdmrg0.js:26850-27017 placement
function renderMarkdownForPreview(r, theme) {
  configureMarked();
  return stripNonSgrEscapes(
    marked
      .lexer(r)
      .map((n) =>
        formatTokenWindowed(n, theme, {
          listDepth: 0,
          orderedListNumber: null,
          parent: null,
          highlight: getCliHighlightModule(),
          linkCap: false,
          windowed: false,
        }),
      )
      .join(""),
  ).trim();
}
//@ chunk-ksvdmrg0.js:27017-28891 placement
/**
 * 渲染附着时显示的会话尾部预览：从转录末尾倒序取若干条（字符预算内），按角色着色、折行（助手消息尝试 Markdown 渲染），按终端行数从下往上裁剪，加分隔线与"会话启动中"提示。
 */
function renderTranscriptTail(r, columns, rows, options) {
  let max = Math.max(1, columns);
  let colorLevel = options?.colorLevel ?? INDENT;
  let theme = options?.theme ?? DARK;
  let dim = (y) => (colorLevel > 0 && y !== "" ? DIM + y + RESET : y);
  let rowsOf = (y) => Math.max(1, Math.ceil(bunStringWidth(y) / max));
  let R = "\u2500".repeat(max);
  let footer = ["", R, pointer, R, SESSION_STARTING_NOTICE];
  let reduced = footer.reduce((acc, Y) => acc + rowsOf(Y), 0);
  let availableRows = rows - reduced;
  if (availableRows < 1) return null;
  let min = Math.min(Math.ceil((availableRows + 1) / 2), MAX_DAEMON_STDERR_LINES);
  let lines = r.split(`
`);
  let items = [];
  let charBudget = MAX_DAEMON_STDERR_LINE_CHARS;
  e: for (let idx = lines.length - 1; idx >= 0; idx--) {
    let transcriptLineForPreview = parseTranscriptLineForPreview(lines[idx]);
    for (let idx = transcriptLineForPreview.length - 1; idx >= 0; idx--) {
      if (items.length >= min) break e;
      let Q = transcriptLineForPreview[idx];
      if (Q.text.length > charBudget) {
        if (items.length === 0) {
          let oe = takeLastChars(Q.text, charBudget);
          let index = oe.indexOf(`
`);
          if (index >= 0) oe = oe.slice(index + 1);
          if (oe.trim() !== "")
            items.unshift({
              role: Q.role,
              text: oe,
            });
        }
        break e;
      }
      charBudget -= Q.text.length;
      items.unshift(Q);
    }
  }
  if (items.length === 0) return null;
  let rendered = [];
  let gutter = max >= 4 ? 2 : 0;
  let max_2 = Math.max(1, max - gutter);
  let level = sequential.level;
  sequential.level = colorLevel;
  let startTime = performance.now();
  try {
    for (let item of items) {
      if (rendered.length > 0)
        rendered.push({
          text: "",
          dim: false,
        });
      let Y = sanitizeControlChars(item.text);
      switch (item.role) {
        case "tool": {
          let text = truncateToWidth(`${BLACK_CIRCLE} ${Y.replace(/\n/g, " ")}`, max);
          rendered.push({
            text,
            dim: true,
          });
          break;
        }
        case "thinking": {
          let trimmed = Y.replace(/\s+/g, " ").trim();
          for (let [Q, oe] of wrapAnsiHard(trimmed, max_2).entries()) {
            let le = gutter === 0 || oe === "" ? "" : Q === 0 ? `${THEREFORE} ` : "  ";
            rendered.push({
              text: le + sequential.italic(oe),
              dim: true,
            });
          }
          break;
        }
        case "assistant": {
          let q = Y;
          if (
            Y.length <= MAX_WAIT_FOR_DAEMON_MS &&
            performance.now() - startTime < MAX_DAEMON_WAIT_DETAIL_CHARS &&
            !isMarkdownTooComplex(Y)
          )
            try {
              q = renderMarkdownForPreview(Y, theme);
            } catch {
              q = Y;
            }
          let Q = color("text", theme)(BLACK_CIRCLE);
          for (let [oe, le] of wrapAnsiHard(q, max_2).entries()) {
            let ce = gutter === 0 || le === "" ? "" : oe === 0 ? `${Q} ` : "  ";
            rendered.push({
              text: ce + le,
              dim: false,
            });
          }
          break;
        }
        case "user": {
          let q = color("inactive", theme)(`${pointer} `);
          let Q = color("text", theme);
          let oe = color("userMessageBackground", theme, "background");
          for (let [le, ce] of wrapAnsiHard(Y, max_2).entries()) {
            let se = gutter === 0 ? "" : le === 0 ? q : "  ";
            rendered.push({
              text: oe(se + Q(ce)),
              dim: false,
            });
          }
          break;
        }
        default:
          item.role;
      }
    }
  } finally {
    sequential.level = level;
  }
  let usedRows = 0;
  let visible = [];
  for (let idx = rendered.length - 1; idx >= 0; idx--) {
    let Y = rendered[idx];
    let q = rowsOf(Y.text);
    if (usedRows + q > availableRows) break;
    usedRows += q;
    visible.unshift(Y.dim ? dim(Y.text) : Y.text);
  }
  if (visible.length === 0) return null;
  let padRows = rows - usedRows - reduced;
  let out = [];
  for (let idx = 0; idx < padRows; idx++) out.push("");
  out.push(...visible);
  for (let y of footer) out.push(dim(y));
  let joined = out.join(`\r
`);
  if (joined.length > 65536 + rows * max * 32) joined = joined.replace(regExp_3, "");
  return HIDE_CURSOR + joined;
}
//@ chunk-ksvdmrg0.js:28891-29251 placement
/**
 * 读取转录文件尾部（固定大小，从第一个完整行开始）并渲染预览。
 */
function readTranscriptTailPreview(r, columns, rows, options) {
  let h;
  try {
    let w = lstatSync(r);
    if (!w.isFile() || w.size === 0) return null;
    let size = w.size;
    h = openSync(r, "r");
    let max = Math.max(0, size - MAX_DAEMON_STDERR_CHARS);
    let S = Buffer.alloc(Math.min(size, MAX_DAEMON_STDERR_CHARS));
    let R = readSync(h, S, 0, S.length, max);
    let str = S.subarray(0, R).toString("utf8");
    if (max > 0) {
      let index = str.indexOf(`
`);
      if (index < 0) return null;
      str = str.slice(index + 1);
    }
    return renderTranscriptTail(str, columns, rows, options);
  } catch {
    return null;
  } finally {
    if (h !== undefined)
      try {
        closeSync(h);
      } catch {}
  }
}
//@ chunk-ksvdmrg0.js:29251-29315 placement
/**
 * 排空等待超时（30 秒）。
 */
var MAX_REQUEST_BYTES = 1048576;
var DEFAULT_ATTACH_STALL_MS = 5000;
var LONG_ARGV_THRESHOLD_BYTES = 12000;
var STATUS_TICK_MS = 1000;
var STATUS_GRACE_MS = 500;
var READY_TIMEOUT_MS = 6000;
var DRAIN_TIMEOUT_MS = 30000;
//@ chunk-ksvdmrg0.js:29315-29435 placement
function getAttachStallMs() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_bg_attach_stall_ms",
    DEFAULT_ATTACH_STALL_MS,
  );
  if (featureValue_CACHED_MAY_BE_STALE === 0) return 0;
  let e = processWrapperArgv().length > 0 ? LONG_ARGV_THRESHOLD_BYTES : 2000;
  return Math.max(e, featureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-ksvdmrg0.js:29435-30392 placement
/**
 * 附着卡住时重启后台会话：发 SIGTERM 等待退出，读取作业状态与转录，有消息则以 resume 方式（活跃时附带续答标志）重新派发，否则按会话 ID 或原启动方式重启。
 */
function respawnStalledAttach(worker, socket, dispatch, isClosing, respawning, storage) {
  let dispatch_2 = worker.dispatch;
  if (worker.getPhase().kind !== "running" || socket.destroyed || isClosing()) return;
  respawning.add(dispatch_2.short);
  let E = readJobState(getJobDir(dispatch_2.short), storage).catch(() => null);
  worker.kill("SIGTERM");
  (async () => {
    let S = Date.now() + READY_TIMEOUT_MS;
    while (Date.now() < S && !worker.record.outcome) await sleep(100);
    if (!respawning.has(dispatch_2.short)) return;
    let R = await readJobState(getJobDir(dispatch_2.short), storage).catch(() => null);
    let A = R === null ? await probeJobState(getJobDir(dispatch_2.short), storage) : undefined;
    let x = R?.resumeSessionId ?? dispatch_2.sessionId;
    let cwd = R?.cwd ?? dispatch_2.cwd;
    let M = wrapStorageSource(getTranscriptStorageContext(storage));
    let jobTranscript = await resolveJobTranscript(x, cwd, R?.linkScanPath, undefined, M);
    let hasMessages = jobTranscript.hasMessages;
    if (!hasMessages) await quarantineJobTranscript(jobTranscript.path, M);
    if (!respawning.has(dispatch_2.short)) return;
    let respawnFlags = R?.respawnFlags ?? dispatch_2.respawnFlags;
    let j = (await E)?.tempo === "active";
    if (A) logRestartWithoutSavedState("attach_stall", A);
    await dispatch({
      ...dispatch_2,
      cwd,
      source: "respawn",
      reattachEnv: undefined,
      attachStallRespawns: (dispatch_2.attachStallRespawns ?? 0) + 1,
      launch: hasMessages
        ? {
            mode: "resume",
            sessionId: x,
            transcriptPath: jobTranscript.path,
            fork: false,
            flagArgs: j ? withReplyOnResume(respawnFlags) : withoutReplyOnResume(respawnFlags),
          }
        : x !== dispatch_2.sessionId
          ? {
              mode: "prompt",
              args: ["--session-id", x, ...respawnFlags],
            }
          : dispatch_2.launch,
    });
  })()
    .catch((error) => logError(error))
    .finally(() => respawning.delete(dispatch_2.short));
}
//@ chunk-ksvdmrg0.js:30392-30411 placement
/**
 * socket 重试之间的等待（2500 毫秒）。
 */
var SOCKET_READY_TIMEOUT_MS = 1e4;
var SOCKET_RETRY_SLEEP_MS = 2500;
//@ chunk-ksvdmrg0.js:30411-32581 placement
async function handleDaemonLease(
  handles,
  onDispatch,
  onNudge,
  onShutdown = () => 0,
  ready = () => true,
  onYield = () => false,
  whenReady = new Promise(() => {}),
  storageV5,
) {
  let S = daemonControlSocket();
  await ensureDaemonRuntimeDir();
  let controlKey = await getOrCreateDaemonToken();
  await unlink(S).catch(() => {});
  let A = new Set();
  let stallRespawnPending = new Set();
  let L = new Map();
  let M = new Map();
  let signal = createSignal();
  let j = {
    handles,
    onDispatch,
    onNudge,
    onShutdown,
    ready,
    whenReady,
    onYield,
    addLease: (u, o) => {
      if (M.has(u)) return;
      M.set(u, o);
      let label = daemonLeaseLabel(o?.label);
      logEvent("tengu_daemon_lease", {
        op: lit("open"),
        label,
      });
      u.once("close", () => {
        M.delete(u);
        logEvent("tengu_daemon_lease", {
          op: lit("close"),
          label,
        });
        signal.emit({
          op: "close",
          client: o,
        });
      });
      signal.emit({
        op: "open",
        client: o,
      });
    },
    listLeases: () => {
      let u = [];
      for (let o of M.values()) if (o) u.push(o);
      return u;
    },
    stallRespawnPending,
    settledDispatches: L,
    controlKey,
    storageV5,
    legacyOpProbe: new FiredKeys(),
  };
  let ee = false;
  let server = createServer((u) => {
    if (ee) {
      u.destroy();
      return;
    }
    u.on("error", () => u.destroy());
    u.setTimeout(30000, () => u.destroy());
    A.add(u);
    u.once("close", () => A.delete(u));
    let o = describeUidMismatch(u);
    if (o) {
      logEvent("tengu_daemon_peer_uid_reject", {});
      u.once("data", () =>
        writeOut_2(u, {
          ok: false,
          code: "EPEERUID",
          error: o,
        }),
      );
      return;
    }
    let P = Buffer.alloc(0);
    let T = (G) => {
      P = Buffer.concat([P, G]);
      let index = P.indexOf(10);
      if (index < 0) {
        if (P.length > MAX_REQUEST_BYTES) {
          u.off("data", T);
          writeOut_2(u, {
            ok: false,
            code: "ETOOLARGE",
            error: `request exceeds ${MAX_REQUEST_BYTES >> 20}MB \u2014 shorten the prompt or send in parts`,
          });
        }
        return;
      }
      u.off("data", T);
      u.setTimeout(0);
      let str = P.subarray(0, index).toString("utf8");
      let chunk = P.subarray(index + 1);
      DaemonControlServer(j, u, str, chunk).catch((error) => {
        writeOut_2(u, {
          ok: false,
          error: errorMessage(error),
          code: "EUNKNOWN",
        });
      });
    };
    u.on("data", T);
  });
  let Z = false;
  server.on("error", (u) => {
    if (Z) {
      logForDebugging(`bg control server bind: ${redactDaemonPipeKey(errorMessage(u))}`, {
        level: "warn",
      });
      return;
    }
    logError(u);
  });
  let ae = Date.now() + SOCKET_READY_TIMEOUT_MS;
  for (;;)
    try {
      await new Promise((resolve, reject) => {
        let P = (T) => {
          Z = false;
          reject(T);
        };
        Z = true;
        server.once("error", P);
        server.listen(S, () => {
          Z = false;
          server.removeListener("error", P);
          resolve();
        });
      });
      break;
    } catch (error) {
      if (getErrnoCode(error) !== "EADDRINUSE" || Date.now() >= ae) throw error;
      server.removeAllListeners("listening");
      await sleep(100);
    }
  return {
    close: (u) =>
      new Promise((resolve) => {
        for (let P of A) P.destroy();
        if (u?.skipUnlink) {
          ee = true;
          server.unref();
          return void resolve();
        }
        server.close(() => {
          if (!u?.skipUnlink) unlink(S).catch(() => {});
          resolve();
        });
      }),
    leaseCount: () => M.size,
    onLeaseChange: signal,
    announceExit: (closing) => {
      for (let [o, P] of M)
        if (P?.label === CLOUD_SESSION_LEASE_LABEL)
          o.write(
            jsonStringify({
              op: "lease",
              closing,
            }) +
              `
`,
          );
    },
    noteSettledDispatch: (u, o, refusal) => {
      L.set(u, {
        nonce: o,
        refusal,
      });
      setTimeout(
        (T, G, y) => {
          if (T.get(G)?.nonce === y) T.delete(G);
        },
        DRAIN_TIMEOUT_MS,
        L,
        u,
        o,
      ).unref();
    },
  };
}
//@ chunk-ksvdmrg0.js:32635-32735 placement
function writeControlLine(r, e) {
  if (r.destroyed) return;
  if (r.writableLength > MAX_REQUEST_BYTES) {
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
/**
 * 判断 worker 是否干净可复用（没有结果、不在退役/杀死中）。
 */
function isWorkerClean(r) {
  return !r.record.outcome && !r.isRetiring && !r.isKilling;
}
//@ chunk-ksvdmrg0.js:32803-32865 placement
/**
 * 等待 25 毫秒（有 worker 记录时带截止时间）。
 */
function waitShort(r, outcome) {
  return r !== undefined && outcome === undefined ? withDeadline(r, 25) : sleep(25);
}
//@ chunk-ksvdmrg0.js:32865-33942 placement
/**
 * 等待某次派发被确认（最多 30 秒，可延长一次）：命中冷启动记录、或找到 nonce 一致的 worker 时回写成功；旧派发仍在清理时报 ESTALE，超时报 ETIMEOUT。
 */
async function awaitDispatchAck(workers, coldRecords, socket, op, short, nonce, timeoutMs, pendingOutcome) {
  let deadline = Date.now() + Math.min(timeoutMs, 30000);
  let extended = false;
  let sawStale = false;
  let staleWorker;
  let outcome;
  let M = pendingOutcome?.then(
    (U) => {
      outcome = U;
    },
    (error) => {
      logError(error);
      outcome = "dropped";
    },
  );
  while (Date.now() < deadline) {
    if (socket.destroyed) return;
    let U = outcome === "dup-live" || outcome === "dropped" || outcome === "refused" || outcome === "closed";
    let O = workers.get(short);
    let K = nonce !== undefined && O?.record.nonce !== nonce ? coldRecords.get(short) : undefined;
    if (K !== undefined && K.nonce === nonce) {
      if (K.refusal !== undefined)
        return writeOut_2(socket, {
          ok: false,
          error: K.refusal,
          code: "ECWDGONE",
        });
      return writeOut_2(socket, {
        ok: true,
        op,
        short,
        pid: 0,
        messagingSock: "",
        via: "cold",
      });
    }
    if (O) {
      if (nonce && O.record.nonce !== nonce) {
        sawStale = true;
        staleWorker = isWorkerClean(O) ? O : undefined;
        if (U) break;
        if (!staleWorker && !extended) {
          extended = true;
          deadline += Math.min(timeoutMs, 30000);
        }
        await waitShort(M, outcome);
        continue;
      }
      return writeOut_2(socket, {
        ok: true,
        op,
        short,
        pid: O.record.pid,
        messagingSock: O.record.messagingSock ?? "",
        via: O.via,
      });
    }
    staleWorker = undefined;
    if (U) break;
    await waitShort(M, outcome);
  }
  if (sawStale) {
    if (staleWorker && workers.get(short) === staleWorker && isWorkerClean(staleWorker))
      return writeOut_2(socket, {
        ok: true,
        op,
        short,
        pid: staleWorker.record.pid,
        messagingSock: staleWorker.record.messagingSock ?? "",
        via: staleWorker.via,
      });
    return writeOut_2(socket, {
      ok: false,
      error: "a previous dispatch with this id is still being cleaned up \u2014 retry in a moment",
      code: "ESTALE",
    });
  }
  return writeOut_2(socket, {
    ok: false,
    error: `${bgSupervisorNoun()} didn't acknowledge in time \u2014 retry`,
    code: "ETIMEOUT",
  });
}
//@ chunk-ksvdmrg0.js:33942-34037 placement
/**
 * 记录已上报过的事件键集合，避免重复上报。
 */
class FiredKeys {
  fired = new Set();
  markFired(r) {
    if (this.fired.has(r)) return false;
    this.fired.add(r);
    return true;
  }
}
//@ chunk-ksvdmrg0.js:34037-34125 placement
/**
 * 每类旧操作探针只上报一次埋点。
 */
function logLegacyOpProbeOnce(legacyOpProbe, e) {
  if (!legacyOpProbe.markFired(e)) return;
  logEvent("tengu_dead_probe_bg_legacy_op", {
    op: fromEnum(e),
  });
}
//@ chunk-ksvdmrg0.js:34125-50327 placement
/**
 * 后台守护进程控制服务：解析 JSON 请求、ping、会话租约
 */
async function DaemonControlServer(r, socket, n, s) {
  let {
    handles,
    onDispatch,
    onNudge,
    onShutdown,
    ready,
    whenReady,
    onYield,
    addLease,
    listLeases,
    stallRespawnPending,
    settledDispatches,
    controlKey,
    storageV5,
    legacyOpProbe,
  } = r;
  let ee;
  try {
    ee = jsonParse(n);
  } catch {
    return writeOut_2(socket, {
      ok: false,
      error: "bad json",
      code: "EUNKNOWN",
    });
  }
  if (ee === null || typeof ee !== "object")
    return writeOut_2(socket, {
      ok: false,
      error: "bad json",
      code: "EUNKNOWN",
    });
  let op = ee.op;
  if (op === "ping")
    return writeOut_2(socket, {
      ok: true,
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
      carriedPromptsFormat: MAX_CARRIED_PROMPTS_VARIANT,
    });
  if (op === "nudge") {
    let o = await onNudge();
    return writeOut_2(socket, {
      ok: true,
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
  if (op === "yield")
    return writeOut_2(socket, {
      ok: true,
      op: "yield",
      yielding: onYield(),
    });
  if (op === "lease") {
    let o = LeaseClientSchema().safeParse(ee.client).data;
    addLease(
      socket,
      o
        ? {
            ...o,
            pid: getPeerPid(socket) ?? o.pid,
          }
        : null,
    );
    socket.write(
      jsonStringify({
        ok: true,
        op: "lease",
      }) +
        `
`,
    );
    return;
  }
  if (op === "leases")
    return writeOut_2(socket, {
      ok: true,
      op: "leases",
      clients: listLeases(),
    });
  if (op === "shutdown") {
    let o = ee.reapWorkers !== false;
    let reaped = onShutdown(o);
    return writeOut_2(socket, {
      ok: true,
      op: "shutdown",
      reaped,
    });
  }
  if (!ready() && op === "attach") {
    await Promise.race([
      whenReady,
      sleep(SOCKET_RETRY_SLEEP_MS, undefined, {
        unref: true,
      }),
    ]);
    if (socket.destroyed) return;
  }
  if (!ready())
    return writeOut_2(socket, {
      ok: false,
      error: `${bgSupervisorNoun()} starting (adoption in progress)`,
      code: "ESTARTING",
    });
  let proto = ee.proto;
  if (typeof proto !== "number" || !Number.isInteger(proto) || proto < BG_PROTO_MIN || proto > BG_PROTO) {
    logEvent("tengu_bg_proto_mismatch", {
      client_proto: typeof proto === "number" ? proto : -1,
      server_proto: BG_PROTO,
    });
    return writeOut_2(socket, {
      ok: false,
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
    });
  }
  let ae = ControlRequestSchema().safeParse(ee);
  if (!ae.success)
    return writeOut_2(socket, {
      ok: false,
      error: `malformed request: ${ae.error.issues[0]?.message ?? "invalid"}`,
      code: "EUNKNOWN",
    });
  let u = ae.data;
  switch (u.op) {
    case "ping":
    case "nudge":
    case "yield":
    case "lease":
    case "leases":
    case "shutdown":
      return;
    case "list":
      return writeOut_2(socket, {
        ok: true,
        op: "list",
        jobs: Array.from(handles.values()).map((o) =>
          o.isKilling || o.isRetiring
            ? {
                ...o.record,
                dying: true,
              }
            : o.record,
        ),
      });
    case "has": {
      let o = handles.get(u.short);
      let P = stallRespawnPending.has(u.short);
      return writeOut_2(socket, {
        ok: true,
        op: "has",
        alive: (o !== undefined && isWorkerClean(o)) || P,
        present: o !== undefined || P,
        ready: o !== undefined && !o.isBooting,
      });
    }
    case "await-ack":
      return awaitDispatchAck(handles, settledDispatches, socket, "await-ack", u.short, u.nonce, u.timeoutMs);
    case "dispatch":
      if (!timingSafeEqualStrings(u.auth, controlKey))
        return writeOut_2(socket, {
          ok: false,
          error: "dispatch rejected: this client didn't present the daemon control key",
          code: "EAUTH",
        });
      await sleep(0);
      if (socket.readableEnded || socket.destroyed) {
        logEvent("tengu_bg_dispatch_stale_drop", {});
        return;
      }
      return awaitDispatchAck(
        handles,
        settledDispatches,
        socket,
        "dispatch",
        u.d.short,
        u.d.nonce,
        u.timeoutMs,
        onDispatch(u.d),
      );
    case "reply": {
      if (!timingSafeEqualStrings(u.auth, controlKey))
        return writeOut_2(socket, {
          ok: false,
          error:
            u.auth === undefined
              ? "reply rejected: this window didn't present the daemon control key \u2014 it is likely running a Claude Code older than the daemon (left open across an update?); restart this window and retry, or stop driving the control socket directly"
              : "reply rejected: the presented daemon control key doesn't match \u2014 retry, and restart the Claude Code daemon if this persists",
          code: "EAUTH",
        });
      let o = handles.get(u.short);
      if (stallRespawnPending.has(u.short) && (!o || !isWorkerClean(o)))
        return writeOut_2(socket, {
          ok: false,
          error: `worker ${RESPAWN_REASON_STALL} \u2014 restarting it; retry reply`,
          code: "ERESPAWNING",
        });
      if (!o || o.isRetiring || o.isKilling || o.record.outcome)
        return writeOut_2(socket, {
          ok: false,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      if (o.isUpgrading)
        return writeOut_2(socket, {
          ok: false,
          error: `job is restarting on the ${RESPAWN_REASON_UPGRADE}; retry reply`,
          code: "ERESPAWNING",
        });
      if (
        u.nextTurn === true &&
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
        return writeOut_2(socket, {
          ok: false,
          error: "it runs a different Claude Code build",
          code: "ESKEW",
        });
      if (
        !(await o.reply(u.text, {
          nextTurn: u.nextTurn === true,
        }))
      ) {
        if (
          (o.isBooting || (o.isSpawnPending && o.isReplyQueueOnly)) &&
          !o.isUnverified &&
          !o.record.legacy
        ) {
          let code = "ERESPAWNING";
          if (!o.isBooting && u.nextTurn !== true) {
            let jobDir = getJobDir(u.short);
            if (
              (isNonPromptInput(u.text, null) ||
                (await readJobStateOrAbsent(jobDir, storageV5)
                  .then((jobStateOrAbsent) =>
                    jobStateOrAbsent === "absent"
                      ? o.dispatch.source === "spare"
                      : jobStateOrAbsent !== null && isNonPromptInput(u.text, jobStateOrAbsent),
                  )
                  .catch(() => false))) &&
              !o.isBooting
            )
              code = "ENOREPLY";
          }
          return writeOut_2(socket, {
            ok: false,
            error: "the session is still starting",
            code,
          });
        }
        return writeOut_2(socket, {
          ok: false,
          error: "job isn't accepting replies \u2014 it may be in a non-interactive state",
          code: "ENOREPLY",
        });
      }
      return writeOut_2(socket, {
        ok: true,
        op: "reply",
      });
    }
    case "kill": {
      stallRespawnPending.delete(u.short);
      if (u.evict)
        updateRoster((P) => {
          delete P.workers[u.short];
        }, storageV5).catch((error) => logError(error));
      let o = handles.get(u.short);
      if (!o)
        return writeOut_2(socket, {
          ok: false,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      if (o.dispatch.launch.mode === "exec" && o.record.outcome) {
        handles.delete(u.short);
        return writeOut_2(socket, {
          ok: true,
          op: "kill",
        });
      }
      o.kill(u.signal ?? "SIGTERM", u.handoff ? "handoff" : "killed");
      return writeOut_2(socket, {
        ok: true,
        op: "kill",
      });
    }
    case "respawn-stale": {
      logLegacyOpProbeOnce(legacyOpProbe, "respawn_stale");
      let o = handles.get(u.short);
      if (!o)
        return writeOut_2(socket, {
          ok: false,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      let P = await o.respawnIfIdleStale();
      return writeOut_2(socket, {
        ok: true,
        op: "respawn-stale",
        ...P,
      });
    }
    case "resize": {
      let o = handles.get(u.short);
      if (!o)
        return writeOut_2(socket, {
          ok: false,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      if (u.attachId) {
        let P = o.attachers.get(u.attachId);
        if (!P)
          return writeOut_2(socket, {
            ok: true,
            op: "resize",
          });
        P.cols = u.cols;
        P.rows = u.rows;
        if (P.repaint) {
          P.repaint();
          return writeOut_2(socket, {
            ok: true,
            op: "resize",
          });
        }
      }
      o.resize(u.cols, u.rows);
      return writeOut_2(socket, {
        ok: true,
        op: "resize",
      });
    }
    case "attach": {
      if (u.auth === undefined)
        logForDebugging("[bg-attach] legacy client (no control key) \u2014 allowed via peerUid", {
          level: "warn",
        });
      else if (!timingSafeEqualStrings(u.auth, controlKey))
        return writeOut_2(socket, {
          ok: false,
          error:
            "attach rejected: the presented daemon control key doesn't match \u2014 retry, and restart the Claude Code daemon if this persists",
          code: "EAUTH",
        });
      let worker = handles.get(u.short);
      if (stallRespawnPending.has(u.short) && (!worker || !isWorkerClean(worker)))
        return writeOut_2(socket, {
          ok: false,
          error: `worker ${RESPAWN_REASON_STALL} \u2014 restarting it; retry attach`,
          code: "ERESPAWNING",
        });
      if (!worker || worker.isKilling || (worker.record.outcome && worker.dispatch.launch.mode !== "exec"))
        return writeOut_2(socket, {
          ok: false,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      if (worker.isUnverified)
        return writeOut_2(socket, {
          ok: false,
          error:
            "worker is live but supervisor could not verify its identity \u2014 try restarting the supervisor to re-adopt",
          code: "EUNVERIFIED",
        });
      if (worker.isRetiring)
        return writeOut_2(socket, {
          ok: false,
          error: "job is retiring; retry attach",
          code: "ERESPAWNING",
        });
      if (worker.record.legacy) {
        let dispatch = worker.dispatch;
        let F = await readJobState(getJobDir(dispatch.short), storageV5).catch(() => null);
        let ge =
          F === null && dispatch.launch.mode !== "exec"
            ? await probeJobState(getJobDir(dispatch.short), storageV5)
            : undefined;
        let me = F?.resumeSessionId ?? dispatch.sessionId;
        let cwd = F?.cwd ?? dispatch.cwd;
        let $e = wrapStorageSource(getTranscriptStorageContext(storageV5));
        let jobTranscript = await resolveJobTranscript(me, cwd, F?.linkScanPath, undefined, $e);
        let hasMessages = jobTranscript.hasMessages;
        if (!hasMessages) await quarantineJobTranscript(jobTranscript.path, $e);
        if (handles.get(u.short) !== worker || socket.destroyed)
          return writeOut_2(socket, {
            ok: false,
            error: "supervisor restarting",
            code: "ERESPAWNING",
          });
        if (!worker.isKilling) {
          logEvent("tengu_bg_attach_legacy_autorespawn", {});
          if (ge) logRestartWithoutSavedState("legacy_attach", ge);
          worker.kill("SIGTERM");
          onDispatch({
            ...dispatch,
            cwd,
            source: "respawn",
            reattachEnv: undefined,
            launch: hasMessages
              ? {
                  mode: "resume",
                  sessionId: me,
                  transcriptPath: jobTranscript.path,
                  fork: false,
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
          }).catch((error) => logError(error));
        }
        return writeOut_2(socket, {
          ok: false,
          error: `${RESPAWN_REASON_LEGACY} job respawning with worker-owned PTY; retry attach`,
          code: "ERESPAWNING",
        });
      }
      if (worker.isUpgrading)
        return writeOut_2(socket, {
          ok: false,
          error: `job is restarting on the ${RESPAWN_REASON_UPGRADE}; retry attach`,
          code: "ERESPAWNING",
        });
      if (await worker.failIfHostExited("attach"))
        return writeOut_2(socket, {
          ok: false,
          error:
            worker.dispatch.launch.mode === "exec" ? HOST_DIED_EXEC_ATTACH_MESSAGE : HOST_DIED_ATTACH_MESSAGE,
          code: "EHOSTDEAD",
        });
      if (socket.destroyed) return;
      if (stallRespawnPending.has(u.short) && (handles.get(u.short) !== worker || !isWorkerClean(worker)))
        return writeOut_2(socket, {
          ok: false,
          error: `worker ${RESPAWN_REASON_STALL} \u2014 restarting it; retry attach`,
          code: "ERESPAWNING",
        });
      if (
        handles.get(u.short) !== worker ||
        worker.isKilling ||
        (worker.record.outcome && worker.dispatch.launch.mode !== "exec")
      )
        return writeOut_2(socket, {
          ok: false,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      let P =
        worker.liveTranscriptPath !== undefined
          ? worker.liveTranscriptPath
          : worker.dispatch.launch.mode === "resume"
            ? worker.dispatch.launch.transcriptPath
            : undefined;
      let T =
        u.holdingFrame !== true && worker.isBooting && P != null
          ? readTranscriptTailPreview(P, u.cols, u.rows, {
              colorLevel: u.caps?.colorLevel,
              theme: u.caps?.systemTheme,
            })
          : null;
      addLease(socket, null);
      let imarkNonce = worker.marksCapable ? randomBytes(16).toString("hex") : undefined;
      socket.write(
        jsonStringify({
          ok: true,
          op: "attach",
          imarkNonce,
          decModes: worker.decModeSnapshot(),
          via: worker.via,
          booting: worker.bootingForAttachMetrics,
          tempo: worker.record.tempo,
          state: worker.record.state,
          cached: T !== null,
          stale: Boolean(
            worker.record.cliVersion &&
            worker.record.cliVersion !==
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
          workerCliVersion: worker.record.cliVersion,
        }) +
          `
`,
      );
      logEvent("tengu_bg_attach", {
        tempo: fromEnum(worker.record.tempo),
        state: daemonSessionStateLabel(worker.record.state),
        via: fromEnum(worker.via),
        attachers: worker.attachers.size,
        stale: Boolean(
          worker.record.cliVersion &&
          worker.record.cliVersion !==
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
        ),
      });
      if (T !== null) socket.write(ERASE_SCREEN + CURSOR_HOME + T);
      let Y = CURSOR_HOME + ERASE_LINE;
      let q = 6;
      let Q = [];
      let oe = 0;
      let le = "";
      let ce = () => {};
      let se;
      let Ae = 0;
      let Ee = false;
      let attachStallMs = getAttachStallMs();
      let xe =
        attachStallMs === 0 ? 0 : Math.max(1, Math.ceil((attachStallMs - STATUS_GRACE_MS) / STATUS_TICK_MS));
      let De = (N) =>
        wrapDaemonHint(
          ERASE_SCREEN +
            CURSOR_HOME +
            `
  \x1B[2m${N}\x1B[0m
`,
        );
      let Se;
      let H = false;
      let X = () => {
        if (!H) return;
        H = false;
        if (typeof worker.replayInteractiveMarksTo === "function")
          worker.replayInteractiveMarksTo(u.attachId ?? socket);
      };
      let pe = (N) => {
        if (Q === null) return;
        Se?.();
        let F = Q;
        Q = null;
        clearTimeout(timer);
        if (N && !socket.destroyed) for (let ge of F) socket.write(ge);
        H = true;
        if (N && F.length > 0) X();
      };
      let timer = setTimeout(() => {
        let N = Q !== null && oe === 0;
        let F = N && (u.holdingFrame === true || T !== null);
        if (!F) pe(true);
        if (N && !socket.destroyed) {
          if (!F) {
            let state = worker.record.state;
            let ye =
              state === "starting" || state === "resuming" || state === "adopted" || state === "crashed"
                ? "Session is starting \u2014 it will appear once ready. Ctrl+Z to detach"
                : "Waiting for session to redraw\u2026 Ctrl+Z to detach";
            socket.write(De(ye));
          }
          let now = Date.now();
          se = setInterval(() => {
            let now_2 = Date.now();
            let ye = now_2 - now;
            now = now_2;
            if (ye > STATUS_TICK_MS * 3) Ae = 0;
            Ae++;
            if (
              xe > 0 &&
              Ae >= xe &&
              !worker.isKilling &&
              !worker.isRetiring &&
              !worker.isBooting &&
              worker.dispatch.launch.mode !== "exec"
            ) {
              clearInterval(se);
              se = undefined;
              ce();
              let attachStallRespawns = worker.dispatch.attachStallRespawns ?? 0;
              let Be = {
                state: daemonSessionStateLabel(worker.record.state),
                via: fromEnum(worker.via),
                attempt: attachStallRespawns,
              };
              if (attachStallRespawns >= 2) {
                logEvent("tengu_bg_attach_stall_gave_up", Be);
                socket.write(
                  De("Session keeps stalling at startup.") +
                    daemonDetachApc(
                      streamDetachMessage(
                        "ESTALLED",
                        u.caps?.sessionTabs,
                        `Session ${u.short} keeps stalling at startup \u2014 check ${getJobDir(u.short)} for logs.`,
                      ),
                    ),
                );
                if (!worker.isKilling) worker.kill("SIGKILL", "failed", "session keeps stalling at startup");
                return;
              }
              logEvent("tengu_bg_attach_stall_respawn", Be);
              socket.write(De("Session not responding \u2014 restarting it\u2026"));
              respawnStalledAttach(worker, socket, onDispatch, () => Ee, stallRespawnPending, storageV5);
              if (!socket.destroyed)
                socket.write(
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
            let $e = worker.attachers.get(attachId);
            ce();
            ce = worker.resizeForRepaint($e?.cols ?? u.cols, $e?.rows ?? u.rows);
          }, STATUS_TICK_MS);
          se.unref();
        }
      }, STATUS_GRACE_MS);
      let vt = () => {
        if (se) {
          clearInterval(se);
          se = undefined;
        }
      };
      let st = worker.onStream.subscribe((N) => {
        if (socket.destroyed) return;
        Ee = true;
        if (Q !== null) {
          let F = le + N;
          if (F.includes(ERASE_SCREEN) || F.includes(Y)) {
            vt();
            let ge = N.includes(ERASE_SCREEN) || N.includes(Y) ? N : F;
            ce();
            pe(false);
            if (socket.writableLength <= MAX_REQUEST_BYTES) {
              socket.write(worker.decModeSnapshot().map(decset).join("") + ge);
              X();
            } else socket.destroy();
            return;
          }
          Q.push(N);
          oe += N.length;
          le = F.slice(-q);
          if (oe > 65536) pe(true);
          return;
        }
        vt();
        if (socket.writableLength > MAX_REQUEST_BYTES) {
          socket.destroy();
          return;
        }
        socket.write(N);
        X();
      });
      let lt = worker.onRepaintDone.subscribe(() => {
        ce();
        pe(true);
      });
      if (getPlatform() === "windows") for (let attacher of worker.attachers.values()) attacher.kick();
      let attachId = u.attachId ?? socket;
      worker.attachers.set(attachId, {
        cols: u.cols,
        rows: u.rows,
        caps: u.caps,
        imarkNonce,
        deliver: (N) => {
          if (!socket.destroyed) socket.write(N);
        },
        kick: () => {
          logEvent("tengu_bg_attach_kick", {});
          if (se) {
            clearInterval(se);
            se = undefined;
          }
          clearTimeout(timer);
          ce();
          st();
          lt();
          socket.removeAllListeners("data");
          if (!socket.destroyed) {
            socket.write(daemonDetachApc(streamDetachMessage("EKICKED", u.caps?.sessionTabs, KICKED_NOTICE)));
            socket.end();
          }
          worker.attachers.delete(attachId);
        },
      });
      if (T !== null && P != null) {
        let N = worker.attachers.get(attachId);
        if (N) {
          N.repaint = () => {
            if (socket.destroyed) return;
            worker.resize(N.cols, N.rows);
            let transcriptTailPreview = readTranscriptTailPreview(P, N.cols, N.rows, {
              colorLevel: u.caps?.colorLevel,
              theme: u.caps?.systemTheme,
            });
            socket.write(ERASE_SCREEN + CURSOR_HOME + (transcriptTailPreview ?? ""));
          };
          Se = () => {
            N.repaint = undefined;
            Se = undefined;
          };
        }
      }
      worker.noteActivity();
      worker.seedFocus(true);
      worker.sendAttacherCaps(u.caps ?? null);
      let Ke;
      if (worker.dispatch.launch.mode === "exec") {
        let N = wrapDaemonHint(ERASE_SCREEN + CURSOR_HOME);
        socket.write(N);
        for (let F of worker.ringSnapshot()) socket.write(F);
        pe(false);
        Ke = () => {
          let F = worker.attachers.get(attachId);
          if (socket.destroyed || !F) return;
          let ge =
            worker.record.outcome === "done"
              ? "done"
              : worker.record.outcome === "killed"
                ? "stopped"
                : "failed";
          let me = wrapDaemonHint(`\r
\x1B[2m\u2014 ${ge} \xB7 Ctrl+Z to return \u2014\x1B[0m\r
`);
          socket.write(me);
          F.repaint = () => {
            if (socket.destroyed) return;
            socket.write(N);
            for (let ye of worker.ringSnapshot()) socket.write(ye);
            socket.write(me);
          };
        };
        if (worker.record.outcome) {
          Ke();
          socket.once("close", () => {
            clearTimeout(timer);
            st();
            lt();
            worker.attachers.delete(attachId);
          });
          return;
        }
      }
      ce = worker.resizeForRepaint(u.cols, u.rows);
      let fr = worker.onSettle.subscribe(() => {
        if (Ke && worker.record.outcome !== "killed") return Ke();
        socket.end();
      });
      let At = new StringDecoder("utf8");
      let pr = u.caps?.sessionTabs !== undefined;
      let xt = (N) => {
        let F = At.write(N);
        if (F.length > 0 && (!isTerminalReplyOnly(F) || (pr && hasNonReportingMouseMode(F))))
          worker.lastInputAttacher = attachId;
        worker.write(F);
      };
      if (s.length) xt(s);
      socket.on("data", xt);
      socket.once("close", () => {
        if (se) clearInterval(se);
        ce();
        pe(false);
        st();
        fr();
        lt();
        if (!worker.attachers.delete(attachId)) return;
        let N = At.end();
        if (N) worker.write(N);
        if (worker.attachers.size > 0) {
          let last = [...worker.attachers.values()].at(-1);
          worker.resizeForRepaint(last.cols, last.rows);
          worker.sendAttacherCaps(
            last.caps
              ? {
                  ...last.caps,
                  systemTheme: undefined,
                }
              : null,
          );
        } else {
          worker.seedFocus(false);
          worker.sendAttacherCaps(null);
        }
      });
      return;
    }
    case "ensure-spare":
      logLegacyOpProbeOnce(legacyOpProbe, "ensure_spare");
      return writeOut_2(socket, {
        ok: true,
        op: "ensure-spare",
      });
    case "permission-response":
      if (!timingSafeEqualStrings(u.auth, controlKey))
        return writeOut_2(socket, {
          ok: false,
          error: "permission-response rejected: this client didn't present the daemon control key",
          code: "EAUTH",
        });
      return writeOut_2(socket, {
        ok: true,
        op: "permission-response",
      });
    case "subscribe": {
      let o = handles.get(u.short);
      if (!o)
        return writeOut_2(socket, {
          ok: false,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      addLease(socket, null);
      writeControlLine(socket, {
        type: "snapshot",
        record: o.record,
        streamTail: o.tail(u.tail ?? 200),
      });
      if (o.record.outcome) {
        writeControlLine(socket, {
          type: "settled",
          outcome: o.record.outcome,
        });
        socket.end();
        return;
      }
      let P = [
        o.onStream.subscribe((line) =>
          writeControlLine(socket, {
            type: "stream",
            line,
          }),
        ),
        o.onState.subscribe((patch) =>
          writeControlLine(socket, {
            type: "state",
            patch,
          }),
        ),
        o.onSettle.subscribe((outcome) => {
          writeControlLine(socket, {
            type: "settled",
            outcome,
          });
          socket.end();
        }),
      ];
      socket.on("close", () => {
        for (let T of P) T();
      });
      return;
    }
    default:
      return writeOut_2(socket, {
        ok: false,
        error: `unknown op: ${u.op}`,
        code: "EUNKNOWN",
      });
  }
}
//@ chunk-ksvdmrg0.js:50327-50407 placement
/**
 * 把租约标签解析成枚举值（未知归 other）。
 */
function daemonLeaseLabel(label) {
  if (label === undefined) return;
  return fromEnumOpt(DAEMON_LEASE_LABELS.find((e) => e === label)) ?? lit("other");
}
export { regExp, RESET, SOCKET_READY_TIMEOUT_MS, handleDaemonLease };
