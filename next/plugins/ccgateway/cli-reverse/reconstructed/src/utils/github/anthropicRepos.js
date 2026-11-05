/**
 * utils/github/anthropicRepos.ts
 *
 * 2.1.316 新增：Anthropic 仓库判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-je4zwn2x.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isGithubDotCom } from "../git/githubUrl.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-je4zwn2x.js:227-285 placement
var ANTHROPICS = "anthropics";
var ANTHROPIC = "anthropic";
var ANTHROPIC_REPO_SLUG = `github.com/${ANTHROPICS}/${ANTHROPIC}`;
//@ chunk-je4zwn2x.js:285-352 placement
var regExp; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_2;
deferInit("chunk-je4zwn2x.js:285", () => {
  regExp = new RegExp(`${ANTHROPICS}[^]*${ANTHROPIC}`);
  regExp_2 = new RegExp(`^${ANTHROPIC}(?:\\.git)*$`);
});
//@ chunk-je4zwn2x.js:352-377 placement
/**
 * 判断文本是否指向 Anthropic 仓库（此构建恒为 false）。
 */
function isAnthropicRepoText(text) {
  return false;
}
//@ chunk-je4zwn2x.js:377-399 placement
/**
 * 空实现（Anthropic 仓库提示的占位）。
 */
function noopAnthropicRepoHint() {
  return;
}
//@ chunk-je4zwn2x.js:399-486 placement
/**
 * 判断远程仓库是否为 github.com/anthropics/anthropic。
 */
function isAnthropicRepo(repository) {
  return (
    isGithubDotCom(repository.host) &&
    repository.owner.toLowerCase() === ANTHROPICS &&
    repository.name.toLowerCase() === ANTHROPIC
  );
}
export { isAnthropicRepo, isAnthropicRepoText, noopAnthropicRepoHint };
