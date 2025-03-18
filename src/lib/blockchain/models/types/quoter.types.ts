export interface QuoteExactInputSingleParams {
  tokenIn: string; // The contract address of the input token
  tokenOut: string; // The contract address of the output token
  fee: number; // The fee tier of the pool (e.g., 500, 3000, 10000)
  amountIn: string; // The amount of input tokens (as a decimal string)
  sqrtPriceLimitX96: string; // The price limit - 0 for no limit
}

export interface QuoteExactInputSingleResult {
  amountOut: string; // The amount of output tokens
  sqrtPriceX96After: string; // The sqrt price after the swap
  initializedTicksCrossed: number; // Number of initialized ticks crossed
  gasEstimate: string; // Estimated gas used
}

export interface QuoteExactOutputSingleParams {
  tokenIn: string; // The contract address of the input token
  tokenOut: string; // The contract address of the output token
  fee: number; // The fee tier of the pool
  amountOut: string; // The amount of output tokens desired
  sqrtPriceLimitX96: string; // The price limit - 0 for no limit
}

export interface QuoteExactOutputSingleResult {
  amountIn: string; // The amount of input tokens required
  sqrtPriceX96After: string; // The sqrt price after the swap
  initializedTicksCrossed: number; // Number of initialized ticks crossed
  gasEstimate: string; // Estimated gas used
}

export interface QuoteExactInputParams {
  path: string; // The encoded swap path
  amountIn: string; // The amount of input tokens
}

export interface QuoteExactOutputParams {
  path: string; // The encoded swap path (reverse order from input)
  amountOut: string; // The amount of output tokens desired
}
