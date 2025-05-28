import * as vscode from 'vscode';

export class MQLHoverProvider implements vscode.HoverProvider {
  private functionDocumentation: {
    [key: string]: {
      signature: string;
      description: string;
      parameters?: string[];
      returns?: string;
      example?: string;
    };
  } = {};
  private variableDocumentation: {
    [key: string]: {
      description: string;
      type: string;
    };
  } = {};
  private isEnabled: boolean;

  constructor() {
    this.initializeFunctionDocumentation();
    this.initializeConstantDocumentation();
    this.initializeVariableDocumentation();
    this.isEnabled = vscode.workspace
      .getConfiguration('mqlens')
      .get('enableHover', true);

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('mqlens.enableHover')) {
        this.isEnabled = vscode.workspace
          .getConfiguration('mqlens')
          .get('enableHover', true);
      }
    });
  }

  private initializeConstantDocumentation() {
    // This method is intentionally left empty as constants are defined in getConstantInfo method
    // This is a placeholder for future refactoring if needed
  }

  private initializeVariableDocumentation() {
    // MQL4/MQL5 predefined variables
    this.variableDocumentation['_Symbol'] = {
      type: 'string',
      description:
        'The current chart symbol. This is a predefined variable that contains the name of the current financial instrument.',
    };

    this.variableDocumentation['_Point'] = {
      type: 'double',
      description:
        'The current symbol point value in the quote currency. This is a predefined variable that contains the point size of the current symbol.',
    };

    this.variableDocumentation['_Digits'] = {
      type: 'int',
      description:
        'The number of decimal digits determining the accuracy of the price value of the current symbol.',
    };

    this.variableDocumentation['_LastError'] = {
      type: 'int',
      description:
        'The code of the last error that occurred during the execution of the MQL program.',
    };

    this.variableDocumentation['_Period'] = {
      type: 'ENUM_TIMEFRAMES',
      description:
        'The current chart timeframe. This is a predefined variable that contains the value of the current chart period.',
    };

    this.variableDocumentation['_StopFlag'] = {
      type: 'bool',
      description:
        'A flag indicating that the program operation has been terminated.',
    };

    this.variableDocumentation['_UninitReason'] = {
      type: 'int',
      description:
        'The code of the reason for deinitialization. This is a predefined variable that contains the reason code for the program deinitialization.',
    };
  }

  private initializeFunctionDocumentation() {
    // Trading functions
    this.functionDocumentation['OrderSend'] = {
      signature:
        'int OrderSend(string symbol, int cmd, double volume, double price, int slippage, double stoploss, double takeprofit, string comment, int magic, datetime expiration, color arrow_color)',
      description:
        'The main function used to open market or place a pending order.',
      parameters: [
        'symbol - Symbol for trading',
        'cmd - Operation type (OP_BUY, OP_SELL, etc.)',
        'volume - Number of lots',
        'price - Order price',
        'slippage - Maximum price slippage for buy or sell orders',
        'stoploss - Stop loss price',
        'takeprofit - Take profit price',
        'comment - Order comment text',
        'magic - Order magic number',
        'expiration - Order expiration time',
        'arrow_color - Color of the opening arrow on the chart',
      ],
      returns: 'Returns ticket number if successful, -1 if failed',
      example:
        'int ticket = OrderSend(Symbol(), OP_BUY, 0.1, Ask, 3, 0, 0, "My order", 12345, 0, Blue);',
    };

    this.functionDocumentation['OrderClose'] = {
      signature:
        'bool OrderClose(int ticket, double lots, double price, int slippage, color arrow_color)',
      description: 'Closes opened order.',
      parameters: [
        'ticket - Unique number of the order ticket',
        'lots - Number of lots to close',
        'price - Closing price',
        'slippage - Value of the maximum price slippage',
        'arrow_color - Color of the closing arrow on the chart',
      ],
      returns: 'Returns true if successful, false otherwise',
      example: 'bool result = OrderClose(ticket, OrderLots(), Bid, 3, Red);',
    };

    this.functionDocumentation['OrderSelect'] = {
      signature: 'bool OrderSelect(int index, int select, int pool)',
      description: 'Selects an order for further processing.',
      parameters: [
        'index - Order index or order ticket depending on the second parameter',
        'select - Selection flag (SELECT_BY_POS or SELECT_BY_TICKET)',
        'pool - Optional parameter for selecting from history (MODE_TRADES, MODE_HISTORY)',
      ],
      returns: 'Returns true if the function succeeds, otherwise false',
      example: 'bool selected = OrderSelect(ticket, SELECT_BY_TICKET);',
    };

    this.functionDocumentation['OrdersTotal'] = {
      signature: 'int OrdersTotal()',
      description: 'Returns the number of open orders.',
      parameters: [],
      returns: 'Returns the number of open orders',
      example: 'int total = OrdersTotal();',
    };

    this.functionDocumentation['MarketInfo'] = {
      signature: 'double MarketInfo(string symbol, int type)',
      description:
        'Returns various data about securities listed in the Market Watch window.',
      parameters: [
        'symbol - Symbol name',
        'type - Request identifier (MODE_BID, MODE_ASK, MODE_POINT, etc.)',
      ],
      returns: 'Returns the requested value',
      example: 'double bid = MarketInfo(Symbol(), MODE_BID);',
    };

    // Technical indicators
    this.functionDocumentation['iMA'] = {
      signature:
        'double iMA(string symbol, int timeframe, int period, int ma_shift, int ma_method, int applied_price, int shift)',
      description:
        'Calculates the Moving Average indicator and returns its value.',
      parameters: [
        'symbol - Symbol name',
        'timeframe - Timeframe',
        'period - Averaging period',
        'ma_shift - MA shift',
        'ma_method - Moving average method',
        'applied_price - Applied price',
        'shift - Index of the value taken from the indicator buffer',
      ],
      returns: 'Returns the Moving Average value',
      example: 'double ma20 = iMA(NULL, 0, 20, 0, MODE_SMA, PRICE_CLOSE, 0);',
    };

    this.functionDocumentation['iRSI'] = {
      signature:
        'double iRSI(string symbol, int timeframe, int period, int applied_price, int shift)',
      description:
        'Calculates the Relative Strength Index and returns its value.',
      parameters: [
        'symbol - Symbol name',
        'timeframe - Timeframe',
        'period - Averaging period',
        'applied_price - Applied price',
        'shift - Index of the value taken from the indicator buffer',
      ],
      returns: 'Returns the RSI value',
      example: 'double rsi = iRSI(NULL, 0, 14, PRICE_CLOSE, 0);',
    };

    // Indicator buffer functions
    this.functionDocumentation['SetIndexBuffer'] = {
      signature: 'void SetIndexBuffer(int index, double array[])',
      description:
        'Links an indicator buffer with a dynamic array for further calculations.',
      parameters: [
        'index - Index of the indicator buffer (0-7)',
        'array - Array to be linked with the buffer',
      ],
      returns: 'No return value',
      example: 'SetIndexBuffer(0, Buffer);',
    };

    this.functionDocumentation['SetIndexStyle'] = {
      signature:
        'void SetIndexStyle(int index, int type, int style, int width, color clr)',
      description: 'Sets the drawing style of the indicator line.',
      parameters: [
        'index - Index of the indicator buffer',
        'type - Drawing type (DRAW_LINE, DRAW_HISTOGRAM, etc.)',
        'style - Line style (STYLE_SOLID, STYLE_DASH, etc.)',
        'width - Line width',
        'clr - Line color',
      ],
      returns: 'No return value',
      example: 'SetIndexStyle(0, DRAW_LINE, STYLE_SOLID, 2, clrBlue);',
    };

    this.functionDocumentation['SetIndexLabel'] = {
      signature: 'void SetIndexLabel(int index, string text)',
      description:
        'Sets a text label for the indicator line to be shown in Data Window.',
      parameters: [
        'index - Index of the indicator buffer',
        'text - Label text',
      ],
      returns: 'No return value',
      example: 'SetIndexLabel(0, "MA(20)");',
    };

    this.functionDocumentation['SetIndexEmptyValue'] = {
      signature: 'void SetIndexEmptyValue(int index, double value)',
      description:
        'Sets the "empty value" for the indicator buffer to avoid drawing of initial zero values.',
      parameters: [
        'index - Index of the indicator buffer',
        'value - Empty value (usually EMPTY_VALUE)',
      ],
      returns: 'No return value',
      example: 'SetIndexEmptyValue(0, EMPTY_VALUE);',
    };

    this.functionDocumentation['IndicatorShortName'] = {
      signature: 'void IndicatorShortName(string name)',
      description:
        'Sets a short name for the indicator to be displayed in the Data Window and on the chart subwindow.',
      parameters: ['name - Short name of the indicator'],
      returns: 'No return value',
      example: 'IndicatorShortName("Custom MA(" + period + ")");',
    };

    // MQL5 specific indicator functions
    this.functionDocumentation['CopyBuffer'] = {
      signature:
        'int CopyBuffer(int indicator_handle, int buffer_num, int start_pos, int count, double buffer[])',
      description:
        'Gets data of a specified buffer of a certain indicator in the necessary quantity.',
      parameters: [
        'indicator_handle - Indicator handle returned by the corresponding indicator function',
        'buffer_num - Index of the indicator buffer',
        'start_pos - Position of the first element to copy',
        'count - Number of elements to copy',
        'buffer - Array to receive the values',
      ],
      returns:
        'Returns the number of copied elements or -1 in case of an error',
      example: 'int copied = CopyBuffer(ma_handle, 0, 0, 3, ma_buffer);',
    };

    this.functionDocumentation['IndicatorRelease'] = {
      signature: 'bool IndicatorRelease(int indicator_handle)',
      description:
        'Removes an indicator handle and releases the calculation block of the indicator.',
      parameters: ['indicator_handle - Handle to the indicator'],
      returns: 'Returns true if successful, otherwise false',
      example: 'bool released = IndicatorRelease(ma_handle);',
    };

    // Array functions
    this.functionDocumentation['ArraySize'] = {
      signature: 'int ArraySize(const void &array[])',
      description: 'Returns the number of elements in the array.',
      parameters: ['array - Array of any type'],
      returns: 'Returns the number of elements in the array',
      example: 'int size = ArraySize(myArray);',
    };

    this.functionDocumentation['ArrayResize'] = {
      signature:
        'int ArrayResize(void &array[], int new_size, int reserve_size)',
      description: 'Sets the new size for the first dimension of the array.',
      parameters: [
        'array - Array to resize',
        'new_size - New array size',
        'reserve_size - Reserve size for optimization',
      ],
      returns: 'Returns the number of elements in the array after resizing',
      example: 'ArrayResize(myArray, 100);',
    };

    this.functionDocumentation['ArraySetAsSeries'] = {
      signature: 'bool ArraySetAsSeries(void &array[], bool flag)',
      description:
        'Sets the array as a timeseries (indexes in reverse order, newest data at index 0).',
      parameters: [
        'array - Array to set',
        'flag - Direction flag (true for timeseries)',
      ],
      returns: 'Returns true if successful, otherwise false',
      example: 'ArraySetAsSeries(price_array, true);',
    };

    // String functions
    this.functionDocumentation['StringLen'] = {
      signature: 'int StringLen(string text)',
      description: 'Returns the number of characters in a string.',
      parameters: ['text - String to measure'],
      returns: 'Returns the length of the string',
      example: 'int length = StringLen("Hello World"); // Returns 11',
    };

    this.functionDocumentation['StringSubstr'] = {
      signature: 'string StringSubstr(string text, int start, int length)',
      description: 'Extracts a substring from a text string.',
      parameters: [
        'text - Source string',
        'start - Initial position of the substring',
        'length - Length of the substring',
      ],
      returns: 'Returns the extracted substring',
      example:
        'string sub = StringSubstr("Hello World", 6, 5); // Returns "World"',
    };

    this.functionDocumentation['StringFormat'] = {
      signature: 'string StringFormat(string format, ...)',
      description: 'Formats a string according to the specified format.',
      parameters: [
        'format - Format string with specifications',
        '... - Variable parameters to be formatted',
      ],
      returns: 'Returns the formatted string',
      example:
        'string result = StringFormat("Price: %f, Time: %s", price, TimeToString(time));',
    };

    // Conversion functions
    this.functionDocumentation['IntegerToString'] = {
      signature:
        'string IntegerToString(int value, int str_len, ushort fill_symbol)',
      description:
        'Converts an integer value to a string of a specified length.',
      parameters: [
        'value - Integer value to convert',
        'str_len - Optional string length (default is minimum required)',
        'fill_symbol - Optional fill symbol for padding',
      ],
      returns: 'Returns the string representation of the number',
      example: 'string str = IntegerToString(123, 5, "0"); // Returns "00123"',
    };

    this.functionDocumentation['DoubleToString'] = {
      signature: 'string DoubleToString(double value, int digits)',
      description:
        'Converts a numeric value to a text string with specified precision.',
      parameters: [
        'value - Double value to convert',
        'digits - Number of digits after the decimal point',
      ],
      returns: 'Returns the string representation of the number',
      example: 'string str = DoubleToString(123.456, 2); // Returns "123.46"',
    };

    this.functionDocumentation['TimeToString'] = {
      signature: 'string TimeToString(datetime value, int mode)',
      description:
        'Converts a datetime value to a string in "yyyy.mm.dd hh:mi" format.',
      parameters: [
        'value - Datetime value to convert',
        'mode - Format mode (TIME_DATE, TIME_MINUTES, TIME_SECONDS)',
      ],
      returns: 'Returns the formatted time string',
      example:
        'string time_str = TimeToString(TimeCurrent(), TIME_DATE|TIME_MINUTES);',
    };

    // Math functions
    this.functionDocumentation['MathAbs'] = {
      signature: 'double MathAbs(double value)',
      description: 'Returns the absolute value of the specified numeric value.',
      parameters: ['value - Numeric value'],
      returns: 'Returns the absolute value',
      example: 'double abs_val = MathAbs(-5.5); // Returns 5.5',
    };

    this.functionDocumentation['MathMax'] = {
      signature: 'double MathMax(double value1, double value2)',
      description: 'Returns the maximal value of the two numeric values.',
      parameters: [
        'value1 - First numeric value',
        'value2 - Second numeric value',
      ],
      returns: 'Returns the maximum value',
      example: 'double max_val = MathMax(10.5, 8.3); // Returns 10.5',
    };

    // Symbol and market functions
    this.functionDocumentation['Symbol'] = {
      signature: 'string Symbol()',
      description: 'Returns the name of the current financial instrument.',
      parameters: [],
      returns: 'Returns the symbol name of the current chart',
      example: 'string current_symbol = Symbol(); // e.g. "EURUSD"',
    };

    this.functionDocumentation['Point'] = {
      signature: 'double Point',
      description: 'The current symbol point value in the quote currency.',
      parameters: [],
      returns: 'Returns the point value',
      example:
        'double stop_loss = Bid - 10 * Point; // 10 points below current bid',
    };

    this.functionDocumentation['Digits'] = {
      signature: 'int Digits',
      description:
        'The number of decimal digits determining the accuracy of the price value of the current symbol.',
      parameters: [],
      returns: 'Returns the number of decimal digits',
      example: 'double normalized_price = NormalizeDouble(price, Digits);',
    };

    // Time functions
    this.functionDocumentation['TimeCurrent'] = {
      signature: 'datetime TimeCurrent()',
      description: 'Returns the last known server time.',
      parameters: [],
      returns: 'Returns the current server time',
      example: 'datetime current_time = TimeCurrent();',
    };

    // File operations
    this.functionDocumentation['FileOpen'] = {
      signature:
        'int FileOpen(string filename, int flags, int delimiter, uint codepage)',
      description: 'Opens a file with the specified name and flags.',
      parameters: [
        'filename - File name',
        'flags - File operation flags (FILE_READ, FILE_WRITE, etc.)',
        'delimiter - Delimiter for CSV files',
        'codepage - Code page (e.g., CP_UTF8)',
      ],
      returns: 'Returns file handle if successful, INVALID_HANDLE if failed',
      example:
        'int file_handle = FileOpen("data.csv", FILE_WRITE|FILE_CSV, ",");',
    };

    this.functionDocumentation['FileClose'] = {
      signature: 'void FileClose(int file_handle)',
      description: 'Closes a file previously opened by FileOpen().',
      parameters: ['file_handle - File handle returned by FileOpen()'],
      returns: 'No return value',
      example: 'FileClose(file_handle);',
    };

    this.functionDocumentation['FileWrite'] = {
      signature: 'bool FileWrite(int file_handle, ...)',
      description: 'Writes data to a file of CSV or TXT format.',
      parameters: [
        'file_handle - File handle returned by FileOpen()',
        '... - List of parameters to write',
      ],
      returns: 'Returns true if successful, false otherwise',
      example: 'FileWrite(file_handle, "Data", 123, 45.67);',
    };

    // Symbol information
    this.functionDocumentation['SymbolSelect'] = {
      signature: 'bool SymbolSelect(string symbol, bool select)',
      description:
        'Selects a symbol in the Market Watch window or removes a symbol from the window.',
      parameters: [
        'symbol - Symbol name',
        'select - Action flag (true to select, false to remove)',
      ],
      returns: 'Returns true if successful, false otherwise',
      example: 'bool selected = SymbolSelect("EURUSD", true);',
    };

    // Rates functions
    this.functionDocumentation['CopyRates'] = {
      signature:
        'int CopyRates(string symbol, int timeframe, int start_pos, int count, MqlRates rates[])',
      description:
        'Gets history data of the Rates structure for a specified symbol and timeframe.',
      parameters: [
        'symbol - Symbol name',
        'timeframe - Timeframe',
        'start_pos - Start position',
        'count - Number of elements to copy',
        'rates - Array of MqlRates type to receive the data',
      ],
      returns:
        'Returns the number of copied elements or -1 in case of an error',
      example: 'int copied = CopyRates(_Symbol, PERIOD_H1, 0, 100, rates);',
    };
  }

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    // Check if hover is enabled in settings
    if (!this.isEnabled) {
      return null;
    }

    const range = document.getWordRangeAtPosition(position);
    if (!range) {
      return null;
    }

    const word = document.getText(range);

    // Check if it's a documented function
    if (this.functionDocumentation[word]) {
      const doc = this.functionDocumentation[word];
      const markdown = new vscode.MarkdownString();

      // Add signature
      markdown.appendCodeblock(doc.signature, 'mql');

      // Add description
      markdown.appendMarkdown(`\n${doc.description}\n\n`);

      // Add parameters
      if (doc.parameters && doc.parameters.length > 0) {
        markdown.appendMarkdown('**Parameters:**\n');
        doc.parameters.forEach(param => {
          markdown.appendMarkdown(`- ${param}\n`);
        });
        markdown.appendMarkdown('\n');
      }

      // Add return value
      if (doc.returns) {
        markdown.appendMarkdown(`**Returns:** ${doc.returns}\n\n`);
      }

      // Add example
      if (doc.example) {
        markdown.appendMarkdown('**Example:**\n');
        markdown.appendCodeblock(doc.example, 'mql');
      }

      return new vscode.Hover(markdown, range);
    }

    // Check for predefined variables
    if (this.variableDocumentation[word]) {
      const doc = this.variableDocumentation[word];
      const markdown = new vscode.MarkdownString();
      markdown.appendMarkdown(`**${word}** (Predefined Variable)\n\n`);
      markdown.appendMarkdown(`Type: \`${doc.type}\`\n\n`);
      markdown.appendMarkdown(doc.description);
      return new vscode.Hover(markdown, range);
    }

    // Check for constants
    const constantInfo = this.getConstantInfo(word);
    if (constantInfo) {
      const markdown = new vscode.MarkdownString();
      markdown.appendMarkdown(`**${word}** (Constant)\n\n`);
      markdown.appendMarkdown(`Value: \`${constantInfo.value}\`\n\n`);
      markdown.appendMarkdown(constantInfo.description);
      return new vscode.Hover(markdown, range);
    }

    // Check for keywords
    const keywordInfo = this.getKeywordInfo(word);
    if (keywordInfo) {
      const markdown = new vscode.MarkdownString();
      markdown.appendMarkdown(`**${word}** (Keyword)\n\n`);
      markdown.appendMarkdown(keywordInfo);
      return new vscode.Hover(markdown, range);
    }

    return null;
  }

  private getConstantInfo(
    word: string
  ): { value: string; description: string } | null {
    const constants: { [key: string]: { value: string; description: string } } =
      {
        // Order operation types
        OP_BUY: { value: '0', description: 'Buy operation type' },
        OP_SELL: { value: '1', description: 'Sell operation type' },
        OP_BUYLIMIT: { value: '2', description: 'Buy limit pending order' },
        OP_SELLLIMIT: { value: '3', description: 'Sell limit pending order' },
        OP_BUYSTOP: { value: '4', description: 'Buy stop pending order' },
        OP_SELLSTOP: { value: '5', description: 'Sell stop pending order' },
        
        // Market info modes
        MODE_BID: { value: '9', description: 'Bid price mode' },
        MODE_ASK: { value: '10', description: 'Ask price mode' },
        MODE_POINT: { value: '11', description: 'Point size mode' },
        MODE_DIGITS: {
          value: '12',
          description: 'Digits after decimal point mode',
        },
        
        // Timeframes
        PERIOD_M1: { value: '1', description: '1 minute timeframe' },
        PERIOD_M5: { value: '5', description: '5 minutes timeframe' },
        PERIOD_M15: { value: '15', description: '15 minutes timeframe' },
        PERIOD_M30: { value: '30', description: '30 minutes timeframe' },
        PERIOD_H1: { value: '60', description: '1 hour timeframe' },
        PERIOD_H4: { value: '240', description: '4 hours timeframe' },
        PERIOD_D1: { value: '1440', description: 'Daily timeframe' },
        PERIOD_W1: { value: '10080', description: 'Weekly timeframe' },
        PERIOD_MN1: { value: '43200', description: 'Monthly timeframe' },
        
        // Order selection modes
        SELECT_BY_POS: {
          value: '0',
          description: 'Selection by position in the order pool',
        },
        SELECT_BY_TICKET: {
          value: '1',
          description: 'Selection by order ticket number',
        },
        
        // Order pools
        MODE_TRADES: { value: '0', description: 'Current open orders' },
        MODE_HISTORY: { value: '1', description: 'Closed orders history' },
        
        // Moving average methods
        MODE_SMA: { value: '0', description: 'Simple moving average' },
        MODE_EMA: { value: '1', description: 'Exponential moving average' },
        MODE_SMMA: { value: '2', description: 'Smoothed moving average' },
        MODE_LWMA: {
          value: '3',
          description: 'Linear weighted moving average',
        },
        
        // Price constants
        PRICE_CLOSE: { value: '0', description: 'Close price' },
        PRICE_OPEN: { value: '1', description: 'Open price' },
        PRICE_HIGH: { value: '2', description: 'High price' },
        PRICE_LOW: { value: '3', description: 'Low price' },
        PRICE_MEDIAN: { value: '4', description: 'Median price, (high+low)/2' },
        PRICE_TYPICAL: {
          value: '5',
          description: 'Typical price, (high+low+close)/3',
        },
        PRICE_WEIGHTED: {
          value: '6',
          description: 'Weighted price, (high+low+close+close)/4',
        },
        
        // Time format constants
        TIME_DATE: { value: '1', description: 'Date only' },
        TIME_MINUTES: { value: '2', description: 'Time in minutes format' },
        TIME_SECONDS: { value: '4', description: 'Time in seconds format' },
        
        // Initialization constants
        INIT_SUCCEEDED: {
          value: '0',
          description: 'Initialization completed successfully',
        },
        INIT_FAILED: { value: '-1', description: 'Initialization failed' },
        INIT_PARAMETERS_INCORRECT: { value: '-2', description: 'Incorrect initialization parameters' },
        
        // Handle constants
        INVALID_HANDLE: { value: '-1', description: 'Invalid handle value' },
        
        // Order filling constants (MQL5)
        ORDER_FILLING_FOK: { value: '2', description: 'Fill or Kill order filling mode' },
        ORDER_FILLING_IOC: { value: '1', description: 'Immediate or Cancel order filling mode' },
        ORDER_FILLING_RETURN: { value: '0', description: 'Return order filling mode' },
        
        // Indicator drawing styles
        DRAW_LINE: { value: '0', description: 'Line drawing style' },
        DRAW_SECTION: { value: '1', description: 'Section drawing style' },
        DRAW_HISTOGRAM: { value: '2', description: 'Histogram drawing style' },
        DRAW_ARROW: { value: '3', description: 'Arrow drawing style' },
        DRAW_ZIGZAG: { value: '4', description: 'ZigZag drawing style' },
        
        // Line styles
        STYLE_SOLID: { value: '0', description: 'Solid line' },
        STYLE_DASH: { value: '1', description: 'Dashed line' },
        STYLE_DOT: { value: '2', description: 'Dotted line' },
        STYLE_DASHDOT: { value: '3', description: 'Dash-dot line' },
        STYLE_DASHDOTDOT: { value: '4', description: 'Dash-dot-dot line' },
        
        // Special values
        EMPTY_VALUE: {
          value: '2147483647',
          description: 'Empty value in an indicator buffer',
        },
        
        // File operation constants
        FILE_READ: { value: '1', description: 'File read permission' },
        FILE_WRITE: { value: '2', description: 'File write permission' },
        FILE_CSV: { value: '4', description: 'CSV file format' },
        FILE_ANSI: { value: '16', description: 'ANSI encoding (single-byte)' },
        FILE_UNICODE: { value: '32', description: 'Unicode encoding (double-byte)' },
        FILE_UTF8: { value: '64', description: 'UTF-8 encoding' },
      };

    return constants[word] || null;
  }

  private getKeywordInfo(word: string): string | null {
    const keywords: { [key: string]: string } = {
      int: 'Integer data type (32-bit signed integer)',
      double: 'Double precision floating point data type',
      string: 'String data type for text values',
      bool: 'Boolean data type (true/false)',
      datetime: 'Date and time data type',
      color: 'Color data type for chart colors',
      void: 'Void type - indicates no return value',
      if: 'Conditional statement for branching logic',
      else: 'Alternative branch for if statement',
      for: 'Loop statement for iteration',
      while: 'Loop statement with condition check',
      return: 'Statement to return a value from function',
      break: 'Statement to exit from loop or switch',
      continue: 'Statement to skip to next iteration',
      switch: 'Multi-way branch statement',
      case: 'Label in switch statement',
      default: 'Default case in switch statement',
    };

    return keywords[word] || null;
  }
}
