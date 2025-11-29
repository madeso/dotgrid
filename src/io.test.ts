import { describe, it, expect } from "vitest";
import { Filer, type Reporter } from "./io";
import type { Point } from "./_types";

interface Aobj {
  a: number;
}

interface ExampleObj {
  [key: string]: unknown;
  arr?: Point[];
  arrOfArr?: Aobj[][];
  str?: string;
  num?: number;
  obj?: { foo: string };
}

const example_obj = {
  arr: [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ],
  arrOfArr: [[{ a: 1 }, { a: 2 }], [{ a: 3 }]],
  str: "hello",
  num: 42,
  obj: { foo: "bar" },
};

// todo(Gustav): also test for errors with a local reporter

const sr_point_array = (filer: Filer, arr: Point[]) => {
  filer.prop_array("arr", arr, { x: 0, y: 0 }, (f2, p) => {
    const x = f2.rd_number("x", p?.x ?? 0);
    const y = f2.rd_number("y", p?.y ?? 0);
    console.log(p);
    if (p) {
      p.x = x;
      p.y = y;
    }
  });
};

const sr_aobj = (f2: Filer, sub: Aobj | undefined) => {
  const a = f2.rd_number("a", sub?.a ?? 0);
  if (sub) {
    sub.a = a;
  }
};

describe("Filer", () => {
  it("should load arrays", () => {
    const reporter: Reporter = { logs: [] };
    const arr = new Array<Point>();
    sr_point_array(new Filer("load", example_obj, reporter), arr);

    expect(reporter.logs).toStrictEqual([]);
    expect(reporter.logs.length).toBe(0);
    expect(arr.length).toBe(2);
    expect(arr).toStrictEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
  });

  it("should save arrays", () => {
    const reporter: Reporter = { logs: [] };
    const src: Point[] = [
      { x: 4, y: 6 },
      { x: 5, y: 7 },
    ];
    const dst: ExampleObj = {};
    sr_point_array(new Filer("save", dst, reporter), src);

    expect(reporter.logs).toStrictEqual([]);
    expect(reporter.logs.length).toBe(0);
    expect(dst.arr?.length).toBe(2);
    expect(dst.arr).toStrictEqual([
      { x: 4, y: 6 },
      { x: 5, y: 7 },
    ]);
  });

  it("should load array of arrays", () => {
    const reporter = { logs: [] };
    const f = new Filer("load", example_obj, reporter);
    const r: Aobj[][] = [];
    f.prop_array_of_arrays("arrOfArr", r, { a: 0 }, sr_aobj);
    expect(reporter.logs).toStrictEqual([]);
    expect(r).toStrictEqual([[{ a: 1 }, { a: 2 }], [{ a: 3 }]]);
  });

  it("should save array of arrays", () => {
    const reporter = { logs: [] };
    const dst: ExampleObj = {};
    const f = new Filer("save", dst, reporter);
    const src: Aobj[][] = [[{ a: 4 }], [{ a: 5 }, { a: 6 }]];
    f.prop_array_of_arrays("arrOfArr", src, { a: 0 }, sr_aobj);
    expect(reporter.logs).toStrictEqual([]);
    expect(dst.arrOfArr).toStrictEqual([[{ a: 4 }], [{ a: 5 }, { a: 6 }]]);
  });

  it("should serialize strings", () => {
    const reporter = { logs: [] };
    const f = new Filer("load", example_obj, reporter);
    const str = f.rd_string("str", "default");
    expect(str).toBe("hello");
  });

  it("should serialize numbers", () => {
    const reporter = { logs: [] };
    const f = new Filer("load", example_obj, reporter);
    const num = f.rd_number("num", 0);
    expect(num).toBe(42);
  });

  it("should serialize objects", () => {
    const reporter = { logs: [] };
    const f = new Filer("load", example_obj, reporter);
    let called = false;
    f.prop_object("obj", (f2: Filer) => {
      expect(f2.object.foo).toBe("bar");
      called = true;
    });
    expect(called).toBe(true);
  });
});
