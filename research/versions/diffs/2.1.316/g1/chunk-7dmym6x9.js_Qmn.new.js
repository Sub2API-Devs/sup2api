async function* SELF($l0, $l1, $l2, $l3, $l4, { modelFacts: $l5, ...$l6 }) {
  let { fallbackModel: $l7, accessFallbackModel: $l8 = $l6.accessFallbackModel } = $m_X9o($l6.model, $l6.fallbackModel, $m_sjr), $l9 = $m_Umr($l0, $l6.model), $l10 = $m_Wmr($l6.model, $l8, $l9), $l11 = $l7 === $l6.fallbackModel ? $l6 : { ...$l6, fallbackModel: $l7 }, $l12 = $l11.clock ?? $m_ja, $l13 = ($l14) => $m_BH($l11.querySource) ? $m_a2($l14) : $l14(), $l15 = $l13(() => $m_Je($l11.model)), $l16 = $m_ss($l11.querySource) === "main" && !$l11.agentId;
  if ($l16) $m_Mx("model_gates");
  if (!$m_kt() && ($m_tpe($l15) || $m_H4e($l15) || $m_s4t($l15)) && (await $m_v2("tengu-off-switch", { activated: false })).activated) {
    $m_a("tengu_off_switch_query", {}), yield $m_oJ(Error($m_H4e($l15) ? $m_Iht : $m_Pht), $l11.model);
    return;
  }
  let $l17 = null;
  try {
    $l17 = await $m_i7s($l15);
  } catch ($l18) {
    $m_t(`tengu-model-error-overrides block check failed: ${$l18}`, { level: "error" });
  }
  if ($l17 !== null) {
    if ($l11.fallbackModel !== void 0) throw $m_a("tengu_off_switch_query", { tier: $m_b("per_model_block"), outcome: $m_b("fallback") }), new $m_YO($l11.model, $l11.fallbackModel, "model_blocked", void 0, $l17);
    $m_a("tengu_off_switch_query", { tier: $m_b("per_model_block") }), yield $m_Gs({ content: $l17, error: "rate_limit" });
    return;
  }
  let $l19 = $m_mmr($l0), $l20 = $m_mze($l0, $l11.agentContext), $l21 = $m_F7s($l11.agentContext, $l20);
  if ($l21 && $m_ps()) await $NEW_chunk_hwmsct5x_js_qXo($l21);
  let $l22 = $NEW_chunk_e6aww6q8_js_gSr($l0), $l23 = $NEW_chunk_e6aww6q8_js_hSr($l0), $l24 = $m_QFr($l0), $l25 = $m_n8e($l0), $l26 = $m_Te() === "bedrock" && $l11.model.includes("application-inference-profile") ? await $m_m$e($m_Wn($l11.model)) ?? $l11.model : $l11.model;
  if ($m_Gve($l11.model, $l11.querySource), $m_gTe()) await $m_Lsn($l11.model, $l11.credentials, $l11.storageV5);
  if ($m_gg("query_tool_schema_build_start"), $l16) $m_Dx("model_gates"), $m_Mx("tool_schema_build");
  let $l27 = $l11.querySource.startsWith("repl_main_thread") || $l11.querySource.startsWith("agent:") || $l11.querySource === "sdk" || $l11.querySource === "hook_agent", $l28 = $m_B1o($l11.stickyBetas);
  if (!$l28.declaredToolsDecided) $l13(() => $m_Fln($l28, $l11.recordedWireShape, $l11.model));
  let $l29 = $l13(() => $m_xvn($l11.model, { isAgenticQuery: $l27 })), $l30 = $l13(() => $m_Je($l26)), $l31 = $l5?.model === $l26 && !$m_BH($l11.querySource) ? $l5 : $l13(() => $m_fc($l26));
  if ($m_Z1t() && ($m_eA() || $l11.advisorModel !== void 0)) $l29.push($m_dYt);
  if ($l13(() => $m_CYn($l26)) && $l31.thinking.supported && !$l29.includes($m_uF)) $l29.push($m_uF);
  let $l32 = $l11.fallbackCreditCode !== void 0 && $l11.fallbackCreditMintModel !== void 0 && $m_Lmr($l11.fallbackCreditMintModel, $l11.model), $l33 = $l32 ? $l11.fallbackCreditMintModel : void 0, $l34 = $l33 ?? $l11.model, $l35 = $m_rui($l2, $l31.thinking.alwaysOn || $l33 !== void 0 && $l13(() => $m_Fot($l33))), $l36 = $l33 === void 0 ? $m_hA($l11.model) : void 0;
  if ($l36 !== void 0 && !$l28.declaredToolsDecided) {
    let $l37 = $m_HTt($l28);
    for (let $l38 of $m_IPt($l36)) $m_Mg($l28, $l38);
    if ($l11.stickyBetas === void 0) $m_qZ($l28, $l37);
  }
  let $l39 = ($l40, $l41) => {
    $m_Mg($l28, $l40);
    let $l42 = "in this conversation";
    if ($l41 && $l36 !== void 0) $m_Rfs($l36, $l40), $l42 += `, or by new ones on ${$l36} in this process`;
    $m_t(`[betas] the API refused ${$l40.header}; not sent again ${$l42}`, { level: "warn" });
  };
  $m_lWr($l3), await $m_WZe($l3);
  let $l43 = $l11.withoutToolDescribeHooks ? "engine" : "hooks", $l44 = ($l45, $l46) => $l43 === "engine" ? $m_yKe($l45, $l46) : $m_cz($l45, $l46);
  if (!$l11.withoutToolDescribeHooks) await $m_X3t($l3, ($l47) => $m_YH($l47, { getToolPermissionContext: $l11.getToolPermissionContext, tools: $l3, agents: $l11.agents, allowedAgentTypes: $l11.allowedAgentTypes, model: $l34, enginePlacement: $m_yKe($l47) ? "deferred" : "listed", querySource: $l11.querySource }));
  let $l48 = $l27 || $l11.forkPointUuid !== void 0 ? $l13(() => $m_pqs($l11.advisorModel, $l34)) : void 0, $l49 = !$m_BH($l11.querySource) && await $m_K0r($l34, $l3, $l11.getToolPermissionContext, $l11.agents, "query", $l11.credentials, $l11.recordedToolDescriptions, $l28) && $l11.toolSearchRefusal === void 0, $l50 = $m_jT($l0, $l11.echoWireToolInputs), $l51 = $l11.resumeIncompleteThinking === true;
  $l29 = $l13(() => $m_M3s($l28, $l29, $l11.model));
  let $l52 = false;
  if (!$l49 && $l11.toolSearchRefusal === void 0 && !$m_BH($l11.querySource)) try {
    $l52 = $l13(() => $m_wWr($l28, $l34, { toolSearchToolFilteredOut: $m_z0r($l34, $l3, $l28), toolPoolRefreshes: $l11.toolPoolRefreshes === true, aheadOfRequest: false }));
  } catch ($l53) {
    $m_l($m_N($l53));
  }
  if (!$l28.declaredToolsDecided) {
    let $l54;
    try {
      $l54 = $l11.recordedDeferredTools?.();
      for (let $l55 of $l54?.nameOnlyAnnouncements ?? []) $l28.nameOnlyAnnouncements.add($l55);
      if ($l54 !== void 0) $m_vXn($l0, [...$l54.entries.values()], { strippedReferences: $l54.strippedReferences, ...($l49 || $l52) && $m_Pet($l28) && { surfacedCarrier: $l28 } });
    } catch ($l56) {
      $m_l($m_N($l56));
    }
    try {
      let $l57 = $l54?.toolInputCopies;
      if ($l57 !== void 0 && $l57.size > 0 && $m_F1o($l11.querySource) && $NEW_chunk_e6aww6q8_js_rPt($l0, $l50)) $m_tke($l0, $l57);
    } catch ($l58) {
      $m_l($m_N($l58));
    }
  }
  let $l59 = /* @__PURE__ */ new Set(), $l60 = /* @__PURE__ */ new Set(), $l61 = true;
  try {
    $l61 = $m_pVr();
  } catch ($l62) {
    $m_l($m_N($l62));
  }
  try {
    if ($l29.includes($m_xS) && $l13(() => $NEW_chunk_a76knw89_js_poi($l28, $l34))) $l59 = $m_r3s($l0, $l28.nameOnlyAnnouncements), $l60 = $m_o3s($l0, $l28.nameOnlyAnnouncements);
  } catch ($l63) {
    $m_l($m_N($l63));
  }
  let $l64, $l65 = 0;
  if ($l49) try {
    let $l66 = $m_oP(), $l67 = $m_idn($l28, $l3, ($l68) => $l44($l68, $l66), $l34, !$l0.some(($l69) => $l69.type === "assistant"));
    if ($l64 = $l67, $l67 !== void 0) $l65 = $m_U($m_bWr($l3, $l28), ($l70) => $l67.has($l70.name) && $l44($l70, $l66));
  } catch ($l71) {
    $m_l($m_N($l71));
  }
  let $l72, $l73 = !$l28.declaredToolsDecided, $l74 = $NEW_chunk_a76knw89_js_coi(), $l75 = 0;
  if ($l49 || $l52) {
    let $l76;
    if (!$l28.declaredToolsDecided) try {
      $l76 = await $l11.getToolPermissionContext();
    } catch ($l77) {
      $m_l($m_N($l77));
    }
    try {
      $l72 = $m_vWt($l28, () => $l11.recordedToolDescriptions && { names: $l11.recordedToolDescriptions.keys(), servers: $l11.recordedToolServers, entries: $l11.recordedToolEntries }, $l3, { latch: true, permissionContext: $l76 });
    } catch ($l78) {
      $m_l($m_N($l78)), $l64 = void 0;
    }
  } else if ($l73) $l28.declaredTools = void 0;
  $m_mPt($l28);
  let $l79 = $l72 ?? $l64, $l80 = /* @__PURE__ */ new Set(), $l81 = 0;
  if ($l49 || $l52) try {
    let $l82 = $m_oP();
    for (let $l83 of $l3) {
      let $l84 = $l49 && $l44($l83, $l82);
      if ($l79 === void 0 ? $l52 ? false : $l84 : $m_$V($l83, $l79, $l3, { toolSearchAbsent: $l52, placements: $l43, nonDeferrableBuiltins: $l82 })) {
        if ($l80.add($l83.name), !$l84) $l81++;
      }
    }
  } catch ($l85) {
    $m_l($m_N($l85)), $l72 = void 0, $l79 = void 0, $l80.clear(), $l81 = 0;
    let $l86 = $m_oP();
    for (let $l87 of $l3) if ($l49 && $l44($l87, $l86)) $l80.add($l87.name);
  }
  let $l88 = $m_Cj().generation, $l89 = $l49 || $l52 ? $m_$1o($l0, $l3, $l11.querySource, { keepMcp: !$m_nq($l3), surfacedOnWire: $l28.surfacedOnWire, ...$l74 && { declaredInline: $l72 } }) : void 0;
  if ($l49 && $l80.size === 0 && !($l79 !== void 0 && $l79 === $l64 && $l65 > 0) && (!$l11.hasPendingMcpServers || $m_nq($l3)) && !$l89?.kept.size && !$l72?.has($m_Ys)) {
    if ($m_t("Tool search disabled: no deferred tools available to search"), $l49 = false, $l74 && $l72 !== void 0 && $l89 !== void 0) try {
      $l89 = $m_$1o($l0, $l3, $l11.querySource, { keepMcp: !$m_nq($l3), surfacedOnWire: $l28.surfacedOnWire });
    } catch ($l90) {
      $m_l($m_N($l90));
    }
  }
  let $l91 = $l49 ? "tool_search" : $l52 ? "tool_addition" : void 0, $l92, $l93, $l94 = 0;
  if ($l91 !== void 0) {
    let $l95 = $m_uce($l0, { surfaced: $m_Pet($l28) ? { exceptAnnouncements: $l28.nameOnlyAnnouncements } : $l28.surfacedOnWire }), $l96 = /* @__PURE__ */ new Set();
    if ($l59.size > 0) try {
      $l96 = $l61 ? new Set($m_obe($l0).map(($l97) => $l97.toolName)) : $m_uce($l0);
    } catch ($l98) {
      $m_l($m_N($l98));
    }
    $l92 = $l3.filter(($l99) => {
      if (!$l80.has($l99.name)) return true;
      if ($m_xt($l99, $m_Ys)) return true;
      return $l95.has($l99.name) && (!$l59.has($l99.name) || $l96.has($l99.name));
    });
    try {
      let $l100 = $m__Wr($l92, $l72 ?? $l64);
      $l92 = $l100.tools, $l75 = $l100.redeclared.length;
    } catch ($l101) {
      $m_l($m_N($l101));
    }
  } else {
    $l92 = $l3.filter(($l102) => {
      if ($m_xt($l102, $m_Ys)) return false;
      if ($l59.has($l102.name)) return false;
      return true;
    });
    let $l103 = $m_nmn($l28);
    if ($l103 !== void 0) try {
      let $l104 = await $m_E3s($l103, $l3, { mcpClients: $l11.mcpClients ?? [], getPermissionContext: $l11.getToolPermissionContext, byValue: $l59 });
      $l93 = $l59.size === 0 ? $l104.kept : $l104.kept.without($l59), $l94 = $l104.unread;
      let $l105 = $m__Wr($l92, $l93);
      $l92 = $l105.tools, $l75 = $l105.redeclared.length;
    } catch ($l106) {
      $m_l($m_N($l106));
    }
    else if ($l73 && $l11.recordedToolDescriptions === void 0) try {
      $l92 = $m_bWr($l92, $l28);
    } catch ($l107) {
      $m_l($m_N($l107));
    }
  }
  let $l108 = $m_Z9($m__Xn($l92));
  $m_zpr($l108, $l11.querySource);
  let $l109 = $m_Ud($l11.model), $l110 = $l49 ? $m_Wot() : null;
  if ($l110 && $l109 !== "bedrock") {
    if (!$l29.includes($l110)) $l29.push($l110);
  }
  let $l111, $l112 = $m_A6(), $l113 = ($l114) => $l80.has($l114.name) || $l49 && $m_lmr($l114), $l115 = ($l116) => $l89?.kept.has($l116.name) === true, $l117 = true;
  try {
    $l117 = $l108.some(($l118) => ($l72?.has($l118.name) ?? true) && !$l113($l118) && !$l115($l118)) || $l72 !== void 0 && $m_G1o($l72, { pool: $l3, keptDeferred: $l89?.kept.keys() ?? [], keepMcp: !$m_nq($l3) }).length > 0;
  } catch ($l119) {
    $m_l($m_N($l119));
  }
  let $l120 = ($l121) => $l91 !== void 0 && ($l113($l121) || $l117 && $l115($l121));
  if ($l91 !== void 0 && $l72 === void 0) try {
    let $l122 = $m_Z9($l92).filter(($l123) => !$l120($l123));
    if ($l79 !== void 0) {
      if ($m_vxn($l28, new $m_K7($l122)), $l65 > 0) $m_g("host_upfront_tools", { named: $m_i.CLAUDE_CODE_UPFRONT_TOOLS?.length ?? 0, sent: $l65 });
    } else $m_k3s($l28, $l122);
  } catch ($l124) {
    $m_l($m_N($l124));
  }
  let $l125;
  if ($l91 === void 0 && $l73 && $m_nmn($l28) === void 0 && ($l11.mcpClients ?? []).some(($l126) => $l126.type === "pending")) try {
    $l125 = await $m_v3s($l11, $l3, $l59);
  } catch ($l127) {
    $m_l($m_N($l127));
  }
  try {
    $l93 = $m_j1o($l28, $l91 !== void 0, () => $m_W1o($m_Z9($l92), $l3, $l125 ?? $l93?.recordedOnly));
  } catch ($l128) {
    $m_l($m_N($l128));
  }
  let $l129 = $l112 && $l108.some(($l130) => $l130.isMcp === true && !$l120($l130));
  if ($l112 && !$l29.includes($m_vYe)) $l29.push($m_vYe);
  let $l131 = $l112 ? $l129 ? "none" : "system_prompt" : "none", $l132 = $m_oP(), $l133 = $l11.withoutToolDescribeHooks ? void 0 : $l11.redescribedTools, $l134 = await Promise.all($l108.map(($l135) => $m_YH($l135, { getToolPermissionContext: $l11.getToolPermissionContext, tools: $l3, agents: $l11.agents, allowedAgentTypes: $l11.allowedAgentTypes, model: $l34, enginePlacement: $m_yKe($l135, $l132) ? "deferred" : "listed", querySource: $l11.querySource, withoutToolDescribeHooks: $l11.withoutToolDescribeHooks, recordedDescription: $l120($l135) ? void 0 : $l11.recordedToolDescriptions?.get($l135.name), recordedEntry: $l120($l135) || $m_xt($l135, $m_Qa) ? void 0 : $l11.recordedToolEntries?.get($l135.name), isRedescribed: $l133?.has($l135.name) || void 0, deferLoading: $l120($l135), loadedThroughToolSearch: $l49 && $l120($l135) && $l44($l135, $l132) }))), $l136 = $m_Af($l11.agentContext) && $m_ss($l11.querySource) === "main";
  if ($m_l9t($l28, $l134, { redescribed: $l133, recorded: $l11.recordedToolDescriptions, isMainChain: $l136 }), $l136) try {
    let $l137;
    for (let $l138 of $l134) if ("name" in $l138 && "description" in $l138 && $m_xt($l138, $m_Fe)) {
      $l137 = $l138.description;
      break;
    }
    $NEW_chunk_apw2zhyn_js_Mts($l137);
  } catch ($l139) {
    $m_l($m_N($l139)), $NEW_chunk_apw2zhyn_js_Mts("");
  }
  let $l140 = [];
  if ($l91 !== "tool_search" && $l59.size > 0) try {
    let $l141 = new Set($l108.map(($l142) => $l142.name)), $l143 = $l3.filter(($l144) => $l59.has($l144.name) && !$l141.has($l144.name)), $l145 = new Set($m_Z9($m__Xn([...$l92, ...$l143])).map(($l146) => $l146.name));
    $l140 = await Promise.all($l143.filter(($l147) => $l145.has($l147.name)).map(($l148) => $m_YH($l148, { getToolPermissionContext: $l11.getToolPermissionContext, tools: $l3, agents: $l11.agents, allowedAgentTypes: $l11.allowedAgentTypes, model: $l34, enginePlacement: $m_yKe($l148) ? "deferred" : "listed", querySource: $l11.querySource, withoutToolDescribeHooks: $l11.withoutToolDescribeHooks, recordedDescription: $l11.recordedToolDescriptions?.get($l148.name), recordedEntry: $l11.recordedToolEntries?.get($l148.name), isRedescribed: $l133?.has($l148.name) || void 0, deferLoading: false })));
  } catch ($l149) {
    $m_l($m_N($l149)), $l140 = [];
  }
  let $l150 = new Map($l108.map(($l151, $l152) => [$l151.name, { schema: $l134[$l152], isMcp: $l151.isMcp === true }])), $l153 = $l91 !== void 0 ? $l72 : $l93, $l154 = $l13(() => $m_sWr($l34)), $l155 = [];
  if ($l153 !== void 0 && $l153.recordedOnly.size > 0) try {
    $l155 = $NEW_chunk_a76knw89_js_doi($l134, $l153, { pool: $l3, recordedEntries: $l11.recordedToolEntries, keptDeferred: $l117 ? $l89?.kept.keys() ?? [] : [], keepMcp: !$m_nq($l3), requestCarriesStructuredOutputs: $l13(() => $m_Pvn($l34)), requestDeclaresSearchCitations: $l154 });
  } catch ($l156) {
    $m_l($m_N($l156));
  }
  if ($m_I3s({ deferredLate: $l81, redeclared: $l75, fromRecord: $l155.length, queryDepth: $l11.queryTracking?.depth, toolSearchAbsent: $l91 === "tool_addition", noDeferredChannel: $l91 === void 0, unclassifiedDepartures: $l94 }), $l11.onInlineToolsDeclared) {
    let $l157 = new Map($l108.map(($l158) => [$l158.name, $l158])), $l159 = [];
    for (let $l160 of $l134) {
      if (!("input_schema" in $l160)) continue;
      let $l161 = $l157.get($l160.name), $l162 = $l161 === void 0 ? $l153?.recordedOnly.get($l160.name) : void 0;
      if ($l161 !== void 0 && !$l120($l161)) $l159.push({ name: $l160.name, description: $l160.description ?? "", schema: $l160, ...$l161.mcpInfo && { server: $l161.mcpInfo.serverName } });
      else if ($l162 !== void 0) {
        let $l163 = $l11.recordedToolEntries?.get($l160.name) ?? $l162.entry;
        $l159.push({ name: $l160.name, description: $l163.description ?? "", schema: $l163, ...$l162.server !== void 0 && { server: $l162.server } });
      }
    }
    $l11.onInlineToolsDeclared($l159);
  }
  if ($l91 !== void 0) {
    if ($l89) $NEW_chunk_a76knw89_js_Xri($l89, $l134, $l150, { requestCarriesStructuredOutputs: $l13(() => $m_Pvn($l34)), requestDeclaresSearchCitations: $l154 });
    let $l164 = $m_dun();
    if ($l164 && !$l92.some(($l165) => $m_xt($l165, $m_hqe)) && !$l89?.kept.has($m_hqe)) $l134.splice(Math.max($l134.length - 1, 0), 0, $l164);
    let $l166 = $m_U($l92, ($l167) => $l80.has($l167.name));
    $m_t(`Dynamic tool loading: ${$l166}/${$l80.size} deferred tools included`);
  }
  if ($m_gg("query_tool_schema_build_end"), $l16) $m_Dx("tool_schema_build");
  if ($m_a("tengu_api_before_normalize", { preNormalizedMessageCount: $l0.length }), $m_gg("query_message_normalization_start"), $l33 !== void 0) $m_a("tengu_fallback_credit_strip_as_mint_model", {});
  let $l168, $l169 = ($l170) => {
    $l171 = $l170.thread?.type === "continue";
    let $l172 = $NEW_chunk_e6aww6q8_js_p7t($l28, { ...$m_jmn($l170, $l173()), messages: $l174 }, { querySource: $l11.querySource, isMainThread: $m_Af($l11.agentContext), history: $l0, retryCause: $l175, retryKeepsHeal: $l176 === true, promptEpoch: $l11.promptRenderEpoch, accountMemoryEpoch: $l177 });
    if ($m_Tx($l11.querySource) !== null && $m_Rv()) try {
      $m_Lfn($l11.agentId, $l172 !== void 0);
    } catch ($l178) {
      $m_l($m_N($l178));
    }
    if ($l172?.tools !== void 0) $l179 = [...$l172.tools];
    if ($l172?.tools !== void 0 && $l170.tools !== void 0) {
      if ($l170.tools = [...$l172.tools], $l89) $m__3s($l89, $l170.tools);
    }
    let $l180 = $l170.tools ?? $l179;
    if ($l168 !== void 0 && $l180 !== void 0) $m_y3s($l168, $l180);
    if ($l172 === void 0) return;
    if ($l172.system !== void 0) {
      let $l181 = typeof $l172.system === "string" ? $l172.system : [...$l172.system];
      if ($l182 = $l181, !$l183) $l170.system = $l181;
    }
    if ($l172.messages !== void 0) {
      $l174 = [...$l172.messages];
      let $l184 = $m_r9t($l174, $l170.messages.length);
      if ($m_ymr($l184)) try {
        let $l185 = $m_El($l184);
        $m_D6e($l185), $l184 = $l185;
      } catch {
      }
      $l170.messages = $l184;
    }
  }, $l186 = $m_sm($l28, $m_XI), $l187 = $l186 || $m_sm($l28, $m_E2), $l188 = $l187 || $m_sm($l28, $m_U6), $l189 = $m_sm($l28, $m_Gq);
  if ($l29 = $l29.filter(($l190) => !$m_sm($l28, $l190) && !($l187 && $l190 === $m_E2) && !($l188 && $l190 === $m_U6)), $l33 !== void 0) {
    let $l191 = $l13(() => $m_xvn($l33, { isAgenticQuery: $l27 })), $l192 = ($l193) => {
      if ($l191.includes($l193)) {
        if (!$l29.includes($l193)) $l29.push($l193);
      } else $l29 = $l29.filter(($l194) => $l194 !== $l193);
    };
    if (!$l186) $l192($m_XI);
    if (!$l187) $l192($m_E2);
    if (!$l188) $l192($m_U6);
    $l29 = $l13(() => $m_D3s($l28, $l29, $l33, $l11.model)), $l192($m_kpe);
  }
  let $l195 = !$m_BH($l11.querySource) && !$l189 && $l29.includes($m_XI) && $l13(() => $m_Ive($l33 ?? $l11.model));
  if ($l195 && !$l29.includes($m_Gq)) $l29.push($m_Gq);
  let $l196 = $l13(() => $m_Bnr({ loopEffort: $l11.refusalFallbackEffort, continuesMainConversation: $m_cW($l11.agentContext) }, $l26)), $l197 = $l13(() => $m_kS($l26, $l11.effortValue, { turnEffort: $l11.turnEffort, hookEffortValue: $l11.hookEffortValue, carriedEffort: $l196 })), $l198 = () => $NEW_chunk_e6aww6q8_js_uEe($l26, $l11.querySource), $l199 = $NEW_chunk_e6aww6q8_js_yV($l197, $l198()), $l200 = $l196 === null ? void 0 : { level: $l196, outcome: $m_foi({ carried: $l196, withIt: $l199, withoutIt: $l13(() => $m_kS($l26, $l11.effortValue ?? $l11.effortSetAsideByHold, { turnEffort: $l11.turnEffort, hookEffortValue: $l11.hookEffortValue, carriedEffort: null })), isSavedSetAside: $l11.effortSetAsideByHold !== void 0 }) }, $l201 = $l13(() => $m_ES($l26) && $l199 !== void 0 ? $m_U0($l199) : void 0), $l202 = $m_Af($l11.agentContext) && ($l11.querySource.startsWith("repl_main_thread") || $l11.querySource === "sdk"), $l203 = $l11.querySource.startsWith("repl_main_thread") || $l11.querySource === "sdk", $l204 = $l202 ? "foreground" : $l11.agentContext.agentId;
  if ($l203) $m_Xmn($l204, $l9);
  let $l205;
  if ($l202) try {
    $l205 = $m_fgn($l0);
  } catch ($l206) {
    $m_l($m_N($l206));
  }
  let $l207 = ($l208) => {
    if (!$l202 || $l208 === void 0) return {};
    try {
      let $l209 = $m_VZ($l26);
      return { isDefaultEffort: $l208 === $l209, defaultEffortLevel: $l209 };
    } catch ($l210) {
      return $m_l($m_N($l210)), {};
    }
  }, $l211 = typeof $l199 === "string" && !($l35.type === "disabled" && $l35.mechanical === true) ? $l201 : void 0, $l212 = $l29.includes($m_U6) ? $m_Vcn(/* @__PURE__ */ new Date(), $m_cqr()) : void 0, $l213 = $l134.some(($l214) => !("defer_loading" in $l214 && $l214.defer_loading === true)) || ($l11.extraToolSchemas ?? []).some(($l215) => !("defer_loading" in $l215 && $l215.defer_loading === true)), $l216 = $l11.advisorDeferred === true && $l48 !== void 0 && $l29.includes($m_lw) && $l213, $l217 = $l11.advisorDeferred === true && $l11.advisorActive === false && !$l216 ? void 0 : $l48, $l218 = false, $l219 = 0;
  if ($l91 === "tool_addition" && !$l29.includes($m_lw)) try {
    let $l220 = $l134.flatMap(($l221) => {
      if (!("defer_loading" in $l221) || $l221.defer_loading !== true) return [$l221];
      if (!("input_schema" in $l221) || !$l3.some(($l222) => $m_xt($l222, $l221.name))) return [];
      let { defer_loading: $l223, ...$l224 } = $l221;
      return [$l224];
    }), $l225 = new Set($l134);
    $l219 = $m_U($l220, ($l226) => !$l225.has($l226)), $l218 = $l219 > 0 || $l220.length !== $l134.length, $l134.splice(0, $l134.length, ...$l220);
  } catch ($l227) {
    $m_l($m_N($l227));
  }
  let $l228 = $l33 === void 0 ? void 0 : $l13(() => $m_H3s($l28, $l0, { mintModel: $l33, retryModel: $l11.model, advisorEntryMoved: $l11.advisorDeferred === true && $l48 !== void 0 && $l213 && !$l216, deferredEntriesMoved: $l218, hasDeferredChannel: $l91 !== void 0 })), $l229 = /* @__PURE__ */ new Set([...$l92.filter($l120).map(($l230) => $l230.name), ...$l89?.kept.keys() ?? []]);
  if ($m_L3s($l28, $l0, $l229, $l49, $l59), $l91 !== void 0 && $l11.onDeferredToolsSent && $m_t0e()) try {
    $l168 = $l134.filter(($l231) => $m_Wpn($l231) && !$m_xt($l231, $m_hqe)), $l11.onDeferredToolsSent({ entries: $l168, nameOnlyAnnouncements: $l28.nameOnlyAnnouncements, strippedReferences: $m_m3s($l89) });
  } catch ($l232) {
    $m_l($m_N($l232));
  }
  let $l233 = $m_iee(() => {
    let $l234 = $l11.resumeIncompleteThinking ? "keep" : $NEW_chunk_e6aww6q8_js_Wte?.relayThinkingDisposition({ mainLoop: $m_ss($l11.querySource) === "main" && !$l11.agentId, fetch: $l11.fetchOverride }) ?? "keep";
    return { relayThinking: $l234, relayThinkingPlan: $l234 === "keep" ? void 0 : $m_lQe($l0), builtForRelay: !$l11.resumeIncompleteThinking && ($NEW_chunk_e6aww6q8_js_Wte?.isRelayedRequest($l11.fetchOverride) ?? false) };
  }, { relayThinking: "keep", relayThinkingPlan: void 0, builtForRelay: false }), { relayThinking: $l235, relayThinkingPlan: $l236, builtForRelay: $l237 } = $l233, $l238 = { model: $l11.model, bodyModel: $l34, pollEventsAsText: false, accountMemoryWithheld: $m_i7n(), tools: $m_Z9($l92), ingestPool: { tools: $l3, ...$m_F1o($l11.querySource) && { ownRequest: { mcpServersPending: $l11.hasPendingMcpServers === true } } }, ...$l74 && { declaredToolNames: $NEW_chunk_a76knw89_js_uoi($l134) }, betas: $l29, midConvLatchedOff: $l186, keptReminders: $l195, useToolSearch: $l49, advisorModel: $l217, advisorDeferred: $l216, stripWebSearch: $l28.webSearchHistoryRejected, mediaItemLimit: $m_uto($l28, $l34)?.limit, resumeIncompleteThinking: $l51, perTurnEffort: $l211, perTurnEffortCap: $l198, perTurnNow: $l212, deferredToolReferencePlan: $l89, keepForeignThinking: $m_kfn(), deferredWireToolNames: $l229, nameOnlyAnnouncements: $l28.nameOnlyAnnouncements, byValueNames: $l59, byValueAnnouncements: $l60, withoutAttachmentHooks: $l11.withoutToolDescribeHooks, reminderFold: $l11.reminderFold, echoWireToolInputs: $l50, thinkingStripPlan: $l236 === void 0 ? $l11.thinkingStripPlan : $m_aJe($l11.thinkingStripPlan, $l236), advisorStripPlan: $l11.advisorStripPlan };
  if ($l16) $m_Mx("message_normalization");
  let { messagesPreNormalize: $l239, messagesForAPI: $l240, accountMemoryEpoch: $l241, midConvFallback: $l242, toolChangeFallback: $l243, inlineToolsFallback: $l244, keptForeignSignatures: $l245, blocksEligible: $l246 } = $l13(() => $NEW_chunk_e6aww6q8_js_Qyn($l0, $l238));
  if ($l16) $m_Dx("message_normalization"), $m_Mx("request_build");
  let $l247 = $l240, $l177 = $l241;
  if ($m_$mr($l0, $l11), $l11.onToolInputCopiesSent && $l238.ingestPool?.ownRequest !== void 0 && $l50) try {
    let $l248 = $m_S9t($l0);
    if ($l248.size > 0) $l11.onToolInputCopiesSent($l248);
  } catch ($l249) {
    $m_l($m_N($l249));
  }
  if ($m_z1o($l28, $l0, $l247, { useToolSearch: $l49, toolSearchAbsent: $l91 === "tool_addition", blocksEligible: $l246, byValueNames: $l59, byValueStaysOut: $l61 }), $l91 !== void 0) $m_h3s($l0, $l28.surfacedOnWire, $l150, $l89, $l11.querySource, $l88);
  let $l175, $l250 = false, $l251 = false, $l252 = false, $l253 = () => {
    if (!$l251 || $l252) return;
    return $l252 = true, $m_nn({ type: "advisor_stripped" });
  }, $l254 = false, $l255 = false;
  if ($l235 === "strip_and_mark") if ($l236 !== void 0 && $l236.size > 0) $l250 = true, $l254 = true;
  else $l255 = true;
  let $l256 = $m_uv(), $l257, $l258 = ($l259, $l260, $l261) => {
    if ($l257 !== void 0 && $l257.input === $l259 && $l257.fallbackBeta === $l260 && $l257.marksBeta === $l261) return $l257.output;
    let $l262 = $m_Tgn($l259, $l260), $l263 = false, $l264 = $m_Yve($l262, $l256, $l51), $l265 = $m_cfn($l13(() => $NEW_chunk_e6aww6q8_js_k4e($l34)) ? $l264 : $NEW_chunk_e6aww6q8_js_Ecn($l264), $l0);
    return $l257 = { input: $l259, fallbackBeta: $l260, marksBeta: $l261, output: $l265, markable: $l263 }, $l265;
  }, $l176, $l266 = false, $l267 = ($l268, $l269, $l270 = false) => {
    if ($l266 = true, $l269 === "microcompact") $m_sye($l28, $l269);
    else $l175 = $l269, $l176 = ($l176 ?? true) && $l270;
    return $m_Yve($l268, $l256, $l51);
  }, $l271 = $l242, $l272 = $l243, $l273 = $l244, $l274 = false, $l275 = false, $l276 = "idle", $l277 = false, $l278, $l279 = $m_Tx($l11.querySource) !== null && $m_Rv() ? $m_N8e($l11.model) : false, $l280 = $m_Tx($l11.querySource) !== null && $m_Rv() ? $m_F8e($l11.agentId) : false, $l281 = $m_Tx($l11.querySource) !== null && $m_Rv() ? $m_$8e() : false, $l282 = $l11.fallbackCreditCode !== void 0 ? $l11.fallbackCreditMintedStateless === true : false, $l283 = $m_Tx($l11.querySource) !== null && $m_Rv() ? $m_Mve($l11.agentId) : false, $l284 = $m_Z4n($l11.querySource, $l11.agentId, $l11.model, $l282), $l285 = $l50;
  if ($m_fee($l247)) {
    let $l286 = $m_ps() ? $m_wrn({ fromModel: $m_Sgn($l247), sticky: $l28, serverDefaultFallbacksEnabled: () => $m_k($NEW_chunk_e6aww6q8_js_czr, false), selfTargetDefaultFallbacksEnabled: () => $m_k($NEW_chunk_e6aww6q8_js_uzr, false) }) : null, $l287 = $l286 !== null && !$m_sm($l28, $l286);
    if ($l287) $m_UF($l28, $l286);
    $m_a("tengu_rotunda_pennant_replay", { echo_eligible: $l287, category: $l286 !== null && $l286 === $m_Yw });
  }
  $m_a("tengu_api_after_normalize", { postNormalizedMessageCount: $l247.length, apiSystemMessageCount: $m_U($l247, ($l288) => $l288.type === "api_system") });
  let $l289 = $m_oYs($l239), $l290 = $m_b6n({ isNonInteractive: $l11.isNonInteractiveSession, hasAppendSystemPrompt: $l11.hasAppendSystemPrompt, recorded: $l11.recordedCliPrefix }), $l291, $l292 = () => {
    if ($l11.onPromptHeadSent) try {
      $l11.onPromptHeadSent({ cliPrefix: $l290, wireShape: $l13(() => $m_vfn($l28, $l34, { betas: $l29, keptOn: $l195, safeguards: $l291 })) });
    } catch ($l293) {
      $m_l($m_N($l293));
    }
  };
  $l292(), $l1 = $NEW_chunk_w5ndchqs_js_JXs($l1, $l290, { fingerprint: $l289, agentContext: $l11.agentContext, previousRequestId: $l19, promptId: $l20, turnOrigin: $l22, turnPosition: $l23, responseBeforeCompaction: $l202 ? $NEW_chunk_ndmse9kj_js_Zbs() : void 0 });
  let $l294 = $l11.enablePromptCaching ?? $m_fce($l34), $l295 = $l11.forkPointUuid !== void 0 && $m_Af($l11.agentContext), $l296 = $m_Qbe($l11.querySource, { agentCacheTtlOverride: $l11.agentCacheTtlOverride, mainThreadModel: $l202 || $l295 ? $l34 : void 0 }), $l297 = $l296.ttl === "1h" ? "1h" : void 0, $l298 = $m_Gmr($l296.ttl) === "1h" ? "1h" : void 0, $l299 = $l298 !== $l297;
  if ($l202) {
    if ($m_Eds($l297 === "1h" ? $m_bC : $m_Bj, $l11.model, $l296.reason === "live_5m_cache"), $l299) $m_zmr();
  }
  let $l300 = false, $l301 = () => {
    if ($l300) return;
    $l300 = true;
    let $l302 = $l303 || $l12.now();
    if ($l202) $m_eri($m_jj, { at: $l302, ttl: $m_lnr($l304) ?? $l298 ?? "5m", inputTokens: $l304.input_tokens, cacheReadTokens: $l304.cache_read_input_tokens, cacheCreationTokens: $l304.cache_creation_input_tokens });
    else if ($l295 && $l304.cache_read_input_tokens > 0) $m_zqr($m_jj, $l302);
  }, $l305 = () => $NEW_chunk_e6aww6q8_js_ZSr($l1, $l294, { skipGlobalCacheForSystemPrompt: $l129, cacheTtl: $l297, scopeRefused: $m_sm($l28, $m_vYe) }), $l306 = $l305(), $l307 = $l29.length > 0, $l308 = [...$l11.extraToolSchemas ?? []];
  if ($l217) $l308.push({ type: $NEW_chunk_e6aww6q8_js_bQt, name: $m_TLe, model: $l217, ...$l216 && { defer_loading: true } });
  let $l309 = [...$l134, ...$l308], $l310 = $m_s9t($l28, { model: $m_hA($l11.model), tools: $l309, system: $l306, messages: $l247.map(($l311) => ({ role: $l311.message.role, content: $l311.message.content })) }, { querySource: $l11.querySource, retryCause: void 0, promptEpoch: $l11.promptRenderEpoch });
  if ($l310 !== void 0) {
    let $l312 = $m_nn({ type: "prefix_delta", text: $l310 });
    yield $l312;
    let $l313 = $l13(() => $NEW_chunk_e6aww6q8_js_Qyn([...$l0, $l312], $l238));
    $l247 = $l313.messagesForAPI, $l177 = $l313.accountMemoryEpoch, $m_z1o($l28, $l0, $l247, { useToolSearch: $l49, toolSearchAbsent: $l91 === "tool_addition", blocksEligible: $l313.blocksEligible, byValueNames: $l59, byValueStaysOut: $l61 }), $l271 = $l313.midConvFallback, $l272 = $l313.toolChangeFallback, $l273 = $l313.inlineToolsFallback;
  }
  let $l314 = $l13(() => $m_Gcn($l247, $l199, ($l315) => $m_bbn($l315, $l26))), $l316 = $l314, $l317 = $l13(() => $m_ES($l26) && $l314 !== void 0 ? $m_U0($l314) : void 0), $l318 = $m_os() && $l13(() => $m_BI()) && $l13(() => $m_Zh($l34)) && !!$l11.fastMode && !$m_svn($l11.model), $l319 = $l318 && !$m_x4e(), $l320 = () => $NEW_chunk_aepeg2w5_js_Vss() || $NEW_chunk_e6aww6q8_js_SL() && $m_HG() === "firstParty" && !$m_nne(), $l321 = false;
  if ($l27) {
    if ($m_k($NEW_chunk_e6aww6q8_js_FSr, false)) {
      if ($m_pu() && $l320()) $m_UF($l28, $m_hW);
      $l321 = $m_xk($l28, $m_hW) && $l320();
    } else if (!$m_Cpe() && !$m_sm($l28, $m_hW)) try {
      let $l322 = await $l11.getToolPermissionContext();
      $l321 = $l322 !== void 0 && $m_es($l322.mode) && $l320();
    } catch ($l323) {
      $m_l($m_N($l323));
    }
  }
  let $l324;
  if ($NEW_chunk_hwmsct5x_js_Nci()) try {
    $l324 = await $l11.getToolPermissionContext();
  } catch ($l325) {
    $m_l($m_N($l325));
  }
  let $l326;
  if ($l319) $m_UF($l28, $m_UEn);
  let $l327 = $m_xk($l28, $m_UEn) && (!$m_BH($l11.querySource) || $l318);
  if ($m_Wmn()) $m_UF($l28, $m_LAt);
  let $l328 = () => $m_Wmn() && $m_xk($l28, $m_LAt), $l329 = $m_xEt($l28, { isMainLoopRequest: $l202, continuesPrefix: $l11.forkPointUuid !== void 0, cacheTtl: $l294 && !$l299 ? $l296 : void 0 }), $l330 = $m_$6e(), $l331 = $m_IEt(), $l332 = void 0, $l333 = ($l334, $l335, $l336) => {
    if ($l202) $l332 = $l334, $m_PEt({ conversation: $l28, headerSent: $l329, requestId: $l334, headers: $l335, isWhole: $l336, chainReleaseCount: $l330, accountEpoch: $l337, modelSwitchCount: $l331, now: Date.now(), clientOptions: { model: $l11.model, credentials: $l11.credentials, storageV5: $l11.storageV5 } });
  }, $l338, $l339 = false;
  try {
    let $l340 = !($l35.type === "disabled" && $l35.mechanical === true) && !$m_i.CLAUDE_CODE_SIMULATE_PROXY_USAGE && (!$m_zH() || $m_hRe());
    if ($l340 && $m_k_()) {
      if ($l35.type !== "disabled") {
        if ($l338 = $m_Ncn(), $m_Fcn($l338)) $m_UF($l28, $m_T2);
      }
      $l339 = $m_xk($l28, $m_T2);
    } else if ($l340 && !$m__W()) {
      let $l341 = $m_Ud($l11.model);
      if (($l341 === "bedrock" || $l341 === "mantle" || $l341 === "vertex") && $m_OB($l341) && $l13(() => $m_vXo($l341, $l11.model))) {
        if ($l35.type !== "disabled") $m_UF($l28, $m_T2);
        $l339 = $m_xk($l28, $m_T2);
      }
    }
  } catch ($l342) {
    $m_l($l342), $l338 = void 0, $l339 = false;
  }
  if (!$l339 && !$m_Ape()) $l29 = $l29.filter(($l343) => $l343 !== $m_T2);
  if ($l11.evictCacheOnComplete && $l11.stickyBetas !== void 0 && $m_bmr()) $m_UF($l28, $m_xst);
  let $l344 = require("./chunk-gzv3xh26.js").createContextHintController({ querySource: $l11.querySource, agentId: $l11.agentId, includeFirstPartyBetas: $m_k_(), is529Error: $m_O2, storageV5: $l11.storageV5 }), $l345 = void 0, $l346 = null, $l347 = void 0, $l348 = () => $m_uoi({ sent: $l345 !== void 0 && $l314 !== $l199 ? $l201 : $l345, turnEffort: $l11.turnEffort, hookEffortValue: $l11.hookEffortValue }), $l349, $l350, $l351, $l352 = () => $l351 ??= $m_Qni($l247), $l353 = () => {
    let $l354 = $m_jK();
    return $NEW_chunk_e6aww6q8_js_f6e($l354, $l11.model, $m_Ud($l11.model)), $l354;
  }, $l355 = $l349 ??= $l309.filter(($l356) => !("defer_loading" in $l356 && $l356.defer_loading));
  $l350 ??= $m_fF($l29), $NEW_chunk_g54kbxqw_js_Upi({ system: $l306, toolSchemas: $l349, anyDeferLoading: $l349.length !== $l309.length, querySource: $l11.querySource, model: $l11.model, agentId: $l11.agentId, fastMode: $l327, globalCacheStrategy: $l131, betas: $l329 ? [...$l350, $m_WM.header] : $l350, autoModeActive: $l321, isUsingOverage: $m_hi().isUsingOverage ?? false, is1hCacheTTL: $l298 === "1h", queryDepth: $l11.queryTracking?.depth, cacheDiagnosis: $l328(), effortValue: $l314, thinkingConfig: $l35, extraBodyParams: $l353(), getMessageHashes: $l352, messages: $l247, baselineAgentId: $l11.querySource === "agent_summary" && $m_ck($l11.agentContext) ? $l11.agentContext.agentId : void 0 });
  let $l357 = $l247, $l358 = null, $l359 = () => $m_HG() === "thirdParty" && $l360.includes($m_xC.header), $l361 = () => $l339 && !$m_Ape() && $l360.includes($m_T2.header), $l362 = [], $l363 = false, $l364 = ($l365) => {
    if (!$m_xk($l28, $m_xC)) return;
    let $l366 = $l359(), $l367 = !$l366 && $l360.includes($m_xC.header) && $m_i.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS, $l368 = $l366 || $l367, $l369 = $l368 && $l365 instanceof $m_Mt && $l365.status === 400 && $l365.message.includes($m_xC.header), $l370 = $l368 && !$l361() && $m_eB($l365), $l371 = $l366 ? $m_yZn($l365) ?? [] : [], $l372 = $l371.some(($l373) => $l373.includes("dangerous_tool_use") || $l373.includes("safeguard"));
    if (!$l369 && !$l370 && !$l372 && !$m_m4e($l365)) return;
    $m_Mg($l28, $m_xC);
    let $l374 = $l366 || $l367 && $NEW_chunk_e6aww6q8_js_SL();
    if ($l370 && !$l369 && !$l372 && !$m_m4e($l365)) $l362.push($m_xC), $l363 = $l374 && !$m_nne();
    if ($l374) {
      if ($m_APn(), $l372) $m_hZn($l11.model, $l371);
    }
    return $m_t($l366 ? "[server-classifier] the platform rejected a beta on this request (HTTP 400), most likely dangerous-tool-use, which this deployment does not know yet; it is not sent again this session and auto mode decides with the local classifier" : $l374 ? "[server-classifier] a request was refused (HTTP 400), most likely because of the dangerous-tool-use beta header or the safeguards field. Claude Code sends these on a direct connection to api.anthropic.com even with CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS set. The API, or something between this machine and it, refused them. Until Claude Code restarts, it sends none of them again, nor the afk-mode beta header, and auto mode no longer asks the server to check actions. To stop sending them on this machine at all, set CLAUDE_CODE_AUTO_MODE_SERVER=0." : $l367 ? "[server-classifier] a request was refused (HTTP 400), most likely because of the dangerous-tool-use beta header, which this conversation had kept sending since an earlier request. It is not sent again in this conversation. This session had already stopped asking the server to check actions, so auto mode goes on deciding as it did." : "[server-classifier] the server rejected the dangerous-tool-use beta header or the safeguards field (HTTP 400); neither is sent again this conversation, so every auto-mode tool use is denied as classifier-unavailable until the conversation's betas reset (/clear or /compact)", { level: "warn" }), $m_a("tengu_server_classifier_beta_rejected_retry", { provider: $m_kT(), unnamed: $l370, foundryFeature: $l372, unclaimed: false, betasSwitchSetAside: $l367, stopsAsking: $l374 }), "retry:safeguards";
  }, $l375 = ($l376) => $m_V8e($l376, $l11.model) && (!!$l11.modelIsRefusalFallbackTarget || $m_j3r($l11.model)), $l377 = ($l378) => $m_K8e($l378) || $l375($l378), $l379 = ($l380) => $l91 !== void 0 && $l381 === void 0 && $l380 instanceof $m_Mt && !$l11.resumeIncompleteThinking, $l382 = ($l383) => {
    let $l384 = $m_Tke($l383);
    return $l379($l383) && (!$m_oQe() || /\bdefer_loading\b/.test($l383.message)) && ($l383.status === 400 || $l383.status === 422) && $l383.type !== "billing_error" && !$l377($l384) && !$l385($l384);
  }, $l386 = ($l387, $l388, $l389) => {
    $m_t(`[ToolSearch] HTTP ${$l387.status} ${$l389}${$l388 ? ` (${$l388.header})` : ""}; sending the request again without deferred tools. ENABLE_TOOL_SEARCH=false avoids the refused request${$l362.length > 0 ? `. Dropped first and now allowed again: ${$m_fF($l362).join(", ")}` : ""}`, { level: "warn" });
    for (let $l390 of $l362) $m_gPt($l28, $l390);
    if ($l363) $m_Ifs();
    throw new $m_cee($l387, $l49);
  }, $l391 = ($l392) => {
    if ($l110 !== null && $l379($l392) && $NEW_chunk_e6aww6q8_js_N6e($l392, $l110)) $l386($l392, $l110, "refusing the tool search beta");
    return;
  }, $l393 = ($l394) => {
    if ($l382($l394)) $l386($l394, $l110, "that no other recovery took, on a request that declared deferred tools");
    return;
  }, $l395 = false, $l396 = () => {
    let $l397 = $l11.toolSearchRefusal;
    if ($l397 === void 0 || $l395) return;
    $l395 = true;
    try {
      let $l398 = $m_Wot(), $l399 = $NEW_chunk_e6aww6q8_js_N6e($l397, $l398);
      if ($l399) $l39($l398, $m_qq($l397, $l398));
      else $m_Mg($l28, $l398), $m_t("[ToolSearch] the endpoint answered the request sent without tool search, so this conversation goes on without it");
      $m_a("tengu_beta_400_healed", { beta: $m_oie([$l398.header]), model: $m_wt($l11.model), provider: $m_kT(), status: $l397.status, unnamed: !$l399 });
    } catch ($l400) {
      $m_l($l400);
    }
  }, $l401 = ($l402) => {
    let $l403 = $l404($l402, true);
    if ($l403 !== null) return $l403;
    if (!($l402 instanceof $m_Mt) || $l402.status !== 400 && $l402.status !== 422) return;
    let $l405 = $m_Tke($l402);
    if ($l377($l405) || $l385($l405)) return;
    if ($l402.status === 422 || !$m_xk($l28, $m_xC) || !$l359()) {
      if ($m_Ape() || $l28.systemMessagesAcceptedBy.has($l34)) return;
      let $l406 = $l407($l402, true);
      if ($l406 !== void 0) $l408 = "retrying";
      return $l406;
    }
    return $m_Mg($l28, $m_xC), $l362.push($m_xC), $m_t("[server-classifier] an unrecognised HTTP 400 arrived while the dangerous-tool-use beta was on the request; retrying once without it, and auto mode decides with the local classifier for the rest of this conversation", { level: "warn" }), $m_a("tengu_server_classifier_beta_rejected_retry", { provider: $m_kT(), unnamed: false, foundryFeature: false, unclaimed: true }), "retry:safeguards-unclaimed";
  }, $l409 = ($l410) => {
    try {
      if (!($l410 instanceof $m_Mt) || $l410.status !== 400 && $l410.status !== 422) return;
      if ($l411 === "withoutField") {
        $l411 = "spent";
        let $l412 = $l401($l410);
        if ($l412 === void 0 && !$l377($l410) && !$l382($l410)) $m_isn();
        return $l412;
      }
      if ($l411 === "spent" || $l413 === void 0 || $l410.type === "billing_error" || $l377($l410) || $l385($l410) && !$m_v4e($l410) || !$m_ssn() || $m_oQe()) return;
      return $l29 = $l29.filter(($l414) => $l414 !== $m_Tpe), $l411 = $l413 === "updates" && $l35.display !== void 0 ? "withoutUpdates" : "withoutField", `retry:thinking-display-unclaimed:${$l411}`;
    } catch ($l415) {
      $m_l($l415);
      return;
    }
  }, $l416 = () => {
    if ($l408 === "retrying") $l408 = "spent";
    else if (!$m_Ape() && $l174.some(($l417) => $l417.role === "system")) $l28.systemMessagesAcceptedBy.add($l34), $l292();
  }, $l418 = () => {
    if ($l408 === "retrying") $m_gPt($l28, $m_XI), $l292(), $m_t("[mid-conv-system] the resend without system messages was not answered either, so the guess that the platform refuses them is dropped; the next request of this conversation sends them again", { level: "warn" });
  }, $l419 = () => {
    if ($l411 === "idle" || $l411 === "spent") return;
    let $l420 = $l411 === "withoutField";
    $l411 = $l420 ? "spent" : "idle";
    try {
      if ($l420) $m_Mg($l28, $NEW_chunk_bwbq4xvm_js_als);
      $m_Mg($l28, $m_Tpe), $m_t(`[thinking] a request was refused (HTTP 400 or 422) and went through when sent again ${$l420 ? "without thinking.display" : "with the session's own display in place of 'updates'"}; this conversation no longer sends ${$l420 ? "thinking.display" : "'updates'"}.`, { level: "warn" }), $m_a("tengu_beta_400_healed", { beta: $m_oie([$m_Tpe.header]), model: $m_wt($l11.model), provider: $m_kT(), unclaimed: true });
    } catch ($l421) {
      $m_l($l421);
    }
  }, $l422 = ($l423, $l424) => {
    try {
      if (!($l423 instanceof $m_Mt) || $l423.status !== 400 && $l423.status !== 422) return;
      if ($l425 === "resent") $l425 = "spent";
      let $l426 = $m_Tke($l423);
      if ($l425 !== "idle" || !$l360.includes($m_uF.header) || $l423.type === "billing_error" || $m_HJr($l423) !== void 0 || $m_tcr($l426) || $l377($l426) || $l423.status === 400 && $l424 || $m_Ake($l423) !== void 0 || $m_xke($l423) !== void 0 || $l385($l426) && !$l423.message.includes($m_uF.header) || $m_oQe()) return;
      return $m_t(`[thinking] HTTP ${$l423.status} that no earlier recovery took; sending the request again without the ${$m_uF.header} beta`, { level: "warn" }), $l29 = $l29.filter(($l427) => $l427 !== $m_uF), $l425 = $l424 ? "spent" : "resent", "retry:thinking-token-count-unclaimed";
    } catch ($l428) {
      $m_l($l428);
      return;
    }
  }, $l429 = () => {
    if ($l425 !== "resent") return;
    $l425 = "spent";
    try {
      $l39($m_uF, false), $m_a("tengu_beta_400_healed", { beta: $m_oie([$m_uF.header]), model: $m_wt($l11.model), provider: $m_kT(), unclaimed: true });
    } catch ($l430) {
      $m_l($l430);
    }
  }, $l431 = ($l432) => {
    return;
  }, $l433 = ($l434) => {
    {
      let $l435 = $l434 instanceof $m_Mt && $l434.status === 400;
      if ($l436 === "retrying") {
        if ($l435) {
          if ($l436 = "spent", !$l377($l434) && !($l437 === "idle" && $l438($l434))) $m_spn();
        }
        return;
      }
      if ($l436 === "idle" && $l439 && $l29.includes($m_Gq) && $l435 && $l434.type !== "billing_error" && !$l377($l434) && !$l385($l434) && $m_rpn()) return $l436 = "retrying", $l440 = $l434.requestID ?? void 0, $l29 = $l29.filter(($l441) => $l441 !== $m_Gq), $l358?.forceCreate("clear_at_header_retired"), "retry:kept-reminder-unrecognised-400";
    }
    return;
  }, $l438 = ($l442) => {
    try {
      return $m_A2 !== null && $m_Te() === "firstParty" && $l360.includes($m_A2.header) && $l442 instanceof $m_Mt && $l442.status === 400 && $l442.type !== "billing_error" && $m_Jde($l442) === "client_error" && !$l11.resumeIncompleteThinking && !($l443 && !$l444) && $m_g5t($l442) === void 0 && !$l377($l442) && !$l385($l442) && $m_Ove($l442) === null && $m_Ake($l442) === void 0 && $m_xke($l442) === void 0 && $m_ipn();
    } catch ($l445) {
      return $m_l($l445), false;
    }
  }, $l446 = ($l447) => {
    try {
      if ($l437 === "retrying" && $l447 instanceof $m_Mt && $l447.status === 400) {
        if ($l437 = "spent", !$l377($l447)) $m_apn();
        $m_a("tengu_tether_unrecognised_400", { phase: $m_b("refused"), planner_backed: $l448, query_source: $m_Es($l11.querySource) });
      }
    } catch ($l449) {
      $m_l($l449);
    }
  }, $l450 = ($l451) => {
    try {
      if ($l446($l451), $l437 === "idle" && $l438($l451)) {
        let $l452 = $l358 !== null, $l453 = $l358?.dropForUnrecognised400();
        return $m_a("tengu_tether_unrecognised_400", { phase: $m_b("start"), planner_backed: $l452, dropped_thread: $l453 !== void 0, query_source: $m_Es($l11.querySource) }), $l437 = "retrying", $l454 = $l451.requestID ?? void 0, $l448 = $l452, $l453 ?? "retry:tether-unrecognised-400";
      }
    } catch ($l455) {
      $m_l($l455);
    }
    return;
  }, $l456 = false, $l457 = ($l458) => {
    if ($l458 instanceof $m_Mt && $l458.status !== void 0) $l456 = true;
    if ($l446($l458), $l29.includes($m_Gq) && $m_HXt($l458)) return $l29 = $l29.filter(($l459) => $l459 !== $m_Gq), $m_Mg($l28, $m_Gq), $m_L8e(), $l292(), $l358?.forceCreate("clear_at_header_retired"), $m_f("api_kept_reminder_clear_at", "server_rejected"), $m_t("[reminders] the server rejected the clear_at beta header or field (HTTP 400); retrying without them. For the rest of this session earlier reminders are not re-sent, and requests that can use a Message Threads thread get no reminder.", { level: "warn" }), "retry:kept-reminder-clear-at";
    if ($m_A2 !== null && $m_vke($l458) && !$m_sm($l28, $m_A2)) return $m_Mg($l28, $m_A2), $m_D8e(), $m_t("[tether] server rejected the message-threads beta header \u2014 dropping it and threading for this session", { level: "warn" }), $l358?.resolveRetry($l458) ?? "retry:tether-header";
    return $l358?.resolveRetry($l458);
  }, $l460 = $m_Dni($l0, $l11.querySource, $l11.model, $l11.agentId, ($l461) => $m_xn($l238.tools, $l461)?.name, $l11.forkPointUuid), $l462 = false, $l174 = [], $l463 = [], $l464 = ($l465) => {
    if ($l463.length === 0) return $l465;
    for (let $l466 = $l463.length - 2; $l466 >= 0; $l466--) if ($l463[$l466] === $l465) return $l466;
    return;
  }, $l182 = void 0, $l179 = void 0, $l183 = false, $l467 = false, $l468 = 0, $l469 = "none", $l173 = () => ({ messages: $l174, system: $l182, tools: $l179 });
  {
    let $l470 = $m_Tx($l11.querySource);
    if ($l470 !== null && $m_Rv()) {
      $l349 ??= $l309.filter(($l471) => !("defer_loading" in $l471 && $l471.defer_loading)), $l350 ??= $m_fF($l29);
      let $l472 = $m_n8e($l0), $l473 = $m_xk($l28, $m_xC) || $l11.serverClassifier === true && $l11.autoModeServerContext !== void 0 && $m_fge() && !$m_sm($l28, $m_xC) && !$m_nne(), $l474 = $m_gpn({ querySource: $l11.querySource, agentId: $l11.agentId, model: $l11.model, modelHeldStateless: $l279, relayHeldStateless: $l280, classifierHeldStateless: $l281, creditRetryStateless: $l282, dropHeldStateless: $l283, system: $l306, toolSchemas: $l349, betas: $l350, latchedHeaders: { fastMode: $l327, autoMode: $l321, cacheTtl1h: $l297 === "1h", evictOnComplete: $m_xk($l28, $m_xst), cacheDiagnosis: $l328(), cacheKeepalive: $l329, dangerousToolUse: $l473 }, thinkingConfig: $l35, toolChoice: $l11.toolChoice, effortValue: $l314, extraBodyParams: $l353(), getMessageHashes: $l352, previousMessageId: $l472 });
      if ($m_Dve($l470, $l11.agentId)) {
        let $l475 = $m_xpn($l0, $l247);
        if ($l358 = $m_fpn({ engine: $l474, previousMessageId: $l472, anchorRewritten: $l475 !== null && $m__pn($l475, $l472), messages: $l247, agentId: $l11.agentId, model: $l11.model, modelHeldStateless: $l279, relayHeldStateless: $l280, classifierHeldStateless: $l281, creditRetryStateless: $l282, dropHeldStateless: $l283, toolResultClearingHeldStateless: $l460 !== void 0, clock: $l12 }), $l475 !== null) $m_Apn($l475, { sourceCategory: $l470, messageCount: $l247.length, anchorMessageId: $l472 });
      }
    }
  }
  let $l476 = $m_vI() ? { systemPrompt: $l1.join(`

`), userSystemPrompt: $l11.userSystemPrompt, querySource: $l11.querySource, tools: $m__($l309) } : void 0, $l477, $l478 = () => $l477 ??= $m_Smr($l0, $l3), $l479 = $m_PWr($l11.model, $l11.agentContext, $l476, $l247, $l319, $l11.querySource, $l478), $l480 = $l12.monotonicNow(), $l481 = $l12.monotonicNow(), $l482 = 0, $l483 = [], $l484 = void 0, $l485 = void 0, $l486 = false, $l487, $l488 = ($l489) => {
    if ($l489 !== void 0 && $m_HG() === "thirdParty" && $m_B0($l489) && !$m_nne() && !$m_NGt()) $m_APn(), $m_t(`[server-classifier] the platform gave no classification for this request (${$l489.why}); treating that as this deployment's answer: auto mode classifies locally for the rest of this session and stops sending the classifier context`);
  }, $l490 = ($l491, $l492, $l493) => {
    let $l494 = $l493.flatMap(($l495) => $l495.type === "tool_use" && typeof $l495.id === "string" ? [$l495.id] : []);
    $l488($NEW_chunk_e6aww6q8_js_Vqt($l491, $l492, $l494));
  }, $l496 = false, $l497 = false, $l439 = false, $l436 = "idle", $l440, $l437 = "idle", $l454, $l448 = false, $l411 = "idle", $l425 = "idle", $l408 = "idle", $l498 = "idle", $l499 = () => $l498 !== "idle" && $l498 !== "spent", $l500 = false, $l501 = void 0, $l502 = void 0, $l503, $l504 = ($l505, $l506) => {
    $l169($l505);
    let $l507 = $m_jmn($l505, $l173());
    $m_Qas($l507, $l11.querySource, $m_Af($l11.agentContext)), $l502 = $m_qsn({ ...$l505, stream: $l506 }, $l11.querySource, $l478, $l507.messages, $l11.agentContext), $l503 = $m_zTt({ params: $l507, querySource: $l11.querySource, agentId: $l11.agentId, storageV5: $l11.storageV5, conversation: $l0, stickyBetas: $l28, readInjectedBody: () => $m_jK() });
  }, $l508 = void 0, $l509 = void 0, $l510, $l511 = false, $l512 = $m_Q2r(), $l513 = void 0, $l514, $l337 = $m_qm(), $l515 = ($l516, $l517) => {
    let $l518 = $m_Umn($l11);
    return $m_A6n($l516, $l518, $l12.now(), $l337, $l11.storageV5), $m_M2s({ route: $l518, querySource: $l11.querySource, model: $l11.model, rateLimitType: $m_Wcn($l516).rateLimitType, retryAtMs: $l517.retryAtMs, attempt: $l517.attempt, maxRetries: $l517.maxRetries });
  }, $l519 = ($l520) => $m_Ysn({ rejection: $l520, nowMs: $l12.now(), credentials: $l11.credentials, stop: $l4 }), $l521 = null;
  function $l522() {
    if ($l521 !== null) $l521(), $l521 = null;
  }
  function $l523() {
    if ($l522(), $m_Kmr($l484), $l484 = void 0, $l509) $l509.body?.cancel().catch(() => {
    }), $l509 = void 0;
  }
  let $l360 = [], $l524 = [], $l413 = void 0, $l525 = void 0, $l526 = false, $l527, $l528 = "disabled", $l529 = false, $l530 = false, $l531, $l171 = false, $l532 = false, $l533 = "none", $l534 = false, $l535 = false;
  if ($l11.fallbackCreditCode !== void 0 && (!$l32 || $l228 !== void 0)) $m_a("tengu_fallback_credit_skipped", { reason: $l32 ? $m_b("tool_changes_dropped") : $m_b("backend_unknown_or_mismatch"), ...$l228 && { ...$l228, late_tools_inlined: $l219 }, mint_request_id: $m_ye($l11.fallbackCreditMintRequestId), mint_model: $m_wt($l11.fallbackCreditMintModel), model: $m_wt($l11.model), query_source: $m_Es($l11.querySource) });
  let $l536 = $l32 && $l228 === void 0 ? $l11.fallbackCreditCode : void 0, $l537 = ($l538) => ($l11.fallbackCreditCode ? $l538.split($l11.fallbackCreditCode).join("[FCT_REDACTED]") : $l538).slice(0, 600), $l443 = false, $l539 = false, $l444 = false, $l540 = false, $l541 = false, $l542 = false, $l543 = false, $l544 = ($l545, $l546, $l547) => {
    if (!$l443 || $l542) return;
    $l542 = true;
    let $l548 = $l345;
    $m_a("tengu_fallback_credit_outcome", { outcome: $m_c($l545), mint_request_id: $m_ye($l11.fallbackCreditMintRequestId), mint_model: $m_wt($l11.fallbackCreditMintModel), request_id: $m_ye($l546), client_request_id: $m_ye($l508), model: $m_wt($l11.model), query_source: $m_Es($l11.querySource), carried_effort_level: $m_le($l200?.level), carried_effort_outcome: $m_le($l200?.outcome), effort_level: $m_le($l548), ...$l547 !== null && { input_tokens: $l547.input_tokens, output_tokens: $l547.output_tokens, cache_read_input_tokens: $l547.cache_read_input_tokens, cache_creation_input_tokens: $l547.cache_creation_input_tokens, cache_creation_5m_input_tokens: $l547.cache_creation?.ephemeral_5m_input_tokens ?? 0, cache_creation_1h_input_tokens: $l547.cache_creation?.ephemeral_1h_input_tokens ?? 0, service_tier: $m_le($l547.service_tier), speed: $m_le($l547.speed) } });
  }, $l549 = false, $l550 = false, $l551 = false, $l552 = ($l553, $l554 = true) => $l13(() => $l555($l553, $l554)), $l555 = ($l556, $l557) => {
    if ($l247 !== $l357) $l357 = $l247, $l351 = void 0, $m_fni({ querySource: $l11.querySource, agentId: $l11.agentId, getMessageHashes: $l352, messages: $l247 });
    let $l558 = ($l559) => !$NEW_chunk_bwbq4xvm_js_uoo.has($l559) && $m_sm($l28, $l559), $l560 = $l29.filter(($l561) => $l561 !== $m_wE || !$l499());
    if (!$l560.includes($m_wE) && !$l499() && $m_YTt($l556.model) !== null) $l560.push($m_wE);
    let $l562 = $m_Ud($l556.model), $l563 = $l562 === "bedrock" && $m_hW && $l321 && $l27 && $m_Cvn();
    if ($l563) $m_t(`auto-mode 3P: sending afk-mode beta '${$m_hW?.header}' to bedrock via body.anthropic_beta`);
    let $l564 = $l562 === "bedrock" ? [...$m_kXo($l556.model).filter(($l565) => $l565 !== $m_wE || !$l499()), ...$l110 ? [$l110] : [], ...$l563 && $m_hW ? [$m_hW] : []].filter(($l566) => !$l558($l566)) : [], $l567 = $m_jK($l564);
    $m_qve($l567, $m_uF, $l562 === "bedrock" && $l560.includes($m_uF));
    let $l568 = { ...$l567.output_config ?? {} };
    if (delete $l567.output_config, $m_dQe($l316, $l568, $l567, $l560, $l26), $l529 = $NEW_chunk_e6aww6q8_js_f6e($l567, $l556.model, $l562), $m_Xpr($l11.taskBudget, $l568, $l560), $l558($m_FSe)) delete $l568.effort;
    if ($l558($m_uXr) && "task_budget" in $l568) delete $l568.task_budget;
    $l530 = $m_tmr($l11.outputFormat, $l568, $l560, $l11.model);
    let $l569 = $l11.refusalFallbackSilentArmActive === true, $l570 = $m_grn($l11.serverRefusalFallback, $l556.model, $l560, $l28, $l569, $l284);
    $m_yrn($l11.fallbackCreditLaneArmed === true || $l11.fallbackCreditCode !== void 0, $l560, $l28, $l569, $l562 === "bedrock" ? $l567 : void 0), $l541 = $l560.includes($m_k2);
    let $l571 = $m_EXo($l562, $l26), $l572 = $l11.serverClassifier === true && $l11.autoModeServerContext !== void 0 ? $NEW_chunk_e6aww6q8_js_nun($m_iun($m_xbt($l0, $l247), $l0, $l247, $l11.agentId), $l0, $l247) : [], $l573 = $l11.serverClassifier === true && $l11.autoModeServerContext !== void 0 ? $NEW_chunk_e6aww6q8_js_Ydn({ autoModeServerContext: $l11.autoModeServerContext, priorTurnContext: $m_Cbt($l0), systemReminders: $l572, textProvenance: $NEW_chunk_e6aww6q8_js_aun($l0, $l247, $m_nLe) }) : void 0, $l574 = $l11.serverClassifier === true && $l573 !== void 0 && $l571 && $m_fge() && !$m_sm($l28, $m_xC) && !$m_nne();
    if ($l574) $m_UF($l28, $m_xC), $m_nin($l572, $l573?.system_reminders ?? []);
    if ($l571 && $m_xk($l28, $m_xC) && !$l560.includes($m_xC)) $l560.push($m_xC);
    $m_qve($l567, $m_xC, $l562 === "bedrock" && $l560.includes($m_xC));
    let $l575 = Math.min($l556?.maxTokensOverride || $l11.maxOutputTokensOverride || $l31.maxOutputTokens, $l31.maxOutputTokens), $l576 = $m_i.CLAUDE_CODE_DISABLE_THINKING, $l577 = $l35.type !== "disabled" && !$l576, $l578 = () => $l31.thinking.rejectsDisabled || $l33 !== void 0 && $m_D$e($l33), $l579 = $l577 && $m_CYn($l26) && !$m_sm($l28, $NEW_chunk_bwbq4xvm_js_als) && ($l411 === "idle" || $l411 === "withoutUpdates"), $l580 = !$l579 ? void 0 : $l35.display === "highlights" && $m_CPn() ? "omitted" : $l35.display, $l581 = void 0;
    if ($l577 && $l31.thinking.supported) if ($m_Bot({ runtimeOverride: $m_J6e($l11.model), resolvedModel: $l26, canonicalModel: $l30 }) === "adaptive") $l581 = { type: "adaptive", display: $l580 };
    else {
      let $l582 = $m_Jci($l26);
      if ($l35.type === "enabled" && $l35.budgetTokens !== void 0) $l582 = $l35.budgetTokens;
      $l582 = Math.max(1024, Math.min($l575 - 1, $l582)), $l581 = { budget_tokens: $l582, type: "enabled", display: $l580 };
    }
    else if ($l35.type === "disabled" && $m_Te() === "firstParty" && !$l576 && $l31.thinking.supported && !$l578()) $l581 = { type: "disabled" };
    let $l583;
    if ($l339) {
      if (!$l560.includes($m_T2)) $l560.push($m_T2);
      if ($m_qve($l567, $m_T2, $l562 === "bedrock"), $l338 !== void 0 && ($l581?.type === "adaptive" || $l581?.type === "enabled") && !("thinking" in $l567)) $l581 = { ...$l581, block_binding: { prefix_mismatch_behavior: $l338 } }, $l583 = $l338;
    }
    let $l584 = $l35.type === "disabled" ? void 0 : $l35, $l585 = $l584?.display, $l586 = "none";
    try {
      $l586 = $m_rsn($l585, $l584?.displayExplicit ?? $m_Qlt());
    } catch ($l587) {
      $m_l($l587);
    }
    let $l588 = () => {
      let $l589 = $l560.indexOf($m_BEn);
      if ($l589 !== -1) $l560.splice($l589, 1);
    };
    if ($l581 && $l580) $l588();
    switch ($l586) {
      case "thinking_and_connector_text":
      case "none":
        break;
      case "connector_text": {
        if (($l581?.type === "adaptive" || $l581?.type === "enabled") && $l579 && !("thinking" in $l567) && !$m_sm($l28, $m_Tpe) && $l411 === "idle" && !$m_i.CLAUDE_CODE_SIMULATE_PROXY_USAGE) {
          if ($l581 = { ...$l581, display: "updates" }, !$l560.includes($m_Tpe)) $l560.push($m_Tpe);
          $m_qve($l567, $m_Tpe, $l562 === "bedrock"), $l588();
        }
        break;
      }
    }
    if ($m_p8e($l26) && !$l560.includes($m_Pst)) $l560.push($m_Pst);
    let $l590 = $l581?.type === "enabled" || $l581?.type === "adaptive" || $l581 === void 0 && $l578(), $l591 = $l11.toolChoice;
    if ($l591?.type === "tool" && $l590) $m_t(`tool_choice {type:'tool', name:'${$l591.name}'} demoted to auto: extended thinking is active`), $l591 = { type: "auto" };
    let $l592 = $l35.type === "disabled" && $l35.mechanical === true;
    if ($l581?.type === "disabled" && ($l592 || $l31.thinking.capsEffortWhenDisabled) && typeof $l568.effort === "string" && $m_b4r($l568.effort)) {
      if (!$l551) $l551 = true, $m_t(`output_config.effort '${$l568.effort}' clamped to '${$m_KEt}': thinking is ${$l592 ? "mechanically " : ""}disabled for this request, and this model rejects higher effort when thinking is disabled`);
      if (!$l592 && $m_ss($l11.querySource) === "main" && $m_ni().once("effort_thinking_disabled_clamp")) $m_a("tengu_effort_clamped_thinking_disabled", { from: $m_c($l568.effort), to: $m_c($m_KEt), query_source: $m_Es($l11.querySource) });
      $l568.effort = $m_KEt;
    }
    let $l593 = $m_E9t({ hasThinking: $l577, toolClearing: $l460?.edit }), $l594 = $l11.enablePromptCaching ?? $m_fce($l33 ?? $l556.model), $l595, $l596 = $m_os() && $l13(() => $m_BI()) && !$m_x4e() && $l13(() => $m_Zh($l34)) && !!$l556.fastMode && !$l558($m_UEn) && !$m_svn($l556.model);
    if ($l596) $l595 = "fast";
    if ($l531 = $l596 ? $l556.model : void 0, $l327 && !$l560.includes($m_UEn)) $l560.push($m_UEn);
    if ($m_hW && $l321 && $l320() && $l27 && !$l560.includes($m_hW)) {
      if ($l560.push($m_hW), $m_Cvn()) $m_t(`auto-mode 3P: sending afk-mode beta '${$m_hW.header}' to ${$l562} via betas header`);
    }
    if ($l297 === "1h" && $m_k_() && !$l560.includes($m_lYt)) $l560.push($m_lYt);
    let $l597 = null, $l598 = $l344?.buildRequestParams($l247);
    if ($l598) $l560.push($l598.beta), $l597 = $l598.body;
    let $l599 = null;
    if ($m_xk($l28, $m_xst) && $l594) {
      if (!$l560.includes($m_xst)) $l560.push($m_xst);
      $l599 = { cache_control: { type: "ephemeral", ...$l298 && { ttl: $l298 }, evict_on_complete: true } };
    }
    if ($l328() && !$l560.includes($m_LAt)) $l560.push($m_LAt);
    if ($l329 && !$l560.includes($m_WM)) $l560.push($m_WM);
    let $l600 = $m_i.CLAUDE_CODE_SIMULATE_PROXY_USAGE, $l601 = $l195 && $l307 && !$l600 && $m_car($l560).includes($m_Gq), $l602 = $l358 !== null && !$l600 ? $l358.plan($l247, $l601) : null, $l603 = $m_A2 !== null && ($m_sm($l28, $m_A2) || $l437 !== "idle"), $l604 = $l603 ? null : $l602;
    if ($m_A2 !== null) {
      if ($l604 !== null) $m_UF($l28, $m_A2);
      if ($l603) {
        for (let $l605 = $l560.length - 1; $l605 >= 0; $l605--) if ($l560[$l605] === $m_A2) $l560.splice($l605, 1);
      } else if (($l604 !== null || $m_xk($l28, $m_A2)) && !$l560.includes($m_A2)) $l560.push($m_A2);
    }
    let $l606 = $l560.filter(($l607) => !$l558($l607) && (!$l600 || $l607 === $m_dPe));
    if ($l600) $m_t(`[API:client] SIMULATE_PROXY_USAGE: stripping ${$l560.length - $l606.length} beta headers from request (keeping ${$m_fF($l606).join(", ") || "none"}): ${$m_fF($l560).join(", ")}`);
    let $l608 = !$l577 && $l31.acceptsTemperature ? $l11.temperatureOverride ?? 1 : void 0;
    $l360 = $m_fF($l606), $l524 = $m_fF($l564), $l500 = $l606.includes($m_wE) || $l564.includes($m_wE), $l413 = $l581 !== void 0 && "display" in $l581 && !("thinking" in $l567) ? $l581.display ?? void 0 : void 0, $l526 = $l581 !== void 0 && "block_binding" in $l581, $l527 = $l583;
    let $l609 = $m_car($l606), $l610 = $l307 && (!$l600 || $l606.length > 0) && $m_fF($l609).length > 0;
    $l497 = $l601, $l439 = false;
    let $l611 = $l610 && ($l609.includes($m_yW) || $m_Yw !== null && $l609.includes($m_Yw));
    $l534 = $l611 && $m_fee($l247);
    let $l612 = $l610 && ($l570.fallbacks === "default" ? $m_Yw !== null && $l609.includes($m_Yw) : $l609.includes($m_yW)) ? $l570 : {};
    if ($l532 = $l612.fallbacks !== void 0, $l533 = $l612.fallbacks === "default" ? "default" : $l532 ? "explicit" : "none", !$l611 && $m_fee($l247)) $l175 = "error_recovery", $l176 = false;
    let $l613 = false;
    $l496 = $l613;
    let $l614 = [];
    $l278 = void 0;
    let $l615 = $l594 && !$l11.skipMessageCacheMarkers, $l616 = !$l600 && $l599 !== null || $l567.cache_control != null, $l617 = $l258($l247, $l611, $l613), $l618 = $l557 && $l276 === "idle" ? $m_hun({ querySource: $l11.querySource, model: $l33 ?? $l556.model, isKeepaliveHeaderOnWire: $l610 && $l609.includes($m_WM), hasSecondMarkerSlot: $l615 && !$l616 && $l11.divergesAtMessageId === void 0, messages: $l617 }) : void 0, $l619 = $l174 = $m_Xmr($l617, $l615, $l298, $l11.skipCacheWrite, $l11.forkPointUuid, $m_sm($l28, $NEW_chunk_bwbq4xvm_js_Ggr) || $m_xfs(), $l562, $l604 !== null, $l616, $l601, $l614, $l11.divergesAtMessageId, { skipMessageCacheMarkers: $l11.skipMessageCacheMarkers === true, report: ($l620) => {
      $l278 = $l620;
    } }, $m_uun($l11.querySource, $l11.skipCacheWrite === true), $l557, $l618);
    $l463 = $l614.some(($l621, $l622) => $l621 !== $l622) ? $l614 : [];
    let $l623 = ($l624) => Array.isArray($l624.content) && $l624.content.some(($l625) => typeof $l625 === "object" && $l625 !== null && "cache_control" in $l625 && $l625.cache_control != null);
    $l274 = $l619.some(($l626) => $l626.role === "system" && $l623($l626)), $l277 = $l619.some($l623);
    let $l627 = $l618?.isMarkWanted === true ? $l619.findLastIndex($l623) : -1;
    if ($l275 = $l627 > 0 && $l619.some(($l628, $l629) => {
      let $l630 = $l628.role;
      return $l629 < $l627 && $l630 === "system" && $l623($l628);
    }), $l486 = $l574 && $l307 && !$l600 && $m_car($l606).includes($m_xC), $l557) {
      if ($l487 !== void 0) $m_T1e($l487);
      if ($l487 = $l486 ? $NEW_chunk_e6aww6q8_js_Bqt($NEW_chunk_e6aww6q8_js_Vte(), { artifacts: $l573?.artifacts, thread: $l604 !== null, exactMcpAllowRules: $l573 && $m_PGt($l573), judgeOnlyTools: $l11.autoModeServerContext?.judgeOnlyTools, agentId: $l11.agentId }) : void 0, $l487 !== void 0 && $l573 !== void 0) $m_wbt($l487.key, $m_Xsn($l573));
    }
    let $l631 = $m_H7s($l309, $l11.model);
    $l631 = $m_f9t($l631, $l28);
    let $l632 = $l358 !== null ? $l358.shapeInheritedFields($l604, { system: $l306, tools: $l631 }) : { system: $l306, tools: $l631 };
    $l182 = $l306, $l179 = $l631, $l183 = $l632.system !== $l306, $l467 = $l604 !== null, $l468 = $l604?.sliceFrom ?? 0, $l469 = $l604?.thread.type ?? "none";
    let $l633 = { model: $m_hA($l11.model), messages: $l604 !== null && $l604.sliceFrom > 0 ? $l619.slice($l614[$l604.sliceFrom]) : $l619, system: $l632.system, ...$l632.tools !== void 0 && { tools: $l632.tools }, tool_choice: $l591, ...$l610 && $m_iFe($l609), metadata: $m_Qze({ agentContext: $l11.agentContext }), max_tokens: $l575, thinking: $l581, ...$l608 !== void 0 && { temperature: $l608 }, ...$l593 && $l307 && $l560.includes($m_Epe) && { context_management: $l593 }, ...$l486 && $l573 !== void 0 && { safeguards: [{ type: $m_k1e, classifier_context: $l573 }] }, ...!$l600 && $l597 ? $l597 : {}, ...!$l600 && $l599 ? $l599 : {}, ...$l612, ...$l567, ...{}, ...Object.keys($l568).length > 0 && { output_config: $l568 }, ...$l595 !== void 0 && { speed: $l595 }, ...$l604 !== null && { thread: $l604.thread }, ...$l328() && ($l27 || $l11.forkPointUuid !== void 0) && $l307 && !$l600 && { diagnostics: { previous_message_id: $l25 ?? null } } };
    $l462 = $l460 !== void 0 && $l633.context_management === $l593, $l439 = $l601 && $l633.messages.some(($l634) => $l634.clear_at !== void 0);
    let $l635 = $m_Ypr($l633.thinking, $l11.querySource, !$l549);
    if ($l635 !== $l633.thinking) $l549 = true, $l633.thinking = $l635;
    {
      let $l636 = $l633.thinking;
      $l528 = $l636?.type === "adaptive" || $l636?.type === "enabled" ? $l636.type : "disabled", $l525 = $m_ffn($l636);
    }
    if ($l557 && $m_ymr($l633)) {
      try {
        $l633 = $m_El($l633);
      } catch {
      }
      if ($m_D6e($l633), !$l550) $l550 = true, $m_a("tengu_lone_surrogate_sanitized", { source: $m_b("queryModel") });
    }
    let $l637 = $l633.output_config?.effort;
    $l345 = typeof $l637 === "string" && $m_Fw($l637) ? $l637 : void 0;
    let $l638 = $m_R8e($l247);
    return $l346 = $l638.effort ?? null, $l347 = $l638.now, $l633;
  }, $l639 = false, $l640 = ($l641) => {
    if ($l639) return;
    $l639 = true;
    let $l642 = $l307 ? $l641.betas ?? [] : [], $l643 = $l641.thinking?.type ?? "disabled", $l644 = $l247.length, $l645 = $l527, $l646 = $l201;
    $l11.getToolPermissionContext().then(($l647) => {
      $m_Oun({ model: $l11.model, messagesLength: $l644, temperature: $l11.temperatureOverride ?? 1, betas: $l642, permissionMode: $l647.mode, proactivityLevel: $l11.proactivityLevel, querySource: $l11.querySource, messageClientPlatform: $l11.messageClientPlatform, queryTracking: $l11.queryTracking, thinkingType: $l643, thinkingPrefixMismatchBehavior: $l645, effortValue: $l646, fastMode: $l319, previousRequestId: $l19 });
    });
  }, $l648 = false, $l649 = () => {
    if ($l639 || $l648) return;
    $l648 = true;
    try {
      $l640($l552({ model: $l11.model }, false));
    } catch ($l650) {
      $m_l($m_N($l650));
    }
  }, $l651 = [], $l652 = 0, $l653, $l654 = 0, $l655 = 0, $l656 = 0, $l657 = false, $l658, $l303 = 0, $l381 = void 0, $l659 = [], $l304 = $m_Pm, $l660 = null, $l661 = 0, $l662 = null, $l663 = false, $l664 = "none";
  function $l665() {
    if ($l664 === "credited") return;
    $l664 = "credited", $l661 += $m_$7e($m_Cxe($l26, $l304), $l304, $l11.model, $l11.querySource, $l317, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool);
  }
  let $l666 = false, $l667 = false, $l668, $l669 = false, $l670 = 0, $l671 = void 0, $l672 = void 0, $l673, $l674 = $l319, $l675 = false, $l676 = $m_Af($l11.agentContext) && $l11.querySource.startsWith("repl_main_thread"), $l677 = void 0, $l678 = /* @__PURE__ */ new Map(), $l679 = 3, $l680 = { value: 0 }, $l681 = $l679, $l682 = /* @__PURE__ */ new Map(), $l683 = false, $l684 = false, $l685, $l686, $l687 = { count: 0 }, $l688 = $m_Z8e(), $l689 = $m_Emn({ maxRetries: $l688, maxSleptThrough: $m_bmn($l688), maxReconnects: $m_wmn($l11.querySource), maxOverloaded: $m_nee, maxOutputFiltered: $m_vmn(), hasFallbackModel: Boolean($l11.fallbackModel), persistent: $m_pAe(), persistentCapacityOnly: $m_pAe() && !$m_Db(), background: !$m_Rxe($l11.querySource) }, $l11.apiAttemptsLeft), $l690 = false, $l691 = null, $l692 = false, $l693 = ($l694, $l695) => {
    if ($l691 = null, $l692 = $m_ps(), $l690) {
      if ($l692) $l694[$m_Ny] = $m_Aw, $l691 = $m_c($m_Aw), $m_t(`[dispatch] sent ${$m_Ny}=${$m_Aw}`);
      return;
    }
    if (!$l695 && $l692) {
      let $l696 = $m_eJe($m_ss($l11.querySource));
      if ($l696 !== null) $l694[$m_Ny] = $l696, $l691 = $m_c($l696), $m_t(`[dispatch] sent ${$m_Ny}=${$l696}`);
    }
  }, $l697 = async ($l698) => {
    if ($l690) return;
    let $l699 = $l698 instanceof $m_Mt ? $l698.status : void 0, $l700 = $l699 !== void 0 && $l699 >= 500, $l701 = $l698 instanceof $m_Uu;
    if (!($l691 !== null ? $l700 || $l701 : $l692 && $l699 === 503)) return;
    if ($l690 = true, $m_t(`[dispatch] ${$l700 ? `HTTP ${$l699}` : "connection error"} with ${$l691 === null ? `no ${$m_Ny}` : `${$m_Ny}=${$l691}`}; retrying once with ${$m_Ny}=${$m_Aw}`, { level: "warn" }), $m_a("tengu_dispatch_header_fallback", { model: $m_wt($l11.model), dispatch: $l691 ?? $m_b("none"), resend_dispatch: $m_c($m_Aw), reason: $l691 === null ? $m_IJr($l698) : $l700 ? $m_b("5xx") : $m_b("conn_err"), status: $l699 !== void 0 ? $m_Xr($l699) : $m_b("none"), query_source: $m_Es($l11.querySource), request_id: $m_ye($l698 instanceof $m_Mt ? $l698.requestID : void 0) }), $l691 === null) {
      let $l702 = $m_OJr($l698);
      if ($l702 > 0) await $m_J($l702, $l4, { clock: $l12 });
    }
    return "retry:dispatch-header-strip";
  }, $l703 = false, $l704 = false, $l705 = false, $l706, $l707 = ($l708, $l709) => {
    if (!($l708 instanceof $m_Mt) || $l708.status !== 400) return;
    let $l710 = $l708.message.includes("`fallback-credit-"), $l711 = $m_Yw !== null && $l708.message.includes(`\`${$m_Yw.header}`), $l712 = ($m_Yw !== null ? new RegExp(`\`server-side-fallback-(?!${$m_Yw.header.slice(21)})`) : /`server-side-fallback-/).test($l708.message), $l713 = ($l714) => {
      $m_t(`[server-fallback] 400 attributed (${$l714}) \u2014 stripping and retrying`, { level: "warn" });
      let $l715 = $l533;
      $m_a("tengu_rotunda_pennant_strip", { shape: $m_c($l714), mode: $m_c($l715), non_streaming: $l709 === "sync", query_source: $m_Es($l11.querySource), sticky_scope: $l11.stickyBetas === void 0 ? $m_b("session") : $m_ss($l11.querySource) === "main" ? $m_b("detached_main") : $m_ss($l11.querySource) === "subagent" ? $m_b("agent") : $m_b("aux") });
    }, $l716 = $m_Ake($l708);
    if ($l716 !== void 0 && !$l444) {
      if ($l444 = true, $l536 = void 0, $l716 === "credit_beta_header") {
        if ($m_Mg($l28, $m_k2), $l711 && $m_Yw !== null) $m_Mg($l28, $m_Yw), $l535 = true;
        if ($l712) $m_Mg($l28, $m_yW), $l703 = true;
        if ($l711 && $l534 && !$m_sm($l28, $m_yW)) $m_UF($l28, $m_yW);
      }
      if ($l709 === "stream") $l544($l716, $l708.requestID ?? null, null);
      return $l713($l716), "retry:fallback-credit-strip";
    }
    let $l717 = $m_xke($l708);
    if ($m_Yw !== null && ($l717 === "category_beta_header" || $l717 === "default_unconfigured" && $l532) && !$l535) {
      if ($l535 = true, $m_Mg($l28, $m_Yw), $l710) $m_Mg($l28, $m_k2), $l444 = true, $l536 = void 0;
      if ($l712) $m_Mg($l28, $m_yW), $l703 = true;
      if ($l534 && !$m_sm($l28, $m_yW)) $m_UF($l28, $m_yW);
      return $l713($l717), "retry:server-fallback-category-strip";
    }
    if ($l717 !== void 0 && ($l532 || $l717 === "beta_header") && !$l703) {
      if ($l703 = true, $m_Mg($l28, $m_yW), $l717 === "beta_header" && $l710) $m_Mg($l28, $m_k2), $l444 = true, $l536 = void 0;
      return $l713($l717), "retry:server-fallback-strip";
    }
    if ($m_nJ($l708)) return;
    if ($m__x($l708)) return;
    if ($m_JH($l708) || $m_Uq($l708)) return;
    if ($m_Dq($l708)) return;
    if ($NEW_chunk_e6aww6q8_js_Tke($l708)) return;
    if ($NEW_chunk_e6aww6q8_js_$te($l708) && $l533 !== "explicit") return;
    if ($m_Uve($l708) || $m_Bve($l708) !== void 0) return;
    if ($l375($l708)) {
      if ($l709 === "stream" && $l539 && !$l444) $l536 = $l11.fallbackCreditCode;
      return;
    }
    if ($l11.resumeIncompleteThinking) return;
    if ($l709 === "sync" && $l385($l708)) return;
    if ($l716 === void 0 && $l717 === void 0) {
      let $l718 = $l433($l708);
      if ($l718 !== void 0) return $l718;
      let $l719 = $l450($l708);
      if ($l719 !== void 0) return $l719;
      let $l720 = $l721($l708);
      if ($l720 !== void 0) return $l720;
    }
    if ($l709 === "stream" && $l443 && !$l444) return $l444 = true, $l544("unattributed_400_dropped", $l708.requestID ?? null, null), $l713("unattributed"), "retry:fallback-credit-unattributed";
    if (($l532 || $l534) && !$l703) {
      if ($l703 = true, $m_Mg($l28, $m_yW), $m_Yw !== null) $m_Mg($l28, $m_Yw);
      return $l713("unattributed"), "retry:server-fallback-strip";
    }
    if ($l541 && !$l540) return $l540 = true, $m_Mg($l28, $m_k2), $l362.push($m_k2), $l713("unattributed"), "retry:fallback-credit-header-strip";
    return;
  }, $l385 = ($l722) => $m_Ujt($l11.model, $l722) === "refused" || $m_bke($l722) || $m_g4e($l722) || $m_h4e($l722) || $m_JH($l722) || $m_Uq($l722) || $m_yke($l722) !== void 0 || $NEW_chunk_e6aww6q8_js_L6e($l722, $m_fF($NEW_chunk_e6aww6q8_js_OJt)).length > 0 || $NEW_chunk_e6aww6q8_js_C6e($l722) || $NEW_chunk_e6aww6q8_js_x6e($l722) || $m_E4e($l722) || $m_Dke($l722) !== null || $m_MM($l722) || $m__x($l722) || $NEW_chunk_e6aww6q8_js_BJt($l722) || $NEW_chunk_e6aww6q8_js_UJt($l722) || $m_A4e($l722) || $m_Ike($l722) || $m_P4e($l722) || $m_Yq($l722) || $m_Qq($l722), $l723 = () => {
    if ($l91 === "tool_search") return;
    try {
      let $l724 = 0;
      if ($l91 === void 0) $l309 = $l309.slice();
      else $l309 = $l309.flatMap(($l725) => {
        if (!("input_schema" in $l725)) return [$l725];
        if (!$l3.some(($l726) => $m_xt($l726, $l725.name))) return [];
        if ($l725.defer_loading !== true) return [$l725];
        $l724++;
        let { defer_loading: $l727, ...$l728 } = $l725;
        return [$l728];
      });
      let $l729 = new Set($l309.flatMap(($l730) => "name" in $l730 ? [$l730.name] : [])), $l731 = new Map($l3.map(($l732, $l733) => [$l732.name, $l733]));
      for (let $l734 of $l140) {
        if (!("name" in $l734) || $l729.has($l734.name)) continue;
        let $l735 = $l731.get($l734.name) ?? 1 / 0, $l736 = $l309.findIndex(($l737) => !("input_schema" in $l737) || ($l731.get($l737.name) ?? -1) > $l735);
        if ($l736 === -1) $l736 = $l309.length;
        $l309.splice($l736, 0, $l734), $l729.add($l734.name), $l724++;
      }
      if ($l91 === "tool_addition") $l168?.splice(0, $l168.length), $m_cto($l28), $m_mPt($l28);
      else if ($l724 === 0) return;
      else {
        let $l738 = $l92.slice();
        for (let $l739 of $l3) {
          if (!$l729.has($l739.name) || !$l59.has($l739.name)) continue;
          let $l740 = $l731.get($l739.name) ?? 1 / 0, $l741 = $l738.findIndex(($l742) => ($l731.get($l742.name) ?? -1) > $l740);
          if ($l741 === -1) $l741 = $l738.length;
          $l738.splice($l741, 0, $l739);
        }
        $l93 = $m_j1o($l28, false, () => $m_W1o($m_Z9($l738), $l3, $l125 ?? $l93?.recordedOnly));
      }
      $l175 = "error_recovery", $l176 = false, $m_t(`[late-tool-additions] no ToolSearch on this request: ${$l724} late tool(s) go inline from this request on`, { level: "warn" });
    } catch ($l743) {
      $m_l($m_N($l743));
    }
  }, $l744 = () => {
    let $l745 = $l272;
    if ($l745) $l272 = () => $m_lee($m_xw($l745()));
    let $l746 = $l271;
    if ($l746) $l271 = () => $m_lee($m_xw($l746()));
    let $l747 = $l273;
    if ($l747) $l273 = () => $m_lee($m_xw($l747()));
  }, $l748 = () => {
    let $l749 = $l272;
    if ($l749) $l272 = () => $m_xw($l749());
    let $l750 = $l271;
    if ($l750) $l271 = () => $m_xw($l750());
    let $l751 = $l273;
    if ($l751) $l273 = () => $m_xw($l751());
  }, $l752 = () => {
    if (!$m_eA()) $l29 = $l29.filter(($l753) => $l753 !== $m_dYt);
  }, $l754 = false, $l755 = ($l756) => {
    if ($l754 || !$m_h4e($l756)) return;
    let $l757 = ($l758) => !("input_schema" in $l758) && "name" in $l758 && $l758.name === $m_TLe, $l759 = $l309.some($l757), $l760 = $l360.includes($m_dYt.header) && $m_Eke($l756);
    if (!$l759 && !$l760) return;
    $l754 = true;
    try {
      if ($l759) $l309 = $l309.filter(($l761) => !$l757($l761)), $l247 = $l267($m_lee($m_xw($l247)), "error_recovery"), $l744(), $l175 = "error_recovery", $l176 = false;
      $l28.advisorHeld = { model: void 0, viaToolChange: $l28.advisorHeld?.viaToolChange ?? false, refused: true };
      let $l762 = $m_UXt($l756);
      if ($l762 === "process") $NEW_chunk_s61vbvea_js_V7s();
      else if ($l762 === "host") $m_uqs();
      $l752(), $m_t(`[advisor] the server refused the advisor ${$l760 ? "beta header" : "entry"} (scope: ${$l762}); retrying once without the advisor`, { level: "warn" }), $m_a("tengu_advisor_entry_refused_retry", { query_source: $m_Es($l11.querySource), organization_wide: $l762 === "process", host_wide: $l762 === "host", beta_header_refused: $l760 });
    } catch ($l763) {
      $m_l($m_N($l763));
    }
    return "retry:advisor-entry-refused";
  }, $l764 = new $m_bYe($l28), $l765 = ($l766) => {
    try {
      let $l767 = $l764.resolve($l766, $l179, $l3, $l11.querySource);
      if ($l767 !== void 0) $l175 = "error_recovery", $l176 = false;
      return $l767;
    } catch ($l768) {
      $m_l($m_N($l768));
      return;
    }
  }, $l769 = ($l770) => {
    return;
  }, $l771 = "idle", $l721 = ($l772) => {
    return;
  }, $l773 = () => {
    try {
      let $l774 = false, $l775 = $l11.advisorActive !== false;
      if ($l309 = $l309.flatMap(($l776) => {
        if ("input_schema" in $l776 || !("defer_loading" in $l776) || $l776.defer_loading !== true || $l776.name !== $m_TLe) return [$l776];
        if ($l774 = true, !$l775) return [];
        let { defer_loading: $l777, ...$l778 } = $l776;
        return [$l778];
      }), $l774) {
        if (!$l775) $l247 = $l267($m_lee($m_xw($l247)), "error_recovery"), $l744(), $l752();
        if ($l775 && $l28.advisorHeld?.viaToolChange === true) $l28.advisorHeld = { ...$l28.advisorHeld, inFallback: true };
        $l175 = "error_recovery", $l176 = false;
      }
    } catch ($l779) {
      $m_l($m_N($l779));
    }
  }, $l780 = () => {
    let $l781 = $l272;
    if ($l781) $l272 = () => $m_HK($l781()).messages;
    let $l782 = $l271;
    if ($l782) $l271 = () => $m_HK($l782()).messages;
    let $l783 = $l273;
    if ($l783) $l273 = () => $m_HK($l783()).messages;
  }, $l784 = ($l785, $l786) => {
    if (!$m_JH($l785)) return;
    let { messages: $l787, removed: $l788 } = $m_HK($l247);
    if ($l787 === $l247) return;
    return $l247 = $l267($l787, "error_recovery"), $m_Avi($l28), $l780(), $m_t(`[web-search-strip] The API could not decrypt web search content in this conversation's history: removed ${$l788.toolUses} ${$m_O($l788.toolUses, "search call")}, ${$l788.results} ${$m_O($l788.results, "result block")} and ${$l788.citations} ${$m_O($l788.citations, "citation")} from the request; retrying once. Later requests in this conversation leave them out too.`, { level: "warn" }), $m_f("api_request", "api_request_web_search_stripped", { query_source: $m_Es($l11.querySource), transport: $m_c($l786), tool_uses: $l788.toolUses, results: $l788.results, citations: $l788.citations, placeholders: $l788.placeholders }), "retry:web-search-strip";
  }, $l789, $l790 = ($l791) => {
    let $l792 = $m_uto($l28, $l34);
    if (!$m_bXt($l791) || $l792?.gaveUp) return;
    try {
      let $l793 = $m_wmr($l247), $l794 = Math.min($l793, $l789?.limit ?? 1 / 0), $l795 = $NEW_chunk_t0gq9gyw_js_aOi.find(($l796) => $l796 < $l794);
      if ($l795 === void 0) {
        if ($l789 !== void 0) {
          let { steps: $l797, refusedAt: $l798 } = $l789;
          $l789 = void 0, $m_fto($l28, { model: $l34, limit: $l792?.limit, gaveUp: true }), $m_t(`[media-item-limit] The model still refuses this request as unprocessable with ${$l793} images and documents left. Not removing any more.`, { level: "warn" }), $m_f("api_request", "api_request_media_limit_gave_up", { query_source: $m_Es($l11.querySource), media_items_refused: $l798, steps: $l797 });
        }
        return;
      }
      let $l799 = ($l800) => $m_ign($l800, $l795, $NEW_chunk_t0gq9gyw_js_Bhs);
      $l247 = $l267($l799($l247), "error_recovery");
      let $l801 = $l272;
      if ($l801) $l272 = () => $l799($l801());
      let $l802 = $l271;
      if ($l802) $l271 = () => $l799($l802());
      let $l803 = $l273;
      if ($l803) $l273 = () => $l799($l803());
      return $l789 = { limit: $l795, steps: ($l789?.steps ?? 0) + 1, refusedAt: $l789?.refusedAt ?? $l793 }, $m_t(`[media-item-limit] The model refused this request as unprocessable. It held ${$l793} images and documents; the oldest were removed to fit a limit of ${$l795}, and it is being sent again. If it is answered, this conversation keeps that limit.`, { level: "warn" }), `retry:media-item-limit:${$l795}`;
    } catch ($l804) {
      $m_l($m_N($l804));
      return;
    }
  }, $l805 = () => {
    try {
      let $l806 = $m_uto($l28, $l34);
      if ($l789 === void 0) {
        if ($l806?.gaveUp && $l806.limit === void 0) $m_hPt($l28);
        else if ($l806?.gaveUp) $m_fto($l28, { ...$l806, gaveUp: false });
        return;
      }
      let { limit: $l807, steps: $l808, refusedAt: $l809 } = $l789;
      $l789 = void 0, $m_fto($l28, { model: $l34, limit: Math.min($l807, $l806?.limit ?? 1 / 0), gaveUp: false }), $m_f("api_request", "api_request_media_limit_lowered", { query_source: $m_Es($l11.querySource), media_items_refused: $l809, media_item_limit: $l807, steps: $l808 });
    } catch ($l810) {
      $m_l($m_N($l810));
    }
  }, $l811 = ($l812) => {
    {
      let $l813 = $l812 instanceof $m_Mt && $l812.status === 400;
      if ($l276 === "retrying") {
        if ($l813) $l276 = "spent";
        return;
      }
      if ($l276 === "idle" && $l275 && $l813 && $l812.message.includes("cache_control")) return $l276 = "retrying", "retry:prompt-end-mark";
    }
    return;
  }, $l814 = () => {
    if ($l276 !== "retrying") return;
    if ($l276 = "spent", $l33 !== void 0) return;
    try {
      $m_Jfs(), $m_t("[cache-breakpoints] a side request that marked a system message before its last marker drew a 400 that names cache_control, and went through without that marker; no later side request carries it", { level: "warn" }), $m_f("api_prompt_end_mark", "server_rejected");
    } catch ($l815) {
      $m_l($l815);
    }
  }, $l407 = ($l816, $l817 = false) => {
    let $l818 = $l29.includes($m_xS) && !$m__x($l816) && $NEW_chunk_e6aww6q8_js_Gke($l816) !== "header_rejected" ? $NEW_chunk_e6aww6q8_js_Wke($l816) : void 0;
    if ($l818 !== void 0) {
      if ($l273) {
        let $l819 = $l273();
        if ($l247 = $l267(!$l29.includes($m_E2) ? $m_Rve($l819) : !$l29.includes($m_U6) ? $m_xve($l819) : $l819, "error_recovery"), $l250 = $l254, $m_jls($l28, $l60), $l91 === void 0) $l723();
      }
      return $l273 = null, $l29 = $l29.filter(($l820) => $l820 !== $m_xS), $m_$3s($l28, $l818), $l292(), $m_a("tengu_inline_tools_refused_retry", { cause: $m_c($l818) }), "retry:inline-tools-strip";
    }
    let $l821 = $l29.includes($m_lw) && !$m__x($l816) ? $NEW_chunk_e6aww6q8_js_Gke($l816) : void 0;
    if ($l821 !== void 0) {
      if ($l272) {
        let $l822 = $l272();
        $l247 = $l267(!$l29.includes($m_E2) ? $m_Rve($l822) : !$l29.includes($m_U6) ? $m_xve($l822) : $l822, "error_recovery"), $l250 = $l254;
      }
      $l272 = null;
      let $l823 = $l29.includes($m_xS) && $NEW_chunk_e6aww6q8_js_Wke($l816) === "header_rejected";
      return $l29 = $l29.filter(($l824) => $l824 !== $m_lw && $l824 !== $m_xS), $m_N3s($l28, $l821, $l11.model, $l823), $l292(), $l723(), $l773(), "retry:tool-change-strip";
    }
    let $l825 = $l817 || $m__x($l816), $l826 = $m_Pke($l816), $l827 = $l29.includes($m_E2) && $m_Ike($l816) && !$m_Yq($l816), $l828 = $l29.includes($m_U6);
    if ($l828 && $m_P4e($l816) && !$l825 && !$l827) return $l247 = $l267($m_xve($l247), "error_recovery"), $l29 = $l29.filter(($l829) => $l829 !== $m_U6), $m_Mg($l28, $m_U6), $m_t(`[per-turn-timing] the server refused the current-time statement (${$m_d($l816)}); leaving it out for the rest of this conversation (until /clear or /compact)`, { level: "warn" }), "retry:per-turn-timing-strip";
    if ($l271 && ($l825 || $l827)) {
      if ($l826 !== null && !$l174.some(($l830) => $l830.role === "system" && $l830.content.length > 0)) return;
      let $l831 = $m_HTt($l28), $l832 = $l174.length, $l833 = $l247.length, $l834 = $l826 === null ? void 0 : $l826.messageIndex === void 0 ? `${$l832} messages on the wire` : $l826.messageIndex >= $l832 ? `messages[${$l826.messageIndex}], beyond the ${$l832} this request sent` : `messages[${$l826.messageIndex}] of ${$l832} on the wire; conversation entry ${$l464($l826.messageIndex) ?? "none of ours (a clear_at reminder slot)"} of ${$l833}`;
      if ($l247 = $l267($l825 ? $l271() : $m_Rve($l247), "error_recovery"), $l271 = null, $l828) $l29 = $l29.filter(($l835) => $l835 !== $m_U6);
      if ($l825) {
        if ($l250 = $l254, $l29 = $l29.filter(($l836) => $l836 !== $m_XI && $l836 !== $m_E2 && $l836 !== $m_lw && $l836 !== $m_xS && $l836 !== $m_Gq), $m_Mg($l28, $m_XI), $m_K1o($l28), $l292(), $l723(), $l773(), $l272 !== null) $m_f("mcp_late_tool_additions", "rejected_with_mid_conv_system"), $l272 = null;
      }
      if ($l827) {
        if ($l29 = $l29.filter(($l837) => $l837 !== $m_E2), $l39($m_E2, $m_VXt($l816)), $l346 !== null) $m_f("api_per_turn_effort", "server_rejected");
      }
      if ($l11.stickyBetas === void 0) $m_qZ($l28, $l831);
      return $m_t($l834 !== void 0 ? `[mid-conv-system] API refused where a system message sits (${$l834}) \u2014 retrying once without system messages; off for this conversation until /clear or /compact` : $l827 ? "[per-turn-control] server rejected the per-turn statements \u2014 resending without them" : $l817 ? "[mid-conv-system] an HTTP 400 or 422 that nothing else recognises answered a request on which system turns were enabled; guessing the platform refuses them and resending without system messages; if that goes through they stay off until /clear or /compact" : '[mid-conv-system] server rejected role:"system" \u2014 falling back to a body with no {role:"system"} turn, sticky-rejecting the beta until /clear or /compact', { level: "warn" }), $m_a("tengu_mid_conv_system_fallback_retry", { per_turn_effort: $l827, ...$l817 && { unclaimed: $l817 }, misplaced: $l826 !== null, ...$l826 !== null && { misplaced_index: $l826.messageIndex ?? -1, wire_message_count: $l832, message_count: $l833 } }), "retry:mid-conv-system";
    }
    if ($l274 && !$m_sm($l28, $NEW_chunk_bwbq4xvm_js_Ggr) && $m_A4e($l816)) return $m_Mg($l28, $NEW_chunk_bwbq4xvm_js_Ggr), $m_Pfs(), $m_t("[mid-conv-system] proxy rejected cache_control on the api_system tail \u2014 demoting the breakpoint to the trailing message for this conversation", { level: "warn" }), $m_f("api_midconv_cache_proxy", "proxy_rejected"), "retry:api-system-cache-demote";
    return;
  }, $l838 = ($l839) => {
    if ($l274 && !$l275 && !$m_sm($l28, $NEW_chunk_bwbq4xvm_js_Ggr) && !$m_sm($l28, $NEW_chunk_bwbq4xvm_js_sls)) {
      let $l840 = $l839?.input_tokens ?? 0, $l841 = $l839?.cache_read_input_tokens ?? 0, $l842 = ($l839?.cache_creation_input_tokens ?? 0) + ($l839?.cache_creation?.ephemeral_5m_input_tokens ?? 0) + ($l839?.cache_creation?.ephemeral_1h_input_tokens ?? 0), $l843 = $l840 + $l841 + $l842 > 0, $l844 = $l842 > 0 && $l840 < $NEW_chunk_e6aww6q8_js_KSr;
      if ($l843 && !$l844) return;
      $m_Mg($l28, $NEW_chunk_bwbq4xvm_js_sls), $m_g("api_midconv_cache_proxy");
    }
  }, $l845 = ($l846) => {
    if (!$l277 || $l11.skipCacheWrite || !$m_Dmr($m_Ud($l11.model))) return;
    let $l847 = $m_Poi($m_ni().cacheCoverage, $l28, $l846);
    if ($l847.kind === "confirm") {
      $m_g("api_prompt_cache_coverage", { provider: $m_c($m_Ud($l11.model)) });
      return;
    }
    if ($l847.kind !== "fire") return;
    $m_t("[cache-coverage] sustained uncovered input with a cache breakpoint on the wire through a custom endpoint \u2014 no cache-billing evidence visible at the client (the endpoint may be silently stripping cache_control)", { level: "warn" }), $m_f("api_prompt_cache_coverage", "cache_coverage_loss", { api_system_marker: $l274, consecutive_turns: $l847.consecutive, input_tokens: $l847.inputTokens, cache_read_input_tokens: $l847.cacheReadTokens, cache_creation_input_tokens: $l847.cacheCreationTokens, provider: $m_c($m_Ud($l11.model)) });
  }, $l848 = () => {
    if (!$m_Gfs() && $l346 !== null) $m_zfs(), $m_g("api_per_turn_effort");
  }, $l849 = () => {
    if (!$m_Kfs() && $l272 !== null) $m_Vfs(), $m_g("mcp_late_tool_additions");
    if (!$m_Qfs() && $l272 !== null && $l29.includes($m_xS) && $l247.some(($l850) => $l850.type === "api_system" && $l850.toolDefinitions !== void 0)) $m_Zfs(), $m_g("mcp_inline_tools");
  }, $l851 = () => {
  }, $l852 = () => {
  }, $l853 = () => {
    if ($l437 === "retrying") {
      $l437 = "spent";
      try {
        if ($m_A2 !== null) $m_Mg($l28, $m_A2);
        if ($l448) $m_D8e();
        $m_a("tengu_tether_unrecognised_400", { phase: $m_b("healed"), planner_backed: $l448, query_source: $m_Es($l11.querySource) }), $m_t(`[tether] a request carrying the message-threads header got an HTTP 400 that Claude Code does not recognise (request id ${$l454 ?? "unknown"}), and a later attempt without the header succeeded. ${$l448 ? "Message Threads stays off for the rest of this session." : "The header stays off for this conversation."}`, { level: "warn" });
      } catch ($l854) {
        $m_l($l854);
      }
    }
    if ($l497) $m_lpn();
    if ($l436 === "retrying") $l436 = "spent", $m_Mg($l28, $m_Gq), $m_L8e(), $l292(), $m_f("api_kept_reminder_clear_at", "unrecognised_400"), $m_t(`[reminders] a request carrying a clear_at message got an HTTP 400 that Claude Code does not recognise (request id ${$l440 ?? "unknown"}), and the same request without clear_at succeeded. For the rest of this session earlier reminders are not re-sent, and requests that can use a Message Threads thread get no reminder.`, { level: "warn" });
  }, $l855 = ($l856) => {
    if (!$NEW_chunk_e6aww6q8_js_$te($l856) || $l533 === "explicit" || $m_BH($l11.querySource)) return null;
    try {
      let $l857 = $NEW_chunk_e6aww6q8_js_acn($l345, $l247), $l858 = $l857 === void 0 ? void 0 : $NEW_chunk_e6aww6q8_js_lcn($l26, $l857);
      if ($l858 === void 0) return $m_m("api_org_effort_cap_retry", "no_lower_level"), null;
      if ($l316 = $NEW_chunk_e6aww6q8_js_yV($l314, $l198()), $l346 !== null) $l247 = $l267($m_jcn($m_Rve($l247), { effort: $l211, effortCap: $l198(), now: $l347 }), "error_recovery");
      return $m_t(`[effort] the API refused effort '${$l857}' as above the organization's cap for model ${$l11.model}. Sending the request again at no more than '${$l858}', as later requests to this model will be.`, { level: "warn" }), `retry:org-effort-cap:${$l858}`;
    } catch ($l859) {
      return $m_l($m_N($l859)), null;
    }
  };
  function* $l860() {
    if (!$l202) return;
    let $l861;
    try {
      let $l862 = $NEW_chunk_e6aww6q8_js_yV($l197, $l198());
      if ($l862 !== $l197 && $NEW_chunk_e6aww6q8_js_dcn($l26)) $m_g("api_org_effort_cap_retry"), $l861 = $m_Bk(`Your organization limits effort for ${$m_is($l26)}, so Claude Code is using '${$l862}' instead of '${$l197}'. Your effort setting is unchanged.`, "warning");
    } catch ($l863) {
      $m_l($m_N($l863));
    }
    if ($l861) yield $l861;
  }
  let $l864 = ($l865) => {
    if (!$m_Yq($l865)) return $l855($l865);
    if ($m_TPn($l11.model), $l26 !== $l11.model) $m_TPn($l26);
    return $m_t(`[effort] the server refused effort for model ${$l11.model} (the output_config.effort field or the anthropic-beta value ${$m_FSe.header}). Sending the request again without either; this Claude Code process will not send either to this model again.`, { level: "warn" }), $m_a("tengu_effort_unsupported_retry", { model: $m_wt($l11.model) }), "retry:effort-unsupported";
  }, $l866 = ($l867) => {
    if (!$l530 || !$m_Qq($l867)) return null;
    try {
      return $m_cve($l11.model), $m_t(`[structured-outputs] model ${$l11.model} rejected output_config.format; latching unsupported and retrying without it.`, { level: "warn" }), $m_a("tengu_structured_outputs_unsupported_retry", { model: $m_wt($l11.model) }), "retry:structured-outputs-unsupported";
    } catch ($l868) {
      return $m_l($m_N($l868)), null;
    }
  }, $l869 = ($l870) => null, $l871 = ($l872) => {
    if ($l413 === "highlights" && $m_v4e($l872)) return $m_nps(), $m_t("[thinking] server rejected thinking.display highlights; asking for omitted for the rest of this process and retrying.", { level: "warn" }), $m_a("tengu_thinking_display_highlights_rejected_retry", { model: $m_wt($l11.model) }), "retry:thinking-display-highlights";
    return null;
  }, $l404 = ($l873, $l874 = false) => {
    if (!$l339 || !$l360.includes($m_T2.header)) return null;
    let $l875 = $m_E4e($l873) || !$m_Ape() && $m_WXt($l873), $l876 = !$m_Ape() && ($m_eB($l873) || $l874 && $l873 instanceof $m_Mt && $l873.status === 400 && !$l377($l873) && !$l385($l873));
    if (!$l875 && !$l876) return null;
    return $l339 = false, $l338 = void 0, $l29 = $l29.filter(($l877) => $l877 !== $m_T2), $m_Mg($l28, $m_T2), $m_t($l875 ? "[thinking] server rejected the thinking-binding-controls beta; dropping the header and the block_binding value for this conversation and retrying." : "[thinking] an HTTP 400 that does not name the thinking-binding-controls beta arrived on a request that carried it; guessing the platform refuses that beta, so retrying once without it and leaving it off for this conversation. The only loss is the API's list of the thinking blocks it dropped.", { level: "warn" }), $m_a("tengu_thinking_binding_rejected_retry", { model: $m_wt($l11.model) }), "retry:thinking-binding-controls";
  }, $l878 = ($l879) => {
    if (!$l360.includes($m_uF.header)) return null;
    if ($l361() || !$m_eB($l879)) return null;
    return $l29 = $l29.filter(($l880) => $l880 !== $m_uF), $m_Mg($l28, $m_uF), $l362.push($m_uF), $m_t("[thinking-token-count] server rejected the beta; dropping it for this conversation and retrying.", { level: "warn" }), $m_a("tengu_thinking_token_count_rejected_retry", { model: $m_wt($l11.model), provider: $m_kT(), unnamed: true }), "retry:thinking-token-count-beta";
  }, $l881 = ($l882) => {
    try {
      let $l883 = $NEW_chunk_e6aww6q8_js_L6e($l882, [...$l360, ...$l524]);
      if ($l883.length === 0) return;
      let $l884 = new Set($l883);
      $l29 = $l29.filter(($l885) => !$l884.has($l885));
      for (let $l886 of $l883) {
        let $l887 = $m_qq($l882, $l886);
        $l39($l886, $l887), $m_a("tengu_beta_400_healed", { beta: $m_oie([$l886.header]), model: $m_wt($l11.model), provider: $m_kT(), status: $l882 instanceof $m_Mt ? $l882.status : void 0, only_mentioned: !$l887 && !$NEW_chunk_e6aww6q8_js_Hke($l882, $l886) });
      }
      if ($l884.has($m_vYe)) $l306 = $l305();
      if ($l884.has($m_UEn) && $l531 !== void 0) $m_Hdi($l531);
      return `retry:beta-rejected:${$l883.map(($l888) => $l888.name).join(",")}`;
    } catch ($l889) {
      $m_l($l889);
      return;
    }
  }, $l890 = ($l891) => {
    if (!($l891 instanceof $m_Mt) || $l891.status !== 400) return null;
    try {
      let $l892 = $m_Rke($l891), $l893 = !$l892 && $m_eB($l891);
      if ($l498 === "spent") return null;
      if ($l498 !== "idle") return $l498 = $l498 === "guessing" && $l893 ? "spent" : "unproven", $m_t(`[betas] the resend without ${$m_wE.header} also got an HTTP 400, so the backend is not recorded as rejecting it; ${$l498 === "spent" ? 'both said "invalid beta flag", so it is sent again from the next attempt' : "it stays off for the remaining attempts of this request and is sent again on the next request"}`, { level: "warn" }), null;
      if (!$l500 || $m_Qse($m_Ud($l11.model)) || !($l892 || $l893 && !$l361())) return null;
      return $l498 = $l892 ? "retrying" : "guessing", $m_t(`[betas] an HTTP 400 ${$l892 ? "reads as the backend rejecting" : 'says "invalid beta flag", which may be about'} ${$m_wE.header}; resending once without it`, { level: "warn" }), "retry:context-1m-beta";
    } catch ($l894) {
      return $m_l($l894), null;
    }
  }, $l895 = () => {
    if ($l498 !== "retrying" && $l498 !== "guessing") return;
    let $l896 = $l498 === "guessing";
    $l498 = "spent";
    try {
      $l29 = $l29.filter(($l897) => $l897 !== $m_wE), $m_H3r($l11.model), $m_a("tengu_beta_400_healed", { beta: $m_oie([$m_wE.header]), model: $m_wt($l11.model), provider: $m_kT(), status: 400, unnamed: $l896 });
    } catch ($l898) {
      $m_l($l898);
    }
  }, $l899 = ($l900) => {
    if (!$l360.includes($m_Pst.header) || !$NEW_chunk_e6aww6q8_js_x6e($l900)) return null;
    return $m_eps(), $m_OPt($m_Pst), $l29 = $l29.filter(($l901) => $l901 !== $m_Pst), $m_t("[thinking-resumption] server rejected the thinking-resumption beta header; disabled for this process", { level: "warn" }), $m_f("query_thinking_block_resumption", "header_rejected"), $l51 ? "surface:resume-prefill" : "retry:thinking-resumption-beta";
  }, $l902, $l903 = ($l904) => $l904 instanceof $m_Mt && $m_tB($l904), $l905 = 0, $l906 = null, $l907 = "all", $l908 = ($l909) => {
    if (!$l250) $l907 = $l909;
    else if ($l907 !== "all" && ($l909 === "all" || $l909.messageIndex < $l907.messageIndex || $l909.messageIndex === $l907.messageIndex && $l909.thinkingIndex < $l907.thinkingIndex)) $l907 = $l909;
    $l250 = true;
  }, $l910 = ($l911) => {
    if ($l171) return;
    let $l912 = $l174[$l911.messageIndex];
    if ($l912?.role !== "assistant" || !Array.isArray($l912.content)) return;
    let $l913 = $m_zve($l912.content[$l911.blockIndex]);
    if ($l913 === void 0) return;
    let $l914, $l915 = /* @__PURE__ */ new Map();
    for (let $l916 = 0; $l916 < $l247.length; $l916++) {
      let $l917 = $l247[$l916];
      if ($l917.type !== "assistant" || !Array.isArray($l917.message.content)) continue;
      let $l918 = $l917.message.id, $l919 = $l915.get($l918) ?? 0;
      for (let $l920 of $l917.message.content) {
        if ($l920.type !== "thinking" && $l920.type !== "redacted_thinking") continue;
        if ($m_zve($l920) === $l913) {
          if ($l914 !== void 0) return;
          $l914 = { messageIndex: $l916, indexInMessage: $l919 - ($l915.get($l918) ?? 0), thinkingIndex: $l919, messageId: $l918 };
        }
        $l919++;
      }
      $l915.set($l918, $l919);
    }
    return typeof $l914?.messageId === "string" ? $l914 : void 0;
  }, $l921 = ($l922) => {
    try {
      if (!$l903($l922)) return;
      $l905++;
      let $l923 = $l922.requestID || $l922.error?.request_id || null;
      if ($l905 === 1) $l906 = $l923;
      let $l924 = $m_QXt($l922), $l925 = $l247, $l926 = (() => {
        if ($l11.resumeIncompleteThinking) return;
        let $l927 = $l924?.block !== void 0 && $l905 <= $NEW_chunk_e6aww6q8_js_oSr ? $l910($l924.block) : void 0;
        if ($l927 !== void 0) {
          let $l928 = $m_aQe($l925, { messageIndex: $l927.messageIndex, thinkingIndex: $l927.indexInMessage });
          if ($l928 !== $l925) return { scope: "partial", stripped: $l928, from: $l927 };
        }
        let $l929 = $m_Vve($l925);
        return $l929 !== $l925 ? { scope: "all", stripped: $l929, from: "all" } : void 0;
      })();
      if ($l926 === void 0 && !$l250) $m_YXt($l922);
      let $l930 = $l926?.scope ?? "none", $l931 = $m_$mn($l925, $l926?.stripped ?? $l925);
      if ($l926 !== void 0) $l247 = $l267($l926.stripped, "error_recovery", true), $l908($l926.from);
      $m_t($l926 === void 0 ? "[thinking] prefix-lock rejection: nothing to strip; the error is returned." : `[thinking] prefix-lock rejection: stripped ${$l931.blocksStripped} of ${$l931.blocksSent} thinking block(s) (${$l930}) and retrying.`, { level: "warn" });
      let $l932 = $m_Dqr($l11.querySource, $l11.agentId);
      return $m_a("tengu_strict_prefix_lock_400_surfaced", { query_source: $m_Es($l11.querySource), model: $m_wt($l11.model), request_id: $m_Yg($l923), chain_request_id: $m_Yg($l906), client_request_id: $m_ye($l508), solicited: $l526, mismatch_kind: $m_ye($l924?.kind), failing_message_index: $l924?.block?.messageIndex, failing_block_index: $l924?.block?.blockIndex, thinking_blocks_sent: $l931.blocksSent, thinking_turns_sent: $l931.turnsSent, strip_scope: $m_c($l930), stripped_block_count: $l931.blocksStripped, stripped_turn_count: $l931.turnsStripped, attempt: $l905, client_change_kinds: $l932.kinds, first_changed_message_index: $l932.firstChangedMessageIndex, client_baseline: $l932.baseline, call_number: $l932.callNumber }), $l926 === void 0 ? void 0 : $l926.scope === "partial" ? `retry:prefix-lock-strip-${$l905}` : `retry:prefix-lock-strip-all-${$l905}`;
    } catch ($l933) {
      $m_l($l933);
    }
    return;
  }, $l934 = ($l935) => {
    let $l936 = $l921($l935);
    if ($l245 && $m_MM($l935)) $m_ZZ($l936 !== void 0 ? "rejected_healed" : "rejected_surfaced");
    return $l936;
  };
  function* $l937() {
  }
  function* $l938() {
    if ($l902 !== void 0) {
      let $l939;
      try {
      } catch ($l940) {
        $m_l($l940);
      }
      if ($l902 = void 0, $l939) yield $l939;
    }
  }
  let $l941 = false;
  function $l942() {
    let $l943 = $m_iee(() => $l237 && !$l941 && ($NEW_chunk_e6aww6q8_js_Wte?.relayStoppedInLastDispatch() ?? false), false);
    if ($l943) {
      let $l944 = $m_iee(() => $m_lQe($l0).size > 0, void 0);
      if ($l944 === true) $l250 = true, $l907 = "all", $l254 = true;
      else if ($l944 === false) $l255 = true;
    }
    if ($l255 && !$l250 && !$l941) return $l941 = true, $m_iee(() => $NEW_chunk_e6aww6q8_js_Wte?.markRelayThinkingStripRecorded("no_thinking"), void 0), $m_nn({ type: "thinking_stripped", scope: "all" });
    if (!$l250 || $l941) return;
    if ($l941 = true, $l254) $m_iee(() => $NEW_chunk_e6aww6q8_js_Wte?.markRelayThinkingStripRecorded($l943 ? "marker_same_request" : "marker"), void 0);
    return $m_nn($l907 === "all" ? { type: "thinking_stripped", scope: "all" } : { type: "thinking_stripped", scope: "partial", from: { messageId: $l907.messageId, thinkingIndex: $l907.thinkingIndex } });
  }
  async function* $l945() {
  }
  function $l946({ messageIndex: $l947, blockIndex: $l948 }) {
    let $l949 = $l174[$l947];
    return $l949?.role === "assistant" && Array.isArray($l949.content) ? $m_zve($l949.content[$l948]) : void 0;
  }
  function $l950($l951) {
    try {
      if (!$m_Rv() || $l171 || $l456 || $l266 || $l175 !== void 0) return;
      $m_Hfn({ body: $l951, blockKeyAt: $l946, replyHolding: ($l952, $l953) => {
        let $l954 = $l464($l952), $l955 = $l954 === void 0 ? void 0 : $l247[$l954];
        return $l954 !== void 0 && $l955?.type === "assistant" && Array.isArray($l955.message.content) && $l955.message.content.some(($l956) => $m_zve($l956) === $l953) ? { messageId: $l955.message.id, messageIndex: $l954 } : void 0;
      }, carrier: { key: $m_Tx($l11.querySource) !== null ? $m_Q$($l11.agentId) : void 0, querySource: $l11.querySource }, sentThreadPrefix: $m_mpn({ model: $l11.model, system: $l306, toolSchemas: $l355, thinkingConfig: $l35, getMessageHashes: $l352 }) });
    } catch ($l957) {
      $m_l($m_N($l957));
    }
  }
  let $l958 = ($l959) => {
    if ($l171) return;
    let $l960 = $m_Pfn({ body: $l959, blockKeyAt: $l946, carriedBlockHashes: () => $m_Fmn($l0), countThinkingSent: () => $m_$mn($l247, $l247), querySource: $l11.querySource, agentId: $l11.agentId, model: $l11.model, requestId: $l485, solicited: $l526, contextCompactedKind: $l961 });
    try {
      return $l960 && $m_nn($m_Nmn($l960, { requestId: $l485, model: $l11.model, querySource: $l11.querySource, requestedBehavior: $l527 }));
    } catch ($l962) {
      $m_l($l962);
      return;
    }
  }, $l963 = ($l964) => {
    let $l965 = $l11.serverRefusalFallback !== void 0 ? ($l964.content ?? []).reduce(($l966, $l967, $l968) => $m_lTe($l967) ? $l968 : $l966, -1) : -1, $l969 = $l964.stop_reason === "refusal", $l970, $l971 = 0, $l972 = false, $l973 = [];
    for (let [$l974, $l975] of ($l964.content ?? []).entries()) {
      if (!$m_lTe($l975)) {
        if ($l974 < $l965 && $l975.type !== "text" || $l969 && $l965 >= 0) {
          $l971++, $l972 ||= $l975.type === "tool_use";
          continue;
        }
        $l973.push($l975);
        continue;
      }
      let $l976 = $m_krn($l975);
      if ($l976 === void 0) {
        $m_Y("warn", "cli_malformed_fallback_block"), $m_a("tengu_rotunda_pennant_malformed", { block_index: $l974, non_streaming: true }), $m_f("refusal_fallback", "malformed_fallback_block", { non_streaming: true });
        continue;
      }
      $l973.push($m_EXe($l976)), $l970 = $l976;
      let $l977 = $l533;
      if ($m_a("tengu_rotunda_pennant_materialized", { armed: $l11.serverRefusalFallback !== void 0, mode: $m_c($l977), block_index: $l974, non_streaming: true }), $l976.reason === "refusal") $m_JZ({ model: $l26, requestId: $l485 || void 0, querySource: $l11.querySource, effort: $l317, fastMode: $l674, attempt: $l482, attribution: $m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: true, agentContext: $l11.agentContext });
    }
    if ($l973.length === 0 && ($l964.content ?? []).length > 0) $l973.push({ type: "text", text: $m_Sf, citations: [] });
    let $l978 = $l11.serverRefusalFallback !== void 0 ? $m_bYn($l964.usage) : void 0;
    if ($l704 = $l978?.servedFallbackModel !== void 0 || $l11.serverRefusalFallback !== void 0 && $l970 !== void 0, $l705 = false, $l543 = false, $l706 = $l978, $l971 > 0) $m_a("tengu_rotunda_pennant_sync_dropped", { dropped_count: $l971, had_tool_use: $l972, chain_exhausted: $l969 });
    return { content: $l973, lastHop: $l970, iterations: $l978 };
  };
  function* $l979($l980, $l981, $l982) {
    if ($l982 !== void 0 && !$l543) {
      $l543 = true;
      let $l983 = $m_mAe($m_Pm, $l981.usage);
      $m_a("tengu_fallback_credit_minted", { request_id: $m_ye($l485), model: $m_wt($l11.model), fallback_target_model: $m_wt($l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l704 ? $l11.serverRefusalFallback.model : void 0)), token_length: $l982.length, input_tokens: $l983.input_tokens, output_tokens: $l983.output_tokens, cache_read_input_tokens: $l983.cache_read_input_tokens, cache_creation_input_tokens: $l983.cache_creation_input_tokens, cache_creation_5m_input_tokens: $l983.cache_creation?.ephemeral_5m_input_tokens ?? 0, cache_creation_1h_input_tokens: $l983.cache_creation?.ephemeral_1h_input_tokens ?? 0, service_tier: $m_le($l983.service_tier), speed: $m_le($l983.speed), query_source: $m_Es($l11.querySource), ...$l11.queryTracking && { query_chain_id: $m_ye($l11.queryTracking.chainId), query_depth: $l11.queryTracking.depth } });
    }
    let $l984 = $l11.serverRefusalFallback !== void 0 ? $l980.lastHop?.model ?? $l980.iterations?.servedFallbackModel : void 0;
    if (!$l705 && $l984 !== void 0) $l705 = true, yield { type: "server_fallback", fromModel: $l980.lastHop?.fromModel ?? $l11.model, toModel: $l984, reason: $l980.lastHop !== void 0 ? "refusal" : "sticky", apiRefusalCategory: $l980.lastHop?.category ?? null, midStream: false, requestId: $l485 ?? null, refusedEffort: $l348(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: $l981.stop_reason };
    let $l985 = $l11.refusalFallbackModelLane === "silent", $l986 = !$l985 ? $l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l704 ? $l11.serverRefusalFallback.model : void 0) : void 0, $l987 = $l11.refusalFallbackCascadeHop, $l988 = $l981.stop_reason === "refusal" && $l986 !== void 0 && $l987 === void 0 ? $m_gKo({ originalModelCanonical: $m_Je($l11.model), armedFallbackModel: $l986, apiRefusalCategory: $l981.stop_details?.category ?? null, armedTargetIsRefusingModel: $m_uvt($l11.model, $l986), resolveTarget: ($l989) => $m__zt({ mappedTarget: $l989, armedFallbackModel: $l986, refusingModel: $l11.model, triedModels: [$m_fvt($l11.model)] }), routesOverride: $NEW_chunk_hwmsct5x_js_Y8r() }) : void 0, $l990 = $l988 !== void 0 ? $l988.model : $l986;
    if ($l988 !== void 0) $m_aKr({ route: $l988, model: $l11.model, armedFallbackModel: $l986, apiRefusalCategory: $l981.stop_details?.category, requestId: $l485 });
    if ($l981.stop_reason === "refusal" && $l990 !== void 0) return $l805(), $l669 = true, yield { type: "fallback_request", trigger: "refusal", originalModel: $l11.model, fallbackModel: $l990, requestId: $l485 ?? null, refusedEffort: $l348(), apiRefusalCategory: $l981.stop_details?.category ?? null, apiRefusalExplanation: $l981.stop_details?.explanation ?? null, creditCode: $l982 ?? null, mintedStateless: !$l467, ...$m_pKo($l988, $l987) }, true;
    let $l991 = $m_lFt($l981.stop_reason, $l981.stop_details, $l485, $l984 ?? $l11.model, $l981.id);
    if ($l991) {
      let $l992 = $m_O4() || $m_mK() !== void 0;
      if ($l986 !== void 0 || $l11.refusalFallbackModel !== void 0 || $m_cvt($l11.model) && $m_vz() || $m_Jhn() || $l992) $m_m("refusal_fallback", $l988?.matched === "none" ? "route_declined" : $l985 ? "sync_silent_stood" : $l984 !== void 0 ? "server_chain_exhausted" : $l992 ? "client_chain_exhausted" : $m_cvt($l11.model) && $m_fKr() ? "disabled_by_config" : "not_armed", { convolute_arcades: $m_Xhn(), arm_source: $m_c($m_K0e()), armed: $l986 !== void 0, model_scope: $m_c($m_TZ($l11.model)) });
      yield { type: "refusal_no_fallback", originalModel: $l11.model, requestId: $l485 ?? null, apiRefusalCategory: $l981.stop_details?.category ?? null, apiRefusalExplanation: $l981.stop_details?.explanation ?? null }, yield $l991;
    }
    let $l993 = $l994($l981);
    if ($l993 !== void 0) yield $l993;
    return false;
  }
  function $l994($l995) {
    try {
      if (!$m_k("tengu_vast_sunset", true)) return;
      return $m_Jmn($l995.stop_reason, Math.min($l670, $m_tRn), $l995.usage?.output_tokens ?? 0, $l670 >= $m_tRn);
    } catch ($l996) {
      $m_l($m_Xe($m_N($l996), "building the cut-short error for a non-streaming response failed"));
      return;
    }
  }
  let $l997 = [];
  function $l998($l999, $l1000) {
    if ($l999.size > 0) $l997.push({ type: "hint_clears", ids: [...$l999], contentById: Object.fromEntries($l1000) });
  }
  function* $l1001() {
    yield* $l997.splice(0);
  }
  async function* $l1002($l1003, $l1004) {
    let { message: $l1005, requestId: $l1006, headers: $l1007, creditCode: $l1008 } = yield* $NEW_chunk_e6aww6q8_js_fSr({ model: $l11.model, fetchOverride: $l11.fetchOverride, source: $l11.querySource, requestClass: $l11.requestClass, agentContext: $l11.agentContext, promptId: $l20, ccsSender: $l21, permissionContext: $l324, toolNames: $l326, credentials: $l11.credentials, storageV5: $l11.storageV5, clock: $l12, queryTracking: $l11.queryTracking, llmSpan: $l479, contextCompactedKindForWire: $l961, compactionRequestKindForWire: $l1009, prevToolDurationsForWire: $l1010 }, { model: $l11.model, fallbackModel: $l11.fallbackModel, accessFallbackModel: $l10, toolFreeHelper: $l11.toolFreeHelper, ...$m_os() && { fastMode: $l319 }, modelIsRefusalFallbackTarget: $l11.modelIsRefusalFallbackTarget, signal: $l4, initialConsecutive529Errors: $l689.counts().overloaded, querySource: $l11.querySource, maxRetries: $l689.retriesLeft(), modelCallRetries: $l689, clock: $l12, random: $l11.random, isResumePrefillRequest: $l51, failedStreamOutlastedTimeout: $l1004, onRetryStatus: $l11.onRetryStatus, subscribeRetryWake: $l11.subscribeRetryWake, onQuotaWindowWait: $l515, isUsageLimitLifted: $l519, lowPriorityWait: $l512, stampDispatchHeader: $l693, onApiError: async ($l1011) => {
      let $l1012 = $l457($l1011);
      if ($l1012 !== void 0) return $l1012;
      let $l1013 = await $l697($l1011);
      if ($l1013 !== void 0) return $l1013;
      let $l1014 = $l431($l1011);
      if ($l1014 !== void 0) return $l1014;
      let $l1015 = $l364($l1011);
      if ($l1015 !== void 0) return $l1015;
      let $l1016 = $l869($l1011);
      if ($l1016 !== null) return $l1016;
      let $l1017 = $l784($l1011, "sync");
      if ($l1017 !== void 0) return $l1017;
      let $l1018 = $l790($l1011);
      if ($l1018 !== void 0) return $l1018;
      let $l1019 = $m_DKo($l1011, $l11.model, $l11.querySource);
      if ($l1019 === $m_hKr) return;
      if ($l1019 !== null) return $l1019;
      let $l1020 = $l866($l1011);
      if ($l1020 !== null) return $l1020;
      let $l1021 = $l811($l1011);
      if ($l1021) return $l1021;
      let $l1022 = $l407($l1011);
      if ($l1022) return $l1022;
      let $l1023 = $l864($l1011);
      if ($l1023 !== null) return $l1023;
      let $l1024 = $l899($l1011);
      if ($l1024 === "surface:resume-prefill") return;
      if ($l1024 !== null) return $l1024;
      let $l1025 = $l871($l1011);
      if ($l1025 !== null) return $l1025;
      let $l1026 = $l878($l1011);
      if ($l1026 !== null) return $l1026;
      let $l1027 = $l881($l1011);
      if ($l1027 !== void 0) return $l1027;
      $l391($l1011);
      let $l1028 = $l890($l1011);
      if ($l1028 !== null) return $l1028;
      let $l1029 = $l404($l1011);
      if ($l1029 !== null) return $l1029;
      let $l1030 = $l934($l1011);
      if ($l1030 !== void 0) return $l1030;
      return $l765($l1011) ?? $l755($l1011) ?? $l769($l1011) ?? $l422($l1011, false) ?? $l707($l1011, "sync") ?? $l433($l1011) ?? $l450($l1011) ?? $l721($l1011) ?? $l409($l1011) ?? $l401($l1011) ?? $l393($l1011);
    } }, $l552, ($l1031, $l1032, $l1033) => {
      $l482 = $l1031, $l670 = $l1033, $l303 = $l1032;
    }, ($l1034) => $l504($l1034, false), $l1003);
    $l485 = $l1006, $l333($l1006, $l1007, true), $l950($l1005), $l358?.settle({ kind: "ok" }, $l485, $l1005.id);
    try {
      $l838($l1005.usage), $l845($l1005.usage);
    } catch {
    }
    $l848(), $l849(), $l851(), $l852(), $l853(), $l429(), $l419(), $l416(), $l895(), $l396(), $l814(), $m_a("tengu_nonstreaming_fallback_success", { model: $m_wt($l11.model), request_id: $m_Yg($l1006), originating_request_id: $m_Yg($l501), fallback_cause: $m_c($l1003.cause), attempt: $l482 }), yield* $l938(), yield* $l937(), yield* $l860(), $l673 = $l1005.diagnostics?.cache_miss_reason ?? void 0;
    let $l1035 = $l963($l1005), $l1036 = $l285 ? $m_o$e($l1035.content) : void 0;
    if ($l1036?.degraded) $m_r$e();
    let $l1037 = $l1036?.inputs, $l1038 = $m_p$e($l1035.content, $l1037), { content: $l1039, batchToolUses: $l1040 } = $m_Gpn($m_Acn($l1035.content, $l3, $l11.agentId, { requestId: $l485 ?? void 0, messageId: $l1005.id }, $l11.storageV5), $l3, ($l1041, $l1042) => $m_Rht($l1041, $l1042, $l11.agentId, $l11.storageV5));
    if ($l487 !== void 0) $l490($l487, $l1005, $l1005.content);
    $l671 = $l1007;
    let $l1043 = $l958($l1005), $l1044 = $l942();
    if ($l1044) yield $l1044;
    let $l1045 = $l253();
    if ($l1045) yield $l1045;
    if ($l1043) yield $l1043;
    let $l1046 = { message: { ...$l1005, content: $l1039, usage: $m_mAe($m_Pm, $l1005.usage), ...$l462 && $l1005.context_management && { context_management: $NEW_chunk_g54kbxqw_js_A7o($l1005.context_management, $l460?.edit, $l174) } }, ...$l1040.length > 0 && { batchToolUses: $l1040 }, ...$l1037 !== void 0 && { wireToolInputs: $l1037 }, ...$l1038 !== void 0 && { wireIngestContext: $l1038 }, ...$l487 !== void 0 && $m_w1e($l487), apiBlockIndex: 0, requestId: $l485 ?? void 0, requestRef: $l503, requestedModel: $l11.model, ...$m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), type: "assistant", uuid: $NEW_chunk_e6aww6q8_js_Vte(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...false, ...$l48 && { advisorModel: $l48 }, ...$l345 !== void 0 && { effort: $l345 }, perTurnEffort: $l346, perTurnTiming: $l347, ...{} };
    return $NEW_chunk_e6aww6q8_js_R4e($l28, $l1046), $l651.push($l1046), $l668 = $l1046, $l300 = false, yield $l1046, yield* $l979($l1035, $l1005, $l1008);
  }
  let $l1047 = false, $l1048 = /* @__PURE__ */ new Map(), $l1049 = /* @__PURE__ */ new Set(), $l1050 = /* @__PURE__ */ new Set(), $l1051, $l1052 = $m_ISe($l11.agentContext) ?? ($l11.isBackgroundAgent ? $l11.agentId : void 0), $l961 = $m_ss($l11.querySource) === "main" && $m_Tv($l11.querySource, $l11.agentId) ? $m_ads() : void 0, $l1009 = $l11.compactionRequestKind, $l1010 = $l11.prevToolDurations !== void 0 ? $m_M9t($l11.prevToolDurations) : void 0;
  try {
    $m_NI("api_call", $l1052);
    e: for (; ; ) {
      let $l1053 = function() {
        if ($l1054 !== null) $l1054(), $l1054 = null;
        if ($l1055) $l1055 = false, $l11.onRetryStatus?.(null);
        if ($l1056 !== null) $l1056(), $l1056 = null;
        if ($l1057 !== null) $l1057(), $l1057 = null;
      }, $l1058 = function() {
        if (!$l11.onRetryStatus || !$l1059) return;
        let $l1060 = $l1059.lastAt, $l1061 = $l12.monotonicNow();
        $l1054 = $l12.setTimeout(() => {
          if ($l12.monotonicNow() - $l1061 < $l1062 / 2) return;
          if ($l1059.lastAt > $l1060) {
            $l1058();
            return;
          }
          let $l1063 = $l12.monotonicNow() - $l1059.lastAt;
          if ($l675 && $l1063 < $l1064) {
            $l1058();
            return;
          }
          let $l1065 = $l1059.lastAt === 0 ? $l12.monotonicNow() - $l1066 : $l1063;
          $l1055 = true, $l11.onRetryStatus?.({ kind: "stalled", deadline: $l12.now() + Math.max(0, $l1067 - $l1065) });
        }, $l1062, { unref: true });
      }, $l1068 = function() {
        if ($l1053(), $l1058(), !$l1069) return;
        let $l1070 = $l12.monotonicNow(), $l1071 = $l12.now(), $l1072 = $l1073;
        $l1056 = $l12.setTimeout(() => {
          if ($l12.monotonicNow() - $l1070 < $l1072) return;
          $m_t(`Streaming idle warning: no chunks received for ${$l1072 / 1e3}s`, { level: "warn" }), $m_Y("warn", "cli_streaming_idle_warning");
        }, $l1073), $l1057 = $l12.setTimeout(() => {
          if ($l1074 = $m_j7s($l12, { armedAt: $l1070, wallArmedAt: $l1071, idleMs: $l1075 }), $l1074 !== void 0) {
            $l523();
            return;
          }
          $l1076 = true, $l1077 = $l12.monotonicNow(), $m_t(`Streaming idle timeout: no chunks received for ${$l1075 / 1e3}s, aborting stream`, { level: "error" }), $m_Y("error", "cli_streaming_idle_timeout"), $m_a("tengu_streaming_idle_timeout", { model: $m_wt($l11.model), request_id: $m_Yg($l485), timeout_ms: $l1075, tier: $m_b("event") }), $l523();
        }, $l1075);
      };
      if ($l514 = void 0, $m_gg("query_client_creation_start"), $l16) $m_Dx("request_build"), $m_Mx("client_creation");
      let $l1078 = $m_Hve(() => $m_K$({ maxRetries: 0, model: $l11.model, fetchOverride: $l11.fetchOverride, source: $l11.querySource, requestClass: $l11.requestClass, agentContext: $l11.agentContext, promptId: $l20, ccsSender: $l21, permissionContext: $l324, toolNames: $l326, credentials: $l11.credentials, storageV5: $l11.storageV5, signal: $l4, clock: $l12, noResponseRetryLedger: $l687 }), async ($l1079, $l1080, $l1081) => {
        if ($l536 === void 0) $l544("attempt_errored", $l485 ?? null, null);
        if ($l482 = $l1080, $l674 = $l1081.fastMode ?? false, $l481 = $l12.monotonicNow(), $l514 = void 0, $l483.push($l481), $m_gg("query_client_creation_end"), $l16) $m_Dx("client_creation"), $m_Mx("request_build");
        let $l1082 = $l552($l1081);
        try {
          $l640($l1082);
        } catch ($l1083) {
          $m_l($m_N($l1083));
        }
        if ($m_tgn($l1082), $l504($l1082, true), $l670 = $l1082.max_tokens, $m_gg("query_api_request_sent"), $m_t(`[API:timing] dispatching to ${$m_Ud($l11.model)} model=${$l11.model}`), $l303 = $l12.now(), $l658 === void 0 && $l11.queryTracking?.roundStartedAtMs !== void 0) $l11.queryTracking.firstDispatchedAtMs ??= performance.now(), $l658 = Math.round($l11.queryTracking.firstDispatchedAtMs - $l11.queryTracking.roundStartedAtMs);
        if (!$l11.agentId) {
          if ($l202) $m_th("api_request_sent");
          if ($l16) $m_Dx("request_build");
          if ($l1080 === 1 && !$l655) {
            if ($l655 = $l12.monotonicNow(), $l656 = $l12.now(), $l202) $m_ssi();
            if ($l16) $l657 = $m_ksn($l655);
          }
          if ($l202) try {
            $NEW_chunk_e6aww6q8_js_n9t();
          } catch ($l1084) {
            $m_l($m_N($l1084));
          }
        }
        $l522();
        let $l1085 = $m_Fu(process.env.CLAUDE_SLOW_FIRST_BYTE_MS) || 3e4;
        $l521 = $l12.setTimeout(() => {
          $l521 = null;
          let $l1086 = $l12.monotonicNow() - $l481;
          $m_t(`Slow first byte: no stream chunk ${($l1086 / 1e3).toFixed(1)}s after request sent (attempt ${$l1080})`, { level: "warn" }), $m_a("tengu_api_slow_first_byte", { model: $m_wt($l11.model), provider: $m_kT(), attempt: $l1080, elapsed_ms: Math.round($l1086) });
        }, $l1085);
        let $l1087 = $m_ngn($l479, $l483.length);
        $l508 = $l1087.clientRequestId;
        let $l1088 = $l1087.headers;
        if ($l511 = $m_ps() && $m_rnt(), $l511) $l1088[$m_ivt] = $m_Y2r;
        if ($m_Hmr($l11, $l511, $l24)) $l1088[$m_ivt] = "extended";
        if ($l693($l1088, $l511), $l11.fallbackStampFromModel !== void 0 && $m_Te() === "firstParty" && $m_Pi()) for (let [$l1089, $l1090] of [[$NEW_chunk_hwmsct5x_js_HXo, $l11.fallbackStampFromModel], [$NEW_chunk_hwmsct5x_js_NXo, $l11.fallbackStampCategory], [$NEW_chunk_hwmsct5x_js_$Xo, $l11.fallbackStampTrigger], [$NEW_chunk_hwmsct5x_js_FXo, $l11.fallbackStampOriginalRequestId]]) {
          let $l1091 = $m_pZn($l1090);
          if ($l1091 !== void 0) $l1088[$l1089] = $l1091;
        }
        $m_ogn($l1088, $l961, $l1009), $m_rgn($l1088, $l1010);
        let $l1092 = $l536;
        if ($l539 = $l1092 !== void 0, $l1092 !== void 0) $l536 = void 0, $l443 = true;
        if ($l337 = $m_qm(), $l508 !== void 0) $m_B7s($l508, { escalated: $l687.count > 0 }), $m_q7s($l508, performance.now());
        if ($m_ss($l11.querySource) === "main") setTimeout($m_vsn, 0);
        setTimeout($m_C4o, 0, $l11.querySource, $l11.agentId);
        let $l1093 = { ...$m_zpn($l1082), ...$l1092 !== void 0 && { fallback_credit_token: $l1092 }, stream: true }, $l1094 = $m_x0r($l11.fetchOverride) ? $NEW_chunk_e6aww6q8_js_kcn($l1093, $m_ss($l11.querySource) === "main" && $l11.agentId === void 0) : void 0, $l1095 = await $NEW_chunk_e6aww6q8_js_wcn($l1094, $l1093, () => $l1079.beta.messages.create($l1093, { signal: $l4, ...$l1094 === void 0 ? Object.keys($l1088).length > 0 && { headers: $l1088 } : { body: $l1094, headers: { ...$l1088, "content-type": "application/json" } } }).withResponse()).catch(($l1096) => {
          throw $l522(), $l1096;
        });
        if ($m_gg("query_response_headers_received"), $l485 = $m_M2e($l1095.request_id, $l1095.response?.headers), $l509 = $l1095.response, $l513 = $l12.now(), $l333($l485, $l1095.response?.headers, false), $l514 = $l1095.response && { status: $l1095.response.status, headers: $l1095.response.headers, latencyMs: Math.round($l12.monotonicNow() - $l481) }, $NEW_chunk_e6aww6q8_js_d_n($l514, $l1094 !== void 0), $l1092 !== void 0) $m_a("tengu_rotunda_pennant_credit_echoed", { mint_request_id: $m_ye($l11.fallbackCreditMintRequestId), mint_model: $m_wt($l11.fallbackCreditMintModel), request_id: $m_ye($l485), client_request_id: $m_ye($l508), model: $m_wt($l11.model), token_length: $l1092.length, query_source: $m_Es($l11.querySource) });
        return $l1095.data;
      }, { model: $l11.model, credentials: $l11.credentials, storageV5: $l11.storageV5, fallbackModel: $l11.fallbackModel, accessFallbackModel: $l10, toolFreeHelper: $l11.toolFreeHelper, ...$m_os() ? { fastMode: $l319 } : false, modelIsRefusalFallbackTarget: $l11.modelIsRefusalFallbackTarget, signal: $l4, initialConsecutive529Errors: $l689.counts().overloaded, maxRetries: $l689.retriesLeft(), noResponseRetryLedger: $l687, modelCallRetries: $l689, clock: $l12, random: $l11.random, isResumePrefillRequest: $l51, querySource: $l11.querySource, onRetryStatus: $l11.onRetryStatus, subscribeRetryWake: $l11.subscribeRetryWake, onQuotaWindowWait: $l515, isUsageLimitLifted: $l519, lowPriorityWait: $l512, onError: async ($l1097) => {
        $l649();
        let $l1098 = $l457($l1097);
        if ($l1098 !== void 0) return $l1098;
        let $l1099 = $l431($l1097);
        if ($l1099 !== void 0) return $l1099;
        let $l1100 = $l364($l1097);
        if ($l1100 !== void 0) return $l1100;
        let $l1101 = $l869($l1097);
        if ($l1101 !== null) return $l1101;
        if ($l321 && $m_bke($l1097)) {
          if ($l321 = false, $m_hW) $m_Mg($l28, $m_hW);
          return $m_JI(false), $m_qEn(true), $m_t("[auto-mode] server rejected afk-mode beta \u2014 dropping header and circuit-breaking auto for this session", { level: "warn" }), "retry:afk-beta";
        }
        let $l1102 = await $l697($l1097);
        if ($l1102 !== void 0) return $l1102;
        if ($m_g4e($l1097)) {
          let $l1103 = $l247, $l1104 = $m_xw($l1103), $l1105 = $l1103.findIndex(($l1106, $l1107) => $l1104[$l1107] !== $l1106), $l1108 = $l1103.reduce(($l1109, $l1110, $l1111) => $l1104[$l1111] !== $l1110 ? $l1109 + 1 : $l1109, 0), $l1112 = $NEW_chunk_e6aww6q8_js_v7t() && $l1105 !== -1, $l1113;
          if ($l1112 && !$l11.resumeIncompleteThinking && $l528 !== "enabled") try {
            let $l1114 = $l1103.findIndex(($l1115, $l1116) => $l1116 >= $l1105 && $m_Fmr($l1115)), $l1117 = $l1114 === -1 ? void 0 : $l1103[$l1114];
            if ($l1117?.type === "assistant") {
              let $l1118 = $m_aQe($l1104, { messageIndex: $l1114, thinkingIndex: 0 });
              if ($l1118 !== $l1104) {
                $l1104 = $l1118;
                let $l1119 = $l1117.message.id;
                if (typeof $l1119 === "string") {
                  let $l1120 = 0;
                  for (let $l1121 = 0; $l1121 < $l1114; $l1121++) {
                    let $l1122 = $l1103[$l1121];
                    if ($l1122.type === "assistant" && $l1122.message.id === $l1119 && Array.isArray($l1122.message.content)) $l1120 += $m_U($l1122.message.content, ($l1123) => $l1123.type === "thinking" || $l1123.type === "redacted_thinking");
                  }
                  $l1113 = { messageIndex: $l1114, indexInMessage: 0, thinkingIndex: $l1120, messageId: $l1119 };
                } else $l1104 = $m_Vve($l1104), $l1113 = "all";
              }
            }
          } catch ($l1124) {
            $m_l($m_N($l1124)), $l1104 = $m_xw($l1103), $l1113 = void 0;
          }
          if ($l247 = $l267($l1104, "error_recovery"), $l748(), $l1112) {
            if ($l251 = true, $l1113 !== void 0) $l908($l1113);
          }
          return $m_t($l1108 === 0 ? "[advisor] the server could not process an advisor result sent earlier in this conversation; nothing to remove, retrying as sent." : `[advisor] the server could not process an advisor result sent earlier in this conversation; retrying with the advisor blocks removed from ${$l1108} message(s)${$l1113 === "all" ? " and all thinking removed" : $l1113 !== void 0 ? " and the thinking after them removed" : ""}${$l1112 ? "; recorded, so later requests leave them out too." : "; not recorded, so the next request sends them again."}`, { level: "warn" }), $m_a("tengu_advisor_strip_retry", { query_source: $m_Es($l11.querySource), strip_recorded: $l1112, stripped_message_count: $l1108, thinking_also_stripped: $l1113 !== void 0 }), "retry:advisor-strip";
        }
        let $l1125 = $l784($l1097, "stream");
        if ($l1125 !== void 0) return $l1125;
        let $l1126 = $l790($l1097);
        if ($l1126 !== void 0) return $l1126;
        let $l1127 = $m_DKo($l1097, $l11.model, $l11.querySource);
        if ($l1127 === $m_hKr) return;
        if ($l1127 !== null) return $l1127;
        let $l1128 = $l866($l1097);
        if ($l1128 !== null) return $l1128;
        {
          let $l1129 = $m_yke($l1097);
          if ($l1129) {
            let $l1130 = $l1097 instanceof Error ? $l1097.message : String($l1097), $l1131 = $m_O3($l247, $l1130);
            if ($l1131 !== $l247) return $l247 = $l267($l1131, "error_recovery"), $l678.set($l1129.kind, $l1130), $m_nQe($l11, $l1129.kind, $l1130), $m_a("tengu_media_block_strip_retry", { kind: $m_c($l1129.kind), targeted: 1 }), "retry:media-strip-over-dimension-limit";
            let $l1132 = $l1129.messageIdx !== void 0 ? $l464($l1129.messageIdx) : void 0;
            if ($l1129.messageIdx !== void 0 && $l1132 !== void 0 && $l1129.contentIdx !== void 0) {
              let $l1133 = `${$l1129.messageIdx}.${$l1129.contentIdx}`, $l1134 = $l682.get($l1133) ?? 0, $l1135 = $l1129.nestedContentIdx !== void 0 && $l1134 < $l681 ? $l1129.nestedContentIdx : void 0, $l1136 = $m_KSt($l247, { messageIdx: $l1132, contentIdx: $l1129.contentIdx, nestedContentIdx: $l1135, kind: $l1129.kind }, $l1130);
              if ($l1136 !== $l247) {
                if ($l247 = $l267($l1136, "error_recovery"), $l678.set($l1129.kind, $l1130), $m_nQe($l11, $l1129.kind, $l1130), $l1135 !== void 0) $l682.set($l1133, $l1134 + 1);
                let $l1137 = `messages.${$l1129.messageIdx}.content.${$l1129.contentIdx}`, $l1138 = $l1135 !== void 0 ? `${$l1137}.tool_result.content.${$l1135}` : $l1129.nestedContentIdx !== void 0 ? `${$l1137}.tool_result.content.*` : $l1137;
                return $m_t(`Removed unprocessable ${$l1129.kind} at ${$l1138}; retrying.`, { level: "warn" }), $m_a("tengu_media_block_strip_retry", { kind: $m_c($l1129.kind), message_idx: $l1129.messageIdx, content_idx: $l1129.contentIdx, targeted: 1 }), `retry:media-strip:${$l1129.kind}:${$l1138}`;
              }
            }
            let $l1139 = $l680.value < $l679 ? $m_YSt($l247, $l1129.kind, $l1130) : void 0;
            if ($l1139) return $l680.value++, $l247 = $l267($l1139.messages, "error_recovery"), $l678.set($l1129.kind, $l1130), $m_nQe($l11, $l1129.kind, $l1130), $m_t(`Removed base64 ${$l1129.kind} blocks from carrier ${$l1139.carrierIdx} (API 400 had no usable path); retrying.`, { level: "warn" }), $m_a("tengu_media_block_strip_retry", { kind: $m_c($l1129.kind), targeted: 0, carrier_idx: $l1139.carrierIdx }), `retry:media-strip-latest:${$l1129.kind}:${$l1139.carrierIdx}`;
          }
        }
        if ($l329 && $NEW_chunk_e6aww6q8_js_C6e($l1097)) return $l329 = false, $m_AEt($l28, $l337, $l202), "retry:cache-keepalive-beta";
        let $l1140 = $l899($l1097);
        if ($l1140 === "surface:resume-prefill") return;
        if ($l1140 !== null) return $l1140;
        {
          let $l1141 = $m_Dke($l1097);
          if ($l1141) {
            let $l1142 = $l1141 === "enabled" ? "adaptive" : "enabled";
            return $m_vfs($l11.model, $l1142), $m_t(`[thinking] model rejected thinking.type=${$l1141}; retrying with ${$l1142}. For Bedrock application-inference-profile ARNs with bearer-token auth, granting bedrock:GetInferenceProfile to the token avoids this round-trip.`, { level: "warn" }), "retry:thinking-type";
          }
        }
        let $l1143 = $l864($l1097);
        if ($l1143 !== null) return $l1143;
        let $l1144 = $l871($l1097);
        if ($l1144 !== null) return $l1144;
        let $l1145 = $l878($l1097);
        if ($l1145 !== null) return $l1145;
        let $l1146 = $l881($l1097);
        if ($l1146 !== void 0) return $l1146;
        $l391($l1097);
        let $l1147 = $l890($l1097);
        if ($l1147 !== null) return $l1147;
        let $l1148 = $l404($l1097);
        if ($l1148 !== null) return $l1148;
        {
          let $l1149 = $l921($l1097);
          if ($l1149 !== void 0) {
            if ($l245 && $m_MM($l1097)) $m_ZZ("rejected_healed");
            return $l1149;
          }
        }
        if (!$l11.resumeIncompleteThinking && $m_MM($l1097)) {
          let $l1150 = 0, $l1151 = 0;
          for (let $l1152 of $l247) {
            if ($l1152.type !== "assistant" || !Array.isArray($l1152.message.content)) continue;
            for (let $l1153 of $l1152.message.content) if ($l1153.type === "redacted_thinking") $l1150++;
            else if ($l1153.type === "thinking") if ("signature" in $l1153 && $l1153.signature) $l1150++;
            else $l1151++;
          }
          let $l1154 = $m_Vve($l247);
          if ($l1154 !== $l247) {
            if ($l247 = $l267($l1154, "error_recovery"), $l908("all"), $l245) $m_ZZ("rejected_fell_back");
            return $m_t("[thinking] server rejected a thinking block; stripping all thinking blocks and retrying.", { level: "warn" }), $m_a("tengu_thinking_signature_strip_retry", { query_source: $m_Es($l11.querySource), model: $m_wt($l11.model), stripped_signed_count: $l1150, stripped_unsigned_count: $l1151 }), "retry:thinking-signature-strip";
          }
        }
        if ($l245 && $m_MM($l1097)) $m_ZZ("rejected_surfaced");
        {
          let $l1155 = $l811($l1097);
          if ($l1155) return $l1155;
        }
        {
          let $l1156 = $l407($l1097);
          if ($l1156) return $l1156;
        }
        {
          let $l1157 = $l755($l1097);
          if ($l1157 !== void 0) return $l1157;
        }
        {
          let $l1158 = await $l344?.onRequestError($l1097, $l247);
          if ($l1158) return $l247 = $l267($l1158.messages, "microcompact"), $l998($l1158.clearedIds, $l1158.clearedContent), "retry:context-hint";
        }
        return $l765($l1097) ?? $l769($l1097) ?? $l422($l1097, $l539) ?? $l707($l1097, "stream") ?? $l433($l1097) ?? $l450($l1097) ?? $l721($l1097) ?? $l409($l1097) ?? $l401($l1097) ?? $l393($l1097);
      } }), $l1159;
      do
        if ($l1159 = await $l1078.next(), yield* $l1001(), !("controller" in $l1159.value)) yield $l1159.value;
      while (!$l1159.done);
      if ($l484 = $l1159.value, $l848(), $l849(), $l851(), $l852(), $l853(), $l429(), $l419(), $l814(), $l683) $l683 = false, $l11.onRetryStatus?.(null);
      for (let [$l1160, $l1161] of $l678) yield $m_Gs({ ...$m__le($l1160, $l1161), error: "invalid_request", errorDetails: $l1161 });
      $l678.clear(), yield* $l938(), yield* $l937(), yield* $l860();
      let $l1059 = $l509 ? $l509._chunkTimes ?? void 0 : void 0;
      if ($l1059 === void 0 && $l509 !== void 0 && $m_Te() === "bedrock" && $m_SKr("bedrock")) $m_t("wire-heartbeat: _chunkTimes absent on a Bedrock stream with the byte watchdog enabled \u2014 heartbeat side-channel unavailable for this stream (bedrock-sdk \u22650.32.0 eventstream\u2192SSE transcode drops it; also expected if the response was not vnd.amazon.eventstream, e.g. behind a header-rewriting proxy)");
      let $l1066 = $l12.monotonicNow();
      $l651.length = 0, $l652 = 0, $l653 = void 0, $l654 = 0, $l381 = void 0, $l659.length = 0, $l704 = false, $l705 = false, $l1047 = false, $l1048.clear(), $l1049.clear(), $l1050.clear(), $l1051 = void 0, $l543 = false, $l304 = $m_Pm, $l660 = null, $l662 = null, $l663 = false, $l664 = "none";
      let $l1162 = false;
      $l300 = false, $l675 = false;
      let $l1163 = false, $l1164 = false, $l1165 = false, $l1166 = null, $l1167 = /* @__PURE__ */ new WeakSet(), $l1168 = /* @__PURE__ */ new WeakMap(), $l1169 = false, $l1170 = false, $l1171 = null, $l1172 = false, $l1173 = null, $l1174 = 0;
      function* $l1175({ responseUnfinished: $l1176 }) {
        if (!$l1170) return;
        let $l1177 = $l1172 ? null : $l1171;
        $l1170 = false, $l1171 = null, $l1172 = false;
        let $l1178 = $l1173 !== null ? { apiMessageId: $l1173 } : void 0;
        if ($l1177 !== null) yield { type: "stream_event", event: { type: "content_block_stop", index: $l1177 }, ...$l1178 };
        yield { type: "stream_event", event: { type: "message_stop" }, ...$l1178, ...$l1176 && $l1173 !== null && Number.isSafeInteger($l1174) ? { abandonedBlocks: { apiMessageId: $l1173, fromBlockIndex: $l1174 } } : void 0 };
      }
      let $l1179 = null, $l1180 = 0, $l1181 = 0, $l1182 = null, $l1183 = null, $l1184 = null, $l1185 = 0, $l1186 = false, $l1069 = $m_i.CLAUDE_ENABLE_STREAM_WATCHDOG ?? true, $l1075 = $m_Zhn(), $l1073 = $l1075 / 2, $l1062 = $m_Cmr(), $l1067 = Math.min($m_bKr($m_Te()), $l1069 ? $l1075 : 1 / 0), $l1064 = Math.min($NEW_chunk_e6aww6q8_js_ASr, $l1067 - $l1062), $l1076 = false, $l1074, $l1077 = null, $l1056 = null, $l1057 = null, $l1054 = null, $l1055 = false;
      $l1068();
      let $l1187 = () => {
        if ($l11.querySource !== "sdk" && $l11.keepPartialMessageOnAbort !== true) return;
        if ($l1047) return;
        let $l1188 = $l659[$l651.length];
        if ($l1188?.type !== "text" || $l1167.has($l1188) || !$l1188.text.trim() || !$l381) return;
        return { message: { ...$l381, content: $m_Acn([$l1188], $l3, $l11.agentId, { requestId: $l485 ?? void 0, messageId: $l381.id }, $l11.storageV5) }, apiBlockIndex: $l651.length, requestId: $l485 ?? void 0, requestRef: $l503, requestedModel: $l11.model, ...$m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), type: "assistant", uuid: $NEW_chunk_e6aww6q8_js_Vte(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), isAbortedMidStream: true, ...void 0, ...$l345 !== void 0 && { effort: $l345 }, perTurnEffort: $l346, perTurnTiming: $l347 };
      }, $l1189 = () => {
        if ($l1051 === void 0 || $l705) return;
        let $l1190 = $l1051;
        return $l1051 = void 0, $l705 = true, { type: "server_fallback", fromModel: $l1190.fromModel, toModel: $l1190.model, reason: $l1190.reason, apiRefusalCategory: $l1190.category, midStream: false, requestId: $l485 ?? null, refusedEffort: $l348(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: null };
      };
      function* $l1191() {
        $l544("aborted", $l485 ?? null, null);
        let $l1192 = $l1189();
        if ($l1192) yield $l1192;
        let $l1193 = $l1187();
        if ($l1193) yield $l1193;
        if ($l675) $m_a("tengu_advisor_tool_interrupted", { model: $m_wt($l11.model), advisor_model: $m_wt($l48 ?? "unknown"), query_source: $m_Es($l11.querySource) });
      }
      let $l1194;
      try {
        let $l1195 = true, $l1196 = 3e4, $l1197 = 0, $l1198 = $m_qun($l484, $l4), $l1199 = { count: 0 };
        for await (let $l1200 of $m_Mmr($l1059 !== void 0 && $m_Vun() ? $m_Yun($l1198, $l1059, $l1199, $l4) : $l1198, $l1059, $m_agn, $l12)) {
          if ($m_zye($l1200)) {
            if ($l1197++, $l1197 <= $NEW_chunk_e6aww6q8_js_xSr) $l1068();
            else if (!$l1069 || $l1076 || $l1074 !== void 0) continue;
            yield { type: "stream_event", event: $l1200 };
            continue;
          }
          $l1197 = 0, $l1068(), $l654 += 1 + $l1199.count, $l1199.count = 0, $l1182 ??= Math.round($l12.monotonicNow() - $l481), $l1183 ??= $l1200.type, $l1184 = $l1200.type;
          let $l1201 = $l12.now();
          if ($l1179 !== null) {
            let $l1202 = $l1201 - $l1179;
            if ($l1202 > $l1196) $l1180++, $l1181 += $l1202, $m_t(`Streaming stall detected: ${($l1202 / 1e3).toFixed(1)}s gap between events (stall #${$l1180})`, { level: "warn" }), $m_a("tengu_streaming_stall", { stall_duration_ms: $l1202, stall_count: $l1180, total_stall_time_ms: $l1181, event_type: $m_c($NEW_chunk_e6aww6q8_js_bke($l1200.type)), model: $m_wt($l11.model), request_id: $m_Yg($l485) });
          }
          if ($l1179 = $l1201, $l1195) {
            if ($l522(), $m_t("Stream started - received first chunk"), $m_t(`[API:timing] first byte after ${Math.round($l12.monotonicNow() - $l481)}ms`), $m_gg("query_first_chunk_received"), !$l11.agentId && $l202) $m_th("first_chunk");
            if ($l16) $l1194 = $m_Ssn();
            $m_lsn(), $l1195 = false;
          }
          let $l1203 = $m_RXe($l1200), $l1204 = !$l1203 && $m_Srn($l1200);
          if ($l1203 || $l1204) $l675 = false;
          if ($l1203) {
            $l1050.add($l1203.index), $l659[$l1203.index] = $m_EXe($l1203);
            let $l1205 = $l533;
            if ($m_a("tengu_rotunda_pennant_materialized", { armed: $l11.serverRefusalFallback !== void 0, mode: $m_c($l1205), block_index: $l1203.index, non_streaming: false }), $l1203.reason === "refusal") $m_JZ({ model: $l26, requestId: $l485 || void 0, querySource: $l11.querySource, effort: $l317, fastMode: $l674, attempt: $l482, attribution: $m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: true, agentContext: $l11.agentContext });
            if ($l11.serverRefusalFallback === void 0) continue;
            if ($m_aTe($l1203.reason)) $l704 = true;
            if ($l381 !== void 0) $l381 = { ...$l381, model: $l1203.model };
            for (let $l1206 of $l1048.values()) $l1206.message.model = $l1203.model;
            if ($l1048.size === 0) $l1051 = $l1203;
            else if (!$m_aTe($l1203.reason)) $l705 = true, yield { type: "server_fallback", fromModel: $l1203.fromModel, toModel: $l1203.model, reason: $l1203.reason, apiRefusalCategory: $l1203.category, midStream: true, requestId: $l485 ?? null, refusedEffort: $l348(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: null };
            else {
              $l705 = true;
              let $l1207 = [];
              for (let [$l1208, $l1209] of $l1048) if ($m_hrn($l1209)) $l1207.push($l1209), $l1048.delete($l1208), delete $l659[$l1208];
              if ($l1207.length > 0) {
                let $l1210 = new Set($l1207);
                for (let $l1211 = $l651.length - 1; $l1211 >= 0; $l1211--) if ($l1210.has($l651[$l1211])) $l651.splice($l1211, 1);
                $l1047 = true;
              }
              let $l1212 = [...$l1048.entries()].sort(($l1213, $l1214) => $l1213[0] - $l1214[0]).map(([, $l1215]) => $l1215), $l1216 = $l1212.map(($l1217) => $l1217.message.content.map(($l1218) => $l1218.type === "text" ? $l1218.text : "").join("")).join("");
              yield { type: "server_fallback", fromModel: $l1203.fromModel, toModel: $l1203.model, reason: $l1203.reason, apiRefusalCategory: $l1203.category, midStream: true, requestId: $l485 ?? null, refusedEffort: $l348(), discardedMessages: $l1207, retainedMessages: $l1212, retainedText: $l1216, finalStopReason: null };
            }
            continue;
          }
          if ($l1204) {
            let $l1219 = $l1200.index;
            $l1049.add($l1219), $l1047 = true, $m_Y("warn", "cli_malformed_fallback_block"), $m_a("tengu_rotunda_pennant_malformed", { block_index: $l1219, non_streaming: false }), $m_f("refusal_fallback", "malformed_fallback_block", { non_streaming: false });
            continue;
          }
          if ($l1200.type === "content_block_stop" && $l1049.has($l1200.index)) continue;
          switch ($l1200.type) {
            case "message_start": {
              if ($m_vx(typeof $l1200.message === "object" && $l1200.message !== null, $l1200, $m_b("message_start_without_message")), $l1169 = true, $l416(), $l895(), $l396(), $l381 = $l1200.message, $l381 !== void 0 && "resumable" in $l381) {
                let { resumable: $l1220, ...$l1221 } = $l381;
                $l381 = $l1221;
              }
              if ($l652 = Math.max(0, Math.round($l12.monotonicNow() - $l481)), $l304 = $m_mAe($l304, $l1200.message?.usage), $l1200.message?.model) $m__no($m_Wn($l11.model), $l1200.message.model);
              $l673 = $l1200.message.diagnostics?.cache_miss_reason ?? void 0, $l950($l1200.message);
              let $l1222 = $l958($l1200.message), $l1223 = $l942();
              if ($l1223) yield $l1223;
              let $l1224 = $l253();
              if ($l1224) yield $l1224;
              if ($l1222) yield $l1222;
              break;
            }
            case "content_block_start": {
              let $l1225 = typeof $l1200.content_block === "object" && $l1200.content_block !== null;
              if (!$l1225) $l663 = false;
              if ($m_vx($l1225, $l1200, $m_b("content_block_start_without_content_block")), $m_sgr({ previous: $l659[$l1200.index], closedContentBlocks: $l1167, started: $l1200.content_block })) throw $m_a("tengu_streaming_error", { error_type: $m_b("content_block_closed_start"), part_type: $m_c($l1200.type), part_index: $m_Kve($l1200) }), new $m_Iie("closed");
              switch ($l663 = false, $l653 ??= Math.max(0, Math.round($l12.monotonicNow() - $l481)), $l1200.content_block.type) {
                case "tool_use":
                  $l1200.content_block.name = $m_C6t($l1200.content_block.name), $l659[$l1200.index] = { ...$l1200.content_block, input: "" };
                  break;
                case "server_tool_use":
                  if ($l659[$l1200.index] = { ...$l1200.content_block, input: "" }, $l1200.content_block.name === $m_TLe) $l675 = true, $m_t("[AdvisorTool] Advisor tool called"), $m_a("tengu_advisor_tool_call", { model: $m_wt($l11.model), advisor_model: $m_wt($l48 ?? "unknown"), query_source: $m_Es($l11.querySource) });
                  break;
                case "text":
                  $l659[$l1200.index] = { ...$l1200.content_block, text: "" };
                  break;
                case "thinking": {
                  let $l1226 = { ...$l1200.content_block, thinking: "", signature: "" };
                  $l659[$l1200.index] = $l1226, $m_igr($l1168, $l1226, $l12);
                  break;
                }
                default:
                  if ($l659[$l1200.index] = { ...$l1200.content_block }, $l1200.content_block.type === "advisor_tool_result") {
                    $l675 = false, $m_t("[AdvisorTool] Advisor tool result received");
                    let $l1227 = $m_lqs($l1200.content_block);
                    if ($l1227 !== void 0) $m_t(`[AdvisorTool] Advisor tool result error: ${$l1227}`), $m_a("tengu_advisor_tool_error", { model: $m_wt($l11.model), advisor_model: $m_wt($l48 ?? "unknown"), error_code: $m_c($l1227), query_source: $m_Es($l11.querySource) });
                    else $m_a("tengu_advisor_tool_result", { model: $m_wt($l11.model), advisor_model: $m_wt($l48 ?? "unknown"), query_source: $m_Es($l11.querySource), stop_reason: $m_le($m_EFo($l1200.content_block)) ?? $m_b("none") });
                  }
                  break;
              }
              if ($l1166 = $l1200.index, $l1200.content_block.type !== "thinking" && $l1200.content_block.type !== "redacted_thinking" && !$m_PY($l1200.content_block)) $l1165 = true;
              break;
            }
            case "content_block_delta": {
              let $l1228 = $l659[$l1200.index], $l1229 = $l1200.delta;
              if (!$l1228 || !$l1167.has($l1228)) $l663 = false;
              if (!$l1228 || $l1167.has($l1228)) throw $m_a("tengu_streaming_error", { error_type: $l1228 ? $m_b("content_block_closed_delta") : $m_b("content_block_not_found_delta"), part_type: $m_c($l1200.type), part_index: $m_Kve($l1200) }), new $m_Iie($l1228 ? "closed" : "unstarted");
              switch ($m_vx(typeof $l1229 === "object" && $l1229 !== null, $l1200, $m_b("content_block_delta_without_delta")), $m_vx(typeof $l1229.type === "string", $l1200, $m_b("content_block_delta_without_delta_type")), $l1229.type) {
                case "citations_delta":
                  if ($l1228.type !== "text") break;
                  $m_vx(typeof $l1229.citation === "object" && $l1229.citation !== null, $l1200, $m_b("citations_delta_without_citation")), $l1228.citations = [...$l1228.citations ?? [], $l1229.citation];
                  break;
                case "input_json_delta":
                  if ($l1228.type !== "tool_use" && $l1228.type !== "server_tool_use") throw $m_a("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_input_json"), expected_type: $m_b("tool_use"), actual_type: $m_c($l1228.type) }), new $m_Iie("unreadable");
                  if (typeof $l1228.input !== "string") throw $m_a("tengu_streaming_error", { error_type: $m_b("content_block_input_not_string"), input_type: $m_c(typeof $l1228.input) }), new $m_Iie("unreadable");
                  $m_vx(typeof $l1229.partial_json === "string", $l1200, $m_b("input_json_delta_without_partial_json")), $l1228.input += $l1229.partial_json;
                  break;
                case "text_delta":
                  if ($l1228.type !== "text") throw $m_a("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_text"), expected_type: $m_b("text"), actual_type: $m_c($l1228.type) }), new $m_Iie("unreadable");
                  $m_vx(typeof $l1229.text === "string", $l1200, $m_b("text_delta_without_text")), $l1228.text += $l1229.text;
                  break;
                case "signature_delta":
                  if ($l1228.type !== "thinking") throw $m_a("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_thinking_signature"), expected_type: $m_b("thinking"), actual_type: $m_c($l1228.type) }), new $m_Iie("unreadable");
                  $m_vx(typeof $l1229.signature === "string", $l1200, $m_b("signature_delta_without_signature")), $l1228.signature = $l1229.signature;
                  break;
                case "thinking_delta":
                  if ($l1228.type === "redacted_thinking") break;
                  if ($l1228.type !== "thinking") throw $m_a("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_thinking_delta"), expected_type: $m_b("thinking"), actual_type: $m_c($l1228.type) }), new $m_Iie("unreadable");
                  $m_vx(typeof $l1229.thinking === "string", $l1200, $m_b("thinking_delta_without_thinking")), $l1228.thinking += $l1229.thinking;
                  break;
              }
              break;
            }
            case "content_block_stop": {
              let $l1230 = $l659[$l1200.index];
              if (!$l1230 || !$l1167.has($l1230)) $l663 = false;
              if (!$l1230 || $l1167.has($l1230)) throw $m_a("tengu_streaming_error", { error_type: $l1230 ? $m_b("content_block_closed_stop") : $m_b("content_block_not_found_stop"), part_type: $m_c($l1200.type), part_index: $m_Kve($l1200) }), new $m_Iie($l1230 ? "closed" : "unstarted");
              if ($l1166 = null, !$l381) throw $m_a("tengu_streaming_error", { error_type: $m_b("partial_message_not_found"), part_type: $m_c($l1200.type) }), Error("Message not found");
              let { content: $l1231, batchToolUses: $l1232 } = $m_Gpn($m_Acn([$l1230], $l3, $l11.agentId, { requestId: $l485 ?? void 0, messageId: $l381.id }, $l11.storageV5), $l3, ($l1233, $l1234) => $m_Rht($l1233, $l1234, $l11.agentId, $l11.storageV5)), $l1235 = $l285 ? $m_o$e([$l1230]) : void 0;
              $l1186 ||= $l1235?.degraded === true;
              let $l1236 = $l1235?.inputs, $l1237 = $m_p$e([$l1230], $l1236), $l1238 = $m_agr($l1168, $l1230, $l12), $l1239 = $m_pfn($l1230, $l525), $l1240 = { message: { ...$l381, content: $l1231 }, ...$l1238 !== void 0 && { thinkingDurationMs: $l1238 }, ...$l1239 !== void 0 && { thinkingDisplay: $l1239 }, ...$l1232.length > 0 && { batchToolUses: $l1232 }, ...$l1236 !== void 0 && { wireToolInputs: $l1236 }, ...$l1237 !== void 0 && { wireIngestContext: $l1237 }, ...$l1237 !== void 0 && { wireIngestContext: $l1237 }, ...$l487 !== void 0 && $m_w1e($l487), apiBlockIndex: $l1200.index, requestId: $l485 ?? void 0, requestRef: $l503, requestedModel: $l11.model, ...$m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), type: "assistant", uuid: $NEW_chunk_e6aww6q8_js_Vte(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...false, ...$l48 && { advisorModel: $l48 }, ...$l345 !== void 0 && { effort: $l345 }, perTurnEffort: $l346, perTurnTiming: $l347, ...{} };
              if ($NEW_chunk_e6aww6q8_js_R4e($l28, $l1240), $l651.push($l1240), $l1185++, $l1048.set($l1200.index, $l1240), $l1174 = Math.max($l1174, Number.isSafeInteger($l1200.index) && $l1200.index >= 0 ? $l1200.index + 1 : Number.NaN), $l1167.add($l1230), $l1240.message.content.some(($l1241) => !$m_PY($l1241))) {
                if ($l1164 = true, $l1240.message.content.some(($l1242) => $l1242.type !== "thinking" && $l1242.type !== "redacted_thinking" && !$m_PY($l1242))) $l1165 = true;
              }
              yield $l1240;
              break;
            }
            case "message_delta": {
              if ($l304 = $m_mAe($l304, $l1200.usage), $l660 = $l1200.context_management ?? $l660, $m_vx(typeof $l1200.delta === "object" && $l1200.delta !== null, $l1200, $m_b("message_delta_without_delta")), $l487 !== void 0 && typeof $l1200.delta === "object" && $l1200.delta !== null && "safeguard_results" in $l1200.delta) $l490($l487, $l1200.delta, $l659);
              let $l1243 = $l11.serverRefusalFallback !== void 0 ? $m_bYn($l304) : void 0;
              if ($l1243?.servedFallbackModel !== void 0) $l704 = true, $l304 = $m_jDo($l304, $l1200.usage);
              let $l1244 = $m_vXe($l1200.delta.stop_details);
              {
                let $l1245 = $l1200.delta.stop_details;
                if ($l1245 && "fallback_credit_token" in $l1245) delete $l1245.fallback_credit_token;
              }
              if ($l1244 !== void 0 && !$l543) $l543 = true, $m_a("tengu_fallback_credit_minted", { request_id: $m_ye($l485), model: $m_wt($l11.model), fallback_target_model: $m_wt($l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l704 ? $l11.serverRefusalFallback.model : void 0)), token_length: $l1244.length, input_tokens: $l304.input_tokens, output_tokens: $l304.output_tokens, cache_read_input_tokens: $l304.cache_read_input_tokens, cache_creation_input_tokens: $l304.cache_creation_input_tokens, cache_creation_5m_input_tokens: $l304.cache_creation?.ephemeral_5m_input_tokens ?? 0, cache_creation_1h_input_tokens: $l304.cache_creation?.ephemeral_1h_input_tokens ?? 0, service_tier: $m_le($l304.service_tier), speed: $m_le($l304.speed), query_source: $m_Es($l11.querySource), ...$l11.queryTracking && { query_chain_id: $m_ye($l11.queryTracking.chainId), query_depth: $l11.queryTracking.depth } });
              let $l1246 = typeof $l1200.delta.stop_reason === "string" ? $l1200.delta.stop_reason : null;
              if ($l1246 !== null) $l662 = $l1246, $l663 = true;
              let $l1247 = $l1200.delta;
              if ($l1247.diagnostics?.cache_miss_reason) $l673 = $l1247.diagnostics.cache_miss_reason;
              let $l1248 = $m_Zmn($l1200.delta) ?? $m_Zmn($l1200), $l1249 = $l462 && $l660 ? $NEW_chunk_g54kbxqw_js_A7o($l660, $l460?.edit, $l174) : null;
              for (let $l1250 of $l651) {
                if ($l1250.message.usage = $l304, $l1250.message.stop_reason = $l662, $l1246 !== null || $l662 === null) $l1250.message.stop_details = $l1200.delta.stop_details ?? null;
                if ($l1249) $l1250.message.context_management = $l1249;
                if ($l1248 !== void 0) $l1250.message.resumable = $l1248;
              }
              if ($l662 !== null && $l664 !== "credited") {
                $l664 = "credited";
                let $l1251 = $l1243?.servedFallbackModel, $l1252 = $l1243 !== void 0 && $l1251 !== void 0, $l1253 = $l1252 ? $m_CXe($l1243.entries, { speed: $l304.speed, inferenceGeo: $l304.inference_geo, serverToolUse: $l304.server_tool_use }, $l662) : $m_Cxe($l26, $l304), $l1254 = $l1252 ? $m_SYn($l11.serverRefusalFallback?.model, $l1251) : $l11.model;
                $l661 += $m_$7e($l1253, $l304, $l1254, $l11.querySource, $l317, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool);
              } else if ($l664 === "none") $l664 = "pending";
              if ($l1246 === "refusal" && !$l1162) $l1162 = true, $m_JZ({ model: $l26, requestId: $l485 || void 0, querySource: $l11.querySource, effort: $l317, fastMode: $l674, attempt: $l482, attribution: $m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: false, stopDetails: $l1200.delta.stop_details ?? null, agentContext: $l11.agentContext });
              if ($l11.serverRefusalFallback !== void 0) {
                let $l1255 = $l1051;
                if ($l1051 = void 0, $l1255 !== void 0) {
                  if (!$l705) $l705 = true, yield { type: "server_fallback", fromModel: $l1255.fromModel, toModel: $l1255.model, reason: $l1255.reason, apiRefusalCategory: $l1255.category, midStream: false, requestId: $l485 ?? null, refusedEffort: $l348(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: $l662 };
                } else if (!$l705 && $l1243?.servedFallbackModel !== void 0) $l705 = true, yield { type: "server_fallback", fromModel: $l11.model, toModel: $l1243.servedFallbackModel, reason: "sticky", apiRefusalCategory: null, midStream: false, requestId: $l485 ?? null, refusedEffort: $l348(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: $l662 };
              }
              let $l1256 = $l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l704 ? $l11.serverRefusalFallback.model : void 0), $l1257 = $l11.refusalFallbackModelLane === "silent", $l1258 = $l11.refusalFallbackCascadeHop, $l1259 = $l1246 === "refusal" && $l1256 !== void 0 && !$l1257 && $l1258 === void 0 ? $m_gKo({ originalModelCanonical: $m_Je($l11.model), armedFallbackModel: $l1256, apiRefusalCategory: $l1200.delta.stop_details?.category ?? null, armedTargetIsRefusingModel: $m_uvt($l11.model, $l1256), resolveTarget: ($l1260) => $m__zt({ mappedTarget: $l1260, armedFallbackModel: $l1256, refusingModel: $l11.model, triedModels: [$m_fvt($l11.model)] }), routesOverride: $NEW_chunk_hwmsct5x_js_Y8r() }) : void 0, $l1261 = $l1259 !== void 0 ? $l1259.model : $l1256;
              if ($l1259 !== void 0) $m_aKr({ route: $l1259, model: $l11.model, armedFallbackModel: $l1256, apiRefusalCategory: $l1200.delta.stop_details?.category, requestId: $l485 });
              let $l1262 = $l1259?.matched === "none" && $l1200.delta.stop_details?.category === "bio" && !$m_O4(), $l1263 = $l1246 === "refusal" && ($l1256 === void 0 || $l1262) ? $l11.refusalFallbackSilentRearm?.($l1262, $l1200.delta.stop_details?.category ?? null, $m_kKo($l509?.headers)) : void 0, $l1264 = $l1261 ?? $l1263;
              if ($l1246 === "refusal" && $l1264 !== void 0) {
                $l805(), $l669 = true, yield { type: "fallback_request", trigger: "refusal", originalModel: $l11.model, fallbackModel: $l1264, requestId: $l485 ?? null, refusedEffort: $l348(), apiRefusalCategory: $l1200.delta.stop_details?.category ?? null, apiRefusalExplanation: $l1200.delta.stop_details?.explanation ?? null, creditCode: $l1244 ?? null, mintedStateless: !$l467, ...$l1263 !== void 0 && { silentArmAtTrigger: true }, ...$m_pKo($l1259, $l1258) };
                return;
              }
              let $l1265 = $m_lFt($l1246, $l1200.delta.stop_details, $l485, $l704 ? $l1243?.servedFallbackModel ?? $l381?.model ?? $l11.model : $l11.model, $l381?.id);
              if ($l1265) {
                let $l1266 = $m_O4() || $m_mK() !== void 0;
                if ($l1256 !== void 0 || $l11.refusalFallbackModel !== void 0 || $m_cvt($l11.model) && $m_vz() || $m_Jhn() || $l1266) $m_m("refusal_fallback", $l1259?.matched === "none" ? "route_declined" : $l704 ? "server_chain_exhausted" : $l1266 ? "client_chain_exhausted" : $m_cvt($l11.model) && $m_fKr() ? "disabled_by_config" : "not_armed", { convolute_arcades: $m_Xhn(), arm_source: $m_c($m_K0e()), armed: $l1256 !== void 0, model_scope: $m_c($m_TZ($l11.model)) });
                yield { type: "refusal_no_fallback", originalModel: $l11.model, requestId: $l485 ?? null, apiRefusalCategory: $l1200.delta.stop_details?.category ?? null, apiRefusalExplanation: $l1200.delta.stop_details?.explanation ?? null }, yield $l1265;
              }
              let $l1267 = $m_Jmn($l1246, $l670, $l304.output_tokens);
              if ($l1267 !== void 0) yield $l1267;
              break;
            }
            case "message_stop":
              if ($l1169 = false, $l487 !== void 0) $l488($NEW_chunk_e6aww6q8_js_Xqt($l487));
              if ($l1186) $m_r$e();
              if ($l664 === "pending") $l665();
              $l544("stream_completed", $l485 ?? null, $l304);
              break;
          }
          if ($l1200.type === "content_block_stop" && $l1050.has($l1200.index)) continue;
          $l1163 = true;
          let $l1268 = $m_hfn($l1200, $l525), $l1269 = $l1170 || $l1200.type === "message_start";
          if ($l1200.type === "message_start") $l1170 = true, $l1171 = null, $l1172 = false, $l1173 = typeof $l1200.message.id === "string" && $l1200.message.id !== "" ? $l1200.message.id : null;
          else if ($l1200.type === "content_block_start") $l1171 = $l1200.index, $l1172 = $NEW_chunk_e6aww6q8_js_PSr.has($l1200.content_block.type);
          else if ($l1200.type === "content_block_stop") $l1171 = null, $l1172 = false;
          else if ($l1200.type === "message_stop") $l1170 = false, $l1171 = null, $l1172 = false;
          yield { type: "stream_event", event: $l1200, ...$l1200.type === "message_start" ? { ttftMs: $l652, ...$l345 !== void 0 && { sentEffort: $l345 }, ...$l11.turnEffort !== void 0 && { turnEffort: $l11.turnEffort }, ...$l655 ? { requestSentAtMs: $l655 } : void 0, ...$l656 ? { requestSentWallMs: $l656 } : void 0 } : void 0, ...$l1268 !== void 0 ? { thinkingDisplay: $l1268 } : void 0, ...$l1269 && $l1173 !== null ? { apiMessageId: $l1173 } : void 0 };
        }
        if ($l1053(), $l1194?.($l654, $l1059?.chunks), $l4.aborted) {
          yield* $l1191();
          return;
        }
        if ($l1076) {
          let $l1270 = $l1077 !== null ? Math.round($l12.monotonicNow() - $l1077) : -1;
          throw $m_Y("info", "cli_stream_loop_exited_after_watchdog_clean"), $m_a("tengu_stream_loop_exited_after_watchdog", { request_id: $m_Yg($l485), exit_delay_ms: $l1270, exit_path: $m_b("clean"), model: $m_wt($l11.model) }), $l1077 = null, Error("Stream idle timeout - no chunks received");
        }
        if ($l1074 !== void 0) throw $l1074;
        if ($l1169 && $l1166 !== null) throw $m_t(`Stream ended cleanly inside open block ${$l1166} (stop_reason=${$l662}) \u2014 treating as a dropped connection`, { level: "error" }), new $m_LJr();
        if (!$l381 || $l651.length === 0 && !$l662) throw $m_t(!$l381 ? "Stream completed without receiving message_start event - triggering non-streaming fallback" : "Stream completed with message_start but no content blocks completed - triggering non-streaming fallback", { level: "error" }), $m_a("tengu_stream_no_events", { model: $m_wt($l11.model), request_id: $m_Yg($l485), ...$m_fke(void 0, $l514), ms_since_request: Math.round($l12.monotonicNow() - $l481) }), new $m_vTn();
        if ($l1169 && !($l662 !== null && $l663)) throw $m_t(`Stream ended cleanly mid-response (stop_reason=${$l662}, terminal=${$l663}) \u2014 treating as a dropped connection`, { level: "error" }), new $m_LJr();
        try {
          let $l1271 = $m_ni(), $l1272 = $l1271.hasFired("stream_text_delivery_bad"), $l1273 = $l1271.hasFired("stream_text_delivery_ok");
          if ($l662 !== null && !$l1047 && (!$l1272 || !$l1273)) {
            if (!$l1272) for (let [$l1274, $l1275] of $l659.entries()) {
              if (!$l1275 || $l1275.type !== "text") continue;
              if ($l1275.text.trim().length > 0 && !$l1048.has($l1274) && !$l1049.has($l1274)) {
                $l1271.markFired("stream_text_delivery_bad"), $m_m("api_stream_text_delivery", "text_block_unyielded", { had_tool_use: $l659.some(($l1276) => $l1276?.type === "tool_use"), dropped_block_index: $l1274 });
                break;
              }
            }
            if (!$l1273) {
              let $l1277 = $l659.some(($l1278, $l1279) => $l1278?.type === "text" && $l1278.text.trim().length > 0 && $l1048.has($l1279)), $l1280 = $l659.some(($l1281, $l1282) => $l1281?.type === "tool_use" && $l1048.has($l1282));
              if ($l1277 && $l1280) $l1271.markFired("stream_text_delivery_ok"), $m_g("api_stream_text_delivery");
            }
          }
          if ($l662 !== null) $l838($l304);
          $l845($l304);
        } catch {
        }
        if ($l1180 > 0) $m_t(`Streaming completed with ${$l1180} stall(s), total stall time: ${($l1181 / 1e3).toFixed(1)}s`, { level: "warn" }), $m_a("tengu_streaming_stall_summary", { stall_count: $l1180, total_stall_time_ms: $l1181, model: $m_wt($l11.model), request_id: $m_Yg($l485) });
        $m_Hni({ returnAfterIdle: $l462 ? $l460?.returnAfterIdle : void 0, contextManagement: $l660, usage: $l304, querySource: $l11.querySource, agentId: $l11.agentId }), $m_pni($l11.querySource, $l304.cache_read_input_tokens, $l304.cache_creation_input_tokens, $l0, $l11.agentId, $l485, $l25, $l202);
        let $l1283 = $l509;
        if ($l1283) {
          $m_nZn($l512, $l513), $m_U2s($l1283.headers, $m_ss($l11.querySource) !== "auxiliary", $l513, $l337);
          let $l1284 = ($m_Om($l11.model) || $m_TC($l11.model)) && $l304.input_tokens + $l304.cache_read_input_tokens + $l304.cache_creation_input_tokens > $m_E6, $l1285 = $m_SNo($l1283.headers, $l11.model, $l1284, $l513, $l337, $l11.storageV5);
          if ($l1285 && $l11.queryTracking) $l11.queryTracking.answeredQuerySource = $l11.querySource, $l11.queryTracking.billedToUsageCredits = $l1285.overageInUse === true, $l11.queryTracking.longContextBilled = $l1284;
          $m_Npn($l1283.headers, $l11, $l674), $l671 = $l1283.headers;
        }
      } catch ($l1286) {
        let $l1287 = $l1074 !== void 0 && !$l1076 && !$l4.aborted && $l1286 instanceof $m_sf ? $l1074 : $l1286;
        $l1053(), $l1194?.($l654, $l1059?.chunks), $l522();
        {
          let $l1288 = $l1189();
          if ($l1288) yield $l1288;
        }
        if (!$l1076 && $l1287 instanceof $m_bZn) $l1076 = true, $l1077 = $l12.monotonicNow(), $m_t(`Streaming idle timeout (byte-level): ${$l1287.message}, aborting stream`, { level: "error" }), $m_Y("error", "cli_streaming_idle_timeout"), $m_a("tengu_streaming_idle_timeout", { model: $m_wt($l11.model), request_id: $m_Yg($l485), timeout_ms: $l1287.idleMs, tier: $m_b("byte"), bytes_received_before_stall: $l1287.bytesReceived, time_to_first_byte_ms: $l1287.ttfbMs, body_read_pending: $l1287.bodyReadPending, slept_ms: $l1287.sleptMs, cf_ray: $m_ye($l1287.cfRay) });
        if ($l1076 && $l1077 !== null) {
          let $l1289 = Math.round($l12.monotonicNow() - $l1077);
          $m_Y("info", "cli_stream_loop_exited_after_watchdog_error"), $m_a("tengu_stream_loop_exited_after_watchdog", { request_id: $m_Yg($l485), exit_delay_ms: $l1289, exit_path: $m_b("error"), error_name: $l1287 instanceof Error ? $m_w1($l1287) ?? $m_b("Error") : $m_b("unknown"), model: $m_wt($l11.model) });
        }
        let $l1290 = { events_received: $l654, ms_to_first_event: $l1182, ms_since_last_event: $l1179 === null ? null : $l12.now() - $l1179 }, $l1291 = ($l1292, $l1293) => $m_Y("warn", "cli_stream_failed", () => ({ ...$m_dL($l1293, $m_Jde($l1293), $l514), fallback_cause: $l1292, watchdog_fired: $l1076, slept_ms: $l1287 instanceof $m_bZn || $l1287 instanceof $m_vzt ? $l1287.sleptMs : null, client_request_id: $m_ye($l508) ?? null, model: $m_wt($l11.model) ?? null, stream: { ...$l1290, first_event_type: $l1183 === null ? null : $NEW_chunk_e6aww6q8_js_bke($l1183), last_event_type: $l1184 === null ? null : $NEW_chunk_e6aww6q8_js_bke($l1184), message_envelope_open: $l1169, stop_reason_received: $l662 !== null, content_blocks_completed: $l1185, any_event_yielded: $l1163, ms_since_request: Math.round($l12.monotonicNow() - $l481), ms_to_headers: $l514?.latencyMs ?? null, stalls_over_30s: $l1180, stall_ms_total: $l1181 }, route: $m_xht() }));
        if ($l1287 instanceof $m_sf) {
          if ($l4.aborted) throw yield* $l1191(), $m_t(`Streaming aborted by user: ${$m_d($l1287)}`), $l1287;
          else if (!$l1076) {
            $m_t(`Streaming timeout (SDK abort): ${$l1287.message}`, { level: "error" });
            let $l1294 = new $m_Ok({ message: "Request timed out" });
            throw $l1291("sdk_timeout", $l1294), $l1294;
          }
        }
        let $l1295 = $m_lg($l1287), $l1296 = $l1295 !== null && $m_Jq.has($l1295.code), $l1297 = $l1295 !== null && ($l1296 || $m_YB.has($l1295.code)), $l1298 = $l344?.classifyStreamError($l1287) ?? false, $l1299 = $l1287 instanceof $m_Iie || $l1287 instanceof SyntaxError, $l1300 = $l1287 instanceof $m_Iie && $l1287.blockState === "unstarted", $l1301 = $l1300 ? "event referenced an unstarted content block" : $l1287 instanceof $m_Iie && $l1287.blockState === "closed" ? "event referenced an already-closed content block" : "event could not be read", $l1302 = $m_Vgi({ connDetails: $l1295, isStaleConnection: $l1296, isContextHintSse: $l1298, streamIdleAborted: $l1076, noEvents: $l1287 instanceof $m_vTn, malformedStream: $l1287 instanceof $m_Iie }), $l1303 = $m_w1($l1287) ?? null, $l1304 = $m_Kae($l1295?.code) ?? null, $l1305 = $l1287 instanceof Error ? $l1303 ?? $m_b("none") : $m_c(typeof $l1287), $l1306 = $l1287 instanceof Error ? $NEW_chunk_2g090z7k_js_mks($l1287.constructor?.name) ?? $m_b("none") : $m_b("none"), $l1307 = $l1304 ?? $m_b("none"), $l1308 = ($m_k("tengu_watchdog_skip_nonstreaming_fallback", false) || $m_i.CLAUDE_CODE_REMOTE) && $l1076 || $m_i.CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK || $m_k("tengu_disable_streaming_to_non_streaming_fallback", false);
        if ($l1076) $l685 = Error($l651.length > 0 ? "Stream idle timeout - partial response received" : "Stream idle timeout - no chunks received");
        let $l1309 = $l1076 ? $l685 : $l1287, $l1310 = $l1309 instanceof Error ? $m_w1($l1309) ?? $m_b("Error") : $m_c(typeof $l1309);
        $l1291($l1302, $l1287 instanceof $m_sf ? $l1309 : $l1287);
        let $l1311 = $m_O2($l1287) || $m_Y8e($l1287) || $l1287 instanceof $m_Mt && ($l1287.type === "api_error" || $l1287.type === "timeout_error"), $l1312;
        if ($m_wit($l1287)) $l1312 = "dlpDenied";
        else if ($m_YYe($l1287)) $l1312 = "escapeMonitor";
        let $l1313 = $m_PM($l1287), $l1314 = $l691 !== null && !$l690 && $l1295 !== null && !$l1163, $l1315 = $m_Rmn({ error: $l1287, isServerError: $l1311, stalled: $l1076, isConnectionError: $l1297 || $l1314, suspended: $m_wTn($l1287), truncated: $l1295?.code === "StreamTruncated", malformed: $l1299, denied: $l1312 !== void 0, outputFiltered: $l1313, anyEvent: $l1163, anyBlockFinished: $l1164, anyOutputShown: $l1165, stopReasonReceived: $l662 !== null, outlastedNonStreamingTimeout: $l12.monotonicNow() - $l481 >= $m_egn(), complete: $l662 !== null && $l663 && $l1166 === null }), $l1316 = $l1315 === void 0 ? "keepPartial" : $l689.onStreamFailed($l1315, !$l1308), $l1317 = $l689.counts(), $l1318 = $l1315?.progress === "thinkingOnly" && $l1315.cause === "overloaded" && !$l1315.stopReasonReceived;
        if ($l1316 === "useFallbackModel" && ($l1315?.cause === "serverError" || $l1315?.cause === "timedOut") && $l11.fallbackModel) {
          if (!$l1165) $m_$K($l651, $l26);
          if ($l1169) $l665(), $l301();
          throw $m_a("tengu_api_model_not_found_fallback_triggered", { original_model: $m_wt($l11.model), fallback_model: $m_wt($l11.fallbackModel), provider: $m_kT(), reason: $l1315.cause === "timedOut" ? $m_b("timed_out") : $m_b("server_error"), source: $m_b("mid_stream") }), new $m_YO($l11.model, $l11.fallbackModel, "server_error", $l1287);
        }
        if ($l1315 === void 0 || $l1315.progress === "output" || $l1315.progress === "thinkingOnly" && !$l1318) {
          let $l1319 = $l1311 && $l1165, $l1320 = $l1311 && $l1316 === "retry";
          if ($l1316 !== "fail") {
            $l523();
            let $l1321 = $l1076, $l1322 = $l651.some(($l1323) => $l1323.message.content.some(($l1324) => $l1324.type === "tool_use"));
            if ($l1316 === "retry") {
              if (!$l1165) $m_$K($l651, $l26);
              if ($l1321) $m_t(`Stream idle timeout after thinking-only yield \u2014 retrying streaming (${$l1317.stalls}/${$NEW_chunk_e6aww6q8_js_eJe})`, { level: "warn" }), $m_a("tengu_streaming_watchdog_retry", { model: $m_wt($l11.model), retry_attempt: $l1317.stalls, request_id: $m_ye($l485), after_thinking_only: true });
              else $m_t(`Stream ${$l1299 ? $l1301 : $l1320 ? "server error" : `connection closed (${$l1295?.code})`} after thinking-only yield \u2014 retrying streaming (${$l1317.afterThinkingOnly}/${$l1315?.cause === "timedOut" ? $NEW_chunk_e6aww6q8_js_hyn : $NEW_chunk_e6aww6q8_js_tJe})`, { level: "warn" }), $m_a("tengu_streaming_stale_connection_retry", { model: $m_wt($l11.model), error_code: $l1299 ? $m_b("malformed_stream") : $l1320 ? $l1315?.cause === "timedOut" ? $m_b("timed_out") : $m_b("server_error") : $m_rcr($l1295?.code ?? ""), retry_attempt: $l1317.afterThinkingOnly, request_id: $m_ye($l485), after_thinking_only: true });
              if ($l544("attempt_errored", $l485 ?? null, null), $l665(), $l301(), yield* $l1175({ responseUnfinished: true }), $l485 = null, $l1320) await $m_J($m_hF($l1317.afterThinkingOnly, void 0, void 0, $l11.random), $l4, { clock: $l12 });
              else if (!$l1321) await $m_J(100 * $l1317.afterThinkingOnly, $l4, { clock: $l12 });
              continue e;
            }
            let $l1325 = $l662 !== null, $l1326 = $l1295?.code === "StreamSuspended", $l1327 = $l1326 && !$m_Sm(), $l1328 = $l1321 ? "watchdog" : $l1319 ? $l1287 instanceof $m_Mt && $l1287.type === "timeout_error" ? "timed_out" : "server_error" : $l1299 ? "malformed_stream" : $l1326 ? "stream_suspended" : $l1295?.code === "StreamTruncated" ? "stream_truncated" : $l1295 !== null && $m_YB.has($l1295.code) ? "network_down" : "stale_connection", $l1329 = $m_c($l1328);
            if ($l1325 && $l663 && $l1166 === null) {
              $m_t(`Stream ${$l1321 ? "stalled" : `connection closed (${$l1295?.code ?? "unknown"})`} after message_delta (stop_reason=${$l662}) \u2014 response already complete, no truncation`, { level: "info" }), $m_a("tengu_streaming_close_after_complete", { model: $m_wt($l11.model), blocks_yielded: $l651.length, cause: $l1329, error_code: $l1295 ? $m_rcr($l1295.code) : $m_b("none"), request_id: $m_ye($l485) }), $l544("stream_completed", $l485 ?? null, $l304), yield* $l1175({ responseUnfinished: false });
              break e;
            }
            let $l1330 = $l1322 ? "tool_use" : "end_turn";
            $l662 = $l1330;
            for (let $l1331 of $l651) $l1331.message.usage = $l304, $l1331.message.stop_reason = $l1330;
            $l358?.noteClientTruncated($l651[0]?.message.id), $m_t($l1321 ? `Stream idle timeout after ${$l651.length} block(s) yielded \u2014 finalizing partial response` : $l1319 ? `Mid-stream server error after ${$l651.length} block(s) yielded \u2014 finalizing partial response` : $l1299 ? `Stream ${$l1301} after ${$l651.length} block(s) yielded \u2014 finalizing partial response` : `Stream connection closed (${$l1295?.code}) after ${$l651.length} block(s) yielded \u2014 finalizing partial response`, { level: "warn" }), $m_a("tengu_streaming_partial_finalized", { model: $m_wt($l11.model), blocks_yielded: $l651.length, has_output: $l1165, synthesized_stop_reason: $m_c($l1330), cause: $l1329, request_id: $m_ye($l485) }), $l665(), yield* $l1175({ responseUnfinished: true });
            let $l1332 = $m_Gs({ content: $l1165 ? $l1321 ? `${$m_td}: The response stopped arriving. The response above may be incomplete.` : $l1319 ? `${$m_td}: Server error mid-response. The response above may be incomplete.` : $l1299 ? $l1300 ? `${$m_td}: Part of the response never arrived. The response above may be incomplete.` : `${$m_td}: The response stream was malformed. The response above may be incomplete.` : $l1327 ? `${$m_td}: Your computer went to sleep mid-response. The response above may be incomplete.` : `${$m_td}: Connection lost mid-response. The response above may be incomplete.` : $l1321 ? `${$m_td}: The response stalled before a response was produced. Try again.` : $l1299 ? $l1300 ? `${$m_td}: Part of the response never arrived and no response was produced. Try again.` : `${$m_td}: The response stream was malformed and no response was produced. Try again.` : $l1327 ? `${$m_td}: Your computer went to sleep before a response was produced. Try again.` : `${$m_td}: Connection lost before a response was produced. Try again.`, error: "server_error", apiError: $l4.aborted ? void 0 : $l1321 ? "stream_idle_timeout" : $l1327 ? "computer_slept" : $NEW_chunk_gr2vfhah_js_Rhr($l1287) ? "connection_failed" : void 0, truncatedAfterOutput: $l1165 && !$l1322 ? true : void 0 });
            if ($l1332.streamCutCause = $l1328, $l1321 && !$l1165) $l1332.streamWatchdogGaveUp = true;
            yield $l1332;
            break e;
          }
          throw $m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $l1310, attemptNumber: $l482, maxOutputTokens: $l670, thinkingType: $m_c($l35.type), fallback_disabled: $l1308, request_id: $m_Yg($l485), fallback_cause: $m_b("partial_yield"), any_stream_event_yielded: $l1163, has_output: $l1165, died_of: $m_c($l1315?.cause ?? "complete") }), $l1309;
        }
        if ($l1315?.cause === "outputFiltered") {
          if ($l1169) $l665();
          if ($l1316 === "retry") {
            if ($m_t(`Output content filter stopped the response before any of the answer was shown: retrying streaming (${$l1317.outputFiltered}/${$m_Wve})`, { level: "warn" }), $m_a("tengu_streaming_output_filter_retry", { model: $m_wt($l11.model), retry_attempt: $l1317.outputFiltered, request_id: $m_Yg($l485), first_stop_progress: $m_c($l1315.progress) }), $l686 = { firstStopProgress: $l1315.progress, msToFirstStop: Math.round($l12.monotonicNow() - $l481), startedAt: $l12.monotonicNow(), ended: void 0 }, $l523(), $l544("attempt_errored", $l485 ?? null, null), $l1169) $l301();
            yield* $l1175({ responseUnfinished: true }), $l485 = null;
            continue e;
          }
          throw $m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $m_b("output_content_filtered"), attemptNumber: $l482, maxOutputTokens: $l670, thinkingType: $m_c($l35.type), fallback_disabled: true, request_id: $m_Yg($l485), fallback_cause: $m_b("output_content_filtered"), any_stream_event_yielded: $l1163 }), $l1287;
        }
        if ($l1314) {
          if ($l690 = true, $m_t(`[dispatch] Stream connection error (${$l1295.code}) with ${$m_Ny}=${$l691} before first event; ${$l1316 === "retry" ? "retrying once" : "going on"} with ${$m_Ny}=${$m_Aw}`, { level: "warn" }), $m_a("tengu_dispatch_header_fallback", { model: $m_wt($l11.model), dispatch: $l691 ?? void 0, resend_dispatch: $m_c($m_Aw), reason: $m_b("body_phase"), status: $m_b("none"), error_code: $m_rcr($l1295.code), query_source: $m_Es($l11.querySource), request_id: $m_ye($l485) }), $l1316 === "retry") {
            $l523(), $l544("attempt_errored", $l485 ?? null, null), $l485 = null;
            continue e;
          }
        }
        let $l1333 = $l1297 && $l1295 !== null ? { label: `connection error (${$l1295.code})`, errorCode: $m_rcr($l1295.code), error: new $m_Uu({ cause: $l1287 instanceof Error ? $l1287 : void 0 }), attempt: Math.max(1, $l1317.retries), limit: $l688 } : $l1315?.cause === "serverError" && $l1287 instanceof $m_Mt ? { label: "server error", errorCode: $m_b("server_error"), error: $l1287, attempt: $l1317.afterThinkingOnly, limit: $NEW_chunk_e6aww6q8_js_tJe } : void 0;
        if ($l1316 === "retry" && $l1333 !== void 0) {
          let $l1334 = $l1333.attempt;
          if ($m_t(`Stream ${$l1333.label} \u2014 retrying streaming (${$l1334}/${$l1333.limit})`, { level: "warn" }), $m_a("tengu_streaming_stale_connection_retry", { model: $m_wt($l11.model), error_code: $l1333.errorCode, retry_attempt: $l1334, request_id: $m_Yg($l485) }), $l523(), $l544("attempt_errored", $l485 ?? null, null), $l1169) $l301();
          if ($l1169 && $l664 !== "credited") $l665(), yield* $l1175({ responseUnfinished: true });
          $l485 = null;
          let $l1335 = $m_hF($l1334, void 0, void 0, $l11.random), $l1336 = { ...$m_acr($l1333.error), rateLimits: null };
          $l683 = true, $l11.onRetryStatus?.({ kind: "retrying", error: $l1336, attempt: $l1334, maxRetries: $l1333.limit, retryInMs: $l1335, deadline: $l12.now() + $l1335 }), yield $m_BK($l1336, $l1335, $l1334, $l1333.limit, "connection_retry"), await $m_J($l1335, $l4, { clock: $l12 });
          continue e;
        }
        if ($l1297 && $l662 === null && $l1169) $l665();
        if ($l1076 && $l1316 === "retry") {
          $m_t(`Stream idle timeout before first event \u2014 retrying streaming (${$l1317.stalls}/${$NEW_chunk_e6aww6q8_js_eJe})`, { level: "warn" }), $m_a("tengu_streaming_watchdog_retry", { model: $m_wt($l11.model), retry_attempt: $l1317.stalls, request_id: $m_Yg($l485) }), $l523(), $l544("attempt_errored", $l485 ?? null, null), $l485 = null;
          continue e;
        }
        if (!$l1165 && $l662 === null && !$l689.outOfApiAttempts() && $l790($l1287) !== void 0) {
          if ($l689.undoLastCount(), $l1169) $l665(), $l301();
          $l523(), $l544("attempt_errored", $l485 ?? null, null), yield* $l1175({ responseUnfinished: true }), $l485 = null;
          continue e;
        }
        if ($l1312 === "dlpDenied") throw $m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $m_b($m_NFe), attemptNumber: $l482, maxOutputTokens: $l670, thinkingType: $m_c($l35.type), fallback_disabled: true, request_id: $m_Yg($l485), fallback_cause: $m_b($m_NFe), any_stream_event_yielded: $l1163 }), $l1287;
        if ($l1312 === "escapeMonitor") throw $m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $m_b($m_Pie), attemptNumber: $l482, maxOutputTokens: $l670, thinkingType: $m_c($l35.type), fallback_disabled: true, request_id: $m_Yg($l485), fallback_cause: $m_b($m_Pie), any_stream_event_yielded: $l1163 }), $l1287;
        if ($l1287 instanceof $m_Mt && $m_O2($l1287)) {
          let $l1337 = $l1165 ? null : $m_nKr($l1287, { markedAtDispatch: $l511, querySource: $l11.querySource, wait: $l512 }), $l1338 = $l689.outOfApiAttempts() ? null : $l1337;
          if (!$l1165) {
            if ($l1169) $l665(), $l301();
            let $l1339 = $l1317.overloaded;
            if ($l1338 !== null || $l1316 === "retry") {
              if ($m_$K($l651, $l26), $m_t($l1338 !== null ? `Mid-stream 529 before content at lower priority \u2014 waiting ${$l1338.delayMs}ms for capacity (attempt ${$l1338.attempt})` : `Mid-stream 529 before content \u2014 retrying streaming (${$l1339}/${$m_nee})`, { level: "warn" }), $l1338 !== null) $l689.undoLastCount();
              $m_a("tengu_streaming_529_retry", { model: $m_wt($l11.model), retry_attempt: $l1338 !== null ? $l1338.attempt : $l1339, request_id: $m_ye($l485), ...$l1338 !== null && { is_low_priority: true } }), $l523(), $l544("attempt_errored", $l485 ?? null, null), yield* $l1175({ responseUnfinished: true }), $l485 = null, $l683 = true;
              let $l1340 = $l1338?.delayMs ?? $m_hF($l1339, void 0, void 0, $l11.random);
              $l11.onRetryStatus?.($l1338 !== null ? { kind: "low_priority_waiting", attempt: $l1338.attempt, retryInMs: $l1340, deadline: $l12.now() + $l1340 } : { kind: "retrying", error: { ...$m_acr($l1287), rateLimits: null }, attempt: $l1339, maxRetries: $m_nee - 1, retryInMs: $l1340, deadline: $l12.now() + $l1340 }), await $m_J($l1340, $l4, { clock: $l12 });
              continue e;
            }
            if ($l11.fallbackModel && $l1316 === "useFallbackModel") throw $m_$K($l651, $l26), $m_a("tengu_api_opus_fallback_triggered", { original_model: $m_wt($l11.model), fallback_model: $m_wt($l11.fallbackModel), provider: $m_kT(), source: $m_b("mid_stream") }), $m_f("api_request", "api_request_fallback_triggered"), new $m_YO($l11.model, $l11.fallbackModel, "overloaded", $l1287);
          }
        }
        if ($l1316 === "fail") throw $m_t(`Error streaming (non-streaming fallback disabled): ${$m_d($l1309)}`, { level: "error" }), $m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $l1310, attemptNumber: $l482, maxOutputTokens: $l670, thinkingType: $m_c($l35.type), fallback_disabled: true, request_id: $m_Yg($l485), fallback_cause: $m_c($l1302), error_name: $l1305, error_constructor: $l1306, error_code: $l1307, any_stream_event_yielded: $l1163 }), $l667 = true, $l684 = $l1076, $l1309;
        if (!$l1165) $m_$K($l651, $l26);
        if ($m_t(`Error streaming, falling back to non-streaming mode: ${$m_d($l1309)}`, { level: "error" }), $l666 = true, $l657) $m_$ln("non_streaming");
        if ($l381 !== void 0) $l301();
        $l303 = $l12.now();
        {
          let $l1341 = await $l344?.onStreamFallback($l247, $l485 ?? void 0);
          if ($l1341) $l247 = $l267($l1341.messages, "microcompact"), $l998($l1341.clearedIds, $l1341.clearedContent);
        }
        if ($m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $l1310, attemptNumber: $l482, maxOutputTokens: $l670, thinkingType: $m_c($l35.type), fallback_disabled: false, request_id: $m_Yg($l485), fallback_cause: $m_c($l1302), error_name: $l1305, error_constructor: $l1306, error_code: $l1307, any_stream_event_yielded: $l1163 }), $m_Y("info", "cli_nonstreaming_fallback_started"), $m_a("tengu_nonstreaming_fallback_started", { request_id: $m_Yg($l485), model: $m_wt($l11.model), fallback_cause: $m_c($l1302) }), $l544("attempt_errored", $l485 ?? null, null), $l501 = $l485, $l485 = null, yield* $l1175({ responseUnfinished: true }), yield* $l1001(), yield { type: "streaming_fallback_began", cause: $l1302 }, yield* $l1002({ requestId: $m_uke($l501), analyticsRequestId: $m_Yg($l501), cause: $l1302, errorName: $l1303, connectionCode: $l1304, stall: $l1290 }, $l1311 && ($l1315?.outlastedNonStreamingTimeout ?? false))) return;
      } finally {
        if ($l1053(), $l1194?.($l654, $l1059?.chunks), $l487 !== void 0) $m_T1e($l487);
      }
      $l544("stream_completed", $l485 ?? null, $l662 !== null ? $l304 : null), yield* $l1175({ responseUnfinished: false });
      break e;
    }
    if ($l358?.settle({ kind: "ok" }, $l485, $l381?.id), $l686 !== void 0) $l686.ended = "completed";
  } catch ($l1342) {
    if ($l649(), yield* $l1001(), $l544($l4.aborted ? "aborted" : "attempt_errored", $l485 ?? null, null), $l1342 instanceof $m_YO) throw $l689.reportHttpFailure($l1342.originalError, "useFallbackModel", { fallbackModelCouldHelp: $l1342.reason !== "overloaded" }), $l358?.settle({ kind: "error", error: $l1342 }, $l485), $l669 = true, $l1342;
    let $l1343 = $l1342 instanceof $m_$c ? $l1342.originalError : void 0, $l1344 = ($l1343 === void 0 ? "fail" : $l689.onWithRetryGaveUp($l1343)) === "retryWithoutStreaming", $l1345 = $l1342, $l1346 = false;
    if ($l1344) {
      let $l1347 = ($l1343 instanceof $m_Mt ? $l1343.requestID : void 0) ?? "unknown";
      if ($m_t("Streaming endpoint returned 404, falling back to non-streaming mode", { level: "warn" }), $l666 = true, $l303 = $l12.now(), $l344?.strip(), $m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $m_b("404_stream_creation"), attemptNumber: $l482, maxOutputTokens: $l670, thinkingType: $m_c($l35.type), request_id: $m_Yg($l1347), fallback_cause: $m_b("404_stream_creation"), any_stream_event_yielded: false }), $m_Y("info", "cli_nonstreaming_fallback_started"), $m_a("tengu_nonstreaming_fallback_started", { request_id: $m_ye($l1347), model: $m_wt($l11.model), fallback_cause: $m_b("404_stream_creation") }), $l657) $m_$ln("non_streaming");
      yield { type: "streaming_fallback_began", cause: "404_stream_creation" };
      try {
        if ($l501 = $l485 ?? ($l1347 !== "unknown" ? $l1347 : null), yield* $l1002({ requestId: $m_uke($l1347), analyticsRequestId: $m_Yg($l1347), cause: "404_stream_creation", errorName: null, connectionCode: null, stall: null }, false)) return;
        if ($l1346 = true, $l686 !== void 0) $l686.ended = "completed";
      } catch ($l1348) {
        if ($l1348 instanceof $m_YO) throw $l358?.settle({ kind: "error", error: $l1348 }, $l485), $l669 = true, $l1348;
        $l1345 = $l1348;
      }
    }
    if (!$l1346) {
      if ($l73 && ($l1345 instanceof $m_cee || $l11.toolSearchRefusal !== void 0)) $m_cto($l28);
      if ($l1345 instanceof $m_cee) throw $l168?.splice(0, $l168.length), $l1345;
      $m_t(`${$l1344 ? "Non-streaming fallback also failed" : "Error in API request"}: ${$m_d($l1345)}`, { level: "error" });
      let $l1349 = $l1345, $l1350 = $l11.model;
      if ($l1345 instanceof $m_$c) $l1349 = $l1345.originalError, $l1350 = $l1345.retryContext.model;
      if ($l1349 instanceof $m_sf) {
        $l358?.settle({ kind: "aborted" }, $l1344 ? null : $l485, $l1344 ? void 0 : $l381?.id), $l523();
        return;
      }
      if ($l686 !== void 0 && $m_PM($l1349)) $l686.ended = "filtered_again";
      if ($l1349 instanceof $m_Mt) $m_A6n($l1349, $m_Umn($l11), $l12.now(), $l337, $l11.storageV5);
      let $l1351 = $l485 || ($l1349 instanceof $m_Mt ? $m_M2e($l1349.requestID || $l1349.error?.request_id, $l1349.headers) : void 0);
      $l358?.settle({ kind: "error", error: $l1349 }, $l1351), $NEW_chunk_e6aww6q8_js_Oun({ isLowPriority: $l511, dispatch: $l691, error: $l1349, model: $l1350, messageCount: $l247.length, messageTokens: $m_wre($l247), durationMs: Math.max(0, Math.round($l12.monotonicNow() - $l481)), durationMsIncludingRetries: Math.max(0, Math.round($l12.monotonicNow() - $l480)), attempt: $l482, requestId: $l1351, clientRequestId: $l508, didFallBackToNonStreaming: $l666, nonStreamingFallbackSkipped: $l667, observedResponse: $l666 ? void 0 : $l514, queryTracking: $l11.queryTracking, querySource: $l11.querySource, accountMemoryKeys: $l478, messageClientPlatform: $l11.messageClientPlatform, llmSpan: $l479, fastMode: $l674, previousRequestId: $l19, effort: $l317, agentContext: $l11.agentContext, attribution: $m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), modelCallNames: $l11.modelCallNames, promptTooLongIsHandled: $l11.promptTooLongIsHandled });
      let $l1352 = $m_oJ($l1349, $l1350, { messages: $l0, messagesForAPI: $l247, requestId: $l1351 }), $l1353 = { ...$l1352, ...$l4.aborted && ($l1352.apiError === "connection_failed" || $l1352.apiError === "computer_slept") && { apiError: void 0 }, ...$l685 !== void 0 && $l1349 === $l685 && !$l4.aborted && { apiError: "stream_idle_timeout" }, perTurnEffort: $l346, perTurnTiming: $l347, ...$l684 && { streamWatchdogGaveUp: true }, ...($m_K8e($l1349) || $m_YYe($l1349) || $m_Jwn($l1349) || $l1349 instanceof $m_Mt && $l1349.type === "billing_error") && { resendCannotCure: true } };
      if ($m_E8($l1349) && !$l689.outOfApiAttempts()) return $l1353;
      yield $l1353, $l523();
      return;
    }
  } finally {
    if ($l202) $m_OEt($l332, $l663, Date.now());
    try {
      if ($l487 !== void 0) $m_T1e($l487);
    } catch ($l1354) {
      $m_l($m_N($l1354));
    }
    if ($m_$I("api_call", $l1052), $l418(), $m_C4o($l11.querySource, $l11.agentId), $l683) $l11.onRetryStatus?.(null);
    if ($l686 !== void 0) $m_Imn($l686, { now: $l12.monotonicNow(), stopReason: $l668?.message.stop_reason ?? $l662, aborted: $l4.aborted, model: $l11.model, querySource: $l11.querySource, clientRequestId: $l666 ? void 0 : $l508 });
    if ($l544($l4.aborted ? "aborted" : "attempt_errored", $l485 ?? null, null), $l358?.settle($l662 !== null && $l485 ? { kind: "ok" } : $l4.aborted ? { kind: "aborted" } : { kind: "other_exit" }, $l485, $l381?.id), $l523(), $l668) {
      let $l1355 = $l668.message.usage;
      if ($l304 = $m_mAe($m_Pm, $l1355), $l662 = $l668.message.stop_reason, $l662 === "refusal") $m_JZ({ model: $l26, requestId: $l485 || void 0, querySource: $l11.querySource, effort: $l317, fastMode: $l674, attempt: $l482, attribution: $m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: false, stopDetails: $l668.message.stop_details ?? null, agentContext: $l11.agentContext });
      let $l1356 = $l706?.servedFallbackModel, $l1357 = $l1356 !== void 0;
      if (!$l704) $m__no($m_Wn($l11.model), $l668.message.model);
      let $l1358 = $l1357 && $l706 !== void 0 ? $m_CXe($l706.entries, { speed: $l304.speed, inferenceGeo: $l304.inference_geo, serverToolUse: $l304.server_tool_use }, $l662) : $m_Cxe($l26, $l304);
      $l661 += $m_$7e($l1358, $l304, $l1357 ? $m_SYn($l11.serverRefusalFallback?.model, $l1356) : $l11.model, $l11.querySource, $l317, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool);
    }
    if ($l381 !== void 0 || $l668 !== void 0) {
      if ($l301(), $l202 && !$l669) $NEW_chunk_ndmse9kj_js_Sco();
    }
  }
  if ($l485 && $l202) $NEW_chunk_ndmse9kj_js_pSs($l485, { messageId: $l651.at(-1)?.message.id ?? $l381?.id, turnPosition: $l23 });
  if ($l202) $m_SBe($m_AM($l304));
  if ($l203) $m_Xmn($l204, () => {
    let $l1359 = $l9(), $l1360 = $m_AM($l304);
    return Number.isFinite($l1359) ? Math.max($l1359 + $l304.output_tokens, $l1360) : $l1360 || $l1359;
  });
  if ($NEW_chunk_e6aww6q8_js_m7t($l28, { isMainConversation: $l202 }), $l805(), $l764.served(), $l328() && $l673) $m_mni($l673, { requestId: $l485, previousMessageId: $l25, model: $l11.model, is1hCacheTTL: $l298 === "1h", querySource: $l11.querySource, queryDepth: $l11.queryTracking?.depth });
  let $l1361 = $l247.length, $l1362 = $m_wre($l247), $l1363 = $m_C_() ? void 0 : $m_Dun($l247, $l11.model), $l1364 = $m_C_() ? void 0 : $NEW_chunk_e6aww6q8_js_Dun($l247, $l468), $l1365 = $m_C_() ? void 0 : $m_adn($l306, $l309, $m_Qmr($l3, $l308)), $l1366 = $l202 ? $m_Nds() : void 0;
  $l11.getToolPermissionContext().then(($l1367) => {
    $NEW_chunk_e6aww6q8_js_Lun({ isLowPriority: $l511, dispatch: $l691, uncoveredTail: $l278, model: $l651[0]?.message.model ?? $l381?.model ?? $l11.model, preNormalizedModel: $l11.model, usage: $l304, start: $l481, startIncludingRetries: $l480, attempt: $l482, messageCount: $l1361, messageTokens: $l1362, requestId: $l485 ?? null, rawRequestBodyId: $l502, accountMemoryKeys: $l478, clientRequestId: $l666 ? void 0 : $l508, firstAttemptRequestId: $l501 ?? null, stopReason: $l662, ttftMs: $l652, firstContentMs: $l666 ? null : $l653 ?? null, streamEventCount: $l666 ? void 0 : $l654, queryOverheadMs: $l658, didFallBackToNonStreaming: $l666, querySource: $l11.querySource, promptCacheTtl: $l294 ? $l296 : void 0, promptCacheMessagesTtl: $l294 && !$l11.skipMessageCacheMarkers && $l299 ? "5m" : void 0, messageClientPlatform: $l11.messageClientPlatform, headers: $l671, extraEventFields: { ...{}, ...$NEW_chunk_e6aww6q8_js__7t($l28) }, costUSD: $l661, isDefaultModel: $l202 ? $l11.isDefaultModel : void 0, defaultModel: $l202 ? $l11.defaultModel : void 0, ...$l207($l345), carriedEffort: $l200, carriedEffortEnded: $l1366, queryTracking: $l11.queryTracking, permissionMode: $l1367.mode, proactivityLevel: $l11.proactivityLevel, newMessages: $l651, requestContentTelemetry: $l1363, sentBody: $l1364 && { ...$l1364, threadType: $l469 }, requestPrefixTelemetry: $l1365 && { ...$l1365, systemPromptSource: $m_le($l11.systemPromptSource), snapshotHash: $l11.systemPromptSnapshotHash }, llmSpan: $l479, globalCacheStrategy: $l131, requestSetupMs: $l481 - $l480, attemptStartTimes: $l483, fastMode: $l674, previousRequestId: $l19, betas: $l360, thinkingPrefixMismatchBehavior: $l527, echoWireToolInputs: $l50, effort: $l345, turnOrigin: $l205, agentContext: $l11.agentContext, attribution: $m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), modelCallNames: $l11.modelCallNames });
  }).catch(($l1368) => $m_l($m_Xe($m_N($l1368), "api success logging failed"))), $l523();
}
;
