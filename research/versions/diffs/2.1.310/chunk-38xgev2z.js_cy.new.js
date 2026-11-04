function SELF($l0, $l1, $l2, $l3, $l4, $l5, $l6) {
  let $l7 = $l0 ?? $m_mle, $l8 = $m_J$r(), $l9 = $m_il($l8);
  return async ($l10, $l11) => {
    let $l12 = new Headers($l11?.headers), $l13 = $l10 instanceof Request ? $l10.url : String($l10), { method: $l14 } = $m_x9n($l10, $l11);
    $m_KUo($l7, $l14, $l13);
    let $l15 = $l12.get($m_wke) ?? void 0;
    if ($l9 && !$l12.has($m_wke)) $l12.set($m_wke, $NEW_chunk_bbw420pv_js_by());
    if ($l9 && ($m_DK() && $m_mc() || $m_bKe())) {
      $l12.set($m_fc, "true");
      let $l16 = $m_k6n($m_q4o());
      if ($l16 !== void 0) $l12.set($m_pc, $l16);
    }
    if ($m_wo($l13) && $m_sa() && $m_EJe()) $l12.set($m_hht, $m_RLr);
    if ($l9) {
      let $l17 = $m_hUo();
      if ($l17 !== void 0) $l12.set($m_mUo, $l17);
    }
    try {
      let $l18 = $l12.get($m_wke);
      if ($m_t(`[API REQUEST] ${new URL($l13).pathname}${$l18 ? ` ${$m_wke}=${$l18}` : ""} source=${$l1 ?? "unknown"}`), $m_Wyn() === "verbose") $m_t(`[API REQUEST AUTH] ${$m__($m_fy($l12))}`, { level: "verbose" });
    } catch {
    }
    if ($l6 && $l9 && $m_wo($l13)) await $NEW_chunk_bbw420pv_js_pl($l12, $l6);
    let $l19 = { ...$l11, headers: $l12 }, $l20 = $l11?.body, $l21 = $m_iFs($l15), $l22 = $m_nNt($l13, $l20, $l3), $l23 = $l22?.gzip && typeof $l20 === "string", $l24 = $l23 ? $m_rFs() : void 0;
    if ($l23) $l19.compress = $l24 === void 0 ? "gzip" : { encoding: "gzip", level: $l24 }, $m_vin(), $l19.body = $m_HBt($l20);
    if ($l15 !== void 0 && $l22 !== void 0) {
      let $l25 = $l21 === void 0 ? {} : { requestPrepareMs: Math.round(performance.now() - $l21) };
      $m_BPo($l15, $l22.gzip ? { requestBodyEncoding: "gzip", requestBodyChars: $l22.bodyChars, requestBodyGzipLevel: $l24, ...$l25 } : { requestBodyEncoding: "identity", requestBodyChars: $l22.bodyChars, gzipSkipReason: $l22.reason, ...$l25 });
    }
    let $l26 = $m_ly({ clientRequestId: $l15, provider: $l8, routedProvider: $l2, method: $l14, url: $l13, body: $l20, noResponseRetryLedger: $l5 }), $l27 = ($l28) => {
      try {
        return $m_id({ provider: $l8, routedProvider: $l2, url: $l13, init: $l28 });
      } catch ($l29) {
        return $m_l($m_U($l29)), false;
      }
    }, $l30 = { init: $l19, firstParty: false }, $l31 = ($l32) => ($l30.init = $l32, $l30.firstParty = $l27($l32), $l26 === void 0 ? $l7($l10, $l32) : $m_uy($l7, $l10, $l32, $l26, $l4)), $l33 = $l9 && $m_wo($l13);
    if ($l33) $m_Pc($l4.now());
    let $l34 = await $l31($l19);
    if ($m_VUo($l7, $l14, $l34), $l23) $l34 = await $m_Ec($l34, () => $l31($l19)), $l34 = await $m_UPo({ res: $l34, dispatch: $l31, finalInit: $l19, identityBody: $l20, clientRequestId: $l15, storageV5: $l3 });
    let $l35 = $l30.firstParty && $m_ad($l34, $l13);
    if ($l33) $m_cc($l34.headers, () => $l8 !== "firstParty" || $m_C6n($l8));
    let $l36 = $l8 === "bedrock" && $l34.ok && $l13.includes($m_xp);
    if ($l36 && $l34.body && !$l34.headers.get("content-type") && !$m_a.CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_DEFAULT) $l34 = $m_vp($l34, $l34.body), $l34.headers.set("content-type", "application/vnd.amazon.eventstream");
    let $l37 = $l34.headers.get("content-type"), $l38 = $l37?.toLowerCase();
    if ($l36 && $l37 && !$l38?.includes("vnd.amazon.eventstream") && !$m_a.CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_GUARD) throw $l34.body?.cancel().catch(() => {
    }), new $m_Mp($l37);
    let $l39 = ($m_Tp($l8) || $l9) && $l38?.includes("text/event-stream"), $l40 = $l8 === "bedrock" && $l38?.includes("vnd.amazon.eventstream") && $m_Cp();
    if (($l39 || $l40) && $l34.body && $m_sl()) {
      let $l41 = $m_YLr($l8), $l42 = $l34.headers.get("cf-ray") ?? ($l40 ? $l34.headers.get("x-amzn-requestid") ?? void 0 : void 0), $l43 = { lastAt: 0 }, $l44 = $m_vp($l34, $m_dy($l34.body, $l41, $l42, $l43, $l4));
      Object.defineProperty($l44, "_chunkTimes", { value: $l43 }), $l34 = $l44;
    }
    if ($l35 && $l27($l30.init)) $m_ld($l34.headers);
    return $l34;
  };
}
;
