package service

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"fmt"
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

// codexFingerprintMode 控制 OAuth 账号出站请求的设备指纹收敛强度。
// 多人共享同一 OAuth 账号时，每个用户的 Codex 客户端会携带各自不同的
// installation_id / session_id / thread_id，上游据此判定设备数和会话数。
// 收敛模式将这些标识改写为账号级恒定值，减少上游可见的设备/会话指纹。
type codexFingerprintMode string

const (
	// codexFingerprintOff 不做任何收敛，原样透传客户端标识。
	// 需在账号 extra 中显式设置为 "off"；未设置时默认是 thread_pool。
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
	codexFingerprintThreadPoolSizeExtraKey = "codex_fingerprint_thread_pool_size"
	// codexFingerprintIDsContextKey 用于在 Forward/透传路径与 buildUpstreamRequest 之间共享预计算 IDs。
	codexFingerprintIDsContextKey = "codex_fingerprint_ids"

	// 同一收敛 thread 每累计这么多 turn 才把 window_id 的 :n 加一，接近 Codex compact 节奏。
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

// GetCodexFingerprintMode 从账号 extra JSON 读取指纹收敛模式。
// 未设置时默认 thread_pool（设备+会话+有上限线程池），显式设为 "off" 才关闭。
func (a *Account) GetCodexFingerprintMode() codexFingerprintMode {
	if a == nil || !a.IsOpenAIOAuth() {
		return codexFingerprintOff
	}
	raw := strings.TrimSpace(a.GetExtraString(codexFingerprintModeExtraKey))
	switch codexFingerprintMode(raw) {
	case codexFingerprintOff, codexFingerprintDevice, codexFingerprintThreadPool, codexFingerprintFull:
		return codexFingerprintMode(raw)
	case codexFingerprintSession:
		return codexFingerprintThreadPool
	default:
		return codexFingerprintThreadPool
	}
}

// GetCodexFingerprintThreadPoolSize 返回 thread_pool 模式的线程池大小，非法值回退默认 4。
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
// 优先使用管理员配置的真实 device_id，无则从 accountID 确定性派生。
func resolveConvergedInstallationID(account *Account) string {
	if account == nil {
		return ""
	}
	if deviceID := account.GetOpenAIDeviceID(); deviceID != "" {
		return deviceID
	}
	return deriveStableUUIDv4(fmt.Sprintf("sub2api:codex-install-id:v1:%d", account.ID))
}

// resolveConvergedSessionID 返回账号级恒定的 session_id。
func resolveConvergedSessionID(account *Account) string {
	if account == nil {
		return ""
	}
	return deriveStableUUIDv4(fmt.Sprintf("sub2api:codex-session-id:v1:%d", account.ID))
}

// resolveConvergedThreadID 按客户端原始 session-id 确定性派生 thread_id。
// 每个真实 Codex 会话（不同客户端启动实例）获得一个独立线程，
// 模拟正常用户 spawn 子代理或开多窗口的模式。
func resolveConvergedThreadID(account *Account, clientSessionID string) string {
	if account == nil || clientSessionID == "" {
		return ""
	}
	return deriveStableUUIDv4(fmt.Sprintf("sub2api:codex-thread-id:v1:%d:%s", account.ID, clientSessionID))
}

// resolvePooledThreadID 从账号级固定线程池选取 thread_id。
// slot 0 等于 session_id（Codex 根会话语义）；其余 slot 为账号级恒定派生值。
// 空粘滞键固定落到 slot 0，避免无标识请求再开新线程。
func resolvePooledThreadID(account *Account, stickyKey string) string {
	sessionID := resolveConvergedSessionID(account)
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
// 确保所有载体中的 turn_id 等随机字段一致。
type codexFingerprintIDs struct {
	mode               codexFingerprintMode
	accountID          int64
	installationID     string
	sessionID          string
	threadID           string
	turnID             string
	windowID           string
	turnStartedAtUnix  int64
	parentThreadID     string
	forkedFromThreadID string
	parentTurnID       string
	subagentHeader     string
	connectionPinned   bool
}

// resolveCodexFingerprintIDs 按收敛模式计算出站 ID 集合。
// clientSessionID 是客户端原始粘滞键（session-id / conversation_id），
// 在 thread_pool（含历史 session 别名）下用来选池内线程。
// 返回 nil 表示 off 模式，不需要改写。
// 注意：包含随机生成的 turn_id，调用方必须只调用一次并共享结果给头改写和体改写。
func resolveCodexFingerprintIDs(account *Account, clientSessionID string, mode codexFingerprintMode) *codexFingerprintIDs {
	return resolveCodexFingerprintIDsWithLineage(account, clientSessionID, mode, codexFingerprintLineage{})
}

func resolveCodexFingerprintIDsWithLineage(account *Account, clientSessionID string, mode codexFingerprintMode, lineage codexFingerprintLineage) *codexFingerprintIDs {
	if account == nil || mode == codexFingerprintOff {
		return nil
	}

	ids := &codexFingerprintIDs{mode: mode, accountID: account.ID}

	ids.installationID = resolveConvergedInstallationID(account)
	if ids.installationID == "" {
		return nil
	}

	switch mode {
	case codexFingerprintDevice:
		return ids

	case codexFingerprintSession, codexFingerprintThreadPool:
		ids.sessionID = resolveConvergedSessionID(account)
		ids.threadID = resolvePooledThreadID(account, clientSessionID)
		if ids.threadID == "" {
			ids.threadID = ids.sessionID
		}

	case codexFingerprintFull:
		ids.sessionID = resolveConvergedSessionID(account)
		ids.threadID = ids.sessionID

	default:
		return nil
	}

	ids.applyLineage(lineage)
	assignCodexFingerprintTurnWindow(ids, account.ID)
	return ids
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

func (ids *codexFingerprintIDs) applyLineage(lineage codexFingerprintLineage) {
	if ids == nil || ids.mode == codexFingerprintDevice || !lineage.isChild() {
		return
	}
	if ids.parentTurnID == "" {
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

func assignCodexFingerprintTurnWindow(ids *codexFingerprintIDs, accountID int64) {
	if ids == nil {
		return
	}
	ids.turnID = newCodexFingerprintTurnID()
	ids.windowID = formatCodexFingerprintWindowID(
		ids.threadID,
		nextCodexFingerprintWindowIndex(accountID, ids.threadID),
	)
	ids.turnStartedAtUnix = time.Now().UnixMilli()
}

func nextCodexFingerprintTurnOnPinnedConnection(pinned *codexFingerprintIDs) *codexFingerprintIDs {
	if pinned == nil {
		return nil
	}
	next := *pinned
	next.connectionPinned = true
	assignCodexFingerprintTurnWindow(&next, pinned.accountID)
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
		}, ids)
		return
	}

	applyCodexFingerprintSessionHeaders(h, ids)
	rewriteCodexTurnMetadataFields(h, codexFingerprintTurnMetadataFields(ids), ids)
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
	return map[string]any{
		"installation_id":         ids.installationID,
		"session_id":              ids.sessionID,
		"thread_id":               ids.threadID,
		"turn_id":                 ids.turnID,
		"window_id":               ids.windowID,
		"turn_started_at_unix_ms": ids.turnStartedAtUnix,
	}
}

// rewriteCodexTurnMetadataFields 解析 x-codex-turn-metadata 头中的 JSON，
// 替换指定字段后回写，并清掉与收敛身份不一致的谱系/仓库指纹。
func rewriteCodexTurnMetadataFields(h http.Header, fields map[string]any, ids *codexFingerprintIDs) {
	raw := strings.TrimSpace(h.Get("x-codex-turn-metadata"))
	if raw == "" {
		return
	}
	var metadata map[string]any
	if err := json.Unmarshal([]byte(raw), &metadata); err != nil {
		return
	}
	for k, v := range fields {
		metadata[k] = v
	}
	sanitizeCodexTurnMetadata(metadata, ids)
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

	existing, _ := reqBody["client_metadata"].(map[string]any)
	if existing == nil {
		existing = make(map[string]any)
	}

	modified := false

	if ids.installationID != "" {
		existing["x-codex-installation-id"] = ids.installationID
		modified = true
	}

	ids.enrichLineageFromClientMetadata(existing)

	if ids.mode == codexFingerprintDevice {
		rewriteClientMetadataEmbeddedTurnMetadata(existing, map[string]any{
			"installation_id": ids.installationID,
		}, ids)
		if modified {
			reqBody["client_metadata"] = existing
		}
		return modified
	}

	applyCodexFingerprintSessionClientMetadata(existing, ids)
	reqBody["client_metadata"] = existing
	return true
}

func applyCodexFingerprintSessionClientMetadata(existing map[string]any, ids *codexFingerprintIDs) {
	existing["session_id"] = ids.sessionID
	existing["thread_id"] = ids.threadID
	existing["turn_id"] = ids.turnID
	existing["x-codex-window-id"] = ids.windowID
	setOrDeleteMetadataString(existing, codexParentThreadIDHeader, ids.parentThreadID)
	setOrDeleteMetadataString(existing, "parent_turn_id", ids.parentTurnID)
	setOrDeleteMetadataString(existing, codexOpenAISubagentHeader, ids.subagentHeader)
	rewriteClientMetadataEmbeddedTurnMetadata(existing, codexFingerprintTurnMetadataFields(ids), ids)
}

func (ids *codexFingerprintIDs) enrichLineageFromClientMetadata(metadata map[string]any) {
	if ids == nil || ids.mode == codexFingerprintDevice || ids.connectionPinned {
		return
	}
	var lineage codexFingerprintLineage
	mergeCodexFingerprintLineageFromClientMetadata(&lineage, metadata)
	if !lineage.isChild() {
		return
	}
	threadBefore := ids.threadID
	ids.applyLineage(lineage)
	if ids.threadID != threadBefore {
		assignCodexFingerprintTurnWindow(ids, ids.accountID)
	}
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

// rewriteClientMetadataEmbeddedTurnMetadata 改写 client_metadata 中内嵌的
// x-codex-turn-metadata JSON 字符串里的指定字段。
func rewriteClientMetadataEmbeddedTurnMetadata(clientMetadata map[string]any, fields map[string]any, ids *codexFingerprintIDs) {
	raw, ok := clientMetadata["x-codex-turn-metadata"].(string)
	if !ok || raw == "" {
		return
	}
	var metadata map[string]any
	if err := json.Unmarshal([]byte(raw), &metadata); err != nil {
		return
	}
	for k, v := range fields {
		metadata[k] = v
	}
	sanitizeCodexTurnMetadata(metadata, ids)
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
