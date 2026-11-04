function SELF() {
  let $l0 = $m_Sr();
  if ($l0 && $m_sW()) return false;
  if ($m_i.ANTHROPIC_UNIX_SOCKET) return !!$m_i.CLAUDE_CODE_OAUTH_TOKEN;
  if ($m_rc()) return false;
  let $l1 = !$m_Bn(), $l2 = $m_sr() || {}, $l3 = $l0 ? $m_ig() : $m_j4e("apiKeyHelper", $l2.apiKeyHelper), $l4 = $m_ab(), $l5;
  try {
    $l5 = $m_yA({ skipRetrievingKeyFromApiKeyHelper: true }).source;
  } catch {
    return false;
  }
  let $l6 = $l5 === "ANTHROPIC_API_KEY" || $l5 === "apiKeyHelper", $l7 = $m_Dr(), $l8 = !$l7 && $m_pte("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR"), $l9 = ($l4 || $l6) && !$m_TSe() || ($l3 || $l8) && !$l7;
  return !($l1 || $l9);
}
;
