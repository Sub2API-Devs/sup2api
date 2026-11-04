async function SELF($l0) {
  let { apiKey: $l1, maxRetries: $l2, model: $l3, fetchOverride: $l4, source: $l5, querySource: $l6 = $l5, requestClass: $l7, agentContext: $l8, promptId: $l9, ccsSender: $l10, permissionContext: $l11, toolNames: $l12 = [], classifierJudgesServedCall: $l13, credentials: $l14, storageV5: $l15, signal: $l16, clock: $l17 = $m_ja, noResponseRetryLedger: $l18 } = $l0, $l19 = process.env.CLAUDE_CODE_CONTAINER_ID, $l20 = process.env.CLAUDE_CODE_REMOTE_SESSION_ID, $l21 = process.env.CLAUDE_AGENT_SDK_CLIENT_APP, $l22 = $m_PF() ? $m_i.CLAUDE_CODE_SESSION_ORIGIN : void 0, $l23 = $m_Af($l8) ? void 0 : $l8, $l24 = $m_rZn(), $l25 = $m_gci($l5, $l8, $l7), $l26 = $l24 ? $l25 : void 0, $l27 = $l24 ? $m_hci($l5, $l8) : void 0, $l28 = { userTurn: $l5 !== "side_query" && $m_pci($l6) && $m_b2() === void 0 && $m_B_() === void 0 && ($l8.agentType === "main" || $l8.isBackgroundAgent === false) }, $l29 = $m_wzt(), $l30 = await $m_jp({ querySource: $l6, permissionContext: $l11, toolNames: $l12, classifierJudgesServedCall: $l13 }), $l31 = { ...$m_Ml(), ...$l29, ...$m_BB(), ...$l19 && { "x-claude-remote-container-id": $l19 }, ...$l20 && { "x-claude-remote-session-id": $l20 }, ...$l22 && { [$m_q3r]: $l22 }, ...$l21 && { "x-client-app": $l21 }, ...$l23?.agentId && { "x-claude-code-agent-id": $m_NXr($l23.agentId) }, ...$l23?.parentAgentId && { "x-claude-code-parent-agent-id": $m_NXr($l23.parentAgentId) }, ...$l26 && { [$m_Zqt]: $l26 }, ...$l27 && { [$m_z3r]: $m_NXr($l27) }, ...$l24 && $l9 !== void 0 && $m_jt($l9) !== null && { [$m_K3r]: $l9 } };
  if ($m_t(`[API:request] Creating client, ANTHROPIC_CUSTOM_HEADERS present: ${!!process.env.ANTHROPIC_CUSTOM_HEADERS}, has Authorization header: ${!!$l29.Authorization}`, { level: "verbose" }), $m_i.CLAUDE_CODE_ADDITIONAL_PROTECTION) $l31["x-anthropic-additional-protection"] = "true";
  if ($m_Te() === "gateway" && !$m_Kr() && !$m_ndt()) {
    if ($m_bd()) throw $m_Ovn("Cloud gateway");
    throw new $m_Szt("Not signed in to the Cloud gateway \u2014 run /login.", "signin_required");
  }
  if ($m_TP() && $m__5t()) $m_ty(), $m_zI();
  let $l32 = await $m_lpe({ credentials: $l14, storageV5: $l15 }), $l33 = $m_$n(), $l34 = $m_tot({ anthropicAuthEnabled: $m_sl(), oauthScopes: $l33?.scopes }), $l35 = null;
  if (!$l34 && !$m_Kr()) $l35 = await $m_tw($l31, $m_be());
  await $m_W5e();
  let $l36 = $m_hw($l4, $l5, $l6, $m_Ud($l3), $l15, $l17, $l18, $l10, $l25), $l37 = $m_Ud($l3);
  if ($m_Cot($l37), $m_ni().once("provider_route")) $m_g("provider_route");
  let $l38 = $l37 === "bedrock" || $l37 === "mantle" ? await $m_YI() : void 0, $l39 = $m_uh()?.body_idle_timeout, $l40 = $m__Kr() ?? 6e5, $l41 = { defaultHeaders: $l31, maxRetries: $l2, timeout: $l40 > 0 ? $l40 : $m_Bd, dangerouslyAllowBrowser: true, fetchOptions: $m_oa({ forAnthropicAPI: true, hasBodyIdleWatchdog: $m_SKr($l37), bodyIdleTimeout: typeof $l39 === "boolean" ? $l39 : void 0, url: $m_nw($l37, $l3, $l38) }), ...$l36 && { fetch: $l36 }, ...$m_GM };
  if ($l37 === "gateway") {
    await $m_C6();
    let $l42 = $m_Kr();
    if (!$l42 || $m_fus() && !$m_Ivn()) throw $l42?.unpinned ? new $m_Szt("Cloud gateway token expired \u2014 refresh ANTHROPIC_AUTH_TOKEN and restart.", "token_expired") : new $m_Szt($m_Rqt, "session_expired");
    let { rest: $l43 } = $m_At($l41.defaultHeaders);
    return new $m_fRe({ ...$l41, defaultHeaders: { ...$l43, ...$m_dw(), Authorization: `Bearer ${$l42.jwt}` }, apiKey: null, baseURL: $l42.url, authToken: $l42.jwt, ...$m_IJ() && { logger: $m_Lt() } });
  }
  if ($l37 === "bedrock") {
    let { AnthropicBedrock: $l44 } = await import("./chunk-h87x8cg3.js"), $l45 = $m_ki($l3, $l38), $l46 = $m_i.CLAUDE_CODE_SKIP_BEDROCK_AUTH, $l47 = $m_At($l41.defaultHeaders), $l48 = Object.keys($l47.rest).some(($l49) => $l49.toLowerCase() === "x-api-key"), $l50 = { ...$l47.rest, ...$m_dw(), Authorization: null, ...!$l46 && !$l48 && { "X-Api-Key": null }, ...process.env.ANTHROPIC_BEDROCK_SERVICE_TIER && { "X-Amzn-Bedrock-Service-Tier": process.env.ANTHROPIC_BEDROCK_SERVICE_TIER } }, $l51 = process.env.AWS_BEARER_TOKEN_BEDROCK?.trim(), $l52 = $l51 ? `Bearer ${$l51}` : $l46 ? $l47.value : void 0, $l53 = $m_bd(), $l54 = !$l52 && !$l46 && !$l53 ? await $m_Lo($m_MX($l16, $l28), $l16) : null, $l55 = { ...$l41, defaultHeaders: $l50, awsRegion: $l45, apiKey: null, ...$l46 && !$l52 && { skipAuth: true }, ...$l52 && { apiKey: $l52.match(/^Bearer (.+)$/i)?.[1] ?? $l52, defaultHeaders: { ...$l50, Authorization: $l52, ...$l46 && $m_fYt($l47.rest) } }, ...$l53 && !$l52 && !$l46 && { providerChainResolver: $m_ope("Bedrock").providerChainResolver }, ...!$l53 && !$l52 && !$l46 && { providerChainResolver: $m_bee($l45) }, ...$m_IJ() && { logger: $m_Lt() } };
    return $l54 ? new $l44({ ...$l55, awsAccessKey: $l54.accessKeyId, awsSecretKey: $l54.secretAccessKey, awsSessionToken: $l54.sessionToken }) : new $l44($l55);
  }
  if ($l37 === "foundry") {
    let { AnthropicFoundry: $l56 } = await import("./chunk-q01xm7xp.js"), $l57, $l58 = false;
    if ($m_i.ANTHROPIC_FOUNDRY_AUTH_TOKEN) $l57 = async () => $m_i.ANTHROPIC_FOUNDRY_AUTH_TOKEN ?? "";
    else if (!process.env.ANTHROPIC_FOUNDRY_API_KEY) if ($m_i.CLAUDE_CODE_SKIP_FOUNDRY_AUTH) $l58 = true, $l57 = () => Promise.resolve("skip-foundry-auth");
    else if ($m_bd()) throw $m_Ovn("Foundry");
    else {
      let { DefaultAzureCredential: $l59, getBearerTokenProvider: $l60 } = await import("./chunk-mrx6y2r5.js");
      $l57 = $l60(new $l59(), "https://cognitiveservices.azure.com/.default");
    }
    let $l61 = $m_i.ANTHROPIC_FOUNDRY_RESOURCE;
    if ($l61 !== void 0 && $m_i.ANTHROPIC_FOUNDRY_BASE_URL === void 0 && $m_hi($l61) === void 0) throw Error("ANTHROPIC_FOUNDRY_RESOURCE must be a Foundry resource name (2-64 letters, digits and hyphens, not starting or ending with a hyphen, such as my-resource), not a URL or host name. To use a full URL, set ANTHROPIC_FOUNDRY_BASE_URL instead.");
    let $l62 = $m_At($l41.defaultHeaders), $l63 = { ...$l41, ...$l61 !== void 0 && { resource: $l61 }, defaultHeaders: { ...$l62.rest, ...$m_dw(), Authorization: null }, ...$l57 && { azureADTokenProvider: $l57, apiKey: null, defaultHeaders: $l58 ? { ...$l62.rest, ...$l62.value !== void 0 && { Authorization: $l62.value } } : { ...$l62.rest, ...$m_dw() } }, ...$m_IJ() && { logger: $m_Lt() } };
    return new $l56($l63);
  }
  if ($l37 === "anthropicAws") {
    let { AnthropicAws: $l64 } = await import("./chunk-qhhcfyds.js"), $l65 = $m_i.CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH, $l66 = await $m_YI(), $l67 = $m_At($l41.defaultHeaders), $l68 = $l65 ? $l67.value : void 0, $l69 = Object.entries($l67.rest).findLast(([$l70]) => $l70.toLowerCase() === "anthropic-workspace-id")?.[1], $l71 = { ...$l41, awsRegion: $l66, ...$l69 && $m_i.ANTHROPIC_AWS_WORKSPACE_ID && { workspaceId: $l69 }, defaultHeaders: { ...$l67.rest, ...$m_dw(), Authorization: null }, ...!$l65 && { authToken: null }, ...$l65 && !$l68 && { skipAuth: true }, ...$l68 && { apiKey: $l68.match(/^Bearer (.+)$/i)?.[1] ?? $l68, defaultHeaders: { ...$l67.rest, ...$m_dw(), Authorization: $l68 } }, ...$m_IJ() && { logger: $m_Lt() } };
    if (!process.env.ANTHROPIC_AWS_API_KEY && !$l65) if ($m_bd()) $l71.providerChainResolver = $m_ope("Anthropic-on-AWS").providerChainResolver;
    else {
      let $l72 = await $m_Lo($m_MX($l16, $l28), $l16);
      if ($l72) $l71.awsAccessKey = $l72.accessKeyId, $l71.awsSecretAccessKey = $l72.secretAccessKey, $l71.awsSessionToken = $l72.sessionToken;
      else $l71.providerChainResolver = $m_bee($l66);
    }
    return new $l64($l71);
  }
  if ($l37 === "anthropicGoogleCloud") {
    $m_Zt("ANTHROPIC_GOOGLE_CLOUD_PROJECT", $m_i.ANTHROPIC_GOOGLE_CLOUD_PROJECT), $m_Zt("ANTHROPIC_GOOGLE_CLOUD_LOCATION", $m_i.ANTHROPIC_GOOGLE_CLOUD_LOCATION), $m_Zt("ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID", $m_i.ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID), $m_Zt("GCLOUD_PROJECT", $m_i.GCLOUD_PROJECT), $m_Zt("GOOGLE_CLOUD_PROJECT", $m_i.GOOGLE_CLOUD_PROJECT), $m_Zt("gcloud_project", $m_i.gcloud_project), $m_Zt("google_cloud_project", $m_i.google_cloud_project);
    let $l73 = $m_i.CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH, $l74 = $m_bd();
    if (!$l73 && !$l74) await $m_Lo($m_b4t($l16, $l28), $l16);
    let [{ AnthropicGoogleCloud: $l75 }, { buildVertexGoogleAuth: $l76 }] = await Promise.all([import("./chunk-e7naa6k8.js"), import("./chunk-hdpbq2vw.js")]), $l77 = $m_At($l41.defaultHeaders), $l78 = $l73 ? $l77.value : void 0, $l79 = { ...$l41, defaultHeaders: { ...$l77.rest, ...$m_dw() }, ...$l73 ? { skipAuth: true } : { googleAuth: await $l76({ kind: "default" }, void 0) }, ...$l78 && { defaultHeaders: { ...$l77.rest, Authorization: $l78 } }, ...$m_IJ() && { logger: $m_Lt() } };
    return new $l75($l79);
  }
  if ($l37 === "mantle") {
    let { AnthropicBedrockMantle: $l80 } = await import("./chunk-h87x8cg3.js"), $l81 = $m_i.CLAUDE_CODE_SKIP_MANTLE_AUTH, $l82 = $m_At($l41.defaultHeaders), $l83 = $l81 ? $l82.value : void 0, $l84 = process.env.AWS_BEARER_TOKEN_BEDROCK?.trim(), $l85 = $m_bd(), $l86 = !$l84 && !$l81 && !$l85 ? await $m_Lo($m_MX($l16, $l28), $l16) : null, $l87 = $m_ki($l3, $l38), $l88 = Object.keys($l82.rest).some(($l89) => $l89.toLowerCase() === "x-api-key");
    return new $l80({ ...$l41, defaultHeaders: $l84 ? { ...$l82.rest, ...$m_dw(), Authorization: `Bearer ${$l84}`, ...!$l88 && { "X-Api-Key": null } } : { ...$l82.rest, ...$m_dw(), Authorization: null, ...!$l81 && !$l88 && { "X-Api-Key": null } }, awsRegion: $l87, ...!$l84 && !$l81 && { authToken: null }, ...$l81 && !$l83 && { skipAuth: true }, ...$l83 && { apiKey: $l83.match(/^Bearer (.+)$/i)?.[1] ?? $l83, defaultHeaders: { ...$l82.rest, ...$m_dw(), Authorization: $l83 } }, ...$l86 && { awsAccessKey: $l86.accessKeyId, awsSecretAccessKey: $l86.secretAccessKey, awsSessionToken: $l86.sessionToken }, ...$l85 && !$l84 && !$l81 && { providerChainResolver: $m_ope("Mantle").providerChainResolver }, ...!$l85 && !$l84 && !$l81 && { providerChainResolver: $m_bee($l87) }, ...$m_IJ() && { logger: $m_Lt() } });
  }
  if ($l37 === "vertex") {
    let $l90 = $m_i.CLAUDE_CODE_SKIP_VERTEX_AUTH, $l91 = $m_bd();
    if (!$l90 && !$l91) await $m_Lo($m_b4t($l16, $l28), $l16);
    let [{ AnthropicVertex: $l92 }, { buildVertexGoogleAuth: $l93 }] = await Promise.all([import("./chunk-xa96axyz.js"), import("./chunk-hdpbq2vw.js")]), $l94 = await $l93($l90 ? { kind: "skip" } : { kind: "default" }, $m_oAt()), $l95 = $m_At($l41.defaultHeaders), $l96 = $l90 ? $l95.value : void 0, $l97 = { ...$l41, defaultHeaders: { ...$l95.rest, ...$m_fPe($l90 ? { wireAuthorization: $l96, headers: $l95.rest } : false) }, region: $m_Cve($l3), googleAuth: $l94, ...$m_IJ() && { logger: $m_Lt() } };
    return $m_uPe(new $l92($l97));
  }
  let $l98 = $l1 || $m_spe();
  if (!$l98 && $m_rc()) {
    let $l99 = await $m_fxe();
    if ($l99 !== null) {
      let $l100 = await $m_Vqe(), { rest: $l101 } = $m_At($l31), $l102 = $m_i.ANTHROPIC_BASE_URL || $l100?.baseURL;
      $m_Cot($l37, $l102);
      let $l103 = await $l99.getToken();
      return new $m_fRe({ apiKey: null, authToken: $l103, baseURL: $l102, ...$l41, defaultHeaders: { ...$l101, ...$m_dw(), Authorization: `Bearer ${$l103}`, ...$l100?.extraHeaders, ...$m_kl($l30, $l101) }, ...$m_IJ() && { logger: $m_Lt() } });
    }
  }
  if (!$l98 && !$l33 && !$m_At($l31).value && await $m_Hq($l14)) throw new $m_dnt();
  if ($l34) {
    let $l104 = $m_Kxe();
    if ($l104) throw new $m_Owe($l104.url);
    if ($l32 === "lock_timeout" && $l33?.expiresAt != null && Date.now() >= $l33.expiresAt && $m_k("tengu_sharded_beacon", true)) throw new $m_pvt();
  }
  if ($l34 && $m_At($l31).value === void 0) await $NEW_chunk_gkzv6xmy_js_qW();
  let $l105 = $m_$n();
  if ($l33 && $l105?.accessToken !== $l33.accessToken || $l34 !== $m_tot({ anthropicAuthEnabled: $m_sl(), oauthScopes: $l105?.scopes }) || $m_At($l31).value === void 0 && $m_wVe()) return SELF($l0);
  if ($l34 && $m_At($l31).value === void 0 && $NEW_chunk_gkzv6xmy_js_jie()) throw new $NEW_chunk_7c9mpntp_js_nU($NEW_chunk_gkzv6xmy_js_uwe());
  let $l106 = $m_oai({ isSubscriber: $l34, apiKey: $l98, oauthAccessToken: $l33?.accessToken }), $l107 = { ...$l31, ...$m_kl($l30, $l31) };
  if ($m_Y3r({ apiKey: $l106.apiKey, getApiKeySource: () => {
    let { source: $l108 } = $m_Mp({ skipRetrievingKeyFromApiKeyHelper: true });
    return $l108 === "none" ? "unknown" : $l108;
  }, authToken: $l106.authToken, getAuthTokenSource: () => {
    let { source: $l109 } = $m_ha();
    return $l109 === "CLAUDE_CODE_OAUTH_TOKEN" || $l109 === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR" || $l109 === "CCR_OAUTH_TOKEN_FILE" ? $l109 : "claude.ai";
  }, defaultHeaders: $l107, authorizationSource: $l35, customHeaderNames: Object.keys($l29), envSuppliedHeaderNames: new Set([$l19 && "x-claude-remote-container-id", $l20 && "x-claude-remote-session-id", $l21 && "x-client-app"].filter(($l110) => Boolean($l110))) }), $l106.authToken && $m_kTn($l106.authToken)) return SELF($l0);
  let $l111 = { apiKey: $l106.apiKey, authToken: $l106.authToken, ...$m_i.ANTHROPIC_BASE_URL ? { baseURL: $m_i.ANTHROPIC_BASE_URL } : false, ...$l41, defaultHeaders: $l107, ...$m_IJ() && { logger: $m_Lt() } };
  return new $m_fRe($l111);
}
;
