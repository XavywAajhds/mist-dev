# Mist.Dev browser backend

A free-to-host proxy server that makes real websites load in the Mist.Dev
**Home** (browser) tab.

It is a lightly patched build of [MercuryWorkshop/Scramjet-App](https://github.com/MercuryWorkshop/Scramjet-App):

- Uses the **epoxy** transport instead of libcurl. Epoxy does **not** need
  `SharedArrayBuffer`, so the app no longer has to send the
  `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers.
- Because of that, the whole app can run **inside an iframe**, which is what
  lets Mist.Dev keep its own UI around it.
- The client also accepts `?url=<website>` and `?q=<search>` so the Mist.Dev
  browser bar can drive it directly.

Upstream Scramjet and epoxy are both **AGPL-3.0**. If you host this publicly,
you must make the source available (this folder + the upstream links above).

## Deploy for free on Render (no credit card)

1. Make sure this repo is on GitHub (it already contains `render.yaml` and
   `proxy-server/`).
2. Go to <https://render.com>, sign up with GitHub.
3. **New +** -> **Blueprint** -> pick this repository -> **Apply**.
   Render reads `render.yaml`, builds the Docker image and deploys it.
4. Wait for the build to finish, then copy the URL, e.g.
   `https://mist-dev-browser.onrender.com`.
5. In Mist.Dev open **Settings -> Browser** and paste that URL into
   **Browser app URL**.

The free instance sleeps after ~15 minutes idle and takes ~30s to wake on the
first request. That is normal.

### Manual deploy (without the blueprint)

Create a **Web Service**, runtime **Docker**, then set:

- Docker Context Directory: `proxy-server`
- Dockerfile Path: `proxy-server/Dockerfile`

You can also run it locally:

```sh
cd proxy-server
# (the build step clones upstream, so just use docker)
docker build -t mist-browser .
docker run -p 8080:8080 mist-browser
```

Then set the Browser app URL in Mist.Dev to `http://localhost:8080`.
