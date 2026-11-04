function SELF($l0, $l1, $l2) {
  let $l3 = $m_Vr().totalTokensReminderClientDataReported ??= /* @__PURE__ */ new Map();
  if ($l3.get($l0) === $l1) return;
  if ($l3.set($l0, $l1), $l2 !== void 0) $m_a($NEW_chunk_e6aww6q8_js_vlr, $l2);
  else if ($l1 !== void 0) $m_t(`[total_tokens reminder] ignoring clientData ${$l0} of type ${typeof $l1}`, { level: "warn" });
}
;
