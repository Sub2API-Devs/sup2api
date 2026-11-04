async function SELF($l0) {
  try {
    let $l1 = $m_Vb($l0);
    if (!$l1 || $m_dse($l1)) return null;
    return await ($NEW_chunk_e6aww6q8_js_cW() ? $NEW_chunk_e6aww6q8_js_zVn($l1, true) : $m_Nct($l1, () => $NEW_chunk_e6aww6q8_js_zVn($l1, false)));
  } catch ($l2) {
    return $m_t(`bashEditDiff: snapshot failed: ${String($l2)}`), "unavailable";
  }
}
;
