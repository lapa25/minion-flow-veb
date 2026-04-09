export const ListPagination = ({page, totalPages, pageSize, isLoading, onPrev, onNext}) => {
    return (
        <div className="projectsFooter">
            <div className="projectsPills">
                <span className="pill">Стр. {page} / {totalPages}</span>
                <span className="pill">На странице: {pageSize}</span>
            </div>
            <div className="projectsActions">
                <button
                    className="projectsBtn projectsBtnSecondary"
                    onClick={onPrev}
                    disabled={page <= 1 || isLoading}
                    type="button"
                >
                    Назад
                </button>
                <button
                    className="projectsBtn projectsBtnSecondary"
                    onClick={onNext}
                    disabled={page >= totalPages || isLoading}
                    type="button"
                >
                    Вперёд
                </button>
            </div>
        </div>
    )
}