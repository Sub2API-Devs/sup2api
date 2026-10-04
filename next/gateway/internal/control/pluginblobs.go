package control

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"path/filepath"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/pluginblob"
)

// PluginBlobs builds the plugin package service of node. Packages live under
// root/plugin-blobs; client is the authenticated node client.
func PluginBlobs(store *Store, node, root string, client *http.Client, maxBytes int64) *pluginblob.Service {
	return &pluginblob.Service{
		Store:  &pluginblob.Store{Dir: filepath.Join(root, "plugin-blobs"), MaxBytes: maxBytes},
		Client: client,
		Primary: func(ctx context.Context) (bool, string, error) {
			return store.PrimaryPeer(ctx, node)
		},
		NodesWithPackage: func(ctx context.Context, sum string) ([]pluginblob.NodeRef, error) {
			nodes, err := store.NodesWithPackage(ctx, sum)
			if err != nil {
				return nil, err
			}
			refs := make([]pluginblob.NodeRef, len(nodes))
			for i, n := range nodes {
				refs[i] = pluginblob.NodeRef{ID: n.ID, PeerURL: n.PeerURL}
			}
			return refs, nil
		},
	}
}

// ManagementHandler serves the local management socket: the updater API and
// the plugin packages of this node's core.
func ManagementHandler(store *Store, blobs *pluginblob.Service) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/system/plugin-blobs/", blobs.Local())
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		ctx := r.Context()
		nodes, err := store.Nodes(ctx)
		if err != nil {
			http.Error(w, "failed to query nodes", http.StatusInternalServerError)
			return
		}
		enabled := 0
		ready := 0
		for _, n := range nodes {
			if n.Enabled {
				enabled++
				if n.Ready && n.Mode == "local" {
					ready++
				}
			}
		}
		planID, planStatus, blockedReason, err := store.PlanStatus(ctx)
		planActive := 0
		if planStatus == "running" || planStatus == "paused" {
			planActive = 1
		}
		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		fmt.Fprintf(w, "# HELP gateway_nodes_enabled Number of enabled nodes in the cluster\n")
		fmt.Fprintf(w, "# TYPE gateway_nodes_enabled gauge\n")
		fmt.Fprintf(w, "gateway_nodes_enabled %d\n", enabled)
		fmt.Fprintf(w, "# HELP gateway_nodes_ready Number of ready nodes serving locally\n")
		fmt.Fprintf(w, "# TYPE gateway_nodes_ready gauge\n")
		fmt.Fprintf(w, "gateway_nodes_ready %d\n", ready)
		fmt.Fprintf(w, "# HELP gateway_upgrade_active Whether an upgrade plan is running or paused (1) or not (0)\n")
		fmt.Fprintf(w, "# TYPE gateway_upgrade_active gauge\n")
		fmt.Fprintf(w, "gateway_upgrade_active %d\n", planActive)
		if blockedReason != "" && planID != "" {
			fmt.Fprintf(w, "# HELP gateway_upgrade_blocked Whether the upgrade is blocked (1) or not (0)\n")
			fmt.Fprintf(w, "# TYPE gateway_upgrade_blocked gauge\n")
			fmt.Fprintf(w, "gateway_upgrade_blocked{reason=%q} 1\n", blockedReason)
		}
	})
	mux.Handle("/", store.Handler())
	return mux
}

// CollectPluginBlobs removes packages no version references any more, every
// interval, keeping recent ones whose upload may still be committing.
func CollectPluginBlobs(ctx context.Context, store *Store, blobs *pluginblob.Service, interval time.Duration) {
	tick := time.NewTicker(interval)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
		referenced, err := store.ReferencedPackages(ctx)
		if err != nil {
			continue
		}
		if n, err := blobs.Store.GC(referenced, time.Hour); n > 0 || err != nil {
			slog.Info("plugin package cleanup", "removed", n, "error", err)
		}
	}
}
