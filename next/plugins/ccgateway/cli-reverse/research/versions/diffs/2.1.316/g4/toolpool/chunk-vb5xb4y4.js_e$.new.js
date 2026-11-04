SELF = $m_tn({ isConcurrencySafe() {
  return true;
}, isReadOnly() {
  return true;
}, toAutoClassifierInput($l0) {
  return `${$l0.server} ${$l0.uri}`;
}, suppressesAlwaysAllowRule() {
  return $NEW_chunk_sfy7bm1n_js_SFe();
}, shouldDefer: true, name: $m_vM, aliases: ["ReadMcpResource"], searchHint: "read a specific MCP resource by URI", backgrounding: "never", maxResultSizeChars: 1e5, async description() {
  return $m_jZs;
}, async prompt() {
  return $m_WZs;
}, get inputSchema() {
  return $m_oe();
}, get outputSchema() {
  return $m_ie();
}, create($l1) {
  return { async checkPermissions($l2) {
    if (!$NEW_chunk_sfy7bm1n_js_SFe()) return { behavior: "allow", updatedInput: $l2 };
    return { behavior: "passthrough", message: `${$m_vM} requires permission.` };
  }, async call($l3, { signal: $l4 }) {
    let { turnMcpClients: $l5, storageV5: $l6 } = $l1, { server: $l7, uri: $l8 } = $l3, $l9 = $m_HDr($l5, $l7);
    if ($m_Zin($l9, $l1.agentId), $l9.config.pluginSource) $m_bR($l9.config.pluginSource), $m_d$($l9.config.pluginSource, "mcp", { kind: "mcp-server", name: $l9.name });
    let $l10 = $NEW_chunk_e6aww6q8_js_Ifn($l9.name, $l8, $l1.messages(), $l1.inheritedMcpSkillMessages());
    if ($l10 !== void 0) return { data: { contents: [], error: $l10 } };
    let $l11 = await $m_j().ensureConnectedClient($l9, { signal: $l4, context: "MCP resource read" });
    $m_Zin($l11, $l1.agentId);
    let $l12 = $m_IDr($l8, $m_qin($l11.name, $l1.messages(), $l1.inheritedMcpSkillMessages())), $l13 = async ($l14, $l15) => ({ contents: [], error: await $m_zFs({ connected: $l11, skills: $l14, uri: $l8, reason: $l15, signal: $l4 }) });
    if ($l12.case === "unlisted") return { data: await $l13($l12.skills, $l12.reason) };
    let $l16;
    try {
      $l16 = await $m_R_t($l11, $l8, { signal: $l4 });
    } catch ($l17) {
      if ($l4.aborted) throw new $m_qe();
      let $l18 = $m_re();
      if ($l18.isMcpMethodNotFoundError($l17)) return $m_hs($l9.name, "resources/read returned -32601 MethodNotFound \u2014 server advertises resources but does not implement reads"), { data: { contents: [], error: `Server "${$l9.name}" advertises resource support but does not implement resource reads.` } };
      if ($l18.isMcpResourceNotFoundError($l17)) {
        if ($m_hs($l9.name, `resources/read returned ${$l18.getMcpErrorCode($l17)} \u2014 resource not found`), $m_j().invalidateMcpResourceListCaches($l11), $l12.case === "listed") return { data: await $l13($l12.skills, "not_found") };
        let $l19 = $m_te().serverDeclaresDirectoryRead($l11.capabilities) ? ` If the URI is a directory resource, use ${$m_Dj} instead.` : "";
        return { data: { contents: [], error: `Resource not found: ${$l8} \u2014 it may have been deleted or the URI is stale. Re-run ${$m_Rz} to refresh.${$l19}` } };
      }
      throw $l17;
    }
    let $l20 = $l16.contents;
    if ($l12.case === "listed") {
      let $l21 = $m_ODr($l16.contents, $l8, $l12.rows);
      if (!$l21.ok) return { data: await $l13($l12.skills, $l21.reason) };
      $m_g("skill_mcp_read"), $l20 = [$l21.item];
    }
    return { data: { contents: await Promise.all($l20.map(async ($l22, $l23) => {
      if ("text" in $l22) return { uri: $l22.uri, mimeType: $l22.mimeType, text: $l22.text };
      if (!("blob" in $l22) || typeof $l22.blob !== "string") return { uri: $l22.uri, mimeType: $l22.mimeType };
      let $l24 = `mcp-resource-${Date.now()}-${$l23}-${Math.random().toString(36).slice(2, 8)}`, $l25 = await $m_iC(Buffer.from($l22.blob, "base64"), $l22.mimeType, $l24, void 0, $l6);
      if ("error" in $l25) {
        if ($m_Gg() !== void 0) return { uri: $l22.uri, mimeType: $l22.mimeType, text: $m_due($l22.mimeType, Buffer.byteLength($l22.blob, "base64")) };
        return { uri: $l22.uri, mimeType: $l22.mimeType, text: `Binary content could not be saved to disk: ${$l25.error}` };
      }
      return { uri: $l22.uri, mimeType: $l22.mimeType, blobSavedTo: $l25.filepath, text: $m_lue($l25.filepath, $l22.mimeType, $l25.size, `[Resource from ${$l9.name} at ${$l22.uri}] `) };
    })) } };
  } };
}, renderToolUseMessage($l26) {
  if (!$l26.uri || !$l26.server) return null;
  return `Read resource "${$l26.uri}" from server "${$l26.server}"`;
}, userFacingName() {
  return "readMcpResource";
}, mapToolResultToToolResultBlockParam($l27, $l28) {
  if ($l27.error) return { tool_use_id: $l28, type: "tool_result", content: $l27.error };
  return { tool_use_id: $l28, type: "tool_result", content: $m__($l27) };
} });
