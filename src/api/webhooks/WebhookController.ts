import { Request, Response } from "express";
import { WebhookService } from "../../lib/webhooks/WebhookService";
import { WebhookEventType } from "../../lib/webhooks/webhook.types";
import { TokenDto, TradeDto } from "../token-monitor/index";

export class WebhookController {
  private static webhookService = WebhookService.getInstance();

  static async getWebhooks(req: Request, res: Response): Promise<void> {
    try {
      const subscriptions = WebhookController.webhookService.getSubscriptions();
      res.status(200).json({ subscriptions });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error getting webhooks:", errorMessage);
      res.status(500).json({ message: "Error retrieving webhook subscriptions" });
    }
  }

  static async createWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { url, events } = req.body;

      if (!url || !events || !Array.isArray(events) || events.length === 0) {
        res.status(400).json({ message: "Invalid webhook URL or events" });
        return;
      }

      try {
        new URL(url);
      } catch (e) {
        res.status(400).json({ message: "Invalid URL format" });
        return;
      }

      const validEventTypes: WebhookEventType[] = ["tokenUpdateHook", "priceUpdateHook", "tradeReceiveHook"];
      const allEventsValid = events.every((event) => validEventTypes.includes(event as WebhookEventType));
      if (!allEventsValid) {
        res.status(400).json({ message: "Invalid event type(s)" });
        return;
      }

      const subscription = await WebhookController.webhookService.subscribe(url, events as WebhookEventType[]);
      res.status(201).json({
        message: "Webhook subscription created",
        subscription,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error creating webhook:", errorMessage);
      res.status(500).json({ message: "Error creating webhook subscription" });
    }
  }

  static async deleteWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Webhook ID is required" });
        return;
      }

      const deleted = await WebhookController.webhookService.unsubscribe(id);

      if (deleted) {
        res.status(200).json({ message: "Webhook subscription deleted" });
      } else {
        res.status(404).json({ message: "Webhook subscription not found" });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error deleting webhook:", errorMessage);
      res.status(500).json({ message: "Error deleting webhook subscription" });
    }
  }

  static async broadcastTestTokenUpdate(req: Request, res: Response): Promise<void> {
    try {
      console.log("Broadcasting test token update");
      const tokenDto: TokenDto = {
        address: "0x0000000000000000000000000000000000000000",
        name: "Test Token",
        symbol: "TEST",
        status: "honeypot",
        dex: "uniswapv2",
        creatorAddress: "0x0000000000000000000000000000000000000000",
        isSuspicious: false,
        discoveredAt: Date.now(),
        updatedAt: Date.now(),
      };

      await WebhookController.webhookService.broadcast("tokenUpdateHook", {
        tokenAddress: "0x0000000000000000000000000000000000000000",
        data: tokenDto,
      });

      res.status(200).json({ message: "Webhook test broadcasted" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error broadcasting webhook test:", errorMessage);
      res.status(500).json({ message: "Error broadcasting webhook test" });
    }
  }

  static async broadcastTestTradeReceive(req: Request, res: Response): Promise<void> {
    try {
      console.log("Broadcasting test trade receive");
      const tradeDto: TradeDto = {
        tokenAddress: "0x0000000000000000000000000000000000000000",
        tokenName: "Test Token",
        transactionHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        status: "buy",
        type: "earlyExit",
        ethSpent: "0.2",
        ethReceived: "0",
        formattedSellAmount: "0",
        formattedBuyAmount: "150000",
        gasCostEth: "0.002",
        createdAt: Date.now(),
      };

      await WebhookController.webhookService.broadcast("tradeReceiveHook", {
        tokenAddress: "0x0000000000000000000000000000000000000000",
        data: tradeDto,
      });

      res.status(200).json({ message: "Webhook test broadcasted" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error broadcasting webhook test:", errorMessage);
      res.status(500).json({ message: "Error broadcasting webhook test" });
    }
  }
}
