/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sso-oidc/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-ddzww9ex.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../../runtime/bun-runtime.js";

//@ chunk-ddzww9ex.js:1796-3961 cjs-fingerprint
var ae = x(function (se) {
  Object.defineProperty(se, "__esModule", { value: !0 });
  se.ruleSet = void 0;
  var re = "required",
    d = "fn",
    u = "argv",
    y = "ref",
    V = !0,
    B = "isSet",
    P = "booleanEquals",
    m = "error",
    I = "endpoint",
    g = "tree",
    U = "PartitionResult",
    N = "getAttr",
    Y = { [re]: !1, type: "string" },
    W = { [re]: !0, default: !1, type: "boolean" },
    J = { [y]: "Endpoint" },
    oe = { [d]: P, [u]: [{ [y]: "UseFIPS" }, !0] },
    ne = { [d]: P, [u]: [{ [y]: "UseDualStack" }, !0] },
    p = {},
    X = { [d]: N, [u]: [{ [y]: U }, "supportsFIPS"] },
    ie = { [y]: U },
    Q = { [d]: P, [u]: [!0, { [d]: N, [u]: [ie, "supportsDualStack"] }] },
    Z = [oe],
    ee = [ne],
    te = [{ [y]: "Region" }],
    _t = {
      version: "1.0",
      parameters: { Region: Y, UseDualStack: W, UseFIPS: W, Endpoint: Y },
      rules: [
        {
          conditions: [{ [d]: B, [u]: [J] }],
          rules: [
            {
              conditions: Z,
              error: "Invalid Configuration: FIPS and custom endpoint are not supported",
              type: m,
            },
            {
              conditions: ee,
              error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
              type: m,
            },
            { endpoint: { url: J, properties: p, headers: p }, type: I },
          ],
          type: g,
        },
        {
          conditions: [{ [d]: B, [u]: te }],
          rules: [
            {
              conditions: [{ [d]: "aws.partition", [u]: te, assign: U }],
              rules: [
                {
                  conditions: [oe, ne],
                  rules: [
                    {
                      conditions: [{ [d]: P, [u]: [V, X] }, Q],
                      rules: [
                        {
                          endpoint: {
                            url: "https://oidc-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                            properties: p,
                            headers: p,
                          },
                          type: I,
                        },
                      ],
                      type: g,
                    },
                    {
                      error:
                        "FIPS and DualStack are enabled, but this partition does not support one or both",
                      type: m,
                    },
                  ],
                  type: g,
                },
                {
                  conditions: Z,
                  rules: [
                    {
                      conditions: [{ [d]: P, [u]: [X, V] }],
                      rules: [
                        {
                          conditions: [
                            { [d]: "stringEquals", [u]: [{ [d]: N, [u]: [ie, "name"] }, "aws-us-gov"] },
                          ],
                          endpoint: { url: "https://oidc.{Region}.amazonaws.com", properties: p, headers: p },
                          type: I,
                        },
                        {
                          endpoint: {
                            url: "https://oidc-fips.{Region}.{PartitionResult#dnsSuffix}",
                            properties: p,
                            headers: p,
                          },
                          type: I,
                        },
                      ],
                      type: g,
                    },
                    { error: "FIPS is enabled but this partition does not support FIPS", type: m },
                  ],
                  type: g,
                },
                {
                  conditions: ee,
                  rules: [
                    {
                      conditions: [Q],
                      rules: [
                        {
                          endpoint: {
                            url: "https://oidc.{Region}.{PartitionResult#dualStackDnsSuffix}",
                            properties: p,
                            headers: p,
                          },
                          type: I,
                        },
                      ],
                      type: g,
                    },
                    { error: "DualStack is enabled but this partition does not support DualStack", type: m },
                  ],
                  type: g,
                },
                {
                  endpoint: {
                    url: "https://oidc.{Region}.{PartitionResult#dnsSuffix}",
                    properties: p,
                    headers: p,
                  },
                  type: I,
                },
              ],
              type: g,
            },
          ],
          type: g,
        },
        { error: "Invalid Configuration: Missing Region", type: m },
      ],
    };
  se.ruleSet = _t;
});

export { ae };
