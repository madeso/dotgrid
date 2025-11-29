import { describe, it, expect } from "vitest";
import { Filer, type Reporter } from "./io";
import type { Point } from "./_types";

// todo(Gustav): replace with a better or local objects
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

  it("should serialize array of arrays", () => {
    const reporter = { logs: [] };
    const f = new Filer("load", example_obj, reporter);
    let count = 0;
    f.prop_array_of_arrays("arrOfArr", [], (f2: Filer) => {
      expect(typeof f2.object.a).toBe("number");
      count++;
    });
    expect(count).toBe(3);
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
