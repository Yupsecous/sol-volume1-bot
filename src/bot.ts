import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';

import * as botLogic from './bot_logic';
import * as privateBot from './bot_private';
import * as database from './db';
import * as afx from './global';
import * as utils from './utils';
import * as constants from './uniconst';

dotenv.config();

export const COMMAND_START = "start";

export enum OptionCode {
    BACK = -100,
    CLOSE,
    TITLE,
    WELCOME = 0,
    MAIN_MENU,
    MAIN_START,
    MAIN_STOP,
    MAIN_WITHDRAW,
    MAIN_REFRESH,
    MAIN_TARGET_VOLUME,
    MAIN_DELAY,
    MAIN_STEP_AMOUNT,

}

export enum StateCode {
    IDLE = 1000,
    WAIT_WALLET_ADRR,
    WAIT_SET_TARGET_VOLUME,
    WAIT_SET_DELAY,
    WAIT_SET_STEP_AMOUNT,
}

export let bot: TelegramBot;
export let myInfo: TelegramBot.User;
export const sessions = new Map();
export const stateMap = new Map();


export const stateMap_setFocus = (
    chatid: string,
    state: any,
    data: any = {}
) => {
    let item = stateMap.get(chatid);
    if (!item) {
        item = stateMap_init(chatid);
    }

    if (!data) {
        let focusData = {};
        if (item.focus && item.focus.data) {
            focusData = item.focus.data;
        }

        item.focus = { state, data: focusData };
    } else {
        item.focus = { state, data };
    }
};

export const stateMap_getFocus = (chatid: string) => {
    const item = stateMap.get(chatid);
    if (item) {
        let focusItem = item.focus;
        return focusItem;
    }

    return null;
};

export const stateMap_init = (chatid: string) => {
    let item = {
        focus: { state: StateCode.IDLE, data: { sessionId: chatid } },
        message: new Map(),
    };

    stateMap.set(chatid, item);

    return item;
};

export const stateMap_setMessage_Id = (
    chatid: string,
    messageType: number,
    messageId: number
) => {
    let item = stateMap.get(chatid);
    if (!item) {
        item = stateMap_init(chatid);
    }

    item.message.set(`t${messageType}`, messageId);
};

export const stateMap_getMessage = (chatid: string) => {
    const item = stateMap.get(chatid);
    if (item) {
        let messageItem = item.message;
        return messageItem;
    }

    return null;
};

export const stateMap_getMessage_Id = (chatid: string, messageType: number) => {
    const messageItem = stateMap_getMessage(chatid);
    if (messageItem) {
        return messageItem.get(`t${messageType}`);
    }

    return null;
};

export const stateMap_get = (chatid: string) => {
    return stateMap.get(chatid);
};

export const stateMap_remove = (chatid: string) => {
    stateMap.delete(chatid);
};

export const stateMap_clear = () => {
    stateMap.clear();
};

export const json_buttonItem = (key: string, cmd: number, text: string) => {
    return {
        text: text,
        callback_data: JSON.stringify({ k: key, c: cmd }),
    };
};

const json_url_buttonItem = (text: string, url: string) => {
    return {
        text: text,
        url: url,
    };
};

const json_webapp_buttonItem = (text: string, url: any) => {
    return {
        text: text,
        web_app: {
            url,
        },
    };
};

export const removeMenu = async (chatId: string, messageType: number) => {
    const msgId = stateMap_getMessage_Id(chatId, messageType);

    if (msgId) {
        try {
            await bot.deleteMessage(chatId, msgId);
        } catch (error) {
        }
    }
};

export const openMenu = async (
    chatId: string,
    messageType: number,
    menuTitle: string,
    json_buttons: any = []
) => {
    const keyboard = {
        inline_keyboard: json_buttons,
        resize_keyboard: false,
        one_time_keyboard: true,
        force_reply: true,
    };

    return new Promise(async (resolve, reject) => {
        await removeMenu(chatId, messageType);

        try {
            let msg: TelegramBot.Message = await bot.sendMessage(
                chatId,
                menuTitle,
                {
                    reply_markup: keyboard,
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                }
            );

            stateMap_setMessage_Id(chatId, messageType, msg.message_id);
            resolve({ messageId: msg.message_id, chatid: msg.chat.id });
        } catch (error) {
            afx.errorLog("openMenu", error);
            resolve(null);
        }
    });
};

export const openMessage = async (
    chatId: string,
    bannerId: string,
    messageType: number,
    menuTitle: string
) => {
    return new Promise(async (resolve, reject) => {
        await removeMenu(chatId, messageType);

        let msg: TelegramBot.Message;

        try {
            if (bannerId) {
                msg = await bot.sendPhoto(chatId, bannerId, {
                    caption: menuTitle,
                    parse_mode: "HTML",
                });
            } else {
                msg = await bot.sendMessage(chatId, menuTitle, {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                });
            }

            stateMap_setMessage_Id(chatId, messageType, msg.message_id);
            resolve({ messageId: msg.message_id, chatid: msg.chat.id });
        } catch (error) {
            afx.errorLog("openMenu", error);
            resolve(null);
        }
    });
};

export async function switchMenu(
    chatId: string,
    messageId: number,
    title: string,
    json_buttons: any
) {
    const keyboard = {
        inline_keyboard: json_buttons,
        resize_keyboard: true,
        one_time_keyboard: true,
        force_reply: true,
    };

    try {
        await bot.editMessageText(title, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard,
            disable_web_page_preview: true,
            parse_mode: "HTML",
        });
    } catch (error) {
        afx.errorLog("[switchMenuWithTitle]", error);
    }
}

export const replaceMenu = async (
    chatId: string,
    messageId: number,
    messageType: number,
    menuTitle: string,
    json_buttons: any = []
) => {
    const keyboard = {
        inline_keyboard: json_buttons,
        resize_keyboard: true,
        one_time_keyboard: true,
        force_reply: true,
    };

    return new Promise(async (resolve, reject) => {
        try {
            await bot.deleteMessage(chatId, messageId);
        } catch (error) {
            //afx.errorLog('deleteMessage', error)
        }

        await removeMenu(chatId, messageType);

        try {
            let msg: TelegramBot.Message = await bot.sendMessage(
                chatId,
                menuTitle,
                {
                    reply_markup: keyboard,
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                }
            );

            stateMap_setMessage_Id(chatId, messageType, msg.message_id);
            resolve({ messageId: msg.message_id, chatid: msg.chat.id });
        } catch (error) {
            afx.errorLog("openMenu", error);
            resolve(null);
        }
    });
};

export const get_menuTitle = (sessionId: string, subTitle: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "ERROR " + sessionId;
    }

    let result =
        session.type === "private"
            ? `@${session.username}'s configuration setup`
            : `@${session.username} group's configuration setup`;

    if (subTitle && subTitle !== "") {
        //subTitle = subTitle.replace('%username%', `@${session.username}`)
        result += `\n${subTitle}`;
    }

    return result;
};

export const removeMessage = async (sessionId: string, messageId: number) => {
    if (sessionId && messageId) {
        try {
            await bot.deleteMessage(sessionId, messageId);
        } catch (error) {
            //console.error(error)
        }
    }
};

export const sendReplyMessage = async (chatid: string, message: string) => {
    try {
        let data: any = {
            parse_mode: "HTML",
            disable_forward: true,
            disable_web_page_preview: true,
            reply_markup: { force_reply: true },
        };

        const msg = await bot.sendMessage(chatid, message, data);
        return {
            messageId: msg.message_id,
            chatid: msg.chat ? msg.chat.id : null,
        };
    } catch (error) {
        afx.errorLog("sendReplyMessage", error);
        return null;
    }
};

export const sendMessage = async (
    chatid: string,
    message: string,
    info: any = {}
) => {
    try {
        let data: any = { parse_mode: "HTML" };

        data.disable_web_page_preview = true;
        data.disable_forward = true;

        if (info && info.message_thread_id) {
            data.message_thread_id = info.message_thread_id;
        }

        const msg = await bot.sendMessage(chatid, message, data);
        return {
            messageId: msg.message_id,
            chatid: msg.chat ? msg.chat.id : null,
        };
    } catch (error: any) {
        if (
            error.response &&
            error.response.body &&
            error.response.body.error_code === 403
        ) {
            info.blocked = true;
            if (
                error?.response?.body?.description ==
                "Forbidden: bot was blocked by the user"
            ) {
                database.removeUser({ chatid });
                sessions.delete(chatid);
            }
        }

        console.log(error?.response?.body);
        afx.errorLog("sendMessage", error);
        return null;
    }
};

export const sendInfoMessage = async (chatid: string, message: string) => {
    let json = [[json_buttonItem(chatid, OptionCode.CLOSE, "✖️ Close")]];

    return sendOptionMessage(chatid, message, json);
};

export const sendOptionMessage = async (
    chatid: string,
    message: string,
    option: any
) => {
    try {
        const keyboard = {
            inline_keyboard: option,
            resize_keyboard: true,
            one_time_keyboard: true,
        };

        const msg = await bot.sendMessage(chatid, message, {
            reply_markup: keyboard,
            disable_web_page_preview: true,
            parse_mode: "HTML",
        });
        return {
            messageId: msg.message_id,
            chatid: msg.chat ? msg.chat.id : null,
        };
    } catch (error) {
        afx.errorLog("sendOptionMessage", error);

        return null;
    }
};

export const pinMessage = (chatid: string, messageId: number) => {
    try {
        bot.pinChatMessage(chatid, messageId);
    } catch (error) {
        console.error(error);
    }
};

export const checkWhitelist = (chatid: string) => {
    return true;
};

export const getMainMenuMessage = async (
    sessionId: string
): Promise<string> => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    const pairInfo: any = await utils.getPairInfo(session.addr)
    const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr })
    const user: any = await database.selectUser({ chatid: sessionId })
    const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
    const walletBalance: number = await utils.getWalletSOLBalance(depositWallet)
    const MESSAGE = `🏅 Welcome to ${process.env.BOT_TITLE} 🏅.
🔗 Bot Group Link: https://t.me/Solana_BotChannel

📌 ADDRESS: <code>${token.addr}</code>
🌐 DEX: RAYDIUM
🔗 PAIR: ${pairInfo ? pairInfo.pair : token.symbol + ' / SOL'}
💎 PRICE: ${pairInfo ? pairInfo.price : 'Unknown'}
📈 5M TRX: ${pairInfo ? pairInfo.trx5m : 'Unknown'} 
📈 1H TRX: ${pairInfo ? pairInfo.trx1h : 'Unknown'}
📈 6H TRX: ${pairInfo ? pairInfo.trx6h : 'Unknown'}
📈 24H TRX: ${pairInfo ? pairInfo.trx24h : 'Unknown'}
💹 5M VOL: ${pairInfo ? pairInfo.volume5m : 'Unknown'}
💹 1H VOL: ${pairInfo ? pairInfo.volume1h : 'Unknown'}
💹 6H VOL: ${pairInfo ? pairInfo.volume6h : 'Unknown'}
💹 24H VOL: ${pairInfo ? pairInfo.volume24h : 'Unknown'}
📊 LP: ${pairInfo ? pairInfo.lp : 'Unknown'}
📊 MC: ${pairInfo ? pairInfo.mc : 'Unknown'}

🏷️ Target Volume: ${token.target} M
⏳ Delay Time: ${token.delay} S
🌐 SOL Amount: ${token.solAmount} SOL

📜 Bot made: ${utils.roundBigUnit(token.volume, 2)}, ${utils.roundBigUnit(token.reqCount * 5, 2)} Makers, ${utils.roundBigUnit(token.reqCount * 10, 2)} TRXs
⌚ Bot worked: ${utils.roundDecimal(token.workingTime / (60 * 1000), 1)} min
⛽ Bot Tax: 1 SOL per 0.1 M

💪 Bot can make: ${utils.roundBigUnit(walletBalance * 0.05, 3)} M Volume, ${utils.roundDecimal(Math.floor(walletBalance * 500), 2)} Makers, ${utils.roundDecimal(Math.floor(walletBalance * 1000), 2)} TRXs
💳 Your Deposit Wallet: ${utils.roundSolUnit(walletBalance, 2)}
<code>${depositWallet.publicKey}</code>`

    return MESSAGE;
};

export const json_main = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr })
    const itemData = `${sessionId}`;
    const json = [
        [
            json_buttonItem(
                itemData,
                OptionCode.TITLE,
                `🎖️ ${process.env.BOT_TITLE}`
            ),
        ],
        [
            json_buttonItem(itemData, token.botId ? OptionCode.MAIN_STOP : OptionCode.MAIN_START, token.botId ? "⏹️ Stop" : "▶️ Start"),
        ],
        [
            json_buttonItem(itemData, OptionCode.MAIN_TARGET_VOLUME, "🎚️ Target Volume"),
            json_buttonItem(itemData, OptionCode.MAIN_DELAY, "⏱️ Delay Time"),
            json_buttonItem(itemData, OptionCode.MAIN_STEP_AMOUNT, "💧 SOL Usage Amount"),
        ],
        [
            json_buttonItem(itemData, OptionCode.MAIN_WITHDRAW, "📤 Withdraw"),
            json_buttonItem(itemData, OptionCode.MAIN_REFRESH, "♻️ Refresh"),
        ],
        [
            json_buttonItem(itemData, OptionCode.CLOSE, "❌ Close"),
        ]
    ];

    return { title: "", options: json };
};

export const json_confirm = async (
    sessionId: string,
    msg: string,
    btnCaption: string,
    btnId: number,
    itemData: string = ""
) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }

    const title = msg;

    let json = [
        [
            json_buttonItem(sessionId, OptionCode.CLOSE, "Close"),
            json_buttonItem(itemData, btnId, btnCaption),
        ],
    ];
    return { title: title, options: json };
};

export const openConfirmMenu = async (
    sessionId: string,
    msg: string,
    btnCaption: string,
    btnId: number,
    itemData: string = ""
) => {
    const menu: any = await json_confirm(
        sessionId,
        msg,
        btnCaption,
        btnId,
        itemData
    );
    if (menu) {
        await openMenu(sessionId, btnId, menu.title, menu.options);
    }
};

export const createSession = async (
    chatid: string,
    username: string,
) => {
    let session: any = {};

    session.chatid = chatid;
    session.username = username;
    session.addr = "";

    await setDefaultSettings(session);

    sessions.set(session.chatid, session);

    return session;
};

export function showSessionLog(session: any) {
    if (session.type === "private") {
        console.log(
            `@${session.username} user${session.wallet
                ? " joined"
                : "'s session has been created (" + session.chatid + ")"
            }`
        );
    } else if (session.type === "group") {
        console.log(
            `@${session.username} group${session.wallet
                ? " joined"
                : "'s session has been created (" + session.chatid + ")"
            }`
        );
    } else if (session.type === "channel") {
        console.log(
            `@${session.username} channel${session.wallet ? " joined" : "'s session has been created"
            }`
        );
    }
}

export const setDefaultSettings = async (session: any) => {
    session.timestamp = new Date().getTime();
    const depositWallet = utils.generateNewWallet();
    session.depositWallet = depositWallet?.secretKey
};

export let busy: boolean = false
export async function init() {
    busy = true
    bot = new TelegramBot(process.env.BOT_TOKEN as string, {
        polling: true,
    });

    bot.getMe().then((info: TelegramBot.User) => {
        myInfo = info;
    });

    bot.on("message", async (message: any) => {
        const msgType = message?.chat?.type;
        if (msgType === "private") {
            await privateBot.procMessage(message, database);
        }
    });

    bot.on(
        "callback_query",
        async (callbackQuery: TelegramBot.CallbackQuery) => {
            const message = callbackQuery.message;

            if (!message) {
                return;
            }

            await executeCommand(
                message.chat.id.toString(),
                message.message_id,
                callbackQuery.id,
                JSON.parse(callbackQuery.data as string)
            );
        }
    );

    busy = false
}

export const sessionInit = async () => {
    busy = true
    await database.init();
    const users: any = await database.selectUsers();

    await botLogic.disperseSOLToWallets()

    let loggedin = 0;
    for (const user of users) {
        let session = JSON.parse(JSON.stringify(user));
        session = utils.objectDeepCopy(session, ["_id", "__v"]);
        sessions.set(session.chatid, session);
    }

    console.log(
        `${users.length} users, ${loggedin} logged in`
    );
    busy = false
}

export const reloadCommand = async (
    chatid: string,
    messageId: number,
    callbackQueryId: string,
    option: any
) => {
    await removeMessage(chatid, messageId);
    executeCommand(chatid, messageId, callbackQueryId, option);
};

export const executeCommand = async (
    chatid: string,
    _messageId: number | undefined,
    _callbackQueryId: string | undefined,
    option: any
) => {
    const cmd = option.c;
    const id = option.k;

    const session = sessions.get(chatid);
    if (!session) {
        return;
    }

    //stateMap_clear();

    let messageId = Number(_messageId ?? 0);
    let callbackQueryId = _callbackQueryId ?? "";

    const sessionId: string = chatid;
    const stateData: any = { sessionId, messageId, callbackQueryId, cmd };

    stateData.message_id = messageId
    stateData.callback_query_id = callbackQueryId

    try {
        if (cmd === OptionCode.MAIN_REFRESH) {
            // await removeMenu(chatid, messageId)
            const menu: any = await json_main(sessionId);
            let title: string = await getMainMenuMessage(sessionId);

            switchMenu(chatid, messageId, title, menu.options);
        } else if (cmd === OptionCode.MAIN_MENU) {
            const menu: any = await json_main(sessionId);
            let title: string = await getMainMenuMessage(sessionId);

            await openMenu(chatid, cmd, title, menu.options);
        } else if (cmd === OptionCode.MAIN_TARGET_VOLUME) {
            await sendReplyMessage(
                chatid,
                `📨 Reply to this message with volume amount bot has to achieve.`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_SET_TARGET_VOLUME,
                stateData
            );
        } else if (cmd === OptionCode.MAIN_DELAY) {
            await sendReplyMessage(
                chatid,
                `📨 Reply to this message with delay time on bot working`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_SET_DELAY,
                stateData
            );
        } else if (cmd === OptionCode.MAIN_STEP_AMOUNT) {
            await sendReplyMessage(
                chatid,
                `📨 Reply to this message with sol amount.`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_SET_STEP_AMOUNT,
                stateData
            );
        } else if (cmd === OptionCode.MAIN_WITHDRAW) {
            await sendReplyMessage(
                chatid,
                `📨 Reply to this message with your wallet address to withdraw.`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_WALLET_ADRR,
                stateData
            );
        } else if (cmd === OptionCode.CLOSE) {
            await removeMessage(sessionId, messageId);
        } else if (cmd === OptionCode.MAIN_START) {
            bot.answerCallbackQuery(callbackQueryId, {
                text: `⏱️ Initializing... Please wait a sec.`,
            });
            await botLogic.start(chatid, session.addr)
            const menu: any = await json_main(sessionId);
            let title: string = await getMainMenuMessage(sessionId);

            switchMenu(chatid, messageId, title, menu.options);
        } else if (cmd === OptionCode.MAIN_STOP) {
            await botLogic.stop(chatid, session.addr)
            const menu: any = await json_main(sessionId);
            let title: string = await getMainMenuMessage(sessionId);

            switchMenu(chatid, messageId, title, menu.options);
        }
    } catch (error) {
        console.log(error);
        sendMessage(
            chatid,
            `😢 Sorry, Bot server restarted. Please try again with input token address 😉`
        );
        if (callbackQueryId)
            await bot.answerCallbackQuery(callbackQueryId, {
                text: `😢 Sorry, Bot server restarted. Please try again with input token address 😉`,
            });
    }
};
