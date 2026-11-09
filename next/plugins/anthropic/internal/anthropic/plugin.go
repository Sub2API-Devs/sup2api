// Package anthropic implements the Anthropic plugin's model catalog admin
// route. Its apikey account type declares its upstream in the manifest
// (accountTypes[].upstream, docs/UPSTREAM-DECLARATIVE.md): the core builds,
// tests and classifies its requests itself, so the plugin implements no
// platform. The anthropic platform and its endpoints are built into the
// core (server/internal/platforms); this plugin declares none.
package anthropic

import (
	"context"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Plugin is the anthropic plugin. It implements pluginsdk.HTTP and
// pluginsdk.Initializer.
type Plugin struct {
	*pluginsdk.Router
	host pluginsdk.Host
}

// New returns the plugin.
func New() *Plugin {
	p := &Plugin{Router: pluginsdk.NewRouter()}
	p.Handle("GET", "/models", p.listModels)
	return p
}

// Init implements pluginsdk.Initializer.
func (p *Plugin) Init(_ context.Context, h pluginsdk.Host) error {
	p.host = h
	return nil
}
