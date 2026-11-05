/**
 * services/plugins/publish/orgRequests.ts
 *
 * 2.1.316 新增。插件发布的组织级请求路径构造。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-77qzxtqv.js (2)
 * attribution: placement 2
 */
import { organizationApiPath } from "../../api/overageCreditGrant.js";
import { encodePathSegment } from "../../api/apiPath.js";

//@ chunk-77qzxtqv.js:14138-14186 placement
/**
 * /api/oauth/organizations/<org>/<编码后的子路径>。
 */
var organizationSubPath = (organization, segments) =>
  `${organizationApiPath(organization)}/${segments.map(encodePathSegment).join("/")}`;
//@ chunk-77qzxtqv.js:14186-14282 placement
/**
 * 构建组织级 GET 请求描述。
 */
var buildOrgGetRequest = (organization, segments) => ({
  method: "get",
  path: organizationSubPath(organization, segments),
  body: undefined,
  headers: {},
  bound: "clock",
  signal: organization.signal,
});
export { buildOrgGetRequest, organizationSubPath };
