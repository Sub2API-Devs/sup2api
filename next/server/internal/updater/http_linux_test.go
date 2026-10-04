//go:build linux

package updater

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/gin-gonic/gin"
)

type bridgeAuth struct{ id int64 }

func (a bridgeAuth) VerifyAccessToken(context.Context, string) (int64, error) { return a.id, nil }
func (a bridgeAuth) Can(context.Context, int64, string) (bool, error)         { return true, nil }
func (a bridgeAuth) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{Superuser: true}, nil
}
func (a bridgeAuth) CanGrant(context.Context, int64, []string) error { return nil }
func (a bridgeAuth) CanActOn(context.Context, int64, []string) error { return nil }

func TestBridgeAuditsOnlySuccessfulMutations(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	var uid int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('updater-audit@test','test') RETURNING id`).Scan(&uid); err != nil {
		t.Fatal(err)
	}
	socket := filepath.Join(t.TempDir(), "shell.sock")
	listener, err := net.Listen("unix", socket)
	if err != nil {
		t.Fatal(err)
	}
	shell := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("fail") == "1" {
			w.WriteHeader(409)
			_, _ = w.Write([]byte(`{"error":{"code":"conflict"}}`))
			return
		}
		if r.Header.Get("X-Updater-Actor") != fmt.Sprint(uid) {
			t.Error("missing actor header")
		}
		w.WriteHeader(201)
		_, _ = w.Write([]byte(`{"data":{"id":"new-plan","digest":"verified-digest","repository":"owner/repo"}}`))
	})}
	go func() { _ = shell.Serve(listener) }()
	t.Cleanup(func() { _ = shell.Close() })
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	auth := bridgeAuth{uid}
	RegisterRoutes(httpapi.NewRouter(engine, auth, auth), socket, db)
	cases := []struct{ method, path, action string }{
		{"POST", "/system/upgrades", "system.upgrade.create"},
		{"POST", "/system/upgrades/old-plan/pause", "system.upgrade.pause"},
		{"POST", "/system/upgrades/old-plan/resume", "system.upgrade.resume"},
		{"POST", "/system/upgrades/old-plan/cancel", "system.upgrade.cancel"},
		{"POST", "/system/upgrades/old-plan/rollback", "system.upgrade.rollback"},
		{"POST", "/system/nodes/node-1/disable", "system.node.disable"},
		{"POST", "/system/nodes/node-1/enable", "system.node.enable"},
		{"PUT", "/system/offload", "system.offload.update"},
		{"PUT", "/system/update-source", "system.update_source.update"},
		{"POST", "/system/releases/import", "system.release.import"},
		{"POST", "/system/upgrades/preflight", ""},
		{"GET", "/system/upgrades", ""},
		{"POST", "/system/upgrades?fail=1", ""},
	}
	for _, tc := range cases {
		req := httptest.NewRequest(tc.method, "/api/v1"+tc.path, strings.NewReader(`{"repository":"owner/repo","tag":"v0.2.0"}`))
		req.Header.Set("Authorization", "Bearer test")
		response := httptest.NewRecorder()
		engine.ServeHTTP(response, req)
		if response.Code != 201 && response.Code != 409 {
			t.Fatal(tc.path, response.Code, response.Body.String())
		}
		if tc.action != "" {
			var count int
			if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action=$1 AND user_id=$2`, tc.action, uid).Scan(&count); err != nil || count != 1 {
				t.Fatal(tc.action, count, err)
			}
		}
	}
	var count int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs`).Scan(&count); err != nil || count != 10 {
		t.Fatal(count, err)
	}
	var imported bool
	if err := db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM audit_logs WHERE action='system.release.import' AND target_id='verified-digest' AND detail->>'tag'='v0.2.0' AND detail->>'repository'='owner/repo' AND detail->>'digest'='verified-digest')`).Scan(&imported); err != nil || !imported {
		t.Fatal("missing import audit details", err)
	}
}
