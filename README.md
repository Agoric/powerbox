# Agoric Powerbox notes

To try this out:

## Choose WebExtension Manifest Version

First, choose your manifest version and clear out any old built files by running
one of:

```
npm run clean:v2 # for compatible manifest v2 mone
# OR
npm run clean:v3 # for Chromium's manifest v3 mode
```

## Development mode

```
npm i -g web-ext # one time initialization
npm install
npm run watch # runs forever
web-ext run -t chromium # to auto-reload a fresh Chrome
web-ext run # to auto-reload a fresh Firefox
```

You can rerun `clean:v2` or `clean:v3` anytime, just remember to refresh the
extension to have it take effect.

## To run the client-to-wallet demo

```
npm run demo # This listens on localhost:5005 (not a powerbox) and localhost:8000 (powerbox) 
```

Open a tab to `http://localhost:5005/client.html`.  The CSP settings for
Manifest V3 prevent you from using powerbox clients on the `file:` protocol, so
you need an `http:` or `https:` URL for testing.

Configure petnames by opening the privileged port at
`http://localhost:8000/wallet/`.


## Distributing the extension

To create the extension artifact:

```
yarn build
web-ext build
```

and look at `web-ext-artifacts`.

When you upload the artifact, be sure to bump the `package.json` `"version"` field.
