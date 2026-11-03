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
/**
 * 去掉规则串末尾的空白、冒号和星号。
 */
//@ chunk-2a8yx6fc.js:7972-8019 sole-consumer
function stripTrailingWildcard(e) {
  return e.replace(/[\s:*]+$/, "");
}
//@ chunk-2a8yx6fc.js:8019-8077 sole-consumer
var SUDO_FLAGS_WITH_VALUE = new Set(["-u", "-g", "-c", "-d", "-h", "-p", "-r", "-t"]);
/**
 * 分词并跳过开头的 sudo/doas（及其带值选项）或 env（及 VAR=、-u 选项），返回剩余词。
 */
//@ chunk-2a8yx6fc.js:8077-8393 sole-consumer
function stripPrivilegePrefix(command) {
  let tokens = command.split(/\s+/).filter(Boolean),
    index = 0;
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
/**
 * 危险规则判定用的词表：凭证文件路径（.ssh、.aws/credentials、.netrc、.npmrc、gh/glab 配置…）、可写权限 chmod、解释器、iex、下载命令。
 */
//@ chunk-2a8yx6fc.js:8393-8895 sole-consumer
var SENSITIVE_CREDENTIAL_PATH_PATTERN =
    /\.ssh\b|id_rsa|id_ed25519|id_ecdsa|\.aws\/credentials|\.netrc\b|\.gnupg\/|\/etc\/shadow\b|\.kube\/config\b|\.docker\/config\.json\b|\.npmrc\b|\.pypirc\b|\.git-credentials\b|\.config\/gh\/hosts\.yml\b|\.config\/glab-cli\/config\.yml\b/i,
  WORLD_WRITABLE_CHMOD_PATTERN =
    /(^|\s)[0-7]{2,3}[2367](\s|$|:)|(^|\s)(?:a|ugo|o|go|uo)(?:\+|=)[rstx]*w[rstx]*(\s|$|:)/,
  SHELL_INTERPRETERS = new Set(["bash", "sh", "zsh", "dash", "ksh", "fish", "node", "perl", "ruby"]),
  INVOKE_EXPRESSION_COMMANDS = new Set(["iex", "invoke-expression"]),
  DOWNLOAD_COMMANDS = new Set(["curl", "wget", "iwr", "invoke-webrequest"]);
//@ chunk-2a8yx6fc.js:8895-8942 sole-consumer
function isPythonCommand(e) {
  return /^python[0-9.]*$/.test(e);
}
//@ chunk-2a8yx6fc.js:8942-9057 sole-consumer
function getFirstCommandWord(e) {
  let filtered = e.trim().split(/\s+/).filter(Boolean),
    r = 0;
  if (filtered[r] === "sudo" || filtered[r] === "doas") r++;
  return filtered[r] ?? "";
}
/**
 * 识别“下载后交给解释器执行”：`sh <(curl …)`、`iex (iwr …)`、或管道前段是 curl/wget 且后段是 bash/sh/python 等（后段无参数）或规则带通配。
 */
//@ chunk-2a8yx6fc.js:9057-9604 affinity
function isDownloadPipedToShell(command) {
  let lower = command.toLowerCase();
  for (let s of lower.matchAll(/(\S+)\s+<\(\s*(?:curl|wget)\b/g)) {
    let l = s[1];
    if (SHELL_INTERPRETERS.has(l) || isPythonCommand(l)) return !0;
  }
  if (/\b(?:iex|invoke-expression)\s*\(\s*(?:iwr|invoke-webrequest|curl|wget)\b/.test(lower)) return !0;
  let segments = lower.split("|"),
    hasDownloadBeforePipe = segments.slice(0, -1).some((s) => DOWNLOAD_COMMANDS.has(getFirstCommandWord(s)));
  for (let s of segments.slice(1)) {
    let filtered = stripTrailingWildcard(s.trim()).split(/\s+/).filter(Boolean),
      a = 0;
    if (filtered[a] === "sudo" || filtered[a] === "doas") a++;
    let d = filtered[a];
    if (d === void 0) continue;
    if (
      (INVOKE_EXPRESSION_COMMANDS.has(d) ||
        ((SHELL_INTERPRETERS.has(d) || isPythonCommand(d)) &&
          filtered.slice(a + 1).every((c) => c.startsWith("-")))) &&
      (hasDownloadBeforePipe || hasWildcard(command))
    )
      return !0;
  }
  return !1;
}
/**
 * 云/集群 CLI 的破坏性子命令：kubectl/gcloud/az delete、aws s3 rm|rb 或 delete-*\/terminate-*、gsutil rm、terraform destroy、helm uninstall/delete。
 */
//@ chunk-2a8yx6fc.js:9604-9993 fingerprint = DANGEROUS_BASH_PATTERNS (0.327)
function isDestructiveCloudCommand(tokens) {
  let n = tokens[0];
  if (n === void 0) return !1;
  switch (n) {
    case "kubectl":
    case "gcloud":
    case "az":
      return tokens.includes("delete");
    case "aws":
      return (
        (tokens[1] === "s3" && (tokens[2] === "rm" || tokens[2] === "rb")) ||
        tokens.some((r) => /^(delete|terminate)-/.test(r))
      );
    case "gsutil":
      return tokens.includes("rm");
    case "terraform":
      return tokens.includes("destroy");
    case "helm":
      return tokens.includes("uninstall") || tokens.includes("delete");
    default:
      return !1;
  }
}
/**
 * 判断一条 Bash 规则/命令模式是否危险：下载管道执行、触及凭证路径、带通配的 rm/chmod/chown/强推 git push/dd/mkfs/关机等，以及带通配的云端破坏命令。
 */
//@ chunk-2a8yx6fc.js:9993-10529 layout
function isDangerousCommandPattern(pattern) {
  if (isDownloadPipedToShell(pattern)) return !0;
  if (SENSITIVE_CREDENTIAL_PATH_PATTERN.test(pattern)) return !0;
  let lower = pattern.trim().toLowerCase(),
    hasStar = hasWildcard(lower),
    tokens = stripPrivilegePrefix(stripTrailingWildcard(lower)),
    head = tokens[0] ?? "";
  if (head === "rm" && hasStar) return !0;
  if (head === "chmod" && (hasStar || WORLD_WRITABLE_CHMOD_PATTERN.test(lower))) return !0;
  if ((head === "chown" || head === "chgrp") && hasStar) return !0;
  if (head === "git" && tokens[1] === "push" && hasStar) {
    if (
      /(^|\s)--force(?!-with-lease)\b/.test(lower) ||
      /(^|\s)-[a-z]*f[a-z]*(\s|$|:)/.test(lower) ||
      /(^|\s)\+\S/.test(lower)
    )
      return !0;
  }
  if (
    hasStar &&
    (["dd", "fdisk", "parted", "shutdown", "reboot", "halt", "poweroff", "wipefs", "blkdiscard"].includes(
      head,
    ) ||
      /^mkfs(\.|$)/.test(head))
  )
    return !0;
  if (hasStar && isDestructiveCloudCommand(tokens)) return !0;
  return !1;
}
//@ chunk-2a8yx6fc.js:10529-10598 placement
var lr = new Set(["remove-item", "ri", "rm", "del", "erase", "rd", "rmdir"]);
/**
 * PowerShell 规则内容是否危险：下载管道执行、凭证路径、解释器加通配、格式化/清盘/关机重启类命令。
 */
//@ chunk-2a8yx6fc.js:10598-10921 placement
function isDangerousPowerShellPattern(e) {
  if (isDownloadPipedToShell(e)) return !0;
  if (SENSITIVE_CREDENTIAL_PATH_PATTERN.test(e)) return !0;
  let lower = e.trim().toLowerCase(),
    o = stripTrailingWildcard(lower).split(/\s+/).filter(Boolean)[0] ?? "";
  if (lr.has(o) && hasWildcard(lower)) return !0;
  if (o === "format-volume" || o === "format.com") return !0;
  if (
    (o === "clear-disk" || o === "initialize-disk" || o === "stop-computer" || o === "restart-computer") &&
    hasWildcard(lower)
  )
    return !0;
  return !1;
}
//@ chunk-2a8yx6fc.js:10921-11052 placement
function isDangerousRuleContent(e, n) {
  if (n === void 0 || n === "") return !1;
  if (e === BASH_TOOL_NAME) return isDangerousCommandPattern(n);
  if (e === POWERSHELL_TOOL_NAME) return isDangerousPowerShellPattern(n);
  if (e === FILE_READ_TOOL_NAME) return SENSITIVE_CREDENTIAL_PATH_PATTERN.test(n);
  return !1;
}
/**
 * 进入 auto 模式时会被剥离的“等价于任意代码执行”的 allow 规则前缀：解释器/包运行器（python、node、deno、npx、bun run…）、shell、ssh、eval/exec/env/xargs/sudo；网络/云 CLI（curl、wget、kubectl、aws、gcloud、gsutil）只在子命令落入 DANGEROUS_SUBCOMMANDS 或参数含 $/` 时算危险。
 */
//@ chunk-sfy7bm1n.js:7290-7807 fingerprint = CROSS_PLATFORM_CODE_EXEC (0.569)
var ANT_ONLY_CODE_EXEC = [],
  CROSS_PLATFORM_CODE_EXEC = [
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
  ],
  DANGEROUS_BASH_PATTERNS = [
    ...CROSS_PLATFORM_CODE_EXEC,
    "zsh",
    "fish",
    "eval",
    "exec",
    "env",
    "xargs",
    "sudo",
  ],
  NETWORK_COMMAND_PREFIXES = ["curl", "wget", "kubectl", "aws", "gcloud", "gsutil"],
  CLUSTER_COMMAND_PREFIXES = [],
  SUBCOMMAND_CHECKED_COMMANDS = new Set([...NETWORK_COMMAND_PREFIXES, ...CLUSTER_COMMAND_PREFIXES]),
  DANGEROUS_SUBCOMMANDS = {
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
    ...!1,
  },
  DANGEROUS_BASH_RULE_PREFIXES = [...DANGEROUS_BASH_PATTERNS, ...[]];

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
