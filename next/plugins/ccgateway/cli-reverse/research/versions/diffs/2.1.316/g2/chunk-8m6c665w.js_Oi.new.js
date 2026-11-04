function SELF($l0) {
  let $l1 = typeof $l0 === "number" ? $l0 : Number.NaN, $l2 = $l1 >= 1e3;
  return $m_Qbi("en-US", $l2 ? $m_qe : $m_Xe).format($l1).toLowerCase();
}
;
