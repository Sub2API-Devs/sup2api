/**
 * utils/shell/prefix.ts
 *
 * 危险 shell 名单与 shell 名分类；本段其余声明是误归（插件评测模拟应答、sandbox-runtime 的 WindowsSandboxError）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/prefix.ts
 * pieces: chunk-08q4d92p.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-08q4d92p.js:12036-12166 fingerprint (2.1.88 match: DANGEROUS_SHELL_PREFIXES, 0.646)
/**
 * 危险的 shell 前缀：zsh/bash/sh/fish/pwsh/cmd/nu 等 shell 本身，命令前缀提取时不能把它们当作可放行的前缀。
 */
var DANGEROUS_SHELL_PREFIXES = [
  "zsh",
  "bash",
  "fish",
  "sh",
  "dash",
  "ash",
  "ksh",
  "tcsh",
  "csh",
  "nu",
  "nushell",
  "pwsh",
  "powershell",
  "cmd",
  "elvish",
  "xonsh",
  "ion",
];
export { DANGEROUS_SHELL_PREFIXES };
