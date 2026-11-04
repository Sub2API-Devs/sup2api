/**
 * services/artifacts/publishReadChecks.ts
 *
 * Artifact 发布读权限与路径检查（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0wdgqhcf.js (21)
 * attribution: placement 21
 */
import { dirname, isAbsolute, sep } from "path";
import { lstatSync } from "fs";
import {
  hasSuspiciousWindowsPathPattern,
  readPermissionDecisionForPath,
  isReadGateSafetyAsk,
  checkReadPermissionForTool,
  READ_PATH_PROBE,
  pathInAllowedWorkingPath,
  symlinkLanding,
  getResolvedWorkingDirPaths,
  isScratchpadPath,
  pathInWorkingPath,
} from "../../utils/permissions/filesystem.js";
import {
  checkAttachmentForPublish,
  publishingReadDeniedText,
  isVerifiedAttachment,
} from "./publishSource.js";
import {
  getDenyRuleForTool,
  getAskRuleForTool,
  getAskRules,
  toolMatchesRule,
} from "../../utils/permissions/permissions.js";
import {
  statFileIdentity,
  resolveLocalUploadPath,
  probeSymlink,
} from "../../tools/ArtifactTool/actions/uploadAsset.js";
import { env } from "../../utils/env.js";
import { isDifferentPath } from "../../utils/path.js";
import { truncatePathMiddle } from "../../utils/format.js";
import {
  sweptPagePath,
  foldClassifierCodePhrases,
  withEdgeBlanksMarked,
  foldedForSurface,
  markedForBracketFold,
  spacedFromClosingQuote,
} from "../../tools/ArtifactTool/artifactUrls.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { isENOENT, getErrnoCode, isAbortError } from "../../utils/errors.js";
import { getPathsForPermissionCheck, walkPermissionCheckPaths } from "../../utils/fsOperations.js";
import { isSentinelInode, jsonStringify } from "../../utils/slowOperations.js";
import { MAX_ARTIFACT_BYTES } from "./frameFlags.js";
import {
  isArbiterRole,
  getAutoModeClassifierRole,
} from "../../utils/permissions/serverClassifier/arbiter.js";
import { sanitizeDisplayText } from "./capabilityDeclaration.js";
import { getPlatform } from "../../utils/platform.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { getAnnouncedDirectories } from "../../utils/announcedDirectories.js";
import { ARTIFACT_TOOL_NAME, ARTIFACT_DATA_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { isAgentSdkEntrypoint } from "../../utils/entrypointKinds.js";
import { analyzeTurnTail } from "../../utils/turnOrigin.js";
import {
  hasModuleHookingSite,
  getLoadedModulesForSite,
} from "../../plugins/hooksModules/loadedModuleFilters.js";
import { matcherTestTarget } from "../../utils/hooks/matcherGrammar.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { managedTierHooks, hasHookForEvent } from "../../utils/hooks.js";
import { dispatchClassicEvent } from "../../plugins/functionHooks/modAdmission.js";
import { registerAgent } from "../../utils/telemetry/perfettoTracing.js";
import { logError } from "../../utils/log.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { meIdCooldown } from "./artifactDb.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0wdgqhcf.js:45344-45362 placement
var MAX_READ_CHECK_PATH_CHARS = 4096;
var MAX_READ_CHECK_DEPTH = 32;
//@ chunk-0wdgqhcf.js:45362-45617 placement
/**
 * 沿路径向上逐级检查读取权限：遇到非 ask 决定即停（working-dir 原因视为可放行），安全类 ask 则继续上溯；路径过长或层数用尽返回 true。
 */
function isAskOnlyForWorkingDir(path, options) {
  if (path.length > MAX_READ_CHECK_PATH_CHARS) return true;
  let depth = 0;
  for (
    let previous = path, dir = dirname(path);
    dir !== previous && depth < MAX_READ_CHECK_DEPTH;
    previous = dir, dir = dirname(dir), depth += 1
  ) {
    if (hasSuspiciousWindowsPathPattern(dir, options.trustedNetworkDirectories)) continue;
    let permissionDecisionForPath = readPermissionDecisionForPath(dir, options);
    if (permissionDecisionForPath.behavior !== "ask") return false;
    if (!isReadGateSafetyAsk(permissionDecisionForPath))
      return permissionDecisionForPath.decisionReason?.type === "workingDir";
  }
  return true;
}
//@ chunk-0wdgqhcf.js:45617-46028 placement
/**
 * 读取权限因"不在工作目录"而询问时，若真实路径属于本会话的聊天附件目录，改为允许（并标记按目录暂存）；同时传递路径固定信息。
 */
function allowChatAttachmentRead(read, path, resolved, localUploadPath, pin) {
  if (read.behavior !== "ask" || read.decisionReason?.type !== "workingDir" || resolved.kind !== "resolved")
    return {
      read,
      pin,
    };
  let {
    inside,
    pin: pin_2,
    byDirectory,
  } = checkAttachmentForPublish(path, resolved.real, localUploadPath, pin);
  if (!inside)
    return {
      read,
      pin: pin_2 ?? pin,
    };
  return {
    ...(byDirectory && {
      stagedByDirectory: true,
    }),
    read: {
      behavior: "allow",
      decisionReason: {
        type: "other",
        reason:
          "The file is one of this session's chat attachments, which count as inside the working directories",
      },
    },
    pin: pin_2,
  };
}
//@ chunk-0wdgqhcf.js:46028-47226 placement
function checkPublishReadPermission(
  tool,
  path,
  realPath,
  pinInfo,
  toolPermissionContext,
  field,
  ruleLabel,
  emptyReason = "",
) {
  let { read, pin, stagedByDirectory } = allowChatAttachmentRead(
    checkReadPermissionForTool(tool, path, toolPermissionContext),
    realPath,
    pinInfo,
    toolPermissionContext,
    field,
  );
  if (read.behavior === "deny")
    return {
      refused: read,
    };
  let denyRuleForTool = getDenyRuleForTool(toolPermissionContext, READ_PATH_PROBE);
  if (denyRuleForTool)
    return {
      refused: {
        behavior: "deny",
        message: publishingReadDeniedText(ruleLabel, denyRuleForTool, emptyReason),
        decisionReason: {
          type: "rule",
          rule: denyRuleForTool,
        },
      },
    };
  let askRuleForTool = getAskRuleForTool(toolPermissionContext, READ_PATH_PROBE);
  let outsideWorkingDir = pathInAllowedWorkingPath(realPath, toolPermissionContext, [realPath]);
  let denyRule =
    pinInfo.kind === "resolved" && pinInfo.real !== realPath
      ? readPermissionDecisionForPath(pinInfo.real, toolPermissionContext)
      : undefined;
  if (denyRule?.behavior === "deny")
    return {
      refused: {
        ...denyRule,
        message: outsideWorkingDir
          ? `Permission to read ${realPath} has been denied (it resolves, through a symbolic link, to a path a Read rule denies).`
          : `Permission to read ${realPath} has been denied.`,
      },
    };
  let identity = pin ?? (pinInfo.kind === "resolved" ? statFileIdentity(pinInfo.real) : undefined);
  let readAsks = read.behavior === "ask" || denyRule?.behavior === "ask" || askRuleForTool !== null;
  let hardLinked = identity?.linked === true;
  if ((readAsks || hardLinked) && env.CLAUDE_CODE_EVAL_CONFINED)
    return {
      refused: {
        behavior: "deny",
        message: `Permission to read ${realPath} has been denied.`,
        decisionReason: {
          type: "other",
          reason: "source outside the readable set in an evaluation run",
        },
      },
    };
  let askedOnlyForDir =
    pinInfo.kind === "resolved" &&
    isReadGateSafetyAsk(denyRule) &&
    !pathInAllowedWorkingPath(pinInfo.real, toolPermissionContext, [pinInfo.real]) &&
    isAskOnlyForWorkingDir(pinInfo.real, toolPermissionContext);
  let flaggedOutside =
    (isReadGateSafetyAsk(read) &&
      !outsideWorkingDir &&
      isAskOnlyForWorkingDir(realPath, toolPermissionContext)) ||
    askedOnlyForDir;
  let flaggedResolvesOutside = outsideWorkingDir && askedOnlyForDir;
  return {
    mode: toolPermissionContext.mode,
    read,
    bareReadAsk: askRuleForTool,
    spelledInside: outsideWorkingDir,
    pinRead: denyRule,
    sourcePin: identity,
    readAsks,
    hardLinked,
    flaggedOutside,
    flaggedResolvesOutside,
    resolvesElsewhere: pinInfo.kind === "resolved" && isDifferentPath(realPath, pinInfo.real),
    stagedUpload: stagedByDirectory === true,
  };
}
//@ chunk-0wdgqhcf.js:47226-47295 placement
/**
 * 导出函数 `needsReadAsk`：参数 e, t，返回 e.readAsks || e.hardLinked || e.stagedUpload || t。
 */
function needsReadAsk(flags, extraAsk) {
  return flags.readAsks || flags.hardLinked || flags.stagedUpload || extraAsk;
}
//@ chunk-0wdgqhcf.js:47295-48208 placement
function describePublishPath(toolUseContext, info) {
  let { read, pinRead, bareReadAsk, spelledInside, hardLinked, flaggedOutside, flaggedResolvesOutside } =
    info;
  let askPath = truncatePathMiddle(sweptPagePath(toolUseContext) || "(unprintable path)", 1024);
  let readAsk = read.behavior === "ask" ? read : undefined;
  let pinAsk = pinRead?.behavior === "ask" ? pinRead : undefined;
  let pathAsk = readAsk ?? pinAsk;
  let insideSpelled =
    readAsk?.decisionReason?.type === "workingDir" || pinAsk?.decisionReason?.type === "workingDir";
  let resolvesOutside = (insideSpelled && spelledInside) || flaggedResolvesOutside;
  let safetyAsk = isReadGateSafetyAsk(readAsk) || isReadGateSafetyAsk(pinAsk);
  let outside = resolvesOutside
    ? " (it resolves, through a symbolic link, outside this session\u2019s allowed read paths)"
    : insideSpelled
      ? " (outside this session\u2019s allowed read paths)"
      : safetyAsk
        ? " (a path spelling that can name a different file than it appears to)"
        : "";
  let linkNote =
    hardLinked && !insideSpelled && !flaggedOutside
      ? " (a hard link: the same file may also live elsewhere on this machine)"
      : "";
  let readRule =
    readAsk?.decisionReason?.type === "rule"
      ? readAsk.decisionReason
      : pinAsk?.decisionReason?.type === "rule"
        ? pinAsk.decisionReason
        : bareReadAsk
          ? {
              type: "rule",
              rule: bareReadAsk,
            }
          : undefined;
  return {
    askPath,
    outside,
    linkNote,
    outsideAsk: insideSpelled,
    resolvesOutside,
    flaggedSpelling: safetyAsk,
    flaggedOutside,
    pathAsk,
    readRule,
  };
}
//@ chunk-0wdgqhcf.js:48208-49069 placement
function readPublishFile(path, realPath, toolPermissionContext, resolved, toolUseContext, fieldInfo) {
  let localUploadPath = getToolPermissionContext(toolUseContext);
  let { read } = allowChatAttachmentRead(
    checkReadPermissionForTool(path, realPath, localUploadPath),
    toolPermissionContext,
    resolved,
    localUploadPath,
    undefined,
  );
  if (
    read.behavior !== "allow" ||
    getDenyRuleForTool(localUploadPath, READ_PATH_PROBE) !== null ||
    getAskRuleForTool(localUploadPath, READ_PATH_PROBE) !== null
  )
    return {
      result: true,
    };
  let readFailure = (error) => ({
    result: false,
    message: isENOENT(error)
      ? `File not found: ${toolPermissionContext}.`
      : `cannot read ${fieldInfo.field ?? "file_path"} (${getErrnoCode(error) ?? "unexpected error"})`,
    errorCode: 2,
  });
  if (resolved.kind === "unresolved")
    return getPathsForPermissionCheck(toolPermissionContext)
      .slice(1)
      .every((dir) => readPermissionDecisionForPath(dir, localUploadPath).behavior === "allow")
      ? readFailure(resolved.error)
      : {
          result: true,
        };
  try {
    let { real } = resolved;
    if (
      real !== toolPermissionContext &&
      readPermissionDecisionForPath(real, localUploadPath).behavior !== "allow"
    )
      return {
        result: true,
      };
    let stat = lstatSync(real);
    if (stat.isSymbolicLink())
      return {
        result: true,
      };
    if (!stat.isFile())
      return {
        result: false,
        message: `${fieldInfo.notAFile}.`,
        errorCode: 2,
      };
    if (isSentinelInode(stat.ino))
      return {
        result: false,
        message: `${fieldInfo.noIdentity}.`,
        errorCode: 18,
      };
    if (stat.size > fieldInfo.maxBytes)
      return {
        result: false,
        message: fieldInfo.tooLarge(stat.size, fieldInfo.maxBytes),
        errorCode: 3,
      };
    if (stat.size === 0)
      return {
        result: false,
        message: `${fieldInfo.empty}.`,
        errorCode: 3,
      };
  } catch (error) {
    return readFailure(error);
  }
  return {
    result: true,
  };
}
//@ chunk-0wdgqhcf.js:49069-49315 placement
/**
 * 页面过大时的错误说明（实际大小与上限 MB），建议把大的内联资源移出。
 */
function describeTooLargePage(bytes) {
  return `too large: ${Math.ceil(bytes / 1024 / 1024)}MB (max ${MAX_ARTIFACT_BYTES / 1024 / 1024}MB). Shrink the page \u2014 move large inline assets (base64 images, embedded datasets) out of it or split the content across several artifacts \u2014 then retry.`;
}
//@ chunk-0wdgqhcf.js:49315-49770 placement
function findNulByte(field, text) {
  let index = text.indexOf("\x00");
  if (index === -1) return;
  let lines = text.slice(0, index).split(`
`);
  let location = `line ${lines.length}, column ${(lines.at(-1) ?? "").length + 1}`;
  return `${jsonStringify(field)} contains a NUL (\\u0000) byte at ${location}: it was published, but browsers turn that byte into U+FFFD (\uFFFD), and in script code outside a string literal that is a syntax error that stops the whole script \u2014 remove it (or write the escape \\u0000 if the character is meant) and publish again.`;
}
//@ chunk-0wdgqhcf.js:49815-49855 placement
/**
 * 导出函数 `classifierGated`：参数 e，返回 sse(getAutoModeClassifierRole(e)) || br()。
 */
function classifierGated(mode) {
  return isArbiterRole(getAutoModeClassifierRole(mode)) || alwaysFalseReadChecks();
}
//@ chunk-0wdgqhcf.js:49855-49878 placement
function alwaysFalseReadChecks() {
  return false;
}
//@ chunk-0wdgqhcf.js:49878-49954 placement
function quotedSurfaceText(surfaceText) {
  let folded = foldClassifierCodePhrases(
    withEdgeBlanksMarked(
      foldedForSurface(
        sanitizeDisplayText(markedForBracketFold(surfaceText), {
          max: 1024,
        }),
      ),
    ),
  );
  return `"${spacedFromClosingQuote(folded)}"`;
}
//@ chunk-0wdgqhcf.js:49954-50416 placement
/**
 * 为发布文件路径生成提示标注：解析到的真实路径、符号链接、硬链接，以及位于上传目录/工作目录之外/无法确定位置。
 */
function describePathAnnotations(path) {
  let notes = [];
  try {
    let localUploadPath = resolveLocalUploadPath(path);
    let real = localUploadPath.kind === "resolved" ? localUploadPath.real : undefined;
    if (real !== undefined && isDifferentPath(path, real))
      notes.push(`[resolves to ${quotedSurfaceText(real)}]`);
    if (localUploadPath.kind !== "network") {
      let probe = probeSymlink(path);
      if (probe.unreadable === null && probe.link) notes.push("[symbolic link]");
    }
    if (real !== undefined && statFileIdentity(real).linked === true)
      notes.push("[hard-linked file: the same bytes may also live elsewhere]");
  } catch {
    notes.push("[could not examine this path for links]");
  }
  notes.push(...describePathLocation(path).map((note) => `[${note}]`));
  return notes.length === 0 ? "" : ` ${notes.join(" ")}`;
}
//@ chunk-0wdgqhcf.js:50416-50590 placement
function describePathLocation(path) {
  try {
    if (isVerifiedAttachment(path)) return ["in this session's uploads folder"];
    return isWithinWorkingDirs(path) ? [] : ["outside the session's working directories"];
  } catch {
    return ["location not determined"];
  }
}
//@ chunk-0wdgqhcf.js:50590-50655 placement
/**
 * 导出常量或表 `MAX_HOSTS`：值为 32, Vjn = 8, bn = new Set(["ENOENT", "ENOTDIR", "ENAMETOOLONG"])。
 */
var MAX_HOSTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_ANCHORS;
var MISSING_PATH_ERRNOS;
deferInit("chunk-0wdgqhcf.js:50590", () => {
  MAX_HOSTS = 32;
  MAX_ANCHORS = 8;
  MISSING_PATH_ERRNOS = new Set(["ENOENT", "ENOTDIR", "ENAMETOOLONG"]);
});
//@ chunk-0wdgqhcf.js:50655-51498 placement
function checkWindowsPathSpelling(pathText, options = {}) {
  let notes = [];
  let caseSensitive = false;
  let network = false;
  let state = "examined";
  try {
    let written = options.written ?? pathText;
    if (hasSuspiciousWindowsPathPattern(isAbsolute(written) ? written : `_${sep}${written}`)) {
      notes.push("a spelling Windows may resolve to another name");
      caseSensitive = getPlatform() === "windows" || getPlatform() === "wsl";
    }
    let localUploadPath = resolveLocalUploadPath(pathText);
    if (localUploadPath.kind === "network") {
      state = "missing";
      network = true;
    } else {
      let probe = probeSymlink(pathText);
      if (probe.unreadable !== null)
        state = MISSING_PATH_ERRNOS.has(probe.unreadable) ? "missing" : "unexaminable";
      else {
        if (probe.link) {
          notes.push("symbolic link");
          caseSensitive = true;
        }
        if (localUploadPath.kind === "resolved") {
          if (isDifferentPath(pathText, localUploadPath.real)) {
            notes.unshift(`resolves to ${quotedSurfaceText(localUploadPath.real)}`);
            caseSensitive = true;
          }
          let identity = statFileIdentity(localUploadPath.real);
          if (identity.identity === null) state = "unexaminable";
          else if (identity.linked === true) {
            notes.push("hard-linked file: the same bytes may also live elsewhere");
            caseSensitive = true;
          }
        } else
          state =
            MISSING_PATH_ERRNOS.has(getErrnoCode(localUploadPath.error) ?? "") && !probe.link
              ? "missing"
              : "unexaminable";
      }
    }
  } catch {
    state = "unexaminable";
  }
  if (state === "unexaminable") notes.push("could not examine this path for links");
  return {
    hidden: notes,
    location: options.location === false || network ? [] : describePathLocation(pathText),
    deceptive: caseSensitive,
    state,
  };
}
//@ chunk-0wdgqhcf.js:51498-51778 placement
/**
 * 为写入目标路径生成提示标注：经链接解析到的位置、是否在工作目录之外，无法确定时注明。
 */
function describeDestinationAnnotations(path, label = "destination") {
  try {
    let notes = [];
    let landing = symlinkLanding(walkPermissionCheckPaths(path));
    if (landing !== null) notes.push(`[${label} resolves through a link to ${quotedSurfaceText(landing)}]`);
    if (!isWithinWorkingDirs(path)) notes.push(`[${label} outside the session's working directories]`);
    return notes.length === 0 ? "" : ` ${notes.join(" ")}`;
  } catch {
    return ` [${label} location not determined]`;
  }
}
//@ chunk-0wdgqhcf.js:51778-51913 placement
function isWithinWorkingDirs(path) {
  let flattened = [getOriginalCwd(), ...getAnnouncedDirectories()].flatMap(getResolvedWorkingDirPaths);
  return getPathsForPermissionCheck(path).every(
    (candidate) =>
      isScratchpadPath(candidate) ||
      flattened.some((workingPath) =>
        pathInWorkingPath(candidate, workingPath, {
          caseFold: false,
          uncShapeParity: true,
        }),
      ),
  );
}
//@ chunk-0wdgqhcf.js:51913-51966 placement
var ARTIFACT_TOOL_RULES; // deferred: uses ARTIFACT_TOOL_NAME (../../tools/ArtifactTool/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0wdgqhcf.js:51913", () => {
  ARTIFACT_TOOL_RULES = [
    {
      name: ARTIFACT_TOOL_NAME,
    },
    {
      name: ARTIFACT_DATA_TOOL_NAME,
      familyParentToolName: ARTIFACT_TOOL_NAME,
    },
  ];
});
//@ chunk-0wdgqhcf.js:51966-52587 placement
function runPublishToolCheck(toolUseContext, isArbiter, skip, message, reason) {
  if (
    skip ||
    !isArbiterRole(getAutoModeClassifierRole(getToolPermissionContext(toolUseContext).mode)) ||
    !isAgentSdkEntrypoint() ||
    analyzeTurnTail(toolUseContext.messages).decider?.scheduledTrigger !== true ||
    !isArbiter()
  )
    return null;
  try {
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    if (
      getAskRules(toolPermissionContext).some((rule) =>
        ARTIFACT_TOOL_RULES.some((toolRule) => toolMatchesRule(toolPermissionContext, toolRule, rule)),
      ) ||
      ARTIFACT_TOOL_RULES.some((toolRule) =>
        hasModuleHookingSite(
          "tool.check",
          {
            ...matcherTestTarget(toolRule),
            agentId: toolUseContext.agentId,
          },
          getLoadedModulesForSite("tool.check"),
        ),
      ) ||
      getPluginRegistry().hooksRespawns.size > 0 ||
      managedTierHooks("PermissionRequest") === "some" ||
      dispatchClassicEvent("PermissionRequest") ||
      hasHookForEvent(
        "PermissionRequest",
        toolUseContext.sessionHooksRegistry,
        registerAgent(toolUseContext, "PermissionRequest", toolUseContext.session.id),
      )
    )
      return null;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return null;
  }
  getLiveState().routineSourceWriteRefused = true;
  return {
    behavior: "deny",
    message,
    decisionReason: {
      type: "safetyCheck",
      reason,
      classifierApprovable: false,
    },
  };
}
//@ chunk-0wdgqhcf.js:52760-53181 placement
/**
 * 说明批量写入会如何执行：服务端不支持批量时逐条按顺序写（中途失败保留已写部分；带版本锁的批量会整体拒绝），否则全有或全无。
 */
function describeBatchWriteSemantics(host, isAsk = false) {
  return host !== undefined && meIdCooldown.of(host).unsupported
    ? isAsk
      ? "applied all-or-nothing if this server now takes batch writes, otherwise refused whole (a version-pinned batch is never applied one at a time)"
      : "applied one at a time in order (this server has no batch write yet); a failure part-way leaves earlier entries written"
    : "applied all-or-nothing where the server supports batches, otherwise one at a time in order";
}
export {
  describeTooLargePage,
  readPublishFile,
  classifierGated,
  checkPublishReadPermission,
  describePublishPath,
  runPublishToolCheck,
  describeBatchWriteSemantics,
  describeDestinationAnnotations,
  describePathAnnotations,
  needsReadAsk,
  MAX_ANCHORS,
  checkWindowsPathSpelling,
  MAX_HOSTS,
  findNulByte,
};
