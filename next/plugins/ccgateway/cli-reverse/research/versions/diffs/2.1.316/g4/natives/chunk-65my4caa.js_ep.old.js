function SELF($l0, $l1) {
  let $l2 = [4, 7, 20].map(($l3) => $l0[$l3] || "0").join(""), $l4 = `${$m_mH}${$l2}${$l1}`;
  return $m_pH("sha256").update($l4).digest("hex").slice(0, 3);
}
;
