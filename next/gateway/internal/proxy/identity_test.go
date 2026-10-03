package proxy

import (
	"bytes"
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestEntryNodeIdentityForLocalForwardAndOffload(t *testing.T) {
	body := []byte(`{"data":{"core_node_id":"core-b","core_boot_id":"boot-b"}}`)
	var compressed bytes.Buffer
	gz := gzip.NewWriter(&compressed)
	_, _ = gz.Write(body)
	_ = gz.Close()
	upstream := http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		if q.Header.Get(entryNodeHeader) != "" {
			t.Error("client entry identity reached core")
		}
		w.Header().Set(entryNodeHeader, "forged-downstream")
		w.Header().Set("Content-Encoding", "gzip")
		_, _ = w.Write(compressed.Bytes())
	})
	for _, mode := range []string{"local", "forward", "offload"} {
		t.Run(mode, func(t *testing.T) {
			var router *Router
			if mode == "local" {
				up := httptest.NewServer(upstream)
				defer up.Close()
				router = New(Config{NodeID: "entry-a"})
				if err := router.SetRoute(Route{Mode: "local-serving", LocalURL: up.URL, CoreBootID: "b", Revision: 1}); err != nil {
					t.Fatal(err)
				}
			} else {
				router, _, _ = forwardPair(t, upstream)
				router.config.NodeID = "entry-a"
				if mode == "offload" {
					route := router.Route()
					idle := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { t.Error("offload stayed local") }))
					defer idle.Close()
					if err := router.SetRoute(Route{Mode: "local-serving", LocalURL: idle.URL, CoreBootID: "local-boot", Revision: 100}); err != nil {
						t.Fatal(err)
					}
					if err := router.SetOffload([]Target{{PeerURL: route.PeerURL, CoreBootID: route.CoreBootID, Revision: route.PeerRevision}}, time.Minute); err != nil {
						t.Fatal(err)
					}
				}
			}
			req := httptest.NewRequest("GET", "http://public/api/v1/system/version", nil)
			req.Header.Set(entryNodeHeader, "client-forged")
			response := httptest.NewRecorder()
			router.Public().ServeHTTP(response, req)
			if response.Code != 200 || response.Header().Get(entryNodeHeader) != "entry-a" {
				t.Fatalf("%d %#v %s", response.Code, response.Header(), response.Body)
			}
			if response.Header().Get("Content-Encoding") != "gzip" || !bytes.Equal(response.Body.Bytes(), compressed.Bytes()) {
				t.Fatal("identity stamping altered compressed response")
			}
			if response.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("identity response may be cached")
			}
		})
	}
}

func TestEntryIdentityOnlySuccessfulVersionAndNeverPrivateHop(t *testing.T) {
	router, _, _ := forwardPair(t, http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		w.Header().Set(entryNodeHeader, "forged-downstream")
		if q.URL.Query().Get("unauthorized") == "1" {
			w.WriteHeader(401)
			return
		}
		w.WriteHeader(200)
	}))
	router.config.NodeID = "entry-a"
	for _, target := range []string{"/api/v1/system/version?unauthorized=1", "/v1/chat/completions", "/healthz"} {
		response := httptest.NewRecorder()
		router.Public().ServeHTTP(response, httptest.NewRequest("GET", "http://public"+target, nil))
		if response.Header().Get(entryNodeHeader) != "" {
			t.Fatalf("identity leaked on %s", target)
		}
	}
	route := router.Route()
	req := httptest.NewRequest("GET", route.PeerURL+"/internal/forward/api/v1/system/version", nil)
	req.RequestURI = ""
	req.Header.Set(hopHeader, "1")
	req.Header.Set(bootHeader, route.CoreBootID)
	req.Header.Set(revisionHeader, "7")
	req.Header.Set(entryNodeHeader, "forged-peer")
	client := &http.Client{Transport: router.peer}
	response, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, response.Body)
	if response.StatusCode != 200 || response.Header.Get(entryNodeHeader) != "" {
		t.Fatalf("private hop claimed ingress: %d %#v", response.StatusCode, response.Header)
	}
	// A gateway with no configured identity cannot repeat a downstream claim.
	router.config.NodeID = ""
	out := httptest.NewRecorder()
	router.Public().ServeHTTP(out, httptest.NewRequest("GET", "http://public/api/v1/system/version", nil))
	if out.Header().Get(entryNodeHeader) != "" {
		t.Fatal("unknown ingress guessed from downstream")
	}
}
