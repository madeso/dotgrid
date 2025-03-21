import { Client } from "./client";

const isColor = (val: string) => {
  if (val.length !== 3 && val.length !== 6) {
    return false;
  }

  const re = /[0-9A-Fa-f]/g;
  return re.test(val);
};

export class Picker {
  client: Client;
  memory: string;
  el: HTMLDivElement;
  isActive: boolean;
  input: HTMLInputElement;

  constructor(client: Client) {
    this.client = client;
    this.memory = "";
    this.el = document.createElement("div");
    this.el.id = "picker";
    this.isActive = false;
    this.input = document.createElement("input");
    this.input.id = "picker_input";

    this.el.appendChild(this.input);
  }

  start() {
    if (this.isActive) {
      return;
    }

    this.isActive = true;

    this.input.setAttribute(
      "placeholder",
      `${this.client.tool.style().color.replace("#", "").trim()}`
    );
    this.input.setAttribute("maxlength", "6");

    this.input.addEventListener("keydown", this.onKeyDown, false);
    this.input.addEventListener("keyup", this.onKeyUp, false);

    this.client.interface.el.className = "picker";
    this.input.focus();
    this.input.value = "";

    // todo(Gustav): there is nothing about a controller anywhere
    // try {
    //   this.client.controller.set("picker");
    // } catch (err) {}
  }

  update() {
    if (!this.isActive) {
      return;
    }
    if (!isColor(this.input.value)) {
      return;
    }

    // todo(Gustav): where does option_color comes from...?
    // const hex = `#${this.input.value}`;
    // document.getElementById("option_color").children[0].style.fill = hex;
    // document.getElementById("option_color").children[0].style.stroke = hex;
  }

  stop() {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    this.client.interface.el.className = "";
    this.input.blur();
    this.input.value = "";

    // todo(Gustav): there is nothing about a controller anywhere
    // try {
    //   this.client.controller.set();
    // } catch (err) {
    //   console.log("No controller");
    // }

    setTimeout(() => {
      this.client.interface.update(true);
      this.client.renderer.update();
    }, 250);
  }

  validate() {
    if (!isColor(this.input.value)) {
      return;
    }

    const hex = `#${this.input.value}`;

    this.client.tool.style().color = hex;
    this.client.tool.style().fill =
      this.client.tool.style().fill !== "none" ? hex : "none";

    this.stop();
  }

  onKeyDown(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Enter") {
      this.validate();
      e.preventDefault();
      return;
    }
    if (e.key === "Escape") {
      this.stop();
      e.preventDefault();
    }
  }

  onKeyUp(e: KeyboardEvent) {
    e.stopPropagation();
    this.update();
  }
}
