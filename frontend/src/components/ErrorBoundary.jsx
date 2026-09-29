import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.error(error)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="min-h-[60dvh] flex items-center justify-center px-4">
        <div className="panel p-8 max-w-sm text-center">
          <p className="font-display text-xl text-ink">Something went wrong</p>
          <p className="text-sm text-ink-soft mt-2">The page hit an unexpected error. Your data is safe. Reload to try again.</p>
          <button className="btn-primary mt-5" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
