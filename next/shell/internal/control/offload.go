package control

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

// Offload is the cluster's CPU protection setting: a serving node whose
// averaged CPU reaches CPUPercent sends its new requests to serving nodes
// that are clearly below it, until it falls offloadHysteresis points under.
type Offload struct {
	Enabled    bool `json:"enabled"`
	CPUPercent int  `json:"cpu_threshold_percent"`
}

const (
	OffloadMinPercent = 50
	OffloadMaxPercent = 95
	offloadHysteresis = 10
	// offloadTTL lets a node whose heartbeats stopped serve locally again.
	offloadTTL = 10 * time.Second
)

func (s *Store) Offload(ctx context.Context) (o Offload, err error) {
	err = s.DB.QueryRow(ctx, `SELECT offload_enabled,offload_cpu_percent FROM updater.clusters WHERE cluster_id=$1`, s.Cluster).Scan(&o.Enabled, &o.CPUPercent)
	return
}

// OffloadPatch is the PUT body; nil fields keep their value.
type OffloadPatch struct {
	Enabled    *bool `json:"enabled"`
	CPUPercent *int  `json:"cpu_threshold_percent"`
}

var errOffloadRange = fmt.Errorf("cpu_threshold_percent must be between %d and %d", OffloadMinPercent, OffloadMaxPercent)

func (s *Store) SetOffload(ctx context.Context, p OffloadPatch) (o Offload, err error) {
	if p.CPUPercent != nil && (*p.CPUPercent < OffloadMinPercent || *p.CPUPercent > OffloadMaxPercent) {
		return o, errOffloadRange
	}
	err = s.DB.QueryRow(ctx, `UPDATE updater.clusters SET offload_enabled=COALESCE($2,offload_enabled),offload_cpu_percent=COALESCE($3,offload_cpu_percent)
 WHERE cluster_id=$1 RETURNING offload_enabled,offload_cpu_percent`, s.Cluster, p.Enabled, p.CPUPercent).Scan(&o.Enabled, &o.CPUPercent)
	return
}

// offloadTargets decides whether self sheds its new requests and to which
// nodes. was reports that it shed them after the previous heartbeat.
// Only measured, serving nodes of the same release that are well below the
// threshold and not shedding themselves take them; with none, self serves
// everything locally.
func offloadTargets(set Offload, self Node, nodes []Node, was bool) []Node {
	if !set.Enabled || self.Mode != "local" || !self.Ready || self.CPUPercent == nil {
		return nil
	}
	low := float64(set.CPUPercent - offloadHysteresis)
	if cpu := *self.CPUPercent; cpu < low || (!was && cpu < float64(set.CPUPercent)) {
		return nil
	}
	var out []Node
	for _, n := range nodes {
		if n.ID != self.ID && n.Enabled && n.Mode == "local" && n.Ready && !n.Offloading && n.CPUPercent != nil && *n.CPUPercent < low &&
			n.ReleaseDigest == self.ReleaseDigest && n.CoreBootID != "" && n.RouteRevision != 0 && time.Since(n.LastSeen) < 20*time.Second {
			out = append(out, n)
		}
	}
	return out
}

// offloadHandlers serve GET/PUT /system/offload: the setting and each
// node's load, for the console's system settings.
func (s *Store) offloadHandlers(mux *http.ServeMux, reply func(http.ResponseWriter, any, error)) {
	view := func(w http.ResponseWriter, r *http.Request, o Offload) {
		nodes, err := s.Nodes(r.Context())
		type load struct {
			ID         string   `json:"node_id"`
			Mode       string   `json:"mode"`
			Ready      bool     `json:"ready"`
			Enabled    bool     `json:"enabled"`
			CPUPercent *float64 `json:"cpu_percent"`
			Offloading bool     `json:"offloading"`
			LastSeen   string   `json:"last_seen"`
		}
		out := []load{}
		for _, n := range nodes {
			out = append(out, load{n.ID, n.Mode, n.Ready, n.Enabled, n.CPUPercent, n.Offloading, n.LastSeen.UTC().Format(time.RFC3339)})
		}
		reply(w, map[string]any{"enabled": o.Enabled, "cpu_threshold_percent": o.CPUPercent, "nodes": out}, err)
	}
	mux.HandleFunc("GET /system/offload", func(w http.ResponseWriter, r *http.Request) {
		o, err := s.Offload(r.Context())
		if err != nil {
			reply(w, nil, err)
			return
		}
		view(w, r, o)
	})
	mux.HandleFunc("PUT /system/offload", func(w http.ResponseWriter, r *http.Request) {
		var p OffloadPatch
		if err := decode(w, r, &p); err != nil {
			invalid(w, "", err.Error())
			return
		}
		o, err := s.SetOffload(r.Context(), p)
		if errors.Is(err, errOffloadRange) {
			invalid(w, "cpu_threshold_percent", err.Error())
			return
		}
		if err != nil {
			reply(w, nil, err)
			return
		}
		view(w, r, o)
	})
}

// invalid answers in the console's invalid_argument shape.
func invalid(w http.ResponseWriter, field, message string) {
	body := map[string]any{"code": "invalid_argument", "message": message}
	if field != "" {
		body["details"] = map[string]any{"fields": []map[string]string{{"field": field, "code": "out_of_range", "message": message}}}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	_ = json.NewEncoder(w).Encode(map[string]any{"error": body})
}
