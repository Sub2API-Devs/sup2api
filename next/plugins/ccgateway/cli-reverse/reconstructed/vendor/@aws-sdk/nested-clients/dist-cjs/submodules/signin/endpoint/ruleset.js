/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/signin/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-csa0qt1j.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";

//@ chunk-csa0qt1j.js:1795-4373 cjs-fingerprint
var require_ruleset = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ruleSet = undefined;
  var u = "required";
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
  var h = "stringEquals";
  var i = {
    [u]: true,
    default: false,
    type: "boolean",
  };
  var j_2 = {
    [u]: false,
    type: "string",
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
  var emptyObject = {};
  var o = {
    [v]: "getAttr",
    [w]: [
      {
        [x]: g,
      },
      "name",
    ],
  };
  var p = {
    [v]: c,
    [w]: [
      {
        [x]: "UseFIPS",
      },
      false,
    ],
  };
  var q = {
    [v]: c,
    [w]: [
      {
        [x]: "UseDualStack",
      },
      false,
    ],
  };
  var r = {
    [v]: "getAttr",
    [w]: [
      {
        [x]: g,
      },
      "supportsFIPS",
    ],
  };
  var s = {
    [v]: c,
    [w]: [
      true,
      {
        [v]: "getAttr",
        [w]: [
          {
            [x]: g,
          },
          "supportsDualStack",
        ],
      },
    ],
  };
  var t = [
    {
      [x]: "Region",
    },
  ];
  var _data = {
    version: "1.0",
    parameters: {
      UseDualStack: i,
      UseFIPS: i,
      Endpoint: j_2,
      Region: j_2,
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
            conditions: [l],
            error: "Invalid Configuration: FIPS and custom endpoint are not supported",
            type: d,
          },
          {
            rules: [
              {
                conditions: [m],
                error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
                type: d,
              },
              {
                endpoint: {
                  url: k,
                  properties: emptyObject,
                  headers: emptyObject,
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
        rules: [
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
                    conditions: [
                      {
                        [v]: h,
                        [w]: [o, "aws"],
                      },
                      p,
                      q,
                    ],
                    endpoint: {
                      url: "https://{Region}.signin.aws.amazon.com",
                      properties: emptyObject,
                      headers: emptyObject,
                    },
                    type: e,
                  },
                  {
                    conditions: [
                      {
                        [v]: h,
                        [w]: [o, "aws-cn"],
                      },
                      p,
                      q,
                    ],
                    endpoint: {
                      url: "https://{Region}.signin.amazonaws.cn",
                      properties: emptyObject,
                      headers: emptyObject,
                    },
                    type: e,
                  },
                  {
                    conditions: [
                      {
                        [v]: h,
                        [w]: [o, "aws-us-gov"],
                      },
                      p,
                      q,
                    ],
                    endpoint: {
                      url: "https://{Region}.signin.amazonaws-us-gov.com",
                      properties: emptyObject,
                      headers: emptyObject,
                    },
                    type: e,
                  },
                  {
                    conditions: [l, m],
                    rules: [
                      {
                        conditions: [
                          {
                            [v]: c,
                            [w]: [a, r],
                          },
                          s,
                        ],
                        rules: [
                          {
                            endpoint: {
                              url: "https://signin-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                              properties: emptyObject,
                              headers: emptyObject,
                            },
                            type: e,
                          },
                        ],
                        type: f,
                      },
                      {
                        error:
                          "FIPS and DualStack are enabled, but this partition does not support one or both",
                        type: d,
                      },
                    ],
                    type: f,
                  },
                  {
                    conditions: [l, q],
                    rules: [
                      {
                        conditions: [
                          {
                            [v]: c,
                            [w]: [r, a],
                          },
                        ],
                        rules: [
                          {
                            endpoint: {
                              url: "https://signin-fips.{Region}.{PartitionResult#dnsSuffix}",
                              properties: emptyObject,
                              headers: emptyObject,
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
                    conditions: [p, m],
                    rules: [
                      {
                        conditions: [s],
                        rules: [
                          {
                            endpoint: {
                              url: "https://signin.{Region}.{PartitionResult#dualStackDnsSuffix}",
                              properties: emptyObject,
                              headers: emptyObject,
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
                      url: "https://signin.{Region}.{PartitionResult#dnsSuffix}",
                      properties: emptyObject,
                      headers: emptyObject,
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
        type: f,
      },
    ],
  };
  cjsExports.ruleSet = _data;
});
export { require_ruleset };
