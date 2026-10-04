package control

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/Masterminds/semver/v3"
	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/peer"
	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
	"net/url"
	"sort"
	"strings"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

//go:embed schema.sql
var Schema string
var ErrConflict = errors.New("updater state changed; repeat preflight")

type Store struct {
	Updates           *UpdateService
	telemetrySequence atomic.Uint64
	DB                *pgxpool.Pool
	Cluster           string
	Locks             LockRunner
	Redis             redis.UniversalClient
	RevokePeer        func(context.Context, string) error
	nodeDirectory     atomic.Pointer[[]Node]
}

// EnsureSchema installs or extends the shell schema. Shells starting together
// take turns, so concurrent CREATE IF NOT EXISTS cannot collide.
func (s *Store) EnsureSchema(ctx context.Context) error {
	_, err := s.DB.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext('sub2api-shell-schema'));\n"+Schema)
	return err
}
func (s *Store) InitCluster(ctx context.Context, primary, baseline string) error {
	_, err := s.DB.Exec(ctx, `INSERT INTO updater.clusters(cluster_id,primary_node,baseline) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, s.Cluster, primary, baseline)
	return err
}
func (s *Store) ClusterState(ctx context.Context) (primary, baseline string, revision int64, err error) {
	err = s.DB.QueryRow(ctx, `SELECT primary_node,baseline,revision FROM updater.clusters WHERE cluster_id=$1`, s.Cluster).Scan(&primary, &baseline, &revision)
	return
}
func (s *Store) PutRelease(ctx context.Context, r Release) error {
	m, _ := json.Marshal(r.Manifest)
	signed, _ := json.Marshal(r.Signed)
	tag, err := s.DB.Exec(ctx, `INSERT INTO updater.releases(digest,release_id,manifest,signed_manifest,bundle_base) VALUES($1,$2,$3,$4,$5) ON CONFLICT(digest) DO NOTHING`, r.Digest, r.Manifest.ReleaseID, m, signed, r.BundleBase)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		old, e := s.Release(ctx, r.Digest)
		if e != nil {
			return e
		}
		if old.Manifest.ReleaseID != r.Manifest.ReleaseID {
			return ErrConflict
		}
	}
	return nil
}
func (s *Store) Release(ctx context.Context, digest string) (r Release, err error) {
	var m, b []byte
	r.Digest = digest
	err = s.DB.QueryRow(ctx, `SELECT manifest,signed_manifest,bundle_base FROM updater.releases WHERE digest=$1`, digest).Scan(&m, &b, &r.BundleBase)
	if err != nil {
		return
	}
	err = json.Unmarshal(m, &r.Manifest)
	if err == nil {
		err = json.Unmarshal(b, &r.Signed)
	}
	return
}
func (s *Store) Releases(ctx context.Context) ([]Release, error) {
	rows, err := s.DB.Query(ctx, `SELECT digest FROM updater.releases ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		return nil, err
	}
	var ids []string
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return nil, err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	out := []Release{}
	for _, id := range ids {
		r, e := s.Release(ctx, id)
		if e != nil {
			return nil, e
		}
		out = append(out, r)
	}
	return out, nil
}
func (s *Store) Register(ctx context.Context, n Node) error {
	return s.WithRegistration(ctx, n.ID, func(ctx context.Context) error { return s.RegisterLocked(ctx, n) })
}

// RegisterLocked is called by peer registration after checking Redis for a
// conflicting live boot, while holding the same short registration lock.
func (s *Store) RegisterLocked(ctx context.Context, n Node) error {
	if n.ID == "" || n.ShellBootID == "" || n.PeerProtocol != PeerProtocol || n.Strategy != PrimaryFirst {
		return errors.New("node identity or shell capabilities are unsupported")
	}
	return s.withChange(ctx, func(ctx context.Context) error {
		tx, err := s.DB.Begin(ctx)
		if err != nil {
			return err
		}
		defer tx.Rollback(ctx)
		var plan string
		if err = tx.QueryRow(ctx, `SELECT COALESCE((SELECT id FROM updater.upgrades WHERE cluster_id=$1 AND status IN ('running','paused')),'')`, s.Cluster).Scan(&plan); err != nil {
			return err
		}
		tag, err := tx.Exec(ctx, `INSERT INTO updater.nodes(node_id,cluster_id,peer_url,shell_boot_id,os,arch,runtime_abi,peer_protocol,strategy,joining_plan) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
 ON CONFLICT(node_id) DO UPDATE SET peer_url=EXCLUDED.peer_url,shell_boot_id=EXCLUDED.shell_boot_id,
 ready=CASE WHEN updater.nodes.shell_boot_id=EXCLUDED.shell_boot_id THEN updater.nodes.ready ELSE false END,
 stopped=CASE WHEN updater.nodes.shell_boot_id=EXCLUDED.shell_boot_id THEN updater.nodes.stopped ELSE false END,
 mode=CASE WHEN updater.nodes.shell_boot_id=EXCLUDED.shell_boot_id THEN updater.nodes.mode ELSE 'maintenance' END,
 last_seen=now(),os=EXCLUDED.os,arch=EXCLUDED.arch,runtime_abi=EXCLUDED.runtime_abi,peer_protocol=EXCLUDED.peer_protocol,strategy=EXCLUDED.strategy,
 joining_plan=CASE WHEN updater.nodes.shell_boot_id=EXCLUDED.shell_boot_id THEN updater.nodes.joining_plan ELSE EXCLUDED.joining_plan END,
 cpu_percent=CASE WHEN updater.nodes.shell_boot_id=EXCLUDED.shell_boot_id THEN updater.nodes.cpu_percent END,
 offloading=updater.nodes.offloading AND updater.nodes.shell_boot_id=EXCLUDED.shell_boot_id
 WHERE updater.nodes.cluster_id=EXCLUDED.cluster_id AND updater.nodes.enabled`, n.ID, s.Cluster, n.PeerURL, n.ShellBootID, n.OS, n.Arch, n.RuntimeABI, n.PeerProtocol, n.Strategy, plan)
		if err != nil {
			return err
		}
		if tag.RowsAffected() != 1 {
			return errors.New("node is disabled or belongs to another cluster")
		}
		return tx.Commit(ctx)
	})
}
func (s *Store) Heartbeat(ctx context.Context, n Node) error {
	observedLocally := time.Now()
	var accepted bool
	err := s.DB.QueryRow(ctx, `WITH changed AS (
 UPDATE updater.nodes SET release_digest=$3,core_boot_id=$4,mode=$5,ready=$6,
 last_seen=now(),route_revision=$8,stopped=$9,offloading=$10,telemetry_boot_id=$7,
 cpu_percent=CASE WHEN EXISTS(SELECT 1 FROM updater.nodes legacy WHERE legacy.cluster_id=$2 AND legacy.enabled AND legacy.telemetry_boot_id<>legacy.shell_boot_id) THEN $11::double precision ELSE NULL END,error=''
 WHERE node_id=$1 AND cluster_id=$2 AND shell_boot_id=$7 AND enabled AND (
 (release_digest,core_boot_id,mode,ready,route_revision,stopped,offloading,telemetry_boot_id)
 IS DISTINCT FROM ($3::text,$4::text,$5::text,$6::boolean,$8::bigint,$9::boolean,$10::boolean,$7::text)
 OR (cpu_percent IS NOT NULL AND NOT EXISTS(SELECT 1 FROM updater.nodes legacy WHERE legacy.cluster_id=$2 AND legacy.enabled AND legacy.telemetry_boot_id<>legacy.shell_boot_id))
 OR (last_seen<now()-interval '5 seconds' AND EXISTS (
 SELECT 1 FROM updater.nodes legacy WHERE legacy.cluster_id=$2 AND legacy.enabled AND legacy.telemetry_boot_id<>legacy.shell_boot_id)))
 RETURNING node_id)
 SELECT EXISTS(SELECT 1 FROM changed) OR EXISTS(SELECT 1 FROM updater.nodes WHERE node_id=$1 AND cluster_id=$2 AND shell_boot_id=$7 AND enabled)`, n.ID, s.Cluster, n.ReleaseDigest, n.CoreBootID, n.Mode, n.Ready, n.ShellBootID, n.RouteRevision, n.Stopped, n.Offloading, n.CPUPercent).Scan(&accepted)
	if err != nil {
		return err
	}
	if !accepted {
		return ErrConflict
	}
	return s.reportTelemetry(ctx, n, observedLocally)
}
func (s *Store) Nodes(ctx context.Context) ([]Node, error) {
	rows, err := s.DB.Query(ctx, `SELECT node_id,peer_url,shell_boot_id,release_digest,core_boot_id,mode,ready,last_seen,error,os,arch,runtime_abi,route_revision,stopped,enabled,peer_protocol,strategy,joining_plan,cpu_percent,offloading,telemetry_boot_id FROM updater.nodes WHERE cluster_id=$1 ORDER BY node_id`, s.Cluster)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Node{}
	for rows.Next() {
		var n Node
		if err = rows.Scan(&n.ID, &n.PeerURL, &n.ShellBootID, &n.ReleaseDigest, &n.CoreBootID, &n.Mode, &n.Ready, &n.LastSeen, &n.Error, &n.OS, &n.Arch, &n.RuntimeABI, &n.RouteRevision, &n.Stopped, &n.Enabled, &n.PeerProtocol, &n.Strategy, &n.JoiningPlan, &n.CPUPercent, &n.Offloading, &n.TelemetryBootID); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()
	return out, s.RefreshTelemetry(ctx, out)
}

// NodesWithPackage returns enabled nodes that hold the given plugin package.
func (s *Store) NodesWithPackage(ctx context.Context, sum string) ([]Node, error) {
	rows, err := s.DB.Query(ctx, `
		SELECT n.node_id, n.peer_url, n.shell_boot_id, n.core_boot_id, n.ready, n.last_seen, n.enabled
		FROM updater.nodes n
		JOIN updater.node_plugin_packages p ON n.cluster_id = p.cluster_id AND n.node_id = p.node_id
		WHERE n.cluster_id = $1 AND p.digest = $2 AND n.enabled = true
		ORDER BY n.last_seen DESC
	`, s.Cluster, sum)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Node
	for rows.Next() {
		var n Node
		if err = rows.Scan(&n.ID, &n.PeerURL, &n.ShellBootID, &n.CoreBootID, &n.Ready, &n.LastSeen, &n.Enabled); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

// NodeDirectory returns the most recent heartbeat snapshot. Only revocation
// operations (DisableNode) and explicit preflight checks must query PG for
// strong consistency; authorization and routing use this cached view.
func (s *Store) NodeDirectory() []Node {
	if ptr := s.nodeDirectory.Load(); ptr != nil {
		return *ptr
	}
	return nil
}

// RefreshNodeDirectory updates the cached node snapshot. Called by Heartbeat.
func (s *Store) RefreshNodeDirectory(ctx context.Context) error {
	nodes, err := s.Nodes(ctx)
	if err != nil {
		return err
	}
	s.nodeDirectory.Store(&nodes)
	return nil
}

func (s *Store) Preflight(ctx context.Context, digest string) (Preflight, error) {
	p := Preflight{ReleaseDigest: digest, Nodes: []string{}, Blockers: []string{}, Strategy: PrimaryFirst}
	primary, base, rev, err := s.ClusterState(ctx)
	if err != nil {
		return p, err
	}
	p.PrimaryNode = primary
	p.ExpectedRevision = rev
	target, err := s.Release(ctx, digest)
	if err != nil {
		return p, err
	}
	current, err := s.Release(ctx, base)
	if err != nil {
		return p, err
	}
	p.Blockers = append(p.Blockers, Compatibility(current, target)...)
	pluginBlockers, err := s.PluginCompatibility(ctx, target.Manifest.CoreVersion)
	if err != nil {
		return p, err
	}
	p.Blockers = append(p.Blockers, pluginBlockers...)
	for _, check := range []func(context.Context) ([]string, error){s.PluginMutationBlockers, s.UnmanagedBlockers} {
		blockers, err := check(ctx)
		if err != nil {
			return p, err
		}
		p.Blockers = append(p.Blockers, blockers...)
	}
	nodes, err := s.Nodes(ctx)
	if err != nil {
		return p, err
	}
	if len(nodes) < 1 {
		p.Blockers = append(p.Blockers, "upgrade requires at least one registered node")
	}
	for _, n := range nodes {
		p.Nodes = append(p.Nodes, n.ID)
		if !n.Enabled {
			// Disabled nodes do not block preflight; they are excluded from plans.
			continue
		}
		if n.PeerProtocol != PeerProtocol || n.Strategy != PrimaryFirst {
			p.Blockers = append(p.Blockers, "node lacks enabled current shell/peer capabilities: "+n.ID)
		}
		if !n.Ready || n.Mode != "local" || time.Since(n.LastSeen) > 20*time.Second {
			p.Blockers = append(p.Blockers, "node not locally ready: "+n.ID)
		}
		if n.ReleaseDigest != base {
			p.Blockers = append(p.Blockers, "node not on approved baseline: "+n.ID)
		}
		found := false
		for _, plat := range target.Manifest.Platforms {
			if plat.OS == n.OS && plat.Arch == n.Arch && plat.RuntimeABI == n.RuntimeABI {
				found = true
			}
		}
		if !found {
			p.Blockers = append(p.Blockers, "unsupported node platform: "+n.ID)
		}
	}
	sort.SliceStable(p.Nodes, func(i, j int) bool {
		if p.Nodes[i] == primary {
			return p.Nodes[j] != primary
		}
		if p.Nodes[j] == primary {
			return false
		}
		return p.Nodes[i] < p.Nodes[j]
	})
	if len(p.Nodes) == 0 || p.Nodes[0] != primary {
		p.Blockers = append(p.Blockers, "primary is not registered")
	}
	var active bool
	err = s.DB.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.upgrades WHERE cluster_id=$1 AND status IN ('running','paused'))`, s.Cluster).Scan(&active)
	if err != nil {
		return p, err
	}
	if active {
		p.Blockers = append(p.Blockers, "another upgrade is active")
	}
	return p, nil
}

// Compatibility validates the signed migration start and executable protocols.
// Database changes run with all followers stopped; equality is not required.
func Compatibility(old, target Release) []string {
	out := []string{}
	a, b := old.Manifest, target.Manifest
	if _, err := semver.NewVersion(b.CoreVersion); err != nil {
		out = append(out, "target core_version must be explicit semantic version")
	}
	if b.Strategy != "maintenance" && b.Strategy != "rolling" {
		out = append(out, "unsupported signed release strategy")
	}
	if a.SchemaAfter == "" || b.SchemaBefore != a.SchemaAfter || b.SchemaAfter == "" {
		out = append(out, "target migration must start at the approved baseline schema")
	}
	if b.Strategy == "rolling" && b.SchemaBefore != b.SchemaAfter {
		out = append(out, "schema-changing releases must declare maintenance strategy")
	}
	if !b.ShellProtocol.Contains(rc.Protocol) || !b.CoreControlProtocol.Contains(rc.Protocol) {
		out = append(out, "release requires a different shell/control protocol")
	}
	if b.ClusterProtocol != (rc.Range{Min: rc.ClusterProtocolVersion, Max: rc.ClusterProtocolVersion}) || b.TaskProtocol != (rc.Range{Min: rc.TaskProtocolVersion, Max: rc.TaskProtocolVersion}) || b.HostAPIVersion != rc.HostAPIVersion {
		out = append(out, "target business protocols or Host API are not implemented by this shell release")
	}
	if a.BuildID == b.BuildID {
		out = append(out, "target build is already installed")
	}
	return out
}

func rollbackCompatibility(from, to Release) []string {
	out := []string{}
	if from.Manifest.SchemaBefore != to.Manifest.SchemaAfter || from.Manifest.SchemaAfter != to.Manifest.SchemaAfter || from.Manifest.ClusterProtocol != to.Manifest.ClusterProtocol || from.Manifest.TaskProtocol != to.Manifest.TaskProtocol || from.Manifest.HostAPIVersion != to.Manifest.HostAPIVersion {
		out = append(out, "automatic baseline recovery is forbidden across schema or business protocol changes")
	}
	return out
}

// PluginCompatibility checks every currently serving or activating version,
// including third-party plugins. Candidate admission repeats the runtime check.
func (s *Store) PluginCompatibility(ctx context.Context, version string) ([]string, error) {
	var present bool
	if err := s.DB.QueryRow(ctx, `SELECT to_regclass('public.plugins') IS NOT NULL`).Scan(&present); err != nil {
		return nil, err
	}
	if !present {
		return nil, nil
	} // shell-only bootstrap database has no plugins yet
	var missing bool
	if err := s.DB.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM plugins WHERE status IN ('enabled','upgrading') AND COALESCE(active_version,'')='')`).Scan(&missing); err != nil {
		return nil, err
	}
	v, err := semver.NewVersion(version)
	if err != nil {
		return []string{"target core_version is missing or invalid"}, nil
	}
	clean, err := v.SetPrerelease("")
	if err != nil {
		return nil, err
	}
	rows, err := s.DB.Query(ctx, `SELECT DISTINCT p.key,versions.version,COALESCE(v.manifest->>'hostCompat','')
	 FROM plugins p
	 LEFT JOIN plugin_rollouts r ON r.plugin_key=p.key AND r.phase IN ('preparing','activating')
	 CROSS JOIN LATERAL (SELECT p.active_version AS version UNION SELECT r.from_version UNION SELECT r.target_version) versions
	 LEFT JOIN plugin_versions v ON v.plugin_key=p.key AND v.version=versions.version
	 WHERE p.status IN ('enabled','upgrading') AND versions.version IS NOT NULL`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	if missing {
		out = append(out, "an enabled plugin has no active approved version")
	}
	for rows.Next() {
		var key, ver, expression string
		if err = rows.Scan(&key, &ver, &expression); err != nil {
			return nil, err
		}
		constraint, e := semver.NewConstraint(expression)
		if expression == "" || e != nil || !constraint.Check(&clean) {
			out = append(out, fmt.Sprintf("plugin %s@%s is incompatible with core %s", key, ver, version))
		}
	}
	return out, rows.Err()
}

func (s *Store) Create(ctx context.Context, digest string, revision int64, key, actor string) (Plan, error) {
	var out Plan
	err := s.withChange(ctx, func(ctx context.Context) error {
		var err error
		out, err = s.createLocked(ctx, digest, revision, key, actor)
		return err
	})
	if err == nil {
		s.NotifyUpgrade(ctx)
	}
	return out, err
}
func (s *Store) createLocked(ctx context.Context, digest string, revision int64, key, actor string) (Plan, error) {
	var empty Plan
	if key == "" || len(key) > 128 {
		return empty, errors.New("idempotency_key is required and must be at most 128 bytes")
	}
	hash := sha256.Sum256([]byte(fmt.Sprintf("%s:%d", digest, revision)))
	requestHash := hex.EncodeToString(hash[:])
	var id, priorHash string
	err := s.DB.QueryRow(ctx, `SELECT id,request_hash FROM updater.upgrades WHERE cluster_id=$1 AND idempotency_key=$2`, s.Cluster, key).Scan(&id, &priorHash)
	if err == nil {
		if priorHash != requestHash {
			return empty, ErrConflict
		}
		return s.Plan(ctx, id)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return empty, err
	}
	pf, err := s.Preflight(ctx, digest)
	if err != nil {
		return empty, err
	}
	if len(pf.Blockers) > 0 {
		return empty, errors.New(strings.Join(pf.Blockers, "; "))
	}
	if pf.ExpectedRevision != revision {
		return empty, ErrConflict
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return empty, err
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, `UPDATE updater.clusters SET revision=revision+1 WHERE cluster_id=$1 AND revision=$2`, s.Cluster, revision)
	if err != nil {
		return empty, err
	}
	if tag.RowsAffected() != 1 {
		return empty, ErrConflict
	}
	random := make([]byte, 16)
	if _, err = rand.Read(random); err != nil {
		return empty, err
	}
	id = hex.EncodeToString(random)
	nodes, _ := json.Marshal(pf.Nodes)
	_, err = tx.Exec(ctx, `INSERT INTO updater.upgrades(id,cluster_id,release_digest,nodes,actor,idempotency_key,request_hash,strategy,source_digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8,(SELECT baseline FROM updater.clusters WHERE cluster_id=$2))`, id, s.Cluster, digest, nodes, actor, key, requestHash, PrimaryFirst)
	if err != nil {
		return empty, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO updater.events(upgrade_id,kind,message) VALUES($1,'created','primary-first maintenance update approved')`, id)
	if err != nil {
		return empty, err
	}
	if err = tx.Commit(ctx); err != nil {
		return empty, err
	}
	return s.Plan(ctx, id)
}
func (s *Store) Plan(ctx context.Context, id string) (p Plan, err error) {
	var nodes []byte
	err = s.DB.QueryRow(ctx, `SELECT id,release_digest,nodes,status,cursor,error,actor,created_at,strategy,source_digest FROM updater.upgrades WHERE id=$1 AND cluster_id=$2`, id, s.Cluster).Scan(&p.ID, &p.ReleaseDigest, &nodes, &p.Status, &p.Cursor, &p.Error, &p.Actor, &p.CreatedAt, &p.Strategy, &p.SourceDigest)
	if err != nil {
		return
	}
	if err = json.Unmarshal(nodes, &p.Nodes); err != nil {
		return
	}
	p.Steps = []Step{}
	rows, err := s.DB.Query(ctx, `SELECT upgrade_id,step_id,node_id,action,target_digest,peer_node,status,error FROM updater.steps WHERE upgrade_id=$1 ORDER BY step_id`, id)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var st Step
		if err = rows.Scan(&st.UpgradeID, &st.ID, &st.NodeID, &st.Action, &st.TargetDigest, &st.PeerNode, &st.Status, &st.Error); err != nil {
			return
		}
		p.Steps = append(p.Steps, st)
	}
	err = rows.Err()
	return
}
func (s *Store) Plans(ctx context.Context) ([]Plan, error) {
	rows, err := s.DB.Query(ctx, `SELECT id FROM updater.upgrades WHERE cluster_id=$1 ORDER BY created_at DESC LIMIT 50`, s.Cluster)
	if err != nil {
		return nil, err
	}
	var ids []string
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return nil, err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	out := []Plan{}
	for _, id := range ids {
		p, e := s.Plan(ctx, id)
		if e != nil {
			return nil, e
		}
		out = append(out, p)
	}
	return out, nil
}
func (s *Store) Events(ctx context.Context, id string, after int64) ([]Event, error) {
	rows, err := s.DB.Query(ctx, `SELECT e.id,e.kind,e.message,e.created_at FROM updater.events e JOIN updater.upgrades u ON u.id=e.upgrade_id WHERE e.upgrade_id=$1 AND u.cluster_id=$2 AND e.id>$3 ORDER BY e.id LIMIT 200`, id, s.Cluster, after)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Event{}
	for rows.Next() {
		var e Event
		if err = rows.Scan(&e.ID, &e.Kind, &e.Message, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}
func (s *Store) Action(ctx context.Context, id, action, actor string) (Plan, error) {
	if action == "rollback" {
		return s.Rollback(ctx, id, actor)
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return Plan{}, err
	}
	defer tx.Rollback(ctx)
	var status, strategy string
	var cursor int
	err = tx.QueryRow(ctx, `SELECT status,cursor,strategy FROM updater.upgrades WHERE id=$1 AND cluster_id=$2 FOR UPDATE`, id, s.Cluster).Scan(&status, &cursor, &strategy)
	if err != nil {
		return Plan{}, err
	}
	switch action {
	case "pause":
		if status != "running" && status != "paused" {
			return Plan{}, ErrConflict
		}
		status = "paused"
	case "resume":
		if strategy != PrimaryFirst {
			return Plan{}, errors.New("legacy upgrade strategy cannot resume with this controller")
		}
		if status != "paused" {
			return Plan{}, ErrConflict
		}
		status = "running"
		_, err = tx.Exec(ctx, `UPDATE updater.steps SET status='pending',error='' WHERE upgrade_id=$1 AND status='failed'`, id)
	case "cancel":
		var disruptive bool
		err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.steps WHERE upgrade_id=$1 AND action<>'prepare')`, id).Scan(&disruptive)
		if err != nil {
			return Plan{}, err
		}
		if disruptive {
			return Plan{}, errors.New("cannot cancel after routing or process changes; pause and resume the same plan")
		}
		if status != "running" && status != "paused" {
			return Plan{}, ErrConflict
		}
		status = "cancelled"
	default:
		return Plan{}, errors.New("unsupported action; rollback requires an independently approved compatible release")
	}
	if err != nil {
		return Plan{}, err
	}
	_, err = tx.Exec(ctx, `UPDATE updater.upgrades SET status=$2,error='',updated_at=now() WHERE id=$1`, id, status)
	if err != nil {
		return Plan{}, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO updater.events(upgrade_id,kind,message) VALUES($1,$2,$3)`, id, action, "operator "+actor)
	if err != nil {
		return Plan{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Plan{}, err
	}
	s.NotifyUpgrade(ctx)
	return s.Plan(ctx, id)
}

// Rollback replaces a paused plan with a new, fully journaled rolling plan.
// Its only target is the cluster's last completed baseline; it never switches
// files directly and never authorizes a schema or protocol downgrade.
func (s *Store) Rollback(ctx context.Context, id, actor string) (Plan, error) {
	var out Plan
	err := s.withChange(ctx, func(ctx context.Context) error {
		var err error
		out, err = s.rollbackWithBarrier(ctx, id, actor)
		return err
	})
	if err == nil {
		s.NotifyUpgrade(ctx)
	}
	return out, err
}
func (s *Store) rollbackWithBarrier(ctx context.Context, id, actor string) (Plan, error) {
	p, err := s.Plan(ctx, id)
	if err != nil {
		return Plan{}, err
	}
	if p.Strategy != PrimaryFirst {
		return Plan{}, errors.New("legacy upgrade strategy cannot be recovered automatically")
	}
	if p.Status == "superseded" {
		return s.rollbackLocked(ctx, id, actor)
	}
	if p.Status != "paused" {
		return Plan{}, errors.New("pause the active plan before requesting baseline recovery")
	}
	if s.Locks == nil {
		return Plan{}, errors.New("rollback coordination is unavailable")
	}
	// A paused plan can still have an already-running step. Drain those
	// critical sections before choosing a traffic anchor for the new plan.
	names := append([]string(nil), p.Nodes...)
	sort.Strings(names)
	keys := []string{"system:upgrade:" + s.Cluster}
	for _, node := range names {
		keys = append(keys, "system:upgrade-node:"+s.Cluster+":"+node)
	}
	bounded, cancel := context.WithTimeout(ctx, 25*time.Second)
	defer cancel()
	var out Plan
	var acquire func(context.Context, int) error
	acquire = func(lockCtx context.Context, i int) error {
		if i == len(keys) {
			var e error
			out, e = s.rollbackLocked(lockCtx, id, actor)
			return e
		}
		ran, e := s.Locks.WithLock(lockCtx, keys[i], 25*time.Second, func(next context.Context) error { return acquire(next, i+1) })
		if e != nil {
			return e
		}
		if !ran {
			return errors.New("an update step is still running; keep the plan paused and retry recovery")
		}
		return nil
	}
	if err = acquire(bounded, 0); err != nil {
		return Plan{}, err
	}
	return out, nil
}
func (s *Store) rollbackLocked(ctx context.Context, id, actor string) (Plan, error) {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return Plan{}, err
	}
	defer tx.Rollback(ctx)
	var status, target string
	var raw []byte
	if err = tx.QueryRow(ctx, `SELECT status,release_digest,nodes FROM updater.upgrades WHERE id=$1 AND cluster_id=$2 FOR UPDATE`, id, s.Cluster).Scan(&status, &target, &raw); err != nil {
		return Plan{}, err
	}
	key := "rollback:" + id
	if status == "superseded" {
		var existing string
		if err = tx.QueryRow(ctx, `SELECT id FROM updater.upgrades WHERE cluster_id=$1 AND idempotency_key=$2`, s.Cluster, key).Scan(&existing); err != nil {
			return Plan{}, err
		}
		if err = tx.Commit(ctx); err != nil {
			return Plan{}, err
		}
		return s.Plan(ctx, existing)
	}
	if status != "paused" {
		return Plan{}, errors.New("pause the active plan before requesting baseline recovery")
	}
	for _, check := range []func(context.Context) ([]string, error){s.PluginMutationBlockers, s.UnmanagedBlockers} {
		b, e := check(ctx)
		if e != nil {
			return Plan{}, e
		}
		if len(b) > 0 {
			return Plan{}, errors.New(strings.Join(b, "; "))
		}
	}
	var baseline string
	var revision int64
	if err = tx.QueryRow(ctx, `SELECT baseline,revision FROM updater.clusters WHERE cluster_id=$1 FOR UPDATE`, s.Cluster).Scan(&baseline, &revision); err != nil {
		return Plan{}, err
	}
	if target == baseline {
		return Plan{}, errors.New("this plan already targets the completed baseline; resume it after resolving its blocker")
	}
	from, err := s.Release(ctx, target)
	if err != nil {
		return Plan{}, err
	}
	to, err := s.Release(ctx, baseline)
	if err != nil {
		return Plan{}, err
	}
	if blockers := rollbackCompatibility(from, to); len(blockers) > 0 {
		return Plan{}, fmt.Errorf("baseline recovery is incompatible: %s", strings.Join(blockers, "; "))
	}
	blockers, err := s.PluginCompatibility(ctx, to.Manifest.CoreVersion)
	if err != nil {
		return Plan{}, err
	}
	if len(blockers) > 0 {
		return Plan{}, fmt.Errorf("baseline no longer supports active plugins: %s", strings.Join(blockers, "; "))
	}
	var members []string
	if err = json.Unmarshal(raw, &members); err != nil {
		return Plan{}, err
	}
	if len(members) < 1 {
		return Plan{}, errors.New("baseline recovery has no members")
	}
	primary, _, _, err := s.ClusterState(ctx)
	if err != nil {
		return Plan{}, err
	}
	sort.SliceStable(members, func(i, j int) bool {
		if members[i] == primary {
			return members[j] != primary
		}
		if members[j] == primary {
			return false
		}
		return members[i] < members[j]
	})
	if members[0] != primary {
		return Plan{}, errors.New("configured primary is not a plan member")
	}
	ordered := members
	bytes := make([]byte, 16)
	if _, err = rand.Read(bytes); err != nil {
		return Plan{}, err
	}
	nextID := hex.EncodeToString(bytes)
	encoded, _ := json.Marshal(ordered)
	if _, err = tx.Exec(ctx, `UPDATE updater.upgrades SET status='superseded',error='',updated_at=now() WHERE id=$1`, id); err != nil {
		return Plan{}, err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO updater.upgrades(id,cluster_id,release_digest,nodes,actor,idempotency_key,request_hash,strategy,source_digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8,(SELECT baseline FROM updater.clusters WHERE cluster_id=$2))`, nextID, s.Cluster, baseline, encoded, actor, key, fmt.Sprintf("%s:%d", baseline, revision), PrimaryFirst); err != nil {
		return Plan{}, err
	}
	if _, err = tx.Exec(ctx, `UPDATE updater.clusters SET revision=revision+1 WHERE cluster_id=$1`, s.Cluster); err != nil {
		return Plan{}, err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO updater.events(upgrade_id,kind,message) VALUES($1,'superseded',$2),($3,'recovery',$4)`, id, "replaced by baseline recovery "+nextID, nextID, "recover completed baseline from "+id+" by "+actor); err != nil {
		return Plan{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Plan{}, err
	}
	return s.Plan(ctx, nextID)
}

const clusterChangeLock = rc.ClusterChangeLock

func (s *Store) withChange(ctx context.Context, fn func(context.Context) error) error {
	if s.Locks == nil {
		return errors.New("cluster change coordination unavailable")
	}
	ran, err := s.Locks.WithLock(ctx, clusterChangeLock, 30*time.Second, fn)
	if err != nil {
		return err
	}
	if !ran {
		return errors.New("another cluster change is in progress")
	}
	return nil
}
func (s *Store) WithRegistration(ctx context.Context, node string, fn func(context.Context) error) error {
	if s.Locks == nil {
		return errors.New("node registration coordination unavailable")
	}
	ran, err := s.Locks.WithLock(ctx, "system:node-registration:"+s.Cluster+":"+node, 15*time.Second, fn)
	if err != nil {
		return err
	}
	if !ran {
		return errors.New("node registration is busy")
	}
	return nil
}
func (s *Store) ValidateNode(ctx context.Context, node, boot string) error {
	var ok bool
	err := s.DB.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.nodes WHERE cluster_id=$1 AND node_id=$2 AND shell_boot_id=$3 AND enabled AND peer_protocol=$4 AND strategy=$5)`, s.Cluster, node, boot, PeerProtocol, PrimaryFirst).Scan(&ok)
	if err != nil {
		return err
	}
	if !ok {
		return errors.New("node boot is disabled or not registered")
	}
	return nil
}
func (s *Store) DisableNode(ctx context.Context, node string) error {
	return s.WithRegistration(ctx, node, func(ctx context.Context) error {
		tag, err := s.DB.Exec(ctx, `UPDATE updater.nodes SET enabled=false,ready=false WHERE cluster_id=$1 AND node_id=$2`, s.Cluster, node)
		if err != nil {
			return err
		}
		if tag.RowsAffected() != 1 {
			return pgx.ErrNoRows
		}
		s.NotifyUpgrade(ctx)
		if _, err = s.DB.Exec(ctx, `UPDATE updater.node_admissions SET serve_http=false,claim_background=false,coordinate_plugins=false,revision=revision+1 WHERE cluster_id=$1 AND node_id=$2`, s.Cluster, node); err != nil {
			return err
		}
		if s.RevokePeer == nil {
			return errors.New("node disabled; Redis revocation pending")
		}
		if err = s.RevokePeer(ctx, node); err != nil {
			return errors.New("node disabled; Redis revocation pending")
		}
		return nil
	})
}

// AuthorizePeer classifies failures for the private listener: a stale or
// disabled source is 401, a disallowed operation 403, storage errors 503.
func (s *Store) AuthorizePeer(ctx context.Context, source, boot, target, scope, digest string) error {
	var offloading bool
	err := s.DB.QueryRow(ctx, `SELECT offloading FROM updater.nodes WHERE cluster_id=$1 AND node_id=$2 AND shell_boot_id=$3 AND enabled AND peer_protocol=$4 AND strategy=$5`, s.Cluster, source, boot, PeerProtocol, PrimaryFirst).Scan(&offloading)
	if errors.Is(err, pgx.ErrNoRows) {
		return peer.ErrUnauthorized
	}
	if err != nil {
		return peer.ErrUnavailable
	}
	primary, baseline, _, err := s.ClusterState(ctx)
	if err != nil {
		return peer.ErrUnavailable
	}
	var enabled bool
	if err = s.DB.QueryRow(ctx, `SELECT enabled FROM updater.nodes WHERE cluster_id=$1 AND node_id=$2`, s.Cluster, target).Scan(&enabled); err != nil {
		return peer.ErrUnavailable
	}
	if enabled && source != target && scope == "forward" && offloading {
		// An overloaded serving node may hand new requests to any serving node,
		// the primary's to a follower included. The private router still only
		// serves them locally and never forwards them again.
		return nil
	}
	if !enabled || target != primary || source == primary {
		return fmt.Errorf("%w: peer direction is not permitted", peer.ErrForbidden)
	}
	if scope == "forward" {
		return nil
	}
	switch scope {
	case "plugin-upload":
		// A follower's core stores an upload on the primary before any row
		// names it; size and digest are checked while writing.
		return nil
	case "plugin-artifact":
		referenced, err := s.packageReferenced(ctx, digest)
		if err != nil {
			return peer.ErrUnavailable
		}
		if !referenced {
			return fmt.Errorf("%w: plugin package is not referenced by any version", peer.ErrForbidden)
		}
		return nil
	}
	if scope != "core-artifact" {
		return fmt.Errorf("%w: peer scope is not permitted", peer.ErrForbidden)
	}
	rows, err := s.DB.Query(ctx, `SELECT digest,manifest FROM updater.releases WHERE digest=$1 OR digest IN (SELECT release_digest FROM updater.upgrades WHERE cluster_id=$2 AND status IN ('running','paused'))`, baseline, s.Cluster)
	if err != nil {
		return peer.ErrUnavailable
	}
	defer rows.Close()
	for rows.Next() {
		var release string
		var raw []byte
		if err = rows.Scan(&release, &raw); err != nil {
			return peer.ErrUnavailable
		}
		if release == digest {
			return nil
		}
		var m rc.Manifest
		if err = json.Unmarshal(raw, &m); err != nil {
			return peer.ErrUnavailable
		}
		for _, p := range m.Platforms {
			if p.BundleDigest == digest {
				return nil
			}
		}
	}
	if err = rows.Err(); err != nil {
		return peer.ErrUnavailable
	}
	return fmt.Errorf("%w: artifact is not approved for this cluster", peer.ErrForbidden)
}

// AuthorizeTarget decides whether self may send its node key to u: only to
// the primary, or to a serving node while self offloads because of CPU load.
// Uses the cached node directory for routing decisions.
func (s *Store) AuthorizeTarget(ctx context.Context, self string, u *url.URL, offloading bool) error {
	primary, _, _, err := s.ClusterState(ctx)
	if err != nil {
		return peer.ErrUnavailable
	}
	nodes := s.NodeDirectory()
	if nodes == nil {
		var err error
		nodes, err = s.Nodes(ctx)
		if err != nil {
			return peer.ErrUnavailable
		}
	}
	for _, n := range nodes {
		target, err := url.Parse(n.PeerURL)
		if err == nil && n.Enabled && n.ID != self && target.Scheme == u.Scheme && target.Host == u.Host && (n.ID == primary || (offloading && n.Mode == "local")) {
			return nil
		}
	}
	return peer.ErrForbidden
}

// UnmanagedBlockers reads the existing core registry. A healthy old core that
// never registered a managed identity must not survive the migration barrier.
func (s *Store) UnmanagedBlockers(ctx context.Context) ([]string, error) {
	if s.Redis == nil {
		return nil, errors.New("core registry verification unavailable")
	}
	boots, err := s.Redis.ZRange(ctx, "node:live", 0, -1).Result()
	if err != nil {
		return nil, err
	}
	nodes := s.NodeDirectory()
	if nodes == nil {
		nodes, err = s.Nodes(ctx)
		if err != nil {
			return nil, err
		}
	}
	known := map[string]string{}
	for _, n := range nodes {
		if n.Enabled {
			known[n.ID] = n.CoreBootID
		}
	}
	out := []string{}
	for _, boot := range boots {
		info, err := s.Redis.HGetAll(ctx, "node:info:"+boot).Result()
		if err != nil {
			return nil, err
		}
		if len(info) == 0 {
			continue
		}
		if info["managed"] != "true" || info["core_boot_id"] == "" || known[info["node_id"]] != info["core_boot_id"] {
			out = append(out, "unmanaged or unrecognized active core: "+info["node_id"])
		}
	}
	return out, nil
}
func (s *Store) RecordStop(ctx context.Context, n Node) error {
	var id string
	var raw []byte
	err := s.DB.QueryRow(ctx, `SELECT id,nodes FROM updater.upgrades WHERE cluster_id=$1 AND status IN ('running','paused')`, s.Cluster).Scan(&id, &raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	var members []string
	if err = json.Unmarshal(raw, &members); err != nil {
		return err
	}
	member := false
	for _, v := range members {
		if v == n.ID {
			member = true
		}
	}
	var step *int
	if member {
		var x int
		err = s.DB.QueryRow(ctx, `SELECT step_id FROM updater.steps WHERE upgrade_id=$1 AND node_id=$2 AND action='stop' ORDER BY step_id DESC LIMIT 1`, id, n.ID).Scan(&x)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return err
		}
		step = &x
	}
	tag, err := s.DB.Exec(ctx, `INSERT INTO updater.stop_confirmations(cluster_id,node_id,shell_boot_id,upgrade_id,step_id,core_boot_id) SELECT $1,$2,$3,$4,$5,core_boot_id FROM updater.nodes WHERE cluster_id=$1 AND node_id=$2 AND shell_boot_id=$3 AND stopped ON CONFLICT(cluster_id,node_id,upgrade_id) DO UPDATE SET shell_boot_id=EXCLUDED.shell_boot_id,step_id=EXCLUDED.step_id,core_boot_id=EXCLUDED.core_boot_id,confirmed_at=now()`, s.Cluster, n.ID, n.ShellBootID, id, step)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return errors.New("stop confirmation identity changed")
	}
	return nil
}
func (s *Store) PluginMutationBlockers(ctx context.Context) ([]string, error) {
	checks := []struct{ table, query string }{
		{"plugin_rollouts", `SELECT EXISTS(SELECT 1 FROM plugin_rollouts WHERE phase IN ('preparing','activating'))`},
		{"plugin_uninstalls", `SELECT EXISTS(SELECT 1 FROM plugin_uninstalls)`},
		{"plugin_rollout_cleanup", `SELECT EXISTS(SELECT 1 FROM plugin_rollout_cleanup WHERE state='cleanup_pending')`},
		// Pre-0021 development cores kept the barrier in the outcome table.
		{"plugin_rollout_nodes", `SELECT EXISTS(SELECT 1 FROM plugin_rollout_nodes WHERE state='cleanup_pending')`},
	}
	for _, c := range checks {
		var present bool
		if err := s.DB.QueryRow(ctx, `SELECT to_regclass($1) IS NOT NULL`, "public."+c.table).Scan(&present); err != nil {
			return nil, err
		}
		if !present {
			continue
		}
		var busy bool
		if err := s.DB.QueryRow(ctx, c.query).Scan(&busy); err != nil {
			return nil, err
		}
		if busy {
			return []string{"plugin changes or runtime cleanup are still active"}, nil
		}
	}
	return nil, nil
}
func (s *Store) EnableNode(ctx context.Context, node string) error {
	return s.WithRegistration(ctx, node, func(ctx context.Context) error {
		return s.withChange(ctx, func(ctx context.Context) error {
			tag, err := s.DB.Exec(ctx, `UPDATE updater.nodes SET enabled=true,ready=false,stopped=false,mode='maintenance',joining_plan=COALESCE((SELECT id FROM updater.upgrades WHERE cluster_id=$1 AND status IN ('running','paused')),'') WHERE cluster_id=$1 AND node_id=$2`, s.Cluster, node)
			if err != nil {
				return err
			}
			if tag.RowsAffected() != 1 {
				return pgx.ErrNoRows
			}
			s.NotifyUpgrade(ctx)
			return nil
		})
	})
}

// ConfirmStoppedCore is called only by the local supervisor after proving that
// its recorded process group is gone. Redis expiry is never this proof.
func (s *Store) ConfirmStoppedCore(ctx context.Context, node, shellBoot, coreBoot string) error {
	if coreBoot == "" {
		return nil
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var current bool
	if err = tx.QueryRow(ctx, `SELECT shell_boot_id=$3 FROM updater.nodes WHERE cluster_id=$1 AND node_id=$2 FOR UPDATE`, s.Cluster, node, shellBoot).Scan(&current); err != nil {
		return err
	}
	if !current {
		return ErrConflict
	}
	for _, item := range []struct{ table, sql string }{
		{"plugin_runtime_nodes", `UPDATE plugin_runtime_nodes SET stopped=true,updated_at=now() WHERE boot_id=$1`},
		{"plugin_rollout_cleanup", `UPDATE plugin_rollout_cleanup SET state='cleaned',updated_at=now() WHERE boot_id=$1 AND state='cleanup_pending'`},
		{"plugin_rollout_nodes", `UPDATE plugin_rollout_nodes SET state='cleaned',updated_at=now() WHERE boot_id=$1 AND state='cleanup_pending'`},
	} {
		var present bool
		if err = tx.QueryRow(ctx, `SELECT to_regclass($1) IS NOT NULL`, "public."+item.table).Scan(&present); err != nil {
			return err
		}
		if present {
			if _, err = tx.Exec(ctx, item.sql, coreBoot); err != nil {
				return err
			}
		}
	}
	return tx.Commit(ctx)
}

func (s *Store) packageReferenced(ctx context.Context, sum string) (bool, error) {
	var present, referenced bool
	if err := s.DB.QueryRow(ctx, `SELECT to_regclass('public.plugin_versions') IS NOT NULL`).Scan(&present); err != nil || !present {
		return false, err
	}
	err := s.DB.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM plugin_versions WHERE package_sha256=$1)`, sum).Scan(&referenced)
	return referenced, err
}

// ReferencedPackages lists every plugin package digest a version names.
func (s *Store) ReferencedPackages(ctx context.Context) (map[string]bool, error) {
	out := map[string]bool{}
	var present bool
	if err := s.DB.QueryRow(ctx, `SELECT to_regclass('public.plugin_versions') IS NOT NULL`).Scan(&present); err != nil || !present {
		return out, err
	}
	rows, err := s.DB.Query(ctx, `SELECT DISTINCT lower(package_sha256) FROM plugin_versions`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var sum string
		if err = rows.Scan(&sum); err != nil {
			return nil, err
		}
		out[sum] = true
	}
	return out, rows.Err()
}

// PrimaryPeer reports whether self is the primary and the primary's peer URL.
func (s *Store) PrimaryPeer(ctx context.Context, self string) (bool, string, error) {
	primary, _, _, err := s.ClusterState(ctx)
	if err != nil {
		return false, "", err
	}
	if primary == self {
		return true, "", nil
	}
	nodes, err := s.Nodes(ctx)
	if err != nil {
		return false, "", err
	}
	for _, n := range nodes {
		if n.ID == primary && n.Enabled && n.PeerURL != "" {
			return false, strings.TrimRight(n.PeerURL, "/"), nil
		}
	}
	return false, "", errors.New("primary node is not registered")
}

// SetPrimary designates a new primary node. Must run under cluster-change lock
// with no active upgrade plan. Validates that the target node is enabled and
// has the current baseline artifacts.
func (s *Store) SetPrimary(ctx context.Context, node string) error {
	return s.withChange(ctx, func(ctx context.Context) error {
		tx, err := s.DB.Begin(ctx)
		if err != nil {
			return err
		}
		defer tx.Rollback(ctx)
		var active bool
		if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.upgrades WHERE cluster_id=$1 AND status IN ('running','paused'))`, s.Cluster).Scan(&active); err != nil {
			return err
		}
		if active {
			return errors.New("cannot change primary while an upgrade is active")
		}
		baseline, _, _, err := s.ClusterState(ctx)
		if err != nil {
			return err
		}
		var enabled bool
		var digest string
		if err = tx.QueryRow(ctx, `SELECT enabled,release_digest FROM updater.nodes WHERE cluster_id=$1 AND node_id=$2`, s.Cluster, node).Scan(&enabled, &digest); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fmt.Errorf("node %q is not registered", node)
			}
			return err
		}
		if !enabled {
			return fmt.Errorf("node %q is disabled", node)
		}
		if digest != baseline {
			return fmt.Errorf("node %q is not on baseline %s", node, baseline)
		}
		// Verify the node has baseline artifacts available
		var hasArtifacts bool
		if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.node_artifacts WHERE cluster_id=$1 AND node_id=$2 AND release_digest=$3)`, s.Cluster, node, baseline).Scan(&hasArtifacts); err != nil {
			return err
		}
		if !hasArtifacts {
			return fmt.Errorf("node %q lacks baseline artifacts", node)
		}
		// Check plugin packages presence
		rows, err := tx.Query(ctx, `SELECT DISTINCT lower(package_sha256) FROM plugin_versions WHERE is_enabled`)
		if err != nil {
			return err
		}
		defer rows.Close()
		required := []string{}
		for rows.Next() {
			var sum string
			if err = rows.Scan(&sum); err != nil {
				return err
			}
			required = append(required, sum)
		}
		rows.Close()
		for _, sum := range required {
			var hasPackage bool
			if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.node_plugin_packages WHERE cluster_id=$1 AND node_id=$2 AND digest=$3)`, s.Cluster, node, sum).Scan(&hasPackage); err != nil {
				return err
			}
			if !hasPackage {
				return fmt.Errorf("node %q lacks plugin package %s", node, sum)
			}
		}
		if _, err = tx.Exec(ctx, `UPDATE updater.clusters SET primary_node=$1 WHERE cluster_id=$2`, node, s.Cluster); err != nil {
			return err
		}
		if err = tx.Commit(ctx); err != nil {
			return err
		}
		fmt.Printf("primary node changed to %s\n", node)
		return nil
	})
}

// RemoveNode permanently removes a disabled node from the cluster. The node
// must be disabled, stopped, and explicitly isolated. Audit records are preserved.
func (s *Store) RemoveNode(ctx context.Context, node string) error {
	return s.withChange(ctx, func(ctx context.Context) error {
		tx, err := s.DB.Begin(ctx)
		if err != nil {
			return err
		}
		defer tx.Rollback(ctx)
		var enabled, stopped bool
		var lastSeen time.Time
		if err = tx.QueryRow(ctx, `SELECT enabled,stopped,last_seen FROM updater.nodes WHERE cluster_id=$1 AND node_id=$2`, s.Cluster, node).Scan(&enabled, &stopped, &lastSeen); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fmt.Errorf("node %q is not registered", node)
			}
			return err
		}
		if enabled {
			return fmt.Errorf("node %q is still enabled; disable it first", node)
		}
		if !stopped {
			return fmt.Errorf("node %q is not marked stopped; wait for confirmation or isolate it", node)
		}
		if time.Since(lastSeen) < 5*time.Minute {
			return fmt.Errorf("node %q was seen recently (%v ago); explicitly isolate it first", node, time.Since(lastSeen).Round(time.Second))
		}
		primary, _, _, err := s.ClusterState(ctx)
		if err != nil {
			return err
		}
		if node == primary {
			return fmt.Errorf("node %q is the primary; designate a new primary first", node)
		}
		// Delete node and related records; audit events are preserved
		if _, err = tx.Exec(ctx, `DELETE FROM updater.node_admissions WHERE cluster_id=$1 AND node_id=$2`, s.Cluster, node); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `DELETE FROM updater.node_artifacts WHERE cluster_id=$1 AND node_id=$2`, s.Cluster, node); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `DELETE FROM updater.node_plugin_packages WHERE cluster_id=$1 AND node_id=$2`, s.Cluster, node); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `DELETE FROM updater.nodes WHERE cluster_id=$1 AND node_id=$2`, s.Cluster, node); err != nil {
			return err
		}
		if err = tx.Commit(ctx); err != nil {
			return err
		}
		fmt.Printf("node %s removed from cluster\n", node)
		return nil
	})
}

// PlanStatus returns the current upgrade plan status including blocked reason.
func (s *Store) PlanStatus(ctx context.Context) (id, status, blockedReason string, err error) {
	err = s.DB.QueryRow(ctx, `SELECT id,status,blocked_reason FROM updater.upgrades WHERE cluster_id=$1 AND status IN ('running','paused') LIMIT 1`, s.Cluster).Scan(&id, &status, &blockedReason)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", "", nil
	}
	return
}
