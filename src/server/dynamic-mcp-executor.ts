import { createDataStore } from '../database/factory';
import { IDataStore } from '../database/datastore';
import { ServerUtils } from './server-utils';
import { ToolExecuter } from './tool-executer';

export class DynamicMCPExecutor {
  private dataStore: IDataStore;
  private serverUtils: ServerUtils;
  private toolExecuter: ToolExecuter;

  constructor() {
    this.dataStore = createDataStore();
    this.serverUtils = new ServerUtils(this.dataStore);
    this.toolExecuter = new ToolExecuter(this.serverUtils);
  }

  async getAllTools(): Promise<any[]> {
    return this.serverUtils.getAllTools();
  }

  async getAllResources(): Promise<any[]> {
    return this.serverUtils.getAllResources();
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    return this.toolExecuter.executeTool(toolName, args);
  }

  async readResource(resourceName: string): Promise<any> {
    try {
      const [serverId, actualResourceName] = this.serverUtils.parseQualifiedName(resourceName, 'resource');

      const resources = this.dataStore.getResourcesForServer(serverId);
      const resource = resources.find((r) => r.name === actualResourceName);
      if (!resource) {
        throw new Error(`Resource not found: ${resourceName}`);
      }

      const serverConfig = this.dataStore.getServer(serverId);
      if (!serverConfig) {
        throw new Error(`Server not found: ${serverId}`);
      }

      const result = await this.toolExecuter.executeResourceQuery(
        serverId,
        serverConfig.sourceConfig,
        resource.sqlQuery,
        {},
        'SELECT'
      );

      console.error(`✅ Read resource ${resourceName} successfully`);
      return {
        contents: [{
          uri: resource.uri_template,
          mimeType: 'application/json',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      console.error(`❌ Error reading resource ${resourceName}:`, error);
      throw error;
    }
  }

  getStats(): any {
    return {
      ...this.dataStore.getStats(),
      activeConnections: this.toolExecuter.getActiveConnectionsCount()
    };
  }

  async close(): Promise<void> {
    await this.toolExecuter.closeConnections();
    this.dataStore.close();
  }
}
