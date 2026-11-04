function SELF({ body: $l0, level: $l1, store: $l2, clock: $l3 }) {
  let $l4 = $m_ne($l0), $l5 = $m_re($l0, $l4, $l1), $l6 = $l3.monotonicNow(), $l7 = 0, $l8 = 0, $l9 = $l4.map(($l10, $l11) => {
    let $l12 = $m_N($l2, $l5[$l11], $l6);
    if ($l12 !== void 0) $l7++, $l8 += $l10.end - $l10.start;
    return $l12;
  });
  if ($l2.blocks.size > 0) $m_z($l2, $l3);
  return { body: $l0, level: $l1, blocks: $l4, keys: $l5, reused: $l9, reusedBlockCount: $l7, reusedBytes: $l8, generation: $l2.generation };
}
;
