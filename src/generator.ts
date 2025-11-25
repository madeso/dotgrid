import type {
  Mirror,
  Point,
  Segment,
  SingleLayer,
  SingleStyle,
  Size,
} from "./_types";

function rotatePoint(point: Point, origin: Point, angle: number) {
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

const _line = (a: Point) => {
  return `L${a.x},${a.y} `;
};

const _arc = (a?: Point, b?: Point, c?: string) => {
  if (!a || !b || !c) {
    return "";
  }

  const offset = { x: b.x - a.x, y: b.y - a.y };

  if (offset.x === 0 || offset.y === 0) {
    return _line(b);
  }
  return `A${Math.abs(b.x - a.x)},${Math.abs(b.y - a.y)} 0 ${c} ${b.x},${b.y} `;
};

const _bezier = (a?: Point, b?: Point) => {
  if (!a || !b) {
    return "";
  }
  return `Q${a.x},${a.y} ${b.x},${b.y} `;
};

const render = (
  prev: Point | null,
  segment: Segment,
  mirror: Mirror = "zero"
) => {
  const type = segment.type;
  const vertices = segment.vertices;
  let html = "";
  let skip = 0;

  for (let id = 0; id < vertices.length; id += 1) {
    if (skip > 0) {
      skip -= 1;
      continue;
    }

    const vertex = vertices[id];
    const next = vertices[id + 1];
    const afterNext = vertices[id + 2];

    if (id === 0 && !prev) {
      html += `M${vertex.x},${vertex.y} `;
    } else if (
      id === 0 &&
      prev &&
      (prev.x !== vertex.x || prev.y !== vertex.y)
    ) {
      html += `M${vertex.x},${vertex.y} `;
    }

    if (type === "line") {
      html += _line(vertex);
    } else if (type === "arc_c") {
      const clock = mirror == "one" || mirror == "two" ? "0,0" : "0,1";
      html += _arc(vertex, next, clock);
    } else if (type === "arc_r") {
      const clock = mirror == "one" || mirror == "two" ? "0,1" : "0,0";
      html += _arc(vertex, next, clock);
    } else if (type === "arc_c_full") {
      const clock = mirror !== "zero" ? "1,0" : "1,1";
      html += _arc(vertex, next, clock);
    } else if (type === "arc_r_full") {
      const clock = mirror !== "zero" ? "1,1" : "1,0";
      html += _arc(vertex, next, clock);
    } else if (type === "bezier") {
      html += _bezier(next, afterNext);
      skip = 1;
    }
  }

  if (segment.type === "close") {
    html += "Z ";
  }

  return html;
};

const operate = (
  size: Size,
  layer: SingleLayer,
  offset: Point,
  scale: number,
  mirror: Mirror,
  angle = 0
): SingleLayer => {
  const l = structuredClone(layer);

  for (const k1 in l) {
    const seg = l[k1];
    for (const k2 in seg.vertices) {
      if (mirror === "one" || mirror === "three") {
        seg.vertices[k2].x = size.width - seg.vertices[k2].x;
      }
      if (mirror === "two" || mirror === "three") {
        seg.vertices[k2].y = size.height - seg.vertices[k2].y;
      }
      // Offset
      seg.vertices[k2].x += offset.x;
      seg.vertices[k2].y += offset.y;
      // Rotate
      const center = {
        x: size.width / 2 + offset.x + 7.5,
        y: size.height / 2 + offset.y + 30,
      };
      seg.vertices[k2] = rotatePoint(seg.vertices[k2], center, angle);
      // Scale
      seg.vertices[k2].x *= scale;
      seg.vertices[k2].y *= scale;
    }
  }
  return l;
};

const convert = (layer: SingleLayer, mirror?: Mirror) => {
  let s = "";
  let prev = null;
  for (let id = 0; id < layer.length; id += 1) {
    const seg = layer[id];
    s += `${render(prev, seg, mirror)}`;
    prev = seg.vertices ? seg.vertices[seg.vertices.length - 1] : null;
  }
  return s;
};

export const generate = (
  layer: SingleLayer,
  mirror: Mirror,
  offset: Point,
  scale: number,
  size: Size
) => {
  let s = convert(operate(size, layer, offset, scale, "zero"));

  if (mirror !== "zero") {
    s += convert(operate(size, layer, offset, scale, mirror), mirror);
  }

  return s;
};

export const mirror_from_style = (style: SingleStyle): Mirror => {
  switch (style.mirror_style) {
    case 1:
      return "one";
    case 2:
      return "two";
    case 3:
      return "three";
      default:
      return "zero";
  }
}

export const set_mirror = (style: SingleStyle, mirror: Mirror) => {
  switch (mirror) {
    case "one":
      style.mirror_style = 1;
      break;
    case "two":
      style.mirror_style = 2;
      break;
    case "three":
      style.mirror_style = 3;
      break;
    default:
      style.mirror_style = 0;
      break;
  }
}
