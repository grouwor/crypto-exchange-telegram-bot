import { Telegraf, Markup } from 'telegraf';
import moment from 'moment';
import dotenv from 'dotenv';

dotenv.config()
const BOT_TOKEN = process.env.BOT_TOKEN;

const bot = new Telegraf(BOT_TOKEN);

// User balances
const userBalances = {};

// Bot balance
let botBalance = 0;

// Transaction history
const transactionHistory = {};

// Referral system
const referralBonusPercentage = 1;

// Automatic withdrawal and deposit
// Implement your own logic here

// Manual deposit orders
const manualDepositOrders = [];

// Order approval/rejection
const adminChatId = 'YOUR_ADMIN_CHAT_ID';

// User profile and transaction history
bot.command('profile', (ctx) => {
  const userId = ctx.from.id;
  const userBalance = userBalances[userId] || 0;
  const userTransactions = transactionHistory[userId] || [];

  let message = `💼 User Profile\n\n`;
  message += `💰 Balance: ${userBalance} BTC\n\n`;
  message += `📚 Transaction History:\n`;

  if (userTransactions.length > 0) {
    userTransactions.slice(-10).forEach((transaction) => {
      const { type, amount, timestamp } = transaction;
      const formattedTimestamp = moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
      message += `🔄 ${type}: ${amount} BTC (${formattedTimestamp})\n`;
    });
  } else {
    message += `No transactions found.`;
  }

  ctx.reply(message);
});

// Referral system
bot.command('referral', (ctx) => {
  const referralCode = generateReferralCode(ctx.from.id);
  ctx.reply(`🔗 Your referral code: ${referralCode}`);
});

// Manual deposit orders
bot.command('deposit', (ctx) => {
  ctx.reply('Please provide proof of payment by attaching a screenshot or other evidence.');
});

bot.on('photo', (ctx) => {
  const userId = ctx.from.id;
  const orderId = generateOrderId();
  const photo = ctx.message.photo[0].file_id;

  manualDepositOrders.push({ orderId, userId, photo });

  ctx.reply('Your manual deposit order has been received and is pending approval.');
  ctx.reply('You will be notified once it is approved or declined.');
  notifyAdmin(`New manual deposit order received: Order ID ${orderId}`);
});

// Order approval/rejection
bot.command('orders', (ctx) => {
  if (ctx.chat.id === adminChatId) {
    const pendingOrders = manualDepositOrders.filter((order) => !order.approved);

    if (pendingOrders.length > 0) {
      const buttons = pendingOrders.map((order) =>
        Markup.callbackButton(`Order ID ${order.orderId}`, `approve_${order.orderId}`)
      );

      ctx.reply('📦 Pending Manual Deposit Orders:', Markup.inlineKeyboard(buttons, { columns: 1 }).extra());
    } else {
      ctx.reply('No pending manual deposit orders.');
    }
  }
});

bot.command('getid', (ctx) => {
    ctx.reply(`Here is your CHAT_ID: ${ctx.chat.id}`);
})

bot.action(/approve_(\d+)/, (ctx) => {
  if (ctx.chat.id === adminChatId) {
    const orderId = ctx.match[1];
    const order = manualDepositOrders.find((order) => order.orderId === orderId);

    if (order) {
      order.approved = true;
      updateBalance(order.userId, 1); // Update user balance with the deposited amount
      notifyUser(order.userId, `Your manual deposit order (Order ID ${orderId}) has been approved.`);
      notifyAdmin(`Manual deposit order (Order ID ${orderId}) approved.`);
    }

    ctx.answerCbQuery('Order approved.');
  }
});

// Helper functions
function generateReferralCode(userId) {
  return `REF${userId}`;
}

function generateOrderId() {
  return Math.floor(Math.random() * 1000000);
}

function updateBalance(userId, amount) {
  if (userBalances[userId]) {
    userBalances[userId] += amount;
  } else {
    userBalances[userId] = amount;
  }

  if (amount > 0) {
    botBalance += amount;
  }
}

function notifyAdmin(message) {
  bot.telegram.sendMessage(adminChatId, message);
}

function notifyUser(userId, message) {
  bot.telegram.sendMessage(userId, message);
}

// Start the bot
bot.startPolling();