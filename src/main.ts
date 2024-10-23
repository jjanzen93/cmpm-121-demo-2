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
let undoing = false;
const cursor = {active: false, x: 0, y: 0, thickness: 1, size: 16, tool: "line"};

// custom events
const drawingChanged = new Event("drawing-changed");
const toolMoved = new Event("tool-moved");

// define classes
class CursorCommand {

    x: number;
    y: number;
    thickness: number;
    tool: string;

    constructor(x: number, y: number, thickness: number, tool: string) {
        this.x = x;
        this.y = y;
        this.thickness = thickness + 1;
        this.tool = tool;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.tool === "line") {
            ctx.fillRect(this.x - (this.thickness / 2), this.y - (this.thickness / 2), this.thickness, this.thickness);
        } else if (stickers.indexOf(this.tool) !== -1) {
            console.log(this.tool);
            ctx.font = `${cursor.size}px monospace`;
            ctx.fillText(cursor.tool, this.x - (cursor.size / 2), this.y + (cursor.size / 2));
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

    constructor(first_point: Point, thickness: number) {
        super();
        this.first = first_point;
        this.point_list = [this.first];
        this.thickness = thickness;
    }

    override drag(new_x: number, new_y: number) {
        this.point_list.push(new Point(new_x, new_y));
    }

    override display(ctx: CanvasRenderingContext2D) {
        ctx.lineWidth = this.thickness;
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

    constructor(x: number, y: number, size: number, image: string) {
        super();
        this.x = x;
        this.y = y;
        this.size = size;
        this.image = image;
    }

    override display(ctx: CanvasRenderingContext2D) {
        ctx.font = `${this.size}px monospace`;
        ctx.fillText(this.image, this.x - (this.size / 2), this.y + (this.size / 2));
    }

    override drag(new_x: number, new_y: number) {
        this.x = new_x;
        this.y = new_y;
    }
}

// creating canvas
const canvas = document.createElement("canvas");
canvas.height = 256;
canvas.width = 256;
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
        cursor_command = new CursorCommand(e.offsetX, e.offsetY, cursor.size, cursor.tool);
    } else {
        cursor_command = new CursorCommand(e.offsetX, e.offsetY, cursor.thickness, cursor.tool);
    }
    canvas.dispatchEvent(toolMoved);
    document.body.style.cursor = "none";
});

canvas.addEventListener("mousedown", (e) => {
    cursor.active = true;
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    if (stickers.indexOf(cursor.tool) !== -1) {
        move_list.push(new Sticker(cursor.x, cursor.y, cursor.size, cursor.tool));
    } else if (cursor.tool === "line") {
        move_list.push(new Line(new Point(cursor.x, cursor.y), cursor.thickness));
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
        cursor_command = new CursorCommand(e.offsetX, e.offsetY, cursor.thickness, cursor.tool);
        canvas.dispatchEvent(toolMoved);
    }
});

canvas.addEventListener("mouseup", (e) => {
    cursor.active = false;
    cursor.tool = "line";
    cursor_command = new CursorCommand(e.offsetX, e.offsetY, cursor.thickness, cursor.tool);
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

const weight_display = document.createElement("div");
weight_display.innerHTML = `Line Weight: ${cursor.thickness.toString()}`;
app.append(weight_display);

function adjustProperty(adjust_value: number, display_element: HTMLElement, cursor_property: "thickness" | "size", min_value: number = 1) {
    return () => {
        cursor.active = false;
        const new_value = cursor[cursor_property] + adjust_value;
        cursor[cursor_property] = new_value >= min_value ? new_value : min_value;
        display_element.innerHTML = `${cursor[cursor_property].toString()}px`;
    };
}

createButton("+5", app, adjustProperty(5, weight_display, "thickness"));
createButton("+1", app, adjustProperty(1, weight_display, "thickness"));
createButton("-1", app, adjustProperty(-1, weight_display, "thickness"));
createButton("-5", app, adjustProperty(-5, weight_display, "thickness"));

app.append(document.createElement("br"));
app.append(document.createElement("br"));

const size_display = document.createElement("div");
size_display.innerHTML = `Sticker Size: ${cursor.size.toString()}`;
app.append(size_display);

createButton("+5", app, adjustProperty(5, size_display, "size"));
createButton("+1", app, adjustProperty(1, size_display, "size"));
createButton("-1", app, adjustProperty(-1,size_display, "size"));
createButton("-5", app, adjustProperty(-5,size_display, "size"));

app.append(document.createElement("br"));
app.append(document.createElement("br"));

createButton("Add Custom Sticker", app, () => {
    cursor.active = false;
    let sticker_prompt: string | null = prompt("Custom sticker text", "🙂")
    if (sticker_prompt === "line") {
        sticker_prompt = "nice try :)";
    }
    if (sticker_prompt != null) {
        createStickerButton(sticker_prompt);
        stickers.push(sticker_prompt);
        stickers_json = JSON.stringify(stickers);
    };
});

function createStickerButton(sticker: string) {
    const current_button = document.createElement("button");
    current_button.innerHTML = sticker;
    app.append(current_button);

    current_button.addEventListener("click", () => {
        cursor.active = false;
        cursor.tool = sticker;
    });
}

stickers.forEach((sticker: string) => {
    createStickerButton(sticker);
});
