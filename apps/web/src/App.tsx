import { OperateView } from "./views/Operate/OperateView.js";

/**
 * M2 is the Operate view only. Prepare, Debrief and Data Sources arrive at M3, at which
 * point this becomes a router over the four views and the Reality Dial control moves into
 * a shell around them.
 */
export function App() {
  return (
    <main className="app">
      <OperateView />
    </main>
  );
}
