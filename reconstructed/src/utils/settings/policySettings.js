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
import { restrictiveTopLevelSettings, isDeepEmptyObject } from "./types.js";
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
  asArray,
  restrictionValue,
} from "./managedRestrictionKeys.js";
import { uniq } from "../collections.js";
import { getAllowedMcpServersFromTiers, unmanagedPolicyKeys } from "../../services/mcp/managedMcpPolicy.js";
import { getPlatform } from "../platform.js";
import { mergeWithAssigner_2 } from "./settingsSourceTrust.js";
import { explainUnloadableGuardHooks } from "./validation.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { refusedCopyForcesRefresh } from "../../services/remoteManagedSettings/remoteSettingsState.js";

//@ chunk-dcmhvw5a.js:485330-485500 placement
function getHostPolicyLoginPins(settingsContext) {
  let machineAdminPolicyTier = getMachineAdminPolicyTier(settingsContext);
  return {
    forceLoginMethod: machineAdminPolicyTier?.forceLoginMethod,
    forceLoginGatewayUrl: machineAdminPolicyTier?.forceLoginGatewayUrl,
    gatewayInternalNetworks: machineAdminPolicyTier?.gatewayInternalNetworks,
  };
}
//@ chunk-dcmhvw5a.js:485500-485824 placement
function getPolicySettingsOrigin(settingsContext) {
  let n = armedHelperOutput(settingsContext);
  if (n.composes === "tier") return "helper";
  let policySettings = resolvePolicySettings(settingsContext);
  if (n.composes === "remoteSlot" || policySettings.present.remote) return "remote";
  if (policySettings.present.mdm) return getPolicySettingsOrigin_2();
  if (policySettings.present.file) return "file";
  if (policySettings.parentSlice || policySettings.hostModelOverlay) return "parent";
  let s = settingsContext.hkcu?.();
  return s && Object.keys(s.settings).length > 0 ? "hkcu" : null;
}
//@ chunk-dcmhvw5a.js:485824-486235 placement
function getShadowedManagedSources(settingsContext) {
  let n = armedHelperOutput(settingsContext);
  let mergedOver = n.composes === "none" ? null : n.mergedOver;
  let policySettings = resolvePolicySettings(settingsContext);
  let a = [];
  if (n.composes === "tier") a.push("helper");
  if (n.composes === "remoteSlot" || policySettings.present.remote) a.push("remote");
  if (policySettings.present.mdm) a.push(getPolicySettingsOrigin_2());
  if (policySettings.present.file) a.push("file");
  let c = getMergedPolicySources(settingsContext) ?? [];
  let [g, ...m] = a;
  let filtered = m.filter((y) => y !== mergedOver && !c.includes(y));
  let h = settingsContext.hkcu?.();
  if (h && Object.keys(h.settings).length > 0 && (g || policySettings.parentSlice)) filtered.push("hkcu");
  return filtered;
}
//@ chunk-dcmhvw5a.js:486235-486587 placement
function getManagedSourcesInEffect(settingsContext) {
  let policySettings = resolvePolicySettings(settingsContext);
  let r = [];
  if (policySettings.present.remote) r.push("remote");
  if (policySettings.present.mdm) r.push(getPolicySettingsOrigin_2());
  if (policySettings.present.file) r.push("file");
  if (policySettings.parentSlice || policySettings.hostModelOverlay) r.push("parent");
  if (!policySettings.admin && !policySettings.parentSlice) {
    let s = settingsContext.hkcu?.();
    if (s && Object.keys(s.settings).length > 0) r.push("hkcu");
  }
  return {
    sources: r,
    behavior: policySettings.mode === "merge" ? "merge" : "first-wins",
  };
}
//@ chunk-dcmhvw5a.js:486587-486698 placement
function isPolicySlotAdminOrParentComposed(settingsContext) {
  if (armedHelperOutput(settingsContext).composes === "tier") return true;
  let { admin, parentSlice } = resolvePolicySettings(settingsContext);
  return admin !== null || parentSlice !== null;
}
//@ chunk-dcmhvw5a.js:486698-491649 placement
function resolvePolicySettings(e) {
  let n = [];
  let remoteManagedSettings = parseRemoteManagedSettings(e);
  let { settings, servedSnapshot } = remoteManagedSettings;
  n.push(...remoteManagedSettings.errors);
  let c = armedHelperOutput(e);
  let g = c.composes === "remoteSlot" ? c.helper : policyContentOrNull(settings);
  let mdmSettings = readMdmSettings(e);
  let settings_2 = mdmSettings.settings;
  n.push(...mdmSettings.errors);
  let h = policyContentOrNull(settings_2);
  let y = e.file?.() ?? loadManagedFileSettings(e);
  let settings_3 = y.settings;
  n.push(...y.errors);
  let S = policyContentOrNull(settings_3);
  let C = authoredPolicyContent(mdmSettings);
  let w = authoredPolicyContent(y);
  let L = w && y.heldOnly === true;
  let v = e.policyOnlyServerTier?.() === "unconfirmed" && ((C && e.mdm?.().userWritable !== true) || w);
  let j = v && g ? restrictiveParentSlice(g) : g;
  let x = !v && (c.composes === "remoteSlot" ? j !== null : authoredPolicyContent(remoteManagedSettings));
  let K = policyRank(j, x);
  let q = policyRank(h, C);
  let ee = y.onlyHeldContent ? POLICY_RANK_NONE : policyRank(S, w);
  let Z = !v && j !== null && K >= Math.max(q, ee);
  let ae = h !== null && q >= ee;
  let me = [
    [v ? null : settings, Z],
    [settings_2, ae],
    [settings_3, S !== null],
  ];
  let managedSourcesBehavior = (
    c.composes === "remoteSlot"
      ? c.helper
      : me.find(
          ([ce, we]) =>
            ce !== null &&
            (ce === settings && servedSnapshot ? we : ce.managedSourcesBehavior !== undefined || we),
        )?.[0]
  )?.managedSourcesBehavior;
  let P = v ? j : null;
  let R = j !== null && !Z;
  let N = R ? null : j;
  let G = h !== null && !ae && N === null;
  let Q = G ? null : h;
  let se = [];
  let ne = [
    [R, "remote", j],
    [G, getPolicySettingsOrigin_2(), h],
  ];
  for (let [ce, we, ve] of ne) {
    if (!ce || ve === null) continue;
    se.push([ve, we]);
    if (!hasEffectivePolicyContent(ve) || ve === P) continue;
    let ut = we === "remote" && C ? getPolicySettingsOrigin_2() : "file";
    n.push({
      file: MANAGED_SOURCE_NOTICE_LABELS[we],
      path: Object.keys(ve).find((key) => !restrictiveTopLevelSettings.includes(key)) ?? "",
      message: `${MANAGED_SOURCE_NOTICE_LABELS[we]} holds only values that could not be applied as written, so ${MANAGED_SOURCE_NOTICE_LABELS[ut]} supplies the managed settings while that fail-closed reading still binds beside it (the most restrictive value of each such key applies), until it is fixed.`,
      severity: "warning",
      statusOnly: true,
    });
  }
  let { settings: settings_4, errors } = parseParentManagedSettings(e);
  n.push(...errors);
  let parentTierWithOrganization = parseParentTierWithOrganization(e);
  n.push(...(parentTierWithOrganization?.errors ?? []));
  let settings_5 = parentTierWithOrganization?.settings ?? settings_4;
  let Ae = N !== null && servedSnapshot && c.composes !== "remoteSlot";
  let Ye = !(N !== null && x && !Ae) && !(Q !== null && C);
  let Je = Ye && (!w || L);
  let Pe = Je && L;
  let fe =
    Pe && settings_5 && S
      ? Uo(
          S,
          MERGEABLE_POLICY_KEYS.filter((ce) => settings_5[ce] !== undefined),
        )
      : S;
  let qe = (C ? Q : null) ?? (w ? S : null);
  let Zg = settings_5 !== null && (qe === null || adminTierComposesParent(qe) || Pe);
  let filtered = [
    keepMergeablePolicyKeys(N, servedSnapshot && c.composes !== "remoteSlot", [
      Q,
      fe && Uo(fe, y.heldAllowLists ?? []),
      ...(Zg ? [wS(settings_5, MERGEABLE_POLICY_KEYS)] : []),
    ]),
    Q,
    fe,
    ...se.map(([ce]) => ce),
  ].filter((ce) => ce !== null);
  let tierSources = [
    ...(N !== null ? ["remote"] : []),
    ...(Q !== null ? [getPolicySettingsOrigin_2()] : []),
    ...(S !== null ? ["file"] : []),
    ...se.map(([, ce]) => ce),
  ];
  let Qs = (ce) => filtered.some((we) => we !== fe && we[ce] !== undefined);
  let Ko =
    fe !== null &&
    y.onlyHeldContent === true &&
    Ye &&
    managedSourcesBehavior !== "merge" &&
    filtered[0] !== fe;
  let Fo = N !== null && e.policyOnlyServerTier?.() !== undefined;
  let { admin, merged } = mergeAdminPolicies(
    Ko ? filtered.filter((ce) => ce !== fe) : filtered,
    managedSourcesBehavior,
    Ae,
    Ko ? filtered.length - 2 : se.length,
    Fo,
  );
  let ei = (ce) =>
    shouldAllowManagedMcpServersOnly({
      slot: ce,
      adminTiers: filtered,
    }) ||
    (settings_5?.allowManagedMcpServersOnly === true && ce?.allowManagedMcpServersOnly !== false);
  let ni = (ce, we) =>
    merged
      ? Qs(ce)
      : (filtered[0] !== fe && filtered[0]?.[ce] !== undefined) ||
        (ce === "allowedMcpServers" && Qs(ce) && ei(we));
  let Tt =
    admin && fe && Ko
      ? mergeAdminPolicies(
          [
            admin,
            Uo(
              fe,
              MERGEABLE_POLICY_KEYS_2.filter((ce) => ni(ce, admin)),
            ),
          ],
          "merge",
          false,
          0,
        ).admin
      : admin && P && !merged
        ? mergeAdminPolicies([admin, P], "merge", false, 0).admin
        : admin;
  if (Fo && Tt !== null) {
    let { kept } = machineBeneathPolicyOnly(e);
    for (let we of KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER) {
      let atPath = getAtPath(kept, we);
      let atPath_2 = getAtPath(Tt, we);
      if (atPath !== undefined)
        setAtPath(
          Tt,
          we,
          ADDED_TO_A_POLICY_ONLY_TIER.includes(we.join(".")) &&
            Array.isArray(atPath) &&
            Array.isArray(atPath_2)
            ? uniq([...atPath_2, ...atPath])
            : atPath,
        );
    }
  }
  let qt = Tt === null ? [remoteManagedSettings, mdmSettings, y].find(isPolicyTier) : undefined;
  let nt = Tt ?? (qt ? {} : null);
  let jo = {
    remote: N !== null || qt === remoteManagedSettings,
    mdm: Q !== null || qt === mdmSettings,
    file: S !== null || qt === y,
  };
  let ri = [];
  if (merged) {
    let ce = jo.remote ? "remote" : jo.mdm ? getPolicySettingsOrigin_2() : "file";
    let we = [
      [Q, getPolicySettingsOrigin_2()],
      [fe, "file"],
    ];
    for (let [ve, ut] of we) {
      if (ve === null || ve === filtered[0] || (Ae && ve === filtered[1])) continue;
      let filtered_2 = POLICY_HELPER_CONFIG_KEYS.filter((Jo) =>
        Object.values(ve[Jo] ?? {}).some((ai) => ai !== undefined && ai !== null),
      );
      let [ii] = filtered_2;
      if (ii === undefined) continue;
      ri.push(ut);
      n.push({
        file: MANAGED_SOURCE_NOTICE_LABELS[ut],
        path: ii,
        message: `${filtered_2.map((Jo) => `"${Jo}"`).join(" and ")} in ${MANAGED_SOURCE_NOTICE_LABELS[ut]} ignored: policy helper configuration is read from the highest managed settings source only (${MANAGED_SOURCE_NOTICE_LABELS[ce]} here), even with managedSourcesBehavior "merge". Configure the helper in that source instead.`,
        severity: "warning",
        statusOnly: true,
      });
    }
  }
  let Bo = (ce) =>
    ce !== null && (ce === filtered[0] || Object.keys(Uo(ce, winnerOnlyUnderMerge())).length > 0);
  let composed = {
    remote: Bo(N),
    mdm: Bo(Q),
    file: Bo(fe),
  };
  let Zt = {
    allowManagedPermissionRulesOnly:
      filtered.some((ce) => ce.allowManagedPermissionRulesOnly === true) || undefined,
    forceLoginOrgUUID: nt?.forceLoginOrgUUID,
    ...wS(nt ?? {}, MERGEABLE_POLICY_KEYS),
    hooks: nt?.hooks,
    enabledPlugins: nt?.enabledPlugins,
    allowedMcpServers: ei(nt)
      ? getAllowedMcpServersFromTiers({
          slot: nt,
          adminTiers: filtered,
        })
      : nt?.allowedMcpServers,
    sandbox: {
      network: {
        allowManagedDomainsOnly:
          filtered.some((ce) => ce.sandbox?.network?.allowManagedDomainsOnly === true) || undefined,
      },
      filesystem: {
        allowManagedReadPathsOnly:
          filtered.some((ce) => ce.sandbox?.filesystem?.allowManagedReadPathsOnly === true) || undefined,
      },
    },
  };
  let Vo = shouldIncludeParentTier(Tt, Je);
  let Tn = Pe && settings_5 ? fillMissingPolicyKeys(settings_5, Zt) : settings_5;
  let si =
    Vo && settings_5 && !Pe
      ? MERGEABLE_POLICY_KEYS.filter(
          (ce) =>
            settings_5[ce] !== undefined &&
            y.heldAllowLists?.includes(ce) === true &&
            En(Zt[ce], S?.[ce]) &&
            !ni(ce, nt),
        )
      : [];
  let Yo =
    (Tn || isDisableAllHooksSet(e.parentManaged)) && Vo
      ? Pe
        ? keepRestrictiveFromParent(
            Tn ?? {},
            {
              ...Zt,
              allowManagedPermissionRulesOnly: true,
              sandbox: {
                network: {
                  allowManagedDomainsOnly: true,
                },
                filesystem: {
                  allowManagedReadPathsOnly: true,
                },
              },
            },
            e.parentManaged,
            e.parentOrganizationSettings?.own,
          )
        : keepRestrictiveFromParent(Tn ?? {}, Uo(Zt, si), e.parentManaged, e.parentOrganizationSettings?.own)
      : null;
  let parentSlice = Yo && Object.keys(Yo).length > 0 ? Yo : null;
  let hostModelOverlay = hostManagedModelOverlay(
    settings_5 === settings_4 ? Tn : Pe && settings_4 ? fillMissingPolicyKeys(settings_4, Zt) : settings_4,
    e.hostManagedProvider,
  );
  return {
    tiers: filtered,
    tierSources,
    admin: nt,
    parentSlice,
    hostModelOverlay,
    errors: n,
    present: jo,
    mode: managedSourcesBehavior,
    merged,
    composed,
    snapshotFirst: Ae,
    parentNeverShutOut: Je,
    shadowedHelperSources: ri,
    parentIncluded: Vo,
    heldEmpty: qt !== undefined,
    fileNotHeld: y.settingsNotHeld,
    heldInTheHostsPlace: si,
    policyOnlyLeads: Fo,
  };
}
//@ chunk-dcmhvw5a.js:491649-492327 placement
/**
 * 合并管理员策略层。
 */
function mergeAdminPolicies(e, managedSourcesBehavior, r, s, a = false) {
  let c = e[0];
  if (!c)
    return {
      admin: null,
      merged: false,
    };
  let { managedSourcesBehavior: managedSourcesBehavior_2, ...m } = c;
  let f = managedSourcesBehavior === "merge" && e.length >= 2;
  if (!f && s === 0 && !a)
    return {
      admin: managedSourcesBehavior_2 === undefined ? c : m,
      merged: false,
    };
  let mapped = e.slice(f || a ? 1 : e.length - s).map((b, S) => {
    let C = f && r && S === 0;
    let w = C
      ? {
          ...b,
        }
      : Uo(b, winnerOnlyUnderMerge());
    if (!C) {
      for (let v of WINNER_ONLY_NESTED_UNDER_MERGE)
        if (getAtPath(w, v) !== undefined) setAtPath(w, v, undefined);
    }
    let atPath = getAtPath(w.sandbox, ["enabledPlatforms"]);
    if (Array.isArray(atPath) && atPath.includes(getPlatform()))
      setAtPath(w, ["sandbox", "enabledPlatforms"], undefined);
    else if (atPath !== undefined) delete w.sandbox;
    return w;
  });
  if (!f) {
    mostRestrictivePolicy(m, [c, ...mapped]);
    return {
      admin: m,
      merged: false,
    };
  }
  let y = {};
  for (let b of [...mapped].reverse()) mergeWithAssigner_2(y, b, mergePolicyValue);
  mergeWithAssigner_2(y, m, r ? applyPolicyKeyChange : mergePolicyValue);
  mostRestrictivePolicy(y, [c, ...mapped]);
  pickModelOverrides(y, [c, ...mapped], r);
  return {
    admin: y,
    merged: true,
  };
}
//@ chunk-dcmhvw5a.js:492327-492501 placement
var POLICY_HELPER_CONFIG_KEYS = ["policyHelper", "policyHelpers"];
var MANAGED_SOURCE_NOTICE_LABELS = {
  remote: "server-managed settings",
  plist: "the managed preferences plist",
  hklm: "the HKLM policy key",
  file: "managed-settings.json",
};
//@ chunk-dcmhvw5a.js:492501-492566 placement
function hasPolicyContent(e) {
  return Object.keys(e).some((key) => !restrictiveTopLevelSettings.includes(key));
}
//@ chunk-dcmhvw5a.js:492566-492646 placement
function hasEffectivePolicyContent(e) {
  return Object.entries(e).some(
    ([key, value]) => !restrictiveTopLevelSettings.includes(key) && !isDeepEmptyObject(value),
  );
}
//@ chunk-dcmhvw5a.js:492646-492685 placement
function policyContentOrNull(settings) {
  return settings && hasPolicyContent(settings) ? settings : null;
}
//@ chunk-dcmhvw5a.js:492685-492763 placement
function authoredPolicyContent(e) {
  return e.settings !== null && hasEffectivePolicyContent(e.settings) && !e.onlySubstitutes;
}
//@ chunk-dcmhvw5a.js:492763-492848 placement
/**
 * explainedPolicyChange：说明策略变化。
 */
function explainedPolicyChange(e, settings, r) {
  return authoredPolicyContent({
    settings,
  }) && !r.some((s) => s.onlySubstitutes)
    ? explainUnloadableGuardHooks(e)
    : e;
}
//@ chunk-dcmhvw5a.js:492848-492857 placement
var POLICY_RANK_NONE = 0;
//@ chunk-dcmhvw5a.js:492857-492928 placement
function policyRank(e, n) {
  if (e === null) return -1;
  if (n) return 2;
  return hasEffectivePolicyContent(e) ? 1 : POLICY_RANK_NONE;
}
//@ chunk-dcmhvw5a.js:492928-493040 placement
function documentHasPolicyContent(e, n) {
  return (
    Object.entries(e).some(
      ([key, value]) =>
        value !== null && !isPolicyContentKey(key, value) && !restrictiveTopLevelSettings.includes(key),
    ) ||
    (n !== null && hasPolicyContent(n))
  );
}
//@ chunk-dcmhvw5a.js:493040-493128 placement
function isPolicyTier(settingsFile) {
  return (
    settingsFile.documentHasPolicyContent ??
    (settingsFile.settings !== null && hasPolicyContent(settingsFile.settings))
  );
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
  return e.userWritable !== true && (isPolicyTier(e) || e.loadState === "didNotLoad");
}
//@ chunk-dcmhvw5a.js:493410-493633 placement
function pickModelOverrides(e, n, r) {
  let index = n.findIndex((c) => c.availableModels !== undefined);
  let index_2 = n.findIndex((c) => c.modelOverrides !== undefined);
  if (index_2 !== -1 && (index === -1 || index_2 <= index || (r && index === 0)))
    e.modelOverrides = {
      ...n[index_2].modelOverrides,
    };
  else delete e.modelOverrides;
}
//@ chunk-dcmhvw5a.js:493633-493775 placement
var WHOLE_VALUE_POLICY_KEYS = [
  "allowedMcpServers",
  "availableModels",
  "strictKnownMarketplaces",
  "allowedChannelPlugins",
  "allowedProviders",
];
var SANDBOX_REPLACE_KEYS = ["awsPairs", "ripgrep"];
//@ chunk-dcmhvw5a.js:493775-493964 placement
function replacePolicyValue(e, n, r) {
  if (n === undefined) return e;
  if (Array.isArray(n))
    return r === "awsPairs" && Array.isArray(e) ? [...n, ...missingAwsPairs(e, n)] : [...n];
  if (!isPlainObject_2(n)) return n;
  return xr(n, (s) => (Array.isArray(s) ? [...s] : s));
}
//@ chunk-dcmhvw5a.js:493964-494338 placement
/**
 * 可合并的策略键。
 */
var MERGEABLE_POLICY_KEYS_2 = [
  "allowedMcpServers",
  "availableModels",
  "strictKnownMarketplaces",
  "allowedChannelPlugins",
  "allowedProviders",
  "allowedMarketplaces",
  "allowedHttpHookUrls",
  "httpHookAllowedEnvVars",
];
var MERGEABLE_POLICY_KEYS = [
  "allowedMcpServers",
  "availableModels",
  "strictKnownMarketplaces",
  "allowedProviders",
];
var mergeablePolicyKeys = [
  ["allowManagedMcpServersOnly", "allowedMcpServers"],
  ["enforceAvailableModels", "availableModels"],
];
//@ chunk-dcmhvw5a.js:494338-494430 placement
function fillMissingPolicyKeys(settings, n) {
  return Uo(
    settings,
    mergeablePolicyKeys.filter(([, r]) => settings[r] === undefined && n[r] === undefined).map(([r]) => r),
  );
}
//@ chunk-dcmhvw5a.js:494430-494721 placement
var RESTRICTIVE_PARENT_KEYS = [
  ...mergeablePolicyKeys.map(([e]) => e),
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
  return policyContentOrNull(
    keepRestrictiveFromParent(Uo(e, RESTRICTIVE_PARENT_KEYS), {
      ...Object.fromEntries(MERGEABLE_POLICY_KEYS.map((n) => [n, []])),
      forceLoginOrgUUID: [],
      allowManagedPermissionRulesOnly: true,
      sandbox: {
        network: {
          allowManagedDomainsOnly: true,
        },
        filesystem: {
          allowManagedReadPathsOnly: true,
        },
      },
    }),
  );
}
//@ chunk-dcmhvw5a.js:494951-495076 placement
function keepMergeablePolicyKeys(e, n, r) {
  if (e === null || !n) return e;
  let filtered = MERGEABLE_POLICY_KEYS_2.filter((a) => r.some((c) => c?.[a] !== undefined));
  return filtered.length === 0 ? e : Uo(e, filtered);
}
//@ chunk-dcmhvw5a.js:495076-495177 placement
function mergePolicyValue(e, n, r) {
  if (r !== undefined && (WHOLE_VALUE_POLICY_KEYS.includes(r) || SANDBOX_REPLACE_KEYS.includes(r)))
    return replacePolicyValue(e, n, r);
  return unionPolicyArrays(e, n, r);
}
//@ chunk-dcmhvw5a.js:495177-495260 placement
function applyPolicyKeyChange(e, n, r) {
  if (r !== undefined && WHOLE_VALUE_POLICY_KEYS.includes(r)) return replacePolicyValue(e, n, r);
  return unionPolicyArrays(e, n, r);
}
//@ chunk-dcmhvw5a.js:495260-495377 placement
function unionPolicyArrays(e, n, r) {
  if (Array.isArray(e) && Array.isArray(n) && r !== "fallbackModel") return uniq([...n, ...e]);
  return settingsMergeCustomizer(e, n, r);
}
//@ chunk-dcmhvw5a.js:495377-495911 placement
/**
 * 多个策略中取最严格的值。
 */
function mostRestrictivePolicy(e, n) {
  let r = n[0];
  let s = e;
  for (let a of MANAGED_RESTRICTION_KEYS()) {
    let { path, restrictive } = a;
    let m = asArray(restrictive);
    let min = Math.min(...n.map((h) => m.indexOf(restrictionValue(a, h))).filter((h) => h !== -1));
    if (Number.isFinite(min)) setAtPath(s, path, m[min]);
    else if (getAtPath(r, path) === undefined && getAtPath(e, path) !== undefined)
      setAtPath(s, path, undefined);
  }
  if (e.strictPluginOnlyCustomization !== true) {
    let a = uniq(
      n.flatMap((c) =>
        Array.isArray(c.strictPluginOnlyCustomization) ? c.strictPluginOnlyCustomization : [],
      ),
    );
    if (a.length > 0) e.strictPluginOnlyCustomization = a;
    else if (r?.strictPluginOnlyCustomization === undefined) delete e.strictPluginOnlyCustomization;
  }
}
//@ chunk-dcmhvw5a.js:495911-496051 placement
function getMergedPolicySources(e) {
  let mergedSources = e.store.policy.mergedSources;
  if (mergedSources !== undefined) return mergedSources.value;
  let r = mergedPolicySourceNames(e);
  e.store.policy.mergedSources = {
    value: r,
  };
  return r;
}
//@ chunk-dcmhvw5a.js:496051-496248 placement
function mergedPolicySourceNames(e) {
  if (armedHelperOutput(e).composes === "tier") return null;
  let { merged, composed } = resolvePolicySettings(e);
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
  if (!n)
    return {
      composes: "none",
    };
  let r = e.helperArmedFromRemote?.() === false ? "tier" : "remoteSlot";
  if (e.helperMergesOutput?.() !== true)
    return {
      composes: r,
      helper: n,
      mergedOver: null,
    };
  if (!e.store.policy.mergedHelper) {
    let { base, mergedOver } =
      r === "remoteSlot"
        ? {
            base: parseRemoteManagedSettings(e).settings,
            mergedOver: "remote",
          }
        : helperBaseSettings(e);
    e.store.policy.mergedHelper = {
      helper: mergeHelperOutputOverBase(base, n),
      mergedOver: Object.keys(pickPolicyHelperConfigKeys(base)).length > 0 ? mergedOver : null,
    };
  }
  return {
    composes: r,
    ...e.store.policy.mergedHelper,
  };
}
//@ chunk-dcmhvw5a.js:496719-496942 placement
function helperBaseSettings(e) {
  let mdmSettings = readMdmSettings(e);
  if (
    resolvePolicySettings({
      ...e,
      helper: undefined,
    }).present.mdm
  )
    return {
      base: mdmSettings.settings,
      mergedOver: getPolicySettingsOrigin_2(),
      errors: mdmSettings.errors,
    };
  let r = e.file?.() ?? loadManagedFileSettings(e);
  return {
    base: r.settings,
    mergedOver: "file",
    errors: [...mdmSettings.errors, ...r.errors],
  };
}
//@ chunk-dcmhvw5a.js:496942-496978 placement
function pickPolicyHelperConfigKeys(e) {
  return Uo(e ?? {}, POLICY_HELPER_CONFIG_KEYS);
}
//@ chunk-dcmhvw5a.js:496978-497188 placement
function overlayEnvByUpperName(env, env_2) {
  let r = new Map();
  for (let [key, value] of Object.entries(env_2)) {
    let upper = key.toUpperCase();
    if (!r.has(upper)) r.set(upper, value);
  }
  let s = {};
  for (let [key, value] of Object.entries(env)) s[key] = r.get(key.toUpperCase()) ?? value;
  return Object.assign(s, env_2);
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
  let s =
    r !== undefined && n !== undefined && HELPER_WHOLE_VALUE_KEYS.includes(r) ? n : mergePolicyValue(e, n, r);
  return s === n && Array.isArray(s) ? [...s] : s;
}
//@ chunk-dcmhvw5a.js:497418-497511 placement
function mergeHelperOutputOverBase(base, n) {
  let r = pickPolicyHelperConfigKeys(base);
  let s = mergeWithAssigner_2({}, r, n, mergeHelperValue);
  if (r.env && n.env) s.env = overlayEnvByUpperName(r.env, n.env);
  return s;
}
//@ chunk-dcmhvw5a.js:497511-497829 placement
function getMachineAdminTierSettings(settingsContext) {
  let n = armedHelperOutput(settingsContext);
  if (n.composes === "tier") return [n.helper];
  let { tiers, tierSources, present, merged, snapshotFirst, policyOnlyLeads } =
    resolvePolicySettings(settingsContext);
  let filtered = tiers.filter((tier, y) =>
    tierSources[y] === "file" ? present.file : tierSources[y] !== "remote" && present.mdm,
  );
  if (merged) return filtered;
  if (policyOnlyLeads) {
    let machineAdminPolicyTier = getMachineAdminPolicyTier(settingsContext);
    return machineAdminPolicyTier === null ? [] : [machineAdminPolicyTier];
  }
  if (present.remote && !snapshotFirst) return [];
  return filtered.slice(0, 1);
}
//@ chunk-dcmhvw5a.js:497829-498043 placement
function getEveryMachineAdminTierSettings(settingsContext) {
  let mdmUserWritable = settingsContext.mdm?.().userWritable === true;
  let r = armedHelperOutput(settingsContext);
  if (r.composes === "tier" && !helperMayBeUserControlled(settingsContext)) return [r.helper];
  let { tiers, tierSources } = resolvePolicySettings(settingsContext);
  let c = {
    remoteVerified: false,
    mdmUserWritable,
  };
  return tiers.filter((tier, m) => isVouchedOrigin(tierSources[m], c));
}
//@ chunk-dcmhvw5a.js:498043-498178 placement
function getMachineAdminDocumentLoadErrors(settingsContext) {
  return [
    ...(settingsContext.mdm?.().userWritable === true
      ? []
      : readMdmSettings(settingsContext).errors.filter((error) => error.userWritable !== true)),
    ...(settingsContext.file?.() ?? loadManagedFileSettings(settingsContext)).errors,
  ];
}
//@ chunk-dcmhvw5a.js:498178-498510 placement
function isMachineAdminDocumentUnreadable(e) {
  let n = e.mdm?.().userWritable === true;
  if (
    armedHelperOutput(e).composes === "tier" &&
    e.helperArmedFromUserWritableBase?.() === false &&
    e.helperMergesOutput?.() !== true
  )
    return false;
  let mdmSettings = readMdmSettings(e);
  if (
    (!n && mdmSettings.loadState === "didNotLoad") ||
    mdmSettings.errors.some((error) => error.errorClass === "unreadable" && error.userWritable !== true)
  )
    return true;
  return loadStateOf(e.file?.() ?? loadManagedFileSettings(e)) === "didNotLoad";
}
//@ chunk-dcmhvw5a.js:498510-498630 placement
function policyTierSettings(e) {
  let n = armedHelperOutput(e);
  if (n.composes === "tier") return [n.helper];
  let { tiers, parentSlice } = resolvePolicySettings(e);
  return parentSlice ? [...tiers, parentSlice] : tiers;
}
//@ chunk-dcmhvw5a.js:498630-498795 placement
function getAdminPolicyTierSettings(settingsContext) {
  let adminTiers = settingsContext.store.policy.adminTiers;
  if (adminTiers !== undefined) return adminTiers;
  let r = armedHelperOutput(settingsContext);
  let s = r.composes === "tier" ? [r.helper] : resolvePolicySettings(settingsContext).tiers;
  settingsContext.store.policy.adminTiers = s;
  return s;
}
//@ chunk-dcmhvw5a.js:498795-499268 placement
function getVouchedPolicyTierSettings(settingsContext, remoteVerified) {
  let r = settingsContext.mdm?.().userWritable === true;
  let s = armedHelperOutput(settingsContext);
  if (s.composes === "tier")
    return settingsContext.helperArmedFromUserWritableBase?.() !== false ||
      (settingsContext.helperMergesOutput?.() === true && r)
      ? []
      : [s.helper];
  let { tiers, tierSources, parentSlice, parentNeverShutOut, merged, snapshotFirst, fileNotHeld } =
    resolvePolicySettings(settingsContext);
  let b = {
    remoteVerified,
    mdmUserWritable: r,
  };
  let flattened = tiers.flatMap((tier, w) => {
    let L = tierSources[w];
    if (!isVouchedOrigin(L, b)) return [];
    return L === "file" && fileNotHeld !== undefined ? [fileNotHeld] : [tier];
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
function isVouchedOrigin(e, { remoteVerified, mdmUserWritable }) {
  switch (e) {
    case "remote":
      return remoteVerified;
    case "plist":
    case "hklm":
      return !mdmUserWritable;
    case "file":
      return true;
    case undefined:
      return false;
  }
}
//@ chunk-dcmhvw5a.js:499426-499554 placement
function getShadowedMcpPolicySources(settingsContext) {
  if (armedHelperOutput(settingsContext).composes === "tier") return [];
  let { tiers, tierSources } = resolvePolicySettings(settingsContext);
  return shadowedPolicyKeys(
    tiers,
    tierSources,
    getSettingsForSource_3("policySettings", settingsContext) ?? {},
  );
}
//@ chunk-dcmhvw5a.js:499554-499702 placement
function shadowedPolicyKeys(tiers, tierSources, slot) {
  let s = {
    slot,
    adminTiers: tiers,
  };
  return tiers.flatMap((a, c) => {
    let g = tierSources[c];
    let m = unmanagedPolicyKeys(a, s);
    return g !== undefined && m.length > 0
      ? [
          {
            source: g,
            keys: m,
          },
        ]
      : [];
  });
}
//@ chunk-dcmhvw5a.js:499702-499782 placement
function parentManagedTierParticipates(settingsContext) {
  if (armedHelperOutput(settingsContext).composes === "tier") return false;
  return resolvePolicySettings(settingsContext).parentIncluded;
}
//@ chunk-dcmhvw5a.js:499782-500012 placement
function isForceRemoteSettingsRefreshConfigured(settingsContext) {
  let { tiers, admin, parentSlice } = resolvePolicySettings({
    ...settingsContext,
    helper: undefined,
  });
  if (tiers.some((tier) => tier.forceRemoteSettingsRefresh === true)) return true;
  if (!settingsContext.remote && refusedCopyForcesRefresh()) return true;
  return !admin && !parentSlice && settingsContext.hkcu?.().settings.forceRemoteSettingsRefresh === true;
}
//@ chunk-dcmhvw5a.js:500012-500136 placement
function getDurablePolicyTierSettings(settingsContext) {
  let durableTiers = settingsContext.store.policy.durableTiers;
  if (durableTiers !== undefined) return durableTiers;
  let r = durablePolicyTiers(settingsContext);
  settingsContext.store.policy.durableTiers = r;
  return r;
}
//@ chunk-dcmhvw5a.js:500136-500321 placement
function durablePolicyTiers(e) {
  let n = armedHelperOutput(e);
  if (n.composes === "tier") return [n.helper];
  let { tiers, admin } = resolvePolicySettings(e);
  if (!admin) {
    let a = e.hkcu?.();
    if (a && Object.keys(a.settings).length > 0) return [a.settings];
  }
  return tiers;
}
//@ chunk-dcmhvw5a.js:500321-500461 placement
function getAdminAuthoredPolicySettings(settingsContext) {
  let adminAuthored = settingsContext.store.policy.adminAuthored;
  if (adminAuthored !== undefined) return adminAuthored.value;
  let r = adminAuthoredPolicy(settingsContext);
  settingsContext.store.policy.adminAuthored = {
    value: r,
  };
  return r;
}
//@ chunk-dcmhvw5a.js:500461-500702 placement
function adminAuthoredPolicy(e) {
  let n = armedHelperOutput(e);
  if (n.composes === "tier") return n.helper;
  let { admin, parentSlice, snapshotFirst } = resolvePolicySettings(e);
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
  MERGEABLE_POLICY_KEYS,
  policyTierSettings,
  mergeAdminPolicies,
  MERGEABLE_POLICY_KEYS_2,
  adminAuthoredPolicy,
  adminDocumentPresent,
  combinedLoadState,
  hasPolicyContent,
  explainedPolicyChange,
  documentHasPolicyContent,
  helperBaseSettings,
  shadowedPolicyKeys,
};
