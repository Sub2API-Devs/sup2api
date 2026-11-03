/**
 * utils/hooks/deviceHooks/commandReach.ts
 *
 * 2.1.316 新增：设备钩子命令可达路径分析与执行判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mthxbav8.js (82)
 * attribution: placement 82
 */
import { posix, isAbsolute } from "path";
import { realpath } from "fs/promises";
import { isAbsolutePlatformPath, normalizeCommandForPlatform } from "../../git.js";
import { logForDebugging } from "../../debug.js";
import {
  POSIX_SEP_2,
  isReachableOrSamePath,
  analyzeHookCommand,
  classifyScriptLocation,
  checkScriptFile,
  isSameCommandPath,
  isPathUnderForPlatform,
  readShebang as readShebang_2,
} from "../hookCommandAnalysis.js";
import { sanitizeDisplayText } from "../../resultError.js";
import { getContentFieldValue } from "../../../components/hooks/ViewHookMode.js";
import {
  commandBaseName,
  isPlainArgument,
  isLauncherCommand,
  isAnchoredPath,
  normalizeInterpreterName,
  isPathWord,
  BUILD_TOOL_PROGRAMS,
  VERSION_OR_HELP_FLAG_RE,
  SHELL_PROGRAMS,
  SCRIPT_INTERPRETERS,
  isKnownInterpreter,
  isAbsoluteLike,
  PATH_PREFIX_CHARS_RE,
  EXTENSION_INTERPRETERS,
  parseShellWords,
  BUILD_SUBCOMMANDS,
  isEvalFlag,
  parseShellCommands,
  INTERPRETER_EVAL_FLAGS,
  splitQuotedWords,
  isToolEnvVar,
  TOOL_ENV_EXACT_RE,
  SCRIPT_PATH_RE,
  EXEC_OR_EVAL_RE,
  IMPORT_OR_EXEC_RE,
  PYTHON_IMPORT_PATTERN,
  SHELL_NAME_RE,
  pathPrefixes,
  CWD_DEPENDENCE_PATTERN,
  PWD_REFERENCE_RE,
  HISTCHARS_RE,
  shellComments,
} from "./shellReader.js";
import { hasAnyShortFlagChar } from "../../bash/parser.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { tildeOperandAt } from "../../bash/shellQuote.js";
import { firstLineOf, urlPatternToRegex } from "../../stringUtils.js";
import { uniq } from "../../collections.js";
import { COMMAND_WRAPPERS } from "./vouching.js";
import { BUILD_TOOL_ENV_VARS } from "../../git/builderGit/gitEnv.js";
import { MAX_HOOKS_PER_EVENT } from "./runDeviceHook.js";
import { jsonStringify } from "../../slowOperations.js";
import {
  resolveForeignSpellingAsync,
  classifyPathSpelling_3,
  spellingsToCheck,
} from "../../permissions/protectedEnvAndGitPaths.js";
import { protectedHomeRoots } from "../../permissions/protectedSettingsPaths.js";
import { getPlatform } from "../../platform.js";
import { HOOK_EVENTS } from "../../../entrypoints/sdk/coreSchemas.js";
import { isPlainOptionWord, isSuspiciousHardLinkedFile, legacyPinOr } from "../hookCommandResolution.js";
import {
  isMatcherEvent,
  hookEventForwardingKind,
  isCodeEditingMatcherOnly,
  isWildcardMatcher,
  MATCHER_NAME_RE,
  isMatcherSubset,
} from "../hookEventSets.js";
import { findTemplateByDigest, hookTemplateIds, getHookTemplate, alwaysTrue } from "../hookTemplates.js";
import { TOOL_HOOK_EVENTS } from "../hookEvents.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../../tools/FileReadTool/constants.js";
import { formatDeviceHookId, parseDeviceHookId } from "../deviceHookId.js";
import {
  attestationFor as attestationFor_2,
  isBelowFloorEnforced,
} from "../../../services/remoteTools/toolHostAttestation.js";
import { getGlobalClaudeFile, env } from "../../env.js";
import { getAppliedGlobalConfigEnv, settingsEnvForHookChild } from "../../managedEnvApply.js";
import { getSettingsForSource } from "../../settings/settings.js";
import { anyPairMatches } from "../../settings/stickyRoots.js";
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
//@ chunk-mthxbav8.js:3523-3966 placement
/**
 * 设备 hook 命令可达的根目录
 */
function commandReachRoots(e) {
  let filtered = [
    e.launchDirReal,
    e.launchDir,
    ...(e.sync !== undefined ? [e.sync.rootReal, ...(e.sync.root !== undefined ? [e.sync.root] : [])] : []),
    ...e.extraReach,
  ].filter((u) => !REMOTE_ROOT_RE.test(u));
  let found = filtered.find((u) => !isAbsolutePlatformPath(u));
  if (found !== undefined) {
    logForDebugging(
      `[deviceHooks] reach: a root that is not an absolute path (${JSON.stringify(found)}) \u2014 everything on this machine counts as in the cloud session's reach`,
      {
        level: "warn",
      },
    );
    return [POSIX_SEP_2];
  }
  return filtered.map((u) => normalizeCommandForPlatform(u.replace(/\/+$/, "")) || "/");
}
//@ chunk-mthxbav8.js:3966-4035 placement
function reachesEverything(e, n) {
  return (e.length === 1 && e[0] === POSIX_SEP_2) || n.some((r) => !isAbsolutePlatformPath(r));
}
//@ chunk-mthxbav8.js:4035-4119 placement
function commandReachesPath(e, context) {
  let r = commandReachRoots(context);
  return (
    reachesEverything(r, e) ||
    e.some((s) => r.some((u) => isReachableOrSamePath(u, normalizeCommandForPlatform(s))))
  );
}
//@ chunk-mthxbav8.js:4119-4203 placement
function pathWithinReach(e, context) {
  let r = commandReachRoots(context);
  return (
    reachesEverything(r, e) ||
    e.some((s) => r.some((u) => isReachableOrSamePath(normalizeCommandForPlatform(s), u)))
  );
}
//@ chunk-mthxbav8.js:4469-4520 placement
/**
 * 取钩子内容的可展示文本（去不可见字符并截断 200）。
 */
function hookContentLabel(hook) {
  return sanitizeDisplayText(getContentFieldValue(hook), {
    maxCodeUnits: 200,
  });
}
//@ chunk-mthxbav8.js:4520-6517 placement
/**
 * 判断一个设备钩子能否转发给云会话运行：钩子配置文件或插件根目录处于云会话可写范围内时拒绝；非 command 类型、无法分析的命令分别标注；脚本型命令再检查脚本位置与摘要。
 */
async function classifyDeviceHookReach(hook, context, fs, options = {}) {
  let u = [
    ...(options.sourceFile !== undefined ? [options.sourceFile] : []),
    ...(options.pluginRoot !== undefined ? [options.pluginRoot] : []),
  ];
  for (let O of u) {
    let x = await fs.realpath(O).catch(() => null);
    if (
      x === null ||
      pathWithinReach([O, x], context) ||
      (O === options.pluginRoot && commandReachesPath([O, x], context))
    )
      return {
        kind: "source_in_reach",
        notice: `"${hookContentLabel(hook)}" is configured in a place the cloud session can write on this machine (${sanitizeDisplayText(
          O,
          {
            maxCodeUnits: 200,
          },
        )}), so it is not run for the cloud session from this machine.`,
      };
  }
  if (hook.type !== "command")
    return {
      kind: "not_command",
      hookType: hook.type,
    };
  let S = analyzeHookCommand(hook, {
    home: fs.home,
    projectDir: context.projectDir,
    hookCwd: context.projectDirReal,
    defaultShell: fs.defaultShell,
    shellPrefix: fs.shellPrefix,
    ...(options.pluginRoot !== undefined && {
      pluginRoot: options.pluginRoot,
    }),
  });
  if (S.kind !== "script")
    return {
      kind: "opaque",
      reason: S.reason,
      notice: `"${hookContentLabel(hook)}" is not a single script this machine can pin, so it is not run for the cloud session from this machine: it would run whatever it names in the checkout, which the session may have written. Point it at one script outside the checkout (under ~/.claude, say).`,
    };
  let w = sanitizeDisplayText(S.rawPath, {
    maxCodeUnits: 200,
  });
  let { located, digest } = await locateScriptCached(S.resolvedPath, context, fs, options.resolved);
  if (located.realPath === null || digest === null || !digest.ok)
    return {
      kind: "unverifiable",
      rawPath: w,
      missing: located.realPath === null && located.missing,
      notice: `${w} could not be read and pinned (missing, too large, not a regular file, more than one hard link, or it resolves to a file this machine does not read as a hook script), so its hook is not run for the cloud session from this machine.`,
    };
  let C = {
    pinnedTarget: {
      path: S.resolvedPath,
      realPath: located.realPath,
      sha256: digest.sha256,
    },
    bytes: digest.bytes,
    rawPath: w,
    interpreter: S.interpreter,
    site: S.site,
  };
  if (pathWithinReach([S.resolvedPath, located.realPath], context))
    return {
      kind: "script_in_reach",
      ...C,
      notice: `"${hookContentLabel(hook)}" sits where the cloud session can write on this machine (the checkout, the synced directory or a sandbox write inlet), so it is not run for the cloud session from this machine. Move the script outside the checkout (under ~/.claude, say).`,
    };
  return {
    kind: "script_outside_reach",
    ...C,
  };
}
//@ chunk-mthxbav8.js:6517-6715 placement
async function locateScriptCached(resolvedPath, context, r, resolved) {
  let u = resolved?.get(resolvedPath);
  if (u) return u;
  let S = (async () => {
    let w = await classifyScriptLocation(resolvedPath, context, r);
    let digest = w.realPath === null ? null : await checkScriptFile(w.realPath, r);
    return {
      located: w,
      digest,
    };
  })();
  resolved?.set(resolvedPath, S);
  return S;
}
//@ chunk-mthxbav8.js:75510-86063 placement
/**
 * 分析一条 shell 命令（程序、参数、重定向、heredoc、管道）会读写或执行哪些路径，用于判定设备钩子能否在本机执行。
 */
function analyzeCommandReach(
  { program, args, assignments, redirects, heredoc, piped },
  w,
  h = {
    roots: [],
    home: "",
    fromPayload: false,
    quotedBackslashKept: true,
    zshNullCommandHeld: true,
    rubyAttachedPattern: true,
    forNameDo: true,
    runsTextHeld: true,
    substitutionHeredocs: true,
  },
) {
  let index = assignments.findIndex((assignment) => commandBaseName(assignment) === "flock");
  let R = index === -1 ? undefined : findSubcommandArg(assignments, index);
  let j = [
    ...assignments.filter((assignment, G) => G !== R?.at),
    ...(/^(?:export|declare|typeset|local|readonly)$/.test(program.text) ? args : []),
  ];
  let M = analyzeAssignments(j, h.shell === "zsh", h.zshNullCommandHeld, relativeNamesOf(h));
  if (M !== undefined && h.standing === undefined) return M;
  let found = assignments.find((assignment) => isUnderRoots(assignment, h));
  if (found !== undefined) return "it names " + found.text;
  let T = splitArgsByOperands(assignments, w, [program, ...args], relativeNamesOf(h));
  if (T !== undefined && (h.standing === undefined || STANDING_REASON_TEXTS.has(T)))
    return noteStanding(T, h);
  let P =
    program.text === ":"
      ? assignments.findIndex((assignment) => /^(?:sudo|doas)$/.test(commandBaseName(assignment)))
      : -1;
  if (
    P !== -1 &&
    assignments.some(
      (assignment, G) =>
        G > P &&
        (hasAnyShortFlagChar(assignment.text, "si") ||
          assignment.text === "--shell" ||
          assignment.text === "--login"),
    )
  )
    return noteStanding(WRAPPER_NEEDS_COMMAND_TEXTS.sudo, h);
  if (R !== undefined) {
    let D = analyzeNestedScript(
      R.text,
      {
        redirects,
        heredoc,
        piped,
      },
      w,
      h,
    );
    if (D !== undefined && h.standing === undefined) return D;
  }
  if (program.text === "setenv" || (program.text === "set" && /^-[a-zA-Z]*x/.test(args[0]?.text ?? ""))) {
    let D = program.text === "setenv" ? 0 : 1;
    let G = args[D];
    let Y = analyzeAssignments(
      G === undefined
        ? []
        : [
            {
              ...G,
              text:
                G.text +
                "=" +
                args
                  .slice(D + 1)
                  .map((arg) => arg.text)
                  .join(":"),
            },
          ],
      false,
      h.zshNullCommandHeld,
      relativeNamesOf(h),
    );
    if (Y !== undefined) return Y;
  }
  if (program.text === "unset" && args.some((arg) => arg.text.startsWith("GIT_CONFIG")))
    return "it unsets a GIT_CONFIG variable";
  if (program.text === "unset" && args.some((arg) => arg.text === "PATH")) return "it unsets PATH";
  if (program.expands && !/^\$/.test(program.text))
    return "it runs a command whose name is built by an expansion";
  if (/^\$\(\u2026\)/.test(program.text))
    return "it runs a command held in a variable or produced by another command";
  if (/^\$/.test(program.text)) {
    if (isUnderRoots(program, h)) return "it names " + program.text;
    let D = /^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?\//.exec(program.text)?.[1];
    if (D !== undefined && h.relativeNames?.has(D) === true) return "it runs a file by a relative path";
    if (/^\$[({](?:CURDIR|PWD)[)}]/.test(program.text)) return "it uses its working directory";
    let replaced = program.text.replace(/^\$\{[^}]*\}|^\$\([^)]*\)|^\$[A-Za-z_][A-Za-z0-9_]*/, "");
    if (
      replaced !== program.text &&
      /^[^\/$].*\//.test(replaced) &&
      (!replaced.startsWith("~") ||
        readFlagWithOverride(TENGU_FEDERATED_HEARTH, {
          safe: true,
        }))
    )
      return "it runs a file by a relative path";
    let Y =
      h.make === true && /^(?:\$[({][A-Za-z_]+[)}])*\$[({]MAKE[)}]$/.test(program.text)
        ? "make"
        : /:-([^}]+)\}$/.exec(program.text)?.[1];
    if (Y === undefined) {
      if (h.fromPayload) return "it runs a command held in a variable or produced by another command";
      let found = args.find((arg) => !arg.text.startsWith("-"));
      if (
        found !== undefined &&
        isPlainArgument(found) &&
        (found.text.includes("/") || /\.[A-Za-z0-9]{1,5}$/.test(found.text))
      )
        return "it runs a file by a relative path";
      if (!/^\/(?:.*\/)?[^\/$]+$/.test(replaced)) return;
      let z = commandBaseName(program);
      if (isLauncherCommand(z) && z !== "runuser")
        return isAnchoredPath(program) && !/[ \t]/.test(program.text)
          ? undefined
          : analyzeWrappedCommand(
              [
                {
                  text: z,
                  quoted: false,
                  raw: z,
                },
                ...args,
              ],
              piped,
              w,
              h,
              true,
            );
    } else
      program = {
        ...program,
        text: Y,
      };
  }
  if (program.quoted && /[ \t]/.test(program.text) && !program.text.includes("/")) {
    w.push(program.text);
    return;
  }
  let L = normalizeInterpreterName(commandBaseName(program));
  let found_2 = [program, ...args, ...redirects.map((redirect) => redirect.target)].find((D) =>
    isUnderRoots(D, h),
  );
  if (found_2 !== undefined) return "it names " + found_2.text;
  if (program.text.includes("/") && !isPathWord(program) && !program.text.endsWith("/"))
    return "it runs a file by a relative path";
  if (h.standing === undefined && /(?:^|[^$])\{[-+]?\d*[.\/#%+]{0,4}\}/.test(program.text))
    return "it runs a file by a relative path";
  if (h.forNameDo && h.standing === undefined) {
    if (L === "function" && args.slice(1).some((arg) => arg.text === "do" && !arg.quoted))
      return "it defines a function whose loop has no ';' or line break before its 'do', so what the loop runs cannot be checked; written with '; do' it can be";
    let D = [program, ...args];
    let found = [0, 1, 2].find((Y) => {
      let Z = D[Y];
      return Z !== undefined && !Z.quoted && /^(?:for|select|repeat)$/.test(Z.text);
    });
    if (found !== undefined) {
      let text = D[found].text;
      let sliced = D.slice(found + 2);
      let z = text === "repeat" ? -1 : sliced.findIndex((K) => K.text === "in" && !K.quoted);
      if ((z === -1 ? sliced : sliced.slice(0, z)).some((K) => K.text === "do" && !K.quoted))
        return `it runs a '${text}' loop with no ';' or line break before its 'do', so what the loop runs cannot be checked; written with '; do' it can be`;
    }
    if (
      assignments.some((assignment) => assignment.text === "coproc" && !assignment.quoted) &&
      args.some((arg) => arg.text === "do" && !arg.quoted)
    )
      return "it starts a coprocess whose loop has no ';' or line break before its 'do', so what the loop runs cannot be checked; written with '; do' it can be";
  }
  if (L === "for" || L === "select")
    return args
      .slice(args.findIndex((arg) => arg.text === "in") + 1)
      .some((arg) => isPlainArgument(arg) && /[\/*?[]/.test(arg.text))
      ? "it loops over files by a relative name"
      : undefined;
  if (L === "source" || program.text === ".") {
    let D = args[0]?.text === "--" ? args[1] : args[0];
    if (D !== undefined && isStdinLikePath(D)) {
      if (heredoc !== undefined && D.text !== "<(\u2026)") {
        w.push(heredoc);
        return;
      }
      return "it runs a shell or interpreter whose program arrives on a pipe, a heredoc or a file descriptor";
    }
    return isPlainArgument(D) ? "it sources a file by a relative name" : undefined;
  }
  let F = unwrapLauncherArgs(L, args, relativeNamesOf(h));
  if (F === "reads_input") return noteStanding(WRAPPER_NEEDS_COMMAND_TEXTS[L], h);
  if (F !== undefined) {
    if (F !== "held") for (let D of F.lines ?? []) w.push(D);
    return F === "held" || F.held
      ? "it runs " + L + " with a command or file this machine cannot verify"
      : (F.words ?? []).map((D) => analyzeWrappedCommand(D, piped, w, h)).find((D) => D !== undefined);
  }
  if (BUILD_TOOL_PROGRAMS.has(L) || findEvalStyleFlag(L, args) !== undefined)
    return L !== "hg" && args.length > 0 && args.every((arg) => VERSION_OR_HELP_FLAG_RE.test(arg.text))
      ? undefined
      : "it runs a project tool, such as make or npm";
  let X = L === "rscript" ? findInterpreterScript(L, args, h.rubyAttachedPattern) : undefined;
  if (
    INTERPRETER_VARIANTS.has(L) &&
    !(
      L === "rscript" &&
      (typeof X === "object" ? args.slice(0, args.indexOf(X)) : args).some((D) => D.text === "--vanilla")
    )
  )
    return "it runs " + L;
  if (SHELL_PROGRAMS.has(L) || SCRIPT_INTERPRETERS.has(L) || (program.text === ":" && R === undefined)) {
    let D = SHELL_PROGRAMS.has(L);
    let G =
      program.text !== ":" &&
      (D ? findScriptArgument(L, args) : runsInlineProgram(L, args, h.rubyAttachedPattern));
    if (!G) {
      for (let { op, target } of redirects) {
        if ((op === "<" || op === "<>") && (isPlainArgument(target) || isStdinLikePath(target)))
          return program.text === ":"
            ? "it reads a compound command's input from a file in the launch directory"
            : "it runs a script by a relative name";
        if (op === "<<<" && SHELL_PROGRAMS.has(L)) {
          if (/^\$/.test(target.text.trim()))
            return "it runs a command held in a variable or produced by another command";
          w.push(target.text);
        }
      }
      if (heredoc !== undefined && SHELL_PROGRAMS.has(L)) w.push(heredoc);
    }
    let Y =
      D &&
      !G &&
      heredoc === undefined &&
      !redirects.some((redirect) => /^<(?!>)/.test(redirect.op) || redirect.op === "<>");
    if (
      !G &&
      program.text !== ":" &&
      (piped ||
        Y ||
        (!SHELL_PROGRAMS.has(L) &&
          (heredoc !== undefined || redirects.some((redirect) => redirect.op === "<<<"))))
    ) {
      if (L === "python" || L === "pypy")
        return analyzePythonCommand(args, h, collectHeredocInput(heredoc, redirects));
      return "it runs a shell or interpreter whose program arrives on a pipe, a heredoc or a file descriptor";
    }
  }
  if (SHELL_PROGRAMS.has(L))
    return analyzeInterpreterInput(L, args, w, h, {
      redirects,
      heredoc,
      piped,
    });
  if (L === "python" || L === "pypy") {
    let D = analyzePythonCommand(args, h, collectHeredocInput(heredoc, redirects));
    if (D !== undefined) return D;
  } else if (L === "perl") {
    if (
      args.some((arg, G) => {
        let match = /^-[acnpsTtwWX]*(?:I([\s\S]*)|[Mm]lib(?:=([\s\S]*)|(\s[\s\S]*))?)$/.exec(arg.text);
        return (
          match !== null &&
          (match[1] !== undefined
            ? operandReachesBeyondRoots(tildeOperandAt(args, match[1], G), h)
            : match[3] !== undefined
              ? match[3].trim() !== ""
              : (match[2] ?? "").split(",").some(
                  (Z) =>
                    Z !== "" &&
                    operandReachesBeyondRoots(
                      {
                        value: Z,
                        tildeLiteral: true,
                      },
                      h,
                    ),
                ))
        );
      })
    )
      return "it runs perl with -I or the lib pragma";
  } else if (L === "ruby") {
    let interpreterScript = findInterpreterScript("ruby", args, h.rubyAttachedPattern);
    let G =
      typeof interpreterScript === "object" && args.includes(interpreterScript)
        ? args.slice(0, args.indexOf(interpreterScript))
        : args;
    if (
      G.some((Y, Z) => {
        let match = /^-[acdlnpsvwy]*I(.*)$/.exec(Y.text);
        if (match !== null)
          return tildeOperandAt(G, match[1], Z)
            .value.split(":")
            .some(
              (ne, ae, ie) =>
                (ne !== "" || ie.length === 1) &&
                operandReachesBeyondRoots(
                  {
                    value: ne,
                    tildeLiteral: false,
                  },
                  h,
                ),
            );
        let match_2 = /^(?:-[acdlnpsvwy]*r|--require=?)([\s\S]*)$/.exec(Y.text);
        if (match_2 === null) return false;
        let { value: re } = tildeOperandAt(G, match_2[1], Z);
        return (
          /^\.\.?\//.test(re) ||
          /^bundler(?:\/+setup(?:\.rb)?)?$/i.test(re) ||
          isUnderRoots(
            {
              text: re,
              quoted: false,
              raw: re,
            },
            h,
          )
        );
      })
    )
      return "it runs ruby with -I or -r";
  } else if (L === "node" || L === "nodejs" || L === "tsx" || L === "ts-node") {
    if (
      args.some(
        (arg, Z) =>
          /^(?:-r|--require|--import|--(?:experimental-)?loader)(?:=|$)/.test(arg.text) &&
          !/^(?:\/|node:)/.test(
            arg.text.includes("=") ? (arg.text.split("=")[1] ?? "") : (args[Z + 1]?.text ?? ""),
          ),
      )
    )
      return "it runs node with --require, --import or --loader";
    let index = args.findIndex((arg) => /^(?:-e|--eval|-p|--print|-pe|-ep)$/.test(arg.text));
    let G =
      index !== -1
        ? args[index + 1]?.text
        : args.find((arg) => /^--(?:eval|print)=/.test(arg.text))?.text.replace(/^--(?:eval|print)=/, "");
    if (G !== undefined && scanJsImports(G))
      return "it runs node code that loads a module by a bare or relative name";
  } else if (L === "lua") {
    if (args.some((arg) => /^-l/.test(arg.text))) return "it runs lua with -l";
  } else if (L === "php") {
    let D = analyzePhpCommand(args, h);
    if (D !== undefined) return D;
  }
  if (SCRIPT_INTERPRETERS.has(L) || (isKnownInterpreter(L) && !SHELL_PROGRAMS.has(L))) {
    let interpreterScript = findInterpreterScript(L, args, h.rubyAttachedPattern);
    if (interpreterScript === "unknown_option")
      return "it runs an interpreter with an option this version does not know";
    if (
      interpreterScript !== undefined &&
      isStdinLikePath(interpreterScript) &&
      L !== "python" &&
      L !== "pypy"
    )
      return "it runs a shell or interpreter whose program arrives on a pipe, a heredoc or a file descriptor";
    if (
      interpreterScript !== undefined &&
      (interpreterScript.text === "{}" || isPlainArgument(interpreterScript))
    )
      return "it runs a script by a relative name";
    return;
  }
  if (
    /^(?:emacs|vim?|nvim|gvim|view|ex)$/.test(L) &&
    args.some((arg, G) => {
      let match = /^(?:--?script|--load|-l|-S|-u)(?:=([\s\S]*))?$/.exec(arg.text);
      let Z = match === null ? undefined : (match[1] ?? args[G + 1]?.text ?? "-");
      return (
        Z !== undefined &&
        !(arg.text === "-u" && /^(?:NONE|NORC|DEFAULTS)$/.test(Z)) &&
        (Z.startsWith("-")
          ? arg.text === "-S"
          : !isAbsoluteLike(Z, PATH_PREFIX_CHARS_RE) || isUnresolvedVariablePath(Z, relativeNamesOf(h)))
      );
    })
  )
    return "it runs a script by a relative name";
  let Q = EXTENSION_INTERPRETERS[L];
  if (Q !== undefined) {
    if (
      args.some(
        (arg) => arg.text === "{}" || (!arg.text.startsWith("-") && Q.test(arg.text) && isPlainArgument(arg)),
      )
    )
      return "it runs a script by a relative name";
    if (
      args.every((arg) => arg.text.startsWith("-")) &&
      (piped || heredoc !== undefined || redirects.some((redirect) => redirect.op.startsWith("<")))
    )
      return "it runs a shell or interpreter whose program arrives on a pipe, a heredoc or a file descriptor";
  }
  let ee =
    L === "dart"
      ? (args[0]?.text === "run" ? args.slice(1) : args).find((D) => !D.text.startsWith("-"))
      : undefined;
  if (ee !== undefined && ee.text.endsWith(".dart") && isPlainArgument(ee))
    return "it runs a script by a relative name";
  if (L === "git") return analyzeEnvCommand(args, assignments, w, relativeNamesOf(h));
  if (L === "java") {
    let index = args.findIndex((arg) => arg.text === "-jar");
    let index_2 = args.findIndex((arg) => /^(?:-cp|-classpath|--class-path)$/.test(arg.text));
    let Y =
      index_2 === -1
        ? args.find((arg) => arg.text.startsWith("--class-path="))?.text.slice(13)
        : args[index_2 + 1]?.text;
    if (index !== -1)
      return isPlainArgument(args[index + 1]) ? "it runs a file by a relative path" : undefined;
    return args.length > 0 && args.every((arg) => VERSION_OR_HELP_FLAG_RE.test(arg.text))
      ? undefined
      : Y !== undefined && Y.split(":").every((Z) => isResolvableAbsolutePath(Z, relativeNamesOf(h)))
        ? undefined
        : "it runs java with the working directory on its class path";
  }
  if (L === "eval") {
    w.push((args[0]?.text === "--" ? args.slice(1) : args).map((D) => D.text).join(" "));
    return;
  }
  if (L === "nix-shell" || L === "nix") {
    let index = args.findIndex((arg) => /^(?:--run|--command|-c)$/.test(arg.text));
    if (index !== -1 && args[index + 1] !== undefined)
      w.push(
        args
          .slice(index + 1)
          .map((arg) => arg.text)
          .join(" "),
      );
    return findEvalStyleFlag(L, args) !== undefined || L === "nix-shell"
      ? "it runs a project tool, such as make or npm"
      : undefined;
  }
  if (L === "trap") {
    let D = args[0]?.text === "--" ? args.slice(1) : args;
    if (D.length >= 2 && !/^-[lp]$/.test(D[0].text) && D[0].text !== "-") w.push(D[0].text);
    return;
  }
  if (L === "alias") {
    for (let arg of args) {
      let index = arg.text.indexOf("=");
      if (index > 0) w.push(arg.text.slice(index + 1));
    }
    return;
  }
  if (L === "enable" || L === "hash") {
    let index = args.findIndex((arg) => arg.text === (L === "enable" ? "-f" : "-p"));
    return index !== -1 && isPlainArgument(args[index + 1]) ? "it runs a file by a relative path" : undefined;
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
      let z = analyzeWrappedCommand(sliced, false, w, h);
      D.push(
        sliced[0].text === "{}" || parseShellWords(sliced).some((K) => K.program.text === "{}")
          ? "it runs a file by a relative path"
          : z,
      );
      G = Y;
    }
    return D.find((G) => G !== undefined);
  }
  return;
}
//@ chunk-mthxbav8.js:86063-86192 placement
function findEvalStyleFlag(e, n) {
  let r = BUILD_SUBCOMMANDS[e];
  if (r === undefined) return;
  return n.find((s) => r.has(s.text.startsWith("--") ? firstLineOf(s.text, "=") : s.text))?.text;
}
//@ chunk-mthxbav8.js:86192-86634 placement
/**
 * 命令包装相关文案：嵌套超限提示、env -P 相对目录提示，以及各包装器"缺少命令"的说明集合。
 */
var MAX_WRAP_NESTING = 4;
var WRAP_NESTING_TOO_DEEP_TEXT =
  "it wraps a command in more than four layers of commands such as find -exec or parallel";
var ENV_RELATIVE_DIR_TEXT = "it runs env with -P naming a relative directory";
var WRAPPER_NEEDS_COMMAND_TEXTS = {
  parallel: "it runs parallel with no command of its own",
  script: "it runs script with no command of its own",
  su: "it runs su with no command",
  runuser: "it runs runuser with no command",
  sudo: "it starts a shell through sudo or doas with no command",
};
var STANDING_REASON_TEXTS = new Set([
  WRAP_NESTING_TOO_DEEP_TEXT,
  ENV_RELATIVE_DIR_TEXT,
  ...Object.values(WRAPPER_NEEDS_COMMAND_TEXTS),
]);
//@ chunk-mthxbav8.js:86634-86693 placement
function noteStanding(e, n) {
  if (STANDING_REASON_TEXTS.has(e)) n.standing?.push(e);
  return e;
}
//@ chunk-mthxbav8.js:86693-87068 placement
function analyzeWrappedCommand(e, piped, r, s, u = false) {
  let S = (s.nesting ?? 0) + 1;
  if (S > MAX_WRAP_NESTING) return noteStanding(WRAP_NESTING_TOO_DEEP_TEXT, s);
  if (e.length === 0) return;
  let w = [
    ...(u
      ? []
      : [
          {
            program: e[0],
            args: e.slice(1),
            assignments: [],
          },
        ]),
    ...parseShellWords(e).filter((v) => u || v.args.length !== e.length - 1),
  ];
  let h = [];
  for (let v of w) {
    let y = analyzeCommandReach(
      {
        ...v,
        redirects: [],
        piped,
      },
      r,
      {
        ...s,
        nesting: S,
      },
    );
    if (y !== undefined && s.standing === undefined) return y;
    h.push(y);
  }
  return h.find((v) => v !== undefined);
}
//@ chunk-mthxbav8.js:87068-87140 placement
var INTERPRETER_VARIANTS = new Set(["bun", "deno", "tsx", "ts-node", "lua", "rscript", "r", "bb"]);
//@ chunk-mthxbav8.js:87140-87212 placement
function relativeNamesOf(e) {
  return e.relativeNamedValues === false ? undefined : e.relativeNames;
}
//@ chunk-mthxbav8.js:87212-87283 placement
function isResolvableAbsolutePath(e, n) {
  let r = isAbsoluteLike(e);
  if (n === undefined) return r;
  return r && !isUnresolvedVariablePath(e, n);
}
//@ chunk-mthxbav8.js:87283-87504 placement
function isUnresolvedVariablePath(e, n) {
  if (n === undefined) return false;
  let r = /^\$\{?([A-Za-z_][A-Za-z0-9_]*)/.exec(e)?.[1];
  let replaced = e.replace(/^\$\{[^}]*\}|^\$\([^)]*\)|^\$[A-Za-z_][A-Za-z0-9_]*/, "");
  return (r !== undefined && n.has(r)) || (replaced !== e && /^[^\/~$].*\//.test(replaced));
}
//@ chunk-mthxbav8.js:87620-87784 placement
function operandReachesBeyondRoots({ value: e, tildeLiteral }, r) {
  return (
    (tildeLiteral && e.startsWith("~")) ||
    !isResolvableAbsolutePath(e, relativeNamesOf(r)) ||
    (r.make === true && /^\$[({](?:CURDIR|PWD)[)}]/.test(e)) ||
    isUnderRoots(
      {
        text: e,
        quoted: false,
        raw: e,
      },
      r,
    )
  );
}
//@ chunk-mthxbav8.js:87784-87911 placement
function isStdinLikePath(e) {
  return (
    e !== undefined &&
    /^(?:\/dev\/(?:stdin|fd\/\d+)|\/proc\/(?:self|\d+)\/fd\/\d+|-|[<>]\(\u2026\))$/.test(e.text)
  );
}
//@ chunk-mthxbav8.js:87911-88235 placement
function isUnderRoots(e, n) {
  if (n.roots.length === 0) return false;
  let text = e.text;
  if (/^\$(?:HOME|\{HOME\})(?=\/|$)/.test(text)) text = n.home + text.replace(/^\$(?:HOME|\{HOME\})/, "");
  else if (/^~[A-Za-z0-9._-]*(?=\/|$)/.test(text)) text = n.home + text.replace(/^~[A-Za-z0-9._-]*/, "");
  if (!text.startsWith("/")) return false;
  let normalized = posix.normalize(text);
  return n.roots.some((root) => isSameCommandPath(normalized, root));
}
//@ chunk-mthxbav8.js:88235-89629 placement
function analyzeInterpreterInput(e, n, r, s, u) {
  let w = u.piped || u.heredoc !== undefined || u.redirects.some((redirect) => redirect.op.startsWith("<"));
  let h = (y) =>
    w && !/^\$/.test(y.text.trim()) ? analyzeNestedScript(y.text, u, r, s) : collectNestedShellCommand(y, r);
  let v = false;
  for (let y = 0; y < n.length; y += 1) {
    let C = n[y];
    let text = C.text;
    if (text === "--") {
      let R = n[y + 1];
      if (R === undefined) return;
      return v ? h(R) : !isAbsoluteLike(R.text) ? "it runs a script by a relative name" : undefined;
    }
    if (e === "fish") {
      let match = /^(?:-C|--init-command(?:=([\s\S]*))?)$/.exec(text);
      if (match !== null) {
        let j =
          match[1] !== undefined
            ? {
                ...C,
                text: match[1],
              }
            : n[y + 1];
        let M = j === undefined ? undefined : h(j);
        if (M !== undefined && s.standing === undefined) return M;
        y += match[1] !== undefined ? 0 : 1;
        continue;
      }
    }
    if (isShellCommandFlag(e, text) && !text.startsWith("--command=")) {
      if (e === "pwsh" && /^-e/i.test(text)) return "it hands pwsh an encoded command";
      v = true;
      y += shellFlagArity(e, text);
      continue;
    }
    if (text.startsWith("--command="))
      return h({
        ...C,
        text: text.slice(10),
      });
    if (/^--(?:rcfile|init-file)=/.test(text)) {
      if (!isResolvableAbsolutePath(text.slice(text.indexOf("=") + 1), relativeNamesOf(s)))
        return "it runs " + e + " with an rc file by a relative name";
      continue;
    }
    let x = shellFlagArity(e, text);
    if (x > 0) {
      let text_2 = n[y + 1]?.text;
      y += x;
      if (
        /^--(?:rcfile|init-file)$/.test(text) &&
        text_2 !== undefined &&
        !isResolvableAbsolutePath(text_2, relativeNamesOf(s))
      )
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
        : undefined;
  }
  return;
}
//@ chunk-mthxbav8.js:89629-89699 placement
var POSIX_SHELL_PROGRAMS = new Set(["bash", "sh", "dash", "ash", "ksh", "mksh", "zsh", "rbash"]);
//@ chunk-mthxbav8.js:89699-90340 placement
function shellFlagArity(e, text) {
  if (/^--(?:rcfile|init-file)$/.test(text)) return 1;
  if (POSIX_SHELL_PROGRAMS.has(e)) {
    let match = /^[-+]([a-zA-Z]+)$/.exec(text);
    if (match === null) return 0;
    if (e === "zsh" || e === "ksh" || e === "mksh")
      return (e === "zsh" ? /o$/ : /[oO]$/).test(match[1]) ? 1 : 0;
    return (match[1].match(/[oO]/g) ?? []).length;
  }
  if (e === "fish")
    return /^(?:[+-]O|\+o|-C|--init-command|-p|--profile|-d|--debug|-D|--debug-stack-frames|-f|--features)$/.test(
      text,
    )
      ? 1
      : 0;
  if (e === "pwsh")
    return /^-(?:o|of|outputformat|ex|ep|executionpolicy|wd|workingdirectory|config|configurationname|custompipename|if|inp|inputformat|settings|settingsfile|w|windowstyle|v|version)$/i.test(
      text,
    )
      ? 1
      : 0;
  return text === "-o" || text === "+o" || text === "-O" || text === "+O" ? 1 : 0;
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
  let r = flagArgumentIndexes(e, n);
  let index = n.findIndex((w, h) => !r.has(h) && !/^[-+]./.test(w.text));
  let u = index === -1 ? n : n.slice(0, index);
  if (u.some((w) => isShellCommandFlag(e, w.text)))
    return (
      (index !== -1 || u.some((w) => /^--command=./.test(w.text))) &&
      !(e === "pwsh" && n[index]?.text === "-")
    );
  let S = e !== "fish" && e !== "pwsh" && u.some((w) => hasAnyShortFlagChar(w.text, "s"));
  return index !== -1 && !isStdinLikePath(n[index]) && !S;
}
//@ chunk-mthxbav8.js:90855-90998 placement
function isShellCommandFlag(e, text) {
  return e === "pwsh"
    ? /^-(?:c|command|cwa|commandwithargs|e|ec|encodedcommand)$/i.test(text)
    : hasAnyShortFlagChar(text, "c") || /^--command(?:=|$)/.test(text);
}
//@ chunk-mthxbav8.js:90998-91166 placement
function runsInlineProgram(e, n, rubyAttachedPattern) {
  let interpreterScript = findInterpreterScript(e, n, rubyAttachedPattern);
  return (
    n.some((u) => isEvalFlag(e, u.text)) ||
    (/^(?:[gnm]?awk|g?sed)$/.test(e) && n.some((u) => !u.text.startsWith("-"))) ||
    (typeof interpreterScript === "object" && !isStdinLikePath(interpreterScript))
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
function analyzeNestedScript(text, n, r, s) {
  let { commands, unreadable } = parseShellCommands(text, {
    make: false,
    quotedBackslashKept: s.quotedBackslashKept,
    substitutionHeredocs: s.substitutionHeredocs,
  });
  if (unreadable !== null) return `it could not be read to the end as shell (${unreadable})`;
  return commands
    .map((command) =>
      analyzeCommandReach(
        command.program.text === ":" && command.args.length === 0 && command.redirects.length === 0
          ? command
          : {
              ...command,
              redirects: [
                ...command.redirects,
                ...n.redirects.filter((redirect) => redirect.op.startsWith("<")),
              ],
              heredoc: command.heredoc ?? n.heredoc,
              piped: command.piped || n.piped,
            },
        r,
        {
          ...s,
          fromPayload: true,
        },
      ),
    )
    .find((w) => w !== undefined);
}
//@ chunk-mthxbav8.js:91809-93326 placement
function splitArgsByOperands(assignments, n, r = [], s) {
  let u = Array(assignments.length + 1);
  let S = Array(assignments.length + 1).fill(false);
  let w = Array(assignments.length + 3).fill(false);
  for (let x = assignments.length - 1; x >= 0; x -= 1) {
    let text = assignments[x].text;
    let j = /^(?:-[iv0]*[uCP]|--unset|--chdir)$/.test(text) ? 2 : 1;
    w[x] =
      text.startsWith("-") &&
      ((/^-[iv0]*P/.test(text) &&
        !(text.replace(/^-[iv0]*P/, "") || (assignments[x + 1]?.text ?? ""))
          .split(":")
          .every((T) => isResolvableAbsolutePath(T, s))) ||
        w[x + j]);
    u[x] = /^(?:-S.|--split-string=)/.test(text) ? text.replace(/^(?:-S|--split-string=)/, "") : u[x + 1];
    let match = /^-[0oprtx]+a([\s\S]*)$/.exec(text);
    let q = /^(?:-a|--arg-file)$/.test(text)
      ? assignments[x + 1]?.text
      : text.startsWith("--arg-file=")
        ? text.slice(11)
        : text.startsWith("-a") && text.length > 2
          ? text.slice(2)
          : match !== null
            ? match[1] || assignments[x + 1]?.text
            : undefined;
    S[x] = (q !== undefined && !isResolvableAbsolutePath(q, s)) || S[x + 1];
  }
  let mapped = assignments.map((x) => x.text.slice(x.text.lastIndexOf("/") + 1).toLowerCase());
  let index = mapped.indexOf("xargs");
  let y =
    index === -1
      ? []
      : uniq(
          assignments.slice(index + 1).flatMap((x, R, j) => {
            let match = /^-[0oprtx]*([IJi])([\s\S]*)$/.exec(x.text);
            if (match === null) return /^--replace(?:=|$)/.test(x.text) ? [x.text.split("=")[1] ?? "{}"] : [];
            return match[1] === "i"
              ? [
                  "{}",
                  ...(match[2] === "" ? [] : [match[2]]),
                  ...(match[2].includes("=") ? [x.text.split("=")[1]] : []),
                ]
              : [match[2] || j[R + 1]?.text].filter((q) => q !== undefined);
          }),
        );
  let C = y.length > 64 || r.some((x) => y.some((R) => x.text.includes(R)));
  mapped.forEach((x, R) => {
    if (x === "env" && u[R + 1] !== undefined) n.push(u[R + 1]);
  });
  let mapped_2 = mapped.map((x, R) => {
    if (x === "env")
      return !assignments[R].text.startsWith("-") && w[R + 1] ? ENV_RELATIVE_DIR_TEXT : undefined;
    if (x !== "xargs") return;
    return C
      ? "it runs what xargs splices into the command from its input"
      : S[R + 1]
        ? "it runs xargs with its arguments read from a file by a relative name"
        : undefined;
  });
  return mapped_2.find((x) => x === ENV_RELATIVE_DIR_TEXT) ?? mapped_2.find((x) => x !== undefined);
}
//@ chunk-mthxbav8.js:93326-93621 placement
function findSubcommandArg(assignments, n) {
  let sliced = assignments.slice(n + 1);
  let index = sliced.findIndex(
    (w, h) => !w.text.startsWith("-") && !COMMAND_WRAPPERS.has(sliced[h - 1]?.text ?? ""),
  );
  let u = index === -1 ? "" : (sliced[index + 1]?.text ?? "");
  let S = /^(?:-c|--command)$/.test(u) ? sliced[index + 2] : undefined;
  if (S !== undefined)
    return {
      at: n + index + 3,
      text: S.text,
    };
  return u.startsWith("--command=")
    ? {
        at: n + index + 2,
        text: u.slice(10),
      }
    : undefined;
}
//@ chunk-mthxbav8.js:93621-94492 placement
/**
 * xargs 的并行/取值类选项集合与 strace 等带值选项集合。
 */
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
]);
var STRACE_OPTIONS_WITH_VALUE = new Set([
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
function skipOptionWords(e, n, r = false) {
  let s = 0;
  while (s < e.length && e[s].text.startsWith("-")) {
    let text = e[s].text;
    s += n.has(text) || (r && /^-[A-Za-z]{2,}$/.test(text) && n.has("-" + text.at(-1))) ? 2 : 1;
  }
  return e.slice(s);
}
//@ chunk-mthxbav8.js:94668-98210 placement
/**
 * 展开 env/sudo/xargs/parallel/find -exec 等包装命令，得到真正要执行的命令词。
 */
function unwrapLauncherArgs(e, n, r) {
  let s = (S) =>
    S >= 0 && S < n.length
      ? {
          words: [n.slice(S)],
        }
      : undefined;
  let u = (S) =>
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
      });
      let any = n.some((v, y) => {
        let match = /^(?:-[flmpPT]*s|--shell)(?:=?([\s\S]+))?$/.exec(v.text);
        let O = match === null ? undefined : (match[1] ?? n[y + 1]?.text);
        return (
          O !== undefined && (!isAbsoluteLike(O, PATH_PREFIX_CHARS_RE) || isUnresolvedVariablePath(O, r))
        );
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
            : {
                words: [
                  [
                    {
                      text: "sh",
                      quoted: false,
                      raw: "sh",
                    },
                    ...filtered.slice(1),
                  ],
                ],
              };
      }
      let filtered = flattened.filter((v) => v !== undefined);
      return {
        lines: filtered,
        held: filtered.length < flattened.length || any,
      };
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
        ? undefined
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
        let text = n[index + 1]?.text;
        return text === undefined
          ? "held"
          : {
              lines: [text],
            };
      }
      let filtered = n.filter((y) => !y.text.startsWith("-"));
      if (filtered.length < 2)
        return n.length > 0 && n.every((y) => /^(?:--version|--help|-V|-h)$/.test(y.text))
          ? undefined
          : "reads_input";
      let h = skipOptionWords(n, STRACE_OPTIONS_WITH_VALUE);
      let v = skipOptionWords(n, STRACE_OPTIONS_WITH_VALUE, true);
      if (h.length <= 1 || v.length <= 1) return "reads_input";
      return {
        words: u([filtered.slice(1), n.slice(n.indexOf(filtered[0]) + 1), h.slice(1), v.slice(1)]),
      };
    }
    case "dotenv":
      return "held";
    case "direnv": {
      if (n[0]?.text !== "exec") return;
      let S = n[1];
      return S === undefined || !isResolvableAbsolutePath(S.text, r) ? "held" : s(2);
    }
    case "op": {
      if (n[0]?.text !== "run") return;
      let index = n.findIndex((h) => /^--env-file(?:=|$)/.test(h.text));
      if (index !== -1) {
        let h = n[index].text.includes("=") ? n[index].text.slice(11) : (n[index + 1]?.text ?? "");
        if (!isResolvableAbsolutePath(h, r)) return "held";
      }
      let index_2 = n.findIndex((h) => h.text === "--");
      return index_2 === -1 ? undefined : s(index_2 + 1);
    }
    case "hyperfine": {
      let S = [];
      let w = /^(?:-p|--prepare|-s|--setup|-c|--cleanup|--conclude)$/;
      let h =
        /^(?:-w|--warmup|-r|--runs|-m|--min-runs|-M|--max-runs|-n|--command-name|--export-\w+|--output|--shell|--sort|-u|--time-unit|-D|--parameter-step-size)$/;
      let v = [];
      for (let y = 0; y < n.length; y += 1) {
        let text = n[y].text;
        if (w.test(text)) {
          S.push(n[y + 1]?.text ?? "");
          y += 1;
        } else if (/^(?:-L|--parameter-list)$/.test(text)) {
          v.push(...(n[y + 2]?.text ?? "").split(","));
          y += 2;
        } else if (/^(?:-P|--parameter-scan)$/.test(text)) y += 3;
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
      let index = n.findIndex((j) => !j.text.startsWith("-"));
      let sliced = n.slice(index);
      let index_2 = sliced.findIndex((j) => /^::::?\+?$/.test(j.text));
      let filtered_2 = sliced.filter((j) => !/^::::?\+?$/.test(j.text));
      let C = skipOptionWords(n, XARGS_PARALLEL_FLAGS);
      let O = skipOptionWords(n, XARGS_PARALLEL_FLAGS, true);
      if ([C, O].some((j) => j.length === 0 || /^::::\+?$/.test(j[0].text))) return "reads_input";
      let x = new Set(
        n.filter(
          (j, M) =>
            XARGS_PARALLEL_FLAGS.has(n[M - 1]?.text ?? "") && /^\{[-+]?\d*[.#%+]{0,4}\}$/.test(j.text),
        ),
      );
      let R = (j) => {
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
function findInterpreterScript(e, n, rubyAttachedPattern) {
  if (e === "deno") return n[0]?.text === "run" ? n.slice(1).find((S) => !S.text.startsWith("-")) : undefined;
  if (e === "php") {
    let php = INTERPRETER_EVAL_FLAGS.php;
    for (let w = 0; w < n.length; w += 1) {
      let text = n[w].text;
      let match = /^(?:-[fF]|--file)(?:=?([\s\S]+))?$/.exec(text);
      if (match !== null)
        return match[1] !== undefined
          ? {
              ...n[w],
              text: match[1],
            }
          : n[w + 1];
      if (!text.startsWith("-") || text === "-" || text === "--") break;
      if (php.has(text)) w += 1;
    }
  }
  if (/^(?:[gnm]?awk|g?sed)$/.test(e)) {
    let S = e.endsWith("awk");
    let w = S ? /^-[a-zA-Z]*[fE]$/ : /^-[a-zA-Z]*f$/;
    let h = S ? /^-[fE]./ : /^-f./;
    for (let v = 0; v < n.length; v += 1) {
      let text = n[v].text;
      if (w.test(text)) return n[v + 1];
      if (h.test(text))
        return {
          ...n[v],
          text: text.slice(2),
        };
      if (text.startsWith("--file="))
        return {
          ...n[v],
          text: text.slice(7),
        };
    }
    return;
  }
  let s = INTERPRETER_EVAL_FLAGS[e] ?? new Set();
  let u = false;
  for (let S = 0; S < n.length; S += 1) {
    let text = n[S].text;
    if (text === "--") return n[S + 1];
    if (text === "-" || !text.startsWith("-")) return text === "-" ? n[S] : u ? "unknown_option" : n[S];
    if (isEvalFlag(e, text)) return;
    if (e === "ruby" && text === "-F") {
      let h = n[S + 1];
      if (
        !rubyAttachedPattern ||
        (h !== undefined &&
          !h.text.startsWith("-") &&
          !isStdinLikePath(h) &&
          (h.text === "" || isPathWord(h)))
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
    if (!INTERPRETER_NOOP_FLAGS[e]?.test(text)) u = true;
  }
  return;
}
//@ chunk-mthxbav8.js:99362-100463 placement
/**
 * 各解释器的无害选项正则，以及 Node 内置模块名单。
 */
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
};
var NODE_BUILTIN_MODULES = new Set([
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
    if (!NODE_BUILTIN_MODULES.has(firstLineOf(r, "/"))) return true;
  }
  return /\bcreateRequire\b/.test(e);
}
//@ chunk-mthxbav8.js:100772-102198 placement
function analyzeAssignments(e, n, zshNullCommandHeld, s) {
  for (let u of e) {
    let match = /^([A-Za-z_][A-Za-z0-9_]*)(?:\[[^\]]*\])?\+?=([\s\S]*)$/.exec(u.text);
    if (match === null) continue;
    let w = match[1];
    let h = match[2];
    let v = (C) =>
      C === "." ||
      !isAbsoluteLike(C) ||
      /^\$\{?PWD\b|^\$\(/.test(C) ||
      (isUnresolvedVariablePath(C, s) && !new RegExp(`^\\$\\{?${w}\\b`).test(C));
    let y = (C) => /^\$/.test(C) && !new RegExp(`^\\$\\{?(?:${w}|HOME|PATH)\\b`).test(C);
    if (BUILD_TOOL_ENV_VARS.includes(w)) {
      if (h.split(":").some((C) => v(C) || y(C)))
        return `it sets ${w} with the working directory or a relative entry on it`;
    } else if (n && /^(?:path|fpath|manpath|cdpath)$/.test(w)) {
      let C = /^\(([\s\S]*)\)$/.exec(h)?.[1];
      if ((C === undefined ? [h] : splitQuotedWords(C)).some(v))
        return `it sets ${w} with the working directory or a relative entry on it`;
    } else if (w === "PHPRC" || w === "PHP_INI_SCAN_DIR") {
      let C = w === "PHPRC" ? [h] : h.split(":").filter((O) => O !== "");
      if (h !== "" && C.some(v)) return `it sets ${w} to a php.ini location in the working directory`;
    } else if (
      isToolEnvVar(w, zshNullCommandHeld) ||
      /^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+|PARAMETERS|GLOBAL|SYSTEM)$/.test(w)
    )
      return `it sets ${w}, which makes a shell, an interpreter or git load what it names`;
    else if (TOOL_ENV_EXACT_RE.test(w)) {
      let found = h
        .split(/[\s=]+/)
        .find(
          (O) =>
            (SCRIPT_PATH_RE.test(O) && !isAbsoluteLike(O, PATH_PREFIX_CHARS_RE)) ||
            isUnresolvedVariablePath(O, s),
        );
      if (found !== undefined)
        return SCRIPT_PATH_RE.test(found) && !isAbsoluteLike(found, PATH_PREFIX_CHARS_RE)
          ? `it sets ${w}, which a tool runs or loads, to a file in the working directory (${found})`
          : `it sets ${w}, which a tool runs or loads, to ${found}, which may name a file in the working directory (a variable in it is set to a relative value, or a relative path follows one)`;
    }
  }
  return;
}
//@ chunk-mthxbav8.js:102198-103809 placement
function analyzeEnvCommand(e, assignments, r, s) {
  if (
    assignments.some(
      (u) =>
        /^(?:env|-i|--ignore-environment|-u|--unset)$/.test(u.text.slice(u.text.lastIndexOf("/") + 1)) ||
        u.text.startsWith("GIT_CONFIG"),
    )
  )
    return "it runs git with the environment that switches its repository hooks off cleared or edited";
  for (let u = 0; u < e.length; u += 1) {
    let text = e[u].text;
    let w;
    if (text === "-c" || text === "--config-env") {
      u += 1;
      w = e[u]?.text;
    } else if (text.startsWith("--config-env=")) w = text.slice(13);
    else if (/^-c./.test(text)) w = text.slice(2);
    else if (/^--exec-path=(?![\/~])/.test(text))
      return "it runs git with an exec path in the launch directory (git-* commands come from there)";
    if (w === undefined) {
      if (/^(?:bisect|submodule|rebase)$/.test(text)) {
        let sliced = e.slice(u + 1);
        let index = sliced.findIndex((x) => /^(?:run|foreach|-x|--exec)$/.test(x.text));
        if (index !== -1 && sliced[index + 1] !== undefined)
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
    let index = w.indexOf("=");
    let v = index === -1 ? w : w.slice(0, index);
    let y = index === -1 ? "" : w.slice(index + 1);
    if (/^core\.hookspath$/i.test(v)) {
      if (!/^(?:\/|~\/)/.test(y) || /^~[+-]/.test(y))
        return "it runs git with core.hooksPath set on the command line";
    } else if (/^include(?:if\.[^=]*)?\.path$/i.test(v) && !isResolvableAbsolutePath(y, s))
      return "it runs git with an include path set on the command line";
    else if (isUnresolvedVariablePath(y, s))
      return `it runs git with ${v} set on the command line to ${y}, which may name a file in the working directory`;
    else if (
      y.startsWith("!") ||
      (y.includes("/") && !isAbsoluteLike(y, PATH_PREFIX_CHARS_RE)) ||
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
  let interpreterScript = findInterpreterScript("php", e, n.rubyAttachedPattern);
  let s = typeof interpreterScript === "object" ? e.indexOf(interpreterScript) : -1;
  let index = e.findIndex((v) => v.text === "--");
  let S =
    typeof interpreterScript === "object" && s !== -1 && !/^(?:-[fF]|--file)$/.test(e[s - 1]?.text ?? "")
      ? e.slice(0, s)
      : e.filter((v, y) => y !== s && (index === -1 || y < index));
  let w = (v, y) => tildeOperandAt(S, v.replace(/^=/, ""), y);
  return S.some((v, y) => {
    let match = /^(?:-[zc]|--zend-extension=?|--php-ini=?)(.*)$/.exec(v.text);
    if (match !== null) return operandReachesBeyondRoots(w(match[1], y), n);
    let match_2 = /^(?:-d|--define=?)(.*)$/.exec(v.text);
    if (match_2 === null) return false;
    let { value: x } = w(match_2[1], y);
    let index = x.indexOf("=");
    let trimmed = (index === -1 ? x : x.slice(0, index)).trim();
    let M = index === -1 ? "1" : x.slice(index + 1);
    if (!PHP_INI_CODE_LOADING_RE.test(trimmed)) return false;
    let q = (value) =>
      operandReachesBeyondRoots(
        {
          value,
          tildeLiteral: true,
        },
        n,
      );
    if (trimmed === "include_path") return M.split(":").some(q);
    if (/^(?:zend_)?extension$/.test(trimmed) && !M.includes("/")) return false;
    return M !== "" && q(M);
  })
    ? "it runs php with -z, -c or a -d setting that loads a file"
    : undefined;
}
//@ chunk-mthxbav8.js:104855-104993 placement
function collectHeredocInput(heredoc, redirects) {
  let r = [
    ...(heredoc === undefined ? [] : [heredoc]),
    ...redirects.filter((s) => s.op === "<<<").map((s) => s.target.text),
  ];
  return r.length > 0
    ? r.join(`
`)
    : undefined;
}
//@ chunk-mthxbav8.js:104993-105136 placement
function pythonHeredocExecReason(e) {
  return e !== undefined && EXEC_OR_EVAL_RE.test(e)
    ? "it runs python with a heredoc or herestring program that mentions exec, eval or execfile"
    : undefined;
}
//@ chunk-mthxbav8.js:105136-106469 placement
function analyzePythonCommand(e, n, heredocInput) {
  let interpreterScript = findInterpreterScript("python", e, n.rubyAttachedPattern);
  let index = e.findIndex((v) => v === interpreterScript || isEvalFlag("python", v.text));
  if (
    (index === -1 ? e : e.slice(0, e[index] === interpreterScript ? index : index + 1)).some((v) =>
      /^-[bBdEhIOPqRsSuvVx]*i/.test(v.text),
    )
  )
    return "it runs python with -i";
  let h = false;
  for (let v = 0; v < e.length; v += 1) {
    let text = e[v].text;
    if (text === "-" || isStdinLikePath(e[v]))
      return h
        ? pythonHeredocExecReason(heredocInput)
        : "it runs python with -m, -c or a program on stdin, without -P or -I";
    if (text === "--" && h && (e[v + 1] === undefined || e[v + 1].text === "-" || isStdinLikePath(e[v + 1])))
      return pythonHeredocExecReason(heredocInput);
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
        h = true;
        continue;
      }
      if (O === "V" || O === "h") return;
      if (O === "W" || O === "X") {
        if (C === text.length - 1) v += 1;
        break;
      }
      if (O === "m")
        return h ? undefined : "it runs python with -m, -c or a program on stdin, without -P or -I";
      if (O === "c") {
        let x = C < text.length - 1 ? text.slice(C + 1) : (e[v + 1]?.text ?? "");
        if (!n.runsTextHeld)
          return IMPORT_OR_EXEC_RE.test(x)
            ? "it runs python with -m, -c or a program on stdin, without -P or -I"
            : undefined;
        if (EXEC_OR_EVAL_RE.test(x))
          return "it runs python with -c code that mentions exec, eval or execfile";
        return !h && PYTHON_IMPORT_PATTERN.test(x)
          ? "it runs python with -m, -c or a program on stdin, without -P or -I"
          : undefined;
      }
    }
  }
  return h
    ? pythonHeredocExecReason(heredocInput)
    : "it runs python with -m, -c or a program on stdin, without -P or -I";
}
//@ chunk-mthxbav8.js:106469-106655 placement
var MAKE_AWK_INCLUDE_RE =
  /^[ \t]*-?(?:s?include|load)[ \t]+(?!=)([^\n]*)$|^[ \t]*\.[ \t]*[ds-]?include[ \t]*("[^\n]*)$|^[ \t]*@(?:include|load)[ \t]*("[^\n]*)$/gm;
var MAKE_OR_AWK_RE = /^(?:[gbp]|gnu)?(?:make|[gnm]?awk)$/i;
//@ chunk-mthxbav8.js:106655-106933 placement
function shebangInterpreter(e) {
  let parts = e.trim().split(/[ \t]+/);
  let r = 0;
  if (/(?:^|\/)env$/.test(parts[0] ?? "")) {
    r = 1;
    while (r < parts.length && (parts[r].startsWith("-") || /^[A-Za-z_][A-Za-z0-9_]*=/.test(parts[r])))
      r += /^-[A-Za-z]*[PuC]$|^--(?:unset|chdir)$/.test(parts[r]) ? 2 : 1;
  }
  let s = parts[r] ?? "";
  return s.slice(s.lastIndexOf("/") + 1);
}
//@ chunk-mthxbav8.js:106933-107335 placement
/**
 * CLAUDE_PROJECT_DIR 引用正则、shell 注释行正则与若干 bot_protected 特性名常量。
 */
var CLAUDE_PROJECT_DIR_PATTERN = /\bCLAUDE_PROJECT_DIR\b/i;
var SHELL_COMMENT_LINE_RE = /^[ \t]*#.*$/gm;
var BOT_PROTECTED_TENGU_PLUMED_HERON = "bot_protected_tengu_plumed_heron";
var BOT_PROTECTED_TENGU_COMPOSED_FALCON = "bot_protected_tengu_composed_falcon";
var BOT_PROTECTED_TENGU_BANDED_KINGFISHER = "bot_protected_tengu_banded_kingfisher";
var BOT_PROTECTED_TENGU_QUIET_FIELDFARE = "bot_protected_tengu_quiet_fieldfare";
var BOT_PROTECTED_TENGU_MOSSY_CHIPMUNK = "bot_protected_tengu_mossy_chipmunk";
var BOT_PROTECTED_TENGU_SEQUENTIAL_POND = "bot_protected_tengu_sequential_pond";
var TENGU_FEDERATED_HEARTH = "tengu_federated_hearth";
var BOT_PROTECTED_TENGU_GLITTERY_POND = "bot_protected_tengu_glittery_pond";
var BOT_PROTECTED_TENGU_PLAITED_OSIER = "bot_protected_tengu_plaited_osier";
//@ chunk-mthxbav8.js:107335-109001 placement
function analyzeScriptFile(bytes, n, home, interpreter, u = {}) {
  let str = (bytes.includes(0) ? Buffer.from(bytes.filter((P) => P !== 0)) : bytes).toString("utf8");
  let index = str.indexOf(`
`);
  let v = str.startsWith("#!") ? str.slice(2, index === -1 ? undefined : index) : "";
  let y = shebangInterpreter(v);
  let C =
    interpreter !== undefined && interpreter !== null
      ? /^(?:bash|sh|zsh|dash|ash|ksh|mksh|rbash|fish)$/i.test(interpreter)
      : y === "" || SHELL_NAME_RE.test(y) || MAKE_OR_AWK_RE.test(y);
  let O = str.startsWith("#!") ? (index === -1 ? "" : str.slice(index + 1)) : str;
  let quotedBackslashKept = u.quotedBackslashKept !== false;
  let R =
    v +
    `
` +
    (C ? stripShellComments(O, quotedBackslashKept) : str.replace(SHELL_COMMENT_LINE_RE, ""));
  let j = normalizeCommandForPlatform(R);
  let found = uniq(n)
    .flatMap((P) => pathPrefixes(P, home))
    .find((P) =>
      new RegExp(
        `(?<![\\w./~$-])${urlPatternToRegex(normalizeCommandForPlatform(P))}${P.endsWith("/") ? "" : "(?![\\w.-])"}`,
      ).test(j),
    );
  if (found !== undefined) return `it names ${found.replace('"', "")}`;
  if (CLAUDE_PROJECT_DIR_PATTERN.test(j)) return "it reads $CLAUDE_PROJECT_DIR";
  if (CWD_DEPENDENCE_PATTERN.test(j) || (C && PWD_REFERENCE_RE.test(j)))
    return "it uses its working directory";
  if (u.histcharsHeld !== false && HISTCHARS_RE.test(str.replace(/\$(?=['"])|\\\n|['"\\]/g, "")))
    return "it names zsh's histchars, which can make zsh run lines that look like comments";
  let lower = (interpreter ?? y).toLowerCase();
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
      home,
      fromPayload: false,
      shell: lower,
      quotedBackslashKept,
      zshNullCommandHeld: u.zshNullCommandHeld !== false,
      rubyAttachedPattern: u.rubyAttachedPattern !== false,
      forNameDo: u.forNameDo !== false,
      runsTextHeld: u.runsTextHeld !== false,
      relativeNamedValues: u.relativeNamedValues,
      substitutionHeredocs: u.substitutionHeredocs !== false,
    };
    T =
      (C ? analyzeCommandText(O, MAKE_OR_AWK_RE.test(shebangInterpreter(v)), P) : undefined) ??
      collectCommandReach(v, P);
  } catch {
    T = "it could not be read as shell";
  }
  if (T !== undefined) return T;
  if (MAKE_OR_AWK_RE.test(shebangInterpreter(v)) && hasRelativeInclude(R))
    return "it includes another build file, plugin or awk source by a relative name";
  return;
}
//@ chunk-mthxbav8.js:109001-109138 placement
function stripShellComments(e, quotedBackslashKept) {
  let r = [];
  let s = 0;
  for (let [u, S] of shellComments(e, {
    quotedBackslashKept,
  })) {
    r.push(e.slice(s, u));
    s = S;
  }
  r.push(e.slice(s));
  return r.join("");
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
      return true;
  }
  return false;
}
//@ chunk-mthxbav8.js:109374-109808 placement
function collectCommandReach(e, n) {
  let r = [];
  let s = [];
  for (let command of parseShellCommands(e, {
    quotedBackslashKept: n.quotedBackslashKept,
  }).commands)
    analyzeCommandReach(command, r, {
      roots: [],
      home: "",
      fromPayload: false,
      standing: s,
      quotedBackslashKept: n.quotedBackslashKept,
      zshNullCommandHeld: n.zshNullCommandHeld,
      rubyAttachedPattern: n.rubyAttachedPattern,
      forNameDo: n.forNameDo,
      runsTextHeld: n.runsTextHeld,
      substitutionHeredocs: false,
    });
  return (
    s[0] ??
    r
      .map((u) =>
        analyzeCommandText(
          u,
          false,
          {
            ...n,
            fromPayload: true,
          },
          1,
        ),
      )
      .find((u) => u !== undefined)
  );
}
//@ chunk-mthxbav8.js:109808-110592 placement
function analyzeCommandText(e, make, r, s = 0) {
  let { commands, unreadable } = parseShellCommands(e, {
    make,
    quotedBackslashKept: r.quotedBackslashKept,
    substitutionHeredocs: r.substitutionHeredocs,
  });
  let w = [];
  let h = new Set(r.relativeNames);
  for (let { program, args, assignments } of commands) {
    let O = /^(?:export|declare|typeset|local|readonly)$/.test(program.text)
      ? [...assignments, ...args]
      : assignments;
    for (let x of O) {
      let match = /^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]+)$/.exec(x.text);
      if (match !== null && !isAbsoluteLike(match[2], PATH_PREFIX_CHARS_RE)) h.add(match[1]);
    }
  }
  for (let command of commands) {
    let y = analyzeCommandReach(command, w, {
      ...r,
      make,
      relativeNames: h,
    });
    if (y !== undefined) return y;
  }
  if (unreadable !== null) return `it could not be read to the end as shell (${unreadable})`;
  for (let v of w) {
    let y =
      s >= 3
        ? "it hands shell code to a shell too many layers deep"
        : analyzeCommandText(
            v,
            false,
            r.relativeNamedValues === false
              ? {
                  ...r,
                  fromPayload: true,
                }
              : {
                  ...r,
                  fromPayload: true,
                  relativeNames: h,
                },
            s + 1,
          );
    if (y !== undefined) return y;
  }
  return;
}
//@ chunk-mthxbav8.js:110592-110728 placement
var MAX_FORWARDED_HOOKS_2 = 128;
var MAX_FORWARDED_HOOKS_PER_EVENT = MAX_HOOKS_PER_EVENT;
var MAX_DEVICE_HOOK_TEMPLATES = 8;
var MAX_FORWARDED_HOOKS = 512;
var MAX_DEVICE_HOOK_TIMEOUT_S = 600;
var HOOK_SOURCE_DESCRIPTIONS = {
  user: "your user settings",
  local: "this folder's settings.local.json",
  flag: "the --settings file",
};
//@ chunk-mthxbav8.js:110728-110907 placement
function deviceHookKey(e, hook, defaultShell) {
  let s =
    hook.type === "command"
      ? `${hook.shell ?? defaultShell}\x00${hook.command}\x00${jsonStringify(hook.args ?? null)}`
      : hook.url;
  return `${e.event}\x00${e.matcher ?? ""}\x00${hook.type}\x00${s}\x00${hook.if ?? ""}`;
}
//@ chunk-mthxbav8.js:110907-110967 placement
function clampHookTimeout(timeout) {
  return timeout !== undefined && timeout > 0 ? Math.min(timeout, MAX_DEVICE_HOOK_TIMEOUT_S) : undefined;
}
//@ chunk-mthxbav8.js:110967-111053 placement
async function realpathOrSelf(e, n) {
  try {
    let r = await e.realpath(n);
    return isAbsolutePlatformPath(r) ? r : n;
  } catch {
    return n;
  }
}
//@ chunk-mthxbav8.js:111053-111359 placement
/**
 * "来源在云会话可写范围"的三种拒绝原因对象。
 */
var SYNC_ROOT_REASONS = {
  reason: "source_in_sync_root",
  cause: "the cloud session can change that file",
};
var SYNC_ROOT_REASON = {
  reason: "source_in_sync_root",
  cause: "this machine could not check where that file is",
};
var SYNC_ROOT_IS_CONFIG_DIR_REASON = {
  reason: "sync_root_is_config_dir",
  cause: "a directory the cloud session can write on this machine is a Claude config directory",
};
//@ chunk-mthxbav8.js:111359-112660 placement
async function checkHookSourceReach(source, n) {
  let rootReal = n.opts.sync?.rootReal;
  let reachMemory = source.source === "local" ? undefined : n.opts.reachMemory;
  if (
    source.settingsFile === null ||
    (!reachMemory?.everInReach.has(source.source) &&
      rootReal === undefined &&
      n.roots.extraReach.length === 0)
  )
    return null;
  let settingsFile = source.settingsFile;
  let localSettingsLocation = source.source === "local" ? n.opts.localSettingsLocation : undefined;
  let w = localSettingsLocation?.current ?? null;
  if (w === null) {
    let foreignSpelling = await resolveForeignSpellingAsync(
      await classifyPathSpelling_3(settingsFile, n.opts.launchDir),
      n.opts.launchDir,
      protectedHomeRoots(),
    );
    if (foreignSpelling.verdict !== "local") return SYNC_ROOT_REASON;
    try {
      w = [foreignSpelling.spelling, await n.deps.realpath(foreignSpelling.spelling)];
    } catch {
      return SYNC_ROOT_REASON;
    }
    if (localSettingsLocation !== undefined) {
      localSettingsLocation.current ??= w;
      w = localSettingsLocation.current;
    }
  }
  let mapped = [settingsFile, ...w, ...(reachMemory?.knownSpellings.get(source.source) ?? [])].map(
    normalizeCommandForPlatform,
  );
  let v = getPlatform() === "windows";
  let y = v ? /[\\/]/ : "/";
  let mapped_2 = [
    ...(rootReal !== undefined ? [rootReal] : []),
    ...(n.opts.sync?.root !== undefined ? [n.opts.sync.root] : []),
    ...n.roots.extraReach,
  ].map((q) =>
    v
      ? normalizeCommandForPlatform(q).replace(/[\\/]+$/, "") || "/"
      : normalizeCommandForPlatform(q.replace(/\/+$/, "") || "/"),
  );
  if (mapped_2.some((q) => mapped.some((T) => !isPathUnderForPlatform(T, q) && isReachableOrSamePath(T, q))))
    return SYNC_ROOT_REASON;
  let filtered = mapped_2.filter((q) => mapped.some((T) => isPathUnderForPlatform(T, q)));
  let flattened = mapped.flatMap((q) =>
    filtered.flatMap((T) =>
      isPathUnderForPlatform(q, T) ? [q === T ? "" : q.slice(T === "/" ? 1 : T.length + 1)] : [],
    ),
  );
  if (flattened.length === 0) return reachMemory?.everInReach.has(source.source) ? SYNC_ROOT_REASON : null;
  let R = uniq([n.roots.configHomeReal, n.opts.configHome].map(normalizeCommandForPlatform));
  if (
    filtered.some(
      (q) =>
        R.some((T) => q === T || isReachableOrSamePath(q, T) || isReachableOrSamePath(T, q)) ||
        q.split(y).includes(".claude"),
    )
  )
    return SYNC_ROOT_IS_CONFIG_DIR_REASON;
  let all = flattened.every((q) => q.split(y).some((T) => T.startsWith(".")));
  return source.source === "local" && all ? null : SYNC_ROOT_REASONS;
}
//@ chunk-mthxbav8.js:112660-112810 placement = convertToHookMatchers (0.839)
/**
 * 把 {hooks:{事件:[matcher]}} 展平成 {source, event, matcher, hook} 列表。
 */
function flattenHookEntries(sessionMatchers) {
  return Object.entries(sessionMatchers.hooks).flatMap(([key, value]) =>
    (value ?? []).flatMap((sm) =>
      sm.hooks.map((hook) => ({
        source: sessionMatchers,
        event: key,
        matcher: sm.matcher,
        hook,
      })),
    ),
  );
}
//@ chunk-mthxbav8.js:112810-112927 placement
function isSimpleScriptCommand(command, interpreter) {
  let parts = command.trim().split(/ +/);
  return interpreter === null
    ? parts.length === 1
    : (interpreter === "python3" || interpreter === "python") && parts.length === 2;
}
//@ chunk-mthxbav8.js:112927-112964 placement
function isKnownHookEvent(event) {
  return HOOK_EVENTS.includes(event);
}
//@ chunk-mthxbav8.js:112964-113008 placement
var ENV_PROGRAM_PATHS = new Set(["/usr/bin/env", "/bin/env"]);
//@ chunk-mthxbav8.js:113008-113703 placement
function readShebang(bytes) {
  let str = bytes.subarray(0, 512).toString("utf8");
  if (!str.startsWith("#!")) return null;
  let index = str.indexOf(`
`);
  let parts = str
    .slice(2, index === -1 ? undefined : index)
    .replace(/^[ \t]+|[ \t]+$/g, "")
    .split(/[ \t]+/);
  let u = parts[0];
  if (u === undefined || u === "") return null;
  if (parts.some((v) => /[^\x21-\x7e]/.test(v))) return "unjudgeable";
  if (!u.startsWith("/") || DOT_DOT_SEGMENT_RE.test(u)) return "unjudgeable";
  let S = isPlainOptionWord;
  if (!ENV_PROGRAM_PATHS.has(normalizeCommandForPlatform(posix.normalize(u))))
    return parts.slice(1).every(S) ? posix.normalize(u) : "unjudgeable";
  let w = parts[1] === "-S" ? parts.slice(2) : parts.slice(1);
  let h = w[0];
  if (h === undefined || h.startsWith("-") || h.includes("=") || !w.slice(1).every(S)) return "unjudgeable";
  if (h.startsWith("/")) return DOT_DOT_SEGMENT_RE.test(h) ? "unjudgeable" : posix.normalize(h);
  return /^[\w.+-]+$/.test(h) ? null : "unjudgeable";
}
//@ chunk-mthxbav8.js:113703-113857 placement
var DOT_DOT_SEGMENT_RE = /(?:^|\/)\.\.(?:\/|$)/;
var SAFE_DEVICE_PATH_RE =
  /^\/dev\/(?:null|zero|full|u?random|tty\d*|pts(?:\/.*)?|ptmx|std(?:in|out|err)|fd(?:\/.*)?|dtracehelper|autofs_nowait)$/;
//@ chunk-mthxbav8.js:113857-113891 placement = filterManagedDisabledPlugins (1)
function filterManagedDisabledPlugins(plugins) {
  return plugins === "local";
}
//@ chunk-mthxbav8.js:113891-121853 placement
/**
 * 判定一个钩子是否能在设备上执行（held/run 等），检查事件、命令可达路径、同步根与证明。
 */
async function decideDeviceHook(e, n, r = false, s = false) {
  if (!isMatcherEvent(e.event))
    return {
      kind: "held",
      reason: `event_${(isKnownHookEvent(e.event) ? hookEventForwardingKind(e.event) : null) ?? "container_internal"}`,
    };
  let { hook } = e;
  if (hook.type !== "command" && hook.type !== "http")
    return {
      kind: "held",
      reason: "kind_unsupported",
    };
  let S = filterManagedDisabledPlugins(e.source.source);
  let w = hook.cloud === "device" && !S;
  let h =
    hook.cloud === "device" && S ? ' Its "cloud": "device" mark is ignored in settings.local.json.' : "";
  let v = `"${hookContentLabel(hook)}" in ${HOOK_SOURCE_DESCRIPTIONS[e.source.source]} does not run for cloud work`;
  let y = isCodeEditingMatcherOnly(e.event, e.matcher);
  if (r)
    return y
      ? {
          kind: "held",
          reason: "after_edit",
        }
      : {
          kind: "forward",
          event: e.event,
          hook,
        };
  let { hooksFolderInReach } = n;
  let O = hooksFolderInReach || S ? "" : " Check the script, then move it to ~/.claude/hooks.";
  if (y && hook.cloud === "skip")
    return {
      kind: "held",
      reason: "after_edit",
    };
  if (hook.cloud === "skip")
    return {
      kind: "held",
      reason: "author_skip",
      notice: `${v}: its entry is marked "cloud": "skip" or a value this version does not know.`,
    };
  let x;
  let R;
  let j;
  let M = false;
  let q = false;
  let T = false;
  let P = false;
  let L = false;
  let N;
  let F;
  let X =
    y && w
      ? `${v}: cloud edits change files in the cloud.${n.opts.inRepository ? " Put the hook in the repository's .claude/settings.json." : ""}`
      : undefined;
  if (hook.type === "command") {
    let B = await classifyDeviceHookReach(hook, n.reach, n.deps, {
      resolved: n.resolved,
    });
    q = B.kind === "opaque" && B.reason === "private_dotdir";
    T = B.kind === "opaque" && B.reason === "shell_prefix";
    P = B.kind === "opaque" && (B.reason === "unsupported_platform" || B.reason === "unsupported_shell");
    if (B.kind === "unverifiable") {
      M = true;
      R = {
        kind: "held",
        reason: "unverifiable_target",
        notice: `${v}: ${B.missing ? "its script is missing" : "this machine could not verify its script"}.`,
        ...(B.missing && {
          cause: "script_missing",
        }),
      };
    } else if (B.kind === "script_in_reach" || B.kind === "script_outside_reach") {
      M = true;
      let Q = B.kind === "script_in_reach";
      x = B.pinnedTarget;
      if (Q && !w)
        j = {
          kind: "held",
          reason: "in_reach",
          notice: `${v}: the cloud session can change the hook's script.${O}${h}`,
          ...(hooksFolderInReach && {
            noRemedy: true,
          }),
        };
      let ee = commandReachRoots(n.reach);
      let D = [
        ...(B.site.form === "exec" && B.site.slot === "arg0" && hook.command.startsWith("/")
          ? [DOT_DOT_SEGMENT_RE.test(hook.command) ? "unjudgeable" : posix.normalize(hook.command)]
          : []),
        ...(B.interpreter === null ? [readShebang(B.bytes)].filter((z) => z !== null) : []),
      ];
      let G;
      for (let z of D) {
        if (z === "unjudgeable") {
          G = "this machine cannot check the interpreter the hook names";
          break;
        }
        let foreignSpelling = await resolveForeignSpellingAsync(
          await classifyPathSpelling_3(z, n.opts.launchDir),
          n.opts.launchDir,
          protectedHomeRoots(),
        );
        let re =
          foreignSpelling.verdict === "local"
            ? await n.deps.realpath(foreignSpelling.spelling).catch(() => null)
            : null;
        if (re === null) {
          G = `its interpreter ${sanitizeDisplayText(z, {
            maxCodeUnits: 200,
          })} could not be located on this machine`;
          break;
        }
        if ([z, re].some((ne) => ee.some((ae) => isSameCommandPath(ne, ae)))) {
          G = `the cloud session can change its interpreter ${sanitizeDisplayText(z, {
            maxCodeUnits: 200,
          })}`;
          break;
        }
      }
      if (G === undefined && B.interpreter === null) {
        let shebang = readShebang_2(B.bytes);
        if (
          shebang !== null &&
          (shebang === "unjudgeable" || (shebang.kind !== "absolute" && shebang.kind !== "env"))
        )
          G = "its interpreter may load code the cloud session can change";
      }
      if (G !== undefined && !Q)
        if (w) L = true;
        else
          j = {
            kind: "held",
            reason: "interpreter_unvouched",
            notice: `${v}: ${G}.${S ? "" : " Use bash, python3 or node from your PATH."}${h}`,
          };
      L = L || (Q && w);
      if (!Q) {
        let flagWithOverride = readFlagWithOverride(BOT_PROTECTED_TENGU_GLITTERY_POND, {
          safe: true,
        });
        let K = analyzeScriptFile(
          B.bytes,
          [
            n.reach.launchDir,
            n.reach.launchDirReal,
            ...(n.reach.sync !== undefined
              ? [n.reach.sync.rootReal, ...(n.reach.sync.root !== undefined ? [n.reach.sync.root] : [])]
              : []),
            ...n.reach.extraReach,
          ].filter((re) => !SAFE_DEVICE_PATH_RE.test(re)),
          n.deps.home,
          B.interpreter,
          {
            quotedBackslashKept: readFlagWithOverride(BOT_PROTECTED_TENGU_PLUMED_HERON, {
              safe: true,
            }),
            zshNullCommandHeld: readFlagWithOverride(BOT_PROTECTED_TENGU_COMPOSED_FALCON, {
              safe: true,
            }),
            histcharsHeld: readFlagWithOverride(BOT_PROTECTED_TENGU_BANDED_KINGFISHER, {
              safe: true,
            }),
            rubyAttachedPattern: readFlagWithOverride(BOT_PROTECTED_TENGU_QUIET_FIELDFARE, {
              safe: true,
            }),
            forNameDo: readFlagWithOverride(BOT_PROTECTED_TENGU_MOSSY_CHIPMUNK, {
              safe: true,
            }),
            runsTextHeld: readFlagWithOverride(BOT_PROTECTED_TENGU_SEQUENTIAL_POND, {
              safe: true,
            }),
            relativeNamedValues: flagWithOverride,
            substitutionHeredocs: readFlagWithOverride(BOT_PROTECTED_TENGU_PLAITED_OSIER, {
              safe: true,
            }),
          },
        );
        if (K !== undefined && !w && j === undefined)
          j = {
            kind: "held",
            reason: "loads_from_reach",
            notice: `${v}: its script may load files the cloud session can change. ${(flagWithOverride
              ? sanitizeDisplayText(K, {
                  maxCodeUnits: 400,
                })
              : K
            ).replace(/^it /, "The script ")}.${h}`,
          };
        else if (K !== undefined && w) L = true;
      }
      if (w && n.opts.optInPins !== undefined) {
        let z = `${B.pinnedTarget.realPath}\x00${B.pinnedTarget.sha256}`;
        let K = n.opts.optInPins.get(B.pinnedTarget.path);
        if (K === undefined || (!Q && K !== z)) n.opts.optInPins.set(B.pinnedTarget.path, z);
        else if (K !== z) {
          R = {
            kind: "held",
            reason: "unverifiable_target",
            notice: `${v}: its script changed and the cloud session can write to it. Check the file, then restart claude --cloud.`,
          };
          x = undefined;
          L = false;
        }
      }
      let Y = s ? undefined : (n.deps.findTemplateByDigest ?? findTemplateByDigest)(B.pinnedTarget.sha256);
      let Z = w && !y ? undefined : Y;
      if (
        w &&
        Y !== undefined &&
        hook.args === undefined &&
        !hook.if &&
        !hook.async &&
        !hook.asyncRewake &&
        !hook.once &&
        isSimpleScriptCommand(hook.command, B.interpreter)
      )
        N = Y.template.id;
      if (Z) {
        let { template, label } = Z;
        let included = (n.opts.refusedTemplateIds ?? []).includes(template.id);
        let ne = !included && (n.opts.enabledTemplateIds ?? hookTemplateIds()).includes(template.id);
        if (included)
          X = y
            ? `${template.filename} is an after-edit hook, so it is not forwarded either: it does not run for this cloud session, only in local ones.`
            : undefined;
        else if (!ne)
          X = y
            ? `${template.filename} is not run in the cloud in this version, and as an after-edit hook it is not forwarded either, so it only runs in local sessions.`
            : `${template.filename} is not run in the cloud in this version; it runs on this machine instead.`;
        else if (template.event !== e.event)
          X = `${template.filename} is configured on ${e.event}; the cloud runs it only on ${template.event}, so it runs on this machine instead.`;
        else if (label === "legacy" && !n.opts.allowLegacyTemplateDigests)
          X = `${template.filename} is an older copy of ${template.id}; the cloud will not run it. Update it.`;
        else if (
          hook.args !== undefined ||
          hook.if ||
          hook.async ||
          hook.asyncRewake ||
          hook.once ||
          !isSimpleScriptCommand(hook.command, B.interpreter)
        )
          X = `${template.filename} is run in a way the cloud cannot reproduce (arguments, a condition, async or once), so it runs on this machine instead.`;
        else if (
          e.matcher !== undefined &&
          !isWildcardMatcher(e.matcher) &&
          (!isShortSingleLine(e.matcher) || !MATCHER_NAME_RE.test(e.matcher))
        )
          X = undefined;
        else if (!isMatcherSubset(e.matcher, template.matcher))
          X = `${template.filename} is configured with the matcher "${sanitizeDisplayText(e.matcher ?? "", {
            maxCodeUnits: 200,
          })}" and the cloud runs it on "${template.matcher}", so it runs on this machine instead.`;
        else {
          let ae = clampHookTimeout(hook.timeout);
          F = {
            entry: {
              wire: {
                template: template.id,
                digest: B.pinnedTarget.sha256,
                event: e.event,
                ...(!isWildcardMatcher(e.matcher) && {
                  matcher: e.matcher,
                }),
                ...(ae !== undefined && {
                  timeout_s: ae,
                }),
              },
              local: {
                templateId: template.id,
                label,
                scriptRealPath: B.pinnedTarget.realPath,
                bytes: B.bytes,
                userMatcher: e.matcher,
                source: e.source.source,
              },
            },
            ...(label === "legacy" && {
              legacyNotice: `${template.filename} is an older copy of ${template.id}; the cloud will run that copy. Update it to get fixes.`,
            }),
            ...(e.matcher !== undefined &&
              !isWildcardMatcher(e.matcher) &&
              !isMatcherSubset(template.matcher, e.matcher) && {
                narrowNotice: `${template.filename} is configured with the matcher "${sanitizeDisplayText(
                  e.matcher,
                  {
                    maxCodeUnits: 200,
                  },
                )}"; in the cloud it runs on "${template.matcher}" only.`,
              }),
          };
        }
        if (F === undefined && y && ne)
          X = `${(X ?? `${template.filename} cannot move to the cloud here.`).replace(/(?:, so|; it) (?:it )?runs on this machine instead\.$/, ".").replace(/\.$/, "")}, and as an after-edit hook it is not forwarded either: it runs in local sessions only.`;
      }
    }
  }
  if (F !== undefined) {
    let joined = [F.legacyNotice, F.narrowNotice].filter((Q) => Q !== undefined).join(" ");
    return {
      kind: "template",
      entry: F.entry,
      event: e.event,
      hook,
      ...(joined !== "" && {
        notice: joined,
      }),
    };
  }
  if (y)
    return {
      kind: "held",
      reason: "after_edit",
      ...(X !== undefined && {
        notice: X,
      }),
    };
  if (R !== undefined) return R;
  if (e.matcher !== undefined && !isShortSingleLine(e.matcher))
    return {
      kind: "held",
      reason: "over_cap",
    };
  if (e.matcher !== undefined && !isWildcardMatcher(e.matcher) && !MATCHER_NAME_RE.test(e.matcher))
    return {
      kind: "held",
      reason: "pattern_matcher",
      notice: `"${hookContentLabel(hook)}" does not run for cloud work: cloud sessions cannot take the pattern matcher "${sanitizeDisplayText(
        e.matcher,
        {
          maxCodeUnits: 200,
        },
      )}".${S ? "" : ` List the names to match${TOOL_HOOK_EVENTS.has(e.event) ? `, such as ${BASH_TOOL_NAME}|${FILE_READ_TOOL_NAME}` : ""}.`}`,
    };
  if (j !== undefined) return j;
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
        ...(T
          ? {
              cause: "shell_prefix",
            }
          : q && {
              cause: "dot_folder",
            }),
        ...((hooksFolderInReach || P) && {
          noRemedy: true,
        }),
      };
    L = true;
  }
  return {
    kind: "forward",
    event: e.event,
    hook,
    ...(x !== undefined && {
      pinnedTarget: x,
    }),
    ...(L && {
      authorOptIn: true,
    }),
    ...(w && {
      cloudDevice: true,
    }),
    ...(N !== undefined && {
      templateTwinId: N,
    }),
    ...(X !== undefined && {
      notice: X,
    }),
  };
}
//@ chunk-mthxbav8.js:121853-121916 placement
function isShortSingleLine(matcher) {
  return matcher.length <= MAX_FORWARDED_HOOKS && !/[\p{Cc}\p{Cf}]/u.test(matcher);
}
//@ chunk-mthxbav8.js:121916-121998 placement
function duplicateHookText(templateId) {
  return `${templateId} is configured more than once; the cloud runs it once.`;
}
//@ chunk-mthxbav8.js:121998-122137 placement
function createDeviceHookAttestations() {
  return {
    forwarded: [],
    templates: [],
    held: [],
    heldCounts: {
      after_edit: 0,
      kind_unsupported: 0,
      plugin: 0,
      managed: 0,
      other: 0,
    },
    notices: [],
  };
}
//@ chunk-mthxbav8.js:122137-127931 placement
/**
 * 收集本机所有钩子的证明信息（可转发/被扣留的原因），供远程会话使用。
 */
async function collectDeviceHookAttestations(captured, n, r) {
  let deviceHookAttestations = createDeviceHookAttestations();
  if (captured.kind === "none") return deviceHookAttestations;
  let u = {
    launchDirReal: await realpathOrSelf(r, n.launchDir),
    projectDirReal: await realpathOrSelf(r, n.projectDir),
    configHomeReal: await realpathOrSelf(r, n.configHome),
    extraReach: uniq(
      (
        await Promise.all(
          [...(n.repoRoot !== undefined ? [n.repoRoot] : []), ...(n.extraReachRoots ?? [])].map(async (P) => {
            let foreignSpelling = await resolveForeignSpellingAsync(
              await classifyPathSpelling_3(P, n.launchDir),
              n.launchDir,
              protectedHomeRoots(),
            );
            return foreignSpelling.verdict === "local"
              ? [P, await realpathOrSelf(r, foreignSpelling.spelling)]
              : foreignSpelling.verdict === "foreign"
                ? [foreignSpelling.spelling]
                : [P, ...spellingsToCheck(foreignSpelling, n.launchDir)];
          }),
        )
      ).flat(),
    ),
  };
  let S = {
    launchDir: n.launchDir,
    launchDirReal: u.launchDirReal,
    configHomeReal: u.configHomeReal,
    projectDir: n.projectDir,
    projectDirReal: u.projectDirReal,
    ...(n.sync !== undefined && {
      sync: n.sync,
    }),
    extraReach: u.extraReach,
  };
  let w = {
    opts: n,
    deps: r,
    roots: u,
    reach: S,
    resolved: new Map(),
    hooksFolderInReach: pathWithinReach([posix.join(r.home, ".claude", "hooks")], S),
  };
  let h = (P, L, { cause: N, noRemedy: F } = {}) => {
    deviceHookAttestations.held.push({
      event: P.event,
      ...(P.matcher !== undefined && {
        matcher: sanitizeDisplayText(P.matcher, {
          maxCodeUnits: 200,
        }),
      }),
      source: P.source.source,
      command: hookContentLabel(P.hook),
      reason: L,
      ...(N !== undefined && {
        cause: N,
      }),
      ...((F || filterManagedDisabledPlugins(P.source.source) || (L === "after_edit" && !n.inRepository)) && {
        noRemedy: true,
      }),
    });
    if (L === "after_edit") deviceHookAttestations.heldCounts.after_edit += 1;
    else if (L === "kind_unsupported") deviceHookAttestations.heldCounts.kind_unsupported += 1;
    else deviceHookAttestations.heldCounts.other += 1;
  };
  let v = new Set();
  let y = (notice) => {
    if (notice !== undefined && !v.has(notice)) {
      v.add(notice);
      deviceHookAttestations.notices.push(notice);
    }
  };
  let C = (notice) => {
    if (v.delete(notice))
      deviceHookAttestations.notices = deviceHookAttestations.notices.filter(
        (notice_2) => notice_2 !== notice,
      );
  };
  let O = new Map();
  let x = new Map();
  let R = new Map();
  let j = new Set();
  let M = new Set();
  let q = new Map();
  if (
    [n.launchDir, n.configHome, n.sync?.rootReal, n.sync?.root, ...(n.extraReachRoots ?? [])].some(
      (P) => P !== undefined && !isAbsolutePlatformPath(P),
    )
  ) {
    y(
      "Hooks stay on this machine: its launch, config or sync directory is not an absolute path this version can place, so none are offered to the cloud session.",
    );
    for (let source of captured.sources)
      for (let L of flattenHookEntries(source)) h(L, "unverifiable_target");
    return deviceHookAttestations;
  }
  for (let source of captured.sources) {
    let L = await checkHookSourceReach(source, w);
    let N = flattenHookEntries(source);
    if (L !== null && N.length > 0)
      y(
        `Hooks from ${sanitizeDisplayText(source.settingsFile ?? "", {
          maxCodeUnits: 200,
        })} are not offered to the cloud session: ${L.cause}.`,
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
          {
            noRemedy: true,
          },
        );
        continue;
      }
      if (X.kind === "held") {
        y(X.notice);
        h(F, X.reason, X);
        continue;
      }
      let B = X;
      if (B.kind === "template") {
        let { entry } = B;
        let ae = deviceHookKey(F, B.hook, r.defaultShell);
        let ie = q.get(entry.local.templateId);
        let ce = x.get(ae);
        let oe = ie !== undefined && (ie.site.matcher ?? "") === (F.matcher ?? "");
        let V = ie !== undefined ? oe : deviceHookAttestations.templates.length < MAX_DEVICE_HOOK_TEMPLATES;
        if (ce !== undefined && V) {
          h(ce.site, "duplicate");
          j.add(ce.index);
          if (ce.notice !== undefined) C(ce.notice);
          x.delete(ae);
        }
        if (ie !== undefined && !oe) {
          B = await decideDeviceHook(F, w, false, true);
          if (B.kind === "held") {
            h(F, B.reason, B);
            y(B.notice);
            continue;
          }
        } else if (ie !== undefined) {
          h(ie.site, "duplicate");
          let te = deviceHookKey(ie.site, ie.hook, r.defaultShell);
          if (te !== ae) R.delete(te);
          R.set(ae, {
            index: ie.index,
            templateId: entry.local.templateId,
          });
          deviceHookAttestations.templates[ie.index] = entry;
          if (ie.notice !== undefined) C(ie.notice);
          q.set(entry.local.templateId, {
            index: ie.index,
            site: F,
            hook: B.hook,
            ...(B.notice !== undefined && {
              notice: B.notice,
            }),
          });
          y(duplicateHookText(entry.local.templateId));
          y(B.notice);
          continue;
        } else if (deviceHookAttestations.templates.length >= MAX_DEVICE_HOOK_TEMPLATES) {
          h(F, "over_cap");
          y(
            `Only ${MAX_DEVICE_HOOK_TEMPLATES} templates can run in the cloud session; the rest stay on this machine.`,
          );
          continue;
        } else {
          q.set(entry.local.templateId, {
            index: deviceHookAttestations.templates.length,
            site: F,
            hook: B.hook,
            ...(B.notice !== undefined && {
              notice: B.notice,
            }),
          });
          R.set(ae, {
            index: deviceHookAttestations.templates.length,
            templateId: entry.local.templateId,
          });
          deviceHookAttestations.templates.push(entry);
          y(B.notice);
          continue;
        }
      }
      if (B.kind !== "forward") continue;
      let Q = B;
      let ee = clampHookTimeout(Q.hook.timeout);
      let D = {
        wire: {
          id: "",
          event: F.event,
          ...(!isWildcardMatcher(F.matcher) && {
            matcher: F.matcher,
          }),
          kind: Q.hook.type,
          ...(ee !== undefined && {
            timeout_s: ee,
          }),
          source: source.source,
          ...(Q.hook.if && {
            has_condition: true,
          }),
          ...(Q.pinnedTarget !== undefined && {
            target_pinned: true,
          }),
          ...((Q.authorOptIn || (Q.cloudDevice && Q.hook.type === "command")) && {
            author_opt_in: true,
          }),
        },
        local: {
          hook: Q.hook,
          matcher: F.matcher,
          event: Q.event,
          source: source.source,
          ...(Q.pinnedTarget !== undefined && {
            pinnedTarget: Q.pinnedTarget,
          }),
          ...(Q.cloudDevice && {
            cloudOptIn: true,
          }),
          ...(Q.templateTwinId !== undefined && {
            templateTwinId: Q.templateTwinId,
          }),
        },
      };
      let G = deviceHookKey(F, Q.hook, r.defaultShell);
      let Y = R.get(G);
      let Z = (O.get(F.event) ?? 0) < MAX_FORWARDED_HOOKS_PER_EVENT;
      let z = x.has(G) || (deviceHookAttestations.forwarded.length < MAX_FORWARDED_HOOKS_2 && Z);
      if (Y !== undefined && z) {
        let ne = q.get(Y.templateId);
        if (ne !== undefined && ne.index === Y.index) {
          h(ne.site, "duplicate");
          if (ne.notice !== undefined) C(ne.notice);
          C(duplicateHookText(Y.templateId));
          q.delete(Y.templateId);
        }
        M.add(Y.index);
        R.delete(G);
      }
      let K = x.get(G);
      if (K !== undefined) {
        h(K.site, "duplicate");
        let id = deviceHookAttestations.forwarded[K.index].wire.id;
        deviceHookAttestations.forwarded[K.index] = {
          ...D,
          wire: {
            ...D.wire,
            id,
          },
        };
        if (K.notice !== undefined) C(K.notice);
        x.set(G, {
          index: K.index,
          site: F,
          ...(Q.notice !== undefined && {
            notice: Q.notice,
          }),
        });
        y(Q.notice);
        continue;
      }
      if (deviceHookAttestations.forwarded.length >= MAX_FORWARDED_HOOKS_2) {
        h(F, "over_cap");
        y(
          `Only the first ${MAX_FORWARDED_HOOKS_2} hooks are offered to the cloud session; the rest stay on this machine.`,
        );
        continue;
      }
      if (!Z) {
        h(F, "over_cap");
        y(
          `Only the first ${MAX_FORWARDED_HOOKS_PER_EVENT} ${F.event} hooks are offered to the cloud session; the rest stay on this machine.`,
        );
        continue;
      }
      let re = O.get(F.event) ?? 0;
      O.set(F.event, re + 1);
      x.set(G, {
        index: deviceHookAttestations.forwarded.length,
        site: F,
        ...(Q.notice !== undefined && {
          notice: Q.notice,
        }),
      });
      y(Q.notice);
      deviceHookAttestations.forwarded.push({
        ...D,
        wire: {
          ...D.wire,
          id: formatDeviceHookId(n.instanceId, F.event, re),
        },
      });
    }
  }
  deviceHookAttestations.forwarded = deviceHookAttestations.forwarded.filter((P, L) => !j.has(L));
  deviceHookAttestations.templates = deviceHookAttestations.templates.filter((template, L) => !M.has(L));
  let T = new Map(
    deviceHookAttestations.templates.map((template) => [
      `${template.wire.template}\x00${template.wire.event}`,
      template.wire.template,
    ]),
  );
  deviceHookAttestations.forwarded = deviceHookAttestations.forwarded.filter((P) => {
    let templateTwinId = P.local.templateTwinId;
    let N = templateTwinId === undefined ? undefined : T.get(`${templateTwinId}\x00${P.wire.event}`);
    if (
      templateTwinId === undefined ||
      N === undefined ||
      !isMatcherSubset(getHookTemplate(templateTwinId)?.matcher ?? "", P.local.matcher ?? "*")
    )
      return true;
    deviceHookAttestations.held.push({
      event: P.wire.event,
      ...(P.local.matcher !== undefined && {
        matcher: sanitizeDisplayText(P.local.matcher, {
          maxCodeUnits: 200,
        }),
      }),
      source: P.local.source,
      command: hookContentLabel(P.local.hook),
      reason: "duplicate",
    });
    deviceHookAttestations.heldCounts.other += 1;
    y(
      `"${hookContentLabel(P.local.hook)}" is the same script the cloud already runs as ${N}; it is not also run on this machine.`,
    );
    return false;
  });
  return deviceHookAttestations;
}
//@ chunk-mthxbav8.js:127931-128016 placement
function attestationFor(e) {
  let n = attestationFor_2(e);
  return n === undefined
    ? undefined
    : {
        attestation: n,
        heldBack: isBelowFloorEnforced(n),
      };
}
//@ chunk-mthxbav8.js:128016-128269 placement
function heldHooksNotice(e) {
  let n = e.forwarded + e.templateNames.length;
  return `${n === 1 ? "One of your hooks" : `${n} of your hooks`} could run for cloud sessions started from this machine \u2014 run /hooks to decide (nothing from this machine runs for them until you do).`;
}
//@ chunk-mthxbav8.js:128269-128335 placement
function shellPrefixOf(e) {
  return e.CLAUDE_CODE_SHELL_PREFIX?.trim() || undefined;
}
//@ chunk-mthxbav8.js:128335-128348 placement
var LOCATE_RETRY_DELAY_MS = 30000;
//@ chunk-mthxbav8.js:128348-128709 placement
function resolveConfigFile(
  globalClaudeFile,
  n,
  r = async (s) => ({
    real: await realpath(s),
    aliased: await isSuspiciousHardLinkedFile(s),
  }),
) {
  let s = {
    path: globalClaudeFile,
    real: null,
    env:
      n === undefined
        ? undefined
        : {
            ...n,
          },
    locate: () => {
      s.retryAt = undefined;
      r(globalClaudeFile).then(
        ({ real, aliased }) => {
          s.real = aliased ? "unresolvable" : real;
          if (aliased) s.retryAt = Date.now() + LOCATE_RETRY_DELAY_MS;
        },
        (error) => {
          s.real = "unresolvable";
          if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR")
            s.retryAt = Date.now() + LOCATE_RETRY_DELAY_MS;
        },
      );
    },
  };
  s.locate();
  return s;
}
//@ chunk-mthxbav8.js:128709-128786 placement
function retryLocateIfDue(legacyConfigFile, n = Date.now()) {
  if (legacyConfigFile.retryAt !== undefined && n >= legacyConfigFile.retryAt) legacyConfigFile.locate?.();
}
//@ chunk-mthxbav8.js:128786-128894 placement
function legacyConfigFileOf(memory) {
  memory.legacyConfigFile ??= resolveConfigFile(
    getGlobalClaudeFile(),
    legacyPinOr(memory, getAppliedGlobalConfigEnv()),
  );
  retryLocateIfDue(memory.legacyConfigFile);
  return memory.legacyConfigFile;
}
//@ chunk-mthxbav8.js:128894-129273 placement
function settingsEnvInReach(e, n, r = (s) => getSettingsForSource(s)?.env) {
  let s = (S) =>
    e.pinnedScopes.has(S) ||
    (S === "userSettings" && e.everInReach.has("user")) ||
    (S === "flagSettings" && e.everInReach.has("flag"));
  let u =
    n.env !== undefined &&
    typeof n.real === "string" &&
    n.real !== "unresolvable" &&
    isAbsolute(n.path) &&
    !anyPairMatches([n.path, n.real], [...e.stickyRoots]);
  return Object.assign(
    {},
    u ? n.env : {},
    ...SETTING_SOURCES.filter((S) => !REPO_DIR_SETTING_SOURCES.has(S) && !s(S)).map((S) =>
      settingsEnvForHookChild(r(S), S),
    ),
  );
}
//@ chunk-mthxbav8.js:129273-129304 placement
function projectConfigRootOr(launchDir) {
  return getProjectConfigRoot() ?? launchDir;
}
//@ chunk-mthxbav8.js:129304-129389 placement
function unrefTimeout(e, n) {
  let timer = setTimeout(e, n);
  timer.unref();
  return {
    clear: () => clearTimeout(timer),
  };
}
//@ chunk-mthxbav8.js:129389-129658 placement
function isHookForwardingEnabled() {
  if (!(
    getPlatform() !== "windows" &&
    isViolinWoodEnabledCached() &&
    isViolinAmatiEnabledCached() &&
    !env.CLAUDE_CODE_DISABLE_HOOK_FORWARDING
  ))
    return false;
  if (isViolinWillowEnabledCached()) {
    if (!alwaysTrue()) return true;
    logEvent("tengu_device_hooks_shelved", {
      side: fromEnum("client"),
    });
    return false;
  }
  logEvent("tengu_device_hooks_kept_back", {
    flag: fromEnum(VIOLIN_WILLOW_FLAG),
    own_flags_loaded: hasFreshGrowthBookFeatures(),
  });
  return false;
}
//@ chunk-mthxbav8.js:129658-130516 placement
function createForwardedHookHandler(e) {
  let n = null;
  let r = false;
  let s = new Set();
  return {
    state: () => n,
    setState(u) {
      n = r ? null : u;
    },
    async handleForwardedHook(u) {
      if (r) return;
      try {
        let S = await e.servicer.serve(u, n);
        if (r) return;
        if (S.kind === "silent") {
          if (S.reason === "not_mine" || S.reason === "no_state" || S.reason === "withdrawn")
            e.release(u.requestId);
          return;
        }
        e.respond(u.requestId, S.answer);
      } catch (error) {
        e.logError(error);
        if (parseDeviceHookId(u.callbackId)?.event === "PreToolUse" && !r)
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
      s.add(u);
      return () => s.delete(u);
    },
    async dispose() {
      r = true;
      n = null;
      s.clear();
      e.servicer.cancelAll();
      await e.staging.dispose();
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
  commandReachRoots,
  TENGU_FEDERATED_HEARTH,
  attestationFor,
  createForwardedHookHandler,
  heldHooksNotice,
};
