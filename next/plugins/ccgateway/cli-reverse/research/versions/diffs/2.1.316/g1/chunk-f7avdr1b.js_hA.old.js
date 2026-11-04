function SELF($l0) {
  let $l1 = $m_Wn($l0), $l2 = $l1.toLowerCase();
  if (!Object.hasOwn($m_CP, $l2)) return $m_NK($l1) ?? $l1;
  let $l3 = $m_CP[$l2];
  if ($l3 === void 0) return $l1;
  let $l4 = $m_Qfe()[$l3];
  if ($m_vo().state === "refused") return $l1;
  let $l5;
  try {
    $l5 = $m_pe("policySettings");
  } catch {
    return $l1;
  }
  let $l6 = $l5?.availableModels, $l7 = $l5?.modelOverrides ?? $m_Die() ?? {}, $l8, $l9;
  if ($l6 === void 0) $l8 = $m_Qp()[$l3], $l9 = $l8 !== $l4;
  else {
    if (!$m_no($l2, { allowlist: $l6, overridesMap: $l7, envFreeAliasResolution: true })) return $l1;
    let $l10 = $m_LK($l7, $l3);
    $l8 = $l10 ?? $l4, $l9 = $l10 !== void 0;
  }
  if ($l9 && $m_rw($l8)) $l8 = $l4, $l9 = false;
  let $l11 = $m_Te();
  if ($l9 || $l11 !== "foundry" && $m_Bo[$l3][$l11] !== null) return $m_Wn($l8);
  return $l1;
}
;
