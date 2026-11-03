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
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
  normalize as normalize_4,
  normalize as normalize_5,
  normalize as normalize_6,
  normalize as normalize_7,
  normalize as normalize_8,
  normalize as normalize_9,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  posix,
  posix as posix_2,
  posix as posix_3,
  posix as posix_4,
  posix as posix_5,
  posix as posix_6,
  posix as posix_7,
  posix as posix_8,
  posix as posix_9,
  posix as posix_10,
  posix as posix_11,
  posix as posix_12,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
  homedir as homedir_8,
  homedir as homedir_9,
  homedir as homedir_10,
  homedir as homedir_11,
  homedir as homedir_12,
} from "os";
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
  Z7,
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
  INPUT_REDIRECT_OPS,
} from "../../utils/bash/ast.js";
import { TRACKED_VAR_TOP_LEVEL_RE, mye, S2t } from "./expansionAnalysis.js";
import { Lu } from "../../utils/networkPaths.js";
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
import { Qn } from "../../utils/pathClassification.js";
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

/**
 * rm/rmdir 危险目标检查：可能为空的变量 + 顶层目录名、反斜杠根、cd 后的相对通配、无法静态解析的通配目标、关键系统目录、工作目录及其祖先、挂载盘根（CLAUDE_CODE_DISABLE_MOUNTED_DRIVE_RM_PROMPT 可关）、跨多层的通配；命中返回不可被规则自动允许的 ask。
 */
//@ chunk-e6aww6q8.js:1070212-1074425 fingerprint = checkDangerousRemovalPaths (0.381)
function checkDangerousRemovalPaths(command, args, cwd, toolPermissionContext, cdBeforeRemoval) {
  let extractor = PATH_EXTRACTORS[command],
    paths = extractor(args),
    { resolvedPath: resolvedPath } = safeResolvePath(getFsImplementation(), cwd),
    L = resolvedPath === cwd ? [cwd] : [cwd, resolvedPath],
    G = uniq(
      [...L, ...(toolPermissionContext ? allWorkingDirectories(toolPermissionContext) : [])].flatMap((we) => {
        let { resolvedPath: resolvedPath } = safeResolvePath(getFsImplementation(), we);
        return resolvedPath === we ? [we] : [we, resolvedPath];
      }),
    ),
    q = Z7(),
    any = (args.includes("--") ? args.slice(0, args.indexOf("--")) : args).some(
      (we) =>
        /^--r|^-[a-zA-Z]*[rR]/.test(we) ||
        (!we.includes("/") &&
          (we.includes("__CMDSUB__") || containsAnyPlaceholder(we)) &&
          /^(?:-|__(?:CMDSUB(?:_OUTPUT)?|TRACKED_VAR)__)/.test(we)),
    ),
    ke;
  for (let path of paths) {
    if (q) {
      let ze = TRACKED_VAR_TOP_LEVEL_RE.exec(path)?.[1];
      if (ze !== void 0) {
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
    let Ee = Lu(path),
      Ae = isAbsolute_22(Ee) ? Ee : resolve_19(cwd, Ee),
      Ie = Ae;
    for (let ze = ""; ze !== Ie;) {
      ze = Ie;
      let lt = Ie.replace(/([\\/]\*+)+[\\/]*$/, "") || "/";
      if (lt !== Ie) Ie = /[\\/]/.test(lt) ? normalize_3(lt) : lt;
    }
    let Me = Ie !== Ae;
    if (cdBeforeRemoval && Me && !isAbsolute_22(Ee) && /[\\/]\*$/.test(Ae))
      return dangerousRemovalAsk(
        command,
        `Dangerous ${command} operation detected: '${Ae}'

This command changes directories before the removal, so the relative glob target cannot be statically resolved. This requires explicit approval and cannot be auto-allowed by permission rules.`,
        `on statically-unresolvable target: ${Ae}`,
      );
    let We = Ie;
    if (!isAbsolute_22(Ee)) {
      let ze = /[\\/]$/.test(cwd) ? cwd : cwd + sep_29;
      if (Ie.startsWith(ze)) We = Ie.slice(ze.length);
      else if (Ie === cwd) We = "";
    }
    if (
      Me &&
      (hasInteriorDotDot(Ee) ||
        containsAnyPlaceholder(Ae) ||
        Ee.startsWith("~") ||
        Qn(Ee) ||
        (!isAbsolute_22(Ee) && /(^|[\\/])\.\.([\\/]|$)/.test(Ee) && /[\\/]\*$/.test(Ae)) ||
        (command === "rmdir" &&
          /[\\/]\*$/.test(Ae) &&
          args.some((ze) => /^--p/.test(ze) || /^-[a-z]*p/.test(ze))) ||
        (!isAbsolute_22(Ee) && /\*[\\/]+$/.test(Ee) && /[\\/]\*$/.test(Ae)))
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
        let { resolvedPath: resolvedPath } = safeResolvePath(getFsImplementation(), Ie);
        if (resolvedPath !== Ie) ze.push(resolvedPath);
      }
      for (let lt of ze) {
        if (mye(lt))
          return dangerousRemovalAsk(
            command,
            `Dangerous ${command} operation detected: '${Ae}'

This command would remove a critical system directory. This requires explicit approval and cannot be auto-allowed by permission rules.`,
            `on critical path: ${Ae}`,
          );
        let Je = Me ? G : L;
        if (S2t(lt, (nt) => Je.some((pt) => pathInWorkingPath(pt, nt))))
          return dangerousRemovalAsk(
            command,
            `Dangerous ${command} operation detected: '${Ae}'

This command would remove a workspace directory (the working directory, an additional working directory, or one of their parent directories). This requires explicit approval and cannot be auto-allowed by permission rules.`,
            `on working directory or its ancestor: ${Ae}`,
          );
      }
      if (
        ke === void 0 &&
        q &&
        !env.CLAUDE_CODE_DISABLE_MOUNTED_DRIVE_RM_PROMPT &&
        command === "rm" &&
        (any || Me) &&
        ze.some((lt) => {
          let replaced = posix_6.normalize(lt).replace(/(.)\/$/, "$1");
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
          count(Ie.split(/[\\/]+/), (Je) => Je && Je !== "."),
        lt = count(We.split(/[\\/]+/), (Je) => /[*?[]/.test(Je));
      if (ze + lt > 1)
        return dangerousRemovalAsk(
          command,
          `Dangerous ${command} operation detected: '${Ae}'

This command's glob pattern traverses directories that cannot be statically enumerated. This requires explicit approval and cannot be auto-allowed by permission rules.`,
          `on statically-unresolvable target: ${Ae}`,
        );
    }
  }
  return ke ?? { behavior: "passthrough", message: `No dangerous removals detected for ${command} command` };
}
/**
 * 去掉 argv 中的选项，返回从第一个位置参数（或 -- 之后）开始的参数。
 */
//@ chunk-e6aww6q8.js:1090073-1090223 file-local
function filterOutFlags(args) {
  let result = [],
    r = !1,
    s = !1;
  for (let arg of args)
    if (r || s) result.push(arg);
    else if (arg === "--") r = !0;
    else if (arg === "-" || !arg?.startsWith("-")) (result.push(arg), (s = !0));
  return result;
}
/**
 * 按命令的选项规格（布尔/带值/粘连，长短）生成路径提取器：跳过选项及其值，遇到未知选项后不再跳选项。
 */
//@ chunk-e6aww6q8.js:1090223-1090994 layout
function makeFlagAwarePathExtractor(e) {
  let n = (r) => {
    if (r.startsWith("--")) {
      if (r.includes("=")) return "attached";
      if (e.booleanLong.has(r)) return "boolean";
      if (e.attachedLong?.has(r)) return "attached";
      return e.valuedLong.has(r) ? "valued" : "unknown";
    }
    if (/^-\d+$/.test(r)) return "attached";
    for (let s = 1; s < r.length; s++) {
      let h = r[s];
      if (e.booleanShort.includes(h)) continue;
      if (e.attachedShort?.includes(h)) return "attached";
      if (!e.valuedShort.includes(h)) return "unknown";
      return s === r.length - 1 ? "valued" : "attached";
    }
    return "boolean";
  };
  return (r) => {
    let s = [],
      h = !1,
      y = !1,
      S = !0;
    for (let w = 0; w < r.length; w++) {
      let L = r[w];
      if (L === void 0 || L === null) continue;
      if (h || y) s.push(L);
      else if (L === "--") h = !0;
      else if (L !== "-" && L.startsWith("-")) {
        if (!S) continue;
        let G = n(L);
        if (G === "valued") w++;
        else if (G === "unknown") S = !1;
      } else (s.push(L), (y = !0));
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
/**
 * grep 类命令的路径提取：第一个位置参数是模式（有 -e/-f 时不是），-f/--file/--exclude-from 等的值也算路径；无路径时返回默认值。
 */
//@ chunk-e6aww6q8.js:1091114-1091981 fingerprint = parsePatternCommand (0.526)
function parsePatternCommand(args, flagsWithArgs, defaults = []) {
  let paths = [],
    h = !1,
    y = !1,
    S = !1;
  for (let w = 0; w < args.length; w++) {
    let L = args[w];
    if (L === void 0 || L === null) continue;
    if (!y && !S && L === "--") {
      y = !0;
      continue;
    }
    if (!y && !S && L !== "-" && L.startsWith("-")) {
      let index = L.indexOf("="),
        q = index >= 0 ? L.slice(0, index) : L;
      if (["-e", "--regexp", "-f", "--file"].includes(q)) {
        if (((h = !0), q === "-f" || q === "--file")) {
          let Z = index >= 0 ? L.slice(index + 1) : args[w + 1];
          if (Z) paths.push(Z);
        }
      }
      if (/^-[a-zA-Z]*f$/.test(q) && q !== "-f" && index < 0 && args[w + 1] !== void 0) {
        ((h = !0), paths.push(args[w + 1]), w++);
        continue;
      }
      if (["--exclude-from", "--include-from", "--ignore-file"].includes(q)) {
        let Z = index >= 0 ? L.slice(index + 1) : args[w + 1];
        if (Z) paths.push(Z);
        if (index < 0) w++;
        continue;
      }
      if (index < 0) {
        let Z = getAttachedFlagValue(L, ["-f", "--file"]);
        if (Z !== void 0) {
          ((h = !0), paths.push(Z));
          continue;
        }
        if (L.length > 2 && L.startsWith("-e")) {
          h = !0;
          continue;
        }
      }
      if (flagsWithArgs.has(q) && index < 0) w++;
      continue;
    }
    if (S && !y) {
      let G = getAttachedFlagValue(L, ["-f", "--file"]);
      if (G !== void 0) paths.push(G);
    }
    if (((S = !0), !h)) {
      h = !0;
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
/**
 * grep/egrep/fgrep 路径提取（-r 无路径时为 "."）；uye 是 awk 系的路径提取（-f/-E 的程序文件也算路径）。
 */
//@ chunk-e6aww6q8.js:1092205-1093136 layout
var extractGrepPaths = (e) => {
    let r = parsePatternCommand(
      e,
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
    if (r.length === 0 && e.some((s) => ["-r", "-R", "--recursive"].includes(s))) return ["."];
    return r;
  },
  extractAwkPaths = (e) => {
    let n = new Set(["-F", "--field-separator", "-v", "--assign", "-e", "--source"]),
      r = new Set(["-f", "--file", "-E", "--exec"]),
      s = [],
      h = !1,
      y = !1,
      S = !1;
    for (let w = 0; w < e.length; w++) {
      let L = e[w];
      if (L === void 0 || L === null) continue;
      if (!h && !S && L === "--") {
        h = !0;
        continue;
      }
      if (!h && !S && L !== "-" && L.startsWith("-")) {
        let index = L.indexOf("="),
          q = index >= 0 ? L.slice(0, index) : L;
        if (n.has(q)) {
          if (q === "-e" || q === "--source") y = !0;
          if (index < 0) w++;
          continue;
        }
        if (r.has(q)) {
          if (((y = !0), index >= 0)) s.push(L.slice(index + 1));
          else {
            let Z = e[w + 1];
            if (Z !== void 0) (s.push(Z), w++);
          }
          continue;
        }
        continue;
      }
      if (S && !h) {
        let G = getAttachedFlagValue(L, ["-f", "--file", "-E", "--exec"]);
        if (G !== void 0) s.push(G);
      }
      if (((S = !0), !y)) {
        y = !0;
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
/**
 * 每个路径受限命令的路径提取器表 PATH_EXTRACTORS（cd/ls/find/rm/cp/cat/grep/rg/sed/jq/git…），以及 git 全局带值选项、rg 带值选项表。
 */
//@ chunk-e6aww6q8.js:1093201-1099428 fingerprint = PATH_EXTRACTORS (0.427)
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
  ]),
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
  ]),
  PATH_EXTRACTORS = {
    cd: (e) => {
      let n = filterOutFlags(e);
      if (n.length === 0) return e.at(-1) === "-" ? ["-"] : [homedir_4()];
      return [n[0]];
    },
    ls: (e) => {
      let n = filterOutFlags(e);
      return n.length > 0 ? n : ["."];
    },
    find: (e) => {
      let n = [],
        r = new Set([
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
        ]),
        s = /^-newer[acmBt][acmtB]$/,
        h = !1,
        y = !1;
      for (let S = 0; S < e.length; S++) {
        let w = e[S];
        if (!w) continue;
        if (y) {
          n.push(w);
          continue;
        }
        if (w === "--") {
          y = !0;
          continue;
        }
        if (w.startsWith("-")) {
          if (["-H", "-L", "-P"].includes(w)) continue;
          if (((h = !0), r.has(w) || s.test(w))) {
            let L = e[S + 1];
            if (L) (n.push(L), S++);
          }
          continue;
        }
        if (!h) n.push(w);
      }
      return n.length > 0 ? n : ["."];
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
    tr: (e) => {
      let any = e.some((s) => s === "-d" || s === "--delete" || (s.startsWith("-") && s.includes("d")));
      return filterOutFlags(e).slice(any ? 1 : 2);
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
        let search = r.search(/[\\/~]/);
        return (
          !r.startsWith("-")
            ? [r]
            : uniq([
                ...(r.includes("=") ? [r.slice(r.indexOf("=") + 1)] : []),
                ...(r.length > 2 && !r.startsWith("--") ? [r.slice(2)] : []),
                ...(search > 0 ? [r.slice(search)] : []),
              ])
        ).filter((S) => S !== "" && (any || /[\\/]/.test(S) || S.startsWith("~") || S.startsWith(".")));
      });
    },
    rg: (e) =>
      parsePatternCommand(
        e,
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
    sed: (e) => {
      let n = [],
        r = !1,
        s = !1,
        h = !1,
        y = !1;
      for (let S = 0; S < e.length; S++) {
        if (r) {
          r = !1;
          continue;
        }
        let w = e[S];
        if (!w) continue;
        if (!h && !y && w === "--") {
          h = !0;
          continue;
        }
        if (!h && !y && w !== "-" && w.startsWith("-")) {
          if (["-f", "--file"].includes(w)) {
            let L = e[S + 1];
            if (L) (n.push(L), (r = !0));
            s = !0;
          } else if (["-e", "--expression"].includes(w)) ((r = !0), (s = !0));
          else if (w.includes("e") || w.includes("f")) s = !0;
          continue;
        }
        if (((y = !0), !s)) {
          s = !0;
          continue;
        }
        n.push(w);
      }
      return n;
    },
    jq: (e) => {
      let n = [],
        r = new Set([
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
        ]),
        s = !1,
        h = !1;
      for (let y = 0; y < e.length; y++) {
        let S = e[y];
        if (S === void 0 || S === null) continue;
        if (!h && S === "--") {
          h = !0;
          continue;
        }
        if (!h && S.startsWith("-")) {
          let index = S.indexOf("="),
            L = index >= 0 ? S.slice(0, index) : S;
          if (["-e", "--expression"].includes(L)) s = !0;
          if (["-f", "--from-file"].includes(L)) {
            if (((s = !0), index >= 0)) n.push(S.slice(index + 1));
            else {
              let G = e[y + 1];
              if (G !== void 0) (n.push(G), y++);
            }
            continue;
          }
          if (["--slurpfile", "--rawfile"].includes(L)) {
            let G = e[y + 2];
            if (G !== void 0) n.push(G);
            y += 2;
            continue;
          }
          if (r.has(L) && index < 0) y++;
          continue;
        }
        if (!s) {
          s = !0;
          continue;
        }
        n.push(S);
      }
      return n;
    },
    git: (e) => {
      let n = "",
        r = (G) => {
          n = isAbsolute_22(Lu(G)) || G.startsWith("~") ? G : joinPathSegment(n, G);
        },
        { index: index, options: options } = parseLeadingGitOptions(e);
      for (let { opt: opt, value: q } of options)
        if (opt.startsWith("--work-tree=")) r(opt.slice(12));
        else if (q !== void 0 && (opt === "-C" || opt === "--work-tree")) r(q);
      let y = (G) => (n === "" || isAbsolute_22(Lu(G)) || G.startsWith("~") ? G : joinPathSegment(n, G)),
        sliced = e.slice(index + 1);
      if (e[index] === "grep") {
        let G = parsePatternCommand(sliced, RG_FLAGS_WITH_VALUE);
        return G.length > 0 ? G.map(y) : [n === "" ? "." : n];
      }
      if (e[index] !== "diff") return [];
      let w = [],
        L = !1;
      for (let G of sliced)
        if (!L && G === "--") L = !0;
        else if (L || G === "-" || !G.startsWith("-")) {
          let q = y(G);
          if (!isSpecialDevicePath(q)) w.push(q);
        }
      return w;
    },
  };
/**
 * 路径受限命令列表、每个命令的动作描述（用于提示文字）和操作类型（read/write/create），以及 mv/cp/cd 的参数安全检查。
 */
//@ chunk-e6aww6q8.js:1099428-1102123 fingerprint = ACTION_VERBS (0.822)
var SUPPORTED_PATH_COMMANDS = Object.keys(PATH_EXTRACTORS),
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
  },
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
  },
  COMMAND_ARGS_SAFE_CHECKS = {
    mv: (e) => !e.some((n) => n?.startsWith("-")),
    cp: (e) => !e.some((n) => n?.startsWith("-")),
    cd: (e) => {
      let n = !1,
        r = 0;
      for (let s of e) {
        if (!n) {
          if (s === "--") {
            n = !0;
            continue;
          }
          if (s.startsWith("-") && s !== "-") continue;
          n = !0;
        }
        r++;
      }
      return r <= 1;
    },
  };
/**
 * pushd 或 env -C/--chdir 的目标目录读权限检查：命中拒绝规则→deny；读封锁（blockReadsOutsideWorkingDirectories）下工作目录外→ask；其余通过。
 */
//@ chunk-e6aww6q8.js:1102123-1103108 layout
function checkPushdEnvChdirPath(e, n, r) {
  let s = e[0];
  if (s === void 0) return;
  let sliced = s.slice(s.lastIndexOf("/") + 1),
    y;
  if (sliced === "pushd") {
    if (((y = filterOutFlags(e.slice(1))[0]), y === void 0)) return;
  } else if (sliced === "env") {
    for (let w = 1; w < e.length; w++) {
      let L = e[w];
      if (L === "-C" || L === "--chdir") {
        y = e[w + 1];
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
    if (y === void 0) return;
  } else return;
  if (containsAnyPlaceholder(y)) return outsideReadsRuntimePathAsk(sliced);
  let S = validatePath(y, n, r, "read");
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
/**
 * ln/link 源路径的读权限检查，规则同 pushd/env：拒绝规则→deny，读封锁下工作目录外→ask。
 */
//@ chunk-e6aww6q8.js:1103108-1103912 layout
function checkLinkSourcePaths(e, n, r) {
  let s = stripWrappersFromArgvForPaths([...e]),
    h = s[0],
    y = h?.slice(h.lastIndexOf("/") + 1);
  if (y !== "ln" && y !== "link") return;
  let sliced = s.slice(1),
    w = filterOutFlags(sliced),
    G = w.length !== sliced.length || w.length === 1 ? w : w.slice(0, -1);
  if (G.some((q) => containsAnyPlaceholder(q))) return outsideReadsRuntimePathAsk(y);
  for (let q of G) {
    let Z = validatePath(q, n, r, "read");
    if (Z.allowed) continue;
    if (Z.decisionReason?.type === "rule")
      return {
        behavior: "deny",
        message: `${y} in '${Z.resolvedPath}' was blocked by a deny rule`,
        decisionReason: Z.decisionReason,
      };
    if (
      Z.decisionReason?.type === "safetyCheck" &&
      Z.decisionReason.reason === OUTSIDE_READS_BLOCKED_DENY_REASON
    )
      return {
        behavior: "ask",
        message: `${y} names a path outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`,
        decisionReason: Z.decisionReason,
      };
    return outsideReadsRuntimePathAsk(y);
  }
  return;
}
//@ chunk-e6aww6q8.js:1103912-1104143 layout
function findBracketExpressionEnd(e) {
  let n = e[1] === "!" || e[1] === "^" ? 2 : 1;
  if (e[n] === "]") n++;
  for (; n < e.length; n++) {
    let r = e[n];
    if (r === "]") return n;
    if (r === "[" && /^[:=.]/.test(e.slice(n + 1))) {
      let s = e[n + 1],
        index = e.indexOf(s + "]", n + 2);
      if (index !== -1) n = index + 1;
    }
  }
  return e.length - 1;
}
//@ chunk-e6aww6q8.js:1104143-1104811 layout = urlPatternToRegex (1)
function urlPatternToRegex(pattern) {
  if (firstGlobCharIndex(pattern) === -1) return !1;
  if (pattern.startsWith("[")) {
    let sliced = pattern.slice(findBracketExpressionEnd(pattern) + 1);
    if (firstGlobCharIndex(sliced) === -1 && sliced !== ".") return !1;
  }
  if (/\[[:=.]/.test(pattern)) return !0;
  if (pattern.startsWith("*") || pattern.startsWith("?")) return !1;
  let n = "^";
  for (let r = 0; r < pattern.length; r++) {
    let s = pattern[r];
    if (s === "*") n += ".*";
    else if (s === "?") n += ".";
    else if (s === "[") {
      let h = pattern[r + 1] === "!" || pattern[r + 1] === "^",
        index = pattern.indexOf("]", r + (h ? 3 : 2));
      if (index === -1) {
        n += "\\[";
        continue;
      }
      if (r > 0 && (h || pattern.indexOf("]", index + 1) !== -1)) {
        n += ".*";
        break;
      }
      let sliced = pattern.slice(r + 1, index);
      if (sliced.startsWith("!") || sliced.startsWith("^")) sliced = "^" + sliced.slice(1);
      ((n += "[" + sliced.replace(/[\\\]]/g, "\\$&") + "]"), (r = index));
    } else n += s.replace(/[.+^$()|{}\\]/g, "\\$&");
  }
  n += "$";
  try {
    return new RegExp(n).test("..");
  } catch {
    return !0;
  }
}
/**
 * 只检查拒绝规则的路径校验：写路径按操作类型、额外读路径按 read，命中拒绝规则即返回 deny。
 */
//@ chunk-e6aww6q8.js:1104811-1105100 layout
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
/**
 * 任一来源存在 Bash(...) 拒绝规则。
 */
//@ chunk-e6aww6q8.js:1105200-1105285 layout
function hasBashDenyRule(e) {
  return Object.values(e.alwaysDenyRules).some((n) => (n ?? []).some(isBashToolRule));
}
/**
 * 除 hostCredential 外，没有任何 Bash(...) 拒绝规则。
 */
//@ chunk-e6aww6q8.js:1105285-1105399 layout
function hasNoBashDenyRules(e) {
  return Object.entries(e.alwaysDenyRules).every(
    ([n, r]) => n === "hostCredential" || !(r ?? []).some(isBashToolRule),
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
/**
 * 解析 git 子命令前的全局选项（-C、--git-dir 等带值选项），返回子命令下标与选项列表。
 */
//@ chunk-e6aww6q8.js:1105644-1105832 layout
function parseLeadingGitOptions(e) {
  let n = [],
    r = 0;
  while (r < e.length && e[r].startsWith("-")) {
    let s = e[r];
    if ((r++, GIT_GLOBAL_FLAGS_WITH_VALUE.has(s) && r < e.length)) (n.push({ opt: s, value: e[r] }), r++);
    else n.push({ opt: s });
  }
  return { index: r, options: n };
}
/**
 * 找出需要额外做读检查的 glob 参数：无危险选项、无改变路径解析环境变量的普通 git 调用直接返回 []；否则返回未加引号、含通配且未在路径列表中的参数。
 */
//@ chunk-e6aww6q8.js:1105832-1106720 layout
function getGlobArgsNeedingCheck(e, n, r, s) {
  if (
    e === "git" &&
    n !== void 0 &&
    !n.argv.slice(0, n.argv.length - r.length - 1).some((w) => /(^|[\\/])env$/.test(w)) &&
    !n.envVars.some((envVar) => GIT_PATH_ENV_RE.test(envVar.name))
  ) {
    let { index: index, options: options } = parseLeadingGitOptions(r),
      G = r[index],
      argvUnquotedGlob = n.argvUnquotedGlob,
      Z = n.argv.length - r.length,
      Se =
        argvUnquotedGlob === void 0 ||
        argvUnquotedGlob.length !== n.argv.length ||
        Z < 1 ||
        argvUnquotedGlob.slice(0, Z + index + 1).some(Boolean);
    if (
      !options.some(({ opt: opt, value: Ee }) => {
        if (
          opt === "--bare" ||
          opt.startsWith("--config-env") ||
          opt.startsWith("--exec-path") ||
          opt.startsWith("--git-dir")
        )
          return !0;
        let Ae = Ee?.trim() ?? "";
        return containsAnyPlaceholder(Ae) || /^(alias|include|includeif|help\.autocorrect)\b/i.test(Ae);
      }) &&
      !Se &&
      G !== void 0 &&
      !containsAnyPlaceholder(G) &&
      G !== "grep" &&
      G !== "diff"
    )
      return [];
  }
  let h = getNewGlobArgs(r, s);
  if (h.length === 0) return [];
  if (n === void 0 || n.carveOutMayDesyncQuoteScan === !0) return h;
  let argvUnquotedGlob = n.argvUnquotedGlob,
    S = n.argv.length - r.length;
  if (argvUnquotedGlob === void 0 || argvUnquotedGlob.length !== n.argv.length || S < 1) return h;
  return h.filter((w) => r.some((L, G) => L === w && argvUnquotedGlob[S + G] === !0));
}
//@ chunk-e6aww6q8.js:1106720-1106828 layout
function getNewGlobArgs(e, n) {
  let r = new Set(n),
    s = [];
  for (let h of e) if (firstGlobCharIndex(h) !== -1 && !r.has(h)) (r.add(h), s.push(h));
  return s;
}
/**
 * 解析 cp/mv 的 -t / --target-directory，返回是否指定了目标目录和粘连写法里的目标路径。
 */
//@ chunk-e6aww6q8.js:1106828-1107218 layout
function getTargetDirectoryOption(e, n) {
  let r = !1,
    s = [];
  if (e === "cp" || e === "mv") {
    for (let h of n)
      if (h.startsWith("--")) {
        let y = firstLineOf(h.slice(2), "=");
        if (y !== "" && "target-directory".startsWith(y)) {
          if (((r = !0), h.includes("="))) s.push(h.slice(h.indexOf("=") + 1));
        }
      } else if (h.startsWith("-") && h.indexOf("t") > 0) {
        if (((r = !0), h.indexOf("t") < h.length - 1)) s.push(h.slice(h.indexOf("t") + 1));
      }
  }
  return { targetDirectoryGiven: r, attachedDestinations: s };
}
/**
 * 对一个路径受限命令的全部路径做权限校验：读封锁下的通配/占位符/~user 路径要询问；写操作的路径先按读校验；按操作类型 validatePath，deny 规则直接拒绝，不在工作目录内则 ask（带 blockedPath）。
 */
//@ chunk-e6aww6q8.js:1107218-1112301 fingerprint = validateCommandPaths (0.571)
function validateCommandPaths(e, n, r, s, h, y, S, w) {
  let L = y ?? COMMAND_OPERATION_TYPE[e],
    G = PATH_EXTRACTORS[e](n),
    q = getGlobArgsNeedingCheck(e, w, n, G),
    Z = L === "read" ? [...G, ...q] : G;
  if (e === "tee" && Z.length === 0 && q.length === 0)
    return { behavior: "passthrough", message: "Path validation passed for tee command" };
  let Se = s.blockReadsOutsideWorkingDirectories === !0,
    ke = COMMAND_ARGS_SAFE_CHECKS[e],
    we = ke !== void 0 && !ke(n),
    { targetDirectoryGiven: targetDirectoryGiven, attachedDestinations: attachedDestinations } =
      getTargetDirectoryOption(e, n),
    Ie = L === "read" ? [] : [...(targetDirectoryGiven ? Z : getSourceArgsOfWriteCommand(e, Z)), ...q],
    Me = !Se ? [] : L === "read" ? Z : Ie;
  if (
    Se &&
    (Me.some((gt) => shellPathSegments(gt).some((At) => urlPatternToRegex(At))) ||
      (AWK_COMMANDS.has(e) && n.some((gt) => /getline/.test(gt) || awkProgramHasExecBridge(gt) !== !1)))
  ) {
    let gt = checkDenyRulesForPaths(e, [...Z, ...attachedDestinations], r, s, L, Ie);
    if (gt) return gt;
    return outsideReadsRuntimePathAsk(e);
  }
  if (
    Me.some((gt) => containsAnyPlaceholder(gt)) ||
    Me.some((gt) => gt.startsWith("~") && gt !== "~" && !gt.startsWith("~/"))
  ) {
    let gt = checkDenyRulesForPaths(e, [...Z, ...attachedDestinations], r, s, L, Ie);
    if (gt) return gt;
    return outsideReadsRuntimePathAsk(e);
  }
  if (L !== "read")
    for (let gt of Me) {
      let {
        allowed: allowed,
        resolvedPath: resolvedPath,
        decisionReason: decisionReason,
      } = validatePath(gt, r, s, "read");
      if (!allowed && decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message: `${e} in '${resolvedPath}' was blocked by a deny rule`,
          decisionReason: decisionReason,
        };
      if (!allowed && isOutsideReadsBlockedAsk(decisionReason)) {
        let qt = checkDenyRulesForPaths(e, [...Z, ...attachedDestinations], r, s, L, Ie);
        if (qt) return qt;
        return {
          behavior: "ask",
          message:
            we && (e === "cp" || e === "mv")
              ? `${e} names a path outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`
              : decisionReason.reason,
          decisionReason: decisionReason,
        };
      }
    }
  let mapped = Z.map((gt) => validatePath(gt, r, s, L)),
    mapped_2 = attachedDestinations.map((gt) => validatePath(gt, r, s, L)),
    mapped_3 = Ie.map((gt) => validatePath(gt, r, s, "read")),
    Je = (gt) => !containsAnyPlaceholder(gt) && (!h || isAbsolute_22(gt) || gt.startsWith("~")),
    nt =
      mapped.find((gt, At) => !gt.allowed && gt.decisionReason?.type === "rule" && Je(Z[At])) ??
      mapped_2.find(
        (gt, At) => !gt.allowed && gt.decisionReason?.type === "rule" && Je(attachedDestinations[At]),
      ) ??
      mapped_3.find((gt, At) => !gt.allowed && gt.decisionReason?.type === "rule" && Je(Ie[At]));
  if (nt?.decisionReason !== void 0)
    return {
      behavior: "deny",
      message: formatDenyRuleBlockedMessage(
        e,
        L === "read" || mapped_3.includes(nt) ? "from" : "to",
        nt.resolvedPath,
      ),
      decisionReason: nt.decisionReason,
    };
  if (L !== "read" && Z.some((gt) => containsAnyPlaceholder(gt)))
    return {
      behavior: "ask",
      message: `${e} target contains command-substitution or untracked-variable output \u2014 the path is runtime-determined and cannot be validated`,
      decisionReason: {
        type: "other",
        reason: `${e} path argument is runtime-determined`,
        bashMissKind: "shell-expansion",
      },
    };
  if (we) {
    if (e === "cd") {
      if (Se) return outsideReadsRuntimePathAsk(e);
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
      message: `${e} with flags requires manual approval to ensure path safety. For security, Claude Code cannot automatically validate ${e} commands that use flags, as some flags like --target-directory=PATH can bypass path validation.`,
      decisionReason: {
        type: "other",
        reason: `${e} command with flags requires manual approval`,
        bashMissKind: "flag-validation",
      },
    };
  }
  if (
    h &&
    L === "read" &&
    Z.some((gt) => !isAbsolute_22(Lu(gt))) &&
    (Se || (e !== "cd" && S !== !0 && hasBashDenyRule(s)))
  ) {
    let gt = checkDenyRulesForPaths(e, Z, r, s, L);
    if (gt) return gt;
    if (Se) return outsideReadsRuntimePathAsk(e);
    let paths = hasNoBashDenyRules(s);
    return {
      behavior: "ask",
      message: paths
        ? `${e} reads a relative path after cd. That can't be checked against this computer's keys and sign-in files first.`
        : `${e} reads a file by a relative path after a cd in a compound command; which file that is cannot be resolved statically while a Read() deny rule is configured, so this needs approval.`,
      decisionReason: {
        type: "other",
        reason: paths
          ? "A relative read after cd can't be checked against keys and sign-in files"
          : "Compound command contains cd with a relative file read while a Read() deny rule exists",
        bashMissKind: "cd-compound-read",
      },
    };
  }
  if (h && L !== "read")
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
  let pt,
    filtered = mapped.filter((gt) => !gt.allowed && gt.decisionReason?.type === "safetyCheck"),
    yt =
      filtered.length === 0 ||
      (e === "cp" && filtered.at(-1) !== mapped.at(-1)) ||
      mapped.some((gt) => !gt.allowed && gt.decisionReason?.type === "rule");
  for (let {
    allowed: allowed,
    resolvedPath: resolvedPath,
    decisionReason: decisionReason,
    isInWorkingDir: isInWorkingDir,
  } of yt ? mapped : filtered.slice(0, 1))
    if (!allowed) {
      let workingDirs = Array.from(allWorkingDirectories(s)),
        dirListStr = formatDirectoryList(workingDirs),
        rn = isInWorkingDir === !0 && decisionReason === void 0,
        pn =
          decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
            ? decisionReason.reason
            : rn
              ? formatInsideWorkingDirApproval(`${e} in '${resolvedPath}'`, dirListStr)
              : L !== "read" && decisionReason?.type !== "rule"
                ? formatOutsideWorkingDirApproval(`${e} in '${resolvedPath}'`, dirListStr)
                : `${e} in '${resolvedPath}' was blocked. For security, Claude Code may only ${ACTION_VERBS[e]} the allowed working directories for this session: ${dirListStr}.`;
      if (decisionReason?.type === "rule")
        return { behavior: "deny", message: pn, decisionReason: decisionReason };
      let no = {
        behavior: "ask",
        message: pn,
        blockedPath: resolvedPath,
        decisionReason: decisionReason,
        bashAllowRuleOverridable: rn,
      };
      if (rn) {
        pt ??= no;
        continue;
      }
      return no;
    }
  if (pt) return pt;
  return { behavior: "passthrough", message: `Path validation passed for ${e} command` };
}
/**
 * 为某命令生成路径检查器：validateCommandPaths + rm/rmdir 危险删除检查；ask 时附建议（读：会话读规则；写：加会话目录，必要时切 acceptEdits）。
 */
//@ chunk-e6aww6q8.js:1112301-1112882 fingerprint = createPathChecker (1)
function createPathChecker(command, operationTypeOverride) {
  return (r, s, h, y, S, w) => {
    let L = validateCommandPaths(command, r, s, h, y, operationTypeOverride, S, w);
    if (L.behavior === "deny") return L;
    if (command === "rm" || command === "rmdir") {
      let G = checkDangerousRemovalPaths(command, r, s, h, y);
      if (G.behavior !== "passthrough") return G;
    }
    if (L.behavior === "passthrough") return L;
    if (L.behavior === "ask") {
      let operationType = operationTypeOverride ?? COMMAND_OPERATION_TYPE[command],
        suggestions = [];
      if (L.blockedPath)
        if (operationType === "read") {
          let dirPath = getDirectoryForPath(L.blockedPath),
            suggestion = createReadRuleSuggestion(dirPath, "session");
          if (suggestion) suggestions.push(suggestion);
        } else
          suggestions.push({
            type: "addDirectories",
            directories: [getDirectoryForPath(L.blockedPath)],
            destination: "session",
          });
      if ((operationType === "write" || operationType === "create") && acceptEditsSuggestionApplies(h))
        suggestions.push({ type: "setMode", mode: "acceptEdits", destination: "session" });
      L.suggestions = suggestions;
    }
    return L;
  };
}
//@ chunk-e6aww6q8.js:1112882-1112911 layout
function parseCommandArgs(e) {
  return getCommandArgv(e);
}
/**
 * 文本版：剥离包装后解析命令，若是路径受限命令则做路径检查（白名单内的 sed 视为读）。
 */
//@ chunk-e6aww6q8.js:1112911-1113249 fingerprint = validateSinglePathCommand (1)
function validateSinglePathCommand(e, n, r, s, h) {
  let strippedCmd = stripSafeWrappers(e),
    extractedArgs = parseCommandArgs(strippedCmd);
  if (extractedArgs.length === 0)
    return { behavior: "passthrough", message: "Empty command - no paths to validate" };
  let [w, ...L] = extractedArgs,
    G = normalizeCommandName(w);
  if (!G || !SUPPORTED_PATH_COMMANDS.includes(G))
    return { behavior: "passthrough", message: `Command '${G}' is not a path-restricted command` };
  let operationTypeOverride = G === "sed" && sedCommandIsAllowedByAllowlist(strippedCmd) ? "read" : void 0;
  return createPathChecker(G, operationTypeOverride)(L, n, r, s, h);
}
/**
 * AST 版：对 tree-sitter 解析出的简单命令做路径检查。
 */
//@ chunk-e6aww6q8.js:1113249-1113594 fingerprint = validateSinglePathCommandArgv (1)
function validateSinglePathCommandArgv(e, n, r, s, h) {
  let argv = stripWrappersFromArgvForPaths(e.argv);
  if (argv.length === 0) return { behavior: "passthrough", message: "Empty command - no paths to validate" };
  let [S, ...w] = argv,
    L = normalizeCommandName(S);
  if (!L || !SUPPORTED_PATH_COMMANDS.includes(L))
    return { behavior: "passthrough", message: `Command '${L}' is not a path-restricted command` };
  let operationTypeOverride =
    L === "sed" && sedCommandIsAllowedByAllowlist(stripSafeWrappers(e.text)) ? "read" : void 0;
  return createPathChecker(L, operationTypeOverride)(w, n, r, s, h, e);
}
/**
 * 求 AST 命令读取的路径（路径提取 + 输入重定向），去掉占位符和特殊设备。
 */
//@ chunk-e6aww6q8.js:1113594-1113838 layout
function getReadPathsForAstCommand(e) {
  let n = stripWrappersFromArgvForPaths(e.argv),
    [r, ...s] = n,
    h = normalizeCommandName(r),
    y = [];
  if (h && SUPPORTED_PATH_COMMANDS.includes(h)) {
    let S = h,
      w = PATH_EXTRACTORS[S](s);
    (y.push(...(COMMAND_OPERATION_TYPE[S] === "read" ? w : getSourceArgsOfWriteCommand(S, w))),
      y.push(...getGlobArgsNeedingCheck(S, e, s, w)));
  }
  return (
    y.push(...astRedirectsToOutputRedirections(e.redirects).inputRedirections),
    y.filter((S) => !containsAnyPlaceholder(S) && !isSpecialDevicePath(S))
  );
}
/**
 * 求 AST 命令会写入的路径：写命令的目标、cp/mv 落点、输出重定向目标，并标记是否可能写入看不到的位置（sort -o、uniq 第二参数、find -fprint、sed 写、cp/mv --backup 等）。供文件监视/编辑 diff 使用。
 */
//@ chunk-e6aww6q8.js:1113838-1114900 layout
function getWriteTargetsForAstCommand(e) {
  let n = stripWrappersFromArgvForPaths(e.argv),
    [r, ...s] = n,
    h = r?.replace(/^.*[\\/]/, ""),
    y = [],
    S = [],
    w = [],
    L = !1,
    G = h !== void 0 && h !== "git" && SUPPORTED_PATH_COMMANDS.includes(h);
  if (G) {
    let q = h,
      Z = PATH_EXTRACTORS[q](s),
      Se = q === "sed" ? stripSafeWrappers(e.text) : "";
    if (COMMAND_OPERATION_TYPE[q] === "read")
      L =
        (q === "sort" && s.some((ke) => /^-[A-Za-z]*o/.test(ke) || ke.startsWith("--o"))) ||
        (q === "uniq" && Z.length >= 2) ||
        (q === "find" && s.some((ke) => isFindDangerousAction(ke)));
    else if (q !== "sed" || !sedCommandIsAllowedByAllowlist(Se)) {
      L = q === "sed" && !sedCommandIsAllowedByAllowlist(Se, { allowFileWrites: !0 });
      let { targetDirectoryGiven: targetDirectoryGiven, attachedDestinations: attachedDestinations } =
          getTargetDirectoryOption(q, s),
        Ee = (q === "cp" || q === "mv") && !targetDirectoryGiven && Z.length >= 2;
      if (Ee && q === "cp" && hasOnlyListOptions(s)) ((w = Z.slice(0, -1)), y.push(...Z.slice(-1)));
      else y.push(...Z);
      if ((y.push(...attachedDestinations), (q === "cp" || q === "mv") && hasBackupSuffixOption(s))) L = !0;
      if (q === "cp" && cpHasAmbiguousDestination(s, Ee ? Z.slice(0, -1) : targetDirectoryGiven ? Z : []))
        L = !0;
      let Ae = Ee ? Z.slice(-1) : targetDirectoryGiven ? [...Z, ...attachedDestinations] : [];
      for (let Ie of Ae)
        for (let Me of Z) {
          let We = basename_20(Me);
          if (Me !== Ie && We !== "." && We !== "..") S.push(`${Ie.replace(/[\\/]+$/, "")}/${We}`);
        }
    }
  }
  for (let redirect of e.redirects)
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
      let s = basename_20(r);
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
function hasOnlyListOptions(e) {
  let n = !1;
  for (let r of e) {
    if (r === "--") return !n;
    if (!r.startsWith("-") || r === "-") n = !0;
    else if (n || (r.startsWith("--") ? /^--[ls]/.test(r) : /[ls]/.test(r))) return !1;
  }
  return !0;
}
//@ chunk-e6aww6q8.js:1115382-1115420 layout
var CASE_SENSITIVE_PATH_COMMANDS = new Set(["rm", "rmdir", "tee"]);
/**
 * 规范化命令名：rm/rmdir/tee 去掉目录前缀（tee 还去 .exe 并小写），其他保持原样。
 */
//@ chunk-e6aww6q8.js:1115420-1115564 layout
function normalizeCommandName(e) {
  if (!e) return e;
  let replaced = e.replace(/^.*[\\/]/, "");
  if (CASE_SENSITIVE_PATH_COMMANDS.has(replaced)) return replaced;
  return replaced.toLowerCase().replace(/\.exe$/, "") === "tee" ? "tee" : e;
}
/**
 * 输出重定向检查：目标命中 deny 规则拒绝；复合命令含 cd 时任何重定向都要询问；目标不在可写范围则 ask 并建议添加会话目录。
 */
//@ chunk-e6aww6q8.js:1115564-1117098 fingerprint = validateOutputRedirections (0.822)
function validateOutputRedirections(redirections, cwd, toolPermissionContext, compoundCommandHasCd) {
  let mapped = redirections
      .filter((w) => w.target !== "/dev/null")
      .filter((w) => !compoundCommandHasCd || isAbsolute_22(w.target) || w.target.startsWith("~"))
      .map((w) => validatePath(w.target, cwd, toolPermissionContext, "create")),
    found = mapped.find((w) => !w.allowed && w.decisionReason?.type === "rule");
  if (found?.decisionReason !== void 0)
    return {
      behavior: "deny",
      message: formatDenyRuleBlockedMessage("Output redirection", "to", found.resolvedPath),
      decisionReason: found.decisionReason,
    };
  if (compoundCommandHasCd && redirections.some((w) => w.target !== "/dev/null"))
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
  for (let {
    allowed: allowed,
    resolvedPath: resolvedPath,
    decisionReason: decisionReason,
    isInWorkingDir: isInWorkingDir,
  } of mapped)
    if (!allowed) {
      let workingDirs = Array.from(allWorkingDirectories(toolPermissionContext)),
        dirListStr = formatDirectoryList(workingDirs),
        message =
          decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
            ? decisionReason.reason
            : decisionReason?.type === "rule"
              ? formatDenyRuleBlockedMessage("Output redirection", "to", resolvedPath)
              : isInWorkingDir === !0 && decisionReason === void 0
                ? formatInsideWorkingDirApproval(`Output redirection to '${resolvedPath}'`, dirListStr)
                : formatOutsideWorkingDirApproval(`Output redirection to '${resolvedPath}'`, dirListStr);
      if (decisionReason?.type === "rule")
        return { behavior: "deny", message: message, decisionReason: decisionReason };
      let we = {
        behavior: "ask",
        message: message,
        blockedPath: resolvedPath,
        decisionReason: decisionReason,
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
  return S ?? { behavior: "passthrough", message: "No unsafe redirections found" };
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
/**
 * Bash 路径约束总检查：进程替换 >( <( 要询问；输入重定向检查；每个子命令的路径检查（deny 优先）；危险重定向目标检查（含 edit deny 规则）；输出重定向检查；汇总返回 deny/ask/passthrough。
 */
//@ chunk-e6aww6q8.js:1117528-1123341 fingerprint = checkPathConstraints (0.338)
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
        : void 0,
    L = astRedirects ? astRedirectsToOutputRedirections(astRedirects) : void 0,
    {
      redirections: redirections,
      hasDangerousRedirection: hasDangerousRedirection,
      dangerousRedirectionReason: dangerousRedirectionReason,
    } = L ?? extractOutputRedirections(input.command),
    Se = validateInputRedirections(
      L?.inputRedirections ?? [],
      cwd,
      toolPermissionContext,
      compoundCommandHasCd,
    );
  if (Se.behavior === "deny") return Se;
  let ke = astCommands
      ? astCommands.map((yt) =>
          validateSinglePathCommandArgv(yt, cwd, toolPermissionContext, compoundCommandHasCd, S),
        )
      : splitCommand(input.command).map((yt) =>
          validateSinglePathCommand(yt, cwd, toolPermissionContext, compoundCommandHasCd, S),
        ),
    found = ke.find((yt) => yt.behavior === "deny");
  if (found !== void 0) return found;
  let found_2 = ke.find(
    (yt) =>
      yt.behavior === "ask" &&
      yt.decisionReason?.type === "safetyCheck" &&
      isBypassImmuneCircuitBreaker(yt.decisionReason),
  );
  if (w !== void 0) return found_2 ?? w;
  let Ae;
  if (hasDangerousRedirection) {
    let yt,
      gt,
      At,
      It = [],
      Yt = !1;
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
        let {
          circuitBreaker: circuitBreaker,
          also: also,
          classifierApprovable: classifierApprovable,
        } = redirectionResult.decisionReason;
        ((At ??= redirectionResult),
          It.push(...(circuitBreaker !== void 0 ? [circuitBreaker] : []), ...(also ?? [])),
          (Yt ||= !classifierApprovable));
      }
    }
    if (L !== void 0) {
      let no = [...L.denyCheckOutputRedirections, ...redirections];
      for (let cmd of no)
        for (let ho of getRedirectTargetCandidates(cmd.target, cwd)) {
          let yn = walkPermissionCheckPaths(ho.path),
            Kn = permissionCheckSpellings(yn);
          for (let ao of Kn) {
            let $o = matchingRuleForInput(ao, toolPermissionContext, "edit", "deny");
            if ($o !== null) {
              if (ho.cwdIndependent || !compoundCommandHasCd)
                return {
                  behavior: "deny",
                  message: formatDenyRuleBlockedMessage("Output redirection", "to", ao),
                  decisionReason: { type: "rule", rule: $o },
                };
            }
          }
          let result = checkEditableInternalPath(ho.path, {}, Kn, {
              restricted: toolPermissionContext.restricted,
            }),
            fo = result.behavior === "deny" && !0,
            To = fo ? internalPathDenyWords(result.decisionReason) : void 0,
            bo = fo ? hostPersonOnlyTag(result.decisionReason) : void 0,
            vn = checkPathSafetyForAutoEdit(ho.path, Kn),
            co = symlinkRedirect(yn, toolPermissionContext),
            So;
          if (fo) {
            if (
              ((So =
                co === null
                  ? void 0
                  : {
                      sentence: symlinkRedirectSentence(ho.path, co),
                      personOnly: co.carriedOut || !hardDeniedAsSpelled(ho.path, toolPermissionContext),
                    }),
              It.push("internalHardDeny", ...(bo !== void 0 ? [bo] : [])),
              bo !== void 0 || So?.personOnly === !0)
            )
              Yt = !0;
          }
          let ko =
              vn.safe || co === null
                ? null
                : {
                    sentence: symlinkRedirectSentence(ho.path, co),
                    personOnly: co.carriedOut || checkPathSafetyForAutoEdit(ho.path, [ho.path]).safe,
                  },
            un = vn.safe || (vn.classifierApprovable && ko?.personOnly !== !0 && So?.personOnly !== !0);
          if (!vn.safe) {
            if (
              (It.push(...(vn.circuitBreaker !== void 0 ? [vn.circuitBreaker] : []), ...(vn.also ?? [])),
              ko?.personOnly === !0)
            )
              Yt = !0;
          }
          if (
            yt === void 0 ||
            (yt.decisionReason?.type === "safetyCheck" && yt.decisionReason.classifierApprovable)
          ) {
            let ao = yt?.decisionReason?.type === "safetyCheck" ? yt.decisionReason.circuitBreaker : void 0;
            if (!vn.safe && (yt === void 0 || !un || (vn.circuitBreaker !== void 0 && ao === void 0))) {
              let $o = To ?? vn.message,
                yo = ko === null ? $o : `${$o.endsWith(".") ? $o : `${$o}.`} ${ko.sentence}.`;
              yt = {
                behavior: "ask",
                message: yo,
                decisionReason: {
                  type: "safetyCheck",
                  reason: yo,
                  ...(toolPermissionContext.restricted
                    ? { classifierApprovable: !1, circuitBreaker: "restrictedMode" }
                    : { classifierApprovable: un, circuitBreaker: vn.circuitBreaker ?? bo }),
                },
              };
              continue;
            }
          }
          if (
            vn.safe &&
            fo &&
            (gt === void 0 ||
              ((bo !== void 0 || So?.personOnly === !0) &&
                gt.decisionReason?.type === "safetyCheck" &&
                gt.decisionReason.classifierApprovable))
          )
            gt = {
              behavior: "ask",
              message: To ?? result.message,
              decisionReason: internalDenyShellAskReason(result, toolPermissionContext.restricted, So),
            };
          if (vn.safe && !fo && co?.carriedOut === !0) {
            Yt = !0;
            let ao = symlinkRedirectSentence(ho.path, co),
              $o = {
                behavior: "ask",
                message: ao,
                decisionReason: { type: "safetyCheck", reason: ao, classifierApprovable: !1 },
              };
            if (yt === void 0) At ??= $o;
            else if (yt.decisionReason?.type === "safetyCheck" && yt.decisionReason.classifierApprovable)
              yt = $o;
          }
        }
    }
    let qt = (no) => {
      if (no.behavior !== "ask" || no.decisionReason?.type !== "safetyCheck") return no;
      let decisionReason = no.decisionReason,
        filtered = uniq([...(decisionReason.also ?? []), ...It]).filter(
          (yn) => yn !== decisionReason.circuitBreaker,
        );
      return {
        ...no,
        decisionReason: {
          ...decisionReason,
          classifierApprovable: decisionReason.classifierApprovable && !Yt,
          ...(filtered.length > 0 && { also: filtered }),
        },
      };
    };
    if (yt !== void 0) {
      let commands = qt(yt);
      return found_2 === void 0 || isHardSafetyAsk(commands) ? commands : qt(found_2);
    }
    let Zt =
        dangerousRedirectionReason === "network_device"
          ? "Redirect involving /dev/tcp or /dev/udp opens a network connection"
          : dangerousRedirectionReason === "unc_path"
            ? "Redirect target is a Windows UNC path \u2014 opening it triggers an SMB connection"
            : "Shell expansion syntax in paths requires manual approval",
      pn =
        At !== void 0
          ? qt(At)
          : gt !== void 0
            ? qt(gt)
            : {
                behavior: "ask",
                message: Zt,
                decisionReason: {
                  type: "other",
                  reason: Zt,
                  bashMissKind:
                    dangerousRedirectionReason === "network_device" ||
                    dangerousRedirectionReason === "unc_path"
                      ? "net-redirect"
                      : "shell-expansion",
                },
              };
    if (toolPermissionContext.blockReadsOutsideWorkingDirectories !== !0)
      return found_2 === void 0 || isHardSafetyAsk(pn) ? pn : qt(found_2);
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
  let We = validateOutputRedirections(redirections, cwd, toolPermissionContext, compoundCommandHasCd),
    ze = Me(We),
    lt;
  if (ze) {
    if (ze.behavior === "deny" || toolPermissionContext.blockReadsOutsideWorkingDirectories !== !0)
      return ze.behavior === "ask" && found_2 !== void 0 && !isHardSafetyAsk(ze)
        ? mergeSafetyCheckAlso(found_2, ze)
        : ze;
    lt = ze;
  }
  let Je;
  if (toolPermissionContext.blockReadsOutsideWorkingDirectories === !0 && astRedirects)
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
        Je ??= { behavior: "ask", message: gt.decisionReason.reason, decisionReason: gt.decisionReason };
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
  if (toolPermissionContext.blockReadsOutsideWorkingDirectories === !0) {
    let yt = astCommands
      ? astCommands.map((gt) => gt.argv)
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
  let pt = toolPermissionContext.blockReadsOutsideWorkingDirectories === !0,
    Et;
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
      [Ae, lt].find((yt) => yt !== void 0 && isHardSafetyAsk(yt)) ?? mergeSafetyCheckAlso(found_2, Ae ?? lt)
    );
  if (Ae) return Ae;
  if (lt) return lt;
  if (Et) return Et;
  if (Se.behavior === "ask") return Se;
  if (Ie) return Ie;
  return { behavior: "passthrough", message: "All path commands validated successfully" };
}
/**
 * 输入重定向（< file）检查：目标是通配或在 cd 之后时询问；命中 read deny 规则拒绝；否则按读路径校验。
 */
//@ chunk-e6aww6q8.js:1123341-1124615 layout
function validateInputRedirections(e, n, r, s) {
  let h;
  for (let y of e) {
    if (isSpecialDevicePath(y)) continue;
    if (firstGlobCharIndex(y) !== -1 || (s && !isAbsolute_22(y) && !y.startsWith("~"))) {
      for (let q of getRedirectTargetCandidates(y, n)) {
        if (!q.cwdIndependent && s) continue;
        for (let Z of getPathsForPermissionCheck(q.path)) {
          let Se = matchingRuleForInput(Z, r, "read", "deny");
          if (Se !== null)
            return {
              behavior: "deny",
              message: formatDenyRuleBlockedMessage("Input redirection", "from", Z),
              decisionReason: { type: "rule", rule: Se },
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
    let {
      allowed: allowed,
      resolvedPath: resolvedPath,
      decisionReason: decisionReason,
    } = validatePath(y, n, r, "read");
    if (allowed) continue;
    if (decisionReason?.type === "rule")
      return {
        behavior: "deny",
        message: formatDenyRuleBlockedMessage("Input redirection", "from", resolvedPath),
        decisionReason: decisionReason,
      };
    let G = createReadRuleSuggestion(getDirectoryForPath(resolvedPath), "session");
    h ??= {
      behavior: "ask",
      message:
        decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
          ? decisionReason.reason
          : `Input redirection from '${resolvedPath}' was blocked. For security, Claude Code may only read files in the allowed working directories for this session: ${formatDirectoryList(Array.from(allWorkingDirectories(r)))}.`,
      blockedPath: resolvedPath,
      decisionReason: decisionReason,
      ...(G && { suggestions: [G] }),
    };
  }
  return h ?? { behavior: "passthrough", message: "No unsafe input redirections found" };
}
/**
 * /dev/null、/dev/std*、/dev/tty、/dev/fd/N、/proc/self/fd/0-2 等特殊设备路径。
 */
//@ chunk-e6aww6q8.js:1124615-1124791 layout
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
  let r = [],
    s = Lu(e);
  if (s !== e) r.push({ path: s, cwdIndependent: !0 });
  if (!e.startsWith("~")) r.push({ path: resolve_19(n, e), cwdIndependent: isAbsolute_22(e) });
  return r;
}
/**
 * 把 AST 重定向列表拆成输出重定向、输入重定向、需做 deny 检查的重定向，并标记危险重定向。
 */
//@ chunk-e6aww6q8.js:1124946-1125928 fingerprint = astRedirectsToOutputRedirections (0.617)
function astRedirectsToOutputRedirections(redirects) {
  let n = [],
    r = [],
    s = [],
    h = !1,
    y;
  for (let S of redirects) {
    if (/^\/dev\/(tcp|udp)\//.test(S.target)) {
      ((h = !0), (y = "network_device"));
      continue;
    }
    if (containsVulnerableUncPath(S.target.replace(/\\/g, "/"), !0)) {
      if (((h = !0), y !== "network_device")) y = "unc_path";
      continue;
    }
    if (
      (S.op === ">" || S.op === ">|" || S.op === "&>" || S.op === ">>" || S.op === "&>>" || S.op === ">&") &&
      (S.target.startsWith("~") || firstGlobCharIndex(S.target) !== -1)
    ) {
      if (((h = !0), y !== "network_device" && y !== "unc_path")) y = "shell_expansion";
      s.push({ target: S.target, operator: S.op === ">>" || S.op === "&>>" ? ">>" : ">" });
      continue;
    }
    switch (S.op) {
      case ">":
      case ">|":
      case "&>":
        n.push({ target: S.target, operator: ">" });
        break;
      case ">>":
      case "&>>":
        n.push({ target: S.target, operator: ">>" });
        break;
      case ">&":
        if (!/^(?:\d+|-)$/.test(S.target)) n.push({ target: S.target, operator: ">" });
        break;
      case "<":
        r.push(S.target);
        break;
      case "<&":
        if (!/^(?:\d+|-)$/.test(S.target)) r.push(S.target);
        break;
      case "<<":
      case "<<<":
        break;
    }
  }
  return {
    redirections: n,
    inputRedirections: r,
    hasDangerousRedirection: h,
    dangerousRedirectionReason: y,
    denyCheckOutputRedirections: s,
  };
}
//@ chunk-e6aww6q8.js:1125928-1126168 file-local
function skipStdbufFlags(a) {
  let n = 1;
  while (n < a.length) {
    let arg = a[n];
    if (/^-[ioe]$/.test(arg) && a[n + 1]) n += 2;
    else if (/^-[ioe]./.test(arg)) n++;
    else if (/^--(input|output|error)=/.test(arg)) n++;
    else if (arg.startsWith("-")) return -1;
    else break;
  }
  return n > 1 && n < a.length ? n : -1;
}
//@ chunk-e6aww6q8.js:1126168-1126404 file-local
function skipEnvFlags(a) {
  let n = 1;
  while (n < a.length) {
    let arg = a[n];
    if (arg.includes("=") && !arg.startsWith("-")) n++;
    else if (arg === "-i" || arg === "-0" || arg === "-v") n++;
    else if (arg === "-u" && a[n + 1]) n += 2;
    else if (arg.startsWith("-")) return -1;
    else break;
  }
  return n < a.length ? n : -1;
}
/**
 * 剥离 time/nohup/timeout/nice/stdbuf/env/command 包装（含它们的选项），返回实际命令 argv。被 readOnlyValidation、沙箱读封锁等多处使用。
 */
//@ chunk-e6aww6q8.js:1126404-1127358 fingerprint = stripWrappersFromArgv (0.809)
function stripWrappersFromArgvForPaths(argv) {
  let n = argv;
  for (;;) {
    let r = n[0]?.replace(/^.*[\\/]/, ""),
      s =
        r === "time" ||
        r === "nohup" ||
        r === "timeout" ||
        r === "nice" ||
        r === "stdbuf" ||
        r === "env" ||
        r === "command"
          ? r
          : n[0];
    if (s === "time" || s === "nohup") n = n.slice(n[1] === "--" ? 2 : 1);
    else if (s === "timeout") {
      let h = skipTimeoutFlags(n);
      if (h < 0 || !n[h] || !/^\d+(?:\.\d+)?[smhd]?$/.test(n[h])) return n;
      n = n.slice(h + 1);
    } else if (s === "nice")
      if (n[1] === "-n" && n[2] && /^-?\d+$/.test(n[2])) n = n.slice(n[3] === "--" ? 4 : 3);
      else if (n[1] && /^-\d+$/.test(n[1])) n = n.slice(n[2] === "--" ? 3 : 2);
      else n = n.slice(n[1] === "--" ? 2 : 1);
    else if (s === "stdbuf") {
      let h = skipStdbufFlags(n);
      if (h < 0) return n;
      n = n.slice(h);
    } else if (s === "env") {
      let h = skipEnvFlags(n);
      if (h < 0) return n;
      n = n.slice(h);
    } else if (s === "command") {
      let h = 1;
      while (n[h] !== void 0 && /^-p+$/.test(n[h])) h++;
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
function formatDenyRuleBlockedMessage(e, n, r) {
  return `${e} ${n} '${r}' was blocked by a deny rule.`;
}
//@ chunk-e6aww6q8.js:1127430-1127630 affinity
function formatInsideWorkingDirApproval(e, n) {
  return `${e} needs approval. The path is inside the working directories for this session (${n}), and Claude Code asks before a shell command creates, changes or removes files there.`;
}
//@ chunk-e6aww6q8.js:1127630-1127784 affinity
function formatOutsideWorkingDirApproval(e, n) {
  return `${e} needs approval. The path is outside the working directories for this session (${n}). Allowing runs the command as written.`;
}
//@ chunk-e6aww6q8.js:1153141-1153309 sole-consumer
function isPathOrAncestorMatched(e, n) {
  if (isPathMatchedForPermission(e, n)) return !0;
  for (let r = 1; r < e.length; r++) {
    let s = e[r],
      h = e[r - 1];
    if ((s === "/" || s === sep_28) && h !== "/" && h !== sep_28) {
      if (isPathMatchedForPermission(e.slice(0, r), n)) return !0;
    }
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1153309-1153579 placement = setCwdState (1)
function isCaseVariantInsideCwd(e, n) {
  let lower = e.toLowerCase();
  if (lower === n.toLowerCase()) return !0;
  let s = getFsImplementation(),
    normalized = (resolveDeepestExistingAncestorSync(s, getOriginalCwd()) ?? getOriginalCwd()).normalize(
      "NFC",
    ),
    y = relative_18(normalized, n);
  if (y === ".." || y.startsWith(".." + sep_28) || isAbsolute_21(y)) return !1;
  let S = n;
  for (;;) {
    if (S.toLowerCase() === lower) return !0;
    if (S === normalized || S === dirname_28(S)) return !1;
    S = dirname_28(S);
  }
}
/**
 * 从 mkdir/touch 等命令中提取写入目标路径。
 */
//@ chunk-e6aww6q8.js:1153579-1154977 placement
function extractWriteTargets(e, n) {
  for (let r of e) {
    if (!r) continue;
    for (let redirect of r.redirects) {
      if (INPUT_REDIRECT_OPS.has(redirect.op)) continue;
      if (containsAnyPlaceholder(redirect.target)) return !0;
      if (isPathMatchedForPermission(redirect.target, n)) return !0;
    }
    let s = stripWrappersFromArgvForPaths(r.argv);
    if (s[0] !== void 0 && containsAnyPlaceholder(s[0])) return !0;
    let h = normalizeCommandName(s[0]);
    if (!h || !Object.hasOwn(COMMAND_OPERATION_TYPE, h)) continue;
    let y = COMMAND_OPERATION_TYPE[h];
    if ((y !== "write" && y !== "create") || NON_CREATING_WRITE_COMMANDS.has(h)) continue;
    let S = PATH_EXTRACTORS[h](s.slice(1)),
      w =
        h === "mkdir" &&
        s.slice(1).some((L) => /^-[^-]*p/.test(L) || (L.startsWith("--p") && "--parents".startsWith(L)));
    for (let L of S) {
      if (containsAnyPlaceholder(L)) return !0;
      if (w ? isPathOrAncestorMatched(L, n) : isPathMatchedForPermission(L, n)) return !0;
    }
    if ((h === "cp" || h === "mv") && S.length >= 1) {
      let sliced = s.slice(1),
        any = sliced.some((Se) => {
          if (/^-[^-]*t/.test(Se)) return !0;
          let index = Se.indexOf("="),
            we = index >= 0 ? Se.slice(0, index) : Se;
          return we.startsWith("--t") && "--target-directory".startsWith(we);
        }),
        any_2 = sliced.some(
          (Se) => /^-[^-]*T/.test(Se) || (Se.startsWith("--n") && "--no-target-directory".startsWith(Se)),
        ),
        Z = !1;
      if (!any && S.length >= 2) {
        let at = S.at(-1),
          ke = [at];
        if (at.startsWith("~")) {
          let we = Lu(at);
          if (we.startsWith("~")) Z = !0;
          else ke.push(we);
        }
        if (!Z) {
          let we = getFsImplementation(),
            normalized = (resolveDeepestExistingAncestorSync(we, n) ?? n).normalize("NFC");
          for (let Ae of ke) {
            let Ie = resolve_18(n, Ae),
              normalized_2 = resolveForPermissionCheck(we, Ie).normalize("NFC");
            if (isCaseVariantInsideCwd(normalized_2, normalized)) {
              Z = !0;
              break;
            }
          }
        }
      }
      if (any || Z) {
        let Se = any ? S : S.slice(0, -1);
        if (any_2) return !0;
        for (let ke of Se) {
          if (firstGlobCharIndex(ke) !== -1 || containsAnyPlaceholder(ke)) return !0;
          let we = basename_19(ke);
          if (we === "." || we === "..") return !0;
          if (ke.startsWith("~")) {
            let Ee = Lu(ke);
            if (Ee.startsWith("~")) return !0;
            if (getPathsForPermissionCheck_2(basename_19(Ee), n) || getPathsForPermissionCheck_2(we, n))
              return !0;
          } else if (getPathsForPermissionCheck_2(we, n)) return !0;
        }
      }
    }
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1154977-1155016 placement
var VIo = new Set(["<", "<<", "<&", "<<<"]);

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
  VIo,
  getReadPathsForAstCommand,
  getWriteTargetsForAstCommand,
};
