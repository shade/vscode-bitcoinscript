
import * as vscode from 'vscode';
import { MODE } from './mode';
import ForamttingEditProvider from './formatter';

export function activate(context: vscode.ExtensionContext) {
    vscode.languages.registerDocumentFormattingEditProvider(MODE, new ForamttingEditProvider());
}

