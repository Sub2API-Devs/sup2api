SELF = ($l0, $l1) => {
  if ($m_i.CLAUDE_CODE_SIMPLE && !$l1?.skipSimpleModeFilter) {
    let $l2 = $m_gn();
    if ($l2 !== null && $m_fB() && !$l1?.skipReplFilter) {
      let $l3 = $m_GP() || $l0.restricted === true && $m_eo($l0, $l2) !== null ? [$m_QS, $m_Bh, $m_Wk] : [$l2, $m_Bh, $m_Wk];
      if ($m_ye !== null && $m_Pz()) $l3.push($m_ye);
      if ($m_st.isCoordinatorMode()) $l3.push($m_j7t, $m_He, $m_$t(), ...$m_tg() ? [$m_Bt] : []);
      return $m_rt($m_z7($l3, $l0), $l1?.onlyNames);
    }
    let $l4 = $m_jt(), $l5 = [...$m_Pd() ? [$m_Ai] : [], ...$l4 ? [$l4] : [], $m_QS, $m_Bh];
    if ($m_st.isCoordinatorMode()) $l5.push($m_j7t, $m_He, $m_$t(), ...$m_tg() ? [$m_Bt] : []);
    return $m_rt($m_z7($l5, $l0), $l1?.onlyNames);
  }
  let $l6 = /* @__PURE__ */ new Set([$m_ZN.name, $m_e$.name, $m_EY.name, $m_Qa]), $l7 = $m_Ab().filter(($l8) => !$l6.has($l8.name)), $l9 = $m_z7($l7, $l0), $l10 = $l9.some(($l11) => $m_xt($l11, $m_Fe)) && $m_Ai.isEnabled(), $l12 = false;
  if ($m_fB() && !$l1?.skipReplFilter) {
    if ($l9.some(($l13) => $m_xt($l13, $m_bh))) $l9 = $l9.filter(($l14) => !$m_ok($l14, $m_i_n)), $l12 = true;
  }
  if (!$l1?.skipReplFilter && $m_pUt($l9, $l0, { activeAgents: $l1?.activeAgents })) $l9 = $l9.filter(($l15) => !$m_xt($l15, $m_Qn));
  $l9 = $m_rt($l9, $l1?.onlyNames);
  let $l16 = $l9.map(($l17) => $l17.isEnabled()), $l18 = $l9.filter(($l19, $l20) => $l16[$l20]);
  if ($m_QA() && !$l10 && !$l12) {
    let $l21 = $m_z7([$m_QD, $m_ZD, ...$m_bXn([$m_ZD.name, $m_QD.name])].filter(($l22) => !$l18.includes($l22)), $l0);
    $l18 = [...$l18, ...$l21];
  }
  if (($m_K1s() || $m_l7e()) && !$m_nq($l18) && !$l18.some(($l23) => $m_xt($l23, $m_Ys)) && !$l18.some(($l24) => $m_xt($l24, $m_b0))) $l18 = [...$l18, ...$m_z7([$m_EMo], $l0)];
  return $m_rt($l18, $l1?.onlyNames);
};
