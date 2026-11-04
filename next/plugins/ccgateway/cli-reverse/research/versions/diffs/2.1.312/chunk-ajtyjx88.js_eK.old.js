function SELF($l0) {
  let $l1 = $m_Hj(), $l2 = { model: $l0, canonical: $m_Xe($l0), provider: $m_Ae(), experimentalBetasOff: $l1, firstPartyOnlyBetas: $m_l_(), firstPartyCapabilityBetas: $m_eq($m_Od($l0)) && !$l1, interleavedThinking: $m_fnr($l0) }, $l3 = [];
  for (let $l4 of $m_QH) if ($l4.when($l2)) $l3.push($l4.beta);
  let $l5 = $m_i.ANTHROPIC_BETAS;
  if ($l5) if ($m_Lj()) $m_t("ANTHROPIC_BETAS ignored: experimental betas are disabled by your organization's policy", { level: "debug" });
  else for (let $l6 of $l5.split(",").map(($l7) => $l7.trim()).filter(($l8) => $l8 && !$m_WKt($l8))) {
    if ($l6 === $m_oqe) {
      $m_t(`ANTHROPIC_BETAS: '${$l6}' is generally available; the header is not sent`, { level: "debug" });
      continue;
    }
    $l3.push($m_H5o($l6));
  }
  return $l3;
}
;
