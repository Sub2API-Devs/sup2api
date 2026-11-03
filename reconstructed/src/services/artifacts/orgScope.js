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
import { Vt } from "../../utils/agentId.js";
import { BOOT_ORG_MISMATCH_CODE } from "./shareEntries.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, M, o } from "../../../vendor/zod/v4/classic/schemas.js";

/**
 * 解析 artifact URL 并校验属于本会话的 claude.ai 环境；不是 artifact 链接或环境不符时返回带错误码的说明。
 */
//@ chunk-jv307fw4.js:25608-25934 placement
function parseSessionArtifactUrl(e, n = {}) {
  let r = parseArtifactUrl_2(e);
  if (r === null)
    return { ok: !1, message: n.notUrlMessage ?? explainNonArtifactUrl(e, { field: n.field }), errorCode: 4 };
  let s = claudeAiEnvironment();
  if (r.env !== s) {
    let a = n.envHint ? ` \u2014 ${n.envHint(s)}` : "";
    return {
      ok: !1,
      message: `that artifact URL is for ${r.env}, but this session targets ${s} claude.ai${a}`,
      errorCode: 5,
    };
  }
  return { ok: !0, parsed: r };
}
//@ chunk-jv307fw4.js:25934-25947 placement
var st = 60000;
//@ chunk-jv307fw4.js:25947-25982 placement
function k_e(e) {
  return e.gone === !0;
}
//@ chunk-jv307fw4.js:25982-26027 placement
function cbt(e) {
  return e.neverPublished === !0;
}
//@ chunk-jv307fw4.js:26027-26065 placement
function B5(e) {
  return e.otherOrg === !0;
}
/**
 * 判断响应体是否是"组织不匹配"的拒绝，且带有合法的所属组织 id。
 */
//@ chunk-jv307fw4.js:26065-26222 placement
function isOrgMismatchBody(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    denyPolicyBody(e)?.reason === "org_mismatch" &&
    "owner_org" in e &&
    typeof e.owner_org === "string" &&
    Vt(e.owner_org) !== null
  );
}
/**
 * artifact 位于用户的另一个组织时的说明、对应补救（/login 到那个组织），以及组织外公开 artifact 只能读不能监听的说明。
 */
//@ chunk-jv307fw4.js:26222-26493 placement
var OTHER_ORG_PHRASE =
    "this Artifact is in another of the user's organizations, not the one this session is signed in to",
  LOGIN_OTHER_ORG_REMEDY = "the user runs /login and signs in to that organization",
  PUBLIC_OUTSIDE_ORG_NOTE =
    "this is a public artifact from outside the user's organization: it can be read, but not watched";
/**
 * 读取别的组织/邮件分享 artifact 失败时的提示文字、会导致不应重试的 boot 403 错误码集合，以及"不要重试，告知用户后继续"的指令。
 */
//@ chunk-jv307fw4.js:26493-27035 placement
var OTHER_ORG_MESSAGE = `${OTHER_ORG_PHRASE} \u2014 it opens here only after ${LOGIN_OTHER_ORG_REMEDY}`,
  EMAIL_INVITE_HINT =
    "If it was shared with you by email, accept the invitation in a browser first, and check that Claude Code is signed in to the invited account",
  CROSS_ORG_SHARE_HINT =
    "If this was shared with you from another organization, open it in Claude Code on your computer or in a Claude Code on the web session",
  ACCESS_REFUSAL_CODES = new Set([
    BOOT_ORG_MISMATCH_CODE,
    "boot_403_agent_not_added",
    "boot_403_agent_owned",
    "boot_403_request_access",
  ]),
  DO_NOT_RETRY_READ_NOTE =
    "Do not retry this read; tell the user now that the artifact could not be read, then go on without it.";
//@ chunk-jv307fw4.js:27035-27108 placement
function L2s(e) {
  return k_e(e) || (e.errorCode !== void 0 && ACCESS_REFUSAL_CODES.has(e.errorCode));
}
//@ chunk-jv307fw4.js:27108-27177 placement
function H2s(e) {
  return e.replace(`. ${EMAIL_INVITE_HINT}`, "").replace(`. ${CROSS_ORG_SHARE_HINT}`, "");
}
//@ chunk-jv307fw4.js:27177-27247 placement
var Jt = DoctorLazy(() => u({ request_access: M(), reason: o().optional() })),
  vFr = 15000;

export {
  k_e,
  B5,
  cbt,
  parseSessionArtifactUrl,
  L2s,
  DO_NOT_RETRY_READ_NOTE,
  OTHER_ORG_PHRASE,
  LOGIN_OTHER_ORG_REMEDY,
  PUBLIC_OUTSIDE_ORG_NOTE,
  H2s,
  vFr,
  st,
  CROSS_ORG_SHARE_HINT,
  EMAIL_INVITE_HINT,
  isOrgMismatchBody,
  OTHER_ORG_MESSAGE,
  Jt,
};
