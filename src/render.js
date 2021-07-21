const rexpaint = require("rexpaintjs-fork");
const lwip = require("@randy.tarampi/lwip");
const fs = require("fs");
const md5 = require("md5");

const FONT_HEIGHT = 12;
const FONT_WIDTH = 12;
let font = null;
let font_queue = [];

lwip.open("static/warale-font/Warale Font.png", "png", async (err, img) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    font = img;

    let queue = font_queue;
    font_queue = [];

    for (listener of queue) {
        listener(img);
    }
});

let cache = {};
let cached_image = new Set();

module.exports = function render(path, format = "", classes = "") {
    if (Array.isArray(classes)) {
        classes = classes.join(" ");
    }

    if (format === "html") {
        if (cache[path]) {
            return new Promise((resolve, reject) => {
                resolve(module.exports.toHTML(cache[path], classes));
            });
        } else {
            return new Promise((resolve, reject) => {
                fs.readFile(path, (err, buffer) => {
                    if (err) reject(err);
                    rexpaint(buffer).then(data => {
                        cache[path] = data;
                        resolve(module.exports.toHTML(data, classes));
                    }).catch(reject);
                });
            });
        }
    } else if (format === "image") {
        if (cached_image.has(path)) {
            return new Promise((resolve, reject) => {
                resolve(`<img src="/generated/${md5(path)}.png" class="${classes}"`);
            });
        } else if (cache[path]) {
            return module.exports.toImage(cache[path], classes);
        } else {
            return new Promise((resolve, reject) => {
                fs.readFile(path, (err, buffer) => {
                    if (err) reject(err);
                    rexpaint(buffer).then(data => {
                        cache[path] = data;
                        module.exports.toImage(data, classes).then(resolve).catch(reject);
                    }).catch(reject);
                });
            });
        }
    }
}

module.exports.toHTML = function toHTML(image, classes = "") {
    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    let res = `<div class="rexpaint ${classes}">`;
    let merged = image.mergeLayers();

    for (let y = 0; y < merged.height; y++) {
        res += `<div y="${y}">`;
        for (let x = 0; x < merged.width; x++) {
            let pixel = merged.get(x, y);
            res += `<span y="${y}" x="${x}" style="color: #${pixel.fg.hex}; background: #${pixel.transparent ? "transparent" : pixel.bg.hex}">${escapeHTML(pixel.unicodeChar)}</span>`;
        }
        res += "</div>\n";
    }

    res += "</div>";

    return res;
}

function get_font() {
    return new Promise((resolve, reject) => {
        if (font !== null) {
            resolve(font);
        } else {
            let listener = (img) => resolve(img);
            font_queue.push(listener);
        }
    });
}

function lwip_create(width, height, bg) {
    return new Promise((resolve, reject) => {
        lwip.create(width, height, bg ?? {r: 0, g: 0, b: 0, a: 0}, (err, img) => {
            if (err) reject(err);
            else resolve(img);
        });
    });
}

function lwip_batch_exec(batch) {
    return new Promise((resolve, reject) => {
        batch.exec((err, img) => {
            if (err) reject(err);
            else resolve(img);
        });
    });
}

function render_pixel(batch, font, x, y, pixel) {
    let fx = (pixel.asciiCode % 16) * FONT_WIDTH;
    let fy = ~~(pixel.asciiCode / 16) * FONT_HEIGHT;

    for (let dy = 0; dy < FONT_HEIGHT; dy++) {
        for (let dx = 0; dx < FONT_WIDTH; dx++) {
            let pixel_from = font.getPixel(fx + dx, fy + dy);
            if (pixel_from.r > 0) {
                batch.setPixel(x * FONT_WIDTH + dx, y * FONT_HEIGHT + dy, {r: pixel.bg.r, g: pixel.bg.g, b: pixel.bg.b, a: pixel.transparent ? 0 : 100});
            } else {
                batch.setPixel(x * FONT_WIDTH + dx, y * FONT_HEIGHT + dy, {r: pixel.fg.r, g: pixel.fg.g, b: pixel.fg.b, a: pixel.transparent ? 0 : 100});
            }
        }
    }
}

module.exports.toImage = async function toImage(image, classes = "") {
    let font = await get_font();
    let res = await lwip_create(image.width * FONT_WIDTH, image.height * FONT_HEIGHT);
    let batch = res.batch();

    let merged = image.mergeLayers();
    for (let y = 0; y < merged.height; y++) {
        for (let x = 0; x < merged.width; x++) {
            let pixel = merged.get(x, y);
            render_pixel(batch, font, x, y, pixel);

        }
        await lwip_batch_exec(batch);
        console.log(`${y}`);
    }

    return "nothing yet >.>";
}
