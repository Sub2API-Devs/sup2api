function SELF({ agentContext: $l0, servedSessionMode: $l1 } = {}) {
  let $l2 = {}, $l3 = process.env.CLAUDE_CODE_EXTRA_METADATA;
  if ($l3) {
    let $l4 = $m_st($l3, false);
    if ($l4 && typeof $l4 === "object" && !Array.isArray($l4)) $l2 = $m_Ce($l4);
    else $m_t(`CLAUDE_CODE_EXTRA_METADATA env var must be a JSON object, but was given ${$l3}`, { level: "error" });
  }
  let $l5 = {}, $l6, $l7 = $m_wP(), $l8 = $m_Le($m_i.CLAUDE_CODE_REMOTE) && $m_Bn() ? $m_Y$e($l0) : void 0, $l9 = { ...$l6 && { ti: $l6 }, device_id: $m_JH(), account_uuid: $m_Le($m_i.CLAUDE_CODE_REMOTE) && $m_i.CLAUDE_CODE_ACCOUNT_UUID || $m__A()?.accountUuid || $m_hn()?.accountUuid || "", session_id: $m_K(), ...$l7 && { parent_session_id: $l7 }, ...$l8 && { tk: $l8 } }, $l10 = { ...$l5, ...$l2, ...$l9 };
  if ((Object.keys($l2).length > 0 || Object.keys($l5).length > 0) && $m__($l10).length > $m_ne) {
    if ($l10 = { ...$l5, ...$l9 }, $m__($l10).length > $m_ne) $l10 = $l9;
  }
  return { user_id: $m__($l10) };
}
;
