/**
 * utils/sandbox/defaultAllowedDomains.ts
 *
 * 2.1.316 新增：沙箱默认允许域名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import { GITHUB_HOST } from "../git/githubUrl.js";
import { HostScoped } from "../hostScoped.js";

//@ chunk-e6aww6q8.js:1271286-1271530 placement
var SANDBOX_SIZE_UNIT = 1e5;
var SANDBOX_SIZE_LIMIT = 10 * SANDBOX_SIZE_UNIT;
var DEFAULT_ALLOWED_DOMAINS = Object.freeze([
  GITHUB_HOST,
  `api.${GITHUB_HOST}`,
  `codeload.${GITHUB_HOST}`,
  "raw.githubusercontent.com",
  "objects.githubusercontent.com",
  "pypi.org",
  "files.pythonhosted.org",
  "registry.npmjs.org",
  "anthropic.com",
  "claude.ai",
  "claude.com",
  "ant.dev",
]);
//@ chunk-e6aww6q8.js:1271530-1271552 placement
var A_ZA_Z0_9 = "A-Za-z0-9.-";
//@ chunk-e6aww6q8.js:1271552-1271633 placement
var EMPTY_DOMAIN_POLICY_CACHE = {
  regex: null,
  patterns: null,
  hashes: null,
  beneath: true,
  tools: null,
  models: null,
};
//@ chunk-e6aww6q8.js:1271633-1271716 placement
class DomainPolicyCache {
  cachedKey = undefined;
  cached = EMPTY_DOMAIN_POLICY_CACHE;
  warnedReasons = new Set();
  compiledDefault = undefined;
}
//@ chunk-e6aww6q8.js:1271716-1271743 placement
var domainPolicyCacheSlot = new HostScoped(() => new DomainPolicyCache());
//@ chunk-e6aww6q8.js:1271743-1271779 placement
var regExp_9 = new RegExp(`[${A_ZA_Z0_9}]+`, "g");
