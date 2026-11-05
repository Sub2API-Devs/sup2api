/**
 * @anthropic-ai/claude-agent-sdk/transport.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/claude-agent-sdk/transport.js
 * pieces: chunk-tp1gh0pb.js (25)
 * attribution: placement 25
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { spawn } from "child_process";
import { StringDecoder } from "string_decoder";
import { createInterface } from "readline";
import { existsSync } from "fs";
import { DoctorLazy } from "../../../src/cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../zod/v4/classic/schemas.js";
import { isPlainObject } from "../../../src/utils/objectUtils.js";
import { normalizeCaseForComparison_2 } from "../../../src/utils/permissions/filesystem.js";
import { jsonParse, jsonStringify, alwaysTrue } from "../../../src/utils/slowOperations.js";
import { logForDebugging } from "../../../src/utils/debug.js";
import { isWellFormedString, takeLastChars } from "../../../src/utils/stringUtils.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  toError,
  errorMessage,
  isFsInaccessible,
  withTelemetryFacts,
  sanitizeErrnoForTelemetry,
  getTelemetryMessage,
} from "../../../src/utils/errors.js";
import { createAbortController } from "../../../src/utils/abortController.js";
import { appendTaskOutput_2 } from "../../../src/utils/task/diskOutput.js";
import { isEnvTruthy } from "../../../src/utils/envUtils.js";
import { redactSecrets } from "../../../src/utils/redactSecrets.js";
import { keyValueArg, flagArgPair, pushFlagArg } from "../../../src/services/selfHostedRunner/childArgs.js";
import { getDebugFilePath } from "./transcriptMirror.js";
import { HookConfigError } from "../../../src/schemas/hooks.js";
import { inspectToolsList, describeToolsListIssues } from "../../../src/services/mcp/serverIdentity.js";

//@ chunk-tp1gh0pb.js:5736-5832 placement
var sessionInputMessageSchema = DoctorLazy(() =>
  objectSchema({
    session_id: stringSchema(),
    ws_url: stringSchema(),
    work_dir: stringSchema().optional(),
    session_key: stringSchema().optional(),
  }),
);
//@ chunk-tp1gh0pb.js:6393-6465 placement
function isJsonSettingsString(settings) {
  let trimmed = settings.trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}");
}
//@ chunk-tp1gh0pb.js:6465-6731 placement
var CONCAT_ARRAY_SANDBOX_KEYS = new Set([
  "filesystem.denyRead",
  "filesystem.denyWrite",
  "network.deniedDomains",
  "credentials.files",
  "credentials.envVars",
]);
var OPAQUE_SANDBOX_KEYS = new Set(["ripgrep", "network.tlsTerminate"]);
var FORBIDDEN_MERGE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
var PROXY_PORT_KEYS = ["httpProxyPort", "socksProxyPort"];
//@ chunk-tp1gh0pb.js:6731-7036 placement
function mergeSandboxSettings(target, source, prefix = "") {
  let merged = isPlainObject(target)
    ? {
        ...target,
      }
    : {};
  for (let [key, value] of Object.entries(source)) {
    if (FORBIDDEN_MERGE_KEYS.has(key) || value === undefined) continue;
    let fullKey = prefix ? `${prefix}.${key}` : key;
    let existing = Object.hasOwn(merged, key) ? merged[key] : undefined;
    if (CONCAT_ARRAY_SANDBOX_KEYS.has(fullKey) && Array.isArray(existing) && Array.isArray(value))
      merged[key] = normalizeCaseForComparison_2([...existing, ...value]);
    else if (isPlainObject(existing) && isPlainObject(value) && !OPAQUE_SANDBOX_KEYS.has(fullKey))
      merged[key] = mergeSandboxSettings(existing, value, fullKey);
    else merged[key] = value;
  }
  return merged;
}
//@ chunk-tp1gh0pb.js:7036-7805 placement
function applySandboxToArgs(options, source) {
  let result = {
    ...options,
  };
  if (!source) return result;
  let settings = result.settings;
  if (settings && !isJsonSettingsString(settings))
    throw Error(
      "Cannot use both a settings file path and the sandbox option. Include the sandbox configuration in your settings file instead.",
    );
  let settingsJson = {};
  if (settings)
    try {
      settingsJson = jsonParse(settings);
    } catch {}
  let mergedSandbox = mergeSandboxSettings(settingsJson.sandbox, source);
  let files = source.credentials?.files;
  let hasFilePolicy =
    source.filesystem !== undefined ||
    (Array.isArray(files) && files.some((file) => isPlainObject(file) && file.mode === "deny"));
  let filesystem = mergedSandbox.filesystem;
  if (
    hasFilePolicy &&
    source.filesystem?.disabled === undefined &&
    isPlainObject(filesystem) &&
    filesystem.disabled === true
  )
    delete filesystem.disabled;
  let network = source.network;
  let network_2 =
    network?.allowedDomains !== undefined ||
    (network?.deniedDomains?.length ?? 0) > 0 ||
    network?.strictAllowlist === true;
  let network_3 = mergedSandbox.network;
  if (network_2 && isPlainObject(network_3)) {
    for (let proxyKey of PROXY_PORT_KEYS)
      if (network?.[proxyKey] === undefined && network_3[proxyKey] !== undefined) delete network_3[proxyKey];
  }
  if (source.enabled === true && mergedSandbox.failIfUnavailable === undefined)
    mergedSandbox.failIfUnavailable = true;
  result.settings = jsonStringify({
    ...settingsJson,
    sandbox: mergedSandbox,
  });
  return result;
}
//@ chunk-tp1gh0pb.js:7805-7867 placement
var EXIT_DRAIN_TIMEOUT_MS = 2000;
var STDERR_TAIL_MAX_CHARS = 2048;
var SDK_EXIT_AFTER_STDERR_DRAINED = "sdk-exit-after-stderr-drained";
var STDERR_DRAIN_GRACE_MS = 200;
//@ chunk-tp1gh0pb.js:7867-7905 placement
function mapExitEventName(eventName) {
  return eventName === "exit" ? SDK_EXIT_AFTER_STDERR_DRAINED : eventName;
}
//@ chunk-tp1gh0pb.js:7905-8249 placement
class ProcessRegistry {
  #e = new Set();
  #t = false;
  #s = () => this.killAll();
  track(proc) {
    this.#e.add(proc);
    if (!this.#t) {
      this.#t = true;
      process.on("exit", this.#s);
    }
  }
  untrack(proc) {
    this.#e.delete(proc);
  }
  isTracking(proc) {
    return this.#e.has(proc);
  }
  get size() {
    return this.#e.size;
  }
  killAll() {
    for (let proc of this.#e) if (!proc.killed) proc.kill("SIGTERM");
  }
  reset() {
    process.off("exit", this.#s);
    this.#t = false;
    this.#e.clear();
  }
}
//@ chunk-tp1gh0pb.js:8249-8300 placement
var processRegistry = new ProcessRegistry();
var INVALID_SKILL_NAME_CHARS = /[(),\u0000-\u001f\u007f-\u009f]/;
//@ chunk-tp1gh0pb.js:8300-10268 placement
function validateSkillName(skill) {
  if (typeof skill !== "string" || skill.trim() === "") throw Error("Skill names must be non-empty strings.");
  if (!isWellFormedString(skill))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(skill)}: the name contains an unpaired surrogate, which cannot survive the UTF-8 encoding of the CLI invocation; no skill discovered from the filesystem can have such a name.`,
      "skill name with unpaired surrogate rejected",
    );
  if (skill !== skill.trim())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(skill)}: leading or trailing whitespace is not allowed \u2014 the Skill tool trims the invoked name, so a padded rule can never match. Remove the padding.`,
      "skill name with surrounding whitespace rejected",
    );
  if (INVALID_SKILL_NAME_CHARS.test(skill))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(skill)}: parentheses, commas, and control characters are not allowed in skill names. Skill names match the skill's directory name (or 'plugin:skill' for plugin-qualified skills); rename the skill if its directory name contains these characters.`,
      "invalid skill name rejected",
    );
  if (skill === "*") throw Error("Invalid skill name '*': use skills: 'all' to enable every skill.");
  if (skill.endsWith(":*") || skill.endsWith(" *"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(skill)}: wildcard-suffix names are not allowed; list each skill by its exact name.`,
      "wildcard-suffix skill name rejected",
    );
  if (skill.startsWith("/"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(skill)}: skill names may not start with '/'. Skills are invoked as slash commands, but the skills option takes the skill's canonical name \u2014 the directory name, or 'plugin:skill'.`,
      "skill name with leading slash rejected",
    );
  if (skill.includes("\\\\"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(skill)}: consecutive backslashes are not allowed \u2014 the permission-rule parser collapses escaped backslashes, so the rule would name a different skill. Rename the skill.`,
      "skill name with consecutive backslashes rejected",
    );
  if (skill.endsWith("\\"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(skill)}: names may not end with an unpaired backslash.`,
      "skill name with unpaired trailing backslash rejected",
    );
  return skill;
}
//@ chunk-tp1gh0pb.js:10268-22908 placement
/**
 * Agent SDK 的 ProcessTransport：以子进程方式启动 Claude Code（stream-json 输入输出），负责参数/环境组装、stdin 写入、stdout 行解析与进程退出处理。
 */
class ProcessTransport {
  options;
  process;
  processStdin;
  processStdout;
  ready = false;
  abortController;
  exitError;
  exitEventDelivered = false;
  stderrTail = "";
  exitListeners = [];
  abortHandler;
  forwardedAbort = createAbortController();
  pendingWrites = [];
  pendingEndInput = false;
  spawnResolve;
  spawnReject;
  spawnPromise;
  constructor(options) {
    this.options = options;
    this.abortController = options.abortController || createAbortController();
    if (options.deferSpawn) {
      this.spawnPromise = new Promise((resolve, reject) => {
        this.spawnResolve = resolve;
        this.spawnReject = reject;
      });
      this.spawnPromise.catch(() => {});
    } else this.initialize();
  }
  spawn() {
    try {
      this.initialize();
    } catch (error) {
      this.spawnAbort(toError(error));
      throw error;
    }
    let pendingWrites = this.pendingWrites;
    this.pendingWrites = [];
    if (this.spawnResolve) {
      this.spawnResolve();
      this.spawnResolve = undefined;
      this.spawnReject = undefined;
    }
    for (let pendingWrite of pendingWrites) this.write(pendingWrite);
    if (this.pendingEndInput) {
      this.pendingEndInput = false;
      this.processStdin?.end();
    }
  }
  spawnAbort(error) {
    if (this.spawnReject) {
      this.spawnReject(error);
      this.spawnReject = undefined;
      this.spawnResolve = undefined;
      this.pendingWrites = [];
    }
  }
  updateEnv(envPatch) {
    if (this.options.env) Object.assign(this.options.env, envPatch);
    else
      this.options.env = {
        ...envPatch,
      };
  }
  updateResume(resume) {
    this.options.resume = resume;
  }
  getDefaultExecutable() {
    return alwaysTrue() ? "bun" : "node";
  }
  spawnLocalProcess(spawnOptions) {
    let { command, args, cwd, env, signal } = spawnOptions;
    let startTime = performance.now();
    let child = spawn(command, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      signal,
      env,
      windowsHide: true,
    });
    let spawnSyncMs = performance.now() - startTime;
    if (child.pid !== undefined && this.options.onProcessSpawned)
      try {
        this.options.onProcessSpawned(child.pid, {
          spawnSyncMs,
        });
      } catch (error) {
        appendTaskOutput_2(`onProcessSpawned threw: ${errorMessage(error)}`);
      }
    let stderrDecoder = new StringDecoder("utf8");
    let stderrClosed = false;
    let processExited = false;
    let stderrDrained = false;
    let drainTimer;
    let shouldForwardStderr = isEnvTruthy(env.DEBUG_CLAUDE_AGENT_SDK) || this.options.stderr !== undefined;
    child.stderr.on("data", (chunk) => {
      if (stderrDrained) return;
      let text = stderrDecoder.write(chunk);
      this.stderrTail += text;
      if (this.stderrTail.length > 2 * STDERR_TAIL_MAX_CHARS)
        this.stderrTail = takeLastChars(redactSecrets(this.stderrTail), STDERR_TAIL_MAX_CHARS);
      if (shouldForwardStderr) {
        appendTaskOutput_2(text);
        this.options.stderr?.(text);
      }
    });
    child.stderr.on("error", (stderrError) => {
      appendTaskOutput_2(`[ProcessTransport] stderr read failed: ${stderrError.code ?? stderrError.message}`);
    });
    let finishDrain = () => {
      if (stderrDrained) return;
      stderrDrained = true;
      if (drainTimer) clearTimeout(drainTimer);
      child.emit(SDK_EXIT_AFTER_STDERR_DRAINED, child.exitCode, child.signalCode);
      let stderr = child.stderr;
      if (hasUnref(stderr)) stderr.unref();
      else stderr.destroy();
    };
    child.stderr.once("close", () => {
      this.stderrTail += stderrDecoder.end();
      stderrClosed = true;
      if (processExited) finishDrain();
    });
    child.once("exit", () => {
      processExited = true;
      this.ready = false;
      if (stderrClosed) finishDrain();
      else drainTimer = setTimeout(finishDrain, STDERR_DRAIN_GRACE_MS);
    });
    return {
      stdin: child.stdin,
      stdout: child.stdout,
      get killed() {
        return child.killed;
      },
      get exitCode() {
        return child.exitCode;
      },
      get signalCode() {
        return child.signalCode;
      },
      kill: child.kill.bind(child),
      on: (eventName, listener) => child.on(mapExitEventName(eventName), listener),
      once: (eventName, listener) => child.once(mapExitEventName(eventName), listener),
      off: (eventName, listener) => child.off(mapExitEventName(eventName), listener),
    };
  }
  initialize() {
    try {
      let {
        additionalDirectories = [],
        projectConfigRoot,
        agent,
        betas,
        cwd,
        executable = this.getDefaultExecutable(),
        executableArgs = [],
        extraArgs = {},
        pathToClaudeCodeExecutable,
        env = {
          ...process.env,
        },
        thinkingConfig,
        maxTurns,
        maxBudgetUsd,
        taskBudget,
        model,
        fallbackModel,
        jsonSchema,
        permissionMode,
        allowDangerouslySkipPermissions,
        permissionPromptToolName,
        permissionPrompts,
        continueConversation,
        resume,
        settingSources,
        skills,
        disallowedTools = [],
        tools,
        mcpServers,
        strictMcpConfig,
        canUseTool,
        includePartialMessages,
        plugins,
        pluginsViaInitialize,
        sandbox,
      } = this.options;
      let { allowedTools = [] } = this.options;
      if (skills !== undefined) {
        let skillRules =
          skills === "all" ? ["Skill"] : skills.map((skill) => `Skill(${validateSkillName(skill)})`);
        let allowedToolSet = new Set(allowedTools);
        allowedTools = [...allowedTools, ...skillRules.filter((rule) => !allowedToolSet.has(rule))];
      }
      let args = ["--output-format", "stream-json", "--verbose", "--input-format", "stream-json"];
      if (thinkingConfig) {
        switch (thinkingConfig.type) {
          case "enabled":
            if (thinkingConfig.budgetTokens === undefined) args.push("--thinking=adaptive");
            else args.push(keyValueArg("--max-thinking-tokens", thinkingConfig.budgetTokens));
            break;
          case "disabled":
            args.push("--thinking=disabled");
            break;
          case "adaptive":
            args.push("--thinking=adaptive");
            break;
        }
        if (thinkingConfig.type !== "disabled" && thinkingConfig.display)
          args.push(keyValueArg("--thinking-display", thinkingConfig.display));
      }
      if (this.options.effort) args.push(keyValueArg("--effort", this.options.effort));
      if (maxTurns) args.push(keyValueArg("--max-turns", maxTurns));
      if (maxBudgetUsd !== undefined) args.push(keyValueArg("--max-budget-usd", maxBudgetUsd));
      if (taskBudget) args.push(keyValueArg("--task-budget", taskBudget.total));
      if (model) args.push(keyValueArg("--model", model));
      if (agent) args.push(keyValueArg("--agent", agent));
      if (betas && betas.length > 0) args.push(keyValueArg("--betas", betas.join(",")));
      if (jsonSchema) args.push(keyValueArg("--json-schema", jsonStringify(jsonSchema)));
      if (this.options.debugFile) args.push(keyValueArg("--debug-file", this.options.debugFile));
      else if (this.options.debug) args.push("--debug");
      if (!this.options.debugFile && !this.options.spawnClaudeCodeProcess) {
        let debugFilePath = getDebugFilePath();
        if (debugFilePath) args.push(keyValueArg("--debug-file", debugFilePath));
      }
      if (canUseTool) {
        if (permissionPromptToolName)
          throw Error(
            "canUseTool callback cannot be used with permissionPromptToolName. Please use one or the other.",
          );
        args.push("--permission-prompt-tool=stdio");
      } else if (permissionPromptToolName)
        args.push(keyValueArg("--permission-prompt-tool", permissionPromptToolName));
      if (permissionPrompts) args.push(keyValueArg("--permission-prompts", permissionPrompts));
      if (continueConversation) args.push("--continue");
      if (resume) args.push(keyValueArg("--resume", resume));
      if (allowedTools.length > 0) args.push(keyValueArg("--allowedTools", allowedTools.join(",")));
      if (disallowedTools.length > 0) args.push(keyValueArg("--disallowedTools", disallowedTools.join(",")));
      if (tools !== undefined)
        if (Array.isArray(tools)) args.push(keyValueArg("--tools", tools.join(",")));
        else args.push("--tools=default");
      if (mcpServers && Object.keys(mcpServers).length > 0)
        args.push(
          ...flagArgPair(
            "--mcp-config",
            jsonStringify({
              mcpServers,
            }),
          ),
        );
      if (settingSources !== undefined) args.push(keyValueArg("--setting-sources", settingSources.join(",")));
      if (strictMcpConfig) args.push("--strict-mcp-config");
      if (permissionMode) args.push(keyValueArg("--permission-mode", permissionMode));
      if (allowDangerouslySkipPermissions) args.push("--allow-dangerously-skip-permissions");
      if (fallbackModel) {
        if (model && fallbackModel === model)
          throw Error(
            "Fallback model cannot be the same as the main model. Please specify a different model for fallbackModel option.",
          );
        args.push(keyValueArg("--fallback-model", fallbackModel));
      }
      if (this.options.includeHookEvents) args.push("--include-hook-events");
      if (includePartialMessages) args.push("--include-partial-messages");
      if (this.options.sessionMirror) args.push("--session-mirror");
      if (projectConfigRoot !== undefined) args.push(keyValueArg("--project-config-root", projectConfigRoot));
      for (let additionalDirectory of additionalDirectories)
        args.push(keyValueArg("--add-dir", additionalDirectory));
      if (pluginsViaInitialize) args.push("--await-initialize");
      else if (plugins && plugins.length > 0)
        for (let plugin of plugins)
          if (plugin.type === "local")
            args.push(
              plugin.skipMcpDiscovery
                ? keyValueArg("--plugin-dir-no-mcp", plugin.path)
                : keyValueArg("--plugin-dir", plugin.path),
            );
          else throw Error(`Unsupported plugin type: ${plugin.type}`);
      if (this.options.forkSession) args.push("--fork-session");
      if (this.options.resumeSessionAt)
        args.push(keyValueArg("--resume-session-at", this.options.resumeSessionAt));
      if (this.options.resumeDropsTurn !== undefined)
        args.push(keyValueArg("--resume-drops-turn", this.options.resumeDropsTurn));
      if (this.options.sessionId) args.push(keyValueArg("--session-id", this.options.sessionId));
      if (this.options.persistSession === false) args.push("--no-session-persistence");
      if (this.options.managedSettings)
        args.push(...flagArgPair("--managed-settings", this.options.managedSettings));
      let userArgs = {
        ...(extraArgs ?? {}),
      };
      if (this.options.settings) userArgs.settings = this.options.settings;
      let mergedArgs = applySandboxToArgs(userArgs, sandbox);
      for (let [key, value] of Object.entries(mergedArgs))
        if (value === null) args.push(`--${key}`);
        else pushFlagArg(args, key, value);
      if (!env.CLAUDE_CODE_ENTRYPOINT) env.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";
      delete env.NODE_OPTIONS;
      if (isEnvTruthy(env.DEBUG_CLAUDE_AGENT_SDK)) env.DEBUG = "1";
      else delete env.DEBUG;
      let pathIsJs = isJavaScriptFile(pathToClaudeCodeExecutable);
      let command = pathIsJs ? pathToClaudeCodeExecutable : executable;
      let childArgs = pathIsJs
        ? [...executableArgs, ...args]
        : [...executableArgs, pathToClaudeCodeExecutable, ...args];
      let spawnSpec = {
        command,
        args: childArgs,
        cwd,
        env,
        signal: this.forwardedAbort.signal,
      };
      if (this.options.spawnClaudeCodeProcess) {
        appendTaskOutput_2(`Spawning Claude Code (custom): ${command} ${childArgs.join(" ")}`);
        this.process = this.options.spawnClaudeCodeProcess(spawnSpec);
      } else {
        appendTaskOutput_2(`Spawning Claude Code: ${command} ${childArgs.join(" ")}`);
        this.process = this.spawnLocalProcess(spawnSpec);
      }
      this.processStdin = this.process.stdin;
      this.processStdout = this.process.stdout;
      this.processStdin.on("error", (stdinError) => {
        appendTaskOutput_2(
          `[ProcessTransport] stdin write failed (child likely exited): ${stdinError.code ?? stdinError.message}`,
        );
        this.ready = false;
      });
      processRegistry.track(this.process);
      this.abortHandler = () => this.close();
      this.abortController.signal.addEventListener("abort", this.abortHandler);
      if (this.abortController.signal.aborted) this.close();
      let child = this.process;
      child.on("error", (error) => {
        this.ready = false;
        let spawnError = error;
        let isSpawnFailure =
          spawnError.syscall !== undefined ? spawnError.syscall.startsWith("spawn") : isFsInaccessible(error);
        if (isSpawnFailure && !child.killed) processRegistry.untrack(child);
        if (this.abortController.signal.aborted) {
          this.exitError = processAbortedError();
          withTelemetryFacts(error, {
            telemetryMessage: "Claude Code process aborted by user",
            errorClass: "aborted",
          });
        } else if (isSpawnFailure && isFsInaccessible(error)) {
          let { message, telemetryMessage, errorClass } = describeExecutableLaunchFailure(
            pathToClaudeCodeExecutable,
            pathIsJs,
          );
          let launchFacts = {
            telemetryMessage: `${telemetryMessage}${formatErrnoSuffix(error)}`,
            errorClass,
            code: sanitizeErrnoForTelemetry(error),
          };
          this.exitError = withTelemetryFacts(ReferenceError(message), launchFacts);
          withTelemetryFacts(error, launchFacts);
          appendTaskOutput_2(this.exitError.message);
        } else {
          let errorFacts = {
            telemetryMessage: isSpawnFailure
              ? `Failed to spawn Claude Code process${formatErrnoSuffix(error)}`
              : `Claude Code process error${formatErrnoSuffix(error)}`,
            errorClass: isSpawnFailure ? "spawn_failed" : "process_error",
            code: sanitizeErrnoForTelemetry(error),
          };
          this.exitError = withTelemetryFacts(
            Error(`Failed to spawn Claude Code process: ${redactSecrets(error.message)}`),
            errorFacts,
          );
          withTelemetryFacts(error, errorFacts);
          appendTaskOutput_2(this.exitError.message);
        }
      });
      child.on("exit", (exitCode, signalCode) => {
        this.exitEventDelivered = true;
        this.ready = false;
        if (this.abortController.signal.aborted) this.exitError = processAbortedError();
        else {
          let exitError = this.getProcessExitError(exitCode, signalCode);
          if (exitError) {
            this.exitError = exitError;
            appendTaskOutput_2(exitError.message);
          }
        }
      });
      this.ready = !this.abortController.signal.aborted;
    } catch (error) {
      this.ready = false;
      throw error;
    }
  }
  getProcessExitError(exitCode, signalCode) {
    if (exitCode !== 0 && exitCode !== null) {
      let normalizedExitCode = Number.isInteger(exitCode) ? exitCode : undefined;
      return withTelemetryFacts(
        Error(`Claude Code process exited with code ${exitCode}${this.formatStderrTail()}`),
        {
          telemetryMessage: `Claude Code process exited with code ${normalizedExitCode ?? "unknown"}`,
          errorClass: "process_exited_nonzero",
          exitCode: normalizedExitCode,
        },
      );
    } else if (signalCode) {
      let normalizedSignal = /^SIG[A-Z0-9]{1,8}$/.test(signalCode) ? signalCode : "unknown";
      return withTelemetryFacts(
        Error(`Claude Code process terminated by signal ${signalCode}${this.formatStderrTail()}`),
        {
          telemetryMessage: `Claude Code process terminated by signal ${normalizedSignal}`,
          errorClass: "process_killed_by_signal",
          signal: normalizedSignal,
        },
      );
    }
    return;
  }
  formatStderrTail() {
    let trimmed = takeLastChars(redactSecrets(this.stderrTail), STDERR_TAIL_MAX_CHARS).trim();
    return trimmed ? `. stderr: ${trimmed}` : "";
  }
  write(payload) {
    if (this.abortController.signal.aborted) throw operationAbortedError();
    if (this.spawnResolve) {
      this.pendingWrites.push(payload);
      return;
    }
    if (!this.ready || !this.processStdin) throw Error("ProcessTransport is not ready for writing");
    if (this.processStdin.writableEnded) {
      appendTaskOutput_2("[ProcessTransport] Dropping write to ended stdin stream");
      return;
    }
    if (this.process?.killed || this.process?.exitCode !== null)
      throw Error("Cannot write to terminated process");
    if (this.exitError)
      throw withTelemetryFacts(
        Error(`Cannot write to process that exited with error: ${this.exitError.message}`),
        {
          telemetryMessage: `Cannot write to process that exited with error: ${getTelemetryMessage(this.exitError) ?? "untagged exit error"}`,
          errorClass: getStringFact(this.exitError, "errorClass"),
          code: sanitizeErrnoForTelemetry(this.exitError),
          exitCode: getExitCode(this.exitError),
          signal: getStringFact(this.exitError, "signal"),
        },
      );
    appendTaskOutput_2(`[ProcessTransport] Writing to stdin: ${payload.substring(0, 100)}`);
    try {
      if (!this.processStdin.write(payload))
        appendTaskOutput_2("[ProcessTransport] Write buffer full, data queued");
    } catch (error) {
      this.ready = false;
      throw Error(`Failed to write to process stdin: ${errorMessage(error)}`);
    }
  }
  [Symbol.dispose]() {
    this.close();
  }
  close() {
    this.spawnAbort(
      this.abortController.signal.aborted ? processAbortedError() : Error("Query closed before spawn"),
    );
    if (this.processStdin) {
      this.processStdin.end();
      this.processStdin = undefined;
    }
    if (this.abortHandler) {
      this.abortController.signal.removeEventListener("abort", this.abortHandler);
      this.abortHandler = undefined;
    }
    let exitCode = this.process?.exitCode ?? null;
    let signalCode = this.process?.signalCode ?? null;
    let shouldReportExit =
      !this.exitEventDelivered && ((exitCode !== null && exitCode >= 0) || signalCode !== null);
    let closeError;
    if (shouldReportExit) {
      this.exitEventDelivered = true;
      closeError = this.abortController.signal.aborted
        ? processAbortedError()
        : this.getProcessExitError(exitCode, signalCode);
      if (closeError && !this.exitError) this.exitError = closeError;
    }
    let exitListeners = this.exitListeners;
    this.exitListeners = [];
    for (let { callback, handler } of exitListeners) {
      this.process?.off("exit", handler);
      if (shouldReportExit)
        try {
          callback(closeError);
        } catch (error) {
          appendTaskOutput_2(
            `[ProcessTransport] onExit callback threw during close(): ${errorMessage(error)}`,
          );
        }
    }
    let abortForwarded = () => {
      if (this.abortController.signal.aborted) this.forwardedAbort.abort(this.abortController.signal.reason);
    };
    let child = this.process;
    if (child && !child.killed && child.exitCode === null && child.signalCode == null) {
      setTimeout(
        (proc, finish) => {
          if (proc.exitCode !== null || proc.signalCode != null) {
            finish();
            return;
          }
          proc.kill("SIGTERM");
          setTimeout(
            (proc) => {
              if (proc.exitCode === null) proc.kill("SIGKILL");
            },
            5000,
            proc,
          ).unref();
          finish();
        },
        EXIT_DRAIN_TIMEOUT_MS,
        child,
        abortForwarded,
      ).unref();
      child.once("exit", () => processRegistry.untrack(child));
    } else if (child) {
      processRegistry.untrack(child);
      abortForwarded();
    }
    this.ready = false;
  }
  isReady() {
    return this.ready;
  }
  async *readMessages() {
    if (this.spawnPromise) {
      await this.spawnPromise;
      this.spawnPromise = undefined;
    }
    if (!this.processStdout) throw Error("ProcessTransport output stream not available");
    if (this.exitError) throw this.exitError;
    let lineReader = createInterface({
      input: this.processStdout,
    });
    let detachReader = this.process
      ? (() => {
          let child = this.process;
          let onChildError = () => lineReader.close();
          child.on("error", onChildError);
          return () => child.off("error", onChildError);
        })()
      : undefined;
    if (this.exitError) lineReader.close();
    try {
      for await (let line of lineReader)
        if (line.trim()) {
          let message;
          try {
            message = jsonParse(line);
          } catch (error) {
            appendTaskOutput_2(`Non-JSON stdout: ${line}`);
            continue;
          }
          yield message;
        }
      if (this.exitError) throw this.exitError;
      await this.waitForExit();
    } finally {
      detachReader?.();
      lineReader.close();
    }
  }
  endInput() {
    if (this.spawnResolve) {
      this.pendingEndInput = true;
      return;
    }
    if (this.processStdin) this.processStdin.end();
  }
  onExit(callback) {
    if (!this.process) return () => {};
    let exitCode = (signalCode, exitError) => {
      let handler = this.getProcessExitError(signalCode, exitError);
      callback(handler);
    };
    this.process.on("exit", exitCode);
    this.exitListeners.push({
      callback,
      handler: exitCode,
    });
    return () => {
      if (this.process) this.process.off("exit", exitCode);
      let index = this.exitListeners.findIndex((exitListener) => exitListener.handler === exitCode);
      if (index !== -1) this.exitListeners.splice(index, 1);
    };
  }
  async waitForExit() {
    if (this.exitError) throw this.exitError;
    if (!this.process || this.process.exitCode === 0 || (this.process.killed && this.exitEventDelivered))
      return;
    return new Promise((resolve, reject) => {
      let resolve_2 = (reject_2, onExit) => {
        if (this.abortController.signal.aborted) {
          reject(operationAbortedError());
          return;
        }
        let code = this.getProcessExitError(reject_2, onExit);
        if (code) reject(code);
        else resolve();
      };
      this.process.once("exit", resolve_2);
      let signal = (onError) => {
        this.process.off("exit", resolve_2);
        reject(onError);
      };
      this.process.once("error", signal);
      this.process.once("exit", () => {
        this.process.off("error", signal);
      });
    });
  }
}
//@ chunk-tp1gh0pb.js:22908-22990 placement
function isJavaScriptFile(pathToClaudeCodeExecutable) {
  return ![".js", ".mjs", ".tsx", ".ts", ".jsx"].some((file) => pathToClaudeCodeExecutable.endsWith(file));
}
//@ chunk-tp1gh0pb.js:22990-23974 placement
function describeExecutableLaunchFailure(pathToClaudeCodeExecutable, isNativeBinary) {
  let displayPath = isNativeBinary ? "native binary" : "executable";
  let kind = redactSecrets(pathToClaudeCodeExecutable);
  if (existsSync(pathToClaudeCodeExecutable))
    return {
      message: isNativeBinary
        ? `Claude Code native binary at ${kind} exists but failed to launch. This usually means the binary does not match this system's libc \u2014 e.g. spawning a musl-linked binary on a glibc Linux host fails because the musl dynamic loader (/lib/ld-musl-*) is missing. Specify a matching binary with options.pathToClaudeCodeExecutable.`
        : `Claude Code executable at ${kind} exists but failed to launch.`,
      telemetryMessage: `Claude Code ${displayPath} exists at the configured path but failed to launch`,
      errorClass: "executable_launch_failed",
    };
  return {
    message: isNativeBinary
      ? `Claude Code native binary not found at ${kind}. Please ensure Claude Code is installed via native installer or specify a valid path with options.pathToClaudeCodeExecutable.`
      : `Claude Code executable not found at ${kind}. Is options.pathToClaudeCodeExecutable set?`,
    telemetryMessage: `Claude Code ${displayPath} not found at the configured path`,
    errorClass: "executable_not_found",
  };
}
//@ chunk-tp1gh0pb.js:23974-24032 placement
function formatErrnoSuffix(error) {
  let code = sanitizeErrnoForTelemetry(error);
  return code === undefined ? "" : ` (${code})`;
}
//@ chunk-tp1gh0pb.js:24032-24182 placement
function processAbortedError() {
  return withTelemetryFacts(new HookConfigError("Claude Code process aborted by user"), {
    telemetryMessage: "Claude Code process aborted by user",
    errorClass: "aborted",
  });
}
//@ chunk-tp1gh0pb.js:24182-24296 placement
function operationAbortedError() {
  return withTelemetryFacts(new HookConfigError("Operation aborted"), {
    telemetryMessage: "Operation aborted",
    errorClass: "aborted",
  });
}
//@ chunk-tp1gh0pb.js:24296-24398 placement
function getStringFact(exitError, key) {
  let value = Object.hasOwn(exitError, key) ? Reflect.get(exitError, key) : undefined;
  return typeof value === "string" ? value : undefined;
}
//@ chunk-tp1gh0pb.js:24398-24516 placement
function getExitCode(exitError) {
  let exitCode = Object.hasOwn(exitError, "exitCode") ? Reflect.get(exitError, "exitCode") : undefined;
  return typeof exitCode === "number" ? exitCode : undefined;
}
//@ chunk-tp1gh0pb.js:24516-24581 placement
function hasUnref(stderr) {
  return typeof Reflect.get(stderr, "unref") === "function";
}
//@ chunk-tp1gh0pb.js:24614-24654 placement
var SDK_PACKAGE_NAME = "@anthropic-ai/claude-agent-sdk";
//@ chunk-tp1gh0pb.js:24654-24807 placement
function prefersMusl() {
  let report = typeof process.report?.getReport === "function" ? process.report.getReport() : null;
  return report != null && report.header?.glibcVersionRuntime === undefined;
}
//@ chunk-tp1gh0pb.js:24807-25231 placement
function resolveNativeCliPath(resolve, options = {}) {
  let platform = options.platform ?? "linux";
  let arch = options.arch ?? "x64";
  let exists = options.exists ?? existsSync;
  let preferMusl = options.preferMusl ?? prefersMusl();
  let SDK_NATIVE_BIN = process.env.SDK_NATIVE_BIN ?? "claude";
  let suffix = platform === "win32" ? ".exe" : "";
  let mapped = (
    platform === "android"
      ? [`${SDK_PACKAGE_NAME}-linux-${arch}-android`]
      : platform === "linux"
        ? preferMusl
          ? [`${SDK_PACKAGE_NAME}-linux-${arch}-musl`, `${SDK_PACKAGE_NAME}-linux-${arch}`]
          : [`${SDK_PACKAGE_NAME}-linux-${arch}`, `${SDK_PACKAGE_NAME}-linux-${arch}-musl`]
        : [`${SDK_PACKAGE_NAME}-${platform}-${arch}`]
  ).map((candidate) => `${candidate}/${SDK_NATIVE_BIN}${suffix}`);
  for (let candidate of mapped)
    try {
      let resolved = resolve(candidate);
      if (exists(resolved)) return resolved;
    } catch {}
  return null;
}
//@ chunk-tp1gh0pb.js:25231-25519 placement
function assertDialogKindsHandled({ supportedDialogKinds, onUserDialog }) {
  if (supportedDialogKinds !== undefined && supportedDialogKinds.length > 0 && !onUserDialog)
    throw Error(
      "supportedDialogKinds requires an onUserDialog callback -- declaring dialog kinds without a handler would park dialogs nothing can answer. Provide onUserDialog, or omit supportedDialogKinds.",
    );
}
//@ chunk-tp1gh0pb.js:25547-25671 placement
var MANIFEST_CAPTURE_TIMEOUT_MS = 250;
var PROMPT_HOLD_SUBTYPES = new Set(["interrupt", "cancel_async_message"]);
var SDK_MANIFEST_CAPTURE = "sdk-manifest-capture:";
var suppressControlResponse = Symbol("suppressControlResponse");
//@ chunk-tp1gh0pb.js:25671-25850 placement
function logIgnoredMcpServerFields(serverName, serverConfig, ignored) {
  for (let ignoredField of ignored) {
    let issues = ignoredField === "tools" ? inspectToolsList(serverConfig) : undefined;
    logForDebugging(
      issues
        ? `[Query] MCP server '${serverName}': ${describeToolsListIssues(issues)}`
        : `[Query] MCP server '${serverName}': ignoring malformed ${ignoredField} in its config`,
    );
  }
}
export {
  assertDialogKindsHandled,
  resolveNativeCliPath,
  ProcessTransport,
  suppressControlResponse,
  SDK_MANIFEST_CAPTURE,
  MANIFEST_CAPTURE_TIMEOUT_MS,
  PROMPT_HOLD_SUBTYPES,
  logIgnoredMcpServerFields,
};
