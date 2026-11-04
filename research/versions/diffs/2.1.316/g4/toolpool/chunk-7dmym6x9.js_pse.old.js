async function SELF($l0) {
  try {
    let $l1 = $m_Vb($l0);
    if (!$l1 || $m_dse($l1)) return null;
    return await $m_Nct($l1, async () => {
      let $l2 = await $m_Fct($l1);
      if (!$l2) return "unavailable";
      let $l3 = await $m_e2n($l1, $l2);
      return $l3 ? { repoRoot: $l1, gitDirectory: $l2, tree: $l3 } : "unavailable";
    });
  } catch ($l4) {
    return $m_t(`bashEditDiff: snapshot failed: ${String($l4)}`), "unavailable";
  }
}
;
