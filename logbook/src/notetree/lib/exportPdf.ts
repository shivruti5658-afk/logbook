import { jsPDF } from "jspdf";

import type { Note, NodeItem } from "../types";

type VisibleNode = {
  node: NodeItem;
  depth: number;
};

export function exportNoteToPdf(note: Note, visible: VisibleNode[]) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // ---------------------------------------------
  // PAGE SETTINGS
  // ---------------------------------------------

  const pageWidth = 210;
  const pageHeight = 297;

  const marginLeft = 20;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 20;

  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = marginTop;

  // ---------------------------------------------
  // HELPERS
  // ---------------------------------------------

  function addPage() {
    pdf.addPage();

    y = marginTop;
  }

  function ensureSpace(height: number) {
    if (y + height > pageHeight - marginBottom) {
      addPage();
    }
  }

  function setBodyFont() {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(35, 35, 35);
  }

  // ---------------------------------------------
  // TITLE
  // ---------------------------------------------

  const title = note.title.trim() || "Untitled";

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(20, 20, 20);

  const titleLines = pdf.splitTextToSize(title, contentWidth);

  pdf.text(titleLines, marginLeft, y);

  y += titleLines.length * 8 + 6;

  // Separator
  pdf.setDrawColor(210, 210, 210);
  pdf.setLineWidth(0.3);

  pdf.line(marginLeft, y, pageWidth - marginRight, y);

  y += 10;

  // ---------------------------------------------
  // NODES
  // ---------------------------------------------

  visible.forEach(({ node, depth }) => {
    const content = node.content.trim();

    if (!content) {
      return;
    }

    // Maximum visual indentation in PDF.
    const indent = Math.min(depth, 7) * 7;

    const x = marginLeft + indent;

    const availableWidth = contentWidth - indent;

    // ===========================================
    // HEADING
    // ===========================================

    if (node.type === "heading") {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(25, 25, 25);

      const lines = pdf.splitTextToSize(content, availableWidth);

      const height = lines.length * 6.5 + 5;

      ensureSpace(height);

      pdf.text(lines, x, y);

      y += height;

      return;
    }

    // ===========================================
    // CODE
    // ===========================================

    if (node.type === "code") {
      pdf.setFont("courier", "normal");
      pdf.setFontSize(9.5);

      const innerWidth = availableWidth - 8;

      const lines = pdf.splitTextToSize(content, innerWidth);

      const boxHeight = Math.max(12, lines.length * 5 + 7);

      ensureSpace(boxHeight + 4);

      pdf.setFillColor(245, 246, 248);

      pdf.setDrawColor(225, 228, 232);

      pdf.roundedRect(x, y - 4, availableWidth, boxHeight, 2, 2, "FD");

      pdf.setTextColor(40, 40, 40);

      pdf.text(lines, x + 4, y + 1);

      y += boxHeight + 4;

      return;
    }

    // ===========================================
    // QUOTE
    // ===========================================

    if (node.type === "quote") {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(11);
      pdf.setTextColor(75, 75, 75);

      const quoteX = x + 5;

      const lines = pdf.splitTextToSize(content, availableWidth - 7);

      const height = Math.max(7, lines.length * 5.5);

      ensureSpace(height + 4);

      pdf.setDrawColor(110, 120, 150);

      pdf.setLineWidth(0.7);

      pdf.line(x, y - 4, x, y + height - 3);

      pdf.text(lines, quoteX, y);

      y += height + 4;

      return;
    }

    // ===========================================
    // BULLET / NUMBER / TASK
    // ===========================================

    setBodyFont();

    let prefix = "•";

    if (node.type === "task") {
      prefix = node.checked ? "[x]" : "[ ]";
    }

    if (node.type === "number") {
      const siblingsBefore = visible.filter(
        ({ node: candidate }) =>
          candidate.parentId === node.parentId &&
          candidate.type === "number" &&
          candidate.position < node.position,
      ).length;

      prefix = `${siblingsBefore + 1}.`;
    }

    const prefixWidth = Math.max(pdf.getTextWidth(prefix) + 3, 7);

    const textWidth = Math.max(availableWidth - prefixWidth, 20);

    const lines = pdf.splitTextToSize(content, textWidth);

    const lineHeight = 5.5;

    const requiredHeight = Math.max(lineHeight, lines.length * lineHeight);

    ensureSpace(requiredHeight + 2);

    pdf.text(prefix, x, y);

    pdf.text(lines, x + prefixWidth, y);

    y += requiredHeight + 2;
  });

  // ---------------------------------------------
  // PAGE NUMBERS
  // ---------------------------------------------

  const totalPages = pdf.getNumberOfPages();

  for (let page = 1; page <= totalPages; page++) {
    pdf.setPage(page);

    pdf.setFont("helvetica", "normal");

    pdf.setFontSize(8);

    pdf.setTextColor(130, 130, 130);

    pdf.text(`${page} / ${totalPages}`, pageWidth / 2, pageHeight - 10, {
      align: "center",
    });
  }

  // ---------------------------------------------
  // FILE NAME
  // ---------------------------------------------

  const safeTitle =
    title
      .replace(/[^a-z0-9\s-_]/gi, "")
      .trim()
      .replace(/\s+/g, "-") || "note";

  pdf.save(`${safeTitle}.pdf`);
}
