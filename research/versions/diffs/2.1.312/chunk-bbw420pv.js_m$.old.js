async function SELF($l0) {
  let { apiKey: $l1, maxRetries: $l2, model: $l3, fetchOverride: $l4, source: $l5, querySource: $l6 = $l5, requestClass: $l7, agentContext: $l8, promptId: $l9, ccsSender: $l10, permissionContext: $l11, toolNames: $l12 = [], classifierJudgesServedCall: $l13, credentials: $l14, storageV5: $l15, signal: $l16, clock: $l17 = $m_Jl, noResponseRetryLedger: $l18 } = $l0, $l19 = process.env.CLAUDE_CODE_CONTAINER_ID, $l20 = process.env.CLAUDE_CODE_REMOTE_SESSION_ID, $l21 = process.env.CLAUDE_AGENT_SDK_CLIENT_APP, $l22 = $m_cX() ? $m_i.CLAUDE_CODE_SESSION_ORIGIN : void 0, $l23 = $m_Bf($l8) ? void 0 : $l8, $l24 = $m_a9n(), $l25 = $l24 ? $m_Qti($l5, $l8, $l7) : void 0, $l26 = $l24 ? $m_Zti($l5, $l8) : void 0, $l27 = { userTurn: $l5 !== "side_query" && $m_Xti($l6) && $m_Mz() === void 0 && $m_E_() === void 0 && ($l8.agentType === "main" || $l8.isBackgroundAgent === false) }, $l28 = $m_ljt(), $l29 = await $m_Op({ querySource: $l6, permissionContext: $l11, toolNames: $l12, classifierJudgesServedCall: $l13 }), $l30 = { ...$m_ml(), ...$l28, ...$m_ZU(), ...$l19 && { "x-claude-remote-container-id": $l19 }, ...$l20 && { "x-claude-remote-session-id": $l20 }, ...$l22 && { [$m_UVr]: $l22 }, ...$l21 && { "x-client-app": $l21 }, ...$l23?.agentId && { "x-claude-code-agent-id": $m_kYr($l23.agentId) }, ...$l23?.parentAgentId && { "x-claude-code-parent-agent-id": $m_kYr($l23.parentAgentId) }, ...$l25 && { [$m_x2t]: $l25 }, ...$l26 && { [$m_$Vr]: $m_kYr($l26) }, ...$l24 && $l9 !== void 0 && $m_Kt($l9) !== null && { [$m_FVr]: $l9 } };
  if ($m_t(`[API:request] Creating client, ANTHROPIC_CUSTOM_HEADERS present: ${!!process.env.ANTHROPIC_CUSTOM_HEADERS}, has Authorization header: ${!!$l28.Authorization}`, { level: "verbose" }), $m_i.CLAUDE_CODE_ADDITIONAL_PROTECTION) $l30["x-anthropic-additional-protection"] = "true";
  if ($m_Ae() === "gateway" && !$m_Wr() && !$m_Rit()) {
    if ($m_pd()) throw $m_R_n("Cloud gateway");
    throw new $m_ajt("Not signed in to the Cloud gateway \u2014 run /login.", "signin_required");
  }
  if ($m_yI() && $m_YVt()) $m_Nh(), $m_lI();
  let $l31 = await $m_Eue({ credentials: $l14, storageV5: $l15 }), $l32 = $m_Ln(), $l33 = $m_xtt({ anthropicAuthEnabled: $m_tl(), oauthScopes: $l32?.scopes }), $l34 = null;
  if (!$l33 && !$m_Wr()) $l34 = await $m_yy($l30, $m_ye());
  await $m_w4e();
  let $l35 = $m_My($l4, $l5, $m_Od($l3), $l15, $l17, $l18, $l10), $l36 = $m_Od($l3);
  if ($m_ont($l36), $m_Ti().once("provider_route")) $m_g("provider_route");
  let $l37 = $l36 === "bedrock" || $l36 === "mantle" ? await $m_fI() : void 0, $l38 = $m_$p()?.body_idle_timeout, $l39 = $m_u1r() ?? 6e5, $l40 = { defaultHeaders: $l30, maxRetries: $l2, timeout: $l39 > 0 ? $l39 : $m_ac, dangerouslyAllowBrowser: true, fetchOptions: $m_oa({ forAnthropicAPI: true, hasBodyIdleWatchdog: $m_p1r($l36), bodyIdleTimeout: typeof $l38 === "boolean" ? $l38 : void 0, url: $m_wy($l36, $l3, $l37) }), ...$l35 && { fetch: $l35 }, ...$m_aM };
  if ($l36 === "gateway") {
    await $m_E5();
    let $l41 = $m_Wr();
    if (!$l41 || $m_Mrs() && !$m_C_n()) throw $l41?.unpinned ? new $m_ajt("Cloud gateway token expired \u2014 refresh ANTHROPIC_AUTH_TOKEN and restart.", "token_expired") : new $m_ajt($m_s2t, "session_expired");
    let { rest: $l42 } = $m_bt($l40.defaultHeaders);
    return new $m_wAe({ ...$l40, defaultHeaders: { ...$l42, ...$m_zS(), Authorization: `Bearer ${$l41.jwt}` }, apiKey: null, baseURL: $l41.url, authToken: $l41.jwt, ...$m_yX() && { logger: $m_xt() } });
  }
  if ($l36 === "bedrock") {
    let { AnthropicBedrock: $l43 } = await import("./chunk-6s1629fd.js"), $l44 = $m_pi($l3, $l37), $l45 = $m_i.CLAUDE_CODE_SKIP_BEDROCK_AUTH, $l46 = $m_bt($l40.defaultHeaders), $l47 = Object.keys($l46.rest).some(($l48) => $l48.toLowerCase() === "x-api-key"), $l49 = { ...$l46.rest, ...$m_zS(), Authorization: null, ...!$l45 && !$l47 && { "X-Api-Key": null }, ...process.env.ANTHROPIC_BEDROCK_SERVICE_TIER && { "X-Amzn-Bedrock-Service-Tier": process.env.ANTHROPIC_BEDROCK_SERVICE_TIER } }, $l50 = process.env.AWS_BEARER_TOKEN_BEDROCK?.trim(), $l51 = $l50 ? `Bearer ${$l50}` : $l45 ? $l46.value : void 0, $l52 = $m_pd(), $l53 = !$l51 && !$l45 && !$l52 ? await $m_Ao($m_A9($l16, $l27), $l16) : null, $l54 = { ...$l40, defaultHeaders: $l49, awsRegion: $l44, apiKey: null, ...$l45 && !$l51 && { skipAuth: true }, ...$l51 && { apiKey: $l51.match(/^Bearer (.+)$/i)?.[1] ?? $l51, defaultHeaders: { ...$l49, Authorization: $l51, ...$l45 && $m_zKt($l46.rest) } }, ...$l52 && !$l51 && !$l45 && { providerChainResolver: $m_bue("Bedrock").providerChainResolver }, ...!$l52 && !$l51 && !$l45 && { providerChainResolver: $m_q7($l44) }, ...$m_yX() && { logger: $m_xt() } };
    return $l53 ? new $l43({ ...$l54, awsAccessKey: $l53.accessKeyId, awsSecretKey: $l53.secretAccessKey, awsSessionToken: $l53.sessionToken }) : new $l43($l54);
  }
  if ($l36 === "foundry") {
    let { AnthropicFoundry: $l55 } = await import("./chunk-z0nzr8ts.js"), $l56, $l57 = false;
    if ($m_i.ANTHROPIC_FOUNDRY_AUTH_TOKEN) $l56 = async () => $m_i.ANTHROPIC_FOUNDRY_AUTH_TOKEN ?? "";
    else if (!process.env.ANTHROPIC_FOUNDRY_API_KEY) if ($m_i.CLAUDE_CODE_SKIP_FOUNDRY_AUTH) $l57 = true, $l56 = () => Promise.resolve("skip-foundry-auth");
    else if ($m_pd()) throw $m_R_n("Foundry");
    else {
      let { DefaultAzureCredential: $l58, getBearerTokenProvider: $l59 } = await import("./chunk-0bk2wq2d.js");
      $l56 = $l59(new $l58(), "https://cognitiveservices.azure.com/.default");
    }
    let $l60 = $m_i.ANTHROPIC_FOUNDRY_RESOURCE;
    if ($l60 !== void 0 && $m_i.ANTHROPIC_FOUNDRY_BASE_URL === void 0 && $m_Zs($l60) === void 0) throw Error("ANTHROPIC_FOUNDRY_RESOURCE must be a Foundry resource name (2-64 letters, digits and hyphens, not starting or ending with a hyphen, such as my-resource), not a URL or host name. To use a full URL, set ANTHROPIC_FOUNDRY_BASE_URL instead.");
    let $l61 = $m_bt($l40.defaultHeaders), $l62 = { ...$l40, ...$l60 !== void 0 && { resource: $l60 }, defaultHeaders: { ...$l61.rest, ...$m_zS(), Authorization: null }, ...$l56 && { azureADTokenProvider: $l56, apiKey: null, defaultHeaders: $l57 ? { ...$l61.rest, ...$l61.value !== void 0 && { Authorization: $l61.value } } : { ...$l61.rest, ...$m_zS() } }, ...$m_yX() && { logger: $m_xt() } };
    return new $l55($l62);
  }
  if ($l36 === "anthropicAws") {
    let { AnthropicAws: $l63 } = await import("./chunk-xxjtem0v.js"), $l64 = $m_i.CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH, $l65 = await $m_fI(), $l66 = $m_bt($l40.defaultHeaders), $l67 = $l64 ? $l66.value : void 0, $l68 = Object.entries($l66.rest).findLast(([$l69]) => $l69.toLowerCase() === "anthropic-workspace-id")?.[1], $l70 = { ...$l40, awsRegion: $l65, ...$l68 && $m_i.ANTHROPIC_AWS_WORKSPACE_ID && { workspaceId: $l68 }, defaultHeaders: { ...$l66.rest, ...$m_zS(), Authorization: null }, ...!$l64 && { authToken: null }, ...$l64 && !$l67 && { skipAuth: true }, ...$l67 && { apiKey: $l67.match(/^Bearer (.+)$/i)?.[1] ?? $l67, defaultHeaders: { ...$l66.rest, ...$m_zS(), Authorization: $l67 } }, ...$m_yX() && { logger: $m_xt() } };
    if (!process.env.ANTHROPIC_AWS_API_KEY && !$l64) if ($m_pd()) $l70.providerChainResolver = $m_bue("Anthropic-on-AWS").providerChainResolver;
    else {
      let $l71 = await $m_Ao($m_A9($l16, $l27), $l16);
      if ($l71) $l70.awsAccessKey = $l71.accessKeyId, $l70.awsSecretAccessKey = $l71.secretAccessKey, $l70.awsSessionToken = $l71.sessionToken;
      else $l70.providerChainResolver = $m_q7($l65);
    }
    return new $l63($l70);
  }
  if ($l36 === "anthropicGoogleCloud") {
    $m_Gt("ANTHROPIC_GOOGLE_CLOUD_PROJECT", $m_i.ANTHROPIC_GOOGLE_CLOUD_PROJECT), $m_Gt("ANTHROPIC_GOOGLE_CLOUD_LOCATION", $m_i.ANTHROPIC_GOOGLE_CLOUD_LOCATION), $m_Gt("ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID", $m_i.ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID), $m_Gt("GCLOUD_PROJECT", $m_i.GCLOUD_PROJECT), $m_Gt("GOOGLE_CLOUD_PROJECT", $m_i.GOOGLE_CLOUD_PROJECT), $m_Gt("gcloud_project", $m_i.gcloud_project), $m_Gt("google_cloud_project", $m_i.google_cloud_project);
    let $l72 = $m_i.CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH, $l73 = $m_pd();
    if (!$l72 && !$l73) await $m_Ao($m_Q2t($l16, $l27), $l16);
    let [{ AnthropicGoogleCloud: $l74 }, { buildVertexGoogleAuth: $l75 }] = await Promise.all([import("./chunk-4nr7b732.js"), import("./chunk-f5dey12w.js")]), $l76 = $m_bt($l40.defaultHeaders), $l77 = $l72 ? $l76.value : void 0, $l78 = { ...$l40, defaultHeaders: { ...$l76.rest, ...$m_zS() }, ...$l72 ? { skipAuth: true } : { googleAuth: await $l75({ kind: "default" }, void 0) }, ...$l77 && { defaultHeaders: { ...$l76.rest, Authorization: $l77 } }, ...$m_yX() && { logger: $m_xt() } };
    return new $l74($l78);
  }
  if ($l36 === "mantle") {
    let { AnthropicBedrockMantle: $l79 } = await import("./chunk-6s1629fd.js"), $l80 = $m_i.CLAUDE_CODE_SKIP_MANTLE_AUTH, $l81 = $m_bt($l40.defaultHeaders), $l82 = $l80 ? $l81.value : void 0, $l83 = process.env.AWS_BEARER_TOKEN_BEDROCK?.trim(), $l84 = $m_pd(), $l85 = !$l83 && !$l80 && !$l84 ? await $m_Ao($m_A9($l16, $l27), $l16) : null, $l86 = $m_pi($l3, $l37), $l87 = Object.keys($l81.rest).some(($l88) => $l88.toLowerCase() === "x-api-key");
    return new $l79({ ...$l40, defaultHeaders: $l83 ? { ...$l81.rest, ...$m_zS(), Authorization: `Bearer ${$l83}`, ...!$l87 && { "X-Api-Key": null } } : { ...$l81.rest, ...$m_zS(), Authorization: null, ...!$l80 && !$l87 && { "X-Api-Key": null } }, awsRegion: $l86, ...!$l83 && !$l80 && { authToken: null }, ...$l80 && !$l82 && { skipAuth: true }, ...$l82 && { apiKey: $l82.match(/^Bearer (.+)$/i)?.[1] ?? $l82, defaultHeaders: { ...$l81.rest, ...$m_zS(), Authorization: $l82 } }, ...$l85 && { awsAccessKey: $l85.accessKeyId, awsSecretAccessKey: $l85.secretAccessKey, awsSessionToken: $l85.sessionToken }, ...$l84 && !$l83 && !$l80 && { providerChainResolver: $m_bue("Mantle").providerChainResolver }, ...!$l84 && !$l83 && !$l80 && { providerChainResolver: $m_q7($l86) }, ...$m_yX() && { logger: $m_xt() } });
  }
  if ($l36 === "vertex") {
    let $l89 = $m_i.CLAUDE_CODE_SKIP_VERTEX_AUTH, $l90 = $m_pd();
    if (!$l89 && !$l90) await $m_Ao($m_Q2t($l16, $l27), $l16);
    let [{ AnthropicVertex: $l91 }, { buildVertexGoogleAuth: $l92 }] = await Promise.all([import("./chunk-hant4jvy.js"), import("./chunk-f5dey12w.js")]), $l93 = await $l92($l89 ? { kind: "skip" } : { kind: "default" }, $m_mEt()), $l94 = $m_bt($l40.defaultHeaders), $l95 = $l89 ? $l94.value : void 0, $l96 = { ...$l40, defaultHeaders: { ...$l94.rest, ...$m_yRe($l89 ? { wireAuthorization: $l95, headers: $l94.rest } : false) }, region: $m_VSe($l3), googleAuth: $l93, ...$m_yX() && { logger: $m_xt() } };
    return $m_hRe(new $l91($l96));
  }
  let $l97 = $l1 || $m_Sue();
  if (!$l97 && $m_kc()) {
    let $l98 = await $m_vCe();
    if ($l98 !== null) {
      let $l99 = await $m_PKe(), { rest: $l100 } = $m_bt($l30), $l101 = $m_i.ANTHROPIC_BASE_URL || $l99?.baseURL;
      $m_ont($l36, $l101);
      let $l102 = await $l98.getToken();
      return new $m_wAe({ apiKey: null, authToken: $l102, baseURL: $l101, ...$l40, defaultHeaders: { ...$l100, ...$m_zS(), Authorization: `Bearer ${$l102}`, ...$l99?.extraHeaders, ...$m_dl($l29, $l100) }, ...$m_yX() && { logger: $m_xt() } });
    }
  }
  if (!$l97 && !$l32 && !$m_bt($l30).value && await $m_LV($l14)) throw new $m_jZe();
  if ($l33) {
    let $l103 = $m_tRe();
    if ($l103) throw new $m_Qbe($l103.url);
    if ($l31 === "lock_timeout" && $l32?.expiresAt != null && Date.now() >= $l32.expiresAt && $m_k("tengu_sharded_beacon", true)) throw new $m_ybt();
  }
  let $l104 = $m_O7s({ isSubscriber: $l33, apiKey: $l97, oauthAccessToken: $l32?.accessToken }), $l105 = { ...$l30, ...$m_dl($l29, $l30) };
  if ($m_BVr({ apiKey: $l104.apiKey, getApiKeySource: () => {
    let { source: $l106 } = $m_Ep({ skipRetrievingKeyFromApiKeyHelper: true });
    return $l106 === "none" ? "unknown" : $l106;
  }, authToken: $l104.authToken, getAuthTokenSource: () => {
    let { source: $l107 } = $m_ua();
    return $l107 === "CLAUDE_CODE_OAUTH_TOKEN" || $l107 === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR" || $l107 === "CCR_OAUTH_TOKEN_FILE" ? $l107 : "claude.ai";
  }, defaultHeaders: $l105, authorizationSource: $l34, customHeaderNames: Object.keys($l28), envSuppliedHeaderNames: new Set([$l19 && "x-claude-remote-container-id", $l20 && "x-claude-remote-session-id", $l21 && "x-client-app"].filter(($l108) => Boolean($l108))) }), $l104.authToken && $m_mwn($l104.authToken)) return SELF($l0);
  let $l109 = { apiKey: $l104.apiKey, authToken: $l104.authToken, ...$m_i.ANTHROPIC_BASE_URL ? { baseURL: $m_i.ANTHROPIC_BASE_URL } : false, ...$l40, defaultHeaders: $l105, ...$m_yX() && { logger: $m_xt() } };
  return new $m_wAe($l109);
}
;
