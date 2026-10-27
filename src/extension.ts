import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const STORAGE_KEY = 'hotkeyStats';
    let currentPanel: vscode.WebviewPanel | undefined = undefined;

    // Получаем текущую статистику или создаем новую
    let stats = context.globalState.get<Record<string, number>>(STORAGE_KEY, {
        'Save (Сохранение файла)': 0,
        'Paste (Вставка текста)': 0,
        'Custom (Нажатие Ctrl+Alt+H)': 0
    });

    // Функция для обновления Webview
    const updateWebview = () => {
        if (currentPanel) {
            currentPanel.webview.html = getWebviewContent(stats);
        }
    };

    // 1. Следим за сохранением файлов (Ctrl+S / Cmd+S)
    const saveListener = vscode.workspace.onDidSaveTextDocument(() => {
        stats['Save (Сохранение файла)']++;
        context.globalState.update(STORAGE_KEY, stats);
        updateWebview();
    });

    // 2. Следим за изменением текста (отлавливаем вставку Ctrl+V)
    // Если текст изменился сразу на несколько символов — это вставка.
    const pasteListener = vscode.workspace.onDidChangeTextDocument(event => {
        if (event.contentChanges.length > 0 && event.contentChanges[0].text.length > 1) {
            stats['Paste (Вставка текста)']++;
            context.globalState.update(STORAGE_KEY, stats);
            updateWebview();
        }
    });

    // 3. Команда: Открыть красивое окно (Дашборд) по Ctrl+Alt+H
    const showDisposable = vscode.commands.registerCommand('hotkey-counter.showStats', () => {
        stats['Custom (Нажатие Ctrl+Alt+H)']++;
        context.globalState.update(STORAGE_KEY, stats);

        // Если панель уже открыта, просто показываем её и обновляем данные
        if (currentPanel) {
            currentPanel.reveal(vscode.ViewColumn.One);
            updateWebview();
            return;
        }

        // Создаем новую панель
        currentPanel = vscode.window.createWebviewPanel(
            'hotkeyStats',
            'Статистика горячих клавиш',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        updateWebview();

        // Очищаем ссылку при закрытии, чтобы можно было открыть заново
        currentPanel.onDidDispose(() => {
            currentPanel = undefined;
        }, null, context.subscriptions);
    });

    context.subscriptions.push(saveListener, pasteListener, showDisposable);
}

// Функция для генерации красивого HTML/CSS
function getWebviewContent(stats: Record<string, number>): string {
    const rows = Object.entries(stats).map(([key, value]) => `
        <tr>
            <td>${key}</td>
            <td style="font-weight: bold; font-size: 1.2em; color: var(--vscode-textLink-foreground);">${value}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-top: 50px;
            height: 100vh;
            margin: 0;
        }
        h1 {
            font-size: 28px;
            margin-bottom: 30px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--vscode-button-background);
        }
        .table-container {
            background-color: var(--vscode-sideBar-background);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            min-width: 450px;
            border: 1px solid var(--vscode-widget-border);
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 15px 20px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        th {
            font-size: 16px;
            color: var(--vscode-descriptionForeground);
            font-weight: normal;
        }
        tr:last-child td {
            border-bottom: none;
        }
        .footer {
            margin-top: 30px;
            font-size: 14px;
            opacity: 0.6;
            text-align: center;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <h1>Статистика действий</h1>
    <div class="table-container">
        <table>
            <tr>
                <th>Действие / Комбинация</th>
                <th>Количество</th>
            </tr>
            ${rows}
        </table>
    </div>
    <div class="footer">
        Попробуй нажать <b>Cmd+S</b> (сохранить), <b>Cmd+V</b> (вставить) или <b>Cmd+Alt+H</b>.<br>
        Окно обновится автоматически.
    </div>
</body>
</html>`;
}

export function deactivate() {}