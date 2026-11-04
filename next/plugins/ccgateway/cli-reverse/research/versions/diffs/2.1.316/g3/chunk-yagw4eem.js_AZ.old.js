async function SELF($l0, $l1) {
  let $l2 = $m_Qc.of($m_B().host).route?.($l0, $l1, $m__l);
  if ($l2 !== void 0) return $l2;
  if (!$m_gl($l1) || !$m_Qt($l0)) return $m__l($l0, $l1);
  let { init: $l3, afterResponse: $l4 } = await $m_Yc($l1).catch(($l5) => ($m_l($l5), { init: $l1 })), $l6;
  try {
    return $l6 = await $m__l($l0, $l3), $l6;
  } finally {
    if ($l6 !== void 0 || !$m_Wb($l1?.signal)) try {
      $l4?.($l6);
    } catch ($l7) {
      $m_l($l7);
    }
  }
}
;
