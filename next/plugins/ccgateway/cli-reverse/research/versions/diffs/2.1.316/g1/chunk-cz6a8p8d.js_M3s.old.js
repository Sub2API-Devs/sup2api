function SELF($l0, $l1, $l2) {
  let $l3 = !$m_xk($l0, $m_lw);
  if ($l1.includes($m_lw) && !$m_Oe($l0)) {
    if ($m_UF($l0, $m_lw), $l3 && $l1.includes($m_xS) && !$m_rgr() && !$m_sm($l0, $m_xS)) $m_UF($l0, $m_xS);
  }
  let $l4 = $m_se($l0, $l2), $l5 = $l4 && $m_TXn($l0), $l6 = $l1;
  if ($l4 && !$l6.includes($m_lw)) $l6 = [...$l6, $m_lw];
  if (!$l4 && $l6.includes($m_lw)) $l6 = $l6.filter(($l7) => $l7 !== $m_lw);
  if ($l5 && !$l6.includes($m_xS)) $l6 = [...$l6, $m_xS];
  if (!$l5 && $l6.includes($m_xS)) $l6 = $l6.filter(($l8) => $l8 !== $m_xS);
  return $l6;
}
;
