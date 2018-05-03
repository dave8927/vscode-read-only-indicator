"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode_1 = require("vscode");
const fs = require("fs");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(ctx) {
    // create a new read only indicator
    let readOnlyIndicator = new ReadOnlyIndicator();
    let controller = new ReadOnlyIndicatorController(readOnlyIndicator);
    // add to a list of disposables which are disposed when this extension
    // is deactivated again.
    ctx.subscriptions.push(controller);
    ctx.subscriptions.push(readOnlyIndicator);
    function updateFileAccess(newFileAccess) {
        // Windows only
        if (process.platform !== "darwin") {
            vscode_1.window.showInformationMessage("This command is only supported in MacOS");
            return;
        }
        if (!vscode_1.window.activeTextEditor) {
            vscode_1.window.showInformationMessage("Open a file first to update it attributes");
            return;
        }
        if (vscode_1.window.activeTextEditor.document.uri.scheme === "untitled") {
            vscode_1.window.showInformationMessage("Save the file first to update it attributes");
            return;
        }
        let isReadOnly = readOnlyIndicator.isReadOnly(vscode_1.window.activeTextEditor.document);
        let activeFileAcess = isReadOnly ? "u-w" : "u+w";
        if (newFileAccess === activeFileAcess) {
            let activeFileAcessDescription;
            activeFileAcessDescription = isReadOnly ? "Read-only" : "Writeable";
            vscode_1.window.showInformationMessage("The file is already " + activeFileAcessDescription);
            return;
        }
        const spawn = require("child_process").spawn;
        const ls = spawn("chmod", [newFileAccess, vscode_1.window.activeTextEditor.document.fileName]);
        ls.stdout.on("data", (data) => {
            console.log(`stdout: ${data}`);
        });
        ls.stderr.on("data", (data) => {
            console.log(`stderr: ${data}`);
            vscode_1.window.showErrorMessage(`Some error occured: ${data}`);
        });
        ls.on("close", (code) => {
            console.log(`child process exited with code ${code}`);
            readOnlyIndicator.updateReadOnly();
        });
    }
    function changeFileAccess() {
        let items = [];
        items.push({ label: "File Access: Make Read Only", description: "" });
        items.push({ label: "File Access: Make Writeable", description: "" });
        let options = {
            placeHolder: "Select Action"
        };
        vscode_1.window.showQuickPick(items, options).then(selection => {
            if (typeof selection === "undefined") {
                return;
            }
            if (selection.label === "File Access: Make Read Only") {
                updateFileAccess("+R");
            }
            else {
                updateFileAccess("-R");
            }
        });
    }
    vscode_1.commands.registerCommand("readOnly.makeWriteable", () => {
        updateFileAccess("u+w");
    });
    vscode_1.commands.registerCommand("readOnly.makeReadOnly", () => {
        updateFileAccess("u-w");
    });
    vscode_1.commands.registerCommand("readOnly.changeFileAccess", () => {
        changeFileAccess();
    });
}
exports.activate = activate;
class ReadOnlyIndicator {
    dispose() {
        this.hideReadOnly();
    }
    updateReadOnly() {
        // ui
        let uimodeString = (vscode_1.workspace.getConfiguration("fileAccess").get("uiMode", "complete"));
        let uimode = uimodeString === "complete" ? 0 /* Complete */ : 1 /* Simple */;
        // location
        let locationString = (vscode_1.workspace.getConfiguration("fileAccess").get("position", "left"));
        let location = locationString === "left" ?
            vscode_1.StatusBarAlignment.Left : vscode_1.StatusBarAlignment.Right;
        // Create as needed
        if (!this.statusBarItem) {
            this.statusBarItem = vscode_1.window.createStatusBarItem(location);
            this.statusBarItem.command = "readOnly.changeFileAccess";
        }
        // Get the current text editor
        let editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            this.statusBarItem.hide();
            return;
        }
        let doc = editor.document;
        // Only update status if an MD file
        if (!doc.isUntitled) {
            let readOnly = this.isReadOnly(doc);
            // Update the status bar
            if (uimode === 0 /* Complete */) {
                this.statusBarItem.text = !readOnly ? "$(pencil) [RW]" : "$(circle-slash) [RO]";
            }
            else {
                this.statusBarItem.text = !readOnly ? "RW" : "RO";
            }
            this.statusBarItem.tooltip = !readOnly ? "The file is writeable" : "The file is read only";
            this.statusBarItem.show();
        }
        else {
            this.statusBarItem.hide();
        }
    }
    isReadOnly(doc) {
        let filePath = doc.fileName;
        try {
            fs.accessSync(filePath, fs.constants.W_OK);
            return false;
        }
        catch (error) {
            return true;
        }
    }
    hideReadOnly() {
        if (this.statusBarItem) {
            this.statusBarItem.dispose();
        }
    }
}
exports.ReadOnlyIndicator = ReadOnlyIndicator;
class ReadOnlyIndicatorController {
    constructor(wordCounter) {
        this.readOnlyIndicator = wordCounter;
        this.readOnlyIndicator.updateReadOnly();
        // subscribe to selection change and editor activation events
        let subscriptions = [];
        vscode_1.window.onDidChangeTextEditorSelection(this.onEvent, this, subscriptions);
        vscode_1.window.onDidChangeActiveTextEditor(this.onEvent, this, subscriptions);
        // create a combined disposable from both event subscriptions
        this.disposable = vscode_1.Disposable.from(...subscriptions);
    }
    dispose() {
        this.disposable.dispose();
    }
    onEvent() {
        this.readOnlyIndicator.updateReadOnly();
    }
}
//# sourceMappingURL=extension.js.map