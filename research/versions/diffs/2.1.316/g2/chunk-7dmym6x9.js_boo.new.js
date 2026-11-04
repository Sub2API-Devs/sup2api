function SELF($l0) {
  let $l1 = $m_xf, $l2 = $l0.workingDirectory, $l3 = [...$l2 === void 0 ? [] : [`Primary working directory: ${$l1($l2)}`, $l0.isWorktree ? $m_bkt : null, $l0.isWorktree ? $m_Skt : null, `Is a git repository: ${$l0.isGitRepo}`], $l0.additionalWorkingDirectories.length > 0 ? "Additional working directories:" : null, $l0.additionalWorkingDirectories.length > 0 ? $l0.additionalWorkingDirectories.map($l1) : null, `Platform: ${$l1($l0.platform)}`, $l0.shell !== void 0 ? `Shell: ${$l1($l0.shell)}` : null, $l0.osVersion !== void 0 ? `OS Version: ${$l1($l0.osVersion)}` : null, $l0.scratchpadDirectory !== void 0 ? $m_Tkt($l1($l0.scratchpadDirectory)) : null, $m_Soo() ? $m__oo : null, $m_k1($l0) ? $m_ile($l0) : $m_goo(), $l0.githubCli !== void 0 ? $m_jDe($l0.githubCli) ?? null : null].filter(($l4) => $l4 !== null);
  return $m_Dy($l3).join(`
`);
}
;
