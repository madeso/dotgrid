/* global XMLSerializer */
/* global btoa */
/* global Image */

import { fill_color_from_style, type Size } from "./_types";
import { svgpath_from_tool, type Tool } from "./tool";

const create_svg_export = (setting_size: Size, tool: Tool): string => {
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

  const svg = { el: this_el, layers: this_layers };

  svg.el.setAttribute("width", setting_size.width + "px");
  svg.el.setAttribute("height", setting_size.height + "px");
  svg.el.style.width = setting_size.width.toString();
  svg.el.style.height = setting_size.height.toString();

  const styles = tool.styles;
  const paths = svgpath_from_tool(tool, 1, setting_size);

  for (const id in svg.layers) {
    const style = styles[id];
    const path = paths[id];
    const layer = svg.layers[id];

    layer.style.strokeWidth = style.thickness.toString();
    layer.style.strokeLinecap = style.strokeLinecap;
    layer.style.strokeLinejoin = style.strokeLinejoin;
    layer.style.stroke = style.color;
    layer.style.fill = fill_color_from_style(style);

    layer.setAttribute("d", path);
  }

  return new XMLSerializer().serializeToString(svg.el);
};

const create_base64_image_string = (xml: string) => {
  const svg64 = btoa(xml);
  const b64Start = "data:image/svg+xml;base64,";
  return b64Start + svg64;
};

export const export_to_png = (
  callback: (dataUrl: string) => void,
  tool: Tool
) => {
  const size = tool.settings.size;
  const svg = create_svg_export(size, tool);
  const image64 = create_base64_image_string(svg);
  export_png_image(size, callback, image64);
};

export const export_to_svg = (tool: Tool) => {
  const size = tool.settings.size;
  return create_svg_export(size, tool);
};

const export_png_image = (
  size: Size,
  callback: (dataUrl: string) => void,
  image_source: string
) => {
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
  img.src = image_source;
};
