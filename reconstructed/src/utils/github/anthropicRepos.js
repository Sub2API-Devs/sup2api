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
var ANTHROPICS = "anthropics",
  ANTHROPIC = "anthropic",
  G = `github.com/${ANTHROPICS}/${ANTHROPIC}`;
//@ chunk-j7n8n7rc.js:285-352 placement
var regExp = new RegExp(`${ANTHROPICS}[^]*${ANTHROPIC}`),
  regExp_2 = new RegExp(`^${ANTHROPIC}(?:\\.git)*$`);
//@ chunk-j7n8n7rc.js:352-377 placement
function Lcr(o) {
  return !1;
}
//@ chunk-j7n8n7rc.js:377-399 placement
function Ayi() {
  return;
}
//@ chunk-j7n8n7rc.js:399-486 placement
function Hcr(o) {
  return isGithubDotCom(o.host) && o.owner.toLowerCase() === ANTHROPICS && o.name.toLowerCase() === ANTHROPIC;
}

export { Hcr, Ayi, Lcr };
