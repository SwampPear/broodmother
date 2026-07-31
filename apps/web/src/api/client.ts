import type {
  ApiRequest,
  ApiResponse,
  ApiRoute,
  DocRoot,
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
  /** A shell of its own: each call spawns a pty that dies with the connection. The root says
   *  where it opens, asked per shell so moving the scope moves the next one and not this. */
  terminal(
    root: DocRoot,
    onMessage: (message: TerminalServerMessage) => void,
    onClose?: () => void,
  ): Connection<TerminalClientMessage>
}
