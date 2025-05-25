import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('mqlens.mqlens-vscode'));
  });

  test('Extension should activate', async () => {
    const extension = vscode.extensions.getExtension('mqlens.mqlens-vscode');
    if (extension) {
      await extension.activate();
      assert.ok(extension.isActive);
    }
  });

  test('MQL4 language should be registered', async () => {
    const languages = await vscode.languages.getLanguages();
    assert.ok(languages.includes('mql4'));
  });

  test('MQL5 language should be registered', async () => {
    const languages = await vscode.languages.getLanguages();
    assert.ok(languages.includes('mql5'));
  });
});
