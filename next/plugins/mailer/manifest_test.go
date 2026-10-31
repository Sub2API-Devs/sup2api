package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/mailer/internal/mailer"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// TestManifestServes starts the plugin with its embedded manifest: the SDK
// reports notify.channel.v1 and the NotificationService answers.
func TestManifestServes(t *testing.T) {
	h := pluginsdktest.Start(t, mailer.New(), pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestJSON)}})
	if !slices.Contains(h.Info.GetCapabilities(), manifest.CapNotifyChannel) {
		t.Fatalf("capabilities = %v", h.Info.GetCapabilities())
	}
}

// TestManifest checks manifest.json against the SDK types (no unknown
// fields), the declared channel and the settings forms.
func TestManifest(t *testing.T) {
	dec := json.NewDecoder(bytes.NewReader(manifestJSON))
	dec.DisallowUnknownFields()
	var m manifest.Manifest
	if err := dec.Decode(&m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	if m.Key != "mailer" || m.Notifications == nil || len(m.Notifications.Channels) != 1 ||
		m.Notifications.Channels[0].ID != mailer.Channel || m.Notifications.Channels[0].Recipient != manifest.RecipientEmail {
		t.Fatalf("manifest = %+v", m)
	}
	for _, hp := range m.HostPermissions {
		if _, ok := manifest.HostPermissionRisk[hp.ID]; !ok {
			t.Errorf("unknown host permission %q", hp.ID)
		}
	}
	for _, p := range []string{m.UI.Settings.Schema, m.UI.Settings.UISchema} {
		b, err := os.ReadFile(filepath.FromSlash(p))
		if err != nil || !json.Valid(b) {
			t.Errorf("settings form %s: %v", p, err)
		}
	}
}
