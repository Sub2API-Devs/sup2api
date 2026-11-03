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
//@ cli.js:1084-1336 placement = isDebugToStdErr (0.489)
/**
 * 参数里是否只有调试类标志（--debug[=…]/-d/--debug-to-stderr/-d2e/--debug-file <path>）；用于判断“claude agents”或裸 claude 是否可以直接进入 agents 视图。
 */
function hasOnlyDebugFlags(a) {
  for (let i = 0; i < a.length; i++) {
    let D = a[i];
    if (
      D === "--debug" ||
      D === "-d" ||
      D === "--debug-to-stderr" ||
      D === "-d2e" ||
      D.startsWith("--debug=") ||
      D.startsWith("--debug-file=")
    )
      continue;
    if (D === "--debug-file" && i + 1 < a.length) {
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
function hasDesktopFlag(a) {
  let index = a.indexOf("--");
  return (index === -1 ? a : a.slice(0, index)).includes("--desktop");
}
//@ cli.js:1425-2101 placement
/**
 * 从 agents 视图的剩余参数中拆出派发默认值：--permission-mode/--inherit-permission-mode/--dangerously-skip-permissions/--allow-dangerously-skip-permissions/--model/--effort/--agent，其余参数原样返回。
 */
function extractDispatchDefaults(a) {
  let m;
  let D;
  let W;
  let K;
  let J;
  let t;
  let V = [];
  for (let i = 0; i < a.length; i++) {
    let o = a[i];
    let index = o.indexOf("=");
    let [L, d] = index > 0 ? [o.slice(0, index), o.slice(index + 1)] : [o, undefined];
    let G = d !== undefined || i + 1 < a.length;
    if (L === "--dangerously-skip-permissions") m = "bypassPermissions";
    else if (L === "--allow-dangerously-skip-permissions") t = true;
    else if (L === "--permission-mode" && G) m = d ?? a[++i];
    else if (L === "--inherit-permission-mode" && G) D = d ?? a[++i];
    else if (L === "--model" && G) W = d ?? a[++i];
    else if (L === "--effort" && G) K = d ?? a[++i];
    else if (L === "--agent" && G) J = d ?? a[++i];
    else V.push(o);
  }
  let R = m ?? D;
  return {
    dispatchDefaults:
      R || W || K || J || t
        ? {
            permissionMode: R,
            ...(!m &&
              D && {
                permissionModeInherited: true,
              }),
            model: W,
            effort: K,
            agent: J,
            allowBypass: t,
          }
        : undefined,
    rest: V,
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
    let { guardRelayTokenDescriptor } = require("./chunk-hqm2hdtg.js");
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
    let { guardRunnerReviewTokens } = require("./chunk-dbe4a9af.js");
    guardRunnerReviewTokens();
  }
  let { noteProcessStartTuning } = require("./chunk-fgxyt5p6.js");
  noteProcessStartTuning();
  let { startGarbageCollectionCount } = require("./chunk-x4edef5z.js");
  startGarbageCollectionCount();
  let { installCliArgvReader } = require("./chunk-cx9cmbqj.js");
  installCliArgvReader((e) => require("./chunk-xcbfjzhp.js").cliFlagWords(e));
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
    let { writeStartupFailureResult } = await import("./chunk-yarkzabk.js");
    let { randomUUID } = await import("crypto");
    await writeStartupFailureResult({
      sessionId: randomUUID(),
      message: cwdError,
      reason: "cwd_unavailable",
    });
    process.exit(1);
  }
  if (runnerDeclaresArg !== undefined) {
    let { adoptRunnerDeclaration } = await import("./chunk-z8rex94w.js");
    await adoptRunnerDeclaration(runnerDeclaresArg);
  }
  let { profileCheckpoint } = await import("./chunk-09hyhg65.js");
  profileCheckpoint("cli_entry");
  let isWarmSpareLaunch = args[0] === "--preload" || args[0] === "--bg-spare";
  let storageV5EnvPin =
    !isWarmSpareLaunch && process.env.CLAUDE_CODE_HOVER_REST
      ? (await import("./chunk-x1qd834k.js")).pinStorageV5FromEnv()
      : undefined;
  if (!isWarmSpareLaunch)
    setTimeout(() => {
      if (process.env.CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP)
        import("./chunk-r4g0p8r6.js").then((e) => e.setJitPolicyAfterStartup());
      else if (typeof Bun !== "undefined") Bun.unsafe.setJITPolicy?.(1);
    }, 1e4).unref();
  if (ghStandinRequest !== undefined) {
    let { loadFastPathPolicy } = await import("./chunk-hhv17y7d.js");
    let fastPathPolicy = await loadFastPathPolicy(storageV5EnvPin);
    if (fastPathPolicy) {
      let { exitWithError } = await import("./chunk-a3ex6w41.js");
      exitWithError(fastPathPolicy);
    }
    let { ghStandinMain } = await import("./chunk-fy5kn7m3.js");
    await ghStandinMain(ghStandinRequest);
    return;
  }
  if (args[0] === "plugin" && args[1] === "test") {
    let [
      { loadFastPathPolicy },
      { pluginTestFormOf, pluginTestGatesOf, pluginTestRefusal },
      { endPluginTest },
    ] = await Promise.all([
      import("./chunk-hhv17y7d.js"),
      import("./chunk-s4dkjzr0.js"),
      import("./chunk-31xvcsqk.js"),
    ]);
    let _ = pluginTestRefusal(
      await pluginTestGatesOf({
        helperError: await loadFastPathPolicy(storageV5EnvPin),
        form: pluginTestFormOf(args.slice(2)),
        envPin: storageV5EnvPin,
      }),
    );
    if (args[2] === "--file" && _ !== undefined) {
      let { REPORT_MARK } = await import("./chunk-557ssxgp.js");
      process.stdout.write(`${REPORT_MARK}${JSON.stringify({
        file: args[3],
        results: [],
        error: _,
      })}
`);
      return;
    }
    if (_ !== undefined) {
      process.stderr.write(`claude plugin test: ${_}
`);
      process.exitCode = 1;
      return endPluginTest(process.exitCode);
    }
    let { pluginTestMain } = await import("./chunk-1tz177x8.js");
    process.exitCode = await pluginTestMain(args.slice(2));
    return endPluginTest(process.exitCode);
  }
  if (process.argv[2] === "--eval-mock-server") {
    profileCheckpoint("cli_eval_mock_server_path");
    let { runEvalMockServer } = await import("./chunk-ftcmf7dj.js");
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
    let { runClaudeInChromeMcpServer } = await import("./chunk-ztt2k9pv.js");
    await runClaudeInChromeMcpServer(storageV5EnvPin);
    return;
  } else if (process.argv[2] === "--chrome-native-host") {
    profileCheckpoint("cli_chrome_native_host_path");
    let { runChromeNativeHost } = await import("./chunk-ncz9bgnh.js");
    await runChromeNativeHost();
    return;
  }
  if (args[0] === "--daemon-worker") {
    let { loadFastPathPolicy } = await import("./chunk-hhv17y7d.js");
    let fastPathPolicy = await loadFastPathPolicy(storageV5EnvPin);
    if (fastPathPolicy)
      process.stderr.write(`${fastPathPolicy}
`);
    let { sessionFactsRestored } = await import("./chunk-tsme6a4v.js");
    let E = await sessionFactsRestored(storageV5EnvPin);
    if (E !== null) {
      let { endsInARowOf, workerEndingOf } = await import("./chunk-drppgasb.js");
      let n = workerEndingOf(E, endsInARowOf(args[2]));
      process.stderr.write(n.said);
      process.exit(n.code);
    }
    let { runDaemonWorker } = await import("./chunk-3mxgmav6.js");
    await runDaemonWorker(args[1], storageV5EnvPin);
    return;
  }
  if (args[0] === "--bg-pty-host") {
    let { ensureFastPathSettingsLoaded } = await import("./chunk-hhv17y7d.js");
    try {
      await ensureFastPathSettingsLoaded(storageV5EnvPin);
    } catch (error) {
      process.stderr
        .write(`ptyHost: settings bootstrap threw (continuing; supervisor already gated): ${error?.stack ?? String(error)}
`);
    }
    let { runPtyHost } = await import("./chunk-jx4rgw65.js");
    await runPtyHost(args.slice(1));
    return;
  }
  if (args[0] === "--bg-spare") {
    let { ensureFastPathSettingsLoaded } = await import("./chunk-hhv17y7d.js");
    await ensureFastPathSettingsLoaded(undefined);
    let { runBgSpare } = await import("./chunk-40y1xma6.js");
    await runBgSpare(args.slice(1));
    return;
  }
  if (args[0] === "--preload") {
    let { ensureFastPathSettingsLoaded } = await import("./chunk-hhv17y7d.js");
    await ensureFastPathSettingsLoaded(undefined);
    let { runPreload } = await import("./chunk-9e524z2b.js");
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
      import("./chunk-hhv17y7d.js"),
      import("./chunk-nj7t53r7.js"),
    ]);
    markNoDialogLaunch();
    {
      let fastPathPolicy = await loadFastPathPolicy(storageV5EnvPin);
      if (fastPathPolicy) {
        let { exitWithError } = await import("./chunk-a3ex6w41.js");
        exitWithError(fastPathPolicy);
      }
    }
    if (args.slice(1).some((arg) => arg === "--help" || arg === "-h")) {
      let { printRemoteControlHelp } = await import("./chunk-nqcgwaap.js");
      await printRemoteControlHelp();
      return;
    }
    let { sessionFactsRestored } = await import("./chunk-tsme6a4v.js");
    let E = await sessionFactsRestored(storageV5EnvPin);
    if (E !== null) {
      let { exitWithError } = await import("./chunk-a3ex6w41.js");
      exitWithError(E.reason);
    }
    let { refuseRemoteControlLocally, refuseRemoteControlIneligible, startRemoteControl } =
      await import("./chunk-4wmk8g5n.js");
    let disabledReason = await refuseRemoteControlLocally();
    let [{ pinStorageV5 }, { seedInstallIDs }] = await Promise.all([
      import("./chunk-beegrzb2.js"),
      import("./chunk-eesswvbz.js"),
    ]);
    let c = pinStorageV5(storageV5EnvPin);
    if (isStorageV5Enabled() && c !== undefined) {
      let [
        { credentialsStoreFor },
        { setGrowthBookCredentials, setGrowthBookStorageBackend },
        { composePolicyLimitsClient, primePolicyLimitsCache },
        { primeFastPathCredentials },
      ] = await Promise.all([
        import("./chunk-y36z1q7c.js"),
        import("./chunk-6df1d6re.js"),
        import("./chunk-qchbrsbw.js"),
        import("./chunk-ts9rfgqd.js"),
      ]);
      let U = credentialsStoreFor(c);
      setGrowthBookCredentials(U);
      setGrowthBookStorageBackend(c);
      composePolicyLimitsClient({
        storageV5: c,
        credentials: U,
      });
      await primeFastPathCredentials(U);
      await primePolicyLimitsCache(c);
      await seedInstallIDs(c);
    }
    let [
      { initSinks },
      { initialize1PEventLogging },
      { credentialsStoreFor },
      { initDefaultDebugLog },
      { watchGlobalConfigThroughStorage },
    ] = await Promise.all([
      import("./chunk-19b0wnnf.js"),
      import("./chunk-3x77zjqp.js"),
      import("./chunk-y36z1q7c.js"),
      import("./chunk-cgjee2k6.js"),
      import("./chunk-eesswvbz.js"),
    ]);
    initSinks();
    let w = credentialsStoreFor(c);
    initialize1PEventLogging(c);
    let C = await refuseRemoteControlIneligible(disabledReason);
    if (isStorageV5Enabled() && c !== undefined) {
      initDefaultDebugLog({
        storageV5: c,
      });
      watchGlobalConfigThroughStorage(c);
    }
    await startRemoteControl(C, args.slice(1), c, w);
    return;
  }
  {
    let daemonArgs = getDaemonArgs(args);
    if (daemonArgs !== null) {
      profileCheckpoint("cli_daemon_path");
      let { ensureFastPathSettingsLoaded } = await import("./chunk-hhv17y7d.js");
      await ensureFastPathSettingsLoaded(storageV5EnvPin);
      let { initializeErrorLogSink } = await import("./chunk-nynswhsz.js");
      initializeErrorLogSink();
      let { daemonMain } = await import("./chunk-ss669z1x.js");
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
    ? require("./chunk-xcbfjzhp.js").backgroundSessionVerbIndex(args, {
        behindRootOptions: !isBgSessionProcess,
      })
    : -1;
  let bgVerbArgs = bgVerbIndex === -1 ? [] : args.slice(bgVerbIndex);
  let hasBgFlag =
    args.includes("--bg") || args.includes("--background")
      ? require("./chunk-xcbfjzhp.js").hasBackgroundFlag(args)
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
        import("./chunk-xcbfjzhp.js"),
        import("./chunk-dcwp8rdv.js"),
      ]);
      let sliced = args.slice(0, bgVerbIndex);
      let P = eagerParseCliFlag("--settings", sliced);
      if (P) loadSettingsFromFlag(P);
      let y = eagerParseCliFlag("--managed-settings", sliced);
      if (y) loadManagedSettingsFromFlag(y);
    }
    let [
      { loadFastPathPolicy },
      { setIsInteractive },
      { allowFlagFetchOnOwnCredential, getFeatureValue_CACHED_MAY_BE_STALE, hasWorkspaceTrust },
      { checkHasTrustDialogAccepted },
    ] = await Promise.all([
      import("./chunk-hhv17y7d.js"),
      import("./chunk-nj7t53r7.js"),
      import("./chunk-6df1d6re.js"),
      import("./chunk-eesswvbz.js"),
    ]);
    let { sessionFactsRestored } = await import("./chunk-tsme6a4v.js");
    let n = null;
    let included = ["logs", "stop", "kill", "rm"].includes(bgVerbArgs[0] ?? "");
    {
      let fastPathPolicy = await loadFastPathPolicy(storageV5EnvPin);
      if (fastPathPolicy)
        if (included)
          process.stderr.write(`${fastPathPolicy}
`);
        else {
          let { exitWithError } = await import("./chunk-a3ex6w41.js");
          exitWithError(fastPathPolicy);
        }
      if (
        process.stdout.isTTY &&
        !checkHasTrustDialogAccepted() &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_sable_orrery", true)
      )
        setIsInteractive(true);
      n = await sessionFactsRestored(storageV5EnvPin);
      if (n !== null && !included) {
        let { exitWithError } = await import("./chunk-a3ex6w41.js");
        exitWithError(n.reason);
      }
    }
    let N = n === null;
    if (n !== null)
      process.stderr.write(`${n.reason}
`);
    let c = await import("./chunk-v2n15p0s.js");
    await c.ensureFleetGateHydrated({
      kickGrowthBook: N && !included && (hasWorkspaceTrust() || allowFlagFetchOnOwnCredential()),
    });
    if (!c.isAgentsFleetEnabled()) {
      let C =
        bgVerbArgs[0] ??
        args.find(
          (arg) =>
            arg === "--bg" || arg === "--background" || arg === "--routine" || arg.startsWith("--routine="),
        ) ??
        "--bg";
      return c.fleetGateRejected(C);
    }
    let [h, { pinStorageV5 }, { initDefaultDebugLog }, { seedInstallIDs, watchGlobalConfigThroughStorage }] =
      await Promise.all([
        import("./chunk-e06sy9za.js"),
        import("./chunk-beegrzb2.js"),
        import("./chunk-cgjee2k6.js"),
        import("./chunk-eesswvbz.js"),
      ]);
    let w = pinStorageV5(storageV5EnvPin);
    if (isStorageV5Enabled() && w !== undefined) {
      initDefaultDebugLog({
        storageV5: w,
      });
      watchGlobalConfigThroughStorage(w);
      let [
        { credentialsStoreFor },
        { setGrowthBookCredentials, setGrowthBookStorageBackend },
        { composePolicyLimitsClient, primePolicyLimitsCache },
        { primeFastPathCredentials },
      ] = await Promise.all([
        import("./chunk-y36z1q7c.js"),
        import("./chunk-6df1d6re.js"),
        import("./chunk-qchbrsbw.js"),
        import("./chunk-ts9rfgqd.js"),
      ]);
      let M = credentialsStoreFor(w);
      setGrowthBookCredentials(M);
      setGrowthBookStorageBackend(w);
      composePolicyLimitsClient({
        storageV5: w,
        credentials: M,
      });
      await primeFastPathCredentials(M);
      await primePolicyLimitsCache(w);
      await seedInstallIDs(w);
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
          import("./chunk-dn8vrmng.js"),
          import("./chunk-3x77zjqp.js"),
          import("./chunk-195bxx7h.js"),
          import("./chunk-c1wxfrj3.js"),
          import("./chunk-jn1dpf1r.js"),
        ]);
        if (N) {
          initializeAnalyticsSink();
          initialize1PEventLogging(w);
        }
        if (bgVerbArgs[0] === "logs") await h.logsHandler(bgVerbArgs[1], w);
        else if (bgVerbArgs[0] === "attach") await h.attachHandler(bgVerbArgs[1], w);
        else if (bgVerbArgs[0] === "respawn") await h.respawnHandler(bgVerbArgs[1], w);
        else if (bgVerbArgs[0] === "rm") await h.rmHandler(bgVerbArgs[1], w, undefined, N);
        else await h.stopHandler(bgVerbArgs[1], w, N);
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
          import("./chunk-dn8vrmng.js"),
          import("./chunk-3x77zjqp.js"),
          import("./chunk-195bxx7h.js"),
          import("./chunk-ezz35vxh.js"),
          import("./chunk-c1wxfrj3.js"),
          import("./chunk-jn1dpf1r.js"),
        ]);
        initializeAnalyticsSink();
        initialize1PEventLogging(w);
        logEvent("tengu_background", {
          via_flag: true,
          via: lit("flag"),
        });
        await h.handleBgFlag(args, w);
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
    let { startCapturingEarlyInput, consumeEarlyInput } = await import("./chunk-h4wwf2p6.js");
    startCapturingEarlyInput();
    let [{ startMdmRawRead }, { startKeychainPrefetch }] = await Promise.all([
      import("./chunk-6195yta3.js"),
      import("./chunk-bgfff79h.js"),
    ]);
    startMdmRawRead();
    startKeychainPrefetch();
    let { enableConfigs, getGlobalConfig, seedInstallIDs } = await import("./chunk-eesswvbz.js");
    let n = false;
    let T = false;
    let N = false;
    try {
      await enableConfigs(isStorageV5Enabled() ? storageV5EnvPin?.backend : undefined);
      T = getGlobalConfig().defaultToAgentsView === true;
      n = isAgentsCommand || (T && agentsViewOverride === undefined);
    } catch {}
    if (n) {
      if (agentsArgs.config.settings || agentsArgs.config.managedSettings) {
        let { loadSettingsFromFlag, loadManagedSettingsFromFlag } = await import("./chunk-dcwp8rdv.js");
        if (agentsArgs.config.settings) loadSettingsFromFlag(agentsArgs.config.settings);
        if (agentsArgs.config.managedSettings) loadManagedSettingsFromFlag(agentsArgs.config.managedSettings);
      }
      if (agentsArgs.config.pluginDir.length > 0 || agentsArgs.config.pluginDirNoMcp.length > 0) {
        let [{ setInlinePlugins, setInlinePluginsNoMcp }, { clearPluginCache }] = await Promise.all([
          import("./chunk-nj7t53r7.js"),
          import("./chunk-w27ej3rn.js"),
        ]);
        setInlinePlugins(agentsArgs.config.pluginDir);
        setInlinePluginsNoMcp(agentsArgs.config.pluginDirNoMcp);
        clearPluginCache("claude agents --plugin-dir");
      }
      let { loadFastPathPolicy } = await import("./chunk-hhv17y7d.js");
      let fastPathPolicy = await loadFastPathPolicy(storageV5EnvPin);
      if (fastPathPolicy) {
        let { exitWithError } = await import("./chunk-a3ex6w41.js");
        exitWithError(fastPathPolicy);
      }
      let I;
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
          import("./chunk-zf6821pj.js"),
          import("./chunk-nj7t53r7.js"),
          import("./chunk-w27ej3rn.js"),
        ]);
        let Q = withoutPluginDirs(settlePluginDirsEnv(), agentsArgs.config.pluginDirNoMcp);
        if (Q.length > 0) {
          I = {
            name: PLUGIN_DIRS_ENV_VAR,
            hint: PLUGIN_DIRS_ENV_RECOVERY_HINT,
          };
          setInlinePlugins(mergePluginDirs(agentsArgs.config.pluginDir, Q));
          clearPluginCache("claude agents CLAUDE_CODE_PLUGIN_DIRS");
        }
      }
      {
        let { areSideloadFlagsDisabledByPolicy, sideloadFlagsBlockedMessage } =
          await import("./chunk-b7gb93w6.js");
        if (areSideloadFlagsDisabledByPolicy()) {
          let p = [];
          if (agentsArgs.config.pluginDir.length > 0) p.push("--plugin-dir");
          if (agentsArgs.config.pluginDirNoMcp.length > 0) p.push("--plugin-dir-no-mcp");
          if (I) p.push(I.name);
          if (p.length > 0) {
            let { exitWithError } = await import("./chunk-a3ex6w41.js");
            exitWithError(I ? `${sideloadFlagsBlockedMessage(p)} ${I.hint}` : sideloadFlagsBlockedMessage(p));
          }
        }
      }
      let {
        isAgentsFleetEnabled,
        ensureFleetGateHydrated,
        fleetGateRejected,
        consumeAgentViewRelaunchMarker,
      } = await import("./chunk-v2n15p0s.js");
      await ensureFleetGateHydrated({
        kickGrowthBook: false,
      });
      let C = false;
      if (n && isAgentsFleetEnabled() && !C) {
        let { sessionFactsRestored } = await import("./chunk-tsme6a4v.js");
        let l = await sessionFactsRestored(storageV5EnvPin);
        if (l !== null) {
          let { exitWithError } = await import("./chunk-a3ex6w41.js");
          exitWithError(l.reason);
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
          import("./chunk-7gry1hef.js"),
          import("./chunk-1m6xc21j.js"),
          import("./chunk-92g44ry1.js"),
          import("path"),
          import("./chunk-nj7t53r7.js"),
          import("./chunk-77vrjvn1.js"),
          import("./chunk-beegrzb2.js"),
          import("./chunk-w0py1apz.js"),
        ]);
        let se = {
          ...agentsArgs.config,
          settingSources: appliedSettingSourcesFlagValue(),
        };
        let S = pinStorageV5(storageV5EnvPin);
        let z;
        if (isStorageV5Enabled() && S !== undefined) {
          let [
            { credentialsStoreFor },
            { setGrowthBookCredentials, setGrowthBookStorageBackend },
            { primeFastPathCredentials },
          ] = await Promise.all([
            import("./chunk-y36z1q7c.js"),
            import("./chunk-6df1d6re.js"),
            import("./chunk-ts9rfgqd.js"),
          ]);
          z = credentialsStoreFor(S);
          setGrowthBookCredentials(z);
          setGrowthBookStorageBackend(S);
          await primeFastPathCredentials(z);
          await seedInstallIDs(S);
        }
        import("./chunk-tscd0vez.js").then(({ resolveSetting }) => {
          let { value } = resolveSetting("theme", "dark");
          if (value.startsWith("custom:")) import("./chunk-d0cyb829.js").then((F) => F.loadCustomThemes(S));
        });
        let relaunch = consumeAgentViewRelaunchMarker();
        setIsInteractive(true);
        setCliSessionConfigCarried(
          cliCarriesSessionConfig({
            ...se,
            ...dispatchDefaults,
          }),
        );
        setRestrictedSession(agentsArgs.config.restricted);
        setSessionStartType("agents_view");
        let ae = () => {};
        process.on("unhandledRejection", ae);
        let resolved = Promise.resolve();
        let ce = () => {};
        let promise = new Promise((resolve) => {
          ce = resolve;
        });
        setImmediate(async () => {
          if (isStorageV5Enabled() && S !== undefined)
            try {
              let [{ credentialsStoreFor }, { composePolicyLimitsClient, primePolicyLimitsCache }] =
                await Promise.all([import("./chunk-y36z1q7c.js"), import("./chunk-qchbrsbw.js")]);
              composePolicyLimitsClient({
                storageV5: S,
                credentials: credentialsStoreFor(S),
              });
              await primePolicyLimitsCache(S);
            } catch (error) {
              import("./chunk-cgjee2k6.js").then(({ logForDebugging }) =>
                logForDebugging(
                  `Policy limits: start-up composition on the agents path failed: ${error instanceof Error ? error.message : String(error)}`,
                  {
                    level: "warn",
                  },
                ),
              );
            }
          resolved = Promise.all([
            import("./chunk-r3wdn2dp.js"),
            import("./chunk-nynswhsz.js"),
            import("./chunk-dn8vrmng.js"),
            import("./chunk-3x77zjqp.js"),
            import("./chunk-ezz35vxh.js"),
            import("./chunk-564n8sr7.js"),
            import("./chunk-6df1d6re.js"),
            import("./chunk-4a9xkd77.js"),
            import("./chunk-eesswvbz.js"),
            import("./chunk-q6kb333n.js"),
            import("./chunk-zqrznfbt.js"),
            import("./chunk-cgjee2k6.js"),
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
                  storageV5: S,
                  credentials: z,
                });
                setRepoDetectionGuards({
                  trustProbe: checkHasTrustDialogAccepted,
                });
                initializeGrowthBook().catch(() => {});
                initializeErrorLogSink();
                initializeAnalyticsSink();
                initialize1PEventLogging(S);
                if (isStorageV5Enabled() && S !== undefined) {
                  initDefaultDebugLog({
                    storageV5: S,
                  });
                  watchGlobalConfigThroughStorage(S);
                }
                promise.then(() => {
                  if (checkHasTrustDialogAccepted()) {
                    applyConfigEnvironmentVariables();
                    initializeTelemetryAfterTrust(S);
                  }
                });
                logEvent("tengu_fleetview", {
                  defaultToAgentsView: T,
                  relaunch,
                });
                return captureTeammateModeSnapshotIfEnabled();
              },
            )
            .finally(() => process.off("unhandledRejection", ae));
          let A = () =>
            void import("./chunk-5kp2513a.js").then((g) =>
              g.startBackgroundHousekeeping(getRootSession().host, S),
            );
          Promise.all([import("./chunk-6df1d6re.js"), import("./chunk-eesswvbz.js")]).then(
            ([{ getFeatureValue_CACHED_MAY_BE_STALE }, { checkHasTrustDialogAccepted }]) => {
              if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_noble_wozniak", true))
                promise.then(() => {
                  if (checkHasTrustDialogAccepted()) A();
                });
              else A();
            },
          );
        });
        consumeEarlyInput();
        applyFleetViewHostWindowsEnv();
        let ee =
          dispatchDefaults?.permissionMode === "bypassPermissions" || dispatchDefaults?.allowBypass
            ? await import("./chunk-k88gsmtn.js")
            : undefined;
        ee?.refuseBypassUnderRoot(dispatchDefaults);
        let pe = ee?.applyBypassPolicyGate(dispatchDefaults) ?? dispatchDefaults;
        let root = await createRoot(getBaseRenderOptions(false));
        let { ensureAgentsWorkspaceTrust, agentsTrustDecision } = await import("./chunk-pn8x1715.js");
        await ensureAgentsWorkspaceTrust(root, agentsTrustDecision(), S);
        ce();
        if (ee) await ee.ensureAgentsBypassConsent(root, pe, S);
        let de = true;
        try {
          de = require("./chunk-2wc2xwxh.js").orgConfigGateFlagOnHand(
            getGlobalConfig(),
            process.env.CLAUDE_INTERNAL_FC_OVERRIDES,
          );
        } catch {}
        if (de && (await import("./chunk-bbtp62nj.js")).orgConfigGateFlagCouldArm()) {
          let { enforceOrgConfigGateOnLaunchLane } = await import("./chunk-np0e9bed.js");
          await enforceOrgConfigGateOnLaunchLane({
            showBlockedScreen: () =>
              import("./chunk-6bvzpeaf.js").then(
                (g) => g.showOrgConfigBlockedScreen,
                () => {
                  return;
                },
              ),
            printMessage: async (g) => {
              let { endInkWithError } = await import("./chunk-pz8vz2wa.js");
              await endInkWithError(root, g);
            },
          });
        }
        let bg = await import("./chunk-v2n15p0s.js");
        let He = {
          cwdFilter: agentsArgs.cwdFilter,
          dispatchExtraArgs: earlyArgsToArgv(resolveEarlyArgPaths(se, resolve)),
          dispatchDefaults: pe,
          entryChannel: bg.isListReturnRelaunch()
            ? "list_return"
            : isAgentsCommand
              ? "cli_agents"
              : "default_home",
          storageV5: S,
          credentials: z,
        };
        {
          let { mountFleetViewWithComposerBack } = await import("./chunk-ygxzcsa5.js");
          await mountFleetViewWithComposerBack(root, He);
        }
        await resolved.catch(() => {});
        let { gracefulShutdown } = await import("./chunk-r3wdn2dp.js");
        await gracefulShutdown(0, "other", {
          suppressResumeHint: true,
        });
        return;
      }
      if (isAgentsCommand && !C) return fleetGateRejected("claude agents");
    }
  }
  if (args[0] === "self-hosted-runner") {
    profileCheckpoint("cli_self_hosted_runner_path");
    let e = args[1];
    if (e === "orchestrator") {
      let { selfHostedRunnerOrchestratorMain } = await import("./chunk-2cbdmxy9.js");
      await selfHostedRunnerOrchestratorMain(args.slice(2));
      return;
    }
    if (e === "setup") {
      let { selfHostedRunnerSetupMain } = await import("./chunk-w14wefpp.js");
      await selfHostedRunnerSetupMain(args.slice(2), storageV5EnvPin);
      return;
    }
    if (e === "doctor") {
      let { selfHostedRunnerDoctorMain } = await import("./chunk-aqpr1420.js");
      await selfHostedRunnerDoctorMain(args.slice(2), storageV5EnvPin);
      return;
    }
    if (e === "code-sign") {
      let { selfHostedRunnerCodeSignMain } = await import("./chunk-nxsqxhv4.js");
      await selfHostedRunnerCodeSignMain(args.slice(2));
      return;
    }
    if (e === "decode-token") {
      let { selfHostedRunnerDecodeTokenMain } = await import("./chunk-xwsbadxw.js");
      await selfHostedRunnerDecodeTokenMain(args.slice(2));
      return;
    }
    let { selfHostedRunnerMain } = await import("./chunk-hm0ce8vc.js");
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
    let { eagerLoadSettings } = await import("./chunk-dcwp8rdv.js");
    eagerLoadSettings();
    let { loadFastPathPolicy } = await import("./chunk-hhv17y7d.js");
    {
      let fastPathPolicy = await loadFastPathPolicy(storageV5EnvPin);
      if (fastPathPolicy) {
        let { exitWithError } = await import("./chunk-a3ex6w41.js");
        exitWithError(fastPathPolicy);
      }
    }
    let { configureFastPathGlobalAgents } = await import("./chunk-hr00hxnh.js");
    configureFastPathGlobalAgents();
    let { isWorktreeModeEnabled } = await import("./chunk-jkvek32c.js");
    if (isWorktreeModeEnabled()) {
      let [{ execIntoTmuxWorktree }, { pinStorageV5 }, { initDefaultDebugLog }] = await Promise.all([
        import("./chunk-maxteas5.js"),
        import("./chunk-beegrzb2.js"),
        import("./chunk-cgjee2k6.js"),
      ]);
      let n = pinStorageV5(storageV5EnvPin);
      let T;
      if (isStorageV5Enabled() && n !== undefined) {
        initDefaultDebugLog({
          storageV5: n,
        });
        let [
          { credentialsStoreFor },
          { setGrowthBookCredentials, setGrowthBookStorageBackend },
          { primeFastPathCredentials },
        ] = await Promise.all([
          import("./chunk-y36z1q7c.js"),
          import("./chunk-6df1d6re.js"),
          import("./chunk-ts9rfgqd.js"),
        ]);
        T = credentialsStoreFor(n);
        setGrowthBookCredentials(T);
        setGrowthBookStorageBackend(n);
        await primeFastPathCredentials(T);
        let { seedInstallIDs } = await import("./chunk-eesswvbz.js");
        await seedInstallIDs(n);
      }
      let N = await execIntoTmuxWorktree(args, n, T);
      if (N.handled) return;
      let { exitWithError } = await import("./chunk-a3ex6w41.js");
      exitWithError(N.error);
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
  } = await import("./chunk-y7y3wdde.js");
  if (
    !desktopForced &&
    !NON_REPL_SUBCOMMANDS.has(process.argv[2] ?? "") &&
    !isMcpServeInvocation(process.argv.slice(2)) &&
    !isPluginEvalInvocation(process.argv.slice(2)) &&
    !isRemoteControlInvocation(process.argv.slice(2)) &&
    !isAgentsJsonInvocation(process.argv.slice(2)) &&
    !isProjectVerbInvocation(process.argv.slice(2))
  ) {
    let { startCapturingEarlyInput } = await import("./chunk-h4wwf2p6.js");
    startCapturingEarlyInput();
  }
  let [{ startMdmRawRead }, { startKeychainPrefetch }] = await Promise.all([
    import("./chunk-6195yta3.js"),
    import("./chunk-bgfff79h.js"),
  ]);
  startMdmRawRead();
  startKeychainPrefetch();
  profileCheckpoint("cli_before_main_import");
  (await import("./chunk-q8xhzy3r.js")).configureZodForStartup();
  let { main } = await import("./chunk-shkzs7rp.js");
  profileCheckpoint("cli_after_main_import");
  await main(storageV5EnvPin);
  profileCheckpoint("cli_after_main_complete");
}
//@ cli.js:24195-24200 placement
cliMain();
