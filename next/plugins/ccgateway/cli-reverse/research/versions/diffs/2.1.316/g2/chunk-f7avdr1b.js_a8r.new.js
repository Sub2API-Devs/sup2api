function SELF($l0) {
  let $l1 = $m_Jse($l0);
  if ($l1 === null || $l0 === void 0 || $l0 === null) return null;
  let $l2 = $l0 === "opusplan[1m]", $l3;
  if ($l1 === "opus") {
    let $l4 = $m_Eh();
    $l3 = $l2 || $m_Lxe($l4) ? $m_m2($m_g2($l4)) : $l4;
  } else $l3 = $m_wg();
  if (($m_mP($l3) ?? $m_no($l3)) && !$m_d2($l3, $m_c2())) return { model: $l3, clamp: "none" };
  let $l5 = $m_lk($l1 === "opus" ? $l2 || $m_w6() ? "opus[1m]" : "opus" : "sonnet");
  if ($l5 !== null) return { model: $l5, clamp: "stepDown" };
  return { model: $m_Bt($l0), clamp: "resting" };
}
;
