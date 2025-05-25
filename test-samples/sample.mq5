//+------------------------------------------------------------------+
//|                                                   Sample EA.mq5 |
//|                        Copyright 2024, MetaQuotes Software Corp. |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024, MetaQuotes Software Corp."
#property link      "https://www.mql5.com"
#property version   "1.00"

// Include necessary libraries
#include <Trade\Trade.mqh>
#include <Indicators\Indicators.mqh>

// Input parameters
input group "=== Trading Parameters ==="
input double   InpLotSize = 0.1;           // Lot size
input int      InpMagicNumber = 12345;     // Magic number
input int      InpStopLoss = 50;           // Stop Loss (points)
input int      InpTakeProfit = 100;        // Take Profit (points)
input ENUM_TIMEFRAMES InpTimeframe = PERIOD_H1; // Timeframe

input group "=== Indicator Parameters ==="
input int      InpMAPeriodFast = 10;       // Fast MA period
input int      InpMAPeriodSlow = 20;       // Slow MA period
input int      InpRSIPeriod = 14;          // RSI period
input double   InpRSIBuyLevel = 30.0;      // RSI buy level
input double   InpRSISellLevel = 70.0;     // RSI sell level

// Global variables
CTrade         trade;
CPositionInfo  position;
CSymbolInfo    symbolInfo;
CAccountInfo   accountInfo;

// Indicator handles
int handleMA_Fast;
int handleMA_Slow;
int handleRSI;

// Arrays for indicator values
double ma_fast_buffer[];
double ma_slow_buffer[];
double rsi_buffer[];

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   // Initialize symbol info
   if(!symbolInfo.Name(_Symbol))
   {
      Print("Failed to initialize symbol info");
      return INIT_FAILED;
   }

   // Set trade parameters
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(10);
   trade.SetTypeFilling(ORDER_FILLING_FOK);

   // Initialize indicators
   handleMA_Fast = iMA(_Symbol, InpTimeframe, InpMAPeriodFast, 0, MODE_SMA, PRICE_CLOSE);
   handleMA_Slow = iMA(_Symbol, InpTimeframe, InpMAPeriodSlow, 0, MODE_SMA, PRICE_CLOSE);
   handleRSI = iRSI(_Symbol, InpTimeframe, InpRSIPeriod, PRICE_CLOSE);

   // Check indicator handles
   if(handleMA_Fast == INVALID_HANDLE || handleMA_Slow == INVALID_HANDLE || handleRSI == INVALID_HANDLE)
   {
      Print("Failed to create indicator handles");
      return INIT_FAILED;
   }

   // Set array as series
   ArraySetAsSeries(ma_fast_buffer, true);
   ArraySetAsSeries(ma_slow_buffer, true);
   ArraySetAsSeries(rsi_buffer, true);

   Print("Expert Advisor initialized successfully");
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   // Release indicator handles
   if(handleMA_Fast != INVALID_HANDLE)
      IndicatorRelease(handleMA_Fast);
   if(handleMA_Slow != INVALID_HANDLE)
      IndicatorRelease(handleMA_Slow);
   if(handleRSI != INVALID_HANDLE)
      IndicatorRelease(handleRSI);

   Print("Expert Advisor deinitialized. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // Update symbol info
   if(!symbolInfo.RefreshRates())
   {
      Print("Failed to refresh rates");
      return;
   }

   // Get indicator values
   if(!GetIndicatorValues())
   {
      Print("Failed to get indicator values");
      return;
   }

   // Check for trading signals
   CheckTradingSignals();

   // Manage existing positions
   ManagePositions();
}

//+------------------------------------------------------------------+
//| Get indicator values                                             |
//+------------------------------------------------------------------+
bool GetIndicatorValues()
{
   // Copy MA values
   if(CopyBuffer(handleMA_Fast, 0, 0, 3, ma_fast_buffer) < 3)
   {
      Print("Failed to copy Fast MA buffer");
      return false;
   }

   if(CopyBuffer(handleMA_Slow, 0, 0, 3, ma_slow_buffer) < 3)
   {
      Print("Failed to copy Slow MA buffer");
      return false;
   }

   // Copy RSI values
   if(CopyBuffer(handleRSI, 0, 0, 3, rsi_buffer) < 3)
   {
      Print("Failed to copy RSI buffer");
      return false;
   }

   return true;
}

//+------------------------------------------------------------------+
//| Check for trading signals                                        |
//+------------------------------------------------------------------+
void CheckTradingSignals()
{
   // Check if we already have a position
   if(position.Select(_Symbol))
   {
      return; // Already have a position
   }

   // Buy signal: Fast MA crosses above Slow MA and RSI is oversold
   if(ma_fast_buffer[1] > ma_slow_buffer[1] &&
      ma_fast_buffer[2] <= ma_slow_buffer[2] &&
      rsi_buffer[1] < InpRSIBuyLevel)
   {
      OpenBuyPosition();
   }
   // Sell signal: Fast MA crosses below Slow MA and RSI is overbought
   else if(ma_fast_buffer[1] < ma_slow_buffer[1] &&
           ma_fast_buffer[2] >= ma_slow_buffer[2] &&
           rsi_buffer[1] > InpRSISellLevel)
   {
      OpenSellPosition();
   }
}

//+------------------------------------------------------------------+
//| Open Buy Position                                                |
//+------------------------------------------------------------------+
void OpenBuyPosition()
{
   double price = symbolInfo.Ask();
   double sl = (InpStopLoss > 0) ? price - InpStopLoss * symbolInfo.Point() : 0;
   double tp = (InpTakeProfit > 0) ? price + InpTakeProfit * symbolInfo.Point() : 0;

   // Normalize prices
   if(sl > 0) sl = NormalizeDouble(sl, symbolInfo.Digits());
   if(tp > 0) tp = NormalizeDouble(tp, symbolInfo.Digits());

   if(trade.Buy(InpLotSize, _Symbol, price, sl, tp, "Buy Signal"))
   {
      Print("Buy position opened successfully. Ticket: ", trade.ResultOrder());
   }
   else
   {
      Print("Failed to open buy position. Error: ", trade.ResultRetcode(),
            " - ", trade.ResultRetcodeDescription());
   }
}

//+------------------------------------------------------------------+
//| Open Sell Position                                               |
//+------------------------------------------------------------------+
void OpenSellPosition()
{
   double price = symbolInfo.Bid();
   double sl = (InpStopLoss > 0) ? price + InpStopLoss * symbolInfo.Point() : 0;
   double tp = (InpTakeProfit > 0) ? price - InpTakeProfit * symbolInfo.Point() : 0;

   // Normalize prices
   if(sl > 0) sl = NormalizeDouble(sl, symbolInfo.Digits());
   if(tp > 0) tp = NormalizeDouble(tp, symbolInfo.Digits());

   if(trade.Sell(InpLotSize, _Symbol, price, sl, tp, "Sell Signal"))
   {
      Print("Sell position opened successfully. Ticket: ", trade.ResultOrder());
   }
   else
   {
      Print("Failed to open sell position. Error: ", trade.ResultRetcode(),
            " - ", trade.ResultRetcodeDescription());
   }
}

//+------------------------------------------------------------------+
//| Manage existing positions                                         |
//+------------------------------------------------------------------+
void ManagePositions()
{
   if(!position.Select(_Symbol))
      return;

   // Get position info
   double positionProfit = position.Profit();
   double positionVolume = position.Volume();
   ENUM_POSITION_TYPE positionType = position.PositionType();

   // Emergency close if loss is too high
   if(positionProfit < -1000)
   {
      if(trade.PositionClose(_Symbol))
      {
         Print("Emergency close executed for position");
      }
   }

   // Trailing stop logic (simplified)
   double currentPrice = (positionType == POSITION_TYPE_BUY) ? symbolInfo.Bid() : symbolInfo.Ask();
   double newSL = 0;

   if(positionType == POSITION_TYPE_BUY && positionProfit > 0)
   {
      newSL = currentPrice - InpStopLoss * symbolInfo.Point();
      if(newSL > position.StopLoss())
      {
         trade.PositionModify(_Symbol, newSL, position.TakeProfit());
      }
   }
   else if(positionType == POSITION_TYPE_SELL && positionProfit > 0)
   {
      newSL = currentPrice + InpStopLoss * symbolInfo.Point();
      if(newSL < position.StopLoss() || position.StopLoss() == 0)
      {
         trade.PositionModify(_Symbol, newSL, position.TakeProfit());
      }
   }
}

//+------------------------------------------------------------------+
//| Calculate optimal lot size based on risk                         |
//+------------------------------------------------------------------+
double CalculateOptimalLotSize(double riskPercent)
{
   double accountBalance = accountInfo.Balance();
   double riskAmount = accountBalance * riskPercent / 100.0;

   double tickValue = symbolInfo.TickValue();
   double stopLossPoints = InpStopLoss;

   if(stopLossPoints > 0 && tickValue > 0)
   {
      double lotSize = riskAmount / (stopLossPoints * tickValue);

      // Normalize lot size
      double minLot = symbolInfo.LotsMin();
      double maxLot = symbolInfo.LotsMax();
      double lotStep = symbolInfo.LotsStep();

      lotSize = MathMax(minLot, MathMin(maxLot, lotSize));
      lotSize = NormalizeDouble(lotSize / lotStep, 0) * lotStep;

      return lotSize;
   }

   return InpLotSize;
}

//+------------------------------------------------------------------+
//| OnTrade event handler                                            |
//+------------------------------------------------------------------+
void OnTrade()
{
   // Handle trade events
   Print("Trade event occurred");
}

//+------------------------------------------------------------------+
//| OnTradeTransaction event handler                                  |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   // Handle trade transactions
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      Print("New deal added: ", trans.deal);
   }
}
