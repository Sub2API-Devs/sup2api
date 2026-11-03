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
import { getStorageDir } from "../../../services/analytics/firstPartyEventLoggingExporter.js";
import { EMPTY_HOOKS_INDEX, TELEMETRY_HOOKS_SCAN } from "./index.js";

//@ chunk-4m46mxx9.js:18436-19121 placement
/**
 * 收集遥测发送上下文（事实、部署、配置位置、环境、仓库、版本）。
 */
async function collectSenderContext(e, isInteractive) {
  let [r, i, env, a, o, c, E] = await Promise.all([
    e.facts(),
    e.deployment(),
    e.configLocation(),
    e.environment(),
    e.cwd().catch(() => {
      return;
    }),
    e.repo().catch(() => null),
    e.version().catch((error) => {
      e.debug(
        `telemetry: the engine's version is not readable here, so the version columns stay empty (${errorText(error)})`,
      );
      return;
    }),
  ]);
  let [claudeJsonIdentity, machineFacts, b, T] = await Promise.all([
    readClaudeJsonIdentity(e.read, env, a.userType === "ant"),
    readMachineFacts(e.run, r),
    o === undefined ? undefined : detectVcs_2(e.list, o, r.hasP4Port),
    hashGitRemote(c?.remote),
  ]);
  let linuxDistroFacts = await readLinuxDistroFacts(e, machineFacts.platformRaw === "linux");
  return {
    facts: r,
    signals: [...i, ...linuxDistroFacts.fileSignals],
    identity: claudeJsonIdentity,
    machine: machineFacts,
    platform: detectTerminal(r.hostPlatform, machineFacts.platformRaw),
    isInteractive,
    distro: linuxDistroFacts.distro,
    wslVersion: linuxDistroFacts.wslVersion,
    vcs: b,
    remoteHash: T,
    engine: E,
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
  let t = agentSdkVersion === undefined || agentSdkVersion === "unknown";
  let r = /^\d{1,8}\.\d{1,8}\.\d{1,8}(?!\d)/.exec(agentSdkVersion ?? "")?.[0];
  return t ? agentSdkVersion : (r ?? "other");
}
//@ chunk-4m46mxx9.js:19322-19547 placement
/**
 * 会话事实（客户端类型、入口、SDK 版本、SWE-bench id）。
 */
var sessionFacts = (facts) => ({
  clientType: resolveEntrypoint(facts),
  entrypoint: sanitizeSdkName(facts.entrypoint),
  agentSdkVersion: normalizeSdkVersion(facts.agentSdkVersion),
  sweBenchRunId: facts.sweBenchRunId || undefined,
  sweBenchInstanceId: facts.sweBenchInstanceId || undefined,
  sweBenchTaskId: facts.sweBenchTaskId || undefined,
});
//@ chunk-4m46mxx9.js:19547-19680 placement
/**
 * 构建发送上下文（身份、会话、环境、远程哈希）。
 */
async function buildSenderContext(e, isInteractive) {
  let senderContext = await collectSenderContext(e, isInteractive);
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
var telemetryGate = (e, t) => (t.called ? t(e) : TELEMETRY_NOT_FOR_PLUGINS);
//@ chunk-4m46mxx9.js:19785-19811 placement
/**
 * builtin/core
 */
var TRUSTED_PLUGIN_TIERS = ["builtin", "core"];
//@ chunk-4m46mxx9.js:19811-19949 placement
/**
 * 只允许受信任层级的插件调用遥测，否则返回空操作。
 */
function requireTrustedOrigin(e, t) {
  if (t.origin?.tier === undefined) throw Error("$.telemetry: the call names no origin");
  return TRUSTED_PLUGIN_TIERS.includes(t.origin.tier) ? t(e) : TELEMETRY_NOT_FOR_PLUGINS;
}
//@ chunk-4m46mxx9.js:19949-21579 placement
/**
 * 创建遥测发送器（缓存上下文、按策略批量发送）。
 */
function createTelemetrySender(e) {
  let t = [];
  let r;
  let i;
  let n;
  let resolved = Promise.resolve();
  function o() {
    let f =
      i ??
      e
        .isInteractive()
        .then((l) => buildSenderContext(e, l))
        .catch((error) => {
          i = undefined;
          throw error;
        });
    i = f;
    return f;
  }
  async function c() {
    try {
      let [f, l] = await Promise.all([e.environment(), e.policy()]);
      return isTelemetryDisabled(f, l) ? undefined : f;
    } catch (error) {
      e.debug(
        `telemetry: the analytics switches could not be read, so nothing is sent (${errorText(error)})`,
      );
      return;
    }
  }
  async function E() {
    if (await c()) await o();
  }
  let p = (body, auth) =>
    e.fetch(EVENT_LOG_BATCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-name": "claude-code",
      },
      auth,
      body,
    });
  async function u(body, auth) {
    let g;
    try {
      g = await p(body, auth);
    } catch {
      g = undefined;
    }
    let C = g !== undefined && (g.ok || !isRetryableStatus(g.status));
    if (g !== undefined && C) return g;
    await e.sleep(MAX_RETRY_AFTER_MS);
    return p(body, auth);
  }
  async function b(f) {
    let l = await c();
    if (!l) return;
    let g = await e.authorize();
    if (!g) throw Error("this session has no first-party credential to authorize");
    let C = await o();
    let Be = await u(
      serializeEventBatch(f, {
        sessionId: await e.id(),
        model: await e.model(),
        userType: l.userType === "ant" ? "ant" : "external",
        isInteractive: await e.isInteractive(),
        isClaudeAiAuth: g.kind === "bearer" && C.identity.accountUuid !== undefined,
        context: C,
      }),
      g.handle,
    );
    if (!Be.ok) throw Error(`the ingest answered ${Be.status}`);
    e.debug(`telemetry: sent ${f.length} row(s)`);
  }
  function T() {
    r?.cancel();
    r = undefined;
    let f = t;
    t = [];
    if (f.length === 0) return resolved;
    resolved = resolved.then(() =>
      b(f).catch((error) => {
        e.debug(`telemetry: ${f.length} row(s) not sent: ` + errorText(error));
      }),
    );
    return resolved;
  }
  function S(fields) {
    n ??= E().catch(() => {
      return;
    });
    t.push({
      fields,
      eventId: crypto.randomUUID(),
      loggedAt: new Date().toISOString(),
    });
    if (t.length >= MAX_BATCH_EVENTS) {
      T();
      return;
    }
    r ??= e.after(SEND_TIMEOUT_MS, () => void T());
  }
  return {
    telemetry: {
      log: async (f) => S(validateLogEntry(f)),
      mark: async (f) => S(validateMarkEntry(f)),
    },
    flush: T,
  };
}
//@ chunk-4m46mxx9.js:21579-28602 placement
/**
 * 遥测插件的 hooks：处理 telemetry.*、log、mark 事件。
 */
function telemetryHooks(e) {
  let t;
  let r;
  e("telemetry.*", (i, n, a) => requireTrustedOrigin(n, a)).catch((error, n, a) => telemetryGate(n, a));
  e("telemetry.log", (i, n, a) =>
    t === undefined || n.to === "collector" ? a(n) : settleDeny(t.telemetry.log(n)),
  );
  e("telemetry.mark", (i, n, a) => (t === undefined ? a(n) : settleDeny(t.telemetry.mark(n))));
  e("session.start", (i, n, a) => {
    r = n.isInteractive;
    return a(n);
  });
  e("session.end", async (i, n, a) => {
    await t?.flush();
    return a(n);
  });
  e("engine.create", async (i, n, a) => {
    let o = await a(n);
    t = createTelemetrySender({
      authorize: () => o.session.authorize(),
      id: () => o.session.id(),
      model: () => o.session.model(),
      isInteractive: async () => r ?? (await o.session.surfaces()).includes("terminal"),
      environment: async () => ({
        userType: await o.env.get("USER_TYPE"),
        nodeEnv: await o.env.get("NODE_ENV"),
        disableTelemetry: await o.env.get("DISABLE_TELEMETRY"),
        disableNonessentialTraffic: await o.env.get("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"),
        doNotTrack: await o.env.get("DO_NOT_TRACK"),
        customOauthUrl: await o.env.get("CLAUDE_CODE_CUSTOM_OAUTH_URL"),
        useGateway: await o.env.get("CLAUDE_CODE_USE_GATEWAY"),
        providerManagedByHost: await o.env.get("CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST"),
        useBedrock: await o.env.get("CLAUDE_CODE_USE_BEDROCK"),
        useVertex: await o.env.get("CLAUDE_CODE_USE_VERTEX"),
        useFoundry: await o.env.get("CLAUDE_CODE_USE_FOUNDRY"),
        useAnthropicAws: await o.env.get("CLAUDE_CODE_USE_ANTHROPIC_AWS"),
        useAnthropicGoogleCloud: await o.env.get("CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD"),
        useMantle: await o.env.get("CLAUDE_CODE_USE_MANTLE"),
      }),
      policy: () =>
        o.settings.read({
          source: "policy",
        }),
      facts: async () => ({
        entrypoint: await o.env.get("CLAUDE_CODE_ENTRYPOINT"),
        agentSdkVersion: await o.env.get("CLAUDE_AGENT_SDK_VERSION"),
        hostPlatform: await o.env.get("CLAUDE_CODE_HOST_PLATFORM"),
        os: await o.env.get("OS"),
        processorArchitecture: await o.env.get("PROCESSOR_ARCHITECTURE"),
        shellPath: (await o.env.get("SHELL")) ?? (await o.env.get("COMSPEC")),
        ci: await o.env.get("CI"),
        claubbit: await o.env.get("CLAUBBIT"),
        githubActions: await o.env.get("GITHUB_ACTIONS"),
        claudeCodeAction: await o.env.get("CLAUDE_CODE_ACTION"),
        claudeCodeRemote: await o.env.get("CLAUDE_CODE_REMOTE"),
        remoteEnvironmentType: await o.env.get("CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE"),
        containerId: await o.env.get("CLAUDE_CODE_CONTAINER_ID"),
        remoteSessionId: await o.env.get("CLAUDE_CODE_REMOTE_SESSION_ID"),
        tags: await o.env.get("CLAUDE_CODE_TAGS"),
        hasSessionAccessToken: isNonEmpty(await o.env.get("CLAUDE_CODE_SESSION_ACCESS_TOKEN")),
        hasSessionIngressTokenFile: isNonEmpty(await o.env.get("CLAUDE_SESSION_INGRESS_TOKEN_FILE")),
        hasWebsocketAuthFileDescriptor: isNonEmpty(
          await o.env.get("CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR"),
        ),
        githubEventName: await o.env.get("GITHUB_EVENT_NAME"),
        runnerEnvironment: await o.env.get("RUNNER_ENVIRONMENT"),
        runnerOs: await o.env.get("RUNNER_OS"),
        githubActionPath: await o.env.get("GITHUB_ACTION_PATH"),
        githubActorId: await o.env.get("GITHUB_ACTOR_ID"),
        githubRepositoryId: await o.env.get("GITHUB_REPOSITORY_ID"),
        githubRepositoryOwnerId: await o.env.get("GITHUB_REPOSITORY_OWNER_ID"),
        sweBenchRunId: await o.env.get("SWE_BENCH_RUN_ID"),
        sweBenchInstanceId: await o.env.get("SWE_BENCH_INSTANCE_ID"),
        sweBenchTaskId: await o.env.get("SWE_BENCH_TASK_ID"),
        hasP4Port: isNonEmpty(await o.env.get("P4PORT")),
        wslDistroName: await o.env.get("WSL_DISTRO_NAME"),
        hasCursorTraceId: isNonEmpty(await o.env.get("CURSOR_TRACE_ID")),
        vscodeGitAskpassMain: await o.env.get("VSCODE_GIT_ASKPASS_MAIN"),
        bundleIdentifier: await o.env.get("__CFBundleIdentifier"),
        hasVisualStudioVersion: isNonEmpty(await o.env.get("VisualStudioVersion")),
        terminalEmulator: await o.env.get("TERMINAL_EMULATOR"),
        term: await o.env.get("TERM"),
        termProgram: await o.env.get("TERM_PROGRAM"),
        hasTmux: isNonEmpty(await o.env.get("TMUX")),
        hasSty: isNonEmpty(await o.env.get("STY")),
        hasKonsoleVersion: isNonEmpty(await o.env.get("KONSOLE_VERSION")),
        hasGnomeTerminalService: isNonEmpty(await o.env.get("GNOME_TERMINAL_SERVICE")),
        hasXtermVersion: isNonEmpty(await o.env.get("XTERM_VERSION")),
        hasVteVersion: isNonEmpty(await o.env.get("VTE_VERSION")),
        hasTerminatorUuid: isNonEmpty(await o.env.get("TERMINATOR_UUID")),
        hasKittyWindowId: isNonEmpty(await o.env.get("KITTY_WINDOW_ID")),
        hasAlacrittyLog: isNonEmpty(await o.env.get("ALACRITTY_LOG")),
        hasTilixId: isNonEmpty(await o.env.get("TILIX_ID")),
        hasWtSession: isNonEmpty(await o.env.get("WT_SESSION")),
        hasSessionName: isNonEmpty(await o.env.get("SESSIONNAME")),
        msystem: await o.env.get("MSYSTEM"),
        hasConEmuAnsi: isNonEmpty(await o.env.get("ConEmuANSI")),
        hasConEmuPid: isNonEmpty(await o.env.get("ConEmuPID")),
        hasConEmuTask: isNonEmpty(await o.env.get("ConEmuTask")),
        hasSshConnection: isNonEmpty(await o.env.get("SSH_CONNECTION")),
        hasSshClient: isNonEmpty(await o.env.get("SSH_CLIENT")),
        hasSshTty: isNonEmpty(await o.env.get("SSH_TTY")),
      }),
      deployment: async () => [
        ["codespaces", isEnvTruthy(await o.env.get("CODESPACES"))],
        ["gitpod", isNonEmpty(await o.env.get("GITPOD_WORKSPACE_ID"))],
        ["coder", isEnvTruthy(await o.env.get("CODER"))],
        ["coder", isNonEmpty(await o.env.get("CODER_WORKSPACE_NAME"))],
        ["devpod", isEnvTruthy(await o.env.get("DEVPOD"))],
        ["devpod", isNonEmpty(await o.env.get("DEVPOD_WORKSPACE_UID"))],
        ["daytona", isNonEmpty(await o.env.get("DAYTONA_WS_ID"))],
        ["gcp-cloud-workstations", isEnvTruthy(await o.env.get("GOOGLE_CLOUD_WORKSTATIONS"))],
        ["aws-cloud9", isNonEmpty(await o.env.get("C9_PID"))],
        ["aws-cloud9", isNonEmpty(await o.env.get("C9_USER"))],
        ["replit", isNonEmpty(await o.env.get("REPL_ID"))],
        ["replit", isNonEmpty(await o.env.get("REPL_SLUG"))],
        ["glitch", isNonEmpty(await o.env.get("PROJECT_DOMAIN"))],
        ["vercel", isEnvTruthy(await o.env.get("VERCEL"))],
        ["railway", isNonEmpty(await o.env.get("RAILWAY_ENVIRONMENT_NAME"))],
        ["railway", isNonEmpty(await o.env.get("RAILWAY_SERVICE_NAME"))],
        ["render", isEnvTruthy(await o.env.get("RENDER"))],
        ["netlify", isEnvTruthy(await o.env.get("NETLIFY"))],
        ["heroku", isNonEmpty(await o.env.get("DYNO"))],
        ["fly.io", isNonEmpty(await o.env.get("FLY_APP_NAME"))],
        ["fly.io", isNonEmpty(await o.env.get("FLY_MACHINE_ID"))],
        ["cloudflare-pages", isEnvTruthy(await o.env.get("CF_PAGES"))],
        ["deno-deploy", isNonEmpty(await o.env.get("DENO_DEPLOYMENT_ID"))],
        ["aws-lambda", isNonEmpty(await o.env.get("AWS_LAMBDA_FUNCTION_NAME"))],
        ["aws-fargate", (await o.env.get("AWS_EXECUTION_ENV")) === "AWS_ECS_FARGATE"],
        ["aws-ecs", (await o.env.get("AWS_EXECUTION_ENV")) === "AWS_ECS_EC2"],
        ["gcp-cloud-run", isNonEmpty(await o.env.get("K_SERVICE"))],
        ["gcp", isNonEmpty(await o.env.get("GOOGLE_CLOUD_PROJECT"))],
        ["azure-app-service", isNonEmpty(await o.env.get("WEBSITE_SITE_NAME"))],
        ["azure-app-service", isNonEmpty(await o.env.get("WEBSITE_SKU"))],
        ["azure-functions", isNonEmpty(await o.env.get("AZURE_FUNCTIONS_ENVIRONMENT"))],
        [
          "digitalocean-app-platform",
          isNonEmpty(await o.env.get("APP_URL")) &&
            String(await o.env.get("APP_URL")).includes("ondigitalocean.app"),
        ],
        ["huggingface-spaces", isNonEmpty(await o.env.get("SPACE_CREATOR_USER_ID"))],
        ["github-actions", isEnvTruthy(await o.env.get("GITHUB_ACTIONS"))],
        ["gitlab-ci", isEnvTruthy(await o.env.get("GITLAB_CI"))],
        ["circleci", isNonEmpty(await o.env.get("CIRCLECI"))],
        ["buildkite", isNonEmpty(await o.env.get("BUILDKITE"))],
        ["ci", isEnvTruthy(await o.env.get("CI"))],
        ["kubernetes", isNonEmpty(await o.env.get("KUBERNETES_SERVICE_HOST"))],
      ],
      configLocation: async () => ({
        configDir: await o.env.get("CLAUDE_CONFIG_DIR"),
        home: await o.env.get("HOME"),
        userProfile: await o.env.get("USERPROFILE"),
      }),
      cwd: () => o.session.cwd(),
      repo: () => o.session.repo(),
      version: async () => o.session.version(),
      read: (p) => o.fs.read(p),
      list: (p) => o.fs.list(p),
      exists: (p) => o.fs.exists(p),
      run: (p) =>
        o.process.run(p, {
          timeoutMs: GIT_COMMAND_TIMEOUT_MS,
        }),
      fetch: (p, u) => o.http.fetch(p, u),
      after: (p, u) => o.clock.after(p, u),
      sleep: (p) => o.clock.sleep(p),
      debug: (p) =>
        o.ui.log(p, {
          to: "debug",
        }),
    });
    return {
      ...{
        telemetry: t.telemetry,
      },
      ...o,
    };
  });
}
//@ chunk-4m46mxx9.js:28602-28669 placement
/**
 * 注册遥测内置插件
 */
function registerTelemetryPlugin() {
  let hooksModule = builtinHooksModuleRef(getModsFolderPath(getStorageDir), EMPTY_HOOKS_INDEX, () =>
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
