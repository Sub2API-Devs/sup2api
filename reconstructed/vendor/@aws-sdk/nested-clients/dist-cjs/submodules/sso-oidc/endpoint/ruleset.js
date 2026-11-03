/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sso-oidc/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-ddzww9ex.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../../runtime/bun-runtime.js";

//@ chunk-ddzww9ex.js:1796-3961 cjs-fingerprint
var require_ruleset = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ruleSet = undefined;
  var u_2 = "required";
  var v = "fn";
  var w = "argv";
  var x = "ref";
  var a = true;
  var b = "isSet";
  var c = "booleanEquals";
  var d = "error";
  var e = "endpoint";
  var f = "tree";
  var g = "PartitionResult";
  var h = "getAttr";
  var i = {
    [u_2]: false,
    type: "string",
  };
  var j = {
    [u_2]: true,
    default: false,
    type: "boolean",
  };
  var k = {
    [x]: "Endpoint",
  };
  var l = {
    [v]: c,
    [w]: [
      {
        [x]: "UseFIPS",
      },
      true,
    ],
  };
  var m = {
    [v]: c,
    [w]: [
      {
        [x]: "UseDualStack",
      },
      true,
    ],
  };
  var n = {};
  var o = {
    [v]: h,
    [w]: [
      {
        [x]: g,
      },
      "supportsFIPS",
    ],
  };
  var p = {
    [x]: g,
  };
  var q = {
    [v]: c,
    [w]: [
      true,
      {
        [v]: h,
        [w]: [p, "supportsDualStack"],
      },
    ],
  };
  var r = [l];
  var s = [m];
  var t = [
    {
      [x]: "Region",
    },
  ];
  var _data = {
    version: "1.0",
    parameters: {
      Region: i,
      UseDualStack: j,
      UseFIPS: j,
      Endpoint: i,
    },
    rules: [
      {
        conditions: [
          {
            [v]: b,
            [w]: [k],
          },
        ],
        rules: [
          {
            conditions: r,
            error: "Invalid Configuration: FIPS and custom endpoint are not supported",
            type: d,
          },
          {
            conditions: s,
            error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
            type: d,
          },
          {
            endpoint: {
              url: k,
              properties: n,
              headers: n,
            },
            type: e,
          },
        ],
        type: f,
      },
      {
        conditions: [
          {
            [v]: b,
            [w]: t,
          },
        ],
        rules: [
          {
            conditions: [
              {
                [v]: "aws.partition",
                [w]: t,
                assign: g,
              },
            ],
            rules: [
              {
                conditions: [l, m],
                rules: [
                  {
                    conditions: [
                      {
                        [v]: c,
                        [w]: [a, o],
                      },
                      q,
                    ],
                    rules: [
                      {
                        endpoint: {
                          url: "https://oidc-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                          properties: n,
                          headers: n,
                        },
                        type: e,
                      },
                    ],
                    type: f,
                  },
                  {
                    error: "FIPS and DualStack are enabled, but this partition does not support one or both",
                    type: d,
                  },
                ],
                type: f,
              },
              {
                conditions: r,
                rules: [
                  {
                    conditions: [
                      {
                        [v]: c,
                        [w]: [o, a],
                      },
                    ],
                    rules: [
                      {
                        conditions: [
                          {
                            [v]: "stringEquals",
                            [w]: [
                              {
                                [v]: h,
                                [w]: [p, "name"],
                              },
                              "aws-us-gov",
                            ],
                          },
                        ],
                        endpoint: {
                          url: "https://oidc.{Region}.amazonaws.com",
                          properties: n,
                          headers: n,
                        },
                        type: e,
                      },
                      {
                        endpoint: {
                          url: "https://oidc-fips.{Region}.{PartitionResult#dnsSuffix}",
                          properties: n,
                          headers: n,
                        },
                        type: e,
                      },
                    ],
                    type: f,
                  },
                  {
                    error: "FIPS is enabled but this partition does not support FIPS",
                    type: d,
                  },
                ],
                type: f,
              },
              {
                conditions: s,
                rules: [
                  {
                    conditions: [q],
                    rules: [
                      {
                        endpoint: {
                          url: "https://oidc.{Region}.{PartitionResult#dualStackDnsSuffix}",
                          properties: n,
                          headers: n,
                        },
                        type: e,
                      },
                    ],
                    type: f,
                  },
                  {
                    error: "DualStack is enabled but this partition does not support DualStack",
                    type: d,
                  },
                ],
                type: f,
              },
              {
                endpoint: {
                  url: "https://oidc.{Region}.{PartitionResult#dnsSuffix}",
                  properties: n,
                  headers: n,
                },
                type: e,
              },
            ],
            type: f,
          },
        ],
        type: f,
      },
      {
        error: "Invalid Configuration: Missing Region",
        type: d,
      },
    ],
  };
  cjsExports.ruleSet = _data;
});
export { require_ruleset };
