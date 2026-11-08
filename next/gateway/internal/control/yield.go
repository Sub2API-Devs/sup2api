package control

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

// yieldHandlers serve the node's traffic handover on its own management
// socket (deploy/gateway/*/README, "shell restart"):
//
//	GET    /system/nodes/{id}/yield  the handover state
//	POST   /system/nodes/{id}/yield  {"drain":true} hands new requests to
//	                                 the other serving nodes; drain also
//	                                 answers /readyz 503 for the ingress
//	DELETE /system/nodes/{id}/yield  takes the traffic back
//
// The engine is local, so {id} must be this node ("self" is accepted).
func (e *Engine) yieldHandlers(mux *http.ServeMux) {
	reply := func(w http.ResponseWriter, status int, v any) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(v)
	}
	fail := func(w http.ResponseWriter, status int, err error) {
		reply(w, status, map[string]any{"error": map[string]string{"code": "updater_conflict", "message": err.Error()}})
	}
	self := func(w http.ResponseWriter, r *http.Request) bool {
		if id := r.PathValue("id"); id != e.Node.ID && id != "self" {
			fail(w, http.StatusNotFound, errors.New("a node yields only through its own management socket"))
			return false
		}
		return true
	}
	mux.HandleFunc("GET /system/nodes/{id}/yield", func(w http.ResponseWriter, r *http.Request) {
		if self(w, r) {
			reply(w, http.StatusOK, map[string]any{"data": e.YieldState()})
		}
	})
	mux.HandleFunc("POST /system/nodes/{id}/yield", func(w http.ResponseWriter, r *http.Request) {
		if !self(w, r) {
			return
		}
		var req struct {
			Drain bool `json:"drain"`
		}
		if err := decode(w, r, &req); err != nil && !errors.Is(err, io.EOF) {
			fail(w, http.StatusBadRequest, err)
			return
		}
		if err := e.Yield(r.Context(), req.Drain); err != nil {
			fail(w, http.StatusConflict, err)
			return
		}
		reply(w, http.StatusOK, map[string]any{"data": e.YieldState()})
	})
	mux.HandleFunc("DELETE /system/nodes/{id}/yield", func(w http.ResponseWriter, r *http.Request) {
		if !self(w, r) {
			return
		}
		if err := e.Resume(r.Context()); err != nil {
			fail(w, http.StatusConflict, err)
			return
		}
		reply(w, http.StatusOK, map[string]any{"data": e.YieldState()})
	})
}
