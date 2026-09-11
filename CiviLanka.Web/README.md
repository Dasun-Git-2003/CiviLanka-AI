# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

---

## Environment Setup (Required before running)

This project requires a Google Maps API key to display the interactive GIS map on the Dashboard.

> **⚠️ Never commit your `.env` file or any real API keys to Git.**
> The `.env` file is already listed in `.gitignore` and will not be tracked.

### Steps

1. Create a `.env` file in the root of the `CiviLanka.Web` folder (same level as `package.json`).

2. Add the following line to your `.env` file and replace the placeholder with your real key:

```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

3. To get a Google Maps API key:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select a project
   - Navigate to **APIs & Services → Library**
   - Enable the **Maps JavaScript API**
   - Navigate to **APIs & Services → Credentials**
   - Click **Create Credentials → API Key** and copy the key

4. Restart the dev server after adding your key — Vite only reads `.env` files on startup.

### Running the App

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.
