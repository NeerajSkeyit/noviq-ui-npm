import React, { useState } from "react";
import { ChevronDown, Download } from "../Icon/Icon";
import Button from "../Button/Button";
import { DropdownMenu, DropdownMenuItem } from "../Dropdown/Dropdown";
import { useText } from "../../hooks/useText";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  DEFAULT_EXPORT_FILE_BASE,
  EXPORT_FILE_EXTENSION,
} from "../../constants";

export interface ExportProps {
  exportToExcel: (fileName?: string) => void;
  exportToCSV: (fileName?: string) => void;
  exporting: boolean;
  /** Skip real export entirely and just open this pre-generated report link. Hides the CSV
   * option, matching the source's behavior for server-backed report links. */
  responseSheetUrl?: string;
  /** Base name used to build `${fileNameBase}.xlsx` / `${fileNameBase}.csv`. */
  fileNameBase?: string;
}

function Export({ exportToExcel, exportToCSV, exporting, responseSheetUrl, fileNameBase = DEFAULT_EXPORT_FILE_BASE }: ExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useText();

  if (responseSheetUrl) {
    return (
      <Button
        variant={BUTTON_VARIANT.OUTLINE}
        size={BUTTON_SIZE.SM}
        onClick={() => window.open(responseSheetUrl, "_blank")}
      >
        <Download size={16} />
        {t("exportButton")}
      </Button>
    );
  }

  return (
    <DropdownMenu
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      trigger={
        <Button
          variant={BUTTON_VARIANT.OUTLINE}
          size={BUTTON_SIZE.SM}
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={exporting}
        >
          <Download size={16} />
          {exporting ? t("exporting") : t("exportButton")}
          <ChevronDown size={16} />
        </Button>
      }
    >
      <DropdownMenuItem onClick={() => exportToExcel(`${fileNameBase}.${EXPORT_FILE_EXTENSION.EXCEL}`)} disabled={exporting}>
        {t("exportExcel")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => exportToCSV(`${fileNameBase}.${EXPORT_FILE_EXTENSION.CSV}`)} disabled={exporting}>
        {t("exportCsv")}
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

export default Export;
