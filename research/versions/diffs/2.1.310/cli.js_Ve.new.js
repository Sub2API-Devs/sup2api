async function SELF() {
  if (process.env.CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR !== void 0 || process.argv.includes("--session-tunnel")) {
    let { guardRelayTokenDescriptor: $l0 } = require("./chunk-dset9ats.js");
    $l0();
  }
  let $l1 = $m_j2s();
  if ($l1 === "refused") return;
  let $l2 = process.argv[2]?.startsWith("--runner-declares=") ? process.argv.splice(2, 1)[0] : void 0, $l3 = $m_x5n(process.argv);
  if ($l3) console.error($l3), process.exit(1);
  if (process.env.CLAUDE_CODE_REMOTE_SESSION_ORIGIN === "review") {
    let { guardRunnerReviewTokens: $l4 } = require("./chunk-d7xnw6q1.js");
    $l4();
  }
  let { installCliArgvReader: $l5 } = require("./chunk-3m102zvb.js");
  $l5(($l6) => require("./chunk-526awc2s.js").cliFlagWords($l6));
  let $l7 = process.argv.slice(2);
  if (($l7.length === 1 || $l7.length === 2 && $l7[1] === "--verbose") && ($l7[0] === "--version" || $l7[0] === "-v" || $l7[0] === "-V")) {
    if (console.log(`${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.310", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-23T17:43:32Z", GIT_SHA: "0d2056ecf42d9452a8cd8e054600024e7c557add", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} (Claude Code)${$m_SW()}`), $l7.length === 2 && { ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.310", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-23T17:43:32Z", GIT_SHA: "0d2056ecf42d9452a8cd8e054600024e7c557add", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.GIT_SHA) console.log(`Commit: ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.310", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-23T17:43:32Z", GIT_SHA: "0d2056ecf42d9452a8cd8e054600024e7c557add", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.GIT_SHA}`);
    return;
  }
  let $l8 = $m_le();
  if ($l8) {
    console.error($l8);
    let { writeStartupFailureResult: $l9 } = await import("./chunk-jemefars.js"), { randomUUID: $l10 } = await import("crypto");
    await $l9({ sessionId: $l10(), message: $l8, reason: "cwd_unavailable" }), process.exit(1);
  }
  if ($l2 !== void 0) {
    let { adoptRunnerDeclaration: $l11 } = await import("./chunk-h6vpkaz8.js");
    await $l11($l2);
  }
  let { profileCheckpoint: $l12 } = await import("./chunk-3xywv3r3.js");
  $l12("cli_entry");
  let $l13 = $l7[0] === "--preload" || $l7[0] === "--bg-spare", $l14 = !$l13 && process.env.CLAUDE_CODE_HOVER_REST ? (await import("./chunk-n0mjbx2n.js")).pinStorageV5FromEnv() : void 0;
  if (!$l13) setTimeout(() => {
    if (process.env.CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP) import("./chunk-91z6kme6.js").then(($l15) => $l15.setJitPolicyAfterStartup());
    else if (typeof Bun < "u") Bun.unsafe.setJITPolicy?.(1);
  }, 1e4).unref();
  if ($l1 !== void 0) {
    let { loadFastPathPolicy: $l16 } = await import("./chunk-r2a214y7.js"), $l17 = await $l16($l14);
    if ($l17) {
      let { exitWithError: $l18 } = await import("./chunk-ym7q3en9.js");
      $l18($l17);
    }
    let { ghStandinMain: $l19 } = await import("./chunk-9db1wvge.js");
    await $l19($l1);
    return;
  }
  if ($l7[0] === "plugin" && $l7[1] === "test") {
    let [{ loadFastPathPolicy: $l20 }, { pluginTestFormOf: $l21, pluginTestGatesOf: $l22, pluginTestRefusal: $l23 }, { endPluginTest: $l24 }] = await Promise.all([import("./chunk-r2a214y7.js"), import("./chunk-cnke90jd.js"), import("./chunk-81cfyq5v.js")]), $l25 = $l23(await $l22({ helperError: await $l20($l14), form: $l21($l7.slice(2)), envPin: $l14 }));
    if ($l7[2] === "--file" && $l25 !== void 0) {
      let { REPORT_MARK: $l26 } = await import("./chunk-784jstbs.js");
      process.stdout.write(`${$l26}${JSON.stringify({ file: $l7[3], results: [], error: $l25 })}
`);
      return;
    }
    if ($l25 !== void 0) return process.stderr.write(`claude plugin test: ${$l25}
`), process.exitCode = 1, $l24(process.exitCode);
    let { pluginTestMain: $l27 } = await import("./chunk-wwcnjtfb.js");
    return process.exitCode = await $l27($l7.slice(2)), $l24(process.exitCode);
  }
  if (process.argv[2] === "--eval-mock-server") {
    $l12("cli_eval_mock_server_path");
    let { runEvalMockServer: $l28 } = await import("./chunk-3yxqh53f.js");
    try {
      await $l28(process.argv[3], process.argv[4]);
    } catch ($l29) {
      console.error(`--eval-mock-server: ${$l29 instanceof Error ? $l29.message : String($l29)}`), process.exitCode = 1;
    }
    return;
  }
  if (process.argv[2] === "--claude-in-chrome-mcp") {
    $l12("cli_claude_in_chrome_mcp_path");
    let { runClaudeInChromeMcpServer: $l30 } = await import("./chunk-bnet7s1g.js");
    await $l30($l14);
    return;
  } else if (process.argv[2] === "--chrome-native-host") {
    $l12("cli_chrome_native_host_path");
    let { runChromeNativeHost: $l31 } = await import("./chunk-j4crbqwg.js");
    await $l31();
    return;
  }
  if ($l7[0] === "--daemon-worker") {
    let { loadFastPathPolicy: $l32 } = await import("./chunk-r2a214y7.js"), $l33 = await $l32($l14);
    if ($l33) process.stderr.write(`${$l33}
`);
    let { sessionFactsRestored: $l34 } = await import("./chunk-3ht3epe0.js"), $l35 = await $l34($l14);
    if ($l35 !== null) {
      let { endsInARowOf: $l36, workerEndingOf: $l37 } = await import("./chunk-mbyfh6a8.js"), $l38 = $l37($l35, $l36($l7[2]));
      process.stderr.write($l38.said), process.exit($l38.code);
    }
    let { runDaemonWorker: $l39 } = await import("./chunk-n10te31e.js");
    await $l39($l7[1], $l14);
    return;
  }
  if ($l7[0] === "--bg-pty-host") {
    let { ensureFastPathSettingsLoaded: $l40 } = await import("./chunk-r2a214y7.js");
    try {
      await $l40($l14);
    } catch ($l41) {
      process.stderr.write(`ptyHost: settings bootstrap threw (continuing; supervisor already gated): ${$l41?.stack ?? String($l41)}
`);
    }
    let { runPtyHost: $l42 } = await import("./chunk-7aasgh0z.js");
    await $l42($l7.slice(1));
    return;
  }
  if ($l7[0] === "--bg-spare") {
    let { ensureFastPathSettingsLoaded: $l43 } = await import("./chunk-r2a214y7.js");
    await $l43(void 0);
    let { runBgSpare: $l44 } = await import("./chunk-77e87nxk.js");
    await $l44($l7.slice(1));
    return;
  }
  if ($l7[0] === "--preload") {
    let { ensureFastPathSettingsLoaded: $l45 } = await import("./chunk-r2a214y7.js");
    await $l45(void 0);
    let { runPreload: $l46 } = await import("./chunk-rqpj1byv.js");
    await $l46($l7.slice(1));
    return;
  }
  if ($l7[0] === "remote-control" || $l7[0] === "rc" || $l7[0] === "remote" || $l7[0] === "sync" || $l7[0] === "bridge") {
    $l12("cli_bridge_path");
    let { loadFastPathPolicy: $l47 } = await import("./chunk-r2a214y7.js");
    {
      let $l48 = await $l47($l14);
      if ($l48) {
        let { exitWithError: $l49 } = await import("./chunk-ym7q3en9.js");
        $l49($l48);
      }
    }
    if ($l7.slice(1).some(($l50) => $l50 === "--help" || $l50 === "-h")) {
      let { printRemoteControlHelp: $l51 } = await import("./chunk-px7yqetn.js");
      await $l51();
      return;
    }
    let { sessionFactsRestored: $l52 } = await import("./chunk-3ht3epe0.js"), $l53 = await $l52($l14);
    if ($l53 !== null) {
      let { exitWithError: $l54 } = await import("./chunk-ym7q3en9.js");
      $l54($l53.reason);
    }
    let { refuseRemoteControlLocally: $l55, refuseRemoteControlIneligible: $l56, startRemoteControl: $l57 } = await import("./chunk-pkryw51j.js"), $l58 = await $l55(), [{ pinStorageV5: $l59 }, { seedInstallIDs: $l60 }] = await Promise.all([import("./chunk-nxmr3nws.js"), import("./chunk-ng9bf6hw.js")]), $l61 = $l59($l14);
    if ($m_z() && $l61 !== void 0) {
      let [{ credentialsStoreFor: $l62 }, { setGrowthBookCredentials: $l63, setGrowthBookStorageBackend: $l64 }, { composePolicyLimitsClient: $l65, primePolicyLimitsCache: $l66 }, { primeFastPathCredentials: $l67 }] = await Promise.all([import("./chunk-f2e9c2ck.js"), import("./chunk-4m15ar7w.js"), import("./chunk-g6pqvqm7.js"), import("./chunk-00syj6tm.js")]), $l68 = $l62($l61);
      $l63($l68), $l64($l61), $l65({ storageV5: $l61, credentials: $l68 }), await $l67($l68), await $l66($l61), await $l60($l61);
    }
    let [{ initSinks: $l69 }, { initialize1PEventLogging: $l70 }, { credentialsStoreFor: $l71 }, { initDefaultDebugLog: $l72 }, { watchGlobalConfigThroughStorage: $l73 }] = await Promise.all([import("./chunk-zcawy9vh.js"), import("./chunk-q3ks4p86.js"), import("./chunk-f2e9c2ck.js"), import("./chunk-9expqymv.js"), import("./chunk-ng9bf6hw.js")]);
    $l69();
    let $l74 = $l71($l61);
    $l70($l61);
    let $l75 = await $l56($l58);
    if ($m_z() && $l61 !== void 0) $l72({ storageV5: $l61 }), $l73($l61);
    await $l57($l75, $l7.slice(1), $l61, $l74);
    return;
  }
  {
    let $l76 = $m_F2s($l7);
    if ($l76 !== null) {
      $l12("cli_daemon_path");
      let { ensureFastPathSettingsLoaded: $l77 } = await import("./chunk-r2a214y7.js");
      await $l77($l14);
      let { initializeErrorLogSink: $l78 } = await import("./chunk-2vtyv1rv.js");
      $l78();
      let { daemonMain: $l79 } = await import("./chunk-7vavdsaz.js");
      await $l79($l76, $l14);
      return;
    }
  }
  let $l80 = process.env.CLAUDE_CODE_SESSION_KIND === "bg", $l81 = $l7.some(($l82) => $l82 === "logs" || $l82 === "attach" || $l82 === "stop" || $l82 === "kill" || $l82 === "respawn" || $l82 === "rm") ? require("./chunk-526awc2s.js").backgroundSessionVerbIndex($l7, { behindRootOptions: !$l80 }) : -1, $l83 = $l81 === -1 ? [] : $l7.slice($l81), $l84 = $l7.includes("--bg") || $l7.includes("--background") ? require("./chunk-526awc2s.js").hasBackgroundFlag($l7) : false;
  if ($l83.length > 0 || $l84) {
    if ($l12("cli_bg_path"), $m_de($l7)) console.error($l83.length > 0 ? `--desktop can't be combined with \`claude ${$l83[0]}\`.` : "--desktop opens the Claude Desktop app and can't run in the background (`--bg`, `--background`, `--routine`)."), process.exit(1);
    if ($l81 > 0) {
      let [{ eagerParseCliFlag: $l85 }, { loadSettingsFromFlag: $l86, loadManagedSettingsFromFlag: $l87 }] = await Promise.all([import("./chunk-526awc2s.js"), import("./chunk-pgp6bdc8.js")]), $l88 = $l7.slice(0, $l81), $l89 = $l85("--settings", $l88);
      if ($l89) $l86($l89);
      let $l90 = $l85("--managed-settings", $l88);
      if ($l90) $l87($l90);
    }
    let { loadFastPathPolicy: $l91 } = await import("./chunk-r2a214y7.js"), { sessionFactsRestored: $l92 } = await import("./chunk-3ht3epe0.js"), $l93 = null, $l94 = ["logs", "stop", "kill", "rm"].includes($l83[0] ?? "");
    {
      let $l95 = await $l91($l14);
      if ($l95) if ($l94) process.stderr.write(`${$l95}
`);
      else {
        let { exitWithError: $l96 } = await import("./chunk-ym7q3en9.js");
        $l96($l95);
      }
      if ($l93 = await $l92($l14), $l93 !== null && !$l94) {
        let { exitWithError: $l97 } = await import("./chunk-ym7q3en9.js");
        $l97($l93.reason);
      }
    }
    let $l98 = $l93 === null;
    if ($l93 !== null) process.stderr.write(`${$l93.reason}
`);
    let $l99 = await import("./chunk-4kqj0gsv.js");
    if (await $l99.ensureFleetGateHydrated({ kickGrowthBook: $l98 && !$l94 }), !$l99.isAgentsFleetEnabled()) {
      let $l100 = $l83[0] ?? $l7.find(($l101) => $l101 === "--bg" || $l101 === "--background" || $l101 === "--routine" || $l101.startsWith("--routine=")) ?? "--bg";
      return $l99.fleetGateRejected($l100);
    }
    let [$l102, { pinStorageV5: $l103 }, { initDefaultDebugLog: $l104 }, { seedInstallIDs: $l105, watchGlobalConfigThroughStorage: $l106 }] = await Promise.all([import("./chunk-gzy8x0qm.js"), import("./chunk-nxmr3nws.js"), import("./chunk-9expqymv.js"), import("./chunk-ng9bf6hw.js")]), $l107 = $l103($l14);
    if ($m_z() && $l107 !== void 0) {
      $l104({ storageV5: $l107 }), $l106($l107);
      let [{ credentialsStoreFor: $l108 }, { setGrowthBookCredentials: $l109, setGrowthBookStorageBackend: $l110 }, { composePolicyLimitsClient: $l111, primePolicyLimitsCache: $l112 }, { primeFastPathCredentials: $l113 }] = await Promise.all([import("./chunk-f2e9c2ck.js"), import("./chunk-4m15ar7w.js"), import("./chunk-g6pqvqm7.js"), import("./chunk-00syj6tm.js")]), $l114 = $l108($l107);
      $l109($l114), $l110($l107), $l111({ storageV5: $l107, credentials: $l114 }), await $l113($l114), await $l112($l107), await $l105($l107);
    }
    switch ($l83[0]) {
      case "logs":
      case "attach":
      case "stop":
      case "kill":
      case "respawn":
      case "rm": {
        let [{ initializeAnalyticsSink: $l115 }, { initialize1PEventLogging: $l116, shutdown1PEventLogging: $l117 }, { shutdownDatadog: $l118 }, { sleep: $l119 }] = await Promise.all([import("./chunk-f5tk9jgz.js"), import("./chunk-q3ks4p86.js"), import("./chunk-95xq10gb.js"), import("./chunk-v9a7hq3d.js")]);
        if ($l98) $l115(), $l116($l107);
        if ($l83[0] === "logs") await $l102.logsHandler($l83[1], $l107);
        else if ($l83[0] === "attach") await $l102.attachHandler($l83[1], $l107);
        else if ($l83[0] === "respawn") await $l102.respawnHandler($l83[1], $l107);
        else if ($l83[0] === "rm") await $l102.rmHandler($l83[1], $l107, void 0, $l98);
        else await $l102.stopHandler($l83[1], $l107, $l98);
        return await Promise.race([Promise.all([$l117(), $l118()]), $l119(500, void 0, { unref: true })]).catch(() => {
        }), process.exit(process.exitCode ?? 0);
      }
      default: {
        let [{ initializeAnalyticsSink: $l120 }, { initialize1PEventLogging: $l121, shutdown1PEventLogging: $l122 }, { shutdownDatadog: $l123 }, { logEvent: $l124 }, { sleep: $l125 }] = await Promise.all([import("./chunk-f5tk9jgz.js"), import("./chunk-q3ks4p86.js"), import("./chunk-95xq10gb.js"), import("./chunk-hmdcqdk1.js"), import("./chunk-v9a7hq3d.js")]);
        $l120(), $l121($l107), $l124("tengu_background", { via_flag: true, via: $m_b("flag") }), await $l102.handleBgFlag($l7, $l107), await Promise.race([Promise.all([$l122(), $l123()]), $l125(500, void 0, { unref: true })]).catch(() => {
        }), process.exit(process.exitCode ?? 0);
      }
    }
    return;
  }
  let $l126 = $m_Qht($l7);
  $l126.config.restricted ||= ["1", "true", "yes", "on"].includes((process.env.CLAUDE_CODE_RESTRICTED ?? "").toLowerCase().trim());
  let { dispatchDefaults: $l127, rest: $l128 } = $m_Ge($l126.rest), $l129 = $l126.hasAgentsPositional && $m_pe($l128), $l130;
  if (($l129 || ($m_pe($l7) || $l130 !== void 0) && process.stdin.isTTY) && process.stdout.isTTY) {
    let { startCapturingEarlyInput: $l131, consumeEarlyInput: $l132 } = await import("./chunk-t3vemenh.js");
    $l131();
    let [{ startMdmRawRead: $l133 }, { startKeychainPrefetch: $l134 }] = await Promise.all([import("./chunk-6fv3z964.js"), import("./chunk-8emk8hr6.js")]);
    $l133(), $l134();
    let { enableConfigs: $l135, getGlobalConfig: $l136, seedInstallIDs: $l137 } = await import("./chunk-ng9bf6hw.js"), $l138 = false, $l139 = false, $l140 = false;
    try {
      await $l135($m_z() ? $l14?.backend : void 0), $l139 = $l136().defaultToAgentsView === true, $l138 = $l129 || $l139 && $l130 === void 0;
    } catch {
    }
    if ($l138) {
      if ($l126.config.settings || $l126.config.managedSettings) {
        let { loadSettingsFromFlag: $l141, loadManagedSettingsFromFlag: $l142 } = await import("./chunk-pgp6bdc8.js");
        if ($l126.config.settings) $l141($l126.config.settings);
        if ($l126.config.managedSettings) $l142($l126.config.managedSettings);
      }
      if ($l126.config.pluginDir.length > 0 || $l126.config.pluginDirNoMcp.length > 0) {
        let [{ setInlinePlugins: $l143, setInlinePluginsNoMcp: $l144 }, { clearPluginCache: $l145 }] = await Promise.all([import("./chunk-k19pbtc6.js"), import("./chunk-ks6phceq.js")]);
        $l143($l126.config.pluginDir), $l144($l126.config.pluginDirNoMcp), $l145("claude agents --plugin-dir");
      }
      let { loadFastPathPolicy: $l146 } = await import("./chunk-r2a214y7.js"), $l147 = await $l146($l14);
      if ($l147) {
        let { exitWithError: $l148 } = await import("./chunk-ym7q3en9.js");
        $l148($l147);
      }
      let $l149;
      if (process.env.CLAUDE_CODE_PLUGIN_DIRS?.trim()) {
        let [{ mergePluginDirs: $l150, PLUGIN_DIRS_ENV_RECOVERY_HINT: $l151, PLUGIN_DIRS_ENV_VAR: $l152, settlePluginDirsEnv: $l153, withoutPluginDirs: $l154 }, { setInlinePlugins: $l155 }, { clearPluginCache: $l156 }] = await Promise.all([import("./chunk-1ehtghb9.js"), import("./chunk-k19pbtc6.js"), import("./chunk-ks6phceq.js")]), $l157 = $l154($l153(), $l126.config.pluginDirNoMcp);
        if ($l157.length > 0) $l149 = { name: $l152, hint: $l151 }, $l155($l150($l126.config.pluginDir, $l157)), $l156("claude agents CLAUDE_CODE_PLUGIN_DIRS");
      }
      {
        let { areSideloadFlagsDisabledByPolicy: $l158, sideloadFlagsBlockedMessage: $l159 } = await import("./chunk-wnvbqmc3.js");
        if ($l158()) {
          let $l160 = [];
          if ($l126.config.pluginDir.length > 0) $l160.push("--plugin-dir");
          if ($l126.config.pluginDirNoMcp.length > 0) $l160.push("--plugin-dir-no-mcp");
          if ($l149) $l160.push($l149.name);
          if ($l160.length > 0) {
            let { exitWithError: $l161 } = await import("./chunk-ym7q3en9.js");
            $l161($l149 ? `${$l159($l160)} ${$l149.hint}` : $l159($l160));
          }
        }
      }
      let { isAgentsFleetEnabled: $l162, ensureFleetGateHydrated: $l163, fleetGateRejected: $l164, consumeAgentViewRelaunchMarker: $l165 } = await import("./chunk-4kqj0gsv.js");
      await $l163({ kickGrowthBook: false });
      let $l166 = false;
      if ($l138 && $l162() && !$l166) {
        let { sessionFactsRestored: $l167 } = await import("./chunk-3ht3epe0.js"), $l168 = await $l167($l14);
        if ($l168 !== null) {
          let { exitWithError: $l169 } = await import("./chunk-ym7q3en9.js");
          $l169($l168.reason);
        }
        let [{ applyFleetViewHostWindowsEnv: $l170 }, { createRoot: $l171 }, { getBaseRenderOptions: $l172 }, { resolve: $l173 }, { getRootSession: $l174, setCliSessionConfigCarried: $l175, setIsInteractive: $l176, setRestrictedSession: $l177, setSessionStartType: $l178 }, { cliCarriesSessionConfig: $l179 }, { pinStorageV5: $l180 }, { appliedSettingSourcesFlagValue: $l181 }] = await Promise.all([import("./chunk-kaj9es1e.js"), import("./chunk-dfwb86d4.js"), import("./chunk-p6kasmjw.js"), import("path"), import("./chunk-k19pbtc6.js"), import("./chunk-9e1vt20d.js"), import("./chunk-nxmr3nws.js"), import("./chunk-7xafgem9.js")]), $l182 = { ...$l126.config, settingSources: $l181() }, $l183 = $l180($l14), $l184;
        if ($m_z() && $l183 !== void 0) {
          let [{ credentialsStoreFor: $l185 }, { setGrowthBookCredentials: $l186, setGrowthBookStorageBackend: $l187 }, { primeFastPathCredentials: $l188 }] = await Promise.all([import("./chunk-f2e9c2ck.js"), import("./chunk-4m15ar7w.js"), import("./chunk-00syj6tm.js")]);
          $l184 = $l185($l183), $l186($l184), $l187($l183), await $l188($l184), await $l137($l183);
        }
        import("./chunk-tgrpwkh0.js").then(({ resolveSetting: $l189 }) => {
          let { value: $l190 } = $l189("theme", "dark");
          if ($l190.startsWith("custom:")) import("./chunk-qp34g1bf.js").then(($l191) => $l191.loadCustomThemes($l183));
        });
        let $l192 = $l165();
        $l176(true), $l175($l179({ ...$l182, ...$l127 })), $l177($l126.config.restricted), $l178("agents_view");
        let $l193 = () => {
        };
        process.on("unhandledRejection", $l193);
        let $l194 = Promise.resolve(), $l195 = () => {
        }, $l196 = new Promise(($l197) => {
          $l195 = $l197;
        });
        setImmediate(async () => {
          if ($m_z() && $l183 !== void 0) try {
            let [{ credentialsStoreFor: $l198 }, { composePolicyLimitsClient: $l199, primePolicyLimitsCache: $l200 }] = await Promise.all([import("./chunk-f2e9c2ck.js"), import("./chunk-g6pqvqm7.js")]);
            $l199({ storageV5: $l183, credentials: $l198($l183) }), await $l200($l183);
          } catch ($l201) {
            import("./chunk-9expqymv.js").then(({ logForDebugging: $l202 }) => $l202(`Policy limits: start-up composition on the agents path failed: ${$l201 instanceof Error ? $l201.message : String($l201)}`, { level: "warn" }));
          }
          $l194 = Promise.all([import("./chunk-78yj3qej.js"), import("./chunk-2vtyv1rv.js"), import("./chunk-f5tk9jgz.js"), import("./chunk-q3ks4p86.js"), import("./chunk-hmdcqdk1.js"), import("./chunk-baxt3xhv.js"), import("./chunk-4m15ar7w.js"), import("./chunk-3xwr6mrg.js"), import("./chunk-ng9bf6hw.js"), import("./chunk-dkgpe20k.js"), import("./chunk-bt0dt01v.js"), import("./chunk-9expqymv.js")]).then(([{ setupGracefulShutdown: $l203 }, { initializeErrorLogSink: $l204 }, { initializeAnalyticsSink: $l205 }, { initialize1PEventLogging: $l206 }, { logEvent: $l207 }, { captureTeammateModeSnapshotIfEnabled: $l208 }, { initializeGrowthBook: $l209 }, { initializeTelemetryAfterTrust: $l210 }, { checkHasTrustDialogAccepted: $l211, watchGlobalConfigThroughStorage: $l212 }, { applyConfigEnvironmentVariables: $l213 }, { setRepoDetectionGuards: $l214 }, { initDefaultDebugLog: $l215 }]) => {
            if ($l203({ storageV5: $l183, credentials: $l184 }), $l214({ trustProbe: $l211 }), $l209().catch(() => {
            }), $l204(), $l205(), $l206($l183), $m_z() && $l183 !== void 0) $l215({ storageV5: $l183 }), $l212($l183);
            return $l196.then(() => {
              if ($l211()) $l213(), $l210($l183);
            }), $l207("tengu_fleetview", { defaultToAgentsView: $l139, relaunch: $l192 }), $l208();
          }).finally(() => process.off("unhandledRejection", $l193));
          let $l216 = () => void import("./chunk-gbz9zs8v.js").then(($l217) => $l217.startBackgroundHousekeeping($l174().host, $l183));
          Promise.all([import("./chunk-4m15ar7w.js"), import("./chunk-ng9bf6hw.js")]).then(([{ getFeatureValue_CACHED_MAY_BE_STALE: $l218 }, { checkHasTrustDialogAccepted: $l219 }]) => {
            if ($l218("tengu_noble_wozniak", true)) $l196.then(() => {
              if ($l219()) $l216();
            });
            else $l216();
          });
        }), $l132(), $l170();
        let $l220 = $l127?.permissionMode === "bypassPermissions" || $l127?.allowBypass ? await import("./chunk-mq0dwsw0.js") : void 0;
        $l220?.refuseBypassUnderRoot($l127);
        let $l221 = $l220?.applyBypassPolicyGate($l127) ?? $l127, $l222 = await $l171($l172(false)), { ensureAgentsWorkspaceTrust: $l223, agentsTrustDecision: $l224 } = await import("./chunk-sngkkz5k.js");
        if (await $l223($l222, $l224(), $l183), $l195(), $l220) await $l220.ensureAgentsBypassConsent($l222, $l221, $l183);
        let $l225 = true;
        try {
          $l225 = require("./chunk-gg1ytf58.js").orgConfigGateFlagOnHand($l136(), process.env.CLAUDE_INTERNAL_FC_OVERRIDES);
        } catch {
        }
        if ($l225 && (await import("./chunk-jat0gzcq.js")).orgConfigGateFlagCouldArm()) {
          let { enforceOrgConfigGateOnLaunchLane: $l226 } = await import("./chunk-3858habw.js");
          await $l226({ showBlockedScreen: () => import("./chunk-agmdkh40.js").then(($l227) => $l227.showOrgConfigBlockedScreen, () => {
            return;
          }), printMessage: async ($l228) => {
            let { endInkWithError: $l229 } = await import("./chunk-r57z5ye3.js");
            await $l229($l222, $l228);
          } });
        }
        let $l230 = await import("./chunk-4kqj0gsv.js"), $l231 = { cwdFilter: $l126.cwdFilter, dispatchExtraArgs: $m_Hle($m_Zht($l182, $l173)), dispatchDefaults: $l221, entryChannel: $l230.isListReturnRelaunch() ? "list_return" : $l129 ? "cli_agents" : "default_home", storageV5: $l183, credentials: $l184 };
        {
          let { mountFleetViewWithComposerBack: $l232 } = await import("./chunk-ff5zjg24.js");
          await $l232($l222, $l231);
        }
        await $l194.catch(() => {
        });
        let { gracefulShutdown: $l233 } = await import("./chunk-78yj3qej.js");
        await $l233(0, "other", { suppressResumeHint: true });
        return;
      }
      if ($l129 && !$l166) return $l164("claude agents");
    }
  }
  if ($l7[0] === "self-hosted-runner") {
    $l12("cli_self_hosted_runner_path");
    let $l234 = $l7[1];
    if ($l234 === "orchestrator") {
      let { selfHostedRunnerOrchestratorMain: $l235 } = await import("./chunk-zseedsx8.js");
      await $l235($l7.slice(2));
      return;
    }
    if ($l234 === "setup") {
      let { selfHostedRunnerSetupMain: $l236 } = await import("./chunk-phx4e89c.js");
      await $l236($l7.slice(2), $l14);
      return;
    }
    if ($l234 === "doctor") {
      let { selfHostedRunnerDoctorMain: $l237 } = await import("./chunk-9avr57v2.js");
      await $l237($l7.slice(2), $l14);
      return;
    }
    if ($l234 === "code-sign") {
      let { selfHostedRunnerCodeSignMain: $l238 } = await import("./chunk-tva1cmas.js");
      await $l238($l7.slice(2));
      return;
    }
    if ($l234 === "decode-token") {
      let { selfHostedRunnerDecodeTokenMain: $l239 } = await import("./chunk-th9tgqkt.js");
      await $l239($l7.slice(2));
      return;
    }
    let { selfHostedRunnerMain: $l240 } = await import("./chunk-twczwv3g.js");
    await $l240($l7.slice(1));
    return;
  }
  if (($l7.includes("--tmux") || $l7.includes("--tmux=classic")) && ($l7.includes("-w") || $l7.includes("--worktree") || $l7.some(($l241) => $l241.startsWith("--worktree=")))) {
    if ($l12("cli_tmux_worktree_fast_path"), $m_de($l7)) console.error("--desktop only opens the Claude Desktop app; it can't be combined with `--worktree` or `--tmux`."), process.exit(1);
    let { eagerLoadSettings: $l242 } = await import("./chunk-pgp6bdc8.js");
    $l242();
    let { loadFastPathPolicy: $l243 } = await import("./chunk-r2a214y7.js");
    {
      let $l244 = await $l243($l14);
      if ($l244) {
        let { exitWithError: $l245 } = await import("./chunk-ym7q3en9.js");
        $l245($l244);
      }
    }
    let { configureFastPathGlobalAgents: $l246 } = await import("./chunk-wsjvspnq.js");
    $l246();
    let { isWorktreeModeEnabled: $l247 } = await import("./chunk-5q5hvn78.js");
    if ($l247()) {
      let [{ execIntoTmuxWorktree: $l248 }, { pinStorageV5: $l249 }, { initDefaultDebugLog: $l250 }] = await Promise.all([import("./chunk-xqhvms6c.js"), import("./chunk-nxmr3nws.js"), import("./chunk-9expqymv.js")]), $l251 = $l249($l14), $l252;
      if ($m_z() && $l251 !== void 0) {
        $l250({ storageV5: $l251 });
        let [{ credentialsStoreFor: $l253 }, { setGrowthBookCredentials: $l254, setGrowthBookStorageBackend: $l255 }, { primeFastPathCredentials: $l256 }] = await Promise.all([import("./chunk-f2e9c2ck.js"), import("./chunk-4m15ar7w.js"), import("./chunk-00syj6tm.js")]);
        $l252 = $l253($l251), $l254($l252), $l255($l251), await $l256($l252);
        let { seedInstallIDs: $l257 } = await import("./chunk-ng9bf6hw.js");
        await $l257($l251);
      }
      let $l258 = await $l248($l7, $l251, $l252);
      if ($l258.handled) return;
      let { exitWithError: $l259 } = await import("./chunk-ym7q3en9.js");
      $l259($l258.error);
    }
  }
  if ($l7.length === 1 && ($l7[0] === "--update" || $l7[0] === "--upgrade")) process.argv = [process.argv[0], process.argv[1], "update"];
  let $l260 = $l7.indexOf("--");
  if (($l260 === -1 ? $l7 : $l7.slice(0, $l260)).includes("--bare")) process.env.CLAUDE_CODE_SIMPLE = "1";
  let { NON_REPL_SUBCOMMANDS: $l261, isMcpServeInvocation: $l262, isPluginEvalInvocation: $l263, isRemoteControlInvocation: $l264, isAgentsJsonInvocation: $l265, isProjectVerbInvocation: $l266 } = await import("./chunk-y7venc25.js");
  if (!$l261.has(process.argv[2] ?? "") && !$l262(process.argv.slice(2)) && !$l263(process.argv.slice(2)) && !$l264(process.argv.slice(2)) && !$l265(process.argv.slice(2)) && !$l266(process.argv.slice(2))) {
    let { startCapturingEarlyInput: $l267 } = await import("./chunk-t3vemenh.js");
    $l267();
  }
  let [{ startMdmRawRead: $l268 }, { startKeychainPrefetch: $l269 }] = await Promise.all([import("./chunk-6fv3z964.js"), import("./chunk-8emk8hr6.js")]);
  $l268(), $l269(), $l12("cli_before_main_import"), (await import("./chunk-r669nch4.js")).configureZodForStartup();
  let { main: $l270 } = await import("./chunk-kfdf5pq3.js");
  $l12("cli_after_main_import"), await $l270($l14), $l12("cli_after_main_complete");
}
;
