/**
 * utils/wireToolInputEcho.ts
 *
 * 2.1.316 新增：线上工具输入回显
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (52)
 * attribution: placement 52
 */
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
  isDeepStrictEqual as isDeepStrictEqual_5,
  isDeepStrictEqual as isDeepStrictEqual_6,
  isDeepStrictEqual as isDeepStrictEqual_7,
  isDeepStrictEqual as isDeepStrictEqual_8,
  isDeepStrictEqual as isDeepStrictEqual_9,
  isDeepStrictEqual as isDeepStrictEqual_10,
  isDeepStrictEqual as isDeepStrictEqual_11,
  isDeepStrictEqual as isDeepStrictEqual_12,
  isDeepStrictEqual as isDeepStrictEqual_13,
  isDeepStrictEqual as isDeepStrictEqual_14,
  isDeepStrictEqual as isDeepStrictEqual_15,
  isDeepStrictEqual as isDeepStrictEqual_16,
  isDeepStrictEqual as isDeepStrictEqual_17,
  isDeepStrictEqual as isDeepStrictEqual_18,
  isDeepStrictEqual as isDeepStrictEqual_19,
} from "util";
import { createEnvAccessor } from "./env/envRegistry.js";
import { Ao } from "../bootstrap/sessionFeatureValues.js";
import { getAPIProvider } from "./model/providers.js";
import { canSendFirstPartyBetas } from "./betas.js";
import { safeParseJSON } from "./json.js";
import { isPlainObject as isPlainObject_3 } from "./objectUtils.js";
import { clone, jsonStringify, jsonParseRaw, jsonStringifyRaw } from "./slowOperations.js";
import { logError } from "./log.js";
import { logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { isFoamySpringEnabled } from "../services/analytics/growthbookGates.js";
import { env } from "./env.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../services/analytics/growthbook.js";
import { latestPromptSnapshot } from "./contextAttachments/promptSnapshot.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { isRemoteOnlyCheck } from "./permissions/checkRegistry.js";
import { getCwd } from "./cwd.js";
import { getPlatform } from "./platform.js";
import { windowsPathToPosixPath } from "./path.js";
import { stripLineNumberPrefix as stripLineNumberPrefix_2 } from "./file.js";
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";
import { isPlainObject as isPlainObject_4 } from "./isPlainObject.js";
import { FILE_EDIT_TOOL_NAME } from "../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { getRootSession } from "../bootstrap/state.js";
import { findToolByName } from "../Tool.js";
import { normalizeToolInput, repairDoubleEscapedUnicode } from "./wireToolInputRepair.js";
import { isMultiEntryAliasTool } from "../services/tools/permissionCheckGuard.js";
import { logForDebugging } from "./debug.js";
import { toolCategoryForTelemetry } from "../services/api/toolDefinitionShape.js";
import { getUnknownToolAnalyticsName, sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import { RETIRED_TOOL_NAMES } from "../tools/retiredTools.js";
import { WORKFLOW_TOOL_NAME } from "../tools/WorkflowTool/constants.js";
import { WEt, stripTrailingWhitespace, desanitizeMatchString } from "../tools/FileEditTool/utils.js";
import { coerceNumberString } from "../tools/ArtifactTool/publishEdits.js";
import { stripHostOwnedInputKeys } from "./permissions/permissionAnswer.js";
import { EXITPLANMODE_2 } from "../tools/ExitPlanModeTool/constants.js";
import { coerceBooleanString } from "./spellcheck.js";

//@ chunk-e6aww6q8.js:318714-318782 placement
var tetherShape = require("./chunk-hy3czzmn.js").tetherShape,
  ijt = createEnvAccessor(tetherShape, null);
/**
 * 是否通过 CLAUDE_CODE_TETHER_LIVE 启用线上工具输入回显（第一方且可发 beta）。
 */
//@ chunk-e6aww6q8.js:318782-318923 placement
function isTetherEnvOptIn() {
  {
    let e = Ao();
    return (
      (e.threadsEnvOptIn ??=
        ijt.CLAUDE_CODE_TETHER_LIVE === !0 && getAPIProvider() === "firstParty" && canSendFirstPartyBetas()),
      e.threadsEnvOptIn
    );
  }
  return !1;
}
//@ chunk-e6aww6q8.js:318923-318965 placement
function LHe() {
  return Object.create(null);
}
/**
 * 从响应内容块中捕获各 tool_use 的原始输入（字符串输入解析为 JSON），返回按 id 的输入表与是否有解析失败。
 */
//@ chunk-e6aww6q8.js:318965-319430 placement
function captureWireToolInputs(e) {
  if (!e) return { inputs: void 0, degraded: !1 };
  try {
    let n,
      r = !1;
    for (let s of e) {
      if (s.type !== "tool_use" || typeof s.id !== "string") continue;
      let input = s.input,
        y,
        S = !1;
      if (typeof input === "string")
        if (input.length === 0) y = {};
        else {
          let w = safeParseJSON(input, !1);
          if (w === null && input.trim() !== "null") {
            r = !0;
            continue;
          }
          y = w ?? {};
        }
      else ((y = input), (S = !0));
      if (!isPlainObject_3(y)) continue;
      ((n ??= LHe()), (n[s.id] = S ? clone(y) : y));
    }
    return { inputs: n, degraded: r };
  } catch (error) {
    return (
      logError(error),
      logFeatureBad("tether_wire_tool_input", "capture_threw"),
      { inputs: void 0, degraded: !1 }
    );
  }
}
//@ chunk-e6aww6q8.js:319430-319488 placement
function FHe() {
  logFeatureSad("tether_wire_tool_input", "parse_failed");
}
//@ chunk-e6aww6q8.js:319488-319857 placement = countToolCallsSince (1)
function countToolCallsSince_2(e, n, r) {
  if (!isPlainObject_3(e) || !Array.isArray(n)) return;
  let s,
    h = (S) => {
      if (!Object.hasOwn(e, S)) return;
      let w = e[S];
      if (!isPlainObject_3(w)) return;
      ((s ??= LHe()), (s[S] = w));
    },
    y = [];
  for (let S of n)
    if (isPlainObject_3(S) && S.type === "tool_use" && typeof S.id === "string") (y.push(S.id), h(S.id));
  if (Array.isArray(r)) {
    let S = collectIdPrefixesWithNumericSuffix(y);
    for (let message of r) {
      if (!isPlainObject_3(message)) continue;
      let id = message.id;
      if (typeof id === "string" && S.has(id)) h(id);
    }
  }
  return s;
}
//@ chunk-e6aww6q8.js:319857-319873 placement
var DIGITS_RE = /^\d+$/;
//@ chunk-e6aww6q8.js:319873-320007 placement
function collectIdPrefixesWithNumericSuffix(e) {
  let n = new Set();
  for (let r of e) {
    let index = r.lastIndexOf("_");
    if (index !== -1 && DIGITS_RE.test(r.slice(index + 1))) n.add(r.slice(0, index));
  }
  return n;
}
//@ chunk-e6aww6q8.js:320007-320311 placement = countToolCallsSince (1)
function countToolCallsSince_3(e, n, r) {
  if (!isPlainObject_3(e)) return;
  let s,
    h = (S) => {
      if (Object.hasOwn(e, S)) ((s ??= LHe()), (s[S] = e[S]));
    },
    y = [];
  for (let S of n) if (S.type === "tool_use" && typeof S.id === "string") (y.push(S.id), h(S.id));
  if (Array.isArray(r)) {
    let S = collectIdPrefixesWithNumericSuffix(y);
    for (let message of r) {
      let L = isPlainObject_3(message) ? message.id : void 0;
      if (typeof L === "string" && S.has(L)) h(L);
    }
  }
  return s;
}
//@ chunk-e6aww6q8.js:320311-320342 placement
var TENGU_HUMBLE_HAMMOCK = "tengu_humble_hammock";
//@ chunk-e6aww6q8.js:320342-320369 placement
function isServerClassifierEnabled() {
  return isFoamySpringEnabled();
}
//@ chunk-e6aww6q8.js:320369-320467 placement
function getForcedEchoWireToolInputs() {
  let CLAUDE_CODE_HUMBLE_HAMMOCK = env.CLAUDE_CODE_HUMBLE_HAMMOCK;
  if (CLAUDE_CODE_HUMBLE_HAMMOCK !== void 0) return CLAUDE_CODE_HUMBLE_HAMMOCK;
  if (isTetherEnvOptIn()) return !0;
  return;
}
//@ chunk-e6aww6q8.js:320467-320608 placement
function getEchoWireToolInputsFlag() {
  let e = getForcedEchoWireToolInputs();
  if (e !== void 0) return { value: e, source: "forced" };
  let n = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_HUMBLE_HAMMOCK, !1) === !0,
    { source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_HUMBLE_HAMMOCK, !1);
  return { value: n, source: source };
}
//@ chunk-e6aww6q8.js:320608-320836 placement
function resolveEchoWireToolInputs() {
  let e = getForcedEchoWireToolInputs();
  if (e !== void 0) return e;
  let n = Ao();
  if (n.echoWireToolInputs !== void 0) return n.echoWireToolInputs;
  if (!isServerClassifierEnabled()) return getFeatureValue_SESSION_PINNED(TENGU_HUMBLE_HAMMOCK, !1);
  let { value: r, source: source } = getEchoWireToolInputsFlag();
  if (source !== "fallback") n.echoWireToolInputs = r;
  return r;
}
//@ chunk-e6aww6q8.js:320836-321126 placement
function getEchoWireToolInputsState(e) {
  let n = getEchoWireToolInputsFlag();
  if (e !== void 0) return { echo: e, cached: n };
  if (!isServerClassifierEnabled()) return { echo: void 0, cached: n };
  let echoWireToolInputs = Ao().echoWireToolInputs;
  if (echoWireToolInputs !== void 0) return { echo: echoWireToolInputs, cached: n };
  if (n.source === "fallback") return { echo: void 0, cached: n };
  return ((Ao().echoWireToolInputs = n.value), { echo: n.value, cached: n });
}
//@ chunk-e6aww6q8.js:321126-321146 placement
var weakSet_2 = new WeakSet();
//@ chunk-e6aww6q8.js:321146-321620 placement
function shouldEchoWireToolInputs(e, n) {
  if (n !== void 0) return n;
  try {
    let r = isServerClassifierEnabled() ? latestPromptSnapshot(e) : void 0;
    if (r?.echoWireToolInputs === void 0) return resolveEchoWireToolInputs();
    let s = getForcedEchoWireToolInputs();
    if (s === void 0) Ao().echoWireToolInputs ??= r.echoWireToolInputs;
    if (!weakSet_2.has(r)) {
      weakSet_2.add(r);
      try {
        let h = getEchoWireToolInputsFlag();
        logEvent("tengu_wire_tool_input_echo_replayed", {
          echo: r.echoWireToolInputs,
          cached: h.value,
          matched: h.value === r.echoWireToolInputs,
          cachedSource: fromEnum(h.source),
        });
      } catch (error) {
        logError(error);
      }
    }
    return s ?? r.echoWireToolInputs;
  } catch (error) {
    logError(error);
    try {
      return resolveEchoWireToolInputs();
    } catch {
      return !1;
    }
  }
}
//@ chunk-e6aww6q8.js:321620-321659 placement
function rPt(e, n) {
  return shouldEchoWireToolInputs(e, n) && isFoamySpringEnabled();
}
/**
 * 是否启用工具输入回显：环境变量优先，其次会话设置，最后特性开关。
 */
//@ chunk-e6aww6q8.js:321659-321846 placement
function isEchoWireToolInputsEnabled(e) {
  if (!isFoamySpringEnabled()) return !1;
  let CLAUDE_CODE_HUMBLE_HAMMOCK = env.CLAUDE_CODE_HUMBLE_HAMMOCK;
  if (CLAUDE_CODE_HUMBLE_HAMMOCK !== void 0) return CLAUDE_CODE_HUMBLE_HAMMOCK;
  try {
    let r = latestPromptSnapshot(e)?.echoWireToolInputs;
    if (r !== void 0) return r;
  } catch (error) {
    logError(error);
  }
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_HUMBLE_HAMMOCK, !1) === !0;
}
//@ chunk-e6aww6q8.js:321846-321913 placement
var SAFE_ABSOLUTE_PATH_RE = /^(?:\/|[A-Za-z]:[\\/])[^\s"'`$;&|<>*?(){}[\]!#]{0,1023}$/;
//@ chunk-e6aww6q8.js:321913-321949 placement
function formatCdPrefix(e) {
  return `cd ${e} && `;
}
//@ chunk-e6aww6q8.js:321949-322004 placement
function isSafeAbsolutePath(e) {
  return typeof e === "string" && SAFE_ABSOLUTE_PATH_RE.test(e);
}
//@ chunk-e6aww6q8.js:322004-322143 placement
function stripCdPrefix(e, n) {
  for (let r of n) {
    let s = formatCdPrefix(r);
    if (isSafeAbsolutePath(r) && e.startsWith(s)) return { command: e.slice(s.length), strippedCwd: r };
  }
  return { command: e };
}
//@ chunk-e6aww6q8.js:322143-322190 placement
function isCdPrefixedCommand(e, n, r) {
  return isSafeAbsolutePath(r) && e === formatCdPrefix(r) + n;
}
//@ chunk-e6aww6q8.js:322190-322352 placement
function extractCdPrefixDir(e, n) {
  let r = e.length - n.length;
  if (r < 8 || !e.startsWith("cd ") || !e.endsWith(n) || e.slice(r - 4, r) !== " && ") return;
  let sliced = e.slice(3, r - 4);
  return isSafeAbsolutePath(sliced) ? sliced : void 0;
}
//@ chunk-e6aww6q8.js:322352-322394 placement
function createNullProtoObject() {
  return Object.create(null);
}
//@ chunk-e6aww6q8.js:322394-322660 placement = countToolCallsSince (1)
function countToolCallsSince_4(messages, sinceUuid) {
  if (!messages || sinceUuid === void 0) return;
  try {
    let r;
    for (let message of messages) {
      if (
        message.type !== "tool_use" ||
        typeof message.id !== "string" ||
        typeof message.name !== "string" ||
        !Object.hasOwn(sinceUuid, message.id)
      )
        continue;
      let h = bashCwdStamp(message.name, sinceUuid[message.id]);
      if (h !== void 0) ((r ??= createNullProtoObject()), (r[message.id] = h));
    }
    return r;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:322660-322863 placement
function bashCwdStamp(e, n) {
  if (!isPlainObject_3(n)) return;
  if (e === BASH_TOOL_NAME) {
    if (typeof n.command !== "string" || isRemoteOnlyCheck(e)) return;
    let r = getCwd(),
      { strippedCwd: strippedCwd } = stripCdPrefix(
        n.command,
        getPlatform() === "windows" ? [r, windowsPathToPosixPath(r)] : [r],
      );
    return strippedCwd === void 0 ? void 0 : { cwd: strippedCwd };
  }
  return;
}
/**
 * 从转录中恢复工具输入的附加戳（安全的 cwd），或从 cd 前缀推断 Bash 的 cwd。
 */
//@ chunk-e6aww6q8.js:322863-323457 placement
function restoreWireInputStamps(e, n, r) {
  if (n === void 0) return;
  let s;
  if (isPlainObject_3(e))
    for (let [h, y] of Object.entries(e)) {
      if (!Object.hasOwn(n, h) || !isPlainObject_3(y)) continue;
      let S = {};
      if (isSafeAbsolutePath(y.cwd)) S.cwd = y.cwd;
      if (S.cwd !== void 0 || S.slackStamp !== void 0) ((s ??= createNullProtoObject()), (s[h] = S));
    }
  if (Array.isArray(r))
    for (let h of r) {
      if (
        !isPlainObject_3(h) ||
        h.type !== "tool_use" ||
        h.name !== BASH_TOOL_NAME ||
        typeof h.id !== "string" ||
        s?.[h.id] !== void 0 ||
        !Object.hasOwn(n, h.id)
      )
        continue;
      let y = n[h.id],
        input = h.input;
      if (
        !isPlainObject_3(y) ||
        !isPlainObject_3(input) ||
        typeof y.command !== "string" ||
        typeof input.command !== "string"
      )
        continue;
      let w = extractCdPrefixDir(y.command.replaceAll("\\\\;", "\\;"), input.command);
      if (w !== void 0) ((s ??= createNullProtoObject()), (s[h.id] = { cwd: w }));
    }
  return s;
}
/**
 * 去掉 system-reminder 与行号前缀。
 */
//@ chunk-e6aww6q8.js:323457-323579 placement
function stripReminderAndLineNumbers(e) {
  return e
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .split(
      `
`,
    )
    .map(stripLineNumberPrefix_2)
    .join(
      `
`,
    )
    .trim();
}
//@ chunk-e6aww6q8.js:323579-323632 placement
function SD(e) {
  return typeof e === "string" ? e.length : 0;
}
/**
 * 可精简的工具结果：Read 内容、Bash 输出、Edit/Write 的原文件，各给出字符数与精简函数。
 */
//@ chunk-e6aww6q8.js:323632-324477 placement
var SLIMMABLE_TOOL_RESULTS = {
    [FILE_READ_TOOL_NAME]: (e, n) => {
      let r = e.type === "text" ? "content" : e.type === "image" || e.type === "pdf" ? "base64" : void 0,
        file = e.file;
      if (r === void 0 || !isPlainObject_4(file) || !SD(file[r])) return;
      return {
        chars: SD(file[r]),
        slim: () =>
          r === "content" &&
          (typeof n !== "string" ||
            String(file.content).includes("<system-reminder>") ||
            stripReminderAndLineNumbers(n) !== String(file.content).trim())
            ? void 0
            : { ...e, file: { ...file, [r]: "" } },
      };
    },
    [BASH_TOOL_NAME]: (e) => {
      let { stdout: stdout, stderr: stderr } = e;
      if (typeof stdout !== "string" || typeof stderr !== "string" || (stdout === "" && stderr === ""))
        return;
      return { chars: stdout.length + stderr.length, slim: () => ({ ...e, stdout: "", stderr: "" }) };
    },
    [FILE_EDIT_TOOL_NAME]: (e) =>
      SD(e.originalFile) ? { chars: SD(e.originalFile), slim: () => ({ ...e, originalFile: null }) } : void 0,
    [FILE_WRITE_TOOL_NAME]: (e) => {
      let { type: n, content: content, originalFile: originalFile, structuredPatch: structuredPatch } = e;
      if (
        n !== "update" ||
        SD(content) + SD(originalFile) === 0 ||
        (Array.isArray(structuredPatch) && structuredPatch.length === 0 && originalFile === null)
      )
        return;
      return {
        chars: SD(content) + SD(originalFile),
        slim: () => ({ ...e, content: "", originalFile: null }),
      };
    },
  },
  Ofo = 1024;
/**
 * 创建转录写入时的工具结果精简器：记住可精简工具的调用，遇到对应结果时返回精简信息。
 */
//@ chunk-e6aww6q8.js:324477-325108 placement
function createToolResultSlimmer() {
  let e = new Map();
  return (n) => {
    if (!isPlainObject_4(n) || !isPlainObject_4(n.message)) return;
    let content = n.message.content;
    if (!Array.isArray(content)) return;
    if (n.type === "assistant") {
      for (let S of content)
        if (
          isPlainObject_4(S) &&
          S.type === "tool_use" &&
          typeof S.id === "string" &&
          typeof S.name === "string" &&
          Object.hasOwn(SLIMMABLE_TOOL_RESULTS, S.name)
        ) {
          if ((e.set(S.id, S.name), e.size > Ofo)) e.delete(e.keys().next().value);
        }
      return;
    }
    if (n.type !== "user") return;
    let found = content.find((S) => isPlainObject_4(S) && S.type === "tool_result"),
      h = isPlainObject_4(found) ? found.tool_use_id : void 0,
      y = typeof h === "string" ? e.get(h) : void 0;
    if (typeof h !== "string" || y === void 0) return;
    return (
      e.delete(h),
      n.isVirtual !== !0 && isPlainObject_4(n.toolUseResult) && isPlainObject_4(found)
        ? SLIMMABLE_TOOL_RESULTS[y]?.(n.toolUseResult, found.content)
        : void 0
    );
  };
}
//@ chunk-e6aww6q8.js:1528802-1528862 placement
var S4o = new SessionRootSlot(() => new WeakMap()),
  x7t = new SessionRootSlot(() => new WeakMap());
//@ chunk-e6aww6q8.js:1528862-1528896 placement
function I4e() {
  return S4o.of(getRootSession());
}
//@ chunk-e6aww6q8.js:1528896-1528988 placement
function k4o(e, n) {
  try {
    return (
      isDeepStrictEqual_10(e, n) ||
      isDeepStrictEqual_10(JSON.parse(jsonStringify(e)), JSON.parse(jsonStringify(n)))
    );
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:1528988-1529079 placement
function T4o(e, n) {
  let of = x7t.of(getRootSession()),
    s = of.get(e);
  if (s === void 0) ((s = new Set()), of.set(e, s));
  s.add(n);
}
/**
 * 检查线上发送的工具输入与记录的一致性，不一致时记录。
 */
//@ chunk-e6aww6q8.js:1529079-1530280 placement
function checkWireToolInputConsistency(e, n, r, s, h, y, S, w) {
  let L = I4e(),
    G = L.get(e),
    q = G?.get(n);
  if (q !== void 0) return q;
  let Z = (Ee) => {
      if (G === void 0) ((G = new Map()), L.set(e, G));
      G.set(n, Ee);
    },
    Se,
    ke = h,
    we;
  try {
    if (isPlainObject_3(s) && isDeepStrictEqual_10(r, s)) we = !0;
    else {
      ((Se = y ?? (w === void 0 ? void 0 : findToolByName(w.tools, h))), (ke = Se?.name ?? h));
      let Ee = Se ? normalizeToolInput(Se, r, { logRepairs: !1 }) : r;
      we =
        sameShape(r, Ee) &&
        stringifiedFieldsMatch(r, Ee) &&
        (Se !== void 0 && isMultiEntryAliasTool(Se)
          ? perEntryInputsMatch(Se, Ee, s, S)
          : isEquivalentToolInput(ke, Ee, s, S));
    }
  } catch (error) {
    let Ae = Se ?? y;
    (logForDebugging(
      `wire tool input consistency check failed for ${n} (${Ae ? `tool ${toolCategoryForTelemetry(Ae)}` : `kind ${getUnknownToolAnalyticsName(h)}`}): ${error instanceof Error ? error.message : String(error)}`,
      { level: "warn" },
    ),
      (we = !1));
  }
  if (Se !== void 0) {
    if (!we)
      logFeatureSad("tether_wire_tool_input", "inconsistent_recorded_input", {
        toolName: sanitizeToolNameForAnalytics(ke),
        isMcp: Se.isMcp ?? !1,
      });
    Z(we);
  } else if (we) Z(!0);
  else if (w?.ownRequest !== void 0) {
    if ((Z(!1), !RETIRED_TOOL_NAMES.has(h))) {
      let Ee = getUnknownToolAnalyticsName(h);
      (logForDebugging(
        `wire tool input consistency check: no loaded tool for ${n} (kind ${Ee}; an MCP server still connecting or removed, or a built-in this process does not offer); sending its input as displayed instead of the copy recorded from the API response, for the rest of this process`,
        { level: "warn" },
      ),
        logFeatureSad("tether_wire_tool_input", "unresolved_tool", {
          toolName: Ee,
          mcpServersPending: w.ownRequest.mcpServersPending,
        }));
    }
  }
  if (we && isPlainObject_3(s) && k4o(r, s)) T4o(e, n);
  return we;
}
/**
 * 汇总消息中各工具调用的线上输入来源（wire 或 displayed）。
 */
//@ chunk-e6aww6q8.js:1530280-1530563 placement
function wireInputSources(e) {
  let n = new Map();
  try {
    let r = I4e(),
      of = x7t.of(getRootSession());
    for (let h of e) {
      if (h.type !== "assistant" || !isPlainObject_3(h.wireToolInputs)) continue;
      let y = of.get(h.wireToolInputs);
      for (let [S, w] of r.get(h.wireToolInputs) ?? []) if (!y?.has(S)) n.set(S, w ? "wire" : "displayed");
    }
  } catch (error) {
    (logError(error), n.clear());
  }
  return n;
}
//@ chunk-e6aww6q8.js:1530563-1531316 placement
function adoptWireToolInputCopies(e, n) {
  let r = 0;
  try {
    if (n.size === 0) return 0;
    let s = I4e(),
      h = 0;
    for (let y of e) {
      if (y.type !== "assistant" || !isPlainObject_3(y.wireToolInputs)) continue;
      let wireToolInputs = y.wireToolInputs,
        w = new Map();
      for (let L of Array.isArray(y.message?.content) ? y.message.content : [])
        if (L.type === "tool_use") w.set(L.id, L);
      for (let L of Object.keys(wireToolInputs)) {
        let G = n.get(L);
        if (G === void 0) continue;
        if (G === "wire") {
          let Z = w.get(L),
            Se = wireToolInputs[L];
          if (
            Z === void 0 ||
            !isPlainObject_3(Se) ||
            !adoptWireInputCopy(Se, Z.input, Z.name, y.wireIngestContext?.[L])
          ) {
            h++;
            continue;
          }
        }
        let q = s.get(wireToolInputs);
        if (q === void 0) ((q = new Map()), s.set(wireToolInputs, q));
        (q.set(L, G === "wire"), r++);
      }
    }
    if (r > 0 || h > 0)
      logForDebugging(
        `wire tool input copies: adopted ${r} from the transcript's record; ${h} recorded as 'wire' could not be proven without the tool and will be decided by the live check`,
      );
  } catch (error) {
    logError(error);
  }
  return r;
}
/**
 * 判断能否采用线上输入副本（字符串化字段还原后等价）。
 */
//@ chunk-e6aww6q8.js:1531316-1531656 placement
function adoptWireInputCopy(e, n, r, s) {
  try {
    if (!isPlainObject_3(n)) return !1;
    if (isDeepStrictEqual_10(e, n)) return !0;
    let h = { ...e };
    for (let [S, w] of Object.entries(e)) {
      let L = n[S];
      if (typeof w === "string" && typeof L !== "string" && L !== void 0 && jsonStringify(L) === w) h[S] = L;
    }
    let y = repairDoubleEscapedUnicode(h, { logRepairs: !1 });
    if (isPlainObject_3(y) && r === WORKFLOW_TOOL_NAME && typeof h.script === "string") y.script = h.script;
    if (E4o(e, y, n, r, s)) return !0;
    return !1;
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:1531656-1531726 placement
function E4o(e, n, r, s, h) {
  return (
    isPlainObject_3(n) && sameShape(e, n) && stringifiedFieldsMatch(e, n) && isEquivalentToolInput(s, n, r, h)
  );
}
//@ chunk-e6aww6q8.js:1531726-1531942 placement
function sameShape(e, n) {
  if (Array.isArray(e))
    return Array.isArray(n) && e.length === n.length && e.every((r, s) => sameShape(r, n[s]));
  if (isPlainObject_3(e)) {
    if (!isPlainObject_3(n)) return !1;
    return Object.keys(e).every((r) => Object.hasOwn(n, r) && sameShape(e[r], n[r]));
  }
  return !0;
}
/**
 * 按条目比较多条目工具的输入是否等价。
 */
//@ chunk-e6aww6q8.js:1531942-1532347 placement
function perEntryInputsMatch(e, n, r, s) {
  if (!isPlainObject_3(r)) return !1;
  if (isDeepStrictEqual_10(n, r)) return !0;
  let safeParse = e.inputSchema.safeParse(n),
    safeParse_2 = e.inputSchema.safeParse(r);
  if (!safeParse.success || !safeParse_2.success || !sameShape(n, safeParse.data)) return !1;
  let { v1Tool: v1Tool, entries: entries } = e.perEntryHookInputs(safeParse.data),
    entries_2 = e.perEntryHookInputs(safeParse_2.data).entries,
    { [e.entryFieldName]: G, ...q } = n,
    { [e.entryFieldName]: Z, ...Se } = r;
  return (
    isDeepStrictEqual_10(q, Se) &&
    entries.length === entries_2.length &&
    entries.every((ke, we) => isEquivalentToolInput(v1Tool.name, ke, entries_2[we], s))
  );
}
//@ chunk-e6aww6q8.js:1532347-1532537 placement
function stringifiedFieldsMatch(e, n) {
  if (n === e) return !0;
  for (let [r, s] of Object.entries(e))
    if (typeof s === "string" && typeof n[r] !== "string") {
      let h = safeParseJSON(s, !1);
      if (h === null || !sameShape(h, n[r]) || canonicalJsonText(s) !== jsonStringify(h)) return !1;
    }
  return !0;
}
/**
 * 把 JSON 文本规范化（去空白、字符串重新编码）。
 */
//@ chunk-e6aww6q8.js:1532537-1532860 placement
function canonicalJsonText(e) {
  let n = "";
  for (let r = 0; r < e.length;) {
    let s = e[r];
    if (
      s === " " ||
      s ===
        `
` ||
      s === "\r" ||
      s === "\t"
    ) {
      r++;
      continue;
    }
    if (s !== '"') {
      ((n += s), r++);
      continue;
    }
    let h = r + 1;
    while (h < e.length && e[h] !== '"') h += e[h] === "\\" ? 2 : 1;
    if (h >= e.length) return;
    let y;
    try {
      y = jsonParseRaw(e.slice(r, h + 1));
    } catch {
      return;
    }
    if (typeof y !== "string") return;
    ((n += jsonStringifyRaw(y)), (r = h + 1));
  }
  return n;
}
/**
 * 判断两个工具输入是否等价（Bash 命令/cd 前缀、Edit 替换、Write 尾随空白、Read offset 等工具专属规则）。
 */
//@ chunk-e6aww6q8.js:1532860-1533316 placement
function isEquivalentToolInput(e, n, r, s) {
  if (!isPlainObject_3(r)) return !1;
  if (isDeepStrictEqual_10(n, r)) return !0;
  switch (e) {
    case BASH_TOOL_NAME:
      return bashInputsMatch(n, r, s?.cwd);
    case FILE_EDIT_TOOL_NAME:
      return editInputsMatch(n, r);
    case FILE_WRITE_TOOL_NAME:
      return (
        sameKeys(n, r) &&
        A7t(n, r, ["content"]) &&
        typeof n.content === "string" &&
        typeof r.content === "string" &&
        !(typeof n.file_path === "string" && WEt(n.file_path)) &&
        stripTrailingWhitespace(n.content) === r.content
      );
    case FILE_READ_TOOL_NAME:
      return (
        sameKeys(n, r) &&
        A7t(n, r, ["offset"]) &&
        typeof n.offset === "string" &&
        coerceNumberString(n.offset) === r.offset
      );
    case EXITPLANMODE_2:
      return isDeepStrictEqual_10(n, stripHostOwnedInputKeys(e, r));
    default:
      return !1;
  }
}
//@ chunk-e6aww6q8.js:1533316-1533429 placement
function sameKeys(e, n) {
  let keys = Object.keys(e);
  return keys.length === Object.keys(n).length && keys.every((s) => Object.hasOwn(n, s));
}
//@ chunk-e6aww6q8.js:1533429-1533512 placement
function A7t(e, n, r) {
  return Object.keys(e).every((s) => r.includes(s) || isDeepStrictEqual_10(e[s], n[s]));
}
//@ chunk-e6aww6q8.js:1533512-1533655 placement
function coerceBashField(e, n) {
  switch (e) {
    case "timeout":
      return coerceNumberString(n);
    case "run_in_background":
    case "dangerouslyDisableSandbox":
      return coerceBooleanString(n);
    default:
      return n;
  }
}
/**
 * 比较 Bash 输入是否等价（字段强制转换、cd 前缀）。
 */
//@ chunk-e6aww6q8.js:1533655-1533989 placement
function bashInputsMatch(e, n, r) {
  if (
    typeof e.command !== "string" ||
    typeof n.command !== "string" ||
    !Object.keys(n).every((h) => Object.hasOwn(e, h) || n[h] === void 0) ||
    !Object.keys(e).every(
      (h) => Object.hasOwn(n, h) && (h === "command" || isDeepStrictEqual_10(coerceBashField(h, e[h]), n[h])),
    )
  )
    return !1;
  let replaced = e.command.replaceAll("\\\\;", "\\;");
  return replaced === n.command || (r !== void 0 && isCdPrefixedCommand(replaced, n.command, r));
}
/**
 * 判断 Edit 输入是否等价（old_str/new_str 别名、replace_all 字符串化、反清洗与尾随空白）。
 */
//@ chunk-e6aww6q8.js:1533989-1534635 placement
function editInputsMatch(e, n) {
  if (
    (Object.hasOwn(e, "old_str") && Object.hasOwn(e, "old_string")) ||
    (Object.hasOwn(e, "new_str") && Object.hasOwn(e, "new_string"))
  )
    return !1;
  let {
      old_str: old_str,
      new_str: new_str,
      old_string: old_string = old_str,
      new_string: new_string = new_str,
      replace_all: replace_all = !1,
      ...w
    } = e,
    { old_string: old_string_2, new_string: new_string_2, replace_all: replace_all_2, ...Z } = n;
  if (
    typeof old_string !== "string" ||
    typeof new_string !== "string" ||
    typeof old_string_2 !== "string" ||
    typeof new_string_2 !== "string" ||
    coerceBooleanString(replace_all) !== replace_all_2 ||
    !isDeepStrictEqual_10(w, Z)
  )
    return !1;
  let Se =
    typeof w.file_path === "string" && WEt(w.file_path)
      ? [new_string]
      : [new_string, stripTrailingWhitespace(new_string)];
  if (old_string === old_string_2) return Se.includes(new_string_2);
  let { result: ke, appliedReplacements: appliedReplacements } = desanitizeMatchString(old_string);
  if (ke !== old_string_2) return !1;
  return Se.map((Ee) =>
    appliedReplacements.reduce((Ae, { from: from, to: to }) => Ae.replaceAll(from, to), Ee),
  ).includes(new_string_2);
}

export {
  checkWireToolInputConsistency,
  stripReminderAndLineNumbers,
  countToolCallsSince_2,
  restoreWireInputStamps,
  countToolCallsSince_3,
  ijt,
  shouldEchoWireToolInputs,
  rPt,
  adoptWireToolInputCopies,
  wireInputSources,
  captureWireToolInputs,
  FHe,
  countToolCallsSince_4,
  isEchoWireToolInputsEnabled,
  createToolResultSlimmer,
  stripCdPrefix,
  isTetherEnvOptIn,
  getEchoWireToolInputsState,
  isServerClassifierEnabled,
};
