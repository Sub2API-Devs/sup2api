/**
 * utils/sandbox/defaultAllowedDomains.ts
 *
 * 2.1.316 新增：沙箱默认允许域名
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { GITHUB_HOST } from "../git/githubUrl.js";
import { HostScoped } from "../hostScoped.js";

//@ chunk-5xgkngpb.js:1269147-1269391 placement
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
//@ chunk-5xgkngpb.js:1269391-1269413 placement
var A_ZA_Z0_9 = "A-Za-z0-9.-";
//@ chunk-5xgkngpb.js:1269413-1269494 placement
var EMPTY_DOMAIN_POLICY_CACHE = {
  regex: null,
  patterns: null,
  hashes: null,
  beneath: true,
  tools: null,
  models: null,
};
//@ chunk-5xgkngpb.js:1269494-1269577 placement
class DomainPolicyCache {
  cachedKey = undefined;
  cached = EMPTY_DOMAIN_POLICY_CACHE;
  warnedReasons = new Set();
  compiledDefault = undefined;
}
//@ chunk-5xgkngpb.js:1269577-1269604 placement
var domainPolicyCacheSlot = new HostScoped(() => new DomainPolicyCache());
//@ chunk-5xgkngpb.js:1269604-1269640 placement
var regExp_9 = new RegExp(`[${A_ZA_Z0_9}]+`, "g");
