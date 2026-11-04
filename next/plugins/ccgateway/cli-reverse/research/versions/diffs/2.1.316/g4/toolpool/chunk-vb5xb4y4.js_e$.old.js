SELF = $m_tn({ isConcurrencySafe() {
  return true;
}, isReadOnly() {
  return true;
}, toAutoClassifierInput($l0) {
  return `${$l0.server} ${$l0.uri}`;
}, shouldDefer: true, name: $m_vM, aliases: ["ReadMcpResource"], searchHint: "read a specific MCP resource by URI", backgrounding: "never", maxResultSizeChars: 1e5, async description() {
  return $m_jZs;
}, async prompt() {
  return $m_WZs;
}, get inputSchema() {
  return $m_oe();
}, get outputSchema() {
  return $m_ie();
}, create($l1) {
  return { async call($l2, { signal: $l3 }) {
    let { turnMcpClients: $l4, storageV5: $l5 } = $l1, { server: $l6, uri: $l7 } = $l2, $l8 = $m_HDr($l4, $l6);
    if ($m_Zin($l8, $l1.agentId), $l8.config.pluginSource) $m_bR($l8.config.pluginSource), $m_d$($l8.config.pluginSource, "mcp", { kind: "mcp-server", name: $l8.name });
    let $l9 = await $m_j().ensureConnectedClient($l8, { signal: $l3, context: "MCP resource read" });
    $m_Zin($l9, $l1.agentId);
    let $l10 = $m_IDr($l7, $m_qin($l9.name, $l1.messages(), $l1.inheritedMcpSkillMessages())), $l11 = async ($l12, $l13) => ({ contents: [], error: await $m_zFs({ connected: $l9, skills: $l12, uri: $l7, reason: $l13, signal: $l3 }) });
    if ($l10.case === "unlisted") return { data: await $l11($l10.skills, $l10.reason) };
    let $l14;
    try {
      $l14 = await $m_R_t($l9, $l7, { signal: $l3 });
    } catch ($l15) {
      if ($l3.aborted) throw new $m_qe();
      let $l16 = $m_re();
      if ($l16.isMcpMethodNotFoundError($l15)) return $m_hs($l8.name, "resources/read returned -32601 MethodNotFound \u2014 server advertises resources but does not implement reads"), { data: { contents: [], error: `Server "${$l8.name}" advertises resource support but does not implement resource reads.` } };
      if ($l16.isMcpResourceNotFoundError($l15)) {
        if ($m_hs($l8.name, `resources/read returned ${$l16.getMcpErrorCode($l15)} \u2014 resource not found`), $m_j().invalidateMcpResourceListCaches($l9), $l10.case === "listed") return { data: await $l11($l10.skills, "not_found") };
        let $l17 = $m_te().serverDeclaresDirectoryRead($l9.capabilities) ? ` If the URI is a directory resource, use ${$m_Dj} instead.` : "";
        return { data: { contents: [], error: `Resource not found: ${$l7} \u2014 it may have been deleted or the URI is stale. Re-run ${$m_Rz} to refresh.${$l17}` } };
      }
      throw $l15;
    }
    let $l18 = $l14.contents;
    if ($l10.case === "listed") {
      let $l19 = $m_ODr($l14.contents, $l7, $l10.rows);
      if (!$l19.ok) return { data: await $l11($l10.skills, $l19.reason) };
      $m_g("skill_mcp_read"), $l18 = [$l19.item];
    }
    return { data: { contents: await Promise.all($l18.map(async ($l20, $l21) => {
      if ("text" in $l20) return { uri: $l20.uri, mimeType: $l20.mimeType, text: $l20.text };
      if (!("blob" in $l20) || typeof $l20.blob !== "string") return { uri: $l20.uri, mimeType: $l20.mimeType };
      let $l22 = `mcp-resource-${Date.now()}-${$l21}-${Math.random().toString(36).slice(2, 8)}`, $l23 = await $m_iC(Buffer.from($l20.blob, "base64"), $l20.mimeType, $l22, void 0, $l5);
      if ("error" in $l23) {
        if ($m_Gg() !== void 0) return { uri: $l20.uri, mimeType: $l20.mimeType, text: $m_due($l20.mimeType, Buffer.byteLength($l20.blob, "base64")) };
        return { uri: $l20.uri, mimeType: $l20.mimeType, text: `Binary content could not be saved to disk: ${$l23.error}` };
      }
      return { uri: $l20.uri, mimeType: $l20.mimeType, blobSavedTo: $l23.filepath, text: $m_lue($l23.filepath, $l20.mimeType, $l23.size, `[Resource from ${$l8.name} at ${$l20.uri}] `) };
    })) } };
  } };
}, renderToolUseMessage($l24) {
  if (!$l24.uri || !$l24.server) return null;
  return `Read resource "${$l24.uri}" from server "${$l24.server}"`;
}, userFacingName() {
  return "readMcpResource";
}, mapToolResultToToolResultBlockParam($l25, $l26) {
  if ($l25.error) return { tool_use_id: $l26, type: "tool_result", content: $l25.error };
  return { tool_use_id: $l26, type: "tool_result", content: $m__($l25) };
} });
