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
import { existsSync, existsSync as existsSync_2 } from "fs";
import { DoctorLazy } from "../../../src/cli/handlers/util.js";
import { u, o } from "../../zod/v4/classic/schemas.js";
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
import { RC, mxr, wrn } from "../../../src/services/selfHostedRunner/childArgs.js";
import { It } from "./transcriptMirror.js";
import { HookConfigError } from "../../../src/schemas/hooks.js";
import { inspectToolsList, describeToolsListIssues } from "../../../src/services/mcp/serverIdentity.js";

//@ chunk-y805ph4h.js:5498-5594 placement
var Go = DoctorLazy(() =>
  u({ session_id: o(), ws_url: o(), work_dir: o().optional(), session_key: o().optional() }),
);
//@ chunk-y805ph4h.js:6155-6227 placement
function Us(e) {
  let trimmed = e.trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}");
}
//@ chunk-y805ph4h.js:6227-6493 placement
var Ls = new Set([
    "filesystem.denyRead",
    "filesystem.denyWrite",
    "network.deniedDomains",
    "credentials.files",
    "credentials.envVars",
  ]),
  $s = new Set(["ripgrep", "network.tlsTerminate"]),
  Fs = new Set(["__proto__", "constructor", "prototype"]),
  Ns = ["httpProxyPort", "socksProxyPort"];
//@ chunk-y805ph4h.js:6493-6798 placement
function Dt(e, s, r = "") {
  let n = isPlainObject(e) ? { ...e } : {};
  for (let [i, m] of Object.entries(s)) {
    if (Fs.has(i) || m === void 0) continue;
    let l = r ? `${r}.${i}` : i,
      h = Object.hasOwn(n, i) ? n[i] : void 0;
    if (Ls.has(l) && Array.isArray(h) && Array.isArray(m)) n[i] = uniq([...h, ...m]);
    else if (isPlainObject(h) && isPlainObject(m) && !$s.has(l)) n[i] = Dt(h, m, l);
    else n[i] = m;
  }
  return n;
}
//@ chunk-y805ph4h.js:6798-7567 placement
function Ot(e, s) {
  let r = { ...e };
  if (!s) return r;
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
  let m = Dt(i.sandbox, s),
    l = s.credentials?.files,
    h = s.filesystem !== void 0 || (Array.isArray(l) && l.some((R) => isPlainObject(R) && R.mode === "deny")),
    filesystem = m.filesystem;
  if (h && s.filesystem?.disabled === void 0 && isPlainObject(filesystem) && filesystem.disabled === !0)
    delete filesystem.disabled;
  let network = s.network,
    w =
      network?.allowedDomains !== void 0 ||
      (network?.deniedDomains?.length ?? 0) > 0 ||
      network?.strictAllowlist === !0,
    network_2 = m.network;
  if (w && isPlainObject(network_2)) {
    for (let R of Ns) if (network?.[R] === void 0 && network_2[R] !== void 0) delete network_2[R];
  }
  if (s.enabled === !0 && m.failIfUnavailable === void 0) m.failIfUnavailable = !0;
  return ((r.settings = jsonStringify({ ...i, sandbox: m })), r);
}
//@ chunk-y805ph4h.js:7567-7629 placement
var Bs = 2000,
  Ye = 2048,
  SDK_EXIT_AFTER_STDERR_DRAINED = "sdk-exit-after-stderr-drained",
  Gs = 200;
//@ chunk-y805ph4h.js:7629-7667 placement
function Ze(e) {
  return e === "exit" ? SDK_EXIT_AFTER_STDERR_DRAINED : e;
}
//@ chunk-y805ph4h.js:7667-8011 placement
class Ut {
  #e = new Set();
  #t = !1;
  #s = () => this.killAll();
  track(e) {
    if ((this.#e.add(e), !this.#t)) ((this.#t = !0), process.on("exit", this.#s));
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
    (process.off("exit", this.#s), (this.#t = !1), this.#e.clear());
  }
}
//@ chunk-y805ph4h.js:8011-8062 placement
var Ie = new Ut(),
  Ws = /[(),\u0000-\u001f\u007f-\u009f]/;
//@ chunk-y805ph4h.js:8062-10030 placement
function Vs(e) {
  if (typeof e !== "string" || e.trim() === "") throw Error("Skill names must be non-empty strings.");
  if (!isWellFormedString(e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(e)}: the name contains an unpaired surrogate, which cannot survive the UTF-8 encoding of the CLI invocation; no skill discovered from the filesystem can have such a name.`,
      "skill name with unpaired surrogate rejected",
    );
  if (e !== e.trim())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(e)}: leading or trailing whitespace is not allowed \u2014 the Skill tool trims the invoked name, so a padded rule can never match. Remove the padding.`,
      "skill name with surrounding whitespace rejected",
    );
  if (Ws.test(e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(e)}: parentheses, commas, and control characters are not allowed in skill names. Skill names match the skill's directory name (or 'plugin:skill' for plugin-qualified skills); rename the skill if its directory name contains these characters.`,
      "invalid skill name rejected",
    );
  if (e === "*") throw Error("Invalid skill name '*': use skills: 'all' to enable every skill.");
  if (e.endsWith(":*") || e.endsWith(" *"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(e)}: wildcard-suffix names are not allowed; list each skill by its exact name.`,
      "wildcard-suffix skill name rejected",
    );
  if (e.startsWith("/"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(e)}: skill names may not start with '/'. Skills are invoked as slash commands, but the skills option takes the skill's canonical name \u2014 the directory name, or 'plugin:skill'.`,
      "skill name with leading slash rejected",
    );
  if (e.includes("\\\\"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(e)}: consecutive backslashes are not allowed \u2014 the permission-rule parser collapses escaped backslashes, so the rule would name a different skill. Rename the skill.`,
      "skill name with consecutive backslashes rejected",
    );
  if (e.endsWith("\\"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid skill name ${jsonStringify(e)}: names may not end with an unpaired backslash.`,
      "skill name with unpaired trailing backslash rejected",
    );
  return e;
}
/**
 * Agent SDK 的 ProcessTransport：以子进程方式启动 Claude Code（stream-json 输入输出），负责参数/环境组装、stdin 写入、stdout 行解析与进程退出处理。
 */
//@ chunk-y805ph4h.js:10030-22612 placement
class ProcessTransport {
  options;
  process;
  processStdin;
  processStdout;
  ready = !1;
  abortController;
  exitError;
  exitEventDelivered = !1;
  stderrTail = "";
  exitListeners = [];
  abortHandler;
  forwardedAbort = createAbortController();
  pendingWrites = [];
  pendingEndInput = !1;
  spawnResolve;
  spawnReject;
  spawnPromise;
  constructor(e) {
    this.options = e;
    if (((this.abortController = e.abortController || createAbortController()), e.deferSpawn))
      ((this.spawnPromise = new Promise((s, r) => {
        ((this.spawnResolve = s), (this.spawnReject = r));
      })),
        this.spawnPromise.catch(() => {}));
    else this.initialize();
  }
  spawn() {
    try {
      this.initialize();
    } catch (error) {
      throw (this.spawnAbort(toError(error)), error);
    }
    let pendingWrites = this.pendingWrites;
    if (((this.pendingWrites = []), this.spawnResolve))
      (this.spawnResolve(), (this.spawnResolve = void 0), (this.spawnReject = void 0));
    for (let s of pendingWrites) this.write(s);
    if (this.pendingEndInput) ((this.pendingEndInput = !1), this.processStdin?.end());
  }
  spawnAbort(e) {
    if (this.spawnReject)
      (this.spawnReject(e),
        (this.spawnReject = void 0),
        (this.spawnResolve = void 0),
        (this.pendingWrites = []));
  }
  updateEnv(e) {
    if (this.options.env) Object.assign(this.options.env, e);
    else this.options.env = { ...e };
  }
  updateResume(e) {
    this.options.resume = e;
  }
  getDefaultExecutable() {
    return alwaysTrue() ? "bun" : "node";
  }
  spawnLocalProcess(e) {
    let { command: command, args: args, cwd: cwd, env: env, signal: signal } = e,
      l = spawn(command, args, {
        cwd: cwd,
        stdio: ["pipe", "pipe", "pipe"],
        signal: signal,
        env: env,
        windowsHide: !0,
      });
    if (l.pid !== void 0 && this.options.onProcessSpawned)
      try {
        this.options.onProcessSpawned(l.pid);
      } catch (error) {
        appendTaskOutput_2(`onProcessSpawned threw: ${errorMessage(error)}`);
      }
    let h = new StringDecoder("utf8"),
      S = !1,
      y = !1,
      w = !1,
      b,
      R = isEnvTruthy(env.DEBUG_CLAUDE_AGENT_SDK) || this.options.stderr !== void 0;
    (l.stderr.on("data", (P) => {
      if (w) return;
      let write = h.write(P);
      if (((this.stderrTail += write), this.stderrTail.length > 2 * Ye))
        this.stderrTail = takeLastChars(redactSecrets(this.stderrTail), Ye);
      if (R) (appendTaskOutput_2(write), this.options.stderr?.(write));
    }),
      l.stderr.on("error", (P) => {
        appendTaskOutput_2(`[ProcessTransport] stderr read failed: ${P.code ?? P.message}`);
      }));
    let T = () => {
      if (w) return;
      if (((w = !0), b)) clearTimeout(b);
      l.emit(SDK_EXIT_AFTER_STDERR_DRAINED, l.exitCode, l.signalCode);
      let stderr = l.stderr;
      if (Ys(stderr)) stderr.unref();
      else stderr.destroy();
    };
    return (
      l.stderr.once("close", () => {
        if (((this.stderrTail += h.end()), (S = !0), y)) T();
      }),
      l.once("exit", () => {
        if (((y = !0), (this.ready = !1), S)) T();
        else b = setTimeout(T, Gs);
      }),
      {
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
      }
    );
  }
  initialize() {
    try {
      let {
          additionalDirectories: additionalDirectories = [],
          projectConfigRoot: projectConfigRoot,
          agent: agent,
          betas: betas,
          cwd: cwd,
          executable: executable = this.getDefaultExecutable(),
          executableArgs: executableArgs = [],
          extraArgs: extraArgs = {},
          pathToClaudeCodeExecutable: pathToClaudeCodeExecutable,
          env: env = { ...process.env },
          thinkingConfig: thinkingConfig,
          maxTurns: maxTurns,
          maxBudgetUsd: maxBudgetUsd,
          taskBudget: taskBudget,
          model: model,
          fallbackModel: fallbackModel,
          jsonSchema: jsonSchema,
          permissionMode: permissionMode,
          allowDangerouslySkipPermissions: allowDangerouslySkipPermissions,
          permissionPromptToolName: permissionPromptToolName,
          permissionPrompts: permissionPrompts,
          continueConversation: continueConversation,
          resume: resume,
          settingSources: settingSources,
          skills: skills,
          disallowedTools: disallowedTools = [],
          tools: tools,
          mcpServers: mcpServers,
          strictMcpConfig: strictMcpConfig,
          canUseTool: canUseTool,
          includePartialMessages: includePartialMessages,
          plugins: plugins,
          pluginsViaInitialize: pluginsViaInitialize,
          sandbox: sandbox,
        } = this.options,
        { allowedTools: allowedTools = [] } = this.options;
      if (skills !== void 0) {
        let M = skills === "all" ? ["Skill"] : skills.map((j) => `Skill(${Vs(j)})`),
          L = new Set(allowedTools);
        allowedTools = [...allowedTools, ...M.filter((j) => !L.has(j))];
      }
      let v = ["--output-format", "stream-json", "--verbose", "--input-format", "stream-json"];
      if (thinkingConfig) {
        switch (thinkingConfig.type) {
          case "enabled":
            if (thinkingConfig.budgetTokens === void 0) v.push("--thinking=adaptive");
            else v.push(RC("--max-thinking-tokens", thinkingConfig.budgetTokens));
            break;
          case "disabled":
            v.push("--thinking=disabled");
            break;
          case "adaptive":
            v.push("--thinking=adaptive");
            break;
        }
        if (thinkingConfig.type !== "disabled" && thinkingConfig.display)
          v.push(RC("--thinking-display", thinkingConfig.display));
      }
      if (this.options.effort) v.push(RC("--effort", this.options.effort));
      if (maxTurns) v.push(RC("--max-turns", maxTurns));
      if (maxBudgetUsd !== void 0) v.push(RC("--max-budget-usd", maxBudgetUsd));
      if (taskBudget) v.push(RC("--task-budget", taskBudget.total));
      if (model) v.push(RC("--model", model));
      if (agent) v.push(RC("--agent", agent));
      if (betas && betas.length > 0) v.push(RC("--betas", betas.join(",")));
      if (jsonSchema) v.push(RC("--json-schema", jsonStringify(jsonSchema)));
      if (this.options.debugFile) v.push(RC("--debug-file", this.options.debugFile));
      else if (this.options.debug) v.push("--debug");
      if (!this.options.debugFile && !this.options.spawnClaudeCodeProcess) {
        let M = It();
        if (M) v.push(RC("--debug-file", M));
      }
      if (canUseTool) {
        if (permissionPromptToolName)
          throw Error(
            "canUseTool callback cannot be used with permissionPromptToolName. Please use one or the other.",
          );
        v.push("--permission-prompt-tool=stdio");
      } else if (permissionPromptToolName) v.push(RC("--permission-prompt-tool", permissionPromptToolName));
      if (permissionPrompts) v.push(RC("--permission-prompts", permissionPrompts));
      if (continueConversation) v.push("--continue");
      if (resume) v.push(RC("--resume", resume));
      if (allowedTools.length > 0) v.push(RC("--allowedTools", allowedTools.join(",")));
      if (disallowedTools.length > 0) v.push(RC("--disallowedTools", disallowedTools.join(",")));
      if (tools !== void 0)
        if (Array.isArray(tools)) v.push(RC("--tools", tools.join(",")));
        else v.push("--tools=default");
      if (mcpServers && Object.keys(mcpServers).length > 0)
        v.push(...mxr("--mcp-config", jsonStringify({ mcpServers: mcpServers })));
      if (settingSources !== void 0) v.push(RC("--setting-sources", settingSources.join(",")));
      if (strictMcpConfig) v.push("--strict-mcp-config");
      if (permissionMode) v.push(RC("--permission-mode", permissionMode));
      if (allowDangerouslySkipPermissions) v.push("--allow-dangerously-skip-permissions");
      if (fallbackModel) {
        if (model && fallbackModel === model)
          throw Error(
            "Fallback model cannot be the same as the main model. Please specify a different model for fallbackModel option.",
          );
        v.push(RC("--fallback-model", fallbackModel));
      }
      if (this.options.includeHookEvents) v.push("--include-hook-events");
      if (includePartialMessages) v.push("--include-partial-messages");
      if (this.options.sessionMirror) v.push("--session-mirror");
      if (projectConfigRoot !== void 0) v.push(RC("--project-config-root", projectConfigRoot));
      for (let M of additionalDirectories) v.push(RC("--add-dir", M));
      if (pluginsViaInitialize) v.push("--await-initialize");
      else if (plugins && plugins.length > 0)
        for (let M of plugins)
          if (M.type === "local")
            v.push(M.skipMcpDiscovery ? RC("--plugin-dir-no-mcp", M.path) : RC("--plugin-dir", M.path));
          else throw Error(`Unsupported plugin type: ${M.type}`);
      if (this.options.forkSession) v.push("--fork-session");
      if (this.options.resumeSessionAt) v.push(RC("--resume-session-at", this.options.resumeSessionAt));
      if (this.options.resumeDropsTurn !== void 0)
        v.push(RC("--resume-drops-turn", this.options.resumeDropsTurn));
      if (this.options.sessionId) v.push(RC("--session-id", this.options.sessionId));
      if (this.options.persistSession === !1) v.push("--no-session-persistence");
      if (this.options.managedSettings) v.push(...mxr("--managed-settings", this.options.managedSettings));
      let Z = { ...(extraArgs ?? {}) };
      if (this.options.settings) Z.settings = this.options.settings;
      let Ke = Ot(Z, sandbox);
      for (let [M, L] of Object.entries(Ke))
        if (L === null) v.push(`--${M}`);
        else wrn(v, M, L);
      if (!env.CLAUDE_CODE_ENTRYPOINT) env.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";
      if ((delete env.NODE_OPTIONS, isEnvTruthy(env.DEBUG_CLAUDE_AGENT_SDK))) env.DEBUG = "1";
      else delete env.DEBUG;
      let ne = Qs(pathToClaudeCodeExecutable),
        fe = ne ? pathToClaudeCodeExecutable : executable,
        me = ne ? [...executableArgs, ...v] : [...executableArgs, pathToClaudeCodeExecutable, ...v],
        Te = { command: fe, args: me, cwd: cwd, env: env, signal: this.forwardedAbort.signal };
      if (this.options.spawnClaudeCodeProcess)
        (appendTaskOutput_2(`Spawning Claude Code (custom): ${fe} ${me.join(" ")}`),
          (this.process = this.options.spawnClaudeCodeProcess(Te)));
      else
        (appendTaskOutput_2(`Spawning Claude Code: ${fe} ${me.join(" ")}`),
          (this.process = this.spawnLocalProcess(Te)));
      if (
        ((this.processStdin = this.process.stdin),
        (this.processStdout = this.process.stdout),
        this.processStdin.on("error", (M) => {
          (appendTaskOutput_2(
            `[ProcessTransport] stdin write failed (child likely exited): ${M.code ?? M.message}`,
          ),
            (this.ready = !1));
        }),
        Ie.track(this.process),
        (this.abortHandler = () => this.close()),
        this.abortController.signal.addEventListener("abort", this.abortHandler),
        this.abortController.signal.aborted)
      )
        this.close();
      let ee = this.process;
      (ee.on("error", (M) => {
        this.ready = !1;
        let L = M,
          j = L.syscall !== void 0 ? L.syscall.startsWith("spawn") : isFsInaccessible(M);
        if (j && !ee.killed) Ie.untrack(ee);
        if (this.abortController.signal.aborted)
          ((this.exitError = De()),
            withTelemetryFacts(M, {
              telemetryMessage: "Claude Code process aborted by user",
              errorClass: "aborted",
            }));
        else if (j && isFsInaccessible(M)) {
          let {
              message: message,
              telemetryMessage: telemetryMessage,
              errorClass: errorClass,
            } = Xs(pathToClaudeCodeExecutable, ne),
            he = {
              telemetryMessage: `${telemetryMessage}${et(M)}`,
              errorClass: errorClass,
              code: sanitizeErrnoForTelemetry(M),
            };
          ((this.exitError = withTelemetryFacts(ReferenceError(message), he)),
            withTelemetryFacts(M, he),
            appendTaskOutput_2(this.exitError.message));
        } else {
          let oe = {
            telemetryMessage: j
              ? `Failed to spawn Claude Code process${et(M)}`
              : `Claude Code process error${et(M)}`,
            errorClass: j ? "spawn_failed" : "process_error",
            code: sanitizeErrnoForTelemetry(M),
          };
          ((this.exitError = withTelemetryFacts(
            Error(`Failed to spawn Claude Code process: ${redactSecrets(M.message)}`),
            oe,
          )),
            withTelemetryFacts(M, oe),
            appendTaskOutput_2(this.exitError.message));
        }
      }),
        ee.on("exit", (M, L) => {
          if (((this.exitEventDelivered = !0), (this.ready = !1), this.abortController.signal.aborted))
            this.exitError = De();
          else {
            let processExitError = this.getProcessExitError(M, L);
            if (processExitError)
              ((this.exitError = processExitError), appendTaskOutput_2(processExitError.message));
          }
        }),
        (this.ready = !this.abortController.signal.aborted));
    } catch (error) {
      throw ((this.ready = !1), error);
    }
  }
  getProcessExitError(e, s) {
    if (e !== 0 && e !== null) {
      let r = Number.isInteger(e) ? e : void 0;
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
      throw ((this.ready = !1), Error(`Failed to write to process stdin: ${errorMessage(error)}`));
    }
  }
  [Symbol.dispose]() {
    this.close();
  }
  close() {
    if (
      (this.spawnAbort(this.abortController.signal.aborted ? De() : Error("Query closed before spawn")),
      this.processStdin)
    )
      (this.processStdin.end(), (this.processStdin = void 0));
    if (this.abortHandler)
      (this.abortController.signal.removeEventListener("abort", this.abortHandler),
        (this.abortHandler = void 0));
    let e = this.process?.exitCode ?? null,
      s = this.process?.signalCode ?? null,
      r = !this.exitEventDelivered && ((e !== null && e >= 0) || s !== null),
      n;
    if (r) {
      if (
        ((this.exitEventDelivered = !0),
        (n = this.abortController.signal.aborted ? De() : this.getProcessExitError(e, s)),
        n && !this.exitError)
      )
        this.exitError = n;
    }
    let exitListeners = this.exitListeners;
    this.exitListeners = [];
    for (let { callback: callback, handler: handler } of exitListeners)
      if ((this.process?.off("exit", handler), r))
        try {
          callback(n);
        } catch (error) {
          appendTaskOutput_2(
            `[ProcessTransport] onExit callback threw during close(): ${errorMessage(error)}`,
          );
        }
    let m = () => {
        if (this.abortController.signal.aborted)
          this.forwardedAbort.abort(this.abortController.signal.reason);
      },
      l = this.process;
    if (l && !l.killed && l.exitCode === null && l.signalCode == null)
      (setTimeout(
        (h, S) => {
          if (h.exitCode !== null || h.signalCode != null) {
            S();
            return;
          }
          (h.kill("SIGTERM"),
            setTimeout(
              (y) => {
                if (y.exitCode === null) y.kill("SIGKILL");
              },
              5000,
              h,
            ).unref(),
            S());
        },
        Bs,
        l,
        m,
      ).unref(),
        l.once("exit", () => Ie.untrack(l)));
    else if (l) (Ie.untrack(l), m());
    this.ready = !1;
  }
  isReady() {
    return this.ready;
  }
  async *readMessages() {
    if (this.spawnPromise) (await this.spawnPromise, (this.spawnPromise = void 0));
    if (!this.processStdout) throw Error("ProcessTransport output stream not available");
    if (this.exitError) throw this.exitError;
    let e = createInterface({ input: this.processStdout }),
      s = this.process
        ? (() => {
            let r = this.process,
              n = () => e.close();
            return (r.on("error", n), () => r.off("error", n));
          })()
        : void 0;
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
      (s?.(), e.close());
    }
  }
  endInput() {
    if (this.spawnResolve) {
      this.pendingEndInput = !0;
      return;
    }
    if (this.processStdin) this.processStdin.end();
  }
  onExit(e) {
    if (!this.process) return () => {};
    let s = (r, n) => {
      let processExitError = this.getProcessExitError(r, n);
      e(processExitError);
    };
    return (
      this.process.on("exit", s),
      this.exitListeners.push({ callback: e, handler: s }),
      () => {
        if (this.process) this.process.off("exit", s);
        let index = this.exitListeners.findIndex((exitListener) => exitListener.handler === s);
        if (index !== -1) this.exitListeners.splice(index, 1);
      }
    );
  }
  async waitForExit() {
    if (this.exitError) throw this.exitError;
    if (!this.process || this.process.exitCode === 0 || (this.process.killed && this.exitEventDelivered))
      return;
    return new Promise((e, s) => {
      let r = (i, m) => {
        if (this.abortController.signal.aborted) {
          s(At());
          return;
        }
        let processExitError = this.getProcessExitError(i, m);
        if (processExitError) s(processExitError);
        else e();
      };
      this.process.once("exit", r);
      let n = (i) => {
        (this.process.off("exit", r), s(i));
      };
      (this.process.once("error", n),
        this.process.once("exit", () => {
          this.process.off("error", n);
        }));
    });
  }
}
//@ chunk-y805ph4h.js:22612-22694 placement
function Qs(e) {
  return ![".js", ".mjs", ".tsx", ".ts", ".jsx"].some((r) => e.endsWith(r));
}
//@ chunk-y805ph4h.js:22694-23678 placement
function Xs(e, s) {
  let r = s ? "native binary" : "executable",
    n = redactSecrets(e);
  if (existsSync(e))
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
  return s === void 0 ? "" : ` (${s})`;
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
function xt(e, s) {
  let r = Object.hasOwn(e, s) ? Reflect.get(e, s) : void 0;
  return typeof r === "string" ? r : void 0;
}
//@ chunk-y805ph4h.js:24102-24220 placement
function Js(e) {
  let s = Object.hasOwn(e, "exitCode") ? Reflect.get(e, "exitCode") : void 0;
  return typeof s === "number" ? s : void 0;
}
//@ chunk-y805ph4h.js:24220-24285 placement
function Ys(e) {
  return typeof Reflect.get(e, "unref") === "function";
}
//@ chunk-y805ph4h.js:24318-24358 placement
var ae = "@anthropic-ai/claude-agent-sdk";
//@ chunk-y805ph4h.js:24358-24511 placement
function er() {
  let e = typeof process.report?.getReport === "function" ? process.report.getReport() : null;
  return e != null && e.header?.glibcVersionRuntime === void 0;
}
//@ chunk-y805ph4h.js:24511-24935 placement
function Lt(e, s = {}) {
  let r = s.platform ?? "linux",
    n = s.arch ?? "x64",
    i = s.exists ?? existsSync_2,
    m = s.preferMusl ?? er(),
    l = process.env.SDK_NATIVE_BIN ?? "claude",
    h = r === "win32" ? ".exe" : "",
    mapped = (
      r === "android"
        ? [`${ae}-linux-${n}-android`]
        : r === "linux"
          ? m
            ? [`${ae}-linux-${n}-musl`, `${ae}-linux-${n}`]
            : [`${ae}-linux-${n}`, `${ae}-linux-${n}-musl`]
          : [`${ae}-${r}-${n}`]
    ).map((w) => `${w}/${l}${h}`);
  for (let w of mapped)
    try {
      let b = e(w);
      if (i(b)) return b;
    } catch {}
  return null;
}
//@ chunk-y805ph4h.js:24935-25223 placement
function $t({ supportedDialogKinds: supportedDialogKinds, onUserDialog: onUserDialog }) {
  if (supportedDialogKinds !== void 0 && supportedDialogKinds.length > 0 && !onUserDialog)
    throw Error(
      "supportedDialogKinds requires an onUserDialog callback -- declaring dialog kinds without a handler would park dialogs nothing can answer. Provide onUserDialog, or omit supportedDialogKinds.",
    );
}
//@ chunk-y805ph4h.js:25223-25298 placement
var Ft = 250,
  SDK_MANIFEST_CAPTURE = "sdk-manifest-capture:",
  le = Symbol("suppressControlResponse");
//@ chunk-y805ph4h.js:25298-25477 placement
function Nt(e, s, r) {
  for (let n of r) {
    let i = n === "tools" ? inspectToolsList(s) : void 0;
    logForDebugging(
      i
        ? `[Query] MCP server '${e}': ${describeToolsListIssues(i)}`
        : `[Query] MCP server '${e}': ignoring malformed ${n} in its config`,
    );
  }
}

export { le, SDK_MANIFEST_CAPTURE, Ft, Nt, $t, Lt, ProcessTransport };
