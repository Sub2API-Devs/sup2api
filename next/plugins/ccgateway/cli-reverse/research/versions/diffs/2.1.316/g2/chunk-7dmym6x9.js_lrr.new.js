function SELF($l0, $l1) {
  let $l2 = $m_Je($l0);
  if ($m_cfe($l0)) return $m_SB($l2, $l0) && !$l1 ? "rewrite-final-message" : "rewrite";
  if ($m_II("turn_updates", $l2, $l0, $m_i.CLAUDE_CODE_TURN_UPDATES)) return "turn-updates";
  if ($m_irr($l2, $l0) || $m_jri($l2)) return $m_SB($l2, $l0) && !$l1 ? "readable-final-message" : "readable";
  return $m_Q5($l0) ? "none" : "standard";
}
;
