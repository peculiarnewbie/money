import { createRootRoute, Outlet } from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { Show, createSignal, onCleanup, onMount } from "solid-js";

type DebugMetrics = {
    viewport: string;
    devicePixelRatio: number;
    innerWidth: number;
    innerHeight: number;
    docClientWidth: number;
    docScrollWidth: number;
    vvScale: number | null;
    vvWidth: number | null;
    vvHeight: number | null;
    vvOffsetLeft: number | null;
    vvOffsetTop: number | null;
};

const readDebugMetrics = (): DebugMetrics => {
    const doc = document.documentElement;
    const vv = window.visualViewport;
    const viewport =
        document
            .querySelector('meta[name="viewport"]')
            ?.getAttribute("content") ?? "";
    return {
        viewport,
        devicePixelRatio: window.devicePixelRatio,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        docClientWidth: doc.clientWidth,
        docScrollWidth: doc.scrollWidth,
        vvScale: vv?.scale ?? null,
        vvWidth: vv?.width ?? null,
        vvHeight: vv?.height ?? null,
        vvOffsetLeft: vv?.offsetLeft ?? null,
        vvOffsetTop: vv?.offsetTop ?? null,
    };
};

const formatNumber = (value: number | null, digits = 2) =>
    value === null ? "-" : Number(value.toFixed(digits));

const DebugOverlay = () => {
    const [enabled, setEnabled] = createSignal(false);
    const [metrics, setMetrics] = createSignal<DebugMetrics | null>(null);

    onMount(() => {
        if (typeof window === "undefined") return;
        const isEnabled = new URLSearchParams(window.location.search).has(
            "debug"
        );
        setEnabled(isEnabled);
        if (!isEnabled) return;
        const update = () => setMetrics(readDebugMetrics());
        update();

        const vv = window.visualViewport;
        window.addEventListener("resize", update, { passive: true });
        vv?.addEventListener("resize", update);
        vv?.addEventListener("scroll", update);
        const timer = window.setInterval(update, 1000);

        onCleanup(() => {
            window.removeEventListener("resize", update);
            vv?.removeEventListener("resize", update);
            vv?.removeEventListener("scroll", update);
            window.clearInterval(timer);
        });
    });

    return (
        <Show when={enabled() && metrics()}>
            {(data) => (
                <div class="debug-overlay">
                    <div class="debug-title">debug viewport</div>
                    <div class="debug-row">viewport: {data().viewport || "-"}</div>
                    <div class="debug-row">
                        vv scale: {formatNumber(data().vvScale)}
                    </div>
                    <div class="debug-row">
                        vv size: {formatNumber(data().vvWidth)} x{" "}
                        {formatNumber(data().vvHeight)}
                    </div>
                    <div class="debug-row">
                        vv offset: {formatNumber(data().vvOffsetLeft)} x{" "}
                        {formatNumber(data().vvOffsetTop)}
                    </div>
                    <div class="debug-row">
                        inner: {data().innerWidth} x {data().innerHeight}
                    </div>
                    <div class="debug-row">
                        doc: {data().docClientWidth} / {data().docScrollWidth}
                    </div>
                    <div class="debug-row">
                        dpr: {formatNumber(data().devicePixelRatio)}
                    </div>
                </div>
            )}
        </Show>
    );
};

export const Route = createRootRoute({
    component: () => (
        <>
            <Outlet />
            <TanStackRouterDevtools />
            <DebugOverlay />
        </>
    ),
});
