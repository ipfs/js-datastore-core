export interface IShard {
    name: string
    param:number
    _padding: string
    fun(s: string): string| void
    toString(): string
}
