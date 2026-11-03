/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sso/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-kejz1rpb.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-kejz1rpb.js:5071-7442 esm-fingerprint
var G = { ["required"]: !1, type: "string" },
  q = { ["required"]: !0, default: !1, type: "boolean" },
  j = { ["ref"]: "Endpoint" },
  B = { ["fn"]: "booleanEquals", ["argv"]: [{ ["ref"]: "UseFIPS" }, !0] },
  W = { ["fn"]: "booleanEquals", ["argv"]: [{ ["ref"]: "UseDualStack" }, !0] },
  r = {},
  M = { ["fn"]: "getAttr", ["argv"]: [{ ["ref"]: "PartitionResult" }, "supportsFIPS"] },
  J = { ["ref"]: "PartitionResult" },
  z = { ["fn"]: "booleanEquals", ["argv"]: [!0, { ["fn"]: "getAttr", ["argv"]: [J, "supportsDualStack"] }] },
  K = [B],
  Q = [W],
  V = [{ ["ref"]: "Region" }],
  Ne = {
    version: "1.0",
    parameters: { Region: G, UseDualStack: q, UseFIPS: q, Endpoint: G },
    rules: [
      {
        conditions: [{ ["fn"]: "isSet", ["argv"]: [j] }],
        rules: [
          {
            conditions: K,
            error: "Invalid Configuration: FIPS and custom endpoint are not supported",
            type: "error",
          },
          {
            conditions: Q,
            error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
            type: "error",
          },
          { endpoint: { url: j, properties: r, headers: r }, type: "endpoint" },
        ],
        type: "tree",
      },
      {
        conditions: [{ ["fn"]: "isSet", ["argv"]: V }],
        rules: [
          {
            conditions: [{ ["fn"]: "aws.partition", ["argv"]: V, assign: "PartitionResult" }],
            rules: [
              {
                conditions: [B, W],
                rules: [
                  {
                    conditions: [{ ["fn"]: "booleanEquals", ["argv"]: [!0, M] }, z],
                    rules: [
                      {
                        endpoint: {
                          url: "https://portal.sso-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                          properties: r,
                          headers: r,
                        },
                        type: "endpoint",
                      },
                    ],
                    type: "tree",
                  },
                  {
                    error: "FIPS and DualStack are enabled, but this partition does not support one or both",
                    type: "error",
                  },
                ],
                type: "tree",
              },
              {
                conditions: K,
                rules: [
                  {
                    conditions: [{ ["fn"]: "booleanEquals", ["argv"]: [M, !0] }],
                    rules: [
                      {
                        conditions: [
                          {
                            ["fn"]: "stringEquals",
                            ["argv"]: [{ ["fn"]: "getAttr", ["argv"]: [J, "name"] }, "aws-us-gov"],
                          },
                        ],
                        endpoint: {
                          url: "https://portal.sso.{Region}.amazonaws.com",
                          properties: r,
                          headers: r,
                        },
                        type: "endpoint",
                      },
                      {
                        endpoint: {
                          url: "https://portal.sso-fips.{Region}.{PartitionResult#dnsSuffix}",
                          properties: r,
                          headers: r,
                        },
                        type: "endpoint",
                      },
                    ],
                    type: "tree",
                  },
                  { error: "FIPS is enabled but this partition does not support FIPS", type: "error" },
                ],
                type: "tree",
              },
              {
                conditions: Q,
                rules: [
                  {
                    conditions: [z],
                    rules: [
                      {
                        endpoint: {
                          url: "https://portal.sso.{Region}.{PartitionResult#dualStackDnsSuffix}",
                          properties: r,
                          headers: r,
                        },
                        type: "endpoint",
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
                endpoint: {
                  url: "https://portal.sso.{Region}.{PartitionResult#dnsSuffix}",
                  properties: r,
                  headers: r,
                },
                type: "endpoint",
              },
            ],
            type: "tree",
          },
        ],
        type: "tree",
      },
      { error: "Invalid Configuration: Missing Region", type: "error" },
    ],
  },
  Y = Ne;

export { Y };
