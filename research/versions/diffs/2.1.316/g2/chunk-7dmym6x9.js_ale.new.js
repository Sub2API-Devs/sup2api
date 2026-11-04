function SELF($l0) {
  let $l1 = $m_$J();
  if ($l1 === void 0) return;
  let $l2 = !$l1.said && $l0 !== void 0 && $m_k1($l0) && $l0.workingDirectory !== void 0 && $m_pls($l0.workingDirectory) && $l0.workingDirectory !== $l1.unvouched ? { path: $l0.workingDirectory, isGitRepo: $l0.isGitRepo } : $l1.directory, $l3 = $l1.agentProxy === void 0 ? $l0?.agentProxy : $l1.agentProxy, $l4 = $l1.shell === void 0 ? $l2?.path : $l1.shell;
  return { ...typeof $l4 === "string" && { workingDirectory: $l4 }, isWorktree: false, isGitRepo: $l2?.isGitRepo ?? false, additionalWorkingDirectories: [], platform: $l1.platform, ...$l3 && { agentProxy: $l3 } };
}
;
