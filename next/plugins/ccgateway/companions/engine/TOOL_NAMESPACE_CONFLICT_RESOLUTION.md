# Tool Namespace Conflict Resolution

## Problem

When a client has an MCP server named `ccgateway` (or the configured `custom_tool_prefix`), and Worker attempts to map non-MCP tools to the upstream API using the format `mcp__ccgateway__<tool_name>`, a naming conflict occurs. This would cause tool identity collisions and prevent the request from being processed.

## Solution

The system now automatically detects and resolves namespace conflicts:

### 1. Conflict Detection

The engine checks if the client has an MCP server whose name matches the configured tool mapping prefix:

```go
func (r *Request) resolveToolNamespace() string {
    if r.MCP == nil || len(r.Tools) == 0 {
        return r.customToolServer()
    }

    base := r.customToolServer()
    if !r.MCP.hasServer(base) {
        return base
    }

    // Conflict detected - use fallback namespace
    return base + "-mapped"
}
```

### 2. Automatic Remapping

When a conflict is detected, the system automatically uses a fallback namespace:

- Default conflict: `ccgateway` → `ccgateway-mapped`
- Custom conflict: `mygateway` → `mygateway-mapped`

This means non-MCP tools are mapped as:
- `mcp__ccgateway-mapped__<tool_name>` instead of `mcp__ccgateway__<tool_name>`

### 3. Security-Sensitive Scenarios

For security-critical features, namespace conflicts are **rejected** rather than auto-resolved:

- **Safeguards**: When `safeguards` are present in the request plan
- **Server Search Tools**: When `ServerTools` (e.g., `tool_search_tool_regex`) are present
- **Deferred Client Tools**: When client tools use `defer_loading: true`

In these cases, the request is rejected with an error:
```
MCP server conflicts with the client tool transport namespace
```

This prevents potential security bypasses through namespace manipulation.

## Implementation Details

### Key Functions

- `resolveToolNamespace()`: Determines the appropriate namespace to use
- `effectiveToolServer()`: Returns the actual namespace being used
- `validateToolNamespace()`: Validates that the resolved namespace doesn't create conflicts
- `toolServer()`: Single source of truth for the mapping namespace

### Files Modified

- `tool_namespace.go`: New file containing conflict resolution logic
- `tool_names.go`: Updated `toolServer()` and history namespace functions
- `request.go`: Updated `wireName()` to use `toolServer()`
- `sdk_mcp.go`: Updated `sdkToolName()` to use `toolServer()`
- `mcp_search.go`: Updated `validateMCPNamespace()` to delegate to new validation
- `fallback_credit.go`: Updated config digest to use `toolServer()`

### Test Coverage

- `tool_namespace_test.go`: Comprehensive tests for conflict resolution
  - Basic namespace resolution
  - Conflict detection and fallback
  - Native and qualified MCP tool handling
  - Consistency across API surface

## Usage Examples

### Example 1: No Conflict

Client request with MCP server "filesystem":
```json
{
  "mcp_servers": [{"name": "filesystem", ...}],
  "tools": [{"name": "lookup", ...}]
}
```

Result: Tool mapped as `mcp__ccgateway__lookup` ✓

### Example 2: Conflict Resolved

Client request with MCP server "ccgateway":
```json
{
  "mcp_servers": [{"name": "ccgateway", ...}],
  "tools": [{"name": "lookup", ...}]
}
```

Result: Tool mapped as `mcp__ccgateway-mapped__lookup` ✓

### Example 3: Conflict with Safeguards

Client request with MCP server "ccgateway" and safeguards:
```json
{
  "mcp_servers": [{"name": "ccgateway", ...}],
  "tools": [{"name": "lookup", ...}],
  "plan": {"safeguards": [...]}
}
```

Result: Request rejected ✗

## Backward Compatibility

The change is backward compatible:

1. Requests without MCP servers behave identically
2. Requests with non-conflicting MCP servers behave identically
3. Only requests with namespace conflicts see different behavior:
   - Previously: Rejected
   - Now: Auto-resolved (except security-sensitive scenarios)

The history cache namespace incorporates the effective tool server, ensuring cache consistency.

## Future Considerations

If a client has both `ccgateway` and `ccgateway-mapped` as MCP server names, the request is rejected. While extremely unlikely, this edge case is handled gracefully.
