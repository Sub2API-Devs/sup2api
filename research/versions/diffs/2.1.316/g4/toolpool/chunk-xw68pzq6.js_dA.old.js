function SELF($l0, $l1, $l2, $l3) {
  if (typeof $l0.getPath !== "function") return { behavior: "ask", message: `Claude requested permissions to use ${$l0.name}, but you haven't granted it yet.` };
  let $l4 = $l0.getPath($l1), $l5 = $l3 ?? $m_Wi($l4), $l6 = $l5.spellings, $l7, $l8 = () => $l7 ??= $m_ct($l4), $l9, $l10 = () => {
    if ($l9 === void 0) try {
      $l9 = $m__g() && $m_Tc(`${$l2.mode}:${$l8()}`) && $m_Eg($l8());
    } catch {
      $l9 = false;
    }
    return $l9;
  };
  for (let $l11 of $l6) {
    let $l12 = $m_Pa($l11, $l2, "read", "deny");
    if ($l12) return { behavior: "deny", message: `Permission to read ${$m_lc($l4)} has been denied.`, decisionReason: { type: "rule", rule: $l12 } };
  }
  if ($m_N6()) {
    let $l13 = $m_mw($l4);
    if ($m_Wc($l13 === null ? $l6 : [...$l6, $l13])) return $m_ki;
  }
  if ($l2.restricted || $l2.blockReadsOutsideWorkingDirectories) {
    let $l14 = $m_Rc($l4, $l5, $l2, () => $m_wbe($l8(), $l1, $l6, { restricted: $l2.restricted, blockOutsideReads: $l2.blockReadsOutsideWorkingDirectories, readBlockFence: $l2.blockReadsOutsideWorkingDirectories }), $l2.restricted ? $m_Pc : $m_ag, $l2.blockReadsOutsideWorkingDirectories ? $m_ser($l2) : $m_Pv($l2));
    if ($l14) {
      if ($l2.servedCall === true && !$l2.restricted && $l14.behavior === "deny" && !$m_KKr()) return { behavior: "ask", message: $l14.message, decisionReason: { type: "safetyCheck", reason: $m_fL, classifierApprovable: false, circuitBreaker: "outsideReadsBlocked" } };
      return $l14;
    }
  } else if ($l5.unresolved) return $m_Fc("read from", $l4);
  let $l15 = $m_MVe($l0, $l1, $l2, $l6);
  if ($l15) return $l15;
  for (let $l16 of $l6) {
    let $l17 = $m_Pa($l16, $l2, "read", "ask");
    if ($l17) return { behavior: "ask", message: `Claude requested permissions to read from ${$m_lc($l4)}, but you haven't granted it yet.`, decisionReason: { type: "rule", rule: $l17 } };
  }
  let $l18 = $l2.mode === "plan" ? { ...$l2, mode: "default" } : $l2, $l19 = $m___($l0, $l1, $l18, $l5);
  if ($l19.behavior === "allow") {
    if ($l19.decisionReason?.type === "mode" && $l10()) $m_tc($l8(), "editImpliesRead", $l2.mode);
    return $l19;
  }
  if ($m_Ky($l4, $l2, $l6)) {
    if ($l10()) $m_tc($l8(), "workingDir", $l2.mode);
    return { behavior: "allow", updatedInput: $l1, decisionReason: { type: "mode", mode: "default" } };
  }
  let $l20 = $l8(), $l21 = $m_wbe($l20, $l1, $l6, { restricted: $l2.restricted, blockOutsideReads: $l2.blockReadsOutsideWorkingDirectories });
  if ($l21.behavior !== "passthrough" && $m_Hyn($l21, $l2)) return $l21;
  let $l22 = $m_Myn($l6, $l2, "read");
  if ($l22) return { behavior: "allow", updatedInput: $l1, decisionReason: { type: "rule", rule: $l22 } };
  return { behavior: "ask", suggestions: $m_Uvt($l4, "read", $l2, $l6), ...$m_Ic("read from", $l4, $l5, $l2) };
}
;
