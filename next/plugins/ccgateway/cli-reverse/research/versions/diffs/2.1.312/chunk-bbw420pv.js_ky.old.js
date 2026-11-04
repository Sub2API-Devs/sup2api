function SELF({ clientRequestId: $l0, provider: $l1, routedProvider: $l2, method: $l3, url: $l4, body: $l5, noResponseRetryLedger: $l6 }) {
  let $l7 = $l2 === "gateway" && $l6 !== void 0 && $m_i.CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS !== void 0 && $m_hi() && $l3 === "POST" && $m_an($l4), $l8 = $l7 ? { escalated: $l6.count > 0 } : $m_Ay($l0), $l9 = $l8 === void 0 && $l1 === "bedrock" && $l3 === "POST" && $l4.includes($m_qp);
  if ($l8 === void 0 && !$l9 || !$l7 && !$m_p1r($l2)) return;
  let $l10 = typeof $l5 === "string" ? Buffer.byteLength($l5) : 0, $l11 = Math.ceil($l10 / $m_vy) * 1e3, $l12 = $m_u1r() ?? 6e5, $l13 = $l12 <= 0 ? 1 / 0 : $l12 - 1e3;
  if ($l13 < $m_mi) return;
  let $l14 = $m_Ey($l1) + $l11, $l15 = Math.min($l14, $l13);
  if ($l8 === void 0) return { escalated: false, firstWindowMs: $l15, retryWindowMs: $l15 };
  let $l16 = Number.isFinite($l13) ? $l13 : Math.max($l14, $m_hai + $l11);
  return { escalated: $l8.escalated, firstWindowMs: $l15, retryWindowMs: $l16 };
}
;
