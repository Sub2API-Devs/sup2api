function SELF($l0, $l1, $l2) {
  if ($l0?.type !== "disabled") return $l0;
  let $l3 = Object.keys($l0).filter(($l4) => $l4 !== "type");
  if ($l3.length === 0) return $l0;
  if ($l2) $m_a("tengu_thinking_disabled_sanitized", { hadDisplay: $l3.includes("display") ? $m_b("true") : $m_b("false"), extraKeyCount: $l3.length, querySourceCategory: $m_le($m_ss($l1)), hasExtraBodyEnv: $m_i.CLAUDE_CODE_EXTRA_BODY ? $m_b("true") : $m_b("false") }), $m_t(`[thinking] stripped ${$l3.length} extra key(s) from {type:'disabled'} thinking param (gh-68567)`, { level: "warn" });
  return { type: "disabled" };
}
;
