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

const recordPoint = new Event("drawing-changed");

let move_list: number[][][] = [];

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
        };
        cursor.x = e.offsetX;
        cursor.y = e.offsetY;
        canvas.dispatchEvent(recordPoint);
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
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    move_list = []
});

canvas.addEventListener("drawing-changed", () => {
    move_list[move_list.length - 1].push([cursor.x, cursor.y]);
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
