function SELF() {
  if (!$m_Cz()) return $m_qke;
  let $l0 = $m_ePn();
  if ($l0 === null) return $m_qke;
  if ($m_O8t()) return $m_qke;
  let $l1 = $m_Zxn(), $l2 = /* @__PURE__ */ new Map();
  for (let { bucket: $l3, outcome: $l4, pluginName: $l5, pluginId: $l6 } of $l0) if ($l4 !== "not_loaded" && $l6 !== void 0 && ($l1 === null || $l1.bucket !== $l3 || $l1.dirsById.has($l6)) && $l2.get($l6)?.heldBack !== false) $l2.set($l6, { pluginName: $l5, heldBack: $l4 === "held_back" });
  return $l2.size === 0 ? $m_qke : $l2;
}
;
