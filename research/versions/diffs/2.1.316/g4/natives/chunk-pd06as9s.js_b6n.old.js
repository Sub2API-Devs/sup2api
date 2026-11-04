function SELF($l0) {
  if ($m_Te() === "vertex") return $m_ie;
  if ($l0?.recorded !== void 0) return $l0.recorded;
  if ($l0?.isNonInteractive) {
    if ($l0.hasAppendSystemPrompt) return $m_Ue;
    return $m_Pe;
  }
  return $m_ie;
}
;
