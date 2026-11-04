function SELF($l0, $l1) {
  if (!$l1) return $l0;
  if (!$l0) return $l1;
  return `${$l0.replace(/\r?\n$/, "")}

${$l1}`;
}
;
