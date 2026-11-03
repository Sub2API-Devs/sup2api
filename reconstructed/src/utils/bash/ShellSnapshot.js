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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import * as osModule from "os";
import {
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
} from "fs/promises";
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
import { Tv } from "../disklessSession.js";
import { pathExists } from "../fsSafety/atomicWriteStaging.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { Obn } from "../Shell.js";
import { getSessionId } from "../../bootstrap/state.js";
import { isDesktopNonClaudecode } from "../entrypointKinds.js";
import { Nd } from "../toolCgroup.js";
import { getCwd } from "../cwd.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { getFsImplementation } from "../fsOperations.js";
import { _qt } from "../shell/shellEnvSnapshot.js";

//@ chunk-e6aww6q8.js:3051940-3052177 placement
function appendPluginBinPaths(e, n, r) {
  let s = new Set((e ?? "").split(r)),
    filtered = n.filter((y) => {
      if (y.includes(r))
        return (logForDebugging(`Dropping plugin bin path that holds the PATH delimiter: ${y}`), !1);
      return !s.has(y);
    });
  return { appended: filtered, path: [e, ...filtered].filter(Boolean).join(r) };
}
/**
 * 计算追加插件 bin 目录后的 PATH 环境变量（保持原变量名大小写）。
 */
//@ chunk-e6aww6q8.js:3052177-3052304 placement
function getPluginPathEnv(e, n, r) {
  if (n.length === 0) return {};
  let s = spellingIn(e, "PATH"),
    { appended: appended, path: path } = appendPluginBinPaths(e[s], n, r);
  return appended.length > 0 ? { [s]: path } : {};
}
/**
 * Shell 快照超时 10 秒，以及传给子 shell 的环境变量名 CLAUDE_CODE_EXECPATH、CLAUDE_CODE_INVOKED_SKILLS。
 */
//@ chunk-e6aww6q8.js:3052304-3052376 layout
var SNAPSHOT_TIMEOUT_MS = 1e4,
  CLAUDE_CODE_EXECPATH = "CLAUDE_CODE_EXECPATH",
  CLAUDE_CODE_INVOKED_SKILLS = "CLAUDE_CODE_INVOKED_SKILLS";
/**
 * 生成同名 shell 函数，以 ARGV0（zsh/Windows）或 exec -a（bash）把内置二进制伪装成 rg/bfs/ugrep 执行；CLAUDE_CODE_EXECPATH 不可执行时回落到系统命令；可指定遇到某些参数时直接走系统命令。
 */
//@ chunk-e6aww6q8.js:3052376-3053131 fingerprint = createArgv0ShellFunction (0.373)
function createArgv0ShellFunction(funcName, argv0, binaryPath = [], prependArgs = []) {
  let h = binaryPath.length > 0 ? `${binaryPath.join(" ")} \${1+"$@"}` : '${1+"$@"}',
    y = getPlatform() === "windows",
    S = join_84(getUserBinDir(), y ? "claude.exe" : "claude"),
    w = y ? windowsPathToPosixPath(S) : S,
    L =
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
    ...L,
    `  local _cc_bin="\${${CLAUDE_CODE_EXECPATH}:-}"`,
    `  [[ -x $_cc_bin ]] || _cc_bin=${shellQuoteArgs([w])}`,
    `  if [[ ! -x $_cc_bin ]]; then command ${funcName} \${1+"$@"}; return; fi`,
    "  if [[ -n ${ZSH_VERSION:-} ]]; then",
    `    ARGV0=${argv0} "$_cc_bin" ${h}`,
    '  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then',
    `    ARGV0=${argv0} "$_cc_bin" ${h}`,
    "  else",
    `    (exec -a ${argv0} "$_cc_bin" ${h})`,
    "  fi",
    "}",
  ].join(`
`);
}
//@ chunk-e6aww6q8.js:3053131-3053339 fingerprint = createRipgrepShellIntegration (1)
function createRipgrepShellIntegration() {
  let rgCommand = ripgrepCommand();
  if (rgCommand.argv0) return { type: "function", snippet: createArgv0ShellFunction("rg", rgCommand.argv0) };
  let quotedPath = shellQuoteArgs([rgCommand.rgPath]),
    quotedArgs = rgCommand.rgArgs.map((arg) => shellQuoteArgs([arg]));
  return {
    type: "alias",
    snippet: rgCommand.rgArgs.length > 0 ? `${quotedPath} ${quotedArgs.join(" ")}` : quotedPath,
  };
}
/**
 * shell 片段（rg 不存在时的判断）与内嵌 ugrep 的 VCS 排除目录列表。
 */
//@ chunk-e6aww6q8.js:3053339-3053451 layout = VCS_DIRECTORIES_TO_EXCLUDE (0.903)
var RG_NOT_AVAILABLE_TEST = "! hash rg 2>/dev/null && ! typeset -f rg >/dev/null 2>&1",
  VCS_DIRECTORIES_FOR_UGREP = [".git", ".svn", ".hg", ".bzr", ".jj", ".sl"];
/**
 * 内置 find/grep 替换开启时，生成 find→bfs、grep→ugrep 的包装函数（ugrep 默认 -G --ignore-files --hidden -I 并排除 VCS 目录，危险选项回落系统 grep）。
 */
//@ chunk-e6aww6q8.js:3053451-3053883 fingerprint = createFindGrepShellIntegration (0.613)
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
        ...VCS_DIRECTORIES_FOR_UGREP.map((e) => `--exclude-dir=${e}`),
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
/**
 * 生成 pkill 包装函数：用 pgrep 预演同样的模式，若会匹配 CLAUDE_PID 则拒绝并提示用 pkill -P $$。
 */
//@ chunk-e6aww6q8.js:3053883-3054873 layout
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
function Lvr(e) {
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
/**
 * 按 shell 路径选择配置文件：含 zsh→~/.zshrc，含 bash→~/.bashrc，否则 ~/.profile。
 */
//@ chunk-e6aww6q8.js:3054952-3055069 fingerprint = getConfigFile (1)
function getConfigFile(shellPath) {
  let fileName = shellPath.includes("zsh") ? ".zshrc" : shellPath.includes("bash") ? ".bashrc" : ".profile";
  return join_84(osModule.homedir(), fileName);
}
/**
 * 导出用户 shell 状态的脚本片段：zsh 用 typeset -f / setopt，bash 用 shopt -p、逐函数 eval %q、set -o；别名最多 1000 条（Windows 去掉 winpty 别名）。
 */
//@ chunk-e6aww6q8.js:3055069-3058104 fingerprint = getUserSnapshotContent (0.476)
function getUserSnapshotContent(configFile) {
  let isZsh = configFile.endsWith(".zshrc"),
    content = "";
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
  return (
    (content += `
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
  `),
    content
  );
}
/**
 * Windows 下运行 shell -lc 'echo "$PATH"' 取登录 PATH；输出不可用时记日志并上报 tengu_shell_snapshot_path_probe_failed，返回 undefined。
 */
//@ chunk-e6aww6q8.js:3058104-3058748 layout
async function probeLoginShellPath(e) {
  let n = await safeExecFile(e, ["-lc", 'echo "$PATH"'], { reject: !1, timeout: SNAPSHOT_TIMEOUT_MS }),
    trimmed = (n.stdout ?? "").trim(),
    s =
      trimmed
        .split(
          `
`,
        )
        .at(-1)
        ?.trim() ?? "";
  if (n.exitCode === 0 && s.startsWith("/") && !s.includes(";")) return s;
  let h = n.stderr ?? "";
  (logForDebugging(
    `Shell snapshot: ${e} -lc 'echo "$PATH"' gave no usable PATH (exit code ${n.exitCode ?? "none"}, timed out: ${n.timedOut === !0}, output empty: ${trimmed === ""}). The snapshot will take PATH from the shell that creates it.`,
    { level: "warn" },
  ),
    logForDebugging(`Shell snapshot: PATH probe stderr (${h.length} chars): ${h}`),
    logEvent("tengu_shell_snapshot_path_probe_failed", {
      timed_out: n.timedOut === !0,
      exit_code: n.exitCode,
      empty_output: trimmed === "",
    }));
  return;
}
//@ chunk-e6aww6q8.js:3058748-3059280 layout
var SHELL_EXPORTS_MARKER = "--- claude-code-shell-exports ---",
  IGNORED_EXPORT_VARS = new Set("PWD OLDPWD SHLVL _ GIT_EDITOR CLAUDECODE AWKPATH AWKLIBPATH".split(" ")),
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
/**
 * 解析快照 stdout 中两个标记之间的 NAME=value 行，得到环境变量 Map（跳过已在进程环境中的、PWD/SHLVL 等、受保护变量、含 U+FFFD 的；还原 %25/%0A/%0D）。
 */
//@ chunk-e6aww6q8.js:3059280-3059672 layout
function parseShellExports(e) {
  let n = new Map(),
    r = subprocessEnv(),
    parts = e.split(`
`),
    [h, y, ...S] = parts.flatMap((w, L) => (w === SHELL_EXPORTS_MARKER ? [L] : []));
  for (let w of y === void 0 || S.length > 0 ? [] : parts.slice(h + 1, y)) {
    let sliced = w.slice(0, Math.max(w.indexOf("="), 0));
    if (
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(sliced) &&
      r[sliced] === void 0 &&
      !IGNORED_EXPORT_VARS.has(sliced) &&
      !isAssignmentNameUnsafeForSandbox(sliced) &&
      !w.includes("\uFFFD")
    )
      n.set(
        sliced,
        w.slice(sliced.length + 1).replace(/%(25|0A|0D)/g, (G, q) =>
          q === "25"
            ? "%"
            : q === "0A"
              ? `
`
              : "\r",
        ),
      );
  }
  return n;
}
/**
 * Claude Code 自带的快照内容：rg 别名或函数（内置 ripgrep）、可选 find/grep 用内置 bfs/ugrep 替换、pkill 防误杀函数、PATH（Windows 下从登录 shell 探测，失败则在运行时追加插件目录）。
 */
//@ chunk-e6aww6q8.js:3059672-3061032 callgraph-witnessed = getClaudeCodeSnapshotContent (0.156)
async function getClaudeCodeSnapshotContent(shellPath, extraPathDirs) {
  let r = settingsPathForChildren() ?? env.PATH,
    s = !1;
  if (getPlatform() === "windows") {
    let Z = await probeLoginShellPath(shellPath);
    if (Z === void 0) s = !0;
    else r = Z;
  }
  let { appended: appended, path: path } = appendPluginBinPaths(
      s ? void 0 : r,
      getPlatform() === "windows" ? extraPathDirs.map(windowsPathToPosixPath) : extraPathDirs,
      ":",
    ),
    rgIntegration = createRipgrepShellIntegration(),
    content = "",
    L = `CLAUDE_CODE_END_${Math.random().toString(36).substring(2, 18)}`,
    G = [];
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
      G.push(
        "# Check for rg availability",
        `if ${RG_NOT_AVAILABLE_TEST}; then`,
        `  ${rgIntegration.snippet}`,
        "fi",
      );
      break;
  }
  let findGrepIntegration = createFindGrepShellIntegration();
  if (findGrepIntegration !== null) G.push("# Shadow find/grep with embedded bfs/ugrep", findGrepIntegration);
  if ((G.push("# Shadow pkill to refuse patterns matching the CLI process", createPkillGuardFunction()), !s))
    G.push(`export PATH=${shellQuoteArgs([path])}`);
  if (
    ((content += `
      cat >> "$SNAPSHOT_FILE" << '${L}'
${G.join(`
`)}
${L}
  `),
    s)
  ) {
    let Z =
      appended.length > 0
        ? `
      for __cc_dir in ${shellQuoteArgs(appended)}; do
        case ":$__cc_path:" in *":$__cc_dir:"*) ;; *) __cc_path=\${__cc_path:+$__cc_path:}$__cc_dir ;; esac
      done`
        : "";
    content += `

      # Add PATH to the file, as this shell has it, plus missing plugin dirs
      __cc_path=$PATH${Z}
      builtin printf 'export PATH=%q\\n' "$__cc_path" >> "$SNAPSHOT_FILE"
      unset __cc_path __cc_dir
  `;
  }
  return content;
}
/**
 * 拼装快照脚本：source 用户配置（< /dev/null）、可选导出环境、清空快照文件、unalias -a、用户函数/选项/别名、Claude Code 自带内容，最后校验文件存在。
 */
//@ chunk-e6aww6q8.js:3061032-3062052 fingerprint = getSnapshotScript (1)
async function getSnapshotScript(shellPath, snapshotPath, hasUserConfig, extraPathDirs, dumpEnv) {
  let configFile = getConfigFile(shellPath),
    isZsh = configFile.endsWith(".zshrc"),
    userContent = hasUserConfig
      ? getUserSnapshotContent(configFile)
      : !isZsh
        ? 'echo "shopt -s expand_aliases" >> "$SNAPSHOT_FILE"'
        : "",
    L = await getClaudeCodeSnapshotContent(shellPath, extraPathDirs);
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

      ${L}

      # Exit silently on success, only report errors
      if [ ! -f "$SNAPSHOT_FILE" ]; then
        echo "Error: Snapshot file was not created at $SNAPSHOT_FILE" >&2
        exit 1
      fi
    `;
}
/**
 * 创建 shell 快照：按 shell 选择 .zshrc/.bashrc/.profile，在 Claude 配置目录 shell-snapshots/ 下生成 snapshot-<shell>-<时间>-<随机>.sh，用 shell -c -l 执行快照脚本（10s 超时，env 带 SHELL、GIT_EDITOR=true、CLAUDECODE=1，CLAUDE_CODE_DONT_INHERIT_ENV 时不继承环境）；成功后注册退出清理，并可解析导出的环境变量；失败上报 tengu_shell_snapshot_failed 等事件。返回快照路径或 undefined。
 */
//@ chunk-e6aww6q8.js:3062052-3064610 fingerprint = createAndSaveSnapshot (0.99)
var createAndSaveSnapshot = async (shellPath, extraPathDirs = []) => {
    if (Tv()) return;
    let r = shellPath.includes("zsh") ? "zsh" : shellPath.includes("bash") ? "bash" : "sh";
    return (
      logForDebugging(`Creating shell snapshot for ${r} (${shellPath})`),
      new Promise(async (s) => {
        try {
          let h = getConfigFile(shellPath);
          logForDebugging(`Looking for shell config file: ${h}`);
          let y = await pathExists(h);
          if (!y)
            logForDebugging(
              `Shell config file not found: ${h}, creating snapshot with Claude Code defaults only`,
            );
          let now = Date.now(),
            substring = Math.random().toString(36).substring(2, 8),
            L = join_84(getClaudeConfigDir(), "shell-snapshots");
          logForDebugging(`Snapshots directory: ${L}`);
          let G = Obn(getSessionId()),
            q = join_84(L, `snapshot-${r}-${now}-${substring}${G !== void 0 ? `-${G}` : ""}.sh`);
          await mkdir_16(L, { recursive: !0 });
          let Z = isDesktopNonClaudecode() && getPlatform() !== "windows",
            Se = await getSnapshotScript(shellPath, q, y, extraPathDirs, Z);
          (logForDebugging(`Creating snapshot at: ${q}`),
            logForDebugging(`Execution timeout: ${SNAPSHOT_TIMEOUT_MS}ms`),
            execFile(
              shellPath,
              ["-c", "-l", Se],
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
                windowsHide: !0,
                ...Nd("shell"),
              },
              async (ke, we, Ee) => {
                if (ke) {
                  let Ae = ke;
                  if (
                    (logForDebugging(`Shell snapshot creation failed: ${ke.message}`),
                    logForDebugging("Error details:"),
                    logForDebugging(`  - Error code: ${Ae?.code}`),
                    logForDebugging(`  - Error signal: ${Ae?.signal}`),
                    logForDebugging(`  - Error killed: ${Ae?.killed}`),
                    logForDebugging(`  - Shell path: ${shellPath}`),
                    logForDebugging(`  - Config file: ${getConfigFile(shellPath)}`),
                    logForDebugging(`  - Config file exists: ${y}`),
                    logForDebugging(`  - Working directory: ${getCwd()}`),
                    logForDebugging(`  - Claude home: ${getClaudeConfigDir()}`),
                    logForDebugging(`Full snapshot script:
${Se}`),
                    we)
                  )
                    logForDebugging(`stdout output (${we.length} chars):
${we.split(SHELL_EXPORTS_MARKER)[0]}`);
                  else logForDebugging("No stdout output captured");
                  if (Ee) logForDebugging(`stderr output (${Ee.length} chars): ${Ee}`);
                  else logForDebugging("No stderr output captured");
                  logForDebugging(`Failed to create shell snapshot: ${ke.message}`, { level: "error" });
                  let Ie = Ae?.signal ? osModule.constants.signals[Ae.signal] : void 0;
                  (logEvent("tengu_shell_snapshot_failed", {
                    stderr_length: Ee?.length || 0,
                    has_error_code: !!Ae?.code,
                    error_signal_number: Ie,
                    error_killed: Ae?.killed,
                  }),
                    s(void 0));
                } else {
                  let Ae;
                  try {
                    Ae = (await stat_16(q)).size;
                  } catch {}
                  if (Ae !== void 0) {
                    if (
                      (logForDebugging(`Shell snapshot created successfully (${Ae} bytes)`),
                      registerCleanup(async () => {
                        try {
                          (await getFsImplementation().unlink(q),
                            logForDebugging(`Cleaned up session snapshot: ${q}`));
                        } catch (error) {
                          logForDebugging(`Error cleaning up session snapshot: ${error}`);
                        }
                      }),
                      Z)
                    )
                      _qt(parseShellExports(we));
                    s(q);
                  } else {
                    (logForDebugging(`Shell snapshot file not found after creation: ${q}`),
                      logForDebugging(`Checking if parent directory still exists: ${L}`));
                    try {
                      let entries = await getFsImplementation().readdir(L);
                      logForDebugging(`Directory contains ${entries.length} files`);
                    } catch {
                      logForDebugging(`Parent directory does not exist or is not accessible: ${L}`);
                    }
                    (logEvent("tengu_shell_unknown_error", {}), s(void 0));
                  }
                }
              },
            ));
        } catch (error) {
          if (
            (logForDebugging(`Unexpected error during snapshot creation: ${error}`, { level: "error" }),
            error instanceof Error)
          )
            logForDebugging(`Error stack trace: ${error.stack}`);
          (logEvent("tengu_shell_snapshot_error", {}), s(void 0));
        }
      })
    );
  },
  ENV_ASSIGNMENT_RE_3 = /^([A-Za-z_][A-Za-z0-9_]*)=/;

export {
  createAndSaveSnapshot,
  getSnapshotOverride,
  CLAUDE_CODE_EXECPATH,
  getPluginPathEnv,
  SNAPSHOT_TIMEOUT_MS,
  ENV_ASSIGNMENT_RE_3,
};
