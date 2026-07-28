import type {
  ApiRequest,
  ApiResponse,
  ApiRoute,
  ClientMessage,
  ServerMessage,
} from '@docs/shared'

export interface Connection {
  send(message: ClientMessage): void
  close(): void
}

export interface ApiClient {
  request<R extends ApiRoute>(route: R, body: ApiRequest<R>): Promise<ApiResponse<R>>
  connect(onMessage: (message: ServerMessage) => void): Connection
}
