SELF = { poll_events: ($l0) => $l0.deliveredVia !== void 0 ? [] : $m_Zl([$m_Ie({ content: $l0.userRoleGuard === true ? $m_TTs($l0) : $m_sEt($m_HZ($l0.envelopes, $l0.remainingWakeCount, $l0.toolsUsed), $l0.media), isMeta: true })]), directory: ($l1) => $m_Zl([$m_Ese($m_Fe, { command: `ls ${$m_vo([$l1.path])}`, description: `Lists files in ${$l1.path}` }), $m_Tse($m_Ai, { stdout: $l1.content, stderr: "", interrupted: false })]), edited_text_file: ($l2) => {
  let $l3 = `Note: ${$m_xf($l2.filename)} changed on disk since you last read it. That's usually deliberate, so take it as the current state rather than reverting it; if the change looks wrong, say so rather than undoing it yourself \u2014 otherwise no need to call it out.`;
  return $m_Zl([$m_Ie({ content: $l2.snippet === "" ? `${$l3} The changes are not shown here; use ${$m_Ve} if you need the current content.` : `${$l3} Here are the relevant changes (shown with line numbers):
${$l2.snippet}`, isMeta: true })]);
}, at_mention_reference: ($l4) => {
  let $l5 = `The user @-mentioned ${$l4.mentions.map($m_xf).join(", ")}`, $l6 = "if these are files or directories in your working directory, read them with your file tools before responding.";
  switch ($l4.unread) {
    case "too_large":
      return $m_Zl([$m_Ie({ content: `${$l5} (${$m_Qt($l4.fileSize)}). Its contents were not attached because the file is too large to read all at once. Read it in portions with the offset and limit parameters, starting with a few hundred lines, or search for specific content instead of reading the whole file. Only if you genuinely need all of it, call ${$m_Ve} with ${$m_Dee}: true, which reads it whole when it still fits in your context.`, isMeta: true })]);
    case "unexamined":
      return $m_Zl([$m_Ie({ content: `${$l5}. They could not be examined and were not attached: if these are files or directories in your working directory, read them with your file tools before responding.`, isMeta: true })]);
    case void 0: {
      let $l7 = `call ${$m_Ve} on ${$l4.mentions.length === 1 ? "that path" : "each path"} before responding. For a PDF of up to ${$m_mxt} pages ${$m_Ve} returns the whole document, text and pictures, so no ${$m_oo} or shell command is needed just to view it.`;
      return $m_Zl([$m_Ie({ content: `${$l5}. File contents are not attached automatically in this session: ${$l4.arePdfsToReadPlainly ? $l7 : "if these are files or directories in your working directory, read them with your file tools before responding."}`, isMeta: true })]);
    }
  }
}, compact_file_reference: ($l8) => $m_Zl([$m_Ie({ content: `Note: ${$m_xf($l8.filename)} was read before the last conversation was summarized, but the contents are too large to include. Use ${$m_Ve} tool if you need to access it.`, isMeta: true })]), pdf_reference: ($l9) => {
  if ("modelReadsByPage" in $l9 && $l9.modelReadsByPage && typeof $l9.pageCount === "number" && $l9.pageCount > 0) return $m_Zl([$m_Ie({ content: `PDF file: ${$m_xf($l9.filename)} (${$l9.pageCount} ${$m_O($l9.pageCount, "page")}, ${$m_Qt($l9.fileSize)}). You have NOT seen this file: none of its content is in this conversation. ` + ($l9.wholeRefusedByModel ? `This model cannot be sent a PDF file, only its pages as images. Before you write anything else, call the ${$m_Ve} tool with file_path set to this path and pages: "1-${$l9.pageCount}", as a tool call and not as text; that reads all of it. A call without pages fails. Do not describe, quote or summarise the file until the tool has returned its pages.` : `Before you write anything else, call the ${$m_Ve} tool with file_path set to this path and a range of a few pages (for example pages: "1-5"), as a tool call and not as text. A call without pages fails. Then read on, about five pages a call (${$m_m3} at most), until you have seen what the request needs. Do not describe, quote or summarise any page that the tool has not returned. If you answer from part of the file, tell the user which pages you read.`), isMeta: true })]);
  return $m_Zl([$m_Ie({ content: $l9.stillArriving ? `PDF file: ${$m_xf($l9.filename)}. It came with a user message whose files were still being downloaded when this turn began, so its content is not included here. Read it with the ${$m_Ve} tool: the call waits while the files download, ten minutes at most. If a read without the pages parameter fails, as it does for a PDF of more than ${$m_mxt} pages, read specific page ranges instead (e.g., pages: "1-5"). Maximum ${$m_m3} pages per request. If ${$m_Ve} reports that the file does not exist, it did not arrive.` : ($l9.pageCount === null ? `PDF file: ${$m_xf($l9.filename)} (page count unknown, ${$m_Qt($l9.fileSize)}). It was not attached because ${$l9.wholeRefusedByModel ? "this model cannot be sent a PDF file, only its pages as images, so a read without pages will fail" : "it may be too long"}. Use the ${$m_Ve} tool with the pages parameter to read specific page ranges (e.g., pages: "1-5"). ` : `PDF file: ${$m_xf($l9.filename)} (${$l9.pageCount} ${$m_O($l9.pageCount, "page")}, ${$m_Qt($l9.fileSize)}). ${$l9.wholeRefusedByModel ? `This model cannot be sent a PDF file, only its pages as images${$l9.pageCount > 0 ? `; pages: "1-${$l9.pageCount}" reads all of it` : ""}.` : "This PDF is too large to read all at once."} You MUST use the ${$m_Ve} tool with the pages parameter to read specific page ranges (e.g., pages: "1-5"). Do NOT call ${$m_Ve} without the pages parameter or it will fail. `) + `${$l9.wholeRefusedByModel && $l9.pageCount !== null ? "" : "Start by reading the first few pages to understand the structure, then read more as needed. "}Maximum 20 pages per request.`, isMeta: true })]);
}, selected_lines_in_ide: ($l10) => $m_Zl([$m_Ie({ content: `The user selected the lines ${$l10.lineStart} to ${$l10.lineEnd} from ${$m_xf($l10.filename)}:
${$m_n3n($l10.content)}

This may or may not be related to the current task.`, isMeta: true })]), selected_lines_in_diff: ($l11) => $m_Zl([$m_Ie({ content: `The user selected the following ${$l11.lineCount} ${$l11.lineCount === 1 ? "line" : "lines"} from the diff view${$l11.filePath ? ` (in ${$m_xf($l11.filePath)})` : ""}:
${$m_n3n($l11.content)}

This may or may not be related to the current task.`, isMeta: true })]), opened_file_in_ide: ($l12) => $m_Zl([$m_Ie({ content: `The user opened the file ${$m_xf($l12.filename)} in the IDE. This may or may not be related to the current task.`, isMeta: true })]), plan_file_reference: ($l13) => $m_Zl([$m_Ie({ content: `${$l13.planFilePath ? `A plan file exists from plan mode at: ${$l13.planFilePath}` : "A plan exists from plan mode."}

Plan contents:

${$l13.planContent}

If this plan is relevant to the current work and not already complete, continue working on it.`, isMeta: true })]), nested_memory: ($l14) => $m_Zl([$m_Ie({ content: $m_G6(`Contents of ${$l14.content.path}:

${$l14.content.content}`), isMeta: true, ...$l14.content.unverified && { content: $m_KSn([$l14.content]) } })]), withheld_memory: () => [], read_truncation_notice: ($l15) => $m_Zl([$m_Ie({ content: $m__D($l15.banner), isMeta: true })]), dir_sync_notice: ($l16) => $m_Zl([$m_Ie({ content: $m_ZW($l16.content), isMeta: true })]), goals: ($l17) => [], bash_output_audience_note: () => $m_Zl([$m_Ie({ content: "Only you see that command's output \u2014 the user's terminal shows at most a few lines of it. If the user needs to read any of it, put it in your reply.", isMeta: true })]), unknown_command_fallback: ($l18) => $m_Zl([$m_Ie({ content: $m_tvs($l18), isMeta: true })]), agent_mention: ($l19) => $m_Zl([$m_Ie({ content: `The user has expressed a desire to invoke the agent "${$l19.agentType}". Please invoke the agent appropriately, passing in the required context to it. `, isMeta: true })]), peer_mention: ($l20) => $m_Zl([$m_Ie({ content: $m_Mvs($l20), isMeta: true })]), skill_mention: ($l21) => $m_Zl([$m_Ie({ content: `The user's message contains /${$l21.skillName}, which is the name of a skill. If they are asking you to run it, call the ${$m_oo} tool with skill: "${$l21.skillName}", passing any arguments they gave as args. If they only mention it, do not run it.`, isMeta: true })]), skill_listing: ($l22) => {
  if (!$l22.content) return [];
  return $m_Zl([$m_Ie({ content: `The following skills are available for use with the Skill tool:

${$l22.content}`, isMeta: true })]);
}, dynamic_skill: ($l23) => {
  let $l24 = $m_rf();
  if ($l24 === null) return [];
  let $l25 = $l24.endsWith($NEW_chunk_e6aww6q8_js_I4n) ? $l24 : $l24 + $NEW_chunk_e6aww6q8_js_I4n;
  if (!$l23.skillDir || !$NEW_chunk_e6aww6q8_js_ZAs($l23.skillDir) || !$l23.skillDir.startsWith($l25)) return [];
  let $l26 = $NEW_chunk_e6aww6q8_js_exs($l24, $l23.skillDir);
  if ($m_dmr.test($l26)) return [];
  let $l27 = $l23.skillNames.filter($m_cK);
  if ($l27.length === 0) return [];
  return $m_Zl([$m_Ie({ content: `New skills discovered in ${$l26}, now available via the Skill tool:
${$l27.map(($l28) => `- ${$l28}`).join(`
`)}`, isMeta: true })]);
}, output_style: ($l29) => {
  if (typeof $l29.style !== "string" || $l29.style === "") return [];
  if ($l29.style.length > $m_AN) return $m_t(`Output style name exceeds ${$m_AN} characters (${$l29.style.length}); suppressing its per-turn reminder`, { level: "error" }), [];
  return $m_Zl([$m_Ie({ content: `${$m__D($l29.style)} output style is active. ${$l29.turnReminder ?? "Remember to follow the specific guidelines for this style."}`, isMeta: true })]);
}, critical_system_reminder: ($l30) => $m_Zl([$m_Ie({ content: $l30.content, isMeta: true })]), plan_mode_exit: ($l31) => {
  let $l32 = $l31.planExists ? ` The plan file is located at ${$l31.planFilePath} if you need to reference it.` : "";
  return $m_Zl([$m_Ie({ content: `## Exited Plan Mode

You have exited plan mode. You can now make edits, run tools, and take actions.${$l32}`, isMeta: true })]);
}, auto_mode_exit: ($l33) => {
  let $l34 = $l33.finishExposedWork ? " The auto-mode guidance to fix what the task exposed and not end the turn on an offer no longer applies." : "", $l35 = $l33.bashFirst ? " Resume using the dedicated tools for file reads, searches, and edits." : "", $l36 = $l33.steerOnly ? `## Exited Auto Mode

You have exited auto mode.${$l34}${$l35}` : `## Exited Auto Mode

You have exited auto mode. The user may now want to interact more directly. You should ask clarifying questions when the approach is ambiguous rather than making assumptions.${$l34}${$l35}`;
  return $m_Zl([$m_Ie({ content: $l36, isMeta: true })]);
}, token_usage: ($l37) => [$m_Ie({ content: $m_Xa(`Token usage: ${$l37.used}/${$l37.total}; ${$l37.remaining} remaining`), isMeta: true })], total_tokens_reminder: ($l38) => [$m_Ie({ content: $m_Xa($l38.text), isMeta: true })], output_limit_note: ($l39) => [$m_Ie({ content: $m_Xa($l39.text), isMeta: true })], silent_turn_reminder: ($l40) => [$m_Ie({ content: $m_Xa($l40.text), isMeta: true })], elapsed_time_reminder: ($l41) => [$m_Ie({ content: $m_Xa($l41.text), isMeta: true })], batching_reminder: ($l42) => [$m_Ie({ content: $m_Xa($l42.text), isMeta: true })], secondary_reminder: ($l43) => [$m_Ie({ content: $m_Xa($l43.text), isMeta: true })], budget_usd: ($l44) => [$m_Ie({ content: $m_Xa(`USD budget: $${$l44.used}/$${$l44.total}; $${$l44.remaining} remaining`), isMeta: true })], output_token_usage: ($l45) => {
  let $l46 = $l45.budget !== null ? `${$m_Oi($l45.turn)} / ${$m_Oi($l45.budget)}` : $m_Oi($l45.turn);
  return [$m_Ie({ content: $m_Xa(`Output tokens \u2014 turn: ${$l46} \xB7 session: ${$m_Oi($l45.session)}`), isMeta: true })];
}, hook_blocking_error: ($l47) => [$m_Ie({ content: $m_VOe(`${$l47.hookName} hook blocking error from command: "${$l47.blockingError.command}": ${$l47.blockingError.blockingError}`), isMeta: true })], hook_additional_context: ($l48) => {
  if ($l48.content.length === 0) return [];
  return [$m_Ie({ content: $m_VOe(`${$l48.hookName} hook additional context: ${$l48.content.join(`
`)}`), isMeta: true })];
}, inlined_image_paths: ($l49) => {
  let $l50 = Array.isArray($l49.paths) ? $l49.paths.filter(($l51) => typeof $l51 === "string") : [];
  if ($l50.length === 0) return [];
  return [$m_Ie({ content: $m_Xa($m_q3n($l50)), isMeta: true })];
}, hook_stopped_continuation: ($l52) => [$m_Ie({ content: $m_VOe(`${$l52.hookName} hook stopped continuation: ${$l52.message}`), isMeta: true })], prefix_delta: ($l53) => typeof $l53.text !== "string" ? [] : $m_Zl([$m_Ie({ content: $l53.text, isMeta: true })]), thread_state: ($l54) => {
  let $l55 = $m_OSt($l54.sinceUser, $l54.repliesSinceUser);
  return $l55 === void 0 ? [] : $m_Zl([$m_Ie({ content: $l55, isMeta: true })]);
}, date_change: ($l56) => $m_Zl([$m_Ie({ content: `The date has changed. Today's date is now ${$l56.newDate}. No need to announce the new date \u2014 the user's own clock shows it.`, isMeta: true })]), sandbox_instructions: ($l57) => {
  if (typeof $l57.content !== "string") return [];
  return $m_Zl([$m_Ie({ content: $l57.content === "" ? $m_evs : $l57.content, isMeta: true })]);
}, artifact_opening_prefetch: ($l58) => {
  if (typeof $l58.content !== "string" || $l58.content === "") return [];
  return $m_Zl([$m_Ie({ content: $m_srt($l58.content), isMeta: true })]);
}, environment: ($l59) => {
  let $l60 = $m_lLe().safeParse($l59.snapshot);
  if (!$l60.success) return [];
  let $l61 = Array.isArray($l59.changes) ? $m_Rkt($l60.data, $l59.changes.flatMap(($l62) => {
    let $l63 = $m_dLe().safeParse($l62);
    return $l63.success ? [$l63.data] : [];
  })) : $m_vkt($l60.data);
  if ($l61 === "") return [];
  return $m_Zl([$m_Ie({ content: $l61, isMeta: true })]);
}, model: ($l64) => {
  let $l65 = $m_hLe().safeParse($l64.identity);
  if (!$l65.success) return [];
  let $l66 = $m_Lkt({ ...$l64, identity: $l65.data });
  if ($l66 === null || $l66 === "") return [];
  return $m_Zl([$m_Ie({ content: $l66, isMeta: true })]);
}, output_style_instructions: ($l67) => {
  let $l68 = $m_h3().safeParse($l67.style);
  if (!$l68.success) return [];
  return $m_Zl([$m_Ie({ content: $m_Fkt($l68.data), isMeta: true })]);
}, session_context: ($l69) => {
  let $l70 = $m_T3().safeParse($l69.context);
  if (!$l70.success) return [];
  let $l71 = $m_jkt($l70.data, $l69.changed === true, $m_Ukt().safeParse($l69.reason).data);
  if ($l71 === "") return [];
  return $m_Zl([$m_Ie({ content: $l71, isMeta: true })]);
}, coordinator_context: ($l72) => {
  let $l73 = $m__in().safeParse($l72);
  if (!$m_Net() || !$l73.success) return [];
  let { content: $l74, changed: $l75 } = $l73.data;
  if ($l74 === "") return $l75 === true ? $m_Zl([$m_Ie({ content: "Coordinator mode has ended; the earlier list of worker tools no longer applies.", isMeta: true })]) : [];
  return $m_Zl([$m_Ie({ content: `${$l75 === true ? `The worker tools have changed; this replaces the earlier list.

` : ""}${$l74}

${$m_VN}`, isMeta: true })]);
}, context_sections: ($l76) => {
  let $l77 = $m_Sin().safeParse($l76);
  if (!$l77.success) return [];
  let { sections: $l78 } = $l77.data;
  if ($l78.length === 0) return [];
  let $l79 = $l78.map(($l80) => `# ${$l80.name}
${$l80.text}`).join(`
`);
  return $m_Zl([$m_Ie({ content: `${$l79}

${$m_VN}`, isMeta: true })]);
}, project_doc_reads: () => [], prompt_snapshot: () => [], prompt_render_point: () => [], thinking_stripped: () => [], advisor_stripped: () => [], thinking_drop: () => [], credential_org: () => [], deferred_tools_record: () => [], instructions: ($l81) => {
  let $l82 = $m_v1().safeParse($l81);
  if (!$l82.success) return [];
  let $l83 = $m_Xkt($l82.data);
  if ($l83 === "") return [];
  return $m_Zl([$m_Ie({ content: $l83, isMeta: true })]);
}, date: ($l84) => {
  let $l85 = $m_v3().safeParse($l84);
  if (!$l85.success) return [];
  return $m_Zl([$m_Ie({ content: $m_Wkt($l85.data), isMeta: true })]);
}, fork_briefing: ($l86) => typeof $l86.text === "string" && $l86.text !== "" ? $m_Zl([$m_Ie({ content: $m_srt($l86.text), isMeta: true })]) : [], language: ($l87) => {
  let $l88 = $m__3().safeParse($l87.language);
  if (!$l88.success) return [];
  return $m_Zl([$m_Ie({ content: $m_$kt($l88.data), isMeta: true })]);
}, ultrathink_effort: () => $m_Zl([$m_Ie({ content: 'The user included the keyword "ultrathink", requesting deeper reasoning on this turn. Reason as thoroughly as the task warrants.', isMeta: true })]), workflow_keyword_request: () => $m_Zl([$m_Ie({ content: 'The user included the keyword "ultracode", opting this turn into multi-agent orchestration \u2014 use the Workflow tool to fulfill the request.', isMeta: true })]), ultra_effort_enter: ({ reminderType: $l89 }) => $m_Zl([$m_Ie({ content: $l89 === "full" ? "Ultracode is on: optimize for the most exhaustive, correct answer \u2014 not the fastest or cheapest. Use the Workflow tool on every substantive task; token cost is not a constraint. See the **Ultracode** section and quality patterns in the workflow authoring reference. Solo only on conversational/trivial turns." : "Ultracode is still on \u2014 use the Workflow tool; see the Ultracode section of the workflow authoring reference.", isMeta: true })]), ultra_effort_exit: () => $m_Zl([$m_Ie({ content: "Ultracode is off \u2014 the Workflow tool's standard opt-in rule applies again.", isMeta: true })]), tool_host_result_lines: () => [], tool_hosts_correction: ($l90) => {
  let $l91 = $m__i($l90.lines);
  return $l91.length === 0 ? [] : $m_Zl([$m_Ie({ content: $l91.join(`
`), isMeta: true })]);
}, tool_hosts_notice: ($l92) => {
  let $l93 = $m__i($l92.lines);
  if ($l93.length === 0) return [];
  return $m_Zl([$m_Ie({ content: `${$l93.join(`
`)}

${$m_VN}`, isMeta: true })]);
}, remote_session_change: ($l94) => {
  let $l95 = $m_ELe().safeParse($l94);
  if (!$l95.success) return [];
  return $m_Zl([$m_Ie({ content: $m_oSt($l95.data), isMeta: true })]);
}, advisor_tool: ($l96) => {
  let $l97 = $m_FBr().safeParse($l96);
  if (!$l97.success) return [];
  return $m_Zl([$m_Ie({ content: $m_hqs($l97.data.available, $l97.data.available && $l97.data.abbreviated), isMeta: true })]);
}, workflow_size_guideline_change: ({ size: $l98 }) => $m_Zl([$m_Ie({ content: $m_Aoi($l98), isMeta: true })]), cowork_memory_context: ({ content: $l99, anchor: $l100, toolsOnly: $l101 }) => $l100 ? [] : $m_Zl([$m_Ie({ content: $l99 === null ? $l101 ? "The account memory tool results from earlier in this conversation, and any memory snapshot shown before them, have been removed; do not rely on anything they said." : "The memory snapshot shown earlier has been removed from this conversation; do not rely on anything it said." : $m_G6($l99), isMeta: true })]), account_memory_recall: ({ content: $l102 }) => $m_Zl([$m_Ie({ content: $m_G6($l102), isMeta: true })]), already_read_file: () => [], async_hook_response_batch: () => [], batching_reminder_sent: () => [], secondary_reminder_sent: () => [], command_permissions: () => [], edited_image_file: () => [], hook_cancelled: () => [], hook_error_during_execution: () => [], hook_non_blocking_error: () => [], hook_system_message: () => [], hook_permission_decision: () => [], hook_deferred_tool: () => [], goal_status: () => [], session_cron_carry: () => [], projects_thread_ask: () => [], structured_output: () => [], max_turns_reached: () => [], teammate_shutdown_batch: () => [] };
