function SELF() {
  let $l0 = $m_i.SHELL || "unknown", $l1 = $l0.includes("zsh") ? "zsh" : $l0.includes("bash") ? "bash" : $l0;
  if ($m_i.platform === "win32") {
    if (!$m_vd()) return "PowerShell";
    if ($m_Jv()) return `PowerShell (primary); ${$m_JCr}.`;
    return $l1;
  }
  return $l1;
}
;
