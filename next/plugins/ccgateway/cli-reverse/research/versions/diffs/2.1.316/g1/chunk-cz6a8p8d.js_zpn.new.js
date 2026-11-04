function SELF($l0) {
  try {
    if (!$m_L_e()) return $l0;
    let $l1 = $l0.tool_choice;
    return $NEW_chunk_6mwt0myy_js_XPi(($l0.tools ?? []).flatMap(($l2) => "name" in $l2 && typeof $l2.name === "string" ? [$l2.name] : [])), { ...$l0, messages: $l0.messages.map($m_jn), ...$l0.context_management != null && { context_management: $m_ge($l0.context_management) }, ...$l0.tools !== void 0 && { tools: $l0.tools.map($m_Fn) }, ...$l1 !== void 0 && "name" in $l1 && typeof $l1.name === "string" && { tool_choice: { ...$l1, name: $m_vUe($l1.name) } } };
  } catch ($l3) {
    return $m_qe($l3), $l0;
  }
}
;
