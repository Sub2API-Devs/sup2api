SELF = $m_tn({ name: $m_SS, searchHint: "check on a background shell command by task ID", backgrounding: "never", maxResultSizeChars: 1e5, async description() {
  return $m_er;
}, async prompt() {
  return $m_tr();
}, get inputSchema() {
  return $m_ci();
}, get outputSchema() {
  return $m_Mxo();
}, userFacingName() {
  return $m_SS;
}, isEnabled() {
  return false;
}, isConcurrencySafe() {
  return true;
}, isReadOnly() {
  return true;
}, toAutoClassifierInput($l0) {
  return $l0.taskId;
}, renderToolUseMessage({ taskId: $l1 }, { toolUseResult: $l2, verbose: $l3, isTranscriptMode: $l4 }) {
  return !$l3 && !$l4 && ($m_STe($l2)?.status === "working" || $l2 === `Error: ${$m_O_n}`) ? null : $l1 ?? "";
}, extractSearchText() {
  return "";
}, create($l5) {
  return { async validateInput({ taskId: $l6 }) {
    let $l7 = $m_moe($l5);
    if ($m_nr($l6, $l7) || $m_rr($l6, $l5.taskRegistry, $l7) || $l5.toolState.get($m_ZZe).find($l6, $l7)) return { result: true };
    return { result: false, message: $m_or($l6), errorCode: 1 };
  }, async call({ taskId: $l8 }, $l9) {
    let $l10 = $m_moe($l5), $l11 = $m_nr($l8, $l10), $l12 = $m_rr($l8, $l5.taskRegistry, $l10), $l13 = $m_Vn(), $l14 = $l9.innerCall ? void 0 : $l9.parentMessage?.message.id || void 0, $l15 = $l11 ? $l11.snapshot.status : $l12 ? $m_UNs($l12.status) : void 0, $l16 = $l15 === void 0 ? void 0 : { status: $l15, key: $l11 ? `settled:${$l15}` : $l15 }, $l17 = $l14 !== void 0 && $l16 ? $l13.countBashTaskGetInResponse($l14, $l8, $l16.key) : 1;
    if ($l16 && $l17 > $m_Et) throw $m_a("tengu_bash_task_get", { caller: $m_b("model"), status: $m_c($l16.status), get_count_for_task: $l13.countBashTaskGet($l8), repeat_in_response: $l17, short_circuited: true }), new $m_C($m_di($l17, $l16.status), "GetTask: the same call repeated within one response", "gettask_repeat_in_response");
    let $l18 = $l11?.snapshot ?? ($l12 ? $m_BNs($l12.elsewhere ? { ...$l12, outputFile: $m_zt($l12.outputFile) } : $l12, await $m_mi($l12), $l12.agentId !== $l10 ? "other_agent" : $m__At($l5.agentContext) || $l12.elsewhere && $l12.agentId !== void 0 || $l12.agentId === void 0 && $m_a$t() ? "final_response" : void 0) : await $m_t5s($l8, $l10, $l5.toolState, $l9.signal));
    if (!$l18) throw new $m_C($m_or($l8), "GetTask: no background command with this task ID");
    let { signal: $l19 } = $l9;
    if ($l11 && $l11.agentId === $l10 && !$l9.innerCall && !$l19.aborted) {
      $l13.markBashTaskSnapshotFetched($l8);
      let $l20 = $l13.withdrawShellNotification?.($l8, $l10, $l5.taskRegistry);
      if ($l20) $l19.addEventListener("abort", $l20, { once: true });
    }
    return $m_a("tengu_bash_task_get", { caller: $l9.innerCall ? $m_b("script") : $m_b("model"), status: $m_c($l18.status), ...!$l9.innerCall && { get_count_for_task: $l13.countBashTaskGet($l8), repeat_in_response: $l17, short_circuited: false }, since_created_ms: Date.now() - Date.parse($l18.createdAt) }), { data: $l18 };
  } };
}, mapToolResultToToolResultBlockParam($l21, $l22) {
  let $l23 = $m_STe($l21);
  return { tool_use_id: $l22, type: "tool_result", content: $l23 ? $m_pin($l23) : $m__($l21) };
} });
