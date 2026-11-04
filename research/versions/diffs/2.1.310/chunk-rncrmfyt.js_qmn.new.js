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
  let $l19 = $m_Tfr($l0), $l20 = $m_OUe($l0, $l11.agentContext), $l21 = $NEW_chunk_bbw420pv_js_R5s($l11.agentContext, $l20);
  if ($l21 && $m_sa()) $NEW_chunk_bbw420pv_js_x5s($l21);
  let $l22 = $NEW_chunk_j0tbz6ra_js_Q_r($l0), $l23 = $NEW_chunk_j0tbz6ra_js_J_r($l0), $l24 = $m_sTr($l0), $l25 = $m_xQe($l0), $l26 = $m_J$r() === "bedrock" && $l11.model.includes("application-inference-profile") ? await $m_FMe($m_Pn($l11.model)) ?? $l11.model : $l11.model;
  if ($m_KTe($l11.model, $l11.querySource), $m_pTe()) await $m_Scn($l11.model, $l11.credentials, $l11.storageV5);
  if ($m_Om("query_tool_schema_build_start"), $l16) $m_sR("model_gates"), $m_oR("tool_schema_build");
  let $l27 = $l11.querySource.startsWith("repl_main_thread") || $l11.querySource.startsWith("agent:") || $l11.querySource === "sdk" || $l11.querySource === "hook_agent", $l28 = $m_BTo($l11.stickyBetas);
  if (!$l28.declaredToolsDecided) $l13(() => $m_j7t($l28, $l11.recordedWireShape, $l11.model));
  let $l29 = $l13(() => $m_S8n($l11.model, { isAgenticQuery: $l27 })), $l30 = $l13(() => $m_qe($l26)), $l31 = $l5?.model === $l26 && !$m_gF($l11.querySource) ? $l5 : $l13(() => $m_Jd($l26));
  if ($m_UHt() && ($m_qk() || $l11.advisorModel !== void 0)) $l29.push($m_h1t);
  let $l32 = $l11.fallbackCreditCode !== void 0 && $l11.fallbackCreditMintModel !== void 0 && $m_Hfr($l11.fallbackCreditMintModel, $l11.model), $l33 = $l32 ? $l11.fallbackCreditMintModel : void 0, $l34 = $l33 ?? $l11.model, $l35 = $m_Tqs($l2, $l31.thinking.alwaysOn || $l33 !== void 0 && $l13(() => $m_kQe($l33))), $l36 = $l33 === void 0 ? $m_fC($l11.model) : void 0;
  if ($l36 !== void 0 && !$l28.declaredToolsDecided) {
    let $l37 = $m_Pyt($l28);
    for (let $l38 of $m_ibn($l36)) $m_Dg($l28, $l38);
    if ($l11.stickyBetas === void 0) $m_rZ($l28, $l37);
  }
  let $l39 = ($l40, $l41) => {
    $m_Dg($l28, $l40);
    let $l42 = "in this conversation";
    if ($l41 && $l36 !== void 0) $m_D5o($l36, $l40), $l42 += `, or by new ones on ${$l36} in this process`;
    $m_t(`[betas] the API refused ${$l40.header}; not sent again ${$l42}`, { level: "warn" });
  };
  $NEW_chunk_ybr49gcx_js_h$r($l3), await $m_s8e($l3);
  let $l43 = $l11.withoutToolDescribeHooks ? "engine" : "hooks", $l44 = ($l45, $l46) => $l43 === "engine" ? $m_B1e($l45, $l46) : $m_IX($l45, $l46);
  if (!$l11.withoutToolDescribeHooks) await $m_LYt($l3, ($l47) => $m_FH($l47, { getToolPermissionContext: $l11.getToolPermissionContext, tools: $l3, agents: $l11.agents, allowedAgentTypes: $l11.allowedAgentTypes, model: $l34, enginePlacement: $m_B1e($l47) ? "deferred" : "listed", querySource: $l11.querySource }));
  let $l48 = $l27 || $l11.forkPointUuid !== void 0 ? $l13(() => $m_Oxs($l11.advisorModel, $l34)) : void 0, $l49 = !$m_gF($l11.querySource) && await $m_avr($l34, $l3, $l11.getToolPermissionContext, $l11.agents, "query", $l11.credentials, $l11.recordedToolDescriptions, $l28) && $l11.toolSearchRefusal === void 0, $l50 = $m_ev($l0, $l11.echoWireToolInputs), $l51 = $l11.resumeIncompleteThinking === true;
  $l29 = $l13(() => $m_jHs($l28, $l29, $l11.model));
  let $l52 = false;
  if (!$l49 && $l11.toolSearchRefusal === void 0 && !$m_gF($l11.querySource)) try {
    $l52 = $l13(() => $m_Xxr($l28, $l34, { toolSearchToolFilteredOut: $m_ivr($l34, $l3, $l28), toolPoolRefreshes: $l11.toolPoolRefreshes === true, aheadOfRequest: false }));
  } catch ($l53) {
    $m_l($m_U($l53));
  }
  if (!$l28.declaredToolsDecided) {
    let $l54;
    try {
      $l54 = $l11.recordedDeferredTools?.();
      for (let $l55 of $l54?.nameOnlyAnnouncements ?? []) $l28.nameOnlyAnnouncements.add($l55);
      if ($l54 !== void 0) $m_ezn($l0, [...$l54.entries.values()], { strippedReferences: $l54.strippedReferences, ...($l49 || $l52) && $m_s9e($l28) && { surfacedCarrier: $l28 } });
    } catch ($l56) {
      $m_l($m_U($l56));
    }
    try {
      let $l57 = $l54?.toolInputCopies;
      if ($l57 !== void 0 && $l57.size > 0 && $m_FTo($l11.querySource) && $NEW_chunk_j0tbz6ra_js_FAt($l0, $l50)) $m_F_e($l0, $l57);
    } catch ($l58) {
      $m_l($m_U($l58));
    }
  }
  let $l59 = /* @__PURE__ */ new Set(), $l60 = /* @__PURE__ */ new Set(), $l61 = true;
  try {
    $l61 = $m_IHr();
  } catch ($l62) {
    $m_l($m_U($l62));
  }
  try {
    if ($l29.includes($m_Ib) && $l13(() => $NEW_chunk_ybr49gcx_js_w2s($l28, $l34))) $l59 = $m_mHs($l0, $l28.nameOnlyAnnouncements), $l60 = $m_gHs($l0, $l28.nameOnlyAnnouncements);
  } catch ($l63) {
    $m_l($m_U($l63));
  }
  let $l64;
  if ($l49) try {
    let $l65 = $m_HM();
    $l64 = $m_fTe($l28, $l3, ($l66) => $l44($l66, $l65), $l34);
  } catch ($l67) {
    $m_l($m_U($l67));
  }
  let $l68, $l69 = !$l28.declaredToolsDecided, $l70 = $NEW_chunk_ybr49gcx_js__2s(), $l71 = 0;
  if ($l49 || $l52) {
    let $l72;
    if (!$l28.declaredToolsDecided) try {
      $l72 = await $l11.getToolPermissionContext();
    } catch ($l73) {
      $m_l($m_U($l73));
    }
    try {
      $l68 = $m_Yxr($l28, () => $l11.recordedToolDescriptions && { names: $l11.recordedToolDescriptions.keys(), servers: $l11.recordedToolServers, entries: $l11.recordedToolEntries }, $l3, { latch: true, permissionContext: $l72 });
    } catch ($l74) {
      $m_l($m_U($l74)), $l64 = void 0;
    }
  } else if ($l69) $l28.declaredTools = void 0;
  $m_qwt($l28);
  let $l75 = $l68 ?? $l64, $l76 = /* @__PURE__ */ new Set(), $l77 = 0;
  if ($l49 || $l52) try {
    let $l78 = $m_HM();
    for (let $l79 of $l3) {
      let $l80 = $l49 && $l44($l79, $l78);
      if ($l75 === void 0 ? $l52 ? false : $l80 : $m_Bee($l79, $l75, $l3, { toolSearchAbsent: $l52, placements: $l43, nonDeferrableBuiltins: $l78 })) {
        if ($l76.add($l79.name), !$l80) $l77++;
      }
    }
  } catch ($l81) {
    $m_l($m_U($l81)), $l68 = void 0, $l75 = void 0, $l76.clear(), $l77 = 0;
    let $l82 = $m_HM();
    for (let $l83 of $l3) if ($l49 && $l44($l83, $l82)) $l76.add($l83.name);
  }
  let $l84 = $m_Uz().generation, $l85 = $l49 || $l52 ? $m_$To($l0, $l3, $l11.querySource, { keepMcp: !$m_C5($l3), surfacedOnWire: $l28.surfacedOnWire, ...$l70 && { declaredInline: $l68 } }) : void 0;
  if ($l49 && $l76.size === 0 && (!$l11.hasPendingMcpServers || $m_C5($l3)) && !$l85?.kept.size && !$l68?.has($m_Ai)) {
    if ($m_t("Tool search disabled: no deferred tools available to search"), $l49 = false, $l70 && $l68 !== void 0 && $l85 !== void 0) try {
      $l85 = $m_$To($l0, $l3, $l11.querySource, { keepMcp: !$m_C5($l3), surfacedOnWire: $l28.surfacedOnWire });
    } catch ($l86) {
      $m_l($m_U($l86));
    }
  }
  let $l87 = $l49 ? "tool_search" : $l52 ? "tool_addition" : void 0, $l88, $l89, $l90 = 0;
  if ($l87 !== void 0) {
    let $l91 = $m_GZ($l0, { surfaced: $m_s9e($l28) ? { exceptAnnouncements: $l28.nameOnlyAnnouncements } : $l28.surfacedOnWire }), $l92 = /* @__PURE__ */ new Set();
    if ($l59.size > 0) try {
      $l92 = $l61 ? new Set($m_Cme($l0).map(($l93) => $l93.toolName)) : $m_GZ($l0);
    } catch ($l94) {
      $m_l($m_U($l94));
    }
    $l88 = $l3.filter(($l95) => {
      if (!$l76.has($l95.name)) return true;
      if ($m_Ct($l95, $m_Ai)) return true;
      return $l91.has($l95.name) && (!$l59.has($l95.name) || $l92.has($l95.name));
    });
    try {
      let $l96 = $m_GTo($l88, $l68 ?? $l64);
      $l88 = $l96.tools, $l71 = $l96.redeclared.length;
    } catch ($l97) {
      $m_l($m_U($l97));
    }
  } else {
    $l88 = $l3.filter(($l98) => {
      if ($m_Ct($l98, $m_Ai)) return false;
      if ($l59.has($l98.name)) return false;
      return true;
    });
    let $l99 = $m_Zrn($l28);
    if ($l99 !== void 0) try {
      let $l100 = await $m_IHs($l99, $l3, { mcpClients: $l11.mcpClients ?? [], getPermissionContext: $l11.getToolPermissionContext, byValue: $l59 });
      $l89 = $l59.size === 0 ? $l100.kept : $l100.kept.without($l59), $l90 = $l100.unread;
      let $l101 = $m_GTo($l88, $l89);
      $l88 = $l101.tools, $l71 = $l101.redeclared.length;
    } catch ($l102) {
      $m_l($m_U($l102));
    }
    else if ($l69 && $l11.recordedToolDescriptions === void 0) try {
      $l88 = $NEW_chunk_ybr49gcx_js_A$r($l88, $l28);
    } catch ($l103) {
      $m_l($m_U($l103));
    }
  }
  let $l104 = $m_A5($m_szn($l88));
  $m_cfr($l104, $l11.querySource);
  let $l105 = $m_Sd($l11.model), $l106 = $l49 ? $NEW_chunk_ajtyjx88_js_aEt() : null;
  if ($l106 && $l105 !== "bedrock") {
    if (!$l29.includes($l106)) $l29.push($l106);
  }
  let $l107, $l108 = $m_LJ(), $l109 = ($l110) => $l76.has($l110.name) || $l49 && $m_Sfr($l110), $l111 = ($l112) => $l85?.kept.has($l112.name) === true, $l113 = true;
  try {
    $l113 = $l104.some(($l114) => ($l68?.has($l114.name) ?? true) && !$l109($l114) && !$l111($l114)) || $l68 !== void 0 && $m_zTo($l68, { pool: $l3, keptDeferred: $l85?.kept.keys() ?? [], keepMcp: !$m_C5($l3) }).length > 0;
  } catch ($l115) {
    $m_l($m_U($l115));
  }
  let $l116 = ($l117) => $l87 !== void 0 && ($l109($l117) || $l113 && $l111($l117));
  if ($l87 !== void 0 && $l68 === void 0) try {
    let $l118 = $m_A5($l88).filter(($l119) => !$l116($l119));
    if ($l75 !== void 0) $m_t_n($l28, new $m_qve($l118));
    else $m_OHs($l28, $l118);
  } catch ($l120) {
    $m_l($m_U($l120));
  }
  let $l121;
  if ($l87 === void 0 && $l69 && $m_Zrn($l28) === void 0 && ($l11.mcpClients ?? []).some(($l122) => $l122.type === "pending")) try {
    $l121 = await $m_PHs($l11, $l3, $l59);
  } catch ($l123) {
    $m_l($m_U($l123));
  }
  try {
    $l89 = $m_jTo($l28, $l87 !== void 0, () => $m_WTo($m_A5($l88), $l3, $l121 ?? $l89?.recordedOnly));
  } catch ($l124) {
    $m_l($m_U($l124));
  }
  let $l125 = $l108 && $l104.some(($l126) => $l126.isMcp === true && !$l116($l126));
  if ($l108 && !$l29.includes($m_m1t)) $l29.push($m_m1t);
  let $l127 = $l108 ? $l125 ? "none" : "system_prompt" : "none", $l128 = $m_HM(), $l129 = $l11.withoutToolDescribeHooks ? void 0 : $l11.redescribedTools, $l130 = await Promise.all($l104.map(($l131) => $m_FH($l131, { getToolPermissionContext: $l11.getToolPermissionContext, tools: $l3, agents: $l11.agents, allowedAgentTypes: $l11.allowedAgentTypes, model: $l34, enginePlacement: $m_B1e($l131, $l128) ? "deferred" : "listed", querySource: $l11.querySource, withoutToolDescribeHooks: $l11.withoutToolDescribeHooks, recordedDescription: $l116($l131) ? void 0 : $l11.recordedToolDescriptions?.get($l131.name), recordedEntry: $l116($l131) || $m_Ct($l131, $m_Fa) ? void 0 : $l11.recordedToolEntries?.get($l131.name), isRedescribed: $l129?.has($l131.name) || void 0, deferLoading: $l116($l131), loadedThroughToolSearch: $l49 && $l116($l131) && $l44($l131, $l128) })));
  $m_zYt($l28, $l130, { redescribed: $l129, recorded: $l11.recordedToolDescriptions, isMainChain: $m_uf($l11.agentContext) && $m_rs($l11.querySource) === "main" });
  let $l132 = [];
  if ($l87 !== "tool_search" && $l59.size > 0) try {
    let $l133 = new Set($l104.map(($l134) => $l134.name)), $l135 = $l3.filter(($l136) => $l59.has($l136.name) && !$l133.has($l136.name)), $l137 = new Set($m_A5($m_szn([...$l88, ...$l135])).map(($l138) => $l138.name));
    $l132 = await Promise.all($l135.filter(($l139) => $l137.has($l139.name)).map(($l140) => $m_FH($l140, { getToolPermissionContext: $l11.getToolPermissionContext, tools: $l3, agents: $l11.agents, allowedAgentTypes: $l11.allowedAgentTypes, model: $l34, enginePlacement: $m_B1e($l140) ? "deferred" : "listed", querySource: $l11.querySource, withoutToolDescribeHooks: $l11.withoutToolDescribeHooks, recordedDescription: $l11.recordedToolDescriptions?.get($l140.name), recordedEntry: $l11.recordedToolEntries?.get($l140.name), isRedescribed: $l129?.has($l140.name) || void 0, deferLoading: false })));
  } catch ($l141) {
    $m_l($m_U($l141)), $l132 = [];
  }
  let $l142 = new Map($l104.map(($l143, $l144) => [$l143.name, { schema: $l130[$l144], isMcp: $l143.isMcp === true }])), $l145 = $l87 !== void 0 ? $l68 : $l89, $l146 = [];
  if ($l145 !== void 0 && $l145.recordedOnly.size > 0) try {
    $l146 = $m_LHs($l130, $l145, { pool: $l3, recordedEntries: $l11.recordedToolEntries, keptDeferred: $l113 ? $l85?.kept.keys() ?? [] : [], keepMcp: !$m_C5($l3), requestCarriesStructuredOutputs: $l13(() => $m_w8n($l34)) });
  } catch ($l147) {
    $m_l($m_U($l147));
  }
  if ($m_FHs({ deferredLate: $l77, redeclared: $l71, fromRecord: $l146.length, queryDepth: $l11.queryTracking?.depth, toolSearchAbsent: $l87 === "tool_addition", noDeferredChannel: $l87 === void 0, unclassifiedDepartures: $l90 }), $l11.onInlineToolsDeclared) {
    let $l148 = new Map($l104.map(($l149) => [$l149.name, $l149])), $l150 = [];
    for (let $l151 of $l130) {
      if (!("input_schema" in $l151)) continue;
      let $l152 = $l148.get($l151.name), $l153 = $l152 === void 0 ? $l145?.recordedOnly.get($l151.name) : void 0;
      if ($l152 !== void 0 && !$l116($l152)) $l150.push({ name: $l151.name, description: $l151.description ?? "", schema: $l151, ...$l152.mcpInfo && { server: $l152.mcpInfo.serverName } });
      else if ($l153 !== void 0) {
        let $l154 = $l11.recordedToolEntries?.get($l151.name) ?? $l153.entry;
        $l150.push({ name: $l151.name, description: $l154.description ?? "", schema: $l154, ...$l153.server !== void 0 && { server: $l153.server } });
      }
    }
    $l11.onInlineToolsDeclared($l150);
  }
  if ($l87 !== void 0) {
    if ($l85) $m_EHs($l85, $l130, $l142, { requestCarriesStructuredOutputs: $l13(() => $m_w8n($l34)) });
    let $l155 = $m_qcn();
    if ($l155 && !$l88.some(($l156) => $m_Ct($l156, $m_SWe)) && !$l85?.kept.has($m_SWe)) $l130.splice(Math.max($l130.length - 1, 0), 0, $l155);
    let $l157 = $m_F($l88, ($l158) => $l76.has($l158.name));
    $m_t(`Dynamic tool loading: ${$l157}/${$l76.size} deferred tools included`);
  }
  if ($m_Om("query_tool_schema_build_end"), $l16) $m_sR("tool_schema_build");
  if ($m_i("tengu_api_before_normalize", { preNormalizedMessageCount: $l0.length }), $m_Om("query_message_normalization_start"), $l33 !== void 0) $m_i("tengu_fallback_credit_strip_as_mint_model", {});
  let $l159, $l160 = ($l161) => {
    $l162 = $l161.thread?.type === "continue";
    let $l163 = $NEW_chunk_j0tbz6ra_js_I9t($l28, { ...$m_Bmn($l161, $l164()), messages: $l165 }, { querySource: $l11.querySource, isMainThread: $m_uf($l11.agentContext), history: $l0, retryCause: $l166, retryKeepsHeal: $l167 === true, promptEpoch: $l11.promptRenderEpoch, accountMemoryEpoch: $l168 });
    if ($m_nx($l11.querySource) !== null && $m_Gb()) try {
      $m_Qfn($l11.agentId, $l163 !== void 0);
    } catch ($l169) {
      $m_l($m_U($l169));
    }
    if ($l163?.tools !== void 0) $l170 = [...$l163.tools];
    if ($l163?.tools !== void 0 && $l161.tools !== void 0) {
      if ($l161.tools = [...$l163.tools], $l85) $m_AHs($l85, $l161.tools);
    }
    let $l171 = $l161.tools ?? $l170;
    if ($l159 !== void 0 && $l171 !== void 0) $m_THs($l159, $l171);
    if ($l163 === void 0) return;
    if ($l163.system !== void 0) {
      let $l172 = typeof $l163.system === "string" ? $l163.system : [...$l163.system];
      if ($l173 = $l172, !$l174) $l161.system = $l172;
    }
    if ($l163.messages !== void 0) {
      $l165 = [...$l163.messages];
      let $l175 = $m_UYt($l165, $l161.messages.length);
      if ($m_eer($l175)) try {
        let $l176 = $m_qd($l175);
        $m_pKe($l176), $l175 = $l176;
      } catch {
      }
      $l161.messages = $l175;
    }
  }, $l177 = $m_Rm($l28, $m_eP), $l178 = $l177 || $m_Rm($l28, $m_DW), $l179 = $l178 || $m_Rm($l28, $m_P4), $l180 = $m_Rm($l28, $m_B2);
  if ($l29 = $l29.filter(($l181) => !$m_Rm($l28, $l181) && !($l178 && $l181 === $m_DW) && !($l179 && $l181 === $m_P4)), $l33 !== void 0) {
    let $l182 = $l13(() => $m_S8n($l33, { isAgenticQuery: $l27 })), $l183 = ($l184) => {
      if ($l182.includes($l184)) {
        if (!$l29.includes($l184)) $l29.push($l184);
      } else $l29 = $l29.filter(($l185) => $l185 !== $l184);
    };
    if (!$l177) $l183($m_eP);
    if (!$l178) $l183($m_DW);
    if (!$l179) $l183($m_P4);
    $l29 = $l13(() => $m_WHs($l28, $l29, $l33, $l11.model)), $l183($m_cde);
  }
  let $l186 = !$m_gF($l11.querySource) && !$l180 && $l29.includes($m_eP) && $l13(() => $m_OTe($l33 ?? $l11.model));
  if ($l186 && !$l29.includes($m_B2)) $l29.push($m_B2);
  let $l187 = $l13(() => $m_kYn({ loopEffort: $l11.refusalFallbackEffort, continuesMainConversation: $m_BB($l11.agentContext) }, $l26)), $l188 = $l13(() => $m_ek($l26, $l11.effortValue, { turnEffort: $l11.turnEffort, hookEffortValue: $l11.hookEffortValue, carriedEffort: $l187 })), $l189 = $l187 === null ? void 0 : { level: $l187, outcome: $m_Gjs({ carried: $l187, withIt: $l188, withoutIt: $l13(() => $m_ek($l26, $l11.effortValue ?? $l11.effortSetAsideByHold, { turnEffort: $l11.turnEffort, hookEffortValue: $l11.hookEffortValue, carriedEffort: null })), isSavedSetAside: $l11.effortSetAsideByHold !== void 0 }) }, $l190 = $l13(() => $m_KS($l26) && $l188 !== void 0 ? $m_Q0($l188) : void 0), $l191 = $m_uf($l11.agentContext) && ($l11.querySource.startsWith("repl_main_thread") || $l11.querySource === "sdk"), $l192 = $l11.querySource.startsWith("repl_main_thread") || $l11.querySource === "sdk", $l193 = $l191 ? "foreground" : $l11.agentContext.agentId;
  if ($l192) $m_zmn($l193, $l9);
  let $l194;
  if ($l191) try {
    $l194 = $m_fgn($l0);
  } catch ($l195) {
    $m_l($m_U($l195));
  }
  let $l196 = ($l197) => {
    if (!$l191 || $l197 === void 0) return {};
    try {
      let $l198 = $m_pJ($l26);
      return { isDefaultEffort: $l197 === $l198, defaultEffortLevel: $l198 };
    } catch ($l199) {
      return $m_l($m_U($l199)), {};
    }
  }, $l200 = typeof $l188 === "string" && !($l35.type === "disabled" && $l35.mechanical === true) ? $l190 : void 0, $l201 = $l29.includes($m_P4) ? $m_Lfn(/* @__PURE__ */ new Date(), $m_MHr()) : void 0, $l202 = $l130.some(($l203) => !("defer_loading" in $l203 && $l203.defer_loading === true)) || ($l11.extraToolSchemas ?? []).some(($l204) => !("defer_loading" in $l204 && $l204.defer_loading === true)), $l205 = $l11.advisorDeferred === true && $l48 !== void 0 && $l29.includes($m_hS) && $l202, $l206 = $l11.advisorDeferred === true && $l11.advisorActive === false && !$l205 ? void 0 : $l48, $l207 = false, $l208 = 0;
  if ($l87 === "tool_addition" && !$l29.includes($m_hS)) try {
    let $l209 = $l130.flatMap(($l210) => {
      if (!("defer_loading" in $l210) || $l210.defer_loading !== true) return [$l210];
      if (!("input_schema" in $l210) || !$l3.some(($l211) => $m_Ct($l211, $l210.name))) return [];
      let { defer_loading: $l212, ...$l213 } = $l210;
      return [$l213];
    }), $l214 = new Set($l130);
    $l208 = $m_F($l209, ($l215) => !$l214.has($l215)), $l207 = $l208 > 0 || $l209.length !== $l130.length, $l130.splice(0, $l130.length, ...$l209);
  } catch ($l216) {
    $m_l($m_U($l216));
  }
  let $l217 = $l33 === void 0 ? void 0 : $l13(() => $m_GHs($l28, $l0, { mintModel: $l33, retryModel: $l11.model, advisorEntryMoved: $l11.advisorDeferred === true && $l48 !== void 0 && $l202 && !$l205, deferredEntriesMoved: $l207, hasDeferredChannel: $l87 !== void 0 })), $l218 = /* @__PURE__ */ new Set([...$l88.filter($l116).map(($l219) => $l219.name), ...$l85?.kept.keys() ?? []]);
  if ($m_zHs($l28, $l0, $l218, $l49, $l59), $l87 !== void 0 && $l11.onDeferredToolsSent && $m_BIe()) try {
    $l159 = $l130.filter(($l220) => $m_Wrn($l220) && !$m_Ct($l220, $m_SWe)), $l11.onDeferredToolsSent({ entries: $l159, nameOnlyAnnouncements: $l28.nameOnlyAnnouncements, strippedReferences: $m_vHs($l85) });
  } catch ($l221) {
    $m_l($m_U($l221));
  }
  let $l222 = $m_cZ(() => {
    let $l223 = $l11.resumeIncompleteThinking ? "keep" : $NEW_chunk_j0tbz6ra_js_Bee?.relayThinkingDisposition({ mainLoop: $m_rs($l11.querySource) === "main" && !$l11.agentId, fetch: $l11.fetchOverride }) ?? "keep";
    return { relayThinking: $l223, relayThinkingPlan: $l223 === "keep" ? void 0 : $m_HJe($l0), builtForRelay: !$l11.resumeIncompleteThinking && ($NEW_chunk_j0tbz6ra_js_Bee?.isRelayedRequest($l11.fetchOverride) ?? false) };
  }, { relayThinking: "keep", relayThinkingPlan: void 0, builtForRelay: false }), { relayThinking: $l224, relayThinkingPlan: $l225, builtForRelay: $l226 } = $l222, $l227 = { model: $l11.model, bodyModel: $l34, pollEventsAsText: false, accountMemoryWithheld: $m_NKn(), tools: $m_A5($l88), ingestPool: { tools: $l3, ...$m_FTo($l11.querySource) && { ownRequest: { mcpServersPending: $l11.hasPendingMcpServers === true } } }, ...$l70 && { declaredToolNames: $NEW_chunk_ybr49gcx_js_b2s($l130) }, betas: $l29, midConvLatchedOff: $l177, keptReminders: $l186, useToolSearch: $l49, advisorModel: $l206, advisorDeferred: $l205, stripWebSearch: $l28.webSearchHistoryRejected, mediaItemLimit: $m_Gzr($l28, $l34)?.limit, resumeIncompleteThinking: $l51, perTurnEffort: $l200, perTurnNow: $l201, deferredToolReferencePlan: $l85, keepForeignThinking: $m_Bfn(), deferredWireToolNames: $l218, nameOnlyAnnouncements: $l28.nameOnlyAnnouncements, byValueNames: $l59, byValueAnnouncements: $l60, withoutAttachmentHooks: $l11.withoutToolDescribeHooks, reminderFold: $l11.reminderFold, echoWireToolInputs: $l50, thinkingStripPlan: $l225 === void 0 ? $l11.thinkingStripPlan : $m_VJe($l11.thinkingStripPlan, $l225), advisorStripPlan: $l11.advisorStripPlan };
  if ($l16) $m_oR("message_normalization");
  let { messagesPreNormalize: $l228, messagesForAPI: $l229, accountMemoryEpoch: $l230, midConvFallback: $l231, toolChangeFallback: $l232, inlineToolsFallback: $l233, keptForeignSignatures: $l234, blocksEligible: $l235 } = $l13(() => $m_Gmn($l0, $l227));
  if ($l16) $m_sR("message_normalization"), $m_oR("request_build");
  let $l236 = $l229, $l168 = $l230;
  if ($m_Ufr($l0, $l11), $l11.onToolInputCopiesSent && $l227.ingestPool?.ownRequest !== void 0 && $l50) try {
    let $l237 = $m_r4t($l0);
    if ($l237.size > 0) $l11.onToolInputCopiesSent($l237);
  } catch ($l238) {
    $m_l($m_U($l238));
  }
  if ($m_KTo($l28, $l0, $l236, { useToolSearch: $l49, toolSearchAbsent: $l87 === "tool_addition", blocksEligible: $l235, byValueNames: $l59, byValueStaysOut: $l61 }), $l87 !== void 0) $m_kHs($l0, $l28.surfacedOnWire, $l142, $l85, $l11.querySource, $l84);
  let $l166, $l239 = false, $l240 = false, $l241 = false, $l242 = () => {
    if (!$l240 || $l241) return;
    return $l241 = true, $m_en({ type: "advisor_stripped" });
  }, $l243 = false, $l244 = false;
  if ($l224 === "strip_and_mark") if ($l225 !== void 0 && $l225.size > 0) $l239 = true, $l243 = true;
  else $l244 = true;
  let $l245 = $m_wv(), $l246, $l247 = ($l248, $l249, $l250) => {
    if ($l246 !== void 0 && $l246.input === $l248 && $l246.fallbackBeta === $l249 && $l246.marksBeta === $l250) return $l246.output;
    let $l251 = $m_Sgn($l248, $l249), $l252 = false, $l253 = $NEW_chunk_j0tbz6ra_js_Fyn($m_ZTe($l251, $l245, $l51), $l0);
    return $l246 = { input: $l248, fallbackBeta: $l249, marksBeta: $l250, output: $l253, markable: $l252 }, $l253;
  }, $l167, $l254 = false, $l255 = ($l256, $l257, $l258 = false) => {
    if ($l254 = true, $l257 === "microcompact") $m_Npe($l28, $l257);
    else $l166 = $l257, $l167 = ($l167 ?? true) && $l258;
    return $m_ZTe($l256, $l245, $l51);
  }, $l259 = $l231, $l260 = $l232, $l261 = $l233, $l262 = false, $l263 = false, $l264 = "idle", $l265 = false, $l266, $l267 = $m_nx($l11.querySource) !== null && $m_Gb() ? $m_tJe($l11.model) : false, $l268 = $m_nx($l11.querySource) !== null && $m_Gb() ? $m_nJe($l11.agentId) : false, $l269 = $m_nx($l11.querySource) !== null && $m_Gb() ? $m_oJe() : false, $l270 = $l11.fallbackCreditCode !== void 0 ? $l11.fallbackCreditMintedStateless === true : false, $l271 = $m_nx($l11.querySource) !== null && $m_Gb() ? $m_ATe($l11.agentId) : false, $l272 = $m_zFn($l11.querySource, $l11.agentId, $l11.model, $l270), $l273 = $l50;
  if ($m_gZ($l236)) {
    let $l274 = $m_sa() ? $m_Vdn({ fromModel: $m_kgn($l236), sticky: $l28, serverDefaultFallbacksEnabled: () => $m_k($NEW_chunk_j0tbz6ra_js_KOr, false), selfTargetDefaultFallbacksEnabled: () => $m_k($NEW_chunk_j0tbz6ra_js_VOr, false) }) : null, $l275 = $l274 !== null && !$m_Rm($l28, $l274);
    if ($l275) $m_MN($l28, $l274);
    $m_i("tengu_rotunda_pennant_replay", { echo_eligible: $l275, category: $l274 !== null && $l274 === $m_tw });
  }
  $m_i("tengu_api_after_normalize", { postNormalizedMessageCount: $l236.length, apiSystemMessageCount: $m_F($l236, ($l276) => $l276.type === "api_system") });
  let $l277 = $m_RIs($l228), $l278 = $m_n1n({ isNonInteractive: $l11.isNonInteractiveSession, hasAppendSystemPrompt: $l11.hasAppendSystemPrompt, recorded: $l11.recordedCliPrefix }), $l279, $l280 = () => {
    if ($l11.onPromptHeadSent) try {
      $l11.onPromptHeadSent({ cliPrefix: $l278, wireShape: $l13(() => $m_jfn($l28, $l34, { betas: $l29, keptOn: $l186, safeguards: $l279 })) });
    } catch ($l281) {
      $m_l($m_U($l281));
    }
  };
  $l280(), $l1 = $m_PAs($l1, $l278, { fingerprint: $l277, agentContext: $l11.agentContext, previousRequestId: $l19, promptId: $l20, turnOrigin: $l22, turnPosition: $l23 });
  let $l282 = $l11.enablePromptCaching ?? $m_gie($l34), $l283 = $l11.forkPointUuid !== void 0 && $m_uf($l11.agentContext), $l284 = $m_zbe($l11.querySource, { agentCacheTtlOverride: $l11.agentCacheTtlOverride, mainThreadModel: $l191 || $l283 ? $l34 : void 0 }), $l285 = $l284.ttl === "1h" ? "1h" : void 0, $l286 = $m_qfr($l284.ttl) === "1h" ? "1h" : void 0, $l287 = $l286 !== $l285;
  if ($l191) {
    if ($m_$4o($l285 === "1h" ? $m_ZT : $m_SB, $l11.model, $l284.reason === "live_5m_cache"), $l287) $m_Kfr();
  }
  let $l288 = false, $l289 = () => {
    if ($l288) return;
    $l288 = true;
    let $l290 = $l291 || $l12.now();
    if ($l191) $m_G1s($m_wB, { at: $l290, ttl: $m_W4n($l292) ?? $l286 ?? "5m", inputTokens: $l292.input_tokens, cacheReadTokens: $l292.cache_read_input_tokens, cacheCreationTokens: $l292.cache_creation_input_tokens });
    else if ($l283 && $l292.cache_read_input_tokens > 0) $m_fDr($m_wB, $l290);
  }, $l293 = $m_Jfr($l1, $l282, { skipGlobalCacheForSystemPrompt: $l125, cacheTtl: $l285 }), $l294 = $l29.length > 0, $l295 = [...$l11.extraToolSchemas ?? []];
  if ($l206) $l295.push({ type: $NEW_chunk_j0tbz6ra_js_PXt, name: $m_iIe, model: $l206, ...$l205 && { defer_loading: true } });
  let $l296 = [...$l130, ...$l295], $l297 = $m_jYt($l28, { model: $m_fC($l11.model), tools: $l296, system: $l293, messages: $l236.map(($l298) => ({ role: $l298.message.role, content: $l298.message.content })) }, { querySource: $l11.querySource, retryCause: void 0, promptEpoch: $l11.promptRenderEpoch });
  if ($l297 !== void 0) {
    let $l299 = $m_en({ type: "prefix_delta", text: $l297 });
    yield $l299;
    let $l300 = $l13(() => $m_Gmn([...$l0, $l299], $l227));
    $l236 = $l300.messagesForAPI, $l168 = $l300.accountMemoryEpoch, $m_KTo($l28, $l0, $l236, { useToolSearch: $l49, toolSearchAbsent: $l87 === "tool_addition", blocksEligible: $l300.blocksEligible, byValueNames: $l59, byValueStaysOut: $l61 }), $l259 = $l300.midConvFallback, $l260 = $l300.toolChangeFallback, $l261 = $l300.inlineToolsFallback;
  }
  let $l301 = $m_jo() && $l13(() => $m_Vx()) && $l13(() => $m_sh($l34)) && !!$l11.fastMode && !$m_lun($l11.model), $l302 = $l301 && !$m_AGe(), $l303 = false;
  if ($l27 && $NEW_chunk_ajtyjx88_js_E4o()) {
    if ($m_k($NEW_chunk_j0tbz6ra_js_hkr, false)) {
      if ($m_hp()) $m_MN($l28, $m_zB);
      $l303 = $m_AE($l28, $m_zB);
    } else if (!$m_PHe() && !$m_Rm($l28, $m_zB)) try {
      let $l304 = await $l11.getToolPermissionContext();
      $l303 = $l304 !== void 0 && $m_js($l304.mode);
    } catch ($l305) {
      $m_l($m_U($l305));
    }
  }
  let $l306;
  if ($NEW_chunk_bbw420pv_js_C5s()) try {
    $l306 = await $l11.getToolPermissionContext();
  } catch ($l307) {
    $m_l($m_U($l307));
  }
  let $l308;
  if ($l302) $m_MN($l28, $m_Lpn);
  let $l309 = $m_AE($l28, $m_Lpn) && (!$m_gF($l11.querySource) || $l301);
  if ($m_Umn()) $m_MN($l28, $m_H_t);
  let $l310 = () => $m_Umn() && $m_AE($l28, $m_H_t), $l311 = $m_ATt($l28, { isMainLoopRequest: $l191, continuesPrefix: $l11.forkPointUuid !== void 0, cacheTtl: $l282 && !$l287 ? $l284 : void 0 }), $l312 = $m_Ttt(), $l313 = $m_ITt(), $l314 = void 0, $l315 = ($l316, $l317, $l318) => {
    if ($l191) $l314 = $l316, $m_MTt({ conversation: $l28, headerSent: $l311, requestId: $l316, headers: $l317, isWhole: $l318, chainReleaseCount: $l312, accountEpoch: $l319, modelSwitchCount: $l313, now: Date.now(), clientOptions: { model: $l11.model, credentials: $l11.credentials, storageV5: $l11.storageV5 } });
  }, $l320, $l321 = false;
  try {
    let $l322 = !($l35.type === "disabled" && $l35.mechanical === true) && !$m_a.CLAUDE_CODE_SIMULATE_PROXY_USAGE && (!$m_bF() || $m_Eht());
    if ($l322 && $m_Py()) {
      if ($l35.type !== "disabled") {
        if ($l320 = $m_Pfn(), $m_Mfn($l320)) $m_MN($l28, $m_NW);
      }
      $l321 = $m_AE($l28, $m_NW);
    } else if ($l322 && !$m_VB()) {
      let $l323 = $m_Sd($l11.model);
      if (($l323 === "bedrock" || $l323 === "mantle" || $l323 === "vertex") && $m_gB($l323) && $l13(() => $m_Rqs($l323, $l11.model))) {
        if ($l35.type !== "disabled") $m_MN($l28, $m_NW);
        $l321 = $m_AE($l28, $m_NW);
      }
    }
  } catch ($l324) {
    $m_l($l324), $l320 = void 0, $l321 = false;
  }
  if (!$l321 && !$m_I4()) $l29 = $l29.filter(($l325) => $l325 !== $m_NW);
  if ($l11.evictCacheOnComplete && $l11.stickyBetas !== void 0 && $m_Afr()) $m_MN($l28, $m_d7e);
  let $l326 = require("./chunk-wf28mfqa.js").createContextHintController({ querySource: $l11.querySource, agentId: $l11.agentId, includeFirstPartyBetas: $m_Py(), is529Error: $m_GW, storageV5: $l11.storageV5 }), $l327 = void 0, $l328 = null, $l329 = void 0, $l330 = () => $m_Wjs({ sent: $l327, turnEffort: $l11.turnEffort, hookEffortValue: $l11.hookEffortValue }), $l331, $l332, $l333, $l334 = () => $l333 ??= $m_j1s($l236), $l335 = () => {
    let $l336 = $m_z2();
    return $NEW_chunk_j0tbz6ra_js_d6e($l336, $l11.model, $m_Sd($l11.model)), $l336;
  }, $l337 = $l331 ??= $l296.filter(($l338) => !("defer_loading" in $l338 && $l338.defer_loading));
  $l332 ??= $m_mN($l29), $m_e1s({ system: $l293, toolSchemas: $l331, anyDeferLoading: $l331.length !== $l296.length, querySource: $l11.querySource, model: $l11.model, agentId: $l11.agentId, fastMode: $l309, globalCacheStrategy: $l127, betas: $l311 ? [...$l332, $m_ZI.header] : $l332, autoModeActive: $l303, isUsingOverage: $m_Ki().isUsingOverage ?? false, is1hCacheTTL: $l286 === "1h", queryDepth: $l11.queryTracking?.depth, cacheDiagnosis: $l310(), effortValue: $l188, thinkingConfig: $l35, extraBodyParams: $l335(), getMessageHashes: $l334, messages: $l236, baselineAgentId: $l11.querySource === "agent_summary" && $m_sE($l11.agentContext) ? $l11.agentContext.agentId : void 0 });
  let $l339 = $l236, $l340 = null, $l341 = () => $m_w7() === "thirdParty" && $l342.includes($m_dA.header), $l343 = () => $l321 && !$m_I4() && $l342.includes($m_NW.header), $l344 = [], $l345 = false, $l346 = ($l347) => {
    if (!$m_AE($l28, $m_dA)) return;
    let $l348 = $l341(), $l349 = $l348 && $l347 instanceof $m_Ot && $l347.status === 400 && $l347.message.includes($m_dA.header), $l350 = $l348 && !$l343() && $m_UH($l347), $l351 = $l348 ? $m_x6n($l347) ?? [] : [], $l352 = $l351.some(($l353) => $l353.includes("dangerous_tool_use") || $l353.includes("safeguard"));
    if (!$l349 && !$l350 && !$l352 && !$m_IVe($l347)) return;
    if ($m_Dg($l28, $m_dA), $l350 && !$l349 && !$l352 && !$m_IVe($l347)) $l344.push($m_dA), $l345 = !$m_Fre();
    if ($l348) {
      if ($m_abn(), $l352) $m_R6n($l11.model, $l351);
    }
    return $m_t($l348 ? "[server-classifier] the platform rejected a beta on this request (HTTP 400), most likely dangerous-tool-use, which this deployment does not know yet; it is not sent again this session and auto mode decides with the local classifier" : "[server-classifier] the server rejected the dangerous-tool-use beta header or the safeguards field (HTTP 400); neither is sent again this conversation, so every auto-mode tool use is denied as classifier-unavailable until the conversation's betas reset (/clear or /compact)", { level: "warn" }), $m_i("tengu_server_classifier_beta_rejected_retry", { provider: $m_gA(), unnamed: $l350, foundryFeature: $l352, unclaimed: false }), "retry:safeguards";
  }, $l354 = ($l355) => $m_hJe($l355, $l11.model) && (!!$l11.modelIsRefusalFallbackTarget || $m_U$r($l11.model)), $l356 = ($l357) => $m_gJe($l357) || $l354($l357), $l358 = ($l359) => $l87 !== void 0 && $l360 === void 0 && $l359 instanceof $m_Ot && !$l11.resumeIncompleteThinking, $l361 = ($l362) => {
    let $l363 = $m_OVe($l362);
    return $l358($l362) && (!$NEW_chunk_j0tbz6ra_js_eSn() || /\bdefer_loading\b/.test($l362.message)) && ($l362.status === 400 || $l362.status === 422) && $l362.type !== "billing_error" && !$l356($l363) && !$l364($l363);
  }, $l365 = ($l366, $l367, $l368) => {
    $m_t(`[ToolSearch] HTTP ${$l366.status} ${$l368}${$l367 ? ` (${$l367.header})` : ""}; sending the request again without deferred tools. ENABLE_TOOL_SEARCH=false avoids the refused request${$l344.length > 0 ? `. Dropped first and now allowed again: ${$m_mN($l344).join(", ")}` : ""}`, { level: "warn" });
    for (let $l369 of $l344) $m_uer($l28, $l369);
    if ($l345) $m_$5o();
    throw new $m_mZ($l366, $l49);
  }, $l370 = ($l371) => {
    if ($l106 !== null && $l358($l371) && $NEW_chunk_j0tbz6ra_js_Zbe($l371, $l106)) $l365($l371, $l106, "refusing the tool search beta");
    return;
  }, $l372 = ($l373) => {
    if ($l361($l373)) $l365($l373, $l106, "that no other recovery took, on a request that declared deferred tools");
    return;
  }, $l374 = false, $l375 = () => {
    let $l376 = $l11.toolSearchRefusal;
    if ($l376 === void 0 || $l374) return;
    $l374 = true;
    try {
      let $l377 = $NEW_chunk_ajtyjx88_js_aEt(), $l378 = $NEW_chunk_j0tbz6ra_js_Zbe($l376, $l377);
      if ($l378) $l39($l377, $m_uke($l376, $l377));
      else $m_Dg($l28, $l377), $m_t("[ToolSearch] the endpoint answered the request sent without tool search, so this conversation goes on without it");
      $m_i("tengu_beta_400_healed", { beta: $m_tde([$l377.header]), model: $m_Et($l11.model), provider: $m_gA(), status: $l376.status, unnamed: !$l378 });
    } catch ($l379) {
      $m_l($l379);
    }
  }, $l380 = ($l381) => {
    let $l382 = $l383($l381, true);
    if ($l382 !== null) return $l382;
    if (!($l381 instanceof $m_Ot) || $l381.status !== 400 && $l381.status !== 422) return;
    let $l384 = $m_OVe($l381);
    if ($l356($l384) || $l364($l384)) return;
    if ($l381.status === 422 || !$m_AE($l28, $m_dA) || !$l341()) {
      if ($m_I4() || $l28.systemMessagesAcceptedBy.has($l34)) return;
      let $l385 = $l386($l381, true);
      if ($l385 !== void 0) $l387 = "retrying";
      return $l385;
    }
    return $m_Dg($l28, $m_dA), $l344.push($m_dA), $m_t("[server-classifier] an unrecognised HTTP 400 arrived while the dangerous-tool-use beta was on the request; retrying once without it, and auto mode decides with the local classifier for the rest of this conversation", { level: "warn" }), $m_i("tengu_server_classifier_beta_rejected_retry", { provider: $m_gA(), unnamed: false, foundryFeature: false, unclaimed: true }), "retry:safeguards-unclaimed";
  }, $l388 = ($l389) => {
    try {
      if (!($l389 instanceof $m_Ot) || $l389.status !== 400 && $l389.status !== 422) return;
      if ($l390 === "withoutField") {
        $l390 = "spent";
        let $l391 = $l380($l389);
        if ($l391 === void 0 && !$l356($l389) && !$l361($l389)) $NEW_chunk_j0tbz6ra_js_ugn();
        return $l391;
      }
      if ($l390 === "spent" || $l392 === void 0 || $l389.type === "billing_error" || $l356($l389) || $l364($l389) && !$m_A6t($l389) || !$NEW_chunk_j0tbz6ra_js_lgn() || $NEW_chunk_j0tbz6ra_js_eSn()) return;
      return $l29 = $l29.filter(($l393) => $l393 !== $m_yne), $l390 = $l392 === "updates" && $l35.display !== void 0 ? "withoutUpdates" : "withoutField", `retry:thinking-display-unclaimed:${$l390}`;
    } catch ($l394) {
      $m_l($l394);
      return;
    }
  }, $l395 = () => {
    if ($l387 === "retrying") $l387 = "spent";
    else if (!$m_I4() && $l165.some(($l396) => $l396.role === "system")) $l28.systemMessagesAcceptedBy.add($l34), $l280();
  }, $l397 = () => {
    if ($l387 === "retrying") $m_uer($l28, $m_eP), $l280(), $m_t("[mid-conv-system] the resend without system messages was not answered either, so the guess that the platform refuses them is dropped; the next request of this conversation sends them again", { level: "warn" });
  }, $l398 = () => {
    if ($l390 === "idle" || $l390 === "spent") return;
    let $l399 = $l390 === "withoutField";
    $l390 = $l399 ? "spent" : "idle";
    try {
      if ($l399) $m_Dg($l28, $NEW_chunk_at88wjsn_js_D5o);
      $m_Dg($l28, $m_yne), $m_t(`[thinking] a request was refused (HTTP 400 or 422) and went through when sent again ${$l399 ? "without thinking.display" : "with the session's own display in place of 'updates'"}; this conversation no longer sends ${$l399 ? "thinking.display" : "'updates'"}.`, { level: "warn" }), $m_i("tengu_beta_400_healed", { beta: $m_tde([$m_yne.header]), model: $m_Et($l11.model), provider: $m_gA(), unclaimed: true });
    } catch ($l400) {
      $m_l($l400);
    }
  }, $l401 = ($l402) => {
    return;
  }, $l403 = ($l404) => {
    {
      let $l405 = $l404 instanceof $m_Ot && $l404.status === 400;
      if ($l406 === "retrying") {
        if ($l405) {
          if ($l406 = "spent", !$l356($l404) && !($l407 === "idle" && $l408($l404))) $m_kpn();
        }
        return;
      }
      if ($l406 === "idle" && $l409 && $l29.includes($m_B2) && $l405 && $l404.type !== "billing_error" && !$l356($l404) && !$l364($l404) && $m__pn()) return $l406 = "retrying", $l410 = $l404.requestID ?? void 0, $l29 = $l29.filter(($l411) => $l411 !== $m_B2), $l340?.forceCreate("clear_at_header_retired"), "retry:kept-reminder-unrecognised-400";
    }
    return;
  }, $l408 = ($l412) => {
    try {
      return $m_$W !== null && $m_J$r() === "firstParty" && $l342.includes($m_$W.header) && $l412 instanceof $m_Ot && $l412.status === 400 && $l412.type !== "billing_error" && $m_jpe($l412) === "client_error" && !$l11.resumeIncompleteThinking && !($l413 && !$l414) && $m_cmn($l412) === void 0 && !$l356($l412) && !$l364($l412) && $m_MTe($l412) === null && $m_jVe($l412) === void 0 && $m_UVe($l412) === void 0 && $m_Spn();
    } catch ($l415) {
      return $m_l($l415), false;
    }
  }, $l416 = ($l417) => {
    try {
      if ($l407 === "retrying" && $l417 instanceof $m_Ot && $l417.status === 400) {
        if ($l407 = "spent", !$l356($l417)) $m_bpn();
        $m_i("tengu_tether_unrecognised_400", { phase: $m_b("refused"), planner_backed: $l418, query_source: $m_os($l11.querySource) });
      }
    } catch ($l419) {
      $m_l($l419);
    }
  }, $l420 = ($l421) => {
    try {
      if ($l416($l421), $l407 === "idle" && $l408($l421)) {
        let $l422 = $l340 !== null, $l423 = $l340?.dropForUnrecognised400();
        return $m_i("tengu_tether_unrecognised_400", { phase: $m_b("start"), planner_backed: $l422, dropped_thread: $l423 !== void 0, query_source: $m_os($l11.querySource) }), $l407 = "retrying", $l424 = $l421.requestID ?? void 0, $l418 = $l422, $l423 ?? "retry:tether-unrecognised-400";
      }
    } catch ($l425) {
      $m_l($l425);
    }
    return;
  }, $l426 = false, $l427 = ($l428) => {
    if ($l428 instanceof $m_Ot && $l428.status !== void 0) $l426 = true;
    if ($l416($l428), $l29.includes($m_B2) && $m_E6t($l428)) return $l29 = $l29.filter(($l429) => $l429 !== $m_B2), $m_Dg($l28, $m_B2), $m_ZQe(), $l280(), $l340?.forceCreate("clear_at_header_retired"), $m_dn("api_kept_reminder_clear_at", "server_rejected"), $m_t("[reminders] the server rejected the clear_at beta header or field (HTTP 400); retrying without them. For the rest of this session earlier reminders are not re-sent, and requests that can use a Message Threads thread get no reminder.", { level: "warn" }), "retry:kept-reminder-clear-at";
    if ($m_$W !== null && $m_ike($l428) && !$m_Rm($l28, $m_$W)) return $m_Dg($l28, $m_$W), $NEW_chunk_j0tbz6ra_js_UZe(), $m_t("[tether] server rejected the message-threads beta header \u2014 dropping it and threading for this session", { level: "warn" }), $l340?.resolveRetry($l428) ?? "retry:tether-header";
    return $l340?.resolveRetry($l428);
  }, $l430 = $m_E1s($l0, $l11.querySource, $l11.model, $l11.agentId, ($l431) => $m_xn($l227.tools, $l431)?.name, $l11.forkPointUuid), $l432 = false, $l165 = [], $l433 = [], $l434 = ($l435) => {
    if ($l433.length === 0) return $l435;
    for (let $l436 = $l433.length - 2; $l436 >= 0; $l436--) if ($l433[$l436] === $l435) return $l436;
    return;
  }, $l173 = void 0, $l170 = void 0, $l174 = false, $l437 = false, $l164 = () => ({ messages: $l165, system: $l173, tools: $l170 });
  {
    let $l438 = $m_nx($l11.querySource);
    if ($l438 !== null && $m_Gb()) {
      $l331 ??= $l296.filter(($l439) => !("defer_loading" in $l439 && $l439.defer_loading)), $l332 ??= $m_mN($l29);
      let $l440 = $m_xQe($l0), $l441 = $m_AE($l28, $m_dA) || $l11.serverClassifier === true && $l11.autoModeServerContext !== void 0 && $m_zhe() && !$m_Rm($l28, $m_dA) && !$m_Fre(), $l442 = $m_Ppn({ querySource: $l11.querySource, agentId: $l11.agentId, model: $l11.model, modelHeldStateless: $l267, relayHeldStateless: $l268, classifierHeldStateless: $l269, creditRetryStateless: $l270, dropHeldStateless: $l271, system: $l293, toolSchemas: $l331, betas: $l332, latchedHeaders: { fastMode: $l309, autoMode: $l303, cacheTtl1h: $l285 === "1h", evictOnComplete: $m_AE($l28, $m_d7e), cacheDiagnosis: $l310(), cacheKeepalive: $l311, dangerousToolUse: $l441 }, thinkingConfig: $l35, toolChoice: $l11.toolChoice, effortValue: $l188, extraBodyParams: $l335(), getMessageHashes: $l334, previousMessageId: $l440 });
      if ($m_ITe($l438, $l11.agentId)) {
        let $l443 = $m_Fpn($l0, $l236);
        if ($l340 = $NEW_chunk_j0tbz6ra_js_N_n({ engine: $l442, previousMessageId: $l440, anchorRewritten: $l443 !== null && $m_Ipn($l443, $l440), messages: $l236, agentId: $l11.agentId, model: $l11.model, modelHeldStateless: $l267, relayHeldStateless: $l268, classifierHeldStateless: $l269, creditRetryStateless: $l270, dropHeldStateless: $l271, toolResultClearingHeldStateless: $l430 !== void 0, clock: $l12 }), $l443 !== null) $m_Hpn($l443, { sourceCategory: $l438, messageCount: $l236.length, anchorMessageId: $l440 });
      }
    }
  }
  let $l444 = $m_Mx() ? { systemPrompt: $l1.join(`

`), userSystemPrompt: $l11.userSystemPrompt, querySource: $l11.querySource, tools: $m__($l296) } : void 0, $l445, $l446 = () => $l445 ??= $m_xfr($l0, $l3), $l447 = $m_sPr($l11.model, $l11.agentContext, $l444, $l236, $l302, $l11.querySource, $l446), $l448 = $l12.monotonicNow(), $l449 = $l12.monotonicNow(), $l450 = 0, $l451 = [], $l452 = void 0, $l453 = void 0, $l454 = false, $l455, $l456 = ($l457) => {
    if ($l457 !== void 0 && $m_w7() === "thirdParty" && $m_Hqe($l457) && !$m_Fre()) $m_abn(), $m_t(`[server-classifier] the platform gave no classification for this request (${$l457.why}); treating that as this deployment's answer: auto mode classifies locally for the rest of this session and stops sending the classifier context`);
  }, $l458 = ($l459, $l460, $l461) => {
    let $l462 = $l461.flatMap(($l463) => $l463.type === "tool_use" && typeof $l463.id === "string" ? [$l463.id] : []);
    $l456($m_$qe($l459, $l460, $l462));
  }, $l464 = false, $l465 = false, $l409 = false, $l406 = "idle", $l410, $l407 = "idle", $l424, $l418 = false, $l390 = "idle", $l387 = "idle", $l466 = "idle", $l467 = () => $l466 !== "idle" && $l466 !== "spent", $l468 = false, $l469 = void 0, $l470 = void 0, $l471, $l472 = ($l473, $l474) => {
    $l160($l473);
    let $l475 = $m_Bmn($l473, $l164());
    $m__qo($l475, $l11.querySource, $m_uf($l11.agentContext)), $l470 = $NEW_chunk_j0tbz6ra_js_mhn({ ...$l473, stream: $l474 }, $l11.querySource, $l446, $l475.messages, $l11.agentContext), $l471 = $NEW_chunk_j0tbz6ra_js_rCt({ params: $l475, querySource: $l11.querySource, agentId: $l11.agentId, storageV5: $l11.storageV5, conversation: $l0, stickyBetas: $l28, readInjectedBody: () => $m_z2() });
  }, $l476 = void 0, $l477 = void 0, $l478, $l479 = false, $l480 = $m_ILr(), $l481 = void 0, $l482, $l319 = $m_Yg(), $l483 = ($l484, $l485) => {
    let $l486 = $m_Hmn($l11);
    return $m_Ken($l484, $l486, $l12.now(), $l319, $l11.storageV5), $m_ZAs({ route: $l486, querySource: $l11.querySource, model: $l11.model, rateLimitType: $m_ZMt($l484).rateLimitType, retryAtMs: $l485.retryAtMs, attempt: $l485.attempt, maxRetries: $l485.maxRetries });
  }, $l487 = ($l488) => $NEW_chunk_j0tbz6ra_js_yhn({ rejection: $l488, nowMs: $l12.now(), credentials: $l11.credentials, stop: $l4 }), $l489 = null;
  function $l490() {
    if ($l489 !== null) $l489(), $l489 = null;
  }
  function $l491() {
    if ($l490(), $m_Vfr($l452), $l452 = void 0, $l477) $l477.body?.cancel().catch(() => {
    }), $l477 = void 0;
  }
  let $l342 = [], $l392 = void 0, $l492 = void 0, $l493 = false, $l494, $l495 = "disabled", $l496 = false, $l497 = false, $l162 = false, $l498 = false, $l499 = "none", $l500 = false, $l501 = false;
  if ($l11.fallbackCreditCode !== void 0 && (!$l32 || $l217 !== void 0)) $m_i("tengu_fallback_credit_skipped", { reason: $l32 ? $m_b("tool_changes_dropped") : $m_b("backend_unknown_or_mismatch"), ...$l217 && { ...$l217, late_tools_inlined: $l208 }, mint_request_id: $m_ye($l11.fallbackCreditMintRequestId), mint_model: $m_Et($l11.fallbackCreditMintModel), model: $m_Et($l11.model), query_source: $m_os($l11.querySource) });
  let $l502 = $l32 && $l217 === void 0 ? $l11.fallbackCreditCode : void 0, $l503 = ($l504) => ($l11.fallbackCreditCode ? $l504.split($l11.fallbackCreditCode).join("[FCT_REDACTED]") : $l504).slice(0, 600), $l413 = false, $l505 = false, $l414 = false, $l506 = false, $l507 = false, $l508 = false, $l509 = false, $l510 = ($l511, $l512, $l513) => {
    if (!$l413 || $l508) return;
    $l508 = true;
    let $l514 = $l327;
    $m_i("tengu_fallback_credit_outcome", { outcome: $m_h($l511), mint_request_id: $m_ye($l11.fallbackCreditMintRequestId), mint_model: $m_Et($l11.fallbackCreditMintModel), request_id: $m_ye($l512), client_request_id: $m_ye($l476), model: $m_Et($l11.model), query_source: $m_os($l11.querySource), carried_effort_level: $m_de($l189?.level), carried_effort_outcome: $m_de($l189?.outcome), effort_level: $m_de($l514), ...$l513 !== null && { input_tokens: $l513.input_tokens, output_tokens: $l513.output_tokens, cache_read_input_tokens: $l513.cache_read_input_tokens, cache_creation_input_tokens: $l513.cache_creation_input_tokens, cache_creation_5m_input_tokens: $l513.cache_creation?.ephemeral_5m_input_tokens ?? 0, cache_creation_1h_input_tokens: $l513.cache_creation?.ephemeral_1h_input_tokens ?? 0, service_tier: $m_de($l513.service_tier), speed: $m_de($l513.speed) } });
  }, $l515 = false, $l516 = false, $l517 = false, $l518 = ($l519, $l520 = true) => $l13(() => $l521($l519, $l520)), $l521 = ($l522, $l523) => {
    if ($l236 !== $l339) $l339 = $l236, $l333 = void 0, $m_t1s({ querySource: $l11.querySource, agentId: $l11.agentId, getMessageHashes: $l334, messages: $l236 });
    let $l524 = $l29.filter(($l525) => $l525 !== $m_vv || !$l467());
    if (!$l524.includes($m_vv) && !$l467() && $m_Cun($l522.model) !== null) $l524.push($m_vv);
    let $l526 = $m_Sd($l522.model), $l527 = $l526 === "bedrock" && $m_zB && $l303 && $l27 && $m__8n();
    if ($l527) $m_t(`auto-mode 3P: sending afk-mode beta '${$m_zB?.header}' to bedrock via body.anthropic_beta`);
    let $l528 = $l526 === "bedrock" ? [...$m_Iqs($l522.model).filter(($l529) => $l529 !== $m_vv || !$l467()), ...$l106 ? [$l106] : [], ...$l527 && $m_zB ? [$m_zB] : []] : [], $l530 = $m_z2($l528);
    $m_XTe($l530, $m_JJ, $l526 === "bedrock" && $l524.includes($m_JJ));
    let $l531 = { ...$l530.output_config ?? {} };
    delete $l530.output_config, $m_BJe($l188, $l531, $l530, $l524, $l26), $l496 = $NEW_chunk_j0tbz6ra_js_d6e($l530, $l522.model, $l526), $m_hfr($l11.taskBudget, $l531, $l524), $l497 = $m_yfr($l11.outputFormat, $l531, $l524, $l11.model);
    let $l532 = $l11.refusalFallbackSilentArmActive === true, $l533 = $m_Udn($l11.serverRefusalFallback, $l522.model, $l524, $l28, $l532, $l272);
    $m_Wdn($l11.fallbackCreditLaneArmed === true || $l11.fallbackCreditCode !== void 0, $l524, $l28, $l532, $l526 === "bedrock" ? $l530 : void 0), $l507 = $l524.includes($m_LW);
    let $l534 = $m_xqs($l526, $l26), $l535 = $l11.serverClassifier === true && $l11.autoModeServerContext !== void 0 ? $NEW_chunk_j0tbz6ra_js_Chn($NEW_chunk_j0tbz6ra_js_Ihn($m_Lbt($l0, $l236), $l0, $l236, $l11.agentId), $l0, $l236) : [], $l536 = $l11.serverClassifier === true && $l11.autoModeServerContext !== void 0 ? $m_Gcn({ autoModeServerContext: $l11.autoModeServerContext, priorTurnContext: $m_Dbt($l0), systemReminders: $l535 }) : void 0, $l537 = $l11.serverClassifier === true && $l536 !== void 0 && $l534 && $m_zhe() && !$m_Rm($l28, $m_dA) && !$m_Fre();
    if ($l537) $m_MN($l28, $m_dA), $NEW_chunk_j0tbz6ra_js_vhn($l535, $l536?.system_reminders ?? []);
    if ($l534 && $m_AE($l28, $m_dA) && !$l524.includes($m_dA)) $l524.push($m_dA);
    $m_XTe($l530, $m_dA, $l526 === "bedrock" && $l524.includes($m_dA));
    let $l538 = Math.min($l522?.maxTokensOverride || $l11.maxOutputTokensOverride || $l31.maxOutputTokens, $l31.maxOutputTokens), $l539 = $m_a.CLAUDE_CODE_DISABLE_THINKING, $l540 = $l35.type !== "disabled" && !$l539, $l541 = () => $l31.thinking.rejectsDisabled || $l33 !== void 0 && $m_tHe($l33), $l542 = $l540 && $m_rEr($l26) && !$m_Rm($l28, $NEW_chunk_at88wjsn_js_D5o) && ($l390 === "idle" || $l390 === "withoutUpdates"), $l543 = !$l542 ? void 0 : $l35.display === "highlights" && $m_lbn() ? "omitted" : $l35.display, $l544 = void 0;
    if ($l540 && $l31.thinking.supported) if ($m_AQe({ runtimeOverride: $m_IKe($l11.model), resolvedModel: $l26, canonicalModel: $l30 }) === "adaptive") $l544 = { type: "adaptive", display: $l543 };
    else {
      let $l545 = $m_Sqs($l26);
      if ($l35.type === "enabled" && $l35.budgetTokens !== void 0) $l545 = $l35.budgetTokens;
      $l545 = Math.max(1024, Math.min($l538 - 1, $l545)), $l544 = { budget_tokens: $l545, type: "enabled", display: $l543 };
    }
    else if ($l35.type === "disabled" && $m_J$r() === "firstParty" && !$l539 && $l31.thinking.supported && !$l541()) $l544 = { type: "disabled" };
    let $l546;
    if ($l321) {
      if (!$l524.includes($m_NW)) $l524.push($m_NW);
      if ($m_XTe($l530, $m_NW, $l526 === "bedrock"), $l320 !== void 0 && ($l544?.type === "adaptive" || $l544?.type === "enabled") && !("thinking" in $l530)) $l544 = { ...$l544, block_binding: { prefix_mismatch_behavior: $l320 } }, $l546 = $l320;
    }
    let $l547 = $l35.type === "disabled" ? void 0 : $l35, $l548 = $l547?.display, $l549 = "none";
    try {
      $l549 = $m_Hun($l548, $l547?.displayExplicit ?? $m_Ptt());
    } catch ($l550) {
      $m_l($l550);
    }
    let $l551 = () => {
      let $l552 = $l524.indexOf($m_Npn);
      if ($l552 !== -1) $l524.splice($l552, 1);
    };
    if ($l544 && $l543) $l551();
    switch ($l549) {
      case "thinking_and_connector_text":
      case "none":
        break;
      case "connector_text": {
        if (($l544?.type === "adaptive" || $l544?.type === "enabled") && $l542 && !("thinking" in $l530) && !$m_Rm($l28, $m_yne) && $l390 === "idle" && !$m_a.CLAUDE_CODE_SIMULATE_PROXY_USAGE) {
          if ($l544 = { ...$l544, display: "updates" }, !$l524.includes($m_yne)) $l524.push($m_yne);
          $m_XTe($l530, $m_yne, $l526 === "bedrock"), $l551();
        }
        break;
      }
    }
    if ($m_MQe($l26) && !$l524.includes($m_c7e)) $l524.push($m_c7e);
    let $l553 = $l544?.type === "enabled" || $l544?.type === "adaptive" || $l544 === void 0 && $l541(), $l554 = $l11.toolChoice;
    if ($l554?.type === "tool" && $l553) $m_t(`tool_choice {type:'tool', name:'${$l554.name}'} demoted to auto: extended thinking is active`), $l554 = { type: "auto" };
    let $l555 = $l35.type === "disabled" && $l35.mechanical === true;
    if ($l544?.type === "disabled" && ($l555 || $l31.thinking.capsEffortWhenDisabled) && typeof $l531.effort === "string" && $m_WDr($l531.effort)) {
      if (!$l517) $l517 = true, $m_t(`output_config.effort '${$l531.effort}' clamped to '${$m_Fgt}': thinking is ${$l555 ? "mechanically " : ""}disabled for this request, and this model rejects higher effort when thinking is disabled`);
      if (!$l555 && $m_rs($l11.querySource) === "main" && $m_qs().once("effort_thinking_disabled_clamp")) $m_i("tengu_effort_clamped_thinking_disabled", { from: $m_h($l531.effort), to: $m_h($m_Fgt), query_source: $m_os($l11.querySource) });
      $l531.effort = $m_Fgt;
    }
    let $l556 = $m_d4t({ hasThinking: $l540, toolClearing: $l430?.edit }), $l557 = $l11.enablePromptCaching ?? $m_gie($l33 ?? $l522.model), $l558;
    if ($m_jo() && $l13(() => $m_Vx()) && !$m_AGe() && $l13(() => $m_sh($l34)) && !!$l522.fastMode && !$m_lun($l522.model)) $l558 = "fast";
    if ($l309 && !$l524.includes($m_Lpn)) $l524.push($m_Lpn);
    if ($m_zB && $l303 && $NEW_chunk_ajtyjx88_js_E4o() && $l27 && !$l524.includes($m_zB)) {
      if ($l524.push($m_zB), $m__8n()) $m_t(`auto-mode 3P: sending afk-mode beta '${$m_zB.header}' to ${$l526} via betas header`);
    }
    if ($l285 === "1h" && $m_Py() && !$l524.includes($m_g1t)) $l524.push($m_g1t);
    let $l559 = null, $l560 = $l326?.buildRequestParams($l236);
    if ($l560) $l524.push($l560.beta), $l559 = $l560.body;
    let $l561 = null;
    if ($m_AE($l28, $m_d7e) && $l557) {
      if (!$l524.includes($m_d7e)) $l524.push($m_d7e);
      $l561 = { cache_control: { type: "ephemeral", ...$l286 && { ttl: $l286 }, evict_on_complete: true } };
    }
    if ($l310() && !$l524.includes($m_H_t)) $l524.push($m_H_t);
    if ($l311 && !$l524.includes($m_ZI)) $l524.push($m_ZI);
    let $l562 = $m_a.CLAUDE_CODE_SIMULATE_PROXY_USAGE, $l563 = $l186 && $l294 && !$l562 && $m_vFr($l524).includes($m_B2), $l564 = $l340 !== null && !$l562 ? $l340.plan($l236, $l563) : null, $l565 = $m_$W !== null && ($m_Rm($l28, $m_$W) || $l407 !== "idle"), $l566 = $l565 ? null : $l564;
    if ($m_$W !== null) {
      if ($l566 !== null) $m_MN($l28, $m_$W);
      if ($l565) {
        for (let $l567 = $l524.length - 1; $l567 >= 0; $l567--) if ($l524[$l567] === $m_$W) $l524.splice($l567, 1);
      } else if (($l566 !== null || $m_AE($l28, $m_$W)) && !$l524.includes($m_$W)) $l524.push($m_$W);
    }
    let $l568 = $l562 ? $l524.filter(($l569) => $l569 === $m_gTe) : $l524;
    if ($l562) $m_t(`[API:client] SIMULATE_PROXY_USAGE: stripping ${$l524.length - $l568.length} beta headers from request (keeping ${$m_mN($l568).join(", ") || "none"}): ${$m_mN($l524).join(", ")}`);
    let $l570 = !$l540 && $l31.acceptsTemperature ? $l11.temperatureOverride ?? 1 : void 0;
    $l342 = $m_mN($l568), $l468 = $l568.includes($m_vv) || $l528.includes($m_vv), $l392 = $l544 !== void 0 && "display" in $l544 && !("thinking" in $l530) ? $l544.display ?? void 0 : void 0, $l493 = $l544 !== void 0 && "block_binding" in $l544, $l494 = $l546;
    let $l571 = $m_vFr($l568), $l572 = $l294 && (!$l562 || $l568.length > 0) && $m_mN($l571).length > 0;
    $l465 = $l563, $l409 = false;
    let $l573 = $l572 && ($l571.includes($m_KB) || $m_tw !== null && $l571.includes($m_tw));
    $l500 = $l573 && $m_gZ($l236);
    let $l574 = $l572 && ($l533.fallbacks === "default" ? $m_tw !== null && $l571.includes($m_tw) : $l571.includes($m_KB)) ? $l533 : {};
    if ($l498 = $l574.fallbacks !== void 0, $l499 = $l574.fallbacks === "default" ? "default" : $l498 ? "explicit" : "none", !$l573 && $m_gZ($l236)) $l166 = "error_recovery", $l167 = false;
    let $l575 = false;
    $l464 = $l575;
    let $l576 = [];
    $l266 = void 0;
    let $l577 = $l557 && !$l11.skipMessageCacheMarkers, $l578 = !$l562 && $l561 !== null || $l530.cache_control != null, $l579 = $l247($l236, $l573, $l575), $l580 = $l523 && $l264 === "idle" ? $m_tfn({ querySource: $l11.querySource, model: $l33 ?? $l522.model, isKeepaliveHeaderOnWire: $l572 && $l571.includes($m_ZI), hasSecondMarkerSlot: $l577 && !$l578 && $l11.divergesAtMessageId === void 0, messages: $l579 }) : void 0, $l581 = $l165 = $m_Xfr($l579, $l577, $l286, $l11.skipCacheWrite, $l11.forkPointUuid, $m_Rm($l28, $NEW_chunk_at88wjsn_js_Rrr) || $m_L5o(), $l526, $l566 !== null, $l578, $l563, $l576, $l11.divergesAtMessageId, { skipMessageCacheMarkers: $l11.skipMessageCacheMarkers === true, report: ($l582) => {
      $l266 = $l582;
    } }, $m_Kcn($l11.querySource, $l11.skipCacheWrite === true), $l523, $l580);
    $l433 = $l576.some(($l583, $l584) => $l583 !== $l584) ? $l576 : [];
    let $l585 = ($l586) => Array.isArray($l586.content) && $l586.content.some(($l587) => typeof $l587 === "object" && $l587 !== null && "cache_control" in $l587 && $l587.cache_control != null);
    $l262 = $l581.some(($l588) => $l588.role === "system" && $l585($l588)), $l265 = $l581.some($l585);
    let $l589 = $l580?.isMarkWanted === true ? $l581.findLastIndex($l585) : -1;
    if ($l263 = $l589 > 0 && $l581.some(($l590, $l591) => {
      let $l592 = $l590.role;
      return $l591 < $l589 && $l592 === "system" && $l585($l590);
    }), $l454 = $l537 && $l294 && !$l562 && $m_vFr($l568).includes($m_dA), $l523) {
      if ($l455 !== void 0) $m_Bqe($l455);
      if ($l455 = $l454 ? $NEW_chunk_j0tbz6ra_js_vYt($NEW_chunk_j0tbz6ra_js_jee(), { artifacts: $l536?.artifacts, thread: $l566 !== null, exactMcpAllowRules: $l536 && $NEW_chunk_j0tbz6ra_js_CYt($l536), agentId: $l11.agentId }) : void 0, $l455 !== void 0 && $l536 !== void 0) $m_xbt($l455.key, $m_Wcn($l536));
    }
    let $l593 = $m_tzs($l296, $l11.model);
    $l593 = $m_YYt($l593, $l28);
    let $l594 = $l340 !== null ? $l340.shapeInheritedFields($l566, { system: $l293, tools: $l593 }) : { system: $l293, tools: $l593 };
    $l173 = $l293, $l170 = $l593, $l174 = $l594.system !== $l293, $l437 = $l566 !== null;
    let $l595 = { model: $m_fC($l11.model), messages: $l566 !== null && $l566.sliceFrom > 0 ? $l581.slice($l576[$l566.sliceFrom]) : $l581, system: $l594.system, ...$l594.tools !== void 0 && { tools: $l594.tools }, tool_choice: $l554, ...$l572 && $m_CHe($l571), metadata: $m_yBe({ agentContext: $l11.agentContext }), max_tokens: $l538, thinking: $l544, ...$l570 !== void 0 && { temperature: $l570 }, ...$l556 && $l294 && $l524.includes($m_dde) && { context_management: $l556 }, ...$l454 && $l536 !== void 0 && { safeguards: [{ type: $m_$he, classifier_context: $l536 }] }, ...!$l562 && $l559 ? $l559 : {}, ...!$l562 && $l561 ? $l561 : {}, ...$l574, ...$l530, ...{}, ...Object.keys($l531).length > 0 && { output_config: $l531 }, ...$l558 !== void 0 && { speed: $l558 }, ...$l566 !== null && { thread: $l566.thread }, ...$l310() && ($l27 || $l11.forkPointUuid !== void 0) && $l294 && !$l562 && { diagnostics: { previous_message_id: $l25 ?? null } } };
    $l432 = $l430 !== void 0 && $l595.context_management === $l556, $l409 = $l563 && $l595.messages.some(($l596) => $l596.clear_at !== void 0);
    let $l597 = $m_gfr($l595.thinking, $l11.querySource, !$l515);
    if ($l597 !== $l595.thinking) $l515 = true, $l595.thinking = $l597;
    {
      let $l598 = $l595.thinking;
      $l495 = $l598?.type === "adaptive" || $l598?.type === "enabled" ? $l598.type : "disabled", $l492 = $m_Nfn($l598);
    }
    if ($l523 && $m_eer($l595)) {
      try {
        $l595 = $m_qd($l595);
      } catch {
      }
      if ($m_pKe($l595), !$l516) $l516 = true, $m_i("tengu_lone_surrogate_sanitized", { source: $m_b("queryModel") });
    }
    let $l599 = $l595.output_config?.effort;
    $l327 = typeof $l599 === "string" && $m_VS($l599) ? $l599 : void 0, $l328 = null, $l329 = void 0;
    for (let $l600 of $l236) if ($l600.type === "user") $l329 = void 0;
    else if ($l600.type === "api_system" && $l600.outputConfig !== void 0) $l328 = $l600.outputConfig.effort ?? $l328, $l329 = $l600.outputConfig.timing?.now;
    return $l595;
  };
  {
    let $l601 = $l518({ model: $l11.model }, false), $l602 = $l236.length, $l603 = $l294 ? $l601.betas ?? [] : [], $l604 = $l601.thinking?.type ?? "disabled", $l605 = $l494, $l606 = $l190;
    $l11.getToolPermissionContext().then(($l607) => {
      $m_mfn({ model: $l11.model, messagesLength: $l602, temperature: $l11.temperatureOverride ?? 1, betas: $l603, permissionMode: $l607.mode, proactivityLevel: $l11.proactivityLevel, querySource: $l11.querySource, messageClientPlatform: $l11.messageClientPlatform, queryTracking: $l11.queryTracking, thinkingType: $l604, thinkingPrefixMismatchBehavior: $l605, effortValue: $l606, fastMode: $l302, previousRequestId: $l19 });
    });
  }
  let $l608 = [], $l609 = 0, $l610, $l611 = 0, $l612 = 0, $l613 = 0, $l614 = false, $l615, $l291 = 0, $l360 = void 0, $l616 = [], $l292 = $m_em, $l617 = null, $l618 = 0, $l619 = null, $l620 = false, $l621 = "none";
  function $l622() {
    if ($l621 === "credited") return;
    $l621 = "credited", $l618 += $m_i3e($m_Hke($l26, $l292), $l292, $l11.model, $l11.querySource, $l190, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool);
  }
  let $l623 = false, $l624 = false, $l625, $l626 = 0, $l627 = void 0, $l628 = void 0, $l629, $l630 = $l302, $l631 = false, $l632 = $m_uf($l11.agentContext) && $l11.querySource.startsWith("repl_main_thread"), $l633 = void 0, $l634 = /* @__PURE__ */ new Map(), $l635 = 3, $l636 = { value: 0 }, $l637 = $l635, $l638 = /* @__PURE__ */ new Map(), $l639 = false, $l640 = false, $l641, $l642 = { count: 0 }, $l643 = $m_wJe(), $l644 = $NEW_chunk_j0tbz6ra_js_Fkn({ maxRetries: $l643, maxSleptThrough: $m_Amn($l643), maxReconnects: $NEW_chunk_j0tbz6ra_js_Ikn($l11.querySource), maxOverloaded: $m_dZ, maxOutputFiltered: $m_Pmn(), hasFallbackModel: Boolean($l11.fallbackModel), persistent: $m_G6(), persistentCapacityOnly: $m_G6() && !$NEW_chunk_j0tbz6ra_js_zb(), background: !$m_Dke($l11.querySource) }, $l11.apiAttemptsLeft), $l645 = false, $l646 = null, $l647 = false, $l648 = ($l649, $l650) => {
    if ($l646 = null, $l647 = $m_sa(), $l645) {
      if ($l647) $l649[$m_fy] = $m_qb, $l646 = $m_h($m_qb), $m_t(`[dispatch] sent ${$m_fy}=${$m_qb}`);
      return;
    }
    if (!$l650 && $l647) {
      let $l651 = $m_UJe($m_rs($l11.querySource));
      if ($l651 !== null) $l649[$m_fy] = $l651, $l646 = $m_h($l651), $m_t(`[dispatch] sent ${$m_fy}=${$l651}`);
    }
  }, $l652 = async ($l653) => {
    if ($l645) return;
    let $l654 = $l653 instanceof $m_Ot ? $l653.status : void 0, $l655 = $l654 !== void 0 && $l654 >= 500, $l656 = $l653 instanceof $m_Zu;
    if (!($l646 !== null ? $l655 || $l656 : $l647 && $l654 === 503)) return;
    if ($l645 = true, $m_t(`[dispatch] ${$l655 ? `HTTP ${$l654}` : "connection error"} with ${$l646 === null ? `no ${$m_fy}` : `${$m_fy}=${$l646}`}; retrying once with ${$m_fy}=${$m_qb}`, { level: "warn" }), $m_i("tengu_dispatch_header_fallback", { model: $m_Et($l11.model), dispatch: $l646 ?? $m_b("none"), resend_dispatch: $m_h($m_qb), reason: $l646 === null ? $m_M1r($l653) : $l655 ? $m_b("5xx") : $m_b("conn_err"), status: $l654 !== void 0 ? $m_Vr($l654) : $m_b("none"), query_source: $m_os($l11.querySource), request_id: $m_ye($l653 instanceof $m_Ot ? $l653.requestID : void 0) }), $l646 === null) {
      let $l657 = $m_H1r($l653);
      if ($l657 > 0) await $m_Y($l657, $l4, { clock: $l12 });
    }
    return "retry:dispatch-header-strip";
  }, $l658 = false, $l659 = false, $l660 = false, $l661, $l662 = ($l663, $l664) => {
    if (!($l663 instanceof $m_Ot) || $l663.status !== 400) return;
    let $l665 = $l663.message.includes("`fallback-credit-"), $l666 = $m_tw !== null && $l663.message.includes(`\`${$m_tw.header}`), $l667 = ($m_tw !== null ? new RegExp(`\`server-side-fallback-(?!${$m_tw.header.slice(21)})`) : /`server-side-fallback-/).test($l663.message), $l668 = ($l669) => {
      $m_t(`[server-fallback] 400 attributed (${$l669}) \u2014 stripping and retrying`, { level: "warn" });
      let $l670 = $l499;
      $m_i("tengu_rotunda_pennant_strip", { shape: $m_h($l669), mode: $m_h($l670), non_streaming: $l664 === "sync", query_source: $m_os($l11.querySource), sticky_scope: $l11.stickyBetas === void 0 ? $m_b("session") : $m_rs($l11.querySource) === "main" ? $m_b("detached_main") : $m_rs($l11.querySource) === "subagent" ? $m_b("agent") : $m_b("aux") });
    }, $l671 = $m_jVe($l663);
    if ($l671 !== void 0 && !$l414) {
      if ($l414 = true, $l502 = void 0, $l671 === "credit_beta_header") {
        if ($m_Dg($l28, $m_LW), $l666 && $m_tw !== null) $m_Dg($l28, $m_tw), $l501 = true;
        if ($l667) $m_Dg($l28, $m_KB), $l658 = true;
        if ($l666 && $l500 && !$m_Rm($l28, $m_KB)) $m_MN($l28, $m_KB);
      }
      if ($l664 === "stream") $l510($l671, $l663.requestID ?? null, null);
      return $l668($l671), "retry:fallback-credit-strip";
    }
    let $l672 = $m_UVe($l663);
    if ($m_tw !== null && ($l672 === "category_beta_header" || $l672 === "default_unconfigured" && $l498) && !$l501) {
      if ($l501 = true, $m_Dg($l28, $m_tw), $l665) $m_Dg($l28, $m_LW), $l414 = true, $l502 = void 0;
      if ($l667) $m_Dg($l28, $m_KB), $l658 = true;
      if ($l500 && !$m_Rm($l28, $m_KB)) $m_MN($l28, $m_KB);
      return $l668($l672), "retry:server-fallback-category-strip";
    }
    if ($l672 !== void 0 && ($l498 || $l672 === "beta_header") && !$l658) {
      if ($l658 = true, $m_Dg($l28, $m_KB), $l672 === "beta_header" && $l665) $m_Dg($l28, $m_LW), $l414 = true, $l502 = void 0;
      return $l668($l672), "retry:server-fallback-strip";
    }
    if ($m_Y7($l663)) return;
    if ($m_VC($l663)) return;
    if ($m_BH($l663) || $m__K($l663)) return;
    if ($m_rK($l663)) return;
    if ($m_Y_e($l663)) return;
    if ($m_jTe($l663) || $m_UTe($l663) !== void 0) return;
    if ($l354($l663)) {
      if ($l664 === "stream" && $l505 && !$l414) $l502 = $l11.fallbackCreditCode;
      return;
    }
    if ($l11.resumeIncompleteThinking) return;
    if ($l664 === "sync" && $l364($l663)) return;
    if ($l671 === void 0 && $l672 === void 0) {
      let $l673 = $l403($l663);
      if ($l673 !== void 0) return $l673;
      let $l674 = $l420($l663);
      if ($l674 !== void 0) return $l674;
      let $l675 = $l676($l663);
      if ($l675 !== void 0) return $l675;
    }
    if ($l664 === "stream" && $l413 && !$l414) return $l414 = true, $l510("unattributed_400_dropped", $l663.requestID ?? null, null), $l668("unattributed"), "retry:fallback-credit-unattributed";
    if (($l498 || $l500) && !$l658) {
      if ($l658 = true, $m_Dg($l28, $m_KB), $m_tw !== null) $m_Dg($l28, $m_tw);
      return $l668("unattributed"), "retry:server-fallback-strip";
    }
    if ($l507 && !$l506) return $l506 = true, $m_Dg($l28, $m_LW), $l344.push($m_LW), $l668("unattributed"), "retry:fallback-credit-header-strip";
    return;
  }, $l364 = ($l677) => $m_ODt($l11.model, $l677) === "refused" || $m_oke($l677) || $m_DVe($l677) || $m_LVe($l677) || $m_BH($l677) || $m__K($l677) || $m_J_e($l677) !== void 0 || $NEW_chunk_j0tbz6ra_js_R6e($l677, $m_mN($NEW_chunk_j0tbz6ra_js_E6e)).length > 0 || $NEW_chunk_j0tbz6ra_js_b6e($l677) || $NEW_chunk_j0tbz6ra_js_w6e($l677) || $m_$Ve($l677) || $m_gke($l677) !== null || $m_eM($l677) || $m_VC($l677) || $NEW_chunk_j0tbz6ra_js_w8t($l677) || $NEW_chunk_j0tbz6ra_js_T8t($l677) || $m_WVe($l677) || $m_mke($l677) || $m_GVe($l677) || $m_wK($l677) || $m_CK($l677), $l678 = () => {
    if ($l87 === "tool_search") return;
    try {
      let $l679 = 0;
      if ($l87 === void 0) $l296 = $l296.slice();
      else $l296 = $l296.flatMap(($l680) => {
        if (!("input_schema" in $l680)) return [$l680];
        if (!$l3.some(($l681) => $m_Ct($l681, $l680.name))) return [];
        if ($l680.defer_loading !== true) return [$l680];
        $l679++;
        let { defer_loading: $l682, ...$l683 } = $l680;
        return [$l683];
      });
      let $l684 = new Set($l296.flatMap(($l685) => "name" in $l685 ? [$l685.name] : [])), $l686 = new Map($l3.map(($l687, $l688) => [$l687.name, $l688]));
      for (let $l689 of $l132) {
        if (!("name" in $l689) || $l684.has($l689.name)) continue;
        let $l690 = $l686.get($l689.name) ?? 1 / 0, $l691 = $l296.findIndex(($l692) => !("input_schema" in $l692) || ($l686.get($l692.name) ?? -1) > $l690);
        if ($l691 === -1) $l691 = $l296.length;
        $l296.splice($l691, 0, $l689), $l684.add($l689.name), $l679++;
      }
      if ($l87 === "tool_addition") $l159?.splice(0, $l159.length), $m_Wzr($l28), $m_qwt($l28);
      else if ($l679 === 0) return;
      else {
        let $l693 = $l88.slice();
        for (let $l694 of $l3) {
          if (!$l684.has($l694.name) || !$l59.has($l694.name)) continue;
          let $l695 = $l686.get($l694.name) ?? 1 / 0, $l696 = $l693.findIndex(($l697) => ($l686.get($l697.name) ?? -1) > $l695);
          if ($l696 === -1) $l696 = $l693.length;
          $l693.splice($l696, 0, $l694);
        }
        $l89 = $m_jTo($l28, false, () => $m_WTo($m_A5($l693), $l3, $l121 ?? $l89?.recordedOnly));
      }
      $l166 = "error_recovery", $l167 = false, $m_t(`[late-tool-additions] no ToolSearch on this request: ${$l679} late tool(s) go inline from this request on`, { level: "warn" });
    } catch ($l698) {
      $m_l($m_U($l698));
    }
  }, $l699 = () => {
    let $l700 = $l260;
    if ($l700) $l260 = () => $m_fZ($m_zb($l700()));
    let $l701 = $l259;
    if ($l701) $l259 = () => $m_fZ($m_zb($l701()));
    let $l702 = $l261;
    if ($l702) $l261 = () => $m_fZ($m_zb($l702()));
  }, $l703 = () => {
    let $l704 = $l260;
    if ($l704) $l260 = () => $m_zb($l704());
    let $l705 = $l259;
    if ($l705) $l259 = () => $m_zb($l705());
    let $l706 = $l261;
    if ($l706) $l261 = () => $m_zb($l706());
  }, $l707 = () => {
    if (!$m_qk()) $l29 = $l29.filter(($l708) => $l708 !== $m_h1t);
  }, $l709 = false, $l710 = ($l711) => {
    if ($l709 || !$m_LVe($l711)) return;
    let $l712 = ($l713) => !("input_schema" in $l713) && "name" in $l713 && $l713.name === $m_iIe, $l714 = $l296.some($l712), $l715 = $l342.includes($m_h1t.header) && $m_lke($l711);
    if (!$l714 && !$l715) return;
    $l709 = true;
    try {
      if ($l714) $l296 = $l296.filter(($l716) => !$l712($l716)), $l236 = $l255($m_fZ($m_zb($l236)), "error_recovery"), $l699(), $l166 = "error_recovery", $l167 = false;
      $l28.advisorHeld = { model: void 0, viaToolChange: $l28.advisorHeld?.viaToolChange ?? false, refused: true };
      let $l717 = $m_C6t($l711);
      if ($l717 === "process") $NEW_chunk_6h7ejyet_js_S1s();
      else if ($l717 === "host") $m_Pxs();
      $l707(), $m_t(`[advisor] the server refused the advisor ${$l715 ? "beta header" : "entry"} (scope: ${$l717}); retrying once without the advisor`, { level: "warn" }), $m_i("tengu_advisor_entry_refused_retry", { query_source: $m_os($l11.querySource), organization_wide: $l717 === "process", host_wide: $l717 === "host", beta_header_refused: $l715 });
    } catch ($l718) {
      $m_l($m_U($l718));
    }
    return "retry:advisor-entry-refused";
  }, $l719 = new $m_iVe($l28), $l720 = ($l721) => {
    try {
      let $l722 = $l719.resolve($l721, $l170, $l3, $l11.querySource);
      if ($l722 !== void 0) $l166 = "error_recovery", $l167 = false;
      return $l722;
    } catch ($l723) {
      $m_l($m_U($l723));
      return;
    }
  }, $l724 = ($l725) => {
    return;
  }, $l726 = "idle", $l676 = ($l727) => {
    return;
  }, $l728 = () => {
    try {
      let $l729 = false, $l730 = $l11.advisorActive !== false;
      if ($l296 = $l296.flatMap(($l731) => {
        if ("input_schema" in $l731 || !("defer_loading" in $l731) || $l731.defer_loading !== true || $l731.name !== $m_iIe) return [$l731];
        if ($l729 = true, !$l730) return [];
        let { defer_loading: $l732, ...$l733 } = $l731;
        return [$l733];
      }), $l729) {
        if (!$l730) $l236 = $l255($m_fZ($m_zb($l236)), "error_recovery"), $l699(), $l707();
        if ($l730 && $l28.advisorHeld?.viaToolChange === true) $l28.advisorHeld = { ...$l28.advisorHeld, inFallback: true };
        $l166 = "error_recovery", $l167 = false;
      }
    } catch ($l734) {
      $m_l($m_U($l734));
    }
  }, $l735 = () => {
    let $l736 = $l260;
    if ($l736) $l260 = () => $m_L2($l736()).messages;
    let $l737 = $l259;
    if ($l737) $l259 = () => $m_L2($l737()).messages;
    let $l738 = $l261;
    if ($l738) $l261 = () => $m_L2($l738()).messages;
  }, $l739 = ($l740, $l741) => {
    if (!$m_BH($l740)) return;
    let { messages: $l742, removed: $l743 } = $m_L2($l236);
    if ($l742 === $l236) return;
    return $l236 = $l255($l742, "error_recovery"), $m_E7s($l28), $l735(), $m_t(`[web-search-strip] The API could not decrypt web search content in this conversation's history: removed ${$l743.toolUses} ${$m_I($l743.toolUses, "search call")}, ${$l743.results} ${$m_I($l743.results, "result block")} and ${$l743.citations} ${$m_I($l743.citations, "citation")} from the request; retrying once. Later requests in this conversation leave them out too.`, { level: "warn" }), $m_dn("api_request", "api_request_web_search_stripped", { query_source: $m_os($l11.querySource), transport: $m_h($l741), tool_uses: $l743.toolUses, results: $l743.results, citations: $l743.citations, placeholders: $l743.placeholders }), "retry:web-search-strip";
  }, $l744, $l745 = ($l746) => {
    let $l747 = $m_Gzr($l28, $l34);
    if (!$m_a6t($l746) || $l747?.gaveUp) return;
    try {
      let $l748 = $m_Pfr($l236), $l749 = Math.min($l748, $l744?.limit ?? 1 / 0), $l750 = $NEW_chunk_dc0nzty2_js_iui.find(($l751) => $l751 < $l749);
      if ($l750 === void 0) {
        if ($l744 !== void 0) {
          let { steps: $l752, refusedAt: $l753 } = $l744;
          $l744 = void 0, $m_zzr($l28, { model: $l34, limit: $l747?.limit, gaveUp: true }), $m_t(`[media-item-limit] The model still refuses this request as unprocessable with ${$l748} images and documents left. Not removing any more.`, { level: "warn" }), $m_dn("api_request", "api_request_media_limit_gave_up", { query_source: $m_os($l11.querySource), media_items_refused: $l753, steps: $l752 });
        }
        return;
      }
      let $l754 = ($l755) => $m_sgn($l755, $l750, $m_EKo);
      $l236 = $l255($l754($l236), "error_recovery");
      let $l756 = $l260;
      if ($l756) $l260 = () => $l754($l756());
      let $l757 = $l259;
      if ($l757) $l259 = () => $l754($l757());
      let $l758 = $l261;
      if ($l758) $l261 = () => $l754($l758());
      return $l744 = { limit: $l750, steps: ($l744?.steps ?? 0) + 1, refusedAt: $l744?.refusedAt ?? $l748 }, $m_t(`[media-item-limit] The model refused this request as unprocessable. It held ${$l748} images and documents; the oldest were removed to fit a limit of ${$l750}, and it is being sent again. If it is answered, this conversation keeps that limit.`, { level: "warn" }), `retry:media-item-limit:${$l750}`;
    } catch ($l759) {
      $m_l($m_U($l759));
      return;
    }
  }, $l760 = () => {
    try {
      let $l761 = $m_Gzr($l28, $l34);
      if ($l744 === void 0) {
        if ($l761?.gaveUp && $l761.limit === void 0) $m_Ywt($l28);
        else if ($l761?.gaveUp) $m_zzr($l28, { ...$l761, gaveUp: false });
        return;
      }
      let { limit: $l762, steps: $l763, refusedAt: $l764 } = $l744;
      $l744 = void 0, $m_zzr($l28, { model: $l34, limit: Math.min($l762, $l761?.limit ?? 1 / 0), gaveUp: false }), $m_dn("api_request", "api_request_media_limit_lowered", { query_source: $m_os($l11.querySource), media_items_refused: $l764, media_item_limit: $l762, steps: $l763 });
    } catch ($l765) {
      $m_l($m_U($l765));
    }
  }, $l766 = ($l767) => {
    {
      let $l768 = $l767 instanceof $m_Ot && $l767.status === 400;
      if ($l264 === "retrying") {
        if ($l768) $l264 = "spent";
        return;
      }
      if ($l264 === "idle" && $l263 && $l768 && $l767.message.includes("cache_control")) return $l264 = "retrying", "retry:prompt-end-mark";
    }
    return;
  }, $l769 = () => {
    if ($l264 !== "retrying") return;
    if ($l264 = "spent", $l33 !== void 0) return;
    try {
      $m_e3o(), $m_t("[cache-breakpoints] a side request that marked a system message before its last marker drew a 400 that names cache_control, and went through without that marker; no later side request carries it", { level: "warn" }), $m_dn("api_prompt_end_mark", "server_rejected");
    } catch ($l770) {
      $m_l($l770);
    }
  }, $l386 = ($l771, $l772 = false) => {
    let $l773 = $l29.includes($m_Ib) && !$m_VC($l771) && $m_pke($l771) !== "header_rejected" ? $m_fke($l771) : void 0;
    if ($l773 !== void 0) {
      if ($l261) {
        let $l774 = $l261();
        if ($l236 = $l255(!$l29.includes($m_DW) ? $m_ETe($l774) : !$l29.includes($m_P4) ? $m_CTe($l774) : $l774, "error_recovery"), $l239 = $l243, $m_i4o($l28, $l60), $l87 === void 0) $l678();
      }
      return $l261 = null, $l29 = $l29.filter(($l775) => $l775 !== $m_Ib), $m_VHs($l28, $l773), $l280(), $m_i("tengu_inline_tools_refused_retry", { cause: $m_h($l773) }), "retry:inline-tools-strip";
    }
    let $l776 = $l29.includes($m_hS) && !$m_VC($l771) ? $m_pke($l771) : void 0;
    if ($l776 !== void 0) {
      if ($l260) {
        let $l777 = $l260();
        $l236 = $l255(!$l29.includes($m_DW) ? $m_ETe($l777) : !$l29.includes($m_P4) ? $m_CTe($l777) : $l777, "error_recovery"), $l239 = $l243;
      }
      $l260 = null;
      let $l778 = $l29.includes($m_Ib) && $m_fke($l771) === "header_rejected";
      return $l29 = $l29.filter(($l779) => $l779 !== $m_hS && $l779 !== $m_Ib), $m_KHs($l28, $l776, $l11.model, $l778), $l280(), $l678(), $l728(), "retry:tool-change-strip";
    }
    let $l780 = $l772 || $m_VC($l771), $l781 = $m_cke($l771), $l782 = $l29.includes($m_DW) && $m_mke($l771) && !$m_wK($l771), $l783 = $l29.includes($m_P4);
    if ($l783 && $m_GVe($l771) && !$l780 && !$l782) return $l236 = $l255($m_CTe($l236), "error_recovery"), $l29 = $l29.filter(($l784) => $l784 !== $m_P4), $m_Dg($l28, $m_P4), $m_t(`[per-turn-timing] the server refused the current-time statement (${$m_awo($l771)}); leaving it out for the rest of this conversation (until /clear or /compact)`, { level: "warn" }), "retry:per-turn-timing-strip";
    if ($l259 && ($l780 || $l782)) {
      if ($l781 !== null && !$l165.some(($l785) => $l785.role === "system" && $l785.content.length > 0)) return;
      let $l786 = $m_Pyt($l28), $l787 = $l165.length, $l788 = $l236.length, $l789 = $l781 === null ? void 0 : $l781.messageIndex === void 0 ? `${$l787} messages on the wire` : $l781.messageIndex >= $l787 ? `messages[${$l781.messageIndex}], beyond the ${$l787} this request sent` : `messages[${$l781.messageIndex}] of ${$l787} on the wire; conversation entry ${$l434($l781.messageIndex) ?? "none of ours (a clear_at reminder slot)"} of ${$l788}`;
      if ($l236 = $l255($l780 ? $l259() : $m_ETe($l236), "error_recovery"), $l259 = null, $l783) $l29 = $l29.filter(($l790) => $l790 !== $m_P4);
      if ($l780) {
        if ($l239 = $l243, $l29 = $l29.filter(($l791) => $l791 !== $m_eP && $l791 !== $m_DW && $l791 !== $m_hS && $l791 !== $m_Ib && $l791 !== $m_B2), $m_Dg($l28, $m_eP), $m_VTo($l28), $l280(), $l678(), $l728(), $l260 !== null) $m_dn("mcp_late_tool_additions", "rejected_with_mid_conv_system"), $l260 = null;
      }
      if ($l782) {
        if ($l29 = $l29.filter(($l792) => $l792 !== $m_DW), $l39($m_DW, $m_L6t($l771)), $l328 !== null) $m_dn("api_per_turn_effort", "server_rejected");
      }
      if ($l11.stickyBetas === void 0) $m_rZ($l28, $l786);
      return $m_t($l789 !== void 0 ? `[mid-conv-system] API refused where a system message sits (${$l789}) \u2014 retrying once without system messages; off for this conversation until /clear or /compact` : $l782 ? "[per-turn-control] server rejected the per-turn statements \u2014 resending without them" : $l772 ? "[mid-conv-system] an HTTP 400 or 422 that nothing else recognises answered a request on which system turns were enabled; guessing the platform refuses them and resending without system messages; if that goes through they stay off until /clear or /compact" : '[mid-conv-system] server rejected role:"system" \u2014 falling back to a body with no {role:"system"} turn, sticky-rejecting the beta until /clear or /compact', { level: "warn" }), $m_i("tengu_mid_conv_system_fallback_retry", { per_turn_effort: $l782, ...$l772 && { unclaimed: $l772 }, misplaced: $l781 !== null, ...$l781 !== null && { misplaced_index: $l781.messageIndex ?? -1, wire_message_count: $l787, message_count: $l788 } }), "retry:mid-conv-system";
    }
    if ($l262 && !$m_Rm($l28, $NEW_chunk_at88wjsn_js_Rrr) && $m_WVe($l771)) return $m_Dg($l28, $NEW_chunk_at88wjsn_js_Rrr), $m_N5o(), $m_t("[mid-conv-system] proxy rejected cache_control on the api_system tail \u2014 demoting the breakpoint to the trailing message for this conversation", { level: "warn" }), $m_dn("api_midconv_cache_proxy", "proxy_rejected"), "retry:api-system-cache-demote";
    return;
  }, $l793 = ($l794) => {
    if ($l262 && !$l263 && !$m_Rm($l28, $NEW_chunk_at88wjsn_js_Rrr) && !$m_Rm($l28, $NEW_chunk_at88wjsn_js_O5o)) {
      let $l795 = $l794?.input_tokens ?? 0, $l796 = $l794?.cache_read_input_tokens ?? 0, $l797 = ($l794?.cache_creation_input_tokens ?? 0) + ($l794?.cache_creation?.ephemeral_5m_input_tokens ?? 0) + ($l794?.cache_creation?.ephemeral_1h_input_tokens ?? 0), $l798 = $l795 + $l796 + $l797 > 0, $l799 = $l797 > 0 && $l795 < $NEW_chunk_j0tbz6ra_js_wkr;
      if ($l798 && !$l799) return;
      $m_Dg($l28, $NEW_chunk_at88wjsn_js_O5o), $m_NRs("api_midconv_cache_proxy");
    }
  }, $l800 = ($l801) => {
    if (!$l265 || $l11.skipCacheWrite || !$m_$fr($m_Sd($l11.model))) return;
    let $l802 = $m_lWs($m_qs().cacheCoverage, $l28, $l801);
    if ($l802.kind === "confirm") {
      $m_NRs("api_prompt_cache_coverage", { provider: $m_h($m_Sd($l11.model)) });
      return;
    }
    if ($l802.kind !== "fire") return;
    $m_t("[cache-coverage] sustained uncovered input with a cache breakpoint on the wire through a custom endpoint \u2014 no cache-billing evidence visible at the client (the endpoint may be silently stripping cache_control)", { level: "warn" }), $m_dn("api_prompt_cache_coverage", "cache_coverage_loss", { api_system_marker: $l262, consecutive_turns: $l802.consecutive, input_tokens: $l802.inputTokens, cache_read_input_tokens: $l802.cacheReadTokens, cache_creation_input_tokens: $l802.cacheCreationTokens, provider: $m_h($m_Sd($l11.model)) });
  }, $l803 = () => {
    if (!$m_V5o() && $l328 !== null) $m_q5o(), $m_NRs("api_per_turn_effort");
  }, $l804 = () => {
    if (!$m_Y5o() && $l260 !== null) $m_X5o(), $m_NRs("mcp_late_tool_additions");
    if (!$m_t3o() && $l260 !== null && $l29.includes($m_Ib) && $l236.some(($l805) => $l805.type === "api_system" && $l805.toolDefinitions !== void 0)) $m_n3o(), $m_NRs("mcp_inline_tools");
  }, $l806 = () => {
  }, $l807 = () => {
  }, $l808 = () => {
    if ($l407 === "retrying") {
      $l407 = "spent";
      try {
        if ($m_$W !== null) $m_Dg($l28, $m_$W);
        if ($l418) $NEW_chunk_j0tbz6ra_js_UZe();
        $m_i("tengu_tether_unrecognised_400", { phase: $m_b("healed"), planner_backed: $l418, query_source: $m_os($l11.querySource) }), $m_t(`[tether] a request carrying the message-threads header got an HTTP 400 that Claude Code does not recognise (request id ${$l424 ?? "unknown"}), and a later attempt without the header succeeded. ${$l418 ? "Message Threads stays off for the rest of this session." : "The header stays off for this conversation."}`, { level: "warn" });
      } catch ($l809) {
        $m_l($l809);
      }
    }
    if ($l465) $m_wpn();
    if ($l406 === "retrying") $l406 = "spent", $m_Dg($l28, $m_B2), $m_ZQe(), $l280(), $m_dn("api_kept_reminder_clear_at", "unrecognised_400"), $m_t(`[reminders] a request carrying a clear_at message got an HTTP 400 that Claude Code does not recognise (request id ${$l410 ?? "unknown"}), and the same request without clear_at succeeded. For the rest of this session earlier reminders are not re-sent, and requests that can use a Message Threads thread get no reminder.`, { level: "warn" });
  }, $l810 = ($l811) => {
    if (!$m_wK($l811)) return null;
    if ($m_sbn($l11.model), $l26 !== $l11.model) $m_sbn($l26);
    return $m_t(`[effort] the server refused effort for model ${$l11.model} (the output_config.effort field or the anthropic-beta value ${$m_l7e.header}). Sending the request again without either; this Claude Code process will not send either to this model again.`, { level: "warn" }), $m_i("tengu_effort_unsupported_retry", { model: $m_Et($l11.model) }), "retry:effort-unsupported";
  }, $l812 = ($l813) => {
    if (!$l497 || !$m_CK($l813)) return null;
    try {
      return $m_yTe($l11.model), $m_t(`[structured-outputs] model ${$l11.model} rejected output_config.format; latching unsupported and retrying without it.`, { level: "warn" }), $m_i("tengu_structured_outputs_unsupported_retry", { model: $m_Et($l11.model) }), "retry:structured-outputs-unsupported";
    } catch ($l814) {
      return $m_l($m_U($l814)), null;
    }
  }, $l815 = ($l816) => null, $l817 = ($l818) => {
    if ($l392 === "highlights" && $m_A6t($l818)) return $m_s3o(), $m_t("[thinking] server rejected thinking.display highlights; asking for omitted for the rest of this process and retrying.", { level: "warn" }), $m_i("tengu_thinking_display_highlights_rejected_retry", { model: $m_Et($l11.model) }), "retry:thinking-display-highlights";
    return null;
  }, $l383 = ($l819, $l820 = false) => {
    if (!$l321 || !$l342.includes($m_NW.header)) return null;
    let $l821 = $m_$Ve($l819) || !$m_I4() && $m_P6t($l819), $l822 = !$m_I4() && ($m_UH($l819) || $l820 && $l819 instanceof $m_Ot && $l819.status === 400 && !$l356($l819) && !$l364($l819));
    if (!$l821 && !$l822) return null;
    return $l321 = false, $l320 = void 0, $l29 = $l29.filter(($l823) => $l823 !== $m_NW), $m_Dg($l28, $m_NW), $m_t($l821 ? "[thinking] server rejected the thinking-binding-controls beta; dropping the header and the block_binding value for this conversation and retrying." : "[thinking] an HTTP 400 that does not name the thinking-binding-controls beta arrived on a request that carried it; guessing the platform refuses that beta, so retrying once without it and leaving it off for this conversation. The only loss is the API's list of the thinking blocks it dropped.", { level: "warn" }), $m_i("tengu_thinking_binding_rejected_retry", { model: $m_Et($l11.model) }), "retry:thinking-binding-controls";
  }, $l824 = ($l825) => {
    if (!$l342.includes($m_JJ.header)) return null;
    if ($l343() || !$m_UH($l825)) return null;
    return $l29 = $l29.filter(($l826) => $l826 !== $m_JJ), $m_Dg($l28, $m_JJ), $l344.push($m_JJ), $m_t("[thinking-token-count] server rejected the beta; dropping it for this conversation and retrying.", { level: "warn" }), $m_i("tengu_thinking_token_count_rejected_retry", { model: $m_Et($l11.model), provider: $m_gA(), unnamed: true }), "retry:thinking-token-count-beta";
  }, $l827 = ($l828) => {
    try {
      let $l829 = $NEW_chunk_j0tbz6ra_js_R6e($l828, $l342);
      if ($l829.length === 0) return;
      let $l830 = new Set($l829);
      $l29 = $l29.filter(($l831) => !$l830.has($l831));
      for (let $l832 of $l829) $l39($l832, $m_uke($l828, $l832)), $m_i("tengu_beta_400_healed", { beta: $m_tde([$l832.header]), model: $m_Et($l11.model), provider: $m_gA(), status: $l828 instanceof $m_Ot ? $l828.status : void 0 });
      return `retry:beta-rejected:${$l829.map(($l833) => $l833.name).join(",")}`;
    } catch ($l834) {
      $m_l($l834);
      return;
    }
  }, $l835 = ($l836) => {
    if (!($l836 instanceof $m_Ot) || $l836.status !== 400) return null;
    try {
      let $l837 = $m_dke($l836), $l838 = !$l837 && $m_UH($l836);
      if ($l466 === "spent") return null;
      if ($l466 !== "idle") return $l466 = $l466 === "guessing" && $l838 ? "spent" : "unproven", $m_t(`[betas] the resend without ${$m_vv.header} also got an HTTP 400, so the backend is not recorded as rejecting it; ${$l466 === "spent" ? 'both said "invalid beta flag", so it is sent again from the next attempt' : "it stays off for the remaining attempts of this request and is sent again on the next request"}`, { level: "warn" }), null;
      if (!$l468 || $m_zge($m_Sd($l11.model)) || !($l837 || $l838 && !$l343())) return null;
      return $l466 = $l837 ? "retrying" : "guessing", $m_t(`[betas] an HTTP 400 ${$l837 ? "reads as the backend rejecting" : 'says "invalid beta flag", which may be about'} ${$m_vv.header}; resending once without it`, { level: "warn" }), "retry:context-1m-beta";
    } catch ($l839) {
      return $m_l($l839), null;
    }
  }, $l840 = () => {
    if ($l466 !== "retrying" && $l466 !== "guessing") return;
    let $l841 = $l466 === "guessing";
    $l466 = "spent";
    try {
      $l29 = $l29.filter(($l842) => $l842 !== $m_vv), $m_M$r($l11.model), $m_i("tengu_beta_400_healed", { beta: $m_tde([$m_vv.header]), model: $m_Et($l11.model), provider: $m_gA(), status: 400, unnamed: $l841 });
    } catch ($l843) {
      $m_l($l843);
    }
  }, $l844 = ($l845) => {
    if (!$l342.includes($m_c7e.header) || !$NEW_chunk_j0tbz6ra_js_w6e($l845)) return null;
    return $m_r3o(), $m_uvt($m_c7e), $l29 = $l29.filter(($l846) => $l846 !== $m_c7e), $m_t("[thinking-resumption] server rejected the thinking-resumption beta header; disabled for this process", { level: "warn" }), $m_dn("query_thinking_block_resumption", "header_rejected"), $l51 ? "surface:resume-prefill" : "retry:thinking-resumption-beta";
  }, $l847, $l848 = ($l849) => $l849 instanceof $m_Ot && $m_jH($l849), $l850 = 0, $l851 = null, $l852 = "all", $l853 = ($l854) => {
    if (!$l239) $l852 = $l854;
    else if ($l852 !== "all" && ($l854 === "all" || $l854.messageIndex < $l852.messageIndex || $l854.messageIndex === $l852.messageIndex && $l854.thinkingIndex < $l852.thinkingIndex)) $l852 = $l854;
    $l239 = true;
  }, $l855 = ($l856) => {
    if ($l162) return;
    let $l857 = $l165[$l856.messageIndex];
    if ($l857?.role !== "assistant" || !Array.isArray($l857.content)) return;
    let $l858 = $m_YTe($l857.content[$l856.blockIndex]);
    if ($l858 === void 0) return;
    let $l859, $l860 = /* @__PURE__ */ new Map();
    for (let $l861 = 0; $l861 < $l236.length; $l861++) {
      let $l862 = $l236[$l861];
      if ($l862.type !== "assistant" || !Array.isArray($l862.message.content)) continue;
      let $l863 = $l862.message.id, $l864 = $l860.get($l863) ?? 0;
      for (let $l865 of $l862.message.content) {
        if ($l865.type !== "thinking" && $l865.type !== "redacted_thinking") continue;
        if ($m_YTe($l865) === $l858) {
          if ($l859 !== void 0) return;
          $l859 = { messageIndex: $l861, indexInMessage: $l864 - ($l860.get($l863) ?? 0), thinkingIndex: $l864, messageId: $l863 };
        }
        $l864++;
      }
      $l860.set($l863, $l864);
    }
    return typeof $l859?.messageId === "string" ? $l859 : void 0;
  }, $l866 = ($l867) => {
    try {
      if (!$l848($l867)) return;
      $l850++;
      let $l868 = $l867.requestID || $l867.error?.request_id || null;
      if ($l850 === 1) $l851 = $l868;
      let $l869 = $m_$6t($l867), $l870 = $l236, $l871 = (() => {
        if ($l11.resumeIncompleteThinking) return;
        let $l872 = $l869?.block !== void 0 && $l850 <= $NEW_chunk_j0tbz6ra_js_B_r ? $l855($l869.block) : void 0;
        if ($l872 !== void 0) {
          let $l873 = $m_$Je($l870, { messageIndex: $l872.messageIndex, thinkingIndex: $l872.indexInMessage });
          if ($l873 !== $l870) return { scope: "partial", stripped: $l873, from: $l872 };
        }
        let $l874 = $m_JTe($l870);
        return $l874 !== $l870 ? { scope: "all", stripped: $l874, from: "all" } : void 0;
      })();
      if ($l871 === void 0 && !$l239) $m_N6t($l867);
      let $l875 = $l871?.scope ?? "none", $l876 = $m_Fmn($l870, $l871?.stripped ?? $l870);
      if ($l871 !== void 0) $l236 = $l255($l871.stripped, "error_recovery", true), $l853($l871.from);
      $m_t($l871 === void 0 ? "[thinking] prefix-lock rejection: nothing to strip; the error is returned." : `[thinking] prefix-lock rejection: stripped ${$l876.blocksStripped} of ${$l876.blocksSent} thinking block(s) (${$l875}) and retrying.`, { level: "warn" });
      let $l877 = $m_eDr($l11.querySource, $l11.agentId);
      return $m_i("tengu_strict_prefix_lock_400_surfaced", { query_source: $m_os($l11.querySource), model: $m_Et($l11.model), request_id: $m_kg($l868), chain_request_id: $m_kg($l851), client_request_id: $m_ye($l476), solicited: $l493, mismatch_kind: $m_ye($l869?.kind), failing_message_index: $l869?.block?.messageIndex, failing_block_index: $l869?.block?.blockIndex, thinking_blocks_sent: $l876.blocksSent, thinking_turns_sent: $l876.turnsSent, strip_scope: $m_h($l875), stripped_block_count: $l876.blocksStripped, stripped_turn_count: $l876.turnsStripped, attempt: $l850, client_change_kinds: $l877.kinds, first_changed_message_index: $l877.firstChangedMessageIndex, client_baseline: $l877.baseline, call_number: $l877.callNumber }), $l871 === void 0 ? void 0 : $l871.scope === "partial" ? `retry:prefix-lock-strip-${$l850}` : `retry:prefix-lock-strip-all-${$l850}`;
    } catch ($l878) {
      $m_l($l878);
    }
    return;
  }, $l879 = ($l880) => {
    let $l881 = $l866($l880);
    if ($l234 && $m_eM($l880)) $m_aZ($l881 !== void 0 ? "rejected_healed" : "rejected_surfaced");
    return $l881;
  };
  function* $l882() {
  }
  function* $l883() {
    if ($l847 !== void 0) {
      let $l884;
      try {
      } catch ($l885) {
        $m_l($l885);
      }
      if ($l847 = void 0, $l884) yield $l884;
    }
  }
  let $l886 = false;
  function $l887() {
    let $l888 = $m_cZ(() => $l226 && !$l886 && ($NEW_chunk_j0tbz6ra_js_Bee?.relayStoppedInLastDispatch() ?? false), false);
    if ($l888) {
      let $l889 = $m_cZ(() => $m_HJe($l0).size > 0, void 0);
      if ($l889 === true) $l239 = true, $l852 = "all", $l243 = true;
      else if ($l889 === false) $l244 = true;
    }
    if ($l244 && !$l239 && !$l886) return $l886 = true, $m_cZ(() => $NEW_chunk_j0tbz6ra_js_Bee?.markRelayThinkingStripRecorded("no_thinking"), void 0), $m_en({ type: "thinking_stripped", scope: "all" });
    if (!$l239 || $l886) return;
    if ($l886 = true, $l243) $m_cZ(() => $NEW_chunk_j0tbz6ra_js_Bee?.markRelayThinkingStripRecorded($l888 ? "marker_same_request" : "marker"), void 0);
    return $m_en($l852 === "all" ? { type: "thinking_stripped", scope: "all" } : { type: "thinking_stripped", scope: "partial", from: { messageId: $l852.messageId, thinkingIndex: $l852.thinkingIndex } });
  }
  async function* $l890() {
  }
  function $l891({ messageIndex: $l892, blockIndex: $l893 }) {
    let $l894 = $l165[$l892];
    return $l894?.role === "assistant" && Array.isArray($l894.content) ? $m_YTe($l894.content[$l893]) : void 0;
  }
  function $l895($l896) {
    try {
      if (!$m_Gb() || $l162 || $l426 || $l254 || $l166 !== void 0) return;
      $m_npn({ body: $l896, blockKeyAt: $l891, replyHolding: ($l897, $l898) => {
        let $l899 = $l434($l897), $l900 = $l899 === void 0 ? void 0 : $l236[$l899];
        return $l899 !== void 0 && $l900?.type === "assistant" && Array.isArray($l900.message.content) && $l900.message.content.some(($l901) => $m_YTe($l901) === $l898) ? { messageId: $l900.message.id, messageIndex: $l899 } : void 0;
      }, carrier: { key: $m_nx($l11.querySource) !== null ? $m_Z0($l11.agentId) : void 0, querySource: $l11.querySource }, sentThreadPrefix: $m_Apn({ model: $l11.model, system: $l293, toolSchemas: $l337, thinkingConfig: $l35, getMessageHashes: $l334 }) });
    } catch ($l902) {
      $m_l($m_U($l902));
    }
  }
  let $l903 = ($l904) => {
    if ($l162) return;
    let $l905 = $m_Kfn({ body: $l904, blockKeyAt: $l891, carriedBlockHashes: () => $m_Nmn($l0), countThinkingSent: () => $m_Fmn($l236, $l236), querySource: $l11.querySource, agentId: $l11.agentId, model: $l11.model, requestId: $l453, solicited: $l493, contextCompactedKind: $l906 });
    try {
      return $l905 && $m_en($m_Lmn($l905, { requestId: $l453, model: $l11.model, querySource: $l11.querySource, requestedBehavior: $l494 }));
    } catch ($l907) {
      $m_l($l907);
      return;
    }
  }, $l908 = ($l909) => {
    let $l910 = $l11.serverRefusalFallback !== void 0 ? ($l909.content ?? []).reduce(($l911, $l912, $l913) => $m_nTe($l912) ? $l913 : $l911, -1) : -1, $l914 = $l909.stop_reason === "refusal", $l915, $l916 = 0, $l917 = false, $l918 = [];
    for (let [$l919, $l920] of ($l909.content ?? []).entries()) {
      if (!$m_nTe($l920)) {
        if ($l919 < $l910 && $l920.type !== "text" || $l914 && $l910 >= 0) {
          $l916++, $l917 ||= $l920.type === "tool_use";
          continue;
        }
        $l918.push($l920);
        continue;
      }
      let $l921 = $m_zdn($l920);
      if ($l921 === void 0) {
        $m_X("warn", "cli_malformed_fallback_block"), $m_i("tengu_rotunda_pennant_malformed", { block_index: $l919, non_streaming: true }), $m_dn("refusal_fallback", "malformed_fallback_block", { non_streaming: true });
        continue;
      }
      $l918.push($m_T7e($l921)), $l915 = $l921;
      let $l922 = $l499;
      if ($m_i("tengu_rotunda_pennant_materialized", { armed: $l11.serverRefusalFallback !== void 0, mode: $m_h($l922), block_index: $l919, non_streaming: true }), $l921.reason === "refusal") $m_iZ({ model: $l26, requestId: $l453 || void 0, querySource: $l11.querySource, effort: $l190, fastMode: $l630, attempt: $l450, attribution: $m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: true, agentContext: $l11.agentContext });
    }
    if ($l918.length === 0 && ($l909.content ?? []).length > 0) $l918.push({ type: "text", text: $m_Cu, citations: [] });
    let $l923 = $l11.serverRefusalFallback !== void 0 ? $m_cUn($l909.usage) : void 0;
    if ($l659 = $l923?.servedFallbackModel !== void 0 || $l11.serverRefusalFallback !== void 0 && $l915 !== void 0, $l660 = false, $l509 = false, $l661 = $l923, $l916 > 0) $m_i("tengu_rotunda_pennant_sync_dropped", { dropped_count: $l916, had_tool_use: $l917, chain_exhausted: $l914 });
    return { content: $l918, lastHop: $l915, iterations: $l923 };
  };
  function* $l924($l925, $l926, $l927) {
    if ($l927 !== void 0 && !$l509) {
      $l509 = true;
      let $l928 = $m_Mwe($m_em, $l926.usage);
      $m_i("tengu_fallback_credit_minted", { request_id: $m_ye($l453), model: $m_Et($l11.model), fallback_target_model: $m_Et($l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l659 ? $l11.serverRefusalFallback.model : void 0)), token_length: $l927.length, input_tokens: $l928.input_tokens, output_tokens: $l928.output_tokens, cache_read_input_tokens: $l928.cache_read_input_tokens, cache_creation_input_tokens: $l928.cache_creation_input_tokens, cache_creation_5m_input_tokens: $l928.cache_creation?.ephemeral_5m_input_tokens ?? 0, cache_creation_1h_input_tokens: $l928.cache_creation?.ephemeral_1h_input_tokens ?? 0, service_tier: $m_de($l928.service_tier), speed: $m_de($l928.speed), query_source: $m_os($l11.querySource), ...$l11.queryTracking && { query_chain_id: $m_ye($l11.queryTracking.chainId), query_depth: $l11.queryTracking.depth } });
    }
    let $l929 = $l11.serverRefusalFallback !== void 0 ? $l925.lastHop?.model ?? $l925.iterations?.servedFallbackModel : void 0;
    if (!$l660 && $l929 !== void 0) $l660 = true, yield { type: "server_fallback", fromModel: $l925.lastHop?.fromModel ?? $l11.model, toModel: $l929, reason: $l925.lastHop !== void 0 ? "refusal" : "sticky", apiRefusalCategory: $l925.lastHop?.category ?? null, midStream: false, requestId: $l453 ?? null, refusedEffort: $l330(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: $l926.stop_reason };
    let $l930 = $l11.refusalFallbackModelLane === "silent", $l931 = !$l930 ? $l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l659 ? $l11.serverRefusalFallback.model : void 0) : void 0, $l932 = $l11.refusalFallbackCascadeHop, $l933 = $l926.stop_reason === "refusal" && $l931 !== void 0 && $l932 === void 0 ? $m_mDo({ originalModelCanonical: $m_qe($l11.model), armedFallbackModel: $l931, apiRefusalCategory: $l926.stop_details?.category ?? null, armedTargetIsRefusingModel: $m_wht($l11.model, $l931), resolveTarget: ($l934) => $m_TFt({ mappedTarget: $l934, armedFallbackModel: $l931, refusingModel: $l11.model, triedModels: [$m_vht($l11.model)] }), routesOverride: $NEW_chunk_bbw420pv_js_o1r() }) : void 0, $l935 = $l933 !== void 0 ? $l933.model : $l931;
    if ($l933 !== void 0) $m_BLr({ route: $l933, model: $l11.model, armedFallbackModel: $l931, apiRefusalCategory: $l926.stop_details?.category, requestId: $l453 });
    if ($l926.stop_reason === "refusal" && $l935 !== void 0) return $l760(), yield { type: "fallback_request", trigger: "refusal", originalModel: $l11.model, fallbackModel: $l935, requestId: $l453 ?? null, refusedEffort: $l330(), apiRefusalCategory: $l926.stop_details?.category ?? null, apiRefusalExplanation: $l926.stop_details?.explanation ?? null, creditCode: $l927 ?? null, mintedStateless: !$l437, ...$m_pDo($l933, $l932) }, true;
    let $l936 = $m_bIt($l926.stop_reason, $l926.stop_details, $l453, $l929 ?? $l11.model, $l926.id);
    if ($l936) {
      let $l937 = $m_DK() || $m_wG() !== void 0;
      if ($l931 !== void 0 || $l11.refusalFallbackModel !== void 0 || $m_Sht($l11.model) && $m_mW() || $m_ydn() || $l937) $m_m("refusal_fallback", $l933?.matched === "none" ? "route_declined" : $l930 ? "sync_silent_stood" : $l929 !== void 0 ? "server_chain_exhausted" : $l937 ? "client_chain_exhausted" : $m_Sht($l11.model) && $m_GLr() ? "disabled_by_config" : "not_armed", { convolute_arcades: $m_hdn(), arm_source: $m_h($m_gMe()), armed: $l931 !== void 0, model_scope: $m_h($m__J($l11.model)) });
      yield { type: "refusal_no_fallback", originalModel: $l11.model, requestId: $l453 ?? null, apiRefusalCategory: $l926.stop_details?.category ?? null, apiRefusalExplanation: $l926.stop_details?.explanation ?? null }, yield $l936;
    }
    let $l938 = $l939($l926);
    if ($l938 !== void 0) yield $l938;
    return false;
  }
  function $l939($l940) {
    try {
      if (!$m_k("tengu_vast_sunset", true)) return;
      return $m_Vmn($l940.stop_reason, Math.min($l626, $m_Hhn), $l940.usage?.output_tokens ?? 0, $l626 >= $m_Hhn);
    } catch ($l941) {
      $m_l($m_Xe($m_U($l941), "building the cut-short error for a non-streaming response failed"));
      return;
    }
  }
  let $l942 = [];
  function $l943($l944, $l945) {
    if ($l944.size > 0) $l942.push({ type: "hint_clears", ids: [...$l944], contentById: Object.fromEntries($l945) });
  }
  function* $l946() {
    yield* $l942.splice(0);
  }
  async function* $l947($l948, $l949) {
    let { message: $l950, requestId: $l951, headers: $l952, creditCode: $l953 } = yield* $NEW_chunk_j0tbz6ra_js_V_r({ model: $l11.model, fetchOverride: $l11.fetchOverride, source: $l11.querySource, requestClass: $l11.requestClass, agentContext: $l11.agentContext, promptId: $l20, ccsSender: $l21, permissionContext: $l306, toolNames: $l308, credentials: $l11.credentials, storageV5: $l11.storageV5, clock: $l12, queryTracking: $l11.queryTracking, llmSpan: $l447, contextCompactedKindForWire: $l906, compactionRequestKindForWire: $l954, prevToolDurationsForWire: $l955 }, { model: $l11.model, fallbackModel: $l11.fallbackModel, accessFallbackModel: $l10, toolFreeHelper: $l11.toolFreeHelper, ...$m_jo() && { fastMode: $l302 }, modelIsRefusalFallbackTarget: $l11.modelIsRefusalFallbackTarget, signal: $l4, initialConsecutive529Errors: $l644.counts().overloaded, querySource: $l11.querySource, maxRetries: $l644.retriesLeft(), modelCallRetries: $l644, clock: $l12, random: $l11.random, isResumePrefillRequest: $l51, failedStreamOutlastedTimeout: $l949, onRetryStatus: $l11.onRetryStatus, subscribeRetryWake: $l11.subscribeRetryWake, onQuotaWindowWait: $l483, isUsageLimitLifted: $l487, lowPriorityWait: $l480, stampDispatchHeader: $l648, onApiError: async ($l956) => {
      let $l957 = $l427($l956);
      if ($l957 !== void 0) return $l957;
      let $l958 = await $l652($l956);
      if ($l958 !== void 0) return $l958;
      let $l959 = $l401($l956);
      if ($l959 !== void 0) return $l959;
      let $l960 = $l346($l956);
      if ($l960 !== void 0) return $l960;
      let $l961 = $l815($l956);
      if ($l961 !== null) return $l961;
      let $l962 = $l739($l956, "sync");
      if ($l962 !== void 0) return $l962;
      let $l963 = $l745($l956);
      if ($l963 !== void 0) return $l963;
      let $l964 = $m_HDo($l956, $l11.model, $l11.querySource);
      if ($l964 === $m_KLr) return;
      if ($l964 !== null) return $l964;
      let $l965 = $l812($l956);
      if ($l965 !== null) return $l965;
      let $l966 = $l766($l956);
      if ($l966) return $l966;
      let $l967 = $l386($l956);
      if ($l967) return $l967;
      let $l968 = $l810($l956);
      if ($l968 !== null) return $l968;
      let $l969 = $l844($l956);
      if ($l969 === "surface:resume-prefill") return;
      if ($l969 !== null) return $l969;
      let $l970 = $l817($l956);
      if ($l970 !== null) return $l970;
      let $l971 = $l824($l956);
      if ($l971 !== null) return $l971;
      let $l972 = $l827($l956);
      if ($l972 !== void 0) return $l972;
      $l370($l956);
      let $l973 = $l835($l956);
      if ($l973 !== null) return $l973;
      let $l974 = $l383($l956);
      if ($l974 !== null) return $l974;
      let $l975 = $l879($l956);
      if ($l975 !== void 0) return $l975;
      return $l720($l956) ?? $l710($l956) ?? $l724($l956) ?? $l662($l956, "sync") ?? $l403($l956) ?? $l420($l956) ?? $l676($l956) ?? $l388($l956) ?? $l380($l956) ?? $l372($l956);
    } }, $l518, ($l976, $l977, $l978) => {
      $l450 = $l976, $l626 = $l978, $l291 = $l977;
    }, ($l979) => $l472($l979, false), $l948);
    $l453 = $l951, $l315($l951, $l952, true), $l895($l950), $l340?.settle({ kind: "ok" }, $l453, $l950.id);
    try {
      $l793($l950.usage), $l800($l950.usage);
    } catch {
    }
    $l803(), $l804(), $l806(), $l807(), $l808(), $l398(), $l395(), $l840(), $l375(), $l769(), $m_i("tengu_nonstreaming_fallback_success", { model: $m_Et($l11.model), request_id: $m_kg($l951), originating_request_id: $m_kg($l469), fallback_cause: $m_h($l948.cause), attempt: $l450 }), yield* $l883(), yield* $l882(), $l629 = $l950.diagnostics?.cache_miss_reason ?? void 0;
    let $l980 = $l908($l950), $l981 = $l273 ? $m_q$e($l980.content) : void 0;
    if ($l981?.degraded) $m_K$e();
    let $l982 = $l981?.inputs, $l983 = $m_Q$e($l980.content, $l982), { content: $l984, batchToolUses: $l985 } = $m_ton($m_Ten($l980.content, $l3, $l11.agentId, { requestId: $l453 ?? void 0, messageId: $l950.id }, $l11.storageV5), $l3, ($l986, $l987) => $m_mIt($l986, $l987, $l11.agentId, $l11.storageV5));
    if ($l455 !== void 0) $l458($l455, $l950, $l950.content);
    $l627 = $l952;
    let $l988 = $l903($l950), $l989 = $l887();
    if ($l989) yield $l989;
    let $l990 = $l242();
    if ($l990) yield $l990;
    if ($l988) yield $l988;
    let $l991 = { message: { ...$l950, content: $l984, usage: $m_Mwe($m_em, $l950.usage) }, ...$l985.length > 0 && { batchToolUses: $l985 }, ...$l982 !== void 0 && { wireToolInputs: $l982 }, ...$l983 !== void 0 && { wireIngestContext: $l983 }, ...$l455 !== void 0 && $m_Uhe($l455), apiBlockIndex: 0, requestId: $l453 ?? void 0, requestRef: $l471, requestedModel: $l11.model, ...$m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), type: "assistant", uuid: $NEW_chunk_j0tbz6ra_js_jee(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...false, ...$l48 && { advisorModel: $l48 }, ...$l327 !== void 0 && { effort: $l327 }, perTurnEffort: $l328, perTurnTiming: $l329, ...{} };
    return $NEW_chunk_j0tbz6ra_js_O4e($l28, $l991), $l608.push($l991), $l625 = $l991, $l288 = false, yield $l991, yield* $l924($l980, $l950, $l953);
  }
  let $l992 = false, $l993 = /* @__PURE__ */ new Map(), $l994 = /* @__PURE__ */ new Set(), $l995 = /* @__PURE__ */ new Set(), $l996, $l997 = $m_Jge($l11.agentContext) ?? ($l11.isBackgroundAgent ? $l11.agentId : void 0), $l906 = $m_rs($l11.querySource) === "main" && $m_Dv($l11.querySource, $l11.agentId) ? $m_k4o() : void 0, $l954 = $l11.compactionRequestKind, $l955 = $l11.prevToolDurations !== void 0 ? $m_g4t($l11.prevToolDurations) : void 0;
  try {
    $m_BM("api_call", $l997);
    e: for (; ; ) {
      let $l998 = function() {
        if ($l999 !== null) $l999(), $l999 = null;
        if ($l1000) $l1000 = false, $l11.onRetryStatus?.(null);
        if ($l1001 !== null) $l1001(), $l1001 = null;
        if ($l1002 !== null) $l1002(), $l1002 = null;
      }, $l1003 = function() {
        if (!$l11.onRetryStatus || !$l1004) return;
        let $l1005 = $l1004.lastAt, $l1006 = $l12.monotonicNow();
        $l999 = $l12.setTimeout(() => {
          if ($l12.monotonicNow() - $l1006 < $l1007 / 2) return;
          if ($l1004.lastAt > $l1005) {
            $l1003();
            return;
          }
          let $l1008 = $l12.monotonicNow() - $l1004.lastAt;
          if ($l631 && $l1008 < $l1009) {
            $l1003();
            return;
          }
          let $l1010 = $l1004.lastAt === 0 ? $l12.monotonicNow() - $l1011 : $l1008;
          $l1000 = true, $l11.onRetryStatus?.({ kind: "stalled", deadline: $l12.now() + Math.max(0, $l1012 - $l1010) });
        }, $l1007, { unref: true });
      }, $l1013 = function() {
        if ($l998(), $l1003(), !$l1014) return;
        let $l1015 = $l12.monotonicNow(), $l1016 = $l12.now(), $l1017 = $l1018;
        $l1001 = $l12.setTimeout(() => {
          if ($l12.monotonicNow() - $l1015 < $l1017) return;
          $m_t(`Streaming idle warning: no chunks received for ${$l1017 / 1e3}s`, { level: "warn" }), $m_X("warn", "cli_streaming_idle_warning");
        }, $l1018), $l1002 = $l12.setTimeout(() => {
          if ($l1019 = $m_izs($l12, { armedAt: $l1015, wallArmedAt: $l1016, idleMs: $l1020 }), $l1019 !== void 0) {
            $l491();
            return;
          }
          $l1021 = true, $l1022 = $l12.monotonicNow(), $m_t(`Streaming idle timeout: no chunks received for ${$l1020 / 1e3}s, aborting stream`, { level: "error" }), $m_X("error", "cli_streaming_idle_timeout"), $m_i("tengu_streaming_idle_timeout", { model: $m_Et($l11.model), request_id: $m_kg($l453), timeout_ms: $l1020, tier: $m_b("event") }), $l491();
        }, $l1020);
      };
      if ($l482 = void 0, $m_Om("query_client_creation_start"), $l16) $m_sR("request_build"), $m_oR("client_creation");
      let $l1023 = $m_HTe(() => $m_sF({ maxRetries: 0, model: $l11.model, fetchOverride: $l11.fetchOverride, source: $l11.querySource, requestClass: $l11.requestClass, agentContext: $l11.agentContext, promptId: $l20, ccsSender: $l21, permissionContext: $l306, toolNames: $l308, credentials: $l11.credentials, storageV5: $l11.storageV5, signal: $l4, clock: $l12, noResponseRetryLedger: $l642 }), async ($l1024, $l1025, $l1026) => {
        if ($l502 === void 0) $l510("attempt_errored", $l453 ?? null, null);
        if ($l450 = $l1025, $l630 = $l1026.fastMode ?? false, $l449 = $l12.monotonicNow(), $l482 = void 0, $l451.push($l449), $m_Om("query_client_creation_end"), $l16) $m_sR("client_creation"), $m_oR("request_build");
        let $l1027 = $l518($l1026);
        if ($m_Qmn($l1027), $l472($l1027, true), $l626 = $l1027.max_tokens, $m_Om("query_api_request_sent"), $m_t(`[API:timing] dispatching to ${$m_Sd($l11.model)} model=${$l11.model}`), $l291 = $l12.now(), $l615 === void 0 && $l11.queryTracking?.roundStartedAtMs !== void 0) $l11.queryTracking.firstDispatchedAtMs ??= performance.now(), $l615 = Math.round($l11.queryTracking.firstDispatchedAtMs - $l11.queryTracking.roundStartedAtMs);
        if (!$l11.agentId) {
          if ($l191) $m_Mg("api_request_sent");
          if ($l16) $m_sR("request_build");
          if ($l1025 === 1 && !$l612) {
            if ($l612 = $l12.monotonicNow(), $l613 = $l12.now(), $l191) $m_Izs();
            if ($l16) $l614 = $m_tcn($l612);
          }
          if ($l191) try {
            $NEW_chunk_j0tbz6ra_js_a5t();
          } catch ($l1028) {
            $m_l($m_U($l1028));
          }
        }
        $l490();
        let $l1029 = $m_qc(process.env.CLAUDE_SLOW_FIRST_BYTE_MS) || 3e4;
        $l489 = $l12.setTimeout(() => {
          $l489 = null;
          let $l1030 = $l12.monotonicNow() - $l449;
          $m_t(`Slow first byte: no stream chunk ${($l1030 / 1e3).toFixed(1)}s after request sent (attempt ${$l1025})`, { level: "warn" }), $m_i("tengu_api_slow_first_byte", { model: $m_Et($l11.model), provider: $m_gA(), attempt: $l1025, elapsed_ms: Math.round($l1030) });
        }, $l1029);
        let $l1031 = $m_Jmn($l447, $l451.length);
        $l476 = $l1031.clientRequestId;
        let $l1032 = $l1031.headers;
        if ($l479 = $m_sa() && $m_EJe(), $l479) $l1032[$m_hht] = $m_RLr;
        if ($m_jfr($l11, $l479, $l24)) $l1032[$m_hht] = "extended";
        if ($l648($l1032, $l479), $l11.fallbackStampFromModel !== void 0 && $m_J$r() === "firstParty" && $m_Ri()) for (let [$l1033, $l1034] of [[$NEW_chunk_bbw420pv_js_aBo, $l11.fallbackStampFromModel], [$NEW_chunk_bbw420pv_js_lBo, $l11.fallbackStampCategory], [$NEW_chunk_bbw420pv_js_dBo, $l11.fallbackStampTrigger], [$NEW_chunk_bbw420pv_js_cBo, $l11.fallbackStampOriginalRequestId]]) {
          let $l1035 = $m_k6n($l1034);
          if ($l1035 !== void 0) $l1032[$l1033] = $l1035;
        }
        $m_Zmn($l1032, $l906, $l954), $m_tgn($l1032, $l955);
        let $l1036 = $l502;
        if ($l505 = $l1036 !== void 0, $l1036 !== void 0) $l502 = void 0, $l413 = true;
        if ($l319 = $m_Yg(), $l476 !== void 0) $m_szs($l476, { escalated: $l642.count > 0 }), $m_sFs($l476, performance.now());
        if ($m_rs($l11.querySource) === "main") setTimeout($m_scn, 0);
        setTimeout($m_ZOo, 0, $l11.querySource, $l11.agentId);
        let $l1037 = await $l1024.beta.messages.create({ ...$NEW_chunk_ybr49gcx_js_Xdn($l1027), ...$l1036 !== void 0 && { fallback_credit_token: $l1036 }, stream: true }, { signal: $l4, ...Object.keys($l1032).length > 0 && { headers: $l1032 } }).withResponse().catch(($l1038) => {
          throw $l490(), $l1038;
        });
        if ($m_Om("query_response_headers_received"), $l453 = $m_f8e($l1037.request_id, $l1037.response?.headers), $l477 = $l1037.response, $l481 = $l12.now(), $l315($l453, $l1037.response?.headers, false), $l482 = $l1037.response && { status: $l1037.response.status, headers: $l1037.response.headers, latencyMs: Math.round($l12.monotonicNow() - $l449) }, $m_ogn($l482), $l1036 !== void 0) $m_i("tengu_rotunda_pennant_credit_echoed", { mint_request_id: $m_ye($l11.fallbackCreditMintRequestId), mint_model: $m_Et($l11.fallbackCreditMintModel), request_id: $m_ye($l453), client_request_id: $m_ye($l476), model: $m_Et($l11.model), token_length: $l1036.length, query_source: $m_os($l11.querySource) });
        return $l1037.data;
      }, { model: $l11.model, credentials: $l11.credentials, storageV5: $l11.storageV5, fallbackModel: $l11.fallbackModel, accessFallbackModel: $l10, toolFreeHelper: $l11.toolFreeHelper, ...$m_jo() ? { fastMode: $l302 } : false, modelIsRefusalFallbackTarget: $l11.modelIsRefusalFallbackTarget, signal: $l4, initialConsecutive529Errors: $l644.counts().overloaded, maxRetries: $l644.retriesLeft(), noResponseRetryLedger: $l642, modelCallRetries: $l644, clock: $l12, random: $l11.random, isResumePrefillRequest: $l51, querySource: $l11.querySource, onRetryStatus: $l11.onRetryStatus, subscribeRetryWake: $l11.subscribeRetryWake, onQuotaWindowWait: $l483, isUsageLimitLifted: $l487, lowPriorityWait: $l480, onError: async ($l1039) => {
        let $l1040 = $l427($l1039);
        if ($l1040 !== void 0) return $l1040;
        let $l1041 = $l401($l1039);
        if ($l1041 !== void 0) return $l1041;
        let $l1042 = $l346($l1039);
        if ($l1042 !== void 0) return $l1042;
        let $l1043 = $l815($l1039);
        if ($l1043 !== null) return $l1043;
        if ($l303 && $m_oke($l1039)) {
          if ($l303 = false, $m_zB) $m_Dg($l28, $m_zB);
          return $m_nP(false), $m_Wpn(true), $m_t("[auto-mode] server rejected afk-mode beta \u2014 dropping header and circuit-breaking auto for this session", { level: "warn" }), "retry:afk-beta";
        }
        let $l1044 = await $l652($l1039);
        if ($l1044 !== void 0) return $l1044;
        if ($m_DVe($l1039)) {
          let $l1045 = $l236, $l1046 = $m_zb($l1045), $l1047 = $l1045.findIndex(($l1048, $l1049) => $l1046[$l1049] !== $l1048), $l1050 = $l1045.reduce(($l1051, $l1052, $l1053) => $l1046[$l1053] !== $l1052 ? $l1051 + 1 : $l1051, 0), $l1054 = $NEW_chunk_j0tbz6ra_js_H9t() && $l1047 !== -1, $l1055;
          if ($l1054 && !$l11.resumeIncompleteThinking && $l495 !== "enabled") try {
            let $l1056 = $l1045.findIndex(($l1057, $l1058) => $l1058 >= $l1047 && $m_Bfr($l1057)), $l1059 = $l1056 === -1 ? void 0 : $l1045[$l1056];
            if ($l1059?.type === "assistant") {
              let $l1060 = $m_$Je($l1046, { messageIndex: $l1056, thinkingIndex: 0 });
              if ($l1060 !== $l1046) {
                $l1046 = $l1060;
                let $l1061 = $l1059.message.id;
                if (typeof $l1061 === "string") {
                  let $l1062 = 0;
                  for (let $l1063 = 0; $l1063 < $l1056; $l1063++) {
                    let $l1064 = $l1045[$l1063];
                    if ($l1064.type === "assistant" && $l1064.message.id === $l1061 && Array.isArray($l1064.message.content)) $l1062 += $m_F($l1064.message.content, ($l1065) => $l1065.type === "thinking" || $l1065.type === "redacted_thinking");
                  }
                  $l1055 = { messageIndex: $l1056, indexInMessage: 0, thinkingIndex: $l1062, messageId: $l1061 };
                } else $l1046 = $m_JTe($l1046), $l1055 = "all";
              }
            }
          } catch ($l1066) {
            $m_l($m_U($l1066)), $l1046 = $m_zb($l1045), $l1055 = void 0;
          }
          if ($l236 = $l255($l1046, "error_recovery"), $l703(), $l1054) {
            if ($l240 = true, $l1055 !== void 0) $l853($l1055);
          }
          return $m_t($l1050 === 0 ? "[advisor] the server could not process an advisor result sent earlier in this conversation; nothing to remove, retrying as sent." : `[advisor] the server could not process an advisor result sent earlier in this conversation; retrying with the advisor blocks removed from ${$l1050} message(s)${$l1055 === "all" ? " and all thinking removed" : $l1055 !== void 0 ? " and the thinking after them removed" : ""}${$l1054 ? "; recorded, so later requests leave them out too." : "; not recorded, so the next request sends them again."}`, { level: "warn" }), $m_i("tengu_advisor_strip_retry", { query_source: $m_os($l11.querySource), strip_recorded: $l1054, stripped_message_count: $l1050, thinking_also_stripped: $l1055 !== void 0 }), "retry:advisor-strip";
        }
        let $l1067 = $l739($l1039, "stream");
        if ($l1067 !== void 0) return $l1067;
        let $l1068 = $l745($l1039);
        if ($l1068 !== void 0) return $l1068;
        let $l1069 = $m_HDo($l1039, $l11.model, $l11.querySource);
        if ($l1069 === $m_KLr) return;
        if ($l1069 !== null) return $l1069;
        let $l1070 = $l812($l1039);
        if ($l1070 !== null) return $l1070;
        {
          let $l1071 = $m_J_e($l1039);
          if ($l1071) {
            let $l1072 = $l1039 instanceof Error ? $l1039.message : String($l1039), $l1073 = $m_S3($l236, $l1072);
            if ($l1073 !== $l236) return $l236 = $l255($l1073, "error_recovery"), $l634.set($l1071.kind, $l1072), $m_IJe($l11, $l1071.kind, $l1072), $m_i("tengu_media_block_strip_retry", { kind: $m_h($l1071.kind), targeted: 1 }), "retry:media-strip-over-dimension-limit";
            let $l1074 = $l1071.messageIdx !== void 0 ? $l434($l1071.messageIdx) : void 0;
            if ($l1071.messageIdx !== void 0 && $l1074 !== void 0 && $l1071.contentIdx !== void 0) {
              let $l1075 = `${$l1071.messageIdx}.${$l1071.contentIdx}`, $l1076 = $l638.get($l1075) ?? 0, $l1077 = $l1071.nestedContentIdx !== void 0 && $l1076 < $l637 ? $l1071.nestedContentIdx : void 0, $l1078 = $m_VSt($l236, { messageIdx: $l1074, contentIdx: $l1071.contentIdx, nestedContentIdx: $l1077, kind: $l1071.kind }, $l1072);
              if ($l1078 !== $l236) {
                if ($l236 = $l255($l1078, "error_recovery"), $l634.set($l1071.kind, $l1072), $m_IJe($l11, $l1071.kind, $l1072), $l1077 !== void 0) $l638.set($l1075, $l1076 + 1);
                let $l1079 = `messages.${$l1071.messageIdx}.content.${$l1071.contentIdx}`, $l1080 = $l1077 !== void 0 ? `${$l1079}.tool_result.content.${$l1077}` : $l1071.nestedContentIdx !== void 0 ? `${$l1079}.tool_result.content.*` : $l1079;
                return $m_t(`Removed unprocessable ${$l1071.kind} at ${$l1080}; retrying.`, { level: "warn" }), $m_i("tengu_media_block_strip_retry", { kind: $m_h($l1071.kind), message_idx: $l1071.messageIdx, content_idx: $l1071.contentIdx, targeted: 1 }), `retry:media-strip:${$l1071.kind}:${$l1080}`;
              }
            }
            let $l1081 = $l636.value < $l635 ? $m_XSt($l236, $l1071.kind, $l1072) : void 0;
            if ($l1081) return $l636.value++, $l236 = $l255($l1081.messages, "error_recovery"), $l634.set($l1071.kind, $l1072), $m_IJe($l11, $l1071.kind, $l1072), $m_t(`Removed base64 ${$l1071.kind} blocks from carrier ${$l1081.carrierIdx} (API 400 had no usable path); retrying.`, { level: "warn" }), $m_i("tengu_media_block_strip_retry", { kind: $m_h($l1071.kind), targeted: 0, carrier_idx: $l1081.carrierIdx }), `retry:media-strip-latest:${$l1071.kind}:${$l1081.carrierIdx}`;
          }
        }
        if ($l311 && $NEW_chunk_j0tbz6ra_js_b6e($l1039)) return $l311 = false, $m_PTt($l28, $l319, $l191), "retry:cache-keepalive-beta";
        let $l1082 = $l844($l1039);
        if ($l1082 === "surface:resume-prefill") return;
        if ($l1082 !== null) return $l1082;
        {
          let $l1083 = $m_gke($l1039);
          if ($l1083) {
            let $l1084 = $l1083 === "enabled" ? "adaptive" : "enabled";
            return $m_x5o($l11.model, $l1084), $m_t(`[thinking] model rejected thinking.type=${$l1083}; retrying with ${$l1084}. For Bedrock application-inference-profile ARNs with bearer-token auth, granting bedrock:GetInferenceProfile to the token avoids this round-trip.`, { level: "warn" }), "retry:thinking-type";
          }
        }
        let $l1085 = $l810($l1039);
        if ($l1085 !== null) return $l1085;
        let $l1086 = $l817($l1039);
        if ($l1086 !== null) return $l1086;
        let $l1087 = $l824($l1039);
        if ($l1087 !== null) return $l1087;
        let $l1088 = $l827($l1039);
        if ($l1088 !== void 0) return $l1088;
        $l370($l1039);
        let $l1089 = $l835($l1039);
        if ($l1089 !== null) return $l1089;
        let $l1090 = $l383($l1039);
        if ($l1090 !== null) return $l1090;
        {
          let $l1091 = $l866($l1039);
          if ($l1091 !== void 0) {
            if ($l234 && $m_eM($l1039)) $m_aZ("rejected_healed");
            return $l1091;
          }
        }
        if (!$l11.resumeIncompleteThinking && $m_eM($l1039)) {
          let $l1092 = 0, $l1093 = 0;
          for (let $l1094 of $l236) {
            if ($l1094.type !== "assistant" || !Array.isArray($l1094.message.content)) continue;
            for (let $l1095 of $l1094.message.content) if ($l1095.type === "redacted_thinking") $l1092++;
            else if ($l1095.type === "thinking") if ("signature" in $l1095 && $l1095.signature) $l1092++;
            else $l1093++;
          }
          let $l1096 = $m_JTe($l236);
          if ($l1096 !== $l236) {
            if ($l236 = $l255($l1096, "error_recovery"), $l853("all"), $l234) $m_aZ("rejected_fell_back");
            return $m_t("[thinking] server rejected a thinking block; stripping all thinking blocks and retrying.", { level: "warn" }), $m_i("tengu_thinking_signature_strip_retry", { query_source: $m_os($l11.querySource), model: $m_Et($l11.model), stripped_signed_count: $l1092, stripped_unsigned_count: $l1093 }), "retry:thinking-signature-strip";
          }
        }
        if ($l234 && $m_eM($l1039)) $m_aZ("rejected_surfaced");
        {
          let $l1097 = $l766($l1039);
          if ($l1097) return $l1097;
        }
        {
          let $l1098 = $l386($l1039);
          if ($l1098) return $l1098;
        }
        {
          let $l1099 = $l710($l1039);
          if ($l1099 !== void 0) return $l1099;
        }
        {
          let $l1100 = await $l326?.onRequestError($l1039, $l236);
          if ($l1100) return $l236 = $l255($l1100.messages, "microcompact"), $l943($l1100.clearedIds, $l1100.clearedContent), "retry:context-hint";
        }
        return $l720($l1039) ?? $l724($l1039) ?? $l662($l1039, "stream") ?? $l403($l1039) ?? $l420($l1039) ?? $l676($l1039) ?? $l388($l1039) ?? $l380($l1039) ?? $l372($l1039);
      } }), $l1101;
      do
        if ($l1101 = await $l1023.next(), yield* $l946(), !("controller" in $l1101.value)) yield $l1101.value;
      while (!$l1101.done);
      if ($l452 = $l1101.value, $l803(), $l804(), $l806(), $l807(), $l808(), $l398(), $l769(), $l639) $l639 = false, $l11.onRetryStatus?.(null);
      for (let [$l1102, $l1103] of $l634) yield $m_Fs({ ...$m_Cle($l1102, $l1103), error: "invalid_request", errorDetails: $l1103 });
      $l634.clear(), yield* $l883(), yield* $l882();
      let $l1004 = $l477 ? $l477._chunkTimes ?? void 0 : void 0;
      if ($l1004 === void 0 && $l477 !== void 0 && $m_J$r() === "bedrock" && $m_XLr("bedrock")) $m_t("wire-heartbeat: _chunkTimes absent on a Bedrock stream with the byte watchdog enabled \u2014 heartbeat side-channel unavailable for this stream (bedrock-sdk \u22650.32.0 eventstream\u2192SSE transcode drops it; also expected if the response was not vnd.amazon.eventstream, e.g. behind a header-rewriting proxy)");
      let $l1011 = $l12.monotonicNow();
      $l608.length = 0, $l609 = 0, $l610 = void 0, $l611 = 0, $l360 = void 0, $l616.length = 0, $l659 = false, $l660 = false, $l992 = false, $l993.clear(), $l994.clear(), $l995.clear(), $l996 = void 0, $l509 = false, $l292 = $m_em, $l617 = null, $l619 = null, $l620 = false, $l621 = "none";
      let $l1104 = false;
      $l288 = false, $l631 = false;
      let $l1105 = false, $l1106 = false, $l1107 = false, $l1108 = null, $l1109 = /* @__PURE__ */ new WeakSet(), $l1110 = /* @__PURE__ */ new WeakMap(), $l1111 = false, $l1112 = false, $l1113 = null, $l1114 = false, $l1115 = null, $l1116 = 0;
      function* $l1117({ responseUnfinished: $l1118 }) {
        if (!$l1112) return;
        let $l1119 = $l1114 ? null : $l1113;
        $l1112 = false, $l1113 = null, $l1114 = false;
        let $l1120 = $l1115 !== null ? { apiMessageId: $l1115 } : void 0;
        if ($l1119 !== null) yield { type: "stream_event", event: { type: "content_block_stop", index: $l1119 }, ...$l1120 };
        yield { type: "stream_event", event: { type: "message_stop" }, ...$l1120, ...$l1118 && $l1115 !== null && Number.isSafeInteger($l1116) ? { abandonedBlocks: { apiMessageId: $l1115, fromBlockIndex: $l1116 } } : void 0 };
      }
      let $l1121 = null, $l1122 = 0, $l1123 = 0, $l1124 = null, $l1125 = null, $l1126 = null, $l1127 = 0, $l1128 = false, $l1014 = $m_a.CLAUDE_ENABLE_STREAM_WATCHDOG ?? true, $l1020 = $m_bdn(), $l1018 = $l1020 / 2, $l1007 = $NEW_chunk_j0tbz6ra_js_ikr(), $l1012 = Math.min($m_YLr($m_J$r()), $l1014 ? $l1020 : 1 / 0), $l1009 = Math.min($NEW_chunk_j0tbz6ra_js_akr, $l1012 - $l1007), $l1021 = false, $l1019, $l1022 = null, $l1001 = null, $l1002 = null, $l999 = null, $l1000 = false;
      $l1013();
      let $l1129 = () => {
        if ($l11.querySource !== "sdk" && $l11.keepPartialMessageOnAbort !== true) return;
        if ($l992) return;
        let $l1130 = $l616[$l608.length];
        if ($l1130?.type !== "text" || $l1109.has($l1130) || !$l1130.text.trim() || !$l360) return;
        return { message: { ...$l360, content: $m_Ten([$l1130], $l3, $l11.agentId, { requestId: $l453 ?? void 0, messageId: $l360.id }, $l11.storageV5) }, apiBlockIndex: $l608.length, requestId: $l453 ?? void 0, requestRef: $l471, requestedModel: $l11.model, ...$m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), type: "assistant", uuid: $NEW_chunk_j0tbz6ra_js_jee(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), isAbortedMidStream: true, ...void 0, ...$l327 !== void 0 && { effort: $l327 }, perTurnEffort: $l328, perTurnTiming: $l329 };
      }, $l1131 = () => {
        if ($l996 === void 0 || $l660) return;
        let $l1132 = $l996;
        return $l996 = void 0, $l660 = true, { type: "server_fallback", fromModel: $l1132.fromModel, toModel: $l1132.model, reason: $l1132.reason, apiRefusalCategory: $l1132.category, midStream: false, requestId: $l453 ?? null, refusedEffort: $l330(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: null };
      };
      function* $l1133() {
        $l510("aborted", $l453 ?? null, null);
        let $l1134 = $l1131();
        if ($l1134) yield $l1134;
        let $l1135 = $l1129();
        if ($l1135) yield $l1135;
        if ($l631) $m_i("tengu_advisor_tool_interrupted", { model: $m_Et($l11.model), advisor_model: $m_Et($l48 ?? "unknown"), query_source: $m_os($l11.querySource) });
      }
      try {
        let $l1136 = true, $l1137 = 3e4, $l1138 = 0;
        for await (let $l1139 of $m_Ffr($m_Cfn($l452, $l4), $l1004, $m_lgn, $l12)) {
          if ($m_nve($l1139)) {
            if ($l1138++, $l1138 <= $NEW_chunk_j0tbz6ra_js_lkr) $l1013();
            else if (!$l1014 || $l1021 || $l1019 !== void 0) continue;
            yield { type: "stream_event", event: $l1139 };
            continue;
          }
          $l1138 = 0, $l1013(), $l611++, $l1124 ??= Math.round($l12.monotonicNow() - $l449), $l1125 ??= $l1139.type, $l1126 = $l1139.type;
          let $l1140 = $l12.now();
          if ($l1121 !== null) {
            let $l1141 = $l1140 - $l1121;
            if ($l1141 > $l1137) $l1122++, $l1123 += $l1141, $m_t(`Streaming stall detected: ${($l1141 / 1e3).toFixed(1)}s gap between events (stall #${$l1122})`, { level: "warn" }), $m_i("tengu_streaming_stall", { stall_duration_ms: $l1141, stall_count: $l1122, total_stall_time_ms: $l1123, event_type: $m_h($NEW_chunk_j0tbz6ra_js_ybe($l1139.type)), model: $m_Et($l11.model), request_id: $m_kg($l453) });
          }
          if ($l1121 = $l1140, $l1136) {
            if ($l490(), $m_t("Stream started - received first chunk"), $m_t(`[API:timing] first byte after ${Math.round($l12.monotonicNow() - $l449)}ms`), $m_Om("query_first_chunk_received"), !$l11.agentId && $l191) $m_Mg("first_chunk");
            $m_Gun(), $l1136 = false;
          }
          let $l1142 = $m_E7e($l1139), $l1143 = !$l1142 && $m_qdn($l1139);
          if ($l1142 || $l1143) $l631 = false;
          if ($l1142) {
            $l995.add($l1142.index), $l616[$l1142.index] = $m_T7e($l1142);
            let $l1144 = $l499;
            if ($m_i("tengu_rotunda_pennant_materialized", { armed: $l11.serverRefusalFallback !== void 0, mode: $m_h($l1144), block_index: $l1142.index, non_streaming: false }), $l1142.reason === "refusal") $m_iZ({ model: $l26, requestId: $l453 || void 0, querySource: $l11.querySource, effort: $l190, fastMode: $l630, attempt: $l450, attribution: $m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: true, agentContext: $l11.agentContext });
            if ($l11.serverRefusalFallback === void 0) continue;
            if ($m_Jve($l1142.reason)) $l659 = true;
            if ($l360 !== void 0) $l360 = { ...$l360, model: $l1142.model };
            for (let $l1145 of $l993.values()) $l1145.message.model = $l1142.model;
            if ($l993.size === 0) $l996 = $l1142;
            else if (!$m_Jve($l1142.reason)) $l660 = true, yield { type: "server_fallback", fromModel: $l1142.fromModel, toModel: $l1142.model, reason: $l1142.reason, apiRefusalCategory: $l1142.category, midStream: true, requestId: $l453 ?? null, refusedEffort: $l330(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: null };
            else {
              $l660 = true;
              let $l1146 = [];
              for (let [$l1147, $l1148] of $l993) if ($m_jdn($l1148)) $l1146.push($l1148), $l993.delete($l1147), delete $l616[$l1147];
              if ($l1146.length > 0) {
                let $l1149 = new Set($l1146);
                for (let $l1150 = $l608.length - 1; $l1150 >= 0; $l1150--) if ($l1149.has($l608[$l1150])) $l608.splice($l1150, 1);
                $l992 = true;
              }
              let $l1151 = [...$l993.entries()].sort(($l1152, $l1153) => $l1152[0] - $l1153[0]).map(([, $l1154]) => $l1154), $l1155 = $l1151.map(($l1156) => $l1156.message.content.map(($l1157) => $l1157.type === "text" ? $l1157.text : "").join("")).join("");
              yield { type: "server_fallback", fromModel: $l1142.fromModel, toModel: $l1142.model, reason: $l1142.reason, apiRefusalCategory: $l1142.category, midStream: true, requestId: $l453 ?? null, refusedEffort: $l330(), discardedMessages: $l1146, retainedMessages: $l1151, retainedText: $l1155, finalStopReason: null };
            }
            continue;
          }
          if ($l1143) {
            let $l1158 = $l1139.index;
            $l994.add($l1158), $l992 = true, $m_X("warn", "cli_malformed_fallback_block"), $m_i("tengu_rotunda_pennant_malformed", { block_index: $l1158, non_streaming: false }), $m_dn("refusal_fallback", "malformed_fallback_block", { non_streaming: false });
            continue;
          }
          if ($l1139.type === "content_block_stop" && $l994.has($l1139.index)) continue;
          switch ($l1139.type) {
            case "message_start": {
              if ($m_sx(typeof $l1139.message === "object" && $l1139.message !== null, $l1139, $m_b("message_start_without_message")), $l1111 = true, $l395(), $l840(), $l375(), $l360 = $l1139.message, $l360 !== void 0 && "resumable" in $l360) {
                let { resumable: $l1159, ...$l1160 } = $l360;
                $l360 = $l1160;
              }
              if ($l609 = Math.max(0, Math.round($l12.monotonicNow() - $l449)), $l292 = $m_Mwe($l292, $l1139.message?.usage), $l1139.message?.model) $m_Z2r($m_Pn($l11.model), $l1139.message.model);
              $l629 = $l1139.message.diagnostics?.cache_miss_reason ?? void 0, $l895($l1139.message);
              let $l1161 = $l903($l1139.message), $l1162 = $l887();
              if ($l1162) yield $l1162;
              let $l1163 = $l242();
              if ($l1163) yield $l1163;
              if ($l1161) yield $l1161;
              break;
            }
            case "content_block_start": {
              let $l1164 = typeof $l1139.content_block === "object" && $l1139.content_block !== null;
              if (!$l1164) $l620 = false;
              if ($m_sx($l1164, $l1139, $m_b("content_block_start_without_content_block")), $m_tpr({ previous: $l616[$l1139.index], closedContentBlocks: $l1109, started: $l1139.content_block })) throw $m_i("tengu_streaming_error", { error_type: $m_b("content_block_closed_start"), part_type: $m_h($l1139.type), part_index: $m_QTe($l1139) }), new $m_Lne("closed");
              switch ($l620 = false, $l610 ??= Math.max(0, Math.round($l12.monotonicNow() - $l449)), $l1139.content_block.type) {
                case "tool_use":
                  $l1139.content_block.name = $NEW_chunk_928ws1pg_js_Zqt($l1139.content_block.name), $l616[$l1139.index] = { ...$l1139.content_block, input: "" };
                  break;
                case "server_tool_use":
                  if ($l616[$l1139.index] = { ...$l1139.content_block, input: "" }, $l1139.content_block.name === $m_iIe) $l631 = true, $m_t("[AdvisorTool] Advisor tool called"), $m_i("tengu_advisor_tool_call", { model: $m_Et($l11.model), advisor_model: $m_Et($l48 ?? "unknown"), query_source: $m_os($l11.querySource) });
                  break;
                case "text":
                  $l616[$l1139.index] = { ...$l1139.content_block, text: "" };
                  break;
                case "thinking": {
                  let $l1165 = { ...$l1139.content_block, thinking: "", signature: "" };
                  $l616[$l1139.index] = $l1165, $m_npr($l1110, $l1165, $l12);
                  break;
                }
                default:
                  if ($l616[$l1139.index] = { ...$l1139.content_block }, $l1139.content_block.type === "advisor_tool_result") {
                    $l631 = false, $m_t("[AdvisorTool] Advisor tool result received");
                    let $l1166 = $m_Cxs($l1139.content_block);
                    if ($l1166 !== void 0) $m_t(`[AdvisorTool] Advisor tool result error: ${$l1166}`), $m_i("tengu_advisor_tool_error", { model: $m_Et($l11.model), advisor_model: $m_Et($l48 ?? "unknown"), error_code: $m_h($l1166), query_source: $m_os($l11.querySource) });
                    else $m_i("tengu_advisor_tool_result", { model: $m_Et($l11.model), advisor_model: $m_Et($l48 ?? "unknown"), query_source: $m_os($l11.querySource), stop_reason: $m_de($m_Rwo($l1139.content_block)) ?? $m_b("none") });
                  }
                  break;
              }
              if ($l1108 = $l1139.index, $l1139.content_block.type !== "thinking" && $l1139.content_block.type !== "redacted_thinking" && !$m_OV($l1139.content_block)) $l1107 = true;
              break;
            }
            case "content_block_delta": {
              let $l1167 = $l616[$l1139.index], $l1168 = $l1139.delta;
              if (!$l1167 || !$l1109.has($l1167)) $l620 = false;
              if (!$l1167 || $l1109.has($l1167)) throw $m_i("tengu_streaming_error", { error_type: $l1167 ? $m_b("content_block_closed_delta") : $m_b("content_block_not_found_delta"), part_type: $m_h($l1139.type), part_index: $m_QTe($l1139) }), new $m_Lne($l1167 ? "closed" : "unstarted");
              switch ($m_sx(typeof $l1168 === "object" && $l1168 !== null, $l1139, $m_b("content_block_delta_without_delta")), $m_sx(typeof $l1168.type === "string", $l1139, $m_b("content_block_delta_without_delta_type")), $l1168.type) {
                case "citations_delta":
                  if ($l1167.type !== "text") break;
                  $m_sx(typeof $l1168.citation === "object" && $l1168.citation !== null, $l1139, $m_b("citations_delta_without_citation")), $l1167.citations = [...$l1167.citations ?? [], $l1168.citation];
                  break;
                case "input_json_delta":
                  if ($l1167.type !== "tool_use" && $l1167.type !== "server_tool_use") throw $m_i("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_input_json"), expected_type: $m_b("tool_use"), actual_type: $m_h($l1167.type) }), new $m_Lne("unreadable");
                  if (typeof $l1167.input !== "string") throw $m_i("tengu_streaming_error", { error_type: $m_b("content_block_input_not_string"), input_type: $m_h(typeof $l1167.input) }), new $m_Lne("unreadable");
                  $m_sx(typeof $l1168.partial_json === "string", $l1139, $m_b("input_json_delta_without_partial_json")), $l1167.input += $l1168.partial_json;
                  break;
                case "text_delta":
                  if ($l1167.type !== "text") throw $m_i("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_text"), expected_type: $m_b("text"), actual_type: $m_h($l1167.type) }), new $m_Lne("unreadable");
                  $m_sx(typeof $l1168.text === "string", $l1139, $m_b("text_delta_without_text")), $l1167.text += $l1168.text;
                  break;
                case "signature_delta":
                  if ($l1167.type !== "thinking") throw $m_i("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_thinking_signature"), expected_type: $m_b("thinking"), actual_type: $m_h($l1167.type) }), new $m_Lne("unreadable");
                  $m_sx(typeof $l1168.signature === "string", $l1139, $m_b("signature_delta_without_signature")), $l1167.signature = $l1168.signature;
                  break;
                case "thinking_delta":
                  if ($l1167.type === "redacted_thinking") break;
                  if ($l1167.type !== "thinking") throw $m_i("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_thinking_delta"), expected_type: $m_b("thinking"), actual_type: $m_h($l1167.type) }), new $m_Lne("unreadable");
                  $m_sx(typeof $l1168.thinking === "string", $l1139, $m_b("thinking_delta_without_thinking")), $l1167.thinking += $l1168.thinking;
                  break;
              }
              break;
            }
            case "content_block_stop": {
              let $l1169 = $l616[$l1139.index];
              if (!$l1169 || !$l1109.has($l1169)) $l620 = false;
              if (!$l1169 || $l1109.has($l1169)) throw $m_i("tengu_streaming_error", { error_type: $l1169 ? $m_b("content_block_closed_stop") : $m_b("content_block_not_found_stop"), part_type: $m_h($l1139.type), part_index: $m_QTe($l1139) }), new $m_Lne($l1169 ? "closed" : "unstarted");
              if ($l1108 = null, !$l360) throw $m_i("tengu_streaming_error", { error_type: $m_b("partial_message_not_found"), part_type: $m_h($l1139.type) }), Error("Message not found");
              let { content: $l1170, batchToolUses: $l1171 } = $m_ton($m_Ten([$l1169], $l3, $l11.agentId, { requestId: $l453 ?? void 0, messageId: $l360.id }, $l11.storageV5), $l3, ($l1172, $l1173) => $m_mIt($l1172, $l1173, $l11.agentId, $l11.storageV5)), $l1174 = $l273 ? $m_q$e([$l1169]) : void 0;
              $l1128 ||= $l1174?.degraded === true;
              let $l1175 = $l1174?.inputs, $l1176 = $m_Q$e([$l1169], $l1175), $l1177 = $m_opr($l1110, $l1169, $l12), $l1178 = $m_Ffn($l1169, $l492), $l1179 = { message: { ...$l360, content: $l1170 }, ...$l1177 !== void 0 && { thinkingDurationMs: $l1177 }, ...$l1178 !== void 0 && { thinkingDisplay: $l1178 }, ...$l1171.length > 0 && { batchToolUses: $l1171 }, ...$l1175 !== void 0 && { wireToolInputs: $l1175 }, ...$l1176 !== void 0 && { wireIngestContext: $l1176 }, ...$l1176 !== void 0 && { wireIngestContext: $l1176 }, ...$l455 !== void 0 && $m_Uhe($l455), apiBlockIndex: $l1139.index, requestId: $l453 ?? void 0, requestRef: $l471, requestedModel: $l11.model, ...$m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), type: "assistant", uuid: $NEW_chunk_j0tbz6ra_js_jee(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...false, ...$l48 && { advisorModel: $l48 }, ...$l327 !== void 0 && { effort: $l327 }, perTurnEffort: $l328, perTurnTiming: $l329, ...{} };
              if ($NEW_chunk_j0tbz6ra_js_O4e($l28, $l1179), $l608.push($l1179), $l1127++, $l993.set($l1139.index, $l1179), $l1116 = Math.max($l1116, Number.isSafeInteger($l1139.index) && $l1139.index >= 0 ? $l1139.index + 1 : Number.NaN), $l1109.add($l1169), $l1179.message.content.some(($l1180) => !$m_OV($l1180))) {
                if ($l1106 = true, $l1179.message.content.some(($l1181) => $l1181.type !== "thinking" && $l1181.type !== "redacted_thinking" && !$m_OV($l1181))) $l1107 = true;
              }
              yield $l1179;
              break;
            }
            case "message_delta": {
              if ($l292 = $m_Mwe($l292, $l1139.usage), $l617 = $l1139.context_management ?? $l617, $m_sx(typeof $l1139.delta === "object" && $l1139.delta !== null, $l1139, $m_b("message_delta_without_delta")), $l455 !== void 0 && typeof $l1139.delta === "object" && $l1139.delta !== null && "safeguard_results" in $l1139.delta) $l458($l455, $l1139.delta, $l616);
              let $l1182 = $l11.serverRefusalFallback !== void 0 ? $m_cUn($l292) : void 0;
              if ($l1182?.servedFallbackModel !== void 0) $l659 = true, $l292 = $m_Cho($l292, $l1139.usage);
              let $l1183 = $m_v7e($l1139.delta.stop_details);
              {
                let $l1184 = $l1139.delta.stop_details;
                if ($l1184 && "fallback_credit_token" in $l1184) delete $l1184.fallback_credit_token;
              }
              if ($l1183 !== void 0 && !$l509) $l509 = true, $m_i("tengu_fallback_credit_minted", { request_id: $m_ye($l453), model: $m_Et($l11.model), fallback_target_model: $m_Et($l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l659 ? $l11.serverRefusalFallback.model : void 0)), token_length: $l1183.length, input_tokens: $l292.input_tokens, output_tokens: $l292.output_tokens, cache_read_input_tokens: $l292.cache_read_input_tokens, cache_creation_input_tokens: $l292.cache_creation_input_tokens, cache_creation_5m_input_tokens: $l292.cache_creation?.ephemeral_5m_input_tokens ?? 0, cache_creation_1h_input_tokens: $l292.cache_creation?.ephemeral_1h_input_tokens ?? 0, service_tier: $m_de($l292.service_tier), speed: $m_de($l292.speed), query_source: $m_os($l11.querySource), ...$l11.queryTracking && { query_chain_id: $m_ye($l11.queryTracking.chainId), query_depth: $l11.queryTracking.depth } });
              let $l1185 = typeof $l1139.delta.stop_reason === "string" ? $l1139.delta.stop_reason : null;
              if ($l1185 !== null) $l619 = $l1185, $l620 = true;
              let $l1186 = $l1139.delta;
              if ($l1186.diagnostics?.cache_miss_reason) $l629 = $l1186.diagnostics.cache_miss_reason;
              let $l1187 = $m_Ymn($l1139.delta) ?? $m_Ymn($l1139);
              for (let $l1188 of $l608) {
                if ($l1188.message.usage = $l292, $l1188.message.stop_reason = $l619, $l1185 !== null || $l619 === null) $l1188.message.stop_details = $l1139.delta.stop_details ?? null;
                if ($l432 && $l617) $l1188.message.context_management = $l617;
                if ($l1187 !== void 0) $l1188.message.resumable = $l1187;
              }
              if ($l619 !== null && $l621 !== "credited") {
                $l621 = "credited";
                let $l1189 = $l1182?.servedFallbackModel, $l1190 = $l1182 !== void 0 && $l1189 !== void 0, $l1191 = $l1190 ? $m_R7e($l1182.entries, { speed: $l292.speed, inferenceGeo: $l292.inference_geo, serverToolUse: $l292.server_tool_use }, $l619) : $m_Hke($l26, $l292), $l1192 = $l1190 ? $m_uUn($l11.serverRefusalFallback?.model, $l1189) : $l11.model;
                $l618 += $m_i3e($l1191, $l292, $l1192, $l11.querySource, $l190, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool);
              } else if ($l621 === "none") $l621 = "pending";
              if ($l1185 === "refusal" && !$l1104) $l1104 = true, $m_iZ({ model: $l26, requestId: $l453 || void 0, querySource: $l11.querySource, effort: $l190, fastMode: $l630, attempt: $l450, attribution: $m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: false, stopDetails: $l1139.delta.stop_details ?? null, agentContext: $l11.agentContext });
              if ($l11.serverRefusalFallback !== void 0) {
                let $l1193 = $l996;
                if ($l996 = void 0, $l1193 !== void 0) {
                  if (!$l660) $l660 = true, yield { type: "server_fallback", fromModel: $l1193.fromModel, toModel: $l1193.model, reason: $l1193.reason, apiRefusalCategory: $l1193.category, midStream: false, requestId: $l453 ?? null, refusedEffort: $l330(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: $l619 };
                } else if (!$l660 && $l1182?.servedFallbackModel !== void 0) $l660 = true, yield { type: "server_fallback", fromModel: $l11.model, toModel: $l1182.servedFallbackModel, reason: "sticky", apiRefusalCategory: null, midStream: false, requestId: $l453 ?? null, refusedEffort: $l330(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: $l619 };
              }
              let $l1194 = $l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l659 ? $l11.serverRefusalFallback.model : void 0), $l1195 = $l11.refusalFallbackModelLane === "silent", $l1196 = $l11.refusalFallbackCascadeHop, $l1197 = $l1185 === "refusal" && $l1194 !== void 0 && !$l1195 && $l1196 === void 0 ? $m_mDo({ originalModelCanonical: $m_qe($l11.model), armedFallbackModel: $l1194, apiRefusalCategory: $l1139.delta.stop_details?.category ?? null, armedTargetIsRefusingModel: $m_wht($l11.model, $l1194), resolveTarget: ($l1198) => $m_TFt({ mappedTarget: $l1198, armedFallbackModel: $l1194, refusingModel: $l11.model, triedModels: [$m_vht($l11.model)] }), routesOverride: $NEW_chunk_bbw420pv_js_o1r() }) : void 0, $l1199 = $l1197 !== void 0 ? $l1197.model : $l1194;
              if ($l1197 !== void 0) $m_BLr({ route: $l1197, model: $l11.model, armedFallbackModel: $l1194, apiRefusalCategory: $l1139.delta.stop_details?.category, requestId: $l453 });
              let $l1200 = $l1197?.matched === "none" && $l1139.delta.stop_details?.category === "bio" && !$m_DK(), $l1201 = $l1185 === "refusal" && ($l1194 === void 0 || $l1200) ? $l11.refusalFallbackSilentRearm?.($l1200, $l1139.delta.stop_details?.category ?? null, $m_TDo($l477?.headers)) : void 0, $l1202 = $l1199 ?? $l1201;
              if ($l1185 === "refusal" && $l1202 !== void 0) {
                $l760(), yield { type: "fallback_request", trigger: "refusal", originalModel: $l11.model, fallbackModel: $l1202, requestId: $l453 ?? null, refusedEffort: $l330(), apiRefusalCategory: $l1139.delta.stop_details?.category ?? null, apiRefusalExplanation: $l1139.delta.stop_details?.explanation ?? null, creditCode: $l1183 ?? null, mintedStateless: !$l437, ...$l1201 !== void 0 && { silentArmAtTrigger: true }, ...$m_pDo($l1197, $l1196) };
                return;
              }
              let $l1203 = $m_bIt($l1185, $l1139.delta.stop_details, $l453, $l659 ? $l1182?.servedFallbackModel ?? $l360?.model ?? $l11.model : $l11.model, $l360?.id);
              if ($l1203) {
                let $l1204 = $m_DK() || $m_wG() !== void 0;
                if ($l1194 !== void 0 || $l11.refusalFallbackModel !== void 0 || $m_Sht($l11.model) && $m_mW() || $m_ydn() || $l1204) $m_m("refusal_fallback", $l1197?.matched === "none" ? "route_declined" : $l659 ? "server_chain_exhausted" : $l1204 ? "client_chain_exhausted" : $m_Sht($l11.model) && $m_GLr() ? "disabled_by_config" : "not_armed", { convolute_arcades: $m_hdn(), arm_source: $m_h($m_gMe()), armed: $l1194 !== void 0, model_scope: $m_h($m__J($l11.model)) });
                yield { type: "refusal_no_fallback", originalModel: $l11.model, requestId: $l453 ?? null, apiRefusalCategory: $l1139.delta.stop_details?.category ?? null, apiRefusalExplanation: $l1139.delta.stop_details?.explanation ?? null }, yield $l1203;
              }
              let $l1205 = $m_Vmn($l1185, $l626, $l292.output_tokens);
              if ($l1205 !== void 0) yield $l1205;
              break;
            }
            case "message_stop":
              if ($l1111 = false, $l455 !== void 0 && $m_dqt($l455)) $l456({ kind: "none", why: "server_no_result" });
              if ($l1128) $m_K$e();
              if ($l621 === "pending") $l622();
              $l510("stream_completed", $l453 ?? null, $l292);
              break;
          }
          if ($l1139.type === "content_block_stop" && $l995.has($l1139.index)) continue;
          $l1105 = true;
          let $l1206 = $m_$fn($l1139, $l492), $l1207 = $l1112 || $l1139.type === "message_start";
          if ($l1139.type === "message_start") $l1112 = true, $l1113 = null, $l1114 = false, $l1115 = typeof $l1139.message.id === "string" && $l1139.message.id !== "" ? $l1139.message.id : null;
          else if ($l1139.type === "content_block_start") $l1113 = $l1139.index, $l1114 = $NEW_chunk_j0tbz6ra_js_dkr.has($l1139.content_block.type);
          else if ($l1139.type === "content_block_stop") $l1113 = null, $l1114 = false;
          else if ($l1139.type === "message_stop") $l1112 = false, $l1113 = null, $l1114 = false;
          yield { type: "stream_event", event: $l1139, ...$l1139.type === "message_start" ? { ttftMs: $l609, ...$l612 ? { requestSentAtMs: $l612 } : void 0, ...$l613 ? { requestSentWallMs: $l613 } : void 0 } : void 0, ...$l1206 !== void 0 ? { thinkingDisplay: $l1206 } : void 0, ...$l1207 && $l1115 !== null ? { apiMessageId: $l1115 } : void 0 };
        }
        if ($l998(), $l4.aborted) {
          yield* $l1133();
          return;
        }
        if ($l1021) {
          let $l1208 = $l1022 !== null ? Math.round($l12.monotonicNow() - $l1022) : -1;
          throw $m_X("info", "cli_stream_loop_exited_after_watchdog_clean"), $m_i("tengu_stream_loop_exited_after_watchdog", { request_id: $m_kg($l453), exit_delay_ms: $l1208, exit_path: $m_b("clean"), model: $m_Et($l11.model) }), $l1022 = null, Error("Stream idle timeout - no chunks received");
        }
        if ($l1019 !== void 0) throw $l1019;
        if ($l1111 && $l1108 !== null) throw $m_t(`Stream ended cleanly inside open block ${$l1108} (stop_reason=${$l619}) \u2014 treating as a dropped connection`, { level: "error" }), new $m_N1r();
        if (!$l360 || $l608.length === 0 && !$l619) throw $m_t(!$l360 ? "Stream completed without receiving message_start event - triggering non-streaming fallback" : "Stream completed with message_start but no content blocks completed - triggering non-streaming fallback", { level: "error" }), $m_i("tengu_stream_no_events", { model: $m_Et($l11.model), request_id: $m_kg($l453), ...$m_V_e(void 0, $l482), ms_since_request: Math.round($l12.monotonicNow() - $l449) }), new $m_pmn();
        if ($l1111 && !($l619 !== null && $l620)) throw $m_t(`Stream ended cleanly mid-response (stop_reason=${$l619}, terminal=${$l620}) \u2014 treating as a dropped connection`, { level: "error" }), new $m_N1r();
        try {
          let $l1209 = $m_qs(), $l1210 = $l1209.hasFired("stream_text_delivery_bad"), $l1211 = $l1209.hasFired("stream_text_delivery_ok");
          if ($l619 !== null && !$l992 && (!$l1210 || !$l1211)) {
            if (!$l1210) for (let [$l1212, $l1213] of $l616.entries()) {
              if (!$l1213 || $l1213.type !== "text") continue;
              if ($l1213.text.trim().length > 0 && !$l993.has($l1212) && !$l994.has($l1212)) {
                $l1209.markFired("stream_text_delivery_bad"), $m_m("api_stream_text_delivery", "text_block_unyielded", { had_tool_use: $l616.some(($l1214) => $l1214?.type === "tool_use"), dropped_block_index: $l1212 });
                break;
              }
            }
            if (!$l1211) {
              let $l1215 = $l616.some(($l1216, $l1217) => $l1216?.type === "text" && $l1216.text.trim().length > 0 && $l993.has($l1217)), $l1218 = $l616.some(($l1219, $l1220) => $l1219?.type === "tool_use" && $l993.has($l1220));
              if ($l1215 && $l1218) $l1209.markFired("stream_text_delivery_ok"), $m_NRs("api_stream_text_delivery");
            }
          }
          if ($l619 !== null) $l793($l292);
          $l800($l292);
        } catch {
        }
        if ($l1122 > 0) $m_t(`Streaming completed with ${$l1122} stall(s), total stall time: ${($l1123 / 1e3).toFixed(1)}s`, { level: "warn" }), $m_i("tengu_streaming_stall_summary", { stall_count: $l1122, total_stall_time_ms: $l1123, model: $m_Et($l11.model), request_id: $m_kg($l453) });
        $m_k1s({ returnAfterIdle: $l432 ? $l430?.returnAfterIdle : void 0, contextManagement: $l617, usage: $l292, querySource: $l11.querySource, agentId: $l11.agentId }), $m_n1s($l11.querySource, $l292.cache_read_input_tokens, $l292.cache_creation_input_tokens, $l0, $l11.agentId, $l453, $l25, $l191);
        let $l1221 = $l477;
        if ($l1221) {
          $m_f6n($l480, $l481), $m_iCs($l1221.headers, $m_rs($l11.querySource) !== "auxiliary", $l481, $l319);
          let $l1222 = ($m_Af($l11.model) || $m_dT($l11.model)) && $l292.input_tokens + $l292.cache_read_input_tokens + $l292.cache_creation_input_tokens > $m_x2, $l1223 = $m_Xbo($l1221.headers, $l11.model, $l1222, $l481, $l319, $l11.storageV5);
          if ($l1223 && $l11.queryTracking) $l11.queryTracking.answeredQuerySource = $l11.querySource, $l11.queryTracking.billedToUsageCredits = $l1223.overageInUse === true, $l11.queryTracking.longContextBilled = $l1222;
          $m_qpn($l1221.headers, $l11, $l630), $l627 = $l1221.headers;
        }
      } catch ($l1224) {
        let $l1225 = $l1019 !== void 0 && !$l1021 && !$l4.aborted && $l1224 instanceof $m_cu ? $l1019 : $l1224;
        $l998(), $l490();
        {
          let $l1226 = $l1131();
          if ($l1226) yield $l1226;
        }
        if (!$l1021 && $l1225 instanceof $m_I6n) $l1021 = true, $l1022 = $l12.monotonicNow(), $m_t(`Streaming idle timeout (byte-level): ${$l1225.message}, aborting stream`, { level: "error" }), $m_X("error", "cli_streaming_idle_timeout"), $m_i("tengu_streaming_idle_timeout", { model: $m_Et($l11.model), request_id: $m_kg($l453), timeout_ms: $l1225.idleMs, tier: $m_b("byte"), bytes_received_before_stall: $l1225.bytesReceived, time_to_first_byte_ms: $l1225.ttfbMs, body_read_pending: $l1225.bodyReadPending, slept_ms: $l1225.sleptMs, cf_ray: $m_ye($l1225.cfRay) });
        if ($l1021 && $l1022 !== null) {
          let $l1227 = Math.round($l12.monotonicNow() - $l1022);
          $m_X("info", "cli_stream_loop_exited_after_watchdog_error"), $m_i("tengu_stream_loop_exited_after_watchdog", { request_id: $m_kg($l453), exit_delay_ms: $l1227, exit_path: $m_b("error"), error_name: $l1225 instanceof Error ? $m_oU($l1225) ?? $m_b("Error") : $m_b("unknown"), model: $m_Et($l11.model) });
        }
        let $l1228 = { events_received: $l611, ms_to_first_event: $l1124, ms_since_last_event: $l1121 === null ? null : $l12.now() - $l1121 }, $l1229 = ($l1230, $l1231) => $m_X("warn", "cli_stream_failed", () => ({ ...$m_mL($l1231, $m_jpe($l1231), $l482), fallback_cause: $l1230, watchdog_fired: $l1021, slept_ms: $l1225 instanceof $m_I6n || $l1225 instanceof $m_PFt ? $l1225.sleptMs : null, client_request_id: $m_ye($l476) ?? null, model: $m_Et($l11.model) ?? null, stream: { ...$l1228, first_event_type: $l1125 === null ? null : $NEW_chunk_j0tbz6ra_js_ybe($l1125), last_event_type: $l1126 === null ? null : $NEW_chunk_j0tbz6ra_js_ybe($l1126), message_envelope_open: $l1111, stop_reason_received: $l619 !== null, content_blocks_completed: $l1127, any_event_yielded: $l1105, ms_since_request: Math.round($l12.monotonicNow() - $l449), ms_to_headers: $l482?.latencyMs ?? null, stalls_over_30s: $l1122, stall_ms_total: $l1123 }, route: $m_zlt() }));
        if ($l1225 instanceof $m_cu) {
          if ($l4.aborted) throw yield* $l1133(), $m_t(`Streaming aborted by user: ${$m_awo($l1225)}`), $l1225;
          else if (!$l1021) {
            $m_t(`Streaming timeout (SDK abort): ${$l1225.message}`, { level: "error" });
            let $l1232 = new $m_OA({ message: "Request timed out" });
            throw $l1229("sdk_timeout", $l1232), $l1232;
          }
        }
        let $l1233 = $m_Pg($l1225), $l1234 = $l1233 !== null && $m_q2.has($l1233.code), $l1235 = $l1233 !== null && ($l1234 || $m_n1.has($l1233.code)), $l1236 = $l326?.classifyStreamError($l1225) ?? false, $l1237 = $l1225 instanceof $m_Lne || $l1225 instanceof SyntaxError, $l1238 = $l1225 instanceof $m_Lne && $l1225.blockState === "unstarted", $l1239 = $l1238 ? "event referenced an unstarted content block" : $l1225 instanceof $m_Lne && $l1225.blockState === "closed" ? "event referenced an already-closed content block" : "event could not be read", $l1240 = $m_w3s({ connDetails: $l1233, isStaleConnection: $l1234, isContextHintSse: $l1236, streamIdleAborted: $l1021, noEvents: $l1225 instanceof $m_pmn, malformedStream: $l1225 instanceof $m_Lne }), $l1241 = $m_oU($l1225) ?? null, $l1242 = $m_Tce($l1233?.code) ?? null, $l1243 = $l1225 instanceof Error ? $l1241 ?? $m_b("none") : $m_h(typeof $l1225), $l1244 = $l1225 instanceof Error ? $NEW_chunk_fs43t96t_js_Oss($l1225.constructor?.name) ?? $m_b("none") : $m_b("none"), $l1245 = $l1242 ?? $m_b("none"), $l1246 = ($m_k("tengu_watchdog_skip_nonstreaming_fallback", false) || $m_a.CLAUDE_CODE_REMOTE) && $l1021 || $m_a.CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK || $m_k("tengu_disable_streaming_to_non_streaming_fallback", false), $l1247 = $l1021 ? Error($l608.length > 0 ? "Stream idle timeout - partial response received" : "Stream idle timeout - no chunks received") : $l1225, $l1248 = $l1247 instanceof Error ? $m_oU($l1247) ?? $m_b("Error") : $m_h(typeof $l1247);
        $l1229($l1240, $l1225 instanceof $m_cu ? $l1247 : $l1225);
        let $l1249 = $m_GW($l1225) || $m_yJe($l1225) || $l1225 instanceof $m_Ot && ($l1225.type === "api_error" || $l1225.type === "timeout_error"), $l1250;
        if ($m_Q7e($l1225)) $l1250 = "dlpDenied";
        else if ($m_Mze($l1225)) $l1250 = "escapeMonitor";
        let $l1251 = $m_ZP($l1225), $l1252 = $l646 !== null && !$l645 && $l1233 !== null && !$l1105, $l1253 = $m_Imn({ error: $l1225, isServerError: $l1249, stalled: $l1021, isConnectionError: $l1235 || $l1252, suspended: $m_umn($l1225), truncated: $l1233?.code === "StreamTruncated", malformed: $l1237, denied: $l1250 !== void 0, outputFiltered: $l1251, anyEvent: $l1105, anyBlockFinished: $l1106, anyOutputShown: $l1107, stopReasonReceived: $l619 !== null, outlastedNonStreamingTimeout: $l12.monotonicNow() - $l449 >= $NEW_chunk_j0tbz6ra_js_lSn(), complete: $l619 !== null && $l620 && $l1108 === null }), $l1254 = $l1253 === void 0 ? "keepPartial" : $l644.onStreamFailed($l1253, !$l1246), $l1255 = $l644.counts(), $l1256 = $l1253?.progress === "thinkingOnly" && $l1253.cause === "overloaded" && !$l1253.stopReasonReceived;
        if ($l1254 === "useFallbackModel" && ($l1253?.cause === "serverError" || $l1253?.cause === "timedOut") && $l11.fallbackModel) {
          if (!$l1107) $m_D2($l608, $l26);
          if ($l1111) $l622(), $l289();
          throw $m_i("tengu_api_model_not_found_fallback_triggered", { original_model: $m_Et($l11.model), fallback_model: $m_Et($l11.fallbackModel), provider: $m_gA(), reason: $l1253.cause === "timedOut" ? $m_b("timed_out") : $m_b("server_error"), source: $m_b("mid_stream") }), new $m_pD($l11.model, $l11.fallbackModel, "server_error", $l1225);
        }
        if ($l1253 === void 0 || $l1253.progress === "output" || $l1253.progress === "thinkingOnly" && !$l1256) {
          let $l1257 = $l1249 && $l1107, $l1258 = $l1249 && $l1254 === "retry";
          if ($l1254 !== "fail") {
            $l491();
            let $l1259 = $l1021, $l1260 = $l608.some(($l1261) => $l1261.message.content.some(($l1262) => $l1262.type === "tool_use"));
            if ($l1254 === "retry") {
              if (!$l1107) $m_D2($l608, $l26);
              if ($l1259) $m_t(`Stream idle timeout after thinking-only yield \u2014 retrying streaming (${$l1255.stalls}/${$NEW_chunk_j0tbz6ra_js_Zet})`, { level: "warn" }), $m_i("tengu_streaming_watchdog_retry", { model: $m_Et($l11.model), retry_attempt: $l1255.stalls, request_id: $m_ye($l453), after_thinking_only: true });
              else $m_t(`Stream ${$l1237 ? $l1239 : $l1258 ? "server error" : `connection closed (${$l1233?.code})`} after thinking-only yield \u2014 retrying streaming (${$l1255.afterThinkingOnly}/${$l1253?.cause === "timedOut" ? $NEW_chunk_j0tbz6ra_js_ykn : $NEW_chunk_j0tbz6ra_js_ett})`, { level: "warn" }), $m_i("tengu_streaming_stale_connection_retry", { model: $m_Et($l11.model), error_code: $l1237 ? $m_b("malformed_stream") : $l1258 ? $l1253?.cause === "timedOut" ? $m_b("timed_out") : $m_b("server_error") : $m_sJn($l1233?.code ?? ""), retry_attempt: $l1255.afterThinkingOnly, request_id: $m_ye($l453), after_thinking_only: true });
              if ($l510("attempt_errored", $l453 ?? null, null), $l622(), $l289(), yield* $l1117({ responseUnfinished: true }), $l453 = null, $l1258) await $m_Y($m_PF($l1255.afterThinkingOnly, void 0, void 0, $l11.random), $l4, { clock: $l12 });
              else if (!$l1259) await $m_Y(100 * $l1255.afterThinkingOnly, $l4, { clock: $l12 });
              continue e;
            }
            let $l1263 = $l619 !== null, $l1264 = $l1233?.code === "StreamSuspended", $l1265 = $l1264 && !$m_Mf(), $l1266 = $l1259 ? "watchdog" : $l1257 ? $l1225 instanceof $m_Ot && $l1225.type === "timeout_error" ? "timed_out" : "server_error" : $l1237 ? "malformed_stream" : $l1264 ? "stream_suspended" : $l1233?.code === "StreamTruncated" ? "stream_truncated" : $l1233 !== null && $m_n1.has($l1233.code) ? "network_down" : "stale_connection", $l1267 = $m_h($l1266);
            if ($l1263 && $l620 && $l1108 === null) {
              $m_t(`Stream ${$l1259 ? "stalled" : `connection closed (${$l1233?.code ?? "unknown"})`} after message_delta (stop_reason=${$l619}) \u2014 response already complete, no truncation`, { level: "info" }), $m_i("tengu_streaming_close_after_complete", { model: $m_Et($l11.model), blocks_yielded: $l608.length, cause: $l1267, error_code: $l1233 ? $m_sJn($l1233.code) : $m_b("none"), request_id: $m_ye($l453) }), $l510("stream_completed", $l453 ?? null, $l292), yield* $l1117({ responseUnfinished: false });
              break e;
            }
            let $l1268 = $l1260 ? "tool_use" : "end_turn";
            $l619 = $l1268;
            for (let $l1269 of $l608) $l1269.message.usage = $l292, $l1269.message.stop_reason = $l1268;
            $l340?.noteClientTruncated($l608[0]?.message.id), $m_t($l1259 ? `Stream idle timeout after ${$l608.length} block(s) yielded \u2014 finalizing partial response` : $l1257 ? `Mid-stream server error after ${$l608.length} block(s) yielded \u2014 finalizing partial response` : $l1237 ? `Stream ${$l1239} after ${$l608.length} block(s) yielded \u2014 finalizing partial response` : `Stream connection closed (${$l1233?.code}) after ${$l608.length} block(s) yielded \u2014 finalizing partial response`, { level: "warn" }), $m_i("tengu_streaming_partial_finalized", { model: $m_Et($l11.model), blocks_yielded: $l608.length, has_output: $l1107, synthesized_stop_reason: $m_h($l1268), cause: $l1267, request_id: $m_ye($l453) }), $l622(), yield* $l1117({ responseUnfinished: true });
            let $l1270 = $m_Fs({ content: $l1107 ? $l1259 ? `${$m_Ll}: The response stopped arriving. The response above may be incomplete.` : $l1257 ? `${$m_Ll}: Server error mid-response. The response above may be incomplete.` : $l1237 ? $l1238 ? `${$m_Ll}: Part of the response never arrived. The response above may be incomplete.` : `${$m_Ll}: The response stream was malformed. The response above may be incomplete.` : $l1265 ? `${$m_Ll}: Your computer went to sleep mid-response. The response above may be incomplete.` : `${$m_Ll}: Connection lost mid-response. The response above may be incomplete.` : $l1259 ? `${$m_Ll}: The response stalled before a response was produced. Try again.` : $l1237 ? $l1238 ? `${$m_Ll}: Part of the response never arrived and no response was produced. Try again.` : `${$m_Ll}: The response stream was malformed and no response was produced. Try again.` : $l1265 ? `${$m_Ll}: Your computer went to sleep before a response was produced. Try again.` : `${$m_Ll}: Connection lost before a response was produced. Try again.`, error: "server_error", truncatedAfterOutput: $l1107 && !$l1260 ? true : void 0 });
            if ($l1270.streamCutCause = $l1266, $l1259 && !$l1107) $l1270.streamWatchdogGaveUp = true;
            yield $l1270;
            break e;
          }
          throw $m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $l1248, attemptNumber: $l450, maxOutputTokens: $l626, thinkingType: $m_h($l35.type), fallback_disabled: $l1246, request_id: $m_kg($l453), fallback_cause: $m_b("partial_yield"), any_stream_event_yielded: $l1105, has_output: $l1107, died_of: $m_h($l1253?.cause ?? "complete") }), $l1247;
        }
        if ($l1253?.cause === "outputFiltered") {
          if ($l1111) $l622();
          if ($l1254 === "retry") {
            if ($m_t(`Output content filter stopped the response before any of the answer was shown: retrying streaming (${$l1255.outputFiltered}/${$m_GTe})`, { level: "warn" }), $m_i("tengu_streaming_output_filter_retry", { model: $m_Et($l11.model), retry_attempt: $l1255.outputFiltered, request_id: $m_kg($l453), first_stop_progress: $m_h($l1253.progress) }), $l641 = { firstStopProgress: $l1253.progress, msToFirstStop: Math.round($l12.monotonicNow() - $l449), startedAt: $l12.monotonicNow(), ended: void 0 }, $l491(), $l510("attempt_errored", $l453 ?? null, null), $l1111) $l289();
            yield* $l1117({ responseUnfinished: true }), $l453 = null;
            continue e;
          }
          throw $m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $m_b("output_content_filtered"), attemptNumber: $l450, maxOutputTokens: $l626, thinkingType: $m_h($l35.type), fallback_disabled: true, request_id: $m_kg($l453), fallback_cause: $m_b("output_content_filtered"), any_stream_event_yielded: $l1105 }), $l1225;
        }
        if ($l1252) {
          if ($l645 = true, $m_t(`[dispatch] Stream connection error (${$l1233.code}) with ${$m_fy}=${$l646} before first event; ${$l1254 === "retry" ? "retrying once" : "going on"} with ${$m_fy}=${$m_qb}`, { level: "warn" }), $m_i("tengu_dispatch_header_fallback", { model: $m_Et($l11.model), dispatch: $l646 ?? void 0, resend_dispatch: $m_h($m_qb), reason: $m_b("body_phase"), status: $m_b("none"), error_code: $m_sJn($l1233.code), query_source: $m_os($l11.querySource), request_id: $m_ye($l453) }), $l1254 === "retry") {
            $l491(), $l510("attempt_errored", $l453 ?? null, null), $l453 = null;
            continue e;
          }
        }
        let $l1271 = $l1235 && $l1233 !== null ? { label: `connection error (${$l1233.code})`, errorCode: $m_sJn($l1233.code), error: new $m_Zu({ cause: $l1225 instanceof Error ? $l1225 : void 0 }), attempt: Math.max(1, $l1255.retries), limit: $l643 } : $l1253?.cause === "serverError" && $l1225 instanceof $m_Ot ? { label: "server error", errorCode: $m_b("server_error"), error: $l1225, attempt: $l1255.afterThinkingOnly, limit: $NEW_chunk_j0tbz6ra_js_ett } : void 0;
        if ($l1254 === "retry" && $l1271 !== void 0) {
          let $l1272 = $l1271.attempt;
          if ($m_t(`Stream ${$l1271.label} \u2014 retrying streaming (${$l1272}/${$l1271.limit})`, { level: "warn" }), $m_i("tengu_streaming_stale_connection_retry", { model: $m_Et($l11.model), error_code: $l1271.errorCode, retry_attempt: $l1272, request_id: $m_kg($l453) }), $l491(), $l510("attempt_errored", $l453 ?? null, null), $l1111) $l289();
          if ($l1111 && $l621 !== "credited") $l622(), yield* $l1117({ responseUnfinished: true });
          $l453 = null;
          let $l1273 = $m_PF($l1272, void 0, void 0, $l11.random), $l1274 = { ...$m_aJn($l1271.error), rateLimits: null };
          $l639 = true, $l11.onRetryStatus?.({ kind: "retrying", error: $l1274, attempt: $l1272, maxRetries: $l1271.limit, retryInMs: $l1273, deadline: $l12.now() + $l1273 }), yield $m_N2($l1274, $l1273, $l1272, $l1271.limit, "connection_retry"), await $m_Y($l1273, $l4, { clock: $l12 });
          continue e;
        }
        if ($l1235 && $l619 === null && $l1111) $l622();
        if ($l1021 && $l1254 === "retry") {
          $m_t(`Stream idle timeout before first event \u2014 retrying streaming (${$l1255.stalls}/${$NEW_chunk_j0tbz6ra_js_Zet})`, { level: "warn" }), $m_i("tengu_streaming_watchdog_retry", { model: $m_Et($l11.model), retry_attempt: $l1255.stalls, request_id: $m_kg($l453) }), $l491(), $l510("attempt_errored", $l453 ?? null, null), $l453 = null;
          continue e;
        }
        if (!$l1107 && $l619 === null && !$l644.outOfApiAttempts() && $l745($l1225) !== void 0) {
          if ($l644.undoLastCount(), $l1111) $l622(), $l289();
          $l491(), $l510("attempt_errored", $l453 ?? null, null), yield* $l1117({ responseUnfinished: true }), $l453 = null;
          continue e;
        }
        if ($l1250 === "dlpDenied") throw $m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $m_b($m_nDe), attemptNumber: $l450, maxOutputTokens: $l626, thinkingType: $m_h($l35.type), fallback_disabled: true, request_id: $m_kg($l453), fallback_cause: $m_b($m_nDe), any_stream_event_yielded: $l1105 }), $l1225;
        if ($l1250 === "escapeMonitor") throw $m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $m_b($m_Dne), attemptNumber: $l450, maxOutputTokens: $l626, thinkingType: $m_h($l35.type), fallback_disabled: true, request_id: $m_kg($l453), fallback_cause: $m_b($m_Dne), any_stream_event_yielded: $l1105 }), $l1225;
        if ($l1225 instanceof $m_Ot && $m_GW($l1225)) {
          let $l1275 = $l1107 ? null : $m_DLr($l1225, { markedAtDispatch: $l479, querySource: $l11.querySource, wait: $l480 }), $l1276 = $l644.outOfApiAttempts() ? null : $l1275;
          if (!$l1107) {
            if ($l1111) $l622(), $l289();
            let $l1277 = $l1255.overloaded;
            if ($l1276 !== null || $l1254 === "retry") {
              if ($m_D2($l608, $l26), $m_t($l1276 !== null ? `Mid-stream 529 before content at lower priority \u2014 waiting ${$l1276.delayMs}ms for capacity (attempt ${$l1276.attempt})` : `Mid-stream 529 before content \u2014 retrying streaming (${$l1277}/${$m_dZ})`, { level: "warn" }), $l1276 !== null) $l644.undoLastCount();
              $m_i("tengu_streaming_529_retry", { model: $m_Et($l11.model), retry_attempt: $l1276 !== null ? $l1276.attempt : $l1277, request_id: $m_ye($l453), ...$l1276 !== null && { is_low_priority: true } }), $l491(), $l510("attempt_errored", $l453 ?? null, null), yield* $l1117({ responseUnfinished: true }), $l453 = null, $l639 = true;
              let $l1278 = $l1276?.delayMs ?? $m_PF($l1277, void 0, void 0, $l11.random);
              $l11.onRetryStatus?.($l1276 !== null ? { kind: "low_priority_waiting", attempt: $l1276.attempt, retryInMs: $l1278, deadline: $l12.now() + $l1278 } : { kind: "retrying", error: { ...$m_aJn($l1225), rateLimits: null }, attempt: $l1277, maxRetries: $m_dZ - 1, retryInMs: $l1278, deadline: $l12.now() + $l1278 }), await $m_Y($l1278, $l4, { clock: $l12 });
              continue e;
            }
            if ($l11.fallbackModel && $l1254 === "useFallbackModel") throw $m_D2($l608, $l26), $m_i("tengu_api_opus_fallback_triggered", { original_model: $m_Et($l11.model), fallback_model: $m_Et($l11.fallbackModel), provider: $m_gA(), source: $m_b("mid_stream") }), $m_dn("api_request", "api_request_fallback_triggered"), new $m_pD($l11.model, $l11.fallbackModel, "overloaded", $l1225);
          }
        }
        if ($l1254 === "fail") throw $m_t(`Error streaming (non-streaming fallback disabled): ${$m_awo($l1247)}`, { level: "error" }), $m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $l1248, attemptNumber: $l450, maxOutputTokens: $l626, thinkingType: $m_h($l35.type), fallback_disabled: true, request_id: $m_kg($l453), fallback_cause: $m_h($l1240), error_name: $l1243, error_constructor: $l1244, error_code: $l1245, any_stream_event_yielded: $l1105 }), $l624 = true, $l640 = $l1021, $l1247;
        if (!$l1107) $m_D2($l608, $l26);
        if ($m_t(`Error streaming, falling back to non-streaming mode: ${$m_awo($l1247)}`, { level: "error" }), $l623 = true, $l614) $m_B7t("non_streaming");
        if ($l360 !== void 0) $l289();
        $l291 = $l12.now();
        {
          let $l1279 = await $l326?.onStreamFallback($l236, $l453 ?? void 0);
          if ($l1279) $l236 = $l255($l1279.messages, "microcompact"), $l943($l1279.clearedIds, $l1279.clearedContent);
        }
        if ($m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $l1248, attemptNumber: $l450, maxOutputTokens: $l626, thinkingType: $m_h($l35.type), fallback_disabled: false, request_id: $m_kg($l453), fallback_cause: $m_h($l1240), error_name: $l1243, error_constructor: $l1244, error_code: $l1245, any_stream_event_yielded: $l1105 }), $m_X("info", "cli_nonstreaming_fallback_started"), $m_i("tengu_nonstreaming_fallback_started", { request_id: $m_kg($l453), model: $m_Et($l11.model), fallback_cause: $m_h($l1240) }), $l510("attempt_errored", $l453 ?? null, null), $l469 = $l453, $l453 = null, yield* $l1117({ responseUnfinished: true }), yield* $l946(), yield { type: "streaming_fallback_began", cause: $l1240 }, yield* $l947({ requestId: $m_q_e($l469), analyticsRequestId: $m_kg($l469), cause: $l1240, errorName: $l1241, connectionCode: $l1242, stall: $l1228 }, $l1249 && ($l1253?.outlastedNonStreamingTimeout ?? false))) return;
      } finally {
        if ($l998(), $l455 !== void 0) $m_Bqe($l455);
      }
      $l510("stream_completed", $l453 ?? null, $l619 !== null ? $l292 : null), yield* $l1117({ responseUnfinished: false });
      break e;
    }
    if ($l340?.settle({ kind: "ok" }, $l453, $l360?.id), $l641 !== void 0) $l641.ended = "completed";
  } catch ($l1280) {
    if (yield* $l946(), $l510($l4.aborted ? "aborted" : "attempt_errored", $l453 ?? null, null), $l1280 instanceof $m_pD) throw $l644.reportHttpFailure($l1280.originalError, "useFallbackModel", { fallbackModelCouldHelp: $l1280.reason !== "overloaded" }), $l340?.settle({ kind: "error", error: $l1280 }, $l453), $l1280;
    let $l1281 = $l1280 instanceof $m_Wc ? $l1280.originalError : void 0, $l1282 = ($l1281 === void 0 ? "fail" : $l644.onWithRetryGaveUp($l1281)) === "retryWithoutStreaming", $l1283 = $l1280, $l1284 = false;
    if ($l1282) {
      let $l1285 = ($l1281 instanceof $m_Ot ? $l1281.requestID : void 0) ?? "unknown";
      if ($m_t("Streaming endpoint returned 404, falling back to non-streaming mode", { level: "warn" }), $l623 = true, $l291 = $l12.now(), $l326?.strip(), $m_i("tengu_streaming_fallback_to_non_streaming", { model: $m_Et($l11.model), error: $m_b("404_stream_creation"), attemptNumber: $l450, maxOutputTokens: $l626, thinkingType: $m_h($l35.type), request_id: $m_kg($l1285), fallback_cause: $m_b("404_stream_creation"), any_stream_event_yielded: false }), $m_X("info", "cli_nonstreaming_fallback_started"), $m_i("tengu_nonstreaming_fallback_started", { request_id: $m_ye($l1285), model: $m_Et($l11.model), fallback_cause: $m_b("404_stream_creation") }), $l614) $m_B7t("non_streaming");
      yield { type: "streaming_fallback_began", cause: "404_stream_creation" };
      try {
        if ($l469 = $l453 ?? ($l1285 !== "unknown" ? $l1285 : null), yield* $l947({ requestId: $m_q_e($l1285), analyticsRequestId: $m_kg($l1285), cause: "404_stream_creation", errorName: null, connectionCode: null, stall: null }, false)) return;
        if ($l1284 = true, $l641 !== void 0) $l641.ended = "completed";
      } catch ($l1286) {
        if ($l1286 instanceof $m_pD) throw $l340?.settle({ kind: "error", error: $l1286 }, $l453), $l1286;
        $l1283 = $l1286;
      }
    }
    if (!$l1284) {
      if ($l69 && ($l1283 instanceof $m_mZ || $l11.toolSearchRefusal !== void 0)) $m_Wzr($l28);
      if ($l1283 instanceof $m_mZ) throw $l159?.splice(0, $l159.length), $l1283;
      $m_t(`${$l1282 ? "Non-streaming fallback also failed" : "Error in API request"}: ${$m_awo($l1283)}`, { level: "error" });
      let $l1287 = $l1283, $l1288 = $l11.model;
      if ($l1283 instanceof $m_Wc) $l1287 = $l1283.originalError, $l1288 = $l1283.retryContext.model;
      if ($l1287 instanceof $m_cu) {
        $l340?.settle({ kind: "aborted" }, $l1282 ? null : $l453, $l1282 ? void 0 : $l360?.id), $l491();
        return;
      }
      if ($l641 !== void 0 && $m_ZP($l1287)) $l641.ended = "filtered_again";
      if ($l1287 instanceof $m_Ot) $m_Ken($l1287, $m_Hmn($l11), $l12.now(), $l319, $l11.storageV5);
      let $l1289 = $l453 || ($l1287 instanceof $m_Ot ? $m_f8e($l1287.requestID || $l1287.error?.request_id, $l1287.headers) : void 0);
      $l340?.settle({ kind: "error", error: $l1287 }, $l1289), $NEW_chunk_j0tbz6ra_js_syn({ isLowPriority: $l479, dispatch: $l646, error: $l1287, model: $l1288, messageCount: $l236.length, messageTokens: $m_DZ($l236), durationMs: Math.max(0, Math.round($l12.monotonicNow() - $l449)), durationMsIncludingRetries: Math.max(0, Math.round($l12.monotonicNow() - $l448)), attempt: $l450, requestId: $l1289, clientRequestId: $l476, didFallBackToNonStreaming: $l623, nonStreamingFallbackSkipped: $l624, observedResponse: $l623 ? void 0 : $l482, queryTracking: $l11.queryTracking, querySource: $l11.querySource, accountMemoryKeys: $l446, messageClientPlatform: $l11.messageClientPlatform, llmSpan: $l447, fastMode: $l630, previousRequestId: $l19, effort: $l190, agentContext: $l11.agentContext, attribution: $m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), modelCallNames: $l11.modelCallNames, promptTooLongIsHandled: $l11.promptTooLongIsHandled });
      let $l1290 = { ...$m_X7($l1287, $l1288, { messages: $l0, messagesForAPI: $l236, requestId: $l1289 }), perTurnEffort: $l328, perTurnTiming: $l329, ...$l640 && { streamWatchdogGaveUp: true }, ...($m_gJe($l1287) || $m_Mze($l1287) || $m_eun($l1287) || $l1287 instanceof $m_Ot && $l1287.type === "billing_error") && { resendCannotCure: true } };
      if ($m_bX($l1287) && !$l644.outOfApiAttempts()) return $l1290;
      yield $l1290, $l491();
      return;
    }
  } finally {
    if ($l191) $m_OTt($l314, $l620, Date.now());
    if ($m_jM("api_call", $l997), $l397(), $m_ZOo($l11.querySource, $l11.agentId), $l639) $l11.onRetryStatus?.(null);
    if ($l641 !== void 0) $m_Dmn($l641, { now: $l12.monotonicNow(), stopReason: $l625?.message.stop_reason ?? $l619, aborted: $l4.aborted, model: $l11.model, querySource: $l11.querySource, clientRequestId: $l623 ? void 0 : $l476 });
    if ($l510($l4.aborted ? "aborted" : "attempt_errored", $l453 ?? null, null), $l340?.settle($l619 !== null && $l453 ? { kind: "ok" } : $l4.aborted ? { kind: "aborted" } : { kind: "other_exit" }, $l453, $l360?.id), $l491(), $l625) {
      let $l1291 = $l625.message.usage;
      if ($l292 = $m_Mwe($m_em, $l1291), $l619 = $l625.message.stop_reason, $l619 === "refusal") $m_iZ({ model: $l26, requestId: $l453 || void 0, querySource: $l11.querySource, effort: $l190, fastMode: $l630, attempt: $l450, attribution: $m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: false, stopDetails: $l625.message.stop_details ?? null, agentContext: $l11.agentContext });
      let $l1292 = $l661?.servedFallbackModel, $l1293 = $l1292 !== void 0;
      if (!$l659) $m_Z2r($m_Pn($l11.model), $l625.message.model);
      let $l1294 = $l1293 && $l661 !== void 0 ? $m_R7e($l661.entries, { speed: $l292.speed, inferenceGeo: $l292.inference_geo, serverToolUse: $l292.server_tool_use }, $l619) : $m_Hke($l26, $l292);
      $l618 += $m_i3e($l1294, $l292, $l1293 ? $m_uUn($l11.serverRefusalFallback?.model, $l1292) : $l11.model, $l11.querySource, $l190, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool);
    }
    if ($l360 !== void 0 || $l625 !== void 0) $l289();
  }
  if ($l453 && $l191) $m_L4o($l453);
  if ($l191) $m_$Le($m_PI($l292));
  if ($l192) $m_zmn($l193, () => {
    let $l1295 = $l9(), $l1296 = $m_PI($l292);
    return Number.isFinite($l1295) ? Math.max($l1295 + $l292.output_tokens, $l1296) : $l1296 || $l1295;
  });
  if ($NEW_chunk_j0tbz6ra_js_D9t($l28, { isMainConversation: $l191 }), $l760(), $l719.served(), $l310() && $l629) $m_r1s($l629, { requestId: $l453, previousMessageId: $l25, model: $l11.model, is1hCacheTTL: $l286 === "1h", querySource: $l11.querySource, queryDepth: $l11.queryTracking?.depth });
  let $l1297 = $l236.length, $l1298 = $m_DZ($l236), $l1299 = $m_Oy() ? void 0 : $m_hfn($l236, $l11.model), $l1300 = $m_Oy() ? void 0 : $m_oEr($l293, $l296, $m_Qfr($l3, $l295)), $l1301 = $l191 ? $m_Y4o() : void 0;
  $l11.getToolPermissionContext().then(($l1302) => {
    $NEW_chunk_j0tbz6ra_js_dyn({ isLowPriority: $l479, dispatch: $l646, uncoveredTail: $l266, model: $l608[0]?.message.model ?? $l360?.model ?? $l11.model, preNormalizedModel: $l11.model, usage: $l292, start: $l449, startIncludingRetries: $l448, attempt: $l450, messageCount: $l1297, messageTokens: $l1298, requestId: $l453 ?? null, rawRequestBodyId: $l470, accountMemoryKeys: $l446, clientRequestId: $l623 ? void 0 : $l476, firstAttemptRequestId: $l469 ?? null, stopReason: $l619, ttftMs: $l609, firstContentMs: $l623 ? null : $l610 ?? null, streamEventCount: $l623 ? void 0 : $l611, queryOverheadMs: $l615, didFallBackToNonStreaming: $l623, querySource: $l11.querySource, promptCacheTtl: $l282 ? $l284 : void 0, promptCacheMessagesTtl: $l282 && !$l11.skipMessageCacheMarkers && $l287 ? "5m" : void 0, messageClientPlatform: $l11.messageClientPlatform, headers: $l627, extraEventFields: { ...{}, ...$NEW_chunk_j0tbz6ra_js_L9t($l28) }, costUSD: $l618, isDefaultModel: $l191 ? $l11.isDefaultModel : void 0, defaultModel: $l191 ? $l11.defaultModel : void 0, ...$l196($l327), carriedEffort: $l189, carriedEffortEnded: $l1301, queryTracking: $l11.queryTracking, permissionMode: $l1302.mode, proactivityLevel: $l11.proactivityLevel, newMessages: $l608, requestContentTelemetry: $l1299, requestPrefixTelemetry: $l1300 && { ...$l1300, systemPromptSource: $m_de($l11.systemPromptSource), snapshotHash: $l11.systemPromptSnapshotHash }, llmSpan: $l447, globalCacheStrategy: $l127, requestSetupMs: $l449 - $l448, attemptStartTimes: $l451, fastMode: $l630, previousRequestId: $l19, betas: $l342, thinkingPrefixMismatchBehavior: $l494, echoWireToolInputs: $l50, effort: $l327, turnOrigin: $l194, agentContext: $l11.agentContext, attribution: $m_cae($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), modelCallNames: $l11.modelCallNames });
  }).catch(($l1303) => $m_l($m_Xe($m_U($l1303), "api success logging failed"))), $l491();
}
;
