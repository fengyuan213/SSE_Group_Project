import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import "./index.css";
import App from "./App.tsx";
import { Auth0Provider } from "./auth/Auth0Provider.tsx";

const theme = createTheme({
  palette: { mode: "light" },
});

// Ensure root element exists before rendering
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Failed to find the root element. Make sure your index.html has a <div id='root'></div>"
  );
}

createRoot(rootElement).render(
  <Auth0Provider>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </Auth0Provider>
);
