export const QUICKMCP_META_TOOL_NAMES = {
  SEARCH_TOOLS: 'quickmcp:QUICKMCP_SEARCH_TOOLS',
  GET_TOOL_SCHEMAS: 'quickmcp:QUICKMCP_GET_TOOL_SCHEMAS',
  MANAGE_CONNECTIONS: 'quickmcp:QUICKMCP_MANAGE_CONNECTIONS',
  MULTI_EXECUTE_TOOL: 'quickmcp:QUICKMCP_MULTI_EXECUTE_TOOL',
  FIND_TOOL: 'quickmcp:QUICKMCP_FIND_TOOL'
} as const;

export type QuickMcpMetaToolName = (typeof QUICKMCP_META_TOOL_NAMES)[keyof typeof QUICKMCP_META_TOOL_NAMES];

const OAUTH_SCHEME = [{ type: 'oauth2', scopes: ['mcp'] }];

const SEARCH_TOOLS_DESCRIPTION = `
MCP Server Info: QuickMCP MCP helps discover and run tools across connected apps from a single endpoint.
Use this tool first whenever a user asks for cross-app actions, automation, or workflow steps.

Usage guidelines:
- Always call this tool at workflow start.
- Re-run when user intent changes or current tools are insufficient.
- Keep each query atomic. For complex workflows split into multiple queries.
- Put identifiers and known hints into known_fields as concise key:value pairs.

Plan review checklist:
- Read returned plan/pitfalls before execution.
- Validate required arguments against returned schemas.
- If pagination is required, continue until completion instead of returning partial data.

Response:
- Returns candidate tools, schema snippets or schema references, and a workflow session id.
- Use QUICKMCP_GET_TOOL_SCHEMAS for complete schemas when needed.
- Use QUICKMCP_MULTI_EXECUTE_TOOL to run selected tools.
`;

const GET_TOOL_SCHEMAS_DESCRIPTION = `
Retrieve full input schemas for tool slugs returned by QUICKMCP_SEARCH_TOOLS.
Never guess parameters. Always use exact field names/types from returned schema before execution.
Pass session_id when available to keep context consistent across calls.
`;

const MANAGE_CONNECTIONS_DESCRIPTION = `
Create/manage app connections required by tools.

Call policy:
- First call QUICKMCP_SEARCH_TOOLS.
- If a toolkit has no active connection, call this tool with that exact toolkit name.
- Do not invent toolkit names.
- Do not execute toolkit tools before connection is active.

Behavior:
- Returns active status when already connected.
- Returns authentication/next-step instructions when connection is missing.
- reinitiate_all=true forces reconnection for all listed toolkits.
`;

const MULTI_EXECUTE_DESCRIPTION = `
Parallel executor for discovered tools (up to 50 per request).

Prerequisites:
- Use only tool_slug values from QUICKMCP_SEARCH_TOOLS / QUICKMCP_GET_TOOL_SCHEMAS.
- Arguments must be strictly schema-compliant.
- Ensure required toolkit connections are active before execution.

Execution rules:
- Batch only independent operations in one call.
- Include memory on every call ({} allowed).
- Use sync_response_to_workbench=true when output is expected to be large.
- Stop and surface restriction errors directly if toolkit/tool is blocked.
`;

const FIND_TOOL_DESCRIPTION = `
Natural-language search for previously discovered/known tools.
Use when user refers to a tool by partial name, purpose, or keywords and exact id is unknown.
Returns ranked matches with relevance metadata and optional details.
`;

export const QUICKMCP_META_TOOLS: any[] = [
  {
    name: QUICKMCP_META_TOOL_NAMES.SEARCH_TOOLS,
    description: SEARCH_TOOLS_DESCRIPTION,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['queries'],
      properties: {
        model: {
          type: 'string',
          description: 'Client model name (optional). Example: "gpt-5.2", "claude-4.5-sonnet".'
        },
        queries: {
          type: 'array',
          minItems: 1,
          description: 'List of normalized English use cases. Split complex workflows into atomic queries.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['use_case'],
            properties: {
              use_case: { type: 'string' },
              known_fields: { type: 'string' }
            }
          }
        },
        session: {
          type: 'object',
          additionalProperties: false,
          properties: {
            generate_id: { type: 'boolean' },
            id: { type: 'string' }
          }
        }
      }
    },
    securitySchemes: OAUTH_SCHEME,
    _meta: { securitySchemes: OAUTH_SCHEME }
  },
  {
    name: QUICKMCP_META_TOOL_NAMES.GET_TOOL_SCHEMAS,
    description: GET_TOOL_SCHEMAS_DESCRIPTION,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['tool_slugs'],
      properties: {
        session_id: { type: 'string' },
        tool_slugs: {
          type: 'array',
          minItems: 1,
          items: { type: 'string', minLength: 1 }
        }
      }
    },
    securitySchemes: OAUTH_SCHEME,
    _meta: { securitySchemes: OAUTH_SCHEME }
  },
  {
    name: QUICKMCP_META_TOOL_NAMES.MANAGE_CONNECTIONS,
    description: MANAGE_CONNECTIONS_DESCRIPTION,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['toolkits'],
      properties: {
        toolkits: { type: 'array', items: { type: 'string' } },
        reinitiate_all: { type: 'boolean', default: false },
        session_id: { type: 'string' }
      }
    },
    securitySchemes: OAUTH_SCHEME,
    _meta: { securitySchemes: OAUTH_SCHEME }
  },
  {
    name: QUICKMCP_META_TOOL_NAMES.MULTI_EXECUTE_TOOL,
    description: MULTI_EXECUTE_DESCRIPTION,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['sync_response_to_workbench', 'tools'],
      properties: {
        sync_response_to_workbench: { type: 'boolean' },
        session_id: { type: 'string' },
        thought: { type: 'string' },
        current_step: { type: 'string' },
        current_step_metric: { type: 'string' },
        memory: {
          type: 'object',
          properties: {},
          additionalProperties: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        tools: {
          type: 'array',
          minItems: 1,
          maxItems: 50,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['tool_slug', 'arguments'],
            properties: {
              tool_slug: { type: 'string', minLength: 1 },
              arguments: { type: 'object', properties: {}, additionalProperties: true }
            }
          }
        }
      }
    },
    securitySchemes: OAUTH_SCHEME,
    _meta: { securitySchemes: OAUTH_SCHEME }
  },
  {
    name: QUICKMCP_META_TOOL_NAMES.FIND_TOOL,
    description: FIND_TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['query'],
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 500 },
        limit: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
        include_details: { type: 'boolean', default: false }
      }
    },
    securitySchemes: OAUTH_SCHEME,
    _meta: { securitySchemes: OAUTH_SCHEME }
  }
];

export function isQuickMcpMetaToolName(name: string): name is QuickMcpMetaToolName {
  return Object.values(QUICKMCP_META_TOOL_NAMES).includes(name as QuickMcpMetaToolName);
}
