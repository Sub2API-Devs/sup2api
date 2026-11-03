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
import { O0o } from "../../../services/artifacts/contentTypes.js";
import { readUntrustedArray, Uf } from "../../../utils/untrustedArray.js";
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
import { zln } from "./ruleTarget.js";
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
import { Uai } from "../actionNames.js";

//@ chunk-qxvqcab6.js:15043-15735 placement
function isApprovableFileWrite(e, n) {
  if (typeof e !== "object" || e === null) return !1;
  let r = n.documents ? APPROVABLE_CONTENT_TYPES : O0o,
    { file_path: file_path, files: files } = e;
  if (isLiveOrReseed(e) || !isApprovableFile(file_path, void 0, r)) return !1;
  if (files === void 0) return !0;
  let u = readUntrustedArray(files);
  if (u === Uf) return !1;
  if (u !== void 0)
    return u.every((a) =>
      typeof a === "string"
        ? isApprovableFile(a, void 0, r)
        : a !== null &&
          typeof a === "object" &&
          !isLiveOrReseed(a) &&
          isApprovableFile(a.path, a.contentType, r),
    );
  if (files === null || typeof files !== "object") return !1;
  return Object.entries(files).every(([a, l]) => {
    if (l === null) return !0;
    if (typeof l === "string") return isApprovableFile(a, void 0, r);
    if (typeof l !== "object" || Array.isArray(l)) return !1;
    if (isLiveOrReseed(l)) return !1;
    let d = l;
    if (typeof d.from === "string" && d.artifact !== void 0) return !1;
    if (typeof d.artifact === "string") return areBothApprovable(a, l.path, r);
    return isApprovableFile(a, l.contentType, r);
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
  if (e?.title === void 0) return;
  if (n === void 0) return e.title;
  let r = uuidSlugFromUrl(n);
  return r !== null && uuidSlugFromUrl(e.url) === r ? e.title : void 0;
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
        : "Reading this artifact is",
    s = n === "" ? "" : ` \u2014 ${n}`;
  return `${o} blocked by ${denyRulePhrase(e)}${s}`;
}
//@ chunk-qxvqcab6.js:16566-16674 placement
function denyByArtifactRule(e, n = "", r = !1) {
  return {
    behavior: "deny",
    message: `${artifactReadBlockedMessage(e, n, r)}.`,
    decisionReason: { type: "rule", rule: e },
  };
}
//@ chunk-qxvqcab6.js:16674-16796 placement
function readDeniedByRule(e, n, r, o, s) {
  let u = artifactCallReadRule(getToolPermissionContext(e), n, r, "deny", s);
  return u === null
    ? void 0
    : new ArtifactInputError(artifactReadBlockedMessage(u, o, s.copySource === !0), "read_denied");
}
//@ chunk-qxvqcab6.js:16796-16951 placement
function askRuleCoverageNote(e) {
  return e.ruleValue.toolName === WEBFETCH
    ? ` (your ${WEBFETCH} ask rule covers artifact reads)`
    : ` (your ${e.ruleValue.toolName} ask rule covers this url)`;
}
//@ chunk-qxvqcab6.js:16951-17368 placement
function isRoomPublishCall(e) {
  if (!artifactRoomSurfaceOpen() || e === null || e === void 0) return !1;
  if (e.action !== void 0 && e.action !== "publish") return !1;
  let n = getDeclaredCapabilities(e);
  if (n !== void 0) return isPlainObject(n) && n.room !== void 0;
  let r = typeUrlOf(e);
  if (r !== void 0) {
    let u = parseArtifactUrl(r);
    return u !== null && typeReadDeclaresRoom(u.slug);
  }
  let o = typeof e.url === "string" ? parseArtifactUrl(e.url) : null,
    s;
  try {
    s =
      o !== null
        ? getShareEntry(o.slug)
        : typeof e.file_path === "string"
          ? getShareEntryForPath(expandPath(e.file_path))
          : void 0;
  } catch {
    s = void 0;
  }
  return s?.capabilities?.room !== void 0;
}
//@ chunk-qxvqcab6.js:17368-17415 placement
var EMPTY_COMMENT_SETS = { threadIds: new Set(), commentIds: new Set() };
//@ chunk-qxvqcab6.js:17415-17472 placement
function artifactReleaseInfo(e) {
  return { url: artifactViewerUrl(e.slug), release: e.current };
}
//@ chunk-qxvqcab6.js:17472-17603 placement
function parseArtifactUrlOrThrow(e) {
  let n = typeof e === "string" ? parseArtifactUrl(e) : null;
  if (!n) throw new ArtifactInputError(`not an artifact URL: ${String(e)}`, "invalid_url");
  return n;
}
//@ chunk-qxvqcab6.js:17603-17917 placement
function findBatchWriteRule(e, n, r, o) {
  if (typeof r !== "object" || r === null || !isArtifactBatchWrite(r)) return;
  let { writes: writes, ...u } = r;
  for (let [a, l] of batchWrites(r).entries()) {
    let d = zln(
      n,
      e,
      {
        ...u,
        db_op: l.op,
        collection: l.collection,
        doc_id: l.docId,
        ...(l.data !== void 0 && { data: l.data }),
        ...(l.filePath !== void 0 && { file_path: l.filePath }),
      },
      o,
    );
    if (d) return { index: a, rule: d };
  }
  return;
}
//@ chunk-qxvqcab6.js:17917-18041 placement
function findStrReplaceRule(e, n, r, o) {
  if (typeof r !== "object" || r === null || r.db_op !== STR_REPLACE) return;
  return zln(n, e, { ...r, db_op: "update" }, o) ?? void 0;
}
//@ chunk-qxvqcab6.js:18041-18154 placement = getDenyRuleForAgent (1)
function formatRuleForDisplay(e) {
  return e.ruleValue.ruleContent === void 0
    ? e.ruleValue.toolName
    : `${e.ruleValue.toolName}(${formatRuleContentForDisplay(e)})`;
}
//@ chunk-qxvqcab6.js:18154-18443 placement
function denyArtifactBatchByRule(e, n, r) {
  let o = findBatchWriteRule(e, n, r, "deny");
  return o === void 0
    ? void 0
    : {
        behavior: "deny",
        message: `Permission to use ${ARTIFACT_TOOL_NAME} has been denied by your rule ${formatRuleForDisplay(o.rule)} (writes[${o.index}] of this batch matches it), so nothing in the batch was written.`,
        decisionReason: { type: "rule", rule: o.rule },
      };
}
//@ chunk-qxvqcab6.js:18443-18705 placement
function denyArtifactStrReplaceByRule(e, n, r) {
  let o = findStrReplaceRule(e, n, r, "deny");
  return o === void 0
    ? void 0
    : {
        behavior: "deny",
        message: `Permission to use ${ARTIFACT_TOOL_NAME} has been denied by your rule ${formatRuleForDisplay(o)} (a str_replace is an update of one field), so nothing was written.`,
        decisionReason: { type: "rule", rule: o },
      };
}
//@ chunk-qxvqcab6.js:18705-19225 placement
function askArtifactBatchByRule(e, n, r, o) {
  let s = findBatchWriteRule(e, r, o, "ask");
  if (s === void 0 || typeof o !== "object" || o === null) return;
  let u = Reflect.get(o, "url"),
    a = typeof u === "string" ? parseArtifactUrl(u) : null;
  return {
    behavior: "ask",
    message: `Claude wants to write a batch to this artifact's database, and writes[${s.index}] matches your ask rule ${formatRuleForDisplay(s.rule)} \u2014 the full permission check could not complete, so approving covers only this call.`,
    updatedInput: {
      ...o,
      [CONSENT_ASK_TAG]: !1,
      [ARTIFACT_DISPLAY_TARGET_TAG]: a === null ? null : artifactCardTitleFor(a, n),
    },
    suppressAlwaysAllowRule: !0,
    decisionReason: { type: "rule", rule: s.rule },
  };
}
//@ chunk-qxvqcab6.js:19225-19388 placement
function denyOtherOrgArtifact(e, n) {
  if (!probedOtherOrg(getShareEntry(e.slug))) return null;
  return {
    behavior: "deny",
    message: `${artifactViewerUrlFor(e)}: ${OTHER_ORG_DENY}. ${n}; tell the user.`,
    decisionReason: { type: "other", reason: OTHER_ORG_DECISION_REASON },
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
    decisionReason: { type: "other", reason: OUTSIDE_ORG_DATA_DECISION_REASON },
  };
}
/**
 * 校验 Artifact 工具输入里的 path/url（watch 的 live path、artifact URL 内的子路径等）。
 */
//@ chunk-qxvqcab6.js:19586-20355 placement
function validateArtifactPathInput(e, n, r) {
  let o = e === "watch" && artifactLivePathsSchemaOpen();
  if (o && n.path !== void 0 && AUTO_OPEN_HOOK?.livePathFrom(n) === void 0)
    return { result: !1, message: AUTO_OPEN_HOOK?.LIVE_PATH_INVALID ?? "invalid path", errorCode: 8 };
  let filtered = Object.keys(n).filter(
    (l) => l !== "action" && l !== "url" && !(o && l === "path") && n[l] !== void 0,
  );
  if (filtered.length > 0)
    return {
      result: !1,
      message: `action "${e}" takes only ${o ? "`url` (and `path`)" : "`url`"} \u2014 remove ${filtered.join(", ")}.`,
      errorCode: 8,
    };
  if (r === void 0) {
    if (e === "status") return { result: !0 };
    if (e === "verify") return { result: !0 };
    return {
      result: !1,
      message: `action "${e}" requires \`url\` \u2014 the artifact's claude.ai URL (find it with action: "list" or action: "status").`,
      errorCode: 7,
    };
  }
  let u = urlSubPathError(r);
  if (u) return u;
  let a = parseSessionArtifactUrl(r);
  if (!a.ok) return { result: !1, message: a.message, errorCode: a.errorCode };
  return { result: !0 };
}
//@ chunk-qxvqcab6.js:20355-20496 placement
Uai({
  addOpenedFrameRow: openArtifactFrame,
  forgetArtifactDeletedThroughMcp: updateFrameState,
  markFrameOpenOutcome: markFrameOpenOutcome,
  derivePublishContext: derivePublishContext,
  surfacePublishedArtifact: autoOpenArtifactPreview,
});
//@ chunk-qxvqcab6.js:20496-20523 placement
var ARTIFACT_PERMISSION_LIMITS = 64,
  Y = 15000,
  z = 65536;

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
  Y,
  z,
};
