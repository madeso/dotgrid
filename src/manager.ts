/* global XMLSerializer */
/* global btoa */
/* global Image */
/* global Blob */

import { Client } from "./client";

export class Manager {
  client: Client;
  el: SVGElement;
  layers: Array<SVGPathElement>;

  constructor(client: Client) {
    // Create SVG parts
    this.client = client;
    this.el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.el.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    this.el.setAttribute("baseProfile", "full");
    this.el.setAttribute("version", "1.1");
    this.el.style.fill = "none";

    this.layers = [];
  }

  install() {
    this.el.appendChild(
      (this.layers[2] = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      ))
    );
    this.el.appendChild(
      (this.layers[1] = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      ))
    );
    this.el.appendChild(
      (this.layers[0] = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      ))
    );
  }

  update() {
    this.el.setAttribute("width", this.client.tool.settings.size.width + "px");
    this.el.setAttribute(
      "height",
      this.client.tool.settings.size.height + "px"
    );
    this.el.style.width = this.client.tool.settings.size.width;
    this.el.style.height = this.client.tool.settings.size.height;

    const styles = this.client.tool.styles;
    const paths = this.client.tool.paths();

    for (const id in this.layers) {
      const style = styles[id];
      const path = paths[id];
      const layer = this.layers[id];

      layer.style.strokeWidth = style.thickness;
      layer.style.strokeLinecap = style.strokeLinecap;
      layer.style.strokeLinejoin = style.strokeLinejoin;
      layer.style.stroke = style.color;
      layer.style.fill = style.fill;

      layer.setAttribute("d", path);
    }
  }

  svg64() {
    const xml = new XMLSerializer().serializeToString(this.el);
    const svg64 = btoa(xml);
    const b64Start = "data:image/svg+xml;base64,";
    return b64Start + svg64;
  }

  // Exporters

  toPNG(
    size = this.client.tool.settings.size,
    callback: (dataUrl: string) => void
  ) {
    this.update();

    const image64 = this.svg64();
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
  }

  toSVG(callback: (image64: string, name: string) => void) {
    this.update();

    const image64 = this.svg64();
    callback(image64, "export.svg");
  }

  toGRID(callback: (objectUrl: string, name: string) => void) {
    this.update();

    const text = this.client.tool.export();
    const file = new Blob([text], { type: "text/plain" });
    callback(URL.createObjectURL(file), "export.grid");
  }

  toString() {
    return new XMLSerializer().serializeToString(this.el);
  }
}
