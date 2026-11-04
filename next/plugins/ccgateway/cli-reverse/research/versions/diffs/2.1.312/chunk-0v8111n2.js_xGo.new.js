function SELF({ body: $l0, level: $l1, store: $l2, clock: $l3 }) {
  let $l4 = $m_ne($l0), { keys: $l5, carriedDigestCount: $l6 } = $m_re($l0, $l4, $l1, $l0.buffer === $l2.keptBody?.memory.buffer && $l0.byteOffset === 0 ? $l2.keptBody : void 0), $l7 = $l3.monotonicNow(), $l8 = 0, $l9 = 0, $l10 = $l4.map(($l11, $l12) => {
    let $l13 = $m_N($l2, $l5[$l12], $l7);
    if ($l13 !== void 0) $l8++, $l9 += $l11.end - $l11.start;
    return $l13;
  });
  if ($l2.blocks.size > 0) $m_z($l2, $l3);
  return { body: $l0, level: $l1, blocks: $l4, keys: $l5, reused: $l10, reusedBlockCount: $l8, reusedBytes: $l9, carriedDigestCount: $l6, generation: $l2.generation };
}
;
