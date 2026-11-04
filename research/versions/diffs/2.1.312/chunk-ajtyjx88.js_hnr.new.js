function SELF($l0, $l1) {
  let $l2 = [...$m_xoe($l0)];
  if ($l1?.isAgenticQuery && !$l2.includes($m_UKt)) $l2.push($m_UKt);
  let $l3 = $m_Xe($l0), $l4 = { model: $l0, canonical: $l3, perTurnTiming: $m_CVr($l0, $l3) };
  for (let $l5 of $m_ZH) if ($l5.when($l4) && !$l2.includes($l5.beta)) $l2.push($l5.beta);
  let $l6 = $m_dm();
  if (!$l6 || $l6.length === 0) return $l2;
  let $l7 = $m_tYr($l6);
  if (!$l7) return $m_t("SDK betas dropped: experimental betas are disabled by your organization's policy", { level: "debug" }), $l2;
  let $l8 = $l7.map($m_H5o);
  if (!$m_l_()) $l8 = $l8.filter(($l9) => {
    if ($m_Qk.has($l9)) return true;
    return $m_t(`SDK beta '${$l9.header}' dropped on 3P`, { level: "debug" }), false;
  });
  return $m_ip($l0, [...$l2, ...$l8.filter(($l10) => !$l2.includes($l10))]);
}
;
