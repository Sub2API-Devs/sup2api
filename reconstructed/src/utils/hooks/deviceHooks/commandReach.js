/**
 * utils/hooks/deviceHooks/commandReach.ts
 *
 * 2.1.316 新增：设备钩子命令可达路径分析与执行判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mthxbav8.js (79)
 * attribution: placement 79
 */
import { posix, posix as posix_2, isAbsolute, isAbsolute as isAbsolute_2 } from "path";
import { realpath, realpath as realpath_2 } from "fs/promises";
import { isAbsolutePlatformPath, normalizeCommandForPlatform } from "../../git.js";
import { logForDebugging } from "../../debug.js";
import { POSIX_SEP, K$e, D4e, M2, readShebang as readShebang_2 } from "../hookCommandAnalysis.js";
import {
  commandBaseName,
  isPlainArgument,
  isLauncherCommand,
  isAnchoredPath,
  normalizeInterpreterName,
  isPathWord,
  $i,
  ko,
  Me,
  sn,
  isKnownInterpreter,
  isAbsoluteLike,
  nt,
  Ii,
  parseShellWords,
  Ni,
  isEvalFlag,
  parseShellCommands,
  wo,
  splitQuotedWords,
  isToolEnvVar,
  Ci,
  _o,
  xo,
  Mi,
  PYTHON_IMPORT_PATTERN,
  Di,
  pathPrefixes,
  CWD_DEPENDENCE_PATTERN,
  Hi,
  Oi,
  shellComments,
} from "./shellReader.js";
import { kwe } from "../../bash/parser.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { tildeOperandAt } from "../../bash/shellQuote.js";
import { firstLineOf, urlPatternToRegex } from "../../stringUtils.js";
import { uniq } from "../../collections.js";
import { Zt } from "./vouching.js";
import { BUILD_TOOL_ENV_VARS } from "../../git/builderGit/gitEnv.js";
import { Kt } from "./runDeviceHook.js";
import { jsonStringify } from "../../slowOperations.js";
import {
  resolveForeignSpellingAsync,
  classifyPathSpelling_2,
  spellingsToCheck,
} from "../../permissions/protectedEnvAndGitPaths.js";
import { protectedHomeRoots } from "../../permissions/protectedSettingsPaths.js";
import { getPlatform } from "../../platform.js";
import { HOOK_EVENTS } from "../../../entrypoints/sdk/coreSchemas.js";
import { xqs, isSuspiciousHardLinkedFile, Pqs } from "../hookCommandResolution.js";
import { hee, BZs, WZs, znt, qVe, isMatcherSubset } from "../hookEventSets.js";
import { He, classifyDeviceHookReach } from "./_new/classifyDeviceHookReach.js";
import { sanitizeDisplayText } from "../../resultError.js";
import { findTemplateByDigest, hookTemplateIds, getHookTemplate, alwaysTrue } from "../hookTemplates.js";
import { TOOL_HOOK_EVENTS } from "../hookEvents.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../../tools/FileReadTool/constants.js";
import { formatDeviceHookId, parseDeviceHookId } from "../deviceHookId.js";
import { Cye, PTe } from "../../../services/remoteTools/toolHostAttestation.js";
import { getGlobalClaudeFile, env } from "../../env.js";
import { getAppliedGlobalConfigEnv, settingsEnvForHookChild } from "../../managedEnvApply.js";
import { getSettingsForSource } from "../../settings/settings.js";
import { m_ } from "../../settings/stickyRoots.js";
import { SETTING_SOURCES, REPO_DIR_SETTING_SOURCES } from "../../settings/constants.js";
import { getProjectConfigRoot } from "../../../bootstrap/state.js";
import {
  isViolinWoodEnabledCached,
  isViolinAmatiEnabledCached,
} from "../../../services/analytics/violinGates.js";
import {
  isViolinWillowEnabledCached,
  VIOLIN_WILLOW_FLAG,
} from "../../../services/analytics/violinWillowGate.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { hasFreshGrowthBookFeatures } from "../../../services/analytics/growthbook.js";

//@ chunk-mthxbav8.js:3489-3523 placement
var REMOTE_ROOT_RE = /^[a-z_]{2,}:\[?[^/]*\]?$/;
/**
 * 设备 hook 命令可达的根目录
 */
//@ chunk-mthxbav8.js:3523-3966 placement
function commandReachRoots(e) {
  let filtered = [
      e.launchDirReal,
      e.launchDir,
      ...(e.sync !== void 0 ? [e.sync.rootReal, ...(e.sync.root !== void 0 ? [e.sync.root] : [])] : []),
      ...e.extraReach,
    ].filter((u) => !REMOTE_ROOT_RE.test(u)),
    found = filtered.find((u) => !isAbsolutePlatformPath(u));
  if (found !== void 0)
    return (
      logForDebugging(
        `[deviceHooks] reach: a root that is not an absolute path (${JSON.stringify(found)}) \u2014 everything on this machine counts as in the cloud session's reach`,
        { level: "warn" },
      ),
      [POSIX_SEP]
    );
  return filtered.map((u) => normalizeCommandForPlatform(u.replace(/\/+$/, "")) || "/");
}
//@ chunk-mthxbav8.js:3966-4035 placement
function reachesEverything(e, n) {
  return (e.length === 1 && e[0] === POSIX_SEP) || n.some((r) => !isAbsolutePlatformPath(r));
}
//@ chunk-mthxbav8.js:4035-4119 placement
function commandReachesPath(e, n) {
  let r = commandReachRoots(n);
  return reachesEverything(r, e) || e.some((s) => r.some((u) => K$e(u, normalizeCommandForPlatform(s))));
}
//@ chunk-mthxbav8.js:4119-4203 placement
function pathWithinReach(e, n) {
  let r = commandReachRoots(n);
  return reachesEverything(r, e) || e.some((s) => r.some((u) => K$e(normalizeCommandForPlatform(s), u)));
}
/**
 * 分析一条 shell 命令（程序、参数、重定向、heredoc、管道）会读写或执行哪些路径，用于判定设备钩子能否在本机执行。
 */
//@ chunk-mthxbav8.js:75510-86063 placement
function analyzeCommandReach(
  {
    program: program,
    args: args,
    assignments: assignments,
    redirects: redirects,
    heredoc: heredoc,
    piped: piped,
  },
  w,
  h = {
    roots: [],
    home: "",
    fromPayload: !1,
    quotedBackslashKept: !0,
    zshNullCommandHeld: !0,
    rubyAttachedPattern: !0,
    forNameDo: !0,
    runsTextHeld: !0,
    substitutionHeredocs: !0,
  },
) {
  let index = assignments.findIndex((D) => commandBaseName(D) === "flock"),
    R = index === -1 ? void 0 : findSubcommandArg(assignments, index),
    j = [
      ...assignments.filter((D, G) => G !== R?.at),
      ...(/^(?:export|declare|typeset|local|readonly)$/.test(program.text) ? args : []),
    ],
    M = analyzeAssignments(j, h.shell === "zsh", h.zshNullCommandHeld, Te(h));
  if (M !== void 0 && h.standing === void 0) return M;
  let found = assignments.find((D) => isUnderRoots(D, h));
  if (found !== void 0) return "it names " + found.text;
  let T = splitArgsByOperands(assignments, w, [program, ...args], Te(h));
  if (T !== void 0 && (h.standing === void 0 || Ao.has(T))) return Dt(T, h);
  let P =
    program.text === ":" ? assignments.findIndex((D) => /^(?:sudo|doas)$/.test(commandBaseName(D))) : -1;
  if (
    P !== -1 &&
    assignments.some((D, G) => G > P && (kwe(D.text, "si") || D.text === "--shell" || D.text === "--login"))
  )
    return Dt(ln.sudo, h);
  if (R !== void 0) {
    let D = analyzeNestedScript(R.text, { redirects: redirects, heredoc: heredoc, piped: piped }, w, h);
    if (D !== void 0 && h.standing === void 0) return D;
  }
  if (program.text === "setenv" || (program.text === "set" && /^-[a-zA-Z]*x/.test(args[0]?.text ?? ""))) {
    let D = program.text === "setenv" ? 0 : 1,
      G = args[D],
      Y = analyzeAssignments(
        G === void 0
          ? []
          : [
              {
                ...G,
                text:
                  G.text +
                  "=" +
                  args
                    .slice(D + 1)
                    .map((Z) => Z.text)
                    .join(":"),
              },
            ],
        !1,
        h.zshNullCommandHeld,
        Te(h),
      );
    if (Y !== void 0) return Y;
  }
  if (program.text === "unset" && args.some((D) => D.text.startsWith("GIT_CONFIG")))
    return "it unsets a GIT_CONFIG variable";
  if (program.text === "unset" && args.some((D) => D.text === "PATH")) return "it unsets PATH";
  if (program.expands && !/^\$/.test(program.text))
    return "it runs a command whose name is built by an expansion";
  if (/^\$\(\u2026\)/.test(program.text))
    return "it runs a command held in a variable or produced by another command";
  if (/^\$/.test(program.text)) {
    if (isUnderRoots(program, h)) return "it names " + program.text;
    let D = /^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?\//.exec(program.text)?.[1];
    if (D !== void 0 && h.relativeNames?.has(D) === !0) return "it runs a file by a relative path";
    if (/^\$[({](?:CURDIR|PWD)[)}]/.test(program.text)) return "it uses its working directory";
    let replaced = program.text.replace(/^\$\{[^}]*\}|^\$\([^)]*\)|^\$[A-Za-z_][A-Za-z0-9_]*/, "");
    if (
      replaced !== program.text &&
      /^[^\/$].*\//.test(replaced) &&
      (!replaced.startsWith("~") || readFlagWithOverride(TENGU_FEDERATED_HEARTH, { safe: !0 }))
    )
      return "it runs a file by a relative path";
    let Y =
      h.make === !0 && /^(?:\$[({][A-Za-z_]+[)}])*\$[({]MAKE[)}]$/.test(program.text)
        ? "make"
        : /:-([^}]+)\}$/.exec(program.text)?.[1];
    if (Y === void 0) {
      if (h.fromPayload) return "it runs a command held in a variable or produced by another command";
      let found = args.find((K) => !K.text.startsWith("-"));
      if (
        found !== void 0 &&
        isPlainArgument(found) &&
        (found.text.includes("/") || /\.[A-Za-z0-9]{1,5}$/.test(found.text))
      )
        return "it runs a file by a relative path";
      if (!/^\/(?:.*\/)?[^\/$]+$/.test(replaced)) return;
      let z = commandBaseName(program);
      if (isLauncherCommand(z) && z !== "runuser")
        return isAnchoredPath(program) && !/[ \t]/.test(program.text)
          ? void 0
          : analyzeWrappedCommand([{ text: z, quoted: !1, raw: z }, ...args], piped, w, h, !0);
    } else program = { ...program, text: Y };
  }
  if (program.quoted && /[ \t]/.test(program.text) && !program.text.includes("/")) {
    w.push(program.text);
    return;
  }
  let L = normalizeInterpreterName(commandBaseName(program)),
    found_2 = [program, ...args, ...redirects.map((D) => D.target)].find((D) => isUnderRoots(D, h));
  if (found_2 !== void 0) return "it names " + found_2.text;
  if (program.text.includes("/") && !isPathWord(program) && !program.text.endsWith("/"))
    return "it runs a file by a relative path";
  if (h.standing === void 0 && /(?:^|[^$])\{[-+]?\d*[.\/#%+]{0,4}\}/.test(program.text))
    return "it runs a file by a relative path";
  if (h.forNameDo && h.standing === void 0) {
    if (L === "function" && args.slice(1).some((Y) => Y.text === "do" && !Y.quoted))
      return "it defines a function whose loop has no ';' or line break before its 'do', so what the loop runs cannot be checked; written with '; do' it can be";
    let D = [program, ...args],
      found = [0, 1, 2].find((Y) => {
        let Z = D[Y];
        return Z !== void 0 && !Z.quoted && /^(?:for|select|repeat)$/.test(Z.text);
      });
    if (found !== void 0) {
      let text = D[found].text,
        sliced = D.slice(found + 2),
        z = text === "repeat" ? -1 : sliced.findIndex((K) => K.text === "in" && !K.quoted);
      if ((z === -1 ? sliced : sliced.slice(0, z)).some((K) => K.text === "do" && !K.quoted))
        return `it runs a '${text}' loop with no ';' or line break before its 'do', so what the loop runs cannot be checked; written with '; do' it can be`;
    }
    if (
      assignments.some((Y) => Y.text === "coproc" && !Y.quoted) &&
      args.some((Y) => Y.text === "do" && !Y.quoted)
    )
      return "it starts a coprocess whose loop has no ';' or line break before its 'do', so what the loop runs cannot be checked; written with '; do' it can be";
  }
  if (L === "for" || L === "select")
    return args
      .slice(args.findIndex((G) => G.text === "in") + 1)
      .some((G) => isPlainArgument(G) && /[\/*?[]/.test(G.text))
      ? "it loops over files by a relative name"
      : void 0;
  if (L === "source" || program.text === ".") {
    let D = args[0]?.text === "--" ? args[1] : args[0];
    if (D !== void 0 && isStdinLikePath(D)) {
      if (heredoc !== void 0 && D.text !== "<(\u2026)") {
        w.push(heredoc);
        return;
      }
      return "it runs a shell or interpreter whose program arrives on a pipe, a heredoc or a file descriptor";
    }
    return isPlainArgument(D) ? "it sources a file by a relative name" : void 0;
  }
  let F = unwrapLauncherArgs(L, args, Te(h));
  if (F === "reads_input") return Dt(ln[L], h);
  if (F !== void 0) {
    if (F !== "held") for (let D of F.lines ?? []) w.push(D);
    return F === "held" || F.held
      ? "it runs " + L + " with a command or file this machine cannot verify"
      : (F.words ?? []).map((D) => analyzeWrappedCommand(D, piped, w, h)).find((D) => D !== void 0);
  }
  if ($i.has(L) || findEvalStyleFlag(L, args) !== void 0)
    return L !== "hg" && args.length > 0 && args.every((D) => ko.test(D.text))
      ? void 0
      : "it runs a project tool, such as make or npm";
  let X = L === "rscript" ? findInterpreterScript(L, args, h.rubyAttachedPattern) : void 0;
  if (
    Vi.has(L) &&
    !(
      L === "rscript" &&
      (typeof X === "object" ? args.slice(0, args.indexOf(X)) : args).some((D) => D.text === "--vanilla")
    )
  )
    return "it runs " + L;
  if (Me.has(L) || sn.has(L) || (program.text === ":" && R === void 0)) {
    let D = Me.has(L),
      G =
        program.text !== ":" &&
        (D ? findScriptArgument(L, args) : runsInlineProgram(L, args, h.rubyAttachedPattern));
    if (!G) {
      for (let { op: op, target: target } of redirects) {
        if ((op === "<" || op === "<>") && (isPlainArgument(target) || isStdinLikePath(target)))
          return program.text === ":"
            ? "it reads a compound command's input from a file in the launch directory"
            : "it runs a script by a relative name";
        if (op === "<<<" && Me.has(L)) {
          if (/^\$/.test(target.text.trim()))
            return "it runs a command held in a variable or produced by another command";
          w.push(target.text);
        }
      }
      if (heredoc !== void 0 && Me.has(L)) w.push(heredoc);
    }
    let Y = D && !G && heredoc === void 0 && !redirects.some((Z) => /^<(?!>)/.test(Z.op) || Z.op === "<>");
    if (
      !G &&
      program.text !== ":" &&
      (piped || Y || (!Me.has(L) && (heredoc !== void 0 || redirects.some((Z) => Z.op === "<<<"))))
    ) {
      if (L === "python" || L === "pypy")
        return analyzePythonCommand(args, h, collectHeredocInput(heredoc, redirects));
      return "it runs a shell or interpreter whose program arrives on a pipe, a heredoc or a file descriptor";
    }
  }
  if (Me.has(L))
    return analyzeInterpreterInput(L, args, w, h, { redirects: redirects, heredoc: heredoc, piped: piped });
  if (L === "python" || L === "pypy") {
    let D = analyzePythonCommand(args, h, collectHeredocInput(heredoc, redirects));
    if (D !== void 0) return D;
  } else if (L === "perl") {
    if (
      args.some((D, G) => {
        let match = /^-[acnpsTtwWX]*(?:I([\s\S]*)|[Mm]lib(?:=([\s\S]*)|(\s[\s\S]*))?)$/.exec(D.text);
        return (
          match !== null &&
          (match[1] !== void 0
            ? gt(tildeOperandAt(args, match[1], G), h)
            : match[3] !== void 0
              ? match[3].trim() !== ""
              : (match[2] ?? "").split(",").some((Z) => Z !== "" && gt({ value: Z, tildeLiteral: !0 }, h)))
        );
      })
    )
      return "it runs perl with -I or the lib pragma";
  } else if (L === "ruby") {
    let D = findInterpreterScript("ruby", args, h.rubyAttachedPattern),
      G = typeof D === "object" && args.includes(D) ? args.slice(0, args.indexOf(D)) : args;
    if (
      G.some((Y, Z) => {
        let match = /^-[acdlnpsvwy]*I(.*)$/.exec(Y.text);
        if (match !== null)
          return tildeOperandAt(G, match[1], Z)
            .value.split(":")
            .some((ne, ae, ie) => (ne !== "" || ie.length === 1) && gt({ value: ne, tildeLiteral: !1 }, h));
        let match_2 = /^(?:-[acdlnpsvwy]*r|--require=?)([\s\S]*)$/.exec(Y.text);
        if (match_2 === null) return !1;
        let { value: re } = tildeOperandAt(G, match_2[1], Z);
        return (
          /^\.\.?\//.test(re) ||
          /^bundler(?:\/+setup(?:\.rb)?)?$/i.test(re) ||
          isUnderRoots({ text: re, quoted: !1, raw: re }, h)
        );
      })
    )
      return "it runs ruby with -I or -r";
  } else if (L === "node" || L === "nodejs" || L === "tsx" || L === "ts-node") {
    if (
      args.some(
        (Y, Z) =>
          /^(?:-r|--require|--import|--(?:experimental-)?loader)(?:=|$)/.test(Y.text) &&
          !/^(?:\/|node:)/.test(
            Y.text.includes("=") ? (Y.text.split("=")[1] ?? "") : (args[Z + 1]?.text ?? ""),
          ),
      )
    )
      return "it runs node with --require, --import or --loader";
    let index = args.findIndex((Y) => /^(?:-e|--eval|-p|--print|-pe|-ep)$/.test(Y.text)),
      G =
        index !== -1
          ? args[index + 1]?.text
          : args.find((Y) => /^--(?:eval|print)=/.test(Y.text))?.text.replace(/^--(?:eval|print)=/, "");
    if (G !== void 0 && scanJsImports(G))
      return "it runs node code that loads a module by a bare or relative name";
  } else if (L === "lua") {
    if (args.some((D) => /^-l/.test(D.text))) return "it runs lua with -l";
  } else if (L === "php") {
    let D = analyzePhpCommand(args, h);
    if (D !== void 0) return D;
  }
  if (sn.has(L) || (isKnownInterpreter(L) && !Me.has(L))) {
    let D = findInterpreterScript(L, args, h.rubyAttachedPattern);
    if (D === "unknown_option") return "it runs an interpreter with an option this version does not know";
    if (D !== void 0 && isStdinLikePath(D) && L !== "python" && L !== "pypy")
      return "it runs a shell or interpreter whose program arrives on a pipe, a heredoc or a file descriptor";
    if (D !== void 0 && (D.text === "{}" || isPlainArgument(D))) return "it runs a script by a relative name";
    return;
  }
  if (
    /^(?:emacs|vim?|nvim|gvim|view|ex)$/.test(L) &&
    args.some((D, G) => {
      let match = /^(?:--?script|--load|-l|-S|-u)(?:=([\s\S]*))?$/.exec(D.text),
        Z = match === null ? void 0 : (match[1] ?? args[G + 1]?.text ?? "-");
      return (
        Z !== void 0 &&
        !(D.text === "-u" && /^(?:NONE|NORC|DEFAULTS)$/.test(Z)) &&
        (Z.startsWith("-") ? D.text === "-S" : !isAbsoluteLike(Z, nt) || isUnresolvedVariablePath(Z, Te(h)))
      );
    })
  )
    return "it runs a script by a relative name";
  let Q = Ii[L];
  if (Q !== void 0) {
    if (
      args.some((D) => D.text === "{}" || (!D.text.startsWith("-") && Q.test(D.text) && isPlainArgument(D)))
    )
      return "it runs a script by a relative name";
    if (
      args.every((D) => D.text.startsWith("-")) &&
      (piped || heredoc !== void 0 || redirects.some((D) => D.op.startsWith("<")))
    )
      return "it runs a shell or interpreter whose program arrives on a pipe, a heredoc or a file descriptor";
  }
  let ee =
    L === "dart"
      ? (args[0]?.text === "run" ? args.slice(1) : args).find((D) => !D.text.startsWith("-"))
      : void 0;
  if (ee !== void 0 && ee.text.endsWith(".dart") && isPlainArgument(ee))
    return "it runs a script by a relative name";
  if (L === "git") return analyzeEnvCommand(args, assignments, w, Te(h));
  if (L === "java") {
    let index = args.findIndex((Z) => Z.text === "-jar"),
      index_2 = args.findIndex((Z) => /^(?:-cp|-classpath|--class-path)$/.test(Z.text)),
      Y =
        index_2 === -1
          ? args.find((Z) => Z.text.startsWith("--class-path="))?.text.slice(13)
          : args[index_2 + 1]?.text;
    if (index !== -1) return isPlainArgument(args[index + 1]) ? "it runs a file by a relative path" : void 0;
    return args.length > 0 && args.every((Z) => ko.test(Z.text))
      ? void 0
      : Y !== void 0 && Y.split(":").every((Z) => Ie(Z, Te(h)))
        ? void 0
        : "it runs java with the working directory on its class path";
  }
  if (L === "eval") {
    w.push((args[0]?.text === "--" ? args.slice(1) : args).map((D) => D.text).join(" "));
    return;
  }
  if (L === "nix-shell" || L === "nix") {
    let index = args.findIndex((G) => /^(?:--run|--command|-c)$/.test(G.text));
    if (index !== -1 && args[index + 1] !== void 0)
      w.push(
        args
          .slice(index + 1)
          .map((G) => G.text)
          .join(" "),
      );
    return findEvalStyleFlag(L, args) !== void 0 || L === "nix-shell"
      ? "it runs a project tool, such as make or npm"
      : void 0;
  }
  if (L === "trap") {
    let D = args[0]?.text === "--" ? args.slice(1) : args;
    if (D.length >= 2 && !/^-[lp]$/.test(D[0].text) && D[0].text !== "-") w.push(D[0].text);
    return;
  }
  if (L === "alias") {
    for (let D of args) {
      let index = D.text.indexOf("=");
      if (index > 0) w.push(D.text.slice(index + 1));
    }
    return;
  }
  if (L === "enable" || L === "hash") {
    let index = args.findIndex((G) => G.text === (L === "enable" ? "-f" : "-p"));
    return index !== -1 && isPlainArgument(args[index + 1]) ? "it runs a file by a relative path" : void 0;
  }
  if (L === "exec" || L === ":") return;
  if (L === "find") {
    let D = [];
    for (let G = 0; G < args.length; G += 1) {
      if (!/^-(?:exec|execdir|ok|okdir)$/.test(args[G].text)) continue;
      let Y = G + 1;
      while (Y < args.length && args[Y].text !== ";" && args[Y].text !== "+") Y += 1;
      let sliced = args.slice(G + 1, Y);
      if (sliced.length === 0) continue;
      let z = analyzeWrappedCommand(sliced, !1, w, h);
      (D.push(
        sliced[0].text === "{}" || parseShellWords(sliced).some((K) => K.program.text === "{}")
          ? "it runs a file by a relative path"
          : z,
      ),
        (G = Y));
    }
    return D.find((G) => G !== void 0);
  }
  return;
}
//@ chunk-mthxbav8.js:86063-86192 placement
function findEvalStyleFlag(e, n) {
  let r = Ni[e];
  if (r === void 0) return;
  return n.find((s) => r.has(s.text.startsWith("--") ? firstLineOf(s.text, "=") : s.text))?.text;
}
//@ chunk-mthxbav8.js:86192-86634 placement
var MAX_WRAP_NESTING = 4,
  Co = "it wraps a command in more than four layers of commands such as find -exec or parallel",
  an = "it runs env with -P naming a relative directory",
  ln = {
    parallel: "it runs parallel with no command of its own",
    script: "it runs script with no command of its own",
    su: "it runs su with no command",
    runuser: "it runs runuser with no command",
    sudo: "it starts a shell through sudo or doas with no command",
  },
  Ao = new Set([Co, an, ...Object.values(ln)]);
//@ chunk-mthxbav8.js:86634-86693 placement
function Dt(e, n) {
  if (Ao.has(e)) n.standing?.push(e);
  return e;
}
//@ chunk-mthxbav8.js:86693-87068 placement
function analyzeWrappedCommand(e, n, r, s, u = !1) {
  let S = (s.nesting ?? 0) + 1;
  if (S > MAX_WRAP_NESTING) return Dt(Co, s);
  if (e.length === 0) return;
  let w = [
      ...(u ? [] : [{ program: e[0], args: e.slice(1), assignments: [] }]),
      ...parseShellWords(e).filter((v) => u || v.args.length !== e.length - 1),
    ],
    h = [];
  for (let v of w) {
    let y = analyzeCommandReach({ ...v, redirects: [], piped: n }, r, { ...s, nesting: S });
    if (y !== void 0 && s.standing === void 0) return y;
    h.push(y);
  }
  return h.find((v) => v !== void 0);
}
//@ chunk-mthxbav8.js:87068-87140 placement
var Vi = new Set(["bun", "deno", "tsx", "ts-node", "lua", "rscript", "r", "bb"]);
//@ chunk-mthxbav8.js:87140-87212 placement
function Te(e) {
  return e.relativeNamedValues === !1 ? void 0 : e.relativeNames;
}
//@ chunk-mthxbav8.js:87212-87283 placement
function Ie(e, n) {
  let r = isAbsoluteLike(e);
  if (n === void 0) return r;
  return r && !isUnresolvedVariablePath(e, n);
}
//@ chunk-mthxbav8.js:87283-87504 placement
function isUnresolvedVariablePath(e, n) {
  if (n === void 0) return !1;
  let r = /^\$\{?([A-Za-z_][A-Za-z0-9_]*)/.exec(e)?.[1],
    replaced = e.replace(/^\$\{[^}]*\}|^\$\([^)]*\)|^\$[A-Za-z_][A-Za-z0-9_]*/, "");
  return (r !== void 0 && n.has(r)) || (replaced !== e && /^[^\/~$].*\//.test(replaced));
}
//@ chunk-mthxbav8.js:87620-87784 placement
function gt({ value: e, tildeLiteral: tildeLiteral }, r) {
  return (
    (tildeLiteral && e.startsWith("~")) ||
    !Ie(e, Te(r)) ||
    (r.make === !0 && /^\$[({](?:CURDIR|PWD)[)}]/.test(e)) ||
    isUnderRoots({ text: e, quoted: !1, raw: e }, r)
  );
}
//@ chunk-mthxbav8.js:87784-87911 placement
function isStdinLikePath(e) {
  return (
    e !== void 0 &&
    /^(?:\/dev\/(?:stdin|fd\/\d+)|\/proc\/(?:self|\d+)\/fd\/\d+|-|[<>]\(\u2026\))$/.test(e.text)
  );
}
//@ chunk-mthxbav8.js:87911-88235 placement
function isUnderRoots(e, n) {
  if (n.roots.length === 0) return !1;
  let text = e.text;
  if (/^\$(?:HOME|\{HOME\})(?=\/|$)/.test(text)) text = n.home + text.replace(/^\$(?:HOME|\{HOME\})/, "");
  else if (/^~[A-Za-z0-9._-]*(?=\/|$)/.test(text)) text = n.home + text.replace(/^~[A-Za-z0-9._-]*/, "");
  if (!text.startsWith("/")) return !1;
  let normalized = posix_2.normalize(text);
  return n.roots.some((root) => D4e(normalized, root));
}
//@ chunk-mthxbav8.js:88235-89629 placement
function analyzeInterpreterInput(e, n, r, s, u) {
  let w = u.piped || u.heredoc !== void 0 || u.redirects.some((redirect) => redirect.op.startsWith("<")),
    h = (y) =>
      w && !/^\$/.test(y.text.trim())
        ? analyzeNestedScript(y.text, u, r, s)
        : collectNestedShellCommand(y, r),
    v = !1;
  for (let y = 0; y < n.length; y += 1) {
    let C = n[y],
      text = C.text;
    if (text === "--") {
      let R = n[y + 1];
      if (R === void 0) return;
      return v ? h(R) : !isAbsoluteLike(R.text) ? "it runs a script by a relative name" : void 0;
    }
    if (e === "fish") {
      let match = /^(?:-C|--init-command(?:=([\s\S]*))?)$/.exec(text);
      if (match !== null) {
        let j = match[1] !== void 0 ? { ...C, text: match[1] } : n[y + 1],
          M = j === void 0 ? void 0 : h(j);
        if (M !== void 0 && s.standing === void 0) return M;
        y += match[1] !== void 0 ? 0 : 1;
        continue;
      }
    }
    if (isShellCommandFlag(e, text) && !text.startsWith("--command=")) {
      if (e === "pwsh" && /^-e/i.test(text)) return "it hands pwsh an encoded command";
      ((v = !0), (y += shellFlagArity(e, text)));
      continue;
    }
    if (text.startsWith("--command=")) return h({ ...C, text: text.slice(10) });
    if (/^--(?:rcfile|init-file)=/.test(text)) {
      if (!Ie(text.slice(text.indexOf("=") + 1), Te(s)))
        return "it runs " + e + " with an rc file by a relative name";
      continue;
    }
    let x = shellFlagArity(e, text);
    if (x > 0) {
      let R = n[y + 1]?.text;
      if (((y += x), /^--(?:rcfile|init-file)$/.test(text) && R !== void 0 && !Ie(R, Te(s))))
        return "it runs " + e + " with an rc file by a relative name";
      continue;
    }
    if (text.startsWith("-") || text.startsWith("+")) continue;
    if (v) {
      let R = h(C);
      return e === "pwsh" && y + 1 < n.length
        ? (R ??
            h({
              ...C,
              text: n
                .slice(y)
                .map((j) => j.text)
                .join(" "),
            }))
        : R;
    }
    return isStdinLikePath(C)
      ? "it runs a shell whose program arrives on a pipe, a heredoc or a file descriptor"
      : isPlainArgument(C)
        ? "it runs a script by a relative name"
        : void 0;
  }
  return;
}
//@ chunk-mthxbav8.js:89629-89699 placement
var Ki = new Set(["bash", "sh", "dash", "ash", "ksh", "mksh", "zsh", "rbash"]);
//@ chunk-mthxbav8.js:89699-90340 placement
function shellFlagArity(e, n) {
  if (/^--(?:rcfile|init-file)$/.test(n)) return 1;
  if (Ki.has(e)) {
    let match = /^[-+]([a-zA-Z]+)$/.exec(n);
    if (match === null) return 0;
    if (e === "zsh" || e === "ksh" || e === "mksh")
      return (e === "zsh" ? /o$/ : /[oO]$/).test(match[1]) ? 1 : 0;
    return (match[1].match(/[oO]/g) ?? []).length;
  }
  if (e === "fish")
    return /^(?:[+-]O|\+o|-C|--init-command|-p|--profile|-d|--debug|-D|--debug-stack-frames|-f|--features)$/.test(
      n,
    )
      ? 1
      : 0;
  if (e === "pwsh")
    return /^-(?:o|of|outputformat|ex|ep|executionpolicy|wd|workingdirectory|config|configurationname|custompipename|if|inp|inputformat|settings|settingsfile|w|windowstyle|v|version)$/i.test(
      n,
    )
      ? 1
      : 0;
  return n === "-o" || n === "+o" || n === "-O" || n === "+O" ? 1 : 0;
}
//@ chunk-mthxbav8.js:90340-90537 placement
function flagArgumentIndexes(e, n) {
  let r = new Set();
  for (let s = 0; s < n.length; s += 1) {
    let text = n[s].text;
    if (text === "--") break;
    if (text.startsWith("-") || text.startsWith("+")) {
      let S = shellFlagArity(e, text);
      for (let w = 1; w <= S; w += 1) r.add(s + w);
      s += S;
    }
  }
  return r;
}
//@ chunk-mthxbav8.js:90537-90855 placement
function findScriptArgument(e, n) {
  let r = flagArgumentIndexes(e, n),
    index = n.findIndex((w, h) => !r.has(h) && !/^[-+]./.test(w.text)),
    u = index === -1 ? n : n.slice(0, index);
  if (u.some((w) => isShellCommandFlag(e, w.text)))
    return (
      (index !== -1 || u.some((w) => /^--command=./.test(w.text))) &&
      !(e === "pwsh" && n[index]?.text === "-")
    );
  let S = e !== "fish" && e !== "pwsh" && u.some((w) => kwe(w.text, "s"));
  return index !== -1 && !isStdinLikePath(n[index]) && !S;
}
//@ chunk-mthxbav8.js:90855-90998 placement
function isShellCommandFlag(e, n) {
  return e === "pwsh"
    ? /^-(?:c|command|cwa|commandwithargs|e|ec|encodedcommand)$/i.test(n)
    : kwe(n, "c") || /^--command(?:=|$)/.test(n);
}
//@ chunk-mthxbav8.js:90998-91166 placement
function runsInlineProgram(e, n, r) {
  let s = findInterpreterScript(e, n, r);
  return (
    n.some((u) => isEvalFlag(e, u.text)) ||
    (/^(?:[gnm]?awk|g?sed)$/.test(e) && n.some((u) => !u.text.startsWith("-"))) ||
    (typeof s === "object" && !isStdinLikePath(s))
  );
}
//@ chunk-mthxbav8.js:91166-91319 placement
function collectNestedShellCommand(e, n) {
  if (/^\$/.test(e.text.trim()))
    return "it hands a shell a command held in a variable or produced by another command";
  n.push(e.text);
  return;
}
//@ chunk-mthxbav8.js:91319-91809 placement
function analyzeNestedScript(e, n, r, s) {
  let { commands: commands, unreadable: unreadable } = parseShellCommands(e, {
    make: !1,
    quotedBackslashKept: s.quotedBackslashKept,
    substitutionHeredocs: s.substitutionHeredocs,
  });
  if (unreadable !== null) return `it could not be read to the end as shell (${unreadable})`;
  return commands
    .map((w) =>
      analyzeCommandReach(
        w.program.text === ":" && w.args.length === 0 && w.redirects.length === 0
          ? w
          : {
              ...w,
              redirects: [...w.redirects, ...n.redirects.filter((redirect) => redirect.op.startsWith("<"))],
              heredoc: w.heredoc ?? n.heredoc,
              piped: w.piped || n.piped,
            },
        r,
        { ...s, fromPayload: !0 },
      ),
    )
    .find((w) => w !== void 0);
}
//@ chunk-mthxbav8.js:91809-93326 placement
function splitArgsByOperands(e, n, r = [], s) {
  let u = Array(e.length + 1),
    fill = Array(e.length + 1).fill(!1),
    fill_2 = Array(e.length + 3).fill(!1);
  for (let x = e.length - 1; x >= 0; x -= 1) {
    let text = e[x].text,
      j = /^(?:-[iv0]*[uCP]|--unset|--chdir)$/.test(text) ? 2 : 1;
    ((fill_2[x] =
      text.startsWith("-") &&
      ((/^-[iv0]*P/.test(text) &&
        !(text.replace(/^-[iv0]*P/, "") || (e[x + 1]?.text ?? "")).split(":").every((T) => Ie(T, s))) ||
        fill_2[x + j])),
      (u[x] = /^(?:-S.|--split-string=)/.test(text)
        ? text.replace(/^(?:-S|--split-string=)/, "")
        : u[x + 1]));
    let match = /^-[0oprtx]+a([\s\S]*)$/.exec(text),
      q = /^(?:-a|--arg-file)$/.test(text)
        ? e[x + 1]?.text
        : text.startsWith("--arg-file=")
          ? text.slice(11)
          : text.startsWith("-a") && text.length > 2
            ? text.slice(2)
            : match !== null
              ? match[1] || e[x + 1]?.text
              : void 0;
    fill[x] = (q !== void 0 && !Ie(q, s)) || fill[x + 1];
  }
  let mapped = e.map((x) => x.text.slice(x.text.lastIndexOf("/") + 1).toLowerCase()),
    index = mapped.indexOf("xargs"),
    y =
      index === -1
        ? []
        : uniq(
            e.slice(index + 1).flatMap((x, R, j) => {
              let match = /^-[0oprtx]*([IJi])([\s\S]*)$/.exec(x.text);
              if (match === null)
                return /^--replace(?:=|$)/.test(x.text) ? [x.text.split("=")[1] ?? "{}"] : [];
              return match[1] === "i"
                ? [
                    "{}",
                    ...(match[2] === "" ? [] : [match[2]]),
                    ...(match[2].includes("=") ? [x.text.split("=")[1]] : []),
                  ]
                : [match[2] || j[R + 1]?.text].filter((q) => q !== void 0);
            }),
          ),
    C = y.length > 64 || r.some((x) => y.some((R) => x.text.includes(R)));
  mapped.forEach((x, R) => {
    if (x === "env" && u[R + 1] !== void 0) n.push(u[R + 1]);
  });
  let mapped_2 = mapped.map((x, R) => {
    if (x === "env") return !e[R].text.startsWith("-") && fill_2[R + 1] ? an : void 0;
    if (x !== "xargs") return;
    return C
      ? "it runs what xargs splices into the command from its input"
      : fill[R + 1]
        ? "it runs xargs with its arguments read from a file by a relative name"
        : void 0;
  });
  return mapped_2.find((x) => x === an) ?? mapped_2.find((x) => x !== void 0);
}
//@ chunk-mthxbav8.js:93326-93621 placement
function findSubcommandArg(e, n) {
  let sliced = e.slice(n + 1),
    index = sliced.findIndex((w, h) => !w.text.startsWith("-") && !Zt.has(sliced[h - 1]?.text ?? "")),
    u = index === -1 ? "" : (sliced[index + 1]?.text ?? ""),
    S = /^(?:-c|--command)$/.test(u) ? sliced[index + 2] : void 0;
  if (S !== void 0) return { at: n + index + 3, text: S.text };
  return u.startsWith("--command=") ? { at: n + index + 2, text: u.slice(10) } : void 0;
}
//@ chunk-mthxbav8.js:93621-94492 placement
var XARGS_PARALLEL_FLAGS = new Set([
    "-j",
    "-P",
    "-a",
    "-S",
    "-C",
    "-N",
    "-n",
    "-L",
    "-s",
    "-I",
    "-U",
    "-d",
    "-E",
    "-J",
    "-D",
    "--jobs",
    "--max-procs",
    "--arg-file",
    "--sshlogin",
    "--sshloginfile",
    "--slf",
    "--colsep",
    "--max-replace-args",
    "--max-args",
    "--max-lines",
    "--max-chars",
    "--delimiter",
    "--eof",
    "--halt",
    "--halt-on-error",
    "--joblog",
    "--results",
    "--res",
    "--delay",
    "--timeout",
    "--retries",
    "--tmpdir",
    "--workdir",
    "--wd",
    "--tagstring",
    "--env",
    "--rpl",
    "--load",
    "--memfree",
    "--memsuspend",
    "--nice",
    "--limit",
    "--termseq",
    "--basefile",
    "--bf",
    "--return",
    "--profile",
    "--transferfile",
    "--tf",
    "--block",
    "--blocksize",
    "--block-size",
    "--recstart",
    "--recend",
    "--compress-program",
    "--header",
    "--id",
    "--semaphorename",
    "--semaphoretimeout",
    "--st",
    "--shellquote-ignore",
  ]),
  yo = new Set([
    "-t",
    "-F",
    "-E",
    "--echo",
    "-O",
    "--log-out",
    "-I",
    "--log-in",
    "-B",
    "--log-io",
    "-T",
    "--log-timing",
    "-m",
    "--logging-format",
    "-o",
    "--output-limit",
  ]);
//@ chunk-mthxbav8.js:94492-94668 placement
function skipOptionWords(e, n, r = !1) {
  let s = 0;
  while (s < e.length && e[s].text.startsWith("-")) {
    let text = e[s].text;
    s += n.has(text) || (r && /^-[A-Za-z]{2,}$/.test(text) && n.has("-" + text.at(-1))) ? 2 : 1;
  }
  return e.slice(s);
}
/**
 * 展开 env/sudo/xargs/parallel/find -exec 等包装命令，得到真正要执行的命令词。
 */
//@ chunk-mthxbav8.js:94668-98210 placement
function unwrapLauncherArgs(e, n, r) {
  let s = (S) => (S >= 0 && S < n.length ? { words: [n.slice(S)] } : void 0),
    u = (S) =>
      S.filter(
        (w, h) =>
          w.length > 0 && S.findIndex((v) => v.length === w.length && v.every((y, C) => y === w[C])) === h,
      );
  switch (e) {
    case "su":
    case "runuser": {
      let flattened = n.flatMap((v, y) => {
          let match = /^(?:-[flmpPT]*c|--(?:session-)?command(?==|$))=?([\s\S]*)$/.exec(v.text);
          return match === null ? [] : [match[1] !== "" ? match[1] : n[y + 1]?.text];
        }),
        any = n.some((v, y) => {
          let match = /^(?:-[flmpPT]*s|--shell)(?:=?([\s\S]+))?$/.exec(v.text),
            O = match === null ? void 0 : (match[1] ?? n[y + 1]?.text);
          return O !== void 0 && (!isAbsoluteLike(O, nt) || isUnresolvedVariablePath(O, r));
        });
      if (flattened.length === 0) {
        if (
          (e === "runuser" && n.some((y) => /^(?:-[flmpPT]*u|--user(?:=|$))/.test(y.text))) ||
          (n.length > 0 && n.every((y) => /^(?:--version|--help|-V|-h)$/.test(y.text)))
        )
          return;
        let filtered = n.filter(
          (y, C) =>
            !y.text.startsWith("-") &&
            !/^(?:-[flmpPT]*[sgGwu]|--shell|--group|--supp-group|--whitelist-environment|--user)$/.test(
              n[C - 1]?.text ?? "",
            ),
        );
        return filtered.length <= 1
          ? "reads_input"
          : any
            ? "held"
            : { words: [[{ text: "sh", quoted: !1, raw: "sh" }, ...filtered.slice(1)]] };
      }
      let filtered = flattened.filter((v) => v !== void 0);
      return { lines: filtered, held: filtered.length < flattened.length || any };
    }
    case "watch": {
      let filtered = uniq(
        [
          /^(?:-n|--interval|-d|--differences|-q|--equexit)$/,
          /^(?:-[a-zA-Z]*[nq]|--interval|--equexit)$/,
        ].map((w) => {
          let h = 0;
          while (h < n.length && n[h].text.startsWith("-")) h += w.test(n[h].text) ? 2 : 1;
          return h;
        }),
      ).filter((w) => w < n.length);
      return filtered.length === 0
        ? void 0
        : {
            lines: filtered.map((w) =>
              n
                .slice(w)
                .map((h) => h.text)
                .join(" "),
            ),
          };
    }
    case "script": {
      let index = n.findIndex((y) => /^(?:-[a-zA-Z]*c|--command)$/.test(y.text));
      if (index !== -1) {
        let y = n[index + 1]?.text;
        return y === void 0 ? "held" : { lines: [y] };
      }
      let filtered = n.filter((y) => !y.text.startsWith("-"));
      if (filtered.length < 2)
        return n.length > 0 && n.every((y) => /^(?:--version|--help|-V|-h)$/.test(y.text))
          ? void 0
          : "reads_input";
      let h = skipOptionWords(n, yo),
        v = skipOptionWords(n, yo, !0);
      if (h.length <= 1 || v.length <= 1) return "reads_input";
      return { words: u([filtered.slice(1), n.slice(n.indexOf(filtered[0]) + 1), h.slice(1), v.slice(1)]) };
    }
    case "dotenv":
      return "held";
    case "direnv": {
      if (n[0]?.text !== "exec") return;
      let S = n[1];
      return S === void 0 || !Ie(S.text, r) ? "held" : s(2);
    }
    case "op": {
      if (n[0]?.text !== "run") return;
      let index = n.findIndex((h) => /^--env-file(?:=|$)/.test(h.text));
      if (index !== -1) {
        let h = n[index].text.includes("=") ? n[index].text.slice(11) : (n[index + 1]?.text ?? "");
        if (!Ie(h, r)) return "held";
      }
      let index_2 = n.findIndex((h) => h.text === "--");
      return index_2 === -1 ? void 0 : s(index_2 + 1);
    }
    case "hyperfine": {
      let S = [],
        w = /^(?:-p|--prepare|-s|--setup|-c|--cleanup|--conclude)$/,
        h =
          /^(?:-w|--warmup|-r|--runs|-m|--min-runs|-M|--max-runs|-n|--command-name|--export-\w+|--output|--shell|--sort|-u|--time-unit|-D|--parameter-step-size)$/,
        v = [];
      for (let y = 0; y < n.length; y += 1) {
        let text = n[y].text;
        if (w.test(text)) (S.push(n[y + 1]?.text ?? ""), (y += 1));
        else if (/^(?:-L|--parameter-list)$/.test(text))
          (v.push(...(n[y + 2]?.text ?? "").split(",")), (y += 2));
        else if (/^(?:-P|--parameter-scan)$/.test(text)) y += 3;
        else if (h.test(text)) y += 1;
        else if (!text.startsWith("-")) S.push(text);
      }
      return {
        lines: [
          S.join(`
`),
          ...(S.length > 1 ? S : []),
          ...v,
        ],
      };
    }
    case "parallel": {
      let filtered = n.filter((j) => !j.text.startsWith("-") && j.text !== ":::");
      if (filtered.length === 0) return "reads_input";
      let index = n.findIndex((j) => !j.text.startsWith("-")),
        sliced = n.slice(index),
        index_2 = sliced.findIndex((j) => /^::::?\+?$/.test(j.text)),
        filtered_2 = sliced.filter((j) => !/^::::?\+?$/.test(j.text)),
        C = skipOptionWords(n, XARGS_PARALLEL_FLAGS),
        O = skipOptionWords(n, XARGS_PARALLEL_FLAGS, !0);
      if ([C, O].some((j) => j.length === 0 || /^::::\+?$/.test(j[0].text))) return "reads_input";
      let x = new Set(
          n.filter(
            (j, M) =>
              XARGS_PARALLEL_FLAGS.has(n[M - 1]?.text ?? "") && /^\{[-+]?\d*[.#%+]{0,4}\}$/.test(j.text),
          ),
        ),
        R = (j) => {
          let index = j.findIndex((q) => !x.has(q));
          return index === -1 ? [] : j.slice(index);
        };
      return {
        words: u([
          R(filtered),
          R(filtered_2),
          C.filter((j) => !/^::::?\+?$/.test(j.text)),
          O.filter((j) => !/^::::?\+?$/.test(j.text)),
        ]),
        lines:
          index_2 === 0 || [C, O].some((j) => /^:::\+?$/.test(j[0].text))
            ? filtered_2.map((j) => j.text)
            : [],
      };
    }
    default:
      return;
  }
}
//@ chunk-mthxbav8.js:98210-99362 placement
function findInterpreterScript(e, n, r) {
  if (e === "deno") return n[0]?.text === "run" ? n.slice(1).find((S) => !S.text.startsWith("-")) : void 0;
  if (e === "php") {
    let php = wo.php;
    for (let w = 0; w < n.length; w += 1) {
      let text = n[w].text,
        match = /^(?:-[fF]|--file)(?:=?([\s\S]+))?$/.exec(text);
      if (match !== null) return match[1] !== void 0 ? { ...n[w], text: match[1] } : n[w + 1];
      if (!text.startsWith("-") || text === "-" || text === "--") break;
      if (php.has(text)) w += 1;
    }
  }
  if (/^(?:[gnm]?awk|g?sed)$/.test(e)) {
    let endsWith = e.endsWith("awk"),
      w = endsWith ? /^-[a-zA-Z]*[fE]$/ : /^-[a-zA-Z]*f$/,
      h = endsWith ? /^-[fE]./ : /^-f./;
    for (let v = 0; v < n.length; v += 1) {
      let text = n[v].text;
      if (w.test(text)) return n[v + 1];
      if (h.test(text)) return { ...n[v], text: text.slice(2) };
      if (text.startsWith("--file=")) return { ...n[v], text: text.slice(7) };
    }
    return;
  }
  let s = wo[e] ?? new Set(),
    u = !1;
  for (let S = 0; S < n.length; S += 1) {
    let text = n[S].text;
    if (text === "--") return n[S + 1];
    if (text === "-" || !text.startsWith("-")) return text === "-" ? n[S] : u ? "unknown_option" : n[S];
    if (isEvalFlag(e, text)) return;
    if (e === "ruby" && text === "-F") {
      let h = n[S + 1];
      if (
        !r ||
        (h !== void 0 && !h.text.startsWith("-") && !isStdinLikePath(h) && (h.text === "" || isPathWord(h)))
      )
        S += 1;
      continue;
    }
    if (s.has(text)) {
      S += 1;
      continue;
    }
    if ([...s].some((h) => h.length === 2 && text.length > 2 && text.startsWith(h))) continue;
    if (text.startsWith("--") && text.includes("=")) continue;
    if (!INTERPRETER_NOOP_FLAGS[e]?.test(text)) u = !0;
  }
  return;
}
//@ chunk-mthxbav8.js:99362-100463 placement
var INTERPRETER_NOOP_FLAGS = {
    python: /^-[bBdEhiIOPqRsSuvVxE]+$|^--(?:version|help)$/,
    pypy: /^-[bBdEhiIOqRsSuvVx]+$/,
    node: /^--(?:enable-source-maps|no-warnings|no-deprecation|throw-deprecation|trace-warnings|trace-deprecation|pending-deprecation|experimental-strip-types|expose-gc|no-addons|preserve-symlinks|frozen-intrinsics|disallow-code-generation-from-strings|jitless|version|help)$|^-[civ]$/,
    ruby: /^-[acdhlnpsSTUvwWy0]+$|^-F|^--[a-z][a-z-]*$/,
    perl: /^-(?:[acfgnpsStTuUvwWX]|l[0-7]*|0[0-7]*|i\S*)+$/,
    osascript: /^-i$/,
    rscript: /^--[a-z][a-z-]*$/,
    php: /^-[aeHilmnqsvw]+$|^--[a-z-]+$/,
    lua: /^-[ivEW]$/,
    tsx: /^--[a-z][a-z0-9-]*$/,
    "ts-node": /^--[a-zA-Z][a-zA-Z0-9-]*$|^-[hvT]$/,
    bb: /^--?[a-z][a-z-]*$/,
  },
  os = new Set([
    "assert",
    "async_hooks",
    "buffer",
    "child_process",
    "cluster",
    "console",
    "constants",
    "crypto",
    "dgram",
    "diagnostics_channel",
    "dns",
    "domain",
    "events",
    "fs",
    "http",
    "http2",
    "https",
    "inspector",
    "module",
    "net",
    "os",
    "path",
    "perf_hooks",
    "process",
    "punycode",
    "querystring",
    "readline",
    "repl",
    "stream",
    "string_decoder",
    "sys",
    "timers",
    "tls",
    "trace_events",
    "tty",
    "url",
    "util",
    "v8",
    "vm",
    "wasi",
    "worker_threads",
    "zlib",
    "test",
    "sqlite",
  ]);
//@ chunk-mthxbav8.js:100463-100772 placement
function scanJsImports(e) {
  for (let n of e.matchAll(
    /(?:\brequire\s*(?:\?\.)?\s*\(|\bimport\s*\(|\bimport\s+(?:[\w*{}\s,]+\s+from\s+)?|\bfrom\s+|\bcreateRequire\b[^'"]*)\s*['"]([^'"]+)['"]/g,
  )) {
    let r = n[1];
    if (r.startsWith("/") || r.startsWith("node:")) continue;
    if (!os.has(firstLineOf(r, "/"))) return !0;
  }
  return /\bcreateRequire\b/.test(e);
}
//@ chunk-mthxbav8.js:100772-102198 placement
function analyzeAssignments(e, n, r, s) {
  for (let u of e) {
    let match = /^([A-Za-z_][A-Za-z0-9_]*)(?:\[[^\]]*\])?\+?=([\s\S]*)$/.exec(u.text);
    if (match === null) continue;
    let w = match[1],
      h = match[2],
      v = (C) =>
        C === "." ||
        !isAbsoluteLike(C) ||
        /^\$\{?PWD\b|^\$\(/.test(C) ||
        (isUnresolvedVariablePath(C, s) && !new RegExp(`^\\$\\{?${w}\\b`).test(C)),
      y = (C) => /^\$/.test(C) && !new RegExp(`^\\$\\{?(?:${w}|HOME|PATH)\\b`).test(C);
    if (BUILD_TOOL_ENV_VARS.includes(w)) {
      if (h.split(":").some((C) => v(C) || y(C)))
        return `it sets ${w} with the working directory or a relative entry on it`;
    } else if (n && /^(?:path|fpath|manpath|cdpath)$/.test(w)) {
      let C = /^\(([\s\S]*)\)$/.exec(h)?.[1];
      if ((C === void 0 ? [h] : splitQuotedWords(C)).some(v))
        return `it sets ${w} with the working directory or a relative entry on it`;
    } else if (w === "PHPRC" || w === "PHP_INI_SCAN_DIR") {
      let C = w === "PHPRC" ? [h] : h.split(":").filter((O) => O !== "");
      if (h !== "" && C.some(v)) return `it sets ${w} to a php.ini location in the working directory`;
    } else if (
      isToolEnvVar(w, r) ||
      /^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+|PARAMETERS|GLOBAL|SYSTEM)$/.test(w)
    )
      return `it sets ${w}, which makes a shell, an interpreter or git load what it names`;
    else if (Ci.test(w)) {
      let found = h
        .split(/[\s=]+/)
        .find((O) => (_o.test(O) && !isAbsoluteLike(O, nt)) || isUnresolvedVariablePath(O, s));
      if (found !== void 0)
        return _o.test(found) && !isAbsoluteLike(found, nt)
          ? `it sets ${w}, which a tool runs or loads, to a file in the working directory (${found})`
          : `it sets ${w}, which a tool runs or loads, to ${found}, which may name a file in the working directory (a variable in it is set to a relative value, or a relative path follows one)`;
    }
  }
  return;
}
//@ chunk-mthxbav8.js:102198-103809 placement
function analyzeEnvCommand(e, n, r, s) {
  if (
    n.some(
      (u) =>
        /^(?:env|-i|--ignore-environment|-u|--unset)$/.test(u.text.slice(u.text.lastIndexOf("/") + 1)) ||
        u.text.startsWith("GIT_CONFIG"),
    )
  )
    return "it runs git with the environment that switches its repository hooks off cleared or edited";
  for (let u = 0; u < e.length; u += 1) {
    let text = e[u].text,
      w;
    if (text === "-c" || text === "--config-env") ((u += 1), (w = e[u]?.text));
    else if (text.startsWith("--config-env=")) w = text.slice(13);
    else if (/^-c./.test(text)) w = text.slice(2);
    else if (/^--exec-path=(?![\/~])/.test(text))
      return "it runs git with an exec path in the launch directory (git-* commands come from there)";
    if (w === void 0) {
      if (/^(?:bisect|submodule|rebase)$/.test(text)) {
        let sliced = e.slice(u + 1),
          index = sliced.findIndex((x) => /^(?:run|foreach|-x|--exec)$/.test(x.text));
        if (index !== -1 && sliced[index + 1] !== void 0)
          r.push(
            sliced
              .slice(index + 1)
              .map((x) => x.text)
              .join(" "),
          );
        break;
      }
      continue;
    }
    let index = w.indexOf("="),
      v = index === -1 ? w : w.slice(0, index),
      y = index === -1 ? "" : w.slice(index + 1);
    if (/^core\.hookspath$/i.test(v)) {
      if (!/^(?:\/|~\/)/.test(y) || /^~[+-]/.test(y))
        return "it runs git with core.hooksPath set on the command line";
    } else if (/^include(?:if\.[^=]*)?\.path$/i.test(v) && !Ie(y, s))
      return "it runs git with an include path set on the command line";
    else if (isUnresolvedVariablePath(y, s))
      return `it runs git with ${v} set on the command line to ${y}, which may name a file in the working directory`;
    else if (
      y.startsWith("!") ||
      (y.includes("/") && !isAbsoluteLike(y, nt)) ||
      /^(?:core\.(?:fsmonitor|sshcommand|askpass|editor|pager|gitproxy)|credential\.helper|diff\.external|gpg\.(?:\w+\.)?program|sequence\.editor|uploadpack\.packobjectshook)$/i.test(
        v,
      )
    )
      return `it runs git with ${v} set on the command line to something that runs from the checkout`;
  }
  return;
}
//@ chunk-mthxbav8.js:103809-104005 placement
var PHP_INI_CODE_LOADING_RE =
  /^(?:auto_prepend_file|auto_append_file|include_path|extension_dir|(?:zend_)?extension|opcache\.(?:preload|file_cache)|ffi\.preload|phar\.cache_list|sendmail_path|sqlite3\.extension_dir)$/;
//@ chunk-mthxbav8.js:104005-104855 placement
function analyzePhpCommand(e, n) {
  let r = findInterpreterScript("php", e, n.rubyAttachedPattern),
    s = typeof r === "object" ? e.indexOf(r) : -1,
    index = e.findIndex((v) => v.text === "--"),
    S =
      typeof r === "object" && s !== -1 && !/^(?:-[fF]|--file)$/.test(e[s - 1]?.text ?? "")
        ? e.slice(0, s)
        : e.filter((v, y) => y !== s && (index === -1 || y < index)),
    w = (v, y) => tildeOperandAt(S, v.replace(/^=/, ""), y);
  return S.some((v, y) => {
    let match = /^(?:-[zc]|--zend-extension=?|--php-ini=?)(.*)$/.exec(v.text);
    if (match !== null) return gt(w(match[1], y), n);
    let match_2 = /^(?:-d|--define=?)(.*)$/.exec(v.text);
    if (match_2 === null) return !1;
    let { value: x } = w(match_2[1], y),
      index = x.indexOf("="),
      trimmed = (index === -1 ? x : x.slice(0, index)).trim(),
      M = index === -1 ? "1" : x.slice(index + 1);
    if (!PHP_INI_CODE_LOADING_RE.test(trimmed)) return !1;
    let q = (T) => gt({ value: T, tildeLiteral: !0 }, n);
    if (trimmed === "include_path") return M.split(":").some(q);
    if (/^(?:zend_)?extension$/.test(trimmed) && !M.includes("/")) return !1;
    return M !== "" && q(M);
  })
    ? "it runs php with -z, -c or a -d setting that loads a file"
    : void 0;
}
//@ chunk-mthxbav8.js:104855-104993 placement
function collectHeredocInput(e, n) {
  let r = [...(e === void 0 ? [] : [e]), ...n.filter((s) => s.op === "<<<").map((s) => s.target.text)];
  return r.length > 0
    ? r.join(`
`)
    : void 0;
}
//@ chunk-mthxbav8.js:104993-105136 placement
function pythonHeredocExecReason(e) {
  return e !== void 0 && xo.test(e)
    ? "it runs python with a heredoc or herestring program that mentions exec, eval or execfile"
    : void 0;
}
//@ chunk-mthxbav8.js:105136-106469 placement
function analyzePythonCommand(e, n, r) {
  let u = findInterpreterScript("python", e, n.rubyAttachedPattern),
    index = e.findIndex((v) => v === u || isEvalFlag("python", v.text));
  if (
    (index === -1 ? e : e.slice(0, e[index] === u ? index : index + 1)).some((v) =>
      /^-[bBdEhIOPqRsSuvVx]*i/.test(v.text),
    )
  )
    return "it runs python with -i";
  let h = !1;
  for (let v = 0; v < e.length; v += 1) {
    let text = e[v].text;
    if (text === "-" || isStdinLikePath(e[v]))
      return h
        ? pythonHeredocExecReason(r)
        : "it runs python with -m, -c or a program on stdin, without -P or -I";
    if (text === "--" && h && (e[v + 1] === void 0 || e[v + 1].text === "-" || isStdinLikePath(e[v + 1])))
      return pythonHeredocExecReason(r);
    if (!text.startsWith("-") || text === "--") return;
    if (text.startsWith("--")) {
      if (text === "--version" || text === "--help") return;
      if (text === "--check-hash-based-pycs") v += 1;
      continue;
    }
    for (let C = 1; C < text.length; C += 1) {
      let O = text[C];
      if (O === "I" || O === "P") {
        if (!n.runsTextHeld) return;
        h = !0;
        continue;
      }
      if (O === "V" || O === "h") return;
      if (O === "W" || O === "X") {
        if (C === text.length - 1) v += 1;
        break;
      }
      if (O === "m") return h ? void 0 : "it runs python with -m, -c or a program on stdin, without -P or -I";
      if (O === "c") {
        let x = C < text.length - 1 ? text.slice(C + 1) : (e[v + 1]?.text ?? "");
        if (!n.runsTextHeld)
          return Mi.test(x) ? "it runs python with -m, -c or a program on stdin, without -P or -I" : void 0;
        if (xo.test(x)) return "it runs python with -c code that mentions exec, eval or execfile";
        return !h && PYTHON_IMPORT_PATTERN.test(x)
          ? "it runs python with -m, -c or a program on stdin, without -P or -I"
          : void 0;
      }
    }
  }
  return h
    ? pythonHeredocExecReason(r)
    : "it runs python with -m, -c or a program on stdin, without -P or -I";
}
//@ chunk-mthxbav8.js:106469-106655 placement
var MAKE_AWK_INCLUDE_RE =
    /^[ \t]*-?(?:s?include|load)[ \t]+(?!=)([^\n]*)$|^[ \t]*\.[ \t]*[ds-]?include[ \t]*("[^\n]*)$|^[ \t]*@(?:include|load)[ \t]*("[^\n]*)$/gm,
  MAKE_OR_AWK_RE = /^(?:[gbp]|gnu)?(?:make|[gnm]?awk)$/i;
//@ chunk-mthxbav8.js:106655-106933 placement
function shebangInterpreter(e) {
  let parts = e.trim().split(/[ \t]+/),
    r = 0;
  if (/(?:^|\/)env$/.test(parts[0] ?? "")) {
    r = 1;
    while (r < parts.length && (parts[r].startsWith("-") || /^[A-Za-z_][A-Za-z0-9_]*=/.test(parts[r])))
      r += /^-[A-Za-z]*[PuC]$|^--(?:unset|chdir)$/.test(parts[r]) ? 2 : 1;
  }
  let s = parts[r] ?? "";
  return s.slice(s.lastIndexOf("/") + 1);
}
//@ chunk-mthxbav8.js:106933-107335 placement
var CLAUDE_PROJECT_DIR_PATTERN = /\bCLAUDE_PROJECT_DIR\b/i,
  cs = /^[ \t]*#.*$/gm,
  BOT_PROTECTED_TENGU_PLUMED_HERON = "bot_protected_tengu_plumed_heron",
  BOT_PROTECTED_TENGU_COMPOSED_FALCON = "bot_protected_tengu_composed_falcon",
  BOT_PROTECTED_TENGU_BANDED_KINGFISHER = "bot_protected_tengu_banded_kingfisher",
  BOT_PROTECTED_TENGU_QUIET_FIELDFARE = "bot_protected_tengu_quiet_fieldfare",
  BOT_PROTECTED_TENGU_MOSSY_CHIPMUNK = "bot_protected_tengu_mossy_chipmunk",
  BOT_PROTECTED_TENGU_SEQUENTIAL_POND = "bot_protected_tengu_sequential_pond",
  TENGU_FEDERATED_HEARTH = "tengu_federated_hearth",
  BOT_PROTECTED_TENGU_GLITTERY_POND = "bot_protected_tengu_glittery_pond",
  BOT_PROTECTED_TENGU_PLAITED_OSIER = "bot_protected_tengu_plaited_osier";
//@ chunk-mthxbav8.js:107335-109001 placement
function analyzeScriptFile(e, n, r, s, u = {}) {
  let str = (e.includes(0) ? Buffer.from(e.filter((P) => P !== 0)) : e).toString("utf8"),
    index = str.indexOf(`
`),
    v = str.startsWith("#!") ? str.slice(2, index === -1 ? void 0 : index) : "",
    y = shebangInterpreter(v),
    C =
      s !== void 0 && s !== null
        ? /^(?:bash|sh|zsh|dash|ash|ksh|mksh|rbash|fish)$/i.test(s)
        : y === "" || Di.test(y) || MAKE_OR_AWK_RE.test(y),
    O = str.startsWith("#!") ? (index === -1 ? "" : str.slice(index + 1)) : str,
    x = u.quotedBackslashKept !== !1,
    R =
      v +
      `
` +
      (C ? stripShellComments(O, x) : str.replace(cs, "")),
    j = normalizeCommandForPlatform(R),
    found = uniq(n)
      .flatMap((P) => pathPrefixes(P, r))
      .find((P) =>
        new RegExp(
          `(?<![\\w./~$-])${urlPatternToRegex(normalizeCommandForPlatform(P))}${P.endsWith("/") ? "" : "(?![\\w.-])"}`,
        ).test(j),
      );
  if (found !== void 0) return `it names ${found.replace('"', "")}`;
  if (CLAUDE_PROJECT_DIR_PATTERN.test(j)) return "it reads $CLAUDE_PROJECT_DIR";
  if (CWD_DEPENDENCE_PATTERN.test(j) || (C && Hi.test(j))) return "it uses its working directory";
  if (u.histcharsHeld !== !1 && Oi.test(str.replace(/\$(?=['"])|\\\n|['"\\]/g, "")))
    return "it names zsh's histchars, which can make zsh run lines that look like comments";
  let lower = (s ?? y).toLowerCase();
  if (
    /^t?csh$/.test(lower) &&
    Array.from(O.matchAll(/^[ \t]*set[ \t]+path[ \t]*=[ \t]*\(([^)\n]*)\)/gm)).some((P) =>
      splitQuotedWords(P[1]).some((L) => L === "." || !/^[\/~$]/.test(L)),
    )
  )
    return "it sets path with the working directory or a relative entry on it";
  let T;
  try {
    let P = {
      roots: uniq(n),
      home: r,
      fromPayload: !1,
      shell: lower,
      quotedBackslashKept: x,
      zshNullCommandHeld: u.zshNullCommandHeld !== !1,
      rubyAttachedPattern: u.rubyAttachedPattern !== !1,
      forNameDo: u.forNameDo !== !1,
      runsTextHeld: u.runsTextHeld !== !1,
      relativeNamedValues: u.relativeNamedValues,
      substitutionHeredocs: u.substitutionHeredocs !== !1,
    };
    T =
      (C ? analyzeCommandText(O, MAKE_OR_AWK_RE.test(shebangInterpreter(v)), P) : void 0) ??
      collectCommandReach(v, P);
  } catch {
    T = "it could not be read as shell";
  }
  if (T !== void 0) return T;
  if (MAKE_OR_AWK_RE.test(shebangInterpreter(v)) && hasRelativeInclude(R))
    return "it includes another build file, plugin or awk source by a relative name";
  return;
}
//@ chunk-mthxbav8.js:109001-109138 placement
function stripShellComments(e, n) {
  let r = [],
    s = 0;
  for (let [u, S] of shellComments(e, { quotedBackslashKept: n })) (r.push(e.slice(s, u)), (s = S));
  return (r.push(e.slice(s)), r.join(""));
}
//@ chunk-mthxbav8.js:109138-109374 placement
function hasRelativeInclude(e) {
  for (let n of e.matchAll(MAKE_AWK_INCLUDE_RE)) {
    let filtered = (n[1] ?? n[2] ?? n[3] ?? "")
      .trim()
      .replace(/^"|"$/g, "")
      .split(/[ \t]+/)
      .filter(Boolean);
    if (filtered.length === 0 || filtered.some((s) => !/^(?:\/|~\/|\$\(HOME\)|\$\{HOME\}|"\/|'\/|<)/.test(s)))
      return !0;
  }
  return !1;
}
//@ chunk-mthxbav8.js:109374-109808 placement
function collectCommandReach(e, n) {
  let r = [],
    s = [];
  for (let command of parseShellCommands(e, { quotedBackslashKept: n.quotedBackslashKept }).commands)
    analyzeCommandReach(command, r, {
      roots: [],
      home: "",
      fromPayload: !1,
      standing: s,
      quotedBackslashKept: n.quotedBackslashKept,
      zshNullCommandHeld: n.zshNullCommandHeld,
      rubyAttachedPattern: n.rubyAttachedPattern,
      forNameDo: n.forNameDo,
      runsTextHeld: n.runsTextHeld,
      substitutionHeredocs: !1,
    });
  return (
    s[0] ?? r.map((u) => analyzeCommandText(u, !1, { ...n, fromPayload: !0 }, 1)).find((u) => u !== void 0)
  );
}
//@ chunk-mthxbav8.js:109808-110592 placement
function analyzeCommandText(e, n, r, s = 0) {
  let { commands: commands, unreadable: unreadable } = parseShellCommands(e, {
      make: n,
      quotedBackslashKept: r.quotedBackslashKept,
      substitutionHeredocs: r.substitutionHeredocs,
    }),
    w = [],
    h = new Set(r.relativeNames);
  for (let { program: program, args: args, assignments: assignments } of commands) {
    let O = /^(?:export|declare|typeset|local|readonly)$/.test(program.text)
      ? [...assignments, ...args]
      : assignments;
    for (let x of O) {
      let match = /^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]+)$/.exec(x.text);
      if (match !== null && !isAbsoluteLike(match[2], nt)) h.add(match[1]);
    }
  }
  for (let v of commands) {
    let y = analyzeCommandReach(v, w, { ...r, make: n, relativeNames: h });
    if (y !== void 0) return y;
  }
  if (unreadable !== null) return `it could not be read to the end as shell (${unreadable})`;
  for (let v of w) {
    let y =
      s >= 3
        ? "it hands shell code to a shell too many layers deep"
        : analyzeCommandText(
            v,
            !1,
            r.relativeNamedValues === !1
              ? { ...r, fromPayload: !0 }
              : { ...r, fromPayload: !0, relativeNames: h },
            s + 1,
          );
    if (y !== void 0) return y;
  }
  return;
}
//@ chunk-mthxbav8.js:110592-110728 placement
var MAX_FORWARDED_HOOKS = 128,
  MAX_FORWARDED_HOOKS_PER_EVENT = Kt,
  MAX_DEVICE_HOOK_TEMPLATES = 8,
  ps = 512,
  MAX_DEVICE_HOOK_TIMEOUT_S = 600,
  HOOK_SOURCE_DESCRIPTIONS = {
    user: "your user settings",
    local: "this folder's settings.local.json",
    flag: "the --settings file",
  };
//@ chunk-mthxbav8.js:110728-110907 placement
function deviceHookKey(e, n, r) {
  let s =
    n.type === "command" ? `${n.shell ?? r}\x00${n.command}\x00${jsonStringify(n.args ?? null)}` : n.url;
  return `${e.event}\x00${e.matcher ?? ""}\x00${n.type}\x00${s}\x00${n.if ?? ""}`;
}
//@ chunk-mthxbav8.js:110907-110967 placement
function Jo(e) {
  return e !== void 0 && e > 0 ? Math.min(e, MAX_DEVICE_HOOK_TIMEOUT_S) : void 0;
}
//@ chunk-mthxbav8.js:110967-111053 placement
async function Nt(e, n) {
  try {
    let realpath = await e.realpath(n);
    return isAbsolutePlatformPath(realpath) ? realpath : n;
  } catch {
    return n;
  }
}
//@ chunk-mthxbav8.js:111053-111359 placement
var SYNC_ROOT_REASONS = { reason: "source_in_sync_root", cause: "the cloud session can change that file" },
  Lt = { reason: "source_in_sync_root", cause: "this machine could not check where that file is" },
  ws = {
    reason: "sync_root_is_config_dir",
    cause: "a directory the cloud session can write on this machine is a Claude config directory",
  };
//@ chunk-mthxbav8.js:111359-112660 placement
async function checkHookSourceReach(e, n) {
  let r = n.opts.sync?.rootReal,
    s = e.source === "local" ? void 0 : n.opts.reachMemory;
  if (
    e.settingsFile === null ||
    (!s?.everInReach.has(e.source) && r === void 0 && n.roots.extraReach.length === 0)
  )
    return null;
  let settingsFile = e.settingsFile,
    S = e.source === "local" ? n.opts.localSettingsLocation : void 0,
    w = S?.current ?? null;
  if (w === null) {
    let q = await resolveForeignSpellingAsync(
      await classifyPathSpelling_2(settingsFile, n.opts.launchDir),
      n.opts.launchDir,
      protectedHomeRoots(),
    );
    if (q.verdict !== "local") return Lt;
    try {
      w = [q.spelling, await n.deps.realpath(q.spelling)];
    } catch {
      return Lt;
    }
    if (S !== void 0) ((S.current ??= w), (w = S.current));
  }
  let mapped = [settingsFile, ...w, ...(s?.knownSpellings.get(e.source) ?? [])].map(
      normalizeCommandForPlatform,
    ),
    v = getPlatform() === "windows",
    y = v ? /[\\/]/ : "/",
    mapped_2 = [
      ...(r !== void 0 ? [r] : []),
      ...(n.opts.sync?.root !== void 0 ? [n.opts.sync.root] : []),
      ...n.roots.extraReach,
    ].map((q) =>
      v
        ? normalizeCommandForPlatform(q).replace(/[\\/]+$/, "") || "/"
        : normalizeCommandForPlatform(q.replace(/\/+$/, "") || "/"),
    );
  if (mapped_2.some((q) => mapped.some((T) => !M2(T, q) && K$e(T, q)))) return Lt;
  let filtered = mapped_2.filter((q) => mapped.some((T) => M2(T, q))),
    flattened = mapped.flatMap((q) =>
      filtered.flatMap((T) => (M2(q, T) ? [q === T ? "" : q.slice(T === "/" ? 1 : T.length + 1)] : [])),
    );
  if (flattened.length === 0) return s?.everInReach.has(e.source) ? Lt : null;
  let R = uniq([n.roots.configHomeReal, n.opts.configHome].map(normalizeCommandForPlatform));
  if (
    filtered.some((q) => R.some((T) => q === T || K$e(q, T) || K$e(T, q)) || q.split(y).includes(".claude"))
  )
    return ws;
  let all = flattened.every((q) => q.split(y).some((T) => T.startsWith(".")));
  return e.source === "local" && all ? null : SYNC_ROOT_REASONS;
}
/**
 * 把 {hooks:{事件:[matcher]}} 展平成 {source, event, matcher, hook} 列表。
 */
//@ chunk-mthxbav8.js:112660-112810 placement = convertToHookMatchers (0.839)
function flattenHookEntries(sessionMatchers) {
  return Object.entries(sessionMatchers.hooks).flatMap(([n, r]) =>
    (r ?? []).flatMap((sm) =>
      sm.hooks.map((hook) => ({ source: sessionMatchers, event: n, matcher: sm.matcher, hook: hook })),
    ),
  );
}
//@ chunk-mthxbav8.js:112810-112927 placement
function isSimpleScriptCommand(e, n) {
  let parts = e.trim().split(/ +/);
  return n === null ? parts.length === 1 : (n === "python3" || n === "python") && parts.length === 2;
}
//@ chunk-mthxbav8.js:112927-112964 placement
function ys(e) {
  return HOOK_EVENTS.includes(e);
}
//@ chunk-mthxbav8.js:112964-113008 placement
var vs = new Set(["/usr/bin/env", "/bin/env"]);
//@ chunk-mthxbav8.js:113008-113703 placement
function readShebang(e) {
  let str = e.subarray(0, 512).toString("utf8");
  if (!str.startsWith("#!")) return null;
  let index = str.indexOf(`
`),
    parts = str
      .slice(2, index === -1 ? void 0 : index)
      .replace(/^[ \t]+|[ \t]+$/g, "")
      .split(/[ \t]+/),
    u = parts[0];
  if (u === void 0 || u === "") return null;
  if (parts.some((v) => /[^\x21-\x7e]/.test(v))) return "unjudgeable";
  if (!u.startsWith("/") || DOT_DOT_SEGMENT_RE.test(u)) return "unjudgeable";
  let S = xqs;
  if (!vs.has(normalizeCommandForPlatform(posix.normalize(u))))
    return parts.slice(1).every(S) ? posix.normalize(u) : "unjudgeable";
  let w = parts[1] === "-S" ? parts.slice(2) : parts.slice(1),
    h = w[0];
  if (h === void 0 || h.startsWith("-") || h.includes("=") || !w.slice(1).every(S)) return "unjudgeable";
  if (h.startsWith("/")) return DOT_DOT_SEGMENT_RE.test(h) ? "unjudgeable" : posix.normalize(h);
  return /^[\w.+-]+$/.test(h) ? null : "unjudgeable";
}
//@ chunk-mthxbav8.js:113703-113857 placement
var DOT_DOT_SEGMENT_RE = /(?:^|\/)\.\.(?:\/|$)/,
  SAFE_DEVICE_PATH_RE =
    /^\/dev\/(?:null|zero|full|u?random|tty\d*|pts(?:\/.*)?|ptmx|std(?:in|out|err)|fd(?:\/.*)?|dtracehelper|autofs_nowait)$/;
//@ chunk-mthxbav8.js:113857-113891 placement = filterManagedDisabledPlugins (1)
function filterManagedDisabledPlugins(plugins) {
  return plugins === "local";
}
/**
 * 判定一个钩子是否能在设备上执行（held/run 等），检查事件、命令可达路径、同步根与证明。
 */
//@ chunk-mthxbav8.js:113891-121853 placement
async function decideDeviceHook(e, n, r = !1, s = !1) {
  if (!hee(e.event))
    return { kind: "held", reason: `event_${(ys(e.event) ? BZs(e.event) : null) ?? "container_internal"}` };
  let { hook: hook } = e;
  if (hook.type !== "command" && hook.type !== "http") return { kind: "held", reason: "kind_unsupported" };
  let S = filterManagedDisabledPlugins(e.source.source),
    w = hook.cloud === "device" && !S,
    h = hook.cloud === "device" && S ? ' Its "cloud": "device" mark is ignored in settings.local.json.' : "",
    v = `"${He(hook)}" in ${HOOK_SOURCE_DESCRIPTIONS[e.source.source]} does not run for cloud work`,
    y = WZs(e.event, e.matcher);
  if (r) return y ? { kind: "held", reason: "after_edit" } : { kind: "forward", event: e.event, hook: hook };
  let { hooksFolderInReach: hooksFolderInReach } = n,
    O = hooksFolderInReach || S ? "" : " Check the script, then move it to ~/.claude/hooks.";
  if (y && hook.cloud === "skip") return { kind: "held", reason: "after_edit" };
  if (hook.cloud === "skip")
    return {
      kind: "held",
      reason: "author_skip",
      notice: `${v}: its entry is marked "cloud": "skip" or a value this version does not know.`,
    };
  let x,
    R,
    j,
    M = !1,
    q = !1,
    T = !1,
    P = !1,
    L = !1,
    N,
    F,
    X =
      y && w
        ? `${v}: cloud edits change files in the cloud.${n.opts.inRepository ? " Put the hook in the repository's .claude/settings.json." : ""}`
        : void 0;
  if (hook.type === "command") {
    let B = await classifyDeviceHookReach(hook, n.reach, n.deps, { resolved: n.resolved });
    if (
      ((q = B.kind === "opaque" && B.reason === "private_dotdir"),
      (T = B.kind === "opaque" && B.reason === "shell_prefix"),
      (P = B.kind === "opaque" && (B.reason === "unsupported_platform" || B.reason === "unsupported_shell")),
      B.kind === "unverifiable")
    )
      ((M = !0),
        (R = {
          kind: "held",
          reason: "unverifiable_target",
          notice: `${v}: ${B.missing ? "its script is missing" : "this machine could not verify its script"}.`,
          ...(B.missing && { cause: "script_missing" }),
        }));
    else if (B.kind === "script_in_reach" || B.kind === "script_outside_reach") {
      M = !0;
      let Q = B.kind === "script_in_reach";
      if (((x = B.pinnedTarget), Q && !w))
        j = {
          kind: "held",
          reason: "in_reach",
          notice: `${v}: the cloud session can change the hook's script.${O}${h}`,
          ...(hooksFolderInReach && { noRemedy: !0 }),
        };
      let ee = commandReachRoots(n.reach),
        D = [
          ...(B.site.form === "exec" && B.site.slot === "arg0" && hook.command.startsWith("/")
            ? [DOT_DOT_SEGMENT_RE.test(hook.command) ? "unjudgeable" : posix.normalize(hook.command)]
            : []),
          ...(B.interpreter === null ? [readShebang(B.bytes)].filter((z) => z !== null) : []),
        ],
        G;
      for (let z of D) {
        if (z === "unjudgeable") {
          G = "this machine cannot check the interpreter the hook names";
          break;
        }
        let K = await resolveForeignSpellingAsync(
            await classifyPathSpelling_2(z, n.opts.launchDir),
            n.opts.launchDir,
            protectedHomeRoots(),
          ),
          re = K.verdict === "local" ? await n.deps.realpath(K.spelling).catch(() => null) : null;
        if (re === null) {
          G = `its interpreter ${sanitizeDisplayText(z, { maxCodeUnits: 200 })} could not be located on this machine`;
          break;
        }
        if ([z, re].some((ne) => ee.some((ae) => D4e(ne, ae)))) {
          G = `the cloud session can change its interpreter ${sanitizeDisplayText(z, { maxCodeUnits: 200 })}`;
          break;
        }
      }
      if (G === void 0 && B.interpreter === null) {
        let z = readShebang_2(B.bytes);
        if (z !== null && (z === "unjudgeable" || (z.kind !== "absolute" && z.kind !== "env")))
          G = "its interpreter may load code the cloud session can change";
      }
      if (G !== void 0 && !Q)
        if (w) L = !0;
        else
          j = {
            kind: "held",
            reason: "interpreter_unvouched",
            notice: `${v}: ${G}.${S ? "" : " Use bash, python3 or node from your PATH."}${h}`,
          };
      if (((L = L || (Q && w)), !Q)) {
        let z = readFlagWithOverride(BOT_PROTECTED_TENGU_GLITTERY_POND, { safe: !0 }),
          K = analyzeScriptFile(
            B.bytes,
            [
              n.reach.launchDir,
              n.reach.launchDirReal,
              ...(n.reach.sync !== void 0
                ? [n.reach.sync.rootReal, ...(n.reach.sync.root !== void 0 ? [n.reach.sync.root] : [])]
                : []),
              ...n.reach.extraReach,
            ].filter((re) => !SAFE_DEVICE_PATH_RE.test(re)),
            n.deps.home,
            B.interpreter,
            {
              quotedBackslashKept: readFlagWithOverride(BOT_PROTECTED_TENGU_PLUMED_HERON, { safe: !0 }),
              zshNullCommandHeld: readFlagWithOverride(BOT_PROTECTED_TENGU_COMPOSED_FALCON, { safe: !0 }),
              histcharsHeld: readFlagWithOverride(BOT_PROTECTED_TENGU_BANDED_KINGFISHER, { safe: !0 }),
              rubyAttachedPattern: readFlagWithOverride(BOT_PROTECTED_TENGU_QUIET_FIELDFARE, { safe: !0 }),
              forNameDo: readFlagWithOverride(BOT_PROTECTED_TENGU_MOSSY_CHIPMUNK, { safe: !0 }),
              runsTextHeld: readFlagWithOverride(BOT_PROTECTED_TENGU_SEQUENTIAL_POND, { safe: !0 }),
              relativeNamedValues: z,
              substitutionHeredocs: readFlagWithOverride(BOT_PROTECTED_TENGU_PLAITED_OSIER, { safe: !0 }),
            },
          );
        if (K !== void 0 && !w && j === void 0)
          j = {
            kind: "held",
            reason: "loads_from_reach",
            notice: `${v}: its script may load files the cloud session can change. ${(z ? sanitizeDisplayText(K, { maxCodeUnits: 400 }) : K).replace(/^it /, "The script ")}.${h}`,
          };
        else if (K !== void 0 && w) L = !0;
      }
      if (w && n.opts.optInPins !== void 0) {
        let z = `${B.pinnedTarget.realPath}\x00${B.pinnedTarget.sha256}`,
          K = n.opts.optInPins.get(B.pinnedTarget.path);
        if (K === void 0 || (!Q && K !== z)) n.opts.optInPins.set(B.pinnedTarget.path, z);
        else if (K !== z)
          ((R = {
            kind: "held",
            reason: "unverifiable_target",
            notice: `${v}: its script changed and the cloud session can write to it. Check the file, then restart claude --cloud.`,
          }),
            (x = void 0),
            (L = !1));
      }
      let Y = s ? void 0 : (n.deps.findTemplateByDigest ?? findTemplateByDigest)(B.pinnedTarget.sha256),
        Z = w && !y ? void 0 : Y;
      if (
        w &&
        Y !== void 0 &&
        hook.args === void 0 &&
        !hook.if &&
        !hook.async &&
        !hook.asyncRewake &&
        !hook.once &&
        isSimpleScriptCommand(hook.command, B.interpreter)
      )
        N = Y.template.id;
      if (Z) {
        let { template: template, label: label } = Z,
          included = (n.opts.refusedTemplateIds ?? []).includes(template.id),
          ne = !included && (n.opts.enabledTemplateIds ?? hookTemplateIds()).includes(template.id);
        if (included)
          X = y
            ? `${template.filename} is an after-edit hook, so it is not forwarded either: it does not run for this cloud session, only in local ones.`
            : void 0;
        else if (!ne)
          X = y
            ? `${template.filename} is not run in the cloud in this version, and as an after-edit hook it is not forwarded either, so it only runs in local sessions.`
            : `${template.filename} is not run in the cloud in this version; it runs on this machine instead.`;
        else if (template.event !== e.event)
          X = `${template.filename} is configured on ${e.event}; the cloud runs it only on ${template.event}, so it runs on this machine instead.`;
        else if (label === "legacy" && !n.opts.allowLegacyTemplateDigests)
          X = `${template.filename} is an older copy of ${template.id}; the cloud will not run it. Update it.`;
        else if (
          hook.args !== void 0 ||
          hook.if ||
          hook.async ||
          hook.asyncRewake ||
          hook.once ||
          !isSimpleScriptCommand(hook.command, B.interpreter)
        )
          X = `${template.filename} is run in a way the cloud cannot reproduce (arguments, a condition, async or once), so it runs on this machine instead.`;
        else if (e.matcher !== void 0 && !znt(e.matcher) && (!zo(e.matcher) || !qVe.test(e.matcher)))
          X = void 0;
        else if (!isMatcherSubset(e.matcher, template.matcher))
          X = `${template.filename} is configured with the matcher "${sanitizeDisplayText(e.matcher ?? "", { maxCodeUnits: 200 })}" and the cloud runs it on "${template.matcher}", so it runs on this machine instead.`;
        else {
          let ae = Jo(hook.timeout);
          F = {
            entry: {
              wire: {
                template: template.id,
                digest: B.pinnedTarget.sha256,
                event: e.event,
                ...(!znt(e.matcher) && { matcher: e.matcher }),
                ...(ae !== void 0 && { timeout_s: ae }),
              },
              local: {
                templateId: template.id,
                label: label,
                scriptRealPath: B.pinnedTarget.realPath,
                bytes: B.bytes,
                userMatcher: e.matcher,
                source: e.source.source,
              },
            },
            ...(label === "legacy" && {
              legacyNotice: `${template.filename} is an older copy of ${template.id}; the cloud will run that copy. Update it to get fixes.`,
            }),
            ...(e.matcher !== void 0 &&
              !znt(e.matcher) &&
              !isMatcherSubset(template.matcher, e.matcher) && {
                narrowNotice: `${template.filename} is configured with the matcher "${sanitizeDisplayText(e.matcher, { maxCodeUnits: 200 })}"; in the cloud it runs on "${template.matcher}" only.`,
              }),
          };
        }
        if (F === void 0 && y && ne)
          X = `${(X ?? `${template.filename} cannot move to the cloud here.`).replace(/(?:, so|; it) (?:it )?runs on this machine instead\.$/, ".").replace(/\.$/, "")}, and as an after-edit hook it is not forwarded either: it runs in local sessions only.`;
      }
    }
  }
  if (F !== void 0) {
    let joined = [F.legacyNotice, F.narrowNotice].filter((Q) => Q !== void 0).join(" ");
    return {
      kind: "template",
      entry: F.entry,
      event: e.event,
      hook: hook,
      ...(joined !== "" && { notice: joined }),
    };
  }
  if (y) return { kind: "held", reason: "after_edit", ...(X !== void 0 && { notice: X }) };
  if (R !== void 0) return R;
  if (e.matcher !== void 0 && !zo(e.matcher)) return { kind: "held", reason: "over_cap" };
  if (e.matcher !== void 0 && !znt(e.matcher) && !qVe.test(e.matcher))
    return {
      kind: "held",
      reason: "pattern_matcher",
      notice: `"${He(hook)}" does not run for cloud work: cloud sessions cannot take the pattern matcher "${sanitizeDisplayText(e.matcher, { maxCodeUnits: 200 })}".${S ? "" : ` List the names to match${TOOL_HOOK_EVENTS.has(e.event) ? `, such as ${BASH_TOOL_NAME}|${FILE_READ_TOOL_NAME}` : ""}.`}`,
    };
  if (j !== void 0) return j;
  if (hook.type === "command" && !M) {
    if (!w)
      return {
        kind: "held",
        reason: "unpinned_command",
        notice: T
          ? `${v}: it would run through your CLAUDE_CODE_SHELL_PREFIX, which this machine cannot verify.${e.source.source === "user" ? ' Marked "cloud": "device", it runs on this machine, unverified, when the cloud session asks.' : ""}${h}`
          : q
            ? `${v}: its script is in a dot-folder this machine does not read hooks from.${O}${h}`
            : `${v}: this machine cannot verify what the command runs.${hooksFolderInReach || P || S ? "" : " Put the command in one script in ~/.claude/hooks."}${h}`,
        ...(T ? { cause: "shell_prefix" } : q && { cause: "dot_folder" }),
        ...((hooksFolderInReach || P) && { noRemedy: !0 }),
      };
    L = !0;
  }
  return {
    kind: "forward",
    event: e.event,
    hook: hook,
    ...(x !== void 0 && { pinnedTarget: x }),
    ...(L && { authorOptIn: !0 }),
    ...(w && { cloudDevice: !0 }),
    ...(N !== void 0 && { templateTwinId: N }),
    ...(X !== void 0 && { notice: X }),
  };
}
//@ chunk-mthxbav8.js:121853-121916 placement
function zo(e) {
  return e.length <= ps && !/[\p{Cc}\p{Cf}]/u.test(e);
}
//@ chunk-mthxbav8.js:121916-121998 placement
function Ko(e) {
  return `${e} is configured more than once; the cloud runs it once.`;
}
//@ chunk-mthxbav8.js:121998-122137 placement
function createDeviceHookAttestations() {
  return {
    forwarded: [],
    templates: [],
    held: [],
    heldCounts: { after_edit: 0, kind_unsupported: 0, plugin: 0, managed: 0, other: 0 },
    notices: [],
  };
}
/**
 * 收集本机所有钩子的证明信息（可转发/被扣留的原因），供远程会话使用。
 */
//@ chunk-mthxbav8.js:122137-127931 placement
async function collectDeviceHookAttestations(e, n, r) {
  let s = createDeviceHookAttestations();
  if (e.kind === "none") return s;
  let u = {
      launchDirReal: await Nt(r, n.launchDir),
      projectDirReal: await Nt(r, n.projectDir),
      configHomeReal: await Nt(r, n.configHome),
      extraReach: uniq(
        (
          await Promise.all(
            [...(n.repoRoot !== void 0 ? [n.repoRoot] : []), ...(n.extraReachRoots ?? [])].map(async (P) => {
              let L = await resolveForeignSpellingAsync(
                await classifyPathSpelling_2(P, n.launchDir),
                n.launchDir,
                protectedHomeRoots(),
              );
              return L.verdict === "local"
                ? [P, await Nt(r, L.spelling)]
                : L.verdict === "foreign"
                  ? [L.spelling]
                  : [P, ...spellingsToCheck(L, n.launchDir)];
            }),
          )
        ).flat(),
      ),
    },
    S = {
      launchDir: n.launchDir,
      launchDirReal: u.launchDirReal,
      configHomeReal: u.configHomeReal,
      projectDir: n.projectDir,
      projectDirReal: u.projectDirReal,
      ...(n.sync !== void 0 && { sync: n.sync }),
      extraReach: u.extraReach,
    },
    w = {
      opts: n,
      deps: r,
      roots: u,
      reach: S,
      resolved: new Map(),
      hooksFolderInReach: pathWithinReach([posix.join(r.home, ".claude", "hooks")], S),
    },
    h = (P, L, { cause: N, noRemedy: F } = {}) => {
      if (
        (s.held.push({
          event: P.event,
          ...(P.matcher !== void 0 && { matcher: sanitizeDisplayText(P.matcher, { maxCodeUnits: 200 }) }),
          source: P.source.source,
          command: He(P.hook),
          reason: L,
          ...(N !== void 0 && { cause: N }),
          ...((F ||
            filterManagedDisabledPlugins(P.source.source) ||
            (L === "after_edit" && !n.inRepository)) && { noRemedy: !0 }),
        }),
        L === "after_edit")
      )
        s.heldCounts.after_edit += 1;
      else if (L === "kind_unsupported") s.heldCounts.kind_unsupported += 1;
      else s.heldCounts.other += 1;
    },
    v = new Set(),
    y = (P) => {
      if (P !== void 0 && !v.has(P)) (v.add(P), s.notices.push(P));
    },
    C = (P) => {
      if (v.delete(P)) s.notices = s.notices.filter((notice) => notice !== P);
    },
    O = new Map(),
    x = new Map(),
    R = new Map(),
    j = new Set(),
    M = new Set(),
    q = new Map();
  if (
    [n.launchDir, n.configHome, n.sync?.rootReal, n.sync?.root, ...(n.extraReachRoots ?? [])].some(
      (P) => P !== void 0 && !isAbsolutePlatformPath(P),
    )
  ) {
    y(
      "Hooks stay on this machine: its launch, config or sync directory is not an absolute path this version can place, so none are offered to the cloud session.",
    );
    for (let source of e.sources) for (let L of flattenHookEntries(source)) h(L, "unverifiable_target");
    return s;
  }
  for (let source of e.sources) {
    let L = await checkHookSourceReach(source, w),
      N = flattenHookEntries(source);
    if (L !== null && N.length > 0)
      y(
        `Hooks from ${sanitizeDisplayText(source.settingsFile ?? "", { maxCodeUnits: 200 })} are not offered to the cloud session: ${L.cause}.`,
      );
    for (let F of N) {
      let X = await decideDeviceHook(F, w, L !== null);
      if (L !== null) {
        h(
          F,
          X.kind === "held" &&
            (X.reason.startsWith("event_") || X.reason === "kind_unsupported" || X.reason === "after_edit")
            ? X.reason
            : L.reason,
          { noRemedy: !0 },
        );
        continue;
      }
      if (X.kind === "held") {
        (y(X.notice), h(F, X.reason, X));
        continue;
      }
      let B = X;
      if (B.kind === "template") {
        let { entry: entry } = B,
          ae = deviceHookKey(F, B.hook, r.defaultShell),
          ie = q.get(entry.local.templateId),
          ce = x.get(ae),
          oe = ie !== void 0 && (ie.site.matcher ?? "") === (F.matcher ?? ""),
          V = ie !== void 0 ? oe : s.templates.length < MAX_DEVICE_HOOK_TEMPLATES;
        if (ce !== void 0 && V) {
          if ((h(ce.site, "duplicate"), j.add(ce.index), ce.notice !== void 0)) C(ce.notice);
          x.delete(ae);
        }
        if (ie !== void 0 && !oe) {
          if (((B = await decideDeviceHook(F, w, !1, !0)), B.kind === "held")) {
            (h(F, B.reason, B), y(B.notice));
            continue;
          }
        } else if (ie !== void 0) {
          h(ie.site, "duplicate");
          let te = deviceHookKey(ie.site, ie.hook, r.defaultShell);
          if (te !== ae) R.delete(te);
          if (
            (R.set(ae, { index: ie.index, templateId: entry.local.templateId }),
            (s.templates[ie.index] = entry),
            ie.notice !== void 0)
          )
            C(ie.notice);
          (q.set(entry.local.templateId, {
            index: ie.index,
            site: F,
            hook: B.hook,
            ...(B.notice !== void 0 && { notice: B.notice }),
          }),
            y(Ko(entry.local.templateId)),
            y(B.notice));
          continue;
        } else if (s.templates.length >= MAX_DEVICE_HOOK_TEMPLATES) {
          (h(F, "over_cap"),
            y(
              `Only ${MAX_DEVICE_HOOK_TEMPLATES} templates can run in the cloud session; the rest stay on this machine.`,
            ));
          continue;
        } else {
          (q.set(entry.local.templateId, {
            index: s.templates.length,
            site: F,
            hook: B.hook,
            ...(B.notice !== void 0 && { notice: B.notice }),
          }),
            R.set(ae, { index: s.templates.length, templateId: entry.local.templateId }),
            s.templates.push(entry),
            y(B.notice));
          continue;
        }
      }
      if (B.kind !== "forward") continue;
      let Q = B,
        ee = Jo(Q.hook.timeout),
        D = {
          wire: {
            id: "",
            event: F.event,
            ...(!znt(F.matcher) && { matcher: F.matcher }),
            kind: Q.hook.type,
            ...(ee !== void 0 && { timeout_s: ee }),
            source: source.source,
            ...(Q.hook.if && { has_condition: !0 }),
            ...(Q.pinnedTarget !== void 0 && { target_pinned: !0 }),
            ...((Q.authorOptIn || (Q.cloudDevice && Q.hook.type === "command")) && { author_opt_in: !0 }),
          },
          local: {
            hook: Q.hook,
            matcher: F.matcher,
            event: Q.event,
            source: source.source,
            ...(Q.pinnedTarget !== void 0 && { pinnedTarget: Q.pinnedTarget }),
            ...(Q.cloudDevice && { cloudOptIn: !0 }),
            ...(Q.templateTwinId !== void 0 && { templateTwinId: Q.templateTwinId }),
          },
        },
        G = deviceHookKey(F, Q.hook, r.defaultShell),
        Y = R.get(G),
        Z = (O.get(F.event) ?? 0) < MAX_FORWARDED_HOOKS_PER_EVENT,
        z = x.has(G) || (s.forwarded.length < MAX_FORWARDED_HOOKS && Z);
      if (Y !== void 0 && z) {
        let ne = q.get(Y.templateId);
        if (ne !== void 0 && ne.index === Y.index) {
          if ((h(ne.site, "duplicate"), ne.notice !== void 0)) C(ne.notice);
          (C(Ko(Y.templateId)), q.delete(Y.templateId));
        }
        (M.add(Y.index), R.delete(G));
      }
      let K = x.get(G);
      if (K !== void 0) {
        h(K.site, "duplicate");
        let id = s.forwarded[K.index].wire.id;
        if (((s.forwarded[K.index] = { ...D, wire: { ...D.wire, id: id } }), K.notice !== void 0))
          C(K.notice);
        (x.set(G, { index: K.index, site: F, ...(Q.notice !== void 0 && { notice: Q.notice }) }),
          y(Q.notice));
        continue;
      }
      if (s.forwarded.length >= MAX_FORWARDED_HOOKS) {
        (h(F, "over_cap"),
          y(
            `Only the first ${MAX_FORWARDED_HOOKS} hooks are offered to the cloud session; the rest stay on this machine.`,
          ));
        continue;
      }
      if (!Z) {
        (h(F, "over_cap"),
          y(
            `Only the first ${MAX_FORWARDED_HOOKS_PER_EVENT} ${F.event} hooks are offered to the cloud session; the rest stay on this machine.`,
          ));
        continue;
      }
      let re = O.get(F.event) ?? 0;
      (O.set(F.event, re + 1),
        x.set(G, { index: s.forwarded.length, site: F, ...(Q.notice !== void 0 && { notice: Q.notice }) }),
        y(Q.notice),
        s.forwarded.push({ ...D, wire: { ...D.wire, id: formatDeviceHookId(n.instanceId, F.event, re) } }));
    }
  }
  ((s.forwarded = s.forwarded.filter((P, L) => !j.has(L))),
    (s.templates = s.templates.filter((template, L) => !M.has(L))));
  let T = new Map(
    s.templates.map((template) => [
      `${template.wire.template}\x00${template.wire.event}`,
      template.wire.template,
    ]),
  );
  return (
    (s.forwarded = s.forwarded.filter((P) => {
      let templateTwinId = P.local.templateTwinId,
        N = templateTwinId === void 0 ? void 0 : T.get(`${templateTwinId}\x00${P.wire.event}`);
      if (
        templateTwinId === void 0 ||
        N === void 0 ||
        !isMatcherSubset(getHookTemplate(templateTwinId)?.matcher ?? "", P.local.matcher ?? "*")
      )
        return !0;
      return (
        s.held.push({
          event: P.wire.event,
          ...(P.local.matcher !== void 0 && {
            matcher: sanitizeDisplayText(P.local.matcher, { maxCodeUnits: 200 }),
          }),
          source: P.local.source,
          command: He(P.local.hook),
          reason: "duplicate",
        }),
        (s.heldCounts.other += 1),
        y(
          `"${He(P.local.hook)}" is the same script the cloud already runs as ${N}; it is not also run on this machine.`,
        ),
        !1
      );
    })),
    s
  );
}
//@ chunk-mthxbav8.js:127931-128016 placement
function attestationFor(e) {
  let n = Cye(e);
  return n === void 0 ? void 0 : { attestation: n, heldBack: PTe(n) };
}
//@ chunk-mthxbav8.js:128016-128269 placement
function heldHooksNotice(e) {
  let n = e.forwarded + e.templateNames.length;
  return `${n === 1 ? "One of your hooks" : `${n} of your hooks`} could run for cloud sessions started from this machine \u2014 run /hooks to decide (nothing from this machine runs for them until you do).`;
}
//@ chunk-mthxbav8.js:128269-128335 placement
function shellPrefixOf(e) {
  return e.CLAUDE_CODE_SHELL_PREFIX?.trim() || void 0;
}
//@ chunk-mthxbav8.js:128335-128348 placement
var Qo = 30000;
//@ chunk-mthxbav8.js:128348-128709 placement
function resolveConfigFile(
  e,
  n,
  r = async (s) => ({ real: await realpath_2(s), aliased: await isSuspiciousHardLinkedFile(s) }),
) {
  let s = {
    path: e,
    real: null,
    env: n === void 0 ? void 0 : { ...n },
    locate: () => {
      ((s.retryAt = void 0),
        r(e).then(
          ({ real: real, aliased: aliased }) => {
            if (((s.real = aliased ? "unresolvable" : real), aliased)) s.retryAt = Date.now() + Qo;
          },
          (u) => {
            if (((s.real = "unresolvable"), u?.code !== "ENOENT" && u?.code !== "ENOTDIR"))
              s.retryAt = Date.now() + Qo;
          },
        ));
    },
  };
  return (s.locate(), s);
}
//@ chunk-mthxbav8.js:128709-128786 placement
function Ts(e, n = Date.now()) {
  if (e.retryAt !== void 0 && n >= e.retryAt) e.locate?.();
}
//@ chunk-mthxbav8.js:128786-128894 placement
function legacyConfigFileOf(e) {
  return (
    (e.legacyConfigFile ??= resolveConfigFile(getGlobalClaudeFile(), Pqs(e, getAppliedGlobalConfigEnv()))),
    Ts(e.legacyConfigFile),
    e.legacyConfigFile
  );
}
//@ chunk-mthxbav8.js:128894-129273 placement
function settingsEnvInReach(e, n, r = (s) => getSettingsForSource(s)?.env) {
  let s = (S) =>
      e.pinnedScopes.has(S) ||
      (S === "userSettings" && e.everInReach.has("user")) ||
      (S === "flagSettings" && e.everInReach.has("flag")),
    u =
      n.env !== void 0 &&
      typeof n.real === "string" &&
      n.real !== "unresolvable" &&
      isAbsolute(n.path) &&
      !m_([n.path, n.real], [...e.stickyRoots]);
  return Object.assign(
    {},
    u ? n.env : {},
    ...SETTING_SOURCES.filter((S) => !REPO_DIR_SETTING_SOURCES.has(S) && !s(S)).map((S) =>
      settingsEnvForHookChild(r(S), S),
    ),
  );
}
//@ chunk-mthxbav8.js:129273-129304 placement
function projectConfigRootOr(e) {
  return getProjectConfigRoot() ?? e;
}
//@ chunk-mthxbav8.js:129304-129389 placement
function unrefTimeout(e, n) {
  let r = setTimeout(e, n);
  return (r.unref(), { clear: () => clearTimeout(r) });
}
//@ chunk-mthxbav8.js:129389-129658 placement
function isHookForwardingEnabled() {
  if (!(
    getPlatform() !== "windows" &&
    isViolinWoodEnabledCached() &&
    isViolinAmatiEnabledCached() &&
    !env.CLAUDE_CODE_DISABLE_HOOK_FORWARDING
  ))
    return !1;
  if (isViolinWillowEnabledCached()) {
    if (!alwaysTrue()) return !0;
    return (logEvent("tengu_device_hooks_shelved", { side: fromEnum("client") }), !1);
  }
  return (
    logEvent("tengu_device_hooks_kept_back", {
      flag: fromEnum(VIOLIN_WILLOW_FLAG),
      own_flags_loaded: hasFreshGrowthBookFeatures(),
    }),
    !1
  );
}
//@ chunk-mthxbav8.js:129658-130516 placement
function createForwardedHookHandler(e) {
  let n = null,
    r = !1,
    s = new Set();
  return {
    state: () => n,
    setState(u) {
      n = r ? null : u;
    },
    async handleForwardedHook(u) {
      if (r) return;
      try {
        let serve = await e.servicer.serve(u, n);
        if (r) return;
        if (serve.kind === "silent") {
          if (serve.reason === "not_mine" || serve.reason === "no_state" || serve.reason === "withdrawn")
            e.release(u.requestId);
          return;
        }
        e.respond(u.requestId, serve.answer);
      } catch (error) {
        if ((e.logError(error), parseDeviceHookId(u.callbackId)?.event === "PreToolUse" && !r))
          try {
            e.respond(u.requestId, {
              hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "deny",
                permissionDecisionReason:
                  "A hook on your machine could not be run for this call (internal error); retry",
              },
            });
          } catch {}
      }
    },
    handleCancelled(u, S) {
      if (r || !e.servicer.cancel(u, S) || S !== "worker") return;
      for (let w of s) w();
    },
    onStoppedWhileRunning(u) {
      return (s.add(u), () => s.delete(u));
    },
    async dispose() {
      ((r = !0), (n = null), s.clear(), e.servicer.cancelAll(), await e.staging.dispose());
    },
  };
}

export {
  isHookForwardingEnabled,
  settingsEnvInReach,
  legacyConfigFileOf,
  collectDeviceHookAttestations,
  projectConfigRootOr,
  shellPrefixOf,
  unrefTimeout,
  pathWithinReach,
  commandReachesPath,
  commandReachRoots,
  TENGU_FEDERATED_HEARTH,
  attestationFor,
  createForwardedHookHandler,
  heldHooksNotice,
};
