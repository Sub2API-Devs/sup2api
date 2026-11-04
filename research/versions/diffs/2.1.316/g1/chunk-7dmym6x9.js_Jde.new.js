function SELF($l0) {
  if ($l0 instanceof Error && $l0.message === "Request was aborted.") return "aborted";
  if ($l0 instanceof $m_Lke) return "no_api_attempts_left";
  if ($l0 instanceof $m_IX && $l0.isUserSupplied) return $l0.header === "other" ? "invalid_request_header" : "invalid_api_key";
  if ($m_wXt($l0)) return "api_timeout";
  if ($l0 instanceof Error && ($l0.message.startsWith("Stream idle timeout") || $l0.name === "StreamIdleTimeoutError")) return "stream_idle_timeout";
  if ($l0 instanceof $m_vTn) return "stream_no_events";
  if ($m_wit($l0)) return $m_NFe;
  if ($m_DJr($l0)) return $m_$Ct;
  if ($m_Jwn($l0)) return "verification_required";
  if ($m_TXt($l0)) return "repeated_529";
  if ($l0 instanceof Error && ($l0.message.includes($m_Pht) || $l0.message.includes($m_Iht))) return "capacity_off_switch";
  if ($l0 instanceof $m_Mt && $l0.status === 429) return "rate_limit";
  if ($m_O2($l0)) return "server_overload";
  if ($l0 instanceof Error && ($l0.message.toLowerCase().includes($m_ej.toLowerCase()) || $m_mL($l0) || $m_QH($l0))) return "prompt_too_long";
  if ($m_vXt($l0)) return "pdf_too_large";
  if ($m_EXt($l0)) return "pdf_password_protected";
  if ($m_RXt($l0)) return "image_too_large";
  if ($m_CXt($l0)) return "image_too_large";
  if ($l0 instanceof $m_Mt && $l0.status === 400 && $l0.message.includes("Could not process image")) return "image_unprocessable";
  if ($l0 instanceof $m_Mt && $l0.status === 400 && /\btools\.\d+\.(?:custom\.)?input_schema\b/.test($l0.message)) return "tool_schema_invalid";
  if ($l0 instanceof $m_Mt && $l0.status === 400) {
    if ($m_lH($l0.message, "image_block")) return "image_unprocessable";
    if ($m_lH($l0.message, "document_block")) return "document_unprocessable";
    if ($m_lH($l0.message, "media_budget")) return "media_budget_exceeded";
    if ($m_lH($l0.message, "thinking_signature")) return "invalid_thinking_signature";
  }
  if ($m_xXt($l0)) return $m_HBr($l0.message) || $m_lH($l0.message, "prompt_too_long") ? "prompt_too_long" : "request_too_large";
  if ($NEW_chunk_e6aww6q8_js_Oke($l0)) return "request_too_large";
  if ($m_AXt($l0)) return "tool_use_mismatch";
  if ($m_PXt($l0)) return "unexpected_tool_result";
  if ($m_MXt($l0)) return "duplicate_tool_use_id";
  if ($m_OXt($l0)) return "invalid_model";
  if ($l0 instanceof $m_Mt && $l0.status === 404 && $l0.message.includes("not_found_error") && $l0.message.includes('"model: ')) return "model_not_found";
  if ($l0 instanceof $m_Mt && $l0.status === 400 && /invalid `?signature`? in `?thinking`? block/i.test($l0.message)) return "invalid_thinking_signature";
  if ($l0 instanceof $m_Mt && $l0.status === 400 && ($l0.message.includes("text content blocks must be non-empty") || $l0.message.includes("text content blocks must contain non-whitespace text"))) return "empty_text_block";
  if ($l0 instanceof $m_Mt && $l0.status === 400 && $l0.message.includes("diagnostics.previous_message_id")) return "previous_message_id_invalid";
  if ($l0 instanceof $m_Mt && $l0.status === 400 && $l0.message.includes(".tool_use_id") && $l0.message.includes("String should match pattern")) return "tool_use_id_invalid";
  if ($l0 instanceof $m_Mt && $l0.status === 400 && $l0.message.includes("Grammar compilation")) return "grammar_compile_error";
  if ($l0 instanceof $m_Mt && $l0.status === 400 && $l0.message.toLowerCase().includes("request body is not valid json")) return "request_body_invalid_json";
  if ($l0 instanceof Error && $l0.message.toLowerCase().includes($m_eqn.toLowerCase())) return "credit_balance_low";
  if ($m_IXt($l0) || $l0 instanceof Error && $l0.message.toLowerCase().includes("not a valid api key for this workspace")) return "invalid_api_key";
  if ($m_e3($l0)) return "token_revoked";
  if ($m_DXt($l0)) return "oauth_org_not_allowed";
  if ($l0 instanceof $m_Mt && ($l0.status === 401 || $l0.status === 403)) return "auth_error";
  if ($m_f4e($l0)) return "bedrock_model_access";
  if ($m_PM($l0)) return "output_content_filtered";
  if ($l0 instanceof $m_Wf) return "wif_credential_error";
  if ($m_Hq($l0) !== null) return "cloud_credential_error";
  if ($l0 instanceof $m_dnt || $l0 instanceof $m_Owe) return "auth_error";
  if ($l0 instanceof $m_pvt) return "oauth_refresh_lock_timeout";
  if ($l0 instanceof $m_Bq) return "oauth_refresh_disk_full";
  if ($l0 instanceof $NEW_chunk_7c9mpntp_js_nU) return "stored_login_refused";
  if ($l0 instanceof Error && $l0.message.toLowerCase().includes("domains are not accessible to our user agent")) return "webfetch_domain_blocked";
  if ($l0 instanceof Error) {
    let $l1 = $l0.message.toLowerCase();
    if ($m_kke($l0)) return "org_disabled";
    if ($l1.includes("updated our consumer terms")) return "terms_not_accepted";
    if ($l1.includes("web search is not enabled for this organization") || /is not enabled for (this|your) organization/.test($l1)) return "feature_not_enabled_for_org";
    if (/reached your specified[\w\s-]*?usage limits/.test($l1)) return "usage_cap_reached";
  }
  if ($m_Pke($l0) !== null) return "system_role_misplaced";
  if ($m__x($l0)) return "system_role_unsupported";
  if ($m_JH($l0)) return "web_search_content_rejected";
  if ($m_Uq($l0)) return "code_execution_output_rejected";
  if ($l0 instanceof $m_Mt && $l0.status === 400 && /`?(thinking|redacted_thinking)`?\s+(or\s+`?redacted_thinking`?\s+)?blocks?\s+.{0,60}cannot be modified/i.test($l0.message)) return "thinking_blocks_modified";
  if ($l0 instanceof $m_Mt && $l0.status === void 0 && $l0.type) return `in_band_${$m_NQ($l0.type)}`;
  if ($l0 instanceof $m_Mt) {
    let $l2 = $l0.status;
    if ($l2 >= 500) return "server_error";
    if ($l2 >= 400) return "client_error";
  }
  if ($l0 instanceof $m_Uu) {
    if ($m_lg($l0)?.isSSLError) return "ssl_cert_error";
    return "connection_error";
  }
  let $l3 = $m_lg($l0);
  if ($l3 && ($m_Jq.has($l3.code) || $m_YB.has($l3.code))) return "connection_error";
  return "unknown";
}
;
