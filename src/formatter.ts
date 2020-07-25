
import * as vscode from 'vscode';
import * as vsctm from 'vscode-textmate';
import * as oniguruma from 'vscode-oniguruma';
import fs from 'promise-fs';

const TOKENS = {
    EMPTY: "",
    NEWLINE: "\n",
    WHITESPACE: " ",
    OP_IF: "OP_IF",
    OP_NOTIF: "OP_NOTIF",
    OP_ELSE: "OP_ELSE",
    OP_ENDIF: "OP_ENDIF",
    OP_PUSHDATA1: "OP_PUSHDATA1",
    OP_PUSHDATA2: "OP_PUSHDATA2",
    OP_PUSHDATA4: "OP_PUSHDATA4",
}

export default class ForamttingEditProvider implements vscode.DocumentFormattingEditProvider {
    private isStringStart(str: string): boolean {
        return str[0] === "'"
    }

    private isStringEnd(str: string): boolean {
        return str[str.length - 1] === "'"
    }

    private isOpenString(str: string): boolean {
        return this.isStringStart(str) && !this.isStringEnd(str)
    }

    private isWhitespace(str: string): boolean {
        return (/\s/g).test(str);
    }

    private isHex(str: string): boolean {
        return (/^[0-9a-fA-F]+$/).test(str);
    }

    private tokenize(line): string[] {
        return line.trim().split('')
            .reduce((tokens: string[], ch: string): string[] => {

                if (tokens.length === 0) {
                    return [ch];
                }

                let last = tokens.pop();

                if (this.isOpenString(last)) {
                    last += ch;
                    tokens.push(last);
                    return tokens;
                }

                if (this.isWhitespace(last)) {
                    if (this.isWhitespace(ch)) {
                        tokens.push(last);
                    } else {
                        tokens.push(last, ch);
                    }
                } else {
                    if (this.isWhitespace(ch)) {
                        tokens.push(last, TOKENS.WHITESPACE);
                    } else {
                        last += ch;
                        tokens.push(last);
                    }
                }

                return tokens;
            }, []);
    }

    private removeNewLines(tokens: string[]): string[] {
        return tokens.filter((token, i, tokens) => {
            if (token === TOKENS.NEWLINE) {
                if ((tokens[i + 1] != TOKENS.NEWLINE) && (tokens[i - 1] === TOKENS.NEWLINE)) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return true;
            }
        });
    }

    private indent(tokens: string[], indent: string): string[] {
        let branches = 0;

        return tokens.map((token: string): string => {
            let indentCount = branches;

            switch (token) {
                case TOKENS.NEWLINE:
                case TOKENS.WHITESPACE:
                    indentCount = 0;
                    break;
                case TOKENS.OP_NOTIF:
                case TOKENS.OP_IF:
                    branches += 1;
                    break;
                case TOKENS.OP_ELSE:
                    if (indentCount > 0) {
                        indentCount -= 1;
                    }
                    break;
                case TOKENS.OP_ENDIF:
                    if (branches > 0) {
                        branches -= 1;
                        indentCount -= 1;
                    }
                    break;
            }


            if (branches > 0) {
                return `${indent.repeat(indentCount)}${token}`;
            } else {
                return token;
            }
        })
    }

    private compile(tokens: string[]): string {
        return tokens.reduce((text: string, token: string): string => {
            switch (token) {
                case TOKENS.NEWLINE:
                    text += '\n'
                    break;
                case TOKENS.WHITESPACE:
                    break;
                default:
                    text += `${token}\n`;
                    break;
            }

            return text;
        }, "").trim();
    }

    public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions): vscode.TextEdit[] {
        let tokens = [];
        let lines = document.lineCount;

        for (let i = 0; i < lines; i++) {
            let line = document.lineAt(i);
            let lineTokens = this.tokenize(line.text);

            if (lineTokens.length === 0) {
                if (tokens.length > 0 && tokens[tokens.length - 1] != TOKENS.NEWLINE) {
                    tokens.push(TOKENS.NEWLINE);
                }
            } else {
                tokens = tokens.concat(lineTokens, []);
            }
        }

        let indent = '\t';
        if (options.insertSpaces) {
            indent = ' '.repeat(options.tabSize)
        }

        tokens = this.indent(tokens, indent);
        let text = this.compile(tokens);


        let wholeRange = new vscode.Range(
            document.lineAt(0).range.start,
            document.lineAt(lines - 1).range.end,
        );

        return [vscode.TextEdit.replace(wholeRange, text)];
    }
}

