import * as vscode from "vscode";

export class MQLDefinitionProvider implements vscode.DefinitionProvider {
    provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return null;
        }

        const word = document.getText(range);

        // Find function definitions
        const functionDefinition = this.findFunctionDefinition(document, word);
        if (functionDefinition) {
            return functionDefinition;
        }

        // Find variable definitions
        const variableDefinition = this.findVariableDefinition(document, word);
        if (variableDefinition) {
            return variableDefinition;
        }

        // Find include file definitions
        const includeDefinition = this.findIncludeDefinition(document, word, position);
        if (includeDefinition) {
            return includeDefinition;
        }

        return null;
    }

    private findFunctionDefinition(document: vscode.TextDocument, functionName: string): vscode.Location | null {
        const text = document.getText();

        // Pattern to match function definitions
        // Matches: return_type function_name(parameters) or void function_name(parameters)
        const functionPattern = new RegExp(
            `\\b(?:int|double|string|bool|datetime|color|void)\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`,
            "gm"
        );

        const match = functionPattern.exec(text);
        if (match) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + functionName.length);
            const range = new vscode.Range(startPos, endPos);
            return new vscode.Location(document.uri, range);
        }

        return null;
    }

    private findVariableDefinition(document: vscode.TextDocument, variableName: string): vscode.Location | null {
        const text = document.getText();

        // Pattern to match variable declarations
        // Matches: type variable_name; or type variable_name = value;
        const variablePatterns = [
            // Global variables (outside functions)
            new RegExp(
                `^\\s*(?:extern\\s+|static\\s+)?(?:int|double|string|bool|datetime|color)\\s+${variableName}\\b`,
                "gm"
            ),
            // Input parameters
            new RegExp(
                `^\\s*(?:input|sinput)\\s+(?:int|double|string|bool|datetime|color)\\s+${variableName}\\b`,
                "gm"
            ),
            // Local variables
            new RegExp(`\\b(?:int|double|string|bool|datetime|color)\\s+${variableName}\\b(?!\\s*\\()`, "gm"),
        ];

        for (const pattern of variablePatterns) {
            const match = pattern.exec(text);
            if (match) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                return new vscode.Location(document.uri, range);
            }
        }

        return null;
    }

    private findIncludeDefinition(
        document: vscode.TextDocument,
        word: string,
        position: vscode.Position
    ): vscode.Location | null {
        const line = document.lineAt(position.line);
        const lineText = line.text;

        // Check if we're on an #include line
        const includeMatch = lineText.match(/#include\s*[<"]([^>"]+)[>"]/i);
        if (includeMatch) {
            const includePath = includeMatch[1];

            // Try to resolve the include file
            const resolvedPath = this.resolveIncludePath(document.uri, includePath);
            if (resolvedPath) {
                return new vscode.Location(resolvedPath, new vscode.Position(0, 0));
            }
        }

        return null;
    }

    private resolveIncludePath(currentFileUri: vscode.Uri, includePath: string): vscode.Uri | null {
        try {
            const currentDir = vscode.Uri.joinPath(currentFileUri, "..");

            // Common include directories for MQL
            const possiblePaths = [
                // Same directory as current file
                vscode.Uri.joinPath(currentDir, includePath),
                // Include directory
                vscode.Uri.joinPath(currentDir, "Include", includePath),
                // MQL4/Include directory
                vscode.Uri.joinPath(currentDir, "..", "Include", includePath),
                // Standard library includes
                vscode.Uri.joinPath(currentDir, "..", "..", "Include", includePath),
            ];

            // For now, return the first possible path
            // In a real implementation, you would check if the file exists
            return possiblePaths[0];
        } catch (error) {
            return null;
        }
    }

    // Additional method to find all references to a symbol
    public findReferences(document: vscode.TextDocument, symbolName: string): vscode.Location[] {
        const text = document.getText();
        const references: vscode.Location[] = [];

        // Find all occurrences of the symbol
        const symbolPattern = new RegExp(`\\b${symbolName}\\b`, "g");
        let match;

        while ((match = symbolPattern.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + symbolName.length);
            const range = new vscode.Range(startPos, endPos);
            references.push(new vscode.Location(document.uri, range));
        }

        return references;
    }

    // Method to find symbol at position for rename operations
    public getSymbolAtPosition(document: vscode.TextDocument, position: vscode.Position): string | null {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return null;
        }

        return document.getText(range);
    }
}
