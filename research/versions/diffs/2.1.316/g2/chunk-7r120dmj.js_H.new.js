SELF = { str: () => $m_o, rawStr: () => $m_f, bool: () => $m_l, triBool: () => $m_s, int: ($l0) => $l0 ? $m_d($l0) : $m_a, names: ($l1) => $m_i(($l2) => {
  let $l3 = /* @__PURE__ */ new Set();
  for (let $l4 of $l2?.split(",") ?? []) {
    let $l5 = $l4.trim();
    if ($l5.length > 0) $l3.add($l5);
    if ($l3.size === $l1) break;
  }
  return $l3.size > 0 ? Object.freeze([...$l3]) : void 0;
}), enum: ($l6) => $m_i(($l7) => $l7 !== void 0 && $l6.includes($l7.trim()) ? $l7.trim() : void 0) };
