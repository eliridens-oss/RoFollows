# How to Update Code on GitHub

## Step-by-Step Guide to Change Code on GitHub

### Method 1: GitHub Web Interface (Easiest)

#### **1. Navigate to Your Repository**
- Go to `https://github.com/yourusername/your-repository-name`
- Replace `yourusername` and `your-repository-name` with your actual GitHub username and repository name

#### **2. Find the File You Want to Edit**
- Browse through your file structure
- Click on the file you want to modify (e.g., `index.js`)

#### **3. Edit the File**
- Click the **pencil icon** (✏️) in the top right corner of the file view
- This opens the file editor

#### **4. Make Your Changes**
- Edit the code in the text editor
- You can copy and paste from the updated files I provided

#### **5. Commit Your Changes**
- Scroll down to the "Commit changes" section
- Add a commit message (e.g., "Updated bot with new features")
- Choose "Commit directly to the main branch" (or your current branch)
- Click **"Commit changes"**

### Method 2: Upload New Files

#### **1. Go to Your Repository**
- Navigate to your GitHub repository

#### **2. Upload Files**
- Click the **"Add file"** button
- Select **"Upload files"**
- Drag and drop your updated files OR click "choose your files" to browse

#### **3. Select Files to Upload**
- Upload the files you want to update:
  - `index.js` (main bot file)
  - `package.json`
  - `config.json`
  - Any other files you've modified

#### **4. Commit Changes**
- Add a commit message
- Click **"Commit changes"**

### Method 3: Using Git Command Line

#### **1. Install Git (if not already installed)**
- Download from: https://git-scm.com/downloads

#### **2. Clone Your Repository**
```bash
git clone https://github.com/yourusername/your-repository-name.git
cd your-repository-name
```

#### **3. Make Changes**
- Edit files using your preferred editor
- Or copy the updated files from this conversation

#### **4. Add and Commit Changes**
```bash
git add .
git commit -m "Updated bot with new features"
git push origin main
```

### Method 4: Download and Replace

#### **1. Download Updated Files**
- Download all the files I provided in this conversation
- Save them to your computer

#### **2. Replace Files on GitHub**
- Go to your GitHub repository
- For each file:
  - Click on the file
  - Click the pencil icon (✏️)
  - Delete all existing content
  - Paste the new content
  - Commit changes

### Quick Tips for Updating Your Bot

#### **For Your Rofollow Bot:**

1. **Update `index.js`** (Most Important)
   - This contains all the new features
   - Replace the entire content with the updated version

2. **Update Supporting Files**
   - `package.json` - Ensure dependencies are correct
   - `config.json` - Keep your Discord bot token
   - `Procfile` - Deployment configuration

3. **Keep Your Environment Safe**
   - Never commit your actual `.env` file
   - Use `.env.example` as a template
   - Your Discord bot token should stay private

### After Updating

#### **1. Replit Will Auto-Sync**
- Replit automatically pulls changes from GitHub
- Your bot should update within 2-5 minutes

#### **2. Check Replit**
- Go to your Replit project
- Verify the files have been updated
- Restart the bot if needed

#### **3. Test Your Bot**
- Try the new commands:
  - `$proxies` - Should show proxy count
  - `$autodel on` - Should enable auto-delete
  - `$add "cookie"` - Should add manual accounts

### Troubleshooting

#### **If Files Don't Update:**
1. **Force Refresh Replit:**
   - Go to Replit
   - Click "Import from GitHub"
   - Select your repository again

2. **Check for Errors:**
   - Look at Replit logs
   - Verify all files uploaded correctly

3. **Manual Sync:**
   - In Replit, click the refresh button
   - Or restart the project

### Common Issues and Solutions

#### **"File too large to edit"**
- Use Method 2 (Upload Files) instead of editing in browser
- Or use Git command line

#### **"Permission denied"**
- Make sure you're logged into the correct GitHub account
- Verify you have write access to the repository

#### **"Changes not appearing in Replit"**
- Wait 5 minutes for auto-sync
- Manually refresh Replit
- Check if you're looking at the right branch

### Best Practices

1. **Always backup your current files** before updating
2. **Test changes locally** if possible before pushing to GitHub
3. **Use descriptive commit messages** like "Added manual account addition feature"
4. **Update files one at a time** if you're unsure
5. **Check Replit logs** after updating to ensure everything works

### Quick Checklist

- [ ] Go to your GitHub repository
- [ ] Upload/replace `index.js` with updated version
- [ ] Upload/replace other updated files
- [ ] Commit changes with good message
- [ ] Wait for Replit to sync (2-5 minutes)
- [ ] Test new bot commands
- [ ] Check Replit logs for errors

That's it! Once you upload the files to GitHub, Replit will automatically sync them and your bot will have all the new features. 🚀