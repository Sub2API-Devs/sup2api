SELF = $m_tn({ name: $m_oo, searchHint: "invoke a slash-command skill", isEnabled() {
  return !$m_yb();
}, backgrounding: "never", maxResultSizeChars: 1e5, get preserveToolUseResultInSubagents() {
  return $m_$w();
}, get inputSchema() {
  return $m_Fe();
}, get outputSchema() {
  return $m_De();
}, description: async ({ skill: $l0 }) => `Execute skill: ${$l0}`, prompt: async ({ model: $l1, leanRewrite: $l2 }) => $m_ajs({ model: $l1, leanRewrite: $l2 }), toAutoClassifierInput: ({ skill: $l3 }) => $l3 ?? "", create($l4) {
  let $l5 = $l4;
  return { async validateInput({ skill: $l6 }, { signal: $l7, toolUseId: $l8 }) {
    let $l9 = $l6.trim();
    if (!$l9) return $m_m("skill_invoke", "skill_invoke_empty_name"), { result: false, message: `Invalid skill format: ${$l6}`, errorCode: 1 };
    let $l10 = $l9.startsWith("/");
    if ($l10) $m_a("tengu_skill_tool_slash_prefix", {});
    let $l11 = $l10 ? $l9.substring(1) : $l9, $l12, $l13 = false, $l14 = await $m_ie($l5), $l15 = $m_re($l11, $l14, $l5), $l16 = $l15.command, $l17 = $m_uw($l11);
    if ($m_fre($l5.session) && (!$l16 || $m_Ygt($l16)) && ($l16 !== void 0 || $m_HKn($l17))) {
      let $l18 = await $m_As($m_ATe($l17), $l7, () => new $m_qe($m_Qu));
      if (!$l18.ok) $l12 = $l18.reason, $l13 = $l18.withheld === true;
      else $l14 = await $m_ie($l5), $l15 = $m_re($l11, $l14, $l5), $l16 = $l15.command;
    }
    let $l19 = $l15.kind === "listingName" ? $l15.listed : $l16;
    if ($l19?.type === "prompt" && $l19.loadDefinition !== void 0) {
      await $m_As($l19.loadDefinition(), $l7, () => new $m_qe($m_Qu)), $l14 = await $m_ie($l5), $l15 = $m_re($l11, $l14, $l5);
      let $l20 = $l15.kind === "none" && $l19.directoryListingName !== void 0 ? $m_re($l19.directoryListingName, $l14, $l5) : $l15;
      if ($l20.kind === "listingName") $l15 = $l20;
      $l16 = $l15.command;
    }
    if ($l16?.type === "prompt" && $l16.loadedFrom === "mcp") return { result: false, message: `Unknown skill: ${$l11}`, errorCode: 2 };
    if ($l12 !== void 0 && (!$l16 || $m_Ygt($l16))) return $m_m("skill_invoke", $l13 ? "skill_invoke_withheld" : "skill_invoke_not_materialized"), { result: false, message: $l13 ? `${$m_DKn($l11)} Proceed without it.` : `Skill ${$l11} could not be downloaded (${$l12}). Proceed without it.`, errorCode: 10 };
    let $l21 = null;
    if ($l16 && $m_VTe($l16)) return $m_m("skill_invoke", $m__U($l16) ? "skill_invoke_host_catalog_withheld" : "skill_invoke_sync_vetoed"), { result: false, message: `Unknown skill: ${$l11}`, errorCode: 13 };
    if (!$l16) {
      let $l22 = $m_O_o($l14, $l11, $l5.spawnedBySkill);
      if ($l22.length > 0) {
        let $l23 = $l15.kind === "ambiguous" ? $l15.candidates.filter(($l24) => !$m_A$t($l24, $l11) && $m_cK($l24.name)) : [];
        if ($l15.kind === "ambiguous") $m_a("tengu_skill_tool_suffix_match", { candidate_count: $l15.candidates.length });
        return $m_m("skill_invoke", "skill_invoke_not_found"), { result: false, message: $l23.length > 0 ? `Unknown skill: ${$l11}. Several skills match that name: ${[...$l23, ...$l22].map(($l25) => $l25.name).join(", ")} \u2014 invoke one by its full name; the directory-scoped variants apply to the files under their directory.` : `Unknown skill: ${$l11}. Directory-scoped variants exist: ${$l22.map(($l26) => $l26.name).join(", ")} \u2014 invoke the variant whose directory contains the files you are working on.`, errorCode: 2 };
      }
      if ($l15.kind === "listingName") {
        let { listed: $l27 } = $l15, $l28 = $l5.agentId === void 0;
        if ($m_me($l14, $l28).includes($l27) && $m_cK($l27.name) && !$m_pe($l27, $l5) && $m_gze($l27, { commandName: $l27.name, userTypedThisTurn: false, isMainSession: $l28, permissionContext: $l5.permissions() }) === null) return $m_m("skill_invoke", "skill_invoke_not_found"), { result: false, message: `Unknown skill: ${$l11}. Did you mean ${$l27.name}? Invoke it by that full name.`, errorCode: 2 };
      }
      if ($l15.kind === "suggestion") {
        if ($m_a("tengu_skill_tool_suffix_match", { candidate_count: 1 }), $m_cK($l15.suggestion.name)) return $m_m("skill_invoke", "skill_invoke_not_found"), { result: false, message: `Unknown skill: ${$l11}. Did you mean ${$l15.suggestion.name}? Invoke it by that full name.`, errorCode: 2 };
      }
      if ($l15.kind === "ambiguous") {
        $m_a("tengu_skill_tool_suffix_match", { candidate_count: $l15.candidates.length });
        let $l29 = $l15.candidates.filter(($l30) => !$m_A$t($l30, $l11)), $l31 = $l29.length === 1 ? $l29[0] : void 0;
        if ($l29.length > 0 && $l29.every(($l32) => $m_cK($l32.name))) return $m_m("skill_invoke", "skill_invoke_not_found"), { result: false, message: $l31 !== void 0 ? `Unknown skill: ${$l11}. Did you mean ${$l31.name}? Invoke it by that full name.` : `Unknown skill: ${$l11}. Several skills match that name: ${$l29.map(($l33) => $l33.name).join(", ")} \u2014 invoke one by its full name.`, errorCode: 2 };
      }
      let $l34 = $m_eme($l11, $l14.map(($l35) => ({ name: $m_zo($l35), aliases: $l35.aliases })), { maxEditDistance: 2 }), $l36 = $l5.agentId === void 0, $l37 = $l34 === void 0 && $l17 !== $l11 ? $m_me($l14, $l36).find(($l38) => $l38.name === $l17 && $m_xfn($l38)) : void 0, $l39 = $l37 !== void 0 && $m_cK($l17) && !$m_$Q($l17) && !$m_pe($l37, $l5) && $m_gze($l37, { commandName: $l17, userTypedThisTurn: false, isMainSession: $l36, permissionContext: $l5.permissions() }) === null;
      if ($l39) $m_a("tengu_skill_tool_unprefixed_match", {});
      let $l40 = $l34 ?? ($l39 ? $l17 : void 0);
      $m_m("skill_invoke", "skill_invoke_not_found");
      let $l41 = await $m_qsr()?.catch(() => {
        return;
      }), $l42 = $l41 && $m_ke($l11, $l41.errors, new Set($l41.enabled.map(($l43) => $l43.name))), $l44 = $l40 ? `Unknown skill: ${$l11}. Did you mean ${$l40}?` : `Unknown skill: ${$l11}`;
      return { result: false, message: $l42 ? `${$l44}${$l40 ? "" : "."} ${$l42}` : $l44, errorCode: 2 };
    }
    if ($m_pe($l16, $l5)) return $m_m("skill_invoke", "skill_invoke_fork_recursion"), $m_a("tengu_skill_tool_fork_recursion_blocked", {}), { result: false, message: `Skill ${$l11} is already executing in this forked context \u2014 you are the subagent running it. Execute the instructions in the skill body directly instead of re-invoking the ${$m_oo} tool.`, errorCode: 9 };
    let $l45 = await $m_xe($l11, $l16, $l14, $l5.storageV5), $l46 = $m_gze($l16, { commandName: $l45 ? $l11 : $l16.name, userTypedThisTurn: !$m_yfe($l5) && $m_Ne($l11, { agentId: $l5.agentId, messages: $l5.messages(), turnStartIndex: $l5.turnStartIndex }) && $l45, isMainSession: $l5.agentId === void 0, permissionContext: void 0 });
    if ($l46 !== null) {
      switch ($l46.reason) {
        case "disable_model_invocation": {
          let { sanitizedName: $l47, skillNameHash: $l48 } = $m_k9({ rawName: $l11, canonicalName: $l16.name, isMcp: $l16.loadedFrom === "mcp", isBuiltIn: $m_TU().has($l11), isBundled: $l16.type === "prompt" && $l16.source === "bundled", isOfficial: $l16.type === "prompt" && $m_j7($l16) });
          $m_m("skill_invoke", "skill_invoke_model_disabled", { command_name: $l47, ...$l48 });
          break;
        }
        case "not_loaded":
          $m_m("skill_invoke", "skill_invoke_not_materialized");
          break;
        case "not_allowlisted":
          $m_m("skill_invoke", "skill_invoke_not_allowlisted");
          break;
        case "override_disabled":
          $m_m("skill_invoke", $l46.hiddenBehindPlugin ? "skill_invoke_hidden_behind_plugin" : $l46.killSwitchOnly ? "skill_invoke_bundled_skills_disabled" : "skill_invoke_override_disabled");
          break;
        case "not_prompt_type":
          $m_m("skill_invoke", "skill_invoke_not_prompt_type");
          break;
        case "mcp_prompt":
          break;
        case "deny_rule":
          break;
      }
      return { result: false, message: $l46.message, errorCode: $l46.errorCode };
    }
    return { result: true };
  }, async checkPermissions($l49, $l50) {
    let { skill: $l51, args: $l52 } = $l49, $l53 = $l51.trim(), $l54 = $l53.startsWith("/") ? $l53.substring(1) : $l53, $l55 = $l5.permissions(), $l56 = await $m_ie($l5), $l57 = $m_re($l54, $l56, $l5), $l58 = $l57.command, $l59 = $l57.kind === "ambiguous" ? $l57.candidates : [$l58], $l60 = $l58?.type === "prompt" && $l58.loadedFrom === "mcp" ? $l58 : void 0, $l61 = $l60?.mcpSkillEntry?.(), $l62 = void 0, $l63 = void 0, $l64 = $m_sse($l55, SELF, "deny");
    for (let [$l65, $l66] of $l64.entries()) if (($l65.startsWith("/") ? $l65.substring(1) : $l65) === void 0 || $l59.some(($l67) => $m_KDo($l65, $l54, $l67))) return { behavior: "deny", message: "Skill execution blocked by permission rules", decisionReason: { type: "rule", rule: $l66 } };
    if ($l60 !== void 0) return { behavior: "deny", message: `Unknown skill: ${$l54}`, decisionReason: { type: "other", reason: `Unknown skill: ${$l54}` } };
    let $l68 = () => $m_r$t() && $m_$Q($l54) && !($l58 !== void 0 && $m__Te($l58)), $l69 = $m_sse($l55, SELF, "ask");
    if ($l69.size > 0 && $m_Cz()) {
      for (let [$l70, $l71] of $l69.entries()) if ($l59.some(($l72) => $m_GWs($l70, $l54, $l72))) return { behavior: "ask", message: `Execute skill: ${$l54}`, decisionReason: { type: "rule", rule: $l71 }, ...$l68() && { suppressAlwaysAllowRule: true }, updatedInput: { skill: $l51, args: $l52 }, metadata: $l58 ? { command: $l58 } : void 0 };
    }
    let $l73 = $m_sse($l55, SELF, "allow"), $l74;
    for (let [$l75, $l76] of $l73.entries()) {
      let $l77 = $m_zWs($l75, $l54, $l58);
      if ($l77 === "allow") return { behavior: "allow", updatedInput: { skill: $l51, args: $l52 }, decisionReason: { type: "rule", rule: $l76 } };
      if ($l77 === "held-back-nonholder") $l74 = { rule: $l75, kind: "nonholder" };
      else if ($l77 === "held-back-boundary") $l74 ??= { rule: $l75, kind: "boundary" };
    }
    if ($l58?.type === "prompt" && ($m_We($l58) || $m_yfe($l5))) return { behavior: "allow", updatedInput: { skill: $l51, args: $l52 }, decisionReason: void 0 };
    let $l78 = $l58?.type === "prompt" && $l58.source === "plugin" ? $l58.pluginInfo?.pluginManifest.name : void 0, $l79 = $l68(), $l80 = $l74 === void 0 ? void 0 : $l79 ? "nonholder" : $l74.kind;
    if ($l80 !== void 0 && $l55.mode !== "bypassPermissions" && $m_Hj($l55, SELF) === null) $m_Oe($l80);
    let $l81 = $l74 === void 0 || $l80 === void 0 ? void 0 : $m_KWs($l74.rule, $l58?.name ?? $l54, $l80 === "nonholder" ? { kind: "nonholder", pluginName: $l78 } : { kind: "boundary" }), $l82 = $l81 === void 0 ? void 0 : { type: "other", reason: $l81 };
    if ($l79) return { behavior: "ask", message: `Execute skill: ${$l54}${$l81 ? ` \u2014 ${$l81}` : ""}`, decisionReason: $l82, suppressAlwaysAllowRule: true, updatedInput: { skill: $l51, args: $l52 }, metadata: $l58 ? { command: $l58 } : void 0 };
    let $l83 = [{ type: "addRules", rules: [{ toolName: $m_oo, ruleContent: $l54 }], behavior: "allow", destination: "localSettings" }, { type: "addRules", rules: [{ toolName: $m_oo, ruleContent: `${$l54}:*` }], behavior: "allow", destination: "localSettings" }];
    return { behavior: "ask", message: `Execute skill: ${$l54}${$l81 ? ` \u2014 ${$l81}` : ""}`, decisionReason: $l82, suggestions: $l83, updatedInput: { skill: $l51, args: $l52 }, metadata: $l58 ? { command: $l58 } : void 0 };
  }, call($l84, $l85) {
    if (!$l85.runEngine) return Promise.reject(Error("Skill: invoking needs the executor (call.runEngine)"));
    return $l85.runEngine($m_ze, { input: $l84, parentMessage: $l85.parentMessage, onProgress: $l85.onProgress, timing: $l85.timing });
  } };
}, mapToolResultToToolResultBlockParam($l86, $l87) {
  if ("status" in $l86 && $l86.status === "forked") return { type: "tool_result", tool_use_id: $l87, content: ($l86.toolsUsedLine === void 0 ? "" : `${$l86.toolsUsedLine}
`) + ($l86.background ? `Skill "${$l86.commandName}" launched (forked execution, running in the background).

${$l86.result}` : `Skill "${$l86.commandName}" completed (forked execution).

Result:
${$l86.result}`) };
  if ("readOnly" in $l86 && $l86.readOnly) return { type: "tool_result", tool_use_id: $l87, content: `Loaded skill instructions (read-only): ${$l86.commandName}. Nothing was executed; delegate execution to a worker.` };
  return { type: "tool_result", tool_use_id: $l87, content: `Launching skill: ${$l86.commandName}` };
}, renderToolUseMessage: $m_Se });
