const capitalize = (s: string) => {
  return s.substr(0, 1).toUpperCase() + s.substr(1);
};

type TCat = string;
type TName = string;
type TAccelerator = string;
type TDownfn = () => void;
type TUpfn = () => void;

interface Tall {
  cat: TCat;
  name: TName;
  accelerator: TAccelerator;
  downfn: TDownfn;
  upfn?: TUpfn;
}

type Dict<Keys extends string | number | symbol, Value> = {
  [dict_key in Keys]: Value;
};
type TallMap = { [key: TAccelerator]: Tall | undefined };

interface Pipe {
  onKeyUp: (e: KeyboardEvent) => void;
  onKeyDown: (e: KeyboardEvent) => void;
}

export interface Keymap {
  all: Map<string, Callback>;
  order: string[];
  binds: Callback[];
}

interface Callback {
  category: string;
  name: string;
  accelerator: string;
  action: ()=>void;
}

export const keymap_register = (data: Callback[]) => {
  const keymap: Keymap = {
    all: new Map(),
    order: [],
    binds: []
  };

  for(const d of data) {
    const old = keymap.all.get(d.accelerator);
    if (old !== undefined) {
      console.warn(
        "Acels",
        `Trying to overwrite ${old.name}, with ${d.name}.`
      );
    }
    if (keymap.order.indexOf(d.category) < 0) {
      keymap.order.push(d.category);
    }
    keymap.all.set(d.accelerator, d);
    keymap.binds.push(d);
  }

  return keymap;
}

interface KeyEventLike {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;

  key: string;

  preventDefault: ()=>void;
}

const accelerator_from_event = (event: KeyEventLike): string => {
  const accelerator =
    event.key === " " ? "Space" : capitalize(event.key.replace("Arrow", ""));
  if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
    return `CmdOrCtrl+Shift+${accelerator}`;
  }
  if (event.shiftKey && event.key.toUpperCase() !== event.key) {
    return `Shift+${accelerator}`;
  }
  if (event.altKey && event.key.length !== 1) {
    return `Alt+${accelerator}`;
  }
  if (event.ctrlKey || event.metaKey) {
    return `CmdOrCtrl+${accelerator}`;
  }
  return accelerator;
};

export const keymap_onkey = (keymap: Keymap, e: KeyEventLike) => {
  const target = keymap.all.get(accelerator_from_event(e));
  if (!target) {
    return;
  }

  target.action();
  e.preventDefault();
  return;
};

export class Acels {
  el: HTMLUListElement;
  pipe: Pipe | null;
  all: TallMap;
  order: Array<TCat>;

  constructor() {
    this.el = document.createElement("ul");
    this.el.id = "acels";

    this.order = [];
    this.all = {};
    this.pipe = null;
  }

  install(host: HTMLElement = document.body) {
    window.addEventListener("keydown", this.onKeyDown, false);
    window.addEventListener("keyup", this.onKeyUp, false);
    host.appendChild(this.el);
  }

  start() {
    const cats = this.sort();
    for (const cat of this.order) {
      const main = document.createElement("li");
      const head = document.createElement("a");
      head.innerText = cat;
      const subs = document.createElement("ul");
      for (const item of cats[cat]) {
        const option = document.createElement("li");
        option.onclick = item.downfn;
        option.innerHTML = item.accelerator
          ? `${item.name} <i>${item.accelerator.replace("CmdOrCtrl+", "^")}</i>`
          : `${item.name}`;
        subs.appendChild(option);
      }
      main.appendChild(head);
      main.appendChild(subs);
      this.el.appendChild(main);
    }
  }

  set(
    cat: TCat,
    name: TName,
    accelerator: TAccelerator,
    downfn: TDownfn,
    upfn?: TUpfn
  ) {
    if (this.all[accelerator]) {
      console.warn(
        "Acels",
        `Trying to overwrite ${this.all[accelerator].name}, with ${name}.`
      );
    }
    if (this.order.indexOf(cat) < 0) {
      this.order.push(cat);
    }
    this.all[accelerator] = { cat, name, downfn, upfn, accelerator };
  }

  get(accelerator: TAccelerator) {
    return this.all[accelerator];
  }

  sort() {
    const h: Dict<TCat, Array<Tall>> = {};
    for (const item of Object.values(this.all)) {
      if (item === undefined) continue;
      if (!h[item.cat]) {
        h[item.cat] = [];
      }
      h[item.cat].push(item);
    }
    return h;
  }

  convert(event: KeyboardEvent) {
    const accelerator =
      event.key === " " ? "Space" : capitalize(event.key.replace("Arrow", ""));
    if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
      return `CmdOrCtrl+Shift+${accelerator}`;
    }
    if (event.shiftKey && event.key.toUpperCase() !== event.key) {
      return `Shift+${accelerator}`;
    }
    if (event.altKey && event.key.length !== 1) {
      return `Alt+${accelerator}`;
    }
    if (event.ctrlKey || event.metaKey) {
      return `CmdOrCtrl+${accelerator}`;
    }
    return accelerator;
  }

  route(obj: Pipe) {
    this.pipe = obj;
  }

  onKeyDown(e: KeyboardEvent) {
    const target = this.get(this.convert(e));
    if (!target || !target.downfn) {
      return this.pipe ? this.pipe.onKeyDown(e) : null;
    }

    target.downfn();
    e.preventDefault();
  }

  onKeyUp(e: KeyboardEvent) {
    const target = this.get(this.convert(e));
    if (!target || !target.upfn) {
      return this.pipe ? this.pipe.onKeyUp(e) : null;
    }
    target.upfn();
    e.preventDefault();
  }

  toMarkdown() {
    const cats = this.sort();
    let text = "";
    for (const cat in cats) {
      text += `\n### ${cat}\n\n`;
      for (const item of cats[cat]) {
        text += item.accelerator
          ? `- \`${item.accelerator}\`: ${item.name}\n`
          : "";
      }
    }
    return text.trim();
  }

  toString() {
    const cats = this.sort();
    let text = "";
    for (const cat of this.order) {
      for (const item of cats[cat]) {
        text += item.accelerator
          ? `${cat.padEnd(8, " ")} ${item.name.padEnd(
              16,
              " "
            )} ${item.accelerator.replace("CmdOrCtrl+", "^")}\n`
          : "";
      }
    }
    return text.trim();
  }

  toggle() {
    this.el.className = this.el.className === "hidden" ? "" : "hidden";
  }
}
