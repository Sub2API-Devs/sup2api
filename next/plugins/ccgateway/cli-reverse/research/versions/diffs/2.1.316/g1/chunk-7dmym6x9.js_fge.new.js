function SELF({ peek: $l0 = false } = {}) {
  switch ($m_HG()) {
    case "firstParty":
      return $m_k_() || $NEW_chunk_e6aww6q8_js_SL({ peek: $l0 });
    case "thirdParty": {
      let $l1 = $m_Te();
      if ($l1 === "firstParty" && $m_i.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && $m_LG() === true && $m_Le($m_cn(() => $m_i.CLAUDE_CODE_AUTO_MODE_SERVER)) && !$m_Le($m_YPe("CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS")) && !$m_PAn($m_OC() ?? true) && !$m_qB()) return !$m_bW();
      return $l1 === "firstParty" || $m_RP($l1) ? $m_k_() : !$m_bW();
    }
  }
}
;
