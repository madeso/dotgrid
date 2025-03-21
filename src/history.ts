function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

export class History<Container> {
  index: number;
  a: Array<Container>;

  constructor() {
    this.index = 0;
    this.a = [];
  }

  clear() {
    this.a = [];
    this.index = 0;
  }

  push(data: Container) {
    if (this.index < this.a.length - 1) {
      this.fork();
    }
    this.index = this.a.length;
    this.a = this.a.slice(0, this.index);
    this.a.push(structuredClone(data));

    if (this.a.length > 20) {
      this.a.shift();
    }
  }

  fork() {
    this.a = this.a.slice(0, this.index + 1);
  }

  pop() {
    return this.a.pop();
  }

  prev() {
    this.index = clamp(this.index - 1, 0, this.a.length - 1);
    return structuredClone(this.a[this.index]);
  }

  next() {
    this.index = clamp(this.index + 1, 0, this.a.length - 1);
    return structuredClone(this.a[this.index]);
  }
}
