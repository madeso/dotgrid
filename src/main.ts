import "./main.css";
import "./theme.css";

import { Client } from "./client";

const client = new Client();
client.install(document.body);
window.addEventListener("load", () => {
  client.start();
});
