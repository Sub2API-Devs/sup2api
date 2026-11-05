/**
 * tools/PowerShellTool/commandSemantics.ts
 *
 * 316 中归到此处的是 Windows 路径规范化函数（旧版名 extractBaseCommand 配错）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/commandSemantics.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:3192159-3192875 placement (2.1.88 match: PIPELINE_TAIL_CMDLETS, 0.467)
/**
 * （切分错误）PowerShell/Windows 命令退出码语义：grep/rg/findstr 的 1 为无匹配、robocopy 的 0–7 为成功，其他非 0 为错误。
 */
var defaultExitInterpreter = (exitCode, stdout, stderr) => ({
  isError: exitCode !== 0,
  message: exitCode !== 0 ? `Command failed with exit code ${exitCode}` : undefined,
});
var exitOneMeans = (message) => (exitCode, stdout, stderr) => ({
  isError: exitCode !== 0 && exitCode !== 1,
  message: exitCode === 1 ? message : undefined,
});
var NO_MATCHES_INTERPRETER = exitOneMeans("No matches found");
var FILES_DIFFER_INTERPRETER = exitOneMeans("Files differ");
var EXIT_INTERPRETERS = new Map([
  ["grep", NO_MATCHES_INTERPRETER],
  ["rg", NO_MATCHES_INTERPRETER],
  ["egrep", NO_MATCHES_INTERPRETER],
  ["fgrep", NO_MATCHES_INTERPRETER],
  ["findstr", NO_MATCHES_INTERPRETER],
  [
    "robocopy",
    (exitCode, stdout, stderr) => ({
      isError: exitCode < 0 || exitCode >= 8,
      message:
        exitCode === 0
          ? "No files copied (already in sync)"
          : exitCode >= 1 && exitCode < 8
            ? exitCode & 1
              ? "Files copied successfully"
              : "Robocopy completed (no errors)"
            : undefined,
    }),
  ],
]);
var NATIVE_EXE_EXIT_INTERPRETERS = new Map([
  ["where", exitOneMeans("No matching files found")],
  ["fc", exitOneMeans("Files differ")],
  ["diff", exitOneMeans("Files differ")],
]);
var PIPELINE_PASSTHROUGH_CMDLETS = new Set([
  "select-object",
  "sort-object",
  "group-object",
  "get-unique",
  "format-table",
  "format-list",
  "format-wide",
  "out-string",
  "out-host",
]);
export {
  PIPELINE_PASSTHROUGH_CMDLETS,
  NO_MATCHES_INTERPRETER,
  FILES_DIFFER_INTERPRETER,
  NATIVE_EXE_EXIT_INTERPRETERS,
  EXIT_INTERPRETERS,
  defaultExitInterpreter,
};
