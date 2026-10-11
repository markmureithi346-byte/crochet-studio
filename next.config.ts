import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * ALLOWED DEV ORIGINS
   * -------------------
   * Next 16 blocks cross-origin requests for dev resources (client chunks and
   * the HMR socket) unless the host is explicitly allowed. That protection is
   * good — it stops another site from pulling your dev bundle — but it means
   * that browsing to `http://127.0.0.1:3000` or to your machine's LAN IP gives
   * you a page that LOADS and then silently never becomes interactive: React
   * hydrates from a blocked chunk, no event handler fires, and the HMR socket
   * refuses to connect.
   *
   * The symptom is genuinely confusing — the page looks fine, the HTML is all
   * there, buttons just do nothing — so it is worth stating the fix up front:
   * use `localhost`, or use one of the hosts below.
   */
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    // Typical private ranges, so testing on a phone over Wi-Fi works.
    "192.168.*.*",
    "10.*.*.*",
  ],
};

export default nextConfig;