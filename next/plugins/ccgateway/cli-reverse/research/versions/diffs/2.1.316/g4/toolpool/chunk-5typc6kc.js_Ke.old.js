SELF = { initialize: $m_Pw, isSandboxingEnabled: $m_Gc, isSandboxEnabledInSettings: $m_Xl, isPlatformInEnabledList: $m_ph, passesCheapSandboxGates: $m_hh, needsRestartForTlsTerminate: $m_Bfe, getSandboxUnavailableReason: $m_Yw, getSandboxSetUpAgainWarning: $m_hfe, needsRestartForLocalConnections: $m_pV, getSandboxRestartWarning: $m_pfe, untilRestart: $m_qw, areSandboxSettingsLockedByManagedSettings: $m_dV, getProfileReadSecurityWarnings: $m_mfe, getMaskCredentialWarning: $m_yfe, canMaskCredentialWarningFire: $m_p3, isAutoAllowBashIfSandboxedEnabled: $m_Xde, isAutoAllowSupported: $m_XV, areUnsandboxedCommandsAllowed: $m_dfe, isOnButNotRunning: $m_u3, isStrictSandboxModeConfigured: $m_JV, isSandboxRequired: $m_Qd, areSandboxSettingsLockedByPolicy: $m_h3, areUnsandboxedCommandsForbiddenByPolicy: $m_Kw, isUnsandboxedFallbackClosedByTrustedTier: $m_jw, isUnsandboxedFallbackClosedByTrustedSource: $m_ffe, isSandboxedAttemptGateEnabled: $m_oT, setSandboxSettings: $m_xfe, getExcludedCommands: $m__fe, getConfiguredNetworkAllowances: $m_m3, isAllowAllUnixSocketsConfigured: $m_vfe, getConfiguredFilesystemGrants: $m_wfe, wrapWithSandbox: $m_Afe, wrapWithSandboxArgv: $m_Cfe, invalidateDependencyCache: () => {
  let $l0 = $m_Ge();
  $l0.dependencyProbeGeneration++, $l0.checkDependenciesProbe.cache.clear?.(), $l0.sandboxDisabledThisSession = false, $l0.initFailureReason = void 0, $l0.configBuildFailed = false, $l0.realPathTwins = "unlisted", $l0.selfExecGrantAttempt = void 0;
}, refreshConfig: $m_Cb, addSessionAllowedHost: $m_cde, reset: $m_Ufe, checkDependencies: $m_Wc, rememberedDependencyCheck: $m_Yde, checkDependenciesAsync: $m_Zde, getConfig: () => $m_ti($m_tn.getConfig()), getFsReadConfig: () => {
  let $l1 = $m_ti($m_tn.getConfig());
  if ($l1?.filesystem.disabled) return { denyOnly: $l1.filesystem.denyRead.map($m_Vh), allowWithinDeny: ($l1.filesystem.allowRead ?? []).map($m_Vh) };
  let $l2 = $m_Ge();
  if ($l2.fsReadConfigMemo !== void 0 && $l2.fsReadConfigMemo.cfg === $l1) return $l2.fsReadConfigMemo.result;
  let $l3 = $m_I(), $l4 = $l1?.credentials?.files ?? [], $l5 = $l4.filter(($l6) => $l6.mode === "deny").map(($l7) => $l7.path);
  if (($l3 === "linux" || $l3 === "wsl") && [...$l1?.filesystem.denyRead ?? [], ...$l1?.filesystem.allowRead ?? [], ...$l5].some(($l8) => $m_gd($m_Vh($l8)))) {
    let $l9 = $m_Y$($l1, $l5);
    return $l2.fsReadConfigMemo = { cfg: $l1, result: $l9 }, $l9;
  }
  try {
    let $l10 = $m_tn.getFsReadConfig();
    return $l2.fsReadConfigMemo = { cfg: $l1, result: $l10 }, $l10;
  } catch ($l11) {
    $m_t(`[sandbox] getFsReadConfig threw; falling back to raw deny lists: ${$l11}`);
    let $l12 = $m_Y$($l1, $l4.map(($l13) => $l13.path));
    return $l2.fsReadConfigMemo = { cfg: $l1, result: $l12 }, $l12;
  }
}, storedDenyListsMayBeShort: () => $m_Ge().storedDenyListsMayBeShort, getFsWriteConfig: () => {
  let $l14 = $m_ti($m_tn.getConfig());
  if ($l14?.filesystem.disabled) return { allowOnly: $l14.filesystem.allowWrite.map($m_Vh), denyWithinAllow: $l14.filesystem.denyWrite.map($m_Vh) };
  return $m_tn.getFsWriteConfig();
}, getNetworkRestrictionConfig: () => {
  if ($m_tn.getConfig()?.network?.allowedDomains === void 0) return {};
  return $m_tn.getNetworkRestrictionConfig();
}, getIgnoreViolations: $m_tn.getIgnoreViolations, getLinuxGlobPatternWarnings: $m_bfe, getDeniesDroppedForAnotherHost: $m_jde, onDeniesDroppedForAnotherHostChanged: $m_qde, getUnbracketedIpv6DomainWarnings: $m_Sfe, getUnbracketedIpv6InjectHostWarnings: $m_Efe, isSupportedPlatform: $m_Tb, getAllowUnixSockets: $m_tn.getAllowUnixSockets, getAllowLocalBinding: $m_tn.getAllowLocalBinding, getAllowMachLookup: $m_tn.getAllowMachLookup, getEnableWeakerNestedSandbox: $m_tn.getEnableWeakerNestedSandbox, getProxyPort: $m_tn.getProxyPort, getProxyAuthToken: $m_tn.getProxyAuthToken, getSocksProxyPort: $m_tn.getSocksProxyPort, getLinuxHttpSocketPath: $m_tn.getLinuxHttpSocketPath, getLinuxSocksSocketPath: $m_tn.getLinuxSocksSocketPath, waitForNetworkInitialization: $m_tn.waitForNetworkInitialization, ensureInitializedForWrap: $m_Zw, getSandboxViolationStore: $m_tn.getSandboxViolationStore, annotateStderrWithSandboxFailures: $m_tn.annotateStderrWithSandboxFailures, registerCommandNetworkLists: $m_tn.registerCommandNetworkLists, unregisterCommandNetworkLists: $m_tn.unregisterCommandNetworkLists, askCallbackDenyReason: $m_tn.askCallbackDenyReason === true, denyAllNetworkOption: $m_tn.denyAllNetworkOption === true, cleanupAfterCommand: ($l15, $l16, $l17) => {
  $m_tn.cleanupAfterCommand(), $m_yw($l15, $l16, { wroteOnlyItsOwnScratch: $l17?.wroteOnlyItsOwnScratch });
}, scrubAfterCommand: () => {
  $m_yw();
}, cleanupAfterCommandWithoutScrubs: () => {
  $m_tn.cleanupAfterCommand(), $m_yw(void 0, void 0, { skipsScrubs: true });
}, snapshotBareGitRepoScrubPaths: () => {
  let $l18 = $m_Ge();
  return { paths: [...$l18.bareGitRepoScrubPaths.keys()], pathsVouchedLocally: $l18.bareGitRepoScrubPathsVouchedLocally };
}, snapshotSymlinkedDenyScrubPaths: () => $m_Ge().symlinkedDenyScrubPaths.map(($l19) => ({ literal: $l19.literal, resolved: $l19.resolved, hopDirectories: $l19.hopDirectories === null ? null : [...$l19.hopDirectories], danglingBaseline: $l19.danglingBaseline })) };
