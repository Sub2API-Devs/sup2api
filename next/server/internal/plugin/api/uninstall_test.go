package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
	"net/http/httptest"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
	"github.com/gin-gonic/gin"
)

type uninstallSensitiveAuth struct{ authz }

func (uninstallSensitiveAuth) IsSensitive(permission string) bool { return permission == PermUninstall }

type confirmedStepUp struct{}

func (confirmedStepUp) VerifyStepUp(_ context.Context, _ int64, token string) error {
	if token != "confirmed" {
		return errors.New("password confirmation required")
	}
	return nil
}

func TestUninstallRecoveryRequiresPermissionStepUpAndExplicitRetry(t *testing.T) {
	h, root := newHarness(t)
	if code, out := h.do("POST", "/plugins/upload", "admin", fileBody(t, pkgtest.Build(pkgtest.Guard("guard", "0.1.0", "sub2api"), root))); code != 200 {
		t.Fatal(code, out)
	}
	mustExec(t, h.db, `INSERT INTO plugin_uninstalls(plugin_key,epoch,target_boot_ids)VALUES('guard',9,ARRAY['dead-boot']); UPDATE plugins SET status='disabled',status_reason='uninstalling' WHERE key='guard'`)
	svc := install.New(install.Deps{DB: h.db, Nodes: emptyLifecycleNodes{}, Packages: registrytest.Source()}, install.Options{})
	e := gin.New()
	New(Deps{DB: h.db, Install: svc}).RegisterRoutes(httpapi.NewRouter(e, tokens{}, uninstallSensitiveAuth{}, confirmedStepUp{}))
	do := func(method, url, user, step string, body any) (int, map[string]any) {
		b, _ := json.Marshal(body)
		r := httptest.NewRequest(method, "/api/v1"+url, bytes.NewReader(b))
		r.Header.Set("Content-Type", "application/json")
		if user != "" {
			r.Header.Set("Authorization", "Bearer "+user)
		}
		if step != "" {
			r.Header.Set("X-Step-Up-Token", step)
		}
		w := httptest.NewRecorder()
		e.ServeHTTP(w, r)
		var out map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &out)
		return w.Code, out
	}
	in := install.ConfirmStoppedRequest{Epoch: 9, BootIDs: []string{"dead-boot"}, Reason: "host process was terminated by operator"}
	url := "/plugins/guard/uninstall/confirm-stopped"
	if code, _ := do("POST", url, "", "confirmed", in); code != 401 {
		t.Fatal("anonymous confirmation", code)
	}
	if code, _ := do("POST", url, "viewer", "confirmed", in); code != 403 {
		t.Fatal("unprivileged confirmation", code)
	}
	if code, out := do("POST", url, "admin", "", in); code != 403 || out["error"].(map[string]any)["code"] != "step_up_required" {
		t.Fatal("missing step-up accepted", code, out)
	}
	if code, out := do("GET", "/plugins/guard/uninstall", "admin", "", nil); code != 200 || data(out)["epoch"] != float64(9) {
		t.Fatal(code, out)
	}
	if code, out := do("POST", url, "admin", "confirmed", in); code != 200 || len(data(out)["pending_boot_ids"].([]any)) != 0 {
		t.Fatal(code, out)
	}
	var present bool
	if err := h.db.Pool.QueryRow(context.Background(), `SELECT EXISTS(SELECT 1 FROM plugins WHERE key='guard')`).Scan(&present); err != nil || !present {
		t.Fatal("confirmation purged plugin", present, err)
	}
	if code, out := do("DELETE", "/plugins/guard", "admin", "confirmed", nil); code != 200 {
		t.Fatal("explicit uninstall retry failed", code, out)
	}
}
