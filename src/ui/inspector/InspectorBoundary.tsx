import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useT } from '../i18n'
import { PrimaryButton } from '../controls'

function InspectorError({ onRetry }: { onRetry: () => void }) {
  const t = useT()
  return (
    <div role="alert" className="flex flex-col items-start gap-3 p-4">
      <h2 className="m-0 flex items-center gap-2 text-title font-medium text-ink">
        <TriangleAlert size={16} aria-hidden className="shrink-0 text-danger" />
        {t('insp.error.title')}
      </h2>
      <p className="m-0 text-ui text-ink-dim">{t('insp.error.body')}</p>
      <PrimaryButton variant="quiet" onClick={onRetry}>{t('app.reload')}</PrimaryButton>
    </div>
  )
}

interface Props { children: ReactNode; resetKey: unknown; fallback?: 'panel' | 'none' }

/**
 * Crash containment for the inspector (B.9): an `el()` throw for an unknown symbol, or any bug in properties.ts,
 * renders a message instead of blanking the whole root. Resets itself when the molecule changes.
 */
export class InspectorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Inspector crashed', error, info.componentStack) }
  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false })
  }
  render() {
    if (!this.state.failed) return this.props.children
    if (this.props.fallback === 'none') return null
    return <InspectorError onRetry={() => this.setState({ failed: false })} />
  }
}
