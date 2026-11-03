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

/**
 * 检查当前目录是否可读：process.cwd() 抛错时返回给用户的错误文本（ENOENT 说明目录已被删除或移动），可读时返回 undefined。
 */
//@ cli.js:452-819 placement
function checkCwdReadable() {
  try {
    process.cwd();
    return;
  } catch (error) {
    let m = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : void 0;
    if (m === "ENOENT")
      return "The current directory no longer exists (it was deleted or moved). Start Claude Code from an existing directory.";
    return `Can't read the current directory${m ? ` (${m})` : ""}. Start Claude Code from a different directory.`;
  }
}
//@ cli.js:819-870 placement
process.env.NoDefaultCurrentDirectoryInExePath = "1";
/**
 * 入口副作用：设置 NoDefaultCurrentDirectoryInExePath=1（Windows 不在当前目录找可执行文件）与 COREPACK_ENABLE_AUTO_PIN=0。
 */
//@ cli.js:870-911 fingerprint
process.env.COREPACK_ENABLE_AUTO_PIN = "0";
//@ cli.js:911-917 layout
setAiAgentEnv();
/**
 * CLAUDE_CODE_REMOTE=true（云端容器）时给 NODE_OPTIONS 追加 --max-old-space-size=8192。
 */
//@ cli.js:917-1084 fingerprint
if (process.env.CLAUDE_CODE_REMOTE === "true") {
  let a = process.env.NODE_OPTIONS || "";
  process.env.NODE_OPTIONS = a ? `${a} --max-old-space-size=8192` : "--max-old-space-size=8192";
}
/**
 * 参数里是否只有调试类标志（--debug[=…]/-d/--debug-to-stderr/-d2e/--debug-file <path>）；用于判断“claude agents”或裸 claude 是否可以直接进入 agents 视图。
 */
//@ cli.js:1084-1336 placement = isDebugToStdErr (0.489)
function hasOnlyDebugFlags(a) {
  for (let m = 0; m < a.length; m++) {
    let D = a[m];
    if (
      D === "--debug" ||
      D === "-d" ||
      D === "--debug-to-stderr" ||
      D === "-d2e" ||
      D.startsWith("--debug=") ||
      D.startsWith("--debug-file=")
    )
      continue;
    if (D === "--debug-file" && m + 1 < a.length) {
      m++;
      continue;
    }
    return !1;
  }
  return !0;
}
/**
 * -- 之前是否出现 --desktop；后台/worktree 快速路径据此拒绝与 --desktop 组合。
 */
//@ cli.js:1336-1425 placement
function hasDesktopFlag(a) {
  let index = a.indexOf("--");
  return (index === -1 ? a : a.slice(0, index)).includes("--desktop");
}
/**
 * 从 agents 视图的剩余参数中拆出派发默认值：--permission-mode/--inherit-permission-mode/--dangerously-skip-permissions/--allow-dangerously-skip-permissions/--model/--effort/--agent，其余参数原样返回。
 */
//@ cli.js:1425-2101 placement
function extractDispatchDefaults(a) {
  let m,
    D,
    W,
    K,
    J,
    t,
    V = [];
  for (let k = 0; k < a.length; k++) {
    let o = a[k],
      index = o.indexOf("="),
      [L, d] = index > 0 ? [o.slice(0, index), o.slice(index + 1)] : [o, void 0],
      G = d !== void 0 || k + 1 < a.length;
    if (L === "--dangerously-skip-permissions") m = "bypassPermissions";
    else if (L === "--allow-dangerously-skip-permissions") t = !0;
    else if (L === "--permission-mode" && G) m = d ?? a[++k];
    else if (L === "--inherit-permission-mode" && G) D = d ?? a[++k];
    else if (L === "--model" && G) W = d ?? a[++k];
    else if (L === "--effort" && G) K = d ?? a[++k];
    else if (L === "--agent" && G) J = d ?? a[++k];
    else V.push(o);
  }
  let R = m ?? D;
  return {
    dispatchDefaults:
      R || W || K || J || t
        ? {
            permissionMode: R,
            ...(!m && D && { permissionModeInherited: !0 }),
            model: W,
            effort: K,
            agent: J,
            allowBypass: t,
          }
        : void 0,
    rest: V,
  };
}
/**
 * CLI 进程入口（模块顶层直接调用）。按顺序处理：fd 令牌保护 → --gh-standin → --runner-declares → --handle-uri 校验 → --version 快速返回 → cwd 检查 → 各种专用子进程模式（--eval-mock-server、--claude-in-chrome-mcp、--chrome-native-host、--daemon-worker、--bg-pty-host、--bg-spare、--preload、remote-control、daemon、self-hosted-runner、plugin test）→ 后台会话动词与 --bg → agents 视图 → --tmux --worktree → 最后预读 MDM/钥匙串并动态导入主模块调用 main()。
 */
//@ cli.js:2101-24195 placement
async function cliMain() {
  if (
    process.env.CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR !== void 0 ||
    process.argv.includes("--session-tunnel")
  ) {
    let { guardRelayTokenDescriptor: guardRelayTokenDescriptor } = require("./chunk-hqm2hdtg.js");
    guardRelayTokenDescriptor();
  }
  let ghStandinRequest = parseGhStandinArgs();
  if (ghStandinRequest === "refused") return;
  let runnerDeclaresArg = process.argv[2]?.startsWith("--runner-declares=")
      ? process.argv.splice(2, 1)[0]
      : void 0,
    deepLinkArgError = validateHandleUriArgs(process.argv);
  if (deepLinkArgError) (console.error(deepLinkArgError), process.exit(1));
  if (process.env.CLAUDE_CODE_REMOTE_SESSION_ORIGIN === "review") {
    let { guardRunnerReviewTokens: guardRunnerReviewTokens } = require("./chunk-dbe4a9af.js");
    guardRunnerReviewTokens();
  }
  let { noteProcessStartTuning: noteProcessStartTuning } = require("./chunk-fgxyt5p6.js");
  noteProcessStartTuning();
  let { startGarbageCollectionCount: startGarbageCollectionCount } = require("./chunk-x4edef5z.js");
  startGarbageCollectionCount();
  let { installCliArgvReader: installCliArgvReader } = require("./chunk-cx9cmbqj.js");
  installCliArgvReader((e) => require("./chunk-xcbfjzhp.js").cliFlagWords(e));
  let args = process.argv.slice(2);
  if (
    (args.length === 1 || (args.length === 2 && args[1] === "--verbose")) &&
    (args[0] === "--version" || args[0] === "-v" || args[0] === "-V")
  ) {
    if (
      (console.log(
        `${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} (Claude Code)${getBuildRefSuffix()}`,
      ),
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
        }.GIT_SHA)
    )
      console.log(
        `Commit: ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.GIT_SHA}`,
      );
    return;
  }
  let cwdError = checkCwdReadable();
  if (cwdError) {
    console.error(cwdError);
    let { writeStartupFailureResult: writeStartupFailureResult } = await import("./chunk-yarkzabk.js"),
      { randomUUID: randomUUID } = await import("crypto");
    (await writeStartupFailureResult({
      sessionId: randomUUID(),
      message: cwdError,
      reason: "cwd_unavailable",
    }),
      process.exit(1));
  }
  if (runnerDeclaresArg !== void 0) {
    let { adoptRunnerDeclaration: adoptRunnerDeclaration } = await import("./chunk-z8rex94w.js");
    await adoptRunnerDeclaration(runnerDeclaresArg);
  }
  let { profileCheckpoint: profileCheckpoint } = await import("./chunk-09hyhg65.js");
  profileCheckpoint("cli_entry");
  let isWarmSpareLaunch = args[0] === "--preload" || args[0] === "--bg-spare",
    storageV5EnvPin =
      !isWarmSpareLaunch && process.env.CLAUDE_CODE_HOVER_REST
        ? (await import("./chunk-x1qd834k.js")).pinStorageV5FromEnv()
        : void 0;
  if (!isWarmSpareLaunch)
    setTimeout(() => {
      if (process.env.CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP)
        import("./chunk-r4g0p8r6.js").then((e) => e.setJitPolicyAfterStartup());
      else if (typeof Bun < "u") Bun.unsafe.setJITPolicy?.(1);
    }, 1e4).unref();
  if (ghStandinRequest !== void 0) {
    let { loadFastPathPolicy: loadFastPathPolicy } = await import("./chunk-hhv17y7d.js"),
      r = await loadFastPathPolicy(storageV5EnvPin);
    if (r) {
      let { exitWithError: exitWithError } = await import("./chunk-a3ex6w41.js");
      exitWithError(r);
    }
    let { ghStandinMain: ghStandinMain } = await import("./chunk-fy5kn7m3.js");
    await ghStandinMain(ghStandinRequest);
    return;
  }
  if (args[0] === "plugin" && args[1] === "test") {
    let [
        { loadFastPathPolicy: loadFastPathPolicy },
        {
          pluginTestFormOf: pluginTestFormOf,
          pluginTestGatesOf: pluginTestGatesOf,
          pluginTestRefusal: pluginTestRefusal,
        },
        { endPluginTest: endPluginTest },
      ] = await Promise.all([
        import("./chunk-hhv17y7d.js"),
        import("./chunk-s4dkjzr0.js"),
        import("./chunk-31xvcsqk.js"),
      ]),
      _ = pluginTestRefusal(
        await pluginTestGatesOf({
          helperError: await loadFastPathPolicy(storageV5EnvPin),
          form: pluginTestFormOf(args.slice(2)),
          envPin: storageV5EnvPin,
        }),
      );
    if (args[2] === "--file" && _ !== void 0) {
      let { REPORT_MARK: REPORT_MARK } = await import("./chunk-557ssxgp.js");
      process.stdout.write(`${REPORT_MARK}${JSON.stringify({ file: args[3], results: [], error: _ })}
`);
      return;
    }
    if (_ !== void 0)
      return (
        process.stderr.write(`claude plugin test: ${_}
`),
        (process.exitCode = 1),
        endPluginTest(process.exitCode)
      );
    let { pluginTestMain: pluginTestMain } = await import("./chunk-1tz177x8.js");
    return ((process.exitCode = await pluginTestMain(args.slice(2))), endPluginTest(process.exitCode));
  }
  if (process.argv[2] === "--eval-mock-server") {
    profileCheckpoint("cli_eval_mock_server_path");
    let { runEvalMockServer: runEvalMockServer } = await import("./chunk-ftcmf7dj.js");
    try {
      await runEvalMockServer(process.argv[3], process.argv[4]);
    } catch (error) {
      (console.error(`--eval-mock-server: ${error instanceof Error ? error.message : String(error)}`),
        (process.exitCode = 1));
    }
    return;
  }
  if (process.argv[2] === "--claude-in-chrome-mcp") {
    profileCheckpoint("cli_claude_in_chrome_mcp_path");
    let { runClaudeInChromeMcpServer: runClaudeInChromeMcpServer } = await import("./chunk-ztt2k9pv.js");
    await runClaudeInChromeMcpServer(storageV5EnvPin);
    return;
  } else if (process.argv[2] === "--chrome-native-host") {
    profileCheckpoint("cli_chrome_native_host_path");
    let { runChromeNativeHost: runChromeNativeHost } = await import("./chunk-ncz9bgnh.js");
    await runChromeNativeHost();
    return;
  }
  if (args[0] === "--daemon-worker") {
    let { loadFastPathPolicy: loadFastPathPolicy } = await import("./chunk-hhv17y7d.js"),
      r = await loadFastPathPolicy(storageV5EnvPin);
    if (r)
      process.stderr.write(`${r}
`);
    let { sessionFactsRestored: sessionFactsRestored } = await import("./chunk-tsme6a4v.js"),
      E = await sessionFactsRestored(storageV5EnvPin);
    if (E !== null) {
      let { endsInARowOf: endsInARowOf, workerEndingOf: workerEndingOf } =
          await import("./chunk-drppgasb.js"),
        n = workerEndingOf(E, endsInARowOf(args[2]));
      (process.stderr.write(n.said), process.exit(n.code));
    }
    let { runDaemonWorker: runDaemonWorker } = await import("./chunk-3mxgmav6.js");
    await runDaemonWorker(args[1], storageV5EnvPin);
    return;
  }
  if (args[0] === "--bg-pty-host") {
    let { ensureFastPathSettingsLoaded: ensureFastPathSettingsLoaded } = await import("./chunk-hhv17y7d.js");
    try {
      await ensureFastPathSettingsLoaded(storageV5EnvPin);
    } catch (error) {
      process.stderr
        .write(`ptyHost: settings bootstrap threw (continuing; supervisor already gated): ${error?.stack ?? String(error)}
`);
    }
    let { runPtyHost: runPtyHost } = await import("./chunk-jx4rgw65.js");
    await runPtyHost(args.slice(1));
    return;
  }
  if (args[0] === "--bg-spare") {
    let { ensureFastPathSettingsLoaded: ensureFastPathSettingsLoaded } = await import("./chunk-hhv17y7d.js");
    await ensureFastPathSettingsLoaded(void 0);
    let { runBgSpare: runBgSpare } = await import("./chunk-40y1xma6.js");
    await runBgSpare(args.slice(1));
    return;
  }
  if (args[0] === "--preload") {
    let { ensureFastPathSettingsLoaded: ensureFastPathSettingsLoaded } = await import("./chunk-hhv17y7d.js");
    await ensureFastPathSettingsLoaded(void 0);
    let { runPreload: runPreload } = await import("./chunk-9e524z2b.js");
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
    let [{ loadFastPathPolicy: loadFastPathPolicy }, { markNoDialogLaunch: markNoDialogLaunch }] =
      await Promise.all([import("./chunk-hhv17y7d.js"), import("./chunk-nj7t53r7.js")]);
    markNoDialogLaunch();
    {
      let i = await loadFastPathPolicy(storageV5EnvPin);
      if (i) {
        let { exitWithError: exitWithError } = await import("./chunk-a3ex6w41.js");
        exitWithError(i);
      }
    }
    if (args.slice(1).some((i) => i === "--help" || i === "-h")) {
      let { printRemoteControlHelp: printRemoteControlHelp } = await import("./chunk-nqcgwaap.js");
      await printRemoteControlHelp();
      return;
    }
    let { sessionFactsRestored: sessionFactsRestored } = await import("./chunk-tsme6a4v.js"),
      E = await sessionFactsRestored(storageV5EnvPin);
    if (E !== null) {
      let { exitWithError: exitWithError } = await import("./chunk-a3ex6w41.js");
      exitWithError(E.reason);
    }
    let {
        refuseRemoteControlLocally: refuseRemoteControlLocally,
        refuseRemoteControlIneligible: refuseRemoteControlIneligible,
        startRemoteControl: startRemoteControl,
      } = await import("./chunk-4wmk8g5n.js"),
      disabledReason = await refuseRemoteControlLocally(),
      [{ pinStorageV5: pinStorageV5 }, { seedInstallIDs: seedInstallIDs }] = await Promise.all([
        import("./chunk-beegrzb2.js"),
        import("./chunk-eesswvbz.js"),
      ]),
      c = pinStorageV5(storageV5EnvPin);
    if (isStorageV5Enabled() && c !== void 0) {
      let [
          { credentialsStoreFor: credentialsStoreFor },
          {
            setGrowthBookCredentials: setGrowthBookCredentials,
            setGrowthBookStorageBackend: setGrowthBookStorageBackend,
          },
          {
            composePolicyLimitsClient: composePolicyLimitsClient,
            primePolicyLimitsCache: primePolicyLimitsCache,
          },
          { primeFastPathCredentials: primeFastPathCredentials },
        ] = await Promise.all([
          import("./chunk-y36z1q7c.js"),
          import("./chunk-6df1d6re.js"),
          import("./chunk-qchbrsbw.js"),
          import("./chunk-ts9rfgqd.js"),
        ]),
        U = credentialsStoreFor(c);
      (setGrowthBookCredentials(U),
        setGrowthBookStorageBackend(c),
        composePolicyLimitsClient({ storageV5: c, credentials: U }),
        await primeFastPathCredentials(U),
        await primePolicyLimitsCache(c),
        await seedInstallIDs(c));
    }
    let [
      { initSinks: initSinks },
      { initialize1PEventLogging: initialize1PEventLogging },
      { credentialsStoreFor: credentialsStoreFor },
      { initDefaultDebugLog: initDefaultDebugLog },
      { watchGlobalConfigThroughStorage: watchGlobalConfigThroughStorage },
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
    if (isStorageV5Enabled() && c !== void 0)
      (initDefaultDebugLog({ storageV5: c }), watchGlobalConfigThroughStorage(c));
    await startRemoteControl(C, args.slice(1), c, w);
    return;
  }
  {
    let e = getDaemonArgs(args);
    if (e !== null) {
      profileCheckpoint("cli_daemon_path");
      let { ensureFastPathSettingsLoaded: ensureFastPathSettingsLoaded } =
        await import("./chunk-hhv17y7d.js");
      await ensureFastPathSettingsLoaded(storageV5EnvPin);
      let { initializeErrorLogSink: initializeErrorLogSink } = await import("./chunk-nynswhsz.js");
      initializeErrorLogSink();
      let { daemonMain: daemonMain } = await import("./chunk-ss669z1x.js");
      await daemonMain(e, storageV5EnvPin);
      return;
    }
  }
  let isBgSessionProcess = process.env.CLAUDE_CODE_SESSION_KIND === "bg",
    bgVerbIndex = args.some(
      (e) => e === "logs" || e === "attach" || e === "stop" || e === "kill" || e === "respawn" || e === "rm",
    )
      ? require("./chunk-xcbfjzhp.js").backgroundSessionVerbIndex(args, {
          behindRootOptions: !isBgSessionProcess,
        })
      : -1,
    bgVerbArgs = bgVerbIndex === -1 ? [] : args.slice(bgVerbIndex),
    hasBgFlag =
      args.includes("--bg") || args.includes("--background")
        ? require("./chunk-xcbfjzhp.js").hasBackgroundFlag(args)
        : !1,
    desktopForced = !1;
  if (!desktopForced && (bgVerbArgs.length > 0 || hasBgFlag || !1)) {
    if ((profileCheckpoint("cli_bg_path"), hasDesktopFlag(args)))
      (console.error(
        bgVerbArgs.length > 0
          ? `--desktop can't be combined with \`claude ${bgVerbArgs[0]}\`.`
          : "--desktop opens the Claude Desktop app and can't run in the background (`--bg`, `--background`, `--routine`).",
      ),
        process.exit(1));
    if (bgVerbIndex > 0) {
      let [
          { eagerParseCliFlag: eagerParseCliFlag },
          {
            loadSettingsFromFlag: loadSettingsFromFlag,
            loadManagedSettingsFromFlag: loadManagedSettingsFromFlag,
          },
        ] = await Promise.all([import("./chunk-xcbfjzhp.js"), import("./chunk-dcwp8rdv.js")]),
        sliced = args.slice(0, bgVerbIndex),
        P = eagerParseCliFlag("--settings", sliced);
      if (P) loadSettingsFromFlag(P);
      let y = eagerParseCliFlag("--managed-settings", sliced);
      if (y) loadManagedSettingsFromFlag(y);
    }
    let [
        { loadFastPathPolicy: loadFastPathPolicy },
        { setIsInteractive: setIsInteractive },
        {
          allowFlagFetchOnOwnCredential: allowFlagFetchOnOwnCredential,
          getFeatureValue_CACHED_MAY_BE_STALE: getFeatureValue_CACHED_MAY_BE_STALE,
          hasWorkspaceTrust: hasWorkspaceTrust,
        },
        { checkHasTrustDialogAccepted: checkHasTrustDialogAccepted },
      ] = await Promise.all([
        import("./chunk-hhv17y7d.js"),
        import("./chunk-nj7t53r7.js"),
        import("./chunk-6df1d6re.js"),
        import("./chunk-eesswvbz.js"),
      ]),
      { sessionFactsRestored: sessionFactsRestored } = await import("./chunk-tsme6a4v.js"),
      n = null,
      included = ["logs", "stop", "kill", "rm"].includes(bgVerbArgs[0] ?? "");
    {
      let C = await loadFastPathPolicy(storageV5EnvPin);
      if (C)
        if (included)
          process.stderr.write(`${C}
`);
        else {
          let { exitWithError: exitWithError } = await import("./chunk-a3ex6w41.js");
          exitWithError(C);
        }
      if (
        process.stdout.isTTY &&
        !checkHasTrustDialogAccepted() &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_sable_orrery", !0)
      )
        setIsInteractive(!0);
      if (((n = await sessionFactsRestored(storageV5EnvPin)), n !== null && !included)) {
        let { exitWithError: exitWithError } = await import("./chunk-a3ex6w41.js");
        exitWithError(n.reason);
      }
    }
    let N = n === null;
    if (n !== null)
      process.stderr.write(`${n.reason}
`);
    let c = await import("./chunk-v2n15p0s.js");
    if (
      (await c.ensureFleetGateHydrated({
        kickGrowthBook: N && !included && (hasWorkspaceTrust() || allowFlagFetchOnOwnCredential()),
      }),
      !c.isAgentsFleetEnabled())
    ) {
      let C =
        bgVerbArgs[0] ??
        args.find(
          (i) => i === "--bg" || i === "--background" || i === "--routine" || i.startsWith("--routine="),
        ) ??
        "--bg";
      return c.fleetGateRejected(C);
    }
    let [
        h,
        { pinStorageV5: pinStorageV5 },
        { initDefaultDebugLog: initDefaultDebugLog },
        { seedInstallIDs: seedInstallIDs, watchGlobalConfigThroughStorage: watchGlobalConfigThroughStorage },
      ] = await Promise.all([
        import("./chunk-e06sy9za.js"),
        import("./chunk-beegrzb2.js"),
        import("./chunk-cgjee2k6.js"),
        import("./chunk-eesswvbz.js"),
      ]),
      w = pinStorageV5(storageV5EnvPin);
    if (isStorageV5Enabled() && w !== void 0) {
      (initDefaultDebugLog({ storageV5: w }), watchGlobalConfigThroughStorage(w));
      let [
          { credentialsStoreFor: credentialsStoreFor },
          {
            setGrowthBookCredentials: setGrowthBookCredentials,
            setGrowthBookStorageBackend: setGrowthBookStorageBackend,
          },
          {
            composePolicyLimitsClient: composePolicyLimitsClient,
            primePolicyLimitsCache: primePolicyLimitsCache,
          },
          { primeFastPathCredentials: primeFastPathCredentials },
        ] = await Promise.all([
          import("./chunk-y36z1q7c.js"),
          import("./chunk-6df1d6re.js"),
          import("./chunk-qchbrsbw.js"),
          import("./chunk-ts9rfgqd.js"),
        ]),
        M = credentialsStoreFor(w);
      (setGrowthBookCredentials(M),
        setGrowthBookStorageBackend(w),
        composePolicyLimitsClient({ storageV5: w, credentials: M }),
        await primeFastPathCredentials(M),
        await primePolicyLimitsCache(w),
        await seedInstallIDs(w));
    }
    switch (bgVerbArgs[0]) {
      case "logs":
      case "attach":
      case "stop":
      case "kill":
      case "respawn":
      case "rm": {
        let [
          { initializeAnalyticsSink: initializeAnalyticsSink },
          {
            initialize1PEventLogging: initialize1PEventLogging,
            shutdown1PEventLogging: shutdown1PEventLogging,
          },
          { shutdownDatadog: shutdownDatadog },
          { sleep: sleep },
          { waitForOAuthRefreshBeforeExit: waitForOAuthRefreshBeforeExit },
        ] = await Promise.all([
          import("./chunk-dn8vrmng.js"),
          import("./chunk-3x77zjqp.js"),
          import("./chunk-195bxx7h.js"),
          import("./chunk-c1wxfrj3.js"),
          import("./chunk-jn1dpf1r.js"),
        ]);
        if (N) (initializeAnalyticsSink(), initialize1PEventLogging(w));
        if (bgVerbArgs[0] === "logs") await h.logsHandler(bgVerbArgs[1], w);
        else if (bgVerbArgs[0] === "attach") await h.attachHandler(bgVerbArgs[1], w);
        else if (bgVerbArgs[0] === "respawn") await h.respawnHandler(bgVerbArgs[1], w);
        else if (bgVerbArgs[0] === "rm") await h.rmHandler(bgVerbArgs[1], w, void 0, N);
        else await h.stopHandler(bgVerbArgs[1], w, N);
        return (
          await Promise.race([
            Promise.all([shutdown1PEventLogging(), shutdownDatadog()]),
            sleep(500, void 0, { unref: !0 }),
          ]).catch(() => {}),
          await waitForOAuthRefreshBeforeExit(),
          process.exit(process.exitCode ?? 0)
        );
      }
      default: {
        let [
          { initializeAnalyticsSink: initializeAnalyticsSink },
          {
            initialize1PEventLogging: initialize1PEventLogging,
            shutdown1PEventLogging: shutdown1PEventLogging,
          },
          { shutdownDatadog: shutdownDatadog },
          { logEvent: logEvent },
          { sleep: sleep },
          { waitForOAuthRefreshBeforeExit: waitForOAuthRefreshBeforeExit },
        ] = await Promise.all([
          import("./chunk-dn8vrmng.js"),
          import("./chunk-3x77zjqp.js"),
          import("./chunk-195bxx7h.js"),
          import("./chunk-ezz35vxh.js"),
          import("./chunk-c1wxfrj3.js"),
          import("./chunk-jn1dpf1r.js"),
        ]);
        (initializeAnalyticsSink(),
          initialize1PEventLogging(w),
          logEvent("tengu_background", { via_flag: !0, via: lit("flag") }),
          await h.handleBgFlag(args, w),
          await Promise.race([
            Promise.all([shutdown1PEventLogging(), shutdownDatadog()]),
            sleep(500, void 0, { unref: !0 }),
          ]).catch(() => {}),
          await waitForOAuthRefreshBeforeExit(),
          process.exit(process.exitCode ?? 0));
      }
    }
    return;
  }
  let agentsArgs = parseEarlyArgs(args);
  agentsArgs.config.restricted ||= ["1", "true", "yes", "on"].includes(
    (process.env.CLAUDE_CODE_RESTRICTED ?? "").toLowerCase().trim(),
  );
  let { dispatchDefaults: dispatchDefaults, rest: restArgs } = extractDispatchDefaults(agentsArgs.rest),
    isAgentsCommand = agentsArgs.hasAgentsPositional && hasOnlyDebugFlags(restArgs),
    agentsViewOverride;
  if (
    (isAgentsCommand ||
      ((hasOnlyDebugFlags(args) || agentsViewOverride !== void 0) && process.stdin.isTTY)) &&
    process.stdout.isTTY
  ) {
    let { startCapturingEarlyInput: startCapturingEarlyInput, consumeEarlyInput: consumeEarlyInput } =
      await import("./chunk-h4wwf2p6.js");
    startCapturingEarlyInput();
    let [{ startMdmRawRead: startMdmRawRead }, { startKeychainPrefetch: startKeychainPrefetch }] =
      await Promise.all([import("./chunk-6195yta3.js"), import("./chunk-bgfff79h.js")]);
    (startMdmRawRead(), startKeychainPrefetch());
    let {
        enableConfigs: enableConfigs,
        getGlobalConfig: getGlobalConfig,
        seedInstallIDs: seedInstallIDs,
      } = await import("./chunk-eesswvbz.js"),
      n = !1,
      T = !1,
      N = !1;
    try {
      (await enableConfigs(isStorageV5Enabled() ? storageV5EnvPin?.backend : void 0),
        (T = getGlobalConfig().defaultToAgentsView === !0),
        (n = isAgentsCommand || (T && agentsViewOverride === void 0)));
    } catch {}
    if (n) {
      if (agentsArgs.config.settings || agentsArgs.config.managedSettings) {
        let {
          loadSettingsFromFlag: loadSettingsFromFlag,
          loadManagedSettingsFromFlag: loadManagedSettingsFromFlag,
        } = await import("./chunk-dcwp8rdv.js");
        if (agentsArgs.config.settings) loadSettingsFromFlag(agentsArgs.config.settings);
        if (agentsArgs.config.managedSettings) loadManagedSettingsFromFlag(agentsArgs.config.managedSettings);
      }
      if (agentsArgs.config.pluginDir.length > 0 || agentsArgs.config.pluginDirNoMcp.length > 0) {
        let [
          { setInlinePlugins: setInlinePlugins, setInlinePluginsNoMcp: setInlinePluginsNoMcp },
          { clearPluginCache: clearPluginCache },
        ] = await Promise.all([import("./chunk-nj7t53r7.js"), import("./chunk-w27ej3rn.js")]);
        (setInlinePlugins(agentsArgs.config.pluginDir),
          setInlinePluginsNoMcp(agentsArgs.config.pluginDirNoMcp),
          clearPluginCache("claude agents --plugin-dir"));
      }
      let { loadFastPathPolicy: loadFastPathPolicy } = await import("./chunk-hhv17y7d.js"),
        h = await loadFastPathPolicy(storageV5EnvPin);
      if (h) {
        let { exitWithError: exitWithError } = await import("./chunk-a3ex6w41.js");
        exitWithError(h);
      }
      let I;
      if (process.env.CLAUDE_CODE_PLUGIN_DIRS?.trim()) {
        let [
            {
              mergePluginDirs: mergePluginDirs,
              PLUGIN_DIRS_ENV_RECOVERY_HINT: PLUGIN_DIRS_ENV_RECOVERY_HINT,
              PLUGIN_DIRS_ENV_VAR: PLUGIN_DIRS_ENV_VAR,
              settlePluginDirsEnv: settlePluginDirsEnv,
              withoutPluginDirs: withoutPluginDirs,
            },
            { setInlinePlugins: setInlinePlugins },
            { clearPluginCache: clearPluginCache },
          ] = await Promise.all([
            import("./chunk-zf6821pj.js"),
            import("./chunk-nj7t53r7.js"),
            import("./chunk-w27ej3rn.js"),
          ]),
          Q = withoutPluginDirs(settlePluginDirsEnv(), agentsArgs.config.pluginDirNoMcp);
        if (Q.length > 0)
          ((I = { name: PLUGIN_DIRS_ENV_VAR, hint: PLUGIN_DIRS_ENV_RECOVERY_HINT }),
            setInlinePlugins(mergePluginDirs(agentsArgs.config.pluginDir, Q)),
            clearPluginCache("claude agents CLAUDE_CODE_PLUGIN_DIRS"));
      }
      {
        let {
          areSideloadFlagsDisabledByPolicy: areSideloadFlagsDisabledByPolicy,
          sideloadFlagsBlockedMessage: sideloadFlagsBlockedMessage,
        } = await import("./chunk-b7gb93w6.js");
        if (areSideloadFlagsDisabledByPolicy()) {
          let p = [];
          if (agentsArgs.config.pluginDir.length > 0) p.push("--plugin-dir");
          if (agentsArgs.config.pluginDirNoMcp.length > 0) p.push("--plugin-dir-no-mcp");
          if (I) p.push(I.name);
          if (p.length > 0) {
            let { exitWithError: exitWithError } = await import("./chunk-a3ex6w41.js");
            exitWithError(I ? `${sideloadFlagsBlockedMessage(p)} ${I.hint}` : sideloadFlagsBlockedMessage(p));
          }
        }
      }
      let {
        isAgentsFleetEnabled: isAgentsFleetEnabled,
        ensureFleetGateHydrated: ensureFleetGateHydrated,
        fleetGateRejected: fleetGateRejected,
        consumeAgentViewRelaunchMarker: consumeAgentViewRelaunchMarker,
      } = await import("./chunk-v2n15p0s.js");
      await ensureFleetGateHydrated({ kickGrowthBook: !1 });
      let C = !1;
      if (n && isAgentsFleetEnabled() && !C) {
        let { sessionFactsRestored: sessionFactsRestored } = await import("./chunk-tsme6a4v.js"),
          l = await sessionFactsRestored(storageV5EnvPin);
        if (l !== null) {
          let { exitWithError: exitWithError } = await import("./chunk-a3ex6w41.js");
          exitWithError(l.reason);
        }
        let [
            { applyFleetViewHostWindowsEnv: applyFleetViewHostWindowsEnv },
            { createRoot: createRoot },
            { getBaseRenderOptions: getBaseRenderOptions },
            { resolve: resolve },
            {
              getRootSession: getRootSession,
              setCliSessionConfigCarried: setCliSessionConfigCarried,
              setIsInteractive: setIsInteractive,
              setRestrictedSession: setRestrictedSession,
              setSessionStartType: setSessionStartType,
            },
            { cliCarriesSessionConfig: cliCarriesSessionConfig },
            { pinStorageV5: pinStorageV5 },
            { appliedSettingSourcesFlagValue: appliedSettingSourcesFlagValue },
          ] = await Promise.all([
            import("./chunk-7gry1hef.js"),
            import("./chunk-1m6xc21j.js"),
            import("./chunk-92g44ry1.js"),
            import("path"),
            import("./chunk-nj7t53r7.js"),
            import("./chunk-77vrjvn1.js"),
            import("./chunk-beegrzb2.js"),
            import("./chunk-w0py1apz.js"),
          ]),
          se = { ...agentsArgs.config, settingSources: appliedSettingSourcesFlagValue() },
          S = pinStorageV5(storageV5EnvPin),
          z;
        if (isStorageV5Enabled() && S !== void 0) {
          let [
            { credentialsStoreFor: credentialsStoreFor },
            {
              setGrowthBookCredentials: setGrowthBookCredentials,
              setGrowthBookStorageBackend: setGrowthBookStorageBackend,
            },
            { primeFastPathCredentials: primeFastPathCredentials },
          ] = await Promise.all([
            import("./chunk-y36z1q7c.js"),
            import("./chunk-6df1d6re.js"),
            import("./chunk-ts9rfgqd.js"),
          ]);
          ((z = credentialsStoreFor(S)),
            setGrowthBookCredentials(z),
            setGrowthBookStorageBackend(S),
            await primeFastPathCredentials(z),
            await seedInstallIDs(S));
        }
        import("./chunk-tscd0vez.js").then(({ resolveSetting: resolveSetting }) => {
          let { value: value } = resolveSetting("theme", "dark");
          if (value.startsWith("custom:")) import("./chunk-d0cyb829.js").then((F) => F.loadCustomThemes(S));
        });
        let Ie = consumeAgentViewRelaunchMarker();
        (setIsInteractive(!0),
          setCliSessionConfigCarried(cliCarriesSessionConfig({ ...se, ...dispatchDefaults })),
          setRestrictedSession(agentsArgs.config.restricted),
          setSessionStartType("agents_view"));
        let ae = () => {};
        process.on("unhandledRejection", ae);
        let resolved = Promise.resolve(),
          ce = () => {},
          promise = new Promise((A) => {
            ce = A;
          });
        (setImmediate(async () => {
          if (isStorageV5Enabled() && S !== void 0)
            try {
              let [
                { credentialsStoreFor: credentialsStoreFor },
                {
                  composePolicyLimitsClient: composePolicyLimitsClient,
                  primePolicyLimitsCache: primePolicyLimitsCache,
                },
              ] = await Promise.all([import("./chunk-y36z1q7c.js"), import("./chunk-qchbrsbw.js")]);
              (composePolicyLimitsClient({ storageV5: S, credentials: credentialsStoreFor(S) }),
                await primePolicyLimitsCache(S));
            } catch (error) {
              import("./chunk-cgjee2k6.js").then(({ logForDebugging: logForDebugging }) =>
                logForDebugging(
                  `Policy limits: start-up composition on the agents path failed: ${error instanceof Error ? error.message : String(error)}`,
                  { level: "warn" },
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
                { setupGracefulShutdown: setupGracefulShutdown },
                { initializeErrorLogSink: initializeErrorLogSink },
                { initializeAnalyticsSink: initializeAnalyticsSink },
                { initialize1PEventLogging: initialize1PEventLogging },
                { logEvent: logEvent },
                { captureTeammateModeSnapshotIfEnabled: captureTeammateModeSnapshotIfEnabled },
                { initializeGrowthBook: initializeGrowthBook },
                { initializeTelemetryAfterTrust: initializeTelemetryAfterTrust },
                {
                  checkHasTrustDialogAccepted: checkHasTrustDialogAccepted,
                  watchGlobalConfigThroughStorage: watchGlobalConfigThroughStorage,
                },
                { applyConfigEnvironmentVariables: applyConfigEnvironmentVariables },
                { setRepoDetectionGuards: setRepoDetectionGuards },
                { initDefaultDebugLog: initDefaultDebugLog },
              ]) => {
                if (
                  (setupGracefulShutdown({ storageV5: S, credentials: z }),
                  setRepoDetectionGuards({ trustProbe: checkHasTrustDialogAccepted }),
                  initializeGrowthBook().catch(() => {}),
                  initializeErrorLogSink(),
                  initializeAnalyticsSink(),
                  initialize1PEventLogging(S),
                  isStorageV5Enabled() && S !== void 0)
                )
                  (initDefaultDebugLog({ storageV5: S }), watchGlobalConfigThroughStorage(S));
                return (
                  promise.then(() => {
                    if (checkHasTrustDialogAccepted())
                      (applyConfigEnvironmentVariables(), initializeTelemetryAfterTrust(S));
                  }),
                  logEvent("tengu_fleetview", { defaultToAgentsView: T, relaunch: Ie }),
                  captureTeammateModeSnapshotIfEnabled()
                );
              },
            )
            .finally(() => process.off("unhandledRejection", ae));
          let A = () =>
            void import("./chunk-5kp2513a.js").then((g) =>
              g.startBackgroundHousekeeping(getRootSession().host, S),
            );
          Promise.all([import("./chunk-6df1d6re.js"), import("./chunk-eesswvbz.js")]).then(
            ([
              { getFeatureValue_CACHED_MAY_BE_STALE: getFeatureValue_CACHED_MAY_BE_STALE },
              { checkHasTrustDialogAccepted: checkHasTrustDialogAccepted },
            ]) => {
              if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_noble_wozniak", !0))
                promise.then(() => {
                  if (checkHasTrustDialogAccepted()) A();
                });
              else A();
            },
          );
        }),
          consumeEarlyInput(),
          applyFleetViewHostWindowsEnv());
        let ee =
          dispatchDefaults?.permissionMode === "bypassPermissions" || dispatchDefaults?.allowBypass
            ? await import("./chunk-k88gsmtn.js")
            : void 0;
        ee?.refuseBypassUnderRoot(dispatchDefaults);
        let pe = ee?.applyBypassPolicyGate(dispatchDefaults) ?? dispatchDefaults,
          te = await createRoot(getBaseRenderOptions(!1)),
          {
            ensureAgentsWorkspaceTrust: ensureAgentsWorkspaceTrust,
            agentsTrustDecision: agentsTrustDecision,
          } = await import("./chunk-pn8x1715.js");
        if ((await ensureAgentsWorkspaceTrust(te, agentsTrustDecision(), S), ce(), ee))
          await ee.ensureAgentsBypassConsent(te, pe, S);
        let de = !0;
        try {
          de = require("./chunk-2wc2xwxh.js").orgConfigGateFlagOnHand(
            getGlobalConfig(),
            process.env.CLAUDE_INTERNAL_FC_OVERRIDES,
          );
        } catch {}
        if (de && (await import("./chunk-bbtp62nj.js")).orgConfigGateFlagCouldArm()) {
          let { enforceOrgConfigGateOnLaunchLane: enforceOrgConfigGateOnLaunchLane } =
            await import("./chunk-np0e9bed.js");
          await enforceOrgConfigGateOnLaunchLane({
            showBlockedScreen: () =>
              import("./chunk-6bvzpeaf.js").then(
                (g) => g.showOrgConfigBlockedScreen,
                () => {
                  return;
                },
              ),
            printMessage: async (g) => {
              let { endInkWithError: endInkWithError } = await import("./chunk-pz8vz2wa.js");
              await endInkWithError(te, g);
            },
          });
        }
        let bg = await import("./chunk-v2n15p0s.js"),
          He = {
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
          let { mountFleetViewWithComposerBack: mountFleetViewWithComposerBack } =
            await import("./chunk-ygxzcsa5.js");
          await mountFleetViewWithComposerBack(te, He);
        }
        await resolved.catch(() => {});
        let { gracefulShutdown: gracefulShutdown } = await import("./chunk-r3wdn2dp.js");
        await gracefulShutdown(0, "other", { suppressResumeHint: !0 });
        return;
      }
      if (isAgentsCommand && !C) return fleetGateRejected("claude agents");
    }
  }
  if (args[0] === "self-hosted-runner") {
    profileCheckpoint("cli_self_hosted_runner_path");
    let e = args[1];
    if (e === "orchestrator") {
      let { selfHostedRunnerOrchestratorMain: selfHostedRunnerOrchestratorMain } =
        await import("./chunk-2cbdmxy9.js");
      await selfHostedRunnerOrchestratorMain(args.slice(2));
      return;
    }
    if (e === "setup") {
      let { selfHostedRunnerSetupMain: selfHostedRunnerSetupMain } = await import("./chunk-w14wefpp.js");
      await selfHostedRunnerSetupMain(args.slice(2), storageV5EnvPin);
      return;
    }
    if (e === "doctor") {
      let { selfHostedRunnerDoctorMain: selfHostedRunnerDoctorMain } = await import("./chunk-aqpr1420.js");
      await selfHostedRunnerDoctorMain(args.slice(2), storageV5EnvPin);
      return;
    }
    if (e === "code-sign") {
      let { selfHostedRunnerCodeSignMain: selfHostedRunnerCodeSignMain } =
        await import("./chunk-nxsqxhv4.js");
      await selfHostedRunnerCodeSignMain(args.slice(2));
      return;
    }
    if (e === "decode-token") {
      let { selfHostedRunnerDecodeTokenMain: selfHostedRunnerDecodeTokenMain } =
        await import("./chunk-xwsbadxw.js");
      await selfHostedRunnerDecodeTokenMain(args.slice(2));
      return;
    }
    let { selfHostedRunnerMain: selfHostedRunnerMain } = await import("./chunk-hm0ce8vc.js");
    await selfHostedRunnerMain(args.slice(1));
    return;
  }
  let hasTmuxFlag = args.includes("--tmux") || args.includes("--tmux=classic");
  if (
    !desktopForced &&
    hasTmuxFlag &&
    (args.includes("-w") || args.includes("--worktree") || args.some((e) => e.startsWith("--worktree=")))
  ) {
    if ((profileCheckpoint("cli_tmux_worktree_fast_path"), hasDesktopFlag(args)))
      (console.error(
        "--desktop only opens the Claude Desktop app; it can't be combined with `--worktree` or `--tmux`.",
      ),
        process.exit(1));
    let { eagerLoadSettings: eagerLoadSettings } = await import("./chunk-dcwp8rdv.js");
    eagerLoadSettings();
    let { loadFastPathPolicy: loadFastPathPolicy } = await import("./chunk-hhv17y7d.js");
    {
      let v = await loadFastPathPolicy(storageV5EnvPin);
      if (v) {
        let { exitWithError: exitWithError } = await import("./chunk-a3ex6w41.js");
        exitWithError(v);
      }
    }
    let { configureFastPathGlobalAgents: configureFastPathGlobalAgents } =
      await import("./chunk-hr00hxnh.js");
    configureFastPathGlobalAgents();
    let { isWorktreeModeEnabled: isWorktreeModeEnabled } = await import("./chunk-jkvek32c.js");
    if (isWorktreeModeEnabled()) {
      let [
          { execIntoTmuxWorktree: execIntoTmuxWorktree },
          { pinStorageV5: pinStorageV5 },
          { initDefaultDebugLog: initDefaultDebugLog },
        ] = await Promise.all([
          import("./chunk-maxteas5.js"),
          import("./chunk-beegrzb2.js"),
          import("./chunk-cgjee2k6.js"),
        ]),
        n = pinStorageV5(storageV5EnvPin),
        T;
      if (isStorageV5Enabled() && n !== void 0) {
        initDefaultDebugLog({ storageV5: n });
        let [
          { credentialsStoreFor: credentialsStoreFor },
          {
            setGrowthBookCredentials: setGrowthBookCredentials,
            setGrowthBookStorageBackend: setGrowthBookStorageBackend,
          },
          { primeFastPathCredentials: primeFastPathCredentials },
        ] = await Promise.all([
          import("./chunk-y36z1q7c.js"),
          import("./chunk-6df1d6re.js"),
          import("./chunk-ts9rfgqd.js"),
        ]);
        ((T = credentialsStoreFor(n)),
          setGrowthBookCredentials(T),
          setGrowthBookStorageBackend(n),
          await primeFastPathCredentials(T));
        let { seedInstallIDs: seedInstallIDs } = await import("./chunk-eesswvbz.js");
        await seedInstallIDs(n);
      }
      let N = await execIntoTmuxWorktree(args, n, T);
      if (N.handled) return;
      let { exitWithError: exitWithError } = await import("./chunk-a3ex6w41.js");
      exitWithError(N.error);
    }
  }
  if (args.length === 1 && (args[0] === "--update" || args[0] === "--upgrade"))
    process.argv = [process.argv[0], process.argv[1], "update"];
  let doubleDashIndex = args.indexOf("--");
  if ((doubleDashIndex === -1 ? args : args.slice(0, doubleDashIndex)).includes("--bare"))
    process.env.CLAUDE_CODE_SIMPLE = "1";
  let {
    NON_REPL_SUBCOMMANDS: NON_REPL_SUBCOMMANDS,
    isMcpServeInvocation: isMcpServeInvocation,
    isPluginEvalInvocation: isPluginEvalInvocation,
    isRemoteControlInvocation: isRemoteControlInvocation,
    isAgentsJsonInvocation: isAgentsJsonInvocation,
    isProjectVerbInvocation: isProjectVerbInvocation,
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
    let { startCapturingEarlyInput: startCapturingEarlyInput } = await import("./chunk-h4wwf2p6.js");
    startCapturingEarlyInput();
  }
  let [{ startMdmRawRead: startMdmRawRead }, { startKeychainPrefetch: startKeychainPrefetch }] =
    await Promise.all([import("./chunk-6195yta3.js"), import("./chunk-bgfff79h.js")]);
  (startMdmRawRead(),
    startKeychainPrefetch(),
    profileCheckpoint("cli_before_main_import"),
    (await import("./chunk-q8xhzy3r.js")).configureZodForStartup());
  let { main: main } = await import("./chunk-shkzs7rp.js");
  (profileCheckpoint("cli_after_main_import"),
    await main(storageV5EnvPin),
    profileCheckpoint("cli_after_main_complete"));
}
//@ cli.js:24195-24200 placement
cliMain();
