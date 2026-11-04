function SELF() {
  let $l0 = $m_i.SHELL || "unknown", $l1 = $l0.includes("zsh") ? "zsh" : $l0.includes("bash") ? "bash" : $l0;
  if ($m_i.platform === "win32") {
    if (!$m_vd()) return "PowerShell";
    if ($m_Jv()) return `PowerShell (primary); ${$m_JCr}.`;
    return $l1;
  }
  let $l2 = $NEW_chunk_65my4caa_js_oqs();
  if ($l2 === void 0) return $l1;
  let $l3 = $NEW_chunk_7dmym6x9_js_WDe($l2);
  if (!$m_i.SHELL || $NEW_chunk_7dmym6x9_js_WDe($m_i.SHELL) === $l3) return $l3;
  return `${$l3} (login shell: ${$NEW_chunk_7dmym6x9_js_WDe($m_i.SHELL)})`;
}
;
