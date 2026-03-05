# Rofollow Bot - GitHub Deployment Guide

## Essential Files for GitHub Repository

To deploy your bot on GitHub and connect it to hosting platforms, you need these **essential files**:

### 🎯 **Core Bot Files (Required)**
```
index.js          # Main bot file - THE HEART OF YOUR BOT
package.json      # Dependencies and scripts
config.json       # Bot configuration
```

### 🔧 **Deployment Files (Required for Hosting)**
```
Procfile          # Tells hosting platforms how to run your bot
README.md         # Instructions and documentation
```

### 🛠️ **Supporting Files (Recommended)**
```
logger.js         # Logging system
database.js       # Database management
keepalive.js      # Keeps bot alive 24/7
.env.example      # Environment variables template
.gitignore        # Prevents uploading sensitive files
```

## Quick GitHub Setup

### Step 1: Create GitHub Repository
1. Go to [github.com](https://github.com)
2. Click "New repository"
3. Name it: `rofollow-bot` (or your preferred name)
4. Make it **Public** (required for free hosting)
5. **DO NOT** add README, .gitignore, or license (we'll add our own)

### Step 2: Upload Essential Files
Upload these files to your GitHub repository:

**📁 Essential Files:**
- `index.js` (Main bot file)
- `package.json` (Dependencies)
- `config.json` (Configuration)
- `Procfile` (Deployment config)
- `README.md` (Instructions)

**📁 Recommended Files:**
- `logger.js` (Logging)
- `database.js` (Database)
- `keepalive.js` (24/7 uptime)
- `.env.example` (Environment setup)
- `.gitignore` (Security)

### Step 3: Connect to Hosting Platform

**Option 1: Replit (Easiest)**
1. Go to [replit.com](https://replit.com)
2. Click "Import from GitHub"
3. Select your repository
4. Replit will automatically detect it's a Node.js project
5. Click "Run" - your bot is online!

**Option 2: Railway**
1. Go to [railway.app](https://railway.app)
2. Click "Deploy from GitHub"
3. Select your repository
4. Railway will automatically deploy

**Option 3: Render**
1. Go to [render.com](https://render.com)
2. Connect GitHub account
3. Import your repository
4. Set up as Web Service

## Environment Variables Setup

After deployment, set these environment variables in your hosting platform:

```env
DISCORD_TOKEN=your_bot_token_here
NODE_ENV=production
PORT=3000
```

## File Upload Methods

### Method 1: GitHub Web Interface
1. Go to your repository on GitHub
2. Click "Add file" → "Upload files"
3. Drag and drop the essential files
4. Click "Commit changes"

### Method 2: Git Command Line
```bash
# Clone your repository
git clone https://github.com/yourusername/rofollow-bot.git
cd rofollow-bot

# Copy files to repository
cp /path/to/roblox-discord-bot/* .

# Add and commit files
git add .
git commit -m "Initial bot setup"
git push origin main
```

### Method 3: GitHub Desktop
1. Download GitHub Desktop
2. Clone your repository
3. Copy files to the local folder
4. Commit and sync changes

## Minimal GitHub Repository Structure

Your GitHub repository should look like this:

```
rofollow-bot/
├── index.js          # REQUIRED - Main bot
├── package.json      # REQUIRED - Dependencies
├── config.json       # REQUIRED - Configuration
├── Procfile          # REQUIRED - Deployment
├── README.md         # REQUIRED - Instructions
├── logger.js         # Recommended
├── database.js       # Recommended
├── keepalive.js      # Recommended
├── .env.example      # Recommended
└── .gitignore        # Recommended
```

## Security Notes

⚠️ **IMPORTANT:**
- **NEVER** commit your actual `.env` file with real tokens
- Use `.env.example` for template only
- The `.gitignore` file will prevent sensitive files from being uploaded
- Always use environment variables in hosting platforms, not in code

## Troubleshooting

### Bot Not Starting?
- Check that `index.js` is in the root directory
- Verify `package.json` has correct dependencies
- Ensure environment variables are set

### Hosting Platform Not Detecting Bot?
- Make sure `package.json` exists
- Check that `Procfile` is in root directory
- Verify the repository is public

### Missing Dependencies?
- Ensure `package.json` is uploaded
- Check that all required files are in the repository
- Verify the repository structure is correct

## Next Steps

1. ✅ Create GitHub repository
2. ✅ Upload essential files
3. ✅ Connect to hosting platform
4. ✅ Set environment variables
5. ✅ Start your bot
6. ✅ Enjoy 24/7 online operation!

Your bot will be online and running automatically once deployed!