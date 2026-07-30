# Atulsia Proof of Concept

![Next.js](https://img.shields.io/badge/Next.js-16-000000)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4)
![License](https://img.shields.io/badge/License-MIT-yellow)

A proof-of-concept Next.js frontend application for displaying and rendering question papers with LaTeX math support, table parsing, and flexible data input modes.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Screenshots](#screenshots)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Running the Project](#running-the-project)
- [API Routes](#api-routes)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Question Paper Display** – Renders structured question data with options, modules, and question types
- **LaTeX Math Rendering** – Supports mathematical notation via KaTeX and remark-math
- **Table Data Parsing** – Automatically detects and renders semicolon-separated key-value data as HTML tables
- **Dual Input Modes** – Fetch questions from an API endpoint or paste JSON data directly
- **Currency Handling** – Escapes dollar signs used for currency while preserving LaTeX math delimiters
- **Responsive UI** – Built with Tailwind CSS for mobile-friendly layouts

## Tech Stack

| Technology | Version |
|------------|---------|
| Next.js | 16.0.1 |
| React | 19.2.0 |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| KaTeX | 0.16.25 |
| ESLint | 9.x |

## Project Structure

```
Atulsia_POC/
├── public/                  # Static assets
├── src/
│   └── app/
│       ├── globals.css      # Global styles (Tailwind)
│       ├── layout.tsx       # Root layout with metadata
│       ├── page.tsx         # Main entry point
│       └── QuestionPaperUI.tsx  # Core question paper component
├── eslint.config.mjs        # ESLint configuration
├── next.config.ts           # Next.js configuration
├── package.json             # Dependencies and scripts
├── postcss.config.mjs       # PostCSS configuration (Tailwind)
└── tsconfig.json            # TypeScript configuration
```

## Screenshots

<!-- Add screenshots of your application here -->

> _Screenshots coming soon_

## Prerequisites

- **Node.js** 18.17 or later
- **npm** (comes with Node.js)

## Installation and Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/Harshitshukla0208/Atulsia_POC.git
   cd Atulsia_POC
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

## Running the Project

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## API Routes

This project is a frontend-only application. It expects a backend API at `http://localhost:8000` to fetch extraction data. The relevant endpoint is:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/extractions/{id}` | Fetch extraction data by ID |

The application also supports a **direct input mode** where you can paste JSON data directly into the UI without making an API call.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
https://leoqui-test.vercel.app?_vercel_share=fzhwpM5K2APjDyT7tXT3vBEqTvgyuiYp
