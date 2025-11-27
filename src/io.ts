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
  tool_clear,
  tool_get_layer,
  type PushCallback,
  type Tool,
} from "./tool";

interface JsonObject {
  [name: string]: unknown;
}
interface Log {
  message: string;
}
interface Reporter {
  logs: Log[];
}

class Filer {
  is_loading: boolean;
  object: JsonObject;
  reporter: Reporter;

  constructor(il: boolean, o: JsonObject, rep: Reporter) {
    this.is_loading = il;
    this.object = o;
    this.reporter = rep;
  }

  prop_array<T>(
    key: string,
    def: T[],
    on: (f: Filer, t: T | undefined) => void
  ) {
    if (this.is_loading) {
      const root = this.object[key];
      if (root === undefined) {
        this.reporter.logs.push({ message: `Missing required array ${key}` });
        return;
      }
      if (!Array.isArray(root)) {
        this.reporter.logs.push({
          message: `Required array ${key} was ${typeof root}`,
        });
        return;
      }
      root.forEach((item) => {
        on(
          new Filer(this.is_loading, item as JsonObject, this.reporter),
          undefined
        );
      });
    } else {
      // todo
      this.object[key] = def.map((_item, index) => {
        const ref: JsonObject = {};
        on(new Filer(this.is_loading, ref, this.reporter), def[index]);
        return ref;
      });
    }
  }

  prop_array_of_arrays<T>(
    key: string,
    def: T[][],
    on: (f: Filer, t: T | undefined) => void
  ) {
    if (this.is_loading) {
      const root = this.object[key];
      if (root === undefined) {
        this.reporter.logs.push({
          message: `Missing required array of arrays ${key}`,
        });
        return;
      }
      if (!Array.isArray(root)) {
        this.reporter.logs.push({
          message: `Required array of arrays ${key} was ${typeof root}`,
        });
        return;
      }
      root.forEach((subArray) => {
        if (!Array.isArray(subArray)) {
          this.reporter.logs.push({
            message: `Expected sub-array in ${key}, got ${typeof subArray}`,
          });
          return;
        }
        subArray.forEach((item) => {
          on(
            new Filer(this.is_loading, item as JsonObject, this.reporter),
            undefined
          );
        });
      });
    } else {
      this.object[key] = def.map((subArray) => {
        return subArray.map((_item, index) => {
          const ref: JsonObject = {};
          on(new Filer(this.is_loading, ref, this.reporter), subArray[index]);
          return ref;
        });
      });
    }
  }

  prop_object(key: string, on: (f: Filer) => void) {
    if (this.is_loading) {
      const ref = this.object[key];
      if (ref === undefined) {
        this.reporter.logs.push({ message: `Missing required object ${key}` });
        return;
      }
      if (typeof ref !== "object") {
        this.reporter.logs.push({
          message: `Required object ${key} was ${typeof ref}`,
        });
        return;
      }
      on(new Filer(this.is_loading, ref as JsonObject, this.reporter));
    } else {
      const ref: JsonObject = {};
      on(new Filer(this.is_loading, ref, this.reporter));
      this.object[key] = ref;
    }
  }

  prop_string(key: string, def: string): string {
    if (this.is_loading) {
      const ref = this.object[key];
      if (ref === undefined) {
        this.reporter.logs.push({ message: `Missing required string ${key}` });
        return def;
      }
      if (typeof ref !== "string") {
        this.reporter.logs.push({
          message: `Required string ${key} was ${typeof ref}`,
        });
        return def;
      }
      return ref;
    } else {
      this.object[key] = def;
      return def;
    }
  }

  prop_number(key: string, def: number): number {
    if (this.is_loading) {
      const ref = this.object[key];
      if (ref === undefined) {
        this.reporter.logs.push({ message: `Missing required number ${key}` });
        return def;
      }
      if (typeof ref !== "number") {
        this.reporter.logs.push({
          message: `Required number ${key} was ${typeof ref}`,
        });
        return def;
      }
      return ref;
    } else {
      this.object[key] = def;
      return def;
    }
  }
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

const fil_enum = <TObj extends NonNullable<unknown>, TKey extends keyof TObj>(
  fil: Filer,
  prop_key: string,
  root: TObj | null | undefined,
  root_key: TKey,
  def: TObj[TKey],
  mapper: EnumMapper<string, TObj[TKey]>
): void => {
  type T = TObj[TKey];
  const set = (new_value: T) => {
    if (!root) return;
    root[root_key] = new_value;
  };
  const val = root?.[root_key] ?? def;
  const str = mapper.from_value(val);
  if (str === undefined) {
    console.error(`INTERNAL ERROR: ${val} was not included in mapper`);
    set(def);
    return;
  }
  const valueStr = fil.prop_string(prop_key, str);
  const new_value =
    mapper.from_name(valueStr, () => {
      fil.reporter.logs.push({
        message: `Invalid value ${valueStr} for "${prop_key}"`,
      });
    }) ?? def;
  set(new_value);
};

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

// ------------------------------------------------------------------------------------------------
// serialize

const sr_point = (fil: Filer, vert: Point | undefined) => {
  const x = fil.prop_number("x", vert?.x ?? 0);
  const y = fil.prop_number("y", vert?.y ?? 0);
  if (vert) {
    vert.x = x;
    vert.y = y;
  }
};

const sr_segment = (fil: Filer, seg: Segment | undefined) => {
  fil.prop_array("vertices", seg?.vertices ?? [], sr_point);
  fil_enum(fil, "type", seg, "type", "line", m_segment);
};

const sr_style = (fil: Filer, style: SingleStyle | undefined) => {
  const color = fil.prop_string("color", style?.color ?? "#FF0000");
  const thickness = fil.prop_number("thickness", style?.thickness ?? 10);

  fil_enum(fil, "strokeLinecap", style, "strokeLinecap", "round", m_linecap);
  fil_enum(fil, "strokeLineJoin", style, "strokeLinejoin", "round", m_linejoin);
  fil_enum(fil, "mirror", style, "mirror", "none", m_mirror);

  if (style) {
    style.color = color;
    style.thickness = thickness;
  }
};

const sr_tool = (filer: Filer, tool: Tool) => {
  tool.layer_index = filer.prop_number("index", tool.layer_index);
  filer.prop_array("vertices", tool.vertices, sr_point);
  filer.prop_array_of_arrays("layers", tool.layers, sr_segment);
  filer.prop_array("styles", tool.styles, sr_style);
  filer.prop_object("size", (fil) => {
    const size = tool.settings.size;
    size.width = fil.prop_number("width", size.width);
    size.height = fil.prop_number("height", size.height);
  });
};

// ------------------------------------------------------------------------------------------------

// todo(Gustav): remove this test function
const test_filer = (tool: Tool) => {
  const filer = new Filer(false, {}, { logs: [] });

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
