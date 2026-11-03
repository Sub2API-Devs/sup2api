/**
 * tools/BashTool/pathValidation.ts
 *
 * Bash 路径约束：各命令路径提取器 PATH_EXTRACTORS、操作类型、路径校验、rm/rmdir 危险目标检查、输入/输出重定向检查、进程替换拦截、写入目标推断
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/pathValidation.ts
 * pieces: chunk-e6aww6q8.js (56)
 * attribution: fingerprint 12, file-local 3, layout 33, sole-consumer 2, affinity 3, placement 3
 */
import { isAbsolute, resolve as resolve_2, normalize, sep, posix, basename, relative, dirname } from "path";
import { homedir } from "os";
import {
  safeResolvePath,
  getFsImplementation,
  walkPermissionCheckPaths,
  permissionCheckSpellings,
  getPathsForPermissionCheck,
  isPathMatchedForPermission,
  resolveDeepestExistingAncestorSync,
  resolveForPermissionCheck,
  getPathsForPermissionCheck_2,
} from "../../utils/fsOperations.js";
import { uniq, count } from "../../utils/collections.js";
import {
  allWorkingDirectories,
  pathInWorkingPath,
  acceptEditsSuggestionApplies,
  matchingRuleForInput,
  checkEditableInternalPath,
  checkPathSafetyForAutoEdit,
  symlinkRedirect,
  symlinkRedirectSentence,
  hardDeniedAsSpelled,
} from "../../utils/permissions/filesystem.js";
import {
  isDangerousRmEnabled,
  dangerousRemovalAsk,
  EMPTY_EXPANSION_HINT,
  DRIVE_ROOT_PREFIX,
  MOUNTED_VOLUME_PATH_RE,
  MOUNTED_DRIVE_PREFIX,
} from "./dangerousRemoval.js";
import {
  containsAnyPlaceholder,
  redactPlaceholdersForDisplay,
  awkProgramHasExecBridge,
  isFindDangerousAction,
  INPUT_REDIRECT_OPS_2,
} from "../../utils/bash/ast.js";
import {
  TRACKED_VAR_TOP_LEVEL_RE,
  isDangerousRemovalTarget,
  matchesPathOrWindowsDrive,
} from "./expansionAnalysis.js";
import { expandTildeWithHome } from "../../utils/networkPaths.js";
import {
  hasInteriorDotDot,
  validatePath,
  shellPathSegments,
  formatDirectoryList,
  internalPathDenyWords,
  hostPersonOnlyTag,
  internalDenyShellAskReason,
  globBeforeInteriorDotDot,
} from "../../utils/permissions/pathValidation.js";
import { isUncOrDevicePath } from "../../utils/pathClassification.js";
import { env } from "../../utils/env.js";
import {
  outsideReadsRuntimePathAsk,
  OUTSIDE_READS_BLOCKED_DENY_REASON,
  isOutsideReadsBlockedAsk,
  isBypassImmuneCircuitBreaker,
  isClassifierRoutedCircuitBreaker,
} from "../../types/permissions.js";
import { firstGlobCharIndex } from "../../utils/windowsUncPaths.js";
import { FILE_READ_TOOL_NAME } from "../FileReadTool/constants.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { getDirectoryForPath } from "../../utils/path.js";
import { createReadRuleSuggestion } from "../../utils/permissions/PermissionUpdate.js";
import { getCommandArgv, extractOutputRedirections, splitCommand } from "../../utils/bash/commands.js";
import { stripSafeWrappers, skipTimeoutFlags } from "./bashPermissions.js";
import { sedCommandIsAllowedByAllowlist } from "./sedValidation.js";
import { getPlatform } from "../../utils/platform.js";
import { mergeSafetyCheckAlso } from "./bashSecurity.js";
import { containsVulnerableUncPath } from "../../utils/shell/readOnlyCommandValidation.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { NON_CREATING_WRITE_COMMANDS } from "./readOnlyValidation.js";

//@ chunk-e6aww6q8.js:1070212-1074425 fingerprint = checkDangerousRemovalPaths (0.381)
/**
 * rm/rmdir 危险目标检查：可能为空的变量 + 顶层目录名、反斜杠根、cd 后的相对通配、无法静态解析的通配目标、关键系统目录、工作目录及其祖先、挂载盘根（CLAUDE_CODE_DISABLE_MOUNTED_DRIVE_RM_PROMPT 可关）、跨多层的通配；命中返回不可被规则自动允许的 ask。
 */
function checkDangerousRemovalPaths(command, args, cwd, toolPermissionContext, cdBeforeRemoval) {
  let extractor = PATH_EXTRACTORS[command];
  let paths = extractor(args);
  let { resolvedPath } = safeResolvePath(getFsImplementation(), cwd);
  let L = resolvedPath === cwd ? [cwd] : [cwd, resolvedPath];
  let G = uniq(
    [...L, ...(toolPermissionContext ? allWorkingDirectories(toolPermissionContext) : [])].flatMap((we) => {
      let { resolvedPath } = safeResolvePath(getFsImplementation(), we);
      return resolvedPath === we ? [we] : [we, resolvedPath];
    }),
  );
  let q = isDangerousRmEnabled();
  let any = (args.includes("--") ? args.slice(0, args.indexOf("--")) : args).some(
    (we) =>
      /^--r|^-[a-zA-Z]*[rR]/.test(we) ||
      (!we.includes("/") &&
        (we.includes("__CMDSUB__") || containsAnyPlaceholder(we)) &&
        /^(?:-|__(?:CMDSUB(?:_OUTPUT)?|TRACKED_VAR)__)/.test(we)),
  );
  let ke;
  for (let path of paths) {
    if (q) {
      let ze = TRACKED_VAR_TOP_LEVEL_RE.exec(path)?.[1];
      if (ze !== undefined) {
        let cleanPath = redactPlaceholdersForDisplay(path);
        return dangerousRemovalAsk(
          command,
          `Dangerous ${command} operation detected: '${cleanPath}'

The target starts with a shell expansion this check cannot read and ends in a top-level directory name: if the expansion is empty, this removes '/${ze}'. This requires explicit approval and cannot be auto-allowed by permission rules.

Use a literal absolute path instead.`,
          `on possibly-empty variable path: ${cleanPath} (${EMPTY_EXPANSION_HINT}${ze})`,
        );
      }
      if (/^\\+$/.test(path))
        return dangerousRemovalAsk(
          command,
          `Dangerous ${command} operation detected: '${path}'

A backslash-only target is the drive root in Git Bash on Windows. This requires explicit approval and cannot be auto-allowed by permission rules.

Write the directory you mean as a path, for example /c/work/build or C:/work/build.`,
          `${DRIVE_ROOT_PREFIX}${path}`,
        );
    }
    let Ee = expandTildeWithHome(path);
    let Ae = isAbsolute(Ee) ? Ee : resolve_2(cwd, Ee);
    let Ie = Ae;
    for (let ze = ""; ze !== Ie;) {
      ze = Ie;
      let lt = Ie.replace(/([\\/]\*+)+[\\/]*$/, "") || "/";
      if (lt !== Ie) Ie = /[\\/]/.test(lt) ? normalize(lt) : lt;
    }
    let Me = Ie !== Ae;
    if (cdBeforeRemoval && Me && !isAbsolute(Ee) && /[\\/]\*$/.test(Ae))
      return dangerousRemovalAsk(
        command,
        `Dangerous ${command} operation detected: '${Ae}'

This command changes directories before the removal, so the relative glob target cannot be statically resolved. This requires explicit approval and cannot be auto-allowed by permission rules.`,
        `on statically-unresolvable target: ${Ae}`,
      );
    let We = Ie;
    if (!isAbsolute(Ee)) {
      let ze = /[\\/]$/.test(cwd) ? cwd : cwd + sep;
      if (Ie.startsWith(ze)) We = Ie.slice(ze.length);
      else if (Ie === cwd) We = "";
    }
    if (
      Me &&
      (hasInteriorDotDot(Ee) ||
        containsAnyPlaceholder(Ae) ||
        Ee.startsWith("~") ||
        isUncOrDevicePath(Ee) ||
        (!isAbsolute(Ee) && /(^|[\\/])\.\.([\\/]|$)/.test(Ee) && /[\\/]\*$/.test(Ae)) ||
        (command === "rmdir" &&
          /[\\/]\*$/.test(Ae) &&
          args.some((arg) => /^--p/.test(arg) || /^-[a-z]*p/.test(arg))) ||
        (!isAbsolute(Ee) && /\*[\\/]+$/.test(Ee) && /[\\/]\*$/.test(Ae)))
    )
      return dangerousRemovalAsk(
        command,
        `Dangerous ${command} operation detected: '${Ae}'

This command's removal target cannot be statically resolved to a directory. This requires explicit approval and cannot be auto-allowed by permission rules.`,
        `on statically-unresolvable target: ${Ae}`,
      );
    if (!Me || !/[*?[]/.test(We)) {
      let ze = [Ie];
      if (Ie !== Ae) {
        let { resolvedPath } = safeResolvePath(getFsImplementation(), Ie);
        if (resolvedPath !== Ie) ze.push(resolvedPath);
      }
      for (let lt of ze) {
        if (isDangerousRemovalTarget(lt))
          return dangerousRemovalAsk(
            command,
            `Dangerous ${command} operation detected: '${Ae}'

This command would remove a critical system directory. This requires explicit approval and cannot be auto-allowed by permission rules.`,
            `on critical path: ${Ae}`,
          );
        let Je = Me ? G : L;
        if (matchesPathOrWindowsDrive(lt, (nt) => Je.some((pt) => pathInWorkingPath(pt, nt))))
          return dangerousRemovalAsk(
            command,
            `Dangerous ${command} operation detected: '${Ae}'

This command would remove a workspace directory (the working directory, an additional working directory, or one of their parent directories). This requires explicit approval and cannot be auto-allowed by permission rules.`,
            `on working directory or its ancestor: ${Ae}`,
          );
      }
      if (
        ke === undefined &&
        q &&
        !env.CLAUDE_CODE_DISABLE_MOUNTED_DRIVE_RM_PROMPT &&
        command === "rm" &&
        (any || Me) &&
        ze.some((lt) => {
          let replaced = posix.normalize(lt).replace(/(.)\/$/, "$1");
          return lt.startsWith("/") && MOUNTED_VOLUME_PATH_RE.test(replaced);
        })
      ) {
        let replaced = redactPlaceholdersForDisplay(Ae).replaceAll("__CMDSUB__", "$(\u2026)");
        ke = dangerousRemovalAsk(
          command,
          `Dangerous ${command} operation detected: '${replaced}'

This command would remove a mounted drive, the folder that holds mounted drives, or a file or folder at the top level of a drive. This requires explicit approval and cannot be auto-allowed by permission rules.

If you meant something deeper inside, name it by its full path.`,
          `${MOUNTED_DRIVE_PREFIX}${replaced}`,
        );
      }
    }
    if (Me && /[\\/]\*$/.test(Ae)) {
      let ze =
        count(Ae.split(/[\\/]+/), (Je) => Je && Je !== ".") -
        count(Ie.split(/[\\/]+/), (Je) => Je && Je !== ".");
      let lt = count(We.split(/[\\/]+/), (Je) => /[*?[]/.test(Je));
      if (ze + lt > 1)
        return dangerousRemovalAsk(
          command,
          `Dangerous ${command} operation detected: '${Ae}'

This command's glob pattern traverses directories that cannot be statically enumerated. This requires explicit approval and cannot be auto-allowed by permission rules.`,
          `on statically-unresolvable target: ${Ae}`,
        );
    }
  }
  return (
    ke ?? {
      behavior: "passthrough",
      message: `No dangerous removals detected for ${command} command`,
    }
  );
}
//@ chunk-e6aww6q8.js:1090073-1090223 file-local
/**
 * 去掉 argv 中的选项，返回从第一个位置参数（或 -- 之后）开始的参数。
 */
function filterOutFlags(args) {
  let result = [];
  let r = false;
  let s = false;
  for (let arg of args)
    if (r || s) result.push(arg);
    else if (arg === "--") r = true;
    else if (arg === "-" || !arg?.startsWith("-")) {
      result.push(arg);
      s = true;
    }
  return result;
}
//@ chunk-e6aww6q8.js:1090223-1090994 layout
/**
 * 按命令的选项规格（布尔/带值/粘连，长短）生成路径提取器：跳过选项及其值，遇到未知选项后不再跳选项。
 */
function makeFlagAwarePathExtractor(e) {
  let n = (r) => {
    if (r.startsWith("--")) {
      if (r.includes("=")) return "attached";
      if (e.booleanLong.has(r)) return "boolean";
      if (e.attachedLong?.has(r)) return "attached";
      return e.valuedLong.has(r) ? "valued" : "unknown";
    }
    if (/^-\d+$/.test(r)) return "attached";
    for (let idx = 1; idx < r.length; idx++) {
      let h = r[idx];
      if (e.booleanShort.includes(h)) continue;
      if (e.attachedShort?.includes(h)) return "attached";
      if (!e.valuedShort.includes(h)) return "unknown";
      return idx === r.length - 1 ? "valued" : "attached";
    }
    return "boolean";
  };
  return (r) => {
    let s = [];
    let h = false;
    let y = false;
    let S = true;
    for (let idx = 0; idx < r.length; idx++) {
      let L = r[idx];
      if (L === undefined || L === null) continue;
      if (h || y) s.push(L);
      else if (L === "--") h = true;
      else if (L !== "-" && L.startsWith("-")) {
        if (!S) continue;
        let G = n(L);
        if (G === "valued") idx++;
        else if (G === "unknown") S = false;
      } else {
        s.push(L);
        y = true;
      }
    }
    return s;
  };
}
//@ chunk-e6aww6q8.js:1090994-1091064 layout
var DEVICE_PATHS = new Set(["/dev/null", "/dev/stdout", "/dev/stderr", "/dev/tty"]);
//@ chunk-e6aww6q8.js:1091064-1091114 layout
function filterDevicePaths(e) {
  return e.filter((n) => !DEVICE_PATHS.has(n));
}
//@ chunk-e6aww6q8.js:1091114-1091981 fingerprint = parsePatternCommand (0.526)
/**
 * grep 类命令的路径提取：第一个位置参数是模式（有 -e/-f 时不是），-f/--file/--exclude-from 等的值也算路径；无路径时返回默认值。
 */
function parsePatternCommand(args, flagsWithArgs, defaults = []) {
  let paths = [];
  let h = false;
  let y = false;
  let S = false;
  for (let idx = 0; idx < args.length; idx++) {
    let L = args[idx];
    if (L === undefined || L === null) continue;
    if (!y && !S && L === "--") {
      y = true;
      continue;
    }
    if (!y && !S && L !== "-" && L.startsWith("-")) {
      let index = L.indexOf("=");
      let q = index >= 0 ? L.slice(0, index) : L;
      if (["-e", "--regexp", "-f", "--file"].includes(q)) {
        h = true;
        if (q === "-f" || q === "--file") {
          let Z = index >= 0 ? L.slice(index + 1) : args[idx + 1];
          if (Z) paths.push(Z);
        }
      }
      if (/^-[a-zA-Z]*f$/.test(q) && q !== "-f" && index < 0 && args[idx + 1] !== undefined) {
        h = true;
        paths.push(args[idx + 1]);
        idx++;
        continue;
      }
      if (["--exclude-from", "--include-from", "--ignore-file"].includes(q)) {
        let Z = index >= 0 ? L.slice(index + 1) : args[idx + 1];
        if (Z) paths.push(Z);
        if (index < 0) idx++;
        continue;
      }
      if (index < 0) {
        let attachedFlagValue = getAttachedFlagValue(L, ["-f", "--file"]);
        if (attachedFlagValue !== undefined) {
          h = true;
          paths.push(attachedFlagValue);
          continue;
        }
        if (L.length > 2 && L.startsWith("-e")) {
          h = true;
          continue;
        }
      }
      if (flagsWithArgs.has(q) && index < 0) idx++;
      continue;
    }
    if (S && !y) {
      let attachedFlagValue = getAttachedFlagValue(L, ["-f", "--file"]);
      if (attachedFlagValue !== undefined) paths.push(attachedFlagValue);
    }
    S = true;
    if (!h) {
      h = true;
      continue;
    }
    paths.push(L);
  }
  return paths.length > 0 ? paths : defaults;
}
//@ chunk-e6aww6q8.js:1091981-1092205 layout
function getAttachedFlagValue(e, n) {
  if (!e.startsWith("-")) return;
  let index = e.indexOf("=");
  if (index >= 0) {
    if (n.includes(e.slice(0, index))) return e.slice(index + 1);
    return;
  }
  for (let s of n) if (s.length === 2 && s[0] === "-" && e.startsWith(s) && e !== s) return e.slice(2);
  return;
}
//@ chunk-e6aww6q8.js:1092205-1093136 layout
/**
 * grep/egrep/fgrep 路径提取（-r 无路径时为 "."）；uye 是 awk 系的路径提取（-f/-E 的程序文件也算路径）。
 */
var extractGrepPaths = (args) => {
  let patternCommand = parsePatternCommand(
    args,
    new Set([
      "-e",
      "--regexp",
      "-f",
      "--file",
      "--exclude",
      "--include",
      "--exclude-dir",
      "--include-dir",
      "-m",
      "--max-count",
      "-A",
      "--after-context",
      "-B",
      "--before-context",
      "-C",
      "--context",
    ]),
  );
  if (patternCommand.length === 0 && args.some((arg) => ["-r", "-R", "--recursive"].includes(arg)))
    return ["."];
  return patternCommand;
};
var extractAwkPaths = (e) => {
  let n = new Set(["-F", "--field-separator", "-v", "--assign", "-e", "--source"]);
  let r = new Set(["-f", "--file", "-E", "--exec"]);
  let s = [];
  let h = false;
  let y = false;
  let S = false;
  for (let idx = 0; idx < e.length; idx++) {
    let L = e[idx];
    if (L === undefined || L === null) continue;
    if (!h && !S && L === "--") {
      h = true;
      continue;
    }
    if (!h && !S && L !== "-" && L.startsWith("-")) {
      let index = L.indexOf("=");
      let q = index >= 0 ? L.slice(0, index) : L;
      if (n.has(q)) {
        if (q === "-e" || q === "--source") y = true;
        if (index < 0) idx++;
        continue;
      }
      if (r.has(q)) {
        y = true;
        if (index >= 0) s.push(L.slice(index + 1));
        else {
          let Z = e[idx + 1];
          if (Z !== undefined) {
            s.push(Z);
            idx++;
          }
        }
        continue;
      }
      continue;
    }
    if (S && !h) {
      let attachedFlagValue = getAttachedFlagValue(L, ["-f", "--file", "-E", "--exec"]);
      if (attachedFlagValue !== undefined) s.push(attachedFlagValue);
    }
    S = true;
    if (!y) {
      y = true;
      continue;
    }
    s.push(L);
  }
  return s;
};
//@ chunk-e6aww6q8.js:1093136-1093201 layout
function joinPathSegment(e, n) {
  return e === "" ? n : `${e.replace(/\/+$/, "")}/${n}`;
}
//@ chunk-e6aww6q8.js:1093201-1099428 fingerprint = PATH_EXTRACTORS (0.427)
/**
 * 每个路径受限命令的路径提取器表 PATH_EXTRACTORS（cd/ls/find/rm/cp/cat/grep/rg/sed/jq/git…），以及 git 全局带值选项、rg 带值选项表。
 */
var GIT_GLOBAL_FLAGS_WITH_VALUE = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--super-prefix",
  "--config-env",
  "--attr-source",
  "--shallow-file",
]);
var RG_FLAGS_WITH_VALUE = new Set([
  "-e",
  "--regexp",
  "-f",
  "--file",
  "-A",
  "--after-context",
  "-B",
  "--before-context",
  "-C",
  "--context",
  "-m",
  "--max-count",
  "--max-depth",
  "--threads",
]);
var PATH_EXTRACTORS = {
  cd: (e) => {
    let n = filterOutFlags(e);
    if (n.length === 0) return e.at(-1) === "-" ? ["-"] : [homedir()];
    return [n[0]];
  },
  ls: (args) => {
    let paths = filterOutFlags(args);
    return paths.length > 0 ? paths : ["."];
  },
  find: (args) => {
    let paths = [];
    let pathFlags = new Set([
      "-newer",
      "-anewer",
      "-cnewer",
      "-mnewer",
      "-samefile",
      "-path",
      "-wholename",
      "-ilname",
      "-lname",
      "-ipath",
      "-iwholename",
    ]);
    let newerPattern = /^-newer[acmBt][acmtB]$/;
    let foundNonGlobalFlag = false;
    let afterDoubleDash = false;
    for (let i = 0; i < args.length; i++) {
      let arg = args[i];
      if (!arg) continue;
      if (afterDoubleDash) {
        paths.push(arg);
        continue;
      }
      if (arg === "--") {
        afterDoubleDash = true;
        continue;
      }
      if (arg.startsWith("-")) {
        if (["-H", "-L", "-P"].includes(arg)) continue;
        foundNonGlobalFlag = true;
        if (pathFlags.has(arg) || newerPattern.test(arg)) {
          let nextArg = args[i + 1];
          if (nextArg) {
            paths.push(nextArg);
            i++;
          }
        }
        continue;
      }
      if (!foundNonGlobalFlag) paths.push(arg);
    }
    return paths.length > 0 ? paths : ["."];
  },
  mkdir: filterOutFlags,
  touch: filterOutFlags,
  rm: filterOutFlags,
  rmdir: filterOutFlags,
  mv: filterOutFlags,
  cp: filterOutFlags,
  cat: filterOutFlags,
  head: filterOutFlags,
  tail: filterOutFlags,
  sort: filterOutFlags,
  uniq: filterOutFlags,
  wc: filterOutFlags,
  cut: makeFlagAwarePathExtractor({
    booleanShort: "nswz",
    valuedShort: "bcdf",
    booleanLong: new Set(["--complement", "--only-delimited", "--zero-terminated"]),
    valuedLong: new Set(["--bytes", "--characters", "--delimiter", "--fields", "--output-delimiter"]),
  }),
  paste: makeFlagAwarePathExtractor({
    booleanShort: "sz",
    valuedShort: "d",
    booleanLong: new Set(["--serial", "--zero-terminated"]),
    valuedLong: new Set(["--delimiters"]),
  }),
  column: makeFlagAwarePathExtractor({
    booleanShort: "txdemLJhV",
    valuedShort: "cosNOClEHRTWrip",
    booleanLong: new Set([
      "--table",
      "--fillrows",
      "--table-noheadings",
      "--table-header-repeat",
      "--table-maxout",
      "--keep-empty-lines",
      "--json",
    ]),
    valuedLong: new Set([
      "--separator",
      "--output-separator",
      "--output-width",
      "--table-name",
      "--table-order",
      "--table-column",
      "--table-columns",
      "--table-columns-limit",
      "--table-noextreme",
      "--table-hide",
      "--table-right",
      "--table-truncate",
      "--table-wrap",
      "--tree",
      "--tree-id",
      "--tree-parent",
    ]),
  }),
  file: filterOutFlags,
  stat: filterOutFlags,
  diff: filterOutFlags,
  awk: extractAwkPaths,
  gawk: extractAwkPaths,
  mawk: extractAwkPaths,
  nawk: extractAwkPaths,
  strings: filterOutFlags,
  hexdump: filterOutFlags,
  od: filterOutFlags,
  base64: filterOutFlags,
  nl: filterOutFlags,
  sha256sum: filterOutFlags,
  sha1sum: filterOutFlags,
  md5sum: filterOutFlags,
  tee: (e) => filterDevicePaths(filterOutFlags(e)),
  tr: (args) => {
    let hasDelete = args.some(
      (arg) => arg === "-d" || arg === "--delete" || (arg.startsWith("-") && arg.includes("d")),
    );
    return filterOutFlags(args).slice(hasDelete ? 1 : 2);
  },
  grep: extractGrepPaths,
  egrep: extractGrepPaths,
  fgrep: extractGrepPaths,
  tac: makeFlagAwarePathExtractor({
    booleanShort: "br",
    valuedShort: "s",
    booleanLong: new Set(["--before", "--regex"]),
    valuedLong: new Set(["--separator"]),
  }),
  rev: filterOutFlags,
  fold: makeFlagAwarePathExtractor({
    booleanShort: "bs",
    valuedShort: "w",
    booleanLong: new Set(["--bytes", "--spaces"]),
    valuedLong: new Set(["--width"]),
  }),
  expand: makeFlagAwarePathExtractor({
    booleanShort: "i",
    valuedShort: "t",
    booleanLong: new Set(["--initial"]),
    valuedLong: new Set(["--tabs"]),
  }),
  unexpand: makeFlagAwarePathExtractor({
    booleanShort: "af",
    valuedShort: "t",
    booleanLong: new Set(["--all", "--first-only"]),
    valuedLong: new Set(["--tabs"]),
  }),
  fmt: makeFlagAwarePathExtractor({
    booleanShort: "csumn",
    valuedShort: "wgdl",
    booleanLong: new Set(["--crown-margin", "--split-only", "--tagged-paragraph", "--uniform-spacing"]),
    valuedLong: new Set(["--width", "--goal", "--prefix"]),
  }),
  comm: makeFlagAwarePathExtractor({
    booleanShort: "123iz",
    valuedShort: "",
    booleanLong: new Set(["--check-order", "--nocheck-order", "--total", "--zero-terminated"]),
    valuedLong: new Set(["--output-delimiter"]),
  }),
  cmp: makeFlagAwarePathExtractor({
    booleanShort: "blsvxzh",
    valuedShort: "",
    booleanLong: new Set(["--print-bytes", "--verbose", "--quiet", "--silent"]),
    valuedLong: new Set(["--ignore-initial", "--bytes"]),
  }),
  pr: makeFlagAwarePathExtractor({
    booleanShort: "acdFfJmprtTv",
    attachedShort: "einsS",
    valuedShort: "hlwWoND",
    booleanLong: new Set([
      "--across",
      "--show-control-chars",
      "--double-space",
      "--form-feed",
      "--join-lines",
      "--merge",
      "--no-file-warnings",
      "--omit-header",
      "--omit-pagination",
      "--show-nonprinting",
    ]),
    attachedLong: new Set([
      "--expand-tabs",
      "--output-tabs",
      "--number-lines",
      "--separator",
      "--sep-string",
    ]),
    valuedLong: new Set([
      "--header",
      "--length",
      "--width",
      "--page-width",
      "--indent",
      "--first-line-number",
      "--date-format",
      "--columns",
    ]),
  }),
  numfmt: makeFlagAwarePathExtractor({
    booleanShort: "z",
    valuedShort: "d",
    booleanLong: new Set(["--grouping", "--zero-terminated", "--debug"]),
    attachedLong: new Set(["--header"]),
    valuedLong: new Set([
      "--from",
      "--to",
      "--from-unit",
      "--to-unit",
      "--format",
      "--padding",
      "--delimiter",
      "--field",
      "--round",
      "--suffix",
      "--invalid",
    ]),
  }),
  tsort: filterOutFlags,
  man: (e) => {
    let any = e.some((r) => r === "--local-file" || (/^-[^-]/.test(r) && r.includes("l")));
    return e.flatMap((r, s) => {
      if (s > 0 && (e[s - 1] === "-C" || e[s - 1] === "--config-file")) return [r];
      let h = r.search(/[\\/~]/);
      return (
        !r.startsWith("-")
          ? [r]
          : uniq([
              ...(r.includes("=") ? [r.slice(r.indexOf("=") + 1)] : []),
              ...(r.length > 2 && !r.startsWith("--") ? [r.slice(2)] : []),
              ...(h > 0 ? [r.slice(h)] : []),
            ])
      ).filter((S) => S !== "" && (any || /[\\/]/.test(S) || S.startsWith("~") || S.startsWith(".")));
    });
  },
  rg: (args) =>
    parsePatternCommand(
      args,
      new Set([
        "-e",
        "--regexp",
        "-f",
        "--file",
        "-t",
        "--type",
        "-T",
        "--type-not",
        "-g",
        "--glob",
        "-m",
        "--max-count",
        "--max-depth",
        "-r",
        "--replace",
        "-A",
        "--after-context",
        "-B",
        "--before-context",
        "-C",
        "--context",
      ]),
      ["."],
    ),
  sed: (args) => {
    let paths = [];
    let skipNext = false;
    let scriptFound = false;
    let h = false;
    let y = false;
    for (let i = 0; i < args.length; i++) {
      if (skipNext) {
        skipNext = false;
        continue;
      }
      let arg = args[i];
      if (!arg) continue;
      if (!h && !y && arg === "--") {
        h = true;
        continue;
      }
      if (!h && !y && arg !== "-" && arg.startsWith("-")) {
        if (["-f", "--file"].includes(arg)) {
          let scriptFile = args[i + 1];
          if (scriptFile) {
            paths.push(scriptFile);
            skipNext = true;
          }
          scriptFound = true;
        } else if (["-e", "--expression"].includes(arg)) {
          skipNext = true;
          scriptFound = true;
        } else if (arg.includes("e") || arg.includes("f")) scriptFound = true;
        continue;
      }
      y = true;
      if (!scriptFound) {
        scriptFound = true;
        continue;
      }
      paths.push(arg);
    }
    return paths;
  },
  jq: (args) => {
    let n = [];
    let flagsWithArgs = new Set([
      "-e",
      "--expression",
      "--arg",
      "--argjson",
      "--args",
      "--jsonargs",
      "-L",
      "--library-path",
      "--indent",
      "--tab",
    ]);
    let filterFound = false;
    let afterDoubleDash = false;
    for (let idx = 0; idx < args.length; idx++) {
      let arg = args[idx];
      if (arg === undefined || arg === null) continue;
      if (!afterDoubleDash && arg === "--") {
        afterDoubleDash = true;
        continue;
      }
      if (!afterDoubleDash && arg.startsWith("-")) {
        let index = arg.indexOf("=");
        let L = index >= 0 ? arg.slice(0, index) : arg;
        if (["-e", "--expression"].includes(L)) filterFound = true;
        if (["-f", "--from-file"].includes(L)) {
          filterFound = true;
          if (index >= 0) n.push(arg.slice(index + 1));
          else {
            let G = args[idx + 1];
            if (G !== undefined) {
              n.push(G);
              idx++;
            }
          }
          continue;
        }
        if (["--slurpfile", "--rawfile"].includes(L)) {
          let G = args[idx + 2];
          if (G !== undefined) n.push(G);
          idx += 2;
          continue;
        }
        if (flagsWithArgs.has(L) && index < 0) idx++;
        continue;
      }
      if (!filterFound) {
        filterFound = true;
        continue;
      }
      n.push(arg);
    }
    return n;
  },
  git: (e) => {
    let n = "";
    let r = (G) => {
      n = isAbsolute(expandTildeWithHome(G)) || G.startsWith("~") ? G : joinPathSegment(n, G);
    };
    let { index, options } = parseLeadingGitOptions(e);
    for (let { opt, value: q } of options)
      if (opt.startsWith("--work-tree=")) r(opt.slice(12));
      else if (q !== undefined && (opt === "-C" || opt === "--work-tree")) r(q);
    let y = (G) =>
      n === "" || isAbsolute(expandTildeWithHome(G)) || G.startsWith("~") ? G : joinPathSegment(n, G);
    let sliced = e.slice(index + 1);
    if (e[index] === "grep") {
      let patternCommand = parsePatternCommand(sliced, RG_FLAGS_WITH_VALUE);
      return patternCommand.length > 0 ? patternCommand.map(y) : [n === "" ? "." : n];
    }
    if (e[index] !== "diff") return [];
    let w = [];
    let L = false;
    for (let G of sliced)
      if (!L && G === "--") L = true;
      else if (L || G === "-" || !G.startsWith("-")) {
        let q = y(G);
        if (!isSpecialDevicePath(q)) w.push(q);
      }
    return w;
  },
};
//@ chunk-e6aww6q8.js:1099428-1102123 fingerprint = ACTION_VERBS (0.822)
/**
 * 路径受限命令列表、每个命令的动作描述（用于提示文字）和操作类型（read/write/create），以及 mv/cp/cd 的参数安全检查。
 */
var SUPPORTED_PATH_COMMANDS = Object.keys(PATH_EXTRACTORS);
var ACTION_VERBS = {
  cd: "change directories to",
  ls: "list files in",
  find: "search files in",
  mkdir: "create directories in",
  touch: "create or modify files in",
  rm: "remove files from",
  rmdir: "remove directories from",
  mv: "move files to/from",
  cp: "copy files to/from",
  cat: "concatenate files from",
  head: "read the beginning of files from",
  tail: "read the end of files from",
  sort: "sort contents of files from",
  uniq: "filter duplicate lines from files in",
  wc: "count lines/words/bytes in files from",
  cut: "extract columns from files in",
  paste: "merge files from",
  column: "format files from",
  tr: "transform text from files in",
  file: "examine file types in",
  stat: "read file stats from",
  diff: "compare files from",
  awk: "process text from files in",
  gawk: "process text from files in",
  mawk: "process text from files in",
  nawk: "process text from files in",
  strings: "extract strings from files in",
  hexdump: "display hex dump of files from",
  od: "display octal dump of files from",
  base64: "encode/decode files from",
  nl: "number lines in files from",
  tac: "read files (reversed) from",
  man: "read manual page files from",
  rev: "read files (reversed lines) from",
  fold: "wrap lines of files from",
  expand: "convert tabs in files from",
  unexpand: "convert spaces in files from",
  fmt: "reformat files from",
  comm: "compare files from",
  cmp: "compare files from",
  pr: "paginate files from",
  numfmt: "reformat numbers in files from",
  tsort: "sort files from",
  grep: "search for patterns in files from",
  egrep: "search for patterns in files from",
  fgrep: "search for patterns in files from",
  rg: "search for patterns in files from",
  sed: "edit files in",
  git: "access files with git from",
  jq: "process JSON from files in",
  sha256sum: "compute SHA-256 checksums for files in",
  sha1sum: "compute SHA-1 checksums for files in",
  md5sum: "compute MD5 checksums for files in",
  tee: "write to files in",
};
var COMMAND_OPERATION_TYPE = {
  cd: "read",
  ls: "read",
  find: "read",
  mkdir: "create",
  touch: "create",
  rm: "write",
  rmdir: "write",
  mv: "write",
  cp: "write",
  cat: "read",
  head: "read",
  tail: "read",
  sort: "read",
  uniq: "read",
  wc: "read",
  cut: "read",
  paste: "read",
  column: "read",
  tr: "read",
  file: "read",
  stat: "read",
  diff: "read",
  awk: "read",
  gawk: "read",
  mawk: "read",
  nawk: "read",
  strings: "read",
  hexdump: "read",
  od: "read",
  base64: "read",
  nl: "read",
  tac: "read",
  man: "read",
  rev: "read",
  fold: "read",
  expand: "read",
  unexpand: "read",
  fmt: "read",
  comm: "read",
  cmp: "read",
  pr: "read",
  numfmt: "read",
  tsort: "read",
  grep: "read",
  egrep: "read",
  fgrep: "read",
  rg: "read",
  sed: "write",
  git: "read",
  jq: "read",
  sha256sum: "read",
  sha1sum: "read",
  md5sum: "read",
  tee: "write",
};
var COMMAND_ARGS_SAFE_CHECKS = {
  mv: (e) => !e.some((n) => n?.startsWith("-")),
  cp: (e) => !e.some((n) => n?.startsWith("-")),
  cd: (args) => {
    let n = false;
    let r = 0;
    for (let arg of args) {
      if (!n) {
        if (arg === "--") {
          n = true;
          continue;
        }
        if (arg.startsWith("-") && arg !== "-") continue;
        n = true;
      }
      r++;
    }
    return r <= 1;
  },
};
//@ chunk-e6aww6q8.js:1102123-1103108 layout
/**
 * pushd 或 env -C/--chdir 的目标目录读权限检查：命中拒绝规则→deny；读封锁（blockReadsOutsideWorkingDirectories）下工作目录外→ask；其余通过。
 */
function checkPushdEnvChdirPath(e, cwd, toolPermissionContext) {
  let s = e[0];
  if (s === undefined) return;
  let sliced = s.slice(s.lastIndexOf("/") + 1);
  let y;
  if (sliced === "pushd") {
    y = filterOutFlags(e.slice(1))[0];
    if (y === undefined) return;
  } else if (sliced === "env") {
    for (let idx = 1; idx < e.length; idx++) {
      let L = e[idx];
      if (L === "-C" || L === "--chdir") {
        y = e[idx + 1];
        break;
      }
      if (L.startsWith("--chdir=")) {
        y = L.slice(8);
        break;
      }
      if (L.startsWith("-C") && L.length > 2) {
        y = L.slice(2);
        break;
      }
    }
    if (y === undefined) return;
  } else return;
  if (containsAnyPlaceholder(y)) return outsideReadsRuntimePathAsk(sliced);
  let S = validatePath(y, cwd, toolPermissionContext, "read");
  if (S.allowed) return;
  if (S.decisionReason?.type === "rule")
    return {
      behavior: "deny",
      message: `${sliced} in '${S.resolvedPath}' was blocked by a deny rule`,
      decisionReason: S.decisionReason,
    };
  if (
    S.decisionReason?.type === "safetyCheck" &&
    S.decisionReason.reason === OUTSIDE_READS_BLOCKED_DENY_REASON
  )
    return {
      behavior: "ask",
      message: `${sliced} moves later reads to a directory outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`,
      decisionReason: S.decisionReason,
    };
  return outsideReadsRuntimePathAsk(sliced);
}
//@ chunk-e6aww6q8.js:1103108-1103912 layout
/**
 * ln/link 源路径的读权限检查，规则同 pushd/env：拒绝规则→deny，读封锁下工作目录外→ask。
 */
function checkLinkSourcePaths(e, cwd, toolPermissionContext) {
  let s = stripWrappersFromArgvForPaths([...e]);
  let h = s[0];
  let sliced = h?.slice(h.lastIndexOf("/") + 1);
  if (sliced !== "ln" && sliced !== "link") return;
  let sliced_2 = s.slice(1);
  let w = filterOutFlags(sliced_2);
  let G = w.length !== sliced_2.length || w.length === 1 ? w : w.slice(0, -1);
  if (G.some((q) => containsAnyPlaceholder(q))) return outsideReadsRuntimePathAsk(sliced);
  for (let q of G) {
    let Z = validatePath(q, cwd, toolPermissionContext, "read");
    if (Z.allowed) continue;
    if (Z.decisionReason?.type === "rule")
      return {
        behavior: "deny",
        message: `${sliced} in '${Z.resolvedPath}' was blocked by a deny rule`,
        decisionReason: Z.decisionReason,
      };
    if (
      Z.decisionReason?.type === "safetyCheck" &&
      Z.decisionReason.reason === OUTSIDE_READS_BLOCKED_DENY_REASON
    )
      return {
        behavior: "ask",
        message: `${sliced} names a path outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`,
        decisionReason: Z.decisionReason,
      };
    return outsideReadsRuntimePathAsk(sliced);
  }
  return;
}
//@ chunk-e6aww6q8.js:1103912-1104143 layout
function findBracketExpressionEnd(pattern) {
  let n = pattern[1] === "!" || pattern[1] === "^" ? 2 : 1;
  if (pattern[n] === "]") n++;
  for (; n < pattern.length; n++) {
    let r = pattern[n];
    if (r === "]") return n;
    if (r === "[" && /^[:=.]/.test(pattern.slice(n + 1))) {
      let s = pattern[n + 1];
      let index = pattern.indexOf(s + "]", n + 2);
      if (index !== -1) n = index + 1;
    }
  }
  return pattern.length - 1;
}
//@ chunk-e6aww6q8.js:1104143-1104811 layout = urlPatternToRegex (1)
function urlPatternToRegex(pattern) {
  if (firstGlobCharIndex(pattern) === -1) return false;
  if (pattern.startsWith("[")) {
    let sliced = pattern.slice(findBracketExpressionEnd(pattern) + 1);
    if (firstGlobCharIndex(sliced) === -1 && sliced !== ".") return false;
  }
  if (/\[[:=.]/.test(pattern)) return true;
  if (pattern.startsWith("*") || pattern.startsWith("?")) return false;
  let n = "^";
  for (let idx = 0; idx < pattern.length; idx++) {
    let s = pattern[idx];
    if (s === "*") n += ".*";
    else if (s === "?") n += ".";
    else if (s === "[") {
      let h = pattern[idx + 1] === "!" || pattern[idx + 1] === "^";
      let index = pattern.indexOf("]", idx + (h ? 3 : 2));
      if (index === -1) {
        n += "\\[";
        continue;
      }
      if (idx > 0 && (h || pattern.indexOf("]", index + 1) !== -1)) {
        n += ".*";
        break;
      }
      let sliced = pattern.slice(idx + 1, index);
      if (sliced.startsWith("!") || sliced.startsWith("^")) sliced = "^" + sliced.slice(1);
      n += "[" + sliced.replace(/[\\\]]/g, "\\$&") + "]";
      idx = index;
    } else n += s.replace(/[.+^$()|{}\\]/g, "\\$&");
  }
  n += "$";
  try {
    return new RegExp(n).test("..");
  } catch {
    return true;
  }
}
//@ chunk-e6aww6q8.js:1104811-1105100 layout
/**
 * 只检查拒绝规则的路径校验：写路径按操作类型、额外读路径按 read，命中拒绝规则即返回 deny。
 */
function checkDenyRulesForPaths(e, n, r, s, h, y = []) {
  for (let [S, w] of [
    [n, h],
    [y, "read"],
  ])
    for (let L of S) {
      if (containsAnyPlaceholder(L)) continue;
      let G = validatePath(L, r, s, w);
      if (!G.allowed && G.decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message: `${e} in '${G.resolvedPath}' was blocked by a deny rule`,
          decisionReason: G.decisionReason,
        };
    }
  return;
}
//@ chunk-e6aww6q8.js:1105100-1105146 layout
var AWK_COMMANDS = new Set(["awk", "gawk", "mawk", "nawk"]);
//@ chunk-e6aww6q8.js:1105146-1105200 layout
function isBashToolRule(e) {
  return e === FILE_READ_TOOL_NAME || e.startsWith(`${FILE_READ_TOOL_NAME}(`);
}
//@ chunk-e6aww6q8.js:1105200-1105285 layout
/**
 * 任一来源存在 Bash(...) 拒绝规则。
 */
function hasBashDenyRule(e) {
  return Object.values(e.alwaysDenyRules).some((alwaysDenyRule) =>
    (alwaysDenyRule ?? []).some(isBashToolRule),
  );
}
//@ chunk-e6aww6q8.js:1105285-1105399 layout
/**
 * 除 hostCredential 外，没有任何 Bash(...) 拒绝规则。
 */
function hasNoBashDenyRules(e) {
  return Object.entries(e.alwaysDenyRules).every(
    ([key, value]) => key === "hostCredential" || !(value ?? []).some(isBashToolRule),
  );
}
//@ chunk-e6aww6q8.js:1105399-1105518 layout
function getSourceArgsOfWriteCommand(e, n) {
  switch (e) {
    case "cp":
    case "mv":
      return n.length >= 2 ? n.slice(0, -1) : [];
    case "sed":
      return n;
    default:
      return [];
  }
}
//@ chunk-e6aww6q8.js:1105518-1105644 layout
var GIT_PATH_ENV_RE =
  /^(HOME|XDG_CONFIG_HOME|PROGRAMDATA|GIT_DIR|GIT_COMMON_DIR|GIT_CEILING_DIRECTORIES|GIT_EXEC_PATH|PATH)$|^GIT_CONFIG/i;
//@ chunk-e6aww6q8.js:1105644-1105832 layout
/**
 * 解析 git 子命令前的全局选项（-C、--git-dir 等带值选项），返回子命令下标与选项列表。
 */
function parseLeadingGitOptions(e) {
  let n = [];
  let r = 0;
  while (r < e.length && e[r].startsWith("-")) {
    let s = e[r];
    r++;
    if (GIT_GLOBAL_FLAGS_WITH_VALUE.has(s) && r < e.length) {
      n.push({
        opt: s,
        value: e[r],
      });
      r++;
    } else
      n.push({
        opt: s,
      });
  }
  return {
    index: r,
    options: n,
  };
}
//@ chunk-e6aww6q8.js:1105832-1106720 layout
/**
 * 找出需要额外做读检查的 glob 参数：无危险选项、无改变路径解析环境变量的普通 git 调用直接返回 []；否则返回未加引号、含通配且未在路径列表中的参数。
 */
function getGlobArgsNeedingCheck(e, n, r, s) {
  if (
    e === "git" &&
    n !== undefined &&
    !n.argv.slice(0, n.argv.length - r.length - 1).some((arg) => /(^|[\\/])env$/.test(arg)) &&
    !n.envVars.some((envVar) => GIT_PATH_ENV_RE.test(envVar.name))
  ) {
    let { index, options } = parseLeadingGitOptions(r);
    let G = r[index];
    let argvUnquotedGlob = n.argvUnquotedGlob;
    let Z = n.argv.length - r.length;
    let Se =
      argvUnquotedGlob === undefined ||
      argvUnquotedGlob.length !== n.argv.length ||
      Z < 1 ||
      argvUnquotedGlob.slice(0, Z + index + 1).some(Boolean);
    if (
      !options.some(({ opt, value: Ee }) => {
        if (
          opt === "--bare" ||
          opt.startsWith("--config-env") ||
          opt.startsWith("--exec-path") ||
          opt.startsWith("--git-dir")
        )
          return true;
        let Ae = Ee?.trim() ?? "";
        return containsAnyPlaceholder(Ae) || /^(alias|include|includeif|help\.autocorrect)\b/i.test(Ae);
      }) &&
      !Se &&
      G !== undefined &&
      !containsAnyPlaceholder(G) &&
      G !== "grep" &&
      G !== "diff"
    )
      return [];
  }
  let newGlobArgs = getNewGlobArgs(r, s);
  if (newGlobArgs.length === 0) return [];
  if (n === undefined || n.carveOutMayDesyncQuoteScan === true) return newGlobArgs;
  let argvUnquotedGlob = n.argvUnquotedGlob;
  let S = n.argv.length - r.length;
  if (argvUnquotedGlob === undefined || argvUnquotedGlob.length !== n.argv.length || S < 1)
    return newGlobArgs;
  return newGlobArgs.filter((newGlobArg) =>
    r.some((L, G) => L === newGlobArg && argvUnquotedGlob[S + G] === true),
  );
}
//@ chunk-e6aww6q8.js:1106720-1106828 layout
function getNewGlobArgs(e, n) {
  let r = new Set(n);
  let s = [];
  for (let h of e)
    if (firstGlobCharIndex(h) !== -1 && !r.has(h)) {
      r.add(h);
      s.push(h);
    }
  return s;
}
//@ chunk-e6aww6q8.js:1106828-1107218 layout
/**
 * 解析 cp/mv 的 -t / --target-directory，返回是否指定了目标目录和粘连写法里的目标路径。
 */
function getTargetDirectoryOption(e, n) {
  let r = false;
  let s = [];
  if (e === "cp" || e === "mv") {
    for (let h of n)
      if (h.startsWith("--")) {
        let y = firstLineOf(h.slice(2), "=");
        if (y !== "" && "target-directory".startsWith(y)) {
          r = true;
          if (h.includes("=")) s.push(h.slice(h.indexOf("=") + 1));
        }
      } else if (h.startsWith("-") && h.indexOf("t") > 0) {
        r = true;
        if (h.indexOf("t") < h.length - 1) s.push(h.slice(h.indexOf("t") + 1));
      }
  }
  return {
    targetDirectoryGiven: r,
    attachedDestinations: s,
  };
}
//@ chunk-e6aww6q8.js:1107218-1112301 fingerprint = validateCommandPaths (0.571)
/**
 * 对一个路径受限命令的全部路径做权限校验：读封锁下的通配/占位符/~user 路径要询问；写操作的路径先按读校验；按操作类型 validatePath，deny 规则直接拒绝，不在工作目录内则 ask（带 blockedPath）。
 */
function validateCommandPaths(command, n, cwd, context, compoundCommandHasCd, operationTypeOverride, S, w) {
  let L = operationTypeOverride ?? COMMAND_OPERATION_TYPE[command];
  let G = PATH_EXTRACTORS[command](n);
  let globArgsNeedingCheck = getGlobArgsNeedingCheck(command, w, n, G);
  let Z = L === "read" ? [...G, ...globArgsNeedingCheck] : G;
  if (command === "tee" && Z.length === 0 && globArgsNeedingCheck.length === 0)
    return {
      behavior: "passthrough",
      message: "Path validation passed for tee command",
    };
  let Se = context.blockReadsOutsideWorkingDirectories === true;
  let ke = COMMAND_ARGS_SAFE_CHECKS[command];
  let we = ke !== undefined && !ke(n);
  let { targetDirectoryGiven, attachedDestinations } = getTargetDirectoryOption(command, n);
  let Ie =
    L === "read"
      ? []
      : [...(targetDirectoryGiven ? Z : getSourceArgsOfWriteCommand(command, Z)), ...globArgsNeedingCheck];
  let Me = !Se ? [] : L === "read" ? Z : Ie;
  if (
    Se &&
    (Me.some((gt) => shellPathSegments(gt).some((At) => urlPatternToRegex(At))) ||
      (AWK_COMMANDS.has(command) &&
        n.some((gt) => /getline/.test(gt) || awkProgramHasExecBridge(gt) !== false)))
  ) {
    let gt = checkDenyRulesForPaths(command, [...Z, ...attachedDestinations], cwd, context, L, Ie);
    if (gt) return gt;
    return outsideReadsRuntimePathAsk(command);
  }
  if (
    Me.some((gt) => containsAnyPlaceholder(gt)) ||
    Me.some((gt) => gt.startsWith("~") && gt !== "~" && !gt.startsWith("~/"))
  ) {
    let gt = checkDenyRulesForPaths(command, [...Z, ...attachedDestinations], cwd, context, L, Ie);
    if (gt) return gt;
    return outsideReadsRuntimePathAsk(command);
  }
  if (L !== "read")
    for (let gt of Me) {
      let { allowed, resolvedPath, decisionReason } = validatePath(gt, cwd, context, "read");
      if (!allowed && decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message: `${command} in '${resolvedPath}' was blocked by a deny rule`,
          decisionReason,
        };
      if (!allowed && isOutsideReadsBlockedAsk(decisionReason)) {
        let qt = checkDenyRulesForPaths(command, [...Z, ...attachedDestinations], cwd, context, L, Ie);
        if (qt) return qt;
        return {
          behavior: "ask",
          message:
            we && (command === "cp" || command === "mv")
              ? `${command} names a path outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`
              : decisionReason.reason,
          decisionReason,
        };
      }
    }
  let mapped = Z.map((gt) => validatePath(gt, cwd, context, L));
  let mapped_2 = attachedDestinations.map((attachedDestination) =>
    validatePath(attachedDestination, cwd, context, L),
  );
  let mapped_3 = Ie.map((gt) => validatePath(gt, cwd, context, "read"));
  let Je = (gt) =>
    !containsAnyPlaceholder(gt) && (!compoundCommandHasCd || isAbsolute(gt) || gt.startsWith("~"));
  let nt =
    mapped.find((gt, At) => !gt.allowed && gt.decisionReason?.type === "rule" && Je(Z[At])) ??
    mapped_2.find(
      (gt, At) => !gt.allowed && gt.decisionReason?.type === "rule" && Je(attachedDestinations[At]),
    ) ??
    mapped_3.find((gt, At) => !gt.allowed && gt.decisionReason?.type === "rule" && Je(Ie[At]));
  if (nt?.decisionReason !== undefined)
    return {
      behavior: "deny",
      message: formatDenyRuleBlockedMessage(
        command,
        L === "read" || mapped_3.includes(nt) ? "from" : "to",
        nt.resolvedPath,
      ),
      decisionReason: nt.decisionReason,
    };
  if (L !== "read" && Z.some((gt) => containsAnyPlaceholder(gt)))
    return {
      behavior: "ask",
      message: `${command} target contains command-substitution or untracked-variable output \u2014 the path is runtime-determined and cannot be validated`,
      decisionReason: {
        type: "other",
        reason: `${command} path argument is runtime-determined`,
        bashMissKind: "shell-expansion",
      },
    };
  if (we) {
    if (command === "cd") {
      if (Se) return outsideReadsRuntimePathAsk(command);
      return {
        behavior: "ask",
        message: `cd with two or more directory arguments requires manual approval. zsh's "cd OLD NEW" form substitutes OLD\u2192NEW in $PWD, producing a target path that cannot be statically validated.`,
        decisionReason: {
          type: "other",
          reason: "cd with two or more directory arguments",
          bashMissKind: "cd-multi-positional",
        },
      };
    }
    return {
      behavior: "ask",
      message: `${command} with flags requires manual approval to ensure path safety. For security, Claude Code cannot automatically validate ${command} commands that use flags, as some flags like --target-directory=PATH can bypass path validation.`,
      decisionReason: {
        type: "other",
        reason: `${command} command with flags requires manual approval`,
        bashMissKind: "flag-validation",
      },
    };
  }
  if (
    compoundCommandHasCd &&
    L === "read" &&
    Z.some((gt) => !isAbsolute(expandTildeWithHome(gt))) &&
    (Se || (command !== "cd" && S !== true && hasBashDenyRule(context)))
  ) {
    let gt = checkDenyRulesForPaths(command, Z, cwd, context, L);
    if (gt) return gt;
    if (Se) return outsideReadsRuntimePathAsk(command);
    let paths = hasNoBashDenyRules(context);
    return {
      behavior: "ask",
      message: paths
        ? `${command} reads a relative path after cd. That can't be checked against this computer's keys and sign-in files first.`
        : `${command} reads a file by a relative path after a cd in a compound command; which file that is cannot be resolved statically while a Read() deny rule is configured, so this needs approval.`,
      decisionReason: {
        type: "other",
        reason: paths
          ? "A relative read after cd can't be checked against keys and sign-in files"
          : "Compound command contains cd with a relative file read while a Read() deny rule exists",
        bashMissKind: "cd-compound-read",
      },
    };
  }
  if (compoundCommandHasCd && L !== "read")
    return {
      behavior: "ask",
      message:
        "Commands that change directories and perform write operations require explicit approval to ensure paths are evaluated correctly. For security, Claude Code cannot automatically determine the final working directory when 'cd' is used in compound commands.",
      decisionReason: {
        type: "other",
        reason:
          "Compound command contains cd with write operation - manual approval required to prevent path resolution bypass",
        bashMissKind: "cd-compound-write",
      },
    };
  let pt;
  let filtered = mapped.filter((gt) => !gt.allowed && gt.decisionReason?.type === "safetyCheck");
  let yt =
    filtered.length === 0 ||
    (command === "cp" && filtered.at(-1) !== mapped.at(-1)) ||
    mapped.some((gt) => !gt.allowed && gt.decisionReason?.type === "rule");
  for (let { allowed, resolvedPath, decisionReason, isInWorkingDir } of yt ? mapped : filtered.slice(0, 1))
    if (!allowed) {
      let workingDirs = Array.from(allWorkingDirectories(context));
      let dirListStr = formatDirectoryList(workingDirs);
      let rn = isInWorkingDir === true && decisionReason === undefined;
      let message =
        decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
          ? decisionReason.reason
          : rn
            ? formatInsideWorkingDirApproval(`${command} in '${resolvedPath}'`, dirListStr)
            : L !== "read" && decisionReason?.type !== "rule"
              ? formatOutsideWorkingDirApproval(`${command} in '${resolvedPath}'`, dirListStr)
              : `${command} in '${resolvedPath}' was blocked. For security, Claude Code may only ${ACTION_VERBS[command]} the allowed working directories for this session: ${dirListStr}.`;
      if (decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message,
          decisionReason,
        };
      let no = {
        behavior: "ask",
        message,
        blockedPath: resolvedPath,
        decisionReason,
        bashAllowRuleOverridable: rn,
      };
      if (rn) {
        pt ??= no;
        continue;
      }
      return no;
    }
  if (pt) return pt;
  return {
    behavior: "passthrough",
    message: `Path validation passed for ${command} command`,
  };
}
//@ chunk-e6aww6q8.js:1112301-1112882 fingerprint = createPathChecker (1)
/**
 * 为某命令生成路径检查器：validateCommandPaths + rm/rmdir 危险删除检查；ask 时附建议（读：会话读规则；写：加会话目录，必要时切 acceptEdits）。
 */
function createPathChecker(command, operationTypeOverride) {
  return (args, cwd, context, compoundCommandHasCd, S, w) => {
    let result = validateCommandPaths(
      command,
      args,
      cwd,
      context,
      compoundCommandHasCd,
      operationTypeOverride,
      S,
      w,
    );
    if (result.behavior === "deny") return result;
    if (command === "rm" || command === "rmdir") {
      let dangerousPathResult = checkDangerousRemovalPaths(command, args, cwd, context, compoundCommandHasCd);
      if (dangerousPathResult.behavior !== "passthrough") return dangerousPathResult;
    }
    if (result.behavior === "passthrough") return result;
    if (result.behavior === "ask") {
      let operationType = operationTypeOverride ?? COMMAND_OPERATION_TYPE[command];
      let suggestions = [];
      if (result.blockedPath)
        if (operationType === "read") {
          let dirPath = getDirectoryForPath(result.blockedPath);
          let suggestion = createReadRuleSuggestion(dirPath, "session");
          if (suggestion) suggestions.push(suggestion);
        } else
          suggestions.push({
            type: "addDirectories",
            directories: [getDirectoryForPath(result.blockedPath)],
            destination: "session",
          });
      if ((operationType === "write" || operationType === "create") && acceptEditsSuggestionApplies(context))
        suggestions.push({
          type: "setMode",
          mode: "acceptEdits",
          destination: "session",
        });
      result.suggestions = suggestions;
    }
    return result;
  };
}
//@ chunk-e6aww6q8.js:1112882-1112911 layout
function parseCommandArgs(e) {
  return getCommandArgv(e);
}
//@ chunk-e6aww6q8.js:1112911-1113249 fingerprint = validateSinglePathCommand (1)
/**
 * 文本版：剥离包装后解析命令，若是路径受限命令则做路径检查（白名单内的 sed 视为读）。
 */
function validateSinglePathCommand(cmd, cwd, toolPermissionContext, compoundCommandHasCd, h) {
  let strippedCmd = stripSafeWrappers(cmd);
  let extractedArgs = parseCommandArgs(strippedCmd);
  if (extractedArgs.length === 0)
    return {
      behavior: "passthrough",
      message: "Empty command - no paths to validate",
    };
  let [w, ...L] = extractedArgs;
  let baseCmd = normalizeCommandName(w);
  if (!baseCmd || !SUPPORTED_PATH_COMMANDS.includes(baseCmd))
    return {
      behavior: "passthrough",
      message: `Command '${baseCmd}' is not a path-restricted command`,
    };
  let operationTypeOverride =
    baseCmd === "sed" && sedCommandIsAllowedByAllowlist(strippedCmd) ? "read" : undefined;
  return createPathChecker(baseCmd, operationTypeOverride)(
    L,
    cwd,
    toolPermissionContext,
    compoundCommandHasCd,
    h,
  );
}
//@ chunk-e6aww6q8.js:1113249-1113594 fingerprint = validateSinglePathCommandArgv (1)
/**
 * AST 版：对 tree-sitter 解析出的简单命令做路径检查。
 */
function validateSinglePathCommandArgv(cmd, cwd, toolPermissionContext, compoundCommandHasCd, h) {
  let argv = stripWrappersFromArgvForPaths(cmd.argv);
  if (argv.length === 0)
    return {
      behavior: "passthrough",
      message: "Empty command - no paths to validate",
    };
  let [S, ...w] = argv;
  let baseCmd = normalizeCommandName(S);
  if (!baseCmd || !SUPPORTED_PATH_COMMANDS.includes(baseCmd))
    return {
      behavior: "passthrough",
      message: `Command '${baseCmd}' is not a path-restricted command`,
    };
  let operationTypeOverride =
    baseCmd === "sed" && sedCommandIsAllowedByAllowlist(stripSafeWrappers(cmd.text)) ? "read" : undefined;
  return createPathChecker(baseCmd, operationTypeOverride)(
    w,
    cwd,
    toolPermissionContext,
    compoundCommandHasCd,
    h,
    cmd,
  );
}
//@ chunk-e6aww6q8.js:1113594-1113838 layout
/**
 * 求 AST 命令读取的路径（路径提取 + 输入重定向），去掉占位符和特殊设备。
 */
function getReadPathsForAstCommand(e) {
  let n = stripWrappersFromArgvForPaths(e.argv);
  let [r, ...s] = n;
  let h = normalizeCommandName(r);
  let y = [];
  if (h && SUPPORTED_PATH_COMMANDS.includes(h)) {
    let S = h;
    let w = PATH_EXTRACTORS[S](s);
    y.push(...(COMMAND_OPERATION_TYPE[S] === "read" ? w : getSourceArgsOfWriteCommand(S, w)));
    y.push(...getGlobArgsNeedingCheck(S, e, s, w));
  }
  y.push(...astRedirectsToOutputRedirections(e.redirects).inputRedirections);
  return y.filter((S) => !containsAnyPlaceholder(S) && !isSpecialDevicePath(S));
}
//@ chunk-e6aww6q8.js:1113838-1114900 layout
/**
 * 求 AST 命令会写入的路径：写命令的目标、cp/mv 落点、输出重定向目标，并标记是否可能写入看不到的位置（sort -o、uniq 第二参数、find -fprint、sed 写、cp/mv --backup 等）。供文件监视/编辑 diff 使用。
 */
function getWriteTargetsForAstCommand(simple) {
  let n = stripWrappersFromArgvForPaths(simple.argv);
  let [r, ...s] = n;
  let replaced = r?.replace(/^.*[\\/]/, "");
  let y = [];
  let S = [];
  let w = [];
  let L = false;
  let G = replaced !== undefined && replaced !== "git" && SUPPORTED_PATH_COMMANDS.includes(replaced);
  if (G) {
    let q = replaced;
    let Z = PATH_EXTRACTORS[q](s);
    let Se = q === "sed" ? stripSafeWrappers(simple.text) : "";
    if (COMMAND_OPERATION_TYPE[q] === "read")
      L =
        (q === "sort" && s.some((ke) => /^-[A-Za-z]*o/.test(ke) || ke.startsWith("--o"))) ||
        (q === "uniq" && Z.length >= 2) ||
        (q === "find" && s.some((ke) => isFindDangerousAction(ke)));
    else if (q !== "sed" || !sedCommandIsAllowedByAllowlist(Se)) {
      L =
        q === "sed" &&
        !sedCommandIsAllowedByAllowlist(Se, {
          allowFileWrites: true,
        });
      let { targetDirectoryGiven, attachedDestinations } = getTargetDirectoryOption(q, s);
      let Ee = (q === "cp" || q === "mv") && !targetDirectoryGiven && Z.length >= 2;
      if (Ee && q === "cp" && hasOnlyListOptions(s)) {
        w = Z.slice(0, -1);
        y.push(...Z.slice(-1));
      } else y.push(...Z);
      y.push(...attachedDestinations);
      if ((q === "cp" || q === "mv") && hasBackupSuffixOption(s)) L = true;
      if (q === "cp" && cpHasAmbiguousDestination(s, Ee ? Z.slice(0, -1) : targetDirectoryGiven ? Z : []))
        L = true;
      let Ae = Ee ? Z.slice(-1) : targetDirectoryGiven ? [...Z, ...attachedDestinations] : [];
      for (let Ie of Ae)
        for (let Me of Z) {
          let We = basename(Me);
          if (Me !== Ie && We !== "." && We !== "..") S.push(`${Ie.replace(/[\\/]+$/, "")}/${We}`);
        }
    }
  }
  for (let redirect of simple.redirects)
    if (
      OUTPUT_REDIRECT_OPS.has(redirect.op) &&
      !(redirect.op === ">&" && /^(?:\d+|-)$/.test(redirect.target))
    )
      y.push(redirect.target);
  return {
    known: G,
    written: uniq(y).filter((q) => !isSpecialDevicePath(q)),
    landings: uniq(S),
    copySources: uniq(w),
    writesUnseen: L,
  };
}
//@ chunk-e6aww6q8.js:1114900-1115068 layout
function cpHasAmbiguousDestination(e, n) {
  return (
    n.some((r) => {
      let s = basename(r);
      return s === "." || s === ".." || (getPlatform() === "macos" && /[\\/]$/.test(r));
    }) || e.some((r) => r.startsWith("--no-t") || /^-[^-]*T/.test(r))
  );
}
//@ chunk-e6aww6q8.js:1115068-1115152 layout
function hasBackupSuffixOption(e) {
  return e.some((n) => /^--(?:pa|b|su)/.test(n) || /^-[^-]*[bS]/.test(n));
}
//@ chunk-e6aww6q8.js:1115152-1115201 layout
var OUTPUT_REDIRECT_OPS = new Set([">", ">|", "&>", ">>", "&>>", ">&"]);
//@ chunk-e6aww6q8.js:1115201-1115382 layout
function hasOnlyListOptions(args) {
  let n = false;
  for (let arg of args) {
    if (arg === "--") return !n;
    if (!arg.startsWith("-") || arg === "-") n = true;
    else if (n || (arg.startsWith("--") ? /^--[ls]/.test(arg) : /[ls]/.test(arg))) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:1115382-1115420 layout
var CASE_SENSITIVE_PATH_COMMANDS = new Set(["rm", "rmdir", "tee"]);
//@ chunk-e6aww6q8.js:1115420-1115564 layout
/**
 * 规范化命令名：rm/rmdir/tee 去掉目录前缀（tee 还去 .exe 并小写），其他保持原样。
 */
function normalizeCommandName(e) {
  if (!e) return e;
  let replaced = e.replace(/^.*[\\/]/, "");
  if (CASE_SENSITIVE_PATH_COMMANDS.has(replaced)) return replaced;
  return replaced.toLowerCase().replace(/\.exe$/, "") === "tee" ? "tee" : e;
}
//@ chunk-e6aww6q8.js:1115564-1117098 fingerprint = validateOutputRedirections (0.822)
/**
 * 输出重定向检查：目标命中 deny 规则拒绝；复合命令含 cd 时任何重定向都要询问；目标不在可写范围则 ask 并建议添加会话目录。
 */
function validateOutputRedirections(redirections, cwd, toolPermissionContext, compoundCommandHasCd) {
  let mapped = redirections
    .filter((redirection) => redirection.target !== "/dev/null")
    .filter(
      (redirection) =>
        !compoundCommandHasCd || isAbsolute(redirection.target) || redirection.target.startsWith("~"),
    )
    .map((redirection) => validatePath(redirection.target, cwd, toolPermissionContext, "create"));
  let found = mapped.find((w) => !w.allowed && w.decisionReason?.type === "rule");
  if (found?.decisionReason !== undefined)
    return {
      behavior: "deny",
      message: formatDenyRuleBlockedMessage("Output redirection", "to", found.resolvedPath),
      decisionReason: found.decisionReason,
    };
  if (compoundCommandHasCd && redirections.some((redirection) => redirection.target !== "/dev/null"))
    return {
      behavior: "ask",
      message:
        "Commands that change directories and write via output redirection require explicit approval to ensure paths are evaluated correctly. For security, Claude Code cannot automatically determine the final working directory when 'cd' is used in compound commands.",
      decisionReason: {
        type: "other",
        reason:
          "Compound command contains cd with output redirection - manual approval required to prevent path resolution bypass",
        bashMissKind: "cd-compound-redirect",
      },
    };
  let S;
  for (let { allowed, resolvedPath, decisionReason, isInWorkingDir } of mapped)
    if (!allowed) {
      let workingDirs = Array.from(allWorkingDirectories(toolPermissionContext));
      let dirListStr = formatDirectoryList(workingDirs);
      let message =
        decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
          ? decisionReason.reason
          : decisionReason?.type === "rule"
            ? formatDenyRuleBlockedMessage("Output redirection", "to", resolvedPath)
            : isInWorkingDir === true && decisionReason === undefined
              ? formatInsideWorkingDirApproval(`Output redirection to '${resolvedPath}'`, dirListStr)
              : formatOutsideWorkingDirApproval(`Output redirection to '${resolvedPath}'`, dirListStr);
      if (decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message,
          decisionReason,
        };
      let we = {
        behavior: "ask",
        message,
        blockedPath: resolvedPath,
        decisionReason,
        suggestions: [
          {
            type: "addDirectories",
            directories: [getDirectoryForPath(resolvedPath)],
            destination: "session",
          },
        ],
      };
      if (decisionReason?.type === "safetyCheck") return we;
      S ??= we;
    }
  return (
    S ?? {
      behavior: "passthrough",
      message: "No unsafe redirections found",
    }
  );
}
//@ chunk-e6aww6q8.js:1117098-1117225 sole-consumer
function isHardSafetyAsk(e) {
  return (
    e.behavior === "ask" &&
    e.decisionReason?.type === "safetyCheck" &&
    isBypassImmuneCircuitBreaker(e.decisionReason) &&
    !isClassifierRoutedCircuitBreaker(e.decisionReason)
  );
}
//@ chunk-e6aww6q8.js:1117528-1123341 fingerprint = checkPathConstraints (0.338)
/**
 * Bash 路径约束总检查：进程替换 >( <( 要询问；输入重定向检查；每个子命令的路径检查（deny 优先）；危险重定向目标检查（含 edit deny 规则）；输出重定向检查；汇总返回 deny/ask/passthrough。
 */
function checkPathConstraints(
  input,
  cwd,
  toolPermissionContext,
  compoundCommandHasCd,
  astRedirects,
  astCommands,
  S,
) {
  let w =
    !astCommands && />>\s*>\s*\(|>\s*>\s*\(|<\s*\(/.test(input.command)
      ? {
          behavior: "ask",
          message:
            "Process substitution (>(...) or <(...)) can execute arbitrary commands and requires manual approval",
          decisionReason: {
            type: "other",
            reason: "Process substitution requires manual approval",
            bashMissKind: "process-substitution",
          },
        }
      : undefined;
  let L = astRedirects ? astRedirectsToOutputRedirections(astRedirects) : undefined;
  let { redirections, hasDangerousRedirection, dangerousRedirectionReason } =
    L ?? extractOutputRedirections(input.command);
  let Se = validateInputRedirections(
    L?.inputRedirections ?? [],
    cwd,
    toolPermissionContext,
    compoundCommandHasCd,
  );
  if (Se.behavior === "deny") return Se;
  let ke = astCommands
    ? astCommands.map((astCommand) =>
        validateSinglePathCommandArgv(astCommand, cwd, toolPermissionContext, compoundCommandHasCd, S),
      )
    : splitCommand(input.command).map((yt) =>
        validateSinglePathCommand(yt, cwd, toolPermissionContext, compoundCommandHasCd, S),
      );
  let found = ke.find((yt) => yt.behavior === "deny");
  if (found !== undefined) return found;
  let found_2 = ke.find(
    (yt) =>
      yt.behavior === "ask" &&
      yt.decisionReason?.type === "safetyCheck" &&
      isBypassImmuneCircuitBreaker(yt.decisionReason),
  );
  if (w !== undefined) return found_2 ?? w;
  let Ae;
  if (hasDangerousRedirection) {
    let yt;
    let gt;
    let At;
    let It = [];
    let Yt = false;
    for (let no of [...(L?.denyCheckOutputRedirections ?? []), ...redirections].filter((hn) =>
      hasInteriorDotDot(hn.target),
    )) {
      let redirectionResult = validateOutputRedirections(
        [no],
        cwd,
        toolPermissionContext,
        compoundCommandHasCd,
      );
      if (redirectionResult.behavior === "deny") return redirectionResult;
      if (redirectionResult.behavior === "ask" && redirectionResult.decisionReason?.type === "safetyCheck") {
        let { circuitBreaker, also, classifierApprovable } = redirectionResult.decisionReason;
        At ??= redirectionResult;
        It.push(...(circuitBreaker !== undefined ? [circuitBreaker] : []), ...(also ?? []));
        Yt ||= !classifierApprovable;
      }
    }
    if (L !== undefined) {
      let no = [...L.denyCheckOutputRedirections, ...redirections];
      for (let cmd of no)
        for (let ho of getRedirectTargetCandidates(cmd.target, cwd)) {
          let yn = walkPermissionCheckPaths(ho.path);
          let Kn = permissionCheckSpellings(yn);
          for (let ao of Kn) {
            let $o = matchingRuleForInput(ao, toolPermissionContext, "edit", "deny");
            if ($o !== null) {
              if (ho.cwdIndependent || !compoundCommandHasCd)
                return {
                  behavior: "deny",
                  message: formatDenyRuleBlockedMessage("Output redirection", "to", ao),
                  decisionReason: {
                    type: "rule",
                    rule: $o,
                  },
                };
            }
          }
          let result = checkEditableInternalPath(ho.path, {}, Kn, {
            restricted: toolPermissionContext.restricted,
          });
          let fo = result.behavior === "deny" && true;
          let To = fo ? internalPathDenyWords(result.decisionReason) : undefined;
          let bo = fo ? hostPersonOnlyTag(result.decisionReason) : undefined;
          let vn = checkPathSafetyForAutoEdit(ho.path, Kn);
          let co = symlinkRedirect(yn, toolPermissionContext);
          let So;
          if (fo) {
            So =
              co === null
                ? undefined
                : {
                    sentence: symlinkRedirectSentence(ho.path, co),
                    personOnly: co.carriedOut || !hardDeniedAsSpelled(ho.path, toolPermissionContext),
                  };
            It.push("internalHardDeny", ...(bo !== undefined ? [bo] : []));
            if (bo !== undefined || So?.personOnly === true) Yt = true;
          }
          let ko =
            vn.safe || co === null
              ? null
              : {
                  sentence: symlinkRedirectSentence(ho.path, co),
                  personOnly: co.carriedOut || checkPathSafetyForAutoEdit(ho.path, [ho.path]).safe,
                };
          let un = vn.safe || (vn.classifierApprovable && ko?.personOnly !== true && So?.personOnly !== true);
          if (!vn.safe) {
            It.push(...(vn.circuitBreaker !== undefined ? [vn.circuitBreaker] : []), ...(vn.also ?? []));
            if (ko?.personOnly === true) Yt = true;
          }
          if (
            yt === undefined ||
            (yt.decisionReason?.type === "safetyCheck" && yt.decisionReason.classifierApprovable)
          ) {
            let circuitBreaker =
              yt?.decisionReason?.type === "safetyCheck" ? yt.decisionReason.circuitBreaker : undefined;
            if (
              !vn.safe &&
              (yt === undefined || !un || (vn.circuitBreaker !== undefined && circuitBreaker === undefined))
            ) {
              let $o = To ?? vn.message;
              let yo = ko === null ? $o : `${$o.endsWith(".") ? $o : `${$o}.`} ${ko.sentence}.`;
              yt = {
                behavior: "ask",
                message: yo,
                decisionReason: {
                  type: "safetyCheck",
                  reason: yo,
                  ...(toolPermissionContext.restricted
                    ? {
                        classifierApprovable: false,
                        circuitBreaker: "restrictedMode",
                      }
                    : {
                        classifierApprovable: un,
                        circuitBreaker: vn.circuitBreaker ?? bo,
                      }),
                },
              };
              continue;
            }
          }
          if (
            vn.safe &&
            fo &&
            (gt === undefined ||
              ((bo !== undefined || So?.personOnly === true) &&
                gt.decisionReason?.type === "safetyCheck" &&
                gt.decisionReason.classifierApprovable))
          )
            gt = {
              behavior: "ask",
              message: To ?? result.message,
              decisionReason: internalDenyShellAskReason(result, toolPermissionContext.restricted, So),
            };
          if (vn.safe && !fo && co?.carriedOut === true) {
            Yt = true;
            let ao = symlinkRedirectSentence(ho.path, co);
            let $o = {
              behavior: "ask",
              message: ao,
              decisionReason: {
                type: "safetyCheck",
                reason: ao,
                classifierApprovable: false,
              },
            };
            if (yt === undefined) At ??= $o;
            else if (yt.decisionReason?.type === "safetyCheck" && yt.decisionReason.classifierApprovable)
              yt = $o;
          }
        }
    }
    let qt = (no) => {
      if (no.behavior !== "ask" || no.decisionReason?.type !== "safetyCheck") return no;
      let decisionReason = no.decisionReason;
      let filtered = uniq([...(decisionReason.also ?? []), ...It]).filter(
        (yn) => yn !== decisionReason.circuitBreaker,
      );
      return {
        ...no,
        decisionReason: {
          ...decisionReason,
          classifierApprovable: decisionReason.classifierApprovable && !Yt,
          ...(filtered.length > 0 && {
            also: filtered,
          }),
        },
      };
    };
    if (yt !== undefined) {
      let commands = qt(yt);
      return found_2 === undefined || isHardSafetyAsk(commands) ? commands : qt(found_2);
    }
    let Zt =
      dangerousRedirectionReason === "network_device"
        ? "Redirect involving /dev/tcp or /dev/udp opens a network connection"
        : dangerousRedirectionReason === "unc_path"
          ? "Redirect target is a Windows UNC path \u2014 opening it triggers an SMB connection"
          : "Shell expansion syntax in paths requires manual approval";
    let pn =
      At !== undefined
        ? qt(At)
        : gt !== undefined
          ? qt(gt)
          : {
              behavior: "ask",
              message: Zt,
              decisionReason: {
                type: "other",
                reason: Zt,
                bashMissKind:
                  dangerousRedirectionReason === "network_device" || dangerousRedirectionReason === "unc_path"
                    ? "net-redirect"
                    : "shell-expansion",
              },
            };
    if (toolPermissionContext.blockReadsOutsideWorkingDirectories !== true)
      return found_2 === undefined || isHardSafetyAsk(pn) ? pn : qt(found_2);
    Ae = pn;
  }
  let Ie;
  function Me(yt) {
    if (yt.behavior === "deny") return yt;
    if (yt.behavior === "ask") {
      if (yt.bashAllowRuleOverridable) {
        Ie ??= yt;
        return;
      }
      return yt;
    }
    return;
  }
  let We = validateOutputRedirections(redirections, cwd, toolPermissionContext, compoundCommandHasCd);
  let ze = Me(We);
  let lt;
  if (ze) {
    if (ze.behavior === "deny" || toolPermissionContext.blockReadsOutsideWorkingDirectories !== true)
      return ze.behavior === "ask" && found_2 !== undefined && !isHardSafetyAsk(ze)
        ? mergeSafetyCheckAlso(found_2, ze)
        : ze;
    lt = ze;
  }
  let Je;
  if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true && astRedirects)
    for (let cmd of astRedirects) {
      if (cmd.op !== "<") continue;
      if (containsAnyPlaceholder(cmd.target)) {
        Je ??= outsideReadsRuntimePathAsk("input redirect");
        continue;
      }
      let gt = validatePath(cmd.target, cwd, toolPermissionContext, "read");
      if (!gt.allowed && gt.decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message: `Input redirection from '${gt.resolvedPath}' was blocked by a deny rule.`,
          decisionReason: gt.decisionReason,
        };
      if (!gt.allowed && isOutsideReadsBlockedAsk(gt.decisionReason)) {
        Je ??= {
          behavior: "ask",
          message: gt.decisionReason.reason,
          decisionReason: gt.decisionReason,
        };
        continue;
      }
      if (
        shellPathSegments(cmd.target).some((At) => urlPatternToRegex(At)) ||
        globBeforeInteriorDotDot(cmd.target)
      ) {
        Je ??= outsideReadsRuntimePathAsk("input redirect");
        continue;
      }
      if (gt.allowed) continue;
      Je ??= outsideReadsRuntimePathAsk("input redirect");
    }
  let nt;
  if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true) {
    let yt = astCommands
      ? astCommands.map((astCommand) => astCommand.argv)
      : splitCommand(input.command).map((gt) => parseCommandArgs(gt));
    for (let gt of yt) {
      let At =
        checkLinkSourcePaths(gt, cwd, toolPermissionContext) ??
        checkPushdEnvChdirPath(gt, cwd, toolPermissionContext);
      if (At?.behavior === "deny") return At;
      nt ??= At;
    }
  }
  nt ??= Je;
  let pt = toolPermissionContext.blockReadsOutsideWorkingDirectories === true;
  let Et;
  for (let yt of ke) {
    let gt = Me(yt);
    if (!gt) continue;
    if (gt.behavior === "deny" || !pt) return gt;
    if (isOutsideReadsBlockedAsk(gt.decisionReason)) nt ??= gt;
    else Et ??= gt;
  }
  if (nt) return nt;
  if (found_2)
    return (
      [Ae, lt].find((yt) => yt !== undefined && isHardSafetyAsk(yt)) ??
      mergeSafetyCheckAlso(found_2, Ae ?? lt)
    );
  if (Ae) return Ae;
  if (lt) return lt;
  if (Et) return Et;
  if (Se.behavior === "ask") return Se;
  if (Ie) return Ie;
  return {
    behavior: "passthrough",
    message: "All path commands validated successfully",
  };
}
//@ chunk-e6aww6q8.js:1123341-1124615 layout
/**
 * 输入重定向（< file）检查：目标是通配或在 cd 之后时询问；命中 read deny 规则拒绝；否则按读路径校验。
 */
function validateInputRedirections(e, cwd, toolPermissionContext, compoundCommandHasCd) {
  let h;
  for (let y of e) {
    if (isSpecialDevicePath(y)) continue;
    if (firstGlobCharIndex(y) !== -1 || (compoundCommandHasCd && !isAbsolute(y) && !y.startsWith("~"))) {
      for (let q of getRedirectTargetCandidates(y, cwd)) {
        if (!q.cwdIndependent && compoundCommandHasCd) continue;
        for (let Z of getPathsForPermissionCheck(q.path)) {
          let Se = matchingRuleForInput(Z, toolPermissionContext, "read", "deny");
          if (Se !== null)
            return {
              behavior: "deny",
              message: formatDenyRuleBlockedMessage("Input redirection", "from", Z),
              decisionReason: {
                type: "rule",
                rule: Se,
              },
            };
        }
      }
      h ??= {
        behavior: "ask",
        message: `Input redirection from '${y}' requires manual approval: the file it names depends on glob expansion or a directory change in the same command.`,
        blockedPath: y,
        decisionReason: {
          type: "other",
          reason: "Input redirection target is a glob or follows a cd - manual approval required",
          bashMissKind: "shell-expansion",
        },
      };
      continue;
    }
    let { allowed, resolvedPath, decisionReason } = validatePath(y, cwd, toolPermissionContext, "read");
    if (allowed) continue;
    if (decisionReason?.type === "rule")
      return {
        behavior: "deny",
        message: formatDenyRuleBlockedMessage("Input redirection", "from", resolvedPath),
        decisionReason,
      };
    let readRuleSuggestion = createReadRuleSuggestion(getDirectoryForPath(resolvedPath), "session");
    h ??= {
      behavior: "ask",
      message:
        decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
          ? decisionReason.reason
          : `Input redirection from '${resolvedPath}' was blocked. For security, Claude Code may only read files in the allowed working directories for this session: ${formatDirectoryList(Array.from(allWorkingDirectories(toolPermissionContext)))}.`,
      blockedPath: resolvedPath,
      decisionReason,
      ...(readRuleSuggestion && {
        suggestions: [readRuleSuggestion],
      }),
    };
  }
  return (
    h ?? {
      behavior: "passthrough",
      message: "No unsafe input redirections found",
    }
  );
}
//@ chunk-e6aww6q8.js:1124615-1124791 layout
/**
 * /dev/null、/dev/std*、/dev/tty、/dev/fd/N、/proc/self/fd/0-2 等特殊设备路径。
 */
function isSpecialDevicePath(e) {
  return (
    e === "/dev/null" ||
    e === "/dev/stdin" ||
    e === "/dev/stdout" ||
    e === "/dev/stderr" ||
    e === "/dev/tty" ||
    /^\/dev\/fd\/\d+$/.test(e) ||
    /^\/proc\/self\/fd\/[0-2]$/.test(e)
  );
}
//@ chunk-e6aww6q8.js:1124791-1124946 layout
function getRedirectTargetCandidates(e, n) {
  let result = [];
  let s = expandTildeWithHome(e);
  if (s !== e)
    result.push({
      path: s,
      cwdIndependent: true,
    });
  if (!e.startsWith("~"))
    result.push({
      path: resolve_2(n, e),
      cwdIndependent: isAbsolute(e),
    });
  return result;
}
//@ chunk-e6aww6q8.js:1124946-1125928 fingerprint = astRedirectsToOutputRedirections (0.617)
/**
 * 把 AST 重定向列表拆成输出重定向、输入重定向、需做 deny 检查的重定向，并标记危险重定向。
 */
function astRedirectsToOutputRedirections(redirects) {
  let redirections = [];
  let r = [];
  let s = [];
  let h = false;
  let y;
  for (let redirect of redirects) {
    if (/^\/dev\/(tcp|udp)\//.test(redirect.target)) {
      h = true;
      y = "network_device";
      continue;
    }
    if (containsVulnerableUncPath(redirect.target.replace(/\\/g, "/"), true)) {
      h = true;
      if (y !== "network_device") y = "unc_path";
      continue;
    }
    if (
      (redirect.op === ">" ||
        redirect.op === ">|" ||
        redirect.op === "&>" ||
        redirect.op === ">>" ||
        redirect.op === "&>>" ||
        redirect.op === ">&") &&
      (redirect.target.startsWith("~") || firstGlobCharIndex(redirect.target) !== -1)
    ) {
      h = true;
      if (y !== "network_device" && y !== "unc_path") y = "shell_expansion";
      s.push({
        target: redirect.target,
        operator: redirect.op === ">>" || redirect.op === "&>>" ? ">>" : ">",
      });
      continue;
    }
    switch (redirect.op) {
      case ">":
      case ">|":
      case "&>":
        redirections.push({
          target: redirect.target,
          operator: ">",
        });
        break;
      case ">>":
      case "&>>":
        redirections.push({
          target: redirect.target,
          operator: ">>",
        });
        break;
      case ">&":
        if (!/^(?:\d+|-)$/.test(redirect.target))
          redirections.push({
            target: redirect.target,
            operator: ">",
          });
        break;
      case "<":
        r.push(redirect.target);
        break;
      case "<&":
        if (!/^(?:\d+|-)$/.test(redirect.target)) r.push(redirect.target);
        break;
      case "<<":
      case "<<<":
        break;
    }
  }
  return {
    redirections,
    inputRedirections: r,
    hasDangerousRedirection: h,
    dangerousRedirectionReason: y,
    denyCheckOutputRedirections: s,
  };
}
//@ chunk-e6aww6q8.js:1125928-1126168 file-local
function skipStdbufFlags(a) {
  let i = 1;
  while (i < a.length) {
    let arg = a[i];
    if (/^-[ioe]$/.test(arg) && a[i + 1]) i += 2;
    else if (/^-[ioe]./.test(arg)) i++;
    else if (/^--(input|output|error)=/.test(arg)) i++;
    else if (arg.startsWith("-")) return -1;
    else break;
  }
  return i > 1 && i < a.length ? i : -1;
}
//@ chunk-e6aww6q8.js:1126168-1126404 file-local
function skipEnvFlags(a) {
  let i = 1;
  while (i < a.length) {
    let arg = a[i];
    if (arg.includes("=") && !arg.startsWith("-")) i++;
    else if (arg === "-i" || arg === "-0" || arg === "-v") i++;
    else if (arg === "-u" && a[i + 1]) i += 2;
    else if (arg.startsWith("-")) return -1;
    else break;
  }
  return i < a.length ? i : -1;
}
//@ chunk-e6aww6q8.js:1126404-1127358 fingerprint = stripWrappersFromArgv (0.809)
/**
 * 剥离 time/nohup/timeout/nice/stdbuf/env/command 包装（含它们的选项），返回实际命令 argv。被 readOnlyValidation、沙箱读封锁等多处使用。
 */
function stripWrappersFromArgvForPaths(argv) {
  let n = argv;
  for (;;) {
    let replaced = n[0]?.replace(/^.*[\\/]/, "");
    let s =
      replaced === "time" ||
      replaced === "nohup" ||
      replaced === "timeout" ||
      replaced === "nice" ||
      replaced === "stdbuf" ||
      replaced === "env" ||
      replaced === "command"
        ? replaced
        : n[0];
    if (s === "time" || s === "nohup") n = n.slice(n[1] === "--" ? 2 : 1);
    else if (s === "timeout") {
      let i = skipTimeoutFlags(n);
      if (i < 0 || !n[i] || !/^\d+(?:\.\d+)?[smhd]?$/.test(n[i])) return n;
      n = n.slice(i + 1);
    } else if (s === "nice") {
      if (n[1] === "-n" && n[2] && /^-?\d+$/.test(n[2])) n = n.slice(n[3] === "--" ? 4 : 3);
      else if (n[1] && /^-\d+$/.test(n[1])) n = n.slice(n[2] === "--" ? 3 : 2);
      else n = n.slice(n[1] === "--" ? 2 : 1);
    } else if (s === "stdbuf") {
      let i = skipStdbufFlags(n);
      if (i < 0) return n;
      n = n.slice(i);
    } else if (s === "env") {
      let i = skipEnvFlags(n);
      if (i < 0) return n;
      n = n.slice(i);
    } else if (s === "command") {
      let h = 1;
      while (n[h] !== undefined && /^-p+$/.test(n[h])) h++;
      if (n[h] === "--") h++;
      if (h >= n.length || n[h].startsWith("-")) return n;
      n = n.slice(h);
    } else if (n[0] === "builtin") {
      let h = n[1] === "--" ? 2 : 1;
      if (h >= n.length) return n;
      n = n.slice(h);
    } else if (n[0] === "noglob") {
      if (n.length <= 1) return n;
      n = n.slice(1);
    } else return n;
  }
}
//@ chunk-e6aww6q8.js:1127358-1127430 affinity
function formatDenyRuleBlockedMessage(e, n, resolvedPath) {
  return `${e} ${n} '${resolvedPath}' was blocked by a deny rule.`;
}
//@ chunk-e6aww6q8.js:1127430-1127630 affinity
function formatInsideWorkingDirApproval(e, dirListStr) {
  return `${e} needs approval. The path is inside the working directories for this session (${dirListStr}), and Claude Code asks before a shell command creates, changes or removes files there.`;
}
//@ chunk-e6aww6q8.js:1127630-1127784 affinity
function formatOutsideWorkingDirApproval(e, dirListStr) {
  return `${e} needs approval. The path is outside the working directories for this session (${dirListStr}). Allowing runs the command as written.`;
}
//@ chunk-e6aww6q8.js:1153141-1153309 sole-consumer
function isPathOrAncestorMatched(e, n) {
  if (isPathMatchedForPermission(e, n)) return true;
  for (let idx = 1; idx < e.length; idx++) {
    let s = e[idx];
    let h = e[idx - 1];
    if ((s === "/" || s === sep) && h !== "/" && h !== sep) {
      if (isPathMatchedForPermission(e.slice(0, idx), n)) return true;
    }
  }
  return false;
}
//@ chunk-e6aww6q8.js:1153309-1153579 placement = setCwdState (1)
function isCaseVariantInsideCwd(e, n) {
  let lower = e.toLowerCase();
  if (lower === n.toLowerCase()) return true;
  let fsImplementation = getFsImplementation();
  let normalized = (
    resolveDeepestExistingAncestorSync(fsImplementation, getOriginalCwd()) ?? getOriginalCwd()
  ).normalize("NFC");
  let y = relative(normalized, n);
  if (y === ".." || y.startsWith(".." + sep) || isAbsolute(y)) return false;
  let S = n;
  for (;;) {
    if (S.toLowerCase() === lower) return true;
    if (S === normalized || S === dirname(S)) return false;
    S = dirname(S);
  }
}
//@ chunk-e6aww6q8.js:1153579-1154977 placement
/**
 * 从 mkdir/touch 等命令中提取写入目标路径。
 */
function extractWriteTargets(e, n) {
  for (let r of e) {
    if (!r) continue;
    for (let redirect of r.redirects) {
      if (INPUT_REDIRECT_OPS_2.has(redirect.op)) continue;
      if (containsAnyPlaceholder(redirect.target)) return true;
      if (isPathMatchedForPermission(redirect.target, n)) return true;
    }
    let s = stripWrappersFromArgvForPaths(r.argv);
    if (s[0] !== undefined && containsAnyPlaceholder(s[0])) return true;
    let h = normalizeCommandName(s[0]);
    if (!h || !Object.hasOwn(COMMAND_OPERATION_TYPE, h)) continue;
    let y = COMMAND_OPERATION_TYPE[h];
    if ((y !== "write" && y !== "create") || NON_CREATING_WRITE_COMMANDS.has(h)) continue;
    let S = PATH_EXTRACTORS[h](s.slice(1));
    let w =
      h === "mkdir" &&
      s.slice(1).some((L) => /^-[^-]*p/.test(L) || (L.startsWith("--p") && "--parents".startsWith(L)));
    for (let L of S) {
      if (containsAnyPlaceholder(L)) return true;
      if (w ? isPathOrAncestorMatched(L, n) : isPathMatchedForPermission(L, n)) return true;
    }
    if ((h === "cp" || h === "mv") && S.length >= 1) {
      let sliced = s.slice(1);
      let any = sliced.some((Se) => {
        if (/^-[^-]*t/.test(Se)) return true;
        let index = Se.indexOf("=");
        let we = index >= 0 ? Se.slice(0, index) : Se;
        return we.startsWith("--t") && "--target-directory".startsWith(we);
      });
      let any_2 = sliced.some(
        (Se) => /^-[^-]*T/.test(Se) || (Se.startsWith("--n") && "--no-target-directory".startsWith(Se)),
      );
      let Z = false;
      if (!any && S.length >= 2) {
        let last = S.at(-1);
        let ke = [last];
        if (last.startsWith("~")) {
          let we = expandTildeWithHome(last);
          if (we.startsWith("~")) Z = true;
          else ke.push(we);
        }
        if (!Z) {
          let fsImplementation = getFsImplementation();
          let normalized = (resolveDeepestExistingAncestorSync(fsImplementation, n) ?? n).normalize("NFC");
          for (let Ae of ke) {
            let Ie = resolve_2(n, Ae);
            let normalized_2 = resolveForPermissionCheck(fsImplementation, Ie).normalize("NFC");
            if (isCaseVariantInsideCwd(normalized_2, normalized)) {
              Z = true;
              break;
            }
          }
        }
      }
      if (any || Z) {
        let Se = any ? S : S.slice(0, -1);
        if (any_2) return true;
        for (let ke of Se) {
          if (firstGlobCharIndex(ke) !== -1 || containsAnyPlaceholder(ke)) return true;
          let we = basename(ke);
          if (we === "." || we === "..") return true;
          if (ke.startsWith("~")) {
            let Ee = expandTildeWithHome(ke);
            if (Ee.startsWith("~")) return true;
            if (getPathsForPermissionCheck_2(basename(Ee), n) || getPathsForPermissionCheck_2(we, n))
              return true;
          } else if (getPathsForPermissionCheck_2(we, n)) return true;
        }
      }
    }
  }
  return false;
}
//@ chunk-e6aww6q8.js:1154977-1155016 placement
/**
 * 输入类重定向操作符集合；只读命令判定时这类重定向不算“写”操作。
 */
var INPUT_REDIRECT_OPS = new Set(["<", "<<", "<&", "<<<"]);
export {
  stripWrappersFromArgvForPaths,
  PATH_EXTRACTORS,
  urlPatternToRegex,
  checkPathConstraints,
  hasBashDenyRule,
  checkDangerousRemovalPaths,
  normalizeCommandName,
  hasNoBashDenyRules,
  extractWriteTargets,
  COMMAND_OPERATION_TYPE,
  INPUT_REDIRECT_OPS,
  getReadPathsForAstCommand,
  getWriteTargetsForAstCommand,
};
