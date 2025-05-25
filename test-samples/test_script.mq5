//+------------------------------------------------------------------+
//|                                                  Test Script.mq5 |
//|                        Copyright 2024, MetaQuotes Software Corp. |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024, MetaQuotes Software Corp."
#property link      "https://www.mql5.com"
#property version   "1.00"
#property script_show_inputs

// Include necessary libraries
#include <Arrays\ArrayObj.mqh>
#include <Object.mqh>

// Input parameters
input group "=== Analysis Parameters ==="
input string   InpSymbol = "";             // Symbol (empty = current)
input ENUM_TIMEFRAMES InpTimeframe = PERIOD_H1; // Timeframe
input int      InpBarsToAnalyze = 1000;    // Bars to analyze
input bool     InpShowDetails = true;      // Show detailed output

input group "=== File Operations ==="
input string   InpFileName = "analysis_results.csv"; // Output file name
input bool     InpSaveToFile = false;      // Save results to file

// Custom classes
class CAnalysisResult : public CObject
{
public:
   datetime time;
   double   open;
   double   high;
   double   low;
   double   close;
   long     volume;
   double   ma20;
   double   rsi;

   CAnalysisResult() { Clear(); }

   void Clear()
   {
      time = 0;
      open = high = low = close = ma20 = rsi = 0.0;
      volume = 0;
   }

   string ToString()
   {
      return StringFormat("%s,%.5f,%.5f,%.5f,%.5f,%d,%.5f,%.2f",
                         TimeToString(time, TIME_DATE|TIME_MINUTES),
                         open, high, low, close, volume, ma20, rsi);
   }
};

// Global variables
CArrayObj g_results;
string g_symbol;
int g_ma_handle;
int g_rsi_handle;

//+------------------------------------------------------------------+
//| Script program start function                                    |
//+------------------------------------------------------------------+
void OnStart()
{
   Print("=== Market Analysis Script Started ===");

   // Initialize symbol
   g_symbol = (InpSymbol == "") ? _Symbol : InpSymbol;

   // Validate symbol
   if(!SymbolSelect(g_symbol, true))
   {
      Print("Error: Symbol ", g_symbol, " not found!");
      return;
   }

   // Initialize indicators
   if(!InitializeIndicators())
   {
      Print("Error: Failed to initialize indicators!");
      return;
   }

   // Perform analysis
   if(!PerformAnalysis())
   {
      Print("Error: Analysis failed!");
      CleanUp();
      return;
   }

   // Display results
   DisplayResults();

   // Save to file if requested
   if(InpSaveToFile)
   {
      SaveResultsToFile();
   }

   // Clean up
   CleanUp();

   Print("=== Market Analysis Script Completed ===");
}

//+------------------------------------------------------------------+
//| Initialize indicators                                             |
//+------------------------------------------------------------------+
bool InitializeIndicators()
{
   // Create MA indicator
   g_ma_handle = iMA(g_symbol, InpTimeframe, 20, 0, MODE_SMA, PRICE_CLOSE);
   if(g_ma_handle == INVALID_HANDLE)
   {
      Print("Error: Failed to create MA indicator handle");
      return false;
   }

   // Create RSI indicator
   g_rsi_handle = iRSI(g_symbol, InpTimeframe, 14, PRICE_CLOSE);
   if(g_rsi_handle == INVALID_HANDLE)
   {
      Print("Error: Failed to create RSI indicator handle");
      IndicatorRelease(g_ma_handle);
      return false;
   }

   // Wait for indicators to calculate
   Sleep(1000);

   return true;
}

//+------------------------------------------------------------------+
//| Perform market analysis                                          |
//+------------------------------------------------------------------+
bool PerformAnalysis()
{
   // Get rates
   MqlRates rates[];
   int copied = CopyRates(g_symbol, InpTimeframe, 0, InpBarsToAnalyze, rates);

   if(copied <= 0)
   {
      Print("Error: Failed to copy rates. Error code: ", GetLastError());
      return false;
   }

   Print("Copied ", copied, " bars for analysis");

   // Get indicator values
   double ma_values[];
   double rsi_values[];

   if(CopyBuffer(g_ma_handle, 0, 0, copied, ma_values) <= 0)
   {
      Print("Error: Failed to copy MA values");
      return false;
   }

   if(CopyBuffer(g_rsi_handle, 0, 0, copied, rsi_values) <= 0)
   {
      Print("Error: Failed to copy RSI values");
      return false;
   }

   // Analyze each bar
   for(int i = 0; i < copied; i++)
   {
      CAnalysisResult* result = new CAnalysisResult();

      result.time = rates[i].time;
      result.open = rates[i].open;
      result.high = rates[i].high;
      result.low = rates[i].low;
      result.close = rates[i].close;
      result.volume = rates[i].tick_volume;
      result.ma20 = ma_values[i];
      result.rsi = rsi_values[i];

      g_results.Add(result);
   }

   return true;
}

//+------------------------------------------------------------------+
//| Display analysis results                                         |
//+------------------------------------------------------------------+
void DisplayResults()
{
   int total = g_results.Total();

   Print("\n=== Analysis Results for ", g_symbol, " ===");
   Print("Total bars analyzed: ", total);

   if(total == 0)
      return;

   // Calculate statistics
   double total_volume = 0;
   double avg_rsi = 0;
   double max_high = 0;
   double min_low = DBL_MAX;
   int bullish_bars = 0;
   int bearish_bars = 0;

   for(int i = 0; i < total; i++)
   {
      CAnalysisResult* result = g_results.At(i);

      total_volume += result.volume;
      avg_rsi += result.rsi;

      if(result.high > max_high)
         max_high = result.high;

      if(result.low < min_low)
         min_low = result.low;

      if(result.close > result.open)
         bullish_bars++;
      else if(result.close < result.open)
         bearish_bars++;
   }

   avg_rsi /= total;

   Print("\n=== Statistics ===");
   Print("Highest price: ", DoubleToString(max_high, _Digits));
   Print("Lowest price: ", DoubleToString(min_low, _Digits));
   Print("Average RSI: ", DoubleToString(avg_rsi, 2));
   Print("Total volume: ", IntegerToString((long)total_volume));
   Print("Bullish bars: ", bullish_bars, " (", DoubleToString(100.0 * bullish_bars / total, 1), "%)");
   Print("Bearish bars: ", bearish_bars, " (", DoubleToString(100.0 * bearish_bars / total, 1), "%)");

   // Show detailed results if requested
   if(InpShowDetails && total <= 20)
   {
      Print("\n=== Detailed Results (Last 20 bars) ===");
      Print("Time,Open,High,Low,Close,Volume,MA20,RSI");

      int start = MathMax(0, total - 20);
      for(int i = start; i < total; i++)
      {
         CAnalysisResult* result = g_results.At(i);
         Print(result.ToString());
      }
   }

   // Market condition analysis
   AnalyzeMarketCondition(avg_rsi, bullish_bars, bearish_bars, total);
}

//+------------------------------------------------------------------+
//| Analyze market condition                                         |
//+------------------------------------------------------------------+
void AnalyzeMarketCondition(double avg_rsi, int bullish_bars, int bearish_bars, int total)
{
   Print("\n=== Market Condition Analysis ===");

   // RSI analysis
   if(avg_rsi > 70)
      Print("RSI indicates overbought conditions (avg RSI: ", DoubleToString(avg_rsi, 2), ")");
   else if(avg_rsi < 30)
      Print("RSI indicates oversold conditions (avg RSI: ", DoubleToString(avg_rsi, 2), ")");
   else
      Print("RSI indicates neutral conditions (avg RSI: ", DoubleToString(avg_rsi, 2), ")");

   // Trend analysis
   double bullish_ratio = (double)bullish_bars / total;
   if(bullish_ratio > 0.6)
      Print("Market shows bullish trend (", DoubleToString(bullish_ratio * 100, 1), "% bullish bars)");
   else if(bullish_ratio < 0.4)
      Print("Market shows bearish trend (", DoubleToString(bullish_ratio * 100, 1), "% bullish bars)");
   else
      Print("Market shows sideways movement (", DoubleToString(bullish_ratio * 100, 1), "% bullish bars)");

   // Get latest data for current analysis
   if(g_results.Total() > 0)
   {
      CAnalysisResult* latest = g_results.At(g_results.Total() - 1);
      Print("\nLatest bar analysis:");
      Print("- Price vs MA20: ", (latest.close > latest.ma20) ? "Above (Bullish)" : "Below (Bearish)");
      Print("- Current RSI: ", DoubleToString(latest.rsi, 2));

      if(latest.rsi > 70)
         Print("- RSI Warning: Overbought condition!");
      else if(latest.rsi < 30)
         Print("- RSI Warning: Oversold condition!");
   }
}

//+------------------------------------------------------------------+
//| Save results to file                                             |
//+------------------------------------------------------------------+
void SaveResultsToFile()
{
   string filename = InpFileName;
   int file_handle = FileOpen(filename, FILE_WRITE | FILE_CSV | FILE_ANSI);

   if(file_handle == INVALID_HANDLE)
   {
      Print("Error: Failed to create file ", filename, ". Error code: ", GetLastError());
      return;
   }

   // Write header
   FileWrite(file_handle, "Time", "Open", "High", "Low", "Close", "Volume", "MA20", "RSI");

   // Write data
   for(int i = 0; i < g_results.Total(); i++)
   {
      CAnalysisResult* result = g_results.At(i);
      FileWrite(file_handle,
                TimeToString(result.time, TIME_DATE|TIME_MINUTES),
                DoubleToString(result.open, _Digits),
                DoubleToString(result.high, _Digits),
                DoubleToString(result.low, _Digits),
                DoubleToString(result.close, _Digits),
                IntegerToString(result.volume),
                DoubleToString(result.ma20, _Digits),
                DoubleToString(result.rsi, 2));
   }

   FileClose(file_handle);
   Print("Results saved to file: ", filename);
}

//+------------------------------------------------------------------+
//| Clean up resources                                               |
//+------------------------------------------------------------------+
void CleanUp()
{
   // Release indicator handles
   if(g_ma_handle != INVALID_HANDLE)
      IndicatorRelease(g_ma_handle);

   if(g_rsi_handle != INVALID_HANDLE)
      IndicatorRelease(g_rsi_handle);

   // Clear results array
   g_results.Clear();

   Print("Resources cleaned up successfully");
}
