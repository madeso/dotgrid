import { describe, it, expect } from "vitest";
import { Filer } from "./io";

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
const reporter = { logs: [] };

describe("Filer", () => {
  it("should serialize arrays", () => {
    const filer = new Filer("load", example_obj, reporter);
    let count = 0;
    filer.prop_array("arr", [], (f2: Filer) => {
      expect(typeof f2.object.x).toBe("number");
      expect(typeof f2.object.y).toBe("number");
      count++;
    });
    expect(count).toBe(2);
  });

  it("should serialize array of arrays", () => {
    const f = new Filer("load", example_obj, reporter);
    let count = 0;
    f.prop_array_of_arrays("arrOfArr", [], (f2: Filer) => {
      expect(typeof f2.object.a).toBe("number");
      count++;
    });
    expect(count).toBe(3);
  });

  it("should serialize strings", () => {
    const f = new Filer("load", example_obj, reporter);
    const str = f.prop_string("str", "default");
    expect(str).toBe("hello");
  });

  it("should serialize numbers", () => {
    const f = new Filer("load", example_obj, reporter);
    const num = f.prop_number("num", 0);
    expect(num).toBe(42);
  });

  it("should serialize objects", () => {
    const f = new Filer("load", example_obj, reporter);
    let called = false;
    f.prop_object("obj", (f2: Filer) => {
      expect(f2.object.foo).toBe("bar");
      called = true;
    });
    expect(called).toBe(true);
  });
});
