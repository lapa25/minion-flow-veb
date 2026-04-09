export const loadAllPages = async (fetchPage, pageSize = 100) => {
    const firstPage = await fetchPage({page: 0, size: pageSize})
    const totalPages = Number(firstPage?.pageCount ?? 1)
    const records = [...(firstPage?.records ?? [])]
    for (let page = 1; page < totalPages; ++page) {
        const pageData = await fetchPage({page, size: pageSize})
        records.push(...(pageData?.records ?? []))
    }
    return records
}