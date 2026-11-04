async function SELF({ agentInput: $l0, toolUseContext: $l1, canUseTool: $l2, assistantMessage: $l3, onProgress: $l4, timing: $l5, enclosingToolUseId: $l6 }) {
  let { subagent_type: $l7, run_in_background: $l8, name: $l9, isolation: $l10 } = $l0, { prompt: $l11, description: $l12, cwd: $l13, effort: $l14 } = $l0, $l15 = $l0.model, $l16 = $m_NQe() && ($l14 === "lower" || $l14 === "higher") ? $l14 : void 0, $l17 = $l14 === "lower" || $l14 === "higher" ? void 0 : $l14, $l18 = Date.now();
  if ($m_Oa() && $m_i.CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL) $l15 = void 0;
  let $l19 = $l15, $l20 = $l11, $l21 = $l12, $l22 = $l13;
  await $m_qn($l22, "the call");
  let $l23 = $m_yp($l1.agentContext), $l24 = $m_Zk();
  if ($l23 >= $l24) throw $m_m("subagent_launch", "subagent_depth_cap"), $m_DXe.of($l1.session).recordRefused("depth_limit"), new $m_j(`Subagent nesting limit reached (depth ${$l23} of ${$l24}). Complete this task directly using your tools instead of spawning another agent. If the user explicitly requested deeper nesting, ask them to raise CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH.`);
  if ($l1.agentId !== void 0 && $m_Q1($l1.agentId)) throw $m_m("subagent_launch", "subagent_spawner_stop_pending"), new $m_j("This agent has been stopped and its stop is still completing; it cannot launch new agents.");
  let $l25 = $m_qAr($l1) ? $l1.toolState.get($m_bNn).take($l1.toolUseId) : void 0;
  if ($l25 !== void 0) {
    let $l26 = await $m_jn($l25, $l1);
    return $l26.status === "async_launched" ? { data: { ...$l26, isAsync: true, prompt: $l0.prompt, canReadOutputFile: $m_qO($l1.options.tools), canContinueAgent: $m_Ev($l1.options.tools) } } : { data: { status: "completed", prompt: $l0.prompt, ...$l26.report, canContinueAgent: $m_Ev($l1.options.tools) } };
  }
  $l21 = $l21.replace(/\s+/g, " ").trim();
  let $l27 = $l1.getAppState(), $l28 = $m_ae($l1), $l29 = $l28.mode, { taskRegistry: $l30 } = $l1, $l31 = $m_Uo() ? $l27.teamContext : void 0, $l32 = !!$l1.teammateContext;
  if (($l32 || !!$m_qM()) && $l9 && !$m_tH()) throw $m_m("subagent_launch", "subagent_nested_teammate"), new $m_j("Teammates cannot spawn other teammates \u2014 the team roster is flat. To spawn a subagent instead, omit the `name` parameter.");
  if ($l32 && $l8 === true) throw $m_m("subagent_launch", "subagent_teammate_background_denied"), new $m_j("In-process teammates cannot spawn background agents. Use run_in_background=false for synchronous subagents.");
  let { activeAgents: $l33, allowedAgentTypes: $l34 } = $l1.options.agentDefinitions, $l35 = $l7 !== void 0 && $m_bCe($l7) === $m_SC, { available: $l36, denyRule: $l37 } = $m_Jn($l33, $l34, $l28);
  if ($l35 && $l37) throw $m_m("subagent_launch", "subagent_type_denied"), new $m_se(`Agent type '${$m_SC}' has been denied by permission rule '${$m_pt}(${$m_SC})' from ${$l37.source}.`);
  let $l38 = $l35 && $l36;
  if ($l7 !== void 0 && !$l35) {
    let $l39 = $m_Q9($l28, $m_pt, $l7);
    if ($l39) throw $m_m("subagent_launch", "subagent_type_denied"), new $m_se(`Agent type '${$l7}' has been denied by permission rule '${$m_pt}(${$l7})' from ${$l39.source}.`);
    if ($l34 && !$l34.includes($l7)) {
      $m_m("subagent_launch", "subagent_type_not_found");
      let $l40 = (await $m_mye($l33, $l34, $l28, $l1)).map(($l41) => $l41.agentType);
      throw new $m_se(`Agent type '${$l7}' not found. Available agents: ${$m_ht($l40)}`);
    }
  }
  let $l42 = ($l43 = false) => {
    if ($l1.abortController.signal.aborted) {
      let $l44 = $m_xi($l1.abortController.signal.reason);
      if (!($l43 && $l44 === "interrupt")) throw new $m_qe();
    }
    let { maxBudgetUsd: $l45 } = $l1.options;
    if ($m_p0($l45)) throw $m_m("subagent_launch", "subagent_budget_exhausted"), $m_DXe.of($l1.session).recordRefused("budget"), new $m_j(`Budget limit reached ($${$m_kTe().toFixed(2)} spent of the $${$l45} maximum). New agents cannot be started. Complete the remaining work directly with your tools, or wrap up with the results you already have.`);
  }, $l46 = async () => {
    let $l47 = $m_Hn($l1);
    if ($l47) throw await $l48(), $l47;
    return $l1.taskRegistry.takeConcurrencySlot();
  };
  if ($l31 && $l9 && !$l38 && !$m_K8($l7, $l33) && !$l10 && !$l22 && !$m_tH()) {
    let $l49 = await $m_mye($l33, $l34, $l28, $l1), $l50 = $l7 ? $m_Kn($l33, $l49, $l7) : void 0;
    if ($l50 && $l50.agentType !== $l7) {
      let $l51 = $m_Q9($l28, $m_pt, $l50.agentType);
      if ($l51) throw $m_m("subagent_launch", "subagent_type_denied"), new $m_se(`Agent type '${$l50.agentType}' has been denied by permission rule '${$m_pt}(${$l50.agentType})' from ${$l51.source}.`);
    }
    let $l52 = $l50 ?? ($l7 ? $m_Kn($l33, $l33, $l7) : void 0);
    if (!($l52 === void 0 || (await $m_rHr([$l52], $l1)).length === 1)) throw $m_m("subagent_launch", "subagent_teammate_not_offered"), new $m_se(`Agent type '${$l7}' is not offered in this session.`);
    let $l53 = $l50 ? await $m_ece($l50, $l1.abortController.signal) : void 0;
    if ($l50 && !$l53) throw $m_m("subagent_launch", "subagent_plugin_load_failed"), new $m_se(`Agent type '${$l50.agentType}' could not be loaded from its plugin.`);
    $l42($m_To);
    let $l54 = $m_nc($l1), $l55 = $l53 ?? $m_xEr($l7), $l56 = await $m_eSo({ tool_use_id: $l1.toolUseId ?? "", prompt: $l20, description: $l21, agent: $l55, agents: $l49, model: $l15, parentModel: $l54, parentAgentId: $l1.agentId, permissionMode: $l29, background: true, fork: false, isTeammate: true, name: $l9, cwd: void 0, signal: $l1.abortController.signal, origin: $l1.hookOrigin });
    using $l57 = $l56.starting;
    if ($l56.deny !== void 0) throw $m_m("subagent_launch", "subagent_spawn_denied_by_hook"), new $m_j(`Subagent spawn denied by a plugin: ${$l56.deny}`);
    $m_J0r({ toolUseContext: $l1 }, $l56.isRewritten);
    let $l58 = $l56.spawn, $l59 = await $m_$n({ tool: $m_j7t, raised: $m_qt($l0, { prompt: $l20, description: $l21, subagentType: $l55.agentType, model: $l15, background: true, cwd: void 0 }), rewritten: $m_qt($l0, $l58), context: $l1 });
    if ($l59) throw $m_m("subagent_launch", "subagent_spawn_hook_rewrite_ruled"), new $m_j(`A plugin's agent.spawn hook rewrote this spawn into one a permission rule ${$m_Bn[$l59.behavior]}: ${$l59.message} Dispatch it directly.`);
    let $l60 = $l49.find(($l61) => $l61 === $l56.agent && $l61 !== $l55);
    if ($m_K8($l60?.agentType, $l33)) throw $m_m("subagent_launch", "subagent_spawn_hook_teammate_rewrite"), new $m_j(`A plugin's agent.spawn hook retyped a teammate into '${$l60?.agentType}', which does not run as a teammate.`);
    if ($l60) {
      if ($l53 = await $m_ece($l60, $l1.abortController.signal), !$l53) throw $m_m("subagent_launch", "subagent_plugin_load_failed"), new $m_se(`Agent type '${$l60.agentType}' could not be loaded from its plugin.`);
      let $l62 = $m_Nn($l53, [...$l1.getAppState().mcp.tools, ...$l1.options.tools.filter($m_mh)]);
      if ($l62.length > 0) throw $m_m("subagent_launch", "subagent_mcp_required_missing"), $m_rN(new $m_j($m_Ln($l53.agentType, $l62)), { kind: "mcp_required_missing", servers: $l62 });
    }
    $l20 = $l58.prompt, $l21 = $l58.description.replace(/\s+/g, " ").trim();
    let $l63 = $l58.model, $l64 = $l53?.agentType ?? $l7;
    if ($l42($m__o), $l53?.color) $m_jSt($l60 ? $l53.agentType : $l7 ?? $l53.agentType, $l53.color);
    let { spawnTeammate: $l65 } = require("./chunk-cne5hsvz.js"), $l66 = await $l65({ name: $l9, prompt: $l20, description: $l21, use_splitpane: true, plan_mode_required: $l29 === "plan", model: $l63 ?? $m_Qo($l53, $m_nc($l1)), modelSource: $l63 ? "tool" : "frontmatter", agent_type: $l64, agentDefinition: $l53, invokingRequestId: $l3?.requestId }, $l1, $l4), $l67 = { status: "teammate_spawned", prompt: $l20, agentId: $l66.data.agent_id, resolvedModel: $m_Bt($l66.data.model ?? $l54), ...$l66.data }, $l68 = $l66.loopAgentId ?? $l66.data.teammate_id;
    return $m_KMo($l68, $l1), $l57?.started({ agentId: $l68, model: $m_Bt($l66.data.model ?? $l54), teammateId: $l66.data.teammate_id }), $m_g("subagent_launch"), { data: $l67 };
  }
  let $l69 = { isolation: $l10, querySource: $l1.options.querySource, messages: $l1.messages }, $l70, $l71 = [];
  if ($l38) {
    let $l72 = $m_Yn($l69);
    if ($l72) throw $m_m("subagent_launch", $l72.code), new $m_j($l72.message);
    $l70 = $m_uV;
  } else {
    let $l73 = await $m_mye($l33, $l34, $l28, $l1);
    $l71 = $l73;
    let $l74 = $l73.map(($l75) => $l75.agentType);
    if ($l7 === void 0 && !$m_Zn($l33, $l34)) {
      $m_a("tengu_subagent_type_miss", { requestedNormalized: $m_b("OMITTED"), availableCount: $l73.length }), $m_m("subagent_launch", "subagent_type_missing");
      let $l76 = $l36 && $m_Yn($l69) === null ? [$m_SC, ...$l74] : $l74;
      throw new $m_se(`${$m_Nnr}. Available agents: ${$m_ht($l76)}`);
    }
    let $l77 = $l7 ?? $m_fV.agentType, $l78 = $l73.find(($l79) => $l79.agentType === $l77);
    if (!$l78) {
      let $l80 = $m_bCe($l77), $l81 = new Set($l74), $l82 = $l80 ? $l33.filter(($l83) => $m_bCe($l83.agentType) === $l80) : [], $l84 = $m_ine($l80, $l82.length > 0 && $l82.every($m_Hl)), $l85 = $l80.length;
      if ($l82.length > 1) {
        $m_a("tengu_subagent_type_miss", { requestedNormalized: $l84, requestedLength: $l85, availableCount: $l73.length, ambiguousCount: $l82.length }), $m_m("subagent_launch", "subagent_type_ambiguous");
        let $l86 = $l82.map(($l87) => $l87.agentType).filter(($l88) => $l81.has($l88));
        throw new $m_se(`Agent type '${$l77}' is ambiguous \u2014 matches ${$l82.map(($l89) => $l81.has($l89.agentType) ? $l89.agentType : `${$l89.agentType} (unavailable)`).join(", ")}. ${$l86.length > 0 ? `Use the exact name: ${$l86.join(" or ")}` : `None of these are available. Available agents: ${$m_ht($l74)}`}`);
      }
      if ($l82.length === 1) {
        let $l90 = $l82[0];
        if ($l81.has($l90.agentType)) {
          if ($l78 = $l90, $l78.color) $m_jSt($l77, $l78.color);
          $m_a("tengu_subagent_type_normalized", { requestedNormalized: $l84, matched: $m_qme($l78) });
        } else {
          let $l91 = $l90.agentType, $l92 = $m_Q9($l28, $m_pt, $l91);
          if ($l92) throw $m_m("subagent_launch", "subagent_type_denied"), new $m_se(`Agent type '${$l91}' has been denied by permission rule '${$m_pt}(${$l91})' from ${$l92.source}.`);
          if ($m_ZQe($l90, $l28)) throw $m_m("subagent_launch", "subagent_type_tools_denied"), new $m_se($m_e7e($l91));
        }
      }
      if (!$l78) throw $m_a("tengu_subagent_type_miss", { requestedNormalized: $l84, requestedLength: $l85, availableCount: $l73.length }), $m_m("subagent_launch", "subagent_type_not_found"), new $m_se(`Agent type '${$l77}' not found. Available agents: ${$m_ht($l74)}`);
    }
    let $l93 = await $m_ece($l78, $l1.abortController.signal);
    if ($l93 === void 0) throw $m_m("subagent_launch", "subagent_plugin_load_failed"), new $m_se(`Agent type '${$l77}' could not be loaded from its plugin.`);
    $l70 = $l93;
  }
  if ($l32 && $l70.background === true) throw $m_m("subagent_launch", "subagent_teammate_background_denied"), new $m_j(`In-process teammates cannot spawn background agents. Agent '${$l70.agentType}' has background: true in its definition.`);
  if (($l10 ?? $l70.isolation) === "worktree" && !$m_dE($l70)) {
    if ($m_fln("agent worktree"), !$m_yze()) $m_w0r();
  }
  let $l94 = $m_Oa(), $l95 = $m_Zde(), $l96 = $l95 && $l1.agentId !== void 0 && !$l1.innerCall && !$l32 && $m_be(), $l97 = $l95 && $m_Mht() && !$l32 && !$l96, $l98 = $m_yq(), $l99 = $m_uyt(), $l100 = $m_pSn(), $l101 = $l99 !== void 0 && ($l8 === true || $l100 && $l8 !== false) && !$m_Ekt() ? $m_Rn($l3, $l1.toolUseId, $l100) : void 0, $l102 = $l99 !== void 0 && $l101 !== void 0 ? $m_e4n($l99, { toolUseId: $l101, callerAgentId: $l1.agentId, signal: $l1.abortController.signal }) : void 0, $l103 = $l99 === void 0 ? $l98 : $l102 === void 0, $l104 = $m_UAr($l99, $l98), $l105 = ($l106, $l107) => $m_So({ agent: $l106, wantsBackground: $l107, isolation: $l10, restricted: $l28.restricted, isCoordinator: $l94, forceAsync: $l97, callerIsInProcessTeammate: $l32, callerIsHeadlessSubagent: $l96, backgroundTasksDisabled: $l103 }), { effectiveIsolation: $l108, isRemoteLaunch: $l109, shouldRunAsync: $l110 } = $l105($l70, $l8);
  if (!$l109) {
    if ($l1.abortController.signal.aborted) {
      let $l111 = $m_xi($l1.abortController.signal.reason);
      if (!($l110 && $l111 === "interrupt")) throw new $m_qe();
    }
    let $l112 = $m_Hn($l1);
    if ($l112) throw $l112;
  }
  $l42($l110 && !$l109);
  let $l113 = $l70.requiredMcpServers, $l114 = $l1.options.tools.filter($m_mh), $l115 = () => $l1.getAppState().mcp, $l116 = $l5?.mark("external");
  if ($l113?.length) {
    let $l117 = ($l118) => $l113.some(($l119) => $l118.name.toLowerCase().includes($l119.toLowerCase()));
    await $m_Wzr($l115, ($l120, $l121) => $l117($l120) && $m_jzr($l120, $l121.tools), { maxWaitMs: 3e4, until: ($l122) => $l122.clients.some(($l123) => $l123.type === "failed" && $l117($l123)) });
  }
  if (!$l109) await $m_Ctt($l115);
  $l116?.();
  let $l124 = $l1.getAppState();
  if ($l113?.length) {
    let $l125 = [];
    for (let $l126 of $l124.mcp.tools.concat($l114)) {
      let $l127 = $m_Bet($l126);
      if ($l127 && !$l125.includes($l127)) $l125.push($l127);
    }
    if (!$m_jHr($l70, $l125)) {
      let $l128 = $l113.filter(($l129) => !$l125.some(($l130) => $l130.toLowerCase().includes($l129.toLowerCase())));
      throw $m_m("subagent_launch", "subagent_mcp_required_missing"), $m_rN(new $m_j(`Agent '${$l70.agentType}' requires MCP servers matching: ${$l128.join(", ")}. MCP servers with tools: ${$l125.length > 0 ? $l125.join(", ") : "none"}. Use /mcp to configure and authenticate the required MCP servers.`), { kind: "mcp_required_missing", servers: $l128 });
    }
  }
  if ($l70.color) $m_jSt($l70.agentType, $l70.color);
  let $l131 = $m_nc($l1), $l132 = await $m_eSo({ tool_use_id: $l1.toolUseId ?? "", prompt: $l20, description: $l21, agent: $l70, agents: $l71, model: $l38 ? void 0 : $l19, parentModel: $l131, parentAgentId: $l1.agentId, permissionMode: $l29, background: $l110, fork: $l38, name: $l9, cwd: $l22, signal: $l1.abortController.signal, origin: $l1.hookOrigin });
  using $l133 = $l132.starting;
  if ($m_dHr($l1.abortController.signal, $l110 && !$l109)) throw new $m_qe();
  if ($l132.deny !== void 0) throw $m_m("subagent_launch", "subagent_spawn_denied_by_hook"), new $m_j(`Subagent spawn denied by a plugin: ${$l132.deny}`);
  $m_J0r({ toolUseContext: $l1 }, $l132.isRewritten);
  let $l134 = () => $m_qt($l0, { prompt: $l20, description: $l21, subagentType: $l70.agentType, model: $l38 ? void 0 : $l19, background: $l110, cwd: $l22 }), $l135 = $l134(), { spawn: $l136 } = $l132, $l137 = $l132.agent !== $l70, $l138 = $l137 || $l136.background !== $l110;
  if ($l70 = $l132.agent, $l20 = $l136.prompt, $l21 = $l136.description.replace(/\s+/g, " ").trim(), $l22 = $l136.cwd, $l22 !== $l13) await $m_qn($l22, "a hook");
  if ($l19 = $l136.model, $l138) ({ effectiveIsolation: $l108, isRemoteLaunch: $l109, shouldRunAsync: $l110 } = $l105($l70, $l136.background));
  if ($l137 && $m_Vt($l1)) throw $m_m("subagent_launch", "subagent_spawn_hook_retype_unreviewed"), new $m_j("A plugin's agent.spawn hook named another agent for a web-fetch dispatch admitted without classifier review; it cannot run unconfined. Dispatch that agent directly.");
  let $l139 = await $m_$n({ tool: $m_j7t, raised: $l135, rewritten: $l134(), context: $l1 });
  if ($l139) throw $m_m("subagent_launch", "subagent_spawn_hook_rewrite_ruled"), new $m_j(`A plugin's agent.spawn hook rewrote this spawn into one a permission rule ${$m_Bn[$l139.behavior]}: ${$l139.message} Dispatch it directly.`);
  if ($l136.cwd !== void 0 && $l136.cwd !== $l13 && $l108 === "worktree") throw $m_m("subagent_launch", "subagent_spawn_hook_cwd_worktree"), new $m_j(`A plugin's agent.spawn hook set cwd on a spawn isolated in a worktree; cwd and isolation: "worktree" are mutually exclusive.`);
  if ($l138 && $m_dHr($l1.abortController.signal, $l110 && !$l109)) throw new $m_qe();
  if ($l138 && $l32 && $l110 && !$l109) throw $m_m("subagent_launch", "subagent_teammate_background_denied"), new $m_j("In-process teammates cannot spawn background agents; a plugin's agent.spawn hook backgrounded this one.");
  let $l140 = $l137 ? $m_Nn($l70, [...$l1.getAppState().mcp.tools, ...$l114]) : [];
  if ($l140.length > 0) throw $m_m("subagent_launch", "subagent_mcp_required_missing"), $m_rN(new $m_j($m_Ln($l70.agentType, $l140)), { kind: "mcp_required_missing", servers: $l140 });
  let $l141 = $l137 ? $l70.color : void 0;
  if ($l141) $m_jSt($l70.agentType, $l141);
  let $l142 = $l38 ? "inherit" : $l19, $l143 = $m_UG($m_ETe($l70, $l131), $l131, $l142, $l29);
  if (!$l38 && $l17 !== void 0) $l70 = { ...$l70, effort: $l17 };
  let $l144 = $l109 ? void 0 : $m_VAr({ agentDefinition: $l70, isFork: $l38, model: $l143, effortState: $l1.getAppState(), inheritedLayers: $l1.permissionLayers, recordedBudgetText: void 0 }), $l145 = $l16 !== void 0 && !$l38 && $l144?.subagentEffort !== void 0 ? $m_CKt($l143, $l144.subagentEffort, $l16 === "higher" ? 1 : -1) : void 0, $l146 = $l144 !== void 0 && $l145 !== void 0 ? { ...$l144, agentDefinition: { ...$l144.agentDefinition, effort: $l145 }, subagentEffort: $l145 } : $l144, $l147 = $l38 ? void 0 : $l145 ?? $l17;
  $l70 = $l146?.agentDefinition ?? $l70;
  let $l148 = $m_qme($l70);
  $l1.agentLifecycle.markTypeInvoked($l70.agentType);
  let $l149 = await $m_Ivt($l70, $l1.storageV5), $l150 = $l70.getSystemPrompt({ toolUseContext: $l1, primedAgentMemory: $l149 }), $l151 = $m_qTe($l70) ? $m_vd($l70.plugin) : void 0;
  if ($m_qTe($l70)) $m_bR($l70.plugin);
  let $l152 = $m_yp($l1.agentContext) + 1;
  if ($m_qTe($l70)) $m_d$($l70.plugin, "subagent", { kind: "agent", name: $l70.filename });
  let $l153 = () => ($m_a("tengu_agent_tool_selected", { agent_type: $l148, model: $m_wt($l143), source: $m_c($l70.source), color: $m_le($l70.color), is_built_in_agent: $m_Hl($l70), is_resume: false, is_async: $l110, is_fork: $l38, effort_param: $m_le($l16 ?? $l17), session_effort: $m_le($l146?.sessionEffort), subagent_effort: $m_le($l146?.subagentEffort), subagent_total_tokens_budget: $l146?.totalTokensBudget, subagent_budget_on_top_of_start: $l146?.totalTokensBudget === void 0 ? void 0 : $l146.isBudgetOnTopOfStart, agent_depth: $l152, agent_system_prompt_chars: $l150.length, ...$l151 && $m_w5($l151.name, $l151.marketplace) }), $m_DXe.of($l1.session).recordSpawn({ agentType: $l70.agentType, runInBackground: $l8, runsInBackground: $l110, depth: $l152 }));
  if ($l109) {
    if ($m_Xh()) throw $m_m("subagent_launch", "subagent_remote_personal_config"), new $m_yt($m_jo);
    let $l154 = await $m_yHe({ storageV5: $l1.storageV5, credentials: $l1.credentials });
    if (!$l154.eligible) {
      let $l155 = $l154.errors.map($m_JTe).join(`
`);
      $m_m("subagent_launch", "subagent_remote_ineligible");
      let $l156 = new $m_yt(`Cannot launch cloud agent:
${$l155}`);
      throw $l154.errors.some(($l157) => $l157.type === "not_logged_in" && $l157.message === void 0) ? $m_rN($l156, $m_Dkn(await $m_Eg($l1.credentials))) : $l156;
    }
    let $l158, $l159 = false, $l160 = await $m_m$({ initialMessage: $l20, source: "remote_agent", tags: [$m_Uwt], description: $l21, model: $l143, ...$m_WFn($m_YWs({ declaredMode: $l70.permissionMode, narrowOnly: $m_JVo($l70), parentMode: $l29, parentModeToHand: $m_t7($l29, $l27.proactivityLevel, $m_eH($l28)), model: $l143 }), $l27.proactivityLevel), branchName: await $m_qWs(), signal: $l1.abortController.signal, onBundleFail: ($l161) => {
      $l158 = $l161;
    }, onCreateFail: ($l162, $l163, $l164) => {
      $l158 = $l162, $l159 = $l163 === "no_access_token" || $l164?.status === 401;
    }, storageV5: $l1.storageV5, credentials: $l1.credentials });
    if (!$l160) {
      $m_m("subagent_launch", "subagent_remote_session_failed");
      let $l165 = new $m_yt($l158 ?? "Failed to create cloud session");
      throw $l159 ? $m_rN($l165, $m_Dkn(await $m_Eg($l1.credentials))) : $l165;
    }
    let { taskId: $l166, sessionId: $l167 } = $m_UGe({ remoteTaskType: "remote-agent", session: { id: $l160.id, title: $l160.title || $l21 }, command: $l20, context: $l1, toolUseId: $l1.toolUseId, permissionRelay: { canUseTool: $l2, toolUseContext: $l1, allowedToolNames: new Set($m_Ax($l70, $l1.options.tools, false, false, false, 0, $m__0($l1).mode).resolvedTools.map(($l168) => $l168.name)) } });
    $l153(), $m_a("tengu_agent_tool_remote_launched", { agent_type: $l148 }), $m_g("subagent_launch");
    let $l169 = { status: "remote_launched", taskId: $l166, sessionUrl: $m_QTe($l167), description: $l21, prompt: $l20, outputFile: $m_Au($l166) };
    return $l133?.started({ agentId: $l166, model: $l143 }), { data: $l169 };
  }
  let $l170, $l171, $l172, $l173;
  if ($l38) {
    if ($l1.renderedSystemPrompt) $l171 = $l1.renderedSystemPrompt;
    else {
      let $l174 = $l27.agent ? $l27.agentDefinitions.activeAgents.find(($l175) => $l175.agentType === $l27.agent) : void 0, $l176 = await $m_sI($l1.options.tools, $l1.options.mainLoopModel);
      $l171 = $m_XY({ mainThreadAgentDefinition: $l174, toolUseContext: $l1, customSystemPrompt: $l1.options.customSystemPrompt, defaultSystemPrompt: $l176, appendSystemPrompt: $l1.options.appendSystemPrompt });
    }
    $l172 = $m_UIo($l20, $l3, $l6 ?? $l1.toolUseId);
  } else {
    try {
      if ($l70.memory) $m_a("tengu_agent_memory_loaded", { ...false, scope: $m_c($l70.memory), source: $m_b("subagent") });
      $l170 = await $m_kln([$m_Hl($l70) ? $m_cHe($l150) : $l150], $l143, $l146?.totalTokensBudget);
    } catch ($l177) {
      $m_t(`Failed to get system prompt for agent ${$l70.agentType}: ${$m_d($l177)}`);
    }
    $l173 = $m_Wui($l1.messages, $m_SBs($l1)), $l172 = [...$l173.copies, $m_Ie({ content: $l20 })];
  }
  let $l178 = $m_qY($l1.agentId, $l30) ?? $m_et(), $l179 = { prompt: $l20, resolvedAgentModel: $l143, isBuiltInAgent: $m_Hl($l70), startTime: $l18, agentType: $l70.agentType, isAsync: $l110, agentDepth: $l152, source: $l70.source, pluginId: $l151, callerCanContinueAgents: $m_hyt($l1, $l178), persistedToolResultFiles: $m_dE($l70) ? $m_V7() : void 0 }, $l180 = $m_bpt($l1, $l28, $l1.getAppState().mcp.tools.concat($l114)), $l181 = $l1.agentId ?? $m_wQ, $l182 = $l70.observer ? $m_B1n({ observedDefinition: $l70, activeAgents: $l1.options.agentDefinitions.activeAgents, observedIsObserver: false }) : $m_TMs({ parentPairing: $m_Vpt($l1.session, $l181), spawnedDefinition: $l70, spawnedIsObserver: false }), $l183 = $l182?.inheritedArming ? { toolUseContext: $l182.inheritedArming.toolUseContext, canUseTool: $l182.inheritedArming.canUseTool, persistedArmingMode: $l182.inheritedArming.permissionMode, inheritedFromKey: $l181, inheritedFromPairing: $l182.inheritedArming.parentPairing } : { toolUseContext: $l1, canUseTool: $l2 }, $l184 = $m_W_(), $l185 = $l1.agentId, $l186 = $l1.agentContext !== void 0 && $l1.agentContext.agentType !== "main" && ($l1.agentContext.isBackgroundAgent ?? false), $l187 = $m_Ps($l1.agentContext), $l188 = $m_mze($l1.messages, $l1.agentContext), $l189 = null;
  if ($l108 === "worktree") {
    let $l190 = $l5?.mark("external");
    if ($l189 = await $m_i7e($m_Nyi($l184), { storageV5: $l1.storageV5, credentials: $l1.credentials }), $l190?.(), $l189.hookBased) {
      let $l191 = $l189.worktreePath;
      $l189.vettedRealPath = await $NEW_chunk_0tkmvwy0_js_Wo($l191).catch(($l192) => {
        $m_t(`Agent worktree ${$l191} could not be resolved after creation (${$m_d($l192)}); it will be kept at cleanup`, { level: "warn" });
        return;
      });
    }
    $m_mlr($l184);
  }
  if ($l38 && $l189) $l172.push($m_Ie({ content: $m_BIo($m_fe(), $l189.worktreePath) }));
  let $l193 = $m_QWs({ taskRegistry: $l30, selectedAgent: $l70, effectiveIsolation: $l108, cwd: $l22, parentCwd: $l1.session.project === null ? null : $m_fe(), parentAgentId: $l185 });
  if ($l193) $l172.push($m_Ie({ content: $m_JWs }));
  if ($l38 && $l146?.totalTokensBudget !== void 0) $l172.push($m_nn({ type: "total_tokens_reminder", text: $m_uln("padded-countdown", $l146.totalTokensBudget) }));
  let $l194 = $l193 && $m_yze(), { onToolPool: $l195, reviewTools: $l196 } = $m_nde($l1.options.tools), $l197 = { agentDefinition: $l70, promptMessages: $l172, turnPrompt: $l20, toolUseContext: $l1, canUseTool: $l2, name: $l9, isAsync: $l110, handbackOptIn: !$l38, handbackTool: $m_FAr, persistedToolResultFiles: $l179.persistedToolResultFiles, querySource: $l1.options.querySource ?? $m_tde($l70.agentType, $m_Hl($l70)), spawnedBySkill: $l1.options.spawnedBySkill ?? $l1.options.activeSkill, spawnedByForkedSkill: $l1.options.spawnedByForkedSkill, model: $l142, effort: $l147, ...$m_Vt($l1) && { spawnMode: $m_ft }, override: $l38 ? { systemPrompt: $l171, parentSystemPrompt: true } : $l170 && !$l189 && !$l22 ? { systemPrompt: $m_Qi($l170) } : void 0, availableTools: $l38 ? $l1.options.tools : $l180, assembleAvailableTools: ($l198) => $m_bpt($l1, $l28, $l198), onToolPool: $l195, forkContextMessages: $l38 ? $l1.messages : void 0, ...$l38 && { useExactTools: true }, totalTokensReminderBudget: $l146?.totalTokensBudget, isTotalTokensReminderBudgetOnTopOfStart: $l146?.isBudgetOnTopOfStart, worktreePath: $l189?.worktreePath, worktreeBranch: $l189?.worktreeBranch, cwd: $l22, description: $l21, preserveToolUseResults: !$m_be(), toolUseId: $l1.toolUseId, ...false, onMcpServersBlocked: ($l199, $l200) => $l4?.({ type: "notification", notification: { key: `agent-mcp-blocked-${$l184}`, text: `${$l70.agentType} agent MCP ${$m_O($l199.length, "server")} blocked by ${$l200}: ${$l199.join(", ")}`, priority: "medium", color: "warning", timeoutMs: 1e4 } }), onModelRestricted: ($l201, $l202) => $l4?.({ type: "notification", notification: { key: `agent-model-restricted-${$l70.agentType}-${$m_$b($l201)}`, text: `${$l70.agentType} agent: ${$m_Lv($l201, $l202)}`, priority: "medium", color: "warning", timeoutMs: 1e4 } }) }, $l203 = $l22 ?? $l189?.worktreePath, $l204 = $l203 ?? ($l1.agentWorktree !== void 0 ? $m_fe() : void 0), $l205 = $l1.session.withProject({ cwd: $l203 }), $l206 = $l205.project, $l48 = async () => {
    if (!$l189) return {};
    let { worktreePath: $l207, worktreeBranch: $l208, headCommit: $l209, baseChangeset: $l210, sessionDir: $l211, gitRoot: $l212, hookBased: $l213, vettedRealPath: $l214 } = $l189;
    if ($l189 = null, $l213 && ($l210 === void 0 || $l214 === void 0)) return $m_t(`Hook-based agent worktree kept at: ${$l207}`), { worktreePath: $l207 };
    if ($m_y4n($l30.get($l184))) return $m_t(`Agent worktree kept at ${$l207}: backgrounded owner awaits keepalive, resume pending`), { worktreePath: $l207, worktreeBranch: $l208 };
    if ($l209 || $l210 !== void 0) {
      let $l215 = ($l216) => $m_En($l30.all(), $l214 === void 0 ? [$l207] : [$l207, $l214], $l216), $l217 = () => $l215() ?? $l215(($l218) => $l218.id !== $l184 && $m_Gt($l218, $l30)), $l219 = $l217(), $l220 = $l209 ? await $m__ln($l207, $l209) : await $m_nze($l207, void 0, { hookBased: true, baseChangeset: $l210, sessionDir: $l211, vettedRealPath: $l214 }).then(($l221) => $l221.dirty || $l221.checkoutMoved === true), $l222 = $l219 ?? $l217();
      if ($l222) {
        if ($m_t(`Agent worktree ${$l207} is still the working directory of ${$l222.type} task ${$l222.id}; kept`), $m_a("tengu_agent_worktree_kept", { reason: $m_Xo($l222.status) ? $m_b("parked_task") : $m_b("live_task"), task_type: $m_c($l222.type), seen: $l219 ? $m_b("before_check") : $m_b("after_check"), changed: $l220 }), $l212) $m_On({ worktreePath: $l207, gitRoot: $l212, taskRegistry: $l30, findOccupant: $l215 });
        return { worktreePath: $l207, worktreeBranch: $l208 };
      }
      if (!$l220 && (await $m_dce($l207, $l208, $l212, $l213 ?? false, "agent_tool")).outcome === "removed") return $m_bSo({ agentId: $m_Rr($l184), removedWorktreePath: $l207, spawnMetadata: { agentType: $l70.agentType, ...$l70.agentType === $m_SC && { isFork: $m_Hl($l70) }, ...$l70.agentType === $m_Ib && { isBuiltIn: $m_Hl($l70) }, ...$l22 && { cwd: $l22 }, description: $l21, ...$l9 && { name: $l9 }, ...$l1.toolUseId && { toolUseId: $l1.toolUseId }, spawnDepth: $l152, ...$m_cCr($l110, $l1.options.isNonInteractiveSession), ...$l142 && { model: $l142 }, ...$l147 && { effort: $l147 } }, storageV5: $l1.storageV5 }).catch(($l223) => $m_t(`Failed to clear worktree metadata: ${$m_ZA($l223)}`)), {};
    }
    if ($l212) await $m_lce($l207, $l212);
    return $m_t(`Agent worktree kept at: ${$l207}`), { worktreePath: $l207, worktreeBranch: $l208 };
  };
  if ($l1.abortController.signal.aborted) {
    let $l224 = $m_xi($l1.abortController.signal.reason);
    if (!($l110 && $l224 === "interrupt")) throw await $l48(), new $m_qe();
  }
  if ($l206 === null && $m_vN()) throw $m_m("subagent_launch", "subagent_no_directory_in_cwd_scope"), new $m_j("A subagent cannot be started from here in this session. Do the task without a subagent.");
  let $l225 = await $l46();
  if ($l99 !== void 0 && $l110) {
    let $l226 = $l102 === void 0 ? { kind: "closed", message: $m_WLr($l100) } : $l102.confirm($l1.abortController.signal);
    if ($l226 !== void 0) {
      if ($l225(), await $l48(), $l226.kind === "aborted") throw new $m_qe();
      throw $m_m("subagent_launch", "subagent_background_launch_closed"), new $m_j($l226.message);
    }
  }
  let $l227 = $l153();
  $l179.spawnedSubagent = $l227;
  let $l228 = () => {
    if ($l173 !== void 0) $m_Gui({ agentId: $l184, deliveringLoop: $l1.agentId }, $l173);
  }, $l229 = async ($l230) => {
    try {
      return await $l230;
    } catch ($l231) {
      throw $l225(), $l231;
    }
  }, $l232 = $l102 !== void 0 && $l9 && $l9 !== $m_Ty ? $l1.getAppState().agentNameRegistry.get($l9) : void 0;
  if ($l9 && $l9 !== $m_Ty) $l1.agentLifecycle.registerName($l9, $m_Rr($l184));
  let $l233 = $l9 && $l9 !== $m_Ty ? $l9 : void 0;
  $m_Vn().agentSpawned.emit({ agentId: $l184, agentType: $l70.agentType, parentAgentId: $l185, taskRegistry: $l30 });
  let $l234 = $l142 === void 0 && !$m_qw($l1), $l235 = $l38 || $m_qw($l1) ? void 0 : $l142;
  if ($l110) {
    let $l236 = $l184, $l237 = $m_ice({ outputFileReadable: $m_qO($l1.options.tools), ownerCanContinueAgents: $l179.callerCanContinueAgents, agentId: $l236, ownerAgentId: $l178, parentAgentId: $l185, spawnDepth: $l152, launchedWithDefaults: $l234, launchModel: $l235, description: $l21, prompt: $l20, model: $l143, selectedAgent: $l70, taskRegistry: $l30, toolUseId: $l1.toolUseId, cwd: $l204, spawnedSubagent: $l227, sessionScratch: $l1.session.sessionScratch });
    if ($l102 !== void 0 && !$l102.handOver({ agentId: $l237.agentId, abortController: $l237.abortController })) {
      if ($m_rC($l237.agentId, $l30, "system", void 0, { lifecycleNotStarted: true }), $l225(), $m_KO($l237.agentId, $l30), $l9 && $l232 !== void 0) $l1.agentLifecycle.registerName($l9, $l232);
      throw await $l48(), $m_m("subagent_launch", "subagent_background_launch_not_taken"), new $m_j($m_WLr($l100));
    }
    if (!$m_be()) $m_rH($l178, `agent:${$l236}`, $l30);
    if ($m_tH() && !$m_be() && (!$l9 || $l9 === $m_Ty) && !$m_TKt.has($l70.agentType)) {
      let $l238 = $l1.agentLifecycle.allocateName($l70.agentType);
      $l1.agentLifecycle.registerName($l238, $m_Rr($l236)), $l233 = $l238;
    }
    if ($l182) await $l229($m_W1n({ observedKey: $l236, observedTaskId: $l236, observedName: $l233 ?? $l9 ?? $l70.agentType, observedAgentType: $l70.agentType, config: $l182, ...$l183 }));
    let $l239 = { agentId: $l236, parentAgentId: $l185, depth: $l152, ...$m_lst($l1) && { spawnedByMainThread: true }, parentSessionId: $m_wP(), agentType: "subagent", subagentName: $l70.agentType, displayName: $l233, isAsync: true, isBackgroundAgent: true, ...$l187 && { delegatedObservation: true }, isBuiltIn: $m_Hl($l70), ...$l38 && $m_cW($l1.agentContext) && { forkOfMainConversation: true }, invokingRequestId: $l3?.requestId, invocationKind: "spawn", invocationEmitted: false, parentPromptId: $l188, ...$m_uW($l1.agentContext) };
    $l179.agentContext = $l239, $m_GI($l239, () => $m_YRn($l206, () => $m_Pne({ taskId: $l237.agentId, abortController: $l237.abortController, makeStream: ($l240, $l241, $l242) => $m_Tx({ ...$l197, launchedWithDefaults: $l234, session: $l205, override: { ...$l197.override, agentId: $m_Rr($l237.agentId), agentContext: $l239, abortController: $l237.abortController }, onCacheSafeParams: $l240, onQueryProgress: $l241, onStreamTokenEstimate: $l242 }), metadata: $l179, description: $l21, toolUseContext: $l1, taskRegistry: $l30, agentIdForCleanup: $l236, reviewTools: $l196, enableSummarization: $m_mve() || ($l94 || $l97) && !$m_be(), getWorktreeResult: $l48, onRunSettled: $l225 }))), $l228(), $l133?.started({ agentId: $l237.agentId, model: $l143 });
    let $l243 = !$m_dE($l70) && $m_qO($l1.options.tools);
    return $m_g("subagent_launch"), { data: { isAsync: true, status: "async_launched", agentId: $l237.agentId, description: $l21, resolvedModel: $l143, prompt: $l20, outputFile: $l237.outputFile ?? "", canReadOutputFile: $l243, canContinueAgent: $m_Ev($l1.options.tools), ...$l194 && { sharesCwd: true } } };
  } else {
    let $l244 = $m_Rr($l184), $l245 = $m_LEe() || $m_uyt() !== void 0, $l246 = { agentId: $l244, parentAgentId: $l185, depth: $l152, ...$m_lst($l1) && { spawnedByMainThread: true }, parentSessionId: $m_wP(), agentType: "subagent", subagentName: $l70.agentType, displayName: $l233, isAsync: false, isBackgroundAgent: $l186, ...$l187 && { delegatedObservation: true }, isBuiltIn: $m_Hl($l70), ...$l38 && $m_cW($l1.agentContext) && { forkOfMainConversation: true }, invokingRequestId: $l3?.requestId, invocationKind: "spawn", invocationEmitted: false, parentPromptId: $l188, ...$m_uW($l1.agentContext) };
    $l179.agentContext = $l246;
    let $l247 = $m_GI($l246, () => $m_YRn($l206, async () => {
      let $l248 = Date.now(), $l249 = $l143, $l250 = $m_eBn([], $l143);
      if ($l172.length > 0) {
        let $l251 = $m_km($l172).find(($l252) => $l252.type === "user");
        if ($l251 && $l251.type === "user" && $l4) $l4({ type: "progress", toolUseID: `agent_${$l3.message.id}`, data: { message: $l251, type: "agent_progress", prompt: $l20, agentId: $l244, agentType: $l70.agentType, isBuiltIn: $m_Hl($l70), description: $l21, resolvedModel: $l249, modelsUsed: $l250 } });
      }
      let $l253 = $m_w4n({ outputFileReadable: $m_qO($l1.options.tools), ownerCanContinueAgents: $l179.callerCanContinueAgents, agentId: $l244, ownerAgentId: $l178, parentAgentId: $l185, spawnDepth: $l152, description: $l21, prompt: $l20, model: $l143, selectedAgent: $l70, taskRegistry: $l30, parentAbortController: $l1.abortController, toolUseId: $l1.toolUseId, ...$m_BAr($l99, $l104), isDirectCall: !$l1.innerCall && $l1.hookCaller === void 0, cwd: $l204, spawnedSubagent: $l227, ...$l245 && { launchedWithDefaults: $l234, launchModel: $l235 } }), { taskId: $l254, cancelAutoBackground: $l255, abortController: $l256, detachParentAbortRelay: $l257 } = $l253;
      if ($l182) await $l229($m_W1n({ observedKey: $l244, observedTaskId: $l244, observedName: $l9 ?? $l70.agentType, observedAgentType: $l70.agentType, config: $l182, ...$l183 }));
      let $l258 = { moved: false };
      $m_g("subagent_launch");
      let $l259 = [], $l260 = $l1.options.forwardSubagentText, $l261, $l262 = false, $l263 = ($l264) => {
        if ($l258.moved) return;
        if ($l264.type === "query_model_change") {
          $l249 = $l264.toModel, $l250 = $m_eBn($l250, $l264.toModel);
          return;
        }
        if ($l264.type === "spinner_mode") return;
        if ($l264.type !== "api_metrics" && $l264.type !== "set_in_progress_tool_use_ids") $l259.push($l264);
        if (!$l4) return;
        if ($l261 !== void 0 && !($l264.type === "system" && $l264.subtype === "api_error")) $l261 = void 0, $l4({ type: "progress", toolUseID: `agent_${$l3.message.id}`, data: { type: "agent_api_retry", resolved: true, agentId: $l244, agentType: $l70.agentType } });
        if ($l264.type === "api_metrics") {
          $l4($l264);
          return;
        }
        if ($l264.type === "set_in_progress_tool_use_ids") return;
        if ($l264.type === "progress" && ($l264.data.type === "bash_progress" || $l264.data.type === "powershell_progress")) $l4({ type: "progress", toolUseID: $l264.toolUseID, data: $l264.data });
        if ($l264.type === "system" && $l264.subtype === "api_error") {
          let $l265 = $m_sqn($l264.error), $l266 = `${$l264.source ?? "request_retry"}:${$l264.retryAttempt}:${$l264.maxRetries}:${$l265}`;
          if ($l266 !== $l261) $l261 = $l266, $l4({ type: "progress", toolUseID: `agent_${$l3.message.id}`, data: { type: "agent_api_retry", agentId: $l244, agentType: $l70.agentType, attempt: $l264.retryAttempt, maxRetries: $l264.maxRetries, retryDelayMs: $l264.retryInMs, errorStatus: $l264.error.status, errorCategory: $l265 } });
          return;
        }
        if ($m_xne($l264)) {
          if ($m__je($l1, $l264)) $l4($m_YUn($l264));
          return;
        }
        if ($l264.type !== "assistant" && $l264.type !== "user") return;
        if ($l264.type === "user" && $l264.isMeta && !$l262) return;
        if ($l264.type === "assistant") $l262 = true;
        if ($l264.type === "assistant") {
          let $l267 = $m_YVn($l264);
          if ($l267 > 0) $l4({ type: "response_length", op: "add", delta: $l267 });
        }
        for (let $l268 of $m_km([$l264])) {
          let $l269 = $l268.message.content[0];
          if (!$l260 && $l269.type !== "tool_use" && $l269.type !== "tool_result") continue;
          $l4({ type: "progress", toolUseID: `agent_${$l3.message.id}`, data: { message: $l268, type: "agent_progress", prompt: "", agentId: $l244, agentType: $l70.agentType, isBuiltIn: $m_Hl($l70), description: $l21, resolvedModel: $l249, modelsUsed: $l250 } });
        }
      }, $l270 = $l98 ? void 0 : setTimeout(($l271) => {
        if ($l271.toolUseId) $l271.emitToolProgress?.({ kind: "background_hint", toolUseId: $l271.toolUseId });
      }, $m_xo, $l1), $l272 = {}, $l273 = async () => ($l272 = await $l48(), $l272);
      $l133?.started({ agentId: $l244, model: $l143 }), $l5?.mark("model");
      let $l274 = $m_Pne({ taskId: $l254, abortController: $l256, makeStream: ($l275, $l276, $l277) => $m_Tx({ ...$l197, ...$l245 && { launchedWithDefaults: $l234 }, session: $l205, override: { ...$l197.override, agentId: $l244, agentContext: $l246, abortController: $l256 }, onCacheSafeParams: $l275, onQueryProgress: $l276, onStreamTokenEstimate: $l277 }), metadata: $l179, description: $l21, toolUseContext: $l1, taskRegistry: $l30, agentIdForCleanup: $l244, reviewTools: $l196, enableSummarization: $m_mve(), getWorktreeResult: $l273, onMessage: $l263, shouldNotifyOwner: () => $l258.moved, onRunSettled: $l225 });
      $l228();
      let $l278, $l279;
      try {
        let $l280;
        try {
          $l280 = await $m_jAr($l274, $l253.backgroundSignal, $l104);
        } catch ($l281) {
          if ($l280 = "done", $l281 instanceof $m_qe) {
            let $l282 = $m_xi($l256.signal.reason) === "permission-stop";
            if ($l282) $l279 = $m_d($l281);
            if ($m_a("tengu_agent_tool_terminated", { agent_type: $l148, model: $m_wt($l179.resolvedAgentModel), final_model: $m_wt($l250.at(-1) ?? $l179.resolvedAgentModel), model_swapped: $l250.length > 1, duration_ms: Date.now() - $l179.startTime, is_async: false, is_built_in_agent: $l179.isBuiltInAgent, agent_depth: $l179.agentDepth, reason: $l282 ? $m_b("permission_stop_sync") : $m_b("user_cancel_sync") }), !$l282) $l227.killed("user");
            if (!($l256.signal.aborted && !$l1.abortController.signal.aborted)) throw $l281;
            $l278 = $m_N($l281);
          } else $m_t(`Sync agent error: ${$m_d($l281)}`, { level: "error" }), $l278 = $m_N($l281);
        }
        if (!$l278 && $m_WAr({ outcome: $l280, registration: $l253, wait: $l258, ownerAgentId: $l178, taskRegistry: $l30, sessionScratch: $l1.session.sessionScratch, agentTask: { armWorkerCheckinForBackgroundedAgent: $m_v4n, backgroundAgentTask: $m_sAe, hasAgentChildKeepalive: $m_sce } })) {
          let $l283 = !$m_dE($l70) && $m_qO($l1.options.tools);
          return { data: { isAsync: true, status: "async_launched", agentId: $l254, description: $l21, resolvedModel: $l249, ...$l250.length > 1 && { modelsUsed: [...$l250] }, prompt: $l20, outputFile: $l253.outputFile ?? "", canReadOutputFile: $l283, canContinueAgent: $m_Ev($l1.options.tools), ...$l194 && { sharesCwd: true } } };
        }
        let $l284 = $l259.findLast(($l285) => $l285.type !== "system" && $l285.type !== "progress");
        if ($l284 && $m_nH($l284)) throw $m_a("tengu_agent_tool_terminated", { agent_type: $l148, model: $m_wt($l179.resolvedAgentModel), final_model: $m_wt($l250.at(-1) ?? $l179.resolvedAgentModel), model_swapped: $l250.length > 1, duration_ms: Date.now() - $l179.startTime, is_async: false, is_built_in_agent: $l179.isBuiltInAgent, agent_depth: $l179.agentDepth, reason: $m_b("user_cancel_sync") }), $l227.cancelledAfterCompletion(), new $m_qe();
        let $l286, $l287 = $l259;
        if ($l278) {
          let $l288;
          try {
            $l288 = $m_pCr($l278, $l259);
          } catch ($l289) {
            throw $l227.failed(), $l289;
          }
          $l286 = $l288.cutoffNote ?? $l279, $l287 = $l288.history, $m_t(`Sync agent recovering from error with ${$l287.length} messages`);
        }
        let $l290 = await $m_mCr($m_ktn($l287, $l244, { ...$l179, modelsUsed: $l250 }, { suppressTelemetry: !$l278, handback: $m_$be($l30.get($l244), $l244) }), { agentId: $l244, agentMessages: $l259, agentType: $l148, child: $l38 ? "fork" : "agent", cutoffNote: $l286, tools: $l196(), toolUseContext: $l1 });
        return { data: { status: "completed", prompt: $l20, ...$l290, ...$l272, canContinueAgent: $m_Ev($l1.options.tools) } };
      } finally {
        if ($l270) clearTimeout($l270);
        if ($l1.toolUseId) $l1.emitToolProgress?.({ kind: "clear", toolUseId: $l1.toolUseId });
        if ($l255?.(), $l257(), !$l258.moved) {
          $m_Nbe($l254);
          let $l291 = $l30.get($l254), $l292 = $m_wn($l291) ? $l291.progress : void 0;
          $m_z1s($l254, $l30), $m_ca($l254, $l291?.status === "failed" ? "failed" : $l291?.status === "killed" ? "stopped" : "completed", { toolUseId: $l1.toolUseId, summary: $l21, usage: { total_tokens: $l292?.tokenCount ?? 0, tool_uses: $l292?.toolUseCount ?? 0, duration_ms: Date.now() - $l248 } });
        }
      }
    }));
    return $l229($l247);
  }
}
;
