# MCP Server Generator

A comprehensive application that automatically generates Model Context Protocol (MCP) servers from various data sources including databases, Excel files, and CSV files. It also provides a testing interface to validate the generated MCP servers.

## Features

### 🔧 **Multi-Source Data Parsing**
- **CSV Files**: Parse and analyze CSV data with automatic type inference
- **Excel Files**: Support for multiple sheets and complex Excel structures
- **Databases**: Connect to MySQL, PostgreSQL, and SQLite databases
- **JSON Data**: Direct JSON data processing

### 🚀 **Automatic MCP Server Generation**
- **Tools Generation**: Automatically create search, filter, and data access tools
- **Resources**: Generate schema and sample data resources
- **Prompts**: Create analysis and data exploration prompts
- **Standards Compliant**: Full MCP 2024-11-05 specification compliance

### 🧪 **Comprehensive Testing**
- **Auto Test Suites**: Automatically generated test cases for all server capabilities
- **Custom Testing**: Manual testing interface for specific scenarios
- **Real-time Results**: Live test execution with detailed feedback
- **MCP Client**: Built-in MCP client for server communication

### 🌐 **Web Interface**
- **Intuitive UI**: User-friendly web interface for all operations
- **Drag & Drop**: Easy file upload with visual feedback
- **Real-time Preview**: Live data preview during parsing
- **Server Management**: Complete lifecycle management of generated servers

### 📊 **Server Management**
- **Build & Deploy**: Automatic TypeScript compilation and deployment
- **Process Management**: Start, stop, and restart servers
- **Export**: Package servers for distribution
- **Monitoring**: Real-time server status and health monitoring

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mcp-server-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the application**
   ```bash
   npm run build
   ```

4. **Start the application**
   ```bash
   npm start
   ```

   Or run in development mode:
   ```bash
   npm run dev
   ```

5. **Access the web interface**
   Open your browser and go to `http://localhost:3000`

## Usage

### 1. **Generate an MCP Server**

1. **Select Data Source**
   - Choose between CSV, Excel, or Database
   - Upload files or configure database connection

2. **Parse Data**
   - Click "Parse Data Source" to analyze your data
   - Review the data preview and inferred types

3. **Configure Server**
   - Provide server name and description
   - Customize generated tools, resources, and prompts (optional)

4. **Generate**
   - Click "Generate MCP Server" to create your server

### 2. **Test Your Server**

1. **Auto Testing**
   - Select a generated server
   - Click "Run Auto Tests" for comprehensive testing

2. **Custom Testing**
   - Use the custom test interface
   - Test specific tools, resources, or prompts
   - Provide custom parameters in JSON format

### 3. **Manage Servers**

- **View Details**: Examine server configuration and capabilities
- **Start/Stop**: Control server lifecycle
- **Export**: Package servers for deployment
- **Delete**: Remove servers and clean up resources

## Data Source Support

### CSV Files
- Automatic delimiter detection
- Type inference for columns
- Header row detection
- Large file support

### Excel Files
- Multiple sheet support
- Cell type preservation
- Formula evaluation
- Rich formatting handling

### Databases

#### MySQL
```json
{
  "type": "mysql",
  "host": "localhost",
  "port": 3306,
  "database": "mydb",
  "username": "user",
  "password": "password"
}
```

#### PostgreSQL
```json
{
  "type": "postgresql",
  "host": "localhost",
  "port": 5432,
  "database": "mydb",
  "username": "user",
  "password": "password"
}
```

#### SQLite
```json
{
  "type": "sqlite",
  "database": "/path/to/database.db"
}
```

## Generated MCP Servers

Each generated server includes:

### **Tools**
- `search_table_N`: Full-text search across all columns
- `get_all_table_N`: Retrieve all records with pagination
- `filter_table_N_by_COLUMN`: Filter by specific column values

### **Resources**
- `schema://table_N`: Table schema and metadata
- `data://table_N/sample`: Sample data preview

### **Prompts**
- `analyze_table_N`: Data analysis and insights
- Custom prompts based on data characteristics

## API Endpoints

### Data Processing
- `POST /api/parse` - Parse data source
- `POST /api/generate` - Generate MCP server

### Server Management
- `GET /api/servers` - List all servers
- `GET /api/servers/:id` - Get server details
- `POST /api/servers/:id/test` - Test server
- `DELETE /api/servers/:id` - Delete server
- `GET /api/servers/:id/export` - Export server

## Architecture

```
src/
├── types/           # TypeScript type definitions
├── parsers/         # Data source parsers
│   ├── CsvParser.ts
│   ├── ExcelParser.ts
│   └── DatabaseParser.ts
├── generators/      # MCP server code generation
│   └── MCPServerGenerator.ts
├── client/          # MCP client and testing
│   ├── MCPClient.ts
│   └── MCPTestRunner.ts
├── server/          # Server management
│   └── ServerManager.ts
└── web/             # Web interface
    ├── server.ts    # Express API server
    └── public/      # Frontend assets
```

## Development

### **Prerequisites**
- Node.js 18+
- TypeScript 5+
- npm or yarn

### **Scripts**
```bash
npm run dev       # Development mode with hot reload
npm run build     # Build TypeScript
npm run start     # Production mode
npm run lint      # Run ESLint
npm run typecheck # TypeScript checking
```

### **Adding New Data Sources**

1. Create parser in `src/parsers/`
2. Implement `ParsedData` interface
3. Add to `DataSourceParser`
4. Update web UI for configuration

### **Extending MCP Server Generation**

1. Modify `MCPServerGenerator.ts`
2. Add new tool/resource/prompt generators
3. Update server templates
4. Add tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review example implementations

---

**Generated MCP servers are fully compliant with the Model Context Protocol specification and can be used with any MCP-compatible client including Claude Desktop, Claude Code, and custom implementations.**