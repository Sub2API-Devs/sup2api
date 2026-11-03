/**
 * @modelcontextprotocol/sdk/dist/esm/shared/auth.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-9z4e25ww.js (1)
 * attribution: esm-fingerprint 1
 */
import { A8e, kt, o, A, M, u, T, qne, E } from "../../../../../zod/v4/classic/schemas.js";
import { I8, F1e } from "../../../../../zod/v4/classic/compat.js";
import { freeze } from "../../../../../zod/v4/core/core.js";

//@ chunk-9z4e25ww.js:397-4730 esm-fingerprint
var refine = A8e()
    .superRefine((e, t) => {
      if (!URL.canParse(e))
        return (t.addIssue({ code: I8.custom, message: "URL must be parseable", fatal: !0 }), freeze);
    })
    .refine(
      (e) => {
        let t = new URL(e);
        return t.protocol !== "javascript:" && t.protocol !== "data:" && t.protocol !== "vbscript:";
      },
      { message: "URL cannot use javascript:, data:, or vbscript: scheme" },
    ),
  F = kt({
    resource: o().url(),
    authorization_servers: A(refine).optional(),
    jwks_uri: o().url().optional(),
    scopes_supported: A(o()).optional(),
    bearer_methods_supported: A(o()).optional(),
    resource_signing_alg_values_supported: A(o()).optional(),
    resource_name: o().optional(),
    resource_documentation: o().optional(),
    resource_policy_uri: o().url().optional(),
    resource_tos_uri: o().url().optional(),
    tls_client_certificate_bound_access_tokens: M().optional(),
    authorization_details_types_supported: A(o()).optional(),
    dpop_signing_alg_values_supported: A(o()).optional(),
    dpop_bound_access_tokens_required: M().optional(),
  }),
  KYn = kt({
    issuer: o(),
    authorization_endpoint: refine,
    token_endpoint: refine,
    registration_endpoint: refine.optional(),
    scopes_supported: A(o()).optional(),
    response_types_supported: A(o()),
    response_modes_supported: A(o()).optional(),
    grant_types_supported: A(o()).optional(),
    token_endpoint_auth_methods_supported: A(o()).optional(),
    token_endpoint_auth_signing_alg_values_supported: A(o()).optional(),
    service_documentation: refine.optional(),
    revocation_endpoint: refine.optional(),
    revocation_endpoint_auth_methods_supported: A(o()).optional(),
    revocation_endpoint_auth_signing_alg_values_supported: A(o()).optional(),
    introspection_endpoint: o().optional(),
    introspection_endpoint_auth_methods_supported: A(o()).optional(),
    introspection_endpoint_auth_signing_alg_values_supported: A(o()).optional(),
    code_challenge_methods_supported: A(o()).optional(),
    client_id_metadata_document_supported: M().optional(),
  }),
  ne = kt({
    issuer: o(),
    authorization_endpoint: refine,
    token_endpoint: refine,
    userinfo_endpoint: refine.optional(),
    jwks_uri: refine,
    registration_endpoint: refine.optional(),
    scopes_supported: A(o()).optional(),
    response_types_supported: A(o()),
    response_modes_supported: A(o()).optional(),
    grant_types_supported: A(o()).optional(),
    acr_values_supported: A(o()).optional(),
    subject_types_supported: A(o()),
    id_token_signing_alg_values_supported: A(o()),
    id_token_encryption_alg_values_supported: A(o()).optional(),
    id_token_encryption_enc_values_supported: A(o()).optional(),
    userinfo_signing_alg_values_supported: A(o()).optional(),
    userinfo_encryption_alg_values_supported: A(o()).optional(),
    userinfo_encryption_enc_values_supported: A(o()).optional(),
    request_object_signing_alg_values_supported: A(o()).optional(),
    request_object_encryption_alg_values_supported: A(o()).optional(),
    request_object_encryption_enc_values_supported: A(o()).optional(),
    token_endpoint_auth_methods_supported: A(o()).optional(),
    token_endpoint_auth_signing_alg_values_supported: A(o()).optional(),
    display_values_supported: A(o()).optional(),
    claim_types_supported: A(o()).optional(),
    claims_supported: A(o()).optional(),
    service_documentation: o().optional(),
    claims_locales_supported: A(o()).optional(),
    ui_locales_supported: A(o()).optional(),
    claims_parameter_supported: M().optional(),
    request_parameter_supported: M().optional(),
    request_uri_parameter_supported: M().optional(),
    require_request_uri_registration: M().optional(),
    op_policy_uri: refine.optional(),
    op_tos_uri: refine.optional(),
    client_id_metadata_document_supported: M().optional(),
  }),
  A$r = u({ ...ne.shape, ...KYn.pick({ code_challenge_methods_supported: !0 }).shape }),
  strip = u({
    access_token: o(),
    id_token: o().optional(),
    token_type: o(),
    expires_in: F1e().optional(),
    scope: o().optional(),
    refresh_token: o().optional(),
  }).strip(),
  R$r = u({ error: o(), error_description: o().optional(), error_uri: o().optional() }),
  or = refine.optional().or(
    T("").transform(() => {
      return;
    }),
  ),
  strip_2 = u({
    redirect_uris: A(refine),
    token_endpoint_auth_method: o().optional(),
    grant_types: A(o()).optional(),
    response_types: A(o()).optional(),
    client_name: o().optional(),
    client_uri: refine.optional(),
    logo_uri: or,
    scope: o().optional(),
    contacts: A(o()).optional(),
    tos_uri: or,
    policy_uri: o().optional(),
    jwks_uri: refine.optional(),
    jwks: qne().optional(),
    software_id: o().optional(),
    software_version: o().optional(),
    software_statement: o().optional(),
  }).strip(),
  strip_3 = u({
    client_id: o(),
    client_secret: o().optional(),
    client_id_issued_at: E().optional(),
    client_secret_expires_at: E().optional(),
  }).strip(),
  merge = strip_2.merge(strip_3),
  strip_4 = u({ error: o(), error_description: o().optional() }).strip(),
  strip_5 = u({ token: o(), token_type_hint: o().optional() }).strip();

export { strip, R$r, KYn, A$r, F, merge };
