import * as vscode from 'vscode';
import * as dartlib from '../lib/dartlib';

const EVAL_TRUE = 1;
const EVAL_FALSE = 0;
const INVALID_SYNTAX = 6;

class Evaluator {
	static instance: Evaluator;
	_channel: vscode.OutputChannel;

	constructor() {
		if (!Evaluator.instance) {
			this._channel = vscode.window.createOutputChannel("Bitcoin Script");
			Evaluator.instance = this;
		}

		return Evaluator.instance;
	}

	getScriptFromDocument(): string {
		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			throw "No BitcoinScript '.bs' file open";
		}

		let script = editor.document.getText()
			.replace(/[\s]/g, ' ')
			.replace(/[ ]+/g, ' ')
			.trim();

		let { valid, identifier } = dartlib.validateScript(script);
		if (!valid) {
			throw `Unknown undentifier "${identifier}"`;
		}

		return script;
	}

	getScript(): string {
		try {
			let script = this.getScriptFromDocument();
			if (script.replace(/ /g, '') === '') {
				vscode.window.showInformationMessage("Lol, at least write something.");
				return null;
			}

			return script;
		} catch (e) {
			vscode.window.showErrorMessage(String(e));
			return null;
		}
	}

	scriptValidityLine(validity: number, errstr: string) {
		switch (validity) {
			case EVAL_TRUE:
				return 'This script evaluated to TRUE.';
			case EVAL_FALSE:
				return 'This script evaluated to FALSE.';
			case INVALID_SYNTAX:
				return `This is an invalid script. ${errstr}`;
		}
	}

	evaluate() {
		let script = this.getScript();
		if (script === null) {
			return;
		}

		let validity = dartlib.evaluateScript(script, EVAL_TRUE, EVAL_FALSE, INVALID_SYNTAX);
		let message = this.scriptValidityLine(validity, '');

		vscode.window.setStatusBarMessage(message);
	}

	private toHexByte(byte: number): string {
		return `00${(byte & 0xFF).toString(16)}`.slice(-2);
	}

	debug() {
		let script = this.getScript();
		if (script === null) {
			return;
		}

		let {
			validity,
			lastOp,
			errstr,
			stack,
			altStack
		} = dartlib.debugScript(script, EVAL_TRUE, EVAL_FALSE, INVALID_SYNTAX);
		this._channel.clear();
		this._channel.show();

		let hexStack = stack.map(frame => `[${frame.map(this.toHexByte).join('')}]`);
		let hexAltStack = altStack.map(frame => `[${frame.map(this.toHexByte).join('')}]`);

		let stackMsg = `stack [ ${hexStack.join(' , ')} ]`;
		let altStackMsg = `alt-stack [ ${hexAltStack.join(' , ')} ]`;

		this._channel.appendLine('=== Bitcoin Script Run ===');
		this._channel.appendLine(`Last operation ${lastOp}`);
		this._channel.appendLine(stackMsg);
		this._channel.appendLine(altStackMsg);
		this._channel.appendLine(this.scriptValidityLine(validity, errstr))
	}

	trace() {
	}
}



export default [
	{
		command: 'bsl.evaluate',
		method: () => new Evaluator().evaluate(),
	},
	{
		command: 'bsl.debug',
		method: () => new Evaluator().debug(),
	},
	{
		command: 'bsl.trace',
		method: () => new Evaluator().trace(),
	},
];
