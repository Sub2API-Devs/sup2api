function SELF($l0) {
  $l0 = $l0.toLowerCase();
  let $l1 = $m_aN().canonicalNameMemo, $l2 = $l1.get($l0);
  if ($l2 !== void 0) return $l2;
  let $l3 = $m_kK($l0);
  if ($l0.length <= 256) {
    if ($l1.size >= 256) $l1.clear();
    $l1.set($l0, $l3);
  }
  return $l3;
}
;
