function SELF($l0) {
  return { isEnabled: () => $m_Zp(), isDiskCacheReadableWhileDisabled: () => $m_V9r(), hasWorkspaceTrust: () => $m_gYe() || $l0.fetchesOnOwnCredential, isFetchHeld: () => $m_ETt($l0.fetchHold), getAuthHeaders: $m_zxi, refreshOAuthTokenIfNeeded: ($l1, $l2) => $m_fa({ credentials: $l1, storageV5: $l2 }), getUserAttributes: () => $m_CEn(), rereadUserAttributes: () => ($m_M6t(), $m_$B(), $m_i9r(), $m_CEn()), readGlobalConfig: $m_rpi, saveGlobalConfig: ($l3, $l4) => {
    if (!$m_Cd()) $m_xe($l3, $l4);
  }, skipsSavingUnchangedFetch: () => $m_i.CLAUDE_CODE_REMOTE === true, readEnvironmentOverrides: () => $m_i.CLAUDE_INTERNAL_FC_OVERRIDES, profileFlagHost: $m_Kxi, logExposure: ($l5) => $m_Cd() || $m_YJo($l5), fetchRemoteEvalFromSdk: $m_IO, getRefreshCadence: () => $m_qxi(), sleep: ($l6, $l7, $l8) => $m_J($l6, $l7, $l8) };
}
;
