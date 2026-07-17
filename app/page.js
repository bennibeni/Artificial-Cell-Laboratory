import App from "./App";
import "./styles.css";

export const metadata = {
  title: "Artificial Cell Laboratory",
  description:
    "Laboratorio interattivo del modello di cellula artificiale T4, dal genoma al fenotipo PF8.",
};

export default function R56Page() {
  return (
    <div className="r56-page">
      <App />
    </div>
  );
}
