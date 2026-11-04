function SELF($l0, $l1, $l2, $l3, $l4 = false) {
  let $l5 = $l0 === $m_Us(), $l6 = ($l7) => !$l0.declaredToolsDecided && ($m_rdr($l7) || $l5 && $m_odr?.isLinkedComputerToolShownOnRelay($l7, $l0, $l3) === true), $l8 = $m_bWr($l1, $l0), $l9 = $l8 !== $l1, $l10 = ($l11) => $l11.mcpInfo?.scope !== "claudeai" && $m_ok($l11, $m_i.CLAUDE_CODE_UPFRONT_TOOLS ?? []), $l12 = $l4 && !$l0.declaredToolsDecided && $l8.some(($l13) => $l10($l13) && $l2($l13));
  if (($l9 ? $l0.declaredTools !== void 0 : $l0.declaredToolsDecided) || !$m_N_e() || !$l9 && !$l12 && !$l1.some($l6) || !$l1.some(($l14) => $m_xt($l14, $m_Ys))) return;
  return new $m_K7($l8.filter(($l15) => (!$l2($l15) || $l12 && $l10($l15)) && !$l6($l15)));
}
;
