function SELF($l0, $l1) {
  if ($l0.attachment.type === "coordinator_context" && !$m_Net()) return { messages: [], isKnownType: true, recordedRole: void 0 };
  if ($l0.attachment.type === "file" && $l0.attachment.overTokenLimit === true && $m_vBe()) return SELF({ attachment: { type: "at_mention_reference", mentions: [$l0.attachment.filename] } });
  if (!$m_tUr($l0.attachment.type) && $m_hvs($l0.attachment, $l1?.surfacedToolNames)) {
    let $l2 = $m_mvs($l0.attachment.type === "queued_command" && $l1?.inHumanTurn === true ? $l0.renderedInHumanTurn : $l0.rendered);
    if ($l2 !== null) {
      let { renderedRole: $l3 } = $l0, $l4;
      try {
        $l4 = $m__ft($l0.attachment, $l1);
      } catch ($l5) {
        $m_l($l5);
      }
      return { messages: $l4?.length === $l2.length ? $l4.map(($l6, $l7) => ({ ...$l6, message: { ...$l6.message, content: $l2[$l7].content } })) : $l2.map(($l8) => $m_Ie({ content: $l8.content, isMeta: true })), isKnownType: $l4 !== void 0, recordedRole: $l3 === "system" || $l3 === "user" ? $l3 : void 0 };
    }
  }
  let $l9 = $m__ft($l0.attachment, $l1);
  return { messages: $l9 ?? [], isKnownType: $l9 !== void 0, recordedRole: void 0 };
}
;
