function SELF($l0) {
  let $l1 = $m_Jse($l0);
  if ($l1 === null || $l0 === void 0 || $l0 === null) return null;
  let $l2 = $l0 === "opusplan[1m]", $l3 = $l1 === "opus" && !$l2 && $m_w6(), $l4;
  if ($l1 === "opus") {
    let $l5 = $m_Eh();
    $l4 = $l2 || $m_Lxe($l5) ? $m_m2($m_g2($l5)) : $l5;
  } else $l4 = $m_wg();
  if (($m_mP($l4) ?? $m_no($l4)) && !$m_d2($l4, $m_c2())) return { model: $l4, clamp: "none" };
  let $l6 = $m_lk($l1 === "opus" ? $l2 || $l3 ? "opus[1m]" : "opus" : "sonnet");
  if ($l6 !== null) return { model: $l3 && $m_Ru($l6) === "native" ? $m_GH($l6) : $l6, clamp: "stepDown" };
  return { model: $m_Bt($l0), clamp: "resting" };
}
;
