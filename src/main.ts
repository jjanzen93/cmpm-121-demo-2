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

let move_list: number[][][] = [];

let undo_list: number[][][] = [];

canvas.addEventListener("mousedown", (e) => {
    cursor.active = true;
    cursor.newline = true;
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
});

canvas.addEventListener("mousemove", (e) => {
    if (cursor.active) {
        if (cursor.newline) {
            move_list.push([]);
            cursor.newline = false;
            undo_list = [];
        };
        move_list[move_list.length - 1].push([cursor.x, cursor.y]);
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
        line.forEach( (point) => {
            if (line.indexOf(point) != 0) {
                ctx?.beginPath();
                ctx?.moveTo(line[line.indexOf(point) - 1][0], line[line.indexOf(point) - 1][1]);
                ctx?.lineTo(point[0], point[1]);
                ctx?.stroke();
            }
        })
    })
    
});
