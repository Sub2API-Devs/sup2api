async function SELF() {
  if (process.env.CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR !== void 0 || process.argv.includes("--session-tunnel")) {
    let { guardRelayTokenDescriptor: $l0 } = require("./chunk-qdz33bed.js");
    $l0();
  }
  let $l1 = $m_yai();
  if ($l1 === "refused") return;
  let $l2 = process.argv[2]?.startsWith("--runner-declares=") ? process.argv.splice(2, 1)[0] : void 0, $l3 = $m_Ror(process.argv);
  if ($l3) console.error($l3), process.exit(1);
  if (process.env.CLAUDE_CODE_REMOTE_SESSION_ORIGIN === "review") {
    let { guardRunnerReviewTokens: $l4 } = require("./chunk-vg3dnwjg.js");
    $l4();
  }
  let { noteProcessStartTuning: $l5 } = require("./chunk-ekn6ns24.js");
  $l5();
  let { startGarbageCollectionCount: $l6 } = require("./chunk-q05tz0rs.js");
  $l6();
  let { installCliArgvReader: $l7 } = require("./chunk-se6h1e6t.js");
  $l7(($l8) => require("./chunk-t3e54y16.js").cliFlagWords($l8));
  let $l9 = process.argv.slice(2);
  if (($l9.length === 1 || $l9.length === 2 && $l9[1] === "--verbose") && ($l9[0] === "--version" || $l9[0] === "-v" || $l9[0] === "-V")) {
    if (console.log(`${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.312", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-27T16:53:02Z", GIT_SHA: "f375cd85d4f70920de17ce3a4ad646e18834e833", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} (Claude Code)${$m_c6()}`), $l9.length === 2 && { ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.312", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-27T16:53:02Z", GIT_SHA: "f375cd85d4f70920de17ce3a4ad646e18834e833", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.GIT_SHA) console.log(`Commit: ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.312", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-27T16:53:02Z", GIT_SHA: "f375cd85d4f70920de17ce3a4ad646e18834e833", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.GIT_SHA}`);
    return;
  }
  let $l10 = $m_me();
  if ($l10) {
    console.error($l10);
    let { writeStartupFailureResult: $l11 } = await import("./chunk-ydc9pxwt.js"), { randomUUID: $l12 } = await import("crypto");
    await $l11({ sessionId: $l12(), message: $l10, reason: "cwd_unavailable" }), process.exit(1);
  }
  if ($l2 !== void 0) {
    let { adoptRunnerDeclaration: $l13 } = await import("./chunk-g3cb1xsg.js");
    await $l13($l2);
  }
  let { profileCheckpoint: $l14 } = await import("./chunk-h64jsvrm.js");
  $l14("cli_entry");
  let $l15 = $l9[0] === "--preload" || $l9[0] === "--bg-spare", $l16 = !$l15 && process.env.CLAUDE_CODE_HOVER_REST ? (await import("./chunk-ehp2swwm.js")).pinStorageV5FromEnv() : void 0;
  if (!$l15) setTimeout(() => {
    if (process.env.CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP) import("./chunk-txrg3v85.js").then(($l17) => $l17.setJitPolicyAfterStartup());
    else if (typeof Bun < "u") Bun.unsafe.setJITPolicy?.(1);
  }, 1e4).unref();
  if ($l1 !== void 0) {
    let { loadFastPathPolicy: $l18 } = await import("./chunk-44429y21.js"), $l19 = await $l18($l16);
    if ($l19) {
      let { exitWithError: $l20 } = await import("./chunk-hftey4qx.js");
      $l20($l19);
    }
    let { ghStandinMain: $l21 } = await import("./chunk-c7jmptsm.js");
    await $l21($l1);
    return;
  }
  if ($l9[0] === "plugin" && $l9[1] === "test") {
    let [{ loadFastPathPolicy: $l22 }, { pluginTestFormOf: $l23, pluginTestGatesOf: $l24, pluginTestRefusal: $l25 }, { endPluginTest: $l26 }] = await Promise.all([import("./chunk-44429y21.js"), import("./chunk-4cm44dsp.js"), import("./chunk-tkr475na.js")]), $l27 = $l25(await $l24({ helperError: await $l22($l16), form: $l23($l9.slice(2)), envPin: $l16 }));
    if ($l9[2] === "--file" && $l27 !== void 0) {
      let { REPORT_MARK: $l28 } = await import("./chunk-t6hwzfzx.js");
      process.stdout.write(`${$l28}${JSON.stringify({ file: $l9[3], results: [], error: $l27 })}
`);
      return;
    }
    if ($l27 !== void 0) return process.stderr.write(`claude plugin test: ${$l27}
`), process.exitCode = 1, $l26(process.exitCode);
    let { pluginTestMain: $l29 } = await import("./chunk-5c38w7gz.js");
    return process.exitCode = await $l29($l9.slice(2)), $l26(process.exitCode);
  }
  if (process.argv[2] === "--eval-mock-server") {
    $l14("cli_eval_mock_server_path");
    let { runEvalMockServer: $l30 } = await import("./chunk-p1zgtxs4.js");
    try {
      await $l30(process.argv[3], process.argv[4]);
    } catch ($l31) {
      console.error(`--eval-mock-server: ${$l31 instanceof Error ? $l31.message : String($l31)}`), process.exitCode = 1;
    }
    return;
  }
  if (process.argv[2] === "--claude-in-chrome-mcp") {
    $l14("cli_claude_in_chrome_mcp_path");
    let { runClaudeInChromeMcpServer: $l32 } = await import("./chunk-m79kghd1.js");
    await $l32($l16);
    return;
  } else if (process.argv[2] === "--chrome-native-host") {
    $l14("cli_chrome_native_host_path");
    let { runChromeNativeHost: $l33 } = await import("./chunk-emfdp8a9.js");
    await $l33();
    return;
  }
  if ($l9[0] === "--daemon-worker") {
    let { loadFastPathPolicy: $l34 } = await import("./chunk-44429y21.js"), $l35 = await $l34($l16);
    if ($l35) process.stderr.write(`${$l35}
`);
    let { sessionFactsRestored: $l36 } = await import("./chunk-d9bhph3f.js"), $l37 = await $l36($l16);
    if ($l37 !== null) {
      let { endsInARowOf: $l38, workerEndingOf: $l39 } = await import("./chunk-hc9jy3nv.js"), $l40 = $l39($l37, $l38($l9[2]));
      process.stderr.write($l40.said), process.exit($l40.code);
    }
    let { runDaemonWorker: $l41 } = await import("./chunk-bp9xxbtn.js");
    await $l41($l9[1], $l16);
    return;
  }
  if ($l9[0] === "--bg-pty-host") {
    let { ensureFastPathSettingsLoaded: $l42 } = await import("./chunk-44429y21.js");
    try {
      await $l42($l16);
    } catch ($l43) {
      process.stderr.write(`ptyHost: settings bootstrap threw (continuing; supervisor already gated): ${$l43?.stack ?? String($l43)}
`);
    }
    let { runPtyHost: $l44 } = await import("./chunk-9xpqznta.js");
    await $l44($l9.slice(1));
    return;
  }
  if ($l9[0] === "--bg-spare") {
    let { ensureFastPathSettingsLoaded: $l45 } = await import("./chunk-44429y21.js");
    await $l45(void 0);
    let { runBgSpare: $l46 } = await import("./chunk-vmpeqq7q.js");
    await $l46($l9.slice(1));
    return;
  }
  if ($l9[0] === "--preload") {
    let { ensureFastPathSettingsLoaded: $l47 } = await import("./chunk-44429y21.js");
    await $l47(void 0);
    let { runPreload: $l48 } = await import("./chunk-dtwxa3wd.js");
    await $l48($l9.slice(1));
    return;
  }
  if ($l9[0] === "remote-control" || $l9[0] === "rc" || $l9[0] === "remote" || $l9[0] === "sync" || $l9[0] === "bridge") {
    $l14("cli_bridge_path");
    let { loadFastPathPolicy: $l49 } = await import("./chunk-44429y21.js");
    {
      let $l50 = await $l49($l16);
      if ($l50) {
        let { exitWithError: $l51 } = await import("./chunk-hftey4qx.js");
        $l51($l50);
      }
    }
    if ($l9.slice(1).some(($l52) => $l52 === "--help" || $l52 === "-h")) {
      let { printRemoteControlHelp: $l53 } = await import("./chunk-qv4ya90p.js");
      await $l53();
      return;
    }
    let { sessionFactsRestored: $l54 } = await import("./chunk-d9bhph3f.js"), $l55 = await $l54($l16);
    if ($l55 !== null) {
      let { exitWithError: $l56 } = await import("./chunk-hftey4qx.js");
      $l56($l55.reason);
    }
    let { refuseRemoteControlLocally: $l57, refuseRemoteControlIneligible: $l58, startRemoteControl: $l59 } = await import("./chunk-v0yah5sd.js"), $l60 = await $l57(), [{ pinStorageV5: $l61 }, { seedInstallIDs: $l62 }] = await Promise.all([import("./chunk-5tce6xx9.js"), import("./chunk-jc2z6zq6.js")]), $l63 = $l61($l16);
    if ($m_V() && $l63 !== void 0) {
      let [{ credentialsStoreFor: $l64 }, { setGrowthBookCredentials: $l65, setGrowthBookStorageBackend: $l66 }, { composePolicyLimitsClient: $l67, primePolicyLimitsCache: $l68 }, { primeFastPathCredentials: $l69 }] = await Promise.all([import("./chunk-azpb56kx.js"), import("./chunk-45gb1y90.js"), import("./chunk-0g80xcq9.js"), import("./chunk-acmcvtcq.js")]), $l70 = $l64($l63);
      $l65($l70), $l66($l63), $l67({ storageV5: $l63, credentials: $l70 }), await $l69($l70), await $l68($l63), await $l62($l63);
    }
    let [{ initSinks: $l71 }, { initialize1PEventLogging: $l72 }, { credentialsStoreFor: $l73 }, { initDefaultDebugLog: $l74 }, { watchGlobalConfigThroughStorage: $l75 }] = await Promise.all([import("./chunk-7nghcmh0.js"), import("./chunk-mhxvca7k.js"), import("./chunk-azpb56kx.js"), import("./chunk-zbds9c98.js"), import("./chunk-jc2z6zq6.js")]);
    $l71();
    let $l76 = $l73($l63);
    $l72($l63);
    let $l77 = await $l58($l60);
    if ($m_V() && $l63 !== void 0) $l74({ storageV5: $l63 }), $l75($l63);
    await $l59($l77, $l9.slice(1), $l63, $l76);
    return;
  }
  {
    let $l78 = $m_uai($l9);
    if ($l78 !== null) {
      $l14("cli_daemon_path");
      let { ensureFastPathSettingsLoaded: $l79 } = await import("./chunk-44429y21.js");
      await $l79($l16);
      let { initializeErrorLogSink: $l80 } = await import("./chunk-c1byg4k1.js");
      $l80();
      let { daemonMain: $l81 } = await import("./chunk-8x871dzq.js");
      await $l81($l78, $l16);
      return;
    }
  }
  let $l82 = process.env.CLAUDE_CODE_SESSION_KIND === "bg", $l83 = $l9.some(($l84) => $l84 === "logs" || $l84 === "attach" || $l84 === "stop" || $l84 === "kill" || $l84 === "respawn" || $l84 === "rm") ? require("./chunk-t3e54y16.js").backgroundSessionVerbIndex($l9, { behindRootOptions: !$l82 }) : -1, $l85 = $l83 === -1 ? [] : $l9.slice($l83), $l86 = $l9.includes("--bg") || $l9.includes("--background") ? require("./chunk-t3e54y16.js").hasBackgroundFlag($l9) : false;
  if ($l85.length > 0 || $l86) {
    if ($l14("cli_bg_path"), $m_fe($l9)) console.error($l85.length > 0 ? `--desktop can't be combined with \`claude ${$l85[0]}\`.` : "--desktop opens the Claude Desktop app and can't run in the background (`--bg`, `--background`, `--routine`)."), process.exit(1);
    if ($l83 > 0) {
      let [{ eagerParseCliFlag: $l87 }, { loadSettingsFromFlag: $l88, loadManagedSettingsFromFlag: $l89 }] = await Promise.all([import("./chunk-t3e54y16.js"), import("./chunk-gpy0q76j.js")]), $l90 = $l9.slice(0, $l83), $l91 = $l87("--settings", $l90);
      if ($l91) $l88($l91);
      let $l92 = $l87("--managed-settings", $l90);
      if ($l92) $l89($l92);
    }
    let [{ loadFastPathPolicy: $l93 }, { setIsInteractive: $l94 }, { allowFlagFetchOnOwnCredential: $l95, getFeatureValue_CACHED_MAY_BE_STALE: $l96, hasWorkspaceTrust: $l97 }, { checkHasTrustDialogAccepted: $l98 }] = await Promise.all([import("./chunk-44429y21.js"), import("./chunk-c2txqh1z.js"), import("./chunk-45gb1y90.js"), import("./chunk-jc2z6zq6.js")]), { sessionFactsRestored: $l99 } = await import("./chunk-d9bhph3f.js"), $l100 = null, $l101 = ["logs", "stop", "kill", "rm"].includes($l85[0] ?? "");
    {
      let $l102 = await $l93($l16);
      if ($l102) if ($l101) process.stderr.write(`${$l102}
`);
      else {
        let { exitWithError: $l103 } = await import("./chunk-hftey4qx.js");
        $l103($l102);
      }
      if (process.stdout.isTTY && !$l98() && $l96("tengu_sable_orrery", true)) $l94(true);
      if ($l100 = await $l99($l16), $l100 !== null && !$l101) {
        let { exitWithError: $l104 } = await import("./chunk-hftey4qx.js");
        $l104($l100.reason);
      }
    }
    let $l105 = $l100 === null;
    if ($l100 !== null) process.stderr.write(`${$l100.reason}
`);
    let $l106 = await import("./chunk-98smgkv1.js");
    if (await $l106.ensureFleetGateHydrated({ kickGrowthBook: $l105 && !$l101 && ($l97() || $l95()) }), !$l106.isAgentsFleetEnabled()) {
      let $l107 = $l85[0] ?? $l9.find(($l108) => $l108 === "--bg" || $l108 === "--background" || $l108 === "--routine" || $l108.startsWith("--routine=")) ?? "--bg";
      return $l106.fleetGateRejected($l107);
    }
    let [$l109, { pinStorageV5: $l110 }, { initDefaultDebugLog: $l111 }, { seedInstallIDs: $l112, watchGlobalConfigThroughStorage: $l113 }] = await Promise.all([import("./chunk-k646qzz3.js"), import("./chunk-5tce6xx9.js"), import("./chunk-zbds9c98.js"), import("./chunk-jc2z6zq6.js")]), $l114 = $l110($l16);
    if ($m_V() && $l114 !== void 0) {
      $l111({ storageV5: $l114 }), $l113($l114);
      let [{ credentialsStoreFor: $l115 }, { setGrowthBookCredentials: $l116, setGrowthBookStorageBackend: $l117 }, { composePolicyLimitsClient: $l118, primePolicyLimitsCache: $l119 }, { primeFastPathCredentials: $l120 }] = await Promise.all([import("./chunk-azpb56kx.js"), import("./chunk-45gb1y90.js"), import("./chunk-0g80xcq9.js"), import("./chunk-acmcvtcq.js")]), $l121 = $l115($l114);
      $l116($l121), $l117($l114), $l118({ storageV5: $l114, credentials: $l121 }), await $l120($l121), await $l119($l114), await $l112($l114);
    }
    switch ($l85[0]) {
      case "logs":
      case "attach":
      case "stop":
      case "kill":
      case "respawn":
      case "rm": {
        let [{ initializeAnalyticsSink: $l122 }, { initialize1PEventLogging: $l123, shutdown1PEventLogging: $l124 }, { shutdownDatadog: $l125 }, { sleep: $l126 }, { waitForOAuthRefreshBeforeExit: $l127 }] = await Promise.all([import("./chunk-kraftxme.js"), import("./chunk-mhxvca7k.js"), import("./chunk-3x0sh09r.js"), import("./chunk-ymktyhe8.js"), import("./chunk-rjhdhhan.js")]);
        if ($l105) $l122(), $l123($l114);
        if ($l85[0] === "logs") await $l109.logsHandler($l85[1], $l114);
        else if ($l85[0] === "attach") await $l109.attachHandler($l85[1], $l114);
        else if ($l85[0] === "respawn") await $l109.respawnHandler($l85[1], $l114);
        else if ($l85[0] === "rm") await $l109.rmHandler($l85[1], $l114, void 0, $l105);
        else await $l109.stopHandler($l85[1], $l114, $l105);
        return await Promise.race([Promise.all([$l124(), $l125()]), $l126(500, void 0, { unref: true })]).catch(() => {
        }), await $l127(), process.exit(process.exitCode ?? 0);
      }
      default: {
        let [{ initializeAnalyticsSink: $l128 }, { initialize1PEventLogging: $l129, shutdown1PEventLogging: $l130 }, { shutdownDatadog: $l131 }, { logEvent: $l132 }, { sleep: $l133 }, { waitForOAuthRefreshBeforeExit: $l134 }] = await Promise.all([import("./chunk-kraftxme.js"), import("./chunk-mhxvca7k.js"), import("./chunk-3x0sh09r.js"), import("./chunk-e3ztdv3g.js"), import("./chunk-ymktyhe8.js"), import("./chunk-rjhdhhan.js")]);
        $l128(), $l129($l114), $l132("tengu_background", { via_flag: true, via: $m_b("flag") }), await $l109.handleBgFlag($l9, $l114), await Promise.race([Promise.all([$l130(), $l131()]), $l133(500, void 0, { unref: true })]).catch(() => {
        }), await $l134(), process.exit(process.exitCode ?? 0);
      }
    }
    return;
  }
  let $l135 = $m_jkt($l9);
  $l135.config.restricted ||= ["1", "true", "yes", "on"].includes((process.env.CLAUDE_CODE_RESTRICTED ?? "").toLowerCase().trim());
  let { dispatchDefaults: $l136, rest: $l137 } = $m_$e($l135.rest), $l138 = $l135.hasAgentsPositional && $m_ge($l137), $l139;
  if (($l138 || ($m_ge($l9) || $l139 !== void 0) && process.stdin.isTTY) && process.stdout.isTTY) {
    let { startCapturingEarlyInput: $l140, consumeEarlyInput: $l141 } = await import("./chunk-zznz5qmc.js");
    $l140();
    let [{ startMdmRawRead: $l142 }, { startKeychainPrefetch: $l143 }] = await Promise.all([import("./chunk-a1arf976.js"), import("./chunk-qzczhr3m.js")]);
    $l142(), $l143();
    let { enableConfigs: $l144, getGlobalConfig: $l145, seedInstallIDs: $l146 } = await import("./chunk-jc2z6zq6.js"), $l147 = false, $l148 = false, $l149 = false;
    try {
      await $l144($m_V() ? $l16?.backend : void 0), $l148 = $l145().defaultToAgentsView === true, $l147 = $l138 || $l148 && $l139 === void 0;
    } catch {
    }
    if ($l147) {
      if ($l135.config.settings || $l135.config.managedSettings) {
        let { loadSettingsFromFlag: $l150, loadManagedSettingsFromFlag: $l151 } = await import("./chunk-gpy0q76j.js");
        if ($l135.config.settings) $l150($l135.config.settings);
        if ($l135.config.managedSettings) $l151($l135.config.managedSettings);
      }
      if ($l135.config.pluginDir.length > 0 || $l135.config.pluginDirNoMcp.length > 0) {
        let [{ setInlinePlugins: $l152, setInlinePluginsNoMcp: $l153 }, { clearPluginCache: $l154 }] = await Promise.all([import("./chunk-c2txqh1z.js"), import("./chunk-z5ms80v4.js")]);
        $l152($l135.config.pluginDir), $l153($l135.config.pluginDirNoMcp), $l154("claude agents --plugin-dir");
      }
      let { loadFastPathPolicy: $l155 } = await import("./chunk-44429y21.js"), $l156 = await $l155($l16);
      if ($l156) {
        let { exitWithError: $l157 } = await import("./chunk-hftey4qx.js");
        $l157($l156);
      }
      let $l158;
      if (process.env.CLAUDE_CODE_PLUGIN_DIRS?.trim()) {
        let [{ mergePluginDirs: $l159, PLUGIN_DIRS_ENV_RECOVERY_HINT: $l160, PLUGIN_DIRS_ENV_VAR: $l161, settlePluginDirsEnv: $l162, withoutPluginDirs: $l163 }, { setInlinePlugins: $l164 }, { clearPluginCache: $l165 }] = await Promise.all([import("./chunk-wgrzc3kr.js"), import("./chunk-c2txqh1z.js"), import("./chunk-z5ms80v4.js")]), $l166 = $l163($l162(), $l135.config.pluginDirNoMcp);
        if ($l166.length > 0) $l158 = { name: $l161, hint: $l160 }, $l164($l159($l135.config.pluginDir, $l166)), $l165("claude agents CLAUDE_CODE_PLUGIN_DIRS");
      }
      {
        let { areSideloadFlagsDisabledByPolicy: $l167, sideloadFlagsBlockedMessage: $l168 } = await import("./chunk-n9e8n2q1.js");
        if ($l167()) {
          let $l169 = [];
          if ($l135.config.pluginDir.length > 0) $l169.push("--plugin-dir");
          if ($l135.config.pluginDirNoMcp.length > 0) $l169.push("--plugin-dir-no-mcp");
          if ($l158) $l169.push($l158.name);
          if ($l169.length > 0) {
            let { exitWithError: $l170 } = await import("./chunk-hftey4qx.js");
            $l170($l158 ? `${$l168($l169)} ${$l158.hint}` : $l168($l169));
          }
        }
      }
      let { isAgentsFleetEnabled: $l171, ensureFleetGateHydrated: $l172, fleetGateRejected: $l173, consumeAgentViewRelaunchMarker: $l174 } = await import("./chunk-98smgkv1.js");
      await $l172({ kickGrowthBook: false });
      let $l175 = false;
      if ($l147 && $l171() && !$l175) {
        let { sessionFactsRestored: $l176 } = await import("./chunk-d9bhph3f.js"), $l177 = await $l176($l16);
        if ($l177 !== null) {
          let { exitWithError: $l178 } = await import("./chunk-hftey4qx.js");
          $l178($l177.reason);
        }
        let [{ applyFleetViewHostWindowsEnv: $l179 }, { createRoot: $l180 }, { getBaseRenderOptions: $l181 }, { resolve: $l182 }, { getRootSession: $l183, setCliSessionConfigCarried: $l184, setIsInteractive: $l185, setRestrictedSession: $l186, setSessionStartType: $l187 }, { cliCarriesSessionConfig: $l188 }, { pinStorageV5: $l189 }, { appliedSettingSourcesFlagValue: $l190 }] = await Promise.all([import("./chunk-nexped8j.js"), import("./chunk-8ydgyxkw.js"), import("./chunk-dr9p223q.js"), import("path"), import("./chunk-c2txqh1z.js"), import("./chunk-jmwjqz3m.js"), import("./chunk-5tce6xx9.js"), import("./chunk-va1cfqc2.js")]), $l191 = { ...$l135.config, settingSources: $l190() }, $l192 = $l189($l16), $l193;
        if ($m_V() && $l192 !== void 0) {
          let [{ credentialsStoreFor: $l194 }, { setGrowthBookCredentials: $l195, setGrowthBookStorageBackend: $l196 }, { primeFastPathCredentials: $l197 }] = await Promise.all([import("./chunk-azpb56kx.js"), import("./chunk-45gb1y90.js"), import("./chunk-acmcvtcq.js")]);
          $l193 = $l194($l192), $l195($l193), $l196($l192), await $l197($l193), await $l146($l192);
        }
        import("./chunk-vpe2ea89.js").then(({ resolveSetting: $l198 }) => {
          let { value: $l199 } = $l198("theme", "dark");
          if ($l199.startsWith("custom:")) import("./chunk-pk6f3bwx.js").then(($l200) => $l200.loadCustomThemes($l192));
        });
        let $l201 = $l174();
        $l185(true), $l184($l188({ ...$l191, ...$l136 })), $l186($l135.config.restricted), $l187("agents_view");
        let $l202 = () => {
        };
        process.on("unhandledRejection", $l202);
        let $l203 = Promise.resolve(), $l204 = () => {
        }, $l205 = new Promise(($l206) => {
          $l204 = $l206;
        });
        setImmediate(async () => {
          if ($m_V() && $l192 !== void 0) try {
            let [{ credentialsStoreFor: $l207 }, { composePolicyLimitsClient: $l208, primePolicyLimitsCache: $l209 }] = await Promise.all([import("./chunk-azpb56kx.js"), import("./chunk-0g80xcq9.js")]);
            $l208({ storageV5: $l192, credentials: $l207($l192) }), await $l209($l192);
          } catch ($l210) {
            import("./chunk-zbds9c98.js").then(({ logForDebugging: $l211 }) => $l211(`Policy limits: start-up composition on the agents path failed: ${$l210 instanceof Error ? $l210.message : String($l210)}`, { level: "warn" }));
          }
          $l203 = Promise.all([import("./chunk-qjqhsgv1.js"), import("./chunk-c1byg4k1.js"), import("./chunk-kraftxme.js"), import("./chunk-mhxvca7k.js"), import("./chunk-e3ztdv3g.js"), import("./chunk-g342enw6.js"), import("./chunk-45gb1y90.js"), import("./chunk-w3y1c8q7.js"), import("./chunk-jc2z6zq6.js"), import("./chunk-wsx3n4dd.js"), import("./chunk-3brnm0m0.js"), import("./chunk-zbds9c98.js")]).then(([{ setupGracefulShutdown: $l212 }, { initializeErrorLogSink: $l213 }, { initializeAnalyticsSink: $l214 }, { initialize1PEventLogging: $l215 }, { logEvent: $l216 }, { captureTeammateModeSnapshotIfEnabled: $l217 }, { initializeGrowthBook: $l218 }, { initializeTelemetryAfterTrust: $l219 }, { checkHasTrustDialogAccepted: $l220, watchGlobalConfigThroughStorage: $l221 }, { applyConfigEnvironmentVariables: $l222 }, { setRepoDetectionGuards: $l223 }, { initDefaultDebugLog: $l224 }]) => {
            if ($l212({ storageV5: $l192, credentials: $l193 }), $l223({ trustProbe: $l220 }), $l218().catch(() => {
            }), $l213(), $l214(), $l215($l192), $m_V() && $l192 !== void 0) $l224({ storageV5: $l192 }), $l221($l192);
            return $l205.then(() => {
              if ($l220()) $l222(), $l219($l192);
            }), $l216("tengu_fleetview", { defaultToAgentsView: $l148, relaunch: $l201 }), $l217();
          }).finally(() => process.off("unhandledRejection", $l202));
          let $l225 = () => void import("./chunk-q37xjemw.js").then(($l226) => $l226.startBackgroundHousekeeping($l183().host, $l192));
          Promise.all([import("./chunk-45gb1y90.js"), import("./chunk-jc2z6zq6.js")]).then(([{ getFeatureValue_CACHED_MAY_BE_STALE: $l227 }, { checkHasTrustDialogAccepted: $l228 }]) => {
            if ($l227("tengu_noble_wozniak", true)) $l205.then(() => {
              if ($l228()) $l225();
            });
            else $l225();
          });
        }), $l141(), $l179();
        let $l229 = $l136?.permissionMode === "bypassPermissions" || $l136?.allowBypass ? await import("./chunk-58b0src9.js") : void 0;
        $l229?.refuseBypassUnderRoot($l136);
        let $l230 = $l229?.applyBypassPolicyGate($l136) ?? $l136, $l231 = await $l180($l181(false)), { ensureAgentsWorkspaceTrust: $l232, agentsTrustDecision: $l233 } = await import("./chunk-a66a1zpy.js");
        if (await $l232($l231, $l233(), $l192), $l204(), $l229) await $l229.ensureAgentsBypassConsent($l231, $l230, $l192);
        let $l234 = true;
        try {
          $l234 = require("./chunk-84kt9jh9.js").orgConfigGateFlagOnHand($l145(), process.env.CLAUDE_INTERNAL_FC_OVERRIDES);
        } catch {
        }
        if ($l234 && (await import("./chunk-40gj1ga5.js")).orgConfigGateFlagCouldArm()) {
          let { enforceOrgConfigGateOnLaunchLane: $l235 } = await import("./chunk-d96deaf5.js");
          await $l235({ showBlockedScreen: () => import("./chunk-twk7bj1c.js").then(($l236) => $l236.showOrgConfigBlockedScreen, () => {
            return;
          }), printMessage: async ($l237) => {
            let { endInkWithError: $l238 } = await import("./chunk-jc46vkqr.js");
            await $l238($l231, $l237);
          } });
        }
        let $l239 = await import("./chunk-98smgkv1.js"), $l240 = { cwdFilter: $l135.cwdFilter, dispatchExtraArgs: $m_Lfe($m_Wkt($l191, $l182)), dispatchDefaults: $l230, entryChannel: $l239.isListReturnRelaunch() ? "list_return" : $l138 ? "cli_agents" : "default_home", storageV5: $l192, credentials: $l193 };
        {
          let { mountFleetViewWithComposerBack: $l241 } = await import("./chunk-99y6epg1.js");
          await $l241($l231, $l240);
        }
        await $l203.catch(() => {
        });
        let { gracefulShutdown: $l242 } = await import("./chunk-qjqhsgv1.js");
        await $l242(0, "other", { suppressResumeHint: true });
        return;
      }
      if ($l138 && !$l175) return $l173("claude agents");
    }
  }
  if ($l9[0] === "self-hosted-runner") {
    $l14("cli_self_hosted_runner_path");
    let $l243 = $l9[1];
    if ($l243 === "orchestrator") {
      let { selfHostedRunnerOrchestratorMain: $l244 } = await import("./chunk-5n783mmv.js");
      await $l244($l9.slice(2));
      return;
    }
    if ($l243 === "setup") {
      let { selfHostedRunnerSetupMain: $l245 } = await import("./chunk-3a5b41fn.js");
      await $l245($l9.slice(2), $l16);
      return;
    }
    if ($l243 === "doctor") {
      let { selfHostedRunnerDoctorMain: $l246 } = await import("./chunk-frrga839.js");
      await $l246($l9.slice(2), $l16);
      return;
    }
    if ($l243 === "code-sign") {
      let { selfHostedRunnerCodeSignMain: $l247 } = await import("./chunk-yxxes21p.js");
      await $l247($l9.slice(2));
      return;
    }
    if ($l243 === "decode-token") {
      let { selfHostedRunnerDecodeTokenMain: $l248 } = await import("./chunk-cs39261g.js");
      await $l248($l9.slice(2));
      return;
    }
    let { selfHostedRunnerMain: $l249 } = await import("./chunk-3b615jfs.js");
    await $l249($l9.slice(1));
    return;
  }
  if (($l9.includes("--tmux") || $l9.includes("--tmux=classic")) && ($l9.includes("-w") || $l9.includes("--worktree") || $l9.some(($l250) => $l250.startsWith("--worktree=")))) {
    if ($l14("cli_tmux_worktree_fast_path"), $m_fe($l9)) console.error("--desktop only opens the Claude Desktop app; it can't be combined with `--worktree` or `--tmux`."), process.exit(1);
    let { eagerLoadSettings: $l251 } = await import("./chunk-gpy0q76j.js");
    $l251();
    let { loadFastPathPolicy: $l252 } = await import("./chunk-44429y21.js");
    {
      let $l253 = await $l252($l16);
      if ($l253) {
        let { exitWithError: $l254 } = await import("./chunk-hftey4qx.js");
        $l254($l253);
      }
    }
    let { configureFastPathGlobalAgents: $l255 } = await import("./chunk-61r2nkhm.js");
    $l255();
    let { isWorktreeModeEnabled: $l256 } = await import("./chunk-mtj0wrbr.js");
    if ($l256()) {
      let [{ execIntoTmuxWorktree: $l257 }, { pinStorageV5: $l258 }, { initDefaultDebugLog: $l259 }] = await Promise.all([import("./chunk-tzcff931.js"), import("./chunk-5tce6xx9.js"), import("./chunk-zbds9c98.js")]), $l260 = $l258($l16), $l261;
      if ($m_V() && $l260 !== void 0) {
        $l259({ storageV5: $l260 });
        let [{ credentialsStoreFor: $l262 }, { setGrowthBookCredentials: $l263, setGrowthBookStorageBackend: $l264 }, { primeFastPathCredentials: $l265 }] = await Promise.all([import("./chunk-azpb56kx.js"), import("./chunk-45gb1y90.js"), import("./chunk-acmcvtcq.js")]);
        $l261 = $l262($l260), $l263($l261), $l264($l260), await $l265($l261);
        let { seedInstallIDs: $l266 } = await import("./chunk-jc2z6zq6.js");
        await $l266($l260);
      }
      let $l267 = await $l257($l9, $l260, $l261);
      if ($l267.handled) return;
      let { exitWithError: $l268 } = await import("./chunk-hftey4qx.js");
      $l268($l267.error);
    }
  }
  if ($l9.length === 1 && ($l9[0] === "--update" || $l9[0] === "--upgrade")) process.argv = [process.argv[0], process.argv[1], "update"];
  let $l269 = $l9.indexOf("--");
  if (($l269 === -1 ? $l9 : $l9.slice(0, $l269)).includes("--bare")) process.env.CLAUDE_CODE_SIMPLE = "1";
  let { NON_REPL_SUBCOMMANDS: $l270, isMcpServeInvocation: $l271, isPluginEvalInvocation: $l272, isRemoteControlInvocation: $l273, isAgentsJsonInvocation: $l274, isProjectVerbInvocation: $l275 } = await import("./chunk-92x07v4v.js");
  if (!$l270.has(process.argv[2] ?? "") && !$l271(process.argv.slice(2)) && !$l272(process.argv.slice(2)) && !$l273(process.argv.slice(2)) && !$l274(process.argv.slice(2)) && !$l275(process.argv.slice(2))) {
    let { startCapturingEarlyInput: $l276 } = await import("./chunk-zznz5qmc.js");
    $l276();
  }
  let [{ startMdmRawRead: $l277 }, { startKeychainPrefetch: $l278 }] = await Promise.all([import("./chunk-a1arf976.js"), import("./chunk-qzczhr3m.js")]);
  $l277(), $l278(), $l14("cli_before_main_import"), (await import("./chunk-7crwvha2.js")).configureZodForStartup();
  let { main: $l279 } = await import("./chunk-z0by9v9h.js");
  $l14("cli_after_main_import"), await $l279($l16), $l14("cli_after_main_complete");
}
;
