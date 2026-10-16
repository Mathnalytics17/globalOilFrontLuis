import { Component } from 'react';

import AppErrorState from '@shared/ui/AppErrorState';

export default class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep diagnostics in development tools; never expose stack details to users.
    console.error('Unhandled application error', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="go-page">
          <div className="go-shell">
            <AppErrorState
              error={this.state.error}
              fallback="No fue posible mostrar esta pantalla."
              onRetry={() => this.setState({ error: null })}
            />
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
