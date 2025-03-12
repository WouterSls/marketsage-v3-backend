import {
  WebhookSubscription,
  WebhookEventType,
  WebhookPayloadMap,
  WebhookDeliverySuccess,
  WebhookDeliveryFailure,
} from "./webhook.types";

export class WebhookService {
  private static instance: WebhookService;
  private subscriptions: WebhookSubscription[] = [];

  private constructor() {}

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  async subscribe(url: string, events: WebhookEventType[]): Promise<WebhookSubscription> {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const subscription: WebhookSubscription = {
      id,
      url,
      events,
      createdAt: Date.now(),
    };

    this.subscriptions.push(subscription);
    console.log(`New webhook subscription registered: ${id} for events: ${events.join(", ")}`);

    return subscription;
  }

  async unsubscribe(id: string): Promise<boolean> {
    const initialLength = this.subscriptions.length;
    this.subscriptions = this.subscriptions.filter((sub) => sub.id !== id);

    const removed = initialLength > this.subscriptions.length;
    if (removed) {
      console.log(`Webhook unsubscribed: ${id}`);
    } else {
      console.warn(`Webhook unsubscribe failed: ${id} not found`);
    }

    return removed;
  }

  async broadcast<T extends WebhookEventType>(eventType: T, payload: WebhookPayloadMap[T]): Promise<void> {
    const relevantSubscriptions = this.subscriptions.filter((sub) => sub.events.includes(eventType));

    console.log(`Broadcasting ${eventType} to ${relevantSubscriptions.length} subscribers`);

    const deliveryPromises = relevantSubscriptions.map(async (subscription) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(subscription.url, {
          method: "POST",
          /** 
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Id": subscription.id,
            "X-Webhook-Timestamp": Date.now().toString(),
          },
*/
          body: JSON.stringify({
            event: eventType,
            ...payload,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        console.log(`Webhook delivered to ${subscription.url}: ${response.status}`);
        return { success: true, subscription } as WebhookDeliverySuccess;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Webhook delivery failed to ${subscription.url}: ${errorMessage}`);
        return {
          success: false,
          subscription,
          error: errorMessage,
        } as WebhookDeliveryFailure;
      }
    });

    await Promise.all(deliveryPromises);
  }

  getSubscriptions(): WebhookSubscription[] {
    return [...this.subscriptions];
  }
}
