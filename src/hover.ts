
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'promise-fs';

interface IDefinition {
    token: string,
    dec: string,
    hex: string,
    description: string,
    input?: string,
    output?: string,
    disabled?: boolean,
}

const DEC_REPLACE_REGEX = /\\\[\\\[dec\\\]\\\]/g;
const OUTPUT_REPLACE_REGEX = /\\\[\\\[output\\\]\\\]/g;

export default class HoverProvider implements vscode.HoverProvider {
    _opcodeMap: Record<string, vscode.MarkdownString[]>;

    constructor(defLocation: string) {
        this._opcodeMap = {};

        fs.readFile(defLocation, 'utf8')
            .then(contents => {
                let doc = yaml.safeLoad(contents);

                doc.forEach(def => this.addDefinition(def));
            });
    }

    private replacePlacholders(input: string, dec: string, output: string): string {
        return input.replace(OUTPUT_REPLACE_REGEX, output)
            .replace(DEC_REPLACE_REGEX, dec);
    }

    private addDefinition(def: IDefinition) {
        let tokens = def.token.split('|');
        let decs = def.dec.split('|');
        let hexs = def.hex.split('|');

        let outputs = [""];
        
        if (def.output) {
            outputs = def.output.split('|');
        }

        let len = tokens.length;

        if ((hexs.length != len)
            || (decs.length != len)
            || (outputs.length != len && (outputs.length != 1))) {
            throw new Error("Invalid definitions file!");
        }

        if (outputs.length != len) {
            outputs = new Array(len).fill(outputs[0]);
        }

        for (let i = 0; i < len; i++) {
            let token = tokens[i];
            let dec = decs[i];
            let hex = hexs[i];
            let output = outputs[i];

            let card = [
                this.makeHeader(token),
                this.makeRawValues(dec, hex),
            ];

            if (def.input && def.output) {
                card.push(this.makeInputOutput(def.input, output, dec));
            }

            card.push(this.makeDescription(def.description, dec, output));

            if (def.disabled) {
                card.push(this.makeDisabled());
            }

            this._opcodeMap[token] = card;
        }
    }

    private makeHeader(token: string): vscode.MarkdownString {
        let header = new vscode.MarkdownString("");
        header.appendCodeblock(token, 'bitcoinscript');

        return header;
    }

    private makeDescription(description: string, dec: string, output: string): vscode.MarkdownString {
        let desc = new vscode.MarkdownString(
            this.replacePlacholders(description, dec, output)
        );

        desc.appendMarkdown('\n\n[Visit Wiki](https://wiki.bitcoinsv.io/index.php/Opcodes_used_in_Bitcoin_Script)');

        return desc;
    }

    private makeRawValues(dec: string, hex: string): vscode.MarkdownString {
        return new vscode.MarkdownString(`Raw \`${dec}\` \`0x${hex}\``);
    }

    private makeInputOutput(input: string, output: string, dec: string): vscode.MarkdownString {
        let inp = this.replacePlacholders(input, dec, output);
        let out = this.replacePlacholders(output, dec, output);

        return new vscode.MarkdownString(`input **${inp}**\n\noutput **${out}**`);
    }

    private makeDisabled(): vscode.MarkdownString {
        return new vscode.MarkdownString('**DISABLED in Bitcoin SV**')
    }

    provideHover(document: vscode.TextDocument, position: vscode.Position, cancelToken: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        let word = document.getWordRangeAtPosition(position);
        let token = document.getText(word);

        let card = this._opcodeMap[token];
        if (!card) {
            return null;
        }

        return new vscode.Hover(card);
    }
}
