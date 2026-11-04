function SELF($l0, $l1, $l2) {
  let $l3 = $m_i5($l1);
  if (!$l2.midTurn) return $NEW_chunk_5k94rwtv_js_Xys($l3) + $l0 + $NEW_chunk_5k94rwtv_js_kDn;
  return `The ${$l3} plugin sent a message while you were working:
${$l0}

This is how Claude Code surfaces prompts a plugin submits mid-turn \u2014 within the running turn, often alongside the next tool result. Address the message above as you continue this turn.`;
}
;
