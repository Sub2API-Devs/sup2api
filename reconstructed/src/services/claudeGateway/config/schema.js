/**
 * services/claudeGateway/config/schema.ts
 *
 * 2.1.316 新增：网关配置 schema
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: placement 1
 */
import {
  createPrivateKey,
  createPrivateKey as createPrivateKey_2,
  X509Certificate,
  X509Certificate as X509Certificate_2,
} from "crypto";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  create_2,
  create_15,
  create_20,
  create_17,
  strictCreate,
  create_25,
  create_16,
  create,
  create_6,
  create_26,
  zodCoerce,
  create_3,
  create_12,
} from "../../../../vendor/zod/lib/index.mjs";
import { ibe, HTTPS_API_ANTHROPIC_COM } from "../headerPolicy.js";
import { arrayToEnum_2 } from "../../../../vendor/zod/v3/ZodError.js";
import { isAllowedOutboundUrl, parseCidr, isLoopbackUrl } from "../ssrfGuard.js";
import { Qk } from "../bedrockGuardrails.js";
import { hXo } from "../../requestUserDialog.js";
import { B0, x0, j0 } from "../../../../vendor/@modelcontextprotocol/client/dist/src-CeKsbNLO.mjs";
import { validateResourceLabel } from "../telemetry/resourceAttributes.js";
import { r1 } from "./managedPolicies.js";
import { validateGoogleAuthTarget } from "../telemetry/googleAuth.js";
import { AE } from "../models.js";

//@ chunk-1ny7cxrt.js:1388260-1413048 placement
var GATEWAY_HEADER_NAME_REGEX = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/,
  sbe = /^[\x20-\x7e]+$/,
  Bz =
    "models on an upstream needs at least one entry: the only models to send to this upstream, named as clients send them, for example models: [claude-opus-4-8]. Remove the key to send it every model.",
  L0 =
    "groups on an upstream must be a list of IdP group names, none empty, for example groups: [team-a]. Only developers in one of them are sent to this upstream. Remove the key to serve everyone.",
  Hz =
    "a mantle upstream needs a models list: the models your AWS account has on Mantle, named as clients send them, for example models: [claude-opus-4-7, claude-haiku-4-5]. Only these go to this upstream.",
  Yz = DoctorLazy(() => {
    let optional = create_2().optional(),
      optional_2 = create_15(create_2().min(1), { invalid_type_error: Bz })
        .min(1, { message: Bz })
        .optional(),
      optional_3 = create_15(create_2().min(1, L0), { invalid_type_error: L0 }).min(1, L0).optional(),
      regex = create_2()
        .min(1)
        .regex(/^[\x21-\x7e]+$/, "must be a valid header value"),
      optional_4 = create_20(create_2())
        .superRefine((l, c) => {
          let u = new Set();
          for (let [f, h] of Object.entries(l)) {
            let lower = f.toLowerCase(),
              y = !GATEWAY_HEADER_NAME_REGEX.test(f)
                ? "is not a valid HTTP header name"
                : u.has(lower)
                  ? "is listed twice (header names ignore case)"
                  : ibe(lower)
                    ? "is reserved (the gateway or the provider's SDK sets or signs it). Remove it from this upstream's headers."
                    : !sbe.test(h) || h !== h.trim()
                      ? "has an empty or invalid value: use printable ASCII with no space at either end (if it comes from a ${VAR}, check that variable's value)"
                      : void 0;
            if ((u.add(lower), y))
              c.addIssue({ code: arrayToEnum_2.custom, path: [f], message: `header '${f}' ${y}` });
          }
        })
        .optional(),
      s = create_17("provider", [
        strictCreate({
          name: optional,
          headers: optional_4,
          groups: optional_3,
          models: optional_2,
          provider: create_25("anthropic"),
          base_url: create_2()
            .default(HTTPS_API_ANTHROPIC_COM)
            .refine(isAllowedOutboundUrl, { message: "base_url targets a metadata endpoint" }),
          auth: create_16([
            create({ api_key: create_2().min(1) }).strict(),
            create({ oauth_token: create_2().min(1) }).strict(),
            create({
              federation_rule_id: create_2().min(1),
              organization_id: create_2().min(1),
              identity_token_file: create_2().min(1),
              service_account_id: create_2().optional(),
              workspace_id: create_2().optional(),
            }).strict(),
          ]),
          forward_user_identity: create_6().optional(),
        }),
        strictCreate({
          name: optional,
          headers: optional_4,
          groups: optional_3,
          models: optional_2,
          provider: create_25("bedrock"),
          region: create_2().min(1),
          guardrail: strictCreate({
            id: regex,
            version: regex,
            input_tagging: create_26(Qk).optional(),
          }).optional(),
          guardrail_trace: create_6().optional(),
          base_url: create_2()
            .optional()
            .refine((l) => l === void 0 || isAllowedOutboundUrl(l), {
              message: "base_url targets a metadata endpoint",
            }),
          auth: strictCreate({
            aws_access_key_id: create_2().min(1).optional(),
            aws_secret_access_key: create_2().min(1).optional(),
            aws_session_token: create_2().min(1).optional(),
            aws_bearer_token: create_2().min(1).optional(),
          })
            .default({})
            .refine((l) => !l.aws_access_key_id === !l.aws_secret_access_key, {
              message: "aws_access_key_id and aws_secret_access_key must be set together",
            })
            .refine((l) => !l.aws_session_token || !!l.aws_access_key_id, {
              message: "aws_session_token requires aws_access_key_id and aws_secret_access_key",
            }),
          assume_role: strictCreate({
            role_arn: create_2().regex(
              /^arn:aws(-us-gov)?:iam::\d{12}:role\/[\w+=,.@\/-]+$/,
              "must be an IAM role ARN (arn:aws:iam::<account>:role/<name>)",
            ),
            external_id: create_2()
              .regex(
                /^[\w+=,.@:\/-]{2,1224}$/,
                "must be 2 to 1224 characters of letters, digits and _+=,.@:/-",
              )
              .optional(),
            session_name: create_26(["email", "sub"]).optional(),
          }).optional(),
        }),
        strictCreate({
          name: optional,
          headers: optional_4,
          groups: optional_3,
          provider: create_25("mantle"),
          region: create_2().regex(/^[a-z0-9-]+$/, "must be an AWS region (lowercase alnum + hyphens)"),
          base_url: create_2()
            .optional()
            .refine((l) => l === void 0 || isAllowedOutboundUrl(l), {
              message: "base_url targets a metadata endpoint",
            }),
          models: create_15(create_2().min(1), { required_error: Hz, invalid_type_error: Hz }).min(1, {
            message:
              "a mantle upstream needs at least one entry in models: list the models your AWS account has on Mantle, named as clients send them.",
          }),
          auth: strictCreate({
            aws_access_key_id: create_2().min(1).optional(),
            aws_secret_access_key: create_2().min(1).optional(),
            aws_session_token: create_2().min(1).optional(),
            aws_bearer_token: create_2().min(1).optional(),
          })
            .default({})
            .refine((l) => !l.aws_access_key_id === !l.aws_secret_access_key, {
              message: "aws_access_key_id and aws_secret_access_key must be set together",
            })
            .refine((l) => !l.aws_session_token || !!l.aws_access_key_id, {
              message: "aws_session_token requires aws_access_key_id and aws_secret_access_key",
            }),
        }),
        strictCreate({
          name: optional,
          headers: optional_4,
          groups: optional_3,
          models: optional_2,
          provider: create_25("anthropicAws"),
          region: create_2().regex(/^[a-z0-9-]+$/, "must be an AWS region (lowercase alnum + hyphens)"),
          workspace_id: regex,
          base_url: create_2()
            .optional()
            .refine((l) => l === void 0 || isAllowedOutboundUrl(l), {
              message: "base_url targets a metadata endpoint",
            }),
          auth: strictCreate({
            api_key: create_2().min(1).optional(),
            aws_access_key_id: create_2().min(1).optional(),
            aws_secret_access_key: create_2().min(1).optional(),
            aws_session_token: create_2().min(1).optional(),
          })
            .default({})
            .refine((l) => !l.aws_access_key_id === !l.aws_secret_access_key, {
              message: "aws_access_key_id and aws_secret_access_key must be set together",
            })
            .refine((l) => !l.aws_session_token || !!l.aws_access_key_id, {
              message: "aws_session_token requires aws_access_key_id and aws_secret_access_key",
            }),
        }),
        strictCreate({
          name: optional,
          headers: optional_4,
          groups: optional_3,
          models: optional_2,
          provider: create_25("anthropicGoogleCloud"),
          project_id: create_2().regex(/^[A-Za-z0-9_-]+$/, "must be a GCP project id"),
          workspace_id: create_2().regex(/^[A-Za-z0-9_-]+$/, "must be a workspace id"),
          location: create_2()
            .regex(/^[A-Za-z0-9_-]+$/, "must be a GCP location")
            .default("global"),
          base_url: create_2()
            .optional()
            .refine((l) => l === void 0 || isAllowedOutboundUrl(l), {
              message: "base_url targets a metadata endpoint",
            }),
          auth: strictCreate({
            service_account_json: create_2().min(1).optional(),
            access_token: create_2().min(1).optional(),
          }).default({}),
        }),
        strictCreate({
          name: optional,
          headers: optional_4,
          groups: optional_3,
          models: optional_2,
          provider: create_25("vertex"),
          region: create_2().min(1),
          project_id: create_2().min(1),
          base_url: create_2()
            .optional()
            .refine((l) => l === void 0 || isAllowedOutboundUrl(l), {
              message: "base_url targets a metadata endpoint",
            }),
          auth: strictCreate({
            service_account_json: create_2().optional(),
            access_token: create_2().optional(),
          }).default({}),
        }),
        strictCreate({
          name: optional,
          headers: optional_4,
          groups: optional_3,
          models: optional_2,
          provider: create_25("foundry"),
          resource: create_2().regex(
            hXo,
            "must be 2-64 letters, digits or hyphens, not starting or ending with a hyphen",
          ),
          base_url: create_2()
            .optional()
            .refine((l) => l === void 0 || isAllowedOutboundUrl(l), {
              message: "base_url targets a metadata endpoint",
            }),
          auth: create_16([
            strictCreate({ api_key: create_2().min(1) }),
            strictCreate({ use_azure_ad: create_25(!0) }),
          ]),
        }),
      ]),
      refine = create_2().refine(
        (l) => {
          try {
            return (parseCidr(l), !0);
          } catch {
            return !1;
          }
        },
        { message: "must be a valid IP or CIDR" },
      );
    return strictCreate({
      $schema: create_2().optional(),
      listen: strictCreate({
        host: create_2().default("0.0.0.0"),
        port: zodCoerce.number().default(8080),
        tls: strictCreate({ cert: create_2(), key: create_2() }).optional(),
        public_url: create_2()
          .url()
          .transform((l) => l.replace(/\/$/, ""))
          .optional(),
        trusted_proxies: create_15(refine).default([]),
      }).refine((l) => l.public_url !== void 0 || B0(l.host), {
        path: ["public_url"],
        message:
          "listen.public_url is required when listen.host is not a " +
          "loopback address \u2014 set it to the externally-visible origin " +
          "(e.g. https://claude-gateway.corp.example.com). Without it the IdP redirect_uri and token issuer would be derived from the client-controlled Host header.",
      }),
      access_control: strictCreate({
        allow_cidrs: create_15(refine).default([]),
        deny_cidrs: create_15(refine).default([]),
      }).default({}),
      limits: strictCreate({
        max_request_bytes: zodCoerce.number().int().positive().default(33554432),
        max_request_header_bytes: zodCoerce.number().int().positive().optional(),
        max_url_length: zodCoerce.number().int().positive().optional(),
      }).default({}),
      rate_limits: strictCreate({
        device_authorization: strictCreate({
          max: zodCoerce.number().int().positive().default(30),
          window_seconds: zodCoerce.number().int().positive().default(600),
        }).default({}),
        device_verify: strictCreate({
          max: zodCoerce.number().int().positive().default(10),
          window_seconds: zodCoerce.number().int().positive().default(600),
        }).default({}),
      }).default({}),
      timeouts: strictCreate({ upstream_ttfb_ms: zodCoerce.number().int().positive().optional() })
        .default({})
        .transform((l) =>
          l.upstream_ttfb_ms === void 0
            ? { upstream_ttfb_ms: 120000 }
            : { upstream_ttfb_ms: l.upstream_ttfb_ms, operator_set: !0 },
        ),
      upstreams: create_15(s)
        .min(1)
        .transform((l) => l.map((c) => ({ ...c, name: c.name ?? c.provider })))
        .superRefine((l, c) => {
          let u = new Set();
          for (let h of l) {
            if (u.has(h.name))
              c.addIssue({
                code: arrayToEnum_2.custom,
                message: `duplicate upstream name '${h.name}' \u2014 set distinct 'name:' on each`,
              });
            if ((u.add(h.name), h.provider === "bedrock" && h.assume_role && h.auth.aws_bearer_token))
              c.addIssue({
                code: arrayToEnum_2.custom,
                message: `upstream '${h.name}': assume_role needs SigV4 source credentials (access keys or the ambient AWS chain, auth: {}); aws_bearer_token cannot call sts:AssumeRole`,
              });
            let m =
              h.provider === "anthropic" && h.forward_user_identity && URL.canParse(h.base_url)
                ? new URL(h.base_url).hostname.replace(/\.$/, "")
                : "";
            if (
              m === "anthropic.com" ||
              m.endsWith(".anthropic.com") ||
              /^aws-external-anthropic\.[^.]+\.api\.aws$/.test(m) ||
              m === "claude.googleapis.com"
            )
              c.addIssue({
                code: arrayToEnum_2.custom,
                message: `upstream '${h.name}': forward_user_identity is for identifying users to a proxy you run at base_url; it is refused for ${m} so user emails are never sent to Anthropic`,
              });
          }
          let filtered = l.filter((h) => h.provider === "bedrock");
          if (filtered.some((h) => h.guardrail) && !filtered.every((h) => h.guardrail))
            c.addIssue({
              code: arrayToEnum_2.custom,
              message:
                "set guardrail: on all bedrock upstreams or none \u2014 failover could otherwise send requests to a bedrock upstream without the guardrail",
            });
          if (new Set(filtered.map((h) => h.guardrail?.input_tagging)).size > 1)
            c.addIssue({
              code: arrayToEnum_2.custom,
              message:
                "set the same guardrail.input_tagging on all bedrock upstreams \u2014 failover could otherwise send requests to a bedrock upstream that tags them differently",
            });
          if (filtered.some((h) => h.guardrail) && l.some((h) => h.provider === "mantle"))
            c.addIssue({
              code: arrayToEnum_2.custom,
              message:
                "a mantle upstream cannot be used beside a bedrock upstream that has a guardrail, because the gateway applies no guardrail to requests it sends to Mantle. Remove every mantle upstream, or remove the guardrail from every bedrock upstream.",
            });
        }),
      auto_include_builtin_models: create_6().default(!0),
      models: create_15(
        strictCreate({
          id: create_2().min(1),
          label: create_2().optional(),
          description: create_2().optional(),
          upstream_model: create_20(create_2()).refine((l) => Object.keys(l).length > 0, {
            message: "upstream_model must set at least one upstream",
          }),
        }),
      ).default([]),
      oidc: strictCreate({
        issuer: create_2().refine(isAllowedOutboundUrl, {
          message: "oidc.issuer must be an http(s) URL and not target a cloud metadata endpoint",
        }),
        client_id: create_2().min(1),
        client_secret: create_2().min(1).optional(),
        client_assertion: strictCreate({
          private_key_pem: create_2().min(1),
          certificate_pem: create_2().min(1),
        }).optional(),
        ca_cert_pem: create_2().optional(),
        groups_claim: create_2().min(1).default("groups"),
        email_claim: create_16([create_2().min(1), create_15(create_2().min(1)).min(1)]).default("email"),
        user_id_claim: create_2().min(1).optional(),
        userinfo_fallback: create_6().default(!1),
        use_pkce: create_6().default(!0),
        clock_skew_seconds: zodCoerce.number().int().nonnegative().optional(),
        token_endpoint_auth_method: create_26([
          "client_secret_basic",
          "client_secret_post",
          "private_key_jwt",
        ]).optional(),
        id_token_signed_response_alg: create_26([
          "RS256",
          "RS384",
          "RS512",
          "PS256",
          "PS384",
          "PS512",
          "ES256",
          "ES384",
          "ES512",
          "EdDSA",
        ]).optional(),
        additional_authorized_parties: create_15(create_2()).optional(),
        discovery_url: create_2()
          .url()
          .refine(isAllowedOutboundUrl, {
            message: "oidc.discovery_url must be an http(s) URL and not target a cloud metadata endpoint",
          })
          .refine(
            (l) => {
              try {
                return new URL(l).pathname.includes("/.well-known/");
              } catch {
                return !1;
              }
            },
            {
              message:
                "oidc.discovery_url must point at the discovery document itself (path containing /.well-known/) \u2014 openid-client appends /.well-known/openid-configuration to any other path",
            },
          )
          .optional(),
        use_proxy: create_6().optional(),
        scopes: create_15(
          create_2()
            .trim()
            .min(1)
            .refine((l) => !/\s/.test(l), { message: "must be a single OAuth scope token (no whitespace)" }),
        )
          .optional()
          .refine((l) => l === void 0 || l.includes("openid"), {
            message:
              "oidc.scopes must include 'openid' \u2014 without it the IdP will not return an id_token",
          }),
        scope_on_refresh: create_6().default(!1),
        extra_auth_params: create_20(create_2().min(1), create_2())
          .default({})
          .refine(
            (l) =>
              !Object.keys(l).some((c) =>
                [
                  "redirect_uri",
                  "state",
                  "nonce",
                  "code_challenge",
                  "code_challenge_method",
                  "scope",
                  "response_type",
                  "response_mode",
                  "client_id",
                ].includes(c),
              ),
            {
              message:
                "oidc.extra_auth_params must not override protocol parameters the gateway manages (redirect_uri, state, nonce, code_challenge*, scope, response_type, response_mode, client_id) \u2014 use oidc.scopes for scope; the gateway callback only reads query-mode responses",
            },
          ),
        allowed_email_domains: create_15(create_2())
          .transform((l, c) => {
            let filtered = l.map((f) => f.trim().replace(/^@/, "").toLowerCase()).filter(Boolean);
            if (l.length > 0 && filtered.length === 0)
              c.addIssue({
                code: arrayToEnum_2.custom,
                message: "allowed_email_domains contains only empty entries after normalization",
              });
            return filtered;
          })
          .optional(),
        form_action_origins: create_15(
          create_2().refine(isAllowedOutboundUrl, {
            message:
              "each form_action_origin must be an http(s) URL and not target a cloud metadata endpoint",
          }),
        )
          .transform((l) => l.map((c) => new URL(c).origin))
          .refine((l) => l.every((c) => !/[;,'"\s]/.test(c)), {
            message:
              "oidc.form_action_origins entries must not contain CSP delimiters (; , quotes or whitespace)",
          })
          .default([]),
        allowed_groups: create_15(create_2())
          .refine((l) => !l.length || l.some((c) => c.trim()), {
            message: "oidc.allowed_groups contains only empty entries",
          })
          .transform((l) => l.map((c) => c.trim()).filter(Boolean))
          .optional(),
        google_groups: strictCreate({
          service_account_json_path: create_2().min(1),
          admin_email: create_2().email(),
        }).optional(),
      })
        .superRefine((l, c) => {
          if (l.token_endpoint_auth_method !== "private_key_jwt") {
            if (l.client_secret === void 0)
              c.addIssue({
                code: arrayToEnum_2.custom,
                path: ["client_secret"],
                message:
                  "oidc.client_secret is required \u2014 or, if your IdP issues certificates instead of secrets (for example Microsoft Entra certificate credentials), set token_endpoint_auth_method: private_key_jwt with a client_assertion block",
              });
            if (l.client_assertion !== void 0)
              c.addIssue({
                code: arrayToEnum_2.custom,
                path: ["client_assertion"],
                message:
                  "oidc.client_assertion is only used with token_endpoint_auth_method: private_key_jwt \u2014 set that and remove client_secret, or remove this block",
              });
            return;
          }
          if (l.client_secret !== void 0)
            c.addIssue({
              code: arrayToEnum_2.custom,
              path: ["client_secret"],
              message:
                "oidc.client_secret must be removed when token_endpoint_auth_method is private_key_jwt \u2014 the gateway authenticates to the IdP with the client_assertion certificate instead",
            });
          if (l.client_assertion === void 0) {
            c.addIssue({
              code: arrayToEnum_2.custom,
              path: ["client_assertion"],
              message:
                "oidc.client_assertion is required when token_endpoint_auth_method is private_key_jwt: private_key_pem (the key the gateway signs with) and certificate_pem (the certificate you uploaded to the IdP)",
            });
            return;
          }
          let { private_key_pem: private_key_pem, certificate_pem: certificate_pem } = l.client_assertion;
          if (private_key_pem.includes("ENCRYPTED")) {
            c.addIssue({
              code: arrayToEnum_2.custom,
              path: ["client_assertion", "private_key_pem"],
              message:
                "oidc.client_assertion.private_key_pem is encrypted with a passphrase; the gateway needs the key as an unencrypted PEM file",
            });
            return;
          }
          let h;
          try {
            h = createPrivateKey_2(private_key_pem);
          } catch {
            c.addIssue({
              code: arrayToEnum_2.custom,
              path: ["client_assertion", "private_key_pem"],
              message:
                'oidc.client_assertion.private_key_pem is not a PEM private key the gateway can read \u2014 expected a key beginning with "-----BEGIN PRIVATE KEY-----" (PKCS#8) or "-----BEGIN RSA PRIVATE KEY-----" (PKCS#1)',
            });
            return;
          }
          if (h.asymmetricKeyType !== "rsa") {
            c.addIssue({
              code: arrayToEnum_2.custom,
              path: ["client_assertion", "private_key_pem"],
              message: `oidc.client_assertion.private_key_pem must be an RSA key (the client assertion is signed with RS256); got ${h.asymmetricKeyType}`,
            });
            return;
          }
          let m = h.asymmetricKeyDetails?.modulusLength ?? 0;
          if (m < 2048) {
            c.addIssue({
              code: arrayToEnum_2.custom,
              path: ["client_assertion", "private_key_pem"],
              message: `oidc.client_assertion.private_key_pem must be an RSA key of at least 2048 bits; got ${m}`,
            });
            return;
          }
          if (certificate_pem.split("-----BEGIN CERTIFICATE-----").length > 2) {
            c.addIssue({
              code: arrayToEnum_2.custom,
              path: ["client_assertion", "certificate_pem"],
              message:
                "oidc.client_assertion.certificate_pem must contain only the client certificate, not a chain \u2014 keep the one certificate issued for private_key_pem (with openssl pkcs12, add -clcerts)",
            });
            return;
          }
          let y;
          try {
            y = new X509Certificate_2(certificate_pem);
          } catch {
            c.addIssue({
              code: arrayToEnum_2.custom,
              path: ["client_assertion", "certificate_pem"],
              message:
                'oidc.client_assertion.certificate_pem is not a PEM certificate the gateway can read \u2014 expected one beginning with "-----BEGIN CERTIFICATE-----"',
            });
            return;
          }
          if (!y.checkPrivateKey(h))
            c.addIssue({
              code: arrayToEnum_2.custom,
              path: ["client_assertion", "certificate_pem"],
              message:
                "oidc.client_assertion.certificate_pem does not match private_key_pem \u2014 use the certificate that was issued for this key",
            });
        })
        .optional(),
      session: strictCreate({
        jwt_secret: create_16([create_2().min(32), create_15(create_2().min(32)).min(1)]).transform((l) =>
          Array.isArray(l) ? l : [l],
        ),
        ttl_hours: zodCoerce.number().default(1),
      }),
      store: strictCreate({
        postgres_url: create_2().regex(/^postgres(ql)?:\/\//, "must be postgres:// or postgresql://"),
        username: create_2().optional(),
        password: create_2().optional(),
        max_connections: zodCoerce.number().int().positive().default(5),
        connect_timeout_seconds: zodCoerce.number().int().min(1).max(60).default(5),
        readiness_grace_seconds: create_16([
          create_3(),
          create_2().regex(/^\d+$/, "must be a whole number of seconds").transform(Number),
        ])
          .pipe(create_3().int().min(0).max(3600))
          .default(0),
      }),
      telemetry: strictCreate({
        forward_to: create_15(
          strictCreate({
            url: create_2()
              .refine(x0, { message: "forward_to.url must be https:// (http:// allowed for loopback only)" })
              .refine((l) => isLoopbackUrl(l) || isAllowedOutboundUrl(l), {
                message: "forward_to.url must not target a cloud metadata endpoint",
              })
              .refine((l) => !isLoopbackUrl(l) || isAllowedOutboundUrl(l), {
                message:
                  "forward_to.url is a loopback address, which the gateway blocks by default; set CLAUDE_GATEWAY_ALLOW_LOOPBACK=1 in the gateway environment to allow a sidecar collector",
              }),
            headers: create_20(create_2()).default({}),
            auth: strictCreate({
              google: strictCreate({ service_account_json: create_2().min(1).optional() }),
            }).optional(),
            metrics: create_6().default(!0),
            logs: create_6().default(!1),
            traces: create_6().default(!1),
          }),
        ).default([]),
        resource_attributes: create_20(create_2())
          .superRefine((l, c) => {
            for (let [u, f] of Object.entries(l)) {
              let h = validateResourceLabel(u, f);
              if (h) c.addIssue({ code: arrayToEnum_2.custom, path: [u], message: h });
            }
          })
          .optional(),
      }).default({ forward_to: [] }),
      managed: strictCreate({
        settings: create_2().optional(),
        policy_mode: create_26(["first_match", "layered"]).optional(),
        policies: create_15(
          create({
            match: strictCreate({
              groups: create_15(
                create_2().min(
                  1,
                  "match.groups contains an empty entry \u2014 set a group name or remove the entry",
                ),
              )
                .min(
                  1,
                  "match.groups is empty \u2014 the policy would match no one (and is not a catch-all); list groups or remove the key",
                )
                .optional(),
              email_domain: create_2()
                .min(
                  1,
                  "match.email_domain is empty \u2014 an empty domain disables the match and the policy would apply to every authenticated user; set a domain or remove the key",
                )
                .transform((l) => l.trim().replace(/^@/, "").toLowerCase())
                .refine((l) => l.length > 0, {
                  message:
                    "match.email_domain is blank after normalization \u2014 set a domain or remove the key",
                })
                .refine((l) => !/[@\s,]/.test(l), {
                  message:
                    'match.email_domain contains "@", whitespace, or "," \u2014 write one bare domain (e.g. acme.com, not a full email address or a list); the matcher compares a single domain exactly',
                })
                .optional(),
            }).default({}),
            code: create_20(create_12()).optional(),
            cli: create_20(create_12()).optional(),
            settings: create_20(create_12()).optional(),
            desktop: create_20(create_12()).optional(),
            serve_to_desktop: create_6().optional(),
          }).strict(),
        )
          .superRefine((l, c) => {
            if (!l.some((u) => u.code)) return;
            for (let [u, f] of l.entries())
              for (let h of ["cli", "settings"])
                if (f[h])
                  c.addIssue({
                    code: arrayToEnum_2.custom,
                    path: [u, h],
                    message: f.code
                      ? `this policy has a \`code\` block and a \`${h}\` block. Put all its settings into the one \`code\` block`
                      : `this file has a \`code\` block, so this \`${h}\` block's rules would not reach Claude Desktop's Code tab. Write every block under \`code\`, or every block under \`cli\` (terminal Claude Code only). See "Choose cli or code" in the gateway configuration docs`,
                  });
          })
          .transform((l) =>
            l.map(
              ({
                match: match,
                code: code,
                cli: cli,
                settings: settings,
                desktop: desktop,
                serve_to_desktop: serve_to_desktop,
              }) => ({
                match: match,
                cli: code ?? cli ?? settings ?? {},
                desktop: desktop,
                serve_to_desktop: serve_to_desktop,
                ...(l.some((b) => b.code) && { underCode: !0 }),
              }),
            ),
          )
          .optional(),
      }).optional(),
      admin: strictCreate({
        read_keys: create_15(strictCreate({ id: create_2(), key: create_2().min(32) })).default([]),
        write_keys: create_15(strictCreate({ id: create_2(), key: create_2().min(32) })).default([]),
        admin_groups: create_15(
          create_2().min(
            1,
            "admin.admin_groups contains an empty entry \u2014 an empty entry can pair with an empty IdP group claim and grant admin access; set a group name or remove the entry",
          ),
        ).default([]),
        blocked_message: create_2().optional(),
        audit_retention_days: zodCoerce.number().int().positive().default(365),
        spend_retention_months: zodCoerce.number().int().positive().default(13),
        identity_retention_days: zodCoerce.number().int().positive().default(90),
        group_limit_mode: create_26(["min", "max"]).default("min"),
      })
        .superRefine((l, c) => {
          let mapped = [...l.read_keys, ...l.write_keys].map((h) => h.id),
            found = mapped.find((h, m) => mapped.indexOf(h) !== m);
          if (found)
            c.addIssue({
              code: arrayToEnum_2.custom,
              message: `admin key id '${found}' is repeated; key ids must be unique for audit attribution`,
            });
        })
        .optional(),
      enforcement: strictCreate({ fail_closed_on_error: create_6().default(!1) }).default({
        fail_closed_on_error: !1,
      }),
      load_test_mode: strictCreate({
        enabled: create_6(),
        reply_tokens: create_3().int().min(1).max(1e5).default(750),
        reply_seconds: create_3().min(0).max(600).default(9.5),
      }).optional(),
      cri: strictCreate({
        enabled: create_6().default(!1),
        audience: create_15(create_2().trim().min(1)).default([]),
        jwks_url: create_2()
          .optional()
          .refine((l) => l === void 0 || isLoopbackUrl(l), {
            message:
              "cri.jwks_url must be a loopback URL \u2014 it exists for tests against local mocks, and honoring an external URL here would let it substitute the admission authority (its keys would mint CRI principals); remove it to use the pinned Anthropic JWKS",
          })
          .refine(j0, {
            message:
              "cri.jwks_url targets loopback but CLAUDE_GATEWAY_ALLOW_LOOPBACK is not set \u2014 safeFetch would block every JWKS fetch at runtime, so as configured the CRI wall could never admit anyone",
          }),
        issuer: create_2()
          .refine(x0, {
            message:
              "cri.issuer must be https:// (http:// allowed for loopback only) \u2014 the verification JWKS derives from it",
          })
          .refine((l) => isLoopbackUrl(l) || isAllowedOutboundUrl(l), {
            message: "cri.issuer must not target a cloud metadata endpoint",
          })
          .refine(j0, {
            message:
              "cri.issuer targets loopback but CLAUDE_GATEWAY_ALLOW_LOOPBACK is not set \u2014 safeFetch would block every derived-JWKS fetch at runtime, so as configured the CRI wall could never admit anyone",
          })
          .refine(
            (l) => {
              try {
                return new URL(l).href === l && !l.includes("?") && !l.includes("#");
              } catch {
                return !1;
              }
            },
            {
              message:
                "cri.issuer must be a canonical URL with no query or fragment \u2014 the iss pin and the {issuer}/jwks.json derivation both use the exact configured string",
            },
          )
          .refine((l) => !l.endsWith("/"), {
            message:
              "cri.issuer must not end with '/' \u2014 the gateway pins the token's iss claim to this exact string and derives the verification JWKS URL as {issuer}/jwks.json",
          })
          .optional(),
        org_allowlist: create_15(
          create_2()
            .trim()
            .min(1)
            .transform((l) => l.toLowerCase()),
        ).default([]),
        policy: strictCreate({
          webhook: strictCreate({
            url: create_2()
              .refine(x0, {
                message: "cri.policy.webhook.url must be https:// (http:// allowed for loopback only)",
              })
              .refine((l) => isLoopbackUrl(l) || isAllowedOutboundUrl(l), {
                message: "cri.policy.webhook.url must not target a cloud metadata endpoint",
              })
              .refine(j0, {
                message:
                  "cri.policy.webhook.url targets loopback, which the gateway blocks at runtime unless CLAUDE_GATEWAY_ALLOW_LOOPBACK=1 is set \u2014 as configured, the policy webhook could never run",
              }),
            timeout_ms: zodCoerce.number().int().positive().max(30000).default(2000),
            fail_closed: create_6().default(!0),
          }),
        }).optional(),
      }).optional(),
      pricing: strictCreate({
        multiplier: zodCoerce.number().gt(0).lte(10).default(1),
        overrides: create_15(
          strictCreate({
            upstream: create_2().min(1),
            model: create_2().min(1),
            input: zodCoerce.number().positive().max(1e4),
            output: zodCoerce.number().positive().max(1e4),
            cache_read: zodCoerce.number().positive().max(1e4),
            cache_write: zodCoerce.number().positive().max(1e4),
          }),
        ).default([]),
      }).optional(),
    }).superRefine((l, c) => {
      if (l.enforcement.fail_closed_on_error && l.admin === void 0)
        c.addIssue({
          code: arrayToEnum_2.custom,
          path: ["enforcement", "fail_closed_on_error"],
          message:
            "has no effect without an `admin:` block \u2014 spend enforcement only runs when admin is configured",
        });
      let u = new Set(l.upstreams.map((upstream) => upstream.name));
      for (let [m, y] of l.models.entries())
        for (let b of Object.keys(y.upstream_model))
          if (!u.has(b))
            c.addIssue({
              code: arrayToEnum_2.custom,
              path: ["models", m, "upstream_model", b],
              message: `references unknown upstream '${b}'`,
            });
      let f = l.cri?.enabled === !0;
      if (f && (l.cri?.audience.length ?? 0) === 0)
        c.addIssue({
          code: arrayToEnum_2.custom,
          path: ["cri", "audience"],
          message:
            "cri.audience must list at least one registered audience value when cri.enabled is true \u2014 the audience binding is what stops a CRI JWT minted for another org's gateway from replaying here, so a wall with no expected audience would admit no one",
        });
      if (f && (l.cri?.org_allowlist.length ?? 0) === 0)
        c.addIssue({
          code: arrayToEnum_2.custom,
          path: ["cri", "org_allowlist"],
          message:
            "cri.org_allowlist must list at least one Claude Enterprise organization UUID when cri.enabled is true \u2014 an empty allowlist would admit no one",
        });
      if (l.oidc === void 0 && !f)
        c.addIssue({
          code: arrayToEnum_2.custom,
          path: ["oidc"],
          message:
            "oidc is required \u2014 it may be omitted only for a customer-routed-inference-only deployment (cri.enabled: true)",
        });
      if (l.pricing !== void 0 && l.admin === void 0 && !r1(l.managed))
        c.addIssue({
          code: arrayToEnum_2.custom,
          path: ["pricing"],
          message:
            "has no effect without an `admin:` block or a `managed:` block with at least one policy \u2014 the spend meter (admin) and the modelPricing pushed to clients (managed) are the only readers",
        });
      for (let [m, y] of l.telemetry.forward_to.entries()) {
        if (!y.auth) continue;
        for (let b of validateGoogleAuthTarget(y.url, y.headers))
          c.addIssue({
            code: arrayToEnum_2.custom,
            path: ["telemetry", "forward_to", m, "auth", "google"],
            message: b,
          });
      }
      let h = l.pricing?.overrides ?? [];
      for (let [m, y] of h.entries()) {
        if (!u.has(y.upstream))
          c.addIssue({
            code: arrayToEnum_2.custom,
            path: ["pricing", "overrides", m, "upstream"],
            message: `references unknown upstream '${y.upstream}'`,
          });
        let found = h.slice(0, m).find((w) => w.upstream === y.upstream && AE(w.model, y.model));
        if (found)
          c.addIssue({
            code: arrayToEnum_2.custom,
            path: ["pricing", "overrides", m],
            message: `duplicates the pricing override for '${found.model}' on upstream '${y.upstream}'`,
          });
      }
    });
  });

export { Yz };
