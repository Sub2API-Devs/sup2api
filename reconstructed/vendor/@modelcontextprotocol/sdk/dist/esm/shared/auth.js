/**
 * @modelcontextprotocol/sdk/dist/esm/shared/auth.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-9z4e25ww.js (1)
 * attribution: esm-fingerprint 1
 */
import {
  A8e,
  looseObject,
  string,
  array,
  M,
  u,
  literal,
  qne,
  E,
} from "../../../../../zod/v4/classic/schemas.js";
import { ZodIssueCode, F1e } from "../../../../../zod/v4/classic/compat.js";
import { bY } from "../../../../../zod/v4/core/core.js";

//@ chunk-9z4e25ww.js:397-4730 esm-fingerprint
var SafeUrlSchema = A8e()
  .superRefine((val, ctx) => {
    if (!URL.canParse(val)) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: "URL must be parseable",
        fatal: true,
      });
      return bY;
    }
  })
  .refine(
    (url) => {
      let u = new URL(url);
      return u.protocol !== "javascript:" && u.protocol !== "data:" && u.protocol !== "vbscript:";
    },
    {
      message: "URL cannot use javascript:, data:, or vbscript: scheme",
    },
  );
var OAuthProtectedResourceMetadataSchema = looseObject({
  resource: string().url(),
  authorization_servers: array(SafeUrlSchema).optional(),
  jwks_uri: string().url().optional(),
  scopes_supported: array(string()).optional(),
  bearer_methods_supported: array(string()).optional(),
  resource_signing_alg_values_supported: array(string()).optional(),
  resource_name: string().optional(),
  resource_documentation: string().optional(),
  resource_policy_uri: string().url().optional(),
  resource_tos_uri: string().url().optional(),
  tls_client_certificate_bound_access_tokens: M().optional(),
  authorization_details_types_supported: array(string()).optional(),
  dpop_signing_alg_values_supported: array(string()).optional(),
  dpop_bound_access_tokens_required: M().optional(),
});
var OAuthMetadataSchema = looseObject({
  issuer: string(),
  authorization_endpoint: SafeUrlSchema,
  token_endpoint: SafeUrlSchema,
  registration_endpoint: SafeUrlSchema.optional(),
  scopes_supported: array(string()).optional(),
  response_types_supported: array(string()),
  response_modes_supported: array(string()).optional(),
  grant_types_supported: array(string()).optional(),
  token_endpoint_auth_methods_supported: array(string()).optional(),
  token_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
  service_documentation: SafeUrlSchema.optional(),
  revocation_endpoint: SafeUrlSchema.optional(),
  revocation_endpoint_auth_methods_supported: array(string()).optional(),
  revocation_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
  introspection_endpoint: string().optional(),
  introspection_endpoint_auth_methods_supported: array(string()).optional(),
  introspection_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
  code_challenge_methods_supported: array(string()).optional(),
  client_id_metadata_document_supported: M().optional(),
});
var OpenIdProviderMetadataSchema = looseObject({
  issuer: string(),
  authorization_endpoint: SafeUrlSchema,
  token_endpoint: SafeUrlSchema,
  userinfo_endpoint: SafeUrlSchema.optional(),
  jwks_uri: SafeUrlSchema,
  registration_endpoint: SafeUrlSchema.optional(),
  scopes_supported: array(string()).optional(),
  response_types_supported: array(string()),
  response_modes_supported: array(string()).optional(),
  grant_types_supported: array(string()).optional(),
  acr_values_supported: array(string()).optional(),
  subject_types_supported: array(string()),
  id_token_signing_alg_values_supported: array(string()),
  id_token_encryption_alg_values_supported: array(string()).optional(),
  id_token_encryption_enc_values_supported: array(string()).optional(),
  userinfo_signing_alg_values_supported: array(string()).optional(),
  userinfo_encryption_alg_values_supported: array(string()).optional(),
  userinfo_encryption_enc_values_supported: array(string()).optional(),
  request_object_signing_alg_values_supported: array(string()).optional(),
  request_object_encryption_alg_values_supported: array(string()).optional(),
  request_object_encryption_enc_values_supported: array(string()).optional(),
  token_endpoint_auth_methods_supported: array(string()).optional(),
  token_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
  display_values_supported: array(string()).optional(),
  claim_types_supported: array(string()).optional(),
  claims_supported: array(string()).optional(),
  service_documentation: string().optional(),
  claims_locales_supported: array(string()).optional(),
  ui_locales_supported: array(string()).optional(),
  claims_parameter_supported: M().optional(),
  request_parameter_supported: M().optional(),
  request_uri_parameter_supported: M().optional(),
  require_request_uri_registration: M().optional(),
  op_policy_uri: SafeUrlSchema.optional(),
  op_tos_uri: SafeUrlSchema.optional(),
  client_id_metadata_document_supported: M().optional(),
});
var OpenIdProviderDiscoveryMetadataSchema = u({
  ...OpenIdProviderMetadataSchema.shape,
  ...OAuthMetadataSchema.pick({
    code_challenge_methods_supported: true,
  }).shape,
});
var OAuthTokensSchema = u({
  access_token: string(),
  id_token: string().optional(),
  token_type: string(),
  expires_in: F1e().optional(),
  scope: string().optional(),
  refresh_token: string().optional(),
}).strip();
var OAuthErrorResponseSchema = u({
  error: string(),
  error_description: string().optional(),
  error_uri: string().optional(),
});
var OptionalSafeUrlSchema = SafeUrlSchema.optional().or(
  literal("").transform(() => {
    return;
  }),
);
var OAuthClientMetadataSchema = u({
  redirect_uris: array(SafeUrlSchema),
  token_endpoint_auth_method: string().optional(),
  grant_types: array(string()).optional(),
  response_types: array(string()).optional(),
  client_name: string().optional(),
  client_uri: SafeUrlSchema.optional(),
  logo_uri: OptionalSafeUrlSchema,
  scope: string().optional(),
  contacts: array(string()).optional(),
  tos_uri: OptionalSafeUrlSchema,
  policy_uri: string().optional(),
  jwks_uri: SafeUrlSchema.optional(),
  jwks: qne().optional(),
  software_id: string().optional(),
  software_version: string().optional(),
  software_statement: string().optional(),
}).strip();
var OAuthClientInformationSchema = u({
  client_id: string(),
  client_secret: string().optional(),
  client_id_issued_at: E().optional(),
  client_secret_expires_at: E().optional(),
}).strip();
var OAuthClientInformationFullSchema = OAuthClientMetadataSchema.merge(OAuthClientInformationSchema);
var OAuthClientRegistrationErrorSchema = u({
  error: string(),
  error_description: string().optional(),
}).strip();
var OAuthTokenRevocationRequestSchema = u({
  token: string(),
  token_type_hint: string().optional(),
}).strip();
export {
  OAuthTokensSchema,
  OAuthErrorResponseSchema,
  OAuthMetadataSchema,
  OpenIdProviderDiscoveryMetadataSchema,
  OAuthProtectedResourceMetadataSchema,
  OAuthClientInformationFullSchema,
};
