import "./style.css";

const APP_NAME = "Sage Draw";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

const title_txt = document.createElement("h1");
title_txt.innerHTML = APP_NAME;
app.append(title_txt);

const canvas = document.createElement("canvas");
canvas.height = 256;
canvas.width = 256;
app.append(canvas);

const ctx = canvas.getContext("2d");
if (ctx != null) {
    ctx.lineWidth = 1;
}

let undoing = false;

const cursor = {active: false, x: 0, y: 0, newline: false, thickness: 1};

const drawingChanged = new Event("drawing-changed");

const toolMoved = new Event("tool-moved");

class CursorCommand {

    x:number;
    y:number;
    thickness:number;

    constructor(x:number, y:number, thickness:number) {
        this.x = x;
        this.y = y;
        this.thickness = thickness+1;
    }

    draw(ctx:CanvasRenderingContext2D) {
        ctx.fillRect(this.x - (this.thickness/2), this.y - (this.thickness/2), this.thickness, this.thickness);
    }

}

let cursor_command: CursorCommand | null = null;

class Point {

    x:number;
    y:number;

    constructor(x:number, y:number){
        this.x = x;
        this.y = y
    }

    display(ctx:CanvasRenderingContext2D) {
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
    }

}

class Line {

    first:Point;
    point_list:Point[];
    thickness:number;

    constructor(first_point:Point, thickness:number) {
        this.first = first_point;
        this.point_list = [this.first];
        this.thickness = thickness;
    }

    drag(x:number, y:number) {
        this.point_list.push(new Point(x, y));
    }

    display(ctx:CanvasRenderingContext2D) {
        ctx.lineWidth = this.thickness;
        this.point_list.forEach((point) => {
            if (this.point_list.indexOf(point) != 0) {
                ctx.beginPath();
                ctx.moveTo(this.point_list[this.point_list.indexOf(point) - 1].x, this.point_list[this.point_list.indexOf(point) - 1].y);
                point.display(ctx);
            }
        });
    }

}


let move_list: Line[] = [];

let undo_list: Line[] = [];

function redraw() {
    if (ctx !== null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        move_list.forEach( (line) => {
            line.display(ctx);
        })
    
        if (cursor_command != null) {
            if (ctx !== null) {
                cursor_command.draw(ctx);
            }
        }
    }
}

canvas.addEventListener("mouseout", () => {
    cursor_command = null;
    canvas.dispatchEvent(toolMoved);
    redraw();
    document.body.style.cursor = "default";
})

canvas.addEventListener("mouseenter", (e) => {
    cursor_command = new CursorCommand(e.offsetX, e.offsetY, cursor.thickness);
    canvas.dispatchEvent(toolMoved);
    document.body.style.cursor = "none";
})

canvas.addEventListener("mousedown", (e) => {
    cursor.active = true;
    cursor.newline = true;
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    cursor_command = null;
    canvas.dispatchEvent(toolMoved);
    if (undoing) {
        undoing = false;
        undo_list = [];
    }
});

canvas.addEventListener("mousemove", (e) => {
    if (cursor.active) {
        if (cursor.newline) {
            move_list.push(new Line(new Point(cursor.x, cursor.y), cursor.thickness));
            cursor.newline = false;
        } else {
            move_list[move_list.length - 1].drag(cursor.x, cursor.y);
        }
        cursor.x = e.offsetX;
        cursor.y = e.offsetY;
        canvas.dispatchEvent(drawingChanged);
    }
    cursor_command = new CursorCommand(e.offsetX, e.offsetY, cursor.thickness);
    canvas.dispatchEvent(toolMoved);
});

canvas.addEventListener("mouseup", (e) => {
    cursor.active = false;
    cursor.newline = true;
    cursor_command = new CursorCommand(e.offsetX, e.offsetY, cursor.thickness);
    canvas.dispatchEvent(toolMoved);
});

app.append(document.createElement("br"));

const clear_button = document.createElement("button");
clear_button.innerHTML = "clear";
app.append(clear_button);

clear_button.addEventListener("click", () => {
    cursor.active = false;
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    move_list = []
    undo_list = []
});

const undo_button = document.createElement("button");
undo_button.innerHTML = "undo";
app.append(undo_button);

undo_button.addEventListener("click", () => {
    cursor.active = false;
    const removed = move_list.pop();
    undoing = true;
    if (typeof removed !== "undefined") {
        undo_list.push(removed);
    }
    canvas.dispatchEvent(drawingChanged);
});

const redo_button = document.createElement("button");
redo_button.innerHTML = "redo";
app.append(redo_button);

redo_button.addEventListener("click", () => {
    cursor.active = false;
    const removed = undo_list.pop();
    if (typeof removed !== "undefined") {
        move_list.push(removed);
    }
    canvas.dispatchEvent(drawingChanged);
});

app.append(document.createElement("br"));

const thick_button = document.createElement("button");
thick_button.innerHTML = "thick";
app.append(thick_button);

thick_button.addEventListener("click", () => {
    cursor.active = false;
    cursor.thickness = 5;
});

const thin_button = document.createElement("button");
thin_button.innerHTML = "thin";
app.append(thin_button);

thin_button.addEventListener("click", () => {
    cursor.active = false;
    cursor.thickness = 1;
});

canvas.addEventListener("tool-moved", () => {
    redraw();
});

canvas.addEventListener("drawing-changed", () => {
    redraw();
});
