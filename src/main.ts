/* eslint-disable max-len */
import * as dotenv from 'dotenv';
dotenv.config();

import TelegramBot, { InlineKeyboardMarkup } from 'node-telegram-bot-api';
import fs from 'fs';
import { Configuration, OpenAIApi } from 'openai';

import { buildLastMessage, formatVariables, 
    generatePicture, getKeyword, getLatestJobs, removeCommandNameFromCommand,
    resetBotMemory, sendParseMessage, sleep, switchLanguage } from './functions';
import { PARAMETERS } from './parameters';
import { MODEL_PRICES } from './model-price';
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
    // case '/reset':
    //     resetBotMemory();
    //     await bot.sendMessage(
    //         msg.chat.id,
    //         TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].general[
    //             'memory-reset'
    //         ],
    //         { reply_to_message_id: msg.message_id }
    //     );
    //     break;
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
            //check how it where it presses explore categories
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Last Week', callback_data: 'last-week' },
                            { text: 'Query by Keyword', callback_data: 'query-keyword' },
                        ],[
                            { text: 'Explore Categories', callback_data: 'explore-categories' }
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
            await sendParseMessage(chatId, jobs, bot, ['from Last Week']);
        }
        )();
        break;
    case 'query-keyword':
        waitingForKeywords = true;
        messageText = 'Please enter keywords, separated by commas \n\nExample: project manager, ui/ux, fullstack';
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