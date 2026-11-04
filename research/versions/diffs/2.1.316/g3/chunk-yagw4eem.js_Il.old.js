function SELF($l0) {
  return $l0 === "firstParty" && $m_Pi() || $l0 === "anthropicAws" && !process.env.ANTHROPIC_AWS_BASE_URL;
}
;
