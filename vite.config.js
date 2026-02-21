import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { glslify } from "vite-plugin-glslify";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildSourcemap = process.env.BUILD_SOURCEMAP === "true";

export default defineConfig({
  plugins: glslify({
    transformLiterals: false,
  }),
  server: {
    host: "127.0.0.1",
    port: 8000,
    open: "/dev/index.html",
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/hydra-synth.js"),
      name: "Hydra",
      formats: ["umd"],
      fileName: () => "hydra-synth.js",
    },
    sourcemap: buildSourcemap,
    minify: false,
    emptyOutDir: false,
    rollupOptions: {
      output: {
        exports: "default",
      },
    },
  },
});
