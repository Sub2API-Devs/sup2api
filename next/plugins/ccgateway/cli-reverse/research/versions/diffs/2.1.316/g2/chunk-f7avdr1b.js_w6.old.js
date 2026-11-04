function SELF() {
  if ($m_gP() || $m_q4e() || $m_Te() !== "firstParty") return false;
  if ($m_kt() && $m_fr() === null) return false;
  if ($m_i.ANTHROPIC_DEFAULT_OPUS_MODEL === void 0) {
    let $l0 = $m_Ii("opus");
    if ($l0 !== void 0 && $m_Ru($l0) === "never") return false;
  }
  return true;
}
;
