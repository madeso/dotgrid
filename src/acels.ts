const capitalize = (s: string) => {
  return s.substr(0, 1).toUpperCase() + s.substr(1);
};

type TCat = string;

export interface Keymap {
  all: Map<string, Bind>;
  order: string[];
  binds: Bind[];
}

export interface Bind {
  category: string;
  name: string;
  accelerator: string;
  action: () => void;
}

export const create_keymap = (data: Bind[]) => {
  const keymap: Keymap = {
    all: new Map(),
    order: [],
    binds: [],
  };

  for (const d of data) {
    const old = keymap.all.get(d.accelerator);
    if (old !== undefined) {
      console.warn("Acels", `Trying to overwrite ${old.name}, with ${d.name}.`);
    }
    if (keymap.order.indexOf(d.category) < 0) {
      keymap.order.push(d.category);
    }
    keymap.all.set(d.accelerator, d);
    keymap.binds.push(d);
  }

  return keymap;
};

interface KeyEventLike {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;

  key: string;

  preventDefault: () => void;
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

export const keymap_on_key = (keymap: Keymap, e: KeyEventLike) => {
  const target = keymap.all.get(accelerator_from_event(e));
  if (!target) {
    return;
  }

  target.action();
  e.preventDefault();
  return;
};

const get_sorted_keymap = (keymap: Keymap) => {
  const h = new Map<TCat, Array<Bind>>();
  for (const [, item] of keymap.all) {
    if (item === undefined) continue;
    let found = h.get(item.category);
    if (found === undefined) {
      found = [];
      h.set(item.category, found);
    }
    found.push(item);
  }
  return h;
};

export const keymap_to_markdown = (keymap: Keymap) => {
  const cats = get_sorted_keymap(keymap);
  let text = "";
  for (const [cat, items] of cats) {
    text += `\n### ${cat}\n\n`;
    for (const item of items) {
      text += item.accelerator
        ? `- \`${item.accelerator}\`: ${item.name}\n`
        : "";
    }
  }
  return text.trim();
};
