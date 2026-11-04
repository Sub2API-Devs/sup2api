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
  if ($l21 && $m_ps()) $m_U7s($l21);
  let $l22 = $m_hmr($l0), $l23 = $m__mr($l0), $l24 = $m_QFr($l0), $l25 = $m_n8e($l0), $l26 = $m_Te() === "bedrock" && $l11.model.includes("application-inference-profile") ? await $m_m$e($m_Wn($l11.model)) ?? $l11.model : $l11.model;
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
      if ($l57 !== void 0 && $l57.size > 0 && $m_F1o($l11.querySource) && $m_wCt($l0, $l50)) $m_tke($l0, $l57);
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
    if ($l29.includes($m_xS) && $l13(() => $m_O3s($l28, $l34))) $l59 = $m_r3s($l0, $l28.nameOnlyAnnouncements), $l60 = $m_o3s($l0, $l28.nameOnlyAnnouncements);
  } catch ($l63) {
    $m_l($m_N($l63));
  }
  let $l64;
  if ($l49) try {
    let $l65 = $m_oP();
    $l64 = $m_idn($l28, $l3, ($l66) => $l44($l66, $l65), $l34);
  } catch ($l67) {
    $m_l($m_N($l67));
  }
  let $l68, $l69 = !$l28.declaredToolsDecided, $l70 = $m_x3s(), $l71 = 0;
  if ($l49 || $l52) {
    let $l72;
    if (!$l28.declaredToolsDecided) try {
      $l72 = await $l11.getToolPermissionContext();
    } catch ($l73) {
      $m_l($m_N($l73));
    }
    try {
      $l68 = $m_vWt($l28, () => $l11.recordedToolDescriptions && { names: $l11.recordedToolDescriptions.keys(), servers: $l11.recordedToolServers, entries: $l11.recordedToolEntries }, $l3, { latch: true, permissionContext: $l72 });
    } catch ($l74) {
      $m_l($m_N($l74)), $l64 = void 0;
    }
  } else if ($l69) $l28.declaredTools = void 0;
  $m_mPt($l28);
  let $l75 = $l68 ?? $l64, $l76 = /* @__PURE__ */ new Set(), $l77 = 0;
  if ($l49 || $l52) try {
    let $l78 = $m_oP();
    for (let $l79 of $l3) {
      let $l80 = $l49 && $l44($l79, $l78);
      if ($l75 === void 0 ? $l52 ? false : $l80 : $m_$V($l79, $l75, $l3, { toolSearchAbsent: $l52, placements: $l43, nonDeferrableBuiltins: $l78 })) {
        if ($l76.add($l79.name), !$l80) $l77++;
      }
    }
  } catch ($l81) {
    $m_l($m_N($l81)), $l68 = void 0, $l75 = void 0, $l76.clear(), $l77 = 0;
    let $l82 = $m_oP();
    for (let $l83 of $l3) if ($l49 && $l44($l83, $l82)) $l76.add($l83.name);
  }
  let $l84 = $m_Cj().generation, $l85 = $l49 || $l52 ? $m_$1o($l0, $l3, $l11.querySource, { keepMcp: !$m_nq($l3), surfacedOnWire: $l28.surfacedOnWire, ...$l70 && { declaredInline: $l68 } }) : void 0;
  if ($l49 && $l76.size === 0 && (!$l11.hasPendingMcpServers || $m_nq($l3)) && !$l85?.kept.size && !$l68?.has($m_Ys)) {
    if ($m_t("Tool search disabled: no deferred tools available to search"), $l49 = false, $l70 && $l68 !== void 0 && $l85 !== void 0) try {
      $l85 = $m_$1o($l0, $l3, $l11.querySource, { keepMcp: !$m_nq($l3), surfacedOnWire: $l28.surfacedOnWire });
    } catch ($l86) {
      $m_l($m_N($l86));
    }
  }
  let $l87 = $l49 ? "tool_search" : $l52 ? "tool_addition" : void 0, $l88, $l89, $l90 = 0;
  if ($l87 !== void 0) {
    let $l91 = $m_uce($l0, { surfaced: $m_Pet($l28) ? { exceptAnnouncements: $l28.nameOnlyAnnouncements } : $l28.surfacedOnWire }), $l92 = /* @__PURE__ */ new Set();
    if ($l59.size > 0) try {
      $l92 = $l61 ? new Set($m_obe($l0).map(($l93) => $l93.toolName)) : $m_uce($l0);
    } catch ($l94) {
      $m_l($m_N($l94));
    }
    $l88 = $l3.filter(($l95) => {
      if (!$l76.has($l95.name)) return true;
      if ($m_xt($l95, $m_Ys)) return true;
      return $l91.has($l95.name) && (!$l59.has($l95.name) || $l92.has($l95.name));
    });
    try {
      let $l96 = $m__Wr($l88, $l68 ?? $l64);
      $l88 = $l96.tools, $l71 = $l96.redeclared.length;
    } catch ($l97) {
      $m_l($m_N($l97));
    }
  } else {
    $l88 = $l3.filter(($l98) => {
      if ($m_xt($l98, $m_Ys)) return false;
      if ($l59.has($l98.name)) return false;
      return true;
    });
    let $l99 = $m_nmn($l28);
    if ($l99 !== void 0) try {
      let $l100 = await $m_E3s($l99, $l3, { mcpClients: $l11.mcpClients ?? [], getPermissionContext: $l11.getToolPermissionContext, byValue: $l59 });
      $l89 = $l59.size === 0 ? $l100.kept : $l100.kept.without($l59), $l90 = $l100.unread;
      let $l101 = $m__Wr($l88, $l89);
      $l88 = $l101.tools, $l71 = $l101.redeclared.length;
    } catch ($l102) {
      $m_l($m_N($l102));
    }
    else if ($l69 && $l11.recordedToolDescriptions === void 0) try {
      $l88 = $m_bWr($l88, $l28);
    } catch ($l103) {
      $m_l($m_N($l103));
    }
  }
  let $l104 = $m_Z9($m__Xn($l88));
  $m_zpr($l104, $l11.querySource);
  let $l105 = $m_Ud($l11.model), $l106 = $l49 ? $m_Wot() : null;
  if ($l106 && $l105 !== "bedrock") {
    if (!$l29.includes($l106)) $l29.push($l106);
  }
  let $l107, $l108 = $m_A6(), $l109 = ($l110) => $l76.has($l110.name) || $l49 && $m_lmr($l110), $l111 = ($l112) => $l85?.kept.has($l112.name) === true, $l113 = true;
  try {
    $l113 = $l104.some(($l114) => ($l68?.has($l114.name) ?? true) && !$l109($l114) && !$l111($l114)) || $l68 !== void 0 && $m_G1o($l68, { pool: $l3, keptDeferred: $l85?.kept.keys() ?? [], keepMcp: !$m_nq($l3) }).length > 0;
  } catch ($l115) {
    $m_l($m_N($l115));
  }
  let $l116 = ($l117) => $l87 !== void 0 && ($l109($l117) || $l113 && $l111($l117));
  if ($l87 !== void 0 && $l68 === void 0) try {
    let $l118 = $m_Z9($l88).filter(($l119) => !$l116($l119));
    if ($l75 !== void 0) $m_vxn($l28, new $m_K7($l118));
    else $m_k3s($l28, $l118);
  } catch ($l120) {
    $m_l($m_N($l120));
  }
  let $l121;
  if ($l87 === void 0 && $l69 && $m_nmn($l28) === void 0 && ($l11.mcpClients ?? []).some(($l122) => $l122.type === "pending")) try {
    $l121 = await $m_v3s($l11, $l3, $l59);
  } catch ($l123) {
    $m_l($m_N($l123));
  }
  try {
    $l89 = $m_j1o($l28, $l87 !== void 0, () => $m_W1o($m_Z9($l88), $l3, $l121 ?? $l89?.recordedOnly));
  } catch ($l124) {
    $m_l($m_N($l124));
  }
  let $l125 = $l108 && $l104.some(($l126) => $l126.isMcp === true && !$l116($l126));
  if ($l108 && !$l29.includes($m_vYe)) $l29.push($m_vYe);
  let $l127 = $l108 ? $l125 ? "none" : "system_prompt" : "none", $l128 = $m_oP(), $l129 = $l11.withoutToolDescribeHooks ? void 0 : $l11.redescribedTools, $l130 = await Promise.all($l104.map(($l131) => $m_YH($l131, { getToolPermissionContext: $l11.getToolPermissionContext, tools: $l3, agents: $l11.agents, allowedAgentTypes: $l11.allowedAgentTypes, model: $l34, enginePlacement: $m_yKe($l131, $l128) ? "deferred" : "listed", querySource: $l11.querySource, withoutToolDescribeHooks: $l11.withoutToolDescribeHooks, recordedDescription: $l116($l131) ? void 0 : $l11.recordedToolDescriptions?.get($l131.name), recordedEntry: $l116($l131) || $m_xt($l131, $m_Qa) ? void 0 : $l11.recordedToolEntries?.get($l131.name), isRedescribed: $l129?.has($l131.name) || void 0, deferLoading: $l116($l131), loadedThroughToolSearch: $l49 && $l116($l131) && $l44($l131, $l128) })));
  $m_l9t($l28, $l130, { redescribed: $l129, recorded: $l11.recordedToolDescriptions, isMainChain: $m_Af($l11.agentContext) && $m_ss($l11.querySource) === "main" });
  let $l132 = [];
  if ($l87 !== "tool_search" && $l59.size > 0) try {
    let $l133 = new Set($l104.map(($l134) => $l134.name)), $l135 = $l3.filter(($l136) => $l59.has($l136.name) && !$l133.has($l136.name)), $l137 = new Set($m_Z9($m__Xn([...$l88, ...$l135])).map(($l138) => $l138.name));
    $l132 = await Promise.all($l135.filter(($l139) => $l137.has($l139.name)).map(($l140) => $m_YH($l140, { getToolPermissionContext: $l11.getToolPermissionContext, tools: $l3, agents: $l11.agents, allowedAgentTypes: $l11.allowedAgentTypes, model: $l34, enginePlacement: $m_yKe($l140) ? "deferred" : "listed", querySource: $l11.querySource, withoutToolDescribeHooks: $l11.withoutToolDescribeHooks, recordedDescription: $l11.recordedToolDescriptions?.get($l140.name), recordedEntry: $l11.recordedToolEntries?.get($l140.name), isRedescribed: $l129?.has($l140.name) || void 0, deferLoading: false })));
  } catch ($l141) {
    $m_l($m_N($l141)), $l132 = [];
  }
  let $l142 = new Map($l104.map(($l143, $l144) => [$l143.name, { schema: $l130[$l144], isMcp: $l143.isMcp === true }])), $l145 = $l87 !== void 0 ? $l68 : $l89, $l146 = [];
  if ($l145 !== void 0 && $l145.recordedOnly.size > 0) try {
    $l146 = $m_R3s($l130, $l145, { pool: $l3, recordedEntries: $l11.recordedToolEntries, keptDeferred: $l113 ? $l85?.kept.keys() ?? [] : [], keepMcp: !$m_nq($l3), requestCarriesStructuredOutputs: $l13(() => $m_Pvn($l34)) });
  } catch ($l147) {
    $m_l($m_N($l147));
  }
  if ($m_I3s({ deferredLate: $l77, redeclared: $l71, fromRecord: $l146.length, queryDepth: $l11.queryTracking?.depth, toolSearchAbsent: $l87 === "tool_addition", noDeferredChannel: $l87 === void 0, unclassifiedDepartures: $l90 }), $l11.onInlineToolsDeclared) {
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
    if ($l85) $m_g3s($l85, $l130, $l142, { requestCarriesStructuredOutputs: $l13(() => $m_Pvn($l34)) });
    let $l155 = $m_dun();
    if ($l155 && !$l88.some(($l156) => $m_xt($l156, $m_hqe)) && !$l85?.kept.has($m_hqe)) $l130.splice(Math.max($l130.length - 1, 0), 0, $l155);
    let $l157 = $m_U($l88, ($l158) => $l76.has($l158.name));
    $m_t(`Dynamic tool loading: ${$l157}/${$l76.size} deferred tools included`);
  }
  if ($m_gg("query_tool_schema_build_end"), $l16) $m_Dx("tool_schema_build");
  if ($m_a("tengu_api_before_normalize", { preNormalizedMessageCount: $l0.length }), $m_gg("query_message_normalization_start"), $l33 !== void 0) $m_a("tengu_fallback_credit_strip_as_mint_model", {});
  let $l159, $l160 = ($l161) => {
    $l162 = $l161.thread?.type === "continue";
    let $l163 = $m_i9t($l28, { ...$m_jmn($l161, $l164()), messages: $l165 }, { querySource: $l11.querySource, isMainThread: $m_Af($l11.agentContext), history: $l0, retryCause: $l166, retryKeepsHeal: $l167 === true, promptEpoch: $l11.promptRenderEpoch, accountMemoryEpoch: $l168 });
    if ($m_Tx($l11.querySource) !== null && $m_Rv()) try {
      $m_Lfn($l11.agentId, $l163 !== void 0);
    } catch ($l169) {
      $m_l($m_N($l169));
    }
    if ($l163?.tools !== void 0) $l170 = [...$l163.tools];
    if ($l163?.tools !== void 0 && $l161.tools !== void 0) {
      if ($l161.tools = [...$l163.tools], $l85) $m__3s($l85, $l161.tools);
    }
    let $l171 = $l161.tools ?? $l170;
    if ($l159 !== void 0 && $l171 !== void 0) $m_y3s($l159, $l171);
    if ($l163 === void 0) return;
    if ($l163.system !== void 0) {
      let $l172 = typeof $l163.system === "string" ? $l163.system : [...$l163.system];
      if ($l173 = $l172, !$l174) $l161.system = $l172;
    }
    if ($l163.messages !== void 0) {
      $l165 = [...$l163.messages];
      let $l175 = $m_r9t($l165, $l161.messages.length);
      if ($m_ymr($l175)) try {
        let $l176 = $m_El($l175);
        $m_D6e($l176), $l175 = $l176;
      } catch {
      }
      $l161.messages = $l175;
    }
  }, $l177 = $m_sm($l28, $m_XI), $l178 = $l177 || $m_sm($l28, $m_E2), $l179 = $l178 || $m_sm($l28, $m_U6), $l180 = $m_sm($l28, $m_Gq);
  if ($l29 = $l29.filter(($l181) => !$m_sm($l28, $l181) && !($l178 && $l181 === $m_E2) && !($l179 && $l181 === $m_U6)), $l33 !== void 0) {
    let $l182 = $l13(() => $m_xvn($l33, { isAgenticQuery: $l27 })), $l183 = ($l184) => {
      if ($l182.includes($l184)) {
        if (!$l29.includes($l184)) $l29.push($l184);
      } else $l29 = $l29.filter(($l185) => $l185 !== $l184);
    };
    if (!$l177) $l183($m_XI);
    if (!$l178) $l183($m_E2);
    if (!$l179) $l183($m_U6);
    $l29 = $l13(() => $m_D3s($l28, $l29, $l33, $l11.model)), $l183($m_kpe);
  }
  let $l186 = !$m_BH($l11.querySource) && !$l180 && $l29.includes($m_XI) && $l13(() => $m_Ive($l33 ?? $l11.model));
  if ($l186 && !$l29.includes($m_Gq)) $l29.push($m_Gq);
  let $l187 = $l13(() => $m_Bnr({ loopEffort: $l11.refusalFallbackEffort, continuesMainConversation: $m_cW($l11.agentContext) }, $l26)), $l188 = $l13(() => $m_kS($l26, $l11.effortValue, { turnEffort: $l11.turnEffort, hookEffortValue: $l11.hookEffortValue, carriedEffort: $l187 })), $l189 = $l187 === null ? void 0 : { level: $l187, outcome: $m_foi({ carried: $l187, withIt: $l188, withoutIt: $l13(() => $m_kS($l26, $l11.effortValue ?? $l11.effortSetAsideByHold, { turnEffort: $l11.turnEffort, hookEffortValue: $l11.hookEffortValue, carriedEffort: null })), isSavedSetAside: $l11.effortSetAsideByHold !== void 0 }) }, $l190 = $l13(() => $m_ES($l26) && $l188 !== void 0 ? $m_U0($l188) : void 0), $l191 = $m_Af($l11.agentContext) && ($l11.querySource.startsWith("repl_main_thread") || $l11.querySource === "sdk"), $l192 = $l11.querySource.startsWith("repl_main_thread") || $l11.querySource === "sdk", $l193 = $l191 ? "foreground" : $l11.agentContext.agentId;
  if ($l192) $m_Xmn($l193, $l9);
  let $l194;
  if ($l191) try {
    $l194 = $m_fgn($l0);
  } catch ($l195) {
    $m_l($m_N($l195));
  }
  let $l196 = ($l197) => {
    if (!$l191 || $l197 === void 0) return {};
    try {
      let $l198 = $m_VZ($l26);
      return { isDefaultEffort: $l197 === $l198, defaultEffortLevel: $l198 };
    } catch ($l199) {
      return $m_l($m_N($l199)), {};
    }
  }, $l200 = typeof $l188 === "string" && !($l35.type === "disabled" && $l35.mechanical === true) ? $l190 : void 0, $l201 = $l29.includes($m_U6) ? $m_Vcn(/* @__PURE__ */ new Date(), $m_cqr()) : void 0, $l202 = $l130.some(($l203) => !("defer_loading" in $l203 && $l203.defer_loading === true)) || ($l11.extraToolSchemas ?? []).some(($l204) => !("defer_loading" in $l204 && $l204.defer_loading === true)), $l205 = $l11.advisorDeferred === true && $l48 !== void 0 && $l29.includes($m_lw) && $l202, $l206 = $l11.advisorDeferred === true && $l11.advisorActive === false && !$l205 ? void 0 : $l48, $l207 = false, $l208 = 0;
  if ($l87 === "tool_addition" && !$l29.includes($m_lw)) try {
    let $l209 = $l130.flatMap(($l210) => {
      if (!("defer_loading" in $l210) || $l210.defer_loading !== true) return [$l210];
      if (!("input_schema" in $l210) || !$l3.some(($l211) => $m_xt($l211, $l210.name))) return [];
      let { defer_loading: $l212, ...$l213 } = $l210;
      return [$l213];
    }), $l214 = new Set($l130);
    $l208 = $m_U($l209, ($l215) => !$l214.has($l215)), $l207 = $l208 > 0 || $l209.length !== $l130.length, $l130.splice(0, $l130.length, ...$l209);
  } catch ($l216) {
    $m_l($m_N($l216));
  }
  let $l217 = $l33 === void 0 ? void 0 : $l13(() => $m_H3s($l28, $l0, { mintModel: $l33, retryModel: $l11.model, advisorEntryMoved: $l11.advisorDeferred === true && $l48 !== void 0 && $l202 && !$l205, deferredEntriesMoved: $l207, hasDeferredChannel: $l87 !== void 0 })), $l218 = /* @__PURE__ */ new Set([...$l88.filter($l116).map(($l219) => $l219.name), ...$l85?.kept.keys() ?? []]);
  if ($m_L3s($l28, $l0, $l218, $l49, $l59), $l87 !== void 0 && $l11.onDeferredToolsSent && $m_t0e()) try {
    $l159 = $l130.filter(($l220) => $m_Wpn($l220) && !$m_xt($l220, $m_hqe)), $l11.onDeferredToolsSent({ entries: $l159, nameOnlyAnnouncements: $l28.nameOnlyAnnouncements, strippedReferences: $m_m3s($l85) });
  } catch ($l221) {
    $m_l($m_N($l221));
  }
  let $l222 = $m_iee(() => {
    let $l223 = $l11.resumeIncompleteThinking ? "keep" : $m_ree?.relayThinkingDisposition({ mainLoop: $m_ss($l11.querySource) === "main" && !$l11.agentId, fetch: $l11.fetchOverride }) ?? "keep";
    return { relayThinking: $l223, relayThinkingPlan: $l223 === "keep" ? void 0 : $m_lQe($l0), builtForRelay: !$l11.resumeIncompleteThinking && ($m_ree?.isRelayedRequest($l11.fetchOverride) ?? false) };
  }, { relayThinking: "keep", relayThinkingPlan: void 0, builtForRelay: false }), { relayThinking: $l224, relayThinkingPlan: $l225, builtForRelay: $l226 } = $l222, $l227 = { model: $l11.model, bodyModel: $l34, pollEventsAsText: false, accountMemoryWithheld: $m_i7n(), tools: $m_Z9($l88), ingestPool: { tools: $l3, ...$m_F1o($l11.querySource) && { ownRequest: { mcpServersPending: $l11.hasPendingMcpServers === true } } }, ...$l70 && { declaredToolNames: $m_P3s($l130) }, betas: $l29, midConvLatchedOff: $l177, keptReminders: $l186, useToolSearch: $l49, advisorModel: $l206, advisorDeferred: $l205, stripWebSearch: $l28.webSearchHistoryRejected, mediaItemLimit: $m_uto($l28, $l34)?.limit, resumeIncompleteThinking: $l51, perTurnEffort: $l200, perTurnNow: $l201, deferredToolReferencePlan: $l85, keepForeignThinking: $m_kfn(), deferredWireToolNames: $l218, nameOnlyAnnouncements: $l28.nameOnlyAnnouncements, byValueNames: $l59, byValueAnnouncements: $l60, withoutAttachmentHooks: $l11.withoutToolDescribeHooks, reminderFold: $l11.reminderFold, echoWireToolInputs: $l50, thinkingStripPlan: $l225 === void 0 ? $l11.thinkingStripPlan : $m_aJe($l11.thinkingStripPlan, $l225), advisorStripPlan: $l11.advisorStripPlan };
  if ($l16) $m_Mx("message_normalization");
  let { messagesPreNormalize: $l228, messagesForAPI: $l229, accountMemoryEpoch: $l230, midConvFallback: $l231, toolChangeFallback: $l232, inlineToolsFallback: $l233, keptForeignSignatures: $l234, blocksEligible: $l235 } = $l13(() => $m_Kmn($l0, $l227));
  if ($l16) $m_Dx("message_normalization"), $m_Mx("request_build");
  let $l236 = $l229, $l168 = $l230;
  if ($m_$mr($l0, $l11), $l11.onToolInputCopiesSent && $l227.ingestPool?.ownRequest !== void 0 && $l50) try {
    let $l237 = $m_S9t($l0);
    if ($l237.size > 0) $l11.onToolInputCopiesSent($l237);
  } catch ($l238) {
    $m_l($m_N($l238));
  }
  if ($m_z1o($l28, $l0, $l236, { useToolSearch: $l49, toolSearchAbsent: $l87 === "tool_addition", blocksEligible: $l235, byValueNames: $l59, byValueStaysOut: $l61 }), $l87 !== void 0) $m_h3s($l0, $l28.surfacedOnWire, $l142, $l85, $l11.querySource, $l84);
  let $l166, $l239 = false, $l240 = false, $l241 = false, $l242 = () => {
    if (!$l240 || $l241) return;
    return $l241 = true, $m_nn({ type: "advisor_stripped" });
  }, $l243 = false, $l244 = false;
  if ($l224 === "strip_and_mark") if ($l225 !== void 0 && $l225.size > 0) $l239 = true, $l243 = true;
  else $l244 = true;
  let $l245 = $m_uv(), $l246, $l247 = ($l248, $l249, $l250) => {
    if ($l246 !== void 0 && $l246.input === $l248 && $l246.fallbackBeta === $l249 && $l246.marksBeta === $l250) return $l246.output;
    let $l251 = $m_Tgn($l248, $l249), $l252 = false, $l253 = $m_cfn($m_Yve($l251, $l245, $l51), $l0);
    return $l246 = { input: $l248, fallbackBeta: $l249, marksBeta: $l250, output: $l253, markable: $l252 }, $l253;
  }, $l167, $l254 = false, $l255 = ($l256, $l257, $l258 = false) => {
    if ($l254 = true, $l257 === "microcompact") $m_sye($l28, $l257);
    else $l166 = $l257, $l167 = ($l167 ?? true) && $l258;
    return $m_Yve($l256, $l245, $l51);
  }, $l259 = $l231, $l260 = $l232, $l261 = $l233, $l262 = false, $l263 = false, $l264 = "idle", $l265 = false, $l266, $l267 = $m_Tx($l11.querySource) !== null && $m_Rv() ? $m_N8e($l11.model) : false, $l268 = $m_Tx($l11.querySource) !== null && $m_Rv() ? $m_F8e($l11.agentId) : false, $l269 = $m_Tx($l11.querySource) !== null && $m_Rv() ? $m_$8e() : false, $l270 = $l11.fallbackCreditCode !== void 0 ? $l11.fallbackCreditMintedStateless === true : false, $l271 = $m_Tx($l11.querySource) !== null && $m_Rv() ? $m_Mve($l11.agentId) : false, $l272 = $m_Z4n($l11.querySource, $l11.agentId, $l11.model, $l270), $l273 = $l50;
  if ($m_fee($l236)) {
    let $l274 = $m_ps() ? $m_wrn({ fromModel: $m_Sgn($l236), sticky: $l28, serverDefaultFallbacksEnabled: () => $m_k($m_HNr, false), selfTargetDefaultFallbacksEnabled: () => $m_k($m_LNr, false) }) : null, $l275 = $l274 !== null && !$m_sm($l28, $l274);
    if ($l275) $m_UF($l28, $l274);
    $m_a("tengu_rotunda_pennant_replay", { echo_eligible: $l275, category: $l274 !== null && $l274 === $m_Yw });
  }
  $m_a("tengu_api_after_normalize", { postNormalizedMessageCount: $l236.length, apiSystemMessageCount: $m_U($l236, ($l276) => $l276.type === "api_system") });
  let $l277 = $m_oYs($l228), $l278 = $m_b6n({ isNonInteractive: $l11.isNonInteractiveSession, hasAppendSystemPrompt: $l11.hasAppendSystemPrompt, recorded: $l11.recordedCliPrefix }), $l279, $l280 = () => {
    if ($l11.onPromptHeadSent) try {
      $l11.onPromptHeadSent({ cliPrefix: $l278, wireShape: $l13(() => $m_vfn($l28, $l34, { betas: $l29, keptOn: $l186, safeguards: $l279 })) });
    } catch ($l281) {
      $m_l($m_N($l281));
    }
  };
  $l280(), $l1 = $m_d2s($l1, $l278, { fingerprint: $l277, agentContext: $l11.agentContext, previousRequestId: $l19, promptId: $l20, turnOrigin: $l22, turnPosition: $l23 });
  let $l282 = $l11.enablePromptCaching ?? $m_fce($l34), $l283 = $l11.forkPointUuid !== void 0 && $m_Af($l11.agentContext), $l284 = $m_Qbe($l11.querySource, { agentCacheTtlOverride: $l11.agentCacheTtlOverride, mainThreadModel: $l191 || $l283 ? $l34 : void 0 }), $l285 = $l284.ttl === "1h" ? "1h" : void 0, $l286 = $m_Gmr($l284.ttl) === "1h" ? "1h" : void 0, $l287 = $l286 !== $l285;
  if ($l191) {
    if ($m_Eds($l285 === "1h" ? $m_bC : $m_Bj, $l11.model, $l284.reason === "live_5m_cache"), $l287) $m_zmr();
  }
  let $l288 = false, $l289 = () => {
    if ($l288) return;
    $l288 = true;
    let $l290 = $l291 || $l12.now();
    if ($l191) $m_eri($m_jj, { at: $l290, ttl: $m_lnr($l292) ?? $l286 ?? "5m", inputTokens: $l292.input_tokens, cacheReadTokens: $l292.cache_read_input_tokens, cacheCreationTokens: $l292.cache_creation_input_tokens });
    else if ($l283 && $l292.cache_read_input_tokens > 0) $m_zqr($m_jj, $l290);
  }, $l293 = $m_Jmr($l1, $l282, { skipGlobalCacheForSystemPrompt: $l125, cacheTtl: $l285 }), $l294 = $l29.length > 0, $l295 = [...$l11.extraToolSchemas ?? []];
  if ($l206) $l295.push({ type: $m_tXt, name: $m_TLe, model: $l206, ...$l205 && { defer_loading: true } });
  let $l296 = [...$l130, ...$l295], $l297 = $m_s9t($l28, { model: $m_hA($l11.model), tools: $l296, system: $l293, messages: $l236.map(($l298) => ({ role: $l298.message.role, content: $l298.message.content })) }, { querySource: $l11.querySource, retryCause: void 0, promptEpoch: $l11.promptRenderEpoch });
  if ($l297 !== void 0) {
    let $l299 = $m_nn({ type: "prefix_delta", text: $l297 });
    yield $l299;
    let $l300 = $l13(() => $m_Kmn([...$l0, $l299], $l227));
    $l236 = $l300.messagesForAPI, $l168 = $l300.accountMemoryEpoch, $m_z1o($l28, $l0, $l236, { useToolSearch: $l49, toolSearchAbsent: $l87 === "tool_addition", blocksEligible: $l300.blocksEligible, byValueNames: $l59, byValueStaysOut: $l61 }), $l259 = $l300.midConvFallback, $l260 = $l300.toolChangeFallback, $l261 = $l300.inlineToolsFallback;
  }
  let $l301 = $l13(() => $m_Gcn($l236, $l188, ($l302) => $m_bbn($l302, $l26))), $l303 = $l13(() => $m_ES($l26) && $l301 !== void 0 ? $m_U0($l301) : void 0), $l304 = $m_os() && $l13(() => $m_BI()) && $l13(() => $m_Zh($l34)) && !!$l11.fastMode && !$m_svn($l11.model), $l305 = $l304 && !$m_x4e(), $l306 = false;
  if ($l27 && $m_y8r()) {
    if ($m_k($m_Bmr, false)) {
      if ($m_pu()) $m_UF($l28, $m_hW);
      $l306 = $m_xk($l28, $m_hW);
    } else if (!$m_Cpe() && !$m_sm($l28, $m_hW)) try {
      let $l307 = await $l11.getToolPermissionContext();
      $l306 = $l307 !== void 0 && $m_es($l307.mode);
    } catch ($l308) {
      $m_l($m_N($l308));
    }
  }
  let $l309;
  if ($m_$7s()) try {
    $l309 = await $l11.getToolPermissionContext();
  } catch ($l310) {
    $m_l($m_N($l310));
  }
  let $l311;
  if ($l305) $m_UF($l28, $m_UEn);
  let $l312 = $m_xk($l28, $m_UEn) && (!$m_BH($l11.querySource) || $l304);
  if ($m_Wmn()) $m_UF($l28, $m_LAt);
  let $l313 = () => $m_Wmn() && $m_xk($l28, $m_LAt), $l314 = $m_xEt($l28, { isMainLoopRequest: $l191, continuesPrefix: $l11.forkPointUuid !== void 0, cacheTtl: $l282 && !$l287 ? $l284 : void 0 }), $l315 = $m_$6e(), $l316 = $m_IEt(), $l317 = void 0, $l318 = ($l319, $l320, $l321) => {
    if ($l191) $l317 = $l319, $m_PEt({ conversation: $l28, headerSent: $l314, requestId: $l319, headers: $l320, isWhole: $l321, chainReleaseCount: $l315, accountEpoch: $l322, modelSwitchCount: $l316, now: Date.now(), clientOptions: { model: $l11.model, credentials: $l11.credentials, storageV5: $l11.storageV5 } });
  }, $l323, $l324 = false;
  try {
    let $l325 = !($l35.type === "disabled" && $l35.mechanical === true) && !$m_i.CLAUDE_CODE_SIMULATE_PROXY_USAGE && (!$m_zH() || $m_hRe());
    if ($l325 && $m_k_()) {
      if ($l35.type !== "disabled") {
        if ($l323 = $m_Ncn(), $m_Fcn($l323)) $m_UF($l28, $m_T2);
      }
      $l324 = $m_xk($l28, $m_T2);
    } else if ($l325 && !$m__W()) {
      let $l326 = $m_Ud($l11.model);
      if (($l326 === "bedrock" || $l326 === "mantle" || $l326 === "vertex") && $m_OB($l326) && $l13(() => $m_vXo($l326, $l11.model))) {
        if ($l35.type !== "disabled") $m_UF($l28, $m_T2);
        $l324 = $m_xk($l28, $m_T2);
      }
    }
  } catch ($l327) {
    $m_l($l327), $l323 = void 0, $l324 = false;
  }
  if (!$l324 && !$m_Ape()) $l29 = $l29.filter(($l328) => $l328 !== $m_T2);
  if ($l11.evictCacheOnComplete && $l11.stickyBetas !== void 0 && $m_bmr()) $m_UF($l28, $m_xst);
  let $l329 = require("./chunk-r1af14hy.js").createContextHintController({ querySource: $l11.querySource, agentId: $l11.agentId, includeFirstPartyBetas: $m_k_(), is529Error: $m_O2, storageV5: $l11.storageV5 }), $l330 = void 0, $l331 = null, $l332 = void 0, $l333 = () => $m_uoi({ sent: $l330 !== void 0 && $l301 !== $l188 ? $l190 : $l330, turnEffort: $l11.turnEffort, hookEffortValue: $l11.hookEffortValue }), $l334, $l335, $l336, $l337 = () => $l336 ??= $m_Qni($l236), $l338 = () => {
    let $l339 = $m_jK();
    return $m_ZYe($l339, $l11.model, $m_Ud($l11.model)), $l339;
  }, $l340 = $l334 ??= $l296.filter(($l341) => !("defer_loading" in $l341 && $l341.defer_loading));
  $l335 ??= $m_fF($l29), $m_uni({ system: $l293, toolSchemas: $l334, anyDeferLoading: $l334.length !== $l296.length, querySource: $l11.querySource, model: $l11.model, agentId: $l11.agentId, fastMode: $l312, globalCacheStrategy: $l127, betas: $l314 ? [...$l335, $m_WM.header] : $l335, autoModeActive: $l306, isUsingOverage: $m_hi().isUsingOverage ?? false, is1hCacheTTL: $l286 === "1h", queryDepth: $l11.queryTracking?.depth, cacheDiagnosis: $l313(), effortValue: $l301, thinkingConfig: $l35, extraBodyParams: $l338(), getMessageHashes: $l337, messages: $l236, baselineAgentId: $l11.querySource === "agent_summary" && $m_ck($l11.agentContext) ? $l11.agentContext.agentId : void 0 });
  let $l342 = $l236, $l343 = null, $l344 = () => $m_HG() === "thirdParty" && $l345.includes($m_xC.header), $l346 = () => $l324 && !$m_Ape() && $l345.includes($m_T2.header), $l347 = [], $l348 = false, $l349 = ($l350) => {
    if (!$m_xk($l28, $m_xC)) return;
    let $l351 = $l344(), $l352 = $l351 && $l350 instanceof $m_Mt && $l350.status === 400 && $l350.message.includes($m_xC.header), $l353 = $l351 && !$l346() && $m_eB($l350), $l354 = $l351 ? $m_yZn($l350) ?? [] : [], $l355 = $l354.some(($l356) => $l356.includes("dangerous_tool_use") || $l356.includes("safeguard"));
    if (!$l352 && !$l353 && !$l355 && !$m_m4e($l350)) return;
    if ($m_Mg($l28, $m_xC), $l353 && !$l352 && !$l355 && !$m_m4e($l350)) $l347.push($m_xC), $l348 = !$m_nne();
    if ($l351) {
      if ($m_APn(), $l355) $m_hZn($l11.model, $l354);
    }
    return $m_t($l351 ? "[server-classifier] the platform rejected a beta on this request (HTTP 400), most likely dangerous-tool-use, which this deployment does not know yet; it is not sent again this session and auto mode decides with the local classifier" : "[server-classifier] the server rejected the dangerous-tool-use beta header or the safeguards field (HTTP 400); neither is sent again this conversation, so every auto-mode tool use is denied as classifier-unavailable until the conversation's betas reset (/clear or /compact)", { level: "warn" }), $m_a("tengu_server_classifier_beta_rejected_retry", { provider: $m_kT(), unnamed: $l353, foundryFeature: $l355, unclaimed: false }), "retry:safeguards";
  }, $l357 = ($l358) => $m_V8e($l358, $l11.model) && (!!$l11.modelIsRefusalFallbackTarget || $m_j3r($l11.model)), $l359 = ($l360) => $m_K8e($l360) || $l357($l360), $l361 = ($l362) => $l87 !== void 0 && $l363 === void 0 && $l362 instanceof $m_Mt && !$l11.resumeIncompleteThinking, $l364 = ($l365) => {
    let $l366 = $m_Tke($l365);
    return $l361($l365) && (!$m_oQe() || /\bdefer_loading\b/.test($l365.message)) && ($l365.status === 400 || $l365.status === 422) && $l365.type !== "billing_error" && !$l359($l366) && !$l367($l366);
  }, $l368 = ($l369, $l370, $l371) => {
    $m_t(`[ToolSearch] HTTP ${$l369.status} ${$l371}${$l370 ? ` (${$l370.header})` : ""}; sending the request again without deferred tools. ENABLE_TOOL_SEARCH=false avoids the refused request${$l347.length > 0 ? `. Dropped first and now allowed again: ${$m_fF($l347).join(", ")}` : ""}`, { level: "warn" });
    for (let $l372 of $l347) $m_gPt($l28, $l372);
    if ($l348) $m_Ifs();
    throw new $m_cee($l369, $l49);
  }, $l373 = ($l374) => {
    if ($l106 !== null && $l361($l374) && $m_Cke($l374, $l106)) $l368($l374, $l106, "refusing the tool search beta");
    return;
  }, $l375 = ($l376) => {
    if ($l364($l376)) $l368($l376, $l106, "that no other recovery took, on a request that declared deferred tools");
    return;
  }, $l377 = false, $l378 = () => {
    let $l379 = $l11.toolSearchRefusal;
    if ($l379 === void 0 || $l377) return;
    $l377 = true;
    try {
      let $l380 = $m_Wot(), $l381 = $m_Cke($l379, $l380);
      if ($l381) $l39($l380, $m_qq($l379, $l380));
      else $m_Mg($l28, $l380), $m_t("[ToolSearch] the endpoint answered the request sent without tool search, so this conversation goes on without it");
      $m_a("tengu_beta_400_healed", { beta: $m_oie([$l380.header]), model: $m_wt($l11.model), provider: $m_kT(), status: $l379.status, unnamed: !$l381 });
    } catch ($l382) {
      $m_l($l382);
    }
  }, $l383 = ($l384) => {
    let $l385 = $l386($l384, true);
    if ($l385 !== null) return $l385;
    if (!($l384 instanceof $m_Mt) || $l384.status !== 400 && $l384.status !== 422) return;
    let $l387 = $m_Tke($l384);
    if ($l359($l387) || $l367($l387)) return;
    if ($l384.status === 422 || !$m_xk($l28, $m_xC) || !$l344()) {
      if ($m_Ape() || $l28.systemMessagesAcceptedBy.has($l34)) return;
      let $l388 = $l389($l384, true);
      if ($l388 !== void 0) $l390 = "retrying";
      return $l388;
    }
    return $m_Mg($l28, $m_xC), $l347.push($m_xC), $m_t("[server-classifier] an unrecognised HTTP 400 arrived while the dangerous-tool-use beta was on the request; retrying once without it, and auto mode decides with the local classifier for the rest of this conversation", { level: "warn" }), $m_a("tengu_server_classifier_beta_rejected_retry", { provider: $m_kT(), unnamed: false, foundryFeature: false, unclaimed: true }), "retry:safeguards-unclaimed";
  }, $l391 = ($l392) => {
    try {
      if (!($l392 instanceof $m_Mt) || $l392.status !== 400 && $l392.status !== 422) return;
      if ($l393 === "withoutField") {
        $l393 = "spent";
        let $l394 = $l383($l392);
        if ($l394 === void 0 && !$l359($l392) && !$l364($l392)) $m_isn();
        return $l394;
      }
      if ($l393 === "spent" || $l395 === void 0 || $l392.type === "billing_error" || $l359($l392) || $l367($l392) && !$m_v4e($l392) || !$m_ssn() || $m_oQe()) return;
      return $l29 = $l29.filter(($l396) => $l396 !== $m_Tpe), $l393 = $l395 === "updates" && $l35.display !== void 0 ? "withoutUpdates" : "withoutField", `retry:thinking-display-unclaimed:${$l393}`;
    } catch ($l397) {
      $m_l($l397);
      return;
    }
  }, $l398 = () => {
    if ($l390 === "retrying") $l390 = "spent";
    else if (!$m_Ape() && $l165.some(($l399) => $l399.role === "system")) $l28.systemMessagesAcceptedBy.add($l34), $l280();
  }, $l400 = () => {
    if ($l390 === "retrying") $m_gPt($l28, $m_XI), $l280(), $m_t("[mid-conv-system] the resend without system messages was not answered either, so the guess that the platform refuses them is dropped; the next request of this conversation sends them again", { level: "warn" });
  }, $l401 = () => {
    if ($l393 === "idle" || $l393 === "spent") return;
    let $l402 = $l393 === "withoutField";
    $l393 = $l402 ? "spent" : "idle";
    try {
      if ($l402) $m_Mg($l28, $m_$Qo);
      $m_Mg($l28, $m_Tpe), $m_t(`[thinking] a request was refused (HTTP 400 or 422) and went through when sent again ${$l402 ? "without thinking.display" : "with the session's own display in place of 'updates'"}; this conversation no longer sends ${$l402 ? "thinking.display" : "'updates'"}.`, { level: "warn" }), $m_a("tengu_beta_400_healed", { beta: $m_oie([$m_Tpe.header]), model: $m_wt($l11.model), provider: $m_kT(), unclaimed: true });
    } catch ($l403) {
      $m_l($l403);
    }
  }, $l404 = ($l405, $l406) => {
    try {
      if (!($l405 instanceof $m_Mt) || $l405.status !== 400 && $l405.status !== 422) return;
      if ($l407 === "resent") $l407 = "spent";
      let $l408 = $m_Tke($l405);
      if ($l407 !== "idle" || !$l345.includes($m_uF.header) || $l405.type === "billing_error" || $m_HJr($l405) !== void 0 || $m_tcr($l408) || $l359($l408) || $l405.status === 400 && $l406 || $m_Ake($l405) !== void 0 || $m_xke($l405) !== void 0 || $l367($l408) && !$l405.message.includes($m_uF.header) || $m_oQe()) return;
      return $m_t(`[thinking] HTTP ${$l405.status} that no earlier recovery took; sending the request again without the ${$m_uF.header} beta`, { level: "warn" }), $l29 = $l29.filter(($l409) => $l409 !== $m_uF), $l407 = $l406 ? "spent" : "resent", "retry:thinking-token-count-unclaimed";
    } catch ($l410) {
      $m_l($l410);
      return;
    }
  }, $l411 = () => {
    if ($l407 !== "resent") return;
    $l407 = "spent";
    try {
      $l39($m_uF, false), $m_a("tengu_beta_400_healed", { beta: $m_oie([$m_uF.header]), model: $m_wt($l11.model), provider: $m_kT(), unclaimed: true });
    } catch ($l412) {
      $m_l($l412);
    }
  }, $l413 = ($l414) => {
    return;
  }, $l415 = ($l416) => {
    {
      let $l417 = $l416 instanceof $m_Mt && $l416.status === 400;
      if ($l418 === "retrying") {
        if ($l417) {
          if ($l418 = "spent", !$l359($l416) && !($l419 === "idle" && $l420($l416))) $m_spn();
        }
        return;
      }
      if ($l418 === "idle" && $l421 && $l29.includes($m_Gq) && $l417 && $l416.type !== "billing_error" && !$l359($l416) && !$l367($l416) && $m_rpn()) return $l418 = "retrying", $l422 = $l416.requestID ?? void 0, $l29 = $l29.filter(($l423) => $l423 !== $m_Gq), $l343?.forceCreate("clear_at_header_retired"), "retry:kept-reminder-unrecognised-400";
    }
    return;
  }, $l420 = ($l424) => {
    try {
      return $m_A2 !== null && $m_Te() === "firstParty" && $l345.includes($m_A2.header) && $l424 instanceof $m_Mt && $l424.status === 400 && $l424.type !== "billing_error" && $m_Jde($l424) === "client_error" && !$l11.resumeIncompleteThinking && !($l425 && !$l426) && $m_g5t($l424) === void 0 && !$l359($l424) && !$l367($l424) && $m_Ove($l424) === null && $m_Ake($l424) === void 0 && $m_xke($l424) === void 0 && $m_ipn();
    } catch ($l427) {
      return $m_l($l427), false;
    }
  }, $l428 = ($l429) => {
    try {
      if ($l419 === "retrying" && $l429 instanceof $m_Mt && $l429.status === 400) {
        if ($l419 = "spent", !$l359($l429)) $m_apn();
        $m_a("tengu_tether_unrecognised_400", { phase: $m_b("refused"), planner_backed: $l430, query_source: $m_Es($l11.querySource) });
      }
    } catch ($l431) {
      $m_l($l431);
    }
  }, $l432 = ($l433) => {
    try {
      if ($l428($l433), $l419 === "idle" && $l420($l433)) {
        let $l434 = $l343 !== null, $l435 = $l343?.dropForUnrecognised400();
        return $m_a("tengu_tether_unrecognised_400", { phase: $m_b("start"), planner_backed: $l434, dropped_thread: $l435 !== void 0, query_source: $m_Es($l11.querySource) }), $l419 = "retrying", $l436 = $l433.requestID ?? void 0, $l430 = $l434, $l435 ?? "retry:tether-unrecognised-400";
      }
    } catch ($l437) {
      $m_l($l437);
    }
    return;
  }, $l438 = false, $l439 = ($l440) => {
    if ($l440 instanceof $m_Mt && $l440.status !== void 0) $l438 = true;
    if ($l428($l440), $l29.includes($m_Gq) && $m_HXt($l440)) return $l29 = $l29.filter(($l441) => $l441 !== $m_Gq), $m_Mg($l28, $m_Gq), $m_L8e(), $l280(), $l343?.forceCreate("clear_at_header_retired"), $m_f("api_kept_reminder_clear_at", "server_rejected"), $m_t("[reminders] the server rejected the clear_at beta header or field (HTTP 400); retrying without them. For the rest of this session earlier reminders are not re-sent, and requests that can use a Message Threads thread get no reminder.", { level: "warn" }), "retry:kept-reminder-clear-at";
    if ($m_A2 !== null && $m_vke($l440) && !$m_sm($l28, $m_A2)) return $m_Mg($l28, $m_A2), $m_D8e(), $m_t("[tether] server rejected the message-threads beta header \u2014 dropping it and threading for this session", { level: "warn" }), $l343?.resolveRetry($l440) ?? "retry:tether-header";
    return $l343?.resolveRetry($l440);
  }, $l442 = $m_Dni($l0, $l11.querySource, $l11.model, $l11.agentId, ($l443) => $m_xn($l227.tools, $l443)?.name, $l11.forkPointUuid), $l444 = false, $l165 = [], $l445 = [], $l446 = ($l447) => {
    if ($l445.length === 0) return $l447;
    for (let $l448 = $l445.length - 2; $l448 >= 0; $l448--) if ($l445[$l448] === $l447) return $l448;
    return;
  }, $l173 = void 0, $l170 = void 0, $l174 = false, $l449 = false, $l164 = () => ({ messages: $l165, system: $l173, tools: $l170 });
  {
    let $l450 = $m_Tx($l11.querySource);
    if ($l450 !== null && $m_Rv()) {
      $l334 ??= $l296.filter(($l451) => !("defer_loading" in $l451 && $l451.defer_loading)), $l335 ??= $m_fF($l29);
      let $l452 = $m_n8e($l0), $l453 = $m_xk($l28, $m_xC) || $l11.serverClassifier === true && $l11.autoModeServerContext !== void 0 && $m_fge() && !$m_sm($l28, $m_xC) && !$m_nne(), $l454 = $m_gpn({ querySource: $l11.querySource, agentId: $l11.agentId, model: $l11.model, modelHeldStateless: $l267, relayHeldStateless: $l268, classifierHeldStateless: $l269, creditRetryStateless: $l270, dropHeldStateless: $l271, system: $l293, toolSchemas: $l334, betas: $l335, latchedHeaders: { fastMode: $l312, autoMode: $l306, cacheTtl1h: $l285 === "1h", evictOnComplete: $m_xk($l28, $m_xst), cacheDiagnosis: $l313(), cacheKeepalive: $l314, dangerousToolUse: $l453 }, thinkingConfig: $l35, toolChoice: $l11.toolChoice, effortValue: $l301, extraBodyParams: $l338(), getMessageHashes: $l337, previousMessageId: $l452 });
      if ($m_Dve($l450, $l11.agentId)) {
        let $l455 = $m_xpn($l0, $l236);
        if ($l343 = $m_fpn({ engine: $l454, previousMessageId: $l452, anchorRewritten: $l455 !== null && $m__pn($l455, $l452), messages: $l236, agentId: $l11.agentId, model: $l11.model, modelHeldStateless: $l267, relayHeldStateless: $l268, classifierHeldStateless: $l269, creditRetryStateless: $l270, dropHeldStateless: $l271, toolResultClearingHeldStateless: $l442 !== void 0, clock: $l12 }), $l455 !== null) $m_Apn($l455, { sourceCategory: $l450, messageCount: $l236.length, anchorMessageId: $l452 });
      }
    }
  }
  let $l456 = $m_vI() ? { systemPrompt: $l1.join(`

`), userSystemPrompt: $l11.userSystemPrompt, querySource: $l11.querySource, tools: $m__($l296) } : void 0, $l457, $l458 = () => $l457 ??= $m_Smr($l0, $l3), $l459 = $m_PWr($l11.model, $l11.agentContext, $l456, $l236, $l305, $l11.querySource, $l458), $l460 = $l12.monotonicNow(), $l461 = $l12.monotonicNow(), $l462 = 0, $l463 = [], $l464 = void 0, $l465 = void 0, $l466 = false, $l467, $l468 = ($l469) => {
    if ($l469 !== void 0 && $m_HG() === "thirdParty" && $m_B0($l469) && !$m_nne() && !$m_NGt()) $m_APn(), $m_t(`[server-classifier] the platform gave no classification for this request (${$l469.why}); treating that as this deployment's answer: auto mode classifies locally for the rest of this session and stops sending the classifier context`);
  }, $l470 = ($l471, $l472, $l473) => {
    let $l474 = $l473.flatMap(($l475) => $l475.type === "tool_use" && typeof $l475.id === "string" ? [$l475.id] : []);
    $l468($m_IGt($l471, $l472, $l474));
  }, $l476 = false, $l477 = false, $l421 = false, $l418 = "idle", $l422, $l419 = "idle", $l436, $l430 = false, $l393 = "idle", $l407 = "idle", $l390 = "idle", $l478 = "idle", $l479 = () => $l478 !== "idle" && $l478 !== "spent", $l480 = false, $l481 = void 0, $l482 = void 0, $l483, $l484 = ($l485, $l486) => {
    $l160($l485);
    let $l487 = $m_jmn($l485, $l164());
    $m_Qas($l487, $l11.querySource, $m_Af($l11.agentContext)), $l482 = $m_qsn({ ...$l485, stream: $l486 }, $l11.querySource, $l458, $l487.messages, $l11.agentContext), $l483 = $m_zTt({ params: $l487, querySource: $l11.querySource, agentId: $l11.agentId, storageV5: $l11.storageV5, conversation: $l0, stickyBetas: $l28, readInjectedBody: () => $m_jK() });
  }, $l488 = void 0, $l489 = void 0, $l490, $l491 = false, $l492 = $m_Q2r(), $l493 = void 0, $l494, $l322 = $m_qm(), $l495 = ($l496, $l497) => {
    let $l498 = $m_Umn($l11);
    return $m_A6n($l496, $l498, $l12.now(), $l322, $l11.storageV5), $m_M2s({ route: $l498, querySource: $l11.querySource, model: $l11.model, rateLimitType: $m_Wcn($l496).rateLimitType, retryAtMs: $l497.retryAtMs, attempt: $l497.attempt, maxRetries: $l497.maxRetries });
  }, $l499 = ($l500) => $m_Ysn({ rejection: $l500, nowMs: $l12.now(), credentials: $l11.credentials, stop: $l4 }), $l501 = null;
  function $l502() {
    if ($l501 !== null) $l501(), $l501 = null;
  }
  function $l503() {
    if ($l502(), $m_Kmr($l464), $l464 = void 0, $l489) $l489.body?.cancel().catch(() => {
    }), $l489 = void 0;
  }
  let $l345 = [], $l395 = void 0, $l504 = void 0, $l505 = false, $l506, $l507 = "disabled", $l508 = false, $l509 = false, $l162 = false, $l510 = false, $l511 = "none", $l512 = false, $l513 = false;
  if ($l11.fallbackCreditCode !== void 0 && (!$l32 || $l217 !== void 0)) $m_a("tengu_fallback_credit_skipped", { reason: $l32 ? $m_b("tool_changes_dropped") : $m_b("backend_unknown_or_mismatch"), ...$l217 && { ...$l217, late_tools_inlined: $l208 }, mint_request_id: $m_ye($l11.fallbackCreditMintRequestId), mint_model: $m_wt($l11.fallbackCreditMintModel), model: $m_wt($l11.model), query_source: $m_Es($l11.querySource) });
  let $l514 = $l32 && $l217 === void 0 ? $l11.fallbackCreditCode : void 0, $l515 = ($l516) => ($l11.fallbackCreditCode ? $l516.split($l11.fallbackCreditCode).join("[FCT_REDACTED]") : $l516).slice(0, 600), $l425 = false, $l517 = false, $l426 = false, $l518 = false, $l519 = false, $l520 = false, $l521 = false, $l522 = ($l523, $l524, $l525) => {
    if (!$l425 || $l520) return;
    $l520 = true;
    let $l526 = $l330;
    $m_a("tengu_fallback_credit_outcome", { outcome: $m_c($l523), mint_request_id: $m_ye($l11.fallbackCreditMintRequestId), mint_model: $m_wt($l11.fallbackCreditMintModel), request_id: $m_ye($l524), client_request_id: $m_ye($l488), model: $m_wt($l11.model), query_source: $m_Es($l11.querySource), carried_effort_level: $m_le($l189?.level), carried_effort_outcome: $m_le($l189?.outcome), effort_level: $m_le($l526), ...$l525 !== null && { input_tokens: $l525.input_tokens, output_tokens: $l525.output_tokens, cache_read_input_tokens: $l525.cache_read_input_tokens, cache_creation_input_tokens: $l525.cache_creation_input_tokens, cache_creation_5m_input_tokens: $l525.cache_creation?.ephemeral_5m_input_tokens ?? 0, cache_creation_1h_input_tokens: $l525.cache_creation?.ephemeral_1h_input_tokens ?? 0, service_tier: $m_le($l525.service_tier), speed: $m_le($l525.speed) } });
  }, $l527 = false, $l528 = false, $l529 = false, $l530 = ($l531, $l532 = true) => $l13(() => $l533($l531, $l532)), $l533 = ($l534, $l535) => {
    if ($l236 !== $l342) $l342 = $l236, $l336 = void 0, $m_fni({ querySource: $l11.querySource, agentId: $l11.agentId, getMessageHashes: $l337, messages: $l236 });
    let $l536 = $l29.filter(($l537) => $l537 !== $m_wE || !$l479());
    if (!$l536.includes($m_wE) && !$l479() && $m_YTt($l534.model) !== null) $l536.push($m_wE);
    let $l538 = $m_Ud($l534.model), $l539 = $l538 === "bedrock" && $m_hW && $l306 && $l27 && $m_Cvn();
    if ($l539) $m_t(`auto-mode 3P: sending afk-mode beta '${$m_hW?.header}' to bedrock via body.anthropic_beta`);
    let $l540 = $l538 === "bedrock" ? [...$m_kXo($l534.model).filter(($l541) => $l541 !== $m_wE || !$l479()), ...$l106 ? [$l106] : [], ...$l539 && $m_hW ? [$m_hW] : []] : [], $l542 = $m_jK($l540);
    $m_qve($l542, $m_uF, $l538 === "bedrock" && $l536.includes($m_uF));
    let $l543 = { ...$l542.output_config ?? {} };
    delete $l542.output_config, $m_dQe($l301, $l543, $l542, $l536, $l26), $l508 = $m_ZYe($l542, $l534.model, $l538), $m_Xpr($l11.taskBudget, $l543, $l536), $l509 = $m_tmr($l11.outputFormat, $l543, $l536, $l11.model);
    let $l544 = $l11.refusalFallbackSilentArmActive === true, $l545 = $m_grn($l11.serverRefusalFallback, $l534.model, $l536, $l28, $l544, $l272);
    $m_yrn($l11.fallbackCreditLaneArmed === true || $l11.fallbackCreditCode !== void 0, $l536, $l28, $l544, $l538 === "bedrock" ? $l542 : void 0), $l519 = $l536.includes($m_k2);
    let $l546 = $m_EXo($l538, $l26), $l547 = $l11.serverClassifier === true && $l11.autoModeServerContext !== void 0 ? $m_sin($m_iun($m_xbt($l0, $l236), $l0, $l236, $l11.agentId), $l0, $l236) : [], $l548 = $l11.serverClassifier === true && $l11.autoModeServerContext !== void 0 ? $m_Qsn({ autoModeServerContext: $l11.autoModeServerContext, priorTurnContext: $m_Cbt($l0), systemReminders: $l547 }) : void 0, $l549 = $l11.serverClassifier === true && $l548 !== void 0 && $l546 && $m_fge() && !$m_sm($l28, $m_xC) && !$m_nne();
    if ($l549) $m_UF($l28, $m_xC), $m_nin($l547, $l548?.system_reminders ?? []);
    if ($l546 && $m_xk($l28, $m_xC) && !$l536.includes($m_xC)) $l536.push($m_xC);
    $m_qve($l542, $m_xC, $l538 === "bedrock" && $l536.includes($m_xC));
    let $l550 = Math.min($l534?.maxTokensOverride || $l11.maxOutputTokensOverride || $l31.maxOutputTokens, $l31.maxOutputTokens), $l551 = $m_i.CLAUDE_CODE_DISABLE_THINKING, $l552 = $l35.type !== "disabled" && !$l551, $l553 = () => $l31.thinking.rejectsDisabled || $l33 !== void 0 && $m_D$e($l33), $l554 = $l552 && $m_CYn($l26) && !$m_sm($l28, $m_$Qo) && ($l393 === "idle" || $l393 === "withoutUpdates"), $l555 = !$l554 ? void 0 : $l35.display === "highlights" && $m_CPn() ? "omitted" : $l35.display, $l556 = void 0;
    if ($l552 && $l31.thinking.supported) if ($m_Bot({ runtimeOverride: $m_J6e($l11.model), resolvedModel: $l26, canonicalModel: $l30 }) === "adaptive") $l556 = { type: "adaptive", display: $l555 };
    else {
      let $l557 = $m_Jci($l26);
      if ($l35.type === "enabled" && $l35.budgetTokens !== void 0) $l557 = $l35.budgetTokens;
      $l557 = Math.max(1024, Math.min($l550 - 1, $l557)), $l556 = { budget_tokens: $l557, type: "enabled", display: $l555 };
    }
    else if ($l35.type === "disabled" && $m_Te() === "firstParty" && !$l551 && $l31.thinking.supported && !$l553()) $l556 = { type: "disabled" };
    let $l558;
    if ($l324) {
      if (!$l536.includes($m_T2)) $l536.push($m_T2);
      if ($m_qve($l542, $m_T2, $l538 === "bedrock"), $l323 !== void 0 && ($l556?.type === "adaptive" || $l556?.type === "enabled") && !("thinking" in $l542)) $l556 = { ...$l556, block_binding: { prefix_mismatch_behavior: $l323 } }, $l558 = $l323;
    }
    let $l559 = $l35.type === "disabled" ? void 0 : $l35, $l560 = $l559?.display, $l561 = "none";
    try {
      $l561 = $m_rsn($l560, $l559?.displayExplicit ?? $m_Qlt());
    } catch ($l562) {
      $m_l($l562);
    }
    let $l563 = () => {
      let $l564 = $l536.indexOf($m_BEn);
      if ($l564 !== -1) $l536.splice($l564, 1);
    };
    if ($l556 && $l555) $l563();
    switch ($l561) {
      case "thinking_and_connector_text":
      case "none":
        break;
      case "connector_text": {
        if (($l556?.type === "adaptive" || $l556?.type === "enabled") && $l554 && !("thinking" in $l542) && !$m_sm($l28, $m_Tpe) && $l393 === "idle" && !$m_i.CLAUDE_CODE_SIMULATE_PROXY_USAGE) {
          if ($l556 = { ...$l556, display: "updates" }, !$l536.includes($m_Tpe)) $l536.push($m_Tpe);
          $m_qve($l542, $m_Tpe, $l538 === "bedrock"), $l563();
        }
        break;
      }
    }
    if ($m_p8e($l26) && !$l536.includes($m_Pst)) $l536.push($m_Pst);
    let $l565 = $l556?.type === "enabled" || $l556?.type === "adaptive" || $l556 === void 0 && $l553(), $l566 = $l11.toolChoice;
    if ($l566?.type === "tool" && $l565) $m_t(`tool_choice {type:'tool', name:'${$l566.name}'} demoted to auto: extended thinking is active`), $l566 = { type: "auto" };
    let $l567 = $l35.type === "disabled" && $l35.mechanical === true;
    if ($l556?.type === "disabled" && ($l567 || $l31.thinking.capsEffortWhenDisabled) && typeof $l543.effort === "string" && $m_b4r($l543.effort)) {
      if (!$l529) $l529 = true, $m_t(`output_config.effort '${$l543.effort}' clamped to '${$m_KEt}': thinking is ${$l567 ? "mechanically " : ""}disabled for this request, and this model rejects higher effort when thinking is disabled`);
      if (!$l567 && $m_ss($l11.querySource) === "main" && $m_ni().once("effort_thinking_disabled_clamp")) $m_a("tengu_effort_clamped_thinking_disabled", { from: $m_c($l543.effort), to: $m_c($m_KEt), query_source: $m_Es($l11.querySource) });
      $l543.effort = $m_KEt;
    }
    let $l568 = $m_E9t({ hasThinking: $l552, toolClearing: $l442?.edit }), $l569 = $l11.enablePromptCaching ?? $m_fce($l33 ?? $l534.model), $l570;
    if ($m_os() && $l13(() => $m_BI()) && !$m_x4e() && $l13(() => $m_Zh($l34)) && !!$l534.fastMode && !$m_svn($l534.model)) $l570 = "fast";
    if ($l312 && !$l536.includes($m_UEn)) $l536.push($m_UEn);
    if ($m_hW && $l306 && $m_y8r() && $l27 && !$l536.includes($m_hW)) {
      if ($l536.push($m_hW), $m_Cvn()) $m_t(`auto-mode 3P: sending afk-mode beta '${$m_hW.header}' to ${$l538} via betas header`);
    }
    if ($l285 === "1h" && $m_k_() && !$l536.includes($m_lYt)) $l536.push($m_lYt);
    let $l571 = null, $l572 = $l329?.buildRequestParams($l236);
    if ($l572) $l536.push($l572.beta), $l571 = $l572.body;
    let $l573 = null;
    if ($m_xk($l28, $m_xst) && $l569) {
      if (!$l536.includes($m_xst)) $l536.push($m_xst);
      $l573 = { cache_control: { type: "ephemeral", ...$l286 && { ttl: $l286 }, evict_on_complete: true } };
    }
    if ($l313() && !$l536.includes($m_LAt)) $l536.push($m_LAt);
    if ($l314 && !$l536.includes($m_WM)) $l536.push($m_WM);
    let $l574 = $m_i.CLAUDE_CODE_SIMULATE_PROXY_USAGE, $l575 = $l186 && $l294 && !$l574 && $m_car($l536).includes($m_Gq), $l576 = $l343 !== null && !$l574 ? $l343.plan($l236, $l575) : null, $l577 = $m_A2 !== null && ($m_sm($l28, $m_A2) || $l419 !== "idle"), $l578 = $l577 ? null : $l576;
    if ($m_A2 !== null) {
      if ($l578 !== null) $m_UF($l28, $m_A2);
      if ($l577) {
        for (let $l579 = $l536.length - 1; $l579 >= 0; $l579--) if ($l536[$l579] === $m_A2) $l536.splice($l579, 1);
      } else if (($l578 !== null || $m_xk($l28, $m_A2)) && !$l536.includes($m_A2)) $l536.push($m_A2);
    }
    let $l580 = $l574 ? $l536.filter(($l581) => $l581 === $m_dPe) : $l536;
    if ($l574) $m_t(`[API:client] SIMULATE_PROXY_USAGE: stripping ${$l536.length - $l580.length} beta headers from request (keeping ${$m_fF($l580).join(", ") || "none"}): ${$m_fF($l536).join(", ")}`);
    let $l582 = !$l552 && $l31.acceptsTemperature ? $l11.temperatureOverride ?? 1 : void 0;
    $l345 = $m_fF($l580), $l480 = $l580.includes($m_wE) || $l540.includes($m_wE), $l395 = $l556 !== void 0 && "display" in $l556 && !("thinking" in $l542) ? $l556.display ?? void 0 : void 0, $l505 = $l556 !== void 0 && "block_binding" in $l556, $l506 = $l558;
    let $l583 = $m_car($l580), $l584 = $l294 && (!$l574 || $l580.length > 0) && $m_fF($l583).length > 0;
    $l477 = $l575, $l421 = false;
    let $l585 = $l584 && ($l583.includes($m_yW) || $m_Yw !== null && $l583.includes($m_Yw));
    $l512 = $l585 && $m_fee($l236);
    let $l586 = $l584 && ($l545.fallbacks === "default" ? $m_Yw !== null && $l583.includes($m_Yw) : $l583.includes($m_yW)) ? $l545 : {};
    if ($l510 = $l586.fallbacks !== void 0, $l511 = $l586.fallbacks === "default" ? "default" : $l510 ? "explicit" : "none", !$l585 && $m_fee($l236)) $l166 = "error_recovery", $l167 = false;
    let $l587 = false;
    $l476 = $l587;
    let $l588 = [];
    $l266 = void 0;
    let $l589 = $l569 && !$l11.skipMessageCacheMarkers, $l590 = !$l574 && $l573 !== null || $l542.cache_control != null, $l591 = $l247($l236, $l585, $l587), $l592 = $l535 && $l264 === "idle" ? $m_hun({ querySource: $l11.querySource, model: $l33 ?? $l534.model, isKeepaliveHeaderOnWire: $l584 && $l583.includes($m_WM), hasSecondMarkerSlot: $l589 && !$l590 && $l11.divergesAtMessageId === void 0, messages: $l591 }) : void 0, $l593 = $l165 = $m_Xmr($l591, $l589, $l286, $l11.skipCacheWrite, $l11.forkPointUuid, $m_sm($l28, $m_Alr) || $m_xfs(), $l538, $l578 !== null, $l590, $l575, $l588, $l11.divergesAtMessageId, { skipMessageCacheMarkers: $l11.skipMessageCacheMarkers === true, report: ($l594) => {
      $l266 = $l594;
    } }, $m_uun($l11.querySource, $l11.skipCacheWrite === true), $l535, $l592);
    $l445 = $l588.some(($l595, $l596) => $l595 !== $l596) ? $l588 : [];
    let $l597 = ($l598) => Array.isArray($l598.content) && $l598.content.some(($l599) => typeof $l599 === "object" && $l599 !== null && "cache_control" in $l599 && $l599.cache_control != null);
    $l262 = $l593.some(($l600) => $l600.role === "system" && $l597($l600)), $l265 = $l593.some($l597);
    let $l601 = $l592?.isMarkWanted === true ? $l593.findLastIndex($l597) : -1;
    if ($l263 = $l601 > 0 && $l593.some(($l602, $l603) => {
      let $l604 = $l602.role;
      return $l603 < $l601 && $l604 === "system" && $l597($l602);
    }), $l466 = $l549 && $l294 && !$l574 && $m_car($l580).includes($m_xC), $l535) {
      if ($l467 !== void 0) $m_T1e($l467);
      if ($l467 = $l466 ? $m_xGt($m_dee(), { artifacts: $l548?.artifacts, thread: $l578 !== null, exactMcpAllowRules: $l548 && $m_PGt($l548), judgeOnlyTools: $l11.autoModeServerContext?.judgeOnlyTools, agentId: $l11.agentId }) : void 0, $l467 !== void 0 && $l548 !== void 0) $m_wbt($l467.key, $m_Xsn($l548));
    }
    let $l605 = $m_H7s($l296, $l11.model);
    $l605 = $m_f9t($l605, $l28);
    let $l606 = $l343 !== null ? $l343.shapeInheritedFields($l578, { system: $l293, tools: $l605 }) : { system: $l293, tools: $l605 };
    $l173 = $l293, $l170 = $l605, $l174 = $l606.system !== $l293, $l449 = $l578 !== null;
    let $l607 = { model: $m_hA($l11.model), messages: $l578 !== null && $l578.sliceFrom > 0 ? $l593.slice($l588[$l578.sliceFrom]) : $l593, system: $l606.system, ...$l606.tools !== void 0 && { tools: $l606.tools }, tool_choice: $l566, ...$l584 && $m_iFe($l583), metadata: $m_Qze({ agentContext: $l11.agentContext }), max_tokens: $l550, thinking: $l556, ...$l582 !== void 0 && { temperature: $l582 }, ...$l568 && $l294 && $l536.includes($m_Epe) && { context_management: $l568 }, ...$l466 && $l548 !== void 0 && { safeguards: [{ type: $m_k1e, classifier_context: $l548 }] }, ...!$l574 && $l571 ? $l571 : {}, ...!$l574 && $l573 ? $l573 : {}, ...$l586, ...$l542, ...{}, ...Object.keys($l543).length > 0 && { output_config: $l543 }, ...$l570 !== void 0 && { speed: $l570 }, ...$l578 !== null && { thread: $l578.thread }, ...$l313() && ($l27 || $l11.forkPointUuid !== void 0) && $l294 && !$l574 && { diagnostics: { previous_message_id: $l25 ?? null } } };
    $l444 = $l442 !== void 0 && $l607.context_management === $l568, $l421 = $l575 && $l607.messages.some(($l608) => $l608.clear_at !== void 0);
    let $l609 = $m_Ypr($l607.thinking, $l11.querySource, !$l527);
    if ($l609 !== $l607.thinking) $l527 = true, $l607.thinking = $l609;
    {
      let $l610 = $l607.thinking;
      $l507 = $l610?.type === "adaptive" || $l610?.type === "enabled" ? $l610.type : "disabled", $l504 = $m_ffn($l610);
    }
    if ($l535 && $m_ymr($l607)) {
      try {
        $l607 = $m_El($l607);
      } catch {
      }
      if ($m_D6e($l607), !$l528) $l528 = true, $m_a("tengu_lone_surrogate_sanitized", { source: $m_b("queryModel") });
    }
    let $l611 = $l607.output_config?.effort;
    $l330 = typeof $l611 === "string" && $m_Fw($l611) ? $l611 : void 0;
    let $l612 = $m_R8e($l236);
    return $l331 = $l612.effort ?? null, $l332 = $l612.now, $l607;
  };
  {
    let $l613 = $l530({ model: $l11.model }, false), $l614 = $l236.length, $l615 = $l294 ? $l613.betas ?? [] : [], $l616 = $l613.thinking?.type ?? "disabled", $l617 = $l506, $l618 = $l190;
    $l11.getToolPermissionContext().then(($l619) => {
      $m_Oun({ model: $l11.model, messagesLength: $l614, temperature: $l11.temperatureOverride ?? 1, betas: $l615, permissionMode: $l619.mode, proactivityLevel: $l11.proactivityLevel, querySource: $l11.querySource, messageClientPlatform: $l11.messageClientPlatform, queryTracking: $l11.queryTracking, thinkingType: $l616, thinkingPrefixMismatchBehavior: $l617, effortValue: $l618, fastMode: $l305, previousRequestId: $l19 });
    });
  }
  let $l620 = [], $l621 = 0, $l622, $l623 = 0, $l624 = 0, $l625 = 0, $l626 = false, $l627, $l291 = 0, $l363 = void 0, $l628 = [], $l292 = $m_Pm, $l629 = null, $l630 = 0, $l631 = null, $l632 = false, $l633 = "none";
  function $l634() {
    if ($l633 === "credited") return;
    $l633 = "credited", $l630 += $m_$7e($m_Cxe($l26, $l292), $l292, $l11.model, $l11.querySource, $l303, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool);
  }
  let $l635 = false, $l636 = false, $l637, $l638 = 0, $l639 = void 0, $l640 = void 0, $l641, $l642 = $l305, $l643 = false, $l644 = $m_Af($l11.agentContext) && $l11.querySource.startsWith("repl_main_thread"), $l645 = void 0, $l646 = /* @__PURE__ */ new Map(), $l647 = 3, $l648 = { value: 0 }, $l649 = $l647, $l650 = /* @__PURE__ */ new Map(), $l651 = false, $l652 = false, $l653, $l654 = { count: 0 }, $l655 = $m_Z8e(), $l656 = $m_Emn({ maxRetries: $l655, maxSleptThrough: $m_bmn($l655), maxReconnects: $m_wmn($l11.querySource), maxOverloaded: $m_nee, maxOutputFiltered: $m_vmn(), hasFallbackModel: Boolean($l11.fallbackModel), persistent: $m_pAe(), persistentCapacityOnly: $m_pAe() && !$m_Db(), background: !$m_Rxe($l11.querySource) }, $l11.apiAttemptsLeft), $l657 = false, $l658 = null, $l659 = false, $l660 = ($l661, $l662) => {
    if ($l658 = null, $l659 = $m_ps(), $l657) {
      if ($l659) $l661[$m_Ny] = $m_Aw, $l658 = $m_c($m_Aw), $m_t(`[dispatch] sent ${$m_Ny}=${$m_Aw}`);
      return;
    }
    if (!$l662 && $l659) {
      let $l663 = $m_eJe($m_ss($l11.querySource));
      if ($l663 !== null) $l661[$m_Ny] = $l663, $l658 = $m_c($l663), $m_t(`[dispatch] sent ${$m_Ny}=${$l663}`);
    }
  }, $l664 = async ($l665) => {
    if ($l657) return;
    let $l666 = $l665 instanceof $m_Mt ? $l665.status : void 0, $l667 = $l666 !== void 0 && $l666 >= 500, $l668 = $l665 instanceof $m_Uu;
    if (!($l658 !== null ? $l667 || $l668 : $l659 && $l666 === 503)) return;
    if ($l657 = true, $m_t(`[dispatch] ${$l667 ? `HTTP ${$l666}` : "connection error"} with ${$l658 === null ? `no ${$m_Ny}` : `${$m_Ny}=${$l658}`}; retrying once with ${$m_Ny}=${$m_Aw}`, { level: "warn" }), $m_a("tengu_dispatch_header_fallback", { model: $m_wt($l11.model), dispatch: $l658 ?? $m_b("none"), resend_dispatch: $m_c($m_Aw), reason: $l658 === null ? $m_IJr($l665) : $l667 ? $m_b("5xx") : $m_b("conn_err"), status: $l666 !== void 0 ? $m_Xr($l666) : $m_b("none"), query_source: $m_Es($l11.querySource), request_id: $m_ye($l665 instanceof $m_Mt ? $l665.requestID : void 0) }), $l658 === null) {
      let $l669 = $m_OJr($l665);
      if ($l669 > 0) await $m_J($l669, $l4, { clock: $l12 });
    }
    return "retry:dispatch-header-strip";
  }, $l670 = false, $l671 = false, $l672 = false, $l673, $l674 = ($l675, $l676) => {
    if (!($l675 instanceof $m_Mt) || $l675.status !== 400) return;
    let $l677 = $l675.message.includes("`fallback-credit-"), $l678 = $m_Yw !== null && $l675.message.includes(`\`${$m_Yw.header}`), $l679 = ($m_Yw !== null ? new RegExp(`\`server-side-fallback-(?!${$m_Yw.header.slice(21)})`) : /`server-side-fallback-/).test($l675.message), $l680 = ($l681) => {
      $m_t(`[server-fallback] 400 attributed (${$l681}) \u2014 stripping and retrying`, { level: "warn" });
      let $l682 = $l511;
      $m_a("tengu_rotunda_pennant_strip", { shape: $m_c($l681), mode: $m_c($l682), non_streaming: $l676 === "sync", query_source: $m_Es($l11.querySource), sticky_scope: $l11.stickyBetas === void 0 ? $m_b("session") : $m_ss($l11.querySource) === "main" ? $m_b("detached_main") : $m_ss($l11.querySource) === "subagent" ? $m_b("agent") : $m_b("aux") });
    }, $l683 = $m_Ake($l675);
    if ($l683 !== void 0 && !$l426) {
      if ($l426 = true, $l514 = void 0, $l683 === "credit_beta_header") {
        if ($m_Mg($l28, $m_k2), $l678 && $m_Yw !== null) $m_Mg($l28, $m_Yw), $l513 = true;
        if ($l679) $m_Mg($l28, $m_yW), $l670 = true;
        if ($l678 && $l512 && !$m_sm($l28, $m_yW)) $m_UF($l28, $m_yW);
      }
      if ($l676 === "stream") $l522($l683, $l675.requestID ?? null, null);
      return $l680($l683), "retry:fallback-credit-strip";
    }
    let $l684 = $m_xke($l675);
    if ($m_Yw !== null && ($l684 === "category_beta_header" || $l684 === "default_unconfigured" && $l510) && !$l513) {
      if ($l513 = true, $m_Mg($l28, $m_Yw), $l677) $m_Mg($l28, $m_k2), $l426 = true, $l514 = void 0;
      if ($l679) $m_Mg($l28, $m_yW), $l670 = true;
      if ($l512 && !$m_sm($l28, $m_yW)) $m_UF($l28, $m_yW);
      return $l680($l684), "retry:server-fallback-category-strip";
    }
    if ($l684 !== void 0 && ($l510 || $l684 === "beta_header") && !$l670) {
      if ($l670 = true, $m_Mg($l28, $m_yW), $l684 === "beta_header" && $l677) $m_Mg($l28, $m_k2), $l426 = true, $l514 = void 0;
      return $l680($l684), "retry:server-fallback-strip";
    }
    if ($m_nJ($l675)) return;
    if ($m__x($l675)) return;
    if ($m_JH($l675) || $m_Uq($l675)) return;
    if ($m_Dq($l675)) return;
    if ($m_pke($l675)) return;
    if ($m_Uve($l675) || $m_Bve($l675) !== void 0) return;
    if ($l357($l675)) {
      if ($l676 === "stream" && $l517 && !$l426) $l514 = $l11.fallbackCreditCode;
      return;
    }
    if ($l11.resumeIncompleteThinking) return;
    if ($l676 === "sync" && $l367($l675)) return;
    if ($l683 === void 0 && $l684 === void 0) {
      let $l685 = $l415($l675);
      if ($l685 !== void 0) return $l685;
      let $l686 = $l432($l675);
      if ($l686 !== void 0) return $l686;
      let $l687 = $l688($l675);
      if ($l687 !== void 0) return $l687;
    }
    if ($l676 === "stream" && $l425 && !$l426) return $l426 = true, $l522("unattributed_400_dropped", $l675.requestID ?? null, null), $l680("unattributed"), "retry:fallback-credit-unattributed";
    if (($l510 || $l512) && !$l670) {
      if ($l670 = true, $m_Mg($l28, $m_yW), $m_Yw !== null) $m_Mg($l28, $m_Yw);
      return $l680("unattributed"), "retry:server-fallback-strip";
    }
    if ($l519 && !$l518) return $l518 = true, $m_Mg($l28, $m_k2), $l347.push($m_k2), $l680("unattributed"), "retry:fallback-credit-header-strip";
    return;
  }, $l367 = ($l689) => $m_Ujt($l11.model, $l689) === "refused" || $m_bke($l689) || $m_g4e($l689) || $m_h4e($l689) || $m_JH($l689) || $m_Uq($l689) || $m_yke($l689) !== void 0 || $m_C4e($l689, $m_fF($m_R4e)).length > 0 || $m_y4e($l689) || $m_k4e($l689) || $m_E4e($l689) || $m_Dke($l689) !== null || $m_MM($l689) || $m__x($l689) || $m_qXt($l689) || $m_KXt($l689) || $m_A4e($l689) || $m_Ike($l689) || $m_P4e($l689) || $m_Yq($l689) || $m_Qq($l689), $l690 = () => {
    if ($l87 === "tool_search") return;
    try {
      let $l691 = 0;
      if ($l87 === void 0) $l296 = $l296.slice();
      else $l296 = $l296.flatMap(($l692) => {
        if (!("input_schema" in $l692)) return [$l692];
        if (!$l3.some(($l693) => $m_xt($l693, $l692.name))) return [];
        if ($l692.defer_loading !== true) return [$l692];
        $l691++;
        let { defer_loading: $l694, ...$l695 } = $l692;
        return [$l695];
      });
      let $l696 = new Set($l296.flatMap(($l697) => "name" in $l697 ? [$l697.name] : [])), $l698 = new Map($l3.map(($l699, $l700) => [$l699.name, $l700]));
      for (let $l701 of $l132) {
        if (!("name" in $l701) || $l696.has($l701.name)) continue;
        let $l702 = $l698.get($l701.name) ?? 1 / 0, $l703 = $l296.findIndex(($l704) => !("input_schema" in $l704) || ($l698.get($l704.name) ?? -1) > $l702);
        if ($l703 === -1) $l703 = $l296.length;
        $l296.splice($l703, 0, $l701), $l696.add($l701.name), $l691++;
      }
      if ($l87 === "tool_addition") $l159?.splice(0, $l159.length), $m_cto($l28), $m_mPt($l28);
      else if ($l691 === 0) return;
      else {
        let $l705 = $l88.slice();
        for (let $l706 of $l3) {
          if (!$l696.has($l706.name) || !$l59.has($l706.name)) continue;
          let $l707 = $l698.get($l706.name) ?? 1 / 0, $l708 = $l705.findIndex(($l709) => ($l698.get($l709.name) ?? -1) > $l707);
          if ($l708 === -1) $l708 = $l705.length;
          $l705.splice($l708, 0, $l706);
        }
        $l89 = $m_j1o($l28, false, () => $m_W1o($m_Z9($l705), $l3, $l121 ?? $l89?.recordedOnly));
      }
      $l166 = "error_recovery", $l167 = false, $m_t(`[late-tool-additions] no ToolSearch on this request: ${$l691} late tool(s) go inline from this request on`, { level: "warn" });
    } catch ($l710) {
      $m_l($m_N($l710));
    }
  }, $l711 = () => {
    let $l712 = $l260;
    if ($l712) $l260 = () => $m_lee($m_xw($l712()));
    let $l713 = $l259;
    if ($l713) $l259 = () => $m_lee($m_xw($l713()));
    let $l714 = $l261;
    if ($l714) $l261 = () => $m_lee($m_xw($l714()));
  }, $l715 = () => {
    let $l716 = $l260;
    if ($l716) $l260 = () => $m_xw($l716());
    let $l717 = $l259;
    if ($l717) $l259 = () => $m_xw($l717());
    let $l718 = $l261;
    if ($l718) $l261 = () => $m_xw($l718());
  }, $l719 = () => {
    if (!$m_eA()) $l29 = $l29.filter(($l720) => $l720 !== $m_dYt);
  }, $l721 = false, $l722 = ($l723) => {
    if ($l721 || !$m_h4e($l723)) return;
    let $l724 = ($l725) => !("input_schema" in $l725) && "name" in $l725 && $l725.name === $m_TLe, $l726 = $l296.some($l724), $l727 = $l345.includes($m_dYt.header) && $m_Eke($l723);
    if (!$l726 && !$l727) return;
    $l721 = true;
    try {
      if ($l726) $l296 = $l296.filter(($l728) => !$l724($l728)), $l236 = $l255($m_lee($m_xw($l236)), "error_recovery"), $l711(), $l166 = "error_recovery", $l167 = false;
      $l28.advisorHeld = { model: void 0, viaToolChange: $l28.advisorHeld?.viaToolChange ?? false, refused: true };
      let $l729 = $m_UXt($l723);
      if ($l729 === "process") $m_dqs();
      else if ($l729 === "host") $m_uqs();
      $l719(), $m_t(`[advisor] the server refused the advisor ${$l727 ? "beta header" : "entry"} (scope: ${$l729}); retrying once without the advisor`, { level: "warn" }), $m_a("tengu_advisor_entry_refused_retry", { query_source: $m_Es($l11.querySource), organization_wide: $l729 === "process", host_wide: $l729 === "host", beta_header_refused: $l727 });
    } catch ($l730) {
      $m_l($m_N($l730));
    }
    return "retry:advisor-entry-refused";
  }, $l731 = new $m_bYe($l28), $l732 = ($l733) => {
    try {
      let $l734 = $l731.resolve($l733, $l170, $l3, $l11.querySource);
      if ($l734 !== void 0) $l166 = "error_recovery", $l167 = false;
      return $l734;
    } catch ($l735) {
      $m_l($m_N($l735));
      return;
    }
  }, $l736 = ($l737) => {
    return;
  }, $l738 = "idle", $l688 = ($l739) => {
    return;
  }, $l740 = () => {
    try {
      let $l741 = false, $l742 = $l11.advisorActive !== false;
      if ($l296 = $l296.flatMap(($l743) => {
        if ("input_schema" in $l743 || !("defer_loading" in $l743) || $l743.defer_loading !== true || $l743.name !== $m_TLe) return [$l743];
        if ($l741 = true, !$l742) return [];
        let { defer_loading: $l744, ...$l745 } = $l743;
        return [$l745];
      }), $l741) {
        if (!$l742) $l236 = $l255($m_lee($m_xw($l236)), "error_recovery"), $l711(), $l719();
        if ($l742 && $l28.advisorHeld?.viaToolChange === true) $l28.advisorHeld = { ...$l28.advisorHeld, inFallback: true };
        $l166 = "error_recovery", $l167 = false;
      }
    } catch ($l746) {
      $m_l($m_N($l746));
    }
  }, $l747 = () => {
    let $l748 = $l260;
    if ($l748) $l260 = () => $m_HK($l748()).messages;
    let $l749 = $l259;
    if ($l749) $l259 = () => $m_HK($l749()).messages;
    let $l750 = $l261;
    if ($l750) $l261 = () => $m_HK($l750()).messages;
  }, $l751 = ($l752, $l753) => {
    if (!$m_JH($l752)) return;
    let { messages: $l754, removed: $l755 } = $m_HK($l236);
    if ($l754 === $l236) return;
    return $l236 = $l255($l754, "error_recovery"), $m_Avi($l28), $l747(), $m_t(`[web-search-strip] The API could not decrypt web search content in this conversation's history: removed ${$l755.toolUses} ${$m_O($l755.toolUses, "search call")}, ${$l755.results} ${$m_O($l755.results, "result block")} and ${$l755.citations} ${$m_O($l755.citations, "citation")} from the request; retrying once. Later requests in this conversation leave them out too.`, { level: "warn" }), $m_f("api_request", "api_request_web_search_stripped", { query_source: $m_Es($l11.querySource), transport: $m_c($l753), tool_uses: $l755.toolUses, results: $l755.results, citations: $l755.citations, placeholders: $l755.placeholders }), "retry:web-search-strip";
  }, $l756, $l757 = ($l758) => {
    let $l759 = $m_uto($l28, $l34);
    if (!$m_bXt($l758) || $l759?.gaveUp) return;
    try {
      let $l760 = $m_wmr($l236), $l761 = Math.min($l760, $l756?.limit ?? 1 / 0), $l762 = $m_Dbi.find(($l763) => $l763 < $l761);
      if ($l762 === void 0) {
        if ($l756 !== void 0) {
          let { steps: $l764, refusedAt: $l765 } = $l756;
          $l756 = void 0, $m_fto($l28, { model: $l34, limit: $l759?.limit, gaveUp: true }), $m_t(`[media-item-limit] The model still refuses this request as unprocessable with ${$l760} images and documents left. Not removing any more.`, { level: "warn" }), $m_f("api_request", "api_request_media_limit_gave_up", { query_source: $m_Es($l11.querySource), media_items_refused: $l765, steps: $l764 });
        }
        return;
      }
      let $l766 = ($l767) => $m_ign($l767, $l762, $m_sis);
      $l236 = $l255($l766($l236), "error_recovery");
      let $l768 = $l260;
      if ($l768) $l260 = () => $l766($l768());
      let $l769 = $l259;
      if ($l769) $l259 = () => $l766($l769());
      let $l770 = $l261;
      if ($l770) $l261 = () => $l766($l770());
      return $l756 = { limit: $l762, steps: ($l756?.steps ?? 0) + 1, refusedAt: $l756?.refusedAt ?? $l760 }, $m_t(`[media-item-limit] The model refused this request as unprocessable. It held ${$l760} images and documents; the oldest were removed to fit a limit of ${$l762}, and it is being sent again. If it is answered, this conversation keeps that limit.`, { level: "warn" }), `retry:media-item-limit:${$l762}`;
    } catch ($l771) {
      $m_l($m_N($l771));
      return;
    }
  }, $l772 = () => {
    try {
      let $l773 = $m_uto($l28, $l34);
      if ($l756 === void 0) {
        if ($l773?.gaveUp && $l773.limit === void 0) $m_hPt($l28);
        else if ($l773?.gaveUp) $m_fto($l28, { ...$l773, gaveUp: false });
        return;
      }
      let { limit: $l774, steps: $l775, refusedAt: $l776 } = $l756;
      $l756 = void 0, $m_fto($l28, { model: $l34, limit: Math.min($l774, $l773?.limit ?? 1 / 0), gaveUp: false }), $m_f("api_request", "api_request_media_limit_lowered", { query_source: $m_Es($l11.querySource), media_items_refused: $l776, media_item_limit: $l774, steps: $l775 });
    } catch ($l777) {
      $m_l($m_N($l777));
    }
  }, $l778 = ($l779) => {
    {
      let $l780 = $l779 instanceof $m_Mt && $l779.status === 400;
      if ($l264 === "retrying") {
        if ($l780) $l264 = "spent";
        return;
      }
      if ($l264 === "idle" && $l263 && $l780 && $l779.message.includes("cache_control")) return $l264 = "retrying", "retry:prompt-end-mark";
    }
    return;
  }, $l781 = () => {
    if ($l264 !== "retrying") return;
    if ($l264 = "spent", $l33 !== void 0) return;
    try {
      $m_Jfs(), $m_t("[cache-breakpoints] a side request that marked a system message before its last marker drew a 400 that names cache_control, and went through without that marker; no later side request carries it", { level: "warn" }), $m_f("api_prompt_end_mark", "server_rejected");
    } catch ($l782) {
      $m_l($l782);
    }
  }, $l389 = ($l783, $l784 = false) => {
    let $l785 = $l29.includes($m_xS) && !$m__x($l783) && $m_Oke($l783) !== "header_rejected" ? $m_Mke($l783) : void 0;
    if ($l785 !== void 0) {
      if ($l261) {
        let $l786 = $l261();
        if ($l236 = $l255(!$l29.includes($m_E2) ? $m_Rve($l786) : !$l29.includes($m_U6) ? $m_xve($l786) : $l786, "error_recovery"), $l239 = $l243, $m_jls($l28, $l60), $l87 === void 0) $l690();
      }
      return $l261 = null, $l29 = $l29.filter(($l787) => $l787 !== $m_xS), $m_$3s($l28, $l785), $l280(), $m_a("tengu_inline_tools_refused_retry", { cause: $m_c($l785) }), "retry:inline-tools-strip";
    }
    let $l788 = $l29.includes($m_lw) && !$m__x($l783) ? $m_Oke($l783) : void 0;
    if ($l788 !== void 0) {
      if ($l260) {
        let $l789 = $l260();
        $l236 = $l255(!$l29.includes($m_E2) ? $m_Rve($l789) : !$l29.includes($m_U6) ? $m_xve($l789) : $l789, "error_recovery"), $l239 = $l243;
      }
      $l260 = null;
      let $l790 = $l29.includes($m_xS) && $m_Mke($l783) === "header_rejected";
      return $l29 = $l29.filter(($l791) => $l791 !== $m_lw && $l791 !== $m_xS), $m_N3s($l28, $l788, $l11.model, $l790), $l280(), $l690(), $l740(), "retry:tool-change-strip";
    }
    let $l792 = $l784 || $m__x($l783), $l793 = $m_Pke($l783), $l794 = $l29.includes($m_E2) && $m_Ike($l783) && !$m_Yq($l783), $l795 = $l29.includes($m_U6);
    if ($l795 && $m_P4e($l783) && !$l792 && !$l794) return $l236 = $l255($m_xve($l236), "error_recovery"), $l29 = $l29.filter(($l796) => $l796 !== $m_U6), $m_Mg($l28, $m_U6), $m_t(`[per-turn-timing] the server refused the current-time statement (${$m_d($l783)}); leaving it out for the rest of this conversation (until /clear or /compact)`, { level: "warn" }), "retry:per-turn-timing-strip";
    if ($l259 && ($l792 || $l794)) {
      if ($l793 !== null && !$l165.some(($l797) => $l797.role === "system" && $l797.content.length > 0)) return;
      let $l798 = $m_HTt($l28), $l799 = $l165.length, $l800 = $l236.length, $l801 = $l793 === null ? void 0 : $l793.messageIndex === void 0 ? `${$l799} messages on the wire` : $l793.messageIndex >= $l799 ? `messages[${$l793.messageIndex}], beyond the ${$l799} this request sent` : `messages[${$l793.messageIndex}] of ${$l799} on the wire; conversation entry ${$l446($l793.messageIndex) ?? "none of ours (a clear_at reminder slot)"} of ${$l800}`;
      if ($l236 = $l255($l792 ? $l259() : $m_Rve($l236), "error_recovery"), $l259 = null, $l795) $l29 = $l29.filter(($l802) => $l802 !== $m_U6);
      if ($l792) {
        if ($l239 = $l243, $l29 = $l29.filter(($l803) => $l803 !== $m_XI && $l803 !== $m_E2 && $l803 !== $m_lw && $l803 !== $m_xS && $l803 !== $m_Gq), $m_Mg($l28, $m_XI), $m_K1o($l28), $l280(), $l690(), $l740(), $l260 !== null) $m_f("mcp_late_tool_additions", "rejected_with_mid_conv_system"), $l260 = null;
      }
      if ($l794) {
        if ($l29 = $l29.filter(($l804) => $l804 !== $m_E2), $l39($m_E2, $m_VXt($l783)), $l331 !== null) $m_f("api_per_turn_effort", "server_rejected");
      }
      if ($l11.stickyBetas === void 0) $m_qZ($l28, $l798);
      return $m_t($l801 !== void 0 ? `[mid-conv-system] API refused where a system message sits (${$l801}) \u2014 retrying once without system messages; off for this conversation until /clear or /compact` : $l794 ? "[per-turn-control] server rejected the per-turn statements \u2014 resending without them" : $l784 ? "[mid-conv-system] an HTTP 400 or 422 that nothing else recognises answered a request on which system turns were enabled; guessing the platform refuses them and resending without system messages; if that goes through they stay off until /clear or /compact" : '[mid-conv-system] server rejected role:"system" \u2014 falling back to a body with no {role:"system"} turn, sticky-rejecting the beta until /clear or /compact', { level: "warn" }), $m_a("tengu_mid_conv_system_fallback_retry", { per_turn_effort: $l794, ...$l784 && { unclaimed: $l784 }, misplaced: $l793 !== null, ...$l793 !== null && { misplaced_index: $l793.messageIndex ?? -1, wire_message_count: $l799, message_count: $l800 } }), "retry:mid-conv-system";
    }
    if ($l262 && !$m_sm($l28, $m_Alr) && $m_A4e($l783)) return $m_Mg($l28, $m_Alr), $m_Pfs(), $m_t("[mid-conv-system] proxy rejected cache_control on the api_system tail \u2014 demoting the breakpoint to the trailing message for this conversation", { level: "warn" }), $m_f("api_midconv_cache_proxy", "proxy_rejected"), "retry:api-system-cache-demote";
    return;
  }, $l805 = ($l806) => {
    if ($l262 && !$l263 && !$m_sm($l28, $m_Alr) && !$m_sm($l28, $m_LQo)) {
      let $l807 = $l806?.input_tokens ?? 0, $l808 = $l806?.cache_read_input_tokens ?? 0, $l809 = ($l806?.cache_creation_input_tokens ?? 0) + ($l806?.cache_creation?.ephemeral_5m_input_tokens ?? 0) + ($l806?.cache_creation?.ephemeral_1h_input_tokens ?? 0), $l810 = $l807 + $l808 + $l809 > 0, $l811 = $l809 > 0 && $l807 < $m_Ymr;
      if ($l810 && !$l811) return;
      $m_Mg($l28, $m_LQo), $m_g("api_midconv_cache_proxy");
    }
  }, $l812 = ($l813) => {
    if (!$l265 || $l11.skipCacheWrite || !$m_Dmr($m_Ud($l11.model))) return;
    let $l814 = $m_Poi($m_ni().cacheCoverage, $l28, $l813);
    if ($l814.kind === "confirm") {
      $m_g("api_prompt_cache_coverage", { provider: $m_c($m_Ud($l11.model)) });
      return;
    }
    if ($l814.kind !== "fire") return;
    $m_t("[cache-coverage] sustained uncovered input with a cache breakpoint on the wire through a custom endpoint \u2014 no cache-billing evidence visible at the client (the endpoint may be silently stripping cache_control)", { level: "warn" }), $m_f("api_prompt_cache_coverage", "cache_coverage_loss", { api_system_marker: $l262, consecutive_turns: $l814.consecutive, input_tokens: $l814.inputTokens, cache_read_input_tokens: $l814.cacheReadTokens, cache_creation_input_tokens: $l814.cacheCreationTokens, provider: $m_c($m_Ud($l11.model)) });
  }, $l815 = () => {
    if (!$m_Gfs() && $l331 !== null) $m_zfs(), $m_g("api_per_turn_effort");
  }, $l816 = () => {
    if (!$m_Kfs() && $l260 !== null) $m_Vfs(), $m_g("mcp_late_tool_additions");
    if (!$m_Qfs() && $l260 !== null && $l29.includes($m_xS) && $l236.some(($l817) => $l817.type === "api_system" && $l817.toolDefinitions !== void 0)) $m_Zfs(), $m_g("mcp_inline_tools");
  }, $l818 = () => {
  }, $l819 = () => {
  }, $l820 = () => {
    if ($l419 === "retrying") {
      $l419 = "spent";
      try {
        if ($m_A2 !== null) $m_Mg($l28, $m_A2);
        if ($l430) $m_D8e();
        $m_a("tengu_tether_unrecognised_400", { phase: $m_b("healed"), planner_backed: $l430, query_source: $m_Es($l11.querySource) }), $m_t(`[tether] a request carrying the message-threads header got an HTTP 400 that Claude Code does not recognise (request id ${$l436 ?? "unknown"}), and a later attempt without the header succeeded. ${$l430 ? "Message Threads stays off for the rest of this session." : "The header stays off for this conversation."}`, { level: "warn" });
      } catch ($l821) {
        $m_l($l821);
      }
    }
    if ($l477) $m_lpn();
    if ($l418 === "retrying") $l418 = "spent", $m_Mg($l28, $m_Gq), $m_L8e(), $l280(), $m_f("api_kept_reminder_clear_at", "unrecognised_400"), $m_t(`[reminders] a request carrying a clear_at message got an HTTP 400 that Claude Code does not recognise (request id ${$l422 ?? "unknown"}), and the same request without clear_at succeeded. For the rest of this session earlier reminders are not re-sent, and requests that can use a Message Threads thread get no reminder.`, { level: "warn" });
  }, $l822 = ($l823) => {
    if (!$m_Yq($l823)) return null;
    if ($m_TPn($l11.model), $l26 !== $l11.model) $m_TPn($l26);
    return $m_t(`[effort] the server refused effort for model ${$l11.model} (the output_config.effort field or the anthropic-beta value ${$m_FSe.header}). Sending the request again without either; this Claude Code process will not send either to this model again.`, { level: "warn" }), $m_a("tengu_effort_unsupported_retry", { model: $m_wt($l11.model) }), "retry:effort-unsupported";
  }, $l824 = ($l825) => {
    if (!$l509 || !$m_Qq($l825)) return null;
    try {
      return $m_cve($l11.model), $m_t(`[structured-outputs] model ${$l11.model} rejected output_config.format; latching unsupported and retrying without it.`, { level: "warn" }), $m_a("tengu_structured_outputs_unsupported_retry", { model: $m_wt($l11.model) }), "retry:structured-outputs-unsupported";
    } catch ($l826) {
      return $m_l($m_N($l826)), null;
    }
  }, $l827 = ($l828) => null, $l829 = ($l830) => {
    if ($l395 === "highlights" && $m_v4e($l830)) return $m_nps(), $m_t("[thinking] server rejected thinking.display highlights; asking for omitted for the rest of this process and retrying.", { level: "warn" }), $m_a("tengu_thinking_display_highlights_rejected_retry", { model: $m_wt($l11.model) }), "retry:thinking-display-highlights";
    return null;
  }, $l386 = ($l831, $l832 = false) => {
    if (!$l324 || !$l345.includes($m_T2.header)) return null;
    let $l833 = $m_E4e($l831) || !$m_Ape() && $m_WXt($l831), $l834 = !$m_Ape() && ($m_eB($l831) || $l832 && $l831 instanceof $m_Mt && $l831.status === 400 && !$l359($l831) && !$l367($l831));
    if (!$l833 && !$l834) return null;
    return $l324 = false, $l323 = void 0, $l29 = $l29.filter(($l835) => $l835 !== $m_T2), $m_Mg($l28, $m_T2), $m_t($l833 ? "[thinking] server rejected the thinking-binding-controls beta; dropping the header and the block_binding value for this conversation and retrying." : "[thinking] an HTTP 400 that does not name the thinking-binding-controls beta arrived on a request that carried it; guessing the platform refuses that beta, so retrying once without it and leaving it off for this conversation. The only loss is the API's list of the thinking blocks it dropped.", { level: "warn" }), $m_a("tengu_thinking_binding_rejected_retry", { model: $m_wt($l11.model) }), "retry:thinking-binding-controls";
  }, $l836 = ($l837) => {
    if (!$l345.includes($m_uF.header)) return null;
    if ($l346() || !$m_eB($l837)) return null;
    return $l29 = $l29.filter(($l838) => $l838 !== $m_uF), $m_Mg($l28, $m_uF), $l347.push($m_uF), $m_t("[thinking-token-count] server rejected the beta; dropping it for this conversation and retrying.", { level: "warn" }), $m_a("tengu_thinking_token_count_rejected_retry", { model: $m_wt($l11.model), provider: $m_kT(), unnamed: true }), "retry:thinking-token-count-beta";
  }, $l839 = ($l840) => {
    try {
      let $l841 = $m_C4e($l840, $l345);
      if ($l841.length === 0) return;
      let $l842 = new Set($l841);
      $l29 = $l29.filter(($l843) => !$l842.has($l843));
      for (let $l844 of $l841) $l39($l844, $m_qq($l840, $l844)), $m_a("tengu_beta_400_healed", { beta: $m_oie([$l844.header]), model: $m_wt($l11.model), provider: $m_kT(), status: $l840 instanceof $m_Mt ? $l840.status : void 0 });
      return `retry:beta-rejected:${$l841.map(($l845) => $l845.name).join(",")}`;
    } catch ($l846) {
      $m_l($l846);
      return;
    }
  }, $l847 = ($l848) => {
    if (!($l848 instanceof $m_Mt) || $l848.status !== 400) return null;
    try {
      let $l849 = $m_Rke($l848), $l850 = !$l849 && $m_eB($l848);
      if ($l478 === "spent") return null;
      if ($l478 !== "idle") return $l478 = $l478 === "guessing" && $l850 ? "spent" : "unproven", $m_t(`[betas] the resend without ${$m_wE.header} also got an HTTP 400, so the backend is not recorded as rejecting it; ${$l478 === "spent" ? 'both said "invalid beta flag", so it is sent again from the next attempt' : "it stays off for the remaining attempts of this request and is sent again on the next request"}`, { level: "warn" }), null;
      if (!$l480 || $m_Qse($m_Ud($l11.model)) || !($l849 || $l850 && !$l346())) return null;
      return $l478 = $l849 ? "retrying" : "guessing", $m_t(`[betas] an HTTP 400 ${$l849 ? "reads as the backend rejecting" : 'says "invalid beta flag", which may be about'} ${$m_wE.header}; resending once without it`, { level: "warn" }), "retry:context-1m-beta";
    } catch ($l851) {
      return $m_l($l851), null;
    }
  }, $l852 = () => {
    if ($l478 !== "retrying" && $l478 !== "guessing") return;
    let $l853 = $l478 === "guessing";
    $l478 = "spent";
    try {
      $l29 = $l29.filter(($l854) => $l854 !== $m_wE), $m_H3r($l11.model), $m_a("tengu_beta_400_healed", { beta: $m_oie([$m_wE.header]), model: $m_wt($l11.model), provider: $m_kT(), status: 400, unnamed: $l853 });
    } catch ($l855) {
      $m_l($l855);
    }
  }, $l856 = ($l857) => {
    if (!$l345.includes($m_Pst.header) || !$m_k4e($l857)) return null;
    return $m_eps(), $m_OPt($m_Pst), $l29 = $l29.filter(($l858) => $l858 !== $m_Pst), $m_t("[thinking-resumption] server rejected the thinking-resumption beta header; disabled for this process", { level: "warn" }), $m_f("query_thinking_block_resumption", "header_rejected"), $l51 ? "surface:resume-prefill" : "retry:thinking-resumption-beta";
  }, $l859, $l860 = ($l861) => $l861 instanceof $m_Mt && $m_tB($l861), $l862 = 0, $l863 = null, $l864 = "all", $l865 = ($l866) => {
    if (!$l239) $l864 = $l866;
    else if ($l864 !== "all" && ($l866 === "all" || $l866.messageIndex < $l864.messageIndex || $l866.messageIndex === $l864.messageIndex && $l866.thinkingIndex < $l864.thinkingIndex)) $l864 = $l866;
    $l239 = true;
  }, $l867 = ($l868) => {
    if ($l162) return;
    let $l869 = $l165[$l868.messageIndex];
    if ($l869?.role !== "assistant" || !Array.isArray($l869.content)) return;
    let $l870 = $m_zve($l869.content[$l868.blockIndex]);
    if ($l870 === void 0) return;
    let $l871, $l872 = /* @__PURE__ */ new Map();
    for (let $l873 = 0; $l873 < $l236.length; $l873++) {
      let $l874 = $l236[$l873];
      if ($l874.type !== "assistant" || !Array.isArray($l874.message.content)) continue;
      let $l875 = $l874.message.id, $l876 = $l872.get($l875) ?? 0;
      for (let $l877 of $l874.message.content) {
        if ($l877.type !== "thinking" && $l877.type !== "redacted_thinking") continue;
        if ($m_zve($l877) === $l870) {
          if ($l871 !== void 0) return;
          $l871 = { messageIndex: $l873, indexInMessage: $l876 - ($l872.get($l875) ?? 0), thinkingIndex: $l876, messageId: $l875 };
        }
        $l876++;
      }
      $l872.set($l875, $l876);
    }
    return typeof $l871?.messageId === "string" ? $l871 : void 0;
  }, $l878 = ($l879) => {
    try {
      if (!$l860($l879)) return;
      $l862++;
      let $l880 = $l879.requestID || $l879.error?.request_id || null;
      if ($l862 === 1) $l863 = $l880;
      let $l881 = $m_QXt($l879), $l882 = $l236, $l883 = (() => {
        if ($l11.resumeIncompleteThinking) return;
        let $l884 = $l881?.block !== void 0 && $l862 <= $m_Vpr ? $l867($l881.block) : void 0;
        if ($l884 !== void 0) {
          let $l885 = $m_aQe($l882, { messageIndex: $l884.messageIndex, thinkingIndex: $l884.indexInMessage });
          if ($l885 !== $l882) return { scope: "partial", stripped: $l885, from: $l884 };
        }
        let $l886 = $m_Vve($l882);
        return $l886 !== $l882 ? { scope: "all", stripped: $l886, from: "all" } : void 0;
      })();
      if ($l883 === void 0 && !$l239) $m_YXt($l879);
      let $l887 = $l883?.scope ?? "none", $l888 = $m_$mn($l882, $l883?.stripped ?? $l882);
      if ($l883 !== void 0) $l236 = $l255($l883.stripped, "error_recovery", true), $l865($l883.from);
      $m_t($l883 === void 0 ? "[thinking] prefix-lock rejection: nothing to strip; the error is returned." : `[thinking] prefix-lock rejection: stripped ${$l888.blocksStripped} of ${$l888.blocksSent} thinking block(s) (${$l887}) and retrying.`, { level: "warn" });
      let $l889 = $m_Dqr($l11.querySource, $l11.agentId);
      return $m_a("tengu_strict_prefix_lock_400_surfaced", { query_source: $m_Es($l11.querySource), model: $m_wt($l11.model), request_id: $m_Yg($l880), chain_request_id: $m_Yg($l863), client_request_id: $m_ye($l488), solicited: $l505, mismatch_kind: $m_ye($l881?.kind), failing_message_index: $l881?.block?.messageIndex, failing_block_index: $l881?.block?.blockIndex, thinking_blocks_sent: $l888.blocksSent, thinking_turns_sent: $l888.turnsSent, strip_scope: $m_c($l887), stripped_block_count: $l888.blocksStripped, stripped_turn_count: $l888.turnsStripped, attempt: $l862, client_change_kinds: $l889.kinds, first_changed_message_index: $l889.firstChangedMessageIndex, client_baseline: $l889.baseline, call_number: $l889.callNumber }), $l883 === void 0 ? void 0 : $l883.scope === "partial" ? `retry:prefix-lock-strip-${$l862}` : `retry:prefix-lock-strip-all-${$l862}`;
    } catch ($l890) {
      $m_l($l890);
    }
    return;
  }, $l891 = ($l892) => {
    let $l893 = $l878($l892);
    if ($l234 && $m_MM($l892)) $m_ZZ($l893 !== void 0 ? "rejected_healed" : "rejected_surfaced");
    return $l893;
  };
  function* $l894() {
  }
  function* $l895() {
    if ($l859 !== void 0) {
      let $l896;
      try {
      } catch ($l897) {
        $m_l($l897);
      }
      if ($l859 = void 0, $l896) yield $l896;
    }
  }
  let $l898 = false;
  function $l899() {
    let $l900 = $m_iee(() => $l226 && !$l898 && ($m_ree?.relayStoppedInLastDispatch() ?? false), false);
    if ($l900) {
      let $l901 = $m_iee(() => $m_lQe($l0).size > 0, void 0);
      if ($l901 === true) $l239 = true, $l864 = "all", $l243 = true;
      else if ($l901 === false) $l244 = true;
    }
    if ($l244 && !$l239 && !$l898) return $l898 = true, $m_iee(() => $m_ree?.markRelayThinkingStripRecorded("no_thinking"), void 0), $m_nn({ type: "thinking_stripped", scope: "all" });
    if (!$l239 || $l898) return;
    if ($l898 = true, $l243) $m_iee(() => $m_ree?.markRelayThinkingStripRecorded($l900 ? "marker_same_request" : "marker"), void 0);
    return $m_nn($l864 === "all" ? { type: "thinking_stripped", scope: "all" } : { type: "thinking_stripped", scope: "partial", from: { messageId: $l864.messageId, thinkingIndex: $l864.thinkingIndex } });
  }
  async function* $l902() {
  }
  function $l903({ messageIndex: $l904, blockIndex: $l905 }) {
    let $l906 = $l165[$l904];
    return $l906?.role === "assistant" && Array.isArray($l906.content) ? $m_zve($l906.content[$l905]) : void 0;
  }
  function $l907($l908) {
    try {
      if (!$m_Rv() || $l162 || $l438 || $l254 || $l166 !== void 0) return;
      $m_Hfn({ body: $l908, blockKeyAt: $l903, replyHolding: ($l909, $l910) => {
        let $l911 = $l446($l909), $l912 = $l911 === void 0 ? void 0 : $l236[$l911];
        return $l911 !== void 0 && $l912?.type === "assistant" && Array.isArray($l912.message.content) && $l912.message.content.some(($l913) => $m_zve($l913) === $l910) ? { messageId: $l912.message.id, messageIndex: $l911 } : void 0;
      }, carrier: { key: $m_Tx($l11.querySource) !== null ? $m_Q$($l11.agentId) : void 0, querySource: $l11.querySource }, sentThreadPrefix: $m_mpn({ model: $l11.model, system: $l293, toolSchemas: $l340, thinkingConfig: $l35, getMessageHashes: $l337 }) });
    } catch ($l914) {
      $m_l($m_N($l914));
    }
  }
  let $l915 = ($l916) => {
    if ($l162) return;
    let $l917 = $m_Pfn({ body: $l916, blockKeyAt: $l903, carriedBlockHashes: () => $m_Fmn($l0), countThinkingSent: () => $m_$mn($l236, $l236), querySource: $l11.querySource, agentId: $l11.agentId, model: $l11.model, requestId: $l465, solicited: $l505, contextCompactedKind: $l918 });
    try {
      return $l917 && $m_nn($m_Nmn($l917, { requestId: $l465, model: $l11.model, querySource: $l11.querySource, requestedBehavior: $l506 }));
    } catch ($l919) {
      $m_l($l919);
      return;
    }
  }, $l920 = ($l921) => {
    let $l922 = $l11.serverRefusalFallback !== void 0 ? ($l921.content ?? []).reduce(($l923, $l924, $l925) => $m_lTe($l924) ? $l925 : $l923, -1) : -1, $l926 = $l921.stop_reason === "refusal", $l927, $l928 = 0, $l929 = false, $l930 = [];
    for (let [$l931, $l932] of ($l921.content ?? []).entries()) {
      if (!$m_lTe($l932)) {
        if ($l931 < $l922 && $l932.type !== "text" || $l926 && $l922 >= 0) {
          $l928++, $l929 ||= $l932.type === "tool_use";
          continue;
        }
        $l930.push($l932);
        continue;
      }
      let $l933 = $m_krn($l932);
      if ($l933 === void 0) {
        $m_Y("warn", "cli_malformed_fallback_block"), $m_a("tengu_rotunda_pennant_malformed", { block_index: $l931, non_streaming: true }), $m_f("refusal_fallback", "malformed_fallback_block", { non_streaming: true });
        continue;
      }
      $l930.push($m_EXe($l933)), $l927 = $l933;
      let $l934 = $l511;
      if ($m_a("tengu_rotunda_pennant_materialized", { armed: $l11.serverRefusalFallback !== void 0, mode: $m_c($l934), block_index: $l931, non_streaming: true }), $l933.reason === "refusal") $m_JZ({ model: $l26, requestId: $l465 || void 0, querySource: $l11.querySource, effort: $l303, fastMode: $l642, attempt: $l462, attribution: $m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: true, agentContext: $l11.agentContext });
    }
    if ($l930.length === 0 && ($l921.content ?? []).length > 0) $l930.push({ type: "text", text: $m_Sf, citations: [] });
    let $l935 = $l11.serverRefusalFallback !== void 0 ? $m_bYn($l921.usage) : void 0;
    if ($l671 = $l935?.servedFallbackModel !== void 0 || $l11.serverRefusalFallback !== void 0 && $l927 !== void 0, $l672 = false, $l521 = false, $l673 = $l935, $l928 > 0) $m_a("tengu_rotunda_pennant_sync_dropped", { dropped_count: $l928, had_tool_use: $l929, chain_exhausted: $l926 });
    return { content: $l930, lastHop: $l927, iterations: $l935 };
  };
  function* $l936($l937, $l938, $l939) {
    if ($l939 !== void 0 && !$l521) {
      $l521 = true;
      let $l940 = $m_mAe($m_Pm, $l938.usage);
      $m_a("tengu_fallback_credit_minted", { request_id: $m_ye($l465), model: $m_wt($l11.model), fallback_target_model: $m_wt($l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l671 ? $l11.serverRefusalFallback.model : void 0)), token_length: $l939.length, input_tokens: $l940.input_tokens, output_tokens: $l940.output_tokens, cache_read_input_tokens: $l940.cache_read_input_tokens, cache_creation_input_tokens: $l940.cache_creation_input_tokens, cache_creation_5m_input_tokens: $l940.cache_creation?.ephemeral_5m_input_tokens ?? 0, cache_creation_1h_input_tokens: $l940.cache_creation?.ephemeral_1h_input_tokens ?? 0, service_tier: $m_le($l940.service_tier), speed: $m_le($l940.speed), query_source: $m_Es($l11.querySource), ...$l11.queryTracking && { query_chain_id: $m_ye($l11.queryTracking.chainId), query_depth: $l11.queryTracking.depth } });
    }
    let $l941 = $l11.serverRefusalFallback !== void 0 ? $l937.lastHop?.model ?? $l937.iterations?.servedFallbackModel : void 0;
    if (!$l672 && $l941 !== void 0) $l672 = true, yield { type: "server_fallback", fromModel: $l937.lastHop?.fromModel ?? $l11.model, toModel: $l941, reason: $l937.lastHop !== void 0 ? "refusal" : "sticky", apiRefusalCategory: $l937.lastHop?.category ?? null, midStream: false, requestId: $l465 ?? null, refusedEffort: $l333(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: $l938.stop_reason };
    let $l942 = $l11.refusalFallbackModelLane === "silent", $l943 = !$l942 ? $l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l671 ? $l11.serverRefusalFallback.model : void 0) : void 0, $l944 = $l11.refusalFallbackCascadeHop, $l945 = $l938.stop_reason === "refusal" && $l943 !== void 0 && $l944 === void 0 ? $m_gKo({ originalModelCanonical: $m_Je($l11.model), armedFallbackModel: $l943, apiRefusalCategory: $l938.stop_details?.category ?? null, armedTargetIsRefusingModel: $m_uvt($l11.model, $l943), resolveTarget: ($l946) => $m__zt({ mappedTarget: $l946, armedFallbackModel: $l943, refusingModel: $l11.model, triedModels: [$m_fvt($l11.model)] }), routesOverride: $m_lKr() }) : void 0, $l947 = $l945 !== void 0 ? $l945.model : $l943;
    if ($l945 !== void 0) $m_aKr({ route: $l945, model: $l11.model, armedFallbackModel: $l943, apiRefusalCategory: $l938.stop_details?.category, requestId: $l465 });
    if ($l938.stop_reason === "refusal" && $l947 !== void 0) return $l772(), yield { type: "fallback_request", trigger: "refusal", originalModel: $l11.model, fallbackModel: $l947, requestId: $l465 ?? null, refusedEffort: $l333(), apiRefusalCategory: $l938.stop_details?.category ?? null, apiRefusalExplanation: $l938.stop_details?.explanation ?? null, creditCode: $l939 ?? null, mintedStateless: !$l449, ...$m_pKo($l945, $l944) }, true;
    let $l948 = $m_lFt($l938.stop_reason, $l938.stop_details, $l465, $l941 ?? $l11.model, $l938.id);
    if ($l948) {
      let $l949 = $m_O4() || $m_mK() !== void 0;
      if ($l943 !== void 0 || $l11.refusalFallbackModel !== void 0 || $m_cvt($l11.model) && $m_vz() || $m_Jhn() || $l949) $m_m("refusal_fallback", $l945?.matched === "none" ? "route_declined" : $l942 ? "sync_silent_stood" : $l941 !== void 0 ? "server_chain_exhausted" : $l949 ? "client_chain_exhausted" : $m_cvt($l11.model) && $m_fKr() ? "disabled_by_config" : "not_armed", { convolute_arcades: $m_Xhn(), arm_source: $m_c($m_K0e()), armed: $l943 !== void 0, model_scope: $m_c($m_TZ($l11.model)) });
      yield { type: "refusal_no_fallback", originalModel: $l11.model, requestId: $l465 ?? null, apiRefusalCategory: $l938.stop_details?.category ?? null, apiRefusalExplanation: $l938.stop_details?.explanation ?? null }, yield $l948;
    }
    let $l950 = $l951($l938);
    if ($l950 !== void 0) yield $l950;
    return false;
  }
  function $l951($l952) {
    try {
      if (!$m_k("tengu_vast_sunset", true)) return;
      return $m_Jmn($l952.stop_reason, Math.min($l638, $m_tRn), $l952.usage?.output_tokens ?? 0, $l638 >= $m_tRn);
    } catch ($l953) {
      $m_l($m_Xe($m_N($l953), "building the cut-short error for a non-streaming response failed"));
      return;
    }
  }
  let $l954 = [];
  function $l955($l956, $l957) {
    if ($l956.size > 0) $l954.push({ type: "hint_clears", ids: [...$l956], contentById: Object.fromEntries($l957) });
  }
  function* $l958() {
    yield* $l954.splice(0);
  }
  async function* $l959($l960, $l961) {
    let { message: $l962, requestId: $l963, headers: $l964, creditCode: $l965 } = yield* $m_pmr({ model: $l11.model, fetchOverride: $l11.fetchOverride, source: $l11.querySource, requestClass: $l11.requestClass, agentContext: $l11.agentContext, promptId: $l20, ccsSender: $l21, permissionContext: $l309, toolNames: $l311, credentials: $l11.credentials, storageV5: $l11.storageV5, clock: $l12, queryTracking: $l11.queryTracking, llmSpan: $l459, contextCompactedKindForWire: $l918, compactionRequestKindForWire: $l966, prevToolDurationsForWire: $l967 }, { model: $l11.model, fallbackModel: $l11.fallbackModel, accessFallbackModel: $l10, toolFreeHelper: $l11.toolFreeHelper, ...$m_os() && { fastMode: $l305 }, modelIsRefusalFallbackTarget: $l11.modelIsRefusalFallbackTarget, signal: $l4, initialConsecutive529Errors: $l656.counts().overloaded, querySource: $l11.querySource, maxRetries: $l656.retriesLeft(), modelCallRetries: $l656, clock: $l12, random: $l11.random, isResumePrefillRequest: $l51, failedStreamOutlastedTimeout: $l961, onRetryStatus: $l11.onRetryStatus, subscribeRetryWake: $l11.subscribeRetryWake, onQuotaWindowWait: $l495, isUsageLimitLifted: $l499, lowPriorityWait: $l492, stampDispatchHeader: $l660, onApiError: async ($l968) => {
      let $l969 = $l439($l968);
      if ($l969 !== void 0) return $l969;
      let $l970 = await $l664($l968);
      if ($l970 !== void 0) return $l970;
      let $l971 = $l413($l968);
      if ($l971 !== void 0) return $l971;
      let $l972 = $l349($l968);
      if ($l972 !== void 0) return $l972;
      let $l973 = $l827($l968);
      if ($l973 !== null) return $l973;
      let $l974 = $l751($l968, "sync");
      if ($l974 !== void 0) return $l974;
      let $l975 = $l757($l968);
      if ($l975 !== void 0) return $l975;
      let $l976 = $m_DKo($l968, $l11.model, $l11.querySource);
      if ($l976 === $m_hKr) return;
      if ($l976 !== null) return $l976;
      let $l977 = $l824($l968);
      if ($l977 !== null) return $l977;
      let $l978 = $l778($l968);
      if ($l978) return $l978;
      let $l979 = $l389($l968);
      if ($l979) return $l979;
      let $l980 = $l822($l968);
      if ($l980 !== null) return $l980;
      let $l981 = $l856($l968);
      if ($l981 === "surface:resume-prefill") return;
      if ($l981 !== null) return $l981;
      let $l982 = $l829($l968);
      if ($l982 !== null) return $l982;
      let $l983 = $l836($l968);
      if ($l983 !== null) return $l983;
      let $l984 = $l839($l968);
      if ($l984 !== void 0) return $l984;
      $l373($l968);
      let $l985 = $l847($l968);
      if ($l985 !== null) return $l985;
      let $l986 = $l386($l968);
      if ($l986 !== null) return $l986;
      let $l987 = $l891($l968);
      if ($l987 !== void 0) return $l987;
      return $l732($l968) ?? $l722($l968) ?? $l736($l968) ?? $l404($l968, false) ?? $l674($l968, "sync") ?? $l415($l968) ?? $l432($l968) ?? $l688($l968) ?? $l391($l968) ?? $l383($l968) ?? $l375($l968);
    } }, $l530, ($l988, $l989, $l990) => {
      $l462 = $l988, $l638 = $l990, $l291 = $l989;
    }, ($l991) => $l484($l991, false), $l960);
    $l465 = $l963, $l318($l963, $l964, true), $l907($l962), $l343?.settle({ kind: "ok" }, $l465, $l962.id);
    try {
      $l805($l962.usage), $l812($l962.usage);
    } catch {
    }
    $l815(), $l816(), $l818(), $l819(), $l820(), $l411(), $l401(), $l398(), $l852(), $l378(), $l781(), $m_a("tengu_nonstreaming_fallback_success", { model: $m_wt($l11.model), request_id: $m_Yg($l963), originating_request_id: $m_Yg($l481), fallback_cause: $m_c($l960.cause), attempt: $l462 }), yield* $l895(), yield* $l894(), $l641 = $l962.diagnostics?.cache_miss_reason ?? void 0;
    let $l992 = $l920($l962), $l993 = $l273 ? $m_o$e($l992.content) : void 0;
    if ($l993?.degraded) $m_r$e();
    let $l994 = $l993?.inputs, $l995 = $m_p$e($l992.content, $l994), { content: $l996, batchToolUses: $l997 } = $m_Gpn($m_Acn($l992.content, $l3, $l11.agentId, { requestId: $l465 ?? void 0, messageId: $l962.id }, $l11.storageV5), $l3, ($l998, $l999) => $m_Rht($l998, $l999, $l11.agentId, $l11.storageV5));
    if ($l467 !== void 0) $l470($l467, $l962, $l962.content);
    $l639 = $l964;
    let $l1000 = $l915($l962), $l1001 = $l899();
    if ($l1001) yield $l1001;
    let $l1002 = $l242();
    if ($l1002) yield $l1002;
    if ($l1000) yield $l1000;
    let $l1003 = { message: { ...$l962, content: $l996, usage: $m_mAe($m_Pm, $l962.usage) }, ...$l997.length > 0 && { batchToolUses: $l997 }, ...$l994 !== void 0 && { wireToolInputs: $l994 }, ...$l995 !== void 0 && { wireIngestContext: $l995 }, ...$l467 !== void 0 && $m_w1e($l467), apiBlockIndex: 0, requestId: $l465 ?? void 0, requestRef: $l483, requestedModel: $l11.model, ...$m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), type: "assistant", uuid: $m_dee(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...false, ...$l48 && { advisorModel: $l48 }, ...$l330 !== void 0 && { effort: $l330 }, perTurnEffort: $l331, perTurnTiming: $l332, ...{} };
    return $m_kYe($l28, $l1003), $l620.push($l1003), $l637 = $l1003, $l288 = false, yield $l1003, yield* $l936($l992, $l962, $l965);
  }
  let $l1004 = false, $l1005 = /* @__PURE__ */ new Map(), $l1006 = /* @__PURE__ */ new Set(), $l1007 = /* @__PURE__ */ new Set(), $l1008, $l1009 = $m_ISe($l11.agentContext) ?? ($l11.isBackgroundAgent ? $l11.agentId : void 0), $l918 = $m_ss($l11.querySource) === "main" && $m_Tv($l11.querySource, $l11.agentId) ? $m_ads() : void 0, $l966 = $l11.compactionRequestKind, $l967 = $l11.prevToolDurations !== void 0 ? $m_M9t($l11.prevToolDurations) : void 0;
  try {
    $m_NI("api_call", $l1009);
    e: for (; ; ) {
      let $l1010 = function() {
        if ($l1011 !== null) $l1011(), $l1011 = null;
        if ($l1012) $l1012 = false, $l11.onRetryStatus?.(null);
        if ($l1013 !== null) $l1013(), $l1013 = null;
        if ($l1014 !== null) $l1014(), $l1014 = null;
      }, $l1015 = function() {
        if (!$l11.onRetryStatus || !$l1016) return;
        let $l1017 = $l1016.lastAt, $l1018 = $l12.monotonicNow();
        $l1011 = $l12.setTimeout(() => {
          if ($l12.monotonicNow() - $l1018 < $l1019 / 2) return;
          if ($l1016.lastAt > $l1017) {
            $l1015();
            return;
          }
          let $l1020 = $l12.monotonicNow() - $l1016.lastAt;
          if ($l643 && $l1020 < $l1021) {
            $l1015();
            return;
          }
          let $l1022 = $l1016.lastAt === 0 ? $l12.monotonicNow() - $l1023 : $l1020;
          $l1012 = true, $l11.onRetryStatus?.({ kind: "stalled", deadline: $l12.now() + Math.max(0, $l1024 - $l1022) });
        }, $l1019, { unref: true });
      }, $l1025 = function() {
        if ($l1010(), $l1015(), !$l1026) return;
        let $l1027 = $l12.monotonicNow(), $l1028 = $l12.now(), $l1029 = $l1030;
        $l1013 = $l12.setTimeout(() => {
          if ($l12.monotonicNow() - $l1027 < $l1029) return;
          $m_t(`Streaming idle warning: no chunks received for ${$l1029 / 1e3}s`, { level: "warn" }), $m_Y("warn", "cli_streaming_idle_warning");
        }, $l1030), $l1014 = $l12.setTimeout(() => {
          if ($l1031 = $m_j7s($l12, { armedAt: $l1027, wallArmedAt: $l1028, idleMs: $l1032 }), $l1031 !== void 0) {
            $l503();
            return;
          }
          $l1033 = true, $l1034 = $l12.monotonicNow(), $m_t(`Streaming idle timeout: no chunks received for ${$l1032 / 1e3}s, aborting stream`, { level: "error" }), $m_Y("error", "cli_streaming_idle_timeout"), $m_a("tengu_streaming_idle_timeout", { model: $m_wt($l11.model), request_id: $m_Yg($l465), timeout_ms: $l1032, tier: $m_b("event") }), $l503();
        }, $l1032);
      };
      if ($l494 = void 0, $m_gg("query_client_creation_start"), $l16) $m_Dx("request_build"), $m_Mx("client_creation");
      let $l1035 = $m_Hve(() => $m_K$({ maxRetries: 0, model: $l11.model, fetchOverride: $l11.fetchOverride, source: $l11.querySource, requestClass: $l11.requestClass, agentContext: $l11.agentContext, promptId: $l20, ccsSender: $l21, permissionContext: $l309, toolNames: $l311, credentials: $l11.credentials, storageV5: $l11.storageV5, signal: $l4, clock: $l12, noResponseRetryLedger: $l654 }), async ($l1036, $l1037, $l1038) => {
        if ($l514 === void 0) $l522("attempt_errored", $l465 ?? null, null);
        if ($l462 = $l1037, $l642 = $l1038.fastMode ?? false, $l461 = $l12.monotonicNow(), $l494 = void 0, $l463.push($l461), $m_gg("query_client_creation_end"), $l16) $m_Dx("client_creation"), $m_Mx("request_build");
        let $l1039 = $l530($l1038);
        if ($m_tgn($l1039), $l484($l1039, true), $l638 = $l1039.max_tokens, $m_gg("query_api_request_sent"), $m_t(`[API:timing] dispatching to ${$m_Ud($l11.model)} model=${$l11.model}`), $l291 = $l12.now(), $l627 === void 0 && $l11.queryTracking?.roundStartedAtMs !== void 0) $l11.queryTracking.firstDispatchedAtMs ??= performance.now(), $l627 = Math.round($l11.queryTracking.firstDispatchedAtMs - $l11.queryTracking.roundStartedAtMs);
        if (!$l11.agentId) {
          if ($l191) $m_th("api_request_sent");
          if ($l16) $m_Dx("request_build");
          if ($l1037 === 1 && !$l624) {
            if ($l624 = $l12.monotonicNow(), $l625 = $l12.now(), $l191) $m_ssi();
            if ($l16) $l626 = $m_ksn($l624);
          }
          if ($l191) try {
            $m_l5t();
          } catch ($l1040) {
            $m_l($m_N($l1040));
          }
        }
        $l502();
        let $l1041 = $m_Fu(process.env.CLAUDE_SLOW_FIRST_BYTE_MS) || 3e4;
        $l501 = $l12.setTimeout(() => {
          $l501 = null;
          let $l1042 = $l12.monotonicNow() - $l461;
          $m_t(`Slow first byte: no stream chunk ${($l1042 / 1e3).toFixed(1)}s after request sent (attempt ${$l1037})`, { level: "warn" }), $m_a("tengu_api_slow_first_byte", { model: $m_wt($l11.model), provider: $m_kT(), attempt: $l1037, elapsed_ms: Math.round($l1042) });
        }, $l1041);
        let $l1043 = $m_ngn($l459, $l463.length);
        $l488 = $l1043.clientRequestId;
        let $l1044 = $l1043.headers;
        if ($l491 = $m_ps() && $m_rnt(), $l491) $l1044[$m_ivt] = $m_Y2r;
        if ($m_Hmr($l11, $l491, $l24)) $l1044[$m_ivt] = "extended";
        if ($l660($l1044, $l491), $l11.fallbackStampFromModel !== void 0 && $m_Te() === "firstParty" && $m_Pi()) for (let [$l1045, $l1046] of [[$m_AKo, $l11.fallbackStampFromModel], [$m_CKo, $l11.fallbackStampCategory], [$m_RKo, $l11.fallbackStampTrigger], [$m_xKo, $l11.fallbackStampOriginalRequestId]]) {
          let $l1047 = $m_pZn($l1046);
          if ($l1047 !== void 0) $l1044[$l1045] = $l1047;
        }
        $m_ogn($l1044, $l918, $l966), $m_rgn($l1044, $l967);
        let $l1048 = $l514;
        if ($l517 = $l1048 !== void 0, $l1048 !== void 0) $l514 = void 0, $l425 = true;
        if ($l322 = $m_qm(), $l488 !== void 0) $m_B7s($l488, { escalated: $l654.count > 0 }), $m_q7s($l488, performance.now());
        if ($m_ss($l11.querySource) === "main") setTimeout($m_vsn, 0);
        setTimeout($m_C4o, 0, $l11.querySource, $l11.agentId);
        let $l1049 = { ...$m_zpn($l1039), ...$l1048 !== void 0 && { fallback_credit_token: $l1048 }, stream: true }, $l1050 = $m_x0r($l11.fetchOverride) ? $m_nfn($l1049, $m_ss($l11.querySource) === "main" && $l11.agentId === void 0) : void 0, $l1051 = await $m_lfn($l1050, $l1049, () => $l1036.beta.messages.create($l1049, { signal: $l4, ...$l1050 === void 0 ? Object.keys($l1044).length > 0 && { headers: $l1044 } : { body: $l1050, headers: { ...$l1044, "content-type": "application/json" } } }).withResponse()).catch(($l1052) => {
          throw $l502(), $l1052;
        });
        if ($m_gg("query_response_headers_received"), $l465 = $m_M2e($l1051.request_id, $l1051.response?.headers), $l489 = $l1051.response, $l493 = $l12.now(), $l318($l465, $l1051.response?.headers, false), $l494 = $l1051.response && { status: $l1051.response.status, headers: $l1051.response.headers, latencyMs: Math.round($l12.monotonicNow() - $l461) }, $m_sgn($l494), $l1048 !== void 0) $m_a("tengu_rotunda_pennant_credit_echoed", { mint_request_id: $m_ye($l11.fallbackCreditMintRequestId), mint_model: $m_wt($l11.fallbackCreditMintModel), request_id: $m_ye($l465), client_request_id: $m_ye($l488), model: $m_wt($l11.model), token_length: $l1048.length, query_source: $m_Es($l11.querySource) });
        return $l1051.data;
      }, { model: $l11.model, credentials: $l11.credentials, storageV5: $l11.storageV5, fallbackModel: $l11.fallbackModel, accessFallbackModel: $l10, toolFreeHelper: $l11.toolFreeHelper, ...$m_os() ? { fastMode: $l305 } : false, modelIsRefusalFallbackTarget: $l11.modelIsRefusalFallbackTarget, signal: $l4, initialConsecutive529Errors: $l656.counts().overloaded, maxRetries: $l656.retriesLeft(), noResponseRetryLedger: $l654, modelCallRetries: $l656, clock: $l12, random: $l11.random, isResumePrefillRequest: $l51, querySource: $l11.querySource, onRetryStatus: $l11.onRetryStatus, subscribeRetryWake: $l11.subscribeRetryWake, onQuotaWindowWait: $l495, isUsageLimitLifted: $l499, lowPriorityWait: $l492, onError: async ($l1053) => {
        let $l1054 = $l439($l1053);
        if ($l1054 !== void 0) return $l1054;
        let $l1055 = $l413($l1053);
        if ($l1055 !== void 0) return $l1055;
        let $l1056 = $l349($l1053);
        if ($l1056 !== void 0) return $l1056;
        let $l1057 = $l827($l1053);
        if ($l1057 !== null) return $l1057;
        if ($l306 && $m_bke($l1053)) {
          if ($l306 = false, $m_hW) $m_Mg($l28, $m_hW);
          return $m_JI(false), $m_qEn(true), $m_t("[auto-mode] server rejected afk-mode beta \u2014 dropping header and circuit-breaking auto for this session", { level: "warn" }), "retry:afk-beta";
        }
        let $l1058 = await $l664($l1053);
        if ($l1058 !== void 0) return $l1058;
        if ($m_g4e($l1053)) {
          let $l1059 = $l236, $l1060 = $m_xw($l1059), $l1061 = $l1059.findIndex(($l1062, $l1063) => $l1060[$l1063] !== $l1062), $l1064 = $l1059.reduce(($l1065, $l1066, $l1067) => $l1060[$l1067] !== $l1066 ? $l1065 + 1 : $l1065, 0), $l1068 = $m_p9t() && $l1061 !== -1, $l1069;
          if ($l1068 && !$l11.resumeIncompleteThinking && $l507 !== "enabled") try {
            let $l1070 = $l1059.findIndex(($l1071, $l1072) => $l1072 >= $l1061 && $m_Fmr($l1071)), $l1073 = $l1070 === -1 ? void 0 : $l1059[$l1070];
            if ($l1073?.type === "assistant") {
              let $l1074 = $m_aQe($l1060, { messageIndex: $l1070, thinkingIndex: 0 });
              if ($l1074 !== $l1060) {
                $l1060 = $l1074;
                let $l1075 = $l1073.message.id;
                if (typeof $l1075 === "string") {
                  let $l1076 = 0;
                  for (let $l1077 = 0; $l1077 < $l1070; $l1077++) {
                    let $l1078 = $l1059[$l1077];
                    if ($l1078.type === "assistant" && $l1078.message.id === $l1075 && Array.isArray($l1078.message.content)) $l1076 += $m_U($l1078.message.content, ($l1079) => $l1079.type === "thinking" || $l1079.type === "redacted_thinking");
                  }
                  $l1069 = { messageIndex: $l1070, indexInMessage: 0, thinkingIndex: $l1076, messageId: $l1075 };
                } else $l1060 = $m_Vve($l1060), $l1069 = "all";
              }
            }
          } catch ($l1080) {
            $m_l($m_N($l1080)), $l1060 = $m_xw($l1059), $l1069 = void 0;
          }
          if ($l236 = $l255($l1060, "error_recovery"), $l715(), $l1068) {
            if ($l240 = true, $l1069 !== void 0) $l865($l1069);
          }
          return $m_t($l1064 === 0 ? "[advisor] the server could not process an advisor result sent earlier in this conversation; nothing to remove, retrying as sent." : `[advisor] the server could not process an advisor result sent earlier in this conversation; retrying with the advisor blocks removed from ${$l1064} message(s)${$l1069 === "all" ? " and all thinking removed" : $l1069 !== void 0 ? " and the thinking after them removed" : ""}${$l1068 ? "; recorded, so later requests leave them out too." : "; not recorded, so the next request sends them again."}`, { level: "warn" }), $m_a("tengu_advisor_strip_retry", { query_source: $m_Es($l11.querySource), strip_recorded: $l1068, stripped_message_count: $l1064, thinking_also_stripped: $l1069 !== void 0 }), "retry:advisor-strip";
        }
        let $l1081 = $l751($l1053, "stream");
        if ($l1081 !== void 0) return $l1081;
        let $l1082 = $l757($l1053);
        if ($l1082 !== void 0) return $l1082;
        let $l1083 = $m_DKo($l1053, $l11.model, $l11.querySource);
        if ($l1083 === $m_hKr) return;
        if ($l1083 !== null) return $l1083;
        let $l1084 = $l824($l1053);
        if ($l1084 !== null) return $l1084;
        {
          let $l1085 = $m_yke($l1053);
          if ($l1085) {
            let $l1086 = $l1053 instanceof Error ? $l1053.message : String($l1053), $l1087 = $m_O3($l236, $l1086);
            if ($l1087 !== $l236) return $l236 = $l255($l1087, "error_recovery"), $l646.set($l1085.kind, $l1086), $m_nQe($l11, $l1085.kind, $l1086), $m_a("tengu_media_block_strip_retry", { kind: $m_c($l1085.kind), targeted: 1 }), "retry:media-strip-over-dimension-limit";
            let $l1088 = $l1085.messageIdx !== void 0 ? $l446($l1085.messageIdx) : void 0;
            if ($l1085.messageIdx !== void 0 && $l1088 !== void 0 && $l1085.contentIdx !== void 0) {
              let $l1089 = `${$l1085.messageIdx}.${$l1085.contentIdx}`, $l1090 = $l650.get($l1089) ?? 0, $l1091 = $l1085.nestedContentIdx !== void 0 && $l1090 < $l649 ? $l1085.nestedContentIdx : void 0, $l1092 = $m_KSt($l236, { messageIdx: $l1088, contentIdx: $l1085.contentIdx, nestedContentIdx: $l1091, kind: $l1085.kind }, $l1086);
              if ($l1092 !== $l236) {
                if ($l236 = $l255($l1092, "error_recovery"), $l646.set($l1085.kind, $l1086), $m_nQe($l11, $l1085.kind, $l1086), $l1091 !== void 0) $l650.set($l1089, $l1090 + 1);
                let $l1093 = `messages.${$l1085.messageIdx}.content.${$l1085.contentIdx}`, $l1094 = $l1091 !== void 0 ? `${$l1093}.tool_result.content.${$l1091}` : $l1085.nestedContentIdx !== void 0 ? `${$l1093}.tool_result.content.*` : $l1093;
                return $m_t(`Removed unprocessable ${$l1085.kind} at ${$l1094}; retrying.`, { level: "warn" }), $m_a("tengu_media_block_strip_retry", { kind: $m_c($l1085.kind), message_idx: $l1085.messageIdx, content_idx: $l1085.contentIdx, targeted: 1 }), `retry:media-strip:${$l1085.kind}:${$l1094}`;
              }
            }
            let $l1095 = $l648.value < $l647 ? $m_YSt($l236, $l1085.kind, $l1086) : void 0;
            if ($l1095) return $l648.value++, $l236 = $l255($l1095.messages, "error_recovery"), $l646.set($l1085.kind, $l1086), $m_nQe($l11, $l1085.kind, $l1086), $m_t(`Removed base64 ${$l1085.kind} blocks from carrier ${$l1095.carrierIdx} (API 400 had no usable path); retrying.`, { level: "warn" }), $m_a("tengu_media_block_strip_retry", { kind: $m_c($l1085.kind), targeted: 0, carrier_idx: $l1095.carrierIdx }), `retry:media-strip-latest:${$l1085.kind}:${$l1095.carrierIdx}`;
          }
        }
        if ($l314 && $m_y4e($l1053)) return $l314 = false, $m_AEt($l28, $l322, $l191), "retry:cache-keepalive-beta";
        let $l1096 = $l856($l1053);
        if ($l1096 === "surface:resume-prefill") return;
        if ($l1096 !== null) return $l1096;
        {
          let $l1097 = $m_Dke($l1053);
          if ($l1097) {
            let $l1098 = $l1097 === "enabled" ? "adaptive" : "enabled";
            return $m_vfs($l11.model, $l1098), $m_t(`[thinking] model rejected thinking.type=${$l1097}; retrying with ${$l1098}. For Bedrock application-inference-profile ARNs with bearer-token auth, granting bedrock:GetInferenceProfile to the token avoids this round-trip.`, { level: "warn" }), "retry:thinking-type";
          }
        }
        let $l1099 = $l822($l1053);
        if ($l1099 !== null) return $l1099;
        let $l1100 = $l829($l1053);
        if ($l1100 !== null) return $l1100;
        let $l1101 = $l836($l1053);
        if ($l1101 !== null) return $l1101;
        let $l1102 = $l839($l1053);
        if ($l1102 !== void 0) return $l1102;
        $l373($l1053);
        let $l1103 = $l847($l1053);
        if ($l1103 !== null) return $l1103;
        let $l1104 = $l386($l1053);
        if ($l1104 !== null) return $l1104;
        {
          let $l1105 = $l878($l1053);
          if ($l1105 !== void 0) {
            if ($l234 && $m_MM($l1053)) $m_ZZ("rejected_healed");
            return $l1105;
          }
        }
        if (!$l11.resumeIncompleteThinking && $m_MM($l1053)) {
          let $l1106 = 0, $l1107 = 0;
          for (let $l1108 of $l236) {
            if ($l1108.type !== "assistant" || !Array.isArray($l1108.message.content)) continue;
            for (let $l1109 of $l1108.message.content) if ($l1109.type === "redacted_thinking") $l1106++;
            else if ($l1109.type === "thinking") if ("signature" in $l1109 && $l1109.signature) $l1106++;
            else $l1107++;
          }
          let $l1110 = $m_Vve($l236);
          if ($l1110 !== $l236) {
            if ($l236 = $l255($l1110, "error_recovery"), $l865("all"), $l234) $m_ZZ("rejected_fell_back");
            return $m_t("[thinking] server rejected a thinking block; stripping all thinking blocks and retrying.", { level: "warn" }), $m_a("tengu_thinking_signature_strip_retry", { query_source: $m_Es($l11.querySource), model: $m_wt($l11.model), stripped_signed_count: $l1106, stripped_unsigned_count: $l1107 }), "retry:thinking-signature-strip";
          }
        }
        if ($l234 && $m_MM($l1053)) $m_ZZ("rejected_surfaced");
        {
          let $l1111 = $l778($l1053);
          if ($l1111) return $l1111;
        }
        {
          let $l1112 = $l389($l1053);
          if ($l1112) return $l1112;
        }
        {
          let $l1113 = $l722($l1053);
          if ($l1113 !== void 0) return $l1113;
        }
        {
          let $l1114 = await $l329?.onRequestError($l1053, $l236);
          if ($l1114) return $l236 = $l255($l1114.messages, "microcompact"), $l955($l1114.clearedIds, $l1114.clearedContent), "retry:context-hint";
        }
        return $l732($l1053) ?? $l736($l1053) ?? $l404($l1053, $l517) ?? $l674($l1053, "stream") ?? $l415($l1053) ?? $l432($l1053) ?? $l688($l1053) ?? $l391($l1053) ?? $l383($l1053) ?? $l375($l1053);
      } }), $l1115;
      do
        if ($l1115 = await $l1035.next(), yield* $l958(), !("controller" in $l1115.value)) yield $l1115.value;
      while (!$l1115.done);
      if ($l464 = $l1115.value, $l815(), $l816(), $l818(), $l819(), $l820(), $l411(), $l401(), $l781(), $l651) $l651 = false, $l11.onRetryStatus?.(null);
      for (let [$l1116, $l1117] of $l646) yield $m_Gs({ ...$m__le($l1116, $l1117), error: "invalid_request", errorDetails: $l1117 });
      $l646.clear(), yield* $l895(), yield* $l894();
      let $l1016 = $l489 ? $l489._chunkTimes ?? void 0 : void 0;
      if ($l1016 === void 0 && $l489 !== void 0 && $m_Te() === "bedrock" && $m_SKr("bedrock")) $m_t("wire-heartbeat: _chunkTimes absent on a Bedrock stream with the byte watchdog enabled \u2014 heartbeat side-channel unavailable for this stream (bedrock-sdk \u22650.32.0 eventstream\u2192SSE transcode drops it; also expected if the response was not vnd.amazon.eventstream, e.g. behind a header-rewriting proxy)");
      let $l1023 = $l12.monotonicNow();
      $l620.length = 0, $l621 = 0, $l622 = void 0, $l623 = 0, $l363 = void 0, $l628.length = 0, $l671 = false, $l672 = false, $l1004 = false, $l1005.clear(), $l1006.clear(), $l1007.clear(), $l1008 = void 0, $l521 = false, $l292 = $m_Pm, $l629 = null, $l631 = null, $l632 = false, $l633 = "none";
      let $l1118 = false;
      $l288 = false, $l643 = false;
      let $l1119 = false, $l1120 = false, $l1121 = false, $l1122 = null, $l1123 = /* @__PURE__ */ new WeakSet(), $l1124 = /* @__PURE__ */ new WeakMap(), $l1125 = false, $l1126 = false, $l1127 = null, $l1128 = false, $l1129 = null, $l1130 = 0;
      function* $l1131({ responseUnfinished: $l1132 }) {
        if (!$l1126) return;
        let $l1133 = $l1128 ? null : $l1127;
        $l1126 = false, $l1127 = null, $l1128 = false;
        let $l1134 = $l1129 !== null ? { apiMessageId: $l1129 } : void 0;
        if ($l1133 !== null) yield { type: "stream_event", event: { type: "content_block_stop", index: $l1133 }, ...$l1134 };
        yield { type: "stream_event", event: { type: "message_stop" }, ...$l1134, ...$l1132 && $l1129 !== null && Number.isSafeInteger($l1130) ? { abandonedBlocks: { apiMessageId: $l1129, fromBlockIndex: $l1130 } } : void 0 };
      }
      let $l1135 = null, $l1136 = 0, $l1137 = 0, $l1138 = null, $l1139 = null, $l1140 = null, $l1141 = 0, $l1142 = false, $l1026 = $m_i.CLAUDE_ENABLE_STREAM_WATCHDOG ?? true, $l1032 = $m_Zhn(), $l1030 = $l1032 / 2, $l1019 = $m_Cmr(), $l1024 = Math.min($m_bKr($m_Te()), $l1026 ? $l1032 : 1 / 0), $l1021 = Math.min($m_xmr, $l1024 - $l1019), $l1033 = false, $l1031, $l1034 = null, $l1013 = null, $l1014 = null, $l1011 = null, $l1012 = false;
      $l1025();
      let $l1143 = () => {
        if ($l11.querySource !== "sdk" && $l11.keepPartialMessageOnAbort !== true) return;
        if ($l1004) return;
        let $l1144 = $l628[$l620.length];
        if ($l1144?.type !== "text" || $l1123.has($l1144) || !$l1144.text.trim() || !$l363) return;
        return { message: { ...$l363, content: $m_Acn([$l1144], $l3, $l11.agentId, { requestId: $l465 ?? void 0, messageId: $l363.id }, $l11.storageV5) }, apiBlockIndex: $l620.length, requestId: $l465 ?? void 0, requestRef: $l483, requestedModel: $l11.model, ...$m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), type: "assistant", uuid: $m_dee(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), isAbortedMidStream: true, ...void 0, ...$l330 !== void 0 && { effort: $l330 }, perTurnEffort: $l331, perTurnTiming: $l332 };
      }, $l1145 = () => {
        if ($l1008 === void 0 || $l672) return;
        let $l1146 = $l1008;
        return $l1008 = void 0, $l672 = true, { type: "server_fallback", fromModel: $l1146.fromModel, toModel: $l1146.model, reason: $l1146.reason, apiRefusalCategory: $l1146.category, midStream: false, requestId: $l465 ?? null, refusedEffort: $l333(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: null };
      };
      function* $l1147() {
        $l522("aborted", $l465 ?? null, null);
        let $l1148 = $l1145();
        if ($l1148) yield $l1148;
        let $l1149 = $l1143();
        if ($l1149) yield $l1149;
        if ($l643) $m_a("tengu_advisor_tool_interrupted", { model: $m_wt($l11.model), advisor_model: $m_wt($l48 ?? "unknown"), query_source: $m_Es($l11.querySource) });
      }
      let $l1150;
      try {
        let $l1151 = true, $l1152 = 3e4, $l1153 = 0, $l1154 = $m_qun($l464, $l4), $l1155 = { count: 0 };
        for await (let $l1156 of $m_Mmr($l1016 !== void 0 && $m_Vun() ? $m_Yun($l1154, $l1016, $l1155, $l4) : $l1154, $l1016, $m_agn, $l12)) {
          if ($m_zye($l1156)) {
            if ($l1153++, $l1153 <= $m_Amr) $l1025();
            else if (!$l1026 || $l1033 || $l1031 !== void 0) continue;
            yield { type: "stream_event", event: $l1156 };
            continue;
          }
          $l1153 = 0, $l1025(), $l623 += 1 + $l1155.count, $l1155.count = 0, $l1138 ??= Math.round($l12.monotonicNow() - $l461), $l1139 ??= $l1156.type, $l1140 = $l1156.type;
          let $l1157 = $l12.now();
          if ($l1135 !== null) {
            let $l1158 = $l1157 - $l1135;
            if ($l1158 > $l1152) $l1136++, $l1137 += $l1158, $m_t(`Streaming stall detected: ${($l1158 / 1e3).toFixed(1)}s gap between events (stall #${$l1136})`, { level: "warn" }), $m_a("tengu_streaming_stall", { stall_duration_ms: $l1158, stall_count: $l1136, total_stall_time_ms: $l1137, event_type: $m_c($m_cke($l1156.type)), model: $m_wt($l11.model), request_id: $m_Yg($l465) });
          }
          if ($l1135 = $l1157, $l1151) {
            if ($l502(), $m_t("Stream started - received first chunk"), $m_t(`[API:timing] first byte after ${Math.round($l12.monotonicNow() - $l461)}ms`), $m_gg("query_first_chunk_received"), !$l11.agentId && $l191) $m_th("first_chunk");
            if ($l16) $l1150 = $m_Ssn();
            $m_lsn(), $l1151 = false;
          }
          let $l1159 = $m_RXe($l1156), $l1160 = !$l1159 && $m_Srn($l1156);
          if ($l1159 || $l1160) $l643 = false;
          if ($l1159) {
            $l1007.add($l1159.index), $l628[$l1159.index] = $m_EXe($l1159);
            let $l1161 = $l511;
            if ($m_a("tengu_rotunda_pennant_materialized", { armed: $l11.serverRefusalFallback !== void 0, mode: $m_c($l1161), block_index: $l1159.index, non_streaming: false }), $l1159.reason === "refusal") $m_JZ({ model: $l26, requestId: $l465 || void 0, querySource: $l11.querySource, effort: $l303, fastMode: $l642, attempt: $l462, attribution: $m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: true, agentContext: $l11.agentContext });
            if ($l11.serverRefusalFallback === void 0) continue;
            if ($m_aTe($l1159.reason)) $l671 = true;
            if ($l363 !== void 0) $l363 = { ...$l363, model: $l1159.model };
            for (let $l1162 of $l1005.values()) $l1162.message.model = $l1159.model;
            if ($l1005.size === 0) $l1008 = $l1159;
            else if (!$m_aTe($l1159.reason)) $l672 = true, yield { type: "server_fallback", fromModel: $l1159.fromModel, toModel: $l1159.model, reason: $l1159.reason, apiRefusalCategory: $l1159.category, midStream: true, requestId: $l465 ?? null, refusedEffort: $l333(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: null };
            else {
              $l672 = true;
              let $l1163 = [];
              for (let [$l1164, $l1165] of $l1005) if ($m_hrn($l1165)) $l1163.push($l1165), $l1005.delete($l1164), delete $l628[$l1164];
              if ($l1163.length > 0) {
                let $l1166 = new Set($l1163);
                for (let $l1167 = $l620.length - 1; $l1167 >= 0; $l1167--) if ($l1166.has($l620[$l1167])) $l620.splice($l1167, 1);
                $l1004 = true;
              }
              let $l1168 = [...$l1005.entries()].sort(($l1169, $l1170) => $l1169[0] - $l1170[0]).map(([, $l1171]) => $l1171), $l1172 = $l1168.map(($l1173) => $l1173.message.content.map(($l1174) => $l1174.type === "text" ? $l1174.text : "").join("")).join("");
              yield { type: "server_fallback", fromModel: $l1159.fromModel, toModel: $l1159.model, reason: $l1159.reason, apiRefusalCategory: $l1159.category, midStream: true, requestId: $l465 ?? null, refusedEffort: $l333(), discardedMessages: $l1163, retainedMessages: $l1168, retainedText: $l1172, finalStopReason: null };
            }
            continue;
          }
          if ($l1160) {
            let $l1175 = $l1156.index;
            $l1006.add($l1175), $l1004 = true, $m_Y("warn", "cli_malformed_fallback_block"), $m_a("tengu_rotunda_pennant_malformed", { block_index: $l1175, non_streaming: false }), $m_f("refusal_fallback", "malformed_fallback_block", { non_streaming: false });
            continue;
          }
          if ($l1156.type === "content_block_stop" && $l1006.has($l1156.index)) continue;
          switch ($l1156.type) {
            case "message_start": {
              if ($m_vx(typeof $l1156.message === "object" && $l1156.message !== null, $l1156, $m_b("message_start_without_message")), $l1125 = true, $l398(), $l852(), $l378(), $l363 = $l1156.message, $l363 !== void 0 && "resumable" in $l363) {
                let { resumable: $l1176, ...$l1177 } = $l363;
                $l363 = $l1177;
              }
              if ($l621 = Math.max(0, Math.round($l12.monotonicNow() - $l461)), $l292 = $m_mAe($l292, $l1156.message?.usage), $l1156.message?.model) $m__no($m_Wn($l11.model), $l1156.message.model);
              $l641 = $l1156.message.diagnostics?.cache_miss_reason ?? void 0, $l907($l1156.message);
              let $l1178 = $l915($l1156.message), $l1179 = $l899();
              if ($l1179) yield $l1179;
              let $l1180 = $l242();
              if ($l1180) yield $l1180;
              if ($l1178) yield $l1178;
              break;
            }
            case "content_block_start": {
              let $l1181 = typeof $l1156.content_block === "object" && $l1156.content_block !== null;
              if (!$l1181) $l632 = false;
              if ($m_vx($l1181, $l1156, $m_b("content_block_start_without_content_block")), $m_sgr({ previous: $l628[$l1156.index], closedContentBlocks: $l1123, started: $l1156.content_block })) throw $m_a("tengu_streaming_error", { error_type: $m_b("content_block_closed_start"), part_type: $m_c($l1156.type), part_index: $m_Kve($l1156) }), new $m_Iie("closed");
              switch ($l632 = false, $l622 ??= Math.max(0, Math.round($l12.monotonicNow() - $l461)), $l1156.content_block.type) {
                case "tool_use":
                  $l1156.content_block.name = $m_C6t($l1156.content_block.name), $l628[$l1156.index] = { ...$l1156.content_block, input: "" };
                  break;
                case "server_tool_use":
                  if ($l628[$l1156.index] = { ...$l1156.content_block, input: "" }, $l1156.content_block.name === $m_TLe) $l643 = true, $m_t("[AdvisorTool] Advisor tool called"), $m_a("tengu_advisor_tool_call", { model: $m_wt($l11.model), advisor_model: $m_wt($l48 ?? "unknown"), query_source: $m_Es($l11.querySource) });
                  break;
                case "text":
                  $l628[$l1156.index] = { ...$l1156.content_block, text: "" };
                  break;
                case "thinking": {
                  let $l1182 = { ...$l1156.content_block, thinking: "", signature: "" };
                  $l628[$l1156.index] = $l1182, $m_igr($l1124, $l1182, $l12);
                  break;
                }
                default:
                  if ($l628[$l1156.index] = { ...$l1156.content_block }, $l1156.content_block.type === "advisor_tool_result") {
                    $l643 = false, $m_t("[AdvisorTool] Advisor tool result received");
                    let $l1183 = $m_lqs($l1156.content_block);
                    if ($l1183 !== void 0) $m_t(`[AdvisorTool] Advisor tool result error: ${$l1183}`), $m_a("tengu_advisor_tool_error", { model: $m_wt($l11.model), advisor_model: $m_wt($l48 ?? "unknown"), error_code: $m_c($l1183), query_source: $m_Es($l11.querySource) });
                    else $m_a("tengu_advisor_tool_result", { model: $m_wt($l11.model), advisor_model: $m_wt($l48 ?? "unknown"), query_source: $m_Es($l11.querySource), stop_reason: $m_le($m_EFo($l1156.content_block)) ?? $m_b("none") });
                  }
                  break;
              }
              if ($l1122 = $l1156.index, $l1156.content_block.type !== "thinking" && $l1156.content_block.type !== "redacted_thinking" && !$m_PY($l1156.content_block)) $l1121 = true;
              break;
            }
            case "content_block_delta": {
              let $l1184 = $l628[$l1156.index], $l1185 = $l1156.delta;
              if (!$l1184 || !$l1123.has($l1184)) $l632 = false;
              if (!$l1184 || $l1123.has($l1184)) throw $m_a("tengu_streaming_error", { error_type: $l1184 ? $m_b("content_block_closed_delta") : $m_b("content_block_not_found_delta"), part_type: $m_c($l1156.type), part_index: $m_Kve($l1156) }), new $m_Iie($l1184 ? "closed" : "unstarted");
              switch ($m_vx(typeof $l1185 === "object" && $l1185 !== null, $l1156, $m_b("content_block_delta_without_delta")), $m_vx(typeof $l1185.type === "string", $l1156, $m_b("content_block_delta_without_delta_type")), $l1185.type) {
                case "citations_delta":
                  if ($l1184.type !== "text") break;
                  $m_vx(typeof $l1185.citation === "object" && $l1185.citation !== null, $l1156, $m_b("citations_delta_without_citation")), $l1184.citations = [...$l1184.citations ?? [], $l1185.citation];
                  break;
                case "input_json_delta":
                  if ($l1184.type !== "tool_use" && $l1184.type !== "server_tool_use") throw $m_a("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_input_json"), expected_type: $m_b("tool_use"), actual_type: $m_c($l1184.type) }), new $m_Iie("unreadable");
                  if (typeof $l1184.input !== "string") throw $m_a("tengu_streaming_error", { error_type: $m_b("content_block_input_not_string"), input_type: $m_c(typeof $l1184.input) }), new $m_Iie("unreadable");
                  $m_vx(typeof $l1185.partial_json === "string", $l1156, $m_b("input_json_delta_without_partial_json")), $l1184.input += $l1185.partial_json;
                  break;
                case "text_delta":
                  if ($l1184.type !== "text") throw $m_a("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_text"), expected_type: $m_b("text"), actual_type: $m_c($l1184.type) }), new $m_Iie("unreadable");
                  $m_vx(typeof $l1185.text === "string", $l1156, $m_b("text_delta_without_text")), $l1184.text += $l1185.text;
                  break;
                case "signature_delta":
                  if ($l1184.type !== "thinking") throw $m_a("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_thinking_signature"), expected_type: $m_b("thinking"), actual_type: $m_c($l1184.type) }), new $m_Iie("unreadable");
                  $m_vx(typeof $l1185.signature === "string", $l1156, $m_b("signature_delta_without_signature")), $l1184.signature = $l1185.signature;
                  break;
                case "thinking_delta":
                  if ($l1184.type === "redacted_thinking") break;
                  if ($l1184.type !== "thinking") throw $m_a("tengu_streaming_error", { error_type: $m_b("content_block_type_mismatch_thinking_delta"), expected_type: $m_b("thinking"), actual_type: $m_c($l1184.type) }), new $m_Iie("unreadable");
                  $m_vx(typeof $l1185.thinking === "string", $l1156, $m_b("thinking_delta_without_thinking")), $l1184.thinking += $l1185.thinking;
                  break;
              }
              break;
            }
            case "content_block_stop": {
              let $l1186 = $l628[$l1156.index];
              if (!$l1186 || !$l1123.has($l1186)) $l632 = false;
              if (!$l1186 || $l1123.has($l1186)) throw $m_a("tengu_streaming_error", { error_type: $l1186 ? $m_b("content_block_closed_stop") : $m_b("content_block_not_found_stop"), part_type: $m_c($l1156.type), part_index: $m_Kve($l1156) }), new $m_Iie($l1186 ? "closed" : "unstarted");
              if ($l1122 = null, !$l363) throw $m_a("tengu_streaming_error", { error_type: $m_b("partial_message_not_found"), part_type: $m_c($l1156.type) }), Error("Message not found");
              let { content: $l1187, batchToolUses: $l1188 } = $m_Gpn($m_Acn([$l1186], $l3, $l11.agentId, { requestId: $l465 ?? void 0, messageId: $l363.id }, $l11.storageV5), $l3, ($l1189, $l1190) => $m_Rht($l1189, $l1190, $l11.agentId, $l11.storageV5)), $l1191 = $l273 ? $m_o$e([$l1186]) : void 0;
              $l1142 ||= $l1191?.degraded === true;
              let $l1192 = $l1191?.inputs, $l1193 = $m_p$e([$l1186], $l1192), $l1194 = $m_agr($l1124, $l1186, $l12), $l1195 = $m_pfn($l1186, $l504), $l1196 = { message: { ...$l363, content: $l1187 }, ...$l1194 !== void 0 && { thinkingDurationMs: $l1194 }, ...$l1195 !== void 0 && { thinkingDisplay: $l1195 }, ...$l1188.length > 0 && { batchToolUses: $l1188 }, ...$l1192 !== void 0 && { wireToolInputs: $l1192 }, ...$l1193 !== void 0 && { wireIngestContext: $l1193 }, ...$l1193 !== void 0 && { wireIngestContext: $l1193 }, ...$l467 !== void 0 && $m_w1e($l467), apiBlockIndex: $l1156.index, requestId: $l465 ?? void 0, requestRef: $l483, requestedModel: $l11.model, ...$m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), type: "assistant", uuid: $m_dee(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...false, ...$l48 && { advisorModel: $l48 }, ...$l330 !== void 0 && { effort: $l330 }, perTurnEffort: $l331, perTurnTiming: $l332, ...{} };
              if ($m_kYe($l28, $l1196), $l620.push($l1196), $l1141++, $l1005.set($l1156.index, $l1196), $l1130 = Math.max($l1130, Number.isSafeInteger($l1156.index) && $l1156.index >= 0 ? $l1156.index + 1 : Number.NaN), $l1123.add($l1186), $l1196.message.content.some(($l1197) => !$m_PY($l1197))) {
                if ($l1120 = true, $l1196.message.content.some(($l1198) => $l1198.type !== "thinking" && $l1198.type !== "redacted_thinking" && !$m_PY($l1198))) $l1121 = true;
              }
              yield $l1196;
              break;
            }
            case "message_delta": {
              if ($l292 = $m_mAe($l292, $l1156.usage), $l629 = $l1156.context_management ?? $l629, $m_vx(typeof $l1156.delta === "object" && $l1156.delta !== null, $l1156, $m_b("message_delta_without_delta")), $l467 !== void 0 && typeof $l1156.delta === "object" && $l1156.delta !== null && "safeguard_results" in $l1156.delta) $l470($l467, $l1156.delta, $l628);
              let $l1199 = $l11.serverRefusalFallback !== void 0 ? $m_bYn($l292) : void 0;
              if ($l1199?.servedFallbackModel !== void 0) $l671 = true, $l292 = $m_jDo($l292, $l1156.usage);
              let $l1200 = $m_vXe($l1156.delta.stop_details);
              {
                let $l1201 = $l1156.delta.stop_details;
                if ($l1201 && "fallback_credit_token" in $l1201) delete $l1201.fallback_credit_token;
              }
              if ($l1200 !== void 0 && !$l521) $l521 = true, $m_a("tengu_fallback_credit_minted", { request_id: $m_ye($l465), model: $m_wt($l11.model), fallback_target_model: $m_wt($l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l671 ? $l11.serverRefusalFallback.model : void 0)), token_length: $l1200.length, input_tokens: $l292.input_tokens, output_tokens: $l292.output_tokens, cache_read_input_tokens: $l292.cache_read_input_tokens, cache_creation_input_tokens: $l292.cache_creation_input_tokens, cache_creation_5m_input_tokens: $l292.cache_creation?.ephemeral_5m_input_tokens ?? 0, cache_creation_1h_input_tokens: $l292.cache_creation?.ephemeral_1h_input_tokens ?? 0, service_tier: $m_le($l292.service_tier), speed: $m_le($l292.speed), query_source: $m_Es($l11.querySource), ...$l11.queryTracking && { query_chain_id: $m_ye($l11.queryTracking.chainId), query_depth: $l11.queryTracking.depth } });
              let $l1202 = typeof $l1156.delta.stop_reason === "string" ? $l1156.delta.stop_reason : null;
              if ($l1202 !== null) $l631 = $l1202, $l632 = true;
              let $l1203 = $l1156.delta;
              if ($l1203.diagnostics?.cache_miss_reason) $l641 = $l1203.diagnostics.cache_miss_reason;
              let $l1204 = $m_Zmn($l1156.delta) ?? $m_Zmn($l1156);
              for (let $l1205 of $l620) {
                if ($l1205.message.usage = $l292, $l1205.message.stop_reason = $l631, $l1202 !== null || $l631 === null) $l1205.message.stop_details = $l1156.delta.stop_details ?? null;
                if ($l444 && $l629) $l1205.message.context_management = $l629;
                if ($l1204 !== void 0) $l1205.message.resumable = $l1204;
              }
              if ($l631 !== null && $l633 !== "credited") {
                $l633 = "credited";
                let $l1206 = $l1199?.servedFallbackModel, $l1207 = $l1199 !== void 0 && $l1206 !== void 0, $l1208 = $l1207 ? $m_CXe($l1199.entries, { speed: $l292.speed, inferenceGeo: $l292.inference_geo, serverToolUse: $l292.server_tool_use }, $l631) : $m_Cxe($l26, $l292), $l1209 = $l1207 ? $m_SYn($l11.serverRefusalFallback?.model, $l1206) : $l11.model;
                $l630 += $m_$7e($l1208, $l292, $l1209, $l11.querySource, $l303, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool);
              } else if ($l633 === "none") $l633 = "pending";
              if ($l1202 === "refusal" && !$l1118) $l1118 = true, $m_JZ({ model: $l26, requestId: $l465 || void 0, querySource: $l11.querySource, effort: $l303, fastMode: $l642, attempt: $l462, attribution: $m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: false, stopDetails: $l1156.delta.stop_details ?? null, agentContext: $l11.agentContext });
              if ($l11.serverRefusalFallback !== void 0) {
                let $l1210 = $l1008;
                if ($l1008 = void 0, $l1210 !== void 0) {
                  if (!$l672) $l672 = true, yield { type: "server_fallback", fromModel: $l1210.fromModel, toModel: $l1210.model, reason: $l1210.reason, apiRefusalCategory: $l1210.category, midStream: false, requestId: $l465 ?? null, refusedEffort: $l333(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: $l631 };
                } else if (!$l672 && $l1199?.servedFallbackModel !== void 0) $l672 = true, yield { type: "server_fallback", fromModel: $l11.model, toModel: $l1199.servedFallbackModel, reason: "sticky", apiRefusalCategory: null, midStream: false, requestId: $l465 ?? null, refusedEffort: $l333(), discardedMessages: [], retainedMessages: [], retainedText: "", finalStopReason: $l631 };
              }
              let $l1211 = $l11.refusalFallbackModel ?? ($l11.serverRefusalFallback !== void 0 && !$l671 ? $l11.serverRefusalFallback.model : void 0), $l1212 = $l11.refusalFallbackModelLane === "silent", $l1213 = $l11.refusalFallbackCascadeHop, $l1214 = $l1202 === "refusal" && $l1211 !== void 0 && !$l1212 && $l1213 === void 0 ? $m_gKo({ originalModelCanonical: $m_Je($l11.model), armedFallbackModel: $l1211, apiRefusalCategory: $l1156.delta.stop_details?.category ?? null, armedTargetIsRefusingModel: $m_uvt($l11.model, $l1211), resolveTarget: ($l1215) => $m__zt({ mappedTarget: $l1215, armedFallbackModel: $l1211, refusingModel: $l11.model, triedModels: [$m_fvt($l11.model)] }), routesOverride: $m_lKr() }) : void 0, $l1216 = $l1214 !== void 0 ? $l1214.model : $l1211;
              if ($l1214 !== void 0) $m_aKr({ route: $l1214, model: $l11.model, armedFallbackModel: $l1211, apiRefusalCategory: $l1156.delta.stop_details?.category, requestId: $l465 });
              let $l1217 = $l1214?.matched === "none" && $l1156.delta.stop_details?.category === "bio" && !$m_O4(), $l1218 = $l1202 === "refusal" && ($l1211 === void 0 || $l1217) ? $l11.refusalFallbackSilentRearm?.($l1217, $l1156.delta.stop_details?.category ?? null, $m_kKo($l489?.headers)) : void 0, $l1219 = $l1216 ?? $l1218;
              if ($l1202 === "refusal" && $l1219 !== void 0) {
                $l772(), yield { type: "fallback_request", trigger: "refusal", originalModel: $l11.model, fallbackModel: $l1219, requestId: $l465 ?? null, refusedEffort: $l333(), apiRefusalCategory: $l1156.delta.stop_details?.category ?? null, apiRefusalExplanation: $l1156.delta.stop_details?.explanation ?? null, creditCode: $l1200 ?? null, mintedStateless: !$l449, ...$l1218 !== void 0 && { silentArmAtTrigger: true }, ...$m_pKo($l1214, $l1213) };
                return;
              }
              let $l1220 = $m_lFt($l1202, $l1156.delta.stop_details, $l465, $l671 ? $l1199?.servedFallbackModel ?? $l363?.model ?? $l11.model : $l11.model, $l363?.id);
              if ($l1220) {
                let $l1221 = $m_O4() || $m_mK() !== void 0;
                if ($l1211 !== void 0 || $l11.refusalFallbackModel !== void 0 || $m_cvt($l11.model) && $m_vz() || $m_Jhn() || $l1221) $m_m("refusal_fallback", $l1214?.matched === "none" ? "route_declined" : $l671 ? "server_chain_exhausted" : $l1221 ? "client_chain_exhausted" : $m_cvt($l11.model) && $m_fKr() ? "disabled_by_config" : "not_armed", { convolute_arcades: $m_Xhn(), arm_source: $m_c($m_K0e()), armed: $l1211 !== void 0, model_scope: $m_c($m_TZ($l11.model)) });
                yield { type: "refusal_no_fallback", originalModel: $l11.model, requestId: $l465 ?? null, apiRefusalCategory: $l1156.delta.stop_details?.category ?? null, apiRefusalExplanation: $l1156.delta.stop_details?.explanation ?? null }, yield $l1220;
              }
              let $l1222 = $m_Jmn($l1202, $l638, $l292.output_tokens);
              if ($l1222 !== void 0) yield $l1222;
              break;
            }
            case "message_stop":
              if ($l1125 = false, $l467 !== void 0 && $m_DGt($l467)) $l468({ kind: "none", why: "server_no_result" });
              if ($l1142) $m_r$e();
              if ($l633 === "pending") $l634();
              $l522("stream_completed", $l465 ?? null, $l292);
              break;
          }
          if ($l1156.type === "content_block_stop" && $l1007.has($l1156.index)) continue;
          $l1119 = true;
          let $l1223 = $m_hfn($l1156, $l504), $l1224 = $l1126 || $l1156.type === "message_start";
          if ($l1156.type === "message_start") $l1126 = true, $l1127 = null, $l1128 = false, $l1129 = typeof $l1156.message.id === "string" && $l1156.message.id !== "" ? $l1156.message.id : null;
          else if ($l1156.type === "content_block_start") $l1127 = $l1156.index, $l1128 = $m_Pmr.has($l1156.content_block.type);
          else if ($l1156.type === "content_block_stop") $l1127 = null, $l1128 = false;
          else if ($l1156.type === "message_stop") $l1126 = false, $l1127 = null, $l1128 = false;
          yield { type: "stream_event", event: $l1156, ...$l1156.type === "message_start" ? { ttftMs: $l621, ...$l330 !== void 0 && { sentEffort: $l330 }, ...$l11.turnEffort !== void 0 && { turnEffort: $l11.turnEffort }, ...$l624 ? { requestSentAtMs: $l624 } : void 0, ...$l625 ? { requestSentWallMs: $l625 } : void 0 } : void 0, ...$l1223 !== void 0 ? { thinkingDisplay: $l1223 } : void 0, ...$l1224 && $l1129 !== null ? { apiMessageId: $l1129 } : void 0 };
        }
        if ($l1010(), $l1150?.($l623, $l1016?.chunks), $l4.aborted) {
          yield* $l1147();
          return;
        }
        if ($l1033) {
          let $l1225 = $l1034 !== null ? Math.round($l12.monotonicNow() - $l1034) : -1;
          throw $m_Y("info", "cli_stream_loop_exited_after_watchdog_clean"), $m_a("tengu_stream_loop_exited_after_watchdog", { request_id: $m_Yg($l465), exit_delay_ms: $l1225, exit_path: $m_b("clean"), model: $m_wt($l11.model) }), $l1034 = null, Error("Stream idle timeout - no chunks received");
        }
        if ($l1031 !== void 0) throw $l1031;
        if ($l1125 && $l1122 !== null) throw $m_t(`Stream ended cleanly inside open block ${$l1122} (stop_reason=${$l631}) \u2014 treating as a dropped connection`, { level: "error" }), new $m_LJr();
        if (!$l363 || $l620.length === 0 && !$l631) throw $m_t(!$l363 ? "Stream completed without receiving message_start event - triggering non-streaming fallback" : "Stream completed with message_start but no content blocks completed - triggering non-streaming fallback", { level: "error" }), $m_a("tengu_stream_no_events", { model: $m_wt($l11.model), request_id: $m_Yg($l465), ...$m_fke(void 0, $l494), ms_since_request: Math.round($l12.monotonicNow() - $l461) }), new $m_vTn();
        if ($l1125 && !($l631 !== null && $l632)) throw $m_t(`Stream ended cleanly mid-response (stop_reason=${$l631}, terminal=${$l632}) \u2014 treating as a dropped connection`, { level: "error" }), new $m_LJr();
        try {
          let $l1226 = $m_ni(), $l1227 = $l1226.hasFired("stream_text_delivery_bad"), $l1228 = $l1226.hasFired("stream_text_delivery_ok");
          if ($l631 !== null && !$l1004 && (!$l1227 || !$l1228)) {
            if (!$l1227) for (let [$l1229, $l1230] of $l628.entries()) {
              if (!$l1230 || $l1230.type !== "text") continue;
              if ($l1230.text.trim().length > 0 && !$l1005.has($l1229) && !$l1006.has($l1229)) {
                $l1226.markFired("stream_text_delivery_bad"), $m_m("api_stream_text_delivery", "text_block_unyielded", { had_tool_use: $l628.some(($l1231) => $l1231?.type === "tool_use"), dropped_block_index: $l1229 });
                break;
              }
            }
            if (!$l1228) {
              let $l1232 = $l628.some(($l1233, $l1234) => $l1233?.type === "text" && $l1233.text.trim().length > 0 && $l1005.has($l1234)), $l1235 = $l628.some(($l1236, $l1237) => $l1236?.type === "tool_use" && $l1005.has($l1237));
              if ($l1232 && $l1235) $l1226.markFired("stream_text_delivery_ok"), $m_g("api_stream_text_delivery");
            }
          }
          if ($l631 !== null) $l805($l292);
          $l812($l292);
        } catch {
        }
        if ($l1136 > 0) $m_t(`Streaming completed with ${$l1136} stall(s), total stall time: ${($l1137 / 1e3).toFixed(1)}s`, { level: "warn" }), $m_a("tengu_streaming_stall_summary", { stall_count: $l1136, total_stall_time_ms: $l1137, model: $m_wt($l11.model), request_id: $m_Yg($l465) });
        $m_Hni({ returnAfterIdle: $l444 ? $l442?.returnAfterIdle : void 0, contextManagement: $l629, usage: $l292, querySource: $l11.querySource, agentId: $l11.agentId }), $m_pni($l11.querySource, $l292.cache_read_input_tokens, $l292.cache_creation_input_tokens, $l0, $l11.agentId, $l465, $l25, $l191);
        let $l1238 = $l489;
        if ($l1238) {
          $m_nZn($l492, $l493), $m_U2s($l1238.headers, $m_ss($l11.querySource) !== "auxiliary", $l493, $l322);
          let $l1239 = ($m_Om($l11.model) || $m_TC($l11.model)) && $l292.input_tokens + $l292.cache_read_input_tokens + $l292.cache_creation_input_tokens > $m_E6, $l1240 = $m_SNo($l1238.headers, $l11.model, $l1239, $l493, $l322, $l11.storageV5);
          if ($l1240 && $l11.queryTracking) $l11.queryTracking.answeredQuerySource = $l11.querySource, $l11.queryTracking.billedToUsageCredits = $l1240.overageInUse === true, $l11.queryTracking.longContextBilled = $l1239;
          $m_Npn($l1238.headers, $l11, $l642), $l639 = $l1238.headers;
        }
      } catch ($l1241) {
        let $l1242 = $l1031 !== void 0 && !$l1033 && !$l4.aborted && $l1241 instanceof $m_sf ? $l1031 : $l1241;
        $l1010(), $l1150?.($l623, $l1016?.chunks), $l502();
        {
          let $l1243 = $l1145();
          if ($l1243) yield $l1243;
        }
        if (!$l1033 && $l1242 instanceof $m_bZn) $l1033 = true, $l1034 = $l12.monotonicNow(), $m_t(`Streaming idle timeout (byte-level): ${$l1242.message}, aborting stream`, { level: "error" }), $m_Y("error", "cli_streaming_idle_timeout"), $m_a("tengu_streaming_idle_timeout", { model: $m_wt($l11.model), request_id: $m_Yg($l465), timeout_ms: $l1242.idleMs, tier: $m_b("byte"), bytes_received_before_stall: $l1242.bytesReceived, time_to_first_byte_ms: $l1242.ttfbMs, body_read_pending: $l1242.bodyReadPending, slept_ms: $l1242.sleptMs, cf_ray: $m_ye($l1242.cfRay) });
        if ($l1033 && $l1034 !== null) {
          let $l1244 = Math.round($l12.monotonicNow() - $l1034);
          $m_Y("info", "cli_stream_loop_exited_after_watchdog_error"), $m_a("tengu_stream_loop_exited_after_watchdog", { request_id: $m_Yg($l465), exit_delay_ms: $l1244, exit_path: $m_b("error"), error_name: $l1242 instanceof Error ? $m_w1($l1242) ?? $m_b("Error") : $m_b("unknown"), model: $m_wt($l11.model) });
        }
        let $l1245 = { events_received: $l623, ms_to_first_event: $l1138, ms_since_last_event: $l1135 === null ? null : $l12.now() - $l1135 }, $l1246 = ($l1247, $l1248) => $m_Y("warn", "cli_stream_failed", () => ({ ...$m_dL($l1248, $m_Jde($l1248), $l494), fallback_cause: $l1247, watchdog_fired: $l1033, slept_ms: $l1242 instanceof $m_bZn || $l1242 instanceof $m_vzt ? $l1242.sleptMs : null, client_request_id: $m_ye($l488) ?? null, model: $m_wt($l11.model) ?? null, stream: { ...$l1245, first_event_type: $l1139 === null ? null : $m_cke($l1139), last_event_type: $l1140 === null ? null : $m_cke($l1140), message_envelope_open: $l1125, stop_reason_received: $l631 !== null, content_blocks_completed: $l1141, any_event_yielded: $l1119, ms_since_request: Math.round($l12.monotonicNow() - $l461), ms_to_headers: $l494?.latencyMs ?? null, stalls_over_30s: $l1136, stall_ms_total: $l1137 }, route: $m_xht() }));
        if ($l1242 instanceof $m_sf) {
          if ($l4.aborted) throw yield* $l1147(), $m_t(`Streaming aborted by user: ${$m_d($l1242)}`), $l1242;
          else if (!$l1033) {
            $m_t(`Streaming timeout (SDK abort): ${$l1242.message}`, { level: "error" });
            let $l1249 = new $m_Ok({ message: "Request timed out" });
            throw $l1246("sdk_timeout", $l1249), $l1249;
          }
        }
        let $l1250 = $m_lg($l1242), $l1251 = $l1250 !== null && $m_Jq.has($l1250.code), $l1252 = $l1250 !== null && ($l1251 || $m_YB.has($l1250.code)), $l1253 = $l329?.classifyStreamError($l1242) ?? false, $l1254 = $l1242 instanceof $m_Iie || $l1242 instanceof SyntaxError, $l1255 = $l1242 instanceof $m_Iie && $l1242.blockState === "unstarted", $l1256 = $l1255 ? "event referenced an unstarted content block" : $l1242 instanceof $m_Iie && $l1242.blockState === "closed" ? "event referenced an already-closed content block" : "event could not be read", $l1257 = $m_Vgi({ connDetails: $l1250, isStaleConnection: $l1251, isContextHintSse: $l1253, streamIdleAborted: $l1033, noEvents: $l1242 instanceof $m_vTn, malformedStream: $l1242 instanceof $m_Iie }), $l1258 = $m_w1($l1242) ?? null, $l1259 = $m_Kae($l1250?.code) ?? null, $l1260 = $l1242 instanceof Error ? $l1258 ?? $m_b("none") : $m_c(typeof $l1242), $l1261 = $l1242 instanceof Error ? $m__ps($l1242.constructor?.name) ?? $m_b("none") : $m_b("none"), $l1262 = $l1259 ?? $m_b("none"), $l1263 = ($m_k("tengu_watchdog_skip_nonstreaming_fallback", false) || $m_i.CLAUDE_CODE_REMOTE) && $l1033 || $m_i.CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK || $m_k("tengu_disable_streaming_to_non_streaming_fallback", false), $l1264 = $l1033 ? Error($l620.length > 0 ? "Stream idle timeout - partial response received" : "Stream idle timeout - no chunks received") : $l1242, $l1265 = $l1264 instanceof Error ? $m_w1($l1264) ?? $m_b("Error") : $m_c(typeof $l1264);
        $l1246($l1257, $l1242 instanceof $m_sf ? $l1264 : $l1242);
        let $l1266 = $m_O2($l1242) || $m_Y8e($l1242) || $l1242 instanceof $m_Mt && ($l1242.type === "api_error" || $l1242.type === "timeout_error"), $l1267;
        if ($m_wit($l1242)) $l1267 = "dlpDenied";
        else if ($m_YYe($l1242)) $l1267 = "escapeMonitor";
        let $l1268 = $m_PM($l1242), $l1269 = $l658 !== null && !$l657 && $l1250 !== null && !$l1119, $l1270 = $m_Rmn({ error: $l1242, isServerError: $l1266, stalled: $l1033, isConnectionError: $l1252 || $l1269, suspended: $m_wTn($l1242), truncated: $l1250?.code === "StreamTruncated", malformed: $l1254, denied: $l1267 !== void 0, outputFiltered: $l1268, anyEvent: $l1119, anyBlockFinished: $l1120, anyOutputShown: $l1121, stopReasonReceived: $l631 !== null, outlastedNonStreamingTimeout: $l12.monotonicNow() - $l461 >= $m_egn(), complete: $l631 !== null && $l632 && $l1122 === null }), $l1271 = $l1270 === void 0 ? "keepPartial" : $l656.onStreamFailed($l1270, !$l1263), $l1272 = $l656.counts(), $l1273 = $l1270?.progress === "thinkingOnly" && $l1270.cause === "overloaded" && !$l1270.stopReasonReceived;
        if ($l1271 === "useFallbackModel" && ($l1270?.cause === "serverError" || $l1270?.cause === "timedOut") && $l11.fallbackModel) {
          if (!$l1121) $m_$K($l620, $l26);
          if ($l1125) $l634(), $l289();
          throw $m_a("tengu_api_model_not_found_fallback_triggered", { original_model: $m_wt($l11.model), fallback_model: $m_wt($l11.fallbackModel), provider: $m_kT(), reason: $l1270.cause === "timedOut" ? $m_b("timed_out") : $m_b("server_error"), source: $m_b("mid_stream") }), new $m_YO($l11.model, $l11.fallbackModel, "server_error", $l1242);
        }
        if ($l1270 === void 0 || $l1270.progress === "output" || $l1270.progress === "thinkingOnly" && !$l1273) {
          let $l1274 = $l1266 && $l1121, $l1275 = $l1266 && $l1271 === "retry";
          if ($l1271 !== "fail") {
            $l503();
            let $l1276 = $l1033, $l1277 = $l620.some(($l1278) => $l1278.message.content.some(($l1279) => $l1279.type === "tool_use"));
            if ($l1271 === "retry") {
              if (!$l1121) $m_$K($l620, $l26);
              if ($l1276) $m_t(`Stream idle timeout after thinking-only yield \u2014 retrying streaming (${$l1272.stalls}/${$m_Z7e})`, { level: "warn" }), $m_a("tengu_streaming_watchdog_retry", { model: $m_wt($l11.model), retry_attempt: $l1272.stalls, request_id: $m_ye($l465), after_thinking_only: true });
              else $m_t(`Stream ${$l1254 ? $l1256 : $l1275 ? "server error" : `connection closed (${$l1250?.code})`} after thinking-only yield \u2014 retrying streaming (${$l1272.afterThinkingOnly}/${$l1270?.cause === "timedOut" ? $m_hmn : $m_eQe})`, { level: "warn" }), $m_a("tengu_streaming_stale_connection_retry", { model: $m_wt($l11.model), error_code: $l1254 ? $m_b("malformed_stream") : $l1275 ? $l1270?.cause === "timedOut" ? $m_b("timed_out") : $m_b("server_error") : $m_rcr($l1250?.code ?? ""), retry_attempt: $l1272.afterThinkingOnly, request_id: $m_ye($l465), after_thinking_only: true });
              if ($l522("attempt_errored", $l465 ?? null, null), $l634(), $l289(), yield* $l1131({ responseUnfinished: true }), $l465 = null, $l1275) await $m_J($m_hF($l1272.afterThinkingOnly, void 0, void 0, $l11.random), $l4, { clock: $l12 });
              else if (!$l1276) await $m_J(100 * $l1272.afterThinkingOnly, $l4, { clock: $l12 });
              continue e;
            }
            let $l1280 = $l631 !== null, $l1281 = $l1250?.code === "StreamSuspended", $l1282 = $l1281 && !$m_Sm(), $l1283 = $l1276 ? "watchdog" : $l1274 ? $l1242 instanceof $m_Mt && $l1242.type === "timeout_error" ? "timed_out" : "server_error" : $l1254 ? "malformed_stream" : $l1281 ? "stream_suspended" : $l1250?.code === "StreamTruncated" ? "stream_truncated" : $l1250 !== null && $m_YB.has($l1250.code) ? "network_down" : "stale_connection", $l1284 = $m_c($l1283);
            if ($l1280 && $l632 && $l1122 === null) {
              $m_t(`Stream ${$l1276 ? "stalled" : `connection closed (${$l1250?.code ?? "unknown"})`} after message_delta (stop_reason=${$l631}) \u2014 response already complete, no truncation`, { level: "info" }), $m_a("tengu_streaming_close_after_complete", { model: $m_wt($l11.model), blocks_yielded: $l620.length, cause: $l1284, error_code: $l1250 ? $m_rcr($l1250.code) : $m_b("none"), request_id: $m_ye($l465) }), $l522("stream_completed", $l465 ?? null, $l292), yield* $l1131({ responseUnfinished: false });
              break e;
            }
            let $l1285 = $l1277 ? "tool_use" : "end_turn";
            $l631 = $l1285;
            for (let $l1286 of $l620) $l1286.message.usage = $l292, $l1286.message.stop_reason = $l1285;
            $l343?.noteClientTruncated($l620[0]?.message.id), $m_t($l1276 ? `Stream idle timeout after ${$l620.length} block(s) yielded \u2014 finalizing partial response` : $l1274 ? `Mid-stream server error after ${$l620.length} block(s) yielded \u2014 finalizing partial response` : $l1254 ? `Stream ${$l1256} after ${$l620.length} block(s) yielded \u2014 finalizing partial response` : `Stream connection closed (${$l1250?.code}) after ${$l620.length} block(s) yielded \u2014 finalizing partial response`, { level: "warn" }), $m_a("tengu_streaming_partial_finalized", { model: $m_wt($l11.model), blocks_yielded: $l620.length, has_output: $l1121, synthesized_stop_reason: $m_c($l1285), cause: $l1284, request_id: $m_ye($l465) }), $l634(), yield* $l1131({ responseUnfinished: true });
            let $l1287 = $m_Gs({ content: $l1121 ? $l1276 ? `${$m_td}: The response stopped arriving. The response above may be incomplete.` : $l1274 ? `${$m_td}: Server error mid-response. The response above may be incomplete.` : $l1254 ? $l1255 ? `${$m_td}: Part of the response never arrived. The response above may be incomplete.` : `${$m_td}: The response stream was malformed. The response above may be incomplete.` : $l1282 ? `${$m_td}: Your computer went to sleep mid-response. The response above may be incomplete.` : `${$m_td}: Connection lost mid-response. The response above may be incomplete.` : $l1276 ? `${$m_td}: The response stalled before a response was produced. Try again.` : $l1254 ? $l1255 ? `${$m_td}: Part of the response never arrived and no response was produced. Try again.` : `${$m_td}: The response stream was malformed and no response was produced. Try again.` : $l1282 ? `${$m_td}: Your computer went to sleep before a response was produced. Try again.` : `${$m_td}: Connection lost before a response was produced. Try again.`, error: "server_error", truncatedAfterOutput: $l1121 && !$l1277 ? true : void 0 });
            if ($l1287.streamCutCause = $l1283, $l1276 && !$l1121) $l1287.streamWatchdogGaveUp = true;
            yield $l1287;
            break e;
          }
          throw $m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $l1265, attemptNumber: $l462, maxOutputTokens: $l638, thinkingType: $m_c($l35.type), fallback_disabled: $l1263, request_id: $m_Yg($l465), fallback_cause: $m_b("partial_yield"), any_stream_event_yielded: $l1119, has_output: $l1121, died_of: $m_c($l1270?.cause ?? "complete") }), $l1264;
        }
        if ($l1270?.cause === "outputFiltered") {
          if ($l1125) $l634();
          if ($l1271 === "retry") {
            if ($m_t(`Output content filter stopped the response before any of the answer was shown: retrying streaming (${$l1272.outputFiltered}/${$m_Wve})`, { level: "warn" }), $m_a("tengu_streaming_output_filter_retry", { model: $m_wt($l11.model), retry_attempt: $l1272.outputFiltered, request_id: $m_Yg($l465), first_stop_progress: $m_c($l1270.progress) }), $l653 = { firstStopProgress: $l1270.progress, msToFirstStop: Math.round($l12.monotonicNow() - $l461), startedAt: $l12.monotonicNow(), ended: void 0 }, $l503(), $l522("attempt_errored", $l465 ?? null, null), $l1125) $l289();
            yield* $l1131({ responseUnfinished: true }), $l465 = null;
            continue e;
          }
          throw $m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $m_b("output_content_filtered"), attemptNumber: $l462, maxOutputTokens: $l638, thinkingType: $m_c($l35.type), fallback_disabled: true, request_id: $m_Yg($l465), fallback_cause: $m_b("output_content_filtered"), any_stream_event_yielded: $l1119 }), $l1242;
        }
        if ($l1269) {
          if ($l657 = true, $m_t(`[dispatch] Stream connection error (${$l1250.code}) with ${$m_Ny}=${$l658} before first event; ${$l1271 === "retry" ? "retrying once" : "going on"} with ${$m_Ny}=${$m_Aw}`, { level: "warn" }), $m_a("tengu_dispatch_header_fallback", { model: $m_wt($l11.model), dispatch: $l658 ?? void 0, resend_dispatch: $m_c($m_Aw), reason: $m_b("body_phase"), status: $m_b("none"), error_code: $m_rcr($l1250.code), query_source: $m_Es($l11.querySource), request_id: $m_ye($l465) }), $l1271 === "retry") {
            $l503(), $l522("attempt_errored", $l465 ?? null, null), $l465 = null;
            continue e;
          }
        }
        let $l1288 = $l1252 && $l1250 !== null ? { label: `connection error (${$l1250.code})`, errorCode: $m_rcr($l1250.code), error: new $m_Uu({ cause: $l1242 instanceof Error ? $l1242 : void 0 }), attempt: Math.max(1, $l1272.retries), limit: $l655 } : $l1270?.cause === "serverError" && $l1242 instanceof $m_Mt ? { label: "server error", errorCode: $m_b("server_error"), error: $l1242, attempt: $l1272.afterThinkingOnly, limit: $m_eQe } : void 0;
        if ($l1271 === "retry" && $l1288 !== void 0) {
          let $l1289 = $l1288.attempt;
          if ($m_t(`Stream ${$l1288.label} \u2014 retrying streaming (${$l1289}/${$l1288.limit})`, { level: "warn" }), $m_a("tengu_streaming_stale_connection_retry", { model: $m_wt($l11.model), error_code: $l1288.errorCode, retry_attempt: $l1289, request_id: $m_Yg($l465) }), $l503(), $l522("attempt_errored", $l465 ?? null, null), $l1125) $l289();
          if ($l1125 && $l633 !== "credited") $l634(), yield* $l1131({ responseUnfinished: true });
          $l465 = null;
          let $l1290 = $m_hF($l1289, void 0, void 0, $l11.random), $l1291 = { ...$m_acr($l1288.error), rateLimits: null };
          $l651 = true, $l11.onRetryStatus?.({ kind: "retrying", error: $l1291, attempt: $l1289, maxRetries: $l1288.limit, retryInMs: $l1290, deadline: $l12.now() + $l1290 }), yield $m_BK($l1291, $l1290, $l1289, $l1288.limit, "connection_retry"), await $m_J($l1290, $l4, { clock: $l12 });
          continue e;
        }
        if ($l1252 && $l631 === null && $l1125) $l634();
        if ($l1033 && $l1271 === "retry") {
          $m_t(`Stream idle timeout before first event \u2014 retrying streaming (${$l1272.stalls}/${$m_Z7e})`, { level: "warn" }), $m_a("tengu_streaming_watchdog_retry", { model: $m_wt($l11.model), retry_attempt: $l1272.stalls, request_id: $m_Yg($l465) }), $l503(), $l522("attempt_errored", $l465 ?? null, null), $l465 = null;
          continue e;
        }
        if (!$l1121 && $l631 === null && !$l656.outOfApiAttempts() && $l757($l1242) !== void 0) {
          if ($l656.undoLastCount(), $l1125) $l634(), $l289();
          $l503(), $l522("attempt_errored", $l465 ?? null, null), yield* $l1131({ responseUnfinished: true }), $l465 = null;
          continue e;
        }
        if ($l1267 === "dlpDenied") throw $m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $m_b($m_NFe), attemptNumber: $l462, maxOutputTokens: $l638, thinkingType: $m_c($l35.type), fallback_disabled: true, request_id: $m_Yg($l465), fallback_cause: $m_b($m_NFe), any_stream_event_yielded: $l1119 }), $l1242;
        if ($l1267 === "escapeMonitor") throw $m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $m_b($m_Pie), attemptNumber: $l462, maxOutputTokens: $l638, thinkingType: $m_c($l35.type), fallback_disabled: true, request_id: $m_Yg($l465), fallback_cause: $m_b($m_Pie), any_stream_event_yielded: $l1119 }), $l1242;
        if ($l1242 instanceof $m_Mt && $m_O2($l1242)) {
          let $l1292 = $l1121 ? null : $m_nKr($l1242, { markedAtDispatch: $l491, querySource: $l11.querySource, wait: $l492 }), $l1293 = $l656.outOfApiAttempts() ? null : $l1292;
          if (!$l1121) {
            if ($l1125) $l634(), $l289();
            let $l1294 = $l1272.overloaded;
            if ($l1293 !== null || $l1271 === "retry") {
              if ($m_$K($l620, $l26), $m_t($l1293 !== null ? `Mid-stream 529 before content at lower priority \u2014 waiting ${$l1293.delayMs}ms for capacity (attempt ${$l1293.attempt})` : `Mid-stream 529 before content \u2014 retrying streaming (${$l1294}/${$m_nee})`, { level: "warn" }), $l1293 !== null) $l656.undoLastCount();
              $m_a("tengu_streaming_529_retry", { model: $m_wt($l11.model), retry_attempt: $l1293 !== null ? $l1293.attempt : $l1294, request_id: $m_ye($l465), ...$l1293 !== null && { is_low_priority: true } }), $l503(), $l522("attempt_errored", $l465 ?? null, null), yield* $l1131({ responseUnfinished: true }), $l465 = null, $l651 = true;
              let $l1295 = $l1293?.delayMs ?? $m_hF($l1294, void 0, void 0, $l11.random);
              $l11.onRetryStatus?.($l1293 !== null ? { kind: "low_priority_waiting", attempt: $l1293.attempt, retryInMs: $l1295, deadline: $l12.now() + $l1295 } : { kind: "retrying", error: { ...$m_acr($l1242), rateLimits: null }, attempt: $l1294, maxRetries: $m_nee - 1, retryInMs: $l1295, deadline: $l12.now() + $l1295 }), await $m_J($l1295, $l4, { clock: $l12 });
              continue e;
            }
            if ($l11.fallbackModel && $l1271 === "useFallbackModel") throw $m_$K($l620, $l26), $m_a("tengu_api_opus_fallback_triggered", { original_model: $m_wt($l11.model), fallback_model: $m_wt($l11.fallbackModel), provider: $m_kT(), source: $m_b("mid_stream") }), $m_f("api_request", "api_request_fallback_triggered"), new $m_YO($l11.model, $l11.fallbackModel, "overloaded", $l1242);
          }
        }
        if ($l1271 === "fail") throw $m_t(`Error streaming (non-streaming fallback disabled): ${$m_d($l1264)}`, { level: "error" }), $m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $l1265, attemptNumber: $l462, maxOutputTokens: $l638, thinkingType: $m_c($l35.type), fallback_disabled: true, request_id: $m_Yg($l465), fallback_cause: $m_c($l1257), error_name: $l1260, error_constructor: $l1261, error_code: $l1262, any_stream_event_yielded: $l1119 }), $l636 = true, $l652 = $l1033, $l1264;
        if (!$l1121) $m_$K($l620, $l26);
        if ($m_t(`Error streaming, falling back to non-streaming mode: ${$m_d($l1264)}`, { level: "error" }), $l635 = true, $l626) $m_$ln("non_streaming");
        if ($l363 !== void 0) $l289();
        $l291 = $l12.now();
        {
          let $l1296 = await $l329?.onStreamFallback($l236, $l465 ?? void 0);
          if ($l1296) $l236 = $l255($l1296.messages, "microcompact"), $l955($l1296.clearedIds, $l1296.clearedContent);
        }
        if ($m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $l1265, attemptNumber: $l462, maxOutputTokens: $l638, thinkingType: $m_c($l35.type), fallback_disabled: false, request_id: $m_Yg($l465), fallback_cause: $m_c($l1257), error_name: $l1260, error_constructor: $l1261, error_code: $l1262, any_stream_event_yielded: $l1119 }), $m_Y("info", "cli_nonstreaming_fallback_started"), $m_a("tengu_nonstreaming_fallback_started", { request_id: $m_Yg($l465), model: $m_wt($l11.model), fallback_cause: $m_c($l1257) }), $l522("attempt_errored", $l465 ?? null, null), $l481 = $l465, $l465 = null, yield* $l1131({ responseUnfinished: true }), yield* $l958(), yield { type: "streaming_fallback_began", cause: $l1257 }, yield* $l959({ requestId: $m_uke($l481), analyticsRequestId: $m_Yg($l481), cause: $l1257, errorName: $l1258, connectionCode: $l1259, stall: $l1245 }, $l1266 && ($l1270?.outlastedNonStreamingTimeout ?? false))) return;
      } finally {
        if ($l1010(), $l1150?.($l623, $l1016?.chunks), $l467 !== void 0) $m_T1e($l467);
      }
      $l522("stream_completed", $l465 ?? null, $l631 !== null ? $l292 : null), yield* $l1131({ responseUnfinished: false });
      break e;
    }
    if ($l343?.settle({ kind: "ok" }, $l465, $l363?.id), $l653 !== void 0) $l653.ended = "completed";
  } catch ($l1297) {
    if (yield* $l958(), $l522($l4.aborted ? "aborted" : "attempt_errored", $l465 ?? null, null), $l1297 instanceof $m_YO) throw $l656.reportHttpFailure($l1297.originalError, "useFallbackModel", { fallbackModelCouldHelp: $l1297.reason !== "overloaded" }), $l343?.settle({ kind: "error", error: $l1297 }, $l465), $l1297;
    let $l1298 = $l1297 instanceof $m_$c ? $l1297.originalError : void 0, $l1299 = ($l1298 === void 0 ? "fail" : $l656.onWithRetryGaveUp($l1298)) === "retryWithoutStreaming", $l1300 = $l1297, $l1301 = false;
    if ($l1299) {
      let $l1302 = ($l1298 instanceof $m_Mt ? $l1298.requestID : void 0) ?? "unknown";
      if ($m_t("Streaming endpoint returned 404, falling back to non-streaming mode", { level: "warn" }), $l635 = true, $l291 = $l12.now(), $l329?.strip(), $m_a("tengu_streaming_fallback_to_non_streaming", { model: $m_wt($l11.model), error: $m_b("404_stream_creation"), attemptNumber: $l462, maxOutputTokens: $l638, thinkingType: $m_c($l35.type), request_id: $m_Yg($l1302), fallback_cause: $m_b("404_stream_creation"), any_stream_event_yielded: false }), $m_Y("info", "cli_nonstreaming_fallback_started"), $m_a("tengu_nonstreaming_fallback_started", { request_id: $m_ye($l1302), model: $m_wt($l11.model), fallback_cause: $m_b("404_stream_creation") }), $l626) $m_$ln("non_streaming");
      yield { type: "streaming_fallback_began", cause: "404_stream_creation" };
      try {
        if ($l481 = $l465 ?? ($l1302 !== "unknown" ? $l1302 : null), yield* $l959({ requestId: $m_uke($l1302), analyticsRequestId: $m_Yg($l1302), cause: "404_stream_creation", errorName: null, connectionCode: null, stall: null }, false)) return;
        if ($l1301 = true, $l653 !== void 0) $l653.ended = "completed";
      } catch ($l1303) {
        if ($l1303 instanceof $m_YO) throw $l343?.settle({ kind: "error", error: $l1303 }, $l465), $l1303;
        $l1300 = $l1303;
      }
    }
    if (!$l1301) {
      if ($l69 && ($l1300 instanceof $m_cee || $l11.toolSearchRefusal !== void 0)) $m_cto($l28);
      if ($l1300 instanceof $m_cee) throw $l159?.splice(0, $l159.length), $l1300;
      $m_t(`${$l1299 ? "Non-streaming fallback also failed" : "Error in API request"}: ${$m_d($l1300)}`, { level: "error" });
      let $l1304 = $l1300, $l1305 = $l11.model;
      if ($l1300 instanceof $m_$c) $l1304 = $l1300.originalError, $l1305 = $l1300.retryContext.model;
      if ($l1304 instanceof $m_sf) {
        $l343?.settle({ kind: "aborted" }, $l1299 ? null : $l465, $l1299 ? void 0 : $l363?.id), $l503();
        return;
      }
      if ($l653 !== void 0 && $m_PM($l1304)) $l653.ended = "filtered_again";
      if ($l1304 instanceof $m_Mt) $m_A6n($l1304, $m_Umn($l11), $l12.now(), $l322, $l11.storageV5);
      let $l1306 = $l465 || ($l1304 instanceof $m_Mt ? $m_M2e($l1304.requestID || $l1304.error?.request_id, $l1304.headers) : void 0);
      $l343?.settle({ kind: "error", error: $l1304 }, $l1306), $m_Iun({ isLowPriority: $l491, dispatch: $l658, error: $l1304, model: $l1305, messageCount: $l236.length, messageTokens: $m_wre($l236), durationMs: Math.max(0, Math.round($l12.monotonicNow() - $l461)), durationMsIncludingRetries: Math.max(0, Math.round($l12.monotonicNow() - $l460)), attempt: $l462, requestId: $l1306, clientRequestId: $l488, didFallBackToNonStreaming: $l635, nonStreamingFallbackSkipped: $l636, observedResponse: $l635 ? void 0 : $l494, queryTracking: $l11.queryTracking, querySource: $l11.querySource, accountMemoryKeys: $l458, messageClientPlatform: $l11.messageClientPlatform, llmSpan: $l459, fastMode: $l642, previousRequestId: $l19, effort: $l303, agentContext: $l11.agentContext, attribution: $m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), modelCallNames: $l11.modelCallNames, promptTooLongIsHandled: $l11.promptTooLongIsHandled });
      let $l1307 = { ...$m_oJ($l1304, $l1305, { messages: $l0, messagesForAPI: $l236, requestId: $l1306 }), perTurnEffort: $l331, perTurnTiming: $l332, ...$l652 && { streamWatchdogGaveUp: true }, ...($m_K8e($l1304) || $m_YYe($l1304) || $m_Jwn($l1304) || $l1304 instanceof $m_Mt && $l1304.type === "billing_error") && { resendCannotCure: true } };
      if ($m_E8($l1304) && !$l656.outOfApiAttempts()) return $l1307;
      yield $l1307, $l503();
      return;
    }
  } finally {
    if ($l191) $m_OEt($l317, $l632, Date.now());
    if ($m_$I("api_call", $l1009), $l400(), $m_C4o($l11.querySource, $l11.agentId), $l651) $l11.onRetryStatus?.(null);
    if ($l653 !== void 0) $m_Imn($l653, { now: $l12.monotonicNow(), stopReason: $l637?.message.stop_reason ?? $l631, aborted: $l4.aborted, model: $l11.model, querySource: $l11.querySource, clientRequestId: $l635 ? void 0 : $l488 });
    if ($l522($l4.aborted ? "aborted" : "attempt_errored", $l465 ?? null, null), $l343?.settle($l631 !== null && $l465 ? { kind: "ok" } : $l4.aborted ? { kind: "aborted" } : { kind: "other_exit" }, $l465, $l363?.id), $l503(), $l637) {
      let $l1308 = $l637.message.usage;
      if ($l292 = $m_mAe($m_Pm, $l1308), $l631 = $l637.message.stop_reason, $l631 === "refusal") $m_JZ({ model: $l26, requestId: $l465 || void 0, querySource: $l11.querySource, effort: $l303, fastMode: $l642, attempt: $l462, attribution: $m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), serverFallbackHop: false, stopDetails: $l637.message.stop_details ?? null, agentContext: $l11.agentContext });
      let $l1309 = $l673?.servedFallbackModel, $l1310 = $l1309 !== void 0;
      if (!$l671) $m__no($m_Wn($l11.model), $l637.message.model);
      let $l1311 = $l1310 && $l673 !== void 0 ? $m_CXe($l673.entries, { speed: $l292.speed, inferenceGeo: $l292.inference_geo, serverToolUse: $l292.server_tool_use }, $l631) : $m_Cxe($l26, $l292);
      $l630 += $m_$7e($l1311, $l292, $l1310 ? $m_SYn($l11.serverRefusalFallback?.model, $l1309) : $l11.model, $l11.querySource, $l303, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool);
    }
    if ($l363 !== void 0 || $l637 !== void 0) $l289();
  }
  if ($l465 && $l191) $m_wds($l465);
  if ($l191) $m_SBe($m_AM($l292));
  if ($l192) $m_Xmn($l193, () => {
    let $l1312 = $l9(), $l1313 = $m_AM($l292);
    return Number.isFinite($l1312) ? Math.max($l1312 + $l292.output_tokens, $l1313) : $l1313 || $l1312;
  });
  if ($m_a9t($l28, { isMainConversation: $l191 }), $l772(), $l731.served(), $l313() && $l641) $m_mni($l641, { requestId: $l465, previousMessageId: $l25, model: $l11.model, is1hCacheTTL: $l286 === "1h", querySource: $l11.querySource, queryDepth: $l11.queryTracking?.depth });
  let $l1314 = $l236.length, $l1315 = $m_wre($l236), $l1316 = $m_C_() ? void 0 : $m_Dun($l236, $l11.model), $l1317 = $m_C_() ? void 0 : $m_adn($l293, $l296, $m_Qmr($l3, $l295)), $l1318 = $l191 ? $m_Nds() : void 0;
  $l11.getToolPermissionContext().then(($l1319) => {
    $m_Lun({ isLowPriority: $l491, dispatch: $l658, uncoveredTail: $l266, model: $l620[0]?.message.model ?? $l363?.model ?? $l11.model, preNormalizedModel: $l11.model, usage: $l292, start: $l461, startIncludingRetries: $l460, attempt: $l462, messageCount: $l1314, messageTokens: $l1315, requestId: $l465 ?? null, rawRequestBodyId: $l482, accountMemoryKeys: $l458, clientRequestId: $l635 ? void 0 : $l488, firstAttemptRequestId: $l481 ?? null, stopReason: $l631, ttftMs: $l621, firstContentMs: $l635 ? null : $l622 ?? null, streamEventCount: $l635 ? void 0 : $l623, queryOverheadMs: $l627, didFallBackToNonStreaming: $l635, querySource: $l11.querySource, promptCacheTtl: $l282 ? $l284 : void 0, promptCacheMessagesTtl: $l282 && !$l11.skipMessageCacheMarkers && $l287 ? "5m" : void 0, messageClientPlatform: $l11.messageClientPlatform, headers: $l639, extraEventFields: { ...{}, ...$m_d9t($l28) }, costUSD: $l630, isDefaultModel: $l191 ? $l11.isDefaultModel : void 0, defaultModel: $l191 ? $l11.defaultModel : void 0, ...$l196($l330), carriedEffort: $l189, carriedEffortEnded: $l1318, queryTracking: $l11.queryTracking, permissionMode: $l1319.mode, proactivityLevel: $l11.proactivityLevel, newMessages: $l620, requestContentTelemetry: $l1316, requestPrefixTelemetry: $l1317 && { ...$l1317, systemPromptSource: $m_le($l11.systemPromptSource), snapshotHash: $l11.systemPromptSnapshotHash }, llmSpan: $l459, globalCacheStrategy: $l127, requestSetupMs: $l461 - $l460, attemptStartTimes: $l463, fastMode: $l642, previousRequestId: $l19, betas: $l345, thinkingPrefixMismatchBehavior: $l506, echoWireToolInputs: $l50, effort: $l330, turnOrigin: $l194, agentContext: $l11.agentContext, attribution: $m_hpe($l11.querySource, $l11.spawnedBySkill, $l11.activeSkill, $l11.activeMcpServer, $l11.activeMcpTool), modelCallNames: $l11.modelCallNames });
  }).catch(($l1320) => $m_l($m_Xe($m_N($l1320), "api success logging failed"))), $l503();
}
;
