/**
 * tools/ArtifactTool/permissions/artifactPermissionRules.ts
 *
 * 2.1.316 新增：Artifact 工具权限规则匹配与输入校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qxvqcab6.js (29)
 * attribution: placement 29
 */
import {
  APPROVABLE_CONTENT_TYPES,
  isLiveOrReseed,
  isApprovableFile,
  areBothApprovable,
} from "./approvalText.js";
import { SERVABLE_CONTENT_TYPES } from "../../../services/artifacts/contentTypes.js";
import { readUntrustedArray, UNREADABLE_ARRAY } from "../../../utils/untrustedArray.js";
import {
  zodEnumFieldIncludes,
  inputSchema,
  artifactRoomSurfaceOpen,
  artifactLivePathsSchemaOpen,
} from "../../../services/artifacts/artifactToolSchema.js";
import { uuidSlugFromUrl, ArtifactInputError, parseArtifactUrl, ARTIFACT_TOOL_NAME } from "../constants.js";
import {
  getToolPermissionContext,
  consentMustDeny,
} from "../../../utils/permissions/toolPermissionContext.js";
import { coworkConsentMustDeny } from "./readConsent.js";
import { WEBFETCH } from "../../WebFetchTool/prompt.js";
import { denyRulePhrase, artifactCallReadRule } from "./readRules.js";
import { getDeclaredCapabilities } from "../../../services/artifacts/capabilityDeclaration.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import {
  typeUrlOf,
  isArtifactBatchWrite,
  batchWrites,
  formatRuleContentForDisplay,
  urlSubPathError,
} from "./dbWriteInputs.js";
import {
  typeReadDeclaresRoom,
  CONSENT_ASK_TAG,
  ARTIFACT_DISPLAY_TARGET_TAG,
  derivePublishContext,
} from "./consentStamps.js";
import {
  getShareEntry,
  getShareEntryForPath,
  probedOtherOrg,
} from "../../../services/artifacts/shareEntries.js";
import { expandPath } from "../../../utils/path.js";
import { artifactViewerUrl } from "../../../services/artifacts/publishInstanceFiles.js";
import { matchArtifactRuleOrEquivalent } from "./ruleTarget.js";
import { STR_REPLACE } from "../../../services/artifacts/artifactDb.js";
import {
  artifactCardTitleFor,
  openArtifactFrame,
  updateFrameState,
  markFrameOpenOutcome,
} from "./ownershipConsent.js";
import { artifactViewerUrlFor } from "../artifactUrls.js";
import {
  OTHER_ORG_DENY,
  OTHER_ORG_DECISION_REASON,
  OUTSIDE_ORG_DATA_DENY,
  OUTSIDE_ORG_DATA_DECISION_REASON,
} from "../promptText.js";
import { outsideOrgRead } from "../../../services/artifacts/artifactToolGates.js";
import { AUTO_OPEN_HOOK, autoOpenArtifactPreview } from "../../../services/artifacts/autoOpen.js";
import { parseSessionArtifactUrl } from "../../../services/artifacts/orgScope.js";
import { registerLazyWriter } from "../actionNames.js";

//@ chunk-qxvqcab6.js:15043-15735 placement
function isApprovableFileWrite(e, n) {
  if (typeof e !== "object" || e === null) return false;
  let r = n.documents ? APPROVABLE_CONTENT_TYPES : SERVABLE_CONTENT_TYPES;
  let { file_path: filePath, files } = e;
  if (isLiveOrReseed(e) || !isApprovableFile(filePath, undefined, r)) return false;
  if (files === undefined) return true;
  let untrustedArray = readUntrustedArray(files);
  if (untrustedArray === UNREADABLE_ARRAY) return false;
  if (untrustedArray !== undefined)
    return untrustedArray.every((untrusted) =>
      typeof untrusted === "string"
        ? isApprovableFile(untrusted, undefined, r)
        : untrusted !== null &&
          typeof untrusted === "object" &&
          !isLiveOrReseed(untrusted) &&
          isApprovableFile(untrusted.path, untrusted.contentType, r),
    );
  if (files === null || typeof files !== "object") return false;
  return Object.entries(files).every(([key, value]) => {
    if (value === null) return true;
    if (typeof value === "string") return isApprovableFile(key, undefined, r);
    if (typeof value !== "object" || Array.isArray(value)) return false;
    if (isLiveOrReseed(value)) return false;
    let d = value;
    if (typeof d.from === "string" && d.artifact !== undefined) return false;
    if (typeof d.artifact === "string") return areBothApprovable(key, value.path, r);
    return isApprovableFile(key, value.contentType, r);
  });
}
//@ chunk-qxvqcab6.js:15735-15792 placement
function hasReadFileAction() {
  return zodEnumFieldIncludes(inputSchema().shape.action, "read_file");
}
//@ chunk-qxvqcab6.js:15792-15846 placement
function hasDeleteAction() {
  return zodEnumFieldIncludes(inputSchema().shape.action, "delete");
}
//@ chunk-qxvqcab6.js:15846-15898 placement
function hasOpenAction() {
  return zodEnumFieldIncludes(inputSchema().shape.action, "open");
}
//@ chunk-qxvqcab6.js:15898-15949 placement
function hasPinAction() {
  return zodEnumFieldIncludes(inputSchema().shape.action, "pin");
}
//@ chunk-qxvqcab6.js:15949-16002 placement
function hasShareAction() {
  return zodEnumFieldIncludes(inputSchema().shape.action, "share");
}
//@ chunk-qxvqcab6.js:16002-16046 placement
function hasVersionField() {
  return "version" in inputSchema().shape;
}
//@ chunk-qxvqcab6.js:16046-16179 placement
function artifactTitleForUrl(e, n) {
  if (e?.title === undefined) return;
  if (n === undefined) return e.title;
  let r = uuidSlugFromUrl(n);
  return r !== null && uuidSlugFromUrl(e.url) === r ? e.title : undefined;
}
//@ chunk-qxvqcab6.js:16179-16242 placement
var IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);
//@ chunk-qxvqcab6.js:16242-16369 placement
function artifactSurfaceRefusal(e) {
  if (getToolPermissionContext(e).mode === "plan") return "plan";
  if (coworkConsentMustDeny(e)) return "cowork_no_surface";
  if (consentMustDeny(e)) return "no_surface";
  return null;
}
//@ chunk-qxvqcab6.js:16369-16566 placement
function artifactReadBlockedMessage(e, n, r) {
  let o = r
    ? "Copying from this artifact is"
    : e.ruleValue.toolName === WEBFETCH
      ? "Artifact reads are"
      : "Reading this artifact is";
  let s = n === "" ? "" : ` \u2014 ${n}`;
  return `${o} blocked by ${denyRulePhrase(e)}${s}`;
}
//@ chunk-qxvqcab6.js:16566-16674 placement
function denyByArtifactRule(e, n = "", r = false) {
  return {
    behavior: "deny",
    message: `${artifactReadBlockedMessage(e, n, r)}.`,
    decisionReason: {
      type: "rule",
      rule: e,
    },
  };
}
//@ chunk-qxvqcab6.js:16674-16796 placement
function readDeniedByRule(e, n, url, o, s) {
  let u = artifactCallReadRule(getToolPermissionContext(e), n, url, "deny", s);
  return u === null
    ? undefined
    : new ArtifactInputError(artifactReadBlockedMessage(u, o, s.copySource === true), "read_denied");
}
//@ chunk-qxvqcab6.js:16796-16951 placement
function askRuleCoverageNote(e) {
  return e.ruleValue.toolName === WEBFETCH
    ? ` (your ${WEBFETCH} ask rule covers artifact reads)`
    : ` (your ${e.ruleValue.toolName} ask rule covers this url)`;
}
//@ chunk-qxvqcab6.js:16951-17368 placement
function isRoomPublishCall(e) {
  if (!artifactRoomSurfaceOpen() || e === null || e === undefined) return false;
  if (e.action !== undefined && e.action !== "publish") return false;
  let declaredCapabilities = getDeclaredCapabilities(e);
  if (declaredCapabilities !== undefined)
    return isPlainObject(declaredCapabilities) && declaredCapabilities.room !== undefined;
  let r = typeUrlOf(e);
  if (r !== undefined) {
    let artifactUrl = parseArtifactUrl(r);
    return artifactUrl !== null && typeReadDeclaresRoom(artifactUrl.slug);
  }
  let o = typeof e.url === "string" ? parseArtifactUrl(e.url) : null;
  let s;
  try {
    s =
      o !== null
        ? getShareEntry(o.slug)
        : typeof e.file_path === "string"
          ? getShareEntryForPath(expandPath(e.file_path))
          : undefined;
  } catch {
    s = undefined;
  }
  return s?.capabilities?.room !== undefined;
}
//@ chunk-qxvqcab6.js:17368-17415 placement
var EMPTY_COMMENT_SETS = {
  threadIds: new Set(),
  commentIds: new Set(),
};
//@ chunk-qxvqcab6.js:17415-17472 placement
function artifactReleaseInfo(e) {
  return {
    url: artifactViewerUrl(e.slug),
    release: e.current,
  };
}
//@ chunk-qxvqcab6.js:17472-17603 placement
function parseArtifactUrlOrThrow(url) {
  let n = typeof url === "string" ? parseArtifactUrl(url) : null;
  if (!n) throw new ArtifactInputError(`not an artifact URL: ${String(url)}`, "invalid_url");
  return n;
}
//@ chunk-qxvqcab6.js:17603-17917 placement
function findBatchWriteRule(tool, toolPermissionContext, r, o) {
  if (typeof r !== "object" || r === null || !isArtifactBatchWrite(r)) return;
  let { writes, ...u } = r;
  for (let [a, l] of batchWrites(r).entries()) {
    let d = matchArtifactRuleOrEquivalent(
      toolPermissionContext,
      tool,
      {
        ...u,
        db_op: l.op,
        collection: l.collection,
        doc_id: l.docId,
        ...(l.data !== undefined && {
          data: l.data,
        }),
        ...(l.filePath !== undefined && {
          file_path: l.filePath,
        }),
      },
      o,
    );
    if (d)
      return {
        index: a,
        rule: d,
      };
  }
  return;
}
//@ chunk-qxvqcab6.js:17917-18041 placement
function findStrReplaceRule(tool, toolPermissionContext, r, o) {
  if (typeof r !== "object" || r === null || r.db_op !== STR_REPLACE) return;
  return (
    matchArtifactRuleOrEquivalent(
      toolPermissionContext,
      tool,
      {
        ...r,
        db_op: "update",
      },
      o,
    ) ?? undefined
  );
}
//@ chunk-qxvqcab6.js:18041-18154 placement = getDenyRuleForAgent (1)
function formatRuleForDisplay(e) {
  return e.ruleValue.ruleContent === undefined
    ? e.ruleValue.toolName
    : `${e.ruleValue.toolName}(${formatRuleContentForDisplay(e)})`;
}
//@ chunk-qxvqcab6.js:18154-18443 placement
function denyArtifactBatchByRule(e, toolPermissionContext, r) {
  let batchWriteRule = findBatchWriteRule(e, toolPermissionContext, r, "deny");
  return batchWriteRule === undefined
    ? undefined
    : {
        behavior: "deny",
        message: `Permission to use ${ARTIFACT_TOOL_NAME} has been denied by your rule ${formatRuleForDisplay(batchWriteRule.rule)} (writes[${batchWriteRule.index}] of this batch matches it), so nothing in the batch was written.`,
        decisionReason: {
          type: "rule",
          rule: batchWriteRule.rule,
        },
      };
}
//@ chunk-qxvqcab6.js:18443-18705 placement
function denyArtifactStrReplaceByRule(tool, toolPermissionContext, r) {
  let strReplaceRule = findStrReplaceRule(tool, toolPermissionContext, r, "deny");
  return strReplaceRule === undefined
    ? undefined
    : {
        behavior: "deny",
        message: `Permission to use ${ARTIFACT_TOOL_NAME} has been denied by your rule ${formatRuleForDisplay(strReplaceRule)} (a str_replace is an update of one field), so nothing was written.`,
        decisionReason: {
          type: "rule",
          rule: strReplaceRule,
        },
      };
}
//@ chunk-qxvqcab6.js:18705-19225 placement
function askArtifactBatchByRule(e, n, toolPermissionContext, o) {
  let batchWriteRule = findBatchWriteRule(e, toolPermissionContext, o, "ask");
  if (batchWriteRule === undefined || typeof o !== "object" || o === null) return;
  let u = Reflect.get(o, "url");
  let a = typeof u === "string" ? parseArtifactUrl(u) : null;
  return {
    behavior: "ask",
    message: `Claude wants to write a batch to this artifact's database, and writes[${batchWriteRule.index}] matches your ask rule ${formatRuleForDisplay(batchWriteRule.rule)} \u2014 the full permission check could not complete, so approving covers only this call.`,
    updatedInput: {
      ...o,
      [CONSENT_ASK_TAG]: false,
      [ARTIFACT_DISPLAY_TARGET_TAG]: a === null ? null : artifactCardTitleFor(a, n),
    },
    suppressAlwaysAllowRule: true,
    decisionReason: {
      type: "rule",
      rule: batchWriteRule.rule,
    },
  };
}
//@ chunk-qxvqcab6.js:19225-19388 placement
function denyOtherOrgArtifact(e, n) {
  if (!probedOtherOrg(getShareEntry(e.slug))) return null;
  return {
    behavior: "deny",
    message: `${artifactViewerUrlFor(e)}: ${OTHER_ORG_DENY}. ${n}; tell the user.`,
    decisionReason: {
      type: "other",
      reason: OTHER_ORG_DECISION_REASON,
    },
  };
}
//@ chunk-qxvqcab6.js:19388-19586 placement
function denyOutsideOrgRead(e, n) {
  let r = denyOtherOrgArtifact(e, n);
  if (r !== null) return r;
  if (!outsideOrgRead(getShareEntry(e.slug))) return null;
  return {
    behavior: "deny",
    message: `${artifactViewerUrlFor(e)}: ${OUTSIDE_ORG_DATA_DENY}. ${n}; tell the user.`,
    decisionReason: {
      type: "other",
      reason: OUTSIDE_ORG_DATA_DECISION_REASON,
    },
  };
}
//@ chunk-qxvqcab6.js:19586-20355 placement
/**
 * 校验 Artifact 工具输入里的 path/url（watch 的 live path、artifact URL 内的子路径等）。
 */
function validateArtifactPathInput(action, n, url) {
  let o = action === "watch" && artifactLivePathsSchemaOpen();
  if (o && n.path !== undefined && AUTO_OPEN_HOOK?.livePathFrom(n) === undefined)
    return {
      result: false,
      message: AUTO_OPEN_HOOK?.LIVE_PATH_INVALID ?? "invalid path",
      errorCode: 8,
    };
  let filtered = Object.keys(n).filter(
    (key) => key !== "action" && key !== "url" && !(o && key === "path") && n[key] !== undefined,
  );
  if (filtered.length > 0)
    return {
      result: false,
      message: `action "${action}" takes only ${o ? "`url` (and `path`)" : "`url`"} \u2014 remove ${filtered.join(", ")}.`,
      errorCode: 8,
    };
  if (url === undefined) {
    if (action === "status")
      return {
        result: true,
      };
    if (action === "verify")
      return {
        result: true,
      };
    return {
      result: false,
      message: `action "${action}" requires \`url\` \u2014 the artifact's claude.ai URL (find it with action: "list" or action: "status").`,
      errorCode: 7,
    };
  }
  let u = urlSubPathError(url);
  if (u) return u;
  let sessionArtifactUrl = parseSessionArtifactUrl(url);
  if (!sessionArtifactUrl.ok)
    return {
      result: false,
      message: sessionArtifactUrl.message,
      errorCode: sessionArtifactUrl.errorCode,
    };
  return {
    result: true,
  };
}
//@ chunk-qxvqcab6.js:20355-20496 placement
registerLazyWriter({
  addOpenedFrameRow: openArtifactFrame,
  forgetArtifactDeletedThroughMcp: updateFrameState,
  markFrameOpenOutcome,
  derivePublishContext,
  surfacePublishedArtifact: autoOpenArtifactPreview,
});
//@ chunk-qxvqcab6.js:20496-20523 placement
/**
 * 制品权限规则相关请求的超时与响应上限。
 */
var ARTIFACT_PERMISSION_LIMITS = 64;
var ARTIFACT_RULE_TIMEOUT_MS = 15000;
var ARTIFACT_RULE_MAX_BYTES = 65536;
export {
  ARTIFACT_PERMISSION_LIMITS,
  readDeniedByRule,
  denyByArtifactRule,
  denyOutsideOrgRead,
  askRuleCoverageNote,
  denyArtifactBatchByRule,
  denyArtifactStrReplaceByRule,
  findBatchWriteRule,
  findStrReplaceRule,
  formatRuleForDisplay,
  denyOtherOrgArtifact,
  EMPTY_COMMENT_SETS,
  hasPinAction,
  parseArtifactUrlOrThrow,
  hasVersionField,
  hasOpenAction,
  validateArtifactPathInput,
  artifactSurfaceRefusal,
  hasShareAction,
  artifactTitleForUrl,
  IMAGE_EXTENSIONS,
  isRoomPublishCall,
  askArtifactBatchByRule,
  isApprovableFileWrite,
  hasDeleteAction,
  hasReadFileAction,
  artifactReleaseInfo,
  ARTIFACT_RULE_TIMEOUT_MS,
  ARTIFACT_RULE_MAX_BYTES,
};
