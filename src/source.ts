/* global FileReader */
/* global MouseEvent */

const arvelie = (date = new Date()) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff =
    date.getTime() -
    start.getTime() +
    (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const doty = Math.floor(diff / 86400000) - 1;
  const y = date.getFullYear().toString().substr(2, 2);
  const m =
    doty === 364 || doty === 365
      ? "+"
      : String.fromCharCode(97 + Math.floor(doty / 14)).toUpperCase();
  const d = `${(doty === 365 ? 1 : doty === 366 ? 2 : doty % 14) + 1}`.padStart(
    2,
    "0"
  );
  return `${y}${m}${d}`;
};

function neralie(d = new Date(), e = new Date(d)) {
  const ms = e.getTime() - d.setHours(0, 0, 0, 0);
  return (ms / 8640 / 10000).toFixed(6).substr(2, 6);
}

function timestamp() {
  return `${arvelie()}-${neralie()}`;
}

type Content = string;
type Callback = (file: File, content: Content) => void;

export const source_open = (ext: string, callback?: Callback) => {
  console.log("Source", "Open file..");
  const input = document.createElement("input");
  input.type = "file";
  input.onchange = () => {
    if (input.files === null) return;
    const file = input.files[0];
    if (file.name.indexOf("." + ext) < 0) {
      console.warn("Source", `Skipped ${file.name}`);
      return;
    }
    source_read(file, callback);
  };
  input.click();
};

// I/O

const source_read = (file: File, callback?: Callback) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const res = event.target?.result ?? null;
    if (typeof res !== "string") return;
    if (callback) {
      callback(file, res);
    }
  };
  reader.readAsText(file, "UTF-8");
};

export const source_write = (
  name: string,
  ext: string,
  content: Content,
  type: string,
  settings = "charset=utf-8"
) => {
  const link = document.createElement("a");
  link.setAttribute("download", `${name}-${timestamp()}.${ext}`);
  if (type === "image/png" || type === "image/jpeg") {
    link.setAttribute("href", content);
  } else {
    link.setAttribute(
      "href",
      "data:" + type + ";" + settings + "," + encodeURIComponent(content)
    );
  }
  link.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
  );
};
