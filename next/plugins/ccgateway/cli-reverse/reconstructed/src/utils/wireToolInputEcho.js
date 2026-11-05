/**
 * utils/wireToolInputEcho.ts
 *
 * 2.1.316 新增：线上工具输入回显
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (52)
 * attribution: placement 52
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDeepStrictEqual } from "util";
import { createEnvAccessor } from "./env/envRegistry.js";
import { getSessionFeatureValues } from "../bootstrap/sessionFeatureValues.js";
import { getAPIProvider } from "./model/providers.js";
import { canSendFirstPartyBetas } from "./betas.js";
import { safeParseJSON } from "./json.js";
import { isPlainObject as isPlainObject_5 } from "./objectUtils.js";
import { clone, jsonStringify, jsonParseRaw, jsonStringifyRaw } from "./slowOperations.js";
import {
  BRIEF_TOOL_NAME as BRIEF_TOOL_NAME_2,
  LEGACY_BRIEF_TOOL_NAME as LEGACY_BRIEF_TOOL_NAME_2,
} from "../tools/BriefTool/prompt.js";
import { stripCiteTags } from "./api.js";
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
import { READ } from "../tools/FileReadTool/constants.js";
import { isPlainObject as isPlainObject_6 } from "./isPlainObject.js";
import { EDIT } from "../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { getRootSession } from "../bootstrap/state.js";
import { findToolByName } from "../Tool.js";
import { normalizeToolInput, repairDoubleEscapedUnicode } from "./wireToolInputRepair.js";
import { isMultiEntryAliasTool } from "../services/tools/permissionCheckGuard.js";
import { codeModeAccepted } from "./codeMode/accepted.js";
import { hasBuiltInEvalTool } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { logForDebugging } from "./debug.js";
import { toolCategoryForTelemetry } from "../services/api/toolDefinitionShape.js";
import { getUnknownToolAnalyticsName, sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import { RETIRED_TOOL_NAMES } from "../tools/retiredTools.js";
import { WORKFLOW_TOOL_NAME } from "../tools/WorkflowTool/constants.js";
import { isEvalToolName } from "../tools/REPLTool/constants.js";
import {
  isMarkdownPath,
  stripTrailingWhitespace,
  desanitizeMatchString,
} from "../tools/FileEditTool/utils.js";
import { coerceNumberString } from "../tools/ArtifactTool/publishEdits.js";
import { stripHostOwnedInputKeys } from "./permissions/permissionAnswer.js";
import { EXITPLANMODE_2 } from "../tools/ExitPlanModeTool/constants.js";
import { coerceBooleanString } from "./spellcheck.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:320003-320071 placement
var tetherShape; // deferred: loads other modules while loading; runs once its import cycle is complete
var tetherEnvAccessor;
deferInit("chunk-5xgkngpb.js:320003", () => {
  tetherShape = require("../bridge/tetherShape.lazy.js").tetherShape;
  tetherEnvAccessor = createEnvAccessor(tetherShape, null);
});
//@ chunk-5xgkngpb.js:320071-320212 placement
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
//@ chunk-5xgkngpb.js:320212-320254 placement
function nullProtoObject() {
  return Object.create(null);
}
//@ chunk-5xgkngpb.js:320254-320760 placement
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
    let inputsById;
    let degraded = false;
    for (let block of content) {
      if (block.type !== "tool_use" || typeof block.id !== "string") continue;
      let input = block.input;
      let rawInput;
      let cloned = false;
      if (typeof input === "string") {
        if (input.length === 0) rawInput = {};
        else {
          let parsed = safeParseJSON(input, false);
          if (parsed === null && input.trim() !== "null") {
            degraded = true;
            continue;
          }
          rawInput = parsed ?? {};
        }
      } else {
        rawInput = input;
        cloned = true;
      }
      if (!isPlainObject_5(rawInput)) continue;
      let storedInput = cloned ? clone(rawInput) : rawInput;
      inputsById ??= nullProtoObject();
      inputsById[block.id] =
        block.name === BRIEF_TOOL_NAME_2 || block.name === LEGACY_BRIEF_TOOL_NAME_2
          ? stripCiteTags(storedInput)
          : storedInput;
    }
    return {
      inputs: inputsById,
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
//@ chunk-5xgkngpb.js:320760-320818 placement
function logWireToolInputParseFailure() {
  logFeatureSad("tether_wire_tool_input", "parse_failed");
}
//@ chunk-5xgkngpb.js:320818-321187 placement
function wireToolInputsForContent(wireToolInputs, content, batchToolUses) {
  if (!isPlainObject_5(wireToolInputs) || !Array.isArray(content)) return;
  let inputs;
  let content_2 = (id) => {
    if (!Object.hasOwn(wireToolInputs, id)) return;
    let input = wireToolInputs[id];
    if (!isPlainObject_5(input)) return;
    inputs ??= nullProtoObject();
    inputs[id] = input;
  };
  let toolUseIds = [];
  for (let block of content)
    if (isPlainObject_5(block) && block.type === "tool_use" && typeof block.id === "string") {
      toolUseIds.push(block.id);
      content_2(block.id);
    }
  if (Array.isArray(batchToolUses)) {
    let idPrefixesWithNumericSuffix = collectIdPrefixesWithNumericSuffix(toolUseIds);
    for (let batchUse of batchToolUses) {
      if (!isPlainObject_5(batchUse)) continue;
      let id = batchUse.id;
      if (typeof id === "string" && idPrefixesWithNumericSuffix.has(id)) content_2(id);
    }
  }
  return inputs;
}
//@ chunk-5xgkngpb.js:321187-321203 placement
var DIGITS_RE = /^\d+$/;
//@ chunk-5xgkngpb.js:321203-321337 placement
function collectIdPrefixesWithNumericSuffix(ids) {
  let prefixes = new Set();
  for (let id of ids) {
    let index = id.lastIndexOf("_");
    if (index !== -1 && DIGITS_RE.test(id.slice(index + 1))) prefixes.add(id.slice(0, index));
  }
  return prefixes;
}
//@ chunk-5xgkngpb.js:321337-321641 placement
function wireToolInputsForContentLenient(wireToolInputs, content, batchToolUses) {
  if (!isPlainObject_5(wireToolInputs)) return;
  let inputs;
  let collectInput = (id) => {
    if (Object.hasOwn(wireToolInputs, id)) {
      inputs ??= nullProtoObject();
      inputs[id] = wireToolInputs[id];
    }
  };
  let toolUseIds = [];
  for (let block of content)
    if (block.type === "tool_use" && typeof block.id === "string") {
      toolUseIds.push(block.id);
      collectInput(block.id);
    }
  if (Array.isArray(batchToolUses)) {
    let idPrefixesWithNumericSuffix = collectIdPrefixesWithNumericSuffix(toolUseIds);
    for (let batchUse of batchToolUses) {
      let id = isPlainObject_5(batchUse) ? batchUse.id : undefined;
      if (typeof id === "string" && idPrefixesWithNumericSuffix.has(id)) collectInput(id);
    }
  }
  return inputs;
}
//@ chunk-5xgkngpb.js:321641-321672 placement
var TENGU_HUMBLE_HAMMOCK = "tengu_humble_hammock";
//@ chunk-5xgkngpb.js:321672-321699 placement
function isServerClassifierEnabled() {
  return isFoamySpringEnabled();
}
//@ chunk-5xgkngpb.js:321699-321797 placement
function getForcedEchoWireToolInputs() {
  let CLAUDE_CODE_HUMBLE_HAMMOCK = env.CLAUDE_CODE_HUMBLE_HAMMOCK;
  if (CLAUDE_CODE_HUMBLE_HAMMOCK !== undefined) return CLAUDE_CODE_HUMBLE_HAMMOCK;
  if (isTetherEnvOptIn()) return true;
  return;
}
//@ chunk-5xgkngpb.js:321797-321938 placement
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
//@ chunk-5xgkngpb.js:321938-322166 placement
function resolveEchoWireToolInputs() {
  let forcedEchoWireToolInputs = getForcedEchoWireToolInputs();
  if (forcedEchoWireToolInputs !== undefined) return forcedEchoWireToolInputs;
  let sessionFeatureValues = getSessionFeatureValues();
  if (sessionFeatureValues.echoWireToolInputs !== undefined) return sessionFeatureValues.echoWireToolInputs;
  if (!isServerClassifierEnabled()) return getFeatureValue_SESSION_PINNED(TENGU_HUMBLE_HAMMOCK, false);
  let { value: forced, source } = getEchoWireToolInputsFlag();
  if (source !== "fallback") sessionFeatureValues.echoWireToolInputs = forced;
  return forced;
}
//@ chunk-5xgkngpb.js:322166-322456 placement
function getEchoWireToolInputsState(value) {
  let echoWireToolInputsFlag = getEchoWireToolInputsFlag();
  if (value !== undefined)
    return {
      echo: value,
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
//@ chunk-5xgkngpb.js:322456-322476 placement
var weakSet_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:322456", () => {
  weakSet_2 = new WeakSet();
});
//@ chunk-5xgkngpb.js:322476-322950 placement
function shouldEchoWireToolInputs(messages, override) {
  if (override !== undefined) return override;
  try {
    let fallback = isServerClassifierEnabled() ? latestPromptSnapshot(messages) : undefined;
    if (fallback?.echoWireToolInputs === undefined) return resolveEchoWireToolInputs();
    let forcedEchoWireToolInputs = getForcedEchoWireToolInputs();
    if (forcedEchoWireToolInputs === undefined)
      getSessionFeatureValues().echoWireToolInputs ??= fallback.echoWireToolInputs;
    if (!weakSet_2.has(fallback)) {
      weakSet_2.add(fallback);
      try {
        let echoWireToolInputsFlag = getEchoWireToolInputsFlag();
        logEvent("tengu_wire_tool_input_echo_replayed", {
          echo: fallback.echoWireToolInputs,
          cached: echoWireToolInputsFlag.value,
          matched: echoWireToolInputsFlag.value === fallback.echoWireToolInputs,
          cachedSource: fromEnum(echoWireToolInputsFlag.source),
        });
      } catch (error) {
        logError(error);
      }
    }
    return forcedEchoWireToolInputs ?? fallback.echoWireToolInputs;
  } catch (error) {
    logError(error);
    try {
      return resolveEchoWireToolInputs();
    } catch {
      return false;
    }
  }
}
//@ chunk-5xgkngpb.js:322950-322989 placement
function shouldEchoWireToolInputsForRequest(messages, requestMessages) {
  return shouldEchoWireToolInputs(messages, requestMessages) && isFoamySpringEnabled();
}
//@ chunk-5xgkngpb.js:322989-323176 placement
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
//@ chunk-5xgkngpb.js:323176-323243 placement
var SAFE_ABSOLUTE_PATH_RE = /^(?:\/|[A-Za-z]:[\\/])[^\s"'`$;&|<>*?(){}[\]!#]{0,1023}$/;
//@ chunk-5xgkngpb.js:323243-323279 placement
function formatCdPrefix(dir) {
  return `cd ${dir} && `;
}
//@ chunk-5xgkngpb.js:323279-323334 placement
function isSafeAbsolutePath(path) {
  return typeof path === "string" && SAFE_ABSOLUTE_PATH_RE.test(path);
}
//@ chunk-5xgkngpb.js:323334-323473 placement
function stripCdPrefix(command, candidateDirs) {
  for (let dir of candidateDirs) {
    let prefix = formatCdPrefix(dir);
    if (isSafeAbsolutePath(dir) && command.startsWith(prefix))
      return {
        command: command.slice(prefix.length),
        strippedCwd: dir,
      };
  }
  return {
    command,
  };
}
//@ chunk-5xgkngpb.js:323473-323520 placement
function isCdPrefixedCommand(fullCommand, command, cwd) {
  return isSafeAbsolutePath(cwd) && fullCommand === formatCdPrefix(cwd) + command;
}
//@ chunk-5xgkngpb.js:323520-323682 placement
function extractCdPrefixDir(fullCommand, command) {
  let prefixLength = fullCommand.length - command.length;
  if (
    prefixLength < 8 ||
    !fullCommand.startsWith("cd ") ||
    !fullCommand.endsWith(command) ||
    fullCommand.slice(prefixLength - 4, prefixLength) !== " && "
  )
    return;
  let sliced = fullCommand.slice(3, prefixLength - 4);
  return isSafeAbsolutePath(sliced) ? sliced : undefined;
}
//@ chunk-5xgkngpb.js:323682-323724 placement
function createNullProtoObject() {
  return Object.create(null);
}
//@ chunk-5xgkngpb.js:323724-323990 placement
function wireIngestContextStamps(content, inputs) {
  if (!content || inputs === undefined) return;
  try {
    let stampsById;
    for (let block of content) {
      if (
        block.type !== "tool_use" ||
        typeof block.id !== "string" ||
        typeof block.name !== "string" ||
        !Object.hasOwn(inputs, block.id)
      )
        continue;
      let stamp = bashCwdStamp(block.name, inputs[block.id]);
      if (stamp !== undefined) {
        stampsById ??= createNullProtoObject();
        stampsById[block.id] = stamp;
      }
    }
    return stampsById;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-5xgkngpb.js:323990-324193 placement
function bashCwdStamp(name, input) {
  if (!isPlainObject_5(input)) return;
  if (name === BASH_TOOL_NAME) {
    if (typeof input.command !== "string" || isRemoteOnlyCheck(name)) return;
    let cwd = getCwd();
    let { strippedCwd } = stripCdPrefix(
      input.command,
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
//@ chunk-5xgkngpb.js:324193-324787 placement
/**
 * 从转录中恢复工具输入的附加戳（安全的 cwd），或从 cd 前缀推断 Bash 的 cwd。
 */
function restoreWireInputStamps(wireIngestContext, wireToolInputs, content) {
  if (wireToolInputs === undefined) return;
  let stampsById;
  if (isPlainObject_5(wireIngestContext))
    for (let [key, value] of Object.entries(wireIngestContext)) {
      if (!Object.hasOwn(wireToolInputs, key) || !isPlainObject_5(value)) continue;
      let stamp = {};
      if (isSafeAbsolutePath(value.cwd)) stamp.cwd = value.cwd;
      if (stamp.cwd !== undefined || stamp.slackStamp !== undefined) {
        stampsById ??= createNullProtoObject();
        stampsById[key] = stamp;
      }
    }
  if (Array.isArray(content))
    for (let block of content) {
      if (
        !isPlainObject_5(block) ||
        block.type !== "tool_use" ||
        block.name !== BASH_TOOL_NAME ||
        typeof block.id !== "string" ||
        stampsById?.[block.id] !== undefined ||
        !Object.hasOwn(wireToolInputs, block.id)
      )
        continue;
      let recordedInput = wireToolInputs[block.id];
      let input = block.input;
      if (
        !isPlainObject_5(recordedInput) ||
        !isPlainObject_5(input) ||
        typeof recordedInput.command !== "string" ||
        typeof input.command !== "string"
      )
        continue;
      let cdPrefixDir = extractCdPrefixDir(recordedInput.command.replaceAll("\\\\;", "\\;"), input.command);
      if (cdPrefixDir !== undefined) {
        stampsById ??= createNullProtoObject();
        stampsById[block.id] = {
          cwd: cdPrefixDir,
        };
      }
    }
  return stampsById;
}
//@ chunk-5xgkngpb.js:324787-324990 placement (2.1.88 match: SYSTEM_REMINDER_CLOSE, 0.862)
/**
 * 去掉 system-reminder 与行号前缀。
 */
function stripReminderAndLineNumbers(text) {
  let index = text.lastIndexOf("</system-reminder>");
  let keepUntil = index === -1 ? 0 : index + 18;
  return (
    text.slice(0, keepUntil).replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "") +
    text.slice(keepUntil)
  )
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
//@ chunk-5xgkngpb.js:324990-325043 placement
function stringLength(value) {
  return typeof value === "string" ? value.length : 0;
}
//@ chunk-5xgkngpb.js:325043-325893 placement
/**
 * 可精简的工具结果表：Read/Bash/Edit-Write 的结果如何给出字符数并清空。
 */
var SLIMMABLE_TOOL_RESULTS = {
  [READ]: (result, displayedContent) => {
    let contentField =
      result.type === "text"
        ? "content"
        : result.type === "image" || result.type === "pdf"
          ? "base64"
          : undefined;
    let file = result.file;
    if (contentField === undefined || !isPlainObject_6(file) || !stringLength(file[contentField])) return;
    return {
      chars: stringLength(file[contentField]),
      slim: (cutsEveryRead) =>
        !cutsEveryRead &&
        contentField === "content" &&
        (typeof displayedContent !== "string" ||
          String(file.content).includes("<system-reminder>") ||
          stripReminderAndLineNumbers(displayedContent) !== String(file.content).trim())
          ? undefined
          : {
              ...result,
              file: {
                ...file,
                [contentField]: "",
              },
            },
    };
  },
  [BASH_TOOL_NAME]: (result) => {
    let { stdout, stderr } = result;
    if (typeof stdout !== "string" || typeof stderr !== "string" || (stdout === "" && stderr === "")) return;
    return {
      chars: stdout.length + stderr.length,
      slim: () => ({
        ...result,
        stdout: "",
        stderr: "",
      }),
    };
  },
  [EDIT]: (result) =>
    stringLength(result.originalFile)
      ? {
          chars: stringLength(result.originalFile),
          slim: () => ({
            ...result,
            originalFile: null,
          }),
        }
      : undefined,
  [FILE_WRITE_TOOL_NAME]: (result) => {
    let { type: resultType, content, originalFile, structuredPatch } = result;
    if (
      resultType !== "update" ||
      stringLength(content) + stringLength(originalFile) === 0 ||
      (Array.isArray(structuredPatch) && structuredPatch.length === 0 && originalFile === null)
    )
      return;
    return {
      chars: stringLength(content) + stringLength(originalFile),
      slim: () => ({
        ...result,
        content: "",
        originalFile: null,
      }),
    };
  },
};
var MAX_SLIMMABLE_RESULTS = 1024;
//@ chunk-5xgkngpb.js:325893-326524 placement
/**
 * 创建转录写入时的工具结果精简器：记住可精简工具的调用，遇到对应结果时返回精简信息。
 */
function createToolResultSlimmer() {
  let slimmers = new Map();
  return (message) => {
    if (!isPlainObject_6(message) || !isPlainObject_6(message.message)) return;
    let content = message.message.content;
    if (!Array.isArray(content)) return;
    if (message.type === "assistant") {
      for (let block of content)
        if (
          isPlainObject_6(block) &&
          block.type === "tool_use" &&
          typeof block.id === "string" &&
          typeof block.name === "string" &&
          Object.hasOwn(SLIMMABLE_TOOL_RESULTS, block.name)
        ) {
          slimmers.set(block.id, block.name);
          if (slimmers.size > MAX_SLIMMABLE_RESULTS) slimmers.delete(slimmers.keys().next().value);
        }
      return;
    }
    if (message.type !== "user") return;
    let found = content.find((block) => isPlainObject_6(block) && block.type === "tool_result");
    let toolUseId = isPlainObject_6(found) ? found.tool_use_id : undefined;
    let toolName = typeof toolUseId === "string" ? slimmers.get(toolUseId) : undefined;
    if (typeof toolUseId !== "string" || toolName === undefined) return;
    slimmers.delete(toolUseId);
    return message.isVirtual !== true && isPlainObject_6(message.toolUseResult) && isPlainObject_6(found)
      ? SLIMMABLE_TOOL_RESULTS[toolName]?.(message.toolUseResult, found.content)
      : undefined;
  };
}
//@ chunk-5xgkngpb.js:1534348-1534408 placement
var wireInputCopiesBySession; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var wireInputSourcesBySession;
deferInit("chunk-5xgkngpb.js:1534348", () => {
  wireInputCopiesBySession = new SessionRootSlot(() => new WeakMap());
  wireInputSourcesBySession = new SessionRootSlot(() => new WeakMap());
});
//@ chunk-5xgkngpb.js:1534408-1534442 placement
function wireInputCopies() {
  return wireInputCopiesBySession.of(getRootSession());
}
//@ chunk-5xgkngpb.js:1534442-1534534 placement
function areToolInputsEquivalent(a, b) {
  try {
    return (
      isDeepStrictEqual(a, b) || isDeepStrictEqual(JSON.parse(jsonStringify(a)), JSON.parse(jsonStringify(b)))
    );
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:1534534-1534625 placement
function rememberWireInputSource(sessionId, source) {
  let byInput = wireInputSourcesBySession.of(getRootSession());
  let sources = byInput.get(sessionId);
  if (sources === undefined) {
    sources = new Set();
    byInput.set(sessionId, sources);
  }
  sources.add(source);
}
//@ chunk-5xgkngpb.js:1534625-1535991 placement
/**
 * 检查线上发送的工具输入与记录的一致性，不一致时记录。
 */
function checkWireToolInputConsistency(
  sessionId,
  source,
  recordedInput,
  displayedInput,
  toolNameHint,
  toolByName,
  ingestContext,
  ingestPool,
) {
  let copiesByInputs = wireInputCopies();
  let verdictsById = copiesByInputs.get(sessionId);
  let cachedVerdict = verdictsById?.get(source);
  if (cachedVerdict !== undefined) return cachedVerdict;
  let remember = (consistent) => {
    if (verdictsById === undefined) {
      verdictsById = new Map();
      copiesByInputs.set(sessionId, verdictsById);
    }
    verdictsById.set(source, consistent);
  };
  let tool;
  let toolName = toolNameHint;
  let consistent;
  try {
    if (isPlainObject_5(displayedInput) && isDeepStrictEqual(recordedInput, displayedInput))
      consistent = true;
    else {
      tool =
        toolByName ?? (ingestPool === undefined ? undefined : findToolByName(ingestPool.tools, toolNameHint));
      toolName = tool?.name ?? toolNameHint;
      let normalized = tool
        ? normalizeToolInput(tool, recordedInput, {
            logRepairs: false,
          })
        : recordedInput;
      consistent =
        sameShape(recordedInput, normalized) &&
        stringifiedFieldsMatch(recordedInput, normalized) &&
        (tool !== undefined && isMultiEntryAliasTool(tool)
          ? perEntryInputsMatch(tool, normalized, displayedInput, ingestContext)
          : isEquivalentToolInput(toolName, normalized, displayedInput, ingestContext));
      if (
        codeModeAccepted() &&
        !consistent &&
        tool !== undefined &&
        hasBuiltInEvalTool([tool]) &&
        typeof recordedInput.code === "string"
      )
        consistent = [true, false].some((javaScriptSource) =>
          isAdoptableWireCopy(
            recordedInput,
            {
              ...normalized,
              code: repairDoubleEscapedUnicode(recordedInput.code, {
                logRepairs: false,
                javaScriptSource,
              }),
            },
            displayedInput,
            toolName,
            ingestContext,
          ),
        );
    }
  } catch (error) {
    let toolOrByName = tool ?? toolByName;
    logForDebugging(
      `wire tool input consistency check failed for ${source} (${toolOrByName ? `tool ${toolCategoryForTelemetry(toolOrByName)}` : `kind ${getUnknownToolAnalyticsName(toolNameHint)}`}): ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
    consistent = false;
  }
  if (tool !== undefined) {
    if (!consistent)
      logFeatureSad("tether_wire_tool_input", "inconsistent_recorded_input", {
        toolName: sanitizeToolNameForAnalytics(toolName),
        isMcp: tool.isMcp ?? false,
      });
    remember(consistent);
  } else if (consistent) remember(true);
  else if (ingestPool?.ownRequest !== undefined) {
    remember(false);
    if (!RETIRED_TOOL_NAMES.has(toolNameHint)) {
      let unknownToolAnalyticsName = getUnknownToolAnalyticsName(toolNameHint);
      logForDebugging(
        `wire tool input consistency check: no loaded tool for ${source} (kind ${unknownToolAnalyticsName}; an MCP server still connecting or removed, or a built-in this process does not offer); sending its input as displayed instead of the copy recorded from the API response, for the rest of this process`,
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
  if (consistent && isPlainObject_5(displayedInput) && areToolInputsEquivalent(recordedInput, displayedInput))
    rememberWireInputSource(sessionId, source);
  return consistent;
}
//@ chunk-5xgkngpb.js:1535991-1536274 placement
/**
 * 汇总消息中各工具调用的线上输入来源（wire 或 displayed）。
 */
function wireInputSources(messages) {
  let copies = new Map();
  try {
    let copiesByInputs = wireInputCopies();
    let sourcesBySession = wireInputSourcesBySession.of(getRootSession());
    for (let message of messages) {
      if (message.type !== "assistant" || !isPlainObject_5(message.wireToolInputs)) continue;
      let sources = sourcesBySession.get(message.wireToolInputs);
      for (let [toolUseId, isWireCopy] of copiesByInputs.get(message.wireToolInputs) ?? [])
        if (!sources?.has(toolUseId)) copies.set(toolUseId, isWireCopy ? "wire" : "displayed");
    }
  } catch (error) {
    logError(error);
    copies.clear();
  }
  return copies;
}
//@ chunk-5xgkngpb.js:1536274-1537031 placement
function adoptWireToolInputCopies(copies, toolInputCopies) {
  let adopted = 0;
  try {
    if (toolInputCopies.size === 0) return 0;
    let copiesByInputs = wireInputCopies();
    let unprovenCount = 0;
    for (let message of copies) {
      if (message.type !== "assistant" || !isPlainObject_5(message.wireToolInputs)) continue;
      let wireToolInputs = message.wireToolInputs;
      let blockById = new Map();
      for (let block of Array.isArray(message.message?.content) ? message.message.content : [])
        if (block.type === "tool_use") blockById.set(block.id, block);
      for (let key of Object.keys(wireToolInputs)) {
        let verdict = toolInputCopies.get(key);
        if (verdict === undefined) continue;
        if (verdict === "wire") {
          let block = blockById.get(key);
          let recordedInput = wireToolInputs[key];
          if (
            block === undefined ||
            !isPlainObject_5(recordedInput) ||
            !adoptWireInputCopy(recordedInput, block.input, block.name, message.wireIngestContext?.[key])
          ) {
            unprovenCount++;
            continue;
          }
        }
        let byId = copiesByInputs.get(wireToolInputs);
        if (byId === undefined) {
          byId = new Map();
          copiesByInputs.set(wireToolInputs, byId);
        }
        byId.set(key, verdict === "wire");
        adopted++;
      }
    }
    if (adopted > 0 || unprovenCount > 0)
      logForDebugging(
        `wire tool input copies: adopted ${adopted} from the transcript's record; ${unprovenCount} recorded as 'wire' could not be proven without the tool and will be decided by the live check`,
      );
  } catch (error) {
    logError(error);
  }
  return adopted;
}
//@ chunk-5xgkngpb.js:1537031-1537486 placement
/**
 * 判断能否采用线上输入副本（字符串化字段还原后等价）。
 */
function adoptWireInputCopy(instance, copy, name, ingestContext) {
  try {
    if (!isPlainObject_5(copy)) return false;
    if (isDeepStrictEqual(instance, copy)) return true;
    let candidate = {
      ...instance,
    };
    for (let [key, value] of Object.entries(instance)) {
      let copyValue = copy[key];
      if (
        typeof value === "string" &&
        typeof copyValue !== "string" &&
        copyValue !== undefined &&
        jsonStringify(copyValue) === value
      )
        candidate[key] = copyValue;
    }
    let repaired = repairDoubleEscapedUnicode(candidate, {
      logRepairs: false,
    });
    if (isPlainObject_5(repaired) && name === WORKFLOW_TOOL_NAME && typeof candidate.script === "string")
      repaired.script = candidate.script;
    if (isAdoptableWireCopy(instance, repaired, copy, name, ingestContext)) return true;
    return (
      codeModeAccepted() &&
      isEvalToolName(name) &&
      isPlainObject_5(repaired) &&
      typeof candidate.code === "string" &&
      isAdoptableWireCopy(
        instance,
        {
          ...repaired,
          code: repairDoubleEscapedUnicode(candidate.code, {
            logRepairs: false,
            javaScriptSource: true,
          }),
        },
        copy,
        name,
        ingestContext,
      )
    );
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:1537486-1537556 placement
function isAdoptableWireCopy(a, b, c, d, e) {
  return (
    isPlainObject_5(b) && sameShape(a, b) && stringifiedFieldsMatch(a, b) && isEquivalentToolInput(d, b, c, e)
  );
}
//@ chunk-5xgkngpb.js:1537556-1537772 placement
function sameShape(a, b) {
  if (Array.isArray(a))
    return Array.isArray(b) && a.length === b.length && a.every((item, index) => sameShape(item, b[index]));
  if (isPlainObject_5(a)) {
    if (!isPlainObject_5(b)) return false;
    return Object.keys(a).every((key) => Object.hasOwn(b, key) && sameShape(a[key], b[key]));
  }
  return true;
}
//@ chunk-5xgkngpb.js:1537772-1538178 placement
/**
 * 按条目比较多条目工具的输入是否等价。
 */
function perEntryInputsMatch(a, b, c, d) {
  if (!isPlainObject_5(c)) return false;
  if (isDeepStrictEqual(b, c)) return true;
  let instanceParse = a.inputSchema.safeParse(b);
  let copyParse = a.inputSchema.safeParse(c);
  if (!instanceParse.success || !copyParse.success || !sameShape(b, instanceParse.data)) return false;
  let { v1Tool, entries } = a.perEntryHookInputs(instanceParse.data);
  let entries_2 = a.perEntryHookInputs(copyParse.data).entries;
  let { [a.entryFieldName]: instanceEntriesField, ...restA } = b;
  let { [a.entryFieldName]: entriesFieldB, ...restB } = c;
  return (
    isDeepStrictEqual(restA, restB) &&
    entries.length === entries_2.length &&
    entries.every((entry, index) => isEquivalentToolInput(v1Tool.name, entry, entries_2[index], d))
  );
}
//@ chunk-5xgkngpb.js:1538178-1538368 placement
function stringifiedFieldsMatch(a, b) {
  if (b === a) return true;
  for (let [key, value] of Object.entries(a))
    if (typeof value === "string" && typeof b[key] !== "string") {
      let parsed = safeParseJSON(value, false);
      if (parsed === null || !sameShape(parsed, b[key]) || canonicalJsonText(value) !== jsonStringify(parsed))
        return false;
    }
  return true;
}
//@ chunk-5xgkngpb.js:1538368-1538691 placement
/**
 * 把 JSON 文本规范化（去空白、字符串重新编码）。
 */
function canonicalJsonText(text) {
  let result = "";
  for (let index = 0; index < text.length;) {
    let char = text[index];
    if (
      char === " " ||
      char ===
        `
` ||
      char === "\r" ||
      char === "\t"
    ) {
      index++;
      continue;
    }
    if (char !== '"') {
      result += char;
      index++;
      continue;
    }
    let endIndex = index + 1;
    while (endIndex < text.length && text[endIndex] !== '"') endIndex += text[endIndex] === "\\" ? 2 : 1;
    if (endIndex >= text.length) return;
    let decoded;
    try {
      decoded = jsonParseRaw(text.slice(index, endIndex + 1));
    } catch {
      return;
    }
    if (typeof decoded !== "string") return;
    result += jsonStringifyRaw(decoded);
    index = endIndex + 1;
  }
  return result;
}
//@ chunk-5xgkngpb.js:1538691-1539147 placement
/**
 * 判断两个工具输入是否等价（Bash 命令/cd 前缀、Edit 替换、Write 尾随空白、Read offset 等工具专属规则）。
 */
function isEquivalentToolInput(a, b, c, d) {
  if (!isPlainObject_5(c)) return false;
  if (isDeepStrictEqual(b, c)) return true;
  switch (a) {
    case BASH_TOOL_NAME:
      return bashInputsMatch(b, c, d?.cwd);
    case EDIT:
      return editInputsMatch(b, c);
    case FILE_WRITE_TOOL_NAME:
      return (
        sameKeys(b, c) &&
        fieldsMatchExcept(b, c, ["content"]) &&
        typeof b.content === "string" &&
        typeof c.content === "string" &&
        !(typeof b.file_path === "string" && isMarkdownPath(b.file_path)) &&
        stripTrailingWhitespace(b.content) === c.content
      );
    case READ:
      return (
        sameKeys(b, c) &&
        fieldsMatchExcept(b, c, ["offset"]) &&
        typeof b.offset === "string" &&
        coerceNumberString(b.offset) === c.offset
      );
    case EXITPLANMODE_2:
      return isDeepStrictEqual(b, stripHostOwnedInputKeys(a, c));
    default:
      return false;
  }
}
//@ chunk-5xgkngpb.js:1539147-1539260 placement
function sameKeys(a, b) {
  let keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key));
}
//@ chunk-5xgkngpb.js:1539260-1539343 placement
function fieldsMatchExcept(a, b, exemptKeys) {
  return Object.keys(a).every((key) => exemptKeys.includes(key) || isDeepStrictEqual(a[key], b[key]));
}
//@ chunk-5xgkngpb.js:1539343-1539486 placement
function coerceBashField(field, value) {
  switch (field) {
    case "timeout":
      return coerceNumberString(value);
    case "run_in_background":
    case "dangerouslyDisableSandbox":
      return coerceBooleanString(value);
    default:
      return value;
  }
}
//@ chunk-5xgkngpb.js:1539486-1539820 placement
/**
 * 比较 Bash 输入是否等价（字段强制转换、cd 前缀）。
 */
function bashInputsMatch(a, b, cwd) {
  if (
    typeof a.command !== "string" ||
    typeof b.command !== "string" ||
    !Object.keys(b).every((key) => Object.hasOwn(a, key) || b[key] === undefined) ||
    !Object.keys(a).every(
      (key) =>
        Object.hasOwn(b, key) &&
        (key === "command" || isDeepStrictEqual(coerceBashField(key, a[key]), b[key])),
    )
  )
    return false;
  let fullCommand = a.command.replaceAll("\\\\;", "\\;");
  return fullCommand === b.command || (cwd !== undefined && isCdPrefixedCommand(fullCommand, b.command, cwd));
}
//@ chunk-5xgkngpb.js:1539820-1540468 placement
/**
 * 判断 Edit 输入是否等价（old_str/new_str 别名、replace_all 字符串化、反清洗与尾随空白）。
 */
function editInputsMatch(a, b) {
  if (
    (Object.hasOwn(a, "old_str") && Object.hasOwn(a, "old_string")) ||
    (Object.hasOwn(a, "new_str") && Object.hasOwn(a, "new_string"))
  )
    return false;
  let {
    old_str: oldStr,
    new_str: newStr,
    old_string: oldString = oldStr,
    new_string: newString = newStr,
    replace_all: replaceAll = false,
    ...restA
  } = a;
  let { old_string: oldString_2, new_string: newString_2, replace_all: replaceAll_2, ...restB } = b;
  if (
    typeof oldString !== "string" ||
    typeof newString !== "string" ||
    typeof oldString_2 !== "string" ||
    typeof newString_2 !== "string" ||
    coerceBooleanString(replaceAll) !== replaceAll_2 ||
    !isDeepStrictEqual(restA, restB)
  )
    return false;
  let allowedNewStrings =
    typeof restA.file_path === "string" && isMarkdownPath(restA.file_path)
      ? [newString]
      : [newString, stripTrailingWhitespace(newString)];
  if (oldString === oldString_2) return allowedNewStrings.includes(newString_2);
  let { result, appliedReplacements } = desanitizeMatchString(oldString);
  if (result !== oldString_2) return false;
  return allowedNewStrings
    .map((candidate) =>
      appliedReplacements.reduce((acc, { from, to }) => acc.replaceAll(from, to), candidate),
    )
    .includes(newString_2);
}
export {
  shouldEchoWireToolInputs,
  shouldEchoWireToolInputsForRequest,
  adoptWireToolInputCopies,
  wireInputSources,
  captureWireToolInputs,
  logWireToolInputParseFailure,
  wireIngestContextStamps,
  wireToolInputsForContent,
  restoreWireInputStamps,
  checkWireToolInputConsistency,
  tetherEnvAccessor,
  isEchoWireToolInputsEnabled,
  stripCdPrefix,
  isTetherEnvOptIn,
  createToolResultSlimmer,
  stripReminderAndLineNumbers,
  wireToolInputsForContentLenient,
  getEchoWireToolInputsState,
  isServerClassifierEnabled,
};
