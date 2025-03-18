import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export type TokenStatus =
  | "validated"
  | "buyable"
  | "sold"
  // archived
  | "rugpull"
  | "honeypot"
  | "archived";
export type DexType = "uniswapv2" | "uniswapv3" | "uniswapv4" | "aerodrome" | "balancer" | null;

export type TradeStatus = "buy" | "sell";
export type TradeType = "usdValue" | "doubleExit" | "earlyExit" | "partialSell" | "fullSell";

export const token = sqliteTable("token", {
  id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  creatorAddress: text("creator_address").notNull(),
  status: text("status", {
    enum: [
      "validated",
      "buyable",
      "sold",
      // archived
      "rugpull",
      "honeypot",
      "archived",
    ],
  }).notNull(),
  dex: text("dex", { enum: ["uniswapv2", "uniswapv3", "uniswapv4", "aerodrome", "balancer"] }),
  isSuspicious: integer("is_suspicious", { mode: "boolean" }).notNull().default(false),
  discoveredAt: integer("discovered_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const trade = sqliteTable("trade", {
  id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
  tokenAddress: text("token_address").notNull(),
  tokenName: text("token_name").notNull(),
  transactionHash: text("transaction_hash").notNull(),
  status: text("status", { enum: ["buy", "sell"] }).notNull(),
  type: text("type", { enum: ["usdValue", "doubleExit", "earlyExit", "partialSell", "fullSell"] }).notNull(),
  ethSpent: text("eth_spent").notNull().default("0"),
  ethReceived: text("eth_received").notNull().default("0"),
  rawSellAmount: text("raw_sell_amount").notNull().default("0"),
  rawBuyAmount: text("raw_buy_amount").notNull().default("0"),
  formattedSellAmount: text("formatted_sell_amount").notNull().default("0"),
  formattedBuyAmount: text("formatted_buy_amount").notNull().default("0"),
  tokenPriceUsd: text("token_price_usd").notNull(),
  ethPriceUsd: text("eth_price_usd").notNull(),
  gasCostEth: text("gas_cost_eth").notNull(),
  gasCostUsd: text("gas_cost_usd").notNull(),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const position = sqliteTable("position", {
  id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
  tokenAddress: text("token_address").notNull().unique(),
  tokenName: text("token_name").notNull(),
  rawTotalTokensBought: text("raw_total_tokens_bought").notNull().default("0"),
  rawTotalTokensSold: text("raw_total_tokens_sold").notNull().default("0"),
  rawRemainingTokens: text("raw_remaining_tokens").notNull().default("0"),
  formattedTotalTokensBought: text("formatted_total_tokens_bought").notNull().default("0"),
  formattedTotalTokensSold: text("formatted_total_tokens_sold").notNull().default("0"),
  formattedRemainingTokens: text("formatted_remaining_tokens").notNull().default("0"),
  totalEthSpent: text("raw_total_eth_spent").notNull().default("0"),
  totalEthReceived: text("raw_total_eth_received").notNull().default("0"),
  totalUsdSpent: text("raw_total_usd_spent").notNull().default("0"),
  totalUsdReceived: text("raw_total_usd_received").notNull().default("0"),
  totalGasCostEth: text("raw_total_gas_cost_eth").notNull().default("0"),
  totalGasCostUsd: text("raw_total_gas_cost_usd").notNull().default("0"),
  currentProfitLossUsd: text("current_profit_loss_usd").notNull().default("0"),
  averageEntryPriceUsd: text("average_entry_price_usd").notNull().default("0"),
  averageExitPriceUsd: text("average_exit_price_usd").notNull().default("0"),
  lastTradeAt: integer("last_trade_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
