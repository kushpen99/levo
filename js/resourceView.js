// js/resourceView.js
// Modular resource panel for story resources
// Usage: import { renderResourcePanel } from './resourceView.js';
//        container.append(renderResourcePanel(resources, {direction, title, previewMode}))

export function renderResourcePanel(resources, options = {}) {
    const {
        direction = 'ltr',
        title = 'Resources',
        previewMode = true
    } = options;
    if (!Array.isArray(resources) || !resources.length) return null;

    // Responsive container
    const panel = document.createElement('aside');
    panel.className = 'resource-panel bg-white rounded shadow p-4 mb-4';
    panel.style.maxWidth = '340px';
    panel.style.minWidth = '220px';
    panel.style.direction = direction;
    panel.style.textAlign = direction === 'rtl' ? 'right' : 'left';
    panel.style.boxSizing = 'border-box';
    panel.style.position = 'relative';
    panel.style.flex = '0 0 340px';

    // Responsive CSS (can be moved to stylesheet)
    panel.style.marginRight = direction === 'rtl' ? '0' : '2rem';
    panel.style.marginLeft = direction === 'rtl' ? '2rem' : '0';
    panel.style.marginBottom = '2rem';

    // Title
    const h = document.createElement('h3');
    h.className = 'text-lg font-semibold mb-3 text-blue-700';
    h.textContent = title;
    panel.append(h);

    resources.forEach(res => {
        const card = document.createElement('div');
        card.className = 'mb-4 p-3 border rounded bg-white';
        card.style.position = 'relative';
        card.style.border = '1px solid #e5e7eb';
        card.style.boxShadow = 'none';
        card.style.borderRadius = '0.75rem';
        card.style.padding = '1rem';
        // Name
        const name = document.createElement('div');
        name.className = 'font-semibold mb-1';
        name.textContent = res.displayName || res.url || 'Resource';
        card.append(name);
        // Open link (icon button, top right)
        if (res.url) {
            const openBtn = document.createElement('a');
            openBtn.href = res.url;
            openBtn.target = '_blank';
            openBtn.className = 'absolute top-2 right-2 text-blue-500 hover:text-blue-700';
            openBtn.title = 'Open resource';
            openBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="inline w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 3h7v7m0 0L10 21l-7-7 11-11z"/></svg>';
            card.append(openBtn);
        }
        // Description
        if (res.description) {
            const desc = document.createElement('div');
            desc.className = 'text-gray-600 mb-1';
            desc.textContent = res.description;
            card.append(desc);
        }
        // Importance badge
        if (res.importance) {
            const badge = document.createElement('span');
            badge.className = 'inline-block px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 border border-yellow-300 mb-1';
            badge.textContent = res.importance;
            card.append(badge);
        }
        // Preview
        if (previewMode && res.url) {
            if (res.type === 'article' || res.type === 'doc' || res.type === 'tool' || res.type === 'dataset') {
                const iframe = document.createElement('iframe');
                iframe.src = res.url;
                iframe.className = 'w-full rounded border my-2';
                iframe.style.height = '140px';
                iframe.style.background = '#fff';
                iframe.setAttribute('loading', 'lazy');
                card.append(iframe);
            } else if (res.type === 'youtube' && res.url) {
                // Extract YouTube video ID
                const match = res.url.match(/[?&]v=([^&#]+)/) || res.url.match(/youtu\.be\/([^?&#]+)/);
                const videoId = match ? match[1] : null;
                if (videoId) {
                    const yt = document.createElement('iframe');
                    yt.src = `https://www.youtube.com/embed/${videoId}`;
                    yt.className = 'w-full rounded border my-2';
                    yt.style.height = '140px';
                    yt.setAttribute('allowfullscreen', '');
                    yt.setAttribute('loading', 'lazy');
                    card.append(yt);
                }
            }
        }
        card.style.marginBottom = '1.5rem';
        panel.append(card);
    });
    return panel;
}

// Responsive CSS for .resource-panel (add to your stylesheet or <style> block):
//
// @media (min-width: 1024px) {
//   .story-app-layout {
//     display: flex;
//     flex-direction: row;
//     align-items: flex-start;
//   }
//   .resource-panel {
//     position: sticky;
//     top: 2rem;
//     margin-bottom: 0;
//   }
// }
//
// @media (max-width: 1023px) {
//   .story-app-layout {
//     display: block;
//   }
//   .resource-panel {
//     margin: 0 0 2rem 0;
//     position: static;
//   }
// } 