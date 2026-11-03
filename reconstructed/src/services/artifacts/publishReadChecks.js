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
import { dirname, dirname as dirname_2, isAbsolute, sep, sep as sep_2, sep as sep_3 } from "path";
import { lstatSync, lstatSync as lstatSync_2 } from "fs";
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
import { checkAttachmentForPublish, mn, isVerifiedAttachment } from "./publishSource.js";
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
import { sse, getAutoModeClassifierRole } from "../../utils/permissions/serverClassifier/arbiter.js";
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
import { KW } from "../../utils/hooks/matcherGrammar.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { managedTierHooks, hasHookForEvent } from "../../utils/hooks.js";
import { dispatchClassicEvent } from "../../plugins/functionHooks/modAdmission.js";
import { registerAgent } from "../../utils/telemetry/perfettoTracing.js";
import { logError } from "../../utils/log.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { A0o } from "./artifactDb.js";

//@ chunk-0wdgqhcf.js:45344-45362 placement
var pr = 4096,
  mr = 32;
/**
 * 沿路径向上逐级检查读取权限：遇到非 ask 决定即停（working-dir 原因视为可放行），安全类 ask 则继续上溯；路径过长或层数用尽返回 true。
 */
//@ chunk-0wdgqhcf.js:45362-45617 placement
function isAskOnlyForWorkingDir(e, t) {
  if (e.length > pr) return !0;
  let n = 0;
  for (let r = e, s = dirname(e); s !== r && n < mr; r = s, s = dirname(s), n += 1) {
    if (hasSuspiciousWindowsPathPattern(s, t.trustedNetworkDirectories)) continue;
    let d = readPermissionDecisionForPath(s, t);
    if (d.behavior !== "ask") return !1;
    if (!isReadGateSafetyAsk(d)) return d.decisionReason?.type === "workingDir";
  }
  return !0;
}
/**
 * 读取权限因"不在工作目录"而询问时，若真实路径属于本会话的聊天附件目录，改为允许（并标记按目录暂存）；同时传递路径固定信息。
 */
//@ chunk-0wdgqhcf.js:45617-46028 placement
function allowChatAttachmentRead(e, t, n, r, s) {
  if (e.behavior !== "ask" || e.decisionReason?.type !== "workingDir" || n.kind !== "resolved")
    return { read: e, pin: s };
  let { inside: inside, pin: pin, byDirectory: byDirectory } = checkAttachmentForPublish(t, n.real, r, s);
  if (!inside) return { read: e, pin: pin ?? s };
  return {
    ...(byDirectory && { stagedByDirectory: !0 }),
    read: {
      behavior: "allow",
      decisionReason: {
        type: "other",
        reason:
          "The file is one of this session's chat attachments, which count as inside the working directories",
      },
    },
    pin: pin,
  };
}
//@ chunk-0wdgqhcf.js:46028-47226 placement
function checkPublishReadPermission(e, t, n, r, s, d, a, h = "") {
  let {
    read: read,
    pin: pin,
    stagedByDirectory: stagedByDirectory,
  } = allowChatAttachmentRead(checkReadPermissionForTool(e, t, s), n, r, s, d);
  if (read.behavior === "deny") return { refused: read };
  let R = getDenyRuleForTool(s, READ_PATH_PROBE);
  if (R)
    return { refused: { behavior: "deny", message: mn(a, R, h), decisionReason: { type: "rule", rule: R } } };
  let v = getAskRuleForTool(s, READ_PATH_PROBE),
    P = pathInAllowedWorkingPath(n, s, [n]),
    V = r.kind === "resolved" && r.real !== n ? readPermissionDecisionForPath(r.real, s) : void 0;
  if (V?.behavior === "deny")
    return {
      refused: {
        ...V,
        message: P
          ? `Permission to read ${n} has been denied (it resolves, through a symbolic link, to a path a Read rule denies).`
          : `Permission to read ${n} has been denied.`,
      },
    };
  let Q = pin ?? (r.kind === "resolved" ? statFileIdentity(r.real) : void 0),
    x = read.behavior === "ask" || V?.behavior === "ask" || v !== null,
    G = Q?.linked === !0;
  if ((x || G) && env.CLAUDE_CODE_EVAL_CONFINED)
    return {
      refused: {
        behavior: "deny",
        message: `Permission to read ${n} has been denied.`,
        decisionReason: { type: "other", reason: "source outside the readable set in an evaluation run" },
      },
    };
  let ue =
      r.kind === "resolved" &&
      isReadGateSafetyAsk(V) &&
      !pathInAllowedWorkingPath(r.real, s, [r.real]) &&
      isAskOnlyForWorkingDir(r.real, s),
    ie = (isReadGateSafetyAsk(read) && !P && isAskOnlyForWorkingDir(n, s)) || ue,
    L = P && ue;
  return {
    mode: s.mode,
    read: read,
    bareReadAsk: v,
    spelledInside: P,
    pinRead: V,
    sourcePin: Q,
    readAsks: x,
    hardLinked: G,
    flaggedOutside: ie,
    flaggedResolvesOutside: L,
    resolvesElsewhere: r.kind === "resolved" && isDifferentPath(n, r.real),
    stagedUpload: stagedByDirectory === !0,
  };
}
//@ chunk-0wdgqhcf.js:47226-47295 placement
function tOr(e, t) {
  return e.readAsks || e.hardLinked || e.stagedUpload || t;
}
//@ chunk-0wdgqhcf.js:47295-48208 placement
function describePublishPath(e, t) {
  let {
      read: read,
      pinRead: pinRead,
      bareReadAsk: bareReadAsk,
      spelledInside: spelledInside,
      hardLinked: hardLinked,
      flaggedOutside: flaggedOutside,
      flaggedResolvesOutside: flaggedResolvesOutside,
    } = t,
    S = truncatePathMiddle(sweptPagePath(e) || "(unprintable path)", 1024),
    y = read.behavior === "ask" ? read : void 0,
    R = pinRead?.behavior === "ask" ? pinRead : void 0,
    v = y ?? R,
    P = y?.decisionReason?.type === "workingDir" || R?.decisionReason?.type === "workingDir",
    V = (P && spelledInside) || flaggedResolvesOutside,
    Q = isReadGateSafetyAsk(y) || isReadGateSafetyAsk(R),
    x = V
      ? " (it resolves, through a symbolic link, outside this session\u2019s allowed read paths)"
      : P
        ? " (outside this session\u2019s allowed read paths)"
        : Q
          ? " (a path spelling that can name a different file than it appears to)"
          : "",
    G =
      hardLinked && !P && !flaggedOutside
        ? " (a hard link: the same file may also live elsewhere on this machine)"
        : "",
    ue =
      y?.decisionReason?.type === "rule"
        ? y.decisionReason
        : R?.decisionReason?.type === "rule"
          ? R.decisionReason
          : bareReadAsk
            ? { type: "rule", rule: bareReadAsk }
            : void 0;
  return {
    askPath: S,
    outside: x,
    linkNote: G,
    outsideAsk: P,
    resolvesOutside: V,
    flaggedSpelling: Q,
    flaggedOutside: flaggedOutside,
    pathAsk: v,
    readRule: ue,
  };
}
//@ chunk-0wdgqhcf.js:48208-49069 placement
function readPublishFile(e, t, n, r, s, d) {
  let a = getToolPermissionContext(s),
    { read: read } = allowChatAttachmentRead(checkReadPermissionForTool(e, t, a), n, r, a, void 0);
  if (
    read.behavior !== "allow" ||
    getDenyRuleForTool(a, READ_PATH_PROBE) !== null ||
    getAskRuleForTool(a, READ_PATH_PROBE) !== null
  )
    return { result: !0 };
  let b = (S) => ({
    result: !1,
    message: isENOENT(S)
      ? `File not found: ${n}.`
      : `cannot read ${d.field ?? "file_path"} (${getErrnoCode(S) ?? "unexpected error"})`,
    errorCode: 2,
  });
  if (r.kind === "unresolved")
    return getPathsForPermissionCheck(n)
      .slice(1)
      .every((y) => readPermissionDecisionForPath(y, a).behavior === "allow")
      ? b(r.error)
      : { result: !0 };
  try {
    let { real: real } = r;
    if (real !== n && readPermissionDecisionForPath(real, a).behavior !== "allow") return { result: !0 };
    let y = lstatSync_2(real);
    if (y.isSymbolicLink()) return { result: !0 };
    if (!y.isFile()) return { result: !1, message: `${d.notAFile}.`, errorCode: 2 };
    if (isSentinelInode(y.ino)) return { result: !1, message: `${d.noIdentity}.`, errorCode: 18 };
    if (y.size > d.maxBytes) return { result: !1, message: d.tooLarge(y.size, d.maxBytes), errorCode: 3 };
    if (y.size === 0) return { result: !1, message: `${d.empty}.`, errorCode: 3 };
  } catch (error) {
    return b(error);
  }
  return { result: !0 };
}
/**
 * 页面过大时的错误说明（实际大小与上限 MB），建议把大的内联资源移出。
 */
//@ chunk-0wdgqhcf.js:49069-49315 placement
function describeTooLargePage(e) {
  return `too large: ${Math.ceil(e / 1024 / 1024)}MB (max ${MAX_ARTIFACT_BYTES / 1024 / 1024}MB). Shrink the page \u2014 move large inline assets (base64 images, embedded datasets) out of it or split the content across several artifacts \u2014 then retry.`;
}
//@ chunk-0wdgqhcf.js:49315-49770 placement
function findNulByte(e, t) {
  let index = t.indexOf("\x00");
  if (index === -1) return;
  let parts = t.slice(0, index).split(`
`),
    s = `line ${parts.length}, column ${(parts.at(-1) ?? "").length + 1}`;
  return `${jsonStringify(e)} contains a NUL (\\u0000) byte at ${s}: it was published, but browsers turn that byte into U+FFFD (\uFFFD), and in script code outside a string literal that is a syntax error that stops the whole script \u2014 remove it (or write the escape \\u0000 if the character is meant) and publish again.`;
}
//@ chunk-0wdgqhcf.js:49815-49855 placement
function lht(e) {
  return sse(getAutoModeClassifierRole(e)) || br();
}
//@ chunk-0wdgqhcf.js:49855-49878 placement
function br() {
  return !1;
}
//@ chunk-0wdgqhcf.js:49878-49954 placement
function Tt(e) {
  let t = foldClassifierCodePhrases(
    withEdgeBlanksMarked(foldedForSurface(sanitizeDisplayText(markedForBracketFold(e), { max: 1024 }))),
  );
  return `"${spacedFromClosingQuote(t)}"`;
}
/**
 * 为发布文件路径生成提示标注：解析到的真实路径、符号链接、硬链接，以及位于上传目录/工作目录之外/无法确定位置。
 */
//@ chunk-0wdgqhcf.js:49954-50416 placement
function describePathAnnotations(e) {
  let t = [];
  try {
    let n = resolveLocalUploadPath(e),
      r = n.kind === "resolved" ? n.real : void 0;
    if (r !== void 0 && isDifferentPath(e, r)) t.push(`[resolves to ${Tt(r)}]`);
    if (n.kind !== "network") {
      let s = probeSymlink(e);
      if (s.unreadable === null && s.link) t.push("[symbolic link]");
    }
    if (r !== void 0 && statFileIdentity(r).linked === !0)
      t.push("[hard-linked file: the same bytes may also live elsewhere]");
  } catch {
    t.push("[could not examine this path for links]");
  }
  return (t.push(...describePathLocation(e).map((n) => `[${n}]`)), t.length === 0 ? "" : ` ${t.join(" ")}`);
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
var hko = 32,
  Vjn = 8,
  bn = new Set(["ENOENT", "ENOTDIR", "ENAMETOOLONG"]);
//@ chunk-0wdgqhcf.js:50655-51498 placement
function checkWindowsPathSpelling(e, t = {}) {
  let n = [],
    r = !1,
    s = !1,
    d = "examined";
  try {
    let a = t.written ?? e;
    if (hasSuspiciousWindowsPathPattern(isAbsolute(a) ? a : `_${sep_2}${a}`))
      (n.push("a spelling Windows may resolve to another name"),
        (r = getPlatform() === "windows" || getPlatform() === "wsl"));
    let h = resolveLocalUploadPath(e);
    if (h.kind === "network") ((d = "missing"), (s = !0));
    else {
      let b = probeSymlink(e);
      if (b.unreadable !== null) d = bn.has(b.unreadable) ? "missing" : "unexaminable";
      else {
        if (b.link) (n.push("symbolic link"), (r = !0));
        if (h.kind === "resolved") {
          if (isDifferentPath(e, h.real)) (n.unshift(`resolves to ${Tt(h.real)}`), (r = !0));
          let S = statFileIdentity(h.real);
          if (S.identity === null) d = "unexaminable";
          else if (S.linked === !0)
            (n.push("hard-linked file: the same bytes may also live elsewhere"), (r = !0));
        } else d = bn.has(getErrnoCode(h.error) ?? "") && !b.link ? "missing" : "unexaminable";
      }
    }
  } catch {
    d = "unexaminable";
  }
  if (d === "unexaminable") n.push("could not examine this path for links");
  return {
    hidden: n,
    location: t.location === !1 || s ? [] : describePathLocation(e),
    deceptive: r,
    state: d,
  };
}
/**
 * 为写入目标路径生成提示标注：经链接解析到的位置、是否在工作目录之外，无法确定时注明。
 */
//@ chunk-0wdgqhcf.js:51498-51778 placement
function describeDestinationAnnotations(e, t = "destination") {
  try {
    let n = [],
      r = symlinkLanding(walkPermissionCheckPaths(e));
    if (r !== null) n.push(`[${t} resolves through a link to ${Tt(r)}]`);
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
      flattened.some((r) => pathInWorkingPath(n, r, { caseFold: !1, uncShapeParity: !0 })),
  );
}
//@ chunk-0wdgqhcf.js:51913-51966 placement
var _n = [
  { name: ARTIFACT_TOOL_NAME },
  { name: ARTIFACT_DATA_TOOL_NAME, familyParentToolName: ARTIFACT_TOOL_NAME },
];
//@ chunk-0wdgqhcf.js:51966-52587 placement
function runPublishToolCheck(e, t, n, r, s) {
  if (
    n ||
    !sse(getAutoModeClassifierRole(getToolPermissionContext(e).mode)) ||
    !isAgentSdkEntrypoint() ||
    analyzeTurnTail(e.messages).decider?.scheduledTrigger !== !0 ||
    !t()
  )
    return null;
  try {
    let d = getToolPermissionContext(e);
    if (
      getAskRules(d).some((a) => _n.some((h) => toolMatchesRule(d, h, a))) ||
      _n.some((a) =>
        hasModuleHookingSite(
          "tool.check",
          { ...KW(a), agentId: e.agentId },
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
  return (
    (getLiveState().routineSourceWriteRefused = !0),
    {
      behavior: "deny",
      message: r,
      decisionReason: { type: "safetyCheck", reason: s, classifierApprovable: !1 },
    }
  );
}
/**
 * 说明批量写入会如何执行：服务端不支持批量时逐条按顺序写（中途失败保留已写部分；带版本锁的批量会整体拒绝），否则全有或全无。
 */
//@ chunk-0wdgqhcf.js:52760-53181 placement
function describeBatchWriteSemantics(e, t = !1) {
  return e !== void 0 && A0o.of(e).unsupported
    ? t
      ? "applied all-or-nothing if this server now takes batch writes, otherwise refused whole (a version-pinned batch is never applied one at a time)"
      : "applied one at a time in order (this server has no batch write yet); a failure part-way leaves earlier entries written"
    : "applied all-or-nothing where the server supports batches, otherwise one at a time in order";
}

export {
  describeTooLargePage,
  readPublishFile,
  lht,
  checkPublishReadPermission,
  describePublishPath,
  runPublishToolCheck,
  describeBatchWriteSemantics,
  describeDestinationAnnotations,
  describePathAnnotations,
  tOr,
  Vjn,
  checkWindowsPathSpelling,
  hko,
  findNulByte,
};
