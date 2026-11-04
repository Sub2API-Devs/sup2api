function SELF() {
  let $l0 = {};
  for (let [$l1, $l2] of $m_gRe()) {
    if ($l1.toLowerCase() === "anthropic-beta" && $m_Lj()) {
      $m_t("ANTHROPIC_CUSTOM_HEADERS anthropic-beta ignored: experimental betas are disabled by your organization's policy", { level: "debug" });
      continue;
    }
    $l0[$l1] = $l2;
  }
  let $l3 = $m_Rlr();
  if ($l3 && !Object.keys($l0).some(($l4) => /^anthropic-client-(platform|version)$/i.test($l4))) $l0["anthropic-client-platform"] = "desktop_app", $l0["anthropic-client-version"] = $l3;
  let $l5 = $NEW_chunk_zpsbh0wk_js_zus();
  if ($l5 !== void 0) $l0[$NEW_chunk_f7avdr1b_js_V3r] = $l5;
  return $l0;
}
;
