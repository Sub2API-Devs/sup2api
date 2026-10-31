package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/dynweight"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// TestManifestPassesCoreChecks runs manifest.json through the checks the
// server runs before it installs a plugin.
func TestManifestPassesCoreChecks(t *testing.T) {
	var m manifest.Manifest
	if err := json.Unmarshal(manifestJSON, &m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	fields, _ := check.Fields(check.Validate(&m, packageFiles(t), check.ValidateOptions{Tooling: true}))
	for _, f := range fields {
		t.Errorf("%s: %s (%s)", f.Field, f.Message, f.Code)
	}
}

// TestManifestShape checks manifest.json against the SDK types (no unknown
// fields) and the jobs, topics and routes the plugin serves.
func TestManifestShape(t *testing.T) {
	dec := json.NewDecoder(bytes.NewReader(manifestJSON))
	dec.DisallowUnknownFields()
	var m manifest.Manifest
	if err := dec.Decode(&m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	if m.Key != "dynweight" || m.Database == nil || m.Database.Schema != "plg_dynweight" {
		t.Fatalf("identity = %s %+v", m.Key, m.Database)
	}
	for _, hp := range m.HostPermissions {
		if hp.Reason["en"] == "" || hp.Reason["zh"] == "" {
			t.Errorf("host permission %s needs an en and zh reason", hp.ID)
		}
	}
	jobs := []string{}
	for _, j := range m.Jobs {
		jobs = append(jobs, j.ID)
	}
	if !slices.Equal(jobs, []string{dynweight.JobEvaluate, dynweight.JobCleanup}) {
		t.Fatalf("jobs = %v", jobs)
	}
	p := dynweight.New()
	for _, r := range m.Routes {
		// Without a host every route answers an error, but not "no route".
		resp, err := p.HandleHTTP(context.Background(), &pluginv1.HTTPRequest{Method: r.Method, Path: r.Path, RoutePath: r.Path})
		if err != nil || resp.GetStatus() == http.StatusNotFound {
			t.Errorf("route %s %s is not served: %v", r.Method, r.Path, err)
		}
	}
}

// TestManifestServes starts the plugin with its embedded manifest.
func TestManifestServes(t *testing.T) {
	h := pluginsdktest.Start(t, dynweight.New(), pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestJSON)}})
	for _, c := range []string{manifest.CapGatewayObserve, manifest.CapSchedulerRank, manifest.CapAppJobs, manifest.CapHTTPRoutes} {
		if !slices.Contains(h.Info.GetCapabilities(), c) {
			t.Errorf("capability %s missing from %v", c, h.Info.GetCapabilities())
		}
	}
}

// packageFiles collects the files a package would carry.
func packageFiles(t *testing.T) map[string][]byte {
	t.Helper()
	files := map[string][]byte{}
	err := filepath.WalkDir(".", func(p string, d fs.DirEntry, err error) error {
		switch {
		case err != nil:
			return err
		case p == ".":
			return nil
		case strings.HasPrefix(d.Name(), ".") || d.Name() == "node_modules":
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		case d.IsDir() || !d.Type().IsRegular() || strings.HasSuffix(p, ".go"):
			return nil
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		files[filepath.ToSlash(p)] = b
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	return files
}
