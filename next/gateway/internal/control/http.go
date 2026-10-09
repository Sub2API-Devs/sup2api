package control

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
)

// Handler is for the mode-0600 local Unix socket ONLY, behind
// RequireManagementToken. The authenticated core applies user authentication
// and RBAC before forwarding a request to this API.
func (s *Store) Handler() http.Handler {
	mux := http.NewServeMux()
	reply := func(w http.ResponseWriter, v any, err error) {
		w.Header().Set("Content-Type", "application/json")
		if err != nil {
			status := http.StatusConflict
			if errors.Is(err, pgx.ErrNoRows) {
				status = http.StatusNotFound
			}
			w.WriteHeader(status)
			_ = json.NewEncoder(w).Encode(map[string]any{"error": map[string]string{"code": "updater_conflict", "message": err.Error()}})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"data": v})
	}
	mux.HandleFunc("GET /system/releases", func(w http.ResponseWriter, r *http.Request) {
		v, e := s.Releases(r.Context())
		reply(w, map[string]any{"releases": v}, e)
	})
	mux.HandleFunc("GET /system/upgrades", func(w http.ResponseWriter, r *http.Request) {
		v, e := s.Plans(r.Context())
		if e != nil {
			reply(w, nil, e)
			return
		}
		n, e := s.Nodes(r.Context())
		if e != nil {
			reply(w, nil, e)
			return
		}
		p, b, rev, e := s.ClusterState(r.Context())
		reply(w, map[string]any{"upgrades": v, "nodes": n, "primary_node": p, "baseline": b, "revision": rev}, e)
	})
	mux.HandleFunc("POST /system/upgrades/preflight", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Digest string `json:"release_digest"`
		}
		if e := decode(w, r, &req); e != nil {
			reply(w, nil, e)
			return
		}
		v, e := s.Preflight(r.Context(), req.Digest)
		reply(w, v, e)
	})
	mux.HandleFunc("POST /system/upgrades", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Digest   string `json:"release_digest"`
			Revision int64  `json:"expected_revision"`
			Key      string `json:"idempotency_key"`
		}
		if e := decode(w, r, &req); e != nil {
			reply(w, nil, e)
			return
		}
		v, e := s.Create(r.Context(), req.Digest, req.Revision, req.Key, r.Header.Get("X-Updater-Actor"))
		if e == nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusAccepted)
		}
		reply(w, v, e)
	})
	mux.HandleFunc("GET /system/upgrades/{id}", func(w http.ResponseWriter, r *http.Request) {
		v, e := s.Plan(r.Context(), r.PathValue("id"))
		reply(w, v, e)
	})
	mux.HandleFunc("GET /system/upgrades/{id}/events", func(w http.ResponseWriter, r *http.Request) {
		after, _ := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64)
		v, e := s.Events(r.Context(), r.PathValue("id"), after)
		reply(w, map[string]any{"events": v}, e)
	})
	mux.HandleFunc("POST /system/upgrades/{id}/{action}", func(w http.ResponseWriter, r *http.Request) {
		action := r.PathValue("action")
		if !strings.Contains("|pause|resume|cancel|rollback|", "|"+action+"|") {
			http.NotFound(w, r)
			return
		}
		v, e := s.Action(r.Context(), r.PathValue("id"), action, r.Header.Get("X-Updater-Actor"))
		reply(w, v, e)
	})
	mux.HandleFunc("POST /system/nodes/{id}/disable", func(w http.ResponseWriter, r *http.Request) {
		err := s.DisableNode(r.Context(), r.PathValue("id"))
		reply(w, map[string]any{"node_id": r.PathValue("id"), "enabled": false}, err)
	})
	mux.HandleFunc("POST /system/nodes/{id}/enable", func(w http.ResponseWriter, r *http.Request) {
		err := s.EnableNode(r.Context(), r.PathValue("id"))
		reply(w, map[string]any{"node_id": r.PathValue("id"), "enabled": true}, err)
	})
	s.offloadHandlers(mux, reply)
	s.updateHandlers(mux, reply)
	return mux
}
func decode(w http.ResponseWriter, r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 32<<10)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}
