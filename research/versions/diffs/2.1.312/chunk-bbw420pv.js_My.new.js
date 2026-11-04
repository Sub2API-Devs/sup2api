function SELF($l0, $l1, $l2, $l3, $l4, $l5, $l6, $l7, $l8) {
  let $l9 = $l0 ?? $m_ece, $l10 = $m_Ae(), $l11 = $m_gl($l10);
  return async ($l12, $l13) => {
    let $l14 = new Headers($l13?.headers), $l15 = $l12 instanceof Request ? $l12.url : String($l12), { method: $l16 } = $m_VKt($l12, $l13);
    $m_$5o($l9, $l16, $l15);
    let $l17 = $l14.get($m_kAe) ?? void 0;
    if ($l11 && !$l14.has($m_kAe)) $l14.set($m_kAe, $NEW_chunk_yagw4eem_js_ew());
    if ($l11 && ($m_Mq() && $m_Ac() || $m_EYe())) {
      $l14.set($m_vc, "true");
      let $l18 = $m_y9n($m_rns());
      if ($l18 !== void 0) $l14.set($m_Rc, $l18);
    }
    if ($m_an($l15) && $m_Qs() && $m_LZe()) $l14.set($m_dbt, $m_zBr);
    if ($l11) {
      let $l19 = $m_JYo();
      if ($l19 !== void 0) $l14.set($m_YYo, $l19);
    }
    if ($m_an($l15) && $NEW_chunk_yagw4eem_js_lf()) {
      let $l20 = false;
      try {
        $l20 = $m_S9n($l10);
      } catch {
      }
      if ($l20) {
        if ($l14.set($NEW_chunk_yagw4eem_js_af, $NEW_chunk_yagw4eem_js_uf($NEW_chunk_zpsbh0wk_js_j_())), $m_Ti().once("tools_used_header")) $m_g("api_tools_used_header");
      }
    }
    try {
      let $l21 = $l14.get($m_kAe);
      if ($m_t(`[API REQUEST] ${new URL($l15).pathname}${$l21 ? ` ${$m_kAe}=${$l21}` : ""} source=${$l1 ?? "unknown"}`), $m_Jkn() === "verbose") $m_t(`[API REQUEST AUTH] ${$m__($m_Ty($l14))}`, { level: "verbose" });
    } catch {
    }
    if ($l7 && $l11 && $m_an($l15)) await $m_pl($l14, $l7);
    let $l22 = { ...$l13, headers: $l14 }, $l23 = $l13?.body, $l24 = $m_N5s($l17), $l25 = $m_cjt($l15, $l23, $l4), $l26 = $l25?.gzip && (typeof $l23 === "string" || $NEW_chunk_t6h9vpfq_js_cnt($l23)), $l27 = $l26 ? $m_D5s() : void 0;
    if ($l26) $l22.compress = $l27 === void 0 ? "gzip" : { encoding: "gzip", level: $l27 }, $m_Jfn(), $l22.body = typeof $l23 === "string" ? $m_lKt($l23) : $NEW_chunk_f7avdr1b_js_nfi($l23, "room_after_is_free");
    if ($l17 !== void 0 && $l25 !== void 0) {
      let $l28 = { ...$l24 !== void 0 && { requestPrepareMs: Math.round(performance.now() - $l24) }, ...$NEW_chunk_t6h9vpfq_js_NKo($l23) };
      $m_bBo($l17, $l25.gzip ? { requestBodyEncoding: "gzip", requestBodyChars: $l25.bodyChars, requestBodyGzipLevel: $l27, querySource: $l2, ...$l28 } : { requestBodyEncoding: "identity", requestBodyChars: $l25.bodyChars, gzipSkipReason: $l25.reason, ...$l28 });
    }
    let $l29 = $m_ky({ clientRequestId: $l17, provider: $l10, routedProvider: $l3, method: $l16, url: $l15, body: $l23, noResponseRetryLedger: $l6 }), $l30 = ($l31) => {
      try {
        return $m_Sd({ provider: $l10, routedProvider: $l3, url: $l15, init: $l31 });
      } catch ($l32) {
        return $m_l($m_N($l32)), false;
      }
    }, $l33 = { init: $l22, firstParty: false }, $l34 = ($l35) => ($l33.init = $l35, $l33.firstParty = $l30($l35), $l29 === void 0 ? $l9($l12, $l35) : $m_xy($l9, $l12, $l35, $l29, $l5)), $l36 = $l11 && $m_an($l15);
    if ($l36) $m_Hc($l5.now());
    let $l37 = await $l34($l22);
    if ($m_F5o($l9, $l16, $l37), $l26) $l37 = await $m_Lc($l37, () => $l34($l22)), $l37 = await $m__Bo({ res: $l37, dispatch: $l34, finalInit: $l22, identityBody: $l23, clientRequestId: $l17, storageV5: $l4 });
    let $l38 = $l33.firstParty && $m_Ed($l37, $l15);
    if ($l36) $m_Ec($l37.headers, () => $l10 !== "firstParty" || $m_S9n($l10));
    let $l39 = $l10 === "bedrock" && $l37.ok && $l15.includes($m_qp);
    if ($l39 && $l37.body && !$l37.headers.get("content-type") && !$m_i.CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_DEFAULT) $l37 = $m_Up($l37, $l37.body), $l37.headers.set("content-type", "application/vnd.amazon.eventstream");
    let $l40 = $l37.headers.get("content-type"), $l41 = $l40?.toLowerCase();
    if ($l39 && $l40 && !$l41?.includes("vnd.amazon.eventstream") && !$m_i.CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_GUARD) throw $l37.body?.cancel().catch(() => {
    }), new $m_zp($l40);
    let $l42 = ($m_Gp($l10) || $l11) && $l41?.includes("text/event-stream"), $l43 = $l10 === "bedrock" && $l41?.includes("vnd.amazon.eventstream") && $m_Yp();
    if (($l42 || $l43) && $l37.body && $m_hi()) {
      let $l44 = $m_f1r($l10), $l45 = $l37.headers.get("cf-ray") ?? ($l43 ? $l37.headers.get("x-amzn-requestid") ?? void 0 : void 0), $l46 = { lastAt: 0 }, $l47 = $l42 ? $NEW_chunk_yagw4eem_js_eh($l8) : 0, $l48 = $m_Up($l37, $NEW_chunk_yagw4eem_js_pw($l47 > 0 ? $NEW_chunk_yagw4eem_js_nh($l37.body, $l47, $l5) : $l37.body, $l44, $l45, $l46, $l5));
      Object.defineProperty($l48, "_chunkTimes", { value: $l46 }), $l37 = $l48;
    }
    if ($l38 && $l30($l33.init)) $m_vd($l37.headers);
    return $l37;
  };
}
;
