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

//@ chunk-0wdgqhcf.js:45344-45362 placement
var MAX_READ_CHECK_PATH_CHARS = 4096;
var MAX_READ_CHECK_DEPTH = 32;
//@ chunk-0wdgqhcf.js:45362-45617 placement
/**
 * 沿路径向上逐级检查读取权限：遇到非 ask 决定即停（working-dir 原因视为可放行），安全类 ask 则继续上溯；路径过长或层数用尽返回 true。
 */
function isAskOnlyForWorkingDir(e, t) {
  if (e.length > MAX_READ_CHECK_PATH_CHARS) return true;
  let n = 0;
  for (let r = e, s = dirname(e); s !== r && n < MAX_READ_CHECK_DEPTH; r = s, s = dirname(s), n += 1) {
    if (hasSuspiciousWindowsPathPattern(s, t.trustedNetworkDirectories)) continue;
    let permissionDecisionForPath = readPermissionDecisionForPath(s, t);
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
function allowChatAttachmentRead(e, t, n, r, s) {
  if (e.behavior !== "ask" || e.decisionReason?.type !== "workingDir" || n.kind !== "resolved")
    return {
      read: e,
      pin: s,
    };
  let { inside, pin, byDirectory } = checkAttachmentForPublish(t, n.real, r, s);
  if (!inside)
    return {
      read: e,
      pin: pin ?? s,
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
    pin,
  };
}
//@ chunk-0wdgqhcf.js:46028-47226 placement
function checkPublishReadPermission(tool, t, n, r, s, d, a, h = "") {
  let { read, pin, stagedByDirectory } = allowChatAttachmentRead(
    checkReadPermissionForTool(tool, t, s),
    n,
    r,
    s,
    d,
  );
  if (read.behavior === "deny")
    return {
      refused: read,
    };
  let denyRuleForTool = getDenyRuleForTool(s, READ_PATH_PROBE);
  if (denyRuleForTool)
    return {
      refused: {
        behavior: "deny",
        message: publishingReadDeniedText(a, denyRuleForTool, h),
        decisionReason: {
          type: "rule",
          rule: denyRuleForTool,
        },
      },
    };
  let askRuleForTool = getAskRuleForTool(s, READ_PATH_PROBE);
  let P = pathInAllowedWorkingPath(n, s, [n]);
  let V = r.kind === "resolved" && r.real !== n ? readPermissionDecisionForPath(r.real, s) : undefined;
  if (V?.behavior === "deny")
    return {
      refused: {
        ...V,
        message: P
          ? `Permission to read ${n} has been denied (it resolves, through a symbolic link, to a path a Read rule denies).`
          : `Permission to read ${n} has been denied.`,
      },
    };
  let Q = pin ?? (r.kind === "resolved" ? statFileIdentity(r.real) : undefined);
  let x = read.behavior === "ask" || V?.behavior === "ask" || askRuleForTool !== null;
  let G = Q?.linked === true;
  if ((x || G) && env.CLAUDE_CODE_EVAL_CONFINED)
    return {
      refused: {
        behavior: "deny",
        message: `Permission to read ${n} has been denied.`,
        decisionReason: {
          type: "other",
          reason: "source outside the readable set in an evaluation run",
        },
      },
    };
  let ue =
    r.kind === "resolved" &&
    isReadGateSafetyAsk(V) &&
    !pathInAllowedWorkingPath(r.real, s, [r.real]) &&
    isAskOnlyForWorkingDir(r.real, s);
  let flaggedOutside = (isReadGateSafetyAsk(read) && !P && isAskOnlyForWorkingDir(n, s)) || ue;
  let flaggedResolvesOutside = P && ue;
  return {
    mode: s.mode,
    read,
    bareReadAsk: askRuleForTool,
    spelledInside: P,
    pinRead: V,
    sourcePin: Q,
    readAsks: x,
    hardLinked: G,
    flaggedOutside,
    flaggedResolvesOutside,
    resolvesElsewhere: r.kind === "resolved" && isDifferentPath(n, r.real),
    stagedUpload: stagedByDirectory === true,
  };
}
//@ chunk-0wdgqhcf.js:47226-47295 placement
/**
 * 导出函数 `needsReadAsk`：参数 e, t，返回 e.readAsks || e.hardLinked || e.stagedUpload || t。
 */
function needsReadAsk(e, t) {
  return e.readAsks || e.hardLinked || e.stagedUpload || t;
}
//@ chunk-0wdgqhcf.js:47295-48208 placement
function describePublishPath(sourcePath, t) {
  let { read, pinRead, bareReadAsk, spelledInside, hardLinked, flaggedOutside, flaggedResolvesOutside } = t;
  let askPath = truncatePathMiddle(sweptPagePath(sourcePath) || "(unprintable path)", 1024);
  let y = read.behavior === "ask" ? read : undefined;
  let R = pinRead?.behavior === "ask" ? pinRead : undefined;
  let pathAsk = y ?? R;
  let P = y?.decisionReason?.type === "workingDir" || R?.decisionReason?.type === "workingDir";
  let V = (P && spelledInside) || flaggedResolvesOutside;
  let Q = isReadGateSafetyAsk(y) || isReadGateSafetyAsk(R);
  let outside = V
    ? " (it resolves, through a symbolic link, outside this session\u2019s allowed read paths)"
    : P
      ? " (outside this session\u2019s allowed read paths)"
      : Q
        ? " (a path spelling that can name a different file than it appears to)"
        : "";
  let linkNote =
    hardLinked && !P && !flaggedOutside
      ? " (a hard link: the same file may also live elsewhere on this machine)"
      : "";
  let readRule =
    y?.decisionReason?.type === "rule"
      ? y.decisionReason
      : R?.decisionReason?.type === "rule"
        ? R.decisionReason
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
    outsideAsk: P,
    resolvesOutside: V,
    flaggedSpelling: Q,
    flaggedOutside,
    pathAsk,
    readRule,
  };
}
//@ chunk-0wdgqhcf.js:48208-49069 placement
function readPublishFile(e, t, n, localUploadPath, options, d) {
  let toolPermissionContext = getToolPermissionContext(options);
  let { read } = allowChatAttachmentRead(
    checkReadPermissionForTool(e, t, toolPermissionContext),
    n,
    localUploadPath,
    toolPermissionContext,
    undefined,
  );
  if (
    read.behavior !== "allow" ||
    getDenyRuleForTool(toolPermissionContext, READ_PATH_PROBE) !== null ||
    getAskRuleForTool(toolPermissionContext, READ_PATH_PROBE) !== null
  )
    return {
      result: true,
    };
  let b = (error) => ({
    result: false,
    message: isENOENT(error)
      ? `File not found: ${n}.`
      : `cannot read ${d.field ?? "file_path"} (${getErrnoCode(error) ?? "unexpected error"})`,
    errorCode: 2,
  });
  if (localUploadPath.kind === "unresolved")
    return getPathsForPermissionCheck(n)
      .slice(1)
      .every((y) => readPermissionDecisionForPath(y, toolPermissionContext).behavior === "allow")
      ? b(localUploadPath.error)
      : {
          result: true,
        };
  try {
    let { real } = localUploadPath;
    if (real !== n && readPermissionDecisionForPath(real, toolPermissionContext).behavior !== "allow")
      return {
        result: true,
      };
    let y = lstatSync(real);
    if (y.isSymbolicLink())
      return {
        result: true,
      };
    if (!y.isFile())
      return {
        result: false,
        message: `${d.notAFile}.`,
        errorCode: 2,
      };
    if (isSentinelInode(y.ino))
      return {
        result: false,
        message: `${d.noIdentity}.`,
        errorCode: 18,
      };
    if (y.size > d.maxBytes)
      return {
        result: false,
        message: d.tooLarge(y.size, d.maxBytes),
        errorCode: 3,
      };
    if (y.size === 0)
      return {
        result: false,
        message: `${d.empty}.`,
        errorCode: 3,
      };
  } catch (error) {
    return b(error);
  }
  return {
    result: true,
  };
}
//@ chunk-0wdgqhcf.js:49069-49315 placement
/**
 * 页面过大时的错误说明（实际大小与上限 MB），建议把大的内联资源移出。
 */
function describeTooLargePage(e) {
  return `too large: ${Math.ceil(e / 1024 / 1024)}MB (max ${MAX_ARTIFACT_BYTES / 1024 / 1024}MB). Shrink the page \u2014 move large inline assets (base64 images, embedded datasets) out of it or split the content across several artifacts \u2014 then retry.`;
}
//@ chunk-0wdgqhcf.js:49315-49770 placement
function findNulByte(e, t) {
  let index = t.indexOf("\x00");
  if (index === -1) return;
  let lines = t.slice(0, index).split(`
`);
  let s = `line ${lines.length}, column ${(lines.at(-1) ?? "").length + 1}`;
  return `${jsonStringify(e)} contains a NUL (\\u0000) byte at ${s}: it was published, but browsers turn that byte into U+FFFD (\uFFFD), and in script code outside a string literal that is a syntax error that stops the whole script \u2014 remove it (or write the escape \\u0000 if the character is meant) and publish again.`;
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
function quotedSurfaceText(real) {
  let t = foldClassifierCodePhrases(
    withEdgeBlanksMarked(
      foldedForSurface(
        sanitizeDisplayText(markedForBracketFold(real), {
          max: 1024,
        }),
      ),
    ),
  );
  return `"${spacedFromClosingQuote(t)}"`;
}
//@ chunk-0wdgqhcf.js:49954-50416 placement
/**
 * 为发布文件路径生成提示标注：解析到的真实路径、符号链接、硬链接，以及位于上传目录/工作目录之外/无法确定位置。
 */
function describePathAnnotations(e) {
  let t = [];
  try {
    let localUploadPath = resolveLocalUploadPath(e);
    let real = localUploadPath.kind === "resolved" ? localUploadPath.real : undefined;
    if (real !== undefined && isDifferentPath(e, real)) t.push(`[resolves to ${quotedSurfaceText(real)}]`);
    if (localUploadPath.kind !== "network") {
      let s = probeSymlink(e);
      if (s.unreadable === null && s.link) t.push("[symbolic link]");
    }
    if (real !== undefined && statFileIdentity(real).linked === true)
      t.push("[hard-linked file: the same bytes may also live elsewhere]");
  } catch {
    t.push("[could not examine this path for links]");
  }
  t.push(...describePathLocation(e).map((n) => `[${n}]`));
  return t.length === 0 ? "" : ` ${t.join(" ")}`;
}
//@ chunk-0wdgqhcf.js:50416-50590 placement
function describePathLocation(e) {
  try {
    if (isVerifiedAttachment(e)) return ["in this session's uploads folder"];
    return isWithinWorkingDirs(e) ? [] : ["outside the session's working directories"];
  } catch {
    return ["location not determined"];
  }
}
//@ chunk-0wdgqhcf.js:50590-50655 placement
/**
 * 导出常量或表 `MAX_HOSTS`：值为 32, Vjn = 8, bn = new Set(["ENOENT", "ENOTDIR", "ENAMETOOLONG"])。
 */
var MAX_HOSTS = 32;
var MAX_ANCHORS = 8;
var MISSING_PATH_ERRNOS = new Set(["ENOENT", "ENOTDIR", "ENAMETOOLONG"]);
//@ chunk-0wdgqhcf.js:50655-51498 placement
function checkWindowsPathSpelling(localPath, t = {}) {
  let n = [];
  let r = false;
  let s = false;
  let d = "examined";
  try {
    let written = t.written ?? localPath;
    if (hasSuspiciousWindowsPathPattern(isAbsolute(written) ? written : `_${sep}${written}`)) {
      n.push("a spelling Windows may resolve to another name");
      r = getPlatform() === "windows" || getPlatform() === "wsl";
    }
    let localUploadPath = resolveLocalUploadPath(localPath);
    if (localUploadPath.kind === "network") {
      d = "missing";
      s = true;
    } else {
      let b = probeSymlink(localPath);
      if (b.unreadable !== null) d = MISSING_PATH_ERRNOS.has(b.unreadable) ? "missing" : "unexaminable";
      else {
        if (b.link) {
          n.push("symbolic link");
          r = true;
        }
        if (localUploadPath.kind === "resolved") {
          if (isDifferentPath(localPath, localUploadPath.real)) {
            n.unshift(`resolves to ${quotedSurfaceText(localUploadPath.real)}`);
            r = true;
          }
          let S = statFileIdentity(localUploadPath.real);
          if (S.identity === null) d = "unexaminable";
          else if (S.linked === true) {
            n.push("hard-linked file: the same bytes may also live elsewhere");
            r = true;
          }
        } else
          d =
            MISSING_PATH_ERRNOS.has(getErrnoCode(localUploadPath.error) ?? "") && !b.link
              ? "missing"
              : "unexaminable";
      }
    }
  } catch {
    d = "unexaminable";
  }
  if (d === "unexaminable") n.push("could not examine this path for links");
  return {
    hidden: n,
    location: t.location === false || s ? [] : describePathLocation(localPath),
    deceptive: r,
    state: d,
  };
}
//@ chunk-0wdgqhcf.js:51498-51778 placement
/**
 * 为写入目标路径生成提示标注：经链接解析到的位置、是否在工作目录之外，无法确定时注明。
 */
function describeDestinationAnnotations(e, t = "destination") {
  try {
    let n = [];
    let r = symlinkLanding(walkPermissionCheckPaths(e));
    if (r !== null) n.push(`[${t} resolves through a link to ${quotedSurfaceText(r)}]`);
    if (!isWithinWorkingDirs(e)) n.push(`[${t} outside the session's working directories]`);
    return n.length === 0 ? "" : ` ${n.join(" ")}`;
  } catch {
    return ` [${t} location not determined]`;
  }
}
//@ chunk-0wdgqhcf.js:51778-51913 placement
function isWithinWorkingDirs(e) {
  let flattened = [getOriginalCwd(), ...getAnnouncedDirectories()].flatMap(getResolvedWorkingDirPaths);
  return getPathsForPermissionCheck(e).every(
    (n) =>
      isScratchpadPath(n) ||
      flattened.some((r) =>
        pathInWorkingPath(n, r, {
          caseFold: false,
          uncShapeParity: true,
        }),
      ),
  );
}
//@ chunk-0wdgqhcf.js:51913-51966 placement
var ARTIFACT_TOOL_RULES = [
  {
    name: ARTIFACT_TOOL_NAME,
  },
  {
    name: ARTIFACT_DATA_TOOL_NAME,
    familyParentToolName: ARTIFACT_TOOL_NAME,
  },
];
//@ chunk-0wdgqhcf.js:51966-52587 placement
function runPublishToolCheck(e, t, n, message, reason) {
  if (
    n ||
    !isArbiterRole(getAutoModeClassifierRole(getToolPermissionContext(e).mode)) ||
    !isAgentSdkEntrypoint() ||
    analyzeTurnTail(e.messages).decider?.scheduledTrigger !== true ||
    !t()
  )
    return null;
  try {
    let toolPermissionContext = getToolPermissionContext(e);
    if (
      getAskRules(toolPermissionContext).some((a) =>
        ARTIFACT_TOOL_RULES.some((h) => toolMatchesRule(toolPermissionContext, h, a)),
      ) ||
      ARTIFACT_TOOL_RULES.some((a) =>
        hasModuleHookingSite(
          "tool.check",
          {
            ...matcherTestTarget(a),
            agentId: e.agentId,
          },
          getLoadedModulesForSite("tool.check"),
        ),
      ) ||
      getPluginRegistry().hooksRespawns.size > 0 ||
      managedTierHooks("PermissionRequest") === "some" ||
      dispatchClassicEvent("PermissionRequest") ||
      hasHookForEvent(
        "PermissionRequest",
        e.sessionHooksRegistry,
        registerAgent(e, "PermissionRequest", e.session.id),
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
function describeBatchWriteSemantics(host, t = false) {
  return host !== undefined && meIdCooldown.of(host).unsupported
    ? t
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
