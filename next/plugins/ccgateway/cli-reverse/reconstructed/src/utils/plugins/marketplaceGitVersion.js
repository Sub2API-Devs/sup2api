/**
 * utils/plugins/marketplaceGitVersion.ts
 *
 * git 版本是否 ≥2.36 的判定（市场 submodule 检查用）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e3y61d7t.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-e3y61d7t.js:983-1054 placement
/**
 * git 版本是否 ≥ 2.36。
 */
function isGitVersionAtLeast236(gitVersion) {
  return gitVersion !== null && (gitVersion.major > 2 || (gitVersion.major === 2 && gitVersion.minor >= 36));
}
export { isGitVersionAtLeast236 };
