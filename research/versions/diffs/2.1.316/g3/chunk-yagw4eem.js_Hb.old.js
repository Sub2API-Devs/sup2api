function SELF($l0, $l1, $l2, $l3) {
  return ($l4) => {
    if ($l4 !== void 0) $l0.blockGzippedResponses.set($l4, $l3);
    if (!$m_$b($l4) && true && Math.random() >= $m_Bb) return;
    $l1.setTimeout(() => $m_Mb($m_Ob)($l2, { chunkSize: 1048576 }).catch(($l5) => {
      let $l6 = $m__r($l5), $l7 = { ...$l6 !== void 0 && { code: $l6 }, ...$l3 }, $l8 = $m_FYo($l5) !== void 0;
      if ($m_Si($l0, $l8 ? "for_the_session" : "until_next_conversation", `the check of a sent body ended in ${$m_E($l5) ?? "an error"}`), $l8) $m_m("api_gzip_request_body_blocks", "self_check_wrong_bytes", $l7);
      else $m_f("api_gzip_request_body_blocks", "self_check_could_not_run", $l7);
    }), $m_Gc, { unref: true });
  };
}
;
