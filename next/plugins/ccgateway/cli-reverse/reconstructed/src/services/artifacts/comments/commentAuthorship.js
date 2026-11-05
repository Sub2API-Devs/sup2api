/**
 * services/artifacts/comments/commentAuthorship.ts
 *
 * 2.1.316 新增：评论作者归属判定（本人主体令牌）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-x6hygg70.js (11)
 * attribution: placement 11
 */
import { resolveGatewayAccountInfo } from "../../../utils/gatewayCredential.js";
import { getClaudeAIOAuthTokenOriginAsync } from "../../../utils/auth.js";
import { getLiveState, resetOwnPrincipalTokens } from "../../liveReplica/liveReplica.js";
import { directAuthFingerprint, settleDirectAuth } from "../frameRelay.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { stringSchema } from "../../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-x6hygg70.js:415-469 placement
/**
 * 评论作者身份常量：principal token（u_ 开头）与原始角色字符串的正则、relay 路由，以及本账号已记住的 token 集合。
 */
var PRINCIPAL_TOKEN_RE = /^u_[A-Za-z0-9_]{1,62}$/;
var ORIGINAL_ROLE_RE = /^[a-z_]{0,32}$/;
//@ chunk-x6hygg70.js:469-555 placement
function hasAuthorAccount(account, principal) {
  return !(
    account === undefined ||
    account === null ||
    account === "" ||
    (account === "agent" && principal === "assistant")
  );
}
//@ chunk-x6hygg70.js:555-655 placement
function isOwnPrincipal(accountName, principal) {
  if (principal.tokens.has(accountName)) return true;
  return principal.account !== undefined && accountName.toLowerCase() === principal.account;
}
//@ chunk-x6hygg70.js:655-801 placement
async function ownAccountUuid(credentials) {
  let { info } = resolveGatewayAccountInfo();
  let out =
    (await getClaudeAIOAuthTokenOriginAsync(credentials)) === "store"
      ? info?.accountUuid?.toLowerCase()
      : undefined;
  return {
    account: out === "" ? undefined : out,
    tokens: ownPrincipalTokens(),
  };
}
//@ chunk-x6hygg70.js:801-1065 placement
function classifyThreadAuthors(comments, info) {
  let hasAccount = info.account !== undefined || info.tokens.size > 0;
  let unknown = false;
  for (let comment of comments)
    if (
      comment.account === "unknown" ||
      comment.role === "degraded" ||
      comment.postedByArtifact === true ||
      !hasAccount ||
      (PRINCIPAL_TOKEN_RE.test(comment.account) && info.tokens.size === 0)
    )
      unknown = true;
    else if (!isOwnPrincipal(comment.account, info)) return "other";
  return unknown ? "unknown" : "own";
}
//@ chunk-x6hygg70.js:1065-1130 placement
function ownAccountUuidForComments() {
  return resolveGatewayAccountInfo().info?.accountUuid?.toLowerCase() ?? null;
}
//@ chunk-x6hygg70.js:1130-1144 placement
var EMPTY_TOKEN_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6hygg70.js:1130", () => {
  EMPTY_TOKEN_SET = new Set();
});
//@ chunk-x6hygg70.js:1144-1350 placement
function ownPrincipalTokens() {
  let replica = getLiveState();
  let ownPrincipalTokens = replica.ownPrincipalTokens;
  if (ownPrincipalTokens.size === 0) return EMPTY_TOKEN_SET;
  if (replica.ownPrincipalTokenAccount !== ownAccountUuidForComments()) {
    resetOwnPrincipalTokens(replica);
    return EMPTY_TOKEN_SET;
  }
  let fingerprint = directAuthFingerprint();
  for (let [token, user] of ownPrincipalTokens)
    if (user !== RELAY && user !== fingerprint) ownPrincipalTokens.delete(token);
  return new Set(ownPrincipalTokens.keys());
}
//@ chunk-x6hygg70.js:1350-1388 placement
var RELAY; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var principalTokenSchema;
deferInit("chunk-x6hygg70.js:1350", () => {
  RELAY = "relay";
  principalTokenSchema = DoctorLazy(() => stringSchema().regex(PRINCIPAL_TOKEN_RE));
});
//@ chunk-x6hygg70.js:1388-1497 placement
async function commentsAuthContext(credentials) {
  await settleDirectAuth(credentials);
  ownPrincipalTokens();
  return {
    epoch: getLiveState().ownPrincipalTokenEpoch,
    account: ownAccountUuidForComments(),
    bearer: directAuthFingerprint(),
  };
}
//@ chunk-x6hygg70.js:1497-1878 placement
function rememberPrincipalTokens(account, tokens, sentAuthFingerprint, route) {
  let liveState = getLiveState();
  if (liveState.ownPrincipalTokenEpoch !== tokens.epoch || ownAccountUuidForComments() !== tokens.account)
    return;
  let stored =
    route === "relay"
      ? RELAY
      : tokens.bearer !== null &&
          directAuthFingerprint() === tokens.bearer &&
          sentAuthFingerprint === tokens.bearer
        ? tokens.bearer
        : undefined;
  if (stored === undefined) return;
  let parsed = principalTokenSchema().safeParse(account);
  if (parsed.success) {
    if (liveState.ownPrincipalTokenAccount !== tokens.account) {
      liveState.ownPrincipalTokens.clear();
      liveState.ownPrincipalTokenAccount = tokens.account;
    }
    liveState.ownPrincipalTokens.set(parsed.data, stored);
  }
}
export {
  ownAccountUuid,
  ownPrincipalTokens,
  isOwnPrincipal,
  PRINCIPAL_TOKEN_RE,
  ORIGINAL_ROLE_RE,
  hasAuthorAccount,
  commentsAuthContext,
  rememberPrincipalTokens,
  classifyThreadAuthors,
};
