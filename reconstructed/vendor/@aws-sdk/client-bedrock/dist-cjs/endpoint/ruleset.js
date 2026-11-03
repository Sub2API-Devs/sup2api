/**
 * @aws-sdk/client-bedrock/dist-cjs/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock@3.936.0..3.938.0
 * pieces: chunk-0dmzgg46.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-0dmzgg46.js:5471-7771 esm-fingerprint
var K = { ["required"]: !1, type: "string" },
  H = { ["required"]: !0, default: !1, type: "boolean" },
  z = { ["ref"]: "Endpoint" },
  te = { ["fn"]: "booleanEquals", ["argv"]: [{ ["ref"]: "UseFIPS" }, !0] },
  ne = { ["fn"]: "booleanEquals", ["argv"]: [{ ["ref"]: "UseDualStack" }, !0] },
  _ = {},
  Y = { ["fn"]: "getAttr", ["argv"]: [{ ["ref"]: "PartitionResult" }, "supportsFIPS"] },
  X = {
    ["fn"]: "booleanEquals",
    ["argv"]: [!0, { ["fn"]: "getAttr", ["argv"]: [{ ["ref"]: "PartitionResult" }, "supportsDualStack"] }],
  },
  Z = [te],
  ee = [ne],
  oe = [{ ["ref"]: "Region" }],
  Qe = {
    version: "1.0",
    parameters: { Region: K, UseDualStack: H, UseFIPS: H, Endpoint: K },
    rules: [
      {
        conditions: [{ ["fn"]: "isSet", ["argv"]: [z] }],
        rules: [
          {
            conditions: Z,
            error: "Invalid Configuration: FIPS and custom endpoint are not supported",
            type: "error",
          },
          {
            rules: [
              {
                conditions: ee,
                error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
                type: "error",
              },
              { endpoint: { url: z, properties: _, headers: _ }, type: "endpoint" },
            ],
            type: "tree",
          },
        ],
        type: "tree",
      },
      {
        rules: [
          {
            conditions: [{ ["fn"]: "isSet", ["argv"]: oe }],
            rules: [
              {
                conditions: [{ ["fn"]: "aws.partition", ["argv"]: oe, assign: "PartitionResult" }],
                rules: [
                  {
                    conditions: [te, ne],
                    rules: [
                      {
                        conditions: [{ ["fn"]: "booleanEquals", ["argv"]: [!0, Y] }, X],
                        rules: [
                          {
                            rules: [
                              {
                                endpoint: {
                                  url: "https://bedrock-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                                  properties: _,
                                  headers: _,
                                },
                                type: "endpoint",
                              },
                            ],
                            type: "tree",
                          },
                        ],
                        type: "tree",
                      },
                      {
                        error:
                          "FIPS and DualStack are enabled, but this partition does not support one or both",
                        type: "error",
                      },
                    ],
                    type: "tree",
                  },
                  {
                    conditions: Z,
                    rules: [
                      {
                        conditions: [{ ["fn"]: "booleanEquals", ["argv"]: [Y, !0] }],
                        rules: [
                          {
                            rules: [
                              {
                                endpoint: {
                                  url: "https://bedrock-fips.{Region}.{PartitionResult#dnsSuffix}",
                                  properties: _,
                                  headers: _,
                                },
                                type: "endpoint",
                              },
                            ],
                            type: "tree",
                          },
                        ],
                        type: "tree",
                      },
                      { error: "FIPS is enabled but this partition does not support FIPS", type: "error" },
                    ],
                    type: "tree",
                  },
                  {
                    conditions: ee,
                    rules: [
                      {
                        conditions: [X],
                        rules: [
                          {
                            rules: [
                              {
                                endpoint: {
                                  url: "https://bedrock.{Region}.{PartitionResult#dualStackDnsSuffix}",
                                  properties: _,
                                  headers: _,
                                },
                                type: "endpoint",
                              },
                            ],
                            type: "tree",
                          },
                        ],
                        type: "tree",
                      },
                      {
                        error: "DualStack is enabled but this partition does not support DualStack",
                        type: "error",
                      },
                    ],
                    type: "tree",
                  },
                  {
                    rules: [
                      {
                        endpoint: {
                          url: "https://bedrock.{Region}.{PartitionResult#dnsSuffix}",
                          properties: _,
                          headers: _,
                        },
                        type: "endpoint",
                      },
                    ],
                    type: "tree",
                  },
                ],
                type: "tree",
              },
            ],
            type: "tree",
          },
          { error: "Invalid Configuration: Missing Region", type: "error" },
        ],
        type: "tree",
      },
    ],
  },
  se = Qe;

export { se };
