/* global XMLSerializer */
/* global btoa */
/* global Image */

import type { Size } from "./_types";
import { tool_paths, type ToolI } from "./tool";

interface SvgExport {
  el: SVGElement;
  layers: Array<SVGPathElement>;
}

const create_elements = (): SvgExport => {
  const this_el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  this_el.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  this_el.setAttribute("baseProfile", "full");
  this_el.setAttribute("version", "1.1");
  this_el.style.fill = "none";

  const this_layers: Array<SVGPathElement> = [];

  this_el.appendChild(
    (this_layers[2] = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    ))
  );
  this_el.appendChild(
    (this_layers[1] = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    ))
  );
  this_el.appendChild(
    (this_layers[0] = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    ))
  );

  return { el: this_el, layers: this_layers };
};

const manager_update = (svg: SvgExport, setting_size: Size, tool: ToolI) => {
  svg.el.setAttribute("width", setting_size.width + "px");
  svg.el.setAttribute("height", setting_size.height + "px");
  svg.el.style.width = setting_size.width.toString();
  svg.el.style.height = setting_size.height.toString();

  const styles = tool.styles;
  const paths = tool_paths(tool, 1, setting_size);

  for (const id in svg.layers) {
    const style = styles[id];
    const path = paths[id];
    const layer = svg.layers[id];

    layer.style.strokeWidth = style.thickness.toString();
    layer.style.strokeLinecap = style.strokeLinecap;
    layer.style.strokeLinejoin = style.strokeLinejoin;
    layer.style.stroke = style.color;
    layer.style.fill = style.fill ?? "none";

    layer.setAttribute("d", path);
  }
};

const manager_svg64 = (svg: SvgExport) => {
  const xml = new XMLSerializer().serializeToString(svg.el);
  const svg64 = btoa(xml);
  const b64Start = "data:image/svg+xml;base64,";
  return b64Start + svg64;
};

export const manager_toPNG = (
  size: Size,
  callback: (dataUrl: string) => void,
  tool: ToolI
) => {
  const svg = create_elements();
  manager_update(svg, size, tool);

  const image64 = manager_svg64(svg);
  const img = new Image();
  const canvas = document.createElement("canvas");
  canvas.width = size.width * 2;
  canvas.height = size.height * 2;
  img.onload = () => {
    canvas
      .getContext("2d")
      ?.drawImage(img, 0, 0, size.width * 2, size.height * 2);
    callback(canvas.toDataURL("image/png"));
  };
  img.src = image64;
};

export const manager_toString = (size: Size, tool: ToolI) => {
  const svg = create_elements();
  manager_update(svg, size, tool);
  return new XMLSerializer().serializeToString(svg.el);
};
