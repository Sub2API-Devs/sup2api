/**
 * services/daemon/controlServer.ts
 *
 * 后台守护进程控制服务（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y2nrbm62.js (27)
 * attribution: placement 23, layout 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstatSync, openSync, readSync, closeSync } from "fs";
import { unlink } from "fs/promises";
import { createServer } from "net";
import { randomBytes } from "crypto";
import { StringDecoder } from "string_decoder";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { CONTROL_CHARS_EXCEPT_WS_RE, takeLastChars } from "../../utils/stringUtils.js";
import { sgrPatternSource, emptySgrState, applySgrToState, wrapAnsi } from "../../ink/wrapAnsi.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { jsonParseRaw, jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { renderPluginPromptColon, TAG_OR_INTERRUPT_START_RE } from "../../utils/messages/pluginPrompts.js";
import { shownToolName } from "../../tools/REPLTool/constants.js";
import { flattenPastedBlocks } from "../../utils/pastedContent.js";
import { configureMarked, formatTokenWindowed } from "../../utils/markdown.js";
import { marked } from "../../../vendor/marked/lib/marked.esm.js";
import { getCliHighlightModule } from "../../utils/cliHighlight.js";
import {
  MAX_DAEMON_STDERR_LINES,
  MAX_DAEMON_STDERR_LINE_CHARS,
  MAX_WAIT_FOR_DAEMON_MS,
  MAX_DAEMON_WAIT_DETAIL_CHARS,
  MAX_DAEMON_STDERR_CHARS,
  isNonPromptInput,
  isTerminalReplyOnly,
  hasNonReportingMouseMode,
} from "./spawnLauncher.js";
import { sequential } from "../../utils/sequential.js";
import { truncateToWidth } from "../../utils/format.js";
import { BLACK_CIRCLE, THEREFORE } from "../../constants/figures.js";
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
import {
  daemonControlSocket,
  ensureDaemonRuntimeDir,
  getOrCreateDaemonToken,
  redactDaemonPipeKey,
} from "./paths.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-y2nrbm62.js:11547-11823 placement
function isMarkdownTooComplex(text) {
  let openBrackets = 0;
  let setextRules = 0;
  let quoteDepth = 0;
  for (let line of text.split(`
`)) {
    let prefixLength = 0;
    while (prefixLength < line.length && (line[prefixLength] === ">" || line[prefixLength] === " ")) {
      if (line[prefixLength] === ">") quoteDepth++;
      prefixLength++;
    }
    if (/^ {0,3}(?:=+|-+)\s*$/.test(line)) setextRules++;
    for (let index = prefixLength; index < line.length; index++) {
      let char = line[index];
      if (char === "[") openBrackets++;
      else if (char === "]" && openBrackets > 0) openBrackets--;
    }
  }
  return openBrackets > 256 || setextRules > 64 || quoteDepth > 512;
}
//@ chunk-y2nrbm62.js:11823-11974 placement (2.1.88 match: DIM, 0.387)
/**
 * 暗色文本的 ANSI 前缀 ESC[2m。
 */
var DIM; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RESET;
var INDENT;
var DARK;
var pointer;
var SESSION_STARTING_NOTICE;
deferInit("chunk-y2nrbm62.js:11823", () => {
  DIM = "\x1B[2m";
  RESET = "\x1B[0m";
  INDENT = 2;
  DARK = "dark";
  pointer = figures_default.pointer;
  SESSION_STARTING_NOTICE =
    "  Session is starting \u2014 showing its transcript until it appears. Ctrl+Z to detach";
});
//@ chunk-y2nrbm62.js:11974-12114 placement
function sanitizeControlChars(text) {
  if (!/[\x00-\x09\x0b-\x1f\x7f-\x9f]/.test(text)) return text;
  return stripAnsiPerLine(text)
    .replace(/\t/g, "  ")
    .replace(CONTROL_CHARS_EXCEPT_WS_RE, "")
    .replace(/[\v\f\r]/g, "");
}
//@ chunk-y2nrbm62.js:12114-12209 placement
var regExp; // deferred: uses sgrPatternSource (../../ink/wrapAnsi.js) of its import cycle while loading; runs once the cycle is complete
var regExp_2;
var regExp_3;
deferInit("chunk-y2nrbm62.js:12114", () => {
  regExp = new RegExp(`(${sgrPatternSource(";")})`);
  regExp_2 = new RegExp(`^${sgrPatternSource(";")}$`);
  regExp_3 = new RegExp(regExp.source, "g");
});
//@ chunk-y2nrbm62.js:12209-12775 placement
/**
 * 去掉文本中除允许的 SGR 以外的 CSI 序列，以及 OSC/DCS/SOS/PM/APC 字符串和其他 ESC 序列。
 */
function stripNonSgrEscapes(text) {
  if (!text.includes("\x1B")) return text;
  let output = "";
  let pos = 0;
  while (pos < text.length) {
    let index = text.indexOf("\x1B", pos);
    if (index < 0) {
      output += text.slice(pos);
      break;
    }
    output += text.slice(pos, index);
    let kind = text[index + 1];
    if (kind === "[") {
      let cursor = index + 2;
      while (cursor < text.length) {
        let code = text.charCodeAt(cursor);
        if (code >= 64 && code <= 126) {
          let sliced = text.slice(index, cursor + 1);
          if (regExp_2.test(sliced)) output += sliced;
          cursor++;
          break;
        }
        if (code < 32 || code > 63) break;
        cursor++;
      }
      pos = cursor;
    } else if (kind === "]" || kind === "P" || kind === "X" || kind === "^" || kind === "_") {
      let cursor = index + 2;
      let end = text.length;
      while (cursor < text.length) {
        if (kind === "]" && text.charCodeAt(cursor) === 7) {
          end = cursor + 1;
          break;
        }
        if (text.charCodeAt(cursor) === 27 && text[cursor + 1] === "\\") {
          end = cursor + 2;
          break;
        }
        cursor++;
      }
      pos = end;
    } else if (kind === undefined) pos = text.length;
    else pos = index + 2;
  }
  return output;
}
//@ chunk-y2nrbm62.js:12775-12786 layout
var MAX_SGR_REOPEN = 128;
//@ chunk-y2nrbm62.js:12786-12882 layout
function reopenSgr(activeCodes) {
  let joined = activeCodes.filter((activeCode) => activeCode !== "").join(";");
  return joined === "" || joined.length > MAX_SGR_REOPEN ? "" : `\x1B[${joined}m`;
}
//@ chunk-y2nrbm62.js:12882-13217 layout
/**
 * 把一行带 ANSI 的文本按显示宽度硬折，换行处关闭活动样式、下一行重新打开。
 */
function hardWrapAnsiLine(line, width) {
  if (bunStringWidth(line) <= width) return [line];
  let lines = [];
  let current = "";
  let currentWidth = 0;
  let sgrState = emptySgrState();
  for (let part of line.split(regExp)) {
    if (part === "") continue;
    if (part.charCodeAt(0) === 27) {
      applySgrToState(part, sgrState);
      current += part;
      continue;
    }
    for (let { segment } of getGraphemeSegmenter().segment(part)) {
      let segmentWidth = segment.length === 1 && segment.charCodeAt(0) < 127 ? 1 : bunStringWidth(segment);
      if (currentWidth > 0 && currentWidth + segmentWidth > width) {
        lines.push(sgrState.some((code) => code !== "") ? current + RESET : current);
        current = reopenSgr(sgrState);
        currentWidth = 0;
      }
      current += segment;
      currentWidth += segmentWidth;
    }
  }
  lines.push(current);
  return lines;
}
//@ chunk-y2nrbm62.js:13217-13300 layout
function wrapAnsiHard(text, width) {
  return wrapAnsi(text, width, {
    hard: false,
    trim: false,
  })
    .split(
      `
`,
    )
    .flatMap((line) => hardWrapAnsiLine(line, width));
}
//@ chunk-y2nrbm62.js:13300-14378 placement
/**
 * 解析一行转录 JSONL 为预览项：只取主线的 user/assistant 消息，用户文本、助手文本、工具调用（工具名+首个字符串参数）与思考分别成项。
 */
function parseTranscriptLineForPreview(line) {
  let parsed;
  try {
    parsed = jsonParseRaw(line);
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
    let textParts = [];
    for (let part of content) {
      let block = part;
      if (block?.type === "text" && typeof block.text === "string") textParts.push(block.text);
    }
    return toUserPreviewItem(
      textParts.join(`
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
  for (let block of content) {
    let candidate = block;
    if (candidate?.type === "text" && typeof candidate.text === "string") pendingText.push(candidate.text);
    else if (candidate?.type === "tool_use" && typeof candidate.name === "string") {
      flushText();
      let inputSummary = "";
      if (typeof candidate.input === "object" && candidate.input !== null) {
        for (let inputValue of Object.values(candidate.input))
          if (typeof inputValue === "string" && inputValue !== "") {
            inputSummary = inputValue;
            break;
          }
      }
      items.push({
        role: "tool",
        text: `${shownToolName(candidate.name)}(${inputSummary})`,
      });
    } else if (
      candidate?.type === "thinking" &&
      typeof candidate.thinking === "string" &&
      candidate.thinking.trim() !== ""
    ) {
      flushText();
      items.push({
        role: "thinking",
        text: candidate.thinking,
      });
    }
  }
  flushText();
  return items;
}
//@ chunk-y2nrbm62.js:14378-14570 placement
function toUserPreviewItem(text) {
  let trimmed = flattenPastedBlocks(text).trim();
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
//@ chunk-y2nrbm62.js:14570-14737 placement
function renderMarkdownForPreview(markdown, theme) {
  configureMarked();
  return stripNonSgrEscapes(
    marked
      .lexer(markdown)
      .map((token) =>
        formatTokenWindowed(token, theme, {
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
//@ chunk-y2nrbm62.js:14737-16604 placement
/**
 * 渲染附着时显示的会话尾部预览：从转录末尾倒序取若干条（字符预算内），按角色着色、折行（助手消息尝试 Markdown 渲染），按终端行数从下往上裁剪，加分隔线与"会话启动中"提示。
 */
function renderTranscriptTail(stderrText, columns, rows, options) {
  let max = Math.max(1, columns);
  let colorLevel = options?.colorLevel ?? INDENT;
  let theme = options?.theme ?? DARK;
  let dim = (dim) => (colorLevel > 0 && dim !== "" ? DIM + dim + RESET : dim);
  let rowsOf = (rowCount) => Math.max(1, Math.ceil(bunStringWidth(rowCount) / max));
  let rule = "\u2500".repeat(max);
  let footer = ["", rule, pointer, rule, SESSION_STARTING_NOTICE];
  let reduced = footer.reduce((acc, footerLine) => acc + rowsOf(footerLine), 0);
  let availableRows = rows - reduced;
  if (availableRows < 1) return null;
  let min = Math.min(Math.ceil((availableRows + 1) / 2), MAX_DAEMON_STDERR_LINES);
  let lines = stderrText.split(`
`);
  let items = [];
  let charBudget = MAX_DAEMON_STDERR_LINE_CHARS;
  e: for (let idx = lines.length - 1; idx >= 0; idx--) {
    let transcriptLineForPreview = parseTranscriptLineForPreview(lines[idx]);
    for (let idx = transcriptLineForPreview.length - 1; idx >= 0; idx--) {
      if (items.length >= min) break e;
      let item = transcriptLineForPreview[idx];
      if (item.text.length > charBudget) {
        if (items.length === 0) {
          let tailText = takeLastChars(item.text, charBudget);
          let index = tailText.indexOf(`
`);
          if (index >= 0) tailText = tailText.slice(index + 1);
          if (tailText.trim() !== "")
            items.unshift({
              role: item.role,
              text: tailText,
            });
        }
        break e;
      }
      charBudget -= item.text.length;
      items.unshift(item);
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
      let text = sanitizeControlChars(item.text);
      switch (item.role) {
        case "tool": {
          let text_2 = truncateToWidth(`${BLACK_CIRCLE} ${text.replace(/\n/g, " ")}`, max);
          rendered.push({
            text: text_2,
            dim: true,
          });
          break;
        }
        case "thinking": {
          let text_2 = text.replace(/\s+/g, " ").trim();
          for (let [lineIndex, lineText] of wrapAnsiHard(text_2, max_2).entries()) {
            let prefix = gutter === 0 || lineText === "" ? "" : lineIndex === 0 ? `${THEREFORE} ` : "  ";
            rendered.push({
              text: prefix + sequential.italic(lineText),
              dim: true,
            });
          }
          break;
        }
        case "assistant": {
          let body = text;
          if (
            text.length <= MAX_WAIT_FOR_DAEMON_MS &&
            performance.now() - startTime < MAX_DAEMON_WAIT_DETAIL_CHARS &&
            !isMarkdownTooComplex(text)
          )
            try {
              body = renderMarkdownForPreview(text, theme);
            } catch {
              body = text;
            }
          let bullet = color("text", theme)(BLACK_CIRCLE);
          for (let [lineIndex, lineText] of wrapAnsiHard(body, max_2).entries()) {
            let prefix = gutter === 0 || lineText === "" ? "" : lineIndex === 0 ? `${bullet} ` : "  ";
            rendered.push({
              text: prefix + lineText,
              dim: false,
            });
          }
          break;
        }
        case "user": {
          let pointerPrefix = color("inactive", theme)(`${pointer} `);
          let styleText = color("text", theme);
          let styleBackground = color("userMessageBackground", theme, "background");
          for (let [lineIndex, lineText] of wrapAnsiHard(text, max_2).entries()) {
            let prefix = gutter === 0 ? "" : lineIndex === 0 ? pointerPrefix : "  ";
            rendered.push({
              text: styleBackground(prefix + styleText(lineText)),
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
    let entry = rendered[idx];
    let entryRows = rowsOf(entry.text);
    if (usedRows + entryRows > availableRows) break;
    usedRows += entryRows;
    visible.unshift(entry.dim ? dim(entry.text) : entry.text);
  }
  if (visible.length === 0) return null;
  let padRows = rows - usedRows - reduced;
  let out = [];
  for (let idx = 0; idx < padRows; idx++) out.push("");
  out.push(...visible);
  for (let footerLine of footer) out.push(dim(footerLine));
  let joined = out.join(`\r
`);
  if (joined.length > 65536 + rows * max * 32) joined = joined.replace(regExp_3, "");
  return HIDE_CURSOR + joined;
}
//@ chunk-y2nrbm62.js:16604-16964 placement
/**
 * 读取转录文件尾部（固定大小，从第一个完整行开始）并渲染预览。
 */
function readTranscriptTailPreview(path, columns, rows, options) {
  let fd;
  try {
    let stats = lstatSync(path);
    if (!stats.isFile() || stats.size === 0) return null;
    let size = stats.size;
    fd = openSync(path, "r");
    let max = Math.max(0, size - MAX_DAEMON_STDERR_CHARS);
    let buffer = Buffer.alloc(Math.min(size, MAX_DAEMON_STDERR_CHARS));
    let bytesRead = readSync(fd, buffer, 0, buffer.length, max);
    let stderrText = buffer.subarray(0, bytesRead).toString("utf8");
    if (max > 0) {
      let index = stderrText.indexOf(`
`);
      if (index < 0) return null;
      stderrText = stderrText.slice(index + 1);
    }
    return renderTranscriptTail(stderrText, columns, rows, options);
  } catch {
    return null;
  } finally {
    if (fd !== undefined)
      try {
        closeSync(fd);
      } catch {}
  }
}
//@ chunk-y2nrbm62.js:16964-17028 placement
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
//@ chunk-y2nrbm62.js:17028-17148 placement
function getAttachStallMs() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_bg_attach_stall_ms",
    DEFAULT_ATTACH_STALL_MS,
  );
  if (featureValue_CACHED_MAY_BE_STALE === 0) return 0;
  let floorMs = processWrapperArgv().length > 0 ? LONG_ARGV_THRESHOLD_BYTES : 2000;
  return Math.max(floorMs, featureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-y2nrbm62.js:17148-18108 placement
/**
 * 附着卡住时重启后台会话：发 SIGTERM 等待退出，读取作业状态与转录，有消息则以 resume 方式（活跃时附带续答标志）重新派发，否则按会话 ID 或原启动方式重启。
 */
function respawnStalledAttach(worker, socket, dispatch, isClosing, respawning, storage) {
  let dispatch_2 = worker.dispatch;
  if (worker.getPhase().kind !== "running" || socket.destroyed || isClosing()) return;
  respawning.add(dispatch_2.short);
  let statePromise = readJobState(getJobDir(dispatch_2.short), storage).catch(() => null);
  worker.kill("SIGTERM");
  (async () => {
    let deadline = Date.now() + READY_TIMEOUT_MS;
    while (Date.now() < deadline && !worker.record.outcome) await sleep(100);
    if (!respawning.has(dispatch_2.short)) return;
    let savedState = await readJobState(getJobDir(dispatch_2.short), storage).catch(() => null);
    let probe = savedState === null ? await probeJobState(getJobDir(dispatch_2.short), storage) : undefined;
    let sessionId = savedState?.resumeSessionId ?? dispatch_2.sessionId;
    let cwd = savedState?.cwd ?? dispatch_2.cwd;
    let storageSource = wrapStorageSource(getTranscriptStorageContext(storage));
    let jobTranscript = await resolveJobTranscript(
      sessionId,
      cwd,
      savedState?.linkScanPath,
      undefined,
      storageSource,
    );
    let hasMessages = jobTranscript.hasMessages;
    if (!hasMessages) await quarantineJobTranscript(jobTranscript.path, storageSource);
    if (!respawning.has(dispatch_2.short)) return;
    let respawnFlags = savedState?.respawnFlags ?? dispatch_2.respawnFlags;
    let wasActive = (await statePromise)?.tempo === "active";
    if (probe) logRestartWithoutSavedState("attach_stall", probe);
    await dispatch({
      ...dispatch_2,
      cwd,
      source: "respawn",
      reattachEnv: undefined,
      attachStallRespawns: (dispatch_2.attachStallRespawns ?? 0) + 1,
      launch: hasMessages
        ? {
            mode: "resume",
            sessionId,
            transcriptPath: jobTranscript.path,
            fork: false,
            flagArgs: wasActive ? withReplyOnResume(respawnFlags) : withoutReplyOnResume(respawnFlags),
          }
        : sessionId !== dispatch_2.sessionId
          ? {
              mode: "prompt",
              args: ["--session-id", sessionId, ...respawnFlags],
            }
          : dispatch_2.launch,
    });
  })()
    .catch((error) => logError(error))
    .finally(() => respawning.delete(dispatch_2.short));
}
//@ chunk-y2nrbm62.js:18108-18127 placement
/**
 * socket 重试之间的等待（2500 毫秒）。
 */
var SOCKET_READY_TIMEOUT_MS = 1e4;
var SOCKET_RETRY_SLEEP_MS = 2500;
//@ chunk-y2nrbm62.js:18127-20302 placement
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
  let socketPath = daemonControlSocket();
  await ensureDaemonRuntimeDir();
  let controlKey = await getOrCreateDaemonToken();
  await unlink(socketPath).catch(() => {});
  let connections = new Set();
  let stallRespawnPending = new Set();
  let settledDispatches = new Map();
  let leases = new Map();
  let signal = createSignal();
  let leaseHandles = {
    handles,
    onDispatch,
    onNudge,
    onShutdown,
    ready,
    whenReady,
    onYield,
    addLease: (socket, lease) => {
      if (leases.has(socket)) return;
      leases.set(socket, lease);
      let label = daemonLeaseLabel(lease?.label);
      logEvent("tengu_daemon_lease", {
        op: lit("open"),
        label,
      });
      socket.once("close", () => {
        leases.delete(socket);
        logEvent("tengu_daemon_lease", {
          op: lit("close"),
          label,
        });
        signal.emit({
          op: "close",
          client: lease,
        });
      });
      signal.emit({
        op: "open",
        client: lease,
      });
    },
    listLeases: () => {
      let list = [];
      for (let lease of leases.values()) if (lease) list.push(lease);
      return list;
    },
    stallRespawnPending,
    settledDispatches,
    controlKey,
    storageV5,
    legacyOpProbe: new FiredKeys(),
  };
  let closing = false;
  let server = createServer((socket) => {
    if (closing) {
      socket.destroy();
      return;
    }
    socket.on("error", () => socket.destroy());
    socket.setTimeout(30000, () => socket.destroy());
    connections.add(socket);
    socket.once("close", () => connections.delete(socket));
    let uidMismatch = describeUidMismatch(socket);
    if (uidMismatch) {
      logEvent("tengu_daemon_peer_uid_reject", {});
      socket.once("data", () =>
        writeOut_2(socket, {
          ok: false,
          code: "EPEERUID",
          error: uidMismatch,
        }),
      );
      return;
    }
    let buffer = Buffer.alloc(0);
    let onData = (data) => {
      buffer = Buffer.concat([buffer, data]);
      let index = buffer.indexOf(10);
      if (index < 0) {
        if (buffer.length > MAX_REQUEST_BYTES) {
          socket.off("data", onData);
          writeOut_2(socket, {
            ok: false,
            code: "ETOOLARGE",
            error: `request exceeds ${MAX_REQUEST_BYTES >> 20}MB \u2014 shorten the prompt or send in parts`,
          });
        }
        return;
      }
      socket.off("data", onData);
      socket.setTimeout(0);
      let str = buffer.subarray(0, index).toString("utf8");
      let initialData = buffer.subarray(index + 1);
      DaemonControlServer(leaseHandles, socket, str, initialData).catch((error) => {
        writeOut_2(socket, {
          ok: false,
          error: errorMessage(error),
          code: "EUNKNOWN",
        });
      });
    };
    socket.on("data", onData);
  });
  let binding = false;
  server.on("error", (error) => {
    if (binding) {
      logForDebugging(`bg control server bind: ${redactDaemonPipeKey(errorMessage(error))}`, {
        level: "warn",
      });
      return;
    }
    logError(error);
  });
  let deadline = Date.now() + SOCKET_READY_TIMEOUT_MS;
  for (;;)
    try {
      await new Promise((resolve, reject) => {
        let onListenError = (error) => {
          binding = false;
          reject(error);
        };
        binding = true;
        server.once("error", onListenError);
        server.listen(socketPath, () => {
          binding = false;
          server.removeListener("error", onListenError);
          resolve();
        });
      });
      break;
    } catch (error) {
      if (getErrnoCode(error) !== "EADDRINUSE" || Date.now() >= deadline) throw error;
      server.removeAllListeners("listening");
      await sleep(100);
    }
  return {
    close: (options) =>
      new Promise((resolve) => {
        for (let socket of connections) socket.destroy();
        if (options?.skipUnlink) {
          closing = true;
          server.unref();
          return void resolve();
        }
        server.close(() => {
          if (!options?.skipUnlink) unlink(socketPath).catch(() => {});
          resolve();
        });
      }),
    leaseCount: () => leases.size,
    onLeaseChange: signal,
    announceExit: (closing) => {
      for (let [socket, lease] of leases)
        if (lease?.label === CLOUD_SESSION_LEASE_LABEL)
          socket.write(
            jsonStringify({
              op: "lease",
              closing,
            }) +
              `
`,
          );
    },
    noteSettledDispatch: (dispatchId, nonce, refusal) => {
      settledDispatches.set(dispatchId, {
        nonce,
        refusal,
      });
      setTimeout(
        (map, dispatchId, nonce) => {
          if (map.get(dispatchId)?.nonce === nonce) map.delete(dispatchId);
        },
        DRAIN_TIMEOUT_MS,
        settledDispatches,
        dispatchId,
        nonce,
      ).unref();
    },
  };
}
//@ chunk-y2nrbm62.js:20356-20456 placement
function writeControlLine(stream, message) {
  if (stream.destroyed) return;
  if (stream.writableLength > MAX_REQUEST_BYTES) {
    stream.destroy();
    return;
  }
  stream.write(
    jsonStringify(message) +
      `
`,
  );
}
//@ chunk-y2nrbm62.js:20456-20524 placement
/**
 * 判断 worker 是否干净可复用（没有结果、不在退役/杀死中）。
 */
function isWorkerClean(supervisor) {
  return !supervisor.record.outcome && !supervisor.isRetiring && !supervisor.isKilling;
}
//@ chunk-y2nrbm62.js:20524-20586 placement
/**
 * 等待 25 毫秒（有 worker 记录时带截止时间）。
 */
function waitShort(promise, outcome) {
  return promise !== undefined && outcome === undefined ? withDeadline(promise, 25) : sleep(25);
}
//@ chunk-y2nrbm62.js:20586-21663 placement
/**
 * 等待某次派发被确认（最多 30 秒，可延长一次）：命中冷启动记录、或找到 nonce 一致的 worker 时回写成功；旧派发仍在清理时报 ESTALE，超时报 ETIMEOUT。
 */
async function awaitDispatchAck(workers, coldRecords, socket, op, short, nonce, timeoutMs, pendingOutcome) {
  let deadline = Date.now() + Math.min(timeoutMs, 30000);
  let extended = false;
  let sawStale = false;
  let staleWorker;
  let outcome;
  let pending = pendingOutcome?.then(
    (outcomeValue) => {
      outcome = outcomeValue;
    },
    (error) => {
      logError(error);
      outcome = "dropped";
    },
  );
  while (Date.now() < deadline) {
    if (socket.destroyed) return;
    let terminal =
      outcome === "dup-live" || outcome === "dropped" || outcome === "refused" || outcome === "closed";
    let worker = workers.get(short);
    let coldRecord =
      nonce !== undefined && worker?.record.nonce !== nonce ? coldRecords.get(short) : undefined;
    if (coldRecord !== undefined && coldRecord.nonce === nonce) {
      if (coldRecord.refusal !== undefined)
        return writeOut_2(socket, {
          ok: false,
          error: coldRecord.refusal,
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
    if (worker) {
      if (nonce && worker.record.nonce !== nonce) {
        sawStale = true;
        staleWorker = isWorkerClean(worker) ? worker : undefined;
        if (terminal) break;
        if (!staleWorker && !extended) {
          extended = true;
          deadline += Math.min(timeoutMs, 30000);
        }
        await waitShort(pending, outcome);
        continue;
      }
      return writeOut_2(socket, {
        ok: true,
        op,
        short,
        pid: worker.record.pid,
        messagingSock: worker.record.messagingSock ?? "",
        via: worker.via,
      });
    }
    staleWorker = undefined;
    if (terminal) break;
    await waitShort(pending, outcome);
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
//@ chunk-y2nrbm62.js:21663-21758 placement
/**
 * 记录已上报过的事件键集合，避免重复上报。
 */
class FiredKeys {
  fired = new Set();
  markFired(key) {
    if (this.fired.has(key)) return false;
    this.fired.add(key);
    return true;
  }
}
//@ chunk-y2nrbm62.js:21758-21846 placement
/**
 * 每类旧操作探针只上报一次埋点。
 */
function logLegacyOpProbeOnce(legacyOpProbe, op) {
  if (!legacyOpProbe.markFired(op)) return;
  logEvent("tengu_dead_probe_bg_legacy_op", {
    op: fromEnum(op),
  });
}
//@ chunk-y2nrbm62.js:21846-38047 placement
/**
 * 后台守护进程控制服务：解析 JSON 请求、ping、会话租约
 */
async function DaemonControlServer(host, socket, data, initialData) {
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
  } = host;
  let request;
  try {
    request = jsonParse(data);
  } catch {
    return writeOut_2(socket, {
      ok: false,
      error: "bad json",
      code: "EUNKNOWN",
    });
  }
  if (request === null || typeof request !== "object")
    return writeOut_2(socket, {
      ok: false,
      error: "bad json",
      code: "EUNKNOWN",
    });
  let op = request.op;
  if (op === "ping")
    return writeOut_2(socket, {
      ok: true,
      op: "ping",
      version: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      proto: BG_PROTO,
      carriedPromptsFormat: MAX_CARRIED_PROMPTS_VARIANT,
    });
  if (op === "nudge") {
    let nudgeResult = await onNudge();
    return writeOut_2(socket, {
      ok: true,
      op: "nudge",
      restarting: nudgeResult.restarting,
      upgradePending: nudgeResult.upgradePending,
      version: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
    let leaseClient = LeaseClientSchema().safeParse(request.client).data;
    addLease(
      socket,
      leaseClient
        ? {
            ...leaseClient,
            pid: getPeerPid(socket) ?? leaseClient.pid,
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
    let reapWorkers = request.reapWorkers !== false;
    let reaped = onShutdown(reapWorkers);
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
  let proto = request.proto;
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
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
    });
  }
  let parsed = ControlRequestSchema().safeParse(request);
  if (!parsed.success)
    return writeOut_2(socket, {
      ok: false,
      error: `malformed request: ${parsed.error.issues[0]?.message ?? "invalid"}`,
      code: "EUNKNOWN",
    });
  let msg = parsed.data;
  switch (msg.op) {
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
        jobs: Array.from(handles.values()).map((handle) =>
          handle.isKilling || handle.isRetiring
            ? {
                ...handle.record,
                dying: true,
              }
            : handle.record,
        ),
      });
    case "has": {
      let handle = handles.get(msg.short);
      let respawnPending = stallRespawnPending.has(msg.short);
      return writeOut_2(socket, {
        ok: true,
        op: "has",
        alive: (handle !== undefined && isWorkerClean(handle)) || respawnPending,
        present: handle !== undefined || respawnPending,
        ready: handle !== undefined && !handle.isBooting,
      });
    }
    case "await-ack":
      return awaitDispatchAck(
        handles,
        settledDispatches,
        socket,
        "await-ack",
        msg.short,
        msg.nonce,
        msg.timeoutMs,
      );
    case "dispatch":
      if (!timingSafeEqualStrings(msg.auth, controlKey))
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
        msg.d.short,
        msg.d.nonce,
        msg.timeoutMs,
        onDispatch(msg.d),
      );
    case "reply": {
      if (!timingSafeEqualStrings(msg.auth, controlKey))
        return writeOut_2(socket, {
          ok: false,
          error:
            msg.auth === undefined
              ? "reply rejected: this window didn't present the daemon control key \u2014 it is likely running a Claude Code older than the daemon (left open across an update?); restart this window and retry, or stop driving the control socket directly"
              : "reply rejected: the presented daemon control key doesn't match \u2014 retry, and restart the Claude Code daemon if this persists",
          code: "EAUTH",
        });
      let handle = handles.get(msg.short);
      if (stallRespawnPending.has(msg.short) && (!handle || !isWorkerClean(handle)))
        return writeOut_2(socket, {
          ok: false,
          error: `worker ${RESPAWN_REASON_STALL} \u2014 restarting it; retry reply`,
          code: "ERESPAWNING",
        });
      if (!handle || handle.isRetiring || handle.isKilling || handle.record.outcome)
        return writeOut_2(socket, {
          ok: false,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      if (handle.isUpgrading)
        return writeOut_2(socket, {
          ok: false,
          error: `job is restarting on the ${RESPAWN_REASON_UPGRADE}; retry reply`,
          code: "ERESPAWNING",
        });
      if (
        msg.nextTurn === true &&
        handle.record.cliVersion !==
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
        !(await handle.reply(msg.text, {
          nextTurn: msg.nextTurn === true,
        }))
      ) {
        if (
          (handle.isBooting || (handle.isSpawnPending && handle.isReplyQueueOnly)) &&
          !handle.isUnverified &&
          !handle.record.legacy
        ) {
          let code = "ERESPAWNING";
          if (!handle.isBooting && msg.nextTurn !== true) {
            let jobDir = getJobDir(msg.short);
            if (
              (isNonPromptInput(msg.text, null) ||
                (await readJobStateOrAbsent(jobDir, storageV5)
                  .then((jobStateOrAbsent) =>
                    jobStateOrAbsent === "absent"
                      ? handle.dispatch.source === "spare"
                      : jobStateOrAbsent !== null && isNonPromptInput(msg.text, jobStateOrAbsent),
                  )
                  .catch(() => false))) &&
              !handle.isBooting
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
      stallRespawnPending.delete(msg.short);
      if (msg.evict)
        updateRoster((roster) => {
          delete roster.workers[msg.short];
        }, storageV5).catch((error) => logError(error));
      let handle = handles.get(msg.short);
      if (!handle)
        return writeOut_2(socket, {
          ok: false,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      if (handle.dispatch.launch.mode === "exec" && handle.record.outcome) {
        handles.delete(msg.short);
        return writeOut_2(socket, {
          ok: true,
          op: "kill",
        });
      }
      handle.kill(msg.signal ?? "SIGTERM", msg.handoff ? "handoff" : "killed");
      return writeOut_2(socket, {
        ok: true,
        op: "kill",
      });
    }
    case "respawn-stale": {
      logLegacyOpProbeOnce(legacyOpProbe, "respawn_stale");
      let handle = handles.get(msg.short);
      if (!handle)
        return writeOut_2(socket, {
          ok: false,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      let result = await handle.respawnIfIdleStale();
      return writeOut_2(socket, {
        ok: true,
        op: "respawn-stale",
        ...result,
      });
    }
    case "resize": {
      let handle = handles.get(msg.short);
      if (!handle)
        return writeOut_2(socket, {
          ok: false,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      if (msg.attachId) {
        let attacher = handle.attachers.get(msg.attachId);
        if (!attacher)
          return writeOut_2(socket, {
            ok: true,
            op: "resize",
          });
        attacher.cols = msg.cols;
        attacher.rows = msg.rows;
        if (attacher.repaint) {
          attacher.repaint();
          return writeOut_2(socket, {
            ok: true,
            op: "resize",
          });
        }
      }
      handle.resize(msg.cols, msg.rows);
      return writeOut_2(socket, {
        ok: true,
        op: "resize",
      });
    }
    case "attach": {
      if (msg.auth === undefined)
        logForDebugging("[bg-attach] legacy client (no control key) \u2014 allowed via peerUid", {
          level: "warn",
        });
      else if (!timingSafeEqualStrings(msg.auth, controlKey))
        return writeOut_2(socket, {
          ok: false,
          error:
            "attach rejected: the presented daemon control key doesn't match \u2014 retry, and restart the Claude Code daemon if this persists",
          code: "EAUTH",
        });
      let worker = handles.get(msg.short);
      if (stallRespawnPending.has(msg.short) && (!worker || !isWorkerClean(worker)))
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
        let savedState = await readJobState(getJobDir(dispatch.short), storageV5).catch(() => null);
        let probeOutcome =
          savedState === null && dispatch.launch.mode !== "exec"
            ? await probeJobState(getJobDir(dispatch.short), storageV5)
            : undefined;
        let sessionId = savedState?.resumeSessionId ?? dispatch.sessionId;
        let cwd = savedState?.cwd ?? dispatch.cwd;
        let storageSource = wrapStorageSource(getTranscriptStorageContext(storageV5));
        let jobTranscript = await resolveJobTranscript(
          sessionId,
          cwd,
          savedState?.linkScanPath,
          undefined,
          storageSource,
        );
        let hasMessages = jobTranscript.hasMessages;
        if (!hasMessages) await quarantineJobTranscript(jobTranscript.path, storageSource);
        if (handles.get(msg.short) !== worker || socket.destroyed)
          return writeOut_2(socket, {
            ok: false,
            error: "supervisor restarting",
            code: "ERESPAWNING",
          });
        if (!worker.isKilling) {
          logEvent("tengu_bg_attach_legacy_autorespawn", {});
          if (probeOutcome) logRestartWithoutSavedState("legacy_attach", probeOutcome);
          worker.kill("SIGTERM");
          onDispatch({
            ...dispatch,
            cwd,
            source: "respawn",
            reattachEnv: undefined,
            launch: hasMessages
              ? {
                  mode: "resume",
                  sessionId,
                  transcriptPath: jobTranscript.path,
                  fork: false,
                  flagArgs:
                    savedState?.tempo === "active"
                      ? withReplyOnResume(savedState?.respawnFlags ?? dispatch.respawnFlags)
                      : withoutReplyOnResume(savedState?.respawnFlags ?? dispatch.respawnFlags),
                }
              : sessionId !== dispatch.sessionId
                ? {
                    mode: "prompt",
                    args: ["--session-id", sessionId, ...(savedState?.respawnFlags ?? dispatch.respawnFlags)],
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
      if (stallRespawnPending.has(msg.short) && (handles.get(msg.short) !== worker || !isWorkerClean(worker)))
        return writeOut_2(socket, {
          ok: false,
          error: `worker ${RESPAWN_REASON_STALL} \u2014 restarting it; retry attach`,
          code: "ERESPAWNING",
        });
      if (
        handles.get(msg.short) !== worker ||
        worker.isKilling ||
        (worker.record.outcome && worker.dispatch.launch.mode !== "exec")
      )
        return writeOut_2(socket, {
          ok: false,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      let liveTranscriptPath =
        worker.liveTranscriptPath !== undefined
          ? worker.liveTranscriptPath
          : worker.dispatch.launch.mode === "resume"
            ? worker.dispatch.launch.transcriptPath
            : undefined;
      let preview =
        msg.holdingFrame !== true && worker.isBooting && liveTranscriptPath != null
          ? readTranscriptTailPreview(liveTranscriptPath, msg.cols, msg.rows, {
              colorLevel: msg.caps?.colorLevel,
              theme: msg.caps?.systemTheme,
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
          cached: preview !== null,
          stale: Boolean(
            worker.record.cliVersion &&
            worker.record.cliVersion !==
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
              VERSION: "2.1.318",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-11-03T18:52:53Z",
              GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION,
        ),
      });
      if (preview !== null) socket.write(ERASE_SCREEN + CURSOR_HOME + preview);
      let eraseLineSeq = CURSOR_HOME + ERASE_LINE;
      let tailChars = 6;
      let buffered = [];
      let bufferedBytes = 0;
      let tail = "";
      let clearRepaint = () => {};
      let statusTimer;
      let statusTicks = 0;
      let sawOutput = false;
      let attachStallMs = getAttachStallMs();
      let stallTicks =
        attachStallMs === 0 ? 0 : Math.max(1, Math.ceil((attachStallMs - STATUS_GRACE_MS) / STATUS_TICK_MS));
      let renderNotice = (message) =>
        wrapDaemonHint(
          ERASE_SCREEN +
            CURSOR_HOME +
            `
  \x1B[2m${message}\x1B[0m
`,
        );
      let stopRepaint;
      let marksPending = false;
      let replayMarks = () => {
        if (!marksPending) return;
        marksPending = false;
        if (typeof worker.replayInteractiveMarksTo === "function")
          worker.replayInteractiveMarksTo(msg.attachId ?? socket);
      };
      let flushBuffer = (send) => {
        if (buffered === null) return;
        stopRepaint?.();
        let pending = buffered;
        buffered = null;
        clearTimeout(timer);
        if (send && !socket.destroyed) for (let chunk of pending) socket.write(chunk);
        marksPending = true;
        if (send && pending.length > 0) replayMarks();
      };
      let timer = setTimeout(() => {
        let needsStatus = buffered !== null && bufferedBytes === 0;
        let skipStatus = needsStatus && (msg.holdingFrame === true || preview !== null);
        if (!skipStatus) flushBuffer(true);
        if (needsStatus && !socket.destroyed) {
          if (!skipStatus) {
            let state = worker.record.state;
            let noticeText =
              state === "starting" || state === "resuming" || state === "adopted" || state === "crashed"
                ? "Session is starting \u2014 it will appear once ready. Ctrl+Z to detach"
                : "Waiting for session to redraw\u2026 Ctrl+Z to detach";
            socket.write(renderNotice(noticeText));
          }
          let now = Date.now();
          statusTimer = setInterval(() => {
            let now_2 = Date.now();
            let deltaMs = now_2 - now;
            now = now_2;
            if (deltaMs > STATUS_TICK_MS * 3) statusTicks = 0;
            statusTicks++;
            if (
              stallTicks > 0 &&
              statusTicks >= stallTicks &&
              !worker.isKilling &&
              !worker.isRetiring &&
              !worker.isBooting &&
              worker.dispatch.launch.mode !== "exec"
            ) {
              clearInterval(statusTimer);
              statusTimer = undefined;
              clearRepaint();
              let attachStallRespawns = worker.dispatch.attachStallRespawns ?? 0;
              let fields = {
                state: daemonSessionStateLabel(worker.record.state),
                via: fromEnum(worker.via),
                attempt: attachStallRespawns,
              };
              if (attachStallRespawns >= 2) {
                logEvent("tengu_bg_attach_stall_gave_up", fields);
                socket.write(
                  renderNotice("Session keeps stalling at startup.") +
                    daemonDetachApc(
                      streamDetachMessage(
                        "ESTALLED",
                        msg.caps?.sessionTabs,
                        `Session ${msg.short} keeps stalling at startup \u2014 check ${getJobDir(msg.short)} for logs.`,
                      ),
                    ),
                );
                if (!worker.isKilling) worker.kill("SIGKILL", "failed", "session keeps stalling at startup");
                return;
              }
              logEvent("tengu_bg_attach_stall_respawn", fields);
              socket.write(renderNotice("Session not responding \u2014 restarting it\u2026"));
              respawnStalledAttach(
                worker,
                socket,
                onDispatch,
                () => sawOutput,
                stallRespawnPending,
                storageV5,
              );
              if (!socket.destroyed)
                socket.write(
                  daemonDetachApc(
                    streamDetachMessage(
                      RESPAWNING_ATTACH_CODE,
                      msg.caps?.sessionTabs,
                      `worker ${RESPAWN_REASON_STALL}, restarting`,
                    ),
                  ),
                );
              return;
            }
            let attacher = worker.attachers.get(attachId);
            clearRepaint();
            clearRepaint = worker.resizeForRepaint(attacher?.cols ?? msg.cols, attacher?.rows ?? msg.rows);
          }, STATUS_TICK_MS);
          statusTimer.unref();
        }
      }, STATUS_GRACE_MS);
      let stopStatusTimer = () => {
        if (statusTimer) {
          clearInterval(statusTimer);
          statusTimer = undefined;
        }
      };
      let unsubscribeStream = worker.onStream.subscribe((chunk) => {
        if (socket.destroyed) return;
        sawOutput = true;
        if (buffered !== null) {
          let joined = tail + chunk;
          if (joined.includes(ERASE_SCREEN) || joined.includes(eraseLineSeq)) {
            stopStatusTimer();
            let toWrite = chunk.includes(ERASE_SCREEN) || chunk.includes(eraseLineSeq) ? chunk : joined;
            clearRepaint();
            flushBuffer(false);
            if (socket.writableLength <= MAX_REQUEST_BYTES) {
              socket.write(worker.decModeSnapshot().map(decset).join("") + toWrite);
              replayMarks();
            } else socket.destroy();
            return;
          }
          buffered.push(chunk);
          bufferedBytes += chunk.length;
          tail = joined.slice(-tailChars);
          if (bufferedBytes > 65536) flushBuffer(true);
          return;
        }
        stopStatusTimer();
        if (socket.writableLength > MAX_REQUEST_BYTES) {
          socket.destroy();
          return;
        }
        socket.write(chunk);
        replayMarks();
      });
      let unsubscribeRepaintDone = worker.onRepaintDone.subscribe(() => {
        clearRepaint();
        flushBuffer(true);
      });
      if (getPlatform() === "windows") for (let attacher of worker.attachers.values()) attacher.kick();
      let attachId = msg.attachId ?? socket;
      worker.attachers.set(attachId, {
        cols: msg.cols,
        rows: msg.rows,
        caps: msg.caps,
        imarkNonce,
        deliver: (data) => {
          if (!socket.destroyed) socket.write(data);
        },
        kick: () => {
          logEvent("tengu_bg_attach_kick", {});
          if (statusTimer) {
            clearInterval(statusTimer);
            statusTimer = undefined;
          }
          clearTimeout(timer);
          clearRepaint();
          unsubscribeStream();
          unsubscribeRepaintDone();
          socket.removeAllListeners("data");
          if (!socket.destroyed) {
            socket.write(
              daemonDetachApc(streamDetachMessage("EKICKED", msg.caps?.sessionTabs, KICKED_NOTICE)),
            );
            socket.end();
          }
          worker.attachers.delete(attachId);
        },
      });
      if (preview !== null && liveTranscriptPath != null) {
        let attacher = worker.attachers.get(attachId);
        if (attacher) {
          attacher.repaint = () => {
            if (socket.destroyed) return;
            worker.resize(attacher.cols, attacher.rows);
            let transcriptTailPreview = readTranscriptTailPreview(
              liveTranscriptPath,
              attacher.cols,
              attacher.rows,
              {
                colorLevel: msg.caps?.colorLevel,
                theme: msg.caps?.systemTheme,
              },
            );
            socket.write(ERASE_SCREEN + CURSOR_HOME + (transcriptTailPreview ?? ""));
          };
          stopRepaint = () => {
            attacher.repaint = undefined;
            stopRepaint = undefined;
          };
        }
      }
      worker.noteActivity();
      worker.seedFocus(true);
      worker.sendAttacherCaps(msg.caps ?? null);
      let showExecResult;
      if (worker.dispatch.launch.mode === "exec") {
        let header = wrapDaemonHint(ERASE_SCREEN + CURSOR_HOME);
        socket.write(header);
        for (let chunk of worker.ringSnapshot()) socket.write(chunk);
        flushBuffer(false);
        showExecResult = () => {
          let current = worker.attachers.get(attachId);
          if (socket.destroyed || !current) return;
          let outcomeLabel =
            worker.record.outcome === "done"
              ? "done"
              : worker.record.outcome === "killed"
                ? "stopped"
                : "failed";
          let footer = wrapDaemonHint(`\r
\x1B[2m\u2014 ${outcomeLabel} \xB7 Ctrl+Z to return \u2014\x1B[0m\r
`);
          socket.write(footer);
          current.repaint = () => {
            if (socket.destroyed) return;
            socket.write(header);
            for (let chunk of worker.ringSnapshot()) socket.write(chunk);
            socket.write(footer);
          };
        };
        if (worker.record.outcome) {
          showExecResult();
          socket.once("close", () => {
            clearTimeout(timer);
            unsubscribeStream();
            unsubscribeRepaintDone();
            worker.attachers.delete(attachId);
          });
          return;
        }
      }
      clearRepaint = worker.resizeForRepaint(msg.cols, msg.rows);
      let unsubscribeSettle = worker.onSettle.subscribe(() => {
        if (showExecResult && worker.record.outcome !== "killed") return showExecResult();
        socket.end();
      });
      let inputDecoder = new StringDecoder("utf8");
      let hasTabs = msg.caps?.sessionTabs !== undefined;
      let onInput = (data) => {
        let text = inputDecoder.write(data);
        if (text.length > 0 && (!isTerminalReplyOnly(text) || (hasTabs && hasNonReportingMouseMode(text))))
          worker.lastInputAttacher = attachId;
        worker.write(text);
      };
      if (initialData.length) onInput(initialData);
      socket.on("data", onInput);
      socket.once("close", () => {
        if (statusTimer) clearInterval(statusTimer);
        clearRepaint();
        flushBuffer(false);
        unsubscribeStream();
        unsubscribeSettle();
        unsubscribeRepaintDone();
        if (!worker.attachers.delete(attachId)) return;
        let rest = inputDecoder.end();
        if (rest) worker.write(rest);
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
      if (!timingSafeEqualStrings(msg.auth, controlKey))
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
      let handle = handles.get(msg.short);
      if (!handle)
        return writeOut_2(socket, {
          ok: false,
          error: "job not found \u2014 it may have already exited",
          code: "ENOJOB",
        });
      addLease(socket, null);
      writeControlLine(socket, {
        type: "snapshot",
        record: handle.record,
        streamTail: handle.tail(msg.tail ?? 200),
      });
      if (handle.record.outcome) {
        writeControlLine(socket, {
          type: "settled",
          outcome: handle.record.outcome,
        });
        socket.end();
        return;
      }
      let unsubscribes = [
        handle.onStream.subscribe((line) =>
          writeControlLine(socket, {
            type: "stream",
            line,
          }),
        ),
        handle.onState.subscribe((patch) =>
          writeControlLine(socket, {
            type: "state",
            patch,
          }),
        ),
        handle.onSettle.subscribe((outcome) => {
          writeControlLine(socket, {
            type: "settled",
            outcome,
          });
          socket.end();
        }),
      ];
      socket.on("close", () => {
        for (let unsubscribe of unsubscribes) unsubscribe();
      });
      return;
    }
    default:
      return writeOut_2(socket, {
        ok: false,
        error: `unknown op: ${msg.op}`,
        code: "EUNKNOWN",
      });
  }
}
//@ chunk-y2nrbm62.js:38047-38127 placement
/**
 * 把租约标签解析成枚举值（未知归 other）。
 */
function daemonLeaseLabel(label) {
  if (label === undefined) return;
  return fromEnumOpt(DAEMON_LEASE_LABELS.find((candidate) => candidate === label)) ?? lit("other");
}
export { handleDaemonLease, SOCKET_READY_TIMEOUT_MS };
