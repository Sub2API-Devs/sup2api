/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-3cddmtk7.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-3cddmtk7.js:20831-23181 esm-fingerprint
var Ge = { ["required"]: !1, type: "string" },
  ke = { ["required"]: !0, default: !1, type: "boolean" },
  De = { ["ref"]: "Endpoint" },
  Le = { ["fn"]: "booleanEquals", ["argv"]: [{ ["ref"]: "UseFIPS" }, !0] },
  Oe = { ["fn"]: "booleanEquals", ["argv"]: [{ ["ref"]: "UseDualStack" }, !0] },
  d = {},
  Pe = { ["fn"]: "getAttr", ["argv"]: [{ ["ref"]: "PartitionResult" }, "supportsFIPS"] },
  be = {
    ["fn"]: "booleanEquals",
    ["argv"]: [!0, { ["fn"]: "getAttr", ["argv"]: [{ ["ref"]: "PartitionResult" }, "supportsDualStack"] }],
  },
  Me = [Le],
  we = [Oe],
  Fe = [{ ["ref"]: "Region" }],
  jt = {
    version: "1.0",
    parameters: { Region: Ge, UseDualStack: ke, UseFIPS: ke, Endpoint: Ge },
    rules: [
      {
        conditions: [{ ["fn"]: "isSet", ["argv"]: [De] }],
        rules: [
          {
            conditions: Me,
            error: "Invalid Configuration: FIPS and custom endpoint are not supported",
            type: "error",
          },
          {
            rules: [
              {
                conditions: we,
                error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
                type: "error",
              },
              { endpoint: { url: De, properties: d, headers: d }, type: "endpoint" },
            ],
            type: "tree",
          },
        ],
        type: "tree",
      },
      {
        rules: [
          {
            conditions: [{ ["fn"]: "isSet", ["argv"]: Fe }],
            rules: [
              {
                conditions: [{ ["fn"]: "aws.partition", ["argv"]: Fe, assign: "PartitionResult" }],
                rules: [
                  {
                    conditions: [Le, Oe],
                    rules: [
                      {
                        conditions: [{ ["fn"]: "booleanEquals", ["argv"]: [!0, Pe] }, be],
                        rules: [
                          {
                            rules: [
                              {
                                endpoint: {
                                  url: "https://bedrock-runtime-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                                  properties: d,
                                  headers: d,
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
                    conditions: Me,
                    rules: [
                      {
                        conditions: [{ ["fn"]: "booleanEquals", ["argv"]: [Pe, !0] }],
                        rules: [
                          {
                            rules: [
                              {
                                endpoint: {
                                  url: "https://bedrock-runtime-fips.{Region}.{PartitionResult#dnsSuffix}",
                                  properties: d,
                                  headers: d,
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
                    conditions: we,
                    rules: [
                      {
                        conditions: [be],
                        rules: [
                          {
                            rules: [
                              {
                                endpoint: {
                                  url: "https://bedrock-runtime.{Region}.{PartitionResult#dualStackDnsSuffix}",
                                  properties: d,
                                  headers: d,
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
                          url: "https://bedrock-runtime.{Region}.{PartitionResult#dnsSuffix}",
                          properties: d,
                          headers: d,
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
  Ue = jt;

export { Ue };
