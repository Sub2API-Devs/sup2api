package anthropicoauth

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"io"
	"math/rand"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/streamjson"
)

const (
	claudeCLIVersion       = "2.1.220"
	fingerprintSalt        = "59cf53e54c78"
	contextManagementBeta  = "context-management-2025-06-27"
	maxSystemValueBytes    = 4 << 20
	maxMetadataValueBytes  = 256 << 10
	maxThinkingValueBytes  = 256 << 10
	claudeCodeSystemPrompt = "You are Claude Code, Anthropic's official CLI for Claude."
	defaultExpansionPrompt = `You are an interactive agent that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.

IMPORTANT: Assist with authorized security testing, defensive security, CTF challenges, and educational contexts. Refuse requests for destructive techniques, DoS attacks, mass targeting, supply chain compromise, or detection evasion for malicious purposes. Dual-use security tools (C2 frameworks, credential testing, exploit development) require clear authorization context: pentesting engagements, CTF competitions, security research, or defensive use cases.
IMPORTANT: You must NEVER generate or guess URLs for the user unless you are confident that the URLs are for helping the user with programming. You may use URLs provided by the user in their messages or local files.

# Tone and style
 - Only use emojis if the user explicitly requests it. Avoid using emojis in all communication unless asked.
 - Your responses should be short and concise.
 - When referencing specific functions or pieces of code include the pattern file_path:line_number to allow the user to easily navigate to the source code location.
 - When referencing GitHub issues or pull requests, use the owner/repo#123 format (e.g. anthropics/claude-code#100) so they render as clickable links.
 - Do not use a colon before tool calls. Your tool calls may not be shown directly in the output, so text like "Let me read the file:" followed by a read tool call should just be "Let me read the file." with a period.`
)

type mimicAnalysis struct {
	systemRaw       []byte
	metadataRaw     []byte
	metadataUserID  string
	firstUserText   string
	thinkingEnabled bool
	sawMessages     bool
	sawSystem       bool
	sawMetadata     bool
	sawTools        bool
	toolCount       int
	toolRewrite     map[string]string
	responseRewrite [][2]string
	messageRoles    []string
	messageBlocks   []int
}

var (
	claudeCLIUserAgent = regexp.MustCompile(`(?i)^claude-cli/\d+\.\d+\.\d+`)
	legacyMetadataID   = regexp.MustCompile(`^user_[a-fA-F0-9]{64}_account_[a-fA-F0-9-]*_session_[a-fA-F0-9-]{36}$`)
)

func (a *mimicAnalysis) isClaudeCodeRequest(userAgent string) bool {
	if hasBillingAttribution(a.systemRaw) {
		return true
	}
	if !claudeCLIUserAgent.MatchString(strings.TrimSpace(userAgent)) {
		return false
	}
	metadata := strings.TrimSpace(a.metadataUserID)
	if legacyMetadataID.MatchString(metadata) {
		return true
	}
	if !strings.HasPrefix(metadata, "{") {
		return false
	}
	var value struct {
		DeviceID  string `json:"device_id"`
		SessionID string `json:"session_id"`
	}
	return json.Unmarshal([]byte(metadata), &value) == nil && value.DeviceID != "" && value.SessionID != ""
}

func hasBillingAttribution(systemRaw []byte) bool {
	var blocks []struct {
		Text string `json:"text"`
	}
	if json.Unmarshal(systemRaw, &blocks) != nil {
		return false
	}
	for _, block := range blocks {
		if strings.HasPrefix(strings.TrimSpace(block.Text), "x-anthropic-billing-header") && strings.Contains(block.Text, "cc_entrypoint=") {
			return true
		}
	}
	return false
}

func prepareMimicBody(source io.ReadCloser, plan *controlv1.ExecutionPlan, state *requeststate.State) (io.ReadCloser, string, int64, error) {
	defer source.Close()
	temporary, err := os.CreateTemp("", "sup2api-anthropic-oauth-*.json")
	if err != nil {
		return nil, "", -1, fmt.Errorf("create protected Anthropic OAuth spool: %w", err)
	}
	name := temporary.Name()
	cleanup := func() {
		_ = temporary.Close()
		_ = os.Remove(name)
	}
	if err := temporary.Chmod(0o600); err != nil {
		cleanup()
		return nil, "", -1, fmt.Errorf("protect Anthropic OAuth spool: %w", err)
	}
	if _, err := io.Copy(temporary, source); err != nil {
		cleanup()
		return nil, "", -1, fmt.Errorf("spool Anthropic OAuth body: %w", err)
	}
	if _, err := temporary.Seek(0, io.SeekStart); err != nil {
		cleanup()
		return nil, "", -1, err
	}
	analysis, err := analyzeMimicBody(temporary)
	if err != nil {
		cleanup()
		return nil, "", -1, err
	}
	if _, err := temporary.Seek(0, io.SeekStart); err != nil {
		cleanup()
		return nil, "", -1, err
	}
	if analysis.isClaudeCodeRequest(plan.GetProtocolOptions()["original_user_agent"]) {
		info, err := temporary.Stat()
		if err != nil {
			cleanup()
			return nil, "", -1, err
		}
		return &removeOnCloseFile{File: temporary, name: name}, "claude_code_passthrough", info.Size(), nil
	}
	reader, writer := io.Pipe()
	options := make(map[string]string, len(plan.GetProtocolOptions()))
	for key, value := range plan.GetProtocolOptions() {
		options[key] = value
	}
	go func() {
		err := transformMimicBody(writer, temporary, options, state, analysis)
		cleanup()
		_ = writer.CloseWithError(err)
	}()
	return reader, "mimic", -1, nil
}

type removeOnCloseFile struct {
	*os.File
	name string
}

func (f *removeOnCloseFile) Close() error {
	err := f.File.Close()
	removeErr := os.Remove(f.name)
	if err != nil {
		return err
	}
	return removeErr
}

func analyzeMimicBody(input io.Reader) (*mimicAnalysis, error) {
	cursor := streamjson.NewCursor(input)
	if err := cursor.Expect('{'); err != nil {
		return nil, fmt.Errorf("Anthropic OAuth body must be a JSON object: %w", err)
	}
	analysis := new(mimicAnalysis)
	next, err := cursor.Next()
	if err != nil {
		return nil, err
	}
	if next == '}' {
		return nil, fmt.Errorf("Anthropic OAuth body is empty")
	}
	if err := cursor.Unread(); err != nil {
		return nil, err
	}
	for {
		key, err := cursor.ReadString()
		if err != nil {
			return nil, err
		}
		if err := cursor.Expect(':'); err != nil {
			return nil, err
		}
		switch key {
		case "system":
			analysis.sawSystem = true
			analysis.systemRaw, err = cursor.ReadRawValue(maxSystemValueBytes)
		case "metadata":
			analysis.sawMetadata = true
			analysis.metadataRaw, err = cursor.ReadRawValue(maxMetadataValueBytes)
			if err == nil {
				var metadata struct {
					UserID string `json:"user_id"`
				}
				if json.Unmarshal(analysis.metadataRaw, &metadata) == nil {
					analysis.metadataUserID = strings.TrimSpace(metadata.UserID)
				}
			}
		case "thinking":
			var raw []byte
			raw, err = cursor.ReadRawValue(maxThinkingValueBytes)
			if err == nil {
				var thinking struct {
					Type string `json:"type"`
				}
				if json.Unmarshal(raw, &thinking) == nil {
					analysis.thinkingEnabled = thinking.Type == "enabled" || thinking.Type == "adaptive"
				}
			}
		case "messages":
			analysis.sawMessages = true
			analysis.firstUserText, analysis.messageRoles, analysis.messageBlocks, err = scanFirstUserText(cursor)
		case "tools":
			analysis.sawTools = true
			var names []string
			names, analysis.toolCount, err = scanTools(cursor)
			if err == nil {
				analysis.toolRewrite, analysis.responseRewrite = buildToolRewrite(names)
			}
		default:
			err = cursor.SkipValue()
		}
		if err != nil {
			return nil, fmt.Errorf("analyze Anthropic OAuth field %q: %w", key, err)
		}
		more, err := cursor.Delimiter('}')
		if err != nil {
			return nil, err
		}
		if !more {
			break
		}
	}
	if err := cursor.EnsureEOF(); err != nil {
		return nil, err
	}
	if !analysis.sawMessages {
		return nil, fmt.Errorf("Anthropic OAuth body is missing messages")
	}
	return analysis, nil
}

func scanTools(cursor *streamjson.Cursor) ([]string, int, error) {
	if err := cursor.Expect('['); err != nil {
		return nil, 0, fmt.Errorf("tools must be an array: %w", err)
	}
	next, err := cursor.Next()
	if err != nil {
		return nil, 0, err
	}
	if next == ']' {
		return nil, 0, nil
	}
	if err := cursor.Unread(); err != nil {
		return nil, 0, err
	}
	var names []string
	count := 0
	for {
		name, toolType, err := scanTool(cursor)
		if err != nil {
			return nil, 0, err
		}
		count++
		if name != "" && (toolType == "" || toolType == "function" || toolType == "custom") {
			names = append(names, name)
		}
		more, err := cursor.Delimiter(']')
		if err != nil {
			return nil, 0, err
		}
		if !more {
			return names, count, nil
		}
	}
}

func scanTool(cursor *streamjson.Cursor) (name, toolType string, err error) {
	if err := cursor.Expect('{'); err != nil {
		return "", "", fmt.Errorf("tool must be an object: %w", err)
	}
	next, err := cursor.Next()
	if err != nil {
		return "", "", err
	}
	if next == '}' {
		return "", "", nil
	}
	if err := cursor.Unread(); err != nil {
		return "", "", err
	}
	for {
		key, readErr := cursor.ReadString()
		if readErr != nil {
			return "", "", readErr
		}
		if readErr = cursor.Expect(':'); readErr != nil {
			return "", "", readErr
		}
		switch key {
		case "name":
			name, readErr = cursor.ReadStringPrefix(4096)
		case "type":
			toolType, readErr = cursor.ReadStringPrefix(512)
		default:
			readErr = cursor.SkipValue()
		}
		if readErr != nil {
			return "", "", readErr
		}
		more, readErr := cursor.Delimiter('}')
		if readErr != nil {
			return "", "", readErr
		}
		if !more {
			return strings.TrimSpace(name), strings.TrimSpace(toolType), nil
		}
	}
}

var staticToolNames = map[string]string{"sessions_": "cc_sess_", "session_": "cc_ses_"}

var dynamicToolPrefixes = []string{
	"analyze_", "compute_", "fetch_", "generate_", "lookup_", "modify_",
	"process_", "query_", "render_", "resolve_", "sync_", "update_",
	"validate_", "convert_", "extract_", "manage_", "monitor_", "parse_",
	"review_", "search_", "transform_", "handle_", "invoke_", "notify_",
}

func buildToolRewrite(names []string) (map[string]string, [][2]string) {
	var dynamic map[string]string
	if len(names) > 5 {
		hash := fnv.New64a()
		for index, name := range names {
			if index > 0 {
				_, _ = hash.Write([]byte{0})
			}
			_, _ = hash.Write([]byte(name))
		}
		rng := rand.New(rand.NewSource(int64(hash.Sum64())))
		prefixes := append([]string(nil), dynamicToolPrefixes...)
		rng.Shuffle(len(prefixes), func(i, j int) { prefixes[i], prefixes[j] = prefixes[j], prefixes[i] })
		dynamic = make(map[string]string, len(names))
		for index, name := range names {
			head := name
			if len(head) > 3 {
				head = head[:3]
			}
			dynamic[name] = fmt.Sprintf("%s%s%02d", prefixes[index%len(prefixes)], head, index)
		}
	}
	forward := make(map[string]string)
	for _, name := range names {
		alias := name
		if dynamic != nil {
			alias = dynamic[name]
		} else {
			for prefix, replacement := range staticToolNames {
				if strings.HasPrefix(name, prefix) {
					alias = replacement + name[len(prefix):]
					break
				}
			}
		}
		if alias != name {
			forward[name] = alias
		}
	}
	reverse := make([][2]string, 0, len(forward)+len(staticToolNames))
	for real, alias := range forward {
		reverse = append(reverse, [2]string{alias, real})
	}
	for real, alias := range staticToolNames {
		reverse = append(reverse, [2]string{alias, real})
	}
	sort.SliceStable(reverse, func(i, j int) bool { return len(reverse[i][0]) > len(reverse[j][0]) })
	return forward, reverse
}

func scanFirstUserText(cursor *streamjson.Cursor) (string, []string, []int, error) {
	if err := cursor.Expect('['); err != nil {
		return "", nil, nil, fmt.Errorf("messages must be an array: %w", err)
	}
	next, err := cursor.Next()
	if err != nil {
		return "", nil, nil, err
	}
	if next == ']' {
		return "", nil, nil, nil
	}
	if err := cursor.Unread(); err != nil {
		return "", nil, nil, err
	}
	firstText := ""
	var roles []string
	var blocks []int
	for {
		candidate, role, blockCount, err := scanMessage(cursor, firstText == "")
		if err != nil {
			return "", nil, nil, err
		}
		roles = append(roles, role)
		blocks = append(blocks, blockCount)
		if firstText == "" && role == "user" {
			firstText = candidate
		}
		more, err := cursor.Delimiter(']')
		if err != nil {
			return "", nil, nil, err
		}
		if !more {
			return firstText, roles, blocks, nil
		}
	}
}

func scanMessage(cursor *streamjson.Cursor, capture bool) (candidate, role string, contentBlocks int, err error) {
	if err = cursor.Expect('{'); err != nil {
		return "", "", 0, fmt.Errorf("message must be an object: %w", err)
	}
	next, err := cursor.Next()
	if err != nil {
		return "", "", 0, err
	}
	if next == '}' {
		return "", "", 0, nil
	}
	if err := cursor.Unread(); err != nil {
		return "", "", 0, err
	}
	for {
		key, readErr := cursor.ReadString()
		if readErr != nil {
			return "", "", 0, readErr
		}
		if readErr = cursor.Expect(':'); readErr != nil {
			return "", "", 0, readErr
		}
		switch key {
		case "role":
			role, readErr = cursor.ReadStringPrefix(512)
		case "content":
			if capture {
				candidate, contentBlocks, readErr = scanContentText(cursor)
			} else {
				_, contentBlocks, readErr = scanContentText(cursor)
			}
		default:
			readErr = cursor.SkipValue()
		}
		if readErr != nil {
			return "", "", 0, readErr
		}
		more, readErr := cursor.Delimiter('}')
		if readErr != nil {
			return "", "", 0, readErr
		}
		if !more {
			return candidate, strings.TrimSpace(role), contentBlocks, nil
		}
	}
}

func scanContentText(cursor *streamjson.Cursor) (string, int, error) {
	next, err := cursor.Next()
	if err != nil {
		return "", 0, err
	}
	switch next {
	case '"':
		if err := cursor.Unread(); err != nil {
			return "", 0, err
		}
		value, err := cursor.ReadStringPrefix(4096)
		return value, 1, err
	case '[':
		return scanContentBlocks(cursor)
	default:
		if err := cursor.Unread(); err != nil {
			return "", 0, err
		}
		return "", 0, cursor.SkipValue()
	}
}

func scanContentBlocks(cursor *streamjson.Cursor) (string, int, error) {
	next, err := cursor.Next()
	if err != nil {
		return "", 0, err
	}
	if next == ']' {
		return "", 0, nil
	}
	if err := cursor.Unread(); err != nil {
		return "", 0, err
	}
	first := ""
	count := 0
	for {
		blockText, blockType, err := scanContentBlock(cursor, first == "")
		if err != nil {
			return "", 0, err
		}
		count++
		if first == "" && blockType == "text" {
			first = blockText
		}
		more, err := cursor.Delimiter(']')
		if err != nil {
			return "", 0, err
		}
		if !more {
			return first, count, nil
		}
	}
}

func scanContentBlock(cursor *streamjson.Cursor, capture bool) (text, blockType string, err error) {
	next, err := cursor.Next()
	if err != nil {
		return "", "", err
	}
	if next != '{' {
		if err := cursor.Unread(); err != nil {
			return "", "", err
		}
		return "", "", cursor.SkipValue()
	}
	next, err = cursor.Next()
	if err != nil {
		return "", "", err
	}
	if next == '}' {
		return "", "", nil
	}
	if err := cursor.Unread(); err != nil {
		return "", "", err
	}
	for {
		key, readErr := cursor.ReadString()
		if readErr != nil {
			return "", "", readErr
		}
		if readErr = cursor.Expect(':'); readErr != nil {
			return "", "", readErr
		}
		switch key {
		case "type":
			blockType, readErr = cursor.ReadStringPrefix(512)
		case "text":
			if capture {
				text, readErr = cursor.ReadStringPrefix(4096)
			} else {
				readErr = cursor.SkipValue()
			}
		default:
			readErr = cursor.SkipValue()
		}
		if readErr != nil {
			return "", "", readErr
		}
		more, readErr := cursor.Delimiter('}')
		if readErr != nil {
			return "", "", readErr
		}
		if !more {
			return text, strings.TrimSpace(blockType), nil
		}
	}
}

func transformMimicBody(output io.Writer, input io.Reader, options map[string]string, state *requeststate.State, analysis *mimicAnalysis) error {
	systemEnabled := options["system_prompt_enabled"] != "false"
	finalBeta := strings.TrimSpace(options["anthropic_beta"])
	keepContextManagement := tokenListContains(finalBeta, contextManagementBeta)
	metadataPassthrough := options["metadata_passthrough"] == "true"
	normalizeDateline := options["normalize_dateline"] != "false"
	rewriteMessageCache := options["rewrite_message_cache"] == "true"
	cacheTTL := "5m"
	if options["cache_ttl_1h"] == "true" {
		cacheTTL = "1h"
	}
	if state != nil {
		state.SetResponseRewrites(analysis.responseRewrite)
	}

	systemRaw, injectedMessages, err := buildMimicSystem(analysis, options, systemEnabled, normalizeDateline, cacheTTL)
	if err != nil {
		return err
	}
	metadataRaw, err := buildMimicMetadata(analysis, options, state, metadataPassthrough)
	if err != nil {
		return err
	}

	cursor := streamjson.NewCursor(input)
	if err := cursor.Expect('{'); err != nil {
		return err
	}
	if _, err := io.WriteString(output, "{"); err != nil {
		return err
	}
	firstOutput := true
	seen := make(map[string]bool, 8)
	writeKey := func(key string) error {
		if !firstOutput {
			if _, err := io.WriteString(output, ","); err != nil {
				return err
			}
		}
		firstOutput = false
		encoded, _ := json.Marshal(key)
		_, err := output.Write(append(encoded, ':'))
		return err
	}

	next, err := cursor.Next()
	if err != nil {
		return err
	}
	if next != '}' {
		if err := cursor.Unread(); err != nil {
			return err
		}
		for {
			key, err := cursor.ReadString()
			if err != nil {
				return err
			}
			if err := cursor.Expect(':'); err != nil {
				return err
			}
			seen[key] = true
			switch key {
			case "system":
				if err := cursor.SkipValue(); err != nil {
					return err
				}
			case "messages":
				if err := writeKey(key); err != nil {
					return err
				}
				if err := writeMessages(output, cursor, injectedMessages, analysis, normalizeDateline, cacheTTL, rewriteMessageCache); err != nil {
					return err
				}
			case "tools":
				if err := writeKey(key); err != nil {
					return err
				}
				if err := writeTools(output, cursor, analysis, cacheTTL); err != nil {
					return err
				}
			case "tool_choice":
				if !analysis.sawTools || analysis.toolCount == 0 {
					if err := cursor.SkipValue(); err != nil {
						return err
					}
					break
				}
				if err := writeKey(key); err != nil {
					return err
				}
				if err := writeJSONObjectNames(output, cursor, analysis.toolRewrite, false, false, false, cacheTTL); err != nil {
					return err
				}
			case "cache_control":
				if err := writeKey(key); err != nil {
					return err
				}
				if err := writeCacheControl(output, cursor, cacheTTL, options["cache_ttl_1h"] == "true"); err != nil {
					return err
				}
			case "metadata":
				if err := cursor.SkipValue(); err != nil {
					return err
				}
				if len(metadataRaw) > 0 {
					if err := writeKey(key); err != nil {
						return err
					}
					if _, err := output.Write(metadataRaw); err != nil {
						return err
					}
				}
			case "context_management":
				if keepContextManagement {
					if err := writeKey(key); err != nil {
						return err
					}
					if err := cursor.CopyValue(output); err != nil {
						return err
					}
				} else if err := cursor.SkipValue(); err != nil {
					return err
				}
			default:
				if err := writeKey(key); err != nil {
					return err
				}
				if err := cursor.CopyValue(output); err != nil {
					return err
				}
			}
			more, err := cursor.Delimiter('}')
			if err != nil {
				return err
			}
			if !more {
				break
			}
		}
	}
	appendRaw := func(key string, raw []byte) error {
		if err := writeKey(key); err != nil {
			return err
		}
		_, err := output.Write(raw)
		return err
	}
	if err := appendRaw("system", systemRaw); err != nil {
		return err
	}
	if !seen["metadata"] && len(metadataRaw) > 0 {
		if err := appendRaw("metadata", metadataRaw); err != nil {
			return err
		}
	}
	if !seen["tools"] {
		if err := appendRaw("tools", []byte("[]")); err != nil {
			return err
		}
	}
	if !seen["temperature"] {
		if err := appendRaw("temperature", []byte("1")); err != nil {
			return err
		}
	}
	if !seen["max_tokens"] {
		if err := appendRaw("max_tokens", []byte("128000")); err != nil {
			return err
		}
	}
	if !seen["context_management"] && analysis.thinkingEnabled && keepContextManagement {
		if err := appendRaw("context_management", []byte(`{"edits":[{"type":"clear_thinking_20251015","keep":"all"}]}`)); err != nil {
			return err
		}
	}
	if _, err := io.WriteString(output, "}"); err != nil {
		return err
	}
	return cursor.EnsureEOF()
}

func writeMessages(output io.Writer, cursor *streamjson.Cursor, injected [][]byte, analysis *mimicAnalysis, normalizeDateline bool, cacheTTL string, rewriteCache bool) error {
	if err := cursor.Expect('['); err != nil {
		return err
	}
	if _, err := io.WriteString(output, "["); err != nil {
		return err
	}
	wrote := false
	cacheTargets := messageCacheTargets(injected, analysis.messageRoles, rewriteCache)
	for index, message := range injected {
		if wrote {
			if _, err := io.WriteString(output, ","); err != nil {
				return err
			}
		}
		wrote = true
		message, err := rewriteInjectedMessageCache(message, rewriteCache, cacheTargets[index], cacheTTL)
		if err != nil {
			return err
		}
		if _, err := output.Write(message); err != nil {
			return err
		}
	}
	next, err := cursor.Next()
	if err != nil {
		return err
	}
	if next != ']' {
		if err := cursor.Unread(); err != nil {
			return err
		}
		originalIndex := 0
		for {
			if wrote {
				if _, err := io.WriteString(output, ","); err != nil {
					return err
				}
			}
			wrote = true
			lastBlock := 0
			if originalIndex < len(analysis.messageBlocks) {
				lastBlock = analysis.messageBlocks[originalIndex] - 1
			}
			if err := writeMessage(output, cursor, analysis.toolRewrite, normalizeDateline, cacheTTL, rewriteCache, cacheTargets[len(injected)+originalIndex], lastBlock); err != nil {
				return err
			}
			originalIndex++
			more, err := cursor.Delimiter(']')
			if err != nil {
				return err
			}
			if !more {
				break
			}
		}
	}
	_, err = io.WriteString(output, "]")
	return err
}

func messageCacheTargets(injected [][]byte, originalRoles []string, enabled bool) map[int]bool {
	targets := make(map[int]bool)
	if !enabled {
		return targets
	}
	roles := make([]string, 0, len(injected)+len(originalRoles))
	for index := range injected {
		if index%2 == 0 {
			roles = append(roles, "user")
		} else {
			roles = append(roles, "assistant")
		}
	}
	roles = append(roles, originalRoles...)
	if len(roles) == 0 {
		return targets
	}
	targets[len(roles)-1] = true
	if len(roles) >= 4 {
		users := 0
		for index := len(roles) - 1; index >= 0; index-- {
			if roles[index] != "user" {
				continue
			}
			users++
			if users == 2 {
				targets[index] = true
				break
			}
		}
	}
	return targets
}

func rewriteInjectedMessageCache(raw []byte, strip, add bool, cacheTTL string) ([]byte, error) {
	if !strip {
		return raw, nil
	}
	var message map[string]any
	if err := json.Unmarshal(raw, &message); err != nil {
		return nil, err
	}
	content, _ := message["content"].([]any)
	for _, value := range content {
		if block, ok := value.(map[string]any); ok {
			delete(block, "cache_control")
		}
	}
	if add && len(content) > 0 {
		if block, ok := content[len(content)-1].(map[string]any); ok {
			block["cache_control"] = map[string]string{"type": "ephemeral", "ttl": cacheTTL}
		}
	}
	return json.Marshal(message)
}

func writeMessage(output io.Writer, cursor *streamjson.Cursor, toolRewrite map[string]string, normalizeDateline bool, cacheTTL string, rewriteCache, addCache bool, lastContentBlock int) error {
	if err := cursor.Expect('{'); err != nil {
		return fmt.Errorf("message must be an object: %w", err)
	}
	if _, err := io.WriteString(output, "{"); err != nil {
		return err
	}
	first := true
	next, err := cursor.Next()
	if err != nil {
		return err
	}
	if next == '}' {
		_, err = io.WriteString(output, "}")
		return err
	}
	if err := cursor.Unread(); err != nil {
		return err
	}
	for {
		key, err := cursor.ReadString()
		if err != nil {
			return err
		}
		if err := cursor.Expect(':'); err != nil {
			return err
		}
		if !first {
			if _, err := io.WriteString(output, ","); err != nil {
				return err
			}
		}
		first = false
		keyRaw, _ := json.Marshal(key)
		if _, err := output.Write(append(keyRaw, ':')); err != nil {
			return err
		}
		if key == "content" {
			if err := writeMessageContent(output, cursor, toolRewrite, normalizeDateline, cacheTTL, rewriteCache, addCache, lastContentBlock); err != nil {
				return err
			}
		} else if err := cursor.CopyValue(output); err != nil {
			return err
		}
		more, err := cursor.Delimiter('}')
		if err != nil {
			return err
		}
		if !more {
			break
		}
	}
	_, err = io.WriteString(output, "}")
	return err
}

func writeMessageContent(output io.Writer, cursor *streamjson.Cursor, toolRewrite map[string]string, normalizeDateline bool, cacheTTL string, rewriteCache, addCache bool, lastContentBlock int) error {
	next, err := cursor.Next()
	if err != nil {
		return err
	}
	if next != '[' {
		if err := cursor.Unread(); err != nil {
			return err
		}
		if next == '"' && rewriteCache && addCache {
			raw, err := cursor.ReadRawValue(4 << 20)
			if err != nil {
				return err
			}
			var text string
			if err := json.Unmarshal(raw, &text); err != nil {
				return err
			}
			if normalizeDateline {
				text = normalizeReminderDatelines(text)
			}
			return writeJSON(output, []map[string]any{{"type": "text", "text": text, "cache_control": map[string]string{"type": "ephemeral", "ttl": cacheTTL}}})
		}
		if normalizeDateline && next == '"' {
			return writeNormalizedDatelineString(output, cursor, true)
		}
		return cursor.CopyValue(output)
	}
	if _, err := io.WriteString(output, "["); err != nil {
		return err
	}
	next, err = cursor.Next()
	if err != nil {
		return err
	}
	if next != ']' {
		if err := cursor.Unread(); err != nil {
			return err
		}
		first := true
		blockIndex := 0
		for {
			if !first {
				if _, err := io.WriteString(output, ","); err != nil {
					return err
				}
			}
			first = false
			next, err := cursor.Next()
			if err != nil {
				return err
			}
			if err := cursor.Unread(); err != nil {
				return err
			}
			if next == '{' {
				err = writeJSONObjectNames(output, cursor, toolRewrite, rewriteCache && addCache && blockIndex == lastContentBlock, normalizeDateline, rewriteCache, cacheTTL)
			} else {
				err = cursor.CopyValue(output)
			}
			if err != nil {
				return err
			}
			blockIndex++
			more, err := cursor.Delimiter(']')
			if err != nil {
				return err
			}
			if !more {
				break
			}
		}
	}
	_, err = io.WriteString(output, "]")
	return err
}

func writeTools(output io.Writer, cursor *streamjson.Cursor, analysis *mimicAnalysis, cacheTTL string) error {
	if err := cursor.Expect('['); err != nil {
		return err
	}
	if _, err := io.WriteString(output, "["); err != nil {
		return err
	}
	next, err := cursor.Next()
	if err != nil {
		return err
	}
	if next != ']' {
		if err := cursor.Unread(); err != nil {
			return err
		}
		index := 0
		for {
			if index > 0 {
				if _, err := io.WriteString(output, ","); err != nil {
					return err
				}
			}
			if err := writeJSONObjectNames(output, cursor, analysis.toolRewrite, index == analysis.toolCount-1, false, false, cacheTTL); err != nil {
				return err
			}
			index++
			more, err := cursor.Delimiter(']')
			if err != nil {
				return err
			}
			if !more {
				break
			}
		}
	}
	_, err = io.WriteString(output, "]")
	return err
}

func writeJSONObjectNames(output io.Writer, cursor *streamjson.Cursor, rewrites map[string]string, addCacheControl, normalizeDateline, stripCacheControl bool, cacheTTL string) error {
	if err := cursor.Expect('{'); err != nil {
		return err
	}
	if _, err := io.WriteString(output, "{"); err != nil {
		return err
	}
	first := true
	sawCacheControl := false
	next, err := cursor.Next()
	if err != nil {
		return err
	}
	if next != '}' {
		if err := cursor.Unread(); err != nil {
			return err
		}
		for {
			key, err := cursor.ReadString()
			if err != nil {
				return err
			}
			if err := cursor.Expect(':'); err != nil {
				return err
			}
			writeField := !(key == "cache_control" && stripCacheControl)
			if writeField {
				if !first {
					if _, err := io.WriteString(output, ","); err != nil {
						return err
					}
				}
				first = false
				keyRaw, _ := json.Marshal(key)
				if _, err := output.Write(append(keyRaw, ':')); err != nil {
					return err
				}
			}
			if key == "cache_control" {
				sawCacheControl = !stripCacheControl
			}
			if !writeField {
				if err := cursor.SkipValue(); err != nil {
					return err
				}
			} else if key == "name" && len(rewrites) > 0 {
				name, err := cursor.ReadStringPrefix(4096)
				if err != nil {
					return err
				}
				if alias := rewrites[name]; alias != "" {
					name = alias
				}
				encoded, _ := json.Marshal(name)
				if _, err := output.Write(encoded); err != nil {
					return err
				}
			} else if key == "cache_control" {
				if err := writeCacheControl(output, cursor, cacheTTL, cacheTTL == "1h"); err != nil {
					return err
				}
			} else if key == "text" && normalizeDateline {
				if err := writeNormalizedDatelineString(output, cursor, true); err != nil {
					return err
				}
			} else if err := cursor.CopyValue(output); err != nil {
				return err
			}
			more, err := cursor.Delimiter('}')
			if err != nil {
				return err
			}
			if !more {
				break
			}
		}
	}
	if addCacheControl && !sawCacheControl {
		if !first {
			if _, err := io.WriteString(output, ","); err != nil {
				return err
			}
		}
		if _, err := io.WriteString(output, `"cache_control":{"type":"ephemeral","ttl":`+strconv.Quote(cacheTTL)+`}`); err != nil {
			return err
		}
	}
	_, err = io.WriteString(output, "}")
	return err
}

func buildMimicSystem(analysis *mimicAnalysis, options map[string]string, enabled, normalizeDateline bool, cacheTTL string) ([]byte, [][]byte, error) {
	if !enabled {
		if len(analysis.systemRaw) > 0 {
			return analysis.systemRaw, nil, nil
		}
		return []byte("[]"), nil, nil
	}
	originalText, originalCache := extractSystemText(analysis.systemRaw, normalizeDateline)
	fingerprint := claudeFingerprint(analysis.firstUserText)
	billing := "x-anthropic-billing-header: cc_version=" + claudeCLIVersion + "." + fingerprint + "; cc_entrypoint=cli;"
	expansion := strings.TrimSpace(options["system_prompt"])
	if expansion == "" {
		expansion = defaultExpansionPrompt
	}
	blocks, err := buildConfiguredSystemBlocks(options["system_prompt_blocks"], billing, expansion, fingerprint, cacheTTL)
	if err != nil {
		return nil, nil, err
	}
	systemRaw, err := json.Marshal(blocks)
	if err != nil {
		return nil, nil, err
	}
	if originalText == "" || strings.TrimSpace(originalText) == claudeCodeSystemPrompt || strings.HasPrefix(strings.TrimSpace(originalText), "You are Claude Code") {
		return systemRaw, nil, nil
	}
	instruction := map[string]any{"type": "text", "text": "[System Instructions]\n" + originalText}
	if originalCache != nil {
		if cacheTTL == "1h" {
			forceCacheTTL(originalCache, cacheTTL)
		}
		instruction["cache_control"] = originalCache
	}
	user, err := json.Marshal(map[string]any{"role": "user", "content": []any{instruction}})
	if err != nil {
		return nil, nil, err
	}
	ack, err := json.Marshal(map[string]any{"role": "assistant", "content": []map[string]string{{"type": "text", "text": "Understood. I will follow these instructions."}}})
	if err != nil {
		return nil, nil, err
	}
	return systemRaw, [][]byte{user, ack}, nil
}

type systemBlockConfig struct {
	Enabled      *bool           `json:"enabled,omitempty"`
	Type         string          `json:"type,omitempty"`
	Text         string          `json:"text,omitempty"`
	CacheControl json.RawMessage `json:"cache_control,omitempty"`
}

func buildConfiguredSystemBlocks(raw, billing, expansion, fingerprint, cacheTTL string) ([]map[string]any, error) {
	configs := []systemBlockConfig(nil)
	raw = strings.TrimSpace(raw)
	if raw != "" {
		if strings.HasPrefix(raw, "[") {
			if err := json.Unmarshal([]byte(raw), &configs); err != nil {
				return nil, fmt.Errorf("decode Anthropic OAuth system blocks: %w", err)
			}
		} else {
			var envelope struct {
				Blocks []systemBlockConfig `json:"blocks"`
			}
			if err := json.Unmarshal([]byte(raw), &envelope); err != nil {
				return nil, fmt.Errorf("decode Anthropic OAuth system block envelope: %w", err)
			}
			configs = envelope.Blocks
		}
	}
	if len(configs) == 0 {
		configs = []systemBlockConfig{
			{Type: "text", Text: "{billing_header}"},
			{Type: "text", Text: "{claude_code_system_prompt}"},
			{Type: "text", Text: "{claude_code_expansion_prompt}", CacheControl: json.RawMessage(`{"type":"ephemeral","ttl":"5m"}`)},
		}
	}
	replacer := strings.NewReplacer(
		"{billing_header}", billing,
		"{cc_version}", claudeCLIVersion,
		"{fp}", fingerprint,
		"{claude_code_system_prompt}", claudeCodeSystemPrompt,
		"{claude_code_expansion_prompt}", expansion,
	)
	blocks := make([]map[string]any, 0, len(configs))
	for index, config := range configs {
		if config.Enabled != nil && !*config.Enabled {
			continue
		}
		blockType := strings.TrimSpace(config.Type)
		if blockType == "" {
			blockType = "text"
		}
		if blockType != "text" {
			return nil, fmt.Errorf("Anthropic OAuth system block %d has unsupported type %q", index, blockType)
		}
		text := replacer.Replace(config.Text)
		if strings.TrimSpace(text) == "" {
			continue
		}
		block := map[string]any{"type": "text", "text": text}
		cache, err := decodeSystemCacheControl(config.CacheControl, cacheTTL)
		if err != nil {
			return nil, fmt.Errorf("Anthropic OAuth system block %d cache_control: %w", index, err)
		}
		if cache != nil {
			block["cache_control"] = cache
		}
		blocks = append(blocks, block)
	}
	return blocks, nil
}

func decodeSystemCacheControl(raw json.RawMessage, cacheTTL string) (any, error) {
	trimmed := strings.TrimSpace(string(raw))
	switch trimmed {
	case "", "null", "false":
		return nil, nil
	case "true":
		return map[string]string{"type": "ephemeral", "ttl": cacheTTL}, nil
	}
	var value map[string]any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, err
	}
	if cacheTTL == "1h" {
		forceCacheTTL(value, cacheTTL)
	}
	return value, nil
}

func writeCacheControl(output io.Writer, cursor *streamjson.Cursor, cacheTTL string, force bool) error {
	if !force {
		return cursor.CopyValue(output)
	}
	raw, err := cursor.ReadRawValue(64 << 10)
	if err != nil {
		return err
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return err
	}
	forceCacheTTL(value, cacheTTL)
	encoded, err := json.Marshal(value)
	if err != nil {
		return err
	}
	_, err = output.Write(encoded)
	return err
}

func forceCacheTTL(value any, ttl string) {
	object, ok := value.(map[string]any)
	if !ok || object["type"] != "ephemeral" {
		return
	}
	object["ttl"] = ttl
}

func extractSystemText(raw []byte, normalizeDateline bool) (string, any) {
	if len(raw) == 0 {
		return "", nil
	}
	var direct string
	if json.Unmarshal(raw, &direct) == nil {
		direct = sanitizeSystemText(direct)
		if normalizeDateline {
			direct = normalizeDatelineText(direct)
		}
		return direct, nil
	}
	var blocks []struct {
		Text         string          `json:"text"`
		CacheControl json.RawMessage `json:"cache_control"`
	}
	if json.Unmarshal(raw, &blocks) != nil {
		return "", nil
	}
	parts := make([]string, 0, len(blocks))
	var cache any
	for _, block := range blocks {
		text := sanitizeSystemText(block.Text)
		if normalizeDateline {
			text = normalizeDatelineText(text)
		}
		if text = strings.TrimSpace(text); text != "" {
			parts = append(parts, text)
		}
		if len(block.CacheControl) > 0 && string(block.CacheControl) != "null" {
			var parsed any
			if json.Unmarshal(block.CacheControl, &parsed) == nil {
				cache = parsed
			}
		}
	}
	return strings.Join(parts, "\n\n"), cache
}

func sanitizeSystemText(text string) string {
	return strings.ReplaceAll(text, "You are OpenCode, the best coding agent on the planet.", claudeCodeSystemPrompt)
}

var (
	datelineHyphen = regexp.MustCompile(`Today(['’ʼʹ])s date is (\d{4})-(\d{2})-(\d{2})\.`)
	datelineSlash  = regexp.MustCompile(`Today(['’ʼʹ])s date is (\d{4})/(\d{2})/(\d{2})\.`)
	systemReminder = regexp.MustCompile(`(?s)<system-reminder>.*?</system-reminder>`)
)

func normalizeDatelineText(text string) string {
	rewrite := func(re *regexp.Regexp, value string) string {
		return re.ReplaceAllString(value, "Today's date is $2-$3-$4.")
	}
	return rewrite(datelineSlash, rewrite(datelineHyphen, text))
}

func normalizeReminderDatelines(text string) string {
	return systemReminder.ReplaceAllStringFunc(text, normalizeDatelineText)
}

func writeNormalizedDatelineString(output io.Writer, cursor *streamjson.Cursor, reminderOnly bool) error {
	raw, err := cursor.ReadRawValue(4 << 20)
	if err != nil {
		return fmt.Errorf("normalize Anthropic dateline text: %w", err)
	}
	var text string
	if err := json.Unmarshal(raw, &text); err != nil {
		return err
	}
	if reminderOnly {
		text = normalizeReminderDatelines(text)
	} else {
		text = normalizeDatelineText(text)
	}
	encoded, err := json.Marshal(text)
	if err != nil {
		return err
	}
	_, err = output.Write(encoded)
	return err
}

func writeJSON(output io.Writer, value any) error {
	encoded, err := json.Marshal(value)
	if err != nil {
		return err
	}
	_, err = output.Write(encoded)
	return err
}

func buildMimicMetadata(analysis *mimicAnalysis, options map[string]string, state *requeststate.State, passthrough bool) ([]byte, error) {
	if passthrough {
		if len(analysis.metadataRaw) > 0 {
			return analysis.metadataRaw, nil
		}
		return nil, nil
	}
	if analysis.metadataUserID != "" {
		return analysis.metadataRaw, nil
	}
	accountID := strings.TrimSpace(options["account_id"])
	deviceID := strings.TrimSpace(options["claude_user_id"])
	if deviceID == "" {
		sum := sha256.Sum256([]byte("sup2api:anthropic-oauth:" + accountID))
		deviceID = hex.EncodeToString(sum[:])
	}
	discriminator := ""
	if state != nil {
		discriminator = state.ClientIP
		if state.Auth != nil {
			discriminator += ":" + strconv.FormatInt(state.Auth.APIKeyID, 10)
		}
	}
	sessionID := deterministicUUID(accountID + "::" + discriminator + "::" + analysis.firstUserText)
	inner, err := json.Marshal(map[string]string{
		"device_id": deviceID, "account_uuid": strings.TrimSpace(options["account_uuid"]), "session_id": sessionID,
	})
	if err != nil {
		return nil, err
	}
	return json.Marshal(map[string]string{"user_id": string(inner)})
}

func claudeFingerprint(firstText string) string {
	indices := []int{4, 7, 20}
	chars := make([]byte, 0, len(indices))
	for _, index := range indices {
		if index < len(firstText) {
			chars = append(chars, firstText[index])
		} else {
			chars = append(chars, '0')
		}
	}
	sum := sha256.Sum256([]byte(fingerprintSalt + string(chars) + claudeCLIVersion))
	return hex.EncodeToString(sum[:])[:3]
}

func deterministicUUID(seed string) string {
	sum := sha256.Sum256([]byte(seed))
	value := append([]byte(nil), sum[:16]...)
	value[6] = (value[6] & 0x0f) | 0x40
	value[8] = (value[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", value[0:4], value[4:6], value[6:8], value[8:10], value[10:16])
}

func tokenListContains(list, token string) bool {
	for _, candidate := range strings.Split(list, ",") {
		if strings.TrimSpace(candidate) == token {
			return true
		}
	}
	return false
}
