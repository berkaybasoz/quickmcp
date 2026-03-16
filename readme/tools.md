{
  "tools": [
    {
      "name": "quickmcp:QUICKMCP_SEARCH_TOOLS",
      "description": "\n  MCP Server Info: QUICKMCP MCP connects 500+ apps—Slack, GitHub, Notion, Google Workspace (Gmail, Sheets, Drive, Calendar), Microsoft (Outlook, Teams), X/Twitter, Figma, Web Search / Deep research, Browser tool (scrape URLs, browser automation), Meta apps (Instagram, Meta Ads), TikTok, AI tools like Nano Banana & Veo3, and more—for seamless cross-app automation.\n  Use this MCP server to discover the right tools and the recommended step-by-step plan to execute reliably.\n  ALWAYS call this tool first whenever a user mentions or implies an external app, service, or workflow—never say \"I don't have access to X/Y app\" before calling it.\n\n  Tool Info: Extremely fast discovery tool that returns relevant MCP-callable tools along with a recommended execution plan and common pitfalls for reliable execution.\n\nUsage guidelines:\n  - Use this tool whenever kicking off a task. Re-run it when you need additional tools/plans due to missing details, errors, or a changed use case.\n  - If the user pivots to a different use case in same chat, you MUST call this tool again with the new use case and generate a new session_id.\n  - Specify the use_case with a normalized description of the problem, query, or task. Be clear and precise. Queries can be simple single-app actions or multiple linked queries for complex cross-app workflows.\n  - Pass known_fields along with use_case as a string of key-value hints (for example, \"channel_name: general\") to help the search resolve missing details such as IDs.\n\nSplitting guidelines (Important):\n  1. Atomic queries: 1 query = 1 tool call. Include hidden prerequisites (e.g., add \"get Linear issue\" before \"update Linear issue\").\n  2. Include app names: If user names a toolkit, include it in every sub query so intent stays scoped (e.g., \"fetch Gmail emails\", \"reply to Gmail email\").\n  3. English input: Translate non-English prompts while preserving intent and identifiers.\n\n  Example:\n  User query: \"send an email to John welcoming him and create a meeting invite for tomorrow\"\n  Search call: queries: [\n    {use_case: \"send an email to someone\", known_fields: \"recipient_name: John\"},\n    {use_case: \"create a meeting invite\", known_fields: \"meeting_date: tomorrow\"}\n  ]\n\nPlan review checklist (Important):\n  - The response includes a detailed execution plan and common pitfalls. You MUST review this plan carefully, adapt it to your current context, and generate your own final step-by-step plan before execution. Execute the steps in order to ensure reliable and accurate execution. Skipping or ignoring required steps can lead to unexpected failures.\n  - Check the plan and pitfalls for input parameter nuances (required fields, IDs, formats, limits). Before executing any tool, you MUST review its COMPLETE input schema and provide STRICTLY schema-compliant arguments to avoid invalid-input errors.\n  - Determine whether pagination is needed; if a response returns a pagination token and completeness is implied, paginate until exhaustion and do not return partial results.\n\nResponse:\n  - Tools & Input Schemas: The response lists toolkits (apps) and tools suitable for the task, along with their tool_slug, description, input schema / schemaRef, and related tools for prerequisites, alternatives, or next steps.\n    - NOTE: Tools with schemaRef instead of input_schema require you to call QUICKMCP_GET_TOOL_SCHEMAS first to load their full input_schema before use.\n  - Connection Info: If a toolkit has an active connection, the response includes it along with any available current user information. If no active connection exists, you MUST initiate a new connection via QUICKMCP_MANAGE_CONNECTIONS with the correct toolkit name. DO NOT execute any toolkit tool without an ACTIVE connection.\n  - Time Info: The response includes the current UTC time for reference. You can reference UTC time from the response if needed.\n  - The tools returned to you through this are to be called via QUICKMCP_MULTI_EXECUTE_TOOL. Ensure each tool execution specifies the correct tool_slug and arguments exactly as defined by the tool's input schema.\n    - The response includes a memory parameter containing relevant information about the use case and the known fields that can be used to determine the flow of execution. Any user preferences in memory must be adhered to.\n\nSESSION: ALWAYS set this parameter, first for any workflow. Pass session: {generate_id: true} for new workflows OR session: {id: \"EXISTING_ID\"} to continue. ALWAYS use the returned session_id in ALL subsequent meta tool calls.\n    ",
      "parameters": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "required": ["queries"],
        "type": "object",
        "properties": {
          "model": {
            "description": "Client LLM model name (recommended). Used to optimize planning/search behavior. Ignored if omitted or invalid.\nExamples:\n  \"gpt-5.2\"\n  \"claude-4.5-sonnet\"",
            "type": "string"
          },
          "queries": {
            "description": "List of structured search queries (in English) to process in parallel. Each query represents a specific use case or task. For multi-app or complex workflows, split them into smaller single-app, API-level actions for best accuracy, including implicit prerequisites (e.g., fetch the resource before updating it). Each query returns 5-10 tools.",
            "type": "array",
            "minItems": 1,
            "items": {
              "additionalProperties": false,
              "required": ["use_case"],
              "type": "object",
              "properties": {
                "use_case": {
                  "description": "Provide a normalized English description of the complete use case to enable precise planning. Focus on the specific action and intended outcome. Include any specific apps if mentioned by user in each use_case. Do NOT include personal identifiers (names, emails, IDs) here — put those in known_fields.\nExamples:\n  \"send an email to someone\"\n  \"search issues with label in jira toolkit\"\n  \"put issue details in a google sheet\"\n  \"post a formatted message to slack channel\"",
                  "type": "string"
                },
                "known_fields": {
                  "description": "Provide known workflow inputs as a single English string of comma-separated key:value pairs (not an array). Keep 1-2 short, structured items - stable identifiers, names, emails, or settings only. Omit if not relevant. No free-form or long text (messages, notes, descriptions).\nExamples:\n  \"channel_name:pod-sdk\"\n  \"channel_id:123\"\n  \"invitee_names:John,Maria, timezone:Asia/Kolkata\"",
                  "type": "string"
                }
              }
            }
          },
          "session": {
            "additionalProperties": false,
            "description": "Session context for correlating meta tool calls within a workflow. Always pass this parameter. Use {generate_id: true} for new workflows or {id: \"EXISTING_ID\"} to continue existing workflows.",
            "type": "object",
            "properties": {
              "generate_id": {
                "description": "Set to true for the first search call of a new usecase/workflow to generate a new session ID. When user pivots to a different task, set this true. If omitted or false with an existing session.id, the provided session ID will be reused.",
                "type": "boolean"
              },
              "id": {
                "description": "Existing session identifier for the current workflow to reuse across calls.",
                "type": "string"
              }
            }
          }
        }
      }
    },
    {
      "name": "quickmcp:QUICKMCP_GET_TOOL_SCHEMAS",
      "description": "Retrieve input schemas for tools by slug. Returns complete parameter definitions required to execute each tool. Make sure to call this tool whenever the response of QUICKMCP_SEARCH_TOOLS does not provide a complete schema for a tool - you must never invent or guess any input parameters.",
      "parameters": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "required": ["tool_slugs"],
        "type": "object",
        "properties": {
          "session_id": {
            "description": "ALWAYS pass the session_id that was provided in the SEARCH_TOOLS response.",
            "type": "string"
          },
          "tool_slugs": {
            "description": "List of tool slugs to retrieve schemas for. Each slug MUST be a valid tool slug previously returned by QUICKMCP_SEARCH_TOOLS.\nExamples:\n  [\"GMAIL_SEND_EMAIL\"]\n  [\"GMAIL_SEND_EMAIL\",\"SLACK_SEND_MESSAGE\"]",
            "type": "array",
            "items": {
              "type": "string",
              "minLength": 1
            }
          }
        }
      }
    },
    {
      "name": "quickmcp:QUICKMCP_MANAGE_CONNECTIONS",
      "description": "\nCreate or manage connections to user's apps. Returns a branded authentication link that works for OAuth, API keys, and all other auth types.\n\nCall policy:\n- First call QUICKMCP_SEARCH_TOOLS for the user's query.\n- If QUICKMCP_SEARCH_TOOLS indicates there is no active connection for a toolkit, call QUICKMCP_MANAGE_CONNECTIONS with the exact toolkit name(s) returned.\n- Do not call QUICKMCP_MANAGE_CONNECTIONS if QUICKMCP_SEARCH_TOOLS returns no main tools and no related tools.\n- Toolkit names in toolkits must exactly match toolkit identifiers returned by QUICKMCP_SEARCH_TOOLS; never invent names.\n- NEVER execute any toolkit tool without an ACTIVE connection.\n\nTool Behavior:\n- If a connection is Active, the tool returns the connection details. Always use this to verify connection status and fetch metadata.\n- If a connection is not Active, returns a authentication link (redirect_url) to create new connection.\n- If reinitiate_all is true, the tool forces reconnections for all toolkits, even if they already have active connections.\n\nWorkflow after initiating connection:\n- Always show the returned redirect_url as a FORMATTED MARKDOWN LINK to the user, and ask them to click on the link to finish authentication.\n- Begin executing tools only after the connection for that toolkit is confirmed Active.\n    ",
      "parameters": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "required": ["toolkits"],
        "type": "object",
        "properties": {
          "toolkits": {
            "description": "List of toolkits to check or connect. Should be a valid toolkit returned by SEARCH_TOOLS (never invent one). If a toolkit is not connected, will initiate connection. Example: ['gmail', 'exa', 'github', 'outlook', 'reddit', 'googlesheets', 'one_drive']",
            "type": "array",
            "items": { "type": "string" }
          },
          "reinitiate_all": {
            "default": false,
            "description": "Force reconnection for ALL toolkits in the toolkits list, even if they already have Active connections.\n              WHEN TO USE:\n              - You suspect existing connections are stale or broken.\n              - You want to refresh all connections with new credentials or settings.\n              - You're troubleshooting connection issues across multiple toolkits.\n              BEHAVIOR:\n              - Overrides any existing active connections for all specified toolkits and initiates new link-based authentication flows.\n              DEFAULT: false (preserve existing active connections)",
            "type": "boolean"
          },
          "session_id": {
            "description": "ALWAYS pass the session_id that was provided in the SEARCH_TOOLS response.",
            "type": "string"
          }
        }
      }
    },
    {
      "name": "quickmcp:QUICKMCP_MULTI_EXECUTE_TOOL",
      "description": "\n  Fast and parallel tool executor for apps and tools discovered through QUICKMCP_SEARCH_TOOLS. Use this tool to execute up to 50 tools in parallel across apps. Response contains structured outputs ready for immediate analysis - avoid reprocessing them via remote bash/workbench tools.\n\nPrerequisites:\n- Always use valid tool slugs and their arguments discovered through QUICKMCP_SEARCH_TOOLS. NEVER invent tool slugs or argument fields. ALWAYS pass STRICTLY schema-compliant arguments with each tool execution.\n- Ensure an ACTIVE connection exists for the toolkits that are going to be executed. If none exists, MUST initiate one via QUICKMCP_MANAGE_CONNECTIONS before execution.\n- Only batch tools that are logically independent - no required ordering or dependencies between tools or their outputs. DO NOT pass dummy or placeholder values; always resolve required inputs using appropriate tools first.\n\nUsage guidelines:\n- Use this whenever a tool is discovered and has to be called, either as part of a multi-step workflow or as a standalone tool.\n- If QUICKMCP_SEARCH_TOOLS returns a tool that can perform the task, prefer calling it via this executor. Do not write custom API calls or ad-hoc scripts for tasks that can be completed by available QuickMCP tools.\n- Prefer parallel execution: group independent tools into a single multi-execute call where possible.\n- Predictively set sync_response_to_workbench=true if the response may be large or needed for later scripting. It still shows response inline; if the actual response data turns out small and easy to handle, keep everything inline and SKIP workbench usage.\n- Responses contain structured outputs for each tool. RULE: Small data - process yourself inline; large data - process in the workbench.\n- ALWAYS include inline references/links to sources in MARKDOWN format directly next to the relevant text. Eg provide slack thread links alongside with summary, render document links instead of raw IDs.\n\nRestrictions: Some tools or toolkits may be disabled in this environment. If the response indicates a restriction, inform the user and STOP execution immediately. Do NOT attempt workarounds or speculative actions.\n\n- CRITICAL: You MUST always include the 'memory' parameter - never omit it. Even if you think there's nothing to remember, include an empty object {} for memory.\n\nMemory Storage:\n- CRITICAL FORMAT: Memory must be a dictionary where keys are app names (strings) and values are arrays of strings. NEVER pass nested objects or dictionaries as values.\n- CORRECT format: {\"slack\": [\"Channel general has ID C1234567\"], \"gmail\": [\"John's email is john@example.com\"]}\n- Write memory entries in natural, descriptive language - NOT as key-value pairs. Use full sentences that clearly describe the relationship or information.\n- ONLY store information that will be valuable for future tool executions - focus on persistent data that saves API calls.\n- STORE: ID mappings, entity relationships, configs, stable identifiers.\n- DO NOT STORE: Action descriptions, temporary status updates, logs, or \"sent/fetched\" confirmations.\n- Examples of GOOD memory (store these):\n  * \"The important channel in Slack has ID C1234567 and is called #general\"\n  * \"The team's main repository is owned by user 'teamlead' with ID 98765\"\n  * \"The user prefers markdown docs with professional writing, no emojis\" (user_preference)\n- Examples of BAD memory (DON'T store these):\n  * \"Successfully sent email to john@example.com with message hi\"\n  * \"Fetching emails from last day (Sep 6, 2025) for analysis\"\n- Do not repeat the memories stored or found previously.\n    ",
      "parameters": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "required": ["sync_response_to_workbench", "tools"],
        "type": "object",
        "properties": {
          "tools": {
            "description": "List of tools to execute in parallel.",
            "type": "array",
            "minItems": 1,
            "maxItems": 50,
            "items": {
              "additionalProperties": false,
              "description": "MultiExecuteToolItem",
              "required": ["tool_slug", "arguments"],
              "type": "object",
              "properties": {
                "tool_slug": {
                  "description": "The slug of the tool to execute - must be a valid slug from SEARCH_TOOLS response.\nExamples:\n  \"GMAIL_SEND_EMAIL\"\n  \"SLACK_SEND_MESSAGE\"\n  \"GITHUB_CREATE_ISSUE\"",
                  "type": "string",
                  "minLength": 1
                },
                "arguments": {
                  "additionalProperties": true,
                  "description": "The arguments to pass to the tool. The argument schema is defined in the SEARCH_TOOLS response. Use exact field names and types; do not diverge from returned schemas.\nExamples:\n  {\"body\":\"This is a test\",\"subject\":\"Hello\",\"to\":\"test@gmail.com\"}\n  {\"channel\":\"#general\",\"text\":\"Hello from QuickMCP!\"}\n  {\"body\":\"Description of the issue\",\"labels\":[\"bug\"],\"title\":\"Bug Report\"}",
                  "properties": {},
                  "type": "object"
                }
              }
            }
          },
          "sync_response_to_workbench": {
            "description": "Syncs the response to the remote workbench (for later scripting/processing) while still viewable inline. Predictively set true if the output may be large or need scripting; if it turns out small/manageable, skip workbench and use inline only. Default: false",
            "type": "boolean"
          },
          "memory": {
            "additionalProperties": {
              "type": "array",
              "items": {
                "description": "Natural language memory string - e.g., \"John's user ID in Slack is 12345\", \"Venky's project MyProject has ID proj_abc123\"",
                "type": "string"
              }
            },
            "description": "CRITICAL: Memory must be a dictionary with app names as keys and string arrays as values. NEVER use nested objects. Format: {\"app_name\": [\"string1\", \"string2\"]}. Store durable facts - stable IDs, mappings, roles, preferences. Exclude ephemeral data like message IDs or temp links. Use full sentences describing relationships. Always include this parameter.",
            "properties": {},
            "type": "object"
          },
          "session_id": {
            "description": "ALWAYS pass the session_id that was provided in the SEARCH_TOOLS response.",
            "type": "string"
          },
          "thought": {
            "description": "One-sentence, concise, high-level rationale (no step-by-step).",
            "type": "string"
          },
          "current_step": {
            "description": "Short enum for current step of the workflow execution. Eg FETCHING_EMAILS, GENERATING_REPLIES. Always include to keep execution aligned with the workflow.",
            "type": "string"
          },
          "current_step_metric": {
            "description": "Progress metrics for the current step - use to track how far execution has advanced. Format as a string \"done/total units\" - example \"10/100 emails\", \"0/n messages\", \"3/10 pages\".",
            "type": "string"
          }
        }
      }
    },
    {
      "name": "quickmcp:QUICKMCP_REMOTE_BASH_TOOL",
      "description": "\n  Execute bash commands in a REMOTE sandbox for file operations, data processing, and system tasks. Essential for handling large tool responses saved to remote files.\n  PRIMARY USE CASES:\n- Process large tool responses saved by QUICKMCP_MULTI_EXECUTE_TOOL to remote sandbox\n- File system operations, extract specific information from JSON with shell tools like jq, awk, sed, grep, etc.\n- Commands run from /home/user directory by default\n    ",
      "parameters": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "required": ["command"],
        "type": "object",
        "properties": {
          "command": {
            "description": "The bash command to execute",
            "type": "string"
          },
          "session_id": {
            "description": "ALWAYS pass the session_id that was provided in the SEARCH_TOOLS response.",
            "type": "string"
          }
        }
      }
    },
    {
      "name": "quickmcp:QUICKMCP_CREATE_UPDATE_TOOL",
      "description": "\nConvert executed workflow into a reusable notebook. Only use when workflow is complete or user explicitly requests.\n\n--- DESCRIPTION FORMAT (MARKDOWN) - MUST BE NEUTRAL ---\n\nDescription is for ANY user of this tool, not just the creator. Keep it generic.\n- NO PII (no real emails, names, channel names, repo names)\n- NO user-specific defaults (defaults go in defaults_for_required_parameters only)\n- Use placeholder examples only\n\nGenerate rich markdown with these sections:\n\n## Overview\n[2-3 sentences: what it does, what problem it solves]\n\n## How It Works\n[End-to-end flow in plain language]\n\n## Key Features\n- [Feature 1]\n- [Feature 2]\n\n## Step-by-Step Flow\n1. **[Step]**: [What happens]\n2. **[Step]**: [What happens]\n\n## Apps & Integrations\n| App | Purpose |\n|-----|---------|\n| [App] | [Usage] |\n\n## Inputs Required\n| Input | Description | Format |\n|-------|-------------|--------|\n| channel_name | Slack channel to post to | WITHOUT # prefix |\n\n(No default values here - just format guidance)\n\n## Output\n[What the tool produces]\n\n## Notes & Limitations\n- [Edge cases, rate limits, caveats]\n\n--- CODE STRUCTURE ---\n\nCode has 2 parts:\n1. DOCSTRING HEADER (comments) - context, learnings, version history\n2. EXECUTABLE CODE - clean Python that runs\n\nDOCSTRING HEADER (preserve all history when updating):\n\n\"\"\"\nTOOL: [Name]\nFLOW: [App1] -> [App2] -> [Output]\n\nVERSION HISTORY:\nv2 (current): [What changed] - [Why]\nv1: Initial version\n\nAPI LEARNINGS:\n- [API_NAME]: [Quirk, e.g., Response nested at data.data]\n\nKNOWN ISSUES:\n- [Issue and fix]\n\"\"\"\n\nThen EXECUTABLE CODE follows (keep code clean, learnings stay in docstring).\n\n--- INPUT SCHEMA (USER-FRIENDLY) ---\n\nAsk for: channel_name, repo_name, sheet_url, email_address\nNever ask for: channel_id, spreadsheet_id, user_id (resolve in code)\nNever ask for large inputs: use invoke_llm to generate content in code\n\nGOOD DESCRIPTIONS (explicit format, generic examples - no PII):\n  channel_name: Slack channel WITHOUT # prefix\n  repo_name: Repository name only, NOT owner/repo\n  google_sheet_url: Full URL from browser\n  gmail_label: Label as shown in Gmail sidebar\n\nREQUIRED vs OPTIONAL:\n- Required: things that change every run (channel name, date range, search terms)\n- Optional: generic settings with sensible defaults (sheet tab, row limits)\n\n--- DEFAULTS FOR REQUIRED PARAMETERS ---\n\n- Provide in defaults_for_required_parameters for all required inputs\n- Use values from workflow context\n- Use empty string if no value available - never hallucinate\n- Match types: string param needs string default, number needs number\n- Defaults are private to creator, not shared when tool is published\n- SCHEDULE-FRIENDLY DEFAULTS:\n- Use RELATIVE time references unless user asks otherwise, not absolute dates\n  correct: \"last_24_hours\", \"past_week\", \"7\" (days back)\n  wrong: \"2025-01-15\", \"December 18, 2025\"\n- Never include timezone as an input parameter unless specifically asked\n- Test: \"Will this default work if tool runs tomorrow?\"\n\n--- CODING RULES ---\n\nSINGLE EXECUTION: Generate complete notebook that runs in one invocation.\nCODE CORRECTNESS: Must be syntactically and semantically correct and executable.\nENVIRONMENT VARIABLES: All inputs via os.environ.get(). Code is shared - no PII.\nTIMEOUT: 4 min hard limit. Use ThreadPoolExecutor for bulk operations.\nSCHEMA SAFETY: Never assume API response schema. Use invoke_llm to parse unknown responses.\nNESTED DATA: APIs often double-nest. Always extract properly before using.\nID RESOLUTION: Convert names to IDs in code using FIND/SEARCH tools.\nFAIL LOUDLY: Raise Exception if expected data is empty. Never silently continue.\nCONTENT GENERATION: Never hardcode text. Use invoke_llm() for generated content.\nDEBUGGING: Timestamp all print statements.\nNO META LOOPS: Never call QUICKMCP_* or QUICKMCP_* meta tools via run_quickmcp_tool.\nOUTPUT: End with just output variable (no print).\n\n--- HELPERS ---\n\nAvailable in notebook (dont import). See QUICKMCP_REMOTE_WORKBENCH for details:\nrun_quickmcp_tool(slug, args) returns (result, error)\ninvoke_llm(prompt, reasoning_effort=\"low\") returns (response, error)\n  # reasoning_effort: \"low\" (bulk classification), \"medium\" (summarization), \"high\" (creative/complex content)\n  # Always specify based on task - use low by default, medium for analysis, high for creative generation\nproxy_execute(method, endpoint, toolkit, ...) returns (result, error)\nupload_local_file(*paths) returns (result, error)\n\n--- CHECKLIST ---\n\n- Description: Neutral, no PII, no defaults - for any user\n- Docstring header: Version history, API learnings (preserve on update)\n- Input schema: Human-friendly names, format guidance, no large inputs\n- Defaults: In defaults_for_required_parameters, type-matched, from context\n- Code: Single execution, os.environ.get(), no PII, fail loudly\n- Output: Ends with just output",
      "parameters": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "required": ["description", "input_schema", "name", "output_schema", "workflow_code"],
        "type": "object",
        "properties": {
          "defaults_for_required_parameters": {
            "additionalProperties": false,
            "description": "\nDefaults for required parameters of the notebook / tool. We store those PII related separately after encryption.\nPlease ensure that the parameters you provide match the input schema for the tool and all required inputs are covered. Fine to ignore optional parameters\nExample: {\"repo_owner\":\"quickmcphq\",\"repo_name\":\"quickmcp\",\"sheet_id\":\"1234567890\"}",
            "properties": {},
            "type": "object"
          },
          "description": {
            "description": "Description for the notebook / tool\nExamples:\n  \"Get contributors from Github repository and save to Google Sheet\"\n  \"Send weekly Gmail report to all users by sending email to each user\"\n  \"Analyze Slack messages from a particular channel and send summary to all users\"",
            "type": "string"
          },
          "input_schema": {
            "additionalProperties": false,
            "description": "Expected input json schema for the Notebook / Tool. Please keep the schema simple, avoid nested objects and arrays. Types of all input fields should be string only. Each key of this schema will be a single environment variable input to your Notebook\nExample: {\"properties\":{\"repo_owner\":{\"description\":\"GitHub repository owner username\",\"name\":\"repo_owner\",\"required\":true,\"type\":\"string\"},\"repo_name\":{\"description\":\"GitHub repository name\",\"name\":\"repo_name\",\"required\":true,\"type\":\"string\"},\"google_sheet_url\":{\"description\":\"Google Sheet URL (e.g., https://docs.google.com/spreadsheets/d/SHEET_ID/edit)\",\"name\":\"google_sheet_url\",\"required\":true,\"type\":\"string\"},\"sheet_tab\":{\"description\":\"Sheet tab name to write data to\",\"name\":\"sheet_tab\",\"required\":false,\"type\":\"string\"}},\"type\":\"object\"}",
            "properties": {},
            "type": "object"
          },
          "name": {
            "description": "Name for the notebook / tool. Please keep it short (ideally less than five words)\nExamples:\n  \"Get Github Contributors\"\n  \"Send Weekly Gmail Report\"\n  \"Analyze Slack Messages\"",
            "type": "string"
          },
          "output_schema": {
            "additionalProperties": true,
            "description": "Expected output json schema of the Notebook / Tool. If the schema has array, please ensure it has \"items\" in it, so we know what kind of array it is. If the schema has object, please ensure it has \"properties\" in it, so we know what kind of object it is\nExample: {\"properties\":{\"contributors_count\":{\"description\":\"Count of contributors to Github repository\",\"name\":\"contributors_count\",\"type\":\"number\"},\"sheet_id\":{\"description\":\"ID of the sheet\",\"name\":\"sheet_id\",\"type\":\"string\"},\"sheet_updated\":{\"description\":\"Is the sheet updated?\",\"name\":\"sheet_updated\",\"type\":\"boolean\"},\"contributor_profiles\":{\"name\":\"contributor_profiles\",\"type\":\"array\",\"items\":{\"type\":\"object\"},\"description\":\"Profiles of top 10 contributors\"}},\"type\":\"object\"}",
            "properties": {},
            "type": "object"
          },
          "tool_id": {
            "description": "Tool id to update (optional). If not provided, will create a new tool\nExample: \"tool_rBvLjfof_THF\"",
            "type": "string"
          },
          "workflow_code": {
            "description": "The Python code that implements the workflow, generated by the LLM based on the executed workflow. Should include all necessary imports, tool executions (via run_quickmcp_tool), and proper error handling. Notebook should always end with output cell (not print)",
            "type": "string"
          }
        }
      }
    },
    {
      "name": "quickmcp:QUICKMCP_FIND_TOOL",
      "description": "\nFind tools using natural language search. Use this tool when:\n- User refers to a tool by partial name, description, or keywords (e.g., \"run my GitHub PR tool\", \"the slack notification one\")\n- User wants to find a tool but doesn't know the exact name or ID\n- You need to find a tool_id before executing it with QUICKMCP_EXECUTE_TOOL\n\nThe tool uses semantic matching to find the most relevant tools based on the user's query.\n\nInput:\n- query (required): Natural language search query (e.g., \"GitHub PRs to Slack\", \"daily email summary\")\n- limit (optional, default: 5): Maximum number of tools to return (1-20)\n- include_details (optional, default: false): Include full details like description, toolkits, tools, and default params\n\nOutput:\n- successful: Whether the search completed successfully\n- tools: Array of matching tools sorted by relevance score, each containing:\n  - tool_id: Use this with QUICKMCP_EXECUTE_TOOL\n  - name: Tool name\n  - description: What the tool does\n  - relevance_score: 0-100 match score\n  - match_reason: Why this tool matched\n  - toolkits: Apps used (e.g., github, slack)\n  - tool_url: Link to view/edit\n  - default_params: Default input parameters\n- total_tools_searched: How many tools were searched\n- query_interpretation: How the search query was understood",
      "parameters": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "required": ["query"],
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "minLength": 1,
            "maxLength": 500,
            "description": "Natural language query to find tools"
          },
          "limit": {
            "type": "integer",
            "minimum": 1,
            "default": 5,
            "description": "Maximum number of tools to return"
          },
          "include_details": {
            "type": "boolean",
            "default": false,
            "description": "Include full details (description, toolkits, tools, default params)"
          }
        }
      }
    },
    {
      "name": "quickmcp:QUICKMCP_MANAGE_TOOL_SCHEDULE",
      "description": "\n  Manage scheduled recurring runs for tools. Each tool can have one schedule that runs indefinitely.\n  Only recurring schedules are supported. Schedules can be paused and resumed anytime.\n\n  Use this tool when user wants to:\n  - Schedule a tool to run periodically\n  - Pause or resume a tool schedule\n  - Update schedule timing or parameters\n  - Delete a tool schedule\n  - Check current schedule status\n    ",
      "parameters": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "required": ["vibeApiId"],
        "type": "object",
        "properties": {
          "vibeApiId": {
            "type": "string",
            "description": "Tool identifier, starts with \"tool_\". Example: \"tool_rBvLjfof_THF\""
          },
          "cron": {
            "type": "string",
            "description": "Cron expression. Examples: \"0 9 * * 1-5\" (weekdays 9am), \"0 0 * * *\" (daily midnight)"
          },
          "delete": {
            "type": "boolean",
            "default": false,
            "description": "Set true to delete schedule. Takes priority over other actions."
          },
          "params": {
            "type": "object",
            "additionalProperties": { "type": "string" },
            "description": "Parameters for scheduled runs (e.g., email, channel_name, repo). Overrides tool defaults."
          },
          "targetStatus": {
            "type": "string",
            "enum": ["no_update", "paused", "active"],
            "default": "no_update",
            "description": "Indicates the target state of the tool schedule. If not specified, use \"no_update\"."
          }
        }
      }
    }
  ],
  "resources": [],
  "prompts": []
}
