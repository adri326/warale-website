const express = require("express");
const render = require("./render");
const fs = require("fs");

const app = express();

app.get("/", async (req, res) => {
    let title = await render("assets/title.xp", "image", "");
    let header = fs.readFileSync("assets/header.html");
    let footer = fs.readFileSync("assets/footer.html");
    res.write(header);
    res.write(title);
    res.write(footer);
    res.send();
});

app.use("/static", express.static("./static"));
app.use("/generated", express.static("./generated"));

app.listen(8080);
