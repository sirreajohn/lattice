export async function processDroppedFile(file) {
    if (file.type === 'application/pdf') {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ type: 'pdf', content: e.target.result, name: file.name });
            reader.readAsDataURL(file);
        });
    }

    if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        // Dynamic imports to save bundle size
        const { convertToHtml } = await import('mammoth');
        
        try {
            const result = await convertToHtml({ arrayBuffer });
            return { type: 'html', content: `<h1>${file.name}</h1>\n${result.value}` };
        } catch (e) {
            console.error("Mammoth error", e);
            return { type: 'html', content: `<p>Error processing DOCX: ${e.message}</p>` };
        }
    }

    if (file.name.endsWith('.md') || file.name.endsWith('.txt') || file.type === 'text/plain' || file.type === 'text/markdown') {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const { marked } = await import('marked');
                const html = await marked.parse(e.target.result);
                resolve({ type: 'html', content: html });
            };
            reader.readAsText(file);
        });
    }

    if (file.type === 'text/html' || file.name.endsWith('.html')) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({ type: 'html', content: e.target.result });
            };
            reader.readAsText(file);
        });
    }

    // XLSX Spreadsheet
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel') {
        const arrayBuffer = await file.arrayBuffer();
        const XLSX = await import('xlsx');
        try {
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetNames = workbook.SheetNames;
            const sheets = {};
            for (const name of sheetNames) {
                sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });
            }
            return { type: 'spreadsheet', content: { sheets, sheetNames, activeSheet: 0 }, name: file.name };
        } catch (e) {
            console.error("XLSX parse error", e);
            return null;
        }
    }

    // PPTX Presentation (store raw file for client-side rendering)
    if (file.name.endsWith('.pptx') || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({ type: 'presentation', content: e.target.result, name: file.name });
            };
            reader.readAsDataURL(file);
        });
    }

    return null;
}
