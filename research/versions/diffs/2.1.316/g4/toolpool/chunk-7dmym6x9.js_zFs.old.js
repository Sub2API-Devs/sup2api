async function SELF($l0) {
  return await $m_At().skillsFetcher?.settleFailedRead($l0) ?? $m_R4o($l0.uri, $l0.reason) + $l0.skills.map(($l1) => $m_oVn($l1.skillName)).join("");
}
;
