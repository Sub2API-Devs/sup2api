SELF = $m_tn({ isConcurrencySafe() {
  return true;
}, isReadOnly() {
  return true;
}, toAutoClassifierInput($l0) {
  return `${$l0.server} ${$l0.uri}`;
}, suppressesAlwaysAllowRule() {
  return $NEW_chunk_sfy7bm1n_js_SFe();
}, shouldDefer: true, name: $m_Dj, aliases: ["ReadMcpResourceDir"], searchHint: "list the children of an MCP directory resource", backgrounding: "never", maxResultSizeChars: 1e5, async description() {
  return $m_UZs;
}, async prompt() {
  return $m_BZs;
}, get inputSchema() {
  return $m_J();
}, get outputSchema() {
  return $m_Q();
}, create($l1) {
  return { async checkPermissions($l2) {
    if (!$NEW_chunk_sfy7bm1n_js_SFe()) return { behavior: "allow", updatedInput: $l2 };
    if (!$m_Hpn()) return { behavior: "deny", message: $NEW_chunk_9ycd12hk_js_L, decisionReason: { type: "other", reason: "directory listing off" } };
    return { behavior: "passthrough", message: `${$m_Dj} requires permission.` };
  }, async call($l3, { signal: $l4 }) {
    let $l5 = $l1.turnMcpClients, { server: $l6, uri: $l7 } = $l3, $l8 = $m_HDr($l5, $l6);
    if ($m_Zin($l8, $l1.agentId), !$m_Hpn()) return { data: { resources: [], error: $NEW_chunk_9ycd12hk_js_L } };
    if (!$m_N().serverDeclaresDirectoryRead($l8.capabilities)) return { data: { resources: [], error: `Server "${$l8.name}" does not support directory listing.` } };
    if ($l8.config.pluginSource) $m_bR($l8.config.pluginSource), $m_d$($l8.config.pluginSource, "mcp", { kind: "mcp-server", name: $l8.name });
    let $l9 = $NEW_chunk_e6aww6q8_js_Ifn($l8.name, $l7, $l1.messages(), $l1.inheritedMcpSkillMessages());
    if ($l9 !== void 0) return { data: { resources: [], error: $l9 } };
    let $l10 = $m_ee($l7, $m_qin($l8.name, $l1.messages(), $l1.inheritedMcpSkillMessages()));
    if ($l10 !== void 0) return { data: $l10 };
    let $l11 = await $m_G().ensureConnectedClient($l8, { signal: $l4, context: "MCP resource directory read" });
    $m_Zin($l11, $l1.agentId);
    let $l12;
    try {
      $l12 = await $m_N().readMcpDirectory($l11, $l7, $l4);
    } catch ($l13) {
      if ($l4.aborted) throw new $m_qe();
      let $l14 = $m_Z();
      if ($l14.isMcpNotADirectoryError($l13)) return $m_hs($l8.name, `resources/directory/read returned ${$l14.getMcpErrorCode($l13)} \u2014 not a directory`), { data: { resources: [], error: `Not a directory resource: ${$l7}. If it is a file resource, use ${$m_vM} instead.` } };
      throw $l13;
    }
    let $l15 = $m_I(), $l16 = $m_I(), $l17 = (await $m_Wde($l12, ($l18) => {
      if (!$l15([$l18.uri, $l18.name, $l18.mimeType])) return [];
      let $l19 = { uri: $m_sp($l18.uri), name: $m_EL($l18.name), mimeType: $l18.mimeType !== void 0 ? $m_EL($l18.mimeType) : void 0 };
      return $l16([$l19.uri, $l19.name, $l19.mimeType]) ? [$l19] : [];
    })).flat();
    if ($l17.length < $l12.length) return $m_hs($l8.name, $m_vJe("directory entries", $l12.length, $l12.length)), { data: { resources: [], error: `The listing of ${$l7} is too large to read.` } };
    return { data: { resources: $l17 } };
  } };
}, renderToolUseMessage($l20) {
  if (!$l20.uri || !$l20.server) return null;
  return `List directory resource "${$l20.uri}" from server "${$l20.server}"`;
}, userFacingName() {
  return "readMcpResourceDir";
}, mapToolResultToToolResultBlockParam($l21, $l22) {
  if ($l21.error) return { tool_use_id: $l22, type: "tool_result", content: $l21.error };
  let $l23 = $l21.resources.map(($l24) => `${$l24.name}${$l24.mimeType === $m_C2t ? "/" : ""}`).join(`
`), $l25 = $l21.resources.length > 0 ? `Directory listing (${$l21.resources.length} ${$m_O($l21.resources.length, "entry", "entries")}):
${$l23}` : "Directory is empty.";
  return { tool_use_id: $l22, type: "tool_result", content: `${$l25}

${$m__($l21)}` };
} });
