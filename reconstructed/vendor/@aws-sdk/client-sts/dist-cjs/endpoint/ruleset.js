/**
 * @aws-sdk/client-sts/dist-cjs/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-sts@3.936.0..3.939.0
 * pieces: chunk-a8ee6x44.js (1)
 * attribution: cjs-require-graph 1
 */
import { x as x_2 } from "../../../../../runtime/bun-runtime.js";

//@ chunk-a8ee6x44.js:2573-6233 cjs-require-graph
var Je = x_2(function (Qe) {
  Object.defineProperty(Qe, "__esModule", { value: !0 });
  Qe.ruleSet = void 0;
  var Fe = "required",
    o = "type",
    i = "fn",
    s = "argv",
    E = "ref",
    Te = !1,
    pe = !0,
    P = "booleanEquals",
    d = "stringEquals",
    Ue = "sigv4",
    Le = "sts",
    Me = "us-east-1",
    a = "endpoint",
    De = "https://sts.{Region}.{PartitionResult#dnsSuffix}",
    f = "tree",
    O = "error",
    me = "getAttr",
    be = { [Fe]: !1, [o]: "string" },
    ge = { [Fe]: !0, default: !1, [o]: "boolean" },
    $e = { [E]: "Endpoint" },
    we = { [i]: "isSet", [s]: [{ [E]: "Region" }] },
    p = { [E]: "Region" },
    qe = { [i]: "aws.partition", [s]: [p], assign: "PartitionResult" },
    Ke = { [E]: "UseFIPS" },
    Ge = { [E]: "UseDualStack" },
    m = {
      url: "https://sts.amazonaws.com",
      properties: { authSchemes: [{ name: Ue, signingName: Le, signingRegion: Me }] },
      headers: {},
    },
    _ = {},
    ke = { conditions: [{ [i]: d, [s]: [p, "aws-global"] }], [a]: m, [o]: a },
    ze = { [i]: P, [s]: [Ke, !0] },
    Ve = { [i]: P, [s]: [Ge, !0] },
    Oe = { [i]: me, [s]: [{ [E]: "PartitionResult" }, "supportsFIPS"] },
    Be = { [E]: "PartitionResult" },
    He = { [i]: P, [s]: [!0, { [i]: me, [s]: [Be, "supportsDualStack"] }] },
    Ne = [{ [i]: "isSet", [s]: [$e] }],
    We = [ze],
    je = [Ve],
    Ro = {
      version: "1.0",
      parameters: { Region: be, UseDualStack: ge, UseFIPS: ge, Endpoint: be, UseGlobalEndpoint: ge },
      rules: [
        {
          conditions: [
            { [i]: P, [s]: [{ [E]: "UseGlobalEndpoint" }, pe] },
            { [i]: "not", [s]: Ne },
            we,
            qe,
            { [i]: P, [s]: [Ke, Te] },
            { [i]: P, [s]: [Ge, Te] },
          ],
          rules: [
            { conditions: [{ [i]: d, [s]: [p, "ap-northeast-1"] }], endpoint: m, [o]: a },
            { conditions: [{ [i]: d, [s]: [p, "ap-south-1"] }], endpoint: m, [o]: a },
            { conditions: [{ [i]: d, [s]: [p, "ap-southeast-1"] }], endpoint: m, [o]: a },
            { conditions: [{ [i]: d, [s]: [p, "ap-southeast-2"] }], endpoint: m, [o]: a },
            ke,
            { conditions: [{ [i]: d, [s]: [p, "ca-central-1"] }], endpoint: m, [o]: a },
            { conditions: [{ [i]: d, [s]: [p, "eu-central-1"] }], endpoint: m, [o]: a },
            { conditions: [{ [i]: d, [s]: [p, "eu-north-1"] }], endpoint: m, [o]: a },
            { conditions: [{ [i]: d, [s]: [p, "eu-west-1"] }], endpoint: m, [o]: a },
            { conditions: [{ [i]: d, [s]: [p, "eu-west-2"] }], endpoint: m, [o]: a },
            { conditions: [{ [i]: d, [s]: [p, "eu-west-3"] }], endpoint: m, [o]: a },
            { conditions: [{ [i]: d, [s]: [p, "sa-east-1"] }], endpoint: m, [o]: a },
            { conditions: [{ [i]: d, [s]: [p, Me] }], endpoint: m, [o]: a },
            { conditions: [{ [i]: d, [s]: [p, "us-east-2"] }], endpoint: m, [o]: a },
            { conditions: [{ [i]: d, [s]: [p, "us-west-1"] }], endpoint: m, [o]: a },
            { conditions: [{ [i]: d, [s]: [p, "us-west-2"] }], endpoint: m, [o]: a },
            {
              endpoint: {
                url: De,
                properties: { authSchemes: [{ name: Ue, signingName: Le, signingRegion: "{Region}" }] },
                headers: _,
              },
              [o]: a,
            },
          ],
          [o]: f,
        },
        {
          conditions: Ne,
          rules: [
            {
              conditions: We,
              error: "Invalid Configuration: FIPS and custom endpoint are not supported",
              [o]: O,
            },
            {
              conditions: je,
              error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
              [o]: O,
            },
            { endpoint: { url: $e, properties: _, headers: _ }, [o]: a },
          ],
          [o]: f,
        },
        {
          conditions: [we],
          rules: [
            {
              conditions: [qe],
              rules: [
                {
                  conditions: [ze, Ve],
                  rules: [
                    {
                      conditions: [{ [i]: P, [s]: [pe, Oe] }, He],
                      rules: [
                        {
                          endpoint: {
                            url: "https://sts-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                            properties: _,
                            headers: _,
                          },
                          [o]: a,
                        },
                      ],
                      [o]: f,
                    },
                    {
                      error:
                        "FIPS and DualStack are enabled, but this partition does not support one or both",
                      [o]: O,
                    },
                  ],
                  [o]: f,
                },
                {
                  conditions: We,
                  rules: [
                    {
                      conditions: [{ [i]: P, [s]: [Oe, pe] }],
                      rules: [
                        {
                          conditions: [{ [i]: d, [s]: [{ [i]: me, [s]: [Be, "name"] }, "aws-us-gov"] }],
                          endpoint: { url: "https://sts.{Region}.amazonaws.com", properties: _, headers: _ },
                          [o]: a,
                        },
                        {
                          endpoint: {
                            url: "https://sts-fips.{Region}.{PartitionResult#dnsSuffix}",
                            properties: _,
                            headers: _,
                          },
                          [o]: a,
                        },
                      ],
                      [o]: f,
                    },
                    { error: "FIPS is enabled but this partition does not support FIPS", [o]: O },
                  ],
                  [o]: f,
                },
                {
                  conditions: je,
                  rules: [
                    {
                      conditions: [He],
                      rules: [
                        {
                          endpoint: {
                            url: "https://sts.{Region}.{PartitionResult#dualStackDnsSuffix}",
                            properties: _,
                            headers: _,
                          },
                          [o]: a,
                        },
                      ],
                      [o]: f,
                    },
                    { error: "DualStack is enabled but this partition does not support DualStack", [o]: O },
                  ],
                  [o]: f,
                },
                ke,
                { endpoint: { url: De, properties: _, headers: _ }, [o]: a },
              ],
              [o]: f,
            },
          ],
          [o]: f,
        },
        { error: "Invalid Configuration: Missing Region", [o]: O },
      ],
    };
  Qe.ruleSet = Ro;
});

export { Je };
