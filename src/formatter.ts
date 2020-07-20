
import * as vscode from 'vscode';


const TOKENS = {
    EMPTY: "",
    NEWLINE: "\n",
    OP_IF: "OP_IF",
    OP_ELSE: "OP_ELSE",
    OP_ENDIF: "OP_ENDIF"
}

export default class ForamttingEditProvider implements vscode.DocumentFormattingEditProvider {
    private isStringStart(str: string): boolean {
        return str[0] == "'"
    }

    private isStringEnd(str: string): boolean {
        return str[str.length - 1] == "'"
    }

    private isOpenString(str: string): boolean {
        return this.isStringStart(str) && !this.isStringEnd(str)
    }

    private tokenize(line: string): string[] {
        let tokens = line.trim().split(" ");

        return tokens
            .reduce((prev: string[], rawToken: string): string[] => {
                let token = rawToken.trim()
                let last = prev[prev.length - 1]

                if (!token) {
                    return;
                }

                if (prev.length && this.isOpenString(last)) {
                    if (this.isStringEnd(token)) {
                        prev[prev.length - 1] += rawToken.trimRight()
                    } else {
                        prev[prev.length - 1] += rawToken
                    }
                    return prev
                }

                return prev.concat([token])
            }, [])
    }

    private removeNewLines(tokens: string[]): string[] {
        return tokens.filter((token, i, tokens) => {
            if (token == TOKENS.NEWLINE) {
                if ((tokens[i + 1] != TOKENS.NEWLINE) && (tokens[i - 1] == TOKENS.NEWLINE)) {
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
                case TOKENS.EMPTY:
                    indentCount = 0;
                    break;
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

    public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions): vscode.TextEdit[] {
        let tokens = [];
        let lines = document.lineCount;

        for (let i = 0; i < lines; i++) {
            let line = document.lineAt(i);
            tokens = tokens.concat(this.tokenize(line.text), [TOKENS.NEWLINE]);
        }

        let indent = '\t';
        if (options.insertSpaces) {
            indent = ' '.repeat(options.tabSize)
        }

        let indentedTokens = this.indent(
            this.removeNewLines(tokens),
            indent
        );
        let newText = indentedTokens.join('\n');

        let wholeRange = new vscode.Range(
            document.lineAt(0).range.start,
            document.lineAt(lines - 1).range.end,
        );

        return [vscode.TextEdit.replace(wholeRange, newText)]
    }
}

