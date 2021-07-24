const FONT_WIDTH = 12;
const FONT_HEIGHT = 12;

let font_queue = [];

let font_canvas = document.createElement("canvas");
font_canvas.width = FONT_WIDTH * 16;
font_canvas.height = FONT_HEIGHT * 16;

let font_data = null;

let font = new Image(FONT_WIDTH * 16, FONT_HEIGHT * 16);
font.loading = "eager";
font.src = "/static/warale-font/Warale Font.png";

font.onerror = () => {
    console.error("Couldn't load font!");
}

font.onload = () => {
    let ctx = font_canvas.getContext("2d");
    ctx.drawImage(font, 0, 0);

    let res = [];
    for (let y = 0; y < 16; y++) {
        res.push([]);
        for (let x = 0; x < 16; x++) {
            res[y].push(ctx.getImageData(x * FONT_WIDTH, y * FONT_HEIGHT, FONT_WIDTH, FONT_HEIGHT));
        }
    }

    font_data = res;

    for (let listener of font_queue) {
        listener.resolve(font_data);
    }

    font_queue = [];
}

font.onerror = (err) => {
    console.error(err);

    for (let listener of font_queue) {
        listener.reject(err);
    }

    font_queue = [];
}

function get_font() {
    return new Promise((resolve, reject) => {
        if (font_data) {
            resolve(font_data);
        } else {
            font_queue.push({resolve, reject});
        }
    });
}

function get_char(image, x, y) {
    let raster = image.layers[0]?.raster;
    if (!raster) return null;

    let width = image.layers[0].width;
    let height = image.layers[0].height;

    return raster[x + y * width];
}

function render_char(ctx, x, y, pixel, clear = true) {
    let char = font_data[~~(pixel.asciiCode / 16)][pixel.asciiCode % 16].data;
    if (!char) return;

    if (pixel.transparent) {
        if (clear) ctx.clearRect(x * FONT_WIDTH, y * FONT_HEIGHT, FONT_WIDTH, FONT_HEIGHT);
    } else {
        ctx.fillStyle = "#" + pixel.bg.hex;
        ctx.fillRect(x * FONT_WIDTH, y * FONT_HEIGHT, FONT_WIDTH, FONT_HEIGHT);
    }

    ctx.fillStyle = "#" + pixel.fg.hex;

    for (let dy = 0; dy < FONT_HEIGHT; dy++) {
        for (let dx = 0; dx < FONT_WIDTH; dx++) {
            if (char[4 * (dx + dy * FONT_WIDTH)] == 0) {
                ctx.fillRect(x * FONT_WIDTH + dx, y * FONT_HEIGHT + dy, 1, 1);
            }
        }
    }
}

function render(ctx, image) {
    // console.time("render");
    let raster = image.layers[0]?.raster;
    if (!raster) return;

    let width = image.layers[0].width;
    let height = image.layers[0].height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let pixel = raster[x + y * width];
            render_char(ctx, x, y, pixel);
        }
    }
    // console.timeEnd("render");
}
