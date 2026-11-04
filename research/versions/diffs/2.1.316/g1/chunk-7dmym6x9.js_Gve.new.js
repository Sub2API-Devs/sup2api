function SELF($l0, $l1) {
  try {
    if ($l1 === "model_validation") return;
    if ($m_w4e($l0)) return;
    let $l2 = $m_Wn($l0);
    if (!$m_ta().claim(`unrecognized-model-signal:${$l2}`)) return;
    if ($m_ESe($l0) || $m_ESe($l2) || $NEW_chunk_aepeg2w5_js_WH($l0, $l2, $m_vg($l0))) return;
    $m_a("tengu_api_unrecognized_model", { model: $m_wt($l0), querySource: $m_Es($l1) });
    let $l3 = `${$m_Wpr} ${$m__({ model: $l0, query_source: $l1 })}`.replace($m_R4, "");
    if ($m_Yte() !== null && $m_i.CLAUDE_CODE_SESSION_KIND !== "bg") $m_pK(`${$l3}
`);
    else $m_t($l3, { level: "warn" });
  } catch ($l4) {
    $m_l($m_Xe($m_N($l4), "unrecognized-model signal failed"));
  }
}
;
