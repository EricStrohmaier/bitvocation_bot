/* eslint-disable max-len */
import * as dotenv from 'dotenv';
dotenv.config();

import TelegramBot, { InlineKeyboardMarkup } from 'node-telegram-bot-api';
import fs from 'fs';
import { Configuration, OpenAIApi } from 'openai';

import { buildLastMessage, formatVariables, 
    generatePicture, getKeyword, getLatestJobs, removeCommandNameFromCommand,
    resetBotMemory, sleep, switchLanguage } from './functions';
import { PARAMETERS } from './parameters';
import { MODEL_PRICES } from './model-price';
import { TRANSLATIONS } from './translation';
import axios from 'axios';
import { setBotCommands } from './setBotCommands';
import { tr } from 'date-fns/locale';

if (!process.env.TELEGRAM_BOT_API_KEY) {
    console.error('Please provide your bot\'s API key on the .env file.');
    process.exit();
} else if (!process.env.OPENAI_API_KEY) {
    console.error('Please provide your openAI API key on the .env file.');
    process.exit();
}
const token = process.env.TELEGRAM_BOT_API_KEY;
const bot = new TelegramBot(token, { polling: true });
const botUsername = (await bot.getMe()).username;

const openai = new OpenAIApi(
    new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

let lastMessage = '';

export let userConfig: { chatId: string;  language: string };
if (fs.existsSync('./user-config.json')) {
    userConfig = JSON.parse(fs.readFileSync('./user-config.json').toString());
} else {
    userConfig = {
        chatId: '',
        language: '',
    };
}

setBotCommands(bot);
let waitingForKeywords = false;

// Messages for conversations.
bot.on('message', async (msg) => {
    if (waitingForKeywords) {
        const chatId = msg.chat.id.toString();
        waitingForKeywords = false;
        
        const keywords = msg.text?.split(',') || [];
        const response = await getKeyword(keywords);
        if (response && response?.length > 0) {
            response.forEach(async (entry) => {
                let message = `
                🟠  <a href="${entry.url}"><b>${entry.title}</b></a>\n`;
                if (entry.created_at !== null && entry.created_at !== '') {
                    const date = new Date(entry.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    });
                    message += `\nDate of publish: <b>${date}</b>`;
                }
                message += '\n';
                if (entry.company) {
                    message += `\nCompany: <b>${entry.company}</b>`;
                }
                if (entry.date) {
                    message += `\nDate of Publishing: <b>${entry.date}</b>`;
                }
                if (entry.location !== null && entry.location !== '') {
                    message += `\nLocation: <b>${entry.location}</b>`;
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
            
                if (entry.tags?.length > 0) {
                    // Replace spaces and hyphens with underscores, and make tags lowercase
                    const tagElement = entry.tags
                        .map(
                            (tag: string) => `#${tag
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
            
                const inlineKeyboard = {
                    inline_keyboard: [[{ text: 'Learn more', url: entry.url }]],
                };
            
                const options: {
                        parse_mode?: 'Markdown' | 'HTML' | undefined;
                        reply_markup?: InlineKeyboardMarkup;
                        disable_web_page_preview?: boolean;
                    } = {
                        parse_mode: 'HTML',
                        reply_markup: inlineKeyboard,
                        disable_web_page_preview: true,
                    };
            
                await bot.sendMessage(chatId, message, options);
            });
            return;
        } else {
            await bot.sendMessage(chatId, 'No jobs found for the keywords provided.');
            return;
        }
        
    }
    for (const command of await bot.getMyCommands()) {
        if (msg.text?.startsWith('/' + command.command) ) return;
    }
    if (
        msg.text &&
    (msg.chat.type == 'private' || msg.text?.includes(`@${botUsername}`))
    ) {
        const text = msg.text
            ?.replace('@' + botUsername + ' ', '')
            .replace('@' + botUsername, '')
            .replace('#', '\\#');
        const username = msg.from?.username || msg.chat.id.toString();
        const chatId = msg.chat.id.toString();

        if (userConfig.chatId != chatId) {
            userConfig.chatId = chatId;
            fs.writeFileSync('user-config.json', JSON.stringify(userConfig), 'utf8');
        }

        const suffix = formatVariables(PARAMETERS.INPUT_SUFFIX, { username });
        const promptStart = formatVariables(PARAMETERS.PROMPT_START, { username });
        const botName = formatVariables(PARAMETERS.BOT_NAME, {
            username,
        });
        const language = userConfig.language || PARAMETERS.LANGUAGE;
        const prompt =
      promptStart +
      '\n\n' +
      (lastMessage ? lastMessage : '') +
      suffix +
      ': ###' +
      text +
      '###\n' +
      botName +
      ': ###' +
      'reply in language ' + language + '###\n';

        let response: string;
        try {
            let done = false;

            (async () => {
                while (!done) {
                    await bot.sendChatAction(msg.chat.id, 'typing');
                    await sleep(3000);
                }
            })();

            const ai = await openai.createCompletion({
                prompt,
                model: PARAMETERS.MODEL,
                temperature: PARAMETERS.TEMPERATURE,
                max_tokens: PARAMETERS.MAX_TOKENS,
                frequency_penalty: PARAMETERS.FREQUENCY_PENALTY,
                presence_penalty: PARAMETERS.PRESENCE_PENALTY,
                stop: ['###'],
            });
            done = true;

            const price = MODEL_PRICES[PARAMETERS.MODEL] || 0;

            response = ai.data.choices[0].text || 'error';

            console.log(`\n${suffix}: "${text}"\n${botName}: "${response}"`);
            console.log(`[usage: ${ai.data.usage?.total_tokens || -1} tokens ` +
          `($${(ai.data.usage?.total_tokens || 0) * price})]`);

            if (PARAMETERS.CONTINUOUS_CONVERSATION) {
                lastMessage += buildLastMessage(suffix, text, response) + '\n';
                fs.appendFileSync(
                    'history.jsonl',
                    JSON.stringify({
                        prompt: `${suffix}: ###${text}###\n${botName}: ###`,
                        completion: response,
                    }) + '\n'
                );
            } else {
                lastMessage = buildLastMessage(suffix, text, response);
            }

            await bot.sendMessage(msg.chat.id, response, {
                reply_to_message_id: msg.message_id,
            });
        } catch (e) {
            await bot.sendMessage(
                msg.chat.id,
                TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].errors[
                    'generic-error'
                ],
                { reply_to_message_id: msg.message_id }
            );
            console.error(e);
            return;
        }
    }
});

bot.onText(/^\/(\w+)(@\w+)?(?:\s.\*)?/, async (msg, match) => {
    if (!match) return;
    let command: string | undefined;

    if (match.input.split(' ').length != 1) {
        command = match.input.split(' ').shift();
    } else {
        
        command = match.input;
        if (!(command.startsWith('/reset') || 
            command.startsWith('/start') || 
            command.startsWith('/donate') ||
            command.startsWith('/language') ||
            command.startsWith('/latestjobs') ||
            command.startsWith('/checkprice'))) {
            await bot.sendMessage(
                msg.chat.id,
                formatVariables(
                    TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].errors[
                        'no-parameter-command'
                    ],
                    { command }
                ),
                { reply_to_message_id: msg.message_id }
            );
            return;
        } 
    }

    if (command?.endsWith('@' + botUsername)) {
        command = command.replace('@' + botUsername, '');
    } else if (msg.chat.type != 'private') {
        return;
    }

    const input = removeCommandNameFromCommand(match.input);

    let done = false;
    switch (command) {
    case '/start':
        await bot.sendMessage(
            msg.chat.id,
            formatVariables(
                TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].general[
                    'start-message'
                ]
            ),
            { reply_to_message_id: msg.message_id }
        );
        break;
    case '/reset':
        resetBotMemory();
        await bot.sendMessage(
            msg.chat.id,
            TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].general[
                'memory-reset'
            ],
            { reply_to_message_id: msg.message_id }
        );
        break;
    case '/donate':
        (async () => {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'View Link', url: 'https://getalby.com/p/strohstacks' },
                        ]
                    ]
                }
            };
            await bot.sendMessage(msg.chat.id, 'Thank you for your support!', keyboard);
        }
        )();
     
        break;
    case '/language':
        if (msg.chat.id) {
            const chatId = msg.chat.id.toString();
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'English', callback_data: 'en' },
                            { text: 'German', callback_data: 'de' },
                        ]
                    ]
                }
            };
        
            await bot.sendMessage(chatId, TRANSLATIONS[userConfig.language 
                || PARAMETERS.LANGUAGE]['command-descriptions'].language, keyboard);
            break;
        }
        await bot.sendMessage(
            msg.chat.id,
            TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].errors[
                'invalid-language'
            ].replace('$language', input),
            { reply_to_message_id: msg.message_id }
        );
        break;   
    case '/imagine':
        (async () => {
            while (!done) {
                await bot.sendChatAction(msg.chat.id, 'upload_photo');
                await sleep(3000);
            }
        })();

        try {
            const imageUrl = await generatePicture(input);
            await bot.sendPhoto(msg.chat.id, imageUrl, {
                reply_to_message_id: msg.message_id,
            });
            done = true;
        } catch (e) {
            await bot.sendMessage(
                msg.chat.id,
                TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].errors[
                    'image-safety'
                ],
                { reply_to_message_id: msg.message_id }
            );
            done = true;
        }
        break;
    case '/latestjobs':
        if (msg.chat.id) {
            const chatId = msg.chat.id.toString();
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Latest jobs', callback_data: 'last-week' },
                            { text: 'Query for keywords', callback_data: 'query-keyword' },
                        ]
                    ]
                }
            };
            waitingForKeywords = true;

            await bot.sendMessage(chatId,
                TRANSLATIONS[userConfig.language || 
                PARAMETERS.LANGUAGE].general['latest-jobs'], keyboard);
        }
        break;
    case '/checkprice':
        try {
            const response = await axios.get('https://api.coindesk.com/v1/bpi/currentprice.json');
            const price = response.data.bpi.USD.rate_float;
            const formattedPrice = price.toLocaleString('en-US', 
                { style: 'currency', 
                    currency: 'USD', 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 0 
                });

            await bot.sendMessage(
                msg.chat.id,
                TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].general[
                    'btc-price'
                ].replace('$price', formattedPrice),
            );
            break;
        } catch (e) {
            console.error(e);
            await bot.sendMessage(
                msg.chat.id,
                'An error occurred. Please try again later.',
                { reply_to_message_id: msg.message_id }
            );
        }
        break;
    default:
        break;
    }
});

bot.on('callback_query', async (callbackQuery) => {
    if (!callbackQuery.message) return;
    const chatId = callbackQuery.message.chat.id;
    let messageText = '';
  
    switch (callbackQuery.data) {
  
    case 'en':
    case 'de': {
       
        const selectedLanguage = callbackQuery.data;
        switchLanguage(selectedLanguage);
        messageText = TRANSLATIONS[selectedLanguage].general['language-switch'];
        break;
    }
    case 'last-week':
        (async () => {
            const chatId = callbackQuery.message?.chat.id.toString();
            if (!chatId) return;
            const jobs = getLatestJobs();
            if (jobs !== null && jobs !== undefined) {
                const jobsArray = await jobs;
                if (jobsArray) {
                    const jobStrings = jobsArray.map((entry) => {
                        let jobString = `\n<a href="${entry.url}"><b>${entry.title}</b></a>`;
              
                        if (entry.company) {
                            jobString += `\n  Company: <b>${entry.company}</b>`;
                        }
              
                        if (entry.location !== null && entry.location !== '') {
                            jobString += `\n  Location: <b>${entry.location}</b>`;
                        }
                        jobString += '\n';
              
                        return jobString;
                    });
              
                    const message = `Found ${jobStrings.length} jobs for last week :
                    ${jobStrings.join('')}`;
              
                    // Check if there are entries to send
                    if (message !== 'Latest Jobs:') {
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
            }
        }
        )();
        break;
    case 'query-keyword':
        messageText = 'Please enter keywords, separated by commas (,)';
        break;

    default:
        break;
    }
  
    if (messageText) {
        await bot.sendMessage(chatId, messageText);
    }
});


console.log('Bot Started!');

process.on('SIGINT', () => {
    console.log('\nExiting...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nExiting...');
    bot.stopPolling();
    process.exit(0);
});
//on error restart bot
process.on('uncaughtException', function (err) {
    console.log('SYSTEM: uncaughtExpection',err);
    bot.stopPolling();
    setTimeout(() => {
        bot.startPolling();
    }
    , 5000);
});