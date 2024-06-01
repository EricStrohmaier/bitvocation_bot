/* eslint-disable max-len */
import * as dotenv from "dotenv";
dotenv.config();
import TelegramBot from "node-telegram-bot-api";
import {
  createUserEntry,
  deleteJobAlerts,
  fetchAndPostLatestEntries,
  formatVariables,
  getKeyword,
  getLatestJobs,
  handlePrivacy,
  hasJobAlert,
  readUserEntry,
  sendParseMessage,
  updateJobAlerts,
} from "./functions";
import { TRANSLATIONS } from "./translation";
import { setBotCommands } from "./setBotCommands";
import express from "express";
import { callUrl } from "./callUrl";

const app = express();
const port = process.env.PORT || 3030;

// Health check route
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/", (req, res) => {
  res.status(200).send("Hello World!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log("Bot is operational and ready to receive messages.");
  setInterval(callUrl, 14 * 60 * 1000);
});

if (!process.env.BITVOCATION_BOT_TOKEN) {
  console.error("Please provide your bot's API key on the .env file.");
  process.exit();
}

export const bot = new TelegramBot(process.env.BITVOCATION_BOT_TOKEN, {
  polling: true,
});

setBotCommands(bot);
let waitingForKeywords = false;
let setJobAlert = false;
const fetchInterval = 3 * 60 * 60 * 1000;
setInterval(() => {
  // this is the bread and butter
  fetchAndPostLatestEntries(bot);
}, fetchInterval);

fetchAndPostLatestEntries(bot);

// Messages for conversations.
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  if (
    setJobAlert &&
    msg.text?.startsWith("/") &&
    !msg.text.startsWith("/jobalert")
  ) {
    setJobAlert = false;
    await bot.sendMessage(
      chatId,
      "Something went wrong. Please try again to set up a /jobalert."
    );
  }
  if (setJobAlert) {
    const newKeywords = msg.text?.split(",") ?? [];

    // Remove duplicates and empty strings
    const uniqueNewKeywords = newKeywords
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword !== "");

    const response = await updateJobAlerts(
      chatId.toString(),
      uniqueNewKeywords
    );

    if (response) {
      await bot.sendMessage(chatId, "Job alert updated!");
    } else {
      await bot.sendMessage(
        chatId,
        "Something went wrong. Please try again to set up a /jobalert."
      );
    }
    setJobAlert = false;
  }

  if (waitingForKeywords) {
    const chatId = msg.chat.id;
    waitingForKeywords = false;

    const keywords = msg.text?.split(",") || [];
    const response = await getKeyword(keywords);
    if (response && response?.length > 0) {
      await sendParseMessage(chatId, response, bot, [
        "with " + keywords.join(", "),
      ]);
      return;
    } else {
      await bot.sendMessage(chatId, "No jobs found for the keywords provided.");
      return;
    }
  }
});

bot.onText(/^\/(\w+)(@\w+)?(?:\s.\*)?/, async (msg, match) => {
  if (!match) return;
  let command: string | undefined;

  if (match.input.split(" ").length != 1) {
    command = match.input.split(" ").shift();
  } else {
    const chatId = msg.chat.id.toString();
    const userLanguage = "en";
    const newChat = await readUserEntry(chatId);
    if (!newChat) {
      createUserEntry(chatId);
    }
    command = match.input;
    if (
      !(
        command.startsWith("/start") ||
        command.startsWith("/value4value") ||
        command.startsWith("/jobs") ||
        command.startsWith("/jobalert") ||
        command.startsWith("/privacy") ||
        command.startsWith("/help") ||
        command.startsWith("/freeguide")
      )
    ) {
      await bot.sendMessage(
        msg.chat.id,
        formatVariables(TRANSLATIONS[userLanguage].errors["generic-error"], {
          command,
        }),
        { reply_to_message_id: msg.message_id }
      );
      return;
    }
  }

  const chatId = msg.chat.id.toString();
  const userLanguage = "en";
  setJobAlert = false;
  switch (command) {
    case "/start":
      (async () => {
        const getCommands = await bot.getMyCommands();
        const commands = getCommands.map((command) => {
          return `/${command.command} - ${command.description}`;
        });
        const startMessage =
          'Hey there, I’m your friendly Bitvocation bot! 👋\n\nI scrape the internet for all the latest job openings in Bitcoin and post them in the @bitvocationfeed.\n\nI was thought up <a href="https://twitter.com/connecteconomy"><b>by Anja</b></a> and created <a href="https://www.linkedin.com/in/eric-strohmaier-3a0767267/"><b>by Eric</b></a>';

        const boldHeader =
          "<b>Here are the commands you can use to work with me: \n</b>";
        const commandsMessage = boldHeader + commands.join("\n");

        const combinedMessage =
          startMessage +
          "\n\n" +
          commandsMessage +
          "\n\n" +
          "<b>🔴 IMPORTANT INFO REGARDING YOUR DATA & PRIVACY 🔴</b>\n\nI understand that as a Bitcoiner, you want to know what happens with your data. To provide you with personalized job alerts,<b>I need to store your chosen keywords and the associated chat ID.</b> \n\nI do not know who you are or what your Telegram handle is, though.\n\nIf you are not comfortable with this, please do not chat with me. By engaging with me, you acknowledge that you have been made aware of this.";
        const imageFilePath = "./public/bot-img.jpg";
        await bot.sendPhoto(msg.chat.id, imageFilePath, {
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
        await bot.sendMessage(
          msg.chat.id,
          TRANSLATIONS[userLanguage].general.donate,
          keyboard
        );
      })();

      break;
    case "/jobs":
      if (msg.chat.id) {
        const chatId = msg.chat.id.toString();
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
        await bot.sendMessage(
          chatId,
          TRANSLATIONS[userLanguage].general["latest-jobs"],
          keyboard
        );
      }
      break;
    case "/jobalert":
      (async () => {
        const chatId = msg.chat.id.toString();
        const response = await hasJobAlert(chatId);
        const messageSetup =
          "To set up a job alert, enter keywords separated by commas.\n\nFor example:  Remote, Customer Support, Pay in Bitcoin";
        const messageUpdate =
          "Simply add keywords, separated by commas, to receive job alerts.\n ";
        const keyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "See current Alert", callback_data: "current-alerts" },
                { text: "Delete Job Alert", callback_data: "delete-alerts" },
              ],
            ],
          },
        };
        const sendKeyboard = response?.length > 0 ? keyboard : undefined;
        const sendMessage = response?.length > 0 ? messageUpdate : messageSetup;

        await bot.sendMessage(chatId, sendMessage, sendKeyboard);
        setJobAlert = true;
      })();
      break;
    case "/help":
      (async () => {
        const getCommands = await bot.getMyCommands();
        const commands = getCommands.map((command) => {
          return `/${command.command} - ${command.description}`;
        });
        const header = TRANSLATIONS[userLanguage].general["help"];

        const commandsMessage = header + commands.join("\n");
        await bot.sendMessage(msg.chat.id, commandsMessage);
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
        const message =
          "Hey there, I’m Anja, the founder of Bitvocation.\n\nI made a free guide “How to find your first job in Bitcoin” for you, which you can get on the Bitvocation website.\nEnjoy!";
        const anjaIMG = "./public/anja-img.jpg";
        await bot.sendPhoto(msg.chat.id, anjaIMG, {
          caption: message,
          parse_mode: "HTML",
          reply_markup: keyboard.reply_markup,
        });
      })();
      break;
    case "/privacy":
      (async () => {
        const message =
          "<b>🔴 IMPORTANT INFO REGARDING YOUR DATA & PRIVACY 🔴</b>\n\nI understand that as a Bitcoiner, you want to know what happens with your data. To provide you with personalized job alerts, I need to store your chosen keywords and the associated chat ID.\n\n<b>I do not know who you are or what your Telegram handle is.</b>\n\nIf you are not comfortable with this, please do not chat with me. By engaging with me, you acknowledge that you have read this message.";
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
        await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
      })();
      break;
    default:
      break;
  }
});

bot.on("callback_query", async (callbackQuery) => {
  if (!callbackQuery.message) return;
  const chatId = callbackQuery.message.chat.id;
  const userLanguage = "en";
  let messageText = "";

  switch (callbackQuery.data) {
    case "accept-privacy":
      (async () => {
        handlePrivacy(chatId, true);
      })();
      break;
    case "decline-privacy":
      (async () => {
        handlePrivacy(chatId, false);
      })();
      break;
    case "last-week":
      (async () => {
        const JobArray = await getLatestJobs();
        await sendParseMessage(chatId, JobArray, bot, [""]);
      })();
      break;
    case "current-alerts":
      (async () => {
        const jobAlertsData = await hasJobAlert(chatId.toString());

        if (jobAlertsData && jobAlertsData.length > 0) {
          const formattedJobAlerts = jobAlertsData.join(", ");

          const message =
            jobAlertsData.length === 1
              ? `Your current job alert is:\n\n ${formattedJobAlerts}`
              : `Your current job alerts are:\n\n ${formattedJobAlerts}`;

          bot.sendMessage(chatId, message);
        } else {
          bot.sendMessage(chatId, "You don't have any job alerts set up.");
        }
      })();

      break;
    case "delete-alerts":
      (async () => {
        const chatId = callbackQuery.message?.chat.id;
        if (!chatId) return;
        const response = await deleteJobAlerts(chatId.toString());
        if (response) {
          await bot.sendMessage(chatId, "Job alert deleted!");
        } else {
          await bot.sendMessage(
            chatId,
            "Something went wrong. Please try again."
          );
        }
      })();
      break;
    case "query-keyword":
      waitingForKeywords = true;
      messageText = TRANSLATIONS[userLanguage].general["query-keywords"];
      break;
    case "explore-categories":
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
        await bot.sendMessage(
          chatId,
          TRANSLATIONS[userLanguage].general.categories,
          keyboard
        );
      })();
      break;
    case "design":
      (async () => {
        const catArray = await getLatestJobs([
          "design",
          "ui",
          "ux",
          "UI/UX",
          "graphic",
          "web design",
        ]);
        await sendParseMessage(chatId, catArray, bot, ["in Design"]);
      })();
      break;
    case "sales":
      (async () => {
        const catArray = await getLatestJobs([
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
        await sendParseMessage(chatId, catArray, bot, ["in Sales/Marketing"]);
      })();
      break;
    case "legal":
      (async () => {
        const catArray = await getLatestJobs([
          "Lawyer",
          "Counsel",
          "Compliance",
          "Regulatory",
          "AML",
          "KYC",
          "risk analyst",
        ]);
        await sendParseMessage(chatId, catArray, bot, ["in Legal"]);
      })();
      break;
    case "engineering":
      (async () => {
        const catArray = await getLatestJobs([
          "engineering",
          "software",
          "developer",
          "devops",
          "Mobile App,",
          "Security",
          "Technician",
          "QA",
        ]);
        await sendParseMessage(chatId, catArray, bot, ["in Engineering/IT"]);
      })();
      break;
    case "customer-op":
      (async () => {
        const catArray = await getLatestJobs([
          "Customer Success",
          "Customer Happiness",
          "Customer Service",
          "Technical Support",
          "Helpdesk",
          "Onboarding",
          "Community Manager",
          "Operations",
        ]);
        await sendParseMessage(chatId, catArray, bot, ["in Customer Support"]);
      })();
      break;
    case "finance":
      (async () => {
        const catArray = await getLatestJobs([
          "Personal Assistant",
          "risk analyst,",
          "trading",
          "fund manager",
          "Finance",
        ]);
        await sendParseMessage(chatId, catArray, bot, [
          "in Operations/Finance",
        ]);
      })();
      break;
    case "hr":
      (async () => {
        const catArray = await getLatestJobs([
          "Human Resources",
          "People Operations",
          "People Business Partner",
          "Recruiter",
          "Talent Acquisition",
        ]);
        await sendParseMessage(chatId, catArray, bot, ["in HR"]);
      })();
      break;
    case "creative":
      (async () => {
        const catArray = await getLatestJobs([
          "Content Creator",
          "Copywriter",
          "video editor",
          "Social Media",
          "Writer",
        ]);
        await sendParseMessage(chatId, catArray, bot, ["in Creative"]);
      })();
      break;
    case "volunteering":
      (async () => {
        const catArray = await getLatestJobs([
          "volunteer",
          "intern",
          "internship",
          "apprentice",
          "volunteering",
        ]);
        await sendParseMessage(chatId, catArray, bot, ["in Volunteering"]);
      })();
      break;
    default:
      break;
  }
  if (messageText) {
    await bot.sendMessage(chatId, messageText);
  }
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1); // exit application when there is an uncaught exception
});

process.on("SIGINT", () => {
  console.log("\nExiting...");
  bot.stopPolling();
  process.exit(0);
});
