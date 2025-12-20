import type { Highlight } from "../types/pdfHighlight";

interface CaptureOptions {
  pageRef: React.RefObject<HTMLDivElement>;
  highlights: Highlight[];
  currentPage: number;
  zoom: number;
  scaledPageWidth: number;
  sourceName?: string;
}

export const capturePageAsImage = async ({
  pageRef,
  highlights,
  currentPage,
  zoom,
  scaledPageWidth,
  sourceName,
}: CaptureOptions): Promise<{ success: boolean; error?: string }> => {
  if (!pageRef.current) {
    return { success: false, error: "Unable to capture: page not rendered" };
  }

  try {
    // Find the canvas element rendered by react-pdf
    const canvas = pageRef.current.querySelector("canvas");
    if (!canvas) {
      return { success: false, error: "Unable to find PDF canvas" };
    }

    // Get current page highlights
    const currentHighlights = highlights.filter(
      (hl) => hl.page === currentPage
    );

    // Create a new canvas to composite PDF + highlights
    const compositeCanvas = document.createElement("canvas");
    compositeCanvas.width = canvas.width;
    compositeCanvas.height = canvas.height;
    const ctx = compositeCanvas.getContext("2d");

    if (!ctx) {
      return { success: false, error: "Unable to create capture context" };
    }

    // Draw the PDF canvas content
    ctx.drawImage(canvas, 0, 0);

    // Draw highlights on top
    currentHighlights.forEach((hl) => {
      // Convert coordinates to canvas coordinates
      // The highlights are positioned in the scaled page coordinates
      // Canvas uses actual pixel coordinates
      const scaleRatio = canvas.width / scaledPageWidth;
      const x = hl.left * zoom * scaleRatio;
      const y = hl.top * zoom * scaleRatio;
      const w = hl.width * zoom * scaleRatio;
      const h = hl.height * zoom * scaleRatio;

      // Draw highlight box with same styling as CSS
      ctx.fillStyle = "rgba(252, 211, 77, 0.45)";
      ctx.fillRect(x, y, w, h);

      // Draw border
      ctx.strokeStyle = "rgba(252, 211, 77, 0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    });

    // Convert to image data URL
    const imageDataUrl = compositeCanvas.toDataURL("image/png");

    // Open in new window/tab
    const newWindow = window.open("", "_blank");
    if (!newWindow) {
      return {
        success: false,
        error: "Pop-up blocked. Please allow pop-ups for this site.",
      };
    }

    // Write HTML to display the image
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Captured Page ${currentPage} - ${sourceName ?? "PDF"}</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .container {
            text-align: center;
          }
          img {
            max-width: 100%;
            height: auto;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border-radius: 8px;
            background: white;
          }
          .title {
            margin-bottom: 16px;
            color: #333;
            font-size: 18px;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="title">Page ${currentPage} - ${sourceName ?? "PDF"}</div>
          <img src="${imageDataUrl}" alt="Captured page with highlights" />
        </div>
      </body>
      </html>
    `);
    newWindow.document.close();

    return { success: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to capture page", err);
    return { success: false, error: "Failed to capture page" };
  }
};
