
import * as vscode from 'vscode';
import { MODE } from './mode';
import ForamttingEditProvider from './formatter';
import HoverProvider from './hover';

const DEFINITIONS_FILE = '/definitions/bitcoinscript.yaml';

export function activate(context: vscode.ExtensionContext) {
    let defPath = `${context.extensionPath}${DEFINITIONS_FILE}`;

    context.subscriptions.push(
        vscode.languages.registerHoverProvider(MODE, new HoverProvider(defPath)),
        vscode.languages.registerDocumentFormattingEditProvider(MODE, new ForamttingEditProvider())
    );
}
