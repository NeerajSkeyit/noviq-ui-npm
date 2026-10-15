import React from "react";
import ReactSelect, { type StylesConfig } from "react-select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import Button from "../Button/Button";
import { useSelectEscapeGuard } from "../../hooks/useSelectEscapeGuard";
import { BUTTON_SIZE, BUTTON_VARIANT, DEFAULT_PAGE_SIZE_OPTIONS } from "../../constants";
import "./TablePagination.css";

export interface TablePaginationState {
  page: number;
  pageSize: number;
}

export interface TablePaginationProps {
  pagination: TablePaginationState;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
}

interface PageSizeOption {
  value: number;
  label: string;
}

const selectStyles: StylesConfig<PageSizeOption, false> = {
  control: (base, state) => ({
    ...base,
    cursor: state.isDisabled ? "not-allowed" : "text",
    borderRadius: "6px",
    minHeight: "32px",
    height: "32px",
    boxShadow: "none",
    border: "1px solid var(--border-color)",
    "&:hover": { border: "1px solid var(--border-color)" },
  }),
  option: (base, state) => ({
    ...base,
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    fontSize: "14px",
    background: state.isSelected ? "var(--primary)" : state.isFocused ? "#f3f4f6" : "#fff",
    "&:hover": { background: state.isSelected ? "var(--primary)" : "#f3f4f6" },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  valueContainer: (base) => ({ ...base, paddingRight: "0px" }),
  indicatorsContainer: (base) => ({ ...base, height: "32px" }),
};

function TablePagination({
  pagination,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: TablePaginationProps) {
  const selectEscapeGuard = useSelectEscapeGuard(); // before the early return below: hooks run unconditionally
  const { page, pageSize } = pagination;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  if (!totalItems || totalItems < pageSizeOptions[0]) {
    return null;
  }

  return (
    <div className="table-pagination">
      <div className="table-pagination-left">
        <span className="table-pagination-text">
          Showing <span className="table-pagination-highlight">{startItem}</span> to{" "}
          <span className="table-pagination-highlight">{endItem}</span> of{" "}
          <span className="table-pagination-highlight">{totalItems}</span> results
        </span>
      </div>

      <div className="table-pagination-right">
        <div className="table-pagination-page-size">
          <span className="table-pagination-text">Rows per page:</span>
          <ReactSelect<PageSizeOption, false>
            {...selectEscapeGuard}
            classNamePrefix="rs"
            placeholder={pageSize.toString()}
            options={pageSizeOptions.map((option) => ({ value: option, label: String(option) }))}
            onChange={(option) => {
              if (option) onPageSizeChange(option.value);
            }}
            isSearchable={false}
            isClearable={false}
            menuPlacement="auto"
            menuPosition="fixed"
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
        </div>

        {totalPages > 1 ? (
          <div className="table-pagination-controls">
            <span className="table-pagination-page-info">
              Page {page} of {totalPages}
            </span>

            <Button
              variant={BUTTON_VARIANT.OUTLINE}
              size={BUTTON_SIZE.ICON}
              onClick={() => onPageChange(1)}
              disabled={!canGoPrevious}
            >
              <ChevronsLeft size={16} />
            </Button>
            <Button
              variant={BUTTON_VARIANT.OUTLINE}
              size={BUTTON_SIZE.ICON}
              onClick={() => onPageChange(page - 1)}
              disabled={!canGoPrevious}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant={BUTTON_VARIANT.OUTLINE}
              size={BUTTON_SIZE.ICON}
              onClick={() => onPageChange(page + 1)}
              disabled={!canGoNext}
            >
              <ChevronRight size={16} />
            </Button>
            <Button
              variant={BUTTON_VARIANT.OUTLINE}
              size={BUTTON_SIZE.ICON}
              onClick={() => onPageChange(totalPages)}
              disabled={!canGoNext}
            >
              <ChevronsRight size={16} />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default TablePagination;
