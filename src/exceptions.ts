import { AxiosError } from 'axios'

export class VaultException extends Error {
  constructor(message: string) {
    super(`[Vault] ${message}`)
  }
}

export class VaultBadRequestException extends Error {
  constructor(message: string) {
    super(`[Vault - BadRequest] ${message}`)
  }
}

export class VaultAccessDeniedException extends Error {
  constructor(message: string) {
    super(`[Vault - AccessDenied] ${message}`)
  }
}

export function handleError(error: AxiosError<{ message: string }>) {
  switch (error.response?.status) {
    case 400:
      throw new VaultBadRequestException(error.response.data.message)
    case 418:
      throw new VaultAccessDeniedException(error.response.data.message)
    default:
      throw new VaultException(error.response?.data.message ?? error.message)
  }
}
