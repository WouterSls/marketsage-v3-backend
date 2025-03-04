export class LiquidityCheckingService {
  private static instance: LiquidityCheckingService;

  private constructor() {}

  static getInstance(): LiquidityCheckingService {
    if (!LiquidityCheckingService.instance) {
      LiquidityCheckingService.instance = new LiquidityCheckingService();
    }
    return LiquidityCheckingService.instance;
  }
}
