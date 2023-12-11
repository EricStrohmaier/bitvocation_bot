export const PARAMETERS = {
    PROMPT_START: process.env.PROMPT_START || 'Conversation with $username.',
    PERSONALITY: process.env.PERSONALITY || 'an AI',
    BOT_NAME: process.env.BOT_NAME || 'openAI',
    INPUT_SUFFIX: process.env.INPUT_SUFFIX || '$username',
    MODEL: process.env.MODEL || 'text-davinci-003',
    MAX_TOKENS: Number.parseFloat(process.env.MAX_TOKENS || '3000'),
    TEMPERATURE: Number.parseFloat(process.env.TEMPERATURE || '0.5'),
    PRESENCE_PENALTY: process.env.PRESENCE_PENALTY
        ? Number.parseFloat(process.env.PRESENCE_PENALTY)
        : undefined,
    FREQUENCY_PENALTY: Number.parseFloat(process.env.FREQUENCY_PENALTY || '1'),
    CONTINUOUS_CONVERSATION: process.env.CONTINUOUS_CONVERSATION
        ? (JSON.parse(process.env.CONTINUOUS_CONVERSATION) as boolean)
        : true,
    LANGUAGE: process.env.LANGUAGE || 'en',
};