function SELF($l0, $l1, { backgroundedByUser: $l2 = false, ending: $l3 } = {}) {
  let $l4 = $l3 === "final_response" ? $m_Jbt() : $m_l() ? "If it finishes while you are still working, its result is delivered to you automatically between your tool calls, so there is no need to check whether it is done or to sleep; if you need its result before you reply, wait with one foreground shell command that blocks until the output file shows what you need." : $l2 ? "Its result is delivered to you automatically when it finishes; carry on without waiting for it." : `When it finishes, its result is delivered to you automatically \u2014 ${$m_Ybt} \u2014 so there is no need to check whether it is done or to sleep; if that result is all you are waiting for, end your turn.`, $l5 = { resultType: "task", taskId: $l0, status: "working", statusMessage: `${$l1} ${$l4}` };
  return $m__($l5);
}
;
