// MCP SDK 类型定义文件
// 用于解决依赖导入问题

declare module "@modelcontextprotocol/sdk/server/index.js" {
  export interface ServerInfo {
    name: string;
    version: string;
  }

  export interface ServerCapabilities {
    tools?: {};
    resources?: {};
    prompts?: {};
  }

  export class Server {
    constructor(info: ServerInfo, capabilities: { capabilities: ServerCapabilities });
    setRequestHandler(schema: any, handler: (request: any) => Promise<any>): void;
    connect(transport: any): Promise<void>;
  }
}

declare module "@modelcontextprotocol/sdk/server/stdio.js" {
  export class StdioServerTransport {
    constructor();
  }
}

declare module "@modelcontextprotocol/sdk/types.js" {
  export const CallToolRequestSchema: any;
  export const ListToolsRequestSchema: any;
  
  export interface Tool {
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  }

  export interface ToolResponse {
    content: Array<{
      type: string;
      text: string;
    }>;
    isError?: boolean;
  }
}

declare module "chalk" {
  interface Chalk {
    yellow(text: string): string;
    green(text: string): string;
    blue(text: string): string;
    cyan(text: string): string;
    red(text: string): string;
  }
  
  const chalk: Chalk;
  export default chalk;
}