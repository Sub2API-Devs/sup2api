function SELF() {
  let $l0 = $m_i.CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET;
  if ($l0 !== void 0 && $l0 > 0) return $l0;
  let $l1 = $m_ft().totalTokensReminderBudget;
  if (Number.isFinite($l1) && $l1 > 0) return $l1;
  let $l2 = $m_Sd()?.[$NEW_chunk_e6aww6q8_js_e7e], $l3 = typeof $l2 === "number" && Number.isInteger($l2) && $l2 > 0;
  if ($m_Wor($NEW_chunk_e6aww6q8_js_e7e, $l2, $l3 ? { budget: $l2 } : void 0), $l3) return $l2;
  let $l4 = $m_k($NEW_chunk_e6aww6q8_js_e7e, $NEW_chunk_e6aww6q8_js_Kin);
  return Number.isFinite($l4) && $l4 > 0 ? $l4 : $NEW_chunk_e6aww6q8_js_Kin;
}
;
