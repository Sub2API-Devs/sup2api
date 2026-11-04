function SELF($l0 = {}) {
  if ($m_sW()) {
    if ($m_i.ANTHROPIC_API_KEY) return { key: $m_i.ANTHROPIC_API_KEY, source: "ANTHROPIC_API_KEY" };
    if ($m_ig()) return { key: $l0.skipRetrievingKeyFromApiKeyHelper ? null : $m_k8r(), source: "apiKeyHelper" };
    return { key: null, source: "none" };
  }
  let $l1 = $m_qv() ? void 0 : $m_i.ANTHROPIC_API_KEY;
  if ($m_Jxn() && $l1) return { key: $l1, source: "ANTHROPIC_API_KEY" };
  if ($m_Le(false)) {
    let $l2 = $m_BW();
    if ($l2) return { key: $l2, source: "ANTHROPIC_API_KEY" };
    if (!$l1 && !$m_i.CLAUDE_CODE_OAUTH_TOKEN && !$m_i.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR && !$m_xE() && $m_QM() === null && !$m_i.ANTHROPIC_AUTH_TOKEN && !$m_rc() && $m_Bn()) throw Error("ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, CLAUDE_CODE_OAUTH_TOKEN, or WIF env vars (ANTHROPIC_FEDERATION_RULE_ID + ANTHROPIC_ORGANIZATION_ID) required");
    if ($l1) return { key: $l1, source: "ANTHROPIC_API_KEY" };
    return { key: null, source: "none" };
  }
  if ($l1 && $m_klr($m_Zfe($l1)) === "approved") return { key: $l1, source: "ANTHROPIC_API_KEY" };
  let $l3 = $m_BW();
  if ($l3) return { key: $l3, source: "ANTHROPIC_API_KEY" };
  if ($m_ig()) {
    if ($l0.skipRetrievingKeyFromApiKeyHelper) return { key: null, source: "apiKeyHelper" };
    return { key: $m_k8r(), source: "apiKeyHelper" };
  }
  let $l4 = $m_V4e();
  if ($l4) return $l4;
  return { key: null, source: "none" };
}
;
