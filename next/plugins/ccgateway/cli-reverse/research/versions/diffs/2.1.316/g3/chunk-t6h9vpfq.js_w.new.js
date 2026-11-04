function SELF($l0, $l1, $l2, $l3) {
  let $l4 = $m_x($l3);
  if ($l4 === false) return { gzip: false, reason: "env_off", bodyChars: $l1 };
  if (!$m_ay()) return { gzip: false, reason: "not_bun_runtime", bodyChars: $l1 };
  if ($l1 === void 0) return { gzip: false, reason: "non_string_body", bodyChars: $l1 };
  if ($l1 < $m_H($l3)) return { gzip: false, reason: "below_min_size", bodyChars: $l1 };
  if ($l4 === true) return $m_ni().gzipRequestBody.rejectedThisProcess ? { gzip: false, reason: "latched_off", bodyChars: $l1 } : { gzip: true, bodyChars: $l1 };
  let $l5 = $m_Y($l0);
  if ($l5 !== void 0) return { gzip: false, reason: $l5, bodyChars: $l1 };
  if ($l3 === "ccr_worker" && !$m_k($m_D, false)) return { gzip: false, reason: "flag_off", bodyChars: $l1 };
  if ($m_re($l2)) return { gzip: false, reason: "latched_off", bodyChars: $l1 };
  return { gzip: true, bodyChars: $l1 };
}
;
