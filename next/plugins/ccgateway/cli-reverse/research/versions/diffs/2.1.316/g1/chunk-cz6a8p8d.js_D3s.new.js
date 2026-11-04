function SELF($l0, $l1, $l2, $l3) {
  if ($m_se($l0, $l2) && $m_kSe($l3)) {
    let $l4 = $l1.includes($m_lw) ? $l1 : [...$l1, $m_lw], $l5 = $m_TXn($l0);
    if ($l5 && !$l4.includes($m_xS)) return [...$l4, $m_xS];
    return $l5 ? $l4 : $l4.filter(($l6) => $l6 !== $m_xS);
  }
  return $l1.filter(($l7) => $l7 !== $m_lw && $l7 !== $m_xS);
}
;
