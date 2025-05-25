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
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i;

      // Check for missing semicolons
      this.checkMissingSemicolons(line, lineNumber, diagnostics);

      // Check for unmatched brackets
      this.checkUnmatchedBrackets(line, lineNumber, diagnostics);

      // Check for invalid function declarations
      this.checkInvalidFunctionDeclarations(line, lineNumber, diagnostics);

      // Check for invalid variable declarations
      this.checkInvalidVariableDeclarations(line, lineNumber, diagnostics);

      // Check for invalid preprocessor directives
      this.checkInvalidPreprocessorDirectives(line, lineNumber, diagnostics);
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

    // Skip lines that end with { } or are control structures
    if (
      trimmedLine.endsWith('{') ||
      trimmedLine.endsWith('}') ||
      /^\s*(if|else|for|while|do|switch|case|default)\b/.test(trimmedLine)
    ) {
      return;
    }

    // Check if line should end with semicolon
    if (!trimmedLine.endsWith(';') && !trimmedLine.endsWith(',')) {
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
    diagnostics: vscode.Diagnostic[]
  ): void {
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack: { char: string; pos: number }[] = [];

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char in brackets) {
        stack.push({ char, pos: i });
      } else if (Object.values(brackets).includes(char)) {
        if (stack.length === 0) {
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
          const last = stack.pop()!;
          if (brackets[last.char as keyof typeof brackets] !== char) {
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
    const functionPattern =
      /^\s*(int|double|string|bool|datetime|color|void)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
    const match = line.match(functionPattern);

    if (match) {
      const functionName = match[2];

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
    const variablePattern =
      /\b(int|double|string|bool|datetime|color)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let match;

    while ((match = variablePattern.exec(line)) !== null) {
      const variableName = match[2];

      // Check for reserved keywords used as variable names
      const reservedKeywords = [
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
      ];
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
  }

  private checkInvalidPreprocessorDirectives(
    line: string,
    lineNumber: number,
    diagnostics: vscode.Diagnostic[]
  ): void {
    if (line.trim().startsWith('#')) {
      const validDirectives = [
        '#property',
        '#include',
        '#import',
        '#define',
        '#ifdef',
        '#ifndef',
        '#endif',
        '#else',
        '#elif',
      ];
      const directive = line.trim().split(/\s+/)[0];

      if (!validDirectives.includes(directive)) {
        const range = new vscode.Range(
          new vscode.Position(lineNumber, line.indexOf('#')),
          new vscode.Position(lineNumber, line.indexOf('#') + directive.length)
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          `Unknown preprocessor directive '${directive}'`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.code = 'unknown-directive';
        diagnostics.push(diagnostic);
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

    // Check for usage of undeclared variables
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const usagePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
      let usageMatch;

      while ((usageMatch = usagePattern.exec(line)) !== null) {
        const variableName = usageMatch[1];

        // Skip keywords and function names
        if (this.isKeywordOrBuiltinFunction(variableName)) {
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
      'OrderSend',
      'OrderClose',
      'OrderModify',
      'OrderDelete',
      'MarketInfo',
      'iMA',
      'iRSI',
      'iMACD',
      'iBands',
      'Print',
      'Alert',
      'Comment',
      'ArraySize',
      'ArrayResize',
      'StringLen',
      'StringSubstr',
      'MathAbs',
      'MathMax',
      'MathMin',
      'TimeCurrent',
      'TimeLocal',
      'TimeToStr',
    ]);

    const functionCallPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    let match;

    while ((match = functionCallPattern.exec(text)) !== null) {
      const functionName = match[1];

      if (
        !builtinFunctions.has(functionName) &&
        !this.isFunctionDeclaredInDocument(text, functionName)
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
    // Simplified type checking - in a real implementation, this would be much more sophisticated
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for obvious type mismatches like assigning string to int
      const assignmentPattern =
        /(int|double)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*"[^"]*"/;
      const match = line.match(assignmentPattern);

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
    const variablePattern =
      /\b(?:int|double|string|bool|datetime|color)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;

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

      // Detect function start
      if (
        /^\s*(?:int|double|string|bool|datetime|color|void)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(
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
    const keywords = [
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
      'int',
      'double',
      'string',
      'bool',
      'datetime',
      'color',
      'void',
      'const',
      'extern',
      'static',
      'input',
      'sinput',
      'true',
      'false',
      'NULL',
      'EMPTY',
      'EMPTY_VALUE',
    ];

    return keywords.includes(word);
  }

  private isFunctionDeclaredInDocument(
    text: string,
    functionName: string
  ): boolean {
    const functionDeclarationPattern = new RegExp(
      `\\b(?:int|double|string|bool|datetime|color|void)\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`,
      'g'
    );

    return functionDeclarationPattern.test(text);
  }
}
