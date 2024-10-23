import "./style.css";

const app_name = "Sage Draw";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = app_name;

const titleTxt = document.createElement("h1");
titleTxt.innerHTML = app_name;
app.append(titleTxt);

// set up globals

let stickers_json = JSON.stringify(["🖍️", "😂", "😭"]);
const stickers = JSON.parse(stickers_json);
const colors_json = JSON.stringify(["red", "orange", "yellow", "green", "blue", "indigo", "violet", "white", "gray", "black"]);
const colors = JSON.parse(colors_json);
let undoing = false;
const cursor = {active: false, x: 0, y: 0, thickness: 3, size: 20, tool: "line", color:"black"};

// custom events
const drawingChanged = new Event("drawing-changed");
const toolMoved = new Event("tool-moved");

// define classes
class CursorCommand {

    x: number;
    y: number;
    thickness: number;
    tool: string;
    color: string;
    rotation: number;

    constructor(x: number, y: number, thickness: number, tool: string, color: string, rotation: number) {
        this.x = x;
        this.y = y;
        this.thickness = thickness + 1;
        this.tool = tool;
        this.color = color;
        this.rotation = rotation;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        if (this.tool === "line") {
            ctx.fillRect(this.x - (this.thickness / 2), this.y - (this.thickness / 2), this.thickness, this.thickness);
        } else if (stickers.indexOf(this.tool) !== -1) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.font = `${cursor.size}px monospace`;
            ctx.fillText(this.tool, -(cursor.size / 2), cursor.size / 2);
            ctx.restore();
        }
    }
}

let cursor_command: CursorCommand | null = null;

class CanvasAction {
    display(_ctx: CanvasRenderingContext2D) {
        console.log("undefined display action");
    }
    drag(_new_x: number, _new_y: number) {
        console.log("undefined drag action");
    }
}

let move_list: CanvasAction[] = [];
let undo_list: CanvasAction[] = [];

class Point {

    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    display(ctx: CanvasRenderingContext2D) {
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
    }
}

class Line extends CanvasAction {

    first: Point;
    point_list: Point[];
    thickness: number;
    color: string;

    constructor(first_point: Point, thickness: number, color: string) {
        super();
        this.first = first_point;
        this.point_list = [this.first];
        this.thickness = thickness;
        this.color = color;
    }

    override drag(new_x: number, new_y: number) {
        this.point_list.push(new Point(new_x, new_y));
    }

    override display(ctx: CanvasRenderingContext2D) {
        ctx.lineWidth = this.thickness;
        ctx.strokeStyle = this.color;
        this.point_list.forEach((point) => {
            if (this.point_list.indexOf(point) !== 0) {
                ctx.beginPath();
                ctx.moveTo(this.point_list[this.point_list.indexOf(point) - 1].x, this.point_list[this.point_list.indexOf(point) - 1].y);
                point.display(ctx);
            }
        });
    }
}

class Sticker extends CanvasAction {

    x: number;
    y: number;
    size: number;
    image: string;
    rotation: number;

    constructor(x: number, y: number, size: number, image: string, rotation: number) {
        super();
        this.x = x;
        this.y = y;
        this.size = size;
        this.image = image;
        this.rotation = rotation;
    }

    override display(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.font = `${this.size}px monospace`;
        ctx.fillText(this.image, -(this.size / 2), this.size / 2);
        ctx.restore();
    }

    override drag(new_x: number, new_y: number) {
        this.x = new_x;
        this.y = new_y;
    }
}

// creating canvas
const canvas = document.createElement("canvas");
canvas.height = 256;
canvas.width = 480;
app.append(canvas);

const ctx = canvas.getContext("2d");
if (ctx) {
    ctx.lineWidth = 1;
}

// redraws the canvas from the current list of actions when a change occurs
function redraw() {
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        move_list.forEach((line) => {
            line.display(ctx);
        });

        if (cursor_command) {
            cursor_command.draw(ctx);
        }
    }
}

canvas.addEventListener("tool-moved", () => {
    redraw();
});

canvas.addEventListener("drawing-changed", () => {
    redraw();
});

// add mouse listeners
canvas.addEventListener("mouseout", () => {
    cursor_command = null;
    canvas.dispatchEvent(toolMoved);
    redraw();
    document.body.style.cursor = "default";
});

canvas.addEventListener("mouseenter", (e) => {
    if (stickers.indexOf(cursor.tool) !== -1) {
        cursor_command = new CursorCommand(e.offsetX, e.offsetY, cursor.size, cursor.tool, cursor.color, Number(rotation_slider.value));
    } else {
        cursor_command = new CursorCommand(e.offsetX, e.offsetY, cursor.thickness, cursor.tool, cursor.color, Number(rotation_slider.value));
    }
    canvas.dispatchEvent(toolMoved);
    document.body.style.cursor = "none";
});

canvas.addEventListener("mousedown", (e) => {
    cursor.active = true;
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    if (stickers.indexOf(cursor.tool) !== -1) {
        move_list.push(new Sticker(cursor.x, cursor.y, cursor.size, cursor.tool, Number(rotation_slider.value)));
    } else if (cursor.tool === "line") {
        move_list.push(new Line(new Point(cursor.x, cursor.y), cursor.thickness, cursor.color));
    }
    cursor_command = null;
    canvas.dispatchEvent(toolMoved);
    if (undoing) {
        undoing = false;
        undo_list = [];
    }
});

canvas.addEventListener("mousemove", (e) => {
    if (cursor.active) {
        move_list[move_list.length - 1].drag(cursor.x, cursor.y);
        cursor.x = e.offsetX;
        cursor.y = e.offsetY;
        canvas.dispatchEvent(drawingChanged);
    }
    if (cursor_command) {
        cursor_command = new CursorCommand(e.offsetX, e.offsetY, cursor.thickness, cursor.tool, cursor.color, Number(rotation_slider.value));
        canvas.dispatchEvent(toolMoved);
    }
});

canvas.addEventListener("mouseup", (e) => {
    cursor.active = false;
    cursor.tool = "line";
    cursor_command = new CursorCommand(e.offsetX, e.offsetY, cursor.thickness, cursor.tool, cursor.color, Number(rotation_slider.value));
    canvas.dispatchEvent(toolMoved);
});

// add buttons

function createButton(text: string, parent: HTMLElement, listener: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.innerHTML = text;
    button.addEventListener("click", listener);
    parent.append(button);
    return button;
}

app.append(document.createElement("br"));

createButton("clear", app, () => {
    cursor.active = false;
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    move_list = [];
    undo_list = [];
});

createButton("undo", app, () => {
    cursor.active = false;
    const removed = move_list.pop();
    undoing = true;
    if (typeof removed !== "undefined") {
        undo_list.push(removed);
    }
    canvas.dispatchEvent(drawingChanged);
});

createButton("redo", app, () => {
    cursor.active = false;
    const removed = undo_list.pop();
    if (typeof removed !== "undefined") {
        move_list.push(removed);
    }
    canvas.dispatchEvent(drawingChanged);
});

function exportCanvas() {
    const scale_factor = 4;
    const temp_canvas = document.createElement("canvas");
    temp_canvas.width = canvas.width * scale_factor;
    temp_canvas.height = canvas.height * scale_factor;
    const temp_ctx = temp_canvas.getContext("2d");

    if (temp_ctx) {
        temp_ctx.scale(scale_factor, scale_factor);
        move_list.forEach(action => {
            action.display(temp_ctx);
        });

        const link = document.createElement("a");
        link.href = temp_canvas.toDataURL("image/png");
        link.download = "canvas.png";
        link.click();
    }
}

createButton("export", app, exportCanvas);

app.append(document.createElement("br"));
app.append(document.createElement("br"));



function adjustProperty(adjust_value: number, display_element: HTMLElement, cursor_property: "thickness" | "size", min_value: number = 1) {
    return () => {
        cursor.active = false;
        const new_value = cursor[cursor_property] + adjust_value;
        cursor[cursor_property] = new_value >= min_value ? new_value : min_value;
        const prefixText = cursor_property === "thickness" ? "Line Weight" : "Sticker Size";
        display_element.innerHTML = `${prefixText}: ${cursor[cursor_property]}`;
    };
}

const weight_display = document.createElement("div");
weight_display.innerHTML = `Line Weight: ${cursor.thickness}`;
app.append(weight_display);

createButton("+5", app, adjustProperty(5, weight_display, "thickness"));
createButton("+1", app, adjustProperty(1, weight_display, "thickness"));
createButton("-1", app, adjustProperty(-1, weight_display, "thickness"));
createButton("-5", app, adjustProperty(-5, weight_display, "thickness"));

app.append(document.createElement("br"));

colors.forEach((color:string) => {
    const color_button = createButton(color, app, () => {
        cursor.active = false;
        cursor.tool = "line";
        cursor.color = color
    });
    color_button.style.backgroundColor = color;
    if (color === "black" || color === "gray") {
        color_button.style.color = "white";
    } else {
        color_button.style.color = "black";
    }
});

app.append(document.createElement("br"));
app.append(document.createElement("br"));

const size_display = document.createElement("div");
size_display.innerHTML = `Sticker Size: ${cursor.size}`;
app.append(size_display);

createButton("+5", app, adjustProperty(5, size_display, "size"));
createButton("+1", app, adjustProperty(1, size_display, "size"));
createButton("-1", app, adjustProperty(-1,size_display, "size"));
createButton("-5", app, adjustProperty(-5,size_display, "size"));

app.append(document.createElement("br"));

const rotation_slider = document.createElement("input");
rotation_slider.type = "range";
rotation_slider.min = "0";
rotation_slider.max = "360";
rotation_slider.value = "0";

const rotation_display = document.createElement("div");
rotation_display.innerHTML = `Sticker Rotation: ${rotation_slider.value}°`;
app.append(rotation_display);

rotation_slider.addEventListener("input", () => {
    cursor.active = false;
    rotation_display.innerHTML = `Sticker Rotation: ${rotation_slider.value}°`;
});

app.append(rotation_slider);


app.append(document.createElement("br"));
app.append(document.createElement("br"));

createButton("Add Custom Sticker", app, () => {
    cursor.active = false;
    let sticker_prompt: string | null = prompt("Custom sticker text", "🙂")
    if (sticker_prompt === "line") {
        sticker_prompt = "nice try :)";
    }
    if (sticker_prompt != null) {
        createButton(sticker_prompt, app, () => {
            cursor.active = false;
            cursor.tool = sticker_prompt;
        });
        stickers.push(sticker_prompt);
        stickers_json = JSON.stringify(stickers);
    };
});

stickers.forEach((sticker: string) => {
    createButton(sticker, app, () => {
        cursor.active = false;
        cursor.tool = sticker;
    });
});
