/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/signin/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-y366fgzk.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../../runtime/bun-runtime.js";

//@ chunk-y366fgzk.js:1795-4373 cjs-fingerprint
var de = x(function (ue) {
  Object.defineProperty(ue, "__esModule", { value: !0 });
  ue.ruleSet = void 0;
  var ae = "required",
    o = "fn",
    s = "argv",
    l = "ref",
    Z = !0,
    ee = "isSet",
    E = "booleanEquals",
    f = "error",
    h = "endpoint",
    p = "tree",
    I = "PartitionResult",
    F = "stringEquals",
    te = { [ae]: !0, default: !1, type: "boolean" },
    re = { [ae]: !1, type: "string" },
    ne = { [l]: "Endpoint" },
    M = { [o]: E, [s]: [{ [l]: "UseFIPS" }, !0] },
    j = { [o]: E, [s]: [{ [l]: "UseDualStack" }, !0] },
    n = {},
    V = { [o]: "getAttr", [s]: [{ [l]: I }, "name"] },
    C = { [o]: E, [s]: [{ [l]: "UseFIPS" }, !1] },
    R = { [o]: E, [s]: [{ [l]: "UseDualStack" }, !1] },
    oe = { [o]: "getAttr", [s]: [{ [l]: I }, "supportsFIPS"] },
    se = { [o]: E, [s]: [!0, { [o]: "getAttr", [s]: [{ [l]: I }, "supportsDualStack"] }] },
    ie = [{ [l]: "Region" }],
    St = {
      version: "1.0",
      parameters: { UseDualStack: te, UseFIPS: te, Endpoint: re, Region: re },
      rules: [
        {
          conditions: [{ [o]: ee, [s]: [ne] }],
          rules: [
            {
              conditions: [M],
              error: "Invalid Configuration: FIPS and custom endpoint are not supported",
              type: f,
            },
            {
              rules: [
                {
                  conditions: [j],
                  error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
                  type: f,
                },
                { endpoint: { url: ne, properties: n, headers: n }, type: h },
              ],
              type: p,
            },
          ],
          type: p,
        },
        {
          rules: [
            {
              conditions: [{ [o]: ee, [s]: ie }],
              rules: [
                {
                  conditions: [{ [o]: "aws.partition", [s]: ie, assign: I }],
                  rules: [
                    {
                      conditions: [{ [o]: F, [s]: [V, "aws"] }, C, R],
                      endpoint: { url: "https://{Region}.signin.aws.amazon.com", properties: n, headers: n },
                      type: h,
                    },
                    {
                      conditions: [{ [o]: F, [s]: [V, "aws-cn"] }, C, R],
                      endpoint: { url: "https://{Region}.signin.amazonaws.cn", properties: n, headers: n },
                      type: h,
                    },
                    {
                      conditions: [{ [o]: F, [s]: [V, "aws-us-gov"] }, C, R],
                      endpoint: {
                        url: "https://{Region}.signin.amazonaws-us-gov.com",
                        properties: n,
                        headers: n,
                      },
                      type: h,
                    },
                    {
                      conditions: [M, j],
                      rules: [
                        {
                          conditions: [{ [o]: E, [s]: [Z, oe] }, se],
                          rules: [
                            {
                              endpoint: {
                                url: "https://signin-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                                properties: n,
                                headers: n,
                              },
                              type: h,
                            },
                          ],
                          type: p,
                        },
                        {
                          error:
                            "FIPS and DualStack are enabled, but this partition does not support one or both",
                          type: f,
                        },
                      ],
                      type: p,
                    },
                    {
                      conditions: [M, R],
                      rules: [
                        {
                          conditions: [{ [o]: E, [s]: [oe, Z] }],
                          rules: [
                            {
                              endpoint: {
                                url: "https://signin-fips.{Region}.{PartitionResult#dnsSuffix}",
                                properties: n,
                                headers: n,
                              },
                              type: h,
                            },
                          ],
                          type: p,
                        },
                        { error: "FIPS is enabled but this partition does not support FIPS", type: f },
                      ],
                      type: p,
                    },
                    {
                      conditions: [C, j],
                      rules: [
                        {
                          conditions: [se],
                          rules: [
                            {
                              endpoint: {
                                url: "https://signin.{Region}.{PartitionResult#dualStackDnsSuffix}",
                                properties: n,
                                headers: n,
                              },
                              type: h,
                            },
                          ],
                          type: p,
                        },
                        {
                          error: "DualStack is enabled but this partition does not support DualStack",
                          type: f,
                        },
                      ],
                      type: p,
                    },
                    {
                      endpoint: {
                        url: "https://signin.{Region}.{PartitionResult#dnsSuffix}",
                        properties: n,
                        headers: n,
                      },
                      type: h,
                    },
                  ],
                  type: p,
                },
              ],
              type: p,
            },
            { error: "Invalid Configuration: Missing Region", type: f },
          ],
          type: p,
        },
      ],
    };
  ue.ruleSet = St;
});

export { de };
