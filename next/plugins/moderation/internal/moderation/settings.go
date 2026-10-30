package moderation

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/textutil"
)

// Modes (settings.mode, CONTRACTS §72.5).
const (
	ModeOff     = "off"
	ModeObserve = "observe" // pre only for enforce-level users, post for the rest
	ModeEnforce = "enforce" // everyone pre
)

// Verdicts and actions of the 0.1 columns events.verdict / events.action, and
// the LLM verdicts of submit_verdict.
const (
	VerdictPass  = "pass"
	VerdictFlag  = "flag"
	VerdictBlock = "block"
	VerdictError = "error"

	ActionAllow = "allow"
	ActionDeny  = "deny"
)

// Record results (events.result).
const (
	ResultBlock      = "block"
	ResultHit        = "hit"
	ResultOverturned = "overturned"
	ResultError      = "error"
	ResultPass       = "pass"
)

// Category is one moderation category offered to the LLM.
type Category struct {
	ID          string `json:"id"`
	Description string `json:"description"`
}

// Settings is the plugin configuration (forms/settings.schema.json, CONTRACTS
// §72.10). The legacy block (BaseURL … ModelPatterns) is the 0.1 single-model
// setup, only read by the one-time conversion (§72.12).
type Settings struct {
	Mode          string   `json:"mode"`
	ExemptUserIDs []string `json:"exempt_user_ids"`

	InputMaxChars   int `json:"input_max_chars"`
	MinChars        int `json:"min_chars"`
	CacheTTLSeconds int `json:"cache_ttl_seconds"`
	CacheEntries    int `json:"cache_entries"`
	MaxConcurrency  int `json:"max_concurrency"`
	QueueSize       int `json:"queue_size"`

	BlockStatus  int    `json:"block_status"`
	BlockMessage string `json:"block_message"`

	RecordPass       bool `json:"record_pass"`
	RecordOverturned bool `json:"record_overturned"`
	RecordErrors     bool `json:"record_errors"`
	StoreText        bool `json:"store_text"`

	HitRetentionDays        int `json:"hit_retention_days"`
	OverturnedRetentionDays int `json:"overturned_retention_days"`
	ErrorRetentionDays      int `json:"error_retention_days"`
	PassRetentionDays       int `json:"pass_retention_days"`

	AutoWatch               bool `json:"auto_watch"`
	WatchDays               int  `json:"watch_days"`
	AnalysisEveryViolations int  `json:"analysis_every_violations"`

	BanThreshold     int `json:"ban_threshold"`
	BanWindowHours   int `json:"ban_window_hours"`
	BanDurationHours int `json:"ban_duration_hours"`

	JevDefaultSet *JevQuestions `json:"jev_default_set"`

	// Legacy 0.1 single-model setup.
	BaseURL       string     `json:"base_url"`
	APIKey        string     `json:"api_key"`
	Model         string     `json:"model"`
	SystemPrompt  string     `json:"system_prompt"`
	Categories    []Category `json:"categories"`
	ToolChoice    string     `json:"tool_choice"`
	MaxTurns      int        `json:"max_turns"`
	Temperature   float64    `json:"temperature"`
	MaxTokens     int        `json:"max_tokens"`
	TimeoutMs     int        `json:"timeout_ms"`
	OnError       string     `json:"on_error"`
	SampleRate    int        `json:"sample_rate"`
	GroupIDs      []int64    `json:"group_ids"`
	ModelPatterns []string   `json:"model_patterns"`
	RetentionDays int        `json:"retention_days"`
}

// DefaultBlockMessage is the default deny message of a hit.
const DefaultBlockMessage = "提示词审核未通过，请调整输入后重试"

// DefaultSettings returns the schema defaults.
func DefaultSettings() Settings {
	return Settings{
		Mode:          ModeOff,
		InputMaxChars: 12000, MinChars: 2,
		CacheTTLSeconds: 3600, CacheEntries: 100000,
		MaxConcurrency: 16, QueueSize: 1000,
		BlockStatus: 403, BlockMessage: DefaultBlockMessage,
		RecordOverturned: true, RecordErrors: true, StoreText: true,
		HitRetentionDays: 180, OverturnedRetentionDays: 30, ErrorRetentionDays: 7, PassRetentionDays: 3,
		AutoWatch: true, WatchDays: 30, AnalysisEveryViolations: 30,
		BanWindowHours: 24, BanDurationHours: 24,
		ToolChoice: "required", MaxTurns: 3, MaxTokens: 512, TimeoutMs: 10000, OnError: "allow",
		SampleRate: 100, RetentionDays: 30,
	}
}

var (
	categoryIDRe = regexp.MustCompile(`^[a-z0-9_]{1,32}$`)
	baseURLRe    = regexp.MustCompile(`^https?://\S+$`)
)

// DecodeSettings is lenient: unknown keys and values of the wrong type are
// ignored, numbers are clamped into range. Only a non-object is an error.
func DecodeSettings(raw []byte) (Settings, error) {
	s := DefaultSettings()
	raw = []byte(strings.TrimSpace(string(raw)))
	if len(raw) == 0 || string(raw) == "null" {
		return s, nil
	}
	var m map[string]json.RawMessage
	if err := json.Unmarshal(raw, &m); err != nil {
		return s, err
	}
	d := decoder{m: m}
	d.general(&s)
	d.storage(&s)
	d.watch(&s)
	d.legacy(&s)
	return s, nil
}

// decoder reads one raw settings document into a Settings.
type decoder struct {
	m map[string]json.RawMessage
}

func (d decoder) str(k string, dst *string) {
	if v, ok := d.m[k]; ok {
		var x string
		if json.Unmarshal(v, &x) == nil {
			*dst = x
		}
	}
}

func (d decoder) num(k string, dst *float64) bool {
	if v, ok := d.m[k]; ok {
		var x float64
		if json.Unmarshal(v, &x) == nil && !math.IsNaN(x) && !math.IsInf(x, 0) {
			*dst = x
			return true
		}
	}
	return false
}

func (d decoder) integer(k string, dst *int, lo, hi int) {
	var f float64
	if d.num(k, &f) {
		*dst = clampInt(int(math.Round(math.Max(math.Min(f, 1e12), -1e12))), lo, hi)
	} else {
		*dst = clampInt(*dst, lo, hi)
	}
}

func (d decoder) boolean(k string, dst *bool) {
	if v, ok := d.m[k]; ok {
		var x bool
		if json.Unmarshal(v, &x) == nil {
			*dst = x
		}
	}
}

func (d decoder) strList(k string) []string {
	var out []string
	if v, ok := d.m[k]; ok {
		var xs []any
		if json.Unmarshal(v, &xs) == nil {
			for _, x := range xs {
				switch t := x.(type) {
				case string:
					out = append(out, t)
				case float64:
					out = append(out, strconv.FormatFloat(t, 'f', -1, 64))
				}
			}
		}
	}
	return out
}

func (d decoder) enum(k string, dst *string, allowed ...string) {
	var x string
	d.str(k, &x)
	x = strings.ToLower(strings.TrimSpace(x))
	for _, a := range allowed {
		if x == a {
			*dst = x
			return
		}
	}
}

func (d decoder) general(s *Settings) {
	d.enum("mode", &s.Mode, ModeOff, ModeObserve, ModeEnforce)
	for _, u := range d.strList("exempt_user_ids") {
		if u = strings.TrimSpace(u); u != "" {
			if _, err := strconv.ParseInt(u, 10, 64); err == nil {
				s.ExemptUserIDs = append(s.ExemptUserIDs, u)
			}
		}
	}
	d.integer("input_max_chars", &s.InputMaxChars, 256, 100000)
	d.integer("min_chars", &s.MinChars, 0, 1000)
	d.integer("cache_ttl_seconds", &s.CacheTTLSeconds, 0, 604800)
	d.integer("cache_entries", &s.CacheEntries, 1000, 1000000)
	d.integer("max_concurrency", &s.MaxConcurrency, 1, 256)
	d.integer("queue_size", &s.QueueSize, 1, 100000)
	d.integer("block_status", &s.BlockStatus, 400, 599)
	d.str("block_message", &s.BlockMessage)
	s.BlockMessage = textutil.TruncateRunes(strings.TrimSpace(s.BlockMessage), 500)
	if s.BlockMessage == "" {
		s.BlockMessage = DefaultBlockMessage
	}
	if v, ok := d.m["jev_default_set"]; ok {
		var q JevQuestions
		if json.Unmarshal(v, &q) == nil && q.Validate() == nil {
			s.JevDefaultSet = &q
		}
	}
}

func (d decoder) storage(s *Settings) {
	d.boolean("record_pass", &s.RecordPass)
	d.boolean("record_overturned", &s.RecordOverturned)
	d.boolean("record_errors", &s.RecordErrors)
	d.boolean("store_text", &s.StoreText)
	// 0.1 kept every record retention_days; the hit retention never drops
	// below it (§72.10).
	d.integer("retention_days", &s.RetentionDays, 1, 3650)
	if _, ok := d.m["hit_retention_days"]; !ok && s.RetentionDays > s.HitRetentionDays {
		s.HitRetentionDays = s.RetentionDays
	}
	d.integer("hit_retention_days", &s.HitRetentionDays, 1, 3650)
	d.integer("overturned_retention_days", &s.OverturnedRetentionDays, 1, 3650)
	d.integer("error_retention_days", &s.ErrorRetentionDays, 1, 3650)
	d.integer("pass_retention_days", &s.PassRetentionDays, 1, 3)
}

func (d decoder) watch(s *Settings) {
	d.boolean("auto_watch", &s.AutoWatch)
	d.integer("watch_days", &s.WatchDays, 1, 365)
	d.integer("analysis_every_violations", &s.AnalysisEveryViolations, 0, 1000)
	d.integer("ban_threshold", &s.BanThreshold, 0, 1000)
	d.integer("ban_window_hours", &s.BanWindowHours, 1, 8760)
	d.integer("ban_duration_hours", &s.BanDurationHours, 0, 87600)
}

// legacy reads the 0.1 single-model setup (converted once, §72.12).
func (d decoder) legacy(s *Settings) {
	d.str("base_url", &s.BaseURL)
	s.BaseURL = strings.TrimSpace(s.BaseURL)
	if s.BaseURL != "" && !baseURLRe.MatchString(s.BaseURL) {
		s.BaseURL = ""
	}
	d.str("api_key", &s.APIKey)
	s.APIKey = strings.TrimSpace(s.APIKey)
	d.str("model", &s.Model)
	s.Model = textutil.TruncateRunes(strings.TrimSpace(s.Model), 200)
	d.str("system_prompt", &s.SystemPrompt)
	s.SystemPrompt = textutil.TruncateRunes(s.SystemPrompt, 20000)
	if v, ok := d.m["categories"]; ok {
		var cats []struct {
			ID          any `json:"id"`
			Description any `json:"description"`
		}
		if json.Unmarshal(v, &cats) == nil {
			seen := map[string]bool{}
			for _, c := range cats {
				id, _ := c.ID.(string)
				desc, _ := c.Description.(string)
				id = strings.TrimSpace(id)
				if !categoryIDRe.MatchString(id) || seen[id] {
					continue
				}
				seen[id] = true
				s.Categories = append(s.Categories, Category{ID: id, Description: textutil.TruncateRunes(strings.TrimSpace(desc), 500)})
				if len(s.Categories) == 50 {
					break
				}
			}
		}
	}
	d.enum("tool_choice", &s.ToolChoice, "required", "function", "auto")
	d.integer("max_turns", &s.MaxTurns, 1, 5)
	if d.num("temperature", &s.Temperature) {
		s.Temperature = math.Max(0, math.Min(2, s.Temperature))
	}
	d.integer("max_tokens", &s.MaxTokens, 64, 4096)
	d.integer("timeout_ms", &s.TimeoutMs, 1000, 25000)
	d.enum("on_error", &s.OnError, "allow", "block")
	d.integer("sample_rate", &s.SampleRate, 1, 100)
	for _, g := range d.strList("group_ids") {
		if id, err := strconv.ParseInt(strings.TrimSpace(g), 10, 64); err == nil && id > 0 {
			s.GroupIDs = append(s.GroupIDs, id)
		}
	}
	for _, p := range d.strList("model_patterns") {
		if p = strings.TrimSpace(p); p != "" {
			s.ModelPatterns = append(s.ModelPatterns, p)
		}
	}
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// config is the compiled, immutable runtime view of Settings.
type config struct {
	Settings

	enabled      bool // mode != off
	settingsHash string
	exempt       map[int64]bool
	cacheTTL     time.Duration
	banWindow    time.Duration
	banDuration  time.Duration // 0 = until unblocked
	watchFor     time.Duration
	retention    map[string]time.Duration // by result
	legacyReady  bool                     // the 0.1 setup is complete enough to convert
	jevDefault   JevQuestions
}

// compile derives the runtime config from settings.
func compile(s Settings) *config {
	c := &config{Settings: s}
	c.enabled = s.Mode != ModeOff
	c.exempt = map[int64]bool{}
	for _, u := range s.ExemptUserIDs {
		if id, err := strconv.ParseInt(u, 10, 64); err == nil {
			c.exempt[id] = true
		}
	}
	c.cacheTTL = time.Duration(s.CacheTTLSeconds) * time.Second
	c.banWindow = time.Duration(s.BanWindowHours) * time.Hour
	c.banDuration = time.Duration(s.BanDurationHours) * time.Hour
	c.watchFor = time.Duration(s.WatchDays) * 24 * time.Hour
	day := 24 * time.Hour
	c.retention = map[string]time.Duration{
		ResultBlock: time.Duration(s.HitRetentionDays) * day, ResultHit: time.Duration(s.HitRetentionDays) * day,
		ResultOverturned: time.Duration(s.OverturnedRetentionDays) * day,
		ResultError:      time.Duration(s.ErrorRetentionDays) * day, ResultPass: time.Duration(s.PassRetentionDays) * day,
	}
	c.legacyReady = s.BaseURL != "" && s.Model != ""
	c.jevDefault, _ = DefaultQuestions(s.JevDefaultSet)
	return c
}

// settingsDigest is a short sha256 of the raw settings JSON (tells nodes
// apart while a change propagates).
func settingsDigest(raw []byte) string {
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:6])
}

// globMatch matches s against pattern with * (any run) and ? (one rune).
func globMatch(pattern, s string) bool {
	px, sx := 0, 0
	nextPx, nextSx := -1, -1
	for px < len(pattern) || sx < len(s) {
		if px < len(pattern) {
			switch c := pattern[px]; c {
			case '*':
				nextPx, nextSx = px, sx+1
				px++
				continue
			case '?':
				if sx < len(s) {
					_, n := utf8.DecodeRuneInString(s[sx:])
					px++
					sx += n
					continue
				}
			default:
				if sx < len(s) && s[sx] == c {
					px++
					sx++
					continue
				}
			}
		}
		if nextSx > 0 && nextSx <= len(s) {
			px, sx = nextPx, nextSx
			continue
		}
		return false
	}
	return true
}
