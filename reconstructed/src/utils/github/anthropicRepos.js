/**
 * utils/github/anthropicRepos.ts
 *
 * 2.1.316 新增：Anthropic 仓库判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-j7n8n7rc.js (5)
 * attribution: placement 5
 */
import { isGithubDotCom } from "../git/githubUrl.js";

//@ chunk-j7n8n7rc.js:227-285 placement
var ANTHROPICS = "anthropics";
var ANTHROPIC = "anthropic";
var ANTHROPIC_REPO_SLUG = `github.com/${ANTHROPICS}/${ANTHROPIC}`;
//@ chunk-j7n8n7rc.js:285-352 placement
var regExp = new RegExp(`${ANTHROPICS}[^]*${ANTHROPIC}`);
var regExp_2 = new RegExp(`^${ANTHROPIC}(?:\\.git)*$`);
//@ chunk-j7n8n7rc.js:352-377 placement
/**
 * 判断文本是否指向 Anthropic 仓库（此构建恒为 false）。
 */
function isAnthropicRepoText(o) {
  return false;
}
//@ chunk-j7n8n7rc.js:377-399 placement
/**
 * 空实现（Anthropic 仓库提示的占位）。
 */
function noopAnthropicRepoHint() {
  return;
}
//@ chunk-j7n8n7rc.js:399-486 placement
/**
 * 判断远程仓库是否为 github.com/anthropics/anthropic。
 */
function isAnthropicRepo(o) {
  return isGithubDotCom(o.host) && o.owner.toLowerCase() === ANTHROPICS && o.name.toLowerCase() === ANTHROPIC;
}
export { isAnthropicRepo, noopAnthropicRepoHint, isAnthropicRepoText };
