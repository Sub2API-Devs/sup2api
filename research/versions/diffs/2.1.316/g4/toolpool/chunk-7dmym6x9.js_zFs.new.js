async function SELF($l0) {
  let $l1 = !$m_Hpn();
  if ($l1 && $l0.reason === "unlisted") return "This file was not read, because MCP skills are turned off for now. While they are off, this app reads no file of a loaded skill.";
  return await ($l1 ? void 0 : $m_At().skillsFetcher)?.settleFailedRead($l0) ?? $m_R4o($l0.uri, $l0.reason) + $l0.skills.map(($l2) => $m_oVn($l2.skillName)).join("");
}
;
