package account

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
)

func TestContainerSettings(t *testing.T) {
	ctx := context.Background()
	base := []byte(`{"base_url":"https://api.example.com","locale":"en-US"}`)
	got, err := mergeContainerSettings(ctx, "ccgateway", base, []byte(`{"locale":"zh-CN","timezone":"Asia/Shanghai"}`))
	if err != nil {
		t.Fatal(err)
	}
	var values map[string]string
	_ = json.Unmarshal(got, &values)
	if values["base_url"] != "https://api.example.com" || values["locale"] != "zh-CN" || values["timezone"] != "Asia/Shanghai" {
		t.Fatalf("settings = %s", got)
	}
	got, err = mergeContainerSettings(ctx, "ccgateway", got, []byte(`{"locale":"","timezone":""}`))
	if err != nil {
		t.Fatal(err)
	}
	values = nil
	_ = json.Unmarshal(got, &values)
	if len(values) != 1 || values["base_url"] == "" {
		t.Fatalf("clearing settings = %s", got)
	}
}

func TestContainerSettingsValidation(t *testing.T) {
	for _, patch := range []string{`null`, `[]`, `{"locale":123}`, `{"locale":"invalid_!"}`, `{"locale":"en-AQ"}`, `{"locale":"zh-Hans-CN"}`, `{"timezone":"Local"}`, `{"timezone":"Mars/Olympus"}`, `{"base_url":"https://elsewhere.example"}`} {
		t.Run(patch, func(t *testing.T) {
			if _, err := mergeContainerSettings(context.Background(), "ccgateway", nil, []byte(patch)); err == nil {
				t.Fatal("invalid settings accepted")
			}
		})
	}
	if _, err := mergeContainerSettings(context.Background(), "other", nil, []byte(`{"locale":"en-US"}`)); err == nil {
		t.Fatal("settings accepted for another plugin")
	}
}

func TestContainerSettingsRoundTrip(t *testing.T) {
	e := setup(t)
	plugin := core.PluginInfo{Key: "ccgateway", Manifest: &manifest.Manifest{Name: manifest.LocalizedText{"en": "CCGateway"}}}
	e.gen.plugins = append(e.gen.plugins, plugin)
	e.gen.types = append(e.gen.types, core.AccountTypeBinding{Plugin: plugin,
		Type:       manifest.AccountType{ID: "managed", Form: manifest.Form{Mode: "schema"}},
		FormSchema: json.RawMessage(`{"type":"object","additionalProperties":false}`)})
	pid := e.exec1(`INSERT INTO proxies(name,protocol,host,port) VALUES('container-settings','http','proxy.example',3128) RETURNING id`)
	code, out := e.do("POST", "/accounts", map[string]any{
		"name": "environment", "plugin_key": "ccgateway", "type": "managed", "proxy_id": pid,
		"credentials": map[string]any{}, "settings": map[string]string{"locale": "ja-JP", "timezone": "Asia/Tokyo"},
	})
	if code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	created := data(out)
	path := "/accounts/" + itoa(int64(created["id"].(float64)))
	check := func(out map[string]any, locale, timezone string) {
		t.Helper()
		settings := data(out)["settings"].(map[string]any)
		if settings["locale"] != locale || settings["timezone"] != timezone {
			t.Fatalf("settings = %v", settings)
		}
	}
	check(out, "ja-JP", "Asia/Tokyo")
	code, out = e.do("PATCH", path, map[string]any{"credentials": map[string]any{}})
	if code != 200 {
		t.Fatalf("credential update: %d %v", code, out)
	}
	check(out, "ja-JP", "Asia/Tokyo")
	code, out = e.do("PATCH", path, map[string]any{"settings": map[string]string{"locale": "de-DE", "timezone": "Europe/Berlin"}})
	if code != 200 {
		t.Fatalf("environment update: %d %v", code, out)
	}
	check(out, "de-DE", "Europe/Berlin")
	code, out = e.do("PATCH", path, map[string]any{"settings": map[string]string{"locale": "", "timezone": ""}})
	if code != 200 || len(data(out)["settings"].(map[string]any)) != 0 {
		t.Fatalf("reset: %d %v", code, out)
	}
}

func TestPreparePreservesContainerSettingsOutsideCredentials(t *testing.T) {
	cipher, err := secret.New(make([]byte, 32))
	if err != nil {
		t.Fatal(err)
	}
	s := &Service{}
	s.d.Cipher = cipher
	bt := core.AccountTypeBinding{Plugin: core.PluginInfo{Key: "ccgateway"}, Type: manifest.AccountType{ID: "managed"}, FormSchema: json.RawMessage(`{"type":"object","additionalProperties":false}`)}
	old := []byte(`{"locale":"zh-CN","timezone":"Asia/Shanghai"}`)
	p, err := s.prepare(context.Background(), bt, old, old, true)
	if err != nil {
		t.Fatal(err)
	}
	if string(p.secret) != "{}" {
		t.Fatalf("environment settings leaked into credentials: %s", p.secret)
	}
	var settings map[string]string
	_ = json.Unmarshal(p.settings, &settings)
	if settings["locale"] != "zh-CN" || settings["timezone"] != "Asia/Shanghai" {
		t.Fatalf("saved settings lost: %s", p.settings)
	}
}
