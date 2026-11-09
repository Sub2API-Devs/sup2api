package check

import (
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/upstream"
)

// upstream validates accountTypes[].upstream (docs/UPSTREAM-DECLARATIVE.md):
// the declaration resolved against its preset with the engine the core runs
// (templates, header writes, auth, routes, the §84 paramOverride), its
// routes against the protocols the type serves, and the flags that depend
// on the rest of the manifest.
func (v *validator) upstream(f string, at manifest.AccountType, own map[string]*manifest.Platform) {
	f += ".upstream"
	protocols, passHeaders, complete := v.servedProtocols(at, own)
	p, err := upstream.Resolve(&at, passHeaders, nil)
	var probs upstream.Problems
	if errors.As(err, &probs) {
		for _, pr := range probs {
			v.add(strings.TrimSuffix(f+"."+pr.Path, "."), pr.Code, "%s", pr.Message)
		}
		return
	}
	if complete {
		routes := p.Upstream().Routes
		for _, proto := range protocols {
			if routes[proto] == nil {
				v.add(f+".routes", "missing_route", "protocol %q served by the account type has no route", proto)
			}
		}
		for _, proto := range sortedKeys(routes) {
			if !slices.Contains(protocols, proto) {
				v.add(f+".routes."+proto, "unknown_protocol", "protocol %q is not served by the platforms of the account type", proto)
			}
		}
	}
	if at.Upstream.Extend && v.m.Runtime != manifest.RuntimeGRPC {
		v.add(f+".extend", "unsupported", "extend calls the plugin's BuildUpstreamRequest: it needs runtime %q", manifest.RuntimeGRPC)
	}
	if at.Upstream.AccountConfig {
		if at.Form.Mode != "schema" {
			v.add(f+".accountConfig", "invalid", "an account upstream layer is edited in a schema form")
		}
		if !slices.Contains(at.SettingsFields, upstream.SettingsField) {
			v.add(f+".accountConfig", "invalid", "settingsFields must list %q, the account upstream layer", upstream.SettingsField)
		}
	}
}

// servedProtocols lists the protocols of the endpoints the account type
// serves and the client headers it receives (the account platform's
// passHeaders, else the platform's). complete is false when a platform is
// not known here (offline packaging against another plugin's platform):
// the routes are then not compared.
func (v *validator) servedProtocols(at manifest.AccountType, own map[string]*manifest.Platform) (protocols, passHeaders []string, complete bool) {
	complete = true
	for _, ap := range at.Platforms {
		p := v.referencedPlatform(ap.Platform, own[ap.Platform])
		headers := ap.PassHeaders
		if p == nil {
			complete = false
		} else if headers == nil {
			headers = p.PassHeaders
		}
		passHeaders = appendNew(passHeaders, headers...)
		if p == nil {
			continue
		}
		for _, e := range p.Endpoints {
			if ap.SupportsEndpoint(e.ID) {
				protocols = appendNew(protocols, e.Protocol)
			}
		}
	}
	return protocols, passHeaders, complete
}

func appendNew(list []string, items ...string) []string {
	for _, s := range items {
		if !slices.Contains(list, s) {
			list = append(list, s)
		}
	}
	return list
}

// noProcessCapabilities are the capabilities a runtime "none" package may
// declare: they describe what its account types serve, which the core
// implements from the upstream declarations.
var noProcessCapabilities = map[string]bool{
	manifest.CapPlatformAdapter:   true,
	manifest.CapPlatformWebSocket: true,
}

// runtimeNone rejects what a package without a process cannot serve:
// anything the core answers by calling the plugin.
func (v *validator) runtimeNone() {
	m := v.m
	if m.Entry.GRPC != nil || m.Entry.JS != nil {
		v.add("entry", "unsupported", "runtime %q has no entry", manifest.RuntimeNone)
	}
	for p := range v.files {
		if strings.HasPrefix(p, "runtimes/") {
			v.add("entry", "unsupported", "runtime %q packages carry no runtimes (found %s)", manifest.RuntimeNone, p)
			break
		}
	}
	for i, c := range m.Capabilities {
		if !noProcessCapabilities[c.ID] {
			v.add(fmt.Sprintf("capabilities[%d]", i), "needs_runtime", "capability %q needs a plugin process", c.ID)
		}
	}
	needs := func(field string, declared bool) {
		if declared {
			v.add(field, "needs_runtime", "%s needs a plugin process (runtime %q)", field, manifest.RuntimeGRPC)
		}
	}
	needs("hooks", len(m.Hooks) > 0)
	needs("scheduler", m.Scheduler != nil && m.Scheduler.Rank != nil)
	needs("observations", m.Observations != nil)
	needs("notifications", m.Notifications != nil)
	needs("events", m.Events != nil)
	needs("jobs", len(m.Jobs) > 0)
	needs("database", m.Database != nil)
	needs("routes", len(m.Routes) > 0)
	for i, p := range m.Platforms {
		for j, e := range p.Endpoints {
			needs(fmt.Sprintf("platforms[%d].endpoints[%d]", i, j), e.PluginUsage() || e.Task != nil || e.Request.ModelSource == manifest.ModelSourcePlugin)
		}
	}
	for i, at := range m.AccountTypes {
		f := fmt.Sprintf("accountTypes[%d]", i)
		needs(f+".upstream", at.Upstream == nil)
		needs(f+".lifecycle", at.Lifecycle != nil)
		needs(f+".modelAvailability", at.ModelAvailability)
		needs(f+".quota.query", at.Quota != nil && at.Quota.Query)
		needs(f+".balance", at.Balance != nil)
		needs(f+".refresh", at.Refresh != nil)
	}
}

// needsCredentials reports whether the plugin itself reads account
// credentials: an account type it implements, or one it extends. A purely
// declared type keeps its credentials inside the core.
func needsCredentials(ats []manifest.AccountType) bool {
	return slices.ContainsFunc(ats, func(at manifest.AccountType) bool {
		return at.Upstream == nil || at.Upstream.Extend
	})
}
