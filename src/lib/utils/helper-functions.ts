export async function sleep(seconds: number) {
  const ms = seconds * 1000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function splitTokenAddress(tokenAddress: string) {
  const firstFive = tokenAddress.substring(0, 5);
  const lastSix = tokenAddress.substring(tokenAddress.length - 6);

  return `${firstFive}...${lastSix}`;
}
