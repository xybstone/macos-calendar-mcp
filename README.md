# macOS Calendar MCP Server

A Model Context Protocol (MCP) server for seamless macOS Calendar integration using AppleScript. No OAuth setup required!

## Features

- 🍎 **Native macOS Integration** - Uses AppleScript to interact directly with macOS Calendar
- 📅 **Full Calendar Management** - Create, list, and search calendar events
- 🚀 **Zero Configuration** - No OAuth, no API keys, just works out of the box
- 🔧 **MCP Compatible** - Works with Claude Code CLI and other MCP clients
- 📱 **Multi-Calendar Support** - Works with all your calendars (Personal, Work, etc.)

## Quick Start

### Prerequisites

- macOS (required for AppleScript support)
- Node.js 16+ 
- Calendar app (pre-installed on macOS)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/xybstone/macos-calendar-mcp.git
cd macos-calendar-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Grant permissions:
   - When first run, macOS will ask for Calendar app permissions
   - Grant access to allow the MCP server to manage your calendars

### Usage with Claude Code CLI

Add to your `.claude_project` file:

```json
{
  "mcpServers": {
    "macos-calendar": {
      "command": "node",
      "args": ["/path/to/macos-calendar-mcp/macos-calendar-mcp.js"]
    }
  }
}
```

Or run directly:
```bash
node macos-calendar-mcp.js
```

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `list-calendars` | List all available calendars | None |
| `create-event` | Create a new calendar event | `title`, `startDate`, `endDate`, `calendar`, `description`, `location` |
| `list-today-events` | List today's events | `calendar` (optional) |
| `search-events` | Search events by keyword | `query`, `calendar` (optional) |

## Examples

### Create an Event
```javascript
{
  "title": "Team Meeting",
  "startDate": "2025-07-05 14:00",
  "endDate": "2025-07-05 15:00", 
  "calendar": "Work",
  "description": "Weekly team sync",
  "location": "Conference Room A"
}
```

### List Calendars
```javascript
// Returns all available calendars
```

### Search Events
```javascript
{
  "query": "meeting",
  "calendar": "Work"
}
```

## Date Format

Use the format: `YYYY-MM-DD HH:MM` (24-hour format)

Examples:
- `2025-07-05 14:00` (2:00 PM)
- `2025-12-25 09:30` (9:30 AM)
- `2025-07-10 18:00` (6:00 PM)

**Time Zone Handling:**
- Uses native macOS time handling to avoid timezone conversion issues
- All times are interpreted in your system's local timezone
- No UTC conversion or daylight saving adjustments needed

## Supported Calendars

Works with all macOS Calendar calendars including:
- Personal calendars
- Work calendars  
- Shared calendars
- Subscribed calendars (iCloud, Google, etc.)

## Troubleshooting

### Permission Issues
If you get permission errors:
1. Open System Preferences → Security & Privacy → Privacy
2. Select "Calendar" from the left sidebar
3. Ensure Terminal (or your app) has access

### AppleScript Errors
- Ensure Calendar app is installed and accessible
- Check calendar names are correct (case-sensitive)
- Verify date formats match the expected pattern

### Time Zone Issues
If events appear at wrong times:
1. Check your system timezone settings
2. Use the `fix-event-times` tool to correct existing events
3. Ensure date format is `YYYY-MM-DD HH:MM` in 24-hour format
4. The MCP uses native macOS time handling to avoid conversion issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on macOS
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Why This MCP?

Unlike Google Calendar integrations that require complex OAuth setups, this MCP:
- ✅ Works immediately with no configuration
- ✅ Integrates with your existing macOS Calendar setup
- ✅ Supports all calendar sources (iCloud, Google, Exchange, etc.)
- ✅ Requires no internet connection for basic operations
- ✅ Respects your privacy - everything runs locally

Perfect for developers who want calendar integration without the OAuth headache!