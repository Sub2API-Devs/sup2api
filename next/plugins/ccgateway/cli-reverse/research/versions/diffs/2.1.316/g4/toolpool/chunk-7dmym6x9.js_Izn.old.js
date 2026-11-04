async function SELF($l0) {
  if (!$l0.some(($l1) => $m_xt($l1, $m_oo))) return [];
  let $l2 = $m_Vr();
  if ($l2.bashPromptSkillCommands !== void 0) return $l2.bashPromptSkillCommands;
  let $l3 = $m_H$e.stamp(), $l4 = await $m_Tln($m_rf());
  if ($m_H$e.stamp() === $l3) $l2.bashPromptSkillCommands ??= $l4;
  return $l2.bashPromptSkillCommands ?? $l4;
}
;
