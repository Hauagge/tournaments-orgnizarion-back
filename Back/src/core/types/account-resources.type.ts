export type AccountResourcesType = Record<
  string,
  {
    read: Array<number | string>
    update: Array<number | string>
    delete: Array<number | string>
  }
>
