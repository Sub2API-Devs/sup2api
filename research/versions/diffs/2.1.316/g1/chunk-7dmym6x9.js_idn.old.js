function SELF($l0, $l1, $l2, $l3) {
  let $l4 = $l0 === $m_Us(), $l5 = ($l6) => !$l0.declaredToolsDecided && ($m_rdr($l6) || $l4 && $m_odr?.isLinkedComputerToolShownOnRelay($l6, $l0, $l3) === true), $l7 = $m_bWr($l1, $l0), $l8 = $l7 !== $l1;
  if (($l8 ? $l0.declaredTools !== void 0 : $l0.declaredToolsDecided) || !$m_N_e() || !$l8 && !$l1.some($l5) || !$l1.some(($l9) => $m_xt($l9, $m_Ys))) return;
  return new $m_K7($l7.filter(($l10) => !$l2($l10) && !$l5($l10)));
}
;
