function SELF($l0, $l1, $l2) {
  let $l3 = /* @__PURE__ */ new Set();
  for (let $l4 of $l0) {
    if ($l4.type !== "assistant" || !Array.isArray($l4.message.content)) continue;
    for (let $l5 of $l4.message.content) if ($l5.type === "tool_use" && $l5.name === $m_Yp) $l3.add($l5.id);
  }
  return $l0.map(($l6) => {
    if ($l6.type !== "user") return $l6;
    let $l7 = $l6.message.content;
    if (!Array.isArray($l7)) return $l6;
    if (!$l7.some(($l8) => $l8.type === "tool_result")) return $l6;
    let $l9 = [], $l10 = [];
    for (let $l11 of $l7) if ($l11.type === "text" && ($l11.text.startsWith($m_BP) || !$l1 && $m_Yeo($l11.text)) && !$m_Tft($l11.text) && !$m_x3n($l11.text, $l2)) $l9.push($l11);
    else $l10.push($l11);
    if ($l9.length === 0) return $l6;
    let $l12 = $l10.findLastIndex(($l13) => $l13.type === "tool_result" && !$m_M3n($l13) && !$m_A3n($l13) && !$m_P3n($l13) && !(typeof $l13.tool_use_id === "string" && $l3.has($l13.tool_use_id) && !$m_dbn($l13.content)));
    if ($l12 === -1) return $l6;
    let $l14 = $l10[$l12], $l15 = $m_gft($l14, $l9);
    if ($l15 === null) return $l6;
    let $l16 = [...$l10.slice(0, $l12), $l15, ...$l10.slice($l12 + 1)];
    return { ...$l6, message: { ...$l6.message, content: $l16 } };
  });
}
;
