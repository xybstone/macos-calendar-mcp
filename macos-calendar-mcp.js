#!/usr/bin/env node

import { execSync } from 'child_process';

class MacOSCalendarMCP {
  constructor() {
    this.name = "macos-calendar";
    this.version = "1.0.0";
  }

  // MCP服务器初始化
  initialize() {
    return {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: { listChanged: true }
      },
      serverInfo: {
        name: this.name,
        version: this.version
      }
    };
  }

  // 获取可用工具列表
  getTools() {
    return {
      tools: [
        {
          name: "list-calendars",
          description: "列出所有macOS日历",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: "create-event",
          description: "在macOS日历中创建新事件",
          inputSchema: {
            type: "object",
            properties: {
              calendar: {
                type: "string",
                description: "日历名称",
                default: "个人"
              },
              title: {
                type: "string",
                description: "事件标题"
              },
              startDate: {
                type: "string",
                description: "开始时间，格式：YYYY-MM-DD HH:MM"
              },
              endDate: {
                type: "string",
                description: "结束时间，格式：YYYY-MM-DD HH:MM"
              },
              description: {
                type: "string",
                description: "事件描述",
                default: ""
              },
              location: {
                type: "string",
                description: "事件地点",
                default: ""
              }
            },
            required: ["title", "startDate", "endDate"],
            additionalProperties: false
          }
        },
        {
          name: "list-today-events",
          description: "列出今天的事件",
          inputSchema: {
            type: "object",
            properties: {
              calendar: {
                type: "string",
                description: "日历名称",
                default: "个人"
              }
            },
            additionalProperties: false
          }
        },
        {
          name: "search-events",
          description: "搜索事件",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "搜索关键词"
              },
              calendar: {
                type: "string",
                description: "日历名称",
                default: "个人"
              }
            },
            required: ["query"],
            additionalProperties: false
          }
        }
      ]
    };
  }

  // 执行工具
  async callTool(name, args) {
    try {
      switch (name) {
        case "list-calendars":
          return this.listCalendars();
        case "create-event":
          return this.createEvent(args);
        case "list-today-events":
          return this.listTodayEvents(args);
        case "search-events":
          return this.searchEvents(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `错误: ${error.message}`
        }],
        isError: true
      };
    }
  }

  // 列出所有日历
  listCalendars() {
    try {
      const script = `tell application "Calendar" to get name of calendars`;
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      const calendars = result.trim().split(', ');
      
      return {
        content: [{
          type: "text",
          text: `📅 可用日历 (${calendars.length}个):\n${calendars.map(cal => `• ${cal}`).join('\n')}`
        }]
      };
    } catch (error) {
      throw new Error(`获取日历列表失败: ${error.message}`);
    }
  }

  // 创建事件
  createEvent(args) {
    const { calendar = "个人", title, startDate, endDate, description = "", location = "" } = args;
    
    // 转换时间格式
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);

    const script = `
      tell application "Calendar"
        set theCalendar to calendar "${calendar}"
        set startDate to date "${formattedStart}"
        set endDate to date "${formattedEnd}"
        
        make new event at end of events of theCalendar with properties {summary:"${title}", start date:startDate, end date:endDate, description:"${description}", location:"${location}"}
      end tell
    `;

    try {
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      return {
        content: [{
          type: "text",
          text: `✅ 事件创建成功！\n📅 日历: ${calendar}\n📝 标题: ${title}\n🕒 时间: ${startDate} - ${endDate}\n📍 地点: ${location || '无'}\n📄 描述: ${description || '无'}`
        }]
      };
    } catch (error) {
      throw new Error(`创建事件失败: ${error.message}`);
    }
  }

  // 列出今天的事件
  listTodayEvents(args) {
    const { calendar = "个人" } = args;
    
    const script = `
      tell application "Calendar"
        set theCalendar to calendar "${calendar}"
        set todayStart to (current date) - (time of (current date))
        set todayEnd to todayStart + (24 * hours) - 1
        
        set todayEvents to every event of theCalendar whose start date ≥ todayStart and start date ≤ todayEnd
        
        set eventList to {}
        repeat with anEvent in todayEvents
          set eventInfo to (summary of anEvent) & "|" & (start date of anEvent) & "|" & (end date of anEvent) & "|" & (description of anEvent) & "|" & (location of anEvent)
          set end of eventList to eventInfo
        end repeat
        
        return eventList as string
      end tell
    `;

    try {
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      const events = result.trim();
      
      if (!events || events === '""') {
        return {
          content: [{
            type: "text",
            text: `📅 ${calendar} - 今日无事件`
          }]
        };
      }

      const eventList = events.split(',').map(event => {
        const [title, start, end, desc, loc] = event.trim().split('|');
        return `📝 ${title}\n🕒 ${start} - ${end}${loc ? `\n📍 ${loc}` : ''}${desc ? `\n📄 ${desc}` : ''}`;
      }).join('\n\n');

      return {
        content: [{
          type: "text",
          text: `📅 ${calendar} - 今日事件:\n\n${eventList}`
        }]
      };
    } catch (error) {
      throw new Error(`获取今日事件失败: ${error.message}`);
    }
  }

  // 搜索事件
  searchEvents(args) {
    const { query, calendar = "个人" } = args;
    
    const script = `
      tell application "Calendar"
        set theCalendar to calendar "${calendar}"
        set allEvents to every event of theCalendar
        
        set matchingEvents to {}
        repeat with anEvent in allEvents
          if (summary of anEvent) contains "${query}" or (description of anEvent) contains "${query}" then
            set eventInfo to (summary of anEvent) & "|" & (start date of anEvent) & "|" & (end date of anEvent) & "|" & (description of anEvent) & "|" & (location of anEvent)
            set end of matchingEvents to eventInfo
          end if
        end repeat
        
        return matchingEvents as string
      end tell
    `;

    try {
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      const events = result.trim();
      
      if (!events || events === '""') {
        return {
          content: [{
            type: "text",
            text: `🔍 在 ${calendar} 中未找到包含 "${query}" 的事件`
          }]
        };
      }

      const eventList = events.split(',').map(event => {
        const [title, start, end, desc, loc] = event.trim().split('|');
        return `📝 ${title}\n🕒 ${start} - ${end}${loc ? `\n📍 ${loc}` : ''}${desc ? `\n📄 ${desc}` : ''}`;
      }).join('\n\n');

      return {
        content: [{
          type: "text",
          text: `🔍 在 ${calendar} 中找到 ${events.split(',').length} 个匹配事件:\n\n${eventList}`
        }]
      };
    } catch (error) {
      throw new Error(`搜索事件失败: ${error.message}`);
    }
  }
}

// MCP服务器主函数
async function main() {
  const server = new MacOSCalendarMCP();
  
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('data', async (data) => {
    try {
      const lines = data.trim().split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const request = JSON.parse(line);
        let response = {};
        
        switch (request.method) {
          case 'initialize':
            response = {
              jsonrpc: "2.0",
              id: request.id,
              result: server.initialize()
            };
            break;
            
          case 'tools/list':
            response = {
              jsonrpc: "2.0", 
              id: request.id,
              result: server.getTools()
            };
            break;
            
          case 'tools/call':
            const result = await server.callTool(request.params.name, request.params.arguments || {});
            response = {
              jsonrpc: "2.0",
              id: request.id,
              result
            };
            break;
            
          default:
            response = {
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: -32601,
                message: `Method not found: ${request.method}`
              }
            };
        }
        
        console.log(JSON.stringify(response));
      }
    } catch (error) {
      const response = {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: `Parse error: ${error.message}`
        }
      };
      console.log(JSON.stringify(response));
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default MacOSCalendarMCP;