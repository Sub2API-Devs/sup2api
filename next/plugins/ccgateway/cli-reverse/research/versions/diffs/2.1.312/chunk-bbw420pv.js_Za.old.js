function SELF($l0) {
  let $l1 = $l0?.body;
  return $m_Dc($l0?.compress) !== void 0 && typeof $l1 === "string" && $l1.length >= $m_cb && !$m_fb.some(($l2) => $l1.includes($l2, $l1.length - $m_pb));
}
;
