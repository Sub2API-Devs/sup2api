package moderation

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"net/http"
	"slices"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
)

// Broadcast topics: the other nodes reload at once (best effort; every
// node also polls config_state). verdict.changed carries the cache keys a
// review changed ({"keys": [...]}): the other nodes drop them from memory.
const (
	TopicBlocksChanged  = "blocks.changed"
	TopicConfigChanged  = "config.changed"
	TopicWatchChanged   = "watch.changed"
	TopicVerdictChanged = "verdict.changed"
)

// Watch levels (watchlist.level).
const (
	LevelObserve = "observe"
	LevelEnforce = "enforce"
)

// liveFlow is a published, enabled flow.
type liveFlow struct {
	ID      int64
	Name    string
	Version int
	Spec    *Spec
	timeout time.Duration
	// fp is the verdict fingerprint (fingerprint): part of the flow's cache
	// keys.
	fp string
}

// snapshot is the immutable configuration the hook reads.
type snapshot struct {
	version int64
	// cacheEpoch counts the clears of the verdict cache; part of every cache
	// key.
	cacheEpoch int64
	channels   map[int64]*liveChannel
	auditors   map[int64]*liveAuditor
	flows      map[int64]*liveFlow
	// byGroup maps the bound groups to their flow; nil = exempt (flow 0, the
	// group is not moderated). A binding to a flow that is disabled,
	// unpublished or gone is left out, so a wider binding applies. 0 =
	// default.
	byGroup map[int64]*liveFlow
	groups  map[int64][]int64 // flow id -> bound groups
	// byAccount maps the account bindings (group 0 = the account in any
	// group) to their flow; nil and left out as in byGroup (§72.17).
	byAccount map[accountKey]*liveFlow
	// accountGroups are the groups with a binding of one of their accounts;
	// anyGroupAccounts: some binding covers an account in every group. Both
	// count only the bindings in byAccount.
	accountGroups    map[int64]bool
	anyGroupAccounts bool
	markers          [][]byte // self-request keys of the llm channels
}

// accountKey is an account binding: the account within a group, or in any
// group (group 0).
type accountKey struct{ group, account int64 }

func emptySnapshot() *snapshot {
	return &snapshot{version: -1, channels: map[int64]*liveChannel{}, auditors: map[int64]*liveAuditor{},
		flows: map[int64]*liveFlow{}, byGroup: map[int64]*liveFlow{}, groups: map[int64][]int64{},
		byAccount: map[accountKey]*liveFlow{}, accountGroups: map[int64]bool{}}
}

// flowFor returns the flow of a group; a group without a binding of its own
// (or bound to a flow that is disabled or unpublished) falls back to the
// default flow (group 0). nil = not moderated.
func (s *snapshot) flowFor(group int64) *liveFlow {
	if f, ok := s.byGroup[group]; ok {
		return f
	}
	return s.byGroup[0]
}

// flowForAccount returns the flow of a request of group sent to account
// (CONTRACTS §72.17): the most specific binding decides - the account
// within the group, the account in any group, the group, the default group.
// A binding to flow 0 is not moderated and the less specific ones do not
// apply; a binding to a disabled or unpublished flow counts as absent, so
// the next less specific one decides (new-api runtime.go).
func (s *snapshot) flowForAccount(group, account int64) *liveFlow {
	for _, k := range [2]accountKey{{group, account}, {0, account}} {
		if f, ok := s.byAccount[k]; ok {
			return f
		}
	}
	return s.flowFor(group)
}

// perAccount reports whether the flow of a request of group depends on the
// account it is sent to; when it does not, flowFor(group) is the flow of
// every attempt.
func (s *snapshot) perAccount(group int64) bool {
	return s.anyGroupAccounts || s.accountGroups[group]
}

// groupsOf lists the groups bound to a flow.
func (s *snapshot) groupsOf(flowID int64) []int64 { return s.groups[flowID] }

// bindGroup records a group binding. Flow 0 exempts the group; a flow that
// is disabled, unpublished or gone leaves the group without a binding, so
// the default flow applies (the console still lists the group, groupsOf).
func (s *snapshot) bindGroup(group, flowID int64) {
	switch f := s.flows[flowID]; {
	case flowID == 0:
		s.byGroup[group] = nil
	case f != nil:
		s.byGroup[group] = f
	}
	if flowID != 0 {
		s.groups[flowID] = append(s.groups[flowID], group)
	}
}

// bindAccount records an account binding. Flow 0 exempts the account; a
// flow that is disabled, unpublished or gone is left out: a wider binding
// applies, and the binding does not make its group per account.
func (s *snapshot) bindAccount(k accountKey, flowID int64) {
	f := s.flows[flowID]
	if flowID != 0 && f == nil {
		return
	}
	s.byAccount[k] = f
	if k.group == 0 {
		s.anyGroupAccounts = true
	} else {
		s.accountGroups[k.group] = true
	}
}

// categoryLabels maps the categories of the live auditors to their labels
// (custom Jev codes carry one; the lowest auditor id wins).
func (s *snapshot) categoryLabels() map[string]string {
	out := map[string]string{}
	for _, id := range slices.Sorted(maps.Keys(s.auditors)) {
		for c, l := range s.auditors[id].labels {
			if _, ok := out[c]; !ok && l != "" {
				out[c] = l
			}
		}
	}
	return out
}

// sendsImages reports whether any auditor of the flow sends images; when
// none does, the request images are not kept while the request waits.
func (s *snapshot) sendsImages(f *liveFlow) bool {
	for _, st := range f.Spec.Stages {
		for _, id := range st.Auditors {
			if a := s.auditors[id]; a != nil && a.images {
				return true
			}
		}
	}
	return false
}

// mixedImages reports whether the flow has both an auditor that takes images
// and one that does not (the OpenAI auditor always takes them, the others by
// their image switch). There an auditor that never gets an image can pass
// what an auditor that got it hit, on every request, which is why there an
// image that is not cached keeps the cached text of its request in the plan
// (makePlan).
func (s *snapshot) mixedImages(f *liveFlow) bool {
	var with, without bool
	for _, st := range f.Spec.Stages {
		for _, id := range st.Auditors {
			if a := s.auditors[id]; a != nil {
				with, without = with || a.images, without || !a.images
			}
		}
	}
	return with && without
}

// bound reports whether any group or account runs a flow.
func (s *snapshot) bound() bool {
	for _, f := range s.byGroup {
		if f != nil {
			return true
		}
	}
	for _, f := range s.byAccount {
		if f != nil {
			return true
		}
	}
	return false
}

// isSelf reports whether text carries a marker of one of our llm channels.
func (s *snapshot) isSelf(text string) bool {
	for _, k := range s.markers {
		if isSelfRequest(k, text) {
			return true
		}
	}
	return false
}

// watchEntry is the in-memory watch state of one user.
type watchEntry struct {
	Level   string
	Expires time.Time // zero = no expiry
}

func secretContext(id int64, what string) string {
	return "channel:" + strconv.FormatInt(id, 10) + ":" + what
}

// loadSnapshot reads the whole configuration. Channels whose key does not
// open are left out (their auditors error with no_channel).
func (p *Plugin) loadSnapshot(ctx context.Context) (*snapshot, error) {
	db, err := p.db(ctx)
	if err != nil {
		return nil, err
	}
	s := emptySnapshot()
	if err := db.QueryRow(ctx, `SELECT config_version, cache_epoch FROM config_state WHERE id = 1`).Scan(&s.version, &s.cacheEpoch); err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `SELECT id, type, protocol, name, base_url, api_key_enc, proxy_enc, model, billing_model, timeout_ms FROM channels
		WHERE deleted_at IS NULL AND enabled`)
	if err != nil {
		return nil, err
	}
	type chRow struct {
		id                         int64
		typ, protocol, base, model string
		name, billing              string
		keyEnc, proxyEnc           []byte
		timeout                    int
	}
	var chRows []chRow
	var r chRow
	if _, err := pgx.ForEachRow(rows, []any{&r.id, &r.typ, &r.protocol, &r.name, &r.base, &r.keyEnc, &r.proxyEnc, &r.model, &r.billing, &r.timeout}, func() error {
		chRows = append(chRows, r)
		return nil
	}); err != nil {
		return nil, err
	}
	proxies := map[string]bool{}
	for _, r := range chRows {
		ch := &liveChannel{ID: r.id, Name: r.name, Type: r.typ, Protocol: r.protocol, BaseURL: r.base, Model: r.model, BillingModel: r.billing,
			Timeout: time.Duration(r.timeout) * time.Millisecond, client: p.httpClient, ttft: p.ttftTimeout}
		if len(r.keyEnc) > 0 {
			key, err := p.host.OpenSecret(ctx, secretContext(r.id, "key"), r.keyEnc)
			if err != nil {
				p.log.Warn("moderation: channel key does not open", "channel_id", r.id, "error", err.Error())
				continue
			}
			ch.Key = string(key)
		}
		client, proxy, err := p.channelClient(ctx, r.id, r.proxyEnc)
		if err != nil {
			p.log.Warn("moderation: channel proxy is not usable", "channel_id", r.id, "error", err.Error())
			continue
		}
		ch.client, proxies[proxy] = client, true
		if ch.Timeout <= 0 {
			ch.Timeout = time.Duration(defaultChannelTimeoutMs[ch.Type]) * time.Millisecond
		}
		if ch.Type == ChannelLLM && ch.Key != "" {
			ch.markerKey = markerKey(ch.Key)
			s.markers = append(s.markers, ch.markerKey)
		}
		s.channels[ch.ID] = ch
	}
	c := p.cfg.Load()
	rows, err = db.Query(ctx, `SELECT id, name, type, channel_id, config FROM auditors WHERE deleted_at IS NULL`)
	if err != nil {
		return nil, err
	}
	var (
		aid, chID int64
		name, typ string
		cfgJSON   []byte
	)
	stored := map[int64]storedAuditor{}
	if _, err := pgx.ForEachRow(rows, []any{&aid, &name, &typ, &chID, &cfgJSON}, func() error {
		row := storedAuditor{typ: typ, channel: chID, config: slices.Clone(cfgJSON)}
		defer func() { stored[aid] = row }()
		var cfg AuditorConfig
		if err := json.Unmarshal(cfgJSON, &cfg); err != nil {
			p.log.Warn("moderation: auditor config is invalid", "auditor_id", aid, "error", err.Error())
			return nil
		}
		a, err := compileAuditor(aid, name, typ, chID, cfg, s.channels[chID], &c.jevDefault)
		if err != nil {
			p.log.Warn("moderation: auditor config is invalid", "auditor_id", aid, "error", err.Error())
			return nil
		}
		row.defaultSet = (typ == AuditorTypeSafe || typ == AuditorLLMQuestions) && cfg.Questions == nil
		s.auditors[aid] = a
		return nil
	}); err != nil {
		return nil, err
	}
	rows, err = db.Query(ctx, `SELECT id, name, version, published FROM flows
		WHERE deleted_at IS NULL AND enabled AND published IS NOT NULL`)
	if err != nil {
		return nil, err
	}
	var (
		fid     int64
		fname   string
		version int
		pub     []byte
	)
	if _, err := pgx.ForEachRow(rows, []any{&fid, &fname, &version, &pub}, func() error {
		spec, err := ParseSpec(pub)
		if err != nil {
			p.log.Warn("moderation: published flow is invalid", "flow_id", fid, "error", err.Error())
			return nil
		}
		f := &liveFlow{ID: fid, Name: fname, Version: version, Spec: spec}
		f.timeout = time.Duration(spec.TotalTimeoutMs) * time.Millisecond
		if f.timeout <= 0 {
			f.timeout = maxTotalTimeoutMs * time.Millisecond
		}
		s.flows[fid] = f
		return nil
	}); err != nil {
		return nil, err
	}
	defaultSet, _ := json.Marshal(c.jevDefault)
	for _, f := range s.flows {
		f.fp = fingerprint(f.Spec, stored, s.channels, defaultSet)
	}
	rows, err = db.Query(ctx, `SELECT group_id, flow_id FROM flow_groups ORDER BY group_id`)
	if err != nil {
		return nil, err
	}
	var gid int64
	if _, err := pgx.ForEachRow(rows, []any{&gid, &fid}, func() error {
		s.bindGroup(gid, fid)
		return nil
	}); err != nil {
		return nil, err
	}
	rows, err = db.Query(ctx, `SELECT group_id, account_id, flow_id FROM flow_accounts`)
	if err != nil {
		return nil, err
	}
	var acct int64
	if _, err := pgx.ForEachRow(rows, []any{&gid, &acct, &fid}, func() error {
		s.bindAccount(accountKey{gid, acct}, fid)
		return nil
	}); err != nil {
		return nil, err
	}
	p.proxies.retain(proxies)
	return s, nil
}

// storedAuditor is an auditor row as the fingerprint reads it. defaultSet:
// the auditor asks the default question set.
type storedAuditor struct {
	typ        string
	channel    int64
	config     []byte // the jsonb text, the same on every node
	defaultSet bool
}

// judgingVersion stands in the fingerprint for what decides a verdict but
// lives in the code instead of the stored configuration. Bump it whenever a
// release changes such a default, so the verdicts cached under the old one
// are not served under the new one:
//
//   - the OpenAI thresholds of the categories an auditor does not set
//     (DefaultThresholds) and the category list (OpenAICategories);
//   - the default categories of an llm_verdict auditor (DefaultCategories),
//     its prompt template and verdict tool (expandPrompt, verdictTool);
//   - the prompt template of llm_questions and how its answers are read;
//   - what an auditor without review_images does with images
//     (AuditorConfig.reviewsImages), and which images an auditor sends;
//   - the built-in Jev question set (the default set when the settings
//     carry none) and how questions are sent and scored;
//   - how content is cut into segments and rendered for the auditors, when
//     the same segment hash would then stand for other text.
//
// 2: the LLM auditors send images unless review_images is false, and their
// default prompts say that the images are judged.
const judgingVersion = 2

// fingerprint is the verdict fingerprint of a flow (16 hex characters): a
// hash of everything that decides what the flow answers for given content -
// the stages (combine, n, fallback, auditors), every auditor (type, channel,
// stored config), the channel's type, protocol, base URL and model, the
// default question set of the auditors that use it, and judgingVersion for
// the defaults in the code. It is part of the flow's cache keys, so changing
// any of these makes the cached verdicts of the flow unreachable, while the
// flow's name, model filter, sample rate and timeout and a channel's name,
// key, proxy, timeout and billing model leave them in place.
func fingerprint(spec *Spec, auditors map[int64]storedAuditor, channels map[int64]*liveChannel, defaultSet []byte) string {
	return fingerprintAt(judgingVersion, spec, auditors, channels, defaultSet)
}

// fingerprintAt is fingerprint under a judging version.
func fingerprintAt(version int, spec *Spec, auditors map[int64]storedAuditor, channels map[int64]*liveChannel, defaultSet []byte) string {
	h := sha256.New()
	fmt.Fprintf(h, "judging %d\n", version)
	for _, st := range spec.Stages {
		fmt.Fprintf(h, "stage %q %d %t %v\n", st.Combine, st.N, st.Fallback, st.Auditors)
		for _, id := range st.Auditors {
			a, ok := auditors[id]
			if !ok {
				fmt.Fprintf(h, "auditor %d missing\n", id)
				continue
			}
			fmt.Fprintf(h, "auditor %d %q %d %d:%s\n", id, a.typ, a.channel, len(a.config), a.config)
			if ch := channels[a.channel]; ch != nil {
				fmt.Fprintf(h, "channel %q %q %q %q\n", ch.Type, ch.Protocol, ch.BaseURL, ch.Model)
			} else {
				fmt.Fprint(h, "channel -\n")
			}
			if a.defaultSet {
				fmt.Fprintf(h, "default %d:%s\n", len(defaultSet), defaultSet)
			}
		}
	}
	return hex.EncodeToString(h.Sum(nil)[:8])
}

// reloadConfig replaces the snapshot (one reload at a time, never an older
// version over a newer one).
func (p *Plugin) reloadConfig(ctx context.Context) error {
	p.snapMu.Lock()
	defer p.snapMu.Unlock()
	s, err := p.loadSnapshot(ctx)
	if err != nil {
		return err
	}
	p.snap.Store(s)
	return nil
}

// reloadWatch reads the active watch list into memory.
func (p *Plugin) reloadWatch(ctx context.Context) error {
	p.watchMu.Lock()
	defer p.watchMu.Unlock()
	db, err := p.db(ctx)
	if err != nil {
		return err
	}
	var version int64
	if err := db.QueryRow(ctx, `SELECT watch_version FROM config_state WHERE id = 1`).Scan(&version); err != nil {
		return err
	}
	rows, err := db.Query(ctx, `SELECT user_id, level, expires_at FROM watchlist WHERE expires_at IS NULL OR expires_at > $1`, p.now().UTC())
	if err != nil {
		return err
	}
	m := map[int64]watchEntry{}
	var (
		uid   int64
		level string
		exp   *time.Time
	)
	if _, err := pgx.ForEachRow(rows, []any{&uid, &level, &exp}, func() error {
		e := watchEntry{Level: level}
		if exp != nil {
			e.Expires = *exp
		}
		m[uid] = e
		return nil
	}); err != nil {
		return err
	}
	p.watch.Store(&m)
	p.watchVersion.Store(version)
	return nil
}

// watchLevel returns the user's active watch level ("" = not watched).
func (p *Plugin) watchLevel(uid int64) string {
	e, ok := (*p.watch.Load())[uid]
	if !ok || (!e.Expires.IsZero() && !p.now().Before(e.Expires)) {
		return ""
	}
	return e.Level
}

// pollVersions reloads what changed since the last load (config_state).
func (p *Plugin) pollVersions(ctx context.Context) error {
	db, err := p.db(ctx)
	if err != nil {
		return err
	}
	var cv, wv int64
	if err := db.QueryRow(ctx, `SELECT config_version, watch_version FROM config_state WHERE id = 1`).Scan(&cv, &wv); err != nil {
		return err
	}
	var errs []error
	if cv != p.snap.Load().version {
		errs = append(errs, p.reloadConfig(ctx))
	}
	if wv != p.watchVersion.Load() {
		errs = append(errs, p.reloadWatch(ctx))
	}
	return errors.Join(errs...)
}

// bumpConfig increments config_version inside tx (every configuration write).
func bumpConfig(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, `UPDATE config_state SET config_version = config_version + 1 WHERE id = 1`)
	return err
}

// bumpWatch increments watch_version inside tx (every watch list write).
func bumpWatch(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, `UPDATE config_state SET watch_version = watch_version + 1 WHERE id = 1`)
	return err
}

// configChanged reloads this node and tells the others.
func (p *Plugin) configChanged(ctx context.Context) {
	p.changed(ctx, TopicConfigChanged, p.reloadConfig)
}

// watchChanged reloads this node's watch list and tells the others.
func (p *Plugin) watchChanged(ctx context.Context) {
	p.changed(ctx, TopicWatchChanged, p.reloadWatch)
}

func (p *Plugin) changed(ctx context.Context, topic string, reload func(context.Context) error) {
	rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	if err := reload(rctx); err != nil {
		p.log.Warn("moderation: reload failed", "topic", topic, "error", err.Error())
	}
	if p.host == nil {
		return
	}
	if err := p.host.Publish(rctx, topic, nil); err != nil {
		p.log.Warn("moderation: broadcast failed; other nodes reload within the polling period", "topic", topic, "error", err.Error())
	}
}

// newHTTPClient is the client of every upstream call: http.DefaultTransport,
// which the SDK routes through the egress tunnel in strict network mode.
func newHTTPClient() *http.Client { return &http.Client{} }

var errNotFound = fmt.Errorf("not found")
