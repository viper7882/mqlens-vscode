import * as vscode from 'vscode';

export class MQLFormattingProvider
  implements vscode.DocumentFormattingEditProvider
{
  private indentSize: number;
  private insertSpaces: boolean;

  constructor() {
    // Get formatting settings from configuration
    const config = vscode.workspace.getConfiguration('mqlens');
    this.indentSize = config.get('formatting.indentSize', 4);
    this.insertSpaces = config.get('formatting.insertSpaces', true);

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('mqlens.formatting.indentSize')) {
        this.indentSize = vscode.workspace
          .getConfiguration('mqlens')
          .get('formatting.indentSize', 4);
      }
      if (e.affectsConfiguration('mqlens.formatting.insertSpaces')) {
        this.insertSpaces = vscode.workspace
          .getConfiguration('mqlens')
          .get('formatting.insertSpaces', true);
      }
    });
  }

  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    const edits: vscode.TextEdit[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    // Override options with our configuration settings
    const formattingOptions = {
      tabSize: this.indentSize,
      insertSpaces: this.insertSpaces,
    };

    const formattedLines = this.formatLines(lines, formattingOptions);
    const formattedText = formattedLines.join('\n');

    if (formattedText !== text) {
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
      );
      edits.push(vscode.TextEdit.replace(fullRange, formattedText));
    }

    return edits;
  }

  private formatLines(
    lines: string[],
    options: vscode.FormattingOptions
  ): string[] {
    const formattedLines: string[] = [];
    let indentLevel = 0;
    let inMultiLineComment = false;
    let inPreprocessorBlock = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const originalLine = line;
      const trimmedLine = line.trim();

      // Handle multi-line comments
      if (trimmedLine.includes('/*')) {
        inMultiLineComment = true;
      }
      if (trimmedLine.includes('*/')) {
        inMultiLineComment = false;
      }

      // Handle preprocessor directives
      if (trimmedLine.startsWith('#')) {
        inPreprocessorBlock = true;
        formattedLines.push(trimmedLine);
        continue;
      } else if (inPreprocessorBlock && !trimmedLine.startsWith('#')) {
        inPreprocessorBlock = false;
      }

      // Skip formatting for comments and empty lines
      if (
        inMultiLineComment ||
        trimmedLine.startsWith('//') ||
        trimmedLine === ''
      ) {
        formattedLines.push(originalLine);
        continue;
      }

      // Adjust indentation for closing braces
      if (trimmedLine.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Format the line
      line = this.formatLine(trimmedLine, indentLevel, options);
      formattedLines.push(line);

      // Adjust indentation for opening braces
      if (trimmedLine.endsWith('{') || trimmedLine.includes('{')) {
        indentLevel++;
      }

      // Handle case and default labels
      if (
        trimmedLine.startsWith('case ') ||
        trimmedLine.startsWith('default:')
      ) {
        // Next line should be indented more
        if (
          i + 1 < lines.length &&
          !lines[i + 1].trim().startsWith('case ') &&
          !lines[i + 1].trim().startsWith('default:')
        ) {
          // Temporarily increase indent for the next statement
        }
      }
    }

    return formattedLines;
  }

  private formatLine(
    line: string,
    indentLevel: number,
    options: vscode.FormattingOptions
  ): string {
    if (line === '') {
      return '';
    }

    // Create indentation
    const indent = this.createIndent(indentLevel, options);

    // Format operators and keywords
    line = this.formatOperators(line);
    line = this.formatKeywords(line);
    line = this.formatFunctionCalls(line);
    line = this.formatControlStructures(line);

    return indent + line;
  }

  private createIndent(
    level: number,
    options: vscode.FormattingOptions
  ): string {
    if (options.insertSpaces) {
      return ' '.repeat(level * options.tabSize);
    } else {
      return '\t'.repeat(level);
    }
  }

  private formatOperators(line: string): string {
    // Add spaces around operators
    line = line.replace(/([^=!<>])=([^=])/g, '$1 = $2');
    line = line.replace(/([^=!<>])==([^=])/g, '$1 == $2');
    line = line.replace(/([^=!<>])!=([^=])/g, '$1 != $2');
    line = line.replace(/([^<])<=([^=])/g, '$1 <= $2');
    line = line.replace(/([^>])>=([^=])/g, '$1 >= $2');
    line = line.replace(/([^<>])<([^<=])/g, '$1 < $2');
    line = line.replace(/([^<>])>([^>=])/g, '$1 > $2');
    line = line.replace(/([^+])\+([^+=])/g, '$1 + $2');
    line = line.replace(/([^-])-([^-=])/g, '$1 - $2');
    line = line.replace(/([^*])\*([^*=])/g, '$1 * $2');
    line = line.replace(/([^/])\/([^/=])/g, '$1 / $2');
    line = line.replace(/([^%])%([^=])/g, '$1 % $2');
    line = line.replace(/([^&])&&([^&])/g, '$1 && $2');
    line = line.replace(/([^|])\|\|([^|])/g, '$1 || $2');

    // Fix multiple spaces
    line = line.replace(/\s+/g, ' ');

    return line;
  }

  private formatKeywords(line: string): string {
    // Ensure space after keywords
    const keywords = [
      'if',
      'else',
      'for',
      'while',
      'do',
      'switch',
      'case',
      'return',
    ];

    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\(`, 'g');
      line = line.replace(regex, `${keyword} (`);
    });

    return line;
  }

  private formatFunctionCalls(line: string): string {
    // Format function calls - ensure no space before parentheses for function calls
    // but space after commas in parameter lists
    line = line.replace(/,([^\s])/g, ', $1');

    // Remove extra spaces before parentheses in function calls
    line = line.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s+\(/g, '$1(');

    return line;
  }

  private formatControlStructures(line: string): string {
    // Format control structures
    line = line.replace(/}\s*else\s*{/g, '} else {');
    line = line.replace(/}\s*else\s+if\s*\(/g, '} else if (');

    // Ensure space before opening brace
    line = line.replace(/([^\s]){/g, '$1 {');

    return line;
  }

  // Additional method for range formatting
  provideDocumentRangeFormattingEdits(
    document: vscode.TextDocument,
    range: vscode.Range,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    const edits: vscode.TextEdit[] = [];
    const text = document.getText(range);
    const lines = text.split('\n');

    // Get the indentation level of the first line
    const firstLine = document.lineAt(range.start.line);
    const firstLineText = firstLine.text;
    const leadingWhitespace = firstLineText.match(/^\s*/);
    const baseIndentLevel = leadingWhitespace
      ? this.calculateIndentLevel(leadingWhitespace[0], options)
      : 0;

    const formattedLines = this.formatLinesInRange(
      lines,
      baseIndentLevel,
      options
    );
    const formattedText = formattedLines.join('\n');

    if (formattedText !== text) {
      edits.push(vscode.TextEdit.replace(range, formattedText));
    }

    return edits;
  }

  private formatLinesInRange(
    lines: string[],
    baseIndentLevel: number,
    options: vscode.FormattingOptions
  ): string[] {
    const formattedLines: string[] = [];
    let relativeIndentLevel = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (
        trimmedLine === '' ||
        trimmedLine.startsWith('//') ||
        trimmedLine.startsWith('/*')
      ) {
        formattedLines.push(line);
        continue;
      }

      // Adjust indentation for closing braces
      if (trimmedLine.startsWith('}')) {
        relativeIndentLevel = Math.max(0, relativeIndentLevel - 1);
      }

      // Format the line
      const totalIndentLevel = baseIndentLevel + relativeIndentLevel;
      const formattedLine = this.formatLine(
        trimmedLine,
        totalIndentLevel,
        options
      );
      formattedLines.push(formattedLine);

      // Adjust indentation for opening braces
      if (trimmedLine.endsWith('{') || trimmedLine.includes('{')) {
        relativeIndentLevel++;
      }
    }

    return formattedLines;
  }

  private calculateIndentLevel(
    whitespace: string,
    options: vscode.FormattingOptions
  ): number {
    if (options.insertSpaces) {
      return Math.floor(whitespace.length / options.tabSize);
    } else {
      return whitespace.split('\t').length - 1;
    }
  }

  // Method for on-type formatting
  provideOnTypeFormattingEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    ch: string,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    const edits: vscode.TextEdit[] = [];

    if (ch === '}') {
      // Auto-indent closing brace
      const line = document.lineAt(position.line);
      const lineText = line.text;
      const beforeCursor = lineText.substring(0, position.character);

      if (beforeCursor.trim() === '}') {
        // Find matching opening brace to determine correct indentation
        const correctIndent = this.findMatchingBraceIndent(document, position);
        if (correctIndent !== null) {
          const currentIndent = beforeCursor.length - 1; // -1 for the }
          const newIndent = this.createIndent(correctIndent, options);

          const range = new vscode.Range(
            new vscode.Position(position.line, 0),
            new vscode.Position(position.line, currentIndent)
          );

          edits.push(vscode.TextEdit.replace(range, newIndent));
        }
      }
    } else if (ch === ';') {
      // Format the current line when semicolon is typed
      const line = document.lineAt(position.line);
      const lineText = line.text;
      const trimmedLine = lineText.trim();

      if (trimmedLine.endsWith(';')) {
        const currentIndent = this.calculateIndentLevel(
          lineText.substring(0, lineText.indexOf(trimmedLine)),
          options
        );
        const formattedLine = this.formatLine(
          trimmedLine,
          currentIndent,
          options
        );

        if (formattedLine !== lineText) {
          const range = new vscode.Range(
            new vscode.Position(position.line, 0),
            new vscode.Position(position.line, lineText.length)
          );

          edits.push(vscode.TextEdit.replace(range, formattedLine));
        }
      }
    }

    return edits;
  }

  private findMatchingBraceIndent(
    document: vscode.TextDocument,
    position: vscode.Position
  ): number | null {
    let braceCount = 1;
    let currentLine = position.line - 1;

    while (currentLine >= 0 && braceCount > 0) {
      const line = document.lineAt(currentLine);
      const lineText = line.text;

      for (let i = lineText.length - 1; i >= 0; i--) {
        const char = lineText[i];
        if (char === '}') {
          braceCount++;
        } else if (char === '{') {
          braceCount--;
          if (braceCount === 0) {
            // Found matching opening brace
            const leadingWhitespace = lineText.match(/^\s*/);
            if (leadingWhitespace) {
              return this.calculateIndentLevel(leadingWhitespace[0], {
                insertSpaces: true,
                tabSize: 4,
              });
            }
            return 0;
          }
        }
      }

      currentLine--;
    }

    return null;
  }
}
