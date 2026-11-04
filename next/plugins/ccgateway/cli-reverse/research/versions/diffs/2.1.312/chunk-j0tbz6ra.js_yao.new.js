function SELF($l0) {
  let $l1 = $m_gf, $l2 = $l0.workingDirectory, $l3 = [...$l2 === void 0 ? [] : [`Primary working directory: ${$l1($l2)}`, $l0.isWorktree ? $m_Qwt : null, $l0.isWorktree ? $m_Xwt : null, `Is a git repository: ${$l0.isGitRepo}`], $l0.additionalWorkingDirectories.length > 0 ? "Additional working directories:" : null, $l0.additionalWorkingDirectories.length > 0 ? $l0.additionalWorkingDirectories.map($l1) : null, `Platform: ${$l1($l0.platform)}`, $l0.shell !== void 0 ? `Shell: ${$l1($l0.shell)}` : null, $l0.osVersion !== void 0 ? `OS Version: ${$l1($l0.osVersion)}` : null, $l0.scratchpadDirectory !== void 0 ? $m_eTt($l1($l0.scratchpadDirectory)) : null, $m_hao() ? $m_mao : null, $m_ZW($l0) ? $m_ede($l0) : $m_cao(), $l0.githubCli !== void 0 ? $m_s$e($l0.githubCli) ?? null : null].filter(($l4) => $l4 !== null);
  return $m_my($l3).join(`
`);
}
;
