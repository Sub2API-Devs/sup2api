function SELF($l0, $l1, $l2, $l3) {
  if (typeof $l0.getPath !== "function") return { behavior: "ask", message: `Claude requested permissions to use ${$l0.name}, but you haven't granted it yet.` };
  let $l4 = $l0.getPath($l1), $l5 = $l3 ?? $m_Wi($l4), $l6 = $l5.spellings, $l7 = $m_ct($l4), $l8 = $m_eVr($l4, $l5, $l7, $l2);
  if ($l8 !== void 0) return $l8;
  let $l9 = ($l2.alwaysAllowRules.session ?? []).filter(($l10) => {
    let $l11 = $m_Nn($l10).ruleContent;
    return $m_Fqr($l11) && !$l6.some(($l12) => $m_ig($l12, $l11 ?? ""));
  }), $l13 = $l9.length > 0 ? $m_Myn($l6, { ...$l2, alwaysAllowRules: { session: $l9 } }, "edit") : null;
  if ($l13 && $l2.mode !== "plan" && !$l6.some(($l14) => $m_K9($l14, $l2.trustedNetworkDirectories)) && !$l6.some(($l15) => $m_Xl($l15) > 1)) return { behavior: "allow", updatedInput: $l1, decisionReason: { type: "rule", rule: $l13 } };
  for (let $l16 of $l6) {
    let $l17 = $m_Pa($l16, $l2, "edit", "ask");
    if ($l17) return { behavior: "ask", message: `Claude requested permissions to write to ${$m_lc($l4)}, but you haven't granted it yet.`, decisionReason: { type: "rule", rule: $l17 } };
  }
  let $l18 = $m_ARe($l7, $l1, $l6, { restricted: $l2.restricted });
  if ($l18.behavior !== "passthrough" && $m_Hyn($l18, $l2)) return $l18;
  let $l19 = $m_QV($l4, $l6, void 0, $m_Cnt($l2), $l2.trustedNetworkDirectories);
  if (!$l19.safe) {
    let $l20 = $l2.restricted || $l6.some(($l21) => $m_Xl($l21) > 1 || $m_K9($l21, $l2.trustedNetworkDirectories)) ? null : $m_Lp($l4), $l22 = $l20 ? [{ type: "addRules", rules: [{ toolName: $m_it, ruleContent: $l20.pattern }], behavior: "allow", destination: "session" }] : $m_Uvt($l4, "write", $l2, $l6), $l23 = $m_ZKr($l4, $l5, $l2), $l24 = $l23 === null ? $l19.message : `${$l19.message} ${$l23.sentence}.`;
    return { behavior: "ask", message: $l24, suggestions: $l22, ...$l23 !== null && { blockedPath: $l23.landing }, decisionReason: { type: "safetyCheck", reason: $l24, ...$m_xyn($l19, $l2.restricted), ...$l23?.personOnly && { classifierApprovable: false } } };
  }
  if ($l2.mode === "plan") return { behavior: "ask", message: `Cannot write to ${$m_lc($l4)} while in plan mode.`, decisionReason: { type: "mode", mode: "plan" } };
  let $l25 = $m_Ky($l4, $l2, $l6);
  if ($l2.mode === "acceptEdits" && $l25) return { behavior: "allow", updatedInput: $l1, decisionReason: { type: "mode", mode: $l2.mode } };
  let $l26 = $m_Myn($l6, $l2, "edit");
  if ($l26) return { behavior: "allow", updatedInput: $l1, decisionReason: { type: "rule", rule: $l26 } };
  if ($l25) return { behavior: "ask", message: `Claude requested permissions to write to ${$m_lc($l4)}, but you haven't granted it yet.`, suggestions: $m_Uvt($l4, "write", $l2, $l6) };
  return { behavior: "ask", suggestions: $m_Uvt($l4, "write", $l2, $l6), ...$m_Ic("write to", $l4, $l5, $l2) };
}
;
