/**
 * services/artifacts/orgScope.ts
 *
 * 2.1.316 新增：artifact 组织范围判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (11)
 * attribution: placement 11
 */
import { parseArtifactUrl as parseArtifactUrl_2 } from "../../tools/ArtifactTool/constants.js";
import { explainNonArtifactUrl } from "./artifactUrl.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { denyPolicyBody } from "./publishErrors.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { BOOT_ORG_MISMATCH_CODE } from "./shareEntries.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, booleanSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-jv307fw4.js:25608-25934 placement
/**
 * 解析 artifact URL 并校验属于本会话的 claude.ai 环境；不是 artifact 链接或环境不符时返回带错误码的说明。
 */
function parseSessionArtifactUrl(urlText, options = {}) {
  let artifactUrl = parseArtifactUrl_2(urlText);
  if (artifactUrl === null)
    return {
      ok: false,
      message:
        options.notUrlMessage ??
        explainNonArtifactUrl(urlText, {
          field: options.field,
        }),
      errorCode: 4,
    };
  let envName = claudeAiEnvironment();
  if (artifactUrl.env !== envName) {
    let envHint = options.envHint ? ` \u2014 ${options.envHint(envName)}` : "";
    return {
      ok: false,
      message: `that artifact URL is for ${artifactUrl.env}, but this session targets ${envName} claude.ai${envHint}`,
      errorCode: 5,
    };
  }
  return {
    ok: true,
    parsed: artifactUrl,
  };
}
//@ chunk-jv307fw4.js:25934-25947 placement
var ORG_SCOPE_CACHE_MS = 60000;
//@ chunk-jv307fw4.js:25947-25982 placement
/**
 * 导出函数 `isGone`：参数 e，返回 e.gone === !0。
 */
function isGone(body) {
  return body.gone === true;
}
//@ chunk-jv307fw4.js:25982-26027 placement
/**
 * 导出函数 `isNeverPublished`：参数 e，返回 e.neverPublished === !0。
 */
function isNeverPublished(body) {
  return body.neverPublished === true;
}
//@ chunk-jv307fw4.js:26027-26065 placement
/**
 * 导出函数 `isOtherOrg`：参数 e，返回 e.otherOrg === !0。
 */
function isOtherOrg(body) {
  return body.otherOrg === true;
}
//@ chunk-jv307fw4.js:26065-26222 placement
/**
 * 判断响应体是否是"组织不匹配"的拒绝，且带有合法的所属组织 id。
 */
function isOrgMismatchBody(body) {
  return (
    typeof body === "object" &&
    body !== null &&
    denyPolicyBody(body)?.reason === "org_mismatch" &&
    "owner_org" in body &&
    typeof body.owner_org === "string" &&
    normalizeUuidOrNull(body.owner_org) !== null
  );
}
//@ chunk-jv307fw4.js:26222-26493 placement
/**
 * artifact 位于用户的另一个组织时的说明、对应补救（/login 到那个组织），以及组织外公开 artifact 只能读不能监听的说明。
 */
var OTHER_ORG_PHRASE =
  "this Artifact is in another of the user's organizations, not the one this session is signed in to";
var LOGIN_OTHER_ORG_REMEDY = "the user runs /login and signs in to that organization";
var PUBLIC_OUTSIDE_ORG_NOTE =
  "this is a public artifact from outside the user's organization: it can be read, but not watched";
//@ chunk-jv307fw4.js:26493-27035 placement
/**
 * 读取别的组织/邮件分享 artifact 失败时的提示文字、会导致不应重试的 boot 403 错误码集合，以及"不要重试，告知用户后继续"的指令。
 */
var OTHER_ORG_MESSAGE; // deferred: uses BOOT_ORG_MISMATCH_CODE (./shareEntries.js) of its import cycle while loading; runs once the cycle is complete
var EMAIL_INVITE_HINT;
var CROSS_ORG_SHARE_HINT;
var ACCESS_REFUSAL_CODES;
var DO_NOT_RETRY_READ_NOTE;
deferInit("chunk-jv307fw4.js:26493", () => {
  OTHER_ORG_MESSAGE = `${OTHER_ORG_PHRASE} \u2014 it opens here only after ${LOGIN_OTHER_ORG_REMEDY}`;
  EMAIL_INVITE_HINT =
    "If it was shared with you by email, accept the invitation in a browser first, and check that Claude Code is signed in to the invited account";
  CROSS_ORG_SHARE_HINT =
    "If this was shared with you from another organization, open it in Claude Code on your computer or in a Claude Code on the web session";
  ACCESS_REFUSAL_CODES = new Set([
    BOOT_ORG_MISMATCH_CODE,
    "boot_403_agent_not_added",
    "boot_403_agent_owned",
    "boot_403_request_access",
  ]);
  DO_NOT_RETRY_READ_NOTE =
    "Do not retry this read; tell the user now that the artifact could not be read, then go on without it.";
});
//@ chunk-jv307fw4.js:27035-27108 placement
/**
 * 导出函数 `isAccessRefused`：参数 e，返回 k_e(e) || (e.errorCode !== void 0 && ACCESS_REFUSAL_CODES.has(e.errorCode))。
 */
function isAccessRefused(body) {
  return isGone(body) || (body.errorCode !== undefined && ACCESS_REFUSAL_CODES.has(body.errorCode));
}
//@ chunk-jv307fw4.js:27108-27177 placement
/**
 * 导出函数 `stripInviteHints`：参数 e，返回 e.replace(`. ${EMAIL_INVITE_HINT}`, "").replace(`. ${CROSS_ORG_SHARE_HINT}`, "")。
 */
function stripInviteHints(message) {
  return message.replace(`. ${EMAIL_INVITE_HINT}`, "").replace(`. ${CROSS_ORG_SHARE_HINT}`, "");
}
//@ chunk-jv307fw4.js:27177-27247 placement
/**
 * 导出函数 `requestAccessSchema`。
 */
var requestAccessSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ACCESS_PROBE_TIMEOUT_MS;
deferInit("chunk-jv307fw4.js:27177", () => {
  requestAccessSchema = DoctorLazy(() =>
    objectSchema({
      request_access: booleanSchema(),
      reason: stringSchema().optional(),
    }),
  );
  ACCESS_PROBE_TIMEOUT_MS = 15000;
});
export {
  isGone,
  isOtherOrg,
  isNeverPublished,
  parseSessionArtifactUrl,
  isAccessRefused,
  DO_NOT_RETRY_READ_NOTE,
  OTHER_ORG_PHRASE,
  LOGIN_OTHER_ORG_REMEDY,
  PUBLIC_OUTSIDE_ORG_NOTE,
  stripInviteHints,
  ACCESS_PROBE_TIMEOUT_MS,
  ORG_SCOPE_CACHE_MS,
  CROSS_ORG_SHARE_HINT,
  EMAIL_INVITE_HINT,
  isOrgMismatchBody,
  OTHER_ORG_MESSAGE,
  requestAccessSchema,
};
