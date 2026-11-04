/**
 * utils/bash/ShellSnapshot.ts
 *
 * shell 快照：执行用户 rc 导出函数/选项/别名/PATH，注入内置 rg/bfs/ugrep 包装和 pkill 防护，生成供每次 Bash 命令 source 的快照文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/ShellSnapshot.ts
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 2, layout 9, fingerprint 7, callgraph-witnessed 1
 */
import { join } from "path";
import * as osModule from "os";
import { mkdir, stat } from "fs/promises";
import { execFile } from "child_process";
import { logForDebugging } from "../debug.js";
import { spellingIn, subprocessEnv, settingsPathForChildren } from "../subprocessEnv.js";
import { getPlatform } from "../platform.js";
import { getUserBinDir } from "../xdg.js";
import { windowsPathToPosixPath } from "../path.js";
import { shellQuoteArgs } from "./bashPipeCommand.js";
import { ripgrepCommand } from "../ripgrep.js";
import { hasEmbeddedSearchTools } from "../embeddedTools.js";
import { safeExecFile } from "../safeSpawn.js";
import { logEvent } from "../../services/analytics/index.js";
import { isAssignmentNameUnsafeForSandbox } from "./ast.js";
import { env } from "../env.js";
import { isDisklessSession as isDisklessSession_2 } from "../disklessSession.js";
import { pathExists } from "../fsSafety/atomicWriteStaging.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { safeSessionIdForSnapshot } from "../Shell.js";
import { getSessionId } from "../../bootstrap/state.js";
import { isDesktopNonClaudecode } from "../entrypointKinds.js";
import { cgroupSpawnOptions } from "../toolCgroup.js";
import { getCwd } from "../cwd.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { getFsImplementation } from "../fsOperations.js";
import { reportShellExports } from "../shell/shellEnvSnapshot.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3051940-3052177 placement
function appendPluginBinPaths(currentPath, extraDirs, delimiter) {
  let existing = new Set((currentPath ?? "").split(delimiter));
  let filtered = extraDirs.filter((dir) => {
    if (dir.includes(delimiter)) {
      logForDebugging(`Dropping plugin bin path that holds the PATH delimiter: ${dir}`);
      return false;
    }
    return !existing.has(dir);
  });
  return {
    appended: filtered,
    path: [currentPath, ...filtered].filter(Boolean).join(delimiter),
  };
}
//@ chunk-e6aww6q8.js:3052177-3052304 placement
/**
 * 计算追加插件 bin 目录后的 PATH 环境变量（保持原变量名大小写）。
 */
function getPluginPathEnv(env, extraDirs, delimiter) {
  if (extraDirs.length === 0) return {};
  let pathKey = spellingIn(env, "PATH");
  let { appended, path } = appendPluginBinPaths(env[pathKey], extraDirs, delimiter);
  return appended.length > 0
    ? {
        [pathKey]: path,
      }
    : {};
}
//@ chunk-e6aww6q8.js:3052304-3052376 layout
/**
 * Shell 快照超时 10 秒，以及传给子 shell 的环境变量名 CLAUDE_CODE_EXECPATH、CLAUDE_CODE_INVOKED_SKILLS。
 */
var SNAPSHOT_TIMEOUT_MS = 1e4;
var CLAUDE_CODE_EXECPATH = "CLAUDE_CODE_EXECPATH";
var CLAUDE_CODE_INVOKED_SKILLS = "CLAUDE_CODE_INVOKED_SKILLS";
//@ chunk-e6aww6q8.js:3052376-3053131 fingerprint = createArgv0ShellFunction (0.373)
/**
 * 生成同名 shell 函数，以 ARGV0（zsh/Windows）或 exec -a（bash）把内置二进制伪装成 rg/bfs/ugrep 执行；CLAUDE_CODE_EXECPATH 不可执行时回落到系统命令；可指定遇到某些参数时直接走系统命令。
 */
function createArgv0ShellFunction(funcName, argv0, binaryPath = [], prependArgs = []) {
  let argTail = binaryPath.length > 0 ? `${binaryPath.join(" ")} \${1+"$@"}` : '${1+"$@"}';
  let isWindows = getPlatform() === "windows";
  let claudePath = join(getUserBinDir(), isWindows ? "claude.exe" : "claude");
  let quotedClaudePath = isWindows ? windowsPathToPosixPath(claudePath) : claudePath;
  let prependLines =
    prependArgs.length > 0
      ? [
          "  local _cc_a",
          '  for _cc_a in ${1+"$@"}; do',
          `    case "$_cc_a" in ${prependArgs.join("|")}) command ${funcName} \${1+"$@"}; return ;; esac`,
          "  done",
        ]
      : [];
  return [
    `function ${funcName} {`,
    ...prependLines,
    `  local _cc_bin="\${${CLAUDE_CODE_EXECPATH}:-}"`,
    `  [[ -x $_cc_bin ]] || _cc_bin=${shellQuoteArgs([quotedClaudePath])}`,
    `  if [[ ! -x $_cc_bin ]]; then command ${funcName} \${1+"$@"}; return; fi`,
    "  if [[ -n ${ZSH_VERSION:-} ]]; then",
    `    ARGV0=${argv0} "$_cc_bin" ${argTail}`,
    '  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then',
    `    ARGV0=${argv0} "$_cc_bin" ${argTail}`,
    "  else",
    `    (exec -a ${argv0} "$_cc_bin" ${argTail})`,
    "  fi",
    "}",
  ].join(`
`);
}
//@ chunk-e6aww6q8.js:3053131-3053339 fingerprint = createRipgrepShellIntegration (1)
function createRipgrepShellIntegration() {
  let rgCommand = ripgrepCommand();
  if (rgCommand.argv0)
    return {
      type: "function",
      snippet: createArgv0ShellFunction("rg", rgCommand.argv0),
    };
  let quotedPath = shellQuoteArgs([rgCommand.rgPath]);
  let quotedArgs = rgCommand.rgArgs.map((arg) => shellQuoteArgs([arg]));
  return {
    type: "alias",
    snippet: rgCommand.rgArgs.length > 0 ? `${quotedPath} ${quotedArgs.join(" ")}` : quotedPath,
  };
}
//@ chunk-e6aww6q8.js:3053339-3053451 layout = VCS_DIRECTORIES_TO_EXCLUDE (0.903)
/**
 * shell 片段（rg 不存在时的判断）与内嵌 ugrep 的 VCS 排除目录列表。
 */
var RG_NOT_AVAILABLE_TEST = "! hash rg 2>/dev/null && ! typeset -f rg >/dev/null 2>&1";
var VCS_DIRECTORIES_FOR_UGREP = [".git", ".svn", ".hg", ".bzr", ".jj", ".sl"];
//@ chunk-e6aww6q8.js:3053451-3053883 fingerprint = createFindGrepShellIntegration (0.613)
/**
 * 内置 find/grep 替换开启时，生成 find→bfs、grep→ugrep 的包装函数（ugrep 默认 -G --ignore-files --hidden -I 并排除 VCS 目录，危险选项回落系统 grep）。
 */
function createFindGrepShellIntegration() {
  if (!hasEmbeddedSearchTools()) return null;
  return [
    "unalias find 2>/dev/null || true",
    "unalias grep 2>/dev/null || true",
    createArgv0ShellFunction("find", "bfs", ["-S", "dfs", "-regextype", "findutils-default"]),
    createArgv0ShellFunction(
      "grep",
      "ugrep",
      [
        "-G",
        "--ignore-files",
        "--hidden",
        "-I",
        ...VCS_DIRECTORIES_FOR_UGREP.map((dirName) => `--exclude-dir=${dirName}`),
      ],
      [
        "-*-filter*",
        "-*-pager*",
        "-*-view*",
        "-*-format-open*",
        "-*-config*",
        "---*",
        "-@*",
        "-*-save-config*",
        "-[Zz]*",
        "-[!-]*[Zz]*",
        "--null",
        "--null-data",
      ],
    ),
  ].join(`
`);
}
//@ chunk-e6aww6q8.js:3053883-3054873 layout
/**
 * 生成 pkill 包装函数：用 pgrep 预演同样的模式，若会匹配 CLAUDE_PID 则拒绝并提示用 pkill -P $$。
 */
function createPkillGuardFunction() {
  return [
    "unalias pkill 2>/dev/null || true",
    "function pkill {",
    '  if [ -n "${CLAUDE_PID:-}" ] && [ -r "/proc/${CLAUDE_PID}/comm" ]; then',
    '    local _cc_skip="" _cc_a',
    "    local -a _cc_probe=()",
    '    for _cc_a in ${1+"$@"}; do',
    '      if [ -n "$_cc_skip" ]; then _cc_skip=""; continue; fi',
    '      case "$_cc_a" in',
    "        --signal) _cc_skip=1 ;;",
    "        --signal=*|-e|--echo) ;;",
    "        -[0-9]*) ;;",
    '        -[PUGOF]?*) _cc_probe+=("$_cc_a") ;;',
    "        -[ABCDEFGHIJKLMNOPQRSTUVWXYZ][ABCDEFGHIJKLMNOPQRSTUVWXYZ0-9]*) ;;",
    '        *) _cc_probe+=("$_cc_a") ;;',
    "      esac",
    "    done",
    '    if command pgrep ${_cc_probe[@]+"${_cc_probe[@]}"} 2>/dev/null | command grep -qx "${CLAUDE_PID}"; then',
    "      printf 'pkill: refusing to run \u2014 this pattern matches the Claude CLI process (PID %s). Narrow the pattern, or target your own children with `pkill -P $$ ...`.\\n' \"${CLAUDE_PID}\" >&2",
    "      return 1",
    "    fi",
    "  fi",
    '  command pkill ${1+"$@"}',
    "}",
  ].join(`
`);
}
//@ chunk-e6aww6q8.js:3054873-3054898 layout
function emptySnapshotPath(arg) {
  return "";
}
//@ chunk-e6aww6q8.js:3054898-3054925 layout
function getExtraSnapshotSnippet() {
  return null;
}
//@ chunk-e6aww6q8.js:3054925-3054952 layout
function getSnapshotOverride() {
  return null;
}
//@ chunk-e6aww6q8.js:3054952-3055069 fingerprint = getConfigFile (1)
/**
 * 按 shell 路径选择配置文件：含 zsh→~/.zshrc，含 bash→~/.bashrc，否则 ~/.profile。
 */
function getConfigFile(shellPath) {
  let fileName = shellPath.includes("zsh") ? ".zshrc" : shellPath.includes("bash") ? ".bashrc" : ".profile";
  return join(osModule.homedir(), fileName);
}
//@ chunk-e6aww6q8.js:3055069-3058104 fingerprint = getUserSnapshotContent (0.476)
/**
 * 导出用户 shell 状态的脚本片段：zsh 用 typeset -f / setopt，bash 用 shopt -p、逐函数 eval %q、set -o；别名最多 1000 条（Windows 去掉 winpty 别名）。
 */
function getUserSnapshotContent(configFile) {
  let isZsh = configFile.endsWith(".zshrc");
  let content = "";
  if (isZsh)
    content += `
      echo "# Functions" >> "$SNAPSHOT_FILE"

      # Force autoload all functions first
      typeset -f > /dev/null 2>&1

      # Now get user function names - filter completion functions (single underscore prefix)
      # but keep double-underscore helpers (e.g. __zsh_like_cd from mise, __pyenv_init)
      typeset +f | grep -vE '^_[^_]' | while read func; do
        typeset -f "$func" >> "$SNAPSHOT_FILE"
      done
    `;
  else
    content += `
      # shopt before functions: a body using extglob/globstar syntax only
      # re-parses with the option on.
      echo "# Shopt" >> "$SNAPSHOT_FILE"
      shopt -p >> "$SNAPSHOT_FILE"

      echo "# Functions" >> "$SNAPSHOT_FILE"

      # Force autoload all functions first
      declare -f > /dev/null 2>&1

      # Now get user function names - filter completion functions (single underscore prefix)
      # but keep double-underscore helpers (e.g. __zsh_like_cd from mise, __pyenv_init)
      # One eval per function so a body that no longer parses (rc=2, not fatal
      # in non-POSIX bash) drops only itself. The %q literal needs no fork
      # at source time, unlike a base64 command substitution.
      declare -F | while read func; do
        func=\${func##* } # the name: the last word of each declare -F line
        # declare reads a name starting with - or + as an option, and eval one starting with -; other names need no "--"
        if [[ "$func" == [-+]* ]]; then
          printf 'eval -- %q > /dev/null 2>&1\\n' "$(declare -f -- "$func")" >> "$SNAPSHOT_FILE"
        else
          [[ "$func" == _[!_]* ]] ||
            printf 'eval %q > /dev/null 2>&1\\n' "$(declare -f "$func")" >> "$SNAPSHOT_FILE"
        fi
      done
    `;
  if (isZsh)
    content += `
      echo "# Shell Options" >> "$SNAPSHOT_FILE"
      setopt | sed 's/^/setopt /' | head -n 1000 >> "$SNAPSHOT_FILE"
    `;
  else
    content += `
      echo "# Shell Options" >> "$SNAPSHOT_FILE"
      set -o | awk '$2 == "on" || $1 == "monitor" {print "set -o " $1}' >> "$SNAPSHOT_FILE"
      echo "shopt -s expand_aliases" >> "$SNAPSHOT_FILE"
    `;
  content += `
      echo "# Aliases" >> "$SNAPSHOT_FILE"
      # Filter out winpty aliases on Windows to avoid "stdin is not a tty" errors
      # Git Bash automatically creates aliases like "alias node='winpty node.exe'" for
      # programs that need Win32 Console in mintty, but winpty fails when there's no TTY
      if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # sed, not grep -v, whose exit 1 when no alias is left ends this script under errexit and pipefail.
        # Every line gets "alias -- " here: the filter works by line, so it can leave part of a multi-line alias behind.
        alias | sed -e "/='winpty /d" | sed -e '1001,$d' -e 's/^alias //g' -e 's/^/alias -- /' >> "$SNAPSHOT_FILE"
      else
        ${isZsh ? "alias | sed -e '1001,$d' -e 's/^alias //g' -e 's/^/alias -- /'" : "\\alias -p | sed -e '1001,$d' -e 's/^alias -- /alias /' -e 's/^alias /alias -- /'"} >> "$SNAPSHOT_FILE"
      fi
  `;
  return content;
}
//@ chunk-e6aww6q8.js:3058104-3058748 layout
/**
 * Windows 下运行 shell -lc 'echo "$PATH"' 取登录 PATH；输出不可用时记日志并上报 tengu_shell_snapshot_path_probe_failed，返回 undefined。
 */
async function probeLoginShellPath(shellPath) {
  let result = await safeExecFile(shellPath, ["-lc", 'echo "$PATH"'], {
    reject: false,
    timeout: SNAPSHOT_TIMEOUT_MS,
  });
  let trimmed = (result.stdout ?? "").trim();
  let lastLine =
    trimmed
      .split(
        `
`,
      )
      .at(-1)
      ?.trim() ?? "";
  if (result.exitCode === 0 && lastLine.startsWith("/") && !lastLine.includes(";")) return lastLine;
  let stderr = result.stderr ?? "";
  logForDebugging(
    `Shell snapshot: ${shellPath} -lc 'echo "$PATH"' gave no usable PATH (exit code ${result.exitCode ?? "none"}, timed out: ${result.timedOut === true}, output empty: ${trimmed === ""}). The snapshot will take PATH from the shell that creates it.`,
    {
      level: "warn",
    },
  );
  logForDebugging(`Shell snapshot: PATH probe stderr (${stderr.length} chars): ${stderr}`);
  logEvent("tengu_shell_snapshot_path_probe_failed", {
    timed_out: result.timedOut === true,
    exit_code: result.exitCode,
    empty_output: trimmed === "",
  });
  return;
}
//@ chunk-e6aww6q8.js:3058748-3059280 layout
var SHELL_EXPORTS_MARKER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var IGNORED_EXPORT_VARS;
var DUMP_ENV_SCRIPT;
deferInit("chunk-e6aww6q8.js:3058748", () => {
  SHELL_EXPORTS_MARKER = "--- claude-code-shell-exports ---";
  IGNORED_EXPORT_VARS = new Set("PWD OLDPWD SHLVL _ GIT_EDITOR CLAUDECODE AWKPATH AWKLIBPATH".split(" "));
  DUMP_ENV_SCRIPT = `
      printf '\\n%s\\n' '${SHELL_EXPORTS_MARKER}'
      command awk 'BEGIN {
        for (name in ENVIRON) {
          value = ENVIRON[name]; size += length(name) + length(value)
          gsub(/%/, "%25", value); gsub(/\\n/, "%0A", value); gsub(/\\r/, "%0D", value)
          report = report name "=" value "\\n"
        }
        if (size <= 262144) printf "%s", report
      }'
      printf '%s\\n' '${SHELL_EXPORTS_MARKER}'
`;
});
//@ chunk-e6aww6q8.js:3059280-3059672 layout
/**
 * 解析快照 stdout 中两个标记之间的 NAME=value 行，得到环境变量 Map（跳过已在进程环境中的、PWD/SHLVL 等、受保护变量、含 U+FFFD 的；还原 %25/%0A/%0D）。
 */
function parseShellExports(stdout) {
  let exportedVars = new Map();
  let currentEnv = subprocessEnv();
  let lines = stdout.split(`
`);
  let [startMarkerIndex, endMarkerIndex, ...extraMarkers] = lines.flatMap((line, lineIndex) =>
    line === SHELL_EXPORTS_MARKER ? [lineIndex] : [],
  );
  for (let line of endMarkerIndex === undefined || extraMarkers.length > 0
    ? []
    : lines.slice(startMarkerIndex + 1, endMarkerIndex)) {
    let sliced = line.slice(0, Math.max(line.indexOf("="), 0));
    if (
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(sliced) &&
      currentEnv[sliced] === undefined &&
      !IGNORED_EXPORT_VARS.has(sliced) &&
      !isAssignmentNameUnsafeForSandbox(sliced) &&
      !line.includes("\uFFFD")
    )
      exportedVars.set(
        sliced,
        line.slice(sliced.length + 1).replace(/%(25|0A|0D)/g, (matchText, code) =>
          code === "25"
            ? "%"
            : code === "0A"
              ? `
`
              : "\r",
        ),
      );
  }
  return exportedVars;
}
//@ chunk-e6aww6q8.js:3059672-3061032 callgraph-witnessed = getClaudeCodeSnapshotContent (0.156)
/**
 * Claude Code 自带的快照内容：rg 别名或函数（内置 ripgrep）、可选 find/grep 用内置 bfs/ugrep 替换、pkill 防误杀函数、PATH（Windows 下从登录 shell 探测，失败则在运行时追加插件目录）。
 */
async function getClaudeCodeSnapshotContent(shellPath, extraPathDirs) {
  let basePath = settingsPathForChildren() ?? env.PATH;
  let pathProbeFailed = false;
  if (getPlatform() === "windows") {
    let probedPath = await probeLoginShellPath(shellPath);
    if (probedPath === undefined) pathProbeFailed = true;
    else basePath = probedPath;
  }
  let { appended, path } = appendPluginBinPaths(
    pathProbeFailed ? undefined : basePath,
    getPlatform() === "windows" ? extraPathDirs.map(windowsPathToPosixPath) : extraPathDirs,
    ":",
  );
  let rgIntegration = createRipgrepShellIntegration();
  let content = "";
  let heredocMarker = `CLAUDE_CODE_END_${Math.random().toString(36).substring(2, 18)}`;
  let functionLines = [];
  switch (rgIntegration.type) {
    case "alias": {
      let replaced = rgIntegration.snippet.replaceAll("'", "'\\''");
      content += `
      # Check for rg availability
      echo "# Check for rg availability" >> "$SNAPSHOT_FILE"
      echo "if ${RG_NOT_AVAILABLE_TEST}; then" >> "$SNAPSHOT_FILE"
      echo '  alias rg='"'${replaced}'" >> "$SNAPSHOT_FILE"
      echo "fi" >> "$SNAPSHOT_FILE"
    `;
      break;
    }
    case "function":
      functionLines.push(
        "# Check for rg availability",
        `if ${RG_NOT_AVAILABLE_TEST}; then`,
        `  ${rgIntegration.snippet}`,
        "fi",
      );
      break;
  }
  let findGrepIntegration = createFindGrepShellIntegration();
  if (findGrepIntegration !== null)
    functionLines.push("# Shadow find/grep with embedded bfs/ugrep", findGrepIntegration);
  functionLines.push(
    "# Shadow pkill to refuse patterns matching the CLI process",
    createPkillGuardFunction(),
  );
  if (!pathProbeFailed) functionLines.push(`export PATH=${shellQuoteArgs([path])}`);
  content += `
      cat >> "$SNAPSHOT_FILE" << '${heredocMarker}'
${functionLines.join(`
`)}
${heredocMarker}
  `;
  if (pathProbeFailed) {
    let appendLoop =
      appended.length > 0
        ? `
      for __cc_dir in ${shellQuoteArgs(appended)}; do
        case ":$__cc_path:" in *":$__cc_dir:"*) ;; *) __cc_path=\${__cc_path:+$__cc_path:}$__cc_dir ;; esac
      done`
        : "";
    content += `

      # Add PATH to the file, as this shell has it, plus missing plugin dirs
      __cc_path=$PATH${appendLoop}
      builtin printf 'export PATH=%q\\n' "$__cc_path" >> "$SNAPSHOT_FILE"
      unset __cc_path __cc_dir
  `;
  }
  return content;
}
//@ chunk-e6aww6q8.js:3061032-3062052 fingerprint = getSnapshotScript (1)
/**
 * 拼装快照脚本：source 用户配置（< /dev/null）、可选导出环境、清空快照文件、unalias -a、用户函数/选项/别名、Claude Code 自带内容，最后校验文件存在。
 */
async function getSnapshotScript(shellPath, snapshotPath, hasUserConfig, extraPathDirs, dumpEnv) {
  let configFile = getConfigFile(shellPath);
  let isZsh = configFile.endsWith(".zshrc");
  let userContent = hasUserConfig
    ? getUserSnapshotContent(configFile)
    : !isZsh
      ? 'echo "shopt -s expand_aliases" >> "$SNAPSHOT_FILE"'
      : "";
  let claudeCodeContent = await getClaudeCodeSnapshotContent(shellPath, extraPathDirs);
  return `SNAPSHOT_FILE=${shellQuoteArgs([snapshotPath])}
      ${hasUserConfig ? `source "${configFile}" < /dev/null` : "# No user config file to source"}
      ${dumpEnv ? DUMP_ENV_SCRIPT : ""}

      # First, create/clear the snapshot file
      echo "# Snapshot file" >| "$SNAPSHOT_FILE"

      # When this file is sourced, we first unalias to avoid conflicts
      # This is necessary because aliases get "frozen" inside function definitions at definition time,
      # which can cause unexpected behavior when functions use commands that conflict with aliases
      echo "# Unset all aliases to avoid conflicts with functions" >> "$SNAPSHOT_FILE"
      echo "unalias -a 2>/dev/null || true" >> "$SNAPSHOT_FILE"

      ${userContent}

      ${claudeCodeContent}

      # Exit silently on success, only report errors
      if [ ! -f "$SNAPSHOT_FILE" ]; then
        echo "Error: Snapshot file was not created at $SNAPSHOT_FILE" >&2
        exit 1
      fi
    `;
}
//@ chunk-e6aww6q8.js:3062052-3064610 fingerprint = createAndSaveSnapshot (0.99)
/**
 * 创建 shell 快照：按 shell 选择 .zshrc/.bashrc/.profile，在 Claude 配置目录 shell-snapshots/ 下生成 snapshot-<shell>-<时间>-<随机>.sh，用 shell -c -l 执行快照脚本（10s 超时，env 带 SHELL、GIT_EDITOR=true、CLAUDECODE=1，CLAUDE_CODE_DONT_INHERIT_ENV 时不继承环境）；成功后注册退出清理，并可解析导出的环境变量；失败上报 tengu_shell_snapshot_failed 等事件。返回快照路径或 undefined。
 */
var createAndSaveSnapshot = async (shellPath, extraPathDirs = []) => {
  if (isDisklessSession_2()) return;
  let shellType = shellPath.includes("zsh") ? "zsh" : shellPath.includes("bash") ? "bash" : "sh";
  logForDebugging(`Creating shell snapshot for ${shellType} (${shellPath})`);
  return new Promise(async (resolve) => {
    try {
      let configFile = getConfigFile(shellPath);
      logForDebugging(`Looking for shell config file: ${configFile}`);
      let configFileExists = await pathExists(configFile);
      if (!configFileExists)
        logForDebugging(
          `Shell config file not found: ${configFile}, creating snapshot with Claude Code defaults only`,
        );
      let timestamp = Date.now();
      let randomId = Math.random().toString(36).substring(2, 8);
      let snapshotsDir = join(getClaudeConfigDir(), "shell-snapshots");
      logForDebugging(`Snapshots directory: ${snapshotsDir}`);
      let sessionTag = safeSessionIdForSnapshot(getSessionId());
      let shellSnapshotPath = join(
        snapshotsDir,
        `snapshot-${shellType}-${timestamp}-${randomId}${sessionTag !== undefined ? `-${sessionTag}` : ""}.sh`,
      );
      await mkdir(snapshotsDir, {
        recursive: true,
      });
      let dumpEnv = isDesktopNonClaudecode() && getPlatform() !== "windows";
      let snapshotScript = await getSnapshotScript(
        shellPath,
        shellSnapshotPath,
        configFileExists,
        extraPathDirs,
        dumpEnv,
      );
      logForDebugging(`Creating snapshot at: ${shellSnapshotPath}`);
      logForDebugging(`Execution timeout: ${SNAPSHOT_TIMEOUT_MS}ms`);
      execFile(
        shellPath,
        ["-c", "-l", snapshotScript],
        {
          env: {
            ...(process.env.CLAUDE_CODE_DONT_INHERIT_ENV ? {} : subprocessEnv()),
            SHELL: shellPath,
            GIT_EDITOR: "true",
            CLAUDECODE: "1",
          },
          timeout: SNAPSHOT_TIMEOUT_MS,
          maxBuffer: 1048576,
          encoding: "utf8",
          windowsHide: true,
          ...cgroupSpawnOptions("shell"),
        },
        async (error, stdout, stderr) => {
          if (error) {
            let execError = error;
            logForDebugging(`Shell snapshot creation failed: ${error.message}`);
            logForDebugging("Error details:");
            logForDebugging(`  - Error code: ${execError?.code}`);
            logForDebugging(`  - Error signal: ${execError?.signal}`);
            logForDebugging(`  - Error killed: ${execError?.killed}`);
            logForDebugging(`  - Shell path: ${shellPath}`);
            logForDebugging(`  - Config file: ${getConfigFile(shellPath)}`);
            logForDebugging(`  - Config file exists: ${configFileExists}`);
            logForDebugging(`  - Working directory: ${getCwd()}`);
            logForDebugging(`  - Claude home: ${getClaudeConfigDir()}`);
            logForDebugging(`Full snapshot script:
${snapshotScript}`);
            if (stdout)
              logForDebugging(`stdout output (${stdout.length} chars):
${stdout.split(SHELL_EXPORTS_MARKER)[0]}`);
            else logForDebugging("No stdout output captured");
            if (stderr) logForDebugging(`stderr output (${stderr.length} chars): ${stderr}`);
            else logForDebugging("No stderr output captured");
            logForDebugging(`Failed to create shell snapshot: ${error.message}`, {
              level: "error",
            });
            let signalNumber = execError?.signal ? osModule.constants.signals[execError.signal] : undefined;
            logEvent("tengu_shell_snapshot_failed", {
              stderr_length: stderr?.length || 0,
              has_error_code: !!execError?.code,
              error_signal_number: signalNumber,
              error_killed: execError?.killed,
            });
            resolve(undefined);
          } else {
            let snapshotSize;
            try {
              snapshotSize = (await stat(shellSnapshotPath)).size;
            } catch {}
            if (snapshotSize !== undefined) {
              logForDebugging(`Shell snapshot created successfully (${snapshotSize} bytes)`);
              registerCleanup(async () => {
                try {
                  await getFsImplementation().unlink(shellSnapshotPath);
                  logForDebugging(`Cleaned up session snapshot: ${shellSnapshotPath}`);
                } catch (error) {
                  logForDebugging(`Error cleaning up session snapshot: ${error}`);
                }
              });
              if (dumpEnv) reportShellExports(parseShellExports(stdout));
              resolve(shellSnapshotPath);
            } else {
              logForDebugging(`Shell snapshot file not found after creation: ${shellSnapshotPath}`);
              logForDebugging(`Checking if parent directory still exists: ${snapshotsDir}`);
              try {
                let dirContents = await getFsImplementation().readdir(snapshotsDir);
                logForDebugging(`Directory contains ${dirContents.length} files`);
              } catch {
                logForDebugging(`Parent directory does not exist or is not accessible: ${snapshotsDir}`);
              }
              logEvent("tengu_shell_unknown_error", {});
              resolve(undefined);
            }
          }
        },
      );
    } catch (error) {
      logForDebugging(`Unexpected error during snapshot creation: ${error}`, {
        level: "error",
      });
      if (error instanceof Error) logForDebugging(`Error stack trace: ${error.stack}`);
      logEvent("tengu_shell_snapshot_error", {});
      resolve(undefined);
    }
  });
};
var ENV_ASSIGNMENT_RE_4 = /^([A-Za-z_][A-Za-z0-9_]*)=/;
export {
  SNAPSHOT_TIMEOUT_MS,
  ENV_ASSIGNMENT_RE_4,
  createAndSaveSnapshot,
  getSnapshotOverride,
  CLAUDE_CODE_EXECPATH,
  getPluginPathEnv,
};
