function SELF($l0) {
  try {
    if (!$m_L_e()) return $l0;
    let $l1 = $l0.tool_choice;
    return { ...$l0, messages: $l0.messages.map($m_jn), ...$l0.context_management != null && { context_management: $m_ge($l0.context_management) }, ...$l0.tools !== void 0 && { tools: $l0.tools.map($m_Fn) }, ...$l1 !== void 0 && "name" in $l1 && typeof $l1.name === "string" && { tool_choice: { ...$l1, name: $m_vUe($l1.name) } } };
  } catch ($l2) {
    return $m_qe($l2), $l0;
  }
}
;
