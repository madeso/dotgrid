import type { Layers, SingleStyle } from "./_types";
import { json_from_unknown, type PrettyOrCompact } from "./json";
import {
  tool_clear,
  tool_get_layer,
  type PushCallback,
  type Tool,
} from "./tool";

interface ParsedTool {
  layers?: Layers;
  settings: {
    size: { width: number; height: number };
    width?: number;
    height?: number;
  };
  styles: Array<SingleStyle>;
}

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
