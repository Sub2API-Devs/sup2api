/**
 * components/permissions/BashPermissionRequest/bashToolUseOptions.tsx
 *
 * Bash 权限选项生成：yes / yes-apply-suggestions / yes-prefix-edited / yes-enable-auto-mode / no（含反馈输入）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/BashPermissionRequest/bashToolUseOptions.tsx
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { extractOutputRedirections } from "../../../utils/bash/commands.js";

//@ chunk-czq1j3j2.js:1348066-1348159 fingerprint (2.1.88 match: stripBashRedirections, 1)
function stripBashRedirections(command) {
  let { commandWithoutRedirections, redirections } = extractOutputRedirections(command);
  return redirections.length > 0 ? commandWithoutRedirections : command;
}
export { stripBashRedirections };
