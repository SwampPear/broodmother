import type {
  ApiRequest,
  ApiResponse,
  ApiRoute,
  ServerMessage,
  TerminalClientMessage,
  TerminalServerMessage,
} from '@broodmother/shared'

export interface Connection<Message = never> {
  send(message: Message): void
  close(): void
}

export interface ApiClient {
  request<R extends ApiRoute>(route: R, body: ApiRequest<R>): Promise<ApiResponse<R>>
  connect(onMessage: (message: ServerMessage) => void): Connection
  /** A shell of its own: each call spawns a pty that dies with the connection. */
  terminal(
    onMessage: (message: TerminalServerMessage) => void,
    onClose?: () => void,
  ): Connection<TerminalClientMessage>
}
