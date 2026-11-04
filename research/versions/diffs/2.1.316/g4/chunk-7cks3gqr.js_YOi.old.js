async function SELF($l0) {
  try {
    if (!$m_pwr()) return;
    let [$l1, $l2] = await Promise.all([$m_luo({ includeMcpServers: false, signal: AbortSignal.timeout($m_s), alsoLookFor: $m_c, maxTools: $m_hqr }), $m_Pe($m_u($l0, { bigint: true }), $m_s).catch(() => {
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
    let $l4 = { ...!$l1.complete && { incomplete: true }, cpus: $m_d(), memory_gb: Math.round($m_p() / Number($m_a)), ...$l3 >= 0n && { disk_free_gb: Math.min(Number($l3 / $m_a), $m_yqr) } }, $l5 = $l1.profile.tools;
    while ($l5.length > 0 && $m__({ tools: $l5, ...$l4 }).length > $m__qr) $l5 = $l5.slice(0, -1);
    return { tools: $l5, ...$l4 };
  } catch ($l6) {
    $m_l($m_N($l6)), $m_m("remote_tools_host_inventory", "error");
    return;
  }
}
;
