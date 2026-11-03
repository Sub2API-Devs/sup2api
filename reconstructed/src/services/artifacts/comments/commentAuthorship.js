/**
 * services/artifacts/comments/commentAuthorship.ts
 *
 * 2.1.316 新增：评论作者归属判定（本人主体令牌）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-av47g0rj.js (11)
 * attribution: placement 11
 */
import { resolveGatewayAccountInfo } from "../../../utils/gatewayCredential.js";
import { getClaudeAIOAuthTokenOriginAsync } from "../../../utils/auth.js";
import { getLiveState, resetOwnPrincipalTokens } from "../../liveReplica/liveReplica.js";
import { directAuthFingerprint, settleDirectAuth } from "../frameRelay.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { string } from "../../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-av47g0rj.js:415-469 placement
/**
 * 评论作者身份常量：principal token（u_ 开头）与原始角色字符串的正则、relay 路由，以及本账号已记住的 token 集合。
 */
var PRINCIPAL_TOKEN_RE = /^u_[A-Za-z0-9_]{1,62}$/;
var ORIGINAL_ROLE_RE = /^[a-z_]{0,32}$/;
//@ chunk-av47g0rj.js:469-555 placement
function hasAuthorAccount(n, e) {
  return !(n === undefined || n === null || n === "" || (n === "agent" && e === "assistant"));
}
//@ chunk-av47g0rj.js:555-655 placement
function isOwnPrincipal(account, e) {
  if (e.tokens.has(account)) return true;
  return e.account !== undefined && account.toLowerCase() === e.account;
}
//@ chunk-av47g0rj.js:655-801 placement
async function ownAccountUuid(credentials) {
  let { info } = resolveGatewayAccountInfo();
  let r =
    (await getClaudeAIOAuthTokenOriginAsync(credentials)) === "store"
      ? info?.accountUuid?.toLowerCase()
      : undefined;
  return {
    account: r === "" ? undefined : r,
    tokens: ownPrincipalTokens(),
  };
}
//@ chunk-av47g0rj.js:801-1065 placement
function classifyThreadAuthors(n, e) {
  let r = e.account !== undefined || e.tokens.size > 0;
  let i = false;
  for (let t of n)
    if (
      t.account === "unknown" ||
      t.role === "degraded" ||
      t.postedByArtifact === true ||
      !r ||
      (PRINCIPAL_TOKEN_RE.test(t.account) && e.tokens.size === 0)
    )
      i = true;
    else if (!isOwnPrincipal(t.account, e)) return "other";
  return i ? "unknown" : "own";
}
//@ chunk-av47g0rj.js:1065-1130 placement
function ownAccountUuidForComments() {
  return resolveGatewayAccountInfo().info?.accountUuid?.toLowerCase() ?? null;
}
//@ chunk-av47g0rj.js:1130-1144 placement
var EMPTY_PRINCIPAL_TOKENS = new Set();
//@ chunk-av47g0rj.js:1144-1350 placement
function ownPrincipalTokens() {
  let liveState = getLiveState();
  let ownPrincipalTokens = liveState.ownPrincipalTokens;
  if (ownPrincipalTokens.size === 0) return EMPTY_PRINCIPAL_TOKENS;
  if (liveState.ownPrincipalTokenAccount !== ownAccountUuidForComments()) {
    resetOwnPrincipalTokens(liveState);
    return EMPTY_PRINCIPAL_TOKENS;
  }
  let r = directAuthFingerprint();
  for (let [i, t] of ownPrincipalTokens) if (t !== RELAY && t !== r) ownPrincipalTokens.delete(i);
  return new Set(ownPrincipalTokens.keys());
}
//@ chunk-av47g0rj.js:1350-1388 placement
var RELAY = "relay";
var principalTokenSchema = DoctorLazy(() => string().regex(PRINCIPAL_TOKEN_RE));
//@ chunk-av47g0rj.js:1388-1497 placement
async function commentsAuthContext(credentials) {
  await settleDirectAuth(credentials);
  ownPrincipalTokens();
  return {
    epoch: getLiveState().ownPrincipalTokenEpoch,
    account: ownAccountUuidForComments(),
    bearer: directAuthFingerprint(),
  };
}
//@ chunk-av47g0rj.js:1497-1878 placement
function rememberPrincipalTokens(n, e, sentAuthFingerprint, route) {
  let liveState = getLiveState();
  if (liveState.ownPrincipalTokenEpoch !== e.epoch || ownAccountUuidForComments() !== e.account) return;
  let a =
    route === "relay"
      ? RELAY
      : e.bearer !== null && directAuthFingerprint() === e.bearer && sentAuthFingerprint === e.bearer
        ? e.bearer
        : undefined;
  if (a === undefined) return;
  let s = principalTokenSchema().safeParse(n);
  if (s.success) {
    if (liveState.ownPrincipalTokenAccount !== e.account) {
      liveState.ownPrincipalTokens.clear();
      liveState.ownPrincipalTokenAccount = e.account;
    }
    liveState.ownPrincipalTokens.set(s.data, a);
  }
}
export {
  ORIGINAL_ROLE_RE,
  hasAuthorAccount,
  classifyThreadAuthors,
  ownAccountUuid,
  ownPrincipalTokens,
  isOwnPrincipal,
  PRINCIPAL_TOKEN_RE,
  commentsAuthContext,
  rememberPrincipalTokens,
};
