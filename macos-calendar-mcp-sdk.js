#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';

class MacOSCalendarServer {
  constructor() {
    this.server = new Server(
      {
        name: 'macos-calendar-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // 列出工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list-calendars',
            description: '列出所有macOS日历',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: 'create-event',
            description: '在macOS日历中创建新事件',
            inputSchema: {
              type: 'object',
              properties: {
                calendar: {
                  type: 'string',
                  description: '日历名称',
                  default: '个人',
                },
                title: {
                  type: 'string',
                  description: '事件标题',
                },
                startDate: {
                  type: 'string',
                  description: '开始时间，格式：YYYY-MM-DD HH:MM',
                },
                endDate: {
                  type: 'string',
                  description: '结束时间，格式：YYYY-MM-DD HH:MM',
                },
                description: {
                  type: 'string',
                  description: '事件描述',
                  default: '',
                },
                location: {
                  type: 'string',
                  description: '事件地点',
                  default: '',
                },
              },
              required: ['title', 'startDate', 'endDate'],
              additionalProperties: false,
            },
          },
          {
            name: 'create-batch-events',
            description: '批量创建事件',
            inputSchema: {
              type: 'object',
              properties: {
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      startDate: { type: 'string' },
                      endDate: { type: 'string' },
                      description: { type: 'string', default: '' },
                      location: { type: 'string', default: '' },
                    },
                    required: ['title', 'startDate', 'endDate'],
                  },
                  description: '事件列表',
                },
                calendar: {
                  type: 'string',
                  description: '目标日历',
                  default: '工作',
                },
              },
              required: ['events'],
              additionalProperties: false,
            },
          },
          {
            name: 'delete-events-by-keyword',
            description: '根据关键词删除事件',
            inputSchema: {
              type: 'object',
              properties: {
                keyword: {
                  type: 'string',
                  description: '要删除的事件关键词',
                },
                calendar: {
                  type: 'string',
                  description: '日历名称',
                  default: '工作',
                },
                confirm: {
                  type: 'boolean',
                  description: '确认删除',
                  default: false,
                },
              },
              required: ['keyword'],
              additionalProperties: false,
            },
          },
          {
            name: 'list-today-events',
            description: '列出今天的事件',
            inputSchema: {
              type: 'object',
              properties: {
                calendar: {
                  type: 'string',
                  description: '日历名称',
                  default: '个人',
                },
              },
              additionalProperties: false,
            },
          },
          {
            name: 'list-week-events',
            description: '列出指定周的事件',
            inputSchema: {
              type: 'object',
              properties: {
                weekStart: {
                  type: 'string',
                  description: '周开始日期，格式：YYYY-MM-DD',
                },
                calendar: {
                  type: 'string',
                  description: '日历名称',
                  default: '工作',
                },
              },
              required: ['weekStart'],
              additionalProperties: false,
            },
          },
          {
            name: 'search-events',
            description: '搜索事件',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: '搜索关键词',
                },
                calendar: {
                  type: 'string',
                  description: '日历名称',
                  default: '个人',
                },
              },
              required: ['query'],
              additionalProperties: false,
            },
          },
          {
            name: 'fix-event-times',
            description: '修正错误的事件时间（从凌晨修正到正确时间）',
            inputSchema: {
              type: 'object',
              properties: {
                calendar: {
                  type: 'string',
                  description: '日历名称',
                  default: '工作',
                },
                datePattern: {
                  type: 'string',
                  description: '目标日期模式，如：2025-07-10',
                },
                corrections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      keyword: { type: 'string', description: '事件关键词' },
                      newStartTime: { type: 'string', description: '新开始时间 HH:MM' },
                      newEndTime: { type: 'string', description: '新结束时间 HH:MM' }
                    },
                    required: ['keyword', 'newStartTime', 'newEndTime']
                  },
                  description: '时间修正列表'
                }
              },
              required: ['calendar', 'datePattern', 'corrections'],
              additionalProperties: false,
            },
          },
        ],
      };
    });

    // 调用工具
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'list-calendars':
            return await this.listCalendars();
          case 'create-event':
            return await this.createEvent(args);
          case 'create-batch-events':
            return await this.createBatchEvents(args);
          case 'delete-events-by-keyword':
            return await this.deleteEventsByKeyword(args);
          case 'list-today-events':
            return await this.listTodayEvents(args);
          case 'list-week-events':
            return await this.listWeekEvents(args);
          case 'search-events':
            return await this.searchEvents(args);
          case 'fix-event-times':
            return await this.fixEventTimes(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `错误: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // 修复时间格式转换
  formatDateForAppleScript(dateStr) {
    // 输入格式：YYYY-MM-DD HH:MM
    // 输出格式：MM/DD/YYYY H:MM:SS AM/PM
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`无效的日期格式: ${dateStr}`);
    }
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    let hour = date.getHours();
    const minute = date.getMinutes();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    
    return `${month}/${day}/${year} ${hour}:${minute.toString().padStart(2, '0')}:00 ${ampm}`;
  }

  async listCalendars() {
    try {
      const script = `tell application "Calendar" to get name of calendars`;
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      const calendars = result.trim().split(', ');
      
      return {
        content: [
          {
            type: 'text',
            text: `📅 可用日历 (${calendars.length}个):\n${calendars.map(cal => `• ${cal}`).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`获取日历列表失败: ${error.message}`);
    }
  }

  async createEvent(args) {
    const { calendar = '个人', title, startDate, endDate, description = '', location = '' } = args;
    
    const formattedStart = this.formatDateForAppleScript(startDate);
    const formattedEnd = this.formatDateForAppleScript(endDate);

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
        content: [
          {
            type: 'text',
            text: `✅ 事件创建成功！\n📅 日历: ${calendar}\n📝 标题: ${title}\n🕒 时间: ${startDate} - ${endDate}\n📍 地点: ${location || '无'}\n📄 描述: ${description || '无'}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`创建事件失败: ${error.message}`);
    }
  }

  async createBatchEvents(args) {
    const { events, calendar = '工作' } = args;
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const event of events) {
      try {
        const formattedStart = this.formatDateForAppleScript(event.startDate);
        const formattedEnd = this.formatDateForAppleScript(event.endDate);

        const script = `
          tell application "Calendar"
            set theCalendar to calendar "${calendar}"
            set startDate to date "${formattedStart}"
            set endDate to date "${formattedEnd}"
            
            make new event at end of events of theCalendar with properties {summary:"${event.title}", start date:startDate, end date:endDate, description:"${event.description || ''}", location:"${event.location || ''}"}
          end tell
        `;

        execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
        results.push(`✅ ${event.title} - ${event.startDate}`);
        successCount++;
      } catch (error) {
        results.push(`❌ ${event.title} - 失败: ${error.message}`);
        failCount++;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `📊 批量创建结果:\n成功: ${successCount}个\n失败: ${failCount}个\n\n详细结果:\n${results.join('\n')}`,
        },
      ],
    };
  }

  async deleteEventsByKeyword(args) {
    const { keyword, calendar = '工作', confirm = false } = args;
    
    if (!confirm) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ 请确认删除操作！\n将删除日历"${calendar}"中包含关键词"${keyword}"的所有事件。\n要执行删除，请设置 confirm: true`,
          },
        ],
      };
    }

    const script = `
      tell application "Calendar"
        set theCalendar to calendar "${calendar}"
        set allEvents to every event of theCalendar
        set deletedCount to 0
        
        repeat with anEvent in reverse of allEvents
          if (summary of anEvent) contains "${keyword}" then
            delete anEvent
            set deletedCount to deletedCount + 1
          end if
        end repeat
        
        return deletedCount
      end tell
    `;

    try {
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      const deletedCount = parseInt(result.trim()) || 0;
      
      return {
        content: [
          {
            type: 'text',
            text: `🗑️ 删除完成！\n删除了 ${deletedCount} 个包含"${keyword}"的事件`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`删除事件失败: ${error.message}`);
    }
  }

  async listTodayEvents(args) {
    const { calendar = '个人' } = args;
    
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
          content: [
            {
              type: 'text',
              text: `📅 ${calendar} - 今日无事件`,
            },
          ],
        };
      }

      const eventList = events.split(',').map(event => {
        const [title, start, end, desc, loc] = event.trim().split('|');
        return `📝 ${title}\n🕒 ${start} - ${end}${loc ? `\n📍 ${loc}` : ''}${desc ? `\n📄 ${desc}` : ''}`;
      }).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `📅 ${calendar} - 今日事件:\n\n${eventList}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`获取今日事件失败: ${error.message}`);
    }
  }

  async listWeekEvents(args) {
    const { weekStart, calendar = '工作' } = args;
    
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
    
    const formattedStart = this.formatDateForAppleScript(weekStart + ' 00:00');
    const formattedEnd = this.formatDateForAppleScript(endDate.toISOString().split('T')[0] + ' 00:00');
    
    const script = `
      tell application "Calendar"
        set theCalendar to calendar "${calendar}"
        set weekStart to date "${formattedStart}"
        set weekEnd to date "${formattedEnd}"
        
        set weekEvents to every event of theCalendar whose start date ≥ weekStart and start date < weekEnd
        
        set eventList to {}
        repeat with anEvent in weekEvents
          set eventInfo to (summary of anEvent) & "|" & (start date of anEvent) & "|" & (end date of anEvent) & "|" & (location of anEvent)
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
          content: [
            {
              type: 'text',
              text: `📅 ${calendar} - ${weekStart}这周无事件`,
            },
          ],
        };
      }

      const eventList = events.split(',').map(event => {
        const [title, start, end, loc] = event.trim().split('|');
        return `📝 ${title}\n🕒 ${start} - ${end}${loc ? `\n📍 ${loc}` : ''}`;
      }).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `📅 ${calendar} - ${weekStart}这周的事件:\n\n${eventList}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`获取周事件失败: ${error.message}`);
    }
  }

  async searchEvents(args) {
    const { query, calendar = '个人' } = args;
    
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
          content: [
            {
              type: 'text',
              text: `🔍 在 ${calendar} 中未找到包含 "${query}" 的事件`,
            },
          ],
        };
      }

      const eventList = events.split(',').map(event => {
        const [title, start, end, desc, loc] = event.trim().split('|');
        return `📝 ${title}\n🕒 ${start} - ${end}${loc ? `\n📍 ${loc}` : ''}${desc ? `\n📄 ${desc}` : ''}`;
      }).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `🔍 在 ${calendar} 中找到 ${events.split(',').length} 个匹配事件:\n\n${eventList}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`搜索事件失败: ${error.message}`);
    }
  }

  async fixEventTimes(args) {
    const { calendar = '工作', datePattern, corrections } = args;
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const correction of corrections) {
      try {
        // 构建正确的日期时间
        const newStartDateTime = `${datePattern} ${correction.newStartTime}`;
        const newEndDateTime = `${datePattern} ${correction.newEndTime}`;
        
        const formattedStart = this.formatDateForAppleScript(newStartDateTime);
        const formattedEnd = this.formatDateForAppleScript(newEndDateTime);

        const script = `
          tell application "Calendar"
            set theCalendar to calendar "${calendar}"
            set allEvents to every event of theCalendar
            set fixedCount to 0
            
            repeat with anEvent in allEvents
              if (summary of anEvent) contains "${correction.keyword}" then
                set start date of anEvent to date "${formattedStart}"
                set end date of anEvent to date "${formattedEnd}"
                set fixedCount to fixedCount + 1
              end if
            end repeat
            
            return fixedCount
          end tell
        `;

        const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
        const fixedCount = parseInt(result.trim()) || 0;
        
        if (fixedCount > 0) {
          results.push(`✅ "${correction.keyword}" - 修正了 ${fixedCount} 个事件到 ${correction.newStartTime}-${correction.newEndTime}`);
          successCount += fixedCount;
        } else {
          results.push(`⚠️ "${correction.keyword}" - 未找到匹配的事件`);
        }
      } catch (error) {
        results.push(`❌ "${correction.keyword}" - 修正失败: ${error.message}`);
        failCount++;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `🔧 时间修正结果:\n成功修正: ${successCount}个事件\n失败: ${failCount}个修正\n\n详细结果:\n${results.join('\n')}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('macOS Calendar MCP Server running on stdio');
  }
}

const server = new MacOSCalendarServer();
server.run().catch(console.error);