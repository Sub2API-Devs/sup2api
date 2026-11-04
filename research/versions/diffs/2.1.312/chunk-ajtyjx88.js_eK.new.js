function SELF($l0) {
  let $l1 = { model: $l0, canonical: $m_Xe($l0), provider: $m_Ae(), firstPartyOnlyBetas: $m_l_(), firstPartyCapabilityBetas: $m_eq($m_Od($l0)) && !$m_Hj(), interleavedThinking: $m_fnr($l0) }, $l2 = [];
  for (let $l3 of $m_QH) if ($l3.when($l1)) $l2.push($l3.beta);
  let $l4 = $m_i.ANTHROPIC_BETAS;
  if ($l4) if ($m_Lj()) $m_t("ANTHROPIC_BETAS ignored: experimental betas are disabled by your organization's policy", { level: "debug" });
  else for (let $l5 of $l4.split(",").map(($l6) => $l6.trim()).filter(($l7) => $l7 && !$m_WKt($l7))) {
    if ($l5 === $m_oqe) {
      $m_t(`ANTHROPIC_BETAS: '${$l5}' is generally available; the header is not sent`, { level: "debug" });
      continue;
    }
    $l2.push($m_H5o($l5));
  }
  return $l2;
}
;
