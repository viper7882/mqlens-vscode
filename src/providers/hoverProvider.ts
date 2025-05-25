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
  private isEnabled: boolean;

  constructor() {
    this.initializeFunctionDocumentation();
    this.isEnabled = vscode.workspace
      .getConfiguration('mqlens')
      .get('hover.enabled', true);

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('mqlens.hover.enabled')) {
        this.isEnabled = vscode.workspace
          .getConfiguration('mqlens')
          .get('hover.enabled', true);
      }
    });
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

    // Time functions
    this.functionDocumentation['TimeCurrent'] = {
      signature: 'datetime TimeCurrent()',
      description: 'Returns the last known server time.',
      parameters: [],
      returns: 'Returns the current server time',
      example: 'datetime current_time = TimeCurrent();',
    };

    this.functionDocumentation['TimeToStr'] = {
      signature: 'string TimeToStr(datetime value, int mode)',
      description: 'Converts time value to a text string.',
      parameters: [
        'value - Time value to convert',
        'mode - Format mode (TIME_DATE, TIME_MINUTES, TIME_SECONDS)',
      ],
      returns: 'Returns the formatted time string',
      example:
        'string time_str = TimeToStr(TimeCurrent(), TIME_DATE | TIME_MINUTES);',
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
        OP_BUY: { value: '0', description: 'Buy operation type' },
        OP_SELL: { value: '1', description: 'Sell operation type' },
        OP_BUYLIMIT: { value: '2', description: 'Buy limit pending order' },
        OP_SELLLIMIT: { value: '3', description: 'Sell limit pending order' },
        OP_BUYSTOP: { value: '4', description: 'Buy stop pending order' },
        OP_SELLSTOP: { value: '5', description: 'Sell stop pending order' },
        MODE_BID: { value: '9', description: 'Bid price mode' },
        MODE_ASK: { value: '10', description: 'Ask price mode' },
        MODE_POINT: { value: '11', description: 'Point size mode' },
        MODE_DIGITS: {
          value: '12',
          description: 'Digits after decimal point mode',
        },
        PERIOD_M1: { value: '1', description: '1 minute timeframe' },
        PERIOD_M5: { value: '5', description: '5 minutes timeframe' },
        PERIOD_M15: { value: '15', description: '15 minutes timeframe' },
        PERIOD_M30: { value: '30', description: '30 minutes timeframe' },
        PERIOD_H1: { value: '60', description: '1 hour timeframe' },
        PERIOD_H4: { value: '240', description: '4 hours timeframe' },
        PERIOD_D1: { value: '1440', description: 'Daily timeframe' },
        PERIOD_W1: { value: '10080', description: 'Weekly timeframe' },
        PERIOD_MN1: { value: '43200', description: 'Monthly timeframe' },
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
