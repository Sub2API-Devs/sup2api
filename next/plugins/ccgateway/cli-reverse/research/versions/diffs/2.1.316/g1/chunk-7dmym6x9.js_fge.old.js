function SELF() {
  switch ($m_HG()) {
    case "firstParty":
      return $m_k_();
    case "thirdParty": {
      let $l0 = $m_Te();
      return $l0 === "firstParty" || $m_RP($l0) ? $m_k_() : !$m_bW();
    }
  }
}
;
