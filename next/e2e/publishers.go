package e2e

import (
	"fmt"
	"net/http"
	"strings"
)

// RegisterPublisher creates a publisher with trust level (verified|community)
// and registers key for it. Returns the publisher id.
func (e *Env) RegisterPublisher(admin *Session, key *SigningKey, trust string) int64 {
	e.T.Helper()
	d := admin.OK(e.T, http.MethodPost, "/publishers", map[string]any{"name": key.Publisher, "trust_level": trust}, admin.StepUp(e.T))
	id := d.Get("id").Int()
	if id == 0 {
		e.T.Fatalf("POST /publishers returned no id: %s", d.Raw)
	}
	admin.OK(e.T, http.MethodPost, fmt.Sprintf("/publishers/%d/keys", id),
		map[string]any{"key_id": key.KeyID, "public_key": key.PublicB64()}, admin.StepUp(e.T))
	return id
}

// DerivedGuardPackage builds a third-party package from the official guard
// package: new plugin key and schema, publisher = key.Publisher, signed with
// key. Unless keepNative, everything requiring ui.native is stripped so the
// package is acceptable for community/verified publishers.
func (e *Env) DerivedGuardPackage(pluginKey string, key *SigningKey, keepNative bool) Package {
	e.T.Helper()
	pkg := ReadPackage(e.T, e.MarketPackage("guard", e.defaultVersion("guard")))
	m := pkg.Manifest(e.T)
	m["key"] = pluginKey
	m["publisher"] = key.Publisher
	m["name"] = map[string]any{"en": "E2E " + pluginKey, "zh": "E2E " + pluginKey}
	if db, ok := m["database"].(map[string]any); ok {
		db["schema"] = "plg_" + pluginKey
	}
	if !keepNative {
		delete(m, "hostUICompat")
		if ui, ok := m["ui"].(map[string]any); ok {
			delete(ui, "native")
			delete(ui, "slots")
			pages, _ := ui["pages"].(map[string]any)
			for id, p := range pages {
				if pm, ok := p.(map[string]any); ok && pm["type"] == "native" {
					delete(pages, id)
				}
			}
			if menus, ok := ui["menus"].([]any); ok {
				var keep []any
				for _, mn := range menus {
					if mm, ok := mn.(map[string]any); ok {
						if _, still := pages[fmt.Sprint(mm["page"])]; !still {
							continue
						}
					}
					keep = append(keep, mn)
				}
				ui["menus"] = keep
			}
		}
		if hps, ok := m["hostPermissions"].([]any); ok {
			var keep []any
			for _, hp := range hps {
				if hm, ok := hp.(map[string]any); ok && hm["id"] == "ui.native" {
					continue
				}
				keep = append(keep, hp)
			}
			m["hostPermissions"] = keep
		}
		for p := range pkg {
			if strings.HasPrefix(p, "ui/native/") {
				delete(pkg, p)
			}
		}
	}
	pkg.SetManifest(e.T, m)
	pkg.Sign(e.T, key)
	return pkg
}
