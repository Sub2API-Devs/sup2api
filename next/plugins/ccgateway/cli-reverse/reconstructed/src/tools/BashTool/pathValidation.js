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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1070212-1074425 fingerprint (2.1.88 match: checkDangerousRemovalPaths, 0.381)
/**
 * rm/rmdir 危险目标检查：可能为空的变量 + 顶层目录名、反斜杠根、cd 后的相对通配、无法静态解析的通配目标、关键系统目录、工作目录及其祖先、挂载盘根（CLAUDE_CODE_DISABLE_MOUNTED_DRIVE_RM_PROMPT 可关）、跨多层的通配；命中返回不可被规则自动允许的 ask。
 */
function checkDangerousRemovalPaths(command, args, cwd, toolPermissionContext, cdBeforeRemoval) {
  let extractor = PATH_EXTRACTORS[command];
  let paths = extractor(args);
  let { resolvedPath } = safeResolvePath(getFsImplementation(), cwd);
  let cwdVariants = resolvedPath === cwd ? [cwd] : [cwd, resolvedPath];
  let workingDirVariants = uniq(
    [...cwdVariants, ...(toolPermissionContext ? allWorkingDirectories(toolPermissionContext) : [])].flatMap(
      (dir) => {
        let { resolvedPath } = safeResolvePath(getFsImplementation(), dir);
        return resolvedPath === dir ? [dir] : [dir, resolvedPath];
      },
    ),
  );
  let isDangerousRmOn = isDangerousRmEnabled();
  let any = (args.includes("--") ? args.slice(0, args.indexOf("--")) : args).some(
    (arg) =>
      /^--r|^-[a-zA-Z]*[rR]/.test(arg) ||
      (!arg.includes("/") &&
        (arg.includes("__CMDSUB__") || containsAnyPlaceholder(arg)) &&
        /^(?:-|__(?:CMDSUB(?:_OUTPUT)?|TRACKED_VAR)__)/.test(arg)),
  );
  let mountedDriveAsk;
  for (let path of paths) {
    if (isDangerousRmOn) {
      let rootChild = TRACKED_VAR_TOP_LEVEL_RE.exec(path)?.[1];
      if (rootChild !== undefined) {
        let cleanPath = redactPlaceholdersForDisplay(path);
        return dangerousRemovalAsk(
          command,
          `Dangerous ${command} operation detected: '${cleanPath}'

The target starts with a shell expansion this check cannot read and ends in a top-level directory name: if the expansion is empty, this removes '/${rootChild}'. This requires explicit approval and cannot be auto-allowed by permission rules.

Use a literal absolute path instead.`,
          `on possibly-empty variable path: ${cleanPath} (${EMPTY_EXPANSION_HINT}${rootChild})`,
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
    let expanded = expandTildeWithHome(path);
    let absolutePath = isAbsolute(expanded) ? expanded : resolve_2(cwd, expanded);
    let strippedGlobs = absolutePath;
    for (let previous = ""; previous !== strippedGlobs;) {
      previous = strippedGlobs;
      let withoutTrailingGlobs = strippedGlobs.replace(/([\\/]\*+)+[\\/]*$/, "") || "/";
      if (withoutTrailingGlobs !== strippedGlobs)
        strippedGlobs = /[\\/]/.test(withoutTrailingGlobs)
          ? normalize(withoutTrailingGlobs)
          : withoutTrailingGlobs;
    }
    let hasGlobSuffix = strippedGlobs !== absolutePath;
    if (cdBeforeRemoval && hasGlobSuffix && !isAbsolute(expanded) && /[\\/]\*$/.test(absolutePath))
      return dangerousRemovalAsk(
        command,
        `Dangerous ${command} operation detected: '${absolutePath}'

This command changes directories before the removal, so the relative glob target cannot be statically resolved. This requires explicit approval and cannot be auto-allowed by permission rules.`,
        `on statically-unresolvable target: ${absolutePath}`,
      );
    let relativeTarget = strippedGlobs;
    if (!isAbsolute(expanded)) {
      let cwdPrefix = /[\\/]$/.test(cwd) ? cwd : cwd + sep;
      if (strippedGlobs.startsWith(cwdPrefix)) relativeTarget = strippedGlobs.slice(cwdPrefix.length);
      else if (strippedGlobs === cwd) relativeTarget = "";
    }
    if (
      hasGlobSuffix &&
      (hasInteriorDotDot(expanded) ||
        containsAnyPlaceholder(absolutePath) ||
        expanded.startsWith("~") ||
        isUncOrDevicePath(expanded) ||
        (!isAbsolute(expanded) && /(^|[\\/])\.\.([\\/]|$)/.test(expanded) && /[\\/]\*$/.test(absolutePath)) ||
        (command === "rmdir" &&
          /[\\/]\*$/.test(absolutePath) &&
          args.some((arg) => /^--p/.test(arg) || /^-[a-z]*p/.test(arg))) ||
        (!isAbsolute(expanded) && /\*[\\/]+$/.test(expanded) && /[\\/]\*$/.test(absolutePath)))
    )
      return dangerousRemovalAsk(
        command,
        `Dangerous ${command} operation detected: '${absolutePath}'

This command's removal target cannot be statically resolved to a directory. This requires explicit approval and cannot be auto-allowed by permission rules.`,
        `on statically-unresolvable target: ${absolutePath}`,
      );
    if (!hasGlobSuffix || !/[*?[]/.test(relativeTarget)) {
      let candidates = [strippedGlobs];
      if (strippedGlobs !== absolutePath) {
        let { resolvedPath } = safeResolvePath(getFsImplementation(), strippedGlobs);
        if (resolvedPath !== strippedGlobs) candidates.push(resolvedPath);
      }
      for (let candidate of candidates) {
        if (isDangerousRemovalTarget(candidate))
          return dangerousRemovalAsk(
            command,
            `Dangerous ${command} operation detected: '${absolutePath}'

This command would remove a critical system directory. This requires explicit approval and cannot be auto-allowed by permission rules.`,
            `on critical path: ${absolutePath}`,
          );
        let protectedDirs = hasGlobSuffix ? workingDirVariants : cwdVariants;
        if (
          matchesPathOrWindowsDrive(candidate, (resolved) =>
            protectedDirs.some((dir) => pathInWorkingPath(dir, resolved)),
          )
        )
          return dangerousRemovalAsk(
            command,
            `Dangerous ${command} operation detected: '${absolutePath}'

This command would remove a workspace directory (the working directory, an additional working directory, or one of their parent directories). This requires explicit approval and cannot be auto-allowed by permission rules.`,
            `on working directory or its ancestor: ${absolutePath}`,
          );
      }
      if (
        mountedDriveAsk === undefined &&
        isDangerousRmOn &&
        !env.CLAUDE_CODE_DISABLE_MOUNTED_DRIVE_RM_PROMPT &&
        command === "rm" &&
        (any || hasGlobSuffix) &&
        candidates.some((candidate) => {
          let replaced = posix.normalize(candidate).replace(/(.)\/$/, "$1");
          return candidate.startsWith("/") && MOUNTED_VOLUME_PATH_RE.test(replaced);
        })
      ) {
        let replaced = redactPlaceholdersForDisplay(absolutePath).replaceAll("__CMDSUB__", "$(\u2026)");
        mountedDriveAsk = dangerousRemovalAsk(
          command,
          `Dangerous ${command} operation detected: '${replaced}'

This command would remove a mounted drive, the folder that holds mounted drives, or a file or folder at the top level of a drive. This requires explicit approval and cannot be auto-allowed by permission rules.

If you meant something deeper inside, name it by its full path.`,
          `${MOUNTED_DRIVE_PREFIX}${replaced}`,
        );
      }
    }
    if (hasGlobSuffix && /[\\/]\*$/.test(absolutePath)) {
      let extraDepth =
        count(absolutePath.split(/[\\/]+/), (segment) => segment && segment !== ".") -
        count(strippedGlobs.split(/[\\/]+/), (segment) => segment && segment !== ".");
      let globSegments = count(relativeTarget.split(/[\\/]+/), (segment) => /[*?[]/.test(segment));
      if (extraDepth + globSegments > 1)
        return dangerousRemovalAsk(
          command,
          `Dangerous ${command} operation detected: '${absolutePath}'

This command's glob pattern traverses directories that cannot be statically enumerated. This requires explicit approval and cannot be auto-allowed by permission rules.`,
          `on statically-unresolvable target: ${absolutePath}`,
        );
    }
  }
  return (
    mountedDriveAsk ?? {
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
  let afterDoubleDash = false;
  let sawOperand = false;
  for (let arg of args)
    if (afterDoubleDash || sawOperand) result.push(arg);
    else if (arg === "--") afterDoubleDash = true;
    else if (arg === "-" || !arg?.startsWith("-")) {
      result.push(arg);
      sawOperand = true;
    }
  return result;
}
//@ chunk-e6aww6q8.js:1090223-1090994 layout
/**
 * 按命令的选项规格（布尔/带值/粘连，长短）生成路径提取器：跳过选项及其值，遇到未知选项后不再跳选项。
 */
function makeFlagAwarePathExtractor(spec) {
  let classifyFlag = (arg) => {
    if (arg.startsWith("--")) {
      if (arg.includes("=")) return "attached";
      if (spec.booleanLong.has(arg)) return "boolean";
      if (spec.attachedLong?.has(arg)) return "attached";
      return spec.valuedLong.has(arg) ? "valued" : "unknown";
    }
    if (/^-\d+$/.test(arg)) return "attached";
    for (let idx = 1; idx < arg.length; idx++) {
      let flagChar = arg[idx];
      if (spec.booleanShort.includes(flagChar)) continue;
      if (spec.attachedShort?.includes(flagChar)) return "attached";
      if (!spec.valuedShort.includes(flagChar)) return "unknown";
      return idx === arg.length - 1 ? "valued" : "attached";
    }
    return "boolean";
  };
  return (args) => {
    let paths = [];
    let afterDoubleDash = false;
    let sawOperand = false;
    let flagsKnown = true;
    for (let idx = 0; idx < args.length; idx++) {
      let arg = args[idx];
      if (arg === undefined || arg === null) continue;
      if (afterDoubleDash || sawOperand) paths.push(arg);
      else if (arg === "--") afterDoubleDash = true;
      else if (arg !== "-" && arg.startsWith("-")) {
        if (!flagsKnown) continue;
        let kind = classifyFlag(arg);
        if (kind === "valued") idx++;
        else if (kind === "unknown") flagsKnown = false;
      } else {
        paths.push(arg);
        sawOperand = true;
      }
    }
    return paths;
  };
}
//@ chunk-e6aww6q8.js:1090994-1091064 layout
var DEVICE_PATHS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1090994", () => {
  DEVICE_PATHS = new Set(["/dev/null", "/dev/stdout", "/dev/stderr", "/dev/tty"]);
});
//@ chunk-e6aww6q8.js:1091064-1091114 layout
function filterDevicePaths(paths) {
  return paths.filter((path) => !DEVICE_PATHS.has(path));
}
//@ chunk-e6aww6q8.js:1091114-1091981 fingerprint (2.1.88 match: parsePatternCommand, 0.526)
/**
 * grep 类命令的路径提取：第一个位置参数是模式（有 -e/-f 时不是），-f/--file/--exclude-from 等的值也算路径；无路径时返回默认值。
 */
function parsePatternCommand(args, flagsWithArgs, defaults = []) {
  let paths = [];
  let hasPattern = false;
  let afterDoubleDash = false;
  let sawOperand = false;
  for (let idx = 0; idx < args.length; idx++) {
    let arg = args[idx];
    if (arg === undefined || arg === null) continue;
    if (!afterDoubleDash && !sawOperand && arg === "--") {
      afterDoubleDash = true;
      continue;
    }
    if (!afterDoubleDash && !sawOperand && arg !== "-" && arg.startsWith("-")) {
      let index = arg.indexOf("=");
      let flagName = index >= 0 ? arg.slice(0, index) : arg;
      if (["-e", "--regexp", "-f", "--file"].includes(flagName)) {
        hasPattern = true;
        if (flagName === "-f" || flagName === "--file") {
          let fileValue = index >= 0 ? arg.slice(index + 1) : args[idx + 1];
          if (fileValue) paths.push(fileValue);
        }
      }
      if (/^-[a-zA-Z]*f$/.test(flagName) && flagName !== "-f" && index < 0 && args[idx + 1] !== undefined) {
        hasPattern = true;
        paths.push(args[idx + 1]);
        idx++;
        continue;
      }
      if (["--exclude-from", "--include-from", "--ignore-file"].includes(flagName)) {
        let fileValue = index >= 0 ? arg.slice(index + 1) : args[idx + 1];
        if (fileValue) paths.push(fileValue);
        if (index < 0) idx++;
        continue;
      }
      if (index < 0) {
        let attachedFlagValue = getAttachedFlagValue(arg, ["-f", "--file"]);
        if (attachedFlagValue !== undefined) {
          hasPattern = true;
          paths.push(attachedFlagValue);
          continue;
        }
        if (arg.length > 2 && arg.startsWith("-e")) {
          hasPattern = true;
          continue;
        }
      }
      if (flagsWithArgs.has(flagName) && index < 0) idx++;
      continue;
    }
    if (sawOperand && !afterDoubleDash) {
      let attachedFlagValue = getAttachedFlagValue(arg, ["-f", "--file"]);
      if (attachedFlagValue !== undefined) paths.push(attachedFlagValue);
    }
    sawOperand = true;
    if (!hasPattern) {
      hasPattern = true;
      continue;
    }
    paths.push(arg);
  }
  return paths.length > 0 ? paths : defaults;
}
//@ chunk-e6aww6q8.js:1091981-1092205 layout
function getAttachedFlagValue(arg, flags) {
  if (!arg.startsWith("-")) return;
  let index = arg.indexOf("=");
  if (index >= 0) {
    if (flags.includes(arg.slice(0, index))) return arg.slice(index + 1);
    return;
  }
  for (let flag of flags)
    if (flag.length === 2 && flag[0] === "-" && arg.startsWith(flag) && arg !== flag) return arg.slice(2);
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
var extractAwkPaths = (args) => {
  let valueFlags = new Set(["-F", "--field-separator", "-v", "--assign", "-e", "--source"]);
  let fileFlags = new Set(["-f", "--file", "-E", "--exec"]);
  let paths = [];
  let afterDoubleDash = false;
  let sawProgram = false;
  let sawOperand = false;
  for (let idx = 0; idx < args.length; idx++) {
    let arg = args[idx];
    if (arg === undefined || arg === null) continue;
    if (!afterDoubleDash && !sawOperand && arg === "--") {
      afterDoubleDash = true;
      continue;
    }
    if (!afterDoubleDash && !sawOperand && arg !== "-" && arg.startsWith("-")) {
      let index = arg.indexOf("=");
      let flagName = index >= 0 ? arg.slice(0, index) : arg;
      if (valueFlags.has(flagName)) {
        if (flagName === "-e" || flagName === "--source") sawProgram = true;
        if (index < 0) idx++;
        continue;
      }
      if (fileFlags.has(flagName)) {
        sawProgram = true;
        if (index >= 0) paths.push(arg.slice(index + 1));
        else {
          let fileValue = args[idx + 1];
          if (fileValue !== undefined) {
            paths.push(fileValue);
            idx++;
          }
        }
        continue;
      }
      continue;
    }
    if (sawOperand && !afterDoubleDash) {
      let attachedFlagValue = getAttachedFlagValue(arg, ["-f", "--file", "-E", "--exec"]);
      if (attachedFlagValue !== undefined) paths.push(attachedFlagValue);
    }
    sawOperand = true;
    if (!sawProgram) {
      sawProgram = true;
      continue;
    }
    paths.push(arg);
  }
  return paths;
};
//@ chunk-e6aww6q8.js:1093136-1093201 layout
function joinPathSegment(base, segment) {
  return base === "" ? segment : `${base.replace(/\/+$/, "")}/${segment}`;
}
//@ chunk-e6aww6q8.js:1093201-1099428 fingerprint (2.1.88 match: PATH_EXTRACTORS, 0.427)
/**
 * 每个路径受限命令的路径提取器表 PATH_EXTRACTORS（cd/ls/find/rm/cp/cat/grep/rg/sed/jq/git…），以及 git 全局带值选项、rg 带值选项表。
 */
var GIT_GLOBAL_FLAGS_WITH_VALUE; // deferred: uses makeFlagAwarePathExtractor of its import cycle while loading; runs once the cycle is complete
var RG_FLAGS_WITH_VALUE;
var PATH_EXTRACTORS;
deferInit("chunk-e6aww6q8.js:1093201", () => {
  GIT_GLOBAL_FLAGS_WITH_VALUE = new Set([
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
  RG_FLAGS_WITH_VALUE = new Set([
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
  PATH_EXTRACTORS = {
    cd: (args) => {
      let pathArgs = filterOutFlags(args);
      if (pathArgs.length === 0) return args.at(-1) === "-" ? ["-"] : [homedir()];
      return [pathArgs[0]];
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
    tee: (args) => filterDevicePaths(filterOutFlags(args)),
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
    man: (args) => {
      let any = args.some((arg) => arg === "--local-file" || (/^-[^-]/.test(arg) && arg.includes("l")));
      return args.flatMap((arg, argIndex) => {
        if (argIndex > 0 && (args[argIndex - 1] === "-C" || args[argIndex - 1] === "--config-file"))
          return [arg];
        let pathStartIndex = arg.search(/[\\/~]/);
        return (
          !arg.startsWith("-")
            ? [arg]
            : uniq([
                ...(arg.includes("=") ? [arg.slice(arg.indexOf("=") + 1)] : []),
                ...(arg.length > 2 && !arg.startsWith("--") ? [arg.slice(2)] : []),
                ...(pathStartIndex > 0 ? [arg.slice(pathStartIndex)] : []),
              ])
        ).filter(
          (candidate) =>
            candidate !== "" &&
            (any || /[\\/]/.test(candidate) || candidate.startsWith("~") || candidate.startsWith(".")),
        );
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
      let afterDoubleDash = false;
      let sawOperand = false;
      for (let i = 0; i < args.length; i++) {
        if (skipNext) {
          skipNext = false;
          continue;
        }
        let arg = args[i];
        if (!arg) continue;
        if (!afterDoubleDash && !sawOperand && arg === "--") {
          afterDoubleDash = true;
          continue;
        }
        if (!afterDoubleDash && !sawOperand && arg !== "-" && arg.startsWith("-")) {
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
        sawOperand = true;
        if (!scriptFound) {
          scriptFound = true;
          continue;
        }
        paths.push(arg);
      }
      return paths;
    },
    jq: (args) => {
      let paths = [];
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
          let optionName = index >= 0 ? arg.slice(0, index) : arg;
          if (["-e", "--expression"].includes(optionName)) filterFound = true;
          if (["-f", "--from-file"].includes(optionName)) {
            filterFound = true;
            if (index >= 0) paths.push(arg.slice(index + 1));
            else {
              let optionValue = args[idx + 1];
              if (optionValue !== undefined) {
                paths.push(optionValue);
                idx++;
              }
            }
            continue;
          }
          if (["--slurpfile", "--rawfile"].includes(optionName)) {
            let optionValue = args[idx + 2];
            if (optionValue !== undefined) paths.push(optionValue);
            idx += 2;
            continue;
          }
          if (flagsWithArgs.has(optionName) && index < 0) idx++;
          continue;
        }
        if (!filterFound) {
          filterFound = true;
          continue;
        }
        paths.push(arg);
      }
      return paths;
    },
    git: (args) => {
      let workTreeDir = "";
      let setWorkTreeDir = (workTreeArg) => {
        workTreeDir =
          isAbsolute(expandTildeWithHome(workTreeArg)) || workTreeArg.startsWith("~")
            ? workTreeArg
            : joinPathSegment(workTreeDir, workTreeArg);
      };
      let { index, options } = parseLeadingGitOptions(args);
      for (let { opt, value: optionValue } of options)
        if (opt.startsWith("--work-tree=")) setWorkTreeDir(opt.slice(12));
        else if (optionValue !== undefined && (opt === "-C" || opt === "--work-tree"))
          setWorkTreeDir(optionValue);
      let resolvePath = (pathArg) =>
        workTreeDir === "" || isAbsolute(expandTildeWithHome(pathArg)) || pathArg.startsWith("~")
          ? pathArg
          : joinPathSegment(workTreeDir, pathArg);
      let sliced = args.slice(index + 1);
      if (args[index] === "grep") {
        let patternCommand = parsePatternCommand(sliced, RG_FLAGS_WITH_VALUE);
        return patternCommand.length > 0
          ? patternCommand.map(resolvePath)
          : [workTreeDir === "" ? "." : workTreeDir];
      }
      if (args[index] !== "diff") return [];
      let diffPaths = [];
      let afterDoubleDash = false;
      for (let arg of sliced)
        if (!afterDoubleDash && arg === "--") afterDoubleDash = true;
        else if (afterDoubleDash || arg === "-" || !arg.startsWith("-")) {
          let resolvedPath = resolvePath(arg);
          if (!isSpecialDevicePath(resolvedPath)) diffPaths.push(resolvedPath);
        }
      return diffPaths;
    },
  };
});
//@ chunk-e6aww6q8.js:1099428-1102123 fingerprint (2.1.88 match: ACTION_VERBS, 0.822)
/**
 * 路径受限命令列表、每个命令的动作描述（用于提示文字）和操作类型（read/write/create），以及 mv/cp/cd 的参数安全检查。
 */
var SUPPORTED_PATH_COMMANDS; // deferred: uses GIT_GLOBAL_FLAGS_WITH_VALUE of its import cycle while loading; runs once the cycle is complete
var ACTION_VERBS;
var COMMAND_OPERATION_TYPE;
var COMMAND_ARGS_SAFE_CHECKS;
deferInit("chunk-e6aww6q8.js:1099428", () => {
  SUPPORTED_PATH_COMMANDS = Object.keys(PATH_EXTRACTORS);
  ACTION_VERBS = {
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
  COMMAND_OPERATION_TYPE = {
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
  COMMAND_ARGS_SAFE_CHECKS = {
    mv: (args) => !args.some((arg) => arg?.startsWith("-")),
    cp: (args) => !args.some((arg) => arg?.startsWith("-")),
    cd: (args) => {
      let sawOperand = false;
      let operandCount = 0;
      for (let arg of args) {
        if (!sawOperand) {
          if (arg === "--") {
            sawOperand = true;
            continue;
          }
          if (arg.startsWith("-") && arg !== "-") continue;
          sawOperand = true;
        }
        operandCount++;
      }
      return operandCount <= 1;
    },
  };
});
//@ chunk-e6aww6q8.js:1102123-1103108 layout
/**
 * pushd 或 env -C/--chdir 的目标目录读权限检查：命中拒绝规则→deny；读封锁（blockReadsOutsideWorkingDirectories）下工作目录外→ask；其余通过。
 */
function checkPushdEnvChdirPath(argv, cwd, toolPermissionContext) {
  let commandPath = argv[0];
  if (commandPath === undefined) return;
  let sliced = commandPath.slice(commandPath.lastIndexOf("/") + 1);
  let target;
  if (sliced === "pushd") {
    target = filterOutFlags(argv.slice(1))[0];
    if (target === undefined) return;
  } else if (sliced === "env") {
    for (let idx = 1; idx < argv.length; idx++) {
      let arg = argv[idx];
      if (arg === "-C" || arg === "--chdir") {
        target = argv[idx + 1];
        break;
      }
      if (arg.startsWith("--chdir=")) {
        target = arg.slice(8);
        break;
      }
      if (arg.startsWith("-C") && arg.length > 2) {
        target = arg.slice(2);
        break;
      }
    }
    if (target === undefined) return;
  } else return;
  if (containsAnyPlaceholder(target)) return outsideReadsRuntimePathAsk(sliced);
  let validation = validatePath(target, cwd, toolPermissionContext, "read");
  if (validation.allowed) return;
  if (validation.decisionReason?.type === "rule")
    return {
      behavior: "deny",
      message: `${sliced} in '${validation.resolvedPath}' was blocked by a deny rule`,
      decisionReason: validation.decisionReason,
    };
  if (
    validation.decisionReason?.type === "safetyCheck" &&
    validation.decisionReason.reason === OUTSIDE_READS_BLOCKED_DENY_REASON
  )
    return {
      behavior: "ask",
      message: `${sliced} moves later reads to a directory outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`,
      decisionReason: validation.decisionReason,
    };
  return outsideReadsRuntimePathAsk(sliced);
}
//@ chunk-e6aww6q8.js:1103108-1103912 layout
/**
 * ln/link 源路径的读权限检查，规则同 pushd/env：拒绝规则→deny，读封锁下工作目录外→ask。
 */
function checkLinkSourcePaths(argv, cwd, toolPermissionContext) {
  let strippedArgv = stripWrappersFromArgvForPaths([...argv]);
  let commandPath = strippedArgv[0];
  let sliced = commandPath?.slice(commandPath.lastIndexOf("/") + 1);
  if (sliced !== "ln" && sliced !== "link") return;
  let sliced_2 = strippedArgv.slice(1);
  let pathArgs = filterOutFlags(sliced_2);
  let sourcePaths =
    pathArgs.length !== sliced_2.length || pathArgs.length === 1 ? pathArgs : pathArgs.slice(0, -1);
  if (sourcePaths.some((path) => containsAnyPlaceholder(path))) return outsideReadsRuntimePathAsk(sliced);
  for (let path of sourcePaths) {
    let validation = validatePath(path, cwd, toolPermissionContext, "read");
    if (validation.allowed) continue;
    if (validation.decisionReason?.type === "rule")
      return {
        behavior: "deny",
        message: `${sliced} in '${validation.resolvedPath}' was blocked by a deny rule`,
        decisionReason: validation.decisionReason,
      };
    if (
      validation.decisionReason?.type === "safetyCheck" &&
      validation.decisionReason.reason === OUTSIDE_READS_BLOCKED_DENY_REASON
    )
      return {
        behavior: "ask",
        message: `${sliced} names a path outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`,
        decisionReason: validation.decisionReason,
      };
    return outsideReadsRuntimePathAsk(sliced);
  }
  return;
}
//@ chunk-e6aww6q8.js:1103912-1104143 layout
function findBracketExpressionEnd(pattern) {
  let idx = pattern[1] === "!" || pattern[1] === "^" ? 2 : 1;
  if (pattern[idx] === "]") idx++;
  for (; idx < pattern.length; idx++) {
    let char = pattern[idx];
    if (char === "]") return idx;
    if (char === "[" && /^[:=.]/.test(pattern.slice(idx + 1))) {
      let classChar = pattern[idx + 1];
      let index = pattern.indexOf(classChar + "]", idx + 2);
      if (index !== -1) idx = index + 1;
    }
  }
  return pattern.length - 1;
}
//@ chunk-e6aww6q8.js:1104143-1104811 layout (2.1.88 match: urlPatternToRegex, 1)
function urlPatternToRegex(pattern) {
  if (firstGlobCharIndex(pattern) === -1) return false;
  if (pattern.startsWith("[")) {
    let sliced = pattern.slice(findBracketExpressionEnd(pattern) + 1);
    if (firstGlobCharIndex(sliced) === -1 && sliced !== ".") return false;
  }
  if (/\[[:=.]/.test(pattern)) return true;
  if (pattern.startsWith("*") || pattern.startsWith("?")) return false;
  let regexSource = "^";
  for (let idx = 0; idx < pattern.length; idx++) {
    let char = pattern[idx];
    if (char === "*") regexSource += ".*";
    else if (char === "?") regexSource += ".";
    else if (char === "[") {
      let isNegated = pattern[idx + 1] === "!" || pattern[idx + 1] === "^";
      let index = pattern.indexOf("]", idx + (isNegated ? 3 : 2));
      if (index === -1) {
        regexSource += "\\[";
        continue;
      }
      if (idx > 0 && (isNegated || pattern.indexOf("]", index + 1) !== -1)) {
        regexSource += ".*";
        break;
      }
      let sliced = pattern.slice(idx + 1, index);
      if (sliced.startsWith("!") || sliced.startsWith("^")) sliced = "^" + sliced.slice(1);
      regexSource += "[" + sliced.replace(/[\\\]]/g, "\\$&") + "]";
      idx = index;
    } else regexSource += char.replace(/[.+^$()|{}\\]/g, "\\$&");
  }
  regexSource += "$";
  try {
    return new RegExp(regexSource).test("..");
  } catch {
    return true;
  }
}
//@ chunk-e6aww6q8.js:1104811-1105100 layout
/**
 * 只检查拒绝规则的路径校验：写路径按操作类型、额外读路径按 read，命中拒绝规则即返回 deny。
 */
function checkDenyRulesForPaths(commandName, paths, cwd, toolPermissionContext, intent, readPaths = []) {
  for (let [pathList, checkIntent] of [
    [paths, intent],
    [readPaths, "read"],
  ])
    for (let path of pathList) {
      if (containsAnyPlaceholder(path)) continue;
      let validation = validatePath(path, cwd, toolPermissionContext, checkIntent);
      if (!validation.allowed && validation.decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message: `${commandName} in '${validation.resolvedPath}' was blocked by a deny rule`,
          decisionReason: validation.decisionReason,
        };
    }
  return;
}
//@ chunk-e6aww6q8.js:1105100-1105146 layout
var AWK_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1105100", () => {
  AWK_COMMANDS = new Set(["awk", "gawk", "mawk", "nawk"]);
});
//@ chunk-e6aww6q8.js:1105146-1105200 layout
function isBashToolRule(rule) {
  return rule === FILE_READ_TOOL_NAME || rule.startsWith(`${FILE_READ_TOOL_NAME}(`);
}
//@ chunk-e6aww6q8.js:1105200-1105285 layout
/**
 * 任一来源存在 Bash(...) 拒绝规则。
 */
function hasBashDenyRule(context) {
  return Object.values(context.alwaysDenyRules).some((alwaysDenyRule) =>
    (alwaysDenyRule ?? []).some(isBashToolRule),
  );
}
//@ chunk-e6aww6q8.js:1105285-1105399 layout
/**
 * 除 hostCredential 外，没有任何 Bash(...) 拒绝规则。
 */
function hasNoBashDenyRules(context) {
  return Object.entries(context.alwaysDenyRules).every(
    ([key, value]) => key === "hostCredential" || !(value ?? []).some(isBashToolRule),
  );
}
//@ chunk-e6aww6q8.js:1105399-1105518 layout
function getSourceArgsOfWriteCommand(commandName, args) {
  switch (commandName) {
    case "cp":
    case "mv":
      return args.length >= 2 ? args.slice(0, -1) : [];
    case "sed":
      return args;
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
function parseLeadingGitOptions(argv) {
  let options = [];
  let idx = 0;
  while (idx < argv.length && argv[idx].startsWith("-")) {
    let arg = argv[idx];
    idx++;
    if (GIT_GLOBAL_FLAGS_WITH_VALUE.has(arg) && idx < argv.length) {
      options.push({
        opt: arg,
        value: argv[idx],
      });
      idx++;
    } else
      options.push({
        opt: arg,
      });
  }
  return {
    index: idx,
    options,
  };
}
//@ chunk-e6aww6q8.js:1105832-1106720 layout
/**
 * 找出需要额外做读检查的 glob 参数：无危险选项、无改变路径解析环境变量的普通 git 调用直接返回 []；否则返回未加引号、含通配且未在路径列表中的参数。
 */
function getGlobArgsNeedingCheck(commandName, astCommand, args, checkedGlobs) {
  if (
    commandName === "git" &&
    astCommand !== undefined &&
    !astCommand.argv
      .slice(0, astCommand.argv.length - args.length - 1)
      .some((arg) => /(^|[\\/])env$/.test(arg)) &&
    !astCommand.envVars.some((envVar) => GIT_PATH_ENV_RE.test(envVar.name))
  ) {
    let { index, options } = parseLeadingGitOptions(args);
    let subcommand = args[index];
    let argvUnquotedGlob = astCommand.argvUnquotedGlob;
    let prefixLength = astCommand.argv.length - args.length;
    let hasUnknownQuoteInfo =
      argvUnquotedGlob === undefined ||
      argvUnquotedGlob.length !== astCommand.argv.length ||
      prefixLength < 1 ||
      argvUnquotedGlob.slice(0, prefixLength + index + 1).some(Boolean);
    if (
      !options.some(({ opt, value }) => {
        if (
          opt === "--bare" ||
          opt.startsWith("--config-env") ||
          opt.startsWith("--exec-path") ||
          opt.startsWith("--git-dir")
        )
          return true;
        let configValue = value?.trim() ?? "";
        return (
          containsAnyPlaceholder(configValue) ||
          /^(alias|include|includeif|help\.autocorrect)\b/i.test(configValue)
        );
      }) &&
      !hasUnknownQuoteInfo &&
      subcommand !== undefined &&
      !containsAnyPlaceholder(subcommand) &&
      subcommand !== "grep" &&
      subcommand !== "diff"
    )
      return [];
  }
  let newGlobArgs = getNewGlobArgs(args, checkedGlobs);
  if (newGlobArgs.length === 0) return [];
  if (astCommand === undefined || astCommand.carveOutMayDesyncQuoteScan === true) return newGlobArgs;
  let argvUnquotedGlob = astCommand.argvUnquotedGlob;
  let prefixLength = astCommand.argv.length - args.length;
  if (
    argvUnquotedGlob === undefined ||
    argvUnquotedGlob.length !== astCommand.argv.length ||
    prefixLength < 1
  )
    return newGlobArgs;
  return newGlobArgs.filter((newGlobArg) =>
    args.some((arg, argIdx) => arg === newGlobArg && argvUnquotedGlob[prefixLength + argIdx] === true),
  );
}
//@ chunk-e6aww6q8.js:1106720-1106828 layout
function getNewGlobArgs(args, checkedGlobs) {
  let seen = new Set(checkedGlobs);
  let newGlobs = [];
  for (let arg of args)
    if (firstGlobCharIndex(arg) !== -1 && !seen.has(arg)) {
      seen.add(arg);
      newGlobs.push(arg);
    }
  return newGlobs;
}
//@ chunk-e6aww6q8.js:1106828-1107218 layout
/**
 * 解析 cp/mv 的 -t / --target-directory，返回是否指定了目标目录和粘连写法里的目标路径。
 */
function getTargetDirectoryOption(commandName, args) {
  let targetDirectoryGiven = false;
  let attachedDestinations = [];
  if (commandName === "cp" || commandName === "mv") {
    for (let arg of args)
      if (arg.startsWith("--")) {
        let optionName = firstLineOf(arg.slice(2), "=");
        if (optionName !== "" && "target-directory".startsWith(optionName)) {
          targetDirectoryGiven = true;
          if (arg.includes("=")) attachedDestinations.push(arg.slice(arg.indexOf("=") + 1));
        }
      } else if (arg.startsWith("-") && arg.indexOf("t") > 0) {
        targetDirectoryGiven = true;
        if (arg.indexOf("t") < arg.length - 1) attachedDestinations.push(arg.slice(arg.indexOf("t") + 1));
      }
  }
  return {
    targetDirectoryGiven,
    attachedDestinations,
  };
}
//@ chunk-e6aww6q8.js:1107218-1112301 fingerprint (2.1.88 match: validateCommandPaths, 0.571)
/**
 * 对一个路径受限命令的全部路径做权限校验：读封锁下的通配/占位符/~user 路径要询问；写操作的路径先按读校验；按操作类型 validatePath，deny 规则直接拒绝，不在工作目录内则 ask（带 blockedPath）。
 */
function validateCommandPaths(
  commandName,
  args,
  cwd,
  context,
  compoundCommandHasCd,
  operationTypeOverride,
  isMainThread,
  astCommand,
) {
  let operationType = operationTypeOverride ?? COMMAND_OPERATION_TYPE[commandName];
  let extractedPaths = PATH_EXTRACTORS[commandName](args);
  let globArgsNeedingCheck = getGlobArgsNeedingCheck(commandName, astCommand, args, extractedPaths);
  let pathsToValidate =
    operationType === "read" ? [...extractedPaths, ...globArgsNeedingCheck] : extractedPaths;
  if (commandName === "tee" && pathsToValidate.length === 0 && globArgsNeedingCheck.length === 0)
    return {
      behavior: "passthrough",
      message: "Path validation passed for tee command",
    };
  let isReadBlockEnforced = context.blockReadsOutsideWorkingDirectories === true;
  let argsSafetyCheck = COMMAND_ARGS_SAFE_CHECKS[commandName];
  let hasUnsafeArgs = argsSafetyCheck !== undefined && !argsSafetyCheck(args);
  let { targetDirectoryGiven, attachedDestinations } = getTargetDirectoryOption(commandName, args);
  let readSidePaths =
    operationType === "read"
      ? []
      : [
          ...(targetDirectoryGiven
            ? pathsToValidate
            : getSourceArgsOfWriteCommand(commandName, pathsToValidate)),
          ...globArgsNeedingCheck,
        ];
  let blockCheckedPaths = !isReadBlockEnforced
    ? []
    : operationType === "read"
      ? pathsToValidate
      : readSidePaths;
  if (
    isReadBlockEnforced &&
    (blockCheckedPaths.some((path) =>
      shellPathSegments(path).some((segment) => urlPatternToRegex(segment)),
    ) ||
      (AWK_COMMANDS.has(commandName) &&
        args.some((arg) => /getline/.test(arg) || awkProgramHasExecBridge(arg) !== false)))
  ) {
    let denyResult = checkDenyRulesForPaths(
      commandName,
      [...pathsToValidate, ...attachedDestinations],
      cwd,
      context,
      operationType,
      readSidePaths,
    );
    if (denyResult) return denyResult;
    return outsideReadsRuntimePathAsk(commandName);
  }
  if (
    blockCheckedPaths.some((path) => containsAnyPlaceholder(path)) ||
    blockCheckedPaths.some((path) => path.startsWith("~") && path !== "~" && !path.startsWith("~/"))
  ) {
    let denyResult = checkDenyRulesForPaths(
      commandName,
      [...pathsToValidate, ...attachedDestinations],
      cwd,
      context,
      operationType,
      readSidePaths,
    );
    if (denyResult) return denyResult;
    return outsideReadsRuntimePathAsk(commandName);
  }
  if (operationType !== "read")
    for (let path of blockCheckedPaths) {
      let { allowed, resolvedPath, decisionReason } = validatePath(path, cwd, context, "read");
      if (!allowed && decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message: `${commandName} in '${resolvedPath}' was blocked by a deny rule`,
          decisionReason,
        };
      if (!allowed && isOutsideReadsBlockedAsk(decisionReason)) {
        let denyResult = checkDenyRulesForPaths(
          commandName,
          [...pathsToValidate, ...attachedDestinations],
          cwd,
          context,
          operationType,
          readSidePaths,
        );
        if (denyResult) return denyResult;
        return {
          behavior: "ask",
          message:
            hasUnsafeArgs && (commandName === "cp" || commandName === "mv")
              ? `${commandName} names a path outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`
              : decisionReason.reason,
          decisionReason,
        };
      }
    }
  let mapped = pathsToValidate.map((path) => validatePath(path, cwd, context, operationType));
  let mapped_2 = attachedDestinations.map((attachedDestination) =>
    validatePath(attachedDestination, cwd, context, operationType),
  );
  let mapped_3 = readSidePaths.map((path) => validatePath(path, cwd, context, "read"));
  let isStaticallyResolvable = (path) =>
    !containsAnyPlaceholder(path) && (!compoundCommandHasCd || isAbsolute(path) || path.startsWith("~"));
  let deniedValidation =
    mapped.find(
      (validation, idx) =>
        !validation.allowed &&
        validation.decisionReason?.type === "rule" &&
        isStaticallyResolvable(pathsToValidate[idx]),
    ) ??
    mapped_2.find(
      (validation, idx) =>
        !validation.allowed &&
        validation.decisionReason?.type === "rule" &&
        isStaticallyResolvable(attachedDestinations[idx]),
    ) ??
    mapped_3.find(
      (validation, idx) =>
        !validation.allowed &&
        validation.decisionReason?.type === "rule" &&
        isStaticallyResolvable(readSidePaths[idx]),
    );
  if (deniedValidation?.decisionReason !== undefined)
    return {
      behavior: "deny",
      message: formatDenyRuleBlockedMessage(
        commandName,
        operationType === "read" || mapped_3.includes(deniedValidation) ? "from" : "to",
        deniedValidation.resolvedPath,
      ),
      decisionReason: deniedValidation.decisionReason,
    };
  if (operationType !== "read" && pathsToValidate.some((path) => containsAnyPlaceholder(path)))
    return {
      behavior: "ask",
      message: `${commandName} target contains command-substitution or untracked-variable output \u2014 the path is runtime-determined and cannot be validated`,
      decisionReason: {
        type: "other",
        reason: `${commandName} path argument is runtime-determined`,
        bashMissKind: "shell-expansion",
      },
    };
  if (hasUnsafeArgs) {
    if (commandName === "cd") {
      if (isReadBlockEnforced) return outsideReadsRuntimePathAsk(commandName);
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
      message: `${commandName} with flags requires manual approval to ensure path safety. For security, Claude Code cannot automatically validate ${commandName} commands that use flags, as some flags like --target-directory=PATH can bypass path validation.`,
      decisionReason: {
        type: "other",
        reason: `${commandName} command with flags requires manual approval`,
        bashMissKind: "flag-validation",
      },
    };
  }
  if (
    compoundCommandHasCd &&
    operationType === "read" &&
    pathsToValidate.some((path) => !isAbsolute(expandTildeWithHome(path))) &&
    (isReadBlockEnforced || (commandName !== "cd" && isMainThread !== true && hasBashDenyRule(context)))
  ) {
    let denyResult = checkDenyRulesForPaths(commandName, pathsToValidate, cwd, context, operationType);
    if (denyResult) return denyResult;
    if (isReadBlockEnforced) return outsideReadsRuntimePathAsk(commandName);
    let paths = hasNoBashDenyRules(context);
    return {
      behavior: "ask",
      message: paths
        ? `${commandName} reads a relative path after cd. That can't be checked against this computer's keys and sign-in files first.`
        : `${commandName} reads a file by a relative path after a cd in a compound command; which file that is cannot be resolved statically while a Read() deny rule is configured, so this needs approval.`,
      decisionReason: {
        type: "other",
        reason: paths
          ? "A relative read after cd can't be checked against keys and sign-in files"
          : "Compound command contains cd with a relative file read while a Read() deny rule exists",
        bashMissKind: "cd-compound-read",
      },
    };
  }
  if (compoundCommandHasCd && operationType !== "read")
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
  let firstBlocked;
  let filtered = mapped.filter(
    (validation) => !validation.allowed && validation.decisionReason?.type === "safetyCheck",
  );
  let checkAllPaths =
    filtered.length === 0 ||
    (commandName === "cp" && filtered.at(-1) !== mapped.at(-1)) ||
    mapped.some((validation) => !validation.allowed && validation.decisionReason?.type === "rule");
  for (let { allowed, resolvedPath, decisionReason, isInWorkingDir } of checkAllPaths
    ? mapped
    : filtered.slice(0, 1))
    if (!allowed) {
      let workingDirs = Array.from(allWorkingDirectories(context));
      let dirListStr = formatDirectoryList(workingDirs);
      let isPlainWorkingDirPath = isInWorkingDir === true && decisionReason === undefined;
      let message =
        decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
          ? decisionReason.reason
          : isPlainWorkingDirPath
            ? formatInsideWorkingDirApproval(`${commandName} in '${resolvedPath}'`, dirListStr)
            : operationType !== "read" && decisionReason?.type !== "rule"
              ? formatOutsideWorkingDirApproval(`${commandName} in '${resolvedPath}'`, dirListStr)
              : `${commandName} in '${resolvedPath}' was blocked. For security, Claude Code may only ${ACTION_VERBS[commandName]} the allowed working directories for this session: ${dirListStr}.`;
      if (decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message,
          decisionReason,
        };
      let askResult = {
        behavior: "ask",
        message,
        blockedPath: resolvedPath,
        decisionReason,
        bashAllowRuleOverridable: isPlainWorkingDirPath,
      };
      if (isPlainWorkingDirPath) {
        firstBlocked ??= askResult;
        continue;
      }
      return askResult;
    }
  if (firstBlocked) return firstBlocked;
  return {
    behavior: "passthrough",
    message: `Path validation passed for ${commandName} command`,
  };
}
//@ chunk-e6aww6q8.js:1112301-1112882 fingerprint (2.1.88 match: createPathChecker, 1)
/**
 * 为某命令生成路径检查器：validateCommandPaths + rm/rmdir 危险删除检查；ask 时附建议（读：会话读规则；写：加会话目录，必要时切 acceptEdits）。
 */
function createPathChecker(command, operationTypeOverride) {
  return (args, cwd, context, compoundCommandHasCd, readOnlyAfterCd, astCommand) => {
    let result = validateCommandPaths(
      command,
      args,
      cwd,
      context,
      compoundCommandHasCd,
      operationTypeOverride,
      readOnlyAfterCd,
      astCommand,
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
function parseCommandArgs(command) {
  return getCommandArgv(command);
}
//@ chunk-e6aww6q8.js:1112911-1113249 fingerprint (2.1.88 match: validateSinglePathCommand, 1)
/**
 * 文本版：剥离包装后解析命令，若是路径受限命令则做路径检查（白名单内的 sed 视为读）。
 */
function validateSinglePathCommand(cmd, cwd, toolPermissionContext, compoundCommandHasCd, astCommand) {
  let strippedCmd = stripSafeWrappers(cmd);
  let extractedArgs = parseCommandArgs(strippedCmd);
  if (extractedArgs.length === 0)
    return {
      behavior: "passthrough",
      message: "Empty command - no paths to validate",
    };
  let [commandName, ...args] = extractedArgs;
  let baseCmd = normalizeCommandName(commandName);
  if (!baseCmd || !SUPPORTED_PATH_COMMANDS.includes(baseCmd))
    return {
      behavior: "passthrough",
      message: `Command '${baseCmd}' is not a path-restricted command`,
    };
  let operationTypeOverride =
    baseCmd === "sed" && sedCommandIsAllowedByAllowlist(strippedCmd) ? "read" : undefined;
  return createPathChecker(baseCmd, operationTypeOverride)(
    args,
    cwd,
    toolPermissionContext,
    compoundCommandHasCd,
    astCommand,
  );
}
//@ chunk-e6aww6q8.js:1113249-1113594 fingerprint (2.1.88 match: validateSinglePathCommandArgv, 1)
/**
 * AST 版：对 tree-sitter 解析出的简单命令做路径检查。
 */
function validateSinglePathCommandArgv(cmd, cwd, toolPermissionContext, compoundCommandHasCd, astCommand) {
  let argv = stripWrappersFromArgvForPaths(cmd.argv);
  if (argv.length === 0)
    return {
      behavior: "passthrough",
      message: "Empty command - no paths to validate",
    };
  let [commandName, ...args] = argv;
  let baseCmd = normalizeCommandName(commandName);
  if (!baseCmd || !SUPPORTED_PATH_COMMANDS.includes(baseCmd))
    return {
      behavior: "passthrough",
      message: `Command '${baseCmd}' is not a path-restricted command`,
    };
  let operationTypeOverride =
    baseCmd === "sed" && sedCommandIsAllowedByAllowlist(stripSafeWrappers(cmd.text)) ? "read" : undefined;
  return createPathChecker(baseCmd, operationTypeOverride)(
    args,
    cwd,
    toolPermissionContext,
    compoundCommandHasCd,
    astCommand,
    cmd,
  );
}
//@ chunk-e6aww6q8.js:1113594-1113838 layout
/**
 * 求 AST 命令读取的路径（路径提取 + 输入重定向），去掉占位符和特殊设备。
 */
function getReadPathsForAstCommand(astCommand) {
  let argv = stripWrappersFromArgvForPaths(astCommand.argv);
  let [commandName, ...args] = argv;
  let normalizedName = normalizeCommandName(commandName);
  let readPaths = [];
  if (normalizedName && SUPPORTED_PATH_COMMANDS.includes(normalizedName)) {
    let commandName = normalizedName;
    let extractedPaths = PATH_EXTRACTORS[commandName](args);
    readPaths.push(
      ...(COMMAND_OPERATION_TYPE[commandName] === "read"
        ? extractedPaths
        : getSourceArgsOfWriteCommand(commandName, extractedPaths)),
    );
    readPaths.push(...getGlobArgsNeedingCheck(commandName, astCommand, args, extractedPaths));
  }
  readPaths.push(...astRedirectsToOutputRedirections(astCommand.redirects).inputRedirections);
  return readPaths.filter((path) => !containsAnyPlaceholder(path) && !isSpecialDevicePath(path));
}
//@ chunk-e6aww6q8.js:1113838-1114900 layout
/**
 * 求 AST 命令会写入的路径：写命令的目标、cp/mv 落点、输出重定向目标，并标记是否可能写入看不到的位置（sort -o、uniq 第二参数、find -fprint、sed 写、cp/mv --backup 等）。供文件监视/编辑 diff 使用。
 */
function getWriteTargetsForAstCommand(simple) {
  let argv = stripWrappersFromArgvForPaths(simple.argv);
  let [commandName, ...args] = argv;
  let replaced = commandName?.replace(/^.*[\\/]/, "");
  let written = [];
  let landings = [];
  let copySources = [];
  let writesUnseen = false;
  let isKnownCommand =
    replaced !== undefined && replaced !== "git" && SUPPORTED_PATH_COMMANDS.includes(replaced);
  if (isKnownCommand) {
    let command = replaced;
    let extractedPaths = PATH_EXTRACTORS[command](args);
    let strippedText = command === "sed" ? stripSafeWrappers(simple.text) : "";
    if (COMMAND_OPERATION_TYPE[command] === "read")
      writesUnseen =
        (command === "sort" && args.some((arg) => /^-[A-Za-z]*o/.test(arg) || arg.startsWith("--o"))) ||
        (command === "uniq" && extractedPaths.length >= 2) ||
        (command === "find" && args.some((arg) => isFindDangerousAction(arg)));
    else if (command !== "sed" || !sedCommandIsAllowedByAllowlist(strippedText)) {
      writesUnseen =
        command === "sed" &&
        !sedCommandIsAllowedByAllowlist(strippedText, {
          allowFileWrites: true,
        });
      let { targetDirectoryGiven, attachedDestinations } = getTargetDirectoryOption(command, args);
      let lastIsDestination =
        (command === "cp" || command === "mv") && !targetDirectoryGiven && extractedPaths.length >= 2;
      if (lastIsDestination && command === "cp" && hasOnlyListOptions(args)) {
        copySources = extractedPaths.slice(0, -1);
        written.push(...extractedPaths.slice(-1));
      } else written.push(...extractedPaths);
      written.push(...attachedDestinations);
      if ((command === "cp" || command === "mv") && hasBackupSuffixOption(args)) writesUnseen = true;
      if (
        command === "cp" &&
        cpHasAmbiguousDestination(
          args,
          lastIsDestination ? extractedPaths.slice(0, -1) : targetDirectoryGiven ? extractedPaths : [],
        )
      )
        writesUnseen = true;
      let destinations = lastIsDestination
        ? extractedPaths.slice(-1)
        : targetDirectoryGiven
          ? [...extractedPaths, ...attachedDestinations]
          : [];
      for (let destination of destinations)
        for (let source of extractedPaths) {
          let baseName = basename(source);
          if (source !== destination && baseName !== "." && baseName !== "..")
            landings.push(`${destination.replace(/[\\/]+$/, "")}/${baseName}`);
        }
    }
  }
  for (let redirect of simple.redirects)
    if (
      OUTPUT_REDIRECT_OPS.has(redirect.op) &&
      !(redirect.op === ">&" && /^(?:\d+|-)$/.test(redirect.target))
    )
      written.push(redirect.target);
  return {
    known: isKnownCommand,
    written: uniq(written).filter((path) => !isSpecialDevicePath(path)),
    landings: uniq(landings),
    copySources: uniq(copySources),
    writesUnseen,
  };
}
//@ chunk-e6aww6q8.js:1114900-1115068 layout
function cpHasAmbiguousDestination(args, destinations) {
  return (
    destinations.some((destination) => {
      let baseName = basename(destination);
      return (
        baseName === "." || baseName === ".." || (getPlatform() === "macos" && /[\\/]$/.test(destination))
      );
    }) || args.some((arg) => arg.startsWith("--no-t") || /^-[^-]*T/.test(arg))
  );
}
//@ chunk-e6aww6q8.js:1115068-1115152 layout
function hasBackupSuffixOption(args) {
  return args.some((arg) => /^--(?:pa|b|su)/.test(arg) || /^-[^-]*[bS]/.test(arg));
}
//@ chunk-e6aww6q8.js:1115152-1115201 layout
var OUTPUT_REDIRECT_OPS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1115152", () => {
  OUTPUT_REDIRECT_OPS = new Set([">", ">|", "&>", ">>", "&>>", ">&"]);
});
//@ chunk-e6aww6q8.js:1115201-1115382 layout
function hasOnlyListOptions(args) {
  let sawPath = false;
  for (let arg of args) {
    if (arg === "--") return !sawPath;
    if (!arg.startsWith("-") || arg === "-") sawPath = true;
    else if (sawPath || (arg.startsWith("--") ? /^--[ls]/.test(arg) : /[ls]/.test(arg))) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:1115382-1115420 layout
var CASE_SENSITIVE_PATH_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1115382", () => {
  CASE_SENSITIVE_PATH_COMMANDS = new Set(["rm", "rmdir", "tee"]);
});
//@ chunk-e6aww6q8.js:1115420-1115564 layout
/**
 * 规范化命令名：rm/rmdir/tee 去掉目录前缀（tee 还去 .exe 并小写），其他保持原样。
 */
function normalizeCommandName(commandName) {
  if (!commandName) return commandName;
  let replaced = commandName.replace(/^.*[\\/]/, "");
  if (CASE_SENSITIVE_PATH_COMMANDS.has(replaced)) return replaced;
  return replaced.toLowerCase().replace(/\.exe$/, "") === "tee" ? "tee" : commandName;
}
//@ chunk-e6aww6q8.js:1115564-1117098 fingerprint (2.1.88 match: validateOutputRedirections, 0.822)
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
  let found = mapped.find((validation) => !validation.allowed && validation.decisionReason?.type === "rule");
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
  let softAsk;
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
      let askResult = {
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
      if (decisionReason?.type === "safetyCheck") return askResult;
      softAsk ??= askResult;
    }
  return (
    softAsk ?? {
      behavior: "passthrough",
      message: "No unsafe redirections found",
    }
  );
}
//@ chunk-e6aww6q8.js:1117098-1117225 sole-consumer
function isHardSafetyAsk(result) {
  return (
    result.behavior === "ask" &&
    result.decisionReason?.type === "safetyCheck" &&
    isBypassImmuneCircuitBreaker(result.decisionReason) &&
    !isClassifierRoutedCircuitBreaker(result.decisionReason)
  );
}
//@ chunk-e6aww6q8.js:1117528-1123341 fingerprint (2.1.88 match: checkPathConstraints, 0.338)
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
  sandboxDecision,
) {
  let processSubstitutionAsk =
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
  let astRedirectionInfo = astRedirects ? astRedirectsToOutputRedirections(astRedirects) : undefined;
  let { redirections, hasDangerousRedirection, dangerousRedirectionReason } =
    astRedirectionInfo ?? extractOutputRedirections(input.command);
  let inputRedirectionResult = validateInputRedirections(
    astRedirectionInfo?.inputRedirections ?? [],
    cwd,
    toolPermissionContext,
    compoundCommandHasCd,
  );
  if (inputRedirectionResult.behavior === "deny") return inputRedirectionResult;
  let commandResults = astCommands
    ? astCommands.map((astCommand) =>
        validateSinglePathCommandArgv(
          astCommand,
          cwd,
          toolPermissionContext,
          compoundCommandHasCd,
          sandboxDecision,
        ),
      )
    : splitCommand(input.command).map((subcommand) =>
        validateSinglePathCommand(
          subcommand,
          cwd,
          toolPermissionContext,
          compoundCommandHasCd,
          sandboxDecision,
        ),
      );
  let found = commandResults.find((result) => result.behavior === "deny");
  if (found !== undefined) return found;
  let found_2 = commandResults.find(
    (result) =>
      result.behavior === "ask" &&
      result.decisionReason?.type === "safetyCheck" &&
      isBypassImmuneCircuitBreaker(result.decisionReason),
  );
  if (processSubstitutionAsk !== undefined) return found_2 ?? processSubstitutionAsk;
  let dangerousRedirectAsk;
  if (hasDangerousRedirection) {
    let redirectAsk;
    let classifierRedirectAsk;
    let askResult;
    let alsoBreakers = [];
    let hasUnapprovable = false;
    for (let redirection of [
      ...(astRedirectionInfo?.denyCheckOutputRedirections ?? []),
      ...redirections,
    ].filter((redirection) => hasInteriorDotDot(redirection.target))) {
      let redirectionResult = validateOutputRedirections(
        [redirection],
        cwd,
        toolPermissionContext,
        compoundCommandHasCd,
      );
      if (redirectionResult.behavior === "deny") return redirectionResult;
      if (redirectionResult.behavior === "ask" && redirectionResult.decisionReason?.type === "safetyCheck") {
        let { circuitBreaker, also, classifierApprovable } = redirectionResult.decisionReason;
        askResult ??= redirectionResult;
        alsoBreakers.push(...(circuitBreaker !== undefined ? [circuitBreaker] : []), ...(also ?? []));
        hasUnapprovable ||= !classifierApprovable;
      }
    }
    if (astRedirectionInfo !== undefined) {
      let allRedirections = [...astRedirectionInfo.denyCheckOutputRedirections, ...redirections];
      for (let cmd of allRedirections)
        for (let candidate of getRedirectTargetCandidates(cmd.target, cwd)) {
          let chain = walkPermissionCheckPaths(candidate.path);
          let spellings = permissionCheckSpellings(chain);
          for (let spelling of spellings) {
            let denyRule = matchingRuleForInput(spelling, toolPermissionContext, "edit", "deny");
            if (denyRule !== null) {
              if (candidate.cwdIndependent || !compoundCommandHasCd)
                return {
                  behavior: "deny",
                  message: formatDenyRuleBlockedMessage("Output redirection", "to", spelling),
                  decisionReason: {
                    type: "rule",
                    rule: denyRule,
                  },
                };
            }
          }
          let result = checkEditableInternalPath(candidate.path, {}, spellings, {
            restricted: toolPermissionContext.restricted,
          });
          let isInternalDeny = result.behavior === "deny" && true;
          let denyMessage = isInternalDeny ? internalPathDenyWords(result.decisionReason) : undefined;
          let personOnlyTag = isInternalDeny ? hostPersonOnlyTag(result.decisionReason) : undefined;
          let pathSafety = checkPathSafetyForAutoEdit(candidate.path, spellings);
          let symlinkInfo = symlinkRedirect(chain, toolPermissionContext);
          let symlinkAsk;
          if (isInternalDeny) {
            symlinkAsk =
              symlinkInfo === null
                ? undefined
                : {
                    sentence: symlinkRedirectSentence(candidate.path, symlinkInfo),
                    personOnly:
                      symlinkInfo.carriedOut || !hardDeniedAsSpelled(candidate.path, toolPermissionContext),
                  };
            alsoBreakers.push("internalHardDeny", ...(personOnlyTag !== undefined ? [personOnlyTag] : []));
            if (personOnlyTag !== undefined || symlinkAsk?.personOnly === true) hasUnapprovable = true;
          }
          let unusedAsk =
            pathSafety.safe || symlinkInfo === null
              ? null
              : {
                  sentence: symlinkRedirectSentence(candidate.path, symlinkInfo),
                  personOnly:
                    symlinkInfo.carriedOut ||
                    checkPathSafetyForAutoEdit(candidate.path, [candidate.path]).safe,
                };
          let unusedValue =
            pathSafety.safe ||
            (pathSafety.classifierApprovable &&
              unusedAsk?.personOnly !== true &&
              symlinkAsk?.personOnly !== true);
          if (!pathSafety.safe) {
            alsoBreakers.push(
              ...(pathSafety.circuitBreaker !== undefined ? [pathSafety.circuitBreaker] : []),
              ...(pathSafety.also ?? []),
            );
            if (unusedAsk?.personOnly === true) hasUnapprovable = true;
          }
          if (
            redirectAsk === undefined ||
            (redirectAsk.decisionReason?.type === "safetyCheck" &&
              redirectAsk.decisionReason.classifierApprovable)
          ) {
            let circuitBreaker =
              redirectAsk?.decisionReason?.type === "safetyCheck"
                ? redirectAsk.decisionReason.circuitBreaker
                : undefined;
            if (
              !pathSafety.safe &&
              (redirectAsk === undefined ||
                !unusedValue ||
                (pathSafety.circuitBreaker !== undefined && circuitBreaker === undefined))
            ) {
              let symlinkAsk = denyMessage ?? pathSafety.message;
              let personOnlyAsk =
                unusedAsk === null
                  ? symlinkAsk
                  : `${symlinkAsk.endsWith(".") ? symlinkAsk : `${symlinkAsk}.`} ${unusedAsk.sentence}.`;
              redirectAsk = {
                behavior: "ask",
                message: personOnlyAsk,
                decisionReason: {
                  type: "safetyCheck",
                  reason: personOnlyAsk,
                  ...(toolPermissionContext.restricted
                    ? {
                        classifierApprovable: false,
                        circuitBreaker: "restrictedMode",
                      }
                    : {
                        classifierApprovable: unusedValue,
                        circuitBreaker: pathSafety.circuitBreaker ?? personOnlyTag,
                      }),
                },
              };
              continue;
            }
          }
          if (
            pathSafety.safe &&
            isInternalDeny &&
            (classifierRedirectAsk === undefined ||
              ((personOnlyTag !== undefined || symlinkAsk?.personOnly === true) &&
                classifierRedirectAsk.decisionReason?.type === "safetyCheck" &&
                classifierRedirectAsk.decisionReason.classifierApprovable))
          )
            classifierRedirectAsk = {
              behavior: "ask",
              message: denyMessage ?? result.message,
              decisionReason: internalDenyShellAskReason(
                result,
                toolPermissionContext.restricted,
                symlinkAsk,
              ),
            };
          if (pathSafety.safe && !isInternalDeny && symlinkInfo?.carriedOut === true) {
            hasUnapprovable = true;
            let symlinkMessage = symlinkRedirectSentence(candidate.path, symlinkInfo);
            let symlinkAsk = {
              behavior: "ask",
              message: symlinkMessage,
              decisionReason: {
                type: "safetyCheck",
                reason: symlinkMessage,
                classifierApprovable: false,
              },
            };
            if (redirectAsk === undefined) askResult ??= symlinkAsk;
            else if (
              redirectAsk.decisionReason?.type === "safetyCheck" &&
              redirectAsk.decisionReason.classifierApprovable
            )
              redirectAsk = symlinkAsk;
          }
        }
    }
    let mergeAsk = (askResult) => {
      if (askResult.behavior !== "ask" || askResult.decisionReason?.type !== "safetyCheck") return askResult;
      let decisionReason = askResult.decisionReason;
      let filtered = uniq([...(decisionReason.also ?? []), ...alsoBreakers]).filter(
        (breaker) => breaker !== decisionReason.circuitBreaker,
      );
      return {
        ...askResult,
        decisionReason: {
          ...decisionReason,
          classifierApprovable: decisionReason.classifierApprovable && !hasUnapprovable,
          ...(filtered.length > 0 && {
            also: filtered,
          }),
        },
      };
    };
    if (redirectAsk !== undefined) {
      let commands = mergeAsk(redirectAsk);
      return found_2 === undefined || isHardSafetyAsk(commands) ? commands : mergeAsk(found_2);
    }
    let dangerousMessage =
      dangerousRedirectionReason === "network_device"
        ? "Redirect involving /dev/tcp or /dev/udp opens a network connection"
        : dangerousRedirectionReason === "unc_path"
          ? "Redirect target is a Windows UNC path \u2014 opening it triggers an SMB connection"
          : "Shell expansion syntax in paths requires manual approval";
    let chosenAsk =
      askResult !== undefined
        ? mergeAsk(askResult)
        : classifierRedirectAsk !== undefined
          ? mergeAsk(classifierRedirectAsk)
          : {
              behavior: "ask",
              message: dangerousMessage,
              decisionReason: {
                type: "other",
                reason: dangerousMessage,
                bashMissKind:
                  dangerousRedirectionReason === "network_device" || dangerousRedirectionReason === "unc_path"
                    ? "net-redirect"
                    : "shell-expansion",
              },
            };
    if (toolPermissionContext.blockReadsOutsideWorkingDirectories !== true)
      return found_2 === undefined || isHardSafetyAsk(chosenAsk) ? chosenAsk : mergeAsk(found_2);
    dangerousRedirectAsk = chosenAsk;
  }
  let overridableAsk;
  function acceptAsk(result) {
    if (result.behavior === "deny") return result;
    if (result.behavior === "ask") {
      if (result.bashAllowRuleOverridable) {
        overridableAsk ??= result;
        return;
      }
      return result;
    }
    return;
  }
  let redirectResult = validateOutputRedirections(
    redirections,
    cwd,
    toolPermissionContext,
    compoundCommandHasCd,
  );
  let acceptedRedirect = acceptAsk(redirectResult);
  let redirectAsk;
  if (acceptedRedirect) {
    if (
      acceptedRedirect.behavior === "deny" ||
      toolPermissionContext.blockReadsOutsideWorkingDirectories !== true
    )
      return acceptedRedirect.behavior === "ask" &&
        found_2 !== undefined &&
        !isHardSafetyAsk(acceptedRedirect)
        ? mergeSafetyCheckAlso(found_2, acceptedRedirect)
        : acceptedRedirect;
    redirectAsk = acceptedRedirect;
  }
  let inputRedirectAsk;
  if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true && astRedirects)
    for (let cmd of astRedirects) {
      if (cmd.op !== "<") continue;
      if (containsAnyPlaceholder(cmd.target)) {
        inputRedirectAsk ??= outsideReadsRuntimePathAsk("input redirect");
        continue;
      }
      let validation = validatePath(cmd.target, cwd, toolPermissionContext, "read");
      if (!validation.allowed && validation.decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message: `Input redirection from '${validation.resolvedPath}' was blocked by a deny rule.`,
          decisionReason: validation.decisionReason,
        };
      if (!validation.allowed && isOutsideReadsBlockedAsk(validation.decisionReason)) {
        inputRedirectAsk ??= {
          behavior: "ask",
          message: validation.decisionReason.reason,
          decisionReason: validation.decisionReason,
        };
        continue;
      }
      if (
        shellPathSegments(cmd.target).some((segment) => urlPatternToRegex(segment)) ||
        globBeforeInteriorDotDot(cmd.target)
      ) {
        inputRedirectAsk ??= outsideReadsRuntimePathAsk("input redirect");
        continue;
      }
      if (validation.allowed) continue;
      inputRedirectAsk ??= outsideReadsRuntimePathAsk("input redirect");
    }
  let readBlockAsk;
  if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true) {
    let argvList = astCommands
      ? astCommands.map((astCommand) => astCommand.argv)
      : splitCommand(input.command).map((subcommand) => parseCommandArgs(subcommand));
    for (let argv of argvList) {
      let specialPathAsk =
        checkLinkSourcePaths(argv, cwd, toolPermissionContext) ??
        checkPushdEnvChdirPath(argv, cwd, toolPermissionContext);
      if (specialPathAsk?.behavior === "deny") return specialPathAsk;
      readBlockAsk ??= specialPathAsk;
    }
  }
  readBlockAsk ??= inputRedirectAsk;
  let isReadBlockOn = toolPermissionContext.blockReadsOutsideWorkingDirectories === true;
  let otherAsk;
  for (let result of commandResults) {
    let accepted = acceptAsk(result);
    if (!accepted) continue;
    if (accepted.behavior === "deny" || !isReadBlockOn) return accepted;
    if (isOutsideReadsBlockedAsk(accepted.decisionReason)) readBlockAsk ??= accepted;
    else otherAsk ??= accepted;
  }
  if (readBlockAsk) return readBlockAsk;
  if (found_2)
    return (
      [dangerousRedirectAsk, redirectAsk].find(
        (askCandidate) => askCandidate !== undefined && isHardSafetyAsk(askCandidate),
      ) ?? mergeSafetyCheckAlso(found_2, dangerousRedirectAsk ?? redirectAsk)
    );
  if (dangerousRedirectAsk) return dangerousRedirectAsk;
  if (redirectAsk) return redirectAsk;
  if (otherAsk) return otherAsk;
  if (inputRedirectionResult.behavior === "ask") return inputRedirectionResult;
  if (overridableAsk) return overridableAsk;
  return {
    behavior: "passthrough",
    message: "All path commands validated successfully",
  };
}
//@ chunk-e6aww6q8.js:1123341-1124615 layout
/**
 * 输入重定向（< file）检查：目标是通配或在 cd 之后时询问；命中 read deny 规则拒绝；否则按读路径校验。
 */
function validateInputRedirections(targets, cwd, toolPermissionContext, compoundCommandHasCd) {
  let softAsk;
  for (let target of targets) {
    if (isSpecialDevicePath(target)) continue;
    if (
      firstGlobCharIndex(target) !== -1 ||
      (compoundCommandHasCd && !isAbsolute(target) && !target.startsWith("~"))
    ) {
      for (let candidate of getRedirectTargetCandidates(target, cwd)) {
        if (!candidate.cwdIndependent && compoundCommandHasCd) continue;
        for (let spelling of getPathsForPermissionCheck(candidate.path)) {
          let denyRule = matchingRuleForInput(spelling, toolPermissionContext, "read", "deny");
          if (denyRule !== null)
            return {
              behavior: "deny",
              message: formatDenyRuleBlockedMessage("Input redirection", "from", spelling),
              decisionReason: {
                type: "rule",
                rule: denyRule,
              },
            };
        }
      }
      softAsk ??= {
        behavior: "ask",
        message: `Input redirection from '${target}' requires manual approval: the file it names depends on glob expansion or a directory change in the same command.`,
        blockedPath: target,
        decisionReason: {
          type: "other",
          reason: "Input redirection target is a glob or follows a cd - manual approval required",
          bashMissKind: "shell-expansion",
        },
      };
      continue;
    }
    let { allowed, resolvedPath, decisionReason } = validatePath(target, cwd, toolPermissionContext, "read");
    if (allowed) continue;
    if (decisionReason?.type === "rule")
      return {
        behavior: "deny",
        message: formatDenyRuleBlockedMessage("Input redirection", "from", resolvedPath),
        decisionReason,
      };
    let readRuleSuggestion = createReadRuleSuggestion(getDirectoryForPath(resolvedPath), "session");
    softAsk ??= {
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
    softAsk ?? {
      behavior: "passthrough",
      message: "No unsafe input redirections found",
    }
  );
}
//@ chunk-e6aww6q8.js:1124615-1124791 layout
/**
 * /dev/null、/dev/std*、/dev/tty、/dev/fd/N、/proc/self/fd/0-2 等特殊设备路径。
 */
function isSpecialDevicePath(path) {
  return (
    path === "/dev/null" ||
    path === "/dev/stdin" ||
    path === "/dev/stdout" ||
    path === "/dev/stderr" ||
    path === "/dev/tty" ||
    /^\/dev\/fd\/\d+$/.test(path) ||
    /^\/proc\/self\/fd\/[0-2]$/.test(path)
  );
}
//@ chunk-e6aww6q8.js:1124791-1124946 layout
function getRedirectTargetCandidates(target, cwd) {
  let result = [];
  let expanded = expandTildeWithHome(target);
  if (expanded !== target)
    result.push({
      path: expanded,
      cwdIndependent: true,
    });
  if (!target.startsWith("~"))
    result.push({
      path: resolve_2(cwd, target),
      cwdIndependent: isAbsolute(target),
    });
  return result;
}
//@ chunk-e6aww6q8.js:1124946-1125928 fingerprint (2.1.88 match: astRedirectsToOutputRedirections, 0.617)
/**
 * 把 AST 重定向列表拆成输出重定向、输入重定向、需做 deny 检查的重定向，并标记危险重定向。
 */
function astRedirectsToOutputRedirections(redirects) {
  let redirections = [];
  let inputRedirections = [];
  let denyCheckOutputRedirections = [];
  let hasDangerousRedirection = false;
  let dangerousRedirectionReason;
  for (let redirect of redirects) {
    if (/^\/dev\/(tcp|udp)\//.test(redirect.target)) {
      hasDangerousRedirection = true;
      dangerousRedirectionReason = "network_device";
      continue;
    }
    if (containsVulnerableUncPath(redirect.target.replace(/\\/g, "/"), true)) {
      hasDangerousRedirection = true;
      if (dangerousRedirectionReason !== "network_device") dangerousRedirectionReason = "unc_path";
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
      hasDangerousRedirection = true;
      if (dangerousRedirectionReason !== "network_device" && dangerousRedirectionReason !== "unc_path")
        dangerousRedirectionReason = "shell_expansion";
      denyCheckOutputRedirections.push({
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
        inputRedirections.push(redirect.target);
        break;
      case "<&":
        if (!/^(?:\d+|-)$/.test(redirect.target)) inputRedirections.push(redirect.target);
        break;
      case "<<":
      case "<<<":
        break;
    }
  }
  return {
    redirections,
    inputRedirections,
    hasDangerousRedirection,
    dangerousRedirectionReason,
    denyCheckOutputRedirections,
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
//@ chunk-e6aww6q8.js:1126404-1127358 fingerprint (2.1.88 match: stripWrappersFromArgv, 0.809)
/**
 * 剥离 time/nohup/timeout/nice/stdbuf/env/command 包装（含它们的选项），返回实际命令 argv。被 readOnlyValidation、沙箱读封锁等多处使用。
 */
function stripWrappersFromArgvForPaths(argv) {
  let remaining = argv;
  for (;;) {
    let replaced = remaining[0]?.replace(/^.*[\\/]/, "");
    let wrapperName =
      replaced === "time" ||
      replaced === "nohup" ||
      replaced === "timeout" ||
      replaced === "nice" ||
      replaced === "stdbuf" ||
      replaced === "env" ||
      replaced === "command"
        ? replaced
        : remaining[0];
    if (wrapperName === "time" || wrapperName === "nohup")
      remaining = remaining.slice(remaining[1] === "--" ? 2 : 1);
    else if (wrapperName === "timeout") {
      let i = skipTimeoutFlags(remaining);
      if (i < 0 || !remaining[i] || !/^\d+(?:\.\d+)?[smhd]?$/.test(remaining[i])) return remaining;
      remaining = remaining.slice(i + 1);
    } else if (wrapperName === "nice") {
      if (remaining[1] === "-n" && remaining[2] && /^-?\d+$/.test(remaining[2]))
        remaining = remaining.slice(remaining[3] === "--" ? 4 : 3);
      else if (remaining[1] && /^-\d+$/.test(remaining[1]))
        remaining = remaining.slice(remaining[2] === "--" ? 3 : 2);
      else remaining = remaining.slice(remaining[1] === "--" ? 2 : 1);
    } else if (wrapperName === "stdbuf") {
      let i = skipStdbufFlags(remaining);
      if (i < 0) return remaining;
      remaining = remaining.slice(i);
    } else if (wrapperName === "env") {
      let i = skipEnvFlags(remaining);
      if (i < 0) return remaining;
      remaining = remaining.slice(i);
    } else if (wrapperName === "command") {
      let startIdx = 1;
      while (remaining[startIdx] !== undefined && /^-p+$/.test(remaining[startIdx])) startIdx++;
      if (remaining[startIdx] === "--") startIdx++;
      if (startIdx >= remaining.length || remaining[startIdx].startsWith("-")) return remaining;
      remaining = remaining.slice(startIdx);
    } else if (remaining[0] === "builtin") {
      let startIdx = remaining[1] === "--" ? 2 : 1;
      if (startIdx >= remaining.length) return remaining;
      remaining = remaining.slice(startIdx);
    } else if (remaining[0] === "noglob") {
      if (remaining.length <= 1) return remaining;
      remaining = remaining.slice(1);
    } else return remaining;
  }
}
//@ chunk-e6aww6q8.js:1127358-1127430 affinity
function formatDenyRuleBlockedMessage(what, direction, ruleValue) {
  return `${what} ${direction} '${ruleValue}' was blocked by a deny rule.`;
}
//@ chunk-e6aww6q8.js:1127430-1127630 affinity
function formatInsideWorkingDirApproval(subject, dirListStr) {
  return `${subject} needs approval. The path is inside the working directories for this session (${dirListStr}), and Claude Code asks before a shell command creates, changes or removes files there.`;
}
//@ chunk-e6aww6q8.js:1127630-1127784 affinity
function formatOutsideWorkingDirApproval(subject, dirListStr) {
  return `${subject} needs approval. The path is outside the working directories for this session (${dirListStr}). Allowing runs the command as written.`;
}
//@ chunk-e6aww6q8.js:1153141-1153309 sole-consumer
function isPathOrAncestorMatched(path, dir) {
  if (isPathMatchedForPermission(path, dir)) return true;
  for (let idx = 1; idx < path.length; idx++) {
    let char = path[idx];
    let previousChar = path[idx - 1];
    if ((char === "/" || char === sep) && previousChar !== "/" && previousChar !== sep) {
      if (isPathMatchedForPermission(path.slice(0, idx), dir)) return true;
    }
  }
  return false;
}
//@ chunk-e6aww6q8.js:1153309-1153579 placement (2.1.88 match: setCwdState, 1)
function isCaseVariantInsideCwd(path, dir) {
  let lower = path.toLowerCase();
  if (lower === dir.toLowerCase()) return true;
  let fsImplementation = getFsImplementation();
  let normalized = (
    resolveDeepestExistingAncestorSync(fsImplementation, getOriginalCwd()) ?? getOriginalCwd()
  ).normalize("NFC");
  let relativePath = relative(normalized, dir);
  if (relativePath === ".." || relativePath.startsWith(".." + sep) || isAbsolute(relativePath)) return false;
  let ancestor = dir;
  for (;;) {
    if (ancestor.toLowerCase() === lower) return true;
    if (ancestor === normalized || ancestor === dirname(ancestor)) return false;
    ancestor = dirname(ancestor);
  }
}
//@ chunk-e6aww6q8.js:1153579-1154977 placement
/**
 * 从 mkdir/touch 等命令中提取写入目标路径。
 */
function extractWriteTargets(commands, cwd) {
  for (let command of commands) {
    if (!command) continue;
    for (let redirect of command.redirects) {
      if (INPUT_REDIRECT_OPS_2.has(redirect.op)) continue;
      if (containsAnyPlaceholder(redirect.target)) return true;
      if (isPathMatchedForPermission(redirect.target, cwd)) return true;
    }
    let argv = stripWrappersFromArgvForPaths(command.argv);
    if (argv[0] !== undefined && containsAnyPlaceholder(argv[0])) return true;
    let commandName = normalizeCommandName(argv[0]);
    if (!commandName || !Object.hasOwn(COMMAND_OPERATION_TYPE, commandName)) continue;
    let operationType = COMMAND_OPERATION_TYPE[commandName];
    if (
      (operationType !== "write" && operationType !== "create") ||
      NON_CREATING_WRITE_COMMANDS.has(commandName)
    )
      continue;
    let targets = PATH_EXTRACTORS[commandName](argv.slice(1));
    let isMkdirParents =
      commandName === "mkdir" &&
      argv
        .slice(1)
        .some((arg) => /^-[^-]*p/.test(arg) || (arg.startsWith("--p") && "--parents".startsWith(arg)));
    for (let target of targets) {
      if (containsAnyPlaceholder(target)) return true;
      if (isMkdirParents ? isPathOrAncestorMatched(target, cwd) : isPathMatchedForPermission(target, cwd))
        return true;
    }
    if ((commandName === "cp" || commandName === "mv") && targets.length >= 1) {
      let sliced = argv.slice(1);
      let any = sliced.some((arg) => {
        if (/^-[^-]*t/.test(arg)) return true;
        let index = arg.indexOf("=");
        let optionName = index >= 0 ? arg.slice(0, index) : arg;
        return optionName.startsWith("--t") && "--target-directory".startsWith(optionName);
      });
      let any_2 = sliced.some(
        (arg) => /^-[^-]*T/.test(arg) || (arg.startsWith("--n") && "--no-target-directory".startsWith(arg)),
      );
      let landsInCwd = false;
      if (!any && targets.length >= 2) {
        let last = targets.at(-1);
        let destinationCandidates = [last];
        if (last.startsWith("~")) {
          let expanded = expandTildeWithHome(last);
          if (expanded.startsWith("~")) landsInCwd = true;
          else destinationCandidates.push(expanded);
        }
        if (!landsInCwd) {
          let fsImpl = getFsImplementation();
          let dir = (resolveDeepestExistingAncestorSync(fsImpl, cwd) ?? cwd).normalize("NFC");
          for (let candidate of destinationCandidates) {
            let resolved = resolve_2(cwd, candidate);
            let path = resolveForPermissionCheck(fsImpl, resolved).normalize("NFC");
            if (isCaseVariantInsideCwd(path, dir)) {
              landsInCwd = true;
              break;
            }
          }
        }
      }
      if (any || landsInCwd) {
        let sourcePaths = any ? targets : targets.slice(0, -1);
        if (any_2) return true;
        for (let sourcePath of sourcePaths) {
          if (firstGlobCharIndex(sourcePath) !== -1 || containsAnyPlaceholder(sourcePath)) return true;
          let baseName = basename(sourcePath);
          if (baseName === "." || baseName === "..") return true;
          if (sourcePath.startsWith("~")) {
            let expandedSource = expandTildeWithHome(sourcePath);
            if (expandedSource.startsWith("~")) return true;
            if (
              getPathsForPermissionCheck_2(basename(expandedSource), cwd) ||
              getPathsForPermissionCheck_2(baseName, cwd)
            )
              return true;
          } else if (getPathsForPermissionCheck_2(baseName, cwd)) return true;
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
var INPUT_REDIRECT_OPS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1154977", () => {
  INPUT_REDIRECT_OPS = new Set(["<", "<<", "<&", "<<<"]);
});
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
