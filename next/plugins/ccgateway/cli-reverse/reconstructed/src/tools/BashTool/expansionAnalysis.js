/**
 * tools/BashTool/expansionAnalysis.ts
 *
 * 2.1.316 新增：命令替换与变量展开分析
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (35)
 * attribution: affinity 1, placement 34
 */
import { getPlatform } from "../../utils/platform.js";
import { normalizeDosDevicePath } from "../../utils/pathClassification.js";
import { isDangerousRemovalPath } from "../../utils/permissions/pathValidation.js";
import { expandTildeWithHome } from "../../utils/networkPaths.js";
import { POSIX_SHELL_NAMES } from "../../utils/bash/ast.js";
import { splitCommand } from "../../utils/bash/commands.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1069680-1070528 affinity
/**
 * 危险删除检测用正则：$VAR/…、${N}/… 形式的目标，顶层目录名列表（Linux/macOS/Windows），以及 __TRACKED_VAR__/顶层目录的匹配。
 */
var VAR_SLASH_TARGET_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var POSITIONAL_VAR_SLASH_TARGET_RE;
var TOP_LEVEL_DIR_NAMES;
var TRACKED_VAR_TOP_LEVEL_RE;
var VAR_TOP_LEVEL_TARGET_RE;
deferInit("chunk-5xgkngpb.js:1069680", () => {
  VAR_SLASH_TARGET_RE =
    /^[\uE020"']*\$(?:\{[A-Za-z_][A-Za-z0-9_]*(?::?-(?:["']{2}|"?\$\{?[A-Za-z_][A-Za-z0-9_]*\}?"?)?)?\}|[A-Za-z_][A-Za-z0-9_]*)[\uE020"']*\\?\/(?:[*?[{]|\$|\/|["']|\uE020|$)/;
  POSITIONAL_VAR_SLASH_TARGET_RE =
    /^[\uE020"']*\$(?:\{(?:[0-9]+|[@*!])(?::?-(?:["']{2}|"?\$\{?[A-Za-z_][A-Za-z0-9_]*\}?"?)?)?\}|[0-9@*!])[\uE020"']*\\?\/(?:[*?[{]|\$|\/|["']|\uE020|$)/;
  TOP_LEVEL_DIR_NAMES =
    "bin|boot|dev|etc|home|lib|lib32|lib64|libx32|media|mnt|opt|proc|root|run|sbin|srv|sys|tmp|usr|var|snap|nix|lost\\+found|private|cores|Applications|Library|System|Users|Volumes|Windows|ProgramData|cygdrive";
  TRACKED_VAR_TOP_LEVEL_RE = new RegExp(
    String.raw`^(?:__TRACKED_VAR__)+[\\/]+(${TOP_LEVEL_DIR_NAMES})(?:[\\/]+\*+)*[\\/]*$`,
    "i",
  );
  VAR_TOP_LEVEL_TARGET_RE = new RegExp(
    String.raw`^[\uE020"']*\$(?:\{([A-Za-z_][A-Za-z0-9_]*)(?::?-(?:["']{2}|"?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?)?)?\}|([A-Za-z_][A-Za-z0-9_]*))[\uE020"']*\\?\/(${TOP_LEVEL_DIR_NAMES})(?:[\\/]+\*+)*\/?[\uE020"']*$`,
    "i",
  );
});
//@ chunk-5xgkngpb.js:1070528-1070573 placement
/**
 * 判断变量名是否为 HOME 或 PWD（展开分析中特殊处理）。
 */
function isHomeOrCwdVar(name) {
  return name === "HOME" || name === "PWD";
}
//@ chunk-5xgkngpb.js:1070573-1070747 placement
function matchRootChildTarget(target, isRootLike) {
  let match = VAR_TOP_LEVEL_TARGET_RE.exec(target.replace(/\/(?:\.\/)+/g, "/").replace(/\/{2,}/g, "/"));
  if (match === null) return;
  let firstVar = match[1] ?? match[3];
  let nestedVar = match[2];
  return isRootLike(firstVar) && (nestedVar === undefined || isRootLike(nestedVar)) ? match[4] : undefined;
}
//@ chunk-5xgkngpb.js:1070747-1071165 placement
/**
 * 展开分析常量：产出路径的命令替换（cd/pwd/dirname/git rev-parse）、默认分析上下文、长度上限、赋值/unset/for 循环正则。
 */
var PATH_COMMAND_SUBST_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEFAULT_EXPANSION_CONTEXT;
var MAX_EXPANSION_SCAN;
var ASSIGNMENT_NAME_RE;
var UNSET_STATEMENT_RE;
var FOR_LOOP_RE;
deferInit("chunk-5xgkngpb.js:1070747", () => {
  PATH_COMMAND_SUBST_RE = /^\s*(?:(cd|pwd|dirname)(?![A-Za-z0-9_-])|git\s+(rev-parse)\b)/;
  DEFAULT_EXPANSION_CONTEXT = {
    mayBeUnset: () => false,
    derived: new Map(),
    assigned: new Set(),
    evalStrings: false,
  };
  MAX_EXPANSION_SCAN = 1e4;
  ASSIGNMENT_NAME_RE = /(?:^|[\s;&|(])([A-Za-z_][A-Za-z0-9_]*)=/g;
  UNSET_STATEMENT_RE =
    /(?:^|[;&|({\n]|\b(?:then|do|else|elif)\b|!)[ \t]*unset[ \t]+(?:-[a-z][ \t]+)*((?:[A-Za-z_][A-Za-z0-9_]*[ \t]*)+)/g;
  FOR_LOOP_RE =
    /(?:^|[;&|({\n]|\b(?:then|do|else|elif)\b)\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([^;\n]*)/g;
});
//@ chunk-5xgkngpb.js:1071165-1071614 placement
/**
 * 把命令文本中 heredoc 正文替换为空格（保留换行与长度），避免正文内容被当作命令分析。
 */
function blankHeredocBodies(text) {
  let result = text;
  let masked = maskQuotedAndComments(result, true);
  let heredocRe = /(?:^|[^<$(])<<(?!<)/g;
  for (let match = heredocRe.exec(masked); match !== null; match = heredocRe.exec(masked)) {
    let heredocStart = match.index + match[0].length - 2;
    let match_2 = /^<<-?\s*\\?["']?([A-Za-z_][A-Za-z0-9_]*)["']?[^\n]*\n/.exec(result.slice(heredocStart));
    if (match_2 === null) continue;
    let bodyStart = heredocStart + match_2[0].length;
    let match_3 = new RegExp(String.raw`^\t*${match_2[1]}[ \t]*$`, "m").exec(result.slice(bodyStart));
    let bodyEnd = match_3 === null ? result.length : bodyStart + match_3.index + match_3[0].length;
    result =
      result.slice(0, bodyStart) +
      result.slice(bodyStart, bodyEnd).replace(/[^\n]/g, " ") +
      result.slice(bodyEnd);
    masked = maskQuotedAndComments(result, true);
    heredocRe.lastIndex = bodyEnd;
  }
  return result;
}
//@ chunk-5xgkngpb.js:1071614-1071779 placement
function joinLineContinuations(text) {
  let masked = maskQuotedAndComments(text, true);
  let result = text;
  for (let idx = masked.length - 1; idx > 0; idx--)
    if (
      masked[idx] ===
        `
` &&
      masked[idx - 1] === "\\" &&
      !(masked[idx - 2] === "\\" && text[idx - 1] === "\\")
    )
      result = result.slice(0, idx - 1) + result.slice(idx + 1);
  return result;
}
//@ chunk-5xgkngpb.js:1071779-1071836 placement
/**
 * 匹配 /c/、/cygdrive/c/ 这类 Windows 盘符路径。
 */
var CYGWIN_DRIVE_PATH_RE = /^[\\/](?:cygdrive[\\/])?([A-Za-z])(?=[\\/]|$)/i;
//@ chunk-5xgkngpb.js:1071836-1071908 placement
/**
 * 先按原路径、再按其 Windows 盘符形式检查谓词。
 */
function matchesPathOrWindowsDrive(path, predicate) {
  if (predicate(path)) return true;
  let windowsDrivePath = toWindowsDrivePath(path);
  return windowsDrivePath !== undefined && predicate(windowsDrivePath);
}
//@ chunk-5xgkngpb.js:1071908-1072112 placement
function toWindowsDrivePath(path) {
  if (getPlatform() !== "windows") return;
  let normalized = normalizeDosDevicePath(path);
  if (normalized !== path) return normalized;
  let match = CYGWIN_DRIVE_PATH_RE.exec(path);
  if (match === null) return;
  let replaced = path.slice(match[0].length).replace(/\//g, "\\");
  return `${match[1].toUpperCase()}:${replaced === "" ? "\\" : replaced}`;
}
//@ chunk-5xgkngpb.js:1072112-1072146 placement
/**
 * 判断路径是危险删除目标（同时检查 Windows 盘符形式）。
 */
function isDangerousRemovalTarget(target) {
  return matchesPathOrWindowsDrive(target, isDangerousRemovalPath);
}
//@ chunk-5xgkngpb.js:1072146-1072428 placement
function isRootLikeValue(value) {
  let replaced = value.replace(/^(["'])([\s\S]*)\1$/, "$2").replace(/(.)\/+$/, "$1");
  let defaultValue = /^\$\{[A-Za-z_][A-Za-z0-9_]*:?-([^}$`]*)\}$/.exec(replaced)?.[1];
  return (
    /^\/+$/.test(replaced) ||
    /(?:^|\/)\.\.?\/*$/.test(replaced) ||
    /^\$\{?HOME\}?$/.test(replaced) ||
    (!/[$`]/.test(replaced) && isDangerousRemovalTarget(expandTildeWithHome(replaced))) ||
    (defaultValue !== undefined &&
      defaultValue !== "" &&
      isDangerousRemovalTarget(expandTildeWithHome(defaultValue)))
  );
}
//@ chunk-5xgkngpb.js:1072428-1072855 placement
/**
 * 从指定位置找到 shell 单词的结束位置（处理转义、引号、$( ) 与 ${ } 嵌套）；结构不完整返回 undefined。
 */
function findWordEnd(text, start) {
  let scan = (trackParens) => {
    let idx = start;
    let depth = 0;
    let quoteChar = null;
    for (; idx < text.length; idx++) {
      let char = text[idx];
      if (char === "\\" && (quoteChar === "`" || isEscapeActive(text, idx, quoteChar))) {
        idx++;
        continue;
      }
      if (quoteChar !== null) {
        if (char === quoteChar) quoteChar = null;
        continue;
      }
      if (depth === 0 && (char === '"' || char === "'" || char === "`")) quoteChar = char;
      else if (
        trackParens &&
        (char === "(" ||
          (char === "{" && text[idx - 1] === "$" && text[idx - 2] !== "$" && text[idx - 2] !== "\\"))
      )
        depth++;
      else if (trackParens && (char === ")" || char === "}") && depth > 0) depth--;
      else if (depth === 0 && /[\s;&|]/.test(char)) break;
    }
    return depth === 0 && quoteChar === null ? idx : undefined;
  };
  return scan(true) ?? scan(false) ?? text.length;
}
//@ chunk-5xgkngpb.js:1072855-1073194 placement
/**
 * 跳过语句开头的变量赋值前缀，返回命令开始位置以及该位置是否仍是前缀（遇到分隔符、注释或 &/| 时结束）。
 */
function skipAssignmentPrefix(text, wordEnd) {
  let idx = wordEnd;
  for (;;) {
    while (idx < text.length && (text[idx] === " " || text[idx] === "\t")) idx++;
    if (idx >= text.length || /[;\n)#]/.test(text[idx]))
      return {
        end: idx,
        prefix: false,
      };
    if (text[idx] === "&" || text[idx] === "|")
      return {
        end: idx,
        prefix: text[idx + 1] !== text[idx],
      };
    let match = /^[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]*\])?\+?=/.exec(text.slice(idx, idx + 1024));
    if (match === null)
      return {
        end: idx,
        prefix: true,
      };
    idx = findWordEnd(text, idx + match[0].length);
  }
}
//@ chunk-5xgkngpb.js:1073194-1073295 placement
function isAndChainOnly(command) {
  let parts = command.split("&&");
  return parts[0].trim() === "" && parts.slice(1).every((part) => !/[;|&]/.test(part));
}
//@ chunk-5xgkngpb.js:1073295-1073682 placement
/**
 * 从值中提取命令替换的正文：支持反引号与 $( )（须占满整个值，去掉外层双引号与结尾斜杠）。
 */
function extractSubstitutionBody(word) {
  let replaced = word.replace(/^"([\s\S]*)"$/, "$1").replace(/\/+$/, "");
  let match = /^`([^`]*)`$/.exec(replaced);
  if (match !== null) return match[1];
  if (!replaced.startsWith("$(")) return;
  let depth = 0;
  let quoteChar = null;
  for (let idx = 1; idx < replaced.length; idx++) {
    let char = replaced[idx];
    if (char === "\\" && isEscapeActive(replaced, idx, quoteChar)) idx++;
    else if (quoteChar !== null) quoteChar = char === quoteChar ? null : quoteChar;
    else if (char === '"' || char === "'") quoteChar = char;
    else if (char === "(") depth++;
    else if (char === ")" && --depth === 0)
      return idx === replaced.length - 1 ? replaced.slice(2, idx) : undefined;
  }
  return;
}
//@ chunk-5xgkngpb.js:1073682-1077716 placement
/**
 * 描述命令替换的作用（如 git rev-parse 打印仓库根、pwd 打印当前目录），用于权限提示。
 */
function describeCommandSubstitution(command, mayBeUnset) {
  let cleaned = joinLineContinuations(
    blankHeredocBodies(
      (command.length > MAX_EXPANSION_SCAN ? command.slice(0, MAX_EXPANSION_SCAN) : command).replace(
        /[\uE000-\uF8FF]/g,
        "",
      ),
    ),
  );
  let masked = maskQuotedAndComments(cleaned, true);
  let unmasked = maskQuotedAndComments(cleaned, false);
  let scanUntil = /(?:^|[\s;&|({])trap\s+(?:--\s+)?\$?'[^']*\brm\b/.test(unmasked)
    ? cleaned.length
    : Math.max(...[...unmasked.matchAll(/\brm(?:dir)?\b/gi)].map((match) => match.index), -1);
  let boundVars = new Set();
  let unsetVars = new Set();
  let unknownVars = new Set();
  let rootValuedVars = new Set();
  let derivedVars = new Map();
  let mayBeUnsetHere = (name) =>
    unsetVars.has(name) ||
    unknownVars.has(name) ||
    (!boundVars.has(name) && !isHomeOrCwdVar(name) && mayBeUnset(name));
  let sorted = [
    ...[...masked.matchAll(UNSET_STATEMENT_RE)].map((match) => ({
      index: match.index,
      names: match[1].trim().split(/\s+/),
      bound: false,
      rootish: false,
      until: -1,
    })),
    ...[...masked.matchAll(FOR_LOOP_RE)].map((match) => {
      let bodyStart = match.index + match[0].length;
      let trimmed = cleaned.slice(bodyStart - match[2].length, bodyStart).trim();
      let isBound =
        trimmed !== "" && !/""|''/.test(trimmed) && !/(?:^|\s)"[^"]*[$`][^"]*"(?=\s|$)/.test(trimmed);
      let doneMatch = /[$`]/.test(trimmed) ? /\bdone\b/.exec(masked.slice(bodyStart)) : null;
      return {
        index: match.index,
        names: [match[1]],
        bound: isBound ? true : null,
        rootish: isBound && !/\s/.test(trimmed) && isRootLikeValue(trimmed),
        until: doneMatch === null ? -1 : bodyStart + doneMatch.index,
      };
    }),
  ]
    .flatMap((event) =>
      event.until >= 0
        ? [
            event,
            {
              ...event,
              index: event.until,
              bound: null,
              rootish: false,
            },
          ]
        : [event],
    )
    .filter((event) => event.index < scanUntil)
    .sort((a, b) => a.index - b.index);
  let applyEventsBefore = (limit) => {
    while (sorted.length > 0 && sorted[0].index < limit) {
      let { names, bound, rootish } = sorted.shift();
      for (let name of names) {
        boundVars.delete(name);
        unsetVars.delete(name);
        unknownVars.delete(name);
        rootValuedVars.delete(name);
        derivedVars.delete(name);
        if (bound === true) {
          boundVars.add(name);
          if (rootish) rootValuedVars.add(name);
        } else if (bound === false) unsetVars.add(name);
      }
    }
  };
  let coveredUpTo = 0;
  let pendingPrefix = null;
  let statementStart = 0;
  let isAfterPipe = false;
  let stateStart = 0;
  let scanPos = 0;
  ASSIGNMENT_NAME_RE.lastIndex = 0;
  for (
    let match = ASSIGNMENT_NAME_RE.exec(masked);
    match !== null && match.index < scanUntil;
    match = ASSIGNMENT_NAME_RE.exec(masked)
  ) {
    let varName = match[1];
    let valueStart = match.index + match[0].length;
    let wordEnd = findWordEnd(cleaned, valueStart);
    ASSIGNMENT_NAME_RE.lastIndex = wordEnd;
    let assignStart = valueStart - varName.length - 1;
    for (; scanPos < assignStart; scanPos++) {
      let char = masked[scanPos];
      if (
        char ===
          `
` &&
        isAfterPipe &&
        masked.slice(statementStart, scanPos).trim() === ""
      ) {
        stateStart = scanPos + 1;
        continue;
      }
      if (/[;&|(\n]/.test(char)) {
        statementStart = scanPos + 1;
        isAfterPipe = char === "|" && masked[scanPos - 1] === "|";
      }
    }
    let max = Math.max(coveredUpTo, statementStart, stateStart);
    let reusedPrefix = pendingPrefix !== null && assignStart < pendingPrefix.end ? pendingPrefix : null;
    let isConditional =
      reusedPrefix !== null ? reusedPrefix.conditional : statementStart >= coveredUpTo && isAfterPipe;
    if (
      !/^[\s)]*(?:(?:do|then|else|elif|if|while|until|time|!|\{)\s+)*(?:(?:export|local|declare|typeset|readonly)(?:\s+-\w+)*\s+)?$/.test(
        cleaned.slice(max, assignStart),
      )
    )
      continue;
    coveredUpTo = wordEnd;
    let prefix = reusedPrefix ?? {
      ...skipAssignmentPrefix(masked, wordEnd),
      conditional: isConditional,
    };
    pendingPrefix = prefix;
    if (prefix.prefix) continue;
    applyEventsBefore(assignStart);
    let sliced = cleaned.slice(valueStart, wordEnd);
    let substitutionBody = extractSubstitutionBody(sliced);
    let becomes;
    if (substitutionBody !== undefined) {
      let match = PATH_COMMAND_SUBST_RE.exec(substitutionBody);
      if (match?.[2] === "rev-parse") becomes = "prints a git value such as the repository root";
      else if (match?.[1] === "pwd") becomes = "prints the current directory";
      else if (match?.[1] === "dirname" || match?.[1] === "cd") {
        let match_2 = /^\s*(?:cd|dirname)\s+(?:--?\w*\s+)*([^\s;&|]*)/.exec(substitutionBody);
        let targetArg = match_2?.[1];
        let parentOf = (path) => path.replace(/\/+[^/]*\/*$/, "") || (path.startsWith("/") ? "/" : ".");
        if (!(
          match_2 !== null &&
          targetArg !== undefined &&
          targetArg !== "" &&
          !/[$`]/.test(targetArg) &&
          !/^(?:""|'')$/.test(targetArg) &&
          (match[1] === "dirname"
            ? !isDangerousRemovalTarget(
                expandTildeWithHome(parentOf(targetArg.replace(/^(["'])(.*)\1$/, "$2"))),
              )
            : isAndChainOnly(substitutionBody.slice(match_2[0].length)))
        ))
          becomes =
            match[1] === "dirname"
              ? targetArg !== undefined && targetArg !== "" && !/[$`]/.test(targetArg)
                ? `prints ${parentOf(targetArg.replace(/^(["'])(.*)\1$/, "$2"))}`
                : "prints the current directory (as `.`) when its input is empty"
              : 'prints the current directory when its input is empty (`cd ""` stays put)';
      }
    } else if (!/[$`]/.test(sliced) || /^"?\$\{?[A-Za-z_]/.test(sliced)) {
      let rootChild = matchRootChildTarget(sliced, mayBeUnsetHere);
      if (rootChild !== undefined) becomes = `is /${rootChild} when the variable in it is empty`;
      else if (VAR_SLASH_TARGET_RE.test(sliced))
        becomes = "is the filesystem root when the variable in it is empty";
    }
    let wholeVarName = /^"?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?\/*$/.exec(sliced)?.[1];
    let inheritedState =
      wholeVarName === "PWD"
        ? {
            value: sliced,
            becomes: "is the current directory",
          }
        : wholeVarName === undefined
          ? undefined
          : derivedVars.get(wholeVarName);
    if (becomes !== undefined)
      derivedVars.set(varName, {
        value: sliced,
        becomes,
      });
    else if (inheritedState !== undefined) derivedVars.set(varName, inheritedState);
    else if (!isConditional) derivedVars.delete(varName);
    let leadingVarName = /^"?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?(?:\/[^\s"'$`]*)?"?$/.exec(sliced)?.[1];
    let matches = /(?:^|\/)\.\.(?:\/|$)/.test(sliced.replace(/["']/g, ""));
    let matches_2 = /^(?:""|''|\(\s*\))?$/.test(sliced);
    let trailingSegment = /\/([^\s/$`"')}]+)"?$/.exec(sliced)?.[1];
    let defaultValue = /^"?\$\{[A-Za-z_][A-Za-z0-9_]*:?-([^\s}$`]+)\}"?$/.exec(sliced)?.[1];
    let isBenignDefault =
      defaultValue === undefined ||
      /^(?:|\/+|(?:[^/]*\/)*\.\.?\/*)$/.test(defaultValue.replace(/^(["'])([\s\S]*)\1$/, "$2"));
    let isRootishValue =
      (!matches && trailingSegment !== undefined && !/^[.?*[\]{}]+$/.test(trailingSegment)) ||
      !isBenignDefault ||
      (leadingVarName !== undefined && !matches
        ? !mayBeUnsetHere(leadingVarName)
        : !matches_2 && !/[$`]/.test(sliced));
    let wasBound = boundVars.has(varName);
    let wasRootValued = rootValuedVars.has(varName);
    boundVars.delete(varName);
    unsetVars.delete(varName);
    unknownVars.delete(varName);
    rootValuedVars.delete(varName);
    if (isRootishValue && isConditional) {
      if (wasBound) {
        boundVars.add(varName);
        if (wasRootValued || isRootLikeValue(sliced)) rootValuedVars.add(varName);
      } else unknownVars.add(varName);
    } else if (isRootishValue) {
      boundVars.add(varName);
      if (isRootLikeValue(sliced) || (leadingVarName !== undefined && rootValuedVars.has(leadingVarName)))
        rootValuedVars.add(varName);
    } else if (matches_2) unsetVars.add(varName);
    else unknownVars.add(varName);
  }
  applyEventsBefore(Number.POSITIVE_INFINITY);
  return {
    set: boundVars,
    emptied: new Set([...unsetVars, ...unknownVars]),
    rootValued: rootValuedVars,
    derived: derivedVars,
  };
}
//@ chunk-5xgkngpb.js:1077716-1077870 placement
/**
 * 去掉路径末尾的 /* 或 /. 之类通配后缀（保留引号）。
 */
function stripTrailingPathGlob(text) {
  let endIndex = text.length;
  while (endIndex > 0 && /[\uE020"']/.test(text[endIndex - 1])) endIndex--;
  let globStartIndex = endIndex;
  while (globStartIndex > 0 && /[/*.]/.test(text[globStartIndex - 1])) globStartIndex--;
  return globStartIndex < endIndex && text[globStartIndex] === "/" ? text.slice(0, globStartIndex) : text;
}
//@ chunk-5xgkngpb.js:1077870-1078036 placement
/**
 * 若单词只是一个变量引用（$NAME 或 ${NAME:?..}），返回变量名。
 */
function getBareVariableName(text) {
  let match =
    /^[\uE020"']*\$(?:\{([A-Za-z_][A-Za-z0-9_]*)(?::?[?-][^}]*)?\}|([A-Za-z_][A-Za-z0-9_]*))[\uE020"']*$/.exec(
      text,
    );
  return match === null ? undefined : (match[1] ?? match[2]);
}
//@ chunk-5xgkngpb.js:1078036-1078855 placement
/**
 * 内联 shell 分析常量：引号占位字符、函数定义/set -- 正则、"sh -c" 调用正则、最大递归深度、截断长度、前导关键字与包装命令集合、find 谓词正则。
 */
var QUOTE_MARKER; // deferred: uses POSIX_SHELL_NAMES (../../utils/bash/ast.js) of its import cycle while loading; runs once the cycle is complete
var FUNCTION_DEFINITION_RE;
var SET_POSITIONAL_RE;
var SHELL_C_INVOCATION_RE;
var MAX_INLINE_DEPTH;
var MAX_INVOCATION_DISPLAY;
var LEADING_KEYWORDS;
var COMMAND_WRAPPERS;
var FIND_PREDICATE_RE;
deferInit("chunk-5xgkngpb.js:1078036", () => {
  QUOTE_MARKER = "\uE020";
  FUNCTION_DEFINITION_RE =
    /(?:^|[;&|(\n])[ \t]*(?:function[ \t]+[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*[ \t]*\([ \t]*\))/;
  SET_POSITIONAL_RE = /(?:^|[;&|(\n])[ \t]*set[ \t]+--[ \t]+(?!["']{2}(?:[\s;&|]|$)|["']?\$)[^\s;&|]/;
  SHELL_C_INVOCATION_RE = new RegExp(
    String.raw`(?:^|[\s;&|(])(?:[^\s=]*\/)?(?:busybox\s+)?(?:${[...POSIX_SHELL_NAMES].join("|")})\s+(?:(?:--?|\+)[A-Za-z][A-Za-z0-9_-]*(?:\s+[A-Za-z0-9_][A-Za-z0-9_-]*)?\s+)*-[A-Za-z]*c[A-Za-z]*\s+(?:--\s+)?\$?(["'])`,
    "gi",
  );
  MAX_INLINE_DEPTH = 2;
  MAX_INVOCATION_DISPLAY = 120;
  LEADING_KEYWORDS = new Set(["do", "then", "else", "elif", "if", "while", "until", "!", "{", "coproc"]);
  COMMAND_WRAPPERS = new Set([
    "sudo",
    "doas",
    "exec",
    "command",
    "env",
    "nice",
    "nohup",
    "busybox",
    "time",
    "timeout",
    "stdbuf",
    "setsid",
    "ionice",
    "pkexec",
    "runuser",
    "eval",
    "xargs",
  ]);
  FIND_PREDICATE_RE =
    /^-(?:exec|execdir|ok|okdir|name|iname|path|ipath|regex|prune|type|maxdepth|mindepth|newer|mtime|mmin|size|print0?|delete|o|a|not|and|or)$/;
});
//@ chunk-5xgkngpb.js:1078855-1079004 placement
function getRemovalCommand(word) {
  let lower = word
    .replace(/[<>].*$/, "")
    .replace(/^\\/, "")
    .replace(/^[^\s=]*\//, "")
    .toLowerCase();
  return lower === "rm" ? "rm" : lower === "rmdir" ? "rmdir" : null;
}
//@ chunk-5xgkngpb.js:1079004-1080073 placement
/**
 * 在命令文本中跳过前导关键字、赋值、重定向与包装命令（sudo/env/xargs/eval 等）找到 rm/rmdir 调用，返回 {command, word, tokens, reparsed}。
 */
function findRemovalInvocation(text, allowEvalStrings) {
  let words = text.split(/\s+/).filter((word) => word !== "");
  let index = 0;
  while (index < words.length) {
    let word = words[index];
    if (getRemovalCommand(word) !== null) break;
    if (
      LEADING_KEYWORDS.has(word.toLowerCase()) ||
      /^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(word) ||
      /^[$\uE020]/.test(word)
    )
      index++;
    else if (/^[\d&]*[<>]/.test(word)) {
      index++;
      if (/^(?:[0-9]+|&)?(?:>>?[|&]?|<<?<?|<>)$/.test(word)) index++;
    } else break;
  }
  let normalizeWord = (word) =>
    word
      .replace(/^\\/, "")
      .replace(/^[^\s=]*\//, "")
      .toLowerCase();
  let isReparsed = false;
  let stripEvalQuote = (word) => (allowEvalStrings && isReparsed ? word.replace(/^\$?['"]/, "") : word);
  let isWrapper = (word) => {
    let name = normalizeWord(stripEvalQuote(word));
    return COMMAND_WRAPPERS.has(name) || (allowEvalStrings && name === "trap");
  };
  while (index < words.length && isWrapper(words[index])) {
    let name = normalizeWord(stripEvalQuote(words[index]));
    isReparsed ||= name === "eval" || name === "trap";
    index++;
    while (index < words.length) {
      let word = stripEvalQuote(words[index]);
      if (getRemovalCommand(word) !== null || isWrapper(word)) break;
      if (/^[\d&]*[<>]/.test(word)) {
        index++;
        if (/^(?:[0-9]+|&)?(?:>>?[|&]?|<<?<?|<>)$/.test(word)) index++;
        continue;
      }
      if (word.startsWith("-")) {
        index++;
        let nextWord = words[index] === undefined ? undefined : stripEvalQuote(words[index]);
        if (
          nextWord !== undefined &&
          !nextWord.startsWith("-") &&
          !nextWord.includes("=") &&
          getRemovalCommand(nextWord) === null &&
          !isWrapper(nextWord)
        )
          index++;
        continue;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(word) || /^\d/.test(word) || /^[$\uE020]/.test(word)) {
        index++;
        continue;
      }
      break;
    }
  }
  let command = index < words.length ? getRemovalCommand(stripEvalQuote(words[index])) : null;
  return command === null
    ? null
    : {
        command,
        word: words[index],
        tokens: words.slice(index + 1),
        reparsed: isReparsed,
      };
}
//@ chunk-5xgkngpb.js:1080073-1080689 placement
/**
 * 对含 $ 和 rm 的命令找出以可能为空的变量路径为目标的 rm/rmdir 调用：结合已知赋值/unset/派生值推断变量是否可能为空，先按普通分词再按保守方式检查。
 */
function findDangerousVariableRemovalInText(text, options) {
  if (!text.includes("$") || !/\brm(?:dir)?\b/i.test(text)) return null;
  text = text.replace(/[\uE000-\uF8FF]/g, "");
  let context = DEFAULT_EXPANSION_CONTEXT;
  if (options !== undefined) {
    let {
      set: boundVars,
      emptied,
      rootValued,
      derived,
    } = options.assignments ?? describeCommandSubstitution(options.wholeCommand ?? text, options.mayBeUnset);
    context = {
      mayBeUnset: (name) =>
        emptied.has(name) || (!boundVars.has(name) && !isHomeOrCwdVar(name) && options.mayBeUnset(name)),
      derived,
      assigned: new Set([...boundVars].filter((name) => !rootValued.has(name))),
      evalStrings: true,
      skipAssignedOriginalHits: options.skipAssignedOriginalHits,
    };
  }
  let allowInline =
    !FUNCTION_DEFINITION_RE.test(maskQuotedAndComments(text, true)) &&
    !SET_POSITIONAL_RE.test(maskQuotedAndComments(text, false));
  let segments = splitCommand(text);
  for (let segment of segments) {
    let invokedCommandNames = extractInvokedCommandNames(segment, allowInline, 0, true, false, context);
    if (invokedCommandNames !== null) return invokedCommandNames;
  }
  for (let segment of segments) {
    let invokedCommandNames = extractInvokedCommandNames(segment, false, 0, false, false, context);
    if (invokedCommandNames !== null) return invokedCommandNames;
  }
  return null;
}
//@ chunk-5xgkngpb.js:1080689-1081090 placement
/**
 * 把命令文本中的注释与（可选）引号内容替换为空格，保持长度与换行，便于结构匹配。
 */
function maskQuotedAndComments(text, maskQuoted) {
  let result = "";
  let quoteChar = null;
  let inComment = false;
  for (let idx = 0; idx < text.length; idx++) {
    let char = text[idx];
    if (inComment) {
      if (
        char ===
        `
`
      ) {
        inComment = false;
        result += char;
      } else result += " ";
      continue;
    }
    if (quoteChar === null) {
      if (char === "\\") {
        result += char + (text[idx + 1] ?? "");
        idx++;
        continue;
      }
      if (char === "#" && (idx === 0 || /[\s;&|()]/.test(text[idx - 1]))) {
        inComment = true;
        result += " ";
        continue;
      }
      if (char === '"' || char === "'") quoteChar = char;
      result += char;
      continue;
    }
    if (char === "\\" && isEscapeActive(text, idx, quoteChar)) {
      result += maskQuoted ? "  " : char + (text[idx + 1] ?? "");
      idx++;
      continue;
    }
    if (char === quoteChar) {
      quoteChar = null;
      result += char;
      continue;
    }
    result += maskQuoted ? " " : char;
  }
  return result;
}
//@ chunk-5xgkngpb.js:1081090-1082065 placement (2.1.88 match: findTokenBudgetPositions, 0.537)
/**
 * 把一行 shell 命令规整（去续行、反引号、$() 与子 shell，拆 ; | && 等）后提取每段调用的命令名，并识别 find -exec/-ok 内的命令（最多 8 个）。
 */
function extractInvokedCommandNames(segment, allowInline, depth, isShellText, isReparsed, context) {
  let text = segment.replace(/\\\r?\n/g, " ");
  let normalized = (isShellText ? protectQuotedMetachars(text) : text)
    .replace(/(?<!\\)`[^`]*`/g, QUOTE_MARKER)
    .trimStart();
  while (normalized.startsWith("(") || normalized.startsWith("{"))
    normalized = normalized.slice(1).trimStart();
  for (let previous = ""; previous !== normalized;) {
    previous = normalized;
    normalized = normalized
      .replace(/\$\([^()]*\)/g, QUOTE_MARKER)
      .replace(/(?<![$\\])\([^()]*(?<!\\)\)/g, QUOTE_MARKER);
  }
  normalized = normalized.replace(/(?<![<>&])&(?![<>&])/g, ";");
  for (let statement of normalized.split(/[;|\n\r]|&&/)) {
    let text = statement.replace(/^[\s\uE020]+/, "");
    let removalInvocation = findRemovalInvocation(text, context.evalStrings);
    let invocations = removalInvocation === null ? [] : [removalInvocation];
    for (let match of text.matchAll(/(?:^|\s)-(?:exec|ok)(?:dir)?\s+/g)) {
      if (invocations.length >= 8) break;
      let removalInvocation = findRemovalInvocation(
        text.slice(match.index + match[0].length),
        context.evalStrings,
      );
      if (removalInvocation !== null) {
        let afterDoubleDash = false;
        let index = removalInvocation.tokens.findIndex((token, idx, tokens) => {
          let currentToken = restoreMetacharsAndUnquote(token);
          if (currentToken === "--") afterDoubleDash = true;
          return (
            currentToken === "\\;" ||
            currentToken === ";" ||
            currentToken === "\\" ||
            (currentToken === "+" && restoreMetacharsAndUnquote(tokens[idx - 1] ?? "") === "{}") ||
            (!afterDoubleDash && FIND_PREDICATE_RE.test(currentToken))
          );
        });
        invocations.push(
          index === -1
            ? removalInvocation
            : {
                ...removalInvocation,
                tokens: removalInvocation.tokens.slice(0, index),
              },
        );
      }
    }
    for (let invocation of invocations) {
      let variableTargetInRemoval = findVariableTargetInRemoval(
        invocation,
        allowInline,
        isReparsed,
        !isShellText || isReparsed,
        context,
      );
      if (variableTargetInRemoval !== null) return variableTargetInRemoval;
    }
    if (isShellText && depth < MAX_INLINE_DEPTH) {
      let removalInShellC = findRemovalInShellC(text, depth === 0 || allowInline, depth + 1, context);
      if (removalInShellC !== null) return removalInShellC;
    }
  }
  return null;
}
//@ chunk-5xgkngpb.js:1082065-1082990 placement
/**
 * 检查 rm 调用的各参数：变量顶层路径、可能为空的变量 + 斜杠、派生值等，命中时返回 {command, target, invocation, rootChild, derived} 描述。
 */
function findVariableTargetInRemoval(invocation, allowInline, allowQuotedDollar, isReparsed, context) {
  let { command, tokens } = invocation;
  for (let index = 0; index < tokens.length; index++) {
    let replaced = tokens[index].replace(/[)\]}]+$/, "");
    if (replaced === "" || replaced.startsWith("-") || (!allowQuotedDollar && /^'[^']*\$/.test(replaced)))
      continue;
    if (/^[\d&]*[<>]/.test(replaced)) {
      if (/^(?:[0-9]+|&)?(?:>>?[|&]?|<<?<?|<>)$/.test(replaced)) index++;
      continue;
    }
    let derived = context.derived.get(getBareVariableName(stripTrailingPathGlob(replaced)) ?? "");
    let rootChild = matchRootChildTarget(replaced, context.mayBeUnset);
    let isRootTarget =
      VAR_SLASH_TARGET_RE.test(replaced) || (allowInline && POSITIONAL_VAR_SLASH_TARGET_RE.test(replaced));
    if (
      isRootTarget &&
      context.skipAssignedOriginalHits === true &&
      context.assigned.has(/\$\{?([A-Za-z_][A-Za-z0-9_]*)/.exec(replaced)?.[1] ?? "")
    )
      continue;
    if (isRootTarget || rootChild !== undefined || derived !== undefined) {
      let targetText = formatInvocationForDisplay([stripTrailingParens(tokens[index])]);
      let displayTokens = [invocation.word, ...tokens.slice(0, -1), stripTrailingParens(tokens.at(-1))];
      let invocationText = formatInvocationForDisplay(displayTokens);
      let invocation_2 = invocationText;
      if (invocationText.length > MAX_INVOCATION_DISPLAY) {
        let truncated = truncateToLength(invocationText, MAX_INVOCATION_DISPLAY);
        invocation_2 =
          formatInvocationForDisplay(displayTokens.slice(0, index + 2)).length <= MAX_INVOCATION_DISPLAY
            ? `${truncated}\u2026`
            : `${truncated}\u2026 ${targetText}`;
      }
      return {
        command,
        target: targetText,
        invocation: invocation_2,
        reparsed: isReparsed || invocation.reparsed,
        ...(rootChild !== undefined && {
          rootChild,
        }),
        ...(derived !== undefined && {
          derived: {
            becomes: derived.becomes,
            value: ((value) =>
              value.length > MAX_INVOCATION_DISPLAY
                ? `${truncateToLength(value, MAX_INVOCATION_DISPLAY)}\u2026`
                : value)(derived.value.replace(/[\s\p{Cc}]+/gu, " ")),
          },
        }),
      };
    }
  }
  return null;
}
//@ chunk-5xgkngpb.js:1082990-1083087 placement
/**
 * 把命令调用拼成一行展示：命令替换折叠为 $(…)，其余空白与控制字符压成一个空格。
 */
function formatInvocationForDisplay(tokens) {
  return restoreMetachars(tokens.join(" "))
    .replaceAll(QUOTE_MARKER, "$(\u2026)")
    .replace(/[\s\p{Cc}]+/gu, " ");
}
//@ chunk-5xgkngpb.js:1083087-1083142 placement
/**
 * 去掉词尾未转义的右括号。
 */
function stripTrailingParens(token) {
  return token.replace(/(^|[^\\])\)+$/, "$1");
}
//@ chunk-5xgkngpb.js:1083142-1083258 placement
var SHELL_METACHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var METACHAR_PLACEHOLDER_BASE;
var METACHAR_PLACEHOLDER_RE;
deferInit("chunk-5xgkngpb.js:1083142", () => {
  SHELL_METACHARS = ";|&\n\r()` \t";
  METACHAR_PLACEHOLDER_BASE = 57345;
  METACHAR_PLACEHOLDER_RE = new RegExp(
    `[\\u${METACHAR_PLACEHOLDER_BASE.toString(16)}-\\u${(METACHAR_PLACEHOLDER_BASE + SHELL_METACHARS.length - 1).toString(16)}]`,
    "g",
  );
});
//@ chunk-5xgkngpb.js:1083258-1083727 placement
/**
 * 把引号内及转义后的 shell 元字符替换为占位字符，使后续分词不把它们当作分隔符；引号未闭合时原样返回。
 */
function protectQuotedMetachars(text) {
  if (!text.includes('"') && !text.includes("'") && !/\\[ \t]/.test(text)) return text;
  if (getOpenQuoteAt(text, text.length) !== null) return text;
  let result = "";
  let quoteChar = null;
  for (let idx = 0; idx < text.length; idx++) {
    let char = text[idx];
    if (char === "\\" && isEscapeActive(text, idx, quoteChar)) {
      let nextChar = text[idx + 1] ?? "";
      let metacharIndex = quoteChar === null ? SHELL_METACHARS.indexOf(nextChar) : -1;
      result +=
        char +
        (metacharIndex !== -1 && (nextChar === " " || nextChar === "\t")
          ? String.fromCharCode(METACHAR_PLACEHOLDER_BASE + metacharIndex)
          : nextChar);
      idx++;
      continue;
    }
    if (quoteChar === null) {
      if (char === '"' || char === "'") quoteChar = char;
      result += char;
      continue;
    }
    if (char === quoteChar) {
      quoteChar = null;
      result += char;
      continue;
    }
    let index = SHELL_METACHARS.indexOf(char);
    result += index === -1 ? char : String.fromCharCode(METACHAR_PLACEHOLDER_BASE + index);
  }
  return result;
}
//@ chunk-5xgkngpb.js:1083727-1083794 placement
/**
 * 把占位字符还原成原来的 shell 元字符。
 */
function restoreMetachars(text) {
  return text.replace(
    METACHAR_PLACEHOLDER_RE,
    (placeholder) => SHELL_METACHARS[placeholder.charCodeAt(0) - METACHAR_PLACEHOLDER_BASE],
  );
}
//@ chunk-5xgkngpb.js:1083794-1083844 placement
/**
 * 去掉引号后还原 shell 元字符。
 */
function restoreMetacharsAndUnquote(token) {
  return restoreMetachars(token.replace(/['"]/g, ""));
}
//@ chunk-5xgkngpb.js:1083844-1083861 placement
/**
 * 转义 $ 时使用的私有区占位字符，最后再换回 “$”。
 */
var DOLLAR_PLACEHOLDER = "\uE010";
//@ chunk-5xgkngpb.js:1083861-1085071 placement
/**
 * 在 "sh/bash -c '脚本'" 调用中拼出脚本文本（处理引号、转义与 $ 占位），判断是否会另外接收参数，然后递归查找脚本中的危险 rm。
 */
function findRemovalInShellC(text, allowInline, depth, context) {
  let isTopLevel = getOpenQuoteAt(text, text.length) === null;
  for (let match of text.matchAll(SHELL_C_INVOCATION_RE)) {
    if (isTopLevel && getOpenQuoteAt(text, match.index) !== null) continue;
    let quoteFlag = match[1];
    let idx = match.index + match[0].length - 1;
    let quoteChar = null;
    let parts = [];
    let current = "";
    for (; idx < text.length; idx++) {
      let char = text[idx];
      if (char === "\\" && isEscapeActive(text, idx, quoteChar)) {
        current += char + (text[idx + 1] ?? "");
        idx++;
        continue;
      }
      if (quoteChar === null) {
        if (/\s/.test(char)) break;
        if (char === '"' || char === "'") {
          if (current !== "") {
            parts.push({
              q: quoteChar,
              text: current,
            });
            current = "";
          }
          quoteChar = char;
          continue;
        }
      } else if (char === quoteChar) {
        parts.push({
          q: quoteChar,
          text: current,
        });
        current = "";
        quoteChar = null;
        continue;
      }
      current += char;
    }
    if (current !== "")
      parts.push({
        q: quoteChar,
        text: current,
      });
    let scriptText = restoreMetachars(
      parts
        .map((part) =>
          part.q === '"'
            ? part.text
                .replace(/\\(["\\$`])/g, (escaped, char) => (char === "$" ? DOLLAR_PLACEHOLDER : char))
                .replace(/\uE010(?=[A-Za-z_]|\{[A-Za-z_])/g, "$")
                .replace(/\\+(?=\$)/g, "")
            : part.q === "'"
              ? `'${part.text}'`
              : part.text,
        )
        .join(""),
    );
    let trimmed = text
      .slice(idx)
      .replace(/\\ /g, "\uE022")
      .replace(/(?:^|\s)[\d&]*(?:>>?[|&]?|<<?<?|<>|&>)(?:\S+|\s+\S+)/g, " ")
      .replace(/\s*(?:\\;|\\|\+)\s*$/, "")
      .trim();
    let hasTrailingCommand =
      (trimmed !== "" && trimmed.split(/\s+/).length >= 2) ||
      /(?:^|\s)xargs(?:\s+(?!-[In]\b)\S+)*\s*$/.test(text.slice(0, match.index));
    let content = scriptText;
    let allowInlineScript;
    if (quoteFlag === '"') {
      if (!hasTrailingCommand) content = content.replaceAll(DOLLAR_PLACEHOLDER, "$");
      allowInlineScript = allowInline || !hasTrailingCommand;
    } else {
      content = content.replace(/^'([\s\S]*)'$/, "$1");
      allowInlineScript = !hasTrailingCommand;
    }
    let invokedCommandNames = extractInvokedCommandNames(
      content,
      allowInlineScript,
      depth,
      true,
      quoteFlag === '"',
      context,
    );
    if (invokedCommandNames !== null)
      return {
        ...invokedCommandNames,
        target: invokedCommandNames.target.replaceAll(DOLLAR_PLACEHOLDER, "\\$"),
        invocation: invokedCommandNames.invocation.replaceAll(DOLLAR_PLACEHOLDER, "\\$"),
      };
  }
  return null;
}
//@ chunk-5xgkngpb.js:1085071-1085187 placement
function isEscapeActive(text, idx, quoteChar) {
  if (quoteChar === "'") return false;
  if (quoteChar === null) return true;
  let nextChar = text[idx + 1];
  return nextChar === '"' || nextChar === "\\" || nextChar === "$" || nextChar === "`";
}
//@ chunk-5xgkngpb.js:1085187-1085352 placement
/**
 * 计算文本中某位置之前未闭合的引号字符（无则 null）。
 */
function getOpenQuoteAt(text, end) {
  let quoteChar = null;
  for (let idx = 0; idx < end; idx++) {
    let char = text[idx];
    if (char === "\\" && isEscapeActive(text, idx, quoteChar)) {
      idx++;
      continue;
    }
    if (quoteChar === null) {
      if (char === '"' || char === "'") quoteChar = char;
    } else if (char === quoteChar) quoteChar = null;
  }
  return quoteChar;
}
export {
  getOpenQuoteAt,
  getBareVariableName,
  stripTrailingPathGlob,
  TRACKED_VAR_TOP_LEVEL_RE,
  isDangerousRemovalTarget,
  matchesPathOrWindowsDrive,
  findDangerousVariableRemovalInText,
  describeCommandSubstitution,
  COMMAND_WRAPPERS,
  LEADING_KEYWORDS,
  MAX_INLINE_DEPTH,
};
