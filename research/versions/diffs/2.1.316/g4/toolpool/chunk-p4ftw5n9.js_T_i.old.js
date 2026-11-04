function SELF($l0) {
  let $l1 = $m_y();
  if (!$l1.active) return;
  for (let { name: $l2, server: $l3, standardKey: $l4 } of $l0) {
    let $l5 = $m_K($l3), $l6 = $m_Sn($l3.serverName), $l7 = $l1.servers.get($l5)?.standardKey, $l8 = $l4 ?? $l7;
    if (!$l1.servers.has($l5) || $l1.servers.get($l5)?.legacyKey !== $l6 || $l7?.key !== $l8?.key || $l7?.pinned !== $l8?.pinned) {
      if ($l7 !== void 0 && !$l7.pinned && $l7.key !== $l8?.key) $l1.formerKeys.set($l5, ($l1.formerKeys.get($l5) ?? /* @__PURE__ */ new Set()).add($l7.key));
      $l1.needsRebuild = true, $l1.servers.set($l5, { id: $l5, legacyKey: $l6, standardKey: $l8 });
    }
    if ($l1.tools.get($l2)?.serverId !== $l5) $l1.needsRebuild = true, $l1.tools.set($l2, { serverId: $l5, toolPart: $l2.slice(`${$m_u}${$l6}__`.length) });
  }
  if ($l1.needsRebuild) $m_ve($l1), $l1.needsRebuild = false;
}
;
