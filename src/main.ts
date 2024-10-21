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

const cursor = {active: false, x: 0, y: 0, newline: false};

const drawingChanged = new Event("drawing-changed");

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

    constructor(first_point:Point) {
        this.first = first_point
        this.point_list = [this.first];
    }

    drag(x:number, y:number) {
        this.point_list.push(new Point(x, y));
    }

    display(ctx:CanvasRenderingContext2D) {
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

canvas.addEventListener("mousedown", (e) => {
    cursor.active = true;
    cursor.newline = true;
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
});

canvas.addEventListener("mousemove", (e) => {
    if (cursor.active) {
        if (cursor.newline) {
            move_list.push(new Line(new Point(cursor.x, cursor.y)));
            cursor.newline = false;
        } else {
            move_list[move_list.length - 1].drag(cursor.x, cursor.y);
        }
        cursor.x = e.offsetX;
        cursor.y = e.offsetY;
        canvas.dispatchEvent(drawingChanged);
    }
});

canvas.addEventListener("mouseup", () => {
    cursor.active = false;
    cursor.newline = true;
});

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

canvas.addEventListener("drawing-changed", () => {
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    move_list.forEach( (line) => {
        if (ctx !== null) {
            line.display(ctx);
        }
    })
    
});
