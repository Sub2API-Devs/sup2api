/**
 * plugins/bundled/telemetry/sender.ts
 *
 * 2.1.316 新增：遥测插件的 hooks：处理 telemetry.*、log、mark 事件；创建遥测发送器（缓存上下文、按策略批量发送）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4m46mxx9.js (12)
 * attribution: placement 12
 */
import {
  errorText,
  resolveEntrypoint,
  isTelemetryDisabled,
  EVENT_LOG_BATCH_URL,
  isRetryableStatus,
  MAX_RETRY_AFTER_MS,
  serializeEventBatch,
  MAX_BATCH_EVENTS,
  SEND_TIMEOUT_MS,
  validateLogEntry,
  validateMarkEntry,
  settleDeny,
  isNonEmpty,
  isEnvTruthy,
  TELEMETRY_PLUGIN,
} from "./eventSchema.js";
import {
  readClaudeJsonIdentity,
  readMachineFacts,
  hashGitRemote,
  readLinuxDistroFacts,
  detectTerminal,
  describeEnvironment,
  GIT_COMMAND_TIMEOUT_MS,
} from "./environment.js";
import { detectVcs_2 } from "../../../utils/platform.js";
import { builtinHooksModuleRef, getModsFolderPath, registerBuiltinPlugin } from "../../builtinPlugins.js";
import { MOD_FOLDER } from "../../../services/analytics/firstPartyEventLoggingExporter.js";
import { EMPTY_HOOKS_INDEX, TELEMETRY_HOOKS_SCAN } from "./index.js";

//@ chunk-4m46mxx9.js:18436-19121 placement
/**
 * 收集遥测发送上下文（事实、部署、配置位置、环境、仓库、版本）。
 */
async function collectSenderContext(host, isInteractive) {
  let [facts, deploymentSignals, env, environment, cwd, repo, engineVersion] = await Promise.all([
    host.facts(),
    host.deployment(),
    host.configLocation(),
    host.environment(),
    host.cwd().catch(() => {
      return;
    }),
    host.repo().catch(() => null),
    host.version().catch((error) => {
      host.debug(
        `telemetry: the engine's version is not readable here, so the version columns stay empty (${errorText(error)})`,
      );
      return;
    }),
  ]);
  let [claudeJsonIdentity, machineFacts, vcs, remoteHash] = await Promise.all([
    readClaudeJsonIdentity(host.read, env, environment.userType === "ant"),
    readMachineFacts(host.run, facts),
    cwd === undefined ? undefined : detectVcs_2(host.list, cwd, facts.hasP4Port),
    hashGitRemote(repo?.remote),
  ]);
  let linuxDistroFacts = await readLinuxDistroFacts(host, machineFacts.platformRaw === "linux");
  return {
    facts,
    signals: [...deploymentSignals, ...linuxDistroFacts.fileSignals],
    identity: claudeJsonIdentity,
    machine: machineFacts,
    platform: detectTerminal(facts.hostPlatform, machineFacts.platformRaw),
    isInteractive,
    distro: linuxDistroFacts.distro,
    wslVersion: linuxDistroFacts.wslVersion,
    vcs,
    remoteHash,
    engine: engineVersion,
  };
}
//@ chunk-4m46mxx9.js:19121-19199 placement
/**
 * SDK 名不合规记为 other
 */
function sanitizeSdkName(entrypoint) {
  return entrypoint === undefined || /^[a-z][a-z0-9_-]{0,39}$/.test(entrypoint) ? entrypoint : "other";
}
//@ chunk-4m46mxx9.js:19199-19322 placement
/**
 * SDK 版本只保留 x.y.z，其他为 other。
 */
function normalizeSdkVersion(agentSdkVersion) {
  let isUnknown = agentSdkVersion === undefined || agentSdkVersion === "unknown";
  let match = /^\d{1,8}\.\d{1,8}\.\d{1,8}(?!\d)/.exec(agentSdkVersion ?? "")?.[0];
  return isUnknown ? agentSdkVersion : (match ?? "other");
}
//@ chunk-4m46mxx9.js:19322-19547 placement
/**
 * 会话事实（客户端类型、入口、SDK 版本、SWE-bench id）。
 */
var sessionFacts = (env) => ({
  clientType: resolveEntrypoint(env),
  entrypoint: sanitizeSdkName(env.entrypoint),
  agentSdkVersion: normalizeSdkVersion(env.agentSdkVersion),
  sweBenchRunId: env.sweBenchRunId || undefined,
  sweBenchInstanceId: env.sweBenchInstanceId || undefined,
  sweBenchTaskId: env.sweBenchTaskId || undefined,
});
//@ chunk-4m46mxx9.js:19547-19680 placement
/**
 * 构建发送上下文（身份、会话、环境、远程哈希）。
 */
async function buildSenderContext(host, isInteractive) {
  let senderContext = await collectSenderContext(host, isInteractive);
  return {
    identity: senderContext.identity,
    session: sessionFacts(senderContext.facts),
    environment: describeEnvironment(senderContext),
    remoteHash: senderContext.remoteHash,
  };
}
//@ chunk-4m46mxx9.js:19680-19755 placement
/**
 * 只有内置插件能调遥测
 */
var TELEMETRY_NOT_FOR_PLUGINS = {
  deny: "$.telemetry serves the plugins built into Claude Code alone",
};
//@ chunk-4m46mxx9.js:19755-19785 placement
/**
 * 未注册时返回固定拒绝
 */
var telemetryGate = (payload, next) => (next.called ? next(payload) : TELEMETRY_NOT_FOR_PLUGINS);
//@ chunk-4m46mxx9.js:19785-19811 placement
/**
 * builtin/core
 */
var TRUSTED_PLUGIN_TIERS = ["builtin", "core"];
//@ chunk-4m46mxx9.js:19811-19949 placement
/**
 * 只允许受信任层级的插件调用遥测，否则返回空操作。
 */
function requireTrustedOrigin(payload, next) {
  if (next.origin?.tier === undefined) throw Error("$.telemetry: the call names no origin");
  return TRUSTED_PLUGIN_TIERS.includes(next.origin.tier) ? next(payload) : TELEMETRY_NOT_FOR_PLUGINS;
}
//@ chunk-4m46mxx9.js:19949-21579 placement
/**
 * 创建遥测发送器（缓存上下文、按策略批量发送）。
 */
function createTelemetrySender(host) {
  let batch = [];
  let sendTimer;
  let contextPromise;
  let armedPromise;
  let resolved = Promise.resolve();
  function getContext() {
    let promise =
      contextPromise ??
      host
        .isInteractive()
        .then((isInteractive) => buildSenderContext(host, isInteractive))
        .catch((error) => {
          contextPromise = undefined;
          throw error;
        });
    contextPromise = promise;
    return promise;
  }
  async function readEnvironment() {
    try {
      let [env, policy] = await Promise.all([host.environment(), host.policy()]);
      return isTelemetryDisabled(env, policy) ? undefined : env;
    } catch (error) {
      host.debug(
        `telemetry: the analytics switches could not be read, so nothing is sent (${errorText(error)})`,
      );
      return;
    }
  }
  async function arm() {
    if (await readEnvironment()) await getContext();
  }
  let post = (body, auth) =>
    host.fetch(EVENT_LOG_BATCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-name": "claude-code",
      },
      auth,
      body,
    });
  async function postWithRetry(body, auth) {
    let response;
    try {
      response = await post(body, auth);
    } catch {
      response = undefined;
    }
    let isSettled = response !== undefined && (response.ok || !isRetryableStatus(response.status));
    if (response !== undefined && isSettled) return response;
    await host.sleep(MAX_RETRY_AFTER_MS);
    return post(body, auth);
  }
  async function sendBatch(events) {
    let env = await readEnvironment();
    if (!env) return;
    let auth = await host.authorize();
    if (!auth) throw Error("this session has no first-party credential to authorize");
    let ctx = await getContext();
    let response = await postWithRetry(
      serializeEventBatch(events, {
        sessionId: await host.id(),
        model: await host.model(),
        userType: env.userType === "ant" ? "ant" : "external",
        isInteractive: await host.isInteractive(),
        isClaudeAiAuth: auth.kind === "bearer" && ctx.identity.accountUuid !== undefined,
        context: ctx,
      }),
      auth.handle,
    );
    if (!response.ok) throw Error(`the ingest answered ${response.status}`);
    host.debug(`telemetry: sent ${events.length} row(s)`);
  }
  function flush() {
    sendTimer?.cancel();
    sendTimer = undefined;
    let pending = batch;
    batch = [];
    if (pending.length === 0) return resolved;
    resolved = resolved.then(() =>
      sendBatch(pending).catch((error) => {
        host.debug(`telemetry: ${pending.length} row(s) not sent: ` + errorText(error));
      }),
    );
    return resolved;
  }
  function enqueue(fields) {
    armedPromise ??= arm().catch(() => {
      return;
    });
    batch.push({
      fields,
      eventId: crypto.randomUUID(),
      loggedAt: new Date().toISOString(),
    });
    if (batch.length >= MAX_BATCH_EVENTS) {
      flush();
      return;
    }
    sendTimer ??= host.after(SEND_TIMEOUT_MS, () => void flush());
  }
  return {
    telemetry: {
      log: async (entry) => enqueue(validateLogEntry(entry)),
      mark: async (entry) => enqueue(validateMarkEntry(entry)),
    },
    flush,
  };
}
//@ chunk-4m46mxx9.js:21579-28602 placement
/**
 * 遥测插件的 hooks：处理 telemetry.*、log、mark 事件。
 */
function telemetryHooks(on) {
  let sender;
  let isInteractive;
  on("telemetry.*", (ctx, payload, next) => requireTrustedOrigin(payload, next)).catch(
    (error, payload, next) => telemetryGate(payload, next),
  );
  on("telemetry.log", (ctx, payload, next) =>
    sender === undefined || payload.to === "collector"
      ? next(payload)
      : settleDeny(sender.telemetry.log(payload)),
  );
  on("telemetry.mark", (ctx, payload, next) =>
    sender === undefined ? next(payload) : settleDeny(sender.telemetry.mark(payload)),
  );
  on("session.start", (ctx, payload, next) => {
    isInteractive = payload.isInteractive;
    return next(payload);
  });
  on("session.end", async (ctx, payload, next) => {
    await sender?.flush();
    return next(payload);
  });
  on("engine.create", async (ctx, payload, next) => {
    let engine = await next(payload);
    sender = createTelemetrySender({
      authorize: () => engine.session.authorize(),
      id: () => engine.session.id(),
      model: () => engine.session.model(),
      isInteractive: async () => isInteractive ?? (await engine.session.surfaces()).includes("terminal"),
      environment: async () => ({
        userType: await engine.env.get("USER_TYPE"),
        nodeEnv: await engine.env.get("NODE_ENV"),
        disableTelemetry: await engine.env.get("DISABLE_TELEMETRY"),
        disableNonessentialTraffic: await engine.env.get("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"),
        doNotTrack: await engine.env.get("DO_NOT_TRACK"),
        customOauthUrl: await engine.env.get("CLAUDE_CODE_CUSTOM_OAUTH_URL"),
        useGateway: await engine.env.get("CLAUDE_CODE_USE_GATEWAY"),
        providerManagedByHost: await engine.env.get("CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST"),
        useBedrock: await engine.env.get("CLAUDE_CODE_USE_BEDROCK"),
        useVertex: await engine.env.get("CLAUDE_CODE_USE_VERTEX"),
        useFoundry: await engine.env.get("CLAUDE_CODE_USE_FOUNDRY"),
        useAnthropicAws: await engine.env.get("CLAUDE_CODE_USE_ANTHROPIC_AWS"),
        useAnthropicGoogleCloud: await engine.env.get("CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD"),
        useMantle: await engine.env.get("CLAUDE_CODE_USE_MANTLE"),
      }),
      policy: () =>
        engine.settings.read({
          source: "policy",
        }),
      facts: async () => ({
        entrypoint: await engine.env.get("CLAUDE_CODE_ENTRYPOINT"),
        agentSdkVersion: await engine.env.get("CLAUDE_AGENT_SDK_VERSION"),
        hostPlatform: await engine.env.get("CLAUDE_CODE_HOST_PLATFORM"),
        os: await engine.env.get("OS"),
        processorArchitecture: await engine.env.get("PROCESSOR_ARCHITECTURE"),
        shellPath: (await engine.env.get("SHELL")) ?? (await engine.env.get("COMSPEC")),
        ci: await engine.env.get("CI"),
        claubbit: await engine.env.get("CLAUBBIT"),
        githubActions: await engine.env.get("GITHUB_ACTIONS"),
        claudeCodeAction: await engine.env.get("CLAUDE_CODE_ACTION"),
        claudeCodeRemote: await engine.env.get("CLAUDE_CODE_REMOTE"),
        remoteEnvironmentType: await engine.env.get("CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE"),
        containerId: await engine.env.get("CLAUDE_CODE_CONTAINER_ID"),
        remoteSessionId: await engine.env.get("CLAUDE_CODE_REMOTE_SESSION_ID"),
        tags: await engine.env.get("CLAUDE_CODE_TAGS"),
        hasSessionAccessToken: isNonEmpty(await engine.env.get("CLAUDE_CODE_SESSION_ACCESS_TOKEN")),
        hasSessionIngressTokenFile: isNonEmpty(await engine.env.get("CLAUDE_SESSION_INGRESS_TOKEN_FILE")),
        hasWebsocketAuthFileDescriptor: isNonEmpty(
          await engine.env.get("CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR"),
        ),
        githubEventName: await engine.env.get("GITHUB_EVENT_NAME"),
        runnerEnvironment: await engine.env.get("RUNNER_ENVIRONMENT"),
        runnerOs: await engine.env.get("RUNNER_OS"),
        githubActionPath: await engine.env.get("GITHUB_ACTION_PATH"),
        githubActorId: await engine.env.get("GITHUB_ACTOR_ID"),
        githubRepositoryId: await engine.env.get("GITHUB_REPOSITORY_ID"),
        githubRepositoryOwnerId: await engine.env.get("GITHUB_REPOSITORY_OWNER_ID"),
        sweBenchRunId: await engine.env.get("SWE_BENCH_RUN_ID"),
        sweBenchInstanceId: await engine.env.get("SWE_BENCH_INSTANCE_ID"),
        sweBenchTaskId: await engine.env.get("SWE_BENCH_TASK_ID"),
        hasP4Port: isNonEmpty(await engine.env.get("P4PORT")),
        wslDistroName: await engine.env.get("WSL_DISTRO_NAME"),
        hasCursorTraceId: isNonEmpty(await engine.env.get("CURSOR_TRACE_ID")),
        vscodeGitAskpassMain: await engine.env.get("VSCODE_GIT_ASKPASS_MAIN"),
        bundleIdentifier: await engine.env.get("__CFBundleIdentifier"),
        hasVisualStudioVersion: isNonEmpty(await engine.env.get("VisualStudioVersion")),
        terminalEmulator: await engine.env.get("TERMINAL_EMULATOR"),
        term: await engine.env.get("TERM"),
        termProgram: await engine.env.get("TERM_PROGRAM"),
        hasTmux: isNonEmpty(await engine.env.get("TMUX")),
        hasSty: isNonEmpty(await engine.env.get("STY")),
        hasKonsoleVersion: isNonEmpty(await engine.env.get("KONSOLE_VERSION")),
        hasGnomeTerminalService: isNonEmpty(await engine.env.get("GNOME_TERMINAL_SERVICE")),
        hasXtermVersion: isNonEmpty(await engine.env.get("XTERM_VERSION")),
        hasVteVersion: isNonEmpty(await engine.env.get("VTE_VERSION")),
        hasTerminatorUuid: isNonEmpty(await engine.env.get("TERMINATOR_UUID")),
        hasKittyWindowId: isNonEmpty(await engine.env.get("KITTY_WINDOW_ID")),
        hasAlacrittyLog: isNonEmpty(await engine.env.get("ALACRITTY_LOG")),
        hasTilixId: isNonEmpty(await engine.env.get("TILIX_ID")),
        hasWtSession: isNonEmpty(await engine.env.get("WT_SESSION")),
        hasSessionName: isNonEmpty(await engine.env.get("SESSIONNAME")),
        msystem: await engine.env.get("MSYSTEM"),
        hasConEmuAnsi: isNonEmpty(await engine.env.get("ConEmuANSI")),
        hasConEmuPid: isNonEmpty(await engine.env.get("ConEmuPID")),
        hasConEmuTask: isNonEmpty(await engine.env.get("ConEmuTask")),
        hasSshConnection: isNonEmpty(await engine.env.get("SSH_CONNECTION")),
        hasSshClient: isNonEmpty(await engine.env.get("SSH_CLIENT")),
        hasSshTty: isNonEmpty(await engine.env.get("SSH_TTY")),
      }),
      deployment: async () => [
        ["codespaces", isEnvTruthy(await engine.env.get("CODESPACES"))],
        ["gitpod", isNonEmpty(await engine.env.get("GITPOD_WORKSPACE_ID"))],
        ["coder", isEnvTruthy(await engine.env.get("CODER"))],
        ["coder", isNonEmpty(await engine.env.get("CODER_WORKSPACE_NAME"))],
        ["devpod", isEnvTruthy(await engine.env.get("DEVPOD"))],
        ["devpod", isNonEmpty(await engine.env.get("DEVPOD_WORKSPACE_UID"))],
        ["daytona", isNonEmpty(await engine.env.get("DAYTONA_WS_ID"))],
        ["gcp-cloud-workstations", isEnvTruthy(await engine.env.get("GOOGLE_CLOUD_WORKSTATIONS"))],
        ["aws-cloud9", isNonEmpty(await engine.env.get("C9_PID"))],
        ["aws-cloud9", isNonEmpty(await engine.env.get("C9_USER"))],
        ["replit", isNonEmpty(await engine.env.get("REPL_ID"))],
        ["replit", isNonEmpty(await engine.env.get("REPL_SLUG"))],
        ["glitch", isNonEmpty(await engine.env.get("PROJECT_DOMAIN"))],
        ["vercel", isEnvTruthy(await engine.env.get("VERCEL"))],
        ["railway", isNonEmpty(await engine.env.get("RAILWAY_ENVIRONMENT_NAME"))],
        ["railway", isNonEmpty(await engine.env.get("RAILWAY_SERVICE_NAME"))],
        ["render", isEnvTruthy(await engine.env.get("RENDER"))],
        ["netlify", isEnvTruthy(await engine.env.get("NETLIFY"))],
        ["heroku", isNonEmpty(await engine.env.get("DYNO"))],
        ["fly.io", isNonEmpty(await engine.env.get("FLY_APP_NAME"))],
        ["fly.io", isNonEmpty(await engine.env.get("FLY_MACHINE_ID"))],
        ["cloudflare-pages", isEnvTruthy(await engine.env.get("CF_PAGES"))],
        ["deno-deploy", isNonEmpty(await engine.env.get("DENO_DEPLOYMENT_ID"))],
        ["aws-lambda", isNonEmpty(await engine.env.get("AWS_LAMBDA_FUNCTION_NAME"))],
        ["aws-fargate", (await engine.env.get("AWS_EXECUTION_ENV")) === "AWS_ECS_FARGATE"],
        ["aws-ecs", (await engine.env.get("AWS_EXECUTION_ENV")) === "AWS_ECS_EC2"],
        ["gcp-cloud-run", isNonEmpty(await engine.env.get("K_SERVICE"))],
        ["gcp", isNonEmpty(await engine.env.get("GOOGLE_CLOUD_PROJECT"))],
        ["azure-app-service", isNonEmpty(await engine.env.get("WEBSITE_SITE_NAME"))],
        ["azure-app-service", isNonEmpty(await engine.env.get("WEBSITE_SKU"))],
        ["azure-functions", isNonEmpty(await engine.env.get("AZURE_FUNCTIONS_ENVIRONMENT"))],
        [
          "digitalocean-app-platform",
          isNonEmpty(await engine.env.get("APP_URL")) &&
            String(await engine.env.get("APP_URL")).includes("ondigitalocean.app"),
        ],
        ["huggingface-spaces", isNonEmpty(await engine.env.get("SPACE_CREATOR_USER_ID"))],
        ["github-actions", isEnvTruthy(await engine.env.get("GITHUB_ACTIONS"))],
        ["gitlab-ci", isEnvTruthy(await engine.env.get("GITLAB_CI"))],
        ["circleci", isNonEmpty(await engine.env.get("CIRCLECI"))],
        ["buildkite", isNonEmpty(await engine.env.get("BUILDKITE"))],
        ["ci", isEnvTruthy(await engine.env.get("CI"))],
        ["kubernetes", isNonEmpty(await engine.env.get("KUBERNETES_SERVICE_HOST"))],
      ],
      configLocation: async () => ({
        configDir: await engine.env.get("CLAUDE_CONFIG_DIR"),
        home: await engine.env.get("HOME"),
        userProfile: await engine.env.get("USERPROFILE"),
      }),
      cwd: () => engine.session.cwd(),
      repo: () => engine.session.repo(),
      version: async () => engine.session.version(),
      read: (path) => engine.fs.read(path),
      list: (dir) => engine.fs.list(dir),
      exists: (path) => engine.fs.exists(path),
      run: (command) =>
        engine.process.run(command, {
          timeoutMs: GIT_COMMAND_TIMEOUT_MS,
        }),
      fetch: (url, options) => engine.http.fetch(url, options),
      after: (ms, fn) => engine.clock.after(ms, fn),
      sleep: (ms) => engine.clock.sleep(ms),
      debug: (text) =>
        engine.ui.log(text, {
          to: "debug",
        }),
    });
    return {
      ...{
        telemetry: sender.telemetry,
      },
      ...engine,
    };
  });
}
//@ chunk-4m46mxx9.js:28602-28669 placement
/**
 * 注册遥测内置插件
 */
function registerTelemetryPlugin() {
  let hooksModule = builtinHooksModuleRef(getModsFolderPath(MOD_FOLDER), EMPTY_HOOKS_INDEX, () =>
    TELEMETRY_HOOKS_SCAN(),
  );
  registerBuiltinPlugin({
    ...TELEMETRY_PLUGIN,
    hooksModule,
  });
}
export {
  registerTelemetryPlugin,
  TELEMETRY_NOT_FOR_PLUGINS,
  TRUSTED_PLUGIN_TIERS,
  telemetryGate,
  buildSenderContext,
  sanitizeSdkName,
  collectSenderContext,
  telemetryHooks,
  requireTrustedOrigin,
  sessionFacts,
  createTelemetrySender,
  normalizeSdkVersion,
};
