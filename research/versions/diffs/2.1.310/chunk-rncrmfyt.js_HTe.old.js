async function* SELF($l0, $l1, $l2) {
  let $l3 = $m_efr($l2), $l4 = $l2.clock ?? $m_Xd, $l5 = { model: $l2.model, ...$m_jo() && { fastMode: $l2.fastMode } }, $l6 = null, $l7 = $l2.initialConsecutive529Errors ?? 0, $l8, $l9 = 0, $l10 = $l2.modelCallRetries?.capacityWait ?? { spentMs: 0, usageLimitSpentMs: 0 }, $l11 = 0, $l12 = { open: void 0 }, $l13 = 0, $l14 = 0, $l15 = 0, $l16 = $l2.noResponseRetryLedger ?? { count: 0 }, $l17 = 0, $l18 = 0, $l19 = 0, $l20 = 0, $l21 = 0, $l22, $l23 = false, $l24, $l25, $l26 = /* @__PURE__ */ new Set(), $l27 = false, $l28 = false, $l29 = { count: 0 }, $l30 = $l2.lowPriorityWait ?? $m_ILr(), $l31 = $l2.lowPriorityWait === void 0, $l32 = $m_PFr(), $l33 = $m_IFr();
  try {
    let $l34 = $m_pJe($l2);
    if ($l34 !== void 0 && $m_Uyt($l2.model)) throw new $m_pD($l2.model, $l34, "permission_denied", $m_lqs($l2.model));
    for (let $l35 = 1; $l35 <= $l3 + 1; $l35++) {
      if ($l2.signal?.aborted) throw new $m_cu();
      if ($l2.modelCallRetries?.takeApiAttempt() === false) throw new $m_Wc(new $m_yke(), $l5);
      let $l36 = $l4.now();
      if ($l28 = false, $l5.fastMode && $m_lun($l5.model)) $l5.fastMode = false;
      let $l37 = $m_jo() ? $l5.fastMode && !$m_AGe() : false, $l38 = Math.min($l35 + $l9, $l3 + 1);
      try {
        let $l39 = $m_Wcr($l8);
        if ($l39) $m_t("Stale connection \u2014 disabling keep-alive for retry"), $m_sKo();
        let $l40 = false;
        if ($m_Gcr($l8)) {
          let $l41 = await $m_zcr(!$l23);
          if ($l40 = $l41.attempted, $l41.reportedFailure) $l23 = true;
        }
        let $l42 = $l24 !== void 0 && Boolean($m_a.CLAUDE_CODE_REMOTE_SESSION_ID) && $m_Ucr($l24);
        if ($l42) $m_t("Credential rotated since the client was built \u2014 rebuilding before retry");
        if ($l6 === null || $l42 || $m_imn($l8, $l5.model) || $l39 || $l40) {
          if ($l8 instanceof $m_Ot && $l8.status === 401 || $m_Hne($l8) || $m__ve() && ($m_bJe($l8, $l5.model) || $m_cK($l8))) {
            if (!$m_Xle() && $m_nc()) await $m_f0o($l6?.authToken);
            if ($l24) {
              let $l43;
              await $m_mS($l24, $l2.credentials, $l2.storageV5, { onForcedRefreshOutcome: ($l44) => {
                $l43 = $l44;
              } });
              let $l45 = $m_tTe();
              if ($l45) throw $m_m("api_request", "api_request_account_on_hold"), new $m_Wc(new $m_nye($l45.url), $l5);
              if ($m_Mn()?.accessToken === $l24) {
                if ($m_NAe() !== null || !$m_fB($l8) && ++$l17 >= $m_Icr) {
                  if ($l43 === "lock_disk_full" && $m_jcr($l8)) throw $m_m("api_request", "api_request_oauth_refresh_disk_full"), new $m_Wc(new $m_pK(), $l5);
                  throw $m_m("api_request", "api_request_oauth_refresh_exhausted"), new $m_Wc($l8, $l5);
                }
              } else $l17 = 0;
            } else if ($m__ve() && process.env[$m_yut()] !== $l25) $m_t("Host credential replaced since the client was built \u2014 retrying with it");
            else if ($m__ve()) {
              let $l46 = null, $l47, $l48 = false, $l49 = false;
              try {
                ({ authToken: $l46, materialUnchanged: $l47 } = await $m_vKe()());
              } catch ($l50) {
                if ($m_t(`host getHostAuthToken callback failed: ${$m_d($l50)}`, { level: "error" }), $l50 instanceof $m_Cd) throw new $m_Wc($l8, $l5);
                if ($m_Ke($l50)) $l49 = true;
                else $l48 = true, $m_m("host_auth_recovery", "callback_failed");
              }
              let $l51 = ($l52) => {
                if (++$l18 >= $m_Dcr) throw $m_m("host_auth_recovery", $l52), $m_m("api_request", "api_request_host_auth_exhausted"), new $m_Wc($l8, $l5);
              };
              if ($l48) ;
              else if ($l49) $l51("callback_aborted");
              else if (typeof $l46 === "string" && $l46 && $l46 !== $l25) process.env[$m_yut()] = $l46, $m_DB(), $l18 = 0, $m_g("host_auth_recovery");
              else if ($l46 === null) if ($l47 === true) $l51("material_unchanged");
              else $l18 = 0, $m_g("host_auth_recovery");
              else $l51("bearer_unchanged");
            } else if (($m_a.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && $m_Xn() || $m_Pun()) && !$m_nc() && $m_na().source !== "apiKeyHelper" && !$m_fB($l8)) throw $m_m("api_request", "api_request_host_managed_auth_fail"), new $m_Wc($l8, $l5);
          }
          $l25 = process.env[$m_yut()], $l6 = await $l0(), $l24 = $m_ll() ? $m_Mn()?.accessToken : void 0;
        }
        $l28 = $m_sa() && $m_EJe();
        let $l53 = await $l1($l6, $l38, $l5);
        if ($m_g("api_request"), $m_iqs($l2.model), !$m_PGe() && !$m_oqs($l2.model) && !$m_SQe() && $m_J3n($l2.model, $m_VWn, $m_Lve)) $m_t(`[model-access] now using ${$l2.model} as its tier's default: every newer model of the tier was refused, is not allowed, or was skipped because of its context window`), $m_YWn($l2.model, "ok");
        if ($l31) $m_f6n($l30);
        return $l53;
      } catch ($l54) {
        if ($l54 instanceof $m_Wc) throw $l54;
        if ($l54 instanceof $m_cu) throw $l54;
        if ($m_Q7e($l54)) throw $m_m("api_request", "api_request_dlp_denied"), new $m_Wc($l54, $l5);
        if ($m_Mze($l54)) throw $m_m("api_request", "api_request_safety_monitor_blocked"), new $m_Wc($l54, $l5);
        if ($m_ZP($l54)) throw $m_m("api_request", "api_request_output_content_filtered"), new $m_Wc($l54, $l5);
        if ($m_eun($l54)) throw $m_m("api_request", "api_request_verification_required"), new $m_Wc($l54, $l5);
        if ($m_bX($l54)) throw $m_m("api_request", "api_request_regime_features_refused"), new $m_Wc($l54, $l5);
        if ($l2.modelCallRetries?.outOfApiAttempts()) throw $m_m("api_request", "api_request_attempts_exhausted"), new $m_Wc($l54, $l5);
        if ($l8 = $l54, $m_t(`API error (attempt ${$l38}/${$l3 + 1}): ${$l54 instanceof $m_Ot ? `${$l54.status} ${$l54.message}` : $m_d($l54)}`, { level: "error" }), $m_dmn($l54) !== void 0) {
          if (!$m_G6() && $l16.count >= $m_gmn) throw $m_m("api_request", "api_request_no_response_exhausted"), new $m_Wc($l54, $l5);
          $l16.count++;
        }
        let $l55, $l56 = $m_a.CLAUDE_CODE_NONSTREAMING_TIMEOUT_RETRIES ?? ($m_G6() && $l2.failedStreamOutlastedTimeout ? $m_Ncr : void 0);
        if ($l56 !== void 0 && $l2.nonStreamingTimeoutMs !== void 0 && $l54 instanceof $m_OA && $l4.now() - $l36 >= $l2.nonStreamingTimeoutMs * $m_Lcr) {
          if ($l13 >= $l56) throw $m_m("api_request", "api_request_nonstreaming_timeout_exhausted"), new $m_Wc($l54, $l5);
          $l13++, $l55 = $l56 - $l13;
        }
        let $l57 = await $l2.onError?.($l54);
        if ($l57 && !$l26.has($l57)) {
          $l26.add($l57);
          let $l58 = $m_uJe($l54, $l5.model);
          if ($l58?.noResponse) {
            $l27 = true;
            let $l59 = $m_lmn($l58, $l35, $l3, $l16.count);
            $l2.onRetryStatus?.({ kind: "retrying", error: $l58, attempt: $l35, maxRetries: $l59, retryInMs: 0, deadline: $l4.now() }), yield $m_N2($l58, 0, $l35, $l59, "request_retry");
          }
          $l35--;
          continue;
        }
        let $l60 = $m_DLr($l54, { markedAtDispatch: $l28, querySource: $l2.querySource, wait: $l30 });
        if ($l60 !== null) {
          $l27 = true, $l2.onRetryStatus?.({ kind: "low_priority_waiting", attempt: $l60.attempt, retryInMs: $l60.delayMs, deadline: $l4.now() + $l60.delayMs }), await $m_Y($l60.delayMs, $l2.signal, { abortError: $m_lZ, clock: $l4 }), $l35--;
          continue;
        }
        if ($m_ODt($l2.model, $l54) === "refused") {
          $m_AW($l2.model, $l54), $m_YWn($l2.model, "refused");
          let $l61 = $m_lJe($l2);
          if ($l61 !== void 0) throw $m_i("tengu_api_model_not_found_fallback_triggered", { original_model: $m_Et($l2.model), fallback_model: $m_Et($l61), provider: $m_gA(), reason: $m_c("model_access_refused") }), new $m_pD($l2.model, $l61, "permission_denied", $l54);
          throw $m_qWn($l2.model, $l54, "refused"), new $m_Wc($l54, $l5);
        }
        if ($m_ODt($l2.model, $l54) === "denied") {
          let $l62 = await $m_Kcr($l2.signal);
          if ($l62 !== void 0 && $l62 === $l22) {
            if ($l2.signal?.aborted) throw $m_lZ();
            let $l63 = $m_lJe($l2), $l64 = $l63 === void 0 ? void 0 : await $m_zEo($l63, $l62);
            if ($l63 !== void 0 && $l64 === "accessible" && $m_lJe($l2) === $l63) throw $m_AW($l2.model, $l54), $m_YWn($l2.model, "refused"), $m_i("tengu_api_model_not_found_fallback_triggered", { original_model: $m_Et($l2.model), fallback_model: $m_Et($l63), provider: $m_gA(), reason: $m_c("model_access_denied") }), new $m_pD($l2.model, $l63, "permission_denied", $l54);
            let $l65 = $l63 !== void 0 && $l64 === "refused" && $l2.fallbackModel === void 0;
            if ($l65) $m_AW($l63, $m_MJ($l63));
            if ($l63 === void 0 || $l65) $m_qWn($l2.model, $l54, "denied");
            throw new $m_Wc($l54, $l5);
          }
          $l22 = $l62;
        } else $l22 = void 0;
        let $l66 = $m_tDe($l54) || $m_Mbt($l54), $l67 = $l2.fallbackModel ?? ($l66 && $m_Sd($l2.model) === "firstParty" ? $m_pJe($l2) : void 0);
        if (($l66 || !$m_G6() && $m_yJe($l54)) && $l67 && $l67 !== $l2.model) {
          let $l68 = $m_tDe($l54) ? "model_not_found" : $m_Mbt($l54) ? "permission_denied" : "server_error";
          throw $m_i("tengu_api_model_not_found_fallback_triggered", { original_model: $m_Et($l2.model), fallback_model: $m_Et($l67), provider: $m_gA(), reason: $m_c($l68) }), new $m_pD($l2.model, $l67, $l68, $l54);
        }
        let $l69 = $m_FTe($l54), $l70 = $l69 && $l20 < $m_omn;
        if (!$l69 && !$m_fB($l54) && $l54 instanceof $m_Ot && ($l54.status !== void 0 || $m_GW($l54)) && $m_mJe($l54) === void 0) $l20 = 0, $l11 = 0;
        let $l71 = $m_G6();
        if ($l37 && $l54 instanceof $m_Ot && ($l54.status === 429 || $m_GW($l54))) {
          let $l72 = $l54.headers?.get("anthropic-ratelimit-unified-overage-disabled-reason");
          if ($l72 !== null && $l72 !== void 0) {
            if ($m_vVs($l72, $l2.storageV5), $l5.fastMode = false, $l71) $l35--;
            continue;
          }
          let $l73 = $m_ofr($l54), $l74 = $l73 !== null && $l73 < $m_cJe;
          if ($l74 && !$l71) {
            if ($l35 <= $l3) {
              let $l75 = Math.min($m_PF($l35, $m_fJe($l54), $m_cJe, $l2.random), $m_cJe), $l76 = $m_uJe($l54, $l5.model);
              if ($l76) $l27 = true, $l2.onRetryStatus?.({ kind: "retrying", error: $l76, attempt: $l35, maxRetries: $l3, retryInMs: $l75, deadline: $l4.now() + $l75 }), yield $m_N2($l76, $l75, $l35, $l3, "request_retry");
              await $m_amn($l75, $l2);
            }
            continue;
          }
          if (!$l74) {
            let $l77 = Math.max($l73 ?? $m_tfr, $m_nfr), $l78 = $m_GW($l54) ? "overloaded" : "rate_limit";
            if ($m_yVs(Date.now() + $l77, $l78), $m_jo()) $l5.fastMode = false;
            if ($l71) $l35--;
            continue;
          }
        }
        if ($l37 && $m_hJe($l54, $l5.model) && ($l2.modelIsRefusalFallbackTarget || $m_U$r($l5.model))) {
          if ($m_bVs($l5.model), $l5.fastMode = false, $l71) $l35--;
          continue;
        }
        if ($l37 && $m_jTe($l54)) {
          if ($m__Vs($l2.storageV5), $l5.fastMode = false, $l71) $l35--;
          continue;
        }
        if ($m_K4t($l54, { model: $l5.model, carriesConfigSkips: true }, $l29)) {
          $l35--;
          continue;
        }
        if ($m_GW($l54) && !$m_Dke($l2.querySource) && !$m_G6()) throw $m_i("tengu_api_529_background_dropped", { query_source: $m_os($l2.querySource) }), $m_m("api_request", "api_request_overload_background_dropped"), new $m_Wc($l54, $l5);
        let $l79 = $m_qe($l2.model);
        if ($m_GW($l54) && ($m_a.FALLBACK_FOR_ALL_PRIMARY_MODELS || $l2.fallbackModel !== void 0 || !$m_kt() && ($m_Kle($l79) || $m_IGe($l79) || $m_dBt($l79)))) {
          if ($l7++, $l7 >= $m_dZ) {
            if ($l2.fallbackModel) throw $m_i("tengu_api_opus_fallback_triggered", { original_model: $m_Et($l2.model), fallback_model: $m_Et($l2.fallbackModel), provider: $m_gA() }), $m_f("api_request", "api_request_fallback_triggered"), new $m_pD($l2.model, $l2.fallbackModel, "overloaded", $l54);
            if (!$m_a.IS_SANDBOX && !$m_G6()) throw $m_i("tengu_api_custom_529_overloaded_error", {}), $m_m("api_request", "api_request_overload_repeated"), new $m_Wc(Error($m_nke, { cause: $l54 }), $l5);
          }
        }
        let $l80 = $m_G6() && $m_ymn($l54), $l81 = $l54 instanceof $m_Zu && $m_umn($l54) && ($l2.modelCallRetries?.sleptThroughLeft() ?? 0) > 0;
        if ($l35 > $l3 && !$l80 && !$l81) {
          let $l82 = !($l54 instanceof $m_Ot && $l54.status === 401) || $l24 !== void 0 || $m__ve() || $m_FTe($l54) || !$m_Xle() && $m_nc();
          if (!$m_imn($l54, $l5.model) || !$l82 || $l2.modelCallRetries?.takeCredentialRenewal() !== true) throw $m_m("api_request", "api_request_retry_exhausted"), new $m_Wc($l54, $l5);
          $l35--;
        }
        if ($m_fB($l54)) {
          if ($l11 >= $m_Mcr) throw $m_m("api_request", "api_request_ccr_auth_exhausted"), new $m_Wc($l54, $l5);
          $l11++;
        }
        let $l83, $l84 = $m_fK($l54);
        if ($m_IFr() > $l33 && ($l84 === "AWS" || !$m__ve() && $m__Je($l54, $l5.model))) throw $m_m("api_request", "api_request_aws_sign_in_failed"), new $m_Wc($l54, $l5);
        if ($l84 === "AWS" || !$m__ve() && $m_SJe($l54, $l5.model)) {
          if ($l14 >= $m_tmn) throw $m_m("api_request", "api_request_aws_auth_exhausted"), new $m_Wc($l54, $l5);
          $l14++, $l83 = $m_tmn - $l14;
        }
        if ($l84 === "Google Cloud" || !$m__ve() && $m_cK($l54)) {
          if ($m_PFr() > $l32) throw $m_m("api_request", "api_request_gcp_sign_in_failed"), new $m_Wc($l54, $l5);
          if ($l15 >= $m_nmn) throw $m_m("api_request", "api_request_gcp_auth_exhausted"), new $m_Wc($l54, $l5);
          $l15++, $l83 = $m_nmn - $l15;
        }
        if ($l54 instanceof $m_Ot && ($l54.status === 401 || $l54.status === 403) && $m_Xn() && $m_Vge() && $m_Xyt() !== null) {
          if ($l19 >= $m_Fcr) throw $m_m("api_request", "api_request_api_key_helper_failed"), new $m_Wc($l54, $l5);
          $l19++;
        }
        if ($l69) {
          if ($l20 === $m_omn) $m_f("api_request", "api_request_api_key_helper_auth_exhausted");
          $l20++;
        }
        if ($l54 instanceof $m_Yu && $l54.statusCode === 401) {
          if ($l21 >= $m_Hcr) throw $m_m("api_request", "api_request_wif_exchange_401"), new $m_Wc($l54, $l5);
          $l21++;
        }
        if (!($m_Vcr($l54, $l5.model) || $m_Ycr($l54) || await $m_Xcr($l54)) && (!($l54 instanceof $m_Ot) || !$m_Qcr($l54))) {
          let $l85 = $l54 instanceof $m_Ot && ($l54.status !== void 0 && $m_qcr.has($l54.status) && !($l54.status === 404 && $l2.isNonStreamingRequest) || $l54.type === "billing_error" || $l2.isResumePrefillRequest === true && $l54.status !== void 0 && $m_D1r($l54.status) || $m__mn.some(($l86) => $l86($l54)));
          if ($l54 instanceof $m_Ot && $l54.status !== void 0 && !$l85 && $l2.fallbackModel && $l2.fallbackModel !== $l2.model) throw $m_i("tengu_api_fallback_last_resort", { status: $l54.status, errorType: $m_c($m_q7($l54.type)), provider: $m_gA(), fastMode: $l5.fastMode ?? false }), $m_f("api_request", "api_request_last_resort_fallback"), new $m_pD($l2.model, $l2.fallbackModel, $l54.status === 404 && $m_Tjo($l54) ? "model_not_found" : "last_resort", $l54);
          throw $m_m("api_request", $l54 instanceof $m_nye || $m__2e($l54) !== null ? "api_request_account_on_hold" : $l54 instanceof $m_kht ? "api_request_oauth_refresh_lock_timeout" : "api_request_non_retryable"), new $m_Wc($l54, $l5);
        }
        if ($l54 instanceof $m_Ot) {
          let $l87 = $m_UTe($l54);
          if ($l87) {
            let { inputTokens: $l88, contextLimit: $l89 } = $l87, $l90 = 1e3, $l91 = Math.max(0, $l89 - $l88 - 1e3);
            if ($l91 < $m_Zpn) throw $m_l(Error(`availableContext ${$l91} is less than FLOOR_OUTPUT_TOKENS ${$m_Zpn}`)), $l54;
            let $l92 = $l91;
            if ($l5.maxTokensOverride !== void 0 && $l92 >= $l5.maxTokensOverride) throw $m_l(Error("max_tokens overflow adjustment made no progress")), $l54;
            $l5.maxTokensOverride = $l92, $m_i("tengu_max_tokens_context_overflow_adjustment", { inputTokens: $l88, contextLimit: $l89, adjustedMaxTokens: $l92, attempt: $l35 });
            continue;
          }
        }
        let $l93 = $m_fJe($l54), $l94, $l95 = $l80, $l96 = null;
        if ($l80) {
          let $l97 = ($m_a.CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS ?? 1 / 0) - $l10.spentMs;
          if ($l97 <= 0) throw $m_m("api_request", "api_request_capacity_wait_exhausted"), new $m_Wc($l54, $l5);
          $l9++;
          let $l98 = null;
          if ($l54 instanceof $m_Ot && $l54.status === 429) {
            if ($l98 = $m_rfr($l54, $l4), $l98 !== null && $l54.headers?.get?.("anthropic-ratelimit-unified-status") === "rejected") {
              let $l99 = ($m_a.CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS ?? 1 / 0) - $l10.usageLimitSpentMs;
              if ($l98 > $l99) {
                let $l100 = $l54.headers?.get($m_EFt), $l101 = $l100 === "allowed" || $l100 === "allowed_warning";
                if ($l99 <= 0 || !$l101 && $l54.headers?.get($m_MWe) !== "fetch_error") throw $m_m("api_request", "api_request_usage_limit_wait_too_long"), new $m_Wc($l54, $l5);
                $l98 = $l101 ? Math.min($l99, $m_PF($l9, null, $m_rmn, $l2.random)) : $l99;
              }
              $l96 = $l54;
            }
          }
          $l94 = Math.min($l98 ?? $m_PF($l9, $l93, $m_rmn, $l2.random), $m_smn), $l94 = Math.min($l94, $l97);
        } else if ($m_fB($l54)) $l94 = $m_Ocr;
        else if ($l70) $l94 = $m_$cr;
        else {
          let $l102 = $m_GW($l54), $l103 = $l102 ? $m_a.CLAUDE_CODE_OVERLOADED_RETRY_MAX_DELAY_MS : void 0;
          if ($l94 = $m_PF($l35 + $l9, $l93, $l103, $l2.random, $l102 ? $m_a.CLAUDE_CODE_OVERLOADED_RETRY_BASE_DELAY_MS : void 0), $m_G6()) $l94 = Math.min($l94, $m_smn), $l95 = true;
          else if ($l94 > Math.max($m_Bcr, Math.ceil(($l103 ?? 0) * (1 + $m_kjo)))) throw $m_i("tengu_api_retry_after_too_long", { delayMs: $l94, status: $l54.status, provider: $m_gA() }), $m_m("api_request", "api_request_retry_after_too_long"), new $m_Wc($l54, $l5);
        }
        let $l104 = $l80 ? $l9 : $l81 ? Math.max(1, Math.min($l35, $l3)) : $l35, $l105 = $m_jpe($l54);
        if ($l2.modelCallRetries?.reportHttpFailure($l54, "retry"), $m_i("tengu_api_retry", { attempt: $l104, delayMs: $l94, error: $m_Z7e($l105, $l54 instanceof $m_Ot ? $l54.status : void 0), errorType: $m_c($l105), ...$m_Ip($l54), status: $l54.status, provider: $m_gA(), attempt_duration_ms: $l4.now() - $l36 }), $m_X("warn", "cli_api_retry", () => ({ ...$m_mL($l54, $l105), attempt: $l104, delay_ms: $l94, attempt_duration_ms: $l4.now() - $l36, model: $m_Et($l2.model) ?? null, query_source_category: $m_rs($l2.querySource) ?? null })), $l95 && $l94 > 6e4) $m_i("tengu_api_persistent_retry_wait", { status: $l54.status, delayMs: $l94, attempt: $l104, provider: $m_gA() });
        let $l106 = void 0;
        if ($l96 && !$l2.signal?.aborted) try {
          $l106 = $l2.onQuotaWindowWait?.($l96, { retryAtMs: $l4.now() + $l94, attempt: $l104, maxRetries: $l3 });
        } catch ($l107) {
          $m_l($l107);
        }
        let $l108 = () => {
          $l2.signal?.removeEventListener("abort", $l108);
          try {
            $l106?.();
          } catch ($l109) {
            $m_l($l109);
          }
          $l106 = void 0;
        };
        if ($l106) $l2.signal?.addEventListener("abort", $l108, { once: true });
        using $l110 = { [Symbol.dispose]: $l108 };
        let $l111 = $l95 ? $m_Aho : $l94, $l112 = $l70 && !$l95, $l113 = $l94;
        while ($l113 > 0) {
          if ($l95 && $l2.signal?.aborted) throw new $m_cu();
          let $l114 = $m_uJe($l54, $l5.model);
          if ($l112 && $l27) $l2.onRetryStatus?.(null), $l27 = false;
          if ($l114 && !$l112) {
            $l27 = true;
            let $l115 = $m_lmn($l114, $l35, $l81 ? Math.max(1, $l3) : $l3, $l16.count, $l83 ?? $l55);
            $l2.onRetryStatus?.({ kind: "retrying", error: $l114, attempt: $l104, maxRetries: $l115, retryInMs: $l113, deadline: $l4.now() + $l113 }), yield $m_N2($l114, $l113, $l104, $l115, "request_retry");
          }
          let $l116 = Math.min($l113, $l111), $l117 = $l4.monotonicNow(), $l118 = await $m_amn($l116, $l2);
          if ($l80) {
            let $l119 = $l118 ? Math.min($l116, Math.round($l4.monotonicNow() - $l117)) : $l116;
            if ($l10.spentMs += $l119, $l96) $l10.usageLimitSpentMs += $l119;
          }
          if ($l118) break;
          $l113 -= $l116;
        }
        if ($l80 || $l81) $l35--;
      }
    }
    throw $m_m("api_request", "api_request_retry_exhausted"), new $m_Wc($l8, $l5);
  } finally {
    if ($l27) $l2.onRetryStatus?.(null);
  }
}
;
