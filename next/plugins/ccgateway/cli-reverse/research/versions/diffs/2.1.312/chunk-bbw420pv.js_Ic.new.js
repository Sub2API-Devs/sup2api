async function SELF($l0, $l1 = $m_Jl) {
  let $l2 = $m_Dc($l0?.compress);
  if ($l0 === void 0 || $l2 === void 0 || !(typeof $l0.body === "string" || $NEW_chunk_t6h9vpfq_js_cnt($l0.body)) || !$m_Za($l0)) return { init: $l0 };
  let $l3 = $l0.body, $l4 = typeof $l3 === "string" ? {} : { incrementalRequestBody: true }, $l5 = $l4, $l6 = $m_Ti(), $l7 = $l6.gzipRequestBody, $l8 = $l7.blockStore, $l9 = new Headers($l0.headers), $l10 = $l9.get($m_kAe), $l11 = $m_Cc();
  if ($l11 === 0 || $l7.blocksSwitchedOff) return $m_Qfn($l10, { mode: $l11, outcome: $l11 === 0 ? "off" : "switched_off" }), { init: $l0 };
  let $l12 = $l10 === null ? void 0 : $l7.telemetryByClientRequestId.get($l10), $l13 = !($l12?.requestBodyEncoding === "gzip" && $l12.querySource !== void 0 && $NEW_chunk_yagw4eem_js_Nb.has($l12.querySource));
  if ($l11 === 1 && $l8.blocks.size === 0) return $m_Qfn($l10, { mode: $l11, outcome: "by_runtime" }), { init: $l0, ...$l13 && { afterResponse: $m_Mc($l7, $l1, $l3, $l2, $l4) } };
  let $l14 = () => ($m_Qfn($l10, { mode: $l11, outcome: "switched_off" }), { init: $l0 }), $l15 = performance.now();
  try {
    let $l16 = $m_xGo({ body: typeof $l3 === "string" ? Buffer.from($l3) : $l3, level: $l2, store: $l8, clock: $l1 });
    if ($l4.incrementalRequestBody) $l5 = { ...$l4, carriedDigests: $l16.carriedDigestCount };
    let $l17 = $l16.reusedBytes * 2 < $l16.body.length, $l18 = $l11 === 1 && $l17 ? void 0 : await $m_EJs($l16, $l8, $l1, { signal: $l0.signal ?? void 0, stopIf: () => $l7.blocksSwitchedOff !== false });
    if ($l7.blocksSwitchedOff) return $l14();
    if ($m_Qfn($l10, { mode: $l11, outcome: $l18 === void 0 ? "by_runtime" : "as_blocks", planned: { blockCount: $l16.blocks.length, reusedBlockCount: $l16.reusedBlockCount, reusedBytes: $l16.reusedBytes, spentMs: Math.round(performance.now() - $l15), gzippedBytes: $l18?.length, storedBytes: $l8.storedBytes, evictedForSpaceCount: $l8.evictedForSpaceCount } }), $l18 === void 0) return { init: $l0, ...$l13 && $m_vJs($l16) && { afterResponse: $m_Mc($l7, $l1, $l3, $l2, $l4) } };
    if ($l6.once("gzip_request_body_blocks_ok")) $m_g("api_gzip_request_body_blocks");
    $l9.set("Content-Encoding", "gzip");
    let { compress: $l19, ...$l20 } = $l0;
    return { init: { ...$l20, headers: $l9, body: $l18 }, afterResponse: $m_gb($l7, $l1, $l18, $l5) };
  } catch ($l21) {
    if ($l0.signal?.aborted) return { init: $l0 };
    if ($l7.blocksSwitchedOff && !($l21 instanceof $m_awt)) return $l14();
    return $m_Fc($l21, $l7, "failed", $l5), $m_Qfn($l10, { mode: $l11, outcome: "failed" }), { init: $l0 };
  }
}
;
