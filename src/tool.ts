import type {
  Point,
  Layers,
  SingleLayer,
  Segment,
  SegmentType,
  Vertices,
  SingleStyle,
  Size,
} from "./_types";
import { Client } from "./client";

import { generate, generate_wrap, mirror_from_style } from "./generator";
import type { Interface } from "./interface";
import type { Renderer } from "./renderer";
import type { Colors } from "./theme";
import type { History } from "./history";

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

interface ParsedTool {
  layers?: Layers;
  settings: {
    size: { width: number; height: number };
    width?: number;
    height?: number;
  };
  styles: Array<SingleStyle>;
}

type ToolType = "linecap" | "linejoin" | "fill" | "thickness" | "mirror";
type SourceType = "grid" | "open" | "save" | "export" | "render";

export const jsonDump = (target: unknown) => {
  return JSON.stringify(structuredClone(target), null, 2);
};




type UpdateCallback = () => void;
type PushCallback = (lay: Layers) => void;

const legacy_update = (renderer: Renderer, inter: Interface) => {
  renderer.update();
  inter.update(true);
}

const legacy_prev = (history: History<Layers>) => {
  return history.prev()
}
const legacy_next = (history: History<Layers>) => {
  return history.next()
}
const legacy_push = (history: History<Layers>, item: Layers) => {
  history.push(item);
}

const legacy_fitSize = (client: Client) => {
  client.fitSize();
}



export interface ToolI {
  index: number;
  settings: { size: { width: number; height: number } };
  layers: Layers;
  vertices: Array<Point>;
  styles: Array<SingleStyle>;
  reqs: {
    line: number;
    arc_c: number;
    arc_r: number;
    arc_c_full: number;
    arc_r_full: number;
    bezier: number;
    close: number;
  };
  i: { linecap: number; linejoin: number; thickness: number };
}

export const tool_constructor = (): ToolI => {
  return {
    index: 0,
    settings: { size: { width: 600, height: 300 } },
    layers: [[], [], []],
    styles: [
      {
        thickness: 15,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        color: "#f00",
        fill: "none",
        mirror_style: 0,
        transform: "rotate(45)",
      },
      {
        thickness: 15,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        color: "#0f0",
        fill: "none",
        mirror_style: 0,
        transform: "rotate(45)",
      },
      {
        thickness: 15,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        color: "#00f",
        fill: "none",
        mirror_style: 0,
        transform: "rotate(45)",
      },
    ],
    vertices: [],
    reqs: {
      line: 2,
      arc_c: 2,
      arc_r: 2,
      arc_c_full: 2,
      arc_r_full: 2,
      bezier: 3,
      close: 0,
    },
    i: { linecap: 0, linejoin: 0, thickness: 5 },
  };
};

export const tool_start = (tool: ToolI, theme: Colors) => {
  tool.styles[0].color = theme.f_high;
  tool.styles[1].color = theme.f_med;
  tool.styles[2].color = theme.f_low;
};

export const tool_reset = (tool: ToolI, update: UpdateCallback) => {
  tool.styles[0].mirror_style = 0;
  tool.styles[1].mirror_style = 0;
  tool.styles[2].mirror_style = 0;
  tool.styles[0].fill = "none";
  tool.styles[1].fill = "none";
  tool.styles[2].fill = "none";
  tool_erase(tool, update);
  tool.vertices = [];
  tool.index = 0;
};

export const tool_erase = (tool: ToolI, update: UpdateCallback) => {
  tool.layers = [[], [], []];
  tool.vertices = [];
  update();
};

export const tool_clear = (tool: ToolI, update: UpdateCallback) => {
  tool.vertices = [];
  update();
};

export const tool_undo = (tool: ToolI, update: UpdateCallback, prev: () => Layers) => {
  tool.layers = prev();
  update();
};

export const tool_redo = (tool: ToolI, next: () => Layers, update: UpdateCallback) => {
  tool.layers = next();
  update();
};

export const tool_length = (tool: ToolI) => {
  return tool.layers[0].length + tool.layers[1].length + tool.layers[2].length;
};

// I/O

export const tool_export = (tool: ToolI) => {
  const target = {
    settings: tool.settings,
    layers: tool.layers,
    styles: tool.styles,
  };
  return jsonDump(target);
};

export const tool_import = (tool: ToolI, layer: SingleLayer, push: PushCallback, update: UpdateCallback) => {
  tool.layers[tool.index] = tool.layers[tool.index].concat(layer);
  push(tool.layers);
  tool_clear(tool, update);
  update();
};

export const tool_replace = (tool: ToolI, dot: ParsedTool, update: UpdateCallback, push: PushCallback, fitSize: () => void) => {
  if (!dot.layers || dot.layers.length !== 3) {
    console.warn("Incompatible version");
    return;
  }

  if (dot.settings.width && dot.settings.height) {
    dot.settings.size = {
      width: dot.settings.width,
      height: dot.settings.height,
    };
  }

  tool.layers = dot.layers;
  tool.styles = dot.styles;
  tool.settings = dot.settings;

  tool_clear(tool, update);
  fitSize();
  update();
  push(tool.layers);
};

// EDIT

export const tool_removeSegment = (tool: ToolI, update: UpdateCallback) => {
  if (tool.vertices.length > 0) {
    tool_clear(tool, update);
    return;
  }

  tool_layer(tool).pop();
  tool_clear(tool, update);
  update();
};

export const tool_removeSegmentsAt = (tool: ToolI, pos: Point, update: UpdateCallback) => {
  for (let segmentId = 0; segmentId < tool_layer(tool).length; segmentId += 1) {
    const segment = tool_layer(tool)[segmentId];
    for (let vertexId = 0; vertexId < segment.vertices.length; vertexId += 1) {
      const vertex = segment.vertices[vertexId];
      if (
        Math.abs(pos.x) === Math.abs(vertex.x) &&
        Math.abs(pos.y) === Math.abs(vertex.y)
      ) {
        segment.vertices.splice(vertexId, 1);
      }
    }
    if (segment.vertices.length < 2) {
      tool.layers[tool.index].splice(segmentId, 1);
    }
  }
  tool_clear(tool, update);
  update();
};

export const tool_selectSegmentAt = (
  tool: ToolI,
  pos: Point,
  source = tool_layer(tool)
) => {
  for (const segmentId in source) {
    const segment = source[segmentId];
    for (const vertexId in segment.vertices) {
      const vertex = segment.vertices[vertexId];
      if (vertex.x === Math.abs(pos.x) && vertex.y === Math.abs(pos.y)) {
        return segment;
      }
    }
  }
  return null;
};

export const tool_addVertex = (tool: ToolI, pos: Point, update: UpdateCallback) => {
  pos = { x: Math.abs(pos.x), y: Math.abs(pos.y) };
  tool.vertices.push(pos);
  update();
};

export const tool_vertexAt = (tool: ToolI, pos: Point) => {
  for (const segmentId in tool_layer(tool)) {
    const segment = tool_layer(tool)[segmentId];
    for (const vertexId in segment.vertices) {
      const vertex = segment.vertices[vertexId];
      if (vertex.x === Math.abs(pos.x) && vertex.y === Math.abs(pos.y)) {
        return vertex;
      }
    }
  }
  return null;
};

export const tool_addSegment = (
  tool: ToolI,
  type: SegmentType,
  vertices: Vertices,
  index = tool.index
) => {
  const appendTarget = tool_canAppend(tool,
    { type: type, vertices: vertices },
    index
  );
  const layer = tool_layer(tool, index);
  if (appendTarget) {
    const segment = layer[appendTarget];
    segment.vertices = segment.vertices.concat(vertices);
  } else {
    layer.push({ type: type, vertices: vertices });
  }
};

export const tool_cast = (tool: ToolI, type: SegmentType, update: UpdateCallback, push: PushCallback) => {
  if (!tool_layer(tool)) {
    tool.layers[tool.index] = [];
  }
  if (!tool_canCast(tool, type)) {
    console.warn("Cannot cast");
    return;
  }

  tool_addSegment(tool, type, tool.vertices.slice());

  push(tool.layers);

  tool_clear(tool, update);
  update();

  console.log(`Casted ${type} -> ${tool_layer(tool).length} elements`);
};

export const tool_toggle = (tool: ToolI, type: ToolType, update: UpdateCallback, mod = 1) => {
  if (type === "linecap") {
    const a: Array<CanvasLineCap> = ["butt", "square", "round"];
    tool.i.linecap += mod;
    tool_style(tool).strokeLinecap = a[tool.i.linecap % a.length];
  } else if (type === "linejoin") {
    const a: Array<CanvasLineJoin> = ["miter", "round", "bevel"];
    tool.i.linejoin += mod;
    tool_style(tool).strokeLinejoin = a[tool.i.linejoin % a.length];
  } else if (type === "fill") {
    tool_style(tool).fill =
      tool_style(tool).fill === "none" ? tool_style(tool).color : "none";
  } else if (type === "thickness") {
    tool_style(tool).thickness = clamp(tool_style(tool).thickness + mod, 1, 100);
  } else if (type === "mirror") {
    tool_style(tool).mirror_style =
      tool_style(tool).mirror_style > 2 ? 0 : tool_style(tool).mirror_style + 1;
  } else {
    console.warn("Unknown", type);
  }
  update();
  update();
};

// menu callback
// export const tool_misc = (tool: ToolI) => {
//   tool.client.picker.start();
// };

// menu callback
// export const tool_source = (tool: ToolI, type: SourceType) => {
//   if (type === "grid") {
//     tool.client.renderer.toggle();
//   }
//   if (type === "open") {
//     tool.client.source.open("grid", tool.client.whenOpen);
//   }
//   if (type === "save") {
//     tool.client.source.write(
//       "dotgrid",
//       "grid",
//       tool.client.tool.export(),
//       "text/plain"
//     );
//   }
//   if (type === "export") {
//     tool.client.source.write(
//       "dotgrid",
//       "svg",
//       tool.client.manager.toString(),
//       "image/svg+xml"
//     );
//   }
//   if (type === "render") {
//     tool.client.manager.toPNG(tool.client.tool.settings.size, (dataUrl) => {
//       tool.client.source.write("dotgrid", "png", dataUrl, "image/png");
//     });
//   }
// };

export const tool_canAppend = (
  tool: ToolI,
  content: { type: SegmentType; vertices: Vertices },
  index = tool.index
): number | false => {
  for (let id = 0; id < tool_layer(tool, index).length; id += 1) {
    const stroke = tool_layer(tool, index)[id];
    if (stroke.type !== content.type) {
      continue;
    }
    if (!stroke.vertices) {
      continue;
    }
    if (!stroke.vertices[stroke.vertices.length - 1]) {
      continue;
    }
    if (
      stroke.vertices[stroke.vertices.length - 1].x !== content.vertices[0].x
    ) {
      continue;
    }
    if (
      stroke.vertices[stroke.vertices.length - 1].y !== content.vertices[0].y
    ) {
      continue;
    }
    return id;
  }
  return false;
};

export const tool_canCast = (tool: ToolI, type?: SegmentType | null) => {
  if (!type) {
    return false;
  }
  // Cannot cast close twice
  if (type === "close") {
    const prev = tool_layer(tool)[tool_layer(tool).length - 1];
    if (!prev || prev.type === "close" || tool.vertices.length !== 0) {
      return false;
    }
  }
  if (type === "bezier") {
    if (
      tool.vertices.length !== 3 &&
      tool.vertices.length !== 5 &&
      tool.vertices.length !== 7 &&
      tool.vertices.length !== 9
    ) {
      return false;
    }
  }
  return tool.vertices.length >= tool.reqs[type];
};

export const tool_paths = (tool: ToolI, size: Size): [string, string, string] => {
  const gen = (index: number) => {
    return generate(
      tool.layers[index],
      mirror_from_style(tool.styles[index]),
      { x: 0, y: 0 },
      1, size
    );
  };

  return [gen(0), gen(1), gen(2)];
};

export const tool_path = (tool: ToolI, size: Size) => {
  return generate(
    tool_layer(tool),
    mirror_from_style(tool_style(tool)),
    { x: 0, y: 0 },
    1, size
  );
};

export const tool_translate = (tool: ToolI, a: Point, b: Point, push: PushCallback, update: UpdateCallback) => {
  for (const segmentId in tool_layer(tool)) {
    const segment = tool_layer(tool)[segmentId];
    for (const vertexId in segment.vertices) {
      const vertex = segment.vertices[vertexId];
      if (vertex.x === Math.abs(a.x) && vertex.y === Math.abs(a.y)) {
        segment.vertices[vertexId] = { x: Math.abs(b.x), y: Math.abs(b.y) };
      }
    }
  }
  push(tool.layers);
  tool_clear(tool, update);
  update();
};

export const tool_translateMulti = (tool: ToolI, a: Point, b: Point, push: PushCallback, update: UpdateCallback) => {
  const offset = { x: a.x - b.x, y: a.y - b.y };
  const segment = tool_selectSegmentAt(tool, a);

  if (!segment) {
    return;
  }

  for (const vertexId in segment.vertices) {
    const vertex = segment.vertices[vertexId];
    segment.vertices[vertexId] = {
      x: vertex.x - offset.x,
      y: vertex.y - offset.y,
    };
  }

  push(tool.layers);
  tool_clear(tool, update);
  update();
};

export const tool_translateLayer = (tool: ToolI, a: Point, b: Point, push: PushCallback, update: UpdateCallback) => {
  const offset = { x: a.x - b.x, y: a.y - b.y };
  for (const segmentId in tool_layer(tool)) {
    const segment = tool_layer(tool)[segmentId];
    for (const vertexId in segment.vertices) {
      const vertex = segment.vertices[vertexId];
      segment.vertices[vertexId] = {
        x: vertex.x - offset.x,
        y: vertex.y - offset.y,
      };
    }
  }
  push(tool.layers);
  tool_clear(tool, update);
  update();
};

export const tool_translateCopy = (tool: ToolI, a: Point, b: Point, push: PushCallback, update: UpdateCallback) => {
  const offset = { x: a.x - b.x, y: a.y - b.y };
  const segment = tool_selectSegmentAt(tool, a, structuredClone(tool_layer(tool)));

  if (!segment) {
    return;
  }

  for (const vertexId in segment.vertices) {
    const vertex = segment.vertices[vertexId];
    segment.vertices[vertexId] = {
      x: vertex.x - offset.x,
      y: vertex.y - offset.y,
    };
  }
  tool_layer(tool).push(segment);

  push(tool.layers);
  tool_clear(tool, update);
  update();
};

export const tool_merge = (tool: ToolI, push: PushCallback, update: UpdateCallback) => {
  const merged = new Array<Segment>()
    .concat(tool.layers[0])
    .concat(tool.layers[1])
    .concat(tool.layers[2]);
  tool_erase(tool, update);
  tool.layers[tool.index] = merged;

  push(tool.layers);
  tool_clear(tool, update);
  update();
};

// Style

export const tool_style = (tool: ToolI) => {
  if (!tool.styles[tool.index]) {
    tool.styles[tool.index] = {
      thickness: 15,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      color: "#f00",
      fill: "none",
      mirror_style: 0,
      transform: "rotate(45)",
    };
  }
  return tool.styles[tool.index];
};

// Layers

export const tool_layer = (tool: ToolI, index = tool.index) => {
  if (!tool.layers[index]) {
    tool.layers[index] = [];
  }
  return tool.layers[index];
};

export const tool_selectLayer = (tool: ToolI, id: number, update: UpdateCallback) => {
  tool.index = clamp(id, 0, 2);
  tool_clear(tool, update);
  update();
  console.log(`layer:${tool.index}`);
};

export const tool_selectNextLayer = (tool: ToolI, update: UpdateCallback) => {
  tool.index = tool.index >= 2 ? 0 : tool.index++;
  tool_selectLayer(tool, tool.index, update);
};

export const tool_selectPrevLayer = (tool: ToolI, update: UpdateCallback) => {
  tool.index = tool.index >= 0 ? 2 : tool.index--;
  tool_selectLayer(tool, tool.index, update);
};

export class Tool {
  client: Client;
  index: number;
  settings: { size: { width: number; height: number } };
  layers: Layers;
  vertices: Array<Point>;
  styles: Array<SingleStyle>;
  reqs: {
    line: number;
    arc_c: number;
    arc_r: number;
    arc_c_full: number;
    arc_r_full: number;
    bezier: number;
    close: number;
  };
  i: { linecap: number; linejoin: number; thickness: number };

  constructor(client: Client) {
    this.client = client;
    this.index = 0;
    this.settings = { size: { width: 600, height: 300 } };
    this.layers = [[], [], []];
    this.styles = [
      {
        thickness: 15,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        color: "#f00",
        fill: "none",
        mirror_style: 0,
        transform: "rotate(45)",
      },
      {
        thickness: 15,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        color: "#0f0",
        fill: "none",
        mirror_style: 0,
        transform: "rotate(45)",
      },
      {
        thickness: 15,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        color: "#00f",
        fill: "none",
        mirror_style: 0,
        transform: "rotate(45)",
      },
    ];
    this.vertices = [];
    this.reqs = {
      line: 2,
      arc_c: 2,
      arc_r: 2,
      arc_c_full: 2,
      arc_r_full: 2,
      bezier: 3,
      close: 0,
    };
    this.i = { linecap: 0, linejoin: 0, thickness: 5 };
  }

  start() {
    this.styles[0].color = this.client.theme.active.f_high;
    this.styles[1].color = this.client.theme.active.f_med;
    this.styles[2].color = this.client.theme.active.f_low;
  }

  reset() {
    this.styles[0].mirror_style = 0;
    this.styles[1].mirror_style = 0;
    this.styles[2].mirror_style = 0;
    this.styles[0].fill = "none";
    this.styles[1].fill = "none";
    this.styles[2].fill = "none";
    this.erase();
    this.vertices = [];
    this.index = 0;
  }

  erase() {
    this.layers = [[], [], []];
    this.vertices = [];
    this.client.renderer.update();
    this.client.interface.update(true);
  }

  clear() {
    this.vertices = [];
    this.client.renderer.update();
    this.client.interface.update(true);
  }

  undo() {
    this.layers = this.client.history.prev();
    this.client.renderer.update();
    this.client.interface.update(true);
  }

  redo() {
    this.layers = this.client.history.next();
    this.client.renderer.update();
    this.client.interface.update(true);
  }

  length() {
    return (
      this.layers[0].length + this.layers[1].length + this.layers[2].length
    );
  }

  // I/O

  export() {
    const target = {
      settings: this.settings,
      layers: this.layers,
      styles: this.styles,
    };
    return jsonDump(target);
  }

  import(layer: SingleLayer) {
    this.layers[this.index] = this.layers[this.index].concat(layer);
    this.client.history.push(this.layers);
    this.clear();
    this.client.renderer.update();
    this.client.interface.update(true);
  }

  replace(dot: ParsedTool) {
    if (!dot.layers || dot.layers.length !== 3) {
      console.warn("Incompatible version");
      return;
    }

    if (dot.settings.width && dot.settings.height) {
      dot.settings.size = {
        width: dot.settings.width,
        height: dot.settings.height,
      };
    }

    this.layers = dot.layers;
    this.styles = dot.styles;
    this.settings = dot.settings;

    this.clear();
    this.client.fitSize();
    this.client.renderer.update();
    this.client.interface.update(true);
    this.client.history.push(this.layers);
  }

  // EDIT

  removeSegment() {
    if (this.vertices.length > 0) {
      this.clear();
      return;
    }

    this.layer().pop();
    this.clear();
    this.client.renderer.update();
    this.client.interface.update(true);
  }

  removeSegmentsAt(pos: Point) {
    for (let segmentId = 0; segmentId < this.layer().length; segmentId += 1) {
      const segment = this.layer()[segmentId];
      for (
        let vertexId = 0;
        vertexId < segment.vertices.length;
        vertexId += 1
      ) {
        const vertex = segment.vertices[vertexId];
        if (
          Math.abs(pos.x) === Math.abs(vertex.x) &&
          Math.abs(pos.y) === Math.abs(vertex.y)
        ) {
          segment.vertices.splice(vertexId, 1);
        }
      }
      if (segment.vertices.length < 2) {
        this.layers[this.index].splice(segmentId, 1);
      }
    }
    this.clear();
    this.client.renderer.update();
    this.client.interface.update(true);
  }

  selectSegmentAt(pos: Point, source = this.layer()) {
    for (const segmentId in source) {
      const segment = source[segmentId];
      for (const vertexId in segment.vertices) {
        const vertex = segment.vertices[vertexId];
        if (vertex.x === Math.abs(pos.x) && vertex.y === Math.abs(pos.y)) {
          return segment;
        }
      }
    }
    return null;
  }

  addVertex(pos: Point) {
    pos = { x: Math.abs(pos.x), y: Math.abs(pos.y) };
    this.vertices.push(pos);
    this.client.interface.update(true);
  }

  vertexAt(pos: Point) {
    for (const segmentId in this.layer()) {
      const segment = this.layer()[segmentId];
      for (const vertexId in segment.vertices) {
        const vertex = segment.vertices[vertexId];
        if (vertex.x === Math.abs(pos.x) && vertex.y === Math.abs(pos.y)) {
          return vertex;
        }
      }
    }
    return null;
  }

  addSegment(type: SegmentType, vertices: Vertices, index = this.index) {
    const appendTarget = this.canAppend(
      { type: type, vertices: vertices },
      index
    );
    if (appendTarget) {
      this.layer(index)[appendTarget].vertices =
        this.layer(index)[appendTarget].vertices.concat(vertices);
    } else {
      this.layer(index).push({ type: type, vertices: vertices });
    }
  }

  cast(type: SegmentType) {
    if (!this.layer()) {
      this.layers[this.index] = [];
    }
    if (!this.canCast(type)) {
      console.warn("Cannot cast");
      return;
    }

    this.addSegment(type, this.vertices.slice());

    this.client.history.push(this.layers);

    this.clear();
    this.client.renderer.update();
    this.client.interface.update(true);

    console.log(`Casted ${type} -> ${this.layer().length} elements`);
  }

  toggle(type: ToolType, mod = 1) {
    if (type === "linecap") {
      const a: Array<CanvasLineCap> = ["butt", "square", "round"];
      this.i.linecap += mod;
      this.style().strokeLinecap = a[this.i.linecap % a.length];
    } else if (type === "linejoin") {
      const a: Array<CanvasLineJoin> = ["miter", "round", "bevel"];
      this.i.linejoin += mod;
      this.style().strokeLinejoin = a[this.i.linejoin % a.length];
    } else if (type === "fill") {
      this.style().fill =
        this.style().fill === "none" ? this.style().color : "none";
    } else if (type === "thickness") {
      this.style().thickness = clamp(this.style().thickness + mod, 1, 100);
    } else if (type === "mirror") {
      this.style().mirror_style =
        this.style().mirror_style > 2 ? 0 : this.style().mirror_style + 1;
    } else {
      console.warn("Unknown", type);
    }
    this.client.interface.update(true);
    this.client.renderer.update();
  }

  misc() {
    this.client.picker.start();
  }

  source(type: SourceType) {
    if (type === "grid") {
      this.client.renderer.toggle();
    }
    if (type === "open") {
      this.client.source.open("grid", this.client.whenOpen);
    }
    if (type === "save") {
      this.client.source.write(
        "dotgrid",
        "grid",
        this.client.tool.export(),
        "text/plain"
      );
    }
    if (type === "export") {
      this.client.source.write(
        "dotgrid",
        "svg",
        this.client.manager.toString(),
        "image/svg+xml"
      );
    }
    if (type === "render") {
      this.client.manager.toPNG(this.client.tool.settings.size, (dataUrl) => {
        this.client.source.write("dotgrid", "png", dataUrl, "image/png");
      });
    }
  }

  canAppend(
    content: { type: SegmentType; vertices: Vertices },
    index = this.index
  ): number | false {
    for (let id = 0; id < this.layer(index).length; id += 1) {
      const stroke = this.layer(index)[id];
      if (stroke.type !== content.type) {
        continue;
      }
      if (!stroke.vertices) {
        continue;
      }
      if (!stroke.vertices[stroke.vertices.length - 1]) {
        continue;
      }
      if (
        stroke.vertices[stroke.vertices.length - 1].x !== content.vertices[0].x
      ) {
        continue;
      }
      if (
        stroke.vertices[stroke.vertices.length - 1].y !== content.vertices[0].y
      ) {
        continue;
      }
      return id;
    }
    return false;
  }

  canCast(type?: SegmentType | null) {
    if (!type) {
      return false;
    }
    // Cannot cast close twice
    if (type === "close") {
      const prev = this.layer()[this.layer().length - 1];
      if (!prev || prev.type === "close" || this.vertices.length !== 0) {
        return false;
      }
    }
    if (type === "bezier") {
      if (
        this.vertices.length !== 3 &&
        this.vertices.length !== 5 &&
        this.vertices.length !== 7 &&
        this.vertices.length !== 9
      ) {
        return false;
      }
    }
    return this.vertices.length >= this.reqs[type];
  }

  paths(): [string, string, string] {
    const l1 = generate_wrap(
      this.client,
      this.client.tool.layers[0],
      this.client.tool.styles[0],
      { x: 0, y: 0 },
      1
    );
    const l2 = generate_wrap(
      this.client,
      this.client.tool.layers[1],
      this.client.tool.styles[1],
      { x: 0, y: 0 },
      1
    );
    const l3 = generate_wrap(
      this.client,
      this.client.tool.layers[2],
      this.client.tool.styles[2],
      { x: 0, y: 0 },
      1
    );

    return [l1, l2, l3];
  }

  path() {
    return generate_wrap(
      this.client,
      this.client.tool.layer(),
      this.client.tool.style(),
      { x: 0, y: 0 },
      1
    );
  }

  translate(a: Point, b: Point) {
    for (const segmentId in this.layer()) {
      const segment = this.layer()[segmentId];
      for (const vertexId in segment.vertices) {
        const vertex = segment.vertices[vertexId];
        if (vertex.x === Math.abs(a.x) && vertex.y === Math.abs(a.y)) {
          segment.vertices[vertexId] = { x: Math.abs(b.x), y: Math.abs(b.y) };
        }
      }
    }
    this.client.history.push(this.layers);
    this.clear();
    this.client.renderer.update();
  }

  translateMulti(a: Point, b: Point) {
    const offset = { x: a.x - b.x, y: a.y - b.y };
    const segment = this.selectSegmentAt(a);

    if (!segment) {
      return;
    }

    for (const vertexId in segment.vertices) {
      const vertex = segment.vertices[vertexId];
      segment.vertices[vertexId] = {
        x: vertex.x - offset.x,
        y: vertex.y - offset.y,
      };
    }

    this.client.history.push(this.layers);
    this.clear();
    this.client.renderer.update();
  }

  translateLayer(a: Point, b: Point) {
    const offset = { x: a.x - b.x, y: a.y - b.y };
    for (const segmentId in this.layer()) {
      const segment = this.layer()[segmentId];
      for (const vertexId in segment.vertices) {
        const vertex = segment.vertices[vertexId];
        segment.vertices[vertexId] = {
          x: vertex.x - offset.x,
          y: vertex.y - offset.y,
        };
      }
    }
    this.client.history.push(this.layers);
    this.clear();
    this.client.renderer.update();
  }

  translateCopy(a: Point, b: Point) {
    const offset = { x: a.x - b.x, y: a.y - b.y };
    const segment = this.selectSegmentAt(a, structuredClone(this.layer()));

    if (!segment) {
      return;
    }

    for (const vertexId in segment.vertices) {
      const vertex = segment.vertices[vertexId];
      segment.vertices[vertexId] = {
        x: vertex.x - offset.x,
        y: vertex.y - offset.y,
      };
    }
    this.layer().push(segment);

    this.client.history.push(this.layers);
    this.clear();
    this.client.renderer.update();
  }

  merge() {
    const merged = new Array<Segment>()
      .concat(this.layers[0])
      .concat(this.layers[1])
      .concat(this.layers[2]);
    this.erase();
    this.layers[this.index] = merged;

    this.client.history.push(this.layers);
    this.clear();
    this.client.renderer.update();
  }

  // Style

  style() {
    if (!this.styles[this.index]) {
      this.styles[this.index] = {
        thickness: 15,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        color: "#f00",
        fill: "none",
        mirror_style: 0,
        transform: "rotate(45)",
      };
    }
    return this.styles[this.index];
  }

  // Layers

  layer(index = this.index) {
    if (!this.layers[index]) {
      this.layers[index] = [];
    }
    return this.layers[index];
  }

  selectLayer(id: number) {
    this.index = clamp(id, 0, 2);
    this.clear();
    this.client.renderer.update();
    this.client.interface.update(true);
    console.log(`layer:${this.index}`);
  }

  selectNextLayer() {
    this.index = this.index >= 2 ? 0 : this.index++;
    this.selectLayer(this.index);
  }

  selectPrevLayer() {
    this.index = this.index >= 0 ? 2 : this.index--;
    this.selectLayer(this.index);
  }
}
