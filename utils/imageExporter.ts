
import { toPng } from 'html-to-image';

export const exportAsImage = async (element: HTMLElement | null, filename: string) => {
  if (!element) return;

  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      backgroundColor: '#0b0e14', // Ensure dark background matches theme
      style: {
        borderRadius: '0', // Clean corners
      },
      filter: (node) => {
        // Exclude elements with 'ignore-export' class
        if (node instanceof HTMLElement && node.classList.contains('ignore-export')) {
          return false;
        }
        return true;
      }
    });

    const link = document.createElement('a');
    link.download = `${filename}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Failed to export image:', err);
    alert('Failed to export image. Please try again.');
  }
};
