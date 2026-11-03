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
import { isDeepStrictEqual } from "util";
import { createEnvAccessor } from "./env/envRegistry.js";
import { getSessionFeatureValues } from "../bootstrap/sessionFeatureValues.js";
import { getAPIProvider } from "./model/providers.js";
import { canSendFirstPartyBetas } from "./betas.js";
import { safeParseJSON } from "./json.js";
import { isPlainObject as isPlainObject_4 } from "./objectUtils.js";
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
import { isPlainObject as isPlainObject_5 } from "./isPlainObject.js";
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
import {
  isMarkdownPath,
  stripTrailingWhitespace,
  desanitizeMatchString,
} from "../tools/FileEditTool/utils.js";
import { coerceNumberString } from "../tools/ArtifactTool/publishEdits.js";
import { stripHostOwnedInputKeys } from "./permissions/permissionAnswer.js";
import { EXITPLANMODE_2 } from "../tools/ExitPlanModeTool/constants.js";
import { coerceBooleanString } from "./spellcheck.js";

//@ chunk-e6aww6q8.js:318714-318782 placement
var tetherShape = require("./chunk-hy3czzmn.js").tetherShape;
var tetherEnvAccessor = createEnvAccessor(tetherShape, null);
//@ chunk-e6aww6q8.js:318782-318923 placement
/**
 * 是否通过 CLAUDE_CODE_TETHER_LIVE 启用线上工具输入回显（第一方且可发 beta）。
 */
function isTetherEnvOptIn() {
  {
    let sessionFeatureValues = getSessionFeatureValues();
    sessionFeatureValues.threadsEnvOptIn ??=
      tetherEnvAccessor.CLAUDE_CODE_TETHER_LIVE === true &&
      getAPIProvider() === "firstParty" &&
      canSendFirstPartyBetas();
    return sessionFeatureValues.threadsEnvOptIn;
  }
  return false;
}
//@ chunk-e6aww6q8.js:318923-318965 placement
function nullProtoObject() {
  return Object.create(null);
}
//@ chunk-e6aww6q8.js:318965-319430 placement
/**
 * 从响应内容块中捕获各 tool_use 的原始输入（字符串输入解析为 JSON），返回按 id 的输入表与是否有解析失败。
 */
function captureWireToolInputs(content) {
  if (!content)
    return {
      inputs: undefined,
      degraded: false,
    };
  try {
    let n;
    let degraded = false;
    for (let s of content) {
      if (s.type !== "tool_use" || typeof s.id !== "string") continue;
      let input = s.input;
      let y;
      let S = false;
      if (typeof input === "string") {
        if (input.length === 0) y = {};
        else {
          let w = safeParseJSON(input, false);
          if (w === null && input.trim() !== "null") {
            degraded = true;
            continue;
          }
          y = w ?? {};
        }
      } else {
        y = input;
        S = true;
      }
      if (!isPlainObject_4(y)) continue;
      n ??= nullProtoObject();
      n[s.id] = S ? clone(y) : y;
    }
    return {
      inputs: n,
      degraded,
    };
  } catch (error) {
    logError(error);
    logFeatureBad("tether_wire_tool_input", "capture_threw");
    return {
      inputs: undefined,
      degraded: false,
    };
  }
}
//@ chunk-e6aww6q8.js:319430-319488 placement
function logWireToolInputParseFailure() {
  logFeatureSad("tether_wire_tool_input", "parse_failed");
}
//@ chunk-e6aww6q8.js:319488-319857 placement = countToolCallsSince (1)
function countToolCallsSince_2(wireToolInputs, content, batchToolUses) {
  if (!isPlainObject_4(wireToolInputs) || !Array.isArray(content)) return;
  let s;
  let h = (id) => {
    if (!Object.hasOwn(wireToolInputs, id)) return;
    let w = wireToolInputs[id];
    if (!isPlainObject_4(w)) return;
    s ??= nullProtoObject();
    s[id] = w;
  };
  let y = [];
  for (let S of content)
    if (isPlainObject_4(S) && S.type === "tool_use" && typeof S.id === "string") {
      y.push(S.id);
      h(S.id);
    }
  if (Array.isArray(batchToolUses)) {
    let idPrefixesWithNumericSuffix = collectIdPrefixesWithNumericSuffix(y);
    for (let message of batchToolUses) {
      if (!isPlainObject_4(message)) continue;
      let id = message.id;
      if (typeof id === "string" && idPrefixesWithNumericSuffix.has(id)) h(id);
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
function countToolCallsSince_3(wireToolInputs, n, batchToolUses) {
  if (!isPlainObject_4(wireToolInputs)) return;
  let s;
  let h = (id) => {
    if (Object.hasOwn(wireToolInputs, id)) {
      s ??= nullProtoObject();
      s[id] = wireToolInputs[id];
    }
  };
  let y = [];
  for (let S of n)
    if (S.type === "tool_use" && typeof S.id === "string") {
      y.push(S.id);
      h(S.id);
    }
  if (Array.isArray(batchToolUses)) {
    let idPrefixesWithNumericSuffix = collectIdPrefixesWithNumericSuffix(y);
    for (let message of batchToolUses) {
      let id = isPlainObject_4(message) ? message.id : undefined;
      if (typeof id === "string" && idPrefixesWithNumericSuffix.has(id)) h(id);
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
  if (CLAUDE_CODE_HUMBLE_HAMMOCK !== undefined) return CLAUDE_CODE_HUMBLE_HAMMOCK;
  if (isTetherEnvOptIn()) return true;
  return;
}
//@ chunk-e6aww6q8.js:320467-320608 placement
function getEchoWireToolInputsFlag() {
  let forcedEchoWireToolInputs = getForcedEchoWireToolInputs();
  if (forcedEchoWireToolInputs !== undefined)
    return {
      value: forcedEchoWireToolInputs,
      source: "forced",
    };
  let value = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_HUMBLE_HAMMOCK, false) === true;
  let { source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_HUMBLE_HAMMOCK, false);
  return {
    value,
    source,
  };
}
//@ chunk-e6aww6q8.js:320608-320836 placement
function resolveEchoWireToolInputs() {
  let forcedEchoWireToolInputs = getForcedEchoWireToolInputs();
  if (forcedEchoWireToolInputs !== undefined) return forcedEchoWireToolInputs;
  let sessionFeatureValues = getSessionFeatureValues();
  if (sessionFeatureValues.echoWireToolInputs !== undefined) return sessionFeatureValues.echoWireToolInputs;
  if (!isServerClassifierEnabled()) return getFeatureValue_SESSION_PINNED(TENGU_HUMBLE_HAMMOCK, false);
  let { value: r, source } = getEchoWireToolInputsFlag();
  if (source !== "fallback") sessionFeatureValues.echoWireToolInputs = r;
  return r;
}
//@ chunk-e6aww6q8.js:320836-321126 placement
function getEchoWireToolInputsState(e) {
  let echoWireToolInputsFlag = getEchoWireToolInputsFlag();
  if (e !== undefined)
    return {
      echo: e,
      cached: echoWireToolInputsFlag,
    };
  if (!isServerClassifierEnabled())
    return {
      echo: undefined,
      cached: echoWireToolInputsFlag,
    };
  let echoWireToolInputs = getSessionFeatureValues().echoWireToolInputs;
  if (echoWireToolInputs !== undefined)
    return {
      echo: echoWireToolInputs,
      cached: echoWireToolInputsFlag,
    };
  if (echoWireToolInputsFlag.source === "fallback")
    return {
      echo: undefined,
      cached: echoWireToolInputsFlag,
    };
  getSessionFeatureValues().echoWireToolInputs = echoWireToolInputsFlag.value;
  return {
    echo: echoWireToolInputsFlag.value,
    cached: echoWireToolInputsFlag,
  };
}
//@ chunk-e6aww6q8.js:321126-321146 placement
var weakSet_2 = new WeakSet();
//@ chunk-e6aww6q8.js:321146-321620 placement
function shouldEchoWireToolInputs(e, echoWireToolInputs) {
  if (echoWireToolInputs !== undefined) return echoWireToolInputs;
  try {
    let r = isServerClassifierEnabled() ? latestPromptSnapshot(e) : undefined;
    if (r?.echoWireToolInputs === undefined) return resolveEchoWireToolInputs();
    let forcedEchoWireToolInputs = getForcedEchoWireToolInputs();
    if (forcedEchoWireToolInputs === undefined)
      getSessionFeatureValues().echoWireToolInputs ??= r.echoWireToolInputs;
    if (!weakSet_2.has(r)) {
      weakSet_2.add(r);
      try {
        let echoWireToolInputsFlag = getEchoWireToolInputsFlag();
        logEvent("tengu_wire_tool_input_echo_replayed", {
          echo: r.echoWireToolInputs,
          cached: echoWireToolInputsFlag.value,
          matched: echoWireToolInputsFlag.value === r.echoWireToolInputs,
          cachedSource: fromEnum(echoWireToolInputsFlag.source),
        });
      } catch (error) {
        logError(error);
      }
    }
    return forcedEchoWireToolInputs ?? r.echoWireToolInputs;
  } catch (error) {
    logError(error);
    try {
      return resolveEchoWireToolInputs();
    } catch {
      return false;
    }
  }
}
//@ chunk-e6aww6q8.js:321620-321659 placement
function shouldEchoWireToolInputsForRequest(messages, n) {
  return shouldEchoWireToolInputs(messages, n) && isFoamySpringEnabled();
}
//@ chunk-e6aww6q8.js:321659-321846 placement
/**
 * 是否启用工具输入回显：环境变量优先，其次会话设置，最后特性开关。
 */
function isEchoWireToolInputsEnabled(normalizedMessages) {
  if (!isFoamySpringEnabled()) return false;
  let CLAUDE_CODE_HUMBLE_HAMMOCK = env.CLAUDE_CODE_HUMBLE_HAMMOCK;
  if (CLAUDE_CODE_HUMBLE_HAMMOCK !== undefined) return CLAUDE_CODE_HUMBLE_HAMMOCK;
  try {
    let echoWireToolInputs = latestPromptSnapshot(normalizedMessages)?.echoWireToolInputs;
    if (echoWireToolInputs !== undefined) return echoWireToolInputs;
  } catch (error) {
    logError(error);
  }
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_HUMBLE_HAMMOCK, false) === true;
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
function stripCdPrefix(command, n) {
  for (let r of n) {
    let s = formatCdPrefix(r);
    if (isSafeAbsolutePath(r) && command.startsWith(s))
      return {
        command: command.slice(s.length),
        strippedCwd: r,
      };
  }
  return {
    command,
  };
}
//@ chunk-e6aww6q8.js:322143-322190 placement
function isCdPrefixedCommand(e, command, r) {
  return isSafeAbsolutePath(r) && e === formatCdPrefix(r) + command;
}
//@ chunk-e6aww6q8.js:322190-322352 placement
function extractCdPrefixDir(e, command) {
  let r = e.length - command.length;
  if (r < 8 || !e.startsWith("cd ") || !e.endsWith(command) || e.slice(r - 4, r) !== " && ") return;
  let sliced = e.slice(3, r - 4);
  return isSafeAbsolutePath(sliced) ? sliced : undefined;
}
//@ chunk-e6aww6q8.js:322352-322394 placement
function createNullProtoObject() {
  return Object.create(null);
}
//@ chunk-e6aww6q8.js:322394-322660 placement = countToolCallsSince (1)
function countToolCallsSince_4(messages, sinceUuid) {
  if (!messages || sinceUuid === undefined) return;
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
      if (h !== undefined) {
        r ??= createNullProtoObject();
        r[message.id] = h;
      }
    }
    return r;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:322660-322863 placement
function bashCwdStamp(name, n) {
  if (!isPlainObject_4(n)) return;
  if (name === BASH_TOOL_NAME) {
    if (typeof n.command !== "string" || isRemoteOnlyCheck(name)) return;
    let cwd = getCwd();
    let { strippedCwd } = stripCdPrefix(
      n.command,
      getPlatform() === "windows" ? [cwd, windowsPathToPosixPath(cwd)] : [cwd],
    );
    return strippedCwd === undefined
      ? undefined
      : {
          cwd: strippedCwd,
        };
  }
  return;
}
//@ chunk-e6aww6q8.js:322863-323457 placement
/**
 * 从转录中恢复工具输入的附加戳（安全的 cwd），或从 cd 前缀推断 Bash 的 cwd。
 */
function restoreWireInputStamps(wireIngestContext, wireToolInputs, content) {
  if (wireToolInputs === undefined) return;
  let s;
  if (isPlainObject_4(wireIngestContext))
    for (let [key, value] of Object.entries(wireIngestContext)) {
      if (!Object.hasOwn(wireToolInputs, key) || !isPlainObject_4(value)) continue;
      let S = {};
      if (isSafeAbsolutePath(value.cwd)) S.cwd = value.cwd;
      if (S.cwd !== undefined || S.slackStamp !== undefined) {
        s ??= createNullProtoObject();
        s[key] = S;
      }
    }
  if (Array.isArray(content))
    for (let h of content) {
      if (
        !isPlainObject_4(h) ||
        h.type !== "tool_use" ||
        h.name !== BASH_TOOL_NAME ||
        typeof h.id !== "string" ||
        s?.[h.id] !== undefined ||
        !Object.hasOwn(wireToolInputs, h.id)
      )
        continue;
      let y = wireToolInputs[h.id];
      let input = h.input;
      if (
        !isPlainObject_4(y) ||
        !isPlainObject_4(input) ||
        typeof y.command !== "string" ||
        typeof input.command !== "string"
      )
        continue;
      let cdPrefixDir = extractCdPrefixDir(y.command.replaceAll("\\\\;", "\\;"), input.command);
      if (cdPrefixDir !== undefined) {
        s ??= createNullProtoObject();
        s[h.id] = {
          cwd: cdPrefixDir,
        };
      }
    }
  return s;
}
//@ chunk-e6aww6q8.js:323457-323579 placement
/**
 * 去掉 system-reminder 与行号前缀。
 */
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
function stringLength(e) {
  return typeof e === "string" ? e.length : 0;
}
//@ chunk-e6aww6q8.js:323632-324477 placement
/**
 * 可精简的工具结果表：Read/Bash/Edit-Write 的结果如何给出字符数并清空。
 */
var SLIMMABLE_TOOL_RESULTS = {
  [FILE_READ_TOOL_NAME]: (e, n) => {
    let r = e.type === "text" ? "content" : e.type === "image" || e.type === "pdf" ? "base64" : undefined;
    let file = e.file;
    if (r === undefined || !isPlainObject_5(file) || !stringLength(file[r])) return;
    return {
      chars: stringLength(file[r]),
      slim: () =>
        r === "content" &&
        (typeof n !== "string" ||
          String(file.content).includes("<system-reminder>") ||
          stripReminderAndLineNumbers(n) !== String(file.content).trim())
          ? undefined
          : {
              ...e,
              file: {
                ...file,
                [r]: "",
              },
            },
    };
  },
  [BASH_TOOL_NAME]: (e) => {
    let { stdout, stderr } = e;
    if (typeof stdout !== "string" || typeof stderr !== "string" || (stdout === "" && stderr === "")) return;
    return {
      chars: stdout.length + stderr.length,
      slim: () => ({
        ...e,
        stdout: "",
        stderr: "",
      }),
    };
  },
  [FILE_EDIT_TOOL_NAME]: (e) =>
    stringLength(e.originalFile)
      ? {
          chars: stringLength(e.originalFile),
          slim: () => ({
            ...e,
            originalFile: null,
          }),
        }
      : undefined,
  [FILE_WRITE_TOOL_NAME]: (e) => {
    let { type: n, content, originalFile, structuredPatch } = e;
    if (
      n !== "update" ||
      stringLength(content) + stringLength(originalFile) === 0 ||
      (Array.isArray(structuredPatch) && structuredPatch.length === 0 && originalFile === null)
    )
      return;
    return {
      chars: stringLength(content) + stringLength(originalFile),
      slim: () => ({
        ...e,
        content: "",
        originalFile: null,
      }),
    };
  },
};
var MAX_SLIMMABLE_RESULTS = 1024;
//@ chunk-e6aww6q8.js:324477-325108 placement
/**
 * 创建转录写入时的工具结果精简器：记住可精简工具的调用，遇到对应结果时返回精简信息。
 */
function createToolResultSlimmer() {
  let e = new Map();
  return (n) => {
    if (!isPlainObject_5(n) || !isPlainObject_5(n.message)) return;
    let content = n.message.content;
    if (!Array.isArray(content)) return;
    if (n.type === "assistant") {
      for (let S of content)
        if (
          isPlainObject_5(S) &&
          S.type === "tool_use" &&
          typeof S.id === "string" &&
          typeof S.name === "string" &&
          Object.hasOwn(SLIMMABLE_TOOL_RESULTS, S.name)
        ) {
          e.set(S.id, S.name);
          if (e.size > MAX_SLIMMABLE_RESULTS) e.delete(e.keys().next().value);
        }
      return;
    }
    if (n.type !== "user") return;
    let found = content.find((S) => isPlainObject_5(S) && S.type === "tool_result");
    let toolUseId = isPlainObject_5(found) ? found.tool_use_id : undefined;
    let y = typeof toolUseId === "string" ? e.get(toolUseId) : undefined;
    if (typeof toolUseId !== "string" || y === undefined) return;
    e.delete(toolUseId);
    return n.isVirtual !== true && isPlainObject_5(n.toolUseResult) && isPlainObject_5(found)
      ? SLIMMABLE_TOOL_RESULTS[y]?.(n.toolUseResult, found.content)
      : undefined;
  };
}
//@ chunk-e6aww6q8.js:1528802-1528862 placement
var wireInputCopiesBySession = new SessionRootSlot(() => new WeakMap());
var wireInputSourcesBySession = new SessionRootSlot(() => new WeakMap());
//@ chunk-e6aww6q8.js:1528862-1528896 placement
function wireInputCopies() {
  return wireInputCopiesBySession.of(getRootSession());
}
//@ chunk-e6aww6q8.js:1528896-1528988 placement
function areToolInputsEquivalent(e, n) {
  try {
    return (
      isDeepStrictEqual(e, n) || isDeepStrictEqual(JSON.parse(jsonStringify(e)), JSON.parse(jsonStringify(n)))
    );
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:1528988-1529079 placement
function rememberWireInputSource(e, n) {
  let r = wireInputSourcesBySession.of(getRootSession());
  let s = r.get(e);
  if (s === undefined) {
    s = new Set();
    r.set(e, s);
  }
  s.add(n);
}
//@ chunk-e6aww6q8.js:1529079-1530280 placement
/**
 * 检查线上发送的工具输入与记录的一致性，不一致时记录。
 */
function checkWireToolInputConsistency(wireToolInputs, id, r, s, h, toolByName, S, ingestPool) {
  let L = wireInputCopies();
  let G = L.get(wireToolInputs);
  let q = G?.get(id);
  if (q !== undefined) return q;
  let Z = (Ee) => {
    if (G === undefined) {
      G = new Map();
      L.set(wireToolInputs, G);
    }
    G.set(id, Ee);
  };
  let Se;
  let ke = h;
  let we;
  try {
    if (isPlainObject_4(s) && isDeepStrictEqual(r, s)) we = true;
    else {
      Se = toolByName ?? (ingestPool === undefined ? undefined : findToolByName(ingestPool.tools, h));
      ke = Se?.name ?? h;
      let Ee = Se
        ? normalizeToolInput(Se, r, {
            logRepairs: false,
          })
        : r;
      we =
        sameShape(r, Ee) &&
        stringifiedFieldsMatch(r, Ee) &&
        (Se !== undefined && isMultiEntryAliasTool(Se)
          ? perEntryInputsMatch(Se, Ee, s, S)
          : isEquivalentToolInput(ke, Ee, s, S));
    }
  } catch (error) {
    let Ae = Se ?? toolByName;
    logForDebugging(
      `wire tool input consistency check failed for ${id} (${Ae ? `tool ${toolCategoryForTelemetry(Ae)}` : `kind ${getUnknownToolAnalyticsName(h)}`}): ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
    we = false;
  }
  if (Se !== undefined) {
    if (!we)
      logFeatureSad("tether_wire_tool_input", "inconsistent_recorded_input", {
        toolName: sanitizeToolNameForAnalytics(ke),
        isMcp: Se.isMcp ?? false,
      });
    Z(we);
  } else if (we) Z(true);
  else if (ingestPool?.ownRequest !== undefined) {
    Z(false);
    if (!RETIRED_TOOL_NAMES.has(h)) {
      let unknownToolAnalyticsName = getUnknownToolAnalyticsName(h);
      logForDebugging(
        `wire tool input consistency check: no loaded tool for ${id} (kind ${unknownToolAnalyticsName}; an MCP server still connecting or removed, or a built-in this process does not offer); sending its input as displayed instead of the copy recorded from the API response, for the rest of this process`,
        {
          level: "warn",
        },
      );
      logFeatureSad("tether_wire_tool_input", "unresolved_tool", {
        toolName: unknownToolAnalyticsName,
        mcpServersPending: ingestPool.ownRequest.mcpServersPending,
      });
    }
  }
  if (we && isPlainObject_4(s) && areToolInputsEquivalent(r, s)) rememberWireInputSource(wireToolInputs, id);
  return we;
}
//@ chunk-e6aww6q8.js:1530280-1530563 placement
/**
 * 汇总消息中各工具调用的线上输入来源（wire 或 displayed）。
 */
function wireInputSources(messages) {
  let n = new Map();
  try {
    let r = wireInputCopies();
    let s = wireInputSourcesBySession.of(getRootSession());
    for (let h of messages) {
      if (h.type !== "assistant" || !isPlainObject_4(h.wireToolInputs)) continue;
      let y = s.get(h.wireToolInputs);
      for (let [S, w] of r.get(h.wireToolInputs) ?? []) if (!y?.has(S)) n.set(S, w ? "wire" : "displayed");
    }
  } catch (error) {
    logError(error);
    n.clear();
  }
  return n;
}
//@ chunk-e6aww6q8.js:1530563-1531316 placement
function adoptWireToolInputCopies(e, toolInputCopies) {
  let r = 0;
  try {
    if (toolInputCopies.size === 0) return 0;
    let s = wireInputCopies();
    let h = 0;
    for (let y of e) {
      if (y.type !== "assistant" || !isPlainObject_4(y.wireToolInputs)) continue;
      let wireToolInputs = y.wireToolInputs;
      let w = new Map();
      for (let L of Array.isArray(y.message?.content) ? y.message.content : [])
        if (L.type === "tool_use") w.set(L.id, L);
      for (let key of Object.keys(wireToolInputs)) {
        let G = toolInputCopies.get(key);
        if (G === undefined) continue;
        if (G === "wire") {
          let Z = w.get(key);
          let Se = wireToolInputs[key];
          if (
            Z === undefined ||
            !isPlainObject_4(Se) ||
            !adoptWireInputCopy(Se, Z.input, Z.name, y.wireIngestContext?.[key])
          ) {
            h++;
            continue;
          }
        }
        let q = s.get(wireToolInputs);
        if (q === undefined) {
          q = new Map();
          s.set(wireToolInputs, q);
        }
        q.set(key, G === "wire");
        r++;
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
//@ chunk-e6aww6q8.js:1531316-1531656 placement
/**
 * 判断能否采用线上输入副本（字符串化字段还原后等价）。
 */
function adoptWireInputCopy(e, n, name, s) {
  try {
    if (!isPlainObject_4(n)) return false;
    if (isDeepStrictEqual(e, n)) return true;
    let h = {
      ...e,
    };
    for (let [key, value] of Object.entries(e)) {
      let L = n[key];
      if (typeof value === "string" && typeof L !== "string" && L !== undefined && jsonStringify(L) === value)
        h[key] = L;
    }
    let y = repairDoubleEscapedUnicode(h, {
      logRepairs: false,
    });
    if (isPlainObject_4(y) && name === WORKFLOW_TOOL_NAME && typeof h.script === "string")
      y.script = h.script;
    if (isAdoptableWireCopy(e, y, n, name, s)) return true;
    return false;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:1531656-1531726 placement
function isAdoptableWireCopy(e, n, r, s, h) {
  return (
    isPlainObject_4(n) && sameShape(e, n) && stringifiedFieldsMatch(e, n) && isEquivalentToolInput(s, n, r, h)
  );
}
//@ chunk-e6aww6q8.js:1531726-1531942 placement
function sameShape(e, n) {
  if (Array.isArray(e))
    return Array.isArray(n) && e.length === n.length && e.every((r, s) => sameShape(r, n[s]));
  if (isPlainObject_4(e)) {
    if (!isPlainObject_4(n)) return false;
    return Object.keys(e).every((key) => Object.hasOwn(n, key) && sameShape(e[key], n[key]));
  }
  return true;
}
//@ chunk-e6aww6q8.js:1531942-1532347 placement
/**
 * 按条目比较多条目工具的输入是否等价。
 */
function perEntryInputsMatch(e, n, r, s) {
  if (!isPlainObject_4(r)) return false;
  if (isDeepStrictEqual(n, r)) return true;
  let h = e.inputSchema.safeParse(n);
  let y = e.inputSchema.safeParse(r);
  if (!h.success || !y.success || !sameShape(n, h.data)) return false;
  let { v1Tool, entries } = e.perEntryHookInputs(h.data);
  let entries_2 = e.perEntryHookInputs(y.data).entries;
  let { [e.entryFieldName]: G, ...q } = n;
  let { [e.entryFieldName]: Z, ...Se } = r;
  return (
    isDeepStrictEqual(q, Se) &&
    entries.length === entries_2.length &&
    entries.every((entry, we) => isEquivalentToolInput(v1Tool.name, entry, entries_2[we], s))
  );
}
//@ chunk-e6aww6q8.js:1532347-1532537 placement
function stringifiedFieldsMatch(e, n) {
  if (n === e) return true;
  for (let [key, value] of Object.entries(e))
    if (typeof value === "string" && typeof n[key] !== "string") {
      let h = safeParseJSON(value, false);
      if (h === null || !sameShape(h, n[key]) || canonicalJsonText(value) !== jsonStringify(h)) return false;
    }
  return true;
}
//@ chunk-e6aww6q8.js:1532537-1532860 placement
/**
 * 把 JSON 文本规范化（去空白、字符串重新编码）。
 */
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
      n += s;
      r++;
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
    n += jsonStringifyRaw(y);
    r = h + 1;
  }
  return n;
}
//@ chunk-e6aww6q8.js:1532860-1533316 placement
/**
 * 判断两个工具输入是否等价（Bash 命令/cd 前缀、Edit 替换、Write 尾随空白、Read offset 等工具专属规则）。
 */
function isEquivalentToolInput(e, n, r, s) {
  if (!isPlainObject_4(r)) return false;
  if (isDeepStrictEqual(n, r)) return true;
  switch (e) {
    case BASH_TOOL_NAME:
      return bashInputsMatch(n, r, s?.cwd);
    case FILE_EDIT_TOOL_NAME:
      return editInputsMatch(n, r);
    case FILE_WRITE_TOOL_NAME:
      return (
        sameKeys(n, r) &&
        fieldsMatchExcept(n, r, ["content"]) &&
        typeof n.content === "string" &&
        typeof r.content === "string" &&
        !(typeof n.file_path === "string" && isMarkdownPath(n.file_path)) &&
        stripTrailingWhitespace(n.content) === r.content
      );
    case FILE_READ_TOOL_NAME:
      return (
        sameKeys(n, r) &&
        fieldsMatchExcept(n, r, ["offset"]) &&
        typeof n.offset === "string" &&
        coerceNumberString(n.offset) === r.offset
      );
    case EXITPLANMODE_2:
      return isDeepStrictEqual(n, stripHostOwnedInputKeys(e, r));
    default:
      return false;
  }
}
//@ chunk-e6aww6q8.js:1533316-1533429 placement
function sameKeys(e, n) {
  let keys = Object.keys(e);
  return keys.length === Object.keys(n).length && keys.every((s) => Object.hasOwn(n, s));
}
//@ chunk-e6aww6q8.js:1533429-1533512 placement
function fieldsMatchExcept(e, n, r) {
  return Object.keys(e).every((key) => r.includes(key) || isDeepStrictEqual(e[key], n[key]));
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
//@ chunk-e6aww6q8.js:1533655-1533989 placement
/**
 * 比较 Bash 输入是否等价（字段强制转换、cd 前缀）。
 */
function bashInputsMatch(e, n, cwd) {
  if (
    typeof e.command !== "string" ||
    typeof n.command !== "string" ||
    !Object.keys(n).every((key) => Object.hasOwn(e, key) || n[key] === undefined) ||
    !Object.keys(e).every(
      (key) =>
        Object.hasOwn(n, key) &&
        (key === "command" || isDeepStrictEqual(coerceBashField(key, e[key]), n[key])),
    )
  )
    return false;
  let replaced = e.command.replaceAll("\\\\;", "\\;");
  return replaced === n.command || (cwd !== undefined && isCdPrefixedCommand(replaced, n.command, cwd));
}
//@ chunk-e6aww6q8.js:1533989-1534635 placement
/**
 * 判断 Edit 输入是否等价（old_str/new_str 别名、replace_all 字符串化、反清洗与尾随空白）。
 */
function editInputsMatch(e, n) {
  if (
    (Object.hasOwn(e, "old_str") && Object.hasOwn(e, "old_string")) ||
    (Object.hasOwn(e, "new_str") && Object.hasOwn(e, "new_string"))
  )
    return false;
  let {
    old_str: oldStr,
    new_str: newStr,
    old_string: oldString = oldStr,
    new_string: newString = newStr,
    replace_all: replaceAll = false,
    ...w
  } = e;
  let { old_string: oldString_2, new_string: newString_2, replace_all: replaceAll_2, ...Z } = n;
  if (
    typeof oldString !== "string" ||
    typeof newString !== "string" ||
    typeof oldString_2 !== "string" ||
    typeof newString_2 !== "string" ||
    coerceBooleanString(replaceAll) !== replaceAll_2 ||
    !isDeepStrictEqual(w, Z)
  )
    return false;
  let Se =
    typeof w.file_path === "string" && isMarkdownPath(w.file_path)
      ? [newString]
      : [newString, stripTrailingWhitespace(newString)];
  if (oldString === oldString_2) return Se.includes(newString_2);
  let { result: ke, appliedReplacements } = desanitizeMatchString(oldString);
  if (ke !== oldString_2) return false;
  return Se.map((Ee) =>
    appliedReplacements.reduce((acc, { from, to }) => acc.replaceAll(from, to), Ee),
  ).includes(newString_2);
}
export {
  checkWireToolInputConsistency,
  stripReminderAndLineNumbers,
  countToolCallsSince_2,
  restoreWireInputStamps,
  countToolCallsSince_3,
  tetherEnvAccessor,
  shouldEchoWireToolInputs,
  shouldEchoWireToolInputsForRequest,
  adoptWireToolInputCopies,
  wireInputSources,
  captureWireToolInputs,
  logWireToolInputParseFailure,
  countToolCallsSince_4,
  isEchoWireToolInputsEnabled,
  createToolResultSlimmer,
  stripCdPrefix,
  isTetherEnvOptIn,
  getEchoWireToolInputsState,
  isServerClassifierEnabled,
};
