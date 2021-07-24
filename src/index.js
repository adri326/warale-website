const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const express = require("express");
const compression = require("compression");
const hogan = require("hogan.js"); // A mustache implementation that's fast
const markdown = require("markdown-it")();

const render = require("./render");
const config = require("../config.json");

const app = express();

if (!fs.existsSync("generated")) {
    fs.mkdirSync("generated");
}

if (!fs.existsSync("journals")) {
    fs.mkdirSync("journals");
}

let header = fs.readFileSync("assets/header.mustache", "utf8");
let footer = fs.readFileSync("assets/footer.mustache", "utf8");
let description = fs.readFileSync("assets/description.mustache", "utf8");
let journals_template = fs.readFileSync("assets/journals.mustache", "utf8");

let template = hogan.compile(header + description + journals_template + footer);

let partials = {};
for (let file of fs.readdirSync("assets/partials")) {
    partials[file.replace(/\..*$/g, "")] = hogan.compile(fs.readFileSync(path.join("assets/partials", file), "utf8"));
}

let journals = [];
{
    for (let file of fs.readdirSync("journals/")) {
        let name = /^(\d+)(?:\s?-)?\s+([a-zA-Z0-9][a-zA-Z0-9\s\-_]*)\.(?:md|txt)$/i.exec(file);
        if (!name) {
            console.error("Invalid journal name: " + file);
            continue;
        }
        let year = +name[1];
        let player = name[2];
        let raw = fs.readFileSync(path.join("journals", file), "utf8");

        journals.push({
            year,
            player,
            player_sanitized: player.replace(/[^a-zA-Z0-9]/g, "-"),
            raw,
            rendered: markdown.render(raw.replace(/^#+/gm, (n) => "#".repeat(Math.min(n.length + 1, 6)))),
        });
    }

    journals.sort((a, b) => a.year - b.year);
}

app.use(compression());

app.get("/", async (req, res) => {
    console.time("render");
    let title_prom = render("assets/title.xp", "image", {
        classes: "selectable title",
        alt: config.title,
    });

    let borders_prom = render.load("assets/borders.xp").then(image => render.toImage("generated/borders.png", image));

    let [title, borders] = await Promise.all([title_prom, borders_prom]);

    let context = {
        title_img: title,
        title: config.title,
        body_style: {
            main_background: config.style?.main_background ?? "black",
            secondary_background: config.style?.secondary_background ?? "darkgrey",
            link_color: config.style?.link_color ?? "blue",
            summary_color: config.style?.summary_color ?? "blue",
        },
        journals
    };

    res.write(template.render(context, partials));
    res.send();
    console.timeEnd("render");
});

app.get("/xp.json", async (req, res) => {
    let file = req.query.file;
    if (/^[a-wA-W0-9\-_]+\.xp$/.exec(file) && fs.existsSync(`assets/${file}`)) {
        res.write(await render(`assets/${file}`, "json", {
            merged: req.query.merged
        }));
        res.send();
    } else {
        res.status(403);
        res.send({
            code: 403,
            error: "Forbidden",
            reason: "Couldn't read file: invalid name or missing file"
        });
    }
});

app.use("/static", express.static("./static"));
app.use("/generated", express.static("./generated"));

let server;
if (config.ssl.enabled) {
    let key = fs.readFileSync(config.ssl.key, "utf8");
    let cert = fs.readFileSync(config.ssl.cert, "utf8");
    server = https.createServer({key, cert}, app);
} else {
    server = http.createServer(app);
}

server.listen(config.port, () => {
    console.log("Server now listening on port", config.port);
});
