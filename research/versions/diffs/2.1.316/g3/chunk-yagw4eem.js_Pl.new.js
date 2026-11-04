async function SELF($l0, $l1) {
  try {
    let $l2 = performance.now(), $l3 = await $NEW_chunk_hwmsct5x_js_Il($l1, false), { waits: $l4 } = $m_ni().ccsSenderAddr;
    if ($l4.firstMs ??= performance.now() - $l2, $l4.unsignedCalls += $l3 ? 0 : 1, $l3) $l0.set($m_xl, $l3.ip), $l0.set($m_Tl, $l3.sig);
  } catch ($l5) {
    $l0.delete($m_xl), $l0.delete($m_Tl), $m_l($l5);
  }
}
;
