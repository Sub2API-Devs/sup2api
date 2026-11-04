function SELF($l0, $l1, $l2, $l3) {
  let $l4 = $l0.blockStore, { generation: $l5 } = $l4;
  return ($l6) => {
    if (!$l6?.ok || $l0.blocksBuildGeneration === $l5) return;
    $l0.blocksBuildGeneration = $l5, $l1.setTimeout(async () => {
      try {
        if (!$l0.blocksSwitchedOff && $m_Cc() !== 0 && $l4.generation === $l5) await $m_IGo($m_xGo({ body: Buffer.from($l2), level: $l3, store: $l4, clock: $l1 }), $l4, $l1, { inBackground: true, stopIf: () => $l0.blocksSwitchedOff !== false });
      } catch ($l7) {
        if (!$l0.blocksSwitchedOff || $l7 instanceof $m_awt) $m_Fc($l7, $l0, "build_failed");
      } finally {
        if ($l0.blocksBuildGeneration === $l5) $l0.blocksBuildGeneration = void 0;
      }
    }, $m_Oc, { unref: true });
  };
}
;
