import * as vscode from 'vscode';

export class MQLDiagnosticsProvider {
  private diagnosticsCollection: vscode.DiagnosticCollection;
  private maxProblems: number;

  constructor(diagnosticsCollection: vscode.DiagnosticCollection) {
    this.diagnosticsCollection = diagnosticsCollection;
    this.maxProblems = vscode.workspace
      .getConfiguration('mqlens')
      .get('diagnostics.maxProblems', 100);

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('mqlens.diagnostics.maxProblems')) {
        this.maxProblems = vscode.workspace
          .getConfiguration('mqlens')
          .get('diagnostics.maxProblems', 100);
      }
    });
  }

  public updateDiagnostics(document: vscode.TextDocument): void {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    // Check syntax errors
    this.checkSyntaxErrors(lines, diagnostics);

    // Check semantic errors
    this.checkSemanticErrors(text, lines, diagnostics);

    // Check best practices
    this.checkBestPractices(text, lines, diagnostics);

    // Limit the number of diagnostics according to configuration
    if (diagnostics.length > this.maxProblems) {
      diagnostics.splice(
        this.maxProblems,
        diagnostics.length - this.maxProblems
      );
    }

    this.diagnosticsCollection.set(document.uri, diagnostics);
  }

  private checkSyntaxErrors(
    lines: string[],
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Track brackets across multiple lines
    const bracketStack: { char: string; line: number; pos: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i;

      // Check for missing semicolons
      this.checkMissingSemicolons(line, lineNumber, diagnostics);

      // Check for unmatched brackets within the current line and track across lines
      this.checkUnmatchedBrackets(line, lineNumber, diagnostics, bracketStack);

      // Check for invalid function declarations
      this.checkInvalidFunctionDeclarations(line, lineNumber, diagnostics);

      // Check for invalid variable declarations
      this.checkInvalidVariableDeclarations(line, lineNumber, diagnostics);

      // Check for invalid preprocessor directives
      this.checkInvalidPreprocessorDirectives(line, lineNumber, diagnostics);
    }

    // Report any unclosed brackets at the end of the file
    for (const bracket of bracketStack) {
      const range = new vscode.Range(
        new vscode.Position(bracket.line, bracket.pos),
        new vscode.Position(bracket.line, bracket.pos + 1)
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        `Unclosed bracket '${bracket.char}'`,
        vscode.DiagnosticSeverity.Error
      );
      diagnostic.code = 'unclosed-bracket';
      diagnostics.push(diagnostic);
    }
  }

  private checkSemanticErrors(
    text: string,
    lines: string[],
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Check for undefined variables
    this.checkUndefinedVariables(text, lines, diagnostics);

    // Check for undefined functions
    this.checkUndefinedFunctions(text, lines, diagnostics);

    // Check for type mismatches
    this.checkTypeMismatches(lines, diagnostics);

    // Check for unreachable code
    this.checkUnreachableCode(lines, diagnostics);
  }

  private checkBestPractices(
    text: string,
    lines: string[],
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Check for unused variables
    this.checkUnusedVariables(text, lines, diagnostics);

    // Check for magic numbers
    this.checkMagicNumbers(lines, diagnostics);

    // Check for long functions
    this.checkLongFunctions(lines, diagnostics);

    // Check for deep nesting
    this.checkDeepNesting(lines, diagnostics);
  }

  private checkMissingSemicolons(
    line: string,
    lineNumber: number,
    diagnostics: vscode.Diagnostic[]
  ): void {
    const trimmedLine = line.trim();

    // Skip empty lines, comments, and preprocessor directives
    if (
      !trimmedLine ||
      trimmedLine.startsWith('//') ||
      trimmedLine.startsWith('/*') ||
      trimmedLine.startsWith('#')
    ) {
      return;
    }

    // Handle inline comments by removing them before checking for semicolons
    let codeBeforeComment = trimmedLine;
    const doubleSlashIndex = trimmedLine.indexOf('//');
    const blockCommentIndex = trimmedLine.indexOf('/*');

    if (doubleSlashIndex !== -1) {
      codeBeforeComment = trimmedLine.substring(0, doubleSlashIndex).trim();
      // If there's nothing before the comment, skip this line
      if (!codeBeforeComment) {
        return;
      }
    }

    if (blockCommentIndex !== -1) {
      // Only consider block comment if it appears before any double slash comment
      if (doubleSlashIndex === -1 || blockCommentIndex < doubleSlashIndex) {
        codeBeforeComment = trimmedLine.substring(0, blockCommentIndex).trim();
        // If there's nothing before the comment, skip this line
        if (!codeBeforeComment) {
          return;
        }
      }
    }

    // Skip lines that end with { } or are control structures or input group declarations
    // Also skip function declarations (which end with parentheses followed by opening brace on next line)
    if (
      codeBeforeComment.endsWith('{') ||
      codeBeforeComment.endsWith('}') ||
      codeBeforeComment.endsWith(')') || // Function declaration ending with parenthesis
      /^\s*(if|else|for|while|do|switch|case|default)\b/.test(
        codeBeforeComment
      ) ||
      /^\s*input\s+group\s+".*"\s*$/.test(codeBeforeComment) ||
      /^\s*(int|double|string|bool|datetime|color|void)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*\)\s*$/.test(
        codeBeforeComment
      ) // Function declaration pattern
    ) {
      return;
    }

    // Check if line should end with semicolon
    // Skip lines ending with logical operators (&&, ||) which are part of multi-line conditions
    if (
      !codeBeforeComment.endsWith(';') &&
      !codeBeforeComment.endsWith(',') &&
      !codeBeforeComment.endsWith('&&') &&
      !codeBeforeComment.endsWith('||')
    ) {
      const range = new vscode.Range(
        new vscode.Position(lineNumber, line.length),
        new vscode.Position(lineNumber, line.length)
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        'Missing semicolon',
        vscode.DiagnosticSeverity.Error
      );
      diagnostic.code = 'missing-semicolon';
      diagnostics.push(diagnostic);
    }
  }

  private checkUnmatchedBrackets(
    line: string,
    lineNumber: number,
    diagnostics: vscode.Diagnostic[],
    bracketStack: { char: string; line: number; pos: number }[]
  ): void {
    const brackets = { '(': ')', '[': ']', '{': '}' };

    // Skip comment lines
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      return;
    }

    // Process line character by character
    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      // Skip characters in comments
      const lineBeforeChar = line.substring(0, i);
      if (lineBeforeChar.includes('//')) {
        break; // Skip rest of line after comment
      }

      // Check for opening brackets
      if (char in brackets) {
        bracketStack.push({ char, line: lineNumber, pos: i });
      }
      // Check for closing brackets
      else if (Object.values(brackets).includes(char)) {
        if (bracketStack.length === 0) {
          // No matching opening bracket found in previous lines
          const range = new vscode.Range(
            new vscode.Position(lineNumber, i),
            new vscode.Position(lineNumber, i + 1)
          );

          const diagnostic = new vscode.Diagnostic(
            range,
            `Unmatched closing bracket '${char}'`,
            vscode.DiagnosticSeverity.Error
          );
          diagnostic.code = 'unmatched-bracket';
          diagnostics.push(diagnostic);
        } else {
          const last = bracketStack.pop()!;
          if (brackets[last.char as keyof typeof brackets] !== char) {
            // Mismatched bracket type
            const range = new vscode.Range(
              new vscode.Position(lineNumber, i),
              new vscode.Position(lineNumber, i + 1)
            );

            const diagnostic = new vscode.Diagnostic(
              range,
              `Mismatched bracket: expected '${
                brackets[last.char as keyof typeof brackets]
              }' but found '${char}'`,
              vscode.DiagnosticSeverity.Error
            );
            diagnostic.code = 'mismatched-bracket';
            diagnostics.push(diagnostic);

            // Push back the mismatched opening bracket to continue checking
            bracketStack.push(last);
          }
        }
      }
    }
  }

  private checkInvalidFunctionDeclarations(
    line: string,
    lineNumber: number,
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Traditional function pattern
    const traditionalFunctionPattern =
      /^\s*(int|double|string|bool|datetime|color|void|char|short|long|uchar|ushort|uint|ulong|float)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;

    // Class method pattern
    const classMethodPattern =
      /^\s*(public|private|protected|virtual)?\s*(int|double|string|bool|datetime|color|void|char|short|long|uchar|ushort|uint|ulong|float)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;

    // Constructor pattern
    const constructorPattern =
      /^\s*(public|private|protected)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;

    let functionName = '';
    let match;

    if ((match = line.match(traditionalFunctionPattern))) {
      functionName = match[2];
    } else if ((match = line.match(classMethodPattern))) {
      functionName = match[3];
    } else if ((match = line.match(constructorPattern))) {
      functionName = match[2];
    }

    if (functionName) {
      // Check for invalid function names
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) {
        const startPos = line.indexOf(functionName);
        const range = new vscode.Range(
          new vscode.Position(lineNumber, startPos),
          new vscode.Position(lineNumber, startPos + functionName.length)
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          'Invalid function name',
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.code = 'invalid-function-name';
        diagnostics.push(diagnostic);
      }
    }
  }

  private checkInvalidVariableDeclarations(
    line: string,
    lineNumber: number,
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Traditional variable pattern with expanded MQL5 data types
    const traditionalVariablePattern =
      /\b(int|double|string|bool|datetime|color|char|short|long|uchar|ushort|uint|ulong|float|void|enum|struct|class|MqlDateTime|MqlRates|MqlTick|MqlTradeRequest|MqlTradeResult|MqlTradeTransaction)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

    // Class member variable pattern with expanded MQL5 data types
    const classMemberPattern =
      /\b(public|private|protected)\s+(int|double|string|bool|datetime|color|char|short|long|uchar|ushort|uint|ulong|float|void|enum|struct|class|MqlDateTime|MqlRates|MqlTick|MqlTradeRequest|MqlTradeResult|MqlTradeTransaction)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

    // Input parameter pattern with expanded MQL5 data types and enums
    const inputPattern =
      /\b(input|sinput|extern)\s+(int|double|string|bool|datetime|color|char|short|long|uchar|ushort|uint|ulong|float|void|enum|struct|class|ENUM_\w+|MqlDateTime|MqlRates|MqlTick|MqlTradeRequest|MqlTradeResult|MqlTradeTransaction)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

    // Object variable pattern (including MQL5 classes)
    const objectPattern =
      /\b([A-Z][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

    // Array declaration pattern
    const arrayPattern =
      /\b(int|double|string|bool|datetime|color|char|short|long|uchar|ushort|uint|ulong|float|MqlDateTime|MqlRates|MqlTick)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\[/g;

    let match;
    const reservedKeywords = [
      // Control flow
      'if',
      'else',
      'for',
      'while',
      'do',
      'switch',
      'case',
      'default',
      'return',
      'break',
      'continue',
      'goto',

      // Type definitions
      'class',
      'struct',
      'enum',
      'interface',
      'union',
      'typename',

      // Access modifiers
      'public',
      'private',
      'protected',
      'virtual',
      'static',
      'const',
      'volatile',

      // Data types
      'void',
      'int',
      'double',
      'string',
      'bool',
      'char',
      'short',
      'long',
      'uchar',
      'ushort',
      'uint',
      'ulong',
      'float',
      'color',
      'datetime',

      // MQL5 specific
      'input',
      'sinput',
      'extern',
      'template',
      'typename',
      'operator',
      'final',
      'override',
      'abstract',
      'new',
      'delete',
      'this',

      // Other reserved words
      'true',
      'false',
      'NULL',
      'nullptr',
    ];

    // Check traditional variables
    while ((match = traditionalVariablePattern.exec(line)) !== null) {
      const variableName = match[2];
      if (reservedKeywords.includes(variableName)) {
        const startPos = match.index + match[1].length + 1;
        const range = new vscode.Range(
          new vscode.Position(lineNumber, startPos),
          new vscode.Position(lineNumber, startPos + variableName.length)
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          `'${variableName}' is a reserved keyword and cannot be used as a variable name`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.code = 'reserved-keyword';
        diagnostics.push(diagnostic);
      }
    }

    // Check class member variables
    while ((match = classMemberPattern.exec(line)) !== null) {
      const variableName = match[3];
      if (reservedKeywords.includes(variableName)) {
        const startPos = match.index + match[1].length + match[2].length + 2;
        const range = new vscode.Range(
          new vscode.Position(lineNumber, startPos),
          new vscode.Position(lineNumber, startPos + variableName.length)
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          `'${variableName}' is a reserved keyword and cannot be used as a variable name`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.code = 'reserved-keyword';
        diagnostics.push(diagnostic);
      }
    }

    // Check input parameters
    while ((match = inputPattern.exec(line)) !== null) {
      const variableName = match[3];
      if (reservedKeywords.includes(variableName)) {
        const startPos = match.index + match[1].length + match[2].length + 2;
        const range = new vscode.Range(
          new vscode.Position(lineNumber, startPos),
          new vscode.Position(lineNumber, startPos + variableName.length)
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          `'${variableName}' is a reserved keyword and cannot be used as a variable name`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.code = 'reserved-keyword';
        diagnostics.push(diagnostic);
      }
    }

    // Check object variables
    while ((match = objectPattern.exec(line)) !== null) {
      const variableName = match[2];
      if (reservedKeywords.includes(variableName)) {
        const startPos = match.index + match[1].length + 1;
        const range = new vscode.Range(
          new vscode.Position(lineNumber, startPos),
          new vscode.Position(lineNumber, startPos + variableName.length)
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          `'${variableName}' is a reserved keyword and cannot be used as a variable name`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.code = 'reserved-keyword';
        diagnostics.push(diagnostic);
      }
    }

    // Check array declarations
    while ((match = arrayPattern.exec(line)) !== null) {
      const variableName = match[2];
      if (reservedKeywords.includes(variableName)) {
        const startPos = match.index + match[1].length + 1;
        const range = new vscode.Range(
          new vscode.Position(lineNumber, startPos),
          new vscode.Position(lineNumber, startPos + variableName.length)
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          `'${variableName}' is a reserved keyword and cannot be used as an array name`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.code = 'reserved-keyword';
        diagnostics.push(diagnostic);
      }
    }
  }

  private checkInvalidPreprocessorDirectives(
    line: string,
    lineNumber: number,
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Check for invalid preprocessor directives
    const preprocessorPattern = /#([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;

    while ((match = preprocessorPattern.exec(line)) !== null) {
      const directive = match[1];

      // List of valid preprocessor directives
      const validDirectives = [
        'include',
        'property',
        'define',
        'undef',
        'ifdef',
        'ifndef',
        'else',
        'endif',
        'import',
        'resource',
        // MQL5 specific directives
        'class',
        'region',
        'endregion',
        'tester_indicator',
        'tester_file',
        'tester_library',
        'tester_set',
        'tester_init',
        'tester_load',
        'tester_unload',
        'tester_deinit',
      ];

      // List of valid property values for #property directive
      const validPropertyValues = [
        'copyright',
        'link',
        'version',
        'description',
        'strict',
        'indicator_chart_window',
        'indicator_separate_window',
        'indicator_buffers',
        'indicator_plots',
        'indicator_minimum',
        'indicator_maximum',
        'indicator_label',
        'indicator_color',
        'indicator_style',
        'indicator_width',
        'indicator_type',
        'script_show_confirm',
        'script_show_inputs',
        'library',
        'indicator_applied_price',
        'indicator_height',
        'indicator_level',
        'indicator_levelcolor',
        'indicator_levelstyle',
        'indicator_levelwidth',
        'indicator_leveltext',
        // MQL5 specific property values
        'icon',
        'stacksize',
        'tester_file',
        'tester_indicator',
        'tester_library',
        'tester_set',
        'indicator_digits',
        'indicator_levelvalue',
        'indicator_leveltext',
        'script_show_inputs',
        'indicator_plot1_arrow',
        'indicator_plot1_arrow_shift',
        'indicator_plot1_color',
        'indicator_plot1_drawbegin',
        'indicator_plot1_label',
        'indicator_plot1_shift',
        'indicator_plot1_style',
        'indicator_plot1_type',
        'indicator_plot1_width',
      ];

      // Check if it's a valid directive
      if (!validDirectives.includes(directive)) {
        const range = new vscode.Range(
          new vscode.Position(lineNumber, match.index),
          new vscode.Position(lineNumber, match.index + directive.length + 1)
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          `Invalid preprocessor directive '#${directive}'`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.code = 'invalid-preprocessor';
        diagnostics.push(diagnostic);
      }
      // If it's a #property directive, check if the property value is valid
      else if (directive === 'property') {
        const propertyPattern = /#property\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
        const propertyMatch = line.match(propertyPattern);

        if (propertyMatch) {
          const propertyValue = propertyMatch[1];

          // Check if it's a numbered property like indicator_label1, indicator_color2, etc.
          const numberedPropertyPattern =
            /^(indicator_(?:label|color|style|width|type)|indicator_level)\d+$/;
          const isNumberedProperty =
            numberedPropertyPattern.test(propertyValue);

          // If it's not a valid property value and not a numbered property
          if (
            !validPropertyValues.includes(propertyValue) &&
            !isNumberedProperty
          ) {
            const startPos = line.indexOf(propertyValue);
            const range = new vscode.Range(
              new vscode.Position(lineNumber, startPos),
              new vscode.Position(lineNumber, startPos + propertyValue.length)
            );

            const diagnostic = new vscode.Diagnostic(
              range,
              `Invalid property value '${propertyValue}' for #property directive`,
              vscode.DiagnosticSeverity.Warning
            );
            diagnostic.code = 'invalid-property-value';
            diagnostics.push(diagnostic);
          }
        }
      }
    }
  }

  private checkUndefinedVariables(
    text: string,
    lines: string[],
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Extract declared variables
    const declaredVariables = new Set<string>();
    const variablePattern =
      /\b(?:int|double|string|bool|datetime|color|input|sinput|extern|static)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;

    while ((match = variablePattern.exec(text)) !== null) {
      declaredVariables.add(match[1]);
    }

    // Add common MQL special words to avoid flagging them in comments
    const commonMqlWords = new Set([
      'copyright',
      'link',
      'version',
      'property',
      'strict',
      'include',
      'import',
      'define',
      'ifdef',
      'ifndef',
      'endif',
      'else',
      'elif',
      'https',
      'www',
      'com',
      'org',
      'net',
      'MetaQuotes',
      'Software',
      'Corp',
      'mql4',
      'mql5',
    ]);

    // Check for usage of undeclared variables
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip comment lines entirely
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
        continue;
      }

      // Process line by handling inline comments
      let processedLine = line;
      const doubleSlashIndex = line.indexOf('//');
      const blockCommentIndex = line.indexOf('/*');

      // Remove inline comments before processing
      if (doubleSlashIndex !== -1) {
        processedLine = line.substring(0, doubleSlashIndex);
      }

      if (
        blockCommentIndex !== -1 &&
        (doubleSlashIndex === -1 || blockCommentIndex < doubleSlashIndex)
      ) {
        processedLine = line.substring(0, blockCommentIndex);
      }

      const usagePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
      let usageMatch;

      while ((usageMatch = usagePattern.exec(processedLine)) !== null) {
        const variableName = usageMatch[1];

        // Skip keywords, built-in functions, and common MQL words
        if (
          this.isKeywordOrBuiltinFunction(variableName) ||
          commonMqlWords.has(variableName)
        ) {
          continue;
        }

        if (!declaredVariables.has(variableName)) {
          const range = new vscode.Range(
            new vscode.Position(i, usageMatch.index),
            new vscode.Position(i, usageMatch.index + variableName.length)
          );

          const diagnostic = new vscode.Diagnostic(
            range,
            `Undefined variable '${variableName}'`,
            vscode.DiagnosticSeverity.Warning
          );
          diagnostic.code = 'undefined-variable';
          diagnostics.push(diagnostic);
        }
      }
    }
  }

  private checkUndefinedFunctions(
    text: string,
    lines: string[],
    diagnostics: vscode.Diagnostic[]
  ): void {
    // This is a simplified check - in a real implementation, you'd want to
    // check against a comprehensive list of MQL built-in functions
    const builtinFunctions = new Set([
      // Trading functions - MQL4
      'OrderSend',
      'OrderClose',
      'OrderModify',
      'OrderDelete',
      'OrdersTotal',
      'OrderSelect',
      'OrderTicket',
      'OrderType',
      'OrderLots',
      'OrderOpenPrice',
      'OrderClosePrice',
      'OrderStopLoss',
      'OrderTakeProfit',
      'OrderSymbol',
      'OrderMagicNumber',
      'OrderProfit',
      'OrderSwap',
      'OrderCommission',
      'MarketInfo',
      'OrderCloseBy',
      'OrderGetDouble',
      'OrderGetInteger',
      'OrderGetString',

      // Trading functions - MQL5
      'PositionSelect',
      'PositionOpen',
      'PositionClose',
      'PositionModify',
      'PositionGetDouble',
      'PositionGetInteger',
      'PositionGetString',
      'PositionGetTicket',
      'PositionsTotal',
      'OrderSend',
      'OrderCheck',
      'OrderCalcMargin',
      'OrderCalcProfit',
      'HistorySelect',
      'HistoryOrderSelect',
      'HistoryDealSelect',
      'HistoryOrdersTotal',
      'HistoryDealsTotal',

      // Technical indicators
      'iMA',
      'iRSI',
      'iMACD',
      'iBands',
      'iStochastic',
      'iATR',
      'iAO',
      'iCCI',
      'iDEMA',
      'iEnvelopes',
      'iFractals',
      'iIchimoku',
      'iMFI',
      'iMomentum',
      'iOBV',
      'iSAR',
      'iWPR',
      'iOsMA',
      'iADX',
      'iBearsPower',
      'iBullsPower',
      'iForce',
      'iStdDev',
      'iFrAMA',
      'iAMA',
      'iVIDyA',
      'iCustom',
      'iAlligator',
      'iAC',
      'iDeMarker',
      'iVolumes',
      'iRVI',
      'iHigh',
      'iLow',
      'iOpen',
      'iClose',
      'iTime',
      'iBarShift',
      'iHighest',
      'iLowest',
      'iVolume',
      'iBars',

      // Indicator buffer functions
      'SetIndexBuffer',
      'SetIndexStyle',
      'SetIndexLabel',
      'SetIndexEmptyValue',
      'SetIndexArrow',
      'SetIndexDrawBegin',
      'SetIndexShift',
      'IndicatorShortName',
      'IndicatorDigits',
      'IndicatorBuffers',
      'IndicatorCounted',
      'IndicatorSetDouble',
      'IndicatorSetInteger',
      'IndicatorSetString',
      'PlotIndexSetInteger',
      'PlotIndexSetDouble',
      'PlotIndexSetString',
      'PlotIndexGetInteger',
      'PlotIndexGetDouble',
      'PlotIndexGetString',
      'IndicatorCreate',
      'IndicatorRelease',
      'IndicatorParameters',

      // Buffer operations
      'CopyBuffer',
      'CopyRates',
      'CopyTime',
      'CopyOpen',
      'CopyHigh',
      'CopyLow',
      'CopyClose',
      'CopyTickVolume',
      'CopyRealVolume',
      'CopySpread',
      'ArraySetAsSeries',
      'ArrayIsSeries',
      'SetLevelValue',
      'SetLevelStyle',
      'SetLevelColor',

      // Utility functions
      'Print',
      'Alert',
      'Comment',
      'GetLastError',
      'IndicatorRelease',
      'SymbolSelect',
      'SymbolInfoDouble',
      'SymbolInfoInteger',
      'SymbolInfoString',
      'SymbolInfoTick',
      'NormalizeDouble',
      'TerminalInfoInteger',
      'TerminalInfoDouble',
      'TerminalInfoString',
      'MQLInfoInteger',
      'MQLInfoString',
      'Sleep',
      'MessageBox',
      'SendMail',
      'SendFTP',
      'SendNotification',
      'PlaySound',
      'SymbolsTotal',
      'SymbolName',
      'RefreshRates',
      'WindowFind',
      'WindowHandle',
      'WindowIsVisible',
      'WindowOnDropped',
      'WindowPriceMax',
      'WindowPriceMin',
      'WindowPriceOnDropped',
      'WindowRedraw',
      'WindowScreenShot',
      'WindowTimeOnDropped',
      'WindowXOnDropped',
      'WindowYOnDropped',

      // Array functions
      'ArraySetAsSeries',
      'ArraySize',
      'ArrayResize',
      'ArrayCopy',
      'ArrayCompare',
      'ArrayFree',
      'ArrayGetAsSeries',
      'ArrayInitialize',
      'ArrayFill',
      'ArrayRange',
      'ArrayMinimum',
      'ArrayMaximum',
      'ArraySort',
      'ArrayBsearch',
      'ArrayInsert',
      'ArrayRemove',
      'ArrayReverse',
      'ArrayPrint',
      'ArrayDimension',

      // String functions
      'StringLen',
      'StringSubstr',
      'StringTrimLeft',
      'StringTrimRight',
      'StringFind',
      'StringReplace',
      'StringFormat',
      'StringSplit',
      'StringJoin',
      'StringToLower',
      'StringToUpper',
      'StringGetCharacter',
      'StringSetCharacter',
      'StringGetChar',
      'StringSetChar',
      'StringTrim',
      'StringConcatenate',
      'StringCompare',

      // Conversion functions
      'DoubleToString',
      'IntegerToString',
      'TimeToString',
      'TimeToStruct',
      'StructToTime',
      'StringToTime',
      'StringToDouble',
      'StringToInteger',
      'ColorToString',
      'StringToColor',
      'CharToString',
      'ShortToString',
      'CharArrayToString',
      'StringToCharArray',

      // Math functions
      'MathAbs',
      'MathMax',
      'MathMin',
      'MathRound',
      'MathCeil',
      'MathFloor',
      'MathSqrt',
      'MathPow',
      'MathLog',
      'MathExp',
      'MathSin',
      'MathCos',
      'MathTan',
      'MathArcsin',
      'MathArccos',
      'MathArctan',
      'MathRand',
      'MathMod',
      'MathSrand',
      'MathLog10',
      'MathIsValidNumber',
      'MathExpm1',
      'MathLog1p',
      'MathArccosh',
      'MathArcsinh',
      'MathArctanh',
      'MathCosh',
      'MathSinh',
      'MathTanh',

      // Time functions
      'TimeCurrent',
      'TimeLocal',
      'TimeGMT',
      'TimeDaylightSavings',
      'TimeGMTOffset',
      'TimeTradeServer',
      'TimeToStr',
      'Day',
      'Month',
      'Year',
      'Hour',
      'Minute',
      'Seconds',
      'DayOfWeek',
      'DayOfYear',

      // File operations
      'FileOpen',
      'FileClose',
      'FileWrite',
      'FileRead',
      'FileReadArray',
      'FileWriteArray',
      'FileReadDouble',
      'FileWriteDouble',
      'FileReadInteger',
      'FileWriteInteger',
      'FileReadString',
      'FileWriteString',
      'FileSeek',
      'FileTell',
      'FileSize',
      'FileIsEnding',
      'FileIsLineEnding',
      'FileDelete',
      'FileMove',
      'FileFlush',
      'FileCopy',
      'FileIsExist',
      'FileReadFloat',
      'FileWriteFloat',
      'FileReadLong',
      'FileWriteLong',
      'FileReadNumber',
      'FileWriteNumber',
      'FileFindFirst',
      'FileFindNext',
      'FileFindClose',

      // Object functions
      'ObjectCreate',
      'ObjectDelete',
      'ObjectsDeleteAll',
      'ObjectFind',
      'ObjectGetDouble',
      'ObjectGetInteger',
      'ObjectGetString',
      'ObjectSetDouble',
      'ObjectSetInteger',
      'ObjectSetString',
      'ObjectsTotal',
      'ObjectType',
      'ObjectName',
      'ObjectGetTimeByValue',
      'ObjectGetValueByTime',
      'ObjectMove',
      'ObjectDescription',
      'ObjectGetFiboDescription',
      'ObjectGetShiftByValue',
      'ObjectGetValueByShift',

      // Chart functions
      'ChartID',
      'ChartOpen',
      'ChartClose',
      'ChartFirst',
      'ChartNext',
      'ChartRedraw',
      'ChartSetDouble',
      'ChartSetInteger',
      'ChartSetString',
      'ChartGetDouble',
      'ChartGetInteger',
      'ChartGetString',
      'ChartNavigate',
      'ChartIndicatorDelete',
      'ChartIndicatorName',
      'ChartIndicatorsTotal',
      'ChartWindowFind',
      'ChartWindowOnDropped',
      'ChartPriceOnDropped',
      'ChartTimeOnDropped',
      'ChartXOnDropped',
      'ChartYOnDropped',
      'ChartSymbol',
      'ChartPeriod',
      'ChartApplyTemplate',
      'ChartSaveTemplate',
      'ChartScreenShot',
      'ChartTimePriceToXY',
      'ChartXYToTimePrice',
      'ChartSetSymbolPeriod',
      'ChartApplyTemplate',

      // MQL5 specific trading functions
      'OrderSend',
      'OrderSendAsync',
      'OrderCheck',
      'OrderCalcMargin',
      'OrderCalcProfit',
      'OrderGetDouble',
      'OrderGetInteger',
      'OrderGetString',
      'OrderGetTicket',
      'PositionGetDouble',
      'PositionGetInteger',
      'PositionGetString',
      'PositionGetSymbol',
      'PositionGetTicket',
      'PositionSelect',
      'PositionsTotal',
      'HistorySelect',
      'HistorySelectByPosition',
      'HistoryOrderSelect',
      'HistoryOrderGetDouble',
      'HistoryOrderGetInteger',
      'HistoryOrderGetString',
      'HistoryOrderGetTicket',
      'HistoryOrdersTotal',
      'HistoryDealSelect',
      'HistoryDealGetDouble',
      'HistoryDealGetInteger',
      'HistoryDealGetString',
      'HistoryDealGetTicket',
      'HistoryDealsTotal',

      // MQL5 specific object-oriented functions
      'ObjectCreate',
      'ObjectName',
      'ObjectDelete',
      'ObjectsDeleteAll',
      'ObjectFind',
      'ObjectGetTimeByValue',
      'ObjectGetValueByTime',
      'ObjectMove',
      'ObjectsTotal',
      'ObjectSetDouble',
      'ObjectSetInteger',
      'ObjectSetString',
      'ObjectGetDouble',
      'ObjectGetInteger',
      'ObjectGetString',
      'TextSetFont',
      'TextOut',
      'TextGetSize',
      'ChartIndicatorAdd',
      'ChartIndicatorGet',
      'ChartTimePriceToXY',
      'ChartXYToTimePrice',
      'ChartSetSymbolPeriod',

      // Account functions
      'AccountInfoDouble',
      'AccountInfoInteger',
      'AccountInfoString',
      'AccountBalance',
      'AccountCredit',
      'AccountCompany',
      'AccountCurrency',
      'AccountEquity',
      'AccountFreeMargin',
      'AccountFreeMarginCheck',
      'AccountFreeMarginMode',
      'AccountLeverage',
      'AccountMargin',
      'AccountName',
      'AccountNumber',
      'AccountProfit',
      'AccountServer',
      'AccountStopoutLevel',
      'AccountStopoutMode',

      // Custom indicator calculation functions
      'CalculateMA',
      'CalculateSMA',
      'CalculateEMA',
      'CalculateSMMA',
      'CalculateLWMA',
      'OnCalculate',
      'OnInit',
      'OnDeinit',
      'OnTick',
      'OnTimer',
      'OnChartEvent',
      'OnBookEvent',
      'OnTrade',
      'OnTradeTransaction',
      'OnTester',
      'OnTesterInit',
      'OnTesterDeinit',
      'OnTesterPass',
      'OnStart',
    ]);

    const functionCallPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    let match;

    while ((match = functionCallPattern.exec(text)) !== null) {
      const functionName = match[1];

      if (
        !builtinFunctions.has(functionName) &&
        !this.isFunctionDeclaredInDocument(text, functionName) &&
        !this.isKeywordOrBuiltinFunction(functionName)
      ) {
        // Find the line number for this match
        const beforeMatch = text.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length - 1;
        const lineStart = beforeMatch.lastIndexOf('\n') + 1;
        const columnStart = match.index - lineStart;

        const range = new vscode.Range(
          new vscode.Position(lineNumber, columnStart),
          new vscode.Position(lineNumber, columnStart + functionName.length)
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          `Undefined function '${functionName}'`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.code = 'undefined-function';
        diagnostics.push(diagnostic);
      }
    }
  }

  private checkTypeMismatches(
    lines: string[],
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Enhanced type checking for MQL4/MQL5
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip comment lines
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
        continue;
      }

      // Check for numeric types being assigned string values
      const numericStringAssignmentPattern =
        /(int|double|float|char|short|long|uchar|ushort|uint|ulong)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*"[^"]*"/;
      let match = line.match(numericStringAssignmentPattern);

      if (match) {
        const type = match[1];
        const variableName = match[2];

        const range = new vscode.Range(
          new vscode.Position(i, line.indexOf('"')),
          new vscode.Position(i, line.lastIndexOf('"') + 1)
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          `Cannot assign string value to ${type} variable '${variableName}'`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.code = 'type-mismatch';
        diagnostics.push(diagnostic);
      }

      // Check for string type being assigned numeric values without quotes
      const stringNumericAssignmentPattern =
        /string\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([0-9]+\.?[0-9]*)/;
      match = line.match(stringNumericAssignmentPattern);

      if (match) {
        const variableName = match[1];
        const numericValue = match[2];

        const range = new vscode.Range(
          new vscode.Position(i, line.indexOf(numericValue)),
          new vscode.Position(
            i,
            line.indexOf(numericValue) + numericValue.length
          )
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          `Numeric value ${numericValue} should be enclosed in quotes for string variable '${variableName}'`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.code = 'type-mismatch';
        diagnostics.push(diagnostic);
      }

      // Check for boolean values assigned to non-boolean types
      const boolAssignmentPattern =
        /(string|datetime|color)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(true|false)\b/;
      match = line.match(boolAssignmentPattern);

      if (match) {
        const type = match[1];
        const variableName = match[2];
        const boolValue = match[3];

        const range = new vscode.Range(
          new vscode.Position(i, line.indexOf(boolValue)),
          new vscode.Position(i, line.indexOf(boolValue) + boolValue.length)
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          `Cannot assign boolean value to ${type} variable '${variableName}'`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.code = 'type-mismatch';
        diagnostics.push(diagnostic);
      }

      // Check for color values assigned to non-color types
      const colorAssignmentPattern =
        /(int|double|float|string|bool|datetime)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(clr[A-Z][a-zA-Z]+)\b/;
      match = line.match(colorAssignmentPattern);

      if (match) {
        const type = match[1];
        const variableName = match[2];
        const colorValue = match[3];

        // Skip warning for int type as it can hold color values
        if (
          type !== 'int' &&
          type !== 'uint' &&
          type !== 'long' &&
          type !== 'ulong'
        ) {
          const range = new vscode.Range(
            new vscode.Position(i, line.indexOf(colorValue)),
            new vscode.Position(i, line.indexOf(colorValue) + colorValue.length)
          );

          const diagnostic = new vscode.Diagnostic(
            range,
            `Cannot assign color value to ${type} variable '${variableName}'`,
            vscode.DiagnosticSeverity.Warning
          );
          diagnostic.code = 'type-mismatch';
          diagnostics.push(diagnostic);
        }
      }
    }
  }

  private checkUnreachableCode(
    lines: string[],
    diagnostics: vscode.Diagnostic[]
  ): void {
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();

      if (line === 'return;' || line.startsWith('return ')) {
        // Check if there's code after return statement in the same block
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();

          if (nextLine === '}' || nextLine === '') {
            break;
          }

          if (
            nextLine &&
            !nextLine.startsWith('//') &&
            !nextLine.startsWith('/*')
          ) {
            const range = new vscode.Range(
              new vscode.Position(j, 0),
              new vscode.Position(j, lines[j].length)
            );

            const diagnostic = new vscode.Diagnostic(
              range,
              'Unreachable code detected',
              vscode.DiagnosticSeverity.Warning
            );
            diagnostic.code = 'unreachable-code';
            diagnostics.push(diagnostic);
            break;
          }
        }
      }
    }
  }

  private checkUnusedVariables(
    text: string,
    lines: string[],
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Extract declared variables with their positions
    const declaredVariables = new Map<
      string,
      { line: number; column: number }
    >();

    // Traditional variable pattern with expanded MQL5 data types
    const variablePattern =
      /\b(?:int|double|string|bool|datetime|color|char|short|long|uchar|ushort|uint|ulong|float|void|enum|struct|class|MqlDateTime|MqlRates|MqlTick|MqlTradeRequest|MqlTradeResult|MqlTradeTransaction)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;

    // Class member variable pattern
    const classMemberPattern =
      /\b(?:public|private|protected)\s+(?:int|double|string|bool|datetime|color|char|short|long|uchar|ushort|uint|ulong|float|void|enum|struct|class|MqlDateTime|MqlRates|MqlTick|MqlTradeRequest|MqlTradeResult|MqlTradeTransaction)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;

    // Object variable pattern
    const objectPattern =
      /\b(?:[A-Z][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;

    let match;

    // Process traditional variables
    while ((match = variablePattern.exec(text)) !== null) {
      const variableName = match[1];
      const beforeMatch = text.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length - 1;
      const lineStart = beforeMatch.lastIndexOf('\n') + 1;
      const columnStart =
        match.index - lineStart + match[0].indexOf(variableName);

      declaredVariables.set(variableName, {
        line: lineNumber,
        column: columnStart,
      });
    }

    // Process class member variables
    while ((match = classMemberPattern.exec(text)) !== null) {
      const variableName = match[1];
      const beforeMatch = text.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length - 1;
      const lineStart = beforeMatch.lastIndexOf('\n') + 1;
      const columnStart =
        match.index - lineStart + match[0].indexOf(variableName);

      declaredVariables.set(variableName, {
        line: lineNumber,
        column: columnStart,
      });
    }

    // Process object variables
    while ((match = objectPattern.exec(text)) !== null) {
      const variableName = match[1];
      const beforeMatch = text.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length - 1;
      const lineStart = beforeMatch.lastIndexOf('\n') + 1;
      const columnStart =
        match.index - lineStart + match[0].indexOf(variableName);

      declaredVariables.set(variableName, {
        line: lineNumber,
        column: columnStart,
      });
    }

    // Check if variables are used
    declaredVariables.forEach((position, variableName) => {
      const usagePattern = new RegExp(`\\b${variableName}\\b`, 'g');
      const matches = text.match(usagePattern);

      // If variable appears only once (declaration), it's unused
      if (matches && matches.length === 1) {
        const range = new vscode.Range(
          new vscode.Position(position.line, position.column),
          new vscode.Position(
            position.line,
            position.column + variableName.length
          )
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          `Unused variable '${variableName}'`,
          vscode.DiagnosticSeverity.Information
        );
        diagnostic.code = 'unused-variable';
        diagnostics.push(diagnostic);
      }
    });
  }

  private checkMagicNumbers(
    lines: string[],
    diagnostics: vscode.Diagnostic[]
  ): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for numeric literals (excluding 0, 1, -1 which are commonly acceptable)
      const magicNumberPattern = /\b(?!0\b|1\b|-1\b)\d{2,}\b/g;
      let match;

      while ((match = magicNumberPattern.exec(line)) !== null) {
        const range = new vscode.Range(
          new vscode.Position(i, match.index),
          new vscode.Position(i, match.index + match[0].length)
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          `Consider replacing magic number '${match[0]}' with a named constant`,
          vscode.DiagnosticSeverity.Information
        );
        diagnostic.code = 'magic-number';
        diagnostics.push(diagnostic);
      }
    }
  }

  private checkLongFunctions(
    lines: string[],
    diagnostics: vscode.Diagnostic[]
  ): void {
    let functionStart = -1;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect function start - expanded to include MQL5 types and class methods
      if (
        /^\s*(?:int|double|string|bool|datetime|color|void|char|short|long|uchar|ushort|uint|ulong|float|MqlDateTime|MqlRates|MqlTick|MqlTradeRequest|MqlTradeResult|MqlTradeTransaction|[A-Z][a-zA-Z0-9_]*)\s+(?:[a-zA-Z_][a-zA-Z0-9_]*(?:::)?)?[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(
          line
        )
      ) {
        functionStart = i;
        braceCount = 0;
      }

      // Count braces
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      // Function end detected
      if (functionStart !== -1 && braceCount === 0 && line.includes('}')) {
        const functionLength = i - functionStart + 1;

        if (functionLength > 50) {
          // Arbitrary threshold
          const range = new vscode.Range(
            new vscode.Position(functionStart, 0),
            new vscode.Position(functionStart, lines[functionStart].length)
          );

          const diagnostic = new vscode.Diagnostic(
            range,
            `Function is too long (${functionLength} lines). Consider breaking it into smaller functions.`,
            vscode.DiagnosticSeverity.Information
          );
          diagnostic.code = 'long-function';
          diagnostics.push(diagnostic);
        }

        functionStart = -1;
      }
    }
  }

  private checkDeepNesting(
    lines: string[],
    diagnostics: vscode.Diagnostic[]
  ): void {
    let nestingLevel = 0;
    const maxNesting = 4; // Arbitrary threshold

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const char of line) {
        if (char === '{') {
          nestingLevel++;

          if (nestingLevel > maxNesting) {
            const range = new vscode.Range(
              new vscode.Position(i, line.indexOf('{')),
              new vscode.Position(i, line.indexOf('{') + 1)
            );

            const diagnostic = new vscode.Diagnostic(
              range,
              `Deep nesting detected (level ${nestingLevel}). Consider refactoring.`,
              vscode.DiagnosticSeverity.Information
            );
            diagnostic.code = 'deep-nesting';
            diagnostics.push(diagnostic);
          }
        }

        if (char === '}') {
          nestingLevel--;
        }
      }
    }
  }

  private isKeywordOrBuiltinFunction(word: string): boolean {
    // MQL keywords
    const keywords = [
      // Data types
      'bool',
      'char',
      'class',
      'color',
      'datetime',
      'double',
      'enum',
      'float',
      'int',
      'long',
      'short',
      'string',
      'struct',
      'uchar',
      'uint',
      'ulong',
      'ushort',
      'void',
      'MqlDateTime',
      'MqlRates',
      'MqlTick',

      // Modifiers
      'const',
      'enum',
      'extern',
      'input',
      'sinput',
      'static',
      'virtual',
      'override',
      'abstract',
      'final',
      'public',
      'private',
      'protected',

      // Boolean values
      'true',
      'false',

      // Common constants - initialization
      'INIT_SUCCEEDED',
      'INIT_FAILED',
      'INIT_PARAMETERS_INCORRECT',
      'REASON_PROGRAM',
      'REASON_REMOVE',
      'REASON_RECOMPILE',
      'REASON_CHARTCHANGE',
      'REASON_CHARTCLOSE',
      'REASON_PARAMETERS',
      'REASON_ACCOUNT',
      'REASON_TEMPLATE',
      'REASON_INITFAILED',
      'REASON_CLOSE',

      // Common constants - indicator object
      'DRAW_LINE',
      'DRAW_SECTION',
      'DRAW_HISTOGRAM',
      'DRAW_ARROW',
      'DRAW_ZIGZAG',
      'DRAW_NONE',
      'DRAW_FILLING',
      'DRAW_BARS',
      'DRAW_CANDLES',
      'DRAW_COLOR_LINE',
      'DRAW_COLOR_SECTION',
      'DRAW_COLOR_HISTOGRAM',
      'DRAW_COLOR_ARROW',
      'DRAW_COLOR_ZIGZAG',
      'DRAW_COLOR_BARS',
      'DRAW_COLOR_CANDLES',
      'STYLE_SOLID',
      'STYLE_DASH',
      'STYLE_DOT',
      'STYLE_DASHDOT',
      'STYLE_DASHDOTDOT',

      // Common constants - plot property
      'EMPTY_VALUE',
      'INDICATOR_DATA',
      'INDICATOR_COLOR_INDEX',
      'INDICATOR_CALCULATIONS',
      'INDICATOR_DIGITS',
      'INDICATOR_HEIGHT',
      'INDICATOR_LEVELS',
      'INDICATOR_LEVELCOLOR',
      'INDICATOR_LEVELSTYLE',
      'INDICATOR_LEVELWIDTH',
      'INDICATOR_MINIMUM',
      'INDICATOR_MAXIMUM',
      'INDICATOR_SHORTNAME',
      'INDICATOR_LEVELTEXT',
      'INDICATOR_LEVELVALUE',
      'PLOT_ARROW',
      'PLOT_ARROW_SHIFT',
      'PLOT_COLOR_INDEXES',
      'PLOT_DRAW_BEGIN',
      'PLOT_DRAW_TYPE',
      'PLOT_SHOW_DATA',
      'PLOT_SHIFT',
      'PLOT_LINE_COLOR',
      'PLOT_LINE_STYLE',
      'PLOT_LINE_WIDTH',
      'PLOT_EMPTY_VALUE',

      // Common constants - MQL specific
      'NULL',
      'EMPTY',
      'CLR_NONE',
      'WHOLE_ARRAY',
      'WRONG_VALUE',
      'TERMINAL_MAXBARS',
      'TERMINAL_BUILD',
      'TERMINAL_COMMUNITY_ACCOUNT',
      'TERMINAL_COMMUNITY_CONNECTION',
      'TERMINAL_CONNECTED',
      'TERMINAL_DLLS_ALLOWED',
      'TERMINAL_TRADE_ALLOWED',
      'TERMINAL_EMAIL_ENABLED',
      'TERMINAL_FTP_ENABLED',
      'TERMINAL_NOTIFICATIONS_ENABLED',
      'TERMINAL_SCREEN_DPIW',
      'TERMINAL_SCREEN_DPIH',

      // Common constants - common MQL
      'MODE_SMA',
      'MODE_EMA',
      'MODE_SMMA',
      'MODE_LWMA',
      'PRICE_CLOSE',
      'PRICE_OPEN',
      'PRICE_HIGH',
      'PRICE_LOW',
      'PRICE_MEDIAN',
      'PRICE_TYPICAL',
      'PRICE_WEIGHTED',
      'MODE_MAIN',
      'MODE_SIGNAL',
      'MODE_UPPER',
      'MODE_LOWER',
      'MODE_TENKANSEN',
      'MODE_KIJUNSEN',
      'MODE_SENKOUSPANA',
      'MODE_SENKOUSPANB',
      'MODE_CHINKOUSPAN',
      'MODE_GATORJAW',
      'MODE_GATORTEETH',
      'MODE_GATORLIPS',
      'MODE_PLUSDI',
      'MODE_MINUSDI',
      'MODE_MAIN',
      'MODE_SIGNAL',
      'MODE_HISTOGRAM',
      'OP_BUY',
      'OP_SELL',
      'OP_BUYLIMIT',
      'OP_SELLLIMIT',
      'OP_BUYSTOP',
      'OP_SELLSTOP',
      'SELECT_BY_POS',
      'SELECT_BY_TICKET',
      'MODE_TRADES',
      'MODE_HISTORY',
      'clrNONE',
      'clrBlack',
      'clrDarkGreen',
      'clrDarkSlateGray',
      'clrOlive',
      'clrGreen',
      'clrTeal',
      'clrNavy',
      'clrPurple',
      'clrMaroon',
      'clrIndigo',
      'clrMidnightBlue',
      'clrDarkBlue',
      'clrDarkOliveGreen',
      'clrSaddleBrown',
      'clrForestGreen',
      'clrOliveDrab',
      'clrSeaGreen',
      'clrDarkGoldenrod',
      'clrDarkSlateBlue',
      'clrSienna',
      'clrMediumBlue',
      'clrBrown',
      'clrDarkTurquoise',
      'clrDimGray',
      'clrLightSeaGreen',
      'clrDarkViolet',
      'clrFireBrick',
      'clrMediumVioletRed',
      'clrMediumSeaGreen',
      'clrChocolate',
      'clrCrimson',
      'clrSteelBlue',
      'clrGoldenrod',
      'clrMediumSpringGreen',
      'clrLawnGreen',
      'clrCadetBlue',
      'clrDarkOrchid',
      'clrYellowGreen',
      'clrLimeGreen',
      'clrOrangeRed',
      'clrDarkOrange',
      'clrOrange',
      'clrGold',
      'clrYellow',
      'clrChartreuse',
      'clrLime',
      'clrSpringGreen',
      'clrAqua',
      'clrDeepSkyBlue',
      'clrBlue',
      'clrMagenta',
      'clrRed',
      'clrGray',
      'clrSlateGray',
      'clrPeru',
      'clrBlueViolet',
      'clrLightSlateGray',
      'clrDeepPink',
      'clrMediumTurquoise',
      'clrDodgerBlue',
      'clrTurquoise',
      'clrRoyalBlue',
      'clrSlateBlue',
      'clrDarkKhaki',
      'clrIndianRed',
      'clrMediumOrchid',
      'clrGreenYellow',
      'clrMediumAquamarine',
      'clrDarkSeaGreen',
      'clrTomato',
      'clrRosyBrown',
      'clrOrchid',
      'clrMediumPurple',
      'clrPaleVioletRed',
      'clrCoral',
      'clrCornflowerBlue',
      'clrDarkGray',
      'clrSandyBrown',
      'clrMediumSlateBlue',
      'clrTan',
      'clrDarkSalmon',
      'clrBurlyWood',
      'clrHotPink',
      'clrSalmon',
      'clrViolet',
      'clrLightCoral',
      'clrSkyBlue',
      'clrLightSalmon',
      'clrPlum',
      'clrKhaki',
      'clrLightGreen',
      'clrAquamarine',
      'clrSilver',
      'clrLightSkyBlue',
      'clrLightSteelBlue',
      'clrLightBlue',
      'clrPaleGreen',
      'clrThistle',
      'clrPowderBlue',
      'clrPaleGoldenrod',
      'clrPaleTurquoise',
      'clrLightGray',
      'clrWheat',
      'clrNavajoWhite',
      'clrMoccasin',
      'clrLightPink',
      'clrGainsboro',
      'clrPeachPuff',
      'clrPink',
      'clrBisque',
      'clrLightGoldenrod',
      'clrBlanchedAlmond',
      'clrLemonChiffon',
      'clrBeige',
      'clrAntiqueWhite',
      'clrPapayaWhip',
      'clrCornsilk',
      'clrLightYellow',
      'clrLightCyan',
      'clrLinen',
      'clrLavender',
      'clrMistyRose',
      'clrOldLace',
      'clrWhiteSmoke',
      'clrSeashell',
      'clrIvory',
      'clrHoneydew',
      'clrAliceBlue',
      'clrLavenderBlush',
      'clrMintCream',
      'clrSnow',
      'clrWhite',

      // Common MQL enums
      'ENUM_TIMEFRAMES',
      'ENUM_MA_METHOD',
      'ENUM_APPLIED_PRICE',
      'ENUM_OBJECT',
      'ENUM_OBJECT_PROPERTY_INTEGER',
      'ENUM_OBJECT_PROPERTY_DOUBLE',
      'ENUM_OBJECT_PROPERTY_STRING',
      'ENUM_INDICATOR_TYPE',
      'ENUM_DATATYPE',
      'ENUM_DRAW_TYPE',
      'ENUM_LINE_STYLE',
      'ENUM_PLOT_PROPERTY_INTEGER',
      'ENUM_PLOT_PROPERTY_DOUBLE',
      'ENUM_PLOT_PROPERTY_STRING',
      'ENUM_INDICATOR_PROPERTY_INTEGER',
      'ENUM_INDICATOR_PROPERTY_DOUBLE',
      'ENUM_INDICATOR_PROPERTY_STRING',
      'ENUM_ORDER_TYPE',
      'ENUM_POSITION_TYPE',
      'ENUM_TRADE_REQUEST_ACTIONS',
      'ENUM_TRADE_TRANSACTION_TYPE',
      'ENUM_SYMBOL_INFO_DOUBLE',
      'ENUM_SYMBOL_INFO_INTEGER',
      'ENUM_SYMBOL_INFO_STRING',
      'ENUM_TERMINAL_INFO_INTEGER',
      'ENUM_TERMINAL_INFO_DOUBLE',
      'ENUM_TERMINAL_INFO_STRING',
      'ENUM_MQL_INFO_INTEGER',
      'ENUM_MQL_INFO_STRING',
      'ENUM_ACCOUNT_INFO_INTEGER',
      'ENUM_ACCOUNT_INFO_DOUBLE',
      'ENUM_ACCOUNT_INFO_STRING',

      // Common MQL objects
      'Ask',
      'Bid',
      'Point',
      'Digits',
      'Symbol',
      'Period',
      '_Symbol',
      '_Period',
      'MagicNumber',
      'StopLoss',
      'TakeProfit',
      '_Point',
      '_Digits',
      '_LastError',
      '_UninitReason',
      '_RandomSeed',
      '_StopFlag',
      '_IsX64',
      '_IsVisualMode',
      'AccountBalance',
      'AccountEquity',
      'AccountFreeMargin',
      'AccountMargin',
      'AccountProfit',
      'AccountCredit',
      'AccountName',
      'AccountNumber',
      'AccountLeverage',
      'AccountCompany',
      'AccountCurrency',
      'AccountStopoutMode',
      'AccountStopoutLevel',
      '_Ask',
      '_Bid',

      // Common preprocessor directives
      '#include',
      '#property',
      '#define',
      '#undef',
      '#ifdef',
      '#ifndef',
      '#else',
      '#endif',
      '#import',
      '#resource',
      'copyright',
      'link',
      'version',
      'description',
      'strict',
      'indicator_chart_window',
      'indicator_separate_window',
      'indicator_buffers',
      'indicator_plots',
      'indicator_minimum',
      'indicator_maximum',
      'indicator_labelN',
      'indicator_colorN',
      'indicator_styleN',
      'indicator_widthN',
      'indicator_typeN',
      'script_show_confirm',
      'script_show_inputs',
      'library',
      'indicator_applied_price',
      'indicator_height',
      'indicator_level',
      'indicator_levelcolor',
      'indicator_levelstyle',
      'indicator_levelwidth',
      'indicator_leveltext',

      // Common MQL functions
      'Alert',
      'Print',
      'Comment',
      'GetLastError',
      'OrderSend',
      'OrderClose',
      'OrderSelect',
      'OrdersTotal',
      'OrderProfit',
      'OrderType',
      'OrderLots',
      'OrderOpenPrice',
      'OrderClosePrice',
      'OrderStopLoss',
      'OrderTakeProfit',
      'OrderOpenTime',
      'OrderCloseTime',
      'OrderCommission',
      'OrderSwap',
      'OrderSymbol',
      'OrderMagicNumber',
      'OrderTicket',

      // MQL5 specific
      'CTrade',
      'CPositionInfo',
      'CSymbolInfo',
      'CAccountInfo',
      'POSITION_TYPE_BUY',
      'POSITION_TYPE_SELL',
      'ORDER_FILLING_FOK',
      'ORDER_FILLING_IOC',
      'ORDER_FILLING_RETURN',
      'ENUM_ORDER_TYPE',
      'ENUM_POSITION_TYPE',
      'ENUM_ORDER_FILLING',
      'ENUM_TIMEFRAMES',
      'INVALID_HANDLE',
      'trade',
      'position',
      'symbolInfo',
      'accountInfo',
      'ORDER_TYPE_BUY',
      'ORDER_TYPE_SELL',
      'ORDER_TYPE_BUY_LIMIT',
      'ORDER_TYPE_SELL_LIMIT',
      'ORDER_TYPE_BUY_STOP',
      'ORDER_TYPE_SELL_STOP',
      'ORDER_TYPE_BUY_STOP_LIMIT',
      'ORDER_TYPE_SELL_STOP_LIMIT',
      'DEAL_TYPE_BUY',
      'DEAL_TYPE_SELL',
      'DEAL_ENTRY_IN',
      'DEAL_ENTRY_OUT',
      'DEAL_ENTRY_INOUT',
      'DEAL_ENTRY_OUT_BY',
      'TRADE_TRANSACTION_ORDER_ADD',
      'TRADE_TRANSACTION_ORDER_UPDATE',
      'TRADE_TRANSACTION_ORDER_DELETE',
      'TRADE_TRANSACTION_DEAL_ADD',
      'TRADE_TRANSACTION_DEAL_UPDATE',
      'TRADE_TRANSACTION_DEAL_DELETE',
      'TRADE_TRANSACTION_HISTORY_ADD',
      'TRADE_TRANSACTION_HISTORY_UPDATE',
      'TRADE_TRANSACTION_HISTORY_DELETE',
      'TRADE_TRANSACTION_POSITION',
      'TRADE_TRANSACTION_REQUEST',
      'MqlTradeTransaction',
      'MqlTradeRequest',
      'MqlTradeResult',

      // MQL5 class names
      'COrderInfo',
      'CHistoryOrderInfo',
      'CHistoryPositionInfo',
      'CDealInfo',
      'CIndicators',
      'CArrayObj',
      'CObject',
      'CFile',
      'CFileBin',
      'CFileTxt',
      'CString',
      'CDateTime',
      'CChart',
      'CCanvas',
      'CIndicator',
      'CIndicators',
      'CiMA',
      'CiRSI',
      'CiMACD',
      'CiBands',
      'CiStochastic',
      'CiATR',
      'CiAO',
      'CiCCI',
      'CiEnvelopes',
      'CiFractals',
      'CiIchimoku',
      'CiMFI',
      'CiMomentum',
      'CiOBV',
      'CiSAR',
      'CiWPR',
      'CAnalysisResult',

      // Custom indicator specific
      'FastMA_Period',
      'SlowMA_Period',
      'Signal_Period',
      'MA_Method',
      'Applied_Price',
      'FastMA_Buffer',
      'SlowMA_Buffer',
      'Signal_Buffer',
      'IndicatorName',
      'MinBars',
      'SetIndexBuffer',
      'SetIndexLabel',
      'SetIndexStyle',
      'SetIndexEmptyValue',
      'IndicatorShortName',
      'OnCalculate',
      'CalculateMA',
      'CalculateSMA',
      'CalculateEMA',
      'CalculateSMMA',
      'CalculateLWMA',
      'indicator_separate_window',
      'indicator_chart_window',
      'indicator_buffers',
      'indicator_plots',

      // Control flow keywords
      'if',
      'else',
      'for',
      'while',
      'do',
      'switch',
      'case',
      'default',
      'return',
      'break',
      'continue',
      'group',
      'template',
      'typename',

      // Common MQL functions
      'OnInit',
      'OnDeinit',
      'OnStart',
      'OnTick',
      'OnTimer',
      'OnChartEvent',
      'OnBookEvent',
      'OnTradeTransaction',
      'OnTrade',
      'ArraySetAsSeries',
    ];

    return keywords.includes(word);
  }

  private isFunctionDeclaredInDocument(
    text: string,
    functionName: string
  ): boolean {
    // Traditional function declaration pattern
    const traditionalFunctionPattern = new RegExp(
      `\\b(?:int|double|string|bool|datetime|color|void|char|short|long|uchar|ushort|uint|ulong|float)\\s+${functionName}\\s*\\([^)]*\\)\\s*(?:\\{|;)`,
      'g'
    );

    // Class method declaration pattern
    const classMethodPattern = new RegExp(
      `\\b(?:public|private|protected|virtual)?\\s*(?:int|double|string|bool|datetime|color|void|char|short|long|uchar|ushort|uint|ulong|float)\\s+${functionName}\\s*\\([^)]*\\)\\s*(?:\\{|;)`,
      'g'
    );

    // Constructor declaration pattern
    const constructorPattern = new RegExp(
      `\\b${functionName}\\s*\\([^)]*\\)\\s*(?:\\{|;)`,
      'g'
    );

    return (
      traditionalFunctionPattern.test(text) ||
      classMethodPattern.test(text) ||
      constructorPattern.test(text)
    );
  }
}
