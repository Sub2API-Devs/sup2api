async function SELF($l0) {
  try {
    if (!$m_ahr()) return;
    let [$l1, $l2] = await Promise.all([$m_Aoo({ includeMcpServers: false, signal: AbortSignal.timeout($m_s), alsoLookFor: $m_c, maxTools: $m_yWr }), $m_Pe($NEW_chunk_7cks3gqr_js_u($l0, { bigint: true }), $m_s).catch(() => {
      return;
    })]);
    if ($l1 === void 0) {
      $m_m("remote_tools_host_inventory", "unsupported_platform");
      return;
    }
    let $l3 = $l2 === void 0 ? -1n : $l2.bavail * $l2.bsize;
    if (!$l1.complete) $m_f("remote_tools_host_inventory", "deadline");
    else if ($l3 < 0n) $m_f("remote_tools_host_inventory", "disk_unread");
    else $m_g("remote_tools_host_inventory");
    let $l4 = { ...!$l1.complete && { incomplete: true }, cpus: $NEW_chunk_7cks3gqr_js_d(), memory_gb: Math.round($NEW_chunk_7cks3gqr_js_p() / Number($m_a)), ...$l3 >= 0n && { disk_free_gb: Math.min(Number($l3 / $m_a), $m__Wr) } }, $l5 = $l1.profile.tools;
    while ($l5.length > 0 && $m__({ tools: $l5, ...$l4 }).length > $m_bWr) $l5 = $l5.slice(0, -1);
    return { tools: $l5, ...$l4 };
  } catch ($l6) {
    $m_l($m_N($l6)), $m_m("remote_tools_host_inventory", "error");
    return;
  }
}
;
