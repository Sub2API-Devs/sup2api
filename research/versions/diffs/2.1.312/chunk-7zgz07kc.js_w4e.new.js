async function SELF() {
  let $l0 = $m_MZ();
  if (!$l0) return null;
  let $l1 = $m_X(), $l2 = $l1.proxyAuthHelperConfig.sources === "personAndPolicy";
  if ($l2 && $m_ze($l1)) return null;
  if ($m_ze($l1) && !$m_ye() && !$l1.proxyAuthHelperConfig.trustAccepted()) return $m_t("proxyAuthHelper configured in project/local settings but workspace trust not yet accepted \u2014 skipping", { level: "warn" }), null;
  let $l3 = $l1.proxyAuthHelperConfig.readAsHelperStarts("proxyAuthHelper", $l0, () => $m_b4e());
  if ($l3 !== $m_b4e()) return $m_t("proxyAuthHelper is the organization's and the proxy in use is not the one it was started for: no credential sent", { level: "warn" }), null;
  let $l4 = $l1.proxyAuthPendingChallenge;
  if (!$l4 && $l1.proxyAuthCache && Date.now() - $l1.proxyAuthCache.timestamp < $m_ho()) return $l1.proxyAuthCache.value;
  $l1.proxyAuthPendingChallenge = void 0;
  let $l5;
  try {
    $l5 = $l3 ? new URL($l3).hostname : void 0;
  } catch {
    $l5 = void 0;
  }
  let $l6 = $l2 ? $NEW_chunk_ysqmgpjt_js_co() : $m_no(), $l7 = await $l1.proxyAuthHelperConfig.startHelper("proxyAuthHelper", $l0, () => $m_RM($l0, { ...$l6 !== null && { cwd: $l6 }, timeout: 3e4, reject: false, useToolMemoryCgroup: false, env: { ...process.env, ...$l3 && { CLAUDE_CODE_PROXY_URL: $l3 }, ...$l5 && { CLAUDE_CODE_PROXY_HOST: $l5 }, ...$l4 && { CLAUDE_CODE_PROXY_AUTHENTICATE: $l4 } } }));
  if ($l7.failed || !$l7.stdout?.trim()) {
    let $l8 = $l7.timedOut ? "timed out" : $l7.failed ? `exited ${$l7.exitCode}` : "did not return a value", $l9 = $l7.stderr?.trim();
    return console.error(`proxyAuthHelper failed: ${$l9 ? `${$l8}: ${$l9}` : $l8}`), $l1.proxyAuthCache?.value ?? null;
  }
  let $l10 = $l7.stdout.trim();
  return $l1.proxyAuthCache = { value: $l10, timestamp: Date.now() }, $l10;
}
;
