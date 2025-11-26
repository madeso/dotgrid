import type { Mirror, Point, Segment, SingleLayer, Size } from "./_types";

function rotate_point(point: Point, origin: Point, angle: number) {
  angle = (angle * Math.PI) / 180.0;
  return {
    x: parseInt(
      (
        Math.cos(angle) * (point.x - origin.x) -
        Math.sin(angle) * (point.y - origin.y) +
        origin.x
      ).toFixed(1)
    ),
    y: parseInt(
      (
        Math.sin(angle) * (point.x - origin.x) +
        Math.cos(angle) * (point.y - origin.y) +
        origin.y
      ).toFixed(1)
    ),
  };
}

const svgpath_line = (a: Point) => {
  return `L${a.x},${a.y} `;
};

const svgpath_arc = (a?: Point, b?: Point, c?: string) => {
  if (!a || !b || !c) {
    return "";
  }

  const offset = { x: b.x - a.x, y: b.y - a.y };

  if (offset.x === 0 || offset.y === 0) {
    return svgpath_line(b);
  }
  return `A${Math.abs(b.x - a.x)},${Math.abs(b.y - a.y)} 0 ${c} ${b.x},${b.y} `;
};

const svgpath_bezier = (a?: Point, b?: Point) => {
  if (!a || !b) {
    return "";
  }
  return `Q${a.x},${a.y} ${b.x},${b.y} `;
};

const svgpath_from_segment = (
  prev: Point | null,
  segment: Segment,
  mirror: Mirror = "none"
) => {
  const type = segment.type;
  const vertices = segment.vertices;
  let svgpath = "";
  let vertices_to_skip = 0;

  for (let vertex_iter = 0; vertex_iter < vertices.length; vertex_iter += 1) {
    if (vertices_to_skip > 0) {
      vertices_to_skip -= 1;
      continue;
    }

    const vertex = vertices[vertex_iter];
    const next = vertices[vertex_iter + 1];
    const afterNext = vertices[vertex_iter + 2];

    if (vertex_iter === 0 && !prev) {
      svgpath += `M${vertex.x},${vertex.y} `;
    } else if (
      vertex_iter === 0 &&
      prev &&
      (prev.x !== vertex.x || prev.y !== vertex.y)
    ) {
      svgpath += `M${vertex.x},${vertex.y} `;
    }

    if (type === "line") {
      svgpath += svgpath_line(vertex);
    } else if (type === "arc_c") {
      const clock =
        mirror == "horizontal" || mirror == "vertical" ? "0,0" : "0,1";
      svgpath += svgpath_arc(vertex, next, clock);
    } else if (type === "arc_r") {
      const clock =
        mirror == "horizontal" || mirror == "vertical" ? "0,1" : "0,0";
      svgpath += svgpath_arc(vertex, next, clock);
    } else if (type === "arc_c_full") {
      const clock = mirror !== "none" ? "1,0" : "1,1";
      svgpath += svgpath_arc(vertex, next, clock);
    } else if (type === "arc_r_full") {
      const clock = mirror !== "none" ? "1,1" : "1,0";
      svgpath += svgpath_arc(vertex, next, clock);
    } else if (type === "bezier") {
      svgpath += svgpath_bezier(next, afterNext);
      vertices_to_skip = 1;
    }
  }

  if (segment.type === "close") {
    svgpath += "Z ";
  }

  return svgpath;
};

const mirror_layer = (
  size: Size,
  src_layer: SingleLayer,
  offset: Point,
  scale: number,
  mirror: Mirror,
  angle = 0
): SingleLayer => {
  const layer = structuredClone(src_layer);

  for (const segment of layer) {
    for (const vertex of segment.vertices) {
      if (mirror === "horizontal" || mirror === "diagonal") {
        vertex.x = size.width - vertex.x;
      }
      if (mirror === "vertical" || mirror === "diagonal") {
        vertex.y = size.height - vertex.y;
      }
      // Offset
      vertex.x += offset.x;
      vertex.y += offset.y;
      // Rotate
      const center = {
        x: size.width / 2 + offset.x + 7.5,
        y: size.height / 2 + offset.y + 30,
      };
      const rotated = rotate_point(vertex, center, angle);
      vertex.x = rotated.x;
      vertex.y = rotated.y;
      // Scale
      vertex.x *= scale;
      vertex.y *= scale;
    }
  }

  return layer;
};

const svgpath_from_layer_single_mirror = (
  layer: SingleLayer,
  mirror?: Mirror
) => {
  let svgpath = "";
  let prev = null;
  for (let segment_iter = 0; segment_iter < layer.length; segment_iter += 1) {
    const segment = layer[segment_iter];
    svgpath += svgpath_from_segment(prev, segment, mirror);
    prev = segment.vertices
      ? segment.vertices[segment.vertices.length - 1]
      : null;
  }
  return svgpath;
};

export const svgpath_from_layer = (
  layer: SingleLayer,
  mirror: Mirror,
  offset: Point,
  scale: number,
  size: Size
) => {
  let s = svgpath_from_layer_single_mirror(
    mirror_layer(size, layer, offset, scale, "none")
  );

  if (mirror !== "none") {
    s += svgpath_from_layer_single_mirror(
      mirror_layer(size, layer, offset, scale, mirror),
      mirror
    );
  }

  return s;
};
