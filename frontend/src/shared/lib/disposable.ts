export interface Disposable {
  dispose(): void
}

export function createDisposable(dispose: () => void): Disposable {
  return {dispose}
}

export function disposeAll(disposables: Iterable<Disposable>) {
  for (const disposable of disposables) disposable.dispose()
}
