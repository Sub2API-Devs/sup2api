/**
 * utils/hooks/deviceHooks/commandReach.ts
 *
 * 2.1.316 新增：设备钩子命令可达路径分析与执行判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4z1ntdgk.js (98)
 * attribution: placement 82, layout 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { scriptHookDisplayLabel } from "../scriptHooks.js";
import { sanitizeDisplayText } from "../../resultError.js";
import {
  commandBaseName,
  SHELL_SET_TO_CSH_RE,
  isTildeOrDollarWordChanged,
  isPlainArgument,
  isLauncherCommand,
  isAnchoredPath,
  normalizeInterpreterName,
  isPathWord,
  CSH_SHELL_RE,
  LOOP_WORD_RE,
  ALNUM_NAME_RE,
  BUILD_TOOL_PROGRAMS,
  VERSION_OR_HELP_FLAG_RE,
  SHELL_PROGRAMS,
  SCRIPT_INTERPRETERS,
  isKnownInterpreter,
  isAbsoluteLike,
  PATH_PREFIX_CHARS_RE,
  EXTENSION_INTERPRETERS,
  SHELL_NAME_RE,
  PREFIX_WRAPPER_RE,
  DISABLE_OR_ENABLE_RE,
  QUOTE_OR_CONTINUATION_RE,
  parseShellWords,
  BUILD_SUBCOMMANDS,
  isEvalFlag,
  parseShellCommands,
  INTERPRETER_EVAL_FLAGS,
  attachedPathWord,
  splitQuotedWords,
  isToolEnvVar,
  TOOL_ENV_EXACT_RE,
  SCRIPT_PATH_RE,
  EXEC_OR_EVAL_RE,
  IMPORT_OR_EXEC_RE,
  PYTHON_IMPORT_PATTERN,
  pathPrefixes,
  CWD_DEPENDENCE_PATTERN,
  PWD_REFERENCE_RE,
  HISTCHARS_RE,
  CSH_IN_TEXT_RE,
  shellComments,
} from "./shellReader.js";
import { hasAnyShortFlagChar } from "../../bash/parser.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { firstLineOf, urlPatternToRegex } from "../../stringUtils.js";
import { normalizeCaseForComparison_2 } from "../../permissions/filesystem.js";
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
import { READ } from "../../../tools/FileReadTool/constants.js";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-4z1ntdgk.js:3846-3880 placement
var REMOTE_ROOT_RE = /^[a-z_]{2,}:\[?[^/]*\]?$/;
//@ chunk-4z1ntdgk.js:3880-4323 placement
/**
 * 设备 hook 命令可达的根目录
 */
function commandReachRoots(context) {
  let filtered = [
    context.launchDirReal,
    context.launchDir,
    ...(context.sync !== undefined
      ? [context.sync.rootReal, ...(context.sync.root !== undefined ? [context.sync.root] : [])]
      : []),
    ...context.extraReach,
  ].filter((root) => !REMOTE_ROOT_RE.test(root));
  let found = filtered.find((root) => !isAbsolutePlatformPath(root));
  if (found !== undefined) {
    logForDebugging(
      `[deviceHooks] reach: a root that is not an absolute path (${JSON.stringify(found)}) \u2014 everything on this machine counts as in the cloud session's reach`,
      {
        level: "warn",
      },
    );
    return [POSIX_SEP_2];
  }
  return filtered.map((root) => normalizeCommandForPlatform(root.replace(/\/+$/, "")) || "/");
}
//@ chunk-4z1ntdgk.js:4323-4392 placement
function reachesEverything(roots, paths) {
  return (
    (roots.length === 1 && roots[0] === POSIX_SEP_2) || paths.some((path) => !isAbsolutePlatformPath(path))
  );
}
//@ chunk-4z1ntdgk.js:4392-4476 placement
function commandReachesPath(paths, context) {
  let roots = commandReachRoots(context);
  return (
    reachesEverything(roots, paths) ||
    paths.some((path) => roots.some((root) => isReachableOrSamePath(root, normalizeCommandForPlatform(path))))
  );
}
//@ chunk-4z1ntdgk.js:4476-4560 placement
function pathWithinReach(paths, context) {
  let roots = commandReachRoots(context);
  return (
    reachesEverything(roots, paths) ||
    paths.some((path) => roots.some((root) => isReachableOrSamePath(normalizeCommandForPlatform(path), root)))
  );
}
//@ chunk-4z1ntdgk.js:4560-4826 layout
function hookContentText(hook) {
  switch (hook.type) {
    case "command":
      return hook.args === undefined ? hook.command : [hook.command, ...hook.args].join(" ");
    case "http":
      return hook.url;
    case "prompt":
    case "agent":
      return hook.prompt;
    case "mcp_tool":
      return `${hook.server}/${hook.tool}`;
    case "script":
      return hook.file ?? scriptHookDisplayLabel(hook.script ?? "");
  }
}
//@ chunk-4z1ntdgk.js:4826-4877 placement
/**
 * 取钩子内容的可展示文本（去不可见字符并截断 200）。
 */
function hookContentLabel(hook) {
  return sanitizeDisplayText(hookContentText(hook), {
    maxCodeUnits: 200,
  });
}
//@ chunk-4z1ntdgk.js:4877-6874 placement
/**
 * 判断一个设备钩子能否转发给云会话运行：钩子配置文件或插件根目录处于云会话可写范围内时拒绝；非 command 类型、无法分析的命令分别标注；脚本型命令再检查脚本位置与摘要。
 */
async function classifyDeviceHookReach(hook, context, fs, options = {}) {
  let sources = [
    ...(options.sourceFile !== undefined ? [options.sourceFile] : []),
    ...(options.pluginRoot !== undefined ? [options.pluginRoot] : []),
  ];
  for (let sourcePath of sources) {
    let realPath = await fs.realpath(sourcePath).catch(() => null);
    if (
      realPath === null ||
      pathWithinReach([sourcePath, realPath], context) ||
      (sourcePath === options.pluginRoot && commandReachesPath([sourcePath, realPath], context))
    )
      return {
        kind: "source_in_reach",
        notice: `"${hookContentLabel(hook)}" is configured in a place the cloud session can write on this machine (${sanitizeDisplayText(
          sourcePath,
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
  let analysis = analyzeHookCommand(hook, {
    home: fs.home,
    projectDir: context.projectDir,
    hookCwd: context.projectDirReal,
    defaultShell: fs.defaultShell,
    shellPrefix: fs.shellPrefix,
    ...(options.pluginRoot !== undefined && {
      pluginRoot: options.pluginRoot,
    }),
  });
  if (analysis.kind !== "script")
    return {
      kind: "opaque",
      reason: analysis.reason,
      notice: `"${hookContentLabel(hook)}" is not a single script this machine can pin, so it is not run for the cloud session from this machine: it would run whatever it names in the checkout, which the session may have written. Point it at one script outside the checkout (under ~/.claude, say).`,
    };
  let shownPath = sanitizeDisplayText(analysis.rawPath, {
    maxCodeUnits: 200,
  });
  let { located, digest } = await locateScriptCached(analysis.resolvedPath, context, fs, options.resolved);
  if (located.realPath === null || digest === null || !digest.ok)
    return {
      kind: "unverifiable",
      rawPath: shownPath,
      missing: located.realPath === null && located.missing,
      notice: `${shownPath} could not be read and pinned (missing, too large, not a regular file, more than one hard link, or it resolves to a file this machine does not read as a hook script), so its hook is not run for the cloud session from this machine.`,
    };
  let pinnedInfo = {
    pinnedTarget: {
      path: analysis.resolvedPath,
      realPath: located.realPath,
      sha256: digest.sha256,
    },
    bytes: digest.bytes,
    rawPath: shownPath,
    interpreter: analysis.interpreter,
    site: analysis.site,
  };
  if (pathWithinReach([analysis.resolvedPath, located.realPath], context))
    return {
      kind: "script_in_reach",
      ...pinnedInfo,
      notice: `"${hookContentLabel(hook)}" sits where the cloud session can write on this machine (the checkout, the synced directory or a sandbox write inlet), so it is not run for the cloud session from this machine. Move the script outside the checkout (under ~/.claude, say).`,
    };
  return {
    kind: "script_outside_reach",
    ...pinnedInfo,
  };
}
//@ chunk-4z1ntdgk.js:6874-7072 placement
async function locateScriptCached(path, state, deps, resolved) {
  let cached = resolved?.get(path);
  if (cached) return cached;
  let pending = (async () => {
    let located = await classifyScriptLocation(path, state, deps);
    let digest = located.realPath === null ? null : await checkScriptFile(located.realPath, deps);
    return {
      located,
      digest,
    };
  })();
  resolved?.set(path, pending);
  return pending;
}
//@ chunk-4z1ntdgk.js:80239-92786 placement
/**
 * 分析一条 shell 命令（程序、参数、重定向、heredoc、管道）会读写或执行哪些路径，用于判定设备钩子能否在本机执行。
 */
function analyzeCommandReach(
  { program, args, assignments, redirects, heredoc, piped },
  sources,
  state = {
    roots: [],
    home: "",
    fromPayload: false,
    quotedBackslashKept: true,
    zshNullCommandHeld: true,
    rubyAttachedPattern: true,
    forNameDo: true,
    cShellsHeld: true,
    commandAfterConditional: true,
    runsTextHeld: true,
    shortLoopLists: true,
    disableHeld: true,
    substitutionHeredocs: true,
    unexpandedTilde: true,
  },
) {
  let startIndex = assignments.findIndex((assignment) => commandBaseName(assignment) === "flock");
  let flockArg = startIndex === -1 ? undefined : findSubcommandArg(assignments, startIndex);
  let slicedAssignments = [
    ...assignments.filter((assignment, assignmentIndex) => assignmentIndex !== flockArg?.at),
    ...(/^(?:export|declare|typeset|local|readonly)$/.test(program.text) ? args : []),
  ];
  if (
    state.cShellsHeld &&
    slicedAssignments.some((slicedAssignment) => SHELL_SET_TO_CSH_RE.test(slicedAssignment.text))
  )
    return noteStanding(CSH_SHELL_SET_TEXT, state);
  let assignmentReason = analyzeAssignments(
    slicedAssignments,
    state.shell === "zsh",
    state.zshNullCommandHeld,
    relativeNamesOf(state),
  );
  if (assignmentReason !== undefined && state.standing === undefined) return assignmentReason;
  let found = assignments.find((assignment) => isUnderRoots(assignment, state));
  if (found !== undefined) return "it names " + found.text;
  let splitReason = splitArgsByOperands(
    assignments,
    sources,
    [program, ...args],
    relativeNamesOf(state),
    state.unexpandedTilde,
    state.shell,
  );
  if (splitReason !== undefined && (state.standing === undefined || STANDING_REASON_TEXTS.has(splitReason)))
    return noteStanding(splitReason, state);
  let sudoIndex =
    program.text === ":"
      ? assignments.findIndex((assignment) => /^(?:sudo|doas)$/.test(commandBaseName(assignment)))
      : -1;
  if (
    sudoIndex !== -1 &&
    assignments.some(
      (assignment, assignmentIndex) =>
        assignmentIndex > sudoIndex &&
        (hasAnyShortFlagChar(assignment.text, "si") ||
          assignment.text === "--shell" ||
          assignment.text === "--login"),
    )
  )
    return noteStanding(WRAPPER_NEEDS_COMMAND_TEXTS.sudo, state);
  if (flockArg !== undefined) {
    let nestedReason = analyzeNestedScript(
      flockArg.text,
      {
        redirects,
        heredoc,
        piped,
      },
      sources,
      state,
    );
    if (nestedReason !== undefined && state.standing === undefined) return nestedReason;
  }
  if (program.text === "setenv" || (program.text === "set" && /^-[a-zA-Z]*x/.test(args[0]?.text ?? ""))) {
    let valueIndex = program.text === "setenv" ? 0 : 1;
    let valueWord = args[valueIndex];
    let assignments =
      valueWord === undefined
        ? []
        : [
            {
              ...valueWord,
              text:
                valueWord.text +
                "=" +
                args
                  .slice(valueIndex + 1)
                  .map((arg) => arg.text)
                  .join(":"),
            },
          ];
    if (state.cShellsHeld && assignments.some((assignment) => SHELL_SET_TO_CSH_RE.test(assignment.text)))
      return noteStanding(CSH_SHELL_SET_TEXT, state);
    let assignmentReason = analyzeAssignments(
      assignments,
      false,
      state.zshNullCommandHeld,
      relativeNamesOf(state),
    );
    if (assignmentReason !== undefined) return assignmentReason;
  }
  if (program.text === "unset" && args.some((arg) => arg.text.startsWith("GIT_CONFIG")))
    return "it unsets a GIT_CONFIG variable";
  if (program.text === "unset" && args.some((arg) => arg.text === "PATH")) return "it unsets PATH";
  if (program.expands && !/^\$/.test(program.text))
    return "it runs a command whose name is built by an expansion";
  if (/^\$\(\u2026\)/.test(program.text))
    return "it runs a command held in a variable or produced by another command";
  if (/^\$/.test(program.text)) {
    if (isUnderRoots(program, state)) return "it names " + program.text;
    if (program.text.includes("/") && isTildeOrDollarWordChanged(program)) {
      let foundReason = noteStandingReason("it runs a file by a relative path", program, state);
      if (foundReason !== undefined) return foundReason;
    }
    let variableName = /^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?\//.exec(program.text)?.[1];
    if (variableName !== undefined && state.relativeNames?.has(variableName) === true)
      return "it runs a file by a relative path";
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
    let defaultWord =
      state.make === true && /^(?:\$[({][A-Za-z_]+[)}])*\$[({]MAKE[)}]$/.test(program.text)
        ? "make"
        : /:-([^}]+)\}$/.exec(program.text)?.[1];
    if (defaultWord === undefined) {
      if (state.fromPayload) return "it runs a command held in a variable or produced by another command";
      let found = args.find((arg) => !arg.text.startsWith("-"));
      if (
        found !== undefined &&
        isPlainArgument(found) &&
        (found.text.includes("/") || /\.[A-Za-z0-9]{1,5}$/.test(found.text))
      ) {
        let splitReason = noteStandingReason("it runs a file by a relative path", found, state);
        if (splitReason !== undefined) return splitReason;
      }
      if (!/^\/(?:.*\/)?[^\/$]+$/.test(replaced)) return;
      let programName = commandBaseName(program);
      if (isLauncherCommand(programName) && programName !== "runuser")
        return isAnchoredPath(program) && !/[ \t]/.test(program.text)
          ? undefined
          : analyzeWrappedCommand(
              [
                {
                  text: programName,
                  quoted: false,
                  raw: programName,
                },
                ...args,
              ],
              piped,
              sources,
              state,
              true,
            );
    } else
      program = {
        ...program,
        text: defaultWord,
      };
  }
  if (program.quoted && /[ \t]/.test(program.text) && !program.text.includes("/")) {
    sources.push(program.text);
    return;
  }
  let interpreterName = normalizeInterpreterName(commandBaseName(program));
  let found_2 = [program, ...args, ...redirects.map((redirect) => redirect.target)].find((word) =>
    isUnderRoots(word, state),
  );
  if (found_2 !== undefined) return "it names " + found_2.text;
  if (program.text.includes("/") && !isPathWord(program) && !program.text.endsWith("/")) {
    let standingReason = noteStandingReason("it runs a file by a relative path", program, state);
    if (standingReason !== undefined) return standingReason;
  }
  if (state.standing === undefined && /(?:^|[^$])\{[-+]?\d*[.\/#%+]{0,4}\}/.test(program.text))
    return "it runs a file by a relative path";
  if (state.cShellsHeld && CSH_SHELL_RE.test(interpreterName)) return noteStanding(CSH_MAY_RUN_TEXT, state);
  if (state.forNameDo && state.standing === undefined) {
    if (interpreterName === "function" && args.slice(1).some((arg) => arg.text === "do" && !arg.quoted))
      return "it defines a function whose loop has no ';' or line break before its 'do', so what the loop runs cannot be checked; written with '; do' it can be";
    let loopWords = [program, ...args];
    let found = [0, 1, 2].find((loopIndex) => {
      let loopWord = loopWords[loopIndex];
      return loopWord !== undefined && !loopWord.quoted && /^(?:for|select|repeat)$/.test(loopWord.text);
    });
    if (found !== undefined) {
      let text = loopWords[found].text;
      let sliced = loopWords.slice(found + 2);
      let inIndex = text === "repeat" ? -1 : sliced.findIndex((word) => word.text === "in" && !word.quoted);
      if (
        (inIndex === -1 ? sliced : sliced.slice(0, inIndex)).some(
          (word) => word.text === "do" && !word.quoted,
        )
      )
        return `it runs a '${text}' loop with no ';' or line break before its 'do', so what the loop runs cannot be checked; written with '; do' it can be`;
    }
    if (
      assignments.some((assignment) => assignment.text === "coproc" && !assignment.quoted) &&
      args.some((arg) => arg.text === "do" && !arg.quoted)
    )
      return "it starts a coprocess whose loop has no ';' or line break before its 'do', so what the loop runs cannot be checked; written with '; do' it can be";
  }
  if (!state.shortLoopLists && (interpreterName === "for" || interpreterName === "select"))
    return args
      .slice(args.findIndex((arg) => arg.text === "in") + 1)
      .some((arg) => isPlainArgument(arg) && /[\/*?[]/.test(arg.text))
      ? "it loops over files by a relative name"
      : undefined;
  if (state.shortLoopLists && LOOP_WORD_RE.test(interpreterName)) {
    let index = 0;
    while (
      index < args.length &&
      !args[index].quoted &&
      args[index].text !== "in" &&
      ALNUM_NAME_RE.test(args[index].text)
    )
      index += 1;
    return args
      .slice(args[index]?.text === "in" ? index + 1 : index)
      .some((arg) => isPlainArgument(arg) && /[\/*?[]/.test(arg.text))
      ? "it loops over files by a relative name"
      : undefined;
  }
  if (interpreterName === "source" || program.text === ".") {
    let sourceArg = args[0]?.text === "--" ? args[1] : args[0];
    if (sourceArg !== undefined && isStdinLikePath(sourceArg)) {
      if (heredoc !== undefined && sourceArg.text !== "<(\u2026)") {
        sources.push(heredoc);
        return;
      }
      return "it runs a shell or interpreter whose program arrives on a pipe, a heredoc or a file descriptor";
    }
    return isPlainArgument(sourceArg) ? "it sources a file by a relative name" : undefined;
  }
  let unwrapped = unwrapLauncherArgs(
    interpreterName,
    args,
    relativeNamesOf(state),
    state.unexpandedTilde,
    state.shell,
  );
  if (unwrapped === "reads_input") return noteStanding(WRAPPER_NEEDS_COMMAND_TEXTS[interpreterName], state);
  if (unwrapped !== undefined) {
    if (unwrapped !== "held") for (let line of unwrapped.lines ?? []) sources.push(line);
    let nestedReason = "it runs " + interpreterName + " with a command or file this machine cannot verify";
    if (unwrapped !== "held" && unwrapped.heldStanding === true) {
      let nestedAssignments = noteStandingIfComposedKite(nestedReason, state);
      if (nestedAssignments !== undefined) return nestedAssignments;
    }
    return unwrapped === "held" || unwrapped.held
      ? nestedReason
      : (unwrapped.words ?? [])
          .map((words) => analyzeWrappedCommand(words, piped, sources, state))
          .find((reason) => reason !== undefined);
  }
  if (BUILD_TOOL_PROGRAMS.has(interpreterName) || findEvalStyleFlag(interpreterName, args) !== undefined)
    return interpreterName !== "hg" &&
      args.length > 0 &&
      args.every((arg) => VERSION_OR_HELP_FLAG_RE.test(arg.text))
      ? undefined
      : "it runs a project tool, such as make or npm";
  let rscriptScript =
    interpreterName === "rscript"
      ? findInterpreterScript(interpreterName, args, state.rubyAttachedPattern)
      : undefined;
  if (
    INTERPRETER_VARIANTS.has(interpreterName) &&
    !(
      interpreterName === "rscript" &&
      (typeof rscriptScript === "object" ? args.slice(0, args.indexOf(rscriptScript)) : args).some(
        (arg) => arg.text === "--vanilla",
      )
    )
  )
    return "it runs " + interpreterName;
  if (
    SHELL_PROGRAMS.has(interpreterName) ||
    SCRIPT_INTERPRETERS.has(interpreterName) ||
    (program.text === ":" && flockArg === undefined)
  ) {
    let isShellProgram = SHELL_PROGRAMS.has(interpreterName);
    let scriptArg =
      program.text !== ":" &&
      (isShellProgram
        ? findScriptArgument(interpreterName, args)
        : runsInlineProgram(interpreterName, args, state.rubyAttachedPattern));
    if (!scriptArg) {
      for (let { op, target } of redirects) {
        if ((op === "<" || op === "<>") && (isPlainArgument(target) || isStdinLikePath(target)))
          return program.text === ":"
            ? "it reads a compound command's input from a file in the launch directory"
            : "it runs a script by a relative name";
        if (op === "<<<" && SHELL_PROGRAMS.has(interpreterName)) {
          if (/^\$/.test(target.text.trim()))
            return "it runs a command held in a variable or produced by another command";
          sources.push(target.text);
        }
      }
      if (heredoc !== undefined && SHELL_PROGRAMS.has(interpreterName)) sources.push(heredoc);
    }
    let readsHeredoc =
      isShellProgram &&
      !scriptArg &&
      heredoc === undefined &&
      !redirects.some((redirect) => /^<(?!>)/.test(redirect.op) || redirect.op === "<>");
    if (
      !scriptArg &&
      program.text !== ":" &&
      (piped ||
        readsHeredoc ||
        (!SHELL_PROGRAMS.has(interpreterName) &&
          (heredoc !== undefined || redirects.some((redirect) => redirect.op === "<<<"))))
    ) {
      if (interpreterName === "python" || interpreterName === "pypy")
        return analyzePythonCommand(args, state, collectHeredocInput(heredoc, redirects));
      return "it runs a shell or interpreter whose program arrives on a pipe, a heredoc or a file descriptor";
    }
  }
  if (SHELL_PROGRAMS.has(interpreterName))
    return analyzeInterpreterInput(interpreterName, args, sources, state, {
      redirects,
      heredoc,
      piped,
    });
  if (interpreterName === "python" || interpreterName === "pypy") {
    let pythonReason = analyzePythonCommand(args, state, collectHeredocInput(heredoc, redirects));
    if (pythonReason !== undefined) return pythonReason;
  } else if (interpreterName === "perl") {
    if (
      args.some((arg, argIndex) => {
        let match = /^-[acnpsTtwWX]*(?:I([\s\S]*)|[Mm]lib(?:=([\s\S]*)|(\s[\s\S]*))?)$/.exec(arg.text);
        return (
          match !== null &&
          (match[1] !== undefined
            ? operandReachesBeyondRoots(tildeOperandAt(args, match[1], argIndex), state)
            : match[3] !== undefined
              ? match[3].trim() !== ""
              : (match[2] ?? "").split(",").some(
                  (libEntry) =>
                    libEntry !== "" &&
                    operandReachesBeyondRoots(
                      {
                        value: libEntry,
                        tildeLiteral: true,
                      },
                      state,
                    ),
                ))
        );
      })
    )
      return "it runs perl with -I or the lib pragma";
  } else if (interpreterName === "ruby") {
    let interpreterScript = findInterpreterScript("ruby", args, state.rubyAttachedPattern);
    let rubyArgs =
      typeof interpreterScript === "object" && args.includes(interpreterScript)
        ? args.slice(0, args.indexOf(interpreterScript))
        : args;
    if (
      rubyArgs.some((arg, argIndex) => {
        let match = /^-[acdlnpsvwy]*I(.*)$/.exec(arg.text);
        if (match !== null)
          return tildeOperandAt(rubyArgs, match[1], argIndex)
            .value.split(":")
            .some(
              (entry, entryIndex, entries) =>
                (entry !== "" || entries.length === 1) &&
                operandReachesBeyondRoots(
                  {
                    value: entry,
                    tildeLiteral: false,
                  },
                  state,
                ),
            );
        let match_2 = /^(?:-[acdlnpsvwy]*r|--require=?)([\s\S]*)$/.exec(arg.text);
        if (match_2 === null) return false;
        let { value: requiredModule } = tildeOperandAt(rubyArgs, match_2[1], argIndex);
        return (
          /^\.\.?\//.test(requiredModule) ||
          /^bundler(?:\/+setup(?:\.rb)?)?$/i.test(requiredModule) ||
          isUnderRoots(
            {
              text: requiredModule,
              quoted: false,
              raw: requiredModule,
            },
            state,
          )
        );
      })
    )
      return "it runs ruby with -I or -r";
  } else if (
    interpreterName === "node" ||
    interpreterName === "nodejs" ||
    interpreterName === "tsx" ||
    interpreterName === "ts-node"
  ) {
    if (
      args.some(
        (arg, argIndex) =>
          /^(?:-r|--require|--import|--(?:experimental-)?loader)(?:=|$)/.test(arg.text) &&
          !/^(?:\/|node:)/.test(
            arg.text.includes("=") ? (arg.text.split("=")[1] ?? "") : (args[argIndex + 1]?.text ?? ""),
          ),
      )
    )
      return "it runs node with --require, --import or --loader";
    let index = args.findIndex((arg) => /^(?:-e|--eval|-p|--print|-pe|-ep)$/.test(arg.text));
    let evalText =
      index !== -1
        ? args[index + 1]?.text
        : args.find((arg) => /^--(?:eval|print)=/.test(arg.text))?.text.replace(/^--(?:eval|print)=/, "");
    if (evalText !== undefined && scanJsImports(evalText))
      return "it runs node code that loads a module by a bare or relative name";
  } else if (interpreterName === "lua") {
    if (args.some((arg) => /^-l/.test(arg.text))) return "it runs lua with -l";
  } else if (interpreterName === "php") {
    let phpReason = analyzePhpCommand(args, state);
    if (phpReason !== undefined) return phpReason;
  }
  if (
    SCRIPT_INTERPRETERS.has(interpreterName) ||
    (isKnownInterpreter(interpreterName) && !SHELL_PROGRAMS.has(interpreterName))
  ) {
    let interpreterScript = findInterpreterScript(interpreterName, args, state.rubyAttachedPattern);
    if (interpreterScript === "unknown_option")
      return "it runs an interpreter with an option this version does not know";
    if (
      interpreterScript !== undefined &&
      isStdinLikePath(interpreterScript) &&
      interpreterName !== "python" &&
      interpreterName !== "pypy"
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
    /^(?:emacs|vim?|nvim|gvim|view|ex)$/.test(interpreterName) &&
    args.some((arg, argIndex) => {
      let match = /^(?:--?script|--load|-l|-S|-u)(?:=([\s\S]*))?$/.exec(arg.text);
      let scriptArg = match === null ? undefined : (match[1] ?? args[argIndex + 1]?.text ?? "-");
      return (
        scriptArg !== undefined &&
        !(arg.text === "-u" && /^(?:NONE|NORC|DEFAULTS)$/.test(scriptArg)) &&
        (scriptArg.startsWith("-")
          ? arg.text === "-S"
          : !isAbsoluteLike(scriptArg, PATH_PREFIX_CHARS_RE) ||
            isUnresolvedVariablePath(scriptArg, relativeNamesOf(state)))
      );
    })
  )
    return "it runs a script by a relative name";
  let extensionPattern = EXTENSION_INTERPRETERS[interpreterName];
  if (extensionPattern !== undefined) {
    if (
      args.some(
        (arg) =>
          arg.text === "{}" ||
          (!arg.text.startsWith("-") && extensionPattern.test(arg.text) && isPlainArgument(arg)),
      )
    )
      return "it runs a script by a relative name";
    if (
      args.every((arg) => arg.text.startsWith("-")) &&
      (piped || heredoc !== undefined || redirects.some((redirect) => redirect.op.startsWith("<")))
    )
      return "it runs a shell or interpreter whose program arrives on a pipe, a heredoc or a file descriptor";
  }
  let dartScript =
    interpreterName === "dart"
      ? (args[0]?.text === "run" ? args.slice(1) : args).find((arg) => !arg.text.startsWith("-"))
      : undefined;
  if (dartScript !== undefined && dartScript.text.endsWith(".dart") && isPlainArgument(dartScript))
    return "it runs a script by a relative name";
  if (interpreterName === "git")
    return analyzeEnvCommand(args, assignments, sources, relativeNamesOf(state), state.unexpandedTilde);
  if (interpreterName === "java") {
    let index = args.findIndex((arg) => arg.text === "-jar");
    let index_2 = args.findIndex((arg) => /^(?:-cp|-classpath|--class-path)$/.test(arg.text));
    let classPath =
      index_2 === -1
        ? args.find((arg) => arg.text.startsWith("--class-path="))?.text.slice(13)
        : args[index_2 + 1]?.text;
    let markerIndex = index_2 === -1 || (args[index_2 + 1]?.quoted ?? false);
    let pieces =
      index_2 === -1
        ? (args.find((arg) => arg.text.startsWith("--class-path="))?.raw ?? "").replace(
            /^(["']?)--class-path=/,
            "$1",
          )
        : (args[index_2 + 1]?.raw ?? "");
    let matches = DOLLAR_LITERAL_ESCAPE_RE.test(pieces);
    if (index !== -1)
      return isPlainArgument(args[index + 1]) ? "it runs a file by a relative path" : undefined;
    return args.length > 0 && args.every((arg) => VERSION_OR_HELP_FLAG_RE.test(arg.text))
      ? undefined
      : classPath !== undefined &&
          classPath
            .split(":")
            .every(
              (classPathEntry, arg, argText) =>
                isResolvableAbsolutePath(classPathEntry, relativeNamesOf(state)) &&
                !(
                  state.unexpandedTilde &&
                  (isUnexpandedTildePath(
                    classPathEntry,
                    markerIsTildeLiteral(markerIndex, argText, arg),
                    isPosixShellName(state.shell),
                  ) ||
                    tildeIsLiteralHere(classPathEntry, pieces, arg > 0 ? matches : undefined) ||
                    (arg === 0 && bracedDefaultHoldsColon(pieces)))
                ),
            )
        ? undefined
        : "it runs java with the working directory on its class path";
  }
  if (interpreterName === "eval") {
    sources.push((args[0]?.text === "--" ? args.slice(1) : args).map((arg) => arg.text).join(" "));
    return;
  }
  if (interpreterName === "nix-shell" || interpreterName === "nix") {
    let index = args.findIndex((arg) => /^(?:--run|--command|-c)$/.test(arg.text));
    if (index !== -1 && args[index + 1] !== undefined)
      sources.push(
        args
          .slice(index + 1)
          .map((arg) => arg.text)
          .join(" "),
      );
    return findEvalStyleFlag(interpreterName, args) !== undefined || interpreterName === "nix-shell"
      ? "it runs a project tool, such as make or npm"
      : undefined;
  }
  if (interpreterName === "trap") {
    let trapArgs = args[0]?.text === "--" ? args.slice(1) : args;
    if (trapArgs.length >= 2 && !/^-[lp]$/.test(trapArgs[0].text) && trapArgs[0].text !== "-")
      sources.push(trapArgs[0].text);
    return;
  }
  if (interpreterName === "alias") {
    for (let arg of args) {
      let index = arg.text.indexOf("=");
      if (index > 0) sources.push(arg.text.slice(index + 1));
    }
    return;
  }
  if (state.disableHeld) {
    let reason =
      state.fromPayload ||
      state.shell === undefined ||
      state.shell === "zsh" ||
      !SHELL_NAME_RE.test(state.shell);
    let matches = PREFIX_WRAPPER_RE.test(interpreterName);
    let nextIndex = matches ? args.findIndex((arg) => commandBaseName(arg) === "disable") : -1;
    let rest =
      matches && nextIndex === -1 ? args.findIndex((arg) => commandBaseName(arg) === "enable") : nextIndex;
    let tail = rest === -1 ? interpreterName : commandBaseName(args[rest]);
    if (tail === "disable" || (tail === "enable" && reason))
      return rest === -1
        ? `it runs ${tail}, which can change how the shell reads the lines after it, so they cannot be checked`
        : `it has ${tail} behind ${interpreterName === "-" ? "'-'" : interpreterName}, where zsh may run it as a command that changes how the shell reads the lines after it, so they cannot be checked`;
    let valueIndex = matches ? args.findIndex((arg) => commandBaseName(arg) === "emulate") : -1;
    if (
      (interpreterName === "emulate" || valueIndex !== -1) &&
      args
        .slice(valueIndex + 1)
        .some((arg) => DISABLE_OR_ENABLE_RE.test(arg.text.replace(QUOTE_OR_CONTINUATION_RE, "")))
    )
      return "it hands emulate a text that names disable or enable, which can change how the shell reads the lines after it, so they cannot be checked";
  }
  if (interpreterName === "enable" || interpreterName === "hash") {
    let index = args.findIndex((arg) => arg.text === (interpreterName === "enable" ? "-f" : "-p"));
    return index !== -1 && isPlainArgument(args[index + 1]) ? "it runs a file by a relative path" : undefined;
  }
  if (interpreterName === "exec" || interpreterName === ":") return;
  if (interpreterName === "find") {
    let findReasons = [];
    for (let argIndex = 0; argIndex < args.length; argIndex += 1) {
      if (!/^-(?:exec|execdir|ok|okdir)$/.test(args[argIndex].text)) continue;
      let execEnd = argIndex + 1;
      while (execEnd < args.length && args[execEnd].text !== ";" && args[execEnd].text !== "+") execEnd += 1;
      let words = args.slice(argIndex + 1, execEnd);
      if (words.length === 0) continue;
      let execReason = analyzeWrappedCommand(words, false, sources, state);
      findReasons.push(
        words[0].text === "{}" ||
          parseShellWords(words, {
            commandAfterConditional: state.commandAfterConditional,
          }).some((word) => word.program.text === "{}")
          ? "it runs a file by a relative path"
          : execReason,
      );
      argIndex = execEnd;
    }
    return findReasons.find((reason) => reason !== undefined);
  }
  return;
}
//@ chunk-4z1ntdgk.js:92786-92915 placement
function findEvalStyleFlag(programName, args) {
  let subcommands = BUILD_SUBCOMMANDS[programName];
  if (subcommands === undefined) return;
  return args.find((arg) =>
    subcommands.has(arg.text.startsWith("--") ? firstLineOf(arg.text, "=") : arg.text),
  )?.text;
}
//@ chunk-4z1ntdgk.js:92915-93720 placement
/**
 * 命令包装相关文案：嵌套超限提示、env -P 相对目录提示，以及各包装器"缺少命令"的说明集合。
 */
var MAX_WRAP_NESTING; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WRAP_NESTING_TOO_DEEP_TEXT;
var ENV_RELATIVE_DIR_TEXT;
var WRAPPER_NEEDS_COMMAND_TEXTS;
var CSH_TEXT_UNVERIFIABLE;
var CSH_MAY_RUN_TEXT;
var CSH_SHELL_SET_TEXT;
var CSH_NAMED_TEXT;
var CSH_REASON_TEXTS;
var STANDING_REASON_TEXTS;
deferInit("chunk-4z1ntdgk.js:92915", () => {
  MAX_WRAP_NESTING = 4;
  WRAP_NESTING_TOO_DEEP_TEXT =
    "it wraps a command in more than four layers of commands such as find -exec or parallel";
  ENV_RELATIVE_DIR_TEXT = "it runs env with -P naming a relative directory";
  WRAPPER_NEEDS_COMMAND_TEXTS = {
    parallel: "it runs parallel with no command of its own",
    script: "it runs script with no command of its own",
    su: "it runs su with no command",
    runuser: "it runs runuser with no command",
    sudo: "it starts a shell through sudo or doas with no command",
  };
  CSH_TEXT_UNVERIFIABLE = "it is written for csh or tcsh, whose text this machine cannot verify";
  CSH_MAY_RUN_TEXT = "it may run commands through csh or tcsh, whose text this machine cannot verify";
  CSH_SHELL_SET_TEXT =
    "it sets SHELL in a way that may point it at csh or tcsh, whose text this machine cannot verify";
  CSH_NAMED_TEXT = "it names csh or tcsh, so it may run text this machine cannot verify";
  CSH_REASON_TEXTS = new Set([CSH_TEXT_UNVERIFIABLE, CSH_MAY_RUN_TEXT, CSH_SHELL_SET_TEXT, CSH_NAMED_TEXT]);
  STANDING_REASON_TEXTS = new Set([
    WRAP_NESTING_TOO_DEEP_TEXT,
    ENV_RELATIVE_DIR_TEXT,
    CSH_MAY_RUN_TEXT,
    CSH_SHELL_SET_TEXT,
    ...Object.values(WRAPPER_NEEDS_COMMAND_TEXTS),
  ]);
});
//@ chunk-4z1ntdgk.js:93720-93783 placement
function noteStanding(reason, state, hook = STANDING_REASON_TEXTS.has(reason)) {
  if (hook) state.standing?.push(reason);
  return reason;
}
//@ chunk-4z1ntdgk.js:93783-93860 layout
function noteStandingReason(expression, state, state_2) {
  if (state_2.standing !== undefined && isTildeOrDollarWordChanged(state)) {
    noteStanding(expression, state_2, true);
    return;
  }
  return expression;
}
//@ chunk-4z1ntdgk.js:93860-94287 placement
function analyzeWrappedCommand(words, piped, sources, state, skipDirect = false) {
  let nesting = (state.nesting ?? 0) + 1;
  if (nesting > MAX_WRAP_NESTING) return noteStanding(WRAP_NESTING_TOO_DEEP_TEXT, state);
  if (words.length === 0) return;
  let candidates = [
    ...(skipDirect
      ? []
      : [
          {
            program: words[0],
            args: words.slice(1),
            assignments: [],
          },
        ]),
    ...parseShellWords(words, {
      commandAfterConditional: state.commandAfterConditional,
    }).filter((command) => skipDirect || command.args.length !== words.length - 1),
  ];
  let reasons = [];
  for (let command of candidates) {
    let reason = analyzeCommandReach(
      {
        ...command,
        redirects: [],
        piped,
      },
      sources,
      {
        ...state,
        nesting,
      },
    );
    if (reason !== undefined && state.standing === undefined) return reason;
    reasons.push(reason);
  }
  return reasons.find((reason) => reason !== undefined);
}
//@ chunk-4z1ntdgk.js:94287-94359 placement
var INTERPRETER_VARIANTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4z1ntdgk.js:94287", () => {
  INTERPRETER_VARIANTS = new Set(["bun", "deno", "tsx", "ts-node", "lua", "rscript", "r", "bb"]);
});
//@ chunk-4z1ntdgk.js:94359-94431 placement
function relativeNamesOf(state) {
  return state.relativeNamedValues === false ? undefined : state.relativeNames;
}
//@ chunk-4z1ntdgk.js:94431-94502 placement
function isResolvableAbsolutePath(text, relativeNames) {
  let isAbsolute = isAbsoluteLike(text);
  if (relativeNames === undefined) return isAbsolute;
  return isAbsolute && !isUnresolvedVariablePath(text, relativeNames);
}
//@ chunk-4z1ntdgk.js:94502-94723 placement
function isUnresolvedVariablePath(text, relativeNames) {
  if (relativeNames === undefined) return false;
  let variableName = /^\$\{?([A-Za-z_][A-Za-z0-9_]*)/.exec(text)?.[1];
  let replaced = text.replace(/^\$\{[^}]*\}|^\$\([^)]*\)|^\$[A-Za-z_][A-Za-z0-9_]*/, "");
  return (
    (variableName !== undefined && relativeNames.has(variableName)) ||
    (replaced !== text && /^[^\/~$].*\//.test(replaced))
  );
}
//@ chunk-4z1ntdgk.js:94723-94901 layout
function isUnexpandedTildePath(expression, state, analyzeNested = true) {
  if (expression.startsWith("~")) return state || /^~[+-]?\d+(?:\/|$)/.test(expression);
  return (
    expression.startsWith("$") &&
    (TILDE_AFTER_VAR_RE.test(expression) ||
      (expression.includes("${") &&
        expression.includes("~") &&
        (state || !analyzeNested || !TILDE_BRACED_DEFAULT_RE.test(expression))))
  );
}
//@ chunk-4z1ntdgk.js:94901-94961 layout
var TILDE_AFTER_VAR_RE = /[})\]]~|\$(?:[A-Za-z_][A-Za-z0-9_]*|[0-9@*#?$!-])~/;
//@ chunk-4z1ntdgk.js:94961-95062 layout
function isPosixShellName(shellName) {
  return !shellName || /^(?:bash|rbash|sh|dash|ash|(?:pd|lo|o|m|r)?ksh[0-9]*|yash|posh)$/i.test(shellName);
}
//@ chunk-4z1ntdgk.js:95062-95137 layout
var TILDE_BRACED_DEFAULT_RE = /^\$\{[^}:=+?\/#%"'\\-]+:?[-+=]~(?:\/[^}"'\\$`]*)?\}[^~"'\\$`{}]*$/;
//@ chunk-4z1ntdgk.js:95137-95215 layout
function tildeIsLiteralHere(text, nextWord, tildeIsLiteral) {
  return text.startsWith("$") && (tildeIsLiteral ?? !/^"?\$[A-Za-z_{(]/.test(nextWord));
}
//@ chunk-4z1ntdgk.js:95215-95256 layout
var DOLLAR_LITERAL_ESCAPE_RE = /'[^']*\$|\\\$|\$(?![A-Za-z_{(])/;
//@ chunk-4z1ntdgk.js:95256-95580 layout
function bracedDefaultHoldsColon(text) {
  let depth = 0;
  for (let charIndex = 0; charIndex < text.length; charIndex += 1) {
    let char = text[charIndex];
    if (char === "\\") {
      if (depth > 0 && text[charIndex + 1] === ":") return true;
      charIndex += 1;
    } else if (depth > 0 && (char === "'" || char === '"')) {
      let index = text.indexOf(char, charIndex + 1);
      if (index === -1 || text.slice(charIndex + 1, index).includes(":")) return true;
      charIndex = index;
    } else if (text.startsWith("${", charIndex)) {
      depth += 1;
      charIndex += 1;
    } else if (depth > 0 && char === "}") depth -= 1;
    else if (depth > 0 && char === ":") return true;
  }
  return false;
}
//@ chunk-4z1ntdgk.js:95580-95646 layout
function markerIsTildeLiteral(found, args, quoteIndex) {
  return found || quoteIndex > 0 || (args.length > 1 && !args[0].includes("/"));
}
//@ chunk-4z1ntdgk.js:95646-95762 layout
/**
 * 取 ~ 之后的操作数：同一词里有后缀则用后缀，否则用下一个词的文本，并标记是否按字面处理（下一个词带引号）。旧版名 quote 误配。
 */
function tildeOperandAt(words, literalText, wordIndex) {
  return literalText !== ""
    ? {
        value: literalText,
        tildeLiteral: true,
      }
    : {
        value: words[wordIndex + 1]?.text ?? "",
        tildeLiteral: words[wordIndex + 1]?.quoted ?? false,
      };
}
//@ chunk-4z1ntdgk.js:95762-95926 placement
function operandReachesBeyondRoots({ value, tildeLiteral }, state) {
  return (
    (tildeLiteral && value.startsWith("~")) ||
    !isResolvableAbsolutePath(value, relativeNamesOf(state)) ||
    (state.make === true && /^\$[({](?:CURDIR|PWD)[)}]/.test(value)) ||
    isUnderRoots(
      {
        text: value,
        quoted: false,
        raw: value,
      },
      state,
    )
  );
}
//@ chunk-4z1ntdgk.js:95926-96053 placement
function isStdinLikePath(word) {
  return (
    word !== undefined &&
    /^(?:\/dev\/(?:stdin|fd\/\d+)|\/proc\/(?:self|\d+)\/fd\/\d+|-|[<>]\(\u2026\))$/.test(word.text)
  );
}
//@ chunk-4z1ntdgk.js:96053-96377 placement
function isUnderRoots(word, state) {
  if (state.roots.length === 0) return false;
  let text = word.text;
  if (/^\$(?:HOME|\{HOME\})(?=\/|$)/.test(text)) text = state.home + text.replace(/^\$(?:HOME|\{HOME\})/, "");
  else if (/^~[A-Za-z0-9._-]*(?=\/|$)/.test(text)) text = state.home + text.replace(/^~[A-Za-z0-9._-]*/, "");
  if (!text.startsWith("/")) return false;
  let normalized = posix.normalize(text);
  return state.roots.some((root) => isSameCommandPath(normalized, root));
}
//@ chunk-4z1ntdgk.js:96377-97930 placement
function analyzeInterpreterInput(shellName, args, sources, state, input) {
  let readsStdin =
    input.piped ||
    input.heredoc !== undefined ||
    input.redirects.some((redirect) => redirect.op.startsWith("<"));
  let nestReason = (word) =>
    readsStdin && !/^\$/.test(word.text.trim())
      ? analyzeNestedScript(word.text, input, sources, state)
      : collectNestedShellCommand(word, sources);
  let sawCommandFlag = false;
  for (let argIndex = 0; argIndex < args.length; argIndex += 1) {
    let arg = args[argIndex];
    let text = arg.text;
    if (text === "--") {
      let nextArg = args[argIndex + 1];
      if (nextArg === undefined) return;
      return sawCommandFlag
        ? nestReason(nextArg)
        : !isAbsoluteLike(nextArg.text) || isTildeOrDollarWordChanged(nextArg)
          ? noteStandingReason("it runs a script by a relative name", nextArg, state)
          : undefined;
    }
    if (shellName === "fish") {
      let match = /^(?:-C|--init-command(?:=([\s\S]*))?)$/.exec(text);
      if (match !== null) {
        let initArg =
          match[1] !== undefined
            ? {
                ...arg,
                text: match[1],
              }
            : args[argIndex + 1];
        let reason = initArg === undefined ? undefined : nestReason(initArg);
        if (reason !== undefined && state.standing === undefined) return reason;
        argIndex += match[1] !== undefined ? 0 : 1;
        continue;
      }
    }
    if (isShellCommandFlag(shellName, text) && !text.startsWith("--command=")) {
      if (shellName === "pwsh" && /^-e/i.test(text)) return "it hands pwsh an encoded command";
      sawCommandFlag = true;
      argIndex += shellFlagArity(shellName, text);
      continue;
    }
    if (text.startsWith("--command="))
      return nestReason({
        ...arg,
        text: text.slice(10),
      });
    if (/^--(?:rcfile|init-file)=/.test(text)) {
      if (!isResolvableAbsolutePath(text.slice(text.indexOf("=") + 1), relativeNamesOf(state))) {
        let nestedReason = noteStandingIfComposedKite(rcFileRelativeText(shellName), state);
        if (nestedReason !== undefined) return nestedReason;
      }
      continue;
    }
    let arity = shellFlagArity(shellName, text);
    if (arity > 0) {
      let nextArg = args[argIndex + 1];
      argIndex += arity;
      if (
        /^--(?:rcfile|init-file)$/.test(text) &&
        nextArg !== undefined &&
        (!isResolvableAbsolutePath(nextArg.text, relativeNamesOf(state)) ||
          (nextArg.text.startsWith("$") && isTildeOrDollarWordChanged(nextArg, true)))
      ) {
        let nestedReason = noteStandingIfComposedKite(rcFileRelativeText(shellName), state);
        if (nestedReason !== undefined) return nestedReason;
      }
      continue;
    }
    if (text.startsWith("-") || text.startsWith("+")) continue;
    if (sawCommandFlag) {
      let reason = nestReason(arg);
      if (!state.shortLoopLists)
        return shellName === "pwsh" && argIndex + 1 < args.length
          ? (reason ??
              nestReason({
                ...arg,
                text: args
                  .slice(argIndex)
                  .map((arg) => arg.text)
                  .join(" "),
              }))
          : reason;
      if (shellName !== "pwsh" || argIndex + 1 === args.length) return reason;
      let spokenArg = nestReason({
        ...arg,
        text: args
          .slice(argIndex)
          .map((arg) => arg.text)
          .join(" "),
      });
      return reason ?? spokenArg;
    }
    return isStdinLikePath(arg)
      ? "it runs a shell whose program arrives on a pipe, a heredoc or a file descriptor"
      : isPlainArgument(arg)
        ? noteStandingReason("it runs a script by a relative name", arg, state)
        : undefined;
  }
  return;
}
//@ chunk-4z1ntdgk.js:97930-98000 placement
var POSIX_SHELL_PROGRAMS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4z1ntdgk.js:97930", () => {
  POSIX_SHELL_PROGRAMS = new Set(["bash", "sh", "dash", "ash", "ksh", "mksh", "zsh", "rbash"]);
});
//@ chunk-4z1ntdgk.js:98000-98072 layout
function rcFileRelativeText(shellName) {
  return "it runs " + shellName + " with an rc file by a relative name";
}
//@ chunk-4z1ntdgk.js:98072-98158 layout
function noteStandingIfComposedKite(reason, state) {
  if (
    state.standing !== undefined &&
    readFlagWithOverride(TENGU_COMPOSED_KITE, {
      safe: true,
    })
  ) {
    noteStanding(reason, state, true);
    return;
  }
  return reason;
}
//@ chunk-4z1ntdgk.js:98158-98799 placement
function shellFlagArity(shellName, text) {
  if (/^--(?:rcfile|init-file)$/.test(text)) return 1;
  if (POSIX_SHELL_PROGRAMS.has(shellName)) {
    let match = /^[-+]([a-zA-Z]+)$/.exec(text);
    if (match === null) return 0;
    if (shellName === "zsh" || shellName === "ksh" || shellName === "mksh")
      return (shellName === "zsh" ? /o$/ : /[oO]$/).test(match[1]) ? 1 : 0;
    return (match[1].match(/[oO]/g) ?? []).length;
  }
  if (shellName === "fish")
    return /^(?:[+-]O|\+o|-C|--init-command|-p|--profile|-d|--debug|-D|--debug-stack-frames|-f|--features)$/.test(
      text,
    )
      ? 1
      : 0;
  if (shellName === "pwsh")
    return /^-(?:o|of|outputformat|ex|ep|executionpolicy|wd|workingdirectory|config|configurationname|custompipename|if|inp|inputformat|settings|settingsfile|w|windowstyle|v|version)$/i.test(
      text,
    )
      ? 1
      : 0;
  return text === "-o" || text === "+o" || text === "-O" || text === "+O" ? 1 : 0;
}
//@ chunk-4z1ntdgk.js:98799-98996 placement
function flagArgumentIndexes(shellName, args) {
  let indexes = new Set();
  for (let argIndex = 0; argIndex < args.length; argIndex += 1) {
    let text = args[argIndex].text;
    if (text === "--") break;
    if (text.startsWith("-") || text.startsWith("+")) {
      let arity = shellFlagArity(shellName, text);
      for (let offset = 1; offset <= arity; offset += 1) indexes.add(argIndex + offset);
      argIndex += arity;
    }
  }
  return indexes;
}
//@ chunk-4z1ntdgk.js:98996-99314 placement
function findScriptArgument(shellName, args) {
  let optionArgIndexes = flagArgumentIndexes(shellName, args);
  let index = args.findIndex((arg, argIndex) => !optionArgIndexes.has(argIndex) && !/^[-+]./.test(arg.text));
  let leadingArgs = index === -1 ? args : args.slice(0, index);
  if (leadingArgs.some((arg) => isShellCommandFlag(shellName, arg.text)))
    return (
      (index !== -1 || leadingArgs.some((arg) => /^--command=./.test(arg.text))) &&
      !(shellName === "pwsh" && args[index]?.text === "-")
    );
  let afterScriptFlag =
    shellName !== "fish" &&
    shellName !== "pwsh" &&
    leadingArgs.some((arg) => hasAnyShortFlagChar(arg.text, "s"));
  return index !== -1 && !isStdinLikePath(args[index]) && !afterScriptFlag;
}
//@ chunk-4z1ntdgk.js:99314-99457 placement
function isShellCommandFlag(shellName, text) {
  return shellName === "pwsh"
    ? /^-(?:c|command|cwa|commandwithargs|e|ec|encodedcommand)$/i.test(text)
    : hasAnyShortFlagChar(text, "c") || /^--command(?:=|$)/.test(text);
}
//@ chunk-4z1ntdgk.js:99457-99628 placement
function runsInlineProgram(interpreterName, args, rubyAttachedPattern) {
  let interpreterScript = findInterpreterScript(interpreterName, args, rubyAttachedPattern, false);
  return (
    args.some((arg) => isEvalFlag(interpreterName, arg.text)) ||
    (/^(?:[gnm]?awk|g?sed)$/.test(interpreterName) && args.some((arg) => !arg.text.startsWith("-"))) ||
    (typeof interpreterScript === "object" && !isStdinLikePath(interpreterScript))
  );
}
//@ chunk-4z1ntdgk.js:99628-99781 placement
function collectNestedShellCommand(word, sources) {
  if (/^\$/.test(word.text.trim()))
    return "it hands a shell a command held in a variable or produced by another command";
  sources.push(word.text);
  return;
}
//@ chunk-4z1ntdgk.js:99781-100439 placement
function analyzeNestedScript(text, input, sources, state) {
  let { commands, unreadable } = parseShellCommands(text, {
    make: false,
    commandAfterConditional: state.commandAfterConditional,
    quotedBackslashKept: state.quotedBackslashKept,
    shortLoopLists: state.shortLoopLists,
    substitutionHeredocs: state.substitutionHeredocs,
  });
  if (unreadable !== null && !state.shortLoopLists)
    return `it could not be read to the end as shell (${unreadable})`;
  let found = commands
    .map((command) =>
      analyzeCommandReach(
        command.program.text === ":" && command.args.length === 0 && command.redirects.length === 0
          ? command
          : {
              ...command,
              redirects: [
                ...command.redirects,
                ...input.redirects.filter((redirect) => redirect.op.startsWith("<")),
              ],
              heredoc: command.heredoc ?? input.heredoc,
              piped: command.piped || input.piped,
            },
        sources,
        {
          ...state,
          fromPayload: true,
        },
      ),
    )
    .find((reason) => reason !== undefined);
  return unreadable === null ? found : `it could not be read to the end as shell (${unreadable})`;
}
//@ chunk-4z1ntdgk.js:100439-102396 placement
function splitArgsByOperands(assignments, sources, args = [], relativeNames, unexpandedTilde, shell) {
  let splitStrings = Array(assignments.length + 1);
  let readsFromFile = Array(assignments.length + 1).fill(false);
  let envRelativeText = Array(assignments.length + 3).fill(false);
  for (let argIndex = assignments.length - 1; argIndex >= 0; argIndex -= 1) {
    let text = assignments[argIndex].text;
    let arity = /^(?:-[iv0]*[uCP]|--unset|--chdir)$/.test(text) ? 2 : 1;
    let tildeResult = /^-[iv0]*P/.test(text)
      ? tildeOperandAt(assignments, text.replace(/^-[iv0]*P/, ""), argIndex)
      : undefined;
    let rawOperand = /^-[iv0]*P./.test(text)
      ? assignments[argIndex].raw.replace(/^(["']?)-[iv0]*P/, "$1")
      : (assignments[argIndex + 1]?.raw ?? "");
    let tildeIsLiteral = tildeResult !== undefined && DOLLAR_LITERAL_ESCAPE_RE.test(rawOperand);
    envRelativeText[argIndex] =
      text.startsWith("-") &&
      ((tildeResult !== undefined &&
        !tildeResult.value
          .split(":")
          .every(
            (entry, entryIndex, entryCount) =>
              isResolvableAbsolutePath(entry, relativeNames) &&
              !(
                unexpandedTilde &&
                (isUnexpandedTildePath(
                  entry,
                  markerIsTildeLiteral(tildeResult.tildeLiteral, entryCount, entryIndex),
                  isPosixShellName(shell),
                ) ||
                  tildeIsLiteralHere(entry, rawOperand, entryIndex > 0 ? tildeIsLiteral : undefined) ||
                  (entryIndex === 0 && bracedDefaultHoldsColon(rawOperand)))
              ),
          )) ||
        envRelativeText[argIndex + arity]);
    splitStrings[argIndex] = /^(?:-S.|--split-string=)/.test(text)
      ? text.replace(/^(?:-S|--split-string=)/, "")
      : splitStrings[argIndex + 1];
    let match = /^-[0oprtx]+a([\s\S]*)$/.exec(text);
    let argFilePath = /^(?:-a|--arg-file)$/.test(text)
      ? assignments[argIndex + 1]?.text
      : text.startsWith("--arg-file=")
        ? text.slice(11)
        : text.startsWith("-a") && text.length > 2
          ? text.slice(2)
          : match !== null
            ? match[1] || assignments[argIndex + 1]?.text
            : undefined;
    let argFileQuoted =
      /^(?:-a|--arg-file)$/.test(text) || (match !== null && !match[1])
        ? (assignments[argIndex + 1]?.quoted ?? false)
        : true;
    let argFileRaw =
      /^(?:-a|--arg-file)$/.test(text) || (match !== null && !match[1])
        ? (assignments[argIndex + 1]?.raw ?? "")
        : assignments[argIndex].raw.replace(/^(["']?)(?:--arg-file=|-[0oprtx]*a)/, "$1");
    readsFromFile[argIndex] =
      (argFilePath !== undefined &&
        (!isResolvableAbsolutePath(argFilePath, relativeNames) ||
          (unexpandedTilde &&
            (isUnexpandedTildePath(argFilePath, argFileQuoted, isPosixShellName(shell)) ||
              tildeIsLiteralHere(argFilePath, argFileRaw))))) ||
      readsFromFile[argIndex + 1];
  }
  let mapped = assignments.map((word) => word.text.slice(word.text.lastIndexOf("/") + 1).toLowerCase());
  let index = mapped.indexOf("xargs");
  let replacementWords =
    index === -1
      ? []
      : normalizeCaseForComparison_2(
          assignments.slice(index + 1).flatMap((word, wordIndex, words) => {
            let match = /^-[0oprtx]*([IJi])([\s\S]*)$/.exec(word.text);
            if (match === null)
              return /^--replace(?:=|$)/.test(word.text) ? [word.text.split("=")[1] ?? "{}"] : [];
            return match[1] === "i"
              ? [
                  "{}",
                  ...(match[2] === "" ? [] : [match[2]]),
                  ...(match[2].includes("=") ? [word.text.split("=")[1]] : []),
                ]
              : [match[2] || words[wordIndex + 1]?.text].filter((word) => word !== undefined);
          }),
        );
  let replacesIntoCommand =
    replacementWords.length > 64 ||
    args.some((word) => replacementWords.some((replacement) => word.text.includes(replacement)));
  mapped.forEach((baseName, wordIndex) => {
    if (baseName === "env" && splitStrings[wordIndex + 1] !== undefined)
      sources.push(splitStrings[wordIndex + 1]);
  });
  let mapped_2 = mapped.map((baseName, wordIndex) => {
    if (baseName === "env")
      return !assignments[wordIndex].text.startsWith("-") && envRelativeText[wordIndex + 1]
        ? ENV_RELATIVE_DIR_TEXT
        : undefined;
    if (baseName !== "xargs") return;
    return replacesIntoCommand
      ? "it runs what xargs splices into the command from its input"
      : readsFromFile[wordIndex + 1]
        ? "it runs xargs with its arguments read from a file by a relative name"
        : undefined;
  });
  return (
    mapped_2.find((reason) => reason === ENV_RELATIVE_DIR_TEXT) ??
    mapped_2.find((reason) => reason !== undefined)
  );
}
//@ chunk-4z1ntdgk.js:102396-102691 placement
function findSubcommandArg(assignments, startIndex) {
  let sliced = assignments.slice(startIndex + 1);
  let index = sliced.findIndex(
    (word, wordIndex) =>
      !word.text.startsWith("-") && !COMMAND_WRAPPERS.has(sliced[wordIndex - 1]?.text ?? ""),
  );
  let commandWord = index === -1 ? "" : (sliced[index + 1]?.text ?? "");
  let commandArg = /^(?:-c|--command)$/.test(commandWord) ? sliced[index + 2] : undefined;
  if (commandArg !== undefined)
    return {
      at: startIndex + index + 3,
      text: commandArg.text,
    };
  return commandWord.startsWith("--command=")
    ? {
        at: startIndex + index + 2,
        text: commandWord.slice(10),
      }
    : undefined;
}
//@ chunk-4z1ntdgk.js:102691-103562 placement
/**
 * xargs 的并行/取值类选项集合与 strace 等带值选项集合。
 */
var XARGS_PARALLEL_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var STRACE_OPTIONS_WITH_VALUE;
deferInit("chunk-4z1ntdgk.js:102691", () => {
  XARGS_PARALLEL_FLAGS = new Set([
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
  STRACE_OPTIONS_WITH_VALUE = new Set([
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
});
//@ chunk-4z1ntdgk.js:103562-103738 placement
function skipOptionWords(words, optionsWithValue, allowBundled = false) {
  let wordIndex = 0;
  while (wordIndex < words.length && words[wordIndex].text.startsWith("-")) {
    let text = words[wordIndex].text;
    wordIndex +=
      optionsWithValue.has(text) ||
      (allowBundled && /^-[A-Za-z]{2,}$/.test(text) && optionsWithValue.has("-" + text.at(-1)))
        ? 2
        : 1;
  }
  return words.slice(wordIndex);
}
//@ chunk-4z1ntdgk.js:103738-107558 placement
/**
 * 展开 env/sudo/xargs/parallel/find -exec 等包装命令，得到真正要执行的命令词。
 */
function unwrapLauncherArgs(launcherName, args, relativeNames, unexpandedTilde, shell) {
  let singleWord = (at) =>
    at >= 0 && at < args.length
      ? {
          words: [args.slice(at)],
        }
      : undefined;
  let uniqWords = (lists) =>
    lists.filter(
      (words, wordsIndex) =>
        words.length > 0 &&
        lists.findIndex(
          (other) =>
            other.length === words.length && other.every((word, wordIndex) => word === words[wordIndex]),
        ) === wordsIndex,
    );
  switch (launcherName) {
    case "su":
    case "runuser": {
      let flattened = args.flatMap((arg, argIndex) => {
        let match = /^(?:-[flmpPT]*c|--(?:session-)?command(?==|$))=?([\s\S]*)$/.exec(arg.text);
        return match === null ? [] : [match[1] !== "" ? match[1] : args[argIndex + 1]?.text];
      });
      let any = args.some((arg, argIndex) => {
        let match = /^(?:-[flmpPT]*s|--shell)(?:=?([\s\S]+))?$/.exec(arg.text);
        if (match === null) return false;
        if (match[1] === undefined && args[argIndex + 1] === undefined) return unexpandedTilde;
        let { value: words, tildeLiteral } = tildeOperandAt(args, match[1] ?? "", argIndex);
        let wordList =
          unexpandedTilde && match[1] !== undefined && /^-[flmpPT]*s=/.test(arg.text) ? "=" + words : words;
        let replaced = (match[1] === undefined ? (args[argIndex + 1]?.raw ?? "") : arg.raw).replace(
          /^(["']?)(?:-[flmpPT]*s|--shell)=?/,
          "$1",
        );
        return (
          (unexpandedTilde && isUnexpandedTildePath(wordList, tildeLiteral, isPosixShellName(shell))) ||
          (unexpandedTilde && tildeIsLiteralHere(wordList, replaced)) ||
          (unexpandedTilde
            ? !isResolvableAbsolutePath(wordList, relativeNames)
            : !isAbsoluteLike(wordList, PATH_PREFIX_CHARS_RE) ||
              isUnresolvedVariablePath(wordList, relativeNames))
        );
      });
      if (flattened.length === 0) {
        if (
          (launcherName === "runuser" &&
            args.some((arg) => /^(?:-[flmpPT]*u|--user(?:=|$))/.test(arg.text))) ||
          (args.length > 0 && args.every((arg) => /^(?:--version|--help|-V|-h)$/.test(arg.text)))
        )
          return;
        let filtered = args.filter(
          (arg, argIndex) =>
            !arg.text.startsWith("-") &&
            !/^(?:-[flmpPT]*[sgGwu]|--shell|--group|--supp-group|--whitelist-environment|--user)$/.test(
              args[argIndex - 1]?.text ?? "",
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
      let filtered = flattened.filter((line) => line !== undefined);
      return {
        lines: filtered,
        held: filtered.length < flattened.length || any,
      };
    }
    case "watch": {
      let filtered = normalizeCaseForComparison_2(
        [
          /^(?:-n|--interval|-d|--differences|-q|--equexit)$/,
          /^(?:-[a-zA-Z]*[nq]|--interval|--equexit)$/,
        ].map((optionsWithValue) => {
          let wordIndex = 0;
          while (wordIndex < args.length && args[wordIndex].text.startsWith("-"))
            wordIndex += optionsWithValue.test(args[wordIndex].text) ? 2 : 1;
          return wordIndex;
        }),
      ).filter((startIndex) => startIndex < args.length);
      return filtered.length === 0
        ? undefined
        : {
            lines: filtered.map((startIndex) =>
              args
                .slice(startIndex)
                .map((word) => word.text)
                .join(" "),
            ),
          };
    }
    case "script": {
      let index = args.findIndex((word) => /^(?:-[a-zA-Z]*c|--command)$/.test(word.text));
      if (index !== -1) {
        let text = args[index + 1]?.text;
        return text === undefined
          ? "held"
          : {
              lines: [text],
            };
      }
      let filtered = args.filter((word) => !word.text.startsWith("-"));
      if (filtered.length < 2)
        return args.length > 0 && args.every((word) => /^(?:--version|--help|-V|-h)$/.test(word.text))
          ? undefined
          : "reads_input";
      let skipped = skipOptionWords(args, STRACE_OPTIONS_WITH_VALUE);
      let skippedBundled = skipOptionWords(args, STRACE_OPTIONS_WITH_VALUE, true);
      if (skipped.length <= 1 || skippedBundled.length <= 1) return "reads_input";
      return {
        words: uniqWords([
          filtered.slice(1),
          args.slice(args.indexOf(filtered[0]) + 1),
          skipped.slice(1),
          skippedBundled.slice(1),
        ]),
      };
    }
    case "dotenv":
      return "held";
    case "direnv": {
      if (args[0]?.text !== "exec") return;
      let commandWord = args[1];
      return commandWord === undefined ||
        !isResolvableAbsolutePath(commandWord.text, relativeNames) ||
        isTildeOrDollarWordChanged(commandWord)
        ? {
            ...singleWord(2),
            heldStanding: true,
          }
        : singleWord(2);
    }
    case "op": {
      if (args[0]?.text !== "run") return;
      let index = args.findIndex((arg) => /^--env-file(?:=|$)/.test(arg.text));
      if (index !== -1) {
        let envFile = args[index].text.includes("=")
          ? args[index].text.slice(11)
          : (args[index + 1]?.text ?? "");
        if (!isResolvableAbsolutePath(envFile, relativeNames)) return "held";
      }
      let index_2 = args.findIndex((arg) => arg.text === "--");
      return index_2 === -1 ? undefined : singleWord(index_2 + 1);
    }
    case "hyperfine": {
      let commands = [];
      let commandFlag = /^(?:-p|--prepare|-s|--setup|-c|--cleanup|--conclude)$/;
      let skippedFlag =
        /^(?:-w|--warmup|-r|--runs|-m|--min-runs|-M|--max-runs|-n|--command-name|--export-\w+|--output|--shell|--sort|-u|--time-unit|-D|--parameter-step-size)$/;
      let parameters = [];
      for (let argIndex = 0; argIndex < args.length; argIndex += 1) {
        let text = args[argIndex].text;
        if (commandFlag.test(text)) {
          commands.push(args[argIndex + 1]?.text ?? "");
          argIndex += 1;
        } else if (/^(?:-L|--parameter-list)$/.test(text)) {
          parameters.push(...(args[argIndex + 2]?.text ?? "").split(","));
          argIndex += 2;
        } else if (/^(?:-P|--parameter-scan)$/.test(text)) argIndex += 3;
        else if (skippedFlag.test(text)) argIndex += 1;
        else if (!text.startsWith("-")) commands.push(text);
      }
      return {
        lines: [
          commands.join(`
`),
          ...(commands.length > 1 ? commands : []),
          ...parameters,
        ],
      };
    }
    case "parallel": {
      let words = args.filter((arg) => !arg.text.startsWith("-") && arg.text !== ":::");
      if (words.length === 0) return "reads_input";
      let index = args.findIndex((arg) => !arg.text.startsWith("-"));
      let sliced = args.slice(index);
      let index_2 = sliced.findIndex((arg) => /^::::?\+?$/.test(arg.text));
      let words_2 = sliced.filter((arg) => !/^::::?\+?$/.test(arg.text));
      let skippedPlain = skipOptionWords(args, XARGS_PARALLEL_FLAGS);
      let skippedExtended = skipOptionWords(args, XARGS_PARALLEL_FLAGS, true);
      if (
        [skippedPlain, skippedExtended].some(
          (skipped) => skipped.length === 0 || /^::::\+?$/.test(skipped[0].text),
        )
      )
        return "reads_input";
      let placeholderWords = new Set(
        args.filter(
          (arg, argIndex) =>
            XARGS_PARALLEL_FLAGS.has(args[argIndex - 1]?.text ?? "") &&
            /^\{[-+]?\d*[.#%+]{0,4}\}$/.test(arg.text),
        ),
      );
      let afterPlaceholder = (words) => {
        let index = words.findIndex((word) => !placeholderWords.has(word));
        return index === -1 ? [] : words.slice(index);
      };
      return {
        words: uniqWords([
          afterPlaceholder(words),
          afterPlaceholder(words_2),
          skippedPlain.filter((arg) => !/^::::?\+?$/.test(arg.text)),
          skippedExtended.filter((arg) => !/^::::?\+?$/.test(arg.text)),
        ]),
        lines:
          index_2 === 0 || [skippedPlain, skippedExtended].some((skipped) => /^:::\+?$/.test(skipped[0].text))
            ? words_2.map((arg) => arg.text)
            : [],
      };
    }
    default:
      return;
  }
}
//@ chunk-4z1ntdgk.js:107558-108935 placement
function findInterpreterScript(interpreterName, args, rubyAttachedPattern, rubyPattern = true) {
  if (interpreterName === "deno")
    return args[0]?.text === "run" ? args.slice(1).find((arg) => !arg.text.startsWith("-")) : undefined;
  if (interpreterName === "php") {
    let php = INTERPRETER_EVAL_FLAGS.php;
    for (let argIndex = 0; argIndex < args.length; argIndex += 1) {
      let text = args[argIndex].text;
      let match = /^(?:-[fF]|--file)(?:=?([\s\S]+))?$/.exec(text);
      if (match !== null)
        return match[1] !== undefined ? attachedPathWord(args[argIndex], match[1]) : args[argIndex + 1];
      if (!text.startsWith("-") || text === "-" || text === "--") break;
      if (php.has(text)) argIndex += 1;
    }
  }
  if (/^(?:[gnm]?awk|g?sed)$/.test(interpreterName)) {
    let isAwk = interpreterName.endsWith("awk");
    let separateFlagPattern = isAwk ? /^-[a-zA-Z]*[fE]$/ : /^-[a-zA-Z]*f$/;
    let attachedFlagPattern = isAwk ? /^-[fE]./ : /^-f./;
    let evalFlagPattern = isAwk ? /^-[bcCghIkMnNOPrsStV]*[fE](?=[\s\S])/ : /^-[abnErsuz]*f(?=[\s\S])/;
    let argIndex;
    for (let argIndex_2 = 0; argIndex_2 < args.length; argIndex_2 += 1) {
      let text = args[argIndex_2].text;
      if (separateFlagPattern.test(text)) return args[argIndex_2 + 1];
      if (attachedFlagPattern.test(text)) return attachedPathWord(args[argIndex_2], text.slice(2));
      if (text.startsWith("--file=")) return attachedPathWord(args[argIndex_2], text.slice(7));
      if (!rubyPattern || isPlainArgument(argIndex) || isStdinLikePath(argIndex) || argIndex?.text === "{}")
        continue;
      let fileFlag = text === "--file" ? text : evalFlagPattern.exec(text)?.[0];
      if (
        fileFlag !== undefined &&
        readFlagWithOverride(TENGU_COMPOSED_KITE, {
          safe: true,
        })
      )
        argIndex =
          fileFlag === "--file"
            ? args[argIndex_2 + 1]
            : attachedPathWord(args[argIndex_2], text.slice(fileFlag.length));
    }
    return argIndex;
  }
  let evalFlags = INTERPRETER_EVAL_FLAGS[interpreterName] ?? new Set();
  let sawUnknownFlag = false;
  for (let argIndex = 0; argIndex < args.length; argIndex += 1) {
    let text = args[argIndex].text;
    if (text === "--") return args[argIndex + 1];
    if (text === "-" || !text.startsWith("-"))
      return text === "-" ? args[argIndex] : sawUnknownFlag ? "unknown_option" : args[argIndex];
    if (isEvalFlag(interpreterName, text)) return;
    if (interpreterName === "ruby" && text === "-F") {
      let nextArg = args[argIndex + 1];
      if (
        !rubyAttachedPattern ||
        (nextArg !== undefined &&
          !nextArg.text.startsWith("-") &&
          !isStdinLikePath(nextArg) &&
          (nextArg.text === "" || isPathWord(nextArg)))
      )
        argIndex += 1;
      continue;
    }
    if (evalFlags.has(text)) {
      argIndex += 1;
      continue;
    }
    if ([...evalFlags].some((flag) => flag.length === 2 && text.length > 2 && text.startsWith(flag)))
      continue;
    if (text.startsWith("--") && text.includes("=")) continue;
    if (!INTERPRETER_NOOP_FLAGS[interpreterName]?.test(text)) sawUnknownFlag = true;
  }
  return;
}
//@ chunk-4z1ntdgk.js:108935-110036 placement
/**
 * 各解释器的无害选项正则，以及 Node 内置模块名单。
 */
var INTERPRETER_NOOP_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NODE_BUILTIN_MODULES;
deferInit("chunk-4z1ntdgk.js:108935", () => {
  INTERPRETER_NOOP_FLAGS = {
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
  NODE_BUILTIN_MODULES = new Set([
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
});
//@ chunk-4z1ntdgk.js:110036-110345 placement
function scanJsImports(text) {
  for (let match of text.matchAll(
    /(?:\brequire\s*(?:\?\.)?\s*\(|\bimport\s*\(|\bimport\s+(?:[\w*{}\s,]+\s+from\s+)?|\bfrom\s+|\bcreateRequire\b[^'"]*)\s*['"]([^'"]+)['"]/g,
  )) {
    let moduleName = match[1];
    if (moduleName.startsWith("/") || moduleName.startsWith("node:")) continue;
    if (!NODE_BUILTIN_MODULES.has(firstLineOf(moduleName, "/"))) return true;
  }
  return /\bcreateRequire\b/.test(text);
}
//@ chunk-4z1ntdgk.js:110345-111771 placement
function analyzeAssignments(assignments, zshPathArray, nullCommandHeld, relativeNames) {
  for (let assignment of assignments) {
    let match = /^([A-Za-z_][A-Za-z0-9_]*)(?:\[[^\]]*\])?\+?=([\s\S]*)$/.exec(assignment.text);
    if (match === null) continue;
    let varName = match[1];
    let value = match[2];
    let isRelativeEntry = (entry) =>
      entry === "." ||
      !isAbsoluteLike(entry) ||
      /^\$\{?PWD\b|^\$\(/.test(entry) ||
      (isUnresolvedVariablePath(entry, relativeNames) && !new RegExp(`^\\$\\{?${varName}\\b`).test(entry));
    let isUnresolvedRef = (entry) =>
      /^\$/.test(entry) && !new RegExp(`^\\$\\{?(?:${varName}|HOME|PATH)\\b`).test(entry);
    if (BUILD_TOOL_ENV_VARS.includes(varName)) {
      if (value.split(":").some((entry) => isRelativeEntry(entry) || isUnresolvedRef(entry)))
        return `it sets ${varName} with the working directory or a relative entry on it`;
    } else if (zshPathArray && /^(?:path|fpath|manpath|cdpath)$/.test(varName)) {
      let arrayBody = /^\(([\s\S]*)\)$/.exec(value)?.[1];
      if ((arrayBody === undefined ? [value] : splitQuotedWords(arrayBody)).some(isRelativeEntry))
        return `it sets ${varName} with the working directory or a relative entry on it`;
    } else if (varName === "PHPRC" || varName === "PHP_INI_SCAN_DIR") {
      let iniLocations = varName === "PHPRC" ? [value] : value.split(":").filter((entry) => entry !== "");
      if (value !== "" && iniLocations.some(isRelativeEntry))
        return `it sets ${varName} to a php.ini location in the working directory`;
    } else if (
      isToolEnvVar(varName, nullCommandHeld) ||
      /^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+|PARAMETERS|GLOBAL|SYSTEM)$/.test(varName)
    )
      return `it sets ${varName}, which makes a shell, an interpreter or git load what it names`;
    else if (TOOL_ENV_EXACT_RE.test(varName)) {
      let found = value
        .split(/[\s=]+/)
        .find(
          (pathWord) =>
            (SCRIPT_PATH_RE.test(pathWord) && !isAbsoluteLike(pathWord, PATH_PREFIX_CHARS_RE)) ||
            isUnresolvedVariablePath(pathWord, relativeNames),
        );
      if (found !== undefined)
        return SCRIPT_PATH_RE.test(found) && !isAbsoluteLike(found, PATH_PREFIX_CHARS_RE)
          ? `it sets ${varName}, which a tool runs or loads, to a file in the working directory (${found})`
          : `it sets ${varName}, which a tool runs or loads, to ${found}, which may name a file in the working directory (a variable in it is set to a relative value, or a relative path follows one)`;
    }
  }
  return;
}
//@ chunk-4z1ntdgk.js:111771-111996 layout
var GIT_EXEC_PATH_LAUNCH_DIR_TEXT =
  "it runs git with an exec path in the launch directory (git-* commands come from there)";
var GIT_EXEC_PATH_UNVERIFIABLE_TEXT =
  "it runs git with an exec path this check cannot confirm is absolute (git-* commands come from there; write it out from '/')";
//@ chunk-4z1ntdgk.js:111996-114037 placement
function analyzeEnvCommand(args, assignments, sources, relativeNames, unexpandedTilde) {
  if (
    assignments.some(
      (assignment) =>
        /^(?:env|-i|--ignore-environment|-u|--unset)$/.test(
          assignment.text.slice(assignment.text.lastIndexOf("/") + 1),
        ) || assignment.text.startsWith("GIT_CONFIG"),
    )
  )
    return "it runs git with the environment that switches its repository hooks off cleared or edited";
  let reason;
  for (let argIndex = 0; argIndex < args.length; argIndex += 1) {
    let text = args[argIndex].text;
    let configArg;
    if (text === "-c" || text === "--config-env") {
      argIndex += 1;
      configArg = args[argIndex]?.text;
    } else if (text.startsWith("--config-env=")) configArg = text.slice(13);
    else if (/^-c./.test(text)) configArg = text.slice(2);
    else if (/^--exec-path=(?!\/)/.test(text))
      if (!unexpandedTilde) {
        if (!text.startsWith("--exec-path=~")) return GIT_EXEC_PATH_LAUNCH_DIR_TEXT;
      } else
        reason = text.startsWith("--exec-path=~")
          ? "it runs git with an exec path in the launch directory (git-* commands come from there; this '~' is not your home directory)"
          : GIT_EXEC_PATH_UNVERIFIABLE_TEXT;
    if (configArg === undefined) {
      if (/^(?:bisect|submodule|rebase)$/.test(text)) {
        let sliced = args.slice(argIndex + 1);
        let index = sliced.findIndex((arg) => /^(?:run|foreach|-x|--exec)$/.test(arg.text));
        if (index !== -1 && sliced[index + 1] !== undefined) {
          let sliced_2 = sliced.slice(index + 1);
          let joined = sliced_2.map((leftText) => leftText.text).join(" ");
          sources.push(joined);
          if (unexpandedTilde) {
            let text_2 = sliced[index].text;
            let reason;
            if (text === "bisect" && text_2 === "run")
              reason = sliced_2.map((rightText) => rightText.raw).join(" ");
            else if (text === "submodule" && text_2 === "foreach") {
              let index = sliced_2.findIndex((arg) => !/^(?:-q|--quiet|--recursive)$/.test(arg.text));
              if (index !== -1)
                reason = [sliced_2[index].text, ...sliced_2.slice(index + 1).map((arg) => arg.raw)].join(" ");
            }
            if (reason !== undefined && reason !== joined) sources.push(reason);
          }
        }
        break;
      }
      continue;
    }
    let index = configArg.indexOf("=");
    let configKey = index === -1 ? configArg : configArg.slice(0, index);
    let configValue = index === -1 ? "" : configArg.slice(index + 1);
    if (/^core\.hookspath$/i.test(configKey)) {
      if (!/^(?:\/|~\/)/.test(configValue) || /^~[+-]/.test(configValue))
        return "it runs git with core.hooksPath set on the command line";
    } else if (
      /^include(?:if\.[^=]*)?\.path$/i.test(configKey) &&
      !isResolvableAbsolutePath(configValue, relativeNames)
    )
      return "it runs git with an include path set on the command line";
    else if (isUnresolvedVariablePath(configValue, relativeNames))
      return `it runs git with ${configKey} set on the command line to ${configValue}, which may name a file in the working directory`;
    else if (
      configValue.startsWith("!") ||
      (configValue.includes("/") && !isAbsoluteLike(configValue, PATH_PREFIX_CHARS_RE)) ||
      /^(?:core\.(?:fsmonitor|sshcommand|askpass|editor|pager|gitproxy)|credential\.helper|diff\.external|gpg\.(?:\w+\.)?program|sequence\.editor|uploadpack\.packobjectshook)$/i.test(
        configKey,
      )
    )
      return `it runs git with ${configKey} set on the command line to something that runs from the checkout`;
  }
  return reason;
}
//@ chunk-4z1ntdgk.js:114037-114233 placement
var PHP_INI_CODE_LOADING_RE =
  /^(?:auto_prepend_file|auto_append_file|include_path|extension_dir|(?:zend_)?extension|opcache\.(?:preload|file_cache)|ffi\.preload|phar\.cache_list|sendmail_path|sqlite3\.extension_dir)$/;
//@ chunk-4z1ntdgk.js:114233-115083 placement
function analyzePhpCommand(args, state) {
  let interpreterScript = findInterpreterScript("php", args, state.rubyAttachedPattern);
  let scriptIndex = typeof interpreterScript === "object" ? args.indexOf(interpreterScript) : -1;
  let index = args.findIndex((arg) => arg.text === "--");
  let optionArgs =
    typeof interpreterScript === "object" &&
    scriptIndex !== -1 &&
    !/^(?:-[fF]|--file)$/.test(args[scriptIndex - 1]?.text ?? "")
      ? args.slice(0, scriptIndex)
      : args.filter((arg, argIndex) => argIndex !== scriptIndex && (index === -1 || argIndex < index));
  let operandAt = (rawValue, argIndex) => tildeOperandAt(optionArgs, rawValue.replace(/^=/, ""), argIndex);
  return optionArgs.some((arg, argIndex) => {
    let match = /^(?:-[zc]|--zend-extension=?|--php-ini=?)(.*)$/.exec(arg.text);
    if (match !== null) return operandReachesBeyondRoots(operandAt(match[1], argIndex), state);
    let match_2 = /^(?:-d|--define=?)(.*)$/.exec(arg.text);
    if (match_2 === null) return false;
    let { value: setting } = operandAt(match_2[1], argIndex);
    let index = setting.indexOf("=");
    let trimmed = (index === -1 ? setting : setting.slice(0, index)).trim();
    let settingValue = index === -1 ? "1" : setting.slice(index + 1);
    if (!PHP_INI_CODE_LOADING_RE.test(trimmed)) return false;
    let reaches = (value) =>
      operandReachesBeyondRoots(
        {
          value,
          tildeLiteral: true,
        },
        state,
      );
    if (trimmed === "include_path") return settingValue.split(":").some(reaches);
    if (/^(?:zend_)?extension$/.test(trimmed) && !settingValue.includes("/")) return false;
    return settingValue !== "" && reaches(settingValue);
  })
    ? "it runs php with -z, -c or a -d setting that loads a file"
    : undefined;
}
//@ chunk-4z1ntdgk.js:115083-115221 placement
function collectHeredocInput(heredoc, redirects) {
  let inputs = [
    ...(heredoc === undefined ? [] : [heredoc]),
    ...redirects.filter((redirect) => redirect.op === "<<<").map((redirect) => redirect.target.text),
  ];
  return inputs.length > 0
    ? inputs.join(`
`)
    : undefined;
}
//@ chunk-4z1ntdgk.js:115221-115364 placement
function pythonHeredocExecReason(heredocInput) {
  return heredocInput !== undefined && EXEC_OR_EVAL_RE.test(heredocInput)
    ? "it runs python with a heredoc or herestring program that mentions exec, eval or execfile"
    : undefined;
}
//@ chunk-4z1ntdgk.js:115364-116697 placement
function analyzePythonCommand(args, state, heredocInput) {
  let interpreterScript = findInterpreterScript("python", args, state.rubyAttachedPattern);
  let index = args.findIndex((arg) => arg === interpreterScript || isEvalFlag("python", arg.text));
  if (
    (index === -1 ? args : args.slice(0, args[index] === interpreterScript ? index : index + 1)).some((arg) =>
      /^-[bBdEhIOPqRsSuvVx]*i/.test(arg.text),
    )
  )
    return "it runs python with -i";
  let sawIsolatedMode = false;
  for (let argIndex = 0; argIndex < args.length; argIndex += 1) {
    let text = args[argIndex].text;
    if (text === "-" || isStdinLikePath(args[argIndex]))
      return sawIsolatedMode
        ? pythonHeredocExecReason(heredocInput)
        : "it runs python with -m, -c or a program on stdin, without -P or -I";
    if (
      text === "--" &&
      sawIsolatedMode &&
      (args[argIndex + 1] === undefined ||
        args[argIndex + 1].text === "-" ||
        isStdinLikePath(args[argIndex + 1]))
    )
      return pythonHeredocExecReason(heredocInput);
    if (!text.startsWith("-") || text === "--") return;
    if (text.startsWith("--")) {
      if (text === "--version" || text === "--help") return;
      if (text === "--check-hash-based-pycs") argIndex += 1;
      continue;
    }
    for (let charIndex = 1; charIndex < text.length; charIndex += 1) {
      let flagChar = text[charIndex];
      if (flagChar === "I" || flagChar === "P") {
        if (!state.runsTextHeld) return;
        sawIsolatedMode = true;
        continue;
      }
      if (flagChar === "V" || flagChar === "h") return;
      if (flagChar === "W" || flagChar === "X") {
        if (charIndex === text.length - 1) argIndex += 1;
        break;
      }
      if (flagChar === "m")
        return sawIsolatedMode
          ? undefined
          : "it runs python with -m, -c or a program on stdin, without -P or -I";
      if (flagChar === "c") {
        let code = charIndex < text.length - 1 ? text.slice(charIndex + 1) : (args[argIndex + 1]?.text ?? "");
        if (!state.runsTextHeld)
          return IMPORT_OR_EXEC_RE.test(code)
            ? "it runs python with -m, -c or a program on stdin, without -P or -I"
            : undefined;
        if (EXEC_OR_EVAL_RE.test(code))
          return "it runs python with -c code that mentions exec, eval or execfile";
        return !sawIsolatedMode && PYTHON_IMPORT_PATTERN.test(code)
          ? "it runs python with -m, -c or a program on stdin, without -P or -I"
          : undefined;
      }
    }
  }
  return sawIsolatedMode
    ? pythonHeredocExecReason(heredocInput)
    : "it runs python with -m, -c or a program on stdin, without -P or -I";
}
//@ chunk-4z1ntdgk.js:116697-116942 placement
var MAKE_AWK_INCLUDE_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GNU_TOOL_PREFIX_SOURCE;
var regExp;
var regExp_2;
deferInit("chunk-4z1ntdgk.js:116697", () => {
  MAKE_AWK_INCLUDE_RE =
    /^[ \t]*-?(?:s?include|load)[ \t]+(?!=)([^\n]*)$|^[ \t]*\.[ \t]*[ds-]?include[ \t]*("[^\n]*)$|^[ \t]*@(?:include|load)[ \t]*("[^\n]*)$/gm;
  GNU_TOOL_PREFIX_SOURCE = "(?:[gbp]|gnu)?";
  regExp = new RegExp(`^${GNU_TOOL_PREFIX_SOURCE}(?:make|[gnm]?awk)$`, "i");
  regExp_2 = new RegExp(`^${GNU_TOOL_PREFIX_SOURCE}make$`, "i");
});
//@ chunk-4z1ntdgk.js:116942-117220 placement
function shebangInterpreter(line) {
  let parts = line.trim().split(/[ \t]+/);
  let index = 0;
  if (/(?:^|\/)env$/.test(parts[0] ?? "")) {
    index = 1;
    while (
      index < parts.length &&
      (parts[index].startsWith("-") || /^[A-Za-z_][A-Za-z0-9_]*=/.test(parts[index]))
    )
      index += /^-[A-Za-z]*[PuC]$|^--(?:unset|chdir)$/.test(parts[index]) ? 2 : 1;
  }
  let program = parts[index] ?? "";
  return program.slice(program.lastIndexOf("/") + 1);
}
//@ chunk-4z1ntdgk.js:117220-118027 placement
/**
 * CLAUDE_PROJECT_DIR 引用正则、shell 注释行正则与若干 bot_protected 特性名常量。
 */
var CLAUDE_PROJECT_DIR_PATTERN = /\bCLAUDE_PROJECT_DIR\b/i;
var SHELL_COMMENT_LINE_RE = /^[ \t]*#.*$/gm;
var BOT_PROTECTED_TENGU_PLUMED_HERON = "bot_protected_tengu_plumed_heron";
var BOT_PROTECTED_TENGU_KEEN_CERF = "bot_protected_tengu_keen_cerf";
var BOT_PROTECTED_TENGU_COMPOSED_FALCON = "bot_protected_tengu_composed_falcon";
var BOT_PROTECTED_TENGU_BANDED_KINGFISHER = "bot_protected_tengu_banded_kingfisher";
var BOT_PROTECTED_TENGU_QUIET_FIELDFARE = "bot_protected_tengu_quiet_fieldfare";
var TENGU_FLUTTERING_SCONE = "tengu_fluttering_scone";
var BOT_PROTECTED_TENGU_MOSSY_CHIPMUNK = "bot_protected_tengu_mossy_chipmunk";
var BOT_PROTECTED_TENGU_OCHRE_KITTIWAKE = "bot_protected_tengu_ochre_kittiwake";
var BOT_PROTECTED_TENGU_MISTY_SPROUT = "bot_protected_tengu_misty_sprout";
var BOT_PROTECTED_TENGU_SEQUENTIAL_POND = "bot_protected_tengu_sequential_pond";
var BOT_PROTECTED_TENGU_QUIET_ANVIL = "bot_protected_tengu_quiet_anvil";
var MAKEFILE_UNCHECKED_TEXT = "it is a makefile, and what make would run from it cannot be checked here";
var AWK_SCRIPT_UNCHECKED_TEXT = "it is an awk script, and what awk would run from it cannot be checked here";
var BOT_PROTECTED_TENGU_VALIDATED_CUPCAKE = "bot_protected_tengu_validated_cupcake";
var TENGU_FEDERATED_HEARTH = "tengu_federated_hearth";
var BOT_PROTECTED_TENGU_GLITTERY_POND = "bot_protected_tengu_glittery_pond";
var BOT_PROTECTED_TENGU_PLAITED_OSIER = "bot_protected_tengu_plaited_osier";
var TENGU_COMPOSED_KITE = "tengu_composed_kite";
//@ chunk-4z1ntdgk.js:118027-120904 placement
function analyzeScriptFile(bytes, roots, home, interpreter, options = {}) {
  let str = (bytes.includes(0) ? Buffer.from(bytes.filter((byte) => byte !== 0)) : bytes).toString("utf8");
  let index = str.indexOf(`
`);
  let source = str.startsWith("#!") ? str.slice(2, index === -1 ? undefined : index) : "";
  let shebangInterpreterName = shebangInterpreter(
    options.makeHooksHeld !== false
      ? source.replace(
          /^([ \t]*(?:[^ \t]*\/)?)env(?=[ \t]|$)/i,
          (prefix, matchedPrefix) => `${matchedPrefix}env`,
        )
      : source,
  );
  if (
    options.makeHooksHeld !== false &&
    (interpreter === undefined || interpreter === null) &&
    regExp.test(shebangInterpreterName)
  )
    return regExp_2.test(shebangInterpreterName) ? MAKEFILE_UNCHECKED_TEXT : AWK_SCRIPT_UNCHECKED_TEXT;
  let isShellScript =
    interpreter !== undefined && interpreter !== null
      ? /^(?:bash|sh|zsh|dash|ash|ksh|mksh|rbash|fish)$/i.test(interpreter)
      : shebangInterpreterName === "" ||
        SHELL_NAME_RE.test(shebangInterpreterName) ||
        regExp.test(shebangInterpreterName);
  let body = str.startsWith("#!") ? (index === -1 ? "" : str.slice(index + 1)) : str;
  let quotedBackslashKept = options.quotedBackslashKept !== false;
  let unexpandedTilde = options.unexpandedTilde !== false;
  let scriptText =
    source +
    `
` +
    (isShellScript ? stripShellComments(body, quotedBackslashKept) : str.replace(SHELL_COMMENT_LINE_RE, ""));
  let normalized = normalizeCommandForPlatform(scriptText);
  let found = normalizeCaseForComparison_2(roots)
    .flatMap((root) => pathPrefixes(root, home))
    .find((rootSpelling) =>
      new RegExp(
        `(?<![\\w./~$-])${urlPatternToRegex(normalizeCommandForPlatform(rootSpelling))}${rootSpelling.endsWith("/") ? "" : "(?![\\w.-])"}`,
      ).test(normalized),
    );
  if (found !== undefined) return `it names ${found.replace('"', "")}`;
  if (CLAUDE_PROJECT_DIR_PATTERN.test(normalized)) return "it reads $CLAUDE_PROJECT_DIR";
  if (CWD_DEPENDENCE_PATTERN.test(normalized) || (isShellScript && PWD_REFERENCE_RE.test(normalized)))
    return "it uses its working directory";
  if (options.histcharsHeld !== false && HISTCHARS_RE.test(str.replace(/\$(?=['"])|\\\n|['"\\]/g, "")))
    return "it names zsh's histchars, which can make zsh run lines that look like comments";
  let lower = (interpreter ?? shebangInterpreterName).toLowerCase();
  let cShellsHeld = options.cShellsHeld !== false;
  if (cShellsHeld && CSH_SHELL_RE.test(lower)) return CSH_TEXT_UNVERIFIABLE;
  if (
    /^t?csh$/.test(lower) &&
    Array.from(body.matchAll(/^[ \t]*set[ \t]+path[ \t]*=[ \t]*\(([^)\n]*)\)/gm)).some((match) =>
      splitQuotedWords(match[1]).some((pathEntry) => pathEntry === "." || !/^[\/~$]/.test(pathEntry)),
    )
  )
    return "it sets path with the working directory or a relative entry on it";
  let reason;
  try {
    let state = {
      roots: normalizeCaseForComparison_2(roots),
      home,
      fromPayload: false,
      shell: lower,
      quotedBackslashKept,
      zshNullCommandHeld: options.zshNullCommandHeld !== false,
      rubyAttachedPattern: options.rubyAttachedPattern !== false,
      forNameDo: options.forNameDo !== false,
      cShellsHeld,
      commandAfterConditional: options.commandAfterConditional !== false,
      runsTextHeld: options.runsTextHeld !== false,
      shortLoopLists: options.shortLoopLists !== false,
      relativeNamedValues: options.relativeNamedValues,
      disableHeld: options.disableHeld !== false,
      substitutionHeredocs: options.substitutionHeredocs !== false,
      unexpandedTilde,
    };
    let matches = regExp.test(shebangInterpreterName);
    let makeHooksHeld =
      matches && options.makeHooksHeld !== false && interpreter !== undefined && interpreter !== null;
    reason =
      (isShellScript
        ? (analyzeCommandText(body, matches, state) ??
          (makeHooksHeld ? analyzeCommandText(body, false, state) : undefined))
        : undefined) ?? collectCommandReach(source, state);
  } catch {
    reason = "it could not be read as shell";
  }
  if (reason !== undefined) return reason;
  if (cShellsHeld && isShellScript) {
    let text = expandVariableRefs(scriptText).replace(
      /\\[xXuU]0*([0-9a-fA-F]{1,2})|\\0*([0-7]{1,3})/g,
      (quote, value, codePoint) =>
        String.fromCharCode(value !== undefined ? parseInt(value, 16) : parseInt(codePoint ?? "0", 8) & 255),
    );
    let replaced = expandVariableRefs(text)
      .replace(/\\[abefnrtv]/g, " ")
      .replace(/\$(?=['"])|["']/g, "")
      .replace(/\\c-?.(?=t?csh|bsd-csh)/gi, " ")
      .replace(/\\/g, "");
    let SIMPLE_SUBST_RE = /\$\([^()\n]*\)|`[^`\n]*`/g;
    let replaced_2 = replaced.replace(/\$\{\w+\}/g, "");
    let replaced_3 = replaced_2.replace(/\$\{[^-=+?{}\n]*[-=+?]([^{}\n]*)\}/g, "$1");
    if (
      [
        scriptText,
        scriptText.replace(/\$[=~^]?\w+\[(?:"[^"\n]*"|'[^'\n]*')\]/g, ""),
        text.replace(/\\/g, ""),
        scriptText.replace(/\$[^({$\n]/g, ""),
        scriptText.replace(/\\\n/g, "").replace(/\$[^({$\n]/g, ""),
        replaced.replace(/\$\{\w+\}/g, " "),
        stripDollarRefs(replaced),
        stripDollarRefs(replaced_2),
        stripDollarRefs(replaced_3),
        stripDollarRefs(replaced_2.replace(/\$\{[^{}\n]*[-=+?]([^-=+?{}\n]*)\}/g, "$1")),
        stripDollarRefs(replaced_2.replace(SIMPLE_SUBST_RE, "")),
        stripDollarRefs(replaced_3.replace(SIMPLE_SUBST_RE, "")),
      ].some((text) => CSH_IN_TEXT_RE.test(text))
    )
      return CSH_NAMED_TEXT;
  }
  if (regExp.test(shebangInterpreterName) && hasRelativeInclude(scriptText))
    return "it includes another build file, plugin or awk source by a relative name";
  return;
}
//@ chunk-4z1ntdgk.js:120904-121041 placement
function stripShellComments(source, quotedBackslashKept) {
  let parts = [];
  let start = 0;
  for (let [from, to] of shellComments(source, {
    quotedBackslashKept,
  })) {
    parts.push(source.slice(start, from));
    start = to;
  }
  parts.push(source.slice(start));
  return parts.join("");
}
//@ chunk-4z1ntdgk.js:121041-121277 placement
function hasRelativeInclude(source) {
  for (let match of source.matchAll(MAKE_AWK_INCLUDE_RE)) {
    let filtered = (match[1] ?? match[2] ?? match[3] ?? "")
      .trim()
      .replace(/^"|"$/g, "")
      .split(/[ \t]+/)
      .filter(Boolean);
    if (
      filtered.length === 0 ||
      filtered.some((include) => !/^(?:\/|~\/|\$\(HOME\)|\$\{HOME\}|"\/|'\/|<)/.test(include))
    )
      return true;
  }
  return false;
}
//@ chunk-4z1ntdgk.js:121277-121964 placement
function collectCommandReach(source, state) {
  let sources = [];
  let standing = [];
  for (let command of parseShellCommands(source, {
    commandAfterConditional: state.commandAfterConditional,
    quotedBackslashKept: state.quotedBackslashKept,
    shortLoopLists: state.shortLoopLists,
  }).commands)
    analyzeCommandReach(command, sources, {
      roots: [],
      home: "",
      fromPayload: false,
      standing,
      quotedBackslashKept: state.quotedBackslashKept,
      zshNullCommandHeld: state.zshNullCommandHeld,
      rubyAttachedPattern: state.rubyAttachedPattern,
      forNameDo: state.forNameDo,
      cShellsHeld: state.cShellsHeld,
      commandAfterConditional: state.commandAfterConditional,
      runsTextHeld: state.runsTextHeld,
      shortLoopLists: state.shortLoopLists,
      disableHeld: state.disableHeld,
      substitutionHeredocs: false,
      unexpandedTilde: state.unexpandedTilde,
    });
  return (
    standing[0] ??
    normalizeCaseForComparison_2(sources)
      .map((text) =>
        analyzeCommandText(
          text,
          false,
          {
            ...state,
            fromPayload: true,
          },
          1,
        ),
      )
      .find((reason) => reason !== undefined)
  );
}
//@ chunk-4z1ntdgk.js:121964-122839 placement
function analyzeCommandText(source, make, state, depth = 0) {
  let { commands, unreadable } = parseShellCommands(source, {
    make,
    commandAfterConditional: state.commandAfterConditional,
    quotedBackslashKept: state.quotedBackslashKept,
    shortLoopLists: state.shortLoopLists,
    substitutionHeredocs: state.substitutionHeredocs,
  });
  let sources = [];
  let relativeNames = new Set(state.relativeNames);
  for (let { program, args, assignments } of commands) {
    let assignmentWords = /^(?:export|declare|typeset|local|readonly)$/.test(program.text)
      ? [...assignments, ...args]
      : assignments;
    for (let assignment of assignmentWords) {
      let match = /^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]+)$/.exec(assignment.text);
      if (match !== null && !isAbsoluteLike(match[2], PATH_PREFIX_CHARS_RE)) relativeNames.add(match[1]);
    }
  }
  for (let command of commands) {
    let reason = analyzeCommandReach(command, sources, {
      ...state,
      make,
      relativeNames,
    });
    if (reason !== undefined) return reason;
  }
  if (unreadable !== null) return `it could not be read to the end as shell (${unreadable})`;
  for (let text of new Set(sources)) {
    let reason =
      depth >= 3
        ? "it hands shell code to a shell too many layers deep"
        : analyzeCommandText(
            text,
            false,
            state.relativeNamedValues === false
              ? {
                  ...state,
                  fromPayload: true,
                }
              : {
                  ...state,
                  fromPayload: true,
                  relativeNames,
                },
            depth + 1,
          );
    if (reason !== undefined) return reason;
  }
  return;
}
//@ chunk-4z1ntdgk.js:122839-122949 layout
function expandVariableRefs(text) {
  return text.replace(/\\\n/g, "").replace(/\$[=~^]?([A-Za-z_]\w*)(?:\[[^\][\s;&|<>]*\])?/g, "${$1}");
}
//@ chunk-4z1ntdgk.js:122949-123056 layout
function stripDollarRefs(text) {
  return text.replace(/\$\{[^{}\n]*\}|\$\(\s*\)|`[ \t]*`|\$[1-9@*!-]/g, "").replaceAll("\x00", "");
}
//@ chunk-4z1ntdgk.js:123056-123192 placement
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
//@ chunk-4z1ntdgk.js:123192-123371 placement
function deviceHookKey(site, hook, defaultShell) {
  let commandKey =
    hook.type === "command"
      ? `${hook.shell ?? defaultShell}\x00${hook.command}\x00${jsonStringify(hook.args ?? null)}`
      : hook.url;
  return `${site.event}\x00${site.matcher ?? ""}\x00${hook.type}\x00${commandKey}\x00${hook.if ?? ""}`;
}
//@ chunk-4z1ntdgk.js:123371-123431 placement
function clampHookTimeout(timeout) {
  return timeout !== undefined && timeout > 0 ? Math.min(timeout, MAX_DEVICE_HOOK_TIMEOUT_S) : undefined;
}
//@ chunk-4z1ntdgk.js:123431-123517 placement
async function realpathOrSelf(fs, path) {
  try {
    let realPath = await fs.realpath(path);
    return isAbsolutePlatformPath(realPath) ? realPath : path;
  } catch {
    return path;
  }
}
//@ chunk-4z1ntdgk.js:123517-123823 placement
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
//@ chunk-4z1ntdgk.js:123823-125124 placement
async function checkHookSourceReach(source, ctx) {
  let rootReal = ctx.opts.sync?.rootReal;
  let reachMemory = source.source === "local" ? undefined : ctx.opts.reachMemory;
  if (
    source.settingsFile === null ||
    (!reachMemory?.everInReach.has(source.source) &&
      rootReal === undefined &&
      ctx.roots.extraReach.length === 0)
  )
    return null;
  let settingsFile = source.settingsFile;
  let localSettingsLocation = source.source === "local" ? ctx.opts.localSettingsLocation : undefined;
  let settingsLocation = localSettingsLocation?.current ?? null;
  if (settingsLocation === null) {
    let foreignSpelling = await resolveForeignSpellingAsync(
      await classifyPathSpelling_3(settingsFile, ctx.opts.launchDir),
      ctx.opts.launchDir,
      protectedHomeRoots(),
    );
    if (foreignSpelling.verdict !== "local") return SYNC_ROOT_REASON;
    try {
      settingsLocation = [foreignSpelling.spelling, await ctx.deps.realpath(foreignSpelling.spelling)];
    } catch {
      return SYNC_ROOT_REASON;
    }
    if (localSettingsLocation !== undefined) {
      localSettingsLocation.current ??= settingsLocation;
      settingsLocation = localSettingsLocation.current;
    }
  }
  let mapped = [
    settingsFile,
    ...settingsLocation,
    ...(reachMemory?.knownSpellings.get(source.source) ?? []),
  ].map(normalizeCommandForPlatform);
  let isWindows = getPlatform() === "windows";
  let sep = isWindows ? /[\\/]/ : "/";
  let mapped_2 = [
    ...(rootReal !== undefined ? [rootReal] : []),
    ...(ctx.opts.sync?.root !== undefined ? [ctx.opts.sync.root] : []),
    ...ctx.roots.extraReach,
  ].map((root) =>
    isWindows
      ? normalizeCommandForPlatform(root).replace(/[\\/]+$/, "") || "/"
      : normalizeCommandForPlatform(root.replace(/\/+$/, "") || "/"),
  );
  if (
    mapped_2.some((root) =>
      mapped.some((path) => !isPathUnderForPlatform(path, root) && isReachableOrSamePath(path, root)),
    )
  )
    return SYNC_ROOT_REASON;
  let filtered = mapped_2.filter((root) => mapped.some((path) => isPathUnderForPlatform(path, root)));
  let flattened = mapped.flatMap((path) =>
    filtered.flatMap((root) =>
      isPathUnderForPlatform(path, root)
        ? [path === root ? "" : path.slice(root === "/" ? 1 : root.length + 1)]
        : [],
    ),
  );
  if (flattened.length === 0) return reachMemory?.everInReach.has(source.source) ? SYNC_ROOT_REASON : null;
  let configRoots = normalizeCaseForComparison_2(
    [ctx.roots.configHomeReal, ctx.opts.configHome].map(normalizeCommandForPlatform),
  );
  if (
    filtered.some(
      (root) =>
        configRoots.some(
          (configRoot) =>
            root === configRoot ||
            isReachableOrSamePath(root, configRoot) ||
            isReachableOrSamePath(configRoot, root),
        ) || root.split(sep).includes(".claude"),
    )
  )
    return SYNC_ROOT_IS_CONFIG_DIR_REASON;
  let all = flattened.every((relative) => relative.split(sep).some((segment) => segment.startsWith(".")));
  return source.source === "local" && all ? null : SYNC_ROOT_REASONS;
}
//@ chunk-4z1ntdgk.js:125124-125274 placement (2.1.88 match: convertToHookMatchers, 0.839)
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
//@ chunk-4z1ntdgk.js:125274-125391 placement
function isSimpleScriptCommand(command, interpreter) {
  let parts = command.trim().split(/ +/);
  return interpreter === null
    ? parts.length === 1
    : (interpreter === "python3" || interpreter === "python") && parts.length === 2;
}
//@ chunk-4z1ntdgk.js:125391-125428 placement
function isKnownHookEvent(event) {
  return HOOK_EVENTS.includes(event);
}
//@ chunk-4z1ntdgk.js:125428-125472 placement
var ENV_PROGRAM_PATHS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4z1ntdgk.js:125428", () => {
  ENV_PROGRAM_PATHS = new Set(["/usr/bin/env", "/bin/env"]);
});
//@ chunk-4z1ntdgk.js:125472-126167 placement
function readShebang(bytes) {
  let str = bytes.subarray(0, 512).toString("utf8");
  if (!str.startsWith("#!")) return null;
  let index = str.indexOf(`
`);
  let parts = str
    .slice(2, index === -1 ? undefined : index)
    .replace(/^[ \t]+|[ \t]+$/g, "")
    .split(/[ \t]+/);
  let program = parts[0];
  if (program === undefined || program === "") return null;
  if (parts.some((word) => /[^\x21-\x7e]/.test(word))) return "unjudgeable";
  if (!program.startsWith("/") || DOT_DOT_SEGMENT_RE.test(program)) return "unjudgeable";
  let isPlainOption = isPlainOptionWord;
  if (!ENV_PROGRAM_PATHS.has(normalizeCommandForPlatform(posix.normalize(program))))
    return parts.slice(1).every(isPlainOption) ? posix.normalize(program) : "unjudgeable";
  let words = parts[1] === "-S" ? parts.slice(2) : parts.slice(1);
  let programWord = words[0];
  if (
    programWord === undefined ||
    programWord.startsWith("-") ||
    programWord.includes("=") ||
    !words.slice(1).every(isPlainOption)
  )
    return "unjudgeable";
  if (programWord.startsWith("/"))
    return DOT_DOT_SEGMENT_RE.test(programWord) ? "unjudgeable" : posix.normalize(programWord);
  return /^[\w.+-]+$/.test(programWord) ? null : "unjudgeable";
}
//@ chunk-4z1ntdgk.js:126167-126321 placement
var DOT_DOT_SEGMENT_RE = /(?:^|\/)\.\.(?:\/|$)/;
var SAFE_DEVICE_PATH_RE =
  /^\/dev\/(?:null|zero|full|u?random|tty\d*|pts(?:\/.*)?|ptmx|std(?:in|out|err)|fd(?:\/.*)?|dtracehelper|autofs_nowait)$/;
//@ chunk-4z1ntdgk.js:126321-126355 placement (2.1.88 match: filterManagedDisabledPlugins, 1)
function filterManagedDisabledPlugins(plugins) {
  return plugins === "local";
}
//@ chunk-4z1ntdgk.js:126355-134599 placement
/**
 * 判定一个钩子是否能在设备上执行（held/run 等），检查事件、命令可达路径、同步根与证明。
 */
async function decideDeviceHook(site, ctx, afterEditOnly = false, skipTemplates = false) {
  if (!isMatcherEvent(site.event))
    return {
      kind: "held",
      reason: `event_${(isKnownHookEvent(site.event) ? hookEventForwardingKind(site.event) : null) ?? "container_internal"}`,
    };
  let { hook } = site;
  if (hook.type !== "command" && hook.type !== "http")
    return {
      kind: "held",
      reason: "kind_unsupported",
    };
  let isPluginOnly = filterManagedDisabledPlugins(site.source.source);
  let isCloudDevice = hook.cloud === "device" && !isPluginOnly;
  let pluginNote =
    hook.cloud === "device" && isPluginOnly
      ? ' Its "cloud": "device" mark is ignored in settings.local.json.'
      : "";
  let label = `"${hookContentLabel(hook)}" in ${HOOK_SOURCE_DESCRIPTIONS[site.source.source]} does not run for cloud work`;
  let isAfterEdit = isCodeEditingMatcherOnly(site.event, site.matcher);
  if (afterEditOnly)
    return isAfterEdit
      ? {
          kind: "held",
          reason: "after_edit",
        }
      : {
          kind: "forward",
          event: site.event,
          hook,
        };
  let { hooksFolderInReach } = ctx;
  let remedy =
    hooksFolderInReach || isPluginOnly ? "" : " Check the script, then move it to ~/.claude/hooks.";
  if (isAfterEdit && hook.cloud === "skip")
    return {
      kind: "held",
      reason: "after_edit",
    };
  if (hook.cloud === "skip")
    return {
      kind: "held",
      reason: "author_skip",
      notice: `${label}: its entry is marked "cloud": "skip" or a value this version does not know.`,
    };
  let pinnedTarget;
  let heldResult;
  let holdResult;
  let isPinned = false;
  let isPrivateDotDir = false;
  let isShellPrefix = false;
  let isUnsupportedPlatform = false;
  let authorOptIn = false;
  let templateTwinId;
  let templateEntry;
  let notice =
    isAfterEdit && isCloudDevice
      ? `${label}: cloud edits change files in the cloud.${ctx.opts.inRepository ? " Put the hook in the repository's .claude/settings.json." : ""}`
      : undefined;
  if (hook.type === "command") {
    let reach = await classifyDeviceHookReach(hook, ctx.reach, ctx.deps, {
      resolved: ctx.resolved,
    });
    isPrivateDotDir = reach.kind === "opaque" && reach.reason === "private_dotdir";
    isShellPrefix = reach.kind === "opaque" && reach.reason === "shell_prefix";
    isUnsupportedPlatform =
      reach.kind === "opaque" &&
      (reach.reason === "unsupported_platform" || reach.reason === "unsupported_shell");
    if (reach.kind === "unverifiable") {
      isPinned = true;
      heldResult = {
        kind: "held",
        reason: "unverifiable_target",
        notice: `${label}: ${reach.missing ? "its script is missing" : "this machine could not verify its script"}.`,
        ...(reach.missing && {
          cause: "script_missing",
        }),
      };
    } else if (reach.kind === "script_in_reach" || reach.kind === "script_outside_reach") {
      isPinned = true;
      let inReach = reach.kind === "script_in_reach";
      pinnedTarget = reach.pinnedTarget;
      if (inReach && !isCloudDevice)
        holdResult = {
          kind: "held",
          reason: "in_reach",
          notice: `${label}: the cloud session can change the hook's script.${remedy}${pluginNote}`,
          ...(hooksFolderInReach && {
            noRemedy: true,
          }),
        };
      let roots = commandReachRoots(ctx.reach);
      let interpreterSpellings = [
        ...(reach.site.form === "exec" && reach.site.slot === "arg0" && hook.command.startsWith("/")
          ? [DOT_DOT_SEGMENT_RE.test(hook.command) ? "unjudgeable" : posix.normalize(hook.command)]
          : []),
        ...(reach.interpreter === null
          ? [readShebang(reach.bytes)].filter((spelling) => spelling !== null)
          : []),
      ];
      let interpreterProblem;
      for (let spelling of interpreterSpellings) {
        if (spelling === "unjudgeable") {
          interpreterProblem = "this machine cannot check the interpreter the hook names";
          break;
        }
        let foreignSpelling = await resolveForeignSpellingAsync(
          await classifyPathSpelling_3(spelling, ctx.opts.launchDir),
          ctx.opts.launchDir,
          protectedHomeRoots(),
        );
        let realPath =
          foreignSpelling.verdict === "local"
            ? await ctx.deps.realpath(foreignSpelling.spelling).catch(() => null)
            : null;
        if (realPath === null) {
          interpreterProblem = `its interpreter ${sanitizeDisplayText(spelling, {
            maxCodeUnits: 200,
          })} could not be located on this machine`;
          break;
        }
        if (
          [spelling, realPath].some((spelling) => roots.some((root) => isSameCommandPath(spelling, root)))
        ) {
          interpreterProblem = `the cloud session can change its interpreter ${sanitizeDisplayText(spelling, {
            maxCodeUnits: 200,
          })}`;
          break;
        }
      }
      if (interpreterProblem === undefined && reach.interpreter === null) {
        let shebang = readShebang_2(reach.bytes);
        if (
          shebang !== null &&
          (shebang === "unjudgeable" || (shebang.kind !== "absolute" && shebang.kind !== "env"))
        )
          interpreterProblem = "its interpreter may load code the cloud session can change";
      }
      if (interpreterProblem !== undefined && !inReach)
        if (isCloudDevice) authorOptIn = true;
        else
          holdResult = {
            kind: "held",
            reason: "interpreter_unvouched",
            notice: `${label}: ${interpreterProblem}.${isPluginOnly ? "" : " Use bash, python3 or node from your PATH."}${pluginNote}`,
          };
      authorOptIn = authorOptIn || (inReach && isCloudDevice);
      if (!inReach) {
        let strict = readFlagWithOverride(BOT_PROTECTED_TENGU_GLITTERY_POND, {
          safe: true,
        });
        let loadReason = analyzeScriptFile(
          reach.bytes,
          [
            ctx.reach.launchDir,
            ctx.reach.launchDirReal,
            ...(ctx.reach.sync !== undefined
              ? [ctx.reach.sync.rootReal, ...(ctx.reach.sync.root !== undefined ? [ctx.reach.sync.root] : [])]
              : []),
            ...ctx.reach.extraReach,
          ].filter((root) => !SAFE_DEVICE_PATH_RE.test(root)),
          ctx.deps.home,
          reach.interpreter,
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
            cShellsHeld: readFlagWithOverride(BOT_PROTECTED_TENGU_OCHRE_KITTIWAKE, {
              safe: true,
            }),
            commandAfterConditional: readFlagWithOverride(BOT_PROTECTED_TENGU_MISTY_SPROUT, {
              safe: true,
            }),
            runsTextHeld: readFlagWithOverride(BOT_PROTECTED_TENGU_SEQUENTIAL_POND, {
              safe: true,
            }),
            shortLoopLists: readFlagWithOverride(TENGU_FLUTTERING_SCONE, {
              safe: true,
            }),
            relativeNamedValues: strict,
            disableHeld: readFlagWithOverride(BOT_PROTECTED_TENGU_VALIDATED_CUPCAKE, {
              safe: true,
            }),
            substitutionHeredocs: readFlagWithOverride(BOT_PROTECTED_TENGU_PLAITED_OSIER, {
              safe: true,
            }),
            makeHooksHeld: readFlagWithOverride(BOT_PROTECTED_TENGU_QUIET_ANVIL, {
              safe: true,
            }),
            unexpandedTilde: readFlagWithOverride(BOT_PROTECTED_TENGU_KEEN_CERF, {
              safe: true,
            }),
          },
        );
        if (loadReason !== undefined && !isCloudDevice && holdResult === undefined)
          holdResult = {
            kind: "held",
            reason: "loads_from_reach",
            ...(CSH_REASON_TEXTS.has(loadReason) && {
              cause: "c_shell",
            }),
            notice: `${label}: its script may load files the cloud session can change. ${(strict
              ? sanitizeDisplayText(loadReason, {
                  maxCodeUnits: 400,
                })
              : loadReason
            ).replace(/^it /, "The script ")}.${pluginNote}`,
            ...(loadReason === MAKEFILE_UNCHECKED_TEXT && {
              cause: "makefile",
            }),
            ...(loadReason === AWK_SCRIPT_UNCHECKED_TEXT && {
              cause: "awk",
            }),
          };
        else if (loadReason !== undefined && isCloudDevice) authorOptIn = true;
      }
      if (isCloudDevice && ctx.opts.optInPins !== undefined) {
        let pinValue = `${reach.pinnedTarget.realPath}\x00${reach.pinnedTarget.sha256}`;
        let knownPin = ctx.opts.optInPins.get(reach.pinnedTarget.path);
        if (knownPin === undefined || (!inReach && knownPin !== pinValue))
          ctx.opts.optInPins.set(reach.pinnedTarget.path, pinValue);
        else if (knownPin !== pinValue) {
          heldResult = {
            kind: "held",
            reason: "unverifiable_target",
            notice: `${label}: its script changed and the cloud session can write to it. Check the file, then restart claude --cloud.`,
          };
          pinnedTarget = undefined;
          authorOptIn = false;
        }
      }
      let templateMatch = skipTemplates
        ? undefined
        : (ctx.deps.findTemplateByDigest ?? findTemplateByDigest)(reach.pinnedTarget.sha256);
      let usableMatch = isCloudDevice && !isAfterEdit ? undefined : templateMatch;
      if (
        isCloudDevice &&
        templateMatch !== undefined &&
        hook.args === undefined &&
        !hook.if &&
        !hook.async &&
        !hook.asyncRewake &&
        !hook.once &&
        isSimpleScriptCommand(hook.command, reach.interpreter)
      )
        templateTwinId = templateMatch.template.id;
      if (usableMatch) {
        let { template, label } = usableMatch;
        let included = (ctx.opts.refusedTemplateIds ?? []).includes(template.id);
        let isEnabledTemplate =
          !included && (ctx.opts.enabledTemplateIds ?? hookTemplateIds()).includes(template.id);
        if (included)
          notice = isAfterEdit
            ? `${template.filename} is an after-edit hook, so it is not forwarded either: it does not run for this cloud session, only in local ones.`
            : undefined;
        else if (!isEnabledTemplate)
          notice = isAfterEdit
            ? `${template.filename} is not run in the cloud in this version, and as an after-edit hook it is not forwarded either, so it only runs in local sessions.`
            : `${template.filename} is not run in the cloud in this version; it runs on this machine instead.`;
        else if (template.event !== site.event)
          notice = `${template.filename} is configured on ${site.event}; the cloud runs it only on ${template.event}, so it runs on this machine instead.`;
        else if (label === "legacy" && !ctx.opts.allowLegacyTemplateDigests)
          notice = `${template.filename} is an older copy of ${template.id}; the cloud will not run it. Update it.`;
        else if (
          hook.args !== undefined ||
          hook.if ||
          hook.async ||
          hook.asyncRewake ||
          hook.once ||
          !isSimpleScriptCommand(hook.command, reach.interpreter)
        )
          notice = `${template.filename} is run in a way the cloud cannot reproduce (arguments, a condition, async or once), so it runs on this machine instead.`;
        else if (
          site.matcher !== undefined &&
          !isWildcardMatcher(site.matcher) &&
          (!isShortSingleLine(site.matcher) || !MATCHER_NAME_RE.test(site.matcher))
        )
          notice = undefined;
        else if (!isMatcherSubset(site.matcher, template.matcher))
          notice = `${template.filename} is configured with the matcher "${sanitizeDisplayText(
            site.matcher ?? "",
            {
              maxCodeUnits: 200,
            },
          )}" and the cloud runs it on "${template.matcher}", so it runs on this machine instead.`;
        else {
          let timeout = clampHookTimeout(hook.timeout);
          templateEntry = {
            entry: {
              wire: {
                template: template.id,
                digest: reach.pinnedTarget.sha256,
                event: site.event,
                ...(!isWildcardMatcher(site.matcher) && {
                  matcher: site.matcher,
                }),
                ...(timeout !== undefined && {
                  timeout_s: timeout,
                }),
              },
              local: {
                templateId: template.id,
                label,
                scriptRealPath: reach.pinnedTarget.realPath,
                bytes: reach.bytes,
                userMatcher: site.matcher,
                source: site.source.source,
              },
            },
            ...(label === "legacy" && {
              legacyNotice: `${template.filename} is an older copy of ${template.id}; the cloud will run that copy. Update it to get fixes.`,
            }),
            ...(site.matcher !== undefined &&
              !isWildcardMatcher(site.matcher) &&
              !isMatcherSubset(template.matcher, site.matcher) && {
                narrowNotice: `${template.filename} is configured with the matcher "${sanitizeDisplayText(
                  site.matcher,
                  {
                    maxCodeUnits: 200,
                  },
                )}"; in the cloud it runs on "${template.matcher}" only.`,
              }),
          };
        }
        if (templateEntry === undefined && isAfterEdit && isEnabledTemplate)
          notice = `${(notice ?? `${template.filename} cannot move to the cloud here.`).replace(/(?:, so|; it) (?:it )?runs on this machine instead\.$/, ".").replace(/\.$/, "")}, and as an after-edit hook it is not forwarded either: it runs in local sessions only.`;
      }
    }
  }
  if (templateEntry !== undefined) {
    let joined = [templateEntry.legacyNotice, templateEntry.narrowNotice]
      .filter((notice) => notice !== undefined)
      .join(" ");
    return {
      kind: "template",
      entry: templateEntry.entry,
      event: site.event,
      hook,
      ...(joined !== "" && {
        notice: joined,
      }),
    };
  }
  if (isAfterEdit)
    return {
      kind: "held",
      reason: "after_edit",
      ...(notice !== undefined && {
        notice,
      }),
    };
  if (heldResult !== undefined) return heldResult;
  if (site.matcher !== undefined && !isShortSingleLine(site.matcher))
    return {
      kind: "held",
      reason: "over_cap",
    };
  if (site.matcher !== undefined && !isWildcardMatcher(site.matcher) && !MATCHER_NAME_RE.test(site.matcher))
    return {
      kind: "held",
      reason: "pattern_matcher",
      notice: `"${hookContentLabel(hook)}" does not run for cloud work: cloud sessions cannot take the pattern matcher "${sanitizeDisplayText(
        site.matcher,
        {
          maxCodeUnits: 200,
        },
      )}".${isPluginOnly ? "" : ` List the names to match${TOOL_HOOK_EVENTS.has(site.event) ? `, such as ${BASH_TOOL_NAME}|${READ}` : ""}.`}`,
    };
  if (holdResult !== undefined) return holdResult;
  if (hook.type === "command" && !isPinned) {
    if (!isCloudDevice)
      return {
        kind: "held",
        reason: "unpinned_command",
        notice: isShellPrefix
          ? `${label}: it would run through your CLAUDE_CODE_SHELL_PREFIX, which this machine cannot verify.${site.source.source === "user" ? ' Marked "cloud": "device", it runs on this machine, unverified, when the cloud session asks.' : ""}${pluginNote}`
          : isPrivateDotDir
            ? `${label}: its script is in a dot-folder this machine does not read hooks from.${remedy}${pluginNote}`
            : `${label}: this machine cannot verify what the command runs.${hooksFolderInReach || isUnsupportedPlatform || isPluginOnly ? "" : " Put the command in one script in ~/.claude/hooks."}${pluginNote}`,
        ...(isShellPrefix
          ? {
              cause: "shell_prefix",
            }
          : isPrivateDotDir && {
              cause: "dot_folder",
            }),
        ...((hooksFolderInReach || isUnsupportedPlatform) && {
          noRemedy: true,
        }),
      };
    authorOptIn = true;
  }
  return {
    kind: "forward",
    event: site.event,
    hook,
    ...(pinnedTarget !== undefined && {
      pinnedTarget,
    }),
    ...(authorOptIn && {
      authorOptIn: true,
    }),
    ...(isCloudDevice && {
      cloudDevice: true,
    }),
    ...(templateTwinId !== undefined && {
      templateTwinId,
    }),
    ...(notice !== undefined && {
      notice,
    }),
  };
}
//@ chunk-4z1ntdgk.js:134599-134662 placement
function isShortSingleLine(matcher) {
  return matcher.length <= MAX_FORWARDED_HOOKS && !/[\p{Cc}\p{Cf}]/u.test(matcher);
}
//@ chunk-4z1ntdgk.js:134662-134744 placement
function duplicateHookText(templateId) {
  return `${templateId} is configured more than once; the cloud runs it once.`;
}
//@ chunk-4z1ntdgk.js:134744-134883 placement
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
//@ chunk-4z1ntdgk.js:134883-140679 placement
/**
 * 收集本机所有钩子的证明信息（可转发/被扣留的原因），供远程会话使用。
 */
async function collectDeviceHookAttestations(captured, opts, deps) {
  let deviceHookAttestations = createDeviceHookAttestations();
  if (captured.kind === "none") return deviceHookAttestations;
  let roots = {
    launchDirReal: await realpathOrSelf(deps, opts.launchDir),
    projectDirReal: await realpathOrSelf(deps, opts.projectDir),
    configHomeReal: await realpathOrSelf(deps, opts.configHome),
    extraReach: normalizeCaseForComparison_2(
      (
        await Promise.all(
          [...(opts.repoRoot !== undefined ? [opts.repoRoot] : []), ...(opts.extraReachRoots ?? [])].map(
            async (root) => {
              let foreignSpelling = await resolveForeignSpellingAsync(
                await classifyPathSpelling_3(root, opts.launchDir),
                opts.launchDir,
                protectedHomeRoots(),
              );
              return foreignSpelling.verdict === "local"
                ? [root, await realpathOrSelf(deps, foreignSpelling.spelling)]
                : foreignSpelling.verdict === "foreign"
                  ? [foreignSpelling.spelling]
                  : [root, ...spellingsToCheck(foreignSpelling, opts.launchDir)];
            },
          ),
        )
      ).flat(),
    ),
  };
  let reach = {
    launchDir: opts.launchDir,
    launchDirReal: roots.launchDirReal,
    configHomeReal: roots.configHomeReal,
    projectDir: opts.projectDir,
    projectDirReal: roots.projectDirReal,
    ...(opts.sync !== undefined && {
      sync: opts.sync,
    }),
    extraReach: roots.extraReach,
  };
  let ctx = {
    opts,
    deps,
    roots,
    reach,
    resolved: new Map(),
    hooksFolderInReach: pathWithinReach([posix.join(deps.home, ".claude", "hooks")], reach),
  };
  let recordHeld = (site, reason, { cause, noRemedy } = {}) => {
    deviceHookAttestations.held.push({
      event: site.event,
      ...(site.matcher !== undefined && {
        matcher: sanitizeDisplayText(site.matcher, {
          maxCodeUnits: 200,
        }),
      }),
      source: site.source.source,
      command: hookContentLabel(site.hook),
      reason,
      ...(cause !== undefined && {
        cause,
      }),
      ...((noRemedy ||
        filterManagedDisabledPlugins(site.source.source) ||
        (reason === "after_edit" && !opts.inRepository)) && {
        noRemedy: true,
      }),
    });
    if (reason === "after_edit") deviceHookAttestations.heldCounts.after_edit += 1;
    else if (reason === "kind_unsupported") deviceHookAttestations.heldCounts.kind_unsupported += 1;
    else deviceHookAttestations.heldCounts.other += 1;
  };
  let seenNotices = new Set();
  let addNotice = (notice) => {
    if (notice !== undefined && !seenNotices.has(notice)) {
      seenNotices.add(notice);
      deviceHookAttestations.notices.push(notice);
    }
  };
  let removeNotice = (notice) => {
    if (seenNotices.delete(notice))
      deviceHookAttestations.notices = deviceHookAttestations.notices.filter(
        (notice_2) => notice_2 !== notice,
      );
  };
  let perEventCounts = new Map();
  let forwardedByKey = new Map();
  let templateByKey = new Map();
  let skippedForwardIndexes = new Set();
  let skippedTemplateIndexes = new Set();
  let templateSites = new Map();
  if (
    [
      opts.launchDir,
      opts.configHome,
      opts.sync?.rootReal,
      opts.sync?.root,
      ...(opts.extraReachRoots ?? []),
    ].some((root) => root !== undefined && !isAbsolutePlatformPath(root))
  ) {
    addNotice(
      "Hooks stay on this machine: its launch, config or sync directory is not an absolute path this version can place, so none are offered to the cloud session.",
    );
    for (let source of captured.sources)
      for (let site of flattenHookEntries(source)) recordHeld(site, "unverifiable_target");
    return deviceHookAttestations;
  }
  for (let source of captured.sources) {
    let sourceProblem = await checkHookSourceReach(source, ctx);
    let sites = flattenHookEntries(source);
    if (sourceProblem !== null && sites.length > 0)
      addNotice(
        `Hooks from ${sanitizeDisplayText(source.settingsFile ?? "", {
          maxCodeUnits: 200,
        })} are not offered to the cloud session: ${sourceProblem.cause}.`,
      );
    for (let site of sites) {
      let decision = await decideDeviceHook(site, ctx, sourceProblem !== null);
      if (sourceProblem !== null) {
        recordHeld(
          site,
          decision.kind === "held" &&
            (decision.reason.startsWith("event_") ||
              decision.reason === "kind_unsupported" ||
              decision.reason === "after_edit")
            ? decision.reason
            : sourceProblem.reason,
          {
            noRemedy: true,
          },
        );
        continue;
      }
      if (decision.kind === "held") {
        addNotice(decision.notice);
        recordHeld(site, decision.reason, decision);
        continue;
      }
      let current = decision;
      if (current.kind === "template") {
        let { entry } = current;
        let hookKey = deviceHookKey(site, current.hook, deps.defaultShell);
        let existingTemplate = templateSites.get(entry.local.templateId);
        let existingForward = forwardedByKey.get(hookKey);
        let sameMatcher =
          existingTemplate !== undefined && (existingTemplate.site.matcher ?? "") === (site.matcher ?? "");
        let withinCapacity =
          existingTemplate !== undefined
            ? sameMatcher
            : deviceHookAttestations.templates.length < MAX_DEVICE_HOOK_TEMPLATES;
        if (existingForward !== undefined && withinCapacity) {
          recordHeld(existingForward.site, "duplicate");
          skippedForwardIndexes.add(existingForward.index);
          if (existingForward.notice !== undefined) removeNotice(existingForward.notice);
          forwardedByKey.delete(hookKey);
        }
        if (existingTemplate !== undefined && !sameMatcher) {
          current = await decideDeviceHook(site, ctx, false, true);
          if (current.kind === "held") {
            recordHeld(site, current.reason, current);
            addNotice(current.notice);
            continue;
          }
        } else if (existingTemplate !== undefined) {
          recordHeld(existingTemplate.site, "duplicate");
          let existingKey = deviceHookKey(existingTemplate.site, existingTemplate.hook, deps.defaultShell);
          if (existingKey !== hookKey) templateByKey.delete(existingKey);
          templateByKey.set(hookKey, {
            index: existingTemplate.index,
            templateId: entry.local.templateId,
          });
          deviceHookAttestations.templates[existingTemplate.index] = entry;
          if (existingTemplate.notice !== undefined) removeNotice(existingTemplate.notice);
          templateSites.set(entry.local.templateId, {
            index: existingTemplate.index,
            site,
            hook: current.hook,
            ...(current.notice !== undefined && {
              notice: current.notice,
            }),
          });
          addNotice(duplicateHookText(entry.local.templateId));
          addNotice(current.notice);
          continue;
        } else if (deviceHookAttestations.templates.length >= MAX_DEVICE_HOOK_TEMPLATES) {
          recordHeld(site, "over_cap");
          addNotice(
            `Only ${MAX_DEVICE_HOOK_TEMPLATES} templates can run in the cloud session; the rest stay on this machine.`,
          );
          continue;
        } else {
          templateSites.set(entry.local.templateId, {
            index: deviceHookAttestations.templates.length,
            site,
            hook: current.hook,
            ...(current.notice !== undefined && {
              notice: current.notice,
            }),
          });
          templateByKey.set(hookKey, {
            index: deviceHookAttestations.templates.length,
            templateId: entry.local.templateId,
          });
          deviceHookAttestations.templates.push(entry);
          addNotice(current.notice);
          continue;
        }
      }
      if (current.kind !== "forward") continue;
      let forward = current;
      let hookTimeout = clampHookTimeout(forward.hook.timeout);
      let candidate = {
        wire: {
          id: "",
          event: site.event,
          ...(!isWildcardMatcher(site.matcher) && {
            matcher: site.matcher,
          }),
          kind: forward.hook.type,
          ...(hookTimeout !== undefined && {
            timeout_s: hookTimeout,
          }),
          source: source.source,
          ...(forward.hook.if && {
            has_condition: true,
          }),
          ...(forward.pinnedTarget !== undefined && {
            target_pinned: true,
          }),
          ...((forward.authorOptIn || (forward.cloudDevice && forward.hook.type === "command")) && {
            author_opt_in: true,
          }),
        },
        local: {
          hook: forward.hook,
          matcher: site.matcher,
          event: forward.event,
          source: source.source,
          ...(forward.pinnedTarget !== undefined && {
            pinnedTarget: forward.pinnedTarget,
          }),
          ...(forward.cloudDevice && {
            cloudOptIn: true,
          }),
          ...(forward.templateTwinId !== undefined && {
            templateTwinId: forward.templateTwinId,
          }),
        },
      };
      let hookKey = deviceHookKey(site, forward.hook, deps.defaultShell);
      let templateTwin = templateByKey.get(hookKey);
      let eventHasRoom = (perEventCounts.get(site.event) ?? 0) < MAX_FORWARDED_HOOKS_PER_EVENT;
      let hasRoom =
        forwardedByKey.has(hookKey) ||
        (deviceHookAttestations.forwarded.length < MAX_FORWARDED_HOOKS_2 && eventHasRoom);
      if (templateTwin !== undefined && hasRoom) {
        let templateSite = templateSites.get(templateTwin.templateId);
        if (templateSite !== undefined && templateSite.index === templateTwin.index) {
          recordHeld(templateSite.site, "duplicate");
          if (templateSite.notice !== undefined) removeNotice(templateSite.notice);
          removeNotice(duplicateHookText(templateTwin.templateId));
          templateSites.delete(templateTwin.templateId);
        }
        skippedTemplateIndexes.add(templateTwin.index);
        templateByKey.delete(hookKey);
      }
      let existing = forwardedByKey.get(hookKey);
      if (existing !== undefined) {
        recordHeld(existing.site, "duplicate");
        let id = deviceHookAttestations.forwarded[existing.index].wire.id;
        deviceHookAttestations.forwarded[existing.index] = {
          ...candidate,
          wire: {
            ...candidate.wire,
            id,
          },
        };
        if (existing.notice !== undefined) removeNotice(existing.notice);
        forwardedByKey.set(hookKey, {
          index: existing.index,
          site,
          ...(forward.notice !== undefined && {
            notice: forward.notice,
          }),
        });
        addNotice(forward.notice);
        continue;
      }
      if (deviceHookAttestations.forwarded.length >= MAX_FORWARDED_HOOKS_2) {
        recordHeld(site, "over_cap");
        addNotice(
          `Only the first ${MAX_FORWARDED_HOOKS_2} hooks are offered to the cloud session; the rest stay on this machine.`,
        );
        continue;
      }
      if (!eventHasRoom) {
        recordHeld(site, "over_cap");
        addNotice(
          `Only the first ${MAX_FORWARDED_HOOKS_PER_EVENT} ${site.event} hooks are offered to the cloud session; the rest stay on this machine.`,
        );
        continue;
      }
      let eventIndex = perEventCounts.get(site.event) ?? 0;
      perEventCounts.set(site.event, eventIndex + 1);
      forwardedByKey.set(hookKey, {
        index: deviceHookAttestations.forwarded.length,
        site,
        ...(forward.notice !== undefined && {
          notice: forward.notice,
        }),
      });
      addNotice(forward.notice);
      deviceHookAttestations.forwarded.push({
        ...candidate,
        wire: {
          ...candidate.wire,
          id: formatDeviceHookId(opts.instanceId, site.event, eventIndex),
        },
      });
    }
  }
  deviceHookAttestations.forwarded = deviceHookAttestations.forwarded.filter(
    (entry, index) => !skippedForwardIndexes.has(index),
  );
  deviceHookAttestations.templates = deviceHookAttestations.templates.filter(
    (template, entry) => !skippedTemplateIndexes.has(entry),
  );
  let templateIdsByKey = new Map(
    deviceHookAttestations.templates.map((template) => [
      `${template.wire.template}\x00${template.wire.event}`,
      template.wire.template,
    ]),
  );
  deviceHookAttestations.forwarded = deviceHookAttestations.forwarded.filter((entry) => {
    let templateTwinId = entry.local.templateTwinId;
    let twinTemplateId =
      templateTwinId === undefined
        ? undefined
        : templateIdsByKey.get(`${templateTwinId}\x00${entry.wire.event}`);
    if (
      templateTwinId === undefined ||
      twinTemplateId === undefined ||
      !isMatcherSubset(getHookTemplate(templateTwinId)?.matcher ?? "", entry.local.matcher ?? "*")
    )
      return true;
    deviceHookAttestations.held.push({
      event: entry.wire.event,
      ...(entry.local.matcher !== undefined && {
        matcher: sanitizeDisplayText(entry.local.matcher, {
          maxCodeUnits: 200,
        }),
      }),
      source: entry.local.source,
      command: hookContentLabel(entry.local.hook),
      reason: "duplicate",
    });
    deviceHookAttestations.heldCounts.other += 1;
    addNotice(
      `"${hookContentLabel(entry.local.hook)}" is the same script the cloud already runs as ${twinTemplateId}; it is not also run on this machine.`,
    );
    return false;
  });
  return deviceHookAttestations;
}
//@ chunk-4z1ntdgk.js:140679-140764 placement
function attestationFor(site) {
  let attestation = attestationFor_2(site);
  return attestation === undefined
    ? undefined
    : {
        attestation,
        heldBack: isBelowFloorEnforced(attestation),
      };
}
//@ chunk-4z1ntdgk.js:140764-141017 placement
function heldHooksNotice(report) {
  let count = report.forwarded + report.templateNames.length;
  return `${count === 1 ? "One of your hooks" : `${count} of your hooks`} could run for cloud sessions started from this machine \u2014 run /hooks to decide (nothing from this machine runs for them until you do).`;
}
//@ chunk-4z1ntdgk.js:141017-141083 placement
function shellPrefixOf(env) {
  return env.CLAUDE_CODE_SHELL_PREFIX?.trim() || undefined;
}
//@ chunk-4z1ntdgk.js:141083-141096 placement
var LOCATE_RETRY_DELAY_MS = 30000;
//@ chunk-4z1ntdgk.js:141096-141457 placement
function resolveConfigFile(
  globalClaudeFile,
  env,
  locateFile = async (path) => ({
    real: await realpath(path),
    aliased: await isSuspiciousHardLinkedFile(path),
  }),
) {
  let state = {
    path: globalClaudeFile,
    real: null,
    env:
      env === undefined
        ? undefined
        : {
            ...env,
          },
    locate: () => {
      state.retryAt = undefined;
      locateFile(globalClaudeFile).then(
        ({ real, aliased }) => {
          state.real = aliased ? "unresolvable" : real;
          if (aliased) state.retryAt = Date.now() + LOCATE_RETRY_DELAY_MS;
        },
        (error) => {
          state.real = "unresolvable";
          if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR")
            state.retryAt = Date.now() + LOCATE_RETRY_DELAY_MS;
        },
      );
    },
  };
  state.locate();
  return state;
}
//@ chunk-4z1ntdgk.js:141457-141534 placement
function retryLocateIfDue(legacyConfigFile, now = Date.now()) {
  if (legacyConfigFile.retryAt !== undefined && now >= legacyConfigFile.retryAt) legacyConfigFile.locate?.();
}
//@ chunk-4z1ntdgk.js:141534-141641 placement
function legacyConfigFileOf(memory) {
  memory.legacyConfigFile ??= resolveConfigFile(
    getGlobalClaudeFile(),
    legacyPinOr(memory, getAppliedGlobalConfigEnv()),
  );
  retryLocateIfDue(memory.legacyConfigFile);
  return memory.legacyConfigFile;
}
//@ chunk-4z1ntdgk.js:141641-142020 placement
function settingsEnvInReach(sender, configFile, envOf = (source) => getSettingsForSource(source)?.env) {
  let isOwnScope = (source) =>
    sender.pinnedScopes.has(source) ||
    (source === "userSettings" && sender.everInReach.has("user")) ||
    (source === "flagSettings" && sender.everInReach.has("flag"));
  let useItsOwnEnv =
    configFile.env !== undefined &&
    typeof configFile.real === "string" &&
    configFile.real !== "unresolvable" &&
    isAbsolute(configFile.path) &&
    !anyPairMatches([configFile.path, configFile.real], [...sender.stickyRoots]);
  return Object.assign(
    {},
    useItsOwnEnv ? configFile.env : {},
    ...SETTING_SOURCES.filter((source) => !REPO_DIR_SETTING_SOURCES.has(source) && !isOwnScope(source)).map(
      (source) => settingsEnvForHookChild(envOf(source), source),
    ),
  );
}
//@ chunk-4z1ntdgk.js:142020-142051 placement
function projectConfigRootOr(launchDir) {
  return getProjectConfigRoot() ?? launchDir;
}
//@ chunk-4z1ntdgk.js:142051-142136 placement
function unrefTimeout(callback, delayMs) {
  let timer = setTimeout(callback, delayMs);
  timer.unref();
  return {
    clear: () => clearTimeout(timer),
  };
}
//@ chunk-4z1ntdgk.js:142136-142405 placement
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
//@ chunk-4z1ntdgk.js:142405-143263 placement
function createForwardedHookHandler(ctx) {
  let state = null;
  let disposed = false;
  let stopCallbacks = new Set();
  return {
    state: () => state,
    setState(next) {
      state = disposed ? null : next;
    },
    async handleForwardedHook(request) {
      if (disposed) return;
      try {
        let served = await ctx.servicer.serve(request, state);
        if (disposed) return;
        if (served.kind === "silent") {
          if (served.reason === "not_mine" || served.reason === "no_state" || served.reason === "withdrawn")
            ctx.release(request.requestId);
          return;
        }
        ctx.respond(request.requestId, served.answer);
      } catch (error) {
        ctx.logError(error);
        if (parseDeviceHookId(request.callbackId)?.event === "PreToolUse" && !disposed)
          try {
            ctx.respond(request.requestId, {
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
    handleCancelled(requestId, origin) {
      if (disposed || !ctx.servicer.cancel(requestId, origin) || origin !== "worker") return;
      for (let stopCallback of stopCallbacks) stopCallback();
    },
    onStoppedWhileRunning(stopCallback) {
      stopCallbacks.add(stopCallback);
      return () => stopCallbacks.delete(stopCallback);
    },
    async dispose() {
      disposed = true;
      state = null;
      stopCallbacks.clear();
      ctx.servicer.cancelAll();
      await ctx.staging.dispose();
    },
  };
}
export {
  commandReachRoots,
  TENGU_FEDERATED_HEARTH,
  TENGU_COMPOSED_KITE,
  projectConfigRootOr,
  legacyConfigFileOf,
  settingsEnvInReach,
  unrefTimeout,
  attestationFor,
  shellPrefixOf,
  createForwardedHookHandler,
  collectDeviceHookAttestations,
  heldHooksNotice,
  isHookForwardingEnabled,
};
