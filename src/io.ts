import {
  type Layers,
  type Mirror,
  type Point,
  type Segment,
  type SegmentType,
  type SingleStyle,
} from "./_types";
import { json_from_unknown, type PrettyOrCompact } from "./json";
import {
  default_style_first,
  tool_clear,
  tool_get_layer,
  type PushCallback,
  type Tool,
} from "./tool";

type JsonObject = Record<string, unknown>;
interface Log {
  message: string;
}
export interface Reporter {
  logs: Log[];
}

class EnumMapper<TName, TValue> {
  name_from_value: Map<TValue, TName>;
  value_from_name: Map<TName, TValue>;

  constructor() {
    this.name_from_value = new Map();
    this.value_from_name = new Map();
  }

  map(values: { name: TName; value: TValue }[]) {
    for (const v of values) {
      this.name_from_value.set(v.value, v.name);
      this.value_from_name.set(v.name, v.value);
    }
    return this;
  }

  from_value(value: TValue): TName | undefined {
    return this.name_from_value.get(value);
  }

  from_name(name: TName, err: () => void): TValue | undefined {
    const r = this.value_from_name.get(name);
    if (r === undefined) {
      err();
    }
    return r;
  }
}

type LoadState = "load" | "save";

class Prop<TObj extends NonNullable<unknown>, TKey extends keyof TObj> {
  filer: Filer;
  root: TObj | null | undefined;
  key: TKey;

  constructor(f: Filer, r: TObj | null | undefined, k: TKey) {
    this.filer = f;
    this.root = r;
    this.key = k;
  }

  set(new_value: TObj[TKey]) {
    if (!this.root) return;
    this.root[this.key] = new_value;
  }

  get(): TObj[TKey] | undefined {
    if (!this.root) return undefined;
    return this.root[this.key];
  }

  enum_int(
    prop_key: string,
    def: TObj[TKey],
    mapper: EnumMapper<number, TObj[TKey]>
  ): void {
    const val = this.get() ?? def;
    const str = mapper.from_value(val);
    if (str === undefined) {
      console.error(`INTERNAL ERROR: ${val} was not included in mapper`);
      this.set(def);
      return;
    }
    const valueStr = this.filer.rd_number(prop_key, str);
    const new_value =
      mapper.from_name(valueStr, () => {
        this.filer.reporter.logs.push({
          message: `Invalid value ${valueStr} for ${this.filer.path}."${prop_key}"`,
        });
      }) ?? def;
    this.set(new_value);
  }

  enum(
    prop_key: string,
    def: TObj[TKey],
    mapper: EnumMapper<string, TObj[TKey]>
  ): void {
    const val = this.get() ?? def;
    const str = mapper.from_value(val);
    if (str === undefined) {
      console.error(`INTERNAL ERROR: ${val} was not included in mapper`);
      this.set(def);
      return;
    }
    const valueStr = this.filer.rd_string(prop_key, str);
    const new_value =
      mapper.from_name(valueStr, () => {
        this.filer.reporter.logs.push({
          message: `Invalid value ${valueStr} for ${this.filer.path}."${prop_key}"`,
        });
      }) ?? def;
    this.set(new_value);
  }
}

export class Filer {
  load_state: LoadState;
  object: JsonObject;
  reporter: Reporter;
  version: number;
  path: string;

  constructor(
    ls: LoadState,
    o: JsonObject,
    rep: Reporter,
    v: number = 0,
    p: string = ""
  ) {
    this.load_state = ls;
    this.object = o;
    this.reporter = rep;
    this.version = v;
    this.path = p;
  }

  sub(item: JsonObject, p: string) {
    return new Filer(
      this.load_state,
      item,
      this.reporter,
      this.version,
      this.path + "." + p
    );
  }

  prop_array<T>(
    key: string,
    value: T[],
    template: T,
    on: (f: Filer, t: T | undefined) => void
  ) {
    if (this.load_state === "load") {
      const root = this.object[key];
      if (root === undefined) {
        this.reporter.logs.push({
          message: `Missing required array ${this.path}.${key}`,
        });
        return;
      }
      if (!Array.isArray(root)) {
        this.reporter.logs.push({
          message: `Required array ${this.path}.${key} was ${typeof root}`,
        });
        return;
      }
      value.splice(0, value.length);
      root.forEach((item, item_index) => {
        const p = structuredClone(template);
        on(this.sub(item as JsonObject, `${key}[${item_index}]`), p);
        value.push(p);
      });
    } else {
      // todo
      this.object[key] = value.map((_item, item_index) => {
        const ref: JsonObject = {};
        on(this.sub(ref, `${key}[${item_index}]`), value[item_index]);
        return ref;
      });
    }
  }

  prop_array_of_arrays<T>(
    key: string,
    def: T[][],
    template: T,
    on: (f: Filer, t: T | undefined) => void
  ) {
    if (this.load_state === "load") {
      const root = this.object[key];
      if (root === undefined) {
        this.reporter.logs.push({
          message: `Missing required array of arrays ${this.path}.${key}`,
        });
        return;
      }
      if (!Array.isArray(root)) {
        this.reporter.logs.push({
          message: `Required array of arrays ${
            this.path
          }.${key} was ${typeof root}`,
        });
        return;
      }
      def.splice(0, def.length);
      root.forEach((subArray, sub_array_index) => {
        if (!Array.isArray(subArray)) {
          this.reporter.logs.push({
            message: `Expected sub-array in ${
              this.path
            }.${key}, got ${typeof subArray}`,
          });
          return;
        }
        const arr: T[] = [];
        subArray.forEach((item, item_index) => {
          const t = structuredClone(template);
          on(
            this.sub(
              item as JsonObject,
              `${key}[${sub_array_index}][${item_index}]`
            ),
            t
          );
          arr.push(t);
        });
        def.push(arr);
      });
    } else {
      this.object[key] = def.map((subArray, sub_array_index) => {
        return subArray.map((_item, index) => {
          const ref: JsonObject = {};
          on(
            this.sub(ref, `${key}[${sub_array_index}][${index}]`),
            subArray[index]
          );
          return ref;
        });
      });
    }
  }

  prop_object(key: string, on: (f: Filer) => void) {
    if (this.load_state === "load") {
      const ref = this.object[key];
      if (ref === undefined) {
        this.reporter.logs.push({
          message: `Missing required object ${this.path}.${key}`,
        });
        return;
      }
      if (typeof ref !== "object") {
        this.reporter.logs.push({
          message: `Required object ${this.path}.${key} was ${typeof ref}`,
        });
        return;
      }
      on(this.sub(ref as JsonObject, key));
    } else {
      const ref: JsonObject = {};
      on(this.sub(ref, key));
      this.object[key] = ref;
    }
  }

  rd_string(key: string, def: string): string {
    if (this.load_state === "load") {
      const ref = this.object[key];
      if (ref === undefined) {
        this.reporter.logs.push({
          message: `Missing required string ${this.path}.${key}`,
        });
        return def;
      }
      if (typeof ref !== "string") {
        this.reporter.logs.push({
          message: `Required string ${this.path}.${key} was ${typeof ref}`,
        });
        return def;
      }
      return ref;
    } else {
      this.object[key] = def;
      return def;
    }
  }

  rd_number(
    key: string,
    def: number,
    required: "required" | "optional" = "required"
  ): number {
    if (this.load_state === "load") {
      const ref = this.object[key];
      if (ref === undefined) {
        if (required === "required") {
          this.reporter.logs.push({
            message: `Missing required number ${this.path}.${key}`,
          });
        }
        return def;
      }
      if (typeof ref !== "number") {
        const err = `${this.path}.${key} was ${typeof ref}`;
        if (required === "required") {
          this.reporter.logs.push({ message: `Required number ${err}` });
        } else {
          this.reporter.logs.push({ message: `Optional number ${err}` });
        }
        return def;
      }
      return ref;
    } else {
      this.object[key] = def;
      return def;
    }
  }

  prop<TObj extends NonNullable<unknown>, TKey extends keyof TObj>(
    root: TObj | null | undefined,
    key: TKey
  ) {
    return new Prop(this, root, key);
  }
}

// ------------------------------------------------------------------------------------------------
// mappers

const m_segment = new EnumMapper<string, SegmentType>().map([
  { name: "arc_c_full", value: "arc_c_full" },
  { name: "arc_c", value: "arc_c" },
  { name: "arc_r_full", value: "arc_r_full" },
  { name: "arc_r", value: "arc_r" },
  { name: "bezier", value: "bezier" },
  { name: "close", value: "close" },
  { name: "line", value: "line" },
]);

const m_linecap = new EnumMapper<string, CanvasLineCap>().map([
  { name: "butt", value: "butt" },
  { name: "round", value: "round" },
  { name: "square", value: "square" },
]);
const m_linejoin = new EnumMapper<string, CanvasLineJoin>().map([
  { name: "bevel", value: "bevel" },
  { name: "miter", value: "miter" },
  { name: "round", value: "round" },
]);
const m_mirror = new EnumMapper<string, Mirror>().map([
  { name: "none", value: "none" },
  { name: "horizontal", value: "horizontal" },
  { name: "vertical", value: "vertical" },
  { name: "diagonal", value: "diagonal" },
]);
const m_mirror_int = new EnumMapper<number, Mirror>().map([
  { name: 0, value: "none" },
  { name: 1, value: "horizontal" },
  { name: 2, value: "vertical" },
  { name: 3, value: "diagonal" },
]);

// ------------------------------------------------------------------------------------------------
// serialize

const sr_point = (fil: Filer, vert: Point | undefined) => {
  const x = fil.rd_number("x", vert?.x ?? 0);
  const y = fil.rd_number("y", vert?.y ?? 0);
  if (vert) {
    vert.x = x;
    vert.y = y;
  }
};

const sr_segment = (fil: Filer, seg: Segment | undefined) => {
  fil.prop_array("vertices", seg?.vertices ?? [], { x: 0, y: 0 }, sr_point);
  fil.prop(seg, "type").enum("type", "line", m_segment);
};

const sr_style = (fil: Filer, style: SingleStyle | undefined) => {
  const color = fil.rd_string("color", style?.color ?? "#FF0000");
  const thickness = fil.rd_number("thickness", style?.thickness ?? 10);

  fil.prop(style, "strokeLinecap").enum("strokeLinecap", "round", m_linecap);
  if (fil.version === 0) {
    fil
      .prop(style, "strokeLinejoin")
      .enum("strokeLinejoin", "round", m_linejoin);
  } else {
    fil
      .prop(style, "strokeLinejoin")
      .enum("strokeLineJoin", "round", m_linejoin);
  }
  if (fil.version === 0) {
    fil.prop(style, "mirror").enum_int("mirror_style", "none", m_mirror_int);
  } else {
    fil.prop(style, "mirror").enum("mirror", "none", m_mirror);
  }

  if (style) {
    style.color = color;
    style.thickness = thickness;
  }
};

export const sr_tool = (filer: Filer, tool: Tool) => {
  filer.version = filer.rd_number("version", 0, "optional");

  if (filer.version > 0) {
    tool.layer_index = filer.rd_number("index", tool.layer_index);
    filer.prop_array("vertices", tool.vertices, { x: 0, y: 0 }, sr_point);
  }

  const seg: Segment = { type: "line", vertices: [] };
  filer.prop_array_of_arrays("layers", tool.layers, seg, sr_segment);
  filer.prop_array("styles", tool.styles, default_style_first, sr_style);
  if (filer.version === 0) {
    filer.prop_object("settings", (fil_settings) => {
      fil_settings.prop_object("size", (fil) => {
        const size = tool.settings.size;
        size.width = fil.rd_number("width", size.width);
        size.height = fil.rd_number("height", size.height);
      });
    });
  } else {
    filer.prop_object("size", (fil) => {
      const size = tool.settings.size;
      size.width = fil.rd_number("width", size.width);
      size.height = fil.rd_number("height", size.height);
    });
  }
};

// ------------------------------------------------------------------------------------------------

// todo(Gustav): remove this test function
const test_filer = (tool: Tool) => {
  const filer = new Filer("save", {}, { logs: [] });

  sr_tool(filer, tool);

  const j = json_from_unknown(filer.object, "pretty");
  console.log(j);
};

// todo(Gustav): remove this hack
interface ParsedTool {
  layers?: Layers;
  settings: {
    size: { width: number; height: number };
    width?: number;
    height?: number;
  };
  styles: Array<SingleStyle>;
}

// ------------------------------------------------------------------------------------------------

export const json_from_tool = (tool: Tool, pretty: PrettyOrCompact) => {
  const target = {
    settings: tool.settings,
    layers: tool.layers,
    styles: tool.styles,
  };
  return json_from_unknown(target, pretty);
};

export const tool_from_json = (tool: Tool, content: string) => {
  // todo(Gustav): validate parsed file...
  const dot: ParsedTool = JSON.parse(content);
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

  tool_clear(tool);

  test_filer(tool);
};

export const tool_export_current_layer = (tool: Tool) => {
  return json_from_unknown(tool_get_layer(tool), "pretty");
};

export const tool_import_layer = (
  tool: Tool,
  data: string,
  push: PushCallback
) => {
  const layer = JSON.parse(data.trim());
  tool.layers[tool.layer_index] = tool.layers[tool.layer_index].concat(layer);
  push(tool.layers);
  tool_clear(tool);
};
