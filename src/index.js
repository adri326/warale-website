const express = require("express");
const render = require("./render");
const fs = require("fs");
const config = require("../config.json");
const compression = require("compression");

const app = express();

if (!fs.existsSync("generated")){
    fs.mkdirSync("generated");
}

let header = fs.readFileSync("assets/header.html", "utf8");
let footer = fs.readFileSync("assets/footer.html", "utf8");
let description = fs.readFileSync("assets/description.html", "utf8");

app.use(compression());

app.get("/", async (req, res) => {
    let title_prom = render("assets/title.xp", "image", {
        classes: "selectable title",
        alt: config.title,
    });

    let borders_prom = render.load("assets/borders.xp").then(image => render.toImage("generated/borders.png", image));

    let [title, borders] = await Promise.all([title_prom, borders_prom]);


    res.write(header
        .replace(/{{TITLE_IMG}}/g, title)
        .replace(/{{TITLE}}/g, config.title)
        .replace(/{{BODY_STYLE}}/g, body_style())
        .replace(/{{DESCRIPTION}}/g, description)
    );
    res.write(footer);
    res.send();
});

app.use("/static", express.static("./static"));
app.use("/generated", express.static("./generated"));

app.listen(config.port);

function body_style() {
    let res = `--main-background: ${config.style?.main_background ?? "black"};`;
    res += `--link-color: ${config.style?.link_color ?? "blue"};`;

    return res;
}
