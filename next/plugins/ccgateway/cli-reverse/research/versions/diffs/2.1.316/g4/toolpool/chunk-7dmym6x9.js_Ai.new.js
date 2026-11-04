SELF = $m_tn({ name: $m_Fe, enablesCodeExecution: true, ruleContentField: "command", searchHint: "execute shell commands", remoteExecution: { supported: true, refusedInputFields: $m__Mr, decidingInputFields: ["command", "run_in_background", "dangerouslyDisableSandbox"] }, backgrounding: "self", get maxResultSizeChars() {
  return $m_Iet();
}, persistenceThresholdCeiling: $m_oit, strict: true, async description({ description: $l0 }) {
  return $l0 || "Run shell command";
}, async prompt({ model: $l1, tools: $l2, leanPrompt: $l3, bashFirstTrimmed: $l4, leanRewrite: $l5 }) {
  return $NEW_chunk_e6aww6q8_js_M8t($l1, await $NEW_chunk_e6aww6q8_js_NVn($l2), $l2, $l3, $l4, $l5);
}, isConcurrencySafe($l6) {
  return this.isReadOnly?.($l6) ?? false;
}, suppressesAllPermissionUpdates($l7) {
  let $l8 = $l7?.[$m_Pr];
  return typeof $l8 === "string" && $l8.trim() !== "" && !$m_RH($l8.trim());
}, isReadOnly($l9, $l10) {
  return !$m_Ov($m_Fe) && $m_nft($l9, $m_q2n($l10));
}, notReadOnlyReason($l11, $l12) {
  if ($m_Ov($m_Fe)) return { message: "This session runs shell commands only in its cloud environment, so none can be verified as read-only here", everyInput: true };
  let $l13 = $m_Uqn($l11, $m_WGe($l11.command), { sessionEnvVarKeys: $m_q2n($l12) });
  if ($l13.behavior === "allow") return;
  return "notReadOnlyCommand" in $l13 ? { message: $l13.message, part: $l13.notReadOnlyCommand } : { message: $l13.message };
}, sandboxNetworkLists($l14) {
  return $m_Xhe($l14);
}, toAutoClassifierInput($l15) {
  let $l16 = $l15.dangerouslyDisableSandbox, $l17 = false, $l18 = $m_zh() ? $m_zZ($l15).requested : void 0, $l19 = $l18 !== void 0 && !$m_RH($l18) ? $m_oT($l18) || void 0 : void 0, $l20 = $m_O$t($l15);
  if ($l19 !== void 0 || $l20 !== void 0) return { command: $l15.command, ...false, ...$l19 !== void 0 && { [$m_Pr]: $l19 }, ...$l20 };
  return $l15.command;
}, async preparePermissionMatcher({ command: $l21 }) {
  return $NEW_chunk_e6aww6q8_js_DGr($l21);
}, isSearchOrReadCommand($l22) {
  let $l23 = $m_W2n().safeParse($l22);
  if (!$l23.success) return { isSearch: false, isRead: false, isList: false };
  return $m__ws($l23.data.command);
}, get inputSchema() {
  return $m_W2n();
}, coerceInput: $m_xzn, get outputSchema() {
  return $m_J2n();
}, get outputSchemaAcrossProcesses() {
  return $m_Ews();
}, fromAnotherProcess($l24, $l25) {
  if (!$l24.interrupted && $l24.timedOutAfterMs === void 0 && $l24.backgroundTaskId === void 0) $m_zYs(String($l25.command ?? ""));
  return {};
}, userFacingName($l26) {
  if (!$l26) return "Bash";
  return $m_i.CLAUDE_CODE_BASH_SANDBOX_SHOW_INDICATOR && $m_g_($l26) ? "SandboxedBash" : "Bash";
}, getToolUseSummary($l27) {
  if (!$l27?.command) return null;
  let { command: $l28, description: $l29 } = $l27;
  if ($l29) return $l29;
  return $m_ks($l28, $m_KR);
}, getActivityDescription($l30) {
  if (!$l30?.command) return "Running command";
  return `Running ${$l30.description ?? $m_ks($l30.command, $m_KR)}`;
}, extractSearchText({ stdout: $l31, stderr: $l32 }) {
  return $l32 ? `${$l31}
${$l32}` : $l31;
}, stripForStorage($l33, $l34) {
  if (!$l34) return $l33;
  if (typeof $l33 !== "object" || $l33 === null || typeof $l33.stdout !== "string" || typeof $l33.stderr !== "string") return $l33;
  if ($l33.stdout === "" && $l33.stderr === "") return $l33;
  return { ...$l33, stdout: "", stderr: "" };
}, mapToolResultToToolResultBlockParam({ interrupted: $l35, stdout: $l36, stderr: $l37, isImage: $l38, backgroundTaskId: $l39, backgroundOutputPath: $l40, backgroundedByUser: $l41, backgroundedToDeliverMessage: $l42, backgroundedByTurnAbort: $l43, timedOutAfterMs: $l44, subagentCapApplied: $l45, backgroundEndsWithFinalResponse: $l46, backgroundWakesOwner: $l47, backgroundCwdHint: $l48, structuredContent: $l49, persistedOutputPath: $l50, persistedOutputSize: $l51, stdoutHoldsOutputEnd: $l52, memoryLimitNote: $l53, triggeredNote: $l54, staleReadFileStateHint: $l55, ghRateLimitHint: $l56 }, $l57) {
  if ($l49 && $l49.length > 0) return { tool_use_id: $l57, type: "tool_result", content: $l49 };
  if ($l38) {
    let $l58 = $m_XLr($l36, $l57);
    if ($l58) {
      let $l59 = [typeof $l37 === "string" ? $l37.trim() : "", $l53].filter(Boolean).join(`
`);
      if ($l59) return { ...$l58, content: [...Array.isArray($l58.content) ? $l58.content : [], { type: "text", text: $l59 }] };
      return $l58;
    }
  }
  let $l60 = $l36;
  if ($l36) $l60 = $l36.replace(/^(\s*\n)+/, ""), $l60 = $l60.trimEnd();
  if ($l50) {
    let { start: $l61, end: $l62 } = $l52 === true ? $NEW_chunk_e6aww6q8_js_BVn($l60) : { start: $l60, end: void 0 }, $l63 = $m_mSt($l61, $l62 === void 0 ? $m_M_e : $m_M_e - $NEW_chunk_e6aww6q8_js_Oie);
    $l60 = $m_JLe({ filepath: $l50, originalSize: $l51 ?? 0, isJson: false, preview: $l63.preview, hasMore: $l63.hasMore, previewEnd: $l62, truncatedAtBytes: ($l51 ?? 0) >= $m_RZ ? $m_RZ : void 0 });
  }
  let $l64 = $l37.trim();
  if ($l35) {
    if ($l37) $l64 += $NEW_chunk_e6aww6q8_js_w5;
    $l64 += "<error>Command was aborted before completion</error>";
  }
  let $l65 = "";
  if ($l39) {
    if ($l65 = $m_ZLr({ backgroundTaskId: $l39, outputPath: $l40 ?? $m_Au($l39), backgroundedByUser: $l41, backgroundedToDeliverMessage: $l42, backgroundedByTurnAbort: $l43, timedOutAfterMs: $l44, subagentCapApplied: $l45, noOutputSeenAtTimeout: $l44 !== void 0 && !$l60, reapedAtFinalResponse: $l46, wakesItsOwner: $l47, readToolName: $m_Ve }), $l48) $l65 += `
${$l48}`;
    if ($m_AHe()) return { tool_use_id: $l57, type: "tool_result", content: $m_IMr($l39, [$l64, $l65].filter(Boolean).join(`
`), { backgroundedByUser: $l41, ending: $l46 ? "final_response" : void 0 }) };
  }
  return { tool_use_id: $l57, type: "tool_result", content: [$l60, $l64, $l65, ($l53 || $l54) && !$l60 && !$l64 && !$l65 && `(${$m_Fe} completed with no output)`, $l53, $l54, $l55, $l56].filter(Boolean).join(`
`), is_error: $l35 };
}, create($l66) {
  return { async validateInput($l67, $l68) {
    let $l69 = $l68;
    if ($m_CH() && $m_zZ($l67).requested !== void 0) return { result: false, message: $m_Wz(), errorCode: 11 };
    let $l70 = $m_g_($l67), $l71 = $m_vHe($l70, $l67.command, false, "bash");
    if ($l71 !== null) return $m_f("sandbox_exec", "sandbox_policy_refusal", { tool: $m_b("bash") }), { result: false, message: $l71, errorCode: 14 };
    if (!$m_Tf() && $m_uoe() && $l69.remoteCall?.constraints.background !== "forbidden" && !$l67.run_in_background && $l69.shellWallCapMs === void 0) {
      let $l72 = $m_Cws($l67.command);
      if ($l72 !== null) return { result: false, message: `Blocked: ${$l72}. To wait for a condition, use Monitor with an until-loop (e.g. \`until <check>; do sleep 2; done\`). To wait for a command you started, use run_in_background: true. Do not chain shorter sleeps to work around this block.`, errorCode: 10 };
    }
    let $l73 = $m_xct({ command: $l67.command, cwd: $m_fe(), agentId: $l66.agentId, toolUseId: $l68.toolUseId }, $l66.taskRegistry);
    if ($l73 !== void 0 && $m_xn($l66.tools, $m_Jl) !== void 0 && $m_r2s()) return { result: false, errorCode: 15, message: `Not started: this same command, in this directory, was moved to the background and has been running for ${$m_rn(Date.now() - $l73.startTime, { mostSignificantOnly: true })} (ID: ${$l73.id}). Its output is being written to: ${$l73.outputFile}. Let it finish, or, to run it again now, stop it first with ${$m_Jl}.` };
    let $l74 = $l67.run_in_background ? $l69.remoteCall?.backgroundShells?.reserve() : void 0;
    if ($l74 !== void 0) return { result: false, message: $l74, errorCode: 12 };
    let $l75 = $m_M$t($l67, $l70);
    if ($l75 !== void 0) return $l75;
    return await $m_Ozn($m_S2e.of($l66.session.host), () => $m_BKt($l67.command, $m_fe())) ?? { result: true };
  }, permissionCheckFailureDecision($l76, $l77) {
    let $l78 = $NEW_chunk_e6aww6q8_js_Hmt($l66, $l77);
    return $m_uLr($m_Fe, $l78.shellPermission);
  }, async checkPermissions($l79, $l80) {
    let $l81 = $NEW_chunk_e6aww6q8_js_Hmt($l66, $l80);
    return $m_K2n($l79, $l81.shellPermission, await $m_fLr($l79, $l81.shellPermission, void 0, ($l82) => $m_K2n($l79, $l81.shellPermission, $l82, "eachVerdict")), "chosenVerdict");
  }, async call($l83, $l84) {
    let $l85 = $NEW_chunk_e6aww6q8_js_Hmt($l66, $l84), { parentMessage: $l86, onProgress: $l87 } = $l84, $l88 = $m_a0r($l86, $l85.mainLoopModel()), $l89 = Math.floor(Date.now() / 1e3) * 1e3, $l90 = $m_xct({ command: $l83.command, cwd: $m_fe(), agentId: $l85.agentId, toolUseId: $l85.toolUseId }, $l85.taskRegistry) !== void 0;
    using $l91 = $l85.toolState.get($NEW_chunk_s61vbvea_js_p_n).begin({ input: $l83, cwd: $m_fe(), agentId: $l85.agentId, toolUseId: $m_Dzn($l85.toolUseId) && $l85.innerCall !== true ? $l85.toolUseId : void 0, messages: $l85.messages(), taskRegistry: $l85.taskRegistry, isReadOnly: $NEW_chunk_e6aww6q8_js_$As });
    let $l92 = 0;
    try {
      $l92 = $m_gTt();
    } catch ($l93) {
      $m_l($l93);
    }
    let { abortController: $l94, emitToolProgress: $l95 } = $l85, $l96 = new $m_yxn(), $l97 = "", $l98 = "", $l99, $l100, $l101 = 0, $l102 = false, $l103 = false, $l104, $l105;
    await using $l106 = $m_l0r($l85.taskRegistry);
    let $l107, $l108, $l109, $l110 = !$l85.agentId, $l111 = $l85.remoteCall?.constraints, $l112 = $l111?.sandbox === "required", $l113 = !$l110 || $l111?.pinCwd === true, $l114 = !$l85.userTypedShellDispatch && $l85.innerCall !== true && $l85.remoteCall === void 0, $l115 = $l114 && $l85.inputFromAnotherMachine !== true, $l116 = $l115 ? $m_Zis() : void 0, $l117, $l118 = $l85.userTypedShellDispatch, $l119 = $m_g_($l83, { disableUnsandboxedCommands: $l112, userTypedShellDispatch: $l118 }), $l120 = $m_vHe($l119, $l83.command, $l118 && $l83.dangerouslyDisableSandbox === true, "bash");
    if ($l120 !== null) throw $m_f("sandbox_exec", "sandbox_policy_refusal", { tool: $m_b("bash") }), new $m_zV($l120);
    let $l121 = $m_Ke.isSandboxingEnabled(), $l122 = $m_uC();
    if ($l112) {
      let $l123 = !$l119 || $l122 !== "strict" || $m_yf() ? { confined: false, reason: "sandbox_unconfined" } : await $m_FLe();
      if (!$l123.confined) throw $m_f("sandbox_exec", "remote_floor_refusal"), new $m_zV("This call must run inside a fully confining sandbox and none is available here. The command was not run.", $l123.reason);
    }
    let $l124 = $l119, $l125 = $m_YTe($l83.command), $l126 = $m_KBt($l85.toolUseId), $l127 = $m_D2n($l85), $l128 = $NEW_chunk_e6aww6q8_js_iYn($l85.permissions().mode) && !$l83.run_in_background && !$m_nft($l83, $m_mx($l85)), $l129 = $l128 && $NEW_chunk_e6aww6q8_js_aYn($l85.toolState, $l84.outsideResultReader, $NEW_chunk_e6aww6q8_js_PYn()), $l130 = $l129 && $NEW_chunk_e6aww6q8_js_dYn($l83.command), $l131 = $l129 && !$l130 && $l85.toolUseId !== void 0 && $m_c2n() ? $m_Vb($m_fe()) ?? $m_Vb($m_Ee()) : null, $l132 = $l131 !== null && $m_f2n($l131) === "ready" ? $l131 : null;
    if ($l132 !== null) await $m_C2n($l132);
    let $l133 = $l132 !== null && $l85.toolUseId !== void 0 && await $m_A2n($l132);
    if ($l133 && $l132 && $l85.toolUseId !== void 0) $m_m2n($l85.toolUseId, $l132);
    let $l134 = Date.now(), $l135 = $l132 !== null && !$l133 && !$m_dse($l132), $l136 = Date.now(), $l137 = $l129 && !$l130 && !$l133 ? $l135 ? "unavailable" : await $m_pse($m_fe()) ?? await $m_pse($m_Ee()) : null, $l138 = Date.now() - $l136, $l139 = $l137 === "unavailable" ? $NEW_chunk_e6aww6q8_js_cW() : $l137?.sharesTreeReads === true, $l140 = $l128 ? $l132 ?? ($l137 && $l137 !== "unavailable" ? $l137.repoRoot : $m_Vb($m_fe()) ?? $m_Vb($m_Ee())) : null, $l141 = $l140 !== null ? $m_Jzn($l140) : null, $l142 = false, $l143 = null, $l144, $l145 = false;
    try {
      let $l146 = $NEW_chunk_e6aww6q8_js_UAs({ input: $l83, useSandbox: $l119, networkLists: $m_D$t($l85.toolUseId, $l83.command), constraints: $l111, backgroundHeld: () => $m_RTe($l85), onHeldEnd: () => {
        $l145 = true;
      }, servedBackground: $l85.remoteCall?.backgroundShells ?? $l85.keptBackgroundShells, keptStarter: $l85.keptBackgroundShells, onNote: $l85.remoteCall?.onNote, abortController: $l94, taskRegistry: $l85.taskRegistry, emitToolProgress: $l95, session: $l85.session, preventCwdChanges: $l113, isMainThread: $l110, subagentCapMs: $m_QLr($l85), toolUseId: $l85.toolUseId, toolState: $l85.toolState, attributionMessageId: $l86?.message.id, callTiming: $l84.timing, agentId: $l85.agentId, caller: $m_din($l85), shellWallCapMs: $l85.shellWallCapMs, promptShellPluginId: $l85.promptShellPluginId, agentWorktree: $l85.agentWorktree, isolationRoot: $m___e($l85), sessionEnvVars: $l85.sessionEnvVars, storageV5: $l85.storageV5, effortLevel: $m_ES($l85.mainLoopModel()) ? $m_PH($l85.mainLoopModel(), $l85.effort(), $l85.effortLayerOverride()) : void 0 }), $l147 = $m_Ptr($l85.remoteCall !== void 0, $l85.hasSpendCap) ? $l87 : void 0, $l148;
      do
        if ($l148 = await $l146.next(), !$l148.done && $l147) {
          let $l149 = $l148.value;
          $l147({ type: "progress", toolUseID: `bash-progress-${$l101++}`, data: { type: "bash_progress", output: $l149.output, fullOutput: $l149.fullOutput, elapsedTimeSeconds: $l149.elapsedTimeSeconds, totalLines: $l149.totalLines, totalBytes: $l149.totalBytes, taskId: $l149.taskId, timeoutMs: $l149.timeoutMs } });
        }
      while (!$l148.done);
      if ($l105 = $l148.value, $l105.backgroundTaskId !== void 0 && $l105.timedOutAfterMs !== void 0 && $l85.innerCall !== true) $l105 = { ...$l105, stdout: await $m_gUr($l105.backgroundTaskId, $m_M_e) };
      if ($l106.track($l105), $l105.intercepted) $l124 = false;
      if ($l107 = await $m_m9n($l105.stdout, $l105.outputFilePath), $l108 = $m_dne($l83.command), $l109 = $m_le($NEW_chunk_fym4r1th_js_nrr($l108, $l107, $l105)), !$l105.backgroundTaskId && $m_g9n($l85.session.host, $l83.command, $l105.code, $l107).prResolved) $l85.markPrResolvedThisSession();
      let $l150 = $m_xi($l94.signal.reason), $l151 = $l105.interrupted && $l150 === "interrupt", $l152 = $l105.interrupted && $m_HYt($l150);
      if ($l105.interrupted && $l150 === "background") throw new $m_qe();
      if ($l96.append(($l105.stdout || "").trimEnd() + $NEW_chunk_e6aww6q8_js_w5), $l100 = $m_Sct($l83.command, $l105.code, $l105.stdout || "", ""), $l107.includes(".git/index.lock': File exists")) $m_a("tengu_git_index_lock_error", {});
      if ($l100.isError && !$l151) {
        if ($l105.code !== 0) $l96.append(`Exit code ${$l105.code}`);
      }
      if ($l99 = $m_Eo($l85.session).cwd, !$l113) {
        if ($m_t0r($l85.session, $l85.unlayeredPermissions()) || $l105.cwdChangeRefused) $l97 = $m_e0r("");
      }
      let $l153 = $l105.stdout || "", $l154 = $l124 ? $m_Ke.annotateStderrWithSandboxFailures($l85.toolUseId ?? $l83.command, $l153) : $l153;
      if ($l103 = $l154 !== $l153, $l124 && $l105.backgroundTaskId === void 0) $l104 = $m_r0r($l85.toolUseId ?? $l83.command);
      if ($l103) $l98 = $l154.slice($l153.length).trim();
      if ($l105.preSpawnError) {
        if (/null bytes/.test($l105.preSpawnError)) throw new $m_C($l105.preSpawnError, "Bash: command contained null bytes (argv echo redacted)");
        let $l155 = new $m_C($l105.preSpawnError, "Bash: pre-spawn error (cwd/argv redacted)");
        throw $l105.preSpawnErrorCode === "e2big" ? $m_rN($l155, { kind: "spawn_arg_limit" }) : $l155;
      }
      if ($l115 && $l105.backgroundTaskId === void 0 && !$l105.intercepted) $l117 = $NEW_chunk_e6aww6q8_js_n4n($l116, $l85.toolState.get($NEW_chunk_e6aww6q8_js_Dmt));
      let $l156 = $l105.interrupted || $l105.timedOut === true || $l105.timedOutAfterMs !== void 0;
      if ($l124 && $l85.remoteCall !== void 0 && ($l103 || !$l156)) $l85.remoteCall.onNote($NEW_chunk_e6aww6q8_js_e4n({ command: $l83.command, output: $l107 + $l98, failed: $l100.isError && !$l156, violationRecorded: $l103, filesystemPolicy: $l122, additionalDenyRead: () => $l111?.additionalDenyRead ?? [] }));
      if ($l100.isError && !$l151) {
        let $l157 = $l114 && !$l105.interrupted && $l105.outputFilePath !== void 0 && !$m_o4n($m_YLr($l153)) && $NEW_chunk_e6aww6q8_js_$Vn() ? await $NEW_chunk_e6aww6q8_js_UVn($l105, $l153, $l85.session, $l85.storageV5) : void 0, $l158 = $l114 && !$l105.interrupted && $l105.timedOut !== true && $l105.backgroundTaskId === void 0 ? $NEW_chunk_e6aww6q8_js_Nmt($l83.command, $l105.shellUsage, true, $l85.toolState.get($NEW_chunk_e6aww6q8_js_tLe)) : void 0;
        $m_a("tengu_bash_tool_command_failed", { model: $l88, command_type: $m_Sse($l83.command), ...$l108, stdout_length: $l153.length, stderr_length: 0, exit_code: $l105.code, interrupted: $l105.interrupted, output_end_shown: $l157 !== void 0, triggered_note_rule: $l158?.rule ?? 0, triggered_note_shown: $l158?.note !== void 0, oom_kill_during_command: $l117?.hit === true, oom_kill_note_shown: $l117?.note !== void 0, ...$m_C_t($l105.shellUsage), zsh_note_in_prompt: $l127, executor_shell: await $m_BOo(), executor_shell_overridden: Boolean(process.env.CLAUDE_CODE_SHELL), ...$m_tft($l83.command, $l107), bash_test_outcome: $l109, sandboxed: $l124, sandbox_enabled: $l121, dangerously_disable_sandbox: $l83.dangerouslyDisableSandbox ?? false, user_typed_shell_dispatch: $l118, filesystem_policy: $m_c($l122), call_origin: $m_c($l111 ? "remote" : "local"), ...$NEW_chunk_e6aww6q8_js_m4n($l83), had_sandbox_violation: $l124 && $l103, same_as_running_background: $l90, tool_use_id: $l126, destructive_category: $m_c($l125 ?? "none"), destructive_target_scope: $m_c($m_FGe($l83.command, $m_fe(), $l125)), git_destructive_target: $m_c($m_A0($l83.command, $l125)), permission_mode: $m_c($l85.permissions().mode), ...$l91.ended($l105, true, false), reads_own_output: $NEW_chunk_e6aww6q8_js_Bne($l83.command, $l85.session) });
        let $l159;
        try {
          $l159 = $m_hTt($l92);
        } catch ($l160) {
          $m_l($l160);
        }
        throw new $m_b1({ stdout: "", stderr: [$l159, $l145 ? $m_tDr : void 0, $l117?.note, $l158?.note].reduce(($l161, $l162) => $l162 === void 0 ? $l161 : `${$l161.trimEnd()}${$NEW_chunk_e6aww6q8_js_w5}${$NEW_chunk_e6aww6q8_js_w5}${$l162}`, $l157 === void 0 ? $l154 : $l157 + $l98), code: $l105.code, interrupted: $l152, hadSandboxViolation: $l103, sandboxViolations: $l104, sandboxed: $l124 });
      }
      $l102 = $l105.interrupted, $l143 = $l133 && $l132 && $l85.toolUseId ? await $m_Mws($l132, $l85.toolUseId, Boolean($l105.backgroundTaskId), $l102, $l85.readFileState, $l134) : null;
      let $l163 = Date.now(), $l164 = () => {
        if ($l141 && $l140 !== null) $m_Zzn($l140, $l141);
      };
      $l144 = !$l105.backgroundTaskId && !$l130 && !$l143 && $l137 && $l137 !== "unavailable" && !$l102 ? await $NEW_chunk_e6aww6q8_js_cYn($l137, $l164, $l137.sharesTreeReads && $m_Y_($l85.permissions().mode, { peek: true }) !== "off" ? { signal: $l94.signal, onReadFailed: $l164 } : void 0) : void 0, $l138 += Date.now() - $l163;
    } catch ($l165) {
      if ($l133 && $l85.toolUseId !== void 0) {
        let $l166 = await $m_qct($l85.toolUseId);
        if ($l132 && ($l166 === null || $l166.paths.length > 0 || $l166.overflow || $l166.watchEnds)) $m_$k($l132);
      }
      throw $l165;
    } finally {
      if ($l141 && $l140 !== null) $l142 = $m_Zzn($l140, $l141);
      if ($l137 && !$l135) $NEW_chunk_e6aww6q8_js_uYn($l138, $l139);
      if ($l137 && $l137 !== "unavailable" && $l144 !== null) $m_$k($l137.repoRoot);
      if ($l128 && !$l129 && $l140 !== null) $m_$k($l140);
      if ($l130) {
        let $l167 = $m_Vb($m_fe()) ?? $m_Vb($m_Ee());
        if ($l167 !== null) $m_$k($l167);
      }
      if ($l85.toolUseId) $l95?.({ kind: "clear", toolUseId: $l85.toolUseId });
      if (!$m_nft($l83, $m_mx($l85))) $l85.applyFileHistoryOp({ kind: "touch" }), $l91.mayHaveWritten = true;
    }
    let $l168 = $l96.toString(), $l169 = await $NEW_chunk_e6aww6q8_js_omt($l105, $l85.session, $l85.storageV5, $l106), $l170 = $l169?.path, $l171 = $l169?.size, $l172 = $l169 !== void 0 && $l115 && !$l102 && !$m_o4n($m_YLr($l168)) && $NEW_chunk_e6aww6q8_js_FVn() ? await $NEW_chunk_e6aww6q8_js_rmt($l105, $l168, $m_M_e - $NEW_chunk_e6aww6q8_js_Oie, $NEW_chunk_e6aww6q8_js_Oie, true) : void 0, $l173 = $l115 && !$l102 && $l105.backgroundTaskId === void 0 && !$m_o4n($m_YLr($l168)) ? $NEW_chunk_e6aww6q8_js_Nmt($l83.command, $l105.shellUsage, false, $l85.toolState.get($NEW_chunk_e6aww6q8_js_tLe)) : void 0;
    $m_a("tengu_bash_tool_command_executed", { model: $l88, command_type: $m_Sse($l83.command), ...$l108, stdout_length: $l168.length, stderr_length: 0, exit_code: $l105.code, interrupted: $l102, output_end_shown: $l172 !== void 0, triggered_note_rule: $l173?.rule ?? 0, triggered_note_shown: $l173?.note !== void 0, oom_kill_during_command: $l117?.hit === true, oom_kill_note_shown: $l117?.note !== void 0, ...$m_C_t($l105.shellUsage), zsh_note_in_prompt: $l127, executor_shell: await $m_BOo(), executor_shell_overridden: Boolean(process.env.CLAUDE_CODE_SHELL), ...$m_tft($l83.command, $l107), bash_test_outcome: $l109, sandboxed: $l124, sandbox_enabled: $l121, dangerously_disable_sandbox: $l83.dangerouslyDisableSandbox ?? false, user_typed_shell_dispatch: $l118, filesystem_policy: $m_c($l122), call_origin: $m_c($l111 ? "remote" : "local"), ...$NEW_chunk_e6aww6q8_js_m4n($l83), had_sandbox_violation: $l124 && $l103, was_backgrounded: Boolean($l105.backgroundTaskId), same_as_running_background: $l90, tool_use_id: $l126, destructive_category: $m_c($l125 ?? "none"), destructive_target_scope: $m_c($m_FGe($l83.command, $m_fe(), $l125)), git_destructive_target: $m_c($m_A0($l83.command, $l125)), permission_mode: $m_c($l85.permissions().mode), ...$l91.ended($l105, false, $l170 !== void 0), reads_own_output: $NEW_chunk_e6aww6q8_js_Bne($l83.command, $l85.session) });
    let $l174 = $m_Rzn($l83.command);
    if ($l174) $m_a("tengu_code_indexing_tool_used", { tool: $m_c($l174), source: $m_b("cli"), success: $l105.code === 0 });
    let $l175 = $m_YLr($l168);
    $l175 = $m_UFt($l175, { command: $l83.command, pendingHint: $l85.session.pendingHint, isMainThread: $l110, surface: "shell" });
    let $l176 = $l105.timedOutAfterMs === void 0 && $m_o4n($l175), $l177 = $l175;
    if ($l176) {
      let $l178 = await $m_JLr($l175, $l105.outputFilePath, $l171, $m_md($l85.mainLoopModel()));
      if ($l178) $l177 = $l178;
      else $l176 = false;
    }
    let $l179 = $l105.backgroundTaskId ? void 0 : $m_KYs($l83.command, $l107, $l85.toolState.get($m_oBo)), $l180 = $l105.backgroundTaskId && $m_WGe($l83.command) ? $m_u6n($m_fe()) : void 0, $l181 = $l105.backgroundTaskId !== void 0 && ($m__At($l85.agentContext) || $l85.agentId === void 0 && $m_a$t()) ? true : void 0, $l182;
    if (!$l105.backgroundTaskId) {
      let $l183 = $m_Fjt($l83.command, $l107);
      if (Object.keys($l183).length > 0) $l182 = $l183;
      if (!$l85.remoteCall) $m_p9n($l183, $l107, { command: $l83.command, exitCode: $l105.code, cwd: $l99 });
    }
    let $l184;
    if (!$l102 && !$l176 && !$l105.backgroundTaskId) {
      let $l185 = await $m_Aws($l83.command, $l85.readFileState, $l89);
      if ($l185.length > 0) {
        let $l186 = $m_fe(), $l187 = 5, $l188 = $l185.slice(0, 5).map(($l189) => $NEW_chunk_e6aww6q8_js_EAs($l186, $l189) || $l189).join(", "), $l190 = $l185.length > 5 ? ` and ${$l185.length - 5} more` : "", $l191 = $m_a3s($m_Ve, $l85.tools);
        $l184 = `[This command modified ${$l185.length} ${$m_O($l185.length, "file")} you've previously read: ${$l188}${$l190}. Call ${$l191} before editing.]`;
      }
    }
    let $l192 = $l105.backgroundTaskId ? void 0 : $l130 ? { files: [], moreFiles: 0, skipped: true } : $l143 ? $l143.diff ?? void 0 : $l137 === "unavailable" ? { files: [], moreFiles: 0, unavailable: true } : $l137 && $l102 ? void 0 : $l137 ? $l144 ?? ($l142 ? { files: [], moreFiles: 0, shared: true } : void 0) : void 0, $l193 = $l192 && $l142 && !$l192.skipped ? { ...$l192, shared: true } : $l192;
    if ($l91.sawEditDiff($l193, !$l105.backgroundTaskId && ($l143 !== null || $l144 !== void 0)), $l193?.unavailable) $m_f($l139 ? "bash_edit_diff_shared" : "bash_edit_diff", $l102 ? "interrupted" : "unavailable");
    else if ($l193 && !$l193.skipped) $m_g($l139 ? "bash_edit_diff_shared" : "bash_edit_diff");
    if (!$l102 && !$l176 && !$l105.backgroundTaskId) {
      let $l194 = [$l97, $l98, $l117?.note, $l173?.note, $l184, $l179].reduce(($l195, $l196) => $l195 + ($l196 ? $l196.length + $NEW_chunk_e6aww6q8_js_w5.length : 0), 0), $l197 = $l170 !== void 0 || $l168.length > $m_Toe() || $l85.innerCall === true || $l177.length + $l194 > $m_iue($m_Fe, $m_Iet(), $m_oit);
      await $m_Mzn($l83.command, $l85.readFileState, $l94.signal, $l105.code, $l197 ? void 0 : $l177, $l85.remoteCall === void 0 && $l85.nestedMemoryAttachmentTriggers ? { triggers: $l85.nestedMemoryAttachmentTriggers, permissions: $l85.permissions } : void 0);
    }
    let $l198 = $l172 !== void 0 && !$l176 && $l177 !== "", $l199 = { stdout: $l198 ? $NEW_chunk_e6aww6q8_js_HVn($l177, $l172) : $l177, stderr: $l98 ? [$l97, $l98].filter(Boolean).join($NEW_chunk_e6aww6q8_js_w5) : $l97, interrupted: $l102, isImage: $l176, returnCodeInterpretation: $l100?.message, noOutputExpected: $m_kws($l83.command), backgroundTaskId: $l105.backgroundTaskId, ...$l105.backgroundTaskId !== void 0 && $l85.keptBackgroundShells !== void 0 && { backgroundOutputPath: $m_Au($l105.backgroundTaskId) }, backgroundedByUser: $l105.backgroundedByUser, backgroundedByTurnAbort: $l105.backgroundedByTurnAbort, backgroundedToDeliverMessage: $l105.backgroundedToDeliverMessage, timedOutAfterMs: $l105.timedOutAfterMs, subagentCapApplied: $l105.subagentCapApplied, backgroundEndsWithFinalResponse: $l181, backgroundCwdHint: $l180, dangerouslyDisableSandbox: "dangerouslyDisableSandbox" in $l83 ? $l83.dangerouslyDisableSandbox : void 0, persistedOutputPath: $l170, persistedOutputSize: $l171, ...$l198 && { stdoutHoldsOutputEnd: $l198 }, memoryLimitNote: $l117?.note, triggeredNote: $l173?.note, staleReadFileStateHint: $l184, ghRateLimitHint: $l179, gitOperation: $l182, bashEditDiff: $l193 };
    if ($l199.backgroundTaskId !== void 0 && $m_AHe()) $m_a("tengu_bash_task_ack", { trigger: $l199.backgroundedByUser ? $m_b("user") : $l199.backgroundedByTurnAbort ? $m_b("turn_abort") : $l199.backgroundedToDeliverMessage ? $m_b("deliver_message") : $l199.timedOutAfterMs !== void 0 ? $m_b("timeout") : $m_b("explicit"), ends_with_final_response: $l199.backgroundEndsWithFinalResponse === true, shell: $m_b("bash") });
    return { data: $l199, ...$l104 !== void 0 && { sandboxViolations: $l104 }, sandboxed: $l124, ...$l103 && !$l102 && { remedy: { kind: "sandbox_violation" } } };
  } };
} });
