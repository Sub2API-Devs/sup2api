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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-qxvqcab6.js:15043-15735 placement
function isApprovableFileWrite(input, options) {
  if (typeof input !== "object" || input === null) return false;
  let servableTypes = options.documents ? APPROVABLE_CONTENT_TYPES : SERVABLE_CONTENT_TYPES;
  let { file_path: filePath, files } = input;
  if (isLiveOrReseed(input) || !isApprovableFile(filePath, undefined, servableTypes)) return false;
  if (files === undefined) return true;
  let untrustedArray = readUntrustedArray(files);
  if (untrustedArray === UNREADABLE_ARRAY) return false;
  if (untrustedArray !== undefined)
    return untrustedArray.every((untrusted) =>
      typeof untrusted === "string"
        ? isApprovableFile(untrusted, undefined, servableTypes)
        : untrusted !== null &&
          typeof untrusted === "object" &&
          !isLiveOrReseed(untrusted) &&
          isApprovableFile(untrusted.path, untrusted.contentType, servableTypes),
    );
  if (files === null || typeof files !== "object") return false;
  return Object.entries(files).every(([key, value]) => {
    if (value === null) return true;
    if (typeof value === "string") return isApprovableFile(key, undefined, servableTypes);
    if (typeof value !== "object" || Array.isArray(value)) return false;
    if (isLiveOrReseed(value)) return false;
    let unused = value;
    if (typeof unused.from === "string" && unused.artifact !== undefined) return false;
    if (typeof unused.artifact === "string") return areBothApprovable(key, value.path, servableTypes);
    return isApprovableFile(key, value.contentType, servableTypes);
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
function artifactTitleForUrl(match, url) {
  if (match?.title === undefined) return;
  if (url === undefined) return match.title;
  let slug = uuidSlugFromUrl(url);
  return slug !== null && uuidSlugFromUrl(match.url) === slug ? match.title : undefined;
}
//@ chunk-qxvqcab6.js:16179-16242 placement
var IMAGE_EXTENSIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qxvqcab6.js:16179", () => {
  IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);
});
//@ chunk-qxvqcab6.js:16242-16369 placement
function artifactSurfaceRefusal(context) {
  if (getToolPermissionContext(context).mode === "plan") return "plan";
  if (coworkConsentMustDeny(context)) return "cowork_no_surface";
  if (consentMustDeny(context)) return "no_surface";
  return null;
}
//@ chunk-qxvqcab6.js:16369-16566 placement
function artifactReadBlockedMessage(rule, subject, isCopy) {
  let lead = isCopy
    ? "Copying from this artifact is"
    : rule.ruleValue.toolName === WEBFETCH
      ? "Artifact reads are"
      : "Reading this artifact is";
  let whyText = subject === "" ? "" : ` \u2014 ${subject}`;
  return `${lead} blocked by ${denyRulePhrase(rule)}${whyText}`;
}
//@ chunk-qxvqcab6.js:16566-16674 placement
function denyByArtifactRule(rule, why = "", isCopy = false) {
  return {
    behavior: "deny",
    message: `${artifactReadBlockedMessage(rule, why, isCopy)}.`,
    decisionReason: {
      type: "rule",
      rule,
    },
  };
}
//@ chunk-qxvqcab6.js:16674-16796 placement
function readDeniedByRule(context, target, url, why, fields) {
  let rule = artifactCallReadRule(getToolPermissionContext(context), target, url, "deny", fields);
  return rule === null
    ? undefined
    : new ArtifactInputError(
        artifactReadBlockedMessage(rule, why, fields.copySource === true),
        "read_denied",
      );
}
//@ chunk-qxvqcab6.js:16796-16951 placement
function askRuleCoverageNote(rule) {
  return rule.ruleValue.toolName === WEBFETCH
    ? ` (your ${WEBFETCH} ask rule covers artifact reads)`
    : ` (your ${rule.ruleValue.toolName} ask rule covers this url)`;
}
//@ chunk-qxvqcab6.js:16951-17368 placement
function isRoomPublishCall(input) {
  if (!artifactRoomSurfaceOpen() || input === null || input === undefined) return false;
  if (input.action !== undefined && input.action !== "publish") return false;
  let declaredCapabilities = getDeclaredCapabilities(input);
  if (declaredCapabilities !== undefined)
    return isPlainObject(declaredCapabilities) && declaredCapabilities.room !== undefined;
  let typeUrl = typeUrlOf(input);
  if (typeUrl !== undefined) {
    let artifactUrl = parseArtifactUrl(typeUrl);
    return artifactUrl !== null && typeReadDeclaresRoom(artifactUrl.slug);
  }
  let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
  let shareEntry;
  try {
    shareEntry =
      artifactUrl !== null
        ? getShareEntry(artifactUrl.slug)
        : typeof input.file_path === "string"
          ? getShareEntryForPath(expandPath(input.file_path))
          : undefined;
  } catch {
    shareEntry = undefined;
  }
  return shareEntry?.capabilities?.room !== undefined;
}
//@ chunk-qxvqcab6.js:17368-17415 placement
var EMPTY_COMMENT_SETS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qxvqcab6.js:17368", () => {
  EMPTY_COMMENT_SETS = {
    threadIds: new Set(),
    commentIds: new Set(),
  };
});
//@ chunk-qxvqcab6.js:17415-17472 placement
function artifactReleaseInfo(release) {
  return {
    url: artifactViewerUrl(release.slug),
    release: release.current,
  };
}
//@ chunk-qxvqcab6.js:17472-17603 placement
function parseArtifactUrlOrThrow(url) {
  let artifactUrl = typeof url === "string" ? parseArtifactUrl(url) : null;
  if (!artifactUrl) throw new ArtifactInputError(`not an artifact URL: ${String(url)}`, "invalid_url");
  return artifactUrl;
}
//@ chunk-qxvqcab6.js:17603-17917 placement
function findBatchWriteRule(tool, context, input, behavior) {
  if (typeof input !== "object" || input === null || !isArtifactBatchWrite(input)) return;
  let { writes, ...rest } = input;
  for (let [index, write] of batchWrites(input).entries()) {
    let rule = matchArtifactRuleOrEquivalent(
      context,
      tool,
      {
        ...rest,
        db_op: write.op,
        collection: write.collection,
        doc_id: write.docId,
        ...(write.data !== undefined && {
          data: write.data,
        }),
        ...(write.filePath !== undefined && {
          file_path: write.filePath,
        }),
      },
      behavior,
    );
    if (rule)
      return {
        index,
        rule,
      };
  }
  return;
}
//@ chunk-qxvqcab6.js:17917-18041 placement
function findStrReplaceRule(tool, context, input, behavior) {
  if (typeof input !== "object" || input === null || input.db_op !== STR_REPLACE) return;
  return (
    matchArtifactRuleOrEquivalent(
      context,
      tool,
      {
        ...input,
        db_op: "update",
      },
      behavior,
    ) ?? undefined
  );
}
//@ chunk-qxvqcab6.js:18041-18154 placement = getDenyRuleForAgent (1)
function formatRuleForDisplay(rule) {
  return rule.ruleValue.ruleContent === undefined
    ? rule.ruleValue.toolName
    : `${rule.ruleValue.toolName}(${formatRuleContentForDisplay(rule)})`;
}
//@ chunk-qxvqcab6.js:18154-18443 placement
function denyArtifactBatchByRule(tool, toolPermissionContext, input) {
  let batchWriteRule = findBatchWriteRule(tool, toolPermissionContext, input, "deny");
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
function denyArtifactStrReplaceByRule(tool, toolPermissionContext, input) {
  let strReplaceRule = findStrReplaceRule(tool, toolPermissionContext, input, "deny");
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
function askArtifactBatchByRule(tool, context, toolPermissionContext, input) {
  let batchWriteRule = findBatchWriteRule(tool, toolPermissionContext, input, "ask");
  if (batchWriteRule === undefined || typeof input !== "object" || input === null) return;
  let rawUrl = Reflect.get(input, "url");
  let artifactUrl = typeof rawUrl === "string" ? parseArtifactUrl(rawUrl) : null;
  return {
    behavior: "ask",
    message: `Claude wants to write a batch to this artifact's database, and writes[${batchWriteRule.index}] matches your ask rule ${formatRuleForDisplay(batchWriteRule.rule)} \u2014 the full permission check could not complete, so approving covers only this call.`,
    updatedInput: {
      ...input,
      [CONSENT_ASK_TAG]: false,
      [ARTIFACT_DISPLAY_TARGET_TAG]: artifactUrl === null ? null : artifactCardTitleFor(artifactUrl, context),
    },
    suppressAlwaysAllowRule: true,
    decisionReason: {
      type: "rule",
      rule: batchWriteRule.rule,
    },
  };
}
//@ chunk-qxvqcab6.js:19225-19388 placement
function denyOtherOrgArtifact(target, outcome) {
  if (!probedOtherOrg(getShareEntry(target.slug))) return null;
  return {
    behavior: "deny",
    message: `${artifactViewerUrlFor(target)}: ${OTHER_ORG_DENY}. ${outcome}; tell the user.`,
    decisionReason: {
      type: "other",
      reason: OTHER_ORG_DECISION_REASON,
    },
  };
}
//@ chunk-qxvqcab6.js:19388-19586 placement
function denyOutsideOrgRead(target, outcome) {
  let otherOrgDenial = denyOtherOrgArtifact(target, outcome);
  if (otherOrgDenial !== null) return otherOrgDenial;
  if (!outsideOrgRead(getShareEntry(target.slug))) return null;
  return {
    behavior: "deny",
    message: `${artifactViewerUrlFor(target)}: ${OUTSIDE_ORG_DATA_DENY}. ${outcome}; tell the user.`,
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
function validateArtifactPathInput(action, input, url) {
  let allowsPath = action === "watch" && artifactLivePathsSchemaOpen();
  if (allowsPath && input.path !== undefined && AUTO_OPEN_HOOK?.livePathFrom(input) === undefined)
    return {
      result: false,
      message: AUTO_OPEN_HOOK?.LIVE_PATH_INVALID ?? "invalid path",
      errorCode: 8,
    };
  let filtered = Object.keys(input).filter(
    (key) => key !== "action" && key !== "url" && !(allowsPath && key === "path") && input[key] !== undefined,
  );
  if (filtered.length > 0)
    return {
      result: false,
      message: `action "${action}" takes only ${allowsPath ? "`url` (and `path`)" : "`url`"} \u2014 remove ${filtered.join(", ")}.`,
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
  let urlError = urlSubPathError(url);
  if (urlError) return urlError;
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
// deferred: uses registerLazyWriter (../actionNames.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qxvqcab6.js:20355", () => {
  registerLazyWriter({
    addOpenedFrameRow: openArtifactFrame,
    forgetArtifactDeletedThroughMcp: updateFrameState,
    markFrameOpenOutcome,
    derivePublishContext,
    surfacePublishedArtifact: autoOpenArtifactPreview,
  });
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
