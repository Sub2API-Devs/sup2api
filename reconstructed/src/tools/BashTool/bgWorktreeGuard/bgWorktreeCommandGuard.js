/**
 * tools/BashTool/bgWorktreeGuard/bgWorktreeCommandGuard.ts
 *
 * 2.1.316 新增：后台 worktree 守卫入口：检查命令是否会改变目录或越出 worktree，以及 git 全局选项。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-63f0f3kd.js (26)
 * attribution: placement 26
 */
import { basename, isAbsolute } from "path";
import { isolationSubjectWords, escapedSharedRoots } from "../../../utils/worktreeIsolation.js";
import {
  isParseFailureNode,
  analyzeCommandForWorktree,
  analyzeSimpleCommandForWorktree,
  GIT_COMMAND_PATTERN,
} from "./shellState.js";
import { firstGlobCharIndex } from "../../../utils/windowsUncPaths.js";
import {
  redactPlaceholdersForDisplay,
  deletePlaceholders,
  containsAnyPlaceholder,
  EVAL_LIKE_BUILTINS,
} from "../../../utils/bash/ast.js";
import { getCdTargetFromArgv } from "../bashPermissions.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { firstLineOf } from "../../../utils/stringUtils.js";
import { isUncOrDevicePath, hasDotSegment } from "../../../utils/pathClassification.js";
import { EXEC_LIKE_COMMANDS, COMMAND_PREFIX_WORDS } from "./commandTables.js";
import { expandPath } from "../../../utils/path.js";

//@ chunk-63f0f3kd.js:95112-102498 placement
/**
 * 后台 worktree 守卫入口（checkBgWorktreeCommandGuard）：会话隔离在 worktree 时，拒绝会把 git 操作指向主仓库（cd、GIT_DIR、-C、--git-dir 等）或无法证明留在 worktree 内的命令，并给出改写建议。
 */
function checkBgWorktreeCommandGuard(t, e, i, n) {
  {
    let { noun, possessive } = isolationSubjectWords(n);
    let a = (m, _ = `Run the equivalent from ${n} without the redirect.`) =>
      `${noun} is isolated in the worktree ${n}, but this command ${m}. Refusing to run it \u2014 ${possessive} git operations must target its own worktree. ${_}`;
    let o = `Split it into plain, separate commands and run them from ${n}.`;
    if (mentionsRsyncConnectProg(e, t))
      return a(
        "names RSYNC_CONNECT_PROG (in any letter case, possibly split by quotes, $ expansions, backticks, backslashes or brace lists), which is refused here even as a mere mention because rsync runs its value through the shell with the destination host spliced in, so what it runs cannot be shown not to be git",
        `Rewrite the command so that it does not spell RSYNC_CONNECT_PROG and run it from ${n}; a transfer that needs that connection program belongs to a session that is not isolated to a worktree.`,
      );
    if (t.kind !== "simple") {
      if (isParseFailureNode(t) || t.tree === undefined)
        return a("is too complex to verify that it stays inside the worktree", o);
      if (GIT_COMMAND_NAME_RE.test(e))
        return a("names git in a form too complex to verify that it stays inside the worktree", o);
      let m = analyzeCommandForWorktree(t.tree);
      return m === null ? null : a(m, o);
    }
    let commands = t.commands;
    let mapped = commands.map((command) => firstGitIndex(command.argv));
    let any = mapped.some((m) => m !== -1);
    let any_2 = commands.some((command) => hasDirectoryChange(command.argv));
    let any_3 = commands.some((command, _) => {
      let gitLocationEnv = collectGitLocationEnv(command);
      if (!("opaque" in gitLocationEnv) && gitLocationEnv.envChdirs.length > 0) return true;
      let T = mapped[_];
      if (T === -1) return false;
      let G = checkGitGlobalOptions(command.argv, T, command.hasUnquotedGlob, command.argvUnquotedGlob);
      return "chdirs" in G && (G.chdirs.length > 0 || G.pins.length > 0 || G.bare);
    });
    let h = [];
    {
      let m = false;
      for (let idx = commands.length - 1; idx >= 0; idx--) {
        m = m || mapped[idx] !== -1;
        h[idx] = m;
      }
    }
    let b = i;
    let g = new Map();
    let S = new Set();
    for (let [m, command] of commands.entries()) {
      let x = command.argv[0] ?? "";
      if (command.hasUnquotedGlob && firstGlobCharIndex(x) !== -1)
        return a(
          `spells its command as a glob (${x}) that bash resolves at runtime, so it can't be verified as anything but git`,
          `Spell the command name out literally and run it from ${n}.`,
        );
      let T = describeUnverifiableGitLaunch(command.argv);
      if (T !== null) return a(T, `Run git directly with literal arguments from ${n}.`);
      let G = h[m]
        ? command.argv.find((arg, A) => {
            let lower = basename(arg).toLowerCase();
            return lower === "." ? A === 0 : EVAL_LIKE_COMMANDS.has(lower);
          })
        : undefined;
      if (G !== undefined)
        return a(
          `runs ${basename(G)} before a git command, whose string payload can't be verified to leave the worktree alone`,
          `Run the git command directly, without ${basename(G)}, from ${n}.`,
        );
      let gitLocationEnv = collectGitLocationEnv(command);
      if ("opaque" in gitLocationEnv) {
        if (gitLocationEnv.opaque.toUpperCase() === "ARGV0")
          return a(
            `sets ${gitLocationEnv.opaque}, which changes the name git is started under, so the subcommand git would run can't be verified`,
            `Run it without ${gitLocationEnv.opaque} from ${n}.`,
          );
        return a(
          `sets ${gitLocationEnv.opaque}, injecting git configuration whose effect on where git writes can't be verified`,
        );
      }
      if (gitLocationEnv.envUnmodeled !== null)
        return a(
          `runs env with ${gitLocationEnv.envUnmodeled}, whose effect on the command it wraps can't be verified`,
          `Run the command without that env flag from ${n}.`,
        );
      let N = mapped[m];
      let y =
        N === -1
          ? null
          : checkGitGlobalOptions(command.argv, N, command.hasUnquotedGlob, command.argvUnquotedGlob);
      if (y !== null && "runtime" in y) {
        if (y.runtime.includes("{}") && isGITemplateEnvStrict())
          return a(
            `has {} among the words right after git (${redactPlaceholdersForDisplay(y.runtime)}), which find -exec fills with a path name when the command runs, so the options git receives can't be verified`,
            `If git is only a search pattern there, search without find -exec (grep -rl git .); otherwise spell git's options and subcommand out literally and run it from ${n}.`,
          );
        return a(
          `has a word at or before git's subcommand that the shell fills in only when the command runs (${redactPlaceholdersForDisplay(y.runtime)}), so the options git receives can't be verified`,
          `Spell git's options and subcommand out literally, quoting any pattern meant for git itself, and run it from ${n}.`,
        );
      }
      if (y !== null && "initWord" in y) {
        let { initWord, initOption, behind } = y;
        let U = redactPlaceholdersForDisplay(initWord);
        if (initOption === undefined)
          return a(
            `has a word after git init that is filled in only when the command runs (${U}), so the options git init receives can't be verified`,
            `Spell the words after git init out literally (a full path rather than ~ or a variable, no glob pattern) and run it from ${n}.`,
          );
        if (behind === undefined)
          return a(
            `passes ${initOption} to git init, an option that acts on the repository this worktree shares rather than on the worktree`,
            `Run git init without ${initOption} from ${n}.`,
          );
        let ut = redactPlaceholdersForDisplay(behind) || "''";
        return a(
          `has ${ut} ahead of git and ${U} after it. A program ahead of git may start git under the name git-init, which would read that word as init's ${initOption}, an option that acts on the repository this worktree shares rather than on the worktree`,
          `Drop ${U}, or put git first if ${ut} just runs git, and run it from ${n}.`,
        );
      }
      if (y !== null && "opaque" in y)
        return a(
          `passes ${y.opaque} to git, injecting configuration whose effect on where git writes can't be verified`,
        );
      if (gitCommandIndices(command.argv).length > 1)
        return a(
          "names git more than once in a single command, which cannot be verified to stay inside the worktree",
          `Use one git invocation per command and run it from ${n}.`,
        );
      let z = N !== -1;
      let R = b;
      let O = gitLocationEnv.envChdirs.length > 0;
      if (gitLocationEnv.envChdirs.length > 1)
        return a("passes more than one -C/--chdir to env (last-wins semantics), which cannot be verified");
      let Y = gitLocationEnv.envChdirs[0];
      if (Y !== undefined) {
        let guardPath = resolveGuardPath(Y, b, false, command.hasUnquotedGlob);
        if (z) {
          if (guardPath === null)
            return a(`changes directory via env to a location computed at runtime (${Y}) before running git`);
          if (escapedSharedRoots(guardPath, n))
            return a(`changes directory via env to the shared checkout (${Y}) before running git`);
        }
        if (guardPath !== null) R = guardPath;
      }
      for (let { name: E, value: A, fromOperand } of gitLocationEnv.assignments) {
        let upper = E.toUpperCase();
        if (!fromOperand && S.has(upper))
          return a(
            `re-assigns the exported ${E} with a per-command prefix, which can append onto the exported value at runtime`,
          );
        if (fromOperand && isDeclarationCommandArgv(command)) {
          if (S.has(upper))
            return a(
              `exports ${E} more than once across the command, which cannot be verified (a += append or double-export)`,
            );
          S.add(upper);
          g.set(E, (g.get(E) ?? 0) + 1);
        }
        let guardPath = resolveGuardPath(A, R, any_2 || any_3 || O, command.hasUnquotedGlob);
        if (guardPath === null)
          return a(
            `sets ${E} to a location computed at runtime (${A}), which can't be verified before it runs`,
          );
        if (escapedSharedRoots(guardPath, n)) return a(`sets ${E} to the shared checkout (${A})`);
      }
      if (h[m] && hasDirectoryChange(command.argv)) {
        let cdTargetFromArgv = getCdTargetFromArgv(command.argv);
        let A =
          cdTargetFromArgv === undefined
            ? null
            : resolveGuardPath(cdTargetFromArgv, b, false, command.hasUnquotedGlob);
        if (A === null) return a("changes directory to a location computed at runtime before running git");
        if (escapedSharedRoots(A, n))
          return a(`changes directory to the shared checkout (${cdTargetFromArgv}) before running git`);
        b = A;
      }
      if (y === null) continue;
      if ((y.chdirs.length || y.pins.length || y.bare) && command.hasUnquotedGlob)
        return a("redirects git through a glob pattern that expands at runtime");
      let filtered = y.chdirs.filter((chdir) => chdir !== "");
      let Et = any_2 || O;
      let it = R;
      for (let E of filtered) {
        let guardPath = resolveGuardPath(E, it, Et, command.hasUnquotedGlob);
        if (guardPath === null)
          return a(
            `points git at a directory computed at runtime (-C ${E}), which can't be verified before it runs`,
          );
        it = guardPath;
      }
      let _t = [];
      if (filtered.length || O)
        _t.push({
          flag: O ? "env -C" : "-C",
          dir: it,
        });
      if (y.bare)
        _t.push({
          flag: "--bare",
          dir: it,
        });
      for (let { flag, value: A } of y.pins) {
        let guardPath = resolveGuardPath(A, it, Et, command.hasUnquotedGlob);
        if (guardPath === null)
          return a(
            `points git at a repository computed at runtime (${flag} ${A}), which can't be verified before it runs`,
          );
        _t.push({
          flag,
          dir: guardPath,
        });
      }
      for (let { flag, dir } of _t)
        if (escapedSharedRoots(dir, n)) return a(`redirects git to the shared checkout via ${flag}`);
    }
    if (
      any ||
      (commands.some((command) => setsGitConfigEnv(command.argv)) &&
        readFlagWithOverride(TENGU_RECURSIVE_GLADE, {
          safe: true,
        }))
    ) {
      let m = new Map();
      for (let bareAssignmentName of t.bareAssignmentNames)
        if (isGitConfigEnvVar(bareAssignmentName))
          m.set(bareAssignmentName, (m.get(bareAssignmentName) ?? 0) + 1);
      for (let [_, x] of m)
        if (x > (g.get(_) ?? 0)) {
          let T = `assigns ${_}, which redirects git to a repository this guard cannot verify`;
          return !any && GIT_LOCATION_ENV_VARS.has(_.toUpperCase())
            ? a(
                T,
                `Set ${_} where this guard can read its value, on the command that needs it (${_}=<value> <command>) or in an export (export ${_}=<value>), and run it from ${n}.`,
              )
            : a(T);
        }
    }
    let p = t.tree ? analyzeSimpleCommandForWorktree(t.tree) : null;
    if (p !== null) return a(p, `Run the plain command from ${n}.`);
  }
  return null;
}
//@ chunk-63f0f3kd.js:102498-102808 placement
/**
 * git 本身不处理、直接吃掉值的长选项（--namespace、--attr-source、--shallow-file），解析时跳过。
 */
var GIT_LOCATION_ENV_VARS = new Set([
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY",
  "GIT_INDEX_FILE",
  "GIT_SHALLOW_FILE",
]);
var GIT_PASSTHROUGH_VALUE_OPTIONS = new Set(["--namespace", "--attr-source", "--shallow-file"]);
var GIT_DIRECTORY_OPTIONS = ["--git-dir", "--work-tree"];
var TENGU_GOLDEN_PANDA = "tengu_golden_panda";
var TENGU_ZESTY_MUFFIN = "tengu_zesty_muffin";
var GIT_INIT_LONG_OPTIONS = ["--template", "--separate-git-dir", "--shared"];
//@ chunk-63f0f3kd.js:102808-102846 placement
/**
 * 读取 tengu_zesty_muffin 开关：GIT_TEMPLATE_DIR、ARGV0 是否视为影响 git 仓库位置。
 */
function isGITemplateEnvStrict() {
  return readFlagWithOverride(TENGU_ZESTY_MUFFIN, {
    safe: true,
  });
}
//@ chunk-63f0f3kd.js:102846-102952 placement
function expandGitLongOption(t) {
  let e = firstLineOf(t, "=");
  return e.length > 2 && e.startsWith("--") ? GIT_INIT_LONG_OPTIONS.find((i) => i.startsWith(e)) : undefined;
}
//@ chunk-63f0f3kd.js:102952-103128 placement
function findGitInitWord(t, e, i, n) {
  for (let r = n; r < t.length; r++) {
    let s = t[r];
    let a = expandGitLongOption(s);
    if (a !== undefined || hasPlaceholderOrGlob(t, e, i, r) || s.startsWith("~") || s.includes("{}"))
      return {
        initWord: s,
        initOption: a,
      };
  }
  return null;
}
//@ chunk-63f0f3kd.js:103128-103197 placement
/**
 * 子序列匹配 RSYNC_CONNECT_PROG 时视为“可跨过”的字符（$ ` { , } 与反斜杠）。
 */
var TENGU_ENCHANTED_PEBBLE = "tengu_enchanted_pebble";
var RSYNC_CONNECT_PROG = "RSYNC_CONNECT_PROG";
var SUBSHELL_MARKER_CHARS = "$`{,}\\";
//@ chunk-63f0f3kd.js:103197-103572 placement
/**
 * 用子序列匹配检测命令文本或参数中是否（可能被分隔地）出现 RSYNC_CONNECT_PROG，开关 tengu_enchanted_pebble 开启时才生效。
 */
function mentionsRsyncConnectProg(t, e) {
  let replaced = t.replace(/\\\n/g, "").replace(/['"]/g, "");
  let n = e.kind === "simple" ? e.commands.flatMap((command) => command.argv.map(deletePlaceholders)) : [];
  let r = false;
  t: for (let s of [replaced, ...n]) {
    let a = 0;
    let o = 0;
    for (let u of s.toUpperCase()) {
      a |= 1;
      let l = 0;
      for (let idx = 0; idx < RSYNC_CONNECT_PROG.length; idx++)
        if ((((a | o) >> idx) & 1) === 1 && u === RSYNC_CONNECT_PROG[idx]) l |= 1 << (idx + 1);
      if (((l >> RSYNC_CONNECT_PROG.length) & 1) === 1) {
        r = true;
        break t;
      }
      if (SUBSHELL_MARKER_CHARS.includes(u)) o |= a;
      a = l;
    }
  }
  return (
    r &&
    readFlagWithOverride(TENGU_ENCHANTED_PEBBLE, {
      safe: true,
    })
  );
}
//@ chunk-63f0f3kd.js:103572-103689 placement
/**
 * 匹配 /dev/fd、/dev/stdin、/dev/stdout、/dev/stderr 路径。
 */
var PROC_SELF_PATH_PATTERN = /(^|[\\/])proc[\\/](self|thread-self|\d+)([\\/]|$)/i;
var DEV_FD_PATH_PATTERN = /(^|[\\/])dev[\\/](fd|stdin|stdout|stderr)([\\/]|$)/i;
//@ chunk-63f0f3kd.js:103689-103806 placement
function isProcOrDevFdPath(t) {
  let replaced = t.replace(/[\\/]\.(?=[\\/]|$)/g, "");
  replaced = replaced.replace(/[\\/]{2,}/g, "/");
  return PROC_SELF_PATH_PATTERN.test(replaced) || DEV_FD_PATH_PATTERN.test(replaced);
}
//@ chunk-63f0f3kd.js:103806-104068 placement
function isMacVolumesPath(t) {
  if (/^[\\/]System[\\/]Volumes[\\/]/i.test(t)) return true;
  if (/^[\\/]Volumes[\\/]/i.test(t)) return true;
  if (/(^|[\\/])proc[\\/]cygdrive([\\/]|$)/i.test(t)) return true;
  if (/^[\\/]\.\.[\\/]/.test(t)) return true;
  if (isUncOrDevicePath(t)) return true;
  if (t.includes("~")) return true;
  return false;
}
//@ chunk-63f0f3kd.js:104068-104505 placement
/**
 * 可设置环境变量的命令集合（含 make，因为命令行变量会传给子进程）。
 */
var DIRECTORY_CHANGE_BUILTINS = new Set(["cd", "pushd", "popd", "chdir"]);
var ENV_SETTING_COMMANDS = new Set(["export", "declare", "typeset", "local", "readonly", "env", "make"]);
var DECLARATION_COMMANDS = new Set(["export", "declare", "typeset", "local", "readonly"]);
var ASSIGNMENT_OPERAND_RE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s;
var TENGU_RECURSIVE_GLADE = "tengu_recursive_glade";
var SHELL_DECLARE_BUILTINS = new Set([
  "export",
  "declare",
  "typeset",
  "local",
  "readonly",
  "integer",
  "float",
  "private",
]);
var SHELL_OPTION_BUILTINS = new Set(["set", "shopt", "setopt", "unsetopt", "emulate"]);
var SHELL_VAR_NAME_RE = /^([A-Za-z_][A-Za-z0-9_]*)(?:\+?=|$)/;
//@ chunk-63f0f3kd.js:104505-104862 placement
/**
 * 判断 argv 中是否有 env/export 等命令设置了 git 配置相关环境变量（含占位符或 allexport 选项也视为是）。
 */
function setsGitConfigEnv(argv) {
  return argv.some((e, i) => {
    let lower = basename(e).toLowerCase();
    if (SHELL_DECLARE_BUILTINS.has(lower))
      return argv.slice(i + 1).some((r) => {
        if (/^[-+]/.test(r)) return false;
        let s = SHELL_VAR_NAME_RE.exec(r)?.[1];
        return s === undefined || containsAnyPlaceholder(s) || isGitConfigEnvVar(s);
      });
    return (
      SHELL_OPTION_BUILTINS.has(lower) &&
      argv
        .slice(i + 1)
        .some(
          (r) =>
            containsAnyPlaceholder(r) ||
            !/^[-+]?[A-Za-z0-9_=-]*$/.test(r) ||
            r.toLowerCase().replace(/[_-]/g, "").includes("allexport") ||
            /^[-+][^-]*a/.test(r),
        )
    );
  });
}
//@ chunk-63f0f3kd.js:104862-105064 placement
function isGitConfigEnvVar(t) {
  let upper = t.toUpperCase();
  return (
    GIT_LOCATION_ENV_VARS.has(upper) ||
    upper.startsWith("GIT_CONFIG") ||
    upper === "GIT_ALLOW_PROTOCOL" ||
    ((upper === "GIT_TEMPLATE_DIR" || upper === "ARGV0") && isGITemplateEnvStrict()) ||
    upper === "HOME" ||
    upper === "CDPATH" ||
    upper === "XDG_CONFIG_HOME"
  );
}
//@ chunk-63f0f3kd.js:105064-105180 placement
/**
 * 会把字符串当命令执行的命令（eval 类，去掉 exec/nocorrect）。
 */
var ARG_FEEDING_PROGRAMS = new Set(["xargs", "parallel"]);
var EVAL_LIKE_COMMANDS = new Set([...EVAL_LIKE_BUILTINS].filter((t) => !EXEC_LIKE_COMMANDS.has(t)));
var FIND_EXECDIR_OPTIONS = new Set(["-execdir", "-okdir"]);
//@ chunk-63f0f3kd.js:105180-105846 placement
/**
 * 判断 git 是否经由 xargs/parallel、find -execdir 或字符串执行器运行而无法确认其目标仓库，返回原因文本或 null。
 */
function describeUnverifiableGitLaunch(argv) {
  if (argv.length === 0) return null;
  let any = argv.some((r) => GIT_COMMAND_PATTERN.test(basename(r)));
  let i = (r) => argv.some((s) => basename(s).toLowerCase() === r);
  let found = argv.find((r, s) => {
    let lower = basename(r).toLowerCase();
    return lower === "." ? s === 0 : EVAL_LIKE_COMMANDS.has(lower);
  });
  if (any && argv.some((r) => ARG_FEEDING_PROGRAMS.has(basename(r).toLowerCase())))
    return "feeds git its arguments from stdin at runtime (xargs/parallel), so the repository it targets cannot be verified";
  if (any && i("find") && argv.some((r) => FIND_EXECDIR_OPTIONS.has(r)))
    return "changes directory per match (find -execdir/-okdir) before running git, so its repository cannot be verified";
  if (found !== undefined) {
    if (argv.filter((s) => s !== found).length > 0)
      return `runs a string through ${basename(found)}, which can't be verified to stay inside the worktree`;
  }
  return null;
}
//@ chunk-63f0f3kd.js:105846-105907 placement
/**
 * argv 的命令是否为变量声明内建。
 */
function isDeclarationCommandArgv(t) {
  return DECLARATION_COMMANDS.has(basename(t.argv[0] ?? "").toLowerCase());
}
//@ chunk-63f0f3kd.js:105907-105993 placement
function gitCommandIndices(argv) {
  let e = [];
  for (let [i, n] of argv.entries()) if (GIT_COMMAND_PATTERN.test(basename(n))) e.push(i);
  return e;
}
//@ chunk-63f0f3kd.js:105993-106063 placement
function firstGitIndex(argv) {
  return argv.findIndex((e) => {
    let i = basename(e);
    return GIT_COMMAND_PATTERN.test(i);
  });
}
//@ chunk-63f0f3kd.js:106063-106077 placement
/**
 * 匹配命令名里含 git（git、git.exe 等）。
 */
var GIT_COMMAND_NAME_RE = /git/i;
//@ chunk-63f0f3kd.js:106077-106240 placement
/**
 * 在 argv 中跳过前置包装命令，找到目录切换内建命令（cd/pushd 等）的下标，没有返回 -1。
 */
function findDirectoryChangeIndex(t) {
  let e = 0;
  while (e < t.length && COMMAND_PREFIX_WORDS.has(t[e].toLowerCase())) {
    e += 1;
    while (e < t.length && t[e].startsWith("-")) e += 1;
  }
  return DIRECTORY_CHANGE_BUILTINS.has((t[e] ?? "").toLowerCase()) ? e : -1;
}
//@ chunk-63f0f3kd.js:106240-106273 placement
/**
 * argv 中是否含目录切换内建。
 */
function hasDirectoryChange(argv) {
  return findDirectoryChangeIndex(argv) !== -1;
}
//@ chunk-63f0f3kd.js:106715-108070 placement
/**
 * 收集命令前缀与 env 参数中影响 git 位置的环境变量赋值（GIT_DIR 等）与 env --chdir/-C 目录；出现 GIT_CONFIG*、HOME、CDPATH 等无法建模的变量时返回 opaque。
 */
function collectGitLocationEnv(command) {
  let e = firstGitIndex(command.argv);
  let i = ENV_SETTING_COMMANDS.has(basename(command.argv[0] ?? "").toLowerCase());
  let n = e !== -1 ? e : i ? command.argv.length : 0;
  let assignments = command.envVars.map((envVar) => ({
    ...envVar,
    fromOperand: false,
  }));
  let envChdirs = [];
  let sliced = command.argv.slice(1, n);
  let inEnv = basename(command.argv[0] ?? "").toLowerCase() === "env";
  let envUnmodeled = null;
  let l = -1;
  for (let [f, h] of sliced.entries()) {
    if (basename(h).toLowerCase() === "env") {
      inEnv = true;
      continue;
    }
    let match = ASSIGNMENT_OPERAND_RE.exec(h);
    if (match) {
      assignments.push({
        name: match[1],
        value: match[2],
        fromOperand: true,
      });
      continue;
    }
    if (inEnv && f !== l && !h.startsWith("-")) inEnv = false;
    if (inEnv) {
      if (h === "--chdir") {
        let g = sliced[f + 1];
        if (g !== undefined) {
          envChdirs.push(g);
          l = f + 1;
        }
      } else if (h.startsWith("--chdir=")) envChdirs.push(h.slice(8));
      else if (h === "--ignore-environment") continue;
      else if (/^-[a-zA-Z]/.test(h)) {
        let sliced_2 = h.slice(1);
        let S = false;
        for (let idx = 0; idx < sliced_2.length; idx++) {
          let m = sliced_2[idx];
          if (m === "i" || m === "v") continue;
          if (m === "C" || m === "u") {
            let sliced_3 = sliced_2.slice(idx + 1);
            let x = sliced_3.length > 0 ? sliced_3 : sliced[f + 1];
            l = sliced_3.length > 0 ? l : f + 1;
            if (m === "C" && x !== undefined) envChdirs.push(x);
            break;
          }
          S = true;
          break;
        }
        if (S) envUnmodeled ??= h;
      } else if (h.startsWith("-")) envUnmodeled ??= h;
    }
  }
  let d = new Set();
  for (let { name: f } of assignments) {
    let upper = f.toUpperCase();
    if (GIT_LOCATION_ENV_VARS.has(upper)) {
      if (d.has(upper))
        return {
          opaque: `${f} (assigned more than once)`,
        };
      d.add(upper);
    }
  }
  let c = [];
  for (let { name: f, value: h, fromOperand } of assignments) {
    let upper = f.toUpperCase();
    if (
      upper.startsWith("GIT_CONFIG") ||
      upper === "GIT_ALLOW_PROTOCOL" ||
      ((upper === "GIT_TEMPLATE_DIR" || upper === "ARGV0") && isGITemplateEnvStrict()) ||
      upper === "CDPATH" ||
      upper === "HOME" ||
      upper === "XDG_CONFIG_HOME"
    )
      return {
        opaque: f,
      };
    if (GIT_LOCATION_ENV_VARS.has(upper))
      c.push({
        name: f,
        value: h,
        fromOperand,
      });
  }
  return {
    assignments: c,
    envChdirs,
    envUnmodeled,
  };
}
//@ chunk-63f0f3kd.js:108070-108150 placement
/**
 * 参数里含占位符，或（在允许时）含通配符，说明值要到运行时才知道。
 */
function hasPlaceholderOrGlob(t, e, i, n) {
  let r = t[n] ?? "";
  let s = e ? e[n] === true : i;
  return containsAnyPlaceholder(r) || (s && firstGlobCharIndex(r) !== -1);
}
//@ chunk-63f0f3kd.js:108150-109575 placement
function checkGitGlobalOptions(argv, e, hasUnquotedGlob, argvUnquotedGlob) {
  let r = [];
  let s = [];
  let bare = false;
  let o = e + 1;
  let flagWithOverride = readFlagWithOverride(TENGU_GOLDEN_PANDA, {
    safe: true,
  });
  let l = argvUnquotedGlob?.length === argv.length ? argvUnquotedGlob : undefined;
  let d = isGITemplateEnvStrict();
  if (d && /^git-init(?:-db)?$/i.test(basename(argv[e]))) {
    let gitInitWord = findGitInitWord(argv, l, hasUnquotedGlob, e + 1);
    if (gitInitWord !== null) return gitInitWord;
  }
  while (o < argv.length) {
    let c = argv[o];
    if (c === "--") break;
    if (c === "-C") {
      let h = argv[o + 1];
      if (h === undefined) break;
      r.push(h);
      o += 2;
      continue;
    }
    if (c === "--bare") {
      bare = true;
      o += 1;
      continue;
    }
    let found = GIT_DIRECTORY_OPTIONS.find((h) => c === h || c.startsWith(`${h}=`));
    if (found !== undefined) {
      let h = c === found ? argv[o + 1] : c.slice(found.length + 1);
      if (h === undefined) break;
      s.push({
        flag: found,
        value: h,
      });
      o += c === found ? 2 : 1;
      continue;
    }
    if (c === "-c" || c === "--config-env" || c.startsWith("--config-env=")) {
      let h = c.startsWith("--config-env=");
      let b = h ? c.slice(13) : (argv[o + 1] ?? "");
      if (containsAnyPlaceholder(b))
        return {
          opaque: `${firstLineOf(c, "=")} <runtime-computed>`,
        };
      if (flagWithOverride && hasPlaceholderOrGlob(argv, l, hasUnquotedGlob, h ? o : o + 1))
        return {
          runtime: b,
        };
      if (d && (firstLineOf(b, "=").includes("{}") || b.startsWith("~")))
        return {
          runtime: b,
        };
      let lower = firstLineOf(b, "=").toLowerCase();
      if (isRepositoryRedirectingConfig(lower))
        return {
          opaque: `${firstLineOf(c, "=")} ${lower}`,
        };
      o += h ? 1 : 2;
      continue;
    }
    if (GIT_PASSTHROUGH_VALUE_OPTIONS.has(c)) {
      if (flagWithOverride && hasPlaceholderOrGlob(argv, l, hasUnquotedGlob, o + 1))
        return {
          runtime: argv[o + 1] ?? "",
        };
      if (d && (argv[o + 1] ?? "").includes("{}"))
        return {
          runtime: argv[o + 1] ?? "",
        };
      o += 2;
      continue;
    }
    if (flagWithOverride && hasPlaceholderOrGlob(argv, l, hasUnquotedGlob, o))
      return {
        runtime: c,
      };
    if (d && (c.includes("{}") || (e === 0 ? c.startsWith("~") : /^~[+\d-]/.test(c))))
      return {
        runtime: c,
      };
    if (c.startsWith("-")) {
      o += 1;
      continue;
    }
    if (d && /^init(?:-db)?(?:\.exe)*$/i.test(c)) {
      let gitInitWord = findGitInitWord(argv, l, hasUnquotedGlob, o + 1);
      if (gitInitWord !== null) return gitInitWord;
    }
    break;
  }
  if (d && e > 0)
    for (let c of argv.slice(e + 1)) {
      let f = expandGitLongOption(c);
      if (f !== undefined)
        return {
          initWord: c,
          initOption: f,
          behind: argv[0],
        };
    }
  return {
    chdirs: r,
    pins: s,
    bare,
  };
}
//@ chunk-63f0f3kd.js:109575-109870 placement
function isRepositoryRedirectingConfig(t) {
  return (
    t === "core.worktree" ||
    t === "core.bare" ||
    t.startsWith("include.") ||
    t.startsWith("includeif.") ||
    (isGITemplateEnvStrict() &&
      (t === "init.templatedir" ||
        t === "core.sharedrepository" ||
        t === "help.autocorrect" ||
        t.startsWith("alias."))) ||
    /^(?:protocol\.(?:\w+\.)?allow|core\.(?:sshcommand|gitproxy))$/.test(t)
  );
}
//@ chunk-63f0f3kd.js:109870-110062 placement
function resolveGuardPath(t, e, i, hasUnquotedGlob) {
  if (
    containsAnyPlaceholder(t) ||
    t.includes("{}") ||
    t.includes("\x00") ||
    isProcOrDevFdPath(t) ||
    isMacVolumesPath(t) ||
    hasDotSegment(t) ||
    (hasUnquotedGlob && firstGlobCharIndex(t) !== -1)
  )
    return null;
  if (i && !isAbsolute(t)) return null;
  let r = expandPath(t, e);
  if (isProcOrDevFdPath(r) || isMacVolumesPath(r)) return null;
  return r;
}
export { findDirectoryChangeIndex };
