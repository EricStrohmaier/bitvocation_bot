/* eslint-disable max-len */
import * as dotenv from 'dotenv';
dotenv.config();
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import { formatVariables, 
    getKeyword, getLatestJobs, removeCommandNameFromCommand,
    sendParseMessage, switchLanguage } from './functions';
import { PARAMETERS } from './parameters';
import { TRANSLATIONS } from './translation';
import axios from 'axios';
import { setBotCommands } from './setBotCommands';

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
        const chatId = msg.chat.id;
        waitingForKeywords = false;
        
        const keywords = msg.text?.split(',') || [];
        const response = await getKeyword(keywords);
        if (response) {
            await sendParseMessage(chatId, response, bot, ['with ' + keywords.join(', ')]);
            return;
        } else {
            await bot.sendMessage(chatId, 'No jobs found for the keywords provided.');
            return;
        }
    }
    for (const command of await bot.getMyCommands()) {
        if (msg.text?.startsWith('/' + command.command) ) {
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
        if (!( 
            command.startsWith('/start') || 
            command.startsWith('/donate') ||
            command.startsWith('/language') ||
            command.startsWith('/latestjobs') ||
            command.startsWith('/checkprice') ||
            command.startsWith('/help'))) {
            await bot.sendMessage(
                msg.chat.id,
                formatVariables(
                    TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].errors[
                        'generic-error'
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

    switch (command) {
    case '/start':
        await bot.sendMessage(
            msg.chat.id,
            formatVariables(
                TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].general[
                    'start-message'
                ]
            ),
        );
        break;
    case '/help':
        (async () => {
            const getCommands = await bot.getMyCommands();
            const commands = getCommands.map((command) => {
                return `/${command.command} - ${command.description}`;
            });
            const header = TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].general['help'];
            const message = header + commands.join('\n');
            await bot.sendMessage(msg.chat.id, message);
        })();
        break;
    case '/donate':
        (async () => {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Look here!', url: 'https://getalby.com/p/strohstacks' },
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
        );
        break;   
    case '/latestjobs':
        if (msg.chat.id) {
            const chatId = msg.chat.id.toString();
            //check how it where it presses explore categories
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Last Weeks Jobs', callback_data: 'last-week' },
                            { text: 'Query with Keywords', callback_data: 'query-keyword' },
                        ],[
                            { text: 'Explore some Categories', callback_data: 'explore-categories' }
                        ]
                    ]
                }
            };  
            await bot.sendMessage(chatId, TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].general['latest-jobs'], keyboard);
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
            const chatId = callbackQuery.message?.chat.id;
            if (!chatId) return;
            const jobs = getLatestJobs();
            const jobArray = await jobs;
            await sendParseMessage(chatId, jobArray, bot, ['from Last Week']);
        }
        )();
        break;
    case 'query-keyword':
        waitingForKeywords = true;
        messageText = TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].general['query-keywords'];
        break;
    case 'explore-categories':
        (async () => {
            const chatId = callbackQuery.message?.chat.id.toString();         
            if (!chatId) return;
            const message_id = callbackQuery.message?.message_id.toString();
            if (message_id) {
                await bot.deleteMessage(chatId, message_id);
            }
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'UI/UX Design', callback_data: 'design' },
                            { text: 'Sales', callback_data: 'sales' },
                            { text: 'Marketing', callback_data: 'marketing' }
                        ],
                        [
                            { text: 'Engineering', callback_data: 'engineering' },
                            { text: 'Customer Operations', callback_data: 'customer-op' },
                        ]
                    ]
                }
            };
            await bot.sendMessage(chatId, 'Explore Categories', keyboard);   
        }
        )();
        break;
    case 'design':
        (async () => {
            const catArray = await getKeyword(['design', 'ui', 'ux', 'graphic', 'product']);
            await sendParseMessage(chatId, catArray, bot, ['in UI/UX Design']);
        })();
        break;
    case 'sales':
        (async () => {
            const catArray = await getKeyword(['sales', 'business', 'account', 'account executive', 'account manager']);
            await sendParseMessage(chatId, catArray, bot, ['in Sales']);
        })();
        break;
    case 'marketing':
        (async () => {
            const catArray = await getKeyword(['marketing', 'growth', 'seo', 'social', 'media']);
            await sendParseMessage(chatId, catArray, bot, ['in Marketing']);
        })();
        break;
    case 'engineering':
        (async () => {
            const catArray = await getKeyword(['engineering', 'software', 'developer', 'devops', 'backend', 'frontend']);
            await sendParseMessage(chatId, catArray, bot, ['in Engineering']);
        })();
        break;
    case 'customer-op':
        (async () => {
            const catArray = await getKeyword(['customer', 'support', 'success', 'operations']);
            await sendParseMessage(chatId, catArray, bot, ['in Customer Operations']);
        })();
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