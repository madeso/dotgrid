/* global localStorage */
/* global FileReader */
/* global DOMParser */

// Helpers

const extract = (xml: string): Colors | undefined => {
  const svg = new DOMParser().parseFromString(xml, "text/xml");
  try {
    return {
      background:
        svg.getElementById("background")?.getAttribute("fill") ?? "missing",
      f_high: svg.getElementById("f_high")?.getAttribute("fill") ?? "missing",
      f_med: svg.getElementById("f_med")?.getAttribute("fill") ?? "missing",
      f_low: svg.getElementById("f_low")?.getAttribute("fill") ?? "missing",
      f_inv: svg.getElementById("f_inv")?.getAttribute("fill") ?? "missing",
      b_high: svg.getElementById("b_high")?.getAttribute("fill") ?? "missing",
      b_med: svg.getElementById("b_med")?.getAttribute("fill") ?? "missing",
      b_low: svg.getElementById("b_low")?.getAttribute("fill") ?? "missing",
      b_inv: svg.getElementById("b_inv")?.getAttribute("fill") ?? "missing",
    };
  } catch (err) {
    console.warn("Theme", "Incomplete SVG Theme", err);
    return undefined;
  }
};

const colorFromUnknown = (u: unknown): Colors | null => {
  if (!u) return null;
  if (typeof u !== "object") return null;
  const o = u as { [s: string]: unknown };

  /// get hex string
  const ghs = (name: string): string | null => {
    const prop = o[name];
    if (typeof prop !== "string") return null;
    if (isColor(prop) === false) return null;
    return prop;
  };

  const background = ghs("background");
  const f_high = ghs("f_high");
  const f_med = ghs("f_med");
  const f_low = ghs("f_low");
  const f_inv = ghs("f_inv");
  const b_high = ghs("b_high");
  const b_med = ghs("b_med");
  const b_low = ghs("b_low");
  const b_inv = ghs("b_inv");

  if (background === null) return null;
  if (f_high === null) return null;
  if (f_med === null) return null;
  if (f_low === null) return null;
  if (f_inv === null) return null;
  if (b_high === null) return null;
  if (b_med === null) return null;
  if (b_low === null) return null;
  if (b_inv === null) return null;

  return {
    background,
    f_high,
    f_med,
    f_low,
    f_inv,
    b_high,
    b_med,
    b_low,
    b_inv,
  };
};

const isValid = (json: unknown) => {
  const c = colorFromUnknown(json);
  return c !== null;
};

const isColor = (hex: string) => {
  return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
};

const isJson = (text: string) => {
  try {
    JSON.parse(text);
    return true;
  } catch (error) {
    return false;
  }
};

const isHtml = (text: string) => {
  try {
    new DOMParser().parseFromString(text, "text/xml");
    return true;
  } catch (error) {
    return false;
  }
};

interface Colors {
  background: string;
  f_high: string;
  f_med: string;
  f_low: string;
  f_inv: string;
  b_high: string;
  b_med: string;
  b_low: string;
  b_inv: string;
}
type ColorName = keyof Colors;

export class Theme {
  el: HTMLStyleElement;
  default: Colors;
  active: Colors;

  constructor() {
    this.el = document.createElement("style");
    this.el.type = "text/css";

    this.default = {
      background: "#eeeeee",
      f_high: "#0a0a0a",
      f_med: "#4a4a4a",
      f_low: "#6a6a6a",
      f_inv: "#111111",
      b_high: "#a1a1a1",
      b_med: "#c1c1c1",
      b_low: "#ffffff",
      b_inv: "#ffb545",
    };
    this.active = structuredClone(this.default);
  }

  // Callbacks
  onLoad() {}

  install(host = document.body) {
    window.addEventListener("dragover", this.drag);
    window.addEventListener("drop", this.drop);
    host.appendChild(this.el);
  }

  start() {
    console.log("Theme", "Starting..");
    if (isJson(localStorage.theme)) {
      const storage = JSON.parse(localStorage.theme);
      if (isValid(storage)) {
        console.log("Theme", "Loading theme in localStorage..");
        this.load(storage);
        return;
      }
    }
    this.load(this.default);
  }

  open() {
    console.log("Theme", "Open theme..");
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = () => {
      if (input.files === null) return;
      this.read(input.files[0], this.load);
    };
    input.click();
  }

  load(data: unknown) {
    const theme = this.parse(data);
    if (theme === undefined || !isValid(theme)) {
      console.warn("Theme", "Invalid format");
      return;
    }
    console.log("Theme", "Loaded theme!");
    this.el.innerHTML = `:root { 
      --background: ${theme.background}; 
      --f_high: ${theme.f_high}; 
      --f_med: ${theme.f_med}; 
      --f_low: ${theme.f_low}; 
      --f_inv: ${theme.f_inv}; 
      --b_high: ${theme.b_high}; 
      --b_med: ${theme.b_med}; 
      --b_low: ${theme.b_low}; 
      --b_inv: ${theme.b_inv};
    }`;
    localStorage.setItem("theme", JSON.stringify(theme));
    this.active = theme;
    this.onLoad();
  }

  reset() {
    this.load(this.default);
  }

  set(key: ColorName, val: string) {
    if (!val) {
      return;
    }
    const hex = (`${val}`.substr(0, 1) !== "#" ? "#" : "") + `${val}`;
    if (!isColor(hex)) {
      console.warn("Theme", `${hex} is not a valid color.`);
      return;
    }
    this.active[key] = hex;
  }

  get(key: ColorName) {
    return this.active[key];
  }

  parse(any: unknown): Colors | undefined {
    const parsed = colorFromUnknown(any);
    if (parsed !== null) {
      return parsed;
    }

    if (typeof any === "string") {
      if (isJson(any)) {
        return JSON.parse(any);
      }
      if (isHtml(any)) {
        return extract(any);
      }
    }

    return undefined;
  }

  // Drag

  drag(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (e.dataTransfer === null) return;

    e.dataTransfer.dropEffect = "copy";
  }

  drop(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (e.dataTransfer === null) return;
    if (e.dataTransfer.files.length <= 0) return;

    const file = e.dataTransfer.files[0];
    if (file.name.indexOf(".svg") > -1) {
      this.read(file, this.load);
    }
  }

  read(file: Blob, callback: (content: string | ArrayBuffer | null) => void) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result ?? null;
      callback(result);
    };
    reader.readAsText(file, "UTF-8");
  }
}
