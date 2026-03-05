const { Client, Intents, MessageEmbed, Permissions } = require('discord.js');
const axios = require('axios');
const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
const fs = require('fs');
const logger = require('./logger');
const path = require('path');
const StatusMonitor = require('./status-monitor');
const Database = require('./database');

// Load environment variables
dotenv.config();

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_PRESENCES
    ]
});

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Roblox API endpoints
const ROBLOX_API = 'https://api.roblox.com';
const ROBLOX_AUTH_API = 'https://auth.roblox.com';
const ROBLOX_GROUPS_API = 'https://groups.roblox.com';
const ROBLOX_USERS_API = 'https://users.roblox.com';

// Global variables
let robloxCookie = null;
let accounts = [];
let prestockAccounts = [];
let botEnabled = true;
let proxies = [];
let stats = { followersSent: 0, usersFollowed: 0, totalCommands: 0 };

// Rate limiting
const rateLimit = {
    commands: [],
    maxCommands: 5,
    windowMs: 2000 // 2 seconds
};

// Account usage tracking to prevent bans
const accountUsage = new Map(); // Map account username to last activity

// Command queue for single-threaded execution
const commandQueue = [];
let isProcessing = false;

// Database instance
let db;

// Role configuration
const roleConfig = {
    member: { id: '1447457185150795781', followers: 10 },
    silver: { id: '1478915791004111049', followers: 15 },
    gold: { id: '1478915663996260403', followers: 10 },
    diamond: { id: '1478915666169040967', followers: 25 },
    booster: { id: '1470303969245925417', followers: 35 },
    premium: { id: '1478915667007770624', followers: 50 },
    exclusive: { id: '1447457185150795785', followers: 100 }
};

// Channel IDs
const followChannelId = '1468814059108434005';
const logChannelId = '1478928287697866949';
const ownerId = '1118753231334547527';

client.once('ready', async () => {
    logger.info(`Logged in as ${client.user.tag}!`);
    
    // Initialize database
    try {
        db = new Database();
        await db.init();
        logger.info('Database initialized successfully');
        
        // Load existing accounts from database
        await loadAccountsFromDatabase();
    } catch (error) {
        logger.error('Error initializing database:', error);
    }
    
    // Start status monitoring
    const statusMonitor = new StatusMonitor(client);
    statusMonitor.start();
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Check if bot is enabled
    if (!botEnabled && message.author.id !== ownerId) {
        if (message.content.startsWith('$')) {
            return message.reply('Bot is currently disabled.');
        }
    }

    // Check if command is used in correct channel
    if (message.content.startsWith('$') && message.channel.id !== followChannelId) {
        const followChannel = client.channels.cache.get(followChannelId);
        return message.reply(`Please use commands in ${followChannel}`);
    }

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Rate limiting check
    const now = Date.now();
    const windowStart = now - rateLimit.windowMs;
    
    // Remove old entries
    rateLimit.commands = rateLimit.commands.filter(time => time > windowStart);
    
    // Check if rate limit exceeded
    if (rateLimit.commands.length >= rateLimit.maxCommands) {
        return message.reply(`Rate limit exceeded. Please wait before using more commands. (${rateLimit.maxCommands} commands per ${rateLimit.windowMs / 1000} seconds)`);
    }

    // Add current command to rate limit tracking
    rateLimit.commands.push(now);

    // Add command to queue for single-threaded execution
    commandQueue.push({ message, args, command });
    
    // Process queue if not already processing
    if (!isProcessing) {
        processQueue();
    }

    // Member commands
    if (command === 'help') {
        await showHelp(message);
    }

    if (command === 'follow') {
        await handleFollowCommand(message, args);
    }

    // Premium commands
    if (command === 'trade') {
        await handleTradeCommand(message, args);
    }

    if (command === 'like') {
        await handleLikeCommand(message, args);
    }

    if (command === 'queue') {
        await handleQueueCommand(message);
    }

    if (command === 'premium') {
        await handlePremiumFeaturesCommand(message);
    }

    if (command === 'support') {
        await handleSupportCommand(message);
    }

    // Owner commands
    if (message.author.id === ownerId) {
        if (command === 'gen') {
            await handleGenCommand(message, args);
        }

        if (command === 'stock') {
            await showStock(message);
        }

        if (command === 'prestock') {
            await showPreStock(message);
        }

        if (command === 'addstock') {
            await addStock(message);
        }

        if (command === 'ownerhelp') {
            await showOwnerHelp(message);
        }

        if (command === 'info') {
            await showInfo(message);
        }

        if (command === 'proxies') {
            await scrapeProxies(message);
        }

        if (command === 'proxyadd') {
            await addProxies(message, args);
        }

        if (command === 'lock') {
            await lockChannel(message);
        }

        if (command === 'bot') {
            await toggleBot(message, args);
        }

        if (command === 'gstart') {
            await startGiveaway(message, args);
        }

        // Owner-only commands
        if (command === 'bulkfollow') {
            await handleBulkFollowCommand(message, args);
        }

        if (command === 'join') {
            await handleGroupJoinCommand(message, args);
        }

        if (command === 'visit') {
            await handleGameVisitCommand(message, args);
        }

        if (command === 'stats') {
            await showStats(message);
        }

        if (command === 'analytics') {
            await handleAnalyticsCommand(message);
        }
    }
});

// Member Commands
async function showHelp(message) {
    const embed = new MessageEmbed()
        .setTitle('Rofollow Bot Commands')
        .setDescription(`
**Member Commands:**
- \`$follow [username]\` - Send followers to a Roblox user
- \`$stats\` - Show bot statistics
- \`$help\` - Show this help message

**Note:** Use commands in the designated channel.
        `)
        .setColor('#0099ff')
        .setFooter('discord.gg/Rofollow');
    
    message.channel.send({ embeds: [embed] });
}

async function handleFollowCommand(message, args) {
    // Check cooldown for exclusive users
    const member = message.member;
    const exclusiveRole = member.roles.cache.has(roleConfig.exclusive.id);
    const cooldown = exclusiveRole ? 30000 : 60000; // 30s for exclusive, 60s for others
    
    // Simple cooldown implementation (in production, use a proper cooldown system)
    const lastUsed = message.client.cooldowns?.get(message.author.id) || 0;
    const now = Date.now();
    
    if (now - lastUsed < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastUsed)) / 1000);
        return message.reply(`Please wait ${remaining} seconds before using this command again.`);
    }
    
    if (!args[0]) {
        return message.reply('Please provide a Roblox username. Usage: $follow [username]');
    }
    
    const username = args[0];
    const followers = getRoleFollowers(member);
    
    // Check if we have enough accounts
    if (accounts.length < followers) {
        return message.reply(`Not enough accounts in stock. Need ${followers}, have ${accounts.length}`);
    }
    
    try {
        // Log command to database
        if (db) {
            await db.logCommand(message.author.id, 'follow', args, true, `Sending ${followers} followers to ${username}`);
        }
        
        const result = await sendRobloxFollowers(username, followers);
        
        if (result.success) {
            stats.followersSent += result.count;
            stats.usersFollowed++;
            stats.totalCommands++;
            
            // Update user stats in database
            if (db) {
                await db.incrementUserStats(message.author.id, result.count);
                await db.updateStats(result.count, 1, 1, 0);
            }
            
            const embed = new MessageEmbed()
                .setTitle('Followers Sent Successfully!')
                .setDescription(`Successfully sent ${result.count} followers to **${username}**`)
                .setColor('#00ff00')
                .setTimestamp();
            
            message.channel.send({ embeds: [embed] });
            
            // Update cooldown
            if (!message.client.cooldowns) message.client.cooldowns = new Map();
            message.client.cooldowns.set(message.author.id, now);
        } else {
            // Log failed command
            if (db) {
                await db.logCommand(message.author.id, 'follow', args, false, result.error);
            }
            
            message.channel.send(`Failed to send followers: ${result.error}`);
        }
    } catch (error) {
        logger.error('Error in follow command:', error);
        message.channel.send('An error occurred while sending followers.');
    }
}

async function showStats(message) {
    try {
        if (db) {
            const stats = await db.getStats();
            const topUsers = await db.getTopUsers(5);
            const accountStats = await db.getAccountStats();
            
            const embed = new MessageEmbed()
                .setTitle('Rofollow Bot Statistics')
                .setDescription(`
**Global Statistics:**
- Total Followers Sent: ${stats.total_followers_sent}
- Users Followed: ${stats.total_users_followed}
- Total Commands Used: ${stats.total_commands}
- Accounts Generated: ${stats.total_accounts_generated}

**Account Statistics:**
- Total Accounts: ${accountStats.total_accounts}
- Active Accounts: ${accountStats.active_accounts}
- Used Accounts: ${accountStats.used_accounts}
- Average Usage per Account: ${Math.round(accountStats.avg_usage_per_account || 0)}

**Top Users:**
${topUsers.map((user, index) => `${index + 1}. ${user.username}#${user.discriminator} - ${user.total_commands} commands, ${user.followers_sent} followers sent`).join('\n')}
                `)
                .setColor('#0099ff')
                .setTimestamp();
            
            message.channel.send({ embeds: [embed] });
        } else {
            const embed = new MessageEmbed()
                .setTitle('Rofollow Bot Statistics')
                .setDescription(`
**Total Followers Sent:** ${stats.followersSent}
**Users Followed:** ${stats.usersFollowed}
**Total Commands Used:** ${stats.totalCommands}
**Accounts in Stock:** ${accounts.length}
**Accounts in Pre-Stock:** ${prestockAccounts.length}
                `)
                .setColor('#0099ff')
                .setTimestamp();
            
            message.channel.send({ embeds: [embed] });
        }
    } catch (error) {
        logger.error('Error showing stats:', error);
        message.channel.send('An error occurred while fetching statistics.');
    }
}

// Owner Commands
async function handleGenCommand(message, args) {
    const count = parseInt(args[0]) || 1;
    
    try {
        message.channel.send(`Generating ${count} Roblox account(s)...`);
        
        for (let i = 0; i < count; i++) {
            const account = await createRobloxAccountWithCaptcha();
            prestockAccounts.push(account);
            
            // Add to database
            if (db) {
                await db.addAccount(account);
            }
        }
        
        const embed = new MessageEmbed()
            .setTitle('Accounts Generated')
            .setDescription(`Generated ${count} account(s) and added to pre-stock`)
            .setColor('#00ff00')
            .setTimestamp();
        
        message.channel.send({ embeds: [embed] });
        
        // Log to owner channel
        const logChannel = client.channels.cache.get(logChannelId);
        if (logChannel) {
            logChannel.send(`Owner generated ${count} accounts. Total pre-stock: ${prestockAccounts.length}`);
        }
    } catch (error) {
        logger.error('Error generating accounts:', error);
        message.channel.send('Error generating accounts. Check console for details.');
    }
}

async function showStock(message) {
    const embed = new MessageEmbed()
        .setTitle('Live Stock')
        .setDescription(`**Accounts Available:** ${accounts.length}`)
        .setColor('#0099ff')
        .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
}

async function showPreStock(message) {
    const embed = new MessageEmbed()
        .setTitle('Pre-Stock')
        .setDescription(`**Accounts in Pre-Stock:** ${prestockAccounts.length}`)
        .setColor('#ff9900')
        .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
}

async function addStock(message) {
    if (prestockAccounts.length === 0) {
        return message.reply('No accounts in pre-stock to add.');
    }
    
    const addedCount = prestockAccounts.length;
    accounts.push(...prestockAccounts);
    prestockAccounts = [];
    
    const embed = new MessageEmbed()
        .setTitle('Stock Updated')
        .setDescription(`Added ${addedCount} accounts to live stock`)
        .setColor('#00ff00')
        .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    
    // Log to owner channel
    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel) {
        logChannel.send(`Owner added ${addedCount} accounts to live stock. Total live stock: ${accounts.length}`);
    }
}

async function showOwnerHelp(message) {
    const embed = new MessageEmbed()
        .setTitle('Owner Commands')
        .setDescription(`
**Account Management:**
- \`$gen [amount]\` - Generate Roblox accounts
- \`$stock\` - Show live stock
- \`$prestock\` - Show pre-stock
- \`$addstock\` - Move pre-stock to live stock

**Bot Management:**
- \`$lock\` - Lock/unlock command channel
- \`$bot [on/off]\` - Enable/disable bot
- \`$gstart [reward] [time]\` - Start giveaway

**Proxy Management:**
- \`$proxies\` - Scrape proxies
- \`$proxyadd [amount]\` - Generate and add proxies

**Information:**
- \`$info\` - Show bot information
- \`$stats\` - Show statistics
- \`$ownerhelp\` - Show this help
        `)
        .setColor('#ff0000')
        .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
}

async function showInfo(message) {
    const embed = new MessageEmbed()
        .setTitle('Rofollow Bot Information')
        .setDescription(`
**Role Benefits:**
- **Member:** 10 followers per command
- **Silver:** 15 followers per command (Get by setting status: discord.gg/Rofollow)
- **Gold:** 10 followers per command - **Cost: 250 Robux**
- **Diamond:** 25 followers per command - **Cost: 500 Robux**
- **Booster:** 35 followers per command (Boost server)
- **Premium:** 50 followers per command - **Cost: 1,000 Robux**
- **Exclusive:** 100 followers per command - **Cost: 5,000 Robux**

**Features:**
- 30-second cooldown for Exclusive role
- 1-minute cooldown for other roles
- Auto-role assignment based on Discord status
- Proxy support for account security

**Purchase Roles:**
Create a ticket in the support channel to purchase premium roles.
        `)
        .setColor('#0099ff')
        .setFooter('discord.gg/Rofollow');
    
    message.channel.send({ embeds: [embed] });
}

async function scrapeProxies(message) {
    // Simple proxy scraping (in production, use a proper proxy service)
    try {
        message.channel.send('Scraping proxies...');
        
        // This is a placeholder - in production, you'd scrape from proxy services
        const proxyList = [
            'http://proxy1.example.com:8080',
            'http://proxy2.example.com:8080',
            'http://proxy3.example.com:8080'
        ];
        
        proxies = proxyList;
        
        const embed = new MessageEmbed()
            .setTitle('Proxies Scraped')
            .setDescription(`Scraped ${proxyList.length} proxies`)
            .setColor('#00ff00')
            .setTimestamp();
        
        message.channel.send({ embeds: [embed] });
    } catch (error) {
        logger.error('Error scraping proxies:', error);
        message.channel.send('Error scraping proxies.');
    }
}

async function addProxies(message, args) {
    const count = parseInt(args[0]) || 5;
    
    try {
        message.channel.send(`Generating ${count} proxies...`);
        
        // Generate dummy proxies (in production, use a proper proxy service)
        const newProxies = [];
        for (let i = 0; i < count; i++) {
            newProxies.push(`http://proxy${Math.floor(Math.random() * 1000)}.example.com:8080`);
        }
        
        proxies.push(...newProxies);
        
        const embed = new MessageEmbed()
            .setTitle('Proxies Added')
            .setDescription(`Added ${count} proxies. Total: ${proxies.length}`)
            .setColor('#00ff00')
            .setTimestamp();
        
        message.channel.send({ embeds: [embed] });
    } catch (error) {
        logger.error('Error adding proxies:', error);
        message.channel.send('Error adding proxies.');
    }
}

async function lockChannel(message) {
    const channel = message.channel;
    const locked = !channel.permissionsFor(message.guild.id).has('SEND_MESSAGES');
    
    try {
        await channel.permissionOverwrites.edit(message.guild.id, {
            SEND_MESSAGES: locked
        });
        
        const embed = new MessageEmbed()
            .setTitle('Channel Locked')
            .setDescription(`Channel ${locked ? 'locked' : 'unlocked'} successfully`)
            .setColor(locked ? '#ff0000' : '#00ff00')
            .setTimestamp();
        
        message.channel.send({ embeds: [embed] });
    } catch (error) {
        logger.error('Error locking channel:', error);
        message.channel.send('Error locking channel.');
    }
}

async function toggleBot(message, args) {
    const action = args[0]?.toLowerCase();
    
    if (action === 'on') {
        botEnabled = true;
        message.channel.send('Bot enabled successfully!');
    } else if (action === 'off') {
        botEnabled = false;
        message.channel.send('Bot disabled successfully!');
    } else {
        message.channel.send('Usage: $bot [on/off]');
    }
}

async function startGiveaway(message, args) {
    if (args.length < 2) {
        return message.reply('Usage: $gstart [reward] [time in minutes]');
    }
    
    const reward = args.slice(0, -1).join(' ');
    const timeMinutes = parseInt(args[args.length - 1]);
    
    if (isNaN(timeMinutes) || timeMinutes <= 0) {
        return message.reply('Please provide a valid time in minutes.');
    }
    
    const endTime = Date.now() + (timeMinutes * 60 * 1000);
    
    const embed = new MessageEmbed()
        .setTitle('🎉 Giveaway Started! 🎉')
        .setDescription(`**Reward:** ${reward}\n**Duration:** ${timeMinutes} minutes\n**React with 🎁 to enter!`)
        .setColor('#ffff00')
        .setTimestamp()
        .setFooter(`Ends at ${new Date(endTime).toLocaleString()}`);
    
    const giveawayMessage = await message.channel.send({ embeds: [embed] });
    await giveawayMessage.react('🎁');
    
    // Set timeout to end giveaway
    setTimeout(async () => {
        const fetchedMessage = await message.channel.messages.fetch(giveawayMessage.id);
        const reactions = fetchedMessage.reactions.cache.get('🎁');
        
        if (reactions) {
            const users = await reactions.users.fetch();
            const participants = users.filter(user => !user.bot);
            
            if (participants.size > 0) {
                const winner = participants.random();
                const endEmbed = new MessageEmbed()
                    .setTitle('🎉 Giveaway Ended! 🎉')
                    .setDescription(`**Reward:** ${reward}\n**Winner:** ${winner.tag}\n**Participants:** ${participants.size}`)
                    .setColor('#00ff00')
                    .setTimestamp();
                
                message.channel.send({ embeds: [endEmbed] });
            } else {
                message.channel.send('No participants in the giveaway.');
            }
        }
    }, timeMinutes * 60 * 1000);
}

// Helper Functions
function getRoleFollowers(member) {
    // Check roles in order of priority (exclusive > premium > booster > diamond > gold > silver > member)
    if (member.roles.cache.has(roleConfig.exclusive.id)) return roleConfig.exclusive.followers;
    if (member.roles.cache.has(roleConfig.premium.id)) return roleConfig.premium.followers;
    if (member.roles.cache.has(roleConfig.booster.id)) return roleConfig.booster.followers;
    if (member.roles.cache.has(roleConfig.diamond.id)) return roleConfig.diamond.followers;
    if (member.roles.cache.has(roleConfig.gold.id)) return roleConfig.gold.followers;
    if (member.roles.cache.has(roleConfig.silver.id)) return roleConfig.silver.followers;
    return roleConfig.member.followers;
}

// Additional Features for RoFarm/ZapBots Style
async function handleGroupJoinCommand(message, args) {
    if (!args[0]) {
        return message.reply('Please provide a group ID. Usage: $join [groupId]');
    }
    
    const groupId = args[0];
    const followers = getRoleFollowers(message.member);
    
    if (accounts.length < followers) {
        return message.reply(`Not enough accounts in stock. Need ${followers}, have ${accounts.length}`);
    }
    
    try {
        const result = await sendGroupJoins(groupId, followers);
        
        if (result.success) {
            stats.totalCommands++;
            
            const embed = new MessageEmbed()
                .setTitle('Group Joins Completed!')
                .setDescription(`Successfully joined ${result.count} accounts to group **${groupId}**`)
                .setColor('#00ff00')
                .setTimestamp();
            
            message.channel.send({ embeds: [embed] });
        } else {
            message.channel.send(`Failed to join group: ${result.error}`);
        }
    } catch (error) {
        logger.error('Error in group join command:', error);
        message.channel.send('An error occurred while joining the group.');
    }
}

async function handleGameVisitCommand(message, args) {
    if (!args[0]) {
        return message.reply('Please provide a game ID. Usage: $visit [gameId]');
    }
    
    const gameId = args[0];
    const visits = getRoleFollowers(message.member);
    
    try {
        const result = await sendGameVisits(gameId, visits);
        
        if (result.success) {
            stats.totalCommands++;
            
            const embed = new MessageEmbed()
                .setTitle('Game Visits Completed!')
                .setDescription(`Successfully sent ${result.count} visits to game **${gameId}**`)
                .setColor('#00ff00')
                .setTimestamp();
            
            message.channel.send({ embeds: [embed] });
        } else {
            message.channel.send(`Failed to send visits: ${result.error}`);
        }
    } catch (error) {
        logger.error('Error in game visit command:', error);
        message.channel.send('An error occurred while sending game visits.');
    }
}

async function handleTradeCommand(message, args) {
    if (!args[0] || !args[1]) {
        return message.reply('Please provide both username and item ID. Usage: $trade [username] [itemId]');
    }
    
    const username = args[0];
    const itemId = args[1];
    const followers = getRoleFollowers(message.member);
    
    if (accounts.length < followers) {
        return message.reply(`Not enough accounts in stock. Need ${followers}, have ${accounts.length}`);
    }
    
    try {
        const result = await sendTrades(username, itemId, followers);
        
        if (result.success) {
            stats.totalCommands++;
            
            const embed = new MessageEmbed()
                .setTitle('Trades Completed!')
                .setDescription(`Successfully sent ${result.count} trades to **${username}** for item **${itemId}**`)
                .setColor('#00ff00')
                .setTimestamp();
            
            message.channel.send({ embeds: [embed] });
        } else {
            message.channel.send(`Failed to send trades: ${result.error}`);
        }
    } catch (error) {
        logger.error('Error in trade command:', error);
        message.channel.send('An error occurred while sending trades.');
    }
}

async function handleLikeCommand(message, args) {
    if (!args[0]) {
        return message.reply('Please provide an asset ID. Usage: $like [assetId]');
    }
    
    const assetId = args[0];
    const likes = getRoleFollowers(message.member);
    
    if (accounts.length < likes) {
        return message.reply(`Not enough accounts in stock. Need ${likes}, have ${accounts.length}`);
    }
    
    try {
        const result = await sendLikes(assetId, likes);
        
        if (result.success) {
            stats.totalCommands++;
            
            const embed = new MessageEmbed()
                .setTitle('Likes Completed!')
                .setDescription(`Successfully sent ${result.count} likes to asset **${assetId}**`)
                .setColor('#00ff00')
                .setTimestamp();
            
            message.channel.send({ embeds: [embed] });
        } else {
            message.channel.send(`Failed to send likes: ${result.error}`);
        }
    } catch (error) {
        logger.error('Error in like command:', error);
        message.channel.send('An error occurred while sending likes.');
    }
}

async function handleBulkFollowCommand(message, args) {
    if (!args[0]) {
        return message.reply('Please provide usernames separated by commas. Usage: $bulkfollow [user1,user2,user3]');
    }
    
    const usernames = args[0].split(',').map(u => u.trim());
    const followersPerUser = Math.floor(getRoleFollowers(message.member) / usernames.length);
    
    if (accounts.length < (followersPerUser * usernames.length)) {
        return message.reply(`Not enough accounts in stock. Need ${followersPerUser * usernames.length}, have ${accounts.length}`);
    }
    
    try {
        let totalSuccess = 0;
        
        for (const username of usernames) {
            const result = await sendRobloxFollowers(username, followersPerUser);
            if (result.success) {
                totalSuccess += result.count;
            }
        }
        
        stats.totalCommands++;
        
        const embed = new MessageEmbed()
            .setTitle('Bulk Follow Completed!')
            .setDescription(`Successfully sent ${totalSuccess} followers to ${usernames.length} users`)
            .setColor('#00ff00')
            .setTimestamp();
        
        message.channel.send({ embeds: [embed] });
    } catch (error) {
        logger.error('Error in bulk follow command:', error);
        message.channel.send('An error occurred while sending bulk follows.');
    }
}

async function handleQueueCommand(message) {
    const embed = new MessageEmbed()
        .setTitle('Command Queue')
        .setDescription('Queue system for high-volume requests')
        .addField('Current Queue', 'No items in queue', true)
        .addField('Estimated Wait Time', 'N/A', true)
        .setColor('#ffff00')
        .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
}

async function handlePremiumFeaturesCommand(message) {
    const embed = new MessageEmbed()
        .setTitle('Premium Features')
        .setDescription(`
**Available Premium Commands:**
- \`$bulkfollow [users]\` - Send followers to multiple users at once
- \`$join [groupId]\` - Join groups with bot accounts
- \`$visit [gameId]\` - Send game visits
- \`$trade [username] [itemId]\` - Send trades
- \`$like [assetId]\` - Send likes to assets
- \`$queue\` - Check command queue status
- \`$priority\` - Priority processing for premium users

**Premium Benefits:**
- Faster processing times
- Bulk operations
- Advanced analytics
- Priority support
        `)
        .setColor('#ff9900')
        .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
}

async function handleAnalyticsCommand(message) {
    try {
        if (db) {
            const stats = await db.getStats();
            const accountStats = await db.getAccountStats();
            const topUsers = await db.getTopUsers(10);
            
            const embed = new MessageEmbed()
                .setTitle('Bot Analytics')
                .setDescription(`
**Server Statistics:**
- Total Commands: ${stats.total_commands}
- Followers Sent: ${stats.total_followers_sent}
- Users Followed: ${stats.total_users_followed}
- Active Users: ${message.guild.memberCount}
- Bot Uptime: ${Math.floor(process.uptime())} seconds
- Accounts Generated: ${stats.total_accounts_generated}

**Account Statistics:**
- Total Accounts: ${accountStats.total_accounts}
- Active Accounts: ${accountStats.active_accounts}
- Used Accounts: ${accountStats.used_accounts}
- Average Usage per Account: ${Math.round(accountStats.avg_usage_per_account || 0)}

**Top 10 Users:**
${topUsers.map((user, index) => `${index + 1}. ${user.username}#${user.discriminator} - ${user.total_commands} commands, ${user.followers_sent} followers sent`).join('\n')}
                `)
                .setColor('#0099ff')
                .setTimestamp();
            
            message.channel.send({ embeds: [embed] });
        } else {
            const embed = new MessageEmbed()
                .setTitle('Bot Analytics')
                .setDescription(`
**Server Statistics:**
- Total Commands: ${stats.totalCommands}
- Followers Sent: ${stats.followersSent}
- Users Followed: ${stats.usersFollowed}
- Active Users: ${message.guild.memberCount}
- Bot Uptime: ${Math.floor(process.uptime())} seconds

**Account Statistics:**
- Live Stock: ${accounts.length}
- Pre-Stock: ${prestockAccounts.length}
- Total Generated: ${accounts.length + prestockAccounts.length}
- Success Rate: ${accounts.length > 0 ? 'N/A' : '100%'}
                `)
                .setColor('#0099ff')
                .setTimestamp();
            
            message.channel.send({ embeds: [embed] });
        }
    } catch (error) {
        logger.error('Error showing analytics:', error);
        message.channel.send('An error occurred while fetching analytics.');
    }
}

async function handleSupportCommand(message) {
    const embed = new MessageEmbed()
        .setTitle('Support & Help')
        .setDescription(`
**Need Help?**
- Create a ticket in <#support-channel-id>
- Check our FAQ in <#faq-channel-id>
- Contact staff for urgent issues

**Common Issues:**
- Account limits: Contact support for higher limits
- Command errors: Check syntax and try again
- Bot offline: Contact staff immediately

**Emergency Commands:**
- \`$status\` - Check bot status
- \`$report\` - Report issues
- \`$feedback\` - Send feedback
        `)
        .setColor('#ff0000')
        .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
}

async function createRobloxAccountWithCaptcha() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        // Navigate to Roblox signup page
        await page.goto('https://www.roblox.com/');
        
        // Wait for page to load
        await page.waitForSelector('input[name="Username"]');
        
        // Generate random username and password with Rofollow# format
        const randomNum = Math.floor(Math.random() * 1000000);
        const username = `user_${randomNum}`;
        const password = `Rofollow${randomNum}`;
        const email = `bot${randomNum}@example.com`;
        
        // Random male gender selection
        const gender = Math.random() > 0.5 ? 'Male' : 'Female';
        
        // Random birthday between 2000-2010
        const year = Math.floor(Math.random() * 11) + 2000; // 2000-2010
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        const birthday = `${month}/${day}/${year}`;
        
        // Fill out the form
        await page.type('input[name="Username"]', username);
        await page.type('input[name="Password"]', password);
        await page.type('input[name="Birthday"]', birthday);
        await page.type('input[name="Email"]', email);
        
        // Handle gender selection (simplified)
        try {
            await page.click('input[value="Male"]');
        } catch (e) {
            // Gender selection might not be available
        }
        
        // Handle captcha (simplified - in production, use a captcha solver)
        try {
            await page.waitForSelector('.g-recaptcha', { timeout: 5000 });
            // In production, integrate with a captcha solving service
            await page.click('.g-recaptcha');
        } catch (e) {
            // No captcha found or timeout
        }
        
        // Submit the form
        await page.click('button#signup-button');
        
        // Wait for response
        await page.waitForTimeout(5000);
        
        return {
            username,
            password,
            email,
            birthday,
            gender,
            created: new Date().toISOString()
        };
        
    } finally {
        await browser.close();
    }
}

async function sendRobloxFollowers(username, count) {
    try {
        // Get Roblox user ID from username
        const userResponse = await axios.get(`${ROBLOX_USERS_API}/v1/users/search?keyword=${username}&limit=1`);
        
        if (!userResponse.data || userResponse.data.data.length === 0) {
            return { success: false, error: 'User not found' };
        }
        
        const userId = userResponse.data.data[0].id;
        let successCount = 0;
        const now = Date.now();
        const banPreventionWindow = 3 * 60 * 1000; // 3 minutes in milliseconds
        
        // Filter accounts that haven't been used recently to prevent bans
        const availableAccounts = accounts.filter(account => {
            const lastUsed = accountUsage.get(account.username) || 0;
            return (now - lastUsed) >= banPreventionWindow;
        });
        
        // If not enough accounts available due to cooldown, return error
        if (availableAccounts.length < count) {
            return { 
                success: false, 
                error: `Not enough accounts available. ${count} needed, ${availableAccounts.length} available. Please wait 3 minutes between uses of the same account.` 
            };
        }
        
        // Use accounts to send followers
        for (let i = 0; i < Math.min(count, availableAccounts.length); i++) {
            const account = availableAccounts[i];
            
            try {
                // This is a simplified example - actual implementation would need proper authentication
                const response = await axios.post(
                    `${ROBLOX_USERS_API}/v1/users/${userId}/follow`,
                    {},
                    {
                        headers: {
                            'Cookie': `ROBLOSECURITY=${account.cookie || ''}`,
                            'X-CSRF-TOKEN': await getCsrfToken()
                        }
                    }
                );
                
                if (response.status === 200) {
                    successCount++;
                    // Update account usage tracking
                    accountUsage.set(account.username, now);
                    
                    // Update account usage in database
                    if (db) {
                        await db.updateAccountUsage(account.username);
                    }
                }
            } catch (error) {
                logger.error(`Failed to follow user ${username} with account ${account.username}:`, error.message);
            }
        }
        
        // Remove used accounts from the main array
        for (let i = 0; i < Math.min(count, availableAccounts.length); i++) {
            const accountIndex = accounts.findIndex(acc => acc.username === availableAccounts[i].username);
            if (accountIndex !== -1) {
                accounts.splice(accountIndex, 1);
            }
        }
        
        return { success: true, count: successCount };
    } catch (error) {
        logger.error('Error sending Roblox followers:', error);
        return { success: false, error: error.message };
    }
}

async function sendGroupJoins(groupId, count) {
    try {
        let successCount = 0;
        
        // Use accounts to join groups
        for (let i = 0; i < Math.min(count, accounts.length); i++) {
            const account = accounts[i];
            
            try {
                // This is a simplified example - actual implementation would need proper authentication
                const response = await axios.post(
                    `${ROBLOX_GROUPS_API}/v1/groups/${groupId}/users`,
                    {},
                    {
                        headers: {
                            'Cookie': `ROBLOSECURITY=${account.cookie || ''}`,
                            'X-CSRF-TOKEN': await getCsrfToken()
                        }
                    }
                );
                
                if (response.status === 200) {
                    successCount++;
                }
            } catch (error) {
                logger.error(`Failed to join group ${groupId} with account ${account.username}:`, error.message);
            }
        }
        
        // Remove used accounts
        accounts.splice(0, Math.min(count, accounts.length));
        
        return { success: true, count: successCount };
    } catch (error) {
        logger.error('Error sending group joins:', error);
        return { success: false, error: error.message };
    }
}

async function sendGameVisits(gameId, count) {
    try {
        let successCount = 0;
        
        // Use accounts to visit games
        for (let i = 0; i < Math.min(count, accounts.length); i++) {
            const account = accounts[i];
            
            try {
                // This is a simplified example - actual implementation would need proper authentication
                const response = await axios.post(
                    `${ROBLOX_API}/v1/games/${gameId}/visits`,
                    {},
                    {
                        headers: {
                            'Cookie': `ROBLOSECURITY=${account.cookie || ''}`,
                            'X-CSRF-TOKEN': await getCsrfToken()
                        }
                    }
                );
                
                if (response.status === 200) {
                    successCount++;
                }
            } catch (error) {
                logger.error(`Failed to visit game ${gameId} with account ${account.username}:`, error.message);
            }
        }
        
        // Remove used accounts
        accounts.splice(0, Math.min(count, accounts.length));
        
        return { success: true, count: successCount };
    } catch (error) {
        logger.error('Error sending game visits:', error);
        return { success: false, error: error.message };
    }
}

async function sendTrades(username, itemId, count) {
    try {
        let successCount = 0;
        
        // Use accounts to send trades
        for (let i = 0; i < Math.min(count, accounts.length); i++) {
            const account = accounts[i];
            
            try {
                // This is a simplified example - actual implementation would need proper authentication
                const response = await axios.post(
                    `${ROBLOX_API}/v1/trades`,
                    {
                        recipientUsername: username,
                        offerItems: [],
                        requestItems: [{ id: itemId, type: 'Asset' }]
                    },
                    {
                        headers: {
                            'Cookie': `ROBLOSECURITY=${account.cookie || ''}`,
                            'X-CSRF-TOKEN': await getCsrfToken()
                        }
                    }
                );
                
                if (response.status === 200) {
                    successCount++;
                }
            } catch (error) {
                logger.error(`Failed to send trade to ${username} for item ${itemId} with account ${account.username}:`, error.message);
            }
        }
        
        // Remove used accounts
        accounts.splice(0, Math.min(count, accounts.length));
        
        return { success: true, count: successCount };
    } catch (error) {
        logger.error('Error sending trades:', error);
        return { success: false, error: error.message };
    }
}

async function sendLikes(assetId, count) {
    try {
        let successCount = 0;
        
        // Use accounts to send likes
        for (let i = 0; i < Math.min(count, accounts.length); i++) {
            const account = accounts[i];
            
            try {
                // This is a simplified example - actual implementation would need proper authentication
                const response = await axios.post(
                    `${ROBLOX_API}/v1/assets/${assetId}/like`,
                    {},
                    {
                        headers: {
                            'Cookie': `ROBLOSECURITY=${account.cookie || ''}`,
                            'X-CSRF-TOKEN': await getCsrfToken()
                        }
                    }
                );
                
                if (response.status === 200) {
                    successCount++;
                }
            } catch (error) {
                logger.error(`Failed to like asset ${assetId} with account ${account.username}:`, error.message);
            }
        }
        
        // Remove used accounts
        accounts.splice(0, Math.min(count, accounts.length));
        
        return { success: true, count: successCount };
    } catch (error) {
        logger.error('Error sending likes:', error);
        return { success: false, error: error.message };
    }
}

async function getCsrfToken() {
    try {
        const response = await axios.post(`${ROBLOX_AUTH_API}/v2/login`, {}, {
            headers: {
                'Cookie': robloxCookie
            }
        });
        return response.headers['x-csrf-token'] || '';
    } catch (error) {
        return '';
    }
}

// Database Functions
async function loadAccountsFromDatabase() {
    if (!db) return;
    
    try {
        const accountsData = await db.getAllAccounts();
        accounts = accountsData;
        logger.info(`Loaded ${accounts.length} accounts from database`);
    } catch (error) {
        logger.error('Error loading accounts from database:', error);
    }
}

// Command queue processor for single-threaded execution
async function processQueue() {
    if (isProcessing || commandQueue.length === 0) {
        return;
    }
    
    isProcessing = true;
    
    while (commandQueue.length > 0) {
        const { message, args, command } = commandQueue.shift();
        
        try {
            // Process the command
            await processCommand(message, args, command);
            
            // Add delay between commands to slow down processing
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        } catch (error) {
            logger.error('Error processing command from queue:', error);
            try {
                message.channel.send('An error occurred while processing your command.');
            } catch (sendError) {
                logger.error('Error sending error message:', sendError);
            }
        }
    }
    
    isProcessing = false;
}

// Process individual commands
async function processCommand(message, args, command) {
    // Member commands
    if (command === 'help') {
        await showHelp(message);
    }

    if (command === 'follow') {
        await handleFollowCommand(message, args);
    }

    // Premium commands
    if (command === 'trade') {
        await handleTradeCommand(message, args);
    }

    if (command === 'like') {
        await handleLikeCommand(message, args);
    }

    if (command === 'queue') {
        await handleQueueCommand(message);
    }

    if (command === 'premium') {
        await handlePremiumFeaturesCommand(message);
    }

    if (command === 'support') {
        await handleSupportCommand(message);
    }

    // Owner commands
    if (message.author.id === ownerId) {
        if (command === 'gen') {
            await handleGenCommand(message, args);
        }

        if (command === 'stock') {
            await showStock(message);
        }

        if (command === 'prestock') {
            await showPreStock(message);
        }

        if (command === 'addstock') {
            await addStock(message);
        }

        if (command === 'ownerhelp') {
            await showOwnerHelp(message);
        }

        if (command === 'info') {
            await showInfo(message);
        }

        if (command === 'proxies') {
            await scrapeProxies(message);
        }

        if (command === 'proxyadd') {
            await addProxies(message, args);
        }

        if (command === 'lock') {
            await lockChannel(message);
        }

        if (command === 'bot') {
            await toggleBot(message, args);
        }

        if (command === 'gstart') {
            await startGiveaway(message, args);
        }

        // Owner-only commands
        if (command === 'bulkfollow') {
            await handleBulkFollowCommand(message, args);
        }

        if (command === 'join') {
            await handleGroupJoinCommand(message, args);
        }

        if (command === 'visit') {
            await handleGameVisitCommand(message, args);
        }

        if (command === 'stats') {
            await showStats(message);
        }

        if (command === 'analytics') {
            await handleAnalyticsCommand(message);
        }
    }
}

// Login to Discord
client.login(config.discordToken);