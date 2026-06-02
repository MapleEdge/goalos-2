/* Google Identity Services + Picker + GAPI ambient types (subset used by BackupRestoreSection) */

declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken(): void
  }

  interface TokenResponse {
    access_token: string
    error?: string
  }

  interface TokenClientConfig {
    client_id: string
    scope: string
    callback: (response: TokenResponse) => void
  }

  function initTokenClient(config: TokenClientConfig): TokenClient
}

declare namespace google.picker {
  enum Action {
    PICKED = 'picked',
    CANCEL = 'cancel',
  }

  interface Document {
    id: string
    name: string
    mimeType: string
  }

  interface ResponseObject {
    action: Action
    docs: Document[]
  }

  class DocsView {
    setMimeTypes(mimeTypes: string): DocsView
  }

  class PickerBuilder {
    addView(view: DocsView): PickerBuilder
    setOAuthToken(token: string): PickerBuilder
    setCallback(callback: (data: ResponseObject) => void): PickerBuilder
    build(): Picker
  }

  class Picker {
    setVisible(visible: boolean): void
  }
}

interface Window {
  gapi: {
    load(api: string, callback: () => void): void
    client: {
      init(config: { apiKey: string; discoveryDocs: string[] }): Promise<void>
    }
  }
}
