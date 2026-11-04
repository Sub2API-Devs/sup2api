function SELF($l0, $l1, { backgroundedByUser: $l2 = false, ending: $l3 } = {}) {
  let $l4 = $l3 === "final_response" ? $m_Jbt() : $l2 ? "Its result is delivered to you automatically when it finishes; carry on without waiting for it." : `When it finishes, its result is delivered to you automatically \u2014 ${$m_Ybt} \u2014 so there is no need to check whether it is done or to sleep; if that result is all you are waiting for, end your turn.`, $l5 = { resultType: "task", taskId: $l0, status: "working", statusMessage: `${$l1} ${$l4}` };
  return $m__($l5);
}
;
