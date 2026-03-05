# Rofollow Bot - 24/7 Online Deployment Guide

## Quick Setup for Online 24/7 Hosting

### Option 1: Replit (Recommended - Easiest)
1. Go to [replit.com](https://replit.com)
2. Create a free account
3. Click "Import from GitHub" or "Create Repl"
4. Choose "Node.js" template
5. Copy and paste all files from the `roblox-discord-bot` folder
6. Install dependencies: `npm install`
7. Set environment variables in the "Secrets" tab
8. Click "Run" - your bot will be online 24/7!

### Option 2: Railway (Alternative)
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub account
3. Import the project
4. Railway will automatically deploy and keep it running

### Option 3: Render (Another Alternative)
1. Go to [render.com](https://render.com)
2. Create account and import from GitHub
3. Set up as a Web Service
4. Configure environment variables

## Environment Variables Setup

Create a `.env` file with these variables:

```env
DISCORD_TOKEN=your_bot_token_here
NODE_ENV=production
PORT=3000
```

## Required Files

Make sure you have these files in your project:

- `index.js` - Main bot file
- `package.json` - Dependencies
- `config.json` - Configuration
- `logger.js` - Logging system
- `database.js` - Database management
- `status-monitor.js` - Status monitoring
- `keepalive.js` - Keeps bot alive
- `Procfile` - For Railway/Render deployment

## Quick Start Commands

```bash
# Install dependencies
npm install

# Start the bot
npm start

# For development (auto-restart)
npm run dev
```

## File Structure

```
roblox-discord-bot/
├── index.js          # Main bot file
├── package.json      # Dependencies
├── config.json       # Configuration
├── logger.js         # Logging system
├── database.js       # Database management
├── status-monitor.js # Status monitoring
├── keepalive.js      # Keep alive script
├── Procfile          # Deployment config
└── README.md         # This file
```

## 24/7 Hosting Benefits

- **Always Online**: Bot runs continuously
- **Auto-Restart**: Automatically restarts if crashes
- **Free Tier**: Most platforms offer free hosting
- **Easy Updates**: Just update files and redeploy
- **Monitoring**: Built-in uptime monitoring

## Troubleshooting

### Bot Not Starting?
- Check environment variables are set correctly
- Verify Discord bot token is valid
- Check logs for error messages

### Bot Crashing?
- Check memory usage (upgrade plan if needed)
- Review error logs
- Ensure all dependencies are installed

### Commands Not Working?
- Verify bot has necessary permissions
- Check channel IDs in config.json
- Ensure bot is online and connected

## Support

For help with deployment or bot issues:
- Check the logs in your hosting platform
- Verify all files are uploaded correctly
- Ensure environment variables are set
- Test locally first before deploying

## Security Notes

- Never commit your `.env` file to GitHub
- Use strong bot tokens
- Regularly update dependencies
- Monitor bot activity for suspicious behavior