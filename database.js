const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'bot.db');
        this.db = null;
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    logger.error('Error opening database:', err);
                    reject(err);
                } else {
                    logger.info('Database connected successfully');
                    this.createTables();
                    resolve();
                }
            });
        });
    }
    
    createTables() {
        // Users table
        const usersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                discriminator TEXT NOT NULL,
                total_commands INTEGER DEFAULT 0,
                followers_sent INTEGER DEFAULT 0,
                last_command_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        // Accounts table
        const accountsTable = `
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT,
                birthday TEXT,
                gender TEXT,
                cookie TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_used_at DATETIME,
                usage_count INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1
            )
        `;
        
        // Commands table
        const commandsTable = `
            CREATE TABLE IF NOT EXISTS commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                command TEXT NOT NULL,
                args TEXT,
                success BOOLEAN NOT NULL,
                details TEXT,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `;
        
        // Stats table
        const statsTable = `
            CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY,
                total_followers_sent INTEGER DEFAULT 0,
                total_users_followed INTEGER DEFAULT 0,
                total_commands INTEGER DEFAULT 0,
                total_accounts_generated INTEGER DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        // Initialize stats if not exists
        const initStats = `
            INSERT OR IGNORE INTO stats (id, total_followers_sent, total_users_followed, total_commands, total_accounts_generated)
            VALUES (1, 0, 0, 0, 0)
        `;
        
        this.db.run(usersTable, (err) => {
            if (err) logger.error('Error creating users table:', err);
        });
        
        this.db.run(accountsTable, (err) => {
            if (err) logger.error('Error creating accounts table:', err);
        });
        
        this.db.run(commandsTable, (err) => {
            if (err) logger.error('Error creating commands table:', err);
        });
        
        this.db.run(statsTable, (err) => {
            if (err) logger.error('Error creating stats table:', err);
        });
        
        this.db.run(initStats, (err) => {
            if (err) logger.error('Error initializing stats:', err);
        });
    }
    
    // User operations
    async addUser(discordId, username, discriminator) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR IGNORE INTO users (discord_id, username, discriminator)
                VALUES (?, ?, ?)
            `;
            
            this.db.run(sql, [discordId, username, discriminator], function(err) {
                if (err) {
                    logger.error('Error adding user:', err);
                    reject(err);
                } else {
                    logger.info(`Added user: ${username}#${discriminator}`);
                    resolve(this.lastID);
                }
            });
        });
    }
    
    async getUser(discordId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM users WHERE discord_id = ?';
            
            this.db.get(sql, [discordId], (err, row) => {
                if (err) {
                    logger.error('Error getting user:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    async incrementUserStats(discordId, followersSent) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR IGNORE INTO users (discord_id, username, discriminator, total_commands, followers_sent, last_command_at)
                VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(discord_id) DO UPDATE SET
                total_commands = total_commands + 1,
                followers_sent = followers_sent + ?,
                last_command_at = CURRENT_TIMESTAMP
            `;
            
            // Get current user data for the INSERT part
            this.getUser(discordId).then(user => {
                const username = user ? user.username : 'Unknown';
                const discriminator = user ? user.discriminator : '0000';
                
                this.db.run(sql, [discordId, username, discriminator, followersSent, followersSent], function(err) {
                    if (err) {
                        logger.error('Error updating user stats:', err);
                        reject(err);
                    } else {
                        resolve(this.changes);
                    }
                });
            }).catch(reject);
        });
    }
    
    async getTopUsers(limit = 10) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM users 
                ORDER BY total_commands DESC, followers_sent DESC 
                LIMIT ?
            `;
            
            this.db.all(sql, [limit], (err, rows) => {
                if (err) {
                    logger.error('Error getting top users:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    // Account operations
    async addAccount(account) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO accounts (username, password, email, birthday, gender, cookie, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            const now = new Date().toISOString();
            
            this.db.run(sql, [
                account.username, 
                account.password, 
                account.email, 
                account.birthday, 
                account.gender, 
                account.cookie || null,
                now
            ], function(err) {
                if (err) {
                    logger.error('Error adding account:', err);
                    reject(err);
                } else {
                    logger.info(`Added account: ${account.username}`);
                    resolve(this.lastID);
                }
            });
        });
    }
    
    async getAllAccounts() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM accounts WHERE is_active = 1';
            
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    logger.error('Error getting accounts:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    async updateAccountUsage(username) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE accounts 
                SET last_used_at = CURRENT_TIMESTAMP, usage_count = usage_count + 1
                WHERE username = ?
            `;
            
            this.db.run(sql, [username], function(err) {
                if (err) {
                    logger.error('Error updating account usage:', err);
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }
    
    async getAccountStats() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_accounts,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_accounts,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as used_accounts,
                    AVG(usage_count) as avg_usage_per_account
                FROM accounts
            `;
            
            this.db.get(sql, [], (err, row) => {
                if (err) {
                    logger.error('Error getting account stats:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    // Command operations
    async logCommand(discordId, command, args, success, details = '') {
        return new Promise((resolve, reject) => {
            // First ensure user exists
            this.addUser(discordId, 'Unknown', '0000').then(() => {
                const sql = `
                    INSERT INTO commands (user_id, command, args, success, details)
                    VALUES (
                        (SELECT id FROM users WHERE discord_id = ?),
                        ?, ?, ?, ?
                    )
                `;
                
                this.db.run(sql, [discordId, command, JSON.stringify(args), success, details], function(err) {
                    if (err) {
                        logger.error('Error logging command:', err);
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                });
            }).catch(reject);
        });
    }
    
    async getCommandHistory(discordId, limit = 20) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT c.* FROM commands c
                JOIN users u ON c.user_id = u.id
                WHERE u.discord_id = ?
                ORDER BY c.executed_at DESC
                LIMIT ?
            `;
            
            this.db.all(sql, [discordId, limit], (err, rows) => {
                if (err) {
                    logger.error('Error getting command history:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    // Stats operations
    async updateStats(followersSent, usersFollowed, commands, accountsGenerated) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE stats SET
                total_followers_sent = total_followers_sent + ?,
                total_users_followed = total_users_followed + ?,
                total_commands = total_commands + ?,
                total_accounts_generated = total_accounts_generated + ?,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `;
            
            this.db.run(sql, [followersSent, usersFollowed, commands, accountsGenerated], function(err) {
                if (err) {
                    logger.error('Error updating stats:', err);
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }
    
    async getStats() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM stats WHERE id = 1';
            
            this.db.get(sql, [], (err, row) => {
                if (err) {
                    logger.error('Error getting stats:', err);
                    reject(err);
                } else {
                    resolve(row || {
                        total_followers_sent: 0,
                        total_users_followed: 0,
                        total_commands: 0,
                        total_accounts_generated: 0,
                        updated_at: new Date().toISOString()
                    });
                }
            });
        });
    }
    
    // Database maintenance
    async cleanupOldCommands(days = 30) {
        return new Promise((resolve, reject) => {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffStr = cutoffDate.toISOString();
            
            const sql = 'DELETE FROM commands WHERE executed_at < ?';
            
            this.db.run(sql, [cutoffStr], function(err) {
                if (err) {
                    logger.error('Error cleaning up old commands:', err);
                    reject(err);
                } else {
                    logger.info(`Cleaned up ${this.changes} old commands`);
                    resolve(this.changes);
                }
            });
        });
    }
    
    async backup() {
        return new Promise((resolve, reject) => {
            const backupPath = path.join(__dirname, `backup_${Date.now()}.db`);
            
            // Simple file copy for backup
            const fs = require('fs');
            fs.copyFileSync(this.dbPath, backupPath);
            
            logger.info(`Database backed up to: ${backupPath}`);
            resolve(backupPath);
        });
    }
    
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    logger.error('Error closing database:', err);
                } else {
                    logger.info('Database connection closed');
                }
            });
        }
    }
}

module.exports = Database;