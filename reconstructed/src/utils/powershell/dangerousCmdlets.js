/**
 * utils/powershell/dangerousCmdlets.ts
 *
 * PowerShell 危险 cmdlet 分类集合（脚本块执行、模块加载、网络、别名劫持、WMI、参数门控）与永不建议前缀名单 NEVER_SUGGEST。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/powershell/dangerousCmdlets.ts
 * pieces: chunk-fws4w04f.js (3), chunk-tr0s0d0k.js (1)
 * attribution: callgraph-fingerprint 1, file-local 1, fingerprint 2
 */
import { COMMON_ALIASES } from "./parser.js";
import { CROSS_PLATFORM_CODE_EXEC } from "../permissions/dangerousPatterns.js";
import { SHELL_PROGRAM_NAMES } from "../bash/ast.js";

/**
 * 危险 cmdlet 集合：按文件路径执行脚本（invoke-command/start-job…）、脚本块执行代码（含 invoke-expression、register-*event、new/enter-pssession）、加载模块（import-module/install-module…）、shell 与进程生成器（pwsh/cmd/bash/wsl/start-process/add-type/new-object）。
 */
//@ chunk-fws4w04f.js:265-773 callgraph-fingerprint = DANGEROUS_SCRIPT_BLOCK_CMDLETS (0.58)
var FILEPATH_EXECUTION_CMDLETS = new Set([
    "invoke-command",
    "start-job",
    "start-threadjob",
    "register-scheduledjob",
  ]),
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
  ]),
  MODULE_LOADING_CMDLETS = new Set([
    "import-module",
    "ipmo",
    "install-module",
    "save-module",
    "update-module",
    "install-script",
    "save-script",
  ]),
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
/**
 * 返回 COMMON_ALIASES 中指向给定 cmdlet 集合的别名列表。
 */
//@ chunk-fws4w04f.js:773-867 file-local
function aliasesOf(targets) {
  return Object.entries(COMMON_ALIASES)
    .filter(([, e]) => targets.has(e.toLowerCase()))
    .map(([e]) => e);
}
/**
 * 永不作为通配前缀建议的命令名集合：上述各类危险 cmdlet + foreach-object + 跨平台代码执行器（python/node/ruby/npx…单词项）及它们的别名。
 */
//@ chunk-fws4w04f.js:867-1509 fingerprint = ARG_GATED_CMDLETS (0.671)
var NETWORK_CMDLETS = new Set(["invoke-webrequest", "invoke-restmethod"]),
  ALIAS_HIJACK_CMDLETS = new Set([
    "set-alias",
    "sal",
    "new-alias",
    "nal",
    "set-variable",
    "sv",
    "new-variable",
    "nv",
  ]),
  WMI_CIM_CMDLETS = new Set(["invoke-wmimethod", "iwmi", "invoke-cimmethod", "icim", "wmic", "wmic.exe"]),
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
  ]),
  NEVER_SUGGEST = (() => {
    let t = new Set([
      ...SHELLS_AND_SPAWNERS,
      ...FILEPATH_EXECUTION_CMDLETS,
      ...DANGEROUS_SCRIPT_BLOCK_CMDLETS,
      ...MODULE_LOADING_CMDLETS,
      ...NETWORK_CMDLETS,
      ...ALIAS_HIJACK_CMDLETS,
      ...WMI_CIM_CMDLETS,
      ...ARG_GATED_CMDLETS,
      "foreach-object",
      ...CROSS_PLATFORM_CODE_EXEC.filter((e) => !e.includes(" ")),
    ]);
    return new Set([...t, ...aliasesOf(t)]);
  })();
/**
 * 在命令文本里查找 shell 可执行名或 git `alias.*=!` 的正则（切分归属待查）。
 */
//@ chunk-tr0s0d0k.js:22771-22978 fingerprint = SHELLS_AND_SPAWNERS (0.386)
var SHELL_SPAWNER_PATTERN = new RegExp(
  `(?:^|[\\s\\\\/'":&()|;,{}=-])(?:${[...SHELL_PROGRAM_NAMES].filter((e) => !["cmd", "powershell", "pwsh"].includes(e)).join("|")})(?:\\.exe)?(?=[\\s'"|);}&,({]|$)|alias\\.[\\w-]+[ \\t]*(?:=[ \\t]*)?['"]?!`,
  "i",
);

export {
  NEVER_SUGGEST,
  SHELL_SPAWNER_PATTERN,
  FILEPATH_EXECUTION_CMDLETS,
  DANGEROUS_SCRIPT_BLOCK_CMDLETS,
  MODULE_LOADING_CMDLETS,
};
