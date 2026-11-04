function SELF() {
  if (!$m_Cz()) return $m_qke;
  let $l0 = $m_ePn();
  if ($l0 === null) return $m_qke;
  if ($m_O8t()) return $m_qke;
  let $l1 = /* @__PURE__ */ new Map();
  for (let { bucket: $l2, outcome: $l3, pluginName: $l4, pluginId: $l5 } of $l0) if ($l3 !== "not_loaded" && $l5 !== void 0 && $NEW_chunk_e6aww6q8_js_LUo($l2, $l5) && $l1.get($l5)?.heldBack !== false) $l1.set($l5, { pluginName: $l4, heldBack: $l3 === "held_back" });
  return $l1.size === 0 ? $m_qke : $l1;
}
;
