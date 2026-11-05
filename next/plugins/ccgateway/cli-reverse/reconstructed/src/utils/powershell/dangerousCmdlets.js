/**
 * utils/powershell/dangerousCmdlets.ts
 *
 * PowerShell 危险 cmdlet 分类集合（脚本块执行、模块加载、网络、别名劫持、WMI、参数门控）与永不建议前缀名单 NEVER_SUGGEST。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/powershell/dangerousCmdlets.ts
 * pieces: chunk-6d2p9h2d.js (1), chunk-p7vpkf52.js (3)
 * attribution: fingerprint 2, callgraph-fingerprint 1, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { COMMON_ALIASES } from "./parser.js";
import { CROSS_PLATFORM_CODE_EXEC } from "../permissions/dangerousPatterns.js";
import { SHELL_PROGRAM_NAMES } from "../bash/ast.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-p7vpkf52.js:265-773 callgraph-fingerprint (2.1.88 match: DANGEROUS_SCRIPT_BLOCK_CMDLETS, 0.58)
/**
 * 危险 cmdlet 集合：按文件路径执行脚本（invoke-command/start-job…）、脚本块执行代码（含 invoke-expression、register-*event、new/enter-pssession）、加载模块（import-module/install-module…）、shell 与进程生成器（pwsh/cmd/bash/wsl/start-process/add-type/new-object）。
 */
var FILEPATH_EXECUTION_CMDLETS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DANGEROUS_SCRIPT_BLOCK_CMDLETS;
var MODULE_LOADING_CMDLETS;
var SHELLS_AND_SPAWNERS;
deferInit("chunk-p7vpkf52.js:265", () => {
  FILEPATH_EXECUTION_CMDLETS = new Set([
    "invoke-command",
    "start-job",
    "start-threadjob",
    "register-scheduledjob",
  ]);
  DANGEROUS_SCRIPT_BLOCK_CMDLETS = new Set([
    "invoke-command",
    "invoke-expression",
    "start-job",
    "start-threadjob",
    "register-scheduledjob",
    "register-engineevent",
    "register-objectevent",
    "register-wmievent",
    "new-pssession",
    "enter-pssession",
  ]);
  MODULE_LOADING_CMDLETS = new Set([
    "import-module",
    "ipmo",
    "install-module",
    "save-module",
    "update-module",
    "install-script",
    "save-script",
  ]);
  SHELLS_AND_SPAWNERS = [
    "pwsh",
    "powershell",
    "cmd",
    "bash",
    "wsl",
    "sh",
    "start-process",
    "start",
    "add-type",
    "new-object",
  ];
});
//@ chunk-p7vpkf52.js:773-867 file-local
/**
 * 返回 COMMON_ALIASES 中指向给定 cmdlet 集合的别名列表。
 */
function aliasesOf(targets) {
  return Object.entries(COMMON_ALIASES)
    .filter(([, target]) => targets.has(target.toLowerCase()))
    .map(([alias]) => alias);
}
//@ chunk-p7vpkf52.js:867-1509 fingerprint (2.1.88 match: ARG_GATED_CMDLETS, 0.671)
/**
 * 永不作为通配前缀建议的命令名集合：上述各类危险 cmdlet + foreach-object + 跨平台代码执行器（python/node/ruby/npx…单词项）及它们的别名。
 */
var NETWORK_CMDLETS; // deferred: uses FILEPATH_EXECUTION_CMDLETS of its import cycle while loading; runs once the cycle is complete
var ALIAS_HIJACK_CMDLETS;
var WMI_CIM_CMDLETS;
var ARG_GATED_CMDLETS;
var NEVER_SUGGEST;
deferInit("chunk-p7vpkf52.js:867", () => {
  NETWORK_CMDLETS = new Set(["invoke-webrequest", "invoke-restmethod"]);
  ALIAS_HIJACK_CMDLETS = new Set([
    "set-alias",
    "sal",
    "new-alias",
    "nal",
    "set-variable",
    "sv",
    "new-variable",
    "nv",
  ]);
  WMI_CIM_CMDLETS = new Set(["invoke-wmimethod", "iwmi", "invoke-cimmethod", "icim", "wmic", "wmic.exe"]);
  ARG_GATED_CMDLETS = new Set([
    "select-object",
    "sort-object",
    "group-object",
    "where-object",
    "measure-object",
    "write-output",
    "write-host",
    "start-sleep",
    "format-table",
    "format-list",
    "format-wide",
    "format-custom",
    "out-string",
    "out-host",
    "ipconfig",
    "hostname",
    "route",
    "arp",
  ]);
  NEVER_SUGGEST = (() => {
    let core = new Set([
      ...SHELLS_AND_SPAWNERS,
      ...FILEPATH_EXECUTION_CMDLETS,
      ...DANGEROUS_SCRIPT_BLOCK_CMDLETS,
      ...MODULE_LOADING_CMDLETS,
      ...NETWORK_CMDLETS,
      ...ALIAS_HIJACK_CMDLETS,
      ...WMI_CIM_CMDLETS,
      ...ARG_GATED_CMDLETS,
      "foreach-object",
      ...CROSS_PLATFORM_CODE_EXEC.filter((name) => !name.includes(" ")),
    ]);
    return new Set([...core, ...aliasesOf(core)]);
  })();
});
//@ chunk-6d2p9h2d.js:23018-23225 fingerprint (2.1.88 match: SHELLS_AND_SPAWNERS, 0.386)
/**
 * 在命令文本里查找 shell 可执行名或 git `alias.*=!` 的正则（切分归属待查）。
 */
var SHELL_SPAWNER_PATTERN; // deferred: uses POSIX_SHELL_NAMES (../bash/ast.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6d2p9h2d.js:23018", () => {
  SHELL_SPAWNER_PATTERN = new RegExp(
    `(?:^|[\\s\\\\/'":&()|;,{}=-])(?:${[...SHELL_PROGRAM_NAMES].filter((name) => !["cmd", "powershell", "pwsh"].includes(name)).join("|")})(?:\\.exe)?(?=[\\s'"|);}&,({]|$)|alias\\.[\\w-]+[ \\t]*(?:=[ \\t]*)?['"]?!`,
    "i",
  );
});
export {
  SHELL_SPAWNER_PATTERN,
  FILEPATH_EXECUTION_CMDLETS,
  DANGEROUS_SCRIPT_BLOCK_CMDLETS,
  MODULE_LOADING_CMDLETS,
  NEVER_SUGGEST,
};
