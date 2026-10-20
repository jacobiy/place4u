import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// MUST stay ahead of the App import: this module reads the auth parameters
// (?code=… / #access_token=…) off the URL at evaluation time, and the Supabase
// client — pulled in via App.jsx — strips them while it initialises. See
// src/utils/authReturn.js.
import "./utils/authReturn.js";

import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
