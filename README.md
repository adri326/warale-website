# Warale the Ageless Elder's website

This is the source code of the website proposal for the community fort "Warale the Ageless Elder".

## Installation

First, clone this repository.

```sh
git clone https://github.com/adri326/warale-website
cd warale-website
```

Then, install the required dependencies.

```sh
npm ci
```

Finally, set up HTTPS; on linux, simply run `./generate-keys.sh` to generate a local key and certificate.
Otherwise, edit the file `config.json` to fit your needs.

## Running

Simply run `node .` to start the server.
The default config is set to listen on port `8443`, with SSL enabled, so you should navigate to `https://localhost:8443/` to see the website.
