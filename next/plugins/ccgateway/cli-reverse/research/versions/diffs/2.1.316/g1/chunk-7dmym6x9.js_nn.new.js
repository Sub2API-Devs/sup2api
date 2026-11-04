function SELF($l0, $l1 = { now: () => (/* @__PURE__ */ new Date()).toISOString(), uuid: () => $NEW_chunk_e6aww6q8_js_mAe() }) {
  let $l2 = $m_ite($l0);
  return { attachment: $l0, type: "attachment", uuid: $l1.uuid(), timestamp: ($l0.type === "queued_command" || $l0.type === "poll_events") && $l0.timestamp || $l1.now(), ...$l2 };
}
;
