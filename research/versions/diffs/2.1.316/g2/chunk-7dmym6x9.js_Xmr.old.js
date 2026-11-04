function SELF($l0, $l1, $l2, $l3 = false, $l4, $l5 = false, $l6 = $m_Te(), $l7 = false, $l8 = false, $l9 = false, $l10, $l11, $l12, $l13 = false, $l14 = true, $l15) {
  let $l16 = $m__W(), $l17 = $m_i.CLAUDE_CODE_SIMULATE_PROXY_USAGE, $l18 = !$l5 && !$l16 && !$l17, $l19 = $m_uv(), $l20 = !$l7 && $m_NUt(), $l21 = $m_mun({ messages: $l0, enablePromptCaching: $l1, skipCacheWrite: $l3, forkPointUuid: $l4, canMarkApiSystem: $l18, forkCachePin: $l20 || $l13 && !$l7, whitespaceTextUnstampable: $l19, topLevelCacheControl: $l8, isForkPinStepBackEnabled: () => $l20 && $m_cun(), divergesAtMessageId: $l7 ? void 0 : $l11, parentReplyId: $l15?.isMarkWanted === true && !$l7 ? $l15.parentReplyId : void 0, tailAuditTerms: { proxyDemoted: $l5, experimentalBetasDisabled: $l16, simulateProxyUsage: $l17, skipMessageCacheMarkers: $l12?.skipMessageCacheMarkers ?? false } }), { markerIndices: $l22, forkPointPinned: $l23, parentPromptEndMarked: $l24, auditTail: $l25 } = $l21;
  if ($l12 !== void 0) try {
    $l12.report($l25());
  } catch ($l26) {
    $m_l($l26);
  }
  if ($l14) $m_a("tengu_api_cache_breakpoints", { totalMessageCount: $l0.length, cachingEnabled: $l1, skipCacheWrite: $l3, forkPointPinned: $l23, markerCount: $l22.size, ...$l15 !== void 0 && !$l7 && { querySource: $m_Es($l15.querySource), ...$l15.isMarkWanted && { parentPromptEndMarked: $l24 } } });
  let $l27;
  try {
    $l27 = $m_Opn($l0, $l9);
  } catch ($l28) {
    $m_l($l28);
  }
  let $l29 = ($l27?.messages ?? $l0).map(($l30, $l31) => {
    let $l32 = $l22.has($l31);
    if ($l30.type === "user") return $m_nmr($l30, $l32, $l1, $l2);
    if ($l30.type === "api_system") {
      let $l33 = $l32 && $l1 && $l18, $l34 = $l30.ephemeralSuffix ? [{ type: "text", text: $l30.ephemeralSuffix }] : [];
      if ($l30.toolAdditions && $l30.toolAdditions.length > 0 || $l30.toolRemovals && $l30.toolRemovals.length > 0) return { role: "system", content: [...$m_F3s($l30.message.content, $l30.toolAdditions ?? [], $l33 ? $m_J8({ ttl: $l2 }) : void 0, $l30.toolRemovals ?? [], $l30.toolDefinitions), ...$l34], ...$l30.outputConfig && { output_config: $l30.outputConfig } };
      let $l35 = $m_jI($l30.message.content, $l30.ephemeralSuffix ?? "");
      return { role: "system", content: $l33 ? [{ type: "text", text: $l30.message.content, cache_control: $m_J8({ ttl: $l2 }) }, ...$l34] : $l35 || [], ...$l30.outputConfig && { output_config: $l30.outputConfig } };
    }
    return $m_amr($l30, $l32, $l1, $l2, $l19);
  });
  if ($l27 !== void 0) try {
    let $l36 = $m_Ipn($l29, $l27);
    return $l10?.push(...$l36.wireIndexOf), $l36.wire;
  } catch ($l37) {
    $m_l($l37);
    let $l38 = $l27.dropBase, $l39 = [];
    return $l29.forEach(($l40, $l41) => {
      if ($l10?.push($l39.length), !$l38.has($l41)) $l39.push($l40);
    }), $l10?.push($l39.length), $l39;
  }
  return $l10?.push(...$l29.keys(), $l29.length), $l29;
}
;
