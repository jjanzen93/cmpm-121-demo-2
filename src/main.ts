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

const stickers : string[] = ["🖍️", "😂", "😭"];

let undoing = false;

const cursor = {active: false, x: 0, y: 0, thickness: 1, tool: "line"};

const drawingChanged = new Event("drawing-changed");

const toolMoved = new Event("tool-moved");

class CursorCommand {

    x:number;
    y:number;
    thickness:number;
    tool:string;

    constructor(x:number, y:number, thickness:number, tool:string) {
        this.x = x;
        this.y = y;
        this.thickness = thickness+1;
        this.tool = tool;
    }

    draw(ctx:CanvasRenderingContext2D) {
        if (this.tool == "line") {
            ctx.fillRect(this.x - (this.thickness/2), this.y - (this.thickness/2), this.thickness, this.thickness);
        } else if (stickers.indexOf(this.tool) != -1) {
            console.log(this.tool);
            ctx.font = `${this.thickness}px monospace`;
            ctx.fillText(cursor.tool, this.x - (this.thickness/2), this.y + (this.thickness/2));
        }
        
    }

}

let cursor_command: CursorCommand | null = null;

class CanvasAction {
    display(_ctx:CanvasRenderingContext2D) {
        console.log("undefined display action");
    }
    drag(_new_x:number, _new_y:number) {
        console.log("undefined drag action");
    }
}

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

class Line extends CanvasAction {

    first:Point;
    point_list:Point[];
    thickness:number;

    constructor(first_point:Point, thickness:number) {
        super();
        this.first = first_point;
        this.point_list = [this.first];
        this.thickness = thickness;
    }

    override drag(new_x:number, new_y:number) {
        this.point_list.push(new Point(new_x, new_y));
    }

    override display(ctx:CanvasRenderingContext2D) {
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

class Sticker extends CanvasAction{

    x:number;
    y:number;
    size:number;
    image:string;

    constructor(x:number, y:number, size:number, image:string) {
        super();
        this.x = x;
        this.y = y;
        this.size = size;
        this.image = image;
    }

    override display(ctx:CanvasRenderingContext2D) {
        ctx.font = `${this.size}px monospace`;
        ctx.fillText(this.image, this.x - (this.size/2), this.y + (this.size/2))
    }

    override drag(new_x:number, new_y:number) {
        this.x = new_x;
        this.y = new_y;
    }

}


let move_list: CanvasAction[] = [];

let undo_list: CanvasAction[] = [];


function redraw() {
    if (ctx != null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        move_list.forEach( (line) => {
            line.display(ctx);
        })
    
        if (cursor_command != null) {
            cursor_command.draw(ctx);
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
    cursor_command = new CursorCommand(e.offsetX, e.offsetY, cursor.thickness, cursor.tool);
    canvas.dispatchEvent(toolMoved);
    document.body.style.cursor = "none";
})

canvas.addEventListener("mousedown", (e) => {
    cursor.active = true;
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    if (stickers.indexOf(cursor.tool) != -1) {
        move_list.push(new Sticker(cursor.x, cursor.y, cursor.thickness, cursor.tool));
    } else if (cursor.tool == "line") {
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
    if (cursor_command != null) {
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

stickers.forEach( (sticker) => {
    const current_button = document.createElement("button");
    current_button.innerHTML = sticker;
    app.append(current_button);

    current_button.addEventListener("click", () => {
        cursor.active = false;
        cursor.tool = sticker;
    }); 
});

app.append(document.createElement("br"));

const thicker_button = document.createElement("button");
thicker_button.innerHTML = "+5";
app.append(thicker_button);

thicker_button.addEventListener("click", () => {
    cursor.active = false;
    cursor.thickness += 5;
    size_display.innerHTML = `${cursor.thickness.toString()}px`;
});

const thick_button = document.createElement("button");
thick_button.innerHTML = "+1";
app.append(thick_button);

thick_button.addEventListener("click", () => {
    cursor.active = false;
    cursor.thickness++;
    size_display.innerHTML = `${cursor.thickness.toString()}px`;
});

const thin_button = document.createElement("button");
thin_button.innerHTML = "-1";
app.append(thin_button);

thin_button.addEventListener("click", () => {
    cursor.active = false;
    if (cursor.thickness > 1) {
        cursor.thickness--;
    }
    size_display.innerHTML = `${cursor.thickness.toString()}px`;
});

const thinner_button = document.createElement("button");
thinner_button.innerHTML = "-5";
app.append(thinner_button);

thinner_button.addEventListener("click", () => {
    cursor.active = false;
    if (cursor.thickness > 5) {
        cursor.thickness -= 5;
    } else {
        cursor.thickness = 1;
    }
    size_display.innerHTML = `${cursor.thickness.toString()}px`;
});

const size_display = document.createElement("div");
size_display.innerHTML = `${cursor.thickness.toString()}px`;
app.append(size_display);

canvas.addEventListener("tool-moved", () => {
    redraw();
});

canvas.addEventListener("drawing-changed", () => {
    redraw();
});
