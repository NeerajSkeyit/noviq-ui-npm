import React, { useState } from "react";
import { Eye, EyeOff, GripVertical, Pin, PinOff, Settings2 } from "lucide-react";
import Button from "../Button/Button";
import Drawer from "../Drawer/Drawer";
import ScrollArea from "../ScrollArea/ScrollArea";
import Switch from "../Switch/Switch";
import {
  BUTTON_SIZE,
  BUTTON_TYPE,
  BUTTON_VARIANT,
  NON_CONFIGURABLE_COLUMN_IDS,
  STICKY_POSITION,
  type StickyPosition,
} from "../../constants";
import { useText } from "../../hooks/useText";
import type { TableColumn } from "./Table";
import type { StickyColumnsState } from "./useTableColumnSettings";
import "./ColumnSelector.css";

export interface ColumnSelectorProps<T = any> {
  columns: TableColumn<T>[];
  visibleColumns: string[];
  columnOrder: string[];
  stickyColumns: StickyColumnsState;
  onVisibilityChange: (columnId: string, visible: boolean) => void;
  onReorder: (order: string[]) => void;
  onStickyChange: (columnId: string, sticky: StickyPosition | null) => void;
  onReset: () => void;
}

function ColumnSelector<T = any>({
  columns,
  visibleColumns,
  columnOrder,
  stickyColumns,
  onVisibilityChange,
  onReorder,
  onStickyChange,
  onReset,
}: ColumnSelectorProps<T>) {
  const [open, setOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const t = useText();

  const configurableColumns = columns.filter((c) => !NON_CONFIGURABLE_COLUMN_IDS.includes(c.id));

  const orderedColumns = columnOrder
    .map((id) => configurableColumns.find((c) => c.id === id))
    .filter((c): c is TableColumn<T> => c !== undefined);

  const getStickyState = (columnId: string): StickyPosition | null => {
    if (stickyColumns.left.includes(columnId)) return STICKY_POSITION.LEFT;
    if (stickyColumns.right.includes(columnId)) return STICKY_POSITION.RIGHT;
    return null;
  };

  const toggleSticky = (columnId: string) => {
    const current = getStickyState(columnId);
    if (current === null) onStickyChange(columnId, STICKY_POSITION.LEFT);
    else if (current === STICKY_POSITION.LEFT) onStickyChange(columnId, STICKY_POSITION.RIGHT);
    else onStickyChange(columnId, null);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const next = [...columnOrder];
    const dragIndex = next.indexOf(draggedId);
    const targetIndex = next.indexOf(targetId);
    next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, draggedId);
    onReorder(next);
  };

  return (
    <>
      <Button variant={BUTTON_VARIANT.OUTLINE} size={BUTTON_SIZE.SM} onClick={() => setOpen(true)}>
        <Settings2 size={16} />
        {t("columnsButton")}
      </Button>

      <Drawer
        isOpen={open}
        onClose={() => setOpen(false)}
        title={t("columnsTitle")}
        subtitle={t("columnsSubtitle")}
        closeOnOutside
        unmountOnClose
        footer={
          <div className="column-selector-legend">
            <div className="column-selector-legend-item">
              <Pin size={12} />
              <span>{t("columnsLegendLeft")}</span>
            </div>
            <div className="column-selector-legend-item">
              <Pin size={12} />
              <span>{t("columnsLegendRight")}</span>
            </div>
            <div className="column-selector-legend-item">
              <PinOff size={12} />
              <span>{t("columnsLegendUnpinned")}</span>
            </div>
            <Button variant={BUTTON_VARIANT.DEFAULT} size={BUTTON_SIZE.SM} onClick={onReset}>
              {t("columnsReset")}
            </Button>
          </div>
        }
      >
        <ScrollArea>
          <div className="column-selector-list">
            {orderedColumns.map((column) => {
              const stickyState = getStickyState(column.id);
              const isVisible = visibleColumns.includes(column.id);

              return (
                <div
                  key={column.id}
                  draggable
                  onDragStart={() => setDraggedId(column.id)}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragEnd={() => setDraggedId(null)}
                  className={`column-selector-row ${
                    draggedId === column.id ? "column-selector-row-active" : ""
                  }`}
                >
                  <GripVertical size={16} className="column-selector-grip" />
                  <span className="column-selector-label">{column.heading}</span>

                  <button
                    type={BUTTON_TYPE.BUTTON}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSticky(column.id);
                    }}
                    className={`column-selector-sticky-btn ${
                      stickyState ? "column-selector-sticky-active" : ""
                    }`}
                    title={
                      stickyState === STICKY_POSITION.LEFT
                        ? t("columnPinnedLeft")
                        : stickyState === STICKY_POSITION.RIGHT
                          ? t("columnPinnedRight")
                          : t("columnPin")
                    }
                  >
                    {stickyState ? (
                      <span className="column-selector-sticky-indicator">
                        <Pin size={14} />
                        <span className="column-selector-sticky-letter">
                          {stickyState === STICKY_POSITION.LEFT ? t("columnLetterLeft") : t("columnLetterRight")}
                        </span>
                      </span>
                    ) : (
                      <PinOff size={14} />
                    )}
                  </button>

                  <div className="column-selector-visibility">
                    {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                    <Switch
                      checked={isVisible}
                      onChange={(checked) => onVisibilityChange(column.id, checked)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Drawer>
    </>
  );
}

export default ColumnSelector;
