import type {
  Point,
  Layers,
  SingleLayer,
  Segment,
  SegmentType,
  Vertices,
  SingleStyle,
  Size,
  RenderingLayer,
  Mirror,
} from "./_types";
import { Client } from "./client";

import { generate, generate_wrap, mirror_from_style, set_mirror } from "./generator";
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

const LOCAL_STORAGE_KEY = 'dotgrid-file';

export const load_tool = (): ToolI | null => {
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

  const tool = tool_constructor();
  tool_replace(tool, JSON.parse(source), () => {}, () => {}, () => {});

  return tool;
}

export const save_tool = (tool: ToolI) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, tool_export(tool));
  }
  catch(x) {
    console.warn("Failure to save to local storage", x);
  }
}

export const tool_all_layers = (tool: ToolI, scale: number, size: Size): RenderingLayer[] => {
  return tool_paths(tool, scale, size).map((path, index) => {
    return {
      path: path,
      style: tool.styles[index]
    };
  });
}

export const empty_layers = (): Layers =>  [[], [], []];

export const tool_constructor = (): ToolI => {
  return {
    index: 0,
    settings: { size: { width: 300, height: 300 } },
    layers: empty_layers(),
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

export const tool_select_color = (tool: ToolI, hex: string) => {
  tool_style(tool).color = hex;
  tool_style(tool).fill = tool_style(tool).fill !== "none" ? hex : "none";
}

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

export const tool_removeSegmentsAt = (tool: ToolI, pos: Point, update: UpdateCallback, push: PushCallback) => {
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
  push(tool.layers);
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
    console.warn(`Cannot cast ${type}: ${tool.vertices.length}`);
    return;
  }

  tool_addSegment(tool, type, tool.vertices.slice());

  push(tool.layers);

  tool_clear(tool, update);
  update();

  console.log(`Casted ${type} -> ${tool_layer(tool).length} elements`);
};

export const tool_set_mirror = (tool: ToolI, mirror: Mirror) => {
  set_mirror(tool_style(tool), mirror);
}

export const tool_set_linecap = (tool: ToolI, lc: CanvasLineCap) => {
  tool_style(tool).strokeLinecap = lc;
}
export const tool_set_linejoin = (tool: ToolI, lj: CanvasLineJoin) => {
  tool_style(tool).strokeLinejoin = lj;
}
export const tool_set_thickness = (tool: ToolI, thickness: number) => {
  tool_style(tool).thickness = clamp(thickness, 1, 100);
}

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

export const tool_paths = (tool: ToolI, scale: number, size: Size): [string, string, string] => {
  const gen = (index: number) => {
    return generate(
      tool.layers[index],
      mirror_from_style(tool.styles[index]),
      { x: 0, y: 0 },
      scale, size
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
  tool: ToolI;

  constructor(client: Client) {
    this.client = client;
    this.tool = tool_constructor();
  }

  start() {
    tool_start(this.tool, this.client.theme.active);
  }

  reset() {
    tool_reset(this.tool, () => legacy_update(this.client.renderer, this.client.interface));
  }

  erase() {
    tool_erase(this.tool, () => legacy_update(this.client.renderer, this.client.interface));
  }

  clear() {
    tool_clear(this.tool, () => legacy_update(this.client.renderer, this.client.interface));
  }

  undo() {
    tool_undo(this.tool, () => legacy_update(this.client.renderer, this.client.interface), () => legacy_prev(this.client.history));
  }

  redo() {
    tool_redo(this.tool, () => legacy_next(this.client.history), () => legacy_update(this.client.renderer, this.client.interface));
  }

  length() {
    return tool_length(this.tool);
  }

  // I/O

  export() {
    return tool_export(this.tool);
  }

  import(layer: SingleLayer) {
    tool_import(this.tool, layer, lay => legacy_push(this.client.history, lay), () => legacy_update(this.client.renderer, this.client.interface));
  }

  replace(dot: ParsedTool) {
    tool_replace(this.tool, dot, () => legacy_update(this.client.renderer, this.client.interface), lay => legacy_push(this.client.history, lay), () => legacy_fitSize(this.client));
  }

  // EDIT

  removeSegment() {
    tool_removeSegment(this.tool, () => legacy_update(this.client.renderer, this.client.interface));
  }

  removeSegmentsAt(pos: Point) {
    tool_removeSegmentsAt(this.tool, pos, () => legacy_update(this.client.renderer, this.client.interface), ()=>{});
  }

  selectSegmentAt(pos: Point, source = this.layer()) {
    return tool_selectSegmentAt(this.tool, pos, source);
  }

  addVertex(pos: Point) {
    tool_addVertex(this.tool, pos, () => legacy_update(this.client.renderer, this.client.interface));
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

  addSegment(type: SegmentType, vertices: Vertices, index = this.tool.index) {
    tool_addSegment(this.tool, type, vertices, index);
  }

  cast(type: SegmentType) {
    tool_cast(this.tool, type, () => legacy_update(this.client.renderer, this.client.interface), (lay) => legacy_push(this.client.history, lay));
  }

  toggle(type: ToolType, mod = 1) {
    tool_toggle(this.tool, type, () => legacy_update(this.client.renderer, this.client.interface), mod);
  }

  // menu callback
  misc() {
    this.client.picker.start();
  }

  // menu callback
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
      this.client.manager.toPNG(this.client.tool.tool.settings.size, (dataUrl) => {
        this.client.source.write("dotgrid", "png", dataUrl, "image/png");
      });
    }
  }

  canAppend(
    content: { type: SegmentType; vertices: Vertices },
    index = this.tool.index
  ): number | false {
    
    return tool_canAppend(this.tool, content, index);
  }

  canCast(type?: SegmentType | null) {
    return tool_canCast(this.tool, type);
  }

  paths(): [string, string, string] {
    return tool_paths(this.tool, 1, this.tool.settings.size);
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
    tool_translate(this.tool, a, b, (lay) => legacy_push(this.client.history, lay), () => legacy_update(this.client.renderer, this.client.interface));
  }

  translateMulti(a: Point, b: Point) {
    tool_translateMulti(this.tool, a, b, (lay) => legacy_push(this.client.history, lay), () => legacy_update(this.client.renderer, this.client.interface));
  }

  translateLayer(a: Point, b: Point) {
    tool_translateLayer(this.tool, a, b, (lay) => legacy_push(this.client.history, lay), () => legacy_update(this.client.renderer, this.client.interface));
  }

  translateCopy(a: Point, b: Point) {
    tool_translateCopy(this.tool, a, b, (lay) => legacy_push(this.client.history, lay), () => legacy_update(this.client.renderer, this.client.interface));
  }

  merge() {
    tool_merge(this.tool, (lay) => legacy_push(this.client.history, lay), () => legacy_update(this.client.renderer, this.client.interface));
  }

  // Style

  style() {
    return tool_style(this.tool);
  }

  // Layers

  layer(index = this.tool.index) {
    return tool_layer(this.tool, index);
  }

  selectLayer(id: number) {
    tool_selectLayer(this.tool, id, () => legacy_update(this.client.renderer, this.client.interface));
  }

  selectNextLayer() {
    tool_selectNextLayer(this.tool, () => legacy_update(this.client.renderer, this.client.interface));
  }

  selectPrevLayer() {
    tool_selectPrevLayer(this.tool, () => legacy_update(this.client.renderer, this.client.interface));
  }
}
