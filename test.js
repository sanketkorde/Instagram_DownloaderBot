const TelegramBot = require('node-telegram-bot-api');

// Replace with your actual bot token
const token = process.env.TOKEN;

// Create a new bot instance
const bot = new TelegramBot(token, { polling: true });

// Message to be sent to users
const maintenanceMessage = "The bot is currently under maintenance. We apologize for the inconvenience.";

// Listen for any kind of message and send the maintenance message
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    // Send the maintenance message to the user
    bot.sendMessage(chatId, maintenanceMessage)
        .then(() => {
            console.log(`Sent maintenance message to chat ID: ${chatId}`);
        })
        .catch((error) => {
            console.error(`Failed to send message to chat ID ${chatId}:`, error);
        });
});

console.log('Maintenance bot is running...');
