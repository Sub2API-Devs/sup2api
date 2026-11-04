async function* SELF($l0, $l1, $l2, $l3, $l4, { modelFacts: $l5, ...$l6 }) {
  let { fallbackModel: $l7, accessFallbackModel: $l8 = $l6.accessFallbackModel } = $m_E$o($l6.model, $l6.fallbackModel, $m_MRr), $l9 = $m_Gfr($l0, $l6.model), $l10 = $m_zfr($l6.model, $l8, $l9), $l11 = $l7 === $l6.fallbackModel ? $l6 : { ...$l6, fallbackModel: $l7 }, $l12 = $l11.clock ?? $m_Xd, $l13 = ($l14) => $m_gF($l11.querySource) ? $m__4($l14) : $l14(), $l15 = $l13(() => $m_qe($l11.model)), $l16 = $m_rs($l11.querySource) === "main" && !$l11.agentId;
  if ($l16) $m_oR("model_gates");
  if (!$m_kt() && ($m_Kle($l15) || $m_IGe($l15) || $m_dBt($l15)) && (await $m_MW("tengu-off-switch", { activated: false })).activated) {
    $m_i("tengu_off_switch_query", {}), yield $m_X7(Error($m_IGe($l15) ? $m_Vlt : $m_Klt), $l11.model);
    return;
  }
  let $l17 = null;
  try {
    $l17 = await $m_TGs($l15);
  } catch ($l18) {
    $m_t(`tengu-model-error-overrides block check failed: ${$l18}`, { level: "error" });
  }
  if ($l17 !== null) {
    if ($l11.fallbackModel !== void 0) throw $m_i("tengu_off_switch_query", { tier: $m_b("per_model_block"), outcome: $m_b("fallback") }), new $m_pD($l11.model, $l11.fallbackModel, "model_blocked", void 0, $l17);
    $m_i("tengu_off_switch_query", { tier: $m_b("per_model_block") }), yield $m_Fs({ content: $l17, error: "rate_limit" });
    return;
  }
  let $l19 = $m_Tfr($l0), $l20 = $m_OUe($l0, $l11.agentContext), $l21 = $m_Rfr($l0), $l22 = $m_Cfr($l0), $l23 = $m_sTr($l0), $l24 = $m_xQe($l0), $l25 = $m_Pe() === "bedrock" && $l11.model.includes("application-inference-profile") ? await $m_FMe($m_Pn($l11.model)) ?? $l11.model : $l11.model;
  if ($m_KTe($l11.model, $l11.querySource), $m_pTe()) await $m_Scn($l11.model, $l11.credentials, $l11.storageV5);
  if ($m_Om("query_tool_schema_build_start"), $l16) $m_sR("model_gates"), $m_oR("tool_schema_build");
  let $l26 = $l11.querySource.startsWith("repl_main_thread") || $l11.querySource.startsWith("agent:") || $l11.querySource === "sdk" || $l11.querySource === "hook_agent", $l27 = $m_BTo($l11.stickyBetas);
  if (!$l27.declaredToolsDecided) $l13(() => $m_j7t($l27, $l11.recordedWireShape, $l11.model));
  let $l28 = $l13(() => $m_S8n($l11.model, { isAgenticQuery: $l26 })), $l29 = $l13(() => $m_qe($l25)), $l30 = $l5?.model === $l25 && !$m_gF($l11.querySource) ? $l5 : $l13(() => $m_Jd($l25));
  if ($m_UHt() && ($m_qk() || $l11.advisorModel !== void 0)) $l28.push($m_h1t);
  let $l31 = $l11.fallbackCreditCode !== void 0 && $l11.fallbackCreditMintModel !== void 0 && $m_Hfr($l11.fallbackCreditMintModel, $l11.model), $l32 = $l31 ? $l11.fallbackCreditMintModel : void 0, $l33 = $l32 ?? $l11.model, $l34 = $m_Tqs($l2, $l30.thinking.alwaysOn || $l32 !== void 0 && $l13(() => $m_kQe($l32))), $l35 = $l32 === void 0 ? $m_fC($l11.model) : void 0;
  if ($l35 !== void 0 && !$l27.declaredToolsDecided) {
    let $l36 = $m_Pyt($l27);
    for (let $l37 of $m_ibn($l35)) $m_Dg($l27, $l37);
    if ($l11.stickyBetas === void 0) $m_rZ($l27, $l36);
  }
  let $l38 = ($l39, $l40) => {
    $m_Dg($l27, $l39);
    let $l41 = "in this conversation";
    if ($l40 && $l35 !== void 0) $m_D5o($l35, $l39), $l41 += `, or by new ones on ${$l35} in this process`;
    $m_t(`[betas] the API refused ${$l39.header}; not sent again ${$l41}`, { level: "warn" });
  };
  await $m_s8e($l3);
  let $l42 = $l11.withoutToolDescribeHooks ? "engine" : "hooks", $l43 = ($l44, $l45) => $l42 === "engine" ? $m_B1e($l44, $l45) : $m_IX($l44, $l45);
  if (!$l11.withoutToolDescribeHooks) await $m_LYt($l3, ($l46) => $m_FH($l46, { getToolPermissionContext: $l11.getToolPermissionContext, tools: $l3, agents: $l11.agents, allowedAgentTypes: $l11.allowedAgentTypes, model: $l33, enginePlacement: $m_B1e($l46) ? "deferred" : "listed", querySource: $l11.querySource }));
  let $l47 = $l26 || $l11.forkPointUuid !== void 0 ? $l13(() => $m_Oxs($l11.advisorModel, $l33)) : void 0, $l48 = !$m_gF($l11.querySource) && await $m_avr($l33, $l3, $l11.getToolPermissionContext, $l11.agents, "query", $l11.credentials, $l11.recordedToolDescriptions) && !$l11.withoutToolSearch, $l49 = $m_ev($l0, $l11.echoWireToolInputs), $l50 = $l11.resumeIncompleteThinking === true;
  $l28 = $l13(() => $m_jHs($l27, $l28, $l11.model));
  let $l51 = false;
  if (!$l48 && !$m_gF($l11.querySource)) try {
    $l51 = $l13(() => $m_Xxr($l27, $l33, { toolSearchToolFilteredOut: $m_ivr($l33, $l3), toolPoolRefreshes: $l11.toolPoolRefreshes === true, aheadOfRequest: false }));
  } catch ($l52) {
    $m_l($m_U($l52));
  }
  if (!$l27.declaredToolsDecided) {
    let $l53;
    try {
      $l53 = $l11.recordedDeferredTools?.();
      for (let $l54 of $l53?.nameOnlyAnnouncements ?? []) $l27.nameOnlyAnnouncements.add($l54);
      if ($l53 !== void 0) $m_ezn($l0, [...$l53.entries.values()], { strippedReferences: $l53.strippedReferences, ...($l48 || $l51) && $m_s9e($l27) && { surfacedCarrier: $l27 } });
    } catch ($l55) {
      $m_l($m_U($l55));
    }
    try {
      let $l56 = $l53?.toolInputCopies;
      if ($l56 !== void 0 && $l56.size > 0 && $m_FTo($l11.querySource) && $m_zEt($l0, $l49)) $m_F_e($l0, $l56);
    } catch ($l57) {
      $m_l($m_U($l57));
    }
  }
  let $l58 = /* @__PURE__ */ new Set(), $l59 = /* @__PURE__ */ new Set(), $l60 = true;
  try {
    $l60 = $m_IHr();
  } catch ($l61) {
    $m_l($m_U($l61));
  }
  try {
    if ($l28.includes($m_Ib) && $l13(() => $m_UHs($l27, $l33))) $l58 = $m_mHs($l0, $l27.nameOnlyAnnouncements), $l59 = $m_gHs($l0, $l27.nameOnlyAnnouncements);
  } catch ($l62) {
    $m_l($m_U($l62));
  }
  let $l63;
  if ($l48) try {
    let $l64 = $m_HM();
    $l63 = $m_fTe($l27, $l3, ($l65) => $l43($l65, $l64), $l33);
  } catch ($l66) {
    $m_l($m_U($l66));
  }
  let $l67, $l68 = !$l27.declaredToolsDecided, $l69 = $m_NHs(), $l70 = 0;
  if ($l48 || $l51) {
    let $l71;
    if (!$l27.declaredToolsDecided) try {
      $l71 = await $l11.getToolPermissionContext();
    } catch ($l72) {
      $m_l($m_U($l72));
    }
    try {
      $l67 = $m_Yxr($l27, () => $l11.recordedToolDescriptions && { names: $l11.recordedToolDescriptions.keys(), servers: $l11.recordedToolServers, entries: $l11.recordedToolEntries }, $l3, { latch: true, permissionContext: $l71 });
    } catch ($l73) {
      $m_l($m_U($l73)), $l63 = void 0;
    }
  }
  $m_qwt($l27);
  let $l74 = $l67 ?? $l63, $l75 = /* @__PURE__ */ new Set(), $l76 = 0;
  if ($l48 || $l51) try {
    let $l77 = $m_HM();
    for (let $l78 of $l3) {
      let $l79 = $l48 && $l43($l78, $l77);
      if ($l74 === void 0 ? $l51 ? false : $l79 : $m_Bee($l78, $l74, $l3, { toolSearchAbsent: $l51, placements: $l42, nonDeferrableBuiltins: $l77 })) {
        if ($l75.add($l78.name), !$l79) $l76++;
      }
    }
  } catch ($l80) {
    $m_l($m_U($l80)), $l67 = void 0, $l74 = void 0, $l75.clear(), $l76 = 0;
    let $l81 = $m_HM();
    for (let $l82 of $l3) if ($l48 && $l43($l82, $l81)) $l75.add($l82.name);
  }
  let $l83 = $m_Uz().generation, $l84 = $l48 || $l51 ? $m_$To($l0, $l3, $l11.querySource, { keepMcp: !$m_C5($l3), surfacedOnWire: $l27.surfacedOnWire, ...$l69 && { declaredInline: $l67 } }) : void 0;
  if ($l48 && $l75.size === 0 && (!$l11.hasPendingMcpServers || $m_C5($l3)) && !$l84?.kept.size && !$l67?.has($m_Ai)) {
    if ($m_t("Tool search disabled: no deferred tools available to search"), $l48 = false, $l69 && $l67 !== void 0 && $l84 !== void 0) try {
      $l84 = $m_$To($l0, $l3, $l11.querySource, { keepMcp: !$m_C5($l3), surfacedOnWire: $l27.surfacedOnWire });
    } catch ($l85) {
      $m_l($m_U($l85));
    }
  }
  let $l86 = $l48 ? "tool_search" : $l51 ? "tool_addition" : void 0, $l87, $l88, $l89 = 0;
  if ($l86 !== void 0) {
    let $l90 = $m_GZ($l0, { surfaced: $m_s9e($l27) ? { exceptAnnouncements: $l27.nameOnlyAnnouncements } : $l27.surfacedOnWire }), $l91 = /* @__PURE__ */ new Set();
    if ($l58.size > 0) try {
      $l91 = $l60 ? new Set($m_Cme($l0).map(($l92) => $l92.toolName)) : $m_GZ($l0);
    } catch ($l93) {
      $m_l($m_U($l93));
    }
    $l87 = $l3.filter(($l94) => {
      if (!$l75.has($l94.name)) return true;
      if ($m_Ct($l94, $m_Ai)) return true;
      return $l90.has($l94.name) && (!$l58.has($l94.name) || $l91.has($l94.name));
    });
    try {
      let $l95 = $m_GTo($l87, $l67);
      $l87 = $l95.tools, $l70 = $l95.redeclared.length;
    } catch ($l96) {
      $m_l($m_U($l96));
    }
  } else {
    $l87 = $l3.filter(($l97) => {
      if ($m_Ct($l97, $m_Ai)) return false;
      if ($l58.has($l97.name)) return false;
      return true;
    });
    let $l98 = $m_Zrn($l27);
    if ($l98 !== void 0) try {
      let $l99 = await $m_IHs($l98, $l3, { mcpClients: $l11.mcpClients ?? [], getPermissionContext: $l11.getToolPermissionContext, byValue: $l58 });
      $l88 = $l58.size === 0 ? $l99.kept : $l99.kept.without($l58), $l89 = $l99.unread;
      let $l100 = $m_GTo($l87, $l88);
      $l87 = $l100.tools, $l70 = $l100.redeclared.length;
    } catch ($l101) {
      $m_l($m_U($l101));
    }
  }
  let $l102 = $m_A5($m_szn($l87));
  $m_cfr($l102, $l11.querySource);
  let $l103 = $m_Sd($l11.model), $l104 = $l48 ? $m_Pqs() : null;
  if ($l104 && $l103 !== "bedrock") {
    if (!$l28.includes($l104)) $l28.push($l104);
  }
  let $l105, $l106 = $m_LJ(), $l107 = ($l108) => $l75.has($l108.name) || $l48 && $m_Sfr($l108), $l109 = ($l110) => $l84?.kept.has($l110.name) === true, $l111 = true;
  try {
    $l111 = $l102.some(($l112) => ($l67?.has($l112.name) ?? true) && !$l107($l112) && !$l109($l112)) || $l67 !== void 0 && $m_zTo($l67, { pool: $l3, keptDeferred: $l84?.kept.keys() ?? [], keepMcp: !$m_C5($l3) }).length > 0;
  } catch ($l113) {
    $m_l($m_U($l113));
  }
  let $l114 = ($l115) => $l86 !== void 0 && ($l107($l115) || $l111 && $l109($l115));
  if ($l86 !== void 0 && $l67 === void 0) try {
    let $l116 = $m_A5($l87).filter(($l117) => !$l114($l117));
    if ($l74 !== void 0) $m_t_n($l27, new $m_qve($l116));
    else $m_OHs($l27, $l116);
  } catch ($l118) {
    $m_l($m_U($l118));
  }
  let $l119;
  if ($l86 === void 0 && $l68 && $m_Zrn($l27) === void 0 && ($l11.mcpClients ?? []).some(($l120) => $l120.type === "pending")) try {
    $l119 = await $m_PHs($l11, $l3, $l58);
  } catch ($l121) {
    $m_l($m_U($l121));
  }
  try {
    $l88 = $m_jTo($l27, $l86 !== void 0, () => $m_WTo($m_A5($l87), $l3, $l119 ?? $l88?.recordedOnly));
  } catch ($l122) {
    $m_l($m_U($l122));
  }
  let $l123 = $l106 && $l102.some(($l124) => $l124.isMcp === true && !$l114($l124));
  if ($l106 && !$l28.includes($m_m1t)) $l28.push($m_m1t);
  let $l125 = $l106 ? $l123 ? "none" : "system_prompt" : "none", $l126 = $m_HM(), $l127 = $l11.withoutToolDescribeHooks ? void 0 : $l11.redescribedTools, $l128 = await Promise.all($l102.map(($l129) => $m_FH($l129, { getToolPermissionContext: $l11.getToolPermissionContext, tools: $l3, agents: $l11.agents, allowedAgentTypes: $l11.allowedAgentTypes, model: $l33, enginePlacement: $m_B1e($l129, $l126) ? "deferred" : "listed", querySource: $l11.querySource, withoutToolDescribeHooks: $l11.withoutToolDescribeHooks, recordedDescription: $l114($l129) ? void 0 : $l11.recordedToolDescriptions?.get($l129.name), recordedEntry: $l114($l129) || $m_Ct($l129, $m_Fa) ? void 0 : $l11.recordedToolEntries?.get($l129.name), isRedescribed: $l127?.has($l129.name) || void 0, deferLoading: $l114($l129), loadedThroughToolSearch: $l48 && $l114($l129) && $l43($l129, $l126) })));
  $m_zYt($l27, $l128, { redescribed: $l127, recorded: $l11.recordedToolDescriptions, isMainChain: $m_uf($l11.agentContext) && $m_rs($l11.querySource) === "main" });
  let $l130 = [];
  if ($l86 !== "tool_search" && $l58.size > 0) try {
    let $l131 = new Set($l102.map(($l132) => $l132.name)), $l133 = $l3.filter(($l134) => $l58.has($l134.name) && !$l131.has($l134.name)), $l135 = new Set($m_A5($m_szn([...$l87, ...$l133])).map(($l136) => $l136.name));
    $l130 = await Promise.all($l133.filter(($l137) => $l135.has($l137.name)).map(($l138) => $m_FH($l138, { getToolPermissionContext: $l11.getToolPermissionContext, tools: $l3, agents: $l11.agents, allowedAgentTypes: $l11.allowedAgentTypes, model: $l33, enginePlacement: $m_B1e($l138) ? "deferred" : "listed", querySource: $l11.querySource, withoutToolDescribeHooks: $l11.withoutToolDescribeHooks, recordedDescription: $l11.recordedToolDescriptions?.get($l138.name), recordedEntry: $l11.recordedToolEntries?.get($l138.name), isRedescribed: $l127?.has($l138.name) || void 0, deferLoading: false })));
  } catch ($l139) {
    $m_l($m_U($l139)), $l130 = [];
  }
  let $l140 = new Map($l102.map(($l141, $l142) => [$l141.name, { schema: $l128[$l142], isMcp: $l141.isMcp === true }])), $l143 = $l86 !== void 0 ? $l67 : $l88, $l144 = [];
  if ($l143 !== void 0 && $l143.recordedOnly.size > 0) try {
    $l144 = $m_LHs($l128, $l143, { pool: $l3, recordedEntries: $l11.recordedToolEntries, keptDeferred: $l111 ? $l84?.kept.keys() ?? [] : [], keepMcp: !$m_C5($l3), requestCarriesStructuredOutputs: $l13(() => $m_w8n($l33)) });
  } catch ($l145) {
    $m_l($m_U($l145));
  }
  if ($m_FHs({ deferredLate: $l76, redeclared: $l70, fromRecord: $l144.length, queryDepth: $l11.queryTracking?.depth, toolSearchAbsent: $l86 === "tool_addition", noDeferredChannel: $l86 === void 0, unclassifiedDepartures: $l89 }), $l11.onInlineToolsDeclared) {
    let $l146 = new Map($l102.map(($l147) => [$l147.name, $l147])), $l148 = [];
    for (let $l149 of $l128) {
      if (!("input_schema" in $l149)) continue;
      let $l150 = $l146.get($l149.name), $l151 = $l150 === void 0 ? $l143?.recordedOnly.get($l149.name) : void 0;
      if ($l150 !== void 0 && !$l114($l150)) $l148.push({ name: $l149.name, description: $l149.description ?? "", schema: $l149, ...$l150.mcpInfo && { server: $l150.mcpInfo.serverName } });
      else if ($l151 !== void 0) {
        let $l152 = $l11.recordedToolEntries?.get($l149.name) ?? $l151.entry;
        $l148.push({ name: $l149.name, description: $l152.description ?? "", schema: $l152, ...$l151.server !== void 0 && { server: $l151.server } });
      }
    }
    $l11.onInlineToolsDeclared($l148);
  }
  if ($l86 !== void 0) {
    if ($l84) $m_EHs($l84, $l128, $l140, { requestCarriesStructuredOutputs: $l13(() => $m_w8n($l33)) });
    let $l153 = $m_qcn();
    if ($l153 && !$l87.some(($l154) => $m_Ct($l154, $m_SWe)) && !$l84?.kept.has($m_SWe)) $l128.splice(Math.max($l128.length - 1, 0), 0, $l153);
    let $l155 = $m_F($l87, ($l156) => $l75.has($l156.name));
    $m_t(`Dynamic tool loading: ${$l155}/${$l75.size} deferred tools included`);
  }
  if ($m_Om("query_tool_schema_build_end"), $l16) $m_sR("tool_schema_build");
  if ($m_i("tengu_api_before_normalize", { preNormalizedMessageCount: $l0.length }), $m_Om("query_message_normalization_start"), $l32 !== void 0) $m_i("tengu_fallback_credit_strip_as_mint_model", {});
  let $l157, $l158 = ($l159) => {
    $l160 = $l159.thread?.type === "continue";
    let $l161 = $m_WYt($l27, { ...$m_Bmn($l159, $l162()), messages: $l163 }, { querySource: $l11.querySource, isMainThread: $m_uf($l11.agentContext), history: $l0, retryCause: $l164, retryKeepsHeal: $l165 === true, promptEpoch: $l11.promptRenderEpoch, accountMemoryEpoch: $l166 });
    if ($m_nx($l11.querySource) !== null && $m_Gb()) try {
      $m_Qfn($l11.agentId, $l161 !== void 0);
    } catch ($l167) {
      $m_l($m_U($l167));
    }
    if ($l161?.tools !== void 0) $l168 = [...$l161.tools];
    if ($l161?.tools !== void 0 && $l159.tools !== void 0) {
      if ($l159.tools = [...$l161.tools], $l84) $m_AHs($l84, $l159.tools);
    }
    let $l169 = $l159.tools ?? $l168;
    if ($l157 !== void 0 && $l169 !== void 0) $m_THs($l157, $l169);
    if ($l161 === void 0) return;
    if ($l161.system !== void 0) {
      let $l170 = typeof $l161.system === "string" ? $l161.system : [...$l161.system];
      if ($l171 = $l170, !$l172) $l159.system = $l170;
    }
    if ($l161.messages !== void 0) {
      $l163 = [...$l161.messages];
      let $l173 = $m_UYt($l163, $l159.messages.length);
      if ($m_eer($l173)) try {
        let $l174 = $m_qd($l173);
        $m_pKe($l174), $l173 = $l174;
      } catch {
      }
      $l159.messages = $l173;
    }
  }, $l175 = $m_Rm($l27, $m_eP), $l176 = $l175 || $m_Rm($l27, $m_DW), $l177 = $l176 || $m_Rm($l27, $m_P4), $l178 = $m_Rm($l27, $m_B2);
  if ($l28 = $l28.filter(($l179) => !$m_Rm($l27, $l179) && !($l176 && $l179 === $m_DW) && !($l177 && $l179 === $m_P4)), $l32 !== void 0) {
    let $l180 = $l13(() => $m_S8n($l32, { isAgenticQuery: $l26 })), $l181 = ($l182) => {
      if ($l180.includes($l182)) {
        if (!$l28.includes($l182)) $l28.push($l182);
      } else $l28 = $l28.filter(($l183) => $l183 !== $l182);
    };
    if (!$l175) $l181($m_eP);
    if (!$l176) $l181($m_DW);
    if (!$l177) $l181($m_P4);
    $l28 = $l13(() => $m_WHs($l27, $l28, $l32, $l11.model)), $l181($m_cde);
  }
  let $l184 = !$m_gF($l11.querySource) && !$l178 && $l28.includes($m_eP) && $l13(() => $m_OTe($l32 ?? $l11.model));
  if ($l184 && !$l28.includes($m_B2)) $l28.push($m_B2);
  let $l185 = $l13(() => $m_kYn({ loopEffort: $l11.refusalFallbackEffort, continuesMainConversation: $m_BB($l11.agentContext) }, $l25)), $l186 = $l13(() => $m_ek($l25, $l11.effortValue, { turnEffort: $l11.turnEffort, hookEffortValue: $l11.hookEffortValue, carriedEffort: $l185 })), $l187 = $l185 === null ? void 0 : { level: $l185, outcome: $m_Gjs({ carried: $l185, withIt: $l186, withoutIt: $l13(() => $m_ek($l25, $l11.effortValue ?? $l11.effortSetAsideByHold, { turnEffort: $l11.turnEffort, hookEffortValue: $l11.hookEffortValue, carriedEffort: null })), isSavedSetAside: $l11.effortSetAsideByHold !== void 0 }) }, $l188 = $l13(() => $m_KS($l25) && $l186 !== void 0 ? $m_Q0($l186) : void 0), $l189 = $m_uf($l11.agentContext) && ($l11.querySource.startsWith("repl_main_thread") || $l11.querySource === "sdk"), $l190 = $l11.querySource.startsWith("repl_main_thread") || $l11.querySource === "sdk", $l191 = $l189 ? "foreground" : $l11.agentContext.agentId;
  if ($l190) $m_zmn($l191, $l9);
  let $l192;
  if ($l189) try {
    $l192 = $m_fgn($l0);
  } catch ($l193) {
    $m_l($m_U($l193));
  }
  let $l194 = ($l195) => {
    if (!$l189 || $l195 === void 0) return {};
    try {
      let $l196 = $m_pJ($l25);
      return { isDefaultEffort: $l195 === $l196, defaultEffortLevel: $l196 };
    } catch ($l197) {
      return $m_l($m_U($l197)), {};
    }
  }, $l198 = typeof $l186 === "string" && !($l34.type === "disabled" && $l34.mechanical === true) ? $l188 : void 0, $l199 = $l28.includes($m_P4) ? $m_Lfn(/* @__PURE__ */ new Date(), $m_MHr()) : void 0, $l200 = $l128.some(($l201) => !("defer_loading" in $l201 && $l201.defer_loading === true)) || ($l11.extraToolSchemas ?? []).some(($l202) => !("defer_loading" in $l202 && $l202.defer_loading === true)), $l203 = $l11.advisorDeferred === true && $l47 !== void 0 && $l28.includes($m_hS) && $l200, $l204 = $l11.advisorDeferred === true && $l11.advisorActive === false && !$l203 ? void 0 : $l47, $l205 = false, $l206 = 0;
  if ($l86 === "tool_addition" && !$l28.includes($m_hS)) try {
    let $l207 = $l128.flatMap(($l208) => {
      if (!("defer_loading" in $l208) || $l208.defer_loading !== true) return [$l208];
      if (!("input_schema" in $l208) || !$l3.some(($l209) => $m_Ct($l209, $l208.name))) return [];
      let { defer_loading: $l210, ...$l211 } = $l208;
      return [$l211];
    }), $l212 = new Set($l128);
    $l206 = $m_F($l207, ($l213) => !$l212.has($l213)), $l205 = $l206 > 0 || $l207.length !== $l128.length, $l128.splice(0, $l128.length, ...$l207);
  } catch ($l214) {
    $m_l($m_U($l214));
  }
  let $l215 = $l32 === void 0 ? void 0 : $l13(() => $m_GHs($l27, $l0, { mintModel: $l32, retryModel: $l11.model, advisorEntryMoved: $l11.advisorDeferred === true && $l47 !== void 0 && $l200 && !$l203, deferredEntriesMoved: $l205, hasDeferredChannel: $l86 !== void 0 })), $l216 = /* @__PURE__ */ new Set([...$l87.filter($l114).map(($l217) => $l217.name), ...$l84?.kept.keys() ?? []]);
  if ($m_zHs($l27, $l0, $l216, $l48, $l58), $l86 !== void 0 && $l11.onDeferredToolsSent && $m_BIe()) try {
    $l157 = $l128.filter(($l218) => $m_Wrn($l218) && !$m_Ct($l218, $m_SWe)), $l11.onDeferredToolsSent({ entries: $l157, nameOnlyAnnouncements: $l27.nameOnlyAnnouncements, strippedReferences: $m_vHs($l84) });
  } catch ($l219) {
    $m_l($m_U($l219));
  }
  let $l220 = $m_cZ(() => {
    let $l221 = $l11.resumeIncompleteThinking ? "keep" : $m_uZ?.relayThinkingDisposition({ mainLoop: $m_rs($l11.querySource) === "main" && !$l11.agentId, fetch: $l11.fetchOverride }) ?? "keep";
    return { relayThinking: $l221, relayThinkingPlan: $l221 === "keep" ? void 0 : $m_HJe($l0), builtForRelay: !$l11.resumeIncompleteThinking && ($m_uZ?.isRelayedRequest($l11.fetchOverride) ?? false) };
  }, { relayThinking: "keep", relayThinkingPlan: void 0, builtForRelay: false }), { relayThinking: $l222, relayThinkingPlan: $l223, builtForRelay: $l224 } = $l220, $l225 = { model: $l11.model, bodyModel: $l33, pollEventsAsText: false, accountMemoryWithheld: $m_NKn(), tools: $m_A5($l87), ingestPool: { tools: $l3, ...$m_FTo($l11.querySource) && { ownRequest: { mcpServersPending: $l11.hasPendingMcpServers === true } } }, ...$l69 && { declaredToolNames: $m_$Hs($l128) }, betas: $l28, midConvLatchedOff: $l175, keptReminders: $l184, useToolSearch: $l48, advisorModel: $l204, advisorDeferred: $l203, stripWebSearch: $l27.webSearchHistoryRejected, mediaItemLimit: $m_Gzr($l27, $l33)?.limit, resumeIncompleteThinking: $l50, perTurnEffort: $l198, perTurnNow: $l199, deferredToolReferencePlan: $l84, keepForeignThinking: $m_Bfn(), deferredWireToolNames: $l216, nameOnlyAnnouncements: $l27.nameOnlyAnnouncements, byValueNames: $l58, byValueAnnouncements: $l59, withoutAttachmentHooks: $l11.withoutToolDescribeHooks, reminderFold: $l11.reminderFold, echoWireToolInputs: $l49, thinkingStripPlan: $l223 === void 0 ? $l11.thinkingStripPlan : $m_VJe($l11.thinkingStripPlan, $l223), advisorStripPlan: $l11.advisorStripPlan };
  if ($l16) $m_oR("message_normalization");
  let { messagesPreNormalize: $l226, messagesForAPI: $l227, accountMemoryEpoch: $l228, midConvFallback: $l229, toolChangeFallback: $l230, inlineToolsFallback: $l231, keptForeignSignatures: $l232, blocksEligible: $l233 } = $l13(() => $m_Gmn($l0, $l225));
  if ($l16) $m_sR("message_normalization"), $m_oR("request_build");
  let $l234 = $l227, $l166 = $l228;
  if ($m_Ufr($l0, $l11), $l11.onToolInputCopiesSent && $l225.ingestPool?.ownRequest !== void 0 && $l49) try {
    let $l235 = $m_r4t($l0);
    if ($l235.size > 0) $l11.onToolInputCopiesSent($l235);
  } catch ($l236) {
    $m_l($m_U($l236));
  }
  if ($m_KTo($l27, $l0, $l234, { useToolSearch: $l48, toolSearchAbsent: $l86 === "tool_addition", blocksEligible: $l233, byValueNames: $l58, byValueStaysOut: $l60 }), $l86 !== void 0) $m_kHs($l0, $l27.surfacedOnWire, $l140, $l84, $l11.querySource, $l83);
  let $l164, $l237 = false, $l238 = false, $l239 = false, $l240 = () => {
    if (!$l238 || $l239) return;
    return $l239 = true, $m_en({ type: "advisor_stripped" });
  }, $l241 = false, $l242 = false;
  if ($l222 === "strip_and_mark") if ($l223 !== void 0 && $l223.size > 0) $l237 = true, $l241 = true;
  else $l242 = true;
  let $l243 = $m_wv(), $l244, $l245 = ($l246, $l247, $l248) => {
    if ($l244 !== void 0 && $l244.input === $l246 && $l244.fallbackBeta === $l247 && $l244.marksBeta === $l248) return $l244.output;
    let $l249 = $m_Sgn($l246, $l247), $l250 = false, $l251 = $m_ZTe($l249, $l243, $l50);
    return $l244 = { input: $l246, fallbackBeta: $l247, marksBeta: $l248, output: $l251, markable: $l250 }, $l251;
  }, $l165, $l252 = false, $l253 = ($l254, $l255, $l256 = false) => {
    if ($l252 = true, $l255 === "microcompact") $m_Npe($l27, $l255);
    else $l164 = $l255, $l165 = ($l165 ?? true) && $l256;
    return $m_ZTe($l254, $l243, $l50);
  }, $l257 = $l229, $l258 = $l230, $l259 = $l231, $l260 = false, $l261 = false, $l262 = "idle", $l263 = false, $l264, $l265 = $m_nx($l11.querySource) !== null && $m_Gb() ? $m_tJe($l11.model) : false, $l266 = $m_nx($l11.querySource) !== null && $m_Gb() ? $m_nJe($l11.agentId) : false, $l267 = $m_nx($l11.querySource) !== null && $m_Gb() ? $m_oJe() : false, $l268 = $l11.fallbackCreditCode !== void 0 ? $l11.fallbackCreditMintedStateless === true : false, $l269 = $m_nx($l11.querySource) !== null && $m_Gb() ? $m_ATe($l11.agentId) : false, $l270 = $m_zFn($l11.querySource, $l11.agentId, $l11.model, $l268), $l271 = $l49;
  if ($m_gZ($l234)) {
    let $l272 = $m_sa() ? $m_Vdn({ fromModel: $m_kgn($l234), sticky: $l27, serverDefaultFallbacksEnabled: () => $m_k($m_Kvr, false), selfTargetDefaultFallbacksEnabled: () => $m_k($m_Vvr, false) }) : null, $l273 = $l272 !== null && !$m_Rm($l27, $l272);
    if ($l273) $m_MN($l27, $l272);
    $m_i("tengu_rotunda_pennant_replay", { echo_eligible: $l273, category: $l272 !== null && $l272 === $m_tw });
  }
  $m_i("tengu_api_after_normalize", { postNormalizedMessageCount: $l234.length, apiSystemMessageCount: $m_F($l234, ($l274) => $l274.type === "api_system") });
  let $l275 = $m_RIs($l226), $l276 = $m_n1n({ isNonInteractive: $l11.isNonInteractiveSession, hasAppendSystemPrompt: $l11.hasAppendSystemPrompt, recorded: $l11.recordedCliPrefix }), $l277, $l278 = () => {
    if ($l11.onPromptHeadSent) try {
      $l11.onPromptHeadSent({ cliPrefix: $l276, wireShape: $l13(() => $m_jfn($l27, $l33, { betas: $l28, keptOn: $l184, safeguards: $l277 })) });
    } catch ($l279) {
      $m_l($m_U($l279));
    }
  };
  $l278(), $l1 = $m_PAs($l1, $l276, { fingerprint: $l275, agentContext: $l11.agentContext, previousRequestId: $l19, promptId: $l20, turnOrigin: $l21, turnPosition: $l22 });
  let $l280 = $l11.enablePromptCaching ?? $m_gie($l33), $l281 = $l11.forkPointUuid !== void 0 && $m_uf($l11.agentContext), $l282 = $m_zbe($l11.querySource, { agentCacheTtlOverride: $l11.agentCacheTtlOverride, mainThreadModel: $l189 || $l281 ? $l33 : void 0 }), $l283 = $l282.ttl === "1h" ? "1h" : void 0, $l284 = $m_qfr($l282.ttl) === "1h" ? "1h" : void 0, $l285 = $l284 !== $l283;
  if ($l189) {
    if ($m_$4o($l283 === "1h" ? $m_ZT : $m_SB, $l11.model, $l282.reason === "live_5m_cache"), $l285) $m_Kfr();
  }
  let $l286 = false, $l287 = () => {
    if ($l286) return;
    $l286 = true;
    let $l288 = $l289 || $l12.now();
    if ($l189) $m_G1s($m_wB, { at: $l288, ttl: $m_W4n($l290) ?? $l284 ?? "5m", inputTokens: $l290.input_tokens, cacheReadTokens: $l290.cache_read_input_tokens, cacheCreationTokens: $l290.cache_creation_input_tokens });
    else if ($l281 && $l290.cache_read_input_tokens > 0) $m_fDr($m_wB, $l288);
  }, $l291 = $m_Jfr($l1, $l280, { skipGlobalCacheForSystemPrompt: $l123, cacheTtl: $l283 }), $l292 = $l28.length > 0, $l293 = [...$l11.extraToolSchemas ?? []];
  if ($l204) $l293.push({ type: $m_B4t, name: $m_iIe, model: $l204, ...$l203 && { defer_loading: true } });
  let $l294 = [...$l128, ...$l293], $l295 = $m_jYt($l27, { model: $m_fC($l11.model), tools: $l294, system: $l291, messages: $l234.map(($l296) => ({ role: $l296.message.role, content: $l296.message.content })) }, { querySource: $l11.querySource, retryCause: void 0, promptEpoch: $l11.promptRenderEpoch });
  if ($l295 !== void 0) {
    let $l297 = $m_en({ type: "prefix_delta", text: $l295 });
    yield $l297;
    let $l298 = $l13(() => $m_Gmn([...$l0, $l297], $l225));
    $l234 = $l298.messagesForAPI, $l166 = $l298.accountMemoryEpoch, $m_KTo($l27, $l0, $l234, { useToolSearch: $l48, toolSearchAbsent: $l86 === "tool_addition", blocksEligible: $l298.blocksEligible, byValueNames: $l58, byValueStaysOut: $l60 }), $l257 = $l298.midConvFallback, $l258 = $l298.toolChangeFallback, $l259 = $l298.inlineToolsFallback;
  }
  let $l299 = $m_jo() && $l13(() => $m_Vx()) && $l13(() => $m_sh($l33)) && !!$l11.fastMode && !$m_lun($l11.model), $l300 = $l299 && !$m_AGe(), $l301 = false;
  if ($l26 && $m_Y$o()) {
    if ($m_k($m_Wfr, false)) {
      if ($m_hp()) $m_MN($l27, $m_zB);
      $l301 = $m_AE($l27, $m_zB);
    } else if (!$m_PHe() && !$m_Rm($l27, $m_zB)) try {
      let $l302 = await $l11.getToolPermissionContext();
      $l301 = $l302 !== void 0 && $m_js($l302.mode);
    } catch ($l303) {
      $m_l($m_U($l303));
    }
  }
  let $l304;
  if ($m_ozs()) try {
    $l304 = await $l11.getToolPermissionContext();
  } catch ($l305) {
    $m_l($m_U($l305));
  }
  let $l306;
  if ($l300) $m_MN($l27, $m_Lpn);
  let $l307 = $m_AE($l27, $m_Lpn) && (!$m_gF($l11.querySource) || $l299);
  if ($m_Umn()) $m_MN($l27, $m_H_t);
  let $l308 = () => $m_Umn() && $m_AE($l27, $m_H_t), $l309 = $m_ATt($l27, { isMainLoopRequest: $l189, continuesPrefix: $l11.forkPointUuid !== void 0, cacheTtl: $l280 && !$l285 ? $l282 : void 0 }), $l310 = $m_Ttt(), $l311 = $m_ITt(), $l312 = void 0, $l313 = ($l314, $l315, $l316) => {
    if ($l189) $l312 = $l314, $m_MTt({ conversation: $l27, headerSent: $l309, requestId: $l314, headers: $l315, isWhole: $l316, chainReleaseCount: $l310, accountEpoch: $l317, modelSwitchCount: $l311, now: Date.now(), clientOptions: { model: $l11.model, credentials: $l11.credentials, storageV5: $l11.storageV5 } });
  }, $l318, $l319 = false;
  try {
    let $l320 = !($l34.type === "disabled" && $l34.mechanical === true) && !$m_a.CLAUDE_CODE_SIMULATE_PROXY_USAGE && (!$m_bF() || $m_Eht());
    if ($l320 && $m_Py()) {
      if ($l34.type !== "disabled") {
        if ($l318 = $m_Pfn(), $m_Mfn($l318)) $m_MN($l27, $m_NW);
      }
      $l319 = $m_AE($l27, $m_NW);
    } else if ($l320 && !$m_VB()) {
      let $l321 = $m_Sd($l11.model);
      if (($l321 === "bedrock" || $l321 === "mantle" || $l321 === "vertex") && $m_gB($l321) && $l13(() => $m_Rqs($l321, $l11.model))) {
        if ($l34.type !== "disabled") $m_MN($l27, $m_NW);
        $l319 = $m_AE($l27, $m_NW);
      }
    }
  } catch ($l322) {
    $m_l($l322), $l318 = void 0, $l319 = false;
  }
  if (!$l319 && !$m_I4()) $l28 = $l28.filter(($l323) => $l323 !== $m_NW);
  if ($l11.evictCacheOnComplete && $l11.stickyBetas !== void 0 && $m_Afr()) $m_MN($l27, $m_d7e);
  let $l324 = require("./chunk-fzsv82pr.js").createContextHintController({ querySource: $l11.querySource, agentId: $l11.agentId, includeFirstPartyBetas: $m_Py(), is529Error: $m_GW, storageV5: $l11.storageV5 }), $l325 = void 0, $l326 = null, $l327 = void 0, $l328 = () => $m_Wjs({ sent: $l325, turnEffort: $l11.turnEffort, hookEffortValue: $l11.hookEffortValue }), $l329, $l330, $l331, $l332 = () => $l331 ??= $m_j1s($l234), $l333 = () => {
    let $l334 = $m_z2();
    return $m_TVe($l334, $l11.model, $m_Sd($l11.model)), $l334;
  }, $l335 = $l329 ??= $l294.filter(($l336) => !("defer_loading" in $l336 && $l336.defer_loading));
  $l330 ??= $m_mN($l28), $m_e1s({ system: $l291, toolSchemas: $l329, anyDeferLoading: $l329.length !== $l294.length, querySource: $l11.querySource, model: $l11.model, agentId: $l11.agentId, fastMode: $l307, globalCacheStrategy: $l125, betas: $l309 ? [...$l330, $m_ZI.header] : $l330, autoModeActive: $l301, isUsingOverage: $m_Ki().isUsingOverage ?? false, is1hCacheTTL: $l284 === "1h", queryDepth: $l11.queryTracking?.depth, cacheDiagnosis: $l308(), effortValue: $l186, thinkingConfig: $l34, extraBodyParams: $l333(), getMessageHashes: $l332, messages: $l234, baselineAgentId: $l11.querySource === "agent_summary" && $m_sE($l11.agentContext) ? $l11.agentContext.agentId : void 0 });
  let $l337 = $l234, $l338 = null, $l339 = () => $m_w7() === "thirdParty" && $l340.includes($m_dA.header), $l341 = () => $l319 && !$m_I4() && $l340.includes($m_NW.header), $l342 = [], $l343 = false, $l344 = ($l345) => {
    if (!$m_AE($l27, $m_dA)) return;
    let $l346 = $l339(), $l347 = $l346 && $l345 instanceof $m_Ot && $l345.status === 400 && $l345.message.includes($m_dA.header), $l348 = $l346 && !$l341() && $m_UH($l345), $l349 = $l346 ? $m_x6n($l345) ?? [] : [], $l350 = $l349.some(($l351) => $l351.includes("dangerous_tool_use") || $l351.includes("safeguard"));
    if (!$l347 && !$l348 && !$l350 && !$m_IVe($l345)) return;
    if ($m_Dg($l27, $m_dA), $l348 && !$l347 && !$l350 && !$m_IVe($l345)) $l342.push($m_dA), $l343 = !$m_Fre();
    if ($l346) {
      if ($m_abn(), $l350) $m_R6n($l11.model, $l349);
    }
    return $m_t($l346 ? "[server-classifier] the platform rejected a beta on this request (HTTP 400), most likely dangerous-tool-use, which this deployment does not know yet; it is not sent again this session and auto mode decides with the local classifier" : "[server-classifier] the server rejected the dangerous-tool-use beta header or the safeguards field (HTTP 400); neither is sent again this conversation, so every auto-mode tool use is denied as classifier-unavailable until the conversation's betas reset (/clear or /compact)", { level: "warn" }), $m_i("tengu_server_classifier_beta_rejected_retry", { provider: $m_gA(), unnamed: $l348, foundryFeature: $l350, unclaimed: false }), "retry:safeguards";
  }, $l352 = ($l353) => $m_hJe($l353, $l11.model) && (!!$l11.modelIsRefusalFallbackTarget || $m_U$r($l11.model)), $l354 = ($l355) => $m_gJe($l355) || $l352($l355), $l356 = ($l357) => {
    let $l358 = $m_OVe($l357);
    return $l48 && $m_zOe() && $l359 === void 0 && $l357 instanceof $m_Ot && ($l357.status === 400 || $l357.status === 422) && $l357.type !== "billing_error" && !$l11.resumeIncompleteThinking && !$l354($l358) && !$l360($l358);
  }, $l361 = ($l362) => {
    if ($l356($l362)) {
      $m_t(`[ToolSearch] HTTP ${$l362.status} that no other recovery took, for a request that used tool search (${$m_f1t.header}); making the call again without it${$l342.length > 0 ? `. Dropped first and now allowed again: ${$m_mN($l342).join(", ")}` : ""}`, { level: "warn" });
      for (let $l363 of $l342) $m_uer($l27, $l363);
      if ($l343) $m_$5o();
      throw new $m_mZ("tool search refused", { cause: $l362 });
    }
    return;
  }, $l364 = ($l365) => {
    let $l366 = $l367($l365, true);
    if ($l366 !== null) return $l366;
    if (!($l365 instanceof $m_Ot) || $l365.status !== 400 && $l365.status !== 422) return;
    let $l368 = $m_OVe($l365);
    if ($l354($l368) || $l360($l368)) return;
    if ($l365.status === 422 || !$m_AE($l27, $m_dA) || !$l339()) {
      if ($m_I4() || $l27.systemMessagesAcceptedBy.has($l33)) return;
      let $l369 = $l370($l365, true);
      if ($l369 !== void 0) $l371 = "retrying";
      return $l369;
    }
    return $m_Dg($l27, $m_dA), $l342.push($m_dA), $m_t("[server-classifier] an unrecognised HTTP 400 arrived while the dangerous-tool-use beta was on the request; retrying once without it, and auto mode decides with the local classifier for the rest of this conversation", { level: "warn" }), $m_i("tengu_server_classifier_beta_rejected_retry", { provider: $m_gA(), unnamed: false, foundryFeature: false, unclaimed: true }), "retry:safeguards-unclaimed";
  }, $l372 = ($l373) => {
    try {
      if (!($l373 instanceof $m_Ot) || $l373.status !== 400 && $l373.status !== 422) return;
      if ($l374 === "retrying") {
        $l374 = "spent";
        let $l375 = $l364($l373);
        if ($l375 === void 0 && !$l354($l373) && !$l356($l373)) $m_jun();
        return $l375;
      }
      if ($l374 !== "idle" || !$l340.includes($m_yne.header) || $l373.type === "billing_error" || $l354($l373) || $l360($l373) || !$m_Uun() || $m_Pe() === "firstParty" && $m_a.ANTHROPIC_UNIX_SOCKET === void 0 && $m_Op() && !$m_bF()) return;
      return $l28 = $l28.filter(($l376) => $l376 !== $m_yne), $l374 = "retrying", "retry:thinking-display-updates-unclaimed";
    } catch ($l377) {
      $m_l($l377);
      return;
    }
  }, $l378 = () => {
    if ($l371 === "retrying") $l371 = "spent";
    else if (!$m_I4() && $l163.some(($l379) => $l379.role === "system")) $l27.systemMessagesAcceptedBy.add($l33), $l278();
  }, $l380 = () => {
    if ($l371 === "retrying") $m_uer($l27, $m_eP), $l278(), $m_t("[mid-conv-system] the resend without system messages was not answered either, so the guess that the platform refuses them is dropped; the next request of this conversation sends them again", { level: "warn" });
  }, $l381 = () => {
    if ($l374 !== "retrying") return;
    $l374 = "spent";
    try {
      $m_Dg($l27, $m_yne), $m_t("[thinking] a request was refused with thinking.display 'updates' and went through without it; it is not sent again in this conversation.", { level: "warn" }), $m_i("tengu_beta_400_healed", { beta: $m_tde([$m_yne.header]), model: $m_Et($l11.model), provider: $m_gA(), unclaimed: true });
    } catch ($l382) {
      $m_l($l382);
    }
  }, $l383 = ($l384) => {
    return;
  }, $l385 = ($l386) => {
    {
      let $l387 = $l386 instanceof $m_Ot && $l386.status === 400;
      if ($l388 === "retrying") {
        if ($l387) {
          if ($l388 = "spent", !$l354($l386) && !($l389 === "idle" && $l390($l386))) $m_kpn();
        }
        return;
      }
      if ($l388 === "idle" && $l391 && $l28.includes($m_B2) && $l387 && $l386.type !== "billing_error" && !$l354($l386) && !$l360($l386) && $m__pn()) return $l388 = "retrying", $l392 = $l386.requestID ?? void 0, $l28 = $l28.filter(($l393) => $l393 !== $m_B2), $l338?.forceCreate("clear_at_header_retired"), "retry:kept-reminder-unrecognised-400";
    }
    return;
  }, $l390 = ($l394) => {
    try {
      return $m_$W !== null && $m_Pe() === "firstParty" && $l340.includes($m_$W.header) && $l394 instanceof $m_Ot && $l394.status === 400 && $l394.type !== "billing_error" && $m_jpe($l394) === "client_error" && !$l11.resumeIncompleteThinking && !($l395 && !$l396) && $m_cmn($l394) === void 0 && !$l354($l394) && !$l360($l394) && $m_MTe($l394) === null && $m_jVe($l394) === void 0 && $m_UVe($l394) === void 0 && $m_Spn();
    } catch ($l397) {
      return $m_l($l397), false;
    }
  }, $l398 = ($l399) => {
    try {
      if ($l389 === "retrying" && $l399 instanceof $m_Ot && $l399.status === 400) {
        if ($l389 = "spent", !$l354($l399)) $m_bpn();
        $m_i("tengu_tether_unrecognised_400", { phase: $m_b("refused"), planner_backed: $l400, query_source: $m_os($l11.querySource) });
      }
    } catch ($l401) {
      $m_l($l401);
    }
  }, $l402 = ($l403) => {
    try {
      if ($l398($l403), $l389 === "idle" && $l390($l403)) {
        let $l404 = $l338 !== null, $l405 = $l338?.dropForUnrecognised400();
        return $m_i("tengu_tether_unrecognised_400", { phase: $m_b("start"), planner_backed: $l404, dropped_thread: $l405 !== void 0, query_source: $m_os($l11.querySource) }), $l389 = "retrying", $l406 = $l403.requestID ?? void 0, $l400 = $l404, $l405 ?? "retry:tether-unrecognised-400";
      }
    } catch ($l407) {
      $m_l($l407);
    }
    return;
  }, $l408 = false, $l409 = ($l410) => {
    if ($l410 instanceof $m_Ot && $l410.status !== void 0) $l408 = true;
    if ($l398($l410), $l28.includes($m_B2) && $m_E6t($l410)) return $l28 = $l28.filter(($l411) => $l411 !== $m_B2), $m_Dg($l27, $m_B2), $m_ZQe(), $l278(), $l338?.forceCreate("clear_at_header_retired"), $m_f("api_kept_reminder_clear_at", "server_rejected"), $m_t("[reminders] the server rejected the clear_at beta header or field (HTTP 400); retrying without them. For the rest of this session earlier reminders are not re-sent, and requests that can use a Message Threads thread get no reminder.", { level: "warn" }), "retry:kept-reminder-clear-at";
    if ($m_$W !== null && $m_ike($l410) && !$m_Rm($l27, $m_$W)) return $m_Dg($l27, $m_$W), $m_JQe(), $m_t("[tether] server rejected the message-threads beta header \u2014 dropping it and threading for this session", { level: "warn" }), $l338?.resolveRetry($l410) ?? "retry:tether-header";
    return $l338?.resolveRetry($l410);
  }, $l412 = $m_E1s($l0, $l11.querySource, $l11.model, $l11.agentId, ($l413) => $m_xn($l225.tools, $l413)?.name, $l11.forkPointUuid), $l414 = false, $l163 = [], $l415 = [], $l416 = ($l417) => {
    if ($l415.length === 0) return $l417;
    for (let $l418 = $l415.length - 2; $l418 >= 0; $l418--) if ($l415[$l418] === $l417) return $l418;
    return;
  }, $l171 = void 0, $l168 = void 0, $l172 = false, $l419 = false, $l162 = () => ({ messages: $l163, system: $l171, tools: $l168 });
  {
    let $l420 = $m_nx($l11.querySource);
    if ($l420 !== null && $m_Gb()) {
      $l329 ??= $l294.filter(($l421) => !("defer_loading" in $l421 && $l421.defer_loading)), $l330 ??= $m_mN($l28);
      let $l422 = $m_xQe($l0), $l423 = $m_AE($l27, $m_dA) || $l11.serverClassifier === true && $l11.autoModeServerContext !== void 0 && $m_zhe() && !$m_Rm($l27, $m_dA) && !$m_Fre(), $l424 = $m_Ppn({ querySource: $l11.querySource, agentId: $l11.agentId, model: $l11.model, modelHeldStateless: $l265, relayHeldStateless: $l266, classifierHeldStateless: $l267, creditRetryStateless: $l268, dropHeldStateless: $l269, system: $l291, toolSchemas: $l329, betas: $l330, latchedHeaders: { fastMode: $l307, autoMode: $l301, cacheTtl1h: $l283 === "1h", evictOnComplete: $m_AE($l27, $m_d7e), cacheDiagnosis: $l308(), cacheKeepalive: $l309, dangerousToolUse: $l423 }, thinkingConfig: $l34, toolChoice: $l11.toolChoice, effortValue: $l186, extraBodyParams: $l333(), getMessageHashes: $l332, previousMessageId: $l422 });
      if ($m_ITe($l420, $l11.agentId)) {
        let $l425 = $m_Fpn($l0, $l234);
        if ($l338 = $m_Rpn({ engine: $l424, previousMessageId: $l422, anchorRewritten: $l425 !== null && $m_Ipn($l425, $l422), messages: $l234, agentId: $l11.agentId, model: $l11.model, modelHeldStateless: $l265, relayHeldStateless: $l266, classifierHeldStateless: $l267, creditRetryStateless: $l268, dropHeldStateless: $l269, toolResultClearingHeldStateless: $l412 !== void 0, clock: $l12 }), $l425 !== null) $m_Hpn($l425, { sourceCategory: $l420, messageCount: $l234.length, anchorMessageId: $l422 });
      }
    }
  }
  let $l426 = $m_Mx() ? { systemPrompt: $l1.join(`

`), userSystemPrompt: $l11.userSystemPrompt, querySource: $l11.querySource, tools: $m__($l294) } : void 0, $l427, $l428 = () => $l427 ??= $m_xfr($l0, $l3), $l429 = $m_sPr($l11.model, $l11.agentContext, $l426, $l234, $l300, $l11.querySource, $l428), $l430 = $l12.monotonicNow(), $l431 = $l12.monotonicNow(), $l432 = 0, $l433 = [], $l434 = void 0, $l435 = void 0, $l436 = false, $l437, $l438 = ($l439) => {
    if ($l439 !== void 0 && $m_w7() === "thirdParty" && $m_Hqe($l439) && !$m_Fre()) $m_abn(), $m_t(`[server-classifier] the platform gave no classification for this request (${$l439.why}); treating that as this deployment's answer: auto mode classifies locally for the rest of this session and stops sending the classifier context`);
  }, $l440 = ($l441, $l442, $l443) => {
    let $l444 = $l443.flatMap(($l445) => $l445.type === "tool_use" && typeof $l445.id === "string" ? [$l445.id] : []);
    $l438($m_$qe($l441, $l442, $l444));
  }, $l446 = false, $l447 = false, $l391 = false, $l388 = "idle", $l392, $l389 = "idle", $l406, $l400 = false, $l374 = "idle", $l371 = "idle", $l448 = "idle", $l449 = () => $l448 !== "idle" && $l448 !== "spent", $l450 = false, $l451 = void 0, $l452 = void 0, $l453, $l454 = ($l455, $l456) => {
    $l158($l455);
    let $l457 = $m_Bmn($l455, $l162());
    $m__qo($l457, $l11.querySource, $m_uf($l11.agentContext)), $l452 = $m_Fcn({ ...$l455, stream: $l456 }, $l11.querySource, $l428, $l457.messages), $l453 = $m_Kvt({ params: $l457, querySource: $l11.querySource, agentId: $l11.agentId, storageV5: $l11.storageV5, conversation: $l0, stickyBetas: $l27, readInjectedBody: () => $m_z2() });
  }, $l458 = void 0, $l459 = void 0, $l460, $l461 = false, $l462 = $m_ILr(), $l463 = void 0, $l464, $l317 = $m_Yg(), $l465 = ($l466, $l467) => {
    let $l468 = $m_Hmn($l11);
    return $m_Ken($l466, $l468, $l12.now(), $l317, $l11.storageV5), $m_ZAs({ route: $l468, querySource: $l11.querySource, model: $l11.model, rateLimitType: $m_ZMt($l466).rateLimitType, retryAtMs: $l467.retryAtMs, attempt: $l467.attempt, maxRetries: $l467.maxRetries });
  }, $l469 = null;
  function $l470() {
    if ($l469 !== null) $l469(), $l469 = null;
  }
  function $l471() {
    if ($l470(), $m_Vfr($l434), $l434 = void 0, $l459) $l459.body?.cancel().catch(() => {
    }), $l459 = void 0;
  }
  let $l340 = [], $l472 = void 0, $l473 = void 0, $l474 = false, $l475, $l476 = "disabled", $l477 = false, $l478 = false, $l160 = false, $l479 = false, $l480 = "none", $l481 = false, $l482 = false;
  if ($l11.fallbackCreditCode !== void 0 && (!$l31 || $l215 !== void 0)) $m_i("tengu_fallback_credit_skipped", { reason: $l31 ? $m_b("tool_changes_dropped") : $m_b("backend_unknown_or_mismatch"), ...$l215 && { ...$l215, late_tools_inlined: $l206 }, mint_request_id: $m_ye($l11.fallbackCreditMintRequestId), mint_model: $m_Et($l11.fallbackCreditMintModel), model: $m_Et($l11.model), query_source: $m_os($l11.querySource) });
  let $l483 = $l31 && $l215 === void 0 ? $l11.fallbackCreditCode : void 0, $l484 = ($l485) => ($l11.fallbackCreditCode ? $l485.split($l11.fallbackCreditCode).join("[FCT_REDACTED]") : $l485).slice(0, 600), $l395 = false, $l486 = false, $l396 = false, $l487 = false, $l488 = false, $l489 = false, $l490 = false, $l491 = ($l492, $l493, $l494) => {
    if (!$l395 || $l489) return;
    $l489 = true;
    let $l495 = $l325;
    $m_i("tengu_fallback_credit_outcome", { outcome: $m_c($l492), mint_request_id: $m_ye($l11.fallbackCreditMintRequestId), mint_model: $m_Et($l11.fallbackCreditMintModel), request_id: $m_ye($l493), client_request_id: $m_ye($l458), model: $m_Et($l11.model), query_source: $m_os($l11.querySource), carried_effort_level: $m_de($l187?.level), carried_effort_outcome: $m_de($l187?.outcome), effort_level: $m_de($l495), ...$l494 !== null && { input_tokens: $l494.input_tokens, output_tokens: $l494.output_tokens, cache_read_input_tokens: $l494.cache_read_input_tokens, cache_creation_input_tokens: $l494.cache_creation_input_tokens, cache_creation_5m_input_tokens: $l494.cache_creation?.ephemeral_5m_input_tokens ?? 0, cache_creation_1h_input_tokens: $l494.cache_creation?.ephemeral_1h_input_tokens ?? 0, service_tier: $m_de($l494.service_tier), speed: $m_de($l494.speed) } });
  }, $l496 = false, $l497 = false, $l498 = false, $l499 = ($l500, $l501 = true) => $l13(() => $l502($l500, $l501)), $l502 = ($l503, $l504) => {
    if ($l234 !== $l337) $l337 = $l234, $l331 = void 0, $m_t1s({ querySource: $l11.querySource, agentId: $l11.agentId, getMessageHashes: $l332, messages: $l234 });
    let $l505 = $l28.filter(($l506) => $l506 !== $m_vv || !$l449());
    if (!$l505.includes($m_vv) && !$l449() && $m_Cun($l503.model) !== null) $l505.push($m_vv);
    let $l507 = $m_Sd($l503.model), $l508 = $l507 === "bedrock" && $m_zB && $l301 && $l26 && $m__8n();
    if ($l508) $m_t(`auto-mode 3P: sending afk-mode beta '${$m_zB?.header}' to bedrock via body.anthropic_beta`);
    let $l509 = $l507 === "bedrock" ? [...$m_Iqs($l503.model).filter(($l510) => $l510 !== $m_vv || !$l449()), ...$l104 ? [$l104] : [], ...$l508 && $m_zB ? [$m_zB] : []] : [], $l511 = $m_z2($l509);
    $m_XTe($l511, $m_JJ, $l507 === "bedrock" && $l505.includes($m_JJ));
    let $l512 = { ...$l511.output_config ?? {} };
    delete $l511.output_config, $m_BJe($l186, $l512, $l511, $l505, $l25), $l477 = $m_TVe($l511, $l503.model, $l507), $m_hfr($l11.taskBudget, $l512, $l505), $l478 = $m_yfr($l11.outputFormat, $l512, $l505, $l11.model);
    let $l513 = $l11.refusalFallbackSilentArmActive === true, $l514 = $m_Udn($l11.serverRefusalFallback, $l503.model, $l505, $l27, $l513, $l270);
    $m_Wdn($l11.fallbackCreditLaneArmed === true || $l11.fallbackCreditCode !== void 0, $l505, $l27, $l513, $l507 === "bedrock" ? $l511 : void 0), $l488 = $l505.includes($m_LW);
    let $l515 = $m_xqs($l507, $l25), $l516 = $l11.serverClassifier === true && $l11.autoModeServerContext !== void 0 ? $m_Gcn({ autoModeServerContext: $l11.autoModeServerContext, priorTurnContext: $m_Dbt($l0), systemReminders: $m_Lbt($l0, $l234) }) : void 0, $l517 = $l11.serverClassifier === true && $l516 !== void 0 && $l515 && $m_zhe() && !$m_Rm($l27, $m_dA) && !$m_Fre();
    if ($l517) $m_MN($l27, $m_dA);
    if ($l515 && $m_AE($l27, $m_dA) && !$l505.includes($m_dA)) $l505.push($m_dA);
    $m_XTe($l511, $m_dA, $l507 === "bedrock" && $l505.includes($m_dA));
    let $l518 = Math.min($l503?.maxTokensOverride || $l11.maxOutputTokensOverride || $l30.maxOutputTokens, $l30.maxOutputTokens), $l519 = $m_a.CLAUDE_CODE_DISABLE_THINKING, $l520 = $l34.type !== "disabled" && !$l519, $l521 = () => $l30.thinking.rejectsDisabled || $l32 !== void 0 && $m_tHe($l32), $l522 = !($l520 && $m_rEr($l25)) ? void 0 : $l34.display === "highlights" && $m_lbn() ? "omitted" : $l34.display, $l523 = void 0;
    if ($l520 && $l30.thinking.supported) if ($m_AQe({ runtimeOverride: $m_IKe($l11.model), resolvedModel: $l25, canonicalModel: $l29 }) === "adaptive") $l523 = { type: "adaptive", display: $l522 };
    else {
      let $l524 = $m_Sqs($l25);
      if ($l34.type === "enabled" && $l34.budgetTokens !== void 0) $l524 = $l34.budgetTokens;
      $l524 = Math.max(1024, Math.min($l518 - 1, $l524)), $l523 = { budget_tokens: $l524, type: "enabled", display: $l522 };
    }
    else if ($l34.type === "disabled" && $m_Pe() === "firstParty" && !$l519 && $l30.thinking.supported && !$l521()) $l523 = { type: "disabled" };
    let $l525;
    if ($l319) {
      if (!$l505.includes($m_NW)) $l505.push($m_NW);
      if ($m_XTe($l511, $m_NW, $l507 === "bedrock"), $l318 !== void 0 && ($l523?.type === "adaptive" || $l523?.type === "enabled") && !("thinking" in $l511)) $l523 = { ...$l523, block_binding: { prefix_mismatch_behavior: $l318 } }, $l525 = $l318;
    }
    let $l526 = $l34.type === "disabled" ? void 0 : $l34, $l527 = $l526?.display, $l528 = "none";
    try {
      $l528 = $m_Hun($l527, $l526?.displayExplicit ?? $m_Ptt());
    } catch ($l529) {
      $m_l($l529);
    }
    let $l530 = () => {
      let $l531 = $l505.indexOf($m_Npn);
      if ($l531 !== -1) $l505.splice($l531, 1);
    };
    if ($l523 && $l522) $l530();
    switch ($l528) {
      case "thinking_and_connector_text":
      case "none":
        break;
      case "connector_text": {
        if (($l523?.type === "adaptive" || $l523?.type === "enabled") && $m_Y7e($l25) && !("thinking" in $l511) && !$m_Rm($l27, $m_yne) && $l374 === "idle" && !$m_a.CLAUDE_CODE_SIMULATE_PROXY_USAGE) {
          if ($l523 = { ...$l523, display: "updates" }, !$l505.includes($m_yne)) $l505.push($m_yne);
          $m_XTe($l511, $m_yne, $l507 === "bedrock"), $l530();
        }
        break;
      }
    }
    if ($m_MQe($l25) && !$l505.includes($m_c7e)) $l505.push($m_c7e);
    let $l532 = $l523?.type === "enabled" || $l523?.type === "adaptive" || $l523 === void 0 && $l521(), $l533 = $l11.toolChoice;
    if ($l533?.type === "tool" && $l532) $m_t(`tool_choice {type:'tool', name:'${$l533.name}'} demoted to auto: extended thinking is active`), $l533 = { type: "auto" };
    let $l534 = $l34.type === "disabled" && $l34.mechanical === true;
    if ($l523?.type === "disabled" && ($l534 || $l30.thinking.capsEffortWhenDisabled) && typeof $l512.effort === "string" && $m_WDr($l512.effort)) {
      if (!$l498) $l498 = true, $m_t(`output_config.effort '${$l512.effort}' clamped to '${$m_Fgt}': thinking is ${$l534 ? "mechanically " : ""}disabled for this request, and this model rejects higher effort when thinking is disabled`);
      if (!$l534 && $m_rs($l11.querySource) === "main" && $m_qs().once("effort_thinking_disabled_clamp")) $m_i("tengu_effort_clamped_thinking_disabled", { from: $m_c($l512.effort), to: $m_c($m_Fgt), query_source: $m_os($l11.querySource) });
      $l512.effort = $m_Fgt;
    }
    let $l535 = $m_d4t({ hasThinking: $l520, toolClearing: $l412?.edit }), $l536 = $l11.enablePromptCaching ?? $m_gie($l32 ?? $l503.model), $l537;
    if ($m_jo() && $l13(() => $m_Vx()) && !$m_AGe() && $l13(() => $m_sh($l33)) && !!$l503.fastMode && !$m_lun($l503.model)) $l537 = "fast";
    if ($l307 && !$l505.includes($m_Lpn)) $l505.push($m_Lpn);
    if ($m_zB && $l301 && $m_Y$o() && $l26 && !$l505.includes($m_zB)) {
      if ($l505.push($m_zB), $m__8n()) $m_t(`auto-mode 3P: sending afk-mode beta '${$m_zB.header}' to ${$l507} via betas header`);
    }
    if ($l283 === "1h" && $m_Py() && !$l505.includes($m_g1t)) $l505.push($m_g1t);
    let $l538 = null, $l539 = $l324?.buildRequestParams($l234);
    if ($l539) $l505.push($l539.beta), $l538 = $l539.body;
    let $l540 = null;
    if ($m_AE($l27, $m_d7e) && $l536) {
      if (!$l505.includes($m_d7e)) $l505.push($m_d7e);
      $l540 = { cache_control: { type: "ephemeral", ...$l284 && { ttl: $l284 }, evict_on_complete: true } };
    }
    if ($l308() && !$l505.includes($m_H_t)) $l505.push($m_H_t);
    if ($l309 && !$l505.includes($m_ZI)) $l505.push($m_ZI);
    let $l541 = $m_a.CLAUDE_CODE_SIMULATE_PROXY_USAGE, $l542 = $l184 && $l292 && !$l541 && $m_vFr($l505).includes($m_B2), $l543 = $l338 !== null && !$l541 ? $l338.plan($l234, $l542) : null, $l544 = $m_$W !== null && ($m_Rm($l27, $m_$W) || $l389 !== "idle"), $l545 = $l544 ? null : $l543;
    if ($m_$W !== null) {
      if ($l545 !== null) $m_MN($l27, $m_$W);
      if ($l544) {
        for (let $l546 = $l505.length - 1; $l546 >= 0; $l546--) if ($l505[$l546] === $m_$W) $l505.splice($l546, 1);
      } else if (($l545 !== null || $m_AE($l27, $m_$W)) && !$l505.includes($m_$W)) $l505.push($m_$W);
    }
    let $l547 = $l541 ? $l505.filter(($l548) => $l548 === $m_gTe) : $l505;
    if ($l541) $m_t(`[API:client] SIMULATE_PROXY_USAGE: stripping ${$l505.length - $l547.length} beta headers from request (keeping ${$m_mN($l547).join(", ") || "none"}): ${$m_mN($l505).join(", ")}`);
    let $l549 = !$l520 && $l30.acceptsTemperature ? $l11.temperatureOverride ?? 1 : void 0;
    $l340 = $m_mN($l547), $l450 = $l547.includes($m_vv) || $l509.includes($m_vv), $l472 = $l523 !== void 0 && "display" in $l523 ? $l523.display ?? void 0 : void 0, $l474 = $l523 !== void 0 && "block_binding" in $l523, $l475 = $l525;
    let $l550 = $m_vFr($l547), $l551 = $l292 && (!$l541 || $l547.length > 0) && $m_mN($l550).length > 0;
    $l447 = $l542, $l391 = false;
    let $l552 = $l551 && ($l550.includes($m_KB) || $m_tw !== null && $l550.includes($m_tw));
    $l481 = $l552 && $m_gZ($l234);
    let $l553 = $l551 && ($l514.fallbacks === "default" ? $m_tw !== null && $l550.includes($m_tw) : $l550.includes($m_KB)) ? $l514 : {};
    if ($l479 = $l553.fallbacks !== void 0, $l480 = $l553.fallbacks === "default" ? "default" : $l479 ? "explicit" : "none", !$l552 && $m_gZ($l234)) $l164 = "error_recovery", $l165 = false;
    let $l554 = false;
    $l446 = $l554;
    let $l555 = [];
    $l264 = void 0;
    let $l556 = $l536 && !$l11.skipMessageCacheMarkers, $l557 = !$l541 && $l540 !== null || $l511.cache_control != null, $l558 = $l245($l234, $l552, $l554), $l559 = $l504 && $l262 === "idle" ? $m_tfn({ querySource: $l11.querySource, model: $l32 ?? $l503.model, isKeepaliveHeaderOnWire: $l551 && $l550.includes($m_ZI), hasSecondMarkerSlot: $l556 && !$l557 && $l11.divergesAtMessageId === void 0, messages: $l558 }) : void 0, $l560 = $l163 = $m_Xfr($l558, $l556, $l284, $l11.skipCacheWrite, $l11.forkPointUuid, $m_Rm($l27, $m_M9n) || $m_L5o(), $l507, $l545 !== null, $l557, $l542, $l555, $l11.divergesAtMessageId, { skipMessageCacheMarkers: $l11.skipMessageCacheMarkers === true, report: ($l561) => {
      $l264 = $l561;
    } }, $m_Kcn($l11.querySource, $l11.skipCacheWrite === true), $l504, $l559);
    $l415 = $l555.some(($l562, $l563) => $l562 !== $l563) ? $l555 : [];
    let $l564 = ($l565) => Array.isArray($l565.content) && $l565.content.some(($l566) => typeof $l566 === "object" && $l566 !== null && "cache_control" in $l566 && $l566.cache_control != null);
    $l260 = $l560.some(($l567) => $l567.role === "system" && $l564($l567)), $l263 = $l560.some($l564);
    let $l568 = $l559?.isMarkWanted === true ? $l560.findLastIndex($l564) : -1;
    if ($l261 = $l568 > 0 && $l560.some(($l569, $l570) => {
      let $l571 = $l569.role;
      return $l570 < $l568 && $l571 === "system" && $l564($l569);
    }), $l436 = $l517 && $l292 && !$l541 && $m_vFr($l547).includes($m_dA), $l504) {
      if ($l437 !== void 0) $m_Bqe($l437);
      if ($l437 = $l436 ? $m_Fqe($m_pZ(), { artifacts: $l516?.artifacts, thread: $l545 !== null, agentId: $l11.agentId }) : void 0, $l437 !== void 0 && $l516 !== void 0) $m_xbt($l437.key, $m_Wcn($l516));
    }
    let $l572 = $m_tzs($l294, $l11.model);
    $l572 = $m_YYt($l572, $l27);
    let $l573 = $l338 !== null ? $l338.shapeInheritedFields($l545, { system: $l291, tools: $l572 }) : { system: $l291, tools: $l572 };
    $l171 = $l291, $l168 = $l572, $l172 = $l573.system !== $l291, $l419 = $l545 !== null;
    let $l574 = { model: $m_fC($l11.model), messages: $l545 !== null && $l545.sliceFrom > 0 ? $l560.slice($l555[$l545.sliceFrom]) : $l560, system: $l573.system, ...$l573.tools !== void 0 && { tools: $l573.tools }, tool_choice: $l533, ...$l551 && $m_CHe($l550), metadata: $m_yBe({ agentContext: $l11.agentContext }), max_tokens: $l518, thinking: $l523, ...$l549 !== void 0 && { temperature: $l549 }, ...$l535 && $l292 && $l505.includes($m_dde) && { context_management: $l535 }, ...$l436 && $l516 !== void 0 && { safeguards: [{ type: $m_$he, classifier_context: $l516 }] }, ...!$l541 && $l538 ? $l538 : {}, ...!$l541 && $l540 ? $l540 : {}, ...$l553, ...$l511, ...{}, ...Object.keys($l512).length > 0 && { output_config: $l512 }, ...$l537 !== void 0 && { speed: $l537 }, ...$l545 !== null && { thread: $l545.thread }, ...$l308() && ($l26 || $l11.forkPointUuid !== void 0) && $l292 && !$l541 && { diagnostics: { previous_message_id: $l24 ?? null } } };
    $l414 = $l412 !== void 0 && $l574.context_management === $l535, $l391 = $l542 && $l574.messages.some(($l575) => $l575.clear_at !== void 0);
    let $l576 = $m_gfr($l574.thinking, $l11.querySource, !$l496);
    if ($l576 !== $l574.thinking) $l496 = true, $l574.thinking = $l576;
    {
      let $l577 = $l574.thinking;
      $l476 = $l577?.type === "adaptive" || $l577?.type === "enabled" ? $l577.type : "disabled", $l473 = $m_Nfn($l577);
    }
    if ($l504 && $m_eer($l574)) {
      try {
        $l574 = $m_qd($l574);
      } catch {
      }
      if ($m_pKe($l574), !$l497) $l497 = true, $m_i("tengu_lone_surrogate_sanitized", { source: $m_b("queryModel") });
    }
    let $l578 = $l574.output_config?.effort;
    $l325 = typeof $l578 === "string" && $m_VS($l578) ? $l578 : void 0, $l326 = null, $l327 = void 0;
    for (let $l579 of $l234) if ($l579.type === "user") $l327 = void 0;
    else if ($l579.type === "api_system" && $l579.outputConfig !== void 0) $l326 = $l579.outputConfig.effort ?? $l326, $l327 = $l579.outputConfig.timing?.now;
    return $l574;
  };
  {
    let $l580 = $l499({ model: $l11.model }, false), $l581 = $l234.length, $l582 = $l292 ? $l580.betas ?? [] : [], $l583 = $l580.thinking?.type ?? "disabled", $l584 = $l475, $l585 = $l188;
    $l11.getToolPermissionContext().then(($l586) => {
      $m_mfn({ model: $l11.model, messagesLength: $l581, temperature: $l11.temperatureOverride ?? 1, betas: $l582, permissionMode: $l586.mode, proactivityLevel: $l11.proactivityLevel, querySource: $l11.querySource, messageClientPlatform: $l11.messageClientPlatform, queryTracking: $l11.queryTracking, thinkingType: $l583, thinkingPrefixMismatchBehavior: $l584, effortValue: $l585, fastMode: $l300, previousRequestId: $l19 });
    });
  }
  let $l587 = [], $l588 = 0, $l589, $l590 = 0, $l591 = 0, $l592 = 0, $l593 = false, $l594, $l289 = 0, $l359 = void 0, $l595 = [], $l290 = $m_em, $l596 = null, $l597 = 0, $l598 = null, $l599 = false, $l600 = "none";
  function $l601() {
    if ($l600 === "credited") return;
    $l600 = "credited", $l597 += $m_i3e($m_Hke($l25, $l290), $l290, $l11.model, $l11.querySource, $l188, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool);
  }
  let $l602 = false, $l603 = false, $l604, $l605 = 0, $l606 = void 0, $l607 = void 0, $l608, $l609 = $l300, $l610 = false, $l611 = $m_uf($l11.agentContext) && $l11.querySource.startsWith("repl_main_thread"), $l612 = void 0, $l613 = /* @__PURE__ */ new Map(), $l614 = 3, $l615 = { value: 0 }, $l616 = $l614, $l617 = /* @__PURE__ */ new Map(), $l618 = false, $l619 = false, $l620, $l621 = { count: 0 }, $l622 = $m_wJe(), $l623 = $m_Mmn({ maxRetries: $l622, maxSleptThrough: $m_Amn($l622), maxOverloaded: $m_dZ, maxOutputFiltered: $m_Pmn(), hasFallbackModel: Boolean($l11.fallbackModel), persistent: $m_G6(), background: !$m_Dke($l11.querySource) }, $l11.apiAttemptsLeft), $l624 = false, $l625 = null, $l626 = false, $l627 = ($l628, $l629) => {
    if ($l625 = null, $l626 = $m_sa(), $l624) {
      if ($l626) $l628[$m_fy] = $m_qb, $l625 = $m_c($m_qb), $m_t(`[dispatch] sent ${$m_fy}=${$m_qb}`);
      return;
    }
    if (!$l629 && $l626) {
      let $l630 = $m_UJe($m_rs($l11.querySource));
      if ($l630 !== null) $l628[$m_fy] = $l630, $l625 = $m_c($l630), $m_t(`[dispatch] sent ${$m_fy}=${$l630}`);
    }
  }, $l631 = async ($l632) => {
    if ($l624) return;
    let $l633 = $l632 instanceof $m_Ot ? $l632.status : void 0, $l634 = $l633 !== void 0 && $l633 >= 500, $l635 = $l632 instanceof $m_Zu;
    if (!($l625 !== null ? $l634 || $l635 : $l626 && $l633 === 503)) return;
    if ($l624 = true, $m_t(`[dispatch] ${$l634 ? `HTTP ${$l633}` : "connection error"} with ${$l625 === null ? `no ${$m_fy}` : `${$m_fy}=${$l625}`}; retrying once with ${$m_fy}=${$m_qb}`, { level: "warn" }), $m_i("tengu_dispatch_header_fallback", { model: $m_Et($l11.model), dispatch: $l625 ?? $m_b("none"), resend_dispatch: $m_c($m_qb), reason: $l625 === null ? $m_M1r($l632) : $l634 ? $m_b("5xx") : $m_b("conn_err"), status: $l633 !== void 0 ? $m_Vr($l633) : $m_b("none"), query_source: $m_os($l11.querySource), request_id: $m_ye($l632 instanceof $m_Ot ? $l632.requestID : void 0) }), $l625 === null) {
      let $l636 = $m_H1r($l632);
      if ($l636 > 0) await $m_Y($l636, $l4, { clock: $l12 });
    }
    return "retry:dispatch-header-strip";
  }, $l637 = false, $l638 = false, $l639 = false, $l640, $l641 = ($l642, $l643) => {
    if (!($l642 instanceof $m_Ot) || $l642.status !== 400) return;
    let $l644 = $l642.message.includes("`fallback-credit-"), $l645 = $m_tw !== null && $l642.message.includes(`\`${$m_tw.header}`), $l646 = ($m_tw !== null ? new RegExp(`\`server-side-fallback-(?!${$m_tw.header.slice(21)})`) : /`server-side-fallback-/).test($l642.message), $l647 = ($l648) => {
      $m_t(`[server-fallback] 400 attributed (${$l648}) \u2014 stripping and retrying`, { level: "warn" });
      let $l649 = $l480;
      $m_i("tengu_rotunda_pennant_strip", { shape: $m_c($l648), mode: $m_c($l649), non_streaming: $l643 === "sync", query_source: $m_os($l11.querySource), sticky_scope: $l11.stickyBetas === void 0 ? $m_b("session") : $m_rs($l11.querySource) === "main" ? $m_b("detached_main") : $m_rs($l11.querySource) === "subagent" ? $m_b("agent") : $m_b("aux") });
    }, $l650 = $m_jVe($l642);
    if ($l650 !== void 0 && !$l396) {
      if ($l396 = true, $l483 = void 0, $l650 === "credit_beta_header") {
        if ($m_Dg($l27, $m_LW), $l645 && $m_tw !== null) $m_Dg($l27, $m_tw), $l482 = true;
        if ($l646) $m_Dg($l27, $m_KB), $l637 = true;
        if ($l645 && $l481 && !$m_Rm($l27, $m_KB)) $m_MN($l27, $m_KB);
      }
      if ($l643 === "stream") $l491($l650, $l642.requestID ?? null, null);
      return $l647($l650), "retry:fallback-credit-strip";
    }
    let $l651 = $m_UVe($l642);
    if ($m_tw !== null && ($l651 === "category_beta_header" || $l651 === "default_unconfigured" && $l479) && !$l482) {
      if ($l482 = true, $m_Dg($l27, $m_tw), $l644) $m_Dg($l27, $m_LW), $l396 = true, $l483 = void 0;
      if ($l646) $m_Dg($l27, $m_KB), $l637 = true;
      if ($l481 && !$m_Rm($l27, $m_KB)) $m_MN($l27, $m_KB);
      return $l647($l651), "retry:server-fallback-category-strip";
    }
    if ($l651 !== void 0 && ($l479 || $l651 === "beta_header") && !$l637) {
      if ($l637 = true, $m_Dg($l27, $m_KB), $l651 === "beta_header" && $l644) $m_Dg($l27, $m_LW), $l396 = true, $l483 = void 0;
      return $l647($l651), "retry:server-fallback-strip";
    }
    if ($m_Y7($l642)) return;
    if ($m_VC($l642)) return;
    if ($m_BH($l642) || $m__K($l642)) return;
    if ($m_rK($l642)) return;
    if ($m_Y_e($l642)) return;
    if ($m_jTe($l642) || $m_UTe($l642) !== void 0) return;
    if ($l352($l642)) {
      if ($l643 === "stream" && $l486 && !$l396) $l483 = $l11.fallbackCreditCode;
      return;
    }
    if ($l11.resumeIncompleteThinking) return;
    if ($l643 === "sync" && $l360($l642)) return;
    if ($l650 === void 0 && $l651 === void 0) {
      let $l652 = $l385($l642);
      if ($l652 !== void 0) return $l652;
      let $l653 = $l402($l642);
      if ($l653 !== void 0) return $l653;
      let $l654 = $l655($l642);
      if ($l654 !== void 0) return $l654;
    }
    if ($l643 === "stream" && $l395 && !$l396) return $l396 = true, $l491("unattributed_400_dropped", $l642.requestID ?? null, null), $l647("unattributed"), "retry:fallback-credit-unattributed";
    if (($l479 || $l481) && !$l637) {
      if ($l637 = true, $m_Dg($l27, $m_KB), $m_tw !== null) $m_Dg($l27, $m_tw);
      return $l647("unattributed"), "retry:server-fallback-strip";
    }
    if ($l488 && !$l487) return $l487 = true, $m_Dg($l27, $m_LW), $l342.push($m_LW), $l647("unattributed"), "retry:fallback-credit-header-strip";
    return;
  }, $l360 = ($l656) => $m_ODt($l11.model, $l656) === "refused" || $m_oke($l656) || $m_DVe($l656) || $m_LVe($l656) || $m_BH($l656) || $m__K($l656) || $m_J_e($l656) !== void 0 || $m_BVe($l656, $m_mN($m_HVe)).length > 0 || $m_NVe($l656) || $m_FVe($l656) || $m_$Ve($l656) || $m_gke($l656) !== null || $m_eM($l656) || $m_VC($l656) || $m_I6t($l656) || $m_D6t($l656) || $m_WVe($l656) || $m_mke($l656) || $m_GVe($l656) || $m_wK($l656) || $m_CK($l656), $l657 = () => {
    if ($l86 === "tool_search") return;
    try {
      let $l658 = 0;
      if ($l86 === void 0) $l294 = $l294.slice();
      else $l294 = $l294.flatMap(($l659) => {
        if (!("input_schema" in $l659)) return [$l659];
        if (!$l3.some(($l660) => $m_Ct($l660, $l659.name))) return [];
        if ($l659.defer_loading !== true) return [$l659];
        $l658++;
        let { defer_loading: $l661, ...$l662 } = $l659;
        return [$l662];
      });
      let $l663 = new Set($l294.flatMap(($l664) => "name" in $l664 ? [$l664.name] : [])), $l665 = new Map($l3.map(($l666, $l667) => [$l666.name, $l667]));
      for (let $l668 of $l130) {
        if (!("name" in $l668) || $l663.has($l668.name)) continue;
        let $l669 = $l665.get($l668.name) ?? 1 / 0, $l670 = $l294.findIndex(($l671) => !("input_schema" in $l671) || ($l665.get($l671.name) ?? -1) > $l669);
        if ($l670 === -1) $l670 = $l294.length;
        $l294.splice($l670, 0, $l668), $l663.add($l668.name), $l658++;
      }
      if ($l86 === "tool_addition") $l157?.splice(0, $l157.length), $m_Wzr($l27), $m_qwt($l27);
      else if ($l658 === 0) return;
      else {
        let $l672 = $l87.slice();
        for (let $l673 of $l3) {
          if (!$l663.has($l673.name) || !$l58.has($l673.name)) continue;
          let $l674 = $l665.get($l673.name) ?? 1 / 0, $l675 = $l672.findIndex(($l676) => ($l665.get($l676.name) ?? -1) > $l674);
          if ($l675 === -1) $l675 = $l672.length;
          $l672.splice($l675, 0, $l673);
        }
        $l88 = $m_jTo($l27, false, () => $m_WTo($m_A5($l672), $l3, $l119 ?? $l88?.recordedOnly));
      }
      $l164 = "error_recovery", $l165 = false, $m_t(`[late-tool-additions] no ToolSearch on this request: ${$l658} late tool(s) go inline from this request on`, { level: "warn" });
    } catch ($l677) {
      $m_l($m_U($l677));
    }
  }, $l678 = () => {
    let $l679 = $l258;
    if ($l679) $l258 = () => $m_fZ($m_zb($l679()));
    let $l680 = $l257;
    if ($l680) $l257 = () => $m_fZ($m_zb($l680()));
    let $l681 = $l259;
    if ($l681) $l259 = () => $m_fZ($m_zb($l681()));
  }, $l682 = () => {
    let $l683 = $l258;
    if ($l683) $l258 = () => $m_zb($l683());
    let $l684 = $l257;
    if ($l684) $l257 = () => $m_zb($l684());
    let $l685 = $l259;
    if ($l685) $l259 = () => $m_zb($l685());
  }, $l686 = () => {
    if (!$m_qk()) $l28 = $l28.filter(($l687) => $l687 !== $m_h1t);
  }, $l688 = false, $l689 = ($l690) => {
    if ($l688 || !$m_LVe($l690)) return;
    let $l691 = ($l692) => !("input_schema" in $l692) && "name" in $l692 && $l692.name === $m_iIe, $l693 = $l294.some($l691), $l694 = $l340.includes($m_h1t.header) && $m_lke($l690);
    if (!$l693 && !$l694) return;
    $l688 = true;
    try {
      if ($l693) $l294 = $l294.filter(($l695) => !$l691($l695)), $l234 = $l253($m_fZ($m_zb($l234)), "error_recovery"), $l678(), $l164 = "error_recovery", $l165 = false;
      $l27.advisorHeld = { model: void 0, viaToolChange: $l27.advisorHeld?.viaToolChange ?? false, refused: true };
      let $l696 = $m_C6t($l690);
      if ($l696 === "process") $m_Rxs();
      else if ($l696 === "host") $m_Pxs();
      $l686(), $m_t(`[advisor] the server refused the advisor ${$l694 ? "beta header" : "entry"} (scope: ${$l696}); retrying once without the advisor`, { level: "warn" }), $m_i("tengu_advisor_entry_refused_retry", { query_source: $m_os($l11.querySource), organization_wide: $l696 === "process", host_wide: $l696 === "host", beta_header_refused: $l694 });
    } catch ($l697) {
      $m_l($m_U($l697));
    }
    return "retry:advisor-entry-refused";
  }, $l698 = new $m_iVe($l27), $l699 = ($l700) => {
    try {
      let $l701 = $l698.resolve($l700, $l168, $l3, $l11.querySource);
      if ($l701 !== void 0) $l164 = "error_recovery", $l165 = false;
      return $l701;
    } catch ($l702) {
      $m_l($m_U($l702));
      return;
    }
  }, $l703 = ($l704) => {
    return;
  }, $l705 = "idle", $l655 = ($l706) => {
    return;
  }, $l707 = () => {
    try {
      let $l708 = false, $l709 = $l11.advisorActive !== false;
      if ($l294 = $l294.flatMap(($l710) => {
        if ("input_schema" in $l710 || !("defer_loading" in $l710) || $l710.defer_loading !== true || $l710.name !== $m_iIe) return [$l710];
        if ($l708 = true, !$l709) return [];
        let { defer_loading: $l711, ...$l712 } = $l710;
        return [$l712];
      }), $l708) {
        if (!$l709) $l234 = $l253($m_fZ($m_zb($l234)), "error_recovery"), $l678(), $l686();
        if ($l709 && $l27.advisorHeld?.viaToolChange === true) $l27.advisorHeld = { ...$l27.advisorHeld, inFallback: true };
        $l164 = "error_recovery", $l165 = false;
      }
    } catch ($l713) {
      $m_l($m_U($l713));
    }
  }, $l714 = () => {
    let $l715 = $l258;
    if ($l715) $l258 = () => $m_L2($l715()).messages;
    let $l716 = $l257;
    if ($l716) $l257 = () => $m_L2($l716()).messages;
    let $l717 = $l259;
    if ($l717) $l259 = () => $m_L2($l717()).messages;
  }, $l718 = ($l719, $l720) => {
    if (!$m_BH($l719)) return;
    let { messages: $l721, removed: $l722 } = $m_L2($l234);
    if ($l721 === $l234) return;
    return $l234 = $l253($l721, "error_recovery"), $m_E7s($l27), $l714(), $m_t(`[web-search-strip] The API could not decrypt web search content in this conversation's history: removed ${$l722.toolUses} ${$m_I($l722.toolUses, "search call")}, ${$l722.results} ${$m_I($l722.results, "result block")} and ${$l722.citations} ${$m_I($l722.citations, "citation")} from the request; retrying once. Later requests in this conversation leave them out too.`, { level: "warn" }), $m_f("api_request", "api_request_web_search_stripped", { query_source: $m_os($l11.querySource), transport: $m_c($l720), tool_uses: $l722.toolUses, results: $l722.results, citations: $l722.citations, placeholders: $l722.placeholders }), "retry:web-search-strip";
  }, $l723, $l724 = ($l725) => {
    let $l726 = $m_Gzr($l27, $l33);
    if (!$m_a6t($l725) || $l726?.gaveUp) return;
    try {
      let $l727 = $m_Pfr($l234), $l728 = Math.min($l727, $l723?.limit ?? 1 / 0), $l729 = $m_jXs.find(($l730) => $l730 < $l728);
      if ($l729 === void 0) {
        if ($l723 !== void 0) {
          let { steps: $l731, refusedAt: $l732 } = $l723;
          $l723 = void 0, $m_zzr($l27, { model: $l33, limit: $l726?.limit, gaveUp: true }), $m_t(`[media-item-limit] The model still refuses this request as unprocessable with ${$l727} images and documents left. Not removing any more.`, { level: "warn" }), $m_f("api_request", "api_request_media_limit_gave_up", { query_source: $m_os($l11.querySource), media_items_refused: $l732, steps: $l731 });
        }
        return;
      }
      let $l733 = ($l734) => $m_sgn($l734, $l729, $m_EKo);
      $l234 = $l253($l733($l234), "error_recovery");
      let $l735 = $l258;
      if ($l735) $l258 = () => $l733($l735());
      let $l736 = $l257;
      if ($l736) $l257 = () => $l733($l736());
      let $l737 = $l259;
      if ($l737) $l259 = () => $l733($l737());
      return $l723 = { limit: $l729, steps: ($l723?.steps ?? 0) + 1, refusedAt: $l723?.refusedAt ?? $l727 }, $m_t(`[media-item-limit] The model refused this request as unprocessable. It held ${$l727} images and documents; the oldest were removed to fit a limit of ${$l729}, and it is being sent again. If it is answered, this conversation keeps that limit.`, { level: "warn" }), `retry:media-item-limit:${$l729}`;
    } catch ($l738) {
      $m_l($m_U($l738));
      return;
    }
  }, $l739 = () => {
    try {
      let $l740 = $m_Gzr($l27, $l33);
      if ($l723 === void 0) {
        if ($l740?.gaveUp && $l740.limit === void 0) $m_Ywt($l27);
        else if ($l740?.gaveUp) $m_zzr($l27, { ...$l740, gaveUp: false });
        return;
      }
      let { limit: $l741, steps: $l742, refusedAt: $l743 } = $l723;
      $l723 = void 0, $m_zzr($l27, { model: $l33, limit: Math.min($l741, $l740?.limit ?? 1 / 0), gaveUp: false }), $m_f("api_request", "api_request_media_limit_lowered", { query_source: $m_os($l11.querySource), media_items_refused: $l743, media_item_limit: $l741, steps: $l742 });
    } catch ($l744) {
      $m_l($m_U($l744));
    }
  }, $l745 = ($l746) => {
    {
      let $l747 = $l746 instanceof $m_Ot && $l746.status === 400;
      if ($l262 === "retrying") {
        if ($l747) $l262 = "spent";
        return;
      }
      if ($l262 === "idle" && $l261 && $l747 && $l746.message.includes("cache_control")) return $l262 = "retrying", "retry:prompt-end-mark";
    }
    return;
  }, $l748 = () => {
    if ($l262 !== "retrying") return;
    if ($l262 = "spent", $l32 !== void 0) return;
    try {
      $m_e3o(), $m_t("[cache-breakpoints] a side request that marked a system message before its last marker drew a 400 that names cache_control, and went through without that marker; no later side request carries it", { level: "warn" }), $m_f("api_prompt_end_mark", "server_rejected");
    } catch ($l749) {
      $m_l($l749);
    }
  }, $l370 = ($l750, $l751 = false) => {
    let $l752 = $l28.includes($m_Ib) && !$m_VC($l750) && $m_pke($l750) !== "header_rejected" ? $m_fke($l750) : void 0;
    if ($l752 !== void 0) {
      if ($l259) {
        let $l753 = $l259();
        if ($l234 = $l253(!$l28.includes($m_DW) ? $m_ETe($l753) : !$l28.includes($m_P4) ? $m_CTe($l753) : $l753, "error_recovery"), $l237 = $l241, $m_i4o($l27, $l59), $l86 === void 0) $l657();
      }
      return $l259 = null, $l28 = $l28.filter(($l754) => $l754 !== $m_Ib), $m_VHs($l27, $l752), $l278(), $m_i("tengu_inline_tools_refused_retry", { cause: $m_c($l752) }), "retry:inline-tools-strip";
    }
    let $l755 = $l28.includes($m_hS) && !$m_VC($l750) ? $m_pke($l750) : void 0;
    if ($l755 !== void 0) {
      if ($l258) {
        let $l756 = $l258();
        $l234 = $l253(!$l28.includes($m_DW) ? $m_ETe($l756) : !$l28.includes($m_P4) ? $m_CTe($l756) : $l756, "error_recovery"), $l237 = $l241;
      }
      $l258 = null;
      let $l757 = $l28.includes($m_Ib) && $m_fke($l750) === "header_rejected";
      return $l28 = $l28.filter(($l758) => $l758 !== $m_hS && $l758 !== $m_Ib), $m_KHs($l27, $l755, $l11.model, $l757), $l278(), $l657(), $l707(), "retry:tool-change-strip";
    }
    let $l759 = $l751 || $m_VC($l750), $l760 = $m_cke($l750), $l761 = $l28.includes($m_DW) && $m_mke($l750) && !$m_wK($l750), $l762 = $l28.includes($m_P4);
    if ($l762 && $m_GVe($l750) && !$l759 && !$l761) return $l234 = $l253($m_CTe($l234), "error_recovery"), $l28 = $l28.filter(($l763) => $l763 !== $m_P4), $m_Dg($l27, $m_P4), $m_t(`[per-turn-timing] the server refused the current-time statement (${$m_d($l750)}); leaving it out for the rest of this conversation (until /clear or /compact)`, { level: "warn" }), "retry:per-turn-timing-strip";
    if ($l257 && ($l759 || $l761)) {
      if ($l760 !== null && !$l163.some(($l764) => $l764.role === "system" && $l764.content.length > 0)) return;
      let $l765 = $m_Pyt($l27), $l766 = $l163.length, $l767 = $l234.length, $l768 = $l760 === null ? void 0 : $l760.messageIndex === void 0 ? `${$l766} messages on the wire` : $l760.messageIndex >= $l766 ? `messages[${$l760.messageIndex}], beyond the ${$l766} this request sent` : `messages[${$l760.messageIndex}] of ${$l766} on the wire; conversation entry ${$l416($l760.messageIndex) ?? "none of ours (a clear_at reminder slot)"} of ${$l767}`;
      if ($l234 = $l253($l759 ? $l257() : $m_ETe($l234), "error_recovery"), $l257 = null, $l762) $l28 = $l28.filter(($l769) => $l769 !== $m_P4);
      if ($l759) {
        if ($l237 = $l241, $l28 = $l28.filter(($l770) => $l770 !== $m_eP && $l770 !== $m_DW && $l770 !== $m_hS && $l770 !== $m_Ib && $l770 !== $m_B2), $m_Dg($l27, $m_eP), $m_VTo($l27), $l278(), $l657(), $l707(), $l258 !== null) $m_f("mcp_late_tool_additions", "rejected_with_mid_conv_system"), $l258 = null;
      }
      if ($l761) {
        if ($l28 = $l28.filter(($l771) => $l771 !== $m_DW), $l38($m_DW, $m_L6t($l750)), $l326 !== null) $m_f("api_per_turn_effort", "server_rejected");
      }
      if ($l11.stickyBetas === void 0) $m_rZ($l27, $l765);
      return $m_t($l768 !== void 0 ? `[mid-conv-system] API refused where a system message sits (${$l768}) \u2014 retrying once without system messages; off for this conversation until /clear or /compact` : $l761 ? "[per-turn-control] server rejected the per-turn statements \u2014 resending without them" : $l751 ? "[mid-conv-system] an HTTP 400 or 422 that nothing else recognises answered a request on which system turns were enabled; guessing the platform refuses them and resending without system messages; if that goes through they stay off until /clear or /compact" : '[mid-conv-system] server rejected role:"system" \u2014 falling back to a body with no {role:"system"} turn, sticky-rejecting the beta until /clear or /compact', { level: "warn" }), $m_i("tengu_mid_conv_system_fallback_retry", { per_turn_effort: $l761, ...$l751 && { unclaimed: $l751 }, misplaced: $l760 !== null, ...$l760 !== null && { misplaced_index: $l760.messageIndex ?? -1, wire_message_count: $l766, message_count: $l767 } }), "retry:mid-conv-system";
    }
    if ($l260 && !$m_Rm($l27, $m_M9n) && $m_WVe($l750)) return $m_Dg($l27, $m_M9n), $m_N5o(), $m_t("[mid-conv-system] proxy rejected cache_control on the api_system tail \u2014 demoting the breakpoint to the trailing message for this conversation", { level: "warn" }), $m_f("api_midconv_cache_proxy", "proxy_rejected"), "retry:api-system-cache-demote";
    return;
  }, $l772 = ($l773) => {
    if ($l260 && !$l261 && !$m_Rm($l27, $m_M9n) && !$m_Rm($l27, $m_JUo)) {
      let $l774 = $l773?.input_tokens ?? 0, $l775 = $l773?.cache_read_input_tokens ?? 0, $l776 = ($l773?.cache_creation_input_tokens ?? 0) + ($l773?.cache_creation?.ephemeral_5m_input_tokens ?? 0) + ($l773?.cache_creation?.ephemeral_1h_input_tokens ?? 0), $l777 = $l774 + $l775 + $l776 > 0, $l778 = $l776 > 0 && $l774 < $m_Yfr;
      if ($l777 && !$l778) return;
      $m_Dg($l27, $m_JUo), $m_g("api_midconv_cache_proxy");
    }
  }, $l779 = ($l780) => {
    if (!$l263 || $l11.skipCacheWrite || !$m_$fr($m_Sd($l11.model))) return;
    let $l781 = $m_lWs($m_qs().cacheCoverage, $l27, $l780);
    if ($l781.kind === "confirm") {
      $m_g("api_prompt_cache_coverage", { provider: $m_c($m_Sd($l11.model)) });
      return;
    }
    if ($l781.kind !== "fire") return;
    $m_t("[cache-coverage] sustained uncovered input with a cache breakpoint on the wire through a custom endpoint \u2014 no cache-billing evidence visible at the client (the endpoint may be silently stripping cache_control)", { level: "warn" }), $m_f("api_prompt_cache_coverage", "cache_coverage_loss", { api_system_marker: $l260, consecutive_turns: $l781.consecutive, input_tokens: $l781.inputTokens, cache_read_input_tokens: $l781.cacheReadTokens, cache_creation_input_tokens: $l781.cacheCreationTokens, provider: $m_c($m_Sd($l11.model)) });
  }, $l782 = () => {
    if (!$m_V5o() && $l326 !== null) $m_q5o(), $m_g("api_per_turn_effort");
  }, $l783 = () => {
    if (!$m_Y5o() && $l258 !== null) $m_X5o(), $m_g("mcp_late_tool_additions");
    if (!$m_t3o() && $l258 !== null && $l28.includes($m_Ib) && $l234.some(($l784) => $l784.type === "api_system" && $l784.toolDefinitions !== void 0)) $m_n3o(), $m_g("mcp_inline_tools");
  }, $l785 = () => {
  }, $l786 = () => {
  }, $l787 = () => {
    if ($l389 === "retrying") {
      $l389 = "spent";
      try {
        if ($m_$W !== null) $m_Dg($l27, $m_$W);
        if ($l400) $m_JQe();
        $m_i("tengu_tether_unrecognised_400", { phase: $m_b("healed"), planner_backed: $l400, query_source: $m_os($l11.querySource) }), $m_t(`[tether] a request carrying the message-threads header got an HTTP 400 that Claude Code does not recognise (request id ${$l406 ?? "unknown"}), and a later attempt without the header succeeded. ${$l400 ? "Message Threads stays off for the rest of this session." : "The header stays off for this conversation."}`, { level: "warn" });
      } catch ($l788) {
        $m_l($l788);
      }
    }
    if ($l447) $m_wpn();
    if ($l388 === "retrying") $l388 = "spent", $m_Dg($l27, $m_B2), $m_ZQe(), $l278(), $m_f("api_kept_reminder_clear_at", "unrecognised_400"), $m_t(`[reminders] a request carrying a clear_at message got an HTTP 400 that Claude Code does not recognise (request id ${$l392 ?? "unknown"}), and the same request without clear_at succeeded. For the rest of this session earlier reminders are not re-sent, and requests that can use a Message Threads thread get no reminder.`, { level: "warn" });
  }, $l789 = ($l790) => {
    if (!$m_wK($l790)) return null;
    if ($m_sbn($l11.model), $l25 !== $l11.model) $m_sbn($l25);
    return $m_t(`[effort] model ${$l11.model} rejected output_config.effort; latching unsupported and retrying without it.`, { level: "warn" }), $m_i("tengu_effort_unsupported_retry", { model: $m_Et($l11.model) }), "retry:effort-unsupported";
  }, $l791 = ($l792) => {
    if (!$l478 || !$m_CK($l792)) return null;
    try {
      return $m_yTe($l11.model), $m_t(`[structured-outputs] model ${$l11.model} rejected output_config.format; latching unsupported and retrying without it.`, { level: "warn" }), $m_i("tengu_structured_outputs_unsupported_retry", { model: $m_Et($l11.model) }), "retry:structured-outputs-unsupported";
    } catch ($l793) {
      return $m_l($m_U($l793)), null;
    }
  }, $l794 = ($l795) => null, $l796 = ($l797) => {
    if ($l472 === "highlights" && $m_A6t($l797)) return $m_s3o(), $m_t("[thinking] server rejected thinking.display highlights; asking for omitted for the rest of this process and retrying.", { level: "warn" }), $m_i("tengu_thinking_display_highlights_rejected_retry", { model: $m_Et($l11.model) }), "retry:thinking-display-highlights";
    return null;
  }, $l367 = ($l798, $l799 = false) => {
    if (!$l319 || !$l340.includes($m_NW.header)) return null;
    let $l800 = $m_$Ve($l798) || !$m_I4() && $m_P6t($l798), $l801 = !$m_I4() && ($m_UH($l798) || $l799 && $l798 instanceof $m_Ot && $l798.status === 400 && !$l354($l798) && !$l360($l798));
    if (!$l800 && !$l801) return null;
    return $l319 = false, $l318 = void 0, $l28 = $l28.filter(($l802) => $l802 !== $m_NW), $m_Dg($l27, $m_NW), $m_t($l800 ? "[thinking] server rejected the thinking-binding-controls beta; dropping the header and the block_binding value for this conversation and retrying." : "[thinking] an HTTP 400 that does not name the thinking-binding-controls beta arrived on a request that carried it; guessing the platform refuses that beta, so retrying once without it and leaving it off for this conversation. The only loss is the API's list of the thinking blocks it dropped.", { level: "warn" }), $m_i("tengu_thinking_binding_rejected_retry", { model: $m_Et($l11.model) }), "retry:thinking-binding-controls";
  }, $l803 = ($l804) => {
    if (!$l340.includes($m_JJ.header)) return null;
    if ($l341() || !$m_UH($l804)) return null;
    return $l28 = $l28.filter(($l805) => $l805 !== $m_JJ), $m_Dg($l27, $m_JJ), $l342.push($m_JJ), $m_t("[thinking-token-count] server rejected the beta; dropping it for this conversation and retrying.", { level: "warn" }), $m_i("tengu_thinking_token_count_rejected_retry", { model: $m_Et($l11.model), provider: $m_gA(), unnamed: true }), "retry:thinking-token-count-beta";
  }, $l806 = ($l807) => {
    try {
      let $l808 = $m_BVe($l807, $l340);
      if ($l808.length === 0) return;
      let $l809 = new Set($l808);
      $l28 = $l28.filter(($l810) => !$l809.has($l810));
      for (let $l811 of $l808) $l38($l811, $m_uke($l807, $l811)), $m_i("tengu_beta_400_healed", { beta: $m_tde([$l811.header]), model: $m_Et($l11.model), provider: $m_gA(), status: $l807 instanceof $m_Ot ? $l807.status : void 0 });
      return `retry:beta-rejected:${$l808.map(($l812) => $l812.name).join(",")}`;
    } catch ($l813) {
      $m_l($l813);
      return;
    }
  }, $l814 = ($l815) => {
    if (!($l815 instanceof $m_Ot) || $l815.status !== 400) return null;
    try {
      let $l816 = $m_dke($l815), $l817 = !$l816 && $m_UH($l815);
      if ($l448 === "spent") return null;
      if ($l448 !== "idle") return $l448 = $l448 === "guessing" && $l817 ? "spent" : "unproven", $m_t(`[betas] the resend without ${$m_vv.header} also got an HTTP 400, so the backend is not recorded as rejecting it; ${$l448 === "spent" ? 'both said "invalid beta flag", so it is sent again from the next attempt' : "it stays off for the remaining attempts of this request and is sent again on the next request"}`, { level: "warn" }), null;
      if (!$l450 || $m_zge($m_Sd($l11.model)) || !($l816 || $l817 && !$l341())) return null;
      return $l448 = $l816 ? "retrying" : "guessing", $m_t(`[betas] an HTTP 400 ${$l816 ? "reads as the backend rejecting" : 'says "invalid beta flag", which may be about'} ${$m_vv.header}; resending once without it`, { level: "warn" }), "retry:context-1m-beta";
    } catch ($l818) {
      return $m_l($l818), null;
    }
  }, $l819 = () => {
    if ($l448 !== "retrying" && $l448 !== "guessing") return;
    let $l820 = $l448 === "guessing";
    $l448 = "spent";
    try {
      $l28 = $l28.filter(($l821) => $l821 !== $m_vv), $m_M$r($l11.model), $m_i("tengu_beta_400_healed", { beta: $m_tde([$m_vv.header]), model: $m_Et($l11.model), provider: $m_gA(), status: 400, unnamed: $l820 });
    } catch ($l822) {
      $m_l($l822);
    }
  }, $l823 = ($l824) => {
    if (!$l340.includes($m_c7e.header) || !$m_FVe($l824)) return null;
    return $m_r3o(), $m_uvt($m_c7e), $l28 = $l28.filter(($l825) => $l825 !== $m_c7e), $m_t("[thinking-resumption] server rejected the thinking-resumption beta header; disabled for this process", { level: "warn" }), $m_f("query_thinking_block_resumption", "header_rejected"), $l50 ? "surface:resume-prefill" : "retry:thinking-resumption-beta";
  }, $l826, $l827 = ($l828) => $l828 instanceof $m_Ot && $m_jH($l828), $l829 = 0, $l830 = null, $l831 = "all", $l832 = ($l833) => {
    if (!$l237) $l831 = $l833;
    else if ($l831 !== "all" && ($l833 === "all" || $l833.messageIndex < $l831.messageIndex || $l833.messageIndex === $l831.messageIndex && $l833.thinkingIndex < $l831.thinkingIndex)) $l831 = $l833;
    $l237 = true;
  }, $l834 = ($l835) => {
    if ($l160) return;
    let $l836 = $l163[$l835.messageIndex];
    if ($l836?.role !== "assistant" || !Array.isArray($l836.content)) return;
    let $l837 = $m_YTe($l836.content[$l835.blockIndex]);
    if ($l837 === void 0) return;
    let $l838, $l839 = /* @__PURE__ */ new Map();
    for (let $l840 = 0; $l840 < $l234.length; $l840++) {
      let $l841 = $l234[$l840];
      if ($l841.type !== "assistant" || !Array.isArray($l841.message.content)) continue;
      let $l842 = $l841.message.id, $l843 = $l839.get($l842) ?? 0;
      for (let $l844 of $l841.message.content) {
        if ($l844.type !== "thinking" && $l844.type !== "redacted_thinking") continue;
        if ($m_YTe($l844) === $l837) {
          if ($l838 !== void 0) return;
          $l838 = { messageIndex: $l840, indexInMessage: $l843 - ($l839.get($l842) ?? 0), thinkingIndex: $l843, messageId: $l842 };
        }
        $l843++;
      }
      $l839.set($l842, $l843);
    }
    return typeof $l838?.messageId === "string" ? $l838 : void 0;
  }, $l845 = ($l846) => {
    try {
      if (!$l827($l846)) return;
      $l829++;
      let $l847 = $l846.requestID || $l846.error?.request_id || null;
      if ($l829 === 1) $l830 = $l847;
      let $l848 = $m_$6t($l846), $l849 = $l234, $l850 = (() => {
        if ($l11.resumeIncompleteThinking) return;
        let $l851 = $l848?.block !== void 0 && $l829 <= $m_mfr ? $l834($l848.block) : void 0;
        if ($l851 !== void 0) {
          let $l852 = $m_$Je($l849, { messageIndex: $l851.messageIndex, thinkingIndex: $l851.indexInMessage });
          if ($l852 !== $l849) return { scope: "partial", stripped: $l852, from: $l851 };
        }
        let $l853 = $m_JTe($l849);
        return $l853 !== $l849 ? { scope: "all", stripped: $l853, from: "all" } : void 0;
      })();
      if ($l850 === void 0 && !$l237) $m_N6t($l846);
      let $l854 = $l850?.scope ?? "none", $l855 = $m_Fmn($l849, $l850?.stripped ?? $l849);
      if ($l850 !== void 0) $l234 = $l253($l850.stripped, "error_recovery", true), $l832($l850.from);
      $m_t($l850 === void 0 ? "[thinking] prefix-lock rejection: nothing to strip; the error is returned." : `[thinking] prefix-lock rejection: stripped ${$l855.blocksStripped} of ${$l855.blocksSent} thinking block(s) (${$l854}) and retrying.`, { level: "warn" });
      let $l856 = $m_eDr($l11.querySource, $l11.agentId);
      return $m_i("tengu_strict_prefix_lock_400_surfaced", { query_source: $m_os($l11.querySource), model: $m_Et($l11.model), request_id: $m_kg($l847), chain_request_id: $m_kg($l830), client_request_id: $m_ye($l458), solicited: $l474, mismatch_kind: $m_ye($l848?.kind), failing_message_index: $l848?.block?.messageIndex, failing_block_index: $l848?.block?.blockIndex, thinking_blocks_sent: $l855.blocksSent, thinking_turns_sent: $l855.turnsSent, strip_scope: $m_c($l854), stripped_block_count: $l855.blocksStripped, stripped_turn_count: $l855.turnsStripped, attempt: $l829, client_change_kinds: $l856.kinds, first_changed_message_index: $l856.firstChangedMessageIndex, client_baseline: $l856.baseline, call_number: $l856.callNumber }), $l850 === void 0 ? void 0 : $l850.scope === "partial" ? `retry:prefix-lock-strip-${$l829}` : `retry:prefix-lock-strip-all-${$l829}`;
    } catch ($l857) {
      $m_l($l857);
    }
    return;
  }, $l858 = ($l859) => {
    let $l860 = $l845($l859);
    if ($l232 && $m_eM($l859)) $m_aZ($l860 !== void 0 ? "rejected_healed" : "rejected_surfaced");
    return $l860;
  };
  function* $l861() {
  }
  function* $l862() {
    if ($l826 !== void 0) {
      let $l863;
      try {
      } catch ($l864) {
        $m_l($l864);
      }
      if ($l826 = void 0, $l863) yield $l863;
    }
  }
  let $l865 = false;
  function $l866() {
    let $l867 = $m_cZ(() => $l224 && !$l865 && ($m_uZ?.relayStoppedInLastDispatch() ?? false), false);
    if ($l867) {
      let $l868 = $m_cZ(() => $m_HJe($l0).size > 0, void 0);
      if ($l868 === true) $l237 = true, $l831 = "all", $l241 = true;
      else if ($l868 === false) $l242 = true;
    }
    if ($l242 && !$l237 && !$l865) return $l865 = true, $m_cZ(() => $m_uZ?.markRelayThinkingStripRecorded("no_thinking"), void 0), $m_en({ type: "thinking_stripped", scope: "all" });
    if (!$l237 || $l865) return;
    if ($l865 = true, $l241) $m_cZ(() => $m_uZ?.markRelayThinkingStripRecorded($l867 ? "marker_same_request" : "marker"), void 0);
    return $m_en($l831 === "all" ? { type: "thinking_stripped", scope: "all" } : { type: "thinking_stripped", scope: "partial", from: { messageId: $l831.messageId, thinkingIndex: $l831.thinkingIndex } });
  }
  async function* $l869() {
  }
  function $l870({ messageIndex: $l871, blockIndex: $l872 }) {
    let $l873 = $l163[$l871];
    return $l873?.role === "assistant" && Array.isArray($l873.content) ? $m_YTe($l873.content[$l872]) : void 0;
  }
  function $l874($l875) {
    try {
      if (!$m_Gb() || $l160 || $l408 || $l252 || $l164 !== void 0) return;
      $m_npn({ body: $l875, blockKeyAt: $l870, replyHolding: ($l876, $l877) => {
        let $l878 = $l416($l876), $l879 = $l878 === void 0 ? void 0 : $l234[$l878];
        return $l878 !== void 0 && $l879?.type === "assistant" && Array.isArray($l879.message.content) && $l879.message.content.some(($l880) => $m_YTe($l880) === $l877) ? { messageId: $l879.message.id, messageIndex: $l878 } : void 0;
      }, carrier: { key: $m_nx($l11.querySource) !== null ? $m_Z0($l11.agentId) : void 0, querySource: $l11.querySource }, sentThreadPrefix: $m_Apn({ model: $l11.model, system: $l291, toolSchemas: $l335, thinkingConfig: $l34, getMessageHashes: $l332 }) });
    } catch ($l881) {
      $m_l($m_U($l881));
    }
  }
  let $l882 = ($l883) => {
    if ($l160) return;
    let $l884 = $m_Kfn({ body: $l883, blockKeyAt: $l870, carriedBlockHashes: () => $m_Nmn($l0), countThinkingSent: () => $m_Fmn($l234, $l234), querySource: $l11.querySource, agentId: $l11.agentId, model: $l11.model, requestId: $l435, solicited: $l474, contextCompactedKind: $l885 });
    try {
      return $l884 && $m_en($m_Lmn($l884, { requestId: $l435, model: $l11.model, querySource: $l11.querySource, requestedBehavior: $l475 }));
    } catch ($l886) {
      $m_l($l886);
      return;
    }
  }, $l887 = ($l888) => {
    let $l889 = $l11.serverRefusalFallback !== void 0 ? ($l888.content ?? []).reduce(($l890, $l891, $l892) => $m_nTe($l891) ? $l892 : $l890, -1) : -1, $l893 = $l888.stop_reason === "refusal", $l894, $l895 = 0, $l896 = false, $l897 = [];
    for (let [$l898, $l899] of ($l888.content ?? []).entries()) {
      if (!$m_nTe($l899)) {
        if ($l898 < $l889 && $l899.type !== "text" || $l893 && $l889 >= 0) {
          $l895++, $l896 ||= $l899.type === "tool_use";
          continue;
        }
        $l897.push($l899);
        continue;
      }
      let $l900 = $m_zdn($l899);
      if ($l900 === void 0) {
        $m_X("warn", "cli_malformed_fallback_block"), $m_i("tengu_rotunda_pennant_malformed", { block_index: $l898, non_streaming: true }), $m_f("refusal_fallback", "malformed_fallback_block", { non_streaming: true });
        continue;
      }
      $l897.push($m_T7e($l900)), $l894 = $l900;
      let $l901 = $l480;
      if ($m_i("tengu_rotunda_pennant_materialized", { armed: $l11.serverRefusalFallback !== void 0, mode: $m_c($l901), block_index: $l898, non_streaming: true }), $l900.reason === "refusal") $m_iZ({ model: $l25, requestId: $l435 || void 0, querySource: $l11.querySource, effort: $l188, fastMode: $l609, attempt: $l432, attribution: $m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: true, agentContext: $l11.agentContext });
    }
    if ($l897.length === 0 && ($l888.content ?? []).length > 0) $l897.push({ type: "text", text: $m_Cu, citations: [] });
    let $l902 = $l11.serverRefusalFallback !== void 0 ? $m_cUn($l888.usage) : void 0;
    if ($l638 = $l902?.servedFallbackModel !== void 0 || $l11.serverRefusalFallback !== void 0 && $l894 !== void 0, $l639 = false, $l490 = false, $l640 = $l902, $l895 > 0) $m_i("tengu_rotunda_pennant_sync_dropped", { dropped_count: $l895, had_tool_use: $l896, chain_exhausted: $l893 });
    return { content: $l897, lastHop: $l894, iterations: $l902 };
  };
  function* $l903($l904, $l905, $l906) {
    if ($l906 !== void 0 && !$l490) {
      $l490 = true;
      let $l907 = $m_Mwe($m_em, $l905.usage);
      $m_i("tengu_fallback_credit_minted", { request_id: $m_ye($l435), model: $m_Et($l11.model), fallback_target_model: $m_Et($l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l638 ? $l11.serverRefusalFallback.model : void 0)), token_length: $l906.length, input_tokens: $l907.input_tokens, output_tokens: $l907.output_tokens, cache_read_input_tokens: $l907.cache_read_input_tokens, cache_creation_input_tokens: $l907.cache_creation_input_tokens, cache_creation_5m_input_tokens: $l907.cache_creation?.ephemeral_5m_input_tokens ?? 0, cache_creation_1h_input_tokens: $l907.cache_creation?.ephemeral_1h_input_tokens ?? 0, service_tier: $m_de($l907.service_tier), speed: $m_de($l907.speed), query_source: $m_os($l11.querySource), ...$l11.queryTracking && { query_chain_id: $m_ye($l11.queryTracking.chainId), query_depth: $l11.queryTracking.depth } });
    }
    let $l908 = $l11.serverRefusalFallback !== void 0 ? $l904.lastHop?.model ?? $l904.iterations?.servedFallbackModel : void 0;
    if (!$l639 && $l908 !== void 0) $l639 = true, yield { type: "server_fallback", fromModel: $l904.lastHop?.fromModel ?? $l11.model, toModel: $l908, reason: $l904.lastHop !== void 0 ? "refusal" : "sticky", apiRefusalCategory: $l904.lastHop?.category ?? null, midStream: false, requestId: $l435 ?? null, refusedEffort: $l328(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: $l905.stop_reason };
    let $l909 = $l11.refusalFallbackModelLane === "silent", $l910 = !$l909 ? $l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l638 ? $l11.serverRefusalFallback.model : void 0) : void 0, $l911 = $l11.refusalFallbackCascadeHop, $l912 = $l905.stop_reason === "refusal" && $l910 !== void 0 && $l911 === void 0 ? $m_mDo({ originalModelCanonical: $m_qe($l11.model), armedFallbackModel: $l910, apiRefusalCategory: $l905.stop_details?.category ?? null, armedTargetIsRefusingModel: $m_wht($l11.model, $l910), resolveTarget: ($l913) => $m_TFt({ mappedTarget: $l913, armedFallbackModel: $l910, refusingModel: $l11.model, triedModels: [$m_vht($l11.model)] }), routesOverride: $m_jLr() }) : void 0, $l914 = $l912 !== void 0 ? $l912.model : $l910;
    if ($l912 !== void 0) $m_BLr({ route: $l912, model: $l11.model, armedFallbackModel: $l910, apiRefusalCategory: $l905.stop_details?.category, requestId: $l435 });
    if ($l905.stop_reason === "refusal" && $l914 !== void 0) return $l739(), yield { type: "fallback_request", trigger: "refusal", originalModel: $l11.model, fallbackModel: $l914, requestId: $l435 ?? null, refusedEffort: $l328(), apiRefusalCategory: $l905.stop_details?.category ?? null, apiRefusalExplanation: $l905.stop_details?.explanation ?? null, creditCode: $l906 ?? null, mintedStateless: !$l419, ...$m_pDo($l912, $l911) }, true;
    let $l915 = $m_bIt($l905.stop_reason, $l905.stop_details, $l435, $l908 ?? $l11.model, $l905.id);
    if ($l915) {
      let $l916 = $m_DK() || $m_wG() !== void 0;
      if ($l910 !== void 0 || $l11.refusalFallbackModel !== void 0 || $m_Sht($l11.model) && $m_mW() || $m_ydn() || $l916) $m_m("refusal_fallback", $l912?.matched === "none" ? "route_declined" : $l909 ? "sync_silent_stood" : $l908 !== void 0 ? "server_chain_exhausted" : $l916 ? "client_chain_exhausted" : $m_Sht($l11.model) && $m_GLr() ? "disabled_by_config" : "not_armed", { convolute_arcades: $m_hdn(), arm_source: $m_c($m_gMe()), armed: $l910 !== void 0, model_scope: $m_c($m__J($l11.model)) });
      yield { type: "refusal_no_fallback", originalModel: $l11.model, requestId: $l435 ?? null, apiRefusalCategory: $l905.stop_details?.category ?? null, apiRefusalExplanation: $l905.stop_details?.explanation ?? null }, yield $l915;
    }
    let $l917 = $l918($l905);
    if ($l917 !== void 0) yield $l917;
    return false;
  }
  function $l918($l919) {
    try {
      if (!$m_k("tengu_vast_sunset", true)) return;
      return $m_Vmn($l919.stop_reason, Math.min($l605, $m_Hhn), $l919.usage?.output_tokens ?? 0, $l605 >= $m_Hhn);
    } catch ($l920) {
      $m_l($m_Xe($m_U($l920), "building the cut-short error for a non-streaming response failed"));
      return;
    }
  }
  let $l921 = [];
  function $l922($l923, $l924) {
    if ($l923.size > 0) $l921.push({ type: "hint_clears", ids: [...$l923], contentById: Object.fromEntries($l924) });
  }
  function* $l925() {
    yield* $l921.splice(0);
  }
  async function* $l926($l927, $l928) {
    let { message: $l929, requestId: $l930, headers: $l931, creditCode: $l932 } = yield* $m_vfr({ model: $l11.model, fetchOverride: $l11.fetchOverride, source: $l11.querySource, requestClass: $l11.requestClass, agentContext: $l11.agentContext, promptId: $l20, permissionContext: $l304, toolNames: $l306, credentials: $l11.credentials, storageV5: $l11.storageV5, clock: $l12, queryTracking: $l11.queryTracking, llmSpan: $l429, contextCompactedKindForWire: $l885, compactionRequestKindForWire: $l933, prevToolDurationsForWire: $l934 }, { model: $l11.model, fallbackModel: $l11.fallbackModel, accessFallbackModel: $l10, toolFreeHelper: $l11.toolFreeHelper, ...$m_jo() && { fastMode: $l300 }, modelIsRefusalFallbackTarget: $l11.modelIsRefusalFallbackTarget, signal: $l4, initialConsecutive529Errors: $l623.counts().overloaded, querySource: $l11.querySource, maxRetries: $l623.retriesLeft(), modelCallRetries: $l623, clock: $l12, random: $l11.random, isResumePrefillRequest: $l50, failedStreamOutlastedTimeout: $l928, onRetryStatus: $l11.onRetryStatus, subscribeRetryWake: $l11.subscribeRetryWake, onQuotaWindowWait: $l465, lowPriorityWait: $l462, stampDispatchHeader: $l627, onApiError: async ($l935) => {
      let $l936 = $l409($l935);
      if ($l936 !== void 0) return $l936;
      let $l937 = await $l631($l935);
      if ($l937 !== void 0) return $l937;
      let $l938 = $l383($l935);
      if ($l938 !== void 0) return $l938;
      let $l939 = $l344($l935);
      if ($l939 !== void 0) return $l939;
      let $l940 = $l794($l935);
      if ($l940 !== null) return $l940;
      let $l941 = $l718($l935, "sync");
      if ($l941 !== void 0) return $l941;
      let $l942 = $l724($l935);
      if ($l942 !== void 0) return $l942;
      let $l943 = $m_HDo($l935, $l11.model, $l11.querySource);
      if ($l943 === $m_KLr) return;
      if ($l943 !== null) return $l943;
      let $l944 = $l791($l935);
      if ($l944 !== null) return $l944;
      let $l945 = $l745($l935);
      if ($l945) return $l945;
      let $l946 = $l370($l935);
      if ($l946) return $l946;
      let $l947 = $l789($l935);
      if ($l947 !== null) return $l947;
      let $l948 = $l823($l935);
      if ($l948 === "surface:resume-prefill") return;
      if ($l948 !== null) return $l948;
      let $l949 = $l796($l935);
      if ($l949 !== null) return $l949;
      let $l950 = $l803($l935);
      if ($l950 !== null) return $l950;
      let $l951 = $l806($l935);
      if ($l951 !== void 0) return $l951;
      let $l952 = $l814($l935);
      if ($l952 !== null) return $l952;
      let $l953 = $l367($l935);
      if ($l953 !== null) return $l953;
      let $l954 = $l858($l935);
      if ($l954 !== void 0) return $l954;
      return $l699($l935) ?? $l689($l935) ?? $l703($l935) ?? $l641($l935, "sync") ?? $l385($l935) ?? $l402($l935) ?? $l655($l935) ?? $l372($l935) ?? $l364($l935) ?? $l361($l935);
    } }, $l499, ($l955, $l956, $l957) => {
      $l432 = $l955, $l605 = $l957, $l289 = $l956;
    }, ($l958) => $l454($l958, false), $l927);
    $l435 = $l930, $l313($l930, $l931, true), $l874($l929), $l338?.settle({ kind: "ok" }, $l435, $l929.id);
    try {
      $l772($l929.usage), $l779($l929.usage);
    } catch {
    }
    $l782(), $l783(), $l785(), $l786(), $l787(), $l381(), $l378(), $l819(), $l748(), $m_i("tengu_nonstreaming_fallback_success", { model: $m_Et($l11.model), request_id: $m_kg($l930), originating_request_id: $m_kg($l451), fallback_cause: $m_c($l927.cause), attempt: $l432 }), yield* $l862(), yield* $l861(), $l608 = $l929.diagnostics?.cache_miss_reason ?? void 0;
    let $l959 = $l887($l929), $l960 = $l271 ? $m_q$e($l959.content) : void 0;
    if ($l960?.degraded) $m_K$e();
    let $l961 = $l960?.inputs, $l962 = $m_Q$e($l959.content, $l961), { content: $l963, batchToolUses: $l964 } = $m_ton($m_Ten($l959.content, $l3, $l11.agentId, { requestId: $l435 ?? void 0, messageId: $l929.id }, $l11.storageV5), $l3, ($l965, $l966) => $m_mIt($l965, $l966, $l11.agentId, $l11.storageV5));
    if ($l437 !== void 0) $l440($l437, $l929, $l929.content);
    $l606 = $l931;
    let $l967 = $l882($l929), $l968 = $l866();
    if ($l968) yield $l968;
    let $l969 = $l240();
    if ($l969) yield $l969;
    if ($l967) yield $l967;
    let $l970 = { message: { ...$l929, content: $l963, usage: $m_Mwe($m_em, $l929.usage) }, ...$l964.length > 0 && { batchToolUses: $l964 }, ...$l961 !== void 0 && { wireToolInputs: $l961 }, ...$l962 !== void 0 && { wireIngestContext: $l962 }, ...$l437 !== void 0 && $m_Uhe($l437), apiBlockIndex: 0, requestId: $l435 ?? void 0, requestRef: $l453, requestedModel: $l11.model, ...$m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), type: "assistant", uuid: $m_pZ(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...false, ...$l47 && { advisorModel: $l47 }, ...$l325 !== void 0 && { effort: $l325 }, perTurnEffort: $l326, perTurnTiming: $l327, ...{} };
    return $m_sVe($l27, $l970), $l587.push($l970), $l604 = $l970, $l286 = false, yield $l970, yield* $l903($l959, $l929, $l932);
  }
  let $l971 = false, $l972 = /* @__PURE__ */ new Map(), $l973 = /* @__PURE__ */ new Set(), $l974 = /* @__PURE__ */ new Set(), $l975, $l976 = $m_Jge($l11.agentContext) ?? ($l11.isBackgroundAgent ? $l11.agentId : void 0), $l885 = $m_rs($l11.querySource) === "main" && $m_Dv($l11.querySource, $l11.agentId) ? $m_k4o() : void 0, $l933 = $l11.compactionRequestKind, $l934 = $l11.prevToolDurations !== void 0 ? $m_g4t($l11.prevToolDurations) : void 0;
  try {
    $m_BM("api_call", $l976);
    e: for (; ; ) {
      let $l977 = function() {
        if ($l978 !== null) $l978(), $l978 = null;
        if ($l979) $l979 = false, $l11.onRetryStatus?.(null);
        if ($l980 !== null) $l980(), $l980 = null;
        if ($l981 !== null) $l981(), $l981 = null;
      }, $l982 = function() {
        if (!$l11.onRetryStatus || !$l983) return;
        let $l984 = $l983.lastAt, $l985 = $l12.monotonicNow();
        $l978 = $l12.setTimeout(() => {
          if ($l12.monotonicNow() - $l985 < $m_DJe / 2) return;
          if ($l983.lastAt > $l984) {
            $l982();
            return;
          }
          let $l986 = $l12.monotonicNow() - $l983.lastAt;
          if ($l610 && $l986 < $l987) {
            $l982();
            return;
          }
          let $l988 = $l983.lastAt === 0 ? $l12.monotonicNow() - $l989 : $l986;
          $l979 = true, $l11.onRetryStatus?.({ kind: "stalled", deadline: $l12.now() + Math.max(0, $l990 - $l988) });
        }, $m_DJe, { unref: true });
      }, $l991 = function() {
        if ($l977(), $l982(), !$l992) return;
        let $l993 = $l12.monotonicNow(), $l994 = $l12.now(), $l995 = $l996;
        $l980 = $l12.setTimeout(() => {
          if ($l12.monotonicNow() - $l993 < $l995) return;
          $m_t(`Streaming idle warning: no chunks received for ${$l995 / 1e3}s`, { level: "warn" }), $m_X("warn", "cli_streaming_idle_warning");
        }, $l996), $l981 = $l12.setTimeout(() => {
          if ($l997 = $m_izs($l12, { armedAt: $l993, wallArmedAt: $l994, idleMs: $l998 }), $l997 !== void 0) {
            $l471();
            return;
          }
          $l999 = true, $l1000 = $l12.monotonicNow(), $m_t(`Streaming idle timeout: no chunks received for ${$l998 / 1e3}s, aborting stream`, { level: "error" }), $m_X("error", "cli_streaming_idle_timeout"), $m_i("tengu_streaming_idle_timeout", { model: $m_Et($l11.model), request_id: $m_kg($l435), timeout_ms: $l998, tier: $m_b("event") }), $l471();
        }, $l998);
      };
      if ($l464 = void 0, $m_Om("query_client_creation_start"), $l16) $m_sR("request_build"), $m_oR("client_creation");
      let $l1001 = $m_HTe(() => $m_sF({ maxRetries: 0, model: $l11.model, fetchOverride: $l11.fetchOverride, source: $l11.querySource, requestClass: $l11.requestClass, agentContext: $l11.agentContext, promptId: $l20, permissionContext: $l304, toolNames: $l306, credentials: $l11.credentials, storageV5: $l11.storageV5, signal: $l4, clock: $l12 }), async ($l1002, $l1003, $l1004) => {
        if ($l483 === void 0) $l491("attempt_errored", $l435 ?? null, null);
        if ($l432 = $l1003, $l609 = $l1004.fastMode ?? false, $l431 = $l12.monotonicNow(), $l464 = void 0, $l433.push($l431), $m_Om("query_client_creation_end"), $l16) $m_sR("client_creation"), $m_oR("request_build");
        let $l1005 = $l499($l1004);
        if ($m_Qmn($l1005), $l454($l1005, true), $l605 = $l1005.max_tokens, $m_Om("query_api_request_sent"), $m_t(`[API:timing] dispatching to ${$m_Sd($l11.model)} model=${$l11.model}`), $l289 = $l12.now(), $l594 === void 0 && $l11.queryTracking?.roundStartedAtMs !== void 0) $l11.queryTracking.firstDispatchedAtMs ??= performance.now(), $l594 = Math.round($l11.queryTracking.firstDispatchedAtMs - $l11.queryTracking.roundStartedAtMs);
        if (!$l11.agentId) {
          if ($l189) $m_Mg("api_request_sent");
          if ($l16) $m_sR("request_build");
          if ($l1003 === 1 && !$l591) {
            if ($l591 = $l12.monotonicNow(), $l592 = $l12.now(), $l189) $m_Izs();
            if ($l16) $l593 = $m_tcn($l591);
          }
          if ($l189) try {
            $m_kVt();
          } catch ($l1006) {
            $m_l($m_U($l1006));
          }
        }
        $l470();
        let $l1007 = $m_qc(process.env.CLAUDE_SLOW_FIRST_BYTE_MS) || 3e4;
        $l469 = $l12.setTimeout(() => {
          $l469 = null;
          let $l1008 = $l12.monotonicNow() - $l431;
          $m_t(`Slow first byte: no stream chunk ${($l1008 / 1e3).toFixed(1)}s after request sent (attempt ${$l1003})`, { level: "warn" }), $m_i("tengu_api_slow_first_byte", { model: $m_Et($l11.model), provider: $m_gA(), attempt: $l1003, elapsed_ms: Math.round($l1008) });
        }, $l1007);
        let $l1009 = $m_Jmn($l429, $l433.length);
        $l458 = $l1009.clientRequestId;
        let $l1010 = $l1009.headers;
        if ($l461 = $m_sa() && $m_EJe(), $l461) $l1010[$m_hht] = $m_RLr;
        if ($m_jfr($l11, $l461, $l23)) $l1010[$m_hht] = "extended";
        if ($l627($l1010, $l461), $l11.fallbackStampFromModel !== void 0 && $m_Pe() === "firstParty" && $m_Ri()) for (let [$l1011, $l1012] of [[$m_CDo, $l11.fallbackStampFromModel], [$m_RDo, $l11.fallbackStampCategory], [$m_xDo, $l11.fallbackStampTrigger], [$m_PDo, $l11.fallbackStampOriginalRequestId]]) {
          let $l1013 = $m_k6n($l1012);
          if ($l1013 !== void 0) $l1010[$l1011] = $l1013;
        }
        $m_Zmn($l1010, $l885, $l933), $m_tgn($l1010, $l934);
        let $l1014 = $l483;
        if ($l486 = $l1014 !== void 0, $l1014 !== void 0) $l483 = void 0, $l395 = true;
        if ($l317 = $m_Yg(), $l458 !== void 0) $m_szs($l458, { escalated: $l621.count > 0 }), $m_sFs($l458, performance.now());
        if ($m_rs($l11.querySource) === "main") setTimeout($m_scn, 0);
        setTimeout($m_ZOo, 0, $l11.querySource, $l11.agentId);
        let $l1015 = await $l1002.beta.messages.create({ ...$l1005, ...$l1014 !== void 0 && { fallback_credit_token: $l1014 }, stream: true }, { signal: $l4, ...Object.keys($l1010).length > 0 && { headers: $l1010 } }).withResponse().catch(($l1016) => {
          throw $l470(), $l1016;
        });
        if ($m_Om("query_response_headers_received"), $l435 = $m_f8e($l1015.request_id, $l1015.response?.headers), $l459 = $l1015.response, $l463 = $l12.now(), $l313($l435, $l1015.response?.headers, false), $l464 = $l1015.response && { status: $l1015.response.status, headers: $l1015.response.headers, latencyMs: Math.round($l12.monotonicNow() - $l431) }, $m_ogn($l464), $l1014 !== void 0) $m_i("tengu_rotunda_pennant_credit_echoed", { mint_request_id: $m_ye($l11.fallbackCreditMintRequestId), mint_model: $m_Et($l11.fallbackCreditMintModel), request_id: $m_ye($l435), client_request_id: $m_ye($l458), model: $m_Et($l11.model), token_length: $l1014.length, query_source: $m_os($l11.querySource) });
        return $l1015.data;
      }, { model: $l11.model, credentials: $l11.credentials, storageV5: $l11.storageV5, fallbackModel: $l11.fallbackModel, accessFallbackModel: $l10, toolFreeHelper: $l11.toolFreeHelper, ...$m_jo() ? { fastMode: $l300 } : false, modelIsRefusalFallbackTarget: $l11.modelIsRefusalFallbackTarget, signal: $l4, initialConsecutive529Errors: $l623.counts().overloaded, maxRetries: $l623.retriesLeft(), noResponseRetryLedger: $l621, modelCallRetries: $l623, clock: $l12, random: $l11.random, isResumePrefillRequest: $l50, querySource: $l11.querySource, onRetryStatus: $l11.onRetryStatus, subscribeRetryWake: $l11.subscribeRetryWake, onQuotaWindowWait: $l465, lowPriorityWait: $l462, onError: async ($l1017) => {
        let $l1018 = $l409($l1017);
        if ($l1018 !== void 0) return $l1018;
        let $l1019 = $l383($l1017);
        if ($l1019 !== void 0) return $l1019;
        let $l1020 = $l344($l1017);
        if ($l1020 !== void 0) return $l1020;
        let $l1021 = $l794($l1017);
        if ($l1021 !== null) return $l1021;
        if ($l301 && $m_oke($l1017)) {
          if ($l301 = false, $m_zB) $m_Dg($l27, $m_zB);
          return $m_nP(false), $m_Wpn(true), $m_t("[auto-mode] server rejected afk-mode beta \u2014 dropping header and circuit-breaking auto for this session", { level: "warn" }), "retry:afk-beta";
        }
        let $l1022 = await $l631($l1017);
        if ($l1022 !== void 0) return $l1022;
        if ($m_DVe($l1017)) {
          let $l1023 = $l234, $l1024 = $m_zb($l1023), $l1025 = $l1023.findIndex(($l1026, $l1027) => $l1024[$l1027] !== $l1026), $l1028 = $l1023.reduce(($l1029, $l1030, $l1031) => $l1024[$l1031] !== $l1030 ? $l1029 + 1 : $l1029, 0), $l1032 = $m_XYt() && $l1025 !== -1, $l1033;
          if ($l1032 && !$l11.resumeIncompleteThinking && $l476 !== "enabled") try {
            let $l1034 = $l1023.findIndex(($l1035, $l1036) => $l1036 >= $l1025 && $m_Bfr($l1035)), $l1037 = $l1034 === -1 ? void 0 : $l1023[$l1034];
            if ($l1037?.type === "assistant") {
              let $l1038 = $m_$Je($l1024, { messageIndex: $l1034, thinkingIndex: 0 });
              if ($l1038 !== $l1024) {
                $l1024 = $l1038;
                let $l1039 = $l1037.message.id;
                if (typeof $l1039 === "string") {
                  let $l1040 = 0;
                  for (let $l1041 = 0; $l1041 < $l1034; $l1041++) {
                    let $l1042 = $l1023[$l1041];
                    if ($l1042.type === "assistant" && $l1042.message.id === $l1039 && Array.isArray($l1042.message.content)) $l1040 += $m_F($l1042.message.content, ($l1043) => $l1043.type === "thinking" || $l1043.type === "redacted_thinking");
                  }
                  $l1033 = { messageIndex: $l1034, indexInMessage: 0, thinkingIndex: $l1040, messageId: $l1039 };
                } else $l1024 = $m_JTe($l1024), $l1033 = "all";
              }
            }
          } catch ($l1044) {
            $m_l($m_U($l1044)), $l1024 = $m_zb($l1023), $l1033 = void 0;
          }
          if ($l234 = $l253($l1024, "error_recovery"), $l682(), $l1032) {
            if ($l238 = true, $l1033 !== void 0) $l832($l1033);
          }
          return $m_t($l1028 === 0 ? "[advisor] the server could not process an advisor result sent earlier in this conversation; nothing to remove, retrying as sent." : `[advisor] the server could not process an advisor result sent earlier in this conversation; retrying with the advisor blocks removed from ${$l1028} message(s)${$l1033 === "all" ? " and all thinking removed" : $l1033 !== void 0 ? " and the thinking after them removed" : ""}${$l1032 ? "; recorded, so later requests leave them out too." : "; not recorded, so the next request sends them again."}`, { level: "warn" }), $m_i("tengu_advisor_strip_retry", { query_source: $m_os($l11.querySource), strip_recorded: $l1032, stripped_message_count: $l1028, thinking_also_stripped: $l1033 !== void 0 }), "retry:advisor-strip";
        }
        let $l1045 = $l718($l1017, "stream");
        if ($l1045 !== void 0) return $l1045;
        let $l1046 = $l724($l1017);
        if ($l1046 !== void 0) return $l1046;
        let $l1047 = $m_HDo($l1017, $l11.model, $l11.querySource);
        if ($l1047 === $m_KLr) return;
        if ($l1047 !== null) return $l1047;
        let $l1048 = $l791($l1017);
        if ($l1048 !== null) return $l1048;
        {
          let $l1049 = $m_J_e($l1017);
          if ($l1049) {
            let $l1050 = $l1017 instanceof Error ? $l1017.message : String($l1017), $l1051 = $m_S3($l234, $l1050);
            if ($l1051 !== $l234) return $l234 = $l253($l1051, "error_recovery"), $l613.set($l1049.kind, $l1050), $m_IJe($l11, $l1049.kind, $l1050), $m_i("tengu_media_block_strip_retry", { kind: $m_c($l1049.kind), targeted: 1 }), "retry:media-strip-over-dimension-limit";
            let $l1052 = $l1049.messageIdx !== void 0 ? $l416($l1049.messageIdx) : void 0;
            if ($l1049.messageIdx !== void 0 && $l1052 !== void 0 && $l1049.contentIdx !== void 0) {
              let $l1053 = `${$l1049.messageIdx}.${$l1049.contentIdx}`, $l1054 = $l617.get($l1053) ?? 0, $l1055 = $l1049.nestedContentIdx !== void 0 && $l1054 < $l616 ? $l1049.nestedContentIdx : void 0, $l1056 = $m_VSt($l234, { messageIdx: $l1052, contentIdx: $l1049.contentIdx, nestedContentIdx: $l1055, kind: $l1049.kind }, $l1050);
              if ($l1056 !== $l234) {
                if ($l234 = $l253($l1056, "error_recovery"), $l613.set($l1049.kind, $l1050), $m_IJe($l11, $l1049.kind, $l1050), $l1055 !== void 0) $l617.set($l1053, $l1054 + 1);
                let $l1057 = `messages.${$l1049.messageIdx}.content.${$l1049.contentIdx}`, $l1058 = $l1055 !== void 0 ? `${$l1057}.tool_result.content.${$l1055}` : $l1049.nestedContentIdx !== void 0 ? `${$l1057}.tool_result.content.*` : $l1057;
                return $m_t(`Removed unprocessable ${$l1049.kind} at ${$l1058}; retrying.`, { level: "warn" }), $m_i("tengu_media_block_strip_retry", { kind: $m_c($l1049.kind), message_idx: $l1049.messageIdx, content_idx: $l1049.contentIdx, targeted: 1 }), `retry:media-strip:${$l1049.kind}:${$l1058}`;
              }
            }
            let $l1059 = $l615.value < $l614 ? $m_XSt($l234, $l1049.kind, $l1050) : void 0;
            if ($l1059) return $l615.value++, $l234 = $l253($l1059.messages, "error_recovery"), $l613.set($l1049.kind, $l1050), $m_IJe($l11, $l1049.kind, $l1050), $m_t(`Removed base64 ${$l1049.kind} blocks from carrier ${$l1059.carrierIdx} (API 400 had no usable path); retrying.`, { level: "warn" }), $m_i("tengu_media_block_strip_retry", { kind: $m_c($l1049.kind), targeted: 0, carrier_idx: $l1059.carrierIdx }), `retry:media-strip-latest:${$l1049.kind}:${$l1059.carrierIdx}`;
          }
        }
        if ($l309 && $m_NVe($l1017)) return $l309 = false, $m_PTt($l27, $l317, $l189), "retry:cache-keepalive-beta";
        let $l1060 = $l823($l1017);
        if ($l1060 === "surface:resume-prefill") return;
        if ($l1060 !== null) return $l1060;
        {
          let $l1061 = $m_gke($l1017);
          if ($l1061) {
            let $l1062 = $l1061 === "enabled" ? "adaptive" : "enabled";
            return $m_x5o($l11.model, $l1062), $m_t(`[thinking] model rejected thinking.type=${$l1061}; retrying with ${$l1062}. For Bedrock application-inference-profile ARNs with bearer-token auth, granting bedrock:GetInferenceProfile to the token avoids this round-trip.`, { level: "warn" }), "retry:thinking-type";
          }
        }
        let $l1063 = $l789($l1017);
        if ($l1063 !== null) return $l1063;
        let $l1064 = $l796($l1017);
        if ($l1064 !== null) return $l1064;
        let $l1065 = $l803($l1017);
        if ($l1065 !== null) return $l1065;
        let $l1066 = $l806($l1017);
        if ($l1066 !== void 0) return $l1066;
        let $l1067 = $l814($l1017);
        if ($l1067 !== null) return $l1067;
        let $l1068 = $l367($l1017);
        if ($l1068 !== null) return $l1068;
        {
          let $l1069 = $l845($l1017);
          if ($l1069 !== void 0) {
            if ($l232 && $m_eM($l1017)) $m_aZ("rejected_healed");
            return $l1069;
          }
        }
        if (!$l11.resumeIncompleteThinking && $m_eM($l1017)) {
          let $l1070 = 0, $l1071 = 0;
          for (let $l1072 of $l234) {
            if ($l1072.type !== "assistant" || !Array.isArray($l1072.message.content)) continue;
            for (let $l1073 of $l1072.message.content) if ($l1073.type === "redacted_thinking") $l1070++;
            else if ($l1073.type === "thinking") if ("signature" in $l1073 && $l1073.signature) $l1070++;
            else $l1071++;
          }
          let $l1074 = $m_JTe($l234);
          if ($l1074 !== $l234) {
            if ($l234 = $l253($l1074, "error_recovery"), $l832("all"), $l232) $m_aZ("rejected_fell_back");
            return $m_t("[thinking] server rejected a thinking block; stripping all thinking blocks and retrying.", { level: "warn" }), $m_i("tengu_thinking_signature_strip_retry", { query_source: $m_os($l11.querySource), model: $m_Et($l11.model), stripped_signed_count: $l1070, stripped_unsigned_count: $l1071 }), "retry:thinking-signature-strip";
          }
        }
        if ($l232 && $m_eM($l1017)) $m_aZ("rejected_surfaced");
        {
          let $l1075 = $l745($l1017);
          if ($l1075) return $l1075;
        }
        {
          let $l1076 = $l370($l1017);
          if ($l1076) return $l1076;
        }
        {
          let $l1077 = $l689($l1017);
          if ($l1077 !== void 0) return $l1077;
        }
        {
          let $l1078 = await $l324?.onRequestError($l1017, $l234);
          if ($l1078) return $l234 = $l253($l1078.messages, "microcompact"), $l922($l1078.clearedIds, $l1078.clearedContent), "retry:context-hint";
        }
        return $l699($l1017) ?? $l703($l1017) ?? $l641($l1017, "stream") ?? $l385($l1017) ?? $l402($l1017) ?? $l655($l1017) ?? $l372($l1017) ?? $l364($l1017) ?? $l361($l1017);
      } }), $l1079;
      do
        if ($l1079 = await $l1001.next(), yield* $l925(), !("controller" in $l1079.value)) yield $l1079.value;
      while (!$l1079.done);
      if ($l434 = $l1079.value, $l782(), $l783(), $l785(), $l786(), $l787(), $l381(), $l748(), $l618) $l618 = false, $l11.onRetryStatus?.(null);
      for (let [$l1080, $l1081] of $l613) yield $m_Fs({ ...$m_Cle($l1080, $l1081), error: "invalid_request", errorDetails: $l1081 });
      $l613.clear(), yield* $l862(), yield* $l861();
      let $l983 = $l459 ? $l459._chunkTimes ?? void 0 : void 0;
      if ($l983 === void 0 && $l459 !== void 0 && $m_Pe() === "bedrock" && $m_XLr("bedrock")) $m_t("wire-heartbeat: _chunkTimes absent on a Bedrock stream with the byte watchdog enabled \u2014 heartbeat side-channel unavailable for this stream (bedrock-sdk \u22650.32.0 eventstream\u2192SSE transcode drops it; also expected if the response was not vnd.amazon.eventstream, e.g. behind a header-rewriting proxy)");
      let $l989 = $l12.monotonicNow();
      $l587.length = 0, $l588 = 0, $l589 = void 0, $l590 = 0, $l359 = void 0, $l595.length = 0, $l638 = false, $l639 = false, $l971 = false, $l972.clear(), $l973.clear(), $l974.clear(), $l975 = void 0, $l490 = false, $l290 = $m_em, $l596 = null, $l598 = null, $l599 = false, $l600 = "none";
      let $l1082 = false;
      $l286 = false, $l610 = false;
      let $l1083 = false, $l1084 = false, $l1085 = false, $l1086 = null, $l1087 = /* @__PURE__ */ new WeakSet(), $l1088 = /* @__PURE__ */ new WeakMap(), $l1089 = false, $l1090 = false, $l1091 = null, $l1092 = false, $l1093 = null, $l1094 = 0;
      function* $l1095({ responseUnfinished: $l1096 }) {
        if (!$l1090) return;
        let $l1097 = $l1092 ? null : $l1091;
        $l1090 = false, $l1091 = null, $l1092 = false;
        let $l1098 = $l1093 !== null ? { apiMessageId: $l1093 } : void 0;
        if ($l1097 !== null) yield { type: "stream_event", event: { type: "content_block_stop", index: $l1097 }, ...$l1098 };
        yield { type: "stream_event", event: { type: "message_stop" }, ...$l1098, ...$l1096 && $l1093 !== null && Number.isSafeInteger($l1094) ? { abandonedBlocks: { apiMessageId: $l1093, fromBlockIndex: $l1094 } } : void 0 };
      }
      let $l1099 = null, $l1100 = 0, $l1101 = 0, $l1102 = null, $l1103 = null, $l1104 = null, $l1105 = 0, $l1106 = false, $l992 = $m_a.CLAUDE_ENABLE_STREAM_WATCHDOG ?? true, $l998 = $m_bdn(), $l996 = $l998 / 2, $l990 = Math.min($m_YLr($m_Pe()), $l992 ? $l998 : 1 / 0), $l987 = Math.min($m_Dfr, $l990 - $m_DJe), $l999 = false, $l997, $l1000 = null, $l980 = null, $l981 = null, $l978 = null, $l979 = false;
      $l991();
      let $l1107 = () => {
        if ($l11.querySource !== "sdk" && $l11.keepPartialMessageOnAbort !== true) return;
        if ($l971) return;
        let $l1108 = $l595[$l587.length];
        if ($l1108?.type !== "text" || $l1087.has($l1108) || !$l1108.text.trim() || !$l359) return;
        return { message: { ...$l359, content: $m_Ten([$l1108], $l3, $l11.agentId, { requestId: $l435 ?? void 0, messageId: $l359.id }, $l11.storageV5) }, apiBlockIndex: $l587.length, requestId: $l435 ?? void 0, requestRef: $l453, requestedModel: $l11.model, ...$m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), type: "assistant", uuid: $m_pZ(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), isAbortedMidStream: true, ...void 0, ...$l325 !== void 0 && { effort: $l325 }, perTurnEffort: $l326, perTurnTiming: $l327 };
      }, $l1109 = () => {
        if ($l975 === void 0 || $l639) return;
        let $l1110 = $l975;
        return $l975 = void 0, $l639 = true, { type: "server_fallback", fromModel: $l1110.fromModel, toModel: $l1110.model, reason: $l1110.reason, apiRefusalCategory: $l1110.category, midStream: false, requestId: $l435 ?? null, refusedEffort: $l328(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: null };
      };
      function* $l1111() {
        $l491("aborted", $l435 ?? null, null);
        let $l1112 = $l1109();
        if ($l1112) yield $l1112;
        let $l1113 = $l1107();
        if ($l1113) yield $l1113;
        if ($l610) $m_i("tengu_advisor_tool_interrupted", { model: $m_Et($l11.model), advisor_model: $m_Et($l47 ?? "unknown"), query_source: $m_os($l11.querySource) });
      }
      try {
        let $l1114 = true, $l1115 = 3e4, $l1116 = 0;
        for await (let $l1117 of $m_Ffr($m_Cfn($l434, $l4), $l983, $m_lgn, $l12)) {
          if ($m_nve($l1117)) {
            if ($l1116++, $l1116 <= $m_Lfr) $l991();
            else if (!$l992 || $l999 || $l997 !== void 0) continue;
            yield { type: "stream_event", event: $l1117 };
            continue;
          }
          $l1116 = 0, $l991(), $l590++, $l1102 ??= Math.round($l12.monotonicNow() - $l431), $l1103 ??= $l1117.type, $l1104 = $l1117.type;
          let $l1118 = $l12.now();
          if ($l1099 !== null) {
            let $l1119 = $l1118 - $l1099;
            if ($l1119 > $l1115) $l1100++, $l1101 += $l1119, $m_t(`Streaming stall detected: ${($l1119 / 1e3).toFixed(1)}s gap between events (stall #${$l1100})`, { level: "warn" }), $m_i("tengu_streaming_stall", { stall_duration_ms: $l1119, stall_count: $l1100, total_stall_time_ms: $l1101, event_type: $m_c($m_K_e($l1117.type)), model: $m_Et($l11.model), request_id: $m_kg($l435) });
          }
          if ($l1099 = $l1118, $l1114) {
            if ($l470(), $m_t("Stream started - received first chunk"), $m_t(`[API:timing] first byte after ${Math.round($l12.monotonicNow() - $l431)}ms`), $m_Om("query_first_chunk_received"), !$l11.agentId && $l189) $m_Mg("first_chunk");
            $m_Gun(), $l1114 = false;
          }
          let $l1120 = $m_E7e($l1117), $l1121 = !$l1120 && $m_qdn($l1117);
          if ($l1120 || $l1121) $l610 = false;
          if ($l1120) {
            $l974.add($l1120.index), $l595[$l1120.index] = $m_T7e($l1120);
            let $l1122 = $l480;
            if ($m_i("tengu_rotunda_pennant_materialized", { armed: $l11.serverRefusalFallback !== void 0, mode: $m_c($l1122), block_index: $l1120.index, non_streaming: false }), $l1120.reason === "refusal") $m_iZ({ model: $l25, requestId: $l435 || void 0, querySource: $l11.querySource, effort: $l188, fastMode: $l609, attempt: $l432, attribution: $m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: true, agentContext: $l11.agentContext });
            if ($l11.serverRefusalFallback === void 0) continue;
            if ($m_Jve($l1120.reason)) $l638 = true;
            if ($l359 !== void 0) $l359 = { ...$l359, model: $l1120.model };
            for (let $l1123 of $l972.values()) $l1123.message.model = $l1120.model;
            if ($l972.size === 0) $l975 = $l1120;
            else if (!$m_Jve($l1120.reason)) $l639 = true, yield { type: "server_fallback", fromModel: $l1120.fromModel, toModel: $l1120.model, reason: $l1120.reason, apiRefusalCategory: $l1120.category, midStream: true, requestId: $l435 ?? null, refusedEffort: $l328(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: null };
            else {
              $l639 = true;
              let $l1124 = [];
              for (let [$l1125, $l1126] of $l972) if ($m_jdn($l1126)) $l1124.push($l1126), $l972.delete($l1125), delete $l595[$l1125];
              if ($l1124.length > 0) {
                let $l1127 = new Set($l1124);
                for (let $l1128 = $l587.length - 1; $l1128 >= 0; $l1128--) if ($l1127.has($l587[$l1128])) $l587.splice($l1128, 1);
                $l971 = true;
              }
              let $l1129 = [...$l972.entries()].sort(($l1130, $l1131) => $l1130[0] - $l1131[0]).map(([, $l1132]) => $l1132), $l1133 = $l1129.map(($l1134) => $l1134.message.content.map(($l1135) => $l1135.type === "text" ? $l1135.text : "").join("")).join("");
              yield { type: "server_fallback", fromModel: $l1120.fromModel, toModel: $l1120.model, reason: $l1120.reason, apiRefusalCategory: $l1120.category, midStream: true, requestId: $l435 ?? null, refusedEffort: $l328(), discardedMessages: $l1124, retainedMessages: $l1129, retainedText: $l1133, finalStopReason: null };
            }
            continue;
          }
          if ($l1121) {
            let $l1136 = $l1117.index;
            $l973.add($l1136), $l971 = true, $m_X("warn", "cli_malformed_fallback_block"), $m_i("tengu_rotunda_pennant_malformed", { block_index: $l1136, non_streaming: false }), $m_f("refusal_fallback", "malformed_fallback_block", { non_streaming: false });
            continue;
          }
          if ($l1117.type === "content_block_stop" && $l973.has($l1117.index)) continue;
          switch ($l1117.type) {
            case "message_start": {
              if ($m_sx(typeof $l1117.message === "object" && $l1117.message !== null, $l1117, $m_b("message_start_without_message")), $l1089 = true, $l378(), $l819(), $l359 = $l1117.message, $l359 !== void 0 && "resumable" in $l359) {
                let { resumable: $l1137, ...$l1138 } = $l359;
                $l359 = $l1138;
              }
              if ($l588 = Math.max(0, Math.round($l12.monotonicNow() - $l431)), $l290 = $m_Mwe($l290, $l1117.message?.usage), $l1117.message?.model) $m_Z2r($m_Pn($l11.model), $l1117.message.model);
              $l608 = $l1117.message.diagnostics?.cache_miss_reason ?? void 0, $l874($l1117.message);
              let $l1139 = $l882($l1117.message), $l1140 = $l866();
              if ($l1140) yield $l1140;
              let $l1141 = $l240();
              if ($l1141) yield $l1141;
              if ($l1139) yield $l1139;
              break;
            }
            case "content_block_start": {
              let $l1142 = typeof $l1117.content_block === "object" && $l1117.content_block !== null;
              if (!$l1142) $l599 = false;
              if ($m_sx($l1142, $l1117, $m_b("content_block_start_without_content_block")), $m_tpr({ previous: $l595[$l1117.index], closedContentBlocks: $l1087, started: $l1117.content_block })) throw $m_i("tengu_streaming_error", { error_type: $m_b("content_block_closed_start"), part_type: $m_c($l1117.type), part_index: $m_QTe($l1117) }), new $m_Lne("closed");
              switch ($l599 = false, $l589 ??= Math.max(0, Math.round($l12.monotonicNow() - $l431)), $l1117.content_block.type) {
                case "tool_use":
                  $l595[$l1117.index] = { ...$l1117.content_block, input: "" };
                  break;
                case "server_tool_use":
                  if ($l595[$l1117.index] = { ...$l1117.content_block, input: "" }, $l1117.content_block.name === $m_iIe) $l610 = true, $m_t("[AdvisorTool] Advisor tool called"), $m_i("tengu_advisor_tool_call", { model: $m_Et($l11.model), advisor_model: $m_Et($l47 ?? "unknown"), query_source: $m_os($l11.querySource) });
                  break;
                case "text":
                  $l595[$l1117.index] = { ...$l1117.content_block, text: "" };
                  break;
                case "thinking": {
                  let $l1143 = { ...$l1117.content_block, thinking: "", signature: "" };
                  $l595[$l1117.index] = $l1143, $m_npr($l1088, $l1143, $l12);
                  break;
                }
                default:
                  if ($l595[$l1117.index] = { ...$l1117.content_block }, $l1117.content_block.type === "advisor_tool_result") {
                    $l610 = false, $m_t("[AdvisorTool] Advisor tool result received");
                    let $l1144 = $m_Cxs($l1117.content_block);
                    if ($l1144 !== void 0) $m_t(`[AdvisorTool] Advisor tool result error: ${$l1144}`), $m_i("tengu_advisor_tool_error", { model: $m_Et($l11.model), advisor_model: $m_Et($l47 ?? "unknown"), error_code: $m_c($l1144), query_source: $m_os($l11.querySource) });
                    else $m_i("tengu_advisor_tool_result", { model: $m_Et($l11.model), advisor_model: $m_Et($l47 ?? "unknown"), query_source: $m_os($l11.querySource), stop_reason: $m_de($m_Rwo($l1117.content_block)) ?? $m_b("none") });
                  }
                  break;
              }
              if ($l1086 = $l1117.index, $l1117.content_block.type !== "thinking" && $l1117.content_block.type !== "redacted_thinking" && !$m_OV($l1117.content_block)) $l1085 = true;
              break;
            }
            case "content_block_delta": {
              let $l1145 = $l595[$l1117.index], $l1146 = $l1117.delta;
              if (!$l1145 || !$l1087.has($l1145)) $l599 = false;
              if (!$l1145 || $l1087.has($l1145)) throw $m_i("tengu_streaming_error", { error_type: $l1145 ? $m_b("content_block_closed_delta") : $m_b("content_block_not_found_delta"), part_type: $m_c($l1117.type), part_index: $m_QTe($l1117) }), new $m_Lne($l1145 ? "closed" : "unstarted");
              switch ($m_sx(typeof $l1146 === "object" && $l1146 !== null, $l1117, $m_b("content_block_delta_without_delta")), $m_sx(typeof $l1146.type === "string", $l1117, $m_b("content_block_delta_without_delta_type")), $l1146.type) {
                case "citations_delta":
                  if ($l1145.type !== "text") break;
                  $m_sx(typeof $l1146.citation === "object" && $l1146.citation !== null, $l1117, $m_b("citations_delta_without_citation")), $l1145.citations = [...$l1145.citations ?? [], $l1146.citation];
                  break;
                case "input_json_delta":
                  if ($l1145.type !== "tool_use" && $l1145.type !== "server_tool_use") throw $m_i("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_input_json"), expected_type: $m_b("tool_use"), actual_type: $m_c($l1145.type) }), new $m_Lne("unreadable");
                  if (typeof $l1145.input !== "string") throw $m_i("tengu_streaming_error", { error_type: $m_b("content_block_input_not_string"), input_type: $m_c(typeof $l1145.input) }), new $m_Lne("unreadable");
                  $m_sx(typeof $l1146.partial_json === "string", $l1117, $m_b("input_json_delta_without_partial_json")), $l1145.input += $l1146.partial_json;
                  break;
                case "text_delta":
                  if ($l1145.type !== "text") throw $m_i("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_text"), expected_type: $m_b("text"), actual_type: $m_c($l1145.type) }), new $m_Lne("unreadable");
                  $m_sx(typeof $l1146.text === "string", $l1117, $m_b("text_delta_without_text")), $l1145.text += $l1146.text;
                  break;
                case "signature_delta":
                  if ($l1145.type !== "thinking") throw $m_i("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_thinking_signature"), expected_type: $m_b("thinking"), actual_type: $m_c($l1145.type) }), new $m_Lne("unreadable");
                  $m_sx(typeof $l1146.signature === "string", $l1117, $m_b("signature_delta_without_signature")), $l1145.signature = $l1146.signature;
                  break;
                case "thinking_delta":
                  if ($l1145.type === "redacted_thinking") break;
                  if ($l1145.type !== "thinking") throw $m_i("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_thinking_delta"), expected_type: $m_b("thinking"), actual_type: $m_c($l1145.type) }), new $m_Lne("unreadable");
                  $m_sx(typeof $l1146.thinking === "string", $l1117, $m_b("thinking_delta_without_thinking")), $l1145.thinking += $l1146.thinking;
                  break;
              }
              break;
            }
            case "content_block_stop": {
              let $l1147 = $l595[$l1117.index];
              if (!$l1147 || !$l1087.has($l1147)) $l599 = false;
              if (!$l1147 || $l1087.has($l1147)) throw $m_i("tengu_streaming_error", { error_type: $l1147 ? $m_b("content_block_closed_stop") : $m_b("content_block_not_found_stop"), part_type: $m_c($l1117.type), part_index: $m_QTe($l1117) }), new $m_Lne($l1147 ? "closed" : "unstarted");
              if ($l1086 = null, !$l359) throw $m_i("tengu_streaming_error", { error_type: $m_b("partial_message_not_found"), part_type: $m_c($l1117.type) }), Error("Message not found");
              let { content: $l1148, batchToolUses: $l1149 } = $m_ton($m_Ten([$l1147], $l3, $l11.agentId, { requestId: $l435 ?? void 0, messageId: $l359.id }, $l11.storageV5), $l3, ($l1150, $l1151) => $m_mIt($l1150, $l1151, $l11.agentId, $l11.storageV5)), $l1152 = $l271 ? $m_q$e([$l1147]) : void 0;
              $l1106 ||= $l1152?.degraded === true;
              let $l1153 = $l1152?.inputs, $l1154 = $m_Q$e([$l1147], $l1153), $l1155 = $m_opr($l1088, $l1147, $l12), $l1156 = $m_Ffn($l1147, $l473), $l1157 = { message: { ...$l359, content: $l1148 }, ...$l1155 !== void 0 && { thinkingDurationMs: $l1155 }, ...$l1156 !== void 0 && { thinkingDisplay: $l1156 }, ...$l1149.length > 0 && { batchToolUses: $l1149 }, ...$l1153 !== void 0 && { wireToolInputs: $l1153 }, ...$l1154 !== void 0 && { wireIngestContext: $l1154 }, ...$l1154 !== void 0 && { wireIngestContext: $l1154 }, ...$l437 !== void 0 && $m_Uhe($l437), apiBlockIndex: $l1117.index, requestId: $l435 ?? void 0, requestRef: $l453, requestedModel: $l11.model, ...$m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), type: "assistant", uuid: $m_pZ(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...false, ...$l47 && { advisorModel: $l47 }, ...$l325 !== void 0 && { effort: $l325 }, perTurnEffort: $l326, perTurnTiming: $l327, ...{} };
              if ($m_sVe($l27, $l1157), $l587.push($l1157), $l1105++, $l972.set($l1117.index, $l1157), $l1094 = Math.max($l1094, Number.isSafeInteger($l1117.index) && $l1117.index >= 0 ? $l1117.index + 1 : Number.NaN), $l1087.add($l1147), $l1157.message.content.some(($l1158) => !$m_OV($l1158))) {
                if ($l1084 = true, $l1157.message.content.some(($l1159) => $l1159.type !== "thinking" && $l1159.type !== "redacted_thinking" && !$m_OV($l1159))) $l1085 = true;
              }
              yield $l1157;
              break;
            }
            case "message_delta": {
              if ($l290 = $m_Mwe($l290, $l1117.usage), $l596 = $l1117.context_management ?? $l596, $m_sx(typeof $l1117.delta === "object" && $l1117.delta !== null, $l1117, $m_b("message_delta_without_delta")), $l437 !== void 0 && typeof $l1117.delta === "object" && $l1117.delta !== null && "safeguard_results" in $l1117.delta) $l440($l437, $l1117.delta, $l595);
              let $l1160 = $l11.serverRefusalFallback !== void 0 ? $m_cUn($l290) : void 0;
              if ($l1160?.servedFallbackModel !== void 0) $l638 = true, $l290 = $m_Cho($l290, $l1117.usage);
              let $l1161 = $m_v7e($l1117.delta.stop_details);
              {
                let $l1162 = $l1117.delta.stop_details;
                if ($l1162 && "fallback_credit_token" in $l1162) delete $l1162.fallback_credit_token;
              }
              if ($l1161 !== void 0 && !$l490) $l490 = true, $m_i("tengu_fallback_credit_minted", { request_id: $m_ye($l435), model: $m_Et($l11.model), fallback_target_model: $m_Et($l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l638 ? $l11.serverRefusalFallback.model : void 0)), token_length: $l1161.length, input_tokens: $l290.input_tokens, output_tokens: $l290.output_tokens, cache_read_input_tokens: $l290.cache_read_input_tokens, cache_creation_input_tokens: $l290.cache_creation_input_tokens, cache_creation_5m_input_tokens: $l290.cache_creation?.ephemeral_5m_input_tokens ?? 0, cache_creation_1h_input_tokens: $l290.cache_creation?.ephemeral_1h_input_tokens ?? 0, service_tier: $m_de($l290.service_tier), speed: $m_de($l290.speed), query_source: $m_os($l11.querySource), ...$l11.queryTracking && { query_chain_id: $m_ye($l11.queryTracking.chainId), query_depth: $l11.queryTracking.depth } });
              let $l1163 = typeof $l1117.delta.stop_reason === "string" ? $l1117.delta.stop_reason : null;
              if ($l1163 !== null) $l598 = $l1163, $l599 = true;
              let $l1164 = $l1117.delta;
              if ($l1164.diagnostics?.cache_miss_reason) $l608 = $l1164.diagnostics.cache_miss_reason;
              let $l1165 = $m_Ymn($l1117.delta) ?? $m_Ymn($l1117);
              for (let $l1166 of $l587) {
                if ($l1166.message.usage = $l290, $l1166.message.stop_reason = $l598, $l1163 !== null || $l598 === null) $l1166.message.stop_details = $l1117.delta.stop_details ?? null;
                if ($l414 && $l596) $l1166.message.context_management = $l596;
                if ($l1165 !== void 0) $l1166.message.resumable = $l1165;
              }
              if ($l598 !== null && $l600 !== "credited") {
                $l600 = "credited";
                let $l1167 = $l1160?.servedFallbackModel, $l1168 = $l1160 !== void 0 && $l1167 !== void 0, $l1169 = $l1168 ? $m_R7e($l1160.entries, { speed: $l290.speed, inferenceGeo: $l290.inference_geo, serverToolUse: $l290.server_tool_use }, $l598) : $m_Hke($l25, $l290), $l1170 = $l1168 ? $m_uUn($l11.serverRefusalFallback?.model, $l1167) : $l11.model;
                $l597 += $m_i3e($l1169, $l290, $l1170, $l11.querySource, $l188, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool);
              } else if ($l600 === "none") $l600 = "pending";
              if ($l1163 === "refusal" && !$l1082) $l1082 = true, $m_iZ({ model: $l25, requestId: $l435 || void 0, querySource: $l11.querySource, effort: $l188, fastMode: $l609, attempt: $l432, attribution: $m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: false, stopDetails: $l1117.delta.stop_details ?? null, agentContext: $l11.agentContext });
              if ($l11.serverRefusalFallback !== void 0) {
                let $l1171 = $l975;
                if ($l975 = void 0, $l1171 !== void 0) {
                  if (!$l639) $l639 = true, yield { type: "server_fallback", fromModel: $l1171.fromModel, toModel: $l1171.model, reason: $l1171.reason, apiRefusalCategory: $l1171.category, midStream: false, requestId: $l435 ?? null, refusedEffort: $l328(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: $l598 };
                } else if (!$l639 && $l1160?.servedFallbackModel !== void 0) $l639 = true, yield { type: "server_fallback", fromModel: $l11.model, toModel: $l1160.servedFallbackModel, reason: "sticky", apiRefusalCategory: null, midStream: false, requestId: $l435 ?? null, refusedEffort: $l328(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: $l598 };
              }
              let $l1172 = $l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l638 ? $l11.serverRefusalFallback.model : void 0), $l1173 = $l11.refusalFallbackModelLane === "silent", $l1174 = $l11.refusalFallbackCascadeHop, $l1175 = $l1163 === "refusal" && $l1172 !== void 0 && !$l1173 && $l1174 === void 0 ? $m_mDo({ originalModelCanonical: $m_qe($l11.model), armedFallbackModel: $l1172, apiRefusalCategory: $l1117.delta.stop_details?.category ?? null, armedTargetIsRefusingModel: $m_wht($l11.model, $l1172), resolveTarget: ($l1176) => $m_TFt({ mappedTarget: $l1176, armedFallbackModel: $l1172, refusingModel: $l11.model, triedModels: [$m_vht($l11.model)] }), routesOverride: $m_jLr() }) : void 0, $l1177 = $l1175 !== void 0 ? $l1175.model : $l1172;
              if ($l1175 !== void 0) $m_BLr({ route: $l1175, model: $l11.model, armedFallbackModel: $l1172, apiRefusalCategory: $l1117.delta.stop_details?.category, requestId: $l435 });
              let $l1178 = $l1175?.matched === "none" && $l1117.delta.stop_details?.category === "bio" && !$m_DK(), $l1179 = $l1163 === "refusal" && ($l1172 === void 0 || $l1178) ? $l11.refusalFallbackSilentRearm?.($l1178, $l1117.delta.stop_details?.category ?? null, $m_TDo($l459?.headers)) : void 0, $l1180 = $l1177 ?? $l1179;
              if ($l1163 === "refusal" && $l1180 !== void 0) {
                $l739(), yield { type: "fallback_request", trigger: "refusal", originalModel: $l11.model, fallbackModel: $l1180, requestId: $l435 ?? null, refusedEffort: $l328(), apiRefusalCategory: $l1117.delta.stop_details?.category ?? null, apiRefusalExplanation: $l1117.delta.stop_details?.explanation ?? null, creditCode: $l1161 ?? null, mintedStateless: !$l419, ...$l1179 !== void 0 && { silentArmAtTrigger: true }, ...$m_pDo($l1175, $l1174) };
                return;
              }
              let $l1181 = $m_bIt($l1163, $l1117.delta.stop_details, $l435, $l638 ? $l1160?.servedFallbackModel ?? $l359?.model ?? $l11.model : $l11.model, $l359?.id);
              if ($l1181) {
                let $l1182 = $m_DK() || $m_wG() !== void 0;
                if ($l1172 !== void 0 || $l11.refusalFallbackModel !== void 0 || $m_Sht($l11.model) && $m_mW() || $m_ydn() || $l1182) $m_m("refusal_fallback", $l1175?.matched === "none" ? "route_declined" : $l638 ? "server_chain_exhausted" : $l1182 ? "client_chain_exhausted" : $m_Sht($l11.model) && $m_GLr() ? "disabled_by_config" : "not_armed", { convolute_arcades: $m_hdn(), arm_source: $m_c($m_gMe()), armed: $l1172 !== void 0, model_scope: $m_c($m__J($l11.model)) });
                yield { type: "refusal_no_fallback", originalModel: $l11.model, requestId: $l435 ?? null, apiRefusalCategory: $l1117.delta.stop_details?.category ?? null, apiRefusalExplanation: $l1117.delta.stop_details?.explanation ?? null }, yield $l1181;
              }
              let $l1183 = $m_Vmn($l1163, $l605, $l290.output_tokens);
              if ($l1183 !== void 0) yield $l1183;
              break;
            }
            case "message_stop":
              if ($l1089 = false, $l437 !== void 0 && $m_dqt($l437)) $l438({ kind: "none", why: "server_no_result" });
              if ($l1106) $m_K$e();
              if ($l600 === "pending") $l601();
              $l491("stream_completed", $l435 ?? null, $l290);
              break;
          }
          if ($l1117.type === "content_block_stop" && $l974.has($l1117.index)) continue;
          $l1083 = true;
          let $l1184 = $m_$fn($l1117, $l473), $l1185 = $l1090 || $l1117.type === "message_start";
          if ($l1117.type === "message_start") $l1090 = true, $l1091 = null, $l1092 = false, $l1093 = typeof $l1117.message.id === "string" && $l1117.message.id !== "" ? $l1117.message.id : null;
          else if ($l1117.type === "content_block_start") $l1091 = $l1117.index, $l1092 = $m_Nfr.has($l1117.content_block.type);
          else if ($l1117.type === "content_block_stop") $l1091 = null, $l1092 = false;
          else if ($l1117.type === "message_stop") $l1090 = false, $l1091 = null, $l1092 = false;
          yield { type: "stream_event", event: $l1117, ...$l1117.type === "message_start" ? { ttftMs: $l588, ...$l591 ? { requestSentAtMs: $l591 } : void 0, ...$l592 ? { requestSentWallMs: $l592 } : void 0 } : void 0, ...$l1184 !== void 0 ? { thinkingDisplay: $l1184 } : void 0, ...$l1185 && $l1093 !== null ? { apiMessageId: $l1093 } : void 0 };
        }
        if ($l977(), $l4.aborted) {
          yield* $l1111();
          return;
        }
        if ($l999) {
          let $l1186 = $l1000 !== null ? Math.round($l12.monotonicNow() - $l1000) : -1;
          throw $m_X("info", "cli_stream_loop_exited_after_watchdog_clean"), $m_i("tengu_stream_loop_exited_after_watchdog", { request_id: $m_kg($l435), exit_delay_ms: $l1186, exit_path: $m_b("clean"), model: $m_Et($l11.model) }), $l1000 = null, Error("Stream idle timeout - no chunks received");
        }
        if ($l997 !== void 0) throw $l997;
        if ($l1089 && $l1086 !== null) throw $m_t(`Stream ended cleanly inside open block ${$l1086} (stop_reason=${$l598}) \u2014 treating as a dropped connection`, { level: "error" }), new $m_N1r();
        if (!$l359 || $l587.length === 0 && !$l598) throw $m_t(!$l359 ? "Stream completed without receiving message_start event - triggering non-streaming fallback" : "Stream completed with message_start but no content blocks completed - triggering non-streaming fallback", { level: "error" }), $m_i("tengu_stream_no_events", { model: $m_Et($l11.model), request_id: $m_kg($l435), ...$m_V_e(void 0, $l464), ms_since_request: Math.round($l12.monotonicNow() - $l431) }), new $m_pmn();
        if ($l1089 && !($l598 !== null && $l599)) throw $m_t(`Stream ended cleanly mid-response (stop_reason=${$l598}, terminal=${$l599}) \u2014 treating as a dropped connection`, { level: "error" }), new $m_N1r();
        try {
          let $l1187 = $m_qs(), $l1188 = $l1187.hasFired("stream_text_delivery_bad"), $l1189 = $l1187.hasFired("stream_text_delivery_ok");
          if ($l598 !== null && !$l971 && (!$l1188 || !$l1189)) {
            if (!$l1188) for (let [$l1190, $l1191] of $l595.entries()) {
              if (!$l1191 || $l1191.type !== "text") continue;
              if ($l1191.text.trim().length > 0 && !$l972.has($l1190) && !$l973.has($l1190)) {
                $l1187.markFired("stream_text_delivery_bad"), $m_m("api_stream_text_delivery", "text_block_unyielded", { had_tool_use: $l595.some(($l1192) => $l1192?.type === "tool_use"), dropped_block_index: $l1190 });
                break;
              }
            }
            if (!$l1189) {
              let $l1193 = $l595.some(($l1194, $l1195) => $l1194?.type === "text" && $l1194.text.trim().length > 0 && $l972.has($l1195)), $l1196 = $l595.some(($l1197, $l1198) => $l1197?.type === "tool_use" && $l972.has($l1198));
              if ($l1193 && $l1196) $l1187.markFired("stream_text_delivery_ok"), $m_g("api_stream_text_delivery");
            }
          }
          if ($l598 !== null) $l772($l290);
          $l779($l290);
        } catch {
        }
        if ($l1100 > 0) $m_t(`Streaming completed with ${$l1100} stall(s), total stall time: ${($l1101 / 1e3).toFixed(1)}s`, { level: "warn" }), $m_i("tengu_streaming_stall_summary", { stall_count: $l1100, total_stall_time_ms: $l1101, model: $m_Et($l11.model), request_id: $m_kg($l435) });
        $m_k1s({ returnAfterIdle: $l414 ? $l412?.returnAfterIdle : void 0, contextManagement: $l596, usage: $l290, querySource: $l11.querySource, agentId: $l11.agentId }), $m_n1s($l11.querySource, $l290.cache_read_input_tokens, $l290.cache_creation_input_tokens, $l0, $l11.agentId, $l435, $l24, $l189);
        let $l1199 = $l459;
        if ($l1199) {
          $m_f6n($l462, $l463), $m_iCs($l1199.headers, $m_rs($l11.querySource) !== "auxiliary", $l463, $l317);
          let $l1200 = $m_Xbo($l1199.headers, $l11.model, ($m_Af($l11.model) || $m_dT($l11.model)) && $l290.input_tokens + $l290.cache_read_input_tokens + $l290.cache_creation_input_tokens > $m_x2, $l463, $l317, $l11.storageV5);
          if ($l1200 && $l11.queryTracking) $l11.queryTracking.answeredQuerySource = $l11.querySource, $l11.queryTracking.billedToUsageCredits = $l1200.overageInUse === true;
          $m_qpn($l1199.headers, $l11, $l609), $l606 = $l1199.headers;
        }
      } catch ($l1201) {
        let $l1202 = $l997 !== void 0 && !$l999 && !$l4.aborted && $l1201 instanceof $m_cu ? $l997 : $l1201;
        $l977(), $l470();
        {
          let $l1203 = $l1109();
          if ($l1203) yield $l1203;
        }
        if (!$l999 && $l1202 instanceof $m_I6n) $l999 = true, $l1000 = $l12.monotonicNow(), $m_t(`Streaming idle timeout (byte-level): ${$l1202.message}, aborting stream`, { level: "error" }), $m_X("error", "cli_streaming_idle_timeout"), $m_i("tengu_streaming_idle_timeout", { model: $m_Et($l11.model), request_id: $m_kg($l435), timeout_ms: $l1202.idleMs, tier: $m_b("byte"), bytes_received_before_stall: $l1202.bytesReceived, time_to_first_byte_ms: $l1202.ttfbMs, body_read_pending: $l1202.bodyReadPending, slept_ms: $l1202.sleptMs, cf_ray: $m_ye($l1202.cfRay) });
        if ($l999 && $l1000 !== null) {
          let $l1204 = Math.round($l12.monotonicNow() - $l1000);
          $m_X("info", "cli_stream_loop_exited_after_watchdog_error"), $m_i("tengu_stream_loop_exited_after_watchdog", { request_id: $m_kg($l435), exit_delay_ms: $l1204, exit_path: $m_b("error"), error_name: $l1202 instanceof Error ? $m_oU($l1202) ?? $m_b("Error") : $m_b("unknown"), model: $m_Et($l11.model) });
        }
        let $l1205 = { events_received: $l590, ms_to_first_event: $l1102, ms_since_last_event: $l1099 === null ? null : $l12.now() - $l1099 }, $l1206 = ($l1207, $l1208) => $m_X("warn", "cli_stream_failed", () => ({ ...$m_mL($l1208, $m_jpe($l1208), $l464), fallback_cause: $l1207, watchdog_fired: $l999, slept_ms: $l1202 instanceof $m_I6n || $l1202 instanceof $m_PFt ? $l1202.sleptMs : null, client_request_id: $m_ye($l458) ?? null, model: $m_Et($l11.model) ?? null, stream: { ...$l1205, first_event_type: $l1103 === null ? null : $m_K_e($l1103), last_event_type: $l1104 === null ? null : $m_K_e($l1104), message_envelope_open: $l1089, stop_reason_received: $l598 !== null, content_blocks_completed: $l1105, any_event_yielded: $l1083, ms_since_request: Math.round($l12.monotonicNow() - $l431), ms_to_headers: $l464?.latencyMs ?? null, stalls_over_30s: $l1100, stall_ms_total: $l1101 }, route: $m_zlt() }));
        if ($l1202 instanceof $m_cu) {
          if ($l4.aborted) throw yield* $l1111(), $m_t(`Streaming aborted by user: ${$m_d($l1202)}`), $l1202;
          else if (!$l999) {
            $m_t(`Streaming timeout (SDK abort): ${$l1202.message}`, { level: "error" });
            let $l1209 = new $m_OA({ message: "Request timed out" });
            throw $l1206("sdk_timeout", $l1209), $l1209;
          }
        }
        let $l1210 = $m_Pg($l1202), $l1211 = $l1210 !== null && $m_q2.has($l1210.code), $l1212 = $l1210 !== null && ($l1211 || $m_n1.has($l1210.code)), $l1213 = $l324?.classifyStreamError($l1202) ?? false, $l1214 = $l1202 instanceof $m_Lne || $l1202 instanceof SyntaxError, $l1215 = $l1202 instanceof $m_Lne && $l1202.blockState === "unstarted", $l1216 = $l1215 ? "event referenced an unstarted content block" : $l1202 instanceof $m_Lne && $l1202.blockState === "closed" ? "event referenced an already-closed content block" : "event could not be read", $l1217 = $m_w3s({ connDetails: $l1210, isStaleConnection: $l1211, isContextHintSse: $l1213, streamIdleAborted: $l999, noEvents: $l1202 instanceof $m_pmn, malformedStream: $l1202 instanceof $m_Lne }), $l1218 = $m_oU($l1202) ?? null, $l1219 = $m_Tce($l1210?.code) ?? null, $l1220 = $l1202 instanceof Error ? $l1218 ?? $m_b("none") : $m_c(typeof $l1202), $l1221 = $l1202 instanceof Error ? $m_b3o($l1202.constructor?.name) ?? $m_b("none") : $m_b("none"), $l1222 = $l1219 ?? $m_b("none"), $l1223 = ($m_k("tengu_watchdog_skip_nonstreaming_fallback", false) || $m_a.CLAUDE_CODE_REMOTE) && $l999 || $m_a.CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK || $m_k("tengu_disable_streaming_to_non_streaming_fallback", false), $l1224 = $l999 ? Error($l587.length > 0 ? "Stream idle timeout - partial response received" : "Stream idle timeout - no chunks received") : $l1202, $l1225 = $l1224 instanceof Error ? $m_oU($l1224) ?? $m_b("Error") : $m_c(typeof $l1224);
        $l1206($l1217, $l1202 instanceof $m_cu ? $l1224 : $l1202);
        let $l1226 = $m_GW($l1202) || $m_yJe($l1202) || $l1202 instanceof $m_Ot && ($l1202.type === "api_error" || $l1202.type === "timeout_error"), $l1227;
        if ($m_Q7e($l1202)) $l1227 = "dlpDenied";
        else if ($m_Mze($l1202)) $l1227 = "escapeMonitor";
        let $l1228 = $m_ZP($l1202), $l1229 = $l625 !== null && !$l624 && $l1210 !== null && !$l1083, $l1230 = $m_Imn({ error: $l1202, isServerError: $l1226, stalled: $l999, isConnectionError: $l1212 || $l1229, suspended: $m_umn($l1202), truncated: $l1210?.code === "StreamTruncated", malformed: $l1214, denied: $l1227 !== void 0, outputFiltered: $l1228, anyEvent: $l1083, anyBlockFinished: $l1084, anyOutputShown: $l1085, stopReasonReceived: $l598 !== null, outlastedNonStreamingTimeout: $l12.monotonicNow() - $l431 >= $m_Xmn(), complete: $l598 !== null && $l599 && $l1086 === null }), $l1231 = $l1230 === void 0 ? "keepPartial" : $l623.onStreamFailed($l1230, !$l1223), $l1232 = $l623.counts(), $l1233 = $l1230?.progress === "thinkingOnly" && $l1230.cause === "overloaded" && !$l1230.stopReasonReceived;
        if ($l1231 === "useFallbackModel" && ($l1230?.cause === "serverError" || $l1230?.cause === "timedOut") && $l11.fallbackModel) {
          if (!$l1085) $m_D2($l587, $l25);
          if ($l1089) $l601(), $l287();
          throw $m_i("tengu_api_model_not_found_fallback_triggered", { original_model: $m_Et($l11.model), fallback_model: $m_Et($l11.fallbackModel), provider: $m_gA(), reason: $m_b("server_error"), source: $m_b("mid_stream") }), new $m_pD($l11.model, $l11.fallbackModel, "server_error", $l1202);
        }
        if ($l1230 === void 0 || $l1230.progress === "output" || $l1230.progress === "thinkingOnly" && !$l1233) {
          let $l1234 = $l1226 && $l1085, $l1235 = $l1226 && $l1231 === "retry";
          if ($l1231 !== "fail") {
            $l471();
            let $l1236 = $l999, $l1237 = $l587.some(($l1238) => $l1238.message.content.some(($l1239) => $l1239.type === "tool_use"));
            if ($l1231 === "retry") {
              if (!$l1085) $m_D2($l587, $l25);
              if ($l1236) $m_t(`Stream idle timeout after thinking-only yield \u2014 retrying streaming (${$l1232.stalls}/${$m_CJe})`, { level: "warn" }), $m_i("tengu_streaming_watchdog_retry", { model: $m_Et($l11.model), retry_attempt: $l1232.stalls, request_id: $m_ye($l435), after_thinking_only: true });
              else $m_t(`Stream ${$l1214 ? $l1216 : $l1235 ? "server error" : `connection closed (${$l1210?.code})`} after thinking-only yield \u2014 retrying streaming (${$l1232.afterThinkingOnly}/${$l1230?.cause === "timedOut" ? $m_Tmn : $m_MJe})`, { level: "warn" }), $m_i("tengu_streaming_stale_connection_retry", { model: $m_Et($l11.model), error_code: $l1214 ? $m_b("malformed_stream") : $l1235 ? $m_b("server_error") : $m_sJn($l1210?.code ?? ""), retry_attempt: $l1232.afterThinkingOnly, request_id: $m_ye($l435), after_thinking_only: true });
              if ($l491("attempt_errored", $l435 ?? null, null), $l601(), $l287(), yield* $l1095({ responseUnfinished: true }), $l435 = null, $l1235) await $m_Y($m_PF($l1232.afterThinkingOnly, void 0, void 0, $l11.random), $l4, { clock: $l12 });
              else if (!$l1236) await $m_Y(100 * $l1232.afterThinkingOnly, $l4, { clock: $l12 });
              continue e;
            }
            let $l1240 = $l598 !== null, $l1241 = $l1210?.code === "StreamSuspended", $l1242 = $l1241 && !$m_Mf(), $l1243 = $l1236 ? $m_b("watchdog") : $l1234 ? $m_b("server_error") : $l1214 ? $m_b("malformed_stream") : $l1241 ? $m_b("stream_suspended") : $l1210?.code === "StreamTruncated" ? $m_b("stream_truncated") : $l1210 !== null && $m_n1.has($l1210.code) ? $m_b("network_down") : $m_b("stale_connection");
            if ($l1240 && $l599 && $l1086 === null) {
              $m_t(`Stream ${$l1236 ? "stalled" : `connection closed (${$l1210?.code ?? "unknown"})`} after message_delta (stop_reason=${$l598}) \u2014 response already complete, no truncation`, { level: "info" }), $m_i("tengu_streaming_close_after_complete", { model: $m_Et($l11.model), blocks_yielded: $l587.length, cause: $l1243, error_code: $l1210 ? $m_sJn($l1210.code) : $m_b("none"), request_id: $m_ye($l435) }), $l491("stream_completed", $l435 ?? null, $l290), yield* $l1095({ responseUnfinished: false });
              break e;
            }
            let $l1244 = $l1237 ? "tool_use" : "end_turn";
            $l598 = $l1244;
            for (let $l1245 of $l587) $l1245.message.usage = $l290, $l1245.message.stop_reason = $l1244;
            $l338?.noteClientTruncated($l587[0]?.message.id), $m_t($l1236 ? `Stream idle timeout after ${$l587.length} block(s) yielded \u2014 finalizing partial response` : $l1234 ? `Mid-stream server error after ${$l587.length} block(s) yielded \u2014 finalizing partial response` : $l1214 ? `Stream ${$l1216} after ${$l587.length} block(s) yielded \u2014 finalizing partial response` : `Stream connection closed (${$l1210?.code}) after ${$l587.length} block(s) yielded \u2014 finalizing partial response`, { level: "warn" }), $m_i("tengu_streaming_partial_finalized", { model: $m_Et($l11.model), blocks_yielded: $l587.length, has_output: $l1085, synthesized_stop_reason: $m_c($l1244), cause: $l1243, request_id: $m_ye($l435) }), $l601(), yield* $l1095({ responseUnfinished: true });
            let $l1246 = $m_Fs({ content: $l1085 ? $l1236 ? `${$m_Ll}: The response stopped arriving. The response above may be incomplete.` : $l1234 ? `${$m_Ll}: Server error mid-response. The response above may be incomplete.` : $l1214 ? $l1215 ? `${$m_Ll}: Part of the response never arrived. The response above may be incomplete.` : `${$m_Ll}: The response stream was malformed. The response above may be incomplete.` : $l1242 ? `${$m_Ll}: Your computer went to sleep mid-response. The response above may be incomplete.` : `${$m_Ll}: Connection lost mid-response. The response above may be incomplete.` : $l1236 ? `${$m_Ll}: The response stalled before a response was produced. Try again.` : $l1214 ? $l1215 ? `${$m_Ll}: Part of the response never arrived and no response was produced. Try again.` : `${$m_Ll}: The response stream was malformed and no response was produced. Try again.` : $l1242 ? `${$m_Ll}: Your computer went to sleep before a response was produced. Try again.` : `${$m_Ll}: Connection lost before a response was produced. Try again.`, error: "server_error", truncatedAfterOutput: $l1085 && !$l1237 ? true : void 0 });
            if ($l1236 && !$l1085) $l1246.streamWatchdogGaveUp = true;
            yield $l1246;
            break e;
          }
          throw $m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $l1225, attemptNumber: $l432, maxOutputTokens: $l605, thinkingType: $m_c($l34.type), fallback_disabled: $l1223, request_id: $m_kg($l435), fallback_cause: $m_b("partial_yield"), any_stream_event_yielded: $l1083, has_output: $l1085, died_of: $m_c($l1230?.cause ?? "complete") }), $l1224;
        }
        if ($l1230?.cause === "outputFiltered") {
          if ($l1089) $l601();
          if ($l1231 === "retry") {
            if ($m_t(`Output content filter stopped the response before any of the answer was shown: retrying streaming (${$l1232.outputFiltered}/${$m_GTe})`, { level: "warn" }), $m_i("tengu_streaming_output_filter_retry", { model: $m_Et($l11.model), retry_attempt: $l1232.outputFiltered, request_id: $m_kg($l435), first_stop_progress: $m_c($l1230.progress) }), $l620 = { firstStopProgress: $l1230.progress, msToFirstStop: Math.round($l12.monotonicNow() - $l431), startedAt: $l12.monotonicNow(), ended: void 0 }, $l471(), $l491("attempt_errored", $l435 ?? null, null), $l1089) $l287();
            yield* $l1095({ responseUnfinished: true }), $l435 = null;
            continue e;
          }
          throw $m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $m_b("output_content_filtered"), attemptNumber: $l432, maxOutputTokens: $l605, thinkingType: $m_c($l34.type), fallback_disabled: true, request_id: $m_kg($l435), fallback_cause: $m_b("output_content_filtered"), any_stream_event_yielded: $l1083 }), $l1202;
        }
        if ($l1229) {
          if ($l624 = true, $m_t(`[dispatch] Stream connection error (${$l1210.code}) with ${$m_fy}=${$l625} before first event; ${$l1231 === "retry" ? "retrying once" : "going on"} with ${$m_fy}=${$m_qb}`, { level: "warn" }), $m_i("tengu_dispatch_header_fallback", { model: $m_Et($l11.model), dispatch: $l625 ?? void 0, resend_dispatch: $m_c($m_qb), reason: $m_b("body_phase"), status: $m_b("none"), error_code: $m_sJn($l1210.code), query_source: $m_os($l11.querySource), request_id: $m_ye($l435) }), $l1231 === "retry") {
            $l471(), $l491("attempt_errored", $l435 ?? null, null), $l435 = null;
            continue e;
          }
        }
        let $l1247 = $l1212 && $l1210 !== null ? { label: `connection error (${$l1210.code})`, errorCode: $m_sJn($l1210.code), error: new $m_Zu({ cause: $l1202 instanceof Error ? $l1202 : void 0 }), attempt: Math.max(1, $l1232.retries), limit: $l622 } : $l1230?.cause === "serverError" && $l1202 instanceof $m_Ot ? { label: "server error", errorCode: $m_b("server_error"), error: $l1202, attempt: $l1232.afterThinkingOnly, limit: $m_MJe } : void 0;
        if ($l1231 === "retry" && $l1247 !== void 0) {
          let $l1248 = $l1247.attempt;
          if ($m_t(`Stream ${$l1247.label} \u2014 retrying streaming (${$l1248}/${$l1247.limit})`, { level: "warn" }), $m_i("tengu_streaming_stale_connection_retry", { model: $m_Et($l11.model), error_code: $l1247.errorCode, retry_attempt: $l1248, request_id: $m_kg($l435) }), $l471(), $l491("attempt_errored", $l435 ?? null, null), $l1089) $l287();
          if ($l1089 && $l600 !== "credited") $l601(), yield* $l1095({ responseUnfinished: true });
          $l435 = null;
          let $l1249 = $m_PF($l1248, void 0, void 0, $l11.random), $l1250 = { ...$m_aJn($l1247.error), rateLimits: null };
          $l618 = true, $l11.onRetryStatus?.({ kind: "retrying", error: $l1250, attempt: $l1248, maxRetries: $l1247.limit, retryInMs: $l1249, deadline: $l12.now() + $l1249 }), yield $m_N2($l1250, $l1249, $l1248, $l1247.limit, "connection_retry"), await $m_Y($l1249, $l4, { clock: $l12 });
          continue e;
        }
        if ($l1212 && $l598 === null && $l1089) $l601();
        if ($l999 && $l1231 === "retry") {
          $m_t(`Stream idle timeout before first event \u2014 retrying streaming (${$l1232.stalls}/${$m_CJe})`, { level: "warn" }), $m_i("tengu_streaming_watchdog_retry", { model: $m_Et($l11.model), retry_attempt: $l1232.stalls, request_id: $m_kg($l435) }), $l471(), $l491("attempt_errored", $l435 ?? null, null), $l435 = null;
          continue e;
        }
        if (!$l1085 && $l598 === null && !$l623.outOfApiAttempts() && $l724($l1202) !== void 0) {
          if ($l623.undoLastCount(), $l1089) $l601(), $l287();
          $l471(), $l491("attempt_errored", $l435 ?? null, null), yield* $l1095({ responseUnfinished: true }), $l435 = null;
          continue e;
        }
        if ($l1227 === "dlpDenied") throw $m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $m_b($m_nDe), attemptNumber: $l432, maxOutputTokens: $l605, thinkingType: $m_c($l34.type), fallback_disabled: true, request_id: $m_kg($l435), fallback_cause: $m_b($m_nDe), any_stream_event_yielded: $l1083 }), $l1202;
        if ($l1227 === "escapeMonitor") throw $m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $m_b($m_Dne), attemptNumber: $l432, maxOutputTokens: $l605, thinkingType: $m_c($l34.type), fallback_disabled: true, request_id: $m_kg($l435), fallback_cause: $m_b($m_Dne), any_stream_event_yielded: $l1083 }), $l1202;
        if ($l1202 instanceof $m_Ot && $m_GW($l1202)) {
          let $l1251 = $l1085 ? null : $m_DLr($l1202, { markedAtDispatch: $l461, querySource: $l11.querySource, wait: $l462 }), $l1252 = $l623.outOfApiAttempts() ? null : $l1251;
          if (!$l1085) {
            if ($l1089) $l601(), $l287();
            let $l1253 = $l1232.overloaded;
            if ($l1252 !== null || $l1231 === "retry") {
              if ($m_D2($l587, $l25), $m_t($l1252 !== null ? `Mid-stream 529 before content at lower priority \u2014 waiting ${$l1252.delayMs}ms for capacity (attempt ${$l1252.attempt})` : `Mid-stream 529 before content \u2014 retrying streaming (${$l1253}/${$m_dZ})`, { level: "warn" }), $l1252 !== null) $l623.undoLastCount();
              $m_i("tengu_streaming_529_retry", { model: $m_Et($l11.model), retry_attempt: $l1252 !== null ? $l1252.attempt : $l1253, request_id: $m_ye($l435), ...$l1252 !== null && { is_low_priority: true } }), $l471(), $l491("attempt_errored", $l435 ?? null, null), yield* $l1095({ responseUnfinished: true }), $l435 = null, $l618 = true;
              let $l1254 = $l1252?.delayMs ?? $m_PF($l1253, void 0, void 0, $l11.random);
              $l11.onRetryStatus?.($l1252 !== null ? { kind: "low_priority_waiting", attempt: $l1252.attempt, retryInMs: $l1254, deadline: $l12.now() + $l1254 } : { kind: "retrying", error: { ...$m_aJn($l1202), rateLimits: null }, attempt: $l1253, maxRetries: $m_dZ - 1, retryInMs: $l1254, deadline: $l12.now() + $l1254 }), await $m_Y($l1254, $l4, { clock: $l12 });
              continue e;
            }
            if ($l11.fallbackModel && $l1231 === "useFallbackModel") throw $m_D2($l587, $l25), $m_i("tengu_api_opus_fallback_triggered", { original_model: $m_Et($l11.model), fallback_model: $m_Et($l11.fallbackModel), provider: $m_gA(), source: $m_b("mid_stream") }), $m_f("api_request", "api_request_fallback_triggered"), new $m_pD($l11.model, $l11.fallbackModel, "overloaded", $l1202);
          }
        }
        if ($l1231 === "fail") throw $m_t(`Error streaming (non-streaming fallback disabled): ${$m_d($l1224)}`, { level: "error" }), $m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $l1225, attemptNumber: $l432, maxOutputTokens: $l605, thinkingType: $m_c($l34.type), fallback_disabled: true, request_id: $m_kg($l435), fallback_cause: $m_c($l1217), error_name: $l1220, error_constructor: $l1221, error_code: $l1222, any_stream_event_yielded: $l1083 }), $l603 = true, $l619 = $l999, $l1224;
        if (!$l1085) $m_D2($l587, $l25);
        if ($m_t(`Error streaming, falling back to non-streaming mode: ${$m_d($l1224)}`, { level: "error" }), $l602 = true, $l593) $m_B7t("non_streaming");
        if ($l359 !== void 0) $l287();
        $l289 = $l12.now();
        {
          let $l1255 = await $l324?.onStreamFallback($l234, $l435 ?? void 0);
          if ($l1255) $l234 = $l253($l1255.messages, "microcompact"), $l922($l1255.clearedIds, $l1255.clearedContent);
        }
        if ($m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $l1225, attemptNumber: $l432, maxOutputTokens: $l605, thinkingType: $m_c($l34.type), fallback_disabled: false, request_id: $m_kg($l435), fallback_cause: $m_c($l1217), error_name: $l1220, error_constructor: $l1221, error_code: $l1222, any_stream_event_yielded: $l1083 }), $m_X("info", "cli_nonstreaming_fallback_started"), $m_i("tengu_nonstreaming_fallback_started", { request_id: $m_kg($l435), model: $m_Et($l11.model), fallback_cause: $m_c($l1217) }), $l491("attempt_errored", $l435 ?? null, null), $l451 = $l435, $l435 = null, yield* $l1095({ responseUnfinished: true }), yield* $l925(), yield { type: "streaming_fallback_began", cause: $l1217 }, yield* $l926({ requestId: $m_q_e($l451), analyticsRequestId: $m_kg($l451), cause: $l1217, errorName: $l1218, connectionCode: $l1219, stall: $l1205 }, $l1226 && ($l1230?.outlastedNonStreamingTimeout ?? false))) return;
      } finally {
        if ($l977(), $l437 !== void 0) $m_Bqe($l437);
      }
      $l491("stream_completed", $l435 ?? null, $l598 !== null ? $l290 : null), yield* $l1095({ responseUnfinished: false });
      break e;
    }
    if ($l338?.settle({ kind: "ok" }, $l435, $l359?.id), $l620 !== void 0) $l620.ended = "completed";
  } catch ($l1256) {
    if (yield* $l925(), $l491($l4.aborted ? "aborted" : "attempt_errored", $l435 ?? null, null), $l1256 instanceof $m_pD) throw $l623.reportHttpFailure($l1256.originalError, "useFallbackModel", { fallbackModelCouldHelp: $l1256.reason !== "overloaded" }), $l338?.settle({ kind: "error", error: $l1256 }, $l435), $l1256;
    let $l1257 = $l1256 instanceof $m_Wc ? $l1256.originalError : void 0, $l1258 = ($l1257 === void 0 ? "fail" : $l623.onWithRetryGaveUp($l1257)) === "retryWithoutStreaming", $l1259 = $l1256, $l1260 = false;
    if ($l1258) {
      let $l1261 = ($l1257 instanceof $m_Ot ? $l1257.requestID : void 0) ?? "unknown";
      if ($m_t("Streaming endpoint returned 404, falling back to non-streaming mode", { level: "warn" }), $l602 = true, $l289 = $l12.now(), $l324?.strip(), $m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $m_b("404_stream_creation"), attemptNumber: $l432, maxOutputTokens: $l605, thinkingType: $m_c($l34.type), request_id: $m_kg($l1261), fallback_cause: $m_b("404_stream_creation"), any_stream_event_yielded: false }), $m_X("info", "cli_nonstreaming_fallback_started"), $m_i("tengu_nonstreaming_fallback_started", { request_id: $m_ye($l1261), model: $m_Et($l11.model), fallback_cause: $m_b("404_stream_creation") }), $l593) $m_B7t("non_streaming");
      yield { type: "streaming_fallback_began", cause: "404_stream_creation" };
      try {
        if ($l451 = $l435 ?? ($l1261 !== "unknown" ? $l1261 : null), yield* $l926({ requestId: $m_q_e($l1261), analyticsRequestId: $m_kg($l1261), cause: "404_stream_creation", errorName: null, connectionCode: null, stall: null }, false)) return;
        if ($l1260 = true, $l620 !== void 0) $l620.ended = "completed";
      } catch ($l1262) {
        if ($l1262 instanceof $m_pD) throw $l338?.settle({ kind: "error", error: $l1262 }, $l435), $l1262;
        $l1259 = $l1262;
      }
    }
    if (!$l1260) {
      if ($l68 && ($l1259 instanceof $m_mZ || $l11.withoutToolSearch)) $m_Wzr($l27);
      if ($l1259 instanceof $m_mZ) throw $l157?.splice(0, $l157.length), $l1259;
      $m_t(`${$l1258 ? "Non-streaming fallback also failed" : "Error in API request"}: ${$m_d($l1259)}`, { level: "error" });
      let $l1263 = $l1259, $l1264 = $l11.model;
      if ($l1259 instanceof $m_Wc) $l1263 = $l1259.originalError, $l1264 = $l1259.retryContext.model;
      if ($l1263 instanceof $m_cu) {
        $l338?.settle({ kind: "aborted" }, $l1258 ? null : $l435, $l1258 ? void 0 : $l359?.id), $l471();
        return;
      }
      if ($l620 !== void 0 && $m_ZP($l1263)) $l620.ended = "filtered_again";
      if ($l1263 instanceof $m_Ot) $m_Ken($l1263, $m_Hmn($l11), $l12.now(), $l317, $l11.storageV5);
      let $l1265 = $l435 || ($l1263 instanceof $m_Ot ? $m_f8e($l1263.requestID || $l1263.error?.request_id, $l1263.headers) : void 0);
      $l338?.settle({ kind: "error", error: $l1263 }, $l1265), $m_gfn({ isLowPriority: $l461, dispatch: $l625, error: $l1263, model: $l1264, messageCount: $l234.length, messageTokens: $m_DZ($l234), durationMs: Math.max(0, Math.round($l12.monotonicNow() - $l431)), durationMsIncludingRetries: Math.max(0, Math.round($l12.monotonicNow() - $l430)), attempt: $l432, requestId: $l1265, clientRequestId: $l458, didFallBackToNonStreaming: $l602, nonStreamingFallbackSkipped: $l603, observedResponse: $l602 ? void 0 : $l464, queryTracking: $l11.queryTracking, querySource: $l11.querySource, accountMemoryKeys: $l428, messageClientPlatform: $l11.messageClientPlatform, llmSpan: $l429, fastMode: $l609, previousRequestId: $l19, effort: $l188, agentContext: $l11.agentContext, attribution: $m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), promptTooLongIsHandled: $l11.promptTooLongIsHandled });
      let $l1266 = { ...$m_X7($l1263, $l1264, { messages: $l0, messagesForAPI: $l234, requestId: $l1265 }), perTurnEffort: $l326, perTurnTiming: $l327, ...$l619 && { streamWatchdogGaveUp: true }, ...($m_gJe($l1263) || $m_Mze($l1263) || $m_eun($l1263) || $l1263 instanceof $m_Ot && $l1263.type === "billing_error") && { resendCannotCure: true } };
      if ($m_bX($l1263) && !$l623.outOfApiAttempts()) return $l1266;
      yield $l1266, $l471();
      return;
    }
  } finally {
    if ($l189) $m_OTt($l312, $l599, Date.now());
    if ($m_jM("api_call", $l976), $l380(), $m_ZOo($l11.querySource, $l11.agentId), $l618) $l11.onRetryStatus?.(null);
    if ($l620 !== void 0) $m_Dmn($l620, { now: $l12.monotonicNow(), stopReason: $l604?.message.stop_reason ?? $l598, aborted: $l4.aborted, model: $l11.model, querySource: $l11.querySource, clientRequestId: $l602 ? void 0 : $l458 });
    if ($l491($l4.aborted ? "aborted" : "attempt_errored", $l435 ?? null, null), $l338?.settle($l598 !== null && $l435 ? { kind: "ok" } : $l4.aborted ? { kind: "aborted" } : { kind: "other_exit" }, $l435, $l359?.id), $l471(), $l604) {
      let $l1267 = $l604.message.usage;
      if ($l290 = $m_Mwe($m_em, $l1267), $l598 = $l604.message.stop_reason, $l598 === "refusal") $m_iZ({ model: $l25, requestId: $l435 || void 0, querySource: $l11.querySource, effort: $l188, fastMode: $l609, attempt: $l432, attribution: $m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: false, stopDetails: $l604.message.stop_details ?? null, agentContext: $l11.agentContext });
      let $l1268 = $l640?.servedFallbackModel, $l1269 = $l1268 !== void 0;
      if (!$l638) $m_Z2r($m_Pn($l11.model), $l604.message.model);
      let $l1270 = $l1269 && $l640 !== void 0 ? $m_R7e($l640.entries, { speed: $l290.speed, inferenceGeo: $l290.inference_geo, serverToolUse: $l290.server_tool_use }, $l598) : $m_Hke($l25, $l290);
      $l597 += $m_i3e($l1270, $l290, $l1269 ? $m_uUn($l11.serverRefusalFallback?.model, $l1268) : $l11.model, $l11.querySource, $l188, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool);
    }
    if ($l359 !== void 0 || $l604 !== void 0) $l287();
  }
  if ($l435 && $l189) $m_L4o($l435);
  if ($l189) $m_$Le($m_PI($l290));
  if ($l190) $m_zmn($l191, () => {
    let $l1271 = $l9(), $l1272 = $m_PI($l290);
    return Number.isFinite($l1271) ? Math.max($l1271 + $l290.output_tokens, $l1272) : $l1272 || $l1271;
  });
  if ($m_GYt($l27, { isMainConversation: $l189 }), $l739(), $l698.served(), $l308() && $l608) $m_r1s($l608, { requestId: $l435, previousMessageId: $l24, model: $l11.model, is1hCacheTTL: $l284 === "1h", querySource: $l11.querySource, queryDepth: $l11.queryTracking?.depth });
  let $l1273 = $l234.length, $l1274 = $m_DZ($l234), $l1275 = $m_Oy() ? void 0 : $m_hfn($l234, $l11.model), $l1276 = $m_Oy() ? void 0 : $m_oEr($l291, $l294, $m_Qfr($l3, $l293)), $l1277 = $l189 ? $m_Y4o() : void 0;
  $l11.getToolPermissionContext().then(($l1278) => {
    $m_yfn({ isLowPriority: $l461, dispatch: $l625, uncoveredTail: $l264, model: $l587[0]?.message.model ?? $l359?.model ?? $l11.model, preNormalizedModel: $l11.model, usage: $l290, start: $l431, startIncludingRetries: $l430, attempt: $l432, messageCount: $l1273, messageTokens: $l1274, requestId: $l435 ?? null, rawRequestBodyId: $l452, accountMemoryKeys: $l428, clientRequestId: $l602 ? void 0 : $l458, firstAttemptRequestId: $l451 ?? null, stopReason: $l598, ttftMs: $l588, firstContentMs: $l602 ? null : $l589 ?? null, streamEventCount: $l602 ? void 0 : $l590, queryOverheadMs: $l594, didFallBackToNonStreaming: $l602, querySource: $l11.querySource, promptCacheTtl: $l280 ? $l282 : void 0, promptCacheMessagesTtl: $l280 && !$l11.skipMessageCacheMarkers && $l285 ? "5m" : void 0, messageClientPlatform: $l11.messageClientPlatform, headers: $l606, extraEventFields: { ...{}, ...$m_qYt($l27) }, costUSD: $l597, isDefaultModel: $l189 ? $l11.isDefaultModel : void 0, defaultModel: $l189 ? $l11.defaultModel : void 0, ...$l194($l325), carriedEffort: $l187, carriedEffortEnded: $l1277, queryTracking: $l11.queryTracking, permissionMode: $l1278.mode, proactivityLevel: $l11.proactivityLevel, newMessages: $l587, requestContentTelemetry: $l1275, requestPrefixTelemetry: $l1276 && { ...$l1276, systemPromptSource: $m_de($l11.systemPromptSource), snapshotHash: $l11.systemPromptSnapshotHash }, llmSpan: $l429, globalCacheStrategy: $l125, requestSetupMs: $l431 - $l430, attemptStartTimes: $l433, fastMode: $l609, previousRequestId: $l19, betas: $l340, thinkingPrefixMismatchBehavior: $l475, echoWireToolInputs: $l49, effort: $l325, turnOrigin: $l192, agentContext: $l11.agentContext, attribution: $m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool) });
  }).catch(($l1279) => $m_l($m_Xe($m_U($l1279), "api success logging failed"))), $l471();
}
;
