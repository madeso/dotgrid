import type {
  Point,
  Layers,
  Segment,
  SegmentType,
  Vertices,
  SingleStyle,
  Size,
  RenderingLayer,
  Mirror,
} from "./_types";

import { svgpath_from_layer } from "./generator";
import { json_from_tool, tool_from_json } from "./io";

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

export type PushCallback = (lay: Layers) => void;

export interface Tool {
  layer_index: number;
  grid_spacing: number;
  settings: { size: Size };
  layers: Layers;
  vertices: Array<Point>;
  styles: Array<SingleStyle>;
}

const LOCAL_STORAGE_KEY = "dotgrid-file";

export const load_tool = (): Tool | null => {
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
  tool_from_json(tool, source);

  return tool;
};

export const save_tool = (tool: Tool) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, json_from_tool(tool, "compact"));
  } catch (x) {
    console.warn("Failure to save to local storage", x);
  }
};

export const rendering_layers_from_tool = (
  tool: Tool,
  scale: number,
  size: Size
): RenderingLayer[] => {
  return svgpath_from_tool(tool, scale, size).map((path, path_index) => {
    return {
      path: path,
      style: tool.styles[path_index],
    };
  });
};

export const empty_layers = (): Layers => [[], [], []];

export const default_style_first: SingleStyle = {
  thickness: 15,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  color: "#f00",
  fill: false,
  mirror: "none",
};
const default_style_second: SingleStyle = {
  thickness: 15,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  color: "#0f0",
  fill: false,
  mirror: "none",
};
const default_style_third: SingleStyle = {
  thickness: 15,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  color: "#00f",
  fill: false,
  mirror: "none",
};

export const tool_constructor = (): Tool => {
  return {
    layer_index: 0,
    settings: { size: { width: 300, height: 300 } },
    layers: empty_layers(),
    styles: [default_style_first, default_style_second, default_style_third],
    vertices: [],
    grid_spacing: 15
  };
};

// todo(Gustav): remove this
export const tool_select_color = (tool: Tool, hex: string) => {
  tool_get_style(tool).color = hex;
};

export const tool_reset = (tool: Tool) => {
  tool.styles[0].mirror = "none";
  tool.styles[1].mirror = "none";
  tool.styles[2].mirror = "none";
  tool.styles[0].fill = false;
  tool.styles[1].fill = false;
  tool.styles[2].fill = false;
  tool_erase(tool);
  tool.vertices = [];
  tool.layer_index = 0;
};

const tool_erase = (tool: Tool) => {
  tool.layers = [[], [], []];
  tool.vertices = [];
};

export const tool_clear = (tool: Tool) => {
  tool.vertices = [];
};

export const tool_undo = (tool: Tool, prev: () => Layers) => {
  tool.layers = prev();
};

export const tool_redo = (tool: Tool, next: () => Layers) => {
  tool.layers = next();
};

// EDIT

interface FoundPoint {
  segment: number;
  point: number;
}

const tool_find_points = (
  tool: Tool,
  pos: Point,
  layer_index?: number
): FoundPoint[] => {
  const found_points = new Array<FoundPoint>();

  const layer = tool_get_layer(tool, layer_index);

  for (let segmentId = 0; segmentId < layer.length; segmentId += 1) {
    const segment = layer[segmentId];
    for (
      let vertex_iter = 0;
      vertex_iter < segment.vertices.length;
      vertex_iter += 1
    ) {
      const vertex = segment.vertices[vertex_iter];
      if (
        Math.abs(pos.x) === Math.abs(vertex.x) &&
        Math.abs(pos.y) === Math.abs(vertex.y)
      ) {
        found_points.push({ segment: segmentId, point: vertex_iter });
      }
    }
  }

  return found_points;
};

export const tool_remove_segment_at = (
  tool: Tool,
  point: Point,
  push: PushCallback,
  layer?: number
) => {
  tool_clear(tool);

  const found = tool_find_points(tool, point, layer);
  if (found.length <= 0) return;
  tool_get_layer(tool, layer).splice(found[0].segment, 1);
  push(tool.layers);
};

export const tool_remove_point_at = (
  tool: Tool,
  pos: Point,
  push: PushCallback
) => {
  for (
    let segmentId = 0;
    segmentId < tool_get_layer(tool).length;
    segmentId += 1
  ) {
    const segment = tool_get_layer(tool)[segmentId];
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
      tool.layers[tool.layer_index].splice(segmentId, 1);
    }
  }
  tool_clear(tool);
  push(tool.layers);
};

const tool_select_segment_at = (
  tool: Tool,
  pos: Point,
  source = tool_get_layer(tool)
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

export const tool_add_vertex = (tool: Tool, pos: Point) => {
  pos = { x: Math.abs(pos.x), y: Math.abs(pos.y) };
  tool.vertices.push(pos);
};

export const tool_vertex_at = (tool: Tool, pos: Point) => {
  for (const segmentId in tool_get_layer(tool)) {
    const segment = tool_get_layer(tool)[segmentId];
    for (const vertexId in segment.vertices) {
      const vertex = segment.vertices[vertexId];
      if (vertex.x === Math.abs(pos.x) && vertex.y === Math.abs(pos.y)) {
        return vertex;
      }
    }
  }
  return null;
};

const tool_add_segment = (
  tool: Tool,
  type: SegmentType,
  vertices: Vertices,
  layer_index = tool.layer_index
) => {
  const appendTarget = tool_can_append(
    tool,
    { type: type, vertices: vertices },
    layer_index
  );
  const layer = tool_get_layer(tool, layer_index);
  if (appendTarget) {
    const segment = layer[appendTarget];
    segment.vertices = segment.vertices.concat(vertices);
  } else {
    layer.push({ type: type, vertices: vertices });
  }
};

export const tool_cast = (
  tool: Tool,
  type: SegmentType,
  push: PushCallback
) => {
  if (!tool_get_layer(tool)) {
    tool.layers[tool.layer_index] = [];
  }
  if (!tool_can_cast(tool, type)) {
    console.warn(`Cannot cast ${type}: ${tool.vertices.length}`);
    return;
  }

  tool_add_segment(tool, type, tool.vertices.slice());

  push(tool.layers);

  tool_clear(tool);

  console.log(`Casted ${type} -> ${tool_get_layer(tool).length} elements`);
};

export const tool_set_mirror = (tool: Tool, mirror: Mirror) => {
  tool_get_style(tool).mirror = mirror;
};

export const tool_set_linecap = (tool: Tool, lc: CanvasLineCap) => {
  tool_get_style(tool).strokeLinecap = lc;
};
export const tool_set_linejoin = (tool: Tool, lj: CanvasLineJoin) => {
  tool_get_style(tool).strokeLinejoin = lj;
};
export const tool_set_thickness = (tool: Tool, thickness: number) => {
  tool_get_style(tool).thickness = clamp(thickness, 1, 100);
};

export const tool_toggle_fill = (tool: Tool) => {
  // todo(Gustav): remove this
  tool_get_style(tool).fill = !tool_get_style(tool).fill;
};

const tool_can_append = (
  tool: Tool,
  content: { type: SegmentType; vertices: Vertices },
  layer_index = tool.layer_index
): number | false => {
  for (let id = 0; id < tool_get_layer(tool, layer_index).length; id += 1) {
    const stroke = tool_get_layer(tool, layer_index)[id];
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

export const tool_can_cast = (tool: Tool, type?: SegmentType | null) => {
  if (!type) {
    return false;
  }
  // Cannot cast close twice
  if (type === "close") {
    const prev = tool_get_layer(tool)[tool_get_layer(tool).length - 1];
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

  const required_vertices = {
    line: 2,
    arc_c: 2,
    arc_r: 2,
    arc_c_full: 2,
    arc_r_full: 2,
    bezier: 3,
    close: 0,
  };

  return tool.vertices.length >= required_vertices[type];
};

export const svgpath_from_tool = (
  tool: Tool,
  scale: number,
  size: Size
): [string, string, string] => {
  const svgpath_from_layer_index = (layer_index: number) => {
    return svgpath_from_layer(
      tool.layers[layer_index],
      tool.styles[layer_index].mirror,
      { x: 0, y: 0 },
      scale,
      size
    );
  };

  return [
    svgpath_from_layer_index(0),
    svgpath_from_layer_index(1),
    svgpath_from_layer_index(2),
  ];
};

export const svgpath_from_current_layer = (tool: Tool, size: Size) => {
  return svgpath_from_layer(
    tool_get_layer(tool),
    tool_get_style(tool).mirror,
    { x: 0, y: 0 },
    1,
    size
  );
};

export const tool_translate = (
  tool: Tool,
  a: Point,
  b: Point,
  push: PushCallback
) => {
  for (const segmentId in tool_get_layer(tool)) {
    const segment = tool_get_layer(tool)[segmentId];
    for (const vertexId in segment.vertices) {
      const vertex = segment.vertices[vertexId];
      if (vertex.x === Math.abs(a.x) && vertex.y === Math.abs(a.y)) {
        segment.vertices[vertexId] = { x: Math.abs(b.x), y: Math.abs(b.y) };
      }
    }
  }
  push(tool.layers);
  tool_clear(tool);
};

export const tool_translate_multi = (
  tool: Tool,
  a: Point,
  b: Point,
  push: PushCallback
) => {
  const offset = { x: a.x - b.x, y: a.y - b.y };
  const segment = tool_select_segment_at(tool, a);

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
  tool_clear(tool);
};

export const tool_translate_layer = (
  tool: Tool,
  a: Point,
  b: Point,
  push: PushCallback
) => {
  const offset = { x: a.x - b.x, y: a.y - b.y };
  for (const segmentId in tool_get_layer(tool)) {
    const segment = tool_get_layer(tool)[segmentId];
    for (const vertexId in segment.vertices) {
      const vertex = segment.vertices[vertexId];
      segment.vertices[vertexId] = {
        x: vertex.x - offset.x,
        y: vertex.y - offset.y,
      };
    }
  }
  push(tool.layers);
  tool_clear(tool);
};

export const tool_translate_copy = (
  tool: Tool,
  a: Point,
  b: Point,
  push: PushCallback
) => {
  const offset = { x: a.x - b.x, y: a.y - b.y };
  const segment = tool_select_segment_at(
    tool,
    a,
    structuredClone(tool_get_layer(tool))
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
  tool_get_layer(tool).push(segment);

  push(tool.layers);
  tool_clear(tool);
};

export const tool_merge_layers = (tool: Tool, push: PushCallback) => {
  const merged = new Array<Segment>()
    .concat(tool.layers[0])
    .concat(tool.layers[1])
    .concat(tool.layers[2]);
  tool_erase(tool);
  tool.layers[tool.layer_index] = merged;

  push(tool.layers);
  tool_clear(tool);
};

// Style

export const tool_get_style = (tool: Tool) => {
  if (!tool.styles[tool.layer_index]) {
    tool.styles[tool.layer_index] = {
      thickness: 15,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      color: "#f00",
      fill: false,
      mirror: "none",
    };
  }
  return tool.styles[tool.layer_index];
};

// Layers

export const tool_get_layer = (tool: Tool, layer_index = tool.layer_index) => {
  if (!tool.layers[layer_index]) {
    tool.layers[layer_index] = [];
  }
  return tool.layers[layer_index];
};

export const tool_set_layer_index = (tool: Tool, id: number) => {
  tool.layer_index = clamp(id, 0, 2);
  tool_clear(tool);
  console.log(`layer:${tool.layer_index}`);
};
