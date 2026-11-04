function SELF($l0) {
  if ($m_yc($l0) !== void 0) return;
  let $l1 = $m__$e($l0);
  if ($l1 === void 0 || $m_gSe($l1.id) !== void 0) return;
  let $l2 = $m_Aot($l1);
  if ($l2 === void 0 || $l2 === $l1.id) return;
  if ($m_vo().state === "refused") return;
  let $l3;
  try {
    $l3 = $m_pe("policySettings");
  } catch {
    return;
  }
  let $l4 = $l3?.availableModels;
  if ($l4 !== void 0 && !$m_no($l1.id, { allowlist: $l4, overridesMap: $l3?.modelOverrides ?? $m_Die() ?? {}, envFreeAliasResolution: true })) return;
  if ($m_rw($l2)) return;
  return $m_Wn($l2);
}
;
