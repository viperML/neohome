
export function formatDate(date: Date): string {
    return date.toLocaleDateString("en-uk", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })
}
