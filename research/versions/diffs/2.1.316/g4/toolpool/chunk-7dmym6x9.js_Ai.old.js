SELF = $m_tn({ name: $m_Fe, enablesCodeExecution: true, ruleContentField: "command", searchHint: "execute shell commands", remoteExecution: { supported: true, refusedInputFields: $m__Mr, decidingInputFields: ["command", "run_in_background", "dangerouslyDisableSandbox"] }, backgrounding: "self", get maxResultSizeChars() {
  return $m_Iet();
}, persistenceThresholdCeiling: $m_oit, strict: true, async description({ description: $l0 }) {
  return $l0 || "Run shell command";
}, async prompt({ model: $l1, tools: $l2, leanPrompt: $l3, bashFirstTrimmed: $l4, leanRewrite: $l5 }) {
  return $m_T3t($l1, await $m_Izn($l2), $l2, $l3, $l4, $l5);
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
  let $l22 = await $m_aCt(() => $m_dB($l21)), $l23, $l24 = false;
  if ($l22.kind === "simple") $l23 = $l22.commands.map(($l25) => $l25.argv.join(" "));
  else if ($l22.differential || !$m_gws.has($l22.nodeType ?? "")) return () => true;
  else {
    let $l26 = $m_vzn($l21);
    if ($l26 === null || $l26.length === 0) return () => true;
    $l23 = $l26, $l24 = true;
  }
  return ($l27) => {
    let $l28 = $m_mKt($l27);
    if ($l24 && !($l28 !== null ? !/\s/.test($l28) : /^[^\s*?[]+\s?\*$/.test($l27))) return true;
    return $l23.some(($l29) => {
      if ($l28 !== null) return $l29 === $l28 || $l29.startsWith(`${$l28} `) || $l29 === `xargs ${$l28}` || $l29.startsWith(`xargs ${$l28} `);
      return $m_GD($l27, $l29) || $m_GD(`xargs ${$l27}`, $l29);
    });
  };
}, isSearchOrReadCommand($l30) {
  let $l31 = $m_W2n().safeParse($l30);
  if (!$l31.success) return { isSearch: false, isRead: false, isList: false };
  return $m__ws($l31.data.command);
}, get inputSchema() {
  return $m_W2n();
}, coerceInput: $m_xzn, get outputSchema() {
  return $m_J2n();
}, get outputSchemaAcrossProcesses() {
  return $m_Ews();
}, fromAnotherProcess($l32, $l33) {
  if (!$l32.interrupted && $l32.timedOutAfterMs === void 0) $m_zYs(String($l33.command ?? ""));
  return {};
}, userFacingName($l34) {
  if (!$l34) return "Bash";
  return $m_i.CLAUDE_CODE_BASH_SANDBOX_SHOW_INDICATOR && $m_g_($l34) ? "SandboxedBash" : "Bash";
}, getToolUseSummary($l35) {
  if (!$l35?.command) return null;
  let { command: $l36, description: $l37 } = $l35;
  if ($l37) return $l37;
  return $m_ks($l36, $m_KR);
}, getActivityDescription($l38) {
  if (!$l38?.command) return "Running command";
  return `Running ${$l38.description ?? $m_ks($l38.command, $m_KR)}`;
}, extractSearchText({ stdout: $l39, stderr: $l40 }) {
  return $l40 ? `${$l39}
${$l40}` : $l39;
}, stripForStorage($l41, $l42) {
  if (!$l42) return $l41;
  if (typeof $l41 !== "object" || $l41 === null || typeof $l41.stdout !== "string" || typeof $l41.stderr !== "string") return $l41;
  if ($l41.stdout === "" && $l41.stderr === "") return $l41;
  return { ...$l41, stdout: "", stderr: "" };
}, mapToolResultToToolResultBlockParam({ interrupted: $l43, stdout: $l44, stderr: $l45, isImage: $l46, backgroundTaskId: $l47, backgroundOutputPath: $l48, backgroundedByUser: $l49, backgroundedToDeliverMessage: $l50, backgroundedByTurnAbort: $l51, timedOutAfterMs: $l52, subagentCapApplied: $l53, backgroundEndsWithFinalResponse: $l54, backgroundCwdHint: $l55, structuredContent: $l56, persistedOutputPath: $l57, persistedOutputSize: $l58, staleReadFileStateHint: $l59, ghRateLimitHint: $l60 }, $l61) {
  if ($l56 && $l56.length > 0) return { tool_use_id: $l61, type: "tool_result", content: $l56 };
  if ($l46) {
    let $l62 = $m_XLr($l44, $l61);
    if ($l62) {
      let $l63 = typeof $l45 === "string" ? $l45.trim() : "";
      if ($l63) return { ...$l62, content: [...Array.isArray($l62.content) ? $l62.content : [], { type: "text", text: $l63 }] };
      return $l62;
    }
  }
  let $l64 = $l44;
  if ($l44) $l64 = $l44.replace(/^(\s*\n)+/, ""), $l64 = $l64.trimEnd();
  if ($l57) {
    let $l65 = $m_mSt($l64, $m_M_e);
    $l64 = $m_JLe({ filepath: $l57, originalSize: $l58 ?? 0, isJson: false, preview: $l65.preview, hasMore: $l65.hasMore, truncatedAtBytes: ($l58 ?? 0) >= $m_RZ ? $m_RZ : void 0 });
  }
  let $l66 = $l45.trim();
  if ($l43) {
    if ($l45) $l66 += $m_Z4;
    $l66 += "<error>Command was aborted before completion</error>";
  }
  let $l67 = "";
  if ($l47) {
    if ($l67 = $m_ZLr({ backgroundTaskId: $l47, outputPath: $l48 ?? $m_Au($l47), backgroundedByUser: $l49, backgroundedToDeliverMessage: $l50, backgroundedByTurnAbort: $l51, timedOutAfterMs: $l52, subagentCapApplied: $l53, noOutputSeenAtTimeout: $l52 !== void 0 && !$l64, reapedAtFinalResponse: $l54, readToolName: $m_Ve }), $l55) $l67 += `
${$l55}`;
    if ($m_AHe()) return { tool_use_id: $l61, type: "tool_result", content: $m_IMr($l47, [$l66, $l67].filter(Boolean).join(`
`), { backgroundedByUser: $l49, ending: $l54 ? "final_response" : void 0 }) };
  }
  return { tool_use_id: $l61, type: "tool_result", content: [$l64, $l66, $l67, $l59, $l60].filter(Boolean).join(`
`), is_error: $l43 };
}, create($l68) {
  return { async validateInput($l69, $l70) {
    let $l71 = $l70;
    if ($m_CH() && $m_zZ($l69).requested !== void 0) return { result: false, message: $m_Wz(), errorCode: 11 };
    let $l72 = $m_g_($l69), $l73 = $m_vHe($l72, $l69.command, false, "bash");
    if ($l73 !== null) return $m_f("sandbox_exec", "sandbox_policy_refusal", { tool: $m_b("bash") }), { result: false, message: $l73, errorCode: 14 };
    if (!$m_Tf() && $m_uoe() && $l71.remoteCall?.constraints.background !== "forbidden" && !$l69.run_in_background && $l71.shellWallCapMs === void 0) {
      let $l74 = $m_Cws($l69.command);
      if ($l74 !== null) return { result: false, message: `Blocked: ${$l74}. To wait for a condition, use Monitor with an until-loop (e.g. \`until <check>; do sleep 2; done\`). To wait for a command you started, use run_in_background: true. Do not chain shorter sleeps to work around this block.`, errorCode: 10 };
    }
    let $l75 = $m_xct({ command: $l69.command, cwd: $m_fe(), agentId: $l68.agentId, toolUseId: $l70.toolUseId }, $l68.taskRegistry);
    if ($l75 !== void 0 && $m_xn($l68.tools, $m_Jl) !== void 0 && $m_r2s()) return { result: false, errorCode: 15, message: `Not started: this same command, in this directory, was moved to the background and has been running for ${$m_rn(Date.now() - $l75.startTime, { mostSignificantOnly: true })} (ID: ${$l75.id}). Its output is being written to: ${$l75.outputFile}. Let it finish, or, to run it again now, stop it first with ${$m_Jl}.` };
    let $l76 = $l69.run_in_background ? $l71.remoteCall?.backgroundShells?.reserve() : void 0;
    if ($l76 !== void 0) return { result: false, message: $l76, errorCode: 12 };
    let $l77 = $m_M$t($l69, $l72);
    if ($l77 !== void 0) return $l77;
    return await $m_Ozn($m_S2e.of($l68.session.host), () => $m_BKt($l69.command, $m_fe())) ?? { result: true };
  }, permissionCheckFailureDecision($l78, $l79) {
    let $l80 = $m_oft($l68, $l79);
    return $m_uLr($m_Fe, $l80.shellPermission);
  }, async checkPermissions($l81, $l82) {
    let $l83 = $m_oft($l68, $l82);
    return $m_K2n($l81, $l83.shellPermission, await $m_fLr($l81, $l83.shellPermission, void 0, ($l84) => $m_K2n($l81, $l83.shellPermission, $l84, "eachVerdict")), "chosenVerdict");
  }, async call($l85, $l86) {
    let $l87 = $m_oft($l68, $l86), { parentMessage: $l88, onProgress: $l89 } = $l86, $l90 = $m_a0r($l88, $l87.mainLoopModel()), $l91 = Math.floor(Date.now() / 1e3) * 1e3, $l92 = $m_xct({ command: $l85.command, cwd: $m_fe(), agentId: $l87.agentId, toolUseId: $l87.toolUseId }, $l87.taskRegistry) !== void 0, $l93 = 0;
    try {
      $l93 = $m_gTt();
    } catch ($l94) {
      $m_l($l94);
    }
    let { abortController: $l95, emitToolProgress: $l96 } = $l87, $l97 = new $m_yxn(), $l98 = "", $l99 = "", $l100, $l101, $l102 = 0, $l103 = false, $l104 = false, $l105, $l106;
    await using $l107 = $m_l0r($l87.taskRegistry);
    let $l108, $l109 = !$l87.agentId, $l110 = $l87.remoteCall?.constraints, $l111 = $l110?.sandbox === "required", $l112 = !$l109 || $l110?.pinCwd === true, $l113 = $l87.userTypedShellDispatch, $l114 = $m_g_($l85, { disableUnsandboxedCommands: $l111, userTypedShellDispatch: $l113 }), $l115 = $m_vHe($l114, $l85.command, $l113 && $l85.dangerouslyDisableSandbox === true, "bash");
    if ($l115 !== null) throw $m_f("sandbox_exec", "sandbox_policy_refusal", { tool: $m_b("bash") }), new $m_zV($l115);
    let $l116 = $m_Ke.isSandboxingEnabled(), $l117 = $m_uC();
    if ($l111) {
      let $l118 = !$l114 || $l117 !== "strict" || $m_yf() ? { confined: false, reason: "sandbox_unconfined" } : await $m_FLe();
      if (!$l118.confined) throw $m_f("sandbox_exec", "remote_floor_refusal"), new $m_zV("This call must run inside a fully confining sandbox and none is available here. The command was not run.", $l118.reason);
    }
    let $l119 = $l114, $l120 = $m_YTe($l85.command), $l121 = $m_KBt($l87.toolUseId), $l122 = $m_D2n($l87), $l123 = $m_Kzn($l87.permissions().mode) && !$l85.run_in_background && !$m_nft($l85, $m_mx($l87)), $l124 = $l123 && $m_Yzn($l85.command), $l125 = $l123 && !$l124 && $l87.toolUseId !== void 0 && $m_c2n() ? $m_Vb($m_fe()) ?? $m_Vb($m_Ee()) : null, $l126 = $l125 !== null && $m_f2n($l125) === "ready" ? $l125 : null;
    if ($l126 !== null) await $m_C2n($l126);
    let $l127 = $l126 !== null && $l87.toolUseId !== void 0 && await $m_A2n($l126);
    if ($l127 && $l126 && $l87.toolUseId !== void 0) $m_m2n($l87.toolUseId, $l126);
    let $l128 = Date.now(), $l129 = $l126 !== null && !$l127 && !$m_dse($l126), $l130 = $l123 && !$l124 && !$l127 ? $l129 ? "unavailable" : await $m_pse($m_fe()) ?? await $m_pse($m_Ee()) : null, $l131 = $l123 ? $l126 ?? ($l130 && $l130 !== "unavailable" ? $l130.repoRoot : $m_Vb($m_fe()) ?? $m_Vb($m_Ee())) : null, $l132 = $l131 !== null ? $m_Jzn($l131) : null, $l133 = false, $l134 = null, $l135, $l136 = false;
    try {
      let $l137 = $m_Pws({ input: $l85, useSandbox: $l114, networkLists: $m_D$t($l87.toolUseId, $l85.command), constraints: $l110, backgroundHeld: () => $m_RTe($l87), onHeldEnd: () => {
        $l136 = true;
      }, servedBackground: $l87.remoteCall?.backgroundShells ?? $l87.keptBackgroundShells, onNote: $l87.remoteCall?.onNote, abortController: $l95, taskRegistry: $l87.taskRegistry, emitToolProgress: $l96, session: $l87.session, preventCwdChanges: $l112, isMainThread: $l109, subagentCapMs: $m_QLr($l87), toolUseId: $l87.toolUseId, toolState: $l87.toolState, attributionMessageId: $l88?.message.id, callTiming: $l86.timing, agentId: $l87.agentId, caller: $m_din($l87), shellWallCapMs: $l87.shellWallCapMs, promptShellPluginId: $l87.promptShellPluginId, agentWorktree: $l87.agentWorktree, isolationRoot: $m___e($l87), sessionEnvVars: $l87.sessionEnvVars, storageV5: $l87.storageV5, effortLevel: $m_ES($l87.mainLoopModel()) ? $m_PH($l87.mainLoopModel(), $l87.effort(), $l87.effortLayerOverride()) : void 0 }), $l138 = $m_Ptr($l87.remoteCall !== void 0, $l87.hasSpendCap) ? $l89 : void 0, $l139;
      do
        if ($l139 = await $l137.next(), !$l139.done && $l138) {
          let $l140 = $l139.value;
          $l138({ type: "progress", toolUseID: `bash-progress-${$l102++}`, data: { type: "bash_progress", output: $l140.output, fullOutput: $l140.fullOutput, elapsedTimeSeconds: $l140.elapsedTimeSeconds, totalLines: $l140.totalLines, totalBytes: $l140.totalBytes, taskId: $l140.taskId, timeoutMs: $l140.timeoutMs } });
        }
      while (!$l139.done);
      if ($l106 = $l139.value, $l106.backgroundTaskId !== void 0 && $l106.timedOutAfterMs !== void 0 && $l87.innerCall !== true) $l106 = { ...$l106, stdout: await $m_gUr($l106.backgroundTaskId, $m_M_e) };
      if ($l107.track($l106), $l106.intercepted) $l119 = false;
      if ($l108 = await $m_m9n($l106.stdout, $l106.outputFilePath), !$l106.backgroundTaskId && $m_g9n($l87.session.host, $l85.command, $l106.code, $l108).prResolved) $l87.markPrResolvedThisSession();
      let $l141 = $m_xi($l95.signal.reason), $l142 = $l106.interrupted && $l141 === "interrupt", $l143 = $l106.interrupted && $m_HYt($l141);
      if ($l106.interrupted && $l141 === "background") throw new $m_qe();
      if ($l97.append(($l106.stdout || "").trimEnd() + $m_Z4), $l101 = $m_Sct($l85.command, $l106.code, $l106.stdout || "", ""), $l108.includes(".git/index.lock': File exists")) $m_a("tengu_git_index_lock_error", {});
      if ($l101.isError && !$l142) {
        if ($l106.code !== 0) $l97.append(`Exit code ${$l106.code}`);
      }
      if ($l100 = $m_Eo($l87.session).cwd, !$l112) {
        if ($m_t0r($l87.session, $l87.unlayeredPermissions()) || $l106.cwdChangeRefused) $l98 = $m_e0r("");
      }
      let $l144 = $l106.stdout || "", $l145 = $l119 ? $m_Ke.annotateStderrWithSandboxFailures($l87.toolUseId ?? $l85.command, $l144) : $l144;
      if ($l104 = $l145 !== $l144, $l119 && $l106.backgroundTaskId === void 0) $l105 = $m_r0r($l87.toolUseId ?? $l85.command);
      if ($l104) $l99 = $l145.slice($l144.length).trim();
      if ($l106.preSpawnError) {
        if (/null bytes/.test($l106.preSpawnError)) throw new $m_C($l106.preSpawnError, "Bash: command contained null bytes (argv echo redacted)");
        let $l146 = new $m_C($l106.preSpawnError, "Bash: pre-spawn error (cwd/argv redacted)");
        throw $l106.preSpawnErrorCode === "e2big" ? $m_rN($l146, { kind: "spawn_arg_limit" }) : $l146;
      }
      if ($l119 && ($l104 || $l101.isError && !$l106.interrupted)) $l87.remoteCall?.onNote({ key: "sandboxed_failure", violationRecorded: $l104 });
      if ($l101.isError && !$l142) {
        $m_a("tengu_bash_tool_command_failed", { model: $l90, command_type: $m_Sse($l85.command), ...$m_dne($l85.command), stdout_length: $l144.length, stderr_length: 0, exit_code: $l106.code, interrupted: $l106.interrupted, ...$m_C_t($l106.shellUsage), zsh_note_in_prompt: $l122, executor_shell: await $m_BOo(), executor_shell_overridden: Boolean(process.env.CLAUDE_CODE_SHELL), ...$m_tft($l85.command, $l108), sandboxed: $l119, sandbox_enabled: $l116, dangerously_disable_sandbox: $l85.dangerouslyDisableSandbox ?? false, user_typed_shell_dispatch: $l113, filesystem_policy: $m_c($l117), call_origin: $m_c($l110 ? "remote" : "local"), ...$m_G2n($l85), had_sandbox_violation: $l119 && $l104, same_as_running_background: $l92, tool_use_id: $l121, destructive_category: $m_c($l120 ?? "none"), destructive_target_scope: $m_c($m_FGe($l85.command, $m_fe(), $l120)), git_destructive_target: $m_c($m_A0($l85.command, $l120)), permission_mode: $m_c($l87.permissions().mode) });
        let $l147;
        try {
          $l147 = $m_hTt($l93);
        } catch ($l148) {
          $m_l($l148);
        }
        throw new $m_b1({ stdout: "", stderr: [$l147, $l136 ? $m_tDr : void 0].reduce(($l149, $l150) => $l150 === void 0 ? $l149 : `${$l149.trimEnd()}${$m_Z4}${$m_Z4}${$l150}`, $l145), code: $l106.code, interrupted: $l143, hadSandboxViolation: $l104, sandboxViolations: $l105, sandboxed: $l119 });
      }
      $l103 = $l106.interrupted, $l134 = $l127 && $l126 && $l87.toolUseId ? await $m_Mws($l126, $l87.toolUseId, Boolean($l106.backgroundTaskId), $l103, $l87.readFileState, $l128) : null, $l135 = !$l106.backgroundTaskId && !$l124 && !$l134 && $l130 && $l130 !== "unavailable" && !$l103 ? await $m_Xzn($l130) : void 0;
    } catch ($l151) {
      if ($l127 && $l87.toolUseId !== void 0) {
        let $l152 = await $m_qct($l87.toolUseId);
        if ($l126 && ($l152 === null || $l152.paths.length > 0 || $l152.overflow || $l152.watchEnds)) $m_$k($l126);
      }
      throw $l151;
    } finally {
      if ($l132 && $l131 !== null) $l133 = $m_Zzn($l131, $l132);
      if ($l130 && $l130 !== "unavailable" && $l135 !== null) $m_$k($l130.repoRoot);
      if ($l124) {
        let $l153 = $m_Vb($m_fe()) ?? $m_Vb($m_Ee());
        if ($l153 !== null) $m_$k($l153);
      }
      if ($l87.toolUseId) $l96?.({ kind: "clear", toolUseId: $l87.toolUseId });
      if (!$m_nft($l85, $m_mx($l87))) $l87.applyFileHistoryOp({ kind: "touch" });
    }
    let $l154 = $l97.toString(), $l155, $l156;
    if ($l106.outputFilePath && $l106.outputTaskId) {
      let $l157, $l158;
      try {
        let $l159 = $m_uO($l87.session);
        $l157 = await $m_dD($l159, $l87.storageV5);
        let $l160 = $m_Z2e($l159, $l106.outputTaskId, false), $l161 = $m_V() && $l87.storageV5 !== void 0 ? $m_g3($m_pws($l160), $m_fws($l160)) : void 0, $l162 = true;
        if ($m_V() && $l87.storageV5 !== void 0 && $l161 !== void 0) {
          let $l163 = await $m_i0r($l87.storageV5, $l161, $l106.outputFilePath, $m_RZ, $m_nyn());
          if ($l162 = $l163 === "today", typeof $l163 === "number") $l155 = $l160, $l156 = $l163;
        }
        if ($l162) $l156 = await $m_ayn($l106.outputFilePath, $l160, $m_RZ), $l155 = $l160;
      } catch ($l164) {
        $l158 = $l164;
      }
      if ($l155 === void 0) $l107.copyFailed($l158, $l157);
    }
    $m_a("tengu_bash_tool_command_executed", { model: $l90, command_type: $m_Sse($l85.command), ...$m_dne($l85.command), stdout_length: $l154.length, stderr_length: 0, exit_code: $l106.code, interrupted: $l103, ...$m_C_t($l106.shellUsage), zsh_note_in_prompt: $l122, executor_shell: await $m_BOo(), executor_shell_overridden: Boolean(process.env.CLAUDE_CODE_SHELL), ...$m_tft($l85.command, $l108), sandboxed: $l119, sandbox_enabled: $l116, dangerously_disable_sandbox: $l85.dangerouslyDisableSandbox ?? false, user_typed_shell_dispatch: $l113, filesystem_policy: $m_c($l117), call_origin: $m_c($l110 ? "remote" : "local"), ...$m_G2n($l85), had_sandbox_violation: $l119 && $l104, was_backgrounded: Boolean($l106.backgroundTaskId), same_as_running_background: $l92, tool_use_id: $l121, destructive_category: $m_c($l120 ?? "none"), destructive_target_scope: $m_c($m_FGe($l85.command, $m_fe(), $l120)), git_destructive_target: $m_c($m_A0($l85.command, $l120)), permission_mode: $m_c($l87.permissions().mode) });
    let $l165 = $m_Rzn($l85.command);
    if ($l165) $m_a("tengu_code_indexing_tool_used", { tool: $m_c($l165), source: $m_b("cli"), success: $l106.code === 0 });
    let $l166 = $m_YLr($l154);
    $l166 = $m_UFt($l166, { command: $l85.command, pendingHint: $l87.session.pendingHint, isMainThread: $l109, surface: "shell" });
    let $l167 = $l106.timedOutAfterMs === void 0 && $m_o4n($l166), $l168 = $l166;
    if ($l167) {
      let $l169 = await $m_JLr($l166, $l106.outputFilePath, $l156, $m_md($l87.mainLoopModel()));
      if ($l169) $l168 = $l169;
      else $l167 = false;
    }
    let $l170 = $l106.backgroundTaskId ? void 0 : $m_KYs($l85.command, $l108, $l87.toolState.get($m_oBo)), $l171 = $l106.backgroundTaskId && $m_WGe($l85.command) ? $m_u6n($m_fe()) : void 0, $l172 = $l106.backgroundTaskId !== void 0 && ($m__At($l87.agentContext) || $l87.agentId === void 0 && $m_a$t()) ? true : void 0, $l173;
    if (!$l106.backgroundTaskId) {
      let $l174 = $m_Fjt($l85.command, $l108);
      if (Object.keys($l174).length > 0) $l173 = $l174;
      if (!$l87.remoteCall) $m_p9n($l174, $l108, { command: $l85.command, exitCode: $l106.code, cwd: $l100 });
    }
    let $l175;
    if (!$l103 && !$l167 && !$l106.backgroundTaskId) {
      let $l176 = await $m_Aws($l85.command, $l87.readFileState, $l91);
      if ($l176.length > 0) {
        let $l177 = $m_fe(), $l178 = 5, $l179 = $l176.slice(0, 5).map(($l180) => $m_mws($l177, $l180) || $l180).join(", "), $l181 = $l176.length > 5 ? ` and ${$l176.length - 5} more` : "", $l182 = $m_a3s($m_Ve, $l87.tools);
        $l175 = `[This command modified ${$l176.length} ${$m_O($l176.length, "file")} you've previously read: ${$l179}${$l181}. Call ${$l182} before editing.]`;
      }
    }
    let $l183 = $l106.backgroundTaskId ? void 0 : $l124 ? { files: [], moreFiles: 0, skipped: true } : $l134 ? $l134.diff ?? void 0 : $l130 === "unavailable" ? { files: [], moreFiles: 0, unavailable: true } : $l130 && $l103 ? void 0 : $l130 ? $l135 ?? ($l133 ? { files: [], moreFiles: 0, shared: true } : void 0) : void 0, $l184 = $l183 && $l133 && !$l183.skipped ? { ...$l183, shared: true } : $l183;
    if ($l184?.unavailable) $m_f("bash_edit_diff", $l103 ? "interrupted" : "unavailable");
    else if ($l184 && !$l184.skipped) $m_g("bash_edit_diff");
    if (!$l103 && !$l167 && !$l106.backgroundTaskId) {
      let $l185 = [$l98, $l99, $l175, $l170].reduce(($l186, $l187) => $l186 + ($l187 ? $l187.length + $m_Z4.length : 0), 0), $l188 = $l155 !== void 0 || $l154.length > $m_Toe() || $l87.innerCall === true || $l168.length + $l185 > $m_iue($m_Fe, $m_Iet(), $m_oit);
      await $m_Mzn($l85.command, $l87.readFileState, $l95.signal, $l106.code, $l188 ? void 0 : $l168, $l87.remoteCall === void 0 && $l87.nestedMemoryAttachmentTriggers ? { triggers: $l87.nestedMemoryAttachmentTriggers, permissions: $l87.permissions } : void 0);
    }
    let $l189 = { stdout: $l168, stderr: $l99 ? [$l98, $l99].filter(Boolean).join($m_Z4) : $l98, interrupted: $l103, isImage: $l167, returnCodeInterpretation: $l101?.message, noOutputExpected: $m_kws($l85.command), backgroundTaskId: $l106.backgroundTaskId, ...$l106.backgroundTaskId !== void 0 && $l87.keptBackgroundShells !== void 0 && { backgroundOutputPath: $m_Au($l106.backgroundTaskId) }, backgroundedByUser: $l106.backgroundedByUser, backgroundedByTurnAbort: $l106.backgroundedByTurnAbort, backgroundedToDeliverMessage: $l106.backgroundedToDeliverMessage, timedOutAfterMs: $l106.timedOutAfterMs, subagentCapApplied: $l106.subagentCapApplied, backgroundEndsWithFinalResponse: $l172, backgroundCwdHint: $l171, dangerouslyDisableSandbox: "dangerouslyDisableSandbox" in $l85 ? $l85.dangerouslyDisableSandbox : void 0, persistedOutputPath: $l155, persistedOutputSize: $l156, staleReadFileStateHint: $l175, ghRateLimitHint: $l170, gitOperation: $l173, bashEditDiff: $l184 };
    if ($l189.backgroundTaskId !== void 0 && $m_AHe()) $m_a("tengu_bash_task_ack", { trigger: $l189.backgroundedByUser ? $m_b("user") : $l189.backgroundedByTurnAbort ? $m_b("turn_abort") : $l189.backgroundedToDeliverMessage ? $m_b("deliver_message") : $l189.timedOutAfterMs !== void 0 ? $m_b("timeout") : $m_b("explicit"), ends_with_final_response: $l189.backgroundEndsWithFinalResponse === true, shell: $m_b("bash") });
    return { data: $l189, ...$l105 !== void 0 && { sandboxViolations: $l105 }, sandboxed: $l119, ...$l104 && !$l103 && { remedy: { kind: "sandbox_violation" } } };
  } };
} });
