require('dotenv').config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const instagramUrlDirect = require("instagram-url-direct");
const sharp = require("sharp");
const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("hello");
});

const port = 3000;
app.listen(port, () => {
    console.log("server is running on port 3000");
});

// Replace with your Telegram Bot API token
const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

// In-memory storage for user message counts and timestamps
// For production, consider using a persistent storage solution like Redis
const userRequests = {};

// List of admin usernames or chat IDs
const admins = ["sa_nket1"];

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const username = msg.from.username || 'unknown user';

    if (!messageText) {
        console.log("Received empty message from", username);
        return;
    }

    // Initialize user requests if not present
    if (!userRequests[chatId]) {
        userRequests[chatId] = {
            count: 0,
            timestamps: [],
            username: username
        };
    } else {
        userRequests[chatId].username = username; // Update username if it has changed
    }

    // Current timestamp in milliseconds
    const currentTime = Date.now();

    // Filter out timestamps older than 24 hours
    userRequests[chatId].timestamps = userRequests[chatId].timestamps.filter(
        timestamp => currentTime - timestamp < 24 * 60 * 60 * 1000
    );

    // Update request count
    const requestCount = userRequests[chatId].timestamps.length;

    if (requestCount >= 10) {
        bot.sendMessage(
            chatId,
            "You have reached the daily limit of 10 Instagram links. Please try again tomorrow."
        );
        return;
    }

    if (messageText.toLowerCase() === "/start") {
        bot.sendMessage(
            chatId,
            `Welcome to Instra, @${username}!\nSend me an Instagram video or image link to download it.`
        );
        return;
    }

    // Implementing the reset command for admins
    if (messageText.startsWith("/reset") && admins.includes(username)) {
        const parts = messageText.split(" ");
        if (parts.length < 2) {
            bot.sendMessage(chatId, "Please provide the username or chat ID to reset.");
            return;
        }

        const target = parts[1].replace("@", ""); // Remove '@' if provided
        let targetId = null;

        // Find chat ID by username
        for (const [id, data] of Object.entries(userRequests)) {
            if (data.username === target || id === target) {
                targetId = id;
                break;
            }
        }

        if (targetId) {
            userRequests[targetId] = {
                count: 0,
                timestamps: [],
                username: userRequests[targetId].username // Preserve the username
            };
            bot.sendMessage(chatId, `The usage limit for ${target} has been reset.`);
            console.log(`Usage limit reset for ${target}.`);
        } else {
            bot.sendMessage(chatId, "User not found. Please check the username or chat ID.");
        }
        return;
    }

    // Check if the message contains a valid Instagram post URL
    if (messageText.includes("instagram.com")) {
        try {
            console.log(`Received Instagram URL from ${username}: ${messageText}`);

            // Inform the user that the file is being processed
            bot.sendMessage(chatId, "Please wait, processing the file...");

            // Add timestamp of the current request
            userRequests[chatId].timestamps.push(currentTime);

            // Extract direct URLs (both images and videos) from Instagram post
            const directUrls = await instagramUrlDirect(messageText);
            console.log("Direct URLs:", directUrls);

            if (!directUrls || !directUrls.url_list || directUrls.url_list.length === 0) {
                throw new Error("No direct URLs found");
            }

            // Introduce a delay of 5 seconds
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Iterate through each URL and handle based on type (image or video)
            for (const url of directUrls.url_list) {
                const response = await axios({
                    url: url,
                    method: "GET",
                    responseType: "arraybuffer",
                });

                if (url.includes(".jpg") || url.includes(".jpeg") || url.includes(".png")) {
                    // Handle image download and convert to JPG
                    const imageBuffer = await sharp(response.data)
                        .jpeg()
                        .toBuffer();

                    console.log(`Image converted to JPG successfully from ${username}: ${url}`);

                    // Send the image file with a caption
                    await bot.sendPhoto(chatId, imageBuffer, {
                        caption: "Download from Instra Bot: \n@InstagramDownloadInstaBot",
                    });

                    console.log(`Image and caption sent successfully to ${username}: ${url}`);
                } else {
                    // Handle video download
                    console.log(`Video downloaded successfully from ${username}: ${url}`);

                    // Send the video file with a caption
                    await bot.sendVideo(chatId, response.data, {
                        caption: "Download from Instra Bot: \n@InstagramDownloadInstaBot",
                    });

                    console.log(`Video and caption sent successfully to ${username}: ${url}`);
                }
            }
        } catch (error) {
            console.error(`Error processing media for ${username}:`, error);
            bot.sendMessage(
                chatId,
                "We're currently experiencing technical issues. We'll resolve this as soon as possible. Thank you for your understanding!"
            );
        }
        return;
    }

    // If the message is not a command or a valid link, reply accordingly
    bot.sendMessage(
        chatId,
        "Please send a valid Instagram video or image link."
    );
});
