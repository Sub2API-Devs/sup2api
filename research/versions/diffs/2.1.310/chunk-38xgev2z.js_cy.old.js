function SELF($l0, $l1, $l2, $l3, $l4) {
  let $l5 = $l0 ?? $m_mle, $l6 = $m_Pe(), $l7 = $m_il($l6);
  return async ($l8, $l9) => {
    let $l10 = new Headers($l9?.headers), $l11 = $l8 instanceof Request ? $l8.url : String($l8), { method: $l12 } = $m_x9n($l8, $l9);
    $m_KUo($l5, $l12, $l11);
    let $l13 = $l10.get($m_wke) ?? void 0;
    if ($l7 && !$l10.has($m_wke)) $l10.set($m_wke, $m_ey());
    if ($l7 && ($m_DK() && $m_mc() || $m_bKe())) {
      $l10.set($m_fc, "true");
      let $l14 = $m_k6n($m_q4o());
      if ($l14 !== void 0) $l10.set($m_pc, $l14);
    }
    if ($m_wo($l11) && $m_sa() && $m_EJe()) $l10.set($m_hht, $m_RLr);
    if ($l7) {
      let $l15 = $m_hUo();
      if ($l15 !== void 0) $l10.set($m_mUo, $l15);
    }
    try {
      let $l16 = $l10.get($m_wke);
      if ($m_t(`[API REQUEST] ${new URL($l11).pathname}${$l16 ? ` ${$m_wke}=${$l16}` : ""} source=${$l1 ?? "unknown"}`), $m_Wyn() === "verbose") $m_t(`[API REQUEST AUTH] ${$m__($m_fy($l10))}`, { level: "verbose" });
    } catch {
    }
    let $l17 = { ...$l9, headers: $l10 }, $l18 = $l9?.body, $l19 = $m_iFs($l13), $l20 = $m_nNt($l11, $l18, $l3), $l21 = $l20?.gzip && typeof $l18 === "string", $l22 = $l21 ? $m_rFs() : void 0;
    if ($l21) $l17.compress = $l22 === void 0 ? "gzip" : { encoding: "gzip", level: $l22 }, $m_vin(), $l17.body = $m_HBt($l18);
    if ($l13 !== void 0 && $l20 !== void 0) {
      let $l23 = $l19 === void 0 ? {} : { requestPrepareMs: Math.round(performance.now() - $l19) };
      $m_BPo($l13, $l20.gzip ? { requestBodyEncoding: "gzip", requestBodyChars: $l20.bodyChars, requestBodyGzipLevel: $l22, ...$l23 } : { requestBodyEncoding: "identity", requestBodyChars: $l20.bodyChars, gzipSkipReason: $l20.reason, ...$l23 });
    }
    let $l24 = $m_ly({ clientRequestId: $l13, provider: $l6, routedProvider: $l2, method: $l12, url: $l11, body: $l18 }), $l25 = ($l26) => {
      try {
        return $m_id({ provider: $l6, routedProvider: $l2, url: $l11, init: $l26 });
      } catch ($l27) {
        return $m_l($m_U($l27)), false;
      }
    }, $l28 = { init: $l17, firstParty: false }, $l29 = ($l30) => ($l28.init = $l30, $l28.firstParty = $l25($l30), $l24 === void 0 ? $l5($l8, $l30) : $m_uy($l5, $l8, $l30, $l24, $l4)), $l31 = $l7 && $m_wo($l11);
    if ($l31) $m_Pc($l4.now());
    let $l32 = await $l29($l17);
    if ($m_VUo($l5, $l12, $l32), $l21) $l32 = await $m_Ec($l32, () => $l29($l17)), $l32 = await $m_UPo({ res: $l32, dispatch: $l29, finalInit: $l17, identityBody: $l18, clientRequestId: $l13, storageV5: $l3 });
    let $l33 = $l28.firstParty && $m_ad($l32, $l11);
    if ($l31) $m_cc($l32.headers, () => $l6 !== "firstParty" || $m_C6n($l6));
    let $l34 = $l6 === "bedrock" && $l32.ok && $l11.includes($m_xp);
    if ($l34 && $l32.body && !$l32.headers.get("content-type") && !$m_a.CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_DEFAULT) $l32 = $m_vp($l32, $l32.body), $l32.headers.set("content-type", "application/vnd.amazon.eventstream");
    let $l35 = $l32.headers.get("content-type"), $l36 = $l35?.toLowerCase();
    if ($l34 && $l35 && !$l36?.includes("vnd.amazon.eventstream") && !$m_a.CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_GUARD) throw $l32.body?.cancel().catch(() => {
    }), new $m_Mp($l35);
    let $l37 = ($m_Tp($l6) || $l7) && $l36?.includes("text/event-stream"), $l38 = $l6 === "bedrock" && $l36?.includes("vnd.amazon.eventstream") && $m_Cp();
    if (($l37 || $l38) && $l32.body && $m_sl()) {
      let $l39 = $m_YLr($l6), $l40 = $l32.headers.get("cf-ray") ?? ($l38 ? $l32.headers.get("x-amzn-requestid") ?? void 0 : void 0), $l41 = { lastAt: 0 }, $l42 = $m_vp($l32, $m_dy($l32.body, $l39, $l40, $l41, $l4));
      Object.defineProperty($l42, "_chunkTimes", { value: $l41 }), $l32 = $l42;
    }
    if ($l33 && $l25($l28.init)) $m_ld($l32.headers);
    return $l32;
  };
}
;
