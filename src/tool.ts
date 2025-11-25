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

import { generate } from "./generator";

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

export const jsonDump = (target: unknown) => {
  return JSON.stringify(structuredClone(target), null, 2);
};

type UpdateCallback = () => void;
type PushCallback = (lay: Layers) => void;

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

const LOCAL_STORAGE_KEY = "dotgrid-file";

export const load_tool = (): ToolI | null => {
  const source = (() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEY);
    } catch (x) {
      console.warn("Failure to get from local storage", x);
      return null;
    }
  })();
  if (source === null) return null;

  const tool = tool_constructor();
  tool_replace(
    tool,
    JSON.parse(source),
    () => {},
    () => {},
    () => {}
  );

  return tool;
};

export const save_tool = (tool: ToolI) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, tool_export(tool));
  } catch (x) {
    console.warn("Failure to save to local storage", x);
  }
};

export const tool_all_layers = (
  tool: ToolI,
  scale: number,
  size: Size
): RenderingLayer[] => {
  return tool_paths(tool, scale, size).map((path, index) => {
    return {
      path: path,
      style: tool.styles[index],
    };
  });
};

export const empty_layers = (): Layers => [[], [], []];

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
        mirror_style: "none",
        transform: "rotate(45)",
      },
      {
        thickness: 15,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        color: "#0f0",
        fill: "none",
        mirror_style: "none",
        transform: "rotate(45)",
      },
      {
        thickness: 15,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        color: "#00f",
        fill: "none",
        mirror_style: "none",
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
};

export const tool_reset = (tool: ToolI, update: UpdateCallback) => {
  tool.styles[0].mirror_style = "none";
  tool.styles[1].mirror_style = "none";
  tool.styles[2].mirror_style = "none";
  tool.styles[0].fill = "none";
  tool.styles[1].fill = "none";
  tool.styles[2].fill = "none";
  tool_erase(tool, update);
  tool.vertices = [];
  tool.index = 0;
};

const tool_erase = (tool: ToolI, update: UpdateCallback) => {
  tool.layers = [[], [], []];
  tool.vertices = [];
  update();
};

export const tool_clear = (tool: ToolI, update: UpdateCallback) => {
  tool.vertices = [];
  update();
};

export const tool_undo = (
  tool: ToolI,
  update: UpdateCallback,
  prev: () => Layers
) => {
  tool.layers = prev();
  update();
};

export const tool_redo = (
  tool: ToolI,
  next: () => Layers,
  update: UpdateCallback
) => {
  tool.layers = next();
  update();
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

export const tool_import = (
  tool: ToolI,
  layer: SingleLayer,
  push: PushCallback,
  update: UpdateCallback
) => {
  tool.layers[tool.index] = tool.layers[tool.index].concat(layer);
  push(tool.layers);
  tool_clear(tool, update);
  update();
};

export const tool_replace = (
  tool: ToolI,
  dot: ParsedTool,
  update: UpdateCallback,
  push: PushCallback,
  fitSize: () => void
) => {
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

interface FoundPoint {
  segment: number;
  point: number;
}

const tool_find_points = (
  tool: ToolI,
  pos: Point,
  layer_index?: number
): FoundPoint[] => {
  const found_points = new Array<FoundPoint>();

  const layer = tool_layer(tool, layer_index);

  for (let segmentId = 0; segmentId < layer.length; segmentId += 1) {
    const segment = layer[segmentId];
    for (let vertexId = 0; vertexId < segment.vertices.length; vertexId += 1) {
      const vertex = segment.vertices[vertexId];
      if (
        Math.abs(pos.x) === Math.abs(vertex.x) &&
        Math.abs(pos.y) === Math.abs(vertex.y)
      ) {
        found_points.push({ segment: segmentId, point: vertexId });
      }
    }
  }

  return found_points;
};

export const tool_removeSegmentAt = (
  tool: ToolI,
  point: Point,
  push: PushCallback,
  layer?: number
) => {
  tool_clear(tool, () => {});

  const found = tool_find_points(tool, point, layer);
  if (found.length <= 0) return;
  tool_layer(tool, layer).splice(found[0].segment, 1);
  push(tool.layers);
};

export const tool_removePointAt = (
  tool: ToolI,
  pos: Point,
  update: UpdateCallback,
  push: PushCallback
) => {
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

const tool_selectSegmentAt = (
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

export const tool_addVertex = (
  tool: ToolI,
  pos: Point,
  update: UpdateCallback
) => {
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

const tool_addSegment = (
  tool: ToolI,
  type: SegmentType,
  vertices: Vertices,
  index = tool.index
) => {
  const appendTarget = tool_canAppend(
    tool,
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

export const tool_cast = (
  tool: ToolI,
  type: SegmentType,
  update: UpdateCallback,
  push: PushCallback
) => {
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
  tool_style(tool).mirror_style = mirror;
};

export const tool_set_linecap = (tool: ToolI, lc: CanvasLineCap) => {
  tool_style(tool).strokeLinecap = lc;
};
export const tool_set_linejoin = (tool: ToolI, lj: CanvasLineJoin) => {
  tool_style(tool).strokeLinejoin = lj;
};
export const tool_set_thickness = (tool: ToolI, thickness: number) => {
  tool_style(tool).thickness = clamp(thickness, 1, 100);
};

export const tool_toggle = (
  tool: ToolI,
  type: ToolType,
  update: UpdateCallback,
  mod = 1
) => {
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
    tool_style(tool).thickness = clamp(
      tool_style(tool).thickness + mod,
      1,
      100
    );
  } else if (type === "mirror") {
    console.log("mirror not implemented anymore");
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

const tool_canAppend = (
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

export const tool_paths = (
  tool: ToolI,
  scale: number,
  size: Size
): [string, string, string] => {
  const gen = (index: number) => {
    return generate(
      tool.layers[index],
      tool.styles[index].mirror_style,
      { x: 0, y: 0 },
      scale,
      size
    );
  };

  return [gen(0), gen(1), gen(2)];
};

export const tool_path = (tool: ToolI, size: Size) => {
  return generate(
    tool_layer(tool),
    tool_style(tool).mirror_style,
    { x: 0, y: 0 },
    1,
    size
  );
};

export const tool_translate = (
  tool: ToolI,
  a: Point,
  b: Point,
  push: PushCallback,
  update: UpdateCallback
) => {
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

export const tool_translateMulti = (
  tool: ToolI,
  a: Point,
  b: Point,
  push: PushCallback,
  update: UpdateCallback
) => {
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

export const tool_translateLayer = (
  tool: ToolI,
  a: Point,
  b: Point,
  push: PushCallback,
  update: UpdateCallback
) => {
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

export const tool_translateCopy = (
  tool: ToolI,
  a: Point,
  b: Point,
  push: PushCallback,
  update: UpdateCallback
) => {
  const offset = { x: a.x - b.x, y: a.y - b.y };
  const segment = tool_selectSegmentAt(
    tool,
    a,
    structuredClone(tool_layer(tool))
  );

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

export const tool_merge = (
  tool: ToolI,
  push: PushCallback,
  update: UpdateCallback
) => {
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
      mirror_style: "none",
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

export const tool_selectLayer = (
  tool: ToolI,
  id: number,
  update: UpdateCallback
) => {
  tool.index = clamp(id, 0, 2);
  tool_clear(tool, update);
  update();
  console.log(`layer:${tool.index}`);
};
