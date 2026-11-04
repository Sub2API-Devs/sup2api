async function SELF() {
  if (process.env.CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR !== void 0 || process.argv.includes("--session-tunnel")) {
    let { guardRelayTokenDescriptor: $l0 } = require("./chunk-X.js");
    $l0();
  }
  let $l1 = $m_yai();
  if ($l1 === "refused") return;
  let $l2 = process.argv[2]?.startsWith("--runner-declares=") ? process.argv.splice(2, 1)[0] : void 0, $l3 = $m_Ror(process.argv);
  if ($l3) console.error($l3), process.exit(1);
  if (process.env.CLAUDE_CODE_REMOTE_SESSION_ORIGIN === "review") {
    let { guardRunnerReviewTokens: $l4 } = require("./chunk-X.js");
    $l4();
  }
  let { noteProcessStartTuning: $l5 } = require("./chunk-X.js");
  $l5();
  let { startGarbageCollectionCount: $l6 } = require("./chunk-X.js");
  $l6();
  let { installCliArgvReader: $l7 } = require("./chunk-X.js");
  $l7(($l8) => require("./chunk-X.js").cliFlagWords($l8));
  let $l9 = process.argv.slice(2);
  if (($l9.length === 1 || $l9.length === 2 && $l9[1] === "--verbose") && ($l9[0] === "--version" || $l9[0] === "-v" || $l9[0] === "-V")) {
    if (console.log(`${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "V", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "T", GIT_SHA: "G", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} (Claude Code)${$m_c6()}`), $l9.length === 2 && { ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "V", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "T", GIT_SHA: "G", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.GIT_SHA) console.log(`Commit: ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "V", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "T", GIT_SHA: "G", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.GIT_SHA}`);
    return;
  }
  let $l10 = $m_me();
  if ($l10) {
    console.error($l10);
    let { writeStartupFailureResult: $l11 } = await import("./chunk-X.js"), { randomUUID: $l12 } = await import("crypto");
    await $l11({ sessionId: $l12(), message: $l10, reason: "cwd_unavailable" }), process.exit(1);
  }
  if ($l2 !== void 0) {
    let { adoptRunnerDeclaration: $l13 } = await import("./chunk-X.js");
    await $l13($l2);
  }
  let { profileCheckpoint: $l14 } = await import("./chunk-X.js");
  $l14("cli_entry");
  let $l15 = $l9[0] === "--preload" || $l9[0] === "--bg-spare", $l16 = !$l15 && process.env.CLAUDE_CODE_HOVER_REST ? (await import("./chunk-X.js")).pinStorageV5FromEnv() : void 0;
  if (!$l15) setTimeout(() => {
    if (process.env.CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP) import("./chunk-X.js").then(($l17) => $l17.setJitPolicyAfterStartup());
    else if (typeof Bun < "u") Bun.unsafe.setJITPolicy?.(1);
  }, 1e4).unref();
  if ($l1 !== void 0) {
    let { loadFastPathPolicy: $l18 } = await import("./chunk-X.js"), $l19 = await $l18($l16);
    if ($l19) {
      let { exitWithError: $l20 } = await import("./chunk-X.js");
      $l20($l19);
    }
    let { ghStandinMain: $l21 } = await import("./chunk-X.js");
    await $l21($l1);
    return;
  }
  if ($l9[0] === "plugin" && $l9[1] === "test") {
    let [{ loadFastPathPolicy: $l22 }, { pluginTestFormOf: $l23, pluginTestGatesOf: $l24, pluginTestRefusal: $l25 }, { endPluginTest: $l26 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]), $l27 = $l25(await $l24({ helperError: await $l22($l16), form: $l23($l9.slice(2)), envPin: $l16 }));
    if ($l9[2] === "--file" && $l27 !== void 0) {
      let { REPORT_MARK: $l28 } = await import("./chunk-X.js");
      process.stdout.write(`${$l28}${JSON.stringify({ file: $l9[3], results: [], error: $l27 })}
`);
      return;
    }
    if ($l27 !== void 0) return process.stderr.write(`claude plugin test: ${$l27}
`), process.exitCode = 1, $l26(process.exitCode);
    let { pluginTestMain: $l29 } = await import("./chunk-X.js");
    return process.exitCode = await $l29($l9.slice(2)), $l26(process.exitCode);
  }
  if (process.argv[2] === "--eval-mock-server") {
    $l14("cli_eval_mock_server_path");
    let { runEvalMockServer: $l30 } = await import("./chunk-X.js");
    try {
      await $l30(process.argv[3], process.argv[4]);
    } catch ($l31) {
      console.error(`--eval-mock-server: ${$l31 instanceof Error ? $l31.message : String($l31)}`), process.exitCode = 1;
    }
    return;
  }
  if (process.argv[2] === "--claude-in-chrome-mcp") {
    $l14("cli_claude_in_chrome_mcp_path");
    let { runClaudeInChromeMcpServer: $l32 } = await import("./chunk-X.js");
    await $l32($l16);
    return;
  } else if (process.argv[2] === "--chrome-native-host") {
    $l14("cli_chrome_native_host_path");
    let { runChromeNativeHost: $l33 } = await import("./chunk-X.js");
    await $l33();
    return;
  }
  if ($l9[0] === "--daemon-worker") {
    let { loadFastPathPolicy: $l34 } = await import("./chunk-X.js"), $l35 = await $l34($l16);
    if ($l35) process.stderr.write(`${$l35}
`);
    let { sessionFactsRestored: $l36 } = await import("./chunk-X.js"), $l37 = await $l36($l16);
    if ($l37 !== null) {
      let { endsInARowOf: $l38, workerEndingOf: $l39 } = await import("./chunk-X.js"), $l40 = $l39($l37, $l38($l9[2]));
      process.stderr.write($l40.said), process.exit($l40.code);
    }
    let { runDaemonWorker: $l41 } = await import("./chunk-X.js");
    await $l41($l9[1], $l16);
    return;
  }
  if ($l9[0] === "--bg-pty-host") {
    let { ensureFastPathSettingsLoaded: $l42 } = await import("./chunk-X.js");
    try {
      await $l42($l16);
    } catch ($l43) {
      process.stderr.write(`ptyHost: settings bootstrap threw (continuing; supervisor already gated): ${$l43?.stack ?? String($l43)}
`);
    }
    let { runPtyHost: $l44 } = await import("./chunk-X.js");
    await $l44($l9.slice(1));
    return;
  }
  if ($l9[0] === "--bg-spare") {
    let { ensureFastPathSettingsLoaded: $l45 } = await import("./chunk-X.js");
    await $l45(void 0);
    let { runBgSpare: $l46 } = await import("./chunk-X.js");
    await $l46($l9.slice(1));
    return;
  }
  if ($l9[0] === "--preload") {
    let { ensureFastPathSettingsLoaded: $l47 } = await import("./chunk-X.js");
    await $l47(void 0);
    let { runPreload: $l48 } = await import("./chunk-X.js");
    await $l48($l9.slice(1));
    return;
  }
  if ($l9[0] === "remote-control" || $l9[0] === "rc" || $l9[0] === "remote" || $l9[0] === "sync" || $l9[0] === "bridge") {
    $l14("cli_bridge_path");
    let [{ loadFastPathPolicy: $l49 }, { markNoDialogLaunch: $l50 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js")]);
    $l50();
    {
      let $l51 = await $l49($l16);
      if ($l51) {
        let { exitWithError: $l52 } = await import("./chunk-X.js");
        $l52($l51);
      }
    }
    if ($l9.slice(1).some(($l53) => $l53 === "--help" || $l53 === "-h")) {
      let { printRemoteControlHelp: $l54 } = await import("./chunk-X.js");
      await $l54();
      return;
    }
    let { sessionFactsRestored: $l55 } = await import("./chunk-X.js"), $l56 = await $l55($l16);
    if ($l56 !== null) {
      let { exitWithError: $l57 } = await import("./chunk-X.js");
      $l57($l56.reason);
    }
    let { refuseRemoteControlLocally: $l58, refuseRemoteControlIneligible: $l59, startRemoteControl: $l60 } = await import("./chunk-X.js"), $l61 = await $l58(), [{ pinStorageV5: $l62 }, { seedInstallIDs: $l63 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js")]), $l64 = $l62($l16);
    if ($m_V() && $l64 !== void 0) {
      let [{ credentialsStoreFor: $l65 }, { setGrowthBookCredentials: $l66, setGrowthBookStorageBackend: $l67 }, { composePolicyLimitsClient: $l68, primePolicyLimitsCache: $l69 }, { primeFastPathCredentials: $l70 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]), $l71 = $l65($l64);
      $l66($l71), $l67($l64), $l68({ storageV5: $l64, credentials: $l71 }), await $l70($l71), await $l69($l64), await $l63($l64);
    }
    let [{ initSinks: $l72 }, { initialize1PEventLogging: $l73 }, { credentialsStoreFor: $l74 }, { initDefaultDebugLog: $l75 }, { watchGlobalConfigThroughStorage: $l76 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]);
    $l72();
    let $l77 = $l74($l64);
    $l73($l64);
    let $l78 = await $l59($l61);
    if ($m_V() && $l64 !== void 0) $l75({ storageV5: $l64 }), $l76($l64);
    await $l60($l78, $l9.slice(1), $l64, $l77);
    return;
  }
  {
    let $l79 = $m_uai($l9);
    if ($l79 !== null) {
      $l14("cli_daemon_path");
      let { ensureFastPathSettingsLoaded: $l80 } = await import("./chunk-X.js");
      await $l80($l16);
      let { initializeErrorLogSink: $l81 } = await import("./chunk-X.js");
      $l81();
      let { daemonMain: $l82 } = await import("./chunk-X.js");
      await $l82($l79, $l16);
      return;
    }
  }
  let $l83 = process.env.CLAUDE_CODE_SESSION_KIND === "bg", $l84 = $l9.some(($l85) => $l85 === "logs" || $l85 === "attach" || $l85 === "stop" || $l85 === "kill" || $l85 === "respawn" || $l85 === "rm") ? require("./chunk-X.js").backgroundSessionVerbIndex($l9, { behindRootOptions: !$l83 }) : -1, $l86 = $l84 === -1 ? [] : $l9.slice($l84), $l87 = $l9.includes("--bg") || $l9.includes("--background") ? require("./chunk-X.js").hasBackgroundFlag($l9) : false, $l88 = false;
  if (!$l88 && ($l86.length > 0 || $l87 || false)) {
    if ($l14("cli_bg_path"), $m_fe($l9)) console.error($l86.length > 0 ? `--desktop can't be combined with \`claude ${$l86[0]}\`.` : "--desktop opens the Claude Desktop app and can't run in the background (`--bg`, `--background`, `--routine`)."), process.exit(1);
    if ($l84 > 0) {
      let [{ eagerParseCliFlag: $l89 }, { loadSettingsFromFlag: $l90, loadManagedSettingsFromFlag: $l91 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js")]), $l92 = $l9.slice(0, $l84), $l93 = $l89("--settings", $l92);
      if ($l93) $l90($l93);
      let $l94 = $l89("--managed-settings", $l92);
      if ($l94) $l91($l94);
    }
    let [{ loadFastPathPolicy: $l95 }, { setIsInteractive: $l96 }, { allowFlagFetchOnOwnCredential: $l97, getFeatureValue_CACHED_MAY_BE_STALE: $l98, hasWorkspaceTrust: $l99 }, { checkHasTrustDialogAccepted: $l100 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]), { sessionFactsRestored: $l101 } = await import("./chunk-X.js"), $l102 = null, $l103 = ["logs", "stop", "kill", "rm"].includes($l86[0] ?? "");
    {
      let $l104 = await $l95($l16);
      if ($l104) if ($l103) process.stderr.write(`${$l104}
`);
      else {
        let { exitWithError: $l105 } = await import("./chunk-X.js");
        $l105($l104);
      }
      if (process.stdout.isTTY && !$l100() && $l98("tengu_sable_orrery", true)) $l96(true);
      if ($l102 = await $l101($l16), $l102 !== null && !$l103) {
        let { exitWithError: $l106 } = await import("./chunk-X.js");
        $l106($l102.reason);
      }
    }
    let $l107 = $l102 === null;
    if ($l102 !== null) process.stderr.write(`${$l102.reason}
`);
    let $l108 = await import("./chunk-X.js");
    if (await $l108.ensureFleetGateHydrated({ kickGrowthBook: $l107 && !$l103 && ($l99() || $l97()) }), !$l108.isAgentsFleetEnabled()) {
      let $l109 = $l86[0] ?? $l9.find(($l110) => $l110 === "--bg" || $l110 === "--background" || $l110 === "--routine" || $l110.startsWith("--routine=")) ?? "--bg";
      return $l108.fleetGateRejected($l109);
    }
    let [$l111, { pinStorageV5: $l112 }, { initDefaultDebugLog: $l113 }, { seedInstallIDs: $l114, watchGlobalConfigThroughStorage: $l115 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]), $l116 = $l112($l16);
    if ($m_V() && $l116 !== void 0) {
      $l113({ storageV5: $l116 }), $l115($l116);
      let [{ credentialsStoreFor: $l117 }, { setGrowthBookCredentials: $l118, setGrowthBookStorageBackend: $l119 }, { composePolicyLimitsClient: $l120, primePolicyLimitsCache: $l121 }, { primeFastPathCredentials: $l122 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]), $l123 = $l117($l116);
      $l118($l123), $l119($l116), $l120({ storageV5: $l116, credentials: $l123 }), await $l122($l123), await $l121($l116), await $l114($l116);
    }
    switch ($l86[0]) {
      case "logs":
      case "attach":
      case "stop":
      case "kill":
      case "respawn":
      case "rm": {
        let [{ initializeAnalyticsSink: $l124 }, { initialize1PEventLogging: $l125, shutdown1PEventLogging: $l126 }, { shutdownDatadog: $l127 }, { sleep: $l128 }, { waitForOAuthRefreshBeforeExit: $l129 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]);
        if ($l107) $l124(), $l125($l116);
        if ($l86[0] === "logs") await $l111.logsHandler($l86[1], $l116);
        else if ($l86[0] === "attach") await $l111.attachHandler($l86[1], $l116);
        else if ($l86[0] === "respawn") await $l111.respawnHandler($l86[1], $l116);
        else if ($l86[0] === "rm") await $l111.rmHandler($l86[1], $l116, void 0, $l107);
        else await $l111.stopHandler($l86[1], $l116, $l107);
        return await Promise.race([Promise.all([$l126(), $l127()]), $l128(500, void 0, { unref: true })]).catch(() => {
        }), await $l129(), process.exit(process.exitCode ?? 0);
      }
      default: {
        let [{ initializeAnalyticsSink: $l130 }, { initialize1PEventLogging: $l131, shutdown1PEventLogging: $l132 }, { shutdownDatadog: $l133 }, { logEvent: $l134 }, { sleep: $l135 }, { waitForOAuthRefreshBeforeExit: $l136 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]);
        $l130(), $l131($l116), $l134("tengu_background", { via_flag: true, via: $m_b("flag") }), await $l111.handleBgFlag($l9, $l116), await Promise.race([Promise.all([$l132(), $l133()]), $l135(500, void 0, { unref: true })]).catch(() => {
        }), await $l136(), process.exit(process.exitCode ?? 0);
      }
    }
    return;
  }
  let $l137 = $m_jkt($l9);
  $l137.config.restricted ||= ["1", "true", "yes", "on"].includes((process.env.CLAUDE_CODE_RESTRICTED ?? "").toLowerCase().trim());
  let { dispatchDefaults: $l138, rest: $l139 } = $m_$e($l137.rest), $l140 = $l137.hasAgentsPositional && $m_ge($l139), $l141;
  if (($l140 || ($m_ge($l9) || $l141 !== void 0) && process.stdin.isTTY) && process.stdout.isTTY) {
    let { startCapturingEarlyInput: $l142, consumeEarlyInput: $l143 } = await import("./chunk-X.js");
    $l142();
    let [{ startMdmRawRead: $l144 }, { startKeychainPrefetch: $l145 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js")]);
    $l144(), $l145();
    let { enableConfigs: $l146, getGlobalConfig: $l147, seedInstallIDs: $l148 } = await import("./chunk-X.js"), $l149 = false, $l150 = false, $l151 = false;
    try {
      await $l146($m_V() ? $l16?.backend : void 0), $l150 = $l147().defaultToAgentsView === true, $l149 = $l140 || $l150 && $l141 === void 0;
    } catch {
    }
    if ($l149) {
      if ($l137.config.settings || $l137.config.managedSettings) {
        let { loadSettingsFromFlag: $l152, loadManagedSettingsFromFlag: $l153 } = await import("./chunk-X.js");
        if ($l137.config.settings) $l152($l137.config.settings);
        if ($l137.config.managedSettings) $l153($l137.config.managedSettings);
      }
      if ($l137.config.pluginDir.length > 0 || $l137.config.pluginDirNoMcp.length > 0) {
        let [{ setInlinePlugins: $l154, setInlinePluginsNoMcp: $l155 }, { clearPluginCache: $l156 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js")]);
        $l154($l137.config.pluginDir), $l155($l137.config.pluginDirNoMcp), $l156("claude agents --plugin-dir");
      }
      let { loadFastPathPolicy: $l157 } = await import("./chunk-X.js"), $l158 = await $l157($l16);
      if ($l158) {
        let { exitWithError: $l159 } = await import("./chunk-X.js");
        $l159($l158);
      }
      let $l160;
      if (process.env.CLAUDE_CODE_PLUGIN_DIRS?.trim()) {
        let [{ mergePluginDirs: $l161, PLUGIN_DIRS_ENV_RECOVERY_HINT: $l162, PLUGIN_DIRS_ENV_VAR: $l163, settlePluginDirsEnv: $l164, withoutPluginDirs: $l165 }, { setInlinePlugins: $l166 }, { clearPluginCache: $l167 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]), $l168 = $l165($l164(), $l137.config.pluginDirNoMcp);
        if ($l168.length > 0) $l160 = { name: $l163, hint: $l162 }, $l166($l161($l137.config.pluginDir, $l168)), $l167("claude agents CLAUDE_CODE_PLUGIN_DIRS");
      }
      {
        let { areSideloadFlagsDisabledByPolicy: $l169, sideloadFlagsBlockedMessage: $l170 } = await import("./chunk-X.js");
        if ($l169()) {
          let $l171 = [];
          if ($l137.config.pluginDir.length > 0) $l171.push("--plugin-dir");
          if ($l137.config.pluginDirNoMcp.length > 0) $l171.push("--plugin-dir-no-mcp");
          if ($l160) $l171.push($l160.name);
          if ($l171.length > 0) {
            let { exitWithError: $l172 } = await import("./chunk-X.js");
            $l172($l160 ? `${$l170($l171)} ${$l160.hint}` : $l170($l171));
          }
        }
      }
      let { isAgentsFleetEnabled: $l173, ensureFleetGateHydrated: $l174, fleetGateRejected: $l175, consumeAgentViewRelaunchMarker: $l176 } = await import("./chunk-X.js");
      await $l174({ kickGrowthBook: false });
      let $l177 = false;
      if ($l149 && $l173() && !$l177) {
        let { sessionFactsRestored: $l178 } = await import("./chunk-X.js"), $l179 = await $l178($l16);
        if ($l179 !== null) {
          let { exitWithError: $l180 } = await import("./chunk-X.js");
          $l180($l179.reason);
        }
        let [{ applyFleetViewHostWindowsEnv: $l181 }, { createRoot: $l182 }, { getBaseRenderOptions: $l183 }, { resolve: $l184 }, { getRootSession: $l185, setCliSessionConfigCarried: $l186, setIsInteractive: $l187, setRestrictedSession: $l188, setSessionStartType: $l189 }, { cliCarriesSessionConfig: $l190 }, { pinStorageV5: $l191 }, { appliedSettingSourcesFlagValue: $l192 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("path"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]), $l193 = { ...$l137.config, settingSources: $l192() }, $l194 = $l191($l16), $l195;
        if ($m_V() && $l194 !== void 0) {
          let [{ credentialsStoreFor: $l196 }, { setGrowthBookCredentials: $l197, setGrowthBookStorageBackend: $l198 }, { primeFastPathCredentials: $l199 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]);
          $l195 = $l196($l194), $l197($l195), $l198($l194), await $l199($l195), await $l148($l194);
        }
        import("./chunk-X.js").then(({ resolveSetting: $l200 }) => {
          let { value: $l201 } = $l200("theme", "dark");
          if ($l201.startsWith("custom:")) import("./chunk-X.js").then(($l202) => $l202.loadCustomThemes($l194));
        });
        let $l203 = $l176();
        $l187(true), $l186($l190({ ...$l193, ...$l138 })), $l188($l137.config.restricted), $l189("agents_view");
        let $l204 = () => {
        };
        process.on("unhandledRejection", $l204);
        let $l205 = Promise.resolve(), $l206 = () => {
        }, $l207 = new Promise(($l208) => {
          $l206 = $l208;
        });
        setImmediate(async () => {
          if ($m_V() && $l194 !== void 0) try {
            let [{ credentialsStoreFor: $l209 }, { composePolicyLimitsClient: $l210, primePolicyLimitsCache: $l211 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js")]);
            $l210({ storageV5: $l194, credentials: $l209($l194) }), await $l211($l194);
          } catch ($l212) {
            import("./chunk-X.js").then(({ logForDebugging: $l213 }) => $l213(`Policy limits: start-up composition on the agents path failed: ${$l212 instanceof Error ? $l212.message : String($l212)}`, { level: "warn" }));
          }
          $l205 = Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]).then(([{ setupGracefulShutdown: $l214 }, { initializeErrorLogSink: $l215 }, { initializeAnalyticsSink: $l216 }, { initialize1PEventLogging: $l217 }, { logEvent: $l218 }, { captureTeammateModeSnapshotIfEnabled: $l219 }, { initializeGrowthBook: $l220 }, { initializeTelemetryAfterTrust: $l221 }, { checkHasTrustDialogAccepted: $l222, watchGlobalConfigThroughStorage: $l223 }, { applyConfigEnvironmentVariables: $l224 }, { setRepoDetectionGuards: $l225 }, { initDefaultDebugLog: $l226 }]) => {
            if ($l214({ storageV5: $l194, credentials: $l195 }), $l225({ trustProbe: $l222 }), $l220().catch(() => {
            }), $l215(), $l216(), $l217($l194), $m_V() && $l194 !== void 0) $l226({ storageV5: $l194 }), $l223($l194);
            return $l207.then(() => {
              if ($l222()) $l224(), $l221($l194);
            }), $l218("tengu_fleetview", { defaultToAgentsView: $l150, relaunch: $l203 }), $l219();
          }).finally(() => process.off("unhandledRejection", $l204));
          let $l227 = () => void import("./chunk-X.js").then(($l228) => $l228.startBackgroundHousekeeping($l185().host, $l194));
          Promise.all([import("./chunk-X.js"), import("./chunk-X.js")]).then(([{ getFeatureValue_CACHED_MAY_BE_STALE: $l229 }, { checkHasTrustDialogAccepted: $l230 }]) => {
            if ($l229("tengu_noble_wozniak", true)) $l207.then(() => {
              if ($l230()) $l227();
            });
            else $l227();
          });
        }), $l143(), $l181();
        let $l231 = $l138?.permissionMode === "bypassPermissions" || $l138?.allowBypass ? await import("./chunk-X.js") : void 0;
        $l231?.refuseBypassUnderRoot($l138);
        let $l232 = $l231?.applyBypassPolicyGate($l138) ?? $l138, $l233 = await $l182($l183(false)), { ensureAgentsWorkspaceTrust: $l234, agentsTrustDecision: $l235 } = await import("./chunk-X.js");
        if (await $l234($l233, $l235(), $l194), $l206(), $l231) await $l231.ensureAgentsBypassConsent($l233, $l232, $l194);
        let $l236 = true;
        try {
          $l236 = require("./chunk-X.js").orgConfigGateFlagOnHand($l147(), process.env.CLAUDE_INTERNAL_FC_OVERRIDES);
        } catch {
        }
        if ($l236 && (await import("./chunk-X.js")).orgConfigGateFlagCouldArm()) {
          let { enforceOrgConfigGateOnLaunchLane: $l237 } = await import("./chunk-X.js");
          await $l237({ showBlockedScreen: () => import("./chunk-X.js").then(($l238) => $l238.showOrgConfigBlockedScreen, () => {
            return;
          }), printMessage: async ($l239) => {
            let { endInkWithError: $l240 } = await import("./chunk-X.js");
            await $l240($l233, $l239);
          } });
        }
        let $l241 = await import("./chunk-X.js"), $l242 = { cwdFilter: $l137.cwdFilter, dispatchExtraArgs: $m_Lfe($m_Wkt($l193, $l184)), dispatchDefaults: $l232, entryChannel: $l241.isListReturnRelaunch() ? "list_return" : $l140 ? "cli_agents" : "default_home", storageV5: $l194, credentials: $l195 };
        {
          let { mountFleetViewWithComposerBack: $l243 } = await import("./chunk-X.js");
          await $l243($l233, $l242);
        }
        await $l205.catch(() => {
        });
        let { gracefulShutdown: $l244 } = await import("./chunk-X.js");
        await $l244(0, "other", { suppressResumeHint: true });
        return;
      }
      if ($l140 && !$l177) return $l175("claude agents");
    }
  }
  if ($l9[0] === "self-hosted-runner") {
    $l14("cli_self_hosted_runner_path");
    let $l245 = $l9[1];
    if ($l245 === "orchestrator") {
      let { selfHostedRunnerOrchestratorMain: $l246 } = await import("./chunk-X.js");
      await $l246($l9.slice(2));
      return;
    }
    if ($l245 === "setup") {
      let { selfHostedRunnerSetupMain: $l247 } = await import("./chunk-X.js");
      await $l247($l9.slice(2), $l16);
      return;
    }
    if ($l245 === "doctor") {
      let { selfHostedRunnerDoctorMain: $l248 } = await import("./chunk-X.js");
      await $l248($l9.slice(2), $l16);
      return;
    }
    if ($l245 === "code-sign") {
      let { selfHostedRunnerCodeSignMain: $l249 } = await import("./chunk-X.js");
      await $l249($l9.slice(2));
      return;
    }
    if ($l245 === "decode-token") {
      let { selfHostedRunnerDecodeTokenMain: $l250 } = await import("./chunk-X.js");
      await $l250($l9.slice(2));
      return;
    }
    let { selfHostedRunnerMain: $l251 } = await import("./chunk-X.js");
    await $l251($l9.slice(1));
    return;
  }
  let $l252 = $l9.includes("--tmux") || $l9.includes("--tmux=classic");
  if (!$l88 && $l252 && ($l9.includes("-w") || $l9.includes("--worktree") || $l9.some(($l253) => $l253.startsWith("--worktree=")))) {
    if ($l14("cli_tmux_worktree_fast_path"), $m_fe($l9)) console.error("--desktop only opens the Claude Desktop app; it can't be combined with `--worktree` or `--tmux`."), process.exit(1);
    let { eagerLoadSettings: $l254 } = await import("./chunk-X.js");
    $l254();
    let { loadFastPathPolicy: $l255 } = await import("./chunk-X.js");
    {
      let $l256 = await $l255($l16);
      if ($l256) {
        let { exitWithError: $l257 } = await import("./chunk-X.js");
        $l257($l256);
      }
    }
    let { configureFastPathGlobalAgents: $l258 } = await import("./chunk-X.js");
    $l258();
    let { isWorktreeModeEnabled: $l259 } = await import("./chunk-X.js");
    if ($l259()) {
      let [{ execIntoTmuxWorktree: $l260 }, { pinStorageV5: $l261 }, { initDefaultDebugLog: $l262 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]), $l263 = $l261($l16), $l264;
      if ($m_V() && $l263 !== void 0) {
        $l262({ storageV5: $l263 });
        let [{ credentialsStoreFor: $l265 }, { setGrowthBookCredentials: $l266, setGrowthBookStorageBackend: $l267 }, { primeFastPathCredentials: $l268 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js"), import("./chunk-X.js")]);
        $l264 = $l265($l263), $l266($l264), $l267($l263), await $l268($l264);
        let { seedInstallIDs: $l269 } = await import("./chunk-X.js");
        await $l269($l263);
      }
      let $l270 = await $l260($l9, $l263, $l264);
      if ($l270.handled) return;
      let { exitWithError: $l271 } = await import("./chunk-X.js");
      $l271($l270.error);
    }
  }
  if ($l9.length === 1 && ($l9[0] === "--update" || $l9[0] === "--upgrade")) process.argv = [process.argv[0], process.argv[1], "update"];
  let $l272 = $l9.indexOf("--");
  if (($l272 === -1 ? $l9 : $l9.slice(0, $l272)).includes("--bare")) process.env.CLAUDE_CODE_SIMPLE = "1";
  let { NON_REPL_SUBCOMMANDS: $l273, isMcpServeInvocation: $l274, isPluginEvalInvocation: $l275, isRemoteControlInvocation: $l276, isAgentsJsonInvocation: $l277, isProjectVerbInvocation: $l278 } = await import("./chunk-X.js");
  if (!$l88 && !$l273.has(process.argv[2] ?? "") && !$l274(process.argv.slice(2)) && !$l275(process.argv.slice(2)) && !$l276(process.argv.slice(2)) && !$l277(process.argv.slice(2)) && !$l278(process.argv.slice(2))) {
    let { startCapturingEarlyInput: $l279 } = await import("./chunk-X.js");
    $l279();
  }
  let [{ startMdmRawRead: $l280 }, { startKeychainPrefetch: $l281 }] = await Promise.all([import("./chunk-X.js"), import("./chunk-X.js")]);
  $l280(), $l281(), $l14("cli_before_main_import"), (await import("./chunk-X.js")).configureZodForStartup();
  let { main: $l282 } = await import("./chunk-X.js");
  $l14("cli_after_main_import"), await $l282($l16), $l14("cli_after_main_complete");
}
;
