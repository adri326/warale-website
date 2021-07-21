const rexpaint = require("rexpaintjs-fork");
const lwip = require("@randy.tarampi/lwip");
const fs = require("fs");
const md5 = require("md5");
const Jimp = require("jimp");

const FONT_HEIGHT = 12;
const FONT_WIDTH = 12;
let font = null;
let font_queue = [];

Jimp.read("static/warale-font/Warale Font.png").then((img) => {
    font = img;

    let queue = font_queue;
    font_queue = [];

    for (listener of queue) {
        listener(img);
    }
}).catch((err) => {
    console.error(err);
    process.exit(1);
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
        let output = `generated/${md5(path)}.png`;
        if (cached_image.has(path)) {
            return new Promise((resolve, reject) => {
                resolve(`<img src="${output}" class="rexpaint ${classes}"`);
            });
        } else if (cache[path]) {
            return module.exports.toImage(output, cache[path], classes);
        } else {
            return new Promise((resolve, reject) => {
                fs.readFile(path, (err, buffer) => {
                    if (err) reject(err);
                    rexpaint(buffer).then(data => {
                        cache[path] = data;
                        cached_image.add(path);
                        module.exports.toImage(output, data, classes).then(resolve).catch(reject);
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

function jimp_create(width, height) {
    return new Promise((resolve, reject) => {
        new Jimp(width, height, (err, img) => {
            if (err) reject(err);
            else resolve(img);
        });
    });
}

function render_pixel(image, font, x, y, pixel) {
    let fx = (pixel.asciiCode % 16) * FONT_WIDTH;
    let fy = ~~(pixel.asciiCode / 16) * FONT_HEIGHT;

    let fg = Jimp.cssColorToHex(`rgb(${pixel.fg.r}, ${pixel.fg.g}, ${pixel.fg.b})`);
    let bg = Jimp.cssColorToHex(`rgba(${pixel.bg.r}, ${pixel.bg.g}, ${pixel.bg.b}, ${pixel.transparent ? 0 : 255})`);

    for (let dy = 0; dy < FONT_HEIGHT; dy++) {
        for (let dx = 0; dx < FONT_WIDTH; dx++) {
            let pixel_from = font.getPixelColor(fx + dx, fy + dy);
            let color;
            if (pixel_from != 0xFFFFFFFF) {
                color = fg;
            } else {
                color = bg;
            }
            image.setPixelColor(color, x * FONT_WIDTH + dx, y * FONT_HEIGHT + dy);
        }
    }
}

module.exports.toImage = async function toImage(output, image, classes = "") {
    let font = await get_font();
    let res = await jimp_create(image.width * FONT_WIDTH, image.height * FONT_HEIGHT);

    let merged = image.mergeLayers();
    for (let y = 0; y < merged.height; y++) {
        for (let x = 0; x < merged.width; x++) {
            let pixel = merged.get(x, y);
            render_pixel(res, font, x, y, pixel);
        }
    }

    await res.write(output);

    return `<img src="${output}" class="rexpaint ${classes}" />`;
}
