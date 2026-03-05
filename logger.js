const fs = require('fs');
const path = require('path');
const moment = require('moment');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, 'logs');
        this.logFile = path.join(this.logDir, 'bot.log');
        
        // Ensure logs directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        
        // Create log file if it doesn't exist
        if (!fs.existsSync(this.logFile)) {
            fs.writeFileSync(this.logFile, '');
        }
    }
    
    log(level, message, error = null) {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const logEntry = `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
        
        // Console output
        const colors = {
            info: '\x1b[36m',    // Cyan
            warn: '\x1b[33m',    // Yellow
            error: '\x1b[31m',   // Red
            success: '\x1b[32m', // Green
            debug: '\x1b[35m'    // Magenta
        };
        
        const reset = '\x1b[0m';
        const color = colors[level] || '';
        
        console.log(`${color}${logEntry}${reset}`);
        
        // File output
        try {
            fs.appendFileSync(this.logFile, logEntry + '\n');
            
            // Log error details if provided
            if (error && level === 'error') {
                const errorDetails = `[${timestamp}] [ERROR DETAILS]: ${error.stack || error.message || error}`;
                fs.appendFileSync(this.logFile, errorDetails + '\n');
            }
        } catch (e) {
            console.error('Failed to write to log file:', e);
        }
    }
    
    info(message) {
        this.log('info', message);
    }
    
    warn(message) {
        this.log('warn', message);
    }
    
    error(message, error = null) {
        this.log('error', message, error);
    }
    
    success(message) {
        this.log('success', message);
    }
    
    debug(message) {
        this.log('debug', message);
    }
    
    // Log command usage
    logCommand(userId, command, args, success, details = '') {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const status = success ? 'SUCCESS' : 'FAILED';
        const logEntry = `[${timestamp}] [COMMAND] User: ${userId}, Command: ${command}, Args: ${JSON.stringify(args)}, Status: ${status}, Details: ${details}`;
        
        console.log(`\x1b[36m${logEntry}\x1b[0m`);
        
        try {
            fs.appendFileSync(this.logFile, logEntry + '\n');
        } catch (e) {
            console.error('Failed to write command log:', e);
        }
    }
    
    // Log account operations
    logAccountOperation(operation, account, success, details = '') {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const status = success ? 'SUCCESS' : 'FAILED';
        const logEntry = `[${timestamp}] [ACCOUNT] Operation: ${operation}, Account: ${account.username}, Status: ${status}, Details: ${details}`;
        
        console.log(`\x1b[33m${logEntry}\x1b[0m`);
        
        try {
            fs.appendFileSync(this.logFile, logEntry + '\n');
        } catch (e) {
            console.error('Failed to write account log:', e);
        }
    }
    
    // Log system events
    logSystemEvent(event, details = '') {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const logEntry = `[${timestamp}] [SYSTEM] Event: ${event}, Details: ${details}`;
        
        console.log(`\x1b[35m${logEntry}\x1b[0m`);
        
        try {
            fs.appendFileSync(this.logFile, logEntry + '\n');
        } catch (e) {
            console.error('Failed to write system log:', e);
        }
    }
    
    // Clear old logs (keep last 7 days)
    cleanup() {
        try {
            const files = fs.readdirSync(this.logDir);
            const weekAgo = moment().subtract(7, 'days');
            
            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                
                if (moment(stats.mtime) < weekAgo) {
                    fs.unlinkSync(filePath);
                    this.log('info', `Cleaned up old log file: ${file}`);
                }
            });
        } catch (error) {
            this.error('Error during log cleanup:', error);
        }
    }
    
    // Get recent logs
    getRecentLogs(lines = 100) {
        try {
            const logContent = fs.readFileSync(this.logFile, 'utf8');
            const logLines = logContent.split('\n').filter(line => line.trim());
            return logLines.slice(-lines);
        } catch (error) {
            this.error('Error reading recent logs:', error);
            return [];
        }
    }
}

module.exports = new Logger();