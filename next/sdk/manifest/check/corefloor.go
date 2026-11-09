package check

import (
	"slices"

	"github.com/Masterminds/semver/v3"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// StreamOnlyFirstCore is the first core that executes
// accountTypes[].platforms[].streamOnly and converts within one platform
// (CONTRACTS §83). The same core first applies plugin body patches to every
// WebSocket turn (CONTRACTS §83.6); that has no manifest declaration, so it
// needs no floor of its own.
const StreamOnlyFirstCore = "0.1.257"

// AttemptHookFirstCore is the first core that runs gateway.attempt hooks and
// honours skip_attempt_hooks (CONTRACTS §85). Older cores refuse the hook
// point at install, so the floor only turns that into a clear hostCompat
// error.
const AttemptHookFirstCore = "0.1.258"

// ConvertMatrixFirstCore is the first core of the protocol conversion
// matrix (CONTRACTS §88), which adds the openai.responses -> openai.chat
// conversion within the openai platform.
const ConvertMatrixFirstCore = "0.1.262"

// SamePlatformConversions are the core's protocol converters whose two
// protocols belong to one platform (client, upstream). The gateway's
// convert.Default() is checked against this list in its tests.
var SamePlatformConversions = [][2]string{{"openai.chat", "openai.responses"}, {"openai.responses", "openai.chat"}}

// samePlatformFirstCore is the first core converting a pair of
// SamePlatformConversions; StreamOnlyFirstCore when not listed.
var samePlatformFirstCore = map[[2]string]string{{"openai.responses", "openai.chat"}: ConvertMatrixFirstCore}

// coreFloor is a manifest declaration an older core accepts and ignores
// (plugin/pkg.ParseManifest tolerates unknown fields), so a plugin relying on
// it must keep those cores out with hostCompat. Like uiFloors for the UI.
type coreFloor struct {
	field     string // the field the error names
	firstCore string // first core that honours it
	uses      func(*validator) bool
}

var coreFloors = []coreFloor{
	{field: "accountTypes[].platforms[].streamOnly", firstCore: StreamOnlyFirstCore, uses: func(v *validator) bool {
		for _, at := range v.m.AccountTypes {
			for _, ap := range at.Platforms {
				if len(ap.StreamOnly) > 0 {
					return true
				}
			}
		}
		return false
	}},
	{field: "accountTypes[].platforms[].endpoints (served through a same-platform conversion)", firstCore: StreamOnlyFirstCore,
		uses: usesSamePlatformConversion(StreamOnlyFirstCore)},
	{field: "accountTypes[].platforms[].endpoints (served through a same-platform conversion)", firstCore: ConvertMatrixFirstCore,
		uses: usesSamePlatformConversion(ConvertMatrixFirstCore)},
	{field: "hooks[].point " + manifest.HookPointAttempt, firstCore: AttemptHookFirstCore, uses: func(v *validator) bool {
		return slices.ContainsFunc(v.m.Hooks, func(h manifest.Hook) bool { return h.Point == manifest.HookPointAttempt })
	}},
}

// usesSamePlatformConversion reports, for the conversions firstCore brings,
// an account type whose endpoint subset on a platform leaves out an
// endpoint that only such a same-platform conversion can serve from an
// endpoint it keeps, e.g. responses without chat_completions on openai.
func usesSamePlatformConversion(firstCore string) func(*validator) bool {
	brings := func(pair [2]string) bool {
		c, ok := samePlatformFirstCore[pair]
		return c == firstCore || !ok && firstCore == StreamOnlyFirstCore
	}
	return func(v *validator) bool { return v.usesSamePlatformConversion(brings) }
}

func (v *validator) usesSamePlatformConversion(brings func([2]string) bool) bool {
	own := map[string]*manifest.Platform{}
	for i := range v.m.Platforms {
		own[v.m.Platforms[i].ID] = &v.m.Platforms[i]
	}
	for _, at := range v.m.AccountTypes {
		for _, ap := range at.Platforms {
			if ap.Endpoints == nil {
				continue
			}
			p := v.referencedPlatform(ap.Platform, own[ap.Platform])
			if p == nil {
				continue
			}
			kept := map[string]bool{}
			for _, e := range p.Endpoints {
				if ap.SupportsEndpoint(e.ID) {
					kept[e.Protocol] = true
				}
			}
			for _, e := range p.Endpoints {
				if ap.SupportsEndpoint(e.ID) || kept[e.Protocol] {
					continue
				}
				if slices.ContainsFunc(SamePlatformConversions, func(pair [2]string) bool {
					return pair[0] == e.Protocol && kept[pair[1]] && brings(pair)
				}) {
					return true
				}
			}
		}
	}
	return false
}

// checkCoreFloors checks hostCompat against the first core of every declaration
// the manifest relies on: a range that admits the core before it is refused.
func (v *validator) checkCoreFloors() {
	for _, fl := range coreFloors {
		if !fl.uses(v) {
			continue
		}
		last, ok := previousPatch(fl.firstCore)
		if !ok {
			continue
		}
		if admits, err := HostCompatible(v.m.HostCompat, last); err == nil && admits {
			v.add("hostCompat", "below_feature_core", "hostCompat %q admits core %s, which ignores %s (honoured from core %s)",
				v.m.HostCompat, last, fl.field, fl.firstCore)
		}
	}
}

// previousPatch is the release just before version (x.y.z-1); false for a
// .0 release, whose predecessor cannot be named.
func previousPatch(version string) (string, bool) {
	sv, err := semver.StrictNewVersion(version)
	if err != nil || sv.Patch() == 0 {
		return "", false
	}
	return semver.New(sv.Major(), sv.Minor(), sv.Patch()-1, "", "").String(), true
}
