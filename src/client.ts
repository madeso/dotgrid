import { Layers } from "./_types";

import { Acels } from "./acels";
import { Theme } from "./theme";
import { Source } from "./source";
import { History } from "./history";

import { Manager } from "./manager";
import { Renderer } from "./renderer";
import { jsonDump, Tool } from "./tool";
import { Interface } from "./interface";
import { Picker } from "./picker";
import { Cursor } from "./cursor";

/* global FileReader */

interface Size {
  width: number;
  height: number;
}

const sizeOffset = (a: Size, b: Size): Size => {
  return { width: a.width - b.width, height: a.height - b.height };
};

const printSize = (size: Size) => {
  return `${size.width}x${size.height}`;
};

const isJson = (text: string) => {
  try {
    JSON.parse(text);
    return true;
  } catch (error) {
    return false;
  }
};

const step = (v: number, s: number) => {
  return Math.round(v / s) * s;
};

export class Client {
  acels: Acels;
  theme: Theme;
  history: History<Layers>;
  source: Source;
  manager: Manager;
  renderer: Renderer;
  tool: Tool;
  interface: Interface;
  picker: Picker;
  cursor: Cursor;

  constructor() {
    this.acels = new Acels();
    this.theme = new Theme();
    this.history = new History();
    this.source = new Source();

    this.manager = new Manager(this);
    this.renderer = new Renderer(this);
    this.tool = new Tool(this);
    this.interface = new Interface(this);
    this.picker = new Picker(this);
    this.cursor = new Cursor(this);
  }

  install(host: HTMLElement) {
    console.info("Client", "Installing..");

    host.appendChild(this.renderer.el);

    document.addEventListener(
      "mousedown",
      (e) => {
        this.cursor.down(e);
      },
      false
    );
    document.addEventListener(
      "mousemove",
      (e) => {
        this.cursor.move(e);
      },
      false
    );
    document.addEventListener(
      "contextmenu",
      (e) => {
        this.cursor.alt(e);
      },
      false
    );
    document.addEventListener(
      "mouseup",
      (e) => {
        this.cursor.up(e);
      },
      false
    );
    document.addEventListener(
      "copy",
      (e) => {
        this.copy(e);
      },
      false
    );
    document.addEventListener(
      "cut",
      (e) => {
        this.cut(e);
      },
      false
    );
    document.addEventListener(
      "paste",
      (e) => {
        this.paste(e);
      },
      false
    );
    window.addEventListener(
      "resize",
      () => {
        this.onResize();
      },
      false
    );
    window.addEventListener("dragover", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (e.dataTransfer !== null) {
        e.dataTransfer.dropEffect = "copy";
      }
    });
    window.addEventListener("drop", this.onDrop);

    this.acels.set("∷", "Toggle Menubar", "Tab", () => {
      this.acels.toggle();
    });
    this.acels.set("∷", "Open Theme", "CmdOrCtrl+Shift+O", () => {
      this.theme.open();
    });
    this.acels.set("∷", "Reset Theme", "CmdOrCtrl+Backspace", () => {
      this.theme.reset();
    });
    this.acels.set("File", "New", "CmdOrCtrl+N", () => {
      this.tool.erase();
      this.update();
      this.source.new();
    });
    this.acels.set("File", "Open", "CmdOrCtrl+O", () => {
      this.source.open("grid", this.whenOpen);
    });
    this.acels.set("File", "Save", "CmdOrCtrl+S", () => {
      this.source.write("dotgrid", "grid", this.tool.export(), "text/plain");
    });
    this.acels.set("File", "Export Vector", "CmdOrCtrl+E", () => {
      this.source.write(
        "dotgrid",
        "svg",
        this.manager.toString(),
        "image/svg+xml"
      );
    });
    this.acels.set("File", "Export Image", "CmdOrCtrl+Shift+E", () => {
      this.manager.toPNG(this.tool.settings.size, (dataUrl) => {
        this.source.write("dotgrid", "png", dataUrl, "image/png");
      });
    });
    this.acels.set("Edit", "Undo", "CmdOrCtrl+Z", () => {
      this.tool.undo();
    });
    this.acels.set("Edit", "Redo", "CmdOrCtrl+Shift+Z", () => {
      this.tool.redo();
    });
    this.acels.set("View", "Color Picker", "G", () => {
      this.picker.start();
    });
    this.acels.set("View", "Toggle Grid", "H", () => {
      this.renderer.toggle();
    });
    this.acels.set("View", "Toggle Tools", "CmdOrCtrl+H", () => {
      this.interface.toggle();
    });
    this.acels.set("Layers", "Foreground", "CmdOrCtrl+1", () => {
      this.tool.selectLayer(0);
    });
    this.acels.set("Layers", "Middleground", "CmdOrCtrl+2", () => {
      this.tool.selectLayer(1);
    });
    this.acels.set("Layers", "Background", "CmdOrCtrl+3", () => {
      this.tool.selectLayer(2);
    });
    this.acels.set("Layers", "Merge Layers", "CmdOrCtrl+M", () => {
      this.tool.merge();
    });
    this.acels.set("Stroke", "Line", "A", () => {
      this.tool.cast("line");
    });
    this.acels.set("Stroke", "Arc", "S", () => {
      this.tool.cast("arc_c");
    });
    this.acels.set("Stroke", "Arc Rev", "D", () => {
      this.tool.cast("arc_r");
    });
    this.acels.set("Stroke", "Bezier", "F", () => {
      this.tool.cast("bezier");
    });
    this.acels.set("Stroke", "Close", "Z", () => {
      this.tool.cast("close");
    });
    this.acels.set("Stroke", "Arc(full)", "T", () => {
      this.tool.cast("arc_c_full");
    });
    this.acels.set("Stroke", "Arc Rev(full)", "Y", () => {
      this.tool.cast("arc_r_full");
    });
    this.acels.set("Stroke", "Clear Selection", "Escape", () => {
      this.tool.clear();
    });
    this.acels.set("Stroke", "Erase Segment", "Backspace", () => {
      this.tool.removeSegment();
    });
    this.acels.set("Control", "Add Point", "Enter", () => {
      this.tool.addVertex(this.cursor.pos);
      this.renderer.update();
    });
    this.acels.set("Control", "Move Up", "Up", () => {
      this.cursor.pos.y -= 15;
      this.renderer.update();
    });
    this.acels.set("Control", "Move Right", "Right", () => {
      this.cursor.pos.x += 15;
      this.renderer.update();
    });
    this.acels.set("Control", "Move Down", "Down", () => {
      this.cursor.pos.y += 15;
      this.renderer.update();
    });
    this.acels.set("Control", "Move Left", "Left", () => {
      this.cursor.pos.x -= 15;
      this.renderer.update();
    });
    this.acels.set("Control", "Remove Point", "X", () => {
      this.tool.removeSegmentsAt(this.cursor.pos);
    });
    this.acels.set("Style", "Linecap", "Q", () => {
      this.tool.toggle("linecap");
    });
    this.acels.set("Style", "Linejoin", "W", () => {
      this.tool.toggle("linejoin");
    });
    this.acels.set("Style", "Mirror", "E", () => {
      this.tool.toggle("mirror");
    });
    this.acels.set("Style", "Fill", "R", () => {
      this.tool.toggle("fill");
    });
    this.acels.set("Style", "Thicker", "}", () => {
      this.tool.toggle("thickness", 1);
    });
    this.acels.set("Style", "Thinner", "{", () => {
      this.tool.toggle("thickness", -1);
    });
    this.acels.set("Style", "Thicker +5", "]", () => {
      this.tool.toggle("thickness", 5);
    });
    this.acels.set("Style", "Thinner -5", "[", () => {
      this.tool.toggle("thickness", -5);
    });
    this.acels.route(this);

    this.manager.install();
    this.interface.install(host);
    this.theme.install(host);
    this.acels.install(host);
  }

  start() {
    console.log("Client", "Starting..");
    console.info(`${this.acels}`);

    this.theme.start();
    this.acels.start();
    this.tool.start();
    this.renderer.start();
    this.interface.start();

    this.history.push(this.layers); // initial state

    this.source.new();
    this.onResize();

    this.interface.update(true); // force an update

    setTimeout(() => {
      document.body.className += " ready";
    }, 250);
  }

  update() {
    this.manager.update();
    this.interface.update();
    this.renderer.update();
  }

  clear() {
    this.history.clear();
    this.tool.reset();
    this.reset();
    this.renderer.update();
    this.interface.update(true);
  }

  reset() {
    this.tool.clear();
    this.update();
  }

  whenOpen(file: unknown, data: string) {
    this.tool.replace(JSON.parse(data));
    this.onResize();
  }

  // Resize Tools

  fitSize() {
    if (this.requireResize() === false) {
      return;
    }
    console.log(
      "Client",
      `Will resize to: ${printSize(this.getRequiredSize())}`
    );
    this.update();
  }

  getPadding() {
    return { x: 60, y: 90 };
  }

  getWindowSize() {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  getProjectSize() {
    return this.tool.settings.size;
  }

  getPaddedSize() {
    const rect = this.getWindowSize();
    const pad = this.getPadding();
    return {
      width: step(rect.width - pad.x, 15),
      height: step(rect.height - pad.y, 15),
    };
  }

  getRequiredSize() {
    const rect = this.getProjectSize();
    const pad = this.getPadding();
    return {
      width: step(rect.width, 15) + pad.x,
      height: step(rect.height, 15) + pad.y,
    };
  }

  requireResize() {
    const _window = this.getWindowSize();
    const _required = this.getRequiredSize();
    const offset = sizeOffset(_window, _required);
    if (offset.width !== 0 || offset.height !== 0) {
      console.log(
        "Client",
        `Require ${printSize(_required)}, but window is ${printSize(
          _window
        )}(${printSize(offset)})`
      );
      return true;
    }
    return false;
  }

  onResize() {
    const _project = this.getProjectSize();
    const _padded = this.getPaddedSize();
    const offset = sizeOffset(_padded, _project);
    if (offset.width !== 0 || offset.height !== 0) {
      console.log("Client", `Resize project to ${printSize(_padded)}`);
      this.tool.settings.size = _padded;
    }
    this.update();
  }

  // Events

  // when is this called???
  /*
  drag(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    const filename = file.path ? file.path : file.name ? file.name : "";

    if (filename.indexOf(".grid") < 0) {
      console.warn("Client", "Not a .grid file");
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      const data = e.target && e.target.result ? e.target.result : "";
      this.source.load(filename, data);
      this.fitSize();
    };
    reader.readAsText(file);
  }
    */

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];

    if (file.name.indexOf(".grid") > -1) {
      this.source.read(e.dataTransfer.files[0], this.whenOpen);
    }
  }

  copy(e: ClipboardEvent) {
    this.renderer.update();

    if (e.target !== this.picker.input) {
      if (e.clipboardData !== null) {
        e.clipboardData.setData("text/source", jsonDump(this.tool.layer()));
        e.clipboardData.setData("text/plain", this.tool.path());
        e.clipboardData.setData("text/html", this.manager.el.outerHTML);
        e.clipboardData.setData("text/svg+xml", this.manager.el.outerHTML);
      } else {
        console.error("missing clipboard");
      }
      e.preventDefault();
    }

    this.renderer.update();
  }

  cut(e: ClipboardEvent) {
    this.renderer.update();

    if (e.target !== this.picker.input) {
      if (e.clipboardData !== null) {
        e.clipboardData.setData("text/source", jsonDump(this.tool.layer()));
        e.clipboardData.setData("text/plain", jsonDump(this.tool.layer()));
        e.clipboardData.setData("text/html", this.manager.el.outerHTML);
        e.clipboardData.setData("text/svg+xml", this.manager.el.outerHTML);
      } else {
        console.error("missing clipboard");
      }
      this.tool.layers[this.tool.index] = [];
      e.preventDefault();
    }

    this.renderer.update();
  }

  paste(e: ClipboardEvent) {
    if (e.target !== this.picker.el) {
      let data = e.clipboardData?.getData("text/source");
      if (data && isJson(data)) {
        const parsed = JSON.parse(data.trim());
        this.tool.import(parsed);
      }
      e.preventDefault();
    }

    this.renderer.update();
  }

  onKeyDown() {}

  onKeyUp() {}
}
