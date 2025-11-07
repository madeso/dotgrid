export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Mirror = "zero" | "one" | "two" | "three";

export type SegmentType =
  | "arc_c_full"
  | "arc_c"
  | "arc_r_full"
  | "arc_r"
  | "bezier"
  | "close"
  | "line";

export type Vertices = Array<Point>;

export interface Segment {
  vertices: Vertices;
  type: SegmentType;
}
export type SingleLayer = Array<Segment>;
export type Layers = Array<SingleLayer>;

export interface SingleStyle {
  thickness: number;
  strokeLinecap: CanvasLineCap;
  strokeLinejoin: CanvasLineJoin;
  color: string;
  fill?: string;
  mirror_style: number;
  transform: string;
  strokeLineDash?: Array<number>;
}
