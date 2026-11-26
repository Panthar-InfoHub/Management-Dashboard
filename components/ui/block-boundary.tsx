"use client";

import { Component, type ReactNode } from "react";

/**
 * Keeps one failed section from taking down the page: the rest still shows,
 * and this block offers a retry.
 */
export class BlockBoundary extends Component<{ children: ReactNode; label?: string; className?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center ${this.props.className ?? ""}`}>
        <p className="text-sm font-medium">{this.props.label ?? "This section"} didn&apos;t load.</p>
        <button type="button" onClick={() => { this.setState({ failed: false }); window.location.reload(); }} className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
          Reload
        </button>
      </div>
    );
  }
}
