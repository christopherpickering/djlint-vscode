import * as vscode from "vscode";
import { getCommonArgs } from "./args";
import { getPythonExec } from "./python";
import { runDjlint } from "./runner";
import { getConfig } from "./utils";

const formatBoolOptions = [
  ["requirePragma", "--require-pragma"],
  ["preserveLeadingSpace", "--preserve-leading-space"],
  ["preserveBlankLines", "--preserve-blank-lines"],
  ["formatCss", "--format-css"],
  ["formatJs", "--format-js"],
];

function getFormatArgs(
  document: vscode.TextDocument,
  config: vscode.WorkspaceConfiguration,
  options: vscode.FormattingOptions
): string[] {
  const args = ["--reformat"].concat(getCommonArgs(document, config));

  if (config.get<boolean>("useEditorIndentation")) {
    args.push("--indent", options.tabSize.toString());
  }

  for (const [key, value] of formatBoolOptions) {
    if (config.get<boolean>(key)) {
      args.push(value);
    }
  }

  return args;
}

export class Formatter implements vscode.DocumentFormattingEditProvider {
  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions
  ): Promise<vscode.TextEdit[]> {
    const config = getConfig();

    let pythonPath;
    try {
      pythonPath = await getPythonExec(document, config);
    } catch (error) {
      return [];
    }

    const args = getFormatArgs(document, config, options);
    let stdout;
    try {
      stdout = await runDjlint(document, pythonPath, args);
    } catch (error) {
      return [];
    }
    if (!stdout || stdout.trim().length === 0) {
      return [];
    }

    const lastLineId = document.lineCount - 1;
    const lastLineLength = document.lineAt(lastLineId).text.length;
    const range = new vscode.Range(0, 0, lastLineId, lastLineLength);
    return [vscode.TextEdit.replace(range, stdout)];
  }
}
