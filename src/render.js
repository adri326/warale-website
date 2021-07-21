const rexpaint = require("rexpaintjs-fork");
const fs = require("fs");

let title = null;
rexpaint(fs.readFileSync("assets/title.xp")).then(img => {
    title = img;
}).catch(err => {
    throw err;
});

let cache = {};

module.exports = function render(path) {
    if (cache[path]) {
        return new Promise((resolve, reject) => {
            resolve(module.exports.toHTML(cache[path]));
        });
    } else {
        return new Promise((resolve, reject) => {
            fs.readFile(path, (err, buffer) => {
                if (err) reject(err);
                rexpaint(buffer).then(data => {
                    cache[path] = data;
                    resolve(module.exports.toHTML(data));
                }).catch(reject);
            });
        });
    }
}

module.exports.toHTML = function toHTML(image) {
    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    let res = `<div class="rexpaint">`;
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
