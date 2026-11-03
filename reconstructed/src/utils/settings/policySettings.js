/**
 * utils/settings/policySettings.ts
 *
 * 2.1.316 新增：合并管理员策略层；多个策略中取最严格的值等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (57)
 * attribution: placement 57
 */
import {
  getMachineAdminPolicyTier,
  machineBeneathPolicyOnly,
  KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER,
  ADDED_TO_A_POLICY_ONLY_TIER,
  winnerOnlyUnderMerge,
  helperMayBeUserControlled,
} from "./policyTiers.js";
import { getPolicySettingsOrigin_2, settingsMergeCustomizer } from "./settings.js";
import {
  parseRemoteManagedSettings,
  readMdmSettings,
  loadManagedFileSettings,
  parseParentManagedSettings,
  parseParentTierWithOrganization,
  isPolicyContentKey,
} from "./managedFileSettings.js";
import { mt, isDeepEmptyObject } from "./types.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import {
  adminTierComposesParent,
  shouldIncludeParentTier,
  isDisableAllHooksSet,
  keepRestrictiveFromParent,
  hostManagedModelOverlay,
  WINNER_ONLY_NESTED_UNDER_MERGE,
  missingAwsPairs,
  getSettingsForSource_3,
} from "./settingsSources.js";
import { wS, En, xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { shouldAllowManagedMcpServersOnly } from "../../services/mcp/config.js";
import {
  getAtPath,
  setAtPath,
  MANAGED_RESTRICTION_KEYS,
  JOe,
  restrictionValue,
} from "./managedRestrictionKeys.js";
import { uniq } from "../collections.js";
import { getAllowedMcpServersFromTiers, bp } from "../../services/mcp/managedMcpPolicy.js";
import { getPlatform } from "../platform.js";
import { fj } from "./settingsSourceTrust.js";
import { explainUnloadableGuardHooks } from "./validation.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { refusedCopyForcesRefresh } from "../../services/remoteManagedSettings/remoteSettingsState.js";

//@ chunk-dcmhvw5a.js:485330-485500 placement
function getHostPolicyLoginPins(e) {
  let n = getMachineAdminPolicyTier(e);
  return {
    forceLoginMethod: n?.forceLoginMethod,
    forceLoginGatewayUrl: n?.forceLoginGatewayUrl,
    gatewayInternalNetworks: n?.gatewayInternalNetworks,
  };
}
//@ chunk-dcmhvw5a.js:485500-485824 placement
function getPolicySettingsOrigin(e) {
  let n = armedHelperOutput(e);
  if (n.composes === "tier") return "helper";
  let r = resolvePolicySettings(e);
  if (n.composes === "remoteSlot" || r.present.remote) return "remote";
  if (r.present.mdm) return getPolicySettingsOrigin_2();
  if (r.present.file) return "file";
  if (r.parentSlice || r.hostModelOverlay) return "parent";
  let s = e.hkcu?.();
  return s && Object.keys(s.settings).length > 0 ? "hkcu" : null;
}
//@ chunk-dcmhvw5a.js:485824-486235 placement
function getShadowedManagedSources(e) {
  let n = armedHelperOutput(e),
    r = n.composes === "none" ? null : n.mergedOver,
    s = resolvePolicySettings(e),
    a = [];
  if (n.composes === "tier") a.push("helper");
  if (n.composes === "remoteSlot" || s.present.remote) a.push("remote");
  if (s.present.mdm) a.push(getPolicySettingsOrigin_2());
  if (s.present.file) a.push("file");
  let c = getMergedPolicySources(e) ?? [],
    [g, ...m] = a,
    filtered = m.filter((y) => y !== r && !c.includes(y)),
    h = e.hkcu?.();
  if (h && Object.keys(h.settings).length > 0 && (g || s.parentSlice)) filtered.push("hkcu");
  return filtered;
}
//@ chunk-dcmhvw5a.js:486235-486587 placement
function getManagedSourcesInEffect(e) {
  let n = resolvePolicySettings(e),
    r = [];
  if (n.present.remote) r.push("remote");
  if (n.present.mdm) r.push(getPolicySettingsOrigin_2());
  if (n.present.file) r.push("file");
  if (n.parentSlice || n.hostModelOverlay) r.push("parent");
  if (!n.admin && !n.parentSlice) {
    let s = e.hkcu?.();
    if (s && Object.keys(s.settings).length > 0) r.push("hkcu");
  }
  return { sources: r, behavior: n.mode === "merge" ? "merge" : "first-wins" };
}
//@ chunk-dcmhvw5a.js:486587-486698 placement
function isPolicySlotAdminOrParentComposed(e) {
  if (armedHelperOutput(e).composes === "tier") return !0;
  let { admin: admin, parentSlice: parentSlice } = resolvePolicySettings(e);
  return admin !== null || parentSlice !== null;
}
//@ chunk-dcmhvw5a.js:486698-491649 placement
function resolvePolicySettings(e) {
  let n = [],
    r = parseRemoteManagedSettings(e),
    { settings: settings, servedSnapshot: servedSnapshot } = r;
  n.push(...r.errors);
  let c = armedHelperOutput(e),
    g = c.composes === "remoteSlot" ? c.helper : Ho(settings),
    m = readMdmSettings(e),
    settings_2 = m.settings;
  n.push(...m.errors);
  let h = Ho(settings_2),
    y = e.file?.() ?? loadManagedFileSettings(e),
    settings_3 = y.settings;
  n.push(...y.errors);
  let S = Ho(settings_3),
    C = authoredPolicyContent(m),
    w = authoredPolicyContent(y),
    L = w && y.heldOnly === !0,
    v = e.policyOnlyServerTier?.() === "unconfirmed" && ((C && e.mdm?.().userWritable !== !0) || w),
    j = v && g ? restrictiveParentSlice(g) : g,
    x = !v && (c.composes === "remoteSlot" ? j !== null : authoredPolicyContent(r)),
    K = Ys(j, x),
    q = Ys(h, C),
    ee = y.onlyHeldContent ? Mg : Ys(S, w),
    Z = !v && j !== null && K >= Math.max(q, ee),
    ae = h !== null && q >= ee,
    me = [
      [v ? null : settings, Z],
      [settings_2, ae],
      [settings_3, S !== null],
    ],
    Re = (
      c.composes === "remoteSlot"
        ? c.helper
        : me.find(
            ([ce, we]) =>
              ce !== null &&
              (ce === settings && servedSnapshot ? we : ce.managedSourcesBehavior !== void 0 || we),
          )?.[0]
    )?.managedSourcesBehavior,
    P = v ? j : null,
    R = j !== null && !Z,
    N = R ? null : j,
    G = h !== null && !ae && N === null,
    Q = G ? null : h,
    se = [],
    ne = [
      [R, "remote", j],
      [G, getPolicySettingsOrigin_2(), h],
    ];
  for (let [ce, we, ve] of ne) {
    if (!ce || ve === null) continue;
    if ((se.push([ve, we]), !hasEffectivePolicyContent(ve) || ve === P)) continue;
    let ut = we === "remote" && C ? getPolicySettingsOrigin_2() : "file";
    n.push({
      file: MANAGED_SOURCE_NOTICE_LABELS[we],
      path: Object.keys(ve).find((vn) => !mt.includes(vn)) ?? "",
      message: `${MANAGED_SOURCE_NOTICE_LABELS[we]} holds only values that could not be applied as written, so ${MANAGED_SOURCE_NOTICE_LABELS[ut]} supplies the managed settings while that fail-closed reading still binds beside it (the most restrictive value of each such key applies), until it is fixed.`,
      severity: "warning",
      statusOnly: !0,
    });
  }
  let { settings: settings_4, errors: errors } = parseParentManagedSettings(e);
  n.push(...errors);
  let xe = parseParentTierWithOrganization(e);
  n.push(...(xe?.errors ?? []));
  let Ce = xe?.settings ?? settings_4,
    Ae = N !== null && servedSnapshot && c.composes !== "remoteSlot",
    Ye = !(N !== null && x && !Ae) && !(Q !== null && C),
    Je = Ye && (!w || L),
    Pe = Je && L,
    fe =
      Pe && Ce && S
        ? Uo(
            S,
            Xt.filter((ce) => Ce[ce] !== void 0),
          )
        : S,
    qe = (C ? Q : null) ?? (w ? S : null),
    Zg = Ce !== null && (qe === null || adminTierComposesParent(qe) || Pe),
    filtered = [
      keepMergeablePolicyKeys(N, servedSnapshot && c.composes !== "remoteSlot", [
        Q,
        fe && Uo(fe, y.heldAllowLists ?? []),
        ...(Zg ? [wS(Ce, Xt)] : []),
      ]),
      Q,
      fe,
      ...se.map(([ce]) => ce),
    ].filter((ce) => ce !== null),
    Qg = [
      ...(N !== null ? ["remote"] : []),
      ...(Q !== null ? [getPolicySettingsOrigin_2()] : []),
      ...(S !== null ? ["file"] : []),
      ...se.map(([, ce]) => ce),
    ],
    Qs = (ce) => filtered.some((we) => we !== fe && we[ce] !== void 0),
    Ko = fe !== null && y.onlyHeldContent === !0 && Ye && Re !== "merge" && filtered[0] !== fe,
    Fo = N !== null && e.policyOnlyServerTier?.() !== void 0,
    { admin: admin, merged: merged } = mergeAdminPolicies(
      Ko ? filtered.filter((ce) => ce !== fe) : filtered,
      Re,
      Ae,
      Ko ? filtered.length - 2 : se.length,
      Fo,
    ),
    ei = (ce) =>
      shouldAllowManagedMcpServersOnly({ slot: ce, adminTiers: filtered }) ||
      (Ce?.allowManagedMcpServersOnly === !0 && ce?.allowManagedMcpServersOnly !== !1),
    ni = (ce, we) =>
      merged
        ? Qs(ce)
        : (filtered[0] !== fe && filtered[0]?.[ce] !== void 0) ||
          (ce === "allowedMcpServers" && Qs(ce) && ei(we)),
    Tt =
      admin && fe && Ko
        ? mergeAdminPolicies(
            [
              admin,
              Uo(
                fe,
                MERGEABLE_POLICY_KEYS.filter((ce) => ni(ce, admin)),
              ),
            ],
            "merge",
            !1,
            0,
          ).admin
        : admin && P && !merged
          ? mergeAdminPolicies([admin, P], "merge", !1, 0).admin
          : admin;
  if (Fo && Tt !== null) {
    let { kept: kept } = machineBeneathPolicyOnly(e);
    for (let we of KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER) {
      let ve = getAtPath(kept, we),
        ut = getAtPath(Tt, we);
      if (ve !== void 0)
        setAtPath(
          Tt,
          we,
          ADDED_TO_A_POLICY_ONLY_TIER.includes(we.join(".")) && Array.isArray(ve) && Array.isArray(ut)
            ? uniq([...ut, ...ve])
            : ve,
        );
    }
  }
  let qt = Tt === null ? [r, m, y].find(isPolicyTier) : void 0,
    nt = Tt ?? (qt ? {} : null),
    jo = { remote: N !== null || qt === r, mdm: Q !== null || qt === m, file: S !== null || qt === y },
    ri = [];
  if (merged) {
    let ce = jo.remote ? "remote" : jo.mdm ? getPolicySettingsOrigin_2() : "file",
      we = [
        [Q, getPolicySettingsOrigin_2()],
        [fe, "file"],
      ];
    for (let [ve, ut] of we) {
      if (ve === null || ve === filtered[0] || (Ae && ve === filtered[1])) continue;
      let filtered_2 = POLICY_HELPER_CONFIG_KEYS.filter((Jo) =>
          Object.values(ve[Jo] ?? {}).some((ai) => ai !== void 0 && ai !== null),
        ),
        [ii] = filtered_2;
      if (ii === void 0) continue;
      (ri.push(ut),
        n.push({
          file: MANAGED_SOURCE_NOTICE_LABELS[ut],
          path: ii,
          message: `${filtered_2.map((Jo) => `"${Jo}"`).join(" and ")} in ${MANAGED_SOURCE_NOTICE_LABELS[ut]} ignored: policy helper configuration is read from the highest managed settings source only (${MANAGED_SOURCE_NOTICE_LABELS[ce]} here), even with managedSourcesBehavior "merge". Configure the helper in that source instead.`,
          severity: "warning",
          statusOnly: !0,
        }));
    }
  }
  let Bo = (ce) =>
      ce !== null && (ce === filtered[0] || Object.keys(Uo(ce, winnerOnlyUnderMerge())).length > 0),
    em = { remote: Bo(N), mdm: Bo(Q), file: Bo(fe) },
    Zt = {
      allowManagedPermissionRulesOnly:
        filtered.some((ce) => ce.allowManagedPermissionRulesOnly === !0) || void 0,
      forceLoginOrgUUID: nt?.forceLoginOrgUUID,
      ...wS(nt ?? {}, Xt),
      hooks: nt?.hooks,
      enabledPlugins: nt?.enabledPlugins,
      allowedMcpServers: ei(nt)
        ? getAllowedMcpServersFromTiers({ slot: nt, adminTiers: filtered })
        : nt?.allowedMcpServers,
      sandbox: {
        network: {
          allowManagedDomainsOnly:
            filtered.some((ce) => ce.sandbox?.network?.allowManagedDomainsOnly === !0) || void 0,
        },
        filesystem: {
          allowManagedReadPathsOnly:
            filtered.some((ce) => ce.sandbox?.filesystem?.allowManagedReadPathsOnly === !0) || void 0,
        },
      },
    },
    Vo = shouldIncludeParentTier(Tt, Je),
    Tn = Pe && Ce ? fg(Ce, Zt) : Ce,
    si =
      Vo && Ce && !Pe
        ? Xt.filter(
            (ce) =>
              Ce[ce] !== void 0 &&
              y.heldAllowLists?.includes(ce) === !0 &&
              En(Zt[ce], S?.[ce]) &&
              !ni(ce, nt),
          )
        : [],
    Yo =
      (Tn || isDisableAllHooksSet(e.parentManaged)) && Vo
        ? Pe
          ? keepRestrictiveFromParent(
              Tn ?? {},
              {
                ...Zt,
                allowManagedPermissionRulesOnly: !0,
                sandbox: {
                  network: { allowManagedDomainsOnly: !0 },
                  filesystem: { allowManagedReadPathsOnly: !0 },
                },
              },
              e.parentManaged,
              e.parentOrganizationSettings?.own,
            )
          : keepRestrictiveFromParent(
              Tn ?? {},
              Uo(Zt, si),
              e.parentManaged,
              e.parentOrganizationSettings?.own,
            )
        : null,
    tm = Yo && Object.keys(Yo).length > 0 ? Yo : null,
    nm = hostManagedModelOverlay(
      Ce === settings_4 ? Tn : Pe && settings_4 ? fg(settings_4, Zt) : settings_4,
      e.hostManagedProvider,
    );
  return {
    tiers: filtered,
    tierSources: Qg,
    admin: nt,
    parentSlice: tm,
    hostModelOverlay: nm,
    errors: n,
    present: jo,
    mode: Re,
    merged: merged,
    composed: em,
    snapshotFirst: Ae,
    parentNeverShutOut: Je,
    shadowedHelperSources: ri,
    parentIncluded: Vo,
    heldEmpty: qt !== void 0,
    fileNotHeld: y.settingsNotHeld,
    heldInTheHostsPlace: si,
    policyOnlyLeads: Fo,
  };
}
/**
 * 合并管理员策略层。
 */
//@ chunk-dcmhvw5a.js:491649-492327 placement
function mergeAdminPolicies(e, n, r, s, a = !1) {
  let c = e[0];
  if (!c) return { admin: null, merged: !1 };
  let { managedSourcesBehavior: managedSourcesBehavior, ...m } = c,
    f = n === "merge" && e.length >= 2;
  if (!f && s === 0 && !a) return { admin: managedSourcesBehavior === void 0 ? c : m, merged: !1 };
  let mapped = e.slice(f || a ? 1 : e.length - s).map((b, S) => {
    let C = f && r && S === 0,
      w = C ? { ...b } : Uo(b, winnerOnlyUnderMerge());
    if (!C) {
      for (let v of WINNER_ONLY_NESTED_UNDER_MERGE) if (getAtPath(w, v) !== void 0) setAtPath(w, v, void 0);
    }
    let L = getAtPath(w.sandbox, ["enabledPlatforms"]);
    if (Array.isArray(L) && L.includes(getPlatform())) setAtPath(w, ["sandbox", "enabledPlatforms"], void 0);
    else if (L !== void 0) delete w.sandbox;
    return w;
  });
  if (!f) return (mostRestrictivePolicy(m, [c, ...mapped]), { admin: m, merged: !1 });
  let y = {};
  for (let b of [...mapped].reverse()) fj(y, b, mergePolicyValue);
  return (
    fj(y, m, r ? DA : mergePolicyValue),
    mostRestrictivePolicy(y, [c, ...mapped]),
    pickModelOverrides(y, [c, ...mapped], r),
    { admin: y, merged: !0 }
  );
}
//@ chunk-dcmhvw5a.js:492327-492501 placement
var POLICY_HELPER_CONFIG_KEYS = ["policyHelper", "policyHelpers"],
  MANAGED_SOURCE_NOTICE_LABELS = {
    remote: "server-managed settings",
    plist: "the managed preferences plist",
    hklm: "the HKLM policy key",
    file: "managed-settings.json",
  };
//@ chunk-dcmhvw5a.js:492501-492566 placement
function hasPolicyContent(e) {
  return Object.keys(e).some((n) => !mt.includes(n));
}
//@ chunk-dcmhvw5a.js:492566-492646 placement
function hasEffectivePolicyContent(e) {
  return Object.entries(e).some(([n, r]) => !mt.includes(n) && !isDeepEmptyObject(r));
}
//@ chunk-dcmhvw5a.js:492646-492685 placement
function Ho(e) {
  return e && hasPolicyContent(e) ? e : null;
}
//@ chunk-dcmhvw5a.js:492685-492763 placement
function authoredPolicyContent(e) {
  return e.settings !== null && hasEffectivePolicyContent(e.settings) && !e.onlySubstitutes;
}
//@ chunk-dcmhvw5a.js:492763-492848 placement
function Ig(e, n, r) {
  return authoredPolicyContent({ settings: n }) && !r.some((s) => s.onlySubstitutes)
    ? explainUnloadableGuardHooks(e)
    : e;
}
//@ chunk-dcmhvw5a.js:492848-492857 placement
var Mg = 0;
//@ chunk-dcmhvw5a.js:492857-492928 placement
function Ys(e, n) {
  if (e === null) return -1;
  if (n) return 2;
  return hasEffectivePolicyContent(e) ? 1 : Mg;
}
//@ chunk-dcmhvw5a.js:492928-493040 placement
function documentHasPolicyContent(e, n) {
  return (
    Object.entries(e).some(([r, s]) => s !== null && !isPolicyContentKey(r, s) && !mt.includes(r)) ||
    (n !== null && hasPolicyContent(n))
  );
}
//@ chunk-dcmhvw5a.js:493040-493128 placement
function isPolicyTier(e) {
  return e.documentHasPolicyContent ?? (e.settings !== null && hasPolicyContent(e.settings));
}
//@ chunk-dcmhvw5a.js:493128-493202 placement
function loadStateOf(e) {
  return e.loadState ?? (e.settings !== null ? "loaded" : "absent");
}
//@ chunk-dcmhvw5a.js:493202-493329 placement
function combinedLoadState(e, n) {
  if (e === "didNotLoad" || n === "didNotLoad") return "didNotLoad";
  return e === "loaded" || n === "loaded" ? "loaded" : "absent";
}
//@ chunk-dcmhvw5a.js:493329-493410 placement
function adminDocumentPresent(e) {
  return e.userWritable !== !0 && (isPolicyTier(e) || e.loadState === "didNotLoad");
}
//@ chunk-dcmhvw5a.js:493410-493633 placement
function pickModelOverrides(e, n, r) {
  let index = n.findIndex((c) => c.availableModels !== void 0),
    index_2 = n.findIndex((c) => c.modelOverrides !== void 0);
  if (index_2 !== -1 && (index === -1 || index_2 <= index || (r && index === 0)))
    e.modelOverrides = { ...n[index_2].modelOverrides };
  else delete e.modelOverrides;
}
//@ chunk-dcmhvw5a.js:493633-493775 placement
var WHOLE_VALUE_POLICY_KEYS = [
    "allowedMcpServers",
    "availableModels",
    "strictKnownMarketplaces",
    "allowedChannelPlugins",
    "allowedProviders",
  ],
  SANDBOX_REPLACE_KEYS = ["awsPairs", "ripgrep"];
//@ chunk-dcmhvw5a.js:493775-493964 placement
function replacePolicyValue(e, n, r) {
  if (n === void 0) return e;
  if (Array.isArray(n))
    return r === "awsPairs" && Array.isArray(e) ? [...n, ...missingAwsPairs(e, n)] : [...n];
  if (!isPlainObject_2(n)) return n;
  return xr(n, (s) => (Array.isArray(s) ? [...s] : s));
}
/**
 * 可合并的策略键。
 */
//@ chunk-dcmhvw5a.js:493964-494338 placement
var MERGEABLE_POLICY_KEYS = [
    "allowedMcpServers",
    "availableModels",
    "strictKnownMarketplaces",
    "allowedChannelPlugins",
    "allowedProviders",
    "allowedMarketplaces",
    "allowedHttpHookUrls",
    "httpHookAllowedEnvVars",
  ],
  Xt = ["allowedMcpServers", "availableModels", "strictKnownMarketplaces", "allowedProviders"],
  Ug = [
    ["allowManagedMcpServersOnly", "allowedMcpServers"],
    ["enforceAvailableModels", "availableModels"],
  ];
//@ chunk-dcmhvw5a.js:494338-494430 placement
function fg(e, n) {
  return Uo(
    e,
    Ug.filter(([, r]) => e[r] === void 0 && n[r] === void 0).map(([r]) => r),
  );
}
//@ chunk-dcmhvw5a.js:494430-494721 placement
var RESTRICTIVE_PARENT_KEYS = [
  ...Ug.map(([e]) => e),
  "allowManagedPermissionRulesOnly",
  "allowManagedHooksOnly",
  "disableAllHooks",
  "allowedHttpHookUrls",
  "httpHookAllowedEnvVars",
  "strictPluginOnlyCustomization",
  "sandbox.network.allowManagedDomainsOnly",
  "sandbox.filesystem.allowManagedReadPathsOnly",
  "sandbox.enabled",
];
//@ chunk-dcmhvw5a.js:494721-494951 placement
function restrictiveParentSlice(e) {
  return Ho(
    keepRestrictiveFromParent(Uo(e, RESTRICTIVE_PARENT_KEYS), {
      ...Object.fromEntries(Xt.map((n) => [n, []])),
      forceLoginOrgUUID: [],
      allowManagedPermissionRulesOnly: !0,
      sandbox: { network: { allowManagedDomainsOnly: !0 }, filesystem: { allowManagedReadPathsOnly: !0 } },
    }),
  );
}
//@ chunk-dcmhvw5a.js:494951-495076 placement
function keepMergeablePolicyKeys(e, n, r) {
  if (e === null || !n) return e;
  let filtered = MERGEABLE_POLICY_KEYS.filter((a) => r.some((c) => c?.[a] !== void 0));
  return filtered.length === 0 ? e : Uo(e, filtered);
}
//@ chunk-dcmhvw5a.js:495076-495177 placement
function mergePolicyValue(e, n, r) {
  if (r !== void 0 && (WHOLE_VALUE_POLICY_KEYS.includes(r) || SANDBOX_REPLACE_KEYS.includes(r)))
    return replacePolicyValue(e, n, r);
  return unionPolicyArrays(e, n, r);
}
//@ chunk-dcmhvw5a.js:495177-495260 placement
function DA(e, n, r) {
  if (r !== void 0 && WHOLE_VALUE_POLICY_KEYS.includes(r)) return replacePolicyValue(e, n, r);
  return unionPolicyArrays(e, n, r);
}
//@ chunk-dcmhvw5a.js:495260-495377 placement
function unionPolicyArrays(e, n, r) {
  if (Array.isArray(e) && Array.isArray(n) && r !== "fallbackModel") return uniq([...n, ...e]);
  return settingsMergeCustomizer(e, n, r);
}
/**
 * 多个策略中取最严格的值。
 */
//@ chunk-dcmhvw5a.js:495377-495911 placement
function mostRestrictivePolicy(e, n) {
  let r = n[0],
    s = e;
  for (let a of MANAGED_RESTRICTION_KEYS()) {
    let { path: path, restrictive: restrictive } = a,
      m = JOe(restrictive),
      min = Math.min(...n.map((h) => m.indexOf(restrictionValue(a, h))).filter((h) => h !== -1));
    if (Number.isFinite(min)) setAtPath(s, path, m[min]);
    else if (getAtPath(r, path) === void 0 && getAtPath(e, path) !== void 0) setAtPath(s, path, void 0);
  }
  if (e.strictPluginOnlyCustomization !== !0) {
    let a = uniq(
      n.flatMap((c) =>
        Array.isArray(c.strictPluginOnlyCustomization) ? c.strictPluginOnlyCustomization : [],
      ),
    );
    if (a.length > 0) e.strictPluginOnlyCustomization = a;
    else if (r?.strictPluginOnlyCustomization === void 0) delete e.strictPluginOnlyCustomization;
  }
}
//@ chunk-dcmhvw5a.js:495911-496051 placement
function getMergedPolicySources(e) {
  let mergedSources = e.store.policy.mergedSources;
  if (mergedSources !== void 0) return mergedSources.value;
  let r = mergedPolicySourceNames(e);
  return ((e.store.policy.mergedSources = { value: r }), r);
}
//@ chunk-dcmhvw5a.js:496051-496248 placement
function mergedPolicySourceNames(e) {
  if (armedHelperOutput(e).composes === "tier") return null;
  let { merged: merged, composed: composed } = resolvePolicySettings(e);
  if (!merged) return null;
  let s = [];
  if (composed.remote) s.push("remote");
  if (composed.mdm) s.push(getPolicySettingsOrigin_2());
  if (composed.file) s.push("file");
  return s;
}
//@ chunk-dcmhvw5a.js:496248-496719 placement
function armedHelperOutput(e) {
  let n = e.helper?.() ?? null;
  if (!n) return { composes: "none" };
  let r = e.helperArmedFromRemote?.() === !1 ? "tier" : "remoteSlot";
  if (e.helperMergesOutput?.() !== !0) return { composes: r, helper: n, mergedOver: null };
  if (!e.store.policy.mergedHelper) {
    let { base: base, mergedOver: mergedOver } =
      r === "remoteSlot"
        ? { base: parseRemoteManagedSettings(e).settings, mergedOver: "remote" }
        : helperBaseSettings(e);
    e.store.policy.mergedHelper = {
      helper: mergeHelperOutputOverBase(base, n),
      mergedOver: Object.keys(Fg(base)).length > 0 ? mergedOver : null,
    };
  }
  return { composes: r, ...e.store.policy.mergedHelper };
}
//@ chunk-dcmhvw5a.js:496719-496942 placement
function helperBaseSettings(e) {
  let n = readMdmSettings(e);
  if (resolvePolicySettings({ ...e, helper: void 0 }).present.mdm)
    return { base: n.settings, mergedOver: getPolicySettingsOrigin_2(), errors: n.errors };
  let r = e.file?.() ?? loadManagedFileSettings(e);
  return { base: r.settings, mergedOver: "file", errors: [...n.errors, ...r.errors] };
}
//@ chunk-dcmhvw5a.js:496942-496978 placement
function Fg(e) {
  return Uo(e ?? {}, POLICY_HELPER_CONFIG_KEYS);
}
//@ chunk-dcmhvw5a.js:496978-497188 placement
function overlayEnvByUpperName(e, n) {
  let r = new Map();
  for (let [a, c] of Object.entries(n)) {
    let upper = a.toUpperCase();
    if (!r.has(upper)) r.set(upper, c);
  }
  let s = {};
  for (let [a, c] of Object.entries(e)) s[a] = r.get(a.toUpperCase()) ?? c;
  return Object.assign(s, n);
}
//@ chunk-dcmhvw5a.js:497188-497302 placement
var HELPER_WHOLE_VALUE_KEYS = [
  "forceLoginOrgUUID",
  "gatewayInternalNetworks",
  "allowedHttpHookUrls",
  "httpHookAllowedEnvVars",
  "allowRead",
];
//@ chunk-dcmhvw5a.js:497302-497418 placement
function mergeHelperValue(e, n, r) {
  let s = r !== void 0 && n !== void 0 && HELPER_WHOLE_VALUE_KEYS.includes(r) ? n : mergePolicyValue(e, n, r);
  return s === n && Array.isArray(s) ? [...s] : s;
}
//@ chunk-dcmhvw5a.js:497418-497511 placement
function mergeHelperOutputOverBase(e, n) {
  let r = Fg(e),
    s = fj({}, r, n, mergeHelperValue);
  if (r.env && n.env) s.env = overlayEnvByUpperName(r.env, n.env);
  return s;
}
//@ chunk-dcmhvw5a.js:497511-497829 placement
function getMachineAdminTierSettings(e) {
  let n = armedHelperOutput(e);
  if (n.composes === "tier") return [n.helper];
  let {
      tiers: tiers,
      tierSources: tierSources,
      present: present,
      merged: merged,
      snapshotFirst: snapshotFirst,
      policyOnlyLeads: policyOnlyLeads,
    } = resolvePolicySettings(e),
    filtered = tiers.filter((h, y) =>
      tierSources[y] === "file" ? present.file : tierSources[y] !== "remote" && present.mdm,
    );
  if (merged) return filtered;
  if (policyOnlyLeads) {
    let h = getMachineAdminPolicyTier(e);
    return h === null ? [] : [h];
  }
  if (present.remote && !snapshotFirst) return [];
  return filtered.slice(0, 1);
}
//@ chunk-dcmhvw5a.js:497829-498043 placement
function getEveryMachineAdminTierSettings(e) {
  let n = e.mdm?.().userWritable === !0,
    r = armedHelperOutput(e);
  if (r.composes === "tier" && !helperMayBeUserControlled(e)) return [r.helper];
  let { tiers: tiers, tierSources: tierSources } = resolvePolicySettings(e),
    c = { remoteVerified: !1, mdmUserWritable: n };
  return tiers.filter((g, m) => isVouchedOrigin(tierSources[m], c));
}
//@ chunk-dcmhvw5a.js:498043-498178 placement
function getMachineAdminDocumentLoadErrors(e) {
  return [
    ...(e.mdm?.().userWritable === !0
      ? []
      : readMdmSettings(e).errors.filter((error) => error.userWritable !== !0)),
    ...(e.file?.() ?? loadManagedFileSettings(e)).errors,
  ];
}
//@ chunk-dcmhvw5a.js:498178-498510 placement
function isMachineAdminDocumentUnreadable(e) {
  let n = e.mdm?.().userWritable === !0;
  if (
    armedHelperOutput(e).composes === "tier" &&
    e.helperArmedFromUserWritableBase?.() === !1 &&
    e.helperMergesOutput?.() !== !0
  )
    return !1;
  let r = readMdmSettings(e);
  if (
    (!n && r.loadState === "didNotLoad") ||
    r.errors.some((error) => error.errorClass === "unreadable" && error.userWritable !== !0)
  )
    return !0;
  return loadStateOf(e.file?.() ?? loadManagedFileSettings(e)) === "didNotLoad";
}
//@ chunk-dcmhvw5a.js:498510-498630 placement
function policyTierSettings(e) {
  let n = armedHelperOutput(e);
  if (n.composes === "tier") return [n.helper];
  let { tiers: tiers, parentSlice: parentSlice } = resolvePolicySettings(e);
  return parentSlice ? [...tiers, parentSlice] : tiers;
}
//@ chunk-dcmhvw5a.js:498630-498795 placement
function getAdminPolicyTierSettings(e) {
  let adminTiers = e.store.policy.adminTiers;
  if (adminTiers !== void 0) return adminTiers;
  let r = armedHelperOutput(e),
    s = r.composes === "tier" ? [r.helper] : resolvePolicySettings(e).tiers;
  return ((e.store.policy.adminTiers = s), s);
}
//@ chunk-dcmhvw5a.js:498795-499268 placement
function getVouchedPolicyTierSettings(e, n) {
  let r = e.mdm?.().userWritable === !0,
    s = armedHelperOutput(e);
  if (s.composes === "tier")
    return e.helperArmedFromUserWritableBase?.() !== !1 || (e.helperMergesOutput?.() === !0 && r)
      ? []
      : [s.helper];
  let {
      tiers: tiers,
      tierSources: tierSources,
      parentSlice: parentSlice,
      parentNeverShutOut: parentNeverShutOut,
      merged: merged,
      snapshotFirst: snapshotFirst,
      fileNotHeld: fileNotHeld,
    } = resolvePolicySettings(e),
    b = { remoteVerified: n, mdmUserWritable: r },
    flattened = tiers.flatMap((C, w) => {
      let L = tierSources[w];
      if (!isVouchedOrigin(L, b)) return [];
      return L === "file" && fileNotHeld !== void 0 ? [fileNotHeld] : [C];
    });
  if (
    parentSlice !== null &&
    !parentNeverShutOut &&
    isVouchedOrigin(tierSources[merged && snapshotFirst ? 1 : 0], b)
  )
    flattened.push(parentSlice);
  return flattened;
}
//@ chunk-dcmhvw5a.js:499268-499426 placement
function isVouchedOrigin(e, { remoteVerified: remoteVerified, mdmUserWritable: mdmUserWritable }) {
  switch (e) {
    case "remote":
      return remoteVerified;
    case "plist":
    case "hklm":
      return !mdmUserWritable;
    case "file":
      return !0;
    case void 0:
      return !1;
  }
}
//@ chunk-dcmhvw5a.js:499426-499554 placement
function getShadowedMcpPolicySources(e) {
  if (armedHelperOutput(e).composes === "tier") return [];
  let { tiers: tiers, tierSources: tierSources } = resolvePolicySettings(e);
  return shadowedPolicyKeys(tiers, tierSources, getSettingsForSource_3("policySettings", e) ?? {});
}
//@ chunk-dcmhvw5a.js:499554-499702 placement
function shadowedPolicyKeys(e, n, r) {
  let s = { slot: r, adminTiers: e };
  return e.flatMap((a, c) => {
    let g = n[c],
      m = bp(a, s);
    return g !== void 0 && m.length > 0 ? [{ source: g, keys: m }] : [];
  });
}
//@ chunk-dcmhvw5a.js:499702-499782 placement
function parentManagedTierParticipates(e) {
  if (armedHelperOutput(e).composes === "tier") return !1;
  return resolvePolicySettings(e).parentIncluded;
}
//@ chunk-dcmhvw5a.js:499782-500012 placement
function isForceRemoteSettingsRefreshConfigured(e) {
  let {
    tiers: tiers,
    admin: admin,
    parentSlice: parentSlice,
  } = resolvePolicySettings({ ...e, helper: void 0 });
  if (tiers.some((a) => a.forceRemoteSettingsRefresh === !0)) return !0;
  if (!e.remote && refusedCopyForcesRefresh()) return !0;
  return !admin && !parentSlice && e.hkcu?.().settings.forceRemoteSettingsRefresh === !0;
}
//@ chunk-dcmhvw5a.js:500012-500136 placement
function getDurablePolicyTierSettings(e) {
  let durableTiers = e.store.policy.durableTiers;
  if (durableTiers !== void 0) return durableTiers;
  let r = durablePolicyTiers(e);
  return ((e.store.policy.durableTiers = r), r);
}
//@ chunk-dcmhvw5a.js:500136-500321 placement
function durablePolicyTiers(e) {
  let n = armedHelperOutput(e);
  if (n.composes === "tier") return [n.helper];
  let { tiers: tiers, admin: admin } = resolvePolicySettings(e);
  if (!admin) {
    let a = e.hkcu?.();
    if (a && Object.keys(a.settings).length > 0) return [a.settings];
  }
  return tiers;
}
//@ chunk-dcmhvw5a.js:500321-500461 placement
function getAdminAuthoredPolicySettings(e) {
  let adminAuthored = e.store.policy.adminAuthored;
  if (adminAuthored !== void 0) return adminAuthored.value;
  let r = adminAuthoredPolicy(e);
  return ((e.store.policy.adminAuthored = { value: r }), r);
}
//@ chunk-dcmhvw5a.js:500461-500702 placement
function adminAuthoredPolicy(e) {
  let n = armedHelperOutput(e);
  if (n.composes === "tier") return n.helper;
  let { admin: admin, parentSlice: parentSlice, snapshotFirst: snapshotFirst } = resolvePolicySettings(e);
  if (snapshotFirst) return getMachineAdminPolicyTier(e);
  if (admin) return admin;
  if (parentSlice) return null;
  let c = e.hkcu?.();
  return c && Object.keys(c.settings).length > 0 ? c.settings : null;
}

export {
  POLICY_HELPER_CONFIG_KEYS,
  hasEffectivePolicyContent,
  MANAGED_SOURCE_NOTICE_LABELS,
  loadStateOf,
  parentManagedTierParticipates,
  armedHelperOutput,
  getMergedPolicySources,
  resolvePolicySettings,
  getMachineAdminTierSettings,
  getEveryMachineAdminTierSettings,
  getMachineAdminDocumentLoadErrors,
  isMachineAdminDocumentUnreadable,
  getDurablePolicyTierSettings,
  getAdminPolicyTierSettings,
  getAdminAuthoredPolicySettings,
  getShadowedMcpPolicySources,
  isPolicyTier,
  getPolicySettingsOrigin,
  isForceRemoteSettingsRefreshConfigured,
  getVouchedPolicyTierSettings,
  getHostPolicyLoginPins,
  getShadowedManagedSources,
  getManagedSourcesInEffect,
  isPolicySlotAdminOrParentComposed,
  authoredPolicyContent,
  Xt,
  policyTierSettings,
  mergeAdminPolicies,
  MERGEABLE_POLICY_KEYS,
  adminAuthoredPolicy,
  adminDocumentPresent,
  combinedLoadState,
  hasPolicyContent,
  Ig,
  documentHasPolicyContent,
  helperBaseSettings,
  shadowedPolicyKeys,
};
