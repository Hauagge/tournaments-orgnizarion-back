export class ExceptionMetadataDTO {
  message: string
  field: string | object

  constructor(message?: string, field?: string | object) {
    if (message) this.message = message
    if (field) this.field = field
  }
}
