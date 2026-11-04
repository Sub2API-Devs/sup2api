SELF = $m_tn({ isConcurrencySafe() {
  return true;
}, isReadOnly() {
  return true;
}, toAutoClassifierInput($l0) {
  return `${$l0.server} ${$l0.uri}`;
}, shouldDefer: true, name: $m_Dj, aliases: ["ReadMcpResourceDir"], searchHint: "list the children of an MCP directory resource", backgrounding: "never", maxResultSizeChars: 1e5, async description() {
  return $m_UZs;
}, async prompt() {
  return $m_BZs;
}, get inputSchema() {
  return $m_J();
}, get outputSchema() {
  return $m_Q();
}, create($l1) {
  return { async call($l2, { signal: $l3 }) {
    let $l4 = $l1.turnMcpClients, { server: $l5, uri: $l6 } = $l2, $l7 = $m_HDr($l4, $l5);
    if ($m_Zin($l7, $l1.agentId), !$m_Hpn()) return { data: { resources: [], error: "Directory listing is not enabled in this build." } };
    if (!$m_N().serverDeclaresDirectoryRead($l7.capabilities)) return { data: { resources: [], error: `Server "${$l7.name}" does not support directory listing.` } };
    if ($l7.config.pluginSource) $m_bR($l7.config.pluginSource), $m_d$($l7.config.pluginSource, "mcp", { kind: "mcp-server", name: $l7.name });
    let $l8 = $m_ee($l6, $m_qin($l7.name, $l1.messages(), $l1.inheritedMcpSkillMessages()));
    if ($l8 !== void 0) return { data: $l8 };
    let $l9 = await $m_G().ensureConnectedClient($l7, { signal: $l3, context: "MCP resource directory read" });
    $m_Zin($l9, $l1.agentId);
    let $l10;
    try {
      $l10 = await $m_N().readMcpDirectory($l9, $l6, $l3);
    } catch ($l11) {
      if ($l3.aborted) throw new $m_qe();
      let $l12 = $m_Z();
      if ($l12.isMcpNotADirectoryError($l11)) return $m_hs($l7.name, `resources/directory/read returned ${$l12.getMcpErrorCode($l11)} \u2014 not a directory`), { data: { resources: [], error: `Not a directory resource: ${$l6}. If it is a file resource, use ${$m_vM} instead.` } };
      throw $l11;
    }
    let $l13 = $m_I(), $l14 = $m_I(), $l15 = (await $m_Wde($l10, ($l16) => {
      if (!$l13([$l16.uri, $l16.name, $l16.mimeType])) return [];
      let $l17 = { uri: $m_sp($l16.uri), name: $m_EL($l16.name), mimeType: $l16.mimeType !== void 0 ? $m_EL($l16.mimeType) : void 0 };
      return $l14([$l17.uri, $l17.name, $l17.mimeType]) ? [$l17] : [];
    })).flat();
    if ($l15.length < $l10.length) return $m_hs($l7.name, $m_vJe("directory entries", $l10.length, $l10.length)), { data: { resources: [], error: `The listing of ${$l6} is too large to read.` } };
    return { data: { resources: $l15 } };
  } };
}, renderToolUseMessage($l18) {
  if (!$l18.uri || !$l18.server) return null;
  return `List directory resource "${$l18.uri}" from server "${$l18.server}"`;
}, userFacingName() {
  return "readMcpResourceDir";
}, mapToolResultToToolResultBlockParam($l19, $l20) {
  if ($l19.error) return { tool_use_id: $l20, type: "tool_result", content: $l19.error };
  let $l21 = $l19.resources.map(($l22) => `${$l22.name}${$l22.mimeType === $m_C2t ? "/" : ""}`).join(`
`), $l23 = $l19.resources.length > 0 ? `Directory listing (${$l19.resources.length} ${$m_O($l19.resources.length, "entry", "entries")}):
${$l21}` : "Directory is empty.";
  return { tool_use_id: $l20, type: "tool_result", content: `${$l23}

${$m__($l19)}` };
} });
