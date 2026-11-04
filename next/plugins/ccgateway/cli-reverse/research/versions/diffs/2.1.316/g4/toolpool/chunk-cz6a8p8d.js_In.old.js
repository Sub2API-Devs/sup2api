function SELF($l0) {
  return $m__a($l0, "name").flatMap(($l1) => $l1.mcpInfo !== void 0 && $l1.name === $m_Io($l1.mcpInfo.serverName, $l1.mcpInfo.toolName) ? [{ name: $l1.name, server: $l1.mcpInfo, standardKey: $l1.mcpInfo.standardKey }] : []);
}
;
