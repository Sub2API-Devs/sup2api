async function SELF({ apiKey: $l0, maxRetries: $l1, model: $l2, fetchOverride: $l3, source: $l4, querySource: $l5 = $l4, requestClass: $l6, agentContext: $l7, promptId: $l8, permissionContext: $l9, toolNames: $l10 = [], classifierJudgesServedCall: $l11, credentials: $l12, storageV5: $l13, signal: $l14, clock: $l15 = $m_Xd }) {
  let $l16 = process.env.CLAUDE_CODE_CONTAINER_ID, $l17 = process.env.CLAUDE_CODE_REMOTE_SESSION_ID, $l18 = process.env.CLAUDE_AGENT_SDK_CLIENT_APP, $l19 = $m_yLe() ? $m_a.CLAUDE_CODE_SESSION_ORIGIN : void 0, $l20 = $m_uf($l7) ? void 0 : $l7, $l21 = $m_m6n(), $l22 = $l21 ? $m_PVs($l4, $l7, $l6) : void 0, $l23 = $l21 ? $m_IVs($l4, $l7) : void 0, $l24 = { userTurn: $l4 !== "side_query" && $m_RVs($l5) && $m_IW() === void 0 && $m_ab() === void 0 && ($l7.agentType === "main" || $l7.isBackgroundAgent === false) }, $l25 = $m_xFt(), $l26 = await $m_yp({ querySource: $l5, permissionContext: $l9, toolNames: $l10, classifierJudgesServedCall: $l11 }), $l27 = { ...$m_nl(), ...$l25, ...$m_vF(), ...$l16 && { "x-claude-remote-container-id": $l16 }, ...$l17 && { "x-claude-remote-session-id": $l17 }, ...$l19 && { [$m_G$r]: $l19 }, ...$l18 && { "x-client-app": $l18 }, ...$l20?.agentId && { "x-claude-code-agent-id": $m_o1r($l20.agentId) }, ...$l20?.parentAgentId && { "x-claude-code-parent-agent-id": $m_o1r($l20.parentAgentId) }, ...$l22 && { [$m_oBt]: $l22 }, ...$l23 && { [$m_j$r]: $m_o1r($l23) }, ...$l21 && $l8 !== void 0 && $m_Vt($l8) !== null && { [$m_W$r]: $l8 } };
  if ($m_t(`[API:request] Creating client, ANTHROPIC_CUSTOM_HEADERS present: ${!!process.env.ANTHROPIC_CUSTOM_HEADERS}, has Authorization header: ${!!$l25.Authorization}`, { level: "verbose" }), $m_a.CLAUDE_CODE_ADDITIONAL_PROTECTION) $l27["x-anthropic-additional-protection"] = "true";
  if ($m_Pe() === "gateway" && !$m_Gr() && !$m_Htt()) {
    if ($m__d()) throw $m_Iun("Cloud gateway");
    throw new $m_CFt("Not signed in to the Cloud gateway \u2014 run /login.", "signin_required");
  }
  let $l28 = await $m_Zle({ credentials: $l12, storageV5: $l13 }), $l29 = $m_Mn(), $l30 = $m_q6n({ anthropicAuthEnabled: $m_ll(), oauthScopes: $l29?.scopes }), $l31 = null;
  if (!$l30 && !$m_Gr()) $l31 = await $m_ty($l27, $m_Se());
  await $m_T2e();
  let $l32 = $m_cy($l3, $l4, $m_Sd($l2), $l13, $l15), $l33 = $m_Sd($l2);
  if ($m_cQe($l33), $m_qs().once("provider_route")) $m_g("provider_route");
  let $l34 = $l33 === "bedrock" || $l33 === "mantle" ? await $m_tH() : void 0, $l35 = $m_kp()?.body_idle_timeout, $l36 = { defaultHeaders: $l27, maxRetries: $l1, timeout: $m_qLr() ?? 6e5, dangerouslyAllowBrowser: true, fetchOptions: $m_fa({ forAnthropicAPI: true, hasBodyIdleWatchdog: $m_XLr($l33), bodyIdleTimeout: typeof $l35 === "boolean" ? $l35 : void 0, url: $m_ry($l33, $l2, $l34) }), ...$l32 && { fetch: $l32 }, ...$m_eO };
  if ($l33 === "gateway") {
    await $m_w4();
    let $l37 = $m_Gr();
    if (!$l37 || $m_w6o() && !$m_Pun()) throw $l37?.unpinned ? new $m_CFt("Cloud gateway token expired \u2014 refresh ANTHROPIC_AUTH_TOKEN and restart.", "token_expired") : new $m_CFt($m_UUt, "session_expired");
    let { rest: $l38 } = $m_yt($l36.defaultHeaders);
    return new $m__ke({ ...$l36, defaultHeaders: { ...$l38, ...$m_yS(), Authorization: `Bearer ${$l37.jwt}` }, apiKey: null, baseURL: $l37.url, authToken: $l37.jwt, ...$m_S8() && { logger: $m_xt() } });
  }
  if ($l33 === "bedrock") {
    let { AnthropicBedrock: $l39 } = await import("./chunk-gkgr18nw.js"), $l40 = $m_fi($l2, $l34), $l41 = $m_a.CLAUDE_CODE_SKIP_BEDROCK_AUTH, $l42 = $m_yt($l36.defaultHeaders), $l43 = Object.keys($l42.rest).some(($l44) => $l44.toLowerCase() === "x-api-key"), $l45 = { ...$l42.rest, ...$m_yS(), Authorization: null, ...!$l41 && !$l43 && { "X-Api-Key": null }, ...process.env.ANTHROPIC_BEDROCK_SERVICE_TIER && { "X-Amzn-Bedrock-Service-Tier": process.env.ANTHROPIC_BEDROCK_SERVICE_TIER } }, $l46 = process.env.AWS_BEARER_TOKEN_BEDROCK?.trim(), $l47 = $l46 ? `Bearer ${$l46}` : $l41 ? $l42.value : void 0, $l48 = $m__d(), $l49 = !$l47 && !$l41 && !$l48 ? await $m_Eo($m_x3($l14, $l24), $l14) : null, $l50 = { ...$l36, defaultHeaders: $l45, awsRegion: $l40, apiKey: null, ...$l41 && !$l47 && { skipAuth: true }, ...$l47 && { apiKey: $l47.match(/^Bearer (.+)$/i)?.[1] ?? $l47, defaultHeaders: { ...$l45, Authorization: $l47, ...$l41 && $m_b1t($l42.rest) } }, ...$l48 && !$l47 && !$l41 && { providerChainResolver: $m_Yle("Bedrock").providerChainResolver }, ...!$l48 && !$l47 && !$l41 && { providerChainResolver: $m_$J($l40) }, ...$m_S8() && { logger: $m_xt() } };
    return $l49 ? new $l39({ ...$l50, awsAccessKey: $l49.accessKeyId, awsSecretKey: $l49.secretAccessKey, awsSessionToken: $l49.sessionToken }) : new $l39($l50);
  }
  if ($l33 === "foundry") {
    let { AnthropicFoundry: $l51 } = await import("./chunk-ayes1rrd.js"), $l52, $l53 = false;
    if ($m_a.ANTHROPIC_FOUNDRY_AUTH_TOKEN) $l52 = async () => $m_a.ANTHROPIC_FOUNDRY_AUTH_TOKEN ?? "";
    else if (!process.env.ANTHROPIC_FOUNDRY_API_KEY) if ($m_a.CLAUDE_CODE_SKIP_FOUNDRY_AUTH) $l53 = true, $l52 = () => Promise.resolve("skip-foundry-auth");
    else if ($m__d()) throw $m_Iun("Foundry");
    else {
      let { DefaultAzureCredential: $l54, getBearerTokenProvider: $l55 } = await import("./chunk-j7ze2wpy.js");
      $l52 = $l55(new $l54(), "https://cognitiveservices.azure.com/.default");
    }
    let $l56 = $m_a.ANTHROPIC_FOUNDRY_RESOURCE;
    if ($l56 !== void 0 && $m_a.ANTHROPIC_FOUNDRY_BASE_URL === void 0 && $m_Qs($l56) === void 0) throw Error("ANTHROPIC_FOUNDRY_RESOURCE must be a Foundry resource name (2-64 letters, digits and hyphens, not starting or ending with a hyphen, such as my-resource), not a URL or host name. To use a full URL, set ANTHROPIC_FOUNDRY_BASE_URL instead.");
    let $l57 = $m_yt($l36.defaultHeaders), $l58 = { ...$l36, ...$l56 !== void 0 && { resource: $l56 }, defaultHeaders: { ...$l57.rest, ...$m_yS(), Authorization: null }, ...$l52 && { azureADTokenProvider: $l52, apiKey: null, defaultHeaders: $l53 ? { ...$l57.rest, ...$l57.value !== void 0 && { Authorization: $l57.value } } : { ...$l57.rest, ...$m_yS() } }, ...$m_S8() && { logger: $m_xt() } };
    return new $l51($l58);
  }
  if ($l33 === "anthropicAws") {
    let { AnthropicAws: $l59 } = await import("./chunk-w8ttwsxa.js"), $l60 = $m_a.CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH, $l61 = await $m_tH(), $l62 = $m_yt($l36.defaultHeaders), $l63 = $l60 ? $l62.value : void 0, $l64 = Object.entries($l62.rest).findLast(([$l65]) => $l65.toLowerCase() === "anthropic-workspace-id")?.[1], $l66 = { ...$l36, awsRegion: $l61, ...$l64 && $m_a.ANTHROPIC_AWS_WORKSPACE_ID && { workspaceId: $l64 }, defaultHeaders: { ...$l62.rest, ...$m_yS(), Authorization: null }, ...!$l60 && { authToken: null }, ...$l60 && !$l63 && { skipAuth: true }, ...$l63 && { apiKey: $l63.match(/^Bearer (.+)$/i)?.[1] ?? $l63, defaultHeaders: { ...$l62.rest, ...$m_yS(), Authorization: $l63 } }, ...$m_S8() && { logger: $m_xt() } };
    if (!process.env.ANTHROPIC_AWS_API_KEY && !$l60) if ($m__d()) $l66.providerChainResolver = $m_Yle("Anthropic-on-AWS").providerChainResolver;
    else {
      let $l67 = await $m_Eo($m_x3($l14, $l24), $l14);
      if ($l67) $l66.awsAccessKey = $l67.accessKeyId, $l66.awsSecretAccessKey = $l67.secretAccessKey, $l66.awsSessionToken = $l67.sessionToken;
      else $l66.providerChainResolver = $m_$J($l61);
    }
    return new $l59($l66);
  }
  if ($l33 === "anthropicGoogleCloud") {
    $m_Gt("ANTHROPIC_GOOGLE_CLOUD_PROJECT", $m_a.ANTHROPIC_GOOGLE_CLOUD_PROJECT), $m_Gt("ANTHROPIC_GOOGLE_CLOUD_LOCATION", $m_a.ANTHROPIC_GOOGLE_CLOUD_LOCATION), $m_Gt("ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID", $m_a.ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID), $m_Gt("GCLOUD_PROJECT", $m_a.GCLOUD_PROJECT), $m_Gt("GOOGLE_CLOUD_PROJECT", $m_a.GOOGLE_CLOUD_PROJECT), $m_Gt("gcloud_project", $m_a.gcloud_project), $m_Gt("google_cloud_project", $m_a.google_cloud_project);
    let $l68 = $m_a.CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH, $l69 = $m__d();
    if (!$l68 && !$l69) await $m_Eo($m_ABt($l14, $l24), $l14);
    let { AnthropicGoogleCloud: $l70 } = await import("./chunk-d0gxb805.js"), $l71 = $m_yt($l36.defaultHeaders), $l72 = $l68 ? $l71.value : void 0, $l73 = { ...$l36, defaultHeaders: { ...$l71.rest, ...$m_yS() }, ...$l68 && { skipAuth: true }, ...$l72 && { defaultHeaders: { ...$l71.rest, Authorization: $l72 } }, ...$m_S8() && { logger: $m_xt() } };
    return new $l70($l73);
  }
  if ($l33 === "mantle") {
    let { AnthropicBedrockMantle: $l74 } = await import("./chunk-gkgr18nw.js"), $l75 = $m_a.CLAUDE_CODE_SKIP_MANTLE_AUTH, $l76 = $m_yt($l36.defaultHeaders), $l77 = $l75 ? $l76.value : void 0, $l78 = process.env.AWS_BEARER_TOKEN_BEDROCK?.trim(), $l79 = $m__d(), $l80 = !$l78 && !$l75 && !$l79 ? await $m_Eo($m_x3($l14, $l24), $l14) : null, $l81 = $m_fi($l2, $l34), $l82 = Object.keys($l76.rest).some(($l83) => $l83.toLowerCase() === "x-api-key");
    return new $l74({ ...$l36, defaultHeaders: $l78 ? { ...$l76.rest, ...$m_yS(), Authorization: `Bearer ${$l78}`, ...!$l82 && { "X-Api-Key": null } } : { ...$l76.rest, ...$m_yS(), Authorization: null, ...!$l75 && !$l82 && { "X-Api-Key": null } }, awsRegion: $l81, ...!$l78 && !$l75 && { authToken: null }, ...$l75 && !$l77 && { skipAuth: true }, ...$l77 && { apiKey: $l77.match(/^Bearer (.+)$/i)?.[1] ?? $l77, defaultHeaders: { ...$l76.rest, ...$m_yS(), Authorization: $l77 } }, ...$l80 && { awsAccessKey: $l80.accessKeyId, awsSecretAccessKey: $l80.secretAccessKey, awsSessionToken: $l80.sessionToken }, ...$l79 && !$l78 && !$l75 && { providerChainResolver: $m_Yle("Mantle").providerChainResolver }, ...!$l79 && !$l78 && !$l75 && { providerChainResolver: $m_$J($l81) }, ...$m_S8() && { logger: $m_xt() } });
  }
  if ($l33 === "vertex") {
    let $l84 = $m_a.CLAUDE_CODE_SKIP_VERTEX_AUTH, $l85 = $m__d();
    if (!$l84 && !$l85) await $m_Eo($m_ABt($l14, $l24), $l14);
    let [{ AnthropicVertex: $l86 }, { buildVertexGoogleAuth: $l87 }] = await Promise.all([import("./chunk-8dqtz00f.js"), import("./chunk-1z5kwkgs.js")]), $l88 = await $l87($l84 ? { kind: "skip" } : { kind: "default" }, $m_e_t()), $l89 = $m_yt($l36.defaultHeaders), $l90 = $l84 ? $l89.value : void 0, $l91 = { ...$l36, defaultHeaders: { ...$l89.rest, ...$m_yMe($l84 ? { wireAuthorization: $l90, headers: $l89.rest } : false) }, region: $m_Zye($l2), googleAuth: $l88, ...$m_S8() && { logger: $m_xt() } };
    return $m_hMe(new $l86($l91));
  }
  let $l92 = $l0 || $m_Xle();
  if (!$l92 && $m_nc()) {
    let $l93 = await $m_Rke();
    if ($l93 !== null) {
      let $l94 = await $m_JWe(), { rest: $l95 } = $m_yt($l27), $l96 = $m_a.ANTHROPIC_BASE_URL || $l94?.baseURL;
      $m_cQe($l33, $l96);
      let $l97 = await $l93.getToken();
      return new $m__ke({ apiKey: null, authToken: $l97, baseURL: $l96, ...$l36, defaultHeaders: { ...$l95, ...$m_yS(), Authorization: `Bearer ${$l97}`, ...$l94?.extraHeaders, ...$m_rl($l26, $l95) }, ...$m_S8() && { logger: $m_xt() } });
    }
  }
  if (!$l92 && !$l29 && !$m_yt($l27).value && await $m_P2($l12)) throw new $m_xJe();
  if ($l30) {
    let $l98 = $m_tTe();
    if ($l98) throw new $m_nye($l98.url);
    if ($l28 === "lock_timeout" && $l29?.expiresAt != null && Date.now() >= $l29.expiresAt && $m_k("tengu_sharded_beacon", true)) throw new $m_kht();
  }
  let $l99 = $m_a2s({ isSubscriber: $l30, apiKey: $l92, oauthAccessToken: $l29?.accessToken }), $l100 = { ...$l27, ...$m_rl($l26, $l27) };
  $m_z$r({ apiKey: $l99.apiKey, getApiKeySource: () => {
    let { source: $l101 } = $m_zp({ skipRetrievingKeyFromApiKeyHelper: true });
    return $l101 === "none" ? "unknown" : $l101;
  }, authToken: $l99.authToken, getAuthTokenSource: () => {
    let { source: $l102 } = $m_na();
    return $l102 === "CLAUDE_CODE_OAUTH_TOKEN" || $l102 === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR" || $l102 === "CCR_OAUTH_TOKEN_FILE" ? $l102 : "claude.ai";
  }, defaultHeaders: $l100, authorizationSource: $l31, customHeaderNames: Object.keys($l25), envSuppliedHeaderNames: new Set([$l16 && "x-claude-remote-container-id", $l17 && "x-claude-remote-session-id", $l18 && "x-client-app"].filter(($l103) => Boolean($l103))) });
  let $l104 = { apiKey: $l99.apiKey, authToken: $l99.authToken, ...$m_a.ANTHROPIC_BASE_URL ? { baseURL: $m_a.ANTHROPIC_BASE_URL } : false, ...$l36, defaultHeaders: $l100, ...$m_S8() && { logger: $m_xt() } };
  return new $m__ke($l104);
}
;
