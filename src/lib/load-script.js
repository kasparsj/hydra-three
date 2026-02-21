const loadScript = (url = "", once = true, scope = null) => {
  const globalScope = scope || (typeof window !== "undefined" ? window : null);
  if (!globalScope || typeof document === "undefined") {
    return Promise.reject(
      new Error("loadScript() requires a browser-like window/document runtime."),
    );
  }

  return new Promise((resolve, reject) => {
    if (once) {
      globalScope.loadedScripts || (globalScope.loadedScripts = {});
      if (globalScope.loadedScripts[url]) {
        resolve();
        return;
      }
    }

    const script = document.createElement("script");
    script.onload = () => {
      if (once) {
        globalScope.loadedScripts[url] = true;
      }
      resolve();
    };
    script.onerror = (error) => {
      reject(error || new Error(`Failed to load script: ${url}`));
    };
    script.src = url;
    document.head.appendChild(script);
  });
};

export { loadScript };
