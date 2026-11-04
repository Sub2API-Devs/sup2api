function SELF($l0, $l1, $l2, $l3, $l4, $l5, $l6) {
  let $l7 = $m_xZ($l2, $l5);
  if ($l7 === "off") return [];
  let $l8 = $l3 ?? "main", $l9 = $m_wre($l1), $l10 = $m_E4n.of($l0);
  if ($l4) $l10.reanchorTaskBudget($l8, $l9);
  if ($l5 !== void 0 && $l6) $l10.excludeStartContext($l8, () => $m_iEr($l1));
  let $l11 = $l7 === "countdown" ? $m_sg($l2, $m_ap()) - $l9 : $l7 === "padded-countdown" ? $l10.remaining($l8, $l9, $l5 ?? $m_IZ()) : 0;
  return [{ type: "total_tokens_reminder", text: $m_uln($l7, $l11) }];
}
;
