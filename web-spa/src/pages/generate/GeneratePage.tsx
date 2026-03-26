import { useEffect } from 'react';
import {
  GENERATE_DIRECTORY_PICKER_MODAL_HTML,
  GENERATE_MAIN_INNER_HTML,
  GENERATE_SUCCESS_MODAL_HTML
} from './GenerateMarkup';
import { initGeneratePageRuntime } from './GenerateRuntime';

const GENERATE_PAGE_HTML = `${GENERATE_MAIN_INNER_HTML}${GENERATE_SUCCESS_MODAL_HTML}${GENERATE_DIRECTORY_PICKER_MODAL_HTML}`;

export function GeneratePage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'QuickMCP - Modern MCP Server Generator';
    document.body.classList.add('generate-page');

    const frame = window.requestAnimationFrame(() => {
      initGeneratePageRuntime();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.title = previousTitle;
      document.body.classList.remove('generate-page');
    };
  }, []);

  return (
    <div
      className="flex-1 relative bg-slate-50/50 overflow-hidden flex flex-col min-w-0"
      dangerouslySetInnerHTML={{ __html: GENERATE_PAGE_HTML }}
    />
  );
}
