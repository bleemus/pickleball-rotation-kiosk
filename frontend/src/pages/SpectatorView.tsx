import { SpectatorDisplay } from "../components/SpectatorDisplay";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export function SpectatorView() {
    return <SpectatorDisplay apiUrl={API_URL} />;
}
