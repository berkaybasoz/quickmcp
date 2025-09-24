#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

const DATA = [
  {
    "headers": [
      "name",
      "age",
      "city",
      "salary"
    ],
    "rows": [
      [
        "John Doe",
        "30",
        "New York",
        "75000"
      ],
      [
        "Jane Smith",
        "25",
        "Los Angeles",
        "65000"
      ],
      [
        "Bob Johnson",
        "35",
        "Chicago",
        "80000"
      ],
      [
        "Alice Brown",
        "28",
        "Houston",
        "70000"
      ],
      [
        "Charlie Wilson",
        "32",
        "Phoenix",
        "72000"
      ]
    ],
    "metadata": {
      "rowCount": 5,
      "columnCount": 4,
      "dataTypes": {
        "name": "string",
        "age": "integer",
        "city": "string",
        "salary": "integer"
      }
    }
  }
];

class EmployeeDataErverServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'employee-data-server',
        version: '1.0.0',
        description: 'MCP server for employee data analysis and querying'
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_table_0',
          description: 'Search records in table_0',
          inputSchema: {
          "type": "object",
          "properties": {
                    "query": {
                              "type": "string",
                              "description": "Search query"
                    },
                    "limit": {
                              "type": "number",
                              "description": "Maximum number of results",
                              "default": 10
                    }
          },
          "required": [
                    "query"
          ]
}
        },
        {
          name: 'get_all_table_0',
          description: 'Get all records from table_0',
          inputSchema: {
          "type": "object",
          "properties": {
                    "limit": {
                              "type": "number",
                              "description": "Maximum number of results",
                              "default": 100
                    }
          }
}
        },
        {
          name: 'filter_table_0_by_name',
          description: 'Filter table_0 by name',
          inputSchema: {
          "type": "object",
          "properties": {
                    "value": {
                              "type": "string",
                              "description": "String value to search for"
                    },
                    "limit": {
                              "type": "number",
                              "description": "Maximum number of results",
                              "default": 50
                    }
          },
          "required": [
                    "value"
          ]
}
        },
        {
          name: 'filter_table_0_by_age',
          description: 'Filter table_0 by age',
          inputSchema: {
          "type": "object",
          "properties": {
                    "value": {
                              "type": "number",
                              "description": "Integer value to filter by"
                    },
                    "limit": {
                              "type": "number",
                              "description": "Maximum number of results",
                              "default": 50
                    }
          },
          "required": [
                    "value"
          ]
}
        },
        {
          name: 'filter_table_0_by_city',
          description: 'Filter table_0 by city',
          inputSchema: {
          "type": "object",
          "properties": {
                    "value": {
                              "type": "string",
                              "description": "String value to search for"
                    },
                    "limit": {
                              "type": "number",
                              "description": "Maximum number of results",
                              "default": 50
                    }
          },
          "required": [
                    "value"
          ]
}
        },
        {
          name: 'filter_table_0_by_salary',
          description: 'Filter table_0 by salary',
          inputSchema: {
          "type": "object",
          "properties": {
                    "value": {
                              "type": "number",
                              "description": "Integer value to filter by"
                    },
                    "limit": {
                              "type": "number",
                              "description": "Maximum number of results",
                              "default": 50
                    }
          },
          "required": [
                    "value"
          ]
}
        }
      ]
    }));

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'schema://table_0',
          name: 'table_0 Schema',
          description: 'Schema information for table_0', mimeType: 'application/json'
        },
        {
          uri: 'data://table_0/sample',
          name: 'table_0 Sample Data',
          description: 'Sample data from table_0', mimeType: 'application/json'
        }
      ]
    }));

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'analyze_table_0',
          description: 'Analyze data patterns in table_0',
          arguments: [
          {
                    "name": "focus",
                    "description": "What aspect to focus on",
                    "required": false
          }
]
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'search_table_0':
          return { content: [{ type: 'text', text: JSON.stringify(searchTable(0, args.query, args.limit || 10)) }] };
        case 'get_all_table_0':
          return { content: [{ type: 'text', text: JSON.stringify(getAllFromTable(0, args.limit || 100)) }] };
        case 'filter_table_0_by_name':
          return { content: [{ type: 'text', text: JSON.stringify(filterTableByColumn(0, 'name', args.value, args.limit || 50)) }] };
        case 'filter_table_0_by_age':
          return { content: [{ type: 'text', text: JSON.stringify(filterTableByColumn(0, 'age', args.value, args.limit || 50)) }] };
        case 'filter_table_0_by_city':
          return { content: [{ type: 'text', text: JSON.stringify(filterTableByColumn(0, 'city', args.value, args.limit || 50)) }] };
        case 'filter_table_0_by_salary':
          return { content: [{ type: 'text', text: JSON.stringify(filterTableByColumn(0, 'salary', args.value, args.limit || 50)) }] };
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'schema://table_0':
          return {
            contents: [{
              uri: 'schema://table_0',
              mimeType: 'application/json',
              text: JSON.stringify({
                headers: DATA[0].headers,
                metadata: DATA[0].metadata
              }, null, 2)
            }]
          };
        case 'data://table_0/sample':
          return {
            contents: [{
              uri: 'data://table_0/sample',
              mimeType: 'application/json',
              text: JSON.stringify(DATA[0].rows.slice(0, 10), null, 2)
            }]
          };
        default:
          throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${uri}`);
      }
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'analyze_table_0':
          return {
            description: 'Analyze data patterns in table_0',
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `Analyze the data in table_0. The table has 5 rows and 4 columns.
Columns: name, age, city, salary

{{args.focus ? `Focus on: ${args.focus}` : 'Provide a general analysis of the data patterns, distributions, and any interesting insights.'}}`
              }
            }]
          };
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown prompt: ${name}`);
      }
    });
  }


  private searchTable(tableIndex: number, query: string, limit: number) {
    const data = DATA[tableIndex];
    const results = data.rows.filter(row =>
      row.some(cell =>
        cell && cell.toString().toLowerCase().includes(query.toLowerCase())
      )
    ).slice(0, limit);

    return {
      headers: data.headers,
      rows: results,
      total: results.length
    };
  }

  private getAllFromTable(tableIndex: number, limit: number) {
    const data = DATA[tableIndex];
    return {
      headers: data.headers,
      rows: data.rows.slice(0, limit),
      total: Math.min(data.rows.length, limit)
    };
  }

  private filterTableByColumn(tableIndex: number, column: string, value: any, limit: number) {
    const data = DATA[tableIndex];
    const columnIndex = data.headers.indexOf(column);

    if (columnIndex === -1) {
      throw new Error(`Column '${column}' not found`);
    }

    const results = data.rows.filter(row => {
      const cellValue = row[columnIndex];
      if (typeof value === 'string') {
        return cellValue && cellValue.toString().toLowerCase().includes(value.toLowerCase());
      }
      return cellValue === value;
    }).slice(0, limit);

    return {
      headers: data.headers,
      rows: results,
      total: results.length
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('employee-data-server MCP server running on stdio');
  }
}

const server = new EmployeeDataErverServer();
server.run().catch(console.error);
