import * as vscode from 'vscode';

const extPrefix = 'codeTimeTracker';

interface TimeTrackingData {
  [languageId: string]: number;
}

let startTime: Date | null = null;
let currentFileExt: string | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;
let timeTrackingData: TimeTrackingData = {};

export function activate(context: vscode.ExtensionContext) {
  timeTrackingData = context.globalState.get<TimeTrackingData>(`${extPrefix}.timeTrackingData`, {});
  currentFileExt = getCurrentExtension();
  if (currentFileExt) {
    startTime = new Date();
  }

  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);
  }
  statusBarItem.text = 'Time Tracker';
  statusBarItem.show();
  updateStatusBar();

  // When clicking on the status bar item, show the time tracking data.
  statusBarItem.command = `${extPrefix}.showTimeTrackingData`;

  context.subscriptions.push(vscode.commands.registerCommand(`${extPrefix}.showTimeTrackingData`, showTimeTrackingData));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(updateCurrentLanguage));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateCurrentLanguage));

  // Save data on deactivate
  context.subscriptions.push({
    dispose: () => saveData(context)
  });
}

function getCurrentExtension() {
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && activeEditor.document.uri.scheme === 'file') {
    const fileName = activeEditor.document.fileName;
    const ext = fileName.split('.').pop();
    return ext || null;
  }
  return null;
}

function updateCurrentLanguage() {
  if (startTime && currentFileExt) {
    const endTime = new Date();
    const codingTime = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    timeTrackingData[currentFileExt] = (timeTrackingData[currentFileExt] || 0) + codingTime;
  }

  currentFileExt = getCurrentExtension();

  if (currentFileExt) {
    startTime = new Date();
  } else {
    startTime = null;
  }
}

function updateStatusBar() {
  if (statusBarItem && startTime) {
    const ext = currentFileExt || '<Unk>';
    const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
    statusBarItem.text = `${ext.toUpperCase()}: ${timestamp(elapsed)}`;
  } else {
    if (statusBarItem) statusBarItem.text = `Code Time Tracker`;
  }
  setTimeout(updateStatusBar, 1000);
}

function saveData(context: vscode.ExtensionContext) {
  if (startTime && currentFileExt) {
    const endTime = new Date();
    const codingTime = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    timeTrackingData[currentFileExt] = (timeTrackingData[currentFileExt] || 0) + codingTime;
    context.globalState.update(`${extPrefix}.timeTrackingData`, timeTrackingData);
    startTime = null;
  }
}

function timestamp(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const ts = `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  
  if (hours) {
    return `${hours.toString().padStart(2, "0")}:${ts}`;
  }
  
  return ts;
}

let outputChannel: vscode.OutputChannel;
function showTimeTrackingData() {
  outputChannel ??= vscode.window.createOutputChannel('Time Tracking Data');
  outputChannel.clear();
  outputChannel.appendLine('Time spent on each file type:');

  if (startTime && currentFileExt) {
    const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
    timeTrackingData[currentFileExt] = (timeTrackingData[currentFileExt] || 0) + elapsed;
  }
  
  for (const fileExt in timeTrackingData) {
    if (timeTrackingData.hasOwnProperty(fileExt)) {
      const timeInSeconds = timeTrackingData[fileExt];
      outputChannel.appendLine(`${fileExt}: ${timestamp(timeInSeconds)}`);
    }
  }
  const total = Object.values(timeTrackingData).reduce((acc, val) => acc + val, 0);
  outputChannel.appendLine(`Total time: ${timestamp(total)}`);
  outputChannel.show();
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.hide();
  }
}