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
import { o } from "../../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-av47g0rj.js:415-469 placement
var PRINCIPAL_TOKEN_RE = /^u_[A-Za-z0-9_]{1,62}$/,
  Gor = /^[a-z_]{0,32}$/;
//@ chunk-av47g0rj.js:469-555 placement
function hasAuthorAccount(n, e) {
  return !(n === void 0 || n === null || n === "" || (n === "agent" && e === "assistant"));
}
//@ chunk-av47g0rj.js:555-655 placement
function isOwnPrincipal(n, e) {
  if (e.tokens.has(n)) return !0;
  return e.account !== void 0 && n.toLowerCase() === e.account;
}
//@ chunk-av47g0rj.js:655-801 placement
async function ownAccountUuid(n) {
  let { info: info } = resolveGatewayAccountInfo(),
    r = (await getClaudeAIOAuthTokenOriginAsync(n)) === "store" ? info?.accountUuid?.toLowerCase() : void 0;
  return { account: r === "" ? void 0 : r, tokens: ownPrincipalTokens() };
}
//@ chunk-av47g0rj.js:801-1065 placement
function classifyThreadAuthors(n, e) {
  let r = e.account !== void 0 || e.tokens.size > 0,
    i = !1;
  for (let t of n)
    if (
      t.account === "unknown" ||
      t.role === "degraded" ||
      t.postedByArtifact === !0 ||
      !r ||
      (PRINCIPAL_TOKEN_RE.test(t.account) && e.tokens.size === 0)
    )
      i = !0;
    else if (!isOwnPrincipal(t.account, e)) return "other";
  return i ? "unknown" : "own";
}
//@ chunk-av47g0rj.js:1065-1130 placement
function c() {
  return resolveGatewayAccountInfo().info?.accountUuid?.toLowerCase() ?? null;
}
//@ chunk-av47g0rj.js:1130-1144 placement
var u = new Set();
//@ chunk-av47g0rj.js:1144-1350 placement
function ownPrincipalTokens() {
  let n = getLiveState(),
    ownPrincipalTokens = n.ownPrincipalTokens;
  if (ownPrincipalTokens.size === 0) return u;
  if (n.ownPrincipalTokenAccount !== c()) return (resetOwnPrincipalTokens(n), u);
  let r = directAuthFingerprint();
  for (let [i, t] of ownPrincipalTokens) if (t !== RELAY && t !== r) ownPrincipalTokens.delete(i);
  return new Set(ownPrincipalTokens.keys());
}
//@ chunk-av47g0rj.js:1350-1388 placement
var RELAY = "relay",
  l = DoctorLazy(() => o().regex(PRINCIPAL_TOKEN_RE));
//@ chunk-av47g0rj.js:1388-1497 placement
async function commentsAuthContext(n) {
  return (
    await settleDirectAuth(n),
    ownPrincipalTokens(),
    { epoch: getLiveState().ownPrincipalTokenEpoch, account: c(), bearer: directAuthFingerprint() }
  );
}
//@ chunk-av47g0rj.js:1497-1878 placement
function rememberPrincipalTokens(n, e, r, i) {
  let t = getLiveState();
  if (t.ownPrincipalTokenEpoch !== e.epoch || c() !== e.account) return;
  let a =
    i === "relay"
      ? RELAY
      : e.bearer !== null && directAuthFingerprint() === e.bearer && r === e.bearer
        ? e.bearer
        : void 0;
  if (a === void 0) return;
  let safeParse = l().safeParse(n);
  if (safeParse.success) {
    if (t.ownPrincipalTokenAccount !== e.account)
      (t.ownPrincipalTokens.clear(), (t.ownPrincipalTokenAccount = e.account));
    t.ownPrincipalTokens.set(safeParse.data, a);
  }
}

export {
  Gor,
  hasAuthorAccount,
  classifyThreadAuthors,
  ownAccountUuid,
  ownPrincipalTokens,
  isOwnPrincipal,
  PRINCIPAL_TOKEN_RE,
  commentsAuthContext,
  rememberPrincipalTokens,
};
