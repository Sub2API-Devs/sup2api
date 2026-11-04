function SELF() {
  if ($m_sW()) return false;
  if ($m_i.ANTHROPIC_UNIX_SOCKET) return !!$m_i.CLAUDE_CODE_OAUTH_TOKEN;
  if ($m_rc()) return false;
  let $l0 = !$m_Bn(), $l1 = $m_sr() || {}, $l2 = $m_Sr() ? $m_ig() : $m_j4e("apiKeyHelper", $l1.apiKeyHelper), $l3 = $m_ab(), $l4;
  try {
    $l4 = $m_yA({ skipRetrievingKeyFromApiKeyHelper: true }).source;
  } catch {
    return false;
  }
  let $l5 = $l4 === "ANTHROPIC_API_KEY" || $l4 === "apiKeyHelper", $l6 = $m_pte("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR"), $l7 = ($l3 || $l5) && !$m_TSe() || ($l2 || $l6) && !$m_Dr();
  return !($l0 || $l7);
}
;
