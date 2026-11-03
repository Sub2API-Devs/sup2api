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
import { basename, basename as basename_2, isAbsolute } from "path";
import { isolationSubjectWords, ber } from "../../../utils/worktreeIsolation.js";
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
import { Qn, cl } from "../../../utils/pathClassification.js";
import { Ft, Fe } from "./commandTables.js";
import { expandPath } from "../../../utils/path.js";

/**
 * 后台 worktree 守卫入口（checkBgWorktreeCommandGuard）：会话隔离在 worktree 时，拒绝会把 git 操作指向主仓库（cd、GIT_DIR、-C、--git-dir 等）或无法证明留在 worktree 内的命令，并给出改写建议。
 */
//@ chunk-63f0f3kd.js:95112-102498 placement
function checkBgWorktreeCommandGuard(t, e, i, n) {
  {
    let { noun: noun, possessive: possessive } = isolationSubjectWords(n),
      a = (m, _ = `Run the equivalent from ${n} without the redirect.`) =>
        `${noun} is isolated in the worktree ${n}, but this command ${m}. Refusing to run it \u2014 ${possessive} git operations must target its own worktree. ${_}`,
      o = `Split it into plain, separate commands and run them from ${n}.`;
    if (mentionsRsyncConnectProg(e, t))
      return a(
        "names RSYNC_CONNECT_PROG (in any letter case, possibly split by quotes, $ expansions, backticks, backslashes or brace lists), which is refused here even as a mere mention because rsync runs its value through the shell with the destination host spliced in, so what it runs cannot be shown not to be git",
        `Rewrite the command so that it does not spell RSYNC_CONNECT_PROG and run it from ${n}; a transfer that needs that connection program belongs to a session that is not isolated to a worktree.`,
      );
    if (t.kind !== "simple") {
      if (isParseFailureNode(t) || t.tree === void 0)
        return a("is too complex to verify that it stays inside the worktree", o);
      if (Er.test(e))
        return a("names git in a form too complex to verify that it stays inside the worktree", o);
      let m = analyzeCommandForWorktree(t.tree);
      return m === null ? null : a(m, o);
    }
    let commands = t.commands,
      mapped = commands.map((m) => firstGitIndex(m.argv)),
      any = mapped.some((m) => m !== -1),
      any_2 = commands.some((m) => $s(m.argv)),
      any_3 = commands.some((m, _) => {
        let x = collectGitLocationEnv(m);
        if (!("opaque" in x) && x.envChdirs.length > 0) return !0;
        let T = mapped[_];
        if (T === -1) return !1;
        let G = checkGitGlobalOptions(m.argv, T, m.hasUnquotedGlob, m.argvUnquotedGlob);
        return "chdirs" in G && (G.chdirs.length > 0 || G.pins.length > 0 || G.bare);
      }),
      h = [];
    {
      let m = !1;
      for (let _ = commands.length - 1; _ >= 0; _--) ((m = m || mapped[_] !== -1), (h[_] = m));
    }
    let b = i,
      g = new Map(),
      S = new Set();
    for (let [m, _] of commands.entries()) {
      let x = _.argv[0] ?? "";
      if (_.hasUnquotedGlob && firstGlobCharIndex(x) !== -1)
        return a(
          `spells its command as a glob (${x}) that bash resolves at runtime, so it can't be verified as anything but git`,
          `Spell the command name out literally and run it from ${n}.`,
        );
      let T = describeUnverifiableGitLaunch(_.argv);
      if (T !== null) return a(T, `Run git directly with literal arguments from ${n}.`);
      let G = h[m]
        ? _.argv.find((E, A) => {
            let lower = basename(E).toLowerCase();
            return lower === "." ? A === 0 : As.has(lower);
          })
        : void 0;
      if (G !== void 0)
        return a(
          `runs ${basename(G)} before a git command, whose string payload can't be verified to leave the worktree alone`,
          `Run the git command directly, without ${basename(G)}, from ${n}.`,
        );
      let D = collectGitLocationEnv(_);
      if ("opaque" in D) {
        if (D.opaque.toUpperCase() === "ARGV0")
          return a(
            `sets ${D.opaque}, which changes the name git is started under, so the subcommand git would run can't be verified`,
            `Run it without ${D.opaque} from ${n}.`,
          );
        return a(
          `sets ${D.opaque}, injecting git configuration whose effect on where git writes can't be verified`,
        );
      }
      if (D.envUnmodeled !== null)
        return a(
          `runs env with ${D.envUnmodeled}, whose effect on the command it wraps can't be verified`,
          `Run the command without that env flag from ${n}.`,
        );
      let N = mapped[m],
        y = N === -1 ? null : checkGitGlobalOptions(_.argv, N, _.hasUnquotedGlob, _.argvUnquotedGlob);
      if (y !== null && "runtime" in y) {
        if (y.runtime.includes("{}") && ne())
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
        let { initWord: initWord, initOption: initOption, behind: behind } = y,
          U = redactPlaceholdersForDisplay(initWord);
        if (initOption === void 0)
          return a(
            `has a word after git init that is filled in only when the command runs (${U}), so the options git init receives can't be verified`,
            `Spell the words after git init out literally (a full path rather than ~ or a variable, no glob pattern) and run it from ${n}.`,
          );
        if (behind === void 0)
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
      if (gitCommandIndices(_.argv).length > 1)
        return a(
          "names git more than once in a single command, which cannot be verified to stay inside the worktree",
          `Use one git invocation per command and run it from ${n}.`,
        );
      let z = N !== -1,
        R = b,
        O = D.envChdirs.length > 0;
      if (D.envChdirs.length > 1)
        return a("passes more than one -C/--chdir to env (last-wins semantics), which cannot be verified");
      let Y = D.envChdirs[0];
      if (Y !== void 0) {
        let E = resolveGuardPath(Y, b, !1, _.hasUnquotedGlob);
        if (z) {
          if (E === null)
            return a(`changes directory via env to a location computed at runtime (${Y}) before running git`);
          if (ber(E, n))
            return a(`changes directory via env to the shared checkout (${Y}) before running git`);
        }
        if (E !== null) R = E;
      }
      for (let { name: E, value: A, fromOperand: fromOperand } of D.assignments) {
        let upper = E.toUpperCase();
        if (!fromOperand && S.has(upper))
          return a(
            `re-assigns the exported ${E} with a per-command prefix, which can append onto the exported value at runtime`,
          );
        if (fromOperand && wr(_)) {
          if (S.has(upper))
            return a(
              `exports ${E} more than once across the command, which cannot be verified (a += append or double-export)`,
            );
          (S.add(upper), g.set(E, (g.get(E) ?? 0) + 1));
        }
        let ut = resolveGuardPath(A, R, any_2 || any_3 || O, _.hasUnquotedGlob);
        if (ut === null)
          return a(
            `sets ${E} to a location computed at runtime (${A}), which can't be verified before it runs`,
          );
        if (ber(ut, n)) return a(`sets ${E} to the shared checkout (${A})`);
      }
      if (h[m] && $s(_.argv)) {
        let E = getCdTargetFromArgv(_.argv),
          A = E === void 0 ? null : resolveGuardPath(E, b, !1, _.hasUnquotedGlob);
        if (A === null) return a("changes directory to a location computed at runtime before running git");
        if (ber(A, n)) return a(`changes directory to the shared checkout (${E}) before running git`);
        b = A;
      }
      if (y === null) continue;
      if ((y.chdirs.length || y.pins.length || y.bare) && _.hasUnquotedGlob)
        return a("redirects git through a glob pattern that expands at runtime");
      let filtered = y.chdirs.filter((chdir) => chdir !== ""),
        Et = any_2 || O,
        it = R;
      for (let E of filtered) {
        let A = resolveGuardPath(E, it, Et, _.hasUnquotedGlob);
        if (A === null)
          return a(
            `points git at a directory computed at runtime (-C ${E}), which can't be verified before it runs`,
          );
        it = A;
      }
      let _t = [];
      if (filtered.length || O) _t.push({ flag: O ? "env -C" : "-C", dir: it });
      if (y.bare) _t.push({ flag: "--bare", dir: it });
      for (let { flag: flag, value: A } of y.pins) {
        let L = resolveGuardPath(A, it, Et, _.hasUnquotedGlob);
        if (L === null)
          return a(
            `points git at a repository computed at runtime (${flag} ${A}), which can't be verified before it runs`,
          );
        _t.push({ flag: flag, dir: L });
      }
      for (let { flag: flag, dir: dir } of _t)
        if (ber(dir, n)) return a(`redirects git to the shared checkout via ${flag}`);
    }
    if (
      any ||
      (commands.some((m) => setsGitConfigEnv(m.argv)) &&
        readFlagWithOverride(TENGU_RECURSIVE_GLADE, { safe: !0 }))
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
var GIT_LOCATION_ENV_VARS = new Set([
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_COMMON_DIR",
    "GIT_OBJECT_DIRECTORY",
    "GIT_INDEX_FILE",
    "GIT_SHALLOW_FILE",
  ]),
  Qi = new Set(["--namespace", "--attr-source", "--shallow-file"]),
  tr = ["--git-dir", "--work-tree"],
  TENGU_GOLDEN_PANDA = "tengu_golden_panda",
  TENGU_ZESTY_MUFFIN = "tengu_zesty_muffin",
  sr = ["--template", "--separate-git-dir", "--shared"];
//@ chunk-63f0f3kd.js:102808-102846 placement
function ne() {
  return readFlagWithOverride(TENGU_ZESTY_MUFFIN, { safe: !0 });
}
//@ chunk-63f0f3kd.js:102846-102952 placement
function expandGitLongOption(t) {
  let e = firstLineOf(t, "=");
  return e.length > 2 && e.startsWith("--") ? sr.find((i) => i.startsWith(e)) : void 0;
}
//@ chunk-63f0f3kd.js:102952-103128 placement
function findGitInitWord(t, e, i, n) {
  for (let r = n; r < t.length; r++) {
    let s = t[r],
      a = expandGitLongOption(s);
    if (a !== void 0 || be(t, e, i, r) || s.startsWith("~") || s.includes("{}"))
      return { initWord: s, initOption: a };
  }
  return null;
}
//@ chunk-63f0f3kd.js:103128-103197 placement
var TENGU_ENCHANTED_PEBBLE = "tengu_enchanted_pebble",
  RSYNC_CONNECT_PROG = "RSYNC_CONNECT_PROG",
  rr = "$`{,}\\";
/**
 * 用子序列匹配检测命令文本或参数中是否（可能被分隔地）出现 RSYNC_CONNECT_PROG，开关 tengu_enchanted_pebble 开启时才生效。
 */
//@ chunk-63f0f3kd.js:103197-103572 placement
function mentionsRsyncConnectProg(t, e) {
  let replaced = t.replace(/\\\n/g, "").replace(/['"]/g, ""),
    n = e.kind === "simple" ? e.commands.flatMap((command) => command.argv.map(deletePlaceholders)) : [],
    r = !1;
  t: for (let s of [replaced, ...n]) {
    let a = 0,
      o = 0;
    for (let u of s.toUpperCase()) {
      a |= 1;
      let l = 0;
      for (let d = 0; d < RSYNC_CONNECT_PROG.length; d++)
        if ((((a | o) >> d) & 1) === 1 && u === RSYNC_CONNECT_PROG[d]) l |= 1 << (d + 1);
      if (((l >> RSYNC_CONNECT_PROG.length) & 1) === 1) {
        r = !0;
        break t;
      }
      if (rr.includes(u)) o |= a;
      a = l;
    }
  }
  return r && readFlagWithOverride(TENGU_ENCHANTED_PEBBLE, { safe: !0 });
}
//@ chunk-63f0f3kd.js:103572-103689 placement
var PROC_SELF_PATH_PATTERN = /(^|[\\/])proc[\\/](self|thread-self|\d+)([\\/]|$)/i,
  lr = /(^|[\\/])dev[\\/](fd|stdin|stdout|stderr)([\\/]|$)/i;
//@ chunk-63f0f3kd.js:103689-103806 placement
function isProcOrDevFdPath(t) {
  let replaced = t.replace(/[\\/]\.(?=[\\/]|$)/g, "");
  return (
    (replaced = replaced.replace(/[\\/]{2,}/g, "/")),
    PROC_SELF_PATH_PATTERN.test(replaced) || lr.test(replaced)
  );
}
//@ chunk-63f0f3kd.js:103806-104068 placement
function isMacVolumesPath(t) {
  if (/^[\\/]System[\\/]Volumes[\\/]/i.test(t)) return !0;
  if (/^[\\/]Volumes[\\/]/i.test(t)) return !0;
  if (/(^|[\\/])proc[\\/]cygdrive([\\/]|$)/i.test(t)) return !0;
  if (/^[\\/]\.\.[\\/]/.test(t)) return !0;
  if (Qn(t)) return !0;
  if (t.includes("~")) return !0;
  return !1;
}
//@ chunk-63f0f3kd.js:104068-104505 placement
var DIRECTORY_CHANGE_BUILTINS = new Set(["cd", "pushd", "popd", "chdir"]),
  cr = new Set(["export", "declare", "typeset", "local", "readonly", "env", "make"]),
  dr = new Set(["export", "declare", "typeset", "local", "readonly"]),
  fr = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s,
  TENGU_RECURSIVE_GLADE = "tengu_recursive_glade",
  pr = new Set(["export", "declare", "typeset", "local", "readonly", "integer", "float", "private"]),
  mr = new Set(["set", "shopt", "setopt", "unsetopt", "emulate"]),
  gr = /^([A-Za-z_][A-Za-z0-9_]*)(?:\+?=|$)/;
/**
 * 判断 argv 中是否有 env/export 等命令设置了 git 配置相关环境变量（含占位符或 allexport 选项也视为是）。
 */
//@ chunk-63f0f3kd.js:104505-104862 placement
function setsGitConfigEnv(t) {
  return t.some((e, i) => {
    let lower = basename(e).toLowerCase();
    if (pr.has(lower))
      return t.slice(i + 1).some((r) => {
        if (/^[-+]/.test(r)) return !1;
        let s = gr.exec(r)?.[1];
        return s === void 0 || containsAnyPlaceholder(s) || isGitConfigEnvVar(s);
      });
    return (
      mr.has(lower) &&
      t
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
    ((upper === "GIT_TEMPLATE_DIR" || upper === "ARGV0") && ne()) ||
    upper === "HOME" ||
    upper === "CDPATH" ||
    upper === "XDG_CONFIG_HOME"
  );
}
//@ chunk-63f0f3kd.js:105064-105180 placement
var ARG_FEEDING_PROGRAMS = new Set(["xargs", "parallel"]),
  As = new Set([...EVAL_LIKE_BUILTINS].filter((t) => !Ft.has(t))),
  xr = new Set(["-execdir", "-okdir"]);
/**
 * 判断 git 是否经由 xargs/parallel、find -execdir 或字符串执行器运行而无法确认其目标仓库，返回原因文本或 null。
 */
//@ chunk-63f0f3kd.js:105180-105846 placement
function describeUnverifiableGitLaunch(t) {
  if (t.length === 0) return null;
  let any = t.some((r) => GIT_COMMAND_PATTERN.test(basename(r))),
    i = (r) => t.some((s) => basename(s).toLowerCase() === r),
    found = t.find((r, s) => {
      let lower = basename(r).toLowerCase();
      return lower === "." ? s === 0 : As.has(lower);
    });
  if (any && t.some((r) => ARG_FEEDING_PROGRAMS.has(basename(r).toLowerCase())))
    return "feeds git its arguments from stdin at runtime (xargs/parallel), so the repository it targets cannot be verified";
  if (any && i("find") && t.some((r) => xr.has(r)))
    return "changes directory per match (find -execdir/-okdir) before running git, so its repository cannot be verified";
  if (found !== void 0) {
    if (t.filter((s) => s !== found).length > 0)
      return `runs a string through ${basename(found)}, which can't be verified to stay inside the worktree`;
  }
  return null;
}
//@ chunk-63f0f3kd.js:105846-105907 placement
function wr(t) {
  return dr.has(basename(t.argv[0] ?? "").toLowerCase());
}
//@ chunk-63f0f3kd.js:105907-105993 placement
function gitCommandIndices(t) {
  let e = [];
  for (let [i, n] of t.entries()) if (GIT_COMMAND_PATTERN.test(basename(n))) e.push(i);
  return e;
}
//@ chunk-63f0f3kd.js:105993-106063 placement
function firstGitIndex(t) {
  return t.findIndex((e) => {
    let i = basename(e);
    return GIT_COMMAND_PATTERN.test(i);
  });
}
//@ chunk-63f0f3kd.js:106063-106077 placement
var Er = /git/i;
/**
 * 在 argv 中跳过前置包装命令，找到目录切换内建命令（cd/pushd 等）的下标，没有返回 -1。
 */
//@ chunk-63f0f3kd.js:106077-106240 placement
function findDirectoryChangeIndex(t) {
  let e = 0;
  while (e < t.length && Fe.has(t[e].toLowerCase())) {
    e += 1;
    while (e < t.length && t[e].startsWith("-")) e += 1;
  }
  return DIRECTORY_CHANGE_BUILTINS.has((t[e] ?? "").toLowerCase()) ? e : -1;
}
//@ chunk-63f0f3kd.js:106240-106273 placement
function $s(t) {
  return findDirectoryChangeIndex(t) !== -1;
}
/**
 * 收集命令前缀与 env 参数中影响 git 位置的环境变量赋值（GIT_DIR 等）与 env --chdir/-C 目录；出现 GIT_CONFIG*、HOME、CDPATH 等无法建模的变量时返回 opaque。
 */
//@ chunk-63f0f3kd.js:106715-108070 placement
function collectGitLocationEnv(command) {
  let e = firstGitIndex(command.argv),
    i = cr.has(basename(command.argv[0] ?? "").toLowerCase()),
    n = e !== -1 ? e : i ? command.argv.length : 0,
    assignments = command.envVars.map((envVar) => ({ ...envVar, fromOperand: !1 })),
    envChdirs = [],
    sliced = command.argv.slice(1, n),
    inEnv = basename(command.argv[0] ?? "").toLowerCase() === "env",
    envUnmodeled = null,
    l = -1;
  for (let [f, h] of sliced.entries()) {
    if (basename(h).toLowerCase() === "env") {
      inEnv = !0;
      continue;
    }
    let match = fr.exec(h);
    if (match) {
      assignments.push({ name: match[1], value: match[2], fromOperand: !0 });
      continue;
    }
    if (inEnv && f !== l && !h.startsWith("-")) inEnv = !1;
    if (inEnv) {
      if (h === "--chdir") {
        let g = sliced[f + 1];
        if (g !== void 0) (envChdirs.push(g), (l = f + 1));
      } else if (h.startsWith("--chdir=")) envChdirs.push(h.slice(8));
      else if (h === "--ignore-environment") continue;
      else if (/^-[a-zA-Z]/.test(h)) {
        let sliced_2 = h.slice(1),
          S = !1;
        for (let p = 0; p < sliced_2.length; p++) {
          let m = sliced_2[p];
          if (m === "i" || m === "v") continue;
          if (m === "C" || m === "u") {
            let sliced_3 = sliced_2.slice(p + 1),
              x = sliced_3.length > 0 ? sliced_3 : sliced[f + 1];
            if (((l = sliced_3.length > 0 ? l : f + 1), m === "C" && x !== void 0)) envChdirs.push(x);
            break;
          }
          S = !0;
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
      if (d.has(upper)) return { opaque: `${f} (assigned more than once)` };
      d.add(upper);
    }
  }
  let c = [];
  for (let { name: f, value: h, fromOperand: fromOperand } of assignments) {
    let upper = f.toUpperCase();
    if (
      upper.startsWith("GIT_CONFIG") ||
      upper === "GIT_ALLOW_PROTOCOL" ||
      ((upper === "GIT_TEMPLATE_DIR" || upper === "ARGV0") && ne()) ||
      upper === "CDPATH" ||
      upper === "HOME" ||
      upper === "XDG_CONFIG_HOME"
    )
      return { opaque: f };
    if (GIT_LOCATION_ENV_VARS.has(upper)) c.push({ name: f, value: h, fromOperand: fromOperand });
  }
  return { assignments: c, envChdirs: envChdirs, envUnmodeled: envUnmodeled };
}
//@ chunk-63f0f3kd.js:108070-108150 placement
function be(t, e, i, n) {
  let r = t[n] ?? "",
    s = e ? e[n] === !0 : i;
  return containsAnyPlaceholder(r) || (s && firstGlobCharIndex(r) !== -1);
}
//@ chunk-63f0f3kd.js:108150-109575 placement
function checkGitGlobalOptions(t, e, i, n) {
  let r = [],
    s = [],
    a = !1,
    o = e + 1,
    u = readFlagWithOverride(TENGU_GOLDEN_PANDA, { safe: !0 }),
    l = n?.length === t.length ? n : void 0,
    d = ne();
  if (d && /^git-init(?:-db)?$/i.test(basename(t[e]))) {
    let c = findGitInitWord(t, l, i, e + 1);
    if (c !== null) return c;
  }
  while (o < t.length) {
    let c = t[o];
    if (c === "--") break;
    if (c === "-C") {
      let h = t[o + 1];
      if (h === void 0) break;
      (r.push(h), (o += 2));
      continue;
    }
    if (c === "--bare") {
      ((a = !0), (o += 1));
      continue;
    }
    let found = tr.find((h) => c === h || c.startsWith(`${h}=`));
    if (found !== void 0) {
      let h = c === found ? t[o + 1] : c.slice(found.length + 1);
      if (h === void 0) break;
      (s.push({ flag: found, value: h }), (o += c === found ? 2 : 1));
      continue;
    }
    if (c === "-c" || c === "--config-env" || c.startsWith("--config-env=")) {
      let startsWith = c.startsWith("--config-env="),
        b = startsWith ? c.slice(13) : (t[o + 1] ?? "");
      if (containsAnyPlaceholder(b)) return { opaque: `${firstLineOf(c, "=")} <runtime-computed>` };
      if (u && be(t, l, i, startsWith ? o : o + 1)) return { runtime: b };
      if (d && (firstLineOf(b, "=").includes("{}") || b.startsWith("~"))) return { runtime: b };
      let lower = firstLineOf(b, "=").toLowerCase();
      if (isRepositoryRedirectingConfig(lower)) return { opaque: `${firstLineOf(c, "=")} ${lower}` };
      o += startsWith ? 1 : 2;
      continue;
    }
    if (Qi.has(c)) {
      if (u && be(t, l, i, o + 1)) return { runtime: t[o + 1] ?? "" };
      if (d && (t[o + 1] ?? "").includes("{}")) return { runtime: t[o + 1] ?? "" };
      o += 2;
      continue;
    }
    if (u && be(t, l, i, o)) return { runtime: c };
    if (d && (c.includes("{}") || (e === 0 ? c.startsWith("~") : /^~[+\d-]/.test(c)))) return { runtime: c };
    if (c.startsWith("-")) {
      o += 1;
      continue;
    }
    if (d && /^init(?:-db)?(?:\.exe)*$/i.test(c)) {
      let h = findGitInitWord(t, l, i, o + 1);
      if (h !== null) return h;
    }
    break;
  }
  if (d && e > 0)
    for (let c of t.slice(e + 1)) {
      let f = expandGitLongOption(c);
      if (f !== void 0) return { initWord: c, initOption: f, behind: t[0] };
    }
  return { chdirs: r, pins: s, bare: a };
}
//@ chunk-63f0f3kd.js:109575-109870 placement
function isRepositoryRedirectingConfig(t) {
  return (
    t === "core.worktree" ||
    t === "core.bare" ||
    t.startsWith("include.") ||
    t.startsWith("includeif.") ||
    (ne() &&
      (t === "init.templatedir" ||
        t === "core.sharedrepository" ||
        t === "help.autocorrect" ||
        t.startsWith("alias."))) ||
    /^(?:protocol\.(?:\w+\.)?allow|core\.(?:sshcommand|gitproxy))$/.test(t)
  );
}
//@ chunk-63f0f3kd.js:109870-110062 placement
function resolveGuardPath(t, e, i, n) {
  if (
    containsAnyPlaceholder(t) ||
    t.includes("{}") ||
    t.includes("\x00") ||
    isProcOrDevFdPath(t) ||
    isMacVolumesPath(t) ||
    cl(t) ||
    (n && firstGlobCharIndex(t) !== -1)
  )
    return null;
  if (i && !isAbsolute(t)) return null;
  let r = expandPath(t, e);
  if (isProcOrDevFdPath(r) || isMacVolumesPath(r)) return null;
  return r;
}

export { findDirectoryChangeIndex };
