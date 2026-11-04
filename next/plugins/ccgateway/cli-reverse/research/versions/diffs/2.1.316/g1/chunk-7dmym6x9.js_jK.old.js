function SELF($l0) {
  let $l1 = process.env.CLAUDE_CODE_EXTRA_BODY, $l2 = {};
  if ($l1 && $m_bW()) $m_t("CLAUDE_CODE_EXTRA_BODY ignored: experimental betas are disabled by your organization's policy", { level: "debug" });
  else if ($l1) try {
    let $l3 = $m_st($l1);
    if ($l3 && typeof $l3 === "object" && !Array.isArray($l3)) $l2 = { ...$l3 };
    else $m_t(`CLAUDE_CODE_EXTRA_BODY env var must be a JSON object, but was given ${$l1}`, { level: "error" });
  } catch ($l4) {
    $m_t(`Error parsing CLAUDE_CODE_EXTRA_BODY: ${$m_d($l4)}`, { level: "error" });
  }
  for (let $l5 of ["betas", "anthropic_beta"]) {
    if (!($l5 in $l2)) continue;
    let $l6 = String($l2[$l5]).split(",").map(($l7) => $l7.trim()).filter(Boolean), $l8 = $l6.filter(($l9) => !$m_cYt($l9));
    if ($l8.length === $l6.length) continue;
    if ($m_t(`CLAUDE_CODE_EXTRA_BODY ${$l5}: dropped afk-mode \u2014 only auto mode itself sends that beta`, { level: "warn" }), $l8.length > 0) $l2[$l5] = $l8;
    else delete $l2[$l5];
  }
  let $l10 = $l2.metadata;
  if ($m_D($l10) && typeof $l10.user_id === "string") {
    let $l11 = $m_st($l10.user_id, false);
    if ($m_D($l11) && "tk" in $l11) {
      let { tk: $l12, ...$l13 } = $l11;
      $l2.metadata = { ...$l10, user_id: $m__($l13) };
    }
  }
  if ($l0 && $l0.length > 0) {
    let $l14 = $m_fF($l0);
    if ($l2.anthropic_beta && Array.isArray($l2.anthropic_beta)) {
      let $l15 = $l2.anthropic_beta, $l16 = $l14.filter(($l17) => !$l15.includes($l17));
      $l2.anthropic_beta = [...$l15, ...$l16];
    } else $l2.anthropic_beta = $l14;
  }
  return $l2;
}
;
