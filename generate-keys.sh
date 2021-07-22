#! /bin/sh

echo "This very small script generates a set of keys for local signing."
echo "The OpenSSL utility will ask you a series of questions, which you do not need to answer correctly, as the certificate will only be used locally."

# Create directory if not present
[ -d secret/ ] || mkdir secret

# Create key and certificate if not present
[ -f secret/local.key -a -f secret/local.cert ] || openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout secret/local.key -out secret/local.crt
