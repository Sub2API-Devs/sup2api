package engine

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// Maintenance lease is held by the controller while swapping a verified
// Worker+CLI pair. No in-flight model request is killed to obtain it.
func (r *Runtime) serveRuntimeMaintenance(w http.ResponseWriter, req *http.Request) {
	key := strings.TrimPrefix(req.Header.Get("Authorization"), "Bearer ")
	if r.admin == nil || r.admin.key == "" || !strings.HasPrefix(req.Header.Get("Authorization"), "Bearer ") || subtle.ConstantTimeCompare([]byte(key), []byte(r.admin.key)) != 1 {
		apiError(w, 401, "authentication_error", "Invalid management key")
		return
	}
	if req.Method == "GET" {
		r.mu.Lock()
		defer r.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		_ = json.NewEncoder(w).Encode(Object{"paused": r.runtimeLease != "", "lease": r.runtimeLease, "active_requests": r.requests, "expired": r.runtimeLease != "" && !time.Now().Before(r.runtimeLeaseExpires)})
		return
	}
	if req.Method != "POST" {
		w.WriteHeader(405)
		return
	}
	var body struct {
		Action string `json:"action"`
		Lease  string `json:"lease"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, req.Body, 4096))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&body) != nil {
		apiError(w, 400, "invalid_request_error", "Invalid runtime maintenance request")
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	switch body.Action {
	case "pause":
		if r.requests != 0 || r.runtimeLease != "" {
			apiError(w, 409, "api_error", "Runtime is busy")
			return
		}
		var token [24]byte
		if _, err := rand.Read(token[:]); err != nil {
			apiError(w, 500, "api_error", "Cannot create maintenance lease")
			return
		}
		r.runtimeLease = hex.EncodeToString(token[:])
		r.runtimeLeaseExpires = time.Now().Add(5 * time.Minute)
	case "validate", "resume":
		if body.Lease == "" || subtle.ConstantTimeCompare([]byte(body.Lease), []byte(r.runtimeLease)) != 1 || body.Action == "validate" && !time.Now().Before(r.runtimeLeaseExpires) {
			apiError(w, 409, "api_error", "Runtime maintenance lease expired")
			return
		}
		if body.Action == "resume" {
			r.runtimeLease = ""
			r.runtimeLeaseExpires = time.Time{}
		} else {
			r.runtimeLeaseExpires = time.Now().Add(5 * time.Minute)
		}
	default:
		apiError(w, 400, "invalid_request_error", "Unknown runtime maintenance action")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(Object{"paused": r.runtimeLease != "", "lease": r.runtimeLease, "active_requests": r.requests})
}
