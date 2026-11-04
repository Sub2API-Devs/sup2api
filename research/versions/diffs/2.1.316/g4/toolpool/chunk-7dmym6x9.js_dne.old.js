function SELF($l0) {
  let $l1 = $m_iIn($l0);
  if (!$l1) return $m_dKr;
  let $l2 = $m_JOn($l1.commands[0]?.text ?? ""), $l3 = $m_Ert($l2[0]), $l4 = $m_Ert($m_JOn($l1.commands.at(-1)?.text ?? "")[0]), $l5 = { kinds: /* @__PURE__ */ new Set(), scriptTextDepth: 0, scriptTextCharsLeft: $m_sKr, scriptTextDeadline: void 0, gaveUp: false };
  if ($m_rIn($l1, $l5), $l5.kinds.size === 0) $l5.kinds.add("shell_word");
  return { bash_command_class: $l3 !== void 0 ? $m_c($l3.commandClass) : $m_b("other"), bash_argv0: $l3 !== void 0 ? $m_c($l3.argv0) : $m_b("other"), bash_last_argv0: $l4 !== void 0 ? $m_c($l4.argv0) : $m_b("other"), ...$m_EKr($l3?.argv0, $l2), bash_command_kinds: $l5.gaveUp ? $m_b("incomplete") : $m_ma([...$l5.kinds]), has_pipe: $l1.has_pipe, has_redirect: $l1.has_redirect, has_chain: $l1.has_chain, has_subshell: $l1.has_subshell, has_heredoc: $l1.has_heredoc, simple_command_count: $l1.commands.length };
}
;
