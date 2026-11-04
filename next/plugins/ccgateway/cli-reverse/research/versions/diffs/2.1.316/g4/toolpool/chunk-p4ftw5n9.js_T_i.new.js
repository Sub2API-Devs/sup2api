function SELF($l0) {
  let $l1 = $m_y();
  if (!$l1.active) return;
  for (let $l2 of $l0) {
    let $l3 = $NEW_chunk_6mwt0myy_js_T($l1, $l2), $l4 = $m_Sn($l2.server.serverName);
    if ($l1.tools.get($l2.name)?.serverId !== $l3) $l1.needsRebuild = true, $l1.tools.set($l2.name, { serverId: $l3, toolPart: $l2.name.slice(`${$m_u}${$l4}__`.length) });
  }
  $m_ve($l1);
}
;
