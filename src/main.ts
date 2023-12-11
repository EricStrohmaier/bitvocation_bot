import * as dotenv from 'dotenv';
dotenv.config();

import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import { Configuration, OpenAIApi } from 'openai';
import { buildLastMessage, formatVariables, generatePicture, removeCommandNameFromCommand,
    resetBotMemory, sleep, switchLanguage } from './functions';
import { PARAMETERS } from './parameters';
import { MODEL_PRICES } from './model-price';
import { TRANSLATIONS } from './translation';

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
// Messages for conversations.
bot.on('message', async (msg) => {
    for (const command of await bot.getMyCommands()) {
        if (msg.text?.startsWith('/' + command.command)) return;
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
      'in language ' + language + '###\n';

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
            command.startsWith('/language'))) {
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
        await bot.sendMessage(
            msg.chat.id,
            TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE].general[
                'donate'
            ],
        );
        break;
    case '/language':
        // if (msg.chat.id.toString() == userConfig.chatId) {
        if (msg.chat.id) {
            const chatId = msg.chat.id.toString();
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'English', callback_data: 'en' },
                            { text: 'German', callback_data: 'de' },
                            // Add more language options as needed
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
    default:
        break;
    }
});

bot.on('callback_query', async (callbackQuery) => {
    if (callbackQuery.message) {
        const chatId = callbackQuery.message.chat.id;
        const selectedLanguage = callbackQuery.data as 'en' | 'de' | string;
        console.log(`User ${chatId} selected language callback ${selectedLanguage}`);
        switchLanguage(selectedLanguage);

        await bot.sendMessage(
            chatId,
            TRANSLATIONS[selectedLanguage].general['language-switch'],
            { reply_to_message_id: callbackQuery.message.message_id }
        );
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
