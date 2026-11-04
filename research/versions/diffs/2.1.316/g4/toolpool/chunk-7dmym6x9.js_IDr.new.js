function SELF($l0, $l1) {
  if ($l1.length > 0 && !$m_L4e($l0)) return { case: "unlisted", skills: [...$l1], reason: "uri_too_long" };
  let $l2 = [], $l3 = [];
  for (let $l4 of $l1) {
    let $l5 = $l4.resources.find(($l6) => $l6.uri === $l0);
    if ($l5 !== void 0) $l2.push($l5), $l3.push($l4);
  }
  if ($l2.length > 0) return $m_Hpn() ? { case: "listed", rows: $l2, skills: $l3 } : { case: "unlisted", skills: $l3, reason: "unlisted" };
  let $l7 = $l1.filter(($l8) => $l0.startsWith(`${$l8.root}/`));
  if ($l7.length > 0) return { case: "unlisted", skills: $l7, reason: "unlisted" };
  let $l9 = $l1.filter(($l10) => $m_LPo($l0, $l10.root));
  if ($l9.length > 0) return { case: "unlisted", skills: $l9, reason: "other_spelling" };
  return $l1.length > 0 && !$m_PDr($l0) ? { case: "unlisted", skills: [...$l1], reason: "unparseable_uri" } : { case: "outside" };
}
;
