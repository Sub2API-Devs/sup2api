async function* SELF($l0, $l1, $l2) {
  let $l3 = $m_efr($l2), $l4 = $l3, $l5 = $l2.clock ?? $m_Xd, $l6 = { model: $l2.model, ...$m_jo() && { fastMode: $l2.fastMode } }, $l7 = null, $l8 = $l2.initialConsecutive529Errors ?? 0, $l9, $l10 = 0, $l11 = $l2.modelCallRetries?.capacityWait ?? { spentMs: 0, usageLimitSpentMs: 0 }, $l12 = 0, $l13 = false, $l14 = 0, $l15 = false, $l16 = { open: void 0 }, $l17 = 0, $l18 = 0, $l19 = 0, $l20 = $l2.noResponseRetryLedger ?? { count: 0 }, $l21 = 0, $l22 = 0, $l23 = 0, $l24 = 0, $l25 = 0, $l26, $l27 = false, $l28, $l29, $l30 = /* @__PURE__ */ new Set(), $l31 = false, $l32 = false, $l33 = { count: 0 }, $l34 = $l2.lowPriorityWait ?? $m_ILr(), $l35 = $l2.lowPriorityWait === void 0, $l36 = $m_PFr(), $l37 = $m_IFr();
  try {
    let $l38 = $m_pJe($l2);
    if ($l38 !== void 0 && $m_Uyt($l2.model)) throw new $m_pD($l2.model, $l38, "permission_denied", $m_lqs($l2.model));
    for (let $l39 = 1; $l39 <= $l4 + 1; $l39++) {
      if ($l2.signal?.aborted) throw new $m_cu();
      if ($l2.modelCallRetries?.takeApiAttempt() === false) throw new $m_Wc(new $m_yke(), $l6);
      let $l40 = $l5.now();
      if ($l32 = false, $l6.fastMode && $m_lun($l6.model)) $l6.fastMode = false;
      let $l41 = $m_jo() ? $l6.fastMode && !$m_AGe() : false, $l42 = Math.min($l39 + $l10, $l4 + 1);
      try {
        let $l43 = $m_Wcr($l9);
        if ($l43) $m_t("Stale connection \u2014 disabling keep-alive for retry"), $m_sKo();
        let $l44 = false;
        if ($m_Gcr($l9)) {
          let $l45 = await $m_zcr(!$l27);
          if ($l44 = $l45.attempted, $l45.reportedFailure) $l27 = true;
        }
        let $l46 = $l28 !== void 0 && Boolean($m_a.CLAUDE_CODE_REMOTE_SESSION_ID) && $m_Ucr($l28);
        if ($l46) $m_t("Credential rotated since the client was built \u2014 rebuilding before retry");
        if ($l7 === null || $l46 || $m_imn($l9, $l6.model) || $l43 || $l44) {
          if ($l9 instanceof $m_Ot && $l9.status === 401 || $m_Hne($l9) || $m__ve() && ($m_bJe($l9, $l6.model) || $m_cK($l9))) {
            if (!$m_Xle() && $m_nc()) await $m_f0o($l7?.authToken);
            if ($l28) {
              let $l47;
              await $m_mS($l28, $l2.credentials, $l2.storageV5, { onForcedRefreshOutcome: ($l48) => {
                $l47 = $l48;
              } });
              let $l49 = $m_tTe();
              if ($l49) throw $m_m("api_request", "api_request_account_on_hold"), new $m_Wc(new $m_nye($l49.url), $l6);
              if ($m_Mn()?.accessToken === $l28) {
                if ($m_NAe() !== null || !$m_fB($l9) && ++$l21 >= $m_Icr) {
                  if ($l47 === "lock_disk_full" && $m_jcr($l9)) throw $m_m("api_request", "api_request_oauth_refresh_disk_full"), new $m_Wc(new $m_pK(), $l6);
                  throw $m_m("api_request", "api_request_oauth_refresh_exhausted"), new $m_Wc($l9, $l6);
                }
              } else $l21 = 0;
            } else if ($m__ve() && process.env[$m_yut()] !== $l29) $m_t("Host credential replaced since the client was built \u2014 retrying with it");
            else if ($m__ve()) {
              let $l50 = null, $l51, $l52 = false, $l53 = false;
              try {
                ({ authToken: $l50, materialUnchanged: $l51 } = await $m_vKe()());
              } catch ($l54) {
                if ($m_t(`host getHostAuthToken callback failed: ${$m_awo($l54)}`, { level: "error" }), $l54 instanceof $m_Cd) throw new $m_Wc($l9, $l6);
                if ($m_Ke($l54)) $l53 = true;
                else $l52 = true, $m_m("host_auth_recovery", "callback_failed");
              }
              let $l55 = ($l56) => {
                if (++$l22 >= $m_Dcr) throw $m_m("host_auth_recovery", $l56), $m_m("api_request", "api_request_host_auth_exhausted"), new $m_Wc($l9, $l6);
              };
              if ($l52) ;
              else if ($l53) $l55("callback_aborted");
              else if (typeof $l50 === "string" && $l50 && $l50 !== $l29) process.env[$m_yut()] = $l50, $m_DB(), $l22 = 0, $m_NRs("host_auth_recovery");
              else if ($l50 === null) if ($l51 === true) $l55("material_unchanged");
              else $l22 = 0, $m_NRs("host_auth_recovery");
              else $l55("bearer_unchanged");
            } else if (($m__d() && $m_Xn() || $m_Pun()) && !$m_nc() && $m_na().source !== "apiKeyHelper" && !$m_fB($l9)) throw $m_m("api_request", "api_request_host_managed_auth_fail"), new $m_Wc($l9, $l6);
          }
          $l29 = process.env[$m_yut()], $l7 = await $l0(), $l28 = $m_ll() ? $m_Mn()?.accessToken : void 0;
        }
        $l32 = $m_sa() && $m_EJe();
        let $l57 = await $l1($l7, $l42, $l6);
        if ($m_NRs("api_request"), $l15) $m_NRs("api_reconnect"), $l15 = false;
        if ($m_iqs($l2.model), !$m_PGe() && !$m_oqs($l2.model) && !$m_SQe() && $m_J3n($l2.model, $m_VWn, $m_Lve)) $m_t(`[model-access] now using ${$l2.model} as its tier's default: every newer model of the tier was refused, is not allowed, or was skipped because of its context window`), $m_YWn($l2.model, "ok");
        if ($l35) $m_f6n($l34);
        return $l57;
      } catch ($l58) {
        if ($l58 instanceof $m_Wc) throw $l58;
        if ($l58 instanceof $m_cu) throw $l58;
        if ($m_Q7e($l58)) throw $m_m("api_request", "api_request_dlp_denied"), new $m_Wc($l58, $l6);
        if ($m_Mze($l58)) throw $m_m("api_request", "api_request_safety_monitor_blocked"), new $m_Wc($l58, $l6);
        if ($m_ZP($l58)) throw $m_m("api_request", "api_request_output_content_filtered"), new $m_Wc($l58, $l6);
        if ($m_eun($l58)) throw $m_m("api_request", "api_request_verification_required"), new $m_Wc($l58, $l6);
        if ($m_bX($l58)) throw $m_m("api_request", "api_request_regime_features_refused"), new $m_Wc($l58, $l6);
        if ($NEW_chunk_bbw420pv_js_a1r($l58)) {
          let $l59 = $m_Mbt($l58) && !$l2.modelCallRetries?.outOfApiAttempts() ? $l2.fallbackModel ?? ($m_Sd($l2.model) === "firstParty" ? $m_pJe($l2) : void 0) : void 0;
          if ($l59 && $l59 !== $l2.model) throw $m_i("tengu_api_model_not_found_fallback_triggered", { original_model: $m_Et($l2.model), fallback_model: $m_Et($l59), provider: $m_gA(), reason: $m_h("permission_denied") }), new $m_pD($l2.model, $l59, "permission_denied", $l58);
          throw $m_m("api_request", "api_request_route_answer_final"), new $m_Wc($l58, $l6);
        }
        if ($l2.modelCallRetries?.outOfApiAttempts()) throw $m_m("api_request", "api_request_attempts_exhausted"), new $m_Wc($l58, $l6);
        if ($l9 = $l58, $m_t(`API error (attempt ${$l42}/${$l4 + 1}): ${$l58 instanceof $m_Ot ? `${$l58.status} ${$l58.message}` : $m_awo($l58)}`, { level: "error" }), $m_dmn($l58) !== void 0) {
          if (!$NEW_chunk_j0tbz6ra_js_zb() && $l20.count >= $m_gmn) throw $m_m("api_request", "api_request_no_response_exhausted"), new $m_Wc($l58, $l6);
          $l20.count++;
        }
        let $l60, $l61 = $m_a.CLAUDE_CODE_NONSTREAMING_TIMEOUT_RETRIES ?? ($NEW_chunk_j0tbz6ra_js_zb() && $l2.failedStreamOutlastedTimeout ? $m_Ncr : void 0);
        if ($l61 !== void 0 && $l2.nonStreamingTimeoutMs !== void 0 && $l58 instanceof $m_OA && $l5.now() - $l40 >= $l2.nonStreamingTimeoutMs * $m_Lcr) {
          if ($l17 >= $l61) throw $m_m("api_request", "api_request_nonstreaming_timeout_exhausted"), new $m_Wc($l58, $l6);
          $l17++, $l60 = $l61 - $l17;
        }
        let $l62 = await $l2.onError?.($l58);
        if ($l62 && !$l30.has($l62)) {
          $l30.add($l62);
          let $l63 = $m_uJe($l58, $l6.model);
          if ($l63?.noResponse) {
            $l31 = true;
            let $l64 = $m_lmn($l63, $l39, $l4, $l20.count);
            $l2.onRetryStatus?.({ kind: "retrying", error: $l63, attempt: $l39, maxRetries: $l64, retryInMs: 0, deadline: $l5.now() }), yield $m_N2($l63, 0, $l39, $l64, "request_retry");
          }
          $l39--;
          continue;
        }
        let $l65 = $m_DLr($l58, { markedAtDispatch: $l32, querySource: $l2.querySource, wait: $l34 });
        if ($l65 !== null) {
          $l31 = true, $l2.onRetryStatus?.({ kind: "low_priority_waiting", attempt: $l65.attempt, retryInMs: $l65.delayMs, deadline: $l5.now() + $l65.delayMs }), await $m_Y($l65.delayMs, $l2.signal, { abortError: $m_lZ, clock: $l5 }), $l39--;
          continue;
        }
        if ($m_ODt($l2.model, $l58) === "refused") {
          $m_AW($l2.model, $l58), $m_YWn($l2.model, "refused");
          let $l66 = $m_lJe($l2);
          if ($l66 !== void 0) throw $m_i("tengu_api_model_not_found_fallback_triggered", { original_model: $m_Et($l2.model), fallback_model: $m_Et($l66), provider: $m_gA(), reason: $m_h("model_access_refused") }), new $m_pD($l2.model, $l66, "permission_denied", $l58);
          throw $m_qWn($l2.model, $l58, "refused"), new $m_Wc($l58, $l6);
        }
        if ($m_ODt($l2.model, $l58) === "denied") {
          let $l67 = await $m_Kcr($l2.signal);
          if ($l67 !== void 0 && $l67 === $l26) {
            if ($l2.signal?.aborted) throw $m_lZ();
            let $l68 = $m_lJe($l2), $l69 = $l68 === void 0 ? void 0 : await $m_zEo($l68, $l67);
            if ($l68 !== void 0 && $l69 === "accessible" && $m_lJe($l2) === $l68) throw $m_AW($l2.model, $l58), $m_YWn($l2.model, "refused"), $m_i("tengu_api_model_not_found_fallback_triggered", { original_model: $m_Et($l2.model), fallback_model: $m_Et($l68), provider: $m_gA(), reason: $m_h("model_access_denied") }), new $m_pD($l2.model, $l68, "permission_denied", $l58);
            let $l70 = $l68 !== void 0 && $l69 === "refused" && $l2.fallbackModel === void 0;
            if ($l70) $m_AW($l68, $m_MJ($l68));
            if ($l68 === void 0 || $l70) $m_qWn($l2.model, $l58, "denied");
            throw new $m_Wc($l58, $l6);
          }
          $l26 = $l67;
        } else $l26 = void 0;
        let $l71 = $m_tDe($l58) || $m_Mbt($l58), $l72 = $l2.fallbackModel ?? ($l71 && $m_Sd($l2.model) === "firstParty" ? $m_pJe($l2) : void 0);
        if (($l71 || !$NEW_chunk_j0tbz6ra_js_zb() && $m_yJe($l58)) && $l72 && $l72 !== $l2.model) {
          let $l73 = $m_tDe($l58) ? "model_not_found" : $m_Mbt($l58) ? "permission_denied" : "server_error";
          throw $m_i("tengu_api_model_not_found_fallback_triggered", { original_model: $m_Et($l2.model), fallback_model: $m_Et($l72), provider: $m_gA(), reason: $m_h($l73) }), new $m_pD($l2.model, $l72, $l73, $l58);
        }
        let $l74 = $m_FTe($l58), $l75 = $l74 && $l24 < $m_omn;
        if (!$l74 && !$m_fB($l58) && $l58 instanceof $m_Ot && ($l58.status !== void 0 || $m_GW($l58)) && $m_mJe($l58) === void 0) $l24 = 0, $l14 = 0;
        let $l76 = $m_G6();
        if ($l41 && $l58 instanceof $m_Ot && ($l58.status === 429 || $m_GW($l58))) {
          let $l77 = $l58.headers?.get("anthropic-ratelimit-unified-overage-disabled-reason");
          if ($l77 !== null && $l77 !== void 0) {
            if ($m_vVs($l77, $l2.storageV5), $l6.fastMode = false, $l76) $l39--;
            continue;
          }
          let $l78 = $m_ofr($l58), $l79 = $l78 !== null && $l78 < $m_cJe;
          if ($l79 && !$l76) {
            if ($l39 <= $l4) {
              let $l80 = Math.min($m_PF($l39, $m_fJe($l58), $m_cJe, $l2.random), $m_cJe), $l81 = $m_uJe($l58, $l6.model);
              if ($l81) $l31 = true, $l2.onRetryStatus?.({ kind: "retrying", error: $l81, attempt: $l39, maxRetries: $l4, retryInMs: $l80, deadline: $l5.now() + $l80 }), yield $m_N2($l81, $l80, $l39, $l4, "request_retry");
              await $m_amn($l80, $l2);
            }
            continue;
          }
          if (!$l79) {
            let $l82 = Math.max($l78 ?? $m_tfr, $m_nfr), $l83 = $m_GW($l58) ? "overloaded" : "rate_limit";
            if ($m_yVs(Date.now() + $l82, $l83), $m_jo()) $l6.fastMode = false;
            if ($l76) $l39--;
            continue;
          }
        }
        if ($l41 && $m_hJe($l58, $l6.model) && ($l2.modelIsRefusalFallbackTarget || $m_U$r($l6.model))) {
          if ($m_bVs($l6.model), $l6.fastMode = false, $NEW_chunk_j0tbz6ra_js_zb()) $l39--;
          continue;
        }
        if ($l41 && $m_jTe($l58)) {
          if ($m__Vs($l2.storageV5), $l6.fastMode = false, $NEW_chunk_j0tbz6ra_js_zb()) $l39--;
          continue;
        }
        if ($m_K4t($l58, { model: $l6.model, carriesConfigSkips: true }, $l33)) {
          $l39--;
          continue;
        }
        if ($m_GW($l58) && !$m_Dke($l2.querySource) && !$NEW_chunk_j0tbz6ra_js_zb()) throw $m_i("tengu_api_529_background_dropped", { query_source: $m_os($l2.querySource) }), $m_m("api_request", "api_request_overload_background_dropped"), new $m_Wc($l58, $l6);
        let $l84 = $m_qe($l2.model);
        if ($m_GW($l58) && ($m_a.FALLBACK_FOR_ALL_PRIMARY_MODELS || $l2.fallbackModel !== void 0 || !$m_kt() && ($m_Kle($l84) || $m_IGe($l84) || $m_dBt($l84)))) {
          if ($l8++, $l8 >= $m_dZ) {
            if ($l2.fallbackModel) throw $m_i("tengu_api_opus_fallback_triggered", { original_model: $m_Et($l2.model), fallback_model: $m_Et($l2.fallbackModel), provider: $m_gA() }), $m_dn("api_request", "api_request_fallback_triggered"), new $m_pD($l2.model, $l2.fallbackModel, "overloaded", $l58);
            if (!$m_a.IS_SANDBOX && !$m_G6()) throw $m_i("tengu_api_custom_529_overloaded_error", {}), $m_m("api_request", "api_request_overload_repeated"), new $m_Wc(Error($m_nke, { cause: $l58 }), $l6);
          }
        }
        let $l85 = $m_G6() && $m_ymn($l58), $l86 = $l58 instanceof $m_Zu && $m_umn($l58) && ($l2.modelCallRetries?.sleptThroughLeft() ?? 0) > 0, $l87 = $NEW_chunk_x8k0r295_js_isr($l58);
        if ($l87 && ($l2.modelCallRetries?.reconnectsLeft() ?? 0) > 0) $l4++;
        if ($l39 > $l4 && !$l85 && !$l86) {
          let $l88 = !($l58 instanceof $m_Ot && $l58.status === 401) || $l28 !== void 0 || $m__ve() || $m_FTe($l58) || !$m_Xle() && $m_nc();
          if (!$m_imn($l58, $l6.model) || !$l88 || $l2.modelCallRetries?.takeCredentialRenewal() !== true) throw $m_m("api_request", "api_request_retry_exhausted"), new $m_Wc($l58, $l6);
          $l39--;
        }
        if ($m_fB($l58)) {
          if ($l14 >= $m_Mcr) throw $m_m("api_request", "api_request_ccr_auth_exhausted"), new $m_Wc($l58, $l6);
          $l14++;
        }
        let $l89, $l90 = $m_fK($l58);
        if ($m_IFr() > $l37 && ($l90 === "AWS" || !$m__ve() && $m__Je($l58, $l6.model))) throw $m_m("api_request", "api_request_aws_sign_in_failed"), new $m_Wc($l58, $l6);
        if ($l90 === "AWS" || !$m__ve() && $m_SJe($l58, $l6.model)) {
          if ($l18 >= $m_tmn) throw $m_m("api_request", "api_request_aws_auth_exhausted"), new $m_Wc($l58, $l6);
          $l18++, $l89 = $m_tmn - $l18;
        }
        if ($l90 === "Google Cloud" || !$m__ve() && $m_cK($l58)) {
          if ($m_PFr() > $l36) throw $m_m("api_request", "api_request_gcp_sign_in_failed"), new $m_Wc($l58, $l6);
          if ($l19 >= $m_nmn) throw $m_m("api_request", "api_request_gcp_auth_exhausted"), new $m_Wc($l58, $l6);
          $l19++, $l89 = $m_nmn - $l19;
        }
        if ($l58 instanceof $m_Ot && ($l58.status === 401 || $l58.status === 403) && $m_Xn() && $m_Vge() && $m_Xyt() !== null) {
          if ($l23 >= $m_Fcr) throw $m_m("api_request", "api_request_api_key_helper_failed"), new $m_Wc($l58, $l6);
          $l23++;
        }
        if ($l74) {
          if ($l24 === $m_omn) $m_dn("api_request", "api_request_api_key_helper_auth_exhausted");
          $l24++;
        }
        if ($l58 instanceof $m_Yu && $l58.statusCode === 401) {
          if ($l25 >= $m_Hcr) throw $m_m("api_request", "api_request_wif_exchange_401"), new $m_Wc($l58, $l6);
          $l25++;
        }
        if (!($m_Vcr($l58, $l6.model) || $m_Ycr($l58) || await $m_Xcr($l58)) && (!($l58 instanceof $m_Ot) || !$m_Qcr($l58))) {
          let $l91 = $l58 instanceof $m_Ot && ($l58.status !== void 0 && $m_qcr.has($l58.status) && !($l58.status === 404 && $l2.isNonStreamingRequest) || $l58.type === "billing_error" || $l2.isResumePrefillRequest === true && $l58.status !== void 0 && $m_D1r($l58.status) || $m__mn.some(($l92) => $l92($l58)));
          if ($l58 instanceof $m_Ot && $l58.status !== void 0 && !$l91 && $l2.fallbackModel && $l2.fallbackModel !== $l2.model) throw $m_i("tengu_api_fallback_last_resort", { status: $l58.status, errorType: $m_h($m_q7($l58.type)), provider: $m_gA(), fastMode: $l6.fastMode ?? false }), $m_dn("api_request", "api_request_last_resort_fallback"), new $m_pD($l2.model, $l2.fallbackModel, $l58.status === 404 && $m_Tjo($l58) ? "model_not_found" : "last_resort", $l58);
          throw $m_m("api_request", $l58 instanceof $m_nye || $m__2e($l58) !== null ? "api_request_account_on_hold" : $l58 instanceof $m_kht ? "api_request_oauth_refresh_lock_timeout" : "api_request_non_retryable"), new $m_Wc($l58, $l6);
        }
        if ($l58 instanceof $m_Ot) {
          let $l93 = $m_UTe($l58);
          if ($l93) {
            let { inputTokens: $l94, contextLimit: $l95 } = $l93, $l96 = 1e3, $l97 = Math.max(0, $l95 - $l94 - 1e3);
            if ($l97 < $m_Zpn) throw $m_l(Error(`availableContext ${$l97} is less than FLOOR_OUTPUT_TOKENS ${$m_Zpn}`)), $l58;
            let $l98 = $l97;
            if ($l6.maxTokensOverride !== void 0 && $l98 >= $l6.maxTokensOverride) throw $m_l(Error("max_tokens overflow adjustment made no progress")), $l58;
            $l6.maxTokensOverride = $l98, $m_i("tengu_max_tokens_context_overflow_adjustment", { inputTokens: $l94, contextLimit: $l95, adjustedMaxTokens: $l98, attempt: $l39 });
            continue;
          }
        }
        let $l99 = $m_fJe($l58), $l100, $l101 = $l85, $l102 = null;
        if ($l85) {
          let $l103 = ($m_a.CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS ?? 1 / 0) - $l11.spentMs;
          if ($l103 <= 0) throw $m_m("api_request", "api_request_capacity_wait_exhausted"), new $m_Wc($l58, $l6);
          $l10++;
          let $l104 = null;
          if ($l58 instanceof $m_Ot && $l58.status === 429) {
            if ($l104 = $m_rfr($l58, $l5), $l104 !== null && $l58.headers?.get?.("anthropic-ratelimit-unified-status") === "rejected") {
              let $l105 = ($m_a.CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS ?? 1 / 0) - $l11.usageLimitSpentMs;
              if ($l104 > $l105) {
                let $l106 = $l58.headers?.get($m_EFt), $l107 = $l106 === "allowed" || $l106 === "allowed_warning";
                if ($l105 <= 0 || !$l107 && $l58.headers?.get($m_MWe) !== "fetch_error") throw $m_m("api_request", "api_request_usage_limit_wait_too_long"), new $m_Wc($l58, $l6);
                $l104 = $l107 ? Math.min($l105, $m_PF($l10, null, $m_rmn, $l2.random)) : $l105;
              }
              $l102 = $l58;
            }
          }
          $l100 = Math.min($l104 ?? $m_PF($l10, $l99, $m_rmn, $l2.random), $m_smn), $l100 = Math.min($l100, $l103);
        } else if ($m_fB($l58)) $l100 = $m_Ocr;
        else if ($l75) $l100 = $m_$cr;
        else {
          let $l108 = $m_GW($l58), $l109 = $l108 ? $m_a.CLAUDE_CODE_OVERLOADED_RETRY_MAX_DELAY_MS : void 0;
          if ($l100 = $m_PF($l39 + $l10, $l99, $l109, $l2.random, $l108 ? $m_a.CLAUDE_CODE_OVERLOADED_RETRY_BASE_DELAY_MS : void 0), $NEW_chunk_j0tbz6ra_js_zb()) $l100 = Math.min($l100, $m_smn), $l101 = true;
          else if ($l100 > Math.max($m_Bcr, Math.ceil(($l109 ?? 0) * (1 + $m_kjo)))) throw $m_i("tengu_api_retry_after_too_long", { delayMs: $l100, status: $l58.status, provider: $m_gA() }), $m_m("api_request", "api_request_retry_after_too_long"), new $m_Wc($l58, $l6);
        }
        if ($l39 > $l3 && !$l85 && !$l86) $l15 = true;
        let $l110 = $l85 ? $l10 : $l86 ? Math.max(1, Math.min($l39, $l4)) : $l39, $l111 = $m_jpe($l58);
        if ($l2.modelCallRetries?.reportHttpFailure($l58, "retry"), $m_i("tengu_api_retry", { attempt: $l110, delayMs: $l100, error: $m_Z7e($l111, $l58 instanceof $m_Ot ? $l58.status : void 0), errorType: $m_h($l111), ...$m_Ip($l58), status: $l58.status, provider: $m_gA(), attempt_duration_ms: $l5.now() - $l40 }), $m_X("warn", "cli_api_retry", () => ({ ...$m_mL($l58, $l111), attempt: $l110, delay_ms: $l100, attempt_duration_ms: $l5.now() - $l40, model: $m_Et($l2.model) ?? null, query_source_category: $m_rs($l2.querySource) ?? null })), $l101 && $l100 > 6e4) $m_i("tengu_api_persistent_retry_wait", { status: $l58.status, delayMs: $l100, attempt: $l110, provider: $m_gA() });
        let $l112 = void 0;
        if ($l102 && !$l2.signal?.aborted) try {
          $l112 = $l2.onQuotaWindowWait?.($l102, { retryAtMs: $l5.now() + $l100, attempt: $l110, maxRetries: $l4 });
        } catch ($l113) {
          $m_l($l113);
        }
        let $l114 = () => {
          $l2.signal?.removeEventListener("abort", $l114);
          try {
            $l112?.();
          } catch ($l115) {
            $m_l($l115);
          }
          $l112 = void 0;
        };
        if ($l112) $l2.signal?.addEventListener("abort", $l114, { once: true });
        using $l116 = { [Symbol.dispose]: $l114 };
        let $l117 = $l101 ? $m_Aho : $l100, $l118 = $l75 && !$l101, $l119 = $l102 && $l2.isUsageLimitLifted ? $m_a.CLAUDE_CODE_RETRY_WATCHDOG_USAGE_LIMIT_RECHECK_MS : void 0;
        if ($l102 && $l13) $l12++, $l13 = false;
        let $l120 = $l119 === void 0 ? 1 / 0 : 0, $l121 = 0, $l122 = $l100;
        while ($l122 > 0) {
          if ($l119 !== void 0 && $l120 <= 0) $l120 = $m_PF(1 + $l12, null, $m_smn / 2, $l2.random, $l119);
          if ($l101 && $l2.signal?.aborted) throw new $m_cu();
          let $l123 = $m_uJe($l58, $l6.model);
          if ($l118 && $l31) $l2.onRetryStatus?.(null), $l31 = false;
          if ($l123 && !$l118) {
            $l31 = true;
            let $l124 = $m_lmn($l123, $l39, ($l86 ? Math.max(1, $l4) : $l4) + ($l87 ? $l2.modelCallRetries?.reconnectsLeft() ?? 0 : 0), $l20.count, $l89 ?? $l60);
            $l2.onRetryStatus?.({ kind: "retrying", error: $l123, attempt: $l110, maxRetries: $l124, retryInMs: $l122, deadline: $l5.now() + $l122 }), yield $m_N2($l123, $l122, $l110, $l124, "request_retry");
          }
          let $l125 = Math.min($l122, $l117), $l126 = Math.min($l125, $l121);
          $l121 = 0;
          let $l127 = $l5.monotonicNow(), $l128 = await $m_amn($l125 - $l126, $l2);
          if ($l85) {
            let $l129 = $l128 ? Math.min($l125, $l126 + Math.round($l5.monotonicNow() - $l127)) : $l125;
            if ($l11.spentMs += $l129, $l102) $l11.usageLimitSpentMs += $l129;
          }
          if ($l128) break;
          if ($l122 -= $l125, $l120 -= $l125, $l120 <= 0 && $l122 > $l117 && $l102 && $l2.isUsageLimitLifted) {
            let $l130 = false, $l131 = $l2.subscribeRetryWake?.(() => {
              $l130 = true;
            }), $l132 = $l5.monotonicNow(), $l133 = false;
            try {
              $l133 = await $l2.isUsageLimitLifted($l102);
            } catch ($l134) {
              $m_l($l134);
            } finally {
              $l131?.();
            }
            if ($l13 = $l133, $l133 || $l130) break;
            $l121 = Math.max(0, Math.round($l5.monotonicNow() - $l132));
          }
        }
        if ($l85 || $l86) $l39--;
      }
    }
    throw $m_m("api_request", "api_request_retry_exhausted"), new $m_Wc($l9, $l6);
  } catch ($l135) {
    if ($l15 && !$l2.signal?.aborted) {
      if ($l135 instanceof $m_pD) $m_dn("api_reconnect", "fallback_triggered");
      else $m_m("api_reconnect", $l135 instanceof $m_Wc && $NEW_chunk_x8k0r295_js_isr($l135.originalError) ? "still_down" : "other_failure");
      $l15 = false;
    }
    throw $l135;
  } finally {
    if ($l15) $m_dn("api_reconnect", "aborted");
    if ($l31) $l2.onRetryStatus?.(null);
  }
}
;
