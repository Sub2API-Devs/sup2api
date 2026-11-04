function SELF() {
  let $l0 = $m_Vr();
  if ($l0.totalTokensReminderMode === void 0) {
    let $l1 = $m_son(), $l2 = $l1 === void 0 ? $m_Sd()?.[$m_lXe] : void 0, $l3 = $m_Vwe($l2) ? $l2 : $l2 === false ? "off" : void 0;
    if ($l3 !== void 0) $m_a($m_dXe, { mode: $m_c($l3) });
    else $m_uXe($m_lXe, $l2);
    $l0.totalTokensReminderMode = { explicit: $l1 ?? $l3 };
  }
  return $l0.totalTokensReminderMode;
}
;
