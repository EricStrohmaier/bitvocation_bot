"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
/* eslint-disable max-len */
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const functions_1 = require("./functions");
const parameters_1 = require("./parameters");
const translation_1 = require("./translation");
const setBotCommands_1 = require("./setBotCommands");
if (!process.env.BITVOCATION_BOT_TOKEN) {
    console.error("Please provide your bot's API key on the .env file.");
    process.exit();
}
const token = process.env.BITVOCATION_BOT_TOKEN;
exports.bot = new node_telegram_bot_api_1.default(token, { polling: true });
exports.handler = async (event) => {
    // const botUsername = (await bot.getMe()).username;
    (0, setBotCommands_1.setBotCommands)(exports.bot);
    let waitingForKeywords = false;
    let setJobAlert = false;
    const fetchInterval = 3 * 60 * 60 * 1000;
    setInterval(() => {
        (0, functions_1.fetchAndPostLatestEntries)(exports.bot);
    }, fetchInterval);
    (0, functions_1.fetchAndPostLatestEntries)(exports.bot);
    // Messages for conversations.
    exports.bot.on("message", async (msg) => {
        var _a, _b, _c, _d;
        const chatId = msg.chat.id;
        // const newChat = await readUserEntry(msg.chat.id.toString());
        // if (!newChat) {
        //     createUserEntry(msg.chat.id.toString());
        // }
        if (setJobAlert &&
            ((_a = msg.text) === null || _a === void 0 ? void 0 : _a.startsWith("/")) &&
            !msg.text.startsWith("/jobalert")) {
            setJobAlert = false;
            await exports.bot.sendMessage(chatId, "Something went wrong. Please try again to set up a /jobalert.");
        }
        if (setJobAlert) {
            const newKeywords = (_c = (_b = msg.text) === null || _b === void 0 ? void 0 : _b.split(",")) !== null && _c !== void 0 ? _c : [];
            // Remove duplicates and empty strings
            const uniqueNewKeywords = newKeywords
                .map((keyword) => keyword.trim())
                .filter((keyword) => keyword !== "");
            const response = await (0, functions_1.updateJobAlerts)(chatId.toString(), uniqueNewKeywords);
            if (response) {
                await exports.bot.sendMessage(chatId, "Job alert updated!");
            }
            else {
                await exports.bot.sendMessage(chatId, "Something went wrong. Please try again to set up a /jobalert.");
            }
            setJobAlert = false;
        }
        if (waitingForKeywords) {
            const chatId = msg.chat.id;
            waitingForKeywords = false;
            const keywords = ((_d = msg.text) === null || _d === void 0 ? void 0 : _d.split(",")) || [];
            const response = await (0, functions_1.getKeyword)(keywords);
            if (response && (response === null || response === void 0 ? void 0 : response.length) > 0) {
                await (0, functions_1.sendParseMessage)(chatId, response, exports.bot, [
                    "with " + keywords.join(", "),
                ]);
                return;
            }
            else {
                await exports.bot.sendMessage(chatId, "No jobs found for the keywords provided.");
                return;
            }
        }
    });
    exports.bot.onText(/^\/(\w+)(@\w+)?(?:\s.\*)?/, async (msg, match) => {
        var _a, _b;
        if (!match)
            return;
        let command;
        if (match.input.split(" ").length != 1) {
            command = match.input.split(" ").shift();
        }
        else {
            const chatId = msg.chat.id.toString();
            const userConfigs = (0, functions_1.getUserConfigs)();
            const userLanguage = ((_a = userConfigs[chatId]) === null || _a === void 0 ? void 0 : _a.language) || parameters_1.PARAMETERS.LANGUAGE;
            const newChat = await (0, functions_1.readUserEntry)(chatId);
            if (!newChat) {
                (0, functions_1.createUserEntry)(chatId);
            }
            command = match.input;
            if (!(command.startsWith("/start") ||
                command.startsWith("/value4value") ||
                command.startsWith("/jobs") ||
                command.startsWith("/jobalert") ||
                command.startsWith("/privacy") ||
                command.startsWith("/help") ||
                command.startsWith("/freeguide"))) {
                await exports.bot.sendMessage(msg.chat.id, (0, functions_1.formatVariables)(translation_1.TRANSLATIONS[userLanguage].errors["generic-error"], {
                    command,
                }), { reply_to_message_id: msg.message_id });
                return;
            }
        }
        // if (command?.endsWith('@' + botUsername)) {
        //     command = command.replace('@' + botUsername, '');
        // } else if (msg.chat.type != 'private') {
        //     return;
        // }
        const chatId = msg.chat.id.toString();
        const userConfigs = (0, functions_1.getUserConfigs)();
        const userLanguage = ((_b = userConfigs[chatId]) === null || _b === void 0 ? void 0 : _b.language) || parameters_1.PARAMETERS.LANGUAGE;
        setJobAlert = false;
        switch (command) {
            case "/start":
                (async () => {
                    const getCommands = await exports.bot.getMyCommands();
                    const commands = getCommands.map((command) => {
                        return `/${command.command} - ${command.description}`;
                    });
                    const startMessage = 'Hey there, I’m your friendly Bitvocation bot! 👋\n\nI scrape the internet for all the latest job openings in Bitcoin and post them in the @bitvocationfeed.\n\nI was thought up <a href="https://twitter.com/connecteconomy"><b>by Anja</b></a> and created <a href="https://www.linkedin.com/in/eric-strohmaier-3a0767267/"><b>by Eric</b></a>';
                    const boldHeader = "<b>Here are the commands you can use to work with me: \n</b>";
                    const commandsMessage = boldHeader + commands.join("\n");
                    const combinedMessage = startMessage +
                        "\n\n" +
                        commandsMessage +
                        "\n\n" +
                        "<b>🔴 IMPORTANT INFO REGARDING YOUR DATA & PRIVACY 🔴</b>\n\nI understand that as a Bitcoiner, you want to know what happens with your data. To provide you with personalized job alerts,<b>I need to store your chosen keywords and the associated chat ID.</b> \n\nI do not know who you are or what your Telegram handle is, though.\n\nIf you are not comfortable with this, please do not chat with me. By engaging with me, you acknowledge that you have been made aware of this.";
                    const imageFilePath = "./public/bot-img.jpg";
                    await exports.bot.sendPhoto(msg.chat.id, imageFilePath, {
                        caption: combinedMessage,
                        parse_mode: "HTML",
                    });
                })();
                break;
            case "/value4value":
                (async () => {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "Zap sats ⚡",
                                        url: "https://getalby.com/p/strohstacks",
                                    },
                                ],
                            ],
                        },
                    };
                    await exports.bot.sendMessage(msg.chat.id, translation_1.TRANSLATIONS[userLanguage].general.donate, keyboard);
                })();
                break;
            case "/jobs":
                if (msg.chat.id) {
                    const chatId = msg.chat.id.toString();
                    //check how it where it presses explore categories
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "All the Jobs of the last 7 days",
                                        callback_data: "last-week",
                                    },
                                ],
                                [
                                    {
                                        text: "Search the last 30 days by keyword",
                                        callback_data: "query-keyword",
                                    },
                                ],
                                [
                                    {
                                        text: "Explore Categories",
                                        callback_data: "explore-categories",
                                    },
                                ],
                            ],
                        },
                    };
                    await exports.bot.sendMessage(chatId, translation_1.TRANSLATIONS[userLanguage].general["latest-jobs"], keyboard);
                }
                break;
            case "/jobalert":
                (async () => {
                    const chatId = msg.chat.id.toString();
                    const response = await (0, functions_1.hasJobAlert)(chatId);
                    const messageSetup = "To set up a job alert, enter keywords separated by commas.\n\nFor example:  Remote, Customer Support, Pay in Bitcoin";
                    const messageUpdate = "Simply add keywords, separated by commas, to receive job alerts.\n ";
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "See current Alert",
                                        callback_data: "current-alerts",
                                    },
                                    { text: "Delete Job Alert", callback_data: "delete-alerts" },
                                ],
                            ],
                        },
                    };
                    const sendKeyboard = (response === null || response === void 0 ? void 0 : response.length) > 0 ? keyboard : undefined;
                    const sendMessage = (response === null || response === void 0 ? void 0 : response.length) > 0 ? messageUpdate : messageSetup;
                    await exports.bot.sendMessage(chatId, sendMessage, sendKeyboard);
                    setJobAlert = true;
                })();
                break;
            case "/help":
                (async () => {
                    const getCommands = await exports.bot.getMyCommands();
                    const commands = getCommands.map((command) => {
                        return `/${command.command} - ${command.description}`;
                    });
                    const header = translation_1.TRANSLATIONS[userLanguage].general["help"];
                    const commandsMessage = header + commands.join("\n");
                    await exports.bot.sendMessage(msg.chat.id, commandsMessage);
                })();
                break;
            case "/freeguide":
                (async () => {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "Download it here",
                                        url: "https://bitvocation.com",
                                    },
                                ],
                            ],
                        },
                    };
                    const message = "Hey there, I’m Anja, the founder of Bitvocation.\n\nI made a free guide “How to find your first job in Bitcoin” for you, which you can get on the Bitvocation website.\nEnjoy!";
                    const anjaIMG = "./public/anja-img.jpg";
                    await exports.bot.sendPhoto(msg.chat.id, anjaIMG, {
                        caption: message,
                        parse_mode: "HTML",
                        reply_markup: keyboard.reply_markup,
                    });
                })();
                break;
            case "/privacy":
                (async () => {
                    const message = "<b>🔴 IMPORTANT INFO REGARDING YOUR DATA & PRIVACY 🔴</b>\n\nI understand that as a Bitcoiner, you want to know what happens with your data. To provide you with personalized job alerts, I need to store your chosen keywords and the associated chat ID.\n\n<b>I do not know who you are or what your Telegram handle is.</b>\n\nIf you are not comfortable with this, please do not chat with me. By engaging with me, you acknowledge that you have read this message.";
                    // const keyboard = {
                    //     reply_markup: {
                    //         inline_keyboard: [
                    //             [
                    //                 {
                    //                     text: 'Accept',
                    //                     callback_data: 'accept-privacy',
                    //                 },
                    //                 {
                    //                     text: 'Decline',
                    //                     callback_data: 'decline-privacy',
                    //                 },
                    //             ],
                    //         ],
                    //     },
                    // };
                    await exports.bot.sendMessage(chatId, message, { parse_mode: "HTML" });
                })();
                break;
            default:
                break;
        }
    });
    exports.bot.on("callback_query", async (callbackQuery) => {
        var _a;
        if (!callbackQuery.message)
            return;
        const chatId = callbackQuery.message.chat.id;
        const userConfigs = (0, functions_1.getUserConfigs)();
        const userLanguage = ((_a = userConfigs[chatId]) === null || _a === void 0 ? void 0 : _a.language) || parameters_1.PARAMETERS.LANGUAGE;
        let messageText = "";
        switch (callbackQuery.data) {
            case "accept-privacy":
                (async () => {
                    (0, functions_1.handlePrivacy)(chatId, true);
                })();
                break;
            case "decline-privacy":
                (async () => {
                    (0, functions_1.handlePrivacy)(chatId, false);
                })();
                break;
            case "last-week":
                (async () => {
                    const JobArray = await (0, functions_1.getLatestJobs)();
                    await (0, functions_1.sendParseMessage)(chatId, JobArray, exports.bot, [""]);
                })();
                break;
            case "current-alerts":
                (async () => {
                    const jobAlertsData = await (0, functions_1.hasJobAlert)(chatId.toString());
                    if (jobAlertsData && jobAlertsData.length > 0) {
                        const formattedJobAlerts = jobAlertsData.join(", ");
                        const message = jobAlertsData.length === 1
                            ? `Your current job alert is:\n\n ${formattedJobAlerts}`
                            : `Your current job alerts are:\n\n ${formattedJobAlerts}`;
                        exports.bot.sendMessage(chatId, message);
                    }
                    else {
                        exports.bot.sendMessage(chatId, "You don't have any job alerts set up.");
                    }
                })();
                break;
            case "delete-alerts":
                (async () => {
                    var _a;
                    const chatId = (_a = callbackQuery.message) === null || _a === void 0 ? void 0 : _a.chat.id;
                    if (!chatId)
                        return;
                    const response = await (0, functions_1.deleteJobAlerts)(chatId.toString());
                    if (response) {
                        await exports.bot.sendMessage(chatId, "Job alert deleted!");
                    }
                    else {
                        await exports.bot.sendMessage(chatId, "Something went wrong. Please try again.");
                    }
                })();
                break;
            case "query-keyword":
                waitingForKeywords = true;
                messageText = translation_1.TRANSLATIONS[userLanguage].general["query-keywords"];
                break;
            case "explore-categories":
                (async () => {
                    var _a, _b;
                    const chatId = (_a = callbackQuery.message) === null || _a === void 0 ? void 0 : _a.chat.id.toString();
                    if (!chatId)
                        return;
                    const message_id = (_b = callbackQuery.message) === null || _b === void 0 ? void 0 : _b.message_id.toString();
                    if (message_id) {
                        await exports.bot.deleteMessage(chatId, message_id);
                    }
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "Engineering/IT", callback_data: "engineering" },
                                    { text: "Customer Support", callback_data: "customer-op" },
                                ],
                                [
                                    { text: "Legal", callback_data: "legal" },
                                    { text: "Design", callback_data: "design" },
                                ],
                                [
                                    { text: "Finance", callback_data: "finance" },
                                    { text: "Sales/Marketing", callback_data: "sales" },
                                ],
                                [
                                    { text: "HR", callback_data: "hr" },
                                    { text: "Creative", callback_data: "creative" },
                                    { text: "Volunteering", callback_data: "volunteering" },
                                ],
                            ],
                        },
                    };
                    await exports.bot.sendMessage(chatId, translation_1.TRANSLATIONS[userLanguage].general.categories, keyboard);
                })();
                break;
            case "design":
                (async () => {
                    const catArray = await (0, functions_1.getLatestJobs)([
                        "design",
                        "ui",
                        "ux",
                        "UI/UX",
                        "graphic",
                        "web design",
                    ]);
                    await (0, functions_1.sendParseMessage)(chatId, catArray, exports.bot, ["in Design"]);
                })();
                break;
            case "sales":
                (async () => {
                    const catArray = await (0, functions_1.getLatestJobs)([
                        "sales",
                        "marketing",
                        "Business Development",
                        "BizDev",
                        "Sales Development",
                        "Inside Sales Representative",
                        "Capital Raiser",
                        "Fundraising",
                        "Paid Acquisition",
                        "Event Management",
                    ]);
                    await (0, functions_1.sendParseMessage)(chatId, catArray, exports.bot, ["in Sales/Marketing"]);
                })();
                break;
            case "legal":
                (async () => {
                    const catArray = await (0, functions_1.getLatestJobs)([
                        "Lawyer",
                        "Counsel",
                        "Compliance",
                        "Regulatory",
                        "AML",
                        "KYC",
                        "risk analyst",
                    ]);
                    await (0, functions_1.sendParseMessage)(chatId, catArray, exports.bot, ["in Legal"]);
                })();
                break;
            case "engineering":
                (async () => {
                    const catArray = await (0, functions_1.getLatestJobs)([
                        "engineering",
                        "software",
                        "developer",
                        "devops",
                        "Mobile App,",
                        "Security",
                        "Technician",
                        "QA",
                    ]);
                    await (0, functions_1.sendParseMessage)(chatId, catArray, exports.bot, ["in Engineering/IT"]);
                })();
                break;
            case "customer-op":
                (async () => {
                    const catArray = await (0, functions_1.getLatestJobs)([
                        "Customer Success",
                        "Customer Happiness",
                        "Customer Service",
                        "Technical Support",
                        "Helpdesk",
                        "Onboarding",
                        "Community Manager",
                        "Operations",
                    ]);
                    await (0, functions_1.sendParseMessage)(chatId, catArray, exports.bot, [
                        "in Customer Support",
                    ]);
                })();
                break;
            case "finance":
                (async () => {
                    const catArray = await (0, functions_1.getLatestJobs)([
                        "Personal Assistant",
                        "risk analyst,",
                        "trading",
                        "fund manager",
                        "Finance",
                    ]);
                    await (0, functions_1.sendParseMessage)(chatId, catArray, exports.bot, [
                        "in Operations/Finance",
                    ]);
                })();
                break;
            case "hr":
                (async () => {
                    const catArray = await (0, functions_1.getLatestJobs)([
                        "Human Resources",
                        "People Operations",
                        "People Business Partner",
                        "Recruiter",
                        "Talent Acquisition",
                    ]);
                    await (0, functions_1.sendParseMessage)(chatId, catArray, exports.bot, ["in HR"]);
                })();
                break;
            case "creative":
                (async () => {
                    const catArray = await (0, functions_1.getLatestJobs)([
                        "Content Creator",
                        "Copywriter",
                        "video editor",
                        "Social Media",
                        "Writer",
                    ]);
                    await (0, functions_1.sendParseMessage)(chatId, catArray, exports.bot, ["in Creative"]);
                })();
                break;
            case "volunteering":
                (async () => {
                    const catArray = await (0, functions_1.getLatestJobs)([
                        "volunteer",
                        "intern",
                        "internship",
                        "apprentice",
                        "volunteering",
                    ]);
                    await (0, functions_1.sendParseMessage)(chatId, catArray, exports.bot, ["in Volunteering"]);
                })();
                break;
            default:
                break;
        }
        if (messageText) {
            await exports.bot.sendMessage(chatId, messageText);
        }
    });
    console.log("Bot Started!");
    await exports.bot.processUpdate(event.body);
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Bot processed the message",
        }),
    };
};
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1); // exit application when there is an uncaught exception
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Application specific logging, throwing an error, or other logic here
});
process.on("SIGINT", () => {
    console.log("\nExiting...");
    exports.bot.stopPolling();
    process.exit(0);
});
process.on("SIGTERM", () => {
    console.log("\nExiting...");
    exports.bot.stopPolling();
    process.exit(0);
});
//on error restart bot
// process.on('uncaughtException', function (err) {
//     console.log('SYSTEM: uncaughtExpection', err);
//     bot.stopPolling();
//     setTimeout(() => {
//         bot.startPolling();
//     }, 5000);
// });
