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
var CONFIG_REPO_TRUSTED = "config:repo-trusted";
var CONFIG_NO_GIT_REPO = "config:no-git-repo";
var CONFIG_REPO_TRUST_DECLINED = "config:repo-trust-declined";
//@ chunk-s61vbvea.js:590296-590486 placement
function repositoryTrustFromTags(tags) {
  let tagSet = new Set(Array.isArray(tags) ? tags.filter((tag) => typeof tag === "string") : []);
  if (tagSet.has(CONFIG_REPO_TRUSTED)) return "trusted";
  if (tagSet.has(CONFIG_NO_GIT_REPO)) return "no_repository";
  return tagSet.has(CONFIG_REPO_TRUST_DECLINED) ? "declined" : "not_marked";
}
//@ chunk-s61vbvea.js:590486-590522 placement
/**
 * 导出函数 `repositoryTrustFromMessageTags`：参数 e, n，返回 repositoryTrustFromTags(e.tags)。
 */
function repositoryTrustFromMessageTags(message, fallback) {
  return repositoryTrustFromTags(message.tags);
}
//@ chunk-s61vbvea.js:590522-590601 placement
/**
 * 仓库信任状态的判定与文案：最终态（not_marked/declined/nothing_to_mark）、是否可上报、是否可标记，以及各状态对应的同意提示文案。
 */
function isRepositoryTrustUnresolved(trust) {
  return trust === "not_marked" || trust === "declined" || trust === "nothing_to_mark";
}
//@ chunk-s61vbvea.js:590601-590680 placement
/**
 * 导出函数 `reportableRepositoryTrust`：参数 e, n，返回 (e === "not_marked" || e === "nothing_to_mark") && !n ? void 0 : e。
 */
function reportableRepositoryTrust(trust, isFirstMark) {
  return (trust === "not_marked" || trust === "nothing_to_mark") && !isFirstMark ? undefined : trust;
}
//@ chunk-s61vbvea.js:590680-590734 placement
/**
 * 导出函数 `markableRepositoryTrust`：参数 e，返回 e === "nothing_to_mark" ? void 0 : e。
 */
function markableRepositoryTrust(trust) {
  return trust === "nothing_to_mark" ? undefined : trust;
}
//@ chunk-s61vbvea.js:590734-590791 placement
/**
 * 导出函数 `repositoryTrustConsentText`：参数 e，返回 REMOTE_TOOLS_CONSENT_TEXT[`repository_trust.state.${e}`]; } export { Jti, Str, Qti, Xti, Zti }。
 */
function repositoryTrustConsentText(repositoryTrust) {
  return REMOTE_TOOLS_CONSENT_TEXT[`repository_trust.state.${repositoryTrust}`];
}
export {
  isRepositoryTrustUnresolved,
  reportableRepositoryTrust,
  markableRepositoryTrust,
  repositoryTrustFromMessageTags,
  repositoryTrustConsentText,
};
