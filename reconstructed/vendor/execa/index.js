/**
 * execa/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (8)
 * attribution: placement 2, esm-layout 1, esm-fingerprint 4, affinity 1
 */
import { default as Mr } from "process";
import path from "path";
import { Buffer as jo } from "buffer";
import child_process from "child_process";
import { Re } from "../../runtime/bun-runtime.js";
import { require_cross_spawn } from "../cross-spawn/index.js";
import { Kt } from "../npm-run-path/index.js";
import { verboseDefault, logCommand } from "./lib/verbose.js";
import { normalizeStdio } from "./lib/stdio.js";
import { Ue, Ke, parseTemplates } from "./lib/command.js";
import { validateTimeout, setupTimeout, setExitHandler, spawnedKill, spawnedCancel } from "./lib/kill.js";
import { makeError } from "./lib/error.js";
import { mergePromise, getSpawnedPromise } from "./lib/promise.js";
import { onetime_default } from "../human-signals/build/src/realtime.js";
import { getSpawnedResult, handleInput, makeAllStream, handleInputSync } from "./lib/stream.js";
import { addPipeMethods } from "./lib/pipe.js";

//@ chunk-m4p5zn6n.js:7096-7115 placement
var import_cross_spawn = Re(require_cross_spawn(), 1);
//@ chunk-m4p5zn6n.js:7223-7413 placement
function Ce(e) {
  let n =
    typeof e === "string"
      ? `
`
      : `
`.charCodeAt();
  let r = typeof e === "string" ? "\r" : "\r".charCodeAt();
  if (e[e.length - 1] === n) e = e.slice(0, -1);
  if (e[e.length - 1] === r) e = e.slice(0, -1);
  return e;
}
//@ chunk-m4p5zn6n.js:27831-28526 esm-layout
var DEFAULT_MAX_BUFFER = 1e8;
var getEnv = ({ env: envOption, extendEnv, preferLocal, localDir, execPath }) => {
  let env = extendEnv
    ? {
        ...Mr.env,
        ...envOption,
      }
    : envOption;
  if (preferLocal)
    return Kt({
      env,
      cwd: localDir,
      execPath,
    });
  return env;
};
var handleArguments = (file, args, options = {}) => {
  let parsed = import_cross_spawn.default._parse(file, args, options);
  file = parsed.command;
  args = parsed.args;
  options = parsed.options;
  options = {
    maxBuffer: DEFAULT_MAX_BUFFER,
    buffer: true,
    stripFinalNewline: true,
    extendEnv: true,
    preferLocal: false,
    localDir: options.cwd || Mr.cwd(),
    execPath: Mr.execPath,
    encoding: "utf8",
    reject: true,
    cleanup: true,
    all: false,
    windowsHide: true,
    verbose: verboseDefault,
    ...options,
  };
  options.env = getEnv(options);
  options.stdio = normalizeStdio(options);
  if (Mr.platform === "win32" && path.basename(file, ".exe") === "cmd") args.unshift("/q");
  return {
    file,
    args,
    options,
    parsed,
  };
};
var handleOutput = (options, value, error) => {
  if (typeof value !== "string" && !jo.isBuffer(value)) return error === undefined ? undefined : "";
  if (options.stripFinalNewline) return Ce(value);
  return value;
};
//@ chunk-m4p5zn6n.js:28526-29569 esm-fingerprint
function execa(file, args, options) {
  let parsed = handleArguments(file, args, options);
  let command = Ue(file, args);
  let escapedCommand = Ke(file, args);
  logCommand(escapedCommand, parsed.options);
  validateTimeout(parsed.options);
  let spawned;
  try {
    spawned = child_process.spawn(parsed.file, parsed.args, parsed.options);
  } catch (error) {
    let dummySpawned = new child_process.ChildProcess();
    let errorPromise = Promise.reject(
      makeError({
        error,
        stdout: "",
        stderr: "",
        all: "",
        command,
        escapedCommand,
        parsed,
        timedOut: false,
        isCanceled: false,
        killed: false,
      }),
    );
    mergePromise(dummySpawned, errorPromise);
    return dummySpawned;
  }
  let spawnedPromise = getSpawnedPromise(spawned);
  let timedPromise = setupTimeout(spawned, parsed.options, spawnedPromise);
  let processDone = setExitHandler(spawned, parsed.options, timedPromise);
  let context = {
    isCanceled: false,
  };
  spawned.kill = spawnedKill.bind(null, spawned.kill.bind(spawned));
  spawned.cancel = spawnedCancel.bind(null, spawned, context);
  let handlePromiseOnce = onetime_default(async () => {
    let [{ error, exitCode, signal, timedOut }, stdoutResult, stderrResult, allResult] =
      await getSpawnedResult(spawned, parsed.options, processDone);
    let stdout = handleOutput(parsed.options, stdoutResult);
    let stderr = handleOutput(parsed.options, stderrResult);
    let all = handleOutput(parsed.options, allResult);
    if (error || exitCode !== 0 || signal !== null) {
      let returnedError = makeError({
        error,
        exitCode,
        signal,
        stdout,
        stderr,
        all,
        command,
        escapedCommand,
        parsed,
        timedOut,
        isCanceled: context.isCanceled || (parsed.options.signal ? parsed.options.signal.aborted : false),
        killed: spawned.killed,
      });
      if (!parsed.options.reject) return returnedError;
      throw returnedError;
    }
    return {
      command,
      escapedCommand,
      exitCode: 0,
      stdout,
      stderr,
      all,
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    };
  });
  handleInput(spawned, parsed.options);
  spawned.all = makeAllStream(spawned, parsed.options);
  addPipeMethods(spawned);
  mergePromise(spawned, handlePromiseOnce);
  return spawned;
}
//@ chunk-m4p5zn6n.js:29569-30299 esm-fingerprint
function execaSync(file, args, options) {
  let parsed = handleArguments(file, args, options);
  let command = Ue(file, args);
  let escapedCommand = Ke(file, args);
  logCommand(escapedCommand, parsed.options);
  let input = handleInputSync(parsed.options);
  let result;
  try {
    result = child_process.spawnSync(parsed.file, parsed.args, {
      ...parsed.options,
      input,
    });
  } catch (error) {
    throw makeError({
      error,
      stdout: "",
      stderr: "",
      all: "",
      command,
      escapedCommand,
      parsed,
      timedOut: false,
      isCanceled: false,
      killed: false,
    });
  }
  let stdout = handleOutput(parsed.options, result.stdout, result.error);
  let stderr = handleOutput(parsed.options, result.stderr, result.error);
  if (result.error || result.status !== 0 || result.signal !== null) {
    let error = makeError({
      stdout,
      stderr,
      error: result.error,
      signal: result.signal,
      exitCode: result.status,
      command,
      escapedCommand,
      parsed,
      timedOut: result.error && result.error.code === "ETIMEDOUT",
      isCanceled: false,
      killed: result.signal !== null,
    });
    if (!parsed.options.reject) return error;
    throw error;
  }
  return {
    command,
    escapedCommand,
    exitCode: 0,
    stdout,
    stderr,
    failed: false,
    timedOut: false,
    isCanceled: false,
    killed: false,
  };
}
//@ chunk-m4p5zn6n.js:30299-30439 esm-fingerprint
var normalizeScriptStdin = ({ input, inputFile, stdio }) =>
  input === undefined && inputFile === undefined && stdio === undefined
    ? {
        stdin: "inherit",
      }
    : {};
var normalizeScriptOptions = (options = {}) => ({
  preferLocal: true,
  ...normalizeScriptStdin(options),
  ...options,
});
//@ chunk-m4p5zn6n.js:30439-30740 esm-fingerprint
function create$(options) {
  function $(templatesOrOptions, ...expressions) {
    if (!Array.isArray(templatesOrOptions))
      return create$({
        ...options,
        ...templatesOrOptions,
      });
    let [file, ...args] = parseTemplates(templatesOrOptions, expressions);
    return execa(file, args, normalizeScriptOptions(options));
  }
  $.sync = (templates, ...expressions) => {
    if (!Array.isArray(templates))
      throw TypeError("Please use $(options).sync`command` instead of $.sync(options)`command`.");
    let [file, ...args] = parseTemplates(templates, expressions);
    return execaSync(file, args, normalizeScriptOptions(options));
  };
  return $;
}
//@ chunk-m4p5zn6n.js:30740-30752 affinity
var oa = create$();
export { execa, execaSync };
