function SELF() {
  let $l0 = $m_i.CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET;
  if ($l0 !== void 0 && $l0 > 0) return $l0;
  let $l1 = $m_ft().totalTokensReminderBudget;
  if (Number.isFinite($l1) && $l1 > 0) return $l1;
  let $l2 = $m_Sd()?.[$m_iXe];
  if (typeof $l2 === "number" && Number.isInteger($l2) && $l2 > 0) return $m_a($m_dXe, { budget: $l2 }), $l2;
  $m_uXe($m_iXe, $l2);
  let $l3 = $m_k($m_iXe, $m_eon);
  return Number.isFinite($l3) && $l3 > 0 ? $l3 : $m_eon;
}
;
