/**
 * @modelcontextprotocol/sdk/dist/esm/shared/auth.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-9z4e25ww.js (1)
 * attribution: esm-fingerprint 1
 */
import {
  urlSchema,
  looseObject,
  stringSchema,
  array,
  booleanSchema,
  objectSchema,
  literal,
  anySchema,
  numberSchema,
} from "../../../../../zod/v4/classic/schemas.js";
import { ZodIssueCode, coerceNumber } from "../../../../../zod/v4/classic/compat.js";
import { INVALID } from "../../../../../zod/v4/core/core.js";
import { deferInit } from "../../../../../../runtime/deferred-init.js";

//@ chunk-9z4e25ww.js:397-4730 esm-fingerprint
var SafeUrlSchema; // deferred: uses urlSchema (../../../../../zod/v4/classic/schemas.js) of its import cycle while loading; runs once the cycle is complete
var OAuthProtectedResourceMetadataSchema;
var OAuthMetadataSchema;
var OpenIdProviderMetadataSchema;
var OpenIdProviderDiscoveryMetadataSchema;
var OAuthTokensSchema;
var OAuthErrorResponseSchema;
var OptionalSafeUrlSchema;
var OAuthClientMetadataSchema;
var OAuthClientInformationSchema;
var OAuthClientInformationFullSchema;
var OAuthClientRegistrationErrorSchema;
var OAuthTokenRevocationRequestSchema;
deferInit("chunk-9z4e25ww.js:397", () => {
  SafeUrlSchema = urlSchema()
    .superRefine((val, ctx) => {
      if (!URL.canParse(val)) {
        ctx.addIssue({
          code: ZodIssueCode.custom,
          message: "URL must be parseable",
          fatal: true,
        });
        return INVALID;
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
  OAuthProtectedResourceMetadataSchema = looseObject({
    resource: stringSchema().url(),
    authorization_servers: array(SafeUrlSchema).optional(),
    jwks_uri: stringSchema().url().optional(),
    scopes_supported: array(stringSchema()).optional(),
    bearer_methods_supported: array(stringSchema()).optional(),
    resource_signing_alg_values_supported: array(stringSchema()).optional(),
    resource_name: stringSchema().optional(),
    resource_documentation: stringSchema().optional(),
    resource_policy_uri: stringSchema().url().optional(),
    resource_tos_uri: stringSchema().url().optional(),
    tls_client_certificate_bound_access_tokens: booleanSchema().optional(),
    authorization_details_types_supported: array(stringSchema()).optional(),
    dpop_signing_alg_values_supported: array(stringSchema()).optional(),
    dpop_bound_access_tokens_required: booleanSchema().optional(),
  });
  OAuthMetadataSchema = looseObject({
    issuer: stringSchema(),
    authorization_endpoint: SafeUrlSchema,
    token_endpoint: SafeUrlSchema,
    registration_endpoint: SafeUrlSchema.optional(),
    scopes_supported: array(stringSchema()).optional(),
    response_types_supported: array(stringSchema()),
    response_modes_supported: array(stringSchema()).optional(),
    grant_types_supported: array(stringSchema()).optional(),
    token_endpoint_auth_methods_supported: array(stringSchema()).optional(),
    token_endpoint_auth_signing_alg_values_supported: array(stringSchema()).optional(),
    service_documentation: SafeUrlSchema.optional(),
    revocation_endpoint: SafeUrlSchema.optional(),
    revocation_endpoint_auth_methods_supported: array(stringSchema()).optional(),
    revocation_endpoint_auth_signing_alg_values_supported: array(stringSchema()).optional(),
    introspection_endpoint: stringSchema().optional(),
    introspection_endpoint_auth_methods_supported: array(stringSchema()).optional(),
    introspection_endpoint_auth_signing_alg_values_supported: array(stringSchema()).optional(),
    code_challenge_methods_supported: array(stringSchema()).optional(),
    client_id_metadata_document_supported: booleanSchema().optional(),
  });
  OpenIdProviderMetadataSchema = looseObject({
    issuer: stringSchema(),
    authorization_endpoint: SafeUrlSchema,
    token_endpoint: SafeUrlSchema,
    userinfo_endpoint: SafeUrlSchema.optional(),
    jwks_uri: SafeUrlSchema,
    registration_endpoint: SafeUrlSchema.optional(),
    scopes_supported: array(stringSchema()).optional(),
    response_types_supported: array(stringSchema()),
    response_modes_supported: array(stringSchema()).optional(),
    grant_types_supported: array(stringSchema()).optional(),
    acr_values_supported: array(stringSchema()).optional(),
    subject_types_supported: array(stringSchema()),
    id_token_signing_alg_values_supported: array(stringSchema()),
    id_token_encryption_alg_values_supported: array(stringSchema()).optional(),
    id_token_encryption_enc_values_supported: array(stringSchema()).optional(),
    userinfo_signing_alg_values_supported: array(stringSchema()).optional(),
    userinfo_encryption_alg_values_supported: array(stringSchema()).optional(),
    userinfo_encryption_enc_values_supported: array(stringSchema()).optional(),
    request_object_signing_alg_values_supported: array(stringSchema()).optional(),
    request_object_encryption_alg_values_supported: array(stringSchema()).optional(),
    request_object_encryption_enc_values_supported: array(stringSchema()).optional(),
    token_endpoint_auth_methods_supported: array(stringSchema()).optional(),
    token_endpoint_auth_signing_alg_values_supported: array(stringSchema()).optional(),
    display_values_supported: array(stringSchema()).optional(),
    claim_types_supported: array(stringSchema()).optional(),
    claims_supported: array(stringSchema()).optional(),
    service_documentation: stringSchema().optional(),
    claims_locales_supported: array(stringSchema()).optional(),
    ui_locales_supported: array(stringSchema()).optional(),
    claims_parameter_supported: booleanSchema().optional(),
    request_parameter_supported: booleanSchema().optional(),
    request_uri_parameter_supported: booleanSchema().optional(),
    require_request_uri_registration: booleanSchema().optional(),
    op_policy_uri: SafeUrlSchema.optional(),
    op_tos_uri: SafeUrlSchema.optional(),
    client_id_metadata_document_supported: booleanSchema().optional(),
  });
  OpenIdProviderDiscoveryMetadataSchema = objectSchema({
    ...OpenIdProviderMetadataSchema.shape,
    ...OAuthMetadataSchema.pick({
      code_challenge_methods_supported: true,
    }).shape,
  });
  OAuthTokensSchema = objectSchema({
    access_token: stringSchema(),
    id_token: stringSchema().optional(),
    token_type: stringSchema(),
    expires_in: coerceNumber().optional(),
    scope: stringSchema().optional(),
    refresh_token: stringSchema().optional(),
  }).strip();
  OAuthErrorResponseSchema = objectSchema({
    error: stringSchema(),
    error_description: stringSchema().optional(),
    error_uri: stringSchema().optional(),
  });
  OptionalSafeUrlSchema = SafeUrlSchema.optional().or(
    literal("").transform(() => {
      return;
    }),
  );
  OAuthClientMetadataSchema = objectSchema({
    redirect_uris: array(SafeUrlSchema),
    token_endpoint_auth_method: stringSchema().optional(),
    grant_types: array(stringSchema()).optional(),
    response_types: array(stringSchema()).optional(),
    client_name: stringSchema().optional(),
    client_uri: SafeUrlSchema.optional(),
    logo_uri: OptionalSafeUrlSchema,
    scope: stringSchema().optional(),
    contacts: array(stringSchema()).optional(),
    tos_uri: OptionalSafeUrlSchema,
    policy_uri: stringSchema().optional(),
    jwks_uri: SafeUrlSchema.optional(),
    jwks: anySchema().optional(),
    software_id: stringSchema().optional(),
    software_version: stringSchema().optional(),
    software_statement: stringSchema().optional(),
  }).strip();
  OAuthClientInformationSchema = objectSchema({
    client_id: stringSchema(),
    client_secret: stringSchema().optional(),
    client_id_issued_at: numberSchema().optional(),
    client_secret_expires_at: numberSchema().optional(),
  }).strip();
  OAuthClientInformationFullSchema = OAuthClientMetadataSchema.merge(OAuthClientInformationSchema);
  OAuthClientRegistrationErrorSchema = objectSchema({
    error: stringSchema(),
    error_description: stringSchema().optional(),
  }).strip();
  OAuthTokenRevocationRequestSchema = objectSchema({
    token: stringSchema(),
    token_type_hint: stringSchema().optional(),
  }).strip();
});
export {
  OAuthTokensSchema,
  OAuthErrorResponseSchema,
  OAuthMetadataSchema,
  OpenIdProviderDiscoveryMetadataSchema,
  OAuthProtectedResourceMetadataSchema,
  OAuthClientInformationFullSchema,
};
