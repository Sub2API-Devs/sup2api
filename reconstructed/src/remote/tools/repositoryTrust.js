/**
 * remote/tools/repositoryTrust.ts
 *
 * 远程工具仓库信任标记状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (7)
 * attribution: placement 7
 */
import { REMOTE_TOOLS_CONSENT_TEXT } from "./consentText.js";

//@ chunk-s61vbvea.js:590211-590296 placement
var CONFIG_REPO_TRUSTED = "config:repo-trusted",
  CONFIG_NO_GIT_REPO = "config:no-git-repo",
  CONFIG_REPO_TRUST_DECLINED = "config:repo-trust-declined";
//@ chunk-s61vbvea.js:590296-590486 placement
function repositoryTrustFromTags(e) {
  let n = new Set(Array.isArray(e) ? e.filter((r) => typeof r === "string") : []);
  if (n.has(CONFIG_REPO_TRUSTED)) return "trusted";
  if (n.has(CONFIG_NO_GIT_REPO)) return "no_repository";
  return n.has(CONFIG_REPO_TRUST_DECLINED) ? "declined" : "not_marked";
}
//@ chunk-s61vbvea.js:590486-590522 placement
function Xti(e, n) {
  return repositoryTrustFromTags(e.tags);
}
//@ chunk-s61vbvea.js:590522-590601 placement
function Jti(e) {
  return e === "not_marked" || e === "declined" || e === "nothing_to_mark";
}
//@ chunk-s61vbvea.js:590601-590680 placement
function Str(e, n) {
  return (e === "not_marked" || e === "nothing_to_mark") && !n ? void 0 : e;
}
//@ chunk-s61vbvea.js:590680-590734 placement
function Qti(e) {
  return e === "nothing_to_mark" ? void 0 : e;
}
//@ chunk-s61vbvea.js:590734-590791 placement
function Zti(e) {
  return REMOTE_TOOLS_CONSENT_TEXT[`repository_trust.state.${e}`];
}

export { Jti, Str, Qti, Xti, Zti };
