export const QUICKMCP_META_TOOL_NAMES = {
  SEARCH_TOOLS: 'quickmcp__QUICKMCP_SEARCH_TOOLS',
  GET_TOOL_SCHEMAS: 'quickmcp__QUICKMCP_GET_TOOL_SCHEMAS',
  GET_TOOL_DETAILS: 'quickmcp__QUICKMCP_GET_TOOL_DETAILS',
  MANAGE_CONNECTIONS: 'quickmcp__QUICKMCP_MANAGE_CONNECTIONS',
  EXECUTE_TOOL: 'quickmcp__QUICKMCP_EXECUTE_TOOL',
  MULTI_EXECUTE_TOOL: 'quickmcp__QUICKMCP_MULTI_EXECUTE_TOOL',
  FIND_TOOL: 'quickmcp__QUICKMCP_FIND_TOOL'
} as const;

export type QuickMcpMetaToolName = (typeof QUICKMCP_META_TOOL_NAMES)[keyof typeof QUICKMCP_META_TOOL_NAMES];

const OAUTH_SCHEME = [{ type: 'oauth2', scopes: ['mcp'] }];

const SEARCH_TOOLS_DESCRIPTION = `
  MCP Server Info: QUICKMCP MCP connects 500+ apps—Slack, GitHub, Notion, Google Workspace (Gmail, Sheets, Drive, Calendar), Microsoft (Outlook, Teams), X/Twitter, Figma, Web Search / Deep research, Browser tool (scrape URLs, browser automation), Meta apps (Instagram, Meta Ads), TikTok, AI tools like Nano Banana & Veo3, and more—for seamless cross-app automation.
  Use this MCP server to discover the right tools and the recommended step-by-step plan to execute reliably.
  ALWAYS call this tool first whenever a user mentions or implies an external app, service, or workflow—never say "I don't have access to X/Y app" before calling it.
  CRITICAL: When a user asks for data/actions from any external service (for example Trello, Notion, GitHub, Gmail, Slack), you MUST run QUICKMCP_SEARCH_TOOLS before any refusal, fallback, or non-tool answer.

  Tool Info: Extremely fast discovery tool that returns relevant MCP-callable tools along with a recommended execution plan and common pitfalls for reliable execution.

Usage guidelines:
  - Use this tool whenever kicking off a task. Re-run it when you need additional tools/plans due to missing details, errors, or a changed use case.
  - If the user pivots to a different use case in same chat, you MUST call this tool again with the new use case and generate a new session_id.
  - Specify the use_case with a normalized description of the problem, query, or task. Be clear and precise. Queries can be simple single-app actions or multiple linked queries for complex cross-app workflows.
  - Pass known_fields along with use_case as a string of key–value hints (for example, "channel_name: general") to help the search resolve missing details such as IDs.

Splitting guidelines (Important):
  1. Atomic queries: 1 query = 1 tool call. Include hidden prerequisites (e.g., add "get Linear issue" before "update Linear issue").
  2. Include app names: If user names a toolkit, include it in every sub query so intent stays scoped (e.g., "fetch Gmail emails", "reply to Gmail email").
  3. English input: Translate non-English prompts while preserving intent and identifiers.

  Example:
  User query: "send an email to John welcoming him and create a meeting invite for tomorrow"
  Search call: queries: [
    {use_case: "send an email to someone", known_fields: "recipient_name: John"},
    {use_case: "create a meeting invite", known_fields: "meeting_date: tomorrow"}
  ]

Plan review checklist (Important):
  - The response includes a detailed execution plan and common pitfalls. You MUST review this plan carefully, adapt it to your current context, and generate your own final step-by-step plan before execution. Execute the steps in order to ensure reliable and accurate execution. Skipping or ignoring required steps can lead to unexpected failures.
  - Check the plan and pitfalls for input parameter nuances (required fields, IDs, formats, limits). Before executing any tool, you MUST review its COMPLETE input schema and provide STRICTLY schema-compliant arguments to avoid invalid-input errors.
  - Determine whether pagination is needed; if a response returns a pagination token and completeness is implied, paginate until exhaustion and do not return partial results.

Response:
  - Tools & Input Schemas: The response lists toolkits (apps) and tools suitable for the task, along with their tool_slug, description, input schema / schemaRef, and related tools for prerequisites, alternatives, or next steps.
    - NOTE: Tools with schemaRef instead of input_schema require you to call QUICKMCP_GET_TOOL_SCHEMAS first to load their full input_schema before use.
  - Connection Info: If a toolkit has an active connection, the response includes it along with any available current user information. If no active connection exists, you MUST initiate a new connection via QUICKMCP_MANAGE_CONNECTIONS with the correct toolkit name. DO NOT execute any toolkit tool without an ACTIVE connection.
  - Time Info: The response includes the current UTC time for reference. You can reference UTC time from the response if needed.
  - The tools returned to you through this are to be called via QUICKMCP_MULTI_EXECUTE_TOOL. Ensure each tool execution specifies the correct tool_slug and arguments exactly as defined by the tool's input schema.
    - The response includes a memory parameter containing relevant information about the use case and the known fields that can be used to determine the flow of execution. Any user preferences in memory must be adhered to.

SESSION: ALWAYS set this parameter, first for any workflow. Pass session: {generate_id: true} for new workflows OR session: {id: "EXISTING_ID"} to continue. ALWAYS use the returned session_id in ALL subsequent meta tool calls.
`;

const GET_TOOL_SCHEMAS_DESCRIPTION = `
Retrieve input schemas for tools by slug. Returns complete parameter definitions required to execute each tool. Make sure to call this tool whenever the response of QUICKMCP_SEARCH_TOOLS does not provide a complete schema for a tool - you must never invent or guess any input parameters.
`;

const MANAGE_CONNECTIONS_DESCRIPTION = `
Create or manage connections to user's apps. Returns a branded authentication link that works for OAuth, API keys, and all other auth types.

Call policy:
- First call QUICKMCP_SEARCH_TOOLS for the user's query.
- If QUICKMCP_SEARCH_TOOLS indicates there is no active connection for a toolkit, call QUICKMCP_MANAGE_CONNECTIONS with the exact toolkit name(s) returned.
- Do not call QUICKMCP_MANAGE_CONNECTIONS if QUICKMCP_SEARCH_TOOLS returns no main tools and no related tools.
- Toolkit names in toolkits must exactly match toolkit identifiers returned by QUICKMCP_SEARCH_TOOLS; never invent names.
- NEVER execute any toolkit tool without an ACTIVE connection.

Tool Behavior:
- If a connection is Active, the tool returns the connection details. Always use this to verify connection status and fetch metadata.
- If a connection is not Active, returns a authentication link (redirect_url) to create new connection.
- If reinitiate_all is true, the tool forces reconnections for all toolkits, even if they already have active connections.

Workflow after initiating connection:
- Always show the returned redirect_url as a FORMATTED MARKDOWN LINK to the user, and ask them to click on the link to finish authentication.
- Begin executing tools only after the connection for that toolkit is confirmed Active.
`;

const GET_TOOL_DETAILS_DESCRIPTION = `
Get the details of the existing tool for a given tool id.
`;

const MULTI_EXECUTE_DESCRIPTION = `
  Fast and parallel tool executor for tools discovered through QUICKMCP_SEARCH_TOOLS. Use this tool to execute up to 50 tools in parallel across apps. Response contains structured outputs ready for immediate analysis - avoid reprocessing them via remote bash/workbench tools.

Prerequisites:
- Always use valid tool slugs and their arguments discovered through QUICKMCP_SEARCH_TOOLS. NEVER invent tool slugs or argument fields. ALWAYS pass STRICTLY schema-compliant arguments with each tool execution.
- Ensure an ACTIVE connection exists for the toolkits that are going to be executed. If none exists, MUST initiate one via QUICKMCP_MANAGE_CONNECTIONS before execution.
- Only batch tools that are logically independent - no required ordering or dependencies between tools or their outputs. DO NOT pass dummy or placeholder values; always resolve required inputs using appropriate tools first.

Usage guidelines:
- Use this whenever a tool is discovered and has to be called, either as part of a multi-step workflow or as a standalone tool.
- If QUICKMCP_SEARCH_TOOLS returns a tool that can perform the task, prefer calling it via this executor. Do not write custom API calls or ad-hoc scripts for tasks that can be completed by available QuickMCP tools.
- For single-step execution, prefer QUICKMCP_EXECUTE_TOOL. Use QUICKMCP_MULTI_EXECUTE_TOOL when running multiple independent tools in parallel.
- Prefer parallel execution: group independent tools into a single multi-execute call where possible.
- Predictively set sync_response_to_workbench=true if the response may be large or needed for later scripting. It still shows response inline; if the actual response data turns out small and easy to handle, keep everything inline and SKIP workbench usage.
- Responses contain structured outputs for each tool. RULE: Small data - process yourself inline; large data - process in the workbench.
- ALWAYS include inline references/links to sources in MARKDOWN format directly next to the relevant text. Eg provide slack thread links alongside with summary, render document links instead of raw IDs.

Restrictions: Some tools or toolkits may be disabled in this environment. If the response indicates a restriction, inform the user and STOP execution immediately. Do NOT attempt workarounds or speculative actions.


- CRITICAL: You MUST always include the 'memory' parameter - never omit it. Even if you think there's nothing to remember, include an empty object {} for memory.

Memory Storage:
- CRITICAL FORMAT: Memory must be a dictionary where keys are app names (strings) and values are arrays of strings. NEVER pass nested objects or dictionaries as values.
- CORRECT format: {"slack": ["Channel general has ID C1234567"], "gmail": ["John's email is john@example.com"]}
- Write memory entries in natural, descriptive language - NOT as key-value pairs. Use full sentences that clearly describe the relationship or information.
- ONLY store information that will be valuable for future tool executions - focus on persistent data that saves API calls.
- STORE: ID mappings, entity relationships, configs, stable identifiers.
- DO NOT STORE: Action descriptions, temporary status updates, logs, or "sent/fetched" confirmations.
- Examples of GOOD memory (store these):
  * "The important channel in Slack has ID C1234567 and is called #general"
  * "The team's main repository is owned by user 'teamlead' with ID 98765"
  * "The user prefers markdown docs with professional writing, no emojis" (user_preference)
- Examples of BAD memory (DON'T store these):
  * "Successfully sent email to john@example.com with message hi"
  * "Fetching emails from last day (Sep 6, 2025) for analysis"
- Do not repeat the memories stored or found previously.
`;

const EXECUTE_TOOL_DESCRIPTION = `
Single-tool executor for one discovered tool call.

When to use:
- You only need one tool execution now.
- You want deterministic sequential orchestration step-by-step.
- You do not need parallel batching.

Requirements:
- tool_slug must come from QUICKMCP_SEARCH_TOOLS / QUICKMCP_GET_TOOL_SCHEMAS.
- arguments must strictly match the selected tool schema.
- If toolkit connection is required, ensure it is active before call.
- For external-service user requests, do not skip discovery: run QUICKMCP_SEARCH_TOOLS first, then execute using the returned tool_slug.

Behavior:
- Executes exactly one tool and returns either { success: true, output } or { success: false, error }.
- Returns explicit errors for unknown/unauthorized tool_slug.
`;

const FIND_TOOL_DESCRIPTION = `
Find tools using natural language search. Use this tool when:
- User refers to a tool by partial name, description, or keywords (e.g., "run my GitHub PR tool", "the slack notification one")
- User wants to find a tool but doesn't know the exact name or ID
- You need to find a tool_id before executing it with QUICKMCP_EXECUTE_TOOL

The tool uses semantic matching to find the most relevant tools based on the user's query.

Input:
- query (required): Natural language search query (e.g., "GitHub PRs to Slack", "daily email summary")
- limit (optional, default: 5): Maximum number of tools to return (1-20)
- include_details (optional, default: false): Include full details like description, toolkits, tools, and default params

Output:
- successful: Whether the search completed successfully
- tools: Array of matching tools sorted by relevance score, each containing:
  - tool_id: Use this with QUICKMCP_EXECUTE_TOOL
  - name: Tool name
  - description: What the tool does
  - relevance_score: 0-100 match score
  - match_reason: Why this tool matched
  - toolkits: Apps used (e.g., github, slack)
  - tool_url: Link to view/edit
  - default_params: Default input parameters
- total_tools_searched: How many tools were searched
- query_interpretation: How the search query was understood
- error: Error message if search failed

Example flow:
User: "Run my tool that sends GitHub PRs to Slack"
1. Call QUICKMCP_FIND_TOOL with query: "GitHub PRs to Slack"
2. Get matching tool with tool_id
3. Call QUICKMCP_EXECUTE_TOOL with that tool_id
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
    name: QUICKMCP_META_TOOL_NAMES.GET_TOOL_DETAILS,
    description: GET_TOOL_DETAILS_DESCRIPTION,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['tool_id'],
      properties: {
        tool_id: { type: 'string', minLength: 1 }
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
    name: QUICKMCP_META_TOOL_NAMES.EXECUTE_TOOL,
    description: EXECUTE_TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['tool_slug'],
      properties: {
        tool_slug: { type: 'string', minLength: 1 },
        arguments: { type: 'object', properties: {}, additionalProperties: true },
        session_id: { type: 'string' },
        thought: { type: 'string' },
        current_step: { type: 'string' },
        current_step_metric: { type: 'string' }
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
