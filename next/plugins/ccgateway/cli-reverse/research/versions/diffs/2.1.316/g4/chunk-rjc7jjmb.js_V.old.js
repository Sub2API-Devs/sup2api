function SELF({ firstEmitPhases: $l0, startupContext: $l1 }, { late: $l2 }) {
  let $l3 = $m_Mme().getEntriesByType("mark");
  if ($l3.length === 0) return null;
  let $l4 = /* @__PURE__ */ new Map();
  for (let $l5 of $l3) $l4.set($l5.name, $l5.startTime);
  let $l6 = $l4.get("main_after_run"), $l7 = {}, $l8 = 0, $l9 = 0;
  for (let [$l10, [$l11, $l12]] of Object.entries($m_pe)) {
    if ($l2 && $l0.has($l10)) continue;
    let $l13 = $l4.get($l11), $l14 = $l4.get($l12);
    if ($l13 !== void 0 && $l14 !== void 0) {
      let $l15 = Math.round($l14 - $l13);
      if ($l7[`${$l10}_ms`] = $l15, $l8++, !$l2) $l0.add($l10);
      if (!$m_ce.has($l10) && ($l6 === void 0 || $l14 <= $l6)) $l9 += $l15;
    }
  }
  if ($l2) {
    if ($l8 === 0) return null;
    $l7.late = true;
  } else $l7.late = false;
  let $l16 = $l7.total_time_ms;
  if (typeof $l16 === "number") $l7.gap_unaccounted_ms = Math.max(0, $l16 - $l9);
  $l7.free_mem_mb = Math.round($m_F.freemem() / 1048576), $l7.load_avg_1m = Math.round(($m_F.loadavg()[0] ?? 0) * 100) / 100, $l7.checkpoint_count = $l3.length;
  let $l17 = $m_i.CLAUDE_CODE_REMOTE_SESSION_ID;
  if ($l17) $l7.ccr_session_id = $m_ye($l17);
  if ($m_O !== void 0) $l7.node_boot_ms = $m_O;
  let $l18 = $m_P3t();
  if ($l18 !== void 0 && $m_H !== void 0) $l7.spawn_to_first_checkpoint_ms = Math.round($m_H - $l18);
  return Object.assign($l7, $l1), $l7;
}
;
