async function SELF($l0, $l1) {
  let $l2 = $m_Ti().gzipRequestBody, $l3 = $l2.blockGzippedResponses.get($l0);
  if ($l3 === void 0) return $l0;
  let $l4 = await $m_yBo($l0);
  if ($l4 === null) return $l0;
  $m_li($l2, "for_the_session", `rejected (status=${$l0.status} kind=${$l4})`), $l0.body?.cancel().catch(() => {
  });
  let $l5;
  try {
    return $l5 = await $l1(), $l5;
  } finally {
    $m_f("api_gzip_request_body_blocks", "rejected", { status: $l0.status, rejection: $m_c($l4), ...$l5 !== void 0 && { resendStatus: $l5.status }, ...$l3 });
  }
}
;
