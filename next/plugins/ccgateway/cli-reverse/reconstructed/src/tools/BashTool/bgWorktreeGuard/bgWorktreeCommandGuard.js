/**
 * tools/BashTool/bgWorktreeGuard/bgWorktreeCommandGuard.ts
 *
 * 2.1.316 新增：后台 worktree 守卫入口：检查命令是否会改变目录或越出 worktree，以及 git 全局选项。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h2y5xkdx.js (26)
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-h2y5xkdx.js:107826-115212 placement
/**
 * 后台 worktree 守卫入口（checkBgWorktreeCommandGuard）：会话隔离在 worktree 时，拒绝会把 git 操作指向主仓库（cd、GIT_DIR、-C、--git-dir 等）或无法证明留在 worktree 内的命令，并给出改写建议。
 */
function checkBgWorktreeCommandGuard(parsed, commandText, startCwd, worktreeDir) {
  {
    let { noun, possessive } = isolationSubjectWords(worktreeDir);
    let refuse = (what, remedy = `Run the equivalent from ${worktreeDir} without the redirect.`) =>
      `${noun} is isolated in the worktree ${worktreeDir}, but this command ${what}. Refusing to run it \u2014 ${possessive} git operations must target its own worktree. ${remedy}`;
    let splitHint = `Split it into plain, separate commands and run them from ${worktreeDir}.`;
    if (mentionsRsyncConnectProg(commandText, parsed))
      return refuse(
        "names RSYNC_CONNECT_PROG (in any letter case, possibly split by quotes, $ expansions, backticks, backslashes or brace lists), which is refused here even as a mere mention because rsync runs its value through the shell with the destination host spliced in, so what it runs cannot be shown not to be git",
        `Rewrite the command so that it does not spell RSYNC_CONNECT_PROG and run it from ${worktreeDir}; a transfer that needs that connection program belongs to a session that is not isolated to a worktree.`,
      );
    if (parsed.kind !== "simple") {
      if (isParseFailureNode(parsed) || parsed.tree === undefined)
        return refuse("is too complex to verify that it stays inside the worktree", splitHint);
      if (GIT_COMMAND_NAME_RE.test(commandText))
        return refuse(
          "names git in a form too complex to verify that it stays inside the worktree",
          splitHint,
        );
      let complexityReason = analyzeCommandForWorktree(parsed.tree);
      return complexityReason === null ? null : refuse(complexityReason, splitHint);
    }
    let commands = parsed.commands;
    let mapped = commands.map((command) => firstGitIndex(command.argv));
    let any = mapped.some((gitIndex) => gitIndex !== -1);
    let any_2 = commands.some((command) => hasDirectoryChange(command.argv));
    let any_3 = commands.some((command, cmdIdx) => {
      let gitLocationEnv = collectGitLocationEnv(command);
      if (!("opaque" in gitLocationEnv) && gitLocationEnv.envChdirs.length > 0) return true;
      let gitIdx = mapped[cmdIdx];
      if (gitIdx === -1) return false;
      let gitOptions = checkGitGlobalOptions(
        command.argv,
        gitIdx,
        command.hasUnquotedGlob,
        command.argvUnquotedGlob,
      );
      return (
        "chdirs" in gitOptions &&
        (gitOptions.chdirs.length > 0 || gitOptions.pins.length > 0 || gitOptions.bare)
      );
    });
    let hasGitFromHere = [];
    {
      let seenGit = false;
      for (let k = commands.length - 1; k >= 0; k--) {
        seenGit = seenGit || mapped[k] !== -1;
        hasGitFromHere[k] = seenGit;
      }
    }
    let currentDir = startCwd;
    let exportCounts = new Map();
    let exportedNames = new Set();
    for (let [cmdIdx, command] of commands.entries()) {
      let commandName = command.argv[0] ?? "";
      if (command.hasUnquotedGlob && firstGlobCharIndex(commandName) !== -1)
        return refuse(
          `spells its command as a glob (${commandName}) that bash resolves at runtime, so it can't be verified as anything but git`,
          `Spell the command name out literally and run it from ${worktreeDir}.`,
        );
      let launchReason = describeUnverifiableGitLaunch(command.argv);
      if (launchReason !== null)
        return refuse(launchReason, `Run git directly with literal arguments from ${worktreeDir}.`);
      let evalCommand = hasGitFromHere[cmdIdx]
        ? command.argv.find((arg, argIdx) => {
            let lower = basename(arg).toLowerCase();
            return lower === "." ? argIdx === 0 : EVAL_LIKE_COMMANDS.has(lower);
          })
        : undefined;
      if (evalCommand !== undefined)
        return refuse(
          `runs ${basename(evalCommand)} before a git command, whose string payload can't be verified to leave the worktree alone`,
          `Run the git command directly, without ${basename(evalCommand)}, from ${worktreeDir}.`,
        );
      let gitLocationEnv = collectGitLocationEnv(command);
      if ("opaque" in gitLocationEnv) {
        if (gitLocationEnv.opaque.toUpperCase() === "ARGV0")
          return refuse(
            `sets ${gitLocationEnv.opaque}, which changes the name git is started under, so the subcommand git would run can't be verified`,
            `Run it without ${gitLocationEnv.opaque} from ${worktreeDir}.`,
          );
        return refuse(
          `sets ${gitLocationEnv.opaque}, injecting git configuration whose effect on where git writes can't be verified`,
        );
      }
      if (gitLocationEnv.envUnmodeled !== null)
        return refuse(
          `runs env with ${gitLocationEnv.envUnmodeled}, whose effect on the command it wraps can't be verified`,
          `Run the command without that env flag from ${worktreeDir}.`,
        );
      let gitIdx = mapped[cmdIdx];
      let gitOptions =
        gitIdx === -1
          ? null
          : checkGitGlobalOptions(command.argv, gitIdx, command.hasUnquotedGlob, command.argvUnquotedGlob);
      if (gitOptions !== null && "runtime" in gitOptions) {
        if (gitOptions.runtime.includes("{}") && isGITemplateEnvStrict())
          return refuse(
            `has {} among the words right after git (${redactPlaceholdersForDisplay(gitOptions.runtime)}), which find -exec fills with a path name when the command runs, so the options git receives can't be verified`,
            `If git is only a search pattern there, search without find -exec (grep -rl git .); otherwise spell git's options and subcommand out literally and run it from ${worktreeDir}.`,
          );
        return refuse(
          `has a word at or before git's subcommand that the shell fills in only when the command runs (${redactPlaceholdersForDisplay(gitOptions.runtime)}), so the options git receives can't be verified`,
          `Spell git's options and subcommand out literally, quoting any pattern meant for git itself, and run it from ${worktreeDir}.`,
        );
      }
      if (gitOptions !== null && "initWord" in gitOptions) {
        let { initWord, initOption, behind } = gitOptions;
        let initWordText = redactPlaceholdersForDisplay(initWord);
        if (initOption === undefined)
          return refuse(
            `has a word after git init that is filled in only when the command runs (${initWordText}), so the options git init receives can't be verified`,
            `Spell the words after git init out literally (a full path rather than ~ or a variable, no glob pattern) and run it from ${worktreeDir}.`,
          );
        if (behind === undefined)
          return refuse(
            `passes ${initOption} to git init, an option that acts on the repository this worktree shares rather than on the worktree`,
            `Run git init without ${initOption} from ${worktreeDir}.`,
          );
        let behindText = redactPlaceholdersForDisplay(behind) || "''";
        return refuse(
          `has ${behindText} ahead of git and ${initWordText} after it. A program ahead of git may start git under the name git-init, which would read that word as init's ${initOption}, an option that acts on the repository this worktree shares rather than on the worktree`,
          `Drop ${initWordText}, or put git first if ${behindText} just runs git, and run it from ${worktreeDir}.`,
        );
      }
      if (gitOptions !== null && "opaque" in gitOptions)
        return refuse(
          `passes ${gitOptions.opaque} to git, injecting configuration whose effect on where git writes can't be verified`,
        );
      if (gitCommandIndices(command.argv).length > 1)
        return refuse(
          "names git more than once in a single command, which cannot be verified to stay inside the worktree",
          `Use one git invocation per command and run it from ${worktreeDir}.`,
        );
      let hasGit = gitIdx !== -1;
      let guardDir = currentDir;
      let hasEnvChdir = gitLocationEnv.envChdirs.length > 0;
      if (gitLocationEnv.envChdirs.length > 1)
        return refuse(
          "passes more than one -C/--chdir to env (last-wins semantics), which cannot be verified",
        );
      let envChdir = gitLocationEnv.envChdirs[0];
      if (envChdir !== undefined) {
        let guardPath = resolveGuardPath(envChdir, currentDir, false, command.hasUnquotedGlob);
        if (hasGit) {
          if (guardPath === null)
            return refuse(
              `changes directory via env to a location computed at runtime (${envChdir}) before running git`,
            );
          if (escapedSharedRoots(guardPath, worktreeDir))
            return refuse(
              `changes directory via env to the shared checkout (${envChdir}) before running git`,
            );
        }
        if (guardPath !== null) guardDir = guardPath;
      }
      for (let { name, value, fromOperand } of gitLocationEnv.assignments) {
        let upper = name.toUpperCase();
        if (!fromOperand && exportedNames.has(upper))
          return refuse(
            `re-assigns the exported ${name} with a per-command prefix, which can append onto the exported value at runtime`,
          );
        if (fromOperand && isDeclarationCommandArgv(command)) {
          if (exportedNames.has(upper))
            return refuse(
              `exports ${name} more than once across the command, which cannot be verified (a += append or double-export)`,
            );
          exportedNames.add(upper);
          exportCounts.set(name, (exportCounts.get(name) ?? 0) + 1);
        }
        let guardPath = resolveGuardPath(
          value,
          guardDir,
          any_2 || any_3 || hasEnvChdir,
          command.hasUnquotedGlob,
        );
        if (guardPath === null)
          return refuse(
            `sets ${name} to a location computed at runtime (${value}), which can't be verified before it runs`,
          );
        if (escapedSharedRoots(guardPath, worktreeDir))
          return refuse(`sets ${name} to the shared checkout (${value})`);
      }
      if (hasGitFromHere[cmdIdx] && hasDirectoryChange(command.argv)) {
        let cdTargetFromArgv = getCdTargetFromArgv(command.argv);
        let resolvedTarget =
          cdTargetFromArgv === undefined
            ? null
            : resolveGuardPath(cdTargetFromArgv, currentDir, false, command.hasUnquotedGlob);
        if (resolvedTarget === null)
          return refuse("changes directory to a location computed at runtime before running git");
        if (escapedSharedRoots(resolvedTarget, worktreeDir))
          return refuse(`changes directory to the shared checkout (${cdTargetFromArgv}) before running git`);
        currentDir = resolvedTarget;
      }
      if (gitOptions === null) continue;
      if ((gitOptions.chdirs.length || gitOptions.pins.length || gitOptions.bare) && command.hasUnquotedGlob)
        return refuse("redirects git through a glob pattern that expands at runtime");
      let filtered = gitOptions.chdirs.filter((chdir) => chdir !== "");
      let followPriorCd = any_2 || hasEnvChdir;
      let gitDir = guardDir;
      for (let chdir of filtered) {
        let guardPath = resolveGuardPath(chdir, gitDir, followPriorCd, command.hasUnquotedGlob);
        if (guardPath === null)
          return refuse(
            `points git at a directory computed at runtime (-C ${chdir}), which can't be verified before it runs`,
          );
        gitDir = guardPath;
      }
      let targets = [];
      if (filtered.length || hasEnvChdir)
        targets.push({
          flag: hasEnvChdir ? "env -C" : "-C",
          dir: gitDir,
        });
      if (gitOptions.bare)
        targets.push({
          flag: "--bare",
          dir: gitDir,
        });
      for (let { flag, value: pinValue } of gitOptions.pins) {
        let guardPath = resolveGuardPath(pinValue, gitDir, followPriorCd, command.hasUnquotedGlob);
        if (guardPath === null)
          return refuse(
            `points git at a repository computed at runtime (${flag} ${pinValue}), which can't be verified before it runs`,
          );
        targets.push({
          flag,
          dir: guardPath,
        });
      }
      for (let { flag, dir } of targets)
        if (escapedSharedRoots(dir, worktreeDir))
          return refuse(`redirects git to the shared checkout via ${flag}`);
    }
    if (
      any ||
      (commands.some((command) => setsGitConfigEnv(command.argv)) &&
        readFlagWithOverride(TENGU_RECURSIVE_GLADE, {
          safe: true,
        }))
    ) {
      let configEnvCounts = new Map();
      for (let bareAssignmentName of parsed.bareAssignmentNames)
        if (isGitConfigEnvVar(bareAssignmentName))
          configEnvCounts.set(bareAssignmentName, (configEnvCounts.get(bareAssignmentName) ?? 0) + 1);
      for (let [name, count] of configEnvCounts)
        if (count > (exportCounts.get(name) ?? 0)) {
          let reason = `assigns ${name}, which redirects git to a repository this guard cannot verify`;
          return !any && GIT_LOCATION_ENV_VARS.has(name.toUpperCase())
            ? refuse(
                reason,
                `Set ${name} where this guard can read its value, on the command that needs it (${name}=<value> <command>) or in an export (export ${name}=<value>), and run it from ${worktreeDir}.`,
              )
            : refuse(reason);
        }
    }
    let simpleReason = parsed.tree ? analyzeSimpleCommandForWorktree(parsed.tree) : null;
    if (simpleReason !== null) return refuse(simpleReason, `Run the plain command from ${worktreeDir}.`);
  }
  return null;
}
//@ chunk-h2y5xkdx.js:115212-115522 placement
/**
 * git 本身不处理、直接吃掉值的长选项（--namespace、--attr-source、--shallow-file），解析时跳过。
 */
var GIT_LOCATION_ENV_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GIT_PASSTHROUGH_VALUE_OPTIONS;
var GIT_DIRECTORY_OPTIONS;
var TENGU_GOLDEN_PANDA;
var TENGU_ZESTY_MUFFIN;
var GIT_INIT_LONG_OPTIONS;
deferInit("chunk-h2y5xkdx.js:115212", () => {
  GIT_LOCATION_ENV_VARS = new Set([
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_COMMON_DIR",
    "GIT_OBJECT_DIRECTORY",
    "GIT_INDEX_FILE",
    "GIT_SHALLOW_FILE",
  ]);
  GIT_PASSTHROUGH_VALUE_OPTIONS = new Set(["--namespace", "--attr-source", "--shallow-file"]);
  GIT_DIRECTORY_OPTIONS = ["--git-dir", "--work-tree"];
  TENGU_GOLDEN_PANDA = "tengu_golden_panda";
  TENGU_ZESTY_MUFFIN = "tengu_zesty_muffin";
  GIT_INIT_LONG_OPTIONS = ["--template", "--separate-git-dir", "--shared"];
});
//@ chunk-h2y5xkdx.js:115522-115560 placement
/**
 * 读取 tengu_zesty_muffin 开关：GIT_TEMPLATE_DIR、ARGV0 是否视为影响 git 仓库位置。
 */
function isGITemplateEnvStrict() {
  return readFlagWithOverride(TENGU_ZESTY_MUFFIN, {
    safe: true,
  });
}
//@ chunk-h2y5xkdx.js:115560-115666 placement
function expandGitLongOption(word) {
  let prefix = firstLineOf(word, "=");
  return prefix.length > 2 && prefix.startsWith("--")
    ? GIT_INIT_LONG_OPTIONS.find((option) => option.startsWith(prefix))
    : undefined;
}
//@ chunk-h2y5xkdx.js:115666-115842 placement
function findGitInitWord(argv, commandText, start, from) {
  for (let idx = from; idx < argv.length; idx++) {
    let word = argv[idx];
    let longOption = expandGitLongOption(word);
    if (
      longOption !== undefined ||
      hasPlaceholderOrGlob(argv, commandText, start, idx) ||
      word.startsWith("~") ||
      word.includes("{}")
    )
      return {
        initWord: word,
        initOption: longOption,
      };
  }
  return null;
}
//@ chunk-h2y5xkdx.js:115842-115911 placement
/**
 * 子序列匹配 RSYNC_CONNECT_PROG 时视为“可跨过”的字符（$ ` { , } 与反斜杠）。
 */
var TENGU_ENCHANTED_PEBBLE = "tengu_enchanted_pebble";
var RSYNC_CONNECT_PROG = "RSYNC_CONNECT_PROG";
var SUBSHELL_MARKER_CHARS = "$`{,}\\";
//@ chunk-h2y5xkdx.js:115911-116286 placement
/**
 * 用子序列匹配检测命令文本或参数中是否（可能被分隔地）出现 RSYNC_CONNECT_PROG，开关 tengu_enchanted_pebble 开启时才生效。
 */
function mentionsRsyncConnectProg(commandText, parsed) {
  let replaced = commandText.replace(/\\\n/g, "").replace(/['"]/g, "");
  let argvTexts =
    parsed.kind === "simple"
      ? parsed.commands.flatMap((command) => command.argv.map(deletePlaceholders))
      : [];
  let found = false;
  t: for (let text of [replaced, ...argvTexts]) {
    let carry = 0;
    let subshellCarry = 0;
    for (let char of text.toUpperCase()) {
      carry |= 1;
      let next = 0;
      for (let k = 0; k < RSYNC_CONNECT_PROG.length; k++)
        if ((((carry | subshellCarry) >> k) & 1) === 1 && char === RSYNC_CONNECT_PROG[k])
          next |= 1 << (k + 1);
      if (((next >> RSYNC_CONNECT_PROG.length) & 1) === 1) {
        found = true;
        break t;
      }
      if (SUBSHELL_MARKER_CHARS.includes(char)) subshellCarry |= carry;
      carry = next;
    }
  }
  return (
    found &&
    readFlagWithOverride(TENGU_ENCHANTED_PEBBLE, {
      safe: true,
    })
  );
}
//@ chunk-h2y5xkdx.js:116286-116403 placement
/**
 * 匹配 /dev/fd、/dev/stdin、/dev/stdout、/dev/stderr 路径。
 */
var PROC_SELF_PATH_PATTERN = /(^|[\\/])proc[\\/](self|thread-self|\d+)([\\/]|$)/i;
var DEV_FD_PATH_PATTERN = /(^|[\\/])dev[\\/](fd|stdin|stdout|stderr)([\\/]|$)/i;
//@ chunk-h2y5xkdx.js:116403-116520 placement
function isProcOrDevFdPath(path) {
  let replaced = path.replace(/[\\/]\.(?=[\\/]|$)/g, "");
  replaced = replaced.replace(/[\\/]{2,}/g, "/");
  return PROC_SELF_PATH_PATTERN.test(replaced) || DEV_FD_PATH_PATTERN.test(replaced);
}
//@ chunk-h2y5xkdx.js:116520-116782 placement
function isMacVolumesPath(path) {
  if (/^[\\/]System[\\/]Volumes[\\/]/i.test(path)) return true;
  if (/^[\\/]Volumes[\\/]/i.test(path)) return true;
  if (/(^|[\\/])proc[\\/]cygdrive([\\/]|$)/i.test(path)) return true;
  if (/^[\\/]\.\.[\\/]/.test(path)) return true;
  if (isUncOrDevicePath(path)) return true;
  if (path.includes("~")) return true;
  return false;
}
//@ chunk-h2y5xkdx.js:116782-117219 placement
/**
 * 可设置环境变量的命令集合（含 make，因为命令行变量会传给子进程）。
 */
var DIRECTORY_CHANGE_BUILTINS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ENV_SETTING_COMMANDS;
var DECLARATION_COMMANDS;
var ASSIGNMENT_OPERAND_RE;
var TENGU_RECURSIVE_GLADE;
var SHELL_DECLARE_BUILTINS;
var SHELL_OPTION_BUILTINS;
var SHELL_VAR_NAME_RE;
deferInit("chunk-h2y5xkdx.js:116782", () => {
  DIRECTORY_CHANGE_BUILTINS = new Set(["cd", "pushd", "popd", "chdir"]);
  ENV_SETTING_COMMANDS = new Set(["export", "declare", "typeset", "local", "readonly", "env", "make"]);
  DECLARATION_COMMANDS = new Set(["export", "declare", "typeset", "local", "readonly"]);
  ASSIGNMENT_OPERAND_RE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s;
  TENGU_RECURSIVE_GLADE = "tengu_recursive_glade";
  SHELL_DECLARE_BUILTINS = new Set([
    "export",
    "declare",
    "typeset",
    "local",
    "readonly",
    "integer",
    "float",
    "private",
  ]);
  SHELL_OPTION_BUILTINS = new Set(["set", "shopt", "setopt", "unsetopt", "emulate"]);
  SHELL_VAR_NAME_RE = /^([A-Za-z_][A-Za-z0-9_]*)(?:\+?=|$)/;
});
//@ chunk-h2y5xkdx.js:117219-117576 placement
/**
 * 判断 argv 中是否有 env/export 等命令设置了 git 配置相关环境变量（含占位符或 allexport 选项也视为是）。
 */
function setsGitConfigEnv(argv) {
  return argv.some((arg, idx) => {
    let lower = basename(arg).toLowerCase();
    if (SHELL_DECLARE_BUILTINS.has(lower))
      return argv.slice(idx + 1).some((operand) => {
        if (/^[-+]/.test(operand)) return false;
        let varName = SHELL_VAR_NAME_RE.exec(operand)?.[1];
        return varName === undefined || containsAnyPlaceholder(varName) || isGitConfigEnvVar(varName);
      });
    return (
      SHELL_OPTION_BUILTINS.has(lower) &&
      argv
        .slice(idx + 1)
        .some(
          (operand) =>
            containsAnyPlaceholder(operand) ||
            !/^[-+]?[A-Za-z0-9_=-]*$/.test(operand) ||
            operand.toLowerCase().replace(/[_-]/g, "").includes("allexport") ||
            /^[-+][^-]*a/.test(operand),
        )
    );
  });
}
//@ chunk-h2y5xkdx.js:117576-117778 placement
function isGitConfigEnvVar(name) {
  let upper = name.toUpperCase();
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
//@ chunk-h2y5xkdx.js:117778-117894 placement
/**
 * 会把字符串当命令执行的命令（eval 类，去掉 exec/nocorrect）。
 */
var ARG_FEEDING_PROGRAMS; // deferred: uses EVAL_LIKE_BUILTINS (../../../utils/bash/ast.js) of its import cycle while loading; runs once the cycle is complete
var EVAL_LIKE_COMMANDS;
var FIND_EXECDIR_OPTIONS;
deferInit("chunk-h2y5xkdx.js:117778", () => {
  ARG_FEEDING_PROGRAMS = new Set(["xargs", "parallel"]);
  EVAL_LIKE_COMMANDS = new Set(
    [...EVAL_LIKE_BUILTINS].filter((builtinName) => !EXEC_LIKE_COMMANDS.has(builtinName)),
  );
  FIND_EXECDIR_OPTIONS = new Set(["-execdir", "-okdir"]);
});
//@ chunk-h2y5xkdx.js:117894-118561 placement
/**
 * 判断 git 是否经由 xargs/parallel、find -execdir 或字符串执行器运行而无法确认其目标仓库，返回原因文本或 null。
 */
function describeUnverifiableGitLaunch(argv) {
  if (argv.length === 0) return null;
  let any = argv.some((arg) => GIT_COMMAND_PATTERN.test(basename(arg)));
  let hasCommand = (name) => argv.some((arg) => basename(arg).toLowerCase() === name);
  let found = argv.find((arg, idx) => {
    let lower = basename(arg).toLowerCase();
    return lower === "." ? idx === 0 : EVAL_LIKE_COMMANDS.has(lower);
  });
  if (any && argv.some((arg) => ARG_FEEDING_PROGRAMS.has(basename(arg).toLowerCase())))
    return "feeds git its arguments from stdin at runtime (xargs/parallel), so the repository it targets cannot be verified";
  if (any && hasCommand("find") && argv.some((arg) => FIND_EXECDIR_OPTIONS.has(arg)))
    return "changes directory per match (find -execdir/-okdir) before running git, so its repository cannot be verified";
  if (found !== undefined) {
    if (argv.filter((arg) => arg !== found).length > 0)
      return `runs a string through ${basename(found)}, which can't be verified to stay inside the worktree`;
  }
  return null;
}
//@ chunk-h2y5xkdx.js:118561-118622 placement
/**
 * argv 的命令是否为变量声明内建。
 */
function isDeclarationCommandArgv(command) {
  return DECLARATION_COMMANDS.has(basename(command.argv[0] ?? "").toLowerCase());
}
//@ chunk-h2y5xkdx.js:118622-118709 placement
function gitCommandIndices(argv) {
  let indices = [];
  for (let [idx, arg] of argv.entries()) if (GIT_COMMAND_PATTERN.test(basename(arg))) indices.push(idx);
  return indices;
}
//@ chunk-h2y5xkdx.js:118709-118780 placement
function firstGitIndex(argv) {
  return argv.findIndex((arg) => {
    let baseName = basename(arg);
    return GIT_COMMAND_PATTERN.test(baseName);
  });
}
//@ chunk-h2y5xkdx.js:118780-118794 placement
/**
 * 匹配命令名里含 git（git、git.exe 等）。
 */
var GIT_COMMAND_NAME_RE = /git/i;
//@ chunk-h2y5xkdx.js:118794-118957 placement
/**
 * 在 argv 中跳过前置包装命令，找到目录切换内建命令（cd/pushd 等）的下标，没有返回 -1。
 */
function findDirectoryChangeIndex(argv) {
  let idx = 0;
  while (idx < argv.length && COMMAND_PREFIX_WORDS.has(argv[idx].toLowerCase())) {
    idx += 1;
    while (idx < argv.length && argv[idx].startsWith("-")) idx += 1;
  }
  return DIRECTORY_CHANGE_BUILTINS.has((argv[idx] ?? "").toLowerCase()) ? idx : -1;
}
//@ chunk-h2y5xkdx.js:118957-118990 placement
/**
 * argv 中是否含目录切换内建。
 */
function hasDirectoryChange(argv) {
  return findDirectoryChangeIndex(argv) !== -1;
}
//@ chunk-h2y5xkdx.js:119432-120787 placement
/**
 * 收集命令前缀与 env 参数中影响 git 位置的环境变量赋值（GIT_DIR 等）与 env --chdir/-C 目录；出现 GIT_CONFIG*、HOME、CDPATH 等无法建模的变量时返回 opaque。
 */
function collectGitLocationEnv(command) {
  let gitIdx = firstGitIndex(command.argv);
  let startsWithEnvSetter = ENV_SETTING_COMMANDS.has(basename(command.argv[0] ?? "").toLowerCase());
  let scanEnd = gitIdx !== -1 ? gitIdx : startsWithEnvSetter ? command.argv.length : 0;
  let assignments = command.envVars.map((envVar) => ({
    ...envVar,
    fromOperand: false,
  }));
  let envChdirs = [];
  let sliced = command.argv.slice(1, scanEnd);
  let inEnv = basename(command.argv[0] ?? "").toLowerCase() === "env";
  let envUnmodeled = null;
  let chdirValueIdx = -1;
  for (let [idx, arg] of sliced.entries()) {
    if (basename(arg).toLowerCase() === "env") {
      inEnv = true;
      continue;
    }
    let match = ASSIGNMENT_OPERAND_RE.exec(arg);
    if (match) {
      assignments.push({
        name: match[1],
        value: match[2],
        fromOperand: true,
      });
      continue;
    }
    if (inEnv && idx !== chdirValueIdx && !arg.startsWith("-")) inEnv = false;
    if (inEnv) {
      if (arg === "--chdir") {
        let chdirValue = sliced[idx + 1];
        if (chdirValue !== undefined) {
          envChdirs.push(chdirValue);
          chdirValueIdx = idx + 1;
        }
      } else if (arg.startsWith("--chdir=")) envChdirs.push(arg.slice(8));
      else if (arg === "--ignore-environment") continue;
      else if (/^-[a-zA-Z]/.test(arg)) {
        let sliced_2 = arg.slice(1);
        let isUnmodeled = false;
        for (let k = 0; k < sliced_2.length; k++) {
          let flagChar = sliced_2[k];
          if (flagChar === "i" || flagChar === "v") continue;
          if (flagChar === "C" || flagChar === "u") {
            let sliced_3 = sliced_2.slice(k + 1);
            let flagValue = sliced_3.length > 0 ? sliced_3 : sliced[idx + 1];
            chdirValueIdx = sliced_3.length > 0 ? chdirValueIdx : idx + 1;
            if (flagChar === "C" && flagValue !== undefined) envChdirs.push(flagValue);
            break;
          }
          isUnmodeled = true;
          break;
        }
        if (isUnmodeled) envUnmodeled ??= arg;
      } else if (arg.startsWith("-")) envUnmodeled ??= arg;
    }
  }
  let seenLocationVars = new Set();
  for (let { name } of assignments) {
    let upper = name.toUpperCase();
    if (GIT_LOCATION_ENV_VARS.has(upper)) {
      if (seenLocationVars.has(upper))
        return {
          opaque: `${name} (assigned more than once)`,
        };
      seenLocationVars.add(upper);
    }
  }
  let locationAssignments = [];
  for (let { name, value, fromOperand } of assignments) {
    let upper = name.toUpperCase();
    if (
      upper.startsWith("GIT_CONFIG") ||
      upper === "GIT_ALLOW_PROTOCOL" ||
      ((upper === "GIT_TEMPLATE_DIR" || upper === "ARGV0") && isGITemplateEnvStrict()) ||
      upper === "CDPATH" ||
      upper === "HOME" ||
      upper === "XDG_CONFIG_HOME"
    )
      return {
        opaque: name,
      };
    if (GIT_LOCATION_ENV_VARS.has(upper))
      locationAssignments.push({
        name,
        value,
        fromOperand,
      });
  }
  return {
    assignments: locationAssignments,
    envChdirs,
    envUnmodeled,
  };
}
//@ chunk-h2y5xkdx.js:120787-120867 placement
/**
 * 参数里含占位符，或（在允许时）含通配符，说明值要到运行时才知道。
 */
function hasPlaceholderOrGlob(argv, unquotedGlobFlags, hasUnquotedGlob, idx) {
  let word = argv[idx] ?? "";
  let isGlobActive = unquotedGlobFlags ? unquotedGlobFlags[idx] === true : hasUnquotedGlob;
  return containsAnyPlaceholder(word) || (isGlobActive && firstGlobCharIndex(word) !== -1);
}
//@ chunk-h2y5xkdx.js:120867-122292 placement
function checkGitGlobalOptions(argv, gitIdx, start, argvUnquotedGlob) {
  let chdirs = [];
  let pins = [];
  let bare = false;
  let nextIdx = gitIdx + 1;
  let statfsEnabled = readFlagWithOverride(TENGU_GOLDEN_PANDA, {
    safe: true,
  });
  let unquotedGlobs = argvUnquotedGlob?.length === argv.length ? argvUnquotedGlob : undefined;
  let isTemplateStrict = isGITemplateEnvStrict();
  if (isTemplateStrict && /^git-init(?:-db)?$/i.test(basename(argv[gitIdx]))) {
    let gitInitWord = findGitInitWord(argv, unquotedGlobs, start, gitIdx + 1);
    if (gitInitWord !== null) return gitInitWord;
  }
  while (nextIdx < argv.length) {
    let arg = argv[nextIdx];
    if (arg === "--") break;
    if (arg === "-C") {
      let chdir = argv[nextIdx + 1];
      if (chdir === undefined) break;
      chdirs.push(chdir);
      nextIdx += 2;
      continue;
    }
    if (arg === "--bare") {
      bare = true;
      nextIdx += 1;
      continue;
    }
    let found = GIT_DIRECTORY_OPTIONS.find((option) => arg === option || arg.startsWith(`${option}=`));
    if (found !== undefined) {
      let pinValue = arg === found ? argv[nextIdx + 1] : arg.slice(found.length + 1);
      if (pinValue === undefined) break;
      pins.push({
        flag: found,
        value: pinValue,
      });
      nextIdx += arg === found ? 2 : 1;
      continue;
    }
    if (arg === "-c" || arg === "--config-env" || arg.startsWith("--config-env=")) {
      let isInlineConfigEnv = arg.startsWith("--config-env=");
      let configEntry = isInlineConfigEnv ? arg.slice(13) : (argv[nextIdx + 1] ?? "");
      if (containsAnyPlaceholder(configEntry))
        return {
          opaque: `${firstLineOf(arg, "=")} <runtime-computed>`,
        };
      if (
        statfsEnabled &&
        hasPlaceholderOrGlob(argv, unquotedGlobs, start, isInlineConfigEnv ? nextIdx : nextIdx + 1)
      )
        return {
          runtime: configEntry,
        };
      if (isTemplateStrict && (firstLineOf(configEntry, "=").includes("{}") || configEntry.startsWith("~")))
        return {
          runtime: configEntry,
        };
      let configName = firstLineOf(configEntry, "=").toLowerCase();
      if (isRepositoryRedirectingConfig(configName))
        return {
          opaque: `${firstLineOf(arg, "=")} ${configName}`,
        };
      nextIdx += isInlineConfigEnv ? 1 : 2;
      continue;
    }
    if (GIT_PASSTHROUGH_VALUE_OPTIONS.has(arg)) {
      if (statfsEnabled && hasPlaceholderOrGlob(argv, unquotedGlobs, start, nextIdx + 1))
        return {
          runtime: argv[nextIdx + 1] ?? "",
        };
      if (isTemplateStrict && (argv[nextIdx + 1] ?? "").includes("{}"))
        return {
          runtime: argv[nextIdx + 1] ?? "",
        };
      nextIdx += 2;
      continue;
    }
    if (statfsEnabled && hasPlaceholderOrGlob(argv, unquotedGlobs, start, nextIdx))
      return {
        runtime: arg,
      };
    if (
      isTemplateStrict &&
      (arg.includes("{}") || (gitIdx === 0 ? arg.startsWith("~") : /^~[+\d-]/.test(arg)))
    )
      return {
        runtime: arg,
      };
    if (arg.startsWith("-")) {
      nextIdx += 1;
      continue;
    }
    if (isTemplateStrict && /^init(?:-db)?(?:\.exe)*$/i.test(arg)) {
      let gitInitWord = findGitInitWord(argv, unquotedGlobs, start, nextIdx + 1);
      if (gitInitWord !== null) return gitInitWord;
    }
    break;
  }
  if (isTemplateStrict && gitIdx > 0)
    for (let trailingArg of argv.slice(gitIdx + 1)) {
      let option = expandGitLongOption(trailingArg);
      if (option !== undefined)
        return {
          initWord: trailingArg,
          initOption: option,
          behind: argv[0],
        };
    }
  return {
    chdirs,
    pins,
    bare,
  };
}
//@ chunk-h2y5xkdx.js:122292-122587 placement
function isRepositoryRedirectingConfig(configName) {
  return (
    configName === "core.worktree" ||
    configName === "core.bare" ||
    configName.startsWith("include.") ||
    configName.startsWith("includeif.") ||
    (isGITemplateEnvStrict() &&
      (configName === "init.templatedir" ||
        configName === "core.sharedrepository" ||
        configName === "help.autocorrect" ||
        configName.startsWith("alias."))) ||
    /^(?:protocol\.(?:\w+\.)?allow|core\.(?:sshcommand|gitproxy))$/.test(configName)
  );
}
//@ chunk-h2y5xkdx.js:122587-122779 placement
function resolveGuardPath(pathValue, baseDir, requireAbsolute, hasUnquotedGlob) {
  if (
    containsAnyPlaceholder(pathValue) ||
    pathValue.includes("{}") ||
    pathValue.includes("\x00") ||
    isProcOrDevFdPath(pathValue) ||
    isMacVolumesPath(pathValue) ||
    hasDotSegment(pathValue) ||
    (hasUnquotedGlob && firstGlobCharIndex(pathValue) !== -1)
  )
    return null;
  if (requireAbsolute && !isAbsolute(pathValue)) return null;
  let resolvedPath = expandPath(pathValue, baseDir);
  if (isProcOrDevFdPath(resolvedPath) || isMacVolumesPath(resolvedPath)) return null;
  return resolvedPath;
}
export { findDirectoryChangeIndex, checkBgWorktreeCommandGuard };
