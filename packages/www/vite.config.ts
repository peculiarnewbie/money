import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
    plugins: [
        TanStackRouterVite({ target: "solid", autoCodeSplitting: true }),
        solid(),
        tailwindcss(),
        cloudflare(),
    ],
    server: {
        allowedHosts: ["omarchy"],
    },
});
