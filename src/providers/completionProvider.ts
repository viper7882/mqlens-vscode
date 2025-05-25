import * as vscode from 'vscode';

export class MQLCompletionProvider implements vscode.CompletionItemProvider {
  private isEnabled: boolean;
  private mqlKeywords: string[] = [
    // Control structures
    'if',
    'else',
    'switch',
    'case',
    'default',
    'for',
    'while',
    'do',
    'break',
    'continue',
    'return',
    // Data types
    'void',
    'bool',
    'char',
    'uchar',
    'short',
    'ushort',
    'int',
    'uint',
    'long',
    'ulong',
    'float',
    'double',
    'string',
    'datetime',
    'color',
    'enum',
    'struct',
    'class',
    // Storage classes
    'const',
    'extern',
    'static',
    'virtual',
    'override',
    'final',
    // Access modifiers
    'public',
    'private',
    'protected',
    // Special keywords
    'input',
    'sinput',
    'template',
    'typename',
    'this',
    'NULL',
    'EMPTY',
    'EMPTY_VALUE',
    // Preprocessor
    '#property',
    '#include',
    '#import',
    '#define',
    '#ifdef',
    '#ifndef',
    '#endif',
  ];

  private mqlFunctions: { [key: string]: vscode.CompletionItem } = {};

  constructor() {
    this.initializeFunctions();
    this.isEnabled = vscode.workspace
      .getConfiguration('mqlens')
      .get('completion.enabled', true);

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('mqlens.completion.enabled')) {
        this.isEnabled = vscode.workspace
          .getConfiguration('mqlens')
          .get('completion.enabled', true);
      }
    });
  }

  private initializeFunctions() {
    // Trading functions
    this.addFunction(
      'OrderSend',
      'int OrderSend(string symbol, int cmd, double volume, double price, int slippage, double stoploss, double takeprofit, string comment, int magic, datetime expiration, color arrow_color)',
      'Send a trading order'
    );
    this.addFunction(
      'OrderClose',
      'bool OrderClose(int ticket, double lots, double price, int slippage, color arrow_color)',
      'Close an order'
    );
    this.addFunction(
      'OrderModify',
      'bool OrderModify(int ticket, double price, double stoploss, double takeprofit, datetime expiration, color arrow_color)',
      'Modify an existing order'
    );
    this.addFunction(
      'OrderDelete',
      'bool OrderDelete(int ticket, color arrow_color)',
      'Delete a pending order'
    );

    // Market information
    this.addFunction(
      'MarketInfo',
      'double MarketInfo(string symbol, int type)',
      'Get market information'
    );
    this.addFunction(
      'SymbolInfoDouble',
      'bool SymbolInfoDouble(string name, ENUM_SYMBOL_INFO_DOUBLE prop_id, double &var)',
      'Get symbol property of double type'
    );
    this.addFunction(
      'SymbolInfoInteger',
      'bool SymbolInfoInteger(string name, ENUM_SYMBOL_INFO_INTEGER prop_id, long &var)',
      'Get symbol property of integer type'
    );
    this.addFunction(
      'SymbolInfoString',
      'bool SymbolInfoString(string name, ENUM_SYMBOL_INFO_STRING prop_id, string &var)',
      'Get symbol property of string type'
    );

    // Technical indicators
    this.addFunction(
      'iMA',
      'double iMA(string symbol, int timeframe, int period, int ma_shift, int ma_method, int applied_price, int shift)',
      'Moving Average indicator'
    );
    this.addFunction(
      'iRSI',
      'double iRSI(string symbol, int timeframe, int period, int applied_price, int shift)',
      'Relative Strength Index'
    );
    this.addFunction(
      'iMACD',
      'double iMACD(string symbol, int timeframe, int fast_ema, int slow_ema, int signal, int applied_price, int mode, int shift)',
      'MACD indicator'
    );
    this.addFunction(
      'iBands',
      'double iBands(string symbol, int timeframe, int period, int deviation, int bands_shift, int applied_price, int mode, int shift)',
      'Bollinger Bands'
    );

    // Array functions
    this.addFunction(
      'ArraySize',
      'int ArraySize(const void &array[])',
      'Get array size'
    );
    this.addFunction(
      'ArrayResize',
      'int ArrayResize(void &array[], int new_size, int reserve_size)',
      'Resize array'
    );
    this.addFunction(
      'ArrayCopy',
      'int ArrayCopy(void &dst_array[], const void &src_array[], int dst_start, int src_start, int count)',
      'Copy array elements'
    );
    this.addFunction(
      'ArraySort',
      'void ArraySort(void &array[], int count, int start, int sort_dir)',
      'Sort array'
    );

    // String functions
    this.addFunction(
      'StringLen',
      'int StringLen(string text)',
      'Get string length'
    );
    this.addFunction(
      'StringSubstr',
      'string StringSubstr(string text, int start, int length)',
      'Extract substring'
    );
    this.addFunction(
      'StringFind',
      'int StringFind(string text, string match, int start)',
      'Find substring'
    );
    this.addFunction(
      'StringReplace',
      'int StringReplace(string &text, string find, string replacement)',
      'Replace substring'
    );

    // Math functions
    this.addFunction(
      'MathAbs',
      'double MathAbs(double value)',
      'Absolute value'
    );
    this.addFunction(
      'MathMax',
      'double MathMax(double value1, double value2)',
      'Maximum of two values'
    );
    this.addFunction(
      'MathMin',
      'double MathMin(double value1, double value2)',
      'Minimum of two values'
    );
    this.addFunction(
      'MathRound',
      'double MathRound(double value)',
      'Round to nearest integer'
    );
    this.addFunction(
      'MathFloor',
      'double MathFloor(double value)',
      'Round down'
    );
    this.addFunction('MathCeil', 'double MathCeil(double value)', 'Round up');

    // Time functions
    this.addFunction(
      'TimeCurrent',
      'datetime TimeCurrent()',
      'Get current server time'
    );
    this.addFunction(
      'TimeLocal',
      'datetime TimeLocal()',
      'Get local computer time'
    );
    this.addFunction('TimeGMT', 'datetime TimeGMT()', 'Get GMT time');
    this.addFunction(
      'TimeToStr',
      'string TimeToStr(datetime value, int mode)',
      'Convert time to string'
    );

    // Print and alert functions
    this.addFunction('Print', 'void Print(...)', 'Print message to log');
    this.addFunction('Alert', 'void Alert(...)', 'Display alert dialog');
    this.addFunction(
      'Comment',
      'void Comment(...)',
      'Display comment on chart'
    );
  }

  private addFunction(name: string, signature: string, description: string) {
    const item = new vscode.CompletionItem(
      name,
      vscode.CompletionItemKind.Function
    );
    item.detail = signature;
    item.documentation = new vscode.MarkdownString(description);
    item.insertText = new vscode.SnippetString(`${name}($1)$0`);
    this.mqlFunctions[name] = item;
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    // Check if completion is enabled in settings
    if (!this.isEnabled) {
      return [];
    }

    const completionItems: vscode.CompletionItem[] = [];

    // Add keywords
    this.mqlKeywords.forEach(keyword => {
      const item = new vscode.CompletionItem(
        keyword,
        vscode.CompletionItemKind.Keyword
      );
      item.detail = 'MQL Keyword';
      completionItems.push(item);
    });

    // Add functions
    Object.values(this.mqlFunctions).forEach(func => {
      completionItems.push(func);
    });

    // Add common constants
    this.addConstants(completionItems);

    // Add variables from current document
    this.addDocumentVariables(document, completionItems);

    return completionItems;
  }

  private addConstants(completionItems: vscode.CompletionItem[]) {
    const constants = [
      { name: 'OP_BUY', value: '0', description: 'Buy operation' },
      { name: 'OP_SELL', value: '1', description: 'Sell operation' },
      { name: 'OP_BUYLIMIT', value: '2', description: 'Buy limit order' },
      { name: 'OP_SELLLIMIT', value: '3', description: 'Sell limit order' },
      { name: 'OP_BUYSTOP', value: '4', description: 'Buy stop order' },
      { name: 'OP_SELLSTOP', value: '5', description: 'Sell stop order' },
      { name: 'MODE_BID', value: '9', description: 'Bid price' },
      { name: 'MODE_ASK', value: '10', description: 'Ask price' },
      { name: 'MODE_POINT', value: '11', description: 'Point size' },
      {
        name: 'MODE_DIGITS',
        value: '12',
        description: 'Digits after decimal point',
      },
      { name: 'PERIOD_M1', value: '1', description: '1 minute timeframe' },
      { name: 'PERIOD_M5', value: '5', description: '5 minutes timeframe' },
      { name: 'PERIOD_M15', value: '15', description: '15 minutes timeframe' },
      { name: 'PERIOD_M30', value: '30', description: '30 minutes timeframe' },
      { name: 'PERIOD_H1', value: '60', description: '1 hour timeframe' },
      { name: 'PERIOD_H4', value: '240', description: '4 hours timeframe' },
      { name: 'PERIOD_D1', value: '1440', description: 'Daily timeframe' },
      { name: 'PERIOD_W1', value: '10080', description: 'Weekly timeframe' },
      { name: 'PERIOD_MN1', value: '43200', description: 'Monthly timeframe' },
    ];

    constants.forEach(constant => {
      const item = new vscode.CompletionItem(
        constant.name,
        vscode.CompletionItemKind.Constant
      );
      item.detail = `Constant: ${constant.value}`;
      item.documentation = constant.description;
      completionItems.push(item);
    });
  }

  private addDocumentVariables(
    document: vscode.TextDocument,
    completionItems: vscode.CompletionItem[]
  ) {
    const text = document.getText();
    const variableRegex =
      /\b(?:int|double|string|bool|datetime|color)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const variables = new Set<string>();

    let match;
    while ((match = variableRegex.exec(text)) !== null) {
      variables.add(match[1]);
    }

    variables.forEach(variable => {
      const item = new vscode.CompletionItem(
        variable,
        vscode.CompletionItemKind.Variable
      );
      item.detail = 'Local variable';
      completionItems.push(item);
    });
  }
}
