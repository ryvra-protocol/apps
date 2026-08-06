export type OrderSide = "BUY" | "SELL";

export interface AssetDto {
  id: string;
  symbol: string;
  name: string;
}

export interface RiskLimitDto {
  maxNotional: number;
  maxLeverage: number;
}

export interface PositionDto {
  id: string;
  assetId: string;
  quantity: number;
  avgEntryPrice: number;
}

export interface ExecutionIntent {
  assetId: string;
  side: OrderSide;
  quantity: number;
  priceLimit?: number;
}

export interface OrderDto {
  id: string;
  assetId: string;
  side: OrderSide;
  quantity: number;
  status: "PREVIEW" | "PENDING" | "FILLED" | "REJECTED";
}
