// Package control implements the shell's durable, serial rolling-update controller.
package control

import (
	"context"
	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
	"time"
)

type Node struct {
	TelemetryBootID string    `json:"-"`
	Enabled         bool      `json:"enabled"`
	PeerProtocol    int       `json:"peer_protocol"`
	Strategy        string    `json:"strategy"`
	JoiningPlan     string    `json:"joining_plan,omitempty"`
	Stopped         bool      `json:"stopped"`
	ID              string    `json:"node_id"`
	PeerURL         string    `json:"peer_url"`
	ShellBootID     string    `json:"shell_boot_id"`
	ReleaseDigest   string    `json:"release_digest"`
	CoreBootID      string    `json:"core_boot_id"`
	Mode            string    `json:"mode"`
	Ready           bool      `json:"ready"`
	LastSeen        time.Time `json:"last_seen"`
	Error           string    `json:"error,omitempty"`
	OS              string    `json:"os"`
	Arch            string    `json:"arch"`
	RuntimeABI      string    `json:"runtime_abi"`
	RouteRevision   int64     `json:"route_revision"`
	// CPUPercent is the node's averaged CPU load; nil when it is not measured.
	CPUPercent *float64 `json:"cpu_percent"`
	// Offloading is set before the node sends its new requests elsewhere and
	// cleared after it stopped; receivers authorize offloaded forwards by it.
	Offloading bool `json:"offloading"`
	// Rolling marks a shell that executes rolling-v1 plans: it can yield its
	// traffic to any serving node while its own core restarts. Older shells
	// leave it false, and a cluster with one of them upgrades primary-first.
	Rolling bool `json:"rolling"`
}

// nodeFreshness is the age beyond which a heartbeat observation is stale. Every
// routing and admission decision that needs a live node reads it through
// Node.Fresh/ServingLocal so the window cannot drift between call sites.
const nodeFreshness = 20 * time.Second

// Fresh reports whether the node's last heartbeat observation is recent enough
// to be trusted. It deliberately ignores Readiness, Mode and Enabled: callers
// that only need liveness (for example follower observation checks) add those
// conditions themselves.
func (n Node) Fresh(now time.Time) bool {
	return !n.LastSeen.IsZero() && now.Sub(n.LastSeen) < nodeFreshness
}

// ServingLocal reports whether the node is fresh, ready and serving its own core
// locally. It deliberately ignores Enabled: several callers route to a node
// regardless of scheduling state, and folding Enabled in would change where
// requests for disabled nodes are forwarded.
func (n Node) ServingLocal(now time.Time) bool {
	return n.Fresh(now) && n.Ready && n.Mode == "local"
}

type Release struct {
	Digest     string            `json:"digest"`
	Manifest   rc.Manifest       `json:"manifest"`
	Signed     rc.SignedManifest `json:"-"`
	BundleBase string            `json:"-"`
}
type Plan struct {
	Strategy      string    `json:"strategy"`
	SourceDigest  string    `json:"source_digest"`
	ID            string    `json:"id"`
	ReleaseDigest string    `json:"release_digest"`
	Nodes         []string  `json:"nodes"`
	Status        string    `json:"status"`
	Cursor        int       `json:"cursor"`
	Error         string    `json:"error,omitempty"`
	Actor         string    `json:"actor"`
	CreatedAt     time.Time `json:"created_at"`
	Steps         []Step    `json:"steps"`
}
type Step struct {
	UpgradeID    string `json:"upgrade_id"`
	ID           int    `json:"step_id"`
	NodeID       string `json:"node_id"`
	Action       string `json:"action"`
	TargetDigest string `json:"target_digest"`
	PeerNode     string `json:"peer_node,omitempty"`
	Status       string `json:"status"`
	Error        string `json:"error,omitempty"`
}
type Preflight struct {
	ReleaseDigest    string   `json:"release_digest"`
	ExpectedRevision int64    `json:"expected_revision"`
	PrimaryNode      string   `json:"primary_node"`
	Nodes            []string `json:"nodes"`
	Blockers         []string `json:"blockers"`
	Strategy         string   `json:"strategy"`
}
type Event struct {
	ID        int64     `json:"id"`
	Kind      string    `json:"kind"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

// Runtime owns all local process and routing operations. Implementations must be
// restart-idempotent and stop promptly when context is cancelled.
type Runtime interface {
	Prepare(context.Context, Release, string) error
	Redirect(context.Context, Node) error
	DrainStop(context.Context, string) error
	Start(context.Context, string, rc.PrepareRequest) (rc.Status, error)
	Maintenance(context.Context) error
	Stopped(context.Context) (bool, error)
	Admit(context.Context, rc.Admission) (rc.Status, error)
	Local(context.Context) error
	Status(context.Context) (rc.Status, string, error)
	RouteRevision() int64
}
type LockRunner interface {
	WithLock(context.Context, string, time.Duration, func(context.Context) error) (bool, error)
}

// PrimaryFirst stops every follower, migrates and restarts the primary, then
// restarts the followers: the only strategy for a release that changes the
// schema, and the fallback whenever a node cannot run Rolling.
const PrimaryFirst = "primary-first-v1"

// Rolling (2026-11-08) restarts one node at a time while the others keep
// serving. Each node first yields its new requests to the serving nodes
// (Node.Offloading, the CPU offload channel), drains and restarts its core
// on the target release, serves locally again and takes its traffic back.
// Only a release whose SchemaBefore equals its SchemaAfter and whose signed
// strategy is "rolling" qualifies, and every enabled node must be a Rolling
// shell with at least two of them serving (Preflight).
const Rolling = "rolling-v1"

// KnownStrategy reports a plan strategy this controller executes.
func KnownStrategy(s string) bool { return s == PrimaryFirst || s == Rolling }

// PeerProtocol 2: Redis registrations carry the SHA-256 of the node key
// (peer.Protocol); every gateway of a cluster must agree.
const PeerProtocol = 2

// Steps are interpreted only for the persisted strategy. Never reinterpret a
// pre-existing rolling plan's cursor using this stop-the-cluster algorithm.
func Steps(p Plan) []Step {
	if !KnownStrategy(p.Strategy) || len(p.Nodes) == 0 {
		return nil
	}
	out := make([]Step, 0, len(p.Nodes)*7)
	add := func(n, a, peer string) {
		out = append(out, Step{UpgradeID: p.ID, ID: len(out), NodeID: n, Action: a, TargetDigest: p.ReleaseDigest, PeerNode: peer, Status: "pending"})
	}
	for _, n := range p.Nodes {
		add(n, "prepare", "")
	}
	if p.Strategy == Rolling {
		// Followers first, the primary last: it coordinates the plan and the
		// plugins, so it is the node whose core restarts with the most
		// certainty that the target release serves.
		order := append(append([]string{}, p.Nodes[1:]...), p.Nodes[0])
		for _, n := range order {
			add(n, "yield", "")
			add(n, "stop", "")
			add(n, "start", "")
			add(n, "admit", "")
			add(n, "local", "")
			add(n, "resume", "")
		}
		return out
	}
	primary := p.Nodes[0]
	for _, n := range p.Nodes[1:] {
		add(n, "redirect", primary)
		add(n, "stop", "")
	}
	add(primary, "maintenance", "")
	add(primary, "stop", "")
	add(primary, "start-primary", "")
	add(primary, "admit", "")
	add(primary, "local", "")
	for _, n := range p.Nodes[1:] {
		add(n, "redirect", primary)
		add(n, "start", "")
		add(n, "admit", "")
		add(n, "local", "")
	}
	return out
}
