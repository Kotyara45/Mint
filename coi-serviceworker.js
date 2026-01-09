let coepCredentialless = false;
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("fetch", function (event) {
        if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
            return;
        }

        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => console.error(e))
        );
    });
} else {
    (() => {
        const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
        window.sessionStorage.removeItem("coiReloadedBySelf");
        const coepHeaders = {
            "coep-credentialless": coepCredentialless,
            "coep": !coepCredentialless,
        };
        const coepMatch = window.document.cookie.match(/coep-credentialless=([^;]+)/);
        if (coepMatch) {
             coepCredentialless = coepMatch[1] === "true";
        }
        
        if (window.crossOriginIsolated) return;

        if (reloadedBySelf) {
            console.warn("coi-serviceworker: Failed to register or activate.");
            return;
        }

        const scriptSrc = document.currentScript.src;
        const workerSrc = scriptSrc;
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register(workerSrc).then(
                (registration) => {
                    console.log("COI Service Worker registered");
                    registration.addEventListener("updatefound", () => {
                        window.sessionStorage.setItem("coiReloadedBySelf", "true");
                        window.location.reload();
                    });
                    if (registration.active && !navigator.serviceWorker.controller) {
                        window.sessionStorage.setItem("coiReloadedBySelf", "true");
                        window.location.reload();
                    }
                },
                (err) => {
                    console.error("COI Service Worker registration failed: ", err);
                }
            );
        }
    })();
}
