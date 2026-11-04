async function SELF($l0, $l1) {
  let $l2 = $m_J$r(), $l3 = $m_OYt(), $l4 = ($l5) => $m_gF($l1.querySource) ? $m__4($l5) : $l5(), $l6 = $l1.model, $l7 = $l6 !== void 0 ? $l4(() => $l3.modelConfig($l6)) : void 0, $l8 = $l4(() => $m_wte($l6)), $l9 = $l4(() => $m_lW($l8)), $l10 = $l6 !== void 0 && $l4(() => $m_w8n($l6)), $l11 = $l0 === $m_Wi && !$m_nMe() ? $l4(() => $m_I_e()) : void 0, $l12 = $m_gF($l1.querySource) ? "K:" : "", $l13 = $l9 ? "L:" : "", $l14 = $l2 === "vertex" && $l7?.eagerInputStreaming?.vertex || $l2 === "bedrock" && $l7?.eagerInputStreaming?.bedrock ? "F:" : "", $l15 = $l1.tools.some(($l16) => $m_Ct($l16, $m_Eo)) ? "S:" : "", $l17 = $l10 ? "X:" : "", $l18 = $m_Ct($l0, $m_Cn) ? $m_aa() ? "C1:" : $m_$V() ? "CL:" : "C0:" : "", $l19 = $m_Ct($l0, $m_Wd) ? $m_Bv($l1.tools) ? "A1:" : "A0:" : "", $l20 = $m_Ct($l0, $m_Xo) && $m_Ebr($l1.tools) ? "DP:" : "", $l21 = $m_Ct($l0, $m_ht) ? $m_hr() === "pro" ? "P1:" : "P0:" : "", $l22 = $m_Ct($l0, $m_ht) ? $m_Bv($l1.tools) : void 0, $l23 = $l22 === void 0 ? "" : $l22 ? "AC1:" : "AC0:", $l24 = !$m_nMe() && ($m_Ct($l0, $m_ht) || $m_Ct($l0, $m_Xo) || $m_Ct($l0, $m_mo) || $m_Ct($l0, $m_We) || $m_Ct($l0, $m_Or) || $m_Ct($l0, $m_Eo) || $m_Ct($l0, $m_Ai) || $m_Ct($l0, $m_hu)) ? $l4(() => $m_nle($l8)) : void 0, $l25 = $l24 === true ? "R:" : "", $l26 = $m_Ct($l0, $m_ri) ? $m_mae() ? "M1:" : "M0:" : "", $l27 = $m_Ct($l0, $m_ht) ? $m_GFe() ? "E1:" : "E0:" : "", $l28 = $m_Ct($l0, $m_ht) ? $m_Hbr($l1.querySource)?.whenToUse : void 0, $l29 = $l28 === void 0 ? "" : $l28 === "" ? "X0:" : "X1:", $l30 = $m_Ct($l0, $m_Va) ? $m_kt() ? "W1:" : "W0:" : "", $l31 = "", $l32 = $m_Ct($l0, $m_dn) ? require("./chunk-8b8f1sas.js").artifactCorePromptCacheKeyBit($l1.tools) : "", $l33 = $m_Ct($l0, $m_fr) ? $l1.tools.some(($l34) => $m_Ct($l34, $m_dn)) ? "WA1:" : require("./chunk-9kdcegxj.js").artifactMcpToolsReplaceBuiltIn($l1.tools) ? "WA2:" : "WA0:" : "", $l35 = $m_Ct($l0, $m_H9e) ? $l1.tools.some(($l36) => $m_Ct($l36, $m_Z1e)) ? "PS1:" : "PS0:" : "", $l37 = require("./chunk-whdvwma2.js").inboxSurfaceCacheKeyBit($l0, $l1.tools), $l38 = $l0.mcpInfo?.fileReference === true ? require("./chunk-rjgzz068.js").fileReferenceHintKeyBit($l0) : "", $l39 = $l1.withoutToolDescribeHooks ? "H:" : "", $l40 = $l1.loadedThroughToolSearch === true && $l0.isMcp === true ? "LT:" : "", $l41 = ($l1.byValueListing !== void 0 ? `V${$l1.byValueListing}:` : "") + $l39 + $l40 + $l12 + $l13 + $l14 + $l15 + $l17 + $l18 + $l19 + $l20 + $l21 + $l23 + $l25 + $l26 + $l27 + $l29 + $l30 + $l32 + $l33 + $l35 + $l37 + $l38 + ("inputJSONSchema" in $l0 && $l0.inputJSONSchema ? `${$l0.name}:${$l3.schemaKey($l0.inputJSONSchema)}` : $l0.name), $l42 = $m_PVo($l0, $l1, { cacheKey: $l41, structuredOutputs: $l10, provider: $l2, cfg: $l7, serializer: $l3 }), $l43 = $l42 ?? $m_nHe.get($l41);
  if (!$l43) {
    let $l44 = $m_nHe.stamp(), $l45 = $m_v_e($l0, { remoteToolForwarding: await $m_tVe([$l0]) });
    if ($l22 === false && !("inputJSONSchema" in $l0 && $l0.inputJSONSchema)) {
      let $l46 = $l45.properties;
      if (typeof $l46 === "object" && $l46 !== null && "name" in $l46 && typeof $l46.name === "object" && $l46.name !== null) $l45 = { ...$l45, properties: { ...$l46, name: { ...$l46.name, description: $m_WMo } } };
    }
    let $l47 = await $m_CVo($l0, { ...$l1, model: $l8, leanPrompt: $l9, bashFirstTrimmed: $l11, leanRewrite: $l24 }), $l48 = $l0.isMcp ? $l47 : $m_Jxe($l47, $l1.querySource), $l49 = $l1.enginePlacement === "deferred", $l50 = $l1.withoutToolDescribeHooks ? { description: $l48, isDeferred: $l49 } : await $m_dsi($l0, $l48, $l49);
    if (!$l1.withoutToolDescribeHooks && $l1.byValueListing === void 0) {
      let $l51 = $l50.isDeferred !== $l49 ? $l50.isDeferred : void 0;
      $m_Lqs($l0.name, $l51);
    }
    if ($l43 = { name: $l0.name, description: $l50.description, input_schema: $l45 }, $l10) {
      if ($l0.strict === true) {
        let $l52 = $m_CPr($l45);
        if ($l52.ok) $l43.strict = true, $l43.input_schema = $l52.schema;
        else $m_t(`Tool ${$l0.name} has strict: true but its schema is not strict-compatible (${$l52.reason}); sending non-strict`, { level: "warn" });
      } else if ($l0.strictInputJSONSchema && $m_k("tengu_structured_output_strict", false)) $l43.strict = true, $l43.input_schema = $l0.strictInputJSONSchema;
    }
    let $l53 = $m_nHe.getSentFromRecord($l41);
    if ($l53 ? $l53.eager_input_streaming : $m_IYt($l2, $l7)) $l43.eager_input_streaming = true;
    $m_nHe.register($l41, $l43, $l44);
  }
  let $l54 = $l1.recordedEntry, $l55 = $l54 !== void 0 && $l54.strict === true === ($l43.strict === true);
  if ($l54 !== void 0 && $l42 === void 0) $m_AVo($l3, $l43, $l54, $l55, { mcpTool: $l0.isMcp === true, artifactFamily: $m__Ie($l0) });
  let $l56 = $l1.isRedescribed === true && $m_isi($l0.name), $l57 = { name: $l43.name, description: $l56 ? $l43.description : $l54?.description ?? $l1.recordedDescription ?? $l43.description, input_schema: $l55 ? $l54.input_schema : $l43.input_schema, ...$l43.strict && { strict: true }, ...$l43.eager_input_streaming && { eager_input_streaming: true } };
  if ($l1.deferLoading) $l57.defer_loading = true;
  if ($l1.cacheControl) $l57.cache_control = $l1.cacheControl;
  if ($l0.name === $m_ip && $m_Wxr()) $l57.citations = { enabled: true };
  if ($m_VB()) {
    let $l58 = !$m_jan(), $l59 = /* @__PURE__ */ new Set(["name", "description", "input_schema", "cache_control", ...$l58 ? ["defer_loading"] : []]), $l60 = Object.keys($l57).filter(($l61) => !$l59.has($l61));
    if ($l60.length > 0) return $l3.logStripOnce($l60), { name: $l57.name, description: $l57.description, input_schema: $l57.input_schema, ...$l57.cache_control && { cache_control: $l57.cache_control }, ...$l58 && $l57.defer_loading && { defer_loading: true } };
  }
  return $l57;
}
;
