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

const color_from_unknown_object = (u: unknown): Colors | null => {
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

const is_valid_json_object = (json: unknown) => {
  const c = color_from_unknown_object(json);
  return c !== null;
};

export const isColor = (hex: string) => {
  return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
};

export const isJson = (text: string) => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

const isHtml = (text: string) => {
  try {
    new DOMParser().parseFromString(text, "text/xml");
    return true;
  } catch {
    return false;
  }
};

export interface Colors {
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


const LOCAL_STORAGE_KEY = 'theme';

export const load_color_theme = (): Colors | null => {
  const source = (() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEY);
    }
    catch(x) {
      console.warn("Failure to get from local storage", x);
      return null;
    }
  })();
  if(source === null) return null;
  const object = JSON.parse(source);
  const parsed = color_from_unknown_object(object);
  if(parsed === null) {
    console.warn("Failed to parse local storage json", source, parsed);
    return null;
  }

  return parsed;
}
export const save_color_theme = (theme: Colors) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(theme));
  }
  catch(x) {
    console.warn("Failure to save to local storage", x);
  }
}

export const read_file = (file: Blob, callback: (content: string | ArrayBuffer | null) => void) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const result = event.target?.result ?? null;
    callback(result);
  };
  reader.readAsText(file, "UTF-8");
}

const parse_color = (any: unknown): Colors | undefined => {
    const parsed = color_from_unknown_object(any);
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

export const read_theme = (file: Blob, on_theme: (theme: Colors) =>void) => {
  read_file(file, (data) => {
    const theme = parse_color(data);
    if (theme === undefined || !is_valid_json_object(theme)) {
      console.warn("Theme", "Invalid format");
      return;
    }
    on_theme(theme);
  });
}

export const theme_browse = ( on_theme: (theme: Colors) =>void ) => {
  console.log("Theme", "Open theme..");
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = () => {
      if (input.files === null) return;
      read_theme(input.files[0], on_theme);
    };
    input.click();
};
