/**
 * entrypoints/cli.tsx
 *
 * 并入已有模块：CLI 主入口的分派默认值、cwd 可读检查、--desktop 判定等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/entrypoints/cli.tsx
 * pieces: cli.js (10)
 * attribution: placement 7, fingerprint 2, layout 1
 */
import { setAiAgentEnv } from "../utils/http.js";
import { parseGhStandinArgs } from "../utils/agentProxy/ghStandin.js";
import { validateHandleUriArgs } from "../utils/deepLink/handleUri.js";
import {
  getBuildRefSuffix,
  getDaemonArgs,
  parseEarlyArgs,
  earlyArgsToArgv,
  resolveEarlyArgPaths,
} from "../cli/earlyArgs.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { lit } from "../services/analytics/safeMetadata.js";

//@ cli.js:452-819 placement
/**
 * 检查当前目录是否可读：process.cwd() 抛错时返回给用户的错误文本（ENOENT 说明目录已被删除或移动），可读时返回 undefined。
 */
function checkCwdReadable() {
  try {
    process.cwd();
    return;
  } catch (error) {
    let code =
      error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : undefined;
    if (code === "ENOENT")
      return "The current directory no longer exists (it was deleted or moved). Start Claude Code from an existing directory.";
    return `Can't read the current directory${code ? ` (${code})` : ""}. Start Claude Code from a different directory.`;
  }
}
//@ cli.js:819-870 placement
process.env.NoDefaultCurrentDirectoryInExePath = "1";
//@ cli.js:870-911 fingerprint
/**
 * 入口副作用：设置 NoDefaultCurrentDirectoryInExePath=1（Windows 不在当前目录找可执行文件）与 COREPACK_ENABLE_AUTO_PIN=0。
 */
process.env.COREPACK_ENABLE_AUTO_PIN = "0";
//@ cli.js:911-917 layout
setAiAgentEnv();
//@ cli.js:917-1084 fingerprint
/**
 * CLAUDE_CODE_REMOTE=true（云端容器）时给 NODE_OPTIONS 追加 --max-old-space-size=8192。
 */
if (process.env.CLAUDE_CODE_REMOTE === "true") {
  let existing = process.env.NODE_OPTIONS || "";
  process.env.NODE_OPTIONS = existing ? `${existing} --max-old-space-size=8192` : "--max-old-space-size=8192";
}
//@ cli.js:1084-1336 placement (2.1.88 match: isDebugToStdErr, 0.489)
/**
 * 参数里是否只有调试类标志（--debug[=…]/-d/--debug-to-stderr/-d2e/--debug-file <path>）；用于判断“claude agents”或裸 claude 是否可以直接进入 agents 视图。
 */
function hasOnlyDebugFlags(args) {
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    if (
      arg === "--debug" ||
      arg === "-d" ||
      arg === "--debug-to-stderr" ||
      arg === "-d2e" ||
      arg.startsWith("--debug=") ||
      arg.startsWith("--debug-file=")
    )
      continue;
    if (arg === "--debug-file" && i + 1 < args.length) {
      i++;
      continue;
    }
    return false;
  }
  return true;
}
//@ cli.js:1336-1425 placement
/**
 * -- 之前是否出现 --desktop；后台/worktree 快速路径据此拒绝与 --desktop 组合。
 */
function hasDesktopFlag(args) {
  let index = args.indexOf("--");
  return (index === -1 ? args : args.slice(0, index)).includes("--desktop");
}
//@ cli.js:1425-2101 placement
/**
 * 从 agents 视图的剩余参数中拆出派发默认值：--permission-mode/--inherit-permission-mode/--dangerously-skip-permissions/--allow-dangerously-skip-permissions/--model/--effort/--agent，其余参数原样返回。
 */
function extractDispatchDefaults(args) {
  let permissionModeFlag;
  let inheritPermissionModeFlag;
  let modelFlag;
  let effortFlag;
  let agentFlag;
  let allowBypassFlag;
  let rest = [];
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    let index = arg.indexOf("=");
    let [flagName, inlineValue] = index > 0 ? [arg.slice(0, index), arg.slice(index + 1)] : [arg, undefined];
    let hasValue = inlineValue !== undefined || i + 1 < args.length;
    if (flagName === "--dangerously-skip-permissions") permissionModeFlag = "bypassPermissions";
    else if (flagName === "--allow-dangerously-skip-permissions") allowBypassFlag = true;
    else if (flagName === "--permission-mode" && hasValue) permissionModeFlag = inlineValue ?? args[++i];
    else if (flagName === "--inherit-permission-mode" && hasValue)
      inheritPermissionModeFlag = inlineValue ?? args[++i];
    else if (flagName === "--model" && hasValue) modelFlag = inlineValue ?? args[++i];
    else if (flagName === "--effort" && hasValue) effortFlag = inlineValue ?? args[++i];
    else if (flagName === "--agent" && hasValue) agentFlag = inlineValue ?? args[++i];
    else rest.push(arg);
  }
  let effectivePermissionMode = permissionModeFlag ?? inheritPermissionModeFlag;
  return {
    dispatchDefaults:
      effectivePermissionMode || modelFlag || effortFlag || agentFlag || allowBypassFlag
        ? {
            permissionMode: effectivePermissionMode,
            ...(!permissionModeFlag &&
              inheritPermissionModeFlag && {
                permissionModeInherited: true,
              }),
            model: modelFlag,
            effort: effortFlag,
            agent: agentFlag,
            allowBypass: allowBypassFlag,
          }
        : undefined,
    rest,
  };
}
//@ cli.js:2101-24195 placement
/**
 * CLI 进程入口（模块顶层直接调用）。按顺序处理：fd 令牌保护 → --gh-standin → --runner-declares → --handle-uri 校验 → --version 快速返回 → cwd 检查 → 各种专用子进程模式（--eval-mock-server、--claude-in-chrome-mcp、--chrome-native-host、--daemon-worker、--bg-pty-host、--bg-spare、--preload、remote-control、daemon、self-hosted-runner、plugin test）→ 后台会话动词与 --bg → agents 视图 → --tmux --worktree → 最后预读 MDM/钥匙串并动态导入主模块调用 main()。
 */
async function cliMain() {
  if (
    process.env.CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR !== undefined ||
    process.argv.includes("--session-tunnel")
  ) {
    let { guardRelayTokenDescriptor } = require("../bridge/guardRelayTokenDescriptor.lazy.js");
    guardRelayTokenDescriptor();
  }
  let ghStandinRequest = parseGhStandinArgs();
  if (ghStandinRequest === "refused") return;
  let runnerDeclaresArg = process.argv[2]?.startsWith("--runner-declares=")
    ? process.argv.splice(2, 1)[0]
    : undefined;
  let deepLinkArgError = validateHandleUriArgs(process.argv);
  if (deepLinkArgError) {
    console.error(deepLinkArgError);
    process.exit(1);
  }
  if (process.env.CLAUDE_CODE_REMOTE_SESSION_ORIGIN === "review") {
    let { guardRunnerReviewTokens } = require("../services/selfHostedRunner/guardRunnerReviewTokens.lazy.js");
    guardRunnerReviewTokens();
  }
  let { noteProcessStartTuning } = require("../utils/processStartTuning.js");
  noteProcessStartTuning();
  let { startGarbageCollectionCount } = require("../utils/gcCount.js");
  startGarbageCollectionCount();
  let { installCliArgvReader } = require("../utils/cliArgvReader.js");
  installCliArgvReader((arg) => require("../utils/cliArgs.js").cliFlagWords(arg));
  let args = process.argv.slice(2);
  if (
    (args.length === 1 || (args.length === 2 && args[1] === "--verbose")) &&
    (args[0] === "--version" || args[0] === "-v" || args[0] === "-V")
  ) {
    console.log(
      `${
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION
      } (Claude Code)${getBuildRefSuffix()}`,
    );
    if (
      args.length === 2 &&
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.GIT_SHA
    )
      console.log(
        `Commit: ${
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.GIT_SHA
        }`,
      );
    return;
  }
  let cwdError = checkCwdReadable();
  if (cwdError) {
    console.error(cwdError);
    let { writeStartupFailureResult } = await import("../cli/startupFailureResult.js");
    let { randomUUID } = await import("crypto");
    await writeStartupFailureResult({
      sessionId: randomUUID(),
      message: cwdError,
      reason: "cwd_unavailable",
    });
    process.exit(1);
  }
  if (runnerDeclaresArg !== undefined) {
    let { adoptRunnerDeclaration } = await import("../services/selfHostedRunner/runnerDeclaration.js");
    await adoptRunnerDeclaration(runnerDeclaresArg);
  }
  let { profileCheckpoint } = await import("../utils/startupProfiler.js");
  profileCheckpoint("cli_entry");
  let isWarmSpareLaunch = args[0] === "--preload" || args[0] === "--bg-spare";
  let storageV5EnvPin =
    !isWarmSpareLaunch && process.env.CLAUDE_CODE_HOVER_REST
      ? (await import("../utils/storage/storageV5EnvPin.js")).pinStorageV5FromEnv()
      : undefined;
  if (!isWarmSpareLaunch)
    setTimeout(() => {
      if (process.env.CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP)
        import("../utils/jitPolicy.js").then((jitModule) => jitModule.setJitPolicyAfterStartup());
      else if (typeof Bun !== "undefined") Bun.unsafe.setJITPolicy?.(1);
    }, 1e4).unref();
  if (ghStandinRequest !== undefined) {
    let { loadFastPathPolicy } = await import("../cli/fastPathSettings.js");
    let fastPathPolicy = await loadFastPathPolicy(storageV5EnvPin);
    if (fastPathPolicy) {
      let { exitWithError } = await import("../utils/process.js");
      exitWithError(fastPathPolicy);
    }
    let { ghStandinMain } = await import("../utils/github/ghStandinMain.lazy.js");
    await ghStandinMain(ghStandinRequest);
    return;
  }
  if (args[0] === "plugin" && args[1] === "test") {
    let [
      { loadFastPathPolicy },
      { pluginTestFormOf, pluginTestGatesOf, pluginTestRefusal },
      { endPluginTest },
    ] = await Promise.all([
      import("../cli/fastPathSettings.js"),
      import("../cli/handlers/pluginTest/IS_WORKTREE_LAUNCH.lazy.js"),
      import("../cli/handlers/pluginTest/default.lazy.js"),
    ]);
    let pluginTestRefusalText = pluginTestRefusal(
      await pluginTestGatesOf({
        helperError: await loadFastPathPolicy(storageV5EnvPin),
        form: pluginTestFormOf(args.slice(2)),
        envPin: storageV5EnvPin,
      }),
    );
    if (args[2] === "--file" && pluginTestRefusalText !== undefined) {
      let { REPORT_MARK } = await import("../cli/handlers/pluginTest/REPORT_MARK.lazy.js");
      process.stdout.write(`${REPORT_MARK}${JSON.stringify({
        file: args[3],
        results: [],
        error: pluginTestRefusalText,
      })}
`);
      return;
    }
    if (pluginTestRefusalText !== undefined) {
      process.stderr.write(`claude plugin test: ${pluginTestRefusalText}
`);
      process.exitCode = 1;
      return endPluginTest(process.exitCode);
    }
    let { pluginTestMain } = await import("../cli/handlers/pluginTest/CHILD_ARGV_LENGTH.lazy.js");
    process.exitCode = await pluginTestMain(args.slice(2));
    return endPluginTest(process.exitCode);
  }
  if (process.argv[2] === "--eval-mock-server") {
    profileCheckpoint("cli_eval_mock_server_path");
    let { runEvalMockServer } = await import("../cli/handlers/pluginEval/mockServer.js");
    try {
      await runEvalMockServer(process.argv[3], process.argv[4]);
    } catch (error) {
      console.error(`--eval-mock-server: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
    return;
  }
  if (process.argv[2] === "--claude-in-chrome-mcp") {
    profileCheckpoint("cli_claude_in_chrome_mcp_path");
    let { runClaudeInChromeMcpServer } = await import("../utils/claudeInChrome/mcpServer.js");
    await runClaudeInChromeMcpServer(storageV5EnvPin);
    return;
  } else if (process.argv[2] === "--chrome-native-host") {
    profileCheckpoint("cli_chrome_native_host_path");
    let { runChromeNativeHost } = await import("../utils/claudeInChrome/chromeNativeHost.js");
    await runChromeNativeHost();
    return;
  }
  if (args[0] === "--daemon-worker") {
    let { loadFastPathPolicy } = await import("../cli/fastPathSettings.js");
    let fastPathPolicy = await loadFastPathPolicy(storageV5EnvPin);
    if (fastPathPolicy)
      process.stderr.write(`${fastPathPolicy}
`);
    let { sessionFactsRestored } = await import("../utils/auth/default.lazy.js");
    let sessionFacts = await sessionFactsRestored(storageV5EnvPin);
    if (sessionFacts !== null) {
      let { endsInARowOf, workerEndingOf } = await import("../daemon/default.lazy.js");
      let workerEnding = workerEndingOf(sessionFacts, endsInARowOf(args[2]));
      process.stderr.write(workerEnding.said);
      process.exit(workerEnding.code);
    }
    let { runDaemonWorker } = await import("../daemon/runDaemonWorker.js");
    await runDaemonWorker(args[1], storageV5EnvPin);
    return;
  }
  if (args[0] === "--bg-pty-host") {
    let { ensureFastPathSettingsLoaded } = await import("../cli/fastPathSettings.js");
    try {
      await ensureFastPathSettingsLoaded(storageV5EnvPin);
    } catch (error) {
      process.stderr
        .write(`ptyHost: settings bootstrap threw (continuing; supervisor already gated): ${error?.stack ?? String(error)}
`);
    }
    let { runPtyHost } = await import("../cli/bg/runPtyHost.lazy.js");
    await runPtyHost(args.slice(1));
    return;
  }
  if (args[0] === "--bg-spare") {
    let { ensureFastPathSettingsLoaded } = await import("../cli/fastPathSettings.js");
    await ensureFastPathSettingsLoaded(undefined);
    let { runBgSpare } = await import("../services/daemon/spare.js");
    await runBgSpare(args.slice(1));
    return;
  }
  if (args[0] === "--preload") {
    let { ensureFastPathSettingsLoaded } = await import("../cli/fastPathSettings.js");
    await ensureFastPathSettingsLoaded(undefined);
    let { runPreload } = await import("../services/daemon/runPreload.lazy.js");
    await runPreload(args.slice(1));
    return;
  }
  if (
    args[0] === "remote-control" ||
    args[0] === "rc" ||
    args[0] === "remote" ||
    args[0] === "sync" ||
    args[0] === "bridge"
  ) {
    profileCheckpoint("cli_bridge_path");
    let [{ loadFastPathPolicy }, { markNoDialogLaunch }] = await Promise.all([
      import("../cli/fastPathSettings.js"),
      import("../bootstrap/state.js"),
    ]);
    markNoDialogLaunch();
    {
      let fastPathPolicy = await loadFastPathPolicy(storageV5EnvPin);
      if (fastPathPolicy) {
        let { exitWithError } = await import("../utils/process.js");
        exitWithError(fastPathPolicy);
      }
    }
    if (args.slice(1).some((arg) => arg === "--help" || arg === "-h")) {
      let { printRemoteControlHelp } = await import("../bridge/remoteControlHelp.js");
      await printRemoteControlHelp();
      return;
    }
    let { sessionFactsRestored } = await import("../utils/auth/default.lazy.js");
    let sessionFacts = await sessionFactsRestored(storageV5EnvPin);
    if (sessionFacts !== null) {
      let { exitWithError } = await import("../utils/process.js");
      exitWithError(sessionFacts.reason);
    }
    let { refuseRemoteControlLocally, refuseRemoteControlIneligible, startRemoteControl } =
      await import("../bridge/enterRemoteControl.lazy.js");
    let disabledReason = await refuseRemoteControlLocally();
    let [{ pinStorageV5 }, { seedInstallIDs }] = await Promise.all([
      import("../utils/storage/pinStorageV5.js"),
      import("../utils/config.js"),
    ]);
    let storageV5 = pinStorageV5(storageV5EnvPin);
    if (isStorageV5Enabled() && storageV5 !== undefined) {
      let [
        { credentialsStoreFor },
        { setGrowthBookCredentials, setGrowthBookStorageBackend },
        { composePolicyLimitsClient, primePolicyLimitsCache },
        { primeFastPathCredentials },
      ] = await Promise.all([
        import("../utils/secureStorage/credentialsFileStore.js"),
        import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
        import("../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js"),
        import("../utils/primeFastPathCredentials.lazy.js"),
      ]);
      let credentials = credentialsStoreFor(storageV5);
      setGrowthBookCredentials(credentials);
      setGrowthBookStorageBackend(storageV5);
      composePolicyLimitsClient({
        storageV5,
        credentials,
      });
      await primeFastPathCredentials(credentials);
      await primePolicyLimitsCache(storageV5);
      await seedInstallIDs(storageV5);
    }
    let [
      { initSinks },
      { initialize1PEventLogging },
      { credentialsStoreFor },
      { initDefaultDebugLog },
      { watchGlobalConfigThroughStorage },
    ] = await Promise.all([
      import("../utils/sinks.js"),
      import("../services/analytics/firstPartyEventLogger.js"),
      import("../utils/secureStorage/credentialsFileStore.js"),
      import("../utils/debug.js"),
      import("../utils/config.js"),
    ]);
    initSinks();
    let credentials = credentialsStoreFor(storageV5);
    initialize1PEventLogging(storageV5);
    let disabledReason_2 = await refuseRemoteControlIneligible(disabledReason);
    if (isStorageV5Enabled() && storageV5 !== undefined) {
      initDefaultDebugLog({
        storageV5,
      });
      watchGlobalConfigThroughStorage(storageV5);
    }
    await startRemoteControl(disabledReason_2, args.slice(1), storageV5, credentials);
    return;
  }
  {
    let daemonArgs = getDaemonArgs(args);
    if (daemonArgs !== null) {
      profileCheckpoint("cli_daemon_path");
      let { ensureFastPathSettingsLoaded } = await import("../cli/fastPathSettings.js");
      await ensureFastPathSettingsLoaded(storageV5EnvPin);
      let { initializeErrorLogSink } = await import("../utils/errorLogSink.js");
      initializeErrorLogSink();
      let { daemonMain } = await import("../cli/handlers/daemon.js");
      await daemonMain(daemonArgs, storageV5EnvPin);
      return;
    }
  }
  let isBgSessionProcess = process.env.CLAUDE_CODE_SESSION_KIND === "bg";
  let bgVerbIndex = args.some(
    (arg) =>
      arg === "logs" ||
      arg === "attach" ||
      arg === "stop" ||
      arg === "kill" ||
      arg === "respawn" ||
      arg === "rm",
  )
    ? require("../utils/cliArgs.js").backgroundSessionVerbIndex(args, {
        behindRootOptions: !isBgSessionProcess,
      })
    : -1;
  let bgVerbArgs = bgVerbIndex === -1 ? [] : args.slice(bgVerbIndex);
  let hasBgFlag =
    args.includes("--bg") || args.includes("--background")
      ? require("../utils/cliArgs.js").hasBackgroundFlag(args)
      : false;
  let desktopForced = false;
  if (!desktopForced && (bgVerbArgs.length > 0 || hasBgFlag || false)) {
    profileCheckpoint("cli_bg_path");
    if (hasDesktopFlag(args)) {
      console.error(
        bgVerbArgs.length > 0
          ? `--desktop can't be combined with \`claude ${bgVerbArgs[0]}\`.`
          : "--desktop opens the Claude Desktop app and can't run in the background (`--bg`, `--background`, `--routine`).",
      );
      process.exit(1);
    }
    if (bgVerbIndex > 0) {
      let [{ eagerParseCliFlag }, { loadSettingsFromFlag, loadManagedSettingsFromFlag }] = await Promise.all([
        import("../utils/cliArgs.js"),
        import("../main.js"),
      ]);
      let sliced = args.slice(0, bgVerbIndex);
      let settingsFlag = eagerParseCliFlag("--settings", sliced);
      if (settingsFlag) loadSettingsFromFlag(settingsFlag);
      let managedSettingsFlag = eagerParseCliFlag("--managed-settings", sliced);
      if (managedSettingsFlag) loadManagedSettingsFromFlag(managedSettingsFlag);
    }
    let [
      { loadFastPathPolicy },
      { setIsInteractive },
      { allowFlagFetchOnOwnCredential, getFeatureValue_CACHED_MAY_BE_STALE, hasWorkspaceTrust },
      { checkHasTrustDialogAccepted },
    ] = await Promise.all([
      import("../cli/fastPathSettings.js"),
      import("../bootstrap/state.js"),
      import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
      import("../utils/config.js"),
    ]);
    let { sessionFactsRestored } = await import("../utils/auth/default.lazy.js");
    let sessionFacts = null;
    let included = ["logs", "stop", "kill", "rm"].includes(bgVerbArgs[0] ?? "");
    {
      let fastPathPolicy = await loadFastPathPolicy(storageV5EnvPin);
      if (fastPathPolicy)
        if (included)
          process.stderr.write(`${fastPathPolicy}
`);
        else {
          let { exitWithError } = await import("../utils/process.js");
          exitWithError(fastPathPolicy);
        }
      if (
        process.stdout.isTTY &&
        !checkHasTrustDialogAccepted() &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_sable_orrery", true)
      )
        setIsInteractive(true);
      sessionFacts = await sessionFactsRestored(storageV5EnvPin);
      if (sessionFacts !== null && !included) {
        let { exitWithError } = await import("../utils/process.js");
        exitWithError(sessionFacts.reason);
      }
    }
    let isFirstRun = sessionFacts === null;
    if (sessionFacts !== null)
      process.stderr.write(`${sessionFacts.reason}
`);
    let fleetModule = await import("../utils/fleetGates.js");
    await fleetModule.ensureFleetGateHydrated({
      kickGrowthBook: isFirstRun && !included && (hasWorkspaceTrust() || allowFlagFetchOnOwnCredential()),
    });
    if (!fleetModule.isAgentsFleetEnabled()) {
      let rejectedVerb =
        bgVerbArgs[0] ??
        args.find(
          (arg) =>
            arg === "--bg" || arg === "--background" || arg === "--routine" || arg.startsWith("--routine="),
        ) ??
        "--bg";
      return fleetModule.fleetGateRejected(rejectedVerb);
    }
    let [
      bgHandlers,
      { pinStorageV5 },
      { initDefaultDebugLog },
      { seedInstallIDs, watchGlobalConfigThroughStorage },
    ] = await Promise.all([
      import("../cli/bg/bgCommands.js"),
      import("../utils/storage/pinStorageV5.js"),
      import("../utils/debug.js"),
      import("../utils/config.js"),
    ]);
    let storageV5 = pinStorageV5(storageV5EnvPin);
    if (isStorageV5Enabled() && storageV5 !== undefined) {
      initDefaultDebugLog({
        storageV5,
      });
      watchGlobalConfigThroughStorage(storageV5);
      let [
        { credentialsStoreFor },
        { setGrowthBookCredentials, setGrowthBookStorageBackend },
        { composePolicyLimitsClient, primePolicyLimitsCache },
        { primeFastPathCredentials },
      ] = await Promise.all([
        import("../utils/secureStorage/credentialsFileStore.js"),
        import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
        import("../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js"),
        import("../utils/primeFastPathCredentials.lazy.js"),
      ]);
      let credentials = credentialsStoreFor(storageV5);
      setGrowthBookCredentials(credentials);
      setGrowthBookStorageBackend(storageV5);
      composePolicyLimitsClient({
        storageV5,
        credentials,
      });
      await primeFastPathCredentials(credentials);
      await primePolicyLimitsCache(storageV5);
      await seedInstallIDs(storageV5);
    }
    switch (bgVerbArgs[0]) {
      case "logs":
      case "attach":
      case "stop":
      case "kill":
      case "respawn":
      case "rm": {
        let [
          { initializeAnalyticsSink },
          { initialize1PEventLogging, shutdown1PEventLogging },
          { shutdownDatadog },
          { sleep },
          { waitForOAuthRefreshBeforeExit },
        ] = await Promise.all([
          import("../services/analytics/sink.js"),
          import("../services/analytics/firstPartyEventLogger.js"),
          import("../services/analytics/datadog.js"),
          import("../utils/sleep.js"),
          import("../utils/auth/oauthRefreshExitWait.js"),
        ]);
        if (isFirstRun) {
          initializeAnalyticsSink();
          initialize1PEventLogging(storageV5);
        }
        if (bgVerbArgs[0] === "logs") await bgHandlers.logsHandler(bgVerbArgs[1], storageV5);
        else if (bgVerbArgs[0] === "attach") await bgHandlers.attachHandler(bgVerbArgs[1], storageV5);
        else if (bgVerbArgs[0] === "respawn") await bgHandlers.respawnHandler(bgVerbArgs[1], storageV5);
        else if (bgVerbArgs[0] === "rm")
          await bgHandlers.rmHandler(bgVerbArgs[1], storageV5, undefined, isFirstRun);
        else await bgHandlers.stopHandler(bgVerbArgs[1], storageV5, isFirstRun);
        await Promise.race([
          Promise.all([shutdown1PEventLogging(), shutdownDatadog()]),
          sleep(500, undefined, {
            unref: true,
          }),
        ]).catch(() => {});
        await waitForOAuthRefreshBeforeExit();
        return process.exit(process.exitCode ?? 0);
      }
      default: {
        let [
          { initializeAnalyticsSink },
          { initialize1PEventLogging, shutdown1PEventLogging },
          { shutdownDatadog },
          { logEvent },
          { sleep },
          { waitForOAuthRefreshBeforeExit },
        ] = await Promise.all([
          import("../services/analytics/sink.js"),
          import("../services/analytics/firstPartyEventLogger.js"),
          import("../services/analytics/datadog.js"),
          import("../services/analytics/index.js"),
          import("../utils/sleep.js"),
          import("../utils/auth/oauthRefreshExitWait.js"),
        ]);
        initializeAnalyticsSink();
        initialize1PEventLogging(storageV5);
        logEvent("tengu_background", {
          via_flag: true,
          via: lit("flag"),
        });
        await bgHandlers.handleBgFlag(args, storageV5);
        await Promise.race([
          Promise.all([shutdown1PEventLogging(), shutdownDatadog()]),
          sleep(500, undefined, {
            unref: true,
          }),
        ]).catch(() => {});
        await waitForOAuthRefreshBeforeExit();
        process.exit(process.exitCode ?? 0);
      }
    }
    return;
  }
  let agentsArgs = parseEarlyArgs(args);
  agentsArgs.config.restricted ||= ["1", "true", "yes", "on"].includes(
    (process.env.CLAUDE_CODE_RESTRICTED ?? "").toLowerCase().trim(),
  );
  let { dispatchDefaults, rest: restArgs } = extractDispatchDefaults(agentsArgs.rest);
  let isAgentsCommand = agentsArgs.hasAgentsPositional && hasOnlyDebugFlags(restArgs);
  let agentsViewOverride;
  if (
    (isAgentsCommand ||
      ((hasOnlyDebugFlags(args) || agentsViewOverride !== undefined) && process.stdin.isTTY)) &&
    process.stdout.isTTY
  ) {
    let { startCapturingEarlyInput, consumeEarlyInput } = await import("../utils/earlyInput.js");
    startCapturingEarlyInput();
    let [{ startMdmRawRead }, { startKeychainPrefetch }] = await Promise.all([
      import("../utils/settings/mdm/rawRead.js"),
      import("../utils/secureStorage/keychainPrefetch.js"),
    ]);
    startMdmRawRead();
    startKeychainPrefetch();
    let { enableConfigs, getGlobalConfig, seedInstallIDs } = await import("../utils/config.js");
    let shouldRunAgentsView = false;
    let defaultToAgentsView = false;
    let agentsViewUnavailable = false;
    try {
      await enableConfigs(isStorageV5Enabled() ? storageV5EnvPin?.backend : undefined);
      defaultToAgentsView = getGlobalConfig().defaultToAgentsView === true;
      shouldRunAgentsView = isAgentsCommand || (defaultToAgentsView && agentsViewOverride === undefined);
    } catch {}
    if (shouldRunAgentsView) {
      if (agentsArgs.config.settings || agentsArgs.config.managedSettings) {
        let { loadSettingsFromFlag, loadManagedSettingsFromFlag } = await import("../main.js");
        if (agentsArgs.config.settings) loadSettingsFromFlag(agentsArgs.config.settings);
        if (agentsArgs.config.managedSettings) loadManagedSettingsFromFlag(agentsArgs.config.managedSettings);
      }
      if (agentsArgs.config.pluginDir.length > 0 || agentsArgs.config.pluginDirNoMcp.length > 0) {
        let [{ setInlinePlugins, setInlinePluginsNoMcp }, { clearPluginCache }] = await Promise.all([
          import("../bootstrap/state.js"),
          import("../utils/plugins/pluginLoader.js"),
        ]);
        setInlinePlugins(agentsArgs.config.pluginDir);
        setInlinePluginsNoMcp(agentsArgs.config.pluginDirNoMcp);
        clearPluginCache("claude agents --plugin-dir");
      }
      let { loadFastPathPolicy } = await import("../cli/fastPathSettings.js");
      let fastPathPolicy = await loadFastPathPolicy(storageV5EnvPin);
      if (fastPathPolicy) {
        let { exitWithError } = await import("../utils/process.js");
        exitWithError(fastPathPolicy);
      }
      let pluginDirsEnvNotice;
      if (process.env.CLAUDE_CODE_PLUGIN_DIRS?.trim()) {
        let [
          {
            mergePluginDirs,
            PLUGIN_DIRS_ENV_RECOVERY_HINT,
            PLUGIN_DIRS_ENV_VAR,
            settlePluginDirsEnv,
            withoutPluginDirs,
          },
          { setInlinePlugins },
          { clearPluginCache },
        ] = await Promise.all([
          import("../utils/plugins/pluginDirsEnv.js"),
          import("../bootstrap/state.js"),
          import("../utils/plugins/pluginLoader.js"),
        ]);
        let envPluginDirs = withoutPluginDirs(settlePluginDirsEnv(), agentsArgs.config.pluginDirNoMcp);
        if (envPluginDirs.length > 0) {
          pluginDirsEnvNotice = {
            name: PLUGIN_DIRS_ENV_VAR,
            hint: PLUGIN_DIRS_ENV_RECOVERY_HINT,
          };
          setInlinePlugins(mergePluginDirs(agentsArgs.config.pluginDir, envPluginDirs));
          clearPluginCache("claude agents CLAUDE_CODE_PLUGIN_DIRS");
        }
      }
      {
        let { areSideloadFlagsDisabledByPolicy, sideloadFlagsBlockedMessage } =
          await import("../utils/plugins/marketplacePolicy.js");
        if (areSideloadFlagsDisabledByPolicy()) {
          let blockedFlags = [];
          if (agentsArgs.config.pluginDir.length > 0) blockedFlags.push("--plugin-dir");
          if (agentsArgs.config.pluginDirNoMcp.length > 0) blockedFlags.push("--plugin-dir-no-mcp");
          if (pluginDirsEnvNotice) blockedFlags.push(pluginDirsEnvNotice.name);
          if (blockedFlags.length > 0) {
            let { exitWithError } = await import("../utils/process.js");
            exitWithError(
              pluginDirsEnvNotice
                ? `${sideloadFlagsBlockedMessage(blockedFlags)} ${pluginDirsEnvNotice.hint}`
                : sideloadFlagsBlockedMessage(blockedFlags),
            );
          }
        }
      }
      let {
        isAgentsFleetEnabled,
        ensureFleetGateHydrated,
        fleetGateRejected,
        consumeAgentViewRelaunchMarker,
      } = await import("../utils/fleetGates.js");
      await ensureFleetGateHydrated({
        kickGrowthBook: false,
      });
      let agentsViewSkipped = false;
      if (shouldRunAgentsView && isAgentsFleetEnabled() && !agentsViewSkipped) {
        let { sessionFactsRestored } = await import("../utils/auth/default.lazy.js");
        let sessionFacts = await sessionFactsRestored(storageV5EnvPin);
        if (sessionFacts !== null) {
          let { exitWithError } = await import("../utils/process.js");
          exitWithError(sessionFacts.reason);
        }
        let [
          { applyFleetViewHostWindowsEnv },
          { createRoot },
          { getBaseRenderOptions },
          { resolve },
          {
            getRootSession,
            setCliSessionConfigCarried,
            setIsInteractive,
            setRestrictedSession,
            setSessionStartType,
          },
          { cliCarriesSessionConfig },
          { pinStorageV5 },
          { appliedSettingSourcesFlagValue },
        ] = await Promise.all([
          import("../screens/FleetView/FleetViewScreen.js"),
          import("../ink/components/Ansi.lazy.js"),
          import("../utils/renderOptions.js"),
          import("path"),
          import("../bootstrap/state.js"),
          import("../utils/sessionConfigFlags.js"),
          import("../utils/storage/pinStorageV5.js"),
          import("../utils/settings/constants.js"),
        ]);
        let sessionConfig = {
          ...agentsArgs.config,
          settingSources: appliedSettingSourcesFlagValue(),
        };
        let storageV5 = pinStorageV5(storageV5EnvPin);
        let credentials;
        if (isStorageV5Enabled() && storageV5 !== undefined) {
          let [
            { credentialsStoreFor },
            { setGrowthBookCredentials, setGrowthBookStorageBackend },
            { primeFastPathCredentials },
          ] = await Promise.all([
            import("../utils/secureStorage/credentialsFileStore.js"),
            import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
            import("../utils/primeFastPathCredentials.lazy.js"),
          ]);
          credentials = credentialsStoreFor(storageV5);
          setGrowthBookCredentials(credentials);
          setGrowthBookStorageBackend(storageV5);
          await primeFastPathCredentials(credentials);
          await seedInstallIDs(storageV5);
        }
        import("../utils/settings/userIntentSettings.js").then(({ resolveSetting }) => {
          let { value } = resolveSetting("theme", "dark");
          if (value.startsWith("custom:"))
            import("../utils/customThemes.js").then((themeModule) => themeModule.loadCustomThemes(storageV5));
        });
        let relaunch = consumeAgentViewRelaunchMarker();
        setIsInteractive(true);
        setCliSessionConfigCarried(
          cliCarriesSessionConfig({
            ...sessionConfig,
            ...dispatchDefaults,
          }),
        );
        setRestrictedSession(agentsArgs.config.restricted);
        setSessionStartType("agents_view");
        let onUnhandledRejection = () => {};
        process.on("unhandledRejection", onUnhandledRejection);
        let resolved = Promise.resolve();
        let releaseReady = () => {};
        let promise = new Promise((resolve) => {
          releaseReady = resolve;
        });
        setImmediate(async () => {
          if (isStorageV5Enabled() && storageV5 !== undefined)
            try {
              let [{ credentialsStoreFor }, { composePolicyLimitsClient, primePolicyLimitsCache }] =
                await Promise.all([
                  import("../utils/secureStorage/credentialsFileStore.js"),
                  import("../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js"),
                ]);
              composePolicyLimitsClient({
                storageV5,
                credentials: credentialsStoreFor(storageV5),
              });
              await primePolicyLimitsCache(storageV5);
            } catch (error) {
              import("../utils/debug.js").then(({ logForDebugging }) =>
                logForDebugging(
                  `Policy limits: start-up composition on the agents path failed: ${error instanceof Error ? error.message : String(error)}`,
                  {
                    level: "warn",
                  },
                ),
              );
            }
          resolved = Promise.all([
            import("../utils/gracefulShutdown.js"),
            import("../utils/errorLogSink.js"),
            import("../services/analytics/sink.js"),
            import("../services/analytics/firstPartyEventLogger.js"),
            import("../services/analytics/index.js"),
            import("../utils/agentSwarmsEnabled.js"),
            import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
            import("./init.js"),
            import("../utils/config.js"),
            import("../utils/managedEnvApply.js"),
            import("../utils/detectRepository.js"),
            import("../utils/debug.js"),
          ])
            .then(
              ([
                { setupGracefulShutdown },
                { initializeErrorLogSink },
                { initializeAnalyticsSink },
                { initialize1PEventLogging },
                { logEvent },
                { captureTeammateModeSnapshotIfEnabled },
                { initializeGrowthBook },
                { initializeTelemetryAfterTrust },
                { checkHasTrustDialogAccepted, watchGlobalConfigThroughStorage },
                { applyConfigEnvironmentVariables },
                { setRepoDetectionGuards },
                { initDefaultDebugLog },
              ]) => {
                setupGracefulShutdown({
                  storageV5,
                  credentials,
                });
                setRepoDetectionGuards({
                  trustProbe: checkHasTrustDialogAccepted,
                });
                initializeGrowthBook().catch(() => {});
                initializeErrorLogSink();
                initializeAnalyticsSink();
                initialize1PEventLogging(storageV5);
                if (isStorageV5Enabled() && storageV5 !== undefined) {
                  initDefaultDebugLog({
                    storageV5,
                  });
                  watchGlobalConfigThroughStorage(storageV5);
                }
                promise.then(() => {
                  if (checkHasTrustDialogAccepted()) {
                    applyConfigEnvironmentVariables();
                    initializeTelemetryAfterTrust(storageV5);
                  }
                });
                logEvent("tengu_fleetview", {
                  defaultToAgentsView,
                  relaunch,
                });
                return captureTeammateModeSnapshotIfEnabled();
              },
            )
            .finally(() => process.off("unhandledRejection", onUnhandledRejection));
          let startHousekeeping = () =>
            void import("../utils/backgroundHousekeeping.js").then((housekeepingModule) =>
              housekeepingModule.startBackgroundHousekeeping(getRootSession().host, storageV5),
            );
          Promise.all([
            import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
            import("../utils/config.js"),
          ]).then(([{ getFeatureValue_CACHED_MAY_BE_STALE }, { checkHasTrustDialogAccepted }]) => {
            if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_noble_wozniak", true))
              promise.then(() => {
                if (checkHasTrustDialogAccepted()) startHousekeeping();
              });
            else startHousekeeping();
          });
        });
        consumeEarlyInput();
        applyFleetViewHostWindowsEnv();
        let bypassModule =
          dispatchDefaults?.permissionMode === "bypassPermissions" || dispatchDefaults?.allowBypass
            ? await import("../utils/permissions/applyBypassPolicyGate.lazy.js")
            : undefined;
        bypassModule?.refuseBypassUnderRoot(dispatchDefaults);
        let effectiveDefaults = bypassModule?.applyBypassPolicyGate(dispatchDefaults) ?? dispatchDefaults;
        let root = await createRoot(getBaseRenderOptions(false));
        let { ensureAgentsWorkspaceTrust, agentsTrustDecision } =
          await import("../utils/agentsWorkspaceTrust.js");
        await ensureAgentsWorkspaceTrust(root, agentsTrustDecision(), storageV5);
        releaseReady();
        if (bypassModule) await bypassModule.ensureAgentsBypassConsent(root, effectiveDefaults, storageV5);
        let orgGateFlagOn = true;
        try {
          orgGateFlagOn =
            require("../services/remoteManagedSettings/orgConfigGate.js").orgConfigGateFlagOnHand(
              getGlobalConfig(),
              process.env.CLAUDE_INTERNAL_FC_OVERRIDES,
            );
        } catch {}
        if (
          orgGateFlagOn &&
          (await import("../services/policyLimits/orgConfigGateFlag.js")).orgConfigGateFlagCouldArm()
        ) {
          let { enforceOrgConfigGateOnLaunchLane } =
            await import("../services/policyLimits/orgConfigStartup.js");
          await enforceOrgConfigGateOnLaunchLane({
            showBlockedScreen: () =>
              import("../components/OrgConfigBlockedScreen.js").then(
                (orgConfigModule) => orgConfigModule.showOrgConfigBlockedScreen,
                () => {
                  return;
                },
              ),
            printMessage: async (message) => {
              let { endInkWithError } = await import("../interactiveHelpers.js");
              await endInkWithError(root, message);
            },
          });
        }
        let bg = await import("../utils/fleetGates.js");
        let mountOptions = {
          cwdFilter: agentsArgs.cwdFilter,
          dispatchExtraArgs: earlyArgsToArgv(resolveEarlyArgPaths(sessionConfig, resolve)),
          dispatchDefaults: effectiveDefaults,
          entryChannel: bg.isListReturnRelaunch()
            ? "list_return"
            : isAgentsCommand
              ? "cli_agents"
              : "default_home",
          storageV5,
          credentials,
        };
        {
          let { mountFleetViewWithComposerBack } = await import("../components/fleet/mountFleetView.js");
          await mountFleetViewWithComposerBack(root, mountOptions);
        }
        await resolved.catch(() => {});
        let { gracefulShutdown } = await import("../utils/gracefulShutdown.js");
        await gracefulShutdown(0, "other", {
          suppressResumeHint: true,
        });
        return;
      }
      if (isAgentsCommand && !agentsViewSkipped) return fleetGateRejected("claude agents");
    }
  }
  if (args[0] === "self-hosted-runner") {
    profileCheckpoint("cli_self_hosted_runner_path");
    let runnerVerb = args[1];
    if (runnerVerb === "orchestrator") {
      let { selfHostedRunnerOrchestratorMain } =
        await import("./selfHostedRunner/selfHostedRunnerOrchestratorMain.lazy.js");
      await selfHostedRunnerOrchestratorMain(args.slice(2));
      return;
    }
    if (runnerVerb === "setup") {
      let { selfHostedRunnerSetupMain } = await import("../cli/handlers/selfHostedRunnerSetupMain.lazy.js");
      await selfHostedRunnerSetupMain(args.slice(2), storageV5EnvPin);
      return;
    }
    if (runnerVerb === "doctor") {
      let { selfHostedRunnerDoctorMain } = await import("../cli/handlers/selfHostedRunnerDoctor.js");
      await selfHostedRunnerDoctorMain(args.slice(2), storageV5EnvPin);
      return;
    }
    if (runnerVerb === "code-sign") {
      let { selfHostedRunnerCodeSignMain } = await import("../services/selfHostedRunner/configureGit.js");
      await selfHostedRunnerCodeSignMain(args.slice(2));
      return;
    }
    if (runnerVerb === "decode-token") {
      let { selfHostedRunnerDecodeTokenMain } =
        await import("../selfHostedRunner/selfHostedRunnerDecodeTokenMain.lazy.js");
      await selfHostedRunnerDecodeTokenMain(args.slice(2));
      return;
    }
    let { selfHostedRunnerMain } = await import("../services/selfHostedRunner/selfHostedRunner.js");
    await selfHostedRunnerMain(args.slice(1));
    return;
  }
  let hasTmuxFlag = args.includes("--tmux") || args.includes("--tmux=classic");
  if (
    !desktopForced &&
    hasTmuxFlag &&
    (args.includes("-w") || args.includes("--worktree") || args.some((arg) => arg.startsWith("--worktree=")))
  ) {
    profileCheckpoint("cli_tmux_worktree_fast_path");
    if (hasDesktopFlag(args)) {
      console.error(
        "--desktop only opens the Claude Desktop app; it can't be combined with `--worktree` or `--tmux`.",
      );
      process.exit(1);
    }
    let { eagerLoadSettings } = await import("../main.js");
    eagerLoadSettings();
    let { loadFastPathPolicy } = await import("../cli/fastPathSettings.js");
    {
      let fastPathPolicy = await loadFastPathPolicy(storageV5EnvPin);
      if (fastPathPolicy) {
        let { exitWithError } = await import("../utils/process.js");
        exitWithError(fastPathPolicy);
      }
    }
    let { configureFastPathGlobalAgents } = await import("../cli/configureFastPathGlobalAgents.lazy.js");
    configureFastPathGlobalAgents();
    let { isWorktreeModeEnabled } = await import("../utils/worktreeModeEnabled.js");
    if (isWorktreeModeEnabled()) {
      let [{ execIntoTmuxWorktree }, { pinStorageV5 }, { initDefaultDebugLog }] = await Promise.all([
        import("../utils/worktree.lazy.js"),
        import("../utils/storage/pinStorageV5.js"),
        import("../utils/debug.js"),
      ]);
      let storageV5 = pinStorageV5(storageV5EnvPin);
      let credentials;
      if (isStorageV5Enabled() && storageV5 !== undefined) {
        initDefaultDebugLog({
          storageV5,
        });
        let [
          { credentialsStoreFor },
          { setGrowthBookCredentials, setGrowthBookStorageBackend },
          { primeFastPathCredentials },
        ] = await Promise.all([
          import("../utils/secureStorage/credentialsFileStore.js"),
          import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
          import("../utils/primeFastPathCredentials.lazy.js"),
        ]);
        credentials = credentialsStoreFor(storageV5);
        setGrowthBookCredentials(credentials);
        setGrowthBookStorageBackend(storageV5);
        await primeFastPathCredentials(credentials);
        let { seedInstallIDs } = await import("../utils/config.js");
        await seedInstallIDs(storageV5);
      }
      let worktreeResult = await execIntoTmuxWorktree(args, storageV5, credentials);
      if (worktreeResult.handled) return;
      let { exitWithError } = await import("../utils/process.js");
      exitWithError(worktreeResult.error);
    }
  }
  if (args.length === 1 && (args[0] === "--update" || args[0] === "--upgrade"))
    process.argv = [process.argv[0], process.argv[1], "update"];
  let doubleDashIndex = args.indexOf("--");
  if ((doubleDashIndex === -1 ? args : args.slice(0, doubleDashIndex)).includes("--bare"))
    process.env.CLAUDE_CODE_SIMPLE = "1";
  let {
    NON_REPL_SUBCOMMANDS,
    isMcpServeInvocation,
    isPluginEvalInvocation,
    isRemoteControlInvocation,
    isAgentsJsonInvocation,
    isProjectVerbInvocation,
  } = await import("../main/NON_REPL_SUBCOMMANDS.lazy.js");
  if (
    !desktopForced &&
    !NON_REPL_SUBCOMMANDS.has(process.argv[2] ?? "") &&
    !isMcpServeInvocation(process.argv.slice(2)) &&
    !isPluginEvalInvocation(process.argv.slice(2)) &&
    !isRemoteControlInvocation(process.argv.slice(2)) &&
    !isAgentsJsonInvocation(process.argv.slice(2)) &&
    !isProjectVerbInvocation(process.argv.slice(2))
  ) {
    let { startCapturingEarlyInput } = await import("../utils/earlyInput.js");
    startCapturingEarlyInput();
  }
  let [{ startMdmRawRead }, { startKeychainPrefetch }] = await Promise.all([
    import("../utils/settings/mdm/rawRead.js"),
    import("../utils/secureStorage/keychainPrefetch.js"),
  ]);
  startMdmRawRead();
  startKeychainPrefetch();
  profileCheckpoint("cli_before_main_import");
  (await import("../utils/zodStartup.js")).configureZodForStartup();
  let { main } = await import("../main.js");
  profileCheckpoint("cli_after_main_import");
  await main(storageV5EnvPin);
  profileCheckpoint("cli_after_main_complete");
}
//@ cli.js:24195-24200 placement
cliMain();
