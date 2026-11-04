function SELF($l0, $l1) {
  if ($l1) return $l0 ? `agent:builtin:${$l0}` : "agent:default";
  return $l0 ? `agent:custom:${$l0}` : "agent:custom";
}
;
