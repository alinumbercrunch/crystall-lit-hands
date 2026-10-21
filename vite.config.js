import path from "node:path";
import { buildBlog } from "./scripts/blog.js";
import { FILE as SALON_FILE, loadSalon, renderSalon } from "./scripts/salon.js";

const PAGES = ["index.html", "crystall.html", "light.html"];
const POSTS_DIR = path.resolve(import.meta.dirname, "posts") + path.sep;

export default {
  // Relative base so the build works at any path (e.g. GitHub Pages /<repo>/).
  base: "./",
  plugins: [
    {
      // Regenerate blog/ when a post changes during `npm run dev`.
      name: "blog",
      configureServer(server) {
        server.watcher.add(POSTS_DIR);
        server.watcher.on("all", (_event, file) => {
          if (!file.startsWith(POSTS_DIR)) return;
          try {
            buildBlog();
            server.ws.send({ type: "full-reload" });
          } catch (err) {
            server.config.logger.error(`[blog] ${err.message}`);
          }
        });
      },
    },
    {
      // Fill index.html's <!-- salon:… --> markers from content/salon.yml.
      name: "salon",
      configureServer(server) {
        server.watcher.add(SALON_FILE);
        server.watcher.on("all", (_event, file) => {
          if (path.resolve(file) === SALON_FILE) server.ws.send({ type: "full-reload" });
        });
      },
      transformIndexHtml: {
        order: "pre",
        handler: (html) => (html.includes("<!-- salon:") ? renderSalon(html, loadSalon()) : html),
      },
    },
  ],
  build: { target: "esnext", rollupOptions: { input: [...PAGES, ...buildBlog()] } },
};
