require('dotenv').config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const instagramUrlDirect = require("instagram-url-direct");

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
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    if (!messageText) {
        console.log("Received empty message");
        return;
    }

    if (messageText.toLowerCase() === "/start") {
        bot.sendMessage(
            chatId,
            "Welcome to Instra!\nSend me an Instagram video or image link to download it.",
        );
        return;
    }

    // Check if message contains a valid Instagram post URL
    if (messageText.includes("instagram.com")) {
        try {
            console.log("Received Instagram URL:", messageText);

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
                if (
                    url.includes(".jpg") ||
                    url.includes(".jpeg") ||
                    url.includes(".png")
                ) {
                    // Handle image download
                    const response = await axios({
                        url: url,
                        method: "GET",
                        responseType: "stream",
                    });

                    console.log("Image downloaded successfully:", url);

                    // Send the image file with a caption
                    await bot.sendPhoto(chatId, response.data, {
                        caption:
                            "Download from Instra Bot: \n@InstagramDownloadInstaBot",
                    });

                    console.log("Image and caption sent successfully:", url);
                } else {
                    // Handle video download (already implemented in your original code)
                    const response = await axios({
                        url: url,
                        method: "GET",
                        responseType: "stream",
                    });

                    console.log("Video downloaded successfully:", url);

                    // Send the video file with a caption
                    await bot.sendVideo(chatId, response.data, {
                        caption:
                            "Download from Instra Bot: \n@InstagramDownloadInstaBot",
                    });

                    console.log("Video and caption sent successfully:", url);
                }
            }
        } catch (error) {
            console.error("Error processing media:", error);
            bot.sendMessage(
                chatId,
                "Sorry, something went wrong while processing the media. Please try again with a different link.",
            );
        }
    } else {
        bot.sendMessage(
            chatId,
            "Please send a valid Instagram video or image link.",
        );
    }
});
