/**
 * tools/REPLTool/globals.ts
 *
 * VM 全局装配：console/self/工具包装/定时器/atob 等（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (4)
 * attribution: placement 4
 */
import { isAbsolute, resolve, sep } from "path";
import { pushConsoleLine, tailConsoleLines, STACK_LINES_MAX, SOURCE_CONTEXT_CHARS } from "./consoleRing.js";
import { isCodeModeExperimentEnabled } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { defineGlobal, isVmContextPoisoned, VMContextPoisonedError, ownValue } from "./vmHardening.js";
import { neverSettles, awaitUnlessCancelled, callToolWithCap } from "./callState.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { runInVm } from "./vmContext.js";
import { beginTurn } from "./stepBudget.js";
import {
  loadBundledShellText,
  normalizeShellResult,
  summarizeTruncation,
  truncationNotice,
  OUTPUT,
} from "./shellResult.js";
import { isBashAvailable } from "../../utils/shell/shellToolUtils.js";
import { getCwd } from "../../utils/cwd.js";
import { getPlatform } from "../../utils/platform.js";
import { spawnEnvKeysForSession, sessionEnvVarNameSet } from "../../utils/shell/shellEnvSnapshot.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { quotePowerShellSingleQuoted } from "../../utils/powershell/quoting.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../PowerShellTool/toolName.js";
import { FILE_NOT_READ_ERROR, EDIT } from "../FileEditTool/constants.js";
import { localizeEditError, countOccurrences } from "./sessionHelpers.js";
import { REPL_RESOURCE_0, RESOURCE_0_ALIAS } from "./preludes.js";
import {
  unclearedReportText,
  validateContextName,
  MAX_INITIAL_PROMPT_CHARS,
  MAX_TAIL_LINES,
  DEFAULT_TAIL_LINES,
  MAX_LOG_TEXT_CHARS,
  TEAM_PRELUDE_TEXT,
} from "./contexts.js";
import { AGENT, FORK } from "../AgentTool/constants.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { redactAndTruncate } from "../../services/teamMemorySync/secretScanner.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { MAIN } from "../../utils/sessionPeers.js";
import { SENDMESSAGE } from "../SendMessageTool/constants.js";
import { isAccepted } from "../../utils/codeMode/accepted.js";
import { filterRenameableTools } from "./toolWrappers.js";

//@ chunk-n51jggtb.js:143707-145738 placement
/**
 * 装配 VM 全局：console/self/log、工具包装、searchTools/describeTool、定时器与 atob/btoa。
 */
function installScriptGlobals(context, selfRef, realm, state, toolNames, ids, limits, sandbox, scriptResult) {
  let logFn = realm.fn((...args) => state().console.log(...args));
  let ring = limits.ring;
  let ringLogFn = realm.fn((...args) => {
    let callState = state();
    callState.ringLines++;
    pushConsoleLine(ring, callState.console.format(args));
  });
  let consoleApi = isCodeModeExperimentEnabled()
    ? {
        __proto__: null,
        log: ringLogFn,
        info: ringLogFn,
        debug: ringLogFn,
        error: ringLogFn,
        warn: ringLogFn,
        tail: realm.fn((count) =>
          tailConsoleLines(ring, typeof count === "number" && count > 0 ? count : STACK_LINES_MAX),
        ),
        buffer: realm.fn(() =>
          ring.lines.join(`
`),
        ),
        dropped: realm.fn(() => ring.dropped),
      }
    : {
        __proto__: null,
        log: logFn,
        info: realm.fn((...args) => state().console.info(...args)),
        debug: realm.fn((...args) => state().console.debug(...args)),
        error: realm.fn((...args) => state().console.error(...args)),
        warn: realm.fn((...args) => state().console.warn(...args)),
      };
  defineGlobal(context, "console", consoleApi);
  defineGlobal(context, "log", logFn);
  defineGlobal(context, "self", selfRef);
  for (let toolName of toolNames)
    defineGlobal(
      context,
      toolName,
      realm.asyncData((input) => {
        let callState = state();
        if (callState.cancelled) return neverSettles();
        return awaitUnlessCancelled(
          callState,
          callToolWithCap(callState, sandbox, scriptResult, toolName, () => {
            let wrapper = callState.toolWrappers[toolName];
            if (wrapper === undefined)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `${toolName} is not available in this REPL call`,
                "REPL tool not available in this call",
              );
            return wrapper(input);
          }),
        );
      }),
    );
  defineGlobal(
    context,
    "searchTools",
    realm.asyncDataN((query, max) => {
      let callState = state();
      if (callState.cancelled) return neverSettles();
      return awaitUnlessCancelled(
        callState,
        callToolWithCap(callState, sandbox, scriptResult, "searchTools", () =>
          callState.discovery.searchTools(query, max),
        ),
      );
    }),
  );
  defineGlobal(
    context,
    "describeTool",
    realm.asyncDataN((name) => {
      let callState = state();
      if (callState.cancelled) return neverSettles();
      return awaitUnlessCancelled(
        callState,
        callToolWithCap(callState, sandbox, scriptResult, "describeTool", () =>
          callState.discovery.describeTool(name),
        ),
      );
    }),
  );
  let invokeSafely = runInVm(
    '(f) => { try { if (typeof f === "function") f() } catch {} }',
    context,
    realm.rejectImport,
  );
  let armTimer = (fn, ms, repeating) => {
    let callState = state();
    if (typeof fn !== "function" || callState.ended) return 0;
    let timerId = callState.outside ? ids.nextOutsideId++ : ids.nextId++;
    let delayMs = typeof ms === "number" ? ms : undefined;
    let fire = () => {
      if (!repeating) {
        callState.timers.delete(timerId);
        ids.armed.delete(timerId);
      }
      beginTurn(sandbox, callState);
      invokeSafely(fn);
    };
    let clear = repeating
      ? clearInterval.bind(undefined, setInterval(fire, delayMs))
      : clearTimeout.bind(undefined, setTimeout(fire, delayMs));
    callState.timers.add(timerId);
    ids.armed.set(timerId, {
      owner: callState,
      clear,
    });
    return timerId;
  };
  let clearTimer = (id) => {
    let armed = typeof id === "number" ? ids.armed.get(id) : undefined;
    if (armed === undefined) return;
    armed.clear();
    armed.owner.timers.delete(Number(id));
    ids.armed.delete(Number(id));
  };
  defineGlobal(
    context,
    "setTimeout",
    realm.fn((fn, ms) => armTimer(fn, ms, false)),
  );
  defineGlobal(context, "clearTimeout", realm.fn(clearTimer));
  defineGlobal(
    context,
    "setInterval",
    realm.fn((fn, ms) => armTimer(fn, ms, true)),
  );
  defineGlobal(context, "clearInterval", realm.fn(clearTimer));
  defineGlobal(
    context,
    "atob",
    realm.fn((value) => atob(realm.toStr(value))),
  );
  defineGlobal(
    context,
    "btoa",
    realm.fn((value) => btoa(realm.toStr(value))),
  );
  let globalsSource = loadBundledShellText();
  try {
    installShellAndHelpers(context, realm, limits, state, sandbox, globalsSource);
  } catch (error) {
    if (isVmContextPoisoned(error)) throw error;
    throw new VMContextPoisonedError("(script globals)");
  }
}
//@ chunk-n51jggtb.js:145738-145763 placement
/**
 * Read/Write 的名字常量。
 */
var READ = "Read";
var WRITE = "Write";
//@ chunk-n51jggtb.js:145763-152993 placement
/**
 * VM 内的 shell/文件/上下文全局实现：$、read、write、edit、sleep、spawnContext 等。
 */
function installShellAndHelpers(context, realm, session, state, prelude, shellSource) {
  function resolvePath(path) {
    let text = realm.toStr(path);
    return isAbsolute(text) ? text : resolve(state().cwd, text);
  }
  function callTool(toolName, input) {
    let fn = ownValue(context, toolName);
    if (typeof fn !== "function" || !realm.isSealedAsync(fn))
      realm.throwVM(`${toolName} tool is not available in this REPL context`);
    return fn(input);
  }
  function asObject(value) {
    return value !== null && typeof value === "object" ? value : {};
  }
  let shell = isBashAvailable() ? "bash" : "powershell";
  let isBash = shell === "bash";
  let partials = new Map();
  async function runShell(command, timeout, directory, wantsWhole, command_2) {
    let { cwd, envVars } = state();
    let directoryChanged = cwd !== getCwd();
    let directoryText = directory === undefined ? undefined : realm.toStr(directory);
    let isWindows = getPlatform() === "windows";
    let absoluteDirectory = directoryText !== undefined && isAbsolute(directoryText);
    let separatorRe = isWindows ? /[\\/]/ : /\//;
    let isUnaffectedByCdpath = (part) =>
      (isWindows && /^[\\/]|^[A-Za-z]:(?![\\/])/.test(part)) ||
      /^[-+]/.test(part) ||
      (!absoluteDirectory &&
        !/^\.\.?([\\/]|$)/.test(part) &&
        spawnEnvKeysForSession(envVars && sessionEnvVarNameSet(envVars))?.has("CDPATH") !== false) ||
      (!directoryChanged &&
        !absoluteDirectory &&
        part.split(separatorRe).includes("..") &&
        cwd === getOriginalCwd() &&
        env.PWD !== undefined &&
        isAbsolute(env.PWD) &&
        env.PWD !== cwd);
    let entries = [];
    if (directoryChanged)
      entries.push({
        logical: [cwd],
        named: `the directory the REPL call started in, ${cwd},`,
        hint: "; a new REPL call starts in the session's current directory",
      });
    if (directoryText !== undefined && isBash && !isUnaffectedByCdpath(directoryText)) {
      let logicalPaths = [];
      let fitsLimit = directoryText.length <= 4096;
      if (fitsLimit) {
        let parts = directoryText.split(separatorRe);
        let accumulated = "";
        for (let index = 0; index < parts.length; index++) {
          if (parts[index] === "..")
            logicalPaths.push(resolve(cwd, accumulated || (absoluteDirectory ? sep : "")));
          accumulated = index === 0 ? (parts[0] ?? "") : accumulated + sep + parts[index];
        }
      }
      let physicalPath = absoluteDirectory ? directoryText : cwd + sep + directoryText;
      logicalPaths.push(fitsLimit ? resolve(cwd, directoryText) : physicalPath);
      entries.push({
        logical: logicalPaths,
        ...(!absoluteDirectory &&
          !isWindows && {
            physical: physicalPath,
          }),
        named: fitsLimit
          ? physicalPath
          : `a ${directoryText.length}-character spelling (${directoryText.slice(0, 24)}...)`,
      });
    }
    let hostPrefix = !directoryChanged
      ? ""
      : isBash
        ? `cd ${shellQuote(cwd)} && `
        : `Set-Location -LiteralPath ${quotePowerShellSingleQuoted(cwd, "the REPL working directory")}; `;
    let { shellDirectorySlot: slot } = state();
    slot.pending = entries;
    let directoryPrefix = directoryText === undefined ? "" : `cd ${shellQuote(directoryText)} && `;
    let facts = {
      wantsWhole,
      ...(hostPrefix !== "" && {
        hostPrefix,
      }),
      ...(isBash &&
        hostPrefix + command !== command_2 &&
        command.startsWith(directoryPrefix) &&
        command.endsWith(command_2) && {
          prefixed: {
            sent: hostPrefix + command,
            exports: command.slice(directoryPrefix.length, command.length - command_2.length),
            written: command_2,
            directory: directoryText === undefined ? cwd : resolve(cwd, directoryText),
          },
        }),
    };
    slot.facts = facts;
    let pendingResult;
    try {
      pendingResult = callTool(isBash ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME, {
        command: hostPrefix + command,
        ...(typeof timeout === "number" && {
          timeout,
        }),
      });
    } finally {
      slot.pending = undefined;
      slot.facts = undefined;
    }
    let rawResult = asObject(await pendingResult);
    let normalized = normalizeShellResult(
      rawResult,
      typeof timeout === "number" ? timeout : undefined,
      facts,
    );
    if (!normalized.truncated && (normalized.file === undefined || facts.readBack)) return normalized;
    let { whole } = facts;
    partials.set(partials.size + 1, summarizeTruncation(rawResult, normalized, facts, command_2));
    return {
      ...normalized,
      partialId: partials.size,
      ...(whole !== undefined && {
        wholeText: whole.text,
        wholeTextCapped: whole.capped,
      }),
    };
  }
  let warnedMap = new WeakMap();
  let warnedByState = realm.fn((id, reader, wholeWanted) => {
    if (typeof id !== "number") return;
    let record = partials.get(id);
    if (record === undefined) return;
    let callState = state();
    let seen = warnedMap.get(callState) ?? new Set();
    warnedMap.set(callState, seen);
    let warning = truncationNotice(
      record,
      reader === "lines" || reader === "json" ? reader : "text",
      wholeWanted === true,
    );
    let dedupeKey = `${id} ${truncationNotice(record, "text", wholeWanted === true)}`;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      callState.console.warn(warning);
    }
  });
  let shellHelper = realm.asyncDataN((command, timeout, directory, wholeWanted, rawCommand) =>
    runShell(
      realm.toStr(command),
      timeout,
      directory,
      wholeWanted === true,
      typeof rawCommand === "string" ? rawCommand : realm.toStr(command),
    ),
  );
  let shellHelpers = runInVm(shellSource, context, realm.rejectImport)(
    shellHelper,
    OUTPUT,
    shell,
    warnedByState,
  );
  defineGlobal(context, "$", shellHelpers.$);
  defineGlobal(context, "preview", shellHelpers.preview);
  let isFileNotReadError = (error) => typeof error === "string" && error.includes(FILE_NOT_READ_ERROR);
  let markRead = async (filePath) => {
    await callTool(READ, {
      file_path: filePath,
    });
  };
  let readHelper = realm.asyncDataN(async (path, offset, limit, probeOnly) => {
    let resolvedPath = resolvePath(path);
    let { readProbeSlot } = state();
    readProbeSlot.pending = probeOnly === true;
    let pending;
    try {
      pending = callTool(READ, {
        file_path: resolvedPath,
        ...(typeof offset === "number" && {
          offset,
        }),
        ...(typeof limit === "number" && {
          limit,
        }),
      });
    } finally {
      readProbeSlot.pending = false;
    }
    let result = asObject(await pending);
    if (typeof result.error === "string")
      return {
        error: `${resolvedPath}: ${result.error}`,
        missing: result.error.startsWith("File does not exist"),
      };
    let fileInfo = asObject(result.file);
    if (typeof fileInfo.content !== "string") {
      if (result.type === "notebook")
        return {
          present: true,
          error: `${resolvedPath}: not a text file: ${READ} parses a notebook into its cells. For the cells, (await tools.${READ}({file_path: path})).file.cells; for the raw JSON, await $\`cat \${path}\`.json()`,
        };
      return {
        error: `${resolvedPath}: not a text file`,
      };
    }
    return {
      ok: {
        content: fileInfo.content,
        totalLines: fileInfo.totalLines,
        startLine: fileInfo.startLine,
      },
    };
  });
  let writeHelper = realm.asyncDataN(async (path, content) => {
    let resolvedPath = resolvePath(path);
    let text = realm.toStr(content);
    let result = asObject(
      await callTool(WRITE, {
        file_path: resolvedPath,
        content: text,
      }),
    );
    if (isFileNotReadError(result.error)) {
      await markRead(resolvedPath);
      result = asObject(
        await callTool(WRITE, {
          file_path: resolvedPath,
          content: text,
        }),
      );
    }
    if (typeof result.error === "string")
      return {
        error: `write ${resolvedPath}: ${result.error}`,
      };
    return {
      ok: {
        bytes: Buffer.byteLength(text),
      },
    };
  });
  let editHelper = realm.asyncDataN(async (path, oldString, newString, all) => {
    let resolvedPath = resolvePath(path);
    let editInput = {
      file_path: resolvedPath,
      old_string: realm.toStr(oldString),
      new_string: realm.toStr(newString),
      replace_all: all === true,
    };
    let result = asObject(await callTool(EDIT, editInput));
    if (isFileNotReadError(result.error)) {
      await markRead(resolvedPath);
      result = asObject(await callTool(EDIT, editInput));
    }
    if (typeof result.error === "string")
      return {
        error: `edit ${resolvedPath}: ${localizeEditError(result.error)}`,
      };
    return {
      ok: {
        replacements:
          editInput.replace_all && typeof result.originalFile === "string"
            ? countOccurrences(result.originalFile, editInput.old_string)
            : 1,
      },
    };
  });
  let fileHelpers = runInVm(REPL_RESOURCE_0, context, realm.rejectImport)(
    readHelper,
    writeHelper,
    editHelper,
  );
  for (let name of ["edit", "write", "file", "sleep"]) defineGlobal(context, name, fileHelpers[name]);
  let requireContext = (name) => {
    let context = session.contexts.get(name);
    if (context === undefined) realm.throwVM(`no context named '${name}' in this session`);
    return context;
  };
  let contextState = (context) => {
    let { team: view } = state();
    let contextEntry = view.view(context.agentId);
    return {
      name: context.name,
      role: context.role,
      parent: "lead",
      status: contextEntry?.status ?? "released",
      lastText: contextEntry?.lastText ?? "",
      cost: contextEntry?.cost,
      ...(view.reportUncleared(context.agentId) && {
        unclearedReport: unclearedReportText(context.name, "state.lastText"),
      }),
    };
  };
  let checkResult = (result) => {
    let value = asObject(result);
    if (typeof value.error === "string") return value.error;
    return value.success === false && typeof value.message === "string" ? value.message : undefined;
  };
  let spawnContext = realm.asyncDataN(async (name, role, prompt, fork) => {
    let nameText = realm.toStr(name);
    let nameError = validateContextName(nameText, session.contexts);
    if (nameError !== undefined) realm.throwVM(`spawnContext: ${nameError}`);
    let roleText = realm.toStr(role);
    let promptText = realm.toStr(prompt);
    if (promptText.length === 0 || promptText.length > MAX_INITIAL_PROMPT_CHARS)
      realm.throwVM(`spawnContext: initialPrompt must be 1-${MAX_INITIAL_PROMPT_CHARS} chars`);
    let useFork = fork === true;
    let spawnAgent = async () => {
      let spawnResult = asObject(
        await callTool(AGENT, {
          description: truncateToLength(
            redactAndTruncate(roleText || nameText, SOURCE_CONTEXT_CHARS),
            SOURCE_CONTEXT_CHARS,
          ),
          prompt: promptText,
          name: nameText,
          ...(useFork && {
            subagent_type: FORK,
          }),
        }),
      );
      let refusal = checkResult(spawnResult);
      if (refusal !== undefined || typeof spawnResult.agentId !== "string")
        realm.throwVM(
          `spawnContext '${nameText}' refused \u2014 ${refusal ?? "the Agent tool returned no agent id"}`,
        );
      return spawnResult.agentId;
    };
    let callState = state();
    let agentId = await callState.hostWait(
      () =>
        callState.team.spawn(spawnAgent, {
          fork: useFork,
        }),
      true,
    );
    session.contexts.set(nameText, {
      name: nameText,
      role: roleText,
      agentId,
    });
    return {
      ok: {
        name: nameText,
        role: roleText,
      },
    };
  });
  let releaseContext = realm.asyncDataN(async (name) => {
    let context = requireContext(realm.toStr(name));
    let stopResult = await callTool(TASKSTOP, {
      task_id: context.agentId,
    });
    let refusal = checkResult(stopResult);
    if (refusal !== undefined) realm.throwVM(`releaseContext '${context.name}' refused \u2014 ${refusal}`);
    return {
      ok: {
        name: context.name,
      },
    };
  });
  let listContexts = realm.asyncDataN(async () => ({
    ok: [...session.contexts.values()].map((context) => {
      let { lastText, unclearedReport, ...rest } = contextState(context);
      return rest;
    }),
  }));
  let contextsGet = realm.fn((name) => {
    let nameText = realm.toStr(name);
    let context = session.contexts.get(nameText);
    if (context === undefined)
      return realm.clone({
        name: nameText,
        role: nameText === "lead" ? "lead" : undefined,
        parent: undefined,
        status: nameText === "lead" && state().team.role === "helper" ? "stepping" : "released",
        lastText: "",
        cost: undefined,
      });
    return realm.clone(contextState(context));
  });
  let contextsKeys = realm.fn(() => realm.clone([...session.contexts.keys()]));
  let result = realm.asyncDataN(async (name) => {
    let context = requireContext(realm.toStr(name));
    let callState = state();
    await callState.hostWait(() => callState.team.whenSettled(context.agentId));
    if (callState.team.reportUncleared(context.agentId))
      realm.throwVM(unclearedReportText(context.name, "result()"));
    let view = contextState(context);
    return {
      ok: {
        status: view.status,
        text: view.lastText,
        cost: view.cost,
      },
    };
  });
  let tail = realm.asyncDataN(async (name, count) => {
    let context = requireContext(realm.toStr(name));
    let lineCount =
      typeof count === "number" && Number.isInteger(count) && count > 0
        ? Math.min(count, MAX_TAIL_LINES)
        : DEFAULT_TAIL_LINES;
    let callState = state();
    if (callState.team.reportUncleared(context.agentId))
      realm.throwVM(unclearedReportText(context.name, "tail()"));
    try {
      return {
        ok: (await callState.team.tail(context.agentId, lineCount)).map((entry) => ({
          name: context.name,
          ...entry,
        })),
      };
    } finally {
      await callState.resumed();
    }
  });
  let log = realm.asyncDataN(async (name, text) => {
    let nameText = realm.toStr(name);
    let bodyText = realm.toStr(text);
    if (bodyText.length === 0 || bodyText.length > MAX_LOG_TEXT_CHARS)
      realm.throwVM(`contexts.${nameText}.log: text must be 1-${MAX_LOG_TEXT_CHARS} chars`);
    let target = nameText === "lead" ? MAIN : requireContext(nameText).agentId;
    let sent = await callTool(SENDMESSAGE, {
      to: target,
      message: bodyText,
    });
    let refusal = checkResult(sent);
    if (refusal !== undefined) realm.throwVM(`contexts.${nameText}.log was not delivered \u2014 ${refusal}`);
    return {
      ok: true,
    };
  });
  let contextsApi = runInVm(TEAM_PRELUDE_TEXT, context, realm.rejectImport)(
    spawnContext,
    releaseContext,
    listContexts,
    contextsGet,
    contextsKeys,
    result,
    tail,
    log,
  );
  if (!isAccepted()) {
    defineGlobal(context, "spawnContext", contextsApi.spawnContext);
    defineGlobal(context, "releaseContext", contextsApi.releaseContext);
    defineGlobal(context, "listContexts", contextsApi.listContexts);
    defineGlobal(context, "contexts", contextsApi.contexts);
  }
  let runningList = realm.fn(() => realm.clone(state().evals.list()));
  let abortEval = realm.fn((id) => (typeof id === "number" ? state().evals.abort(id) : "not an eval id"));
  let toolNames = realm.fn(() => realm.clone(filterRenameableTools(Object.keys(state().toolWrappers))));
  let runningApi = runInVm(RESOURCE_0_ALIAS, context, realm.rejectImport)(runningList, abortEval, toolNames);
  defineGlobal(context, "running", runningApi.running);
  defineGlobal(context, "tools", runningApi.tools);
}
//@ chunk-n51jggtb.js:152993-153047 placement (2.1.88 match: shellQuote, 1)
/**
 * 单引号 shell 转义。
 */
function shellQuote(s) {
  return `'${s.replaceAll("'", "'\\''")}'`;
}
export { installScriptGlobals };
