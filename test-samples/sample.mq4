//+------------------------------------------------------------------+
//|                                                   Sample EA.mq4 |
//|                        Copyright 2024, MetaQuotes Software Corp. |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024, MetaQuotes Software Corp."
#property link      "https://www.mql5.com"
#property version   "1.00"
#property strict

// Input parameters
input double LotSize = 0.1;
input int    MagicNumber = 12345;
input int    StopLoss = 50;
input int    TakeProfit = 100;
input ENUM_TIMEFRAMES Timeframe = PERIOD_H1;

// Global variables
double gBuySignal = 0.0;
double gSellSignal = 0.0;
int gTicket = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("Expert Advisor initialized successfully");

   // Validate input parameters
   if(LotSize <= 0)
   {
      Alert("Invalid lot size: ", LotSize);
      return INIT_PARAMETERS_INCORRECT;
   }

   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("Expert Advisor deinitialized. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // Get current market data
   double bid = Bid;
   double ask = Ask;
   double spread = ask - bid;

   // Calculate indicators
   double ma_fast = iMA(Symbol(), Timeframe, 10, 0, MODE_SMA, PRICE_CLOSE, 0);
   double ma_slow = iMA(Symbol(), Timeframe, 20, 0, MODE_SMA, PRICE_CLOSE, 0);
   double rsi = iRSI(Symbol(), Timeframe, 14, PRICE_CLOSE, 0);

   // Trading logic
   if(ma_fast > ma_slow && rsi < 30)
   {
      gBuySignal = 1.0;
      if(OrdersTotal() == 0)
      {
         OpenBuyOrder();
      }
   }
   else if(ma_fast < ma_slow && rsi > 70)
   {
      gSellSignal = 1.0;
      if(OrdersTotal() == 0)
      {
         OpenSellOrder();
      }
   }

   // Check for order management
   ManageOrders();
}

//+------------------------------------------------------------------+
//| Open Buy Order                                                   |
//+------------------------------------------------------------------+
void OpenBuyOrder()
{
   double price = Ask;
   double sl = (StopLoss > 0) ? price - StopLoss * Point : 0;
   double tp = (TakeProfit > 0) ? price + TakeProfit * Point : 0;

   gTicket = OrderSend(Symbol(), OP_BUY, LotSize, price, 3, sl, tp,
                       "Buy Order", MagicNumber, 0, clrBlue);

   if(gTicket > 0)
   {
      Print("Buy order opened successfully. Ticket: ", gTicket);
   }
   else
   {
      Print("Failed to open buy order. Error: ", GetLastError());
   }
}

//+------------------------------------------------------------------+
//| Open Sell Order                                                  |
//+------------------------------------------------------------------+
void OpenSellOrder()
{
   double price = Bid;
   double sl = (StopLoss > 0) ? price + StopLoss * Point : 0;
   double tp = (TakeProfit > 0) ? price - TakeProfit * Point : 0;

   gTicket = OrderSend(Symbol(), OP_SELL, LotSize, price, 3, sl, tp,
                       "Sell Order", MagicNumber, 0, clrRed);

   if(gTicket > 0)
   {
      Print("Sell order opened successfully. Ticket: ", gTicket);
   }
   else
   {
      Print("Failed to open sell order. Error: ", GetLastError());
   }
}

//+------------------------------------------------------------------+
//| Manage existing orders                                           |
//+------------------------------------------------------------------+
void ManageOrders()
{
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderSymbol() == Symbol() && OrderMagicNumber() == MagicNumber)
         {
            // Check for trailing stop or other management logic
            double currentPrice = (OrderType() == OP_BUY) ? Bid : Ask;
            double profit = OrderProfit() + OrderSwap() + OrderCommission();

            if(profit < -100) // Emergency close
            {
               bool result = OrderClose(OrderTicket(), OrderLots(), currentPrice, 3, clrYellow);
               if(result)
               {
                  Print("Emergency close executed for ticket: ", OrderTicket());
               }
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Custom function to calculate lot size                           |
//+------------------------------------------------------------------+
double CalculateLotSize(double riskPercent)
{
   double accountBalance = AccountBalance();
   double riskAmount = accountBalance * riskPercent / 100.0;
   double tickValue = MarketInfo(Symbol(), MODE_TICKVALUE);
   double stopLossPoints = StopLoss;

   if(stopLossPoints > 0 && tickValue > 0)
   {
      double lotSize = riskAmount / (stopLossPoints * tickValue);
      return NormalizeDouble(lotSize, 2);
   }

   return LotSize;
}
