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
    case void 0:
      return $m_Zl([$m_Ie({ content: `${$l5}. File contents are not attached automatically in this session: if these are files or directories in your working directory, read them with your file tools before responding.`, isMeta: true })]);
  }
}, compact_file_reference: ($l7) => $m_Zl([$m_Ie({ content: `Note: ${$m_xf($l7.filename)} was read before the last conversation was summarized, but the contents are too large to include. Use ${$m_Ve} tool if you need to access it.`, isMeta: true })]), pdf_reference: ($l8) => {
  if ("modelReadsByPage" in $l8 && $l8.modelReadsByPage && typeof $l8.pageCount === "number" && $l8.pageCount > 0) return $m_Zl([$m_Ie({ content: `PDF file: ${$m_xf($l8.filename)} (${$l8.pageCount} ${$m_O($l8.pageCount, "page")}, ${$m_Qt($l8.fileSize)}). You have NOT seen this file: none of its content is in this conversation. ` + ($l8.wholeRefusedByModel ? `This model cannot be sent a PDF file, only its pages as images. Before you write anything else, call the ${$m_Ve} tool with file_path set to this path and pages: "1-${$l8.pageCount}", as a tool call and not as text; that reads all of it. A call without pages fails. Do not describe, quote or summarise the file until the tool has returned its pages.` : `Before you write anything else, call the ${$m_Ve} tool with file_path set to this path and a range of a few pages (for example pages: "1-5"), as a tool call and not as text. A call without pages fails. Then read on, about five pages a call (${$m_m3} at most), until you have seen what the request needs. Do not describe, quote or summarise any page that the tool has not returned. If you answer from part of the file, tell the user which pages you read.`), isMeta: true })]);
  return $m_Zl([$m_Ie({ content: $l8.stillArriving ? `PDF file: ${$m_xf($l8.filename)}. It came with a user message whose files were still being downloaded when this turn began, so its content is not included here. Read it with the ${$m_Ve} tool: the call waits while the files download, ten minutes at most. If a read without the pages parameter fails, as it does for a PDF of more than ${$m_mxt} pages, read specific page ranges instead (e.g., pages: "1-5"). Maximum ${$m_m3} pages per request. If ${$m_Ve} reports that the file does not exist, it did not arrive.` : ($l8.pageCount === null ? `PDF file: ${$m_xf($l8.filename)} (page count unknown, ${$m_Qt($l8.fileSize)}). It was not attached because ${$l8.wholeRefusedByModel ? "this model cannot be sent a PDF file, only its pages as images, so a read without pages will fail" : "it may be too long"}. Use the ${$m_Ve} tool with the pages parameter to read specific page ranges (e.g., pages: "1-5"). ` : `PDF file: ${$m_xf($l8.filename)} (${$l8.pageCount} ${$m_O($l8.pageCount, "page")}, ${$m_Qt($l8.fileSize)}). ${$l8.wholeRefusedByModel ? `This model cannot be sent a PDF file, only its pages as images${$l8.pageCount > 0 ? `; pages: "1-${$l8.pageCount}" reads all of it` : ""}.` : "This PDF is too large to read all at once."} You MUST use the ${$m_Ve} tool with the pages parameter to read specific page ranges (e.g., pages: "1-5"). Do NOT call ${$m_Ve} without the pages parameter or it will fail. `) + `${$l8.wholeRefusedByModel && $l8.pageCount !== null ? "" : "Start by reading the first few pages to understand the structure, then read more as needed. "}Maximum 20 pages per request.`, isMeta: true })]);
}, selected_lines_in_ide: ($l9) => $m_Zl([$m_Ie({ content: `The user selected the lines ${$l9.lineStart} to ${$l9.lineEnd} from ${$m_xf($l9.filename)}:
${$m_n3n($l9.content)}

This may or may not be related to the current task.`, isMeta: true })]), selected_lines_in_diff: ($l10) => $m_Zl([$m_Ie({ content: `The user selected the following ${$l10.lineCount} ${$l10.lineCount === 1 ? "line" : "lines"} from the diff view${$l10.filePath ? ` (in ${$m_xf($l10.filePath)})` : ""}:
${$m_n3n($l10.content)}

This may or may not be related to the current task.`, isMeta: true })]), opened_file_in_ide: ($l11) => $m_Zl([$m_Ie({ content: `The user opened the file ${$m_xf($l11.filename)} in the IDE. This may or may not be related to the current task.`, isMeta: true })]), plan_file_reference: ($l12) => $m_Zl([$m_Ie({ content: `${$l12.planFilePath ? `A plan file exists from plan mode at: ${$l12.planFilePath}` : "A plan exists from plan mode."}

Plan contents:

${$l12.planContent}

If this plan is relevant to the current work and not already complete, continue working on it.`, isMeta: true })]), nested_memory: ($l13) => $m_Zl([$m_Ie({ content: $m_G6(`Contents of ${$l13.content.path}:

${$l13.content.content}`), isMeta: true, ...$l13.content.unverified && { content: $m_KSn([$l13.content]) } })]), withheld_memory: () => [], read_truncation_notice: ($l14) => $m_Zl([$m_Ie({ content: $m__D($l14.banner), isMeta: true })]), dir_sync_notice: ($l15) => $m_Zl([$m_Ie({ content: $m_ZW($l15.content), isMeta: true })]), goals: ($l16) => [], bash_output_audience_note: () => $m_Zl([$m_Ie({ content: "Only you see that command's output \u2014 the user's terminal shows at most a few lines of it. If the user needs to read any of it, put it in your reply.", isMeta: true })]), unknown_command_fallback: ($l17) => $m_Zl([$m_Ie({ content: $m_tvs($l17), isMeta: true })]), agent_mention: ($l18) => $m_Zl([$m_Ie({ content: `The user has expressed a desire to invoke the agent "${$l18.agentType}". Please invoke the agent appropriately, passing in the required context to it. `, isMeta: true })]), peer_mention: ($l19) => $m_Zl([$m_Ie({ content: $m_Mvs($l19), isMeta: true })]), skill_mention: ($l20) => $m_Zl([$m_Ie({ content: `The user's message contains /${$l20.skillName}, which is the name of a skill. If they are asking you to run it, call the ${$m_oo} tool with skill: "${$l20.skillName}", passing any arguments they gave as args. If they only mention it, do not run it.`, isMeta: true })]), skill_listing: ($l21) => {
  if (!$l21.content) return [];
  return $m_Zl([$m_Ie({ content: `The following skills are available for use with the Skill tool:

${$l21.content}`, isMeta: true })]);
}, dynamic_skill: ($l22) => {
  let $l23 = $m_rf();
  if ($l23 === null) return [];
  let $l24 = $l23.endsWith($m_P6n) ? $l23 : $l23 + $m_P6n;
  if (!$l22.skillDir || !$m_Gws($l22.skillDir) || !$l22.skillDir.startsWith($l24)) return [];
  let $l25 = $m_zws($l23, $l22.skillDir);
  if ($m_dmr.test($l25)) return [];
  let $l26 = $l22.skillNames.filter($m_cK);
  if ($l26.length === 0) return [];
  return $m_Zl([$m_Ie({ content: `New skills discovered in ${$l25}, now available via the Skill tool:
${$l26.map(($l27) => `- ${$l27}`).join(`
`)}`, isMeta: true })]);
}, output_style: ($l28) => {
  if (typeof $l28.style !== "string" || $l28.style === "") return [];
  if ($l28.style.length > $m_AN) return $m_t(`Output style name exceeds ${$m_AN} characters (${$l28.style.length}); suppressing its per-turn reminder`, { level: "error" }), [];
  return $m_Zl([$m_Ie({ content: `${$m__D($l28.style)} output style is active. ${$l28.turnReminder ?? "Remember to follow the specific guidelines for this style."}`, isMeta: true })]);
}, critical_system_reminder: ($l29) => $m_Zl([$m_Ie({ content: $l29.content, isMeta: true })]), plan_mode_exit: ($l30) => {
  let $l31 = $l30.planExists ? ` The plan file is located at ${$l30.planFilePath} if you need to reference it.` : "";
  return $m_Zl([$m_Ie({ content: `## Exited Plan Mode

You have exited plan mode. You can now make edits, run tools, and take actions.${$l31}`, isMeta: true })]);
}, auto_mode_exit: ($l32) => {
  let $l33 = $l32.finishExposedWork ? " The auto-mode guidance to fix what the task exposed and not end the turn on an offer no longer applies." : "", $l34 = $l32.bashFirst ? " Resume using the dedicated tools for file reads, searches, and edits." : "", $l35 = $l32.steerOnly ? `## Exited Auto Mode

You have exited auto mode.${$l33}${$l34}` : `## Exited Auto Mode

You have exited auto mode. The user may now want to interact more directly. You should ask clarifying questions when the approach is ambiguous rather than making assumptions.${$l33}${$l34}`;
  return $m_Zl([$m_Ie({ content: $l35, isMeta: true })]);
}, token_usage: ($l36) => [$m_Ie({ content: $m_Xa(`Token usage: ${$l36.used}/${$l36.total}; ${$l36.remaining} remaining`), isMeta: true })], total_tokens_reminder: ($l37) => [$m_Ie({ content: $m_Xa($l37.text), isMeta: true })], output_limit_note: ($l38) => [$m_Ie({ content: $m_Xa($l38.text), isMeta: true })], silent_turn_reminder: ($l39) => [$m_Ie({ content: $m_Xa($l39.text), isMeta: true })], elapsed_time_reminder: ($l40) => [$m_Ie({ content: $m_Xa($l40.text), isMeta: true })], batching_reminder: ($l41) => [$m_Ie({ content: $m_Xa($l41.text), isMeta: true })], secondary_reminder: ($l42) => [$m_Ie({ content: $m_Xa($l42.text), isMeta: true })], budget_usd: ($l43) => [$m_Ie({ content: $m_Xa(`USD budget: $${$l43.used}/$${$l43.total}; $${$l43.remaining} remaining`), isMeta: true })], output_token_usage: ($l44) => {
  let $l45 = $l44.budget !== null ? `${$m_Oi($l44.turn)} / ${$m_Oi($l44.budget)}` : $m_Oi($l44.turn);
  return [$m_Ie({ content: $m_Xa(`Output tokens \u2014 turn: ${$l45} \xB7 session: ${$m_Oi($l44.session)}`), isMeta: true })];
}, hook_blocking_error: ($l46) => [$m_Ie({ content: $m_VOe(`${$l46.hookName} hook blocking error from command: "${$l46.blockingError.command}": ${$l46.blockingError.blockingError}`), isMeta: true })], hook_additional_context: ($l47) => {
  if ($l47.content.length === 0) return [];
  return [$m_Ie({ content: $m_VOe(`${$l47.hookName} hook additional context: ${$l47.content.join(`
`)}`), isMeta: true })];
}, inlined_image_paths: ($l48) => {
  let $l49 = Array.isArray($l48.paths) ? $l48.paths.filter(($l50) => typeof $l50 === "string") : [];
  if ($l49.length === 0) return [];
  return [$m_Ie({ content: $m_Xa($m_q3n($l49)), isMeta: true })];
}, hook_stopped_continuation: ($l51) => [$m_Ie({ content: $m_VOe(`${$l51.hookName} hook stopped continuation: ${$l51.message}`), isMeta: true })], prefix_delta: ($l52) => typeof $l52.text !== "string" ? [] : $m_Zl([$m_Ie({ content: $l52.text, isMeta: true })]), thread_state: ($l53) => {
  let $l54 = $m_OSt($l53.sinceUser, $l53.repliesSinceUser);
  return $l54 === void 0 ? [] : $m_Zl([$m_Ie({ content: $l54, isMeta: true })]);
}, date_change: ($l55) => $m_Zl([$m_Ie({ content: `The date has changed. Today's date is now ${$l55.newDate}. No need to announce the new date \u2014 the user's own clock shows it.`, isMeta: true })]), sandbox_instructions: ($l56) => {
  if (typeof $l56.content !== "string") return [];
  return $m_Zl([$m_Ie({ content: $l56.content === "" ? $m_evs : $l56.content, isMeta: true })]);
}, artifact_opening_prefetch: ($l57) => {
  if (typeof $l57.content !== "string" || $l57.content === "") return [];
  return $m_Zl([$m_Ie({ content: $m_srt($l57.content), isMeta: true })]);
}, environment: ($l58) => {
  let $l59 = $m_lLe().safeParse($l58.snapshot);
  if (!$l59.success) return [];
  let $l60 = Array.isArray($l58.changes) ? $m_Rkt($l59.data, $l58.changes.flatMap(($l61) => {
    let $l62 = $m_dLe().safeParse($l61);
    return $l62.success ? [$l62.data] : [];
  })) : $m_vkt($l59.data);
  if ($l60 === "") return [];
  return $m_Zl([$m_Ie({ content: $l60, isMeta: true })]);
}, model: ($l63) => {
  let $l64 = $m_hLe().safeParse($l63.identity);
  if (!$l64.success) return [];
  let $l65 = $m_Lkt({ ...$l63, identity: $l64.data });
  if ($l65 === null || $l65 === "") return [];
  return $m_Zl([$m_Ie({ content: $l65, isMeta: true })]);
}, output_style_instructions: ($l66) => {
  let $l67 = $m_h3().safeParse($l66.style);
  if (!$l67.success) return [];
  return $m_Zl([$m_Ie({ content: $m_Fkt($l67.data), isMeta: true })]);
}, session_context: ($l68) => {
  let $l69 = $m_T3().safeParse($l68.context);
  if (!$l69.success) return [];
  let $l70 = $m_jkt($l69.data, $l68.changed === true, $m_Ukt().safeParse($l68.reason).data);
  if ($l70 === "") return [];
  return $m_Zl([$m_Ie({ content: $l70, isMeta: true })]);
}, coordinator_context: ($l71) => {
  let $l72 = $m__in().safeParse($l71);
  if (!$m_Net() || !$l72.success) return [];
  let { content: $l73, changed: $l74 } = $l72.data;
  if ($l73 === "") return $l74 === true ? $m_Zl([$m_Ie({ content: "Coordinator mode has ended; the earlier list of worker tools no longer applies.", isMeta: true })]) : [];
  return $m_Zl([$m_Ie({ content: `${$l74 === true ? `The worker tools have changed; this replaces the earlier list.

` : ""}${$l73}

${$m_VN}`, isMeta: true })]);
}, context_sections: ($l75) => {
  let $l76 = $m_Sin().safeParse($l75);
  if (!$l76.success) return [];
  let { sections: $l77 } = $l76.data;
  if ($l77.length === 0) return [];
  let $l78 = $l77.map(($l79) => `# ${$l79.name}
${$l79.text}`).join(`
`);
  return $m_Zl([$m_Ie({ content: `${$l78}

${$m_VN}`, isMeta: true })]);
}, project_doc_reads: () => [], prompt_snapshot: () => [], prompt_render_point: () => [], thinking_stripped: () => [], advisor_stripped: () => [], thinking_drop: () => [], credential_org: () => [], deferred_tools_record: () => [], instructions: ($l80) => {
  let $l81 = $m_v1().safeParse($l80);
  if (!$l81.success) return [];
  let $l82 = $m_Xkt($l81.data);
  if ($l82 === "") return [];
  return $m_Zl([$m_Ie({ content: $l82, isMeta: true })]);
}, date: ($l83) => {
  let $l84 = $m_v3().safeParse($l83);
  if (!$l84.success) return [];
  return $m_Zl([$m_Ie({ content: $m_Wkt($l84.data), isMeta: true })]);
}, fork_briefing: ($l85) => typeof $l85.text === "string" && $l85.text !== "" ? $m_Zl([$m_Ie({ content: $m_srt($l85.text), isMeta: true })]) : [], language: ($l86) => {
  let $l87 = $m__3().safeParse($l86.language);
  if (!$l87.success) return [];
  return $m_Zl([$m_Ie({ content: $m_$kt($l87.data), isMeta: true })]);
}, ultrathink_effort: () => $m_Zl([$m_Ie({ content: 'The user included the keyword "ultrathink", requesting deeper reasoning on this turn. Reason as thoroughly as the task warrants.', isMeta: true })]), workflow_keyword_request: () => $m_Zl([$m_Ie({ content: 'The user included the keyword "ultracode", opting this turn into multi-agent orchestration \u2014 use the Workflow tool to fulfill the request.', isMeta: true })]), ultra_effort_enter: ({ reminderType: $l88 }) => $m_Zl([$m_Ie({ content: $l88 === "full" ? "Ultracode is on: optimize for the most exhaustive, correct answer \u2014 not the fastest or cheapest. Use the Workflow tool on every substantive task; token cost is not a constraint. See the **Ultracode** section and quality patterns in the workflow authoring reference. Solo only on conversational/trivial turns." : "Ultracode is still on \u2014 use the Workflow tool; see the Ultracode section of the workflow authoring reference.", isMeta: true })]), ultra_effort_exit: () => $m_Zl([$m_Ie({ content: "Ultracode is off \u2014 the Workflow tool's standard opt-in rule applies again.", isMeta: true })]), tool_host_result_lines: () => [], tool_hosts_correction: ($l89) => {
  let $l90 = $m__i($l89.lines);
  return $l90.length === 0 ? [] : $m_Zl([$m_Ie({ content: $l90.join(`
`), isMeta: true })]);
}, tool_hosts_notice: ($l91) => {
  let $l92 = $m__i($l91.lines);
  if ($l92.length === 0) return [];
  return $m_Zl([$m_Ie({ content: `${$l92.join(`
`)}

${$m_VN}`, isMeta: true })]);
}, remote_session_change: ($l93) => {
  let $l94 = $m_ELe().safeParse($l93);
  if (!$l94.success) return [];
  return $m_Zl([$m_Ie({ content: $m_oSt($l94.data), isMeta: true })]);
}, advisor_tool: ($l95) => {
  let $l96 = $m_FBr().safeParse($l95);
  if (!$l96.success) return [];
  return $m_Zl([$m_Ie({ content: $m_hqs($l96.data.available, $l96.data.available && $l96.data.abbreviated), isMeta: true })]);
}, workflow_size_guideline_change: ({ size: $l97 }) => $m_Zl([$m_Ie({ content: $m_Aoi($l97), isMeta: true })]), cowork_memory_context: ({ content: $l98, anchor: $l99, toolsOnly: $l100 }) => $l99 ? [] : $m_Zl([$m_Ie({ content: $l98 === null ? $l100 ? "The account memory tool results from earlier in this conversation, and any memory snapshot shown before them, have been removed; do not rely on anything they said." : "The memory snapshot shown earlier has been removed from this conversation; do not rely on anything it said." : $m_G6($l98), isMeta: true })]), account_memory_recall: ({ content: $l101 }) => $m_Zl([$m_Ie({ content: $m_G6($l101), isMeta: true })]), already_read_file: () => [], async_hook_response_batch: () => [], batching_reminder_sent: () => [], secondary_reminder_sent: () => [], command_permissions: () => [], edited_image_file: () => [], hook_cancelled: () => [], hook_error_during_execution: () => [], hook_non_blocking_error: () => [], hook_system_message: () => [], hook_permission_decision: () => [], hook_deferred_tool: () => [], goal_status: () => [], session_cron_carry: () => [], projects_thread_ask: () => [], structured_output: () => [], max_turns_reached: () => [], teammate_shutdown_batch: () => [] };
