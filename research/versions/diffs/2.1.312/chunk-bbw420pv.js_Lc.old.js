async function SELF($l0, $l1) {
  let $l2 = $m_Ti().gzipRequestBody;
  if (!$l2.blockGzippedResponses.has($l0)) return $l0;
  let $l3 = await $m_yBo($l0);
  if ($l3 === null) return $l0;
  $m_li($l2, "for_the_session", `rejected (status=${$l0.status} kind=${$l3})`), $l0.body?.cancel().catch(() => {
  });
  let $l4;
  try {
    return $l4 = await $l1(), $l4;
  } finally {
    $m_f("api_gzip_request_body_blocks", "rejected", { status: $l0.status, rejection: $m_c($l3), ...$l4 !== void 0 && { resendStatus: $l4.status } });
  }
}
;
