function SELF($l0, $l1, $l2, $l3) {
  if ($m_l($l0), $l0 instanceof $m_tkt) $m_Si($l1, "for_the_session", `a new block failed its check (${$l0.fault})`), $m_f("api_gzip_request_body_blocks", "piece_check_failed", { fault: $m_c($l0.fault), ...$l3 }), $m_Y("warn", "api_gzip_request_body_blocks_piece_check_failed", { fault: $l0.fault, ...$NEW_chunk_hwmsct5x_js_bl($l3) });
  else $m_Si($l1, "until_next_conversation", "compression threw"), $m_f("api_gzip_request_body_blocks", $l2, ...$l3.incrementalRequestBody ? [$l3] : []);
}
;
