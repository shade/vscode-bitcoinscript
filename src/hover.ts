
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'promise-fs';

interface IDefinition {
    opcode: string,
    dec: string,
    hex: string,
    description: string,
    input?: string,
    output?: string,
    disabled?: boolean,
}

export default class HoverProvider implements vscode.HoverProvider {
    _opcodeMap: Record<string, IDefinition>;

    constructor(defLocation: string) {
        this._opcodeMap = {};

        fs.readFile(defLocation, 'utf8')
            .then(contents => {
                let doc = yaml.safeLoad(contents)
                doc.forEach((def: IDefinition) => {
                    def.opcode.split('|')
                        .forEach(opcode => {
                            this._opcodeMap[opcode] = def
                        })
                })
            });
    }

    provideHover(document: vscode.TextDocument, position: vscode.Position, cancelToken: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        let word = document.getWordRangeAtPosition(position);
        let token = document.getText(word);

        let definition = this._opcodeMap[token];
        if (!definition) {
            return null;
        }

        let { description, hex, dec, input, output, disabled } = definition;

        let header = new vscode.MarkdownString("");
        header.appendCodeblock(token, 'bitcoinscript');

        let body = new vscode.MarkdownString(description);
        body.appendMarkdown('\n\n[Visit Wiki](https://wiki.bitcoinsv.io/index.php/Opcodes_used_in_Bitcoin_Script)');

        let msg = [
            header,
            new vscode.MarkdownString(`Raw \`${dec}\` \`${hex}\``),
        ];

        if (input && output) {
            msg.push(new vscode.MarkdownString(`input **${input}**\n\noutput **${output}**`));
        }
        msg.push(body)
        if (disabled) {
            msg.push(new vscode.MarkdownString('### DISABLED in Bitcoin SV'))
        }

        return new vscode.Hover(msg);
    }
}
