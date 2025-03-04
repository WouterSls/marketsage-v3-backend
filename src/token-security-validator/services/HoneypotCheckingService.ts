export class HoneypotCheckingService {
  private static instance: HoneypotCheckingService;

  private constructor() {}

  static getInstance(): HoneypotCheckingService {
    if (!HoneypotCheckingService.instance) {
      HoneypotCheckingService.instance = new HoneypotCheckingService();
    }
    return HoneypotCheckingService.instance;
  }
}
