/**
 * tools/PowerShellTool/pathValidation.ts
 *
 * PowerShell 路径约束：CMDLET_PATH_CONFIG、参数缩写解析、路径提取与校验、受保护路径删除（含 cmd /c rd/del）、读封锁下外部程序检查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/pathValidation.ts
 * pieces: chunk-6zpsr8vx.js (45)
 * attribution: sole-consumer 5, affinity 2, fingerprint 8, file-local 4, layout 26
 */
import { homedir } from "os";
import { isAbsolute, normalize, resolve, win32, dirname } from "path";
import { env } from "../../utils/env.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { COMMON_SWITCHES, COMMON_VALUE_PARAMS } from "./commonParameters.js";
import { getPlatform } from "../../utils/platform.js";
import { stripTrailingDotsSpaces } from "../../utils/ignorePatterns.js";
import {
  skipLeadingWhitespaceAndComments,
  stripPsParameterPrefix,
  stripFileSystemProviderPrefix,
  unescapePsDoubleQuoted,
} from "./powershellParsing.js";
import { createSingleEditDiffConfig } from "../../components/permissions/FilePermissionDialog/ideDiffConfig.js";
import {
  isDangerousRemovalPath as isDangerousRemovalPath_2,
  hasInteriorDotDot,
  validateResolvedOperand,
} from "../../utils/permissions/pathValidation.js";
import {
  safeResolvePath,
  getFsImplementation,
  getPathsForPermissionCheck,
} from "../../utils/fsOperations.js";
import { normalizeDosDevicePath, isUncOrDevicePath } from "../../utils/pathClassification.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import {
  matchingRuleForInput,
  normalizeCaseForComparison,
  allWorkingDirectories,
  acceptEditsSuggestionApplies,
} from "../../utils/permissions/filesystem.js";
import { firstGlobCharIndex } from "../../utils/windowsUncPaths.js";
import { containsPathTraversal, getDirectoryForPath } from "../../utils/path.js";
import { resolveToCanonical } from "./readOnlyValidation.js";
import { getOwn } from "../../utils/objectSafety.js";
import { isPowerShellParameter, isNullRedirectionTarget } from "../../utils/powershell/parser.js";
import {
  isOutsideReadsBlockedAsk,
  INLINE_CODE_FLAGS,
  outsideReadsTooComplexAsk,
  outsideReadsRuntimePathAsk,
} from "../../types/permissions.js";
import { getCwd } from "../../utils/cwd.js";
import { GIT_SAFETY_WRITE_CMDLETS } from "./powershellPermissions.js";
import { createReadRuleSuggestion } from "../../utils/permissions/PermissionUpdate.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6zpsr8vx.js:23055-23083 sole-consumer
var TENGU_CURIOUS_LAKE = "tengu_curious_lake";
//@ chunk-6zpsr8vx.js:23083-23214 sole-consumer
function isCmdRmDenyEnabled() {
  if (env.CLAUDE_CODE_DISABLE_POWERSHELL_CMD_RM_DENY) return false;
  let flag = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_CURIOUS_LAKE, true);
  return !(flag.value === false && flag.source === "payload");
}
//@ chunk-6zpsr8vx.js:23214-23378 sole-consumer
/**
 * 匹配除普通空格与 BOM 之外的空白字符。
 */
var CMD_RUN_SWITCH_RE = /^\/[ckr](?:$|\s)/i;
var CMD_REMOVE_VERB_RE = /^(rd|rmdir|del|erase)(?=$|[.:\\/+[\]",;=])/i;
var CMD_CD_VERB_RE = /^(?:(?:cd|chdir|pushd|popd)(?=$|[.:\\/+[\]",;=])|[a-z]:$)/i;
var NON_PRINTING_SPACE_RE = /[^\S\uFEFF]|\u0085/;
//@ chunk-6zpsr8vx.js:23378-23557 affinity
/**
 * 参数是否是 cmd / cmd.exe（去掉路径与尾随点空格）。
 */
function isCmdExecutableName(name) {
  let endIndex = name.length;
  while (endIndex > 0 && (name[endIndex - 1] === "." || name[endIndex - 1] === " ")) endIndex--;
  let sliced = name.slice(
    Math.max(name.lastIndexOf("\\", endIndex), name.lastIndexOf("/", endIndex)) + 1,
    endIndex,
  );
  return /^cmd(?:\.exe)?$/i.test(sliced);
}
//@ chunk-6zpsr8vx.js:23557-23674 fingerprint (2.1.88 match: SAFE_PATH_ELEMENT_TYPES, 0.33)
function classifyElementType(elementType) {
  if (elementType === undefined || elementType === "StringConstant") return "literal";
  return elementType === "ExpandableString" ? "expands" : "unknown";
}
//@ chunk-6zpsr8vx.js:23674-23809 file-local
function hasUnquotedWhitespace(text) {
  let inQuotes = false;
  for (let j = 0; j < text.length; j++) {
    let char = text[j];
    if (char === '"' && text[j - 1] !== "\\") inQuotes = !inQuotes;
    else if (!inQuotes && NON_PRINTING_SPACE_RE.test(char)) return true;
  }
  return false;
}
//@ chunk-6zpsr8vx.js:23809-23930 layout
function combineElementKinds(leftKind, kind) {
  if (leftKind === "unknown" || kind === "unknown") return "unknown";
  return leftKind === "expands" || kind === "expands" ? "expands" : "literal";
}
//@ chunk-6zpsr8vx.js:23930-24434 layout
function tokenizeCmdLine(chars) {
  let tokens = [];
  let current = "";
  let currentKind = "literal";
  let inQuote = false;
  let parenDepth = 0;
  let flushToken = () => {
    if (current !== "")
      tokens.push({
        text: current,
        kind: currentKind,
        separator: false,
      });
    current = "";
    currentKind = "literal";
  };
  for (let j = 0; j < chars.length; j++) {
    let { ch, kind } = chars[j];
    if (inQuote) {
      current += ch;
      currentKind = combineElementKinds(currentKind, kind);
      inQuote = ch !== '"';
      continue;
    }
    if (ch === "^" && j + 1 < chars.length) {
      j++;
      current += chars[j].ch;
      currentKind = combineElementKinds(currentKind, combineElementKinds(kind, chars[j].kind));
      continue;
    }
    if ("&|<>".includes(ch) || (ch === "(" && current === "") || (ch === ")" && parenDepth > 0)) {
      flushToken();
      parenDepth += ch === "(" ? 1 : ch === ")" ? -1 : 0;
      tokens.push({
        text: ch,
        kind,
        separator: true,
      });
      continue;
    }
    if (/[ \t\r\n\v\f,;=]/.test(ch)) {
      flushToken();
      continue;
    }
    if (ch === '"') inQuote = true;
    current += ch;
    currentKind = combineElementKinds(currentKind, kind);
  }
  flushToken();
  return tokens;
}
//@ chunk-6zpsr8vx.js:24434-24699 layout
function findStopParsingToken(text) {
  let quoteChar = null;
  for (let j = 0; j < text.length; j++) {
    let char = text[j];
    if (char === "`" && quoteChar !== "'") j++;
    else if (quoteChar !== null) {
      if (char === quoteChar) quoteChar = null;
    } else if (char === '"' || char === "'") quoteChar = char;
    else if (
      text.startsWith("--%", j) &&
      (j === 0 || /\s/.test(text[j - 1])) &&
      (j + 3 === text.length || /\s/.test(text[j + 3]))
    )
      return j;
  }
  return -1;
}
//@ chunk-6zpsr8vx.js:24699-25661 layout
/**
 * 从 PowerShell 调用 cmd.exe /c|/k 的命令里还原出 cmd 实际要执行的命令字符（处理 --% 停止解析、引号、元素是否可展开）。
 */
function getCmdInlineCommandChars(element) {
  if (classifyElementType(element.elementTypes?.[0]) !== "literal" || !isCmdExecutableName(element.name))
    return null;
  let stopParsingToken = findStopParsingToken(element.text);
  let inlineCommandText =
    stopParsingToken === -1 ? undefined : element.text.slice(stopParsingToken + 3).trimStart();
  let isStopParsingArg = (arg) => stopParsingToken !== -1 && /^--%(?:$|\s)/.test(arg);
  let any = element.args.some(isStopParsingArg);
  let args = [];
  let verbatim = false;
  for (let j = 0; j < element.args.length; j++) {
    let argText = element.args[j];
    let kind = classifyElementType(element.elementTypes?.[j + 1]);
    if (!verbatim && inlineCommandText !== undefined && !any && j === element.args.length - 1) {
      verbatim = true;
      argText = inlineCommandText;
    }
    if (!verbatim && isStopParsingArg(argText)) {
      verbatim = true;
      argText = argText.slice(3).trimStart();
      if (argText === "") continue;
    }
    if (verbatim) kind = "literal";
    if (argText !== "" || verbatim)
      args.push({
        text: argText,
        kind,
        verbatim,
      });
  }
  let index = args.findIndex((runArg) => runArg.kind !== "unknown" && CMD_RUN_SWITCH_RE.test(runArg.text));
  if (index === -1) return null;
  let commandChars = [];
  args.forEach((preparedArg, argIndex) => {
    if (argIndex < index) return;
    let argBody = argIndex === index ? preparedArg.text.slice(2).trimStart() : preparedArg.text;
    if (argIndex === index && argBody === "") return;
    if (commandChars.length > 0)
      commandChars.push({
        ch: " ",
        kind: "literal",
      });
    let needsQuoting = !preparedArg.verbatim && argIndex > index && hasUnquotedWhitespace(argBody);
    for (let ch of needsQuoting ? `"${argBody}"` : argBody)
      commandChars.push({
        ch,
        kind: preparedArg.kind,
      });
  });
  let index_2 = commandChars.findIndex((nonSpace) => !/\s/.test(nonSpace.ch));
  if (index_2 !== -1 && commandChars[index_2].ch === '"') {
    let closingQuoteIndex = -1;
    for (let j = commandChars.length - 1; j > index_2; j--)
      if (commandChars[j].ch === '"') {
        closingQuoteIndex = j;
        break;
      }
    commandChars = commandChars.filter(
      (charEntry, charIndex) => charIndex !== index_2 && charIndex !== closingQuoteIndex,
    );
  }
  return commandChars;
}
//@ chunk-6zpsr8vx.js:25661-26226 layout
/**
 * 解析 cmd /c 命令行，收集其中 rd/rmdir/del/erase 的操作数（含 start、if exist、嵌套 cmd、cd 之后的状态）。
 */
function extractCmdRemovalOperands(element) {
  let chars = getCmdInlineCommandChars(element);
  if (chars === null) return [];
  let occurrences = new Map();
  let countOccurrences = (tokenText) => {
    let cachedCounts = occurrences.get(tokenText);
    if (cachedCounts !== undefined) return cachedCounts;
    let matches = /^\$[\p{L}\p{Nd}_:]+$/u.test(tokenText);
    let copyCounts = {
      copies: 0,
      escaped: 0,
    };
    for (
      let index = element.text.indexOf(tokenText);
      index !== -1;
      index = element.text.indexOf(tokenText, index + 1)
    ) {
      if (matches && /[\p{L}\p{Nd}_:]/u.test(element.text[index + tokenText.length] ?? "")) continue;
      let backslashCount = 0;
      while (index - backslashCount > 0 && element.text[index - backslashCount - 1] === "`") backslashCount++;
      copyCounts.copies++;
      copyCounts.escaped += backslashCount % 2;
    }
    occurrences.set(tokenText, copyCounts);
    return copyCounts;
  };
  let everyCopyEscaped = (tokenText) => {
    let { copies, escaped } = countOccurrences(tokenText);
    return copies > 0 && escaped === copies;
  };
  let someCopyEscaped = (tokenText) => countOccurrences(tokenText).escaped > 0;
  let operands = [];
  walkCmdRemovalCommands(
    tokenizeCmdLine(chars),
    {
      cdSeen: false,
      cdTarget: null,
    },
    false,
    {
      operands,
      everyCopyEscaped,
      someCopyEscaped,
    },
  );
  return operands;
}
//@ chunk-6zpsr8vx.js:26226-26235 layout
var MAX_CMD_NESTING_DEPTH = 8;
//@ chunk-6zpsr8vx.js:26235-28431 layout
/**
 * 遍历 cmd /c 命令行 token，收集 rd/rmdir/del/erase 的操作数：跟踪 cd 状态、if exist/defined 条件、start（含 /d）、嵌套 cmd /c /k 递归（有深度上限）与重定向。
 */
function walkCmdRemovalCommands(tokens, cdState, inStart, sink, depth = 0) {
  let atCommandStart = true;
  let ifState = "none";
  let afterPipe = false;
  for (let j = 0; j < tokens.length; j++) {
    let token = tokens[j];
    if (token.separator) {
      if (token.text === "<" || token.text === ">") j = skipRedirection(tokens, j);
      else {
        atCommandStart = true;
        ifState = "none";
        afterPipe = token.text === "|";
        if (afterPipe) cdState.cdTarget = null;
      }
      continue;
    }
    if (/^\d$/.test(token.text) && ["<", ">"].includes(tokens[j + 1]?.text ?? "")) continue;
    if (ifState === "condition") {
      let lower = token.text.toLowerCase();
      if (lower === "/i" || lower === "not") continue;
      ifState = lower === "exist" || lower === "defined" ? "operand" : "none";
      continue;
    }
    if (ifState === "operand") {
      ifState = "none";
      atCommandStart = true;
      continue;
    }
    if (!atCommandStart) continue;
    let replaced = token.text.replace(/^@+/, "");
    if (!inStart && (token.kind === "unknown" || CMD_CD_VERB_RE.test(replaced))) {
      cdState.cdSeen = true;
      cdState.cdTarget =
        afterPipe || token.kind === "unknown"
          ? null
          : parseCmdCdTarget(
              {
                ...token,
                text: replaced,
              },
              tokens,
              j + 1,
            );
    }
    if (token.kind !== "unknown") {
      let lower = replaced.toLowerCase();
      if (lower === "call" || lower === "") continue;
      if (/^start(?=$|\/)/.test(lower) && depth < MAX_CMD_NESTING_DEPTH) {
        let startEndIndex = nextSeparatorIndex(tokens, j + 1);
        let matches = /\/d/.test(lower.slice(5));
        walkCmdRemovalCommands(
          tokens.slice(j + 1, startEndIndex),
          matches
            ? {
                cdSeen: true,
                cdTarget: null,
              }
            : {
                ...cdState,
              },
          true,
          sink,
          depth + 1,
        );
        j = startEndIndex - 1;
        atCommandStart = false;
        continue;
      }
      if (inStart && lower.startsWith("/d")) {
        cdState.cdSeen = true;
        cdState.cdTarget = null;
      }
      if (lower === "if") {
        ifState = "condition";
        atCommandStart = false;
        continue;
      }
      if (isCmdExecutableName(replaced.replaceAll('"', ""))) {
        let switchIndex = j + 1;
        while (switchIndex < tokens.length && !/^\/[ckr]$/i.test(tokens[switchIndex].text)) {
          let nextIndex = nextSeparatorIndex(tokens, switchIndex, switchIndex + 1);
          if (nextIndex === switchIndex) break;
          switchIndex = nextIndex;
        }
        let hasCmdSwitch = switchIndex < tokens.length && !tokens[switchIndex].separator;
        if (hasCmdSwitch && depth >= MAX_CMD_NESTING_DEPTH) {
          j = switchIndex;
          atCommandStart = true;
          continue;
        }
        let cmdEndIndex = nextSeparatorIndex(tokens, switchIndex);
        if (hasCmdSwitch && switchIndex + 1 < cmdEndIndex) {
          let tokens_2 = tokens.slice(switchIndex + 1, cmdEndIndex);
          if (tokens_2[0].text.startsWith('"')) {
            let chars = tokens_2.flatMap((switchToken) =>
              [...` ${switchToken.text}`].map((ch) => ({
                ch,
                kind: switchToken.kind,
              })),
            );
            chars.splice(0, 2);
            let lastIndex = chars.findLastIndex((charEntry) => charEntry.ch === '"');
            if (lastIndex !== -1) chars.splice(lastIndex, 1);
            tokens_2 = tokenizeCmdLine(chars);
          }
          walkCmdRemovalCommands(
            tokens_2,
            {
              ...cdState,
            },
            false,
            sink,
            depth + 1,
          );
        }
        j = cmdEndIndex - 1;
        atCommandStart = false;
        continue;
      }
    }
    atCommandStart = inStart;
    let removeMatch = token.kind === "unknown" ? null : CMD_REMOVE_VERB_RE.exec(replaced);
    if (removeMatch === null) continue;
    let operandTokens = [];
    let sliced = replaced.slice(removeMatch[0].length);
    if (sliced !== "")
      operandTokens.push({
        ...token,
        text: sliced,
      });
    for (let j_2 = j + 1; j_2 < tokens.length; j_2++) {
      let nextToken = tokens[j_2];
      if (!nextToken.separator) {
        operandTokens.push(nextToken);
        j = j_2;
        continue;
      }
      if (nextToken.text !== "<" && nextToken.text !== ">") break;
      if (/^\d$/.test(operandTokens.at(-1)?.text ?? "")) operandTokens.pop();
      j_2 = skipRedirection(tokens, j_2);
      j = j_2;
    }
    for (let operandToken of operandTokens) {
      if (operandToken.kind === "unknown" || operandToken.text.startsWith("/")) continue;
      let text = operandToken.text.replaceAll('"', "").trim();
      if (text === "") continue;
      let views =
        operandToken.kind === "expands"
          ? [sink.everyCopyEscaped, sink.someCopyEscaped].map((escapedCheck) =>
              stripPsVariables(text, escapedCheck),
            )
          : [
              {
                view: text,
                literalPrefix: null,
              },
            ];
      for (let [viewIndex, { view, literalPrefix }] of views.entries()) {
        if (viewIndex > 0 && view === views[0].view) continue;
        sink.operands.push({
          verb: removeMatch[1].toLowerCase(),
          text,
          emptied:
            literalPrefix === null
              ? null
              : {
                  view,
                  literalPrefix,
                },
          afterCd: cdState.cdSeen,
          ...(cdState.cdTarget !== null && {
            cdTarget: cdState.cdTarget,
          }),
        });
      }
    }
  }
}
//@ chunk-6zpsr8vx.js:28431-28609 layout
/**
 * 用给定环境展开 cmd 的 %NAME% 变量（大小写不敏感）。
 */
function expandCmdPercentVars(text, variables) {
  if (!text.includes("%")) return text;
  let lowerByName = new Map(Object.entries(variables).map(([key, value]) => [key.toLowerCase(), value]));
  return text.replace(
    /%([^%:]+)%/g,
    (wholeMatch, varName) => lowerByName.get(varName.toLowerCase()) ?? wholeMatch,
  );
}
//@ chunk-6zpsr8vx.js:28609-29174 layout
function parseCmdCdTarget(cdToken, tokens, startIndex) {
  let match = /^(cd|chdir|pushd)(?![a-z])/i.exec(cdToken.text);
  if (match === null) return null;
  let endIndex = startIndex;
  while (endIndex < tokens.length && !tokens[endIndex].separator) endIndex++;
  let filtered = [
    {
      ...cdToken,
      text: cdToken.text.slice(match[0].length),
    },
    ...tokens.slice(startIndex, endIndex),
  ].filter((argToken) => argToken.text !== "");
  if (["<", ">"].includes(tokens[endIndex]?.text ?? "") && /^\d$/.test(filtered.at(-1)?.text ?? ""))
    filtered.pop();
  if (filtered.some((argToken) => argToken.kind !== "literal")) return null;
  let isDriveChange =
    match[1].toLowerCase() === "pushd" || filtered.some((argToken) => /^\/d$/i.test(argToken.text));
  let trimmed = filtered
    .filter((argToken) => !argToken.text.startsWith("/"))
    .map((argToken) => argToken.text.replaceAll('"', ""))
    .join(" ")
    .trim();
  return isDriveChange && /^(?:[A-Za-z]:[\\/]|%)/.test(trimmed) ? trimmed : null;
}
//@ chunk-6zpsr8vx.js:29174-29319 layout
function nextSeparatorIndex(tokens, startIndex, limitIndex = tokens.length) {
  let index = startIndex;
  while (index < limitIndex) {
    let token = tokens[index];
    if (!token.separator) index++;
    else if (token.text === "<" || token.text === ">") index = skipRedirection(tokens, index) + 1;
    else break;
  }
  return index;
}
//@ chunk-6zpsr8vx.js:29319-29457 layout
function skipRedirection(tokens, index) {
  let targetIndex = index;
  while (tokens[targetIndex + 1]?.separator && ["<", ">", "&"].includes(tokens[targetIndex + 1].text))
    targetIndex++;
  return tokens[targetIndex + 1] !== undefined && !tokens[targetIndex + 1].separator
    ? targetIndex + 1
    : targetIndex;
}
//@ chunk-6zpsr8vx.js:29457-29671 layout
function stripPsVariables(text, keepVariable = () => false) {
  let view = "";
  let literalPrefix = null;
  let index = 0;
  while (index < text.length) {
    let endIndex = text[index] === "$" ? scanPsVariableEnd(text, index) : index;
    if (endIndex === index || keepVariable(text.slice(index, endIndex))) {
      view += text.slice(index, Math.max(endIndex, index + 1));
      index = Math.max(endIndex, index + 1);
      continue;
    }
    literalPrefix ??= view;
    index = endIndex;
  }
  return {
    view,
    literalPrefix,
  };
}
//@ chunk-6zpsr8vx.js:29671-30008 layout
function scanPsVariableEnd(text, startIndex) {
  let nextChar = text[startIndex + 1];
  if (nextChar === "{") {
    let index = text.indexOf("}", startIndex + 2);
    return index === -1 ? text.length : index + 1;
  }
  if (nextChar === "(") {
    let depth = 0;
    for (let j = startIndex + 1; j < text.length; j++)
      if (text[j] === "(") depth++;
      else if (text[j] === ")" && --depth === 0) return j + 1;
    return text.length;
  }
  if (nextChar === "$" || nextChar === "^" || nextChar === "?") return startIndex + 2;
  let index = startIndex + 1;
  while (index < text.length && /[\p{L}\p{Nd}_:]/u.test(text[index])) index++;
  return index === startIndex + 1 ? startIndex : index;
}
//@ chunk-6zpsr8vx.js:30008-40277 fingerprint (2.1.88 match: CMDLET_PATH_CONFIG, 0.974)
/**
 * 每个 cmdlet 的路径参数配置 CMDLET_PATH_CONFIG：操作类型（read/write/create）、路径参数、仅叶名参数、已知开关和带值参数、位置参数跳过数，覆盖 Set/Add/Get-Content、Copy/Move/Remove/New-Item、Out-File、Export-*、Compress/Expand-Archive、Invoke-WebRequest 等。
 */
var MAX_DIRS_TO_LIST = 5;
var CMDLET_PATH_CONFIG = {
  "set-content": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [
      "-passthru",
      "-force",
      "-whatif",
      "-confirm",
      "-usetransaction",
      "-nonewline",
      "-asbytestream",
    ],
    knownValueParams: ["-value", "-filter", "-include", "-exclude", "-credential", "-encoding", "-stream"],
  },
  "add-content": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [
      "-passthru",
      "-force",
      "-whatif",
      "-confirm",
      "-usetransaction",
      "-nonewline",
      "-asbytestream",
    ],
    knownValueParams: ["-value", "-filter", "-include", "-exclude", "-credential", "-encoding", "-stream"],
  },
  "remove-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-recurse", "-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-filter", "-include", "-exclude", "-credential", "-stream"],
  },
  "clear-content": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-filter", "-include", "-exclude", "-credential", "-stream"],
  },
  "out-file": {
    operationType: "write",
    pathParams: ["-filepath", "-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-append", "-force", "-noclobber", "-nonewline", "-whatif", "-confirm"],
    knownValueParams: ["-inputobject", "-encoding", "-width"],
  },
  "tee-object": {
    operationType: "write",
    pathParams: ["-filepath", "-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-append"],
    knownValueParams: ["-inputobject", "-variable", "-encoding"],
  },
  "export-csv": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [
      "-append",
      "-force",
      "-noclobber",
      "-notypeinformation",
      "-includetypeinformation",
      "-useculture",
      "-noheader",
      "-whatif",
      "-confirm",
    ],
    knownValueParams: ["-inputobject", "-delimiter", "-encoding", "-quotefields", "-usequotes"],
  },
  "export-clixml": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-noclobber", "-whatif", "-confirm"],
    knownValueParams: ["-inputobject", "-depth", "-encoding"],
  },
  "new-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp", "-target"],
    leafOnlyPathParams: ["-name"],
    knownSwitches: ["-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-itemtype", "-value", "-credential", "-type"],
  },
  "copy-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp", "-destination"],
    knownSwitches: [
      "-container",
      "-force",
      "-passthru",
      "-recurse",
      "-whatif",
      "-confirm",
      "-usetransaction",
    ],
    knownValueParams: ["-filter", "-include", "-exclude", "-credential", "-fromsession", "-tosession"],
  },
  "move-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp", "-destination"],
    knownSwitches: ["-force", "-passthru", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-filter", "-include", "-exclude", "-credential"],
  },
  "rename-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-passthru", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-newname", "-credential", "-filter", "-include", "-exclude"],
  },
  "set-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-passthru", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-value", "-credential", "-filter", "-include", "-exclude"],
  },
  "get-content": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-usetransaction", "-wait", "-raw", "-asbytestream"],
    knownValueParams: [
      "-readcount",
      "-totalcount",
      "-tail",
      "-first",
      "-head",
      "-last",
      "-filter",
      "-include",
      "-exclude",
      "-credential",
      "-delimiter",
      "-encoding",
      "-stream",
    ],
  },
  "get-childitem": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [
      "-recurse",
      "-force",
      "-name",
      "-usetransaction",
      "-followsymlink",
      "-directory",
      "-file",
      "-hidden",
      "-readonly",
      "-system",
    ],
    knownValueParams: ["-filter", "-include", "-exclude", "-depth", "-attributes", "-credential"],
  },
  "get-item": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-usetransaction"],
    knownValueParams: ["-filter", "-include", "-exclude", "-credential", "-stream"],
  },
  "get-itemproperty": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-usetransaction"],
    knownValueParams: ["-name", "-filter", "-include", "-exclude", "-credential"],
  },
  "get-itempropertyvalue": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-usetransaction"],
    knownValueParams: ["-name", "-filter", "-include", "-exclude", "-credential"],
  },
  "get-filehash": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [],
    knownValueParams: ["-algorithm", "-inputstream"],
  },
  "get-acl": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-audit", "-allcentralaccesspolicies", "-usetransaction"],
    knownValueParams: ["-inputobject", "-filter", "-include", "-exclude"],
  },
  "get-module": {
    operationType: "read",
    pathParams: ["-name", "-fullyqualifiedname"],
    knownSwitches: ["-listavailable", "-all", "-refresh", "-skipeditioncheck"],
    knownValueParams: ["-psedition", "-pssession", "-cimsession"],
  },
  "format-hex": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-raw"],
    knownValueParams: ["-inputobject", "-encoding", "-count", "-offset"],
  },
  "test-path": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-isvalid", "-usetransaction"],
    knownValueParams: [
      "-filter",
      "-include",
      "-exclude",
      "-pathtype",
      "-credential",
      "-olderthan",
      "-newerthan",
    ],
  },
  "resolve-path": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-relative", "-usetransaction", "-force"],
    knownValueParams: ["-credential", "-relativebasepath"],
  },
  "convert-path": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-usetransaction"],
    knownValueParams: [],
  },
  "select-string": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [
      "-simplematch",
      "-casesensitive",
      "-quiet",
      "-list",
      "-notmatch",
      "-allmatches",
      "-noemphasis",
      "-raw",
    ],
    knownValueParams: [
      "-inputobject",
      "-pattern",
      "-include",
      "-exclude",
      "-encoding",
      "-context",
      "-culture",
    ],
  },
  "set-location": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-passthru", "-usetransaction"],
    knownValueParams: ["-stackname"],
  },
  "push-location": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-passthru", "-usetransaction"],
    knownValueParams: ["-stackname"],
  },
  "pop-location": {
    operationType: "read",
    pathParams: [],
    knownSwitches: ["-passthru", "-usetransaction"],
    knownValueParams: ["-stackname"],
  },
  "select-xml": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [],
    knownValueParams: ["-xml", "-content", "-xpath", "-namespace"],
  },
  "get-winevent": {
    operationType: "read",
    pathParams: ["-path"],
    knownSwitches: ["-force", "-oldest"],
    knownValueParams: [
      "-listlog",
      "-logname",
      "-listprovider",
      "-providername",
      "-maxevents",
      "-computername",
      "-credential",
      "-filterxpath",
      "-filterxml",
      "-filterhashtable",
    ],
  },
  "invoke-webrequest": {
    operationType: "write",
    pathParams: ["-outfile", "-infile"],
    positionalSkip: 1,
    optionalWrite: true,
    knownSwitches: [
      "-allowinsecureredirect",
      "-allowunencryptedauthentication",
      "-disablekeepalive",
      "-nobodyprogress",
      "-passthru",
      "-preservefileauthorizationmetadata",
      "-resume",
      "-skipcertificatecheck",
      "-skipheadervalidation",
      "-skiphttperrorcheck",
      "-usebasicparsing",
      "-usedefaultcredentials",
    ],
    knownValueParams: [
      "-uri",
      "-method",
      "-body",
      "-contenttype",
      "-headers",
      "-maximumredirection",
      "-maximumretrycount",
      "-proxy",
      "-proxycredential",
      "-retryintervalsec",
      "-sessionvariable",
      "-timeoutsec",
      "-token",
      "-transferencoding",
      "-useragent",
      "-websession",
      "-credential",
      "-authentication",
      "-certificate",
      "-certificatethumbprint",
      "-form",
      "-httpversion",
    ],
  },
  "invoke-restmethod": {
    operationType: "write",
    pathParams: ["-outfile", "-infile"],
    positionalSkip: 1,
    optionalWrite: true,
    knownSwitches: [
      "-allowinsecureredirect",
      "-allowunencryptedauthentication",
      "-disablekeepalive",
      "-followrellink",
      "-nobodyprogress",
      "-passthru",
      "-preservefileauthorizationmetadata",
      "-resume",
      "-skipcertificatecheck",
      "-skipheadervalidation",
      "-skiphttperrorcheck",
      "-usebasicparsing",
      "-usedefaultcredentials",
    ],
    knownValueParams: [
      "-uri",
      "-method",
      "-body",
      "-contenttype",
      "-headers",
      "-maximumfollowrellink",
      "-maximumredirection",
      "-maximumretrycount",
      "-proxy",
      "-proxycredential",
      "-responseheaderstvariable",
      "-retryintervalsec",
      "-sessionvariable",
      "-statuscodevariable",
      "-timeoutsec",
      "-token",
      "-transferencoding",
      "-useragent",
      "-websession",
      "-credential",
      "-authentication",
      "-certificate",
      "-certificatethumbprint",
      "-form",
      "-httpversion",
    ],
  },
  "expand-archive": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp", "-destinationpath"],
    knownSwitches: ["-force", "-passthru", "-whatif", "-confirm"],
    knownValueParams: [],
  },
  "compress-archive": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp", "-destinationpath"],
    knownSwitches: ["-force", "-update", "-passthru", "-whatif", "-confirm"],
    knownValueParams: ["-compressionlevel"],
  },
  "set-itemproperty": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-passthru", "-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: [
      "-name",
      "-value",
      "-type",
      "-filter",
      "-include",
      "-exclude",
      "-credential",
      "-inputobject",
    ],
  },
  "new-itemproperty": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: [
      "-name",
      "-value",
      "-propertytype",
      "-type",
      "-filter",
      "-include",
      "-exclude",
      "-credential",
    ],
  },
  "remove-itemproperty": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-name", "-filter", "-include", "-exclude", "-credential"],
  },
  "clear-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-filter", "-include", "-exclude", "-credential"],
  },
  "export-alias": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-append", "-force", "-noclobber", "-passthru", "-whatif", "-confirm"],
    knownValueParams: ["-name", "-description", "-scope", "-as"],
  },
};
//@ chunk-6zpsr8vx.js:40277-40440 layout
function getParamCategories(config) {
  return [
    ["path", config.pathParams],
    ["leafOnly", config.leafOnlyPathParams ?? []],
    ["switch", [...config.knownSwitches, ...COMMON_SWITCHES]],
    ["value", [...config.knownValueParams, ...COMMON_VALUE_PARAMS]],
  ];
}
//@ chunk-6zpsr8vx.js:40440-40860 layout
/**
 * 把参数缩写解析到 path/leafOnly/switch/value 类别；匹配多个类别时为 ambiguous，未知为 unknown。
 */
function classifyParamAbbreviation(paramLower, paramCategories) {
  let exactCategories = new Set();
  let prefixCategories = new Map();
  let hasConflict = false;
  for (let [category, paramNames] of paramCategories)
    for (let paramName of paramNames)
      if (paramName === paramLower) exactCategories.add(category);
      else if (paramLower.length > 1 && paramName.startsWith(paramLower)) {
        let existingCategory = prefixCategories.get(paramName);
        if (existingCategory !== undefined && existingCategory !== category) hasConflict = true;
        prefixCategories.set(paramName, category);
      }
  if (exactCategories.size > 1) return "ambiguous";
  let exactCategory = [...exactCategories][0];
  if (exactCategory !== undefined)
    return exactCategory === "value" &&
      (hasConflict || [...prefixCategories.values()].some((prefixCategory) => prefixCategory !== "value"))
      ? "ambiguous"
      : exactCategory;
  if (hasConflict || prefixCategories.size > 1) return "ambiguous";
  let prefixCategory = [...prefixCategories.values()][0];
  if (prefixCategory !== undefined) return prefixCategory;
  return "unknown";
}
//@ chunk-6zpsr8vx.js:40860-40985 layout
function normalizeWindowsPathCase(filePath) {
  if (getPlatform() !== "windows") return filePath;
  return filePath
    .split(/([/\\])/)
    .map((part, partIndex) => {
      if (partIndex % 2 !== 0) return part;
      return stripTrailingDotsSpaces(part);
    })
    .join("");
}
//@ chunk-6zpsr8vx.js:40985-41013 layout
/**
 * 跳过 PowerShell 文本开头的空白与注释。
 */
function skipPsLeadingSpaceAndComments(rawValue) {
  return skipLeadingWhitespaceAndComments(rawValue);
}
//@ chunk-6zpsr8vx.js:41013-41245 file-local
/**
 * 冒号绑定参数的值是否复杂（引号、逗号、括号、反引号、@、$），复杂值无法静态验证。
 */
function hasComplexColonValue(rawValue) {
  if (/['"\u2018-\u201F]/.test(rawValue)) return true;
  if (rawValue.includes("\u180E")) return true;
  let rawValue_2 = skipPsLeadingSpaceAndComments(rawValue);
  return (
    rawValue_2.includes(",") ||
    rawValue_2.startsWith("(") ||
    rawValue_2.startsWith("[") ||
    rawValue_2.includes("`") ||
    rawValue_2.includes("@(") ||
    rawValue_2.startsWith("@") ||
    rawValue_2.includes("$")
  );
}
//@ chunk-6zpsr8vx.js:41245-41396 layout (2.1.88 match: formatDirectoryList, 1)
function formatDirectoryList(directories) {
  let dirCount = directories.length;
  if (dirCount <= MAX_DIRS_TO_LIST) return directories.map((dir) => `'${dir}'`).join(", ");
  return `${directories
    .slice(0, MAX_DIRS_TO_LIST)
    .map((dir) => `'${dir}'`)
    .join(", ")}, and ${dirCount - MAX_DIRS_TO_LIST} more`;
}
//@ chunk-6zpsr8vx.js:41396-41495 file-local
function expandTilde(filePath) {
  if (filePath === "~" || filePath.startsWith("~/") || filePath.startsWith("~\\"))
    return homedir() + filePath.slice(1);
  return filePath;
}
//@ chunk-6zpsr8vx.js:41495-41636 layout
/**
 * 路径（去提供程序前缀、各种拼写）是否是禁止删除的系统路径（盘根、盘根下一级、home 等）。
 */
function isDangerousRemovalPath(rawPath) {
  let variants = new Set([
    stripPsParameterPrefix(rawPath),
    stripFileSystemProviderPrefix(rawPath),
    createSingleEditDiffConfig(rawPath),
  ]);
  for (let variant of variants) {
    let index = variant.indexOf("::");
    if (
      (index >= 0 && isDangerousRemovalRawPath(variant.slice(index + 2))) ||
      isDangerousRemovalRawPath(variant)
    )
      return true;
  }
  return false;
}
//@ chunk-6zpsr8vx.js:41636-41729 file-local
function isDangerousRemovalRawPath(filePath) {
  let expanded = expandTilde(filePath).replace(/\\/g, "/");
  let normalized = normalizeWindowsPathCase(expanded);
  if (isAbsolute(normalized)) normalized = normalize(normalized);
  return isDangerousRemovalPath_2(normalized) || isDangerousRemovalPath_2(expanded);
}
//@ chunk-6zpsr8vx.js:41729-42078 layout
function resolveDangerousRemovalPath(rawPath, cwd) {
  let variants = new Set([
    rawPath,
    stripFileSystemProviderPrefix(rawPath),
    createSingleEditDiffConfig(rawPath),
  ]);
  for (let variant of [...variants]) {
    if (variant.includes("`")) variants.add(unescapePsDoubleQuoted(variant));
    if (variant.includes("::")) {
      let sliced = variant.slice(variant.indexOf("::") + 2);
      variants.add(sliced);
      if (sliced.includes("`")) variants.add(unescapePsDoubleQuoted(sliced));
    }
  }
  for (let variant of variants) {
    let normalizedPath = normalizeWindowsPathCase(expandTilde(variant).replace(/\\/g, "/"));
    if (normalizedPath === "") continue;
    let absolutePath = isAbsolute(normalizedPath) ? normalizedPath : resolve(cwd, normalizedPath);
    let { resolvedPath } = safeResolvePath(getFsImplementation(), absolutePath);
    if (isDangerousRemovalPath_2(resolvedPath)) return resolvedPath;
  }
  return null;
}
//@ chunk-6zpsr8vx.js:42078-42110 layout
/**
 * 判断基础规范化后与原值相同（表示路径未改写）。
 */
function isUnchangedByBasicNormalize(pathArg) {
  return stripPsParameterPrefix(pathArg) === pathArg;
}
//@ chunk-6zpsr8vx.js:42110-42355 fingerprint (2.1.88 match: dangerousRemovalDeny, 0.871)
/**
 * 构造"删除受保护系统路径"的 deny 结果（safetyCheck，分类器不可批准）。
 */
function dangerousRemovalDeny(
  pathText,
  message = `Remove-Item on system path '${pathText}' is blocked. This path is protected from removal.`,
) {
  return {
    behavior: "deny",
    message,
    decisionReason: {
      type: "safetyCheck",
      reason: "Removal targets a protected system path",
      classifierApprovable: false,
    },
  };
}
//@ chunk-6zpsr8vx.js:42355-42592 layout
function stripTrailingWildcardSegment(filePath) {
  let endIndex = filePath.length;
  while (endIndex > 0 && (filePath[endIndex - 1] === "\\" || filePath[endIndex - 1] === "/")) endIndex--;
  let segmentStart = endIndex;
  while (segmentStart > 0 && "*?.".includes(filePath[segmentStart - 1])) segmentStart--;
  let sliced = filePath.slice(segmentStart, endIndex);
  if (
    !(segmentStart === 0 || filePath[segmentStart - 1] === "\\" || filePath[segmentStart - 1] === "/") ||
    !/[*?]/.test(sliced)
  )
    return filePath;
  return segmentStart === 0 ? "." : filePath.slice(0, segmentStart);
}
//@ chunk-6zpsr8vx.js:42592-42972 layout
function findProtectedRemovalTarget(rawPath, cwd, compoundCommandHasCd, text, cmdVariables) {
  let normalizedPath = stripTrailingWildcardSegment(normalizeDosDevicePath(rawPath));
  if (isDangerousRemovalPath(normalizedPath))
    return {
      path: normalizedPath,
      quotable: true,
    };
  let isCwdRelative = compoundCommandHasCd && !/^(?:[A-Za-z]:)?[\\/]/.test(normalizedPath);
  if (!isUncOrDevicePath(normalizedPath) && !isCwdRelative) {
    let dangerousRemovalPath = resolveDangerousRemovalPath(normalizedPath, cwd);
    if (dangerousRemovalPath !== null)
      return {
        path: dangerousRemovalPath,
        quotable: true,
      };
  }
  if (isCwdRelative && text !== undefined && !/^[A-Za-z]:/.test(normalizedPath))
    for (let cdBase of new Set([text, expandCmdPercentVars(text, cmdVariables)])) {
      if (!/^[A-Za-z]:[\\/]/.test(cdBase)) continue;
      let resolved = win32.resolve(cdBase, normalizedPath);
      if (isDangerousRemovalPath(resolved))
        return {
          path: resolved,
          quotable: cdBase === text,
          viaCd: text,
        };
    }
  return null;
}
//@ chunk-6zpsr8vx.js:42972-43903 layout
/**
 * 开关 tengu_curious_lake（可用 CLAUDE_CODE_DISABLE_POWERSHELL_CMD_RM_DENY 关闭）打开时，检查 PowerShell 里通过 cmd /c 执行的 rd/del 是否删除受保护路径（考虑 %VAR%、$变量为空、cd 之后的相对路径），命中则 deny。
 */
function checkCmdRemovalOfProtectedPath(element, cwd, compoundCommandHasCd) {
  if (!isCmdRmDenyEnabled()) return;
  let cmdRemovalOperands = extractCmdRemovalOperands(element);
  if (cmdRemovalOperands.length === 0) return;
  let cmdVariables = subprocessEnv();
  for (let { verb, text, emptied, afterCd, cdTarget } of cmdRemovalOperands) {
    if (emptied?.literalPrefix === "") continue;
    let view = emptied?.view ?? text;
    for (let pathView of new Set([view, expandCmdPercentVars(view, cmdVariables)])) {
      let protectedRemovalTarget = findProtectedRemovalTarget(
        pathView,
        cwd,
        compoundCommandHasCd || afterCd,
        cdTarget,
        cmdVariables,
      );
      if (protectedRemovalTarget === null) continue;
      let quotable = protectedRemovalTarget.quotable && pathView === view;
      let viaCdNote =
        protectedRemovalTarget.viaCd === undefined
          ? null
          : `after this line's cd to '${protectedRemovalTarget.viaCd}'`;
      let joined = (
        quotable
          ? [viaCdNote, emptied !== null ? "if its variables are empty" : null]
          : [
              viaCdNote,
              `with cmd's %NAME% variables replaced${emptied !== null ? " and PowerShell's $ variables empty" : ""}`,
            ]
      )
        .filter((reasonPart) => reasonPart !== null)
        .join(" and ");
      return dangerousRemovalDeny(
        text,
        !quotable
          ? `cmd's ${verb} on '${text}' is blocked because, ${joined}, it targets a path that no command may remove: a drive root, a folder directly under one, or the home folder.`
          : text === protectedRemovalTarget.path
            ? `cmd's ${verb} on '${protectedRemovalTarget.path}' is blocked because no command may remove that path.`
            : `cmd's ${verb} on '${text}' is blocked because${joined === "" ? "" : `, ${joined},`} it targets '${protectedRemovalTarget.path}', which no command may remove.`,
      );
    }
  }
  return;
}
//@ chunk-6zpsr8vx.js:43903-44148 fingerprint (2.1.88 match: checkDenyRuleForGuessedPath, 1)
/**
 * 对猜测出的路径拼写检查 read/edit deny 规则，返回命中的规则。
 */
function checkDenyRuleForGuessedPath(strippedPath, cwd, toolPermissionContext, operationType) {
  if (!strippedPath || strippedPath.includes("\x00")) return null;
  let tildeExpanded = expandTilde(normalizeWindowsPathCase(strippedPath));
  let abs = isAbsolute(tildeExpanded) ? tildeExpanded : resolve(cwd, tildeExpanded);
  let { resolvedPath } = safeResolvePath(getFsImplementation(), abs);
  let permissionType = operationType === "read" ? "read" : "edit";
  for (let pathSpelling of getPathsForPermissionCheck(resolvedPath)) {
    let denyRule = matchingRuleForInput(pathSpelling, toolPermissionContext, permissionType, "deny");
    if (denyRule !== null)
      return {
        resolvedPath,
        rule: denyRule,
      };
  }
  return null;
}
//@ chunk-6zpsr8vx.js:44148-48208 fingerprint (2.1.88 match: validatePath, 0.791)
/**
 * PowerShell 路径校验：对提供程序路径、反引号转义、:: 前缀等多种拼写先查 deny 规则；再按操作类型判断是否在允许的工作目录内（含读封锁、UNC、设备路径等）。
 */
function validatePath(filePath, cwd, toolPermissionContext, operationType) {
  let cleanPath = stripPsParameterPrefix(filePath);
  let hadParamPrefix = cleanPath !== filePath;
  if (hadParamPrefix) {
    let variants = new Set();
    for (let variant of [
      filePath.replaceAll("\\", "/"),
      stripFileSystemProviderPrefix(filePath).replaceAll("\\", "/"),
      createSingleEditDiffConfig(filePath).replaceAll("\\", "/"),
    ]) {
      variants.add(variant);
      if (variant.includes("`")) variants.add(unescapePsDoubleQuoted(variant));
      if (variant.includes("::")) {
        let sliced = variant.slice(variant.indexOf("::") + 2);
        variants.add(sliced);
        if (sliced.includes("`")) variants.add(unescapePsDoubleQuoted(sliced));
      }
    }
    for (let variant of variants) {
      let denyHit = checkDenyRuleForGuessedPath(variant, cwd, toolPermissionContext, operationType);
      if (denyHit)
        return {
          allowed: false,
          resolvedPath: denyHit.resolvedPath,
          decisionReason: {
            type: "rule",
            rule: denyHit.rule,
          },
        };
    }
  }
  let withParamPrefixDenial = (resolvedPath) => ({
    allowed: false,
    resolvedPath,
    decisionReason: {
      type: "other",
      reason: "Paths containing quote characters cannot be statically validated and require manual approval",
    },
  });
  let normalizedPath = expandTilde(cleanPath).replaceAll("\\", "/");
  if (/^~[^/]/.test(normalizedPath))
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason: "Paths beginning with ~user cannot be statically validated and require manual approval",
      },
    };
  if (normalizedPath.includes("`")) {
    let backtickStripped = unescapePsDoubleQuoted(normalizedPath);
    let denyHit = checkDenyRuleForGuessedPath(backtickStripped, cwd, toolPermissionContext, operationType);
    if (denyHit)
      return {
        allowed: false,
        resolvedPath: denyHit.resolvedPath,
        decisionReason: {
          type: "rule",
          rule: denyHit.rule,
        },
      };
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason:
          "Backtick escape characters in paths cannot be statically validated and require manual approval",
      },
    };
  }
  if (normalizedPath.includes("::")) {
    let afterProvider = normalizedPath.slice(normalizedPath.indexOf("::") + 2);
    let denyHit = checkDenyRuleForGuessedPath(afterProvider, cwd, toolPermissionContext, operationType);
    if (denyHit)
      return {
        allowed: false,
        resolvedPath: denyHit.resolvedPath,
        decisionReason: {
          type: "rule",
          rule: denyHit.rule,
        },
      };
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason:
          "Module-qualified provider paths (::) cannot be statically validated and require manual approval",
      },
    };
  }
  if (getPlatform() === "windows" && /^[a-z]:(?![/\\])/i.test(normalizedPath))
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason: `Path '${hadParamPrefix ? filePath : normalizedPath}' is drive-relative (resolves against the per-drive current directory, which cannot be statically validated) and requires manual approval`,
      },
    };
  normalizedPath = normalizeWindowsPathCase(normalizedPath);
  if (
    isUncOrDevicePath(normalizedPath) ||
    /DavWWWRoot/i.test(normalizedPath) ||
    /@SSL@/i.test(normalizedPath)
  )
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason: "UNC paths are blocked because they can trigger network requests and credential leakage",
      },
    };
  if (normalizedPath.includes("$") || normalizedPath.includes("%"))
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason: "Variable expansion syntax in paths requires manual approval",
      },
    };
  if ((getPlatform() === "windows" ? /^[a-z0-9]{2,}:/i : /^[a-z0-9]+:/i).test(normalizedPath))
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason: `Path '${hadParamPrefix ? filePath : normalizedPath}' uses a non-filesystem provider and requires manual approval`,
      },
    };
  if (hasInteriorDotDot(normalizedPath)) {
    let denyHit = checkDenyRuleForGuessedPath(normalizedPath, cwd, toolPermissionContext, operationType);
    if (denyHit)
      return {
        allowed: false,
        resolvedPath: denyHit.resolvedPath,
        decisionReason: {
          type: "rule",
          rule: denyHit.rule,
        },
      };
    return {
      allowed: false,
      resolvedPath: resolve(cwd, normalizedPath),
      decisionReason: {
        type: "other",
        reason:
          "Path contains '..' traversal after a directory segment, which may follow a symlink outside the working directory",
      },
    };
  }
  if (firstGlobCharIndex(normalizedPath) !== -1) {
    if (operationType === "write" || operationType === "create")
      return {
        allowed: false,
        resolvedPath: normalizedPath,
        decisionReason: {
          type: "other",
          reason: "Glob patterns are not allowed in write operations. Please specify an exact file path.",
        },
      };
    if (containsPathTraversal(normalizedPath)) {
      let absolutePath = isAbsolute(normalizedPath) ? normalizedPath : resolve(cwd, normalizedPath);
      let { resolvedPath } = safeResolvePath(getFsImplementation(), absolutePath);
      let permissionType = operationType === "read" ? "read" : "edit";
      for (let pathSpelling of getPathsForPermissionCheck(resolvedPath)) {
        let denyRule = matchingRuleForInput(pathSpelling, toolPermissionContext, permissionType, "deny");
        if (denyRule !== null)
          return {
            allowed: false,
            resolvedPath,
            decisionReason: {
              type: "rule",
              rule: denyRule,
            },
          };
      }
      if (hadParamPrefix) return withParamPrefixDenial(resolvedPath);
      return {
        allowed: false,
        resolvedPath,
        decisionReason: {
          type: "other",
          reason:
            "Glob patterns in paths cannot be statically validated \u2014 symlinks inside the glob expansion are not examined. Requires manual approval.",
        },
      };
    }
    let basePath = getGlobBaseDirectory(normalizedPath);
    let absoluteBasePath = isAbsolute(basePath) ? basePath : resolve(cwd, basePath);
    let { resolvedPath } = safeResolvePath(getFsImplementation(), absoluteBasePath);
    let denyRule = matchingRuleForInput(
      resolvedPath,
      toolPermissionContext,
      operationType === "read" ? "read" : "edit",
      "deny",
    );
    if (denyRule !== null)
      return {
        allowed: false,
        resolvedPath,
        decisionReason: {
          type: "rule",
          rule: denyRule,
        },
      };
    return {
      allowed: false,
      resolvedPath,
      decisionReason: {
        type: "other",
        reason:
          "Glob patterns in paths cannot be statically validated \u2014 symlinks inside the glob expansion are not examined. Requires manual approval.",
      },
    };
  }
  let absolutePath = isAbsolute(normalizedPath) ? normalizedPath : resolve(cwd, normalizedPath);
  let { resolvedPath, ...resolvedResult } = validateResolvedOperand(
    absolutePath,
    toolPermissionContext,
    operationType,
  );
  if (hadParamPrefix && resolvedResult.allowed) return withParamPrefixDenial(resolvedPath);
  if (hadParamPrefix && !resolvedResult.allowed && resolvedResult.decisionReason?.type === "safetyCheck")
    return {
      allowed: false,
      resolvedPath,
      decisionReason: {
        type: "safetyCheck",
        reason: `Path '${filePath}' resolves near a sensitive file under quote-stripping and cannot be statically validated; requires manual approval`,
        classifierApprovable: false,
      },
    };
  return {
    ...resolvedResult,
    resolvedPath,
  };
}
//@ chunk-6zpsr8vx.js:48208-48379 layout (2.1.88 match: getGlobBaseDirectory, 1)
function getGlobBaseDirectory(filePath) {
  let globMatch = firstGlobCharIndex(filePath);
  if (globMatch === -1) return filePath;
  let beforeGlob = filePath.substring(0, globMatch);
  let lastSepIndex = Math.max(beforeGlob.lastIndexOf("/"), beforeGlob.lastIndexOf("\\"));
  if (lastSepIndex === -1) return ".";
  return beforeGlob.substring(0, lastSepIndex + 1) || "/";
}
//@ chunk-6zpsr8vx.js:48379-48553 layout
/**
 * 只读类路径 cmdlet 集合（get-childitem、resolve-path、test-path 等）。
 */
var VALIDATABLE_ELEMENT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var READ_ONLY_PATH_CMDLETS;
deferInit("chunk-6zpsr8vx.js:48379", () => {
  VALIDATABLE_ELEMENT_TYPES = new Set(["StringConstant", "Parameter"]);
  READ_ONLY_PATH_CMDLETS = new Set([
    "get-childitem",
    "get-item",
    "get-itemproperty",
    "resolve-path",
    "convert-path",
    "get-filehash",
    "get-acl",
    "test-path",
  ]);
});
//@ chunk-6zpsr8vx.js:48553-49807 fingerprint (2.1.88 match: extractPathsFromCommand, 0.595)
/**
 * 按 CMDLET_PATH_CONFIG 从 cmdlet 参数中提取路径：识别参数缩写、冒号绑定值、位置参数，标记无法验证的参数（变量、表达式）与可选写入。
 */
function extractPathsFromCommand(cmd) {
  let canonical = resolveToCanonical(cmd.name);
  let config = getOwn(CMDLET_PATH_CONFIG, canonical);
  if (!config)
    return {
      paths: [],
      operationType: "read",
      hasUnvalidatablePathArg: false,
      optionalWrite: false,
    };
  let paramCategories = getParamCategories(config);
  let paths = [];
  let { args, elementTypes } = cmd;
  let hasUnvalidatablePathArg = false;
  let positionalsSeen = 0;
  let positionalSkip = config.positionalSkip ?? 0;
  function checkArgElementType(argIdx) {
    if (!elementTypes) return;
    let elementType = elementTypes[argIdx + 1];
    if (elementType && !VALIDATABLE_ELEMENT_TYPES.has(elementType)) hasUnvalidatablePathArg = true;
  }
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    if (!arg) continue;
    let argElementType = elementTypes ? elementTypes[i + 1] : undefined;
    if (isPowerShellParameter(arg, argElementType)) {
      let normalized = "-" + arg.slice(1);
      let colonIdx = normalized.indexOf(":", 1);
      let paramLower = (colonIdx > 0 ? normalized.substring(0, colonIdx) : normalized).toLowerCase();
      let paramKind = classifyParamAbbreviation(paramLower, paramCategories);
      if (paramKind === "path") {
        let value;
        if (colonIdx > 0) {
          let rawValue = arg.substring(colonIdx + 1);
          if (hasComplexColonValue(rawValue)) hasUnvalidatablePathArg = true;
          value = skipPsLeadingSpaceAndComments(rawValue);
        } else {
          let nextVal = args[i + 1];
          let nextType = elementTypes ? elementTypes[i + 2] : undefined;
          if (nextVal && !isPowerShellParameter(nextVal, nextType)) {
            value = nextVal;
            checkArgElementType(i + 1);
            i++;
          }
        }
        if (value) paths.push(value);
      } else if (paramKind === "leafOnly") {
        let value;
        if (colonIdx > 0) {
          let rawValue = arg.substring(colonIdx + 1);
          if (hasComplexColonValue(rawValue)) hasUnvalidatablePathArg = true;
          value = skipPsLeadingSpaceAndComments(rawValue);
        } else {
          let nextVal = args[i + 1];
          let nextType = elementTypes ? elementTypes[i + 2] : undefined;
          if (nextVal && !isPowerShellParameter(nextVal, nextType)) {
            value = nextVal;
            checkArgElementType(i + 1);
            i++;
          }
        }
        if (value !== undefined)
          if (value.includes("/") || value.includes("\\") || value === "." || value === "..")
            hasUnvalidatablePathArg = true;
          else paths.push(value);
      } else if (paramKind === "switch");
      else if (paramKind === "value") {
        if (colonIdx > 0) {
          if (hasComplexColonValue(arg.substring(colonIdx + 1))) hasUnvalidatablePathArg = true;
        } else {
          let nextArg = args[i + 1];
          let nextArgType = elementTypes ? elementTypes[i + 2] : undefined;
          if (nextArg && !isPowerShellParameter(nextArg, nextArgType)) {
            checkArgElementType(i + 1);
            i++;
          }
        }
      } else {
        hasUnvalidatablePathArg = true;
        {
          let nextArg = args[i + 1];
          let nextElementType = elementTypes ? elementTypes[i + 2] : undefined;
          if (nextArg && !isPowerShellParameter(nextArg, nextElementType)) paths.push(nextArg);
        }
        if (colonIdx > 0) {
          let rawValue = arg.substring(colonIdx + 1);
          paths.push(skipPsLeadingSpaceAndComments(rawValue));
        }
      }
      continue;
    }
    if (positionalsSeen < positionalSkip) {
      positionalsSeen++;
      continue;
    }
    positionalsSeen++;
    checkArgElementType(i);
    paths.push(arg);
  }
  return {
    paths,
    operationType: config.operationType,
    hasUnvalidatablePathArg,
    optionalWrite: config.optionalWrite ?? false,
  };
}
//@ chunk-6zpsr8vx.js:49807-50162 fingerprint (2.1.88 match: checkPathConstraints, 1)
/**
 * PowerShell 路径约束：逐条语句检查，deny 立即返回，优先返回安全检查类 ask。
 */
function checkPathConstraints(input, parsed, toolPermissionContext, compoundCommandHasCd = false) {
  if (!parsed.valid)
    return {
      behavior: "passthrough",
      message: "Cannot validate paths for unparsed command",
    };
  let firstAsk;
  let outsideReadsAsk;
  for (let statement of parsed.statements) {
    let result = checkPathConstraintsForStatement(statement, toolPermissionContext, compoundCommandHasCd);
    if (result.behavior === "deny") return result;
    if (result.behavior === "ask") {
      firstAsk ??= result;
      if (isOutsideReadsBlockedAsk(result.decisionReason)) outsideReadsAsk ??= result;
    }
  }
  return (
    outsideReadsAsk ??
    firstAsk ?? {
      behavior: "passthrough",
      message: "All path constraints validated successfully",
    }
  );
}
//@ chunk-6zpsr8vx.js:50162-51750 sole-consumer
/**
 * 读封锁开启时检查外部程序（含内联代码解释器、cmd /c）的参数路径：内联代码直接拒绝，变量/表达式参数要求确认，路径命中 deny 规则拒绝，读出工作目录则 ask。
 */
function checkNativeCommandReads(command, cwd, permissionContext, hasCd) {
  let canonicalName = resolveToCanonical(command.name);
  let elementTypes = command.elementTypes;
  let replaced = command.name
    .slice(Math.max(command.name.lastIndexOf("\\"), command.name.lastIndexOf("/")) + 1)
    .replace(/\.exe$/i, "")
    .replace(/[\d.]+$/, "");
  let inlineCodeFlags =
    INLINE_CODE_FLAGS.get(replaced) ?? (replaced.toLowerCase() === "cmd" ? new Set(["/c", "/k"]) : undefined);
  if (
    inlineCodeFlags !== undefined &&
    command.args.some((arg) => {
      let lower = arg.toLowerCase();
      return [...inlineCodeFlags].some(
        (flag) => lower === flag.toLowerCase() || lower.startsWith(flag.toLowerCase() + "="),
      );
    })
  )
    return outsideReadsTooComplexAsk(
      `${canonicalName} runs inline code, which cannot be checked against the read block`,
    );
  let runtimeAsk;
  for (let j = 0; j < command.args.length; j++) {
    let arg = command.args[j];
    let elementType = elementTypes ? elementTypes[j + 1] : undefined;
    if (elementType !== undefined && elementType !== "StringConstant" && elementType !== "Parameter") {
      runtimeAsk ??= outsideReadsRuntimePathAsk(canonicalName);
      continue;
    }
    if (arg === "") continue;
    let index = arg.indexOf(":");
    let index_2 = arg.indexOf("=");
    let optionValue =
      index > 0 && /^[-/][A-Za-z]+$/.test(arg.slice(0, index))
        ? arg.slice(index + 1)
        : index_2 > 0 && /^--?[A-Za-z][A-Za-z-]*$/.test(arg.slice(0, index_2))
          ? arg.slice(index_2 + 1)
          : undefined;
    if (optionValue !== undefined && optionValue.includes("$")) {
      runtimeAsk ??= outsideReadsRuntimePathAsk(canonicalName);
      continue;
    }
    if (isUncOrDevicePath(arg)) {
      runtimeAsk ??= outsideReadsRuntimePathAsk(canonicalName);
      continue;
    }
    if (optionValue === undefined && isPowerShellParameter(arg, elementType)) continue;
    for (let candidatePath of optionValue !== undefined ? [optionValue] : [arg]) {
      if (candidatePath === "") continue;
      if (candidatePath.startsWith("~") && candidatePath !== "~" && !/^~[\\/]/.test(candidatePath)) {
        runtimeAsk ??= outsideReadsRuntimePathAsk(canonicalName);
        continue;
      }
      let expandedPath = expandTilde(candidatePath);
      if (hasCd && !isAbsolute(expandedPath)) {
        runtimeAsk ??= outsideReadsRuntimePathAsk(canonicalName);
        continue;
      }
      let globParent = candidatePath;
      let globIndex = firstGlobCharIndex(expandedPath);
      if (globIndex !== -1) {
        let sliced = expandedPath.slice(0, globIndex);
        globParent = /[\\/]$/.test(sliced) ? sliced : dirname(sliced);
      }
      let globParentExpanded = expandTilde(globParent);
      if (isUncOrDevicePath(globParentExpanded)) {
        runtimeAsk ??= outsideReadsRuntimePathAsk(canonicalName);
        continue;
      }
      let absoluteTarget = isAbsolute(globParentExpanded)
        ? globParentExpanded
        : resolve(cwd, globParentExpanded);
      if (
        !hasInteriorDotDot(globParentExpanded.replaceAll("\\", "/")) &&
        !getFsImplementation().existsSync(absoluteTarget)
      )
        continue;
      let pathResult = validatePath(globParent, cwd, permissionContext, "read");
      if (pathResult.allowed) continue;
      if (pathResult.decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message: `${canonicalName} targeting '${pathResult.resolvedPath}' was blocked by a deny rule`,
          decisionReason: pathResult.decisionReason,
        };
      if (isOutsideReadsBlockedAsk(pathResult.decisionReason)) {
        runtimeAsk ??= askOutsideReadBlock(
          canonicalName,
          pathResult.decisionReason,
          isUnchangedByBasicNormalize(globParent) ? pathResult.resolvedPath : undefined,
        );
        continue;
      }
      runtimeAsk ??= outsideReadsRuntimePathAsk(canonicalName);
    }
  }
  return runtimeAsk;
}
//@ chunk-6zpsr8vx.js:51750-52069 sole-consumer (2.1.88 match: isItemTypeParamAbbrev, 0.791)
/**
 * New-Item 参数中是否同时有 -ItemType *link/junction 与 -Value（创建链接到指定目标）。
 */
function isItemTypeParamAbbrev_2(cmd) {
  let hasLinkType = false;
  let hasValue = false;
  for (let i = 0; i < cmd.length; i++) {
    let lower = cmd[i].toLowerCase();
    let colonIdx = lower.indexOf(":");
    let paramName = colonIdx > 0 ? lower.slice(0, colonIdx) : lower;
    let paramValue = colonIdx > 0 ? lower.slice(colonIdx + 1) : (cmd[i + 1] ?? "").toLowerCase();
    if (
      paramName.length >= 2 &&
      ("-itemtype".startsWith(paramName) || "-type".startsWith(paramName)) &&
      /link|junction/.test(paramValue)
    )
      hasLinkType = true;
    if (paramName.length >= 2 && "-value".startsWith(paramName)) hasValue = true;
  }
  return hasLinkType && hasValue;
}
//@ chunk-6zpsr8vx.js:52198-52491 affinity
function askOutsideReadBlock(blockedPath, decisionReason, blockedPath_2) {
  return {
    behavior: "ask",
    message: `${blockedPath} names a path outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`,
    blockedPath: blockedPath_2,
    decisionReason,
  };
}
//@ chunk-6zpsr8vx.js:52491-59906 fingerprint (2.1.88 match: checkPathConstraintsForStatement, 0.909)
/**
 * 单条 PowerShell 语句的路径约束：cd 复合命令要询问；对每个命令提取路径并校验（读封锁、git 安全相关写 cmdlet、受保护删除路径、cmd /c 删除、管道/嵌套命令、重定向目标），返回 deny/ask/passthrough。
 */
function checkPathConstraintsForStatement(statement, toolPermissionContext, compoundCommandHasCd = false) {
  let cwd = getCwd();
  let firstAsk;
  let outsideReadsAsk;
  let blocksOutsideReads = toolPermissionContext.blockReadsOutsideWorkingDirectories === true;
  let needsReadCheck = (canonical, operationType) =>
    blocksOutsideReads && (operationType === "read" || GIT_SAFETY_WRITE_CMDLETS.has(canonical));
  if (compoundCommandHasCd)
    firstAsk = {
      behavior: "ask",
      message:
        "Compound command changes working directory (Set-Location/Push-Location/Pop-Location/New-PSDrive) \u2014 relative paths cannot be validated against the original cwd and require manual approval",
      decisionReason: {
        type: "other",
        reason:
          "Compound command contains cd with path operation \u2014 manual approval required to prevent path resolution bypass",
      },
    };
  let hasExpressionPipelineSource = false;
  let pipelineSourceText;
  let sawNonReadOnlyCmdlet = false;
  for (let cmd of statement.commands) {
    if (cmd.elementType !== "CommandAst") {
      hasExpressionPipelineSource = true;
      pipelineSourceText = cmd.text;
      continue;
    }
    let { paths, operationType, hasUnvalidatablePathArg, optionalWrite } = extractPathsFromCommand(cmd);
    let canonical = resolveToCanonical(cmd.name);
    let hasCmdletPathConfig = getOwn(CMDLET_PATH_CONFIG, canonical) !== undefined;
    let protectedPathDenial = checkCmdRemovalOfProtectedPath(cmd, cwd, compoundCommandHasCd);
    if (protectedPathDenial !== undefined) return protectedPathDenial;
    if (blocksOutsideReads && !hasCmdletPathConfig) {
      let denyHit = checkNativeCommandReads(cmd, cwd, toolPermissionContext, compoundCommandHasCd);
      if (denyHit?.behavior === "deny") return denyHit;
      outsideReadsAsk ??= denyHit;
    }
    if (blocksOutsideReads && canonical === "new-item" && isItemTypeParamAbbrev_2(cmd.args))
      outsideReadsAsk ??= outsideReadsRuntimePathAsk(canonical);
    let previousWasReadOnly = sawNonReadOnlyCmdlet;
    if (!READ_ONLY_PATH_CMDLETS.has(canonical)) sawNonReadOnlyCmdlet = true;
    if (hasExpressionPipelineSource) {
      let canonical_2 = resolveToCanonical(cmd.name);
      if (pipelineSourceText !== undefined) {
        let variants = new Set();
        for (let variant of [
          pipelineSourceText,
          stripPsParameterPrefix(pipelineSourceText),
          stripFileSystemProviderPrefix(pipelineSourceText),
          createSingleEditDiffConfig(pipelineSourceText),
        ]) {
          variants.add(variant);
          if (variant.includes("`")) variants.add(unescapePsDoubleQuoted(variant));
          if (variant.includes("::")) {
            let sliced = variant.slice(variant.indexOf("::") + 2);
            variants.add(sliced);
            if (sliced.includes("`")) variants.add(unescapePsDoubleQuoted(sliced));
          }
        }
        for (let variant of variants) {
          let denyHit = checkDenyRuleForGuessedPath(variant, cwd, toolPermissionContext, operationType);
          if (denyHit)
            return {
              behavior: "deny",
              message: `${canonical_2} targeting '${denyHit.resolvedPath}' was blocked by a deny rule`,
              decisionReason: {
                type: "rule",
                rule: denyHit.rule,
              },
            };
        }
      }
      firstAsk ??= {
        behavior: "ask",
        message: `${canonical_2} receives its path from a pipeline expression source that cannot be statically validated and requires manual approval`,
      };
      if (needsReadCheck(canonical, operationType)) outsideReadsAsk ??= outsideReadsRuntimePathAsk(canonical);
    }
    if (hasUnvalidatablePathArg) {
      let canonical_2 = resolveToCanonical(cmd.name);
      firstAsk ??= {
        behavior: "ask",
        message: `${canonical_2} uses a parameter or complex path expression (array literal, subexpression, unknown parameter, etc.) that cannot be statically validated and requires manual approval`,
      };
      if (needsReadCheck(canonical, operationType)) outsideReadsAsk ??= outsideReadsRuntimePathAsk(canonical);
    }
    if (operationType !== "read" && !optionalWrite && paths.length === 0 && hasCmdletPathConfig) {
      firstAsk ??= {
        behavior: "ask",
        message: `${canonical} is a write operation but no target path could be determined; requires manual approval`,
      };
      continue;
    }
    if (previousWasReadOnly && hasCmdletPathConfig) {
      firstAsk ??= {
        behavior: "ask",
        message: `${canonical} may receive a path from an upstream pipeline command whose output cannot be statically validated and requires manual approval`,
      };
      if (needsReadCheck(canonical, operationType)) outsideReadsAsk ??= outsideReadsRuntimePathAsk(canonical);
    }
    let isRemoveItem = resolveToCanonical(cmd.name) === "remove-item";
    if (isRemoveItem) {
      if (
        cmd.args.some((arg) => {
          let lower = (arg.length > 0 ? "-" + arg.slice(1) : arg).toLowerCase();
          let index = lower.indexOf(":");
          let paramName = index > 0 ? lower.slice(0, index) : lower;
          return paramName.length >= 2 && "-recurse".startsWith(paramName);
        })
      ) {
        let cwdNormalized = normalizeCaseForComparison(cwd);
        for (let filePath of paths) {
          let replaced = expandTilde(normalizeWindowsPathCase(filePath)).replace(/\\/g, "/");
          let absoluteTarget = isAbsolute(replaced) ? resolve(replaced) : resolve(cwd, replaced);
          let targetNormalized = normalizeCaseForComparison(absoluteTarget);
          if (
            targetNormalized === cwdNormalized ||
            cwdNormalized.startsWith(targetNormalized + "/") ||
            cwdNormalized.startsWith(targetNormalized + "\\")
          ) {
            firstAsk ??= {
              behavior: "ask",
              message: `Remove-Item -Recurse targeting '${filePath}' would delete the working directory including .git and .claude \u2014 requires manual approval`,
            };
            break;
          }
        }
      }
    }
    if (
      compoundCommandHasCd &&
      needsReadCheck(canonical, operationType) &&
      paths.some((path) => !isAbsolute(expandTilde(path)))
    )
      outsideReadsAsk ??= outsideReadsRuntimePathAsk(canonical);
    for (let path of paths) {
      if (isRemoveItem && isDangerousRemovalPath(path)) return dangerousRemovalDeny(path);
      let { allowed, resolvedPath, decisionReason } = validatePath(
        path,
        cwd,
        toolPermissionContext,
        operationType,
      );
      if (operationType !== "read" && needsReadCheck(canonical, operationType)) {
        let readResult = validatePath(path, cwd, toolPermissionContext, "read");
        if (!readResult.allowed && readResult.decisionReason?.type === "rule")
          return {
            behavior: "deny",
            message: `${canonical} targeting '${readResult.resolvedPath}' was blocked by a deny rule`,
            decisionReason: readResult.decisionReason,
          };
        if (!readResult.allowed && isOutsideReadsBlockedAsk(readResult.decisionReason))
          outsideReadsAsk ??= askOutsideReadBlock(
            canonical,
            readResult.decisionReason,
            isUnchangedByBasicNormalize(path) ? readResult.resolvedPath : undefined,
          );
      }
      if (isRemoveItem && isDangerousRemovalPath_2(resolvedPath)) return dangerousRemovalDeny(resolvedPath);
      if (isRemoveItem) {
        let dangerousRemovalPath = resolveDangerousRemovalPath(path, cwd);
        if (dangerousRemovalPath !== null) return dangerousRemovalDeny(dangerousRemovalPath);
      }
      if (!allowed) {
        let canonical = resolveToCanonical(cmd.name);
        let workingDirs = Array.from(allWorkingDirectories(toolPermissionContext));
        let dirListStr = formatDirectoryList(workingDirs);
        let message =
          decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
            ? decisionReason.reason
            : `${canonical} targeting '${isUnchangedByBasicNormalize(path) ? resolvedPath : path}' was blocked. For security, Claude Code may only access files in the allowed working directories for this session: ${dirListStr}.`;
        if (decisionReason?.type === "rule")
          return {
            behavior: "deny",
            message,
            decisionReason,
          };
        let suggestions = [];
        if (resolvedPath && isUnchangedByBasicNormalize(path))
          if (operationType === "read") {
            let suggestion = createReadRuleSuggestion(getDirectoryForPath(resolvedPath), "session");
            if (suggestion) suggestions.push(suggestion);
          } else
            suggestions.push({
              type: "addDirectories",
              directories: [getDirectoryForPath(resolvedPath)],
              destination: "session",
            });
        if (
          isUnchangedByBasicNormalize(path) &&
          (operationType === "write" || operationType === "create") &&
          acceptEditsSuggestionApplies(toolPermissionContext)
        )
          suggestions.push({
            type: "setMode",
            mode: "acceptEdits",
            destination: "session",
          });
        let askResult = {
          behavior: "ask",
          message,
          blockedPath: isUnchangedByBasicNormalize(path) ? resolvedPath : undefined,
          decisionReason,
          suggestions,
        };
        firstAsk ??= askResult;
        if (isOutsideReadsBlockedAsk(decisionReason)) outsideReadsAsk ??= askResult;
      }
    }
  }
  if (statement.nestedCommands)
    for (let cmd of statement.nestedCommands) {
      let { paths, operationType, hasUnvalidatablePathArg, optionalWrite } = extractPathsFromCommand(cmd);
      let canonical = resolveToCanonical(cmd.name);
      let protectedPathDenial = checkCmdRemovalOfProtectedPath(cmd, cwd, compoundCommandHasCd);
      if (protectedPathDenial !== undefined) return protectedPathDenial;
      if (hasUnvalidatablePathArg) {
        firstAsk ??= {
          behavior: "ask",
          message: `${canonical} uses a parameter or complex path expression (array literal, subexpression, unknown parameter, etc.) that cannot be statically validated and requires manual approval`,
        };
        if (needsReadCheck(canonical, operationType))
          outsideReadsAsk ??= outsideReadsRuntimePathAsk(canonical);
      }
      if (
        operationType !== "read" &&
        !optionalWrite &&
        paths.length === 0 &&
        getOwn(CMDLET_PATH_CONFIG, canonical) !== undefined
      ) {
        firstAsk ??= {
          behavior: "ask",
          message: `${canonical} is a write operation but no target path could be determined; requires manual approval`,
        };
        continue;
      }
      let isRemoveItem = resolveToCanonical(cmd.name) === "remove-item";
      for (let filePath of paths) {
        if (isRemoveItem && isDangerousRemovalPath(filePath)) return dangerousRemovalDeny(filePath);
        let { allowed, resolvedPath, decisionReason } = validatePath(
          filePath,
          cwd,
          toolPermissionContext,
          operationType,
        );
        if (operationType !== "read" && needsReadCheck(canonical, operationType)) {
          let readResult = validatePath(filePath, cwd, toolPermissionContext, "read");
          if (!readResult.allowed && readResult.decisionReason?.type === "rule")
            return {
              behavior: "deny",
              message: `${canonical} targeting '${readResult.resolvedPath}' was blocked by a deny rule`,
              decisionReason: readResult.decisionReason,
            };
          if (!readResult.allowed && isOutsideReadsBlockedAsk(readResult.decisionReason))
            outsideReadsAsk ??= askOutsideReadBlock(
              canonical,
              readResult.decisionReason,
              isUnchangedByBasicNormalize(filePath) ? readResult.resolvedPath : undefined,
            );
        }
        if (isRemoveItem && isDangerousRemovalPath_2(resolvedPath)) return dangerousRemovalDeny(resolvedPath);
        if (isRemoveItem) {
          let dangerousRemovalPath = resolveDangerousRemovalPath(filePath, cwd);
          if (dangerousRemovalPath !== null) return dangerousRemovalDeny(dangerousRemovalPath);
        }
        if (!allowed) {
          let canonical = resolveToCanonical(cmd.name);
          let workingDirs = Array.from(allWorkingDirectories(toolPermissionContext));
          let dirListStr = formatDirectoryList(workingDirs);
          let message =
            decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
              ? decisionReason.reason
              : `${canonical} targeting '${isUnchangedByBasicNormalize(filePath) ? resolvedPath : filePath}' was blocked. For security, Claude Code may only access files in the allowed working directories for this session: ${dirListStr}.`;
          if (decisionReason?.type === "rule")
            return {
              behavior: "deny",
              message,
              decisionReason,
            };
          let suggestions = [];
          if (resolvedPath && isUnchangedByBasicNormalize(filePath))
            if (operationType === "read") {
              let suggestion = createReadRuleSuggestion(getDirectoryForPath(resolvedPath), "session");
              if (suggestion) suggestions.push(suggestion);
            } else
              suggestions.push({
                type: "addDirectories",
                directories: [getDirectoryForPath(resolvedPath)],
                destination: "session",
              });
          if (
            isUnchangedByBasicNormalize(filePath) &&
            (operationType === "write" || operationType === "create") &&
            acceptEditsSuggestionApplies(toolPermissionContext)
          )
            suggestions.push({
              type: "setMode",
              mode: "acceptEdits",
              destination: "session",
            });
          let askResult = {
            behavior: "ask",
            message,
            blockedPath: isUnchangedByBasicNormalize(filePath) ? resolvedPath : undefined,
            decisionReason,
            suggestions,
          };
          firstAsk ??= askResult;
          if (isOutsideReadsBlockedAsk(decisionReason)) outsideReadsAsk ??= askResult;
        }
      }
      if (hasExpressionPipelineSource)
        firstAsk ??= {
          behavior: "ask",
          message: `${resolveToCanonical(cmd.name)} appears inside a control-flow or chain statement where piped expression sources cannot be statically validated and requires manual approval`,
        };
    }
  if (statement.nestedCommands) {
    for (let cmd of statement.nestedCommands)
      if (cmd.redirections)
        for (let redir of cmd.redirections) {
          if (redir.isMerging) continue;
          if (!redir.target) continue;
          if (isNullRedirectionTarget(redir.target)) continue;
          let { allowed, resolvedPath, decisionReason } = validatePath(
            redir.target,
            cwd,
            toolPermissionContext,
            "create",
          );
          if (!allowed) {
            let workingDirs = Array.from(allWorkingDirectories(toolPermissionContext));
            let dirListStr = formatDirectoryList(workingDirs);
            let message =
              decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
                ? decisionReason.reason
                : `Output redirection to '${isUnchangedByBasicNormalize(redir.target) ? resolvedPath : redir.target}' was blocked. For security, Claude Code may only write to files in the allowed working directories for this session: ${dirListStr}.`;
            if (decisionReason?.type === "rule")
              return {
                behavior: "deny",
                message,
                decisionReason,
              };
            firstAsk ??= {
              behavior: "ask",
              message,
              blockedPath: isUnchangedByBasicNormalize(redir.target) ? resolvedPath : undefined,
              decisionReason,
              suggestions: isUnchangedByBasicNormalize(redir.target)
                ? [
                    {
                      type: "addDirectories",
                      directories: [getDirectoryForPath(resolvedPath)],
                      destination: "session",
                    },
                  ]
                : [],
            };
          }
        }
  }
  if (statement.redirections)
    for (let redir of statement.redirections) {
      if (redir.isMerging) continue;
      if (!redir.target) continue;
      if (isNullRedirectionTarget(redir.target)) continue;
      let { allowed, resolvedPath, decisionReason } = validatePath(
        redir.target,
        cwd,
        toolPermissionContext,
        "create",
      );
      if (!allowed) {
        let workingDirs = Array.from(allWorkingDirectories(toolPermissionContext));
        let dirListStr = formatDirectoryList(workingDirs);
        let message =
          decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
            ? decisionReason.reason
            : `Output redirection to '${isUnchangedByBasicNormalize(redir.target) ? resolvedPath : redir.target}' was blocked. For security, Claude Code may only write to files in the allowed working directories for this session: ${dirListStr}.`;
        if (decisionReason?.type === "rule")
          return {
            behavior: "deny",
            message,
            decisionReason,
          };
        firstAsk ??= {
          behavior: "ask",
          message,
          blockedPath: isUnchangedByBasicNormalize(redir.target) ? resolvedPath : undefined,
          decisionReason,
          suggestions: isUnchangedByBasicNormalize(redir.target)
            ? [
                {
                  type: "addDirectories",
                  directories: [getDirectoryForPath(resolvedPath)],
                  destination: "session",
                },
              ]
            : [],
        };
      }
    }
  return (
    outsideReadsAsk ??
    firstAsk ?? {
      behavior: "passthrough",
      message: "All path constraints validated successfully",
    }
  );
}
export { isDangerousRemovalPath, dangerousRemovalDeny, checkPathConstraints };
