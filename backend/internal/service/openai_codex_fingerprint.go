package service

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"maps"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

// codexFingerprintIDsContextKey 是暂存在 gin context 的收敛 ID 集合键。
// 由 Forward（非透传）或 forwardOpenAIPassthrough（透传）解析后写入，请求
// 构造器读取用于出站头改写——请求体与出站头必须共享同一份 IDs，保证
// turn_id 等随机字段一致。
const codexFingerprintIDsContextKey = "codex_fingerprint_ids"

// stageCodexFingerprintIDs 将本 attempt 解析出的收敛 ID 暂存到 gin context。
// 必须无条件覆写（含 nil）：failover 从收敛账号切到 off 账号时，上一账号的
// IDs 不得残留并被误应用到新账号的出站头（typed-nil 由应用侧 nil 守卫吸收）。
func stageCodexFingerprintIDs(c *gin.Context, ids *codexFingerprintIDs) {
	if c != nil {
		c.Set(codexFingerprintIDsContextKey, ids)
	}
}

func stagedCodexFingerprintIDs(c *gin.Context, account *Account) *codexFingerprintIDs {
	if c == nil || account == nil || !account.UsesOpenAICodexProtocol() {
		return nil
	}
	value, ok := c.Get(codexFingerprintIDsContextKey)
	if !ok {
		return nil
	}
	ids, ok := value.(*codexFingerprintIDs)
	if !ok || ids == nil || ids.accountID != account.ID {
		return nil
	}
	return ids
}

// applyStagedCodexFingerprintHeaders 读取 context 暂存的收敛 ID 并改写出站头。
// 非透传与透传两个请求构造器共用本函数，防止应用语义漂移。仅解析该
// snapshot 的 OAuth 账号可读取，避免 stale context 跨账号 failover 泄漏。
func applyStagedCodexFingerprintHeaders(c *gin.Context, account *Account, h http.Header) {
	applyCodexFingerprintHeaders(h, stagedCodexFingerprintIDs(c, account))
}

func applyStagedCodexFingerprintClientMetadata(c *gin.Context, account *Account, reqBody map[string]any) bool {
	return applyCodexFingerprintClientMetadata(reqBody, stagedCodexFingerprintIDs(c, account))
}

// codexFingerprintMode 控制 OAuth 账号出站请求的设备指纹收敛强度。
// 多人共享同一 OAuth 账号时，每个用户的 Codex 客户端会携带各自不同的
// installation_id / session_id / thread_id，上游据此判定设备数和会话数。
// 收敛模式将这些标识改写为账号级恒定值，减少上游可见的设备/会话指纹。
type codexFingerprintMode string

const (
	// codexFingerprintOff 不做任何收敛，原样透传客户端标识。
	// 这是默认值：收敛是显式 opt-in 的（见 GetCodexFingerprintMode）。
	codexFingerprintOff codexFingerprintMode = "off"
	// codexFingerprintDevice 仅收敛 installation_id 为账号级恒定值。
	// 上游看到 1 台设备 + 多会话（每用户各自的 session）。
	codexFingerprintDevice codexFingerprintMode = "device"
	// codexFingerprintSession 是历史 extra 值，读取时按 thread_pool 处理，
	// 避免旧账号继续按客户端无限膨胀线程。
	codexFingerprintSession codexFingerprintMode = "session"
	// codexFingerprintThreadPool 收敛 installation_id + session_id，
	// thread_id 从账号级固定池中按粘滞键哈希选取，根线程数有上限。
	// 上游看到 1 台设备 + 1 会话 + 最多 K 条根线程（默认 K=4）。
	// 若请求带了子代理/fork 谱系，每个根线程再挂 1 条稳定 child，上限约 2K。
	codexFingerprintThreadPool codexFingerprintMode = "thread_pool"
	// codexFingerprintFull 收敛所有标识：installation_id + session_id + thread_id。
	// 上游看到 1 台设备 + 1 会话 + 1 条根线程；子代理/fork 再挂 1 条 child。
	codexFingerprintFull codexFingerprintMode = "full"
)

const (
	codexFingerprintModeExtraKey           = "codex_fingerprint_mode"
	codexFingerprintSeedExtraKey           = "codex_fingerprint_seed"
	codexFingerprintThreadPoolSizeExtraKey = "codex_fingerprint_thread_pool_size"

	codexFingerprintWindowTurnStride = 8
	codexFingerprintWindowCounterMax = 4096
	codexFingerprintWindowIdleSecs   = 2 * 60 * 60

	codexFingerprintThreadPoolSizeDefault = 4
	codexFingerprintThreadPoolSizeMin     = 1
	codexFingerprintThreadPoolSizeMax     = 8

	codexParentThreadIDHeader = "x-codex-parent-thread-id"
	codexOpenAISubagentHeader = "x-openai-subagent"

	codexFingerprintWindowStoreTimeout = 200 * time.Millisecond
	codexFingerprintWindowCacheKeyPref = "codex_fp_window:v1:"
)

func (a *Account) GetCodexFingerprintThreadPoolSize() int {
	if a == nil || a.Extra == nil {
		return codexFingerprintThreadPoolSizeDefault
	}
	n, ok := parseCodexFingerprintPoolSize(a.Extra[codexFingerprintThreadPoolSizeExtraKey])
	if !ok || n < codexFingerprintThreadPoolSizeMin || n > codexFingerprintThreadPoolSizeMax {
		return codexFingerprintThreadPoolSizeDefault
	}
	return n
}

func parseCodexFingerprintPoolSize(raw any) (int, bool) {
	switch v := raw.(type) {
	case int:
		return v, true
	case int64:
		return int(v), true
	case float64:
		if v != float64(int(v)) {
			return 0, false
		}
		return int(v), true
	case json.Number:
		n, err := v.Int64()
		return int(n), err == nil
	case string:
		n, err := strconv.Atoi(strings.TrimSpace(v))
		return n, err == nil
	default:
		return 0, false
	}
}

func canonicalCodexFingerprintSeed(value any) (string, bool) {
	raw, ok := value.(string)
	if !ok {
		return "", false
	}
	trimmed := strings.TrimSpace(raw)
	parsed, err := uuid.Parse(trimmed)
	if err != nil || parsed == uuid.Nil || trimmed != parsed.String() {
		return "", false
	}
	return trimmed, true
}

func newCodexFingerprintSeed() string {
	return uuid.NewString()
}

func stripCodexFingerprintSeed(extra map[string]any) map[string]any {
	if extra == nil {
		return nil
	}
	stripped := maps.Clone(extra)
	delete(stripped, codexFingerprintSeedExtraKey)
	return stripped
}

func codexFingerprintModeFromExtra(extra map[string]any) codexFingerprintMode {
	if extra == nil {
		return codexFingerprintOff
	}
	raw, _ := extra[codexFingerprintModeExtraKey].(string)
	switch codexFingerprintMode(strings.TrimSpace(raw)) {
	case codexFingerprintOff, codexFingerprintDevice, codexFingerprintSession, codexFingerprintThreadPool, codexFingerprintFull:
		return codexFingerprintMode(strings.TrimSpace(raw))
	default:
		return codexFingerprintOff
	}
}

func codexFingerprintModeRequiresSeed(mode codexFingerprintMode) bool {
	switch mode {
	case codexFingerprintDevice, codexFingerprintSession, codexFingerprintThreadPool, codexFingerprintFull:
		return true
	default:
		return false
	}
}

func codexFingerprintSeed(extra map[string]any) (string, bool) {
	if extra == nil {
		return "", false
	}
	return canonicalCodexFingerprintSeed(extra[codexFingerprintSeedExtraKey])
}

func prepareCodexFingerprintExtraForCreate(platform, accountType string, extra map[string]any) map[string]any {
	prepared := stripCodexFingerprintSeed(extra)
	if platform != PlatformOpenAI || (accountType != AccountTypeOAuth && accountType != AccountTypeSetupToken) || !codexFingerprintModeRequiresSeed(codexFingerprintModeFromExtra(prepared)) {
		return prepared
	}
	if prepared == nil {
		prepared = make(map[string]any, 1)
	}
	prepared[codexFingerprintSeedExtraKey] = newCodexFingerprintSeed()
	return prepared
}

func prepareCodexFingerprintExtraForUpdate(account *Account, extra map[string]any) map[string]any {
	prepared := stripCodexFingerprintSeed(extra)
	if account == nil || !account.IsOpenAIOAuthLike() {
		return prepared
	}
	if seed, ok := codexFingerprintSeed(account.Extra); ok {
		if prepared == nil {
			prepared = make(map[string]any, 1)
		}
		prepared[codexFingerprintSeedExtraKey] = seed
		return prepared
	}
	if codexFingerprintModeRequiresSeed(codexFingerprintModeFromExtra(prepared)) {
		if prepared == nil {
			prepared = make(map[string]any, 1)
		}
		prepared[codexFingerprintSeedExtraKey] = newCodexFingerprintSeed()
	}
	return prepared
}

func sanitizedCodexFingerprintExtraUpdates(updates map[string]any) map[string]any {
	if updates == nil {
		return nil
	}
	sanitized := maps.Clone(updates)
	delete(sanitized, codexFingerprintSeedExtraKey)
	return sanitized
}

// ShouldEnsureCodexFingerprintSeedForExtraUpdates reports whether a JSONB key-level
// extra update is enabling Codex fingerprint convergence and therefore must atomically
// preserve or create the system-managed per-account seed in the repository update.
func ShouldEnsureCodexFingerprintSeedForExtraUpdates(updates map[string]any) bool {
	if updates == nil {
		return false
	}
	return codexFingerprintModeRequiresSeed(codexFingerprintModeFromExtra(updates))
}

// GetCodexFingerprintMode 从账号 extra JSON 读取指纹收敛模式。
//
// **收敛是显式 opt-in**：未设置、空值或非法值一律按 off 处理，只有管理员
// 明确配置 device / session / full 才收敛。
//
// 历史：v0.1.175（#5553）把缺省值当作 session，导致升级后存量 OAuth 账号
// （普遍没有这个 extra 键）的每个非透传请求都被静默改写 installation /
// session / thread / turn / window 五类标识；#5555、#5556、#5582 报告的额度
// 缩水都卡在该版本边界，并有"回退 v0.1.173 即恢复"与"新账号开收敛后降额"
// 的 A/B 实测。上游的配额判定策略不可观测，因此这里取兼容安全的一侧：
// 不显式 opt-in 就保持 v0.1.175 之前的客户端身份（#5610）。
func (a *Account) GetCodexFingerprintMode() codexFingerprintMode {
	if a == nil || !a.IsOpenAIOAuthLike() {
		return codexFingerprintOff
	}
	return codexFingerprintModeFromExtra(a.Extra)
}

// deriveStableUUIDv4 从种子确定性派生一个 UUIDv4 格式的字符串。
// 同一种子永远返回同一值。
func deriveStableUUIDv4(seed string) string {
	h := sha256.Sum256([]byte(seed))
	b := h[:16]
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant 1
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		binary.BigEndian.Uint32(b[0:4]),
		binary.BigEndian.Uint16(b[4:6]),
		binary.BigEndian.Uint16(b[6:8]),
		binary.BigEndian.Uint16(b[8:10]),
		b[10:16])
}

// resolveConvergedInstallationID 返回账号级恒定的 installation_id。
// 优先使用管理员配置的真实 device_id，无则从系统管理的账号随机种子确定性派生。
func resolveConvergedInstallationID(account *Account, seed string) string {
	if account == nil {
		return ""
	}
	if deviceID := account.GetOpenAIDeviceID(); deviceID != "" {
		return deviceID
	}
	if seed == "" {
		return ""
	}
	return deriveStableUUIDv4("sub2api:codex-install-id:v2:" + seed)
}

// resolveConvergedSessionID 返回账号级恒定的 session_id。
func resolveConvergedSessionID(seed string) string {
	if seed == "" {
		return ""
	}
	return deriveStableUUIDv4("sub2api:codex-session-id:v2:" + seed)
}

// resolveConvergedThreadID 按客户端原始 session-id 确定性派生 thread_id。
// 每个真实 Codex 会话（不同客户端启动实例）获得一个独立线程，
// 模拟正常用户 spawn 子代理或开多窗口的模式。
func resolveConvergedThreadID(seed, clientSessionID string) string {
	if seed == "" || clientSessionID == "" {
		return ""
	}
	return deriveStableUUIDv4("sub2api:codex-thread-id:v2:" + seed + ":" + clientSessionID)
}

// resolvePooledThreadID 从账号级固定线程池选取 thread_id。
// slot 0 等于 session_id（Codex 根会话语义）；其余 slot 为账号级恒定派生值。
// 空粘滞键固定落到 slot 0，避免无标识请求再开新线程。
func resolvePooledThreadID(account *Account, seed, stickyKey string) string {
	sessionID := resolveConvergedSessionID(seed)
	if sessionID == "" {
		return ""
	}
	size := account.GetCodexFingerprintThreadPoolSize()
	if stickyKey == "" || size <= 1 {
		return sessionID
	}
	slot := hashStickyKeyToThreadSlot(account.ID, stickyKey, size)
	if slot == 0 {
		return sessionID
	}
	return deriveStableUUIDv4(fmt.Sprintf("sub2api:codex-thread-pool:v1:%d:%d", account.ID, slot))
}

func hashStickyKeyToThreadSlot(accountID int64, stickyKey string, size int) int {
	if size <= 1 {
		return 0
	}
	sum := sha256.Sum256([]byte(fmt.Sprintf("sub2api:codex-thread-pool-slot:v1:%d:%s", accountID, stickyKey)))
	return int(binary.BigEndian.Uint32(sum[:4]) % uint32(size))
}

// resolveChildThreadID 为子代理/fork 派生一条挂在父线程下的稳定 child thread。
// 每个父线程只对应一条 child，避免按客户端 thread 无限膨胀。
func resolveChildThreadID(accountID int64, parentThreadID string) string {
	if accountID == 0 || parentThreadID == "" {
		return ""
	}
	return deriveStableUUIDv4(fmt.Sprintf("sub2api:codex-thread-child:v1:%d:%s", accountID, parentThreadID))
}

type codexFingerprintLineage struct {
	hasParent    bool
	hasFork      bool
	hasSubagent  bool
	parentTurnID string
	subagentKind string
}

func (l codexFingerprintLineage) isChild() bool {
	return l.hasParent || l.hasFork || l.hasSubagent
}

func extractCodexFingerprintLineage(h http.Header) codexFingerprintLineage {
	var lineage codexFingerprintLineage
	if h == nil {
		return lineage
	}
	if strings.TrimSpace(h.Get(codexParentThreadIDHeader)) != "" {
		lineage.hasParent = true
	}
	if kind := strings.TrimSpace(h.Get(codexOpenAISubagentHeader)); kind != "" {
		lineage.hasSubagent = true
		lineage.subagentKind = kind
	}
	mergeCodexFingerprintLineageFromJSON(&lineage, h.Get("x-codex-turn-metadata"))
	return lineage
}

func mergeCodexFingerprintLineageFromJSON(lineage *codexFingerprintLineage, raw string) {
	if lineage == nil {
		return
	}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return
	}
	if gjson.Get(raw, "parent_thread_id").String() != "" {
		lineage.hasParent = true
	}
	if gjson.Get(raw, "forked_from_thread_id").String() != "" {
		lineage.hasFork = true
	}
	if turnID := strings.TrimSpace(gjson.Get(raw, "parent_turn_id").String()); turnID != "" && lineage.parentTurnID == "" {
		lineage.parentTurnID = turnID
	}
	if kind := strings.TrimSpace(gjson.Get(raw, "subagent_kind").String()); kind != "" && lineage.subagentKind == "" {
		lineage.hasSubagent = true
		lineage.subagentKind = kind
	}
}

func mergeCodexFingerprintLineageFromClientMetadata(lineage *codexFingerprintLineage, metadata map[string]any) {
	if lineage == nil || metadata == nil {
		return
	}
	if metadataString(metadata, codexParentThreadIDHeader) != "" {
		lineage.hasParent = true
	}
	if kind := metadataString(metadata, codexOpenAISubagentHeader); kind != "" {
		lineage.hasSubagent = true
		if lineage.subagentKind == "" {
			lineage.subagentKind = kind
		}
	}
	if turnID := metadataString(metadata, "parent_turn_id"); turnID != "" && lineage.parentTurnID == "" {
		lineage.parentTurnID = turnID
	}
	mergeCodexFingerprintLineageFromJSON(lineage, metadataString(metadata, "x-codex-turn-metadata"))
}

func mergeCodexFingerprintLineageFromCreateFrame(lineage *codexFingerprintLineage, payload []byte) {
	if lineage == nil || len(payload) == 0 {
		return
	}
	if strings.TrimSpace(gjson.GetBytes(payload, "client_metadata."+codexParentThreadIDHeader).String()) != "" {
		lineage.hasParent = true
	}
	if kind := strings.TrimSpace(gjson.GetBytes(payload, "client_metadata."+codexOpenAISubagentHeader).String()); kind != "" {
		lineage.hasSubagent = true
		if lineage.subagentKind == "" {
			lineage.subagentKind = kind
		}
	}
	if turnID := strings.TrimSpace(gjson.GetBytes(payload, "client_metadata.parent_turn_id").String()); turnID != "" && lineage.parentTurnID == "" {
		lineage.parentTurnID = turnID
	}
	mergeCodexFingerprintLineageFromJSON(lineage, gjson.GetBytes(payload, "client_metadata.x-codex-turn-metadata").String())
}

func metadataString(metadata map[string]any, key string) string {
	if metadata == nil {
		return ""
	}
	raw, ok := metadata[key]
	if !ok {
		return ""
	}
	value, ok := raw.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(value)
}

// codexFingerprintIDs 收敛后的完整 ID 集合。
// 由 resolveCodexFingerprintIDs 一次性生成，同一个实例在头改写和体改写之间共享，
// 确保所有载体中的 turn_id 等随机字段一致。体改写时还会补记原始
// client_metadata.session_id，用于识别 root prompt_cache_key 的默认值。
type codexFingerprintIDs struct {
	accountID                     int64
	mode                          codexFingerprintMode
	installationID                string
	sessionID                     string
	threadID                      string
	turnID                        string
	windowID                      string
	turnStartedAtUnixMs           int64
	originalBodySessionID         string
	originalBodySessionIDCaptured bool
	parentThreadID                string
	forkedFromThreadID            string
	subagentHeader                string
	connectionPinned              bool
	parentTurnID                  string
	lineage                       codexFingerprintLineage
}

// resolveCodexFingerprintIDs 按收敛模式计算出站 ID 集合。
// clientSessionID 是客户端原始粘滞键（session-id / conversation_id），
// 在 thread_pool（含历史 session 别名）下用来选池内线程。
// 返回 nil 表示 off 模式，不需要改写。
// 注意：包含随机生成的 turn_id，调用方必须只调用一次并共享结果给头改写和体改写。
func resolveCodexFingerprintIDs(account *Account, clientSessionID string, mode codexFingerprintMode) *codexFingerprintIDs {
	if account == nil || mode == codexFingerprintOff {
		return nil
	}
	seed, ok := codexFingerprintSeed(account.Extra)
	if !ok {
		return nil
	}

	ids := &codexFingerprintIDs{
		accountID:           account.ID,
		mode:                mode,
		turnStartedAtUnixMs: time.Now().UnixMilli(),
		lineage:             account.lineage,
	}

	ids.installationID = resolveConvergedInstallationID(account, seed)
	if ids.installationID == "" {
		return nil
	}

	switch mode {
	case codexFingerprintDevice:
		return ids

	case codexFingerprintSession, codexFingerprintThreadPool:
		ids.sessionID = resolveConvergedSessionID(seed)
		if mode == codexFingerprintThreadPool {
			ids.threadID = resolvePooledThreadID(account, seed, clientSessionID)
		} else {
			ids.threadID = resolveConvergedThreadID(seed, clientSessionID)
		}
		if ids.threadID == "" {
			ids.threadID = ids.sessionID
		}

	case codexFingerprintFull:
		ids.sessionID = resolveConvergedSessionID(seed)
		ids.threadID = ids.sessionID

	default:
		return nil
	}

	ids.applyLineage()
	if ids.turnID == "" || ids.windowID == "" {
		ids.assignTurnWindow()
	}
	return ids
}

func (ids *codexFingerprintIDs) assignTurnWindow() {
	if ids == nil {
		return
	}
	ids.turnID = newCodexFingerprintTurnID()
	ids.windowID = formatCodexFingerprintWindowID(
		ids.threadID,
		nextCodexFingerprintWindowIndex(ids.accountID, ids.threadID),
	)
	ids.turnStartedAtUnixMs = time.Now().UnixMilli()
}

func (ids *codexFingerprintIDs) lineageFamilyRoot() string {
	if ids == nil {
		return ""
	}
	if ids.parentThreadID != "" {
		return ids.parentThreadID
	}
	return ids.forkedFromThreadID
}

func (ids *codexFingerprintIDs) applyLineage() {
	if ids == nil || ids.mode == codexFingerprintDevice {
		return
	}
	lineage := ids.lineage
	if !lineage.isChild() {
		return
	}
	if ids.parentTurnID == "" && lineage.parentTurnID != "" {
		ids.parentTurnID = lineage.parentTurnID
	}
	if ids.subagentHeader == "" {
		ids.subagentHeader = lineage.subagentKind
	}

	familyRoot := ids.lineageFamilyRoot()
	if familyRoot != "" {
		ids.fillMissingLineageAnchors(lineage, familyRoot)
		return
	}

	familyRoot = ids.threadID
	if familyRoot == "" {
		return
	}
	if lineage.hasParent || lineage.hasSubagent {
		ids.parentThreadID = familyRoot
	}
	if lineage.hasFork {
		ids.forkedFromThreadID = familyRoot
	}
	if child := resolveChildThreadID(ids.accountID, familyRoot); child != "" {
		ids.threadID = child
	}
}

func (ids *codexFingerprintIDs) fillMissingLineageAnchors(lineage codexFingerprintLineage, familyRoot string) {
	if ids == nil || familyRoot == "" {
		return
	}
	if (lineage.hasParent || lineage.hasSubagent) && ids.parentThreadID == "" {
		ids.parentThreadID = familyRoot
	}
	if lineage.hasFork && ids.forkedFromThreadID == "" {
		ids.forkedFromThreadID = familyRoot
	}
}

func nextCodexFingerprintTurnOnPinnedConnection(pinned *codexFingerprintIDs) *codexFingerprintIDs {
	if pinned == nil {
		return nil
	}
	next := *pinned
	next.connectionPinned = true
	next.assignTurnWindow()
	return &next
}

// CodexFingerprintWindowStore 跨实例共享 window 计数。由 Redis 实现；未配置时回退进程内 map。
type CodexFingerprintWindowStore interface {
	NextCodexFingerprintWindowIndex(ctx context.Context, accountID int64, threadID string) (int, error)
}

type codexFingerprintWindowStoreBox struct {
	store CodexFingerprintWindowStore
}

var defaultCodexFingerprintWindowStore atomic.Value

func configureCodexFingerprintWindowStore(store CodexFingerprintWindowStore) {
	defaultCodexFingerprintWindowStore.Store(codexFingerprintWindowStoreBox{store: store})
}

func currentCodexFingerprintWindowStore() CodexFingerprintWindowStore {
	raw := defaultCodexFingerprintWindowStore.Load()
	box, ok := raw.(codexFingerprintWindowStoreBox)
	if !ok {
		return nil
	}
	return box.store
}

func nextCodexFingerprintWindowIndex(accountID int64, threadID string) int {
	if store := currentCodexFingerprintWindowStore(); store != nil {
		ctx, cancel := context.WithTimeout(context.Background(), codexFingerprintWindowStoreTimeout)
		defer cancel()
		if n, err := store.NextCodexFingerprintWindowIndex(ctx, accountID, threadID); err == nil && n >= 0 {
			return n
		}
	}
	return defaultCodexFingerprintWindowState.nextIndex(accountID, threadID)
}

func CodexFingerprintWindowCacheKey(accountID int64, threadID string) string {
	return codexFingerprintWindowCacheKeyPref + strconv.FormatInt(accountID, 10) + ":" + threadID
}

func CodexFingerprintWindowIdleTTL(accountID int64) time.Duration {
	jitterSec := accountID % 300
	if jitterSec < 0 {
		jitterSec = 0
	}
	return time.Duration(codexFingerprintWindowIdleSecs+jitterSec) * time.Second
}

func CodexFingerprintWindowTurnStride() int {
	return codexFingerprintWindowTurnStride
}

type codexFingerprintWindowEntry struct {
	turns    uint64
	lastUnix int64
}

type codexFingerprintWindowState struct {
	mu      sync.Mutex
	entries map[string]*codexFingerprintWindowEntry
}

var defaultCodexFingerprintWindowState = newCodexFingerprintWindowState()

func newCodexFingerprintWindowState() *codexFingerprintWindowState {
	return &codexFingerprintWindowState{
		entries: make(map[string]*codexFingerprintWindowEntry, 64),
	}
}

func formatCodexFingerprintWindowID(threadID string, index int) string {
	if index < 0 {
		index = 0
	}
	return fmt.Sprintf("%s:%d", threadID, index)
}

func (s *codexFingerprintWindowState) nextIndex(accountID int64, threadID string) int {
	if s == nil || accountID == 0 || threadID == "" {
		return 0
	}
	key := fmt.Sprintf("%d:%s", accountID, threadID)
	now := time.Now().Unix()

	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.entries) >= codexFingerprintWindowCounterMax {
		s.evictLocked(now)
	}
	entry := s.entries[key]
	if entry == nil {
		entry = &codexFingerprintWindowEntry{}
		s.entries[key] = entry
	}
	index := int(entry.turns / uint64(codexFingerprintWindowTurnStride))
	entry.turns++
	entry.lastUnix = now
	return index
}

func (s *codexFingerprintWindowState) evictLocked(now int64) {
	for key, entry := range s.entries {
		if entry == nil || now-entry.lastUnix > codexFingerprintWindowIdleSecs {
			delete(s.entries, key)
		}
	}
	for len(s.entries) >= codexFingerprintWindowCounterMax {
		key := oldestCodexFingerprintWindowKey(s.entries)
		if key == "" {
			return
		}
		delete(s.entries, key)
	}
}

func oldestCodexFingerprintWindowKey(entries map[string]*codexFingerprintWindowEntry) string {
	oldestKey := ""
	oldestUnix := int64(0)
	for key, entry := range entries {
		if entry == nil {
			return key
		}
		if oldestKey == "" || entry.lastUnix < oldestUnix {
			oldestKey = key
			oldestUnix = entry.lastUnix
		}
	}
	return oldestKey
}

func resetCodexFingerprintWindowStateForTest() {
	defaultCodexFingerprintWindowState = newCodexFingerprintWindowState()
	configureCodexFingerprintWindowStore(nil)
}

// extractClientSessionID 从请求头中提取客户端原始的会话标识。
// 优先取 session-id（连字符形式，Codex CLI 标准），回退到 session_id（下划线形式）。
// 返回的值尚未被 isolateOpenAISessionID 改写，是客户端的真实标识。
func extractClientSessionID(h http.Header) string {
	if v := strings.TrimSpace(h.Get("session-id")); v != "" {
		return v
	}
	return strings.TrimSpace(h.Get("session_id"))
}

// extractClientStickyKey 提取用于线程池粘滞的客户端标识。
// 优先 session-id / session_id，回退 conversation_id，避免无 session 头时人人落到 slot 0。
func extractClientStickyKey(h http.Header) string {
	if v := extractClientSessionID(h); v != "" {
		return v
	}
	if h == nil {
		return ""
	}
	return strings.TrimSpace(h.Get("conversation_id"))
}

// resolveCodexFingerprintIDsFromRequest 从客户端原始请求头中提取粘滞键和谱系。
// 仅有请求头、尚无 body 时使用；HTTP/WS 热路径应走 resolveCodexFingerprintIDsFromClient，
// 以免 body-only 谱系在 enrich 时二次改 thread / 双计 window。
func resolveCodexFingerprintIDsFromRequest(account *Account, clientHeaders http.Header) *codexFingerprintIDs {
	return resolveCodexFingerprintIDsFromClient(account, clientHeaders, nil, nil)
}

// resolveCodexFingerprintIDsFromClient 从请求头 + 可选请求体提取粘滞键和谱系后解析收敛 ID。
// reqBody 与 rawBody 二选一即可；都提供时优先 reqBody。调用方应将返回的 ids
// 同时传给头改写和体改写，保证 turn_id / window_id 一致。
func resolveCodexFingerprintIDsFromClient(account *Account, clientHeaders http.Header, reqBody map[string]any, rawBody []byte) *codexFingerprintIDs {
	if account == nil {
		return nil
	}
	mode := account.GetCodexFingerprintMode()
	if mode == codexFingerprintOff {
		return nil
	}
	stickyKey := ""
	if clientHeaders != nil {
		stickyKey = extractClientStickyKey(clientHeaders)
	}
	lineage := extractCodexFingerprintLineage(clientHeaders)
	if reqBody != nil {
		existing, _ := reqBody["client_metadata"].(map[string]any)
		mergeCodexFingerprintLineageFromClientMetadata(&lineage, existing)
	} else if len(rawBody) > 0 {
		mergeCodexFingerprintLineageFromCreateFrame(&lineage, rawBody)
	}
	return resolveCodexFingerprintIDsWithLineage(account, stickyKey, mode, lineage)
}

func resolveCodexFingerprintIDsWithLineage(account *Account, clientSessionID string, mode codexFingerprintMode, lineage codexFingerprintLineage) *codexFingerprintIDs {
	account.lineage = lineage
	ids := resolveCodexFingerprintIDs(account, clientSessionID, mode)
	return ids
}

// applyCodexFingerprintHeaders 按预计算的收敛 ID 改写出站 HTTP 头中的设备指纹。
// 在 buildUpstreamRequest 的白名单透传之后、enforceCodexIdentityHeaders 之前调用。
func applyCodexFingerprintHeaders(h http.Header, ids *codexFingerprintIDs) {
	if h == nil || ids == nil {
		return
	}

	h.Set("x-codex-installation-id", ids.installationID)
	if ids.mode == codexFingerprintDevice {
		rewriteCodexTurnMetadataFields(h, map[string]any{
			"installation_id": ids.installationID,
		})
		return
	}

	applyCodexFingerprintSessionHeaders(h, ids)
	rewriteCodexTurnMetadataFields(h, codexFingerprintTurnMetadataFields(ids))
}

func applyCodexFingerprintSessionHeaders(h http.Header, ids *codexFingerprintIDs) {
	h.Set("x-codex-window-id", ids.windowID)
	h.Set("x-client-request-id", ids.threadID)
	h.Set("session-id", ids.sessionID)
	h.Set("session_id", ids.sessionID)
	h.Set("thread-id", ids.threadID)
	h.Set("thread_id", ids.threadID)
	// Codex 根会话 conversation_id 与 thread_id 对齐，禁止再用 prompt_cache_key 冒充 conversation。
	h.Set("conversation_id", ids.threadID)
	applyCodexFingerprintLineageHeaders(h, ids)
}

func applyCodexFingerprintLineageHeaders(h http.Header, ids *codexFingerprintIDs) {
	if ids.parentThreadID != "" {
		h.Set(codexParentThreadIDHeader, ids.parentThreadID)
	} else {
		h.Del(codexParentThreadIDHeader)
	}
	if ids.subagentHeader != "" {
		h.Set(codexOpenAISubagentHeader, ids.subagentHeader)
	} else {
		h.Del(codexOpenAISubagentHeader)
	}
}

func codexFingerprintTurnMetadataFields(ids *codexFingerprintIDs) map[string]any {
	fields := map[string]any{
		"installation_id":         ids.installationID,
		"session_id":              ids.sessionID,
		"thread_id":               ids.threadID,
		"turn_id":                 ids.turnID,
		"window_id":               ids.windowID,
		"turn_started_at_unix_ms": ids.turnStartedAtUnixMs,
	}
	if ids.parentThreadID != "" {
		fields["parent_thread_id"] = ids.parentThreadID
	} else if ids.forkedFromThreadID != "" {
		delete(fields, "parent_thread_id")
		fields["forked_from_thread_id"] = ids.forkedFromThreadID
	} else {
		delete(fields, "parent_thread_id")
	}
	return fields
}

// rewriteCodexTurnMetadataFields 解析 x-codex-turn-metadata 头中的 JSON，
// 替换指定字段后回写，并清掉与收敛身份不一致的仓库指纹。
func rewriteCodexTurnMetadataFields(h http.Header, fields map[string]any) {
	raw := strings.TrimSpace(h.Get("x-codex-turn-metadata"))
	if raw == "" {
		return
	}
	var metadata map[string]any
	if err := json.Unmarshal([]byte(raw), &metadata); err != nil || metadata == nil {
		metadata = make(map[string]any, len(fields))
	}
	for k, v := range fields {
		metadata[k] = v
	}
	ids := &codexFingerprintIDs{}
	sanitizeCodexTurnMetadataWithLineage(metadata, ids, true)
	rebuilt, err := json.Marshal(metadata)
	if err != nil {
		return
	}
	h.Set("x-codex-turn-metadata", string(rebuilt))
}

func sanitizeCodexTurnMetadata(metadata map[string]any, ids *codexFingerprintIDs) {
	if metadata == nil {
		return
	}
	delete(metadata, "workspaces")
	if ids == nil || ids.mode == codexFingerprintDevice {
		return
	}
	applyCodexLineageToMap(metadata, ids)
}

func sanitizeCodexTurnMetadataWithLineage(metadata map[string]any, ids *codexFingerprintIDs, preserveLineage bool) {
	if metadata == nil {
		return
	}
	delete(metadata, "workspaces")
	if ids == nil || ids.mode == codexFingerprintDevice || preserveLineage {
		return
	}
	applyCodexLineageToMap(metadata, ids)
}

func applyCodexLineageToMap(dst map[string]any, ids *codexFingerprintIDs) {
	setOrDeleteMetadataString(dst, "parent_thread_id", ids.parentThreadID)
	setOrDeleteMetadataString(dst, "forked_from_thread_id", ids.forkedFromThreadID)
	setOrDeleteMetadataString(dst, "parent_turn_id", ids.parentTurnID)
}

func setOrDeleteMetadataString(dst map[string]any, key, value string) {
	if dst == nil {
		return
	}
	if value != "" {
		dst[key] = value
		return
	}
	delete(dst, key)
}

// applyCodexFingerprintClientMetadata 按预计算的收敛 ID 改写请求体中的 client_metadata。
// 使用与头改写相同的 ids 实例，确保 turn_id 等随机字段一致。
func applyCodexFingerprintClientMetadata(reqBody map[string]any, ids *codexFingerprintIDs) bool {
	if reqBody == nil || ids == nil {
		return false
	}

	captureCodexFingerprintOriginalBodySessionID(ids, reqBody["client_metadata"])
	existing, _ := reqBody["client_metadata"].(map[string]any)
	if existing == nil {
		existing = make(map[string]any)
	}

	modified := false
	if applyCodexFingerprintToClientMetadataMap(existing, ids) {
		reqBody["client_metadata"] = existing
		modified = true
	}
	if applyCodexFingerprintPromptCacheKey(reqBody, ids) {
		modified = true
	}
	return modified
}

// applyCodexFingerprintToClientMetadataMap 是 client_metadata 改写的共享核心，
// map 版（非透传，body 已解码）与 raw 字节版（透传热路径）都经由它，保证两条
// 路径的收敛语义永不漂移。
func applyCodexFingerprintToClientMetadataMap(existing map[string]any, ids *codexFingerprintIDs) bool {
	if existing == nil || ids == nil {
		return false
	}

	modified := false

	if ids.installationID != "" {
		existing["x-codex-installation-id"] = ids.installationID
		modified = true
	}

	if !ids.connectionPinned && ids.parentThreadID == "" && existing[codexParentThreadIDHeader] != nil {
		ids.lineage.hasParent = true
	}
	if !ids.connectionPinned && ids.subagentHeader == "" {
		if kind := metadataString(existing, codexOpenAISubagentHeader); kind != "" {
			ids.subagentHeader = kind
			ids.lineage.hasSubagent = true
		}
	}
	ids.applyLineage()

	if ids.mode == codexFingerprintDevice {
		rewriteClientMetadataEmbeddedTurnMetadata(existing, map[string]any{
			"installation_id": ids.installationID,
		})
		return modified
	}

	existing["session_id"] = ids.sessionID
	existing["thread_id"] = ids.threadID
	existing["turn_id"] = ids.turnID
	existing["x-codex-window-id"] = ids.windowID
	setOrDeleteMetadataString(existing, codexParentThreadIDHeader, ids.parentThreadID)
	setOrDeleteMetadataString(existing, "parent_turn_id", ids.parentTurnID)
	setOrDeleteMetadataString(existing, codexOpenAISubagentHeader, ids.subagentHeader)
	rewriteClientMetadataEmbeddedTurnMetadata(existing, codexFingerprintTurnMetadataFields(ids))
	return true
}

// newCodexFingerprintTurnID 生成单次 turn 的随机 ID。
// 优先 UUIDv7；失败时回退到随机 UUIDv4，避免 Must panic。
func newCodexFingerprintTurnID() string {
	if id, err := uuid.NewV7(); err == nil {
		return id.String()
	}
	return uuid.NewString()
}

func isOpenAIWSResponseCreateFrame(payload []byte) bool {
	return strings.TrimSpace(gjson.GetBytes(payload, "type").String()) == "response.create"
}

// applyCodexFingerprintToWSCreateFrame 改写 WS response.create 帧中的 client_metadata。
// 未传入预计算 ids 时会按帧内谱系重新解析，使后续 turn 的 turn_id 变化。
func applyCodexFingerprintToWSCreateFrame(account *Account, clientHeaders http.Header, payload []byte) []byte {
	return applyCodexFingerprintToWSCreateFrameWithIDs(account, clientHeaders, payload, nil)
}

func applyCodexFingerprintToWSCreateFrameWithIDs(account *Account, clientHeaders http.Header, payload []byte, ids *codexFingerprintIDs) []byte {
	if account == nil || len(payload) == 0 || !isOpenAIWSResponseCreateFrame(payload) {
		return payload
	}
	if ids == nil {
		ids = resolveCodexFingerprintIDsFromClient(account, clientHeaders, nil, payload)
	}
	if ids == nil {
		return payload
	}
	rewritten, changed := applyCodexFingerprintToBodyBytes(payload, ids)
	if !changed {
		return payload
	}
	return rewritten
}

func captureCodexFingerprintOriginalBodySessionID(ids *codexFingerprintIDs, clientMetadata any) {
	if ids == nil || ids.originalBodySessionIDCaptured {
		return
	}
	ids.originalBodySessionIDCaptured = true
	if clientMetadata == nil {
		return
	}
	switch metadata := clientMetadata.(type) {
	case map[string]any:
		if sessionID, ok := metadata["session_id"].(string); ok {
			ids.originalBodySessionID = strings.TrimSpace(sessionID)
		}
	case map[string]string:
		ids.originalBodySessionID = strings.TrimSpace(metadata["session_id"])
	}
}

func captureCodexFingerprintOriginalBodySessionIDRaw(ids *codexFingerprintIDs, value gjson.Result) {
	if ids == nil || ids.originalBodySessionIDCaptured {
		return
	}
	ids.originalBodySessionIDCaptured = true
	if value.Exists() && value.Type == gjson.String {
		ids.originalBodySessionID = strings.TrimSpace(value.String())
	}
}

func shouldRewriteCodexFingerprintPromptCacheKey(ids *codexFingerprintIDs, promptCacheKey string) bool {
	if ids == nil || !ids.originalBodySessionIDCaptured || ids.originalBodySessionID == "" || ids.sessionID == "" {
		return false
	}
	if ids.mode != codexFingerprintSession && ids.mode != codexFingerprintFull {
		return false
	}
	return promptCacheKey == ids.originalBodySessionID
}

func applyCodexFingerprintPromptCacheKey(reqBody map[string]any, ids *codexFingerprintIDs) bool {
	if reqBody == nil {
		return false
	}
	promptCacheKey, ok := reqBody["prompt_cache_key"].(string)
	if !ok || strings.TrimSpace(promptCacheKey) == "" || !shouldRewriteCodexFingerprintPromptCacheKey(ids, promptCacheKey) {
		return false
	}
	if promptCacheKey == ids.sessionID {
		return false
	}
	reqBody["prompt_cache_key"] = ids.sessionID
	return true
}

// applyCodexFingerprintClientMetadataRaw 在原始 JSON 字节上改写 client_metadata，
// 供透传路径使用——透传是热路径，禁止对可能高达数十 MB 的 body 做全量
// Unmarshal（见 forwardOpenAIPassthrough 的轻量提取注释）。实现为：gjson 提取
// client_metadata 小对象单独解码，经共享核心改写后 sjson 一次性拼回，body
// 其余字节原样保留；root prompt_cache_key 仅在可证明是 body session 默认值时
// 做标量改写。语义与 applyCodexFingerprintClientMetadata 逐点一致（含
// "非对象值整体替换为收敛集合"的行为）。
func applyCodexFingerprintClientMetadataRaw(body []byte, ids *codexFingerprintIDs) ([]byte, bool, error) {
	if len(body) == 0 || ids == nil {
		return body, false, nil
	}
	// 非 JSON 对象的 body（数组/标量/畸形）没有 client_metadata 语义，
	// sjson 在这类根上写字段会改写整体结构，直接放行保持原样。
	root := gjson.ParseBytes(body)
	if !root.IsObject() {
		captureCodexFingerprintOriginalBodySessionIDRaw(ids, gjson.Result{})
		return body, false, nil
	}

	existing := map[string]any{}
	if cm := gjson.GetBytes(body, "client_metadata"); cm.IsObject() {
		captureCodexFingerprintOriginalBodySessionIDRaw(ids, gjson.GetBytes(body, "client_metadata.session_id"))
		if err := json.Unmarshal([]byte(cm.Raw), &existing); err != nil {
			return body, false, fmt.Errorf("decode client_metadata for fingerprint: %w", err)
		}
	} else {
		captureCodexFingerprintOriginalBodySessionIDRaw(ids, gjson.Result{})
	}

	next := body
	modified := false
	if applyCodexFingerprintToClientMetadataMap(existing, ids) {
		raw, err := json.Marshal(existing)
		if err != nil {
			return body, false, fmt.Errorf("encode converged client_metadata: %w", err)
		}
		var setErr error
		next, setErr = sjson.SetRawBytes(body, "client_metadata", raw)
		if setErr != nil {
			return body, false, fmt.Errorf("splice converged client_metadata: %w", setErr)
		}
		modified = true
	}
	promptCacheKey := gjson.GetBytes(body, "prompt_cache_key")
	if promptCacheKey.Exists() && promptCacheKey.Type == gjson.String && strings.TrimSpace(promptCacheKey.String()) != "" && shouldRewriteCodexFingerprintPromptCacheKey(ids, promptCacheKey.String()) {
		rewritten, err := sjson.SetBytes(next, "prompt_cache_key", ids.sessionID)
		if err != nil {
			return body, false, fmt.Errorf("splice converged prompt_cache_key: %w", err)
		}
		next = rewritten
		modified = true
	}
	return next, modified, nil
}

// rewriteClientMetadataEmbeddedTurnMetadata 改写 client_metadata 中内嵌的
// x-codex-turn-metadata JSON 字符串里的指定字段。
func rewriteClientMetadataEmbeddedTurnMetadata(clientMetadata map[string]any, fields map[string]any) {
	raw, ok := clientMetadata["x-codex-turn-metadata"].(string)
	if !ok || raw == "" {
		return
	}
	var metadata map[string]any
	if err := json.Unmarshal([]byte(raw), &metadata); err != nil || metadata == nil {
		metadata = make(map[string]any, len(fields))
	}
	for k, v := range fields {
		metadata[k] = v
	}
	ids := &codexFingerprintIDs{}
	sanitizeCodexTurnMetadataWithLineage(metadata, ids, true)
	if rebuilt, err := json.Marshal(metadata); err == nil {
		clientMetadata["x-codex-turn-metadata"] = string(rebuilt)
	}
}

// applyCodexFingerprintToBodyBytes 在仅持有原始 JSON body 的路径（如透传）上改写 client_metadata。
// 只用 sjson 回写 client_metadata，避免全量 Unmarshal/Marshal 改掉 input 里的大整数和字段顺序。
func applyCodexFingerprintToBodyBytes(body []byte, ids *codexFingerprintIDs) ([]byte, bool) {
	if ids == nil || len(body) == 0 || !gjson.ParseBytes(body).IsObject() {
		return body, false
	}
	holder := map[string]any{}
	if raw := gjson.GetBytes(body, "client_metadata"); raw.Exists() && raw.IsObject() {
		var existing map[string]any
		if err := json.Unmarshal([]byte(raw.Raw), &existing); err != nil {
			return body, false
		}
		holder["client_metadata"] = existing
	}
	if !applyCodexFingerprintClientMetadata(holder, ids) {
		return body, false
	}
	metaJSON, err := json.Marshal(holder["client_metadata"])
	if err != nil {
		return body, false
	}
	rewritten, err := sjson.SetRawBytes(body, "client_metadata", metaJSON)
	if err != nil {
		return body, false
	}
	return rewritten, true
}

func storeCodexFingerprintIDs(c *gin.Context, ids *codexFingerprintIDs) {
	if c == nil || ids == nil {
		return
	}
	c.Set(codexFingerprintIDsContextKey, ids)
}

func loadCodexFingerprintIDs(c *gin.Context) *codexFingerprintIDs {
	if c == nil {
		return nil
	}
	raw, ok := c.Get(codexFingerprintIDsContextKey)
	if !ok {
		return nil
	}
	ids, _ := raw.(*codexFingerprintIDs)
	return ids
}
