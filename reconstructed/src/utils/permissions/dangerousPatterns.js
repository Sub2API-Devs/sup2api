/**
 * utils/permissions/dangerousPatterns.ts
 *
 * 危险命令与规则前缀词表（解释器、shell、网络/云 CLI 及其危险子命令）和危险命令模式判定（下载管道执行、凭证路径、强推、破坏性云命令）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/dangerousPatterns.ts
 * pieces: chunk-2a8yx6fc.js (13), chunk-sfy7bm1n.js (1)
 * attribution: sole-consumer 7, affinity 1, fingerprint 2, layout 1, placement 3
 */
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";

//@ chunk-2a8yx6fc.js:7934-7972 sole-consumer
function hasWildcard(e) {
  return e.includes("*");
}
//@ chunk-2a8yx6fc.js:7972-8019 sole-consumer
/**
 * 去掉规则串末尾的空白、冒号和星号。
 */
function stripTrailingWildcard(e) {
  return e.replace(/[\s:*]+$/, "");
}
//@ chunk-2a8yx6fc.js:8019-8077 sole-consumer
var SUDO_FLAGS_WITH_VALUE = new Set(["-u", "-g", "-c", "-d", "-h", "-p", "-r", "-t"]);
//@ chunk-2a8yx6fc.js:8077-8393 sole-consumer
/**
 * 分词并跳过开头的 sudo/doas（及其带值选项）或 env（及 VAR=、-u 选项），返回剩余词。
 */
function stripPrivilegePrefix(command) {
  let tokens = command.split(/\s+/).filter(Boolean);
  let index = 0;
  if (tokens[index] === "sudo" || tokens[index] === "doas") {
    index++;
    while (index < tokens.length && tokens[index].startsWith("-")) {
      if (SUDO_FLAGS_WITH_VALUE.has(tokens[index]) && index + 1 < tokens.length) index++;
      index++;
    }
  } else if (tokens[index] === "env") {
    index++;
    while (index < tokens.length && (tokens[index].includes("=") || tokens[index].startsWith("-"))) {
      if (tokens[index] === "-u" && index + 1 < tokens.length) index++;
      index++;
    }
  }
  return tokens.slice(index);
}
//@ chunk-2a8yx6fc.js:8393-8895 sole-consumer
/**
 * 危险规则判定用的词表：凭证文件路径（.ssh、.aws/credentials、.netrc、.npmrc、gh/glab 配置…）、可写权限 chmod、解释器、iex、下载命令。
 */
var SENSITIVE_CREDENTIAL_PATH_PATTERN =
  /\.ssh\b|id_rsa|id_ed25519|id_ecdsa|\.aws\/credentials|\.netrc\b|\.gnupg\/|\/etc\/shadow\b|\.kube\/config\b|\.docker\/config\.json\b|\.npmrc\b|\.pypirc\b|\.git-credentials\b|\.config\/gh\/hosts\.yml\b|\.config\/glab-cli\/config\.yml\b/i;
var WORLD_WRITABLE_CHMOD_PATTERN =
  /(^|\s)[0-7]{2,3}[2367](\s|$|:)|(^|\s)(?:a|ugo|o|go|uo)(?:\+|=)[rstx]*w[rstx]*(\s|$|:)/;
var SHELL_INTERPRETERS = new Set(["bash", "sh", "zsh", "dash", "ksh", "fish", "node", "perl", "ruby"]);
var INVOKE_EXPRESSION_COMMANDS = new Set(["iex", "invoke-expression"]);
var DOWNLOAD_COMMANDS = new Set(["curl", "wget", "iwr", "invoke-webrequest"]);
//@ chunk-2a8yx6fc.js:8895-8942 sole-consumer
function isPythonCommand(e) {
  return /^python[0-9.]*$/.test(e);
}
//@ chunk-2a8yx6fc.js:8942-9057 sole-consumer
function getFirstCommandWord(segment) {
  let filtered = segment.trim().split(/\s+/).filter(Boolean);
  let r = 0;
  if (filtered[r] === "sudo" || filtered[r] === "doas") r++;
  return filtered[r] ?? "";
}
//@ chunk-2a8yx6fc.js:9057-9604 affinity
/**
 * 识别“下载后交给解释器执行”：`sh <(curl …)`、`iex (iwr …)`、或管道前段是 curl/wget 且后段是 bash/sh/python 等（后段无参数）或规则带通配。
 */
function isDownloadPipedToShell(command) {
  let lower = command.toLowerCase();
  for (let s of lower.matchAll(/(\S+)\s+<\(\s*(?:curl|wget)\b/g)) {
    let l = s[1];
    if (SHELL_INTERPRETERS.has(l) || isPythonCommand(l)) return true;
  }
  if (/\b(?:iex|invoke-expression)\s*\(\s*(?:iwr|invoke-webrequest|curl|wget)\b/.test(lower)) return true;
  let segments = lower.split("|");
  let hasDownloadBeforePipe = segments
    .slice(0, -1)
    .some((segment) => DOWNLOAD_COMMANDS.has(getFirstCommandWord(segment)));
  for (let segment of segments.slice(1)) {
    let filtered = stripTrailingWildcard(segment.trim()).split(/\s+/).filter(Boolean);
    let a = 0;
    if (filtered[a] === "sudo" || filtered[a] === "doas") a++;
    let d = filtered[a];
    if (d === undefined) continue;
    if (
      (INVOKE_EXPRESSION_COMMANDS.has(d) ||
        ((SHELL_INTERPRETERS.has(d) || isPythonCommand(d)) &&
          filtered.slice(a + 1).every((c) => c.startsWith("-")))) &&
      (hasDownloadBeforePipe || hasWildcard(command))
    )
      return true;
  }
  return false;
}
//@ chunk-2a8yx6fc.js:9604-9993 fingerprint = DANGEROUS_BASH_PATTERNS (0.327)
/**
 * 云/集群 CLI 的破坏性子命令：kubectl/gcloud/az delete、aws s3 rm|rb 或 delete-*\/terminate-*、gsutil rm、terraform destroy、helm uninstall/delete。
 */
function isDestructiveCloudCommand(tokens) {
  let n = tokens[0];
  if (n === undefined) return false;
  switch (n) {
    case "kubectl":
    case "gcloud":
    case "az":
      return tokens.includes("delete");
    case "aws":
      return (
        (tokens[1] === "s3" && (tokens[2] === "rm" || tokens[2] === "rb")) ||
        tokens.some((token) => /^(delete|terminate)-/.test(token))
      );
    case "gsutil":
      return tokens.includes("rm");
    case "terraform":
      return tokens.includes("destroy");
    case "helm":
      return tokens.includes("uninstall") || tokens.includes("delete");
    default:
      return false;
  }
}
//@ chunk-2a8yx6fc.js:9993-10529 layout
/**
 * 判断一条 Bash 规则/命令模式是否危险：下载管道执行、触及凭证路径、带通配的 rm/chmod/chown/强推 git push/dd/mkfs/关机等，以及带通配的云端破坏命令。
 */
function isDangerousCommandPattern(pattern) {
  if (isDownloadPipedToShell(pattern)) return true;
  if (SENSITIVE_CREDENTIAL_PATH_PATTERN.test(pattern)) return true;
  let lower = pattern.trim().toLowerCase();
  let hasStar = hasWildcard(lower);
  let tokens = stripPrivilegePrefix(stripTrailingWildcard(lower));
  let head = tokens[0] ?? "";
  if (head === "rm" && hasStar) return true;
  if (head === "chmod" && (hasStar || WORLD_WRITABLE_CHMOD_PATTERN.test(lower))) return true;
  if ((head === "chown" || head === "chgrp") && hasStar) return true;
  if (head === "git" && tokens[1] === "push" && hasStar) {
    if (
      /(^|\s)--force(?!-with-lease)\b/.test(lower) ||
      /(^|\s)-[a-z]*f[a-z]*(\s|$|:)/.test(lower) ||
      /(^|\s)\+\S/.test(lower)
    )
      return true;
  }
  if (
    hasStar &&
    (["dd", "fdisk", "parted", "shutdown", "reboot", "halt", "poweroff", "wipefs", "blkdiscard"].includes(
      head,
    ) ||
      /^mkfs(\.|$)/.test(head))
  )
    return true;
  if (hasStar && isDestructiveCloudCommand(tokens)) return true;
  return false;
}
//@ chunk-2a8yx6fc.js:10529-10598 placement
var POWERSHELL_DESTRUCTIVE_VERBS = new Set(["remove-item", "ri", "rm", "del", "erase", "rd", "rmdir"]);
//@ chunk-2a8yx6fc.js:10598-10921 placement
/**
 * PowerShell 规则内容是否危险：下载管道执行、凭证路径、解释器加通配、格式化/清盘/关机重启类命令。
 */
function isDangerousPowerShellPattern(command) {
  if (isDownloadPipedToShell(command)) return true;
  if (SENSITIVE_CREDENTIAL_PATH_PATTERN.test(command)) return true;
  let lower = command.trim().toLowerCase();
  let o = stripTrailingWildcard(lower).split(/\s+/).filter(Boolean)[0] ?? "";
  if (POWERSHELL_DESTRUCTIVE_VERBS.has(o) && hasWildcard(lower)) return true;
  if (o === "format-volume" || o === "format.com") return true;
  if (
    (o === "clear-disk" || o === "initialize-disk" || o === "stop-computer" || o === "restart-computer") &&
    hasWildcard(lower)
  )
    return true;
  return false;
}
//@ chunk-2a8yx6fc.js:10921-11052 placement
function isDangerousRuleContent(toolName, pattern) {
  if (pattern === undefined || pattern === "") return false;
  if (toolName === BASH_TOOL_NAME) return isDangerousCommandPattern(pattern);
  if (toolName === POWERSHELL_TOOL_NAME) return isDangerousPowerShellPattern(pattern);
  if (toolName === FILE_READ_TOOL_NAME) return SENSITIVE_CREDENTIAL_PATH_PATTERN.test(pattern);
  return false;
}
//@ chunk-sfy7bm1n.js:7290-7807 fingerprint = CROSS_PLATFORM_CODE_EXEC (0.569)
/**
 * 进入 auto 模式时会被剥离的“等价于任意代码执行”的 allow 规则前缀：解释器/包运行器（python、node、deno、npx、bun run…）、shell、ssh、eval/exec/env/xargs/sudo；网络/云 CLI（curl、wget、kubectl、aws、gcloud、gsutil）只在子命令落入 DANGEROUS_SUBCOMMANDS 或参数含 $/` 时算危险。
 */
var ANT_ONLY_CODE_EXEC = [];
var CROSS_PLATFORM_CODE_EXEC = [
  ...ANT_ONLY_CODE_EXEC,
  "python",
  "python3",
  "python2",
  "node",
  "deno",
  "tsx",
  "ruby",
  "perl",
  "php",
  "lua",
  "npx",
  "bunx",
  "npm run",
  "yarn run",
  "pnpm run",
  "bun run",
  "bash",
  "sh",
  "ssh",
];
var DANGEROUS_BASH_PATTERNS = [
  ...CROSS_PLATFORM_CODE_EXEC,
  "zsh",
  "fish",
  "eval",
  "exec",
  "env",
  "xargs",
  "sudo",
];
var NETWORK_COMMAND_PREFIXES = ["curl", "wget", "kubectl", "aws", "gcloud", "gsutil"];
var CLUSTER_COMMAND_PREFIXES = [];
var SUBCOMMAND_CHECKED_COMMANDS = new Set([...NETWORK_COMMAND_PREFIXES, ...CLUSTER_COMMAND_PREFIXES]);
var DANGEROUS_SUBCOMMANDS = {
  kubectl: new Set([
    "exec",
    "apply",
    "create",
    "delete",
    "run",
    "cp",
    "port-forward",
    "proxy",
    "patch",
    "edit",
    "replace",
    "attach",
    "debug",
    "scale",
    "rollout",
    "drain",
    "cordon",
    "taint",
  ]),
  ...false,
};
var DANGEROUS_BASH_RULE_PREFIXES = [...DANGEROUS_BASH_PATTERNS, ...[]];
export {
  isDangerousRuleContent,
  DANGEROUS_BASH_PATTERNS,
  NETWORK_COMMAND_PREFIXES,
  CLUSTER_COMMAND_PREFIXES,
  DANGEROUS_BASH_RULE_PREFIXES,
  SUBCOMMAND_CHECKED_COMMANDS,
  DANGEROUS_SUBCOMMANDS,
  CROSS_PLATFORM_CODE_EXEC,
};
