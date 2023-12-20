import { Configuration, OpenAIApi } from 'openai';
// import { userConfig } from './main';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import * as dotenv from 'dotenv';
import TelegramBot, { SendMessageOptions } from 'node-telegram-bot-api';
dotenv.config();

const openai = new OpenAIApi(
    new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

/** A simple async sleep function.
 * @example
 * await sleep(2000);
 * console.log('Two seconds have passed.');
 */
export function sleep(time: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, time));
}
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
export function removeCommandNameFromCommand(input: string): string {
    const ar = input.split(' ');
    ar.shift();
    return ar.join(' ');
}
let lastMessage = '';

interface UserConfig {
  chatId: string;
  language: string;
}
/**
 * Retrieves the current user configurations from the file.
 * @returns {Record<string, UserConfig>} - The user configurations.
 */
export function getUserConfigs(): Record<string, UserConfig> {
    return fs.existsSync('./user-config.json')
        ? JSON.parse(fs.readFileSync('./user-config.json').toString())
        : {};
}
/**
 * Switches bot's language for a specific user.
 * @param {string} chatId - The unique identifier for the user.
 * @param {'en' | 'de' | string} language - The language the bot will now speak.
 */
export function switchLanguage(chatId: string, language: 'en' | 'de' | string) {
    // Retrieve the current user configuration
    let userConfigs: Record<string, UserConfig> = {};
    if (fs.existsSync('./user-config.json')) {
        userConfigs = JSON.parse(fs.readFileSync('./user-config.json').toString());
    }

    const userConfig = userConfigs[chatId] || { chatId, language: '' };

    // Update the language for the specific user
    userConfig.language = language;

    // Save the updated user configuration
    userConfigs[chatId] = userConfig;
    fs.writeFileSync(
        './user-config.json',
        JSON.stringify(userConfigs, null, 2),
        'utf8'
    );
}

/** Resets the bot's memory about previous messages. */
export function resetBotMemory() {
    lastMessage = '';
}
/** Generates a picture using DALL·E 2.
 * @param {string} input - The prompt for the picture.
 * @returns {Promise<string>} The URL of the generated image.
 */
export async function generatePicture(input: string): Promise<string> {
    return new Promise((resolve, reject) => {
        openai
            .createImage({
                prompt: input,
                response_format: 'url',
            })
            .then((data) => {
                resolve(data.data.data[0].url || '');
            })
            .catch((e) => reject(e));
    });
}

/** Formats the data about a message to be used later as a history for the AI in case
 * CONTINUOUS_CONVERSATION is `true`.
 * @param {string} lastUser - The username.
 * @param {string} lastInput - The message.
 * @param {string} lastAnswer - The AI's completion.
 * @returns {string} The formatted message.
 */
export function buildLastMessage(
    lastUser: string,
    lastInput: string,
    lastAnswer: string
): string {
    return formatVariables(
        `${lastUser}: ###${lastInput}###\n$name: ###${lastAnswer}###\n`
    );
}

/** Replace `$placeholders` for the actual values of the variables.
 * @example formatVariables("Hello, $username.", { username: "john" }) // "Hello, john."
 * @param {string} input - The unformatted string.
 * @param {{ username?: string, command?: string }} optionalParameters -
 * The `username` or the `command` variables.
 * @returns {string} The formatted string.
 */
export function formatVariables(
    input: string,
    optionalParameters?: {
    username?: string;
    command?: string;
  }
): string {
    return input
        .replace('$username', optionalParameters?.username || 'user')
        .replace('$command', optionalParameters?.command || 'command');
}

if (!process.env.SUPABASE_URL && !process.env.SUPABASE_KEY) {
    throw new Error('No Supabase URL provided.');
}
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function getLatestJobs() {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const { data: jobs, error } = await supabase
        .from('job_table')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .lte('created_at', now.toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching latest jobs:', error.message);
        return null;
    }

    return jobs;
}

export async function getKeyword(keywords: string[]) {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const { data: jobs } = await supabase
        .from('job_table')
        .select()
        .gte('created_at', sevenDaysAgo.toISOString())
        .lte('created_at', now.toISOString())
        .order('created_at', { ascending: false });
    if (jobs && jobs.length > 0) {
    // filter out the jobs that match the keyword
        const filteredJobs = jobs.filter((job) => {
            let isMatch = false;

            keywords.forEach((keyword) => {
                if (job.title.toLowerCase().includes(keyword.toLowerCase())) {
                    isMatch = true;
                }
            });
            return isMatch;
        });
        return filteredJobs;
    } else {
        console.log('No result found.');
        return null;
    }
}

export async function sendParseMessage(
    chatId: number,
    response: any,
    bot: any,
    keywords: string[]
) {
    if (response !== null && response !== undefined) {
        let index = 0;
        const chunkSize = 35;

        while (index < response.length) {
            const chunk = response.slice(index, index + chunkSize);
            await sendMessagePart(chatId, chunk, bot, keywords);
            index += chunkSize;
        }
    }
}

async function sendMessagePart(
    chatId: number,
    responsePart: any,
    bot: any,
    keywords: string[]
) {
    const catStrings = responsePart.map((entry: any) => {
        let catString = `\n <a href="${entry.url}"><b>${entry.title}</b></a>`;

        catString += `\n 📅 From the: <b>${format(
            new Date(entry.created_at),
            'dd.MM.yyyy'
        )}</b>`;

        if (entry.company) {
            catString += `\n 🏢 Company: <b>${entry.company}</b>`;
        }

        if (entry.location !== null && entry.location !== '') {
            catString += `\n 📍 Location: <b>${entry.location}</b>`;
        }
        catString += '\n';

        return catString;
    });

    const message = `${responsePart.length} Jobs ${keywords}:
        ${catStrings.join('')}`;

    if (message) {
        const options: {
      parse_mode?: 'Markdown' | 'HTML' | undefined;
      disable_web_page_preview?: boolean;
    } = {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    };

        await bot.sendMessage(chatId, message, options);
    }
}

export function calculateTimeRange() {
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

const token = process.env.BITVOCATION_BOT_TOKEN!;
const bitcovationBot = new TelegramBot(token, { polling: true });

const fetchInterval = 3 * 60 * 60 * 1000;
setInterval(fetchAndPostLatestEntries, fetchInterval);
fetchAndPostLatestEntries();
export async function fetchAndPostLatestEntries() {
    const channelID = '-1001969684625';

    console.log('--------------------New Fetch started--------------------');
    try {
        const { pastDayStart, pastDayEnd } = calculateTimeRange();

        const { data, error } = await supabase
            .from('job_table')
            .select('*')
            .gt('created_at', pastDayStart.toISOString())
            .lt('created_at', pastDayEnd.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching data from Supabase', error.message);
        }
        if (!data || data.length === 0) {
            console.log('No data found');
            return;
        }
        console.log(`Fetched ${JSON.stringify(data)} entries from Supabase.`);
        for (const [index, entry] of data.entries()) {
            if (entry.fetched === true) {
                console.log(`Entry ${entry.id} already fetched, skipping...`);
            } else {
                try {
                    const delay = index * 50000;
                    await new Promise((resolve) => setTimeout(resolve, delay));

                    let message = `
              🟠  <a href="${entry.url}"><b>${entry.title}</b></a>\n`;
                    if (entry.company) {
                        message += `\nCompany: <b>${entry.company}</b>`;
                    }
                    // if (entry.date) {
                    //   message += `\nDate of Publishing: <b>${entry.date}</b>`;
                    // }
                    if (entry.location !== null && entry.location !== '') {
                        const input = entry.location;
                        const location = input.replace(/[[\]"]+/g, '');
                        message += `\nLocation: <b>${location}</b>`;
                    }

                    if (entry.salary !== null && entry.salary !== '') {
                        message += `\nSalary: <b>${entry.salary}</b>`;
                    }

                    if (entry.category !== null && entry.category !== '') {
                        message += `\nCategory: <b>${entry.category}</b>`;
                    }
                    if (entry.type !== null && entry.type !== '') {
                        message += `\nEmployment Type: <b>${entry.type}</b>`;
                    }

                    if (entry.tags.length > 0) {
                        // Replace spaces and hyphens with underscores, and make tags lowercase
                        const tagElement = entry.tags
                            .map(
                                (tag: string) =>
                                    `#${tag
                                        .replace(/\s*\([^)]*\)\s*/g, '')
                                        .trim()
                                        .replace(/[\s-]/g, '_')
                                        .toLowerCase()}`
                            )
                            .join(' ');

                        // Use "Tag" for singular and "Tags" for plural
                        const tagsLabel = entry.tags.length === 1 ? 'Tag' : 'Tags';

                        message += `\n\n <b>${tagsLabel}:</b> ${tagElement}`;
                    }

                    // const urlToUse =
                    //   entry.applyURL && entry.applyURL !== ""
                    //     ? entry.applyURL
                    //     : entry.url;

                    const inlineKeyboard = {
                        inline_keyboard: [[{ text: 'Learn more', url: entry.url }]],
                    };

                    const options: SendMessageOptions = {
                        parse_mode: 'HTML',
                        reply_markup: inlineKeyboard,
                    };
                    // Send the message to the first channel (channelID)
                    await bitcovationBot.sendMessage(channelID, message, options);
                    console.log(`Message sent to ${channelID}: ${message}`);

                    // Send the message to the second channel (channelUsername)
                    // await bot.sendMessage(channelUsername, message, options);
                    // console.log(`Message sent to ${channelUsername}: ${message}`);

                    const { data: data } = await supabase
                        .from('job_table')
                        .update({ fetched: true })
                        .eq('id', entry.id);
                } catch (messageError) {
                    console.error('Error sending message:', messageError);
                }
            }
        }
    } catch (fetchError) {
        console.error('Error fetching data:', fetchError);
    }
}

export async function createUserEntry(chatId: number) {
    // Insert a new user entry into the user_config table
    const { data, error } = await supabase
        .from('user_config')
        .insert([{ user_id: chatId }]);

    if (error) {
        console.error('Error inserting user:', error.message);
        return null; // Handle the error as needed
    }
    return data; // Return the inserted data if needed
}
export async function readUserEntry(chatId: string) {
    const { data, error } = await supabase
        .from('user_config')
        .select()
        .eq('user_id', chatId);

    if (error) {
        console.error('Error fetching user data:', error.message);
        return false; // Handle the error as needed
    }
    if (data && data.length > 0) {
        return true; // User with the provided chatId exists
    }

    return false;
}

export async function updateJobAlerts(chatId: string, newKeywords: string[]) {
    if (!newKeywords || newKeywords.length === 0) {
        return;
    }

    try {
        const existingUserData = await supabase
            .from('user_config')
            .select('job_alerts')
            .eq('user_id', chatId);

        if (existingUserData.data && existingUserData.data.length > 0) {
            // Extract current keywords array from the result
            const currentKeywords = existingUserData.data[0].job_alerts || [];

            // Combine existing and new keywords, removing duplicates
            const combinedKeywords = [...new Set([...currentKeywords, ...newKeywords])];

            const updatedUserData = await supabase
                .from('user_config')
                .update({ job_alerts: combinedKeywords })
                .eq('user_id', chatId);

        
            return updatedUserData;

        } else {
            console.error('No user data found for the specified user ID:', chatId);
            return false;
        }
    } catch (error) {
        console.error('Error updating user data:', error);
        return false;
    }
}
