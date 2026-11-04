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
  return { async validateInput({ skill: $l6 }, { signal: $l7 }) {
    let $l8 = $l6.trim();
    if (!$l8) return $m_m("skill_invoke", "skill_invoke_empty_name"), { result: false, message: `Invalid skill format: ${$l6}`, errorCode: 1 };
    let $l9 = $l8.startsWith("/");
    if ($l9) $m_a("tengu_skill_tool_slash_prefix", {});
    let $l10 = $l9 ? $l8.substring(1) : $l8, $l11, $l12 = false, $l13 = await $m_ie($l5), $l14 = $m_re($l10, $l13, $l5), $l15 = $l14.command, $l16 = $m_uw($l10);
    if ($m_fre($l5.session) && (!$l15 || $m_Ygt($l15)) && ($l15 !== void 0 || $m_HKn($l16))) {
      let $l17 = await $m_As($m_ATe($l16), $l7, () => new $m_qe($m_Qu));
      if (!$l17.ok) $l11 = $l17.reason, $l12 = $l17.withheld === true;
      else $l13 = await $m_ie($l5), $l14 = $m_re($l10, $l13, $l5), $l15 = $l14.command;
    }
    if ($l15?.type === "prompt" && $l15.loadDefinition !== void 0) await $m_As($l15.loadDefinition(), $l7, () => new $m_qe($m_Qu)), $l13 = await $m_ie($l5), $l14 = $m_re($l10, $l13, $l5), $l15 = $l14.command;
    if ($l15?.type === "prompt" && $l15.loadedFrom === "mcp") return { result: false, message: `Unknown skill: ${$l10}`, errorCode: 2 };
    if ($l11 !== void 0 && (!$l15 || $m_Ygt($l15))) return $m_m("skill_invoke", $l12 ? "skill_invoke_withheld" : "skill_invoke_not_materialized"), { result: false, message: $l12 ? `${$m_DKn($l10)} Proceed without it.` : `Skill ${$l10} could not be downloaded (${$l11}). Proceed without it.`, errorCode: 10 };
    if ($l15 && $m_VTe($l15)) return $m_m("skill_invoke", $m__U($l15) ? "skill_invoke_host_catalog_withheld" : "skill_invoke_sync_vetoed"), { result: false, message: `Unknown skill: ${$l10}`, errorCode: 13 };
    if (!$l15) {
      let $l18 = $m_O_o($l13, $l10, $l5.spawnedBySkill);
      if ($l18.length > 0) {
        let $l19 = $l14.kind === "ambiguous" ? $l14.candidates.filter(($l20) => !$m_A$t($l20, $l10) && $m_cK($l20.name)) : [];
        if ($l14.kind === "ambiguous") $m_a("tengu_skill_tool_suffix_match", { candidate_count: $l14.candidates.length });
        return $m_m("skill_invoke", "skill_invoke_not_found"), { result: false, message: $l19.length > 0 ? `Unknown skill: ${$l10}. Several skills match that name: ${[...$l19, ...$l18].map(($l21) => $l21.name).join(", ")} \u2014 invoke one by its full name; the directory-scoped variants apply to the files under their directory.` : `Unknown skill: ${$l10}. Directory-scoped variants exist: ${$l18.map(($l22) => $l22.name).join(", ")} \u2014 invoke the variant whose directory contains the files you are working on.`, errorCode: 2 };
      }
      if ($l14.kind === "listingName") {
        let { listed: $l23 } = $l14, $l24 = $l5.agentId === void 0;
        if ($m_me($l13, $l24).includes($l23) && $m_cK($l23.name) && !$m_pe($l23, $l5) && $m_gze($l23, { commandName: $l23.name, userTypedThisTurn: false, isMainSession: $l24, permissionContext: $l5.permissions() }) === null) return $m_m("skill_invoke", "skill_invoke_not_found"), { result: false, message: `Unknown skill: ${$l10}. Did you mean ${$l23.name}? Invoke it by that full name.`, errorCode: 2 };
      }
      if ($l14.kind === "suggestion") {
        if ($m_a("tengu_skill_tool_suffix_match", { candidate_count: 1 }), $m_cK($l14.suggestion.name)) return $m_m("skill_invoke", "skill_invoke_not_found"), { result: false, message: `Unknown skill: ${$l10}. Did you mean ${$l14.suggestion.name}? Invoke it by that full name.`, errorCode: 2 };
      }
      if ($l14.kind === "ambiguous") {
        $m_a("tengu_skill_tool_suffix_match", { candidate_count: $l14.candidates.length });
        let $l25 = $l14.candidates.filter(($l26) => !$m_A$t($l26, $l10)), $l27 = $l25.length === 1 ? $l25[0] : void 0;
        if ($l25.length > 0 && $l25.every(($l28) => $m_cK($l28.name))) return $m_m("skill_invoke", "skill_invoke_not_found"), { result: false, message: $l27 !== void 0 ? `Unknown skill: ${$l10}. Did you mean ${$l27.name}? Invoke it by that full name.` : `Unknown skill: ${$l10}. Several skills match that name: ${$l25.map(($l29) => $l29.name).join(", ")} \u2014 invoke one by its full name.`, errorCode: 2 };
      }
      let $l30 = $m_eme($l10, $l13.map(($l31) => ({ name: $m_zo($l31), aliases: $l31.aliases })), { maxEditDistance: 2 }), $l32 = $l5.agentId === void 0, $l33 = $l30 === void 0 && $l16 !== $l10 ? $m_me($l13, $l32).find(($l34) => $l34.name === $l16 && $m_xfn($l34)) : void 0, $l35 = $l33 !== void 0 && $m_cK($l16) && !$m_$Q($l16) && !$m_pe($l33, $l5) && $m_gze($l33, { commandName: $l16, userTypedThisTurn: false, isMainSession: $l32, permissionContext: $l5.permissions() }) === null;
      if ($l35) $m_a("tengu_skill_tool_unprefixed_match", {});
      let $l36 = $l30 ?? ($l35 ? $l16 : void 0);
      $m_m("skill_invoke", "skill_invoke_not_found");
      let $l37 = await $m_qsr()?.catch(() => {
        return;
      }), $l38 = $l37 && $m_ke($l10, $l37.errors, new Set($l37.enabled.map(($l39) => $l39.name))), $l40 = $l36 ? `Unknown skill: ${$l10}. Did you mean ${$l36}?` : `Unknown skill: ${$l10}`;
      return { result: false, message: $l38 ? `${$l40}${$l36 ? "" : "."} ${$l38}` : $l40, errorCode: 2 };
    }
    if ($m_pe($l15, $l5)) return $m_m("skill_invoke", "skill_invoke_fork_recursion"), $m_a("tengu_skill_tool_fork_recursion_blocked", {}), { result: false, message: `Skill ${$l10} is already executing in this forked context \u2014 you are the subagent running it. Execute the instructions in the skill body directly instead of re-invoking the ${$m_oo} tool.`, errorCode: 9 };
    let $l41 = await $m_xe($l10, $l15, $l13, $l5.storageV5), $l42 = $m_gze($l15, { commandName: $l41 ? $l10 : $l15.name, userTypedThisTurn: !$m_yfe($l5) && $m_Ne($l10, { agentId: $l5.agentId, messages: $l5.messages(), turnStartIndex: $l5.turnStartIndex }) && $l41, isMainSession: $l5.agentId === void 0, permissionContext: void 0 });
    if ($l42 !== null) {
      switch ($l42.reason) {
        case "disable_model_invocation": {
          let { sanitizedName: $l43, skillNameHash: $l44 } = $m_k9({ rawName: $l10, canonicalName: $l15.name, isMcp: $l15.loadedFrom === "mcp", isBuiltIn: $m_TU().has($l10), isBundled: $l15.type === "prompt" && $l15.source === "bundled", isOfficial: $l15.type === "prompt" && $m_j7($l15) });
          $m_m("skill_invoke", "skill_invoke_model_disabled", { command_name: $l43, ...$l44 });
          break;
        }
        case "not_loaded":
          $m_m("skill_invoke", "skill_invoke_not_materialized");
          break;
        case "not_allowlisted":
          $m_m("skill_invoke", "skill_invoke_not_allowlisted");
          break;
        case "override_disabled":
          $m_m("skill_invoke", $l42.hiddenBehindPlugin ? "skill_invoke_hidden_behind_plugin" : $l42.killSwitchOnly ? "skill_invoke_bundled_skills_disabled" : "skill_invoke_override_disabled");
          break;
        case "not_prompt_type":
          $m_m("skill_invoke", "skill_invoke_not_prompt_type");
          break;
        case "mcp_prompt":
          break;
        case "deny_rule":
          break;
      }
      return { result: false, message: $l42.message, errorCode: $l42.errorCode };
    }
    return { result: true };
  }, async checkPermissions($l45, $l46) {
    let { skill: $l47, args: $l48 } = $l45, $l49 = $l47.trim(), $l50 = $l49.startsWith("/") ? $l49.substring(1) : $l49, $l51 = $l5.permissions(), $l52 = await $m_ie($l5), $l53 = $m_re($l50, $l52, $l5), $l54 = $l53.command, $l55 = $l53.kind === "ambiguous" ? $l53.candidates : [$l54], $l56 = $l54?.type === "prompt" && $l54.loadedFrom === "mcp" ? $l54 : void 0, $l57 = $l56?.mcpSkillEntry?.(), $l58 = void 0, $l59 = void 0, $l60 = $m_sse($l51, SELF, "deny");
    for (let [$l61, $l62] of $l60.entries()) if (($l61.startsWith("/") ? $l61.substring(1) : $l61) === void 0 || $l55.some(($l63) => $m_KDo($l61, $l50, $l63))) return { behavior: "deny", message: "Skill execution blocked by permission rules", decisionReason: { type: "rule", rule: $l62 } };
    if ($l56 !== void 0) return { behavior: "deny", message: `Unknown skill: ${$l50}`, decisionReason: { type: "other", reason: `Unknown skill: ${$l50}` } };
    let $l64 = () => $m_r$t() && $m_$Q($l50) && !($l54 !== void 0 && $m__Te($l54)), $l65 = $m_sse($l51, SELF, "ask");
    if ($l65.size > 0 && $m_Cz()) {
      for (let [$l66, $l67] of $l65.entries()) if ($l55.some(($l68) => $m_GWs($l66, $l50, $l68))) return { behavior: "ask", message: `Execute skill: ${$l50}`, decisionReason: { type: "rule", rule: $l67 }, ...$l64() && { suppressAlwaysAllowRule: true }, updatedInput: { skill: $l47, args: $l48 }, metadata: $l54 ? { command: $l54 } : void 0 };
    }
    let $l69 = $m_sse($l51, SELF, "allow"), $l70;
    for (let [$l71, $l72] of $l69.entries()) {
      let $l73 = $m_zWs($l71, $l50, $l54);
      if ($l73 === "allow") return { behavior: "allow", updatedInput: { skill: $l47, args: $l48 }, decisionReason: { type: "rule", rule: $l72 } };
      if ($l73 === "held-back-nonholder") $l70 = { rule: $l71, kind: "nonholder" };
      else if ($l73 === "held-back-boundary") $l70 ??= { rule: $l71, kind: "boundary" };
    }
    if ($l54?.type === "prompt" && ($m_We($l54) || $m_yfe($l5))) return { behavior: "allow", updatedInput: { skill: $l47, args: $l48 }, decisionReason: void 0 };
    let $l74 = $l54?.type === "prompt" && $l54.source === "plugin" ? $l54.pluginInfo?.pluginManifest.name : void 0, $l75 = $l64(), $l76 = $l70 === void 0 ? void 0 : $l75 ? "nonholder" : $l70.kind;
    if ($l76 !== void 0 && $l51.mode !== "bypassPermissions" && $m_Hj($l51, SELF) === null) $m_Oe($l76);
    let $l77 = $l70 === void 0 || $l76 === void 0 ? void 0 : $m_KWs($l70.rule, $l54?.name ?? $l50, $l76 === "nonholder" ? { kind: "nonholder", pluginName: $l74 } : { kind: "boundary" }), $l78 = $l77 === void 0 ? void 0 : { type: "other", reason: $l77 };
    if ($l75) return { behavior: "ask", message: `Execute skill: ${$l50}${$l77 ? ` \u2014 ${$l77}` : ""}`, decisionReason: $l78, suppressAlwaysAllowRule: true, updatedInput: { skill: $l47, args: $l48 }, metadata: $l54 ? { command: $l54 } : void 0 };
    let $l79 = [{ type: "addRules", rules: [{ toolName: $m_oo, ruleContent: $l50 }], behavior: "allow", destination: "localSettings" }, { type: "addRules", rules: [{ toolName: $m_oo, ruleContent: `${$l50}:*` }], behavior: "allow", destination: "localSettings" }];
    return { behavior: "ask", message: `Execute skill: ${$l50}${$l77 ? ` \u2014 ${$l77}` : ""}`, decisionReason: $l78, suggestions: $l79, updatedInput: { skill: $l47, args: $l48 }, metadata: $l54 ? { command: $l54 } : void 0 };
  }, call($l80, $l81) {
    if (!$l81.runEngine) return Promise.reject(Error("Skill: invoking needs the executor (call.runEngine)"));
    return $l81.runEngine($m_ze, { input: $l80, parentMessage: $l81.parentMessage, onProgress: $l81.onProgress, timing: $l81.timing });
  } };
}, mapToolResultToToolResultBlockParam($l82, $l83) {
  if ("status" in $l82 && $l82.status === "forked") return { type: "tool_result", tool_use_id: $l83, content: ($l82.toolsUsedLine === void 0 ? "" : `${$l82.toolsUsedLine}
`) + ($l82.background ? `Skill "${$l82.commandName}" launched (forked execution, running in the background).

${$l82.result}` : `Skill "${$l82.commandName}" completed (forked execution).

Result:
${$l82.result}`) };
  if ("readOnly" in $l82 && $l82.readOnly) return { type: "tool_result", tool_use_id: $l83, content: `Loaded skill instructions (read-only): ${$l82.commandName}. Nothing was executed; delegate execution to a worker.` };
  return { type: "tool_result", tool_use_id: $l83, content: `Launching skill: ${$l82.commandName}` };
}, renderToolUseMessage: $m_Se });
