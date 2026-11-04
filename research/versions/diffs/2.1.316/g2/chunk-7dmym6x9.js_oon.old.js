function SELF() {
  let $l0 = $m_ron();
  if ($l0.explicit !== void 0) return $l0.explicit;
  if ($l0.rollout === void 0) {
    let $l1 = $m_k($m_lXe, "padded-countdown");
    $l0.rollout = $m_Vwe($l1) ? $l1 : "padded-countdown";
  }
  return $l0.rollout;
}
;
