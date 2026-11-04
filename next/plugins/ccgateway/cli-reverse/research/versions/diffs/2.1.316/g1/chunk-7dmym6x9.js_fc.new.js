function SELF($l0, $l1 = $m_ap()) {
  let $l2 = $m_Je($l0), $l3 = $m_m8r($l0, $l2);
  return { model: $l0, contextWindow: $m_sg($l0, $l1), maxOutputTokens: $m_XTt($l0), canonical: $l2, settingsKey: $m_cq($l0), longContextWindowWithoutOptIn: $m_Vci($l0, $l2, $l3), optIn1mHonored: $m_sar($l0, $l1), apiContextWindowWithoutOptIn: Math.max($m_p8r($l2), $m_p8r($m_Je($l0, { identity: true, overridesMap: {} })), $m_p8r($m_Je($m_Ht($l0))), $l3?.withoutOptIn ?? $m_dXo($l0) ?? 0), servedWindow: $l3, recognized: $m_ESe($l0, $l2) || $NEW_chunk_aepeg2w5_js_WH($l0, $l2), bytesPerToken: $m_vy($l0), clientDataAutoCompactWindow: $m_rEo($l2), thinking: { supported: $m_nui($l0), alwaysOn: $m_Fot($l0), rejectsDisabled: $m_D$e($l0), capsEffortWhenDisabled: $m_S4r($l0) }, acceptsTemperature: $m_dar($l0) };
}
;
