import { Client } from "./client";
import type { Operation } from "./cursor";

interface Button {
  key: string;
  icon: string;
  el?: SVGSVGElement;
}
interface SingleOption {
  [key: string]: Button | undefined;
}
interface OptionList {
  [group: string]: SingleOption | undefined;

  cast: {
    line: Button;
    arc_c: Button;
    arc_r: Button;
    bezier: Button;
    close: Button;
  };
  toggle: {
    linecap: Button;
    linejoin: Button;
    thickness: Button;
    mirror: Button;
    fill: Button;
  };
  misc: {
    color: Button;
  };
  source: {
    open: Button;
    render: Button;
    export: Button;
    save: Button;
    grid: Button;
  };
}

const options: OptionList = {
  cast: {
    line: { key: "A", icon: "M60,60 L240,240" },
    arc_c: { key: "S", icon: "M60,60 A180,180 0 0,1 240,240" },
    arc_r: { key: "D", icon: "M60,60 A180,180 0 0,0 240,240" },
    bezier: { key: "F", icon: "M60,60 Q60,150 150,150 Q240,150 240,240" },
    close: {
      key: "Z",
      icon: "M60,60 A180,180 0 0,1 240,240  M60,60 A180,180 0 0,0 240,240",
    },
  },
  toggle: {
    linecap: {
      key: "Q",
      icon: "M60,60 L60,60 L180,180 L240,180 L240,240 L180,240 L180,180",
    },
    linejoin: {
      key: "W",
      icon: "M60,60 L120,120 L180,120  M120,180 L180,180 L240,240",
    },
    thickness: {
      key: "",
      icon: "M120,90 L120,90 L90,120 L180,210 L210,180 Z M105,105 L105,105 L60,60 M195,195 L195,195 L240,240",
    },
    mirror: {
      key: "E",
      icon: "M60,60 L60,60 L120,120 M180,180 L180,180 L240,240 M210,90 L210,90 L180,120 M120,180 L120,180 L90,210",
    },
    fill: { key: "R", icon: "M60,60 L60,150 L150,150 L240,150 L240,240 Z" },
  },
  misc: {
    color: {
      key: "G",
      icon: "M150,60 A90,90 0 0,1 240,150 A-90,90 0 0,1 150,240 A-90,-90 0 0,1 60,150 A90,-90 0 0,1 150,60",
    },
  },
  source: {
    open: {
      key: "c-O",
      icon: "M155,65 A90,90 0 0,1 245,155 A90,90 0 0,1 155,245 A90,90 0 0,1 65,155 A90,90 0 0,1 155,65 M155,95 A60,60 0 0,1 215,155 A60,60 0 0,1 155,215 A60,60 0 0,1 95,155 A60,60 0 0,1 155,95 ",
    },
    render: {
      key: "c-R",
      icon: "M155,65 A90,90 0 0,1 245,155 A90,90 0 0,1 155,245 A90,90 0 0,1 65,155 A90,90 0 0,1 155,65 M110,155 L110,155 L200,155 ",
    },
    export: {
      key: "c-E",
      icon: "M155,65 A90,90 0 0,1 245,155 A90,90 0 0,1 155,245 A90,90 0 0,1 65,155 A90,90 0 0,1 155,65 M110,140 L110,140 L200,140 M110,170 L110,170 L200,170",
    },
    save: {
      key: "c-S",
      icon: "M155,65 A90,90 0 0,1 245,155 A90,90 0 0,1 155,245 A90,90 0 0,1 65,155 A90,90 0 0,1 155,65 M110,155 L110,155 L200,155 M110,185 L110,185 L200,185 M110,125 L110,125 L200,125",
    },
    grid: {
      key: "H",
      icon: "M65,155 Q155,245 245,155 M65,155 Q155,65 245,155 M155,125 A30,30 0 0,1 185,155 A30,30 0 0,1 155,185 A30,30 0 0,1 125,155 A30,30 0 0,1 155,125 ",
    },
  },
};

const mirrorPaths = [
  "M60,60 L60,60 L120,120 M180,180 L180,180 L240,240 M210,90 L210,90 L180,120 M120,180 L120,180 L90,210",
  "M60,60 L240,240 M180,120 L210,90 M120,180 L90,210",
  "M210,90 L210,90 L90,210 M60,60 L60,60 L120,120 M180,180 L180,180 L240,240",
  "M60,60 L60,60 L120,120 L180,120 L210,90 M240,240 L240,240 L180,180 L120,180 L90,210",
  "M120,120 L120,120 L120,120 L180,120 M120,150 L120,150 L180,150 M120,180 L120,180 L180,180 L180,180 L180,180 L240,240 M120,210 L120,210 L180,210 M120,90 L120,90 L180,90 M60,60 L60,60 L120,120  ",
];

const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

function createSvg<K extends keyof SVGElementTagNameMap>(
  owner: { appendChild: (el: SVGElementTagNameMap[K]) => void },
  name: K,
  v?: { [key: string]: string }
) {
  const n = document.createElementNS<K>("http://www.w3.org/2000/svg", name);
  if (v) {
    for (const p in v) {
      n.setAttributeNS(null, p, v[p]);
    }
  }

  owner.appendChild(n);
  return n;
}

export class Interface {
  client: Client;
  el: HTMLDivElement;
  menu_el: HTMLDivElement;
  isVisible: boolean;
  zoom: boolean;
  prev_operation: null | Operation;

  constructor(client: Client) {
    this.client = client;
    this.el = document.createElement("div");
    this.el.id = "interface";

    this.menu_el = document.createElement("div");
    this.el.appendChild(this.menu_el);
    this.menu_el.id = "menu";

    this.isVisible = true;
    this.zoom = false;

    this.prev_operation = null;
  }

  install(host: HTMLElement) {
    host.appendChild(this.el);
  }

  start() {
    this.menu_el.innerHTML = "";

    for (const type in options) {
      const tools = options[type];
      if (!tools) continue;
      for (const name in tools) {
        const tool = tools[name];
        if (!tool) continue;

        const svg = createSvg(this.menu_el, "svg", {
          id: `option_${name}`,
          title: capitalize(name),
          viewBox: "0 0 300 300",
          class: `icon ${type}`,
        });
        tool.el = svg;
        svg.onmouseout = () => {
          this.out();
        };
        svg.onmouseup = () => {
          this.up(type, name);
        };
        svg.onmousedown = (event) => {
          this.down(type, name, event);
        };
        svg.onmouseover = () => {
          this.over(type, name);
        };

        createSvg(svg, "path", {
          id: `${name}_path`,
          class: "icon_path",
          d: tool.icon,
        });

        if (name === "depth") {
          createSvg(svg, "path", {
            class: "icon_path inactive",
            d: "",
          });
        }

        const rect = createSvg(svg, "rect", {
          ar: name,
          width: "300",
          height: "300",
          opacity: "0",
        });

        const title = createSvg(rect, "title");
        title.innerHTML = `${capitalize(name)}${
          tool.key ? "(" + tool.key + ")" : ""
        }`;
      }
    }

    this.menu_el.appendChild(this.client.picker.el);
  }

  over(type: string, name: string) {
    this.update(true);
    this.client.renderer.update();
    console.log(type, name);
  }

  out() {
    this.client.renderer.update();
  }

  up(type: string, name: string) {
    // this.client.tool
    console.log("up", type, name);
    this.update(true);
    this.client.renderer.update();
  }

  down(type: string, name: string, event: MouseEvent) {
    
    console.warn(`Unknown option(type): ${type}.${name}`, this.client.tool, event);
    return;
  }

  update(force = false) {
    if (
      this.prev_operation === this.client.cursor.cursor.operation &&
      force === false
    ) {
      return;
    }

    let multiVertices = null;
    const segments = this.client.tool.layer();
    const sumSegments = this.client.tool.length();

    for (const i in segments) {
      if (segments[i].vertices.length > 2) {
        multiVertices = true;
        break;
      }
    }

    const setBaseVal = (el: SVGElement | undefined, s: string) => {
      if (!el) return;
      el.className.baseVal = s;
    };

    setBaseVal(
      options.cast.line.el,
      !this.client.tool.canCast("line") ? "icon inactive" : "icon"
    );
    setBaseVal(
      options.cast.arc_c.el,
      !this.client.tool.canCast("arc_c") ? "icon inactive" : "icon"
    );
    setBaseVal(
      options.cast.arc_r.el,
      !this.client.tool.canCast("arc_r") ? "icon inactive" : "icon"
    );
    setBaseVal(
      options.cast.bezier.el,
      !this.client.tool.canCast("bezier") ? "icon inactive" : "icon"
    );
    setBaseVal(
      options.cast.close.el,
      !this.client.tool.canCast("close") ? "icon inactive" : "icon"
    );
    setBaseVal(
      options.toggle.thickness.el,
      this.client.tool.layer().length < 1 ? "icon inactive" : "icon"
    );
    setBaseVal(
      options.toggle.linecap.el,
      this.client.tool.layer().length < 1 ? "icon inactive" : "icon"
    );
    setBaseVal(
      options.toggle.linejoin.el,
      this.client.tool.layer().length < 1 || !multiVertices
        ? "icon inactive"
        : "icon"
    );
    setBaseVal(
      options.toggle.mirror.el,
      this.client.tool.layer().length < 1 ? "icon inactive" : "icon"
    );
    setBaseVal(
      options.toggle.fill.el,
      this.client.tool.layer().length < 1 ? "icon inactive" : "icon"
    );
    setBaseVal(options.misc.color.el, "icon");
    setBaseVal(
      options.source.save.el,
      sumSegments < 1 ? "icon inactive source" : "icon source"
    );
    setBaseVal(
      options.source.export.el,
      sumSegments < 1 ? "icon inactive source" : "icon source"
    );
    setBaseVal(
      options.source.render.el,
      sumSegments < 1 ? "icon inactive source" : "icon source"
    );
    setBaseVal(
      options.source.grid.el,
      this.client.renderer.showExtras ? "icon inactive source" : "icon source"
    );

    // Grid
    document
      .getElementById("grid_path")
      ?.setAttribute(
        "d",
        this.client.renderer.showExtras
          ? "M65,155 Q155,245 245,155 M65,155 Q155,65 245,155 M155,125 A30,30 0 0,1 185,155 A30,30 0 0,1 155,185 A30,30 0 0,1 125,155 A30,30 0 0,1 155,125 "
          : "M65,155 Q155,245 245,155 M65,155 "
      );

    // Mirror
    document
      .getElementById("mirror_path")
      ?.setAttribute("d", mirrorPaths[this.client.tool.style().mirror_style]);
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.el.className = this.isVisible ? "visible" : "hidden";
  }
}
