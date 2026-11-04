function SELF($l0) {
  let $l1 = $m_Wn($l0), $l2 = $l1.toLowerCase();
  if (!Object.hasOwn($m_CP, $l2)) return $m_NK($l1) ?? $l1;
  let $l3 = $m_CP[$l2];
  if ($l3 === void 0) return $l1;
  let $l4 = $NEW_chunk_aepeg2w5_js_jw({ id: $l2, raw: $m_Qfe()[$l3], overrideKey: $l2 });
  if ($l4 === void 0) return $l1;
  let $l5 = $m_Te();
  if ($l4.overridden || $l5 !== "foundry" && $m_Bo[$l3][$l5] !== null) return $m_Wn($l4.mapped);
  return $l1;
}
;
