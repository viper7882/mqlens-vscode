//+------------------------------------------------------------------+
//|                                            Custom Indicator.mq4 |
//|                        Copyright 2024, MetaQuotes Software Corp. |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024, MetaQuotes Software Corp."
#property link      "https://www.mql5.com"
#property version   "1.00"
#property strict
#property indicator_separate_window
#property indicator_buffers 3
#property indicator_plots   3

// Plot properties
#property indicator_label1  "Fast MA"
#property indicator_type1   DRAW_LINE
#property indicator_color1  clrBlue
#property indicator_style1  STYLE_SOLID
#property indicator_width1  2

#property indicator_label2  "Slow MA"
#property indicator_type2   DRAW_LINE
#property indicator_color2  clrRed
#property indicator_style2  STYLE_SOLID
#property indicator_width2  2

#property indicator_label3  "Signal"
#property indicator_type3   DRAW_HISTOGRAM
#property indicator_color3  clrGreen
#property indicator_style3  STYLE_SOLID
#property indicator_width3  3

// Input parameters
input int FastMA_Period = 12;     // Fast MA Period
input int SlowMA_Period = 26;     // Slow MA Period
input int Signal_Period = 9;      // Signal Period
input ENUM_MA_METHOD MA_Method = MODE_EMA;  // MA Method
input ENUM_APPLIED_PRICE Applied_Price = PRICE_CLOSE; // Applied Price

// Indicator buffers
double FastMA_Buffer[];
double SlowMA_Buffer[];
double Signal_Buffer[];

// Global variables
string IndicatorName = "Custom MACD";
int MinBars;

//+------------------------------------------------------------------+
//| Custom indicator initialization function                         |
//+------------------------------------------------------------------+
int OnInit()
{
   // Validate input parameters
   if(FastMA_Period <= 0 || SlowMA_Period <= 0 || Signal_Period <= 0)
   {
      Alert("Invalid input parameters!");
      return INIT_PARAMETERS_INCORRECT;
   }

   if(FastMA_Period >= SlowMA_Period)
   {
      Alert("Fast MA period must be less than Slow MA period!");
      return INIT_PARAMETERS_INCORRECT;
   }

   // Set minimum bars for calculation
   MinBars = MathMax(SlowMA_Period, Signal_Period) + 1;

   // Set indicator buffers
   SetIndexBuffer(0, FastMA_Buffer);
   SetIndexBuffer(1, SlowMA_Buffer);
   SetIndexBuffer(2, Signal_Buffer);

   // Set indicator labels
   SetIndexLabel(0, "Fast MA(" + IntegerToString(FastMA_Period) + ")");
   SetIndexLabel(1, "Slow MA(" + IntegerToString(SlowMA_Period) + ")");
   SetIndexLabel(2, "Signal(" + IntegerToString(Signal_Period) + ")");

   // Set drawing styles
   SetIndexStyle(0, DRAW_LINE, STYLE_SOLID, 2, clrBlue);
   SetIndexStyle(1, DRAW_LINE, STYLE_SOLID, 2, clrRed);
   SetIndexStyle(2, DRAW_HISTOGRAM, STYLE_SOLID, 3, clrGreen);

   // Set empty values
   SetIndexEmptyValue(0, EMPTY_VALUE);
   SetIndexEmptyValue(1, EMPTY_VALUE);
   SetIndexEmptyValue(2, EMPTY_VALUE);

   // Set indicator name
   IndicatorShortName(IndicatorName + "(" + IntegerToString(FastMA_Period) + "," +
                      IntegerToString(SlowMA_Period) + "," + IntegerToString(Signal_Period) + ")");

   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Custom indicator iteration function                              |
//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double &open[],
                const double &high[],
                const double &low[],
                const double &close[],
                const long &tick_volume[],
                const long &volume[],
                const int &spread[])
{
   // Check for minimum bars
   if(rates_total < MinBars)
      return 0;

   // Determine starting position
   int start = prev_calculated;
   if(start < MinBars)
      start = MinBars;

   // Calculate indicator values
   for(int i = start; i < rates_total; i++)
   {
      // Calculate Fast MA
      FastMA_Buffer[i] = CalculateMA(i, FastMA_Period, MA_Method, Applied_Price, close);

      // Calculate Slow MA
      SlowMA_Buffer[i] = CalculateMA(i, SlowMA_Period, MA_Method, Applied_Price, close);

      // Calculate MACD line (difference between fast and slow MA)
      double macd_line = FastMA_Buffer[i] - SlowMA_Buffer[i];

      // Calculate Signal line (EMA of MACD line)
      if(i >= MinBars + Signal_Period - 1)
      {
         Signal_Buffer[i] = CalculateEMA(i, Signal_Period, macd_line, Signal_Buffer);
      }
      else
      {
         Signal_Buffer[i] = EMPTY_VALUE;
      }
   }

   return rates_total;
}

//+------------------------------------------------------------------+
//| Calculate Moving Average                                         |
//+------------------------------------------------------------------+
double CalculateMA(int position, int period, ENUM_MA_METHOD method, ENUM_APPLIED_PRICE price, const double &array[])
{
   double result = 0.0;

   switch(method)
   {
      case MODE_SMA:
         result = CalculateSMA(position, period, array);
         break;

      case MODE_EMA:
         result = CalculateEMA(position, period, array[position], NULL);
         break;

      case MODE_SMMA:
         result = CalculateSMMA(position, period, array);
         break;

      case MODE_LWMA:
         result = CalculateLWMA(position, period, array);
         break;

      default:
         result = CalculateSMA(position, period, array);
         break;
   }

   return result;
}

//+------------------------------------------------------------------+
//| Calculate Simple Moving Average                                  |
//+------------------------------------------------------------------+
double CalculateSMA(int position, int period, const double &array[])
{
   if(position < period - 1)
      return EMPTY_VALUE;

   double sum = 0.0;
   for(int i = 0; i < period; i++)
   {
      sum += array[position - i];
   }

   return sum / period;
}

//+------------------------------------------------------------------+
//| Calculate Exponential Moving Average                             |
//+------------------------------------------------------------------+
double CalculateEMA(int position, int period, double current_value, double &buffer[])
{
   if(position == 0 || buffer == NULL)
      return current_value;

   double alpha = 2.0 / (period + 1.0);
   return alpha * current_value + (1.0 - alpha) * buffer[position - 1];
}

//+------------------------------------------------------------------+
//| Calculate Smoothed Moving Average                                |
//+------------------------------------------------------------------+
double CalculateSMMA(int position, int period, const double &array[])
{
   if(position < period - 1)
      return EMPTY_VALUE;

   static double prev_smma = 0.0;

   if(position == period - 1)
   {
      // First SMMA calculation
      double sum = 0.0;
      for(int i = 0; i < period; i++)
      {
         sum += array[position - i];
      }
      prev_smma = sum / period;
   }
   else
   {
      // Subsequent SMMA calculations
      prev_smma = (prev_smma * (period - 1) + array[position]) / period;
   }

   return prev_smma;
}

//+------------------------------------------------------------------+
//| Calculate Linear Weighted Moving Average                         |
//+------------------------------------------------------------------+
double CalculateLWMA(int position, int period, const double &array[])
{
   if(position < period - 1)
      return EMPTY_VALUE;

   double sum = 0.0;
   double weight_sum = 0.0;

   for(int i = 0; i < period; i++)
   {
      int weight = period - i;
      sum += array[position - i] * weight;
      weight_sum += weight;
   }

   return sum / weight_sum;
}
