require('dotenv').config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const instagramUrlDirect = require("instagram-url-direct");
const sharp = require("sharp");
const fs = require("fs");

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

const usersFilePath = './users.json';

// Load or initialize the users file
const loadUsers = () => {
    if (fs.existsSync(usersFilePath)) {
        const usersData = fs.readFileSync(usersFilePath);
        return JSON.parse(usersData);
    }
    return [];
};

const saveUsers = (users) => {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

const addUser = (chatId) => {
    const users = loadUsers();
    if (!users.includes(chatId)) {
        users.push(chatId);
        saveUsers(users);
    }
};

// Function to send an announcement to all users
const announceUpdate = async (message) => {
    const users = loadUsers();
    for (const chatId of users) {
        try {
            await bot.sendMessage(chatId, message);
            console.log(`Announcement sent to ${chatId}`);
        } catch (error) {
            console.error(`Failed to send announcement to ${chatId}:`, error);
        }
    }
};

// Uncomment this line to send an announcement when the bot starts
// announceUpdate("The bot has been updated with new features!");

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const username = msg.from.username || 'there';

    addUser(chatId);

    if (!messageText) {
        console.log("Received empty message");
        return;
    }

    if (messageText.toLowerCase() === "/start") {
        bot.sendMessage(
            chatId,
            `Welcome to Instra, ${username}!\nSend me an Instagram video or image link to download it.`,
        );
        return;
    }

    // Check if message contains a valid Instagram post URL
    if (messageText.includes("instagram.com")) {
        try {
            console.log(`Received Instagram URL from ${username}: ${messageText}`);

            // Inform user that the file is being processed
            bot.sendMessage(chatId, "Please wait, processing the file...");

            // Extract direct URLs (both images and videos) from Instagram post
            const directUrls = await instagramUrlDirect(messageText);
            console.log("Direct URLs:", directUrls);

            if (
                !directUrls ||
                !directUrls.url_list ||
                directUrls.url_list.length === 0
            ) {
                throw new Error("No direct URLs found");
            }

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
                "We're currently experiencing technical issues, we'll resolve this as soon as possible. Thank you for your understanding!",
            );
        }
        return;
    } else {
        bot.sendMessage(
            chatId,
            "Please send a valid Instagram video or image link.",
        );
    }
});
