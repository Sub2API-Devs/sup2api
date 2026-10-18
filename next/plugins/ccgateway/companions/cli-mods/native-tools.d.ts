/** CCGateway's extension to the mods $.tool.register API. */
export interface NativeToolRegistration {
  kind: 'native';
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  isDeferred?: boolean;
}

export interface NativeToolAPI {
  /** Upsert a session tool by exact name. Execution belongs to tool.call mods. */
  register(definition: NativeToolRegistration): Promise<{ tool: string }>;
}
