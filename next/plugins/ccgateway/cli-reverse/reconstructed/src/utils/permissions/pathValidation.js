/**
 * utils/permissions/pathValidation.ts
 *
 * Shell 工具路径参数校验：拒绝 UNC、~ 变体、shell 展开、.. 遍历、写目标的花括号/glob，读 glob 按基目录判定，并提供沙箱写允许列表判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/pathValidation.ts
 * pieces: chunk-fq0cr76a.js (29), chunk-s61vbvea.js (2)
 * attribution: affinity 1, facade-exports 14, layout 12, file-local 1, callgraph-fingerprint 1, placement 2
 */
import { isAbsolute, resolve, dirname, parse } from "path";
import { homedir } from "os";
import { firstGlobCharIndex } from "../windowsUncPaths.js";
import { getPlatform } from "../platform.js";
import { SandboxManager } from "../sandbox/sandbox-adapter.js";
import {
  getPathsForPermissionCheck,
  walkPermissionCheckPaths,
  getFsImplementation,
  safeResolvePath,
  resolvedSpellingWalk,
} from "../fsOperations.js";
import {
  pathInWorkingPath,
  matchingRuleForInput,
  outsideReadBlocked,
  checkEditableInternalPath,
  internalPathDecisionStands,
  checkPathSafetyForAutoEdit,
  remoteConfigEditExemptionApplies,
  sensitiveWriteRedirect,
  hardDeniedAsSpelled,
  symlinkRedirect,
  symlinkRedirectSentence,
  pathInAllowedWorkingPath,
  checkReadableInternalPath,
  untypeDenyReasonForAskPropagation,
  matchingAllowRuleForAllPaths,
  normalizeCaseForComparison as normalizeCaseForComparison_2,
} from "./filesystem.js";
import { getSessionPathsCache } from "../sessionPathsCache.js";
import {
  isHostPersonOnlyCircuitBreaker,
  OUTSIDE_READS_BLOCKED_DENY_REASON,
} from "../../types/permissions.js";
import { unresolvablePathMessage } from "../invisibleChars.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { uniq } from "../collections.js";
import {
  normalizeWindowsDevicePath,
  profileRelativeRemainders,
  WSL_MNT_UNC_RE,
} from "../windowsProfileFolders.js";
import {
  normalizeWindowsPathForCompare,
  classifyUncPath,
  uncAdminShareToDrive,
} from "../hooks/hookCommandAnalysis.js";
import { stripTrailingDotsSpaces } from "../ignorePatterns.js";
import { normalizeDosDevicePath } from "../pathClassification.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { expandTildeWithHome } from "../networkPaths.js";
import { containsVulnerableUncPath } from "../shell/readOnlyCommandValidation.js";

//@ chunk-fq0cr76a.js:1064037-1064057 affinity
var MAX_LISTED_DIRECTORIES = 5;
var BRACE_PATTERN = /[{}]/;
//@ chunk-fq0cr76a.js:1064057-1064209 facade-exports = formatDirectoryList (1)
/**
 * 把目录列表格式化为 'a', 'b', and N more（最多显示若干个）。
 */
function formatDirectoryList(directories) {
  let dirCount = directories.length;
  if (dirCount <= MAX_LISTED_DIRECTORIES) return directories.map((dir) => `'${dir}'`).join(", ");
  return `${directories
    .slice(0, MAX_LISTED_DIRECTORIES)
    .map((dir) => `'${dir}'`)
    .join(", ")}, and ${dirCount - MAX_LISTED_DIRECTORIES} more`;
}
//@ chunk-fq0cr76a.js:1064209-1064414 facade-exports = getGlobBaseDirectory (1)
/**
 * 返回通配符之前的目录部分（Windows 上兼顾反斜杠）。
 */
function getGlobBaseDirectory(filePath) {
  let globMatch = firstGlobCharIndex(filePath);
  if (globMatch === -1) return filePath;
  let beforeGlob = filePath.substring(0, globMatch);
  let lastSepIndex =
    getPlatform() === "windows"
      ? Math.max(beforeGlob.lastIndexOf("/"), beforeGlob.lastIndexOf("\\"))
      : beforeGlob.lastIndexOf("/");
  if (lastSepIndex === -1) return ".";
  return beforeGlob.substring(0, lastSepIndex) || "/";
}
//@ chunk-fq0cr76a.js:1064414-1064720 facade-exports = isPathInSandboxWriteAllowlist (0.719)
/**
 * 沙箱开启且 deny 列表完整时，路径的每种拼写都在沙箱写允许列表内（且不在 denyWithinAllow 内）才返回 true；用于沙箱下自动放行 Bash 写操作。
 */
function isPathInSandboxWriteAllowlist(path, pathsToCheck) {
  if (!SandboxManager.isSandboxingEnabled() || SandboxManager.storedDenyListsMayBeShort()) return false;
  let { allowOnly, denyWithinAllow } = SandboxManager.getFsWriteConfig();
  let pathsToCheck_2 = pathsToCheck ?? getPathsForPermissionCheck(path);
  let resolvedAllow = allowOnly.flatMap(getSandboxConfigPathSpellings);
  let resolvedDeny = denyWithinAllow.flatMap(getSandboxConfigPathSpellings);
  return pathsToCheck_2.every((spelling) => {
    for (let denyPath of resolvedDeny) if (pathInWorkingPath(spelling, denyPath)) return false;
    return resolvedAllow.some((allowPath) =>
      pathInWorkingPath(spelling, allowPath, {
        caseFold: true,
        uncShapeParity: true,
      }),
    );
  });
}
//@ chunk-fq0cr76a.js:1064720-1064840 layout
function getSandboxConfigPathSpellings(configPath) {
  let { resolvedSandboxConfigPaths } = getSessionPathsCache();
  let cached = resolvedSandboxConfigPaths.get(configPath);
  if (cached !== undefined) return cached;
  let pathsForPermissionCheck = getPathsForPermissionCheck(configPath);
  resolvedSandboxConfigPaths.set(configPath, pathsForPermissionCheck);
  return pathsForPermissionCheck;
}
//@ chunk-fq0cr76a.js:1064840-1064922 facade-exports
/**
 * 从内部路径拒绝原因中取可展示的文字（safetyCheck/other 的 reason）。
 */
function internalPathDenyWords(decisionReason) {
  return decisionReason?.type === "safetyCheck" || decisionReason?.type === "other"
    ? decisionReason.reason
    : undefined;
}
//@ chunk-fq0cr76a.js:1064922-1065027 facade-exports
/**
 * 若拒绝原因是只能由宿主上的人确认的 safetyCheck，返回其熔断标签。
 */
function hostPersonOnlyTag(decisionReason) {
  return decisionReason?.type === "safetyCheck" &&
    decisionReason.circuitBreaker !== undefined &&
    isHostPersonOnlyCircuitBreaker(decisionReason)
    ? decisionReason.circuitBreaker
    : undefined;
}
//@ chunk-fq0cr76a.js:1065027-1065469 facade-exports
/**
 * 把内部路径硬拒绝转换为 Shell 命令的 safetyCheck 询问原因：附加符号链接说明；restricted 模式下标 restrictedMode 并在 also 中记 internalHardDeny；宿主专属时沿用其熔断；否则标 internalHardDeny，是否允许分类器批准取决于是否必须由人确认。
 */
function internalDenyShellAskReason(denial, restricted, redirect) {
  let reasonText = internalPathDenyWords(denial.decisionReason) ?? denial.message;
  let personOnlyTag = hostPersonOnlyTag(denial.decisionReason);
  return {
    type: "safetyCheck",
    reason:
      redirect === undefined
        ? reasonText
        : `${reasonText.endsWith(".") ? reasonText : `${reasonText}.`} ${redirect.sentence}.`,
    ...(restricted
      ? {
          classifierApprovable: false,
          circuitBreaker: "restrictedMode",
          also: ["internalHardDeny", ...(personOnlyTag !== undefined ? [personOnlyTag] : [])],
        }
      : personOnlyTag !== undefined
        ? {
            classifierApprovable: false,
            circuitBreaker: personOnlyTag,
            also: ["internalHardDeny"],
          }
        : {
            classifierApprovable: redirect?.personOnly !== true,
            circuitBreaker: "internalHardDeny",
          }),
  };
}
//@ chunk-fq0cr76a.js:1065469-1065577 facade-exports
/**
 * 判断路径检查结果是否“仅因在工作目录外而被默认拒绝”（没有具体原因），这类可以给出 addDirectories 建议。
 */
function isOnlyOutsideWorkingFoldersRefusal(result) {
  return (
    !result.allowed &&
    result.refusedByDefault === true &&
    result.decisionReason === undefined &&
    result.isInWorkingDir === false
  );
}
//@ chunk-fq0cr76a.js:1065577-1068271 facade-exports = isPathAllowed (0.56)
/**
 * （文件系统权限）判断路径是否允许：先查各种拼写的 deny 规则；路径无法解析时按读封锁返回安全检查；再判断是否在工作目录/允许规则内。被 Bash、PowerShell 与文件工具共用。
 */
function isPathAllowed(path, toolPermissionContext, operationType, pathsToCheck, extraPaths) {
  let permissionType = operationType === "read" ? "read" : "edit";
  let pathsToCheck_2 = pathsToCheck ?? walkPermissionCheckPaths(path);
  let spellings = pathsToCheck_2.spellings;
  let judgedSpellings = extraPaths ? new Set([...spellings, ...extraPaths]) : spellings;
  for (let spelling of judgedSpellings) {
    let denyRule = matchingRuleForInput(spelling, toolPermissionContext, permissionType, "deny");
    if (denyRule !== null)
      return {
        allowed: false,
        decisionReason: {
          type: "rule",
          rule: denyRule,
        },
      };
  }
  if (pathsToCheck_2.unresolved) {
    let reason = unresolvablePathMessage(path);
    if (operationType === "read" && !toolPermissionContext.restricted)
      return toolPermissionContext.blockReadsOutsideWorkingDirectories === true
        ? {
            allowed: false,
            decisionReason: {
              type: "safetyCheck",
              reason,
              classifierApprovable: false,
              circuitBreaker: "outsideReadsBlocked",
            },
          }
        : {
            allowed: false,
            decisionReason: {
              type: "other",
              reason,
            },
          };
    return {
      allowed: false,
      decisionReason: {
        type: "safetyCheck",
        reason,
        classifierApprovable: false,
        ...(toolPermissionContext.restricted && {
          circuitBreaker: "restrictedMode",
        }),
      },
    };
  }
  if (operationType === "read" && outsideReadBlocked(path, toolPermissionContext, spellings))
    return {
      allowed: false,
      decisionReason: {
        type: "safetyCheck",
        reason: OUTSIDE_READS_BLOCKED_DENY_REASON,
        classifierApprovable: false,
        circuitBreaker: "outsideReadsBlocked",
      },
    };
  let internalDenial;
  if (operationType !== "read") {
    let internalEdit = checkEditableInternalPath(path, {}, spellings, {
      restricted: toolPermissionContext.restricted,
    });
    if (internalEdit.behavior === "deny") internalDenial = internalEdit;
    if (internalEdit.behavior === "allow" && internalPathDecisionStands(internalEdit, toolPermissionContext))
      return {
        allowed: true,
        decisionReason: internalEdit.decisionReason,
      };
  }
  if (operationType !== "read") {
    let safety = checkPathSafetyForAutoEdit(
      path,
      spellings,
      undefined,
      remoteConfigEditExemptionApplies(toolPermissionContext),
      toolPermissionContext.trustedNetworkDirectories,
    );
    if (!safety.safe) {
      let sensitiveRedirect = sensitiveWriteRedirect(
        pathsToCheck_2.requested,
        pathsToCheck_2,
        toolPermissionContext,
      );
      let denyWords = internalPathDenyWords(internalDenial?.decisionReason) ?? safety.message;
      let personOnly = hostPersonOnlyTag(internalDenial?.decisionReason);
      let isHardDeniedAsSpelled =
        internalDenial !== undefined &&
        sensitiveRedirect !== null &&
        !hardDeniedAsSpelled(pathsToCheck_2.requested, toolPermissionContext);
      let breaker = toolPermissionContext.restricted
        ? "restrictedMode"
        : (safety.circuitBreaker ?? personOnly);
      let filtered = [
        ...(safety.circuitBreaker !== undefined ? [safety.circuitBreaker] : []),
        ...(safety.also ?? []),
        ...(internalDenial !== undefined ? ["internalHardDeny"] : []),
        ...(personOnly !== undefined ? [personOnly] : []),
      ].filter((reasonKey, index, reasons) => reasonKey !== breaker && reasons.indexOf(reasonKey) === index);
      return {
        allowed: false,
        decisionReason: {
          type: "safetyCheck",
          reason:
            sensitiveRedirect === null
              ? denyWords
              : `${denyWords.endsWith(".") ? denyWords : `${denyWords}.`} ${sensitiveRedirect.sentence}.`,
          ...(toolPermissionContext.restricted
            ? {
                classifierApprovable: false,
                circuitBreaker: "restrictedMode",
              }
            : {
                classifierApprovable:
                  safety.classifierApprovable &&
                  !sensitiveRedirect?.personOnly &&
                  !isHardDeniedAsSpelled &&
                  personOnly === undefined,
                ...(breaker !== undefined && {
                  circuitBreaker: breaker,
                }),
              }),
          ...(filtered.length > 0 && {
            also: filtered,
          }),
        },
      };
    }
  }
  if (internalDenial !== undefined) {
    let internalEditResult = symlinkRedirect(pathsToCheck_2, toolPermissionContext);
    return {
      allowed: false,
      decisionReason: internalDenyShellAskReason(
        internalDenial,
        toolPermissionContext.restricted,
        internalEditResult === null
          ? undefined
          : {
              sentence: symlinkRedirectSentence(pathsToCheck_2.requested, internalEditResult),
              personOnly:
                internalEditResult.carriedOut ||
                !hardDeniedAsSpelled(pathsToCheck_2.requested, toolPermissionContext),
            },
      ),
    };
  }
  let inWorkingDir = pathInAllowedWorkingPath(path, toolPermissionContext, spellings);
  if (inWorkingDir) {
    if (operationType === "read" || toolPermissionContext.mode === "acceptEdits")
      return {
        allowed: true,
      };
  }
  if (operationType === "read") {
    let internalRead = checkReadableInternalPath(path, {}, spellings, {
      restricted: toolPermissionContext.restricted,
    });
    if (internalRead.behavior === "deny")
      return {
        allowed: false,
        decisionReason: untypeDenyReasonForAskPropagation(internalRead.decisionReason),
      };
    if (internalRead.behavior === "allow" && internalPathDecisionStands(internalRead, toolPermissionContext))
      return {
        allowed: true,
        decisionReason: internalRead.decisionReason,
      };
  }
  if (
    operationType !== "read" &&
    !inWorkingDir &&
    !isHttpMcpServeInvocation() &&
    toolPermissionContext.servedCall !== true &&
    !SandboxManager.isOnButNotRunning() &&
    isPathInSandboxWriteAllowlist(path, spellings)
  )
    return {
      allowed: true,
      decisionReason: {
        type: "other",
        reason: "Path is in sandbox write allowlist",
      },
    };
  let allowRule = matchingAllowRuleForAllPaths(spellings, toolPermissionContext, permissionType);
  if (allowRule !== null)
    return {
      allowed: true,
      decisionReason: {
        type: "rule",
        rule: allowRule,
      },
    };
  if (operationType !== "read") {
    let internalReadResult = symlinkRedirect(pathsToCheck_2, toolPermissionContext);
    if (internalReadResult?.carriedOut)
      return {
        allowed: false,
        isInWorkingDir: inWorkingDir,
        decisionReason: {
          type: "safetyCheck",
          reason: symlinkRedirectSentence(pathsToCheck_2.requested, internalReadResult),
          classifierApprovable: false,
        },
      };
  }
  return {
    allowed: false,
    isInWorkingDir: inWorkingDir,
    refusedByDefault: true,
  };
}
//@ chunk-fq0cr76a.js:1068271-1068354 layout
function hasAnyDenyRules(toolPermissionContext) {
  return Object.values(toolPermissionContext.alwaysDenyRules).some(
    (alwaysDenyRule) => (alwaysDenyRule?.length ?? 0) > 0,
  );
}
//@ chunk-fq0cr76a.js:1068354-1068603 layout
function checkGlobWriteAllowed(filePath, cwd, toolPermissionContext, operationType) {
  let fsImplementation = getFsImplementation();
  let globBaseDirectory = getGlobBaseDirectory(filePath);
  let globBaseDir = isAbsolute(globBaseDirectory) ? globBaseDirectory : resolve(cwd, globBaseDirectory);
  let currentPath = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
  for (;;) {
    let { resolvedPath, isSymlink, isCanonical } = safeResolvePath(fsImplementation, currentPath);
    let parentDir = dirname(currentPath);
    if (isCanonical || currentPath === globBaseDir || parentDir === currentPath)
      return {
        ...isPathAllowed(
          resolvedPath,
          toolPermissionContext,
          operationType,
          isCanonical ? resolvedSpellingWalk(resolvedPath) : undefined,
          isCanonical && isSymlink && hasAnyDenyRules(toolPermissionContext)
            ? getPathsForPermissionCheck(currentPath)
            : undefined,
        ),
        resolvedPath,
      };
    currentPath = parentDir;
  }
}
//@ chunk-fq0cr76a.js:1068603-1068856 layout
var WINDOWS_DRIVE_ROOT = /^[A-Za-z]:\/?$/;
var WINDOWS_DRIVE_TOP_DIR_RE = /^[A-Za-z]:\/[^/]+$/;
var WINDOWS_DRIVE_PREFIX_RE = /^[A-Za-z]:\//;
var UNC_ADMIN_SHARE = /^\\\\([^\\]+)\\([a-z])\$(?=$|\\)/;
var MACOS_VOL_FILE_PATH_RE = /^\/\.(?:vol|file)(?:\/|$)/i;
var WINDOWS_ABSOLUTE_PREFIX_RE = /^(?:[A-Za-z]:[\\/]|[\\/]{2}|[\\/]\?\?[\\/])/;
var WINDOWS_DEVICE_OR_ADMIN_PATH_RE = /^[\\/]{2}(?:[?.][\\/]|;|[^\\/]+[\\/]admin\$(?=$|[\\/]))/i;
//@ chunk-fq0cr76a.js:1068856-1069027 facade-exports = getReservedShortcuts (1)
/**
 * 判断路径（含各种拼写）是否为受保护系统路径：Windows 设备或管理路径、macOS /.vol 等内核重定向路径、其他系统根。旧版名 getReservedShortcuts 误配。
 */
function isDangerousRemovalPath(resolvedPath) {
  return isDangerousRemovalPath_2(resolvedPath).some((path) => {
    let normalizedPath = normalizePathForRules(path);
    if (WINDOWS_DEVICE_OR_ADMIN_PATH_RE.test(normalizedPath) || isSuspiciousUncHost(normalizedPath))
      return true;
    let inputPath = normalizedPath.replace(/[\\/]+/g, "/");
    if (getPlatform() === "macos" && MACOS_VOL_FILE_PATH_RE.test(inputPath)) return true;
    return isBroadSandboxWritePath(inputPath);
  });
}
//@ chunk-fq0cr76a.js:1069027-1069309 file-local
function isDangerousRemovalPath_2(resolvedPath) {
  let variants = [
    resolvedPath,
    resolvedPath
      .split("/")
      .filter((segment, index) => segment !== "." || index === 0)
      .join("/") || (resolvedPath.startsWith("/") ? "/" : ""),
  ];
  if (WINDOWS_ABSOLUTE_PREFIX_RE.test(resolvedPath) || getPlatform() === "windows")
    for (let spelling of uniq([resolvedPath, normalizeWindowsDevicePath(resolvedPath)]))
      variants.push(
        ...expandAdminSharePath(normalizeWindowsPathForCompare(spelling)),
        ...expandAdminSharePath(
          normalizeWindowsPathForCompare(
            spelling.replace(/[^\\/]+/g, (segment) => {
              let parentDir = stripTrailingDotsSpaces(segment);
              return parentDir === "." || parentDir === ".." ? parentDir : segment;
            }),
          ),
        ),
      );
  return uniq(variants);
}
//@ chunk-fq0cr76a.js:1069309-1069428 layout
function expandAdminSharePath(sharePath) {
  let match = UNC_ADMIN_SHARE.exec(sharePath);
  return match !== null && classifyUncHost(match[1]) === "own_host"
    ? [sharePath, `${match[2]}:${sharePath.slice(match[0].length) || "\\"}`]
    : [sharePath];
}
//@ chunk-fq0cr76a.js:1069428-1069468 layout
function classifyUncHost(host) {
  return classifyUncPath(`\\\\${host}\\`);
}
//@ chunk-fq0cr76a.js:1069468-1069608 layout
function isSuspiciousUncHost(path) {
  if (!/^[\\/]{2}/.test(path)) return false;
  let match = UNC_ADMIN_SHARE.exec(normalizeWindowsPathForCompare(path));
  let hostKind = match === null ? undefined : classifyUncHost(match[1]);
  return hostKind === "numeric_host" || hostKind === "odd_host";
}
//@ chunk-fq0cr76a.js:1069608-1070312 layout
/**
 * 沙箱写允许路径是否过于宽泛：通配、根目录、盘符根、主目录（含真实路径与管理共享形式）及其祖先、根下一级目录。
 */
function isBroadSandboxWritePath(inputPath) {
  if (inputPath === "*" || inputPath.endsWith("/*")) return true;
  let isMacos = getPlatform() === "macos";
  let stripPrivatePrefix = (path) =>
    isMacos ? path.replace(/^\/private\/(etc|var|tmp|home)(\/|$)/i, "/$1$2") : path;
  let strippedPath = stripPrivatePrefix(inputPath);
  let normalized = strippedPath === "/" ? strippedPath : strippedPath.replace(/\/$/, "");
  if (normalized === "/") return true;
  if (WINDOWS_DRIVE_ROOT.test(normalized)) return true;
  let replaced = stripPrivatePrefix(normalizePathForRules(homedir()).replace(/[\\/]+/g, "/")).replace(
    /\/$/,
    "",
  );
  if (normalizeCaseForComparison_2(normalized) === normalizeCaseForComparison_2(replaced)) return true;
  let canonicalHome = getCanonicalHomedir(homedir());
  let homeSpellings = uniq([
    replaced,
    canonicalHome,
    ...(/^[\\/]{2}/.test(homedir())
      ? expandAdminSharePath(normalizeWindowsPathForCompare(normalizeWindowsDevicePath(homedir()))).map(
          (sharePath) => sharePath.replace(/[\\/]+/g, "/").replace(/\/$/, ""),
        )
      : []),
  ]);
  if (
    homeSpellings.some(
      (homeSpelling) =>
        homeSpelling !== replaced &&
        normalizeCaseForComparison_2(normalized) === normalizeCaseForComparison_2(homeSpelling),
    )
  )
    return true;
  for (let homeSpelling of homeSpellings) {
    let drivePrefix = WINDOWS_DRIVE_PREFIX_RE.exec(homeSpelling)?.[0];
    if (
      drivePrefix !== undefined &&
      normalizeCaseForComparison_2(normalized.slice(0, drivePrefix.length)) ===
        normalizeCaseForComparison_2(drivePrefix) &&
      profileRelativeRemainders(
        homeSpelling.slice(drivePrefix.length),
        normalized.slice(drivePrefix.length),
      ).some((remainder) => remainder.length === 0)
    )
      return true;
  }
  if (dirname(normalized) === "/") return true;
  if (WINDOWS_DRIVE_TOP_DIR_RE.test(normalized)) return true;
  return false;
}
//@ chunk-fq0cr76a.js:1070312-1070370 layout
function normalizePathForRules(inputPath) {
  return normalizeDosDevicePath(
    uncAdminShareToDrive(normalizeWindowsDevicePath(inputPath).replace(WSL_MNT_UNC_RE, "$1:")),
  );
}
//@ chunk-fq0cr76a.js:1070370-1070550 layout
function getCanonicalHomedir(homeDir) {
  let { canonicalHomedirByHome } = getSessionPathsCache();
  let cached = canonicalHomedirByHome.get(homeDir);
  if (cached !== undefined) return cached;
  let replaced = normalizePathForRules(safeResolvePath(getFsImplementation(), homeDir).resolvedPath)
    .replace(/[\\/]+/g, "/")
    .replace(/\/$/, "");
  canonicalHomedirByHome.set(homeDir, replaced);
  return replaced;
}
//@ chunk-fq0cr76a.js:1070550-1070640 facade-exports
/**
 * 按 / 切分路径段；Windows 上同时按 \ 和 / 切分并合并两种结果。
 */
function shellPathSegments(inputPath) {
  let parts = inputPath.split(/\/+/);
  return getPlatform() === "windows" ? [...inputPath.split(/[\\/]+/), ...parts] : parts;
}
//@ chunk-fq0cr76a.js:1070640-1070794 facade-exports
/**
 * 路径中是否有出现在普通段之后的 ..（向上逃逸），开头的 .. 不算。
 */
function hasInteriorDotDot(inputPath) {
  let parts = inputPath.split(getPlatform() === "windows" ? /[\\/]/ : "/");
  let sawNamedSegment = false;
  for (let segment of parts) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (sawNamedSegment) return true;
    } else sawNamedSegment = true;
  }
  return false;
}
//@ chunk-fq0cr76a.js:1070794-1070981 facade-exports
/**
 * 是否在 glob 字符（或未闭合的 [）之后出现 ..，这种路径无法静态确定落点，需人工确认。
 */
function globBeforeInteriorDotDot(inputPath) {
  let parts = inputPath.split(/[\\/]+/);
  return parts.some((segment, index) => {
    if (segment !== "..") return false;
    let joined = parts.slice(0, index).join("/");
    return (
      firstGlobCharIndex(joined) !== -1 ||
      (joined.includes("[") &&
        parts
          .slice(index + 1)
          .join("/")
          .includes("]"))
    );
  });
}
//@ chunk-fq0cr76a.js:1070981-1071093 layout
function hasReadDenyRule(toolPermissionContext) {
  return Object.values(toolPermissionContext.alwaysDenyRules).some((alwaysDenyRule) =>
    alwaysDenyRule?.some(
      (ruleString) => ruleString === FILE_READ_TOOL_NAME || ruleString.startsWith(`${FILE_READ_TOOL_NAME}(`),
    ),
  );
}
//@ chunk-fq0cr76a.js:1071093-1071666 callgraph-fingerprint = isPathAllowed (0.429)
/**
 * 处理含 “目录/..” 的路径：逐段解析符号链接后再判定（Windows 直接 undefined）；读操作若 .. 前有 glob 且开启了外部读拦截或有 Read deny 规则，返回不可判定的 safetyCheck。
 */
function checkTraversalPath(path, cwd, toolPermissionContext, operationType) {
  if (getPlatform() === "windows") return;
  let traversalAndCheck = resolveTraversalAndCheck(path, cwd, toolPermissionContext, operationType);
  if (
    operationType === "read" &&
    traversalAndCheck?.decisionReason?.type !== "rule" &&
    globBeforeInteriorDotDot(path) &&
    (toolPermissionContext.blockReadsOutsideWorkingDirectories === true ||
      hasReadDenyRule(toolPermissionContext))
  )
    return {
      allowed: false,
      resolvedPath: path,
      decisionReason: {
        type: "safetyCheck",
        reason: `A glob before the '..' in '${path}' is expanded by the shell before the path is opened, so the target cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories) or the Read deny rules. Spell the path without the glob.`,
        classifierApprovable: false,
        circuitBreaker: "outsideReadsBlocked",
      },
    };
  return traversalAndCheck;
}
//@ chunk-fq0cr76a.js:1071666-1072315 layout
function resolveTraversalAndCheck(path, cwd, toolPermissionContext, operationType) {
  let fsImplementation = getFsImplementation();
  let absoluteInput = isAbsolute(path) ? path : `${cwd}/${path}`;
  let base = "/";
  let pending = [];
  for (let segment of absoluteInput.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment !== "..") {
      pending.push(segment);
      continue;
    }
    if (pending.length > 0) {
      let resolved = safeResolvePath(fsImplementation, resolve(base, ...pending));
      if (!resolved.isCanonical) return;
      base = resolved.resolvedPath;
      pending = [];
    }
    base = dirname(base);
  }
  let targetPath = resolve(base, ...pending);
  if (operationType !== "read") {
    let walk = {
      ...walkPermissionCheckPaths(targetPath),
      requested: absoluteInput,
    };
    let verdict = isPathAllowed(
      walk.unresolved ? targetPath : walk.landing,
      toolPermissionContext,
      operationType,
      walk,
    );
    if (verdict.allowed || (verdict.isInWorkingDir === true && verdict.decisionReason === undefined)) return;
    let redirect = symlinkRedirect(walk, toolPermissionContext);
    return {
      ...verdict,
      resolvedPath: redirect?.carriedOut ? redirect.landing : targetPath,
    };
  }
  let { resolvedPath, isCanonical } = safeResolvePath(fsImplementation, targetPath);
  let verdict = isPathAllowed(
    resolvedPath,
    toolPermissionContext,
    operationType,
    isCanonical ? resolvedSpellingWalk(resolvedPath) : undefined,
  );
  if (verdict.allowed || (verdict.isInWorkingDir === true && verdict.decisionReason === undefined)) return;
  return {
    ...verdict,
    resolvedPath,
  };
}
//@ chunk-fq0cr76a.js:1072315-1073578 facade-exports = validatePath (0.837)
/**
 * Bash/PowerShell 路径参数校验入口：UNC、~user/~+/~-、$ % ` = 等 shell 展开、目录后的 .. 遍历、写目标含花括号、写目标含 glob 一律要人工确认；读的 glob 按基目录判定；其余解析为绝对路径后交给 isPathAllowed。返回 {allowed, resolvedPath, decisionReason}。
 */
function validatePath(path, cwd, toolPermissionContext, operationType) {
  let cleanPath = expandTildeWithHome(path);
  if (containsVulnerableUncPath(cleanPath, true))
    return {
      allowed: false,
      resolvedPath: cleanPath,
      decisionReason: {
        type: "other",
        reason: "UNC network paths require manual approval",
      },
    };
  if (cleanPath.startsWith("~"))
    return {
      allowed: false,
      resolvedPath: cleanPath,
      decisionReason: {
        type: "other",
        reason: "Tilde expansion variants (~user, ~+, ~-) in paths require manual approval",
      },
    };
  if (
    cleanPath.includes("$") ||
    (getPlatform() === "windows" && cleanPath.includes("%")) ||
    cleanPath.includes("`") ||
    cleanPath.startsWith("=")
  )
    return {
      allowed: false,
      resolvedPath: cleanPath,
      decisionReason: {
        type: "other",
        reason: "Shell expansion syntax in paths requires manual approval",
      },
    };
  if (hasInteriorDotDot(cleanPath))
    return (
      checkTraversalPath(cleanPath, cwd, toolPermissionContext, operationType) ?? {
        allowed: false,
        resolvedPath: cleanPath,
        decisionReason: {
          type: "other",
          reason:
            "Path contains '..' traversal after a directory segment, which may follow a symlink outside the working directory",
        },
      }
    );
  if ((operationType === "write" || operationType === "create") && BRACE_PATTERN.test(cleanPath))
    return {
      allowed: false,
      resolvedPath: cleanPath,
      decisionReason: {
        type: "other",
        reason:
          "Brace characters in write target require manual approval \u2014 bash may brace-expand to paths outside the working directory",
      },
    };
  if (firstGlobCharIndex(cleanPath) !== -1) {
    if (operationType === "write" || operationType === "create")
      return {
        allowed: false,
        resolvedPath: cleanPath,
        decisionReason: {
          type: "other",
          reason: "Glob patterns are not allowed in write operations. Please specify an exact file path.",
        },
      };
    return checkGlobWriteAllowed(cleanPath, cwd, toolPermissionContext, operationType);
  }
  let absolutePath = isAbsolute(cleanPath) ? cleanPath : resolve(cwd, cleanPath);
  return validateResolvedOperand(absolutePath, toolPermissionContext, operationType);
}
//@ chunk-fq0cr76a.js:1073578-1073878 facade-exports
/**
 * 对一个已展开的 Shell 路径参数做许可判定：写操作按符号链接落点检查并在被拒时给出实际落点；读操作先解析真实路径，必要时连同原拼写一起交给 isPathAllowed。
 */
function validateResolvedOperand(inputPath, toolPermissionContext, operationType) {
  if (operationType !== "read") {
    let walk = walkPermissionCheckPaths(inputPath);
    let targetPath = walk.unresolved ? inputPath : walk.landing;
    let verdict = isPathAllowed(targetPath, toolPermissionContext, operationType, walk);
    let redirect = verdict.allowed ? null : symlinkRedirect(walk, toolPermissionContext);
    return {
      ...verdict,
      resolvedPath: redirect?.carriedOut ? redirect.landing : inputPath,
    };
  }
  let { resolvedPath, isSymlink, isCanonical } = safeResolvePath(getFsImplementation(), inputPath);
  return {
    ...isPathAllowed(
      resolvedPath,
      toolPermissionContext,
      operationType,
      isCanonical ? resolvedSpellingWalk(resolvedPath) : undefined,
      isCanonical && isSymlink && hasAnyDenyRules(toolPermissionContext)
        ? getPathsForPermissionCheck(inputPath)
        : undefined,
    ),
    resolvedPath,
  };
}
//@ chunk-s61vbvea.js:208056-208075 placement
/**
 * GLOB_PATTERN_REGEX：同旧版 utils/permissions/pathValidation.ts（误归 commands.ts）。
 */
var GLOB_PATTERN_REGEX = /[*?[\]{}]/;
//@ chunk-s61vbvea.js:208075-208341 placement = getCommands (0.674)
/**
 * getGlobBaseDirectory：同旧版 pathValidation.getGlobBaseDirectory；旧版名 getCommands 配错。
 */
function getGlobBaseDirectory_2(path) {
  if (!isAbsolute(path)) return null;
  let isWindows = getPlatform() === "windows";
  let parts = path.split(isWindows ? /[\\/]/ : "/");
  let globIndex = parts.findIndex((part) => GLOB_PATTERN_REGEX.test(part));
  let base = (globIndex === -1 ? parts : parts.slice(0, globIndex))
    .join(isWindows ? "\\" : "/")
    .replace(isWindows ? /[\\/]+$/ : /\/+$/, "");
  if (base === "") return parse(path).root || "/";
  return isWindows && /^[A-Za-z]:$/.test(base) ? `${base}\\` : base;
}
export {
  isPathAllowed,
  hasInteriorDotDot,
  validatePath,
  shellPathSegments,
  globBeforeInteriorDotDot,
  isPathInSandboxWriteAllowlist,
  getGlobBaseDirectory_2,
  formatDirectoryList,
  internalPathDenyWords,
  hostPersonOnlyTag,
  internalDenyShellAskReason,
  isDangerousRemovalPath,
  validateResolvedOperand,
  isOnlyOutsideWorkingFoldersRefusal,
  getGlobBaseDirectory,
};
