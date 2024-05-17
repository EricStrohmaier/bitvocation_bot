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
exports.handlePrivacy = exports.deleteJobAlerts = exports.updateJobAlerts = exports.hasJobAlert = exports.readAllJobAlerts = exports.readUserEntry = exports.createUserEntry = exports.fetchAndPostLatestEntries = exports.calculateTimeRange = exports.sendParseMessage = exports.getKeyword = exports.getLatestJobs = exports.supabase = exports.formatVariables = exports.buildLastMessage = exports.generatePicture = exports.resetBotMemory = exports.switchLanguage = exports.getUserConfigs = exports.removeCommandNameFromCommand = exports.sleep = void 0;
/* eslint-disable max-len */
const openai_1 = require("openai");
const fs_1 = __importDefault(require("fs"));
const supabase_js_1 = require("@supabase/supabase-js");
const date_fns_1 = require("date-fns");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const openai = new openai_1.OpenAIApi(new openai_1.Configuration({ apiKey: process.env.OPENAI_API_KEY }));
/** A simple async sleep function.
 * @example
 * await sleep(2000);
 * console.log('Two seconds have passed.');
 */
function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
exports.sleep = sleep;
// /** Escapes a string for it to be used in a markdown message.
//  * @param {string} input - The input message.
//  * @returns {string} The escaped message.
//  */
// function escapeForMarkdown(input: string): string {
//     return input.replace('_', '\\_')
//         .replace('*', '\\*')
//         .replace('[', '\\[')
//         .replace('`', '\\`')
//         .replace('.', '\\.');
// }
/** Removes the name of the command from the command's message.
 * @param {string} input - The raw message.
 * @returns {string} The message without the `/command`.
 */
function removeCommandNameFromCommand(input) {
    const ar = input.split(" ");
    ar.shift();
    return ar.join(" ");
}
exports.removeCommandNameFromCommand = removeCommandNameFromCommand;
let lastMessage = "";
/**
 * Retrieves the current user configurations from the file.
 * @returns {Record<string, UserConfig>} - The user configurations.
 */
function getUserConfigs() {
    return fs_1.default.existsSync("./user-config.json")
        ? JSON.parse(fs_1.default.readFileSync("./user-config.json").toString())
        : {};
}
exports.getUserConfigs = getUserConfigs;
/**
 * Switches bot's language for a specific user.
 * @param {string} chatId - The unique identifier for the user.
 * @param {'en' | 'de' | string} language - The language the bot will now speak.
 */
function switchLanguage(chatId, language) {
    // Retrieve the current user configuration
    let userConfigs = {};
    if (fs_1.default.existsSync("./user-config.json")) {
        userConfigs = JSON.parse(fs_1.default.readFileSync("./user-config.json").toString());
    }
    const userConfig = userConfigs[chatId] || { chatId, language: "" };
    // Update the language for the specific user
    userConfig.language = language;
    // Save the updated user configuration
    userConfigs[chatId] = userConfig;
    fs_1.default.writeFileSync("./user-config.json", JSON.stringify(userConfigs, null, 2), "utf8");
}
exports.switchLanguage = switchLanguage;
/** Resets the bot's memory about previous messages. */
function resetBotMemory() {
    lastMessage = "";
}
exports.resetBotMemory = resetBotMemory;
/** Generates a picture using DALL·E 2.
 * @param {string} input - The prompt for the picture.
 * @returns {Promise<string>} The URL of the generated image.
 */
async function generatePicture(input) {
    return new Promise((resolve, reject) => {
        openai
            .createImage({
            prompt: input,
            response_format: "url",
        })
            .then((data) => {
            resolve(data.data.data[0].url || "");
        })
            .catch((e) => reject(e));
    });
}
exports.generatePicture = generatePicture;
/** Formats the data about a message to be used later as a history for the AI in case
 * CONTINUOUS_CONVERSATION is `true`.
 * @param {string} lastUser - The username.
 * @param {string} lastInput - The message.
 * @param {string} lastAnswer - The AI's completion.
 * @returns {string} The formatted message.
 */
function buildLastMessage(lastUser, lastInput, lastAnswer) {
    return formatVariables(`${lastUser}: ###${lastInput}###\n$name: ###${lastAnswer}###\n`);
}
exports.buildLastMessage = buildLastMessage;
/** Replace `$placeholders` for the actual values of the variables.
 * @example formatVariables("Hello, $username.", { username: "john" }) // "Hello, john."
 * @param {string} input - The unformatted string.
 * @param {{ username?: string, command?: string }} optionalParameters -
 * The `username` or the `command` variables.
 * @returns {string} The formatted string.
 */
function formatVariables(input, optionalParameters) {
    return input
        .replace("$username", (optionalParameters === null || optionalParameters === void 0 ? void 0 : optionalParameters.username) || "user")
        .replace("$command", (optionalParameters === null || optionalParameters === void 0 ? void 0 : optionalParameters.command) || "command");
}
exports.formatVariables = formatVariables;
if (!process.env.SUPABASE_URL && !process.env.SUPABASE_KEY) {
    throw new Error("No Supabase URL provided.");
}
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_KEY;
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
async function getLatestJobs(keywords) {
    try {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        const { data: jobs, error } = await exports.supabase
            .from("job_table")
            .select("*")
            .gte("created_at", sevenDaysAgo.toISOString())
            .lte("created_at", now.toISOString())
            .order("created_at", { ascending: false });
        if (error) {
            throw new Error(`Error fetching latest jobs: ${error.message}`);
        }
        if (!jobs || jobs.length === 0) {
            return null;
        }
        if (!keywords) {
            return jobs;
        }
        const filteredJobs = jobs.filter((job) => keywords === null || keywords === void 0 ? void 0 : keywords.some((keyword) => Object.values(job)
            .filter((value) => typeof value === "string" || Array.isArray(value))
            .map((value) => (Array.isArray(value) ? value.join(" ") : value))
            .some((value) => value.toLowerCase().includes(keyword.toLowerCase()))));
        return filteredJobs;
    }
    catch (error) {
        console.error(error);
        return null;
    }
}
exports.getLatestJobs = getLatestJobs;
async function getKeyword(keywords) {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const { data: jobs } = await exports.supabase
            .from("job_table")
            .select()
            .gte("created_at", thirtyDaysAgo.toISOString())
            .lte("created_at", now.toISOString())
            .order("created_at", { ascending: false });
        if (!jobs || jobs.length === 0) {
            return null;
        }
        if (!keywords) {
            return jobs;
        }
        const filteredJobs = jobs.filter((job) => keywords.some((keyword) => Object.values(job)
            .filter((value) => typeof value === "string" || Array.isArray(value))
            .map((value) => (Array.isArray(value) ? value.join(" ") : value))
            .some((value) => value.toLowerCase().includes(keyword.toLowerCase()))));
        return filteredJobs;
    }
    catch (error) {
        console.error(`Error in getKeyword: ${error}`);
        return null;
    }
}
exports.getKeyword = getKeyword;
async function sendParseMessage(chatId, response, bot, keywords) {
    if (response !== null && response !== undefined && response.length > 0) {
        let index = 0;
        const chunkSize = 35;
        while (index < response.length) {
            const chunk = response.slice(index, index + chunkSize);
            await sendMessagePart(chatId, chunk, bot, keywords);
            index += chunkSize;
        }
    }
    else {
        await bot.sendMessage(chatId, `No jobs found ${keywords}`);
    }
}
exports.sendParseMessage = sendParseMessage;
async function sendMessagePart(chatId, responsePart, bot, keywords) {
    const catStrings = responsePart.map((entry) => {
        let catString = `\n <a href="${entry.url}"><b>${entry.title}</b></a>`;
        catString += `\n 📅 From the: <b>${(0, date_fns_1.format)(new Date(entry.created_at), "dd.MM.yyyy")}</b>`;
        if (entry.company) {
            catString += `\n 🏢 Company: <b>${entry.company}</b>`;
        }
        if (entry.location !== null && entry.location !== "") {
            catString += `\n 📍 Location: <b>${entry.location}</b>`;
        }
        catString += "\n";
        return catString;
    });
    const message = `${responsePart.length} Jobs ${keywords}:
        ${catStrings.join("")}`;
    if (message) {
        const options = {
            parse_mode: "HTML",
            disable_web_page_preview: true,
        };
        await bot.sendMessage(chatId, message, options);
    }
}
function calculateTimeRange() {
    const now = new Date();
    const pastDayStart = new Date(now);
    pastDayStart.setHours(0, 0, 0, 0); // Set to the beginning of the day
    const pastDayEnd = new Date(now);
    pastDayEnd.setHours(23, 59, 59, 999); // Set to the end of the day
    return {
        pastDayStart,
        pastDayEnd,
    };
}
exports.calculateTimeRange = calculateTimeRange;
async function fetchAndPostLatestEntries(bot) {
    const channelID = "-1001969684625";
    console.log("--------------------New Fetch started--------------------");
    try {
        const { pastDayStart, pastDayEnd } = calculateTimeRange();
        const { data, error } = await exports.supabase
            .from("job_table")
            .select("*")
            .gt("created_at", pastDayStart.toISOString())
            .lt("created_at", pastDayEnd.toISOString())
            .order("created_at", { ascending: false });
        if (error) {
            console.error("Error fetching data from Supabase", error.message);
        }
        if (!data || data.length === 0) {
            console.log("No data found");
            return;
        }
        console.log(`Fetched ${JSON.stringify(data)} entries from Supabase.`);
        for (const [index, entry] of data.entries()) {
            if (entry.fetched === true) {
                console.log(`Entry ${entry.id} already fetched, skipping...`);
            }
            else {
                // read all users chatIds from db and look at job_alerts
                // if keywords match to entry send message
                try {
                    const delay = index * 50000;
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    const jobAlertsData = await readAllJobAlerts();
                    if (jobAlertsData) {
                        for (const userKeywords of jobAlertsData) {
                            const { user_id, job_alerts } = userKeywords;
                            // Add a check to ensure job_alerts is not null before using some
                            if (job_alerts && Array.isArray(job_alerts)) {
                                const jobMatchesAlerts = job_alerts.some((keyword) => {
                                    const titleContainsKeyword = entry.title &&
                                        entry.title.toLowerCase().includes(keyword.toLowerCase());
                                    const location = entry.location &&
                                        entry.location
                                            .toLowerCase()
                                            .includes(keyword.toLowerCase());
                                    const company = entry.company &&
                                        entry.company.toLowerCase().includes(keyword.toLowerCase());
                                    const category = entry.category
                                        ? entry.category
                                            .toLowerCase()
                                            .includes(keyword.toLowerCase())
                                        : false;
                                    const type = entry.type
                                        ? entry.type.toLowerCase().includes(keyword.toLowerCase())
                                        : false;
                                    const tags = entry.tags
                                        ? entry.tags.some((tag) => tag.toLowerCase().includes(keyword.toLowerCase()))
                                        : false;
                                    const description = entry.description
                                        ? entry.description
                                            .toLowerCase()
                                            .includes(keyword.toLowerCase())
                                        : false;
                                    return (titleContainsKeyword ||
                                        location ||
                                        company ||
                                        category ||
                                        type ||
                                        tags ||
                                        description);
                                });
                                if (jobMatchesAlerts) {
                                    // timeout?
                                    console.log(`Entry: ${JSON.stringify(entry.title, null, 2)} matches keyword ${JSON.stringify(userKeywords, null, 2)}`);
                                    await sendSingleJob(user_id, entry, bot);
                                }
                            }
                        }
                    }
                    // console.log(`Entry ${entry} sent to all users`,);
                    await sendSingleJob(channelID, entry, bot);
                    // only when send to channel set to true.... nice
                    const { data: data } = await exports.supabase
                        .from("job_table")
                        .update({ fetched: true })
                        .eq("id", entry.id);
                }
                catch (messageError) {
                    console.error("Error sending message:", messageError);
                }
            }
        }
    }
    catch (fetchError) {
        console.error("Error fetching data:", fetchError);
    }
}
exports.fetchAndPostLatestEntries = fetchAndPostLatestEntries;
async function createUserEntry(chatId) {
    // Insert a new user entry into the user_config table
    const { data, error } = await exports.supabase
        .from("user_config")
        .insert([{ user_id: chatId }]);
    if (error) {
        console.error("Error inserting new user:", error.message);
        return null; // Handle the error as needed
    }
    return data; // Return the inserted data if needed
}
exports.createUserEntry = createUserEntry;
async function readUserEntry(chatId) {
    const { data, error } = await exports.supabase
        .from("user_config")
        .select()
        .eq("user_id", chatId);
    if (error) {
        console.error("Error fetching reading user data:", error.message);
        return false; // Handle the error as needed
    }
    if (data && data.length > 0) {
        return true; // User with the provided chatId exists
    }
    return false;
}
exports.readUserEntry = readUserEntry;
async function readAllJobAlerts() {
    const { data: data, error } = await exports.supabase
        .from("user_config")
        .select("user_id , job_alerts");
    if (error) {
        console.error("Error fetching all job alerts:", error.message);
        return false; // Handle the error as needed
    }
    return data;
}
exports.readAllJobAlerts = readAllJobAlerts;
async function hasJobAlert(chatId) {
    const { data: data, error } = await exports.supabase
        .from("user_config")
        .select("job_alerts")
        .eq("user_id", chatId);
    if (error) {
        console.error("Error fetching user has a job alert:", error.message);
        return false; // Handle the error as needed
    }
    // console.log('data', data);
    if (data && data.length > 0) {
        return data[0].job_alerts; // User with the provided chatId exists
    }
    return false;
}
exports.hasJobAlert = hasJobAlert;
async function updateJobAlerts(chatId, newKeywords) {
    if (!newKeywords || newKeywords.length === 0) {
        return false;
    }
    try {
        const existingUserData = await exports.supabase
            .from("user_config")
            .select("job_alerts")
            .eq("user_id", chatId);
        if (existingUserData.data && existingUserData.data.length > 0) {
            // Extract current keywords array from the result
            const currentKeywords = existingUserData.data[0].job_alerts || [];
            // Combine existing and new keywords, removing duplicates
            const combinedKeywords = [
                ...new Set([...currentKeywords, ...newKeywords]),
            ];
            const updatedUserData = await exports.supabase
                .from("user_config")
                .update({ job_alerts: combinedKeywords })
                .eq("user_id", chatId);
            return updatedUserData;
        }
        else {
            console.error("No user data found for the specified user ID:", chatId);
            return false;
        }
    }
    catch (error) {
        console.error("Error updating user data:", error);
        return false;
    }
}
exports.updateJobAlerts = updateJobAlerts;
async function deleteJobAlerts(chatId) {
    // see single job alerts and then choose with one to delete?
    // const allAlerts = await readAllJobAlerts();
    // const userAlerts = allAlerts?.filter((alert) => alert.user_id === chatId);
    try {
        const updatedUserData = await exports.supabase
            .from("user_config")
            .update({ job_alerts: [] })
            .eq("user_id", chatId);
        return updatedUserData;
    }
    catch (error) {
        console.error("Error updating user data:", error);
        return false;
    }
}
exports.deleteJobAlerts = deleteJobAlerts;
const sendSingleJob = async (chatId, entry, bot) => {
    try {
        let message = `
              🟠  <a href="${entry.url}"><b>${entry.title}</b></a>\n`;
        if (entry.company) {
            message += `\nCompany: <b>${entry.company}</b>`;
        }
        // if (entry.date) {
        //   message += `\nDate of Publishing: <b>${entry.date}</b>`;
        // }
        if (entry.location !== null && entry.location !== "") {
            const input = entry.location;
            const location = input.replace(/[[\]"]+/g, "");
            message += `\nLocation: <b>${location}</b>`;
        }
        if (entry.salary !== null && entry.salary !== "") {
            message += `\nSalary: <b>${entry.salary}</b>`;
        }
        if (entry.category !== null && entry.category !== "") {
            message += `\nCategory: <b>${entry.category}</b>`;
        }
        if (entry.type !== null && entry.type !== "") {
            message += `\nEmployment Type: <b>${entry.type}</b>`;
        }
        if (entry.tags !== null && entry.tags.length > 0) {
            // Replace spaces and hyphens with underscores, and make tags lowercase
            const tagElement = entry.tags
                .map((tag) => `#${tag
                .replace(/\s*\([^)]*\)\s*/g, "")
                .trim()
                .replace(/[\s-]/g, "_")
                .toLowerCase()}`)
                .join(" ");
            const tagsLabel = entry.tags.length === 1 ? "Tag" : "Tags";
            message += `\n\n <b>${tagsLabel}:</b> ${tagElement}`;
        }
        // const urlToUse =
        //   entry.applyURL && entry.applyURL !== ""
        //     ? entry.applyURL
        //     : entry.url;
        const inlineKeyboard = {
            inline_keyboard: [[{ text: "Learn more", url: entry.url }]],
        };
        const options = {
            parse_mode: "HTML",
            reply_markup: inlineKeyboard,
        };
        await bot.sendMessage(chatId, message, options);
        console.log(`Message sent to ${chatId}: ${message}`);
    }
    catch (error) {
        console.error("Error sending job to user:", error);
    }
};
async function handlePrivacy(chatId, event) {
    const { data, error } = await exports.supabase
        .from("user_config")
        .select("privacy")
        .eq("user_id", chatId);
    if (error) {
        console.error("Error fetching user privacy data:", error.message);
        return false;
    }
    if (data && data.length > 0) {
        const privacy = data[0].privacy;
        if (event === true) {
            await exports.supabase
                .from("user_config")
                .update({ privacy: true })
                .eq("user_id", chatId);
            // await bot.sendMessage(chatId, 'Thanks for accepting our privacy policy');
        }
        if (event === false) {
            await exports.supabase
                .from("user_config")
                .update({ privacy: false })
                .eq("user_id", chatId);
            // await bot.sendMessage(chatId, 'Ok, no problem, if you change your mind, just type /privacy');
        }
    }
}
exports.handlePrivacy = handlePrivacy;
