function SELF($l0, $l1 = { now: () => (/* @__PURE__ */ new Date()).toISOString(), uuid: () => $m_GEe() }, $l2) {
  let $l3 = $m_ite($l0, $l2);
  return { attachment: $l0, type: "attachment", uuid: $l1.uuid(), timestamp: ($l0.type === "queued_command" || $l0.type === "poll_events") && $l0.timestamp || $l1.now(), ...$l3 };
}
;
