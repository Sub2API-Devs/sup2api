async function SELF($l0, $l1) {
  if (!$m_Ka($l1) || !$m_wo($l0)) return $m_Ac($l0, $l1);
  let { init: $l2, afterResponse: $l3 } = await $m_Sc($l1).catch(($l4) => ($m_l($l4), { init: $l1 })), $l5;
  try {
    return $l5 = await $m_Ac($l0, $l2), $l5;
  } finally {
    if ($l5 !== void 0 || !$m_eb($l1?.signal)) try {
      $l3?.($l5);
    } catch ($l6) {
      $m_l($l6);
    }
  }
}
;
