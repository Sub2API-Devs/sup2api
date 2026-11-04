function SELF($l0) {
  let $l1 = $m__$e($l0);
  if ($l1 === void 0 || $m_gSe($l1.id) !== void 0) return;
  let $l2 = $NEW_chunk_aepeg2w5_js_fn($l1.id) ? $l1.id : void 0;
  if ($m_yc($l0) !== void 0 && $l0.toLowerCase() !== $l2) return;
  let $l3 = $NEW_chunk_aepeg2w5_js_xxt($l1);
  if ($l3 === void 0 || $l3 === $l1.id && $l2 === void 0) return;
  let $l4 = $NEW_chunk_aepeg2w5_js_jw({ id: $l1.id, raw: $m_Aot($l1) ?? $l0, overrideKey: $l2 });
  if ($l4 === void 0 || $l4.mapped === $l1.id || $m_rw($l4.mapped)) return;
  return $m_Wn($l4.mapped);
}
;
