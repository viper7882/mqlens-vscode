import * as vscode from "vscode";

export class MQLSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
        const symbols: vscode.DocumentSymbol[] = [];
        const text = document.getText();
        const lines = text.split("\n");

        // Find functions
        this.findFunctions(lines, symbols);

        // Find variables
        this.findVariables(lines, symbols);

        // Find constants
        this.findConstants(lines, symbols);

        // Find enums
        this.findEnums(lines, symbols);

        // Find structs/classes
        this.findStructsAndClasses(lines, symbols);

        // Find preprocessor definitions
        this.findPreprocessorDefinitions(lines, symbols);

        return symbols;
    }

    private findFunctions(lines: string[], symbols: vscode.DocumentSymbol[]): void {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Skip comments and empty lines
            if (trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || trimmedLine === "") {
                continue;
            }

            // Match function declarations
            const functionMatch = trimmedLine.match(
                /^(int|double|string|bool|datetime|color|void)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*\{?/
            );

            if (functionMatch) {
                const returnType = functionMatch[1];
                const functionName = functionMatch[2];
                const parameters = functionMatch[3];

                // Find the end of the function
                const functionEnd = this.findFunctionEnd(lines, i);

                const startPos = new vscode.Position(i, line.indexOf(functionName));
                const endPos = new vscode.Position(functionEnd, lines[functionEnd].length);
                const range = new vscode.Range(startPos, endPos);
                const selectionRange = new vscode.Range(
                    startPos,
                    new vscode.Position(i, line.indexOf(functionName) + functionName.length)
                );

                const symbol = new vscode.DocumentSymbol(
                    functionName,
                    `${returnType} ${functionName}(${parameters})`,
                    vscode.SymbolKind.Function,
                    range,
                    selectionRange
                );

                // Find parameters and local variables within the function
                this.findFunctionParameters(parameters, symbol);
                this.findLocalVariables(lines, i, functionEnd, symbol);

                symbols.push(symbol);
            }
        }
    }

    private findVariables(lines: string[], symbols: vscode.DocumentSymbol[]): void {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Skip comments, empty lines, and function declarations
            if (
                trimmedLine.startsWith("//") ||
                trimmedLine.startsWith("/*") ||
                trimmedLine === "" ||
                trimmedLine.match(/^(int|double|string|bool|datetime|color|void)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/)
            ) {
                continue;
            }

            // Match global variable declarations
            const variableMatches = trimmedLine.matchAll(
                /\b(extern\s+|static\s+|input\s+|sinput\s+)?(int|double|string|bool|datetime|color)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g
            );

            for (const match of variableMatches) {
                const modifier = match[1] ? match[1].trim() : "";
                const type = match[2];
                const variableName = match[3];

                const startPos = new vscode.Position(i, line.indexOf(variableName));
                const endPos = new vscode.Position(i, line.indexOf(variableName) + variableName.length);
                const range = new vscode.Range(startPos, endPos);

                let symbolKind = vscode.SymbolKind.Variable;
                if (modifier === "input" || modifier === "sinput") {
                    symbolKind = vscode.SymbolKind.Property;
                } else if (modifier === "extern") {
                    symbolKind = vscode.SymbolKind.Constant;
                }

                const symbol = new vscode.DocumentSymbol(
                    variableName,
                    `${modifier} ${type} ${variableName}`.trim(),
                    symbolKind,
                    range,
                    range
                );

                symbols.push(symbol);
            }
        }
    }

    private findConstants(lines: string[], symbols: vscode.DocumentSymbol[]): void {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Match #define constants
            const defineMatch = trimmedLine.match(/^#define\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(.*)/);
            if (defineMatch) {
                const constantName = defineMatch[1];
                const constantValue = defineMatch[2];

                const startPos = new vscode.Position(i, line.indexOf(constantName));
                const endPos = new vscode.Position(i, line.indexOf(constantName) + constantName.length);
                const range = new vscode.Range(startPos, endPos);

                const symbol = new vscode.DocumentSymbol(
                    constantName,
                    `#define ${constantName} ${constantValue}`,
                    vscode.SymbolKind.Constant,
                    range,
                    range
                );

                symbols.push(symbol);
            }

            // Match const variables
            const constMatch = trimmedLine.match(
                /\bconst\s+(int|double|string|bool|datetime|color)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/
            );
            if (constMatch) {
                const type = constMatch[1];
                const constantName = constMatch[2];

                const startPos = new vscode.Position(i, line.indexOf(constantName));
                const endPos = new vscode.Position(i, line.indexOf(constantName) + constantName.length);
                const range = new vscode.Range(startPos, endPos);

                const symbol = new vscode.DocumentSymbol(
                    constantName,
                    `const ${type} ${constantName}`,
                    vscode.SymbolKind.Constant,
                    range,
                    range
                );

                symbols.push(symbol);
            }
        }
    }

    private findEnums(lines: string[], symbols: vscode.DocumentSymbol[]): void {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Match enum declarations
            const enumMatch = trimmedLine.match(/^enum\s+([a-zA-Z_][a-zA-Z0-9_]*)?\s*\{?/);
            if (enumMatch) {
                const enumName = enumMatch[1] || "Anonymous";

                // Find the end of the enum
                const enumEnd = this.findBlockEnd(lines, i, "{", "}");

                const startPos = new vscode.Position(i, line.indexOf("enum"));
                const endPos = new vscode.Position(enumEnd, lines[enumEnd].length);
                const range = new vscode.Range(startPos, endPos);
                const selectionRange = new vscode.Range(
                    new vscode.Position(i, line.indexOf(enumName)),
                    new vscode.Position(i, line.indexOf(enumName) + enumName.length)
                );

                const symbol = new vscode.DocumentSymbol(
                    enumName,
                    `enum ${enumName}`,
                    vscode.SymbolKind.Enum,
                    range,
                    selectionRange
                );

                // Find enum members
                this.findEnumMembers(lines, i, enumEnd, symbol);

                symbols.push(symbol);
            }
        }
    }

    private findStructsAndClasses(lines: string[], symbols: vscode.DocumentSymbol[]): void {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Match struct/class declarations
            const structMatch = trimmedLine.match(/^(struct|class)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{?/);
            if (structMatch) {
                const type = structMatch[1];
                const name = structMatch[2];

                // Find the end of the struct/class
                const blockEnd = this.findBlockEnd(lines, i, "{", "}");

                const startPos = new vscode.Position(i, line.indexOf(type));
                const endPos = new vscode.Position(blockEnd, lines[blockEnd].length);
                const range = new vscode.Range(startPos, endPos);
                const selectionRange = new vscode.Range(
                    new vscode.Position(i, line.indexOf(name)),
                    new vscode.Position(i, line.indexOf(name) + name.length)
                );

                const symbolKind = type === "class" ? vscode.SymbolKind.Class : vscode.SymbolKind.Struct;
                const symbol = new vscode.DocumentSymbol(name, `${type} ${name}`, symbolKind, range, selectionRange);

                // Find struct/class members
                this.findStructMembers(lines, i, blockEnd, symbol);

                symbols.push(symbol);
            }
        }
    }

    private findPreprocessorDefinitions(lines: string[], symbols: vscode.DocumentSymbol[]): void {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Match #property directives
            const propertyMatch = trimmedLine.match(/^#property\s+(\w+)\s+(.*)/);
            if (propertyMatch) {
                const propertyName = propertyMatch[1];
                const propertyValue = propertyMatch[2];

                const startPos = new vscode.Position(i, 0);
                const endPos = new vscode.Position(i, line.length);
                const range = new vscode.Range(startPos, endPos);

                const symbol = new vscode.DocumentSymbol(
                    propertyName,
                    `#property ${propertyName} ${propertyValue}`,
                    vscode.SymbolKind.Property,
                    range,
                    range
                );

                symbols.push(symbol);
            }

            // Match #include directives
            const includeMatch = trimmedLine.match(/^#include\s*[<"]([^>"]+)[>"]/);
            if (includeMatch) {
                const includePath = includeMatch[1];

                const startPos = new vscode.Position(i, 0);
                const endPos = new vscode.Position(i, line.length);
                const range = new vscode.Range(startPos, endPos);

                const symbol = new vscode.DocumentSymbol(
                    includePath,
                    `#include "${includePath}"`,
                    vscode.SymbolKind.Module,
                    range,
                    range
                );

                symbols.push(symbol);
            }
        }
    }

    private findFunctionEnd(lines: string[], startLine: number): number {
        let braceCount = 0;
        let foundOpenBrace = false;

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];

            for (const char of line) {
                if (char === "{") {
                    braceCount++;
                    foundOpenBrace = true;
                } else if (char === "}") {
                    braceCount--;
                    if (foundOpenBrace && braceCount === 0) {
                        return i;
                    }
                }
            }
        }

        return startLine;
    }

    private findBlockEnd(lines: string[], startLine: number, openChar: string, closeChar: string): number {
        let count = 0;
        let foundOpen = false;

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];

            for (const char of line) {
                if (char === openChar) {
                    count++;
                    foundOpen = true;
                } else if (char === closeChar) {
                    count--;
                    if (foundOpen && count === 0) {
                        return i;
                    }
                }
            }
        }

        return startLine;
    }

    private findFunctionParameters(parameters: string, parentSymbol: vscode.DocumentSymbol): void {
        if (!parameters.trim()) {
            return;
        }

        const params = parameters.split(",");
        for (const param of params) {
            const trimmedParam = param.trim();
            const paramMatch = trimmedParam.match(
                /\b(int|double|string|bool|datetime|color)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/
            );

            if (paramMatch) {
                const type = paramMatch[1];
                const paramName = paramMatch[2];

                // Create a dummy range for parameters
                const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));

                const paramSymbol = new vscode.DocumentSymbol(
                    paramName,
                    `${type} ${paramName}`,
                    vscode.SymbolKind.Variable,
                    range,
                    range
                );

                parentSymbol.children.push(paramSymbol);
            }
        }
    }

    private findLocalVariables(
        lines: string[],
        startLine: number,
        endLine: number,
        parentSymbol: vscode.DocumentSymbol
    ): void {
        for (let i = startLine + 1; i < endLine; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Skip comments and empty lines
            if (trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || trimmedLine === "") {
                continue;
            }

            // Match local variable declarations
            const variableMatches = trimmedLine.matchAll(
                /\b(int|double|string|bool|datetime|color)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g
            );

            for (const match of variableMatches) {
                const type = match[1];
                const variableName = match[2];

                const startPos = new vscode.Position(i, line.indexOf(variableName));
                const endPos = new vscode.Position(i, line.indexOf(variableName) + variableName.length);
                const range = new vscode.Range(startPos, endPos);

                const symbol = new vscode.DocumentSymbol(
                    variableName,
                    `${type} ${variableName}`,
                    vscode.SymbolKind.Variable,
                    range,
                    range
                );

                parentSymbol.children.push(symbol);
            }
        }
    }

    private findEnumMembers(
        lines: string[],
        startLine: number,
        endLine: number,
        parentSymbol: vscode.DocumentSymbol
    ): void {
        for (let i = startLine + 1; i < endLine; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Skip comments and empty lines
            if (
                trimmedLine.startsWith("//") ||
                trimmedLine.startsWith("/*") ||
                trimmedLine === "" ||
                trimmedLine === "}"
            ) {
                continue;
            }

            // Match enum members
            const memberMatch = trimmedLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(=\s*[^,}]+)?[,}]?/);
            if (memberMatch) {
                const memberName = memberMatch[1];
                const memberValue = memberMatch[2] || "";

                const startPos = new vscode.Position(i, line.indexOf(memberName));
                const endPos = new vscode.Position(i, line.indexOf(memberName) + memberName.length);
                const range = new vscode.Range(startPos, endPos);

                const symbol = new vscode.DocumentSymbol(
                    memberName,
                    `${memberName}${memberValue}`,
                    vscode.SymbolKind.EnumMember,
                    range,
                    range
                );

                parentSymbol.children.push(symbol);
            }
        }
    }

    private findStructMembers(
        lines: string[],
        startLine: number,
        endLine: number,
        parentSymbol: vscode.DocumentSymbol
    ): void {
        for (let i = startLine + 1; i < endLine; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Skip comments and empty lines
            if (trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || trimmedLine === "") {
                continue;
            }

            // Match member variables
            const memberMatches = trimmedLine.matchAll(
                /\b(public|private|protected)?\s*(int|double|string|bool|datetime|color)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g
            );

            for (const match of memberMatches) {
                const access = match[1] || "public";
                const type = match[2];
                const memberName = match[3];

                const startPos = new vscode.Position(i, line.indexOf(memberName));
                const endPos = new vscode.Position(i, line.indexOf(memberName) + memberName.length);
                const range = new vscode.Range(startPos, endPos);

                const symbol = new vscode.DocumentSymbol(
                    memberName,
                    `${access} ${type} ${memberName}`,
                    vscode.SymbolKind.Field,
                    range,
                    range
                );

                parentSymbol.children.push(symbol);
            }

            // Match member functions
            const functionMatch = trimmedLine.match(
                /^(public|private|protected)?\s*(int|double|string|bool|datetime|color|void)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/
            );
            if (functionMatch) {
                const access = functionMatch[1] || "public";
                const returnType = functionMatch[2];
                const functionName = functionMatch[3];
                const parameters = functionMatch[4];

                const functionEnd = this.findFunctionEnd(lines, i);

                const startPos = new vscode.Position(i, line.indexOf(functionName));
                const endPos = new vscode.Position(functionEnd, lines[functionEnd].length);
                const range = new vscode.Range(startPos, endPos);
                const selectionRange = new vscode.Range(
                    startPos,
                    new vscode.Position(i, line.indexOf(functionName) + functionName.length)
                );

                const symbol = new vscode.DocumentSymbol(
                    functionName,
                    `${access} ${returnType} ${functionName}(${parameters})`,
                    vscode.SymbolKind.Method,
                    range,
                    selectionRange
                );

                parentSymbol.children.push(symbol);
            }
        }
    }
}
