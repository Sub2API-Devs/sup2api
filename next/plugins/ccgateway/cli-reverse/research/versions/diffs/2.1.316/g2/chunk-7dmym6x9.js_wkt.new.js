async function SELF({ cwd: $l0, additionalWorkingDirectories: $l1 }) {
  let $l2 = $m_ale();
  if ($l2 !== void 0) return $l2;
  let [$l3, $l4] = await Promise.all([$l0 !== null && $m_hL(), $m_hoo()]), $l5 = $m_yoo(), $l6 = $m_fkt();
  return { ...$l0 !== null && { workingDirectory: $l0 }, isWorktree: $l0 !== null && ($m_wl() !== null || $m_K2($l0)), isGitRepo: $l3, additionalWorkingDirectories: [...$l1 ?? []], platform: $m_i.platform, shell: $m_poo(), osVersion: $l4, ...$l5 && { scratchpadDirectory: $l5 }, ...$l6 && { githubCli: $l6 } };
}
;
