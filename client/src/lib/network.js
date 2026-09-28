/**
 * Helper to get the correct accessible origin for QR codes and mobile sharing.
 * If running on localhost / 127.0.0.1, it substitutes the local network IP
 * so external mobile devices (like iPhone 11) on the same Wi-Fi can connect.
 */
export const getNetworkOrigin = (customIp = null) => {
    if (typeof window === 'undefined') return '';

    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol;

    if (customIp) {
        return `${protocol}//${customIp}${port}`;
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const lanIp = import.meta.env.VITE_LAN_IP || '192.168.1.15';
        return `${protocol}//${lanIp}${port}`;
    }

    return window.location.origin;
};
