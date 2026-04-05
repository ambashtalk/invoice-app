# 💎 Prism Invoice

**Local-first, premium invoice management for freelancers.**

Prism Invoice is a powerful, privacy-focused desktop application designed to handle your invoicing workflow entirely on your local machine, with optional secure sync to Google Drive.

![Prism Invoice Logo](build/icons/icon.png)

## ✨ Features

- **Local-First**: All data is stored in a local SQLite database. No cloud account required.
- **Premium Design**: A high-end, responsive UI built for modern freelancers.
- **Tax-Inclusive Logic**: Automatic back-calculation of base prices from totals.
- **Rich Text Emails**: Tiptap-powered email templates with Gmail integration.
- **PDF Generation**: Professional A4 PDF layouts with support for digital signatures.
- **Multi-Currency**: Default INR support with real-time conversion for USD/EUR.
- **Auto-Sync**: Background, conflict-aware sync with Google Drive.

## 🚀 Installation

Download the latest version for your platform from the [Releases](https://github.com/ambashtalk/invoice-app/releases) page.

### Security Note (Gatekeeper & SmartScreen)

> [!WARNING]
> **Prism Invoice is currently unsigned.**
> Because this is an open-source project and code-signing certificates are costly, you may see security warnings during installation on macOS and Windows. These can be safely bypassed:
>
> - **macOS**: Right-click the app in Finder and select **Open**. If you see a warning, click **Open** again.
> - **Windows**: Click **More Info** on the SmartScreen dialog, then click **Run Anyway**.

## 💻 Tech Stack

- **Framework**: Electron + Vite + React
- **Database**: `better-sqlite3`
- **State**: React Context API
- **Editors**: Tiptap (Rich Text)
- **Integration**: Google OAuth2 (Gmail, Drive)

## 🛠️ Contribution

Prism Invoice is open-source. Feel free to open issues or submit pull requests.

### Development Setup

1.  Clone the repository.
2.  Install dependencies: `npm install`.
3.  Copy `config/credentials.example.json` to `config/credentials.json` with your Google Cloud project credentials.
4.  Run development server: `npm run dev`.

---

Built with ❤️ by [ambashtalk](https://github.com/ambashtalk)
