import {
  Point,
  Layers,
  SingleLayer,
  Segment,
  SegmentType,
  Vertices,
  SingleStyle,
} from "./_types";
import { Client } from "./client";

import { Generator } from "./generator";

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

export const jsonDump = (target: any) => {
  return JSON.stringify(structuredClone(target), null, 2);
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
    const l1 = new Generator(
      this.client,
      this.client.tool.layers[0],
      this.client.tool.styles[0]
    ).toString({ x: 0, y: 0 }, 1);
    const l2 = new Generator(
      this.client,
      this.client.tool.layers[1],
      this.client.tool.styles[1]
    ).toString({ x: 0, y: 0 }, 1);
    const l3 = new Generator(
      this.client,
      this.client.tool.layers[2],
      this.client.tool.styles[2]
    ).toString({ x: 0, y: 0 }, 1);

    return [l1, l2, l3];
  }

  path() {
    return new Generator(
      this.client,
      this.client.tool.layer(),
      this.client.tool.style()
    ).toString({ x: 0, y: 0 }, 1);
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
