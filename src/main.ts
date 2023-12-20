/* eslint-disable max-len */
import * as dotenv from 'dotenv';
dotenv.config();
import TelegramBot from 'node-telegram-bot-api';
import { createUserEntry, formatVariables, 
    getKeyword, getLatestJobs, getUserConfigs, readUserEntry, removeCommandNameFromCommand,
    sendParseMessage, updateJobAlerts } from './functions';
import { PARAMETERS } from './parameters';
import { TRANSLATIONS } from './translation';
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



// export let userConfig: { chatId: string;  language: string };
// if (fs.existsSync('./user-config.json')) {
//     userConfig = JSON.parse(fs.readFileSync('./user-config.json').toString());
// } else {
//     userConfig = {
//         chatId: '',
//         language: '',
//     };
// }

setBotCommands(bot);
let waitingForKeywords = false;
let setJobAlert = false;

// Messages for conversations.
bot.on('message', async (msg) => {
    for (const command of await bot.getMyCommands()) {
        if (msg.text?.startsWith('/' + command.command) ) {
            return;
        }
    }
    const newChat = await readUserEntry(msg.chat.id.toString());
    if (!newChat){
        createUserEntry(msg.chat.id);
    }
    if (setJobAlert && msg.text) {
        const chatId = msg.chat.id;
        const newKeywords = msg.text.split(',');

        // Remove duplicates and empty strings
        const uniqueNewKeywords = newKeywords
            .map(keyword => keyword.trim())
            .filter(keyword => keyword !== '');

        const response = await updateJobAlerts(chatId.toString(), uniqueNewKeywords);
        if (response) {
            await bot.sendMessage(chatId, 'Job alert updated!');
        } else {
            await bot.sendMessage(chatId, 'Something went wrong. Please try again.');
        }
        setJobAlert = false;
    }

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
    
});

bot.onText(/^\/(\w+)(@\w+)?(?:\s.\*)?/, async (msg, match) => {
    if (!match) return;
    let command: string | undefined;

    if (match.input.split(' ').length != 1) {
        command = match.input.split(' ').shift();
    } else {
        const chatId = msg.chat.id.toString();
        const userConfigs = getUserConfigs();
        const userLanguage = userConfigs[chatId]?.language || PARAMETERS.LANGUAGE;
    
        command = match.input;
        if (!( 
            command.startsWith('/start') || 
            command.startsWith('/value4value') ||
            command.startsWith('/jobs') ||
            command.startsWith('/categories') ||
            command.startsWith('/jobalert') ||
            command.startsWith('/help'))) {
            await bot.sendMessage(
                msg.chat.id,
                formatVariables(
                    TRANSLATIONS[userLanguage].errors[
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
    const chatId = msg.chat.id.toString();
    const userConfigs = getUserConfigs();
    const userLanguage = userConfigs[chatId]?.language || PARAMETERS.LANGUAGE;


    switch (command) {
    case '/start':
        await bot.sendMessage(
            msg.chat.id,
            formatVariables(
                TRANSLATIONS[userLanguage].general[
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
            const header = TRANSLATIONS[userLanguage].general['help'];
            const message = header + commands.join('\n');
            await bot.sendMessage(msg.chat.id, message);
        })();
        break;
    case '/value4value':
        (async () => {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Take a look here!', url: 'https://getalby.com/p/strohstacks' },
                        ]
                    ]
                }
            };
            await bot.sendMessage(msg.chat.id, TRANSLATIONS[userLanguage].general.donate, keyboard);
        }
        )();
     
        break; 
    case '/categories':
        (async () => {
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
            await bot.sendMessage(chatId, TRANSLATIONS[userLanguage].general.categories, keyboard);   
        
        })();
        break; 
    case '/jobs':
        if (msg.chat.id) {
            const chatId = msg.chat.id.toString();
            //check how it where it presses explore categories
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'All of the last 7 days', callback_data: 'last-week' },
                            { text: 'Search by keyword', callback_data: 'query-keyword' },
                        ],
                        [
                            { text: 'Explore Categories', callback_data: 'explore-categories' }
                        ]
                    ]
                }
            };  
            await bot.sendMessage(chatId, TRANSLATIONS[userLanguage].general['latest-jobs'], keyboard);
        }
        break;
    case '/jobalert':
        (async () => {
            const message =  TRANSLATIONS[userLanguage].general['job-alert'];
            await bot.sendMessage(chatId, message);
            setJobAlert = true;           
        })();
        break;
    default:
        break;
    }
});

bot.on('callback_query', async (callbackQuery) => {
    if (!callbackQuery.message) return;
    const chatId = callbackQuery.message.chat.id;
    const userConfigs = getUserConfigs();
    const userLanguage = userConfigs[chatId]?.language || PARAMETERS.LANGUAGE;

    let messageText = '';
  
    switch (callbackQuery.data) {
    case 'last-week':
        (async () => {
            const chatId = callbackQuery.message?.chat.id;
            if (!chatId) return;
            const jobs = getLatestJobs();
            const jobArray = await jobs;
            await sendParseMessage(chatId, jobArray, bot, ['']);
        }
        )();
        break;
    case 'query-keyword':
        waitingForKeywords = true;
        messageText = TRANSLATIONS[userLanguage].general['query-keywords'];
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
            await bot.sendMessage(chatId, TRANSLATIONS[userLanguage].general.categories, keyboard);   
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
    case 'jobalert'
        :
        messageText = 'Job Alert';
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