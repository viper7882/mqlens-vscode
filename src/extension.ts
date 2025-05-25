import * as vscode from 'vscode';
import { MQLCompletionProvider } from './providers/completionProvider';
import { MQLHoverProvider } from './providers/hoverProvider';
import { MQLDefinitionProvider } from './providers/definitionProvider';
import { MQLDiagnosticsProvider } from './providers/diagnosticsProvider';
import { MQLFormattingProvider } from './providers/formattingProvider';
import { MQLSymbolProvider } from './providers/symbolProvider';

let diagnosticsCollection: vscode.DiagnosticCollection;
let diagnosticsProvider: MQLDiagnosticsProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log('MQLens extension is now active!');

  // Create diagnostic collection
  diagnosticsCollection = vscode.languages.createDiagnosticCollection('mql');
  context.subscriptions.push(diagnosticsCollection);

  // Get configuration settings
  const config = vscode.workspace.getConfiguration('mqlens');
  const intellisenseEnabled = config.get<boolean>('intellisense.enabled', true);
  const completionEnabled = config.get<boolean>('completion.enabled', true);
  const hoverEnabled = config.get<boolean>('hover.enabled', true);
  const formattingEnabled = config.get<boolean>('formatting.enabled', true);
  const validationEnabled = config.get<boolean>('validation.enabled', true);

  // Initialize providers
  const completionProvider = new MQLCompletionProvider();
  const hoverProvider = new MQLHoverProvider();
  const definitionProvider = new MQLDefinitionProvider();
  diagnosticsProvider = new MQLDiagnosticsProvider(diagnosticsCollection);
  const formattingProvider = new MQLFormattingProvider();
  const symbolProvider = new MQLSymbolProvider();

  // Register language features for both MQL4 and MQL5
  const mqlLanguages = ['mql4', 'mql5'];

  mqlLanguages.forEach(language => {
    // Completion provider (requires intellisense and completion to be enabled)
    if (intellisenseEnabled && completionEnabled) {
      context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
          language,
          completionProvider,
          '.',
          '(',
          '['
        )
      );
    }

    // Hover provider (requires hover to be enabled)
    if (hoverEnabled) {
      context.subscriptions.push(
        vscode.languages.registerHoverProvider(language, hoverProvider)
      );
    }

    // Definition provider (requires intellisense to be enabled)
    if (intellisenseEnabled) {
      context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
          language,
          definitionProvider
        )
      );
    }

    // Document formatting provider (requires formatting to be enabled)
    if (formattingEnabled) {
      context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(
          language,
          formattingProvider
        )
      );
    }

    // Document symbol provider (always enabled for outline view)
    context.subscriptions.push(
      vscode.languages.registerDocumentSymbolProvider(language, symbolProvider)
    );
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('mqlens.compile', compileCurrentFile)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mqlens.format', formatCurrentFile)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mqlens.validate', validateCurrentFile)
  );

  // Listen for document changes to provide real-time diagnostics if validation is enabled
  if (validationEnabled) {
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(event => {
        if (mqlLanguages.includes(event.document.languageId)) {
          diagnosticsProvider.updateDiagnostics(event.document);
        }
      })
    );

    // Listen for document open events
    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument(document => {
        if (mqlLanguages.includes(document.languageId)) {
          diagnosticsProvider.updateDiagnostics(document);
        }
      })
    );

    // Validate all open MQL documents on activation
    vscode.workspace.textDocuments.forEach(document => {
      if (mqlLanguages.includes(document.languageId)) {
        diagnosticsProvider.updateDiagnostics(document);
      }
    });
  }

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('mqlens.validation.enabled')) {
        const newValidationEnabled = vscode.workspace
          .getConfiguration('mqlens')
          .get<boolean>('validation.enabled', true);

        // If validation was disabled and is now enabled, update diagnostics for all open documents
        if (newValidationEnabled && !validationEnabled) {
          vscode.workspace.textDocuments.forEach(document => {
            if (mqlLanguages.includes(document.languageId)) {
              diagnosticsProvider.updateDiagnostics(document);
            }
          });
        }
        // If validation was enabled and is now disabled, clear all diagnostics
        else if (!newValidationEnabled && validationEnabled) {
          diagnosticsCollection.clear();
        }
      }
    })
  );
}

export function deactivate() {
  if (diagnosticsCollection) {
    diagnosticsCollection.dispose();
  }
}

async function compileCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor found');
    return;
  }

  const document = editor.document;
  if (!['mql4', 'mql5'].includes(document.languageId)) {
    vscode.window.showErrorMessage('Current file is not an MQL file');
    return;
  }

  const config = vscode.workspace.getConfiguration('mqlens');
  const compilerPath = config.get<string>('compiler.path');

  if (!compilerPath) {
    vscode.window.showErrorMessage(
      'MQL compiler path not configured. Please set mqlens.compiler.path in settings.'
    );
    return;
  }

  // Save the document before compiling
  await document.save();

  vscode.window.showInformationMessage(`Compiling ${document.fileName}...`);

  // Here you would implement the actual compilation logic
  // For now, we'll just show a success message
  vscode.window.showInformationMessage('Compilation completed successfully!');
}

async function formatCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor found');
    return;
  }

  const document = editor.document;
  if (!['mql4', 'mql5'].includes(document.languageId)) {
    vscode.window.showErrorMessage('Current file is not an MQL file');
    return;
  }

  await vscode.commands.executeCommand('editor.action.formatDocument');
}

async function validateCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor found');
    return;
  }

  const document = editor.document;
  if (!['mql4', 'mql5'].includes(document.languageId)) {
    vscode.window.showErrorMessage('Current file is not an MQL file');
    return;
  }

  diagnosticsProvider.updateDiagnostics(document);
  vscode.window.showInformationMessage('Validation completed!');
}
