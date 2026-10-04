package pluginsdk

import (
	"context"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestRouterPathParams(t *testing.T) {
	r := NewRouter()
	var capturedID string
	r.Handle("GET", "/models/:id", func(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
		capturedID = Param(req, "id")
		return DataResponse(map[string]string{"id": capturedID}), nil
	})

	resp, err := r.HandleHTTP(context.Background(), &pluginv1.HTTPRequest{
		Method: "GET",
		Path:   "/models/gpt-4",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.GetStatus() != 200 {
		t.Fatalf("expected 200, got %d", resp.GetStatus())
	}
	if capturedID != "gpt-4" {
		t.Fatalf("expected id=gpt-4, got %q", capturedID)
	}
}

func TestRouterExactMatchBeforePattern(t *testing.T) {
	r := NewRouter()
	r.Handle("GET", "/models/:id", func(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
		return DataResponse("pattern"), nil
	})
	r.Handle("GET", "/models/list", func(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
		return DataResponse("exact"), nil
	})

	resp, err := r.HandleHTTP(context.Background(), &pluginv1.HTTPRequest{
		Method: "GET",
		Path:   "/models/list",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if string(resp.GetBody()) != `{"data":"exact"}` {
		t.Fatalf("exact match should win, got: %s", resp.GetBody())
	}
}

func TestRouterMultipleParams(t *testing.T) {
	r := NewRouter()
	var capturedUser, capturedRepo string
	r.Handle("GET", "/users/:user/repos/:repo", func(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
		capturedUser = Param(req, "user")
		capturedRepo = Param(req, "repo")
		return DataResponse(nil), nil
	})

	_, err := r.HandleHTTP(context.Background(), &pluginv1.HTTPRequest{
		Method: "GET",
		Path:   "/users/alice/repos/project",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedUser != "alice" || capturedRepo != "project" {
		t.Fatalf("expected alice/project, got %s/%s", capturedUser, capturedRepo)
	}
}
