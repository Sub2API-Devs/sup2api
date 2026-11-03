/**
 * @anthropic-ai/claude-agent-sdk/transport.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/claude-agent-sdk/transport.js
 * pieces: chunk-y805ph4h.js (25)
 * attribution: placement 25
 */
import { spawn } from "child_process";
import { StringDecoder } from "string_decoder";
import { createInterface } from "readline";
import { existsSync } from "fs";
import { DoctorLazy } from "../../../src/cli/handlers/util.js";
import { u, string } from "../../zod/v4/classic/schemas.js";
import { isPlainObject } from "../../../src/utils/objectUtils.js";
import { uniq } from "../../../src/utils/collections.js";
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
import { It } from "./transcriptMirror.js";
import { HookConfigError } from "../../../src/schemas/hooks.js";
import { inspectToolsList, describeToolsListIssues } from "../../../src/services/mcp/serverIdentity.js";

//@ chunk-y805ph4h.js:5498-5594 placement
var Go = DoctorLazy(() =>
  u({
    session_id: string(),
    ws_url: string(),
    work_dir: string().optional(),
    session_key: string().optional(),
  }),
);
//@ chunk-y805ph4h.js:6155-6227 placement
function Us(settings) {
  let trimmed = settings.trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}");
}
//@ chunk-y805ph4h.js:6227-6493 placement
var Ls = new Set([
  "filesystem.denyRead",
  "filesystem.denyWrite",
  "network.deniedDomains",
  "credentials.files",
  "credentials.envVars",
]);
var $s = new Set(["ripgrep", "network.tlsTerminate"]);
var Fs = new Set(["__proto__", "constructor", "prototype"]);
var Ns = ["httpProxyPort", "socksProxyPort"];
//@ chunk-y805ph4h.js:6493-6798 placement
function Dt(e, s, r = "") {
  let n = isPlainObject(e)
    ? {
        ...e,
      }
    : {};
  for (let [key, value] of Object.entries(s)) {
    if (Fs.has(key) || value === undefined) continue;
    let l = r ? `${r}.${key}` : key;
    let h = Object.hasOwn(n, key) ? n[key] : undefined;
    if (Ls.has(l) && Array.isArray(h) && Array.isArray(value)) n[key] = uniq([...h, ...value]);
    else if (isPlainObject(h) && isPlainObject(value) && !$s.has(l)) n[key] = Dt(h, value, l);
    else n[key] = value;
  }
  return n;
}
//@ chunk-y805ph4h.js:6798-7567 placement
function Ot(e, sandbox) {
  let r = {
    ...e,
  };
  if (!sandbox) return r;
  let settings = r.settings;
  if (settings && !Us(settings))
    throw Error(
      "Cannot use both a settings file path and the sandbox option. Include the sandbox configuration in your settings file instead.",
    );
  let i = {};
  if (settings)
    try {
      i = jsonParse(settings);
    } catch {}
  let m = Dt(i.sandbox, sandbox);
  let files = sandbox.credentials?.files;
  let h =
    sandbox.filesystem !== undefined ||
    (Array.isArray(files) && files.some((file) => isPlainObject(file) && file.mode === "deny"));
  let filesystem = m.filesystem;
  if (
    h &&
    sandbox.filesystem?.disabled === undefined &&
    isPlainObject(filesystem) &&
    filesystem.disabled === true
  )
    delete filesystem.disabled;
  let network = sandbox.network;
  let w =
    network?.allowedDomains !== undefined ||
    (network?.deniedDomains?.length ?? 0) > 0 ||
    network?.strictAllowlist === true;
  let network_2 = m.network;
  if (w && isPlainObject(network_2)) {
    for (let R of Ns) if (network?.[R] === undefined && network_2[R] !== undefined) delete network_2[R];
  }
  if (sandbox.enabled === true && m.failIfUnavailable === undefined) m.failIfUnavailable = true;
  r.settings = jsonStringify({
    ...i,
    sandbox: m,
  });
  return r;
}
//@ chunk-y805ph4h.js:7567-7629 placement
var Bs = 2000;
var Ye = 2048;
var SDK_EXIT_AFTER_STDERR_DRAINED = "sdk-exit-after-stderr-drained";
var Gs = 200;
//@ chunk-y805ph4h.js:7629-7667 placement
function Ze(e) {
  return e === "exit" ? SDK_EXIT_AFTER_STDERR_DRAINED : e;
}
//@ chunk-y805ph4h.js:7667-8011 placement
class Ut {
  #e = new Set();
  #t = false;
  #s = () => this.killAll();
  track(e) {
    this.#e.add(e);
    if (!this.#t) {
      this.#t = true;
      process.on("exit", this.#s);
    }
  }
  untrack(e) {
    this.#e.delete(e);
  }
  isTracking(e) {
    return this.#e.has(e);
  }
  get size() {
    return this.#e.size;
  }
  killAll() {
    for (let e of this.#e) if (!e.killed) e.kill("SIGTERM");
  }
  reset() {
    process.off("exit", this.#s);
    this.#t = false;
    this.#e.clear();
  }
}
//@ chunk-y805ph4h.js:8011-8062 placement
var Ie = new Ut();
var Ws = /[(),\u0000-\u001f\u007f-\u009f]/;
//@ chunk-y805ph4h.js:8062-10030 placement
function Vs(skill) {
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
  if (Ws.test(skill))
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
//@ chunk-y805ph4h.js:10030-22612 placement
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
  constructor(e) {
    this.options = e;
    this.abortController = e.abortController || createAbortController();
    if (e.deferSpawn) {
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
  spawnAbort(e) {
    if (this.spawnReject) {
      this.spawnReject(e);
      this.spawnReject = undefined;
      this.spawnResolve = undefined;
      this.pendingWrites = [];
    }
  }
  updateEnv(e) {
    if (this.options.env) Object.assign(this.options.env, e);
    else
      this.options.env = {
        ...e,
      };
  }
  updateResume(resume) {
    this.options.resume = resume;
  }
  getDefaultExecutable() {
    return alwaysTrue() ? "bun" : "node";
  }
  spawnLocalProcess(e) {
    let { command, args, cwd, env, signal } = e;
    let l = spawn(command, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      signal,
      env,
      windowsHide: true,
    });
    if (l.pid !== undefined && this.options.onProcessSpawned)
      try {
        this.options.onProcessSpawned(l.pid);
      } catch (error) {
        appendTaskOutput_2(`onProcessSpawned threw: ${errorMessage(error)}`);
      }
    let h = new StringDecoder("utf8");
    let S = false;
    let y = false;
    let w = false;
    let b;
    let R = isEnvTruthy(env.DEBUG_CLAUDE_AGENT_SDK) || this.options.stderr !== undefined;
    l.stderr.on("data", (P) => {
      if (w) return;
      let D = h.write(P);
      this.stderrTail += D;
      if (this.stderrTail.length > 2 * Ye)
        this.stderrTail = takeLastChars(redactSecrets(this.stderrTail), Ye);
      if (R) {
        appendTaskOutput_2(D);
        this.options.stderr?.(D);
      }
    });
    l.stderr.on("error", (P) => {
      appendTaskOutput_2(`[ProcessTransport] stderr read failed: ${P.code ?? P.message}`);
    });
    let T = () => {
      if (w) return;
      w = true;
      if (b) clearTimeout(b);
      l.emit(SDK_EXIT_AFTER_STDERR_DRAINED, l.exitCode, l.signalCode);
      let stderr = l.stderr;
      if (Ys(stderr)) stderr.unref();
      else stderr.destroy();
    };
    l.stderr.once("close", () => {
      this.stderrTail += h.end();
      S = true;
      if (y) T();
    });
    l.once("exit", () => {
      y = true;
      this.ready = false;
      if (S) T();
      else b = setTimeout(T, Gs);
    });
    return {
      stdin: l.stdin,
      stdout: l.stdout,
      get killed() {
        return l.killed;
      },
      get exitCode() {
        return l.exitCode;
      },
      get signalCode() {
        return l.signalCode;
      },
      kill: l.kill.bind(l),
      on: (P, D) => l.on(Ze(P), D),
      once: (P, D) => l.once(Ze(P), D),
      off: (P, D) => l.off(Ze(P), D),
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
        let M = skills === "all" ? ["Skill"] : skills.map((skill) => `Skill(${Vs(skill)})`);
        let L = new Set(allowedTools);
        allowedTools = [...allowedTools, ...M.filter((j) => !L.has(j))];
      }
      let v = ["--output-format", "stream-json", "--verbose", "--input-format", "stream-json"];
      if (thinkingConfig) {
        switch (thinkingConfig.type) {
          case "enabled":
            if (thinkingConfig.budgetTokens === undefined) v.push("--thinking=adaptive");
            else v.push(keyValueArg("--max-thinking-tokens", thinkingConfig.budgetTokens));
            break;
          case "disabled":
            v.push("--thinking=disabled");
            break;
          case "adaptive":
            v.push("--thinking=adaptive");
            break;
        }
        if (thinkingConfig.type !== "disabled" && thinkingConfig.display)
          v.push(keyValueArg("--thinking-display", thinkingConfig.display));
      }
      if (this.options.effort) v.push(keyValueArg("--effort", this.options.effort));
      if (maxTurns) v.push(keyValueArg("--max-turns", maxTurns));
      if (maxBudgetUsd !== undefined) v.push(keyValueArg("--max-budget-usd", maxBudgetUsd));
      if (taskBudget) v.push(keyValueArg("--task-budget", taskBudget.total));
      if (model) v.push(keyValueArg("--model", model));
      if (agent) v.push(keyValueArg("--agent", agent));
      if (betas && betas.length > 0) v.push(keyValueArg("--betas", betas.join(",")));
      if (jsonSchema) v.push(keyValueArg("--json-schema", jsonStringify(jsonSchema)));
      if (this.options.debugFile) v.push(keyValueArg("--debug-file", this.options.debugFile));
      else if (this.options.debug) v.push("--debug");
      if (!this.options.debugFile && !this.options.spawnClaudeCodeProcess) {
        let M = It();
        if (M) v.push(keyValueArg("--debug-file", M));
      }
      if (canUseTool) {
        if (permissionPromptToolName)
          throw Error(
            "canUseTool callback cannot be used with permissionPromptToolName. Please use one or the other.",
          );
        v.push("--permission-prompt-tool=stdio");
      } else if (permissionPromptToolName)
        v.push(keyValueArg("--permission-prompt-tool", permissionPromptToolName));
      if (permissionPrompts) v.push(keyValueArg("--permission-prompts", permissionPrompts));
      if (continueConversation) v.push("--continue");
      if (resume) v.push(keyValueArg("--resume", resume));
      if (allowedTools.length > 0) v.push(keyValueArg("--allowedTools", allowedTools.join(",")));
      if (disallowedTools.length > 0) v.push(keyValueArg("--disallowedTools", disallowedTools.join(",")));
      if (tools !== undefined)
        if (Array.isArray(tools)) v.push(keyValueArg("--tools", tools.join(",")));
        else v.push("--tools=default");
      if (mcpServers && Object.keys(mcpServers).length > 0)
        v.push(
          ...flagArgPair(
            "--mcp-config",
            jsonStringify({
              mcpServers,
            }),
          ),
        );
      if (settingSources !== undefined) v.push(keyValueArg("--setting-sources", settingSources.join(",")));
      if (strictMcpConfig) v.push("--strict-mcp-config");
      if (permissionMode) v.push(keyValueArg("--permission-mode", permissionMode));
      if (allowDangerouslySkipPermissions) v.push("--allow-dangerously-skip-permissions");
      if (fallbackModel) {
        if (model && fallbackModel === model)
          throw Error(
            "Fallback model cannot be the same as the main model. Please specify a different model for fallbackModel option.",
          );
        v.push(keyValueArg("--fallback-model", fallbackModel));
      }
      if (this.options.includeHookEvents) v.push("--include-hook-events");
      if (includePartialMessages) v.push("--include-partial-messages");
      if (this.options.sessionMirror) v.push("--session-mirror");
      if (projectConfigRoot !== undefined) v.push(keyValueArg("--project-config-root", projectConfigRoot));
      for (let additionalDirectory of additionalDirectories)
        v.push(keyValueArg("--add-dir", additionalDirectory));
      if (pluginsViaInitialize) v.push("--await-initialize");
      else if (plugins && plugins.length > 0)
        for (let plugin of plugins)
          if (plugin.type === "local")
            v.push(
              plugin.skipMcpDiscovery
                ? keyValueArg("--plugin-dir-no-mcp", plugin.path)
                : keyValueArg("--plugin-dir", plugin.path),
            );
          else throw Error(`Unsupported plugin type: ${plugin.type}`);
      if (this.options.forkSession) v.push("--fork-session");
      if (this.options.resumeSessionAt)
        v.push(keyValueArg("--resume-session-at", this.options.resumeSessionAt));
      if (this.options.resumeDropsTurn !== undefined)
        v.push(keyValueArg("--resume-drops-turn", this.options.resumeDropsTurn));
      if (this.options.sessionId) v.push(keyValueArg("--session-id", this.options.sessionId));
      if (this.options.persistSession === false) v.push("--no-session-persistence");
      if (this.options.managedSettings)
        v.push(...flagArgPair("--managed-settings", this.options.managedSettings));
      let Z = {
        ...(extraArgs ?? {}),
      };
      if (this.options.settings) Z.settings = this.options.settings;
      let Ke = Ot(Z, sandbox);
      for (let [key, value] of Object.entries(Ke))
        if (value === null) v.push(`--${key}`);
        else pushFlagArg(v, key, value);
      if (!env.CLAUDE_CODE_ENTRYPOINT) env.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";
      delete env.NODE_OPTIONS;
      if (isEnvTruthy(env.DEBUG_CLAUDE_AGENT_SDK)) env.DEBUG = "1";
      else delete env.DEBUG;
      let ne = Qs(pathToClaudeCodeExecutable);
      let fe = ne ? pathToClaudeCodeExecutable : executable;
      let me = ne ? [...executableArgs, ...v] : [...executableArgs, pathToClaudeCodeExecutable, ...v];
      let Te = {
        command: fe,
        args: me,
        cwd,
        env,
        signal: this.forwardedAbort.signal,
      };
      if (this.options.spawnClaudeCodeProcess) {
        appendTaskOutput_2(`Spawning Claude Code (custom): ${fe} ${me.join(" ")}`);
        this.process = this.options.spawnClaudeCodeProcess(Te);
      } else {
        appendTaskOutput_2(`Spawning Claude Code: ${fe} ${me.join(" ")}`);
        this.process = this.spawnLocalProcess(Te);
      }
      this.processStdin = this.process.stdin;
      this.processStdout = this.process.stdout;
      this.processStdin.on("error", (M) => {
        appendTaskOutput_2(
          `[ProcessTransport] stdin write failed (child likely exited): ${M.code ?? M.message}`,
        );
        this.ready = false;
      });
      Ie.track(this.process);
      this.abortHandler = () => this.close();
      this.abortController.signal.addEventListener("abort", this.abortHandler);
      if (this.abortController.signal.aborted) this.close();
      let ee = this.process;
      ee.on("error", (M) => {
        this.ready = false;
        let L = M;
        let j = L.syscall !== undefined ? L.syscall.startsWith("spawn") : isFsInaccessible(M);
        if (j && !ee.killed) Ie.untrack(ee);
        if (this.abortController.signal.aborted) {
          this.exitError = De();
          withTelemetryFacts(M, {
            telemetryMessage: "Claude Code process aborted by user",
            errorClass: "aborted",
          });
        } else if (j && isFsInaccessible(M)) {
          let { message, telemetryMessage, errorClass } = Xs(pathToClaudeCodeExecutable, ne);
          let he = {
            telemetryMessage: `${telemetryMessage}${et(M)}`,
            errorClass,
            code: sanitizeErrnoForTelemetry(M),
          };
          this.exitError = withTelemetryFacts(ReferenceError(message), he);
          withTelemetryFacts(M, he);
          appendTaskOutput_2(this.exitError.message);
        } else {
          let oe = {
            telemetryMessage: j
              ? `Failed to spawn Claude Code process${et(M)}`
              : `Claude Code process error${et(M)}`,
            errorClass: j ? "spawn_failed" : "process_error",
            code: sanitizeErrnoForTelemetry(M),
          };
          this.exitError = withTelemetryFacts(
            Error(`Failed to spawn Claude Code process: ${redactSecrets(M.message)}`),
            oe,
          );
          withTelemetryFacts(M, oe);
          appendTaskOutput_2(this.exitError.message);
        }
      });
      ee.on("exit", (M, L) => {
        this.exitEventDelivered = true;
        this.ready = false;
        if (this.abortController.signal.aborted) this.exitError = De();
        else {
          let j = this.getProcessExitError(M, L);
          if (j) {
            this.exitError = j;
            appendTaskOutput_2(j.message);
          }
        }
      });
      this.ready = !this.abortController.signal.aborted;
    } catch (error) {
      this.ready = false;
      throw error;
    }
  }
  getProcessExitError(e, s) {
    if (e !== 0 && e !== null) {
      let r = Number.isInteger(e) ? e : undefined;
      return withTelemetryFacts(
        Error(`Claude Code process exited with code ${e}${this.formatStderrTail()}`),
        {
          telemetryMessage: `Claude Code process exited with code ${r ?? "unknown"}`,
          errorClass: "process_exited_nonzero",
          exitCode: r,
        },
      );
    } else if (s) {
      let r = /^SIG[A-Z0-9]{1,8}$/.test(s) ? s : "unknown";
      return withTelemetryFacts(
        Error(`Claude Code process terminated by signal ${s}${this.formatStderrTail()}`),
        {
          telemetryMessage: `Claude Code process terminated by signal ${r}`,
          errorClass: "process_killed_by_signal",
          signal: r,
        },
      );
    }
    return;
  }
  formatStderrTail() {
    let trimmed = takeLastChars(redactSecrets(this.stderrTail), Ye).trim();
    return trimmed ? `. stderr: ${trimmed}` : "";
  }
  write(e) {
    if (this.abortController.signal.aborted) throw At();
    if (this.spawnResolve) {
      this.pendingWrites.push(e);
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
          errorClass: xt(this.exitError, "errorClass"),
          code: sanitizeErrnoForTelemetry(this.exitError),
          exitCode: Js(this.exitError),
          signal: xt(this.exitError, "signal"),
        },
      );
    appendTaskOutput_2(`[ProcessTransport] Writing to stdin: ${e.substring(0, 100)}`);
    try {
      if (!this.processStdin.write(e))
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
    this.spawnAbort(this.abortController.signal.aborted ? De() : Error("Query closed before spawn"));
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
    let r = !this.exitEventDelivered && ((exitCode !== null && exitCode >= 0) || signalCode !== null);
    let n;
    if (r) {
      this.exitEventDelivered = true;
      n = this.abortController.signal.aborted ? De() : this.getProcessExitError(exitCode, signalCode);
      if (n && !this.exitError) this.exitError = n;
    }
    let exitListeners = this.exitListeners;
    this.exitListeners = [];
    for (let { callback, handler } of exitListeners) {
      this.process?.off("exit", handler);
      if (r)
        try {
          callback(n);
        } catch (error) {
          appendTaskOutput_2(
            `[ProcessTransport] onExit callback threw during close(): ${errorMessage(error)}`,
          );
        }
    }
    let m = () => {
      if (this.abortController.signal.aborted) this.forwardedAbort.abort(this.abortController.signal.reason);
    };
    let l = this.process;
    if (l && !l.killed && l.exitCode === null && l.signalCode == null) {
      setTimeout(
        (h, S) => {
          if (h.exitCode !== null || h.signalCode != null) {
            S();
            return;
          }
          h.kill("SIGTERM");
          setTimeout(
            (y) => {
              if (y.exitCode === null) y.kill("SIGKILL");
            },
            5000,
            h,
          ).unref();
          S();
        },
        Bs,
        l,
        m,
      ).unref();
      l.once("exit", () => Ie.untrack(l));
    } else if (l) {
      Ie.untrack(l);
      m();
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
    let e = createInterface({
      input: this.processStdout,
    });
    let s = this.process
      ? (() => {
          let r = this.process;
          let n = () => e.close();
          r.on("error", n);
          return () => r.off("error", n);
        })()
      : undefined;
    if (this.exitError) e.close();
    try {
      for await (let r of e)
        if (r.trim()) {
          let n;
          try {
            n = jsonParse(r);
          } catch (error) {
            appendTaskOutput_2(`Non-JSON stdout: ${r}`);
            continue;
          }
          yield n;
        }
      if (this.exitError) throw this.exitError;
      await this.waitForExit();
    } finally {
      s?.();
      e.close();
    }
  }
  endInput() {
    if (this.spawnResolve) {
      this.pendingEndInput = true;
      return;
    }
    if (this.processStdin) this.processStdin.end();
  }
  onExit(e) {
    if (!this.process) return () => {};
    let s = (r, n) => {
      let i = this.getProcessExitError(r, n);
      e(i);
    };
    this.process.on("exit", s);
    this.exitListeners.push({
      callback: e,
      handler: s,
    });
    return () => {
      if (this.process) this.process.off("exit", s);
      let index = this.exitListeners.findIndex((exitListener) => exitListener.handler === s);
      if (index !== -1) this.exitListeners.splice(index, 1);
    };
  }
  async waitForExit() {
    if (this.exitError) throw this.exitError;
    if (!this.process || this.process.exitCode === 0 || (this.process.killed && this.exitEventDelivered))
      return;
    return new Promise((resolve, reject) => {
      let r = (i, m) => {
        if (this.abortController.signal.aborted) {
          reject(At());
          return;
        }
        let l = this.getProcessExitError(i, m);
        if (l) reject(l);
        else resolve();
      };
      this.process.once("exit", r);
      let n = (i) => {
        this.process.off("exit", r);
        reject(i);
      };
      this.process.once("error", n);
      this.process.once("exit", () => {
        this.process.off("error", n);
      });
    });
  }
}
//@ chunk-y805ph4h.js:22612-22694 placement
function Qs(pathToClaudeCodeExecutable) {
  return ![".js", ".mjs", ".tsx", ".ts", ".jsx"].some((r) => pathToClaudeCodeExecutable.endsWith(r));
}
//@ chunk-y805ph4h.js:22694-23678 placement
function Xs(pathToClaudeCodeExecutable, s) {
  let r = s ? "native binary" : "executable";
  let n = redactSecrets(pathToClaudeCodeExecutable);
  if (existsSync(pathToClaudeCodeExecutable))
    return {
      message: s
        ? `Claude Code native binary at ${n} exists but failed to launch. This usually means the binary does not match this system's libc \u2014 e.g. spawning a musl-linked binary on a glibc Linux host fails because the musl dynamic loader (/lib/ld-musl-*) is missing. Specify a matching binary with options.pathToClaudeCodeExecutable.`
        : `Claude Code executable at ${n} exists but failed to launch.`,
      telemetryMessage: `Claude Code ${r} exists at the configured path but failed to launch`,
      errorClass: "executable_launch_failed",
    };
  return {
    message: s
      ? `Claude Code native binary not found at ${n}. Please ensure Claude Code is installed via native installer or specify a valid path with options.pathToClaudeCodeExecutable.`
      : `Claude Code executable not found at ${n}. Is options.pathToClaudeCodeExecutable set?`,
    telemetryMessage: `Claude Code ${r} not found at the configured path`,
    errorClass: "executable_not_found",
  };
}
//@ chunk-y805ph4h.js:23678-23736 placement
function et(e) {
  let s = sanitizeErrnoForTelemetry(e);
  return s === undefined ? "" : ` (${s})`;
}
//@ chunk-y805ph4h.js:23736-23886 placement
function De() {
  return withTelemetryFacts(new HookConfigError("Claude Code process aborted by user"), {
    telemetryMessage: "Claude Code process aborted by user",
    errorClass: "aborted",
  });
}
//@ chunk-y805ph4h.js:23886-24000 placement
function At() {
  return withTelemetryFacts(new HookConfigError("Operation aborted"), {
    telemetryMessage: "Operation aborted",
    errorClass: "aborted",
  });
}
//@ chunk-y805ph4h.js:24000-24102 placement
function xt(exitError, s) {
  let r = Object.hasOwn(exitError, s) ? Reflect.get(exitError, s) : undefined;
  return typeof r === "string" ? r : undefined;
}
//@ chunk-y805ph4h.js:24102-24220 placement
function Js(exitError) {
  let s = Object.hasOwn(exitError, "exitCode") ? Reflect.get(exitError, "exitCode") : undefined;
  return typeof s === "number" ? s : undefined;
}
//@ chunk-y805ph4h.js:24220-24285 placement
function Ys(stderr) {
  return typeof Reflect.get(stderr, "unref") === "function";
}
//@ chunk-y805ph4h.js:24318-24358 placement
var ae = "@anthropic-ai/claude-agent-sdk";
//@ chunk-y805ph4h.js:24358-24511 placement
function er() {
  let e = typeof process.report?.getReport === "function" ? process.report.getReport() : null;
  return e != null && e.header?.glibcVersionRuntime === undefined;
}
//@ chunk-y805ph4h.js:24511-24935 placement
function Lt(e, s = {}) {
  let platform = s.platform ?? "linux";
  let arch = s.arch ?? "x64";
  let exists = s.exists ?? existsSync;
  let m = s.preferMusl ?? er();
  let SDK_NATIVE_BIN = process.env.SDK_NATIVE_BIN ?? "claude";
  let h = platform === "win32" ? ".exe" : "";
  let mapped = (
    platform === "android"
      ? [`${ae}-linux-${arch}-android`]
      : platform === "linux"
        ? m
          ? [`${ae}-linux-${arch}-musl`, `${ae}-linux-${arch}`]
          : [`${ae}-linux-${arch}`, `${ae}-linux-${arch}-musl`]
        : [`${ae}-${platform}-${arch}`]
  ).map((w) => `${w}/${SDK_NATIVE_BIN}${h}`);
  for (let w of mapped)
    try {
      let b = e(w);
      if (exists(b)) return b;
    } catch {}
  return null;
}
//@ chunk-y805ph4h.js:24935-25223 placement
function $t({ supportedDialogKinds, onUserDialog }) {
  if (supportedDialogKinds !== undefined && supportedDialogKinds.length > 0 && !onUserDialog)
    throw Error(
      "supportedDialogKinds requires an onUserDialog callback -- declaring dialog kinds without a handler would park dialogs nothing can answer. Provide onUserDialog, or omit supportedDialogKinds.",
    );
}
//@ chunk-y805ph4h.js:25223-25298 placement
var Ft = 250;
var SDK_MANIFEST_CAPTURE = "sdk-manifest-capture:";
var le = Symbol("suppressControlResponse");
//@ chunk-y805ph4h.js:25298-25477 placement
function Nt(e, s, ignored) {
  for (let n of ignored) {
    let i = n === "tools" ? inspectToolsList(s) : undefined;
    logForDebugging(
      i
        ? `[Query] MCP server '${e}': ${describeToolsListIssues(i)}`
        : `[Query] MCP server '${e}': ignoring malformed ${n} in its config`,
    );
  }
}
export { le, SDK_MANIFEST_CAPTURE, Ft, Nt, $t, Lt, ProcessTransport };
